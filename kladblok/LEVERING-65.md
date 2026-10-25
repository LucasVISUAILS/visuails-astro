# Levering 65: scherpe foto's in de opening (20 oktober 2026)

Je notitie: "De foto's zijn van enorm lage kwaliteit. Dit is niet goed voor vertrouwen bij de
klant." Uitrollen met **UITROLLEN.bat**, zonder migratie. Levering 62 tot en met 64 staan al live
(commit c1086f6, vanmorgen 11:56); dit is alleen levering 65.

## 1. Wat er mis was

Ik heb het gemeten op de stand van je schermafbeelding (Engels, catalog, derde beeld): wat de
site stuurde, naast een verliesloze foto van dezelfde stand.

- **De AVIF werd twee keer ingepakt.** Die versie kiest elke moderne browser, en hij werd uit de
  WebP gemaakt in plaats van uit de foto zelf. Daarbij stond hij op kwaliteit 52, met minder
  kleurdetail (4:2:0). Op 1600 px was het hele beeld 44 kB. Daardoor waren de stof van de jeans,
  de regel "Free returns within 30 days" en de foto op de telefoon uitgesmeerd.
- **De schuine schermen werden op gewone resolutie getekend.** Na het verkleinen bleef er dus
  weinig fijn detail over.
- **Een laptop met 125 % schaal koos een te kleine foto.** Op 1536 × 864 kreeg hij de foto van 1600
  px, terwijl er 1690 px nodig was.

De bronbeelden zelf zijn in orde: de catalogfoto's en de telefoonfoto's zijn op 100 % scherp.

## 2. Wat er nu is

- **De render:** elke stand wordt op dubbele resolutie gefotografeerd (4608 × 2592) en
  verliesloos teruggebracht naar 1000, 1600 en 2304 px.
- **Het inpakken:** de WebP en de AVIF komen elk rechtstreeks uit die verliesloze foto. De AVIF
  staat op kwaliteit 78 met volle kleur (4:4:4), de WebP op 90.
- **Waarom 78:** de eis was 0,98 of meer op de telefoonfoto, het fijnste stuk van het beeld.
  Kwaliteit 70 haalde 0,977.
- **De maat:** de browser kiest de foto nu op de echte breedte van de opening (tot 1595 px 88 %
  van het venster, daarboven 1400 px). De laptop met 125 % krijgt nu de foto van 2304 px. De
  telefoon houdt hooguit de foto van 1600 px, zoals afgesproken voor het geheugen.
- **Opnieuw gemaakt:** alle 18 standen, `laptop-*.webp`/`.avif` en de deelplaatjes.

**Gelijkenis met de verliesloze foto** (SSIM, 1 is gelijk), op 1600 px:

| | was | nu |
|---|---|---|
| telefoonscherm | 0,938 | 0,983 |
| laptopscherm | 0,981 | 0,996 |
| het hele beeld | 0,976 | 0,991 |

## 3. Wat het kost

Gemiddeld per stand:

| breedte | AVIF was | AVIF nu | WebP was | WebP nu |
|---|---|---|---|---|
| 1000 px | 25 kB | 46 kB | 43 kB | 59 kB |
| 1600 px | 45 kB | 90 kB | 82 kB | 121 kB |
| 2304 px | 72 kB | 158 kB | 141 kB | 225 kB |

Bij het openen laadt een pagina één stand; de rest pas als hij aan de beurt is. Op een gewone
laptop is dat 43 kB meer (de eerste stand op home: 43 naar 86 kB). Op een trage 4G-verbinding
(4 Mbit/s) is dat 0,09 seconde.

De getallen zijn de bestanden zoals ze in je map staan. Elk beeld dat ik in je map zet, krijgt
onderweg ongeveer 6 kB herkomstgegevens (C2PA) mee; de pixels blijven gelijk. Dat gold ook al voor
de standen van levering 63.

## 4. Wat nog zacht is

De foto zelf (de laptop, het toetsenbord, de handen) is 2048 px breed en 1,125 × groter gemaakt.
Dat zie je vooral op een MacBook. Beter kan alleen met een grotere versie van de foto: zie vraag 1
in afvinklijst 44. Vraag 2 daar gaat over dezelfde AVIF-instelling op de andere grote foto's van de
site.

## Nagekeken

- **Welke foto de browser kiest**, op 10 schermen van iPhone tot QHD. Telkens 93 % of meer van wat
  er nodig is; 93 % is het maximum op de MacBook (de grootste foto is 2304 px) en op de iPhone
  (hooguit 1600 px).
- **Contrast:** elke regel tekst in de opening, de belletjes, de balk en de regel eronder, tegen de
  nieuwe, scherpere pixels erachter. Op alle vier de pagina's in beide talen, op 15 breedtes van 320
  tot 1920 px: 2602 metingen, alles 4,5:1 of meer, de laagste 4,86:1.
- **Toetsen:** `laptop-standen` 48/48 (de nieuwe `sizes` erin), `hal-voorbeeld` 132/132.
- **Testreeks:** 267 van 267, alles groen.

## Bestanden

- **Beelden:** de 108 standen in `public/img/hal/stand/`, `public/img/hal/laptop-1000/1600/2304`
  (webp en avif), `public/img/og-nl.png` en `og-en.png`.
- **Code:** `scripts/laptop-standen.mjs` (render en inpakken, met de metingen in de kop),
  `src/components/HalLaptop.astro` (de maat).
- **Toets:** `tests/laptop-standen.test.mjs`.
- **Kladblok:** dit bestand en `kladblok/COMMIT-BERICHT.txt`.
