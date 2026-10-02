# Doorlichting /admin (back-office) — 1 oktober 2026

Bereik: `src/lib/admin.js` (alle routes uit `adminGetInner`/`adminPostInner`, r. 307–656), plus wat het importeert (`delivery.js`, `invoice.js`, `close.js`, `subscription.js`, `tegoedVerrekening.js`, `betaallink.js`), de klantkant waar admin-handelingen gevolgen hebben (`portal.js`, `account.js`), de webhook (`functions/api/webhook/mollie.js`), `cron/index.js`, `public/admin.css` en `schema.sql` + `migrations/`.

Alleen gelezen, niets gewijzigd. Elke bewering hieronder is nagelopen in de code; regelnummers zijn van vandaag.

**Wat in orde bleek** (zodat je weet dat het gecontroleerd is):
- SQL tegen het schema: alle `INSERT`/`UPDATE`-kolommen en alle `alias.kolom`-verwijzingen in admin.js, delivery.js, invoice.js, close.js, notify.js en subscription.js bestaan in `schema.sql` + migraties (met een script nagelopen). Geen verkeerde kolommen of tabellen gevonden.
- CSRF: elke POST na login gaat door `currentAdmin()` + `originIsSelf()` (r. 462–473, 8122–8165). Halve 2FA-sessies worden geweigerd (r. 7355–7357).
- Bestandsindeling controleert of de bestanden bij de bestelling horen (r. 3616–3628). Een tegoedboeking controleert of de bestelling bij de klant hoort (r. 5646–5660).

---

## KRITIEK — geld fout, data weg of de klant komt vast te zitten

### K1. Annuleren is niet idempotent: twee keer versturen geeft twee keer tegoed
`handleOrderCancel` (r. 1199–1518) kijkt nergens of de bestelling al `cancelled` is. Het formulier staat alleen verborgen in de UI (`orderDanger`, r. 10465), maar bij een dubbelklik, een tweede tabblad of de terugknop gaat alles opnieuw:
- `INSERT INTO customer_credits … 'Tegoed na annulering van …'` (r. 1381–1388) is **niet** idempotent. De klant krijgt het volle brutobedrag twee keer als tegoed, en dat tegoed gaat sinds 29/9 automatisch van zijn volgende bestelling af.
- De annuleringsmail gaat twee keer weg (r. 1509), en er komen dubbele regels op de tijdlijn.
- (De creditnota is wel veilig: `issueCreditNote` kijkt naar wat al gecrediteerd is, invoice.js r. 962–972.)

**Oplossing:** bovenaan `if (order.status === 'cancelled') return seeOther(...)`. Zet daarnaast in de UPDATE `WHERE id = ?1 AND status <> 'cancelled'` en controleer `meta.changes`, zodat twee gelijktijdige verzoeken niet allebei doorlopen.

### K2. Een geannuleerde bestelling kan via het statuslijstje stilletjes weer opengaan
`orderCard` toont alle statussen zodra de bestelling al geannuleerd is (r. 10339). `handleStatusUpdate` blokkeert alleen de stap **naar** `cancelled` (r. 2037) en niet de stap terug. Kies je per ongeluk "Binnen" of "Geleverd" op een geannuleerde bestelling, dan:
- blijven `cancel_reason`/`cancel_payment` staan, en het tegoed, de creditnota en de terugbetaling ook;
- telt de bestelling weer mee als werk (planning, "open");
- wordt `leveringIngetrokken()` (delivery.js r. 227) weer `false`, dus de klant kan zijn bestanden opnieuw downloaden, ook al heeft hij zijn geld terug;
- bij "Geleverd" gaat zelfs de leveringsmail uit (r. 2065–2071).

**Oplossing:** in `handleStatusUpdate` weigeren als `exists.status === 'cancelled'`, en in `orderCard` voor een geannuleerde bestelling geen lijstje tonen. Moet heropenen ooit kunnen, maak daar dan een eigen knop voor die de annulering ook echt terugdraait.

### K3. Wat je uploadt is meteen zichtbaar en downloadbaar voor de klant, terwijl het bord het tegendeel belooft
Het bord zegt: *"Bestanden worden meteen opgeslagen — de klant ziet niets tot je op versturen drukt"* (r. 2947). Dat klopt niet:
- `loadDeliveryFiles` (delivery.js r. 235–249) filtert alleen op `superseded_at` en `expires_at`, niet op `announced_at`.
- Het portaal en Studio tonen daardoor elk geüpload beeld meteen (portal.js r. 1102). De klant heeft die link al sinds zijn bevestigingsmail.
- De uploadpagina zegt zelf het omgekeerde: *"de bestanden staan in R2 en de klant ziet ze"* (r. 4056). Twee schermen spreken elkaar tegen.
- Gevolgen: halve en foute beelden zijn te zien en te downloaden, de klant kan WIP goedkeuren of er een revisie op vragen, en dat geldt ook voor onbetaalde bestellingen. Er is nergens een betaalcontrole op downloads (portal.js en account.js lezen `payment_status` hier niet).

**Oplossing:** de keuze ligt bij jou:
- (a) in `loadDeliveryFiles` alleen `announced_at IS NOT NULL` tonen. Dat maakt "uploaden ≠ melden" echt, en dat is wat het bord belooft.
- (b) of r. 2947 eerlijk maken.

Ik raad (a) aan. Let erop dat `sendDeliveryMail` → `markAnnounced` het dan voor de eerste levering moet stempelen, en dat gebeurt al (r. 4229).

### K4. Een bestelling die al helemaal is goedgekeurd, sluit nooit meer af
`maybeCloseOrder` (close.js r. 63) wordt alleen aangeroepen als de klant iets goedkeurt (portal.js r. 556, account.js r. 4360/4376/4431). Admin roept hem nergens aan. Hij eist `status = 'delivered'` (close.js r. 79). Door K3 kan de klant alle beelden goedkeuren terwijl de status nog op `in_production` staat. Zet jij daarna op "Geleverd", dan:
- komt er geen nieuwe goedkeuring meer die het afronden in gang zet;
- blijft `closed_at` leeg;
- komt er geen bewaartermijn op het bronmateriaal (r. 115), geen tevredenheidsvraag en geen "afgerond" op de tijdlijn.

Hetzelfde gebeurt als jouw indeling of vervanging (`resupersede`) het laatste openstaande beeld wegzet.

**Oplossing:** `maybeCloseOrder(env, orderId)` aanroepen na `handleStatusUpdate` (bij `delivered`), na `handleFileMapping`, na `handleDeliveryUpload` en na `handleAnnounceRedelivery`. Overweeg ook een knop "Afronden" op de bestelpagina.

### K5. "Afwijzen" op de btw-lijst is een doodlopende weg
`handleVatDecision` zet `review_state = 'rejected'` (r. 9704–9708). Daarna:
- verdwijnt de bestelling van `/admin/vat`, die alleen `pending` toont (r. 9530);
- weigert de handler elke volgende beslissing als de status niet `pending` is (r. 9644);
- weigert de klantkant betalen bij alles behalve `''` of `approved` (account.js r. 4765–4768).

Na je gesprek met de klant kun je hem dus nergens meer goedkeuren. Er is ook geen filter die afgewezen bestellingen laat zien, en de cron ruimt ze niet op (cron/index.js r. 404–412 kijkt alleen naar `approved`). Ze blijven als "Binnen" in de planning staan en worden "te laat".

**Oplossing:** op `/admin/vat` een tweede blok "Afgewezen — wacht op contact" met dezelfde drie knoppen. Sta in `handleVatDecision` naast `pending` ook `rejected` toe (`review_state IN ('pending','rejected')`).

### K6. Annuleren verwijst naar een pagina waar geen annuleerknop staat
Kies je "Geannuleerd" in het lijstje, dan zegt de foutmelding: *"Annuleren gaat via de bestelpagina, onder 'Annuleren, verbergen of verwijderen'"* met een link naar `/admin/orders/:id/files` (r. 2039). Dat blok (`orderDanger`) wordt alleen in `orderCard` op het dashboard getekend (r. 10438). `renderFiles` heeft het niet (zie de body, r. 3389–3528). Je landt dus op een pagina zonder knop.

**Oplossing:** `orderDanger(order)` ook op de bestelpagina tekenen, onderaan bij "Onomkeerbaar". Of de link laten wijzen naar `/admin?q=<ref>#order-<id>`.

### K7. Na annuleren kan een onbetaalde bestelling alsnog betaald worden
`handleOrderCancel` trekt bij een onbetaalde bestelling de openstaande Mollie-betaling niet in. De webhook kijkt bij betaling niet naar de bestelstatus (`UPDATE orders SET payment_status='paid' … WHERE id = ?2 AND payment_status NOT IN ('paid','refunded')`, mollie.js r. 1352–1357). De betaallink uit de bevestigingsmail of herinnering werkt dus nog. Betaalt de klant, dan:
- staat de bestelling op geannuleerd maar betaald;
- komt er gewoon een factuur;
- vindt geen enkel filter haar (`paid_undelivered` sluit `cancelled` uit, r. 7486).

**Oplossing:** in de webhook `status = 'cancelled'` behandelen als "betaling ontvangen op geannuleerde bestelling" met een melding in admin_log (en eventueel automatisch terugstorten). Voeg op het dashboard een bewaker toe: `status='cancelled' AND payment_status='paid' AND cancel_payment IS NULL`.

### K8. Een aanbetaling kan nooit een restbetaling krijgen
Bij een offerte kun je "Een aanbetaling — het restant volgt later" kiezen (r. 3048–3049). Zodra die aanbetaling binnen is (`payment_status = 'paid'`):
- vervangt het offerteblok het formulier door "Betaald: €…" (r. 3041–3042);
- stopt `handleQuote` bij `paid` (r. 9784).

Je kunt het restant dus niet via admin vragen. Er is ook geen andere route om een tweede bedrag op dezelfde bestelling te zetten.

**Oplossing:** bij `quote_kind = 'aanbetaling'` en betaald een knop "Restant vragen" die een vervolgbestelling maakt (`service` gelijk, `details.parent_ref`) met eigen betaallink en factuur. Een tweede bedrag op dezelfde rij botst met `invoices.order_id UNIQUE`.

---

## BELANGRIJK — verwarrend, traag, of een stil gat

### B1. Op "Geleverd" zetten kan zonder één geleverd beeld, en zonder betaling
Zowel het lijstje (r. 10421–10431) als de knop "Op geleverd zetten en klant mailen" (r. 3094–3102) werken ook bij 0 leveringen. `sendDeliveryMail` stuurt dan *"Je bestelling staat klaar"* naar een leeg portaal en zet `delivery_mailed_at` (r. 4172–4229). Alles daarna kan alleen nog als "nieuwe beelden" gemeld worden. Bij een onbetaalde bestelling verschijnt ook geen waarschuwing (zie K3: downloads zijn niet afgeschermd).

**Oplossing:** de knop alleen tonen als er ≥ 1 levend leveringsbeeld is. Bij `payment_status = 'unpaid'` een duidelijke waarschuwing tonen en om een tweede bevestiging vragen.

### B2. De leveringsmail telt vervangen beelden mee
`sendDeliveryMail` telt `COUNT(*) … kind = 'delivery'` zonder `superseded_at IS NULL` (r. 4172–4175). Bij drie keer vervangen zegt de mail "12 beelden" terwijl er 4 zijn.

**Oplossing:** `AND superseded_at IS NULL` toevoegen (dezelfde voorwaarde als `unannouncedTally`, r. 4655–4658).

### B3. De bestelpagina zegt niet of er betaald is, en heeft geen statusbediening
- De kop van `renderFiles` toont merk · dienst · status · aantal (r. 3392), maar geen betaalstatus, bedrag of betaaldatum. Dat staat hooguit ingeklapt onder "Administratie" (bedrag, niet of het binnen is).
- Er is geen statuslijstje (alleen de "geleverd"-knop zolang er nooit gemeld is). Van "Binnen" naar "In productie" naar "In controle" moet via het dashboard: terug, zoeken, uitklappen, kiezen, bijwerken.
- Er is geen link naar de klantpagina (alleen in de tegoedregel als er tegoed is).

**Oplossing:** een vaste kopregel met betaalstatus (statPil), bedrag incl. btw, "betaald op …", een link naar de klant, en hetzelfde statusformulier als op `orderCard` met `back=files`. Dat bestaat al, r. 2084.

### B4. De tijdlijn van de bestelling is nergens in admin te zien
Admin leest `order_events` nergens (alleen `DELETE`, r. 1632). Wat de klant op zijn tijdlijn ziet, wat jij erop zette (notities bij een statuswissel, venster verzet, annulering, betalingen) en of de leveringsmail is aangekomen, moet je via "Bekijken zoals de klant het ziet" opzoeken. Dat werkt alleen bij `tier = 'attended'` (portal.js r. 1103). Interne regels (`actor = 'intern'`, bv. "terugbetaling moet met de hand", r. 1471/1489) zie je zelfs helemaal nergens.

**Oplossing:** een ingeklapt blok "Tijdlijn" op de bestelpagina met alle `order_events`, met `intern` gemarkeerd.

### B5. Geen knop "betaallink opnieuw sturen" bij een gewone onbetaalde bestelling
`stuurBetaallink` wordt alleen aangeroepen bij een btw-beslissing (r. 9748) en een offerte (r. 9815). De cron stuurt één herinnering na 3 dagen (cron/index.js r. 314–345). Een klant die de link kwijt is ("ik kan niet betalen") kun je alleen helpen door zelf in Mollie een link te maken.

**Oplossing:** op de bestelpagina en in `orderCard`, bij `payment_status = 'unpaid' AND total_cents > 0 AND (review_state IS NULL OR 'approved')`, een knop "Betaallink opnieuw mailen" die `stuurBetaallink` aanroept en een `admin_log`-regel schrijft.

### B6. De planning en "Eerst af" staan vol met afgebroken checkouts
`renderPlanning` (r. 8919–8929) en `loadAflopend` (r. 10062–10067) nemen elke bestelling op met status `received/in_production/human_check`, ongeacht betaling of btw-status. Een bezoeker die op de Mollie-pagina wegklikt, laat een rij `received/unpaid` achter. De cron ruimt alleen goedgekeurde btw-gevallen op (cron/index.js r. 404–412) en vrijgegeven vensters. Zo'n rij wordt na een dag "te laat" en telt mee in "open" en "te laat" (r. 9227–9230, 10169). Het woord "onbetaald" staat erbij (r. 9117), maar de tellers liegen.

**Oplossing:**
- Onbetaalde en btw-pending/rejected bestellingen uit de werklijst en tellers halen, behalve `payment_status = 'plan'` en expliciet geaccepteerde uitzonderingen. Laat ze in een eigen blok "wacht op betaling" staan.
- Laat de cron onbetaalde rijen ouder dan X dagen vervallen, net als `cancelStaleApprovals`.

### B7. Geen overzicht van abonnees met een week klaar om te starten
De knop "Start deze week" staat alleen op de klantpagina (r. 6275–6279). Welke abonnees iets vastgezet hebben, meldt alleen het nachtrapport (`weekTeStarten`, cron/index.js r. 118, 1632–1637). Op het dashboard staat niets. Je moet dus elke abonneepagina openen of het rapport lezen.

**Oplossing:** in de rechterkolom van het dashboard een blok "Abonnementen klaar om te starten (N)": merk, aantal vastgezette items en credits, met de startknop erbij (dezelfde POST naar `/admin/customers/:id/week`).

### B8. Facturen en creditnota's zijn in admin niet te openen of op te sommen
- De bestelpagina toont alleen het factuurnummer en de status (r. 2502–2522). Er is geen pdf-link, en creditnota's worden helemaal niet getoond.
- `pdf_key` en `credit_notes` worden in admin.js nergens gelezen (alleen in de wisroutine).
- Abonnementsbetalingen en `subscription_invoices` ook niet.
- Voor de kwartaalaangifte (ICP, rubriek 3b, creditnota's) is er geen lijst of export per periode.

**Oplossing:** een route `/admin/facturen?kwartaal=2026-Q3` met facturen, creditnota's en abonnementsfacturen (nummer, datum, klant, netto, btw, behandeling, pdf-link via `/admin/invoices/:id/pdf`) plus een CSV-knop. Op de bestelpagina de creditnota's onder de factuur zetten.

### B9. Engels op het Nederlandse adminscherm
- Uniciteitscontrole: `'face — required' : 'file'` (r. 2578), `<legend>Outcome</legend>` (r. 2581), `'A match was found' : 'No match'` (r. 2584), `Note` (r. 2589), en de hele zin *"This goes on the customer's timeline as well…"* (r. 2594–2595).
- Factuurstatus: de labeltabel kent `draft`/`credited` (die bestaan niet), maar niet `pending` (wel in schema.sql r. 816–817). Een half afgemaakte factuur toont dus het kale woord **pending** (r. 2508).
- Betaalstatus op de bestelregel: alleen paid/unpaid/plan worden vertaald. `refunded`/`failed` verschijnen als kaal Engels (r. 10417), terwijl de klantpagina ze wel vertaalt (r. 6155).
- Fotosoort: de revisiekaart toont `front`/`back`/`worn` (r. 10285), en de tabel "Aangeleverd door de klant" ook (`esc(f.shot)`, r. 2628). `SHOT_LABEL` bestaat al (r. 79).
- Btw-lijst: dienst als slug (`catalog`, r. 9576) en behandeling als `nl_standard`/`eu_reverse_charge` (r. 9588).
- Logboek: acties als code (`order.cancel`, `vat:approve`, r. 8321).

**Oplossing:** overal de bestaande vertaaltabellen gebruiken (`SHOT_LABEL`, `serviceLabel`, de betaalstatus-map van r. 6155), `pending: 'nog niet af'` toevoegen, en de modelcontrole naar het Nederlands zetten.

### B10. Engelse klanten lezen Nederlandse regels op hun tijdlijn
`order_events` is de tijdlijn van de klant. Deze regels zijn alleen Nederlands, ook bij `lang = 'en'`:
- het terugboeken van abonnementsitems na annuleren (r. 1342–1343);
- de herleveringsregel *"N nieuwe beelden geleverd (na revisie)"* (r. 4910–4912);
- alle drie de btw-uitkomsten (r. 9664–9666, 9701, 9709);
- de offerteregel (r. 9809–9811).

Elders in hetzelfde bestand wordt `tijdlijn(lang, nl, en)` wel gebruikt (r. 4428, 8707).

**Oplossing:** deze vier plekken door `tijdlijn(order.lang, …)` laten lopen. Daarvoor moet `lang` mee in de SELECT van `handleVatDecision` (r. 9639) en `handleQuote` (r. 9780).

### B11. Een inloglink naar de klant gaat altijd in het Nederlands
`handleCustomerSigninLink` roept `sendLoginLink(…, 'nl')` aan (r. 5861). Een Engelse klant krijgt dus een Nederlandse inlogmail. `handleOrderForCustomer` leidt de taal wél af uit de laatste bestelling (r. 9973–9979).

**Oplossing:** dezelfde afleiding gebruiken, of een taalkeuze naast de knop zetten.

### B12. "Geen nieuw beeld nodig" laat de klant in het ongewisse, en faalt stil
- `handleRevisionResolve` zet het beeld terug op `pending` en schrijft een tijdlijnregel, maar mailt de klant niet (r. 1077–1103). Hij heeft zijn ene revisieronde al gebruikt (portal.js r. 714) en hoort niet dat er geantwoord is.
- De batch heeft `.catch(() => {})` (r. 1098), en daarna wordt "resolve" gewoon gelogd en terugverwezen. Faalt D1, dan denk je dat het gelukt is.

**Oplossing:** de fout tonen, net als bij annuleren (r. 1260–1284). Optioneel een korte mail, of het antwoord meenemen in de eerstvolgende herleveringsmail ("op 2 beelden: geen wijziging, omdat …").

### B13. De revisieteller boven en de revisielijst eronder tellen iets anders
- De teller telt bestanden met `revision_requested`, zonder `superseded_at IS NULL` (r. 5186–5187).
- De inbox sluit vervangen beelden wel uit (r. 7418).
- Het filter "Revisies open" (r. 7474) sluit ze ook niet uit.

Na het uploaden van een vervanging, maar vóór het melden (`closeReplacedRevisions` draait pas bij melden, r. 4894), zegt de teller dus "3", toont de lijst er 2, en toont het filter de bestelling nog.

**Oplossing:** overal `AND f.superseded_at IS NULL`, of de teller op dezelfde query als de inbox laten draaien.

### B14. Een product dat foto's mist of waar de klant iets moet doen, heeft geen eigen status
Er is geen status of actie "wacht op klant" (onbruikbare foto's, ontbrekende info). Er is ook geen manier om later foto's van de klant toe te voegen aan een bestaande bestelling: `handleDeliveryUpload` schrijft alleen `kind = 'delivery'` (r. 3952), en WhatsApp-foto's kunnen alleen mee bij het aanmaken via "namens" (r. 9951–9970). Zo'n bestelling loopt intussen in de planning als "te laat".

**Oplossing:**
- Een vlag of status "wacht op klant" (`orders.on_hold_at` + reden) die de planning pauzeert en een mail met de vraag stuurt.
- Op de bestelpagina een uploadveld "Foto's van de klant toevoegen" (kind `upload`, `product_key` kiezen).

### B15. `.muted`, `.hint` en `.req` hebben geen opmaak
`class="muted"` komt 52 keer voor in admin.js, maar `public/admin.css` kent geen `.muted` (alleen `.meta`, r. 538). Ook `.hint` (r. 6412) en `.req` (r. 6406, 6434) zijn niet gestyled. Alle uitlegtekst die "stil" bedoeld is, staat dus op volle sterkte. Dat is een directe bijdrage aan het "te druk" dat je op 20/9 noemde (comment r. 3403–3406).

**Oplossing:** in admin.css `.muted, .hint { font-size: .82rem; color: var(--ink-3); }` en `.req { color: var(--danger) }`, of de klassen vervangen door `.meta`. Controleer daarna het contrast in beide thema's.

### B16. Het ingeklapte "Administratie"-blok gaat niet open bij een btw-probleem
De `open`-regel test `afmaken|Nog niet gecontroleerd|warnline` alleen op `${factuurBlok}${controleBlok}` (r. 3520). Een factuur die nog af moet en een uniciteitscontrole die ontbreekt of een treffer heeft, openen het blok dus wel. Maar `vatRow` telt niet mee. "Nog niet op de opgaaf ICP" (r. 2674) en "VIES: niet bevestigd" (r. 2669) blijven daardoor ingeklapt. Juist die horen in de kwartaalaangifte.

**Oplossing:** `vatRow` meenemen, of beter een expliciete boolean `aandacht` per blok in plaats van een regex over HTML.

### B17. Het logboek labelt een geslaagde annulering verkeerd als "deels"
`logAdmin(… terug.abonnement && terug.slots === terug.items ? 'plan-slots-terug' : 'plan-slots-terug.deels' …)` (r. 1345). Sinds de credits geeft `queueTerugNaAnnulering` in `slots` het aantal **credits** terug (subscription.js r. 1454–1459), niet het aantal items. Twee catalogitems = 8 credits ≠ 2, dus elke geslaagde terugboeking wordt als "deels" gelogd.

**Oplossing:** vergelijken met `terug.credits === wil` (laat `wil` meekomen in het resultaat), of alleen op `abonnement` beslissen.

---

## NICE-TO-HAVE — sneller of rustiger

- **N1. Getallen die met de hand zijn ingetypt.** "Een catalogset is 4 credits, een lifestylecarrousel 5, een motion-clip 5, een hook 10 en een lifestyle-clip 12" (r. 6260) staat letterlijk in de tekst, terwijl `SERVICE_CREDITS` in `src/data/pricing.js` (r. 393–399) de bron is. Vandaag klopt het; bij de volgende prijswijziging niet meer. Genereer de zin uit `SERVICE_CREDITS`. Het standaardgetal `value="4"` in hetzelfde veld (r. 6254) laat een snelle klik +4 credits boeken; maak het leeg.
- **N2. Het landlabel van de klant wordt nooit gelezen.** `renderCustomer` gebruikt `customer.country` (r. 6507 voor KVK/"reg.", r. 6629 voor het verlegd-vinkje), maar `country` staat niet in de SELECT (r. 5884–5891). `regLabel` is daardoor altijd "KVK", ook bij een Belgische of Duitse klant. Zet `country` in de SELECT.
- **N3. Tegels zonder doel.** "vandaag binnen" en "open" zijn de enige twee niet-klikbare tegels (r. 5230, 5233). Laat "open" naar `/admin/planning` wijzen en "vandaag binnen" naar een filter `f=today`.
- **N4. "Ook verborgen" gooit je zoekopdracht weg.** De link is hard `/admin?hidden=…` (r. 10147) en verliest status, zoekterm en filter. Bouw hem met dezelfde `URLSearchParams` als `chip()` (r. 10110–10118).
- **N5. "Vandaag" is UTC.** `date('now')` (r. 5163), `new Date().toISOString().slice(0,10)` in de planning (r. 8873) en "Eerst af" (r. 10059) rekenen in UTC. Tussen 00:00 en 02:00 Nederlandse tijd is "vandaag" dus gisteren, en een bestelling van 00:30 telt niet als "vandaag binnen". Gebruik één helper `vandaagNL()` via `Intl` met `Europe/Amsterdam`, zoals `when()` al doet (r. 10672–10679).
- **N6. Kapotte link op de revisiekaart.** "Klant bekijken" wordt `/admin/customers/null` als de bestelling geen `customer_id` heeft (r. 10330). Dat geeft "Niet gevonden". Toon de link alleen als er een klant is.
- **N7. Snelle revisie-workflow.** De revisiekaart heeft al een upload in het juiste vakje (r. 10304–10311). Twee kleine stappen erbij:
  - (a) na de upload terug naar `/admin#rev-<id>` in plaats van naar de bestelpagina;
  - (b) een knop "Alle vervangingen van deze bestelling melden" direct op de kaart, die naar `/announce` post. Dat scheelt een paginawissel per revisie.
- **N8. Zoeken.** Je zoekt op referentie, merk, e-mail en naam (r. 7470). Zoeken op telefoonnummer (WhatsApp-klanten) en op bestelnummer `#123` ontbreekt. Het logboek kent geen filter en toont alleen de laatste 200 (r. 8303–8306). Voeg `?order=` en `?klant=` toe; de links in het log bestaan al.
- **N9. Tevredenheid onzichtbaar.** `order_feedback.score` en `private_note` worden in admin nergens getoond (alleen in de wisroutine, r. 1865). Een score op de bestelpagina en een gemiddelde op de klantpagina helpen bij het opvolgen.
- **N10. Dubbele "Geleverd"-regel op de tijdlijn.** Een mislukte leveringsmail opnieuw proberen gaat via "status opnieuw op geleverd zetten" (r. 10358). Dat schrijft telkens een nieuwe `order_events`-regel "Geleverd" op de tijdlijn van de klant (r. 2050–2052). Een aparte knop "Leveringsmail opnieuw proberen" die alleen `sendDeliveryMail` draait, houdt de tijdlijn schoon.
- **N11. Maandset.** `handleMaandsetUpload`:
  - vertrouwt het type van de browser (`file.type`, r. 7200), terwijl de leveringsupload bewust op de extensie kiest (r. 3930–3948);
  - laat bij een mislukte R2-put een rij met `r2_key = 'shared/<m>/pending'` achter, want er is geen try/catch (r. 7203–7208).

  Klein, maar dezelfde regel als elders.
- **N12. Ontbrekende mail-sleutel = "gemeld".** Zonder `RESEND_API_KEY` doet `sendMail` stil een `return` (mail.js r. 49–55). `sendDeliveryMail` stempelt daarna toch `delivery_mailed_at` (r. 4224–4229). De bestelling staat dan als gemeld terwijl er niets weg is. Laat `sendMail` in dat geval `false` teruggeven en stempel alleen bij succes.
- **N13. Eén "vandaag"-scherm.** Het dashboard heeft de bouwstenen al (tegels, Eerst af, revisies, bewakers). Wat ontbreekt om er echt "wat vraagt vandaag mijn aandacht" van te maken: B6 (opgeschoonde werklijst), B7 (abonnees klaar), de onbetaalde rijen met een "link opnieuw"-knop (B5), afgewezen btw (K5), en "betaald maar geannuleerd" (K7). Eén kolom, gesorteerd op urgentie, elke regel met de ene knop die erbij hoort.

---

## Volgorde waarin ik het zou aanpakken

1. K1, K2 en K7: geld dat dubbel of verkeerd terechtkomt. Elk een paar regels.
2. K3 en K4 samen: eerst kiezen of "uploaden ≠ zichtbaar" de regel is, dan het afronden vanuit admin.
3. K5, K6, B1 en B2: kleine reparaties met direct effect voor de klant.
4. B3, B4 en B5: de bestelpagina compleet maken (betaalstatus, status, tijdlijn, betaallink). Dat scheelt de meeste klikken per dag.
5. B9, B10, B11 en B15: taal en rust.
6. B6, B7 en N13: het "vandaag"-overzicht.
