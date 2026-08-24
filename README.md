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
npm test             # de hele keten, stopt bij de eerste die faalt
```

Daarnaast is er per suite een los script (`npm run test:vat`, `test:geld`,
`test:order`, …); de volledige lijst staat in `package.json`. De tests draaien
deels tegen `dist/`, dus **bouw eerst** als je de gebouwde HTML hebt aangeraakt.

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

## Verder lezen

`ARCHITECTURE.md` beschrijft de regels van dit project: waar een getal hoort te
staan, hoe btw en geld lopen, hoe een query eruitziet, welke routes hoe
authenticeren, en wat er bewust niet is. **Begin bij §13** — de lijst met bekende
openstaande punten, dingen die kapot of half zijn en die je moet weten voordat je
er in de buurt komt.
