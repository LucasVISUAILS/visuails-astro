# VISUAILS — de randen weg, 22 augustus 2026 (avond)

## Wat er mis was, en waarom ik het de vorige ronde miste

Drie dingen, en ze hingen samen.

**1 · De vervaging zat op de verkeerde plek.** De site heeft al sinds 7 augustus
een mechanisme om een sectienaad te verbergen: `.ground-blend` legt de
paginakleur terug over de boven- en onderrand van een band. De uitleg daarbij
klopte, de DEKKING niet. `.ground-blend` stond op vier secties, maar de
oorzaak — `isolation: isolate` — staat op veel meer. `.mark-depth` zet het (drie
banden op de homepage), `.beam` zet het, en `.foto-licht` van gisteren zette het
er nog eens bij. Elke sectie die een eigen stapelcontext maakt valt buiten de
verlichting van `body::before` en leest dus als #08090B terwijl de pagina
eromheen op #0F1011 zit. Zonder vervaging is dat een kaarsrechte lijn over de
volle breedte.

**2 · De gloed tekende de naad die hij moest verbergen.** Ik zette de twee
ellipsen met hun MIDDELPUNT op de rand van de band (`at 50% 0%`). Daardoor stond
de gloed op de rand op volle sterkte en hield hij daar op: de bovenste helft van
de ellips werd simpelweg afgeknipt. Dat is precies wat jij zag — *"spotlights
die harde randen van secties laten zien"*.

**3 · De voet begon met een stap.** Op elke pagina. De haarlijn bovenaan hoort er
te zijn, maar eronder sprong de grond ook nog eens van #0F1011 naar zwart.

## Waarom ik het niet zag en jij wel

Ik heb er in de vorige ronde drie op het oog gerepareerd en er telkens één
gemist. Een verschil van zeven grijswaarden zie je niet als je niet weet waar je
moet kijken — maar over 1920 pixels kaarsrecht is het het eerste wat een
bezoeker ziet. Dus is er nu een meting voor: **`naden.mjs`**.

Die gaat elke opname rij voor rij af en meldt waar twee buurrijen over minstens
90 procent van de breedte in dezelfde richting springen. Twee dingen maken hem
bruikbaar in plaats van luidruchtig:

- **Tekst gaat eruit vóór de meting.** Een regel tekst geeft per definitie een
  scherpe overgang over de hele tekstbreedte. Zonder die stap bestaat de uitslag
  uit niets anders.
- **Een LIJN is geen NAAD.** De site zet met opzet een haarlijn tussen twee
  opeenvolgende banden. Die geeft twee scherpe overgangen — de lijn in en de lijn
  uit — en dat is opmaak. Het verschil is objectief: na een lijn staat het niveau
  weer waar het stond, na een naad niet. De meting kijkt daarom vier rijen boven
  en vier rijen onder.

En hij zegt erbij WAT er ligt: hij vraagt de pagina zelf welk element op die
hoogte begint of eindigt. Een naad zonder verklaring is niet te repareren.

## Wat er nu staat

| | vóór | na |
|---|---|---|
| voet, /how-it-works | 7,5 | 0 |
| voet, /about | 7,4 | 0 |
| voet, /plans | 7,1 | 0 |
| voet, homepage | 6,9 | 0 |
| portalhero → band | 6,5 | 0 |
| slotband homepage | 7,6 | 0 |
| band onder de hero | 6,7 | 0 |

Wat overblijft zijn drie meldingen van 2,6 tot 2,9 op de voetnaad. Die zijn
nagemeten met een pixelkolom: 12 tot 20 aan beide kanten, zonder systematische
stap. Dat is de KORREL van `body::before` (±3) en geen naad — dezelfde
tolerantie die in de noot bij `--bg-seam` al staat opgeschreven.

## De reparatie zit op de oorzaak, niet op de plek

De vervaging hangt nu aan `isolation: isolate` in plaats van aan één klasse:

```css
.ground-blend, .panel-tonal, .mark-depth, .foto-licht { isolation: isolate; }
.ground-blend::after, .panel-tonal::after, .mark-depth::after, .foto-licht::after { … }
```

Dan kan de volgende band die `.mark-depth` gebruikt het niet meer vergeten. De
twee portalbanden die hun eigen grond schilderden hebben `.ground-blend` erbij
gekregen, en de voet vervaagt zijn grond nu als gradiëntlaag boven zijn eigen
kleur — geen extra element, geen pseudo, dus niets dat kan botsen.

De gloed sterft nu binnen de band: middelpunt op 22 procent, straal 18 procent,
op nul vóór de rand. Wat er niet is, kan niet worden afgeknipt.

## Twee dingen die het mooier maken

**Het licht staat waar het licht staat.** De gloed stond op elke band op 50
procent. Dat ziet er netjes uit en klopt niet: de lichtbundel op de droomband
valt rechts van het midden, de lichtplas op de slotband links. Er is nu één
variabele per band (`--fl-x`), en de gloed hoort daarmee bij de foto in plaats
van bij het raster.

**De blokletters zijn wit.** Dat kan daar omdat het het laatste is op de pagina:
er staat niets meer onder om mee te concurreren, en het merk wordt door de
onderrand afgesneden, dus het leest als drukwerk. De gloed eronder licht de
letters nu van onderen bij in plaats van ze te moeten dragen.

## De eindcontrole

| controle | uitkomst |
|---|---|
| `npm test` — 3.172 beweringen | alles groen |
| `npm run audit` — zes statische controles, 93 pagina's | 0 bevindingen |
| `npm run keuring` — 455 metingen | 0 opmaakfouten |
| `node leesbaar.mjs` — 34.720 tekstregels | 0 bevindingen |
| `node mobiel.mjs` — de lade op 6 formaten | 0 bevindingen |
| `node zoom.mjs` — 150 % en 200 % tekstgrootte | 0 bevindingen |
| `node wandel.mjs` — een klikroute door de site | geen console-fouten |
| **`npm run naden`** — de nieuwe naadmeting, 12 pagina's | alleen korrel |
| `npm run visueel` — 364 opnamen | 83 verschillen, alle 83 kleur |

Die 83 zijn stuk voor stuk kleur en **geen enkele sectiehoogte is veranderd**.
Ze zitten bijna allemaal op hetzelfde vak van het kleurraster — rij 16, kolom 5 —
en dat is de plek van de blokletters onderaan. De zestien die als "gemiddelde
afwijking over het hele beeld" gemeld worden zijn de korte pagina's, waar de voet
een groot deel van de opname is en de nieuwe grondvervaging dus meetelt. Daarna
is de referentie opnieuw gezet.

## Eén ding dat ik onderweg fout deed en heb teruggedraaid

Halverwege stopte `npm run visueel` vier keer achter elkaar met "Target page,
context or browser has been closed". Ik heb daar een instelbaar aantal werkers
voor ingebouwd, met een noot erbij over machines die het niet trekken. Dat was
verkeerd gediagnosticeerd: de metingen liepen prima, ik startte ze zelf op een
manier waarbij mijn eigen tijdslimiet de achtergrondtaak meenam. Zodra ik ze los
startte liep hij in één keer door, op acht werkers.

De knop is er weer uit. Een instelling met een verzonnen reden erbij is erger dan
geen instelling: over een maand leest iemand die noot en gaat op zoek naar een
probleem dat er nooit was.
