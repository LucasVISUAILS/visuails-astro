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
| `scripts/**` | losse scripts: bouwstappen, metingen, onderhoud |
| `visual/**` | de referentiebeelden waar `npm run visueel` tegenaan meet |

## Lokaal draaien

Node 22 (staat in `.nvmrc`).

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

Daarnaast is er per suite een los script (`npm run test:vat`, `test:geld`,
`test:order`, …); de volledige lijst staat in `package.json`. **Los draaien bouwt
niet**: de suites die uit `dist/` lezen slaan zichzelf dan over met een regel die
zegt hoe oud de build is. Wil je die controles echt, draai dan eerst
`npx astro build`.

Naast de tests staat er een rij meetcommando's (`npm run audit`, `naden`,
`keuring`, `visueel`). De complete tabel, met per commando wat het meet, staat in
`ARCHITECTURE.md` §10.

## Deployen

Het Pages-project (`visuails-astro`) hangt aan GitHub en bouwt zelf met
`npm install && npm run build` naar `dist/`. `functions/` wordt automatisch
opgepakt en hoort niet in de build-output.

- **Push naar een willekeurige branch** → een preview-deploy op zijn eigen
  `*.pages.dev`-URL. Dat is de enige plek waar je de Functions, D1 en R2 in
  samenhang ziet werken.
- **Push naar `main`** → productie.

Bindings komen uit `wrangler.toml` (dit project draait in config-file mode, de
Bindings-UI in het dashboard is uitgeschakeld). Secrets staan daar bewust níét in
en gaan via `npx wrangler pages secret put …`.

De Worker in `cron/` is een **apart** Cloudflare-project (`visuails-cron`) en gaat
niet mee met een push. Verander je `cron/index.js`, dan blijft de oude versie
draaien tot je hem los uitrolt:

```
npm run cron:check   # wrangler deploy --dry-run: bouwt en controleert bindings
npm run cron:deploy  # de echte
```

## De documenten in deze map

Er staan ruim veertig `.md`-bestanden in de projectmap en ze zijn **niet
allemaal even oud**. Dat is geen rommel maar een gevolg van hoe er gewerkt is:
elke grote ronde liet een verslag achter. Het probleem is alleen dat je aan de
naam niet ziet of je een geldende regel leest of een dagverslag uit augustus.

Deze tabel lost dat op. Lees hem voordat je iets uit een van deze bestanden
overneemt.

### Levend — hier hoort te staan wat vandaag waar is

| Bestand | Waarvoor |
|---|---|
| `ARCHITECTURE.md` | de regels van het project: waar een getal hoort, hoe geld en btw lopen, hoe routes authenticeren. **Begin bij §13**, de openstaande punten |
| `README.md` | deze: opzet, lokaal draaien, testen, deployen |
| `WERKLIJST.md` | wat er nog ligt, met per punt de stand. Het langste document en het enige dat als takenlijst bedoeld is |
| `DESIGN.md` | de vormregels: kleur, ritme, typografie, beweging |
| `SCHRIJFWIJZER.md` | hoe er geschreven wordt, en welke woorden niet |
| `DEPLOY.md` | uitrollen, secrets, bindings, de losse cron-Worker |
| `MOLLIE.md` | de betaalketen en wat er misging |
| `IMAGES.md` | waarom beeld buiten `astro:assets` om gaat |
| `AVG-VERWERKINGSREGISTER.md`, `AVG-DATALEKPROCEDURE.md` | de twee AVG-documenten; het register wordt door `npm run test:register` bewaakt |
| `STOCK-IDEE.md`, `ABONNEMENT-ONTWERP.md`, `MERKMODEL-ONTWERP.md` | het denkwerk achter drie diensten; de uitvoering staat in de code |

### Dagverslag — een beschrijving van één moment, met opzet niet bijgewerkt

Alles met een **datum in de naam** (`AUDIT-*`, `CONTROLE-*`, `RANDEN-*`,
`MOBIEL-*`, `MERKBEELDEN-*`, `NAVIGATIE-EN-BESTELSTROOM-*`,
`ARCHITECTUURAUDIT-*`) plus alle `REPORT-SECTION-*` en `TEKST-*`.

Die beschrijven de site zoals hij op díé dag was, en dat is wat ze horen te
doen. Gebruik ze om te lezen *waarom* iets zo geworden is — nooit om te weten
hoe het nu staat.

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
| `DemoGame.astro` | nooit gebouwd; het plan staat in `PLAN-DEMO-SPEL.md` |
| `ThreeWay.astro` | verwijderd, samen met de Duitse site |
| `src/pages/order-*.astro` | opgegaan in één `/start`; de 301's staan in `public/_redirects` |
| `/order-status` | `/o` |
| `src/components/HomeV2.astro` §3 t/m §13 | de homepage is op 30 aug van dertien naar acht secties gegaan — zie `HERONTWERP.md` |

**Eén dagverslag is ingetrokken in plaats van geannoteerd:**
`ONGEBRUIKTE-BEELDEN-22-AUGUSTUS.txt` noemde 62 ongebruikte beelden, waarvan er
zestig `.avif` waren — bestanden die per definitie niet bij naam in de bron
staan omdat de bouwstap ze koppelt. Wie die lijst had gevolgd, had de hele
AVIF-set gewist. Er staat nu een verantwoording in dat bestand en een script dat
de vraag opnieuw stelt: `npm run beelden`.

### Plan — geschreven vóór de uitvoering

`HERONTWERP.md`, `PLAN-PORTALEN.md`, `PLAN-PORTALEN-V2.md`, `PLAN-DEMO-SPEL.md`,
`PRICING-MODEL-OPTIONS.md`, `HOOKS-COPY-CONCEPT.md`, `BRIEF-*`.

Deze zijn deels uitgevoerd en deels niet. `HERONTWERP.md` heeft bovenaan een
stand van zaken; de andere niet. Toets een plan altijd aan de code voordat je
ervan uitgaat dat het er zo in zit.

## Verder lezen

`ARCHITECTURE.md` beschrijft de regels van dit project: waar een getal hoort te
staan, hoe btw en geld lopen, hoe een query eruitziet, welke routes hoe
authenticeren, en wat er bewust niet is. **Begin bij §13** — de lijst met bekende
openstaande punten, dingen die kapot of half zijn en die je moet weten voordat je
er in de buurt komt.
