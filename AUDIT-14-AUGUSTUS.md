<!--
  ════════════════════════════════════════════════════════════════════════════
  HOE DIT RAPPORT TOT STAND KWAM, EN HOE JE HET MOET LEZEN
  ════════════════════════════════════════════════════════════════════════════

  14 augustus 2026. Zeven lezers hebben elk één deel van de codebase uitgekamd —
  geld, uploads, toegang, adminpaneel, het orderrecord, de juridische pagina's en
  het bestelformulier — en samen 21 beweringen opgeleverd. Elke bewering is daarna
  aan een aparte lezer voorgelegd met de opdracht hem te WEERLEGGEN: zoek de guard
  hoger op, de aanroeper die die invoer nooit doorgeeft, de tweede controle
  elders, of de simpele misinterpretatie. Negentien overleefden dat.

  DAT IS GEEN BEWIJS. Een bewering die een scepticus overleeft, is een bewering
  die het waard is om zelf na te lopen — niet een vastgestelde fout.

  WAT IK ZELF HEB GECONTROLEERD, met de bestanden ernaast:

    · Nr. 1 — de restitutielogica. Klopt op codeniveau: `refunded` komt uit
      `payment.amountRefunded` (per BETALING) en gaat naar `orders.refunded_cents`
      (per ORDER), en `full` wordt getest tegen `cents` terwijl `order.total_cents`
      wel wordt opgehaald en niet gebruikt. Of twee betalingen op één order in de
      praktijk voorkomen, heb ik niet zelf nagelopen.

    · Nr. 3 — de boekingspoort. Klopt, en is DEZELFDE DAG GEREPAREERD. De vierde
      clausule stond in capacity.js en niet in order.js, precies zoals gemeld. Zie
      de kop van readCalendar() daar, en tests/promises.test.mjs houdt de twee
      queries sinds vandaag aan elkaar.

  DE OVERIGE ZEVENTIEN ZIJN NOG NIET DOOR MIJ NAGELOPEN. Lees ze als goed
  onderbouwde aanwijzingen met een bestandsnaam en een regelnummer erbij, en
  controleer ze voordat je iets verandert.
-->

# Auditrapport VISUAILS — wat er stuk is, op volgorde van wat het kost

Zeventien dingen die aantoonbaar fout gaan. Eén melding heb ik laten vallen; die staat onderaan met de reden. De volgorde is: eerst geld en boekhouding, dan gegevens en juridische blootstelling, dan beloftes die de code niet nakomt, dan de rest.

---

## 1. Een tweede Mollie-betaling terugstorten zet de hele order op nul — de boeken zeggen volledig terugbetaald, het geld is binnengebleven

`functions/api/webhook/mollie.js:264-275`. `refunded` komt uit `payment.amountRefunded` en dat is een lopend totaal **per betaling**, maar het wordt vergeleken met en weggeschreven naar `orders.refunded_cents`, dat **per order** is. `full` wordt bovendien getest tegen `cents` — het bedrag van díe betaling — terwijl `order.total_cents` op regel 210 wel wordt opgehaald en vervolgens nergens in de vergelijking gebruikt.

Twee betalingen op één order is geen ongeluk maar een gedocumenteerde toestand: `src/lib/account.js:3117-3122` schrijft het uit, `order.js:1201-1214` mailt al een betaallink bij de bestelling en `handleOrderPay` maakt er nog één zolang `payment_status` op `unpaid` staat. Twee levende checkout-links per order is de normale situatie, geen race.

De volgorde: VIS-2026-0100, € 1101,10. De klant rondt beide checkouts af. Webhook A zet de order op betaald en stuurt factuur VIS-2026-0001. Webhook B schrijft alleen een `payments`-regel en valt stil op regel 370 — geen `notifyPaid`, geen event, niemand die het hoort. Lucas ziet de dubbele € 1101,10 in Mollie staan en stort tr_B terug. Mollie levert tr_B opnieuw: `amountRefunded` = 1101,10, `known` = 0, `full` = true → `refunded_cents = 110110`, `payment_status = 'refunded'`, en `issueCreditNote()` op regel 311 vindt `invGross = 110110`, `already = 0`, `room = 110110` en zet een **volledige** creditnota tegenover de factuur van de betaling die níet is teruggestort. Netto omzet nul op een order die één keer betaald, geleverd en correct terugbetaald is.

De spiegel is even erg: zodra `refunded_cents` op het bedrag van de dubbele staat, komt een échte deelrestitutie op tr_A binnen met `amountRefunded < known`, slaat het hele blok op regel 266 over, en wordt die restitutie nooit geboekt en nooit gecrediteerd.

De kleinste juiste fix: tel `amountRefunded` op over álle betalingen van de order — de `payments`-tabel heeft ze al — in plaats van er één te pakken, en test `full` tegen `order.total_cents` in plaats van tegen `cents`.

## 2. Twee gelijktijdige `issueInvoice()`-aanroepen verbranden een factuurnummer en laten een gat in de reeks

`src/lib/invoice.js:213`. `nextNumber()` wordt aangeroepen en de teller opgehoogd **vóór** de `INSERT` op 217, en die INSERT heeft geen `ON CONFLICT` terwijl `invoices.order_id` NOT NULL UNIQUE is (migratie 0021). De controle op 197-199 is lezen-dan-schrijven zonder slot.

De volgorde: de klant betaalt vanuit Studio. De webhook zet de order op betaald rond regel 391 en komt pas op 641 bij `issueInvoice` — daartussen zitten een `order_events`-insert, `recordPaymentMethod` en een `await notifyPaid()` met een uitgaande mail-fetch. Dat venster is een volledige HTTPS-round-trip lang. Laadt de klant (of een tweede tabblad) in dat venster `/account/invoices`, dan draait `catchupOrder` — die filtert alleen op `payment_status === 'paid' && paid_at && !have.has(ref)`, zonder leeftijdsgrens — en roept op `account.js:4758` óók `issueInvoice` aan. Beide zien geen factuurregel, beide consumeren een nummer (0042 en 0043), de eerste INSERT wint, de tweede sterft op de UNIQUE-constraint en wordt weggeslikt door de `catch` op `account.js:4760` of `mollie.js:648`. VIS-2026-0043 staat in `invoice_series` en op geen enkel document; de volgende factuur is 0044. Wint de inhaalslag, dan is het het lágere webhook-nummer dat verbrandt, en ligt het gat onder de uitgegeven factuur.

`account.js:4545` belooft "twee tabbladen tegelijk leveren dus één factuur op" — dat klopt over het aantal facturen, niet over de gatloze reeks die migratie 0021 de enige harde regel noemt.

De kleinste juiste fix is niet `ON CONFLICT DO NOTHING` — dan crasht het niet meer maar verbrandt het nummer nog steeds. Claim eerst de `order_id`-regel (INSERT met een placeholder-nummer of een `ON CONFLICT DO NOTHING` die aangeeft wie won) en haal het nummer pas op als vaststaat dat die INSERT gewonnen heeft.

## 3. De boekingspoort telt verlopen onbetaalde reserveringen mee, dus vensters die de site net verkocht worden bij het versturen geweigerd — en de order wordt nooit weggeschreven

`functions/api/order.js:1441-1462`. De docstring op 1433 zegt dat deze query `readCalendar` uit `functions/api/capacity.js` "deliberately and exactly" spiegelt. Dat doet hij niet. `capacity.js:157-168` heeft een vierde clausule die hier ontbreekt:

```sql
AND NOT (
      COALESCE(payment_status, 'unpaid') = 'unpaid'
  AND window_expires_at IS NOT NULL
  AND window_expires_at <= datetime('now')
)
```

De pagina die vensters aanbiedt laat een verlopen reservering dus los zodra de 7-daagse klok (order.js:1136-1140) afloopt; het endpoint dat ze boekt telt hem door tot de cron om 03:10 UTC de kolommen leegt — en permanent als die cron-worker niet draait, want dat is een apart wrangler-project.

De volgorde: order A, 20 producten, attended, venster 1–2 september, nooit betaald, `window_expires_at` verlopen. Klant B laadt vóór de nachtelijke run `/start` met 20 producten. `/api/capacity` sluit A uit en biedt 1 september aan. B kiest hem, vult vijf stappen in, verstuurt. `clearRequestedWindow()` gebruikt de query van order.js, telt A nog steeds mee: 10 per dag uit A, `perDay = ceil(20/2) = 10`, samen 20 > `ATTENDED_PER_DAY` (15). Het venster valt uit `windows`, `gate.reason = 'gone'`, en regel 571-574 geeft 409 window-gone terug **voordat** `upsertCustomer` en de order-INSERT draaien. B ziet de alert-banner "dat venster ging weg terwijl je dit invulde", wat niet waar is, en de vervangende lijst in `gate.windows` komt uit dezelfde verouderde berekening, dus de dagen van A ontbreken daar ook. Geen orderregel, geen event, geen melding aan de studio.

Zonder JS is `wantsJson` onwaar en wordt de order wél weggeschreven, ongedateerd — dus het totale verlies zit op het fetch-pad, wat in de praktijk iedereen is.

De fix is die ene clausule toevoegen aan `orderSql` op 1443-1449, en `tests/promises.test.mjs:406` laten controleren op order.js en niet alleen op capacity.js. De richting is gelukkig eenzijdig: order.js ziet een superset, dus dit kan alleen ten onrechte weigeren, nooit dubbelboeken.

## 4. Stap 3 klapt dicht over de velden die de order betaalbaar maken — terugkerende klanten belanden zwijgend op de reviewlijst

Twee mechanismen, dezelfde afloop, dezelfde plek in het formulier.

**Het eerste** zit op `src/scripts/pipeline.js:4184`. `collapseBrief()` zet `fields.hidden = true` op het hele `[data-pl-s3-fields]`-blok (OrderFlow.astro:1442-1656) en roept daarna `syncRequired()` aan, die `required` weghaalt van alles waarvoor `isShown()` onwaar is. In dat blok zitten het registratienummer (OrderFlow.astro:1647-1653, `data-pl-req-when="no_vat"`) en het `vat_confirmed`-vinkje (1636-1640). De `complete`-test in `applyAccount()` (3845-3860) accepteert een aangevinkte `no_vat` als volledig antwoord op de btw-vraag en kijkt niet naar `reg_number` — dat kán ook niet ingevuld zijn: het staat niet in `PREFILL_FIELDS`, niet in de `/account/me`-payload (`account.js:1993-2022`) en er is geen kolom voor.

De volgorde: een ingelogde klant met `details_saved_at` en `no_vat_number = 1` opent `/start/catalog`. `applyAccount()` vinkt no_vat aan, `syncReg()` maakt het registratienummer zichtbaar en verplicht, `collapseBrief()` verbergt het hele blok inclusief het lege veld en haalt de eis eraf. Continue werkt, de order post `no_vat=1` met `reg_number=''`, `businessCheck()` faalt (`src/data/business.js:165-176`), `order.js:753` zet needsReview en 1199-1200 houdt de betaallink in. De klant komt op /thank-you, wordt nooit om het nummer gevraagd, krijgt nooit een betaalverzoek. Dat geldt voor élk land, niet alleen buiten de EU: NL valt op "geen KVK-nummer en geen btw-nummer", andere EU-landen op "EU-klant zonder btw-nummer en zonder registratienummer".

Dezelfde inklap slikt `vat_confirmed`: een terugkerende EU-klant met een opgeslagen, VIES-geldig btw-nummer krijgt het vinkje onder een verborgen ouder te zien, dus nooit, dus het post niet, dus `vatGate()` (`src/data/vat.js:351-354`) noteert "0% verlegd zonder de bevestiging van de klant — niet via het formulier ingediend" en zet `payableNow = false`. Precies de klanten voor wie de verleggingsregeling gebouwd is, kunnen niet betalen — en de code noemt die tak zelf onbereikbaar.

**Het tweede** zit op `src/scripts/pipeline.js:689`. `syncReg()` leegt `reg_number` als het vinkje uitgaat, maar niets leegt `vat` als het vinkje aangaat: het veld wordt alleen op `opacity .45` gezet (OrderFlow.astro:2144, bewust niet `disabled`, want dat post niets) en verstuurt gewoon mee. `syncVatConfirm()` (609-626) rekent `applies = … && !!vat && !noVat` en vinkt de verklaring dus dwingend uit. De server doet het omgekeerde: `functions/api/order.js:294` leest `noVat = !vat && …`, dus het getypte nummer wint van het vinkje.

De volgorde: een Duitse klant typt DE123456789, leest de hint, en vinkt "ik heb geen btw-nummer" aan omdat het het nummer van zijn leverancier is. Het nummer blijft staan, de verklaring wordt verborgen én uitgevinkt. De POST draagt `vat=DE123456789`, `no_vat=1`, `reg_number=X`, geen `vat_confirmed`. VIES bevestigt het nummer, de behandeling wordt verlegging, en `vatGate()` valt op dezelfde regel 4: geen betaallink, 24 uur wachten, en de reviewreden in het systeem beweert dat er om het formulier heen gepost is terwijl de klant precies deed wat het formulier aanbood. `no_vat_number` wordt op 0 weggeschreven (`order.js:865`) — het antwoord van de klant verdwijnt.

De fix voor beide: laat `collapseBrief()` het blok niet verbergen zolang er een zichtbaar-verplicht veld leeg in staat (of hijs `reg_number` en `vat_confirmed` uit de inklap), en laat de client het met de server eens zijn — schrap `&& !noVat` uit `applies`, of leeg het `vat`-veld in de change-handler van no_vat zoals `syncReg()` dat met `reg_number` doet.

## 5. Een order in review houdt zijn venster en zijn 7-daagse klok, maar krijgt nooit een betaallink — de gereserveerde datum die de bevestiging noemt loopt vanzelf af

`functions/api/order.js:1136`. De klok wordt gearmd op de enige voorwaarde `finalWindow && quote`. De betaallink hangt op 1199-1200 aan `vatReview.payableNow && !review.needsReview`. Niemand verzoent die twee.

De volgorde: een Duits merk bestelt 15 producten (boven `WINDOW_THRESHOLD`, dus een venster) met een geldig btw-nummer op een ochtend dat VIES onbereikbaar is — het geval dat `src/data/vat.js` zelf beschrijft. `viesState` is null, `businessCheck` geeft ok:false met "btw-nummer opgegeven maar niet bij VIES bevestigd", `review.needsReview` is waar. De order krijgt `window_start`, `window_end` én `window_expires_at = nu + 7 dagen`, en geen betaling. De bevestigingsmail neemt de `dated`-tak (order.js:2379, 2395-2400) en zegt "je leverdatum staat gereserveerd: dinsdag 1 september tot en met woensdag 2 september" — zonder bedrag, zonder knop, zonder één zin over een controle. `/account` weigert betalen omdat `pending` niet in `PAYABLE_REVIEW` staat.

Blijft `/admin/vat` zeven dagen liggen — en niets dwingt dat af, want `review_deadline` en `REVIEW_HOURS` worden weggeschreven en nergens gelezen, en de herinneringstaak die de cron-header op `cron/index.js:41` aankondigt is nooit gebouwd — dan leegt `FIND_EXPIRED_WINDOWS` `window_start` en `window_end`. Die query filtert op `payment_status = 'unpaid'` en kent `review_state` niet. De klant hoort er niets over. `handleVatDecision()` (`src/lib/admin.js:5008-5073`) armt de klok niet opnieuw en stuurt ook geen mail, dus zelfs een goedgekeurde klant moet uit zichzelf terugkomen naar /account.

De fix: arm `window_expires_at` niet zolang `review.needsReview` waar is (of zet de klok pas bij goedkeuring), zonder `review_state = 'pending'` uit `FIND_EXPIRED_WINDOWS`; en laat `handleVatDecision()` de klant mailen als de review geklaard is.

## 6. De betaallink voor "Allebei tegelijk" heet "VISUAILS — 30 producten, undefined"

`functions/api/order.js:1206`. `quoteOrder()` geeft op `src/lib/quote.js:265` de rauwe wire-waarde terug in `service`, niet de vertaalde `kind`. Voor de deur `/start/complete` is dat `'drop'` (OrderFlow.astro:142). `paymentDescription()` (quote.js:341-347) zoekt `what[quote.service]` op in een map die alleen catalog/lifestyle/complete kent, dus `'drop'` wordt `undefined` en staat vervolgens in de tekst.

Ik heb het met de echte modules gedraaid: `quoteOrder({service:'drop',products:30,vatRate:0.21})` → `{service:'drop', grossCents:235950}`, en `paymentDescription(q,'nl')` → `"VISUAILS — 30 producten, undefined"`. Dat is wat Mollie op de checkoutpagina zet en wat op het bankafschrift terechtkomt, bij elk aantal producten, op het duurste product van de site. Het bedrag klopt; alleen de omschrijving is stuk.

Het pijnlijke: dezelfde bug is aan de andere kant al gevonden en gerepareerd. `src/lib/account.js:3230-3233` wikkelt de service in `ladderKey()` met de opmerking dat 'drop' er anders "VISUAILS — 30 producten, undefined" van maakt "en dat is de omschrijving die de klant op zijn bankafschrift terugziet". Het primaire pad — de link in élke bevestigingsmail — is nooit meegenomen.

Fix: `paymentDescription({ ...quote, service: ladderKey(quote.service) }, lang)`, of beter: laat `quoteOrder()` de vertaalde `kind` als `service` teruggeven, zodat geen enkele toekomstige aanroeper dit meer hoeft te weten.

---

## 7. Het wisverzoek laat elke geleverde jpg en webp in R2 staan

`src/lib/admin.js:851`. `handleCustomerWipe()` haalt de R2-sleutels op met `SELECT f.r2_key, f.preview_key FROM files f JOIN orders o …` en verwijdert alleen die twee. Sinds migratie 0022 is een geleverd beeld vier objecten: `scripts/deliver.mjs:449-497` schrijft `<stem>.png` (= `files.r2_key`), `<stem>.jpg` en `<stem>.webp` (alleen als rijen in `file_assets`) en `review/<stem>.webp` (= `preview_key`). Die jpg en webp zijn geen bijproduct: `src/lib/delivery.js:166-179` haalt ze op om de zip van de klant te bouwen.

En dan het venijn: `admin.js:892-894` verwijdert in dezelfde batch de `file_assets`-rijen. Na de wis wijst niets in D1 nog naar die objecten.

De volgorde: een klant met een catalogusorder van 10 producten (40 beelden) doet een art. 17-verzoek. De admin typt de merknaam en post naar `/wipe`. Uit R2 verdwijnen 40 png-masters en 40 review-webps. In R2 blijven staan: 40 jpg's en 40 webp's — precies de bestanden die de klant als merkbeeld publiceert — zonder enige verwijzing, dus geen latere cron-purge, geen tweede wis en geen adminscherm kan ze ooit nog vinden. De `admin_log`-regel (admin.js:962-968) meldt "80 bestand(en) uit R2" en de wissing staat als voltooid geboekt.

`cron/index.js` doet het wél goed: `purgeExpiredFiles()` roept `variantKeys()` aan en verwijdert `[f.r2_key, f.preview_key, ...assets.get(f.id)]` (301-311), met de opmerking dat het zonder die stap "er netjes uitziet en drie kwart van de bytes laat staan". Het wispad heeft die fix nooit gekregen. `handleOrderDelete()` (admin.js:656) heeft hetzelfde gat, maar bijt alleen op een onbetaalde order die tóch via deliver.mjs geleverd is; de wees-rijen die daar ook genoemd worden vallen mee, want `file_assets.file_id` is ON DELETE CASCADE.

Fix: dezelfde `variantKeys()`-opzoeking als `cron/index.js:550` doet, vóór de `file_assets`-rijen verdwijnen. Let op dat dit nu nog latent is — `scripts/backup.mjs:212` noteert dat `file_assets` op 10 augustus 2026 nog leeg was in productie — maar deliver.mjs is uitgerold, dus elke levering vanaf nu lekt.

## 8. Een mapupload draait `resupersede()` niet, dus het afgekeurde beeld blijft in het portaal staan en de order sluit nooit

`src/lib/admin.js:2050`. `handleDeliveryUpload` roept `resupersede()` alleen aan als de upload uit een bordslot kwam: `if (slotProduct && slotShot)`. Het formulier "Map uploaden" (`admin.js:1603-1613`) post geen `product` en geen `shot`, dus beide zijn null — terwijl `parseScaffoldPath` product en shot gewoon uit het scaffoldpad heeft gehaald en de rijen op 2029 volledig gemapt worden ingevoegd. De enige andere aanroeper is `handleFileMapping` (1742), oftewel de admin die handmatig op Opslaan drukt in de mappingtabel, wat hij niet doet omdat de mapping al klopt.

De volgorde: VIS-2608-4471 is geleverd en gemeld. De klant vraagt een revisie op p1/voorkant, dus rij #10 staat op `review_state='revision_requested'` met `superseded_at` NULL. De studio maakt de shot opnieuw, zet hem in `VIS-2608-4471/p1 - Hoodie/1 voorkant/` en gebruikt "Map uploaden". Rij #37 komt erbij met `product_key='p1'`, `shot='front'`. `resupersede` draait niet, dus #10 houdt `superseded_at` NULL. `account.js:2546`, `delivery.js:177` en het portaal filteren allemaal alleen op `superseded_at IS NULL`, dus de klant ziet nu het afgekeurde beeld én de vervanging naast elkaar, en beide zitten in de zip. `closeReplacedRevisions` heeft juist `superseded_at IS NOT NULL` nodig, dus het revisieverzoek blijft ook openstaan. En `maybeCloseOrder` (`src/lib/close.js:64-79`) eist approved === live: #10 is niet goedgekeurd, dus `closed_at` komt er nooit, en daarmee ook de retentiestempel en de reviewvraag niet.

Erger dan "de order blijft hangen": de klant kán het losbreken door het revisieverzoek in te trekken en het oude, afgekeurde beeld goed te keuren (`portal.js:1204-1213`) — dan sluit de order op een beeld dat hij afgewezen heeft. En de admin ziet het probleem niet, want `liveByKey` (`admin.js:1379-1383`) houdt op zijn eigen scherm alleen de hoogste id per product+shot over: hij ziet één beeld, de klant ziet er twee.

Fix: haal de conditie op 2050 weg en draai `resupersede(env, orderId)` na elke upload waarbij rijen met product_key en shot zijn weggeschreven — de functie werkt al per order, niet per slot.

## 9. Het levende portaaltoken wordt ingetrokken voordat vaststaat dat de mail weg is

`src/lib/admin.js:2294`. `freshPortalLink()` trekt in één batch het enige levende token van de order in en zet er een nieuw voor in de plaats; de rauwe vervanger bestaat alleen in de teruggegeven URL, want in de tabel staat enkel de SHA-256. Beide aanroepers draaien hem vóór het versturen: `sendDeliveryMail` op 2265 (sendMail op 2270) en `handleAnnounceRedelivery` op 2542, bewust buiten de try/catch die pas op 2555 begint. `sendMail` gooit bij elk niet-2xx antwoord van Resend (`src/lib/mail.js:63`).

De volgorde: Resend is een minuut lang rate-limited. De admin drukt op "Melden" bij een herlevering. Het token dat de klant in de leveringsmail kreeg wordt ingetrokken, het nieuwe wordt ingevoegd, `sendMail` gooit, en de 502-pagina op 2563 zegt: "Er is niets als gemeld weggeschreven, dus je kunt de knop opnieuw indrukken." Dat klopt over `announced_at` en verzwijgt het token dat net gesneuveld is. De opgeslagen `/o/<token>` van de klant — de link waarvan de leveringsmail zegt dat hij hem aan een collega mag doorgeven — rendert nu de 410 "deze link is vervangen, kijk in de meest recente mail", wat op dat moment precies niet waar is. Op het leveringspad wordt dezelfde fout weggeslikt door `.catch(console.error)` op regel 1015 en hoort niemand er iets over.

Het is herstelbaar: nog een keer drukken mint én mailt een derde token. Maar er is één variant die dat niet is: als `env.RESEND_API_KEY` niet gezet is, keert `sendMail` stilletjes terug (`mail.js:29`), wordt het token ingetrokken, worden `delivery_mailed_at` en `markAnnounced` weggeschreven, gaat er geen mail uit, en blokkeert de guard op 2219 elke herhaling. Volledige lock-out zonder één foutmelding.

Fix: mint het token, bouw de mail, verstuur, en commit de intrekking + insert pas na een geslaagde `sendMail` — of laat de catch de oude tokenregel terugzetten.

## 10. Een herlevering op een gesloten order mailt een link die bij aankomst al verlopen is

`src/lib/token.js:135`. `isExpired(expiresAt, closedAt)` neemt de strengste van `order_tokens.expires_at` en `orders.closed_at + 90 dagen`. Geen enkele INSERT schrijft `expires_at` — `admin.js:2300` en `functions/api/order.js:1064` binden alleen `(order_id, token_hash)` — dus de vervaldatum hangt volledig aan `closed_at`, een eigenschap van de órder, niet van het token. Een vers gemunt token voor een order die langer dan 90 dagen dicht is, is verlopen op het moment dat het bestaat.

`handleAnnounceRedelivery` (`admin.js:2502`) controleert `closed_at` nergens, en `handleDeliveryUpload` en de "Push N naar de klant"-knop ook niet. Dus: order gesloten op 10 januari, op 1 juni zet de studio er nog één bestand bij en drukt op melden, `freshPortalLink()` trekt het oude token in en mailt `/o/<nieuw>`, de klant klikt, `portal.js:337` rekent 10 januari + 90 dagen uit, en de mail waarin staat "deze link vervangt de vorige — gebruik vanaf nu deze" wijst naar een 410-pagina. Het zojuist geleverde beeld is in het portaal onbereikbaar.

Dit is een kleinere bug dan hij op het eerste gezicht lijkt en dat moet erbij: de 90 dagen aan `closed_at` hangen is bewust en staat twee keer uitgeschreven (`account.js:2488-2507` en 5923-5934), en de toegang die /privacy §6 en /terms §7 beloven voor maand 4-12 bestáát wel degelijk — via het dashboard, want `serveAccountFile` (`account.js:3389-3397`) kijkt alleen naar `files.expires_at` (levering + 12 maanden) en `orders.customer_id`, en `/admin/customers/:id/signin-link` (`admin.js:3342`) mailt een werkende inloglink. Alleen de herleveringsknop weet dat niet.

Fix: één guard in `handleAnnounceRedelivery` — is `isExpired(null, order.closed_at)` waar, weiger dan met een adminmelding die naar de signin-link-route wijst, of stuur de herleveringsmail met een /account-link in plaats van een portaaltoken.

---

## 11. De ontsnappingsklep "Meer dan 30 producten" boekt een wachtrij-order en mailt er de gesanctioneerde belofte "meestal 2–4 werkdagen" bij

`functions/api/order.js:2414`. `OrderFlow.astro:1238` zet als laatste optie een `<option value={f.s1.more}>` waarvan de waarde de labeltekst zelf is, en `pipeline.js:4359-4372` antwoordt daarop met het `too-large`-paneel: te groot voor één gereserveerde week, dit plannen we met je in plaats van via een formulier te prijzen. Niets blokkeert Continue — geen verplicht veld, geen submit-guard — en de eigen tekst van dat paneel zegt "stuur dit maar in, dan komen we met de datums terug".

Op de server geeft `countOf()` bewust null terug (1605-1608), valt `tierForProducts(null, svc)` op `'unattended'` (2118), geeft `quoteOrder` null, en belandt `customerEmail()` in de laatste `else` op 2414: "Normale doorlooptijd, geen vaste leverdatum. Meestal 2–4 werkdagen." Dat is precies de zin die `pricing.js:791-796` "the ONLY sanctioned timing language for this tier" noemt — nu op een order van 30+ producten, dertig seconden nadat de klant las dat het te groot is voor één week. De front-end merkt de order als attended (`pipeline.js:979`), de server leidt onafhankelijk 'unattended' af uit een lege telling: één waarde, twee tegengestelde classificaties.

De studiomelding helpt niet: `products` is falsy, dus de meta-regel van `notifyEmail` (2332-2336) laat de telling weg en zegt "tier unattended" en "Standard queue — no window, by design." De grootste orders die de site aanneemt komen binnen zonder aantal.

Fix: geef deze optie een eigen wire-waarde in plaats van het label, en laat `customerEmail()` bij `product_count IS NULL` een aparte tak nemen die zegt wat het paneel zei — we komen met de datums terug — in plaats van de Tier-0-zin.

## 12. Leveringen via het bord schrijven geen `file_assets`, dus de PNG/JPG/WebP-belofte in het portaal is onwaar

`src/lib/admin.js:2028`. De INSERT van het leverbord is `INSERT INTO files (order_id, kind, r2_key, filename, bytes, product_key, shot)` — geen `file_assets`, geen `preview_key`. `loadDeliveryFiles()` geeft dan `assets: []`, `deliveryEntries()` (`delivery.js:292-298`) neemt de tak `if (!f.assets.length)` en maakt één platte regel `VISUAILS-<ref>/<filename>` per beeld, zonder productmap en zonder formaatmappen.

Maar `folderBlock()` (`portal.js:1055-1067`) rendert alleen niets als `summary.files === 0`; verder drukt hij `t.folderBody` onvoorwaardelijk af: "één map per product, en daarin hetzelfde beeld als PNG, JPG en WebP — zo krijgt een drukkerij, een shoppagina en een feed elk het bestand dat ze willen" (portal.js:156 EN, 225 NL). Dezelfde onvoorwaardelijke blok staat in Studio (`account.js:5312-5318`). En `t.folderReview` ("de foto's hierboven zijn reviewkopieën, op schermformaat") is op dit pad ook onwaar, want `preview_key` blijft NULL en `serveFile()` valt terug op `file.preview_key || file.r2_key` (portal.js:757).

De klant leest dus drie formaten en productmappen, klikt op "download de map", en krijgt een zip met LEESMIJ.txt, LICENTIE.txt en een platte lijst enkele bestanden in één formaat. De LEESMIJ zelf tekent in sectie 1 nog steeds de mappenboom en valt terug op de verzonnen mapnaam `01 - je product` (`delivery.js:495, 538`).

De ironie: de datalaag weet het al. `deliverySummary()` (`delivery.js:399-412`) rekent `foldered` en `formats` uit en de docstring zegt dat het rapporteert "of er formaten in zitten of dat het een oude platte levering is". Geen van beide schermen leest die velden. Erger nog: een studio die alsnog drie formaten wil leveren door png, jpg en webp in hetzelfde slot te droppen, verliest er twee, want `resupersede()` zet `superseded_at` op alles wat niet de hoogste id voor dat (product_key, shot)-paar is.

Fix: laat de mappentekst afhangen van `summary.foldered` en `summary.formats`, en de reviewzin van of er überhaupt een `preview_key` is — of blokkeer het melden van een levering waarvan geen enkel bestand assets heeft.

## 13. De orderflow vertelt elke klant dat de webp geen AI-vermelding draagt; /ai-act en het leverscript zeggen het omgekeerde

`src/data/channels.js:126` (EN) en `:127` (NL): "Onze jpg- en png-bestanden dragen hem; een webp niet, omdat de conversie hem weggooit — neem voor dit kanaal dus de jpg." Die zin wordt onvoorwaardelijk aan elke klant getoond, want `MarketplacePicker.astro:82` rendert `<span class="ch-note">{ch.note[lang]}</span>` zonder `hidden` — anders dan de buurblokken ch-lock, ch-split en data-pl-ch-why, die wél voorwaardelijk zijn.

`AiActPage.astro:181` (EN) en `:268` (NL) zeggen het tegenovergestelde: we schrijven een IPTC DigitalSourceType-tag in elk geleverd bestand, "inclusief de WebP, waar de conversie weggooide wat de modelleverancier erin had gezet". De code staat aan de kant van /ai-act: `scripts/deliver.mjs:441-446` loopt `for (const format of ['png','jpg','webp']) await writeSourceType(...)` met `--no-tag` als opt-out, `writeSourceType()` leest de waarde terug en gooit als hij niet is blijven zitten, en `scripts/tag-delivery.mjs:64-70` draagt de kop "WEBP IS INCLUDED ON PURPOSE" met de meting erbij.

Een klant die op Google Shopping verkoopt vinkt dat kanaal aan, leest dat de webp de eigenschap mist die Google eist, gooit elke webp weg en uploadt de zwaardere jpg — op advies dat sinds 9 augustus 2026 onwaar is. Daarna leest dezelfde klant op /ai-act, de pagina die er precies voor bestaat om te zeggen wat we wel en niet beweren over AI-herkomst, het omgekeerde.

Het staat op drie plekken in dat bestand, niet één: de Google-note (126/127), `COPY.format` op 157 en 172 ("dat houdt de AI-vermelding ook in het bestand, die webp-omzetting eruit haalt") — die wordt onthuld zodra een jpg-only kanaal wordt aangevinkt, dus precies bij de klant die er iets mee gaat doen — en de redenering in de bestandskop op 35-38, die de foute copy opnieuw zal produceren bij de volgende bewerking. Repareer alle drie. De juiste formulering: de conversie gooit weg wat de modelleverancier erin zette, en wij schrijven onze eigen IPTC DigitalSourceType er ná de conversie weer in.

## 14. De cookieverklaring noemt zichzelf volledig, mist een cookie en heeft de levensduur van een tweede fout — in beide talen

`src/pages/cookie-policy.astro:28` ("Naming them is more useful than describing categories, so here they are in full. This is the complete list.") en `:34` ("That is all three."); `/nl/cookie-policy.astro` herhaalt het woordelijk.

Er is een vierde. `src/lib/account.js:1637` zet `vis_lang` met `Max-Age = 365 * 86400` en `COOKIE_FLAGS` (`Path=/account; HttpOnly; Secure; SameSite=Lax`), getriggerd door de taalschakelaar in de zijbalk die op elke accountpagina staat (`account.js:3920`). Een grep op `vis_lang` in `src/pages`, `src/components`, `src/layouts` en `src/data` levert niets: hij staat op geen enkele juridische pagina.

En regel 30 beschrijft `vis_account` als "Essential. Expires with the session." (NL 26: "Verloopt met de sessie."), terwijl `setSessionCookie()` op `account.js:3645-3648` `Max-Age = ACCOUNT_SESSION_TTL_DAYS * 86400` schrijft met `ACCOUNT_SESSION_TTL_DAYS = 30`. Een persistente cookie van dertig dagen, geen sessiecookie.

Een klant die inlogt, op NL/EN klikt en daarna devtools opent, ziet drie cookies: `vis_account`, `vis_lang` en `vis_consent`. De verklaring noemt er drie, waarvan één (`vis_admin`, `Path=/admin`) hij nooit krijgt, en mist er één die hij wel heeft. Beide cookies zijn waarschijnlijk toestemmingsvrij, dus dit is een informatieplicht onder art. 13 AVG / art. 5(3) ePrivacy, geen toestemmingsprobleem — maar het is een controleerbare bewering die de pagina zelf uitnodigt te controleren, en er bestaat geen correcte versie in beide talen. De commentaarblok op `account.js:1665-1680` dateert de taalschakelaar op 7 augustus 2026; de verklaring staat nog op "Last updated: August 2026".

Fix: `vis_lang` toevoegen (365 dagen, Path=/account, functioneel), `vis_account` corrigeren naar 30 dagen, "alle drie" naar vier, en overwegen `vis_admin` eruit te halen of te labelen als niet-klantcookie. In beide bestanden.

---

## 15. De revisienotitie van de klant gaat ongeëscaped de studiomail in, terwijl hetzelfde veld in feedback.js wél geëscaped wordt

`src/lib/notify.js:237`. `notifyRevision` geeft de door de klant getypte notitie rechtstreeks aan `mailQuote()`, en `quote` in `mailTemplate.js:148` interpoleert zijn argument als rauwe HTML — `esc()` bestaat in dat bestand (regel 72) en wordt voor h1, button, payPanel, linkLine en het rows-lábel gebruikt, maar niet voor de rows-wáárde (102) en niet voor `quote`. `feedback.js:531` doet met precies dezelfde soort tekst wél `[&<>]` escapen (en `\n` → `<br>`) voordat het naar dezelfde helper gaat. Ook `invoiceMail.js:134-139`, `order.js:2533` en `admin.js:5233` escapen. `notify.js` is de enige uitzondering.

Een klant schrijft "de kleur <blauw> mag weg en de schaduw korter". De mailclient leest `<blauw>` als onbekende tag en gooit hem weg, dus de studio leest "de kleur mag weg en de schaduw korter" — het omgekeerde van het verzoek. Een merknaam met `<td>` erin (via `who(o)`, dat `orders.brand` teruggeeft, dat de klant zelf typt, in de rows op 105, 138, 175 en 234) laat de tabel eronder inklappen. En zonder `\n` → `<br>` komt een notitie van drie alinea's als één lap tekst aan. `/studio` belooft dat een revisie binnenkomt "met de notitie die de klant schreef, in diens eigen woorden".

Fix: escape (en zet `\n` om) in `notify.js`, of beter: verplaats `esc()` naar binnen in `mailTemplate.js`'s `quote` en de waardecel van `rows`, zodat het geen discipline per aanroeper meer is.

## 16. Het inlogformulier verraadt via de responstijd wie klant is

`src/lib/account.js:1156`. `handleLoginPost` doet `await sendLoginLink(...)` vóór het enige gedeelde antwoord op 1159. Voor een onbekend adres keert `sendLoginLink` terug op 1293 na één geïndexeerde SELECT; voor een gedeactiveerd account op 1307-1310, ook vóór elke schrijfactie; voor een levende klant mint hij een token, draait een `env.DB.batch` van twee statements en wacht op `sendMail`, waarvan de fetch naar `api.resend.com/emails` op `mail.js:56` staat. Body en status zijn identiek — wat de bestandskop op 1152 belooft — de wandklok niet.

Een aanvaller post kandidaat-zakenadressen. Een misser antwoordt in de tijd van één D1-read; een treffer pas na de volledige Resend-round-trip, doorgaans 300-800 ms. Met `LOGIN_LIMIT` op tien per minuut per IP is dat genoeg om uit te vinden welke bedrijven klant zijn. Er is geen padding, geen per-adres bucket (`checkRate` sleutelt op IP en faalt open), en `/account/login` is bewust vrijgesteld van de Origin-check, dus het endpoint is direct aanstuurbaar. Ook een falende Resend-call lekt hetzelfde signaal, want de `.catch(() => {})` komt pas ná de round-trip. Gedeactiveerde accounts vallen aan de snelle kant, dus wat er lekt is "levende klant" versus "onbekend of gedeactiveerd".

Fix ligt klaar en wordt niet gebruikt: `handleLoginPost` krijgt op 1062 de volledige Pages-context binnen maar destructureert alleen `{ request, env }`. Haal `waitUntil` erbij en geef de `sendLoginLink`-promise daaraan, dan rendert het antwoord voor elk adres op hetzelfde snelle pad.

## 17. Kaarten klappen dicht zodra de verplichte shots binnen zijn, en nemen de verplichte notitie bij betaalde extra foto's mee

`src/scripts/pipeline.js:2740` markeert elke extra-fotonotitie met `data-pl-req = '1'`, en die notitie zit in de `.pu-about`-wrapper (aangehangen op 2378). `paintCard()` zet `card.collapsed = ready` op de overgang (3096-3098), `ProductUploader.astro:516` verbergt `.pu-card.is-collapsed .pu-about` met `display:none`, `syncRequired()` haalt daarop `required` weg, en `validateStep(2)` én de hercontrole in `onSubmit()` (4568) filteren op `isShown(f)`. De select zelf blijft wél actief en post gewoon.

De volgorde: op `/start/catalog` met 3 producten opent de klant kaart 1, zet "extra foto's" op 2 — twee rijen verschijnen, beide notities zichtbaar verplicht — en uploadt daarna voor- en achterkant. `cardReady()` slaat om, de kaart vouwt zichzelf dicht, en de twee lege verplichte notities verdwijnen achter `display:none`. Continue op stap 2 gaat door, de samenvatting op stap 5 en het lopende totaal rekenen twee keer het extra-fototarief, `/api/order` (599-604) factureert `extra_p1=2`, en `extra_note_p1_1` en `_2` komen als lege strings binnen. De klant betaalt voor twee extra foto's waarvoor de studio geen briefing heeft, en is nooit verteld dat er iets ontbrak. De volgorde is wel bepalend: wie eerst uploadt en daarná de extra's kiest, wordt correct tegengehouden — tenzij hij de kaart zelf dichtklapt met de toggle, wat hetzelfde doet.

Fix: laat `paintCard()` niet automatisch dichtklappen zolang er in die kaart een leeg veld met `data-pl-req` staat, of laat `cardReady()` de extra-notities meetellen zoals het de verplichte shots meetelt.

---

**Wat ik heb laten vallen.** De melding dat verlaten `intake/<batch>/`-prefixen in R2 nooit worden opgeruimd klopt technisch, maar is geen defect in deze code: hij staat al geregistreerd als vlag xliv in FLAGS.md met de juiste conclusie (een R2 lifecycle-regel, een dashboardinstelling), geen enkele gepubliceerde bewaartermijn wordt geschonden — /privacy §6 en het verwerkingsregister laten de klok bij het afsluiten van de bestelling beginnen en een verlaten batch heeft geen bestelling — en het is geen gat in het wisverzoek, want `functions/api/upload.js:154-157` slaat bewust niets identificeerbaars op, zodat geen enkele query een batch aan een persoon kan koppelen. Zet de lifecycle-regel op de bucket, of schrijf de nachtelijke veger op `customMetadata.staged` waarvoor dat veld is aangelegd.