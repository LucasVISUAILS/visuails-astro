# Doorlichting e-mails en tokenportaal — VISUAILS

Stand van 1 oktober 2026, gelezen in `/home/claude/repo`. Ik heb niets in de repo aangepast. Elke bewering hieronder heeft een `bestand:regel`. Twee dingen heb ik ook echt uitgevoerd: de platte-tekstversie van de levermail en de bevestigingsmail van een proefvisual. Allebei zijn ze lokaal gerenderd met `htmlToText()`.

Alles gaat via één verzendfunctie: `sendMail()` in `src/lib/mail.js:28`. Daar staan het vaste `reply_to: 'hello@visuails.com'` (`mail.js:80`) en de automatisch afgeleide platte tekst (`mail.js:79`). Die tekst ontbreekt dus nergens. Eén uitzondering: het nachtrapport doet een eigen `fetch` en verstuurt alleen tekst (`cron/index.js:1795`).

---

## 1 · Overzicht van alle mails

### Naar de klant

| # | Mail | Trigger (waar) | Taal | Onderwerp (nl / en) | Hoofdknop → bestemming |
|---|---|---|---|---|---|
| 1 | Orderbevestiging / aanvraag ontvangen | POST /api/order, voor elke bestelling en aanvraag, ook de proefvisual en ook vóór de doorstuur naar Mollie (`functions/api/order.js:1814`; sjabloon `customerEmail` `:3221`) | `lang` uit het formulier | `We hebben je bestelling — REF` / `We've got your order — REF` (bij een aanvraag: `…je aanvraag…`) | Betaalpaneel → `/api/order-pay?ref=&lang=` (bestaat, `functions/api/order-pay.js`) · tekstlink → `/o/<token>` |
| 2 | Checklist (leadmagneet) | `service=subscribe` (`order.js:600`; `subscriberEmail` `:3502`) | formulier | `Zo maak je de productfoto's die wij nodig hebben` / `How to shoot…` | `/nl/upload-guidelines` + pdf `/downloads/visuails-fotogids-nl.pdf` (bestaat) |
| 3 | Betaling ontvangen + factuur (pdf, bcc naar de administratie) | Mollie-webhook bij `paid` (`webhook/mollie.js:1622`), volledig met tegoed betaald (`tegoedBetaling.js:44`), knop "opnieuw versturen" in admin (`admin.js:4811`) | factuur-/ordertaal | `Betaling ontvangen — REF` / `Payment received — REF` | Tekstlink → `/nl/account` (redirect → `/account?lang=nl`) |
| 4 | Betaallink: nagekeken / offerte / herinnering | btw-akkoord (`admin.js:9744`), offerte (`admin.js:10048`), herinnering na 3 dagen onbetaald (`cron/index.js:341`); sjabloon `betaallink.js:93` | ordertaal | `Je bestelling is nagekeken — REF` · `Je offerte — REF` · `Je bestelling wacht nog op betaling — REF` | `/api/order-pay?ref=&lang=` |
| 5 | Levering ("staat klaar") | Admin zet de status op `delivered` (`admin.js:2066-2072` → `sendDeliveryMail` `:4164`, sjabloon `:4683`) | ordertaal | `Je bestelling staat klaar — REF` / `Your order is ready — REF` | `/o/<nieuw token>` |
| 6 | Herlevering / revisie klaar | Knop "aankondigen" in admin (`admin.js:4826`, sjabloon `:4939`) | ordertaal | `Je revisie staat klaar — REF` of `Nieuwe beelden voor je bestelling — REF` | `/o/<token>` |
| 7 | Nieuwe portaallink | Knop "nieuwe link" in admin (`admin.js:4441`, sjabloon `:4523`) | ordertaal | `Je nieuwe link — REF` | `/o/<token>`; de oude link wordt ingetrokken |
| 8 | Annulering | Annuleren in admin (`admin.js:1509` → `cancelMail.js:144`) | ordertaal | `Je bestelling REF is geannuleerd` | Tekstlink → `/nl/account` |
| 9 | Creditnota (pdf, bcc) | Restitutie via de webhook (`mollie.js:1203`) of later via cron (`cron/index.js:1050`) | notataal | `Je creditnota — REF` | `/nl/account` |
| 10 | Leverdatum vrijgegeven | Cron: venster na 7 dagen onbetaald (`cron/index.js:271`) | ordertaal | `Je gereserveerde leverdatum is vrijgegeven — REF` | geen knop ("betaal via de link in je bevestigingsmail") |
| 11 | Bestelling vervallen | Cron: 7 dagen na btw-akkoord niet betaald (`cron/index.js:476`) | ordertaal | `Bestelling REF is vervallen` | `/nl/start` |
| 12 | Inlogcode + link | `/account/login` (`account.js:2243`, sjabloon `:8443`); admin-knop (`admin.js:5861`) | formulier; **admin altijd nl** | `Je inlogcode voor VISUAILS` | `/account/verify/<token>?lang=` |
| 13 | Bevestig nieuw e-mailadres | Studio › gegevens (`account.js:8100`, sjabloon `:8327`) | cookie/browser | `Bevestig je nieuwe e-mailadres` | `/account/email/<token>` |
| 14 | E-mailadres gewijzigd (naar het oude adres) | Na de bevestiging (`account.js:8190`, sjabloon `:8385`) | cookie/browser | `Het e-mailadres van je VISUAILS-account is gewijzigd` | `/account/email/undo/<token>` |
| 15 | Welkom abonnement (eerste betaalde maand + factuur) | Webhook (`mollie.js:715-716` → `invoiceMail.js:317`, `eerste=true`) | factuurtaal | `Welkom bij VISUAILS — je abonnement loopt (SUB-REF)` | Inlogknop `/account/verify/…&naar=plan`, **1 uur geldig** |
| 16 | Maandtermijn betaald (+ factuur) | Webhook, elke volgende maand (zelfde functie, `eerste=false`) | factuurtaal | `Je credits voor <maand> staan klaar — REF` | `/nl/account/plan` |
| 17 | Abonnement gepauzeerd / hervat / opgezegd | Klant in Studio (`account.js:7052, 7066, 7216, 7223` → `mailAboWijziging` `:7074`) | taal van de laatste abonnementsfactuur | `Je abonnement staat op pauze — REF` enz. | `/nl/account/plan?tab=facturering` |
| 18 | Laatste maand van een vooruitbetaald jaar | Cron (`cron/index.js:1316`) | `KLANT_TAAL_SQL` | `De laatste maand van je vooruitbetaalde jaar — REF` | `/nl/account/plan?tab=planning` |
| 19 | Credits vervallen (7 en 2 dagen vooraf) | Cron (`cron/index.js:1467`) | idem | `Je hebt nog N credits — ze vervallen over N dagen` | idem |
| 20 | Vaste week begint, niets vastgezet | Cron, 5 dagen vooraf (`cron/index.js:1740`) | idem | `Je vaste week begint bijna en er staat nog niets vastgezet` | `/nl/account/plan?tab=bestellen` |
| 21 | Welkom Studiobrief | Nieuwe aanmelding (`functions/api/studiobrief.js:144`) | formulier | `Je staat op de lijst voor de Studiobrief` | geen knop |

### Naar de studio (altijd Nederlands, naar `NOTIFY_EMAIL`)

| Mail | Trigger | Onderwerp |
|---|---|---|
| Nieuwe bestelling/aanvraag, met de uploads als bijlage | `order.js:1648-1682` (`notifyEmail` `:3080`) | `Nieuwe bestelling · <dienst> — REF` (`[VENSTER KWIJT]` ervoor bij een race) |
| Bestelling niet weggeschreven | `order.js:1512` (kale HTML, zonder sjabloon) | `!! Bestelling niet weggeschreven — REF` |
| Checklist-aanmelding / contactformulier / Studiobrief | `order.js:609`, `order.js:636`, `studiobrief.js:149` | `Checklist-aanmelding — mail` · `Contact — naam · onderwerp` · `Studiobrief — mail` |
| Betaald | `notify.js:109` ← `mollie.js:1551`, `tegoedBetaling.js:41` | `Betaald · REF · €` |
| Betaling niet gelukt | `notify.js:143` ← `mollie.js:307` | `Betaling niet gelukt · REF` |
| Btw-twijfel (0 % met een EU-betaalmiddel) | `notify.js:174` ← `mollie.js:1697` | `Even nakijken: btw · REF` |
| Tweede proefvisual tegengehouden | `notify.js:210` ← `mollie.js:1522` | `Tweede proefvisual tegengehouden · REF` |
| Revisie (portaal) / revisieronde (Studio) | `notify.js:292` ← `portal.js:737`; `notify.js:358` ← `account.js:4272` | `Revisie gevraagd · REF · …` / `Revisieronde · REF · N beelden` |
| Incasso mislukt / abonnement stilgezet | `notify.js:431` ← `mollie.js:854` | `Incasso niet gelukt · SUB` / `Abonnement gepauzeerd · SUB · incasso mislukt` |
| Restitutie abonnement / nieuw abonnement / pauze-hervat-opgezegd / week verzet / dag naar voren | `notify.js:488, 564, 596, 535, 254` | diverse |
| Lage score of klacht | `feedback.js:501` | `Lage score bij REF — n/5` / `Klacht bij REF — n/5` |
| Nachtrapport (alleen tekst) | `cron/index.js:1778` | `Nachtelijke taken` |

---

## 2 · Bevindingen

### KRITIEK

**K1 · Een dubbele betaling blijft onopgemerkt.** Komt er een tweede geslaagde betaling binnen op een bestelling die al betaald is, dan wordt die wel in `payments` gezet. Daarna stopt de webhook zonder één bericht (`webhook/mollie.js:1260`: `if (order.payment_status === 'paid') return;`). Er gaat geen mail naar de studio, er komt geen terugbetaling en de klant hoort niets. De code maakt een dubbele betaling vrij waarschijnlijk:
- `order.js:1797` maakt een betaling aan en stuurt de klant naar Mollie;
- dezelfde minuut gaat de bevestiging uit met een betaalknop (`order.js:1826`);
- elke klik op `/api/order-pay` maakt een verse betaling, met alleen de controle `payment_status = 'unpaid'` (`order-pay.js`). Een betaling die nog openstaat (bankoverschrijving, `pending`) houdt die knop dus niet tegen.

De webhook zegt het zelf bij `mollie.js:1094-1097`: "Twee betalingen op één bestelling is echter de normale gang".
→ **Voorstel:** een studiomail "Dubbel betaald · REF · €" en een klantmail "We zagen twee betalingen; de tweede (€ X) storten we terug". Of automatisch terugstorten met `refundMolliePayment`, zoals bij de tweede proefvisual al gebeurt. Daarnaast `order-pay` laten weigeren zolang er een betaling op `open`/`pending` staat.

**K2 · Een mislukte incasso of stilgezet abonnement: de klant krijgt geen bericht.** `recordSubscriptionFailed()` (`mollie.js:776-864`) mailt alleen de studio. Bij `gestopt` gaat het abonnement op pauze (`:848`) en kan de klant zijn saldo niet meer besteden (`notify.js:453-456`). Die studiomail zegt zelf: "Wat wél helpt: één bericht aan de klant." Ook een mislukte eerste betaling sluit de aanmelding stil af (`mollie.js:274-290`). De klant ziet het pas als hij Studio opent (`Inlogkaart.astro:59`).
→ **Voorstel:** twee klantmails.
- (a) "Je betaling van € X is niet gelukt — we proberen het opnieuw / zo los je het op", met een knop naar `/account/plan?tab=facturering` om opnieuw te betalen of de machtiging te vernieuwen.
- (b) "Je abonnement staat stil: je credits zijn bewaard maar bevroren tot de betaling lukt."

Een vergelijkbare mail na een mislukte eerste betaling is ook nodig: "Je aanmelding is niet afgerond — probeer het opnieuw".

**K3 · De knop "nieuwe link" stuurt na 90 dagen een link die meteen dood is.** `isExpired()` rekent de vervaldatum altijd uit `closed_at + 90 dagen`, voor elk token (`token.js:184-192`), en het portaal gebruikt die regel (`portal.js:832-834`). `handleFreshLink()` maakt een nieuw token (`admin.js:4472`), maar dat token valt onder dezelfde einddatum van de bestelling. Juist het geval waarvoor de knop gebouwd is ("link leeft 90 dagen, het werk twaalf maanden", `admin.js:4272-4275`, belofte in /privacy en /terms) levert dus een mail op met een link die "verlopen" zegt.
→ **Voorstel:** geef een token dat met de hand is uitgegeven een eigen geldigheid (bijvoorbeeld `expires_at = now + 30 dagen`) en laat dat in `tokenVerlopen()` voorgaan op de afgeleide einddatum. Een tweede mogelijkheid: verwijs na 90 dagen naar Studio, met een inloglink in plaats van een portaallink.

### BELANGRIJK — bugs

**B1 · De revisieronde vanuit het portaal roept de verkeerde meldfunctie aan.** `portal.js:737-742` stuurt `notifyRevision(env, { orderId, fileIds: eigen, note, round: true })`. `notifyRevision()` kent alleen `fileId` (`notify.js:292`). Gevolg: de query bindt `undefined`, valt in de `catch`, en het onderwerp wordt `Revisie gevraagd · REF · bestand undefined`, met één beeld in plaats van de hele ronde. De Studio-route doet het wel goed (`account.js:4272`, `notifyRevisionRound`). Het portaal is juist de route via de link in de levermail.
→ **Voorstel:** `notifyRevisionRound(env, { orderId, items: eigen.map((fileId) => ({ fileId, note })) })`.

**B2 · De herleveringsmail belooft een tweede revisie die niet bestaat.** `admin.js:4968-4969`: "…opnieuw goedkeuren of nog een keer laten aanpassen" / "approve or ask again". Er is precies één ronde: `revisionRoundState()` geeft `gebruikt` terug (`pricing.js:1053`), het formulier is dicht (`portal.js:280`) en de studiomail zegt het met zoveel woorden (`notify.js:399`).
→ **Voorstel:** "Klopt er nog iets niet? Stuur ons een bericht, dan lossen we het op." Dat zegt het portaal ook (`rrUsedBody`).

**B3 · De mails rond de proefvisual kloppen op drie punten niet.** Dit is de eerste indruk van een nieuwe klant.
- De bevestiging gaat uit vóór de betaling (`order.js:1814`), en daarna wordt de klant naar Mollie gestuurd (`:1944-1970`). Haakt hij af, dan heeft hij een mail met "Je bestelling staat genoteerd". Er staat niets in over de betaling van € 1 (+ btw).
- De mail belooft "Tevredenheidscheck: 1 revisieronde … binnen 7 dagen" (`order.js:3310-3312` + `AFTERCARE`). Voor een proef bestaat geen ronde (`pricing.js:1052`: `'nvt'`). Ik heb dit gerenderd en die zin staat er letterlijk in.
- Staat de proef op de beoordelingslijst (bijvoorbeeld omdat VIES niet antwoordde), dan zegt de mail: "Er staat nog geen betaalknop … we sturen je de betaallink" (`:3473-3478`). In werkelijkheid gaat de klant meteen door naar Mollie, want die poort staat met opzet niet op de proef (`:1924-1943`).
- De levermail zegt "per beeld goedkeuren of een revisie aanvragen" (`admin.js:4697-4699`). Voor een proef kan geen van beide (`canSeeReviewHistory` is false, `pricing.js:1079`).

→ **Voorstel:** een eigen proeftak in `customerEmail` en een eigen levermail voor de proef. Dat is ook het moment om te verkopen: "Zo zien jouw producten eruit — bestel de rest", met een knop naar `/start` en de prijs per product. Nu staat er geen enkele vervolgstap in.

**B4 · Op een studiomail antwoorden betekent dat je jezelf mailt.** `reply_to` staat vast op `hello@visuails.com` (`mail.js:80`) en kan niet per mail worden ingesteld. De klachtmail zegt letterlijk "Reageer op deze mail of bel ze" (`feedback.js:534`). Het contactformulier, de nieuwe bestelling en de revisiemelding komen allemaal binnen met jouw eigen adres als antwoordadres.
→ **Voorstel:** een optionele parameter `replyTo` in `sendMail()`, en in elke studiomail die over één klant gaat `replyTo = klantadres`.

**B5 · "Betaling niet gelukt" komt ook als er wel betaald is, en soms meerdere keren.** `mollie.js:292-308` controleert niet of de bestelling al betaald is. Elke klik op `/api/order-pay` maakt een nieuwe betaling (zie K1), en elke betaling die later verloopt geeft een studiomail. Ook als die binnenkomt nádat een andere betaling is geslaagd.
→ **Voorstel:** sla het bericht over als `payment_status = 'paid'`, en stuur er hooguit één per bestelling per 24 uur.

**B6 · De betaalbevestiging voor de klant hangt aan de factuur.** De enige mail "Betaling ontvangen" is `mailInvoice` (`mollie.js:1613-1627`). Gooit `issueInvoice()` een fout of is `total_cents` 0 (`:1607-1611`), dan krijgt de klant niets: geen bevestiging en geen "we zijn begonnen". De nachtelijke taak geeft zo'n factuur later wel uit, maar mailt hem met opzet niet (`cron/index.js:1083-1084`).
→ **Voorstel:** een eenvoudige mail "Betaling ontvangen" zonder factuur als terugval. Of een kolom `invoice_mailed_at`, zodat de cron hem veilig alsnog kan versturen.

**B7 · Een nieuw e-mailadres werkt niet door naar lopende bestellingen.** De adreswijziging past alleen `customers.email` aan (`account.js:8153`). Levering (`admin.js:4167`), factuur (`mollie.js:1620`), annulering, betaallink (`betaallink.js:38`) en herinnering lezen allemaal `orders.email`. Na een wijziging (of na een herstel bij een overname) gaan die mails dus naar het oude adres. Abonnementsmails lezen `customers.email` en gaan naar het nieuwe adres: het systeem is hier niet consequent.
→ **Voorstel:** bij de bevestiging ook de open bestellingen van die klant bijwerken (`UPDATE orders SET email=… WHERE customer_id=… AND closed_at IS NULL`). Of de klantmails van bestellingen het adres laten lezen via `customers`.

**B8 · De admin-knop "inloglink sturen" stuurt altijd Nederlands.** `admin.js:5861` geeft `'nl'` vast mee. Een Engelstalige klant krijgt een Nederlandse inlogmail.
→ **Voorstel:** de taal halen uit de laatste bestelling of abonnementsfactuur, zoals `KLANT_TAAL_SQL` in de cron doet.

**B9 · Als de levermail mislukt, merkt niemand het.** `admin.js:2069-2071` vangt de fout af met alleen `console.error`, en het scherm laat zien dat het gelukt is. De klant hoort niets over de dienst waar het om draait. (De noot zegt "Not awaited", maar de aanroep wacht wel.)
→ **Voorstel:** bij een mislukte verzending een rode regel op de bestelpagina, zoals de herleveringsknop al doet (`admin.js:4885-4888`), plus een regel in het nachtrapport voor `delivered_at IS NOT NULL AND delivery_mailed_at IS NULL`.

**B10 · Een bevestiging zonder betaallink zegt niets over betalen.** Lukt het aanmaken van de Mollie-betaling niet (Mollie plat of sleutel weg, `order.js:1795-1812`) en staat de bestelling niet ter beoordeling, dan heeft de mail geen betaalpaneel en ook geen uitleg (`:3444-3478`). De klant denkt dat alles klaar is tot de herinnering op dag 3. Hetzelfde geldt voor de alarmmail "niet weggeschreven" (`:1515-1517`): die zegt "De klant heeft wél een bevestiging gekregen". Die bevestiging heeft dan geen portaal- en geen betaallink, en belooft het gewone verloop.
→ **Voorstel:** een derde tekst in de mail: "We sturen je de betaallink binnen een werkdag".

**B11 · notifyPaid zegt "De factuur is al naar de klant gestuurd" (`notify.js:125`).** Hij wordt echter vóór het uitgeven van de factuur aangeroepen (`mollie.js:1551` tegenover `:1617`), en bij een bedrag van 0 of een fout komt er helemaal geen factuur.
→ **Voorstel:** zet notifyPaid na de factuur, of laat die zin weg.

### BELANGRIJK — gaten in de klantreis

**C1 · Na de betaling is het stil tot de levering.** De betaalmail zegt alleen "we zijn met je bestelling aan de slag" (`invoiceMail.js:65`). Hij herhaalt de gereserveerde datum niet, en ook niet "vaak binnen een dag" of de voorrangsdeadline. Hij linkt naar `/account` en niet naar het portaal van deze bestelling. Statuswissels geven met opzet geen mail (`StudioPage.astro:11-16`). Bij een bestelling van een paar dagen is dit het moment waarop een klant gaat twijfelen.
→ **Voorstel:** een blok "Wat nu" in de betaalmail, met dezelfde tijdszin als in de bevestiging (de vertakking uit `customerEmail`) en de portaallink. Een optie daarbovenop: één mail "even ter info: het duurt iets langer" als een bestelling zonder datum na 3 dagen nog niet geleverd is.

**C2 · De revisietermijn staat nergens in de levermail en wordt niet afgedwongen.** `REVISIE_DAGEN = 7` (`pricing.js:2107`) staat alleen in de tekst. De levermail, het moment waarop die klok begint, noemt geen termijn en geen datum (`admin.js:4697`). Ook wordt nergens gezegd dat het één ronde is. Na het indienen van een ronde krijgt de klant geen bevestiging met een verwachte levertijd (`portal.js:737-745`, `account.js:4272`).
→ **Voorstel:**
- in de levermail: "Je hebt tot <datum> voor je ene revisieronde";
- op dag 5 een herinnering, alleen als er nog niets is beoordeeld;
- een korte ontvangstbevestiging na een ronde: "We hebben N beelden genoteerd, je hoort het als ze klaar zijn".

**C3 · Om een review wordt nooit per mail gevraagd, en bestellingen sluiten bijna nooit.** Een bestelling sluit alleen als elk beeld is goedgekeurd (`close.js`). Er is geen automatische afsluiting na de revisietermijn, en de reviewherinnering is bewust nog niet gebouwd (`cron/index.js:38-42`). Wie downloadt en niet op "goedkeuren" klikt, krijgt de reviewvraag dus nooit te zien (`portal.js:1122`). De bewaartermijnen, die rekenen vanaf `closed_at`, gaan dan ook nooit lopen.
→ **Voorstel:** cron sluit bestellingen automatisch af `REVISIE_DAGEN` dagen na levering, met een mail "Je bestelling is afgerond — hoe was het?". Die mail bevat de score-knoppen (1 tot 5) die naar het bestaande feedbackblok linken.

**C4 · Een tegengehouden tweede proefvisual: de klant krijgt geen mail.** De euro gaat terug en de bestelling wordt geannuleerd (`mollie.js:1467-1532`). De uitleg staat alleen op de pagina waar Mollie naar terugstuurt (`:1529-1531`; `ThankYouPage.astro` `cancelP1`). Sluit de klant het tabblad of mislukt de terugkeer, dan ziet hij alleen een terugboeking zonder uitleg.
→ **Voorstel:** een korte mail met dezelfde tekst als cancelP1–P3, met de knop "Bekijk de diensten".

**C5 · Een afgewezen btw-beoordeling: de klant krijgt geen mail.** Bij `reject` komt er alleen een regel op de tijdlijn ("…nemen contact met je op", altijd Nederlands, `admin.js:9703-9710`). De bevestiging beloofde "binnen een werkdag de betaallink".
→ **Voorstel:** een mail "We hebben een vraag over je btw-gegevens" met een antwoordmogelijkheid. Of een verplicht veld "bericht aan klant" bij het afwijzen.

**C6 · Twee beloftes over de leverdatum hebben geen mail erachter.**
- De bevestiging zegt bij een bestelling zonder venster "We komen bij je terug met de datum" (`order.js:3279`).
- De mail na het vrijgeven zegt "we plannen dan opnieuw en laten je weten wanneer" (`cron/index.js:287-289`).
- Er bestaat geen mail "je leverdatum staat vast". In `admin.js` zijn er maar drie `sendMail`-aanroepen: levering, nieuwe link en herlevering.
- Ook staat de betaaltermijn van 7 dagen voor een gereserveerde datum niet in de bevestiging (`order.js:3266-3271` tegenover `:1726-1730`). De klant hoort er pas van in de herinnering op dag 3 en daarna in de vrijgavemail ("er is binnen zeven dagen niet betaald").

→ **Voorstel:** in de bevestiging "Betaal vóór <datum>, dan blijft deze datum voor je vast". Daarnaast een adminknop "leverdatum bevestigen" die een mail stuurt. De vrijgavemail krijgt een eigen betaalknop (`/api/order-pay`) en een begroeting.

**C7 · Een mail die terugkomt (bounce) geeft geen alarm.** De Resend-webhook slaat alleen op (`functions/api/webhook/resend.js`; `bounces.js`) en toont een rode regel in /admin. Een tikfout in het adres bij het bestellen betekent dat de bevestiging en de betaallink nooit aankomen, en dat zie je alleen als je zelf gaat kijken.
→ **Voorstel:** bij `email.bounced` voor een adres met een open bestelling van minder dan 14 dagen oud direct een studiomail met het telefoonnummer erbij (zoals bij `notifySampleBlocked`).

**C8 · Geen vooraankondiging van incasso's (graag nagaan).** Maandabonnementen worden via SEPA geïncasseerd (`subscribe.js:18`, `sequenceType: 'first'`). Ik vond nergens een mail vóór de incasso en ook geen tekst over een vooraankondiging in de voorwaarden. Het SEPA-incassoschema vraagt in de regel een vooraankondiging met bedrag en datum (standaard 14 dagen, korter als dat is afgesproken).
→ **Voorstel:** nagaan met Mollie of de voorwaarden. Een optie is een korte mail 3 dagen vooraf: "Op <datum> schrijven we € X af — je saldo van deze maand staat klaar". Die past ook bij de credit-herinneringen.

**C9 · Na het contactformulier krijgt de bezoeker geen ontvangstbevestiging.** `order.js:623-654` mailt alleen de studio. De bedanktpagina belooft "meestal binnen het uur" (`ThankYouPage.astro` `flowContact`), maar de bezoeker heeft niets in zijn mailbox. Kiest hij voor WhatsApp, dan heeft hij ook geen kopie van zijn vraag.
→ **Voorstel:** een korte automatische bevestiging met een kopie van het bericht en de beloofde reactietijd.

### NICE-TO-HAVE

**N1 · De spamregel staat in de mail die de lezer al heeft.** "Na een paar minuten nog niets? Kijk in je spam…" (`mailTemplate.js:286`, `mailNote.js`) staat in de bevestiging, de levering, de herlevering, de nieuwe link, de betaallink en de cronmails. `invoiceMail.js:150-155` noemt precies dit al een fout.
→ **Voorstel:** "Voeg orders@visuails.com toe aan je contacten, dan komt de levermail zeker binnen."

**N2 · De platte tekst begint met ruis.** Gerenderd zag de levermail er zo uit:

```
VIS-TEST-123 staat klaar in je portaal — 4 beelden.
https://visuails.com
VISUAILS (https://visuails.com)
```

Dat komt door de verborgen preheader (`mailTemplate.js:354`) en het logo met de woordmerklink (`:299-302`), die `htmlToText` (`mail.js:151`) allebei meeneemt.
→ **Voorstel:** markeer de preheader en het briefhoofd (bijvoorbeeld `data-tekst="nee"`) en sla ze over in `htmlToText`.

**N3 · Onderwerpregels en toon zijn niet overal gelijk.** De meeste regels hebben de vorm "Wat — REF". Uitzonderingen:
- `Je bestelling REF is geannuleerd` (`cancelMail.js:67`) en `Bestelling REF is vervallen` (`cron:485`) zetten de referentie midden in de zin;
- `Welkom … (REF)` zet hem tussen haakjes (`invoiceMail.js:258`);
- de credit- en wachtrijmails hebben geen referentie;
- `Je bestelling is nagekeken` blijft hetzelfde als er btw bij komt en het bedrag dus omhooggaat (`betaallink.js:99`; alleen de kop verandert, `:108-110`).

Verder:
- de bevestiging gebruikt het woord "order" in het Nederlands en zegt "Houd hem binnen je team" (`order.js:3347`), terwijl de levermail zegt "stuur hem gerust door aan een collega" (`admin.js:4705`);
- de cronmails voor de credits en de laatste maand hebben geen begroeting;
- "app ons even" staat erin zonder WhatsApp-link (`cron:1500`).

**N4 · Bedragen en datums worden op twee manieren opgemaakt.**
- De bevestiging gebruikt `Intl.NumberFormat` (`order.js:3383`), de rest `bedrag()` (`mailTemplate.js:111`). In `invoiceMail.js:45` staat al waarom Intl hier wisselvallig is.
- De studiomail toont ruwe ISO-datums bij het venster (`notify.js:123`).
- De tijdlijn zegt "leverdatum X **of** Y" (`order.js:3040`), de mail "X **tot en met** Y" (`:3270`).

**N5 · De inlogknop in de welkomstmail werkt maar een uur** (`invoiceMail.js:268`, `account.js:2220-2233`). Wie de mail de volgende ochtend opent, komt op een verlopen link.
→ **Voorstel:** 24 tot 72 uur geldig voor deze ene link, of een knop naar `/account/login?email=…` met het adres al ingevuld.

**N6 · De opzegmail noemt geen einddatum.** "Blijven te besteden tot het einde van deze termijn" (`account.js:7095`) zonder datum. Vooruitbetaalde abonnees krijgen ook geen maandmail "credits staan klaar", alleen een mail in de laatste maand (`cron:1301`). Maandbetalers krijgen die wel.

**N7 · De taal kan verloren gaan via `/nl/account/*`.** De regel `/nl/account/* /account/:splat` (`public/_redirects:91`) zet `?lang=nl` er niet bij. Die links staan in `account.js:7129`, `cron:1339, 1496, 1763` en `invoiceMail.js:346`. De taal hangt dan af van de cookie of de browser.
→ **Voorstel:** link in de mails rechtstreeks naar `/account/plan?lang=nl&tab=…`. Of de querystring met een test op de live redirect nagaan.

**N8 · Drie mails binnen een minuut, of in de verkeerde volgorde.**
- Sinds de directe doorstuur naar Mollie krijgt de klant de bevestiging (met een betaalknop die meteen achterhaald is), dan "Betaling ontvangen", en de studio krijgt "Nieuwe bestelling" en "Betaald".
- Bij volledig betalen met tegoed komt de factuurmail vóór de bevestiging (`order.js:1793` vóór `:1814`).

→ **Voorstel:** het betaalpaneel in de bevestiging kleiner maken ("Nog niet afgerond? Betaal hier") als de klant meteen naar Mollie gaat. Bij betalen met tegoed eerst de bevestiging versturen.

**N9 · Bij abonnementen hoort de klant niets tussen het vastzetten en de levering.** Er komt geen mail "je week is gestart, N producten in productie" (`planStart.js` verstuurt niets).

**N10 · De Studiobrief heeft geen dubbele bevestiging (single opt-in)** (`studiobrief.js:116-148`). Iedereen kan elk adres aanmelden. Een bevestigingsklik is in Nederland en Duitsland de gangbare norm.

**N11 · De betaalherinnering gaat ook naar onbetaalde proefvisuals** (`cron:318-327`, `total_cents > 0`). Wie een eerste proefpoging liet liggen en later een nieuwe proef betaalde, krijgt een herinnering voor de oude. Betaalt hij die, dan wordt hij automatisch geannuleerd als "tweede proef".
→ **Voorstel:** `AND service <> 'test-sample'`, of alleen als er geen betaalde proef op hetzelfde adres staat.

**N12 · Kleine onnauwkeurigheden.**
- De mail met de nieuwe link zegt "blijven N dagen bij ons staan" (`admin.js:4543`), terwijl die termijn vanaf de levering loopt en niet vanaf vandaag.
- De telling in de levermail rekent vervangen bestanden mee (`admin.js:4172-4175`, zonder `superseded_at IS NULL`).
- In `demo.js:514` staat nog "Buiten de EU … sturen we de betaallink per mail". Sinds 29 september gaat dat meteen naar Mollie (`vat.js:336-350`).

---

## 3 · De klantreis in één oogopslag

| Moment | Wat de klant nu krijgt | Waar het stil is |
|---|---|---|
| Bestelling geplaatst | Bevestiging (1) | Bij een gereserveerde datum staat de betaaltermijn er niet in (C6). Zonder betaallink staat er geen uitleg (B10). |
| Betaling | Betaling ontvangen + factuur (3) | Geen "wat nu" (C1). Mislukt de factuur, dan komt er niets (B6). Een dubbele betaling blijft onopgemerkt (K1). |
| Betaling mislukt of afgebroken | Niets; herinnering op dag 3 (4), vrijgave op dag 7 (10) | Studio krijgt valse of dubbele meldingen (B5). |
| In productie | Niets (bewust) | Bij bestellingen van meerdere dagen (C1). |
| Geleverd | Levermail (5) | Geen termijn of datum voor de revisieronde (C2). Een mislukte verzending valt niet op (B9). |
| Revisie | Niets (studio krijgt wel een melding, vanuit het portaal kapot: B1) | Geen ontvangstbevestiging (C2). |
| Revisie klaar | Herlevering (6), belooft een tweede ronde (B2) | — |
| Afgerond / review | Niets per mail | Sluit bijna nooit (C3). |
| Proefvisual | Bevestiging vóór betaling, levermail zonder vervolgstap | B3, C4, N11 |
| Abonnement start | Welkom + factuur (15), inlogknop 1 uur geldig (N5) | — |
| Verlenging | Termijnmail (16) | Geen vooraankondiging (C8). |
| Incasso mislukt / stilgezet | Niets | K2 |
| Pauze / hervatten / opzeggen | Bevestiging (17) | Geen einddatum (N6). |
| Credits bijna verlopen | 7 en 2 dagen vooraf (19) | — |
