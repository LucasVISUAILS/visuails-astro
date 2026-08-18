# VISUAILS — analyse en herontwerp van de voorkant

Lucas, 17 augustus 2026: *"De website voelt enorm chaotisch en ik zelf weet soms
niet eens waar alles staat en wat belangrijk is. […] Wat ik uiteindelijk wil
ervaren is een rustigere site en op de homepage wat minder tekst."*

Dit document is de diagnose en het plan. Niets hiervan is gebouwd; er staat wat er
mis is, waarom het mis is, en wat de opbouw wordt. De uitvoering volgt daarna, in
stukken die elk apart te bekijken zijn.

---

# DEEL 1 · DE DIAGNOSE

## 1.1 Wat er werkelijk chaotisch is, en het is niet wat het lijkt

De site heeft **36 routes in twee talen** — 94 pagina's inclusief de
stijlvarianten. Het menu bovenin heeft **zes plekken**. Alles wat niet in die zes
paste, is in de voettekst beland: **vijfentwintig links, in vier kolommen, zonder
rangorde.**

Daar zit het probleem, en het is een structuurprobleem en geen smaakprobleem. Acht
pagina's van echt gewicht bestaan alleen in de voettekst:

`/how-it-works` · `/studio` · `/portal` · `/compare` · `/faq` · `/ai-act` ·
`/guides` · `/about`

En twee pagina's hebben helemaal geen plek in de navigatie — ze bestaan alleen als
zin in een alinea ergens:

`/models` (de tien standaardmodellen) · `/upload-guidelines` (hoe je aanlevert)

En één pagina is volledig wees: **`/demo` heeft nul inkomende links** en staat ook
niet in de sitemap. Hij is alleen te bereiken door de URL te typen.

Dat is precies waarom je zelf niet meer weet waar alles staat. Het is niet dat er
te veel is — het is dat er **geen lagen** zijn. Elke pagina is even belangrijk als
elke andere pagina, want ze staan allemaal naast elkaar in dezelfde voettekst.

## 1.2 De site heeft vier soorten pagina's, en dat is nergens te zien

Als je de 36 routes op hun functie sorteert in plaats van op waar ze nu staan,
vallen ze schoon in vier lagen:

**WAT WE MAKEN** — het aanbod.
`/catalog` (+2 stijlen) · `/lifestyle` (+5 looks) · `/video` (+4 stijlen) ·
`/custom-models` · `/gallery` · Hooks (nog niet)

**HOE HET WERKT** — de laag die het bezwaar wegneemt. *Deze laag heeft nu geen huis.*
`/how-it-works` · `/studio` · `/portal` · `/compare` · `/models` ·
`/upload-guidelines` · `/ai-act` · `/demo`

**WAT HET KOST** — de commerciële laag.
`/pricing` · `/start` (+6 stromen) · `/test-sample`

**WIE WE ZIJN & DE KLEINE LETTERS**
`/about` · `/contact` · `/faq` · `/guides` · `/privacy` · `/terms` ·
`/data-processing-agreement` · `/cookie-policy`

De tweede laag is de belangrijkste van de site — je verkoopt aan merken die
*"arriveren sceptisch in plaats van nieuwsgierig"* (PRODUCT.md), en dit is precies
de laag die scepsis wegneemt. Het is ook de laag die nu volledig onzichtbaar is.

## 1.3 De homepage is een inhoudsopgave die is uitgeschreven

**Zeventien secties. ±2.520 woorden uitgeklapt, ±2.010 ingeklapt.** Dat is geen
homepage meer, dat is een brochure.

En het zwaarste deel ervan bestaat al ergens anders. Vijf secties zijn een
dedicated pagina, nog een keer:

| sectie op de homepage | woorden | staat óók op |
|---|---|---|
| Prijsband | 246 | `/pricing` — dezelfde ladder uit dezelfde `pricing.js` |
| FAQ-band | 268 | `/faq` — **letterlijk dezelfde objecten** uit `faq.js` |
| Bezwaren | 137 | `/faq` — de code zegt zelf: *"wording is lifted from faq.js"* |
| Diensten-tegels | 193 | `/catalog`, `/lifestyle`, `/video`, `/custom-models` |
| Proefvisual | 147 | `/test-sample` |
| Dashboard-band | 146 | `/portal` en `/studio` |

Dat is **1.137 woorden die de bezoeker een tweede keer leest**, of — erger — die
hem het gevoel geven dat hij de rest van de site niet meer hoeft te bekijken.

De vijf zwaarste secties bij het scrollen zijn: prijs (187), diensten (193), de
week die je terugkrijgt (176), proefvisual (147), dashboard (146).

## 1.4 Abonnementen staan er praktisch niet

Eén zin. **Dertig woorden**, als voetnoot onder de prijsband, zonder kop, zonder
tegel, zonder eigen knop:

> *"Ordering every month rather than every season? Three monthly plans, from €X for
> 5–30 products a month, each priced below the price per product for the same
> output."*

Dat was een bewuste keuze, en de code legt uit waarom: *"Two plan grids on one site
is one grid too many, and the homepage was the copy that would go stale"* en *"a
fifth tile selling a PAYMENT SHAPE next to four tiles selling WORK was a category
error anyway."*

**Beide argumenten kloppen nog, en ze pleiten niet tegen wat je nu wil.** Ze pleiten
tegen een tweede prijsraster op de homepage. Wat er komt is geen raster van drie
tegels met prijzen — het is één band met één idee en één getal. Zie §2.4.

---

# DEEL 2 · WAT ER STUK IS

Gerangschikt naar wat een klant als eerste raakt. Elk punt is een vindplaats, geen
vermoeden.

## 2.1 De homepage belooft een levertijd die geen andere pagina herhaalt ⚠️

`HomeV2.astro:489` zegt **"binnen 24 tot 48 uur"**. Elke andere pagina zegt
`turnaround('unattended')` = **"doorgaans 2–4 werkdagen"** — `/catalog`,
`/lifestyle`, `/how-it-works`, `/compare`.

Een bezoeker die van de homepage naar `/catalog` klikt, ziet de belofte ongeveer
verdubbelen. En `/studio` maakt het pijnlijk: die pagina opent met *"Anyone can put
'48 hours' on a website."*

**Dit is de ernstigste vondst van de hele analyse**, want het is geen opmaakfout maar
een commerciële belofte waar een klant je aan kan houden. Het is ook het enige punt
in dit document waar ik niet zelf mag kiezen welke waar is.

## 2.2 De vier "felle vlakken" zijn twee keer groen en twee keer grijs

`--fill-blue`, `--fill-violet`, `--fill-pink`, `--fill-coral` in `global.css`
verwijzen nu allemaal naar lime, lime-donker, wit 66% en wit 40%. De lezers
verwachten nog vier kleuren: de vier stapnummers in de procesband, `.tile-c-*`,
`.w-*`.

Gevolg: **twee van de vier stappen zien er identiek uit.** En `DESIGN.md`'s eigen
regel — *"nooit twee keer dezelfde tint"* — is niet meer te halen.

## 2.3 Dezelfde toestand in drie verschillende oranjes

"Moet nagekeken worden / vol" rendert als `#E9963B` (FigBoard, FigGate, FigStudio),
als hardgecodeerd `#E0A33A` (FigFlow, FigWalk) en als `#b8860b/#e0a92b` (DemoGame).
Op `/how-it-works` en `/studio` staat dus dezelfde toestand in twee kleuren.

## 2.4 De Nederlandse galerij is een andere pagina dan de Engelse

`nl/gallery.astro` heeft een extra `<h2>Voor & na.</h2>`-sectie die de Engelse niet
heeft. De taalschakelaar verandert de opbouw van de pagina, niet alleen de taal.

## 2.5 Zeven blokken tekst staan twee keer, terwijl de code zegt van niet

Tussen `CatalogPage` en `LifestylePage` staan zeven identieke alinea's — de
ladderregel, het wachtrij-antwoord, de venstertoezegging, het ladder-FAQ-antwoord.
En op `CatalogPage:550` staat een opmerking die beweert dat dit *"one shared
component, not a paragraph pasted into each service page"* is. Dat is precies wat
het wél is.

## 2.6 Twee componenten tekenen dezelfde grafiek

`FigGate.astro` (392 regels, gebruikt door `/studio`) en `FigStudio.astro` (552
regels, gebruikt door de homepage) tekenen allebei dezelfde capaciteitsbalken met
dezelfde zin eronder, in net iets andere opmaak. **944 regels voor één figuur.**

En `DemoGame.astro` (381 regels, met een eigen `<h1>`) wordt door niets
geïmporteerd. Net als `HooksPage.astro`, een volledige pagina die nergens rendert.

## 2.7 Twee `<h1>`'s op /thank-you

`thank-you.astro:41` en `:62`. De tweede staat in een verborgen div en krijgt een
andere opmaak, dus de geannuleerde toestand heeft zichtbaar een andere paginatitel.

## 2.8 Doorschuifmaanden: één keer getypt, één keer afgeleid

`PlanPicker.astro:171` typt *"drie maanden doorschuiven"*; `pricing.js:1148` rendert
*"schuift 1 maand door"*. Allebei in één sessie te zien. De juiste functie bestaat
en wordt hier niet gebruikt: `rolloverMonths(termId)`.

## 2.9 Getypte aantallen die breken zodra een lijst groeit

- `/start`: *"in one of **four** house styles"* — `styles.js` heeft er **vijf**.
- `/lifestyle`: *"**Vier** vaste looks"*, twee keer.
- `/start`: *"**Three** services the studio does that a form cannot price"*.
- `/studio`: *"One order of **thirty** products asks for **fifteen** on each"* — met
  in dezelfde zin twee waarden die wél uit `capacity.js` komen.

`/ai-act` doet het goed (*"If we build more, this list grows"*) — dat is het patroon.

## 2.10 De portal en de site noemen hetzelfde anders, en soms omgekeerd

| token | `global.css` | `account.css` |
|---|---|---|
| `--ink-900` | bijna-zwart | **`#FFFFFF`** |
| `--brand` | lime | **wit** |
| `--surface-2` | `#1F2229` | `#101216` |
| `--ink-4` | wit 52% | wit 22% |
| `--line-ui` | wit 42% | wit 55% |

`--ink-900` heeft in de twee bestanden **tegengestelde waarden**. Elke regel die je
van de site naar de portal verplaatst, keert om.

## 2.11 DESIGN.md beschrijft een site die niet meer bestaat

Het document noemt het lime-accent **nergens**. Grep op `C6F100`, `lime` of `groen`
geeft nul resultaten. Het beschrijft `--accent: #90BEFF` (lichtblauw), vier
gekleurde vlakken die niet meer bestaan, gradiënten die verwijderd zijn, een
radius-schaal van 16/8/4 terwijl de code 24/14/8 heeft — en het spreekt zichzelf
tegen, want vierhonderd regels verderop staat 24/14/8 wél goed. Het verwerpt
"success green" als kleur, terwijl het hoofdaccent nu groen is.

Een ontwerpdocument dat de code tegenspreekt, is erger dan geen ontwerpdocument:
iemand kopieert er een waarde uit.

---

# DEEL 3 · DE NIEUWE OPBOUW

## 3.1 Het uitgangspunt

> **Lagen in plaats van lijsten.** De site heeft niet te veel pagina's. Hij heeft er
> vier soorten en toont er één.

En voor de homepage:

> **Elke sectie laat iets zien wat je niet uit een link kunt halen — of hij wórdt
> een link.**

Dat is de hele redactionele regel, en hij haalt de 1.137 dubbele woorden weg zonder
één feit van de site te verwijderen, want elk van die feiten heeft al een eigen
pagina die het beter zegt.

## 3.2 De navigatie: één plek erbij, acht pagina's een huis

Het menu krijgt **één extra ingang**, en die ingang is de laag die nu ontbreekt:

```
VISUAILS      Wat we maken ▾    Hoe het werkt ▾    Prijzen    Galerij    Contact      [ Inloggen ]  [ Bestellen ]
```

**Wat we maken ▾** (bestaat al, ongewijzigd)
Catalog · Lifestyle · Video · Hooks (binnenkort) · Je merkmodel

**Hoe het werkt ▾** (nieuw — de acht dakloze pagina's)
Van bestelling tot levering (`/how-it-works`) · Hoe een bestelling draait
(`/studio`) · VISUAILS Studio, de portal (`/portal`) · De modellen (`/models`) ·
Aanleveren (`/upload-guidelines`) · Shootdag vs VISUAILS (`/compare`) · AI Act &
transparantie (`/ai-act`)

`Galerij` blijft een eigen plek, want dat is bewijs en geen uitleg — en het bewijs
hoort volgens je eigen ontwerpprincipe vóór de belofte te komen.

**De voettekst wordt daarmee wat een voettekst hoort te zijn:** geen tweede
navigatie maar een afsluiting. Vier kolommen worden drie — Wat we maken, Bedrijf
(over, gidsen, FAQ, contact), Contact & sociaal — plus de juridische balk. Alles wat
in de nieuwe tweede dropdown staat, verdwijnt uit de voettekst. Van 25 links naar
ongeveer 15.

## 3.3 De homepage: van 17 secties naar 12, van ±2.010 naar ±1.450 woorden

Wat er weggaat, gaat weg omdat het elders staat — en er komt één ding bij.

| # | sectie | nu | wordt | waarom |
|---|---|---|---|---|
| 1 | Hero | 83 | **83** | ongewijzigd |
| 2 | Voor & na | 130 | **110** | het bewijs. Blijft, iets korter |
| 3 | Wat we maken | 193 | **150** | vier tegels blijven, de Hooks-uitlegpaneel van 165 woorden wordt één regel + link |
| 4 | Voor wie | 179 | **120** | de "waarschijnlijk niet voor jou"-lijst blijft (die kwalificeert), de rest korter |
| 5 | Prijs | 246 | **110** | **de ladder blijft** — een getal noemen is een ontwerpprincipe. De drie uitgewerkte totalen en de btw-uitleg gaan naar `/pricing` |
| — | **ABONNEMENT** | — | **+130** | **nieuw. Zie §3.4** |
| 6 | Proefvisual | 147 | **90** | de €1 blijft de eerste knop van de site; de uitleg staat op `/test-sample` |
| 7 | Van map tot lancering | 98 | **98** | ongewijzigd — vier stappen, geen tekstblok |
| 8 | Een klein merk | 60 | **60** | ongewijzigd. De adempauze |
| 9 | De week die je terugkrijgt | 176 | **130** | blijft; dit is het beste argument op de pagina en staat nergens anders zo |
| 10 | Elke plek waar het heen moet | 101 | **101** | ongewijzigd |
| 11 | Eén gezicht | 102 | **102** | ongewijzigd |
| 12 | Na je bestelling | 146 | **95** | één schermafdruk in plaats van twee, één knop in plaats van drie |
| 13 | Werk terug vanaf je lanceerdatum | 144 | **110** | de kalender blijft, de uitleg korter |
| 14 | Bezwaren | 137 | **0** | ↓ samengevoegd |
| 15 | FAQ | 268 | **45** | ↓ 14 + 15 worden één blok: drie vragen die kopen tegenhouden, en één link naar `/faq`. **De 268 woorden staan letterlijk al op `/faq`** |
| 16 | Nog geen recensies | 101 | **101** | ongewijzigd. Eerlijkheid is hier het product |
| 17 | Afsluiting | 41 | **41** | ongewijzigd |

**Ingeklapt: ±2.010 → ±1.456 woorden**, mét een nieuwe sectie erbij. Er verdwijnt
geen enkel feit van de site — alles wat weggaat, staat op de pagina waar het
thuishoort, en die pagina's zijn vanaf nu ook echt te vinden (§3.2).

## 3.4 Het abonnementsblok

Eén band, tussen de prijs en de proefvisual. Dáár, omdat een abonnement een andere
manier van betalen is voor wat je net hebt gelezen — niet een vijfde dienst.

**Wat er staat:** één kop, één zin over wat het is, **één getal** (de laagste
maandprijs), drie korte feiten (vast aantal per maand · je eigen week · onder het
tarief per product), en twee knoppen: *Bekijk de abonnementen* → `/pricing#plans` en
*Direct afsluiten* → `/start/plan`.

**Wat er níét staat:** drie tegels met drie prijzen. Dat was de reden dat de vorige
band eruit ging, en die reden klopt nog steeds — een tweede prijsraster veroudert op
de plek waar niemand het bijhoudt. Eén getal, uit `plans.js`, en de rest op de
prijspagina.

## 3.5 De verweesde pagina's

- **`/demo`** — nul inkomende links, niet in de sitemap. Hij is er en niemand kan
  hem vinden. Voorstel: één link vanuit de nieuwe "Hoe het werkt"-dropdown, of weg.
  Jouw keuze; zie de vraag onderaan.
- **`/models` en `/upload-guidelines`** — krijgen een plek in de nieuwe dropdown.
- **`/about`** — heeft nul inkomende links behalve de voettekst. Krijgt een link
  vanuit "Nog geen recensies" op de homepage, want dáár wil iemand weten wie dit
  maakt.
- **11 stijlpagina's** (`/catalog/[slug]` enz.) — zijn alleen vanuit hun eigen
  overzicht te bereiken, nooit vanuit een zusterpagina. Krijgen onderaan een rij
  "andere looks", zodat iemand die op `/lifestyle/glow` staat verder kan.
- **`HooksPage.astro` en `DemoGame.astro`** — 762 regels componentcode die niets
  rendert. Weg, of `HooksPage` aansluiten zodra Hooks bestaat.

## 3.6 VISUAILS Studio — de portal

De mockup levert de vórmtaal, niet het kleurenschema en niet de inhoud.

**Wat er wordt overgenomen:**
- **Een bovenbalk per pagina**: paginanaam links, één primaire actie rechts, en
  ertussen één statuschip (bij een abonnee: je week; bij een losse klant: je
  lopende bestelling). Nu begint elke sectie met een kale `<h1>`.
- **Icoontegel + kleinkapitalen label + groot getal** als vaste vorm voor elk
  cijfer. Dat is de sterkste vondst in de mockup en het maakt de vier tellers op
  het overzicht in één oogopslag leesbaar.
- **De nudge-kaart** bovenaan, die verdwijnt zodra hij af is.
- **De activiteitenlijst met statuspillen** — bestaat al, krijgt de rustiger vorm
  uit de mockup.
- **Het "deze maand"-blok** als afsluiting van het overzicht.

**Wat er niet wordt overgenomen, en waarom:**
- **Het paars/cyaan/roze kleurenschema.** Jouw palet is lime op bijna-zwart, en de
  vier "felle vlakken" bestaan niet meer (§2.2). Onderscheid tussen de soorten werk
  komt van het icoon en het woord, niet van vier kleuren.
- **"Credits".** Dat is gereedschapstaal voor een fotoshoot van €790 per maand.
- **De bel met "3".** Er is geen meldingensysteem; er is e-mail.
- **Het staafdiagram zonder as.** Sier op een dashboard maakt de echte getallen
  minder geloofwaardig.
- **"Unused credits don't roll over".** Doorschuiven is een van de vier dingen die
  de jaartermijn koopt, en een harde reset verschuift het verbruik naar het eind van
  de maand — 94 producten in drie dagen, terwijl je er 15 per dag kunt.

**De harde beperking, en die verandert niets aan het bovenstaande:** de portal
draait onder `default-src 'none'` zonder `script-src`. **Er draait geen enkele
regel JavaScript.** Alles is `<details>`, formulieren en links. En `style-src 'self'`
blokkeert ook inline stijl-attributen — dat heeft dit jaar al twee keer een leeg
vak opgeleverd. Elke dynamische waarde blijft dus uit `style=""`: SVG-attributen of
vaste klassen, zoals `swatch()`, `ratioShape()` en `saldoMeter()` nu al doen.

Alle zeven secties, alle vijftien formulieren en alle zestien lege toestanden
blijven. De inventaris waartegen ik dat na afloop controleer, staat in de bijlage
van dit document.

## 3.7 De volgorde van uitvoeren

1. **De levertijd rechtzetten** — één regel, en het is de enige die een klant geld
   kan kosten. Wacht op jouw antwoord.
2. **De navigatie** — de tweede dropdown, de voettekst opgeruimd, de wezen
   aangesloten. Raakt `Layout.astro` en `ui.js`; geen enkele pagina hoeft te
   verhuizen, dus geen enkele URL verandert en er gaat geen SEO verloren.
3. **De homepage** — sectie voor sectie, met een schermafdruk per stap.
4. **Het abonnementsblok.**
5. **De portal** — bovenbalk, dan overzicht, dan de rest.
6. **Het opruimen** — de dubbele componenten, de drie oranjes, de getypte aantallen,
   `DESIGN.md` bijwerken zodat hij de gebouwde site beschrijft.

---

# DEEL 4 · WAT ER GEBOUWD IS

Bijgehouden tijdens het uitvoeren, tegen de gebouwde site gecontroleerd en niet
tegen mijn geheugen. Datum: 18 augustus 2026.

## 4.1 Af

**1 · De levertijd.** `pricing.js` zegt op één plek *2–4 werkdagen* /
*2–4 working days*, en elke pagina leest die ene bron.

**2 · De navigatie.** De tweede dropdown staat. Alle acht dakloze pagina's
(`/demo`, `/models`, `/upload-guidelines`, `/compare`, `/ai-act`, `/studio`,
`/portal`, `/how-it-works`) hebben nu op elke pagina een inkomende link. De
voettekst is drie kolommen plus de juridische balk; alles wat in de nieuwe
dropdown staat, is eruit.

**3 · De homepage.** Van 17 secties naar 14, mét een nieuwe sectie erbij.

| wat | waarheen | hoe |
|---|---|---|
| Voor wie (§4) | `/about` EN + NL | nieuwe gedeelde `WhoItIsFor.astro` — woord voor woord mee |
| Elke plek waar het heen moet (§10) | `/how-it-works` | copy-sleutels `ch*` → `land*`, getallen blijven afgeleid |
| Werk terug vanaf je lanceerdatum (§14) | `/studio` | klassen `hv-pl` → `sp-pl`, `WINDOW_THRESHOLD` mee |
| FAQ-accordeon (§17) | opgegaan in de bezwarenband | 268 woorden die letterlijk al op `/faq` stonden |
| Drie uitgewerkte totalen + btw-uitklapper | `/pricing` | stonden daar al, uit dezelfde `quote()` |
| Tweede dashboardscherm (`FigStudio`) | eruit | tekende dezelfde balken als `FigGate` op `/studio` — §2.6 |

**4 · Het abonnementsblok.** Tussen de prijs en de proefvisual. Eén kop, één
zin, één getal (`PLAN_CHEAPEST` — bedrag én aantal uit hetzelfde plan), drie
feiten, twee knoppen naar `/start/plan` en `/pricing#plans`. Geen tweede
prijsraster, om de reden die in §3.4 staat.

**5 · De portal.** `topBar()` en `statTegel()` in `account.js`, gebruikt door
Overzicht, Bestellingen, Je vaste look, Je gegevens, Facturen en Abonnement.
Bovenbalk met paginanaam, één statuschip en één primaire actie; icoontegel +
kleinkapitalen label + groot getal voor elke teller. De nudge-kaart en de
saldometer stonden er al. Geen JavaScript, geen inline stijl-attributen — beide
gecontroleerd, niet aangenomen.

**Uit deel 2 ook af:** §2.2 (de vier felle vlakken zijn accent, accent-dim en
twee wittinten), §2.3 (de drie oranjes — acht `var(--warn, #b8860b)`-terugvallen
die iets ánders waren dan `--clay`, allemaal weg), §2.7 (twee `<h1>`'s op
/thank-you), §2.8 (doorschuifmaanden worden afgeleid via `rolloverDetail()`),
en `--ink-900` is één waarde.

## 4.2 Nog open

- **§2.4** De Nederlandse galerij heeft één sectie, één `h2` en acht beelden
  méér dan de Engelse.
- **§2.5** Negentien identieke lange regels tussen `CatalogPage` en
  `LifestylePage`.
- **§2.9** Getypte aantallen: "vier huisstijlen" tegenover `styles.js`, "drie
  diensten".
- **§2.10** "Credits" staat nog in `account.js` (`readCredits`, `withCredits`).
- **§2.11** `DESIGN.md` noemt nog drie keer `#90BEFF`.
- **§3.5** De elf stijlpagina's krijgen nog geen rij "andere looks".
- Zes figuren worden door niets geïmporteerd en stonden al zo vóór deze
  operatie: `FigApproval`, `FigCapacity`, `FigFanOut`, `FigFlow`, `FigFormats`
  en `FigPipeline`. Nog niet aangeraakt, want ze horen niet bij deze herbouw.

## 4.5 De ontwerpronde en de sweep — 18 augustus 2026

**Wat er aan het ontwerp is veranderd, en het is alle drie gemeten.**

*Te veel gecentreerd.* Zeven van de veertien homepagekoppen stonden in het
midden. Niet het aantal was het probleem maar de PLAATS: een gecentreerde kop
boven een links uitgelijnde tabel of een raster laat de bladspiegel twee keer
beginnen. De regel is nu: centreren alleen als wat eronder staat óók gecentreerd
is. Dat laat er twee over — de bekentenis over de recensies en het slotpaneel —
en juist doordat het er twee zijn, vallen ze op.

*Rommelige marges.* Onder de prijstabel van 940px stonden drie tekstbreedtes
(520, 490 en 400px) en een knoppenrij die op niets uitlijnde. Nu één raster:
noten links, knoppen uitgelijnd op de rechterrand van de tabel, alles op dezelfde
maat.

*Leegte.* Op `/pricing` was de `<h1>` 460px en de lede 420px, in een container
van 1240 — meer dan de helft van de eerste schermvulling leeg, op de pagina waar
de prijs staat. Paginakoppen mét een lede staan nu in twee kolommen: kop links,
lede rechts, op één onderlijn. Negenendertig pagina's, één regel, met
`:has(> .lead)` zodat de dertig koppen zónder lede onveranderd blijven. Getest op
1440, 1024, 900, 640 en 390px: geen overloop.

*Benauwdheid — en dit was de eerste keer overgeslagen.* Bij de eerste ronde is de
ritmiek gemeten (twee waarden, 72 en 130px), geconstateerd dat die uniform is, en
op basis van ÉÉN pagina geconcludeerd dat benauwdheid niet het probleem was. Dat
was te snel, en Lucas vroeg er terecht naar.

Opnieuw gemeten, nu over alle 44 Nederlandse pagina's en op twee breedtes: **439
kop-tekstparen, waarvan 219 onder de maat die de andere helft aanhoudt.**

| lucht onder een kop | vóór | ná |
|---|---|---|
| 0–6px (plakt) | 109 | **19** |
| 7–11px (krap) | 110 | 101 |
| 12–19px (goed) | 172 | **271** |
| 20–39px | 47 | 47 |
| 40+px (te ruim) | 0 | **0** |

De oorzaak is één keuze in `global.css`: elke kop en elke `<p>` krijgt
`margin: 0` en elk component regelt zijn eigen ruimte. Houdbaar zolang iedereen
eraan denkt — vijftig plekken waren één patroon, een `<h3>` in een kaart met nul
marge boven een alinea met nul marge, en dat is nooit een keuze geweest.

De reparatie is één regel met een bodem die niets overschrijft wat al goed staat.
**En de eerste versie ervan deed helemaal niets**, wat pas bij het nameten bleek:
met beide kanten in `:where()` was de specificiteit nul en won de `p { margin: 0 }`
hierboven. De verdeling na de wijziging was tot op het paar identiek aan die
ervoor. De doelkant staat nu in `:is()` — specificiteit één, gelijk aan de reset,
later in het bestand, dus hij wint; componenten met een klasse winnen nog steeds
van hem.

De 19 die overblijven zetten hun afstand zelf en zijn bedoeld. Eén was dat niet:
`.tool-h` op `/compare` heeft een lijn onder zich en de lijst begon daar op nul
pixels tegenaan — een kop met een streep eronder heeft die lucht harder nodig dan
een kop zonder, want zonder ruimte leest de streep als de bovenrand van de lijst.

De portal is er ook langsgegaan (die was bij de eerste ronde ontwerpmatig
overgeslagen) en heeft zijn eigen stylesheet met eigen afstanden; daar was niets
te repareren.

**Wat de sweep opleverde.**

- **De levertijdbelofte week per taal af.** EN beloofde *"a reserved 48-hour
  window"*, NL *"levering binnen 48 uur vanaf je leverdatum"* — een zwaardere
  toezegging, op veertien pagina's, in de taal van de thuismarkt. En in strijd
  met `capacity.js`, die letterlijk zegt dat 48 uur nooit als aftelling aan een
  klant wordt verteld: een venster dat vrijdag opengaat loopt vrijdag en maandag,
  dus 72 uur wandklok. NL zegt nu wat EN zegt.
- **`DESIGN.md` documenteerde elf kleuren die niet bestaan** — het accent
  (`#90BEFF`), de twee gradiënten en de vier felle vlakken uit §2.2. Een
  ontwerpbestand is het eerste waar iemand een waarde uit overneemt.
- **Een verouderde noot in `account.js`** die beweerde dat er geen abonnementen
  en geen betalingen waren. Alle drie de zinnen waren onwaar sinds augustus.
- **§2.10 was vals alarm.** `readCredits`/`withCredits` gaan over CREDITNOTA'S,
  niet over abonnementscredits. Dat staat nu in de code zodat het niet nog eens
  wordt opgeschreven als schuld.

**Wat er schoon bleek.** 87 pagina's gecontroleerd: precies één `<h1>` per
pagina, geen ontbrekende `alt`, geen dubbele `id`, geen link zonder naam, correcte
`lang` en `hreflang`, geen kapotte interne links, geen dode ankers, geen
ontbrekende beeldbestanden, geen JavaScript-fouten, geen onvertaalde Engelse
tekst op Nederlandse pagina's, en geen enkel contrastprobleem over tien pagina's
en honderden elementen. Alle EN/NL-paren zijn structureel identiek.

**Vier nieuwe vangnetten, alle vier bewezen door sabotage:** de twee talen mogen
niet verschillende levertijden beloven · getypte aantallen ("de tien gezichten",
"vier huisstijlen") worden tegen de echte lijsten gehouden · `DESIGN.md` mag geen
tokenwaarde noemen die `global.css` niet kent · en `pipeline.js` mag geen andere
contextplekken tonen dan `garments.js` uitrekent.

Twee van die vangnetten waren eerst LEEG en pasten door zonder iets te toetsen —
één las de importregel bovenaan een bestand, één las de commentaren van
`global.css`, waar het oude accent nog in stond. Beide keren bleek dat pas door
de fout er met de hand weer in te zetten. Dat is de enige manier waarop je een
vangnet controleert.

## 4.4 Het verwijderen van FigStudio en HooksPage, en wat dat blootlegde

Lucas, 18 augustus: *"check of je alles correct hebt toegepast dan verwijder ik
figstudio en hookspage."* Dat nakijken leverde vier dingen op die zonder het
nakijken stuk waren gegaan.

**1 · Twee testbestanden lazen die componenten van de schijf.**
`tests/figures.test.mjs` had `FigStudio` in twee lijsten staan en
`tests/nav.test.mjs` las `HooksPage.astro` voluit. `read()` is `readFileSync`,
dus die gooit ENOENT: **het weghalen van dode code zou de hele testsuite hebben
omgelegd, en pas ná het verwijderen.** `astro build` merkte er niets van, want
geen enkele pagina rendert ze. De verwijzing zat in het gereedschap en niet in
het product.

**2 · De Hooks-test is niet geschrapt maar omgedraaid.** Sectie 5 van
`nav.test.mjs` bewaakte de stille omzetting in `order.js` —
`ORDER_SERVICES.has(service) ? service : 'catalog'` — op één formulier. Hem
weghalen zou de enige bewaking daarop hebben opgeheven. Hij zoekt nu zélf elk
`.astro` dat naar `/api/order` post en toetst elke geposte `service`, elke
honeypot en elk `notify`-vinkje. Sterker dan hij was, en zonder afhankelijkheid
van een bestand dat weg mag. De eisen die alleen in `HooksPage.astro` stonden,
staan nu in `HOOKS-COPY-CONCEPT.md`.

**3 · `/nl/account` was een 404 op zeven Nederlandse pagina's.** Gevonden door
de linkcontrole. `ModelPicker.astro` en `OrderFlow.astro` haalden `/account`
door `lp()`, en er bestaat geen Nederlandse route — het is één Pages Function
die zijn taal uit de klantgegevens leest. **Exact dezelfde fout is op 28 juli
2026 in `Layout.astro` gevonden en gerepareerd**, met een noot van tien regels
erbij die precies uitlegt waarom. Die noot heeft deze twee niet tegengehouden,
want hij stond in een ander bestand. Sectie 11 van `nav.test.mjs` toetst het nu
over de hele bron.

**4 · "Volledige bedrijfsgegevens" landde op de verkeerde plek.** De
contactpagina's linkten naar `/terms/#top`. `#top` is geen echt anker maar een
speciaal geval in de HTML-standaard: de browser springt naar het begin van het
document. Dat wérkt — en het begin van de voorwaarden is de kop, terwijl de
bedrijfsgegevens een derde lager staan. De blokken hebben nu een eigen `id` en
de links wijzen daarheen.

**Nieuw vangnet, sectie 8 van `figures.test.mjs`:** elk letterlijk pad dat een
test opent, moet bestaan. Daarmee faalt de suite vóórdat iemand een bestand
weghaalt dat nog gelezen wordt, en zegt hij ook wélk bestand. Bewezen door het
te proberen: met `HooksPage.astro` weg meldt hij
`nav.test.mjs → src/components/HooksPage.astro`.

**En sectie "de vorm van elke sectie" in `account-brand-kit.test.mjs`:** alle
zes portalsecties, in beide talen, precies één `<h1>`, precies één bovenbalk,
nul inline `style`-attributen en nul `<script>`. Die laatste twee zijn geen
netheid maar de CSP: `style-src 'self'` blokkeert ook stijl-attributen, en dat
heeft dit jaar al twee keer een leeg vak opgeleverd.

**Uitkomst:** met en zonder de drie bestanden — `FigStudio.astro`,
`HooksPage.astro` en `FigHook.astro`, die laatste omdat alleen `HooksPage` hem
importeerde — bouwt de site 88 pagina's en draait de hele suite groen. Er zijn
nul kapotte interne links en nul dode ankers.

## 4.3 Eén ding dat is teruggedraaid, en waarom dat hier staat

De opsomming in "de week die je terugkrijgt" — casting, boeking, verzending,
het uitstel als het regent, de twee avonden schiften — is ingekort geweest met
de redenering dat hij op `/compare` staat. Op de gebouwde pagina nagekeken:
hij staat daar níét, in geen van beide talen. Het is de enige plek op de site
waar staat waaruit een shootweek bestaat, en dat is het argument van die band.
Teruggezet, met de controle als noot in `HomeV2.astro`.

Dat is de regel die deze hele operatie draagt en die één keer bijna is
overtreden: **iets mag alleen weg als het ergens anders staat, en "ergens
anders" is iets wat je nakijkt in `dist/`, niet iets wat je aanneemt.**
