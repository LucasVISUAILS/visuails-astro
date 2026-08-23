# ARCHITECTURE.md — VISUAILS

De regels die deze codebase feitelijk volgt, zodat ze niet elke keer opnieuw uit
de bestanden hoeven te worden afgeleid. **Beschrijvend, niet aspirationeel**: wat
hier staat, staat zo in de code. Waar de praktijk van de regel afwijkt, staat dat
erbij met de plek erbij.

Bedoeld om als naslag mee te geven bij een nieuwe opdracht. Wie hier iets in
verandert, verandert eerst de code en daarna deze tekst — nooit andersom.

Laatst bijgewerkt: 23 augustus 2026.

---

## 1 · Wat het is

Een statische Astro-site (`output: 'static'`, 92 pagina's, EN + NL) op Cloudflare
Pages, met een dynamische achterkant in Pages Functions op D1 (SQLite) en R2, plus
één losse Worker in `cron/` voor het nachtelijke werk.

De scheiding is streng en de moeite van het onthouden waard: **alles wat een
bezoeker leest, is vooraf gebouwd; alles wat een klant doet, loopt door een
Function.** Er is geen server-side rendering van marketingpagina's en geen
client-side ophalen van paginainhoud.

```
src/pages/**          92 gebouwde pagina's (38 EN + 38 NL + dynamische routes)
src/components/**     de bouwstenen daarvan
src/data/**           platte gegevens: prijzen, capaciteit, teksten, tabellen
src/lib/**            servercode: bestelling, factuur, portaal, account, beheer
functions/**          de routes; dun, ze wijzen naar src/lib
cron/index.js         een aparte Worker: opruimen, herinneren, vastgelopen werk
migrations/**         het D1-schema, 0001…0032
public/**             wat ongewijzigd wordt geserveerd, inclusief _headers
```

---

## 2 · Waar een getal hoort te staan

Dit is de belangrijkste regel in het project, en de een-na-belangrijkste is dat
niemand hem per ongeluk mag omzeilen.

### 2.1 · Prijzen, staffels en bedragen → `src/data/pricing.js`

De kop van dat bestand zegt het zelf: *"Every euro figure on the site now comes
from here. Nothing else may hardcode a price."*

| Wat | Constante |
|---|---|
| De prijsstaffel per dienst | `LADDER` |
| Losse bedragen (proefvisual, merkmodel, retainer, …) | `AMOUNT` |
| Het machtigingsbedrag van een abonnement | `MANDATE_AMOUNT` |
| Maandbedragen en aantallen per abonnement | `PLAN_AMOUNT`, `PLAN_PRODUCTS`, `PLAN_CLIPS` |
| Vanaf hoeveel producten een bestelling een gereserveerd venster krijgt | `WINDOW_THRESHOLD` |
| Het btw-tarief | `VAT_RATE` |
| Toeslagen | `OUTFIT_SURCHARGE`, `EXTRA_PHOTO_LADDER` |

Een bedrag wordt **als getal** opgeslagen en pas bij het schrijven geformatteerd
met `euro(bedrag, taal)`, zodat "€39.99" en "€39,99" niet over het bedrag kunnen
verschillen.

### 2.2 · Capaciteit → `src/data/capacity.js`

`PRODUCTS_PER_DAY`, `ATTENDED_PER_DAY`, `ATTENDED_PER_WINDOW`, `WINDOW_DAYS`,
`LEAD_DAYS`, `HORIZON_DAYS`, `QUEUE_DAYS_MIN/MAX`. De agenda en de poort in
`functions/api/capacity.js` lezen hier.

### 2.3 · Bewaartermijnen → `src/lib/retention.js` en `src/lib/token.js`

`UPLOAD_DAYS` (bronmateriaal), `DELIVERY_MONTHS` (opgeleverd werk),
`PORTAL_TTL_DAYS` (de privélink).

**Let op dat de eerste en de derde toevallig allebei 90 zijn en iets anders
betekenen.** Wie ze door elkaar haalt, schrijft de ene termijn op de plek van de
andere zodra er één verschuift. De privacyverklaring noemt ze alle drie in één
paragraaf en gebruikt drie verschillende constanten.

### 2.4 · Cookies → `src/data/cookies.js`

`SESSION_COOKIE_DAYS`, `PREFERENCE_COOKIE_DAYS`, plus `maxAge()` voor een
`Set-Cookie` en `cookieDuur()` voor de tekst op het cookiebeleid. Dit staat in
`src/data/` en niet in `src/lib/`, omdat drie kanten het tegelijk lezen: een
browserscript, een Worker en twee Astro-pagina's die bij het bouwen draaien.

**Dit zijn geen bewaartermijnen van klantgegevens.** Een cookie op iemands
computer en een bestand op onze opslag zijn twee beloftes in twee documenten, en
horen niet in één constante te vallen omdat ze allebei in dagen worden geteld.

### 2.5 · De regel eromheen

> **Geen enkel bestand buiten de bron hierboven typt een getal dat daar ook staat
> — ook niet in een comment.**

Dat laatste is geen muggenzifterij. Een noot die "het tarief is 21%" zegt,
veroudert net zo goed als code, en een lezer gelooft hem. Vier van de vijf
gevallen die op 23 augustus zijn opgeruimd, begonnen als een verklarende noot.

**Vangrails hiervoor:**

- `assertLadder()`, `assertExtraLadder()` in `pricing.js` en `assertPlans()` in
  `plans.js` draaien bij het laden van de module.
- `assertQuoteMatches()` onderaan `src/lib/quote.js` draait bij het laden en
  controleert (a) dat het tarief nog uit `pricing.js` komt, (b) dat het bedrag dat
  een klant betaalt uit dat tarief volgt, (c) dat elke laddertrede hetzelfde
  bedrag oplevert als de rekensom, en (d) dat elke wire-waarde die het formulier
  post ook echt een prijs krijgt.
- `tests/nazicht.test.mjs` doorzoekt de **bronbestanden** op een tweede tarief of
  een tweede eurobedrag.
- `tests/promises.test.mjs` leest de **gebouwde pagina's** en controleert of de
  bezoeker hetzelfde getal ziet als de code afdwingt.
- `tests/planning.test.mjs` controleert dat de servercopie van `tierFor()` niet
  terugkomt.

**Twee plekken mogen het getal wél opschrijven, en dat is geen uitzondering maar
het punt:**

- **Een test die een verwachting vastlegt.** `tests/vat.test.mjs` schrijft
  `check('NL, no number', vatDecision({country:'NL'}).rate, 0.21)`. Zou die
  verwachting uit `VAT_RATE` worden afgeleid, dan slaagt hij bij elk tarief en
  bewijst hij niets. Nu gaat hij rood zodra iemand het tarief wijzigt — precies
  het alarm dat je bij een belastingtarief wilt. Dat geldt voor de acht
  factuur- en btw-tests.
- **Nepgegevens in een fixture.** `scripts/account-render.mjs` bouwt vier
  verzonnen bestellingen voor schermafdrukken; daar is `vat_rate: 0.21` een
  eigenschap van die verzonnen rij, net als `total_cents: 63000`.

De regel is dus preciezer dan "het getal mag nergens anders staan": **code die
rekent of toont, importeert; code die iets vastlegt of verzint, schrijft op.**

`nazicht.test.mjs` en `promises.test.mjs` zijn met opzet **complementair en niet
tegengesteld**: de een zegt "typ het niet in de bron", de ander "toon het wel op
de pagina". Tot 23 augustus stonden twee van deze vangrails elkaar in de weg (`legal.test.mjs` eiste dat `terms.astro`
géén "90 dagen" bevatte, `promises.test.mjs` eiste dat het er wél stond), en dat
ging alleen goed omdat het getal in een kopcommentaar overleefde.

### 2.6 · Twee bedragen die toevallig gelijk zijn, blijven twee namen

`AMOUNT.testSample` en `MANDATE_AMOUNT` zijn allebei één euro en betekenen iets
anders: het eerste is een PRODUCT dat je koopt, het tweede is de TRANSACTIE
waarmee een bank een SEPA-machtiging afgeeft. Samenvoegen betekent dat de
proefvisual op €2 zetten stilzwijgend ook de machtiging verandert.

Dezelfde regel geldt voor `UPLOAD_DAYS` en `PORTAL_TTL_DAYS` (§2.3).

---

## 3 · Btw en geld

Twee modules, en het verschil ertussen is de moeite waard.

- **`src/data/pricing.js`** is wat er op de SITE staat: bedragen, labels,
  `vatLabel()`, `vatNote()`, `vatPercent()`.
- **`src/lib/quote.js`** is wat er werkelijk in REKENING wordt gebracht. Het leest
  de ladder uit `pricing.js` en geeft `VAT_RATE` door — het schrijft geen enkel
  getal zelf op.
- **`src/data/vat.js`** beslist welke BEHANDELING een bestelling krijgt
  (standaard, verlegd, buiten bereik) en leest het tarief uit `pricing.js`. De
  behandeling en de hoogte zijn twee vragen.

`quoteOrder()` **leest nooit een gepost bedrag.** Er is geen `amount`-parameter
en die mag er nooit komen; alles wordt herrekend uit de dienst, het aantal en de
twee betaalde toeslagen. Een bedrag dat alleen de browser kent, is een bedrag dat
de klant kan veranderen.

De browser houdt zijn eigen voorbeeldberekening in `src/scripts/pipeline.js`,
omdat een lopend totaal moet meebewegen met een keuzelijst en niet op een
netwerkverzoek kan wachten. De twee worden eerlijk gehouden doordat ze dezelfde
ladder lezen — geen van beide kopieert een getal — en door
`assertQuoteMatches()`.

Btw-model, augustus 2026 en bewust: **21% aan iedereen bij het afrekenen,
verlegging voor een geldig EU-bedrijfsnummer wordt achteraf op de factuur
verrekend.** `src/data/vat.js` faalt dicht: elk pad dat niet aantoonbaar 0% is,
geeft het standaardtarief. Te veel innen kost een correctie, te weinig innen kost
het tarief.

---

## 4 · De database

### 4.1 · Hoe een query eruitziet

Altijd `env.DB.prepare(…).bind(…)`, direct op de plek waar hij nodig is. Er is
**geen gedeelde query-helper**, en dat is consistent volgehouden over ruim 300
aanroepen.

**Nooit een variabele in de SQL-tekst.** Wat er wél geïnterpoleerd mag worden, en
dat is de volledige lijst:

- een tabel- of kolomnaam uit een **literale whitelist** in hetzelfde bestand;
- een gegenereerde reeks `?N`-plaatshouders;
- een moduleconstante die geen invoer is (`UPLOAD_DAYS`, `INVOICE_STUCK_MINUTES`).

Ids gaan overal eerst door `Number.isInteger` voordat ze in een `IN (…)` belanden.

### 4.2 · Schema-evolutie

De terugvalvorm, die op zes plekken staat:

```js
try {
  return await brede query met de nieuwe kolom
} catch (err) {
  if (!/no such column/i.test(String(err))) throw;
  return await smalle query zonder
}
```

Dit maakt een deploy onafhankelijk van een migratie. **De `catch` moet
discrimineren** — alleen `no such column` opvangen en de rest doorgooien.

### 4.3 · Meervoudige schrijfacties

`env.DB.batch([...])` voor alles wat samen moet slagen of samen moet falen.
26 plekken.

### 4.4 · Migraties

Genummerd `migrations/0001…`, uitgevoerd door `scripts/migrate.mjs`.

**Waar het vandaag wringt, en dat hoort hier te staan:** `migrate.mjs` houdt geen
register van uitgevoerde migraties bij maar beslist op schema-introspectie, en
`migrations/0024-sample-payer.sql` ontbreekt terwijl `schema.sql` hem documenteert.
Een bestaande database krijgt `orders.payer_hash` dus nooit, en de
"één proefvisual per betaler"-controle staat daar stil uit. Er staan bovendien
vier `MIGRATIE-*-PLAKKEN.sql` in de root voor handmatige uitvoering, zonder
vastlegging van wat er werkelijk is gedraaid.

---

## 5 · Routes en authenticatie

### 5.1 · Twee families

**Dun bestand → dikke dispatcher.** `/account`, `/admin` en `/o` zijn
re-exports van vier regels; alle routering, authenticatie, validatie en rendering
zitten in `src/lib/{account,admin,portal}.js`, elk met een eigen regex-padtabel.
Dit is het patroon dat de voorkeur heeft.

**Zelfstandige handlers.** `/api/*` doet elk zijn eigen ding: methode-guard,
rate limit, validatie, antwoord.

### 5.2 · De centrale controle

Elke POST op `/admin` gaat langs **één** `originIsSelf()`-controle vóór de hele
routetabel (`admin.js`, rond regel 204). Daar kan geen route langs. `/account`
doet hetzelfde voor POST.

**Er is één ontsnappingsroute en die is een val:** een *statisch* routebestand in
`functions/admin/` wint van `functions/admin/[[path]].js` en slaat die controle
dus over. `functions/admin/debug-mollie.js` staat daarin — en maakt op een GET
twee echte Mollie-betalingen aan. Wie een nieuwe adminroute toevoegt, doet dat in
de padtabel en niet als eigen bestand.

### 5.3 · Sessies

- Wachtwoord met PBKDF2, 100.000 rondes.
- Sessietoken uit een CSPRNG; **alleen de SHA-256-hash in de database**.
- Cookie met `Path` beperkt tot het eigen deel (`/admin`, `/account`).
- Portaltokens (`/o/…`) hebben een TTL, worden gehasht opgezocht, en dragen geen
  cookie — dus terecht geen CSRF-token.

---

## 6 · Webhooks

De regels staan uitgeschreven in `functions/api/webhook/mollie.js` en zijn daar
in productie bevochten:

1. **Vertrouw de POST-body nooit.** Haal de status opnieuw op bij de provider.
2. **Idempotentie is een databasebeperking, geen vlag.**
   `UNIQUE(provider, external_id)` op `payments`, `ON CONFLICT … DO NOTHING` voor
   abonnementstermijnen.
3. **Een `catch` rond zo'n INSERT mag alleen een unique-constraint-fout
   inslikken** en moet al het andere doorgooien, zodat de provider opnieuw
   levert. De vorm die daar staat:
   `if (!(/unique/i.test(t) && /constraint/i.test(t))) throw;`
4. **Alles vóór de statuspoort is idempotent van constructie.** Een terugbetaling
   wordt toegewezen (`SET refunded_cents = ?1 WHERE ?1 > refunded_cents`), niet
   opgeteld; een creditfactuur geeft alleen de resterende ruimte uit.

**`functions/api/webhook/stripe.js` volgt regel 3 niet.** Een kale `catch`
antwoordt daar 200 op elke schrijffout, waarna Stripe stopt met opnieuw proberen
en een echte betaling permanent niet is vastgelegd.

---

## 7 · Secrets

- Elk secret wordt kaal gelezen als `env.X`, met een guard eromheen. **Nooit een
  terugval op een echte waarde.**
- Ontbreekt een secret, dan faalt het pad **dicht** en **zichtbaar**:
  `ALLOWED_ORIGIN_HOSTS` weigert, `PURGE_ENABLED` ruimt niets op, `mail.js` stuurt
  niets en schrijft één regel in het logboek met het onderwerp en de ontvanger.
- Waar een terugval onvermijdelijk is, is hij **onmiskenbaar nep**:
  `Voorbeeldstraat 12`, `NL000000000B00`, `00000000`. Een factuur met
  "Voorbeeldstraat 12" erop valt op; een die per ongeluk klopt, niet.
- Publieke bedrijfsgegevens (KVK, btw-nummer, `hello@visuails.com`) staan wél
  gewoon op de juridische pagina's en in de FAQ. Dat is geen secret; het hoort
  daar te staan. Het verschil is: **op een pagina mag het, als terugval in code
  niet.**
- `wrangler.toml` bevat `database_id`. Dat is geen secret — zonder
  geauthenticeerd Cloudflare-token is het nutteloos.
- Geen `.env`, geen `.dev.vars` in de repo. De enige env-waarde die de browser
  bereikt is `PUBLIC_CF_ANALYTICS_TOKEN`.

---

## 8 · De grond, het licht en de randen

De regels van het uiterlijk staan uitgeschreven in `src/styles/global.css`; dit is
de samenvatting die je nodig hebt vóór je een sectie aanraakt.

- De paginakleur is `--bg-0` (#08090B), maar de **zichtbare** grond ligt hoger:
  `body::before` legt er korrel, een lamp linksboven en een vignet op. Die laag
  staat op het VENSTER en niet op de pagina.
- **Een sectie die een dekkende achtergrond schildert, is een deksel over die
  laag.** Dat is de fout die tot 23 augustus vier secties donkerder maakte dan de
  pagina eromheen.
- Dus: **een sectie zonder eigen grond schildert er geen.** Dan is er niets te
  matchen; ze *is* de pagina, op elke scrolpositie.
- **Een sectie met een eigen grond** (een foto, een verloop) laat die grond aan
  zijn randen naar transparant lopen met `mask-image` (`.rand-los`), in plaats van
  de paginakleur eroverheen te leggen. Zo is er geen kleur die kan afwijken, want
  er wordt geen kleur geschilderd.
- De **korrel loopt door over de sfeerbeelden** (`.korrel-mee`), met hetzelfde
  masker als de foto zodat de hoeveelheid textuur op elke rij gelijk blijft.
  Alleen op merkbeelden, nooit op geleverd werk.
- **Eén tint.** `--fill-blue`, `--fill-violet`, `--teal` en `--teal-text` wijzen
  allemaal naar `--accent`; `--fill-pink` en `--fill-coral` zijn wit met alpha.
  Een plaat onderscheidt zich door het tegendeel van zijn grond te zijn, niet door
  een tweede kleur.
- Een gradiëntstop kan geen token met eigen alpha aannemen, dus bestaat `--scrim`
  als losse kanalen. Voor het accent bestaat dat token nog niet, en daarom staat
  `rgb(198 241 0 / …)` op 22 plekken met de hand geschreven — dat is de volgende
  die eraan hoort te gebeuren.

---

## 9 · De styleguide

`scripts/make-styleguide.mjs` leest het `:root`-blok uit `global.css` en genereert
`visuails-styleguide.html`. Niets daarin wordt met de hand overgetypt.

Twee dingen om te weten: de generator leest maar **één** `:root`-blok (er zijn er
drie), en de uitvoer wordt niet automatisch ververst — `npm run styleguide` is een
handeling.

---

## 10 · Meten in plaats van kijken

De vangrails zijn onderdeel van de architectuur, niet iets ernaast. Een
ontwerpbewering in een comment hoort een meting naast zich te hebben.

| Commando | Wat het meet |
|---|---|
| `npm test` | ~50 suites: geldstromen, btw, capaciteit, routes, teksten |
| `npm run audit` | zes controles over de gebouwde pagina's (links, structuur, JSON-LD, feiten, paren, tekst) |
| `npm run naden` | naden en randen, 91 pagina's × 390/1920 px |
| `npm run naad` | dezelfde naad op drie vensterhoogtes — voor als een rand per scrolpositie verschilt |
| `npm run vlakken` | het NIVEAU van elk vlak, voor een sectie die overal een paar waarden afwijkt |
| `node leesbaar.mjs` | het werkelijke contrast per tekstregel, twee breedtes |
| `npm run keuring` | beeldmaten en gewicht per pagina |
| `node mobiel.mjs` / `zoom.mjs` / `wandel.mjs` | de lade, tekstvergroting, en een doorloop met consolefouten |
| `npm run visueel` | 364 opnamen tegen een referentie |

**`naden.mjs` onderscheidt een RAND van een NAAD op een objectieve toets:**
schildert er op die rij of kolom iets zijn eigen grond — een achtergrond, een
beeld, een rand, een schaduw — of ligt de rij binnen zoiets, dan hoort die
overgang er te zijn. Schildert er niets, dan is het een naad.

Twee scripts zijn **rapport en geen vangrail**: `audit-feiten.mjs` en
`audit-paar.mjs` eindigen nooit met een foutcode en kunnen dus geen build laten
falen. `audit-paar.mjs` vergelijkt bovendien alleen de twee talen ten opzichte van
elkaar — staan ze allebei fout, dan blijft het stil.

---

## 11 · EN en NL

38 EN-pagina's en 38 NL-pagina's, één op één. Dynamische routes lezen aan beide
kanten dezelfde array, dus daar kan geen drift ontstaan.

Elk tweetalig object heeft een `en`- en een `nl`-helft met **exact dezelfde
sleutels**; op 23 augustus gemeten over 79 objecten in 49 bestanden, met nul
afwijkingen — inclusief array-lengtes.

**Er is geen test die dit afdwingt.** Een vergeten `nl`-sleutel valt terug op
`undefined` en rendert leeg, zonder buildfout. Dat is de goedkoopste vangrail die
nog ontbreekt.

18 routeparen dragen aan beide kanten handgeschreven markup zonder gedeelde
component. Ze staan in pariteit, maar elke inhoudelijke wijziging moet twee keer.

---

## 12 · Wat er bewust niet is

Handig om te weten voordat je het "mist":

- **Nul externe scripts.** Geen tracker, geen CDN, geen Google Fonts — alle twaalf
  lettertypen zijn zelf gehost. De enige uitzondering is Cloudflare Insights,
  achter toestemming, en die staat vandaag uit bij gebrek aan een token.
- **Geen state-manager en geen framework op de pagina.** GSAP staat alleen op de
  galerij en wordt dynamisch geladen; `lenis` staat op alle pagina's.
- **Geen radiusloos ontwerp meer** (dat was v1) en geen pastelpalet (dat was v2).
  Resten van allebei staan nog als dode klassen in `global.css`.
- **Geen `assertQuoteMatches` als aparte buildstap** — hij draait bij het laden van
  de module, wat betekent dat elke test en elke Function hem meeneemt.

---

## 13 · Wat er open staat

Geen taken, maar dingen die je moet weten voordat je iets aanraakt in de buurt.
De volledige onderbouwing staat in `ARCHITECTUURAUDIT-23-AUGUSTUS.md`.

1. **`functions/api/webhook/stripe.js`** slikt een schrijffout in als "dubbele
   levering" en antwoordt 200 — zie §6.
2. **`migrations/0024-sample-payer.sql` ontbreekt** en `migrate.mjs` heeft geen
   register — zie §4.4.
3. **De wachtrij van het abonnement start niets.** `src/lib/account.js` belooft de
   abonnee dat de bovenste N automatisch starten; `queueTake()` en
   `queueLinkOrder()` in `subscription.js` hebben geen productie-aanroeper.
4. **`functions/admin/debug-mollie.js`** is een zelfverklaard tijdelijk bestand dat
   op een GET twee echte betalingen aanmaakt — zie §5.2.
5. **Er is geen kanaaltoken voor het accent** — zie §8.
6. **Geen pariteitstest voor EN/NL-sleutels** — zie §11.
