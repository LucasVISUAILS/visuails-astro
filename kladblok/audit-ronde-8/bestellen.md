# Audit bestellen & abonnementen — VISUAILS (1 oktober 2026)

Scope: `functions/api/order.js`, `order-pay.js`, `plan.js`, `upload.js`, `webhook/mollie.js`, `src/lib/subscribe.js`, `subscription.js`, `planStart.js`, `slots.js`, `tegoedVerrekening.js`, `tegoedBetaling.js`, `quote.js`, `src/data/pricing.js`, `plans.js`, `capacity.js`, `vat.js`, `src/scripts/pipeline.js`, `OrderFlow.astro`, `PlanPicker.astro`, `cron/index.js`.
Alleen gelezen, niets gewijzigd. Elke bevinding is in de code nagelopen; regelnummers zijn van de huidige stand.

Wat **klopt** (gecontroleerd, geen bevinding): de prijsberekening in de browser (`quoteFor` + `voorrangBedragNu`, pipeline.js:2930-2976 en 8031-8034) en op de server (`quoteOrder`, quote.js:283-403) geven bij elke combinatie van aantal, outfits, hoeken × producten, 4K, eigen-looktoeslag en voorrang hetzelfde nettobedrag. De voorrangsafronding (`Math.ceil(net*0.2)`) heb ik voor alle bedragen tot € 20.000 tegen een exacte integer-som gezet: geen afwijking. Hoeken (max 4, server klemt op n×4), 4K (alleen lifestyle/complete, aan beide kanten) en de productgrens (20) lopen gelijk.

---

## KRITIEK

### K1 · Tegoed is twee keer uit te geven zodra een onbetaalde bestelling ouder is dan 24 uur
- `tegoedBeschikbaar()` trekt alleen tegoed af dat op onbetaalde bestellingen van **de laatste 24 uur** staat (src/lib/tegoedVerrekening.js:49 `RESERVERING_UREN = 24`, :94 `created_at > datetime('now', ?2)`).
- Maar de oude bestelling houdt `details.tegoed_cents` en blijft betaalbaar tegen bruto − tegoed: `/api/order-pay` rekent `teBetalenCents(o)` (functions/api/order-pay.js:83) zonder het saldo opnieuw te toetsen, en de cron stuurt na 3 dagen zelf een verse link (cron/index.js:314-345).
- De webhook boekt bij betaling af met `boekTegoedAf()` (webhook/mollie.js:1363 → tegoedVerrekening.js:133-…) en die controleert het saldo niet: de klant komt negatief uit.
- **Scenario:** € 100 tegoed. Bestelling A (via /account/order) reserveert € 100, niet betalen. Na 24 uur bestelling B: weer € 100 beschikbaar → B volledig met tegoed betaald (`betaalVolledigMetTegoed`). Daarna A betalen via de herinneringslink: € 100 te weinig betaald, A staat op betaald. Saldo −€ 100.
- **Fix:** bij order-pay, `stuurBetaallink` en in de webhook het tegoed opnieuw toetsen tegen `tegoedSaldo()`. Is het niet meer gedekt: `tegoed_cents` op de bestelling verlagen en het volle bedrag vragen. Of de reservering laten gelden zolang de bestelling onbetaald en niet geannuleerd is, dus niet maar 24 uur.

### K2 · Wordt een bestelling met tegoed volledig betaald en staat hij in beoordeling, dan valt hij nooit te betalen en wordt hij na 7 dagen automatisch geannuleerd
- Volledig met tegoed betalen gebeurt alleen als er niets te beoordelen valt (functions/api/order.js:1792 `volledigMetTegoed && vatReview.payableNow && !review.needsReview`). `betaalVolledigMetTegoed` wordt nergens anders aangeroepen (alleen in order.js:1793).
- Na jouw akkoord in /admin stuurt `stuurBetaallink` niets, want `teBetalen` is 0 (src/lib/betaallink.js:51-52).
- `cancelStaleApprovals` (cron/index.js:403-409) pakt `review_state='approved' AND unpaid AND total_cents>0` na 7 dagen op. Gevolg: de bestelling gaat op geannuleerd en de klant krijgt de mail "niet betaald binnen zeven dagen" over een bestelling die hij met tegoed had betaald.
- **Fix:** na goedkeuring (handleVatDecision/stuurBetaallink) bij `teBetalenCents(o) === 0` `betaalVolledigMetTegoed(env, o.id)` aanroepen. En in de cron `teBetalenCents > 0` eisen in plaats van `total_cents > 0`.

### K3 · Een dubbele betaling op één bestelling wordt stil geaccepteerd: geen melding, geen terugbetaling
- order.js maakt bij het bestellen betaling P1 aan (order.js:1797). `/api/order-pay` maakt bij **elke klik** een nieuwe betaling (order-pay.js:89), vanuit de mail, de herinnering, de terugknop (`checkOpenOrder`) en de bedankpagina.
- Betaalt de klant er twee (bijvoorbeeld een open kaarttab plus de maillink), dan schrijft de webhook de tweede netjes in `payments` (mollie.js:1213-1225). Daarna komt `if (order.payment_status === 'paid') return;` (mollie.js:1259): geen admin_log, geen mail, geen terugbetaling.
- **Fix:** komt er een betaalde betaling binnen terwijl de bestelling al `paid` is, dan loggen als `payment.double` en Lucas mailen (of automatisch terugbetalen). Daarnaast in order-pay een nog open Mollie-betaling hergebruiken in plaats van steeds een nieuwe te maken.

---

## BELANGRIJK

### B1 · Een ongeldig btw-nummer wordt al opgeslagen vóórdat de bestelling erop wordt geweigerd
- order.js:924 `upsertCustomer(... vat ...)` draait **vóór** de vormcontrole op order.js:1096-1097 (`vatFormatOk === false → terugMet('vat')`). `NL000` komt dus nog steeds in `customers.vat_number` terecht (zolang `details_saved_at` leeg is). Precies wat de noot op order.js:1075-1095 wilde voorkomen.
- Bij een abonnement voor een ingelogde klant gebeurt hetzelfde: `werkKlantgegevensBij()` (src/lib/account.js:2010 → 9571-9611) slaat `vat_number` op zonder `vatFormatOk`, en pas daarna weigert `bepaalBedrijfEnBtw` (subscribe.js:672).
- **Fix:** de btw-vormcontrole (met `effCountry`, dus het land uit het formulier of de opgeslagen klant) vóór `upsertCustomer` zetten. En `vatFormatOk` toevoegen aan `werkKlantgegevensBij`.

### B2 · Een anonieme POST met andermans e-mailadres overschrijft diens klantgegevens, ook die op de abonnementsfacturen
- `upsertWide` gebruikt `CASE WHEN details_saved_at IS NULL THEN COALESCE(excluded.x, customers.x)` (order.js:2731-2751): het nieuwe formulier wint. Wie het e-mailadres van een bestaande klant kent, kan via /api/order of /api/plan (geen login) diens naam, merk, telefoon, btw-nummer, land en factuuradres vervangen.
- `issueSubscriptionInvoice` leest `SELECT * FROM customers` (src/lib/invoice.js:738). De volgende maandfactuur van die abonnee krijgt dan het verzonnen adres en btw-nummer.
- **Fix:** een niet-ingelogde inzending mag bij een bestaande klant alleen **lege** velden vullen. Het verschil laat je als voorstel op de bestelling staan, of je past het pas toe na de inloglink.

### B3 · Een ingelogde klant kan een abonnement afsluiten zonder de zakelijke verklaring of de herroepingsverklaring
- `/api/plan` weigert zonder beide (functions/api/plan.js:122-130). De ingelogde route `/account/plan/start` (account.js:1997-2018) roept `handleSubscribeStart` direct aan, en die **slaat de versies alleen op** als ze er zijn (subscribe.js:268-274). Hij weigert nooit.
- **Fix:** de controle uit plan.js:122 naar `handleSubscribeStart` verplaatsen, zodat beide ingangen hem doen.

### B4 · Vastzetten en daarna losmaken ververst credits die op het punt staan te vervallen
- Vastzetten haalt credits van de **oudste** maand af (slots.js:553), losmaken geeft ze terug aan de **nieuwste** maand (slots.js:589, "nieuwste maand eerst").
- **Voorbeeld (venster 1):** maand M−1 heeft 45 toegekend en 0 gebruikt (vervalt einde van deze maand), maand M heeft 45 toegekend en 20 gebruikt. Zet een item van 12 vast: M−1 gebruikt 12. Maak het los: M gaat van 20 naar 8 gebruikt. Netto zijn 12 vervallende credits nu credits van M. Herhaal dit en de doorschuiftermijn verdwijnt.
- **Fix:** per vastgezet item vastleggen van welke maand(en) de credits kwamen (`plan_queue.credit_month`), en bij losmaken precies daar teruggeven.

### B5 · Het getoonde creditsaldo en het besteedbare saldo gebruiken verschillende maandvensters
- De weergave gebruikt de **termijnmaand**: `slotBalans(..., kort.maand)` (subscription.js:598, met `maand = termijnMaand(sub)` op :136-140).
- Besteden (`verbruikSlot`/`geefSlotTerug`) roept `loadSlots(env, subId, venster, nu)` aan **zonder `tot`** en rekent dus met de kalendermaand (slots.js:553 en :589, terugval in loadSlots).
- De noot in loadSlots beschrijft dit gat zelf ("valt de toekenning … buiten het venster"), maar alleen de weergave is gerepareerd.
- **Gevolg:** bij een opgezegd abonnement (venster 0, slots.js `vensterVoor`) staan op dagen vóór de termijndag credits op het scherm die bij vastzetten "geen-credits" opleveren. Bij maandelijks toont de weergave op die dagen nog M−2-credits die bij het besteden al buiten het venster vallen.
- **Fix:** `verbruikSlot` en `geefSlotTerug` een `tot = termijnMaand(sub)` meegeven (queueLock en queueUnlock hebben `sub` al in handen).

### B6 · Een abonnementsmaand wordt geboekt op de maand van `paidAt` en niet op de termijn: bij SEPA-vertraging verdwijnt een betaalde maand of staat het abonnement als "onbetaald"
- De webhook zet `month = (payment.paidAt || createdAt).slice(0,7)` (mollie.js:515-516). `subscription_months` en `grantSlots` zijn uniek op (abonnement, maand) (mollie.js:595-600 `ON CONFLICT DO NOTHING`; slots.js `INSERT OR IGNORE`).
- De incassodag is `eersteTermijn()` (subscribe.js:438, 464-469) en het scherm rekent met `termijnMaand()` vanaf `started_at` (subscription.js:123-140).
- Een incasso na een iDEAL-mandaat is SEPA, en die wordt 1 tot 5 werkdagen later `paid`. Bij een termijndag rond de 24e tot 28e schuift `paidAt` vaak naar de volgende kalendermaand. Dat heeft twee gevolgen. (a) `planSaldo` vindt geen rij voor de termijnmaand, dus `betaald` is false en het scherm zegt "onbetaald". (b) Vallen twee opeenvolgende incasso's in dezelfde kalendermaand, dan kent de tweede **niets** toe, terwijl de klant betaald heeft. Er komt alleen een logregel.
- **Fix:** de maand afleiden van de termijn waarvoor de incasso is: `termijnMaand(sub, payment.createdAt)`, of beter een `metadata.month` die je bij de Mollie-subscription niet hebt, dus de termijnmaand uit `createdAt`. Daarnaast luid melden als `toegekend` null is terwijl de betaling nieuw was.

### B7 · Een opgezegd abonnement wordt door een late incasso weer "actief"
- mollie.js:607-611: `UPDATE subscriptions SET status='active' ... WHERE id=?1 AND (status <> 'paused' OR pause_reason='payment_failed')`. Die voorwaarde laat `cancelled` door.
- Een SEPA-incasso die al onderweg was toen de klant opzegde (stopIncasso annuleert alleen toekomstige termijnen), of de bankoverschrijving van een vooruitbetaald jaar na de 30-minutenregel (subscribe.js:213-230 zet de oude rij op cancelled), zet de rij terug op `active`. Dat gebeurt zonder Mollie-subscription, en mogelijk naast een nieuwe rij.
- **Fix:** `AND status NOT IN ('cancelled')` toevoegen, de betaling vastleggen en Lucas melden ("betaling op opgezegd abonnement").

### B8 · De jaartermijn is geen verbintenis: na één maand opzeggen of pauzeren houdt de klant het merkmodel en 3 maanden doorschuiven
- In plans.js:131-140 staat `yearly` als `fixed: true` met de extra's `priceLock` en `brandModel` en een doorschuiftermijn van 3. `hasBrandModel('studio','yearly')` geeft true (plans.js:351-354; setup € 1.250).
- `handlePlanCancel` behandelt alleen `prepaid` apart (account.js:7211). Bij `yearly` volgen gewoon stopIncasso en opzeggen (account.js:7221-7222). Pauzeren werkt ook (account.js:7059-7065).
- **Fix:** bij `yearly` opzeggen en pauzeren weigeren of uitstellen tot na termijn 12 (zoals markeerJaarOpgezegd voor prepaid), of de resterende termijnen of de merkmodel-setup in rekening brengen.

### B9 · Een terugkerende EU-klant met verlegde btw komt altijd in de beoordeling, omdat het bevestigingsvinkje in de ingeklapte stap 3 zit
- Het vinkje `vat_confirmed` (OrderFlow.astro:2704-2711) zit binnen `[data-pl-s3-fields]` (2500-2754). `collapseBrief()` verbergt die hele groep voor een ingelogde klant (pipeline.js:7394-7445).
- Het vinkje is dan niet aan te vinken, dus de server krijgt 0% verlegd zonder bevestiging. `vatGate` zet dan `payableNow=false` (vat.js:370-373): geen Mollie, wachten op jou. Juist je beste terugkerende EU-klanten krijgen elke keer een dag vertraging.
- **Fix:** het verklaringsblok buiten de ingeklapte groep zetten, of het samenvattingspaneel uitklappen zodra `syncVatConfirm()` het nodig vindt.

### B10 · Een gereserveerde datum vervalt, maar de bestelling blijft betaalbaar en komt dan zonder leverdatum binnen
- De cron maakt na 7 dagen `window_start` leeg (cron/index.js:238-241). Die UPDATE controleert `payment_status` niet opnieuw (alleen `WHERE id = ?1`).
- `/api/order-pay` controleert het venster niet (order-pay.js:72-83). Een klant die op dag 8 via de mail betaalt, heeft dus een begeleide bestelling zonder datum. De tijdlijntekst belooft "een nieuwe datum kan opnieuw worden gekozen" (cron/index.js:249-251), maar alleen /admin kan een datum zetten (admin.js:9130).
- **Fix:** de UPDATE in releaseAll uitbreiden met `AND COALESCE(payment_status,'unpaid')='unpaid'`. Bij betaling van een `attended` bestelling zonder venster: Lucas melden en de klant een "kies een datum"-link geven. En de tijdlijntekst eerlijk maken ("we nemen contact op voor een nieuwe datum").

### B11 · Leverdatum vergeven ("raced"): het scherm zegt "we factureren niets", maar de mail bevat een betaallink
- Bij `raced` wordt de Mollie-betaling toch aangemaakt (order.js:1795-1812) en de bevestigingsmail krijgt `pay:` (order.js:1826). Het scherm (OrderFlow.astro:1488, `s5.lostBody`) zegt "Er gaat niets verloren en we factureren niets".
- **Fix:** of de betaallink weglaten bij `raced` (zoals bij `zonderVenster`), of de tekst aanpassen: "je kunt al betalen; we bevestigen de nieuwe datum per mail".

### B12 · Voorrang en een gereserveerde datum spreken elkaar tegen, en de server toetst de voorwaarden van voorrang niet
- Bij 10 tot 20 producten (begeleid) kan de klant een datum over twee weken kiezen **en** voorrang aanvinken ("uiterlijk de volgende werkdag"). De samenvatting toont dan beide (pipeline.js:8053 datum, plus de voorrangsregel).
- De server rekent voorrang zodra `voorrangKan({kind, products})` (quote.js:364; pricing.js:1695-1700). Dat kijkt niet naar een gekozen venster en niet naar "agenda vol" (VOORRANG_COPY.busy, pricing.js:1707/1713), terwijl de voorwaarden dat wel beloven.
- **Fix:** voorrang uitschakelen zodra er een `window_start` gekozen is (of het venster negeren bij voorrang), en de "agenda vol"-regel ook op de server toetsen.

### B13 · De capaciteitspoort telt extra hoeken en 4K niet mee
- `clearedWindows({ products, service })` (order.js:2096, 2110; loseRaceIfOversold :2157) weegt alleen `KIND_PUNTEN` per product (pricing.js:591-598).
- 20 catalogproducten met 4 extra hoeken zijn 160 beelden, maar boeken 80 punten. Een venster kan zo dubbel beloofd worden.
- **Fix:** het aantal hoeken × producten (en eventueel 4K) als extra punten meegeven aan de poort en aan `readCalendar` (via details_json of een kolom).

### B14 · Onbetaalde bestellingen zonder venster blijven eeuwig openstaan
- `remindUnpaid` stuurt één keer een herinnering (cron/index.js:314-345). `cancelStaleApprovals` geldt alleen voor `review_state='approved'` (cron:403-409). Een gewone onbetaalde bestelling (< 10 producten, of zonder venster) blijft voor altijd op `received`/`unpaid` staan. Hij telt mee in lijsten, en zijn tegoed-markering (K1) blijft bestaan.
- **Fix:** na bijvoorbeeld 14 dagen automatisch vervallen (met dezelfde mail en tegoedterugboeking als cancelStaleApprovals).

### B15 · De server accepteert betaalde bestellingen zonder één foto, ook met voorrang
- order.js:899-904 leest de batch, maar eist niets. De browser waarschuwt alleen (`askMissing`, pipeline.js:1315) en stuurt daarna direct door naar Mollie.
- De voorrangstermijn loopt vanaf de betaling (`voorrangDeadline`, pricing.js:1633). Voorrang plus ontbrekende foto's betekent dus gegarandeerd de toeslag terugbetalen.
- **Fix:** bij `voorrang` en ontbrekende verplichte foto's de voorrang weigeren of niet aanbieden. Overweeg ook om bij 0 uploads geen directe redirect naar Mollie te doen maar eerst de bedankpagina met "stuur je foto's".

### B16 · Wie een abonnement afbreekt en het binnen 30 minuten opnieuw probeert, komt vast te zitten
- subscribe.js:213-232: een `pending` rij jonger dan 30 minuten geldt als "betaald", en `bestaand` stuurt door naar `/account/plan`. Volgens de noot staat daar geen betaalknop. Wie bij Mollie "terug" drukt en meteen opnieuw kiest, ziet een dood scherm.
- **Fix:** op /account/plan voor een `pending` rij zonder mandaat een knop "eerste betaling afronden" tonen (een nieuwe first payment op dezelfde rij), of de bestaande checkout-URL bewaren en die aanbieden.

### B17 · Na hervatten verschuift de incassodag, terwijl de termijn op de oude dag blijft rekenen
- `hervatIncasso` start op `eersteTermijn()` vanaf de **hervatdatum** (subscribe.js:615). `termijnDag` blijft `started_at` volgen (subscription.js:123-128).
- **Voorbeeld:** gestart op de 5e, hervat op de 25e: incasso op de 25e, termijn op de 5e. Twintig dagen per maand staat het abonnement als "onbetaald", met hetzelfde botsingsrisico als bij B6.
- **Fix:** bij hervatten de oorspronkelijke termijndag gebruiken voor `startDate`, of `started_at`/de termijndag mee verschuiven.

---

## NICE-TO-HAVE

### N1 · Geen idempotentie bij verzenden
Elke POST krijgt een nieuwe `makeRef()` (order.js:2860). Bij een netwerkfout leunt de browser alleen op de tekst "verstuur niet twee keer" (pipeline.js:8351-8356). **Fix:** een `submit_id` (uuid) die bij laden wordt gemaakt, meesturen en op de server afwijzen als hij al eens gezien is (`UNIQUE` kolom), met de bestaande `ref` als antwoord.

### N2 · Uploads zijn na het bestellen nog te verwijderen
`DELETE /api/upload` toetst alleen of de sleutel bij de batch hoort (upload.js:203-217) en niet of de batch al aan een bestelling hangt. Het batch-id staat in `details_json` en in de browser. **Fix:** weigeren als er een `files`-rij met die `r2_key` bestaat.

### N3 · De batchlimiet is te omzeilen met gelijktijdige uploads
`existing` wordt geteld vóór de `put` (upload.js:150-154). Parallelle verzoeken (40 per minuut toegestaan) kunnen samen boven `MAX_BATCH_FILES` uitkomen. Klein risico, maar het houdt de eigen limiet niet.

### N4 · Bij een kleiner aantal producten blijven de hoek- en referentiefoto's van verwijderde kaarten staan
`dropCard` ruimt alleen `SHOT_IDS` op (pipeline.js:3907-3918). Hoek- en referentievakken van verwijderde kaarten blijven in R2 en worden met `product_key p5` aan een bestelling van 3 producten gehangen (order.js:1609).

### N5 · Voorrang wordt opgeslagen zoals gepost, niet zoals gerekend
`details.voorrang` komt ongetoetst in details_json, en de klantmail krijgt `voorrang: voorrangGevraagd` (order.js:1001, 1827) in plaats van `quote.voorrang`. Wordt hij niet gerekend (`voorrangKan` false, of de dienst brand-model/video), dan zeggen de mail, Studio en /admin (`heeftVoorrang`, pricing.js:1674) toch "voorrang". **Fix:** `details.voorrang = quote?.voorrang ? '1' : undefined` en `quote?.voorrang` doorgeven aan de mail.

### N6 · Btw verlegd zonder naamcontrole
Een geldig VIES-nummer van een **ander** bedrijf geeft 0% (order.js:1130-1133, vat.js:220-222). `vies.name` wordt opgeslagen maar niet vergeleken met `brand`. **Fix:** bij een duidelijke afwijking tussen VIES-naam en merknaam een beoordelingsreden toevoegen.

### N7 · Geen beoordeling bij een land buiten de EU
Een Nederlandse consument kan "Verenigde Staten" kiezen en 0% betalen. Dat is een bewuste keuze (vat.js:336-350); de controle achteraf is `paymentMismatch` (mollie.js:1654-…). Die vangt een NL-kaart, maar geen buitenlandse kaart of PayPal. Overweeg de IP-landcode (`origin_country`, order.js:1561) mee te nemen: NL-IP plus land buiten de EU is dan een reden voor beoordeling.

### N8 · Verouderd commentaar
order.js:2012-2017 zegt dat een land buiten de EU op de beoordelingslijst gaat. vat.js:336-350 heeft dat op 29 september teruggedraaid. Het commentaar in pipeline.js:2899-2902 over de "first-order discount" verwijst naar een korting die niet meer bestaat (pricing.js:252).

### N9 · Algemene foutmelding bij een rate limit (429) of een onbekende weigering
De browser zegt "Je bestelling kwam niet aan … er is niets aangemaakt" (OrderFlow.astro:606, pipeline.js:8351-8356). Bij `phone`/`vat` is de klantrij op dat moment al bijgewerkt (B1). Voor `rate` bestaat geen `[data-form-refusal]`. **Fix:** een eigen tekst voor `rate` met de wachttijd (`retryAfter`).

### N10 · Een proefvisual zonder betaling krijgt ook een herinnering
`remindUnpaid` filtert niet op dienst (cron/index.js:318-326). Een niet afgemaakte proef van € 1,21 krijgt na 3 dagen een herinnering. Dat is misschien gewenst, maar het is geen bewuste keuze in de code.

---

## UX — het bestelformulier

*Perspectief A: een nieuwe klant op een telefoon. Perspectief B: een zorgvuldige, oudere desktopgebruiker.*

1. **Btw pas zichtbaar bij Mollie (A+B).** Het totaal en de samenvatting tonen alleen netto (pipeline.js:2892-2897, 8031-8034). Een Nederlandse klant ziet € 1.089 en krijgt bij Mollie € 1.317,69. Op stap 5 is het land bekend: toon daar "Te betalen incl. 21% btw" (bij NL, of EU zonder btw-nummer) of "0% — verlegd/buiten de heffing". Hetzelfde geldt voor de proef: "€ 1" in de kop, € 1,21 bij Mollie.
2. **Stap 2 is op een telefoon erg vol (A).** Per productkaart staan: producttype, 4 verplichte vakken, hoekvakken, 3 verhoudingskeuzes per beeld (`buildRatios`, pipeline.js:4677), 4K (`buildHoogRes` :4355), het gezicht per product en de contextplekken. Zet alles wat afwijkt van de keuze voor de hele bestelling achter één "Afwijken voor dit product"-knop per kaart.
3. **Ingeklapte stap 3 verbergt het btw-vinkje (B).** Zie B9. Voor de klant voelt het als een fout van de site ("waarom moet ik weer wachten?").
4. **"Toch versturen" zonder foto's gaat meteen naar Mollie (A).** Na de waarschuwing (pipeline.js:1315) betaalt de klant direct, terwijl de productie niet kan starten. Zeg in de waarschuwing letterlijk "je betaalt nu; we beginnen pas als de foto's er zijn", en bied "foto's later sturen via Studio" aan.
5. **De tekst over de leverdatum is lastig te lezen (B).** `okBody` (OrderFlow.astro:1450): "Door te kijken reserveer je niets — de leverdatum staat vast zodra je bestelling en betaling binnen zijn, en blijft zeven dagen voor je staan als je later betaalt". Dat zijn twee voorwaarden in één zin die elkaar lijken tegen te spreken. Voorstel: "Kies een datum. Na het versturen houden we hem 7 dagen voor je vast; na betaling staat hij definitief."
6. **Voorrang naast een gekozen datum (A+B).** Zie B12. Bij een begeleide bestelling met een datum moet de voorrangsregel verdwijnen of uitleggen wat er wint.
7. **"Bestellen en betalen" terwijl er niet betaald wordt (B).** Bij een EU-klant zonder btw-nummer, een VIES-storing of B9 volgt geen Mollie. De uitleg staat pas in het tweede punt van `s5.after` (OrderFlow.astro:1478-1479). Pas het knoplabel aan zodra `syncVatConfirm` of `no_vat` voorspelt dat er beoordeeld wordt ("Bestelling versturen — betaallink volgt").
8. **Een vervallen reservering zonder vervolgstap (B).** De mail en de tijdlijn zeggen "een nieuwe datum kan opnieuw worden gekozen" (cron/index.js:249-251), maar de klant kan dat nergens. Een link naar WhatsApp of mail met het kenmerk erin is genoeg.
9. **Een afgebroken abonnement zit 30 minuten vast (A).** Zie B16: wie op de telefoon van Mollie terugkomt en opnieuw wil, belandt op een scherm zonder knop.
10. **Een rate limit leest als "niet aangekomen" (A).** Zie N9. Iemand die op een trage verbinding een paar keer drukt, ziet bij de elfde poging een tekst die suggereert dat er niets is aangemaakt, terwijl er al tien bestellingen staan.
