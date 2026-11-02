# Levering 81 · De letter en de lucht van 80 op elke publieke pagina

**1 november 2026 (gevraagd 22:08, je keuzes om 22:10). Staat alleen in je map; je rolt zelf uit met
`UITROLLEN.bat`.** Bouwt voort op levering 80 (de voorpagina in rust). De voorpagina zelf verandert niet. De maten
staan in `docs/RUST-80.md` §9, de regels in `src/styles/hal.css` (blok "LEVERING 81"). Het voorbeeld en je oordeel:
lijst 66.

---

## 1 · Wat je vroeg

- **22:08**: *"Ik ben niet bij de pc dus kan het niet deployen. Ga voor nu verder met de rest"*.
- **22:10**, je drie keuzes:
  - **De publieke pagina's**: catalog, lifestyle, video, prijzen, hoe het werkt, FAQ, over, galerij, contact, de
    lookpagina's en het bestelformulier. Studio (/account) en /admin later.
  - **Letter + lucht**: de koppen in hoofdletters, lopende tekst 370, de marges en de lucht tussen de secties van
    de voorpagina. De opbouw van elke pagina blijft zoals hij is.
  - **Hoe het werkt met de animaties nu meenemen** op /catalog, /lifestyle en /video.

## 2 · Wat er staat

### De letter
- **Koppen in hoofdletters** (VISUAILS Display, −0,01 em, regelafstand 0,92), zoals op de voorpagina.
- **Kleiner dan ze waren**, en dat is gemeten, niet gekozen. Hoofdletters zijn 1,22 × zo breed, en de huisregel is
  hoogstens twee regels. Per kop heb ik op 18 breedtes (320 – 1920 px) opgemeten hoe groot hij mag zijn; de krapste
  kop bepaalt de maat (`kladblok/levering-81/koppen-maat.json`):

  | Kop | Was op 1440 · 390 | Nu op 1440 | Nu op 390 |
  |---|---|---|---|
  | h1 (de kop van een pagina) | 76 · 44 | **51** (3,54 vw, hoogstens 52) | **29** |
  | h2 (de kop van een sectie) | 56 · 34 | **41** (2,88 vw, hoogstens 43) | **25** |
  | h3 | 34 · 26 | **34** (2,47 vw, hoogstens 34) | **20** |

  De krapste koppen zijn die van /editions (*"The months with nothing new to shoot."*) en /models
  (*"Inbegrepen, niet iets wat je erbij moet kopen."*). Wil je ze groter, dan moeten die zinnen korter: dat is een
  vraag in lijst 66.
- **Lopende tekst 370** (was 400), wat 500 was **450**: in hal.css (104 regels), in het bestelformulier
  (`werkplaats.css`, 18 regels) en in de onderdelen met een eigen stijl (de uitlegballonnen, de uploader, de
  abonnementen, de bedankpagina). De balk, de mono-labels en de laptopschermen (de winkel van een klant, als foto
  op de site) blijven zoals ze zijn. Gemeten op elke publieke pagina,
  ook in de verborgen stappen van het formulier: nergens nog DM Sans op 400 of 500.

### De lucht
- **De marge** is die van de voorpagina: max(20, min(8,333 vw, 160)), de inhoud hoogstens 1280 px. Op 1440: 120
  (was 40), op 900: 75, op de telefoon 20 (was 16).
- **Tussen de secties een stap meer lucht**, de schaal van de voorpagina: gewoon 110 → **213**, licht → **160**
  (telefoon 80 → 120, licht → 90). Wat bij de vorige sectie hoort, houdt zijn kleine lucht (de prijsband 64, de
  juridische tekst 64, het beeld onder de kop van een look 56). Het €1-blok onderaan: 110 → 213.
- **Uitgezonderd**: de opening van /catalog, /lifestyle en /video houdt haar eigen marge, want daar staat de
  laptop precies op de grond (tests/grond-79 ving het); en het bestelformulier houdt zijn eigen breedte.

### Hoe het werkt met de animaties (`HalHoeDienst.astro`)
- Op **/catalog, /lifestyle en /video** (en /nl), na de looks en vóór de vragen: de drie stappen met de animaties
  van die ene dienst (geen tabs), de uitlegbalk met pauze, één knop naar het formulier van die dienst, en de
  feiten uit de code (catalog *Vanaf €39 per product*, lifestyle *Vanaf €49*, video *Op aanvraag*; de levertijd;
  geen minimum).
- Hij speelt pas als je erheen scrolt; bij minder beweging staat het eindbeeld er meteen.
- De woorden staan nu op één plek: **`src/data/hoeHetWerkt.js`**. Ze kwamen uit `VoorpaginaHal.astro` en zijn
  niet veranderd; de voorpagina leest er de drie stapnamen uit voor Hoe het werkt kort.
- `HalHoe.astro` kreeg een `dienst` (zonder dienst doet hij wat hij deed).
- **De hoeken** van de voorbeelden in de stappen volgen nu de hoekregel. Op de voorpagina stonden lifestyle en
  video achter een tab en werden ze nooit gemeten. Nu ze open staan, zijn ze nagemeten en concentrisch gemaakt:
  de looks bij lifestyle 14 rond (was 4), de stijlen bij video 8 (was 6), het lijstje op de telefoon bij catalog
  op een smal scherm 16.

## 3 · Wat je kunt weggooien

Niets nieuws. Heb je de zeven bestanden van levering 80 nog niet weggegooid, doe dat dan eerst (zie
`kladblok/LEVERING-80.md` §3), anders gaat `npm test` rood op test:testreeks.

## 4 · Nagekeken

- `npx astro build`: klaar, zonder fouten. De hele testreeks (twee keer): de tweede keer **271 van de 272 stappen
  goed**; de ene was test:bijkopen (zie hieronder, los van 81), daarna los gedraaid: 90 van 90. In de eerste ronde
  vielen vier toetsen om die op de oude maten rekenden (lookpagina-browser, doorloop-27b, laptop-standen en de
  hoekregel); die zijn opgelost zoals hieronder staat en in de tweede ronde groen.
- **Nieuwe toets** `tests/publiek-81.test.mjs` (npm run test:publiek81, in de keten na voorpagina80): Hoe het
  werkt op de drie dienstpagina's in beide talen (één dienst, de uitlegbalk, de zinnen uit hoeHetWerkt.js, de
  knop, de feiten uit de code), niet op de voorpagina; op veertien publieke pagina's en drie breedtes: niets
  zijwaarts, koppen in hoofdletters en hoogstens twee regels, lopende tekst 370 en nergens 400 of 500, de marge,
  alleen lucht uit de schaal; Hoe het werkt speelt pas als je erheen scrolt.
- **Alle koppen**: 5.510 koppen op 70 pagina's (EN en NL) en 19 breedtes van 320 tot 1440 px: geen enkele op
  meer dan twee regels (drie mag tot 340 px), nergens zijwaarts scrollen.
- Bijgewerkt, met de reden erbij in de toets: uploadbelofte (de zinnen staan nu in hoeHetWerkt.js),
  hoe-stappen-29, laptop-standen en doorloop-27c (Hoe het werkt met de animaties staat nu op /catalog),
  doorloop-27b (de inlogzin op de bedankpagina is nu 370), en
  lookpagina-browser: "het eerste beeld vult de breedte" betekent nu de hele kolom tussen de marges. Op 1280 px
  is dat 83 % van het scherm (was 94 %); wil je het eerste beeld van een look weer bijna van rand tot rand, dan
  steekt alleen dat beeld buiten de marge (vraag in lijst 66, bij Flash).
- **Los van 81 gevonden**: tests/bijkopen ging na middernacht (2 november) rood, ook op levering 80. De toets
  boekte drie termijnen op 62, 32 en 2 dagen terug en gaf ze als sleutel hun maand; op de 1e en 2e van een maand
  vallen twee daarvan in dezelfde maand, dus viel er één weg. Alleen de toets is aangepast (elke termijn een eigen
  maand); de code was goed. Zonder deze fix was `UITROLLEN.bat` vandaag rood geweest.
- **Op het oog**: twaalf pagina's en het bestelformulier op 1440 en 390, voor en na naast elkaar (lijst 66), en
  Hoe het werkt op de drie dienstpagina's terwijl hij speelt.
- **Contrast** verandert niet: de kleuren en de lettermaten van de lopende tekst zijn dezelfde, alleen de dikte
  gaat van 400 naar 370.

## 5 · Uitrollen

Rol uit met `UITROLLEN.bat` vanuit je map. Het commitbericht staat in `kladblok/COMMIT-BERICHT.txt`.
