# POSITIONERINGSAUDIT VISUAILS

**Scope:** volledige `dist/` (EN op root, NL onder `/nl/`), 120 HTML-bestanden.
**Uitgesloten:** `/concept/*` (18 pagina's) — die dragen allemaal `<meta name="robots" content="noindex, nofollow">` en staan niet in `sitemap.xml`. Ze zijn interne ontwerpvarianten en tellen niet mee voor een bezoeker.
**Perspectief:** kritische brand strategist / CRO-specialist, beoordeeld op wat een NIEUWE bezoeker daadwerkelijk kan afleiden.
**Datum:** 17 september 2026

---

## 1. DE 10-SECONDEN-TEST

Alleen op basis van `dist/index.html` en `dist/nl/index.html`, zoals een bezoeker ze in tien seconden leest: H1, subkop, de vier hero-facts, de eerste scrollbeweging.

Wat er letterlijk staat boven de vouw:

> **"You upload. We deliver the campaign."** — H1, `dist/index.html`
> **"Jij uploadt. Wij leveren de campagne."** — H1, `dist/nl/index.html`
>
> "Catalog, lifestyle and video from the product photos you already have. No shoot, no minimum — one product is fine."
> "One product is enough, no shoot · From €89 per product · Your own week on the calendar · Full commercial rights included"
>
> CTA's: **"Start an order"** en **"Try VISUAILS · €1"** / **"Start een bestelling"** en **"Probeer VISUAILS · €1"**

**(a) Wat denk je dat VISUAILS verkoopt?**
Afgemaakte productbeelden — catalogfoto's, lifestylebeelden en korte video's — per product afgerekend, gemaakt uit foto's die je al hebt. Dat komt binnen tien seconden aan. De prijs (`€89 per product`), de eenheid (`per product`) en de levering (`Your own week on the calendar`) staan alle drie in de hero. Dat is een dienstenprijslijst, geen softwareprijs.

**(b) Dienst, software/tool, bureau, marktplaats of iets anders?**
**Dienst, met een sterke bureau-inslag.** Bewijs: de hoofdnavigatie heet `What we make` / `Wat we maken`, niet "Product" of "Features". De primaire knop in de header is `Order` / `Bestellen`. Er is geen "Sign up", geen "Free trial", geen "Get started free", geen prijs per maand-per-seat. De footer-claim is `"The visual studio for clothing brands and modern e-commerce — for founders who would rather grow than book another shoot."` Dat is bureau-taal.
Twee afwijkende signalen in dezelfde header: `Log in` / `Inloggen` staat pal naast `Order`, en in het menu onder "How it works" staat een **productnaam**: `VISUAILS Studio` met de omschrijving `"Where your work lands, and how you approve it"`. Dat leest als een app.

**(c) Moet de klant zelf AI gebruiken?**
Nee, en dat is over de hele homepage consistent. Stap 01 is `"Photograph your product the way it lies. Warehouse floor, phone, no tripod."` Stap 02 is `"We build the visuals on your own product."` De klant fotografeert en keurt goed; verder niets.

**(d) Moet de klant zelf prompts schrijven?**
Nee. Het woord "prompt" komt **nul keer** voor op beide homepages. Site-breed komt het 11 keer voor, uitsluitend in de "waarom zou je dit niet zelf doen"-context (`/compare/`, `/custom-models/`, `/terms/`, `/privacy/`).

**(e) Maakt VISUAILS de content vóór de klant, of helpt het de klant content te maken?**
Maakt het vóór de klant. `"Wij bouwen de beelden op jouw eigen product."` / `"We build the visuals on your own product."` en `"Wij leveren de campagne."` Ondubbelzinnig.
**Maar:** in het vierstappenblok `"From your photo to your shop." / "Van jouw foto naar je shop."` zijn drie van de vier stappen van de klant — `01 You / Jij`, `03 Your dashboard / Je dashboard`, `04 Your shop / Je shop` — en maar één van VISUAILS (`02 Us / Wij`). Visueel en ritmisch gaat het over wat de klant doet. Dat is de zwakste plek in een verder sterke pagina.

**(f) Welke rol lijkt AI te spelen?**
Op de homepage: bijna geen zichtbare rol. Het woord "AI" komt op `dist/index.html` precies **drie keer** voor, waarvan één in de footerlink `AI Act`. De twee overige staan in hetzelfde FAQ-blok onderaan: `"Will a customer see it is AI?"` → `"Read the AI Act page"` / `"Ziet een klant dat het AI is?"` → `"Lees de AI Act-pagina"`.
Dus: AI wordt niet als product gepresenteerd, maar ook niet uitgelegd als middel. Het wordt op de homepage alleen als **juridisch bijverschijnsel** aangestipt. Voor een bezoeker die er niet op klikt, blijft AI ongedefinieerd — en een ongedefinieerde AI-vermelding is voor een merk-eigenaar eerder een vraagteken dan een geruststelling.

**(g) Zou je dit een "AI content company" noemen?**
Op basis van de homepage alleen: **nee.** Er staat geen enkele AI-claim, geen "AI-powered", geen "generate", geen modellenlogo's, geen "technology". Wat er staat is prijs, levertijd, rechten en een revisieronde.
Op basis van de hele site: **ja, dat is een verdedigbare lezing** — en op sommige pagina's is het letterlijk wat er staat. Zie sectie 2 en 4.

**(h) Wat is het primaire product dat de klant koopt?**
Een **catalogset van vier beelden per product, vanaf €89**, met de lifestyle-carousel (3 beelden, €109) en de videoclip (€69) eromheen. De homepage zet dit expliciet: `"One product. Up to 7 images and a clip."` / `"Eén product. Tot 7 beelden en een clip."` Dat is zo scherp als het kan. Aftrek: in het menu staan acht "deuren", waarvan er twee (`Hooks On request`, `Editions Soon`) niet te bestellen zijn. Dat vertroebelt wat het hoofdproduct is bij wie het menu opent.

### Oordeel 10-secondentest
De homepage slaagt. Een fashion-oprichter die tien seconden kijkt, leest: *"ze maken mijn productbeelden voor me, per product, ik stuur foto's."* Dat is de gewenste perceptie. De risico's zitten in de woordkeuze (`upload`, `dashboard`, `Log in`) en in het feit dat de homepage het nergens **uitspreekt** — de dienst wordt getoond, niet benoemd.

---

## 2. AI-POSITIONERINGSTEST

### 2.1 Telling per pagina

Geteld over de volledige tekstinhoud (scripts, styles en SVG's verwijderd), `/concept/*` uitgesloten. De footerlink `AI Act` staat op élke pagina, dus **een score van 1 bij "AI" = nul redactionele AI-vermeldingen**.

| Pagina | AI | AI-generated | AI images | prompt | generate/generation | tool(s) | automation | platform/software |
|---|---|---|---|---|---|---|---|---|
| `/index.html` | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `/nl/index.html` | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `/about/` · `/nl/about/` | 1 · 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `/ai-act/` · `/nl/ai-act/` | **11 · 11** | 1 · 0 | 1 · 2 | 0 | 3 · 1 | 0 | 0 · 1 | 0 |
| `/faq/` · `/nl/faq/` | **8 · 8** | 1 · 1 | 0 | 0 | 3 · 2 | **6 · 5** | 0 | 0 |
| `/catalog/` · `/nl/catalog/` | 6 · 6 | 0 | 0 | 0 | 2 · 1 | 0 | 0 | 3 · 4 |
| `/lifestyle/` · `/nl/lifestyle/` | 6 · 6 | 0 | 0 | 0 | 1 · 1 | 0 | 0 | 1 · 0 |
| `/terms/` · `/nl/terms/` | 7 · 7 | 1 · 0 | 0 · 1 | 2 · 1 | 2 · 1 | 1 · 0 | 1 · 1 | 0 |
| `/privacy/` · `/nl/privacy/` | 5 · 5 | 0 | 0 | 1 · 0 | 6 · 3 | 0 | 0 | 7 · 6 |
| `/start/catalog/` · `/start/complete/` | 7 · 7 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| `/compare/` · `/nl/compare/` | 1 · 1 | 0 | 0 | **2 · 2** | 2 · 0 | **6 · 5** | 0 | 0 |
| `/how-it-works/` · `/nl/…` | 2 · 2 | 0 | 0 | 0 | 2 · 2 | 3 · 0 | 3 · 3 | 1 · 0 |
| `/guides/` · `/nl/guides/` | 3 · 3 | 0 | 0 | 0 | 0 | 2 · 2 | 0 | 0 |
| `/editions/` · `/nl/editions/` | 3 · 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `/custom-models/` · `/nl/…` | 1 · 3 | 0 | 0 | **2 · 1** | 3 · 2 | 1 · 1 | 0 | 0 |
| `/portal/` · `/nl/portal/` | 3 · 3 | 0 | 0 | 0 | 2 · 1 | 1 · 0 | 0 | 0 |
| `/studio/` · `/nl/studio/` | 2 · 2 | 0 | 0 | 0 | 0 | 0 | 0 · 1 | 0 |
| `/gallery/`, `/models/`, `/pricing/`, `/per-product/`, `/plans/`, `/hooks/`, `/video/*`, `/contact/`, `/test-sample/`, `/upload-guidelines/` | 1–2 | 0 | 0 | 0 | 0 | 0–1 | 0 | 0–1 |
| **`/llms.txt`** | — zie 2.3 — | | | | | | | |

**Sitetotaal:** "AI" 250×, "prompt" 11×, "generate/generation" 53×, "tool(s)" 37×, "AI-generated" 9×, "AI-powered" **0×**, "artificial intelligence" 4× (alleen juridische pagina's), "machine learning"/"neural" **0×**, "algorithm" 1×.

**Eerste conclusie:** de AI-dichtheid is laag en goed geconcentreerd. 250 lijkt veel, maar ~120 daarvan zijn de footerlink. De redactionele AI-massa zit in zes pagina's: `/ai-act/`, `/faq/`, `/catalog/`, `/lifestyle/`, `/terms/`, `/privacy/`. Van de commerciële hoofdpagina's hebben `/about/`, `/gallery/`, `/models/`, `/pricing/`, `/plans/`, `/per-product/`, `/hooks/`, `/video/` en `/compare/` **nul** redactionele AI-vermeldingen.

### 2.2 Beoordeling per belangrijk gebruik

---

**2.2.1 — `/llms.txt`, regel 3 · 🔴 ERNSTIGSTE VONDST**

> `> An AI visual studio for clothing brands and e-commerce. Brands send phone photos of a product; we deliver catalog images, lifestyle sets, short video and monthly brand imagery.`
> — `dist/llms.txt`

- *Nodig?* De file is nodig, deze zin niet in deze vorm.
- *Is duidelijk dat AI middel is en niet product?* **Nee — hier is AI het eerste woord van de bedrijfsdefinitie.** "An AI visual studio" is een categoriebenaming: het zet VISUAILS in de categorie "AI-bedrijf", niet "studio die AI gebruikt".
- *Kan het de indruk van een tool wekken?* Ja, en erger: dit is precies de zin die ChatGPT, Claude, Perplexity en Google AI Overviews citeren als iemand vraagt "wat is VISUAILS". De site heeft de bots hier expliciet voor binnengelaten (`robots.txt`: `"Deze site verkoopt aan mensen die 'hoe fotografeer ik mijn product met een telefoon' intypen, en dat is steeds vaker een vraag aan een taalmodel"`). Het kanaal is bewust geopend en de boodschap in dat kanaal is de verkeerde.
- *Tegenstrijdigheid:* de mens-gerichte footer op alle 120 pagina's zegt `"The visual studio for clothing brands and modern e-commerce"` — **zonder** "AI". De schema.org `Organization.description` zegt `"Product-visual studio for clothing brands and modern e-commerce"` — **zonder** "AI". Alleen de machineleesbare samenvatting voegt het woord toe. Dat is de enige plek waar de eigen positionering wordt weggegeven, en het is de plek waar niemand het naleest.
- *Beter:* `> A done-for-you product-visual studio for clothing brands and e-commerce. Brands send phone photos of a product; we produce and hand-check catalog images, lifestyle sets, short video and monthly brand imagery. Our production is AI-assisted and every visual is finished and checked by a person before delivery.` — AI blijft eerlijk vermeld, maar als methode in zin drie, niet als categorie in zin één.

---

**2.2.2 — `/terms/` §3 en `/privacy/` §1: de formele zelfdefinitie · 🔴**

> `"VISUAILS is an AI-assisted, human-reviewed product-visuals service based in Enschede, the Netherlands."`
> — `dist/privacy/index.html`, §1 "Who we are"

> `"VISUAILS is een AI-ondersteunde, door mensen gecontroleerde dienst voor productvisuals, gevestigd in Enschede, Nederland."`
> — `dist/nl/privacy/index.html`, §1 "Wie we zijn"

> `"VISUAILS maakt AI-ondersteunde, door mensen gecontroleerde productvisuals — catalogfoto's, lifestyle-scènes en video — op basis van het bronmateriaal dat je aanlevert."`
> — `dist/nl/terms/index.html`, §3 "De dienst"

- *Nodig?* Ja, juridisch. Het formuleringsprobleem is dat dit de enige twee plekken zijn waar de site formeel definieert *wat VISUAILS is*, en op beide plekken is het eerste adjectief "AI-ondersteund". De volgorde is fout: het bijvoeglijk naamwoord voor de dienst is nu het productiemiddel.
- *Is duidelijk dat AI middel is?* Half. `"human-reviewed"` staat er meteen achter, maar dat maakt de mens tot **controleur van machinewerk** — precies het "AI-tool met een menselijk sausje"-beeld dat vermeden moet worden.
- *Kan het beter?* Ja, zonder juridisch verlies: `"VISUAILS is a done-for-you product-visuals studio in Enschede. We produce catalog, lifestyle and video visuals from the material you send. Production is AI-assisted; every visual is finished and checked by a person before delivery."`
- *Trekt het aandacht weg van het klantresultaat?* In §1 van een privacybeleid nauwelijks — maar deze zin wordt overgenomen door aggregators, AI-antwoorden en iedereen die "wat is VISUAILS" opzoekt.

---

**2.2.3 — De homepage-FAQ: twee van de vier vragen gaan over AI · 🟠**

De homepage heeft één objectie-blok, direct boven de slot-CTA, met vier vragen:

> `"What if the visuals are not right?"` → `"See Studio"`
> `"Will a customer see it is AI?"` → `"Read the AI Act page"`
> `"Are my photos good enough?"` → `"What makes a photo usable"`
> `"Why not do it myself?"` → `"The honest comparison"`
> — `dist/index.html`, blok `"Straight answers." / "Direct antwoord."`

- *Nodig?* De vraag zelf is legitiem en eerlijk. Het probleem is het **aandeel**: 25% van de homepage-objectiehandling gaat over AI, en nog eens 25% ("Why not do it myself?") over zelf-doen. De helft van het laatste blok vóór de conversie-CTA gaat dus over de twee frames die je juist níét wilt activeren.
- *Kan het de indruk van een tool wekken?* `"Why not do it myself?"` wel. Die vraag veronderstelt dat "zelf doen" een reële optie is die op VISUAILS lijkt. Bij een fotoshoot zou niemand die vraag stellen; bij een tool wel. De vraag bevestigt het toolframe op het moment dat je het juist wilt breken.
- *In de JSON-LD is de formulering nog explicieter* — dit is wat Google als FAQ-snippet kan tonen: `"Why not just do this myself with an AI tool?"` en `"Are the visuals AI-generated?"` (`dist/index.html`, `application/ld+json`, `FAQPage`). De zichtbare labels zijn verzacht, de gestructureerde data niet. Google toont de gestructureerde data.
- *Beter:* vervang `"Why not do it myself?"` op de homepage door `"How much work is it for me?"` / `"Hoeveel werk is dit voor mij?"` met als antwoord de vergelijking met een shootdag. Het AI-tool-argument hoort thuis op `/compare/`, waar het al staat en waar het goed staat. Laat `"Will a customer see it is AI?"` staan — dat is een echte vraag van een merk-eigenaar — maar zet hem niet als tweede van vier.

---

**2.2.4 — `/faq/` en `/nl/faq/`: de zwaarste AI-concentratie op een commerciële pagina · 🟠**

> `"Are the visuals AI-generated? — Yes, and we say so plainly. Every visual is generated from photographs of your real product and finished by hand before it is delivered — a made image, not a photograph of a shoot that happened."`
> — `dist/faq/index.html`

> `"Why not just do this myself with an AI tool? — For some of it you should. (…) **What you buy here is everything that happens after the image is generated.**"`
> — `dist/faq/index.html`

- *Nodig?* Ja. Dit is de juiste plek voor deze vraag en het antwoord is eerlijk.
- *Sterk:* `"What you buy here is everything that happens after the image is generated"` is een van de drie beste positioneringszinnen op de hele site. Die zin zegt in één keer: AI is middel, het product is wat wij eromheen doen.
- *Probleem:* die zin staat **verstopt in een dichtgeklapte accordeon op pagina zes van de navigatie**, terwijl de homepage geen enkel equivalent heeft. Het beste argument staat op de minst gelezen plek.
- *Aftrek:* `"tool"` komt 6× voor op de EN-FAQ. `"Is een tool genoeg voor wat je nodig hebt, gebruik dan de tool"` (`/nl/faq/`) is intellectueel eerlijk en commercieel duur — het nodigt de lezer uit om een alternatief te overwegen op het moment dat hij bijna klant is.

---

**2.2.5 — `/catalog/` en `/lifestyle/`: `"Is this AI, and do I have to say so?"` · 🟡**

> `"Is this AI, and do I have to say so? — Yes, and we say so plainly: every image is generated from photographs of your real product and finished by hand. The AI provenance sits inside the file, so the disclosure is already there."`
> — `dist/catalog/index.html` én `dist/lifestyle/index.html` (identiek)

- *Nodig?* Ja, maar niet vier keer. Deze exacte alinea staat op vier pagina's (EN+NL × catalog+lifestyle), plus een variant op `/faq/`, plus de hele `/ai-act/`-pagina. Dat is zes plekken voor één boodschap.
- *Is duidelijk dat AI middel is?* Redelijk: `"generated from photographs of your real product and finished by hand"` legt de keten goed uit.
- *Trekt het aandacht weg van het klantresultaat?* Ja — het staat in de FAQ ónder het productaanbod, dus hij komt na de belangrijke informatie. Acceptabel.
- *Kan het beter?* Het antwoord begint met `"Yes"`. Voor een merk-eigenaar die deze vraag stelt uit ongerustheid, is `"Yes"` het slechtst mogelijke eerste woord. Beter: `"Your product is photographed by you; everything around it — the light, the ground, the model — we build. Yes, that build is AI-assisted, and we put the disclosure in the file so you never have to think about it."` Zelfde eerlijkheid, andere volgorde, ander gevoel.

---

**2.2.6 — `/how-it-works/`: `"More than AI. Finished by hand."` · 🟡**

> `"More than AI. Finished by hand. — The images are generated first, and then every one goes through a pair of hands. We finish it in professional editing software and grade the colour to your brand."`
> — `dist/how-it-works/index.html`
> `"Meer dan AI. Met de hand afgewerkt. — De beelden worden eerst gegenereerd, en daarna gaat elk beeld door de hand."`
> — `dist/nl/how-it-works/index.html`

- *Is duidelijk dat AI middel is?* Ja, dit is de bedoeling.
- *Probleem met de formulering:* `"More than AI"` / `"Meer dan AI"` is een **defensieve kopregel die het frame bevestigt dat hij wil ontkennen.** Je zegt letterlijk: het uitgangspunt is AI, en wij zijn dat plus iets. Een bezoeker die twijfelt leest hier de bevestiging van zijn twijfel.
- *Beter:* `"Made in the studio, finished by hand."` / `"In de studio gemaakt, met de hand afgewerkt."` — of nog beter, zonder AI in de kop en met AI in de body waar het al staat.
- *Tweede probleem in hetzelfde blok:* `"The images are generated first, and then every one goes through a pair of hands"` beschrijft een pijplijn waarin de machine de maker is en de mens de nabewerker. Dat is feitelijk waarschijnlijk correct en positioneel schadelijk. `"A specialist builds the scene, runs it through our production and finishes every frame by hand"` beschrijft dezelfde werkelijkheid met de mens als opdrachtgever van het proces.

---

**2.2.7 — `/ai-act/`: goed gedaan, verkeerd geplaatst · 🟡**

De pagina zelf is sterk. Voorbeelden:

> `"A brand that uses AI and hides it has a problem the moment somebody notices. A brand that simply says so has a story."`
> `"the jacket in the photograph has to be the jacket in the box. That is not a new AI rule. That is honest selling."`
> `"Light, background, model — built | Your product — photographed"`
> — `dist/ai-act/index.html`

- Dat laatste — `"Light, background, model — built / Your product — photographed"` — is de helderste uitleg van de rolverdeling op de hele site. Hij staat op de juridische pagina.
- *Plaatsing:* `AI Act` staat in de **footer op alle 120 pagina's**, tussen `Privacy`, `Terms of Service`, `Data processing` en `Cookies`. Dat is de juridische rij. Op elke pagina van de site is er dus een permanent zichtbare link met het woord "AI" erin. Dat is één van de weinige constante AI-signalen die een bezoeker passief oppikt.
- *Aftrek:* `"An AI image production makes all of it"` / `"Een AI-beeldpijplijn maakt dat allemaal"` — "pijplijn" is machine-taal in een verkoopcontext. Hier mag het, want de pagina is een verantwoordingspagina.

---

**2.2.8 — `/editions/`: de enige pagina waar het verboden beeld letterlijk waar is · 🟠**

> `"20 stock photos a month, brand-neutral: mood, texture and light that suit any clothing brand."`
> `"Both are made with AI, and both say so in the file — Every file carries a machine-readable provenance tag. Because there is no photograph of yours in these, they carry the stronger of the two values — 'made by a model' rather than 'partly made by a model'."`
> — `dist/editions/index.html`

- Hier verkoopt VISUAILS **volledig AI-gegenereerde content zonder enig product van de klant erin**, met een bestandstag die letterlijk zegt `"made by a model"`. Dat is exact de perceptie die vermeden moet worden — en hier is het geen misverstand, het is het productbeschrijving.
- Verzachtend: het product is nog niet te bestellen (`"Not running yet Neither set is running yet, so nothing is charged for either."`) en het staat in het menu met het label `Editions Soon` / `Editions Binnenkort`.
- Risico: het staat wél in de hoofdnavigatie, op de homepage (`"Editions Soon — Not ready to order — monthly brand imagery with no product in it"`) en op `/start/`. Een bezoeker die deze deur opent ziet een AI-stockbeeldabonnement en herclassificeert daarmee mogelijk het hele bedrijf.
- *Aanbeveling:* haal `Editions` uit de hoofdnavigatie en van de homepage zolang het niet verkoopbaar is. Het kost nu positionering zonder omzet op te leveren.

---

**2.2.9 — Wat er positief opvalt in de AI-test**

- **`"AI-powered"`: 0 vermeldingen.** `"AI-driven"`, `"AI workflow"`, `"machine learning"`, `"neural"`: 0. Dat is discipline, en het is de belangrijkste reden dat de site niet als tool leest.
- **`/about/` heeft nul AI-vermeldingen.** De "wie zijn wij"-pagina gaat over een team in Enschede, snelheid en consistentie — niet over technologie. Dat is de juiste keuze. (Al levert het een eigen probleem op, zie 4.4.)
- **`/compare/` heeft nul AI-vermeldingen** in de shootdag-vergelijking, en behandelt de tool-vergelijking pas ná alles, onder de kop `"And if you are weighing a self-serve tool"`. De volgorde is correct: eerst de echte concurrent (de shootdag), dan de gepercipieerde (de tool).
- **De schema.org-data is schoon.** `Organization.description`: `"Product-visual studio for clothing brands and modern e-commerce"`; `knowsAbout`: `["Product photography","Lifestyle product photography","Product video production",…]`. Geen AI-termen. Dit is wat Google structureel over VISUAILS opslaat, en het is correct.

---

## 3. SERVICE-VS-TOOL-TEST

### 3.1 CTA-inventaris: het sterkste bewijs op de hele site

Alle knop- en CTA-teksten site-breed geteld (`/concept/*` uitgesloten):

| Voorkomens | CTA |
|---|---|
| 96 / 98 | `Order` / `Bestellen` (header) |
| 48 / 49 | `Start an order` / `Start een bestelling` |
| 48 / 49 | `Try VISUAILS · €1` / `Probeer VISUAILS · €1` |
| 48 / 49 | `Chat on WhatsApp` / `Chat via WhatsApp` |
| 8 | `Sign in` / `Inloggen` |
| 5 | `Pick this look` / `Kies deze look` |
| 4 | `Add another product` / `Nog een product toevoegen` |
| 3 | `Vraag een eigen look aan` |
| 2 | `Order catalog images` / `Bestel catalogfoto's` |
| 1 | `Ask for a Custom Brand look`, `Order lifestyle images`, `Vraag een campagne-offerte aan` |

**Er is geen enkele CTA op de hele site met het woord "Generate", "Create", "Make", "Build", "Try the tool", "Start free", "Get started" of "Sign up".** Elke primaire actie is een bestel- of gesprekshandeling. Dit is het overtuigendste service-bewijs dat de site levert, en het is consistent over 120 pagina's.

### 3.2 Per gezocht woord

**`upload` — 57× site-breed · 🟡 gemengd**

> `"You upload. We deliver the campaign."` — H1 `dist/index.html`
> `"Jij uploadt. Wij leveren de campagne."` — H1 `dist/nl/index.html`

- *Indruk:* de tweede zin herstelt de eerste volledig. `"We deliver"` is een leveringsbelofte. De constructie is bewust: jij doet één ding, wij doen de rest.
- *Kritiek:* `"upload"` is nog steeds het **eerste woord van de site** en het is een softwarewerkwoord. In het Nederlands is `"Jij uploadt"` bovendien onnatuurlijk zakelijk. `"Jij stuurt je product op. Wij leveren de campagne."` of `"Stuur je productfoto's. Wij leveren de campagne."` zegt hetzelfde met een dienstverleningswerkwoord. Dat is een wijziging van twee woorden met disproportionele opbrengst.
- *Elders goed opgelost:* `"01 Upload a photo — We take it from there."` / `"01 Stuur een foto — Daarna nemen wij het over."` (`/catalog/`). De tweede helft neutraliseert de eerste. Dit patroon zou overal moeten gelden.

**`generate` / `generation` — 53× · 🟡**

- Bijna altijd in passieve constructies over het product, niet als handeling van de klant: `"every image is generated from photographs of your real product and finished by hand"`.
- *Indruk:* de klant krijgt niet het idee dat híj genereert. Correct.
- *Eén uitzondering, `/compare/`:* `"You can generate product images yourself. Sometimes that is the right call."` Dat is opzettelijk en eerlijk, en het staat op de juiste pagina.
- *Beste zin in de hele categorie, `/custom-models/`:* `"What we sell is not the generation. It is the lock."` / `"Wij verkopen niet het maken van een beeld. Wij verkopen dat het vastligt."` Dit is de scherpste positioneringszin die VISUAILS heeft geschreven, en hij staat halverwege een subpagina.

**`choose a model` / `kies een model` — 🟠 het zwaarste terminologische risico**

Het woord "model" wordt op deze site in **twee betekenissen door elkaar gebruikt**, en de ene is precies de betekenis die vermeden moet worden:

| Menselijke betekenis | AI-betekenis |
|---|---|
| `"Pick a face — or claim one."` (homepage) | `"Which model, we do not say. The platform above offers a large number of models from different makers"` (`/privacy/`) |
| `"Ten standard models, in every order"` (`/models/`) | `"as the AI model industry improves, so does what we can deliver"` (`/privacy/`) |
| `"Your Brand Model — one face, every order"` | `"they carry the stronger of the two values — 'made by a model'"` (`/editions/`) |
| `"We choose for you"` in het bestelformulier | `"Jouw materiaal wordt niet gebruikt om AI-modellen te trainen"` (`/nl/privacy/`) |

- De URL van het vlaggenschip-upsellproduct is **`/custom-models/`**. In de AI-wereld is "custom model" de standaardterm voor een fijngetrainde generator (LoRA, custom checkpoint). Een technisch enigszins geletterde e-commerce-oprichter die deze URL in het menu ziet, kan die als "eigen AI-model" lezen vóórdat hij de pagina opent.
- De pagina zelf is zich hiervan bewust — H2: `"Your model, not a model."` — maar dat is een reparatie ná de klik, niet een preventie ervoor.
- *Aanbeveling:* hernoem de URL naar `/brand-model/` of `/your-face/` (met 301) en vermijd "model" waar "gezicht" volstaat. De homepage doet dit al goed: `"Pick a face — or claim one."`

**`prompt` — 11× · 🟢 correct gebruikt**

Uitsluitend in de "waarom niet zelf"-context. Voorbeelden:

> `"Why not just prompt a generator? — You can, and for a single image you probably should. The thing a prompt cannot give you is the same person twice."` — `/custom-models/`
> `"You like the prompting, and you have the afternoon."` — `/compare/`
> `"Prompting, retrying, upscaling, cropping and exporting is still your afternoon."` — `/compare/`

- *Indruk:* prompten is nadrukkelijk wat de klant **niet** doet. Dit is de juiste inzet van het woord: het beschrijft het alternatief, niet de dienst.

**`dashboard` — 18× · 🟠**

> `"03 Your dashboard — One link, no account. Approve image by image or ask for a revision, and download it all at once."`
> `"03 Je dashboard — Eén link, geen account."`
> — `dist/index.html` / `dist/nl/index.html`, stap 3 van 4

- *Indruk:* **dit is het meest tool-achtige element op de homepage.** Eén van de vier stappen in "hoe het werkt" is een stuk software, en het staat er met een productnaam-achtig label.
- Verzachtend: `"One link, no account"` / `"Eén link, geen account"` is precies de anti-SaaS-belofte en staat er direct achter. En de inhoud van de stap (goedkeuren, revisie vragen, downloaden) is dienstverlening, geen productie.
- *Beter:* label de stap `"03 Your approval"` / `"03 Jij keurt goed"`. Dat beschrijft dezelfde stap met de klant als beoordelaar in plaats van als gebruiker van een dashboard.
- *Verzwarend elders, `/start/plan/`:* `"Cancel any month, in your dashboard."` en `"You can cancel yourself, in your dashboard."` Zelf opzeggen in een dashboard is een abonnementssoftware-patroon.

**`credits` / `tegoed` — 23× · 🟡**

> `"5 slots, not 5 new products. A credit is a place in the month, not a demand that you have something new."`
> `"5 plekken, geen 5 nieuwe producten. Een credit is een plek in de maand"`
> — `dist/plans/index.html` / `dist/nl/plans/index.html`

- "Credits" is het woord van generatieve tools (X credits = Y beelden). Dat de pagina het onmiddellijk herdefinieert (`"a place in the month"`, `"slots"`) is goede damage control, maar je herdefinieert alleen een woord dat je zelf hebt geïntroduceerd.
- *Aanbeveling:* gebruik overal `"slots"` / `"plekken"` en laat `"credit"` vallen. De site zegt zelf al `"5 slots, not 5 new products"` — dat is het juiste woord, dus kies het.

**De zwaarst SaaS-geurende alinea van de site, `/start/plan/` · 🟠**

> `"Your fixed week is planned straight away and **your credits are ready**. You **upload** your products in VISUAILS Studio; we make them in your week."`
> `"You can cancel yourself, in your **dashboard**."`
> — `dist/start/plan/index.html`

Vier tool-woorden (`credits`, `upload`, `Studio`, `dashboard`) in twee opeenvolgende zinnen, op het scherm vlak vóór de automatische incasso. Op het moment van de grootste financiële verplichting leest de pagina als een softwareabonnement. `"we make them in your week"` is het enige service-anker. *Aanbeveling:* `"Je vaste week staat meteen gepland en je plekken staan klaar. Stuur je producten in; wij maken ze in jouw week. Opzeggen kan zelf, in je account."`

**`VISUAILS Studio` als productnaam · 🟠**

In de hoofdnavigatie, onder "How it works":
> `VISUAILS Studio — "Where your work lands, and how you approve it"`

- "Merknaam + Studio" is het naamgevingspatroon van software (Android Studio, Visual Studio, Adobe Express Studio). Een bezoeker die het menu opent ziet een genoemd product.
- Bovendien botst het met het woord "studio" zoals de site het elders gebruikt als **bedrijfsomschrijving**: `"The visual studio for clothing brands"`, `"what a studio day holds"`, `"the studio answers in writing"`. De bezoeker moet raden of "Studio" het bedrijf of de app is.
- *Verzwarend:* de URL `/studio/` is níét het portaal maar de **capaciteitskalender** (`"How we arrive at a delivery date"`); het portaal staat op `/portal/`. De naamgeving is intern inconsistent.
- *Aanbeveling:* noem het in de navigatie `"Your order portal"` / `"Je bestelportaal"` en houd "studio" gereserveerd voor het bedrijf.

**`templates`, `settings`, `AI-powered platform`, `automation` als verkoopargument**

- `templates`: **0 vermeldingen.**
- `settings`: **0 in verkoopcontext.**
- `AI-powered platform`: **0.**
- `automation`: 31×, maar vrijwel uitsluitend in `/privacy/`, `/terms/` en `/data-processing-agreement/` (geautomatiseerde besluitvorming, AVG art. 22). Nul keer als verkoopargument. Correct.

### 3.3 Het bestelformulier: de zwaarste test, en hij wordt gehaald

`/start/catalog/`, `/start/complete/`, `/start/lifestyle/` zijn lange configuratoren: stijl, aantal, marktplaats, achtergrondkleur (inclusief hex-invoer), beeldverhouding, extra hoeken, modelkeuze, spoedlevering. Op papier is dat de vorm van een generator-UI.

**Waarom het tóch als een briefing leest en niet als een tool:**

> `"We choose for you — We read the products and what you told us, and pick from the ten faces. This is the default, and it is a real answer — not a blank we will chase you about."`
> — `dist/start/catalog/index.html`, modelkeuze

Dit is een uitzonderlijk goed CRO-detail: de **standaardwaarde van de belangrijkste creatieve keuze is "wij beslissen"**, en dat wordt expliciet verdedigd. Dat is done-for-you in de interactie zelf, niet alleen in de copy.

> `"Nothing is charged in the form — You are confirming an order, not paying in it."` (`/start/`)
> `"JavaScript is off, so this page shows all five steps at once. (…) Send the form and we will ask for the material by email, confirm a delivery date in writing"` (`/start/catalog/`)
> `"Rather send them later? Order now and send the photos afterwards — you get a link the moment the order is in, and the studio does not start until they arrive."`
> `"If we need more for the quality, we will come to you."`

Elk van deze zinnen bevestigt dat er aan de andere kant iemand zit die het overneemt. De no-JS-fallback (`"we will ask for the material by email"`) bewijst het zelfs structureel: het formulier is een gemak, geen machine.

> `"Drag a folder in and we read the folder name as the product."` / `"we usually have to come back to you to ask what is what."`

Dat tweede is bijna een verontschuldiging voor menselijk contact. Die toon is goed.

**Restrisico in het formulier:** de hoeveelheid keuzes (stijl, hex-kleur, ratio, hoeken, gezicht, marktplaats, spoed) kan bij een oprichter die dit voor het eerst ziet het gevoel geven dat hij zélf de art direction doet. Er is geen "laat ons dit voor je invullen"-pad behalve bij het gezicht. *Aanbeveling:* voeg boven stap 1 één regel toe — `"Niet zeker? Laat elk veld staan; wij vullen het in en leggen het je voor."` — en maak "wij beslissen" de standaard bij achtergrond en ratio zoals hij dat al is bij het gezicht.

---

## 4. DONE-FOR-YOU-TEST

Beoordeeld op zeven claims die een done-for-you dienst moet dragen.

| Claim | Oordeel | Bewijs |
|---|---|---|
| **VISUAILS voert het werk uit** | ✅ Sterk | `"We build the visuals on your own product"` (homepage) · `"02 We make it consistent"` (`/catalog/`) · `"02 We add the motion"` (`/video/`) · `"Four steps, and you film none of them"` (`/hooks/`) · `"we make them in your week"` (`/start/plan/`) |
| **VISUAILS selecteert en verfijnt beelden** | ⚠️ Deels | `"We choose for you"` (bestelformulier, modelkeuze) is uitstekend. Maar dat is de enige plek waar VISUAILS expliciet een creatieve keuze vóór de klant maakt. Bij stijl, achtergrond en ratio kiest de klant. |
| **VISUAILS corrigeert fouten** | ✅ Sterk | `"colour, print, logo, closures and seams are checked and corrected by hand wherever the AI drifts"` (`/faq/`, `/start/*`, `/upload-guidelines/`) · `"If it is our mistake, we fix it (…) at no cost. Also after that one round."` |
| **VISUAILS controleert kwaliteit** | ✅ Sterk, maar zie 4.1 | `"Every visual is carefully checked."` staat op 20 EN- + 20 NL-pagina's · `"a specialist checks fit, colour against your own photo, and framing before anything leaves"` (`/how-it-works/`) |
| **VISUAILS bewaakt merkstijl** | ✅ Sterk | `"One choice, applied to the whole order — that is what makes twenty products come back looking like one shoot"` (`/how-it-works/`) · `"The face, background and format you approve stay with your brand, so the next order starts where the last one ended"` (homepage) · `"grade the colour to your brand"` |
| **VISUAILS levert direct bruikbare content** | ✅ Zeer sterk | `"1:1 your shop · 4:5 your ad · 9:16 your reel"` (homepage) · `"Marketplace-ready"` · de volledige marktplaatsspecificaties (Amazon #FFFFFF, bol, Zalando JPG) in het bestelformulier · `"ready to post"` |
| **VISUAILS neemt werk uit handen** | ❌ **Wordt nergens gezegd** | Zie 4.2 |

### 4.1 🔴 Systeemfout: de mens is overal controleur, nergens maker

Dit is de belangrijkste bevinding van de hele audit, en hij is niet zichtbaar in één citaat maar in een patroon over 120 pagina's.

Elke keer dat de site een mens noemt, is die mens **inspecteur van machine-output**:

> `"Every visual is carefully checked."` — herhaald op 40 pagina's (20 EN + 20 NL), als vaste trustbadge
> `"A specialist checks every image before it ships."` — homepage, stap 02
> `"Een specialist kijkt elk beeld na voordat het weggaat."` — NL-homepage
> `"Studio-quality product visuals — modern speed, **checked by real people**."` — `/about/`, hero
> `"Reviewed by a specialist before it reaches you."` — `/test-sample/`
> `"Before anything leaves, a person **finishes the frame and looks at it** against the product you ship."` — `/ai-act/`
> `"and **looked at by a person** before anything reaches you"` — `/custom-models/`
> `"The last step is a person."` — `/studio/`, H2
> `"AI-assisted, **human-reviewed** product-visuals service"` — `/privacy/` §1
> `"The images are generated first, and **then** every one goes through a pair of hands."` — `/how-it-works/`

Tel ze op en de boodschap wordt: **de machine maakt, de mens keurt.** Dat is per definitie "een AI-tool met een menselijk sausje" — exact de perceptie die vermeden moet worden. De site heeft het beste tegenargument (`"What you buy here is everything that happens after the image is generated"`) en ondermijnt het vervolgens door dat "everything after" consequent als *controle* te beschrijven in plaats van als *werk*.

De site heeft wel makers-taal, maar die is anoniem en in de wij-vorm van het bedrijf (`"we build"`, `"we finish"`, `"we grade"`) — nooit gekoppeld aan een persoon. Er is één zin die het goed doet:

> `"Light, background, model — built | Your product — photographed"` — `/ai-act/`

Die staat op de juridische pagina.

**Aanbeveling:** herschrijf de vaste trustbadge van `"Every visual is carefully checked"` naar iets dat werk beschrijft, bijvoorbeeld `"Every visual is finished by hand in our studio"` / `"Elke visual wordt in onze studio met de hand afgemaakt"`. Behoud de controle-claim, maar zet hem ná de maak-claim, niet in plaats daarvan. Dit is één zin die op 40 pagina's tegelijk verandert — de hoogste hefboom op de hele site.

### 4.2 🔴 De kernbelofte wordt nooit uitgesproken

Ik heb site-breed gezocht naar de formulering van het aanbod:

| Zin | Voorkomens |
|---|---|
| `"done-for-you"` | **2** — beide op `/guides/` en `/nl/guides/`, als kaarttitel: `"AI tools vs a done-for-you studio"` / `"AI-tools vs een done-for-you studio"` |
| `"out of your hands"` / `"uit handen"` | **0** |
| `"you do nothing"` | **1** — op `/editions/`, het product dat nog niet te bestellen is |
| `"je doet niets"` | **0** |
| `"we take it from there"` / `"nemen wij het over"` | **2** / **1** — alleen op `/catalog/` |
| `"not a tool"` / `"geen tool"` / `"geen software"` | **0** |

Dus: het enige plek waar de site zichzelf een "done-for-you studio" noemt, is een kaartlabel op de gidspagina, waar het bovendien in dezelfde zin naast `"AI tools"` staat. De homepage, `/about/`, `/how-it-works/`, `/pricing/`, `/compare/` en alle dienstpagina's **benoemen de categorie nergens.**

De site *toont* done-for-you uitstekend en *zegt* het nooit. Voor een bezoeker die twijfelt tussen twee mentale categorieën ("is dit een dienst of een tool?") is dat precies de verkeerde volgorde: je moet de categorie benoemen en hem dan bewijzen, niet omgekeerd hopen dat hij hem zelf afleidt.

**Aanbeveling:** zet één categoriezin direct onder de H1 op de homepage. Bijvoorbeeld: `"A done-for-you visual studio: you send the product photos, we make the content, you publish it."` / `"Een done-for-you contentstudio: jij stuurt je productfoto's, wij maken de content, jij publiceert."` Dit is de enige ontbrekende zin van de hele site.

### 4.3 TEGENSTRIJDIGHEDEN TUSSEN PAGINA'S

**T1 · 🔴 `llms.txt` vs. footer vs. schema.org — de definitie verschilt per kanaal**

| Kanaal | Zelfdefinitie |
|---|---|
| Footer, 120 pagina's | `"The visual studio for clothing brands and modern e-commerce"` |
| schema.org `Organization` | `"Product-visual studio for clothing brands and modern e-commerce"` |
| `/about/` meta | `"VISUAILS is a product-visual studio in Enschede, Netherlands"` |
| **`/llms.txt`** | **`"An AI visual studio for clothing brands and e-commerce"`** |
| `/privacy/` §1 | `"an AI-assisted, human-reviewed product-visuals service"` |
| `/terms/` §3 | `"VISUAILS maakt AI-ondersteunde, door mensen gecontroleerde productvisuals"` |

Drie kanalen zeggen "studio voor productvisuals", drie kanalen zeggen "AI-dienst". Dat is geen nuanceverschil maar twee verschillende categorieën. Welke een bezoeker meekrijgt hangt af van of hij via Google, via een AI-assistent of via de footer binnenkomt.

**T2 · 🟠 `/gallery/` en de dienstpagina's noemen het "fotografie"; `/ai-act/` zegt dat er geen foto is**

> `"The studio's **real photo library** — nothing borrowed, nothing bought in. What stands here was made the way your order will be."` — `/gallery/`
> `"**Catalog photography**: clarity that closes the sale."` — H2 `/catalog/`
> `"**Lifestyle photography**: your product in a styled scene"` — H2 `/lifestyle/`

tegenover:

> `"a **made image, not a photograph** of a shoot that happened"` — `/faq/`
> `"None of it is a place that exists or a shoot that happened."` — `/ai-act/`
> `"Our on-model shot **is generated**, so we cannot promise it will be accepted as a compliant model view"` — `/start/catalog/`

Een bezoeker die `/gallery/` leest (`"real photo library"`) en daarna `/ai-act/` leest (`"none of it is a shoot that happened"`) ervaart dat als een correctie. Dat is het duurste soort tegenstrijdigheid: de tweede pagina maakt de eerste ongeloofwaardig. `"Photography"` in H2's is bovendien een SEO-keuze die tegen de eigen transparantiebelofte in werkt.

**T3 · 🟠 `/about/` verzwijgt volledig hoe het werk gemaakt wordt**

`/about/` heeft **nul** redactionele AI-vermeldingen en gebruikt in plaats daarvan:
> `"Great visuals, without the studio"` · `"**modern speed**, checked by real people"` · `"**modern production speed** with human judgement"` (meta) · `"01 **Speed, without the shortcut**"`

"Modern speed" / "moderne productiesnelheid" is een eufemisme dat niets uitlegt. Een sceptische bezoeker die op `/about/` naar het antwoord op "hoe kan dit zo goedkoop en snel" zoekt, krijgt er geen. Hij vindt het antwoord twee klikken verderop op `/faq/` (`"Yes, and we say so plainly"`) — en ervaart dan dat de "over ons"-pagina het niet zei.
Dit is geen AI-overexposure maar het omgekeerde: **een verzwijging op de pagina waar vertrouwen gemaakt moet worden.** Eén zin op `/about/` in de trant van `"We build the light, the background and the model with AI production, on your own product, and a person finishes every frame"` lost dit op en versterkt tegelijk de maker-framing uit 4.1.

**T4 · 🟡 Prijsinconsistentie tussen metadescriptie en pagina**

> Homepage `<meta name="description">`: `"Catalog and lifestyle images for clothing brands, from your own photos. No shoot. **€149 a product, €65 from 20 up**"`
> Homepage hero-fact: `"**From €89 per product**"`
> Homepage tarieventabel: `"1–4 · Catalog €89 · Lifestyle €109 · Complete €149"`

De metadescriptie (wat in Google staat) noemt het Complete-tarief zonder dat te zeggen; de pagina noemt het catalogtarief. Verschil: 67%. Een bezoeker die op €149 klikt en €89 ziet, of andersom, twijfelt aan de prijzen. Geen positioneringsprobleem, wel een vertrouwensprobleem op het eerste contactmoment.

**T5 · 🟡 `"Editions Soon"` en `"Hooks On request"` in de hoofdnavigatie**

Twee van de acht producten in het hoofdmenu zijn niet bestelbaar. `/editions/` zegt zelfs: `"Not running yet Neither set is running yet, so nothing is charged for either."` Een menu waarin een kwart van het aanbod niet gekocht kan worden, maakt onduidelijk wat het hoofdproduct is en laat het bedrijf minder af lijken dan het is.

**T6 · 🟠 50 lege beeldplaatsen op een site die beeld verkoopt**

`"Photo to come"` (25×) en `"Foto volgt"` (25×) staan op 18 live pagina's: `/catalog/`, `/lifestyle/`, `/compare/`, `/custom-models/`, `/editions/`, `/hooks/`, `/plans/`, `/studio/`, `/upload-guidelines/` en hun NL-tegenhangers. Plus:

> `"Stand-in images — the walkthrough set is still being shot. Every frame here was made earlier for a real order; nothing is generated while you look at it."` — `/how-it-works/`

Voor een visuele studio is dit het duurste mogelijke gebrek. Het bewijs van vakmanschap — de ene categorie bewijs die "wij maken content voor jou" onweerlegbaar maakt — ontbreekt op precies die plekken waar het argument gevoerd wordt. Op `/compare/` staat `"Photo to come"` bijvoorbeeld op de plek waar het verschil tussen een shootdag en een VISUAILS-order getoond zou worden.

**T7 · 🟢 Geen tegenstrijdigheid in de proceslogica**

Ik heb expliciet gezocht naar tegenstrijdigheden in wie wat doet, en die zijn er niet. `/how-it-works/` labelt elke stap met de verantwoordelijke (`"01 You, on the site"`, `"03 Us, before you pay"`, `"05 Us, in production"`, `"06 You, in your account"`). Die labeling komt overeen met het bestelformulier, met `/portal/`, met `/studio/` en met de homepage. Vier stappen, twee partijen, nergens verschuiving. Dat is zorgvuldig gebouwd.

---

## 5. WAT NIET GEZEGD WORDT — totaalindruk

**5.1 Woordkeuze**
De dominante werkwoorden zijn `order`, `deliver`, `make`, `build`, `send`, `approve`, `check`. De afwezige werkwoorden zijn `generate` (als klanthandeling), `create`, `design your own`, `customize`, `configure`. Dat is een goed gekozen woordenschat. De drie uitzonderingen zijn `upload` (57×), `dashboard` (18×) en `credits` (23×) — alledrie oplosbaar met een woordvervanging.

**5.2 CTA-teksten**
Zie 3.1. Nul creatie-CTA's over 120 pagina's. Dit is het sterkste signaal op de site en het is volledig consistent.

**5.3 Productnamen**
- `Catalog`, `Lifestyle`, `Video`, `Monthly plan` — beschrijvend, neutraal, goed.
- `Your Brand Model` / `Jouw merkmodel` — dubbelzinnig ("model" = gezicht óf AI-model). URL `/custom-models/` verergert dit.
- `Hooks` — jargon uit performance marketing; een kleine merkeigenaar weet niet wat dit is. De navigatie-omschrijving (`"On request — a short video on a proven format"`) repareert het.
- `Editions` — betekenisloos zonder uitleg, en het product erachter is volledig AI-gegenereerde stock.
- `VISUAILS Studio` — leest als software. Zie 3.2.

**5.4 Navigatie**
Topniveau: `What we make` · `How it works` · `Pricing` · `Gallery` · `Contact` · `Log in` · `Order`. Dat is bureau-architectuur, niet SaaS-architectuur (die zou `Product` · `Features` · `Pricing` · `Docs` · `Sign up` heten). `What we make` als eerste label is precies goed.
Twee bezwaren: `Log in` staat pal naast `Order` in de header — bij een dienst log je in bij je leverancier, bij een tool log je in om te werken, en die tweede lezing ligt hier voor de hand. En onder `How it works` staan vijf items waarvan er drie over de handelingen van de klant gaan (`VISUAILS Studio`, `The models`, `Sending your photos`) en geen enkele expliciet over wat VISUAILS doet.

**5.5 Volgorde van informatie**
Homepage: H1 (belofte) → hero-facts (prijs, minimum, levertijd, rechten) → proces 4 stappen → aanbod → set → tarieven → abonnement → gezichten → objecties → proef. Dat is een klassieke, goed werkende dienstenpagina-volgorde. Prijs op positie 2 is moedig en past bij het positioneringsdoel: een tool noemt zijn prijs pas na de features.
Kritiek: AI komt pas op positie 9 van 10 voor, in het objectieblok. Dat is laat genoeg om niet af te leiden, maar het betekent ook dat de vraag "hoe kan dit €89 zijn" tot dat moment onbeantwoord blijft.

**5.6 Aandacht voor AI versus aandacht voor het klantresultaat**
Op de homepage: AI krijgt 2 zichtbare vermeldingen, het klantresultaat krijgt de H1, vier hero-facts, een vierstappenproces, drie dienstkaarten, een settenblok, een tarieventabel en drie CTA-blokken. De verhouding is ongeveer **1 : 40** in het voordeel van het klantresultaat. Dat is een uitstekende verhouding.
Site-breed verschuift die naar ongeveer **1 : 8**, met twee uitschieters (`/ai-act/`, `/faq/`) waar AI de helft van de aandacht krijgt. Dat is verdedigbaar voor die twee pagina's.

**5.7 Wat de bestelstroom over de rolverdeling suggereert**
De stroom is: kies dienst → aantal → stijl → kanaal → achtergrond → hoeken → ratio → foto's → gezicht → gegevens → timing → bevestigen → **wachten** → goedkeuren → downloaden. De klant configureert vooraan, verdwijnt in het midden en beoordeelt achteraan. Dat is exact de vorm van een dienst: het werk gebeurt buiten het zicht van de klant.
Twee elementen bevestigen dit expliciet: de standaardwaarde `"We choose for you"` bij het gezicht, en `"the studio does not start until they arrive"`. Twee elementen ondermijnen het: de hoeveelheid keuzes vooraan (zeven configuratievelden voordat er één foto is verstuurd) en het woord `dashboard` bij stap 03.

**5.8 Wat er helemaal niet staat**
- **Geen enkele klantnaam, testimonial, case study of logostrip.** Site-breed: 0 testimonials, 0 merknamen van klanten, 0 "trusted by". Voor een done-for-you dienst is sociaal bewijs de belangrijkste conversiefactor die er is — belangrijker dan prijs. Het ontbreekt volledig.
- **Geen gezichten of namen van het team.** `/about/` zegt `"A small team in Enschede"` en verder niets. Geen foto, geen naam, geen rol. Elke keer dat de site een mens noemt, is het `"a specialist"` / `"een specialist"` — enkelvoud, anoniem, onbewijsbaar. Voor het weerleggen van "dit is een AI-tool met een menselijk sausje" is één foto van twee mensen achter een scherm in Enschede meer waard dan de veertig `"carefully checked"`-badges samen.
- **Geen doorlooptijd van de mens.** De site zegt `"often within a day"`. Snelheid die niet verklaard wordt, wordt door de lezer aan automatisering toegeschreven. Eén regel over hoeveel tijd een specialist per beeld besteedt, zou dat kantelen.

---

## 6. SCORES

### (1) "VISUAILS is een done-for-you contentdienst" — **8 / 10**
*Voor:* de hele sitearchitectuur is dienstverlening. `What we make` als eerste navigatielabel, `Order` als enige primaire CTA over 96 pagina's, prijs per product, `"A delivery date we reserve and confirm before you pay"`, een revisieronde, BTW, KVK, een capaciteitskalender, een WhatsApp-lijn. Geen enkele SaaS-conventie: geen gratis proefperiode (de €1-proef is een monster, geen trial), geen seats, geen features-pagina.
*Tegen:* het woord "done-for-you" komt twee keer voor op de hele site, beide op `/guides/`, beide naast `"AI tools"`. De categorie wordt bewezen maar nooit benoemd. Een bezoeker moet het zelf concluderen, en dat doet niet iedereen.

### (2) "VISUAILS maakt content VOOR mijn merk" — **8 / 10**
*Voor:* `"We deliver the campaign"` (H1), `"We build the visuals on your own product"`, `"We take it from there"`, `"Four steps, and you film none of them"`, `"We choose for you"` als standaard in het bestelformulier, `"we make them in your week"`. De merkbewaking is expliciet: `"The face, background and format you approve stay with your brand, so the next order starts where the last one ended."`
*Tegen:* in het vierstappenblok van de homepage zijn drie van de vier stappen van de klant (`You` / `Your dashboard` / `Your shop`) en één van VISUAILS. Het ritme van de belangrijkste pagina gaat over wat jij doet. En de mens aan de VISUAILS-kant is in 40 herhalingen een controleur, geen maker.

### (3) "Ik hoef zelf geen AI te gebruiken" — **9 / 10**
*Voor:* de site vraagt de klant nergens om te prompten, te genereren, een model te kiezen (in AI-zin), iets te herdraaien of iets te exporteren. De enige klanthandelingen zijn: fotograferen, een formulier invullen, goedkeuren. `"prompt"` komt alleen voor als beschrijving van het alternatief: `"Prompting, retrying, upscaling, cropping and exporting is still your afternoon."` Dat is exact de juiste inzet.
*Tegen:* `"You upload"` als eerste twee woorden van de site, en het bestelformulier heeft zeven configuratievelden vóór de eerste foto. Voor een niet-technische oprichter kan dat even aanvoelen als "ik moet dit zelf instellen".

### (4) "AI is middel, niet product" — **6 / 10**
*Voor:* `"AI-powered"` 0×, `"AI workflow"` 0×, `"machine learning"` 0×. Homepage 2 zichtbare vermeldingen, `/about/` 0, `/gallery/` 0, `/pricing/` 0, `/compare/` 0 in het hoofdargument. `"What you buy here is everything that happens after the image is generated."` `"What we sell is not the generation. It is the lock."` Dat zijn precies de juiste formuleringen.
*Tegen:* de drie plekken waar VISUAILS zichzelf formeel definieert, zetten AI vooraan: `llms.txt` (`"An AI visual studio"`), `/privacy/` §1 (`"an AI-assisted, human-reviewed product-visuals service"`), `/terms/` §3 (`"AI-ondersteunde, door mensen gecontroleerde productvisuals"`). `"More than AI"` als kopregel bevestigt het frame dat het ontkent. `AI Act` staat permanent in de footer van alle 120 pagina's. En `/editions/` verkoopt letterlijk `"20 stock photos a month"` met een bestandstag `"made by a model"`.

### (5) "Voelt als een contentpartner" — **7 / 10**
*Voor:* een gereserveerde week op de kalender, `"No date is printed until the calendar clears it"`, `"It is the one promise on this site we would rather lose an order over than break"`, `"we will come to you"` bij twijfel, `"when we are unsure we contact you before going further"`, WhatsApp als eerste contactkanaal met `"usually a reply within an hour on weekdays"`, KVK- en BTW-nummer, adres in Enschede. `/compare/` noemt zelfs vier situaties waarin je béter een shootdag boekt. Dat is partner-gedrag.
*Tegen:* nul testimonials, nul klantnamen, nul case studies, nul teamfoto's, nul namen van medewerkers site-breed. De partner is volledig anoniem. En 50 `"Photo to come"`-plaatshouders op 18 live pagina's ondermijnen het beeld van een werkende studio.

### (6) "Voelt als een AI-tool" (0 = goed, 10 = slecht) — **3 / 10**
*Wat de score laag houdt:* geen enkele creatie-CTA, geen features-navigatie, geen gratis proefperiode, geen prompt-invoer, geen "kies je model", prijs per product in plaats van per generatie, en een bestelformulier dat als briefing is opgebouwd met `"We choose for you"` als standaard.
*Wat de score omhoog duwt:* `"You upload"` als openingswoorden · `"03 Your dashboard"` als een van vier processtappen · `Log in` naast `Order` in de header · `VISUAILS Studio` als productnaam in de navigatie · de URL `/custom-models/` · `"credits"` op `/plans/` en `/start/plan/` · en de alinea `"your credits are ready. You upload your products in VISUAILS Studio (…) cancel yourself, in your dashboard"` op het betaalscherm.

---

## 7. DE CRUCIALE VRAAG

> *Als 1.000 kleine fashionmerken vandaag de homepage bezoeken, welk percentage leest VISUAILS primair als AI-contentbedrijf of AI-tool in plaats van als done-for-you dienst?*

### **Inschatting: 20 – 35%**

**Dit is een kwalitatieve inschatting.** Er is geen gebruikersonderzoek, geen analytics, geen enquête en geen A/B-test waarop dit gebaseerd is. Het is de beoordeling van één lezer die de site regel voor regel heeft doorgenomen, uitgedrukt als bandbreedte om te voorkomen dat het als meting wordt gelezen. Neem het als richting, niet als getal.

**Onderverdeling binnen die 20–35%:**

| Verkeerde lezing | Inschatting | Waar die perceptie vandaan komt |
|---|---|---|
| *"Dit is een tool waarmee ik zelf beelden maak"* | **3 – 7%** | Bijna niemand. Er is geen enkele CTA, geen prompt-veld en geen feature-taal die dit ondersteunt. Wie dit denkt, heeft alleen de H1 (`"Jij uploadt"`) en de header (`Log in`, `Order`) gezien en is weer weggeklikt. |
| *"Dit is een AI-contentbedrijf — ze leveren het wel, maar het is AI-werk"* | **15 – 25%** | Dit is de grote groep, en dit is grotendeels een **correcte** lezing die de site zelf uitnodigt. Ze klikken door naar `/faq/` of `/catalog/`, lezen `"Yes, and we say so plainly"`, en herclassificeren het bedrijf van "studio" naar "AI-beeldleverancier". |
| *"Een AI-tool met een menselijk sausje"* | **5 – 10%**, grotendeels overlappend met de rij hierboven | Dit komt specifiek uit het patroon uit 4.1: de mens is overal controleur (`"checked"`, `"reviewed"`, `"looked at"`) en nergens maker. Wie op dat woordgebruik let, leest een QA-laag over machine-output. |

**Waar de perceptie precies vandaan komt — de zes bronnen, in volgorde van invloed:**

**1. Het antwoordkanaal, niet de website (grootste onderschatte bron).**
`robots.txt` laat elke AI-crawler expliciet toe, met een uitgeschreven motivatie: `"Deze site verkoopt aan mensen die 'hoe fotografeer ik mijn product met een telefoon' intypen, en dat is steeds vaker een vraag aan een taalmodel en niet aan een zoekmachine."` De site heeft daar `/llms.txt` voor klaargezet. En de eerste inhoudelijke zin van dat bestand is `"An AI visual studio for clothing brands and e-commerce."`
Een steeds groter deel van de 1.000 merken komt niet via de homepage binnen maar via een antwoord van ChatGPT of Perplexity op "wie maakt productfoto's zonder shoot". Dat antwoord begint met "VISUAILS is een AI visual studio". Die bezoekers arriveren **al geclassificeerd** op de homepage en lezen alles daarna als bevestiging. Dit is de enige bron in deze lijst waar VISUAILS zijn eigen verkeerde categorie actief uitzendt.

**2. Het homepage-objectieblok, direct vóór de conversie.**
`"Will a customer see it is AI?"` en `"Why not do it myself?"` staan als vraag 2 en 4 van vier, in het laatste blok vóór de slot-CTA. Voor een bezoeker die tot dat punt geen AI-signaal heeft gezien, is dit de plek waar het frame geplant wordt — op het slechtst denkbare moment, namelijk vlak voor de beslissing. Een objectie beantwoorden betekent altijd de objectie noemen, en `"Why not do it myself?"` erkent bovendien dat zelf-doen een vergelijkbare optie is.

**3. De tweede klik: `/faq/`, `/catalog/` of `/lifestyle/`.**
Wie verder leest komt binnen twee klikken bij `"Are the visuals AI-generated? — Yes"` of `"Is this AI, and do I have to say so? — Yes"`. Het antwoord begint met bevestiging. Voor een merkeigenaar die op dat moment nog aan het inschatten is wat voor bedrijf dit is, is dat het definiërende moment. De rest van het antwoord (`"generated from photographs of your real product and finished by hand"`) is uitstekend, maar komt na het woord dat de categorie vastzet.

**4. Het mens-als-controleur-patroon.**
Veertig herhalingen van `"Every visual is carefully checked"` / `"Elke visual wordt zorgvuldig gecontroleerd"`, plus `"checked by real people"`, `"reviewed by a specialist"`, `"human-reviewed"`, `"The last step is a person"`, `"then every one goes through a pair of hands"`. Elk van die zinnen is bedoeld als geruststelling en werkt collectief als bevestiging: de machine maakt, de mens kijkt na. Dit is de bron die het lastigst te zien is en het meest bepalend voor de specifieke lezing "AI-tool met een menselijk sausje".

**5. Het lexicale restant: `upload`, `dashboard`, `credits`, `Studio`, `Log in`, `/custom-models/`.**
Elk woord afzonderlijk is verdedigbaar. Samen vormen ze een softwaresemantiek die op sleutelmomenten opduikt: `upload` in de eerste twee woorden van de site, `dashboard` als een van vier processtappen, `credits` en `dashboard` samen op het incassoscherm, `Log in` naast `Order` in elke header.

**6. Het ontbrekende tegenbewijs.**
Dit is een passieve bron, maar hij is groot. Er is geen enkele klantnaam, geen testimonial, geen case study, geen teamfoto, geen naam van een specialist — en er staan 50 `"Photo to come"`-plaatshouders op 18 live pagina's. Wie twijfelt tussen "een studio met mensen" en "een geautomatiseerde dienst" vindt op deze site niets dat de eerste lezing hard bewijst. Bij afwezigheid van menselijk bewijs valt de lezer terug op het goedkoopste verklarende model, en dat is automatisering.

**Waarom het niet hóger is dan 35%:**
De homepage bevat, uitgezonderd één FAQ-regel en één footerlink, **geen enkel AI-signaal**. De CTA's, de prijsstructuur, de leverdatumbelofte, de revisieronde, de capaciteitskalender, de BTW-behandeling en de WhatsApp-lijn zijn onmiskenbaar die van een dienstverlener. De meerderheid van de bezoekers — 65 tot 80% — zal na tien seconden denken: *zij maken mijn productbeelden voor mij, per product, ik stuur foto's op.* Dat is de gewenste perceptie, en de site levert die aan de meerderheid.

**Waarom het niet lager is dan 20%:**
Omdat de site het zelf aanbiedt. `"Yes, and we say so plainly"` staat op vier pagina's. `llms.txt` opent met `"An AI visual studio"`. `/editions/` verkoopt `"20 stock photos a month"` met tag `"made by a model"`. Een deel van die 20–35% is dus geen misverstand maar een correcte gevolgtrekking uit wat er letterlijk staat. Dat maakt het niet minder duur: de vraag is niet of het klopt, maar of het de categorie is waarin je verkocht wilt worden.

---

## 8. BEVINDINGENTABEL

| Pagina/onderdeel | Probleem | Waarom problematisch | Ernst | Aanbevolen verandering |
|---|---|---|---|---|
| `dist/llms.txt` r.3 | `"An AI visual studio for clothing brands and e-commerce."` | Dit is de zin die ChatGPT, Claude en Perplexity citeren als iemand vraagt wat VISUAILS is. AI staat als eerste woord in de categoriebenaming, terwijl footer en schema.org `"visual studio"` zeggen zónder AI. De site zendt zijn eigen verkeerde categorie uit in precies het kanaal dat `robots.txt` bewust heeft opengezet. | 🔴 | Herschrijf naar `"A done-for-you product-visual studio…"` en verplaats de AI-vermelding naar zin drie als methode. |
| Site-breed trustbadge (40 pagina's) | `"Every visual is carefully checked."` / `"Elke visual wordt zorgvuldig gecontroleerd."` — plus `"checked by real people"`, `"reviewed by a specialist"`, `"human-reviewed"`, `"The last step is a person"`, `"then every one goes through a pair of hands"` | De mens is in élke formulering controleur van machine-output, nooit maker. Dat is de letterlijke definitie van "een AI-tool met een menselijk sausje". Het ondermijnt de eigen beste claim (`"everything that happens after the image is generated"`). | 🔴 | Verander de badge naar `"Elke visual wordt in onze studio met de hand afgemaakt"` / `"Every visual is finished by hand in our studio"`. Zet de controle-claim eráchter, niet ervoor. Eén wijziging, 40 pagina's effect. |
| Homepage (EN+NL), hele pagina | De categorie "done-for-you dienst" wordt nergens benoemd. `"done-for-you"` komt site-breed 2× voor, beide op `/guides/`, beide naast `"AI tools"`. `"uit handen"` 0×, `"not a tool"` 0×. | De site bewijst done-for-you uitstekend en zegt het nooit. Een bezoeker die twijfelt tussen twee categorieën krijgt de categorie niet aangereikt en moet hem zelf afleiden. | 🔴 | Zet één categoriezin onder de H1: `"Een done-for-you contentstudio: jij stuurt je productfoto's, wij maken de content, jij publiceert."` |
| `/privacy/` §1 · `/terms/` §3 (EN+NL) | `"VISUAILS is an AI-assisted, human-reviewed product-visuals service"` / `"VISUAILS maakt AI-ondersteunde, door mensen gecontroleerde productvisuals"` | De enige twee formele zelfdefinities op de site zetten AI als eerste adjectief en de mens als reviewer. Deze zinnen worden overgenomen door aggregators en AI-antwoorden. | 🔴 | `"VISUAILS is a done-for-you product-visuals studio in Enschede. Production is AI-assisted; every visual is finished and checked by a person before delivery."` Juridisch even sluitend, andere volgorde. |
| Homepage, blok `"Straight answers."` | 2 van 4 objecties gaan over AI en zelf-doen: `"Will a customer see it is AI?"` en `"Why not do it myself?"` — direct vóór de slot-CTA. JSON-LD is nog explicieter: `"Why not just do this myself with an AI tool?"` | Activeert het toolframe op het conversiemoment en erkent zelf-doen als vergelijkbare optie. Google kan de JSON-LD-formulering als snippet tonen. | 🟠 | Vervang `"Why not do it myself?"` door `"Hoeveel werk is dit voor mij?"` met de shootdag-vergelijking als antwoord. Laat de AI-vraag staan maar niet als tweede van vier. Stem de JSON-LD af op de zichtbare labels. |
| Homepage, stap 03 van 4 | `"03 Your dashboard"` / `"03 Je dashboard"` | Een kwart van het zichtbare proces is een stuk software, met een productnaam-achtig label. Meest tool-achtige element op de homepage. | 🟠 | Herlabel naar `"03 Jij keurt goed"` / `"03 Your approval"`. De body (`"Eén link, geen account"`) is al goed en blijft staan. |
| Homepage vierstappenblok | Drie van vier stappen zijn van de klant (`You`/`Jij`, `Your dashboard`, `Your shop`), één van VISUAILS (`Us`/`Wij`). | Het ritme van de belangrijkste pagina gaat over wat de klant doet. Verzwakt "zij nemen het over". | 🟠 | Splits stap 02 in twee (`"Wij bouwen"` + `"Wij werken af en controleren"`) zodat de verhouding 2-op-3 wordt en het maakwerk zichtbaar volume krijgt. |
| `/start/plan/` (EN+NL), betaalstap | `"Your fixed week is planned straight away and your credits are ready. You upload your products in VISUAILS Studio"` + `"You can cancel yourself, in your dashboard."` | Vier SaaS-woorden (`credits`, `upload`, `Studio`, `dashboard`) in twee zinnen, op het scherm van de grootste financiële verplichting. Leest als softwareabonnement. | 🟠 | `"Je vaste week staat meteen gepland en je plekken staan klaar. Stuur je producten in; wij maken ze in jouw week. Opzeggen kan zelf, in je account."` |
| `/gallery/` + H2's `/catalog/`, `/lifestyle/` | `"The studio's real photo library"` · `"Catalog photography"` · `"Lifestyle photography"` — tegenover `"a made image, not a photograph"` (`/faq/`) en `"none of it is a shoot that happened"` (`/ai-act/`) | Directe tegenstrijdigheid tussen pagina's. Wie `/gallery/` vóór `/ai-act/` leest, ervaart de tweede als correctie en verliest vertrouwen in de eerste. | 🟠 | Vervang `"real photo library"` door `"our own work — nothing borrowed, nothing bought in"`. Vervang `"photography"` in H2's door `"catalogbeeld"` / `"lifestylebeeld"` of behoud het alleen in SEO-metadata. |
| `/about/` (EN+NL) | Nul AI-vermeldingen; in plaats daarvan `"modern speed"` / `"moderne productiesnelheid"` en `"Great visuals, without the studio"` | De vertrouwenspagina verzwijgt hoe het werk gemaakt wordt. Wie daar het antwoord op "hoe kan dit €89 zijn" zoekt, vindt het twee klikken verderop en ervaart de "over ons" als onvolledig. | 🟠 | Eén alinea toevoegen: wat de studio bouwt, wat AI daarin doet, en wat een specialist per beeld doet. Versterkt tegelijk de maker-framing. |
| `/editions/` + hoofdnavigatie | `"20 stock photos a month, brand-neutral"` · `"they carry the stronger of the two values — 'made by a model'"` · `"Not running yet"` | Het enige product waar de verboden perceptie letterlijk de productbeschrijving is: volledig AI-gegenereerde content zonder product van de klant. Staat in het hoofdmenu en op de homepage, maar is niet te bestellen. Kost positionering zonder omzet. | 🟠 | Haal `Editions` uit de hoofdnavigatie en van de homepage tot het verkoopbaar is. |
| 18 live pagina's, EN+NL | 50× `"Photo to come"` / `"Foto volgt"`, o.a. op `/compare/`, `/catalog/`, `/lifestyle/`, `/custom-models/`, `/plans/` · plus `"Stand-in images — the walkthrough set is still being shot"` op `/how-it-works/` | Een visuele studio zonder beeld op de plekken waar het argument gevoerd wordt. Het bewijs van vakmanschap — de sterkste weerlegging van "dit is een tool" — ontbreekt. | 🟠 | Prioriteer beeld op `/compare/`, `/catalog/` en `/lifestyle/`. Eén echt voor-en-na per pagina weegt zwaarder dan tien tekstuele claims. |
| Site-breed | Nul testimonials, nul klantnamen, nul case studies, nul teamfoto's, nul namen van medewerkers. `"a specialist"` / `"een specialist"` is altijd anoniem en enkelvoud. | Sociaal bewijs is de belangrijkste conversiefactor voor een done-for-you dienst en ontbreekt volledig. Zonder menselijk bewijs valt de lezer terug op het goedkoopste verklarende model: automatisering. | 🟠 | Voeg 2–3 klantcitaten met merknaam toe op de homepage, en één foto met naam van de persoon die de beelden afwerkt op `/about/`. |
| `/how-it-works/` (EN+NL) | Kopregel `"More than AI. Finished by hand."` / `"Meer dan AI. Met de hand afgewerkt."` + `"The images are generated first, and then every one goes through a pair of hands."` | Een defensieve kop die het frame bevestigt dat hij ontkent: uitgangspunt is AI, wij zijn dat plus iets. De body beschrijft de machine als maker en de mens als nabewerker. | 🟠 | `"In de studio gemaakt, met de hand afgewerkt."` Body: `"Een specialist bouwt de scène, laat hem door onze productie lopen en werkt elk kader met de hand af."` |
| URL `/custom-models/` + nav `Your Brand Model` | "Custom model" is in de AI-wereld de standaardterm voor een fijngetrainde generator. De site gebruikt "model" bovendien in twee betekenissen: `"Pick a face"` (mens) naast `"The platform above offers a large number of models from different makers"` (`/privacy/`, AI). | Het vlaggenschip-upsellproduct draagt de meest AI-technische URL van de site. Dubbelzinnigheid precies op het woord dat verwarring veroorzaakt. | 🟠 | 301 naar `/brand-model/`. Gebruik `"gezicht"` waar mogelijk, zoals de homepage al doet met `"Pick a face — or claim one."` |
| H1 homepage (EN+NL) | `"You upload."` / `"Jij uploadt."` als eerste twee woorden van de site | `upload` is een softwarewerkwoord op de meest gelezen positie van het hele domein. In het Nederlands bovendien onnatuurlijk. | 🟡 | `"Jij stuurt je product in. Wij leveren de campagne."` / `"You send the product. We deliver the campaign."` Twee woorden, disproportionele opbrengst. |
| `/plans/`, `/start/plan/` | `"credits"` / `"tegoed"` (23×), meteen herdefinieerd als `"a place in the month"` / `"slots"` | Je herdefinieert alleen een woord dat je zelf hebt geïntroduceerd. "Credits" is het rekenwoord van generatieve tools. | 🟡 | Gebruik overal `"slots"` / `"plekken"`. De pagina zegt het zelf al: `"5 slots, not 5 new products."` |
| Navigatie, `How it works` → `VISUAILS Studio` | Productnaam in softwarepatroon (`merk + Studio`), botst met "studio" als bedrijfsomschrijving (`"The visual studio for clothing brands"`, `"a studio day"`). Bovendien is `/studio/` de kalenderpagina en `/portal/` het portaal. | Bezoeker moet raden of "Studio" het bedrijf of de app is. Interne naamgeving is inconsistent. | 🟡 | Noem het in de navigatie `"Je bestelportaal"` / `"Your order portal"` en reserveer "studio" voor het bedrijf. |
| Header, alle pagina's | `Log in` / `Inloggen` pal naast `Order` / `Bestellen` | Bij een dienst log je in bij je leverancier; bij een tool log je in om te werken. In deze context ligt de tweede lezing voor de hand. | 🟡 | Verplaats naar een minder prominente positie of hernoem naar `"Mijn bestellingen"` / `"My orders"`. |
| `/catalog/`, `/lifestyle/` (EN+NL) | `"Is this AI, and do I have to say so? — Yes, and we say so plainly…"` — vier keer identiek, plus varianten op `/faq/` en `/ai-act/` | Zes plekken voor één boodschap. Het antwoord begint met `"Yes"`, het slechtst mogelijke eerste woord voor een merkeigenaar die dit uit ongerustheid vraagt. | 🟡 | Herschrijf de opening: `"Jouw product fotografeer jij; alles eromheen bouwen wij. Die opbouw is AI-ondersteund, en de vermelding zit al in het bestand."` |
| Homepage `<meta name="description">` vs. pagina-inhoud | Meta: `"€149 a product, €65 from 20 up"` · hero: `"From €89 per product"` | 67% verschil tussen wat Google toont en wat de pagina zegt, op het eerste contactmoment. | 🟡 | Stem de metadescriptie af op het instaptarief `€89`, of benoem expliciet dat €149 het Complete-tarief is. |
| Hoofdnavigatie | `Hooks On request` en `Editions Soon` — 2 van 8 producten zijn niet bestelbaar | Een menu waarin een kwart van het aanbod niet gekocht kan worden, vertroebelt wat het hoofdproduct is. | 🟡 | Verplaats beide naar een `"In ontwikkeling"`-blok onderaan `/start/`, buiten het hoofdmenu. |
| `/start/catalog/`, `/start/complete/`, `/start/lifestyle/` | Zeven configuratievelden (stijl, aantal, kanaal, achtergrond incl. hex, hoeken, ratio) vóór de eerste foto. Alleen bij de gezichtskeuze bestaat `"We choose for you"`. | Kan bij een niet-technische oprichter het gevoel geven dat hij zélf de art direction doet. | 🟡 | Voeg boven stap 1 toe: `"Niet zeker? Laat elk veld staan; wij vullen het in en leggen het je voor."` Maak "wij beslissen" ook de standaard bij achtergrond en ratio. |
| `/faq/`, `/compare/` | `"tool"` 6× per pagina, incl. `"If a tool is enough for what you need, use the tool"` | Intellectueel eerlijk, commercieel duur: nodigt de lezer uit een alternatief te overwegen op het moment dat hij bijna klant is. Houdt VISUAILS bovendien in de tool-categorie. | 🟢 | Behouden op `/compare/` (daar hoort het), inkorten op `/faq/` waar de bezoeker al verder in de trechter zit. |
| `/faq/` | `"What you buy here is everything that happens after the image is generated."` · `/custom-models/`: `"What we sell is not the generation. It is the lock."` | Geen probleem maar een gemiste kans: de twee scherpste positioneringszinnen van de site staan in een dichtgeklapte accordeon en halverwege een subpagina. | 🟢 | Til één ervan naar de homepage, direct onder de vierstappenuitleg. |

---

## 9. PRIORITEITEN

### MUST FIX — maximaal 10, in volgorde van hefboom

1. **Herschrijf regel 3 van `dist/llms.txt`.** Haal `"An AI visual studio"` weg als categoriebenaming en zet AI in zin drie als methode. Dit is de zin die AI-assistenten citeren, en het is de goedkoopste fix met de grootste bereik-per-euro op de hele site.
2. **Vervang de trustbadge `"Every visual is carefully checked"` / `"Elke visual wordt zorgvuldig gecontroleerd"` door een maak-claim** — bijvoorbeeld `"Elke visual wordt in onze studio met de hand afgemaakt"` — en zet de controle-claim eráchter. Eén zin, 40 pagina's, en het breekt het mens-als-QA-patroon dat de "AI met een sausje"-lezing voedt.
3. **Zet één categoriezin op de homepage, direct onder de H1.** `"Een done-for-you contentstudio: jij stuurt je productfoto's, wij maken de content, jij publiceert."` De site bewijst dit al; hij zegt het alleen nooit.
4. **Herformuleer `/privacy/` §1 en `/terms/` §3** zodat de dienst vooropstaat en AI als productiemethode volgt. Juridisch even sluitend, en het zijn de twee zinnen die de rest van het web overneemt.
5. **Vervang de homepage-objectie `"Why not do it myself?"` door een werk-en-tijdvraag**, en stem de JSON-LD-FAQ af op de zichtbare labels (nu staat `"Why not just do this myself with an AI tool?"` in de structured data). Houd de AI-vraag, maar niet als tweede van vier vlak vóór de CTA.
6. **Herlabel homepage-stap 03 van `"Your dashboard"` / `"Je dashboard"` naar `"Jij keurt goed"` / `"Your approval"`**, en splits stap 02 zodat twee van vijf stappen aan VISUAILS-kant staan in plaats van één van vier.
7. **Schoon `/start/plan/` op.** Vervang `credits` → `plekken`, `upload` → `stuur in`, `dashboard` → `account`. Vier SaaS-woorden in twee zinnen op het incassoscherm is de zwaarst tool-geurende passage van de site.
8. **Voeg sociaal bewijs toe.** Twee of drie klantcitaten met merknaam op de homepage, en één foto met naam van de persoon die de beelden afwerkt op `/about/`. Nul testimonials en nul gezichten is het grootste ontbrekende tegenbewijs tegen de tool-lezing.
9. **Vul de belangrijkste `"Photo to come"`-plaatsen.** Prioriteit: `/compare/`, `/catalog/`, `/lifestyle/`. Eén echt voor-en-na weegt zwaarder dan tien tekstuele claims, en 50 lege beeldvakken op een beeldbureau is op zichzelf een positioneringsprobleem.
10. **Los de terminologische botsing rond "model" op.** 301 van `/custom-models/` naar `/brand-model/`, en gebruik "gezicht" waar het kan — zoals de homepage al doet met `"Pick a face — or claim one."`

### SHOULD FIX

- `/about/`: één alinea die uitlegt hoe het werk gemaakt wordt, in plaats van `"modern speed"` / `"moderne productiesnelheid"`.
- H1: `"Jij uploadt"` → `"Jij stuurt je product in"` / `"You send the product"`.
- Kopregel `"More than AI. Finished by hand."` → `"In de studio gemaakt, met de hand afgewerkt."`, en de body herschrijven zodat een specialist de scène bouwt in plaats van machine-output nabewerkt.
- `/gallery/`: `"real photo library"` → `"ons eigen werk — niets geleend, niets ingekocht"`. H2's `"Catalog photography"` / `"Lifestyle photography"` heroverwegen tegen de transparantiebelofte op `/ai-act/`.
- Navigatie: `VISUAILS Studio` → `Je bestelportaal`; `Log in` minder prominent of `Mijn bestellingen`.
- `Editions` en `Hooks` uit het hoofdmenu tot ze verkoopbaar zijn.
- Metadescriptie van de homepage afstemmen op `€89` in plaats van `€149`.
- Bestelformulier: één "laat ons dit invullen"-regel boven stap 1, en `"wij beslissen"` als standaard bij achtergrond en ratio zoals het dat al is bij het gezicht.
- `"Is this AI…?"` op `/catalog/` en `/lifestyle/`: niet met `"Yes"` beginnen maar met de rolverdeling.
- Til `"What you buy here is everything that happens after the image is generated"` uit de FAQ-accordeon naar de homepage.

### KEEP — wat nú juist goed werkt, en waarom

- **De CTA-discipline.** 96× `Order`, 48× `Start an order`, 48× `Try VISUAILS · €1`, en **nul** keer `Generate`, `Create`, `Start free`, `Sign up` of `Try the tool` over 120 pagina's. Dit is de belangrijkste reden dat de site niet als tool leest. Verander hier niets.
- **`"AI-powered"` = 0. `"AI workflow"` = 0. `"machine learning"` = 0.** Die woorden zijn bewust vermeden en dat werkt.
- **`What we make` / `Wat we maken` als eerste navigatielabel.** Een tool heeft "Product" of "Features". Dit is bureau-architectuur en het is de eerste zes woorden die een bezoeker leest.
- **`"We choose for you"` als standaardwaarde bij de gezichtskeuze in het bestelformulier**, met de verdediging erbij: `"This is the default, and it is a real answer — not a blank we will chase you about."` Dit is done-for-you in de interactie zelf, niet alleen in de copy. Breid dit patroon uit, verwijder het nooit.
- **De rolverdeling in `/how-it-works/`:** `"01 You, on the site"`, `"03 Us, before you pay"`, `"05 Us, in production"`, `"06 You, in your account"`. Consistent met het formulier, het portaal en de homepage. Nergens verschuiving.
- **De leverdatumbelofte.** `"No date is printed until the calendar clears it"` en `"It is the one promise on this site we would rather lose an order over than break."` Dit is iets wat een tool structureel niet kan bieden en het is de sterkste dienst-differentiator die de site heeft.
- **`/compare/`.** De shootdag als primaire vergelijking, de tool pas daarna onder `"And if you are weighing a self-serve tool"`, plus vier situaties waarin een shootdag wint (`"Where a shoot day still wins"`). Die volgorde is strategisch correct: hij plaatst VISUAILS naast fotografie, niet naast software.
- **De schema.org-data.** `Organization.description` en `knowsAbout` bevatten nul AI-termen en noemen `"Product photography"`, `"Product video production"`. Dit is wat Google structureel opslaat en het is correct.
- **`"What we sell is not the generation. It is the lock."`** en **`"What you buy here is everything that happens after the image is generated."`** De twee scherpste zinnen die VISUAILS heeft. Niet aanpassen — beter zichtbaar maken.
- **`"Light, background, model — built | Your product — photographed"`** (`/ai-act/`). De helderste uitleg van de rolverdeling op de hele site. Overweeg hem óók op `/how-it-works/` te zetten.
- **`"Four steps, and you film none of them."`** (`/hooks/`) De enige kop op de site die de done-for-you-belofte in vier woorden vangt. Gebruik dit patroon breder.
- **Het prijsmodel.** Per product, dalend met aantal, met BTW-uitleg en KVK-nummer. Een tool rekent per generatie of per maand. Deze prijslijst alleen al classificeert VISUAILS als dienstverlener.

---

## 10. DE EINDTEST

**De zin die een willekeurige bezoeker na het bekijken van de site over VISUAILS zou zeggen:**

> **"VISUAILS is een Nederlandse studio die van je telefoonfoto's kant-en-klare product- en lifestylebeelden voor je maakt, per product afgerekend — ze gebruiken daar AI bij en zeggen dat er eerlijk bij."**

### Welke van de twee komt er het dichtst bij?

Het zit **ertussenin**, en dichter bij de goede kant — maar niet volledig aan de goede kant. Ik zeg dat expliciet, want dat is de eerlijke uitkomst.

✅ **`"VISUAILS maakt professionele product-, lifestyle- en videocontent voor fashion brands, zodat zij dat zelf niet hoeven te doen."`**
Dit is duidelijk de dichtstbijzijnde van de twee. De site draagt het hele werkwoord "maken voor jou": `"We deliver the campaign"`, `"We build the visuals on your own product"`, `"We take it from there"`, `"Four steps, and you film none of them"`, `"We choose for you"`, per product afgerekend, met een gereserveerde leverdatum en een revisieronde. Op geen enkel punt wordt de klant gevraagd zelf iets te genereren.

❌ **`"VISUAILS is een AI-tool waarmee fashion brands zelf productfoto's kunnen genereren."`**
Deze is duidelijk **fout** en de site sluit hem effectief uit. Er is geen enkele generate-CTA, geen prompt-veld, geen gratis proefperiode, geen features-navigatie. Wie dit denkt, heeft de site niet gelezen.

**Waarom het er dan tóch tussenin zit, en niet volledig rechts:**

De zin die een bezoeker werkelijk zegt bevat **twee toevoegingen die de gewenste zin niet heeft**, en die de site zelf aanbrengt:

1. **"ze gebruiken daar AI bij"** — die staart zit erin omdat de site hem er zelf op zet: 2 van 4 objecties op de homepage, `"Yes"` als eerste woord van vier AI-antwoorden, `AI Act` permanent in de footer van alle 120 pagina's, en `"An AI visual studio"` als eerste zin van `llms.txt`. AI is geen achtergrondtechniek geworden maar een merkeigenschap die de bezoeker meeneemt in zijn samenvatting.
2. **"van je telefoonfoto's"** in plaats van **"professionele content"** — de site verkoopt het *proces* (jouw foto erin, beelden eruit) sterker dan het *resultaat* (professionele merkcontent). Het woord `"professioneel"` komt nauwelijks voor als kwalificatie van het eindproduct; `"professional editing software"` wel, maar dat gaat over gereedschap.

**Wat er nodig is om de zin volledig naar rechts te krijgen:**

De drie MUST FIX-ingrepen die daar direct aan bijdragen zijn: de categoriezin onder de H1 (die het woord "done-for-you" introduceert), de trustbadge van controleur naar maker (die "AI met een sausje" wegneemt), en `llms.txt` (die de AI-staart uit de tweedehands-samenvatting haalt). Met die drie verschuift de zin die een bezoeker zegt naar:

> *"VISUAILS is een studio die de product-, lifestyle- en videocontent voor je merk maakt, zodat jij dat niet zelf hoeft te doen."*

En dat is de gewenste zin, woord voor woord.
