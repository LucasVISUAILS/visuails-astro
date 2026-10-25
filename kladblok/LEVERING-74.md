# Levering 74 · De opening met scrollvideo, Hoe het werkt met de lagen, de stroom, minder tekst, de hoeken, glas en gloed

**25 oktober 2026. Staat alleen in je map; je rolt zelf uit met `UITROLLEN.bat`.** Het plan en
je keuzes staan in `kladblok/PLAN-OPENING-SCROLL.md` (§5b: lijst 57).

> Nummer 74, omdat 69 tot en met 73 vastliggen voor de cloudsessie uit
> `kladblok/PROMPT-CLOUD-CODE.md`. Je koos: eerst 74 uitrollen, dan de cloudsessie starten; de
> prompt is daarop bijgewerkt (§2b, §8).

---

## 1 · Wat je vroeg

- **12:17**: de opening zoals je voorbeeld (de apparaten boven, de kop in één regel eronder,
  dan de zin), je video als scrollanimatie, "snappy en satisfying"; daarna Hoe het werkt in
  hetzelfde scherm, per dienst te kiezen; de lagen uit elkaar; de tekst intenser en naar links;
  een blauwe gloed zoals bij het logo; de zachte hoek alleen nog op knoppen, kaarten heel rond.
- **13:04** (lijst 57): bijna alles volgens mijn advies; een balk van glas.
- **13:07**: het laptopscherm langzaam donkergrijs naar zwart.
- **13:52**: het accentwoord ademt zoals het logo; geen schetsen meer, bouwen op de site.
- **14:39**: de drie stappen als blokken onder de tabs, met de animaties van nu.
- **15:24**: glas op plekken als de topbar, de knoppen subtieler, gloed in de accentkleur.
- **16:28**: Hoe het werkt rustiger en wit; lifestyle: eerst de look kiezen (of laten
  ontwerpen), dan "upload de foto's van je product", dan de foto's ontvangen; video hetzelfde,
  de voorbeelden volgen binnenkort.
- **16:40**: de lagen eerst vlak, dan uit elkaar in 3D, het product aangeduid als met AI
  gemaakt, dan weer in elkaar gezogen en door naar stap 3. Voortaan zo uitleggen.
- **16:42**: op de telefoon één blok dat van 01 naar 02 naar 03 gaat.
- **16:44**: vinkjes zonder achtergrond (zwart als wit niet zichtbaar is); geen zachte hoek
  meer op icoonplaatjes; kijken waar de plaatjes weg kunnen.
- **16:56**: één scroll naar de volgende sectie, de elementen zweven daar heel rustig, een
  "smooth ontploffing"; de teksten onder de stappen en andere onnodige tekst op de voorpagina
  weg. Je antwoorden: tot en met Wat we maken, daarna gewoon scrollen; alleen op de computer;
  de uitlegbalk alleen voortgang en pauze; "Haal het weg, ik zie het terug".
- **16:57**: geen "met de hand"-labels ("voelt veel te verdedigend, wees hier voortaan streng
  op"); alleen kort, tijdens de lagen, een subtiele gloed om het product dat het met AI gemaakt is.
- **"Ga door met wat nog open staat"**, met je antwoorden: de cookiekaart rechtsonder, overal;
  de zin "met de hand afgewerkt" in de FAQ herschrijven; "Elk beeld door ons gecontroleerd"
  houden; de cloudprompt bijwerken (eerst 74 uitrollen, dan de cloudsessie); "met de hand"
  overal rechtzetten zoals voorgesteld (niet bij hooks en de bedankpagina). Zie §2b.

## 2 · Wat er staat

### De opening (`src/components/HalOpening.astro`, `src/styles/opening.css`)
- Een podium van 3,3 schermhoogtes dat vast blijft staan. In rust: de still (je beeld van
  3840 px, AVIF 15 – 33 kB) met de winkel van JOUWMERK en de telefoonfoto in de schermen, de kop
  en één zin. Dat is ook het eerste beeld voor de laadtijd; de reeks laadt pas daarna.
- Scrollen speelt de video af: beeld 17 – 133 (117 beelden, AVIF, samen 1,2 MB beelddata) op een canvas;
  de schermen per beeld op hun vier hoeken (gemeten, `src/data/openingSchermen.json`). Het
  laptopscherm wordt donker met de hoek van de klep (13:07).
- Dan gaat de kop weg langs de snede van 53°, reist elke letter van "Zonder shoot." naar het
  label boven Hoe het werkt, en komen de kop met de tabs, de drie kaarten en de knoppen omhoog.
- **Waar de kop staat, is gemeten.** Onder de handen (je voorbeeld) of links naast de laptop,
  wat de grootste kop geeft. 1440 × 900: onder. 1440 × 780, 1280 × 800 en 1920 × 1080: links.
- Het accentwoord is inkt met een laag blauw uur die één keer ademt, pas na de eerste beweging
  (sinds de controle; eerst zonder einde, zie §7b).

### De stroom: één scroll, één sectie (16:56, alleen op de computer)
- Eén wieltik of toets (pijl, Page, spatie) vanaf het begin speelt de video in één keer af
  (3 s, rustig op gang, lang uitlopend) tot Hoe het werkt staat. De volgende tik: Formaten. De
  volgende: Wat we maken. Elk in 1,15 s: snel weg, heel zacht aankomen; dat is de "smooth
  ontploffing" zoals ik hem begreep. Daarna scrol je gewoon. Omhoog gaat het net zo terug.
- Op een stop maken de kaarten en beelden van die sectie één rustige golf (3 px, 4,4 s, kort na
  elkaar) en staan dan stil (sinds de controle; eerst zonder einde, zie §7b).
- Aan en uit staat bovenaan het blok in `HalOpening.astro`: `const STROOM = { aan: true, tot: 3 }`.
  **Wil je het alleen bij de laptop-opening houden** (je twijfelde daarover): zet `tot: 1`.
  Helemaal uit: `aan: false`.
- De €1-melding linksonder wacht tot de laatste stop voorbij is; anders lag hij over elke sectie.

### Hoe het werkt: drie witte kaarten (`VoorpaginaHal.astro`)
- Wit met een haarlijn, zoals de rest van de site (16:28); het middelste iets breder. Tussen de
  kaarten een lijn met een blokje dat oversteekt als de volgende stap begint.
- Geen regel tekst meer onder de stappen; de uitlegbalk toont alleen de voortgang en de
  pauzeknop (die moet blijven: wat langer dan 5 s beweegt, moet stil kunnen, WCAG 2.2.2).
- **Catalog**: 01 je foto's komen binnen en worden afgevinkt; 02 rechtzetten en nakijken, dan
  **de lagen**: eerst vlak, dan springen achtergrond, schaduw en product uit elkaar en kantelen
  in 3D, ze zweven even, op het hoogtepunt een zachte gloed in blauw uur om de broek en
  "Gemaakt met AI" eronder, dan worden ze weer in elkaar gezogen en is het vlak; 03 de vier
  beelden met hun vinkjes. Stap 02 duurt nu 12,9 s.
- **Lifestyle**: 01 kies je look (of een eigen stijl die wij ontwerpen; Flash wordt gekozen);
  02 upload de foto's van je product; 03 vier beelden in Flash.
- **Video**: 01 kies je stijl; 02 upload; 03 "Voorbeeldclips volgen binnenkort".
- Nergens meer "telefoonfoto's" en nergens "met de hand".
- **Op de telefoon één kaart** die van 01 naar 02 naar 03 gaat, zonder scrollen (16:42).

### Minder tekst op de voorpagina (16:56, "Haal het weg, ik zie het terug")
Weg (de zinnen staan nog in de code, terugzetten is één regel):
- de regel onder elke stap van Hoe het werkt;
- de zinnen in de uitlegbalk van Hoe het werkt en van Formaten;
- de tekst links van Formaten ("Kies in het bestelformulier …" en de kleine regel); het blok
  staat nu over de hele breedte en past in één scherm. Wat de kleine regel beloofde (16:9 en
  9:16 alleen bij lifestyle) staat nu in het beeld: "16:9 LIFESTYLE";
- de zin in elke kaart van Wat we maken;
- de zinnen onder Veelgestelde vragen en AI en de AI Act; bij de shootdag alleen nog "per
  shootdag, alles meegerekend".

Bewust laten staan, met reden:
- **"Eén product: €89 (catalog) of €109 (lifestyle). Meer producten, lager tarief."** Zonder
  die regel lijkt "vanaf €39" de prijs van één product.
- **De zin van de opening, de feitjes onder Hoe het werkt** (vanaf €39, de levertijd, geen
  minimum; alleen als het scherm hoog genoeg is), **"Gemaakt van jouw eigen foto · één per
  bedrijf"** bij de €1 en de vier vinkjes onderaan: dat zijn voorwaarden en feiten, geen uitleg.
- **"Elk beeld door ons gecontroleerd"** onderaan: een belofte over controle, niet "met de hand".
  Je koos: houden.

### De iconen (16:44), op de hele site
- **Vinkjes zonder plaatje**, het vinkje zelf in inkt: in Hoe het werkt, op /per-product,
  /how-it-works, in de leverlijst, de abonnementen, het bestelformulier. Wit alleen op de
  donkere beelden van Flash (gemeten: 4 – 5 van 255 onder het vinkje).
- **Iconen in lijsten zonder plaatje**: de controles op /custom-models en /upload-guidelines,
  Studio, de pipet op /about, het plusje op /per-product, het i'tje onder Wat we maken.
- **Pijlen naast tekst of in een lichte kaart zonder plaatje**: Wat we maken ("Bekijk
  productfoto's →"), Nog vragen?, /start, /how-it-works.
- **Wat een plaatje houdt** (pijlen en afspeelknoppen op foto's, de knopjes op /about en in de
  galerij): vier gelijke hoeken, geen zachte hoek; concentrisch in de hoek van een kaart.
- De knoppenparen met de snede (vorige · volgende) zijn knoppen en houden hun vorm.

### De hoeken
Kaarten 24 px rond, grote vlakken 32, kleine tegels 12; de zachte hoek alleen nog op knoppen,
chips, pillen, tabs en velden. Concentrisch waar iets in een hoek ligt. Op de hele site, Studio,
account, portaal, admin en de mails (KLEURENSCHEMA, "De hoeken").

### Glas, gloed en de knoppen (15:24)
- Glas op wat boven de pagina zweeft: de balk, zijn uitklapmenu's, de WhatsApp-knop.
- De knoppen: 48 px in plaats van 56 (klein 40), letter 15, pijl 17; de lijnknop een haarlijn.
  Onder de muis komt een gloed in blauw uur van de onderrand op, in plaats van de harde wissel.
- Bestellen bovenin: een zachte gloed in blauw uur eronder.

## 2b · Na "Ga door" (19:15 – 20:20)

### De cookiekaart: rechtsonder, overal
- Op de computer rechtsonder (16 px van de rand), op de telefoon over de hele breedte zoals
  eerst. De WhatsApp-knop schuift erboven zolang de kaart open is.
- Als de kop van de opening onderaan staat (1440 × 900, 1280 × 800) zou de kaart over het eind
  van de kop liggen. Daar staat hij er dan net boven, en zodra de kop helemaal weg is zakt hij
  rustig terug naar de hoek (de snede haalt de kop van rechts weg, dus de kaart valt nooit over
  letters die je nog ziet). Gemeten op 1440 × 900, 1440 × 780, 1280 × 800, 1920 × 1080,
  1024 × 768 en 390: nergens over de kop of de zin.

### "Met de hand": overal rechtgezet
Alle nieuwe en veranderde zinnen, NL en EN, met de plek: `kladblok/TEKSTEN-74.md`. Kort:
- **/how-it-works**: het label "Met de hand" heet nu "Nagekeken"; de kop "Gemaakt met AI.
  Tot in detail nagekeken." (je koos "Nagekeken tot op het detail.", maar die brak in drie regels;
  dit past op elke breedte in twee); de zin "Elk beeld wordt in de studio nagekeken tegen je foto
  voordat jij het ziet."
- **FAQ** (ook in de gegevens voor Google): "…en nagekeken voordat die wordt geleverd", "…en
  nagekeken.", "elk verschil dat we zien rechtzetten".
- **De doorloop** (/voorbeeld): "Elk beeld wordt afgewerkt in professionele editingtools".
- Niet veranderd: "Hooks maken en plannen we met de hand" en "we lossen het met de hand op" op de
  bedankpagina. Dat gaat over planning en contact, niet over hoe een beeld gemaakt wordt.

### De cloudprompt (`kladblok/PROMPT-CLOUD-CODE.md`, met je ja)
Bijgewerkt voor de volgorde die je koos: eerst 74 uitrollen, dan de cloudsessie. De sessie leest
nu eerst deze notitie, stopt als `HalOpening.astro` niet op main staat, telt 269 toetsen, houdt
de opening en de stroom, en kent de nieuwe regels (glas en gloed, geen verdedigende AI-zinnen,
de LCP is de still van de opening). Bij levering 70 staat dat de looks in Hoe het werkt naar de
launchset moeten (Flash, Phone-made, August en de eigen look) en dat Formaten kaal blijft.

### Glas op de balk van Studio en /admin
De balk bovenin Studio en /admin zweeft net als die van de site, dus kreeg hij hetzelfde glas
(92 %, vervaging 16 px; contrast van de tekst 4,69:1 op de lichtste plek). De lade op de
telefoon is een vol wit scherm en de balk van de privélink staat stil: die bleven zoals ze waren.

### De eindcontrole, en wat ik daarbij repareerde
- **Verschuiven tijdens het laden** (CLS) was 0,40 op de computer met minder beweging en 0,22 op
  de telefoon: de pagina sprong nog een keer als het script de opening klaarzette, en de
  "Naar de inhoud"-link kwam daardoor even in beeld. De stilstaande stand staat nu al in de css,
  vóór het script; nu 0,002 – 0,016 (goed is onder 0,1).
- **Contrast**: de stappen die nog moeten komen waren in hun geheel half doorzichtig, ook de
  tekst (onder 4,5:1). Nu wordt alleen het beeld zachter en is de tekst grijs (5,52:1).
- **Gemeten** (lokaal, zonder compressie): eerste beeld (LCP) 0,86 s op 1440 en 0,81 s op 390,
  allebei de still van de opening; axe zonder fouten. Het eerste scherm haalt nu 3,0 MB op de
  computer (met de 117 beelden van de video) en 1,6 – 2,0 MB op de telefoon, omdat beelden onder
  de vouw vroeg laden. Lichter maken staat in de cloudprompt bij levering 72.

## 3 · Bewust anders dan het schema (en waarom)
- **Glas en gloed**: jouw vraag van 15:24, in het schema vastgelegd ("Glas en gloed").
- **"Gemaakt met AI" in blauw uur, met een gloed in blauw uur en een smalle zoom blauw licht**:
  jouw vraag van 16:57. In het schema opgenomen als plek waar blauw mag ("Waar blauw staat").
- **De band "Wij doen de rest"** is weg: in één scherm past hij niet. Wil je hem terug, dan
  kan hij onder het podium.

## 4 · Mijn mening, kort
- De stroom voelt goed tot en met Formaten. Bij Wat we maken zou ik hem laten stoppen
  (`tot: 2`): dat is de sectie waar je wilt kiezen en klikken, en daar is een vaste stop eerder
  een hindernis dan een ritme. Probeer het eerst zelf; de knop staat klaar.
- Het lagen-verhaal is het sterkste stuk van de pagina: hij laat zien wat AI doet zonder het te
  verdedigen. Dezelfde vorm past straks bij lifestyle (product, model, achtergrond) zodra je die
  lagen hebt.

## 5 · Goed om te weten: de content credentials in de beelden
Elk beeld dat ik in je map zet, krijgt onderweg een blok "content credentials" (C2PA) van
ongeveer 6 kB mee: een ondertekende notitie dat Claude het bestand leverde. Dat blok laat ik
staan. Voor de 117 beelden van de video is dat samen 0,66 MB extra: 1,8 MB in plaats van 1,2.
De beelden zelf zijn pixel voor pixel gelijk (nagemeten). `test:opening74` meet daarom de
beelddata (hooguit 1,6 MB) en het geheel (hooguit 2 MB) apart. Wil je de lichtere bestanden,
dan kun je de reeks zelf opnieuw maken uit je video met `scripts/opening-reeks.mjs`.

## 5b · Wat ik nog van je nodig heb
- **Lifestyle en video van de roze jeans.** Lifestyle laat nu de look Flash zien (andere
  kleding); video heeft nog geen voorbeelden ("binnenkort"). Met jouw beelden klopt het verhaal
  van begin tot eind.
- **Je blik op `kladblok/TEKSTEN-74.md`**: elke zin die in deze levering nieuw is. Ik heb er geen
  enkele als af beschouwd.

## 6 · Bestanden
- Nieuw: `src/components/HalOpening.astro`, `src/styles/opening.css`, `src/data/openingSchermen.json`,
  `public/img/hal/opening/` (still, schermen, `f/017 – 133.avif`), `scripts/opening-reeks.py`,
  `scripts/opening-reeks.mjs`, `tests/opening-74.test.mjs`, deze notitie.
- Veranderd: `src/components/VoorpaginaHal.astro`, `FormatenHal.astro` (kaal op de voorpagina),
  `UitlegBalk.astro` (varianten per dienst), `src/styles/hal.css`, `src/styles/werkplaats.css`
  (het vinkje), `src/scripts/interactions.js` (de €1-melding wacht op de opening en de stroom),
  `package.json` (test:opening74), `docs/KLEURENSCHEMA.md`, `docs/DESIGN.md`, en voor de
  hoeken bestanden in css, componenten, mails, admin en portaal.
- Na "Ga door" (§2b): `src/components/HowItWorksHal.astro`, `src/data/faq.js`, `src/data/demo.js`
  (de teksten), `src/styles/studio-hal.css` en `public/admin.css` (het glas), `src/styles/opening.css`
  en `src/styles/hal.css` (de cookiekaart, het verschuiven, het contrast), `HalOpening.astro`
  (`--o-cc-onder` en `o-kopweg` voor de cookiekaart), `kladblok/TEKSTEN-74.md` (nieuw) en
  `kladblok/PROMPT-CLOUD-CODE.md`.
- Na de controle (§7b): `src/components/HalOpening.astro`, `UitlegBalk.astro`, `FormatenHal.astro`,
  `src/styles/opening.css`, `hal.css`, `werkplaats.css`, `src/data/pricing.js` (de belofte over je
  product), `src/pages/how-it-works.astro` en `src/pages/nl/how-it-works.astro` (de beschrijving
  voor Google), `docs/DESIGN.md`, `docs/KLEURENSCHEMA.md`, `kladblok/TEKSTEN-74.md`.
- Toetsen bewust bijgewerkt (met datum en reden erin): `doorloop-27c` en `hoe-stappen-29` (stap 02
  duurt 12,9 s), `laptop-standen` (de zin van stap 02 zonder "met de hand"), `hal-voorbeeld` (de
  laptop staat niet meer op de voorpagina, wel op /catalog), `klant-stand` (de €1-melding wacht tot
  de opening en de stroom voorbij zijn), `uploadbelofte` ("foto's van je product" in plaats van
  "telefoonfoto's"), `hoekregel-browser` en `minder-sjabloon-browser` (de nieuwe hoeken; glas en gloed
  op wat zweeft).

## 7 · Nagekeken
- **De hele reeks** (269 toetsen): 264 goed in de eerste ronde. De vijf andere: drie die de oude
  tekst of het oude gedrag vastlegden, bewust bijgewerkt en daarna goed (`uploadbelofte` 21/21,
  `klant-stand` 127/127, `laptop-standen` 48/48); `hoekregel` liep op twee plekken die ik daarna
  repareerde (het i'tje op /pricing en /ai-act, het label in Formaten) en is nu 134 goed, 0 fout;
  `backupterugzet` kan in deze omgeving niet draaien en faalt hier altijd, los van deze levering.
- **Na de laatste build opnieuw**: `opening74` 68/68 (nieuw: de lagen in 3D met de gloed, weer vlak
  na afloop, de stroom met het wiel, geen "met de hand", geen tekst onder de stappen),
  `sjabloon` 891 goed, `hoekregel` 134 goed, `hal-voorbeeld` 131/131, `doorloop-27c` 88/88,
  `hoeken-ontbreekt-browser` 28/28, `hoe-stappen-29` 23/23, `a11y` goed.
- **Na "Ga door" (20:20, de hele reeks opnieuw)**: 268 van 269 goed; alleen `backupterugzet`, dat
  hier nooit kan draaien. Na de kortere kop van /how-it-works opnieuw gebouwd en de zestien toetsen
  die die pagina raken nog eens gedraaid: alle goed (`sjabloon` 891, `hoekregel` 134, `klant-stand`
  127/127, `hal-voorbeeld` 131/131, `a11y` 17/17, `promises` 197/197). De kop staat nu op 1440, 1280,
  1024 en 390, NL en EN, in twee regels (gemeten).
- **Bekeken** op 1440 × 900, 1440 × 780, 1920 × 1080 en 390: de lagen beeld voor beeld (vlak →
  3D → gloed met "Gemaakt met AI" → vlak → stap 3), de stops van de stroom, Formaten in één scherm
  met "16:9 LIFESTYLE", en elke plek waar een icoon zijn plaatje verloor (twintig uitsneden).

## 7b · De controle (25 oktober, 21:31 – 22:40)

Je vroeg: *"Doe een volledige controle op wat je allemaal hebt gemaakt en zoek actief naar fouten,
inconsistenties en andere problemen op de website."* Gemeten: alle 95 pagina's op 390 en 1440
(zijwaarts scrollen, scriptfouten, kapotte beelden, tekst kleiner dan 11,5 px, koppen langer dan
twee regels), de voorpagina op 15 breedtes van 320 tot 2560 in NL en EN, met minder beweging en
zonder script, axe in elke tab, gepauzeerd en spelend. Daarnaast heeft een tweede blik, die het
werk niet kende, de code van de opening nagelezen en elk punt in de browser nagespeeld. Gevonden
en opgelost:

**Wat je ziet**
1. De kop van de opening stond op de telefoon in drie regels (320 px in NL en EN, 390 – 414 px in
   EN). Hij krimpt nu mee (26 – 34 px) en blijft twee regels.
2. Contrast in Lifestyle en Video: de namen van de looks die niet gekozen zijn haalden 4,24 : 1,
   de tekst in de vakken die nog moesten komen 1,76 : 1 ("Voorbeeldclips volgen binnenkort"), en
   met de pauzeknop bleef dat zo staan. Nu worden alleen de beelden zacht en de letters grijs
   (5,52 : 1). axe: geen fouten meer, in elke tab, spelend en stilgezet.
3. Had je de uitleg stilgezet en koos je een andere tab, dan begon hij weer te bewegen. Nu staat
   de nieuwe dienst meteen in zijn eindstand; met "opnieuw" speel je hem af.
4. Ademen en zweven liepen zonder einde (WCAG 2.2.2). Jouw keus: één keer, dan stil. Het woord
   ademt één keer in 4,8 s; op een stop maken de kaarten één golf van 4,4 s.
5. Koppen van drie regels: /start/catalog en /start/lifestyle (ook op de computer), en op de
   telefoon de €1-koppen van /test-sample en /upload-guidelines. Nu twee regels (gemeten).

**Wat er gebeurt als je scrolt, terugkomt of klikt**
6. Terug of herladen zette je zo'n 2250 px te laag (de browser schoof de stand mee terwijl het
   podium groeide). Nu kom je terug waar je was.
7. /nl/#hoe kwam halverwege de video uit; nu op Hoe het werkt.
8. Hoe het werkt stond er al, maar was een stukje lang niet aan te klikken. Nu is elk deel
   klikbaar zodra het staat.
9. Het glijden duurde altijd 3 s, ook voor 10 px, en hield zolang elke tik tegen. De tijd hangt
   nu af van de afstand (de hele video blijft 3 s).
10. Venster smaller tijdens het zweven: het zweven liep door. Venster anders tijdens het glijden:
    je landde op de oude stop. Beide opgelost; sta je op een stop, dan blijf je daar.
11. Met de cookie-instellingen open gleed de pagina erachter weg. Nu niet meer.
12. Precies 900 px breed: het script deed computer, de css telefoon. Nu is 900 telefoon.

**Onder de motorkap**
13. De opening werd bij elk laden twee keer opgezet (alles dubbel, 234 beeldobjecten voor 117
    beelden). Nu één keer, en de beelden van de video één keer per bezoek.
14. Zonder script, en heel even vóór het script, stond een verkeerd stuk schermbeeld in de
    laptop en de telefoon. Nu staat er de juiste winkel en telefoonfoto, ook zonder script.
15. De wielluisteraar die de stroom nodig heeft, remde elk scrollen op de voorpagina, ook als de
    stroom uit stond (telefoon, minder beweging). Nu alleen als de stroom aan kan.
16. Een wieltik zonder beweging telde als omhoog. Nu niet meer.
17. Een schermlezer hoorde niet dat 16:9 en 9:16 alleen bij lifestyle horen (dat staat alleen in
    het beeld). Nu staat het onzichtbaar op die knoppen.
18. De uitleg liet bij elke zachte navigatie een observer en een luisteraar achter (al van vóór
    74). Nu ruimt hij op.

**Teksten**
19. "Met de hand" stond nog in de belofte over je product (op /upload-guidelines, /how-it-works en
    in de FAQ, ook in de gegevens voor Google) en in de beschrijving van /how-it-works voor Google,
    in NL en EN. Rechtgezet; alles in `kladblok/TEKSTEN-74.md`.
20. `TEKSTEN-74.md` miste "Voorbeelden volgen binnenkort" (video, stap 1) en "Compleet". Erbij.

**Bewust niet veranderd**
- "Menselijk oordeel op elke visual" op /about: positionering, geen label. Zeg het als je ook die
  zin weg wilt.
- "Telefoonfoto's" op /catalog, /upload-guidelines en in de leverpagina: daar gaat het juist om
  de foto die je met je telefoon maakt. Je opmerking van 16:28 ging over Hoe het werkt.
- De €1 telt in de koppen van het €1-blok als eigen regel; dat is het ontwerp.

**Getest na de controle**: de hele reeks 266 van 269 goed in de eerste ronde. De drie andere:
`backupterugzet` (kan hier nooit draaien), `liveqa51` (een regel van mij in `hal.css` gebruikte
`:is()`, wat daar niet mag; herschreven) en `hal-voorbeeld` (één meting liep vast onder de drukte
van de hele reeks; los opnieuw 131/131, twee keer). Na de laatste build opnieuw en allemaal goed:
`opening74` 68/68, `a11y` 17/17, `zacht` 14/14, `klant-stand` 127/127, `hoe-stappen-29` 23/23,
`doorloop-27c`, `laptop-standen` 48/48, `hal-voorbeeld` 131/131, `sjabloon` 891, `hoekregel` 134,
`telefoon-tekst` 32/32, `promises`, `liveqa51`, `werkplaats` 108/108, `concept-browser` 52/52.

**Gecontroleerd en goed**: geen zijwaarts scrollen, geen scriptfouten, geen kapotte beelden, geen
tekst onder 11,5 px op alle 95 pagina's; de beelden van de video laden niet op de telefoon en niet
bij minder beweging; de tabs werken met de pijltjes, Home en End; elke luisteraar op window gaat
weg bij een zachte navigatie; de cookiekaart ligt op negen computermaten nergens over de kop.

## 8 · Uitrollen
- `UITROLLEN.bat` vanuit je map; `kladblok/COMMIT-BERICHT.txt` beschrijft alleen deze levering.
- **Eerst 74, dan de cloudsessie** (je keus). De bijgewerkte cloudprompt gaat daarvan uit en
  stopt als de opening niet op main staat. Start de cloudsessie dus pas als `UITROLLEN.bat`
  klaar is en de site live goed staat.
