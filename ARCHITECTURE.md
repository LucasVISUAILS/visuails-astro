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

**DE REGEL DIE OP 24 AUGUSTUS 2026 IS GELEERD, EN HIJ IS NIET "VERGEET DE
MIGRATIE NIET".** Migratie 0034 ging live zonder dat `npm run migrate` was
gedraaid. Gemeten gevolg: `/account` bleef staan — dat had de terugval uit 0013
en 0015 al — maar `/o/<token>`, de gemailde klantlink, gaf HTTP 503, en `/admin`
viel om omdat de revisie-inbox vooraan staat in de `Promise.all` die het hele
dashboard opbouwt.

Een vergeten migratie is een normale gebeurtenis en hoort geen storing te zijn.
De regel is dus: **elke query die een nieuwe kolom leest, krijgt een terugval die
`no such column` opvangt en zonder die kolom verder gaat, met één `console.error`
die de migratie bij naam noemt.** Dat patroon stond er al drie migraties lang in
`account.js`; het ontbrak in `portal.js` en `admin.js`, en juist het eerste is het
enige adres dat een klant zónder account heeft. Sinds vandaag hebben alle drie
hem, en `tests/revisieronde.test.mjs` §6 draait de echte handlers tegen het
schema mínus het 0034-blok om te bewijzen dat elk scherm blijft staan.

**Waar het vandaag wringt, en dat hoort hier te staan:** `migrate.mjs` houdt geen
register van uitgevoerde migraties bij maar beslist op schema-introspectie — hij
kijkt of een kolom bestaat en slaat over als dat zo is. Er staan bovendien vier
`MIGRATIE-*-PLAKKEN.sql` in de root voor handmatige uitvoering, zonder vastlegging
van wat er werkelijk is gedraaid.

*Hier stond tot 24 augustus 2026 bij dat `migrations/0024-sample-payer.sql`
ontbrak en dat een bestaande database `orders.payer_hash` dus nooit zou krijgen.
Dat klopt niet: het bestand staat er (6.120 bytes) en `npm run migrate` meldt
`0024-sample-payer.sql → overgeslagen — orders.payer_hash bestaat al`. De kolom
is er dus, en de "één proefvisual per betaler"-controle draait. Wat wél blijft
staan is de eerste helft van de zin — er is geen register — en dat is ook de
reden dat zo'n bewering hier zo lang onweersproken kon blijven.*

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
dus over. Wie een nieuwe adminroute toevoegt, doet dat in de padtabel en niet als
eigen bestand.

> *Bijgewerkt 30 augustus 2026.* Hier stond dat `functions/admin/debug-mollie.js`
> in die val zat en op een GET twee echte Mollie-betalingen aanmaakte. Dat
> bestand is er sinds 23 augustus niet meer — §13 van dit document beschrijft de
> oplossing — en deze paragraaf sprak zichzelf dus tegen met de lijst achterin:
> de regel zei "er staat nu een gat open", de openstaande punten zeiden
> "opgelost". De regel zelf blijft staan, want de val is echt; alleen het
> voorbeeld is weg. De route heet nu `/admin/diagnose` en staat in de padtabel.

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
De onderbouwing van de ronde van 23 augustus staat in
`ARCHITECTUURAUDIT-23-AUGUSTUS.md`; `WERKLIJST.md` houdt bij wat er sindsdien is
gebeurd.

**Deze lijst is op 24 augustus 2026 punt voor punt tegen de code gelegd.** Van de
zes punten die er stonden, bleven er vier over: twee waren al gerepareerd zonder
dat deze lijst het meekreeg, en van een derde was de helft nooit waar. Dat laatste
is op zichzelf het punt dat hier het langst is blijven liggen: een lijst met
bekende openstaande punten veroudert sneller dan hij wordt bijgehouden, en dit is
uitgerekend de lijst waarvan een nieuwe lezer aanneemt dat hij klopt. Wat
hieronder staat is gemeten, met de datum erbij. Wie er iets aan toevoegt, zet erbij hoe het is vastgesteld.

1. **De wachtrij van het abonnement start niets.** `src/lib/account.js` belooft de
   abonnee dat de bovenste N automatisch starten; `queueTake()` en
   `queueLinkOrder()` in `subscription.js` hebben geen productie-aanroeper.
   *Nagemeten 24 augustus 2026 — klopt nog steeds, en het is groter dan het lijkt.*
   `verbruikToestaan()` en `verbruikBoeken()` staan er om dezelfde reden ongebruikt
   bij: alle vier horen ze bij één ontbrekende handeling, namelijk een wachtrij-item
   van een abonnee omzetten in een bestelling. Dat is géén ontbrekende aanroep in
   `/api/order` — dat eindpunt is anoniem en de sessiecookie staat op
   `Path=/account` (zie `account.js`, `COOKIE_FLAGS`), dus daar is niet vast te
   stellen wíé er bestelt. Saldo afschrijven op een getypt e-mailadres zou iedereen
   het saldo van een ander laten uitgeven. De plek is een adminhandeling of een
   scherm onder `/account`, waar de sessie al bestaat.

   *Opgelost, 29–30 augustus 2026.* Er staat sindsdien een slotmodel onder
   (migratie 0035, `subscription_slots` per soort per maand) en de ontbrekende
   handeling bestaat: `startPlanWindow()` in `src/lib/planStart.js` pakt de
   vastgezette items op en maakt er één bestelling van, met `queueLinkOrder()`
   als vierde stap. Die aanroep is er dus. `queueTake()` is verwijderd — hij gaf
   terug wat hij WILDE oppakken in plaats van wat hij oppakte, en dat is
   gevaarlijker dan geen functie. `verbruikToestaan()` is uit `startPlanWindow()`
   gehaald omdat de aanroep daar nooit gelopen heeft (`if (!verbruikToestaan(…))`
   op een functie die een object teruggeeft is altijd onwaar) én het verkeerde
   toetste: doorgeschoven slots vallen buiten de toekenning van deze maand.
   Het plafond staat nu in de SQL waar het hoort, en
   `tests/abo-misbruik.test.mjs` legt vast dát het daar staat.

2. **`migrate.mjs` houdt geen register** van wat er gedraaid is en beslist op
   schema-introspectie — zie §4.4. Voor de genummerde reeks werkt dat; voor de vier
   `MIGRATIE-*-PLAKKEN.sql` bestaat helemaal geen spoor.
   *Nagemeten 24 augustus 2026 — klopt.*

3. **Er is geen kanaaltoken voor het accent** — zie §8.
   *Nagemeten 24 augustus 2026 — klopt.*

4. **Geen pariteitstest voor EN/NL-sleutels** — zie §11. Er is geen enkele suite
   die de twee talen naast elkaar legt op ontbrekende sleutels.
   *Nagemeten 24 augustus 2026 — klopt, en er is inmiddels bewijs dat het nodig is:
   op 24 augustus stond in de tredetabel Nederlands "Normale doorlooptijd" en Engels
   "Standard queue" — twee cellen naast elkaar die niet hetzelfde beloofden, in een
   tabel die er juist is om het verschil zichtbaar te maken. Niets ving dat af.*

5. **De revisieronde is gebouwd, en dit is wat er nog niet in zit.**
   De belofte (*"1 revision round included per order"*) heeft sinds 24 augustus
   2026 gedrag: migratie 0034 zet `revision_round_at/_note/_count` op `orders`,
   `revisionRoundState()` in `src/data/pricing.js` is de enige poort, en beide
   klantschermen — het gemailde portaal en het ingelogde dashboard — laten de
   klant in één keer aanvinken wat niet goed is en dat als één ronde versturen.
   Daarna verdwijnt het formulier en verschijnt er een WhatsApp-link. In het
   beheer komt de ronde binnen als één kaart in plaats van als losse meldingen.
   `tests/revisieronde.test.mjs` draait dat tegen een echte SQLite met de echte
   `schema.sql`.
   *Gebouwd en nagemeten 24 augustus 2026.*

   > *Correctie, 30 augustus 2026.* De zin hierboven — "beide klantschermen …
   > laten de klant in één keer aanvinken" — was op 24 augustus maar voor de
   > hélft waar. Het gemailde portaal deed het; het ingelogde dashboard niet.
   > `account.js` nam de oude `action=revise` nog steeds aan (de losse revisie
   > per beeld, die de ronde niet afschreef en dus onbeperkt herhaalbaar was),
   > de aanvinkvakjes bleven staan als de ronde al op was, en de nakijkstap
   > bestond er niet. `tests/revisieronde.test.mjs` wist dat: die suite stond op
   > 71 van de 92. Alle drie zijn op 30 augustus gebouwd en de suite staat op
   > 92/92.
   >
   > Dit is precies de fout die dit document elders beschrijft als "een belofte
   > zonder gedrag eronder", en hij stond in de lijst die daarvoor bedoeld is —
   > afgevinkt, terwijl de toets ernaast rood stond. Een punt is pas klaar als
   > zijn eigen suite groen is.

   **Wat er bewust NIET in zit, en waar je dus op moet letten:**

   - **De grendel is de kolom, niet de poort.** De UPDATE draagt
     `WHERE revision_round_at IS NULL` en er wordt gekeken of hij een rij raakte.
     Twee tabbladen die tegelijk versturen komen allebei door de poort — de
     database beslist wie de eerste was. Wie die WHERE weghaalt, haalt de enige
     echte bescherming weg; de toets zegt het.
   - **Bestaande bestellingen beginnen leeg en houden dus hun ronde.** Ook die
     waar onder de oude, onbeperkte belofte al revisies op zijn aangevraagd. Dat
     is met opzet de ruimhartige kant — zie de noot in migratie 0034.
   - **`customers.revisions_revoked_at` blijft een ander ding.** Dat is de
     noodrem van de studio over alle bestellingen van één klant heen; de nieuwe
     kolommen zijn een feit over één bestelling. Ze door elkaar halen zou een
     klant die twee keer bestelt één ronde in totaal geven.
   - **Er is geen weg terug voor de klant en wel voor de studio.** Een ingediende
     ronde kan alleen ongedaan worden gemaakt door `revision_round_at` in de
     database op NULL te zetten. Er is bewust geen knop voor: een knop die de
     ronde teruggeeft, is de ronde niet begrenzen.
   - **De ronde en het afronden van een bestelling raken elkaar niet.** Beelden
     die niet zijn aangevinkt blijven `pending` en kunnen gewoon goedgekeurd
     worden; `maybeCloseOrder()` is ongewijzigd.

### Wat hier stond en niet meer waar is

Bewaard en niet weggehaald, want een punt dat stilletjes verdwijnt laat de vraag
open of het is opgelost of vergeten.

- ~~`functions/api/webhook/stripe.js` slikt een schrijffout in als "dubbele
  levering" en antwoordt 200.~~ **Gerepareerd op 23 augustus 2026.** De handler
  onderscheidt nu een unique-constraint van elke andere fout en antwoordt 500 op
  al het andere, zodat Stripe opnieuw aanbiedt; de redenering staat in de kop van
  dat bestand.
- ~~`migrations/0024-sample-payer.sql` ontbreekt.~~ **Was onjuist.** Het bestand
  staat er en `npm run migrate` meldt zelf `overgeslagen — orders.payer_hash
  bestaat al`. De kolom is er dus en de "één proefvisual per betaler"-controle
  draait. Alleen de eerste helft van die zin — er is geen register — bleef staan,
  en is nu punt 2.
- ~~`functions/admin/debug-mollie.js` is een tijdelijk bestand dat op een GET twee
  echte betalingen aanmaakt.~~ **Opgelost op 23 augustus 2026.** Dat bestand
  bestaat niet meer; de route is `/admin/diagnose` geworden, staat in de padtabel
  (en erft dus de sessiecontrole en `originIsSelf()`), en is gesplitst naar
  werkwoord — wat alleen kijkt is een GET, wat bij Mollie iets aanmaakt is een
  POST. De vormcontrole van de secrets is gebleven, want die bleek het nuttigste
  deel.
