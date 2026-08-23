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
af, maar `notifyEmail()` gebruikt het nieuwe briefhoofd niet. Die staat weer open.

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
  — *Deels, nagekeken 23 augustus:* de factuurmail gaat sinds 20 augustus in bcc naar de studio (`src/lib/invoiceMail.js:204`), maar `INVOICE_BCC` staat in geen enkele config — dus die kopie is nu stil uit. Een maandoverzicht bestaat niet: er is geen `/admin/invoices`-route.
- [x] ~~**Een herstelroute voor `pending` in het adminscherm.** Blijft een factuur op 'pending' staan, dan repareert het klantbezoek hem al. Er is nog geen knop om dat vanaf jouw kant te forceren; de index `idx_invoices_pending` staat er wel voor klaar.~~ — `handleInvoiceRepair()` in `src/lib/admin.js:2782` draait `issueInvoice()` opnieuw voor een rij die op `pending` blijft staan, met behoud van het nummer; twee knoppen op de bestelpagina (`admin.js:1457` en `:1462`).
- [ ] 🟢 **`SELLER_ADDRESS` als secret zetten.** Zonder die variabele valt `sellerOf()` terug op een voorbeeldadres. Zet hem in de Pages-omgeving vóór de eerste echte factuur, samen met `VISUAILS_IBAN` als je wilt dat het rekeningnummer erop staat.
  — *Niet uit code vast te stellen:* zie hierboven — zelfde secret, zelfde handeling.

---

## Wat de site belooft maar niet doet (onderzocht 9 augustus 2026)

Elk punt hieronder is met bestandsverwijzingen bewezen, niet vermoed. Gesorteerd op ernst.

- [x] ~~**De bewaartermijnen worden door niets uitgevoerd.** /terms en /privacy beloven dat aangeleverde foto's 90 dagen na afronding worden verwijderd en visuals 12 maanden bewaard blijven; /portal zegt zelfs dat de bronbestanden "op dezelfde klok" verdwijnen. Er is geen enkele geplande taak (geen `[triggers]` in wrangler.toml, geen `scheduled`-handler), en `files.expires_at` wordt nergens geschreven. De foto's van elke klant staan er na 90 dagen nog. Dit klemt twee kanten op: contractbreuk én een AVG-bewaartermijn die je zelf op twee juridische pagina's hebt vastgelegd. De 90-dagen-*linkexpiry* werkt wél.~~ — `cron/wrangler.toml` is een echte Worker met `[triggers] crons = ["10 3 * * *"]`; `purgeExpiredFiles` (`cron/index.js:403`) draait elke nacht en gooit eerst de R2-objecten weg. De klokken komen uit `src/lib/retention.js` (`UPLOAD_DAYS = 90`, `DELIVERY_MONTHS = 12`) en worden gestempeld bij afronden en bij aankondigen. Dit dekt ook §9 “bewaartermijn en opruimen van uploads in R2”.
- [ ] 🔴 **"Eén proefvisual per bedrijf" wordt niet gehandhaafd.** `functions/api/order.js` gaat bij `test-sample` rechtstreeks naar de betaling zonder ooit op een eerdere proef te controleren. Eén merk kan zijn hele collectie voor €1 per product laten maken. Het enige punt op deze lijst dat direct geld kost.
  — *Deels, nagekeken 23 augustus:* de zachte laag leeft en werkt: `functions/api/order.js:580` weigert een tweede proef op hetzelfde e-mailadres of telefoonnummer. De harde laag niet — de webhook schrijft `orders.payer_hash` en `payer_kind` (`functions/api/webhook/mollie.js:858`), maar migratie `0024-sample-payer.sql` ontbreekt terwijl `schema.sql:913` hem beschrijft, en beide statements zitten in een eigen `try`, dus de bankrekeningcontrole faalt stil open. **Die migratie schrijven en draaien is het hele werk dat hier nog ligt.**
- [x] ~~**De bevestigingsmail zegt "incl. 21% btw" ook bij 0%.** `customerEmail()` krijgt de btw-uitkomst wél mee maar leest die parameter nergens; "21%" staat hard in de regel. Een verleggingsklant krijgt twee keer hetzelfde bedrag te zien met "excl." en "incl. 21%" ernaast — in de enige mail die zijn bestelling bevestigt.~~ — `vatSub()` in `functions/api/order.js:2682` vertakt op de btw-behandeling: verlegging leest “0% btw, verlegd”, buiten de EU “geen Europese btw”, en alleen de standaardtak noemt 21%.
- [x] ~~**"De verlegging wordt achteraf op je factuur rechtgezet" is sinds migratie 0015 onwaar.** De verlegging wordt bij het afrekenen toegepast. Staat op /pricing, /how-it-works, /start, in de FAQ én in de bevestigingsmail. Een Duitse klant betaalt al 0% maar leest dat hij 21% betaalt en een correctie krijgt die niet komt.~~ — de belofte staat nergens meer in klantteksten — hij leeft alleen nog als commentaar dat uitlegt waarom hij weg is (`src/data/pricing.js:466`, `functions/api/order.js:2652`). /pricing, /how-it-works, /start, de FAQ (`src/data/faq.js:318` en `:503`) en de bevestigingsmail zeggen nu dat de 0% bij het afrekenen gebeurt.
- [x] ~~**De tevredenheidsvraag wordt nooit gesteld.**~~ — gebouwd 9 augustus 2026, fase 1 van de specificatie (§2 stap 1 en 2). Zie "Reviews" hieronder.
- [x] ~~**Een order die de btw-poort tegenhoudt komt er niet meer uit.** Geen betaallink, en er is geen adminscherm dat de beoordeling afrondt: `orders.review_state` wordt één keer geschreven en nergens gelezen. Een klant buiten de EU krijgt een bevestiging zonder bedrag en zonder betaalknop.~~ — `/admin/vat` → `renderVatReview()` (`src/lib/admin.js:5311`) toont alles op `review_state = 'pending'`, en `handleVatDecision()` (`:5417`) sluit af met `approve`, `charge_vat` of `reject`.
- [ ] 🟡 **De €250 merkmodel-credit wordt niet verrekend.** Alle treffers zijn presentatie in .astro-bestanden; `quote.js` kent het begrip niet en er is geen kolom om de teller bij te houden. Een geldbelofte met een rekensom die de pagina zelf uitschrijft.
  — *Deels, nagekeken 23 augustus:* het bedrag staat vast en wordt gepubliceerd (`AMOUNT.brandModelCredit: 250` in `src/data/pricing.js:607`, met een controle dat 5 × €250 de setup van €1.250 precies aflost). `src/lib/quote.js` kent het begrip nog steeds niet, en er is geen kolom om de teller bij te houden.
- [ ] 🟡 **"Downloads per kanaal gesneden" bestaat niet.** Eén rij in `files` is één bestand; `preview_key` is expliciet géén uitsnede. De klant downloadt wat de studio uploadde en schaalt alles zelf bij — precies het werk waarvan /portal zegt dat het niet meer nodig is.
- [x] ~~**De Engelse /ai-act-lead spreekt §6 van dezelfde pagina tegen.** "We say so on the file" tegenover "We add nothing […] do not rely on a file identifying itself". De Nederlandse lead klopt. Dit is de pagina waarmee je je zorgvuldigheid verkoopt.~~ — er blijkt geen aparte /ai-act-lead-pagina te bestaan — het ging om EN §6 tegenover NL §6 in `src/components/AiActPage.astro`. Die zeggen nu hetzelfde (`:181` en `:268`), en `tests/promises.test.mjs:345` houdt de twee talen tegen elkaar.
- [x] ~~**Niet-betaalde leverdata worden nooit vrijgegeven.** `window_expires_at` wordt gezet, maar `functions/api/capacity.js` filtert er niet op. Wie niet betaalt houdt zijn week voor altijd bezet, en de volgende klant ziet "vol" voor een vrije week.~~ — `functions/api/capacity.js:164` sluit onbetaalde reserveringen met een verlopen `window_expires_at` uit de bezette dagen, dus de week komt vrij zonder op de nachtelijke taak te wachten.
- [ ] 🟡 **"Mail ons en we sturen een nieuwe link" kan niemand uitvoeren.** `freshPortalLink()` bestaat, maar beide aanroepen zitten achter een poort die nieuwe bestanden vereist. Na 90 dagen — precies wanneer de klant volgens de voorwaarden mag mailen — is er geen route.
  — *Deels, nagekeken 23 augustus:* `freshPortalLink()` bestaat en trekt het oude token netjes in binnen één batch (`src/lib/admin.js:2549`), maar er is nog geen knop om hem los aan te roepen: de herleveringsknop stopt bij `if (!tally.files) return` (`:2871`). De knop op de klantpagina (`:4132`) stuurt een account-inloglink, geen portaaltoken.
- [ ] 🟡 **Geen aftelling bij de leverdatum**, terwijl de homepage die beschrijft. En /portal noemt zes statussen; de code heeft er vijf, waarvan "Revision" en "Closed" niet als status bestaan.
- [ ] 🟢 **/demo belooft te weinig**: zegt dat per beeld goedkeuren vanaf 10 producten geldt, terwijl elke betaalde bestelling het sinds 7 augustus mag.

Niet vast te stellen uit code, wel na te gaan: de verwerkersovereenkomsten met Resend, Mollie, Cloudflare en de modelaanbieder (/privacy §5 en §8 beloven die), en hoe de ICP-opgaaf feitelijk gedaan wordt — `icp_reported_at` en `needsIcp()` bestaan, maar er wordt nooit naar geschreven.

- [ ] 🔴 **Juridische pagina's laten nakijken.** Op /terms, /privacy en /cookie-policy stonden tot 8 augustus 2026 noten aan de klant dat het "een algemene template" is en "door een jurist nagekeken moet worden". Die zijn van de klantpagina's gehaald — ze hoorden daar niet, want ze vertelden iedere klant dat het contract dat hij aanging niet was nagekeken. **Het onderliggende punt staat nog: de teksten zijn niet door een jurist gezien.** Neem dit mee in dezelfde ronde als de btw-verlegging.
  — *Niet uit code vast te stellen:* een jurist die de teksten leest, laat geen sporen na in de repo.
- [x] ~~**/terms §9 spreekt zichzelf en de site tegen over betalen.** De voorwaarden zeggen "kleine bestellingen en proefvisuals worden bij het afrekenen volledig betaald" en "een gereserveerde bestelling in twee delen: 50% bij bevestiging, 50% voor oplevering". De bestelstroom, /pricing, /faq en /how-it-works zeggen alle vier iets anders: kleine bestellingen op levering, gereserveerde bestellingen ineens vóór productie, met zeven dagen betaaltermijn. Er bestaat nergens een 50/50-splitsing. Welke kant waar is, is een bedrijfsbeslissing — niet iets om in stilte gelijk te trekken.~~ — §9 leest nu “je betaalt dat bedrag in één keer via één betaallink — er zijn geen termijnen” (`src/pages/terms.astro:236`, NL `:168`). De 50/50-tekst staat alleen nog in het wijzigingscommentaar.
- [ ] 🟡 **/terms §4 noemt video, maandplannen en merkmodel "op aanvraag geprijsd"** terwijl /pricing, /video, /custom-models en de JSON-LD €69 per clip, €390/€790/€1.690 per maand en €1.250 setup als vaste prijzen publiceren.
  — *Deels, nagekeken 23 augustus:* §4 leest de prijzen van catalog en lifestyle nu uit de prijsladder (`src/pages/terms.astro:179`), dus die kunnen niet meer uit de pas lopen. De regel “video, custom work en maandplannen — individueel geoffreerd” (`:184`) spreekt de vaste €69 per clip en de drie maandbedragen nog steeds tegen.
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
  — *Deels, nagekeken 23 augustus:* het bestelformulier is helemaal nagelopen (`OrderFlow.astro:409` en `:927`), en de account- en portaalfoutpagina's zijn tweetalig. `/nl/contact` heeft op zijn drie verplichte velden geen eigen melding (`src/pages/nl/contact.astro:86`), dus daar komt de browsertekst — in een Engelse browser “Please fill out this field” op een Nederlandse pagina.

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
- [ ] Webhook afhandelen voor mislukte incasso's — Mollie probeert tot vijf keer opnieuw en zet de boel daarna stil, en jouw kant moet weten dat dat gebeurd is
  — *Open, nagekeken 23 augustus:* en scherper dan het punt zegt: **niets schrijft ooit `pause_reason = 'payment_failed'`.** De webhook kent alleen het geslaagde pad; een gelukte afschrijving héft een pauze wel op (`functions/api/webhook/mollie.js:377`), en de cron meldt gepauzeerde abonnementen aan jou (`cron/index.js:1041`), maar de toestand die die twee verwachten kan niet ontstaan. Ook de klanttekst `planStatusFailed` (`src/lib/account.js:5554`) is daardoor onbereikbaar.
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

Het model: een abonnement is een vast maandbedrag bij Mollie, en de credits zijn van jou. Drie tabellen en je bent er.

- [ ] Datamodel ontwerpen: `subscriptions`, `credit_balances`, `credit_ledger` (elke mutatie een regel, nooit een saldo overschrijven)
  — *Deels, nagekeken 23 augustus:* `subscriptions` bestaat (migratie `0030`) en het géldgrootboek is echt alleen-toevoegen. De creditkant niet: die leeft als een bij te werken totaal op `subscription_months`, en `verbruikBoeken()` doet `SET used = used + ?` (`src/lib/subscription.js:359`) — precies het overschrijven dat dit punt uitsluit. `credit_balances` en `credit_ledger` bestaan niet.
- [ ] Per soort apart tellen — catalogproducten, lifestyleproducten, videoclips — want ze kosten niet hetzelfde
  — *Deels, nagekeken 23 augustus:* producten en videoclips worden apart geteld, elk met een eigen doorrol (`migrations/0030-abonnementen.sql:157`). Catalog en lifestyle delen nog één teller, dus het is een tweedeling in plaats van een driedeling — en er boekt vandaag niets verbruik: `verbruikBoeken()` heeft buiten de tests geen aanroeper.
- [ ] 🟡 Beslissen wat er aan het eind van de maand gebeurt: vervallen, doorrollen, of doorrollen met een plafond
- [ ] Bestelformulier laten weten dat er credits zijn en ze automatisch aftrekken vóór de betaalstap
- [ ] Wat als een bestelling groter is dan het saldo — bijbetalen tegen staffeltarief, of weigeren
- [ ] Saldo tonen in het klantportaal en in de accountpagina
  — *Deels, nagekeken 23 augustus:* de plannenpagina toont beide saldi met een meter, resterend-van-toegekend en de vervaldatum van de doorrol (`src/lib/account.js:5652`). Het klantportaal op `/o/<token>` toont geen saldo, en het geldtegoed uit `customer_credits` ziet de klant nergens.
- [ ] Saldo tonen en handmatig kunnen bijstellen in admin (er gaat een keer iets mis en dan wil je het kunnen rechtzetten)
- [ ] Credits terugboeken als een bestelling geannuleerd wordt

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
  — *Deels, nagekeken 23 augustus:* de speler en de gegevenslaag staan klaar, de beelden niet: nul `.mp4`/`.webm` in het project en alle acht items in `src/data/videoExamples.js` hebben `file: null`, dus overal rendert het lege vakje. **En er is een fout die zwaarder weegt dan de leegte:** `/video` toont nu vier stilstaande foto's als videovoorbeeld, met `/img/banners-04.webp` bijgeschreven als “a product video still from a VISUAILS Motion clip” (`VideoPage.astro:176`). Dat is geen gat maar een onjuiste bewering.
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
  — *Deels, nagekeken 23 augustus:* het besluit is genomen en staat in de code: `STOCK_OFF_BRAND` (gedeeld, bij elk plan) naast `STOCK_ON_BRAND` (per merk), `src/data/pricing.js:286`. Gebouwd is er niets — geen tabel, geen R2-map, geen route, en de knop is `disabled`. **Wel iets om na te lopen:** de gedeelde regel op de homepage staat er zónder het “nog niet klaar”-label dat de merkeigen regel wél krijgt (`HomeV2.astro:2067`).
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
  — *Deels, nagekeken 23 augustus:* er is een opnameschema: vier opnamen per product (voor en achter verplicht, detail en gedragen optioneel), elk met een instructie over hoek en afstand (`src/data/shots.js:59`), plus 25 MB per bestand. Wat ontbreekt is een **minimum**formaat — er is alleen een plafond — en een onderscheid per dienst: `SHOTS` is één lijst voor alles.
- [ ] Onderzoeken wat er per soort echt nodig is om consistent resultaat te halen — meten aan echte bestellingen, niet aan aannames
  — *Open, nagekeken 23 augustus:* `files` bewaart wel `bytes` maar geen afmetingen — nul treffers op `width`/`height` in `schema.sql` en `migrations/` — dus er valt vandaag niets te meten.
- [ ] Uploadrichtlijnen-pagina bijwerken naar dat schema
  — *Deels, nagekeken 23 augustus:* de pagina bestaat in beide talen maar importeert `src/data/shots.js` niet, dus het vierluik, de verplicht/optioneel-splitsing en de 25 MB staan er niet op. De maatgeving is “stuur de hoogste resolutie die je hebt”, en de twee “slecht vs. goed”-voorbeelden zijn nog `<Placeholder>` — de pagina die het verschil moet laten zien, laat het niet zien.
- [ ] Validatie bij het uploaden: te klein, te donker, te veel compressie — meteen zeggen in plaats van na levering
  — *Deels, nagekeken 23 augustus:* de server weigert een verkeerd type, een leeg bestand, meer dan 25 MB en een onbekende opnamesoort, en de klant krijgt daar per bestand een nette melding op. Maar van de drie dingen die dit punt noemt is er núl gebouwd: **te klein** (geen pixelcontrole, geen ondergrens), **te donker** (`luminance()` bestaat maar wordt alleen op gekozen achtergrondkleuren gebruikt) en **te veel compressie** (nergens).
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

- [ ] FAQPage-structured-data voor `/catalog`, `/lifestyle` en `/video` — er staan nu twintig vragen op die Google niet als FAQ ziet
  — *Open, nagekeken 23 augustus:* FAQPage staat op /faq en /pricing in beide talen (`src/data/schema.js:28`). De drie servicepagina's hebben samen twintig `<summary>`-vragen zonder FAQ-markering — de twintig uit dit punt, exact.
- [x] ~~`DESIGN.md` bijwerken: die documenteert nog het blauwe `#90BEFF`-accent en de oude pastelvlakken als geldend~~ — `DESIGN.md:50` noemt `--accent | #C6F100`, en de noot bovenaan legt de regel vast dat een vervangen palet verwijderd wordt in plaats van blijft staan.
- [x] ~~D1-aanroepen zonder guard die een 500 geven in plaats van een nette foutmelding~~ — elke ingang controleert de binding vóór de eerste query en geeft een nette foutmelding: `src/lib/admin.js:113`, `src/lib/account.js:1129` en `:2196`, `src/lib/portal.js:323`, `functions/api/order-status.js:128`, `functions/api/step.js:97`.
- [x] ~~Het woord "drop" staat nog in klantteksten op ongeveer vijf pagina's terwijl het intern is afgeschaft~~ — het zelfstandig naamwoord is uit de klantteksten; wat er nog staat is het werkwoord (“you drop a folder”) en een klassenaam. Als wire-waarde leeft `drop` nog in `src/data/pricing.js:348`, en daar hoort hij.
- [x] ~~De AI Act-pagina spreekt in zijn hero zijn eigen §6 tegen~~ — §6 is herschreven en zegt nu hetzelfde als de hero (`AiActPage.astro:181` en `:268`); `tests/promises.test.mjs:351` houdt de oude tekst tegen.
- [ ] 🟡 Prijs van het merkmodel (€1.250) staat nog niet vast
  — *Niet uit code vast te stellen:* een prijsbesluit.
- [ ] Beslissen wat er met `orders@visuails.com` gebeurt: echte gebruiker aanmaken, of mail versturen vanaf `hello@` en die profielfoto meteen goed hebben
  — *Open, nagekeken 23 augustus:* nog geen besluit: `FROM_EMAIL` is nog `VISUAILS <orders@visuails.com>` (`src/lib/mail.js:57`, `wrangler.toml:56`) met `reply_to` op `hello@`.
- [ ] Interne meldingsmail (die jij krijgt bij een bestelling) ook in het nieuwe briefhoofd, als je dat wilt
  — *Open, nagekeken 23 augustus:* en anders dan ik eerst dacht: de bestelmelding is nog kále HTML — `notifyEmail()` (`functions/api/order.js:2523`) gebruikt geen `shell()`. De látere studiomails hebben het briefhoofd wél (`src/lib/notify.js:84`, `src/lib/feedback.js:542`). De checklist- en contactmeldingen op `order.js:467` en `:484` zijn ook kaal.
- [ ] Back-up van D1 en R2 regelen — er is er nu geen
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
