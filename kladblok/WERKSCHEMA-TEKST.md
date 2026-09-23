# Werkschema: minder tekst, rustiger beeld (23 september 2026)

Lucas: *"elke pagina controleren op teveel overbodige tekst (…) het concept is
ontzettend simpel (stuur foto's en visuails levert resultaat). From your photo to
your shop."*

Hij vraagt ook twee dingen voor de foto's:
- De foto's op "From your photo to your shop." en "Your order, end to end."
  worden consistenter in maat en look.
- Er komt meer witruimte omheen, zodat de tekst ervan af staat.

Dat trekken we op de hele site door.

## Regel bij het schrappen

Dit blijft staan, omdat iemand het nodig heeft om te beslissen of te bestellen:
- wat je krijgt;
- de prijs (via pricing.js);
- de levertijd;
- wat je instuurt;
- revisie en terugbetaling.

Dit gaat weg:
- uitleg van het waarom;
- herhaling van wat de kop al zegt;
- een tweede en derde voorbeeld;
- voetnoten die elders al staan.

## Nulmeting

Zichtbare woorden per pagina, gemeten op 1440px:
- EN: /tmp/claude-0/woorden-en-voor.json
- NL: /tmp/claude-0/woorden-nl-voor.json

## Stappen

- [x] **T1: Stations.astro.**
  - Elk beeld staat in hetzelfde vaste kader, met dezelfde hoogte en dezelfde vulling.
  - Er komt meer lucht tussen beeld, bijschrift en kop.
  - De knoppen APPROVE en REQUEST A REVISION raken het bijschrift niet meer.
  - Daarna geldt dezelfde regel voor de andere beeldrijen.
- [x] **T2: Voorpagina.** Alle secties, in EN en NL.
- [x] **T3: How it works.** Lead, band, poort, ambacht, landen en de FAQ-hoek.
- [x] **T4: Studio en compare.** Dit zijn de twee langste pagina's.
- [x] **T5: Catalog, lifestyle en video.** Inclusief de stijlrijen.
- [x] **T6: De overige verkooppagina's.** Custom-models, models, plans, pricing, start, start/plan en test-sample.
- [x] **T7: De losse pagina's.** Editions, hooks, upload-guidelines, gallery, guides, about, contact, faq en per-product.
- [x] **T8: Stijldetailpagina's.** catalog/\*, lifestyle/\* en video/\*.
- [x] **T9: Bestelformulieren.** Alleen wat de invuller echt helpt.
- [x] **T11: Abonnementen opnieuw, van de grond af.** Lucas, 23 september 2026: *"ik zie nog steeds producten staan en dat 1 product catalog en lifestyle in 1 zijn, terwijl de klant niet alleen hieraan vast zit. Het lijkt alsof het abonnement niks voorstelt bijna."*
  - Eerst uitzoeken hoe het nu werkt: de pagina /plans, /start/plan, het datamodel in pricing.js en de backend (inschrijven, betalen, tegoed, verbruik).
  - Een abonnement is een maandtegoed in credits, geen aantal "producten". Je besteedt het vrij aan catalog, lifestyle en video.
  - Bij een plan op maat vult de klant zelf een aantal credits in en ziet hij direct wat hij daar per maand voor krijgt.
  - Het abonnement moet zichtbaar meer opleveren dan los bestellen: korting, voorrang, doorschuiven van tegoed en een vaste leverdag. Welke precies, beslissen we na het onderzoek.
  - De backend moet foutloos zijn: tegoed boeken, verbruiken, doorschuiven en Mollie in testmodus. Er komen tests bij.
- [x] **T10: Afronden.**
  - Build draaien.
  - Volledige suite draaien, met nl-locale.
  - Scans draaien.
  - Woorden opnieuw meten.
  - Stage + cmp, dan leveren.
  - Rapport schrijven.

## Log

- **Stations.astro.** Elk beeld staat nu in één vast kader: 4:3, wit, met een haarlijn. Er zit meer lucht tussen beeld, bijschrift en kop. De knoppen in het portaalscherm kunnen niet meer over het bijschrift lopen.
- **Tekst.** Over ruim 40 pagina's is het aantal zichtbare woorden met ongeveer een kwart gedaald. De grootste dalers:
  - compare: 976 → 541
  - studio: 1043 → 721
  - how-it-works: 680 → 376
  - custom-models: 705 → 409
- **Tegenstrijdigheden rechtgezet.**
  - Video stond elders op aanvraag, maar noemde op vijf plekken nog €69 per clip: guides, de video-stijlpagina's, /start/video, de FAQ en /pricing.
  - "20 Editions-beelden erbij" stond nog in de bedankpagina en in het bestelformulier, terwijl die set nog niet draait.
- **Abonnement: model.**
  - Credits in plaats van producten.
  - Een plan op maat van 30 tot 300 credits, op dezelfde prijslijn als de vaste plannen (customCreditsTotal).
- **Abonnement: pagina's.** /plans is opnieuw opgebouwd, inclusief een rekenhulp. /start/plan heeft nu één veld voor credits.
- **Abonnement: gerepareerde fouten.**
  - De hele nachtelijke cron viel om, door een ReferenceError in herinnerCredits.
  - De webhook gaf een 500 bij elke betaling van een maand op maat.
  - Een klant met te weinig credits kreeg de verkeerde foutmelding.
  - Hervatten op de jaartermijn gaf 12 termijnen in plaats van de rest.
  - Het dashboard toonde de verkeerde termijnlabels.
  - ?dienst= deed niets.
  - De voorbeelden op /start/plan hadden geen getallen.
- **Tests.**
  - Nieuw: tests/abonnement-credits.test.mjs.
  - Bijgewerkt: subscribe, stijlvel en eigen-stijl. Die toetsten een oude formulering; de belofte is dezelfde gebleven.

## Besluiten van Lucas, 23 september 2026 (avond)

- **Merk op 290 credits** (was 270). Merk kost nu €5,83 per credit, elf procent minder dan Studio.
- **Video in het abonnement:** ja, zolang de stijl bestaat. Motion en lifestyle-video staan in de creditlijst; campagne en video op maat niet.
- **Eigen looks:** pas met credits te bestellen als ze gemaakt zijn.
  - In de brand kit staat een eigen look nu tussen de vaste looks. Een look die nog in de maak is, staat er wel bij maar is niet te kiezen.
  - Opslaan lukt alleen voor een actieve look van deze klant (customer_styles.status = 'active').
  - De bestelling uit een abonnementsweek draagt de naam van de eigen look mee, net als een losse bestelling.
  - Tests: sectie 5 van tests/abonnement-credits.test.mjs.
