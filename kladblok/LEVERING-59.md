# Levering 59 — het bestelformulier als werkplaats (17 oktober 2026)

Uit afvinklijst 36, deel B (alles "doen"). Voor /start/catalog en /start/lifestyle, in het Engels en het
Nederlands. De looks uit lijst 38 komen in levering 60.
Uitrollen met **UITROLLEN.bat**, zonder migratie. Levering 56, 57 en 58 gaan mee: die staan nog niet live
(de laatste regel in uitrol-log.txt is van 08:35).

De proef (/test-sample) is geen werkplaats en is niet veranderd. De velden die het formulier verstuurt, zijn
dezelfde als voorheen: wat nieuw is, vult de velden die er al waren. Er is dus niets veranderd aan /api/order,
de mail, de werkmap of Studio.

## 1. De werkplaats (b-werkplaats)

- **Geen topbalk, lade of voet van de site.** Bovenaan een eigen balk: de V (naar de homepage), de stappen,
  "Hulp nodig?" en de taal. Layout.astro heeft daarvoor de optie `werkplaats`.
- **Hulp nodig?** opent een klein paneel met WhatsApp, mail en de FAQ. Esc of een klik ernaast sluit het.
- **Rechts staat "Wat je krijgt"**: per hoek een tegel, de vorm, de regels (Producten, Beelden, Gezicht,
  Voorrang), het totaal en één knop die zegt waar hij heen gaat: "Verder naar je foto's", "… je gegevens",
  "… je leverdatum", "… betalen". Op de laatste stap staat hij er niet; daar is "Bestellen en betalen" de knop.
- **Inloggen** is een regel onder die knop: "Al eerder besteld? Log in, dan staan je gegevens klaar."
- **Meteen een prijs.** Een leeg formulier staat op 1 product, dus je ziet meteen €89 (catalog) of €109
  (lifestyle). Dat is de standaard en geen keuze van de klant: een kopie van een eerdere bestelling zet het
  aantal nog steeds zelf.

## 2. De keuzes in vier blokken (b-keuzes)

- **01 Stijl** (catalog: Classic, of Eigen look op aanvraag) of **01 Look** (lifestyle).
- **02 Aantal**, met de prijstrap ernaast; de trede waar je nu op zit, is gemarkeerd.
- **03 Gezicht.**
- **04 Levering**: één zin. Onder de 10 producten: *"Zodra het klaar is: vaak binnen een dag, soms een paar
  dagen. Je krijgt een bericht."* Vanaf 10: *"Vanaf 10 producten kies je na je gegevens een leverdatum:
  gereserveerd zodra je bestelt, vast zodra je betaalt."* Voorrang is een schakelaar met de prijs erbij.
- **Weg uit beeld**: "Meer opties", de kanalen, de achtergrondsectie, de doorlooptijden en de blokken onder het
  formulier. De kanalen en de achtergrond staan nog in het formulier (verborgen), zodat alles wat ze deden, blijft
  werken.

## 3. De kleur per hoek (b-kleur)

- Elke tegel in "Wat je krijgt" heeft rechtsonder een vierkantje met de kleur van die hoek.
- Een tik opent een paneel met Wit, Lichtgrijs (#F5F5F5), Beige en een eigen hexcode, en de noot over Amazon
  (hoofdfoto alleen #FFFFFF). Esc sluit het; de focus gaat terug naar het vierkantje.
- De kleur van de voorkant is de achtergrond van de bestelling; een andere hoek krijgt alleen een eigen kleur
  als hij afwijkt (de velden `beeld_bg_<hoek>` en `beeld_hex_<hoek>`, die er al waren).
- Lifestyle heeft geen kleur per hoek.

## 4. De vorm en een hoek erbij

- De vorm (1:1, 4:5, 3:4; bij lifestyle vijf) is een rij knoppen in "Wat je krijgt".
- "Een hoek erbij" opent de hoeken in een paneel. De extra hoek komt als tegel in "Wat je krijgt", met zijn eigen
  vierkantje, en telt mee in het totaal.

## 5. Stap 2: één product tegelijk (b-stap2, b-tips)

- Bovenaan een knop per product met nummer, naam en telling ("02 Product 2 0/3"); onderaan Vorig en Volgend
  product en "Product 1 van 5".
- **De tipbalk** onderin: één tip tegelijk, om de 7 seconden de volgende. Stil zolang de muis of de focus erop
  staat, met de pauzeknop en bij minder beweging. Het kruisje verbergt hem op dit apparaat; "Toon de tips weer"
  bovenaan zet hem terug.
- Van 601 tot 900 px breed staan de vakken van een product weer naast elkaar (vier per rij).

## 6. De telefoon (b-telefoon)

- In de balk alleen de stap waar je bent, als pil: "01 Wat je bestelt · 1 van 4".
- Onderaan een vaste balk met het totaal, "4 beelden · excl. btw" en Verder.
- "Wat je krijgt" staat onder de keuzes. De gezichten schuiven opzij, net als de knoppen van de producten in stap 2.
- **Een keuze van mij:** op de telefoon past de taalknop niet meer in de balk. Hij staat daar onderaan in
  "Hulp nodig?" ("English" / "Nederlands"). Zeg het als je hem liever ergens anders hebt.

## 7. Gemeten

- Contrast ≥ 4,5:1 en tekst ≥ 11,5 px voor elk tekstje van de werkplaats (labels, zinnen, trap, regels, totaal,
  inloggen, de noot, voorrang, de stappen, de tipbalk en de productknoppen), op 1440 breed.
- Geen horizontale scroll op 390 en 1440, en geen tekst buiten beeld op 360 en 390 (test:telefoontekst).
  Het kleurpaneel en "Hulp nodig?" passen op 360 en 390 breed op het scherm.
- Nagekeken in beeld op 1440, 900, 768 en 390: stap 1 tot en met 5, met 3 en met 12 producten (de leverdatum),
  catalog en lifestyle.

## 8. Toetsen

- Nieuw: **test:werkplaats** (tests/werkplaats-browser.test.mjs, 108 controles): de balk, de blokken, de trap,
  de leverzin bij 10, voorrang, de kleur per hoek in de velden, de vorm, een hoek erbij, Hulp nodig?, Verder per
  stap, één product tegelijk, de tipbalk (ook de klok en minder beweging), de telefoon, lifestyle en Engels.
- Aangepast aan de nieuwe keuzes: tests/stap2-kaart-browser.test.mjs (één kaart tegelijk) en
  tests/concept-browser.test.mjs (de standaard van 1 product).
- Testreeks 263/263.

## Bestanden

Nieuw: src/components/order/WkBalk.astro, WkBlok.astro, WkOm.astro, src/styles/werkplaats.css,
tests/werkplaats-browser.test.mjs.
Veranderd: src/layouts/Layout.astro, src/components/order/OrderFlow.astro, BestelOverzicht.astro,
ProductUploader.astro, src/scripts/pipeline.js, de vier pagina's src/pages/(nl/)start/catalog.astro en
lifestyle.astro, package.json, tests/stap2-kaart-browser.test.mjs, tests/concept-browser.test.mjs,
kladblok/COMMIT-BERICHT.txt.

## Nog open

- **Levering 60**: de looks uit lijst 38 (€50 per look, 4 credits per look). Daarin ook: de server rekent de
  outfit nu nog bij een catalogbestelling, en de keuze van de outfit bij lifestyle staat nu nog in blok 02.
- **Voor de lancering**: Workers Paid ($5 per maand), SUB-YM3O-MYF en SUB-PFDC-8X6 opzeggen, Mollie op live,
  de sleutels van Turnstile en de rooktest van €1,21.
