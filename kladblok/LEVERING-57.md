# Levering 57 — Studio, /admin en de privélink in de ontwerptaal, en wat de ronde over de site opleverde (17 oktober 2026)

Uit afvinklijst 35 (v35-studio a: *"ook daar het logo-effect en de nieuwe iconen"*), afvinklijst 34 (b-vink),
je bericht van 09:30 (*"Zorg dat alles consistent is"*) en wat ik vond toen ik de site als klant gebruikte.
Uitrollen met **UITROLLEN.bat**, zonder migratie. Levering 56 gaat mee als die nog niet live staat.

## 1. Het woordmerk met de elektrische lijn

- In Studio (de zijbalk en het inlogscherm), op de losse kaarten van Studio (een foutpagina, "even rustig
  aan"), in /admin en op de privélink: onder de muis tekent een dunne violette lijn het woordmerk na, 6%
  naar linksboven, en trilt hij onregelmatig. Precies het effect van de site.
- In het donkere thema van Studio en /admin is de lijn lila.
- Dichtgeklapt laat de zijbalk van Studio nog steeds alleen de V zien; de lijn mag linksboven buiten het vak.
- Eén bron: `woordmerkSvg()` in `src/data/wordmarkPath.js`. De beweging staat in `global.css` en, voor de
  pagina's die die niet laden, als kopie in `account.css`, `admin.css` en `portal.css`.
- Geen script nodig (Studio heeft geen script, door de CSP). Bij "minder beweging" staat de lijn er meteen.

## 2. De iconen uit het kit

- Alle iconen van Studio komen nu uit `src/data/iconen.js`: gevuld, in de kleur van de tekst, minstens 14 px.
- Drie zijn erbij gemaakt met dezelfde regels (raster 24, één snede, één zachte hoek):
  - **raster**: het overzicht;
  - **persoon**: je gegevens, en een gezicht dat nog geen foto heeft;
  - **oog**: nakijken.
- Bestellingen en Geleverd delen de doos, de vaste look is het kader, facturen het bestand en het
  abonnement het prijslabel. In productie is de pijl in de rondte, en Uitloggen en in- en uitklappen zijn
  de pijlen in twee delen.
- /admin en de privélink hadden geen iconen; daar is niets bijgekomen.

## 3. Het vinkje dat goedkeurt

- Een goedgekeurd beeld in Studio krijgt het vinkje uit het kit op zijn plaatje (✓ GOEDGEKEURD).
- Op het beeld dat je net goedkeurde zet het zich in drie tikken: kort been, lang been, en dan springt
  het vlagje op zijn plek.
- De andere goedgekeurde beelden staan stil, want niets beweegt bij het laden. Het werkt zonder script:
  na goedkeuren kom je terug op dat ene beeld (`#f<id>`).
- Op de privélink staat hetzelfde vinkje, stil, voor "Goedgekeurd".

## 4. Hetzelfde handschrift als de site

- **Knoppen** in Studio, /admin en op de privélink: één zachte hoek linksboven in plaats van een pil, en
  geen optillen of gloed onder de muis.
- Dezelfde vorm voor:
  - de menu-items in Studio en /admin;
  - Uitloggen;
  - de knop om in te klappen;
  - de knop Donker/Licht in /admin.
- **De statuspil** ("IN PRODUCTIE", "WACHT OP BETALING") is een plaatje met één zachte hoek, in de vaste
  breedte-letter, zonder bolletje. Zo ziet de pil er op de site uit sinds levering 55.
- **De hoekregel** (levering 56) ook hier, gemeten in Studio, /admin en op de privélink op 1440, 900 en 390
  breed. Een knop in een hoek van zijn kaart loopt met die hoek mee, de andere hoeken zijn licht. Zo gaat
  het onder meer bij:
  - "Opslaan" onderaan Je vaste look en Je gegevens;
  - de knop in de tip;
  - het merkje op een beeld;
  - de knoppen in "Nu doen" in /admin: de bovenste en de onderste rond in de hoek, die in het midden recht.
- Wat de site ook rond houdt, blijft rond: de taal, de filters en de letter van je naam.

## 5. Uit de ronde over de site (de klant die terugkomt)

- **Opnieuw bestellen met alle instellingen** gaf bovenaan twee blokken onder elkaar: "Instellingen
  overgenomen" én "Je was nog bezig met een bestelling". Nu gaat de kopie voor. Het oude concept blijft
  bewaard tot je iets verandert.
- **Ook je eigen stijl** gaat nu mee bij het kopiëren van een catalogusbestelling (`cs-<id>`). Die viel weg.
- **"Je gegevens bewaren we niet; die vul je straks opnieuw in"** stond er ook voor wie ingelogd is. Voor
  hem klopt het niet, want zijn gegevens komen uit zijn account. Nu alleen voor wie niet is ingelogd.
- **Een 404 in Studio** was Nederlands terwijl je Studio in het Engels had gezet. Nu volgt hij de taal die
  je koos.
- **De lijn boven "Meer producten in deze look?"** op de privélink boog aan beide uiteinden omlaag. Het blok
  kreeg de ronde hoek van de kaarten (28 px), maar het is geen kaart: alleen een lijn erboven. Nu is de lijn recht.

## Toetsen

- **De hele testreeks: 259 van 259 goed** (22 min 30 s), met de nieuwe `test:studiomerk` erin.
  Daarna kwam alleen de rechte lijn op de privélink erbij (punt 5); de 22 toetsen die de privélink of
  `portal.css` raken, heb ik daarna opnieuw gedraaid: alle 22 goed.
- **Nieuw, `test:studiomerk`** (26 controles):
  - het woordmerk met de lijn in Studio, op de losse kaarten, in /admin en op de privélink: eerst de lijn, dan de
    vulling, geen inline stijl (de CSP);
  - de beweging onder de muis en bij focus, niets bij minder beweging, lila in het donkere thema;
  - de iconen uit het kit, geen lijniconen meer in Studio;
  - het vinkje in drie delen, dat alleen beweegt op het beeld van zojuist; stil op de privélink.
- **`test:herbestel`**: 4 controles erbij. De eigen stijl van een catalogusbestelling gaat mee, de standaardstijl
  niet, en de zin "de stijl, …" staat er in beide talen.
- **`test:creditsketen`** leest nu de tekst van de pil zelf. De pil staat door de CSS in hoofdletters, en de toets
  keek naar wat er op het scherm stond.
- **De hoekregel gemeten** in Studio, /admin en op de privélink: 13 pagina's op 1440, 900 en 390 breed: 244
  plaatjes, knoppen en pillen met een zachte hoek. 52 zitten in een hoek of langs een rand, en die 52 volgen
  allemaal de regel. Ook gezocht naar losse lijnen met een ronde hoek, want die buigen: alleen die op de
  privélink (punt 5).
- **Zelf nagelopen op visuails.com** als zes soorten klanten, en de beveiliging als laatste, na uitloggen. Wat ik
  vond staat in afvinklijst 37; de gevonden fouten zitten in punt 5 hierboven.

## Wat hierna komt

- Afvinklijst 36 (het bestelformulier, de melding, kopiëren): zodra je gekozen hebt, bouw ik het.
- Afvinklijst 37: de UX-punten van de hele site en mijn oordeel over live gaan.
