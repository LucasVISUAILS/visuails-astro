# Levering 54 — de iconen, de knoppen, de labels en het logo (17 oktober 2026)

Uit afvinklijst 34 (v34-volgorde a: eerst iconen, knoppen en labels) en je berichten van 05:23 tot 06:24.
Uitrollen met **UITROLLEN.bat**, zonder migratie. Levering 52b, 52c en 53 zijn nog niet uitgerold
(uitrol-log is van 16 oktober); ze gaan mee.

De homepage is niet omgebouwd. Alleen de onderdelen die overal staan (iconen, knoppen, labels) zijn
daar ook veranderd.

## 1. Het logo onder de muis, op alle logo's

Lucas: *"Het mag nog wel subtieler, de echo lijnen achter het logo moeten gewoon wat stotterig wiebelen
en uit de maat dus random."*

- Eén violette echolijn, dunner (0,55 px) en dichter op het logo (1,2 px; was 1,7 px).
- Hij tekent in en begint daarna pas te wiebelen: kleine schokjes, op drie ritmes die elkaar nooit
  inhalen (2,9 / 4,3 / 3,7 s). Daardoor herhaalt het patroon zich niet en voelt het willekeurig. Het logo
  zelf beweegt niet.
- Op alle logo's: de V in de balk en in de lade, het woordmerk in de footer en het grote woordmerk
  eronder. Voor het woordmerk is er een omtreksymbool bij (`#woordmerk-lijn`, per letter een pad), zodat
  elke letter intekent.
- Minder beweging: de lijn staat er meteen, zonder wiebel.

## 2. De iconen (afvinklijst 34, alle iconen "doen")

- Eén bron: `src/data/iconen.js`, de 32 iconen uit het kit plus twee die erbij moesten (pauze en
  plus-en-min, met dezelfde regels). Elk onderdeel dat eigen lijniconen had, haalt ze nu daar.
- Gevuld, in de kleur van de tekst, nooit kleiner dan 14 px (gemeten: 0 kleiner op 218 plekken).
- Het vlak erachter (v34-plaat c): in een zin of lijst geen vlak meer, het icoon staat los in violet.
  Bij knoppen en grote tegels een plaatje met één zachte hoek (24,7% van de hoogte, de maat van het merk).
- Lucas (06:04): *"de hoek die het dichtste bij de ronde hoek van de kaart zit rond"*. Gemeten op 27
  pagina's, op 1440, 768 en 390 breed: staat een plaatje of knop in een hoek van zijn kaart, dan zit de
  zachte hoek aan die kant (concentrisch met de kaart). Midden in een vlak: linksboven, zoals het V-merk.
- Het WhatsApp-icoon blijft het officiële (v34-wa a).

## 3. De knoppen

- Eén zachte hoek linksboven in plaats van een pil; de pijl in twee delen die onder de muis uit elkaar
  schuiven; de donkere knop wordt violet, in twee stappen. Het rondje om de pijl is weg.
- Lucas (06:20): *"de knoppen aan elkaar zetten en dan een soort cut erin maken zoals in het VISUAILS
  logo"*. Twee knoppen naast elkaar zijn nu één vorm met de snede uit het logo ertussen: 53°, met de kier
  van het merk (7,6% van de hoogte). De tweede is gevuld (mist); een lijn kan niet langs de snede lopen.
  Een rij van drie krijgt twee sneden. Op de telefoon staan ze onder elkaar en blijven ze los.
- Ook als één vorm (gezocht op 28 pagina's naar vormen die naast elkaar herhaald worden): de pijlknoppen
  vorige/volgende, de documenten bovenaan de juridische pagina's, de formaten in "Elk formaat", de soort
  beeld in de galerij en de drie sociale knoppen in de footer.

## 4. Labels, stappen, focus, selectie, voet

- Het sectielabel: een schuine streep, het nummer in violet en de naam in IBM Plex Mono (v34-mono a), in
  hoofdletters. Het nummer telt vanzelf (CSS-teller). De letter staat zelf gehost in
  `public/fonts/ibm-plex-mono/` (OFL, 30 kB).
- Het stapnummer bij "Hoe het werkt": groot en zwaar, met /03 klein ernaast.
- De focusrand: violet, met een lila echo linksboven.
- Geselecteerde tekst: violet met witte letters.
- Het grote woordmerk onderaan: in inkt in plaats van het lila verloop, door de onderrand afgesneden.

## Niet in deze levering (volgt, of staat als vraag in afvinklijst 35)

- De mails in de nieuwe stijl en de beweging (vinkje, snede, getal, laden, carrouselbalk): levering 55.
- De kaart met de echo en de status-plaatjes: bij de homepage en Studio, wanneer je beelden klaar zijn.
- Studio, /admin en de privélink houden voorlopig hun eigen iconen en logo (vraag in afvinklijst 35).

## Opgeruimd in mijn werkkopie

41 oude onderdelen en 4 oude scripts die in jouw map al weg waren, staan nu ook bij mij niet meer in
`src` (alleen in een reservemap). Er verandert niets in jouw map.

## Toetsen

Testreeks 257/257 (20 min 38 s). Daarnaast gemeten in de browser, op 1440, 768 en 390 breed:
geen icoon kleiner dan 14 px (218 plekken), de zachte hoeken op 27 pagina's, de knopgroepen op 28
pagina's, en het contrast van label, nummer en focusrand (alles minstens 4,5:1).
