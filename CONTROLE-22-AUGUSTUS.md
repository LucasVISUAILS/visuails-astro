# VISUAILS — controle van 22 augustus 2026

Twee dingen deze ronde: de acht merkbeelden op de homepage, en een volledige
controle van de site waarbij alles wat eruit kwam meteen is opgelost.

---

## 1. De merkbeelden op de homepage

Zes van de acht beelden staan nu op de homepage, en nergens anders. Ze zijn
verdeeld over drie plekken met oplopende nadruk, zodat de pagina niet druk wordt.

**Subtiel — het stemmingsraster (vier beelden).** In het blok over de studio
staat een raster van vier bij twee tegels: het breisel, het silhouet, de laarzen
en de rustscène. Ze zijn klein, dicht op elkaar (2 px tussenruimte) en dragen
geen tekst. Ze doen wat een moodboard doet: laten zien waar het werk vandaan
komt zonder er iets over te beweren. Ze staan als `aria-hidden`, want een
schermlezer heeft niets aan vier sfeerbeelden; het onderschrift eronder zegt wat
er te zien is.

**Sterker — de droomband.** Het trapportaal met de ene zuurgroene lichtbundel
staat schermbreed achter de band over wat een merkbeeld is. Dit is het enige
beeld met een echte `alt`-tekst, omdat het beeld hier iets betoogt in plaats van
alleen sfeer te maken.

**Het meest uitgesproken — de slotband.** Het lichtbad staat achter het laatste
blok van de pagina, op 55 procent dekking met een scrim eroverheen zodat de kop
en de knop erop leesbaar blijven.

De twee overgebleven beelden (de twee varianten met de puffer in de auto,
waarvan er één een duplicaat is) zijn niet gebruikt. Ze liggen klaar als je ze
ergens wilt hebben.

De foto achter het abonnementsblok is niet aangeraakt, zoals afgesproken.

---

## 2. Wat de controle vond, en wat eraan gedaan is

Er is deze ronde één nieuw meetinstrument bijgekomen en er zijn er twee
bijgesteld. De bestaande controles keken naar tekst, links, harde feiten,
NL/EN-paren en gestructureerde data. Wat niemand controleerde was de **bouw** van
de pagina zelf, en daar zaten de fouten.

### 2.1 De slash aan het eind — 5.911 links

Dit is de grootste vondst van vandaag, en hij stond al maanden zo.

De site bouwt met `build.format: 'directory'`. `/about` staat dus op schijf als
`/about/index.html`, en Cloudflare Pages serveert `/about` niet: het antwoordt
met een 308 naar `/about/`. Elke interne klik kostte daarmee een extra
heen-en-weer naar het netwerk vóórdat er ook maar één byte pagina kwam. Dat gold
voor 5.911 links — praktisch elke link op de site.

Erger dan de vertraging was dat de site zichzelf tegensprak. De `canonical` en de
`hreflang`-paren stonden er wél mét slash in, want die worden uit Astro's eigen
pathname gebouwd. Elke pagina wees een zoekmachine dus naar `/about/` terwijl
elke link op diezelfde pagina naar `/about` ging.

De oplossing zit op één plek: `localizedPath()` in `src/i18n/ui.js`, want dat is
de enige functie die een intern pad samenstelt. Eén regel dekt alle 5.911. Een
pad dat al een slash heeft blijft ongemoeid, een pad naar een bestand krijgt er
geen, en een `#anker` of `?vraag` wordt eerst afgeknipt en er daarna weer achter
gezet. De functieroutes (`/account`, `/api`, `/o`, `/admin`) komen daar niet
langs — dat zijn Pages Functions en geen mappen op schijf, en een slash erachter
zou ze breken.

Daarna bleven er nog 195 losse links over die niet via die functie liepen: harde
paden in de juridische pagina's, `orderHref` in de stijltabellen, en de
`href`-velden in de gidsenlijst. Die zijn stuk voor stuk nagelopen. Nu staat de
teller op nul.

Wat dit kost aan de kant van de bezoeker: één netwerkronde minder per klik. Op
een telefoon over 4G is dat ergens tussen de 50 en 150 ms per pagina.

### 2.2 De accountlink verloor de taal

In de navigatiebalk stonden twee accountlinks naast elkaar: die voor een
uitgelogde bezoeker met `?lang=nl` erachter, en die met de naam van de ingelogde
klant — zónder. Zes plekken in totaal: beide navigatiebalken, de bedankpagina,
de abonnementskiezer, de modellenkiezer en de bestelstroom.

Een Nederlandse klant die op zijn eigen naam klikte kwam dus in de Engelse
accountomgeving terecht. In de praktijk ving de `referer` dat meestal op, maar
"meestal" is precies het probleem: die kop verdwijnt bij een privacy-instelling,
bij een omleiding, en bij openen in een nieuw tabblad. Alle zes dragen nu de
taal.

### 2.3 Drie logo's zonder naam, één knop zonder tekst

De nieuwe bouwcontrole (`npm run audit:bouw`) gaf 501 meldingen. Na het
wegfilteren van wat géén fout was, bleven er vier echte over:

- **De merklink in de voettekst had geen toegankelijke naam.** De link in de kop
  heeft `aria-label="VISUAILS home"`, die in de voettekst niet. Een schermlezer
  las daar alleen "VISUAILS" — niet te onderscheiden van de link in de kop, en
  zonder te zeggen dat het de home-link is.
- **Drie merktekeningen kondigden zichzelf apart aan.** In de kop, in de
  voettekst en in de conversiebalk stond `role="img" aria-label="VISUAILS"` op de
  SVG binnen een link die zelf al een naam heeft. Dat is één aankondiging te
  veel. De tekeningen staan nu op `aria-hidden`; de link draagt de naam.
- **De knop "Nog een product toevoegen" stond leeg in de HTML.** `pipeline.js`
  zette de tekst er pas in na het laden. Tot dat moment — en als het script nooit
  draait — rendert er een lege spookknop die een schermlezer als "knop"
  aankondigt zonder te zeggen wat hij doet. De tekst staat nu in de pagina, en de
  knop begint verborgen tot het script beslist heeft of hij nodig is.

De overige 497 meldingen waren fouten in de controle zelf, en die zijn
gerepareerd voordat het getal iets waard was: een SVG met `aria-label` in een
link levert wél een naam op, een honeypot-veld en een verborgen waardedrager
hebben geen label nodig, een `<button>` zonder `type` is alleen gevaarlijk binnen
een `<form>` (daar staat er geen enkele), en de Nederlandse 404 wordt met en
zonder slash weggeschreven en is dus geen dubbele titel.

### 2.4 Spelling — alle 91 pagina's, in beide talen

De spellingcontrole leest elke gebouwde pagina met hunspell, in de taal van die
pagina, inclusief de `alt`-, `aria-label`- en `title`-teksten. 251 woorden waren
onbekend; die zijn stuk voor stuk in hun zin nagelezen. Verreweg de meeste zijn
eigen vaktaal (catalogset, proefvisual, shootdag, packshot, herkomsttag) of
merknamen, en die staan nu in de woordenlijst van het instrument.

Zes echte fouten, allemaal Nederlands, allemaal gecorrigeerd:

| was | is |
|---|---|
| Ingeh**ou**denheid is de stijl | Ingetogenheid is de stijl |
| afgestemd om aspirationeel te voelen, niet geënsceneerd | die aantrekkelijk aanvoelen, niet in scène gezet |
| één beeld dat terug**moet** | één beeld dat terug moet |
| textuur, **weving** en glans | textuur, weefselstructuur en glans |
| de **weving**, de wassing, de glans | de weefselstructuur, de wassing, de glans |
| een vlakke, **ongegradede** scène | een vlakke, ongegradeerde scène |

Twee dingen die eruitzagen als fouten en het niet zijn: **pasnaad** is het juiste
vakwoord voor wat in het Engels een *yoke seam* heet, en de hoofdletters in
**Ma–vr** en **Za–zo** op de contactpagina zijn correct Nederlands.

Daarnaast een aparte controle op Brits versus Amerikaans Engels over alle Engelse
pagina's. Het Engels is overal consequent Brits — *colour* (71×), *licence*
(17×), *jewellery*, *grey*, *cancelled*, *favourite* — met precies één
uitzondering: één *catalogs* tegenover één *catalogues*, beide in de betekenis
"winkelcatalogi" en niet als productnaam. Die staat nu ook op *catalogues*, zodat
de kleine letter Brits blijft en de hoofdletter `Catalog` de productnaam blijft.

### 2.5 Twee metingen die zelf niet klopten

Twee bestaande controles gaven getallen die niet waar waren, en die zijn
gerepareerd — een meetinstrument dat ruis geeft wordt niet meer gelezen.

- **Het telefoonnummer leek in twee vormen te bestaan.** Op `/privacy` stond
  volgens de feitencontrole `+31 6 25436130 2`. Er stond nooit iets fout op de
  pagina: de tekstuitlezing plette de blokgrenzen tot spaties, waardoor het
  nummer doorliep in het kopnummer van de paragraaf erna ("2. What data we
  collect"). De blokgrenzen blijven nu staan.
- **De doorlooptijden leken tussen de talen te verschillen.** "48 uur" op
  veertien Nederlandse pagina's tegenover "48 hours" op één Engelse. De Engelse
  tekst schrijft *48-hour* met een koppelteken en dat patroon werd niet herkend.
  Nu telt elke doorlooptijd in beide talen gelijk op.

### 2.6 Gewicht

De vier tegels van het stemmingsraster werden aangeleverd op 1600 px en 1200 px
breed, terwijl ze op het scherm nooit breder worden dan 183 px — de breedste van
alle vijf gemeten vensterbreedtes. Dat is 8,7 keer te groot voor het breisel en
6,6 keer voor de laarzen. Ze zijn onder dezelfde naam verkleind naar 760 px, wat
diezelfde 183 px nog dekt bij vier keer de pixeldichtheid. **306 kB → 116 kB.**

De foto achter het abonnementsblok werd op elk scherm als één bestand van 2400 px
opgehaald, ook op een telefoon van 390 px breed — `background-image` kent geen
`sizes`. De 1400-variant lag er al en werd nergens aangeroepen. Onder 900 px
gebruikt het blok die nu. **122 kB → 29 kB webp op een telefoon.**

Wat blijft staan, en waarom: de keuring meldt nog 83 beelden die samen 6,5 MB
groter zijn dan ze getoond worden — de lifestylegalerijen en de modelfoto's.
`npm run krimpen` rekent uit dat daar 10,2 MB webp uit te halen valt (plus de
AVIF's ernaast). Ik heb dat niet uitgevoerd: het verkleinen van elk beeld op de
site verandert élk screenshot in de visuele vangrail, en dan kan die vangrail
vanavond geen onderscheid meer maken tussen "veranderd omdat de beelden kleiner
zijn" en "veranderd omdat er iets stuk is". Dat is precies de controle die je aan
het eind vroeg. De rekensom staat klaar; `npm run krimpen -- --doen` voert hem
uit, gevolgd door `npm run avif && npm run build && npm run visueel:ijk`.

### 2.7 Grotere tekst — 31 fouten die alleen zichtbaar zijn als je de letter opzet

Dit is de tweede grote vondst. De meting zet de tekstgrootte van de browser op
150 en 200 procent — de instelling die iemand met minder scherpe ogen gewoon
áán heeft staan — en kijkt dan of de pagina zijwaarts gaat schuiven of tekst
afsnijdt. Er kwamen 31 plekken uit, en ze hadden alle 31 dezelfde twee oorzaken.

**Oorzaak één: een rasterbaan krimpt niet vanzelf.** `1fr` is de korte
schrijfwijze van `minmax(auto, 1fr)`, en die `auto` als ONDERgrens betekent:
nooit smaller dan de min-content van wat erin staat. Eén lang Nederlands woord
zet die ondergrens hoger dan de baan zou krijgen, en het raster loopt de pagina
uit. Dat is dezelfde valstrik die de tabellen op de videopagina's eerder trof.
Gerepareerd met `min-width: 0` op `.arrow-rows`, `.two-col`, `.mp-opt`, de
stappenbalk en de knoppenrij onder `/start`.

Daar zat één echte bug bij die niets met zoom te maken had: op vier pagina's
stond het tweekolomsraster als `style="grid-template-columns:repeat(2,1fr)"` IN
de markup, en een stijl in het element wint van elke mediaquery. Die twee
kolommen klapten dus op **geen enkele** breedte samen. Precies dezelfde valstrik
als `.two-col.hero-split` van gisteren, alleen met een inline stijl in plaats van
een specificiteitsverschil. Het staat nu als klasse, en de mediaquery doet wat
hij altijd bedoelde.

**Oorzaak twee: een drempel in `px` beweegt niet mee met de tekst.** Een
`minmax(16rem, 1fr)` groeit wél mee (16rem wordt 384 px bij 150 procent), maar de
mediaquery die hem zou moeten opvangen staat in `px` en blijft staan. Alle 23
rasters van dat type hebben nu `minmax(min(16rem, 100%), 1fr)`: dezelfde
ondergrens, tenzij de container smaller is. Bij normale tekst verandert er niets.

Hetzelfde geldt voor de drempels zelf. De stappenbalk van het bestelformulier,
de tabel met videovoorbeelden en het hele dashboardfiguur op de homepage stonden
in `px`; ze staan nu in `em`, en het dashboardfiguur bovendien op
`@container` in plaats van `@media`. Dat laatste was de kern van het probleem
daar: op een venster van 1280 met de tekst op 200 procent was het VENSTER breed
genoeg voor vier tegels naast elkaar, maar het paneel was 171 px — en dus werd
"delivered" 291 px buiten de figuur afgesneden. Een container-query kijkt naar de
breedte die er werkelijk is.

Van 31 bevindingen naar nul. De figuur op de homepage die je gisteren als
bekende beperking van me kreeg — de statuslabels die bij 200 procent wegvielen —
is daarmee ook opgelost.

---

## 3. De eindcontrole

Alles hieronder is gedraaid tegen de bouw zoals die nu op schijf staat.

| controle | wat hij meet | uitkomst |
|---|---|---|
| `npm test` | 3.172 beweringen over gedrag, prijzen, e-mail, betaling, juridische tekst | alles groen |
| `npm run audit` | zes statische controles over 93 pagina's | 0 bevindingen |
| `npm run keuring` | 91 pagina's × 5 breedtes, 455 metingen | 0 opmaakfouten |
| `node leesbaar.mjs` | 34.881 tekstregels tegen de werkelijke pixel eronder | 0 bevindingen |
| `node mobiel.mjs` | de lade op 6 formaten × 4 pagina's | 0 bevindingen |
| `node zoom.mjs` | 91 pagina's op 150 % en 200 % tekstgrootte | 0 bevindingen |
| `node wandel.mjs` | een echte klikroute door de site | geen console-fouten |
| `node spelling.mjs` | 91 pagina's, hunspell nl + en_GB | 6 fouten gevonden en verbeterd |
| `node variant.mjs` | Brits vs Amerikaans over de Engelse kant | 1 afwijking, rechtgezet |
| `npm run visueel` | screenshot-vergelijking met de vorige bouw | zie hieronder |

Er zijn vijf nieuwe `npm run`-namen bijgekomen zodat je ze zelf kunt draaien
zonder de bestandsnamen te onthouden: `npm run audit` (alle zes tegelijk),
`npm run leesbaar`, `npm run mobiel`, `npm run zoom`, `npm run spelling` en
`npm run variant`.

### De visuele vangrail

`npm run visueel` meldde 38 verschillen op 30 plekken. Ze zijn stuk voor stuk
nagelopen en vallen in precies drie groepen, alle drie gewild:

1. **"What goes into every frame." werd hoger** op de tien catalog- en
   videopagina's, op 390 en 768 px. Dat is de correctie van het tweekolomsraster
   dat nooit inklapte: de tekst breekt nu af in plaats van buiten beeld te lopen,
   en dus is de sectie hoger.
2. **"What happens after you order." werd hoger** op 768 px. Het dashboardfiguur
   zet zijn tegels nu op twee kolommen in plaats van vier, omdat het PANEEL daar
   417 px breed is — vier tegels van 93 px was te krap. Dat is de
   container-query die de vensterquery verving.
3. **Het abonnementsblok werd lager, met een kleurverschil.** Dat is het
   stemmingsraster van vier merkbeelden dat de grijze plaatshouder verving. De
   referentie stond van 01:26 vannacht en dus van vóór het beeldwerk.

Daarna is de referentie opnieuw gezet met `npm run visueel:ijk`, zodat de
vangrail vanaf nu de nieuwe stand bewaakt.

---

## 4. Wat er nog voor je klaarligt

**Beeldgewicht.** `npm run krimpen` rekent uit dat er 10,2 MB webp uit de
beeldmap te halen valt (plus de AVIF's ernaast) door 77 beelden te verkleinen
naar wat ze werkelijk op het scherm halen. Ik heb dat niet uitgevoerd: elk beeld
verkleinen verandert élk screenshot in de visuele vangrail, en dan kan die
vangrail geen onderscheid meer maken tussen "veranderd omdat de beelden kleiner
zijn" en "veranderd omdat er iets stuk is" — precies de controle die je voor het
eind vroeg. Draaien met `npm run krimpen -- --doen`, daarna
`npm run avif && npm run build && npm run visueel:ijk`.

**58 beelden die nergens meer heen wijzen.** Samen 5,3 MB, en ze gaan bij elke
deploy mee. Het zijn oude varianten die na een herziening zijn blijven liggen —
`sub-light-*` (de vorige achtergrond van het abonnementsblok), veertien
`banners-*` en veertig `-w1560`-varianten van lifestylebeelden. Ik kan op jouw
schijf niets weggooien; de volledige lijst met paden staat in
`ONGEBRUIKTE-BEELDEN-22-AUGUSTUS.txt` ernaast.

**Twee merkbeelden ongebruikt.** De twee varianten met de puffer in de auto
(waarvan er één een duplicaat is) staan nog niet op de site. Zeg maar waar je ze
wilt hebben.

**Onveranderd van eerder:** `npm run migrate` draaien, `SELLER_ADDRESS` als
Pages-secret zetten, `functions/api/debug-egress-ip.js` weggooien (dat kan ik
niet vanaf hier), en de vraag of de machtiging van € 1 een factuur nodig heeft.
