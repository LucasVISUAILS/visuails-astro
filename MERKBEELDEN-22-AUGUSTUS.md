# VISUAILS — de merkbeelden in de pagina · 22 augustus 2026

## 1. De foto in de auto staat bovenaan

De man in de pufferjas op de achterbank is nu het eerste beeld van de site: hij
vervangt `hero-dunes` als dia 1 van de heldcarrousel. Dia 1 is de merkdia — de
vier erna horen bij de diensten — dus dit is de plek waar een merkbeeld hoort en
niet een productbeeld.

Er moest één ding meteen mee opgelost worden. De duinfoto was links donker; deze
is dat niet: het onderwerp — een felle jas — staat precies waar de kop staat.
`leesbaar.mjs` las de witte "You upload." af op **2,53 : 1** waar 3 de eis is, en
op de Nederlandse kant 2,40. De sluier over de hero heeft er daarom een derde
laag bij gekregen: een strijklicht van links dat donker is waar de tekst staat en
weg is op de helft, zodat het raam en de donkere hoedenplank onaangeroerd
blijven. Beide talen staan nu schoon.

---

## 2. "Alsof ze er horen te zijn en er niet ingeplakt zijn"

Dat is drie verschillende problemen, en ze hebben elk hun eigen oplossing.

### Scherptediepte — in het bestand, niet in CSS

Wat een ingeplakte foto verraadt is dat hij van rand tot rand even scherp is.
Geen enkele echte opname is dat: een lens heeft één scherptevlak en alles
daarbuiten valt weg. Er staat nu een nieuw script in de map,
`scripts/beeld-inbedden.mjs`, dat precies dat doet: een radiale overgang van
scherp op het onderwerp naar zacht aan de randen, plus een licht vignet zodat de
rechthoek niet als rechthoek eindigt maar in de paginagrond wegvalt. De overgang
loopt via een smoothstep — een lineaire overgang geeft een zichtbare ring op de
plek waar hij begint.

Dit gebeurt in het BESTAND en niet met `filter: blur()` in CSS, om één harde
reden: een schermbrede foto vervagen kost GPU-tijd bij elke frame, op precies de
beelden die als eerste in beeld komen. Hier gebeurt het één keer, bij het maken
van het bestand.

Je kunt het zelf draaien voor elk nieuw merkbeeld:

    node scripts/beeld-inbedden.mjs <bron> public/img/<naam> --fx .4 --fy .3 --straal .4 --blur 10 --vignet .18 --breed 2048

`--straal -1` zet de scherpte helemaal uit, en dat is wat een sfeerbeeld achter
tekst nodig heeft.

### De naad — die stond er al

`.ground-blend` legt de paginakleur terug over de boven- en onderrand van een
band, zodat hij uit de pagina komt in plaats van erop te beginnen. Die was er al
en is niet aangeraakt.

### Het licht — dat ontbrak

Een echte lamp in een foto verlicht ook wat ernaast staat. Zonder dat blijft een
fotoband een venster naar een andere kamer: de naad klopt, maar het licht houdt
op bij de rand. `.foto-licht` zet nu twee zeer zachte limoen ellipsen tegen de
boven- en onderrand van een band, onder alle tekst. Waar de naadvervaging de rand
in de paginakleur laat weglopen, loopt nu een GLOEIENDE rand weg — en dat is wat
het oog als doorlopen leest.

Het staat op vier plekken: de droomband, de slotband van de homepage, de band
direct onder de hero (die vangt het licht van de heldfoto op), en de twee banden
op /studio.

### Wat het níet is

Een gespiegelde kopie onder het beeld. Die vloerspiegeling is het klassieke
"reflection"-recept en zou hier precies het verkeerde doen: op een redactionele
pagina zonder glanzende vlakken leest hij als effect, en een effect is het
tegenovergestelde van erbij horen. De weerspiegelingen op deze site zitten in de
foto's zelf — het natte asfalt onder de laarzen, de lichtplas op de vloer, de lak
van de jas.

### Het abonnementsblok is met rust gelaten

Zoals gevraagd. Sterker: de vier tegels van het stemmingsraster zijn opnieuw
gemaakt **zonder** de behandeling, zodat ze scherp en fel blijven. Dat blok is
het enige op de site dat naar voren hoort te komen in plaats van weg te zakken,
en de scherptediepte zou daar tegenin werken. In de code staat op beide plekken
een noot die dat vastlegt, zodat het er niet per ongeluk alsnog op komt.

---

## 3. /studio heeft licht gekregen

Twee lichtstudies uit dezelfde reeks: de lichtkegel op een vloer achter de hero,
en een strakke uitsnede van de lichtplas achter de slotband. Ze staan er als
GROND en niet als inhoud — er valt niets op te zien behalve licht, en dat is
precies waarom ze passen.

De plekken waar de pagina nog een echte foto MIST — iemand die zit te
controleren, een schermafdruk van Studio — houden hun plaatshouder. Een
lichtkegel bewijst niet dat er met de hand gekeken wordt.

Allebei zijn ze volledig zacht gemaakt (`--straal -1`), en dat was nodig: in de
scherpe versie liep de lichtlijn van de kegel kaarsrecht over de hele band en zag
eruit als een sectiegrens in plaats van als een vloer.

De briefingtekst onder de plaatshouder zakte door het nieuwe licht van 4,5 naar
**3,85 : 1**. Onder die rechterkolom ligt nu een extra donkere plek in de sluier:
daar hoort geen licht, want dat is een panelendoos en geen foto.

---

## 4. Wat de meting zegt

Alles hieronder is gedraaid tegen de bouw zoals die nu op schijf staat.

| controle | uitkomst |
|---|---|
| `npm test` — 3.172 beweringen | alles groen |
| `npm run audit` — zes statische controles over 93 pagina's | 0 bevindingen |
| `npm run keuring` — 455 metingen over 91 pagina's × 5 breedtes | 0 opmaakfouten |
| `node leesbaar.mjs` — 34.720 tekstregels tegen de pixel eronder | 0 bevindingen |
| `node mobiel.mjs` — de lade op 6 formaten | 0 bevindingen |
| `node zoom.mjs` — 150 % en 200 % tekstgrootte | 0 bevindingen |
| `node wandel.mjs` — een echte klikroute | geen console-fouten |
| `npm run visueel` — 364 opnamen | 6 verschillen, alle zes de hero |

Die zes zijn precies wat je zou verwachten van één vervangen heldbeeld:
kleurvlekken in rij 1 op de homepage, op drie breedtes × twee talen. **Geen
enkele sectiehoogte is veranderd** — de studiobeelden staan als grond achter
bestaande inhoud en de tegels in het abonnementsblok hebben hun maat gehouden.
Daarna is de referentie opnieuw gezet.

## 5. Wat er nog ligt

De keuring meldt 85 beelden die samen 6,6 MB groter worden aangeleverd dan ze
getoond worden — dat is de lijst waar `npm run krimpen` 10,2 MB uit haalt, en die
staat nog steeds op jouw beslissing. De 58 ongebruikte beelden uit de vorige
ronde staan nog in `ONGEBRUIKTE-BEELDEN-22-AUGUSTUS.txt`; daar is nu
`hero-dunes.webp` en `hero-dunes.avif` bij gekomen, want die stond alleen op de
plek die de foto in de auto heeft overgenomen.
