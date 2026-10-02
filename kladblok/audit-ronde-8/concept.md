# Concept-audit visuails.com — 1 oktober 2026

**Doel van Lucas:** "heel overzichtelijk het idee achter VISUAILS bij de bezoeker krijgen", compacter en duidelijker. Daarnaast: *Catalog + Lifestyle* (dienst-id `complete`, wire-waarde `drop`) wordt niet meer verkocht.

**Werkwijze:** alleen gelezen, niets gewijzigd. Bron: `src/` plus de gebouwde site in `dist/` (build van 1 okt 19:19, ná de laatste wijziging aan `Voorpagina.astro`). De zichtbare tekst heb ik per pagina uit `dist/nl/**/index.html` gehaald, zonder menu en footer. Steekproef EN: `dist/index.html`, `dist/pricing/`, `dist/how-it-works/`. Die lopen een-op-een gelijk met NL, dus alles hieronder geldt voor beide talen tenzij anders vermeld.

---

## 0. De kern in één alinea (mijn mening)

De basis is sterk. De prijzen van catalog en lifestyle kloppen overal, de toon is eerlijk (AI wordt benoemd, de Zalando-kanttekening staat erbij, er zijn geen nepkortingen), en de proef van €1 is een goede drempelverlager. Het probleem is **niet dat er iets fout is, maar dat het idee verdrinkt**. 37 publieke pagina's, ongeveer 47.000 woorden NL-bodytekst. Het concept (*3 telefoonfoto's erin → 4 catalogbeelden of 3 lifestylebeelden eruit, vanaf €89/€109, meestal binnen een paar dagen, 1 revisieronde, eerst proberen voor €1*) wordt op zo'n tien plekken op tien manieren uitgelegd. Tussendoor staan pagina's over interne mechaniek: capaciteitsregels, hashes, IPTC, agendavensters, "schrijfacties". Daarbovenop sturen drie restanten de bezoeker de verkeerde kant op:
1. **€149** (de oude Catalog + Lifestyle-prijs) staat nog in de Google-snippets van de homepage, prijzen en FAQ;
2. **video** heet op de ene plek "op elk product in de bestelling", en op de andere "in aanbouw / op aanvraag";
3. er staan **placeholders** ("Foto volgt", 6 van de 7 galerijleveringen tonen dezelfde jeans) precies waar een twijfelaar bewijs zoekt.

Mijn advies: maak één vaste *conceptblok* (3 stappen + wat je krijgt per dienst + levertijd + prijs + garantie) en hergebruik dat overal. Snoei de rest of verplaats het naar FAQ en voorwaarden.

---

## 1. Catalog + Lifestyle (`complete`) — volledige inventaris

### 1A. Zichtbaar voor bezoekers (weghalen)

| # | Waar | Wat de bezoeker ziet | Actie |
|---|---|---|---|
| 1 | `src/data/orderDoors.js:76-83` (DOORS-item `complete`) | Via `ServiceSwitch` de regel **"Ook mogelijk: Lifestyle · Catalog + Lifestyle · …"** op /catalog (`CatalogPage.astro:448`), /lifestyle (`LifestylePage.astro:388`), alle /catalog/[stijl] (`CatalogStyleDetail.astro:112`) en /lifestyle/[stijl] (`LifestyleStyleDetail.astro:130`). In de build staat het op 18 pagina's (catalog/classic, custom, lifestyle/dunes, flash, glow, phone-made, custom, in NL en EN). Link gaat naar /start/complete | Item uit `DOORS` halen. Veilig: alleen `andereDeuren/door/doorCta/doorHref` lezen DOORS, en `HooksPage.astro:110-111` vraagt alleen 'catalog' op. `current={['complete']}` in `HooksPage.astro:411`, `EditionsPage.astro:435`, `VideoPage.astro:485`, `VideoStyleDetail.astro:139` en `BrandModelPage.astro:528` wordt dan een dode parameter. Onschadelijk, wel opruimen |
| 2 | `src/components/PricingPage.astro:118` (`KIND_IDS`), copy `:342` (NL) / `:218` (EN), besparing `:557-559` | Derde kolom in de prijstabel: **"Catalog + Lifestyle — Allebei op hetzelfde product, één tarief — 7 foto's · €149 / €109 / €85 / €65"** met "−€49 t.o.v. de twee los" | `'complete'` uit `KIND_IDS` en de `.pr-besparing`-span weg. **Let op:** `rungs` leest `LADDER.complete` (`:137`) en de controlelus `:146-157` vergelijkt met `LADDER.complete`. Haal je `LADDER.complete` uit pricing.js, dan valt de build om. Laat hem staan of lees `LADDER.catalog`. `ladderScrollHint` (`:337`) kan weg: twee kolommen passen op mobiel |
| 3 | `PricingPage.astro:351` (`workedBundle: 'met lifestyle erbij'`) en `:588/:594` (`quote('complete', n)`) | "Wat dat wordt: 5 producten €325 … **met lifestyle erbij €545**". Dat is de bundelprijs | Regel weghalen, of eerlijk vervangen door "met lifestyle apart erbij: €…" (catalog + lifestyle los) |
| 4 | Meta-descriptions: `src/pages/index.astro:34-35`, `src/pages/nl/index.astro:26-27`, `src/pages/pricing.astro:22-23`, `src/pages/nl/pricing.astro:18-19`, `src/pages/faq.astro:19-20`, `src/pages/nl/faq.astro:15-16` | **Google toont bij de homepage "€149 per product, €65 vanaf 20"**, terwijl de pagina zelf "vanaf €89" zegt. Ook prijzen en FAQ beginnen in de snippet met €149 | Lezen uit `ladderRate('catalog',1)` / `ladderFloor('catalog')`, of "catalog vanaf €89, lifestyle vanaf €109" |
| 5 | `src/pages/compare.astro:33`, `src/pages/nl/compare.astro:19` (meta) + `ComparePage.astro:122,130,170,178,329,334` | De hele vergelijking shootdag ↔ VISUAILS rekent met **"30 producten, elk met een catalogset en een lifestylecarrousel — €1.950, het laagste tarief voor catalog en lifestyle samen"** | Anker herschrijven, zie de afweging in 1D |
| 6 | `src/data/faq.js:290` (EN `:535`) | "Wat is een bestelling? … een catalogset, een lifestyle-carrousel, **of allebei**." | Tekst aanpassen: "Per bestelling kies je catalog óf lifestyle" |
| 7 | `faq.js:374` (EN `:587`) | "Wat is het verschil…? … **Neem je ze allebei op hetzelfde product, dan krijg je 7 foto's voor één tarief**" | Laatste zin weg |
| 8 | `faq.js:451` (EN `:723`) | "Wat kost het?" **begint met "Catalog en lifestyle samen op één product is €149"**, en pas daarna €89/€109 | Herschrijven: catalog vanaf €89, lifestyle vanaf €109 |
| 9 | `faq.js:455` (EN `:727`) | "Zijn er volumekortingen? … bij 4 producten €149, bij 5 nog €109" | Rekenen met catalog (€89 → €65) |
| 10 | `faq.js:184, :188` (EN `:220, :224`), via `pricingFaqs()` | Alleen in **JSON-LD (FAQPage) op /pricing**, niet zichtbaar: "5 producten met catalog én lifestyle is …", "Eén product met catalog én lifestyle is €149" | Aanpassen. Daarnaast: een FAQPage-schema zonder zichtbare vragen op dezelfde pagina strijdt met de richtlijnen van Google. Toon de vragen zichtbaar of haal het schema weg |
| 11 | `src/data/leveringen.js:31` (`DIENSTEN.complete`), entries `:47` (Wollen jas) en `:51` (Linnen blouse) | Galerij-filterknop **"Catalog + lifestyle"** plus twee kaarten "Catalog + lifestyle · 7 beelden" | De twee entries omzetten naar catalog of lifestyle. `gebruikteDiensten()` (`:54-57`) verbergt de knop dan vanzelf. `GalleryPage.astro:278` en `Levering.astro:45` mogen blijven |
| 12 | `src/components/HowItWorksPage.astro:80-82` + `:229` | "**30 producten worden 210 afgewerkte beelden**": 7 per product, dus de bundel | `PER_PRODUCT_VISUALS = CATALOG_IMAGES` (→ 120), of de zin herschrijven |
| 13 | `src/pages/start/catalog.astro:36`, `src/pages/nl/start/catalog.astro:35` (`<CombiKeuze richting="erbij">`), copy `CombiKeuze.astro:100-137` | In het catalogformulier, stap 2: **"Ook lifestyle erbij? 4 beelden per product wordt 7 … Je gaat naar het gecombineerde formulier"** | Slot weghalen. `pipeline.js:917-935`, `:1667-1672` en `:3075-3078` vangen een ontbrekende balk al op (/start/lifestyle draait al zonder) |
| 14 | `src/pages/start/complete.astro`, `src/pages/nl/start/complete.astro` (+ `OrderFlow.astro:258-262, :276-280, :337, :511`) | Het formulier zelf: "Catalogsets en lifestylecarrousels — 7 beelden … van €149 naar €65". Geen `noindex`, dus het staat in **sitemap.xml** (`dist/sitemap.xml:70, :92`, via `scripts/sitemap-and-404.mjs:100`) en in de paginalijst van **llms.txt** | Zie 1C: noindex of redirect |
| 15 | `src/data/schema.js:326-331` + `:497` (`LADDER_SCOPES`) | JSON-LD op /pricing: Product **"Catalog + Lifestyle"** met Offer €149 | `{slug:'complete'}` uit `LADDER_SCOPES`. Breadcrumb `:833` mag blijven zolang de route bestaat |
| 16 | `scripts/llms-txt.mjs:111` en `:117` | llms.txt: "- complete: €149 per product …" **en "Starter: €390 a month for 5 complete products"**. Dat laatste klopt al niet meer, want abonnementen werken nu met credits | `:111` → alleen catalog/lifestyle. `:117` → `PLAN_CREDITS` ("45 credits a month") |
| 17 | **Klantomgeving:** `src/lib/account.js:9008` en `:9344`, getoond in `src/pages/account/plan.astro:150` | Een abonnee met saldo ziet de knop **"Los bestellen"**, en die gaat naar **/start/complete** | Vóór het weghalen van de route ompunten naar `/start` (of `/start/catalog`) |

### 1B. Onzichtbaar of dood (opruimen, geen impact voor bezoekers)
- `src/components/order/PlanPicker.astro:519` / `:643`: `menu.complete: 'Product, pagina én feed'`. Wordt nergens gerenderd (niet terug te vinden in dist).
- `src/data/budget.js:90`: `BUDGET_MENU` met `complete`. Het bestand wordt nergens geïmporteerd.
- `src/components/StartPage.astro:162`: beeldmap voor `complete`. `src/data/overzichtbeelden.js:63`: `complete: BEIDE`.
- `src/data/pricing.js:320`: `SLOT_KINDS.complete` "Complete bundel". Blijft nodig voor oude abonnementsslots, verder niet tonen.
- `src/components/order/HoldingPage.astro:266, :289` (/start/custom-look): "voor een catalogset, een lifestylescène, **of allebei**". Dit gaat over waar een *eigen look* voor geldt, niet over de bundel. Mag blijven.

### 1C. Laten staan (backend / oude bestellingen)
`LADDER.complete` (`pricing.js:121`), `AMOUNT.complete` (`:1285`), `completeSaving`, `KIND_PUNTEN.complete` (`:592`), `COMPLETE_IMAGES` (`:3138`), `KIND_BEELDEN`, `capacity.js:408/:456/:588` (default `'complete'`), `functions/api/order.js:135` (`ORDER_SERVICES` met `'drop'`), `plans.js:67` (`PLAN_SERVICE`), `services.js:66` (label "Catalog + Lifestyle" voor oude orders in Studio en admin), `interactions.js:1138`, `pipeline.js:2565/2586/2700/7024`, `Levering.astro:45`, `angles.js:83`.

**Wat breekt bij weghalen:**
- **Route verwijderen** zonder voorbereiding:
  1. de knop "Los bestellen" voor abonnees geeft een 404 (`account.js:9344`);
  2. `tests/upload-retry.test.mjs:145` loopt over `/start/complete/`;
  3. bookmarks en Google-index geven een 404 (een 301 in `public/_redirects` lost dat op);
  4. de "Deze bestelling staat al klaar"-hervatting werkt alleen op dezelfde pagina. Een open, onbetaalde `drop`-order is wel te betalen via de link in de mail (order-pay API), maar controleer dat nog even.
- **`LADDER.complete` verwijderen**: dan breekt de prijspagina-build (`PricingPage.astro:137,146-157`), net als `tests/bundel.test.mjs`, `upsells.test.mjs:46-62`, `ratio.test.mjs:109`, `order-api.test.mjs:41`, `hoeken.test.mjs:141`, `slot-inplannen.test.mjs`, `nazicht.test.mjs:195`, de assert-functies in pricing.js (`:2976-3039`, `:3598`, `:3653`) en `admin.js:7952`. **Dus: niet doen.**

**Twee opties voor de route (jouw keuze):**
- **Optie 1, laag risico (mijn voorkeur voor nu):** route laten bestaan, `noindex` zetten en alle links ernaartoe weghalen (punten 1, 13 en 17). Sitemap en llms.txt laten hem dan vanzelf vallen (`sitemap-and-404.mjs:100`). Oude links blijven werken.
- **Optie 2, schoon:** 301 van `/start/complete/` en `/nl/start/complete/` naar `/start/catalog/`, beide pagina's verwijderen, `account.js` ompunten en de test aanpassen. Doe dit pas als je een maand geen verkeer meer op de route ziet.

### 1D. Gevolgen die je bewust moet nemen
- **Prijs voor wie allebei wil:** €89 + €109 = €198 per product (1–4), tegen €149 nu. Bij 20+ is het €39 + €49 = €88 tegen €65. Zeg het in de FAQ eerlijk, bijvoorbeeld: "Allebei? Dat zijn twee bestellingen, elk tegen zijn eigen tarief." Dan voelt niemand zich bij het afrekenen overvallen.
- **Vergelijkingspagina:** 30 producten met catalog én lifestyle los kost 30×€39 + 30×€49 = **€2.640**. Dat ligt **boven** de ondergrens van de shootdag (€2.500, `ComparePage`). Het argument wordt zwakker als je gewoon "los" invult. Opties:
  - (a) ankeren op **30 catalogsets = €1.170 (120 beelden)**;
  - (b) ankeren op het **Pro-abonnement (€790/maand)**;
  - (c) twee rijen tonen: catalog €1.170 en lifestyle €1.470.

  Mijn voorkeur is (a). Dat is het instapproduct en de vergelijking blijft overtuigend.

---

## 2. Tegenstrijdigheden tussen pagina's

| # | Onderwerp | Kant A | Kant B |
|---|---|---|---|
| T1 | **Eerste prijs** | Pagina's: "Vanaf €89 per product" (`Voorpagina.astro:210`) | Google-snippets: "€149 per product" (zie 1A-4), FAQ "Wat kost het?" begint met €149 (`faq.js:451`), compare €1.950 met bundeltarief |
| T2 | **Video** | Menu: "Korte clips met beweging, **op elk product in de bestelling**" (`src/i18n/ui.js:385`, ook `orderDoors.js:90`). Home-lede: "Krijg catalog, lifestyle **en video** terug" (`Voorpagina.astro:205`). Home-kaart "Eén clip per product" (`:230`). llms.txt "**video clip: €69 each**" (`scripts/llms-txt.mjs:147`). JSON-LD Offer €69 + "De prijs is hetzelfde, los of toegevoegd" (`schema.js:333-336, :615-616`) | "Op aanvraag" (overal zichtbaar). /start/video: "**In aanbouw** — Video heeft nog geen bestelformulier" (`HoldingPage.astro:251`). Toch staat op /video "**Waarom het cliptarief niet daalt**" (`VideoPage.astro:320`) en op /prijzen "Binnen een bestelling hetzelfde tarief als los" (`PricingPage.astro:394`), over een tarief dat nergens staat. Abonnees: "Motion-clip 5 credits" |
| T3 | **Hooks** | "Op aanvraag … er is nog geen bestelknop" (/hooks hero) | "Met een abonnement kost een hook 10 credits" (`PlansPage.astro:278`, `faq.js:1184`) en Hook staat in de creditcalculator op /plans |
| T4 | **Hoeveel foto's stuur je?** | "**Drie** telefoonfoto's zijn genoeg" (`Voorpagina.astro:216`), "Verplicht zijn de voorkant, de achterkant en één close-up" (`UploadGuidelinesPage.astro:99`) | "de **vier** gevraagde foto's per product" (`faq.js:330`). Upload-pagina "De set die we aanraden": 4 blokken met daarin voor + achter = **5** foto's. Galerij: "**5** telefoonfoto's op de magazijnvloer" (`Levering.astro:90`). How-it-works mock "Ingestuurd 3 van 5" |
| T5 | **Beeldverhouding** | "in de **ene** beeldverhouding die je kiest" (`faq.js:441`, `:1021`), "één per catalogbestelling" (`HowItWorksPage.astro:226`), bestelformulier "beeldvorm (standaard 1:1)" | Galerij-levering: "1:1 · je webshop / 4:5 · je advertentie / 9:16 · je reel", "Hetzelfde product in **drie vormen**" (`src/data/voorbeeldset.js:48-56`). Home stap 4: "Vierkant, staand **en** verticaal: voor je shop, advertenties en reels" (`Voorpagina.astro:238`). Een bezoeker leest daaruit dat hij alle drie krijgt |
| T6 | **Abonnement "vanaf"** | /start: "**vanaf €272** per maand" (`StartPage.astro:117`, blok `:580`) | Home-menu en prijzen noemen eerst "drie vaste abonnementen **vanaf €390**" (`PricingPage.astro:679`). /plans noemt allebei |
| T7 | **Levertijd** | "Zo snel mogelijk (**vaak binnen een dag**, soms een paar dagen)" (`pricing.js:2386`, ~15× op 10 pagina's) | Voorrang: "**20%** van de bestelling, €49–€249 … geleverd uiterlijk de volgende werkdag" (`PricingPage.astro:404` e.v.). Als het vaak al binnen een dag is, waarom zou je dan 20% betalen? Home en hero-chips zeggen alleen "Zo snel mogelijk", zonder getal (`Voorpagina.astro:211`, `HeroFacts.astro:65`) |
| T8 | **Editions levertijd** | Hero-chip "**Zo snel mogelijk** geschatte levering" (`EditionsPage.astro:436` → default van `HeroFacts.astro:65`) | Editions is een maandset die nog niet bestaat ("Binnenkort") |
| T9 | **Volle agenda** | "Zit de agenda vol, dan krijg je het **eerstvolgende vrije venster**" (`StudioPage.astro:177`) | Op dezelfde pagina: "Past er binnen de horizon niets? Dan krijg je **geen datum**" (`FigGate.astro:124`) |
| T10 | **Aantal catalogbeelden** | /catalog-hero: "**4** foto's per product" (`CatalogPage.astro:281`), FAQ "Bij elk aantal is een set vier foto's" | Elders "**vanaf** 4 foto's" (prijs, start, plans). Kies er één: "4 foto's, extra hoeken mogelijk" |
| T11 | **Abonnementen in llms.txt** | "€390 a month for 5 complete products" (`llms-txt.mjs:117`) | Site: 45 credits per maand |
| T12 | **Naam van de klantomgeving** | "privélink", "bestelpagina" (`Voorpagina.astro:273`, `faq.js:441`), "portaal" | "VISUAILS Studio" (`ui.js:402`), "dashboard" (start/plan), "account". Zes namen voor één ding |
| T13 | **Het woord "Studio"** | `/studio` = "De planning en de capaciteit" (`ui.js:401`) | `/portal` = "VISUAILS Studio" (`ui.js:402`). "De studio" = het bedrijf (footer). Gidsen: "vóór je **shoot**" (`GuidesPage.astro:33`) terwijl het hele concept "zonder shoot" is |
| T14 | **Lifestyle-assortiment** | /lifestyle "Het assortiment, in beweging" toont ook "**Campaign**" (`LifestylePage.astro:89`), en dat is een videostijl | Galerijfilter "Campagne" en "**Beam**" (`GalleryPage.astro:197-200`): Beam bestaat nergens anders als stijl |
| T15 | **Maandset (20 gratis beelden)** | /plans en /editions: "Binnenkort" | llms.txt: "included with every plan" (tegenwoordige tijd) |

*Geen tegenstrijdigheid gevonden* bij: revisie (overal "1 revisieronde, binnen 7 dagen", `pricing.js:2111`), resolutie (2048 px, 4096 px alleen lifestyle €9), bestandsformaten (JPG/PNG/WebP, marktplaats afwijkend), bewaartermijn (90 dagen), merkmodel €450 en "inbegrepen bij Merk / Pro 12 mnd", en de catalog- en lifestyletarieven.

---

## 3. Jargon en interne woorden (wat een klant niet begrijpt)

| Woord | Waar (voorbeeld) | Voorstel |
|---|---|---|
| venster, horizon, studiodag, "open studiodagen achter elkaar" | /studio (`StudioPage.astro:140-143`, `FigGate.astro:124`), FAQ levering | "leverdatum", en verder niets uitleggen |
| doorlooptijd, "normale doorlooptijd", "standaard levertijd, geen vaste opleverdatum" | catalog, lifestyle, FAQ, pricing | "Meestal binnen 1–3 werkdagen. Vanaf 10 producten spreek je een vaste datum af." |
| staffel, trede, ladder | prijzen "niet in de staffel", hooks "geen staffel", 404 "waar de staffel zakt" | "prijs per aantal" |
| Tevredenheidscheck | 12× op 6 pagina's (`pricing.js:2111`) | "1 gratis correctieronde" |
| setje / "Compleet setje" | `PricingPage.astro:404`, catalogformulier "Uitleg: complete setjes" (`OrderFlow.astro:1335-1338`) | "Outfit (meerdere stukken samen)". Botst bovendien met "Complete bundel" |
| IPTC-herkomsttag, DigitalSourceType, machineleesbaar | `PortalPage.astro:180`, catalogformulier (Google Shopping-uitleg) | "Er zit een AI-label in het bestand" |
| 256 willekeurige bits, hash, endpoint, snelheidsbegrensd | `PortalPage.astro:191-193` | Hele blok weg; één zin: "De link is privé en verloopt na 90 dagen" |
| "Eén schrijfactie", "Eén tabel, elke order", "Studiokant" | `FigBoard.astro:106`, `StudioPage.astro:150` | Hoort niet op een klantpagina |
| VIES, btw verlegd | btw-uitleg op 7 pagina's | Prima in een tooltip, niet in de bodytekst |
| hexcode, Hexwaarde, #FFFFFF, #F7F5F1 | formulieren, /catalog | "Wit / gebroken wit / beige / eigen kleur" en de codes weglaten |
| merkkit ("Uit je merkkit") | formulieren | "Je opgeslagen voorkeuren" |
| packshot, packviews, on-model, flat-lay, fournituren, grade | formulier, FAQ, per-product | "foto op wit", "op een model", "plat neergelegd", "sluitingen" |
| credits, Motion-clip, Lifestyleclip, Hook | /plans | Eén regel uitleg bovenaan: "1 catalogset = 4 credits" staat er al. Laat Hook/Lifestyleclip weg zolang ze niet te bestellen zijn |
| "Uniciteitscontrole via gezichtszoekmachines" | `BrandModelPage.astro:118` | "We checken dat het gezicht niet op een bestaand persoon lijkt" |
| Engelse termen in NL: Catalog, Lifestyle, Phone-made, Campaign, "carousels" | /plans "9 carousels" (`PlansPage.astro:218`) tegenover "lifestylecarrousels" | Kies "carrousel" en houd dat consequent aan |

---

## 4. Per pagina

Per pagina: **(a)** taak, **(b)** overbodig of herhaald, **(c)** tegenstrijdig, **(d)** jargon, **(e)** voorstel.

### Home (`Voorpagina.astro`, ~630 woorden body)
- (a) In 10 seconden: wat is het, voor wie, wat kost het, wat is de volgende stap.
- (b) "Wat we maken" staat er twee keer: de dia-wissel "Catalog vanaf €89 / Lifestyle vanaf €109 / Video op aanvraag" (`:225-231`) en de kaarten "Wat we maken. Drie soorten beeld" (`:243-247`). De €1-CTA staat er 4×. "Kies een look" (11 kaarten, waarvan 4 "Binnenkort") en "Editions. Binnenkort" vragen aandacht voor wat niet te koop is.
- (c) T1 (meta €149), T2 (video "terug"), T5 ("Vierkant, staand en verticaal"), T7 ("Zo snel mogelijk" zonder getal).
- (d) "vanaf 10: een vaste leverdatum" (`:211`): onduidelijk voor een starter.
- (e) Hero: één primaire CTA ("Probeer met 1 product — €1") en één secundaire ("Bekijk prijzen"). Nu zijn het er drie, waaronder "Sluit een abonnement af" (`:206-207`). Daarna **één blok "Zo werkt het"**: 3 stappen met tijd. Daarna één blok "Wat je krijgt", met per dienst een echt voor/na, de beelden, prijs en levertijd. De dubbele dienstkaarten weg. "Kies een look": alleen de 5 bestelbare looks. "Editions binnenkort" eruit. "Direct antwoord" → "Wat als ze niet goed zijn?" moet het antwoord geven ("1 gratis correctieronde; is het onze fout, dan maken we het kosteloos goed") en niet linken naar "Bekijk de bestelpagina" → /portal (`:273`).

### /start (`StartPage.astro`)
- (a) Kiezen wat je bestelt.
- (b) Zes deuren, waarvan vier "op aanvraag" (Productvideo, Lifestyle-video `:492`, Foto's op maat `:523`, Video op maat `:538`). Er staat een 5-stappenlijst in, en het merkmodelblok herhaalt /custom-models.
- (c) T6 (abonnement vanaf €272).
- (e) Twee grote deuren (Catalog, Lifestyle), één regel "Video of iets op maat? Vraag het aan" en één regel "Liever maandelijks? Abonnement". Het filter "Alle diensten 6 / Productfoto's 2 / …" kan dan weg.

### /catalog (`CatalogPage.astro`)
- (a) Overtuigen dat de catalogset klopt en naar het kiezen van een look leiden.
- (b) De prijs staat 4× in vrijwel dezelfde zin (hero, "Wat een catalogset kost", FAQ "Wat kost een catalogset?", slot-CTA). De levertijdzin staat er 2×. "Elke visual wordt door ons gemaakt en zorgvuldig gecontroleerd" komt site-breed 18× voor op 12 pagina's.
- (c) T10; "Ook mogelijk: Catalog + Lifestyle" (1A-1).
- (e) Prima opbouw (hero → voor/na → look → prijs → FAQ). Schrappen: de dubbele prijszin en de FAQ-vragen die al in de body staan. **Neem /per-product op in deze pagina**, onder "Wat zit erin, wat kun je erbij nemen".

### /lifestyle (`LifestylePage.astro`)
- (a) Idem voor lifestyle.
- (b) Prijs 4×. "Eén product. Drie foto's. Een carrousel." herhaalt de hero.
- (c) T14 ("Campaign" in het lifestyle-assortiment). Dunes toont "**Foto volgt** 03 · Close-up".
- (e) De placeholder weg (liever 2 echte beelden dan 3 met een gat) en "Campaign" uit de rij.

### /video (`VideoPage.astro`)
- (a) Video uitleggen en een aanvraag ophalen.
- (b) "Op aanvraag" staat er 6× in. Alle drie de stijlen tonen "**Foto volgt**". Er is ook een "In de maak"-rij met 3 stijlen.
- (c) T2: de uitleg waarom het cliptarief niet daalt gaat over een tarief dat er niet is (`:320`).
- (e) Eerlijk en kort: "Video is nieuw. We maken het op aanvraag: stuur je product, je krijgt binnen 24 uur een prijs." Eén echte clip tonen, of de pagina uit het menu halen tot er een is. Blok "Twee manieren om video te kopen" + "Waarom het cliptarief niet daalt" weg.

### /pricing (`PricingPage.astro`)
- (a) In één oogopslag: wat kost mijn aantal.
- (b) "Geen pakketten / Geen kortingen" staat er 2×. "De kleinere posten" heeft 7 regels, waarvan Hooks en Editions niet bestelbaar zijn.
- (c) T1, T2 ("Binnen een bestelling hetzelfde tarief als los" bij een prijs op aanvraag), T6, T7 (voorrang).
- (d) staffel, "Compleet setje".
- (e) Twee kolommen (catalog, lifestyle), "Wat dat wordt" alleen voor de gekozen dienst, extra's maximaal 4 regels (extra hoek, outfit, 4K, voorrang), daarna "Video: op aanvraag" en "Abonnement: vanaf €390 of eigen aantal" als twee zinnen. Hooks en Editions eruit tot ze live zijn.

### /plans (`PlansPage.astro`, ~700 woorden)
- (a) Een merk overtuigen van een abonnement.
- (b) Het voordeel staat er 3× ("30–40% goedkoper" in de lead `:206`, in "Waarom een abonnement" en per kaart "Je bespaart"). Er zijn twee calculators ("Stel je eigen samen" en "Tel wat je nodig hebt"). "En wat eraan komt" (`:275`) met maandset, Hooks en Editions.
- (c) T3, T6, T15.
- (d) credits, doorschuiven, Motion-clip, Lifestyleclip.
- (e) Bovenaan een tabel met 3 kolommen (Starter, Pro, Merk) plus "op maat". Per kolom een *voorbeeldmaand* in gewone taal, bv. Pro = "15 catalogsets + 12 carrousels", in plaats van de "of"-lijst. Eén calculator. Lifestyleclip en Hook alleen tonen als ze echt te bestellen zijn. "En wat eraan komt" weg.

### /how-it-works (`HowItWorksPage.astro`)
- (a) Het proces en wat je krijgt, voor de twijfelaar.
- (b) Overlapt met /portal (goedkeuren), /studio (agenda), /upload-guidelines (foto's) en de home-stappen. "Meer dan AI. Met de hand afgewerkt" herhaalt de controlezin.
- (c) "210 afgewerkte beelden" (1A-12). De 3 stappen hebben wel tijden ("Ongeveer vijf minuten", "Zo snel mogelijk …"); goed.
- (d) Menu-omschrijving "De drie stappen, en de twee waar jij in zit" (`ui.js:397`) is cryptisch.
- (e) **Maak dit de canonieke uitlegpagina** en voeg /portal (kort), /studio (één alinea) en /upload-guidelines (de 3 verplichte foto's) hierin samen. Dat scheelt 3 menu-items.

### /studio (`StudioPage.astro`, ~920 woorden: "De planning en de capaciteit")
- (a) Nu: de interne capaciteitslogica uitleggen. Klantwaarde: "krijg ik mijn datum?"
- (b, d) 14 producten per dag, 3 vrijgehouden, vensters, horizon, adminbord met nep-orders, "schrijfactie". Dat is intern.
- (c) T9.
- (e) **Weghalen uit het menu.** Eén alinea in hoe-het-werkt: "Vanaf 10 producten kies je een leverdatum uit de agenda; die ligt vast zodra je betaalt." De pagina kan desgewenst als noindex blijven bestaan voor wie het wil lezen.

### /portal ("VISUAILS Studio", ~1.320 woorden)
- (a) Laten zien hoe goedkeuren en downloaden gaat.
- (b) Statussen (6 stappen), goedkeuren, de map met formaten, de herkomsttag, beveiliging: allemaal uitvoerig.
- (d) 256 bits, hash, endpoint, IPTC (`:180-193`).
- (e) Inkorten tot één screenshot met 3 bullets (goedkeuren per beeld, 1 correctieronde, alles als zip in JPG/PNG/WebP) en opnemen in /how-it-works. Kies één naam voor de klantomgeving (T12).

### /per-product (~220 woorden)
- (a) Wat zit er in een catalogset en welke extra hoeken zijn er.
- (b) Alleen gelinkt vanuit `AnglePicker.astro:140`. De kop "Per product, wat je terugkrijgt" suggereert dat het voor alle diensten geldt, maar het gaat alleen over catalog.
- (e) Samenvoegen met /catalog.

### /gallery (`GalleryPage.astro`, ~1.000 woorden)
- (a) Bewijs.
- (b) Het levering-voorbeeld staat er **7×**. 6 daarvan tonen "Beelden volgen" met **dezelfde jeans**, ook bij lifestyle (Overshirt: "Lifestylecarrousel · Beelden 4 · Voorkant/Achterkant", `leveringen.js:46-51`).
- (c) T5, T14, filter "Catalog + lifestyle".
- (e) Toon alleen echte leveringen (nu dus 1). Zet de fotobibliotheek bovenaan. Haal "Beam" weg of leg het uit.

### /models en /custom-models
- (a) Gezichten inbegrepen; de upgrade naar een eigen merkmodel.
- (b) /models is kort en goed. /custom-models herhaalt "Eén keer betalen / exclusief / permanent" 3× in de hero-chips ("Eén keer en daarna nooit meer"). "Negen vertrekpunten" met letters E/S/Q… is decoratief.
- (d) "Uniciteitscontrole via gezichtszoekmachines". De H1 "Eigen gezichten." is meervoud, terwijl het product één gezicht is (`BrandModelPage.astro:332`).
- (e) De twee pagina's samenvoegen tot "Modellen" met een sectie "Je eigen merkmodel — €450 eenmalig". De stappen 01–05 terugbrengen tot 3.

### /editions en /hooks
- (a) Niet bestelbare producten aankondigen.
- (b) ~700 en ~630 woorden, elk met FAQ. In /faq zijn 16 van de 70 vragen van Hooks (7) en Editions (9) (`faq.js:786`). Dat is 23% van de FAQ voor iets dat je niet kunt kopen.
- (c) T3, T8, T15. Editions toont "Foto volgt", Hooks "Video volgt".
- (e) Uit het menu en de footer. Eén pagina "Binnenkort" met per item 3 zinnen en een aanmelding voor de Studiobrief. FAQ-groepen Hooks en Editions eruit.

### /faq (`FaqPage.astro` + `faq.js`, ~4.750 woorden)
- (a) Bezwaren beantwoorden.
- (b) Catalog-, lifestyle- en video-FAQ's zijn letterlijk dezelfde als op de dienstpagina's. "Is dit AI, en moet ik dat vermelden?" staat er 2× bijna identiek (catalog én lifestyle). De levertijdvraag staat er 3×.
- (c) 1A-6 t/m 9, T4.
- (e) Maximaal ~20 vragen in 5 groepen: Hoe werkt het · Prijs & betaling · Levering · Kwaliteit & correcties · Rechten & AI. De dienst-FAQ's alleen op de dienstpagina's.

### /compare (`ComparePage.astro`)
- (a) Shootdag tegen VISUAILS, voor de 58-jarige twijfelaar het sterkste stuk.
- (b) "En als je een self-serve tool overweegt" overlapt met FAQ "Waarom niet zelf met een AI-tool?" (`faq.js:361`).
- (c) Het bundelanker (1A-5, 1D).
- (e) Ankeren op 30 catalogsets en de AI-toolsectie houden. Goed is "Waar een shootdag nog steeds wint"; dat bouwt vertrouwen op.

### /about
- (a) Wie zit erachter.
- (e) Kort en goed. Meer is niet nodig: een **foto van Lucas** en één regel "Je appt met mij". Dit is het sterkste vertrouwensanker voor de oudere winkelier, dus link het vanaf de home hoger dan alleen de footer.

### /contact
- (a) Contact.
- (e) Goed. "Meestal antwoord binnen het uur" staat er 3× (`b_contact`). 1× is genoeg.

### /guides
- (a) Hub.
- (b) Vier van de vijf "gidsen" zijn links naar bestaande pagina's (hoe-het-werkt, compare, pricing, faq).
- (c) H1 "vóór je **shoot**" (`GuidesPage.astro:33`).
- (e) Weghalen. De fotogids (pdf) linken vanuit upload/hoe-het-werkt.

### /upload-guidelines
- (a) Goede foto's krijgen.
- (c) T4 (3 verplicht, 5 aanbevolen).
- (e) Bovenaan groot: "**3 foto's verplicht**: voorkant, achterkant, één close-up. Optioneel: een draagfoto." De wel/niet-lijsten zijn prima.

### /test-sample (€1, ~2.400 woorden incl. formulier)
- (a) Zo makkelijk mogelijk één product laten proberen.
- (b) Het formulier bevat alle uitleg van het volle bestelformulier (modelbibliotheek, uitleg per foto, achtergrond-hex, "Over het product").
- (d) fournituren, Hexwaarde, merkkit.
- (e) Kies de looks en achtergrond standaard voor, verberg de modelkeuze ("wij kiezen") en klap de uitleg per foto in. Doel: in 2 minuten klaar op mobiel.

### Bestelformulieren /start/catalog en /start/lifestyle (`OrderFlow.astro`, ~4.200 en ~3.400 woorden)
- (b) In stap 1 staan de marktplaatseisen voor Amazon, bol en Zalando volledig uitgeschreven, plus Google Shopping DigitalSourceType. Ook "Uitleg: complete setjes … kan in deze bestelling niet" (`OrderFlow.astro:1338`) bij catalog: het vertelt wat níet kan.
- (e) Marktplaatsuitleg pas tonen als iemand die marktplaats aanvinkt. De outfit-uitleg op /start/catalog weghalen. Combi-upsell weg (1A-13).

### /thank-you
- (b) De abonnementsupsell zegt twee keer "Het Pro-abonnement geeft 120 credits per maand voor €790…" (dubbele zin in de build). Controleer of dat een verborgen variant is of echt dubbel getoond wordt.

### 404
- (d) "waar de staffel zakt" → "prijs per aantal".

---

## 5. Wat een nieuwe bezoeker mist

1. **Eén vaste "Zo werkt het in 3 stappen" bovenaan de home, met tijden.** Nu staan er 4 stappen zonder tijden (`Voorpagina.astro:235-239`). Voorstel:
   1. *Stuur 3 telefoonfoto's per product (5 min).*
   2. *Wij maken je beelden; een specialist controleert elk beeld (meestal binnen 1–3 werkdagen).*
   3. *Jij keurt goed of vraagt een gratis correctie, en downloadt alles.*
2. **Een concrete levertijd in getallen**, op de home en de dienstpagina's. Het "vaak binnen een dag" uit `pricing.js:2386` is sterk; zet het in de hero in plaats van "Zo snel mogelijk".
3. **Echte voorbeelden per dienst.** Nu: video 3× "Foto volgt", Dunes-close-up "Foto volgt", 6 van 7 galerijleveringen placeholder, Editions en Hooks placeholder. Per dienst één echt voor/na is overtuigender dan tien gaten. Wat nog niet bestaat, verbergen.
4. **"Wat je krijgt per dienst" in één tabel:** Catalog = 4 beelden (voor, achter, detail, op model), 2048 px, 1 beeldverhouding, JPG/PNG/WebP · Lifestyle = 3 beelden in één look · Video = 8 s, 9:16, op aanvraag. Nu is dat verspreid over 6 pagina's.
5. **Sociale bewijskracht.** `TESTIMONIALS = []` (`src/data/testimonials.js:43`); er staan geen klantnamen, logo's of reviews op de site. Voor de oudere winkelier en de marketeer is dat het grootste gat. Niet verzinnen: vraag de eerste €1-proefklanten om één zin en toestemming voor hun naam.
6. **Een direct antwoord op "Wat als het niet goed is?"** op de home, in plaats van een link naar /portal.
7. **Voor bureaus:** alleen één FAQ-antwoord (`faq.js:333`). Een kort blok mist (bijvoorbeeld op /contact of in de FAQ): per bestelling een ander merk en een andere factuur, één account, en dat de €1-proef per betalende rekening telt. Is white-label levering mogelijk, zeg dat dan.
8. **Een voorbeeldmaand per abonnement** in gewone taal (zie /plans).

---

## 6. Per persona

- **Starter, 24, mobiel, ongeduldig.** Ziet in de hero 3 knoppen en 4 feiten. "vanaf 10: een vaste leverdatum" zegt haar niets. Het €1-formulier is lang en het catalogformulier bevat ~4.200 woorden. **Fix:** één knop "Probeer met 1 product — €1", een kort €1-formulier met standaardkeuzes, en de levertijd in een getal.
- **Winkelier, 58, desktop, wantrouwt AI.** Botst op jargon (staffel, venster, IPTC, hash), ziet placeholders en "Beelden volgen" precies waar hij bewijs zoekt, en krijgt bij "Ziet een klant dat het AI is?" een AI Act-pagina van ~1.600 woorden. **Fix:** de pagina /about met foto van Lucas en "je appt met mij" hoger op de home, één echt voor/na met de telefoonfoto ernaast (bestaat al op /catalog: "Dit is een telefoonfoto. Dit is wat eruit kwam."), de vergelijking met een shootdag, en de garantie in gewone taal.
- **Marketeer, 31, vergelijkt, wil een abonnement.** Ziet "vanaf €272" én "vanaf €390", Hooks voor 10 credits die "nog geen bestelknop" hebben, Motion-clips in het abonnement terwijl video "in aanbouw" is, en een maandset en Editions die allebei "20 beelden per maand" zijn. **Fix:** de /plans-tabel opschonen, alleen bestelbare diensten tonen, één "vanaf" en een voorbeeldmaand.
- **Bureau, 40.** Vindt het antwoord alleen in de FAQ. Wil weten: per klant factureren, meerdere merken onder één account, levertijd bij 20+ producten. "Meer dan 20 producten — dat plannen we samen" staat diep in het formulier. **Fix:** een kort bureau-blok en een "20+ producten?"-regel op /pricing.

---

## 7. Geprioriteerde actielijst (50)

### MUST — verkeerd beeld of verkeerde prijs, nu oplossen
1. Meta-descriptions met €149/€65 vervangen (`src/pages/index.astro:34-35`, `nl/index.astro:26-27`, `pricing.astro:22-23`, `nl/pricing.astro:18-19`, `faq.astro:19-20`, `nl/faq.astro:15-16`).
2. `complete` uit `DOORS` halen (`orderDoors.js:76-83`). Daarmee verdwijnt "Catalog + Lifestyle" van 18 pagina's.
3. Derde kolom en besparing uit de prijstabel halen (`PricingPage.astro:118, :342/:218, :557-559`). `LADDER.complete` laten staan (`:137`).
4. "met lifestyle erbij €545" weg of als losse som tonen (`PricingPage.astro:351, :588-594`).
5. FAQ-teksten 1A-6 t/m 9 (`faq.js:290, :374, :451, :455` + EN).
6. JSON-LD: Product "Catalog + Lifestyle" weg (`schema.js:497`), video-offer €69 weg of op "op aanvraag" (`schema.js:615-616`), pricingFaqs-schema aanpassen of zichtbaar maken (`faq.js:184, :188`).
7. llms.txt: complete-regel en "complete products" weg, video €69 → "on request" (`scripts/llms-txt.mjs:111, :117, :147`).
8. Combi-upsell uit /start/catalog halen (`src/pages/start/catalog.astro:36`, `nl/…:35`).
9. Klantknop "Los bestellen" ompunten van /start/complete naar /start (`src/lib/account.js:9008, :9344`).
10. /start/complete op noindex (optie 1) of 301 (optie 2). Bij optie 2 ook `tests/upload-retry.test.mjs:145` aanpassen.
11. Compare-anker herschrijven naar 30 catalogsets (`ComparePage.astro:122, :130, :170, :178, :329, :334`, `compare.astro:33`, `nl/compare.astro:19`). Let op het €2.640-effect (1D).
12. "210 afgewerkte beelden" corrigeren (`HowItWorksPage.astro:80-82, :229`).
13. Galerij: de twee `complete`-entries omzetten (`leveringen.js:47, :51`).
14. Video eenduidig maken: menu "op elk product in de bestelling" (`ui.js:385`, `orderDoors.js:90`), home "Krijg … video terug" (`Voorpagina.astro:205`), "Waarom het cliptarief niet daalt" (`VideoPage.astro:320`) en "hetzelfde tarief als los" (`PricingPage.astro:394`) aanpassen aan "op aanvraag".
15. Hooks: "10 credits" weghalen of Hooks echt bestelbaar maken voor abonnees (`PlansPage.astro:278`, `faq.js:1184`, creditcalculator).
16. Beeldverhouding: kies één waarheid. Óf je levert één ratio (dan de galerij `voorbeeldset.js:48-56` en home `Voorpagina.astro:238` aanpassen), óf je levert er drie (dan de FAQ en hoe-het-werkt aanpassen).
17. Aantal aan te leveren foto's eenduidig: "3 verplicht, 1 optioneel" (`faq.js:330`, upload-pagina "aanbevolen set", `Levering.astro:90`).
18. Placeholders verbergen waar een bezoeker bewijs zoekt: 6 galerijleveringen (`leveringen.js:46-51`), video-stijlen, Dunes-close-up.
19. Home "Wat als ze niet goed zijn?" → het echte antwoord geven, niet "Bekijk de bestelpagina" (`Voorpagina.astro:273`).
20. Concrete levertijd (in getallen) in de hero van home, catalog en lifestyle (`Voorpagina.astro:211`, `HeroFacts.astro:65`).

### SHOULD — compacter en duidelijker
21. Eén conceptblok "Zo werkt het in 3 stappen" bovenaan de home; de 4-stappenstrook en de dubbele dienstkaarten weg (`Voorpagina.astro:225-247`).
22. Hero: maximaal 2 CTA's (`Voorpagina.astro:206-207`).
23. Menu "Hoe het werkt" van 5 naar 1 item: /how-it-works wordt de canonieke pagina en neemt /portal, /studio en de upload-kern op (`ui.js:397-404`).
24. /studio uit het menu (en eventueel noindex). De agenda in één alinea uitleggen.
25. /per-product samenvoegen met /catalog.
26. /guides weghalen (dubbele hub, "vóór je shoot").
27. /models + /custom-models samenvoegen.
28. Editions en Hooks uit menu, footer, prijzen, de home "Ook:"-regel en de home-sectie halen. Eén "Binnenkort"-pagina.
29. FAQ terug van 70 naar ~20 vragen. Groepen Hooks en Editions eruit (`faq.js:786`); de dienst-FAQ's alleen op de dienstpagina's.
30. Prijsherhaling per dienstpagina van 4× naar 2× (hero + CTA).
31. Naam van de klantomgeving kiezen (bijvoorbeeld "Mijn VISUAILS") en overal gebruiken (T12). Het woord "Studio" niet ook voor de planningspagina gebruiken (T13).
32. "Tevredenheidscheck" → "1 gratis correctieronde" (`pricing.js:2111`).
33. "staffel/trede" → "prijs per aantal" (prijzen, hooks, 404).
34. "Compleet setje" → "Outfit" (`PricingPage.astro:404`, `OrderFlow.astro:1335-1360`, `faq.js` lifestyle).
35. Abonnement-"vanaf" gelijktrekken (`StartPage.astro:117/:580` tegen `PricingPage.astro:679`).
36. /plans: één calculator, een voorbeeldmaand per plan, "En wat eraan komt" weg (`PlansPage.astro:275`), "carousels" → "carrousels" (`:218`).
37. /start: 2 hoofddeuren plus 2 tekstregels (op aanvraag / abonnement) in plaats van 6 deuren (`StartPage.astro:422-560`).
38. Voorrang: herformuleren als een *garantie* ("vóór 15:00 betaald = morgen 17:00 geleverd, gegarandeerd") zodat het niet botst met "vaak binnen een dag" (T7).
39. Portal-pagina: het beveiligingsblok (`PortalPage.astro:191-193`) en de IPTC-tekst (`:180`) inkorten tot één zin.
40. Catalogformulier: de marktplaatsuitleg alleen tonen na aanvinken. De outfit-uitleg bij catalog weg (`OrderFlow.astro:1338`).
41. €1-formulier inkorten (standaardkeuzes en ingeklapte uitleg).
42. Bureau-blok toevoegen (5 regels).
43. Galerijfilter "Beam" en "Campaign" in de lifestylerij uitleggen of weghalen (`GalleryPage.astro:197-200`, `LifestylePage.astro:89`).
44. Editions-hero-chip "Zo snel mogelijk geschatte levering" weg (`EditionsPage.astro:436`).
45. Studio-pagina, tegenstrijdigheid T9 (`StudioPage.astro:177` tegen `FigGate.astro:124`). Vervalt als de pagina weggaat.

### COULD — afwerking en opruimen
46. Dode copy en data opruimen: `PlanPicker.astro:519/:643`, `budget.js:90`, `StartPage.astro:162`, `overzichtbeelden.js:63`, dode `current={['complete']}`-parameters.
47. "Elke visual wordt door ons gemaakt en zorgvuldig gecontroleerd" van 18× naar 1× per pagina, of alleen in de footer.
48. Brand Model: H1 "Eigen gezichten." → "Je eigen gezicht." (`BrandModelPage.astro:332`); "gezichtszoekmachines" in gewone taal (`:118`).
49. Testimonials vullen zodra er echte, toegestane quotes zijn (`testimonials.js:43`). Niet eerder.
50. /thank-you: controleren of de upsellzin echt dubbel zichtbaar is.

---

## 8. Voorstel voor een compacte structuur (optie, geen dictaat)

**Menu:** Catalog · Lifestyle · Abonnement · Prijzen · Voorbeelden · Hoe het werkt · [Probeer voor €1]
**Onder "Meer" / in de footer:** Video (op aanvraag) · Modellen · Vergelijk met een shootdag · FAQ · Over Lucas · Contact · Binnenkort

**Home in 6 blokken:**
1. Hero: belofte, "vanaf €89 · meestal binnen een paar dagen · eerst proberen voor €1"
2. Zo werkt het in 3 stappen
3. Wat je krijgt: catalog | lifestyle, elk met echt voor/na, aantal beelden, prijs
4. Kies een look (alleen bestelbare looks)
5. Vertrouwen: Lucas + garantie + vergelijking met een shootdag
6. €1-CTA

Daarmee gaan er ongeveer 9 pagina's uit het menu, zakt de FAQ met zo'n 70% en staat het idee in 30 seconden scrollen op het scherm. Dat is waar je om vroeg. Het nadeel: SEO-pagina's als /studio, /guides en /per-product leveren mogelijk wat long-tail verkeer op. Zet ze op noindex in plaats van ze te verwijderen, dan verlies je niets.
