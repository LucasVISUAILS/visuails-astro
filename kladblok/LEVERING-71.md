# Levering 71: zelf beelden, iconen en teksten vervangen (5 november 2026)

Cloudsessie, branch `claude/voor-de-launch`, na levering 70. Je antwoorden ("alles advies"): 12 = a (lokaal, met een
dubbelklik), 13 = a (beelden, iconen en teksten). Het plan en de telling staan in
`kladblok/PLAN-71-ZELF-VERVANGEN.md`; de lijst van alle vakken in `kladblok/BEELDVAKKEN.md`.

**Een bezoeker ziet niets nieuws.** Deze levering raakt de site niet: drie knoppen om te dubbelklikken, in de
projectmap naast UITROLLEN.bat. Geen migratie.

## 1 · Wat jij nu kunt

| Je wilt | Je doet | Je ziet |
|---|---|---|
| Een foto of plaatshouder vervangen | Bestand onder de naam van het vak in `eigen-beelden\`, dubbelklik **BEELDEN.bat** | GROEN: het contactblad, oud en nieuw naast elkaar. ROOD: per bestand wat er mis is en wat je doet |
| Een icoon vervangen | Een svg onder de naam van het icoon (bv. `vink.svg`) in `eigen-beelden\`, dubbelklik **BEELDEN.bat** | Idem; het icoon wordt tegen het kit gelegd |
| De teksten nalezen | Dubbelklik **TEKSTEN.bat** | De tabel met alle 3148 zinnen gaat open in Excel |
| Je teksten op de site zetten | Dubbelklik **TEKSTEN-TOEPASSEN.bat**, sleep de tabel erin | Per zin wat er staat en wat het wordt; J of N; daarna alle toetsen. ROOD: terugzetten? |

Daarna rol je uit met UITROLLEN.bat, zoals altijd. Welke namen er zijn: open `eigen-beelden\BEELDVAKKEN.html`
(96 vakken, de 18 plaatshouders bovenaan). Uitleg voor in Kladblok: `eigen-beelden\LEES-MIJ.txt`.

## 2 · Hoe het gebouwd is

- **`scripts/beelden.mjs`** (nieuw). Vindt de vakken in de laatste build en in de data (ook de beelden van August,
  Casual en de nieuwe Classic, die pas met de launchset op de site staan). Keurt verhouding (2 %) en breedte. Maakt
  het origineel op de maat van het vak: ligt er al een beeld, dan precies dezelfde breedte en hoogte (op het midden
  bijgesneden), zodat de pagina's niet verspringen en de srcset blijft kloppen. Dan de kleinere maten (webp 80), de
  telefoonversie via `make-telefoon.mjs` en de AVIF via `make-avif.mjs`, zoals de beelden die er nu staan.
- **De herkomst (C2PA).** Draagt je bestand content credentials (webp: de chunk `C2PA`; png: `caBX`; jpg: de
  APP11-segmenten; AVIF: de uuid-box), dan komt dat blok in elke webp en AVIF die eruit gemaakt wordt. In de AVIF
  achteraan: de beelddata staat op vaste posities in het bestand, en een blok ervoor zou die verschuiven. Getoetst:
  het beeld blijft pixel voor pixel hetzelfde.
- **Iconen:** `keurIcoon` legt de svg tegen de regels van het kit (`docs/DESIGN.md`) en `zetIcoon` vervangt alleen
  het ene pad in `src/data/iconen.js`.
- **`scripts/lib/xlsx.mjs`** (nieuw): een xlsx schrijven en lezen in Node, met meer bladen, zonder Python of een
  nieuw pakket. **`scripts/tekstblad-xlsx.mjs`** (nieuw) maakt daarmee dezelfde tabel als het Python-script, met
  het tabblad "Lees mij". `npm run tekstblad` draait nu zonder Python.
- **`scripts/tekst-toepassen.mjs`** leest nu ook die tabel (de kolommen op naam), en heeft `--vraag` (het venster
  van TEKSTEN-TOEPASSEN.bat: per zin was en nu, J of N) en `--terug` (zet de kopie uit `tekstronde\terug\` terug).
- **De drie .bat-bestanden** volgen `FORMATEN.bat`: een uitleg bovenin, `cd /d "%~dp0"`, de controle op de
  projectmap, geen blokken tussen haakjes (je projectmap heeft haakjes in zijn naam), alleen ASCII en CRLF.
  `chcp 65001` zoals in UITROLLEN.bat, zodat é en × goed staan.
- **`eigen-beelden\`** gaat niet mee naar GitHub, op `LEES-MIJ.txt` na (`.gitignore`). Wat BEELDEN.bat in
  `public\img` en `src\data` zet, gaat wel mee met je volgende uitrol.

## 3 · Nagekeken

- **De testreeks** (`TESTREEKS_TEGELIJK=4 node scripts/testreeks.mjs`): **283 van 283 groen** (9 min 3 s), geen
  enkele herkansing.
- **Nieuw:** `tests/zelf-vervangen-71.test.mjs` (130): de xlsx heen en terug; de tabel nooit over een bestaande
  heen; tekst-toepassen met een echte .xlsx, droog, `--vraag` met N en met J, een gesleept pad tussen
  aanhalingstekens, de kopie en `--terug`, een tweede keer niets dubbel; keuren, de maat, de telefoonversie; de
  herkomst uit en in webp, AVIF, jpg (over twee segmenten) en png, met de beelddata onveranderd; de iconen tegen het
  kit; de hele dubbelklik in een tijdelijke map (goed, te klein, een onbekende naam, een icoon, de herkomst, KLAAR,
  `_vorige`, `_verwerkt`, het contactblad, een tweede keer, een lege map, geen build); de drie .bat-bestanden.
  Alles wat schrijft, schrijft in een tijdelijke map: niets in `public\img` of `src\` terwijl de reeks loopt.
- **Op de echte site:** TEKSTEN maakte de tabel uit de build (3148 regels, beide tabbladen); twee echte zinnen
  ingevuld (één op de voorpagina, één in een mail van Studio), TEKSTEN-TOEPASSEN vond ze allebei in de bron en
  toonde ze, en N liet alles staan. BEELDEN maakte de lijst van 96 vakken.
- **Gevonden en gerepareerd tijdens het toetsen:** twee vragen achter elkaar (het gesleepte pad en dan J) lazen de
  invoer niet goed als die al klaarstond; een plaatshouder vroeg te weinig pixels; og- en icoonbeelden kwamen in de
  lijst van vakken; lange zinnen werden in "was / nu" afgekapt, zodat je een wijziging aan het eind niet zag; het
  contactblad liep op een telefoon uit het scherm.
- **Schermafdrukken** van `BEELDVAKKEN.html` en een contactblad op 1440 en 390: geen horizontale scroll, de kleuren
  uit `docs/KLEURENSCHEMA.md` (inkt `#0F1217`, de rand `#25508B` voor een plaatshouder, rood `#B3261E` voor wat niet
  gedaan is).
- **`npm run visueel`:** de site verandert niet in deze levering; de referentie is van vóór levering 74 (zie 69).

## 4 · Open punten

- **Op Windows nog niet gedraaid.** Hier is geen cmd.exe. De .bat-bestanden volgen FORMATEN.bat en de toets legt
  ze tegen dezelfde regels, maar de eerste echte dubbelklik is van jou. *Advies:* begin met BEELDEN.bat met een lege
  map (hij opent dan alleen de lijst) en met TEKSTEN.bat; stuur me de melding als er iets niet klopt.
- **Na een tekstronde kan een toets rood worden** die op de oude zin wacht (veel toetsen kijken naar een zin).
  TEKSTEN-TOEPASSEN.bat zegt dat en biedt terugzetten aan. *Advies:* zet niet terug, stuur me de naam van de rode
  toets; dan werk ik de toets bij en rol jij uit.
- **De herkomst klopt niet meer cryptografisch** na het omzetten: het blok zegt waar het beeld vandaan komt, maar de
  hash hoort bij het origineel. Zo is het ook bij de kleinere maten die er nu staan. Een eigen handtekening vraagt
  een certificaat (`scripts/tag-delivery.mjs`). *Advies:* zo laten.
- **De lijst van vakken komt uit de laatste build.** Een pagina die sindsdien veranderde, staat er pas na de
  volgende build goed in. BEELDEN.bat bouwt niet zelf (dat kost minuten); UITROLLEN.bat bouwt altijd.
- **Vijf oude namen** in `oude-beelden.json` staan op geen pagina meer (`brand-beam`, `brand-glow`, `sfeer-balk`,
  `sub-beam`, `sub-light`). *Advies:* laten staan tot `PLAATSHOUDERS` op false gaat; dan mag de lijst weg.
- **Een vervangen foto onder dezelfde naam** kan bij wie de site deze week al bezocht, tot zeven dagen het oude beeld
  laten zien: `public/_headers` geeft `/img/*` een cache van 7 dagen (20 augustus, met die afweging erbij). Nieuwe
  bezoekers en wie hard ververst, zien meteen het nieuwe. *Advies:* zo laten; bij een foto die echt meteen weg moet
  (een fout, een portretrecht) liever een nieuwe naam, en dan is het een levering.
- **De beelden van de launchset** kun je nu al aanleveren: ze komen in `public\img`, maar de site toont ze pas als de
  schakelaar om is (levering 70).

## 5 · Mag weg

- `scripts/tekstblad-xlsx.py`: vervangen door `scripts/tekstblad-xlsx.mjs` (dezelfde tabel, zonder Python). Geen
  script of toets roept hem nog aan.

## 6 · Voor het overzicht

- **§16.1:** nieuw: zelf beelden, iconen en teksten vervangen met BEELDEN.bat, TEKSTEN.bat en
  TEKSTEN-TOEPASSEN.bat (levering 71). Eerste keer op Windows proberen.
- **§16.2, de rij "Lijst 56":** de route is gekozen: levering 71 (lokaal, vraag 12 = a; beelden, iconen en teksten,
  vraag 13 = a). Lijst 56 hoeft niet meer ingevuld; staat er iets in dat 71 niet doet, dan wordt dat een eigen punt.
- **§16.3 punt 0:** gebouwd als levering 71.
- **§5 (plaatshouders, r. 311):** de eigen beelden die nog open staan, zijn er 18: naast `lucas`, `hooks-kop` en
  `editions-maandgrid` de beelden van August, Casual en de nieuwe Classic, `dienst-video-shirt`, `lifestyle-band-04`
  en `lifestyle-flash-product` (de lijst in `kladblok/BEELDVAKKEN.md`).

## 7 · Bestanden

- **Nieuw:** `BEELDEN.bat`, `TEKSTEN.bat`, `TEKSTEN-TOEPASSEN.bat`, `scripts/beelden.mjs`, `scripts/lib/xlsx.mjs`,
  `scripts/tekstblad-xlsx.mjs`, `eigen-beelden/LEES-MIJ.txt`, `tests/zelf-vervangen-71.test.mjs`.
- **Bijgewerkt:** `scripts/tekst-toepassen.mjs`, `package.json` (`tekstblad` zonder Python, `beeldvakken`,
  `test:zelfvervangen71` in de keten), `.gitignore`, `.gitattributes`, `README.md`.
- **Kladblok:** `kladblok/LEVERING-71.md` (dit bestand), `kladblok/PLAN-71-ZELF-VERVANGEN.md`,
  `kladblok/TEKSTEN-71.md`, `kladblok/BEELDVAKKEN.md`, `kladblok/COMMIT-BERICHT.txt`.
