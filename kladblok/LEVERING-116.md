# Levering 116 · /start in twee stappen: eerst wat je nodig hebt, dan de look

**17 november 2026. Staat alleen in je map; je rolt zelf uit met `UITROLLEN.bat`.**

Je keuzes uit lijst 126: alles volgens advies (Q1 – Q6 a, S1 goed, levering a). Het pakket (bureaubladen, deelplaatjes
en de grond van de animaties op het doek) en het sectiesysteem op de andere pagina's schuiven naar levering 117.

## 1 · Wat je zei

- **06:41:** *"Als je op start order klikt word je naar "Pick a look" gestuurd. Dit is veel te breed want ik wil er eerst
  achter komen wat de klant wil voor content wat voor hem nodig is, dan komen pas van die specifieke categorie de looks."*

## 2 · Stap 1: wat heb je nodig?

- **De kop:** *What do you need? Then pick the look.* (NL: *Wat heb je nodig? Daarna kies je de look.*). Erboven een kleine
  stappenrij: 01 Wat · 02 Look · 03 Bestellen.
- **Vijf soorten** (Q2 a), dezelfde als *Wat we maken* op de voorpagina, met hetzelfde beeld en in dezelfde volgorde:

  | soort | waarvoor (Q3 a) | gaat naar |
  |---|---|---|
  | Productfoto's | voor je webshop | stap 2 (`#catalog`) |
  | Lifestyle | voor social en je webshop | stap 2 (`#lifestyle`) |
  | Video | voor Reels en je webshop | stap 2 (`#video`) |
  | Hooks | voor advertenties | `/hooks` (Q5 a) |
  | Eigen look | voor je eigen wereld | `/start/custom-look` (Q5 a) |

  - Onder elke naam één zin en de vanafprijs. De bedragen komen uit `pricing.js`, net als op de voorpagina.
- **Eronder één rij:** je eigen merkmodel, een abonnement, de €1-proef (niet voor wie al klant is) en App ons.
- **Weg** (Q6 a): de kopfoto, de strook *Zo gaat het* en de band *Op maat*. Merkmodel en abonnement staan nu in de rij.
- **Op de telefoon** staan de soorten als rijen met een klein beeld, zodat je alle vijf in één scherm ziet.

## 3 · Stap 2: alleen de looks van die soort

- Na *Lifestyle* staan alleen de vier lifestylelooks er, met de prijs, *Kies deze look* en de €1-proef zoals eerst.
- *Productfoto's* toont Classic met wat je per product krijgt, ook al is het één look (Q4 a, je regel van 19 september).
- *Video* toont Motion en Custom met *Vraag een video aan*.
- Bovenaan staan *Andere soort kiezen* en de stappenrij op 02.
- **Hoe het werkt** (Q1 a): de soort staat in de adresbalk (`/start#lifestyle`).
  - De terugknop van de browser werkt als vorige stap.
  - Het werkt ook zonder script (`src/styles/start-126.css`, met `:target`).
  - *Bestel dit* op de voorpagina en oude links naar `/start#catalog` komen meteen in stap 2 uit.
  - Een nieuwe stap begint altijd bovenaan de pagina.

## 4 · Ook gerepareerd

- **De voorpagina:** *Bestel dit* bij *Eigen look* ging naar `/start#op-maat`. Die band bestaat niet meer; de link gaat nu
  naar `/start/custom-look`.
- **De veegrij op de telefoon:** sinds levering 108 stond een veegrij met looks in het midden van het scherm.
  - Breder dan het scherm stak hij daardoor links even ver uit als rechts, en dat stuk kon je niet terugvegen. De eerste
    look stond half buiten beeld, op /start en op de dienstpagina's.
  - Nu begint de rij links (`telefoon-115.css`), en een toets bewaakt dat de eerste look helemaal in beeld staat.

## Bestanden

| bestand | wat |
|---|---|
| `src/components/StartHal.astro` | de twee stappen; de kopfoto, de strook en de band Op maat weg |
| `src/styles/start-126.css` | nieuw: de opmaak van de twee stappen en welke stap er staat |
| `src/components/VoorpaginaHal.astro` | Bestel dit bij Eigen look → `/start/custom-look` |
| `src/styles/telefoon-115.css` | de veegrij met looks begint links |
| `tests/start-looks.test.mjs` | toetst stap 1 (vijf soorten, de rij), stap 2 (terug naar `#kies`) en de link van de voorpagina |
| `tests/telefoon-58.test.mjs` | opent stap 2 (`/start#lifestyle`) en toetst dat de eerste look in beeld staat |
| `tests/naloop-a2-browser.test.mjs` | zoekt de regel met het tarief in stap 2 (`/nl/start/#catalog`) |
| `tests/kaartveld-100-browser.test.mjs` | zonder de kaarten Op maat op /start (die zijn weg) |
| `tests/telefoon-midden-115-browser.test.mjs` | telt alleen een pil die je ziet (op /start staat de pil van stap 2 verborgen) |

## Toetsen

- **De hele reeks** is gedraaid na een nieuwe build: 274 snelle toetsen en 81 browsertoetsen, alle groen.
- **Vier huistoetsen vingen iets in mijn eerste versie.** Dat is aangepast:
  - de lettermaten zijn nu 15, 13,5 en 12;
  - er schuift niets meer onder de muis (de pijltjes);
  - de oude zachte hoek staat niet meer op de stapnummers en de tegels;
  - drie toetsen keken naar dingen die op /start weg zijn of in stap 2 staan.
- **Gemeten** op 1440 en 390 breed, Engels en Nederlands:
  - de kop staat op één of twee regels;
  - geen tekst is kleiner dan 11,5 px;
  - nergens een horizontale scroll;
  - stap 1 is op 1440 breed 1.981 px hoog (was 4.487);
  - een klik op een soort begint bovenaan stap 2, en de terugknop van de browser brengt je terug naar stap 1.
