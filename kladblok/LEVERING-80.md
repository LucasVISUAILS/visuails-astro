# Levering 80 · De voorpagina in rust

**1 november 2026 (gevraagd 1 november, 17:05; lijst 64 ingevuld om 18:23, lijst 65 om 20:30). Staat alleen in
je map; je rolt zelf uit met `UITROLLEN.bat`.** Bouwt voort op levering 79. Alle maten staan in `docs/RUST-80.md`, de kleuren in
`docs/KLEURENSCHEMA.md` (hoofdstuk "Levering 80: de vijf kleuren"). Het voorbeeld en je oordeel: lijst 65.

---

## 1 · Wat je vroeg

- **17:05**: *"eerst groot tekst van wat VISUAILS is en daaronder al licht de laptop in beeld"*, één scroll en de
  laptop staat helemaal in beeld, nog één en de hele animatie speelt, *"golvende lijn … snappy en smooth"*. De
  rest van de homepage rustig en overzichtelijk; de top bar als vloeibaar glas, lager; koppen in hoofdletters,
  lopende tekst iets dunner; meer logoposters; de vijf kleuren uit je voorbeeld met elk een fade; het
  kleurenschema en de logo's bijwerken; een preloader als het nodig is.
- **17:13** (de eerste vragen): twee stappen, de winkel klapt mee, de kleuren uit het voorbeeld, de preloader
  alleen als nodig.
- **Lijst 64** (18:23): de titel *"Jouw merk, zoals jij hem ziet."*, de grond Wit, geen model in de opening en
  alles gecentreerd, de galerij in plaats van *Kies een look*, de logoposter, zacht scrollen, het logo opent de
  pagina, en: *"Echt heel weinig informatie geven"* bij Wat we maken. En bij s-categorie: *"de backend en hoe
  alles werkt [moet] wel zo blijven en alleen de UI volledig en licht de UX aangepast"*.

- **Lijst 65** (20:30): alle twaalf onderdelen van de voorpagina *goed*; de hoofdletters **a + b** (de snede én
  de zachte hoek, in alle gewichten); het woordmerk blijft het logo (de studie ligt in het archief, niet in je
  project); en *ja* op deze levering.

## 2 · Wat er staat

### De opening (`HalOpening80.astro`, `opening-80.css`, `src/scripts/laptopdoek.js`)
- De titel groot in het midden (104 px op de computer, altijd twee regels), de zin, één knop, één link en de
  feiten; onderaan steekt de klep van de laptop het beeld in, op de Nevel-fade.
- **Scroll 1**: de pagina glijdt (de golf, 900 ms) tot de laptop helemaal in beeld staat, in het midden onder de balk.
- **Scroll 2**: je video speelt op 1,3 ×. De winkel en de telefoonfoto staan per beeld in perspectief op de
  schermen (de hoeken uit de video gemeten) en klappen mee dicht. Daarna glijdt Wat we maken naar het midden van
  het scherm en scrolt de pagina gewoon. Terug omhoog: de laptop staat weer open.
- De video is uitgeknipt en gestapeld (kleur, dekking, gaten) in H.264 en wordt met WebGL getekend, zodat de
  grond overal precies de grond van de site is, ook in Safari. Drie maten (1,5 / 2,6 / 3,8 MB), een VP9-terugval.
- **Een klant die al bestelde** ziet in plaats van de €1-link de link naar Studio (lijst 64, knoppen).
- Telefoon, tablet en minder beweging: geen vastzetten, de laptop staat stil.

### De secties (lijst 64)
- **Wat we maken** (`HalMaken80.astro`): per dienst één uitgeknipt product met schaduw (de hoodie, de jeans en de
  sokken van NON/STD), de naam, de vanafprijs uit de code en de link. Klein eronder wat er verder is, en nog
  kleiner wat één product kost (*"Eén product: €89 (catalog) of €109 (lifestyle). Meer producten, lager tarief."*,
  uit `pricing.js`): die regel koos je in afvinklijst 5 en hij hoort bij de vanafprijzen. Mag hij weg, zeg het,
  dan gaan twee toetsen mee (vanaf, naloopa2browser). De pijl springt onder de muis in twee stappen uit elkaar,
  zoals op de knoppen.
- **De galerij** (`HalGalerij80.astro`, `scripts/galerij80.js`): twee rijen die tegen elkaar in schuiven als je
  scrolt, sneller naarmate je harder scrolt, met de veeg (bewegingsonscherpte) in de vaart. Elk beeld gaat naar
  de pagina van zijn look. Nooit vanzelf. Een tegel is een beeld, geen knop: 12 rond aan alle vier de hoeken
  (de hoekregel van 25 oktober); de naam van de look springt aan onder de muis.
- **De logoposter** (`HalPoster80.astro`, `scripts/poster80.js`): via de Nevel-fade naar Blauw uur; het V-merk in
  Wit wordt bij scrollen een venster op een foto (Phone-made) en groeit tot die het scherm vult.
- **Hoe het werkt, kort** (`HalHoeKort80.astro`): drie stappen in één regel, de levertijd uit de code.
- **Meer weten, de proef en de voet**: zoals ze waren, met de maten en lucht van 80 en koppen in hoofdletters.

### De balk, de letter, de kleur
- **De balk**: 56 px (telefoon 52), vloeibaar glas (de grond op 72 %, vervaging 20 px), een lichtvlek die met het
  scrollen meeschuift. Het uitklapmenu hangt 8 px onder de balk.
- **De letter**: koppen van de voorpagina in hoofdletters; lopende tekst 370 (was 400), wat 500 was 450. DM Sans is
  opnieuw uitgesneden met de gewichten 300 – 700. De rest van de site volgt na je ja op de voorpagina.
- **VISUAILS Display 1.100** (lijst 65, a + b): de hoofdletters hebben nu ook twee details uit de V. De snede: de
  bovenarm van E en F, de arm van L, de balk van T en de voet van Z eindigen schuin, 0,75 × de dikte opzij (in Bold
  82 op 109). Eén zachte hoek: linksboven op E F B D P R, R = 24,7 % van de kaphoogte (173), de bocht van het
  V-merk; de binnenkant loopt mee, zodat de lijn overal even dik blijft. Alle negen gewichten, opnieuw gehint,
  geldig volgens OTS; breedtes en kernen precies als 1.000, dus geen kop loopt anders af. 96 tekens hebben nu
  een detail (was 66). Het specimen (`docs/letter/VISUAILS-Display-specimen.html`) tekent ze op de E; de bron
  is `docs/letter/bron/familie.py`. Installeer de nieuwe `.ttf`'s uit `docs/letter/fonts/` opnieuw als je ze
  op je computer gebruikt.
- **De kleur**: inkt `#0F1217` overal (site, Studio, /admin, mails, facturen), de grond Wit `#FBFCFF`, het vlak op de
  grond `#F0F1F6`. De lijn blijft `#E6E8EC` (grijs haalt op Mist maar 4,46 : 1). Het logopakket is herkleurd
  (alleen de kleur): **images/Logo/visuails-logo-80**, naast je oude pakket; de favicons en de mail-logo's komen
  daaruit.
- **Zacht scrollen** (`src/scripts/zachtscrollen.js`): alleen met een muiswiel, heel licht. Lenis ging er op
  1 september uit omdat het "af en toe wat sloom" voelde; dit is bewust kleiner. Voelt het toch sloom: haal de
  import in Layout.astro weg.
- **Het laadscherm** (`Voorlader80.astro`): alleen op de voorpagina en alleen als laden langer dan 350 ms duurt.

## 3 · Wat je kunt weggooien

Niet meer gebruikt (de opening van 78 en 79, hun toetsen en de oude keuzepijl), zeven bestanden:
- `src/components/HalLaptopBreed.astro`, `src/styles/laptop-breed.css`
- `src/components/HalTablet.astro`, `src/styles/tablet.css`
- `tests/opening-74.test.mjs`, `tests/voorpagina-78.test.mjs` (vervangen door `tests/voorpagina-80.test.mjs`)
- `public/img/ui/keuzepijl-0b0f17.svg` (heet nu `keuzepijl-0f1217.svg`, in de nieuwe inkt)

`npm test` gaat rood (test:testreeks) zolang die twee toetsen er nog staan: ze zitten niet meer in de keten.
`HalHoe.astro` blijft: Hoe het werkt met de animaties komt later op /catalog, /lifestyle en /video.

## 4 · Nagekeken

- `npx astro build`: klaar, zonder fouten. De hele testreeks: **270 van de 271 stappen goed**. De ene was
  test:klantstand: één controle keek nog naar /how-it-works, waar de uitleg op de telefoon dicht zit. Hij kijkt nu
  op /studio en is daarna los gedraaid: 127 van 127.
- `tests/voorpagina-80.test.mjs` (64): de volgorde van de secties, de kop en de prijzen uit de code, de galerij (tegels,
  kopieën, bronnen), de poster, Hoe het werkt kort met de levertijd, de link naar Studio voor een klant, het laadscherm
  alleen op de voorpagina, de balk van 56 px met zijn glas, het uitklapmenu 8 px eronder, de maten op drie breedtes,
  scroll 1 (de laptop in het midden), de galerij die meebeweegt en weer stilvalt, de poster tot het eind, minder beweging.
- Bijgewerkt voor de nieuwe voorpagina, met de reden erbij in de toets: klant-stand (de link naar Studio in plaats van
  "Je abonnement"; de uitlegbalk nu op /studio), doorloop-27c, hoe-stappen-29 en laptop-standen (Hoe het werkt
  met de animaties staat niet meer op de voorpagina), minder-sjabloon (de balk is glas), telefoonbeelden
  (phone-made-11 staat niet meer op de voorpagina), letter-77 (DM Sans 300 – 700), proef-look.
- Op het oog: de voorpagina op 1440 × 900 en 390 × 844 (Wat we maken past onder de balk, de regel wat één product kost,
  de pijl onder de muis, de tegels met hun naam), de koppen met de nieuwe hoofdletters op 4 × ingezoomd, het specimen
  op 1280 en 390.
- Hoekregel (134 goed) en minder-sjabloon (891 goed): de tegels rond aan vier hoeken, niets glijdt onder de muis.
- **Herkomstlabel:** elk beeld dat ik lever krijgt automatisch een C2PA-label ("Claude Content Signing", ± 6 kB per
  beeld, ook in de svg's en de mp4's). De pixels zijn gelijk. De toetsen met beelden zijn ook met de gelabelde
  bestanden gedraaid.

## 5 · Uitrollen

Rol uit met `UITROLLEN.bat` vanuit je map. Het commitbericht staat in `kladblok/COMMIT-BERICHT.txt`.
