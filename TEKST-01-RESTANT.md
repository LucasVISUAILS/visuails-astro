# TEKST-01 · wat er nog niet is toegepast

> **AFGEROND OP 25 AUGUSTUS 2026.** Alle 60 velden hieronder staan inmiddels op
> de site, elk met de interpolatie erin waar hij hoorde. Dit document blijft
> staan als verantwoording — het legt per zin uit waarom hij niet door het
> toepasscript kon en wat er in plaats daarvan is gebeurd.
>
> Wat de precisieronde opleverde, per zin, met de bronregel en wat die oplevert:
> het goedkeuringsblad `precisieronde-tekst-01.html`. Twee zinnen daarin botsen
> met de revisieronde en wachten op een beslissing — home-091 EN en NL.
>
> Twee echte fouten kwamen bij dit werk boven water, allebei van dezelfde soort:
> een LABEL dat de zin in lekte. `turnaround('unattended')` geeft "Estimated
> delivery: 2–4 working days" en "Meestal 2–4 werkdagen", en de zin zette daar
> "in " respectievelijk "Binnen " voor. Op de site stond dus letterlijk *"in
> VISUAILS Studio in estimated delivery: 2–4 working days"* en *"Binnen Meestal
> 2–4 werkdagen"*. Beide staan nu op `turnaroundShort()`, dat hetzelfde getal
> zonder label geeft.

60 velden over 31 zinnen. Ze zijn niet vergeten en niet mislukt:
ze staan in de bron niet als losse zin, maar samengesteld — uit een array,
uit een template met een prijs of aantal erin, of uit twee losse sleutels die
pas bij het renderen aan elkaar komen.

**Waarom dat uitmaakt.** Jouw versie spelt vaak uit wat de code interpoleert.
`Test sample: ... 4 catalog photos or a 3-photo lifestyle carousel` staat in de
bron als `${sample.deliverable}` en komt uit pricing.js. Klakkeloos toepassen zet
dat getal vast op de homepage; verander je het aanbod, dan liegt de pagina.
Ze moeten dus stuk voor stuk terug in hun sjabloon, met de interpolatie erin.

---

## Vier zinnen die hier NIET in staan en toch niet door het script gingen

Bij het nalopen op 25 augustus meldde de droogloop 35 zinnen die niet meer in de
bron te vinden waren, en dit document beschrijft er 31. Het verschil is geen
misser: het zijn de vier waar in het gesprek iets aan veranderde voordat ze
erin gingen, waardoor ze noch als oude noch als nieuwe zin nog te matchen zijn.
Ze staan alle vier op de site. Hier is wat er anders werd en waarom.

**home-013 — het kastlijntje kreeg spaties.** Jouw zin schreef
`lacks—imagery` en `mist—gemaakt`, zonder spaties aan weerszijden. Dat is de ene
tekenregel die de site overal aanhoudt (SCHRIJFWIJZER.md §5: 3.666 keer mét,
5 keer zonder) en `tests/schrijfwijze.test.mjs` gaat er rood op. De woorden zijn
onveranderd; er staan twee spaties bij.

**home-017 — de belofte werd een kans.** Jouw zin: *"engineered to boost
engagement and grow your following"*. Dat belooft een uitkomst die van het
platform en de timing afhangt en niet van het werk, en `tests/nav.test.mjs`
houdt dat tegen. Jouw eigen oplossing, op de vraag ernaar: *"Kan je dit ook niet
framen als in dat het kan dat je betrokkenheid kan vergroten en meer volgers kan
aantrekken."* Er staat nu `built to give a post its best chance at more
engagement and new followers` / `gebouwd om je post de beste kans te geven op
meer betrokkenheid`.

**home-024 — "niet exclusief" werd "gaat ook naar andere merken".** Jouw zin
zei dat de set niet exclusief is; op de vraag welke van twee formuleringen het
moest worden koos je: *"Zeg er expliciet bij dat andere merken hem ook krijgen."*
Dat is een zwaardere mededeling dan "niet exclusief", en dat hoort het te zijn —
je klanten zijn kledingmerken en dus elkaars concurrenten.

**home-036 — ongewijzigd overgenomen, maar de zin eromheen was al veranderd.**
Deze staat er letterlijk zoals jij hem schreef (`Lock in dedicated production
capacity…` / `Kies voor vastigheid met ons maandplan…`). Hij komt in de droogloop
alleen niet meer voorbij omdat de brontekst waarnaar het script zoekt intussen
door een andere ronde was vervangen.

---

### home-002 · EN

**staat nu**  Test sample: your own photos in, 4 catalog photos or a lifestyle carousel of 3 photos back. One per business.

**jouw versie**  Test sample: Upload your own product and receive 4 catalog photos or a 3-photo lifestyle carousel in return. Limit: 1 per business.

*bron*  src/components/HomeV2.astro

### home-002 · NL

**staat nu**  Proefvisual: je eigen foto’s erin, 4 catalogbeelden of een lifestyle-carousel van 3 foto’s terug. Één per bedrijf.

**jouw versie**  Proefvisual: Upload je eigen product en ontvang 4 catalogusbeelden of een lifestyle-carrousel van 3 foto’s terug. Maximaal 1 per bedrijf.

*bron*  src/components/HomeV2.astro

### home-004 · EN

**staat nu**  This is what came in. This is what went out.

**jouw versie**  Your raw image → Our final studio visual

*bron*  src/components/HomeV2.astro

### home-004 · NL

**staat nu**  Dit kwam binnen. Dit ging eruit.

**jouw versie**  Jouw ruwe foto → Onze studioproductie

*bron*  src/components/HomeV2.astro

### home-009 · EN

**staat nu**  A phone photo in daylight is enough to start. If yours are worse than this one, send them anyway for an honest answer. What makes a usable photo

**jouw versie**  A well-lit phone photo is all you need to get started. Unsure about your photos? Send them over via WhatsApp or email — we'll give you an honest assessment.

*bron*  src/components/HomeV2.astro

### home-009 · NL

**staat nu**  Een telefoonfoto bij daglicht is genoeg om te beginnen. Twijfel je of jouw foto goed genoeg is? Stuur er één, dan zeggen we eerlijk wat we ervan kunnen maken. Wat een bruikbare foto is

**jouw versie**  Een goed belichte telefoonfoto is al genoeg om te beginnen. Twijfel je over je foto's? Stuur ze door via WhatsApp of e-mail — we geven je een eerlijk advies.

*bron*  src/components/HomeV2.astro

### home-010 · EN

**staat nu**  What we make, and what lands in your folder.

**jouw versie**  What we create. What lands in your inbox.

*bron*  samengesteld uit losse sleutels

### home-010 · NL

**staat nu**  Wat we maken, en wat er in je map belandt.

**jouw versie**  Wat wij maken. Wat jij ontvangt.

*bron*  samengesteld uit losse sleutels

### home-018 · EN

**staat nu**  Before it is delivered: the product has to stay recognisable and the join has to line up. It is in VISUAILS Studio in typically 2–4 working days, where you approve it or say what is wrong.

**jouw versie**  Before final delivery, we verify product accuracy and ensure every image transition aligns seamlessly. Your assets land in VISUAILS Studio within 2–4 working days for your review, feedback, or instant approval.

*bron*  src/components/HomeV2.astro

### home-018 · NL

**staat nu**  Voordat hij geleverd wordt: het product moet herkenbaar blijven en de naad moet kloppen. Binnen Meestal 2–4 werkdagen staat hij in VISUAILS Studio, waar je hem goedkeurt of zegt wat er niet klopt.

**jouw versie**  Vóór oplevering garanderen we dat het product waarheidsgetrouw is en alle aansluitingen naadloos overlopen. Binnen 2–4 werkdagen staat het resultaat klaar in VISUAILS Studio voor jouw goedkeuring of feedback.

*bron*  src/components/HomeV2.astro

### home-027 · NL

**staat nu**  Eén prijs per product. Die zakt als je er meer doet.

**jouw versie**  Heldere tarieven met ingebouwde volumekorting: hoe groter je bestelling, hoe lager de prijs per product.

*bron*  src/components/HomeV2.astro

### home-028 · EN

**staat nu**  A product is the unit — a catalog set and a lifestyle carousel, 7 finished images. Take the pair or either half, and the rate comes down as the count goes up.

**jouw versie**  Each product unit includes 7 finished images: a complete catalog set plus a lifestyle carousel. Order the full package or select either set individually—with rates dropping automatically as your order count grows.

*bron*  src/components/HomeV2.astro

### home-028 · NL

**staat nu**  Je betaalt per product. Bij een compleet product horen een catalogset en een lifestyle-carousel: 7 afgewerkte beelden. Je kunt ook alleen catalog of alleen lifestyle nemen, en hoe meer producten je bestelt, hoe lager het tarief.

**jouw versie**  Eén productunit bevat 7 afgewerkte beelden: een complete catalogusset én een lifestyle-carrousel. Bestel het volledige pakket of kies een van beide sets los — waarbij de prijs per product automatisch daalt naarmate je volume groeit.

*bron*  src/components/HomeV2.astro

### home-034 · EN

**staat nu**  The rate is the rate. No first-order discount and nothing to negotiate — 14 complete products is €1,190, whoever you are and whenever you ask.

**jouw versie**  Our pricing is fixed and transparent. No introductory discounts, no negotiations—14 complete products come to €1,190, flat, for every brand.

*bron*  src/components/HomeV2.astro

### home-034 · NL

**staat nu**  Het tarief is het tarief. Geen kennismakingskorting en niets om over te onderhandelen — 14 complete producten kosten €1.190, wie je ook bent en wanneer je het ook vraagt.

**jouw versie**  Onze tarieven staan vast. Geen welkomstkortingen en geen onderhandelingen—14 complete producten kosten €1.190, voor iedereen en op elk moment.

*bron*  src/components/HomeV2.astro

### home-035 · EN

**staat nu**  A video clip is €69, the same rate inside an order or on its own. Your Brand Model is €450 once — not per image, not per order, not per year.

**jouw versie**  Video clips are €69, whether added to an order or booked standalone. Your Brand Model is a one-time €450 fee — not per image, not per order, and not per year.

*bron*  samengesteld uit losse sleutels

### home-035 · NL

**staat nu**  Een videoclip is €69, hetzelfde tarief binnen een bestelling of los. Je merkmodel is eenmalig €450 — niet per beeld, niet per bestelling, niet per jaar.

**jouw versie**  Een videoclip kost € 69, zowel los te boeken als toegevoegd aan een bestelling. Jouw Merkmodel is eenmalig € 450 — niet per foto, niet per order en niet per jaar.

*bron*  src/components/HomeV2.astro

### home-039 · EN

**staat nu**  Priced below the per-product rate for the same output — 3 plans, monthly or yearly.

**jouw versie**  Discounted below our single-order rates for the exact same deliverables — choose from 3 flexible plans, billed monthly or yearly.

*bron*  src/components/HomeV2.astro

### home-039 · NL

**staat nu**  Onder de prijs per product voor dezelfde output — 3 plannen, per maand of per jaar.

**jouw versie**  Scherper geprijsd dan ons losse producttarief voor exact dezelfde visuals — keuze uit 3 abonnementen, maandelijks of jaarlijks gefactureerd.

*bron*  src/components/HomeV2.astro

### home-040 · EN

**staat nu**  5 slots, not 5 new products.

**jouw versie**  5 production slots, not 5 new products — use your monthly quota for new collection drops, re-shoots, or existing SKUs.

*bron*  samengesteld uit losse sleutels

### home-040 · NL

**staat nu**  5 plekken, geen 5 nieuwe producten.

**jouw versie**  5 flexibele slots, niet 5 nieuwe producten — zet je maandelijkse capaciteit in voor nieuwe drops óf het herfotograferen van bestaande artikelen.

*bron*  samengesteld uit losse sleutels

### home-041 · EN

**staat nu**  A credit is a place in the month, not a demand that you have something new. You decide each month what goes in it: a new item, an item you already sell in a different look for a campaign, or a set made for your socials. What you do not use rolls over a month.

**jouw versie**  A credit guarantees your studio capacity — no new inventory required. Choose each month how to deploy it: a new product release, a campaign re-style for existing items, or dedicated social content. Unused credits roll over to the next month.

*bron*  src/components/HomeV2.astro

### home-041 · NL

**staat nu**  Een credit is een plek in de maand, niet de eis dat je iets nieuws hebt. Jij bepaalt elke maand wat erin gaat: een nieuw item, een item dat je al verkoopt in een andere look voor een campagne, of een set die je voor je socials maakt. Wat je niet gebruikt schuift een maand door.

**jouw versie**  Een credit garandeert jouw plek in de maand, zonder de verplichting dat je een nieuw product moet aanleveren. Jij bepaalt elke maand de invulling: een nieuw artikel, een nieuwe campagneshoot van een bestaand item, of een set voor je socials. Niet-gebruikte credits neem je mee naar volgende maand.

*bron*  src/components/HomeV2.astro

### home-042 · EN

**staat nu**  Not sure what to spend the rest on? Ask us and we will go through it with you

**jouw versie**  Unsure how to allocate your remaining credits? Reach out — we’ll walk through the best options for your brand together.

*bron*  src/components/PlansPage.astro

### home-042 · NL

**staat nu**  Weet je niet waar je de rest aan besteedt? Vraag het ons, dan lopen we het samen door

**jouw versie**  Twijfel je hoe je je resterende credits het beste inzet? Neem contact op — we lopen de opties graag samen met je door.

*bron*  src/components/PlansPage.astro

### home-047 · EN

**staat nu**  20 new stock visuals every month

**jouw versie**  20 universal stock visuals delivered monthly, included in every subscription — brand-neutral mood content, zero products needed.

*bron*  samengesteld uit losse sleutels

### home-047 · NL

**staat nu**  20 nieuwe stockbeelden per maand

**jouw versie**  20 universele sfeer-visuals per maand, inbegrepen bij elk abonnement — merk-neutrale stockfotografie, zonder dat je producten hoeft in te sturen.

*bron*  samengesteld uit losse sleutels

### home-050 · EN

**staat nu**  20 on-brand visuals a month

**jouw versie**  20 custom on-brand visuals delivered monthly. Exclusively styled and edited to seamlessly match your visual identity.

*bron*  samengesteld uit losse sleutels

### home-050 · NL

**staat nu**  20 on-brand beelden per maand

**jouw versie**  Elke maand 20 op maat gemaakte merk-visuals. Exclusief gestyled en bewerkt om naadloos aan te sluiten bij jouw visual identity.

*bron*  samengesteld uit losse sleutels

### home-054 · EN

**staat nu**  Your own product, fully pictured for €1.

**jouw versie**  See your product fully captured for €1 — test our studio quality with zero commitment.

*bron*  src/components/HomeV2.astro

### home-054 · NL

**staat nu**  Jouw eigen product volledig in beeld voor €1.

**jouw versie**  Ervaar de studiokwaliteit: jouw product compleet in beeld gebracht voor €1.

*bron*  src/components/HomeV2.astro

### home-055 · EN

**staat nu**  Not on a garment we chose — on yours, through the same production as a paid order, checked by the same specialist. Back come 4 catalog photos or a lifestyle carousel of 3 photos.

**jouw versie**  Shot on your actual product — never a stock sample. Processed through our standard studio pipeline and quality checks. You’ll receive either 4 catalog photos or a 3-photo lifestyle carousel.

*bron*  src/components/HomeV2.astro

### home-055 · NL

**staat nu**  Niet op een kledingstuk dat wij kozen, maar op dat van jou — door dezelfde productie als een betaalde bestelling, door dezelfde specialist nagekeken. Je krijgt 4 catalogbeelden of een lifestyle-carousel van 3 foto’s terug.

**jouw versie**  Gemaakt met jouw echte artikel — geen willekeurige sample. Verwerkt via onze standaard productielijn en kwaliteitscontrole. Je ontvangt 4 catalogusfoto's óf een lifestyle-carrousel van 3 beelden.

*bron*  src/components/HomeV2.astro

### home-074 · EN

**staat nu**  A shoot costs a day as well as a fee, and only one of those two is on the invoice. What an order replaces, counted

**jouw versie**  A shoot costs a full day of your time on top of the studio fee — and only one of those shows up on the invoice. Here is what an order replaces.

*bron*  src/components/HomeV2.astro

### home-074 · NL

**staat nu**  Een shoot kost een dag én een bedrag, en maar één van die twee staat op de factuur. Wat een bestelling vervangt, uitgeteld

**jouw versie**  De echte kosten van een shoot zitten in je eigen uren. Wij rekenen af met het verborgen regelwerk en nemen het complete proces over.

*bron*  src/components/HomeV2.astro

### home-075 · EN

**staat nu**  One face, and it is only yours.

**jouw versie**  Pick a face from our roster — or build one that’s exclusively yours.

*bron*  samengesteld uit losse sleutels

### home-075 · NL

**staat nu**  Eén gezicht, en het is alleen van jou.

**jouw versie**  Kies een model uit onze roster — of claim een gezicht dat uniek is voor jouw merk.

*bron*  samengesteld uit losse sleutels

### home-079 · EN

**staat nu**  What happens after you order.

**jouw versie**  What to Expect After You Order

*bron*  src/components/HomeV2.astro

### home-079 · NL

**staat nu**  Wat er gebeurt nadat je bestelt.

**jouw versie**  Wat kun je verwachten na je bestelling

*bron*  src/components/order/OrderFlow.astro

### home-081 · EN

**staat nu**  A private link, no password. Status and your delivery dates, then the full gallery: approve or request a revision image by image, and download every image in all three formats, in the aspect ratio you picked when you ordered.

**jouw versie**  One private link gives you full control: view delivery timelines, approve or request revisions per image, and download every asset in all three formats and your selected aspect ratio.

*bron*  src/components/HomeV2.astro

### home-081 · NL

**staat nu**  Je komt binnen via een privélink, zonder wachtwoord. Je ziet de status en je leverdata, en daarna de hele galerij: per beeld goedkeuren of een revisie aanvragen, en elk beeld downloaden in alle drie de formaten, in de beeldverhouding die je bij het bestellen koos.

**jouw versie**  Eén privé-link voor het complete overzicht: live status, beeld-voor-beeld goedkeuring en instant downloads in de door jou gekozen aspect ratio's.

*bron*  src/components/HomeV2.astro

### home-084 · EN

**staat nu**  Orders Every image, next to the photo you sent

**jouw versie**  Orders Every visual side-by-side with your original upload

*bron*  samengesteld uit losse sleutels

### home-084 · NL

**staat nu**  Bestellingen Elk beeld, met je eigen upload ernaast

**jouw versie**  Bestellingen Elk beeld direct naast je originele upload

*bron*  samengesteld uit losse sleutels

### home-085 · EN

**staat nu**  Your look Who wears your product, what it sits on, and its shape

**jouw versie**  Your Look Models, surface styling, and image formats

*bron*  samengesteld uit losse sleutels

### home-085 · NL

**staat nu**  Je vaste look Wie je product draagt, waar het op staat, en in welke verhouding

**jouw versie**  Jouw look Modellen, ondergrond en beeldformaat

*bron*  samengesteld uit losse sleutels

### home-086 · EN

**staat nu**  Your details Fill in once, then prefilled

**jouw versie**  Account Details Set up once, auto-filled on every order

*bron*  samengesteld uit losse sleutels

### home-086 · NL

**staat nu**  Je gegevens Eén keer invullen, daarna voorgevuld

**jouw versie**  Accountgegevens Eén keer instellen, daarna automatisch ingevuld

*bron*  samengesteld uit losse sleutels

### home-091 · EN

**staat nu**  Image by image, not by the pile. You ask for a revision on the photo it is about.

**jouw versie**  Precision feedback: Request revisions photo by photo, right where it matters.

*bron*  samengesteld uit losse sleutels

### home-091 · NL

**staat nu**  Per beeld, niet per stapel. Een revisie vraag je op de foto waar het over gaat.

**jouw versie**  Gerichte feedback: Vraag revisies direct aan op de foto waar het om gaat.

*bron*  samengesteld uit losse sleutels

### home-103 · EN

**staat nu**  Nothing is delivered automatically. A person looks at every visual first, and in the portal you approve or request a revision image by image.

**jouw versie**  Zero automated handoffs. Every image is manually inspected before reaching your portal for photo-by-photo approval or feedback.

*bron*  src/components/HomeV2.astro

### home-109 · EN

**staat nu**  No wall of reviews yet. So we earn your trust the honest way.

**jouw versie**  No wall of reviews yet — so we earn your trust the honest way.

*bron*  src/components/HomeV2.astro

### home-109 · NL

**staat nu**  We hebben nog weinig reviews. Dus laten we het je eerst zien op je eigen product.

**jouw versie**  Nog geen muur vol reviews — dus verdienen we je vertrouwen op de eerlijke manier.

*bron*  src/components/HomeV2.astro

### home-110 · EN

**staat nu**  "I check every visual myself before it reaches you, and I would rather redo one than ship it. Not sure yet? See it on your own product for €1 first."

**jouw versie**  "Every single visual is personally checked before it reaches your portal. Not convinced? See the quality on your actual product for only €1."

*bron*  src/components/HomeV2.astro

### home-110 · NL

**staat nu**  "Ik bekijk elk beeld zelf voordat het naar je toe gaat, en ik doe er liever één over dan dat ik hem verstuur. Nog niet zeker? Bekijk het eerst op je eigen product voor €1."

**jouw versie**  "Elk beeld krijgt een persoonlijke check voordat het in je portal staat. Niet overtuigd? Bekijk het resultaat op je eigen product voor slechts €1."

*bron*  src/components/HomeV2.astro

### home-112 · EN

**staat nu**  We ask before we call it done — every order ends with the same question: are these right? If not, we go through it with you.

**jouw versie**  Complete satisfaction before final sign-off. If anything misses the mark, we review and adjust it with you step-by-step.

*bron*  src/components/HomeV2.astro

### home-112 · NL

**staat nu**  We vragen het voordat we klaar zeggen — Elke bestelling eindigt met dezelfde vraag: kloppen de beelden? Zo niet, dan kijken we er samen naar.

**jouw versie**  Geen definitieve oplevering zonder jouw check. Klopt er iets niet? Dan gaan we er samen doorheen tot het perfect is.

*bron*  src/components/HomeV2.astro

### home-113 · EN

**staat nu**  You own what you get — commercial use across your shop, marketplaces, ads and feeds. No licence per use.

**jouw versie**  Full commercial rights included. Use your images anywhere — shop, marketplaces, ads, and social feeds—with zero recurring licensing fees.

*bron*  src/components/HomeV2.astro

### home-113 · NL

**staat nu**  De beelden zijn van jou — commercieel te gebruiken in je shop, op marktplaatsen, in advertenties en feeds. Geen licentie per gebruik.

**jouw versie**  Volledige commerciële rechten inbegrepen. Gebruik je beelden overal — webshop, marktplaatsen, ads en social feeds—zonder extra licentiekosten.

*bron*  src/components/HomeV2.astro

### home-115 · EN

**staat nu**  4 catalog photos or a lifestyle carousel of 3 photos, made from your own photo and checked by a specialist — for a €1 fee to prevent abuse. One per business.

**jouw versie**  4 catalog shots OR 3 lifestyle carousel photos • Built from your original image • Specialist quality check • €1 anti-spam fee (1 per business)

*bron*  samengesteld uit losse sleutels

### home-115 · NL

**staat nu**  4 catalogbeelden of een lifestyle-carousel van 3 foto’s, gemaakt van je eigen foto’s en door een specialist nagekeken — voor €1 om misbruik te voorkomen. Eén per bedrijf.

**jouw versie**  4 catalogusfoto's OF 3 lifestyle-carousel foto's • Gemaakt op basis van jouw eigen foto • Gecontroleerd door een specialist • €1 tegen spam (max. 1 per bedrijf)

*bron*  src/data/pricing.js
