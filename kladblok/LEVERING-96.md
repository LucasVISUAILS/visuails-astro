# Levering 96 · De vaste opbouw van de voorpagina en de winkel van NON/STD

**13 november 2026. Staat alleen in je map; je rolt zelf uit met `UITROLLEN.bat`.** Gebouwd uit lijst 96 (ronde 97: A1 a,
A2 a, C1 b met je notities), lijst 97 (ronde 98: alles volgens advies, met je notitie) en lijst 98 (ronde 99). Geen migraties. Opruimen:
`_opruimen/LIJST.txt`, blok "13 november 2026 · moet weg (levering 96 …)".

## 1 · Elke sectie dezelfde kop (lijst 96, A1 a)

- **SectieKop.astro** (nieuw), met `sectiekop-96.css`. Links staat de kop: VISUAILS Display 700 in hoofdletters, 64 px
  op 1440 en 32 px op de telefoon. Rechts, op dezelfde lijn, staat het label in mono met de schuine streep en het nummer.
  Eronder loopt een haarlijn.
- **Het nummer** telt mee met een CSS-teller. De banner is 01, dus de eerste kop is 02. Er staat dus nergens een getal
  met de hand.
- **Eén kolom** van hoogstens 1200 px, 120 px marge op 1440. **Eén lucht:** 128 px boven en onder op 1440, nooit minder
  dan 72 px.
- **Waar:** Wat we maken (02), Hoe het werkt (03), Looks (04), Meer weten (05), het slot (06).
  - De rijen van de looks blijven over de hele breedte; alleen de kop staat in de kolom.
  - De laptop, de poster (Bouw de wereld) en de €1-proef hebben hun eigen vorm. Die laat ik zoals ze zijn, net als de
    banner.
- **Nagemeten** op 1440, 1280 en 390: elke kop staat links op de marge, de kop is 64 / 57 / 32 px en hoogstens twee
  regels, en er is geen zijwaartse scroll.

## 2 · De volgorde (lijst 96, A2 a)

| Nu | |
|---|---|
| Banner | |
| Wat we maken | |
| **Hoe het werkt** | omhoog, nu met een zichtbare kop: "Van foto tot campagne." |
| Laptop | |
| Looks | |
| Bouw de wereld | |
| **€1-proef** | vóór de vragen |
| Nog vragen? | |
| **Het slot (nieuw)** | "Klaar voor je beelden?", een zin, "Start een bestelling" (naar /start, zoals de banner) en "Of probeer één product voor €1" |

## 3 · De kaarten bij Wat we maken (lijst 96, C1 b)

- **Groter:** de kaart in het midden is 34 % van de baan (was 28 %), tussen 240 en 420 px. Op de telefoon is hij 70 %.
- **Licht kantelen:** de kaart in het midden kantelt mee met de muis, hoogstens 4°.
  - Alleen met een muis, nooit bij "minder beweging".
  - Gaat de muis eraf, dan staat hij weer recht.
- **De catalogusanimatie (lijst 98: A1 goed, A2 a, met je notitie en je voorbeeld):** op de kaart Productfoto's, 12 s,
  daarna opnieuw.
  - De telefoonfoto van de blauwe hoodie, met een zoeker en de sluiterknop.
  - Een zachte witte flits, en uit het wit komt de hoodie op de grond.
  - De hoodie schuift naar zijn vak in een catalogus van zes: hoodie blauw en zwart, jeans zwart en indigo, sokken wit
    en zwart.
  - De catalogus heeft meer persoonlijkheid, zoals je voorbeeld:
    - twee kolommen;
    - de naam in hoofdletters in een typemachineletter met ruimte tussen de letters ("ZIP HOODIE [ZWART]");
    - de prijs met EUR;
    - een zwarte balk "Bekijk alles" zonder ronding.
  - De catalogus scrollt naar die balk en terug. Dan wordt de hoodie weer groot, en een cursor klikt twee keer op de
    pijl: achterkant, dan detail.
  - Hij speelt alleen als de kaart gekozen is en in beeld staat. Bij "minder beweging" staat de hoodie er stil.
  - Code: `src/scripts/catalogkaart96.js`.
  - Herkleuringen: `scripts/catalogus-kleuren-96.py`. Alleen de stof kleurt, de vilten letters blijven.
  - Uit: `public/img/hal/maken/catalogus/`.
  - De namen en prijzen zijn die van de verzonnen winkel in `laptopSlides.js`.

## 4 · De winkel van NON/STD in de laptop (lijst 97)

- **Het logo (A1):** overgetrokken van de vilten letters op de hoodie, alleen de lijn.
  - De rits is weggedacht en de tweede N is heel.
  - De streep is een gewone schuine streep.
  - Het bestand: `public/img/hal/nonstd-logo.svg`.
- **De opbouw (A2 a, A3 a):** zoals je voorbeeld van Margiela; alleen de opbouw is overgenomen.
  - Alles in IBM Plex Mono, het logo in het midden van de balk.
  - Rijen met haarlijnen (◆ A · Details »), "Kies je maat »" en de kleur bij naam met vierkante staaltjes.
  - Een zwarte balk zonder ronding en de bezorgopties ingesprongen.
  - Geen ronde hoeken meer in de winkel.
  - De beschrijvingen zijn nieuw en bevatten geen getallen; de prijzen komen uit `laptopSlides.js`.
- **De kleur van de pagina:** #FBFDFF, precies de grond van de productfoto's (gemeten in de hoeken van alle zes). Er is
  geen naad meer.
- **Niets afgesneden (je notitie):** de foto's staan in 4 : 5, de verhouding van de foto's zelf.
  - De voor- en achterkant zijn opnieuw gecentreerd: het product precies in het midden, met gelijke lucht rondom.
  - Script: `scripts/opening-galerij-96.py`.
  - Uit: `public/img/hal/opening/galerij/`, 880 × 1100.
- **Scrollen (A4):** de foto is in de opening een echte galerij in het laptopscherm, in zijn perspectief.
  - Met je muis op de foto ga je met het wieltje per foto. Bij de eerste of de laatste scrollt de pagina gewoon door.
  - Zonder muis erop gaat hij elke 3 seconden naar de volgende foto. Na de vierde komt het volgende product (je
    notitie): hoodie, jeans, sokken.
  - De beeldjes links krijgen een lijn bij de foto die er staat; een klik erop gaat naar die foto.
  - Haal je de muis weg, dan loopt hij verder vanaf de foto die er staat.
  - Bij "minder beweging" schuift hij zonder glijden.
- **De video naar de catalog (je notitie):** is de campagnevideo in de laptop klaar, dan gaat hij meteen naar de eerste
  productpagina. Dat gebeurt ook als je nog niet bewogen hebt of met de muis op de laptop staat.
- **Conceptmerk (A5 c):**
  - In de voetbalk van de winkel: "NON/STD is een conceptmerk, bedacht door VISUAILS".
  - Onder de laptop staat dezelfde zin als echte, leesbare tekst (13,5 px, grijs, 5,5 : 1).
- **Opnieuw gemaakt:**
  - De zes catalogschermen, met `node scripts/opening-catalog-94.mjs`. Het script maakt geen schermen met beeld 2 – 4
    groot meer; die staan in de opruimlijst.
  - De andere laptopstanden, met `npm run laptop-standen`. Ze zien er hetzelfde uit, maar de vingerafdruk van de bron
    veranderde.

## 5 · Tests

- **voorpagina-80:** de nieuwe volgorde (met het slot) en vijf sectiekoppen. 64 goed.
- **Groen:**
  - homerail 28/28
  - lettermaten-94 4/4
  - letter-77 39/39
  - grond-79 18/18
  - a11y 17/17
  - hardgetypt 4/4
  - laptop-90 14
  - opening-90-browser 52
  - doorloop-90 101
  - laptop-standen, na het opnieuw maken
- **Nagekeken in de browser:**
  - Na 3 s staat foto 2, na 12 s komt het volgende product.
  - Het wieltje op de foto gaat naar de volgende foto, en de pagina scrolt dan niet.
  - Geen scriptfouten.

## 6 · Open

- **Levering 97:** alle knoppen scherp ("strak", lijst 96 B1 a en B2 a).
