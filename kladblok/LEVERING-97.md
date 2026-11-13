# Levering 97 · Alles wat klikt is scherp

**13 november 2026. Staat alleen in je map; je rolt zelf uit met `UITROLLEN.bat`.**

Gebouwd uit lijst 96: B1 a ("strak") en B2 a ("alles wat klikt"). Geen migraties en niets op te ruimen.

## 1 · De knoppen (lijst 96, B1 a)

- **De vorm:** elke knop is een rechthoek met hoeken 0. Dat geldt ook voor de tekstlink. Voorheen was elke knop een pil
  (999 px).
- **De volle knop:** in rust inkt. Onder de muis schuift blauw uur in 0,32 s van links naar rechts door de knop, en de
  pijl schuift 3 px naar voren (was 2,5).
  - Op inkt of een foto is de knop wit, en onder de muis schuift mist van links naar rechts.
  - Voorheen vulde de snede de knop vanuit de hoek rechtsonder.
- **Bestellen bovenin:** blauw uur. Onder de muis schuift blauw diep van links naar rechts; wit erop is 8,1 : 1 en
  10,6 : 1. Dat geldt ook voor Bestellen onderaan het menu op de telefoon.
- **De lijnknop:** wit met een haarlijn. Onder de muis krijgt hij het vlak en een lijn in inkt; dat was al zo.
- **Eén bron:** `src/styles/knoppen.css`, nieuwe sectie I. De kopie voor /admin en de privélink is
  `public/knoppen.css`, gemaakt met `node scripts/knoppen-kopie.mjs`.
- **Minder beweging:** de knop wordt meteen blauw, zonder te schuiven.

## 2 · Hoe ver "scherp" gaat (lijst 96, B2 a)

**Scherp: alles wat je aanklikt.**
- de knoppen;
- de pijlen bij Wat we maken;
- de pauzeknoppen van de banner en de laptop;
- het menuknopje en het sluitknopje van het menu op de telefoon;
- het taalknopje;
- de rijen in het menu;
- de WhatsApp-knop en zijn label;
- Bestellen;
- de cookieknoppen;
- het sluitknopje van een melding;
- de pijlrondjes in de rijen;
- Studio (taal, navigatie, uitloggen);
- de knoppen in de werkplaats;
- de bronknoppen op de bedankpagina;
- "Gebruik" bij je eigen achtergrond in het bestelformulier.

**Rond: wat iets aangeeft of iets kiest uit een rij.**
- chips en statuspillen;
- de filters in de galerij;
- de tabbladen bij de vragen;
- de stappen van het formulier;
- de keuzes voor het aantal en de vorm;
- de kleurbolletjes;
- de sluiter in de catalogusanimatie;
- de invulvelden.

Zo zie je het verschil tussen een knop en een etiket.

## 3 · Nagemeten

- **De hoeken (`tests/hoekregel-browser`):** op alle pagina's, op 1440, 900 en 390, 1273 knoppen en velden.
  - Elke knop heeft hoeken 0.
  - Chips en velden zijn een pil.
  - Uitslag: 255 goed.
- **Het knoppensysteem (`tests/knoppen-systeem-browser`):** de site, het formulier, Studio, de privélink en /admin
  (licht en donker), op 1440 en 390. Alles groen.
- **Het contrast van de letters:** op 124 knoppen, op tien pagina's, in rust en onder de muis. Allemaal 4,5 : 1 of meer;
  er was geen knop met slecht leesbare letters.
- **De hoogtes:** 36, 44 en 52 px. Dat waren ze al; nagemeten in `knoppen-systeem-browser`.

## 4 · Ook in deze levering

- **De cookiebalk over Bestellen:** bij het eerste bezoek viel de cookiebalk op een breed scherm over de knop
  Bestellen in de banner.
  - Zolang de balk er staat, staan het vlak en de kop hoger: de hoogte van de balk plus 36 px.
  - Nagemeten op 1440 × 900, 1280 × 720 en 1920 × 1080: de knop ligt nergens meer onder de balk.
  - Op 1280 × 720 valt dan de bovenrand van het vlak onder de bovenbalk; Bestellen blijft wel zichtbaar.
  - Weiger of accepteer je, dan staat alles weer op zijn plek.
- **Een fout uit levering 96:** de kleuren van de winkel van NON/STD stonden in `hal.css` onder het blok van
  levering 86. Daar mogen alleen kleuren uit het kleurenschema staan, en `blauw-uur-86` werd rood (die test had ik in
  levering 96 niet gedraaid).
  - Het blok staat nu bij de andere laptopschermen. Het zijn de kleuren van de winkel van een klant, en die mogen
    eigen kleuren hebben.
  - De schermen zelf veranderen niet.
- **Nog drie fouten uit levering 96**, gevonden in de volledige testreeks van deze levering (in levering 96 had ik
  die reeks niet gedraaid). Alle drie zijn hersteld:
  - **Het ruitje (◆) in de NON/STD-winkel:** het stond op 11 px. De regel is minstens 11,5 px, en `halvoorbeeld` en
    `ronde9` werden rood. Het is nu 12 px. De zes winkelschermen en de andere laptopstanden zijn daarom opnieuw
    gemaakt.
  - **De beelden van de catalogusanimatie:** ze hadden geen versie (?v=) achter hun adres, zoals de opening dat wel
    heeft. Daardoor kon een browser na een nieuwe levering een oud beeld blijven tonen (`letter-77`). De versie staat
    er nu achter.
  - **`publiek-81`:** de test zocht Hoe het werkt onder de oude klassenaam. De test is bijgewerkt; de pagina klopte al.
- **`docs/DESIGN.md`:** bovenaan staat de nieuwe regel voor knoppen.

## 5 · Tests

**Bijgewerkt naar de nieuwe regel:**
- `knoppen-systeem`: scherp, de schuifstrook, de pijl 3 px;
- `knoppen-systeem-browser`: elke knop hoeken 0;
- `hoekregel-browser`: knoppen scherp, chips en velden een pil;
- `blauw-uur-86`: K1 en K2, het blauw schuift van links naar rechts.

**Groen:**

| Test | Uitslag |
|---|---|
| `knoppen-systeem` | groen |
| `knoppen-systeem-browser` | groen |
| `hoekregel-browser` | 255 goed |
| `blauw-uur-86` | 66 van 66 |
| `hoeken` | 46 |
| `hoeken-ontbreekt` | 44 |
| `hoeken-ontbreekt-browser` | 28 |

De uitslag van de volledige testreeks staat hieronder (§ 6).

## 6 · De volledige testreeks en de controle van de hele sessie

**De volledige testreeks:** alles groen, 348 stappen in 48 min 48 s, met de fixes uit § 4 erin. De eerste reeks had zeven
rode tests; die staan in § 4 en § 5.

**De controle van de hele sessie (13 november):**

| Wat je vroeg | Lijst | Waar |
|---|---|---|
| Een rustiger begin en de doorzichtige bovenbalk | lijst 94 | levering 95 |
| Vijf kaarten bij Wat we maken | lijst 95 | levering 95 |
| De telefoonclip, de sneeuwvideo, de grond achter de laptop | | levering 95 |
| Elke sectie dezelfde kop, de nieuwe volgorde met een slot | lijst 96 A | levering 96 |
| Grotere kaarten die licht kantelen | lijst 96 C | levering 96 |
| De catalogusanimatie: foto, flits, een catalogus van zes met persoonlijkheid, achterkant en detail | lijst 98 | levering 96 |
| De NON/STD-winkel: Margiela-opbouw, het getekende logo als lijn, de grond van de foto's | lijst 97 | levering 96 |
| Scrollen door de foto's, na vier foto's het volgende product, niets afgesneden, na de video de catalog | | levering 96 |
| Conceptmerk in de winkel en onder de laptop | | levering 96 |
| Alles wat klikt scherp, het blauw schuift van links naar rechts, chips blijven rond | lijst 96 B | levering 97 |
| De cookiebalk niet meer over Bestellen | | levering 97 |

**De vaste regels, nagekeken:**
- geen echt adres in voorbeelden (de winkel en de animatie zijn verzonnen en hebben geen adres);
- bedragen alleen uit de code (`laptopSlides.js`, `pricing.js`);
- kleuren uit het kleurenschema, behalve de winkel van een klant (`blauw-uur-86` groen);
- tekst minstens 11,5 px;
- contrast minstens 4,5 : 1;
- een bestelknop gaat nooit rechtstreeks naar een formulier: het slot gaat naar /start, zoals de banner (`start-looks` groen);
- Engelse tekst in Britse spelling (Catalogue, Colour);
- geen nieuw logo: het NON/STD-logo is overgetrokken van zijn eigen vilten letters.

**Nog open, buiten deze sessie:**
- De laptops op /video, /lifestyle en /upload-guidelines tonen nog de roze broek; alleen de voorpagina toont NON/STD.
  Overzetten betekent die schermen opnieuw maken met de NON/STD-producten. Zeg welk product op welke pagina, dan doe ik
  dat in een volgende levering.
- In `hal.css` staan nog de oude regels voor Bestellen (de snede). Ze worden overschreven door `knoppen.css`, sectie I,
  en doen dus niets meer. Ik heb ze laten staan, omdat `blauw-uur-86` ze nog leest.
