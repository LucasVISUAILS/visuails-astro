# De randen, de gloed en de kleur — 23 augustus 2026

Vier vragen van Lucas, plus twee schermafdrukken van /portal die er halverwege
bij kwamen. Dit is wat er is gevonden, wat er is veranderd en wat de meting
zegt.

---

## De uitkomst in één regel

`npm run naden` ging van **682 meldingen naar 0** over 91 pagina's op 390 en
1920 pixels. Wat overblijft zijn 637 "eigen randen" — een foto, een tegel of een
paneel dat zijn eigen vlak schildert, en die rand hoort er te zijn.

---

## 1 · De naad stond op zijn kop

Lucas, over /portal: *"heb je deze rare gloed ook met een harde lijn dat er wat
ongemakkelijk uitziet"* en *"hier zijn ook nog van die harde lijnen te zien"*.

**De reparatie was zelf de fout.** De aanpak tot vandaag was: schilder de
paginakleur terug over de rand van een sectie en vervaag hem uit. Dat vereist dat
de paginakleur één getal is. Ze is dat niet — `body::before` staat op het VENSTER
en draagt een lamp linksboven én een vignet, dus de zichtbare grond loopt van
ongeveer 20 bovenin het scherm naar 15 onderin. Een naad die naar één vaste
`#0F1011` (≈ 17) vervaagt, klopt dus bijna nergens.

Gemeten op /portal, dezelfde naad op drie vensterhoogtes, linkerkantlijn:

| naad staat op | grond erboven | de naadrij zelf | de sectie eronder |
|---|---|---|---|
| 150 px | 19,9 | 18,3 | 10,7 |
| 400 px | 15,8 | 17,0 | 10,7 |
| 700 px | 14,9 | **17,1** | 10,7 |

Onderin het scherm was de naadrij dus 2,2 waarden **lichter** dan de grond
ernaast: een lichte streep dwars over de pagina, gemaakt door de reparatie die
hem moest weghalen. Dat is de harde lijn op de tweede schermafdruk.

En de tweede helft is groter: de sectie zelf stond op 10,7 terwijl de pagina
eromheen op 15 tot 20 stond. Dat kwam niet van `isolation` maar van één
declaratie — `background: var(--ink-900)` — een **deksel** over de verlichting.
Vier secties droegen er een zonder ook maar iets te tonen wat een eigen grond
nodig had: `.pp-hero`, `.pp-close`, `.sp-hero`, `.sp-close`. De "rare gloed" is
die deksel: een donkere plaat met een lichte rand eromheen.

**Wat er nu staat.** Niet de pagina over de sectie leggen, maar de sectie laten
oplossen:

1. Een sectie zonder eigen grond krijgt er geen. Geen deksel, geen naad. Dan is
   er niets te matchen: ze *is* de pagina, op elke scrolpositie.
2. Een sectie die wél een eigen grond heeft — een foto, een verloop — laat die
   grond aan zijn randen naar transparant lopen met `mask-image` (`.rand-los` in
   `global.css`), zodat de echte verlichting eronder doorloopt.

Het verschil is dat (2) geen enkel getal van de pagina hoeft te raden: er is geen
kleur die kan afwijken, want er wordt geen kleur geschilderd.

Dezelfde behandeling kregen: de hero op de homepage, de droomband, de slotband,
allebei de sfeerbanden op /studio, en de drie hero's van `hero-editorial` (die
laatste met een stille omhullende laag, want hun foto schuift met de parallax en
een masker schuift met zijn element mee).

Ook weggehaald: de dekkende grond van de **voettekst** en van `.on-ink` — de
laatste twee deksels op de site.

Na de reparatie, dezelfde meting op /portal: **vlak van 14,9 naar 15,1 dwars over
de sectiegrens**, op alle drie de vensterhoogtes. De grens bestaat niet meer.

---

## 2 · De korrel loopt nu door over de foto's

Lucas' vermoeden — *"misschien de grain deels of helemaal op de foto ook zetten
om het meer 1 te laten lijken"* — klopte, en het is te meten.

De korrel komt uit twee lagen: `.grain` (vast, boven alles, dekking .03) en
`body::before` (vast, onder alles, dekking .05). Een dekkende foto blokkeert de
tweede. Op lege grond zie je dus .03 + .05 aan textuur en op een fotoband alleen
.03 — bijna drie keer minder. **Twee vlakken met dezelfde kleur maar
verschillende ruis leest het oog niet als één kleur maar als twee materialen.**
Dat is waarom een band als ingeplakt aanvoelt, ook nadat de kleurstap weg is.

`.korrel-mee` legt de ontbrekende .05 terug over de foto, met exact dezelfde
tegel, frequentie en octaaf als de grondlaag. Hij draagt hetzelfde masker als de
foto, en dat is rekenkundig en niet cosmetisch: waar de foto dekking α heeft,
laat hij (1 − α) van de grondkorrel door en vult deze laag α aan — samen op elke
rij precies één keer .05, ook midden in de uitdoving aan de rand.

**Alleen op sfeerbeelden, nooit op geleverd werk.** De galerij en de
productvoorbeelden laten zien wat de studio maakt; daar een korrellaag overheen
leggen zou het werk vervuilen om de pagina mooier te maken.

---

## 3 · De spotlights

*"Ik vind de spotlights bij de eerstvolgende sectie in het midden niet zo mooi en
wat generiek."*

De oorzaak was niet de sterkte maar de **symmetrie**: er stonden twee even grote
ellipsen op dezelfde x, op 22 en 78 procent hoogte — precies even ver van boven-
als van onderrand. Zoiets komt in geen enkele ruimte voor. Het oog leest die
spiegeling meteen en noemt het decoratie; dat is wat "generiek" betekent als je
het opmeet.

Nu staat er één hoofdplas plus één veel zwakkere terugkaatsing die met opzet uit
het lood ligt (standaard 16 procent opzij en op een andere hoogte). Beide zijn
zachter dan wat er stond: 0,085 en 0,04 tegenover 0,10 en 0,12.

De band direct onder de hero was het opvallendst en is ook de enige met
`.foto-licht` zónder foto — de gloed had daar helemaal geen bron in beeld.
`.foto-licht-enkel` haalt de tweede plas weg; wat overblijft is één brede, zwakke
plas rechts van het midden, laag in de band.

---

## 4 · Het dashboardblok heeft een kleur gekregen

Het sfeerbeeld is de staart van de lichtbundel uit de aangeleverde reeks, laag
uitgesneden en zwaar verzacht (nergens scherp) — er is geen onderwerp meer in te
herkennen, alleen richting. Dat is met opzet: het moest een kleur worden en geen
tweede foto op de pagina.

Hij ligt **in** het blok en niet in de band eromheen. Dat is wat je vroeg, en het
is ook het enige wat werkt: `.hv-dash-row` schildert `var(--bg)` en dekt dus alles
af wat de band eronder zou doen. Dekking .28 met een strijksluier van links, zodat
het licht aankomt waar het scherm staat en de tekstkolom donker blijft.
`leesbaar.mjs` bevestigt het contrast: 34.735 tekstregels, nul meldingen.

---

## 5 · De €390-plaat

Zie het aparte bericht voor de redenering. Kort: **geen tweede tint.** De site
heeft er één, en dat is geen toeval — `--fill-blue`, `--fill-violet`, `--teal` en
`--teal-text` wijzen allemaal naar het accent. Wat er wél mis was, staat in de
klassenaam: `.lime-plate` is donker gemaakt om op een **limoen** paneel te liggen,
en dat paneel bestaat niet meer. Donker op donker heeft niets om zich tegen af te
zetten en valt terug op wat het dan nog is: een grijze doos met een groot getal
en twee knoppen.

De regel die het ontwerp al had is genoeg: een plaat is het tegendeel van zijn
grond. Dus staat hij nu vol in het accent met bijna-zwarte inkt (15,16 : 1) en
een zwarte knop met limoen opschrift — op de homepage en op /plans, de twee
plekken waar dit blok voorkomt.

Terugdraaien is één klasse: `plaat-vol` van de `<div>` af.

---

## 6 · De blokletters onderaan werden doormidden gesneden

Dit kwam uit de meting en niet uit een schermafdruk, en het was op negen pagina's
de hardste lijn van de site.

Toen het merk gisteren wit werd, ging er iets stuk dat bij `#34383F` niemand zag.
Het merk wordt met opzet door de paginarand afgesneden — dat is wat er een
drukwerkmerk van maakt. Met donkergrijs was dat een overgang van een paar
grijswaarden; wit tegen `#08090B` is een sprong van 142 over de volle breedte.

Erger nog: op /test-sample en de drie /start-pagina's (en hun NL-tweelingen)
eindigde het merk **53 pixels bóven** de paginarand en werd het daar doormidden
gesneden, midden in het niets. De oorzaak: zolang stap 1 van het bestelformulier
in beeld staat zet OrderFlow de ondervulling van de voet op 5,5rem zodat de vaste
totaalbalk niet over de voetlinks valt — en de negatieve marge van het merk stond
nog op 2,2rem. Twee regels die hetzelfde getal moesten gebruiken en dat niet
deden.

Twee reparaties: allebei lezen nu dezelfde variabele `--voet-onder`, dus ze kunnen
niet meer uit elkaar lopen; en een masker haalt de letters over hun laatste 38
procent terug naar 40 procent dekking, zodat de rand door iets snijdt dat daar al
half verdwenen is. Naar nul vervagen was de andere optie en is fout: dan zweeft
het merk en raakt het de rand niet meer, en dat is nu juist het idee.

---

## Het meetgereedschap is scherper geworden

`naden.mjs` meldde 682 naden, en dat was onbruikbaar: op 390 pixels vult elke foto
de volle breedte, dus haalt zijn eigen bovenrand moeiteloos de dekkingseis, met
een stap van honderd grijswaarden erbij. De drie meldingen die ertoe deden waren
niet meer te vinden.

Eerst gecontroleerd dat het geen regressie was: dezelfde meting op de bouw van
2 augustus gaf op drie pagina's 81 meldingen tegen 36 nu. De metingen zijn dus
altijd al zo geweest.

De scheiding is nu objectief in plaats van een lijst klassenamen. De meting vraagt
de pagina of er op die rij of kolom iets zijn **eigen grond schildert** — een
achtergrondkleur, een achtergrondbeeld, een rand, een schaduw. Zo ja, dan is het
een rand die er hoort te zijn. Zo nee, dan is het een naad: een stap op een plek
waar niemand iets schildert. Daar kwam nog bij: ligt de rij of kolom **binnen**
iets dat schildert, dan is het per definitie de inhoud van dat vlak — dat vangt
de limoen deellijn van de vergelijkingsschuif, die als laatste zeven meldingen
overbleef.

Twee nieuwe gereedschappen erbij, allebei ontstaan tijdens dit werk:

- `npm run naad /portal/ .pp-close` — meet dezelfde naad met zijn bovenrand op
  150, 400 en 700 pixels in het venster. Dit is wat de fout heeft gevonden.
- `npm run vlakken /portal/ /studio/ /` — meet het NIVEAU van elk vlak in plaats
  van de sprong ertussen, want een sectie die over zijn hele hoogte een paar
  waarden donkerder is, is rij voor rij onzichtbaar.

En `WORTEL=dist-verify npm run naden` meet een oudere bouw, zodat "is dit een
regressie?" een meting is en geen gevoel.

---

## De metingen

| meting | uitkomst |
|---|---|
| `npm test` | alle suites groen |
| `npm run audit` (zes controles, 93 pagina's) | 0 bevindingen |
| `audit-bouw` | 93 pagina's, 0 bevindingen |
| `audit-links` | 0 dode links, 0 hreflang-fouten, 0 ontbrekende og-beelden |
| `npm run naden` | **0 naden** (was 682), 637 eigen randen |
| `npm run keuring` | 455 pagina-metingen, 0 bevindingen |
| `leesbaar.mjs` | 34.735 tekstregels, 0 meldingen |
| `mobiel.mjs` | 0 bevindingen |
| `zoom.mjs` | 0 bevindingen |
| `visueel` | opnieuw geijkt (de wijzigingen zijn bedoeld) |

Zeventien bestanden byte-geverifieerd naar E: overgezet.
