# Alle pagina's — de opbouw, getoetst zoals de voorpagina

**23 september 2026.** Blauwdruk om te keuren; er is nog niets van gebouwd.
De tekening staat in `pagina-opbouw.html` (per pagina: nu ↔ voorstel, op
schaal). De metingen komen uit `_opbouw-meting.json` (1440 en 390, gebouwde
site), met `kladblok/_opbouw-meet.mjs` opnieuw te draaien.

---

## De toets, dezelfde als bij de voorpagina

1. **Eén vraag per pagina.** Wat komt de bezoeker hier vragen? Het antwoord
   staat in het eerste scherm, niet in blok vier.
2. **Bewijs vóór uitleg.** Een echt voor-en-na of een echte set komt vóór de
   stappen, de prijzen en de voorwaarden.
3. **Eén plek per feit.** De staffel staat op /pricing, de stappen op
   /how-it-works, "voor wie" op de voorpagina. Een dienstpagina noemt het in
   één regel en linkt.
4. **Geen lege vakken als inhoud.** Een raster van plaatshouders is een
   bouwtekening, geen pagina. Waar nog geen beeld is: één plaatshouder, niet vier.
5. **Hoogstens zes blokken, en een slot met twee knoppen** (niet drie).

## Wat ik overal tegenkwam

| | Wat | Waar | Wat het kost |
|---|---|---|---|
| A | **De staffel staat drie keer als tabel** — /pricing, /catalog, /lifestyle — en de bedragen nog eens op /plans en /start | dienstpagina's | ±1.000 px per dienstpagina. Ze komen uit pricing.js, dus ze lopen niet uit elkaar — maar de lezer leest dezelfde tabel drie keer |
| B | **"Drie stappen naar …" staat op elke dienstpagina**, naast /how-it-works en de band op de voorpagina | catalog, lifestyle, video (en "vier stappen" op hooks) | ±850 px per pagina |
| C | **Het stijlblok is een raster van lege vakken** — "Kies je Catalog-stijl" is 1.710 px met één stijl en vier lege tegels; lifestyle 2.280 px | catalog, lifestyle, video, stijlpagina's | het blok dat de meeste ruimte pakt, zegt het minst |
| D | **Het slot heeft drie knoppen** (Proef · Start · WhatsApp) | bijna overal | drie gelijke keuzes aan het eind = geen keuze |
| E | **"Voor wie" staat twee keer** — de voorpagina (sinds vandaag) en /about (WhoItIsFor) | about | 837 px op /about |
| F | **De proefkaart en de proef-CTA** staan op elke pagina in hero én slot | overal | zie D |

De voorstellen hieronder lossen A–F per pagina op, en maken het samen
korter: van 159.738 px (25 pagina’s op 1440) naar ±108.000 — een derde korter.

---

## Per pagina

Hoogtes op 1440. **Vet** = nieuw of verplaatst.

### Diensten

**/catalog** — *"Wat krijg ik voor mijn product, en hoe ziet het eruit?"*
Nu 8.068 px · 7 blokken. Voorstel ±5.000 px · 6 blokken.
1. Opening — blijft (laptop, feiten, twee knoppen).
2. **Voor-en-na** (nu blok 5) naar voren: "Dit is een telefoonfoto. Dit is wat eruit kwam."
3. **Stijlen als strook** (Stijlstrook van de voorpagina, alleen catalog): Classic + Op maat + wat eraan komt. 1.710 → ±650.
4. **Prijs in één regel**: "Vanaf €89, vanaf 20 producten €39 — de hele staffel staat op Prijzen →". 998 → ±250.
5. Vragen — 4 in plaats van 5.
6. Slot — twee knoppen.
Weg: "Drie stappen naar een strakke catalogus" (staat op /how-it-works).

**/lifestyle** — *"Welke scène past bij mijn merk?"*
Nu 8.626 px. Voorstel ±5.400.
1. Opening — blijft.
2. **"Het assortiment, in beweging"** (echte beelden, nu blok 5) naar voren.
3. **Vier sferen als strook** — per sfeer één echte foto en één zin, door naar de stijlpagina. 2.280 → ±700. De lege tegels (4 per sfeer) weg.
4. "Eén product, drie foto's, een carousel" + **prijs in één regel**. 1.191 → ±500.
5. Vragen. 6. Slot.
Weg: "Drie stappen naar een carousel".

**/video** — *"Kan ik dit krijgen, en hoe vraag ik het aan?"* (op aanvraag)
Nu 7.613 px. Voorstel ±4.300.
1. Opening — met de aanvraagknop als hoofdknop.
2. **Drie soorten als kaarten** (Motion · Lifestyle video · Campagne), elk één "clip volgt"-vlak in plaats van vijf. 2.742 → ±750.
3. "Strakke beweging, klaar om te publiceren" — ingekort, met "Twee manieren om video te kopen".
4. Vragen. 5. Slot.
Weg: "Drie stappen naar een bewegend product".

**/models** — prima zoals hij is (3.973 px). Alleen het slot naar twee knoppen.

**/custom-models** — *"Wat is een merkmodel en wat kost het?"*
Nu 7.374 px. Voorstel ±5.000.
1. Opening — blijft.
2. **"Echt geleverd werk"** (de drie gezichten, nu onderin blok 4) naar voren.
3. "Jouw model, niet een model" + **"Wat het kost"** samen: links wat het is, rechts €450 en wat erin zit.
4. "Hoe een merkmodel tot stand komt" — vijf stappen op één rij.
5. De negen richtingen als **korte rij** (letter + naam), niet als blok van 1.476 px.
6. Slot.
Weg: "De standaardbibliotheek" als eigen blok → één regel met link naar /models.

**/hooks** en **/editions** — niet te bestellen, uit het menu.
Nu 9.232 en 10.438 px, 9 en 10 blokken, veel "foto volgt". Voorstel: **±4.000 elk, 5 blokken** zolang ze niet te bestellen zijn — wat het is · wat erin zit · wat het kost (indicatie) · vragen · slot met aanvragen en de Studiobrief. De rest (formats, de vier stappen, "wat er verandert bij 10 producten", gedeeld betekent gedeeld) komt terug op de dag dat ze live gaan; de tekst blijft in git.

### Hoe het werkt

**/how-it-works** — net herbouwd; kleine ingreep. 5.665 → ±4.800.
"De details die ertoe doen" en "Eén bestelling, overal waar hij heen moet" worden één blok.

**/studio** (de agenda) — *"Hoe komen jullie aan een datum?"*
Nu 7.762 px, 1.046 woorden. Voorstel ±5.000.
1. Opening. 2. De agenda (kamer) — blijft, het hart. 3. **"Reken terug vanaf livegang"** naar voren (het is de rekenhulp). 4. "Eén tabel, elke order" + "De laatste stap is een specialist" samen; de grote lege plaatshouder weg. 5. "Wat dit niet doet" — kort. 6. Slot.

**/compare** — *"Waarom niet gewoon een shootdag?"*
Nu 6.825 px. Voorstel ±4.600.
1. Opening. 2. **De tabel eerst** — de twee grote lege beeldvakken erboven weg. 3. "Wat op één lijn moet komen" + "En de week eromheen" samen. 4. "Waar een shootdag nog steeds wint" — blijft, het is het eerlijkste blok. 5. "Self-serve tool". 6. Slot.

**/per-product** (3.354) en **/upload-guidelines** (5.937) — blijven. Upload: de twee lege voorbeeldvakken bij wel/niet doen worden echte telefoonfoto's uit de voorbeeldset (die bestaan al).

### Prijzen en bestellen

**/pricing** — *"Wat kost het voor mijn aantal producten?"*
Nu 7.716 px. Voorstel ±5.000.
1. Opening. 2. **De tabel direct eronder** (nu blok 3). 3. "Dit is één product" (de laptop, 1.078 px) weg — de voorpagina en /catalog tonen hem al — vervangen door één regel "Eén product = 4 catalogfoto's of 3 lifestylebeelden". 4. "Wat er verder een tarief heeft" in twee kolommen (1.722 → ±900). 5. Abonnementen als **smalle band** met link (715 → ±280). 6. Slot met de proef — "Voordat je een bestelling plaatst" gaat erin op.

**/plans** — *"Wat kost een abonnement en wat zit erin?"*
Nu 6.354 px. Voorstel ±4.600.
1. Opening. 2. **De drie abonnementen** direct (nu blok 4). 3. "Wat een abonnement eigenlijk is" — ingekort. 4. "Elk product krijgt dit" (laptop, 1.129 px) weg. 5. "En wat eraan komt" (#binnenkort) — blijft, het anker voor Hooks/Editions. 6. "Toch liever niet elke maand" + slot.

**/start** — de keuzepagina. 5.700 px, blijft grotendeels.
Hooks- en Editions-kaarten **uit het raster** (zelfde regel als het menu) en als één regel "Ook: Hooks · Editions" onder de kaarten. "Eén ding dat met een bestelling meegaat" (merkmodel, 719 px) → één regel.

**/test-sample** — 4.454 px, blijft. "Hoe de proef werkt" en de kleine lettertjes worden één blok.

### Over, contact, hulp

**/about** — *"Wie zit hierachter?"*
Nu 6.366 px. Voorstel ±3.200, 4 blokken.
1. **Opening = "Ik ben Lucas."** — het blok van vandaag wordt de opening; de hero "Studiobeelden, zonder studio" met de modelfoto vervalt (dat is de voorpagina).
2. "Drie dingen waar we aan vasthouden" — blijft.
3. De fotostrook (1.809 px, 0 woorden) → één rij van drie.
4. Slot.
Weg: "Voor merken met meer producten dan shootdagen" (staat nu op de voorpagina als "Voor wie").

**/contact** — *"Hoe bereik ik jullie het snelst?"*
Nu 3.606 px. Voorstel ±2.200. De opening met de grote modelfoto (904 px) weg; de pagina begint met de twee kolommen (direct contact · bericht), en bij "Direct" staat je naam met de kleine versie van je foto: "Je spreekt Lucas."

**/faq** — 70 vragen, 9.392 px.
Voorstel ±3.000: de categorieën als **tabs bovenaan** (één categorie tegelijk zichtbaar, "Aan de slag" open), en zonder JavaScript gewoon de hele lijst. Geen vraag weg.

**/guides** — 2.849 px, blijft (Studiobrief erbij sinds vandaag).

**/gallery** — vandaag herbouwd ("Zo ziet een levering eruit"). Niets.

### Stijlpagina's (/lifestyle/dunes, /catalog/classic, /video/motion, …)

Nu 5.700–7.400 px met 200–370 woorden: het raster van 1.715 px bestaat
grotendeels uit lege vakken. Voorstel ±4.000: het raster toont **alleen de
beelden die er zijn** (min. 3, anders één rij), "Hoe X voelt" en "Ideaal voor"
worden één blok.

---

## Wat ik níét zou doen

- **Geen nieuwe pagina's.** Alles hierboven is inkorten, verplaatsen en samenvoegen.
- **De juridische pagina's niet aanraken** (/terms, /privacy, /ai-act, …): lang
  is daar de bedoeling.
- **De teksten niet herschrijven waar ze goed zijn.** De kop blijft de kop; wat
  verandert is de volgorde en wat eruit gaat.

## Wat ik van jou nodig heb

**(a)** Akkoord op de toets (vijf regels bovenaan) — dan pas ik hem overal gelijk toe.
**(b)** Per groep: bouwen / niet bouwen / anders (Diensten · Hoe het werkt ·
Prijzen · Over/contact/hulp · Stijlpagina's).
**(c)** Hooks en Editions: inkorten tot ze live zijn, of laten staan zoals ze zijn?
**(d)** /about met jou als opening — ook als de foto er nog niet is (dan staat
er tot die tijd de plaatshouder)?

Mijn volgorde als je ja zegt: /about en /contact (klein, direct effect) →
/pricing en /plans → de drie dienstpagina's → /faq → de rest.
