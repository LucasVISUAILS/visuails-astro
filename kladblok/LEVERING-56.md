# Levering 56 — de muis, de focusrand, de hoekregel, het logo en de melding (17 oktober 2026)

Uit je berichten van vanochtend (09:02 tot 10:22). Uitrollen met **UITROLLEN.bat**, zonder migratie.
Levering 52b tot en met 55 staan al live (uitrol van 08:35).

Het bestelformulier, Studio, /admin en de privélink volgen in de volgende leveringen (zie onderaan).

## 1. De muis in de animatie

(09:02: *"Er mag nog een nieuw design komen voor de muis in animaties."*)

- De muis in de animatie "met de hand" op de homepage: het silhouet van een gewone muis, zodat hij meteen
  herkend wordt, op de maten van het merk. De staart staat op 66,5° (het rechterbeen van de V) en is van de
  kop losgesneden met de kier van het merk (7,6% van de hoogte), zoals de pijl in de knoppen uit schacht en
  kop bestaat. Eén zachte hoek, achter de kop.
- Een vlak, geen lijn: de witte rand ligt onder de vulling (paint-order), dus de kier is precies de kier.
- De staart is 4 eenheden langer dan bij de oude pijl, zodat het stuk dat je ziet even lang blijft.
- Uitgerekend in `kladblok/muis/geo2.py`. Het is de enige muis in een animatie op de site.

## 2. De focusrand

(*"alleen de focusrand mag echt aanzienlijk rustiger"*)

- Overal één dunne violette lijn van 2 px op 2 px afstand, en niets anders: geen witte halo, geen lila echo.
  De knop zelf (en zijn hover) is niet veranderd.
- Op de violette band (de uitnodiging voor een proef, en de knoppen voor wie al klant is) is de lijn wit:
  violet op violet viel weg. Wit haalt daar 7,2:1, op de lichtste plek van het verloop nog 5,5:1.
- Studio: één rand viel terug op groen (`--focus` bestond niet). Nu violet.
- /admin: de rand was inkt. Nu violet, zoals op de site en in Studio (in het donkere scherm blijft hij licht).
- Violet haalt op de lichte ondergronden minstens 6:1 (wit 7,2, nevel 6,6, mist 6,3, vak 6,1).

## 3. De hoekregel

(09:20: *"de ronde rand altijd met de hoek/rand mee [...] als de rand recht is is er geen ronde hoek. Dit
geld alleen wanneer het in een container zit [...] Bij 'Start an order / Go to VISUAILS Studio' wel gewoon
het huidige houden"*)

- Een plaatje, pil, knop of vakje dat in een **hoek** van zijn vlak zit (beide afstanden kleiner dan de
  straal), krijgt die hoek concentrisch mee: de straal van het vlak min de afstand ertussen.
- De andere hoeken (langs een rechte rand, of naar binnen) zijn licht: 3 px, 2 px bij een klein vakje.
  Aan de kant van een snede blijft het 0.
- **Los** in het vlak (verder dan 12 px van elke rand en niet in een hoek): blijft zoals het was. Pillen
  houden hun ronde uiteinden, en wat over de rand steekt (de brug tussen de stappen) blijft.
- Jouw voorbeelden:
  - **Order in de topbalk**: rechts een halve cirkel van 23 px die precies met het eind van de pil meeloopt
    (de balk kreeg rechts 3 px, gelijk aan boven en onder), links de lichte hoeken.
  - **Het plaatje op de lookkaart** (dat ruitje): 18 px rechtsboven, met de kaart mee. Het label
    linksboven ook 18 px.
  - **De vinkjes in de animatie**: het bovenste rond naar linksboven, het onderste naar linksonder, de drie
    in het midden recht.
- Gemeten op 89 pagina's en 12 breedtes, net aan beide kanten van elk breekpunt. 50 soorten aangepast,
  waaronder de knoppen onderaan de plannen, de WhatsApp-knop op contact, de knoppen onderaan de FAQ en de
  juridische pagina's, de bijschriften op foto's, de pillen op lifestylebeelden en de kolom van VISUAILS in
  de vergelijking (rechts met de tabel mee, links licht).
- De halve regel uit levering 54 is weg: die gaf een tweede ronde hoek, maar liet de zware hoek
  linksboven staan (twee zachte hoeken, bijvoorbeeld op de cookieknoppen en het laatste vinkje).
- **Uitzondering, met reden**: de twee cookieknoppen krijgen allebei dezelfde lichte hoeken. Weigeren
  moet er precies zo uitzien als toestaan (AVG); de toets `test:consent` bewaakt dat.
- Op de telefoon staan de kenmerken in het vak "met de hand" (how-it-works) nu even breed onder elkaar: zo
  breed als hun tekst hing het van de tekst af of het onderste in de hoek kwam.
- Het bestelformulier krijgt zijn hoeken met het nieuwe ontwerp.
- Nieuwe toets: `test:hoekregel` (`tests/hoekregel-browser.test.mjs`) meet de regel op 20 pagina's op 1440,
  900 en 390 breed; een nieuw onderdeel dat hem breekt, valt dan meteen op. Het meetgereedschap staat in
  `kladblok/hoek/`.

## 4. Het logo bleef niet overal inkt

(*"Op sommige pagina's word het logo overigens wit."*)

- Op de bestelformulieren (`/start/…`), `/test-sample` en `/thank-you` zette de stijl van het oude
  bestelformulier (`stijl22.css`) de V in de balk bovenaan op zwart en na scrollen op **wit** (de kleur van
  zijn oude donkere balk). Nu wint de kleur van de hal: inkt, boven en na scrollen, gemeten op 89 pagina's.

## 5. De melding "Welcome back"

(10:22: *"Wanneer ik klik op open this order en ik ga weer terug naar home page komt hij weer terug."*)

- De knop volgen telt nu als gelezen, net als het kruisje: hij komt pas terug als de stand van de
  bestelling verandert (de proef: na 30 dagen). Ook met de middelste muisknop of in een nieuw tabblad.
- De melding onthoudt nu de stand van het moment van klikken (na een zachte navigatie bleef de stand van de
  eerste pagina hangen).
- Toets: `tests/klant-stand.test.mjs` doet jouw stap na (knop volgen, terug naar de homepage).
- Het nieuwe ontwerp van de melding staat als keuze in afvinklijst 36.

## Toetsen

- Testreeks **258/258**, met de nieuwe `test:hoekregel` erbij.
- Eén toets viel eerst om en terecht: `test:consent` eist dat *weigeren* en *toestaan* er precies hetzelfde
  uitzien (AVG). De hoekregel gaf de eerste cookieknop een ronde hoek linksonder. Nu hebben ze allebei de
  lichte hoeken, en slaat `test:hoekregel` de cookiebalk over, met die reden erbij.
- De muis, de focusrand en het logo zijn nagemeten op 1440 en 390 breed; de melding met `tests/klant-stand`.

## Wat hierna komt

- **Afvinklijst 36**: het nieuwe bestelformulier als klikbaar voorbeeld (zonder kader en topbalk, de
  keuzes zichtbaar, één product per pagina, de tipbalk, de achtergrond per hoek), het nieuwe ontwerp van
  de melding en wat er bij kopiëren in Studio meegaat.
- Studio, /admin en de privélink (v35-studio a): het logo-effect, de nieuwe iconen (drie erbij: raster,
  persoon, oog) en het vinkje dat goedkeurt.
- De ronde over de hele site: de site als zes soorten klanten gebruiken, de UX-punten met oplossingen
  (afvinklijst 37), en als allerlaatste de beveiliging, na uitloggen.
