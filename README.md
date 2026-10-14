# VISUAILS

Een statische Astro-site (`output: 'static'`, 92 pagina's, EN + NL) op Cloudflare
Pages, met een dynamische achterkant in Pages Functions op D1 (SQLite) en R2, plus
één losse Worker in `cron/` voor het nachtelijke werk. De scheiding is streng:
alles wat een bezoeker leest is vooraf gebouwd, alles wat een klant doet loopt
door een Function — geen SSR van marketingpagina's, geen client-side ophalen van
paginainhoud.

## Waar wat staat

| Map | Wat er in zit |
|---|---|
| `src/pages/**` | de gebouwde pagina's (EN onder `/`, NL onder `/nl/`, plus dynamische routes) |
| `src/components/**` | de bouwstenen daarvan |
| `src/data/**` | platte gegevens: prijzen, capaciteit, teksten, tabellen |
| `src/lib/**` | servercode: bestelling, factuur, portaal, account, beheer |
| `src/scripts/**` | de browsercode: bestelstroom, interacties |
| `functions/**` | de routes; dun, ze wijzen naar `src/lib` |
| `cron/index.js` | een aparte Worker: opruimen, herinneren, vastgelopen werk |
| `migrations/**` | het D1-schema, genummerd `0001…`, uitgevoerd door `scripts/migrate.mjs` |
| `public/**` | wat ongewijzigd wordt geserveerd, inclusief `_headers` |
| `tests/**` | de testsuites; elke suite draait als los `node`-proces |
| `scripts/**` | losse scripts: bouwstappen, onderhoud, de uitrol; `scripts/meten/` de meetscripts |
| `visual/**` | de referentiebeelden waar `npm run visueel` tegenaan meet |
| `docs/**` | de naslag (zie onder); `docs/archief/` de dagverslagen en plannen |
| `kladblok/**` | Claude's werkmap: de lopende stukken, de testomgeving, `naslag/`, `ronde-9/` |
| `_opruimen/**` | `LIJST.txt` (wat weg mag) en `VERPLAATS.txt` (wat ergens anders hoort); `OPRUIMEN.bat` voert ze uit |

In de projectmap zelf staan alleen de instellingen (`package.json`,
`astro.config.mjs`, `wrangler.toml`, `schema.sql`, …), deze README en drie
knoppen om te dubbelklikken: **`UITROLLEN.bat`**, **`TERUGDRAAIEN.bat`** en
**`OPRUIMEN.bat`** (8 oktober 2026).

**`FORMATEN.bat`** (12 oktober 2026) levert PNG en WebP als een klant die in
Studio aanvroeg (/admin/formaten): zet de PNG-originelen uit Magnific van één
bestelling in een map, dubbelklik, typ het bestelnummer en sleep de map erin.
Het script (`scripts/formaten.mjs`) maakt van elke PNG een WebP (kwaliteit 90,
nooit uit de jpg), zet de herkomsttag erin, uploadt ze en hangt ze aan de
beelden, zodat de zip per product JPG/, PNG/ en WEBP/ heeft. Is elk beeld
compleet, dan zet het het verzoek op Klaar.

## Lokaal draaien

Node 22, minimaal 22.12 (staat in `.nvmrc`; Astro 7 eist 22.12 sinds 8 oktober
2026). Na een update van package.json of package-lock.json: dubbelklik
`NA-UPDATE-INSTALLEREN.bat` (controleert Node, `npm ci`, bouwt één keer).

```
npm install          # er is een package-lock.json; npm ci kan ook
npm run dev          # astro dev op http://localhost:4321
npm run build        # naar dist/
```

`astro dev` serveert **alleen de statische site**. Er is geen Cloudflare-adapter,
dus `functions/`, D1 en R2 draaien hier niet mee: alles achter `/api/…`,
`/account`, `/admin` en `/o/…` bestaat lokaal niet. Wie de achterkant wil zien,
kijkt op een preview-deploy. `npm run migrate` draait de migraties tegen de
**remote** D1 — er is geen lokale database om tegenaan te werken.

## Tests

```
npm test             # bouwt eerst, draait dan de hele keten, stopt bij de eerste die faalt
```

**`npm test` bouwt sinds 30 augustus 2026 zelf.** De eerste schakel is
`test:bouw` (`astro build`). Zeventien suites lezen uit `dist/`, en een build van
vóór je laatste wijziging levert geen "je hebt niet gebouwd" op maar een rood
kruis over een bestand dat niemand meer publiceert — dat is een keer een
middag kosten geweest. `tests/keten-volledig.test.mjs` houdt die eerste schakel
op zijn plek.

**`npm run test:reeks`** (sinds 8 oktober 2026, punt 9.11) draait precies dezelfde
keten — hij leest hem uit `test` in `package.json` — maar na de build een paar
tegelijk en zonder npm per test; een test die faalt, krijgt aan het eind één losse
herkansing. `UITROLLEN.bat` gebruikt deze. Nieuwe tests zet je dus gewoon in `test`.

Daarnaast is er per suite een los script (`npm run test:vat`, `test:geld`,
`test:order`, …); de volledige lijst staat in `package.json`. **Los draaien bouwt
niet**: de suites die uit `dist/` lezen slaan zichzelf dan over met een regel die
zegt hoe oud de build is. Wil je die controles echt, draai dan eerst
`npx astro build`.

Naast de tests staat er een rij meetcommando's (`npm run audit`, `naden`,
`keuring`, `visueel`). De complete tabel, met per commando wat het meet, staat in
`docs/ARCHITECTURE.md` §10.

## Deployen

**Dubbelklik `UITROLLEN.bat`** (sinds 8 oktober 2026, punt 9.02). In deze volgorde,
en bij een fout stopt hij met "GESTOPT BIJ STAP n — er is niets live gezet":

0. staat er in `_opruimen` nog iets onder een kop met "moet"? Dan eerst opruimen (J/N);
1. geheimen: `.dev.vars`, `.env`, dumps, back-ups, sleutels in de tekst, bestanden boven 25 MB;
2. de volledige testreeks (`npm test`);
3. welke bestanden en welke nieuwe migraties meegaan, en "Doorgaan? J/N";
4. commit (bericht uit `kladblok/COMMIT-BERICHT.txt`, anders de datum) en push;
5. de nieuwe migraties op de live-D1 (`scripts/migrate.mjs`, zie `docs/ARCHITECTURE.md` §4.4);
6. `npm run deploy` (de site); 7. `npm run cron:deploy` (het nachtwerk);
8. zes adressen op visuails.com nakijken.

Het eindscherm zegt "LIVE EN NAGEKEKEN · <datum tijd>", en elke uitrol krijgt een
regel in `kladblok/uitrol-log.txt`. **`TERUGDRAAIEN.bat`** zet de site terug naar de
vorige versie (`wrangler rollback`); de database gaat níét terug. Zonder dubbelklik
kan het ook: `npm run uitrollen`, `npm run terugdraaien`; proefrit zonder iets te
bewaren of live te zetten: `node scripts/uitrol.mjs --droog`.

De site is één Cloudflare Worker (`visuails-site`); hoe dat zit en welke secrets
erop staan, staat in `docs/WORKER.md`. De Worker in `cron/` is een **apart**
project (`visuails-cron`); de knop rolt ze allebei uit. Bindings komen uit
`wrangler.toml`; secrets staan daar bewust níét in en gaan via
`npx wrangler secret put …` of het dashboard.

## De documenten in deze map

Sinds 8 oktober 2026 staan ze niet meer los in de projectmap maar in `docs/`, en
zie je aan de map of je een geldende regel leest of een verslag van één moment.
(Code-opmerkingen noemen ze nog bij hun naam, zonder `docs/` ervoor; de naam is
niet veranderd.)

### `docs/` — hier hoort te staan wat vandaag waar is

| Bestand | Waarvoor |
|---|---|
| `ARCHITECTURE.md` | de regels van het project: waar een getal hoort, hoe geld en btw lopen, hoe routes authenticeren. **Begin bij §13**, de openstaande punten |
| `DESIGN.md`, `KLEURENSCHEMA.md` | de vormregels en de kleuren; `npm run test:ontwerpdoc` houdt DESIGN.md bij de CSS |
| `SCHRIJFWIJZER.md`, `STIJL.md`, `STEM-BRON.md` | hoe er geschreven wordt, en welke woorden niet |
| `PRODUCT.md` | voor wie en waarom |
| `DEPLOY.md`, `WORKER.md`, `BACKEND-SETUP.md` | uitrollen, secrets, bindings, de back-up, de losse cron-Worker |
| `MOLLIE.md` | de betaalketen en wat er misging |
| `IMAGES.md` | waarom beeld buiten `astro:assets` om gaat |
| `AVG-VERWERKINGSREGISTER.md`, `AVG-DATALEKPROCEDURE.md` | de twee AVG-documenten; het register wordt door `npm run test:register` bewaakt |
| `STOCK-IDEE.md`, `ABONNEMENT-ONTWERP.md`, `MERKMODEL-ONTWERP.md` | het denkwerk achter drie diensten; de uitvoering staat in de code (het abonnement zonder week: §28 van het overzicht) |
| `WORKING-AGREEMENT.md`, `EIGEN-LOOK-MAANDSET-INFORMATIE.md`, `FABLE-EN-VISUAILS.md`, `WHATSAPP-BERICHTEN.md` | losse naslag |

De lopende werklijst en het overzicht staan in `kladblok/` (`UPGRADE-BESLISLIJST-7-OKT.txt`,
`VISUAILS-OVERZICHT-6-OKT.md`).

### `docs/archief/` — dagverslagen en plannen, met opzet niet bijgewerkt

`WERKLIJST.md` (de werklijst van augustus), `HERONTWERP.md`, `PLAN-*`, `BRIEF-*`,
`PRICING-MODEL-OPTIONS.md`, `HOOKS-COPY-CONCEPT.md`, `AUDIT-TASK-0.md`,
`ARCHITECTUURAUDIT-23-AUGUSTUS.md`, de `REPORT-SECTION-*` waar de code nog naar
verwijst, `TEKST-RONDE.md`, `FLAGS.md` en `ONGEBRUIKTE-BEELDEN-22-AUGUSTUS.txt`.
Gebruik ze om te lezen *waarom* iets zo geworden is — nooit om te weten hoe het nu
staat. Dagverslagen waar niets meer naar verwijst, staan op de opruimlijst.

**Namen die sindsdien veranderd zijn, staan er sinds 30 augustus 2026 bij.** Elk
document dat een verouderde bestandsnaam noemt, draagt bovenaan een blok met wat
die naam vandaag is. De tekst eronder is niet herschreven: een deel van die namen
staat in geciteerde foutmeldingen en bouwuitvoer, en die aanpassen zou het bewijs
vervalsen in plaats van bijwerken.

De volledige kaart:

| Toen | Nu |
|---|---|
| `HomePage.astro` | `HomeV2.astro` |
| `src/scripts/motion.js` | `src/scripts/interactions.js` |
| `functions/admin/debug-mollie.js` | `/admin/diagnose` in de padtabel van `src/lib/admin.js` |
| `HooksPage.astro`, `FigHook.astro` | verwijderd 18 aug 2026; de tekst staat in `src/data/binnenkort.js` en op `/plans#binnenkort` |
| `FigStudio.astro` | verwijderd; `FigGate` op /studio tekende hetzelfde |
| `DemoGame.astro` | nooit gebouwd; het plan staat in `docs/archief/PLAN-DEMO-SPEL.md` |
| `ThreeWay.astro` | verwijderd, samen met de Duitse site |
| `src/pages/order-*.astro` | opgegaan in één `/start`; de 301's staan in `public/_redirects` |
| `/order-status` | `/o` |
| `src/components/HomeV2.astro` §3 t/m §13 | de homepage is op 30 aug van dertien naar acht secties gegaan — zie `docs/archief/HERONTWERP.md` |
| een document in de projectmap | sinds 8 okt 2026 in `docs/` of `docs/archief/` |
| `audit-*.mjs`, `naden.mjs`, `leesbaar.mjs`, … in de projectmap | sinds 8 okt 2026 in `scripts/meten/` |

**Eén dagverslag is ingetrokken in plaats van geannoteerd:**
`ONGEBRUIKTE-BEELDEN-22-AUGUSTUS.txt` noemde 62 ongebruikte beelden, waarvan er
zestig `.avif` waren — bestanden die per definitie niet bij naam in de bron
staan omdat de bouwstap ze koppelt. Wie die lijst had gevolgd, had de hele
AVIF-set gewist. Er staat nu een verantwoording in dat bestand en een script dat
de vraag opnieuw stelt: `npm run beelden`.

## Verder lezen

`docs/ARCHITECTURE.md` beschrijft de regels van dit project: waar een getal hoort te
staan, hoe btw en geld lopen, hoe een query eruitziet, welke routes hoe
authenticeren, en wat er bewust niet is. **Begin bij §13** — de lijst met bekende
openstaande punten, dingen die kapot of half zijn en die je moet weten voordat je
er in de buurt komt.
