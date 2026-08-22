# Mobiel, leesbaarheid en merkgevoel — 22 augustus 2026

Dit is het verslag van de ronde die volgde op jouw vraag om *"uitgebreide
opsporing van website fouten"*, met als aanleiding dat je *"voornamelijk op
mobiel nog veel fouten"* had gevonden in het burgermenu, plus de opdracht om te
controleren of alle teksten goed zichtbaar zijn, de achtergrond van het
abonnementsblok beter te laten zien, de witte film-grain spotlights daar weg te
halen, en de aangeleverde beelden subtiel als merkgevoel toe te passen.

Het is een lange ronde geworden, en de rode draad is deze: **de meeste van deze
fouten waren onzichtbaar voor elke controle die naar de code kijkt.** Ze zaten in
wat er op het scherm gebeurt — een kolom die niet inklapt, een sluier die op de
verkeerde foto is afgesteld, een klasse die op één van twee pagina's is
vergeten. Daar zijn drie nieuwe meetgereedschappen voor gebouwd, en die vonden
samen elf echte defecten.

---

## 1 · Het burgermenu

`npm run keuring` meet elke pagina op vier breedtes, maar altijd met het menu
DICHT. Alles wat erin staat — zeventien ingangen, drie knoppen, de taalwissel —
werd dus nooit gemeten. Er is nu een controle (`mobiel.mjs`) die het menu echt
opent, op zes schermmaten en vier pagina's, en daarna pas kijkt.

**De focus raakte kwijt.** Het menu openen zet de rest van de pagina op `inert`,
en de knop die je net indrukte zit in die rest — dus gooide de browser de focus
naar `<body>`. Bij Escape werd er daarom niets hersteld: de code keek of de focus
IN de lade stond, en dat was hij nooit. Vierentwintig van de vierentwintig
metingen eindigden op `BODY`. Voor wie met een toetsenbord werkt betekende dat:
menu openen, Escape, en de volgende Tab begint weer bovenaan de pagina. Nu doet
de lade wat elke dialoog hoort te doen — openen zet de focus op de sluitknop,
sluiten zet hem terug op de knop die hem opende.

**Een link van 138 bij 16 pixels.** "Probeer een proefvisual · €1", onderin het
menu, was zestien pixels hoog: de regelhoogte van de tekst en verder niets. De
ondergrens voor een aanraakdoel is 24 bij 24.

**Het merkteken erfde de opmaak van een menu-ingang.** Toen ik het gisteren een
link naar huis maakte, werd het ook een `.mobile-nav > a` en kreeg het alles wat
een ingang krijgt: een doos van 26 bij 84 pixels om een tekening van 26 bij 30,
met een onderrandje van 26 pixels breed eronder. Op een schermafdruk las dat als
een logo dat half was afgesneden.

Wat ik óók heb nagekeken en wél goed bleek: de lade overleeft een zachte
navigatie, de pagina eronder scrollt niet mee, de onderkant is bereikbaar, de
cookiebalk komt er niet overheen, en er blijft na sluiten geen `inert` achter.

---

## 2 · Wat er op 320 pixels gebeurde

De keuring mat 390, 768, 1440 en 1920. Er is nu 320 bij — de smalste breedte die
nog echt gebruikt wordt, en precies de breedte waarop een raster dat op 390 nét
past alsnog omvalt. Twaalf pagina's schoven zijwaarts.

**Knoppen mochten niet afbreken.** `white-space: nowrap` stond op elke knop, dus
een knop kon nooit smaller worden dan zijn label: "Vraag een eigen catalogus-look
aan" heeft 225 pixels nodig in een kolom van 184, en duwde daarmee de hele pagina
27 pixels opzij. Onder 460px mag een label nu afbreken.

**Een tabel met een niet-afbreekbare bestandsnaam** deed hetzelfde op vier
Nederlandse videopagina's, en **een scroller die zichzelf niet mocht laten
krimpen** op de verwerkersovereenkomst — dat laatste is de klassieke val waarbij
een raster-kind standaard `min-width: auto` heeft en dus nooit smaller wordt dan
zijn inhoud, ook al staat er `max-width: 100%` op.

**En Nederlandse samenstellingen liepen hun kolom uit.**
"verwerkingsverantwoordelijke" en twee andere woorden staken tot dertig pixels
buiten hun alinea. Er stond al een afbreekregel voor KOPPEN — die is er ooit
gekomen door "Aansprakelijkheidsbeperkingen" — maar niet voor lopende tekst.
Nu wel, met `hyphens: auto`, zodat de browser op echte lettergrepen breekt.

Op 320 pixels is de site nu volledig schoon: geen enkele bevinding op 91
pagina's.

---

## 3 · De fout die het langst onzichtbaar was

`.two-col` klapt op 900 pixels in naar één kolom. `.two-col.hero-split` zette er
twee terug — hogere specificiteit, later in het bestand — en won daarmee op
**elke** breedte, ook op een telefoon.

Gevolg: de fotoband in de hero van `/lifestyle`, `/catalog`, `/video` en
`/custom-models` was **136 pixels breed op een telefoon van 390**, en 71 op 320.
Dat is geen foto meer maar een streep, met een onderschrift dat er 27 pixels
buiten stak.

De pagina schoof niet, er stak niets uit, er was geen consolefout. Geen enkele
bestaande controle had er iets over te zeggen — hij zag er alleen kapot uit. Er
staat nu een meting op die precies deze vorm herkent: een foto die op 390 minder
dan 55 procent van het scherm vult maar op 1440 meer dan 25 procent, is een kolom
die niet is ingeklapt. Een duimnagel is op beide breedtes smal en valt er vanzelf
buiten.

---

## 4 · Of alle teksten leesbaar zijn

Je vroeg dit als één zin, en het bleek het meeste werk van de ronde. De
gebruikelijke manier om contrast te meten — `color` tegen `background-color` —
klopt op deze site op de helft van de plekken niet: er staat tekst op foto's, op
verlopen, op een paneel waar een beeld met `multiply` tegen een kleur ligt.

Daarom wordt er nu gemeten wat er STAAT. Elke pagina wordt scherm voor scherm
twee keer afgedrukt: één keer gewoon, en één keer met alle tekstkleuren op
doorzichtig. Die tweede afdruk is de zuivere achtergrond. Per tekstregel wordt de
slechtste achtergrondpixel eronder opgezocht en daartegen het contrast berekend.
Ruim 34.000 tekstregels per ronde.

Dat vond vier echte defecten:

**Het hele abonnementspaneel op `/plans` was onzichtbaar.** `.on-bright` is de
scope die zegt "de grond onder mij is helder, maak de inkt bijna zwart". Toen die
grond op 20 augustus een donkere foto werd, is die klasse op de homepage
weggehaald — en op `/plans`, dat hetzelfde blok gebruikt, vergeten. Sindsdien
stond daar bijna-zwarte tekst op een bijna-zwarte foto: vijftien regels op 1,0 tot
1,04 : 1, waar 4,5 de eis is. De kop "What a plan actually is." was op een
schermafdruk alleen te vinden door te weten waar hij stond.

**De hero van `/video` droeg een te lichte foto.** De sluier over een hero-beeld
was afgesteld op de donkere foto's van `/how-it-works` en `/about`; `/video` heeft
een man in een wit overhemd tegen licht beton. Vier tekstblokken zaten daar onder
de streep, op mobiel én op desktop.

**Op een telefoon lag de kop van de homepage naast zijn eigen plaat.** De
donkere plaat onder de kop is gemikt op 16 procent van links — goed op een breed
scherm, waar de kop in de linkerhelft staat. Op 390 pixels staat diezelfde kop
over de volle breedte en viel het rechteruiteinde erbuiten, precies waar de foto
het lichtst is.

**En de totaalbalk van het bestelformulier lag over de voettekst.** Die balk is
`fixed` en blijft dus onderaan het venster hangen, ook als je doorscrollt tot de
voettekst — waar hij over de bestelknop lag. Er was ruimte gereserveerd voor de
Doorgaan-knop, maar niet voor het einde van de pagina.

Daarnaast twee kleinere: de dagen in het capaciteitsrooster op `/studio` (een
gedimde rij vermenigvuldigt met de inkt, en 80 procent wit op 55 procent dekking
is 44 procent), en de aanhef van de dienstenrij op een lichte hero.

---

## 5 · Zoomen tot 200 procent

WCAG 1.4.4 vraagt dat tekst tot 200 procent vergroot kan worden zonder verlies.
Op een telefoon is dat geen zeldzaam geval maar de meest gebruikte
toegankelijkheidsinstelling die er is. Er is nu een controle die de échte
standaard-lettergrootte van de browser omhoog zet — niet `html { font-size }`,
want dat vergroot de letters wel maar laat `em`-breekpunten ongemoeid, en dan
meet je iets wat niemand ooit ziet.

**De bovenbalk paste niet meer.** Bij een venster van 1280 met de tekst op 200
procent stak de balk 83 pixels buiten het scherm, op elke pagina: de links, de
taalwissel en de bestelknop pasten niet meer naast elkaar, maar de burgerknop
kwam niet tevoorschijn — die keek naar de vensterbreedte, en die was niet
veranderd. Het breekpunt staat nu in `em`, dus hij luistert nu ook naar de
lettergrootte.

**De voettekst werd afgesneden.** Zelfde oorzaak: bij 640 pixels met grote letters
stond hij nog in twee kolommen en knipte `overflow-x: clip` de rechterkolom af —
"WAT WE MAKEN" eindigde op "WAT WE MAKE".

En twee kleinere: de knipdoos van de geanimeerde koppen was exact de regelhoogte,
dus bij een grotere letter verdwenen de staarten van de letters; en de vinkjesrij
in de hero mocht niet krimpen, waardoor "Yours to use, anywhere" de rand uit liep.

---

## 6 · Het abonnementsblok

Je vroeg om de gekozen achtergrond beter zichtbaar te maken, meer gevoel te
geven, en de witte film-grain spotlights weg te halen — met alles leesbaar.

**De sluier is een plafond geworden.** Er lag één vlakke sluier van 90 procent
bijna-zwart over de foto. Die maakte alles leesbaar, maar reken na wat hij met
het beeld doet: van elke pixel blijft een tiende over, dus de hele foto wordt in
het onderste tiende van de schaal geperst en de lichtbundel van rgb(255 254 240)
komt uit op rgb(33 34 35). Wat je zag was geen licht meer maar een grijze veeg.

In plaats daarvan wordt de foto nu met `multiply` tegen een donkergroen gelegd.
Vermenigvuldigen betekent dat de helderste pixel precies die kleur wórdt en al
het andere donkerder — de bovengrens ligt dus vast en is na te rekenen in plaats
van te hopen. Op #2A3412 haalt witte tekst 13,0 : 1, --ink-2 komt op 8,1 en het
accent op 13,5, tegen een eis van 4,5. En omdat de foto er twee keer op ligt,
allebei op `multiply`, wordt elke pixel gekwadrateerd: de bundel houdt zijn
kracht en alles eromheen zakt naar zwart. Dat is wat een lichtbundel in een
donkere ruimte doet.

**De drie witte spots en de korrel zijn weg.** Ze waren ooit terecht — ze moesten
een VLAK van accentkleur op een belicht voorwerp laten lijken, en op een lap
kleur is dat het juiste middel. Sinds de grond een foto van een echte lichtbundel
is, maken twee lampen over elkaar het beeld troebel in plaats van sfeervol. Wat
hun plaats inneemt is één vignettering die de hoeken naar de paginagrond trekt,
plus een smalle veeg accentlicht langs de bovenrand.

---

## 7 · De beelden die je stuurde

Die acht beelden zijn niet als bestand in mijn werkmap aangekomen — ik heb ze
gezien, maar ze staan nergens op schijf, dus ik kon ze niet als foto op de site
zetten. Wat ik wél kon doen is het RECEPT eruit halen, en dat is er ook het meest
aan: een bijna zwarte ruimte met precies één zuurgroene bron erin, die een vorm
met een harde rand achterlaat. Een leren jas, een kabeltrui, laarzen op nat
asfalt, een silhouet — steeds dezelfde belichting.

Dat recept staat nu als `.beam` in de stylesheet: een lichtbundel met een harde
rand (een `clip-path`) en een zachte kern (een verloop erbinnen), die de band in
komt en er weer uit gaat. Geen foto, dus geen enkel verzoek en geen bijsnijden op
een andere schermmaat, en hij gebruikt de accentkleur van het designsysteem in
plaats van een kleur die erop lijkt.

Hij staat op drie plekken, met opzet niet meer: de slotband van de homepage — het
laatste wat een bezoeker ziet voordat hij klikt — en de paginakoppen van
`/pricing` en `/start`. Nooit op een band die al een foto draagt.

Het lichtbudget ligt vast op 5,5 procent accent. Op de paginagrond tilt dat de
luminantie van 0,0075 naar 0,0175: witte tekst gaat van 19,4 naar 15,4 : 1 en
--ink-3 van 6,3 naar 5,4, allebei ruim boven de eis. Een bundel die tekst in
gevaar brengt is geen sfeer maar een fout.

**Wil je de foto's zelf op de site**, zet ze dan in
`E:\Claude (VISUAILS)\visuails-astro\public\img\` en zeg het — de kabeltrui en de
laarzen op nat asfalt zijn sterke lifestyle-beelden, en de galerij en de
stijlpagina's zijn er de plek voor.

---

## 8 · Wat er gemeten is

- **`npm test`** — 3163 assertions over 50 suites.
- **`npm run keuring`** — 455 metingen (91 pagina's × vijf breedtes, nu inclusief
  320): geen bevindingen. Drie soorten vals alarm zijn eruit gefilterd, met de
  reden erbij in de code: de gesloten mobiele lade, alles binnen een `<svg>`, en
  alles binnen een doos die zelf zijwaarts scrollt.
- **`node leesbaar.mjs`** — ruim 34.000 tekstregels op twee breedtes, tegen de
  werkelijk gerenderde achtergrond.
- **`node mobiel.mjs`** — het geopende burgermenu op zes schermmaten × vier
  pagina's.
- **`node zoom.mjs`** — drie zoomstanden over 91 pagina's.
- **`node wandel.mjs`** — een echte browser die de bestelroutes aflegt.
- **Vier audits** over de gebouwde site: tekstfouten, NL/EN-paren, dode links,
  JSON-LD.
- **`npm run visueel`** — 364 opnamen tegen de referentie.

Onderweg zijn ook drie fouten in de MEETGEREEDSCHAPPEN zelf gevonden, en die
noem ik omdat ze de cijfers eerder onbetrouwbaar maakten: een afdruk van de hele
pagina verschuift `svh`-maten en zet vaste lagen op de verkeerde plek; het trage
doorrollen (Lenis) verplaatste elementen tussen het opmeten en het afdrukken; en
doorzichtige tekst moet per kleurkanaal gemengd worden en niet per luminantie —
dat laatste scheelde het verschil tussen 2,74 en 6,40 : 1 op dezelfde regel.

---

## 9 · Wat nog van jou is

Ongewijzigd sinds gisteren: `npm run migrate`, `SELLER_ADDRESS` als Pages-secret,
`functions/api/debug-egress-ip.js` weggooien, `npm run krimpen` als proefdraai
(77 beelden), en de beslissing over een factuur bij de machtiging van € 1.

En daarna: `git push`, `npm run cron:check`, `npm run cron:deploy`.
