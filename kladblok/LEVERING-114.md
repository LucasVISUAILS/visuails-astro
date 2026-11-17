# Levering 114 · De banner: de kop gecentreerd, de telefoon over de kop, de stappen als balk van glas

**17 november 2026. Staat alleen in je map; je rolt zelf uit met `UITROLLEN.bat`.**

Dit gaat over wat je om 00:46, 00:59, 01:01 en 01:07 vroeg. Het doek en het sectiesysteem uit lijst 124 komen in de
volgende levering (115).

## 1 · De kop: gecentreerd, met de nieuwe tekst

- **De tekst:**
  - Engels: *Your fashion brand / Deserves to be seen*;
  - Nederlands: *Jouw modemerk / Verdient gezien te worden*;
  - de opbouw is dezelfde als eerst: een kleine regel en een grote regel die de kolom vult.
- **De plek:** in het midden van de video, zoals bij kive.ai (alleen de indeling, niet het ontwerp). De onderkant van de kop
  staat op de helft van de banner.
- **De maat:**

  | scherm | kolom | grote regel |
  |---|---|---|
  | 1440 breed | 960 px | 90 px (Nederlands 69 px) |
  | 1920 breed | 1100 px | 103 px |

- **Op de telefoon:** de kop staat midden in het beeld.
  - De Nederlandse grote regel staat op twee regels (*verdient gezien / te worden*). Op één regel zou de kleine regel 10,6 px
    worden, en dat is te klein om te lezen.
  - Zo is de grote regel 42 px en de kleine 17,5 px.
- **De deelplaatjes:** ze zijn opnieuw gemaakt met de nieuwe kop (`npm run og`), alle vijf. Het slechtste punt is 7,7 : 1.
  - Let op: de png's in het logopakket 100 hebben nog de oude kop.
  - Zeg het als ik die ook opnieuw moet maken.

## 2 · De telefoon gaat over de kop

- **Wat je ziet:** in de eerste scène (0 tot 4,25 s) gaat de telefoon met de hand over de kop heen. Waar hij staat, zie je de
  letters niet. Vanaf het product dat valt staat de kop weer helemaal op de video, met het negatief zoals eerst.
- **Hoe het werkt:**
  - de grond van die scène is overal even wit;
  - alles wat niet bijna wit is (de telefoon, de hand, de mouw) komt vóór de letters. Die rand rekent de browser per
    beeldpunt uit de video, dus hij is scherp;
  - het scherm van de telefoon is licht: een houten vloer en een witte knop. Daar vult een masker het binnenste op.
    Het masker heeft één vorm per videobeeld, 102 beelden op één plaatje: `public/img/hal/banner/telefoon-masker.webp`,
    53 kB, gemaakt met `scripts/telefoon-masker.py`;
  - de letters tekent WebGL nu zelf. Met de twee lagen van eerst bleef onder de telefoon een dunne omtrek van elke letter
    zichtbaar.
- **Zonder WebGL** (heel oude browsers) staat de kop zoals eerst, zonder de telefoon ervoor.

## 3 · De balk met de stappen en de knoppen

- **Compact, onderaan in het midden:**
  - de vijf stappen naast elkaar, elk met een balkje dat volloopt;
  - daaronder de zin van de stap die speelt;
  - rechts achter een dunne lijn *Start an order* en *Or try one product for €1*.
- **De knoppen staan in de balk** (01:01: *"Moeten die knoppen ook onder de telefoon komen"*):
  - eerst stonden ze onder de kop, dus midden in de weg van de telefoon;
  - een knop achter de telefoon zou wel klikbaar zijn maar onzichtbaar, en je belangrijkste knop zou elke ronde 4 seconden
    weg zijn;
  - nu gaat de telefoon alleen over de kop.
- **De €1-proef** (00:59: *"amper zichtbaar"*): een witte knop, even hoog als *Start an order*. Hij staat los ernaast, met
  10 px ertussen en zonder snede, zoals overal sinds 14 november.
- **Glas zonder rand** (01:07):
  - het glas van de bovenbalk: wit op 68 %, 18 px vervaging, alleen een zachte schaduw;
  - boven het donkerste beeld blijft de grond minstens #B1B2B5. De namen van de stappen staan daarom in inkt 2 (5,0 : 1)
    en niet in grijs (2,9 : 1).
- **Smaller dan 1240 breed** staan de knoppen onder de stappen.
- **Op de telefoon** staat alles onder de video op de witte grond:
  - de nummers 01 tot 05 met hun balkjes;
  - de naam en de zin van de stap;
  - de twee knoppen onder elkaar.
- **De zin over VISUAILS** (*Send a few photos…*) staat niet meer in de banner. Het blok onder de video zegt wat VISUAILS doet.

## 4 · De €1-melding komt eerder

- **Wat er was:** de melding met de €1-proef bestond al (linksonder, `KlantMelding.astro`). Op de voorpagina kwam hij pas als
  de laptop uit beeld was. Sinds levering 94 staat de laptop halverwege, dus de melding kwam ver naar beneden.
- **Nu:** hij komt zodra de bannervideo voorbij is, en niet zolang de laptop in beeld is.
- **De vorm** (01:07: *"subtiele pop up"*): één rij van glas, zonder rand.
  - Erin: *See it first? One product for €1*, de knop en het kruisje.
  - Geen beeld en geen extra regel meer.
  - Dit geldt op elke pagina waar hij staat.
- **Wat blijft:**
  - hij komt pas na de cookiekeuze;
  - een klant ziet hem niet;
  - weggeklikt blijft hij dertig dagen weg.
- **De melding met de bestelling** van een klant is niet veranderd.

## Bestanden

| bestand | wat |
|---|---|
| `src/data/banner94.js` | de nieuwe kop, het masker (MASKER) |
| `src/components/HalBanner94.astro` | de indeling, de telefoon over de kop, de balk |
| `src/styles/banner-94.css` | de indeling en de maten |
| `public/img/hal/banner/telefoon-masker.webp` | nieuw: het masker van de telefoon |
| `scripts/telefoon-masker.py` | nieuw: maakt dat masker |
| `src/scripts/interactions.js` | de €1-melding na de bannervideo |
| `src/styles/hal.css` | de €1-melding als rij van glas (onderaan) |
| `public/img/og-*.jpg` (5) | de deelplaatjes met de nieuwe kop |
| `tests/banner-kop-110-browser.test.mjs`, `voorpagina-80.test.mjs`, `letter-77.test.mjs`, `lettermaten-94.test.mjs`, `klant-stand.test.mjs` | bijgewerkt voor de nieuwe kop en indeling |
| `tests/minder-sjabloon-browser.test.mjs` | de balk en de €1-melding mogen glas zijn (zoals de bovenbalk) |

## Toetsen

- **De hele reeks** is gedraaid na een nieuwe build: 274 snelle toetsen en 81 browsertoetsen, alle groen.
- **`minder-sjabloon`** wilde nergens glas of een zachte schaduw. De bovenbalk mocht al; nu mogen de balk in de banner en de
  €1-melding het ook, omdat je erom vroeg (01:07).
- **`banner-kop-110` toetst nu ook:**
  - de kop staat minstens 16 px boven de balk;
  - het masker en zijn script staan er;
  - in de letters komt de video waar de telefoon is, alleen in de eerste scène;
  - de €1-melding komt na de bannervideo.
- **Gemeten met beelden** op 1440, 1920, 1138 en 390 breed, Engels en Nederlands: op 1,0, 2,0, 3,0 en 3,8 s staat de
  telefoon voor de kop, en op 4,4 en 12 s staat de kop vol.
