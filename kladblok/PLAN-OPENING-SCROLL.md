# Plan · De opening met scrollvideo en "Hoe het werkt" in hetzelfde scherm

**Opdracht van Lucas, 25 oktober 2026.** Zijn woorden staan letterlijk in
`E:\Claude (VISUAILS)\opdrachten\2026-10-25 opening en hoe het werkt\OPDRACHT.txt`.

**Stand (25 okt, 22:40): gebouwd als levering 74, nagelopen in de controle (§7b), in zijn map, niet live** (`kladblok/LEVERING-74.md`). Open: de
lifestyle- en videobeelden van de roze jeans (Lucas), of de stroom tot en met Wat we maken blijft of alleen bij de
opening (`STROOM.tot`), en uitrollen (eerst 74, dan de cloudsessie).

**Zo houd ik dit bij.** Elke sessie die hieraan werkt, leest eerst dit bestand en de map, vinkt af wat klaar is
(met datum en leveringnummer) en schrijft onderaan in het logboek wat er gebeurde. Nooit uitgaan van een eigen
kopie. Wat ik niet zeker weet, vraag ik aan Lucas.

---

## 1 · Wat hij wil, in acht punten

| | Wat | Zijn woorden, kort |
|---|---|---|
| A | **Nieuwe indeling van de opening**: de apparaten bovenaan, de tekst eronder | "zoals het bijgevoegde voorbeeld" (`voorbeeld-indeling-opening.png`) |
| B | **Scrollanimatie met zijn video**: het scherm klapt dicht, telefoon en laptop verdwijnen | "snappy en satisfying" |
| C | **De tekst blijft staan** tot de apparaten weg zijn | "kijk even … of dat … nog op het scherm kan staan" |
| D | **Hoe het werkt komt omhoog in hetzelfde scherm** | "alsof je … nog steeds op de eerste pagina staat" |
| E | **Hoe het werkt per dienst**: Catalog, Lifestyle en Video kiezen, één proces tegelijk; de onderdelen gaan uit elkaar (catalog: achtergrond, schaduw, product met "gemaakt door middel van AI") | "rust word bewaard"; "goed gebruik van de VISUAILS style" |
| F | **Daarna gewoon verder scrollen** naar wat we maken | |
| G | **Tekst onder de opening intenser en naar links**; geen gekleurde accentwoorden, maar een blauwe gloed die beweegt | "zoals over het logo maar dan iets feller/subtieler", "volgens het kleurenschema" |
| H | **Hoeken**: één zachte hoek alleen nog op specifieke plekken zoals knoppen; kaarten en grote vlakken gewoon heel rond | "iets ronder dan in het voorbeeld" |

Werkwijzen die hij noemde: `impeccable` (animate, daarna polish en audit), `visuails-stijlschets` (alleen als er
nieuw beeld voor lifestyle of video gemaakt moet worden), en Astro (alles als Astro-component, script gebundeld).
Daarnaast altijd `visuails-ontwerptaal` en `docs/KLEURENSCHEMA.md`.

---

## 2 · Wat ik al gemeten heb (25 okt, op zijn bestanden)

### De video
- `images\BG\magnific_static-shot-…_78824.mp4`: **6,0 s, 144 beelden, 24 per seconde, 1920 × 1080**, 1,29 MB.
  De grond is **#FFFFFF** (gemeten in de hoeken).
- Wat er gebeurt:

| Tijd | Beelden | Wat |
|---|---|---|
| 0 – 0,7 s | 0 – 17 | stil |
| 0,75 – 2,5 s | 18 – 60 | het scherm van de laptop klapt dicht |
| 2,75 – 4,0 s | 66 – 96 | de telefoon gaat er rechts uit, met bewegingsonscherpte |
| 4,0 – 5,25 s | 96 – 126 | de laptop gaat er links uit |
| 5,25 – 6,0 s | 127 – 143 | de laptop schuift het laatste stuk links uit beeld; **beeld 133 is het eerste helemaal witte beeld** (gemeten 25 okt 13:20), daarna wit |

  Bruikbaar: beeld 0 tot en met 126. De vage resten aan het eind trek ik naar wit.
- **Het startbeeld** `images\BG\opening-laptop-telefoon-wit-3840x2160.png` is precies beeld 0 in dubbele maat
  (gemiddeld verschil 1,1 op 255, geen verschuiving). Dat wordt de scherpe rustand; de video begint pas als je scrolt.
  (`opening-laptop-telefoon-wit-5461x3072.png` in dezelfde map is zo goed als leeg: alleen doorzichtig.)
- **De schermen zijn leeg wit**, in de still en in de video. De winkel van JOUWMERK en de telefoonfoto moeten erin.
  In de rustand kan dat zoals nu (`src/data/halLaptop.js`, matrix3d). Tijdens het dichtklappen en wegdraaien moet ik
  de schermhoeken per beeld meten (uitbreiding van `scripts/laptop-foto.py`) en het scherm laten meebewegen.
- **De video is 1080p.** Op een laptop met dubbele pixeldichtheid is hij zachter dan de still van 3840. Ik wissel pas
  van still naar video bij beeld 18, als de beweging begint; dan valt het verschil weg in de beweging. Een 4K-versie
  (opschalen in Magnific) kan ook, maar kost credits: dat beslist Lucas.

### Het kader: waar de armen het beeld uit gaan
- De apparaten beginnen op y = 193 (de bovenste 18 % is wit).
- De linkerarm gaat het beeld uit via de linkerkant (y 669–870). De rechterarm gaat via de rechterkant (y 942–1079)
  én via de onderkant (x 1796–1919): de rechteronderhoek.
- **Uitsnede** waarbij beide armen via de zijkant het beeld uit gaan en de onderrand helemaal wit is: x 0–1681,
  y 150–992 (1681 × 842, verhouding 2,0). Daaronder kan de pagina gewoon wit doorlopen, zonder zichtbare rand.
  De rechterarm gaat er dan uit via de rechterkant (y 797–990).
- **Wat er dan overblijft voor de tekst in het eerste scherm**, met de video over de volle breedte:

| Scherm | Video | Over voor de tekst |
|---|---|---|
| 1440 × 900 | 1440 × 721 | 179 px |
| 1440 × 780 (MacBook Air, met de balken van de browser) | 1440 × 721 | 59 px |
| 1280 × 800 | 1280 × 641 | 159 px |
| 1536 × 864 | 1536 × 769 | 95 px |
| 1920 × 1080 | 1920 × 962 | 118 px |

  Smaller dan de volle breedte kan niet: dan zie je de armen midden op de pagina afgesneden. Zijn voorbeeld
  (`voorbeeld-indeling-opening.png`, 1071 × 813) heeft hetzelfde: de kop en de zin staan daar in de onderste
  ±170 px, zonder knoppen. **Kop en één zin passen dus; de drie knoppen en de feiten niet allemaal.** Zie vraag 1.

### Het gewicht van de beeldreeks (gemeten met sharp, uitsnede, wit getrokken)

| Breedte | 127 beelden AVIF q60 | per beeld | WebP q80 |
|---|---|---|---|
| 1600 px | 1,46 MB | 11,8 kB | 2,00 MB |
| 1200 px | 0,91 MB | 7,3 kB | 1,26 MB |
| 800 px | 0,51 MB | 4,1 kB | 0,68 MB |

Licht, omdat het meeste wit is. Een beeldreeks op een canvas is daarom beter dan de mp4 met de scroll laten
verspringen (dat hapert in Safari vaak), en de reeks laadt pas na de still.

### De opening van nu (code)
- `src/components/VoorpaginaHal.astro` r. 241–274: links de tekst (label, kop met wisselwoord, zin, drie knoppen,
  drie feiten), rechts `HalLaptop` (de foto met 9 standen per taal en de belletjes). Op de telefoon (≤ 900 px) eerst
  de tekst, dan de foto.
- `HalLaptop` staat ook op `/catalog`, `/lifestyle` en `/video`, met alleen hun eigen set.
- Hoe het werkt, r. 276–485: drie stappen (je stuurt, wij maken, je keurt goed). Stap 2 "met de hand" (pen, pipet,
  penseel, 15 okt). De lagen van de roze jeans bestaan al, 760 × 760 en pixel voor pixel op elkaar
  (`ba2-na-front-uitgeknipt.webp`, `ba2-na-front.webp`, de grond uit `voorbeeldset.js`).
- Toetsen die de opening of Hoe het werkt raken: `a11y`, `doorloop-27c`, `hal-voorbeeld`, `hardgetypt`,
  `hoe-stappen-29`, `klant-stand`, `laptop-standen`, `plaatshouders-pad`.
- Hoeken: `src/styles/hal.css` heeft 562 regels met `border-radius`. De hoekregel van lev. 56 wordt bewaakt door
  `tests/hoekregel-browser.test.mjs`, `hoeken.test.mjs` en `hoeken-ontbreekt*.test.mjs`.

### Zijn vraag: kan de tekst blijven staan tot de laptop weg is?
**Ja.** De opening wordt een vastgezet podium (`position: sticky`) in een hoger blok. De tekst staat stil terwijl de
video met de scroll meeloopt, en gaat pas weg als de apparaten weg zijn. Twee dingen kunnen niet mee:
- de belletjes op de foto ("Een paar telefoonfoto's"): die horen bij het stilstaande scherm en gaan weg zodra het
  scherm begint dicht te klappen;
- de wisselende standen: tijdens het scrollen staat er één stand stil in het scherm.

---

## 3 · Mijn mening

- **Goed plan.** Het lost Schets 58 in één keer op (armen uit de zijkanten, geen fade), en het verhaal klopt: de
  apparaten gaan weg ("zonder shoot") en dan zie je hoe het wel gaat.
- **Snappy zit in de afstand, niet in automatisch afspelen.** Een animatie die zelf afspeelt als je scrolt
  (scrolljacking) voelt snel stuurloos. Beter: de video volgt de scroll precies, over een korte afstand (voorstel:
  de hele video in ongeveer 1,2 schermhoogte), en klikt vast op twee rustpunten (begin en Hoe het werkt). Dat voelt
  als een klik, niet als een film die je moet uitzitten. Zie vraag 2.
- **"Gemaakt door middel van AI" op de productlaag is eerlijk en klopt** met hoe het gemaakt wordt (het productbeeld
  met AI, de achtergrond en de schaduw met de hand in Photoshop, §30.3 van het overzicht) en met /ai-act. Het botst
  met wat hij op 14–15 okt zei ("het geeft het gevoel dat het een AI-tool is en dit is het ZEKER NIET"). Daarom:
  een feitelijk label in mono op die ene laag, naast "achtergrond · jouw kleur" en "schaduw · met de hand". Geen ✦,
  geen glans.
- **De blauwe gloed botst met twee regels**: geen blauw kopwoord, en geen gloed ("heel erg generiek en saai", over
  de gloed achter het logo, 23 okt). Mijn voorstel: geen waas, maar dezelfde baan als bij het logo (onder 53°), die
  één keer door het accentwoord trekt als het in beeld komt en onder de muis; daarna is het woord weer inkt.
  Feller = de kern van de baan in blauw uur op vol; subtieler = smal (ongeveer een derde van het woord) en kort.
  Alleen #25508B op wit, dus binnen het schema. Zie vraag 6.
- **Hoeken: goed.** Grote kaarten met één zachte hoek zijn nu het meest "sjabloonachtige" van de site. Als alleen
  knoppen (en chips) de zachte hoek houden, wordt de knop juist herkenbaarder. De concentrische regel blijft:
  een vlak in een kaart krijgt de straal van de kaart min de afstand tot de rand. Zie vraag 7.
- **Volgorde: eerst de hoeken, dan de opening.** Anders bouw ik Hoe het werkt met kaarten die meteen weer om moeten.

---

## 4 · De fases en wat er af is

### Fase 0 · Voorbereiden (Claude, geen bouwwerk)
- [x] Opdracht, video en voorbeelden opgeslagen (25 okt)
- [x] Video, still, uitsnede en gewicht gemeten (25 okt, §2)
- [x] Antwoord op "kan de tekst blijven staan" (25 okt, §2)
- [x] Nakijken of de site sinds 25 okt veranderd is (25 okt 12:45: geen uitrol of LEVERING-notitie erbij; wel `kladblok/PROMPT-CLOUD-CODE.md`, zie hieronder)
- [~] **Afstemmen met `kladblok/PROMPT-CLOUD-CODE.md`** (open: Lucas zei om 13:52 "pas dit aan op de huidige website"; dus gebouwd als levering 74, en bij het uitrollen samenvoegen met wat de cloudsessie heeft gedaan) (25 okt 12:36, een andere chat): een cloudsessie bouwt de leveringen 69 tot en met 73 op
      de branch `claude/voor-de-launch`. Fase 1 en verder pas na het uitrollen daarvan (de hoeken raken `hal.css` op
      honderden plekken), en levering 72 moet de opening van de voorpagina overslaan. Aan Lucas gevraagd of ik dat in die
      opdracht zet.
- [x] **Lijst 57**: zijn keuzes (§5) als afvinklijst. Ingevuld 25 okt 13:04; zijn antwoorden staan in §5b.
- [x] **Schets 59**: een werkend voorbeeld met de echte video: de opening, de overgang en alle drie de diensten in
      Hoe het werkt, met zijn antwoorden uit lijst 57 en het donkere scherm van 13:07 erin. Bekeken op 1440 × 900,
      1440 × 780, 1280 × 800 en 390 × 844, stand "links naast" en "onder". https://claude.ai/artifact/FpjRmRDd1yHWVv7vhGXZqA
- [x] **Zijn reactie op Schets 59** (13:52): het woord niet gekleurd maar ademend; geen schetsen meer; bouwen op de site.

### Fase 1 · De hoeken (eigen levering, vóór de opening)
- [x] Tokens in `hal.css` (en `studio-hal.css`, `werkplaats.css`, admin- en portaal-css als hij ja zegt):
      knop (de zachte hoek), kaart, groot vlak, en de concentrische regel
- [x] Alle `border-radius` nalopen (562 in hal.css) en per soort omzetten, niet blind vervangen
- [x] Hoekregel aanpassen: `tests/hoekregel-browser.test.mjs`, `hoeken*.test.mjs` (met reden in de toets)
- [x] `docs/KLEURENSCHEMA.md` en `docs/DESIGN.md` bijwerken; de skill `visuails-ontwerptaal` als voorstel aan Lucas
- [x] Hoekmeting op alle pagina's (`kladblok/hoek/hoekmeting.mjs`), schermafdrukken 1440 en 390, testreeks

### Fase 2 · De video voorbereiden (een script, herhaalbaar)
- [x] `scripts/opening-reeks.mjs`: beelden 0–133 uit de mp4 (133 is het eerste witte beeld; 0–16 staan stil en hoeven niet mee), wit trekken (≥ 250 wordt 255), uitsnede uit §2,
      AVIF en WebP in 1600, 1200 en 800 (en een telefoonuitsnede als hij die kiest), vingerafdruk zoals
      `halStanden.bron.json`
- [x] Schermhoeken per beeld meten (laptop 0–41, telefoon 0–78) naar `src/data/openingSchermen.json`, met een
      controleblad (de gemeten hoeken op elk zesde beeld getekend). Bij bewegingsonscherpte: het scherm mee laten vervagen.
      De vierhoeken 2,5 px ruimer dan het gat, zodat er geen licht randje langs het scherm komt.
- [x] **Het laptopscherm wordt donker als de klep dichtgaat** (Lucas, 13:07: "niet grijs maar echt langzaam donkergrijs
      naar een zwarte kleur"). Werkt in Schets 59 zo:
      · In het gat van het scherm is de alfa 0, gemeten tegen de helderheid van dat scherm in dat beeld. Zo valt het grijs
        van de video niet meer als waas over de shop (dat was het grijs dat hij zag).
      · Per beeld een donkerte `d = 1 − r^1,6`, met r = de hoogte van het scherm ten opzichte van beeld 17. Een laag in inkt
        met die dekking ligt op de shop. Beeld 25: 6 %, 33: 42 %, 37: 67 %, 41: 88 %.
      · Beeld 42–46: het reepje scherm uit de video, per kolom gevonden onder de bovenrand van de klep en per regel
        doorgetrokken langs de vingers, naar inkt getrokken (rand en scherm samen, zoals bij een echte laptop).
      · Het script: `reeks2.py` uit de schets wordt een stap in `scripts/opening-reeks.mjs`.
- [x] De still van 3840 als rustbeeld in 1000, 1600 en 2304 (zoals de laptopstanden), met de schermen erin
- [x] Gewicht nameten op de echte uitsnede

### Fase 3 · De opening (`HalOpening.astro`, vervangt `HalLaptop` alleen op de voorpagina)
- [x] De nieuwe indeling: video over de volle breedte bovenaan, de tekst eronder naar links (maten uit Schets 59)
- [x] Het podium: sticky, hoogte uitgerekend; een canvas tekent het beeld dat bij de scrollstand hoort; de schermen
      met matrix3d per beeld
- [x] Vastklikken op de twee rustpunten (scroll-snap, alleen rond het podium)
- [x] De tekst blijft staan tot beeld 133; daarna vraag 4 d (gekozen), maar **minder powerpoint** (zijn notitie: "meer
      satisfying, smooth en minder generiek"). In Schets 59:
      · "Productbeelden" en de zin gaan weg met de snede onder 53° (scroll 0–28 % van de overgang).
      · Elke letter van "zonder shoot." reist **apart** naar zijn plek in het label, langs een boog die naar boven bolt,
        de een na de ander (2,2 % uit elkaar, elk 42 % lang, smootherstep). Halverwege wisselt elke letter van gezicht:
        Urbanist in blauw wordt Plex Mono in inkt.
      · **De punt wordt de schuine streep**: hij vliegt naar de plek van de streep en rekt daar uit tot 53°. Dan gaat de
        streep aan als een tl-buis (bij 68 %).
      · Pas als de letters langs zijn, komen "Zo werkt het.", de tabs en het paneel omhoog (vanaf 30, 40 en 48 %).
      · De h1 blijft één h1 voor zoekmachines en schermlezers; de reizende letters zijn `aria-hidden`. Bij minder
        beweging staat het label er gewoon.
- [x] Zonder script en bij minder beweging: de still met de schermen, de tekst, en daaronder Hoe het werkt gewoon in de stroom
- [x] De telefoon (< 900 px): geen scrollvideo, de still met de schermen, en Hoe het werkt eronder (vraag 11, c)
- [x] Niets beweegt bij het laden; het eerste beeld is de still (dat is ook het grootste beeld voor de laadtijd)
- [x] Toetsen: een nieuwe toets voor de reeks (alle beelden aanwezig per breedte, vingerafdruk, eindstand bij
      minder beweging), en de toetsen uit §2 nalopen en bijwerken

### Fase 4 · Hoe het werkt in hetzelfde scherm
- [x] De overgang: het podium blijft staan, alleen de inhoud wisselt. Hoe het werkt komt omhoog langs 53°, in stappen
      (het merk springt, het glijdt niet; hoogstens ongeveer 0,6 s)
- [x] De keuze Catalog · Lifestyle · Video: één proces tegelijk; als tabs (pijltjestoetsen, `aria-selected`); wat
      gekozen is, is inkt
- [x] **Catalog**: de lagen (16:40, 16:57): eerst vlak, dan springen achtergrond, schaduw en product uit elkaar en
      kantelen in 3D, ze zweven even, op het hoogtepunt een gloed in blauw uur om het product met "Gemaakt met AI",
      dan in elkaar gezogen en vlak, door naar stap 3. Geen lagenlijst, geen "met de hand"-labels
- [~] **Lifestyle** (16:28): kies je look (of laat er een ontwerpen) → upload de foto's van je product → ontvang je
      beelden (Flash). Lifestyle-beelden van de roze jeans levert Lucas nog aan
- [~] **Video** (16:28): hetzelfde, met "Voorbeeldclips volgen binnenkort"; de clips levert Lucas nog aan
- [x] ~~Geen donkere panelen~~ **Vervangen door Lucas (14:39)**: "de how it works animatie blokken in de 3 stappen houden
      maar dan meer als het voorbeeld met de donkere blokken". Drie inktblokken onder de tabs, met de animaties van nu,
      panelen en verbindingslijnen; blauw licht in plaats van roze voor de gekozen laag. **Om 16:28 wit**: "De donkere
      achtergrond maakt het ook wat heftiger dan dat het zou moeten dus deze mag wit zijn." Drie witte kaarten.
- [x] Op de telefoon één kaart die van 01 naar 02 naar 03 gaat (16:42)
- [x] Vinkjes zonder plaatje, op de hele site; plaatjes die blijven zonder zachte hoek (16:44)
- [x] De stroom: één scroll, één sectie tot en met Wat we maken, de elementen zweven daar rustig (16:56; `STROOM` in
      `HalOpening.astro`, `tot: 1` = alleen de opening)
- [x] Minder tekst op de voorpagina: geen regel onder de stappen, de balk alleen voortgang en pauze, Formaten zonder
      tekst ernaast, geen zinnen in de kaarten van Wat we maken en onder de vragen (16:56)
- [x] Wat er met de drie stappen van nu gebeurt (vraag 4)
- [x] Daarna loslaten: gewoon verder scrollen naar "Wat we maken"

### Fase 5 · Het accentwoord
**Vervangen door Lucas (13:52)**: "dat er wel echt een soort breathing effect op het woord zit en het woord niet zelf
gekleurd is, net zoals het hover effect op het logo". Gebouwd: inkt, met een laag blauw uur die ademt (8 s, de slinger
van het logo), sinds 15:24 met een zachte gloed in blauw uur. Wat hieronder staat, was Schets 59.

Zijn keuze (vraag 8): c, met de notitie "een mix van a en c. Ik wil een lange constante gloed en rustige met een soort
schommelende lijn licht effect." In Schets 59:
- [ ] Het woord staat **altijd in blauw uur** (8,08 : 1), met een zachte gloed eromheen (text-shadow 0,3 em, blauw uur op 16 %).
- [ ] Een **lijn licht onder 53°** schommelt door het woord, heen en terug in 7,2 s (twee keer het tempo van het logo, met
      dezelfde slinger: `(1 − cos t) / 2`): hij remt af bij de randen en gaat door het midden het snelst. Hij blijft binnen
      het woord (6 % tot 94 %). Kleur: blauw licht op 70 % over blauw uur. Gemaakt met een masker op een tweede laag in één
      kleur, geen verloop in de tekst.
- [ ] **Niets beweegt bij het laden**: de lijn begint pas na de eerste beweging van de bezoeker (muis, scroll, toets of
      aanraking). Bij minder beweging: alleen het blauwe woord met de gloed.
- [ ] Contrast gemeten: de lijn op zijn felst is 3,41 : 1 op wit. Dat is genoeg voor grote tekst (de kop is ≥ 36 px vet,
      de norm daarvoor is 3 : 1), niet voor gewone tekst. **Dus alleen op koppen**, nooit in lopende tekst.
- [ ] Welke woorden nog meer (vraag 8, zijn notitie noemt er geen): nu alleen "zonder shoot." in de opening.
- [ ] **Botst met het kleurenschema**: `docs/KLEURENSCHEMA.md` zegt "Nooit 1: geen verloop" en "Nooit 2: geen gloed en geen
      schaduw in de accentkleur". Lucas wil deze gloed nu wel. Bij het bouwen het schema bijwerken met zijn woorden, en de
      uitzondering precies omschrijven (alleen het accentwoord in een kop).

### Fase 5b · De balk van glas (zijn notitie in lijst 57)
"Ik wil dat je de topbar ook gaat redesignen en weer een wat meer glas effect geeft dat goed past bij de nieuwe moderne
minimalistische style van de website." In Schets 59:
- [x] Een zwevende balk, 12 px van de bovenrand en 28 px van de zijkanten, 56 px hoog, hoeken 20 px (grote vlakken zijn
      nu rond). Wit op 62 % met blur 18 px en verzadiging 1,6; een witte binnenrand, een haarlijn in inkt op 7 % en een
      zachte schaduw eronder. Zonder blur (oude browsers): wit op 94 %.
- [x] Bestellen houdt de ene zachte hoek (14 · 3 · 3 · 3), de menulinks krijgen een vlakje onder de muis.
- [x] **Botst met het kleurenschema**: "Geen glas. Ook het €1-blok niet meer." Bij het bouwen bijwerken met zijn woorden.
- [x] De balk zit in `Layout.astro` en geldt op elke pagina: nalopen op de lade (telefoon), Studio, de privélink en /admin.
      (25 okt, 20:00: Studio en /admin kregen hetzelfde glas op hun balk; de lade is een vol wit scherm en de balk
      van de privélink staat stil, die bleven.)

### Fase 6 · Afronden
- [x] `impeccable` polish en audit; schermafdrukken op 1440, 1280 en 390; laadtijd (LCP) en gewicht; toegankelijkheid
      (25 okt, 20:10: LCP 0,86 s / 0,81 s, de still; CLS van 0,40 naar 0,002 – 0,016; axe zonder fouten na het contrast
      van de stappen die nog komen; gewicht van het eerste scherm 3,0 MB op de computer, lichter maken bij levering 72)
- [x] Testreeks, LEVERING-notitie, COMMIT-BERICHT, het overzicht bijwerken (§5, §16, §29); opnieuw na 16:57
- [ ] Lucas rolt uit

---

## 5 · Vragen voor Lucas (worden lijst 57)

1. **De tekst in het eerste scherm** (zie de tabel in §2).
   a) Kop en één zin in het eerste scherm; de knoppen en de feiten pas na het scrollen (advies: zo staat het ook in
   zijn voorbeeld). b) Jij maakt in Magnific een bredere versie (de still naar links en rechts uitbreiden, dan de
   video opnieuw); dan worden de apparaten kleiner en past alles. Kost credits. c) De tekst deels over het beeld,
   in het wit onder de laptop.
2. **Het scrollen.** a) De video volgt je scroll precies en klikt vast op begin en eind (advies). b) Eén tik speelt
   de hele overgang zelf af, ongeveer 1,2 s. c) Volgt de scroll, zonder vastklikken.
3. **De schermen tijdens het dichtklappen.** a) De winkel en de telefoonfoto bewegen mee met het scherm, per beeld
   gemeten (advies). b) De schermen gaan uit zodra het dichtklappen begint. c) Lege witte schermen, zoals in de video.
4. **Wat er met de kop gebeurt als Hoe het werkt komt.** a) Kop en zin gaan weg met de snede; Hoe het werkt krijgt
   het hele scherm. b) De kop blijft bovenaan staan, Hoe het werkt komt eronder. c) De kop wordt de kop van
   Hoe het werkt. **d) Idee van Lucas (25 okt): de kop beweegt mee en wordt het kleine kopje boven Hoe het werkt**
   (advies, met deze uitwerking: alleen het accentwoord, bijvoorbeeld "zonder shoot", reist mee en wordt het label met
   de schuine streep; de rest van de kop, de zin en de knoppen gaan weg met de snede. Een label is één tot drie
   woorden; de hele kop als label wordt te lang. De reis volgt de scroll, dus smooth; het landen springt: de streep
   gaat aan als een tl-buis (E4) en de blauwe baan van het accentwoord trekt er één keer doorheen.)
   En: gaan de drie stappen van nu op in de nieuwe sectie (advies) of blijven ze er los onder?
5. **De lagen per dienst.** Catalog ligt vast. Lifestyle: a) jouw telefoonfoto, model, plek en licht, eindbeeld
   (advies), b) product, model, eindbeeld. Video: a) een filmstrook met tijdcodes van één video (advies), b) de vijf
   shots van de 8s reveal. Voor lifestyle en video zijn beelden nodig: heb je lagen (PSD of PNG) van één beeld uit
   de launchset?
6. **Het accentwoord.** a) Een smalle baan blauw uur onder 53° die één keer door het woord trekt, bij in beeld en
   onder de muis (advies). b) Een zachte blauwe gloed achter het woord die langzaam schommelt, zoals het logo.
   c) Het woord kleurt kort helemaal blauw en terug. En: welke woorden (bijvoorbeeld "zonder shoot")?
7. **De hoeken.** a) Kaarten 24 px, grote vlakken 32 px, knoppen en chips houden de zachte hoek (advies; zijn
   voorbeeld is ongeveer 19 px op 415 × 311, dus 24 px is "iets ronder"). b) Alles 24 px. c) Alles 28 px.
   En: ook in Studio, de privélink, /admin en de mails? a) Ja, in één keer (advies: één taal). b) Eerst alleen de site.
8. **De telefoon.** a) Dezelfde video, uitgesneden rond de apparaten. b) Jij maakt een staande video van
   `Phone bg.png`. c) Op de telefoon geen scrollvideo: de still, en Hoe het werkt eronder (advies voor de launch:
   het lichtst, en scrollen over een video voelt op een touchscreen het minst goed).
9. **De dienstpagina's.** a) Alleen de voorpagina krijgt de video; /catalog, /lifestyle en /video houden de foto met
   hun eigen set (advies). b) Overal de video.
10. **4K.** De video opschalen in Magnific naar 4K, zodat hij op een retina-scherm even scherp is als de still?
   Kost credits; zonder ga ik pas bij beeld 18 van still naar video, zodat het verschil wegvalt in de beweging.

---

## 5b · Zijn antwoorden (lijst 57, ingevuld 25 okt 13:04)

| Vraag | Gekozen | Advies was | Notitie |
|---|---|---|---|
| 1 · Tekst in het eerste scherm | a (kop en één zin) | a | Schets 59 laat ook "links naast de laptop" zien, als knop |
| 2 · Scrollen | a (volgt, klikt vast) | a | b staat als knop in de schets |
| 3 · Schermen tijdens het dichtklappen | a (bewegen mee) | a | 13:07: het scherm wordt donker, niet grijs (fase 2) |
| 4 · De kop | d (het accentwoord reist mee) | d | "meer satisfying, smooth en minder generiek. Nu voelt het meer als een powerpoint effect." (fase 3) |
| 5 · De drie stappen | a (gaan op in Hoe het werkt) | a | |
| 6 · Lifestyle-lagen | a (foto, model, plek en licht, eindbeeld) | a | de lagen van één launchbeeld levert hij nog aan |
| 7 · Video | a (filmstrook met tijdcodes) | a | |
| 8 · Accentwoord | c | a | "een mix van a en c … lange constante gloed … schommelende lijn licht" (fase 5) |
| 9 · Hoeken | a (kaarten 24, vlakken 32, knoppen de zachte hoek) | a | |
| 10 · Waar | a (overal in één keer) | a | |
| 11 · Telefoon | c (geen scrollvideo) | c | |
| 12 · Dienstpagina's | a (alleen de voorpagina) | a | |
| 13 · 4K | a (niet opschalen) | a | |
| Algemeen | | | de balk van glas (fase 5b) |

---

## 6 · Wat Lucas aanlevert
- (vraag 1b, 8b of 10) een bredere video, een staande video of een 4K-versie
- (vraag 5) de lagen van één lifestylebeeld en één video uit de launchset
- de teksten: de kop en de zin van de opening en de labels van Hoe het werkt, NL en EN (launchteksten schrijft hij zelf)

## 7 · Wat het raakt (voor mezelf)
`VoorpaginaHal.astro`, nieuw `HalOpening.astro` met een gebundeld script, `hal.css`, `halLaptop.js`, nieuw
`scripts/opening-reeks.mjs` en `src/data/openingSchermen.json`, `public/img/hal/opening/`, de teksten in de
component. Geen inline script (CSP-hashes van de build). Geen bibliotheek nodig: canvas, `requestAnimationFrame`,
één `--p` voor de scrollstand, `IntersectionObserver` om de reeks pas te laden als de still staat.

---

## 8 · Logboek
- **25 okt 2026** · Opdracht opgeslagen, video en still gemeten, plan geschreven. Niets gebouwd.
- **25 okt 2026, 12:42** · Idee van Lucas erbij: de kop beweegt mee en wordt het kopje boven Hoe het werkt (vraag 4 d,
  fase 3). Mijn advies: alleen het accentwoord reist mee.
- **25 okt 2026, 12:43** · Lucas: "Begin". Lijst 57 en Schets 59 gestart. De vorige opslag van dit bestand (12:43)
  zette per ongeluk de versie zonder vraag 4d terug; om 12:45 hersteld. `kladblok/PROMPT-CLOUD-CODE.md` gevonden: bouw wacht op die leveringen.
- **25 okt 2026, 13:04** · Lijst 57 ingevuld (§5b): bijna alles volgens advies; accentwoord c met een eigen mix, de kop-reis
  minder powerpoint, en een balk van glas erbij.
- **25 okt 2026, 13:07** · Lucas: het laptopscherm niet grijs, maar langzaam donkergrijs naar zwart, zoals een echte laptop
  die dichtklapt. Gemeten waar het grijs vandaan kwam (de video zelf: het scherm zakt van 255 naar 143) en opgelost (fase 2).
  De reeks loopt nu tot beeld 133, het eerste helemaal witte beeld (eerder bleef er links een reepje laptop staan).
- **25 okt 2026, 13:42** · Schets 59 gepubliceerd met alles van 13:04 en 13:07; lijst 57 linkt ernaar. Niets in de map
  gebouwd. Volgende stap: zijn akkoord op de schets.
- **25 okt 2026, 13:52** · Lucas: het woord niet gekleurd maar ademend, zoals het logo; geen schetsen meer; bouwen op de
  huidige site. Gebouwd als levering 74 (`kladblok/LEVERING-74.md`): de opening, Hoe het werkt per dienst, de hoeken
  (alle css, Studio, account, portaal, admin, mails), de balk van glas.
- **25 okt 2026, 14:39** · Lucas: de drie stappen houden, als de donkere blokken uit zijn voorbeeld. Gekozen: blokken
  onder de tabs, met de animaties van nu. Gebouwd.
- **25 okt 2026, 15:24** · Lucas: glas op plekken als de topbar, de knoppen subtieler, gloed in de accentkleur mag.
  Gebouwd: glas op wat zweeft, knoppen 48 px met een gloed in blauw uur onder de muis, het schema bijgewerkt.
- **25 okt 2026, 16:28 – 16:57** · Lucas: Hoe het werkt wit en rustiger; het lifestyle-verhaal anders (look kiezen,
  uploaden, ontvangen; video binnenkort); de lagen eerst vlak, dan 3D, dan terug (en voortaan zo uitleggen); op de
  telefoon één blok; vinkjes zonder achtergrond, geen zachte hoek op icoonplaatjes; één scroll per sectie met rustig
  zweven; onnodige tekst weg; geen "met de hand"-labels, alleen kort een gloed met "Gemaakt met AI". Alles gebouwd in
  levering 74 (`kladblok/LEVERING-74.md`, §2 en §4).
- **25 okt 2026, 19:15 – 20:30** · Lucas: "Ga door met wat nog open staat". Zijn keuzes: de cookiekaart rechtsonder,
  overal; "met de hand" overal rechtzetten (/how-it-works "Nagekeken", FAQ, doorloop; hooks en de bedankpagina niet);
  "Elk beeld door ons gecontroleerd" houden; de cloudprompt bijwerken, eerst 74 uitrollen en dan de cloudsessie.
  Gebouwd, plus glas op de balk van Studio en /admin en de eindcontrole (fase 5b en 6). Alle nieuwe zinnen in
  `kladblok/TEKSTEN-74.md`; de notitie §2b.
- **25 okt 2026, 21:31 – 22:40** · Lucas: "Doe een volledige controle … en werk ze allemaal stap voor stap af." Alle
  95 pagina's gemeten, de voorpagina op 15 breedtes, axe in elke tab, en een tweede blik op de code. Twintig punten
  gevonden en opgelost (notitie §7b). Zijn keus bij ademen en zweven: één keer, dan stil (WCAG 2.2.2).
