# VISUAILS — de rustigere opbouw

Planning, 12 september 2026. Geschreven ná het meten, niet ervoor.

---

## 0 · Wat er werkelijk staat

Geteld in de gebouwde site, zichtbare tekst binnen `<main>`, scripts en SVG's eruit.
Alleen de Engelse kant; de Nederlandse is er nog eens net zoveel.

| woorden | secties | pagina |
|--:|--:|---|
| 4.743 | 1 | /terms/ |
| **4.048** | 14 | **/start/complete/** |
| **3.750** | 14 | **/start/catalog/** |
| **3.203** | 14 | **/start/lifestyle/** |
| 2.489 | 9 | /how-it-works/ |
| 2.478 | 1 | /data-processing-agreement/ |
| 2.423 | 15 | /test-sample/ |
| 2.112 | 3 | /faq/ |
| 1.901 | 10 | /editions/ |
| 1.825 | 1 | /privacy/ |
| 1.818 | 11 | /catalog/ |
| 1.788 | 1 | /start/plan/ |
| 1.748 | 11 | /lifestyle/ |
| 1.646 | 1 | /ai-act/ |
| 1.521 | 8 | /hooks/ |
| 1.463 | 9 | /video/ |
| 1.373 | 11 | /studio/ |
| 1.290 | 8 | /portal/ |
| 1.208 | 10 | /custom-models/ |
| 1.157 | 7 | /plans/ |
| 1.001 | 7 | /compare/ |
| 970 | 5 | /start/ |
| 847 | 6 | /pricing/ |
| 767 | 8 | /start/brand-model/ |
| **720** | 11 | **/** |
| 720 | 11 | /proef/ |
| 719 | 2 | /start/custom-look/ |
| 538 | 4 | /upload-guidelines/ |
| 529–505 | 7 | de vier /video/-stijlen |
| 408 | 1 | /cookie-policy/ |
| 401, 393 | 7 | de twee /catalog/-stijlen |
| 349 | 2 | /thank-you/ |
| 341 | 6 | /about/ |
| 337 | 2 | /start/video/ |
| 289–261 | 7 | de vijf /lifestyle/-stijlen |
| 289 | 4 | /per-product/ |
| 251 | 4 | /models/ |
| 206 | 2 | /guides/ |
| 187 | 3 | /contact/ |
| 82 | 3 | /gallery/ |

**56.939 woorden Engels over 48 pagina's.** Met /nl erbij ruim 113.000. Dat is een boek.

Drie dingen springen eruit, en ze zeggen alle drie precies wat je bezoeker zei:

**1 · Het bestelformulier is de langste niet-juridische pagina van de site.**
3.750 woorden op /start/catalog. Dat is vijftien A4'tjes tekst tussen iemand
en een bestelling. Niet "een beetje veel" — het is meer tekst dan /how-it-works,
/pricing en /about bij elkaar. Hier zit het zwaartepunt van het hele probleem.

**2 · De homepage is niet te lang — hij laat te weinig zien.**
720 woorden is prima. Maar over die 720 woorden staan elf secties die allemáál
iets uitleggen en bijna niets tonen. Je bezoeker kon er niet uit halen wat het
concept is, en dat klopt: het concept (jij stuurt een productfoto → wij maken →
jij downloadt) is nergens als *beeld* te zien. Alleen als zin.

**3 · Er staan pagina's die niemand nodig heeft.**
/proef is een letterlijke kopie van de homepage (byte-voor-byte dezelfde
`<main>`), destijds om de stijllaag te vergelijken. Die vergelijking is klaar.
/concept heeft tien losse studiepagina's. /gallery heeft 82 woorden en verder
niets. /compare en /custom-models overlappen met /pricing en /models.

---

## 1 · Eerst het btw-nummer, want dat is het enige met geld eraan

**Je vraag: klopt het dat `NL000` gewoon doorkwam?**

Ja, en fiscaal is er niets misgegaan — maar administratief wel, en dat is niet niks.

Wat er gebeurde, regel voor regel:

- `vatDecision()` in `src/data/vat.js` geeft voor een **Nederlandse** klant
  *altijd* 21%, wat er ook in het btw-veld staat. De binnenlandse verlegging is
  een gesloten lijst en creatieve diensten staan er niet op. **Er is dus geen
  cent misgelopen.**
- VIES wordt voor Nederland bewust niet gebeld — `functions/api/order.js` regel
  971: `if (vatCc && effCountry !== HOME_COUNTRY && vatParts.number)`. Ook goed:
  er valt niets te verleggen, dus er valt niets te controleren.
- **Maar er zit geen enkele vormcontrole op het veld.** Geen `pattern`, geen
  serverkant. `NL000` wordt opgeslagen in `orders.vat_number` én — via
  `upsertCustomer()` — in `customers.vat_number`. Daarmee staat het op zijn
  factuur, en op élke volgende factuur van die klant, tot iemand het handmatig
  weghaalt.

Dus het risico is niet 21%, het is: **een factuur met een verzonnen btw-nummer
erop**, en een klantdossier dat het onthoudt.

**Wat ik ga doen.** Een vormcontrole, geen extra dienst erbij:

- Nederland: `NL` + 9 cijfers + `B` + 2 cijfers. Eén regex, honderd procent
  betrouwbaar, geen netwerkverkeer.
- Andere EU-landen: landprefix die bij het gekozen land hoort + minimaal 2 en
  maximaal 12 tekens. Daarna beslist VIES, zoals nu.
- Buiten de EU: het veld verdwijnt (daar heeft een btw-nummer geen betekenis).
- In het formulier (`pattern` + eigen melding) **en** op de server, want het
  formulier is niet de waarheid.
- Wat er al in de database staat blijft staan; een losse controle in het
  adminscherm laat zien welke klantdossiers een nummer hebben dat de vorm niet
  haalt.

---

## 2 · De fasering

Negen fases. Elke fase eindigt met `npm test` groen en een handmatige ronde
door de browser op 1920 en 390 pixels breed. Ik lever per fase, niet pas aan
het eind.

### Fase 1 — het btw-nummer
Hierboven. Los, klein, eerst, want het raakt facturen.

### Fase 2 — de inventaris en het mes
Per pagina één besluit: blijft / gaat samen / gaat weg. Mijn voorstel, jij
beslist over de vier met een sterretje:

| pagina | voorstel |
|---|---|
| /proef (×2) | **weg** — byte-voor-byte gelijk aan de homepage, zijn doel is geweest |
| /concept/* (×20) | **weg uit de build** — tien ontwerpstudies, geen klantpagina's |
| /compare ★ | **op in /pricing** — 1.001 woorden die naast /pricing staan en hetzelfde vergelijken |
| /custom-models ★ | **op in /models** — 1.208 + 251 woorden over hetzelfde onderwerp, twee ingangen |
| /gallery ★ | **op in de homepage** — 82 woorden, en de nieuwe homepage wordt de galerij |
| /per-product | blijft — is vorige week net gemaakt en doet één ding |
| /how-it-works | **halveren** — 2.489 → ±900, met het beeld dat het uitlegt |
| /test-sample | **halveren** — 2.423 → ±800; dit is een pagina van één euro met vijftien secties |
| /editions | **inkorten** — 1.901 → ±900 |
| /faq | blijft lang, maar **dicht** — alles ingeklapt, alleen de vraag zichtbaar |
| juridische pagina's | **ongemoeid** — die horen lang te zijn |

Sterretje = ik doe het pas als jij ja zegt, want er verdwijnt een URL.
De rest doe ik gewoon.

### Fase 3 — de taal van de secties
De drie afspraken die je noemde, als systeem en niet per pagina verzonnen:

1. **Grote koppen, weinig tekst.** Eén zin onder een kop, nooit drie.
   Alles wat een vierde zin nodig heeft wordt een hover-vraagteken.
2. **Het hover-vraagteken** wordt één component (`Uitleg.astro`) met een echte
   `popover` — werkt met toetsenbord, werkt op telefoon met tikken, en is
   afleesbaar door een schermlezer. Nu staat die uitleg gewoon in de lopende tekst.
3. **Contrast tussen secties.** Precies wat je bezoeker zei bij "One link. Your
   whole order.": als links de uitleg staat en rechts het ding, dan hoort het
   ding een eigen kleur te hebben. Ik maak er een afspraak van: **beeld en
   interface staan op donker, tekst staat op papier.** Dat geldt dan voor de
   dashboardschets, de portaalschets, de stroomdiagrammen en de
   voor/na-beelden — niet willekeurig per sectie.

### Fase 4 — het bestelformulier (richting B)
De grootste van de negen, en de reden dat dit alles begon.

- **Richting B inbouwen**: twee kolommen, links de vragen, rechts een
  meelopend overzicht dat laat zien wat je krijgt en wat het kost. Dat overzicht
  is óók het antwoord op "het lijkt erg duur" — nu zie je pas aan het eind een
  bedrag, zonder dat ernaast staat wat erin zit.
- **Van 3.750 woorden naar onder de 1.000.** Elke uitleg die niet nodig is om
  de vraag te beantwoorden gaat het vraagteken in of eruit.
- **Visueel maken wat je krijgt.** Bij elke keuze een beeld in plaats van een
  beschrijving: welke hoeken, welke achtergrond, welk formaat. Bij het aantal
  een raster van hoeveel beelden dat oplevert.
- Dit doe ik voor alle vijf de formulieren (`catalog`, `lifestyle`, `video`,
  `complete`, `custom-look`) plus `/start/plan` en `/start/brand-model`.

### Fase 5 — de homepage
Apart, en met jouw keuze ertussen. Zie deel 3 hieronder.

### Fase 6 — het portaal en VISUAILS Studio
- **Revisie naast goedkeuren.** Je bezoeker zag alleen "goedkeuren". Ik zet er
  twee knoppen van gelijk gewicht naast elkaar, met eronder in één zin wat er
  daarna gebeurt.
- **Rustiger en consistenter.** Eén knopvorm, één afstandsmaat, één kaartvorm
  voor het hele portaal.
- **Ruimte nameten.** Je noemde knoppen die tegen tekst aan staan. Ik meet dat
  met een script dat de afstand tussen elk paar naburige elementen uitleest en
  alles onder 8 pixels rapporteert — per pagina, in de browser, niet op gevoel.

### Fase 7 — het adminportaal
Zelfde behandeling, en de vraag die je stelde: zijn Astro en /impeccable daar
wel echt toegepast? Ik ga na of `/admin` dezelfde stijllaag draait als de rest
of zijn eigen CSS heeft (er staat een losse `public/admin.css`, wat erop wijst
van niet). Dat verklaart de inconsistente en krappe look meteen.

### Fase 8 — de voor/na-beelden en de guidelines-PDF
De acht beelden uit `BA2 Catalog pink jeans`: vier aangeleverde (front, back,
detail, texture, fit) en vier afgewerkte (front, back, detail, on-model).
Dat is precies het concept in beeld — en dus het materiaal voor zowel de
homepage als de uitleg in de PDF over wat "catalog set" betekent.

### Fase 9 — de controleronde
- Elke knop en elke link op elke pagina, automatisch: een script dat elke
  `href` en elke `form action` naloopt op een 404 of een 500.
- Elke e-mail: bevestiging, factuur, oplevering, herinnering, annulering —
  verstuurd naar een testadres en gelezen, niet alleen "de code ziet er goed uit".
- Elk formulier daadwerkelijk invullen en versturen in de browser.
- De ruimtemeting van fase 6 over de hele site.
- `npm test` volledig.

---

## 3 · De homepage — waar ik jouw keuze nodig heb

Wat er moet gebeuren is duidelijk: de homepage moet **laten zien** wat er nu
alleen staat beschreven. Jij stuurt een productfoto → wij maken → jij downloadt.

Wat ik nog niet weet is in welke vórm, en dat wil je zelf kiezen. Dus:

1. Ik zoek eerst het web af naar prijswinnende sites die voor/na-werk of een
   dienstenoverzicht visueel oplossen — Awwwards, FWA, Site Inspire, en de
   sites van studio's die hetzelfde verkopen als jij.
2. Daarna maak ik **drie of vier echte ontwerpen** met jouw eigen beelden erin,
   geen schetsen — gebouwd, op de echte pagina, zodat je ziet wat je krijgt.
3. Die leg ik naast elkaar en jij kiest.

Randvoorwaarde die ik zelf vasthoud: de editoriale sfeer blijft. Een schuifbalk
met "voor" en "na" is de standaardoplossing van elke AI-tool, en die maakt van
VISUAILS precies wat het niet is.

---

## 4 · Wat dit niet is

Ik ga geen dingen slopen die werken. Alle prijzen blijven uit `pricing.js`,
alle bestaande logo's blijven de bestaande bestanden, en na elke fase draait
de hele testronde. Als iets niet meer werkt is de fase niet af.
