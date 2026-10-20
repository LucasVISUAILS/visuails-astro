# Levering 61 — minder sjabloon (18 oktober 2026)

Uit afvinklijst 39, de reel over wat een website AI-achtig maakt. Alle kaarten op "doen", behalve e-stappen
("niet", met de notitie dat de animatie sneller mag). Vragen: v39-pil a, v39-plankop b, v39-streep b en
v39-wanneer a. Uitrollen met **UITROLLEN.bat**, zonder migratie.

Het nieuwe kleurenschema (lijst 41) zit hier nog niet in. Dat komt als aparte levering, na je akkoord.

## 1. Geen glas meer (a-glas)

- **37 plekken met `backdrop-filter`** zijn weg: de topbalk, het uitklapmenu, de belletjes bij de laptop, de
  WhatsApp-knop, de panelen en labels op de foto's, de cookiebalk, Studio en de werkplaats.
- Op **15 van die plekken** zat er ook een doorzichtig wit onder. Dat is nu dekkend wit (`#FFFFFF`), met een
  haarlijn als rand (`inset 0 0 0 1px`). Anders was het nog steeds glas, alleen zonder waas.
- De donkere pil op foto's is effen inkt. De twee glasvariabelen (`--glas-vul`, `--glas-licht-vul`) zijn
  effen: `#111111` en `#F5F5F5`.
- De balk op de pagina's met de oude grond (`Layout.astro`) had een eigen doorzichtig grijs. Dat is nu `#F5F5F5`.

## 2. Eén zachte hoek, ook voor vlakken (a-hoek)

- **Elke ronding van 10 px of meer met vier gelijke hoeken** is nu dezelfde ronding alleen linksboven, met
  3 px op de andere drie. Dat zijn 432 regels, plus 247 die een hoekvariabele gebruiken (`--r-lg`, `--r-md` en
  zo).
- Het geldt voor de voet, de kaarten, de cookiebalk, de invoervelden, Aanmelden, labels als Binnenkort, Studio,
  de werkplaats, de privélink en de mails (het label en het citaat).
- **Een pil wordt een knop of een plaatje (v39-pil a).** De zachte hoek linksboven volgt de hoogte: 8 px voor
  een klein label, 11 px voor een chip, 14 px voor een knop.
- **Rondjes blijven rond:** de WhatsApp-knop, de stippen, de pauzeknop, de lettertjes op de merkmuur, de
  schuifknop van de vergelijker en de rondjes in het formulier.

**Bewust niet: de schermen op de laptop in de opening.** Daarop staat de webwinkel van een klant (JOUWMERK),
geen VISUAILS. Die winkel houdt zijn eigen vormen: als hij de merkhoek krijgt, lijkt het alsof wij zijn winkel
gemaakt hebben. De schermfoto's zijn dus niet opnieuw gemaakt.

**De hoekregel op de nieuwe vorm.** Je regel van levering 56 blijft precies dezelfde. Er valt nu alleen minder
mee te rekenen, want een vlak is nog maar op één plek rond:

- **Linksboven in een vlak** loopt de hoek concentrisch mee: de straal min de afstand. Een foto die zijn vlak
  vult, neemt de vorm van het vlak over (`inherit`). Dan klopt hij op elke breedte, zonder getal.
- **Langs een andere rand, of in een andere hoek**, zijn alle hoeken licht (3 px). Daar is het vlak recht.
- **Los in het vlak** houdt alles zijn eigen vorm.

Wat dat zichtbaar verandert:

- **De topbalk.** De links, de taalkeuze, Diensten en de Order-knop hebben lichte hoeken. De balk heeft rechts
  geen ronding meer, dus de knop ook niet.
- **Het uitklapmenu.** De eerste regel loopt mee met de hoek van het menu: 28 − 14 = 14 px.
- **De vier stappen op de voorpagina en op how-it-works.** De kenmerken onderaan, de tegels en de lijstjes in
  de illustraties zijn licht. De vinkjes rechtsboven op de tegels ook.
- **Foto's in een kader.** De kopfoto's, de foto's op /about en /upload-guidelines, de formaten en de kaart in
  Studio volgen nu het kader. Eerst hadden ze 12 px linksboven, ook als het kader 32 px had.
- **Bijschriften linksonder op een foto** zijn licht. Daar is de foto recht.
- **De vergelijkingstabel op de telefoon.** De eerste kaart loopt linksboven mee, de rest is licht.

Alles is gemeten, niet geschat. De bestaande toets (`npm run test:hoekregel`) slaagt op 20 pagina's en 3
breedtes. Daarnaast zijn **89 pagina's op 22 breedtes** gemeten, aan beide kanten van elk breekpunt, met de
uitklapmenu's open.

Die meting vond ook twee plekken waar de afstand van de lengte van de tekst afhing. Dan klopt geen enkel vast
getal:

- **/about, de lijst met de vier controles.** Het fotootje staat bovenaan in plaats van in het midden.
- **Lifestyle, het modelkaartje op de telefoon.** Ook hier staat het beeld bovenaan.

Daarnaast vond de meting **één echte fout**, al van voor deze levering. In het Nederlands schoof de knop
Aanmelden van de Studiobrief rond 900 px breed 20 px buiten zijn blok (/nl/editions, /nl/guides). Het raster
rekende met de natuurlijke breedte van het invoerveld. Dat is opgelost.

Op telefoons smaller dan 380 px staat de rij formaatknoppen op de voorpagina links in plaats van in het
midden. Anders kwam de eerste knop half in de hoek van het vlak.

## 3. Vlak, zonder zachte schaduw (a-schaduw)

- **52 schaduwen met vervaging** zijn weg. Haarlijnen, ringen zonder vervaging en schaduwen naar binnen
  blijven.
- In lijst 39 stonden er 7. Dat was te weinig geteld. Ik keek toen alleen naar zichtbare elementen zonder
  muis, en niet naar `::before`/`::after`, de combinaties met een haarlijn en de schaduwen die pas bij hover
  komen.

## 4. Je eigen kleur zonder regenboog (a-regen)

- Bij de proef, Achtergrond, is het lege staal nu wit met een haarlijn.
- Erop staat **#RRGGBB** in de vaste breedte-letter (IBM Plex Mono, 15 px), zoals de stalen ernaast hun
  hexcode tonen. Het regenboogverloop is weg.

## 5. Lila alleen als je iets kiest (a-lila)

Dit gaat mee met het kleurenschema van lijst 41. Alle drie de schema's daar halen de lila vlakken weg en maken
de grijzen neutraal. Als ik het nu naar nevel zet en straks weer naar het nieuwe grijs, doe ik het werk twee keer.
De lila rekenkaart op /pricing, de labels in het menu en de voet, en het label bij Merk staan in die mapping.

## 6. De tekst (b-vink, b-drie, b-streep)

- **b-vink.**
  - Op /models zijn de drie regels nu **GEEN MEERPRIJS** per model, **GEZICHTEN** voor alle merken en
    **WISSELEN** per bestelling, zonder vinkje en zonder streepje. In het Nederlands: Geen meerprijs per model,
    gezichten voor alle merken, Wisselen per bestelling.
  - Het vinkje voor elke regel is ook weg uit de kenmerken op Merkmodel, Editions, Hooks, how-it-works,
    de lookpagina en de videostijlen. Daar zei het net zo weinig.
  - De vinkjes bij Voorkant, Achterkant en Nagekeken op de voorpagina blijven. Dat is een echte controlelijst.
- **b-drie.**
  - Classic: "Every product in the same clean style." / "Elk product in dezelfde strakke stijl."
  - Lifestyle: "One product, / four photos in one carousel." / "Eén product, / vier foto's in één carrousel."
- **b-streep (v39-streep b).** De gedachtestreepjes kies jij per zin, in de tekstronde. Daar zijn ze gemarkeerd.
  Tot dan houdt de nieuwe toets het aantal per pagina vast, dus er komt er geen bij.

## 7. Beweging (c-hover, e-stappen)

- **c-hover.** 38 regels die bij hover of indrukken iets lieten zweven, zoomen, groeien of krimpen, zijn weg.
  Het ging om kaarten, foto's en plaatjes. Ook het zweven van de belletjes (`h-zweef`) is weg.
- **Alleen de pijlen bewegen nog.** Ze springen in twee stappen 2 px in hun eigen richting (53°), in 0,18 s.
  Vijf pijlen gleden nog met een veer of draaiden 45°:
  - de pijl op de dienstkaarten (schoof horizontaal);
  - de pijl op de lookkaarten (draaide);
  - de pijltjes achter "Abonnement", "Meer" en de soorten in de prijstabel.
- **Het uitklapmenu** schoof 8 px omhoog en vervaagde. Nu verschijnt het in twee stappen, op zijn plek.
- De hover van het logo blijft zoals hij is.
- **e-stappen (niet, maar sneller).** De drie stappen op de voorpagina lopen 25% sneller.
  - Alle tijden in die animatie keer 0,75: de tijdlijn, de vinkjes en de illustratie
    (`scripts/maak-recht.py` heeft daarvoor `TEMPO = 0.75`).
  - De volgorde en de vormen zijn hetzelfde gebleven.

## 8. De abonnementen (d-plannen, v39-plankop b)

- De drie plannen staan als **één vorm** naast elkaar, met haarlijnen ertussen.
  - Linksboven de zachte hoek van 32 px, rechtsonder de snede van 53°.
  - Op de telefoon staan ze onder elkaar, met een haarlijn erboven.
- Geen vinkjes meer in de lijstjes. "Bespaar" heeft een dubbele punt in plaats van het streepje.
- Het merklabel is een plaatje: 28 px hoog, vaste breedte-letter, hoofdletters.
- De kop: **"Choose your / monthly budget."** / **"Kies je / maandbudget."**

## 9. De toets die het bewaakt (f-toets)

`tests/minder-sjabloon-browser.test.mjs` (`npm run test:sjabloon`) leest alle 89 pagina's op 1440 en 390 px in
de browser. Hij faalt bij:

- glas;
- een zachte schaduw met vervaging;
- een vlak met vier gelijke ronde hoeken van 10 px of meer (cirkels tellen niet);
- ✦, ✧, ✨, ★ of een emoji in de tekst;
- een hoverregel die een kaart, foto of knop laat verschuiven, schalen of draaien;
- een pijl die glijdt in plaats van springt. Dat meet hij zonder "minder beweging", want die zet alle
  overgangen op nul;
- **een gedachtestreepje meer dan nu**, per pagina.

Ik heb hem ook omgekeerd getest. Glas, een schaduw, een ronde knop, ✨, twee streepjes en een glijdende pijl, met
de hand op /about gezet: hij vond ze alle zes.

Het streepje is anders dan in de kaart stond ("geen streepje buiten de juridische pagina's"). Jij kiest per zin
(v39-streep b), dus de toets houdt het aantal vast tot de tekstronde. Daarna zet ik de getallen op wat jij
overliet.

## 10. Testreeks

**Testreeks 266/266**, met de nieuwe toets erbij.

Twee toetsen volgen de snellere stappen op de voorpagina:

- `tests/hoe-stappen-29.test.mjs` met de nieuwe tijden;
- `tests/doorloop-27c.test.mjs`, die op 0,675, 1,425, 2,25 en 3,825 s meet (was 0,9, 1,9, 3,0 en 5,1 s).

Verder is gemeten, niet geschat:

- de hoekregel op 89 pagina's en 22 breedtes;
- de hovers op 24 pagina's, met de muis erover, en wat er dan beweegt en hoe snel.

Daarnaast heb ik de bestelstappen, Studio en de 83 mails als schermafdruk nagekeken.

## Bestanden

- **CSS:**
  - `src/styles/` hal, global, werkplaats, studio-hal, studio, stijl22 en maak-recht;
  - `public/` account, portal en feedback.
- **Componenten:** 39 `.astro`-bestanden. Bij alle de `<style>`-blokken, bij een deel ook de tekst. Daaronder
  het bestelformulier, Layout, Note, Studiobrief, FormatenHal en de figuren voor Studio.
- **Tekst:**
  - ModelsHal, PlansHal en LifestyleHal;
  - `src/data/catalogStyles.js` en `.nl.js`;
  - de kenmerken op zes pagina's.
- **Beweging:**
  - VoorpaginaHal;
  - `scripts/maak-recht.py` en `src/styles/maak-recht.css`.
- **De proef, de mails:** BackgroundPicker; `src/lib/mailTemplate.js`.
- **Toetsen:**
  - `tests/minder-sjabloon-browser.test.mjs` (nieuw);
  - `tests/doorloop-27c.test.mjs` en `tests/hoe-stappen-29.test.mjs`;
  - `package.json`.
- **Kladblok:** dit bestand en `kladblok/COMMIT-BERICHT.txt`.

