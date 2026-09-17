# Backendfouten — gericht onderzoek

Gesorteerd op ernst. Elke bevinding is gecontroleerd tegen `tests/`; waar een toets
het gedrag al vastlegt, staat dat erbij. Bevindingen zonder testdekking zijn als
zodanig gemarkeerd.

---

## 1 · GELD

### 1.1 Een abonnement wordt btw-INCLUSIEF geïnd terwijl de prijs "excl. btw" is
**`src/lib/subscribe.js:289` en `:391` · `src/lib/invoice.js:620`**

`monthlyCents()`/`customMonthTotal()` zijn nettobedragen: `perProductCents()` zet ze
af tegen `ladderFloorCents()` (het nettotarief per product), `src/data/pricing.js:3099`
zegt letterlijk *"Wat een zelf samengestelde maand kost, exclusief btw"*, en
`src/components/PlansPage.astro:315/366/403` drukt bij elk plan `vatLabel('excl')` af.

Maar het bedrag gaat ongewijzigd naar Mollie — `valueEuros: subEersteBetalingCents(rij)/100`
(regel 289) en `valueEuros: subMaandCents(vol)/100` (regel 391) — en de factuur rekent
het daarna terug als BRUTO: `const net = rate > 0 ? Math.round(gross/(1+rate)) : gross`
(`invoice.js:620`).

**Scenario.** Studio, maandtermijn, Nederlandse klant. De pagina belooft € 658 excl.
btw (te betalen € 796,18). Mollie schrijft € 658 af. De factuur zegt netto € 543,80 +
btw € 114,20. Er verdwijnt € 114,20 omzet per maand per abonnee, stil. Een EU-klant met
verlegging (tarief 0) betaalt wél de volle € 658 — dus twee klanten met dezelfde
factuurprijs betalen ons een verschillend nettobedrag.

Dit is precies de fout die `quoteBrandModel()` in `src/lib/quote.js:454-477` in
twintig regels beschrijft en voor bestellingen expliciet de ándere kant op oplost
("Zou dit van bruto naar netto rekenen, dan betaalde die klant minder dan de prijs
die er stond").

**Kleinste reparatie.** Het abonnementstarief netto behandelen, net als een
bestelling: `valueEuros` = `net + round(net * rate)` uit `vatVoorAbonnement()`, en in
`snapshotFromSubscription()` `net = gross - vat` vervangen door `net = amount_cents`
met `vat = round(net*rate)`. (Of, als bruto het besluit is: het label op
PlansPage en de noot in `pricing.js:3099` wijzigen — maar dat verandert de
vergelijking met de ladder.)

**Testdekking.** Geen. `tests/subscription.test.mjs`, `tests/plans.test.mjs` en
`tests/abo-keten.test.mjs` toetsen nergens btw op een abonnement.

---

### 1.2 Een vooruitbetaald jaar levert één maand tegoed op, niet twaalf
**`src/lib/subscribe.js:371-374` · `functions/api/webhook/mollie.js:400-405` · `src/lib/slots.js:191`**

Bij `term = 'prepaid'` wordt er géén Mollie-subscription aangemaakt (regel 371-374):
het hele jaar is met één betaling voldaan. De noot erboven zegt:

> *"De maandelijkse TOEKENNING loopt niet via de betaling maar via de maandtaak (zie
> subscription.js) … Twaalf maanden budget komen dus gewoon binnen."*

**Die maandtaak bestaat niet.** `subscription_months` wordt door precies één regel
geschreven — de INSERT in de Mollie-webhook (`mollie.js:401`) — en `grantSlots()`
(`slots.js:191`) heeft precies één aanroeper: diezelfde webhook (`mollie.js:445`).
De takenlijst in `cron/index.js:100` bevat niets wat maanden of slots toekent.

**Scenario.** Een merk koopt Brand, 12 maanden vooruit (`prepayTotalCents` =
€ 14.080). Er komt één betaling binnen, dus één rij in `subscription_months` en één
set `subscription_slots`. `rolloverMonths('prepaid')` is 3, dus `loadSlots()` telt na
vier maanden nul. De klant heeft een jaar betaald en houdt na één maand niets over,
tenzij iemand elke maand met de hand bijboekt via het slotpaneel in /admin
(`admin.js:5306`).

**Kleinste reparatie.** Een taak in `cron/index.js` die voor elk `prepaid`-abonnement
de ontbrekende maandrij + slots aanmaakt tot `prepayPaidMonths(plan)` maanden zijn
toegekend — of, minder werk, bij het activeren van een vooruitbetaald jaar meteen
twaalf maandrijen en twaalf slotsets wegschrijven.

**Testdekking.** Geen enkele toets raakt `isPrepaid` in combinatie met
`subscription_months` of `grantSlots`.

---

### 1.3 Een teruggestorte abonnementstermijn wordt nergens geboekt
**`functions/api/webhook/mollie.js:198`, `:663-666`, `:321-498`**

De handler laat `status === 'refunded'` door (regel 198) en stuurt een betaling met
een `subscriptionId` naar `recordSubscriptionPaid()` (regel 663). Die functie leest
`payment.amountRefunded` nergens. De hele restitutie-afhandeling —
`recordRefundOnPayment()`, `orders.refunded_cents`, `issueCreditNote()`,
`mailCreditNote()` — zit uitsluitend in de BESTELLINGSTAK (regel 787-956).

**Scenario.** Een incasso van € 658 wordt teruggeboekt (chargeback, of met de hand in
Mollie). Mollie levert dezelfde webhook opnieuw af met `status: 'refunded'`. De INSERT
in `subscription_payments` botst op UNIQUE en wordt stil overgeslagen (regel 395),
`subscription_months` doet `ON CONFLICT DO NOTHING`, `grantSlots()` is idempotent.
Netto: de rij blijft op `status = 'paid'` met `amount_cents = 65800`, de maand blijft
toegekend, de abonnementsfactuur blijft op het volle bedrag staan, en er is geen
creditnota en geen pauze. Het geld is weg en de boekhouding weet het niet.

**Kleinste reparatie.** In `recordSubscriptionPaid()` bij `payment.status === 'refunded'`
de rij in `subscription_payments` bijwerken (`status`, een `refunded_cents`-kolom) en de
maand niet (opnieuw) toekennen; en, net als bij een bestelling, een creditnota op de
`subscription_invoices`-rij uitgeven.

**Testdekking.** Geen. `tests/abo-incasso.test.mjs` dekt alleen `failed/canceled/expired`.

---

### 1.4 De toeslag van een eigen look zit wél in de betaling en niet in het lopende totaal
**`src/lib/quote.js:357` tegenover `src/scripts/pipeline.js:2108-2124`**

Serverkant: `netCents = cents(net) + n * surcharge` — `customer_styles.surcharge_cents`
maal het aantal producten. Browserkant: `quoteFor()` rekent ladder + outfits + extra's
+ 4K en kent `surcharge` niet; `/account/me` geeft `surchargeCents` wél terug
(`account.js:2771`) maar `addOwnStyles()` (`pipeline.js:5410-5463`) doet er niets mee.
De build-controle `assertQuoteMatches()` (`quote.js:619`) vergelijkt alleen ladder,
outfits en extra's, dus het gat valt daar niet op.

**Scenario.** Klant kiest zijn eigen look met een toeslag van € 10 per product en
bestelt 30 producten. Het lopende totaal en het bevestigingsscherm tonen het
laddertarief; de bestelling wordt weggeschreven en de betaallink aangemaakt voor
€ 300 netto méér (plus btw, plus een hoger voorrangsbedrag, want `voorrangBedrag()`
rekent serverzijdig over het bedrag mét toeslag en clientzijdig over het bedrag
zónder). De klant ziet het bedrag voor het eerst in Mollie.

Daarbovenop: `src/components/PricingPage.astro:406` belooft *"Eén ontwerpbedrag op
schrift; daarna loopt elk product tegen het gewone tarief"* — een toeslag > 0 maakt
die zin onwaar.

**Kleinste reparatie.** `surchargeCents` meesturen op de tegel in `addOwnStyles()` en
in `quoteFor()` optellen (`n * surcharge`), vóór `syncVoorrang()`. Of: het veld in
/admin op 0 vastzetten zolang de prijspagina het gewone tarief belooft.

**Testdekking.** Geen. `tests/eigen-stijl.test.mjs` toetst de eigendomscontrole, niet de prijs.

---

### 1.5 De abonnementswebhook toetst het bedrag niet tegen het plan
**`functions/api/webhook/mollie.js:321-405`**

Voor een bestelling is dit in augustus 2026 uitdrukkelijk dichtgezet met
`betalingGedekt()` (regel 1038), met als aanleiding *"een betaling met de hand in het
Mollie-dashboard, met een `order_ref` erin"*. De abonnementstak leest `cents` (regel
323), schrijft het weg, en kent daarna `productsFor(sub.plan)` producten en de volle
slotbundel toe — ongeacht of `cents` overeenkomt met `subMaandCents(sub)`.

**Scenario.** Een betaling van € 1 met `metadata.sub_ref = <kenmerk>` (dezelfde weg
die de bestellingstak expliciet als vector noemt) levert een volledige maand Brand op:
30 producten plus slots plus een abonnementsfactuur.

**Kleinste reparatie.** Vóór `INSERT INTO subscription_months` toetsen dat
`cents + 2 >= subMaandCents(sub)` (of, bij de eerste betaling, `subEersteBetalingCents`),
en anders loggen + `admin_log` zoals de bestellingstak doet.

**Testdekking.** Geen.

---

### 1.6 Betalen vanuit het dashboard biedt iDEAL aan op een 0%-bestelling
**`src/lib/account.js:4418-4432`**

`createOrderMolliePayment()` krijgt hier geen `excludeIdeal`. De twee andere
aanroepers doen dat wél: `functions/api/order.js:1642` (`vatCall.rate === 0`) en
`src/lib/betaallink.js:67` (`Number(o.vat_rate) === 0`). `handleOrderPay()` haalt
`vat_rate` niet eens op (`COLS` op regel 4331).

**Scenario.** Een Duits bedrijf met geldig btw-nummer krijgt 0% verlegd, klikt in
VISUAILS Studio op "Nu betalen" en rekent af met iDEAL vanaf een Nederlandse
bankrekening. Precies de samenloop die `src/lib/mollie.js:285` en de noot bij
`recordPaymentMethod()` (`mollie.js:810-827`) zeggen te voorkómen; `paymentMismatch()`
schrijft er daarna alleen een `console.warn` over.

**Kleinste reparatie.** `vat_rate` toevoegen aan `COLS` (regel 4331) en
`excludeIdeal: Number(order.vat_rate) === 0` meegeven.

**Testdekking.** `tests/account-pay.test.mjs` toetst alleen de omschrijving, niet de methoden.

---

## 2 · GEGEVENS DIE KWIJT KUNNEN RAKEN

### 2.1 Een abonnement "maand op maat" kan gepauzeerd maar nooit hervat worden
**`src/lib/subscribe.js:554`**

`hervatIncasso()` rekent met `monthlyCents(sub.plan, sub.term)`. Voor
`plan = 'maat'` (`CUSTOM_MONTH_ID`, `pricing.js:3072`) bestaat er geen
`PLAN_AMOUNT`-regel, dus `monthlyCents()` **gooit** (`plans.js:249`). De throw valt in
de catch op regel 560, `hervatIncasso()` geeft `false`, en `account.js:6318` stuurt de
klant naar `?fout=hervatten`. Overal elders in dit bestand wordt hiervoor
`subMaandCents()` gebruikt, dat het bevroren `amount_cents` van de rij leest
(`subscribe.js:391`, `slots.js:118`).

**Scenario.** Klant met een maand op maat van € 1.240 pauzeert in juli en wil in
augustus hervatten. De knop doet het nooit meer; er staat alleen een foutmelding, en
de enige uitweg is opzeggen en opnieuw afsluiten.

**Kleinste reparatie.** `valueEuros: subMaandCents(sub) / 100` op regel 554.

**Testdekking.** Geen; `tests/maand-op-maat.test.mjs` raakt het pauzeerpad niet.

---

### 2.2 De herstelroute voor facturen zet de pdf buiten de jaarmap
**`cron/index.js:966`** (en de SELECT op `:859`)

`issueInvoice()` schrijft `invoices/${row.year}/${row.number}.pdf`
(`invoice.js:530`) en `issueSubscriptionInvoice()` idem (`:773`). De nachtelijke
inhaalslag schrijft voor BESTELLINGSfacturen `invoices/${inv.number}.pdf` — zonder
jaar — omdat de SELECT op regel 859 de kolom `year` niet ophaalt. De
abonnementsvariant twintig regels lager doet het wél goed, mét een noot die precies
hiervoor waarschuwt: *"wijkt hij ooit af, dan wijst de rij naar een object dat niet
bestaat"*.

**Scenario.** De webhook rendert de pdf niet (R2 hikt); de cron pakt hem op. De
factuur is downloadbaar, maar hij ligt als enige buiten `invoices/2026/`, zonder de
`customMetadata` die `issueInvoice()` meegeeft. Elke opruim-, archief- of
back-uphandeling die op jaarprefix werkt, slaat hem over.

**Kleinste reparatie.** `year` toevoegen aan de SELECT en de sleutel gelijktrekken.

**Testdekking.** Geen.

---

## 3 · BEVEILIGING EN TOEGANG

Geen route gevonden die gegevens teruggeeft zonder sessiecontrole, geen IDOR en geen
SQL-injectie. Elke bestandsroute controleert het eigendom via `orders.customer_id`
(`account.js:4588`, `:4681`, `:4700`) of via `order_tokens` (`portal.js:947`);
elke `${}` in een query bevat een constante of een placeholderreeks, nooit invoer
(nagelopen: `admin.js:1685`, `:6596`, `:6962`, `:7045`, `notify.js:283`). De
portaaltokens (256 bit, alleen de SHA-256 opgeslagen) en de tweede factor zijn in
orde. Eén observatie die tegen de code in de bestanden zelf ingaat:

### 3.1 `/api/plan` kan de sessie niet zien — die tak is dood
**`functions/api/plan.js:114` tegenover `src/lib/account.js:4845`**

Het sessiecookie staat op `Path=/account` (`COOKIE_FLAGS`), met als noot *"Everything
that reads this session lives under /account"*. `functions/api/plan.js` leest hem wél
en ligt op `/api/plan`, dus de browser stuurt het cookie daar nooit heen:
`currentCustomer()` geeft altijd `null`.

**Gevolg.** `werkGegevensBij()` (`plan.js:231`) draait nooit — de belofte in de noot
op regel 119-124 ("we bewaren de wijziging", "Het e-mailadres blijft dat van de
sessie") is onwaar. En omdat de anonieme tak `upsertCustomer()` op het GEPOSTE
e-mailadres doet: een ingelogde klant die het voorgevulde e-mailveld op /start/plan
aanpast, krijgt zijn abonnement op een ANDERE (nieuw aangemaakte) klantrij, los van
het account waarmee hij is ingelogd. De capaciteits- en dubbelcheck
(`loadSubscription(customer_id)` in `subscribe.js:210`) kijkt dan naar de verkeerde rij.

**Kleinste reparatie.** Het e-mailadres in de anonieme tak vastzetten op wat er in de
sessie zit is hier niet mogelijk; of het cookiepad verbreden tot `/` (met behoud van
`SameSite=Lax` + de Origin-controle), of `/api/plan` verplaatsen onder `/account/`.

**Testdekking.** `tests/plan-zonder-account.test.mjs` toetst de anonieme tak; de
ingelogde tak wordt nergens getoetst.

---

## 4 · STILLE FOUTEN

### 4.1 Een bestelling die op de btw-beoordeling wacht, verliest na zeven dagen zijn
### leverdatum en krijgt een mail over een betaallink die nooit verstuurd is
**`functions/api/order.js:1566-1570` · `cron/index.js:191-201` en `:251`**

`window_expires_at` wordt gezet zodra er een venster en een offerte is (regel 1566),
óók als de poort eronder (regel 1629-1630, `vatReview.payableNow && !review.needsReview`)
besluit géén betaallink aan te maken. `FIND_EXPIRED_WINDOWS` filtert alleen op
`payment_status = 'unpaid'` en kent `review_state` niet.

**Scenario.** Een klant buiten de EU bestelt met een gereserveerd venster. Hij krijgt
geen betaallink (dat is de bedoeling: eerst nakijken). Zeven dagen later geeft
`releaseExpiredWindows()` zijn dagen vrij en mailt hem *"er is binnen zeven dagen niet
betaald … Betaal via de link in je bevestigingsmail"* — een link die nooit in die mail
heeft gestaan. Keurt de studio hem daarna goed, dan gaat er een betaallink uit voor een
bestelling zonder leverdatum.

**Kleinste reparatie.** `AND (review_state IS NULL OR review_state = 'approved')` in
`FIND_EXPIRED_WINDOWS`, en `window_expires_at` bij goedkeuring opnieuw zetten in
`handleVatDecision()` (`admin.js:9269`).

**Testdekking.** Geen; `tests/vat-gate.test.mjs` en `tests/betaalherinnering.test.mjs`
raken de vensterlus niet.

### 4.2 `order_events.status` krijgt op vier plekken de waarde `'pending'`, die geen orderstatus is
**`src/lib/betaallink.js:122` · `src/lib/admin.js:9253` en `:9334` · `cron/index.js:216`**

De geldige statussen zijn `received, in_production, human_check, delivered, cancelled`
(`admin.js:173`). De klant-tijdlijn rendert `statusLabel(e.status, lang) || e.status`
(`account.js:6674`), dus deze regels verschijnen op een Nederlandse tijdlijn met het
kale Engelse woord **pending** ernaast. De noot in `mollie.js:1109-1111` zegt met
zoveel woorden dat een gebeurtenis de BESTAANDE status hoort te herhalen en er geen
mag verzinnen.

**Kleinste reparatie.** De status van de bestelling meelezen en die binden, zoals de
webhook en `close.js` doen.

---

## 5 · ONGEBRUIKTE OF DODE CODE

Naast 3.1 (`werkGegevensBij()`) niets van gewicht. Nagelopen en in orde bevonden:

* `customer_credits` wordt geschreven (`admin.js:1223`, `:5189`) én gelezen
  (`admin.js:5441`); het is een handmatig grootboek, zoals migratie 0027 beschrijft.
* `invoice_archive` wordt geschreven en door geen scherm gelezen — dat is de opzet
  (`schema.sql:560`: wat er na een AVG-wissing van de boekhouding overblijft).
* `file_assets` wordt niet vanuit `src/` of `functions/` geschreven maar wel vanuit
  `scripts/deliver.mjs:493`, en overal met een terugval gelezen.
* `geefNummerTerug()` wordt door `issueInvoice()` en `issueSubscriptionInvoice()`
  gebruikt maar niet door `issueCreditNote()` (`invoice.js:967-980`). Daar staat geen
  UNIQUE-constraint tegenover, dus het is geen gat in de reeks dat je kunt uitlokken —
  wel een afwijking.
* Geen enkele migratie waarop de code rekent ontbreekt: 0001–0047 zijn aanwezig en
  `tests/schema.test.mjs` (18/18) en `tests/migratievolgorde.test.mjs` (4/4) bewaken dat.

---

## Wat al door een toets wordt afgedwongen (dus geen bevinding)

* De idempotentiepoort van de Mollie-webhook, de TEST-MODE-markering en
  `mollieAmountToCents()` — `tests/mollie-webhook.test.mjs` (40/40).
* De dekkingscontrole `betalingGedekt()` op bestellingen en de volledige geldroute —
  `tests/geldroute.test.mjs` (73/73).
* Restitutie per betaling, de creditnota als verschil, en de afronding van
  `creditSnapshotFrom()` — `tests/credit-note.test.mjs` (92/92).
* De btw-beslissing, de poort en de vorm van het btw-nummer — `tests/vat.test.mjs`
  (57/57), `tests/vat-gate.test.mjs`, `tests/btw-vorm.test.mjs`.
* De ladder tegenover `pipeline.js` (voor ladder, outfits en extra's) —
  `assertQuoteMatches()` draait bij import, dus bij elke build.
* Uitvoer-escaping van `admin.js`, `account.js`, `portal.js` en `order.js` —
  `tests/beveiliging.test.mjs` (47/47).
