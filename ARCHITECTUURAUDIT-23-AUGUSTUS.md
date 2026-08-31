# Architectuuraudit — VISUAILS

<!-- namen-bijgewerkt -->
> **Namen bijgewerkt, 30 augustus 2026.** Dit document noemt een bestand dat inmiddels anders heet of niet meer bestaat. De tekst eronder is niet herschreven — een deel van die namen staat in geciteerde foutmeldingen en bouwuitvoer, en die aanpassen zou het bewijs vervalsen in plaats van bijwerken. Wat ze vandaag zijn:
>
> - `functions/admin/debug-mollie.js` → `/admin/diagnose` in de padtabel van `src/lib/admin.js` — op 23 augustus 2026 verplaatst, juist omdat een statisch routebestand onder functions/admin/ de centrale originIsSelf()-controle omzeilde


**23 augustus 2026 · read-only · er is niets gewijzigd**

Onderzocht: `visuails-astro` (Astro 6.4.8, `output: 'static'`, Cloudflare Pages),
`functions/**` (13 Pages Functions), `src/lib/**` (29 modules), `cron/**` (aparte
Worker), `migrations/` (32 bestanden), `public/**` en de gebouwde `dist/` (93
pagina's). Vier parallelle sporen, elk met eigen metingen; deze samenvatting is
mijn synthese, met alle bestandsverwijzingen erbij.

**Kort vooraf.** De codebase is in aanzienlijk betere staat dan de omvang doet
vermoeden. EN/NL staat volledig in pariteit, er zijn geen SQL-injecties, geen
secrets in de repo, nul externe scripts in de build, en de prijsladder wordt op
drie plaatsen door assertions bewaakt. De echte bevindingen zitten niet in wat er
staat maar in wat er *ontbreekt*: één migratie, één webhook-vangnet, één
btw-controle en één nachtelijke taak.

Vier dingen zou ik met voorrang oppakken. Ze staan hieronder als 1, 2, 3 en 4
onder de betreffende punten, en ze zijn samengevat aan het eind.

---

## 1 · Design tokens

`src/styles/global.css` telt 4863 regels met **drie** `:root`-blokken: het
hoofdblok (regels 26–680, 111 tokens), plus twee losse — `--bg-seam` op 1557 en
`--gap-actions` op 2131.

**Wat de generator leest.** `scripts/make-styleguide.mjs:15` matcht met een
non-greedy regex op het eerste `:root`-blok. Daarmee vallen de twee losse tokens
er buiten. Van de 111 gelezen tokens staan er 39 in een gecureerde groep; de
overige 72 komen alleen in de ruwe dumptabel. Volledig onzichtbaar als
ontwerpbeslissing zijn alle spacing-tokens, alle z-index-tokens en `--t-statement`
— juist de tokens die met de langste motivering zijn ingevoerd. Ook de vier
scopes die een compleet schaduwpalet declareren (`.on-ink` 713–787, `.on-bright`
1421–1464, `.lime-plate` 4768–4783, `.plaat-vol.lime-plate`) komen er niet in.

Belangrijker: **de uitvoer loopt achter**. `visuails-styleguide.html` is van 7
augustus met 100 tokens, `global.css` staat op 111. De belofte in de kop van de
generator ("er staat niets in dat met de hand is overgetypt, dus hij kan niet uit
de pas lopen") klopt alleen als iemand `npm run styleguide` draait.
*Risico: midden.*

**Wat er langs de tokens heen gaat.** Buiten `:root` en buiten commentaar staan
219 echte kleurdeclaraties met een literaal, 786 `font-size`-declaraties zonder
token (80 verschillende waarden), 1757 spacing-declaraties (465 verschillende
waarden) en 51 ruwe `z-index`-waarden tegenover 7 die het token gebruiken.

Dat laatste getal is het scherpst: de schaal op `global.css:675` heet expliciet
"semantic scale, never arbitrary" en wordt in 88 procent van de gevallen omzeild.
Eén concreet gevolg: `src/components/Note.astro:186` zet `z-index: 60` op de
zwevende notitie, onder `--z-sticky` (200), dus de plakkende kop dekt hem af.

Er is bovendien **geen spacing-schaal**: `--pad-x`, twee kop-gaps en drie
containerbreedtes zijn alles. 465 verschillende waarden voor marge, vulling en
gap is daarvan het rechtstreekse gevolg, niet van slordigheid.
*Risico: hoog, maar het is opruimwerk zonder functioneel risico.*

**De accentfamilie.** `#C6F100` staat 17× in de repo, waarvan 1× in `:root`. De
16 daarbuiten zijn op één na allemaal gedocumenteerd en noodzakelijk: `.lime-plate`
en `.plaat-vol.lime-plate` zetten `--accent` zelf om, dus `background: var(--accent)`
zou daar zijn eigen omkering lezen — dat staat als waarschuwing in het bestand en
is bij het bouwen van `.plaat-vol` vandaag nog een keer misgegaan.

Wat wel echte drift is: **er is geen kanaaltoken voor het accent.** Voor donkere
sluiers bestaat `--scrim: 8 9 11` (`global.css:263`) precies omdat een
gradiëntstop geen token met eigen alpha aankan. Voor het accent is dat nooit
gedaan, dus staat `rgb(198 241 0 / …)` **22 keer** met de hand getypt — onder meer
`src/layouts/Layout.astro:1811–1813`, `global.css:1664–1671, 3941, 4121, 4178–4191`,
`src/components/FigDash.astro:582`, en in alle drie de dashboard-stylesheets
(`public/account.css:240`, `public/admin.css:208`, `public/portal.css:212`).
Verschuift het accent, dan blijven die 22 op het oude groen staan. `--scrim` zelf
wordt trouwens ook voor 37 procent omzeild: 79 keer via het token, 47 keer als
`rgb(8 9 11 / …)`. *Risico: hoog — dit is precies het patroon dat de vorige
paletwissel een blauw-violette gloed onder een limoenen site opleverde.*

**Drie waarschuwingskleuren voor één betekenis.** `--warn-ink` is `#E9963B`. Maar
`#C9A227` staat 12× hardgecodeerd in `FigBoard.astro`, `FigGate.astro` en
`FigGallery.astro` (als `var(--warn-ink, #C9A227)` — een fallback die stilzwijgend
een tweede waarde documenteert), en `#E0A33A` staat 8× puur als literaal in
`FigWalk.astro:536,542` en `FigFlow.astro:784,806`. Geen van de twintig heeft een
comment. `global.css:284` schafte "ONE ATTENTION COLOUR" juist af. *Risico: hoog.*

---

## 2 · Resten van eerdere designsystemen

**Dode custom properties: 28 declaratiesites, 10 verschillende namen, waarvan 26
zonder enige uitleg.** In `global.css` zijn het er vier: `--radius` (228, mét een
comment die beweert "components still read this" — geen enkele component leest
hem), `--clay-text` (301), en `--chrome`/`--chrome-filter` (594, 613 — die twee
zijn wél bewust bewaard en gedocumenteerd).

De andere 24 zitten in `public/portal.css`, `public/account.css` en
`public/admin.css`: elk bestand declareert dezelfde acht dode namen
(`--mist-teal --mist-slate --teal-grad --teal-deep --clay-text --surface-3
--accent-2 --radius`). Dit is de scherpste vondst van dit punt, omdat
`global.css:272–279` letterlijk uitlegt dat die namen uit `:root` zijn gehaald
"omdat de drie losse sheets hun eigen kopie declareren". Die kopieën zijn even
dood. *Risico: midden.*

**Dode klassen: 85 van de 316 in `global.css`, 27 procent.** Gemeten tegen alle
84 gebouwde pagina's in `dist/`, alle `class`-attributen in `src/`, en alle
`className`/`classList`/`querySelector` in de scripts. De grootste samenhangende
blokken:

Het "editorial air"-blok uit v3.1 (`global.css:3435–3510`) is met 20 klassen de
grootste. Wat opvalt is het patroon: de comments zeggen per stuk dat `.sp-item`,
`.pr-step`, `.pr-num` en `.dev-steps` weg zijn — en de broertjes die naast die
verwijderde klassen stonden zijn even dood, maar bleven staan. Elke opruimronde
heeft de helft laten liggen. *Risico: hoog voor de leesbaarheid van het bestand,
nul voor de site.*

Verder: zeven van de acht OPP-vierkleurklassen (`.tile-c-violet/-pink/-coral`,
`.w-blue/-violet/-pink/-coral`), met zo'n 45 regels commentaar met
contrastmetingen van kleuren die niet meer bestaan. De hele `.hero-cover`-familie
(vijf klassen, plus een `:has()`-arm in `Layout.astro:1235`) staat op nul
pagina's. De `.ts-*`-uploadercontainers (vijf klassen, ~60 regels CSS en ~200
regels JS in `interactions.js:582–611`) horen bij een uploader die
`/test-sample` niet meer rendert. En `.mist-*` plus `.well-raise` staan er nog
met de motivering "de klassen blijven staan in plaats van uit zestig
markupbestanden verwijderd te worden" — ze staan in nul bestanden.

**Twee scoped `<style>`-blokken stylen niets**: `src/pages/test-sample.astro:219–230`
en `src/pages/nl/test-sample.astro:222–233`, inclusief het OKLCH-verloop.

**Verouderde documentatie in het tokenblok** — vijf plekken die de lezer actief
misleiden: `global.css:1445` en `2388` en `public/portal.css:207` noemen `#90BEFF`
en "10.43:1" als het huidige accent (werkelijk: `#C6F100`, 15,16:1), en de
bestandskop `global.css:12–24` presenteert Bodoni Moda italic als de actieve
redactionele letter terwijl regel 375–380 zegt dat die eruit is. *Risico: midden
— dit is documentatie die iemand op het verkeerde been zet.*

`Instrument Serif` is volledig verdwenen; de OPP-pastels staan alleen nog in
commentaar. Die twee opruimingen zijn wél afgemaakt.

---

## 3 · Routestructuur EN/NL

**Dit punt is schoon.** `src/pages/**` heeft 38 EN- en 38 NL-pagina's; de `diff`
van de relatieve paden is leeg. Alle 11 dynamische paden per taal komen uit
dezelfde gedeelde array (`src/pages/catalog/[slug].astro:17` naast
`src/pages/nl/catalog/[slug].astro:14`, idem voor lifestyle en video), dus daar
kán geen drift ontstaan.

Van de 38 paren gebruikt **geen enkel paar** een component aan de ene kant en
handgeschreven markup aan de andere. Sitemap (88 URL's, 44+44), hreflang (93 van
93 pagina's dragen alle drie de varianten, 0 wijzen naar een niet-gebouwde URL)
en de taalwisselaar (0 kapotte doelen) zijn alle drie in overeenstemming met de
werkelijke boom.

Eén asymmetrie: `dist/nl/404/index.html` bestaat, `dist/404/index.html` niet
(alleen `dist/404.html`), terwijl `Layout.astro:189` en `:191` `hreflang="en"` en
`x-default` naar `/404/` schrijven. Beide 404's staan op `noindex`, dus er is geen
indexeringsschade. *Risico: laag.*

Wat wel aandacht verdient: **18 van de 46 routeparen dragen aan beide kanten
handgeschreven markup** zonder gedeelde component — `terms`, `gallery`,
`test-sample`, `privacy`, `contact`, `upload-guidelines`, de drie `start/`-pagina's
en de rest. Ze zijn nu in pariteit, maar elke inhoudelijke wijziging moet twee
keer en niets dwingt dat af. *Risico: midden — geen defect, wel de plek waar het
volgende defect ontstaat.*

---

## 4 · Dubbele componenten

**De drie dienstpagina's zijn één sjabloon, drie keer.** `CatalogPage.astro`,
`LifestylePage.astro` en `VideoPage.astro` delen 41 klassen; de
tag-skeletgelijkenis is 64 tot 72 procent en de klassenoverlap tussen Catalog en
Lifestyle is 78 procent. Ze importeren exact dezelfde set. Het echte verschil is
de stijldataset en een handvol `cat-`/`ls-`/`vid-`-klassen. Eén
`ServicePage.astro` met een `kind`-prop zou hier ongeveer 110 kB bijna-kopie
opruimen. *Risico: midden.*

**Eén blok is bytegelijk gedupliceerd.** De prijsstaffeltabel staat twee keer:
`CatalogPage.astro:407–423` en `LifestylePage.astro:417–433` (markup 17 regels
identiek), met bijbehorende CSS op `:638–659` en `:647–668` (22 regels identiek).
De klassen `.rungs .rungs-h .rung-table .rungs-note` staan in nul regels van
`global.css` — ze zijn per component gedupliceerd. *Risico: laag, prioriteit
hoog: dit is een bewezen driftbron en de reparatie is een component van 20
regels.*

**`ModelsPage` is een deelverzameling van `BrandModelPage`** — 91 procent
skeletgelijkenis; 34 van ModelsPage's 44 klassen komen uit BrandModelPage,
inclusief het `bm-`-voorvoegsel. Het rosterraster is een letterlijke kopie
(`ModelsPage.astro:160–183` tegen `BrandModelPage.astro:667–689`: zelfde zes
klassen, zelfde nesting, zelfde pijl-SVG). De drie verschillen zijn props.
*Risico: laag, prioriteit hoog.*

**`StudioPage` en `PortalPage` zijn met een voorvoegsel hernoemde broers** — 72
procent skeletgelijkenis. Elk definieert zijn eigen kopie van dezelfde zeven
rollen (`sp-hero/pp-hero`, `sp-h2/pp-h2`, `sp-lede/pp-lede`, `sp-defs/pp-defs`, …).
Vijf van de acht declaraties zijn bytegelijk op het voorvoegsel na. **Drie zijn
al uit elkaar gelopen** — `.sp-note` heeft `margin: 1.2rem` en `font-size: .9rem`,
`.pp-note` `1.6rem` en `.875rem`; `.sp-defs` heeft `gap: 1.1rem`, `.pp-defs`
`1rem`. Precies de faalmodus die duplicatie uitlokt. *Risico: laag.*

**Hero-varianten: vijf benoemd, één dood.** `.page-hero` (39 aanroepen) is de
canonieke; `.hero-editorial`, `.hv-hero`, `.sp-hero` en `.pp-hero` zijn alle vier
in gebruik. `.hero-cover` staat in **geen enkele markup** — alleen als CSS-regel
en als arm in `body:has(.hero-cover, .hero-editorial, .hv-hero)` in
`Layout.astro:1235`. Zijn kinderen `.hc2-bg` en `.hc2-scrim` hebben nul gebruikers.

**De `Fig*`-familie heeft géén tekening-duplicaat**: de hoogste paarsgewijze
klassenoverlap is 25 procent. Wat er wel is, is een opvolgketen die de
bestanden zelf documenteren: vijf figuren → `FigFlow` (leefde ongeveer een dag) →
`FigWalk`. De zes bovenstroomse figuren zijn nu allemaal onbereikbaar — zie punt 5.

`PricingPage` / `PlansPage` / `ComparePage` zijn gecontroleerd en **geen**
duplicaten: de splitsing is beargumenteerd in de bestanden zelf en `PricingPage`
rendert helemaal geen abonnementskaarten.

---

## 5 · Ongebruikte bestanden

Methode: een importgraaf over elke aangehaalde relatieve specifier (ook
`await import()` en `<script src>`) met `src/pages/**`, `functions/**`,
`tests/**`, `cron/**`, de root-`.mjs` en `astro.config.mjs` als wortels, daarna
per kandidaat een tekstuele controle om "alleen in een comment genoemd" te
scheiden van "echt geïmporteerd".

**In `src/`: 8 wezen, 93,4 kB.** Zes `Fig*`-componenten (`FigFlow.astro` 41 kB,
`FigApproval` 7,9 kB, `FigFanOut` 7,4 kB, `FigPipeline` 6,3 kB, `FigCapacity`
5,1 kB, `FigFormats` 4,8 kB), plus `src/scripts/flow.js` (9,3 kB, het gedragsbestand
van FigFlow) en `src/scripts/shader-hero.js` (12,0 kB, waarvan `Layout.astro:1156`
en `global.css:3540` allebei vastleggen dat het op 7 augustus is losgekoppeld).
`HowItWorksPage.astro` noemt alle zes de figuren — maar alleen in zijn
kopcommentaar. Geen van de acht wordt gebundeld, dus dit is dode broncode en geen
paginagewicht. *Risico: laag, prioriteit hoog: dit zijn precies de bestanden die
iemand per ongeluk opnieuw importeert.*

Geen wezen in `src/layouts/`, `src/lib/`, `src/data/` of `src/i18n/`. Let op dat
`src/lib/adminAuth.js`, `close.js` en een paar andere er voor een naïeve grep
verweesd uitzien maar via een relatief pad worden geïmporteerd.

**In `functions/`: één zelfverklaard tijdelijk bestand.**
`functions/admin/debug-mollie.js` opent op regel 1 met *"TEMPORARY DIAGNOSTIC —
delete this file once the empty 400 is understood."* Zie punt 6 voor waarom dit
meer is dan opruimwerk.

**In `public/`: geen verweesde CSS of JS.** Wel één opmerking: `public/feedback.css`
staat niet in `public/_headers` terwijl de andere drie dashboard-stylesheets er
wel in staan — waarschijnlijk een gat in de cache-headers, geen ongebruikt
bestand.

**In de root: 117 verweesde `.mjs`-probes, 203 kB.** Er staan 134 `.mjs` in de
root; 13 hangen aan een `package.json`-script, `shotlib.mjs` wordt door drie
andere geïmporteerd, en `logo.mjs`/`wandel.mjs` worden alleen in `.md`-rapporten
genoemd. De rest zijn wegwerpprobes in herkenbare families (`probe2`–`probe5`,
`wmtest`–`wmtest5`, `sec1`/`1b`/`1c`/`1d`, `krap`/`krap2`, `cap`/`cap390`/`capEN`).
Drie ervan zijn van vandaag en horen bij het naadwerk: `naad-in-venster.mjs`,
`vlak-per-sectie.mjs` en `naden-wortel.mjs`. Afgezien van die zes zijn 111
bestanden veilig te verwijderen. *Risico: laag, prioriteit midden — het is ruis,
geen gewicht.*

**Buiten de broncode**: `dist-verify/` is 20 MB en bevroren op 2 augustus, en staat
niet in `.gitignore`. Verder ~3,6 MB aan losse PNG's en ZIP's in de root, `.tekst/`
(1,1 MB gedumpte tekst), `.kijk/` (2,4 MB schermafdrukken) en `.werk/*.js` (42 kB
codeconcepten zonder enige inkomende referentie — controleer eerst of ze in
`src/lib/account.js` zijn opgegaan). Ook de vier `MIGRATIE-*-PLAKKEN.sql` in de
root zijn achterhaald door `migrations/0019`–`0022`.

---

## 6 · Consistentie backend

**Geen SQL-injectie. Dit is uitputtend gecontroleerd** en het is de belangrijkste
uitkomst van dit punt. Elke template literal met een SQL-sleutelwoord én een
interpolatie is geclassificeerd; alle interpolaties zijn er één van vier veilige
soorten: een tabelnaam uit een literale whitelist (`admin.js:935, 1088–1094`), een
gegenereerde `?N`-lijst (`admin.js:934, 4809`, `order.js:939`, `cron:714`), een
literale kolomstring (`admin.js:1304`, `account.js:2842, 3444`), of een
modulconstante (`retention.js:65, 68`, `cron:66`). Geen `.exec()` met een
variabele, geen samengestelde `WHERE`. Ids gaan overal eerst door
`Number.isInteger` (`admin.js:4803`, `account.js:3053`).

**Er is geen gedeelde query-helper.** Elke module roept `env.DB.prepare(…).bind(…)`
rechtstreeks aan: `admin.js` 151×, `account.js` 64×, `invoice.js` 28×, `order.js`
23×, `mollie.js` 22×, `cron/index.js` 21×. Dat is consistent volgehouden, en er
zijn drie eigen conventies die vrijwel overal worden gevolgd: de
pre-migratie-terugval (`try { brede query } catch { if (!/no such column/) throw;
smalle query }`), `stil()`/`safe()`/`later()` voor fire-and-forget, en
`env.DB.batch([...])` voor atomaire meervoudige schrijfacties (26 plekken). Geen
ontbrekende `await` gevonden.

**De routevorm kent twee families.** `/account`, `/admin` en `/o` zijn dunne
re-exports van vier regels naar een dikke dispatcher in `src/lib/`, elk met een
eigen regex-padtabel — die familie is intern consistent en is het goede patroon.
De `/api/*`-handlers zijn zelfstandig en hebben elk hun eigen volgorde van
guards en hun eigen foutenvelop: drie onderling onverenigbare faalfilosofieën
(503 met machineleesbare reden in `capacity.js:81`, stil 204 in `step.js:93`,
gegooid naar 500 in `mollie.js:250`). Elk is op zichzelf beargumenteerd; er is
geen geschreven regel wanneer je welke kiest. *Risico: laag.*

Verder zes gedupliceerde `json()`-helpers met drie verschillende signaturen
(`order-status.js:153`, `capacity.js:194`, `order.js:2288`, `upload.js:223`,
`debug-mollie.js:327`, `account.js:7181`) en `originIsSelf()` twee keer
(`admin.js:4871`, `account.js:3965`).

**Authenticatie is consistent en op de belangrijkste plek gecentraliseerd.**
`/admin` gebruikt PBKDF2-100k plus een 256-bits sessie waarvan alleen de
SHA-256-hash in D1 staat, en **elke** POST loopt langs één `originIsSelf()`-controle
vóór de hele routetabel (`admin.js:204–215`) — daar kan geen route langs.
`/account` doet hetzelfde voor POST (`:1305`), maar de GET-authenticatie zit per
route inline. `/o` gebruikt een bearer-token in het pad met TTL van 90 dagen en
rate limiting op beide werkwoorden; geen cookie, dus terecht geen CSRF-token.

**Vier bevindingen op dit punt, in volgorde van belang.**

**(1) De Stripe-webhook slikt een echte schrijffout in als "dubbele levering".**
`functions/api/webhook/stripe.js:101–104` vangt *elke* fout uit de
`payments`-INSERT, logt "duplicate delivery", keert terug, en de handler antwoordt
daarna **200**. Stripe stopt dan met opnieuw proberen. Een tijdelijke D1-hapering,
een ontbrekende kolom of een NOT NULL-fout betekent dus: de klant heeft betaald,
`orders.payment_status` wordt nooit gezet, `order_events` wordt nooit geschreven,
permanent. **Dit is exact de bug die aan de Mollie-kant al is gevonden en
gerepareerd** — `functions/api/webhook/mollie.js:729–756` onderscheidt nu met
`/unique/i.test(text) && /constraint/i.test(text)` en gooit anders door. Stripe
heeft die reparatie nooit gekregen. Het gaat niet om dubbel afschrijven maar om
het stil en blijvend níet vastleggen van een echte betaling. *Risico: hoog.*

**(2) `migrations/0024-sample-payer.sql` bestaat niet.** De map loopt 0001–0023 en
dan 0025–0032. `schema.sql:913–925` documenteert 0024 en definieert
`orders.payer_hash`, `orders.payer_kind` en `idx_orders_payer` — maar alleen voor
een *verse* database. `scripts/migrate.mjs:263` loopt `migrations/*.sql`
alfabetisch af en heeft **geen register van toegepaste migraties**; hij beslist op
schema-introspectie. Een bestaande productiedatabase krijgt die twee kolommen dus
nooit. De consument, `functions/api/webhook/mollie.js:858`, schrijft ze binnen een
`try/catch` die alleen `console.error`t, en de dubbele-proefvisualcontrole op
`:870–877` heeft zijn eigen slikkende catch. Netto: **de "één proefvisual per
betaler"-controle staat stil uit** op elke database die gemigreerd is in plaats
van opnieuw opgebouwd, en niets meldt dat. *Risico: hoog.*

**(3) Migraties worden in de praktijk met de hand toegepast.** Vier
plak-in-de-console-bestanden staan in de root, inclusief het destructieve
`HERSTEL-TESTFACTUREN.sql` (`DELETE FROM invoices`). `MIGRATIE-0019-0021-PLAKKEN.sql:7`
legt uit waarom (`npm run migrate` loopt tegen Cloudflare-fout 7403), en `:20–26`
waarschuwt dat één `ALTER TABLE` precies één keer mag draaien. Er is nergens
vastgelegd welke daarvan werkelijk tegen productie zijn gedraaid. *Risico:
midden.*

**(4) `functions/admin/debug-mollie.js` maakt twee echte Mollie-betalingen aan op
een GET, zonder origin-controle.** Regels 144 en 159 POSTen naar
`api.mollie.com/v2/payments` bij elk verzoek. `hasAdminSession()` wordt gecontroleerd,
maar het cookie is `SameSite=Lax` — dat wordt bij een top-level navigatie *wel*
meegestuurd — dus elke link naar `https://visuails.com/admin/debug-mollie` die
wordt aangeklikt vuurt twee betalingsaanmaken af. Met een `live_`-sleutel zijn dat
echte records in het Mollie-dashboard. Het bestand omzeilt `originIsSelf()` omdat
het een *statisch* routebestand is dat wint van `functions/admin/[[path]].js` —
wat het bestand zelf op `:18–20` erkent. *Risico: midden.*

**Idempotentie van de Mollie-webhook is wél degelijk.** Verificatie-eerst (nooit
de POST-body vertrouwen, altijd opnieuw ophalen bij Mollie, `:154–170`), een
terminal-status-poort op `:189`, en idempotentie als databasebeperking in plaats
van als vlag: `UNIQUE(provider, external_id)` voor betalingen en
`ON CONFLICT … DO NOTHING` voor abonnementen. Alles vóór de poort is idempotent
van constructie — `recordRefundOnPayment` is een toewijzing achter `?1 > refunded_cents`,
geen optelling, en `issueCreditNote` geeft alleen de resterende ruimte uit.

Ten slotte één inhoudelijke bevinding die geen architectuur is maar wel hier
hoort: **de wachtrij van het abonnement start nooit iets.**
`src/lib/account.js:5732` vertelt de betalende abonnee in beide talen dat de
bovenste N op een vaste dag automatisch starten. `queueTake()` en
`queueLinkOrder()` bestaan (`src/lib/subscription.js:439–461`) maar worden buiten
`tests/subscription.test.mjs` **nergens** aangeroepen. `cron/index.js` raakt
`plan_queue` één keer aan, op `:1051`, om te tellen en een herinneringsmail te
sturen. Er is geen `INSERT INTO orders` in `cron/**`. De belofte in
`mollie.js:263–265` beschrijft code die nooit geschreven is. *Risico: hoog.*

---

## 7 · Single source of truth

De frontend is hier goed op orde: alle 46 paginabestanden importeren
`src/data/pricing.js`, `src/data/faq.js:68` haalt zijn getallen daar op,
`src/data/schema.js:298, 358–394` leidt elke JSON-LD-prijs uit `LADDER` af, en de
metabeschrijvingen bevatten geen bedragen. De ladder wordt op drie manieren
bewaakt: `assertExtraLadder()` (`pricing.js:689`), `assertLadder()` (`:1355`) en
`assertQuoteMatches()` (`src/lib/quote.js:382`).

**De lekken zitten er omheen.**

**Het btw-tarief staat vier keer, en de enige bewaakte kopie is niet degene die
geld rekent.** Canoniek is `src/data/pricing.js:396` (`VAT_RATE = 0.21`), gebruikt
voor de sitecopy. Maar het tarief dat werkelijk in rekening wordt gebracht staat
op `src/lib/quote.js:62` en wordt van daaruit doorgegeven aan `invoice.js:35`,
`account.js:132` en `subscription.js:52`. Daarnaast `src/data/vat.js:204` en `:216`
(literaal `rate: 0.21`) en `src/lib/admin.js:5356, 5454, 5458`
(`Math.round(net * 0.21)`).

`quote.js:57–60` stelt dat de kopie "bij het bouwen tegen pricing.js wordt
gecontroleerd door `assertQuoteMatches()`". **Dat gebeurt niet.** Die functie
(`quote.js:382–431`) loopt diensten × ladderstappen af en controleert `netCents`
plus de wire-aliassen; de string `VAT_RATE` komt er niet in voor. `pricing.js:396`
op 0.19 zetten laat de kassa dus 21 procent rekenen met alle tests groen.
Daarnaast staat "21%" acht keer als losse tekst (`vat.js:248, 338, 344`,
`order.js:2415, 2672, 2673`, `admin.js:5390, 5462`) in plaats van via
`vatLabel('rate')`. *Risico: hoog.*

**Het capaciteitsplafond en de vensterdrempel.** Canoniek in
`src/data/capacity.js:45–87` en `pricing.js:281` (`WINDOW_THRESHOLD = 10`). Maar
`pricing.js:285` heeft een tweede literaal in hetzelfde bestand (nodig omdat de
`TIERS`-templatestrings vóór de export evalueren), en `functions/api/order.js:2259`
heeft een derde plus zijn eigen `tierForProducts()`. Die derde is waardegepind
door `tests/planning.test.mjs:112–113`, dus drift wordt gemeld — maar een
legitieme wijziging naar 12 betekent vier bestanden en twee tests. Erger is een
**gedragsverschil dat door geen enkele test wordt gedekt**: bij `service === null`
geeft `pricing.js:313` `'attended'` en `order.js:2279` `'unattended'`. De
motivering op `order.js:2253–2258` ("niet importeren, dat is veel module voor één
vergelijking") wordt bovendien weersproken door `order.js:55`, dat al vijf dingen
uit datzelfde bestand importeert. *Risico: midden.*

**Bewaartermijnen: twee vangrails die elkaar tegenspreken.** `terms.astro` en de
verwerkersovereenkomst importeren de constanten netjes uit
`src/lib/retention.js`. `privacy.astro:139–141, 169`, `cookie-policy.astro:30–34`,
hun NL-tegenhangers en `PortalPage.astro:60, 126` typen ze met de hand.
`tests/legal.test.mjs:283` eist dat `terms.astro` géén getypte "90 dagen" bevat;
`tests/promises.test.mjs:154–157` eist dat dezelfde bestanden die tekst **wél**
bevatten. Dat gaat vandaag alleen goed omdat het getal in een kopcommentaar
overleeft (`terms.astro:29`). Zet `UPLOAD_DAYS` op 60 en `promises.test.mjs` valt
om op een bestand dat juist correct geparametriseerd is. En `legal.test.mjs` bouwt
wel een `PRIV`-variabele maar draait de controle nooit tegen de privacypagina's —
precies waar de literalen staan. *Risico: midden.*

**De €1 van de proefvisual en het mandaat** staan hardgecodeerd in
`src/lib/subscribe.js:84`, `PlansPage.astro:112, 160` en zes keer in
`order/PlanPicker.astro`, terwijl `AMOUNT.testSample` bestaat en door
`debug-mollie.js:145` wél correct wordt gelezen. *Risico: laag.*

**Waar de bestaande vangrails reiken.** `audit-feiten.mjs:14–24` controleert KVK,
btw-nummer, e-mail, telefoon, IBAN en doorlooptijdzinnen — **geen prijzen, geen
ladder, geen btw-percentage, geen capaciteit** — en eindigt bovendien nooit met
`process.exit(1)`, dus hij kan geen build laten falen. `audit-paar.mjs:43–58`
vergelijkt elk `€ n` in een EN-pagina met zijn NL-tweeling en vangt dus een prijs
die in één taal is bijgewerkt — maar alleen de twee talen ten opzichte van elkaar,
alleen in `dist/**/*.html` (dus niets in `src/lib/`, `cron/`, mailteksten of de
server-gerenderde `/account`- en `/admin`-pagina's), en ook hij is report-only.

---

## 8 · Secrets

**Geen enkele echte credential in de repo.** Uitputtend gezocht op `re_…`,
`live_…`, `sk_live_…`, `sk_test_…`, `whsec_…`, `AIza…`, PEM-blokken en het
generieke patroon `key|secret|token|password = "<16+ tekens>"` over `src/`,
`functions/`, `cron/`, `scripts/`, `tests/`, `public/`, `dist/`, de root-`.mjs`,
`.toml`, `.md` en `.sql`. Er is geen `.env` en geen `.dev.vars`; `backups/` is
leeg; beide ZIP's bevatten geen sleutels.

**Wat er wél op een sleutel lijkt en het niet is** — expliciet vrijgegeven, zodat
niemand hier onnodig van schrikt: `test_dHar4XY7LxsDOtmnkVtjNVWXLSlXsM` in
`tests/account-pay.test.mjs:106` en `tests/mollie-webhook.test.mjs:122` is Mollie's
eigen voorbeeldsleutel uit hun documentatie; `test_neppesleutelvoordetest0123456789`
(`tests/subscribe.test.mjs:84`) zegt het zelf; `test_abcdefghijklmnopqrstuvwxyz0123`
is het alfabet; en `test_0000…` in `debug-mollie.js:137` is een opzettelijk foute
sleutel voor de transportproef. Het `database_id` in `wrangler.toml:47` is geen
secret — zonder geauthenticeerd CF-token is het nutteloos, en het hoort daar te
staan.

**Geen enkel secret heeft een hardgecodeerde terugval.** Alle lezingen zijn kaal
`env.X` met een guard: `mail.js:29` keert stil terug zonder `RESEND_API_KEY`,
`stripe.js:40` gooit, en de webhooks en `cron/index.js:338, 1094, 1142` slaan over.
`ALLOWED_ORIGIN_HOSTS` (`account.js:4006`) en `PURGE_ENABLED` (`cron:449`) falen
allebei **dicht**, wat de goede richting is.

Twee dingen die geen lek zijn maar wel aandacht verdienen.
`functions/api/order.js:777` heeft `env.VISUAILS_VAT || 'NL005407575B96'` — een
echt btw-nummer als stille terugval. Als de variabele ooit verkeerd staat, of als
het nummer verandert, blijven facturen zonder enige foutmelding het oude nummer
dragen. Ik zou daar liever gooien dan terugvallen. En: `mail.js:66` gooit bij een
niet-2xx van Resend, maar elke aanroeper wikkelt dat in `safe()`
(`order.js:2243`), dus een *verkeerde* (niet ontbrekende) `RESEND_API_KEY`
betekent dat orderbevestigingen, facturen en inloglinks stil nooit aankomen —
alleen een `console.error` in de Workers-logs markeert het. *Risico: midden voor
beide.*

**Niets gevoeligs bereikt de browser.** `public/` bevat geen enkele `.js`; `dist/`
grep op alle sleutelvormen en op alle env-namen geeft nul treffers. De enige
env-waarde die de browser bereikt is `PUBLIC_CF_ANALYTICS_TOKEN`, en die is in de
huidige build leeg.

---

## 9 · Dependencies

**Eén ongebruikte package**: `@fontsource/archivo` (`package.json:108`), verdrongen
door `@fontsource-variable/archivo` en nergens geïmporteerd. *Risico: laag.*

Alle andere twaalf zijn in gebruik. `gsap` alleen op twee pagina's
(`src/pages/gallery.astro:200` en de NL-tweeling), `lenis` op alle pagina's,
`pdf-lib` in de Worker, `parse5` als **build-vangrail** (`astro.config.mjs:57` →
`scripts/brand-lockup-guard.mjs:26`), `playwright`/`pngjs`/`sharp` voor de
meetgereedschappen.

**`npm audit`: 5 kwetsbaarheden, 4 hoog.**

`astro` 6.4.8 draagt drie XSS-adviezen (GHSA-f48w-9m4c-m7f5, GHSA-4g3v-8h47-v7g6,
GHSA-7pw4-f3q4-r2p2); de fix is `astro@7.2.4`, een major. `sharp` 0.34.5 erft vier
libvips-CVE's (GHSA-f88m-g3jw-g9cj); fix `sharp@0.35.3`, ook een major.
`js-yaml` en `nanoid` zijn transitief en worden allebei door een gewone
`npm audit fix` opgelost, zonder major.

**Praktische blootstelling.** De drie Astro-adviezen gaan over het renderen van
door de gebruiker beheerste waarden in attributen. Deze site is `output: 'static'`
en er komt geen gebruikersinvoer in Astro's renderer — alle dynamische HTML komt
uit de handgeschreven Workers in `src/lib/`. Het werkelijke risico is daarmee laag
ondanks de classificatie "hoog". De libvips-CVE's in `sharp` tellen wél zodra
`scripts/make-avif.mjs` of `beeld-krimpen.mjs` ooit op een niet-vertrouwd beeld
wordt losgelaten. **Mijn advies: draai `npm audit fix` voor de twee transitieve
(gratis), en plan de twee majors apart in.** *Risico: hoog als etiket, midden in
de praktijk.*

Nog één: `pdf-lib@1.17.1` is sinds 2022 niet meer gepubliceerd en zit als enige
onderhoudsloze afhankelijkheid in het factuurpad. Geen advies, wel het noteren
waard.

---

## 10 · Externe scripts

**Het uitgangspunt van nul externe scripts houdt stand in de huidige build.**

Over alle 93 gebouwde pagina's: `<script src="http…">` **0**, `<link href="http…">`
**0** (de externe `<link>`-vermeldingen zijn canonical en hreflang, die niets
ophalen), `<iframe>` **0**, `fetch('http…')` **0**. Geen `@import` en geen
`url(http…)` in enige stylesheet. Geen `preconnect` of `dns-prefetch` naar derden.
**Alle twaalf lettertypen zijn zelf gehost** via `@fontsource-variable` naar
gehashte `dist/_astro/*.woff2` — geen Google Fonts, geen Typekit. Alle 370 beelden
zijn eerste partij.

Eén voorwaardelijke uitzondering, en die is netjes gebouwd:
`https://static.cloudflareinsights.com/beacon.min.js` staat als **string** in de
inline consentbundel (`src/scripts/consent.js:79`). Hij is dubbel dood in deze
build: `loadAnalytics()` keert vroeg terug zonder token, en
`PUBLIC_CF_ANALYTICS_TOKEN` is bij het bouwen leeg. Het is dus eerlijker om het
uitgangspunt te formuleren als "nul externe scripts vandaag, en precies één zodra
iemand een token in de Pages-omgeving zet".

**Maar de CSP dwingt het uitgangspunt niet af.** Alle 93 statische pagina's
krijgen `Content-Security-Policy: frame-ancestors 'none'` — en verder niets
(`public/_headers:138`). Geen `script-src`, geen `default-src`, geen `connect-src`.
De server-gerenderde pagina's zijn wél streng: `/o`, `/account` en `/admin` zetten
`default-src 'none'; img-src 'self'; style-src 'self'; …`
(`portal.js:1371`, `account.js:7167`, `admin.js:5960`).

Dat verschil is bewust en staat uitgelegd op `public/_headers:96–111`: `style-src
'self'` zou ook inline `style`-attributen blokkeren, en de build bevat er 1663
over 86 pagina's; en `'unsafe-inline'` erbij zetten zou strenger *lijken* zonder
het gat te dichten. Die redenering klopt — **maar ze geldt alleen voor
`style-src`.** Een `script-src 'self'` (met hashes of een nonce voor de vijf
`is:inline`-scripts) plus `connect-src 'self' https://static.cloudflareinsights.com`
kan er vandaag bij zonder één style-attribuut aan te raken, en maakt van het
uitgangspunt een afgedwongen feit in plaats van een afspraak. *Risico: midden.*

Wel aanwezig en goed: HSTS één jaar met subdomeinen, `X-Content-Type-Options:
nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`
met camera, microfoon, locatie, betaling en USB uit, en `X-Frame-Options: DENY`.

---

## 11 · Bundlegrootte

**Zware bibliotheken staan waar ze horen.** GSAP plus ScrollTrigger (68,4 kB ruw /
26,6 kB gzip) zit in `dist/_astro/index.xgxdCp6f.js`, dat door **nul** HTML-bestanden
rechtstreeks wordt geladen en alleen dynamisch door de twee galerij-ingangen
wordt geïmporteerd. Gecontroleerd: geen GSAP in de Layout-, ClientRouter-,
OrderFlow- of shots-brok. **Geen three.js, geen WebGL, geen shader in enige
gebouwde brok** — `gl_FragColor|createShader|WebGLRenderingContext` komt alleen
voor in `src/scripts/shader-hero.js`, dat niet wordt gebundeld.

Lenis zit wel op alle 93 pagina's, in de Layout-brok (~3 kB gzip). Het staat
runtime uit bij `prefers-reduced-motion` maar wordt door iedereen gedownload en
geparseerd. Dat is verdedigd in `src/scripts/smooth-scroll.js:1–50` als
dragend voor de `animation-timeline: view()`-onthullingen.

**De vloer van elke pagina is 61,8 kB externe JS plus 7,8 kB inline.** De
zwaarste pagina's: galerij 139,7 kB, `test-sample` en de acht OrderFlow-pagina's
ongeveer 131–133 kB, de homepage 86,9 kB.

**De grootste directe winst is een commentaarblok.**
`src/components/HomeV2.astro:2666` is een `<script is:inline data-astro-rerun>`
die **15 749 bytes** in `dist/index.html` schrijft, waarvan het grootste deel het
bewaarde Nederlandse commentaarblok is dat op `:2669` begint. Astro minificeert
`is:inline`-scripts niet en strips er geen commentaar uit. Hetzelfde patroon staat
in `order/StylePicker.astro:191` en `order/PlanPicker.astro:328`; tien pagina's
dragen het. Daarom is `dist/index.html` 177 kB met 25,1 kB inline JS, terwijl
`dist/404.html` er 7,8 kB heeft. De reparatie is het betoog naar een
`{/* … */}`-Astro-commentaar boven de tag verplaatsen (dat wordt bij het bouwen
verwijderd) en binnen het script alleen korte `//`-regels laten staan. Ongeveer
12–13 kB per pagina, zonder enig gedragsrisico — `is:inline` moet blijven vanwege
`data-astro-rerun`. *Risico: laag, prioriteit hoog omdat het gratis is.*

**Het echte paginagewicht is beeld, niet code.** `dist/img` is 32 MB van de 41 MB
totaal. Acht bestanden zijn groter dan 500 kB, waaronder `og-en.png` (525,6 kB) en
`og-nl.png` (523,7 kB) — twee PNG's die nooit op een pagina worden getoond en als
WebP of JPEG een fractie zouden wegen. Dit sluit aan op `npm run krimpen` en op
`ONGEBRUIKTE-BEELDEN-22-AUGUSTUS.txt`, die allebei al op je lijst staan.

Ten slotte: `Layout.KvlHyLJ-.css` is 89,4 kB ruw / 17,9 kB gzip en render-blocking
op alle 93 pagina's — groter dan welke JS-brok ook. Een dekkingsanalyse daarop
raakt hetzelfde probleem van 1663 inline style-attributen dat de CSP blokkeert,
dus één opruiming levert twee dingen op.

Dode code die meelift: `track()` in `src/scripts/interactions.js:1371–1377` roept
`window.plausible` en `window.umami` aan. Geen van beide wordt ergens geladen.
Twee gedelegeerde click-listeners op documentniveau op alle 93 pagina's die naar
twee globals wijzen die nooit zullen bestaan. Bewust zo gebouwd ("meten zodra er
een analyticsscript komt"), maar het is een functie zonder achterkant.

---

## 12 · Inhoud EN/NL

**Ook dit punt is schoon, en dat is opmerkelijk bij deze omvang.**

Ik heb elk object in `src/**` met een `en`- en een `nl`-helft geparsed — niet
alleen `COPY`, ook `FIG`, `STEPS`, `PIPE`, `FORM`, `SHOTS`, `DIRECTIONS`,
`WALK_COPY`, `PER_PRODUCT` en `ui` — diep afgevlakt tot volledige sleutelpaden
inclusief array-indices, en de twee helften vergeleken. **79 tweetalige objecten in
49 bestanden. Sleutels in `en` maar niet in `nl`: 0. Andersom: 0. Type-afwijkingen:
0. Array-lengtes die verschillen: 0.** De grootste objecten komen er schoon door,
waaronder `src/lib/account.js:301` (288 paden) en `src/components/HomeV2.astro:253`
(304 paden).

Voor de 46 gebouwde routeparen heb ik de `<main>` uit de HTML getrokken en per
blok geteld (`h1 h2 h3 h4 p li tr details section a img`). **Nul van de 46 paren
wijkt af.** `/terms/` scheelt 68 regels broncode tussen EN en NL, maar levert aan
beide kanten exact 1 h1, 16 h2, 55 p, 27 li, 3 section en 13 links op — het
verschil is commentaar, niet inhoud. Woordaantallen liggen tussen ×0,95 en ×1,17,
wat normale EN→NL-uitzetting is.

Taallekken: twee scans over alle 93 pagina's, één op zichtbare tekstblokken van
zeven woorden of meer en één op `alt`, `aria-label`, `title`, `placeholder`,
`<title>` en `meta description`. **Nul treffers in beide.** Attributen zijn normaal
juist de plek waar vertalingen achterblijven; hier niet.

Sleutels waar `en === nl` zijn stuk voor stuk nagelopen en allemaal terecht
(eigennamen als "Instagram & TikTok", ingeburgerde leenwoorden als "on-brand",
formatstrings met placeholders). Eén echte kandidaat:
`src/components/CatalogPage.astro:280` heeft `'Wholesale & linesheets'` onvertaald
in de NL-kolom, naast vier labels die wél vertaald zijn — en de bijbehorende
beschrijving is trouwens wel in het Nederlands. *Risico: laag.*

**Wat ontbreekt is de vangrail.** Geen enkele test bewaakt sleutelpariteit tussen
`en` en `nl` in die 79 objecten. `audit-paar.mjs` vergelijkt alleen bedragen en
kopstructuur in de gebouwde HTML. De pariteit die er nu is, is handwerk dat elk
moment stil kan breken: een vergeten `nl`-sleutel valt terug op `undefined` en
rendert leeg, zonder buildfout. Een test die alle `en`/`nl`-objecten inleest en de
diepe sleutelpaden plus array-lengtes vergelijkt is ongeveer veertig regels, draait
vandaag groen, en kan er dus meteen in. *Risico: midden, en dit is de beste
verhouding tussen moeite en dekking van de hele audit.*

---

## 13 · De architectuurregels die ik in de code heb aangetroffen

Input voor een later `ARCHITECTURE.md`. Dit is beschrijvend — het is wat de code
feitelijk doet, niet wat ik zou voorschrijven. Waar de praktijk van de regel
afwijkt, staat dat erbij.

**Grond en verlichting.** De paginakleur is `--bg-0` (#08090B), maar de
*zichtbare* grond is hoger doordat `body::before` er korrel, een lamp linksboven
en een vignet op legt. Een sectie die een dekkende achtergrond schildert, is een
deksel over die laag. Regel: een sectie zonder eigen grond schildert er geen; een
sectie met een eigen grond (foto, verloop) laat die grond aan zijn randen naar
transparant lopen met `mask-image` in plaats van de paginakleur eroverheen te
leggen. Zie `.rand-los` in `global.css`.

**Eén tint.** `--fill-blue`, `--fill-violet`, `--teal` en `--teal-text` wijzen
allemaal naar `--accent`; `--fill-pink` en `--fill-coral` zijn wit met alpha. De
site heeft één kleur en die is signaal. Een plaat is het tegendeel van zijn grond,
niet een tweede kleur.

**Kleur met eigen alpha.** Een gradiëntstop kan geen token met losse alpha
aannemen, dus bestaat `--scrim` als losse kanalen. Voor het accent bestaat dat
token niet en zou het moeten bestaan (punt 1).

**Prijzen en staffels.** `src/data/pricing.js` is de bron: `LADDER`, `TIERS`,
`AMOUNT`, `PLAN_*`, `WINDOW_THRESHOLD`. `src/data/capacity.js` is de bron voor het
capaciteitsplafond. Elke pagina importeert; niets typt een bedrag over. Drie
assertions bewaken de ladder (`assertExtraLadder`, `assertLadder`,
`assertQuoteMatches`). Het btw-tarief hoort in die regel te vallen en doet dat nu
niet.

**Btw en geld.** `src/lib/quote.js` is de rekenkern voor alles wat werkelijk in
rekening wordt gebracht; `pricing.js` is voor wat op de site staat. Die twee horen
door één assertion aan elkaar geknoopt te zijn.

**D1-toegang.** Altijd `env.DB.prepare(…).bind(…)`; nooit een variabele in de
SQL-tekst. Tabelnamen en kolomlijsten komen uit literale whitelists;
`?N`-plaatshouders worden gegenereerd; ids gaan door `Number.isInteger`.
Meervoudige samenhangende schrijfacties gaan door `env.DB.batch([...])`.
Schema-evolutie wordt opgevangen met de terugvalvorm
`try { brede query } catch (e) { if (!/no such column/i.test(e)) throw; smalle query }`.

**Idempotentie van webhooks.** Nooit de POST-body vertrouwen — opnieuw ophalen bij
de provider. Idempotentie is een databasebeperking (`UNIQUE(provider, external_id)`,
`ON CONFLICT DO NOTHING`), geen vlag. Een `catch` rond zo'n INSERT mag alleen een
*unique-constraint*-fout inslikken en moet al het andere doorgooien, zodat de
provider opnieuw levert.

**Routevorm.** `/account`, `/admin` en `/o` zijn dunne re-exports naar een
dispatcher in `src/lib/`, met één centrale `originIsSelf()`-controle vóór de hele
POST-routetabel. `/api/*` zijn zelfstandige handlers. Een statisch routebestand
wint van `[[path]].js` en omzeilt daarmee de centrale controle — dat is een val,
en `debug-mollie.js` staat erin.

**Sessies.** Wachtwoord met PBKDF2-100k, sessietoken uit een CSPRNG, alleen de
SHA-256-hash in de database, cookie met `Path` beperkt tot het eigen deel.
Portaltokens hebben een TTL en worden gehasht opgezocht.

**Styleguide.** `scripts/make-styleguide.mjs` leest `:root` uit `global.css` en
genereert `visuails-styleguide.html`. Niets daarin wordt met de hand overgetypt —
maar de generator leest maar één `:root`-blok en de uitvoer moet met de hand
worden ververst.

**Meten in plaats van kijken.** De vangrails zijn zelf onderdeel van de
architectuur: `naden.mjs` (naden en randen), `leesbaar.mjs` (contrast per
tekstregel), `keuring.mjs`, `mobiel.mjs`, `zoom.mjs`, `wandel.mjs`,
`audit-*.mjs`, `visueel.mjs`. Regel die er impliciet in zit: een ontwerpbewering
in een comment hoort een meting naast zich te hebben. Twee daarvan
(`audit-feiten.mjs`, `audit-paar.mjs`) eindigen nooit met een foutcode en zijn dus
rapport en geen vangrail — dat is het benoemen waard.

---

## Wat ik als eerste zou doen

**Vier dingen met voorrang, en ze zijn alle vier klein.**

1. **De Stripe-webhook** krijgt dezelfde discriminerende `catch` als Mollie al
   heeft (`functions/api/webhook/stripe.js:101` ← `mollie.js:751–756`). Nu kan een
   echte betaling stil en blijvend niet worden vastgelegd.
2. **Migratie 0024 alsnog schrijven** en `scripts/migrate.mjs` een register geven.
   De "één proefvisual per betaler"-controle staat op elke gemigreerde database uit
   zonder dat iets dat meldt.
3. **`assertQuoteMatches()` het btw-tarief laten controleren**, en de vier
   definities terugbrengen tot één. Nu kan de site 19 procent tonen en de kassa 21
   rekenen met alle tests groen.
4. **De wachtrijbelofte waarmaken of intrekken.** `src/lib/account.js:5732` belooft
   automatische starts; `queueTake()` heeft geen enkele productie-aanroeper.

**Daarna, in volgorde van opbrengst per uur:** een pariteitstest voor de 79
EN/NL-objecten (~40 regels, draait vandaag groen); `npm audit fix` voor `js-yaml`
en `nanoid`; het commentaarblok uit het `is:inline`-script halen (12 kB × 10
pagina's, gratis); `script-src 'self'` in de CSP; de acht dienstpagina-onderdelen
samenvoegen (`RungTable`, `ModelRoster`); de 111 verweesde probes en `dist-verify/`
(20 MB) opruimen; en `debug-mollie.js` weghalen.

**Wat ik expliciet zou láten staan:** de bewust bewaarde aliassen (`--chrome`,
`--chrome-filter`, de harbor-namen met nieuwe waarden), de gescheiden
`PricingPage`/`PlansPage`/`ComparePage`, de `ClientRouter`, en `lenis`. Die zijn
alle vier in het bestand zelf beargumenteerd en de argumenten kloppen nog.
