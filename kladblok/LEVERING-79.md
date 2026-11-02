# Levering 79 · De grond #F4F7FD en de laptop over de hele breedte

**1 november 2026 (gevraagd 1 november, 02:30 – 02:56). Staat alleen in je map; je rolt zelf uit met
`UITROLLEN.bat`.** Bouwt voort op levering 78 (live sinds 28 oktober, 15:28).

---

## 1 · Wat je vroeg

- **02:30**: *"Ik heb de laptop nu 21:9 gemaakt. Zou dit beter passen over het hele pc scherm? Zoja,
  maak de achtergrond dan volledig egaal wit"*; **02:32**: *"De tablet is dan niet meer nodig hopelijk"*.
- **02:33 – 02:34**: *"Anders wil ik sowieso de achtergrond heel licht grijs maken omdat #FFFFFF niet word
  aangeraden"*, en *"Dit moet dan ook in het kleurenschema aangepast worden"*.
- **02:38**: *"Deze lichte schaduw moet ook weg"* (de strook onder de voet van de laptop).
- **02:42**: *"Website achtergrond wil ik heel uniek licht grijs hebben die bij het kleurenschema past en
  ik wil dat de achtergrond van de laptop dit dus ook heeft, exact die kleur."* Je koos **B, #F4F7FD**,
  en voor het vlak op de grond **wit**.
- **02:46**: de laptopfoto en een vlak in alleen die kleur als bestand (gestuurd, 6336 × 2688).
- **02:56**: *"Begin met het aanpassen en het voorbeeld"*.

## 2 · Wat er staat

### De opening: jouw laptop over de hele breedte (`HalLaptopBreed.astro`, `laptop-breed.css`)
- Je foto 21 : 9 staat over de volle breedte, direct onder de balk, zodat de armen tegen de rand van het
  venster lopen. De tablet van 78 is weg.
- **De achtergrond van de foto is doorzichtig**: de grond van de pagina schijnt erdoor, dus die is overal
  precies #F4F7FD. Een gecomprimeerd beeld met de kleur erin zou 1 à 2 tinten verschuiven (gemeten).
- **De schermen zijn ook doorzichtig**: de webshop en de telefoonfoto liggen ónder de foto, zodat de rand
  van de laptop en van de telefoon (met de inkeping) ze afsnijdt. Dezelfde negen standen als in 78.
- **Vanaf 1200 px**: de kop op één regel in de lege strook boven de klep, op de lijn van het logo,
  48 px onder de balk; de zin en de standen links, boven de arm. Alles staat op het eerste scherm.
- **901 – 1199 px**: de kop boven de foto, de zin en de standen eronder. **Telefoon**: de kop op twee
  regels, de foto 1,6 × zo breed (laptop en telefoon in beeld, de armen lopen eruit), de zin eronder.
- Alle maten rekent de css uit de foto zelf (de klep op .3084 – .6731 van de breedte, de bovenkant op
  .1786 van de hoogte); de kop groeit mee tot 76 px en eindigt altijd vóór de rechterrand van de klep.
- **Het scrolleffect** is dat van 78: de tekst gaat weg, de laptop komt iets dichterbij en lost op, de
  foto uit het winkelscherm vliegt naar Wat we maken en landt daar precies. Daarna scrolt de pagina gewoon.

### De foto zelf
- Het grijze verloop, de plank en de lichte schaduw onder de voet (en onder de telefoon) zijn weg. De
  handen, de laptop en de telefoon zijn niet aangeraakt (de grootste afwijking in de kern is 0); de randen
  zijn ontmengd, dus zacht en zonder witte of grijze zoom. Uitleg en bronnen: `kladblok/levering-79/`.

### De grond #F4F7FD (`hal.css`, blok LEVERING 79)
- De pagina, de balk (met zijn haarlijn), de lade op de telefoon, de voet, het €1-blok, de balk van het
  bestelformulier en de adresbalk van de telefoon staan op de grond.
- Wit is nu de kaart: kaarten, vensters, velden, het menu, de cookiekaart blijven wit. Twee vensters die
  alleen wit leken omdat de pagina wit was (de agenda op /how-it-works, de map op /studio) zijn echt wit.
- **Het vlak op de grond is wit** (je keuze): pillen, chips, ronde knopjes, de feitjes, de tabs, de lege
  fotoplekken, code in de juridische tekst. Binnen een witte kaart blijft het vlak #F4F5F7.
- De taalknop in de balk heeft geen vlakje meer (op de grond zou het een wit blokje worden).
- **De laptop op /catalog, /lifestyle en /video** (`HalLaptop.astro`) stond op een ingebakken witte grond:
  de foto eronder is doorzichtig gemaakt en alle 18 standen (108 bestanden) zijn opnieuw gefotografeerd zonder grond.
  Op de telefoon loopt dat beeld nu tot de rand, zodat de armen er niet meer recht afgesneden in staan.

### Het kleurenschema (`docs/KLEURENSCHEMA.md`)
- De grond staat in de tabel (`--h-grond`), met een eigen hoofdstuk "De grond": de keuze, de contrasten
  (inkt 17,87:1, blauw 7,53:1, grijs 5,15:1, de veldlijn 3,23:1), wat grijs wordt, wat wit blijft, wat wit
  wordt, en hoe een foto doorzichtig wordt. Regel 1 van "Altijd" zegt nu: de grond is #F4F7FD, wit is de kaart.

## 3 · Bewust anders dan je vroeg (en waarom)
- **Niet "egaal wit"** (02:30): je koos daarna zelf een grijze grond, en de foto heeft nu exact die kleur.
- **De balk en de voet op de grond, niet wit**: één vlak met de pagina, alleen de haarlijn scheidt. Een
  witte balk boven een grijze pagina zou een band worden. Wil je hem wit, dan is dat één regel.

## 4 · Mijn mening, kort
- De laptop over de hele breedte werkt veel beter dan de tablet: de armen lopen nu echt het beeld uit, en
  de foto en de pagina zijn één vlak. Daardoor voelt de opening als een foto in plaats van een kader.
- De grijze grond geeft de witte kaarten eindelijk een eigen vorm; op wit waren ze alleen een haarlijn.
  De tint met een vleugje blauw uur past bij het merk zonder op te vallen.

## 5 · Goed om te weten
- **Niet meegegaan**: de mails (een mailprogramma toont zijn eigen wit) en Studio, account en /admin
  (eigen schema). Wil je die ook op de grond, dan is dat een volgende stap.
- **Kun je weggooien** (nergens meer gebruikt): `src/components/HalTablet.astro`, `src/styles/tablet.css`,
  `public/img/hal/opening/still-*` (6 bestanden), en nog steeds `src/components/HalOpening.astro` en
  `public/img/hal/opening/f/`.
- Als je de schermen van de laptop op de dienstpagina's ooit vernieuwt (`node scripts/laptop-standen.mjs`),
  komen de standen vanzelf zonder grond.

## 6 · Bestanden
**Nieuw (25):** `src/components/HalLaptopBreed.astro`, `src/styles/laptop-breed.css`,
`public/img/hal/breed/` (laptop-960 tot -3840, avif en webp: 12), `public/img/hal/pov-2304-doorzichtig.webp`,
`scripts/laptop-breed.mjs`, `scripts/wit-naar-doorzichtig.py`, `tests/grond-79.test.mjs`,
`kladblok/levering-79/` (de bronfoto, de twee ontmengscripts, de meting en LEESMIJ.md: 6) en deze brief.

**Gewijzigd (132):** `src/components/VoorpaginaHal.astro`, `src/styles/hal.css` (blok LEVERING 79 en de
grond in het schema bovenaan), `src/styles/werkplaats.css`, `src/layouts/Layout.astro` (de adresbalk),
`src/scripts/interactions.js` (de €1-melding wacht op de nieuwe opening), `src/pages/laptop-bron/[lang].astro`,
`src/data/halStanden.bron.json`, `scripts/laptop-standen.mjs`, `scripts/lib/laptopbron.mjs`, `package.json`
(test:grond79 in de reeks), de toetsen `voorpagina-78`, `hal-voorbeeld`, `letter-77` en `klant-stand`,
`docs/KLEURENSCHEMA.md`, `docs/DESIGN.md`, `docs/RUIMTE-EN-RUST.md`, `public/img/hal/laptop-*` (6),
`public/img/hal/stand/` (alle 108) en `kladblok/COMMIT-BERICHT.txt`.

## 7 · Nagekeken
- `npx astro build`: klaar, zonder fouten. De hele testreeks: **271 van de 272 stappen goed**; alleen
  test:backupterugzet faalt, en dat alleen in mijn kopie (die toets verwacht Windows-regeleinden, die heeft
  jouw map wel).
- `tests/voorpagina-78.test.mjs` (101): de opening op 1903 × 919 en 1440 × 900 en op negen laptopmaten van
  1024 × 768 tot 2560 × 1300 (de kop op één regel vóór de rand van de klep, de klep minstens 32 px eronder,
  de zin en de standen boven de arm en in het eerste scherm, de schermen vullen hun gat), het scrolleffect
  (de foto landt op zijn plek, daarna gewoon scrollen, alles in Wat we maken te klikken), de telefoon op
  390 en 320, minder beweging, een smaller venster midden in de vlucht.
- `tests/grond-79.test.mjs` (18): het schema, de doorzichtige beelden, 20 pagina's op 1440 en 390 (grond,
  balk en voet #F4F7FD, geen vlak direct op de grond, geen witte band), en op het scherm zelf: de lege
  plekken in de foto's van de opening en van /catalog zijn **exact** #F4F7FD.
- Op het oog: de voorpagina op 390, 768, 1024, 1100, 1280, 1366, 1440, 1600 en 1920 px, en /catalog,
  /lifestyle, /video, /pricing, /faq, /how-it-works, /start/catalog en /gallery.
- Contrast op de grond: inkt 17,87:1, blauw 7,53:1, grijs 5,15:1, de veldlijn 3,23:1.
- **Herkomstlabel:** elk beeld dat ik lever krijgt automatisch een C2PA-label ("Claude Content Signing",
  ± 6 kB per beeld). De pixels zijn gelijk; de gegevens "Made with Google AI" in je bronfoto blijven. De
  toetsen zijn ook met de gelabelde beelden nog eens gedraaid (laptopstanden, grond, voorpagina, letters).

## 8 · Uitrollen
Rol uit met `UITROLLEN.bat` vanuit je map. Het commitbericht staat in `kladblok/COMMIT-BERICHT.txt`.
