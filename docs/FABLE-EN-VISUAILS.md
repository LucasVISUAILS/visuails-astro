# Wat Claude Fable 5.1 voor VISUAILS kan doen — met de nadruk op content

3 september 2026. Geschreven na het lezen van de projectmap (`README.md`, `WERKLIJST.md`, `PRODUCT.md`, `STIJL.md`, `SCHRIJFWIJZER.md`, `STEM-BRON.md`, `STOCK-IDEE.md`, `HOOKS-COPY-CONCEPT.md`, `MERKBEELDEN-22-AUGUSTUS.md`, `IMAGES.md`, de carousel-PNG's in de root), de Magnific-borden die aan dit account hangen, en wat er over Fable 5.1 en de reclamekanalen gepubliceerd is. Waar een getal uit een externe bron komt, staat de bron onderaan.

Twee dingen vooraf, zodat dit stuk eerlijk blijft.

**Fable 5.1 is een model, geen product.** Wat jij in de praktijk gebruikt is Claude in Cowork: het model plus de mappen, de skills, de connectors (Magnific, Adobe, Gmail, Drive, Agenda, Webflow, Chrome), de geplande taken en de artifacts. Bijna alles wat hieronder staat kon met Fable 5 ook, maar minder betrouwbaar over lange reeksen stappen. Wat 5.1 volgens Anthropic zelf toevoegt: beter volhouden op lange, onbeheerde taken zonder de draad kwijt te raken; betere browser- en desktopautomatisering die herstelt van een mislukte stap; scherper lezen van dichte documenten en beelden; een contextvenster van 1 miljoen tokens; en cache-reads die ruwweg een kwart kosten van Fable 5 — precies het soort werk (steeds dezelfde map en dezelfde regels opnieuw lezen) dat jouw sessies doen. Voor jou betekent dat concreet: langere batches, minder nakijken, en het wordt goedkoper om Claude elke keer de hele projectmap te laten meelezen in plaats van uit een oud werkgeheugen te werken — wat op 12 augustus vijf bestanden kostte.

**En het maakt geen beelden.** Fable 5.1 schrijft, leest, meet, plant, stuurt gereedschap aan en controleert. De beelden komen uit Nano Banana, Seedream en Seedance via Magnific, de afwerking uit Photoshop. Dat is de juiste rolverdeling, en dit stuk gaat over hoe je die twee kanten aan elkaar knoopt zodat er elke week veel uitkomt zonder dat het op jou hangt.

---

## 1 · Waar het bedrijf staat, in vijf regels

De site is af op een niveau dat de meeste dienstensites nooit halen: 97 pagina's, 4.873 groene toetsen, nul toegankelijkheidsbevindingen, een `llms.txt` die uit dezelfde bron komt als de prijzen. De bestelstroom, de agendacheck, Mollie, de facturen en het portaal bestaan. Wat er níet is, staat ook in de map, en het is bijna allemaal maakwerk in plaats van code: nul videovoorbeelden bij een dienst die video verkoopt, 42 placeholders (zes op de nieuwe Hookspagina), een galerij die de elf nieuwste merkbeelden nog niet heeft, één echt before/after-paar, geen promptbibliotheek, geen `utm_` in de hele codebase. Je eigen plan van eind augustus was: eerst dat gat dichten, dan de teksten nalopen, dan volledig over op reclame en directe sales — en je hebt gezegd dat je daar vanaf nu 20+ uur per week aan kunt geven.

Dat is de opdracht van dit document: die 20 uur zo inzetten dat er een contentmachine staat en niet een contentberg.

---

## 2 · Hoeveel content er nodig is, en wat voor soort

Voor betaald bereik geldt op Meta een simpele wet: wie meer creatives test, vindt meer winnaars, ook bij hetzelfde budget. Uit de data van Motion (analyse over accounts, 2026): in de laagste bestedingsklasse lanceert het gemiddelde account 2,8 nieuwe creatives per week en de beste 25 procent 4,8. Bij een winstpercentage van 5 tot 8 procent leveren 20 geteste advertenties per maand 1 tot 1,6 winnaars op, en 50 er 2,5 tot 4. De formaten met de hoogste trefkans zijn niet de duurste: tekst-only 11,6 procent, productbeeld met tekst 8,75 procent, UGC 7,56 procent — omdat ze snel te maken zijn en dus snel te vervangen.

Organisch geldt op Instagram in 2026 dat delen en verzenden het zwaarste signaal zijn, dan opslaan en reageren; carousels mogen 20 slides; reels tot 3 minuten komen op Explore; Trial Reels laten je een reel eerst aan niet-volgers tonen. Regelmaat telt zwaarder dan aantal.

Vertaald naar VISUAILS, met jouw 20 uur en jouw vier kanalen:

| Kanaal | Ritme | Wat |
|---|---|---|
| Instagram organisch | 4–5 posts per week + dagelijkse story | carousels (hoofdformaat), 1–2 reels, before/after |
| Threads | dagelijks 1–2 | tekst-first: inzendingen, meningen, tips |
| Meta ads | 5–8 nieuwe creatives per week | statics met tekst, before/after, korte hookvideo's; wekelijks de slechtste helft vervangen |
| TikTok | 3–4 verticale video's per week | native, ruw, hook in de eerste seconde; hookvideo's en proces |
| Google | eenmalig een assetset, daarna maandelijks bijvullen | Search op prijs- en vergelijkvragen; PMax met beeld in 1:1, 4:5, 1,91:1 en 9:16-video |

Dat is ruwweg 30 tot 40 losse contentstukken per week. Met de hand haal je dat niet en het hoeft ook niet met de hand: het meeste ervan is **hetzelfde beeld in een andere jas**. Eén product dat door de catalogus- en lifestylepijplijn gaat, levert een before/after, een carousel "één foto, vier richtingen", drie statics met verschillende hook, een TikTok-proces-clip en twee ad-varianten. De machine hieronder is gebouwd op die vermenigvuldiging.

---

## 3 · De contentmachine

### 3.1 De bron: elke bestelling en elk eigen product is een contentmoment

Vandaag is de galerij hardgecodeerd (38 beelden) en staan de nieuwste merkbeelden er niet in. Dat is het symptoom van iets groters: er is geen plek waar "dit beeld is af en mag naar buiten" wordt vastgelegd. Voorstel: een map `content/` in de projectmap, met per contentstuk één kort `brief.md` (onderwerp, format, kanaal, hook, bronbeelden, status) en de exportbestanden ernaast. Geen tweede systeem — precies zoals `STOCK-IDEE.md` §6 het voor Editions zegt. Claude leest die map aan het begin van elke sessie, net als nu de repo, en werkt er in door.

Belangrijk daarbij: klantbeelden mogen alleen naar buiten met toestemming, en de site belooft "geen klantnaam". Het eigen productassortiment (de grijze tee, de hoodie, de laarzen) en de tien vaste modellen zijn dus de hoofdbron, klantwerk alleen geanonimiseerd en met een vinkje in het portaal — dat vinkje is een kleine toevoeging aan de tevredenheidsvraag die er al staat.

### 3.2 Beeld: van stijlprompt naar batch

Je hebt zes sjabloonborden in Magnific Spaces staan (GLOW, FLASH, PHONE, AUGUST, HAZARD, CATALOG) en drie pose-plate-borden. Dat is het fundament, en het is via de Magnific-connector rechtstreeks vanuit Cowork aan te sturen: `spaces_run` draait zo'n bord met een nieuw productbeeld, `creations_wait` haalt het resultaat op, en de uitkomst gaat als bestand terug de map in. Dat betekent dat een batch van "dit product, in alle vijf lifestylestijlen, elk drie scènes" één opdracht is, geen middag.

Wat 5.1 daaraan toevoegt is het volhouden: vijftien generaties afwachten, mislukte runs opnieuw doen, de uitkomst op productnauwkeurigheid nakijken (past de print, is de kraag dezelfde) en alleen de goede doorzetten. Het nakijken doet het model op het beeld zelf — het leest beelden beter dan Fable 5 — maar het vervangt jouw laatste blik niet. Wat het wél vervangt is het wachten en het sorteren.

Het maken van stijlprompts zelf noemde je "tijdrovend en creatief uitputtend". Daar is de `visuails-style`-skill al voor, met jouw regels erin (vertrek vanuit een moment waarvoor mensen zich aankleden; een nicheterm altijd uitpakken met wie het doet en met welk lichaamsdeel). Nieuw voorstel: elke stijl die goed bleek, wordt als `styles/<naam>.md` in de map gezet met de versie die werkte, de scènes die goed uitkwamen en het Spaces-bord-id erbij. Dat is de promptbibliotheek uit `WERKLIJST.md` §10, maar dan als bestanden in plaats van als databasetabel — sneller, en Claude leest ze vanzelf.

### 3.3 Afwerking: het deel dat nu 10 tot 20 minuten per beeld kost

Dit is de grootste tijdvreter en tegelijk het minst automatiseerbare deel, omdat jij het in Photoshop doet en dat zo wilt houden. Drie dingen halen er wel tijd af:

Het batchscript `VISUAILS-afwerken.jsx` bestaat al (Select Subject, twee schaduwlagen, vulkleur uit een hex, PNG+JPG per map). Claude kan het onderhouden en uitbreiden — per klant een hex-constante uit `customer_style_locks`, per marktplaats wit — zodat het per bestelling zonder handwerk klaarstaat.

Voor eigen content (niet klantwerk) hoeft de Photoshop-pas niet: de Adobe-connector kan achtergrond verwijderen, uitsnijden, helderheid en kleurtemperatuur bijstellen en korrel toevoegen, en Magnific kan opschalen, herbelichten en uitbreiden naar een ander formaat. Voor een carousel-slide of een ad-static is dat genoeg. Bewaar Photoshop voor wat een klant betaalt.

En de C2PA-markering: de jpg's en png's van de modelaanbieder dragen hem, webp-omzetting wist hem (getest 3 augustus). Voor eigen social content is dat geen probleem — daar plaats je de zichtbare vermelding zelf — maar de exportstap moet dit weten en niet stilletjes een gemarkeerd bestand ongemarkeerd maken. Dat is een regel in het exportscript en een toets, geen extra werk per beeld.

### 3.4 Opmaak: de carousel-sjablonen die je al hebt

De vijf carousel-PNG's in de root (Free Style Friday) laten zien dat de opmaak al staat: donker, Big Shoulders, toxic green als één accent, twee tegels met label, voettekst met paginanummer. Dat is HTML in de huisstijl, gerenderd naar PNG — dezelfde route als `scripts/make-og.mjs`. Voorstel: dat wordt een vast script, `scripts/post-render.mjs`, met een handvol sjablonen (hook-tegel, before/after, vier-richtingen-raster, tekst-only quote, stappen, CTA) die hun kleuren en letters uit `src/styles/global.css` lezen — de bron waar de styleguide nu ook uit komt. Dan is elke post per definitie in de huisstijl en verandert hij mee als de huisstijl verandert.

Vanaf dat moment is een carousel: één `brief.md` met vijf regels tekst en vijf beeldverwijzingen, en Claude rendert de vijf slides in 1080×1350 plus een 1:1 en een 9:16 voor stories en ads. Tien carousels per week zijn dan een uur nakijken, geen dag maken.

### 3.5 Copy: in jouw stem, en getoetst

Je hebt meerdere keren vastgesteld dat AI geen goede spreektaal schrijft voor de site, en dat je launchteksten daarom zelf schrijft. Dat blijft zo, maar social copy is een ander soort tekst: kort, in series, en het moet vaak vervangen worden. Daar werkt een andere verdeling: Claude schrijft per post drie tot vijf hookvarianten in het Nederlands als brontaal (STIJL.md), jij kiest of herschrijft, en wat jij verandert gaat — zoals je op 24 augustus vroeg — in `SCHRIJFWIJZER.md` terug. Na een paar weken zijn de eerste versies bruikbaarder omdat ze uit jouw correcties komen, en dat is meetbaar: het aantal woorden dat jij nog verandert per post.

De regels die er al zijn, gelden ook hier en horen als toets op de contentmap te staan, zoals `tests/nav.test.mjs` dat voor de site doet: geen uitkomst beloven (geen "meer volgers", wel "de beste kans op"), "stock" alleen ontkend, gedachtestreepje met spaties, de apostrof als ’, geen "magie" en geen "de scroll stoppen", en niets dat zegt dat een merk groter "lijkt". Een `content-keuring`-script dat elke `brief.md` daarop naleest voordat er iets gerenderd wordt, kost een uur bouwen en voorkomt dat een post in de feed hetzelfde doet als de Hookspagina op 18 augustus.

Engels blijft de hoofdversie van de Instagram-posts, Nederlands als gerichte inzet — dat besluit staat. Claude vertaalt de gekozen versie met eigen zinsgrenzen, niet zin voor zin.

### 3.6 Video: het grootste gat, en het meest gevraagde format

Er is nul video op een site die video verkoopt, en zowel Meta als TikTok als PMax vragen erom. Via de Magnific-connector staan Seedance 2.0 (referentiebeelden, productreferentie, camerabewegingen, eigen geluid, tot 15 seconden, tot 4K) en Kling 2.5 (goedkoper, start-/eindframe) klaar. Drie formats die met de bestaande beelden te maken zijn, zonder dat er iets gefilmd wordt:

Het *hookformat* dat je zelf beschreef, de canvas break waarbij de video doorloopt in het beeld eronder — met een start- en eindframe uit je eigen catalogusbeelden is dat precies wat Kling met keyframes doet. Dat levert meteen het herobeeld voor `/hooks` op, de zes placeholders en het eerste videovoorbeeld op `/video`.

Een *proces-clip*: ruwe telefoonfoto, dan het geleverde beeld, dan een tweede en derde stijl, met de tekst "je uploadt, wij leveren de campagne". Dat is de hoofdboodschap in vijftien seconden en het is een ad-creative, een TikTok en een reel tegelijk.

Een *modelintroductie* per vast model uit de roster: hetzelfde gezicht in drie stijlen. Tien modellen, tien reels, en het beantwoordt de vraag "zijn dit echte foto's" voordat iemand hem stelt.

Claude kan de clips plannen (`video_plan`), genereren, wachten, de bruikbare doorzetten en in DaVinci-klare mapjes zetten. De montage en het geluid blijven bij jou, of gaan met een korte onderbouwing ook door de connector (Seedance heeft eigen geluid; er is TTS en muziekgeneratie beschikbaar, maar of dat bij de merkstem past is jouw oordeel).

### 3.7 Planning en ritme: geplande taken

Cowork kan taken op vaste tijden draaien, in een verse sessie, met toegang tot de map. Dat maakt het ritme onafhankelijk van of jij eraan denkt:

*Maandagochtend* — de weekbatch: Claude leest `content/`, stelt uit de openstaande briefs en de series (hieronder) de planning van de week voor, rendert wat klaar is, en zet een lijst met wat jij nog moet kiezen. Jij begint de week met nakijken in plaats van met bedenken.

*Donderdag* — Free Style Friday voorbereiden: de inzendingen van de week verzamelen (via Threads/DM lees jij ze zelf; de namen zet je in een bestand), de gekozen inzending door het CATALOG-bord halen, de vijf slides renderen.

*Vrijdagmiddag* — de ad-ronde: welke creatives zijn een week oud, welke halen de drempel niet, welke drie hooks komen ervoor in de plaats. Meta Ads Manager heeft geen connector; de cijfers exporteer jij of laat je Claude via Chrome uitlezen, en de vervangers staan maandag klaar.

*Elke nacht* — een galerijcheck: nieuwe beelden in `public/img/` die nergens gebruikt worden (`npm run beelden` bestaat al) en briefs zonder status. Klein, maar het is precies het soort achterstand dat nu twee weken blijft liggen.

### 3.8 De series — wat er elke week terugkomt

Een machine draait op vaste formats, niet op losse ideeën. Deze acht komen uit wat er al is of al besloten was:

**Free Style Friday** (giveaway, loopt al) — wekelijks, vijf slides, plus de gekozen inzending als losse before/after de week erna.
**Before / after** — het overtuigendste wat je hebt en er staat er één op de site. Elk eigen product en elk vrijgegeven klantproduct levert er een op; doel: vier echte paren binnen twee weken, want `gallery.astro` wacht daar letterlijk op.
**Eén foto, vier richtingen** — carousel 2 uit je set; per product één keer.
**Eén moment, vijf stijlen** — hetzelfde kledingstuk in GLOW, FLASH, PHONE, AUGUST, HAZARD; laat de stijlen zien en verkoopt lifestyle.
**Threads-inzendingen** — het idee van augustus: mensen sturen een product, jij maakt er een post van in een sitestijl; de inzenders komen terug om te kijken. Dat is Free Style Friday in tekstvorm, dagelijks.
**De specialist kijkt na** — proces- en vertrouwenscontent: wat je afkeurt en waarom, de vier aanleverfoto's, het portaal. Dit beantwoordt het bezwaar "ziet AI er goedkoop uit" met de controle in beeld, precies zoals `PRODUCT.md` het zegt: het werk vóór de claim.
**De tips voor merken** — de educatieve pijler uit de Playbook, als tekst-only tegels (het format met de hoogste trefkans op Meta) en als Threads-posts, met de pdf als comment-to-DM.
**De bezwaren** — de drie vragen die op de homepage staan (`HOME_OBJECTION_QUESTIONS`) en de 130 vragen met antwoord die over de site verspreid staan: elk een kandidaat voor een tekst-only ad. De dertig scherpste zijn dertig ad-creatives uit tekst die al getoetst en goedgekeurd is.

### 3.9 Waar de klik naartoe gaat, en hoe je dat meet

`WERKLIJST.md` §11 stelt de vraag en de code geeft het antwoord: nergens `utm_`. Voordat de eerste advertentie loopt, hoort dat er te zijn: een `utm_source`/`utm_content`-kolom op `funnel_hits` en `orders`, zodat je op `/admin/funnel` per creative ziet wie er is begonnen en wie heeft afgerond. Dat is een middag code, en zonder dat is "welke hook verkoopt" — wat je expliciet wilt weten — een gevoel in plaats van een getal. Posts linken naar `/start/catalog`, `/test-sample` of de dienstpagina, nooit naar de homepage; de knoptekst zegt wat er achter de knop gebeurt, dezelfde regel als op de site.

---

## 4 · Buiten content: waar Fable 5.1 nog meer tijd weghaalt

**Klantenwerving.** Koud bellen mag niet meer bij eenmanszaken en vof's, dus het is social plus koude e-mail. De `company-prospect-list`-skill zet losse notities om in een shortlist; met de Gmail-connector kan Claude per prospect een concept in de map Concepten klaarzetten dat jij leest en verstuurt — nooit onbeheerd verzenden. Een wekelijkse geplande taak die twintig nieuwe merken opzoekt (Instagram, marktplaatsen, nieuwe webshops) en hun beeldkwaliteit beoordeelt, vult die lijst zonder dat jij zoekt.

**Productie per bestelling.** Vandaag: bestelling binnen, jij bedenkt per klant de workflow, zeker bij custom. Met de briefs uit `/admin/customers/:id` (achtergrond, modellen, kanalen, materiaal, kleur) kan Claude per bestelling een productieplan schrijven en de Spaces-runs klaarzetten, en na jouw afwerking het leverpad aanroepen (`scripts/deliver.mjs` en `tag-delivery.mjs` bestaan). De prompt-aan-bestelling-koppeling uit §10 wordt dan een bijproduct: het plan staat in `order_notes`.

**Administratie.** Dat was volgens jou de grootste tijdvreter naast rondsturen. Facturen en creditnota's komen al uit de code. Wat Claude erbij kan doen: een wekelijkse samenvatting uit D1 (bestellingen, omzet, trechter, openstaande betalingen, reviews) als artifact, en de btw-kwartaalexport (ICP-opgaaf) voorbereiden. Moneybird stond op je lijst; dat is een besluit, geen bouwwerk.

**Reviews.** De nummer één op je lijst. De vraag staat in portaal en dashboard; het testimonialblok op de homepage leest `order_feedback` nog niet. Dat is één van de open punten van 23 augustus en het is klein.

**De site.** Dat blijft lopen zoals nu. Wat er nog ligt en jouw besluit vraagt: de datum per pagina uit git (een uur, en het is de grootste GEO-post), AI-crawlers expliciet toestaan in `robots.txt`, en het gewicht voor `KIND_IMAGES.hooks` zodat Hooks bestelbaar wordt — dat getal is te meten zodra de eerste drie hookvideo's uit §3.6 gemaakt zijn.

---

## 5 · Wat dit niet oplost, en waar je op moet letten

**Jouw laatste blik blijft de bottleneck, en dat is goed.** De site belooft "een specialist kijkt na". De machine maakt meer en sorteert voor; ze levert niet zonder jou. Reken op een vast uur per dag nakijken, en plan dat in plaats van te hopen dat het ertussen past.

**Kosten.** Elke Magnific-run kost credits; Seedance in 4K is niet goedkoop. Laat Claude vóór een batch `simulate_cost` draaien en de prijs melden, en houd eigen content op de snelle modellen (Nano Banana 2 Lite, Kling 720p) en klantwerk op de beste.

**AI-labels.** Op Meta en TikTok geldt een zichtbare AI-vermelding voor realistische AI-beelden, en de AI Act-regel (art. 50) geldt sinds augustus voor wat jij levert. De C2PA-markering en de zichtbare vermelding staan al in je leverstroom; op je eigen posts moet de vermelding er ook op, en het is beter er open over te zijn dan erop betrapt te worden — de "specialist kijkt na"-serie is daar de positieve versie van.

**Consistentie is geen model-eigenschap.** Nano Banana geeft een andere achtergrondkleur bij elke run; dat wist je al. Wat consistent maakt is de vergrendelde prompt, het sjabloon dat uit `global.css` leest, de toets op de tekst, en één map waar alles doorheen gaat. Fable 5.1 houdt dat vol over lange reeksen; het bedenkt het niet voor je.

**Geen bereik beloven — ook niet aan jezelf.** Motion's cijfers zijn gemiddelden over veel accounts. Reken op weken van testen voordat er een winnaar is, en beoordeel op deelacties, opslaan en `/start`-starts, niet op likes.

---

## 6 · De eerste veertien dagen

Dag 1–2: de `content/`-map en `scripts/post-render.mjs` met de eerste vier sjablonen, uit `global.css`; `utm_` op de trechter; het `content-keuring`-script. Dat is code en het is klein.

Dag 3–5: de eerste batch. Vier before/after-paren van eigen producten, "één foto, vier richtingen" voor twee producten, de drie bezwaren als tekst-only tegels, en de eerste hookvideo via Kling met start- en eindframe. Alles naar de map, jij kijkt na.

Dag 6–7: de drie geplande taken zetten (maandag, donderdag, vrijdag) en één week op proef draaien.

Week 2: de eerste vijf ad-creatives live op Meta met UTM, de eerste drie TikToks, dagelijks Threads, en op vrijdag de eerste vervangronde. `/video` krijgt zijn eerste twee echte voorbeelden en de galerij de elf beelden die er al liggen.

Daarna is het ritme: maandag nakijken wat er klaarstaat, door de week kiezen en plaatsen, vrijdag vervangen wat niet werkt. Het doel voor eind september is niet "veel posts" maar vier dingen die je nu niet hebt: video op de site, veertig ad-creatives getest, een galerij die bij is, en een getal per hook.

---

## Bronnen

- Anthropic — [Introducing Claude Fable 5.1 and Claude Mythos 5.1](https://www.anthropic.com/claude-fable-and-mythos-5-1)
- Claude Platform Docs — [What's new in Claude Fable 5.1](https://platform.claude.com/docs/en/models/fable-5-1/whats-new-fable-5-1)
- Motion — [Meta Ads in 2026: How Many Creatives Do You Actually Need to Launch?](https://motionapp.com/library/talk/meta-ads-in-2026-how-many-creatives-do-you-actually-need-to-launch/)
- Later — [Instagram algorithm in 2026](https://later.com/blog/how-instagram-algorithm-works/)
- Techsy — [Claude Cowork Guide 2026](https://techsy.io/en/blog/claude-cowork-guide)
- Projectmap `visuails-astro`: `README.md`, `WERKLIJST.md`, `PRODUCT.md`, `STIJL.md`, `SCHRIJFWIJZER.md`, `STEM-BRON.md`, `STOCK-IDEE.md`, `HOOKS-COPY-CONCEPT.md`, `MERKBEELDEN-22-AUGUSTUS.md`, `IMAGES.md`
- Magnific-account: de Spaces-borden en de modelcatalogus (Seedream 5 Pro, Nano Banana 2/2 Lite, Recraft V4.1, Seedance 2.0, Kling 2.5)
