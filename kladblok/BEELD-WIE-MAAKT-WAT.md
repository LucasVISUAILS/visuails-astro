# Wat er nog aan beeld moet komen — en wie het maakt

Stand na blok E, 8 september 2026. Van de 52 lege plekken die er vanochtend stonden zijn
er twee gevuld met een getekend scherm; er blijven **24 opdrachten** over, in twee talen
goed voor 50 plekken.

---

## 1 · Gevuld: het klantoverzicht in VISUAILS Studio

`/studio` en `/nl/studio` vroegen om een *"Schermafdruk van VISUAILS Studio — het overzicht
met één lopende bestelling"*. Dat is geen foto maar een **scherm**, en een scherm hoef je
niet te fotograferen. Er staat nu `FigOverzicht`: de referentie, de statusregel met "In
productie" actief, de leverweek, vier beelden met drie toestanden, en de regel dat er 140
beelden in deze bestelling zitten.

Geen enkel getal erin is ingetypt. De referentie, het merk en het aantal producten komen uit
`src/data/figdemo.js`, de leverweek uit dezelfde poort die `FigGate` op diezelfde pagina
tekent, en 140 is 20 × `COMPLETE_IMAGES`. Twee figuren naast elkaar kunnen dus geen
verschillende week meer tonen — daar is `tests/figures.test.mjs` op uitgebreid.

---

## 2 · Waarom de rest niet ook getekend is

Drie van de resterende opdrachten lijken op een scherm en zijn het niet:

- **Het richtingenblad** (`/custom-models`) vraagt om drie voorgestelde gezichten. Er zijn
  precies drie bruikbare merkmodelbeelden in de map, en die staan alle drie al op diezelfde
  pagina onder het kopje "echt geleverd werk". Ze een tweede keer gebruiken als "voorstel dat
  is afgewezen" is precies de fout die op 4 september uit die pagina is gehaald: dezelfde
  twee mensen twee keer in één raster. **Er zijn drie nieuwe gezichten voor nodig.**
- **Het webshopraster** (`/catalog`) vraagt om twaalf verschillende producten, allemaal op
  dezelfde manier gefotografeerd. Het kader eromheen kan ik tekenen; de twaalf producten zijn
  precies de inhoud die het beeld moet bewijzen. Zonder die twaalf is het een leeg raster.
- **De feed van bovenaf** (`/hooks`, `/editions`) is een raster van échte posts. Zelfde
  probleem: het kader is het makkelijke deel.

Zodra jij het beeldmateriaal hebt, kan ik het kader er alsnog omheen tekenen — zeg het en ik
bouw het raster, de tijdlijn en het richtingenblad als component in plaats van als foto.

---

## 3 · De 24 opdrachten, gebundeld tot zeven sessies

Gesorteerd op wat je in één keer kunt maken, niet op paginavolgorde.

### Sessie 1 · Eén product, vier keer — de proefset
`/catalog` · 2 open plekken (de andere twee staan er al)

- **Catalog · Achterkant** — hetzelfde kledingstuk van achteren, dezelfde witte ondergrond,
  hetzelfde licht en dezelfde kadrering als shot 1, zodat ze op een productpagina naast
  elkaar staan zonder sprong.
- **Catalog · Op een model** — datzelfde kledingstuk gedragen, ten voeten uit of driekwart.
  Het PRODUCT is het onderwerp; een portret zonder product erin is dit shot niet.

### Sessie 2 · Hetzelfde product, slecht en goed
`/upload-guidelines` · 2 plekken · zelfde product, zelfde hoek, alleen de omstandigheden anders

- **Slecht** — telefoonfoto in een schemerige kamer, rommelig oppervlak, net niet scherp. Het
  moet eruitzien als een foto die iemand ons echt zou sturen; geen karikatuur.
- **Goed** — daglicht van een raam, egaal oppervlak, scherp tot aan de rand. Haalbaar met een
  telefoon en zonder apparatuur — dat is de hele belofte van die pagina. Ziet het eruit als
  studiowerk, dan concludeert de lezer dat hij het zelf niet kan.

### Sessie 3 · Editions — merkbeeld zonder product
`/editions` en `/plans` · 6 plekken · dit is de grootste en de belangrijkste

- **Het maandraster van 20 beelden** (twee keer gevraagd, /editions en /plans): steeds
  dezelfde kleuren en hetzelfde licht, in geen enkel beeld een product. Moet lezen als één
  merk en niet als een greep uit een bibliotheek.
- **Eén gewoon catalogbeeld** — staat er om uitgesloten te worden. Moet zó onmiskenbaar
  "productfoto" zijn dat je meteen ziet dat het beeld ernaast iets anders is.
- **Eén merkbeeld uit dezelfde wereld** — textiel van dichtbij, een muur in namiddaglicht,
  een hand. Zelfde sfeer, ander onderwerp: dit verkoopt niets, het zegt wie je bent.
- **Drie maandsets naast elkaar** met de maand erboven — herkenbaar dezelfde opzet en toch
  drie keer iets anders. Kun je de maanden niet uit elkaar houden, dan doet dit beeld het
  omgekeerde van wat het moet doen.
- **De opzet van één merk** — kleurstalen, twee locatiereferenties en een materiaalproef, met
  de aantekeningen van de klant erbij. Het recept, niet het gerecht.

### Sessie 4 · De shootdag tegenover de tafel
`/compare` · 2 plekken · zelfde uitsnede, zelfde licht — het verschil moet in de INHOUD zitten

- **De shootdag** — statieven, lampen, rekken kleding, mensen die wachten. De DAG, niet de
  foto die eruit komt. Rommelig mag; geromantiseerd niet.
- **De tafel** — een laptop met VISUAILS Studio open, ernaast één kledingstuk en een telefoon.

### Sessie 5 · Het merkmodel
`/custom-models` · 2 plekken

- **Zes beelden met hetzelfde merkmodel** — twee webshopproducten, een advertentie, een
  e-mailheader, een socialpost en een campagnebeeld. Moet bewijzen dat het één persoon is en
  niet zes die op elkaar lijken.
- **Het richtingenblad** — drie voorgestelde gezichten, aantekeningen ernaast, één
  aangekruist. Zie §2: hiervoor zijn drie NIEUWE gezichten nodig.

### Sessie 6 · Hooks
`/hooks` en `/start` · 6 plekken · vier daarvan zijn video

- **De hookvideo zelf**, verticaal, op volle hoogte, zoals hij in een feed staat.
- **Stilgezet op het frame waar de naad zit** — bovenin het einde van de video, eronder het
  beeld uit de feed dat er precies op aansluit.
- **Dezelfde montage in drie uitsneden** — verticaal, 4:5 en 1:1.
- **De losse beelden uit die montage**, naast elkaar.
- **De eerste twee seconden van een advertentie** (op `/start`).
- **De vier telefoonfoto's die een klant instuurt**, naast het scherm waarop de montage
  gebouwd wordt.

### Sessie 7 · Losse
- **`/studio`: iemand aan het werk** — een beeld op het scherm, ernaast de originele
  telefoonfoto van de klant. Het VERGELIJKEN moet te zien zijn. Geen poserend portret, geen
  stockfoto van een kantoor.
- **`/hooks`: een feed van bovenaf** waarin één post uit twee delen bestaat, met de naad
  aangewezen.
- **`/catalog`: het webshopraster** van twaalf producten.
- **`/editions`: een maand in een feed van bovenaf**, productposts afgewisseld met
  merkbeelden.

---

## 4 · Hoe je ze erin zet

Leg het bestand onder de naam die de plaatshouder noemt in `public/img/` (met een `-w760` of
`-w1560` ernaast als je die hebt) en het staat er bij de volgende build. Wat er nog mist lees
je van de plaatshouders zelf af; `npm run placeholders` telt ze en zegt op welke pagina ze
staan. Zet `PLAATSHOUDERS` in `src/data/beeld.js` op `false` zodra alles vervangen is.
