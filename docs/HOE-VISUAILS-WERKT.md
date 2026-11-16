# Hoe VISUAILS werkt

Het naslagwerk van het systeem: per dienst wat het is, wat de klant kiest, wat het kost, wat erbij hoort en wat niet kan. Begonnen op 15 november 2026, op voorstel van Lucas (lijst 110): *"een .md bestand … waarin je per categorie, sectie, service, add-on, settings en nog veel meer details kan uitgebreid en overzichtelijk neerzetten hoe alles precies werkt en dat je dat aanpast per keer wanneer er nieuwe informatie bijkomt."*

**Zo blijft het waar.**
- De bedragen komen uit de code: `src/data/pricing.js`, `src/data/plans.js` en `src/data/opMaatPrijs.js`.
- `tests/op-maat-prijs.test.mjs` controleert dat elke edit op maat hier met zijn bedragen staat, en dat de basisbedragen gelijk zijn aan pricing.js.
- `tests/bedragen.test.mjs` doet hetzelfde voor de vaste prijzen.
- Verandert er iets in het systeem, dan verandert dit bestand in dezelfde levering mee. Onderaan staat wat er wanneer veranderde.

Alle bedragen zijn **exclusief btw**. In Nederland komt er 21% bij. Een zakelijke klant in de EU met een geldig btw-nummer en een klant buiten de EU betalen 0%.

---

## 1 · Overal geldig

| Wat | Hoe |
|---|---|
| **Ronde bedragen** | Elk bedrag is een veelvoud van € 5 (lijst 111, 15 november 2026: "89 euro wordt 90 euro"). Uitzondering: een maand op maat in credits (30 tot 300 credits) is in hele euro's. Op € 5 afgerond zou één credit meer daar soms duurder per credit worden. |
| **Revisie** | Eén revisieronde per bestelling, voor alle beelden, binnen 7 dagen na levering. Altijd inbegrepen, ook bij op maat. |
| **Staffel** | Alleen op catalog en lifestyle: hoe meer producten in één bestelling, hoe lager het tarief per product. Hooks en video zijn per bestelling. |
| **Bestelformulier** | Hoogstens 20 producten per bestelling. Boven de 20 neemt de klant eerst contact op. Vanaf 10 producten krijgt hij een vaste leverdatum. |
| **Merkmodel** | € 450, één keer. Het model komt in zijn modellenlijst en is daarna gratis te gebruiken in al zijn stijlen, op maat en vooraf bepaald, bij catalog, lifestyle, hooks en video. Vaste kenmerken (zoals tatoeages op de handen) komen elke keer terug. Een pose die ze in beeld brengt, rekent als pose. Bij Brand zit een merkmodel in het abonnement, bij Studio alleen met een looptijd van 12 maanden. |
| **Proef** | Eén proefvisual voor € 1. |

## 2 · Catalog

**Wat het is.** Een set van 4 beelden per product: voor, achter, detail en op model.

**Wat het kost.** Per set van 4, volgens de staffel (1 – 4 / 5 – 9 / 10 – 19 / 20+ producten): **€ 90 / 65 / 50 / 40**.

**Extra's.**
- Een extra foto per product (hoogstens 4): € 40 / 35 / 30 / 20, volgens dezelfde staffel.
- 4K (4096 px in plaats van 2048 px): alleen bij lifestyle, € 10 per product.
- Een complete look (een outfit van hoogstens 3 producten): € 50 per look.
- Voorrang: 20% van de bestelling, minimaal € 50 en maximaal € 250. Tot 20 producten of 10 clips. Betaald op een werkdag vóór 15:00, geleverd de volgende werkdag vóór 17:00. Halen we het niet, dan krijgt de klant de toeslag terug.

## 3 · Lifestyle

**Wat het is.** Een carrousel van 4 beelden per product, in een gestileerde wereld.

**Wat het kost.** Per carrousel, volgens de staffel: **€ 110 / 80 / 65 / 50**.

**Formaat.** De klant kiest per bestelling gratis één formaat voor alle foto's, en kan dat per product aanpassen. Een tweede formaat voor dezelfde foto telt als een extra foto, tegen het tarief van de bestelling (dus met de staffel).

## 4 · Hooks

**Wat het is.** Een korte clip voor social, van hoogstens 8 seconden, met het product van de klant.

**Wat het kost.** **€ 120** per hook, plus € 50 voor een extra variant. Geen staffel.

## 5 · Video

**Wat er op de videopagina staat.** Alleen Motion en video op maat (lijst 109, 15 november 2026).
- Lifestylevideo en campagne zijn video op maat geworden. `/video/lifestyle` en `/video/campaign` sturen door naar `/video/custom`.
- De soorten blijven in `videoStyles.js` staan voor lopende bestellingen en /admin. De publieke pagina's lezen `videoOpPagina`.

**Motion.** Het product in beweging, 8 seconden, vooraf bepaald: **€ 100** per clip. Video staat nog op "op aanvraag" (`VIDEO_OP_AANVRAAG`).

## 6 · Abonnementen en credits

| | Starter | Studio | Brand |
|---|---|---|---|
| Per maand | € 390 | € 790 | € 1.690 |
| Credits per maand | 45 | 120 | 290 |
| Sparen tot | 135 | 360 | 870 |
| 12 maanden vooruit (10 betalen, 12 krijgen) | € 3.900 | € 7.900 | € 16.900 |
| Besparing tegenover los catalog bestellen | 29% | 34% | 41% |

- **Credits per dienst:** catalogset 4, lifestylecarrousel 5, Motion-clip 8, lifestyleclip 12, hook 10, extra foto 2, 4K 1, complete look 4.
- **Geldigheid:** credits blijven 3 maanden geldig. Zolang het abonnement loopt, vervalt er niets.
- **Maand op maat:** 30 tot 300 credits. De prijs ligt op dezelfde lijn als de drie plannen, in hele euro's.
- **Bijkopen:** pakketten van 10, 25 en 50 credits, met 0, 5 en 10% korting, naar boven afgerond op € 5. Hoogstens 100 per maand.
- **Vooruitbetalen:** op de prijsplaat staat het bedrag per maand op € 5 afgerond met "gemiddeld" erbij, en het exacte totaal eronder.

## 7 · Op maat

### 7.1 Hoe het loopt

1. **De intake.** De klant vult in VISUAILS Studio de intake van zijn dienst in. Hij kan tussendoor opslaan en later verder. Versturen kost niets.
   - **Alleen aanvinken zegt niets** (lijst 112). Bij elke edit die hij kiest, schrijft hij in een paar woorden wat hij bedoelt; bij catalog in elk geval de stand en het licht. Zonder die zin kan hij niet versturen (`toelichtingNodig()` in `src/lib/opMaat.js`).
   - **Het formaat hoort niet bij de stijl.** Hij kiest het per bestelling, gratis.
2. **De schatting.** Tijdens het invullen loopt de schatting mee (lijst 112): naast de keuzes, op de telefoon als een balk onderaan. Hij ziet één bedrag, met een regel per keuze. Eronder staat dat de definitieve prijs volgt als VISUAILS de stijl heeft uitgedacht (`schatting()` in `src/data/opMaatPrijs.js`).
3. **Het eerste voorbeeld, gratis.**
   - Altijd foto's. Bij video ook om de stijl en de look van de video te laten zien.
   - Altijd in neutrale kleuren en zonder zijn product: het gaat puur om de omgeving en het gevoel.
   - Bij een idee van de klant (hooks en video) kijken we eerst gratis of het kan, en sturen we terug hoe we het aanpakken.
4. **Twee gratis rondes.**
   - Is de eerste versie niet goed, dan heeft hij nog twee kosteloze rondes om bij te sturen.
   - Per ronde vragen we wat hij **wel** goed vindt aan het huidige beeld, wat **anders** moet, en wat **in elk geval moet blijven** (lijst 112). Zo schuift een volgende versie niet weg van wat al goed was.
   - Na de derde versie kijken we wat er nog mogelijk is, en kunnen er kosten bij komen.
   - **In /admin/op-maat** (sinds 15 november 2026; een tab van Klanten, naast Alle klanten en Abonnees): de studio ziet wat de klant invulde, de schatting, zijn referenties en zijn reacties. Per ronde zet ze beelden klaar en stuurt de ronde met één knop naar de klant. De klant ziet de beelden in Studio, zet per beeld goed of aanpassen en vult de drie vragen in. Met "Dit is goed: naar de offerte" geeft hij akkoord.
5. **De offerte en de aanbetaling.** Na zijn akkoord op de stijl volgt de offerte. Hij betaalt **de helft vooraf** en de rest bij levering. Alle bedragen zijn exclusief btw.
   - **De studio mailt de offerte vanuit /admin/op-maat** (sinds 15 november 2026): de regels "naam;bedrag", beginnend met de schatting; het mailadres voor de offerte en de betaallink (standaard dat van het account); het land en het btw-nummer. De btw volgt dezelfde regel als elke bestelling: Nederland 21%, een ander EU-land met een door VIES bevestigd nummer verlegd, buiten de EU geen btw.
   - **De klant kiest in Studio:** **Akkoord** (met het zakelijk-vinkje, bij verlegde btw met de verleggingszin) of **Iets aanpassen** met een zin wat er anders moet. Een aanpassing zet hem terug bij de studio, die een nieuwe offerte mailt.
   - **Bij akkoord** wordt het een gewone bestelling (dienst custom, "Catalog op maat" enz.) voor de helft, en gaat de betaallink vanzelf naar het mailadres van de offerte. In Studio staat ook een betaalknop. Betaalt hij, dan volgen de factuur en de planning zoals bij elke bestelling. **Het restant** vraag je op die bestelling met "Restant vragen"; het bedrag staat er al in.
   - Ging de betaallink bij het akkoord niet weg (geen Mollie- of mailsleutel), dan zegt Nu doen "Op maat: betaallink" en staat in /admin "Betaallink opnieuw mailen".
   - **Nu doen** op het dashboard (en het nachtrapport) zegt wanneer wij aan zet zijn: "Op maat: voorbeeld" (verstuurd of gereageerd), "Op maat: offerte" (de stijl is goed, of de klant vraagt een aanpassing) en "Op maat: betaallink" (akkoord, maar de link ging niet weg). Daarna loopt alles via de bestelling.
6. **Daarna.** De stijl staat vast. Een volgende bestelling in dezelfde stijl betaalt alleen wat per product, per hook of per seconde gaat, niet opnieuw wat eenmalig was. In Studio kan hij een bestelling kopiëren en alleen het product of het formaat aanpassen.

### 7.2 Het systeem achter de bedragen

- Elke aanpassing aan de standaard is een losse edit. Een edit kost tijd: één keer om hem uit te denken (eenmalig) en per product om hem te maken en na te kijken.
- Het voorstel per edit: **minuten × AI-factor × € 60 per uur**, afgerond op € 5. De AI-factor is ×1 als het in één keer goed gaat, ×1,5 bij een paar pogingen en ×2,5 bij veel pogingen en veel nakijkwerk (vaste maten, handen, hetzelfde model, dezelfde hoek in elke foto).
- Lucas heeft elk bedrag nagelopen en waar nodig zelf gezet (lijst 109 en 110). De bedragen hieronder zijn de zijne.
- Om een idee te geven, catalog voor 3 producten: een andere stand op witte grond is ongeveer € 370. Een hele wereld zoals Room 84 is ongeveer € 1.485.

### 7.3 Catalog op maat

Basis: het catalogtarief met de staffel (€ 90 / 65 / 50 / 40 per set van 4). Daarbovenop:

| Edit | Eenmalig | Per product |
|---|---|---|
| `c-pose` Een stand buiten de standaard (eenmalig per stand; per product in die stand, bij elke bestelling) | € 70 | € 10 |
| `c-licht` Eigen licht | € 45 | € 10 |
| `c-camera` Een eigen camerahoek of kader | € 20 | – |
| `c-kleur` Een eigen effen achtergrondkleur | € 10 | – |
| `c-materiaal` Een materiaal of textuur als achtergrond | € 45 | € 10 |
| `c-wereld` Een volledige omgeving (zoals Room 84) | € 450 | € 40 |
| `c-maat` Vaste verhoudingen per foto | – | € 25 |
| `c-grading` Eigen color grading of filter | € 30 | € 5 |
| `c-modelpose` Een vaste pose van het model per productsoort | € 115 | € 25 |
| `c-extra` Een extra foto per product (meer dan de vaste vier) | – | € 25 |

**De stand in 3D (lijst 113, 15 november 2026).** De klant kiest eerst wat hij verkoopt; daarna staan alle producten als 3D-model van stippen op één pagina, per groep (headwear, eyewear, top, bottom, socks, shoes, accessoires). Per groep kiest hij één hoek ("Snel naar een hoek") of "Wij kiezen", en per product kan hij een eigen stand zetten, met een notitie. Alleen de standaardstand (de eerste hoek van een groep) en "Wij kiezen" zijn kosteloos. Elke andere stand kost € 70 eenmalig; dezelfde stand voor een hele groep telt één keer. Daarna € 10 per product in zo'n stand, bij elke bestelling. Licht en schaduw horen niet bij de stand: zonder keuze is dat lichte, natuurlijke schaduw. De modellen zijn eigen werk in `public/js/op-maat-3d.js`; three.js (MIT) staat als `public/js/three.module.min.js` in de site zelf.

Een nieuw merkmodel: € 450, één keer (zie §1).

### 7.4 Lifestyle op maat

Basis: het lifestyletarief met de staffel (€ 110 / 80 / 65 / 50 per carrousel van 4). Daarbovenop:

| Edit | Eenmalig | Per product |
|---|---|---|
| `l-moment` Een eigen moment uitwerken (altijd bij lifestyle op maat) | € 135 | – |
| `l-plek` Een eigen plek | € 90 | € 10 |
| `l-mensen` Een tweede persoon in beeld (hoogstens twee per foto) | – | € 40 |
| `l-pose` Een vaste pose-idee | € 75 | € 20 |
| `l-licht` Bijzonder licht (nacht, tegenlicht, flits) | € 45 | – |

Formaat: hoort niet bij de stijl. Hij kiest het per bestelling, gratis (zie §3). Een merkmodel: zie §1.

**Een moment** moet herinnerd worden en belangrijk zijn. De klant moet zichzelf erin kunnen verplaatsen, en het moet een moment zijn waarvoor je je aankleedt. Plek, licht en pose volgen daaruit.

### 7.5 Hooks op maat

**Het idee.** Twee mogelijkheden:
- **Zijn eigen idee:** goedkoper. Wij kijken gratis of het kan.
- **Wij bedenken het:** duurder. Hij beantwoordt vooraf de vragen in de intake, zodat we achteraf zo min mogelijk hoeven te vragen. De vragen: het doel van de post, de doelgroep, wat de kijker daarna moet doen, het gevoel, de boodschap, de aanleiding, wat de concurrent doet en wat zeker niet mag.

**De stijl** maken we één keer. Daarna kiest hij in het formulier zijn eigen hookstijl met een (ander) product, en wij weten meteen wat erbij hoort.

| Edit | Eenmalig | Per hook |
|---|---|---|
| `h-stijl-eigen` De hookstijl maken, met zijn eigen idee | € 150 | – |
| `h-stijl-ons` De hookstijl maken, wij bedenken het idee | € 300 | – |
| Elke hook in zijn stijl (de basis, `AMOUNT.hooks`) | – | € 120 |
| `h-tekst` Tekst op beeld (bij elke hook opnieuw) | – | € 25 |
| `h-product` Een tweede product in dezelfde hook | – | € 40 |
| `h-persoon` Een persoon in beeld, per persoon (hoogstens twee; zijn merkmodel mag gratis mee) | – | € 40 |
| `h-effect` Een effect (het product ontstaat, verandert, vliegt binnen, de ene stof gaat over in de andere), per effect | – | € 40 |
| `h-eind` Een eindbeeld met logo | – | € 15 |
| Iets anders: een vrij veld. Wij bekijken het gratis en zetten het als losse regel in de offerte. | op offerte | |

**Wat niet kan:**
- Bestellen op volume of met korting: het is één hook per bestelling, zonder staffel.
- Geluid: dat voegt de klant zelf toe.
- Een eigen storyboard: het idee is van hem of van ons.
- Een extra formaat: het formaat (9:16, 4:5 of zijn eigen) kiest hij gratis, per hook.

### 7.6 Video op maat

**Wat het is.** Mooie beelden van het product dat de klant opstuurt, in welke omgeving dan ook. Hij betaalt **€ 20 per seconde**, minimaal 8 seconden (€ 160). Eén shot zit in de basis.

| Edit | Eenmalig | Per shot |
|---|---|---|
| `v-idee-eigen` Zijn eigen idee uitschrijven tot een shotlijst (wij kijken gratis of het kan) | € 45 | – |
| `v-idee-ons` Wij bedenken het idee | € 150 | – |
| `v-shot` Een extra shot (een nieuwe compositie die moet aansluiten) | – | € 50 |
| `v-kleur` Een eigen effen achtergrond en grond | € 10 | – |
| `v-materiaal` Een materiaal of textuur (ook de grond, als die in beeld is) | € 45 | € 10 |
| `v-wereld` Een eigen plek of wereld die in elk shot dezelfde blijft | € 90 | € 10 |
| `v-persoon` Een persoon in beeld, per persoon per shot (hoogstens twee; zijn merkmodel mag gratis mee) | – | € 40 |
| `v-tekst` Tekst in beeld | € 25 | – |
| `v-eind` Een eindbeeld met logo (kan, omdat wij de video toch knippen) | € 15 | – |

**Camera, per shot.** Elk shot krijgt één beweging. De groepen volgen wat Seedance goed of minder goed kan: één rustige beweging lukt meestal, twee tegelijk zelden.

| Groep | Bewegingen | Per shot |
|---|---|---|
| Inbegrepen | stilstaand, push-in, pull-out, pan, tilt | € 0 |
| Gemiddeld | orbit (om het product heen), truck (zijwaarts met diepte), volgen met inzoomen, handheld | € 15 |
| Lastig | crane met onthulling, whip pan, dolly zoom, twee bewegingen tegelijk | € 40 |

**Dezelfde video opnieuw met een ander product** (instellingen gekopieerd): zonder idee-kosten. De seconden, shots en camera betaalt hij opnieuw.

**Zonder prijs:**
- Formaat: gratis, één per bestelling. Een ander formaat is een nieuwe bestelling met gekopieerde instellingen.
- Muziek: voegen wij niet toe.
- Ruwe beelden: gratis op aanvraag, maar zonder kwaliteitsgarantie. Er kunnen fouten en kleurverschillen in zitten die in de geknipte video wel hersteld zijn.

---

## Wat er veranderde

- **15 november 2026:** begonnen.
  - Ronde bedragen (lijst 111).
  - Motion € 100 en 8 credits; op de videopagina alleen Motion en op maat (lijst 109).
  - De bedragen op maat (lijst 109 en 110).
  - De gratis voorbeeldronde en de twee gratis rondes bij het uitdenken van een stijl (lijst 110, notitie).
