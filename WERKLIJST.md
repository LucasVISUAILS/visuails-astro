# VISUAILS — werklijst

Opgesteld 6 augustus 2026. Dit is een werkbestand, geen rapport: streep door wat af is en laat het staan, dan zie je over twee weken nog wat je gedaan hebt.

**Afvinken:** zet een `x` tussen de haakjes — `- [x]` — dan verschijnt er een vinkje in VS Code, GitHub en de meeste markdown-viewers. Helemaal afgerond en niet meer relevant? Zet er `~~` omheen: `- [x] ~~oude taak~~` wordt doorgestreept.

**Markering:** 🔴 blokkeert iets anders · 🟡 kost geld of is een besluit · 🟢 gewoon doen

---

## Nagelopen tegen de code — 23 augustus 2026

De hele lijst is één keer regel voor regel tegen de codebase gehouden. Wat hieronder
staat, staat er op bewijs: elk afgevinkt punt heeft een bestand en een regelnummer
achter zich, en waar ik het niet kon aanwijzen is het niet afgevinkt — ook niet als
er iets stond dat erop leek.

*Bijgewerkt 23 augustus, later op de dag: er zijn er sindsdien dertien bij
gekomen — zie "Wat er op 23 augustus is gebouwd" hieronder.*

Van de 124 open punten zijn er **46 aantoonbaar af** en doorgestreept, waaronder
vier van de vijf knopen onderaan die volgens de lijst nog moesten vallen — die
zijn allang gevallen, alleen nooit opgeschreven. **29 punten zijn half af**; die
staan open met een noot eronder die zegt wat er wél is en wat er niet is, want dat
verschil is meestal het eigenlijke werk. **16 zijn open** met een noot waar het
nakijken iets opleverde dat je wilt weten. **15 kan code niet bewijzen** — een
besluit, een handeling in een dashboard, een jurist die leest — en die zijn
gemarkeerd in plaats van beoordeeld. De rest staat onveranderd open.

Drie dingen die het nalopen aan het licht bracht en die niet op de lijst stonden:

1. **`/video` toont vier stilstaande foto's als videovoorbeeld**, waarvan er één
   in de alt-tekst “a product video still from a VISUAILS Motion clip” heet
   (`VideoPage.astro:176`). Dat is niet hetzelfde als een gat: het is een
   bewering die niet klopt, op de pagina waar het gat het grootst is.
2. **Een mislukte incasso wordt nooit afgehandeld.** Niets in de code schrijft
   ooit `pause_reason = 'payment_failed'`, terwijl zowel de webhook als de
   nachtelijke cron als de klanttekst op die toestand rekenen. Zie §2.
3. **Migratie `0024-sample-payer.sql` ontbreekt** terwijl `schema.sql` hem
   beschrijft, waardoor de harde helft van “één proefvisual per bedrijf” stil
   open faalt. Zie “Wat de site belooft maar niet doet”.

Eén punt heb ik onderweg moeten terugdraaien: de interne meldingsmail (§12) leek
af, maar `notifyEmail()` gebruikte het nieuwe briefhoofd niet. Die staat inmiddels
alsnog af — zie hieronder.

---

## En de avond van 23 augustus

**Het merkmodel is één product van € 450 geworden.** Het besluit staat in
MERKMODEL-ONTWERP.md; dit is wat er in de code veranderde. `AMOUNT.brandModel`
ging van 1250 naar 450, en de credit van € 250 die over vijf bestellingen
terugkwam is helemaal verdwenen — met `BRAND_MODEL_CREDIT_DROPS`, met
`boekMerkmodelTegoed()` in admin.js, met de terugverdienfiguur op /pricing en met
de tweede cijferkolom op /custom-models. Op zeven plekken stond een rekensom die
niet meer bestaat.

Wat ervoor in de plaats kwam is korter dan wat eraf ging, en dat is het punt:
*niet per beeld, niet per bestelling, niet per jaar.* Er staat één invariant voor
terug die het besluit zelf bewaakt: het merkmodel mag niet meer kosten dan een
bestelling van tien complete producten, want dat was de fout op € 1.250 — een
toevoeging die tweeënhalf keer de bestelling kost, is geen toevoeging meer. De
build valt om als dat weer gebeurt.

**Bestaande tegoeden blijven staan.** Klanten die de € 1.250 al geboekt kregen,
houden hem in `customer_credits`. Een toezegging intrekken omdat het aanbod
veranderd is, is niet hoe dat werkt.

**De before/after staat op 1:1.** `catalog-after` was al vierkant, `catalog-before`
was 3:4, en op de homepage stond de vergelijking daarom in 3:4 — waardoor het
eindresultaat, het beeld dat het hele argument moet maken, niet volledig in beeld
stond. Er is nu een vierkante uitsnede van dezelfde telefoonfoto waarin het
kledingstuk helemaal past, en de vier aanroepers hebben hun `objectPosition`-
correctie niet meer nodig.

**De proefvisual-balk is het sfeerbeeld geworden.** Volledig, en donker als het
beeld zelf. Eerst stond er een lifestyle-productfoto in, en dat is het verkeerde
soort beeld op 60 pixels hoog: een productfoto wordt daar een vlek. `brand-beam` —
de limoen lichtbundel — is op elke maat herkenbaar als VISUAILS.

**De beelden zijn nagelopen op centrering.** Over acht pagina's verliezen 53
beelden een kwart of meer van hun kader aan `object-fit: cover`. Daarvan viel er
precies één echt om: `lifestyle-phone-made-09` op /video stond half buiten beeld
met twee derde lege bestrating ernaast, omdat een liggende foto in een staande
strook staat en het onderwerp links zit. De rest is centraal gecomponeerd en
overleeft de uitsnede. Het percentage is dus niet het signaal — waar het onderwerp
staat, is dat wel.

**En de timerbalk op de kaartrij heeft nooit gewerkt** — twee misgrepen uit de
splitsing van 20 augustus, allebei zonder foutmelding. Zie de noten in HomeV2.astro.

---

## Wat er volgens de laatste controle nog écht ligt

Op volgorde van wat het kost als het niet gebeurt.

**Het abonnementstegoed is gebouwd maar nergens aangesloten.** Dit is één gat en
geen vier: `verbruikToestaan()` en `verbruikBoeken()` in `subscription.js` zijn af
en getoetst, maar hebben buiten de tests geen enkele aanroeper. Daardoor staan vier
punten van §3 tegelijk stil — aftrekken bij het bestellen, bijbetalen boven het
saldo, handmatig bijstellen in admin, en terugboeken bij annulering. Eén aanroep in
de bestelstroom maakt ze alle vier levend.

**Het testimonialblok op de homepage.** Het adminscherm is af — je kunt een
aanbeveling goedkeuren — maar de homepage leest `order_feedback` nergens en zegt nog
steeds "we hebben nog weinig reviews". Je keurt dus goed en er gebeurt niets.

**De mailonderwerpen leiden nergens vandaan.** Vijftien plekken typen er zelf een.
Dat is precies de drift die §1 wilde voorkomen, en het is de enige helft van dat
punt die nog open staat — de `<title>` staat er bewust buiten.

**De Nederlandse aanhef is in élke klantmail Engels.** `Hi ,` boven een Nederlandse
tekst, op vijf plekken. Alleen de cron doet het goed.

**Twee formulieren missen nog hun eigen foutmeldingen:** de merkmodel-brief en de
wachtpagina's. `/contact` en `/nl/contact` hebben ze sinds vanmiddag wel.

**De galerij is niet aangevuld.** De elf nieuwste merkbeelden op schijf staan er nul
keer in.


---

## Wat er op 23 augustus is gebouwd

Na het nalopen hierboven zijn dertien punten opgepakt en afgevinkt. Ze staan elk
op hun eigen plek in de lijst met wat er precies gebeurd is; dit is het overzicht.

**Eerst een correctie op mijn eigen werk.** Ik meldde bij het nalopen dat migratie
`0024-sample-payer.sql` ontbrak en dat de bankrekeningcontrole op de proefvisual
daardoor stil open faalde. Dat was fout: de migratie staat gewoon in je map, en er
staat een test bij die in de keten zit. Mijn werkkopie liep zes bestanden achter op
jouw map — je had ook de acute Stripe-patch al toegepast — en ik heb die kopie voor
de waarheid aangezien in plaats van eerst jouw map te lezen. Alles is nu
gelijkgetrokken. Het enige dat over die migratie overblijft, is de vraag of hij
tegen remote D1 gedraaid is; `npm run migrate` is idempotent, dus één keer draaien
is het antwoord.

**Wat er is gebouwd, in volgorde van wat het je kost als het niet gebeurt:**

*Een mislukte incasso wordt afgehandeld.* Dit was een echt gat: niets in de
codebase schreef ooit `pause_reason = 'payment_failed'`, terwijl de webhook, de
nachtelijke cron én een klanttekst alle drie op die toestand rekenden. Een
afschrijving die niet doorging, viel door de poort voor mislukte BESTELbetalingen,
vond daar niets, en gaf Mollie een 200. Nu wordt hij vastgelegd, gemeld, en op het
juiste moment gepauzeerd — dat laatste is het scharnier, want te vroeg pauzeren
neemt een klant het saldo af waarvoor hij vorige maand betaald heeft.

*Drie onjuiste beweringen van de site af.* /video schreef stilstaande foto's aan
als filmstills uit clips die niet bestaan; /terms §4 zei dat video en maandplannen
individueel geoffreerd worden terwijl je er prijskaarten van publiceert; en de
gedeelde stockbibliotheek stond in het abonnementsblok zonder het "nog niet
klaar"-label dat de merkeigen laag wél had.

*Uploadkwaliteit wordt bewaakt.* Te klein weigert, te donker en te ver
gecomprimeerd melden. Waarom dat onderscheid er is, staat bij het punt zelf.

*En het kleine werk:* twintig vragen die Google niet als FAQ zag staan nu in de
graph, de drie interne meldingsmails zitten in het gedeelde briefhoofd, de
contactformulieren hebben hun eigen foutmeldingen in beide talen, en `INVOICE_BCC`
staat in de config zodat de factuurkopie naar jezelf daadwerkelijk vertrekt.

**Twee nieuwe testbestanden**, `tests/abo-incasso.test.mjs` (33) en
`tests/beeldkeuring.test.mjs` (29), allebei in `npm test`. De tweede vond onderweg
een echte fout in mijn eigen code. De hele keten is groen.

**Voor je volgende deploy:** `INVOICE_BCC` werkt pas na een deploy, en migratie
`0024` wil je één keer draaien om zeker te weten dat hij er staat.

---

## 0 · Eerst, want de rest wacht erop

## 0a · Migraties die nog moeten draaien

Ze zitten allemaal in één plakbestand, omdat `npm run migrate` vastloopt op
Cloudflare-foutcode 7403 (een sleutelprobleem op je eigen machine, niet op de
database).

- [x] ~~0019 (verkoopkanaal in de brand kit) en 0020 (tevredenheid en reviews)~~ — door Lucas gedraaid.
- [x] ~~0021 (facturen)~~ — gedraaid 9 augustus 2026 met `npm run migrate`, nadat bleek dat een `npx wrangler whoami` ervoor de 7403 wegneemt. `invoice_series`, `invoices` en de vier indexen staan erin. Het plakken in het D1-console was niet meer nodig; `MIGRATIE-0021-PLAKKEN.sql` blijft staan als terugval.
- [x] ~~Wrangler-autorisatie: de 7403 verklaard.~~ Het was geen rechtenprobleem maar een verlopen OAuth-toegangstoken. `npm run migrate`, `npm run backup` en `npm run fetch:order` vernieuwen hem nu zelf voordat ze beginnen (`warmLogin()` in scripts/lib/wrangler.mjs), en `npm run check:wrangler` meet deze oorzaak nu als eerste. Roep je wrangler met de hand aan en krijg je 7403: eerst `npx wrangler whoami`.
- [ ] 🔴 **Deployen, dan `HERSTEL-TESTFACTUREN.sql` draaien, dan VISUAILS Studio → Facturen openen.** In die volgorde. VIS-2026-0001 is uitgegeven met `VAT 0.21%` en het slug "catalog" op papier; dat is 9 augustus gerepareerd, maar de reparatie bereikt een factuur die al `issued` is niet. Zolang het testdata is mag je hem weggooien en de teller op nul zetten — daarna nooit meer, en dan is opnieuw renderen uit `snapshot_json` de weg.
  — *Niet uit code vast te stellen:* dit is een handeling van jou (deployen, SQL draaien, scherm openen), in die volgorde.
- [ ] 🟡 **Opnieuw renderen uit de momentopname is nog niet te doen.** Wordt er ná de eerste echte factuur nog iets aan de opmaak gerepareerd, dan is er geen knop om een bestaande factuur opnieuw te laten maken. De momentopname staat er wel en is er precies voor bedoeld; het is een functie van tien regels plus een plek in het adminscherm. Nu niet gebouwd omdat het weggooien van testdata het vandaag oplost en een ongebruikte knop een knop is die niemand test.
- [ ] 🟢 **De factuur volgt de taal van de bestelling.** Jouw testbestelling stond op `en`, dus je kreeg een Engelse factuur op een Nederlands adres in Enschede. Dat is bedoeld gedrag — de klant krijgt de taal waarin hij besteld heeft — maar het is het soort ding dat je één keer wilt zien voordat het bij een klant gebeurt.
  — *Niet uit code vast te stellen:* gedrag is bevestigd in de code (de factuur volgt `orders.lang`); het punt vraagt dat je het één keer met eigen ogen ziet.
- [x] ~~**Nederlandse postcodes worden overgenomen zoals ze getypt zijn.** "7531HK" komt zonder spatie op de factuur. Niet fout, wel slordig; één normalisatie bij het opslaan lost het op voor alle adressen tegelijk.~~ — `normalisePostal()` in `src/data/address.js:90` maakt van "7531HK" weer "7531 HK", alleen bij NL; aangeroepen in `functions/api/order.js:305` en `:756`.
  Na de deploy en de opruiming haalt de sectie Facturen de achterstand van je betaalde testbestellingen zelf in — maximaal vijf per bezoek, met de betaaldatum als factuurdatum. Zie je nummers verschijnen met `Btw 21%` en een dienstnaam met hoofdletter, dan werkt de hele keten.
- [ ] 🔴 **`SELLER_ADDRESS` als secret in Pages zetten, vóór de eerste echte factuur.** Zonder die variabele valt `sellerOf()` terug op een voorbeeldadres. Je huisadres hoort daar niet in — zet een adres dat je op een factuur wilt zien. `VISUAILS_IBAN` erbij als je het rekeningnummer erop wilt.
  — *Niet uit code vast te stellen:* een secret in Pages zetten — buiten de repo, dus niet uit code af te lezen. `sellerOf()` valt zonder die variabele terug op een voorbeeldadres, en dat gedrag stáát er (`src/lib/invoice.js`).

---

## Reviews (fase 1 gebouwd 9 augustus 2026)

Wat er staat: `src/data/reviews.js` (de twee links, één plek), `src/lib/feedback.js`
(de vraag, de routing en het schrijven — één gedeelde component voor VISUAILS
Studio én het portaal, zoals §2 vraagt), `public/feedback.css`, en de aanroepen in
`account.js` en `portal.js`. De trigger is `closed_at`: élk beeld goedgekeurd.
Onder test in `tests/feedback.test.mjs` (75 assertions, tegen het echte
migratiebestand).

De regel die niet mag sneuvelen: **bij een lage score blijven de publieke
reviewknoppen staan.** Kleiner en onder het privéformulier, maar aanwezig. Ze
weglaten is review gating — bij Google en Trustpilot tegen de richtlijnen en in de
EU een oneerlijke handelspraktijk. De test controleert ook dat er niets is dat ze
wegstopt (`hidden`, `display:none`), want met alleen "staat het in de html" bleef
hij groen toen ik dat probeerde.

Fase 2, nog te bouwen:

- [ ] 🟡 **De eenmalige herinnering na 5-7 dagen** (§2 stap 3). `reminder_sent_at` en de index `idx_feedback_reminder` staan klaar. Blokkeert op hetzelfde als de betaaldeadline: dit project is Cloudflare Pages en heeft geen `scheduled` handler — zie de noot onderaan migratie 0018. Dat is een aparte beslissing (een Worker ernaast, of een cron van buiten).
- [ ] 🟡 **Het testimonialblok op de homepage** (§2 stap 4). Pas tonen bij minstens één goedgekeurde testimonial; bij nul blijft de eerlijke tekst staan die er nu is. Er is nog geen scherm om `testimonial_approved` op 1 te zetten — dat hoort in het adminportaal.
  — *Deels, nagekeken 23 augustus:* het adminscherm is er (`/admin/testimonials`, `src/lib/admin.js:5209`, met `handleTestimonialDecision()` op `:5284` en een teller op het dashboard). Het blok op de homepage niet: `HomeV2.astro` noemt `order_feedback` nergens en toont nog steeds “We hebben nog weinig reviews”.
- [x] ~~**De privénotitie moet ergens binnenkomen.**~~ — gedaan. Bij een score onder de 4 gaat er een mail naar `NOTIFY_EMAIL`, en nog een zodra de klant erbij schrijft wat er misging. Allebei precies één keer: de score mailt alleen als hij verandert, de notitie alleen als hij nieuw is (de eerste wint). Zonder `RESEND_API_KEY` gaat er niets uit en gaat er niets stuk.

---

## Facturen (gebouwd 9 augustus 2026)

Wat er staat: migratie 0021 (`invoice_series` + `invoices`), `src/lib/invoice.js`
(nummer uitgeven, momentopname, idempotent), `src/lib/invoicePdf.js` (de pdf, met
alle drie de btw-behandelingen en de wettelijk vereiste teksten),
`src/lib/invoiceMail.js` (de mail "Betaling ontvangen" met de pdf als bijlage —
die mail bestond niet, dus iemand betaalde en hoorde daarna niets), de sectie
**Facturen** in VISUAILS Studio met `/account/invoices/<id>/pdf`, en de aanroep uit
de Mollie-webhook. Onder test in `tests/invoice-pdf.test.mjs` (141),
`tests/invoice-issue.test.mjs` (63, tegen een echte SQLite) en
`tests/account-invoices.test.mjs`.

Wat er nog niet is, en bewust niet:

- [x] ~~**Creditnota's.** Een refund wordt wel geboekt (`refunded_cents`) maar er komt geen document tegenover. Dat is een eigen nummerreeks en een eigen rij die naar de factuur verwijst — geen tweede factuur op dezelfde bestelling, want dat weigert het schema met opzet.~~ — migratie `0026-credit-notes.sql` maakt `credit_notes` met een eigen uniek nummer uit dezelfde `invoice_series` en een `invoice_id` terug naar de factuur; `issueCreditNote()` staat in `src/lib/invoice.js:819` en wordt aangeroepen vanuit de Mollie-webhook (`functions/api/webhook/mollie.js:698`).
- [ ] 🟡 **De factuur naar de studio.** Nu gaat hij alleen naar de klant. Voor je eigen administratie is de bron `invoices` + R2, en dat is genoeg zolang je erbij kunt; een maandoverzicht in het adminscherm zou hier de logische volgende stap zijn.
  — *Deels — de helft is gedicht (23 augustus).* De factuurmail ging sinds 20 augustus in bcc naar de studio (`src/lib/invoiceMail.js:204`), maar `INVOICE_BCC` stond in geen enkele config, dus die kopie ging stil nergens heen. Hij staat nu in `wrangler.toml` en werkt vanaf je volgende deploy. Een maandoverzicht bestaat nog steeds niet: er is geen `/admin/invoices`-route.
- [x] ~~**Een herstelroute voor `pending` in het adminscherm.** Blijft een factuur op 'pending' staan, dan repareert het klantbezoek hem al. Er is nog geen knop om dat vanaf jouw kant te forceren; de index `idx_invoices_pending` staat er wel voor klaar.~~ — `handleInvoiceRepair()` in `src/lib/admin.js:2782` draait `issueInvoice()` opnieuw voor een rij die op `pending` blijft staan, met behoud van het nummer; twee knoppen op de bestelpagina (`admin.js:1457` en `:1462`).
- [ ] 🟢 **`SELLER_ADDRESS` als secret zetten.** Zonder die variabele valt `sellerOf()` terug op een voorbeeldadres. Zet hem in de Pages-omgeving vóór de eerste echte factuur, samen met `VISUAILS_IBAN` als je wilt dat het rekeningnummer erop staat.
  — *Niet uit code vast te stellen:* zie hierboven — zelfde secret, zelfde handeling.

---

## Wat de site belooft maar niet doet (onderzocht 9 augustus 2026)

Elk punt hieronder is met bestandsverwijzingen bewezen, niet vermoed. Gesorteerd op ernst.

- [x] ~~**De bewaartermijnen worden door niets uitgevoerd.** /terms en /privacy beloven dat aangeleverde foto's 90 dagen na afronding worden verwijderd en visuals 12 maanden bewaard blijven; /portal zegt zelfs dat de bronbestanden "op dezelfde klok" verdwijnen. Er is geen enkele geplande taak (geen `[triggers]` in wrangler.toml, geen `scheduled`-handler), en `files.expires_at` wordt nergens geschreven. De foto's van elke klant staan er na 90 dagen nog. Dit klemt twee kanten op: contractbreuk én een AVG-bewaartermijn die je zelf op twee juridische pagina's hebt vastgelegd. De 90-dagen-*linkexpiry* werkt wél.~~ — `cron/wrangler.toml` is een echte Worker met `[triggers] crons = ["10 3 * * *"]`; `purgeExpiredFiles` (`cron/index.js:403`) draait elke nacht en gooit eerst de R2-objecten weg. De klokken komen uit `src/lib/retention.js` (`UPLOAD_DAYS = 90`, `DELIVERY_MONTHS = 12`) en worden gestempeld bij afronden en bij aankondigen. Dit dekt ook §9 “bewaartermijn en opruimen van uploads in R2”.
- [x] ~~**"Eén proefvisual per bedrijf" wordt niet gehandhaafd.** `functions/api/order.js` gaat bij `test-sample` rechtstreeks naar de betaling zonder ooit op een eerdere proef te controleren. Eén merk kan zijn hele collectie voor €1 per product laten maken. Het enige punt op deze lijst dat direct geld kost.~~
  — *Af — en mijn eerdere noot hierbij was fout.* Twee lagen, allebei aanwezig. De zachte weigert een tweede proef op hetzelfde e-mailadres of telefoonnummer (`functions/api/order.js:580`); de harde herkent de betaler aan een gezouten hash van zijn IBAN en annuleert achteraf (`functions/api/webhook/mollie.js:858`), met `tests/sample-payer.test.mjs` in de testketen.
  Ik meldde eerst dat migratie `0024-sample-payer.sql` ontbrak. **Hij staat gewoon in je map** — 6120 bytes, 10 augustus. Mijn werkkopie miste hem, en ik heb mijn eigen verouderde kopie voor de waarheid aangezien in plaats van eerst jouw map te lezen. Het enige dat overblijft is de vraag óf `0024` tegen remote D1 gedraaid is; dat kan ik van hier niet zien, en `npm run migrate` is idempotent, dus één keer draaien is meteen het antwoord.
- [x] ~~**De bevestigingsmail zegt "incl. 21% btw" ook bij 0%.** `customerEmail()` krijgt de btw-uitkomst wél mee maar leest die parameter nergens; "21%" staat hard in de regel. Een verleggingsklant krijgt twee keer hetzelfde bedrag te zien met "excl." en "incl. 21%" ernaast — in de enige mail die zijn bestelling bevestigt.~~ — `vatSub()` in `functions/api/order.js:2682` vertakt op de btw-behandeling: verlegging leest “0% btw, verlegd”, buiten de EU “geen Europese btw”, en alleen de standaardtak noemt 21%.
- [x] ~~**"De verlegging wordt achteraf op je factuur rechtgezet" is sinds migratie 0015 onwaar.** De verlegging wordt bij het afrekenen toegepast. Staat op /pricing, /how-it-works, /start, in de FAQ én in de bevestigingsmail. Een Duitse klant betaalt al 0% maar leest dat hij 21% betaalt en een correctie krijgt die niet komt.~~ — de belofte staat nergens meer in klantteksten — hij leeft alleen nog als commentaar dat uitlegt waarom hij weg is (`src/data/pricing.js:466`, `functions/api/order.js:2652`). /pricing, /how-it-works, /start, de FAQ (`src/data/faq.js:318` en `:503`) en de bevestigingsmail zeggen nu dat de 0% bij het afrekenen gebeurt.
- [x] ~~**De tevredenheidsvraag wordt nooit gesteld.**~~ — gebouwd 9 augustus 2026, fase 1 van de specificatie (§2 stap 1 en 2). Zie "Reviews" hieronder.
- [x] ~~**Een order die de btw-poort tegenhoudt komt er niet meer uit.** Geen betaallink, en er is geen adminscherm dat de beoordeling afrondt: `orders.review_state` wordt één keer geschreven en nergens gelezen. Een klant buiten de EU krijgt een bevestiging zonder bedrag en zonder betaalknop.~~ — `/admin/vat` → `renderVatReview()` (`src/lib/admin.js:5311`) toont alles op `review_state = 'pending'`, en `handleVatDecision()` (`:5417`) sluit af met `approve`, `charge_vat` of `reject`.
- [x] ~~🟡 **De €250 merkmodel-credit wordt niet verrekend.** Alle treffers zijn presentatie in .astro-bestanden; `quote.js` kent het begrip niet en er is geen kolom om de teller bij te houden. Een geldbelofte met een rekensom die de pagina zelf uitschrijft.~~
  — *Af — en ook hier was mijn noot fout.* Ik zocht in `quote.js` naar een verrekening en naar een tellerkolom, en vond ze niet. Ze horen daar ook niet te zijn: `boekMerkmodelTegoed()` in `src/lib/admin.js:4437` boekt de volledige € 1.250 in het grootboek op het moment dat het eerste merkmodel ontstaat — vanuit beide plekken waar dat kan — met de regel zelf in de reden. Getoetst in `tests/nazicht.test.mjs`, dat ook de twee fouten vastpint die hier ooit in zaten: euro's die als centen werden geboekt, en een teller die na één verwijderd model opnieuw uitkeerde.
  Dat er géén automatische verrekening bij het afrekenen is, is jouw besluit en staat zo in `schema.sql` opgeschreven: *"alleen een ledger, geen verrekening"*, want die rekent stil het verkeerde bedrag af. De belofte hangt dus niet meer van je geheugen af — het tegoed staat op de klantpagina zodra het verdiend is.
- [x] ~~🟡 **"Downloads per kanaal gesneden" bestaat niet.** Eén rij in `files` is één bestand; `preview_key` is expliciet géén uitsnede. De klant downloadt wat de studio uploadde en schaalt alles zelf bij — precies het werk waarvan /portal zegt dat het niet meer nodig is.~~
  — *De belofte is van de site af, 23 augustus.* Er wordt inderdaad nergens gesneden, en het schema sluit die vorm bij naam uit. De claim stond op de homepage en op /how-it-works, in beide talen, en is vervangen door wat er wél gebeurt: je kiest de beeldverhouding bij het bestellen — één voor een hele catalogbestelling, per beeld bij lifestyle — en krijgt elk beeld in alle drie de formaten. De keuze valt vóór de productie in plaats van erna, en dát is precies waarom er niets te snijden valt.
  Snijden per kanaal alsnog bouwen is een aparte beslissing, geen reparatie.
- [x] ~~**De Engelse /ai-act-lead spreekt §6 van dezelfde pagina tegen.** "We say so on the file" tegenover "We add nothing […] do not rely on a file identifying itself". De Nederlandse lead klopt. Dit is de pagina waarmee je je zorgvuldigheid verkoopt.~~ — er blijkt geen aparte /ai-act-lead-pagina te bestaan — het ging om EN §6 tegenover NL §6 in `src/components/AiActPage.astro`. Die zeggen nu hetzelfde (`:181` en `:268`), en `tests/promises.test.mjs:345` houdt de twee talen tegen elkaar.
- [x] ~~**Niet-betaalde leverdata worden nooit vrijgegeven.** `window_expires_at` wordt gezet, maar `functions/api/capacity.js` filtert er niet op. Wie niet betaalt houdt zijn week voor altijd bezet, en de volgende klant ziet "vol" voor een vrije week.~~ — `functions/api/capacity.js:164` sluit onbetaalde reserveringen met een verlopen `window_expires_at` uit de bezette dagen, dus de week komt vrij zonder op de nachtelijke taak te wachten.
- [x] ~~🟡 **"Mail ons en we sturen een nieuwe link" kan niemand uitvoeren.** `freshPortalLink()` bestaat, maar beide aanroepen zitten achter een poort die nieuwe bestanden vereist. Na 90 dagen — precies wanneer de klant volgens de voorwaarden mag mailen — is er geen route.~~
  — *Gebouwd 23 augustus.* `handleFreshLink()` op `/admin/orders/:id/fresh-link`, met de knop op de bestandenpagina. Hij werkt juist wél als er niets aan te kondigen valt — dat was het hele probleem: de herleveringsknop stopt bij "niets nieuws", en een klant die na vier maanden mailt heeft per definitie niets nieuws.
  **En hij doet niet alsof er iets nieuws is.** `redelivery_count` gaat niet omhoog, niets wordt als aangekondigd gestempeld, en de mail zegt letterlijk dat er niets aan je beelden is veranderd. Dat onderscheid is de reden dat het een eigen route is: een mail die "nieuwe beelden" zegt terwijl er niets nieuws is, is het soort bericht dat een klant één keer opent en daarna niet meer vertrouwt. De oude link wordt ingetrokken en dát staat er wel bij. Elf toetsen in `tests/admin.test.mjs` §5.
- [x] ~~🟡 **Geen aftelling bij de leverdatum**, terwijl de homepage die beschrijft. En /portal noemt zes statussen; de code heeft er vijf, waarvan "Revision" en "Closed" niet als status bestaan.~~
  — *Allebei rechtgezet op 23 augustus, en de aftelling is niet gebouwd.* Dat laatste is met opzet: de aftelling is op drie plekken in de code uitdrukkelijk afgewezen (`capacity.js:68`, `portal.js:992`, `account.js:5634` — *"de klant krijgt de kalenderdata, nooit een aftelling"*). Het portaal drukt een datumbereik af, en dat is wat de homepage nu ook zegt.
  De zes statussen zijn vier stappen plus twee dingen die onderweg kunnen gebeuren. "Revisie" en "Afgesloten" zijn echt — alleen komen ze ergens anders vandaan: een revisie is een toestand van één BEELD, en afgesloten is `orders.closed_at`. Dat verschil staat er nu bij, en het is niet cosmetisch: een klant die leest dat een revisie per beeld loopt, snapt meteen waarom de rest van zijn bestelling doorgaat.
- [x] ~~🟢 **/demo belooft te weinig**: zegt dat per beeld goedkeuren vanaf 10 producten geldt, terwijl elke betaalde bestelling het sinds 7 augustus mag.~~
  — *Rechtgezet 23 augustus.* `canReviewOrder()` kijkt niet naar een aantal: hij weigert alleen de proefvisual en een al afgesloten bestelling. /demo zei dat je onder tien producten "een downloadlink" krijgt in plaats van het scherm waar die hele pagina over gaat — en dat is precies het merk dat je binnen wilt halen, drie producten aan het proberen. De drempel blijft staan waar hij wél geldt: de leverdatum.

Niet vast te stellen uit code, wel na te gaan: de verwerkersovereenkomsten met Resend, Mollie, Cloudflare en de modelaanbieder (/privacy §5 en §8 beloven die), en hoe de ICP-opgaaf feitelijk gedaan wordt — `icp_reported_at` en `needsIcp()` bestaan, maar er wordt nooit naar geschreven.

- [ ] 🔴 **Juridische pagina's laten nakijken.** Op /terms, /privacy en /cookie-policy stonden tot 8 augustus 2026 noten aan de klant dat het "een algemene template" is en "door een jurist nagekeken moet worden". Die zijn van de klantpagina's gehaald — ze hoorden daar niet, want ze vertelden iedere klant dat het contract dat hij aanging niet was nagekeken. **Het onderliggende punt staat nog: de teksten zijn niet door een jurist gezien.** Neem dit mee in dezelfde ronde als de btw-verlegging.
  — *Niet uit code vast te stellen:* een jurist die de teksten leest, laat geen sporen na in de repo.
- [x] ~~**/terms §9 spreekt zichzelf en de site tegen over betalen.** De voorwaarden zeggen "kleine bestellingen en proefvisuals worden bij het afrekenen volledig betaald" en "een gereserveerde bestelling in twee delen: 50% bij bevestiging, 50% voor oplevering". De bestelstroom, /pricing, /faq en /how-it-works zeggen alle vier iets anders: kleine bestellingen op levering, gereserveerde bestellingen ineens vóór productie, met zeven dagen betaaltermijn. Er bestaat nergens een 50/50-splitsing. Welke kant waar is, is een bedrijfsbeslissing — niet iets om in stilte gelijk te trekken.~~ — §9 leest nu “je betaalt dat bedrag in één keer via één betaallink — er zijn geen termijnen” (`src/pages/terms.astro:236`, NL `:168`). De 50/50-tekst staat alleen nog in het wijzigingscommentaar.
- [ ] 🟡 **/terms §4 noemt video, maandplannen en merkmodel "op aanvraag geprijsd"** terwijl /pricing, /video, /custom-models en de JSON-LD €69 per clip, €390/€790/€1.690 per maand en €1.250 setup als vaste prijzen publiceren.
  — *Af sinds 23 augustus, in twee rondes.* §4 las de prijzen van catalog en lifestyle al uit de prijsladder. De regel “video, custom work en maandplannen — individueel geoffreerd” is gesplitst: video noemt het vaste cliptarief uit `AMOUNT.video`, de maandplannen hun van–tot uit `monthlyCents()`, en alleen maatwerk staat er nog als geoffreerd.
  **De derde tegenspraak zat er 's avonds nog in en is nu ook weg:** §4 zei dat het merkmodel *"vooraf geoffreerd"* wordt, terwijl er een vaste prijs voor gepubliceerd stond op /pricing, /custom-models, /start, de homepage én in de JSON-LD. Precies dezelfde fout als de twee die ik 's middags repareerde, één regel lager. Hij leest nu `AMOUNT.brandModel`.
- [ ] 🔴 `npm run build` draaien en deployen. Alles van vandaag staat nog alleen op je schijf: het nieuwe logo in de topbar, de favicon, het mail-briefhoofd, en de drie servicepagina's
  — *Niet uit code vast te stellen:* `npm run build` en deployen zijn handelingen op jouw machine.
- [ ] 🔴 Na de deploy: `https://visuails.com/favicon.ico` en `/img/mail/mark-groen.png` openen in je browser om te zien dat ze laden
  — *Niet uit code vast te stellen:* twee URL's openen in je browser.
- [ ] 🔴 Search Console → URL-inspectie op `https://visuails.com/` → Indexering aanvragen. Daarna hetzelfde voor `https://www.visuails.com/`, zodat Google de 301 tegenkomt
  — *Niet uit code vast te stellen:* Search Console.
- [x] ~~Migratie `0008` draaien tegen remote D1~~ — meegegaan in de run van 9 augustus 2026 (56 opdrachten uitgevoerd, 81 overgeslagen omdat ze er al stonden).
- [x] ~~Wrangler-autorisatie fixen — de 7403 blokkeert `npm run fetch:order` en het draaien van migraties vanaf de CLI~~ — zie boven: verlopen toegangstoken, wordt nu automatisch vernieuwd.
- [ ] Rond 11 augustus: DMARC-rapporten bekijken en beslissen of `p=quarantine` aan kan
  — *Niet uit code vast te stellen:* DMARC-rapporten lezen en een besluit nemen.

---

## 1 · Teksten en merkboodschap

### De hoofdboodschap

- [x] ~~"The brand you envisioned, visualized" vervangen. Je hebt gelijk dat hij ongemakkelijk zit: het is een woordspeling op de merknaam die zichzelf uitlegt, en zodra je hem één keer doorhebt zegt hij niets meer over wat je verkoopt~~ — de kop is nu “Jij uploadt. Wij leveren de campagne.” / “You upload. We deliver the campaign.”, op één plek in `src/data/brand.js:30` en van daar gelezen door de homepage en de mailvoet. Het doortrekken ernaast is niet af — zie het punt drie regels lager.
- [ ] Kiezen wat de kop moet dóén — de drie opties zijn niet uitwisselbaar:
  — *Niet uit code vast te stellen:* een besluit over wat de kop moet dóén — de drie opties sluiten elkaar uit en de code kan er geen van kiezen.
  - [ ] Uitkomst beloven ("je hele assortiment ziet eruit als één merk")
  - [ ] Bezwaar wegnemen ("fotoshootkwaliteit, zonder shoot")
  - [ ] Contrast neerzetten (wat je nu doet vs. wat het kost)
- [ ] Nieuwe kop doortrekken naar `<title>`, og:image-tekst en de mailonderwerpen, anders staat de oude er over drie maanden nog ergens
  — *Deels, nagekeken 23 augustus:* de kop staat op één plek en de homepage en de mailvoet lezen hem daar (`src/data/brand.js:30`), en de og:image-PNG's dragen de nieuwe tekst. De `<title>` staat er bewust buiten, en de **mailonderwerpen zijn stuk voor stuk met de hand getypt** en leiden nergens vandaan (`order.js:1342`, `admin.js:2527`, `invoiceMail.js:55`, `account.js:1617`) — precies de drift die dit punt wilde voorkomen.

### Nederlandse teksten nalopen

- [x] ~~Beslissen of de NL-teksten een eigen stem krijgen of vertalingen blijven (zie de notitie hieronder — dit is de kern van het probleem)~~ — `STIJL.md:38` legt het besluit vast: het Nederlands is de brontaal voor alles wat een klant leest, het Engels is de vertaling.
- [x] ~~Tone-of-voice-document schrijven in de repo: vijf regels over aanspreekvorm, zinslengte, welke woorden nooit, en drie stukken tekst die je goed vindt als voorbeeld~~ — `STIJL.md:48-185` heeft alle vijf regels (aanspreekvorm, knopteksten, verboden jargon met tabel, zinslengte 16 gemiddeld en max één boven 25, geen inwisselbare zin) en `:189-213` de drie voorbeeldteksten.
- [ ] `/nl/catalog`, `/nl/lifestyle`, `/nl/video` herschrijven met dat document ernaast
  — *Deels, nagekeken 23 augustus:* `/nl/catalog` is echt als Nederlands geschreven (`CatalogPage.astro:248` tegenover `:116`). `/nl/lifestyle` en `/nl/video` zijn nog zin-voor-zin vertalingen, en de video-FAQ (`VideoPage.astro:314`) drukt “prijsladder” en “venster” af — twee woorden die STIJL.md §3 in klantteksten verbiedt.
- [ ] `/nl` homepage, `/nl/pricing`, `/nl/how-it-works`, `/nl/faq` idem
  — *Deels, nagekeken 23 augustus:* `/nl` en `/nl/pricing` lezen als origineel (`PricingPage.astro:267`). `/nl/how-it-works` en `/nl/faq` zijn nog afdrukken van het Engels, tot de interpunctie aan toe (`HowItWorksPage.astro:221` vs `:294`, `FaqPage.astro:77` vs `:98`).
- [ ] De mails in het Nederlands nalopen — die zijn vandaag nieuw en met dezelfde methode geschreven, dus met dezelfde stijfheid
  — *Deels, nagekeken 23 augustus:* de teksten zelf zijn per taal apart geschreven, maar de aanhef is in élke mail hardgecodeerd Engels: `const hi = name ? ‘Hi …,’ : ‘Hi,’` in `order.js:2563`, `admin.js:2695` en `:2951`, en de checklistmail opent met `Hi,` boven een Nederlandse tekst (`order.js:2791`).
- [ ] Foutmeldingen en formulierteksten nalopen; die worden altijd vergeten en worden juist gelezen op het moment dat iemand geïrriteerd is
  — *Deels, en het gat dat ik vond is gedicht (23 augustus).* Het bestelformulier was al helemaal nagelopen (`OrderFlow.astro:409` en `:927`), de account- en portaalfoutpagina's zijn tweetalig, en `/contact` en `/nl/contact` hebben sinds vandaag hun eigen meldingen op alle drie de verplichte velden — via `data-melding` en `initVeldmeldingen()` in `interactions.js`, dus één plek voor elk formulier dat er nog bij komt. Wat nog niet is nagelopen: de losse formulieren buiten deze twee.

> **Waarom het NL stijf leest.** Het ligt niet aan de taal maar aan de volgorde waarin het gemaakt is: elke pagina is eerst in het Engels geschreven en daarna zin voor zin naar het Nederlands gezet, met een structuurcontrole die de twee versies tag-voor-tag identiek houdt. Die controle is goed voor de opmaak en slecht voor het proza — het Nederlands erft de Engelse zinsbouw. Vandaar dingen als *"Het is ook waar een klein merk stilletjes gevestigd begint te ogen"*, wat een letterlijke afdruk is van *"It is also where a small brand quietly starts to look established"*. Geen Nederlander zegt dat zo.
>
> Wat helpt is niet een koppeling maar een bron: een kort document met jouw stem erin plus drie stukken tekst die jij goed vindt. Dan schrijf ik het Nederlands als origineel in plaats van als vertaling. Dat mag ook andersom — NL eerst, EN erachteraan — want jouw klanten zijn grotendeels Nederlands.

---

## 2 · Betalen, btw en abonnementen

### Kan Mollie abonnementen?

Ja. Mollie heeft een Subscriptions API bovenop mandaten: je laat de klant één keer betalen met `sequenceType: "first"`, daaruit rolt een mandaat, en daarna incasseer je periodiek zonder dat de klant iets hoeft te doen. iDEAL en Bancontact maken een SEPA-incassomandaat aan; creditcard maakt een creditcardmandaat. Alleen SEPA-incasso en creditcard staan standaard aan.

- [ ] Nagaan of Recurring op jouw Mollie-account is vrijgegeven (het moet apart aangezet worden)
  — *Niet uit code vast te stellen:* iets nagaan in je Mollie-dashboard.
- [x] ~~Eerste betaling met `sequenceType: "first"` inbouwen, klant-record aanmaken, mandaat opslaan~~ — `src/lib/mollie.js:280` stuurt `sequenceType: 'first'`, `createMollieCustomer()` (`:243`) maakt het klant-record, en het mandaat wordt opgehaald met `firstPaymentMandate()` (`:302`) en opgeslagen via `setMollieIds()` (`src/lib/subscription.js:551`).
- [x] ~~Webhook afhandelen voor mislukte incasso's — Mollie probeert tot vijf keer opnieuw en zet de boel daarna stil, en jouw kant moet weten dat dat gebeurd is~~
  — *Gebouwd 23 augustus.* `recordSubscriptionFailed()` in `functions/api/webhook/mollie.js`: een mislukte afschrijving wordt vastgelegd in `subscription_payments`, jij krijgt bericht, en het abonnement gaat op pauze met `pause_reason = 'payment_failed'` — waarmee de cron-melding en de klanttekst die daarop wachtten eindelijk bereikbaar zijn.
  **Het scharnier zit in het moment, niet in de pauze.** Mollie int niet één keer: mislukt een termijn, dan probeert hij het opnieuw en pas als die pogingen op zijn zet hij het abonnement op `suspended`. Meteen pauzeren zou de klant het saldo afnemen waarvoor hij vorige maand betaald heeft, terwijl Mollie het bedrag morgen alsnog int. Dus vragen we het aan Mollie (`getMollieSubscription()`) in plaats van zelf te tellen, en als Mollie niet antwoordt pauzeren we niet. 33 toetsen in `tests/abo-incasso.test.mjs` (`npm run test:incasso`).
- [x] ~~Opzeggen en pauzeren inbouwen, plus wat er met resterende credits gebeurt bij opzegging~~ — pauzeren en hervatten op `/account/plan/pause` (`src/lib/account.js:5969`, stopt eerst de incasso bij Mollie), opzeggen op `:6004`, en het besluit over resterende credits staat in `src/lib/subscription.js:627`: het saldo blijft staan en verloopt vanzelf.

> **De belangrijkste beperking:** de Subscriptions API is voor **vaste bedragen**. Variabel per maand kan er niet op. Dat is voor jou geen probleem maar juist het antwoord: het abonnement is een vast maandbedrag, en de credits zijn een tabel in je eigen database. Mollie int, jij telt.

### Btw

- [ ] 🟡 Beslissen: bij Mollie blijven of naar Stripe. Mollie rekent geen btw voor je uit — bepalen, tonen en factureren is jouw verantwoordelijkheid. Stripe Tax doet dat wel, tegen een percentage per transactie
  — *Niet uit code vast te stellen:* een besluit tussen Mollie en Stripe. Zie ook de sectie “Beslissingen” onderaan.
- [x] ~~Zolang je bij Mollie blijft: de verlegging-op-de-factuur-route netjes dichttimmeren. Nu betaalt iedereen 21% en wordt een geldig EU-btw-nummer achteraf rechtgezet, wat klopt maar handwerk is~~ — de verlegging wordt bij het afrekenen toegepast in plaats van achteraf — `vatDecision()` op het live VIES-antwoord (`functions/api/order.js:809`) en `vatGate()` (`src/data/vat.js:327`), die zonder bevestiging geen betaallink geeft.
- [x] ~~Btw-nummers valideren via VIES bij het bestellen in plaats van achteraf~~ — `checkVat()` (`src/lib/vies.js:104`) draait tijdens het bestellen, vóór het bedrag naar Mollie gaat (`functions/api/order.js:806`), met een grens van vier seconden en het consultatienummer opgeslagen als bewijs (`:981`).
- [x] ~~De €1 proefvisual: als het een échte visual is die de klant krijgt, is het een levering tegen vergoeding en hoort er btw op. Wil je puur verifiëren dat een kaart geldig is, dan is een **€0-eerste betaling** de schone route — Mollie staat dat toe voor creditcard en PayPal, en dan is er geen levering en dus geen btw-vraag~~ — het is €1 inclusief btw geworden — niet €0 en niet €1 plus btw. `quoteTestSample()` (`src/lib/quote.js:331`) rekent de btw uit het bedrag terug, dus NL is €0,83 + €0,17 en verlegging €1,00 + €0,00. De boekhouderscheck uit de noot hieronder staat los daarvan nog open.
- [x] ~~Factuurnummering en bewaarplicht regelen (doorlopend genummerd, zeven jaar)~~ — gedaan 9 augustus 2026, zie "Facturen" boven. Reeks per jaar zonder gaten, momentopname per factuur, pdf in R2 en zeven jaar bewaard.

> Ik ben geen belastingadviseur. Bovenstaande is hoe de systemen werken, niet wat jij fiscaal moet doen — laat de btw-behandeling van de proefvisual en de verlegging één keer bevestigen door je boekhouder, dat is een half uur dat je later dubbel terugverdient.

---

## 3 · Creditsysteem

> **DIT HOOFDSTUK IS ACHTERHAALD — 29 augustus 2026.** Het beschrijft een
> creditsysteem: een saldo dat je afrekent bij het bestellen, met een grootboek
> eronder. Dat is niet wat er gebouwd is. Lucas' slotmodel (migratie `0035`) zet
> het andersom — een slot is een RECHT dat de klant zelf inneemt door een product
> in te vullen en vast te zetten, en dat gebeurt vóór het bestellen en niet
> erbij. De noten hieronder van 23 augustus wijzen naar `verbruikBoeken()` en
> `subscription_months`, en die zijn sinds 0035 niet meer het geldpad.
>
> Wat er van dit hoofdstuk overeind blijft staat onderaan bij 29 augustus. Ik
> laat de rest staan in plaats van hem weg te gooien: de vragen die hier gesteld
> worden zijn nog steeds de goede vragen, alleen zijn vier van de acht inmiddels
> beantwoord door de bouw en niet door een besluit.

Het model: een abonnement is een vast maandbedrag bij Mollie, en de credits zijn van jou. Drie tabellen en je bent er.

- [ ] Datamodel ontwerpen: `subscriptions`, `credit_balances`, `credit_ledger` (elke mutatie een regel, nooit een saldo overschrijven)
  — *Deels, nagekeken 23 augustus:* `subscriptions` bestaat (migratie `0030`) en het géldgrootboek is echt alleen-toevoegen. De creditkant niet: die leeft als een bij te werken totaal op `subscription_months`, en `verbruikBoeken()` doet `SET used = used + ?` (`src/lib/subscription.js:359`) — precies het overschrijven dat dit punt uitsluit. `credit_balances` en `credit_ledger` bestaan niet.
- [ ] Per soort apart tellen — catalogproducten, lifestyleproducten, videoclips — want ze kosten niet hetzelfde
  — *Deels, nagekeken 23 augustus:* producten en videoclips worden apart geteld, elk met een eigen doorrol (`migrations/0030-abonnementen.sql:157`). Catalog en lifestyle delen nog één teller, dus het is een tweedeling in plaats van een driedeling — en er boekt vandaag niets verbruik: `verbruikBoeken()` heeft buiten de tests geen aanroeper.
- [x] ~~🟡 Beslissen wat er aan het eind van de maand gebeurt: vervallen, doorrollen, of doorrollen met een plafond~~
  — *Gevallen 29 augustus:* doorrollen met een plafond. Eén maand voor een maandabonnement, drie voor een jaarcontract, en het dak is dus twee maanden toekenning. Lucas' eigen vergelijking: de belastingaangifte die je uiterlijk eind volgende maand inlevert.
- [ ] Bestelformulier laten weten dat er credits zijn en ze automatisch aftrekken vóór de betaalstap
- [ ] Wat als een bestelling groter is dan het saldo — bijbetalen tegen staffeltarief, of weigeren
- [x] ~~Saldo tonen in het klantportaal en in de accountpagina~~
  — *Af sinds 29 augustus voor de accountpagina:* één regel per soort met wat er deze maand is, wat er doorschoof, en de datum waarop dat vervalt. Het klantportaal op `/o/<token>` toont nog steeds niets, en dat is met opzet — dat portaal hoort bij één bestelling en niet bij een abonnement.
  — *Deels, nagekeken 23 augustus:* de plannenpagina toont beide saldi met een meter, resterend-van-toegekend en de vervaldatum van de doorrol (`src/lib/account.js:5652`). Het klantportaal op `/o/<token>` toont geen saldo, en het geldtegoed uit `customer_credits` ziet de klant nergens.
- [ ] Saldo tonen en handmatig kunnen bijstellen in admin (er gaat een keer iets mis en dan wil je het kunnen rechtzetten)
- [ ] 🔴 **Slots terugboeken als een bestelling geannuleerd wordt.** *Nagekeken 29 augustus en dit is een echt gat.* Losmaken en weghalen op de lijst geven het slot netjes terug (`queueUnlock`, `queueRemove` → `geefSlotTerug`), maar `handleOrderCancel()` in admin.js doet dat niet: annuleer je een abonnementsbestelling, dan zijn de slots weg en de producten ook. Erger nog, diezelfde handler zegt de klant *"Nothing was paid"* op zijn tijdlijn, want een planbestelling draagt `total_cents = 0` — terwijl hij er wél voor betaald heeft, via zijn maandtermijn.

---

## 4 · Inloggen

- [ ] 🔴 Uitzoeken wát er stroef gaat. Nu is het een gevoel; om het te repareren moet het een meting worden. Loggen: hoeveel inlogmails verstuurd, hoeveel links aangeklikt, hoeveel binnen de geldigheid
- [ ] Nagaan of het aan de bezorging ligt (mail komt laat of in spam) of aan de flow (te veel stappen, link verloopt, andere browser)
  — *Niet uit code vast te stellen:* nagaan of het aan de bezorging of aan de flow ligt — dat vraagt de meting uit het punt erboven, niet de code.
- [x] ~~Overwegen: een 6-cijferige code naast de magic link. Dan hoeft niemand van mailapp naar browser te springen, wat op mobiel precies de plek is waar mensen afhaken~~ — migratie `0017-login-code.sql` voegt `code_hash`, `code_expires_at` en `code_attempts` toe; de code wordt uitgegeven in `src/lib/account.js:1593` en na vijf pogingen verbrand (`:1695`).
- [ ] "Onthoud mij" met een langere sessie, zodat terugkerende klanten niet elke keer opnieuw moeten
  — *Deels, nagekeken 23 augustus:* de sessie is al lang en schuift mee — 30 dagen (`src/data/cookies.js:37`), bij elk bezoek ververst (`src/lib/account.js:2143`). Er is alleen geen keuze: geen aankruisvakje op het inlogformulier, en de termijn is een constante in plaats van iets wat de klant zet.
- [x] ~~Vervallen link: nu een doodlopende pagina, moet een knop worden die meteen een nieuwe stuurt~~ — `badLinkBody()` (`src/lib/account.js:4129`) zet het inlogformulier zelf op de vervallen-linkpagina — één veld en versturen.
- [x] ~~Inloggen aanbieden op het moment dat het loont — bovenaan het bestelformulier staat het al, maar ook na het bestellen ("bewaar dit zodat je het niet opnieuw hoeft in te vullen")~~ — aankruisvakje in stap 5 van het bestelformulier (`src/components/order/OrderFlow.astro:2080`), opgeslagen als `customers.save_requested_at` en verzilverd bij de eerste keer inloggen (`promoteSaveRequest()`, `src/lib/account.js:1490`).

---

## 5 · Adminpaneel

- [x] ~~Klantaccounts kunnen inzien: bestellingen, credits, modellen, aanmeldmoment~~ — `renderCustomer()` (`src/lib/admin.js:3718`) laadt bestellingen, custom modellen, stijlvergrendelingen en het creditgrootboek in één keer, met het aanmeldmoment in de inleiding (`:3994`).
- [x] ~~Custom modellen kunnen verwijderen (jouw voorbeeld — nu kan een per ongeluk toegevoegd model er niet meer uit)~~ — `handleModelManage()` actie `delete` (`src/lib/admin.js:3348`): naam overtypen, stijlvergrendeling leegmaken, rij weg, R2-voorbeeld weg, regel in het logboek.
- [x] ~~Custom modellen kunnen hernoemen en verbergen zonder ze te verwijderen~~ — hernoemen op `src/lib/admin.js:3316` (een lege naam wordt geweigerd) en verbergen of terugzetten op `:3328`, met een verplichte reden bij verbergen; de klantkant filtert op `hidden_at` (`:3791`).
- [x] ~~Klantgegevens kunnen corrigeren (verkeerd merknaam, verkeerd btw-nummer)~~ — `handleCustomerDetails()` (`src/lib/admin.js:3396`), formulier op `:4048`. Leeg betekent wissen bij elk veld behalve het e-mailadres, en dat wordt geweigerd.
- [ ] Account kunnen deactiveren of samenvoegen bij dubbele registratie
  — *Deels, nagekeken 23 augustus:* deactiveren is af: verplichte reden, sessies én openstaande inlogtokens weg, terug te draaien, en de authenticatielaag controleert het nog een keer (`src/lib/admin.js:3506`, `src/lib/account.js:2134`). Samenvoegen is een verwijzing en geen samenvoeging — `merged_into` noteert dat twee rijen bij elkaar horen, maar er wordt niets verplaatst.
- [x] ~~Credits handmatig bijboeken of afboeken, met reden erbij in het ledger~~ — `handleCustomerCredit()` (`src/lib/admin.js:3586`) boekt plus of min met een verplichte reden, alleen als nieuwe regel — nooit een UPDATE of DELETE — en het saldo is een SOM over het grootboek (`:4081`).
- [x] ~~Een klant handmatig een nieuwe inloglink kunnen sturen vanuit admin~~ — `handleCustomerSigninLink()` (`src/lib/admin.js:3676`) gebruikt dezelfde `sendLoginLink()` als de openbare route en weigert gedeactiveerde accounts; knop op `:4131`.
- [x] ~~Verwijderverzoek kunnen uitvoeren (AVG) — één knop die klant, bestellingen en bestanden opruimt~~ — `handleCustomerWipe()` (`src/lib/admin.js:884`): naam overtypen, eerst het bewaararchief wegschrijven, dan de R2-objecten inclusief afgeleide formaten, met gefactureerde bestellingen bewust behouden.

---

## 6 · Bestelformulieren

- [x] ~~Catalogformulier afmaken en nalopen~~ — `/start/catalog` draait de volledige vijfstaps-`OrderFlow` met bevestigingsscherm, en `scripts/flow-walk.mjs:81` loopt de EN- en NL-route van begin tot eind na.
- [x] ~~Lifestyleformulier afmaken en nalopen~~ — `/start/lifestyle` draait dezelfde stroom met `StylePicker` in stap 1 en zonder de achtergrondvraag (`OrderFlow.astro:181`); ook nagelopen door `flow-walk.mjs`.
- [ ] Videoformulier afmaken — dit is de dunste van de drie
  — *Open, nagekeken 23 augustus:* `/start/video` is nog een `HoldingPage` die zelf zegt dat je er niet kunt afrekenen; `flow-walk.mjs` kent de route niet.
- [x] ~~De 35+-trede in de staffel is onbereikbaar omdat het formulier op 30 producten dichtklapt. Of het plafond eraf, of de trede eruit — nu staat er een prijs op de site die niemand kan bestellen~~ — de trede is eruit — `src/data/pricing.js:121` eindigt op `[20, null, 65]`, met het besluit (“Hero op €65, trede eruit”) en de reden erboven vastgelegd tegenover `ATTENDED_PER_WINDOW = 30`.
- [x] ~~Videobestellingen worden meegeteld als attended orders in de capaciteitsagenda; dat klopt niet en vervuilt je planning~~ — `tierFor()` (`src/data/pricing.js:338`) geeft `unattended` terug voor alles wat niet op de prijsladder staat en `isLadderService()` (`:346`) sluit video uit; `functions/api/order.js:642` gebruikt die. Tien clips boeken geen begeleide week meer.
- [ ] Voortgang bewaren zodat iemand die halverwege wegklikt niet opnieuw hoeft te beginnen
  — *Open, nagekeken 23 augustus:* er staat niets in `localStorage` of `sessionStorage`, er is geen `beforeunload`/`pagehide`, en er is geen tabel voor een halve bestelling.
- [x] ~~Foutafhandeling op de uploadstap (te groot, verkeerd formaat, verbinding weg)~~ — `retryableUpload()` (`src/scripts/pipeline.js:3516`) probeert alleen bij netwerk-, snelheids- en 5xx-fouten opnieuw (drie keer, met wachttijd), en `uploadError()` (`:3757`) geeft `too-large`, `batch-full` en `bad-type` elk hun eigen tekst met een knop “Opnieuw” per bestand.
- [x] ~~Bevestigingsscherm nalopen: staat er alles op wat iemand nodig heeft om gerust te zijn~~ — het bevestigingsscherm (`OrderFlow.astro:2001`) leest de bestelling terug, zegt wat er na het versturen gebeurt, meldt dat er geen kaartgegevens gevraagd worden, en wijst op de voorwaarden en het herroepingsrecht.

---

## 7 · Content en voorbeelden

- [ ] 🔴 Videovoorbeelden maken — `/video` en de vier subpagina's verkopen nu iets wat nergens te zien is. Dit is het grootste gat op de site
  — *Deels, en de onjuiste bewering is weg (23 augustus).* De speler en de gegevenslaag staan klaar, de beelden niet: nul `.mp4`/`.webm` in het project en alle acht items in `src/data/videoExamples.js` hebben `file: null`, dus overal rendert het lege vakje. Dat blijft het werk — en het is maakwerk, geen code.
  Wat wél is rechtgezet: `/video` schreef vier stilstaande foto's aan als videovoorbeeld, waarvan er één in de alt-tekst “a product video still from a VISUAILS Motion clip” heette terwijl er geen enkele Motion-clip bestaat. Die teksten beschrijven nu wat er te zien is — een productfoto. Voor het stappenbeeld is dat bovendien betere copy: stap 1 daar is letterlijk “Stuur een productfoto”.
- [ ] Per videosoort minstens twee voorbeelden: Motion, Lifestyle Video, Campaign, Custom
  — *Deels, nagekeken 23 augustus:* precies twee per soort zijn ingericht — met verhouding, duur, titel en alt-tekst (`videoExamples.js:139-238`). Nul zijn gevuld: Motion 0, Lifestyle 0, Campaign 0, Custom 0.
- [x] ~~Beslissen hoe je ze toont: autoplay-loop zonder geluid, of poster met klik-om-te-spelen (autoplay kost laadtijd, dus niet vijf op één pagina)~~ — besluit gemaakt én gebouwd: poster met klik-om-te-spelen, zonder autoplay en zonder JavaScript (`src/components/VideoExamples.astro:89`), met de reden vastgelegd in `src/data/videoExamples.js:26`. De tak heeft alleen nog nooit gerenderd, want er is geen beeld — zie het eerste punt van deze sectie.
- [ ] Galerij aanvullen met recent werk
  — *Deels, nagekeken 23 augustus:* de galerij bestaat met 38 beelden, hardgecodeerd in `src/pages/gallery.astro:36`. Aanvullen is niet gebeurd: de tien nieuwste foto's op schijf (`brand-*.webp`, 22 augustus) komen er nul keer in voor, en `ONGEBRUIKTE-BEELDEN-22-AUGUSTUS.txt` telt 62 ongebruikte bestanden.
- [ ] Before/after-paren verzamelen — dat is het overtuigendste wat je hebt en er staat er nu één op de site
  — *Deels, nagekeken 23 augustus:* er is nog steeds precies één echt paar (`catalog-before.webp` → `catalog-after.webp`). Alle andere `<Compare>`-aanroepen zetten dezelfde foto twee keer neer met een automatische ontkleuring als “voor”. `gallery.astro:172` zegt zelf dat het blok terugkomt “zodra er vier echte paren zijn”.

---

## 8 · Stock-content als nieuwe categorie

Je noemt twee modellen. Ze sluiten elkaar niet uit, maar ze vragen wel een ander bouwwerk, dus kies er één om mee te beginnen.

- [ ] 🟡 **Besluit:** gedeelde bibliotheek (Death to the Stock Photo-model) óf per merk exclusief
  — *Deels, en het ontbrekende label staat er nu (23 augustus).* Het besluit is genomen en staat in de code: `STOCK_OFF_BRAND` (gedeeld, bij elk plan) naast `STOCK_ON_BRAND` (per merk), `src/data/pricing.js:286`. Gebouwd is er niets — geen tabel, geen R2-map, geen route, en de knop is `disabled`.
  De gedeelde regel stond op de homepage én op /plans zónder het “nog niet klaar”-label dat de merkeigen regel wél kreeg. Dat is een andere fout dan een pagina die te veel belooft: het staat in het blok waarmee een abonnement wordt verkocht, dus het was een toezegging binnen iets waarvoor betaald wordt. Beide dragen nu “Nog niet actief”.
  - Gedeelde bibliotheek: één keer maken, alle abonnees kunnen kiezen en downloaden. Schaalt goed, maar het beeld is niet van hen alleen — en dat botst met "meer merkgevoel", want een concurrent kan hetzelfde beeld gebruiken
  - Per merk exclusief: zelfde bestelformulier-principe, klant kan eigen model of kledingstuk toevoegen. Meer werk per klant, hogere prijs te vragen, en het past beter bij wat je nu verkoopt
  - Tussenvorm die het overwegen waard is: een gedeelde basisbibliotheek in neutrale merkkleuren, plus een exclusieve laag per merk. Abonnees krijgen de basis, de exclusieve laag is een bestelling
- [ ] Kleurenschema per merk vastleggen zodat de beelden er echt bij passen (dit is de kern van het idee — vul het niet met generieke sfeerbeelden)
  — *Deels, nagekeken 23 augustus:* één achtergrondkleur kan worden bewaard (`customers.default_background_hex`, en per dienst in `customer_style_locks`), maar een merkpalet niet — geen veld en geen kolom, terwijl de tekst al “your brand colours” belooft (`HomeV2.astro:492`).
- [ ] 🟡 Licentietekst schrijven. "Royalty free" is geen licentie maar een marketingterm; er moet staan wat wel en niet mag, hoe lang, en wat er gebeurt als het abonnement stopt
  — *Open, nagekeken 23 augustus:* geen licentiepagina, in geen van beide talen. `terms.astro:213` licenseert opgeleverd werk en zegt niets over de bibliotheek.
- [ ] Downloadbeperking bedenken (aantal per maand, of credits ervoor gebruiken)
  — *Open, nagekeken 23 augustus:* `customer_credits` en `subscription_months` meten besteld werk, geen downloads; niets leest `STOCK_OFF_BRAND` of `STOCK_ON_BRAND` buiten de verkooptekst.
- [ ] Zoeken en filteren in de bibliotheek — zonder dat is een grote bibliotheek onbruikbaar
  — *Open, nagekeken 23 augustus:* de enige filter op de site is die van de marketinggalerij, over 38 vaste portfoliobeelden.
- [ ] Bepalen of stock ook los te koop is of alleen bij een abonnement
  — *Open, nagekeken 23 augustus:* geen stockregel in `AMOUNT`, `TIERS`, `PLAN_IDS` of `SERVICE`. De homepage zegt het zelf: wat het kost en hoe je het bestelt staat nog niet vast, en daarom werkt de knop niet.

---

## 9 · Uploaden en kwaliteit

- [ ] Uploadschema ontwerpen: welke soorten foto's, hoeveel, welke hoeken, welk minimumformaat
  — *Deels — het minimum is er nu wel (23 augustus).* Het opnameschema stond er al: vier opnamen per product (voor en achter verplicht, detail en gedragen optioneel), elk met een instructie over hoek en afstand (`src/data/shots.js:59`), plus 25 MB per bestand. Daar is `MIN_LANGE_ZIJDE` bij gekomen, met de redenering waarom hij op 1000 ligt en niet hoger. Wat nog ontbreekt is het onderscheid **per dienst**: `SHOTS` is nog één lijst voor catalog, lifestyle en video samen.
- [ ] Onderzoeken wat er per soort echt nodig is om consistent resultaat te halen — meten aan echte bestellingen, niet aan aannames
  — *Open, nagekeken 23 augustus:* `files` bewaart wel `bytes` maar geen afmetingen — nul treffers op `width`/`height` in `schema.sql` en `migrations/` — dus er valt vandaag niets te meten.
- [ ] Uploadrichtlijnen-pagina bijwerken naar dat schema
  — *Deels — en mijn eerste noot was hier te streng.* Het vierluik en de verplicht/optioneel-splitsing stáán wel op de pagina (regel 109–114), alleen ingetypt in plaats van uit `shots.js` gelezen. Wat er echt ontbrak was de ondergrens, en die is er sinds 23 augustus: de pagina leest `MIN_LANGE_ZIJDE` en noemt het getal, in beide talen. Dat was ook noodzakelijk geworden — het formulier wéigert nu onder die grens, en een weigering die nergens is aangekondigd, kom je op stap 2 tegen zonder te weten wat je dan moet.
  Wat nog staat: de twee “slecht vs. goed”-voorbeelden zijn nog `<Placeholder>`, dus de pagina die het verschil moet laten zien, laat het niet zien. Dat is fotowerk, geen code.
- [x] ~~Validatie bij het uploaden: te klein, te donker, te veel compressie — meteen zeggen in plaats van na levering~~
  — *Gebouwd 23 augustus, alle drie.* `meetBeeld()` in `pipeline.js` meet in de browser — daar zijn de pixels, en daar kan de klant nog een andere foto kiezen — en `keurBeeld()` in `src/data/shots.js` oordeelt.
  **Eén weigering en twee meldingen, en dat onderscheid is het ontwerp.** Te klein weigert: onder 1000 pixels op de lange zijde zit in de praktijk alleen een screenshot of een van een website geplukt plaatje, en dat is objectief. Te donker en te ver gecomprimeerd zijn vermóédens — een bewust donkere productfoto bestaat, en een flatlay op wit comprimeert nu eenmaal ver — dus die melden alleen, en de foto gaat gewoon mee. Een klep op een heuristiek is een klep die op een dinsdag een echte klant tegenhoudt, en die klant belt niet.
  Lukt het meten niet (HEIC in de verkeerde browser, een geweigerd canvas), dan gebeurt er niets en gaat de foto door. 29 toetsen in `tests/beeldkeuring.test.mjs` (`npm run test:keuring`); die vonden onderweg een echte fout — `Number(null)` is 0, dus een meting zónder helderheid las als pikzwart en zou "te donker" op álles hebben gemeld.
- [ ] Afwijsprocedure: wat doe je als de aangeleverde foto's het gewoon niet halen
  — *Open, nagekeken 23 augustus:* de enige “afwijzen” in de code zijn het btw-nummer en revisieverzoeken op ál geleverd werk. Er is geen status, geen adminactie en geen mailsjabloon voor “je bronmateriaal haalt het niet, stuur nieuwe foto's”.
- [x] ~~Bewaartermijn en opruimen van uploads in R2 vastleggen~~ — gedekt door de bewaartermijnen hierboven: `UPLOAD_DAYS = 90` in `src/lib/retention.js:65`, `EXPIRED_FILES_SQL` (`:147`) dat ook onbestempelde rijen opruimt, en `purgeExpiredFiles` in de nachtelijke cron-Worker (`cron/index.js:403`) dat eerst R2 leegt en dan pas de rijen.

---

## 10 · Prompts en interne bestanden

- [ ] Promptbibliotheek opzetten: per dienst en per stijl, met de versie die werkte en waarom
  — *Open, nagekeken 23 augustus:* het woord “prompt” komt in de hele codebase alleen voor als `customers.upgrade_prompt_at`, een tijdstempel voor een marketingmail.
- [ ] Prompts koppelen aan bestellingen zodat je een geslaagd resultaat kunt terugvinden en herhalen
  — *Open, nagekeken 23 augustus:* `orders.details_json` bewaart formulierantwoorden, `order_notes` is vrije tekst voor jou, `files.review_note` is de klant. Niets schrijft een generatieprompt weg.
- [ ] 🟡 De "sitemap-map met klanteninfo" die je noemt: dit is in feite een klantendossier. Voordat we bestanden gaan maken, eerst bepalen of het in de database hoort (dan is het automatisch bij het inloggen beschikbaar) of op schijf (dan is het handwerk maar direct te openen). Mijn voorstel: database als bron, en een exportknop die er een map van maakt wanneer je hem nodig hebt
  — *Deels, nagekeken 23 augustus:* de database is de bron en het dossier staat er: `/admin/customers/:id` zet klantrij, laatste honderd bestellingen, custom modellen, stijlvergrendelingen en het creditgrootboek op één pagina (`src/lib/admin.js:3718`). De exportknop bestaat niet — geen CSV, geen JSON, geen `Content-Disposition` per klant. Het enige wat exporteert is `npm run backup`, en dat is de hele database.
- [ ] Per klant vastleggen: merkkleuren, voorkeursmodellen, achtergronden, eerdere bestellingen, wat ze eerder afkeurden
  — *Deels, nagekeken 23 augustus:* vier van de vijf worden bewaard: voorkeursmodellen en achtergronden (`customer_style_locks`), eerdere bestellingen (`orders.customer_id`) en wat ze eerder afkeurden (`revision_requests.note`, verplicht). Merkkleuren niet — alleen één achtergrondkleur, geen palet.
- [x] ~~Dat dossier bij het inloggen automatisch de bestelvelden laten voorvullen~~ — `bindPrefill()` (`src/scripts/pipeline.js:3855`) haalt `/account/me` op en vult elk veld dat de bezoeker nog niet zelf heeft ingevuld (`applyAccount`, `:3895`); de serverkant weigert een latere bestelling de bewaarde waarden te laten overschrijven (`functions/api/order.js:2125`).

---

## 11 · Social media

- [ ] Discord-ideeën uit de chat halen en op één plek zetten
- [ ] Ordenen naar formaat: before/after, proces, klantresultaat, uitleg
- [ ] Contentkalender voor vier weken maken
- [ ] Vaste beeldsjablonen in het kleurenschema, zodat een post herkenbaar van jou is
- [ ] Instagram- en Facebook-bio's afstemmen op de nieuwe hoofdboodschap
- [ ] Bepalen waar posts naartoe linken (`/start` of een servicepagina, niet de homepage)
  — *Open, nagekeken 23 augustus:* nul treffers op `utm_` in de hele codebase; `orders.source` komt uit de stroom zelf (`start-catalog`) en niet uit een campagne, en `funnel_hits` heeft geen bronkolom.

---

## 12 · Techniek en onderhoud

- [x] ~~FAQPage-structured-data voor `/catalog`, `/lifestyle` en `/video` — er staan nu twintig vragen op die Google niet als FAQ ziet~~
  — *Gedaan 23 augustus.* Alle twintig staan nu als FAQPage in de graph (7 + 7 + 6). De reden dat ze er niet in zaten was mechanisch: ze stonden in het COPY-object van de drie componenten, en `schema.js` bouwt zijn graph uit het PAD en kan de frontmatter van een component niet lezen. Ze zijn verhuisd naar `serviceFaqs()` in `src/data/faq.js`, waar de pagina en de graph dezelfde string lezen — dezelfde regel die al boven `faqNode()` stond.
- [x] ~~`DESIGN.md` bijwerken: die documenteert nog het blauwe `#90BEFF`-accent en de oude pastelvlakken als geldend~~ — `DESIGN.md:50` noemt `--accent | #C6F100`, en de noot bovenaan legt de regel vast dat een vervangen palet verwijderd wordt in plaats van blijft staan.
- [x] ~~D1-aanroepen zonder guard die een 500 geven in plaats van een nette foutmelding~~ — elke ingang controleert de binding vóór de eerste query en geeft een nette foutmelding: `src/lib/admin.js:113`, `src/lib/account.js:1129` en `:2196`, `src/lib/portal.js:323`, `functions/api/order-status.js:128`, `functions/api/step.js:97`.
- [x] ~~Het woord "drop" staat nog in klantteksten op ongeveer vijf pagina's terwijl het intern is afgeschaft~~ — het zelfstandig naamwoord is uit de klantteksten; wat er nog staat is het werkwoord (“you drop a folder”) en een klassenaam. Als wire-waarde leeft `drop` nog in `src/data/pricing.js:348`, en daar hoort hij.
- [x] ~~De AI Act-pagina spreekt in zijn hero zijn eigen §6 tegen~~ — §6 is herschreven en zegt nu hetzelfde als de hero (`AiActPage.astro:181` en `:268`); `tests/promises.test.mjs:351` houdt de oude tekst tegen.
- [x] ~~🟡 Prijs van het merkmodel (€1.250) staat nog niet vast~~ *(gevallen 23 augustus: één product van € 450, zie `AMOUNT.brandModel`)*
  — *Niet uit code vast te stellen:* een prijsbesluit.
- [ ] Beslissen wat er met `orders@visuails.com` gebeurt: echte gebruiker aanmaken, of mail versturen vanaf `hello@` en die profielfoto meteen goed hebben
  — *Open, nagekeken 23 augustus:* nog geen besluit: `FROM_EMAIL` is nog `VISUAILS <orders@visuails.com>` (`src/lib/mail.js:57`, `wrangler.toml:56`) met `reply_to` op `hello@`.
- [x] ~~Interne meldingsmail (die jij krijgt bij een bestelling) ook in het nieuwe briefhoofd, als je dat wilt~~
  — *Gedaan 23 augustus.* Alle drie: de bestelmelding (`notifyEmail()`), de checklist-aanmelding en het contactbericht gaan nu door `shell()`, met `h1()`, `rows()` en `quote()` in plaats van met de hand nagebouwde tabellen. De inhoud is niet veranderd — de banner, het btw-blok en de bestandstabel zijn eigen bouwsels en die staan er nog precies zo.
- [x] ~~Back-up van D1 en R2 regelen — er is er nu geen~~ *(`scripts/backup.mjs` draait, en de nachtelijke taak klaagt via `BACKUP_STALE_DAYS` als hij ouder dan tien dagen is)*
  — *Deels, nagekeken 23 augustus:* er is een dump van heel D1 plus een R2-sleutellijst (`scripts/backup.mjs`), met een bewaking op de ouderdom in de cron (`checkBackupAge`, `cron/index.js:606`). Wat er niet is: de R2-bestanden zélf gaan alleen mee met `--files`, en het draait als geplande taak op één Windows-machine — er is geen automatische kopie buiten de deur.
- [x] ~~Meten wat er gebeurt: hoeveel mensen starten een bestelling en hoeveel maken hem af~~ — `funnel_hits` (migratie `0025-funnel.sql`), `src/scripts/pipeline.js:613` meldt elke stap aan `/api/step`, en `/admin/funnel` (`src/lib/admin.js:5061`) toont de trechter van start tot afronding.

---

## 13 · Juridisch en administratief

- [ ] Algemene voorwaarden uitbreiden met abonnementen, credits en opzegtermijn
  — *Deels, nagekeken 23 augustus:* §9a Abonnementen staat er in beide talen — looptijd, doorrol, pauze, mislukte incasso, prijswijziging en opzeggen zonder termijn — onder test in `tests/legal.test.mjs:684`. Credits hebben nog geen bepaling: “tegoed” komt alleen voor als coulanceregeling.
- [ ] Licentievoorwaarden voor de stockbibliotheek (zie §8)
  — *Open, nagekeken 23 augustus:* geen van beide voorwaardenpagina's noemt het woord “stock”; de bibliotheek zelf staat als uitgeschakelde knop op de site.
- [ ] Privacyverklaring nalopen op wat je met klantdossiers en uploads doet
- [ ] Verwerkersovereenkomst met de partijen die je gebruikt, als daar persoonsgegevens langs gaan
  — *Niet uit code vast te stellen:* overeenkomsten met derden staan niet in de repo.

---

## Beslissingen die eerst moeten vallen

Dit zijn de knopen die andere taken blokkeren. Zolang deze open staan, kan er in die onderdelen niets af.

- [x] ~~**Mollie of Stripe** → blokkeert abonnementen, credits en de btw-afhandeling~~
  — *Beslist, en de code is er al naar gebouwd:* Mollie. Mandaten, incasso, facturen en de btw-afhandeling bij het afrekenen lopen er allemaal doorheen (`src/lib/mollie.js`, `src/lib/subscribe.js`, `functions/api/webhook/mollie.js`). Stripe staat er nog als tweede webhook, maar wordt de klant nergens aangeboden — geen enkele `.astro`-pagina noemt hem.
- [x] ~~**Credits: vervallen of doorrollen** → blokkeert het datamodel~~
  — *Beslist:* doorrollen met een zichtbare afloopmaand, niet vervallen en niet eeuwig. Vastgelegd in `rolloverDetail()` (`src/data/plans.js`) en gebruikt door `planState()` (`src/lib/subscription.js:231`), inclusief een eigen doorrol voor clips. Het datamodel dat het punt hieronder noemt (`credit_ledger`) is er alleen nog niet — zie §3.
- [x] ~~**Stock: gedeeld of exclusief** → blokkeert de licentietekst en het hele bouwwerk eromheen~~
  — *Beslist, en het is de tussenvorm geworden:* allebei. `STOCK_OFF_BRAND` is de gedeelde basis die bij elk plan zit, `STOCK_ON_BRAND` is de merkeigen laag (`src/data/pricing.js:286`). Daarmee is de blokkade weg en is §8 gewoon bouwwerk — de licentietekst, de zoekfunctie en de prijs kunnen nu geschreven worden.
- [ ] **De hoofdboodschap** → blokkeert de teksten, de social-bio's en de mailonderwerpen
  — *Beslist en doorgevoerd op de plek waar het telt:* “Jij uploadt. Wij leveren de campagne.” staat op één plek (`src/data/brand.js:30`). Wat nog blokkeert is niet het besluit maar het doortrekken — zie §1 en §12.
- [x] ~~**NL als vertaling of als origineel** → blokkeert de tekstronde~~
  — *Beslist:* het Nederlands is de brontaal voor alles wat een klant leest, het Engels is de vertaling en mag zijn eigen zinsgrenzen kiezen (`STIJL.md:38`). De tekstronde zelf is begonnen maar niet af — `/nl/catalog`, `/nl` en `/nl/pricing` zijn om, de rest nog niet. Zie §1.

---

## Een realistische dag

Alles op deze lijst is meer dan een dag. Als je vandaag echt wilt afronden in plaats van overal aan te beginnen:

1. Deployen en Search Console (§0) — een half uur, en het maakt al het werk van gisteren pas echt
2. Eén besluit nemen uit het rijtje hierboven — het liefst Mollie of Stripe, want daar hangt het meeste aan
3. Videovoorbeelden maken (§7) — het grootste gat, en het is maakwerk in plaats van denkwerk
4. Eén tekstronde op één pagina, met het tone-of-voice-document als eerste stap

---

## De nacht van 23 op 24 augustus — het merkmodel werd een product

Alles hieronder is gebouwd, getest en in de map van Lucas gezet. De volledige
keten was groen: `npm test` (55 suites), `npm run audit`, `npx astro build`.

### Wat er af is

- [x] ~~`/start/brand-model` heeft een afrekenstap~~
  — De pagina publiceerde € 450 in de voorwaarden terwijl het formulier eronder een briefing zonder knop was. Het is nu de tweesporen-bestelstroom uit `MERKMODEL-ONTWERP.md` §5: stap 1 kiest de route (zelf beschrijven of aan ons overlaten), stap 2 vraagt het merk uit, stap 3 vertakt (vijf vragen of één), stap 4 is het factuurblok en stap 5 rekent af. Zonder JavaScript staat alles onder elkaar en werkt het formulier gewoon.
- [x] ~~Het merkmodel is een eigen dienst met een eigen bedrag~~
  — `service=brand-model` in `ORDER_SERVICES` en in `FLOWS`, `quoteBrandModel()` in `quote.js` (netto € 450, btw eróver — niet eruit, zoals bij de proefvisual), `FIXED_PRICE_SERVICES` zodat `isPayableService()` hem kent zonder dat `quoteOrder()` op de ladder struikelt, en een eigen regel in `paymentDescription()` zodat er geen “1 producten, undefined” op een bankafschrift komt.
- [x] ~~Na het betalen gaat de klant naar de kassa en niet naar een bedankpagina~~
  — De grote betaalpoort in `order.js` maakt de betaling (met alle controles die daaraan hangen: bestaat de bestelling, is de btw beslist, staat hij niet op de beoordelingslijst) en het merkmodel wordt daarna doorgestuurd naar Mollie. Is er geen link, dan is de bedankpagina de terugval — de bestelling is dan gewoon geplaatst.
- [x] ~~Een eigen herroepingsverklaring~~
  — v1 eindigt op “uit foto's die ik aanlever” en bij een merkmodel levert de klant niets aan. `CONSENT_VERSION_BRAND_MODEL` is een nieuwe versie met dezelfde twee dragende elementen en een kloppende laatste zin. De oude versie blijft opzoekbaar.
- [x] ~~Het uniciteitslogboek per merkmodel~~
  — Migratie `0033-merkmodel-controle.sql` zet vijf kolommen op `orders`, `modelChecks.js` draagt de woordenschat (`UITKOMSTEN`, `merkmodelControleCompleet()`), en `/admin/orders/:id/model-check` legt vast wanneer, met welke zoekmachines, met welke uitslag en door wie. Het scherm **weigert** een halve vastlegging — het enige adminscherm in dat bestand dat dat doet, en de reden staat erbij: dit is bewijs en geen notitie. Elke vastlegging komt ook op de tijdlijn die de klant ziet.
- [x] ~~De twee formulieren zonder `data-melding`~~
  — `BrandModelBrief.astro` (nu op elk verplicht veld) en `order/HoldingPage.astro` (naam, merk, e-mail, in beide talen).
- [x] ~~De stale € 1.250-tekst~~
  — Weg uit de kop van `BrandModelBrief.astro` én uit twee dode blokken in `HoldingPage.astro` die nog zeiden dat het bedrag “verrekend wordt met je eerste bestellingen” en dat er “hier niet af te rekenen” valt.
- [x] ~~De trechter meet het merkmodel mee~~
  — Vijf stappen op één pagina zijn vier stappen die Web Analytics niet ziet. Het formulier meldt elke stap aan `/api/step`, één keer per stap per bezoek.

### Drie dingen die bij het nakijken zijn gevonden

- [x] ~~De bedankpagina liet na een geslaagde betaling niets zien~~
  — `initThankYou()` las alleen `?ref=`, en Mollie stuurt terug naar `?paid=`. Niemand las die parameter. Gevolg: wie betaald had kwam terug op een pagina met een lege, verborgen samenvatting — geen kenmerk, geen bevestiging. Dat gold voor **elke** betaalde bestelling, niet alleen voor het merkmodel. De pagina leest `paid` nu ook, en zet er één zin bij in plaats van een betaalknop.
- [x] ~~De betaalknop op de bedankpagina was nooit opgemaakt~~
  — `.ty-pay-cta` stond als scoped selector in `ThankYouPage.astro`, maar het element wordt door `interactions.js` met `createElement()` gemaakt en draagt het `data-astro-cid`-attribuut dus niet. Gemeten in de gebouwde CSS. Nu `:global()`, met de uitleg erbij.
- [x] ~~`HoldingPage` droeg twee soorten die niemand meer rendert~~
  — `brand-model` (heeft een eigen pagina) en `plan` (`/start/plan` is sinds 17 augustus `PlanPicker`). Allebei stonden ze vol met tekst die niet meer klopte — het plan-blok zei letterlijk dat je een abonnement niet zelf kunt afsluiten.

### Wat er van het merkmodel nog ligt

- [ ] De klant ziet het uniciteitslogboek nog niet
  — Het wordt vastgelegd en het komt op de tijdlijn, maar er staat geen apart blok in het portaal dat zegt “gecontroleerd op *datum* met *n* zoekmachines, geen treffer”. Dat is de sterkste vorm van de garantie: niet dat wij het kunnen laten zien, maar dat het er staat.
- [ ] `src/data/billing.js` en de `FORM`-tabel van `OrderFlow.astro` dragen dezelfde vijftien labels
  — Dezelfde wóórden op twee plekken, nul régels op twee plekken (de voorwaarde wanneer een btw-nummer verplicht is, komt bij beide uit `business.js` en `vat.js`). Bewust zo gelaten: OrderFlow ombouwen op de dag dat er een nieuw betaalpad bij komt, is twee veranderingen in één pad. De kop van `billing.js` zegt hoe je ze later samenvoegt.
- [ ] De tweesporen-vorm geldt ook voor custom lifestyle en custom video
  — `MERKMODEL-ONTWERP.md` §6 beschrijft hem, inclusief de zichtbare haalbaarheidscheck. `/start/custom-look` is nog een `HoldingPage`.

---

## 24 augustus — de ronde terwijl Lucas weg was

Alles hieronder is gebouwd, getest en overgezet. `npm test` (56 suites),
`npm run audit` en `npx astro build` alle drie schoon.

### Wat er af is

- [x] ~~De aanhef in klantmails stond hardgecodeerd in het Engels~~
  — Vier plekken (`order.js` en drie in `admin.js`) hadden ``const hi = order.name ? `Hi ${esc(order.name)},` : 'Hi,';`` met één regel erbóven de vlag `nl` waar de héle rest van diezelfde brief op splitste. Elke Nederlandse klant kreeg dus "Hi Mara," boven een verder volledig Nederlandse mail — bij zijn bestelbevestiging, zijn levering, een herlevering en een nieuwe portaallink. De vijfde klantmail (`mailLegeWachtrij` in cron) deed het wél goed, wat het niet minder maar juist meer een fout maakt. Er is nu één `greeting(name, lang)` in `mailTemplate.js`, met de `esc()` erin zodat een aanroeper hem niet kan vergeten, en `tests/aanhef.test.mjs` rendert alle vier de mails in beide talen.
- [x] ~~Jargon uit STIJL.md §3 op de klantzijde~~
  — Gemeten op de *zichtbare* tekst van de gebouwde pagina's (tekstknopen, geen commentaar, scripts of attributen): 41 treffers in het Nederlands. Er staan er nu 22. Weg zijn: `prijsladder`, `venster` en `queue` uit het video-antwoord in `faq.js` (beide talen), `ladder` uit de voorbehoudsregel boven de tredevergelijking (beide talen), `Queue`/`Wachtrij` als rijlabel in `TIER_ROWS`, `Standard queue` als celwaarde aan de Engelse kant, `ladder` en `scope` op `/terms` (beide talen), `ladder` op `/compare` (beide talen), en `scope` + `deliverables` uit de campagnestap in `videoStyles.nl.js`. Aan de Engelse kant staat nu geen enkele treffer meer.
- [x] ~~Mijn eigen overtreding van gisteren~~
  — De herroepingsverklaring voor het merkmodel zei "op mijn eigen briefing ontworpen" / "designed to my own brief". Uitgerekend in een verklaring die de klant moet begrijpen vóórdat hij hem aanvinkt. In plaats bijgesteld en niet als v2, met de reden erbij: die versie is dezelfde dag gemaakt, nooit gedeployed en staat op geen enkele bestelling. Vanaf de eerste deploy geldt de gewone regel weer.
- [x] ~~Twee celwaarden die in EN en NL iets anders beloofden~~
  — De tredetabel zei Nederlands "Normale doorlooptijd, geen vaste leverdatum" en Engels "Standard queue, no fixed delivery date". Twee cellen naast elkaar in een tabel die er juist is om het verschil zichtbaar te maken.
- [x] ~~`ARCHITECTURE.md` §4.4 en §13 zeiden dat migratie 0024 ontbrak~~
  — Het bestand staat er (6.120 bytes) en `npm run migrate` meldt zelf `overgeslagen — orders.payer_hash bestaat al`. De kolom is er dus en de "één proefvisual per betaler"-controle draait. De eerste helft van dezelfde zin — er is geen register van uitgevoerde migraties — blijft staan, en dat is meteen de reden dat zo'n bewering zo lang onweersproken kon blijven.

### Vier toetsen die op een woord stonden in plaats van op een belofte

`tests/request-flow.test.mjs` viel om op de jargonronde: vier `ok()`-regels pinden
de spelling van een zin waarvan de belófte niet veranderd was. Precies de fout die
de noot erbóven al beschrijft, één laag dieper — de toets was verhuisd van het
bestand naar het antwoord, maar bleef de spelling van dat antwoord vastpinnen.
Ze toetsen nu het feit: dat een clip geen vaste leverdatum krijgt, en dat het
voorbehoud noemt welke producten de twee kolommen beschrijven.

### Drie punten die ik heb uitgezocht en NIET gebouwd

- [x] ~~**De tegoedlaag — en mijn eerdere antwoord hierover was fout.**~~ *(gebouwd 27 augustus als `startPlanStart()`, en op 29 augustus vervangen door het slotmodel — zie onderaan.)*
  Ik schreef dat `verbruikBoeken()` "één aanroep in de bestelstroom" verwijderd is. Dat klopt niet. `/api/order` is anoniem: de sessiecookie staat op `Path=/account` (`account.js:3952`, met de reden erbij — "a narrower path is a smaller surface") en wordt dus nooit naar `/api/order` gestuurd. Saldo afschrijven op een getypt e-mailadres zou iedereen het saldo van een ander laten uitgeven. `verbruikToestaan`, `verbruikBoeken`, `queueTake` en `queueLinkOrder` hebben alle vier geen aanroeper omdat ze bij één en dezelfde ontbrekende functie horen: **een wachtrij-item van een abonnee omzetten in een bestelling.** De plek daarvoor is een adminhandeling ("pak de bovenste N van deze abonnee en maak er een bestelling van"), waar de vier functies in die volgorde achter elkaar staan. Dat is een nieuw geldpad en geen ontbrekende regel.
- [ ] **Reviews op de homepage.** De regel "We hebben nog weinig reviews" is op dit moment wáár, en een leeg blok eronder zou slechter zijn dan de regel. Belangrijker: `ARCHITECTURE.md` §1 verbiedt met zoveel woorden client-side ophalen van paginainhoud, dus dit blok kan niet met een fetch. De vorm die wél past is een bouwstapscript dat de goedgekeurde set uit D1 in `src/data/` schrijft (zoals `visual/referentie.json` er ook staat), dat jij lokaal draait en meecommit. De index `idx_feedback_live` in migratie 0020 staat er al voor klaar.
- [x] ~~**De galerij bijvullen.** De elf `brand-*.webp` worden alle elf gebruikt (HomeV2, StudioPage, Layout) — alleen niet in `gallery.astro`.~~
  — *Gedaan, 30 augustus 2026.* `gallery.astro` noemt de `brand-`-beelden nu veertien keer, met een eigen categorie en `-w380`-derivaten ernaast; `tests/galerij.test.mjs` leest de webp-koppen om te controleren dat elke bron ook echt op het opgegeven formaat staat. De oorspronkelijke tekst hieronder blijft staan omdat de drie keuzes die erin genoemd worden precies de keuzes zijn die gemaakt zijn.
  <br>Oorspronkelijk: Ze erin zetten vraagt drie keuzes die van jou zijn: een nieuwe filtercategorie naast campaign/dunes/flash/glow/phone-made, in twee talen, en nieuwe `-w380`/`-w760`-derivaten. Zonder die derivaten serveert de galerij ze op volle grootte in een cel van 375 px — precies het gemeten probleem van 3,12 MB dat daar is opgelost.

### En wat er van de jargonronde nog ligt

22 treffers, allemaal Nederlands, in twee hoopjes:

- **`/studio`, 13× `venster`.** Die pagina staat in de sitemap en in de voettekst als "Hoe een bestelling draait", dus §3 geldt er. Maar het is de pagina die uitlegt hóé de agenda werkt, en daar is "venster" het onderwerp. Dertien vervangingen op één pagina is een tekstronde, met precies de valkuil die §3 zelf noemt: "het venster" wordt "de leverdatum" en dan moeten het lidwoord en het verwijswoord mee.
- **`briefing`, 9× op `/terms`, `/privacy`, `/data-processing-agreement` en `/contact`.** Op de juridische pagina's is het bijna een gedefinieerde term. Dat is jouw en de jurist zijn keuze, niet de mijne.

---

## 29 augustus 2026 — het abonnement werd slots per soort

Lucas keek naar `/account/plan` en zei wat er mis was: *"voelt heel saai en
onduidelijk"*, en daarna het echte probleem — *"bezoekers gaven aan er niks van
te snappen."* Eén getal met een balk eronder ("12 van de 12 over") zegt niet
waarvan, en een klant die niet weet wat hij heeft, gebruikt het niet.

Zijn eigen model bleek het antwoord, en het is scherper dan wat er stond:

> *"Klanten krijgen 5 catalog/lifestyle slots per maand die ze zelf kunnen
> invullen. De klant voert alle informatie van het product in en klikt op
> confirm, waardoor ze een slot hebben gelockt. 5 slots betekenen ook 5
> producten. Alle slots moeten gesorteerd worden op service categorie waardoor we
> echt gericht abonnementen kunnen maken — bijvoorbeeld een motion-abonnement met
> 4 hooks, 2 motion en 1 lifestyle video per maand."*

Plus de doorschuifregel, met zijn eigen vergelijking erbij: *"net als
belastingaangifte die je uiterlijk het eind van de volgende maand moet
inleveren."* Vijf slots, niets gebruikt, betekent begin volgende maand tien — en
tien is dan ook het dak, want de maand daarna loopt het weer over.

### Wat er gebouwd is

**Migratie `0035-slots-per-soort.sql`.** Eén tabel, `subscription_slots`, met één
rij per abonnement per maand per soort. Verval, het dak van twee maanden en
"oudste eerst" vallen daar alle drie uit — er is geen vervalkolom en geen
plafondkolom, want beide zijn af te leiden uit de maand plus het venster van de
termijn. `plan_queue` kreeg `kind` en `locked_at`.

**`src/lib/slots.js`.** Toekennen (idempotent, want de Mollie-webhook mag twee
keer binnenkomen), lezen, afschrijven vanaf de OUDSTE maand, en teruggeven aan de
NIEUWSTE. Die twee volgordes zijn elkaars spiegel met opzet: afschrijven vanaf de
nieuwste zou slots laten vervallen die de klant nog had kunnen gebruiken, en
teruggeven aan de oudste zou losmaken-en-opnieuw-vastzetten de vervaldatum
stilletjes naar voren halen.

**Vastzetten is de handeling en het moment van betalen.** Een item op de lijst is
een CONCEPT tot de klant erop drukt; dan gaat het slot eraf. `startPlanWindow()`
schrijft daarom niets meer af — dat stond er nog wel, en zou de klant twee keer
voor hetzelfde product hebben laten betalen.

**Opzeggen schuift niet door.** Lucas wees die rand zelf aan. `vensterVoor()`
geeft een opgezegd abonnement een venster van nul: zijn betaalde maand mag hij
nog opmaken — daar heeft hij voor betaald — maar wat hij dan niet gebruikt,
verdwijnt met de opzegging mee. Er is geen volgende maand om naar door te
schuiven.

### Wat het nalopen erna opleverde

Vijf dingen die stil fout waren gegaan, en alle vijf op dezelfde manier: code die
klopte bij het oude model en daarna een leugen werd.

1. **`checkPlanQueues()` telde concepten mee als "klaar".** De mail die vijf dagen
   voor de week waarschuwt dat er niets klaarstaat, zou juist dán zwijgen als de
   lijst vol concepten stond — precies de stille lege week waarvoor die taak
   bestaat.
2. **Het adminpaneel sprak nog van credits.** "12 credits over", "wacht op saldo"
   (een teller die sinds het slotmodel altijd nul is) en "schrijft evenveel
   credits af" bij een knop die niets meer afschrijft.
3. **`verbruikToestaan()` in `startPlanWindow()` heeft nooit gelopen.** `if (!verbruikToestaan(...))`
   op een functie die een OBJECT teruggeeft, is altijd onwaar. Zou hij wél
   gelopen hebben, dan had hij het verkeerde getoetst: doorgeschoven slots vallen
   buiten de toekenning van deze maand, dus een klant met vijf doorgeschoven
   producten had zijn eigen, betaalde werk geweigerd gezien.
4. **De clipsmeter tekende het volgende plan half.** Een vaste tweede balk voor
   video kent precies de soorten die hij bij naam kent. Een motionplan met hooks,
   motion én lifestyle zou er één van de drie laten zien. Er staat nu één regel
   per soort, uit de balans, zonder één soort bij naam in de opmaak — en
   `tests/subscription.test.mjs` toetst dat er ook geen bij naam terugkomt.
5. **Een `<progress>` in plaats van een breedte.** Derde keer dit jaar dat
   `style="width:…"` op de CSP van dit dashboard stukliep (na `swatch()` en de
   beeldverhoudingen). `value` en `max` zijn attributen, dus gegevens, en die
   weigert `style-src 'self'` niet. Bijkomend: een schermlezer leest hem voor.

Daarnaast liepen er vier toetsbestanden mee die nergens in `npm test` stonden
(`bundel`, `leestekens`, `model-checks`, `woorden`) plus `test:slots` zelf. Die
staan nu in de ketting; ze waren alle vijf groen, wat het niet minder maar juist
meer een probleem maakt — een toets die niet draait, is een toets die je denkt te
hebben.

### Wat Lucas nog moet doen

- [x] ~~`npx wrangler d1 execute visuails --remote --file=migrations/0035-slots-per-soort.sql`~~ *(gedraaid 29 augustus)*
- [x] ~~Pages opnieuw deployen, en daarna `npm run cron:deploy`~~ *(gedaan 29 augustus)*
- [x] ~~`npx wrangler secret list --config cron/wrangler.toml` — `RESEND_API_KEY`~~ *(staat erop; het nachtrapport komt aan)*

### En wat er nog ligt

- [ ] 🟡 **Het eigen samengestelde abonnement.** Lucas' wens, en het model kan het
  nu dragen: `PLAN_SLOTS` is een kaart van soort naar aantal, dus een custom plan
  is een rij in diezelfde vorm. Wat er eerst moet vallen is een ONDERGRENS — een
  plan van één slot per maand kost meer aan administratie dan het opbrengt.
- [ ] 🟡 **Stripe.** `functions/api/webhook/stripe.js` is een openbaar eindpunt voor
  een aanbieder die nergens gebruikt wordt; `createTestSampleCheckoutSession()`
  heeft geen aanroeper. 23 toetsen bewaken dode code. Weg of aanzetten — allebei
  goed, alleen niet zo laten.
- [ ] 🟡 **Testimonials — de bouwstap staat klaar, jij moet hem één keer draaien.**
  *Bijgewerkt 30 augustus 2026.* De regel hierboven ("niets leest
  `testimonial_approved`") klopt niet meer. `scripts/testimonials.mjs` leest de
  goedgekeurde set uit D1 en schrijft `src/data/testimonials.js`; `HomeV2.astro`
  leest dat met `testimonialsToShow(3)` en toont het blok alleen als er iets in
  staat. Wat er nog ontbreekt is de INHOUD: dat databestand is vandaag leeg,
  dus de homepage toont nog steeds de eerlijke regel dat er nog geen reviews
  zijn — en dat is precies wat de bedoeling is zolang er geen goedgekeurde
  testimonial is.
  <br>Wat jij moet doen: één goedgekeurde review in /admin, dan
  `npm run testimonials -- --dry` om te zien wat eruit komt, dan zonder `--dry`,
  en het gewijzigde `src/data/testimonials.js` meecommitten.
