# Tekstronde — elke zin die is veranderd

> **Let op — prijs verouderd.** De bedragen in dit document zijn van de
> tekstronde zelf. De proefvisual kost sinds 8 augustus 2026 **€ 1**, niet
> € 0,99. Dit verslag is met opzet niet herschreven: het legt vast wat er op
> dat moment stond en waarom het veranderde. Neem hier dus geen prijs uit
> over — die staat in `src/data/pricing.js` (`AMOUNT.testSample`).

8 augustus 2026.

484 teksten aangepast, verspreid over 57 bestanden. Per wijziging staat
eronder waarom, in één regel. Wat er niet in staat: commentaar in de code, en
de teksten in `throw new Error()` — die leest alleen wie hier werkt.

## De proefvisual: één product, niet één beeld

Dit was de zwaarste fout van de hele ronde, en hij stond er al maanden. Lucas:
*"test sample is niet 1 beeld maar 1 product volledig geleverd, dus bij keuze
catalog 4 beelden en lifestyle 3 beelden. Dit is belangrijk om aan te passen want
dit laat de waarde zien van de test sample en wat je nou krijgt."*

Voor € 0,99 krijg je dus **één product volledig afgewerkt**: vier catalogbeelden,
of een lifestyle-carousel van drie foto’s. Precies wat een betaalde bestelling per
product oplevert. De site zei op elf plekken "één beeld" — en verkocht daarmee
een kwart tot een derde van wat er werkelijk geleverd wordt.

| waar | voor | na |
| --- | --- | --- |
| homepage, grote knop | Eén beeld van jouw product — € 0,99 | Stuur één productfoto, krijg één product volledig terug — € 0,99 |
| balk onderaan elke pagina | Eén beeld · € 0,99 | Eén product volledig · € 0,99 |
| /test-sample, wat je krijgt | Eén visual in hoge resolutie | Kies je catalog: 4 beelden … · Kies je lifestyle: 3 foto’s … |
| /faq en /how-it-works | Eén beeld · € 0,99 | Eén product volledig geleverd · € 0,99 |
| JSON-LD voor Google | Eén beeld van één van je producten | Eén product, afgewerkt zoals bij een betaalde bestelling: 4 catalogbeelden of een lifestyle-carousel van 3 foto’s |

De aantallen staan nu één keer in `pricing.js` als `CATALOG_IMAGES` en
`LIFESTYLE_IMAGES`, en elke tekst leest ze op. Ze stonden op zeventien plekken
uitgeschreven. Een controle bij de bouw houdt ze gelijk aan de opmerking bij
`LADDER.complete`, die zegt dat een compleet product zeven beelden is — 4 + 3.

## De knop waar de ronde mee begon

Je eerste klacht was dat `Eén beeld van jouw product — € 0,99` niet zegt wat je
krijgt en niet aankondigt wat er op het volgende scherm gebeurt. Diezelfde
`Zie het` / `See it` stond op vijf plekken: de homepage, /pricing, /how-it-works,
/portal en /contact. Alle vijf aangepast — en daarna nog een keer, toen bleek dat
ook mijn eigen "één afgewerkt beeld" het aanbod te klein maakte.

## De woordenlijst, zoals hij er nu staat

| ons woord | wat er nu staat (NL) | wat er nu staat (EN) |
| --- | --- | --- |
| venster / window | leverdatum · de dagen die we voor je vrijhouden | delivery date · the days we hold for you |
| gereserveerd venster | vastgezette leverdatum | reserved delivery date |
| wachtrij / queue | de normale doorlooptijd | the normal turnaround |
| staffel / ladder | de prijs per product | the price per product |
| trede / rung | een stap in het aantal | one more product · a step |
| capaciteitspoort / capacity gate | de agendacheck | the calendar check |
| capaciteitsagenda | de agenda | the calendar |
| pipeline | de productie | the production |
| drop | bestelling | order |
| brief / briefing | wat je ons vertelt · je notitie | what you tell us · your notes |
| scope | wat je bestelt | what you order |
| intake | een gesprek vooraf | a first conversation |
| full outfit | compleet setje (broek, top en schoenen samen) | complete look |
| **brand kit** | **je vaste look** | **your look** |

`brand kit` stond er eerst als uitzondering in, omdat jij die naam zelf gebruikt.
Dat was de verkeerde afweging. Het was het enige Engelse label in een Nederlandse
navigatie naast Overzicht, Bestellingen en Je gegevens, en het zei niet wat erachter
zat. De lede van de pagina zei het al goed, dus die woorden zijn nu de naam. Het pad
`/account/brand-kit` blijft: dat staat in inloglinks in mails die al verstuurd zijn.

Twee woorden blijven met opzet staan: `drop` waar het een collectielancering van de
klant is (gewone modetaal), en `window` waar het een echt raam of een lichtbron is.

---

## Waar het staat

- data/pricing.js — 10
- HomeV2.astro — 24
- i18n/ui.js — 4
- pages/test-sample.astro — 9
- pages/nl/test-sample.astro — 12
- PricingPage.astro — 23
- HowItWorksPage.astro — 17
- FaqPage.astro — 2
- CatalogPage.astro — 12
- LifestylePage.astro — 17
- VideoPage.astro — 8
- PortalPage.astro — 8
- StudioPage.astro — 6
- ComparePage.astro — 7
- BrandModelPage.astro — 16
- ModelsPage.astro — 4
- StartPage.astro — 14
- TierCompare.astro — 5
- FigDash.astro — 2
- order/OrderFlow.astro — 97
- order/HoldingPage.astro — 15
- order/ModelPicker.astro — 2
- order/Step1Options.astro — 1
- lib/account.js — 17
- lib/portal.js — 4
- lib/admin.js — 1
- functions/api/order.js — 6
- AiActPage.astro — 3
- data/brandModelBrief.js — 13
- data/catalogStyles.nl.js — 3
- data/channels.js — 2
- data/demo.js — 19
- data/faq.js — 34
- data/schema.js — 2
- data/styles.js — 2
- data/styles.nl.js — 8
- data/videoStyles.js — 12
- data/videoStyles.nl.js — 12
- pages/contact.astro — 2
- pages/how-it-works.astro — 2
- pages/nl/about.astro — 1
- pages/nl/contact.astro — 2
- pages/nl/guides.astro — 1
- pages/nl/how-it-works.astro — 2
- pages/nl/start.astro — 1
- pages/nl/start/brand-model.astro — 1
- pages/nl/start/plan.astro — 1
- pages/nl/terms.astro — 2
- pages/nl/thank-you.astro — 4
- pages/nl/upload-guidelines.astro — 1
- pages/privacy.astro — 1
- pages/start.astro — 1
- pages/start/brand-model.astro — 1
- pages/start/plan.astro — 1
- pages/studio.astro — 1
- pages/terms.astro — 3
- pages/thank-you.astro — 3

---

## data/pricing.js

10 wijzigingen.

**De regel die overal onder de proefvisual staat, zei niet wat voor beeld je krijgt of dat het afgewerkt is.**

```
voor:  { name: 'Test sample', price: euro(AMOUNT.testSample, 'en'), unit: 'one per business', line: 'One image of one of your products, before you order anything.' }
na:    { name: 'Test sample', price: euro(AMOUNT.testSample, 'en'), unit: 'one per business', line: 'You send one product photo, we send back one finished visual — catalog or lifestyle, your choice.' }
```

**Zelfde regel in het Nederlands.**

```
voor:  { name: 'Proefvisual', price: euro(AMOUNT.testSample, 'nl'), unit: 'één per bedrijf', line: 'Eén beeld van één van je producten, voordat je iets bestelt.' }
na:    { name: 'Proefvisual', price: euro(AMOUNT.testSample, 'nl'), unit: 'één per bedrijf', line: 'Jij stuurt één productfoto, wij sturen één afgewerkt beeld terug — catalog of lifestyle, jij kiest.' }
```

**“full outfit” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  A full outfit means every product in the shot is checked for fit against the others and matched to how it would really look worn together — not composited separately and placed side by side. That check is the extra work behind the price.
na:    A complete look means every product in the shot is checked for fit against the others and matched to how it would really look worn together — not composited separately and placed side by side. That check is the extra work behind the price.
```

**“full outfit” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Een full outfit betekent dat elk product in het shot wordt gecontroleerd op pasvorm ten opzichte van de andere producten, en zo precies mogelijk wordt nagebootst zoals het er in het echt uit zou zien als je het samen draagt — niet los samengesteld en naast elkaar gezet. Die controle is het extra werk achter de prijs.
na:    Een compleet setje betekent dat elk product in het shot wordt gecontroleerd op pasvorm ten opzichte van de andere producten, en zo precies mogelijk wordt nagebootst zoals het er in het echt uit zou zien als je het samen draagt — niet los samengesteld en naast elkaar gezet. Die controle is het extra werk achter de prijs.
```

**“wachtrij” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Standaard wachtrij, geen vaste leverdatum
na:    Normale doorlooptijd, geen vaste leverdatum
```

**“window” en “queue” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Priority in the queue — a booked window is never given up for a later, smaller order
na:    Priority over other orders — a booked delivery date is never given up for a later, smaller order
```

**“venster” en “wachtrij” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Voorrang in de wachtrij — een geboekt venster wijkt nooit voor een latere, kleinere bestelling
na:    Voorrang boven andere bestellingen — een geboekte leverdatum wijkt nooit voor een latere, kleinere bestelling
```

**“staffel” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  ? `Op de staffel zou dit ${euro(saving.onLadder, l)} kosten — ${euro(saving.saving, l)} per maand verschil.`
na:    ? `Op de prijs per product zou dit ${euro(saving.onLadder, l)} kosten — ${euro(saving.saving, l)} per maand verschil.`
```

**“ladder” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  : `The same output on the ladder is ${euro(saving.onLadder, l)} — ${euro(saving.saving, l)} a month more.`)
na:    : `The same output on the price per product is ${euro(saving.onLadder, l)} — ${euro(saving.saving, l)} a month more.`)
```

**"Een gereserveerd venster van 48 uur" — het interne woord, en een datum kan geen 48 uur duren.**

```
voor:  Een gereserveerd venster van 48 uur, bevestigd voordat je betaalt
na:    Een leverdatum met 48 uur werk erin, vastgezet voordat je betaalt
```

---

## HomeV2.astro

24 wijzigingen.

**Lucas: "1 foto van je product zegt helemaal niets van wat je krijgt en te zien krijgt in het volgende scherm." De knop noemt nu beide kanten van de ruil, en daarmee ook de eerste handeling op het volgende scherm. Zelfde knop in het Engels.**

```
voor:  One image of your product — ${sample.price}
na:    Send one product photo, get one product back in full — ${sample.price}
```

**Nederlandse tegenhanger van dezelfde knop. De grote knop op de homepage: "één afgewerkt beeld" onderverkocht wat je krijgt. Nu staat er het aantal.**

```
voor:  Eén beeld van jouw product — ${sample.price}
na:    Stuur één productfoto, krijg één product volledig terug — ${sample.price}
```

**"Before you commit to any of that" — "that" is de prijslijst erboven, maar los gelezen slaat het op niets.**

```
voor:  Before you commit to any of that
na:    Before you place an order
```

**Zelfde, in het Nederlands; "je aan iets vastleggen" is bovendien vager dan de handeling die het beschrijft.**

```
voor:  Voordat je je aan iets vastlegt
na:    Voordat je een bestelling plaatst
```

**"See it" is dezelfde fout als "See it first" die Lucas al afkeurde: "it" heeft geen antecedent zodra je alleen de kop leest. Zelfde kop in het Engels.**

```
voor:  'See it on your own product', `for ${sample.price}.`
na:    'One of your own products, delivered in full', `for ${sample.price}.`
```

**Zelfde kop in het Nederlands. De kop boven de proefvisual-band.**

```
voor:  'Zie het op je eigen product', `voor ${sample.price}.`
na:    'Eén product van jezelf, volledig geleverd', `voor ${sample.price}.`
```

**"Pipeline" is een intern woord (STIJL.md regel 3); een bezoeker heeft het nooit in deze betekenis gelezen. Zelfde lede in het Engels.**

```
voor:  The figures above are what it costs. This is what it looks like — not on a garment we chose, on yours. Send one product photo and one comes back, run through the same pipeline as a paid order and checked by the same person.
na:    The figures above are what it costs. This is what it looks like — not on a garment we chose, on yours. Send one product photo and that product comes back in full: ${CATALOG_IMAGES} catalog images, or a ${LIFESTYLE_IMAGES}-photo lifestyle carousel. Same production as a paid order, checked by the same person.
```

**Zelfde interne woord in de Nederlandse tekst. De lede zei "er komt er één terug", en dat is de kern van de vergissing.**

```
voor:  Hierboven staat wat het kost. Dit is hoe het eruitziet — niet op een kledingstuk dat wij kozen, op dat van jou. Stuur één productfoto en er komt er één terug, door dezelfde pipeline als een betaalde bestelling en door dezelfde persoon nagekeken.
na:    Hierboven staat wat het kost. Dit is hoe het eruitziet — niet op een kledingstuk dat wij kozen, op dat van jou. Stuur één productfoto en je krijgt dat product volledig terug: ${CATALOG_IMAGES} catalogbeelden, of een lifestyle-carousel van ${LIFESTYLE_IMAGES} foto's. Zelfde productie als een betaalde bestelling, door dezelfde persoon nagekeken.
```

**"The real pipeline" als kopje is intern jargon; de kop zegt nu waar het over gaat.**

```
voor:  The real pipeline', 'Same production, same house style, same human check. What comes back is what you would get.
na:    No shortcuts for a sample', 'Same production, same house style, same human check. What comes back is what you would get.
```

**"De echte pipeline" is intern jargon; de kop zegt nu waar het over gaat.**

```
voor:  De echte pipeline', 'Zelfde productie, zelfde huisstijl, zelfde menselijke controle. Wat terugkomt is wat je zou krijgen.
na:    Geen kortere weg voor een proef', 'Zelfde productie, zelfde huisstijl, zelfde menselijke controle. Wat terugkomt is wat je zou krijgen.
```

**Sluitkop van de homepage met dezelfde afgekeurde "See it"-formule. Zelfde sluitkop in het Engels.**

```
voor:  See it on your own product first.
na:    One of your own products, delivered in full, first.
```

**Zelfde sluitkop in het Nederlands. De sluitkop van de homepage.**

```
voor:  Zie het eerst op je eigen product.
na:    Eerst één product van jezelf, volledig geleverd.
```

**“window” en “queue” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  The window is reserved capacity, not a place in a queue. That is why it can be promised at all — and why it runs out.
na:    The delivery date is reserved capacity, not a place in a line. That is why it can be promised at all — and why it runs out.
```

**“capacity gate” en “capacity calendar” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Every order and the capacity calendar the date picker reads from. A status change writes the timeline you see in the same move, so the portal is never behind the studio.
na:    Every order and the calendar the date picker reads from. A status change writes the timeline you see in the same move, so the portal is never behind the studio.
```

**“venster” en “wachtrij” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Het venster is gereserveerde capaciteit, geen plek in een wachtrij. Daarom kan het überhaupt beloofd worden — en daarom raakt het op.
na:    De leverdatum is gereserveerde capaciteit, geen langere doorlooptijd. Daarom kan het überhaupt beloofd worden — en daarom raakt het op.
```

**“ladder” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Ordering every month rather than every season? Three monthly plans, from ${euro(PLAN_FROM, 'en')} for ${PLAN_LOW}–${PLAN_HIGH} products a month, each priced below the ladder for the same output.
na:    Ordering every month rather than every season? Three monthly plans, from ${euro(PLAN_FROM, 'en')} for ${PLAN_LOW}–${PLAN_HIGH} products a month, each priced below the price per product for the same output.
```

**“queue” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  No cull, no retouch queue', 'Finished visuals, not four hundred frames to sort on a Sunday.
na:    No cull, no waiting for retouch', 'Finished visuals, not four hundred frames to sort on a Sunday.
```

**"48 uur is geen belofte zolang er niet bij staat waarvan" — STIJL.md regel 2, met dit exacte voorbeeld.**

```
voor:  'Minus 48 hours', `The reserved window, on orders of ${WINDOW_THRESHOLD} products or more. Once the calendar has cleared it, nothing in the studio may push it; below that count an order runs in the standard queue.`
na:    '48 hours from your date', `The reserved delivery date, on orders of ${WINDOW_THRESHOLD} products or more. Once the calendar has cleared it, nothing in the studio may push it; below that count an order runs in the normal turnaround.`
```

**“staffel” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Bestel je elke maand in plaats van elk seizoen? Drie maandplannen, vanaf ${euro(PLAN_FROM, 'nl')} voor ${PLAN_LOW}–${PLAN_HIGH} producten per maand, en elk goedkoper dan de staffel voor dezelfde output.
na:    Bestel je elke maand in plaats van elk seizoen? Drie maandplannen, vanaf ${euro(PLAN_FROM, 'nl')} voor ${PLAN_LOW}–${PLAN_HIGH} producten per maand, en elk goedkoper dan de prijs per product voor dezelfde output.
```

**Zelfde kop in het Nederlands.**

```
voor:  'Min 48 uur', `Het gereserveerde venster, bij bestellingen van ${WINDOW_THRESHOLD} producten of meer. Zodra de planning het heeft vrijgegeven, mag niets anders in de studio eroverheen; daaronder loopt een bestelling in de gewone wachtrij.`
na:    '48 uur vanaf je leverdatum', `De vastgezette leverdatum, bij bestellingen van ${WINDOW_THRESHOLD} producten of meer. Zodra de planning het heeft vrijgegeven, mag niets anders in de studio eroverheen; daaronder loopt een bestelling in de normale doorlooptijd.`
```

**Placeholder-tekst met ons eigen woord voor de planning erin.**

```
voor:  Studio dashboard · capacity calendar
na:    Studio dashboard · delivery calendar
```

**"So we earn it" — "it" is nergens genoemd.**

```
voor:  No wall of reviews yet.', 'So we earn it the honest way.
na:    No wall of reviews yet.', 'So we earn your trust the honest way.
```

**De lede eronder zei "Eén beeld".**

```
voor:  Eén beeld, gemaakt van jouw foto, door een mens nagekeken — voor een verificatie van ${sample.price}. Eén per bedrijf.
na:    ${CATALOG_IMAGES} catalogbeelden of een carousel van ${LIFESTYLE_IMAGES}, gemaakt van jouw foto, door een mens nagekeken — voor een verificatie van ${sample.price}. Eén per bedrijf.
```

**Zelfde lede in het Engels.**

```
voor:  One visual, made from your photo, human-checked — for a ${sample.price} verification. One per business.
na:    ${CATALOG_IMAGES} catalog images or a carousel of ${LIFESTYLE_IMAGES}, made from your photo, human-checked — for a ${sample.price} verification. One per business.
```

---

## i18n/ui.js

4 wijzigingen.

**De knop in de vaste balk onderaan elke pagina — de meest gelezen van allemaal, en de vaagste. Zelfde knop in het Engels.**

```
voor:  One image · ${TEST_SAMPLE.en.price}
na:    One product in full · ${TEST_SAMPLE.en.price}
```

**Zelfde knop in het Nederlands. En de knop in die balk.**

```
voor:  Eén beeld · ${TEST_SAMPLE.nl.price}
na:    Eén product volledig · ${TEST_SAMPLE.nl.price}
```

**"See what comes back" laat de lezer gokken wat er terugkomt; de balk heeft de ruimte om het te zeggen. Zelfde in het Engels.**

```
voor:  Send us one product and see what comes back, before you order anything.
na:    Send us one product photo and get that product back in full — ${CATALOG_IMAGES} catalog images or a carousel of ${LIFESTYLE_IMAGES}, before you order anything.
```

**Zelfde in het Nederlands. De balk onderaan elke pagina zei "één afgewerkt beeld".**

```
voor:  Stuur ons één product en zie wat eruit komt, voordat je iets bestelt.
na:    Stuur ons één productfoto en krijg dat product volledig terug — ${CATALOG_IMAGES} catalogbeelden of een carousel van ${LIFESTYLE_IMAGES}, voordat je iets bestelt.
```

---

## pages/test-sample.astro

9 wijzigingen.

**“pipeline” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  <p style="margin-top:1.1rem;color:var(--ink-3);max-width:52ch">The same pipeline and human review used on every paid order — the honest way to judge quality before you commit.</p>
na:    <p style="margin-top:1.1rem;color:var(--ink-3);max-width:52ch">The same production and human review used on every paid order — the honest way to judge quality before you commit.</p>
```

**Zelfde kop in het Engels.**

```
voor:  <h2>Give us a good photo, get a great result</h2>
na:    <h2>Sharp photo in, publish-ready visual out</h2>
```

**De aantallen komen nu uit pricing.js in plaats van uitgeschreven op de pagina te staan.**

```
voor:  import { TEST_SAMPLE, turnaround } from '../data/pricing.js';
na:    import { TEST_SAMPLE, turnaround, CATALOG_IMAGES, LIFESTYLE_IMAGES } from '../data/pricing.js';
```

**Zelfde in het Engels.**

```
voor:  <p class="lead" style="margin-top:1.2rem">Upload one product photo and see it become a publish-ready visual — before you order.</p>
na:    <p class="lead" style="margin-top:1.2rem">Upload one product photo and get that product back in full: {CATALOG_IMAGES} catalog images, or a {LIFESTYLE_IMAGES}-photo lifestyle carousel. Exactly what a paid order gets you per product.</p>
```

**Zelfde in het Engels.**

```
voor:  description="Upload one product photo and see it become a publish-ready e-commerce visual. One sample per business, checked by a person before it reaches you."
na:    description="Upload one product photo and get that product back in full: four catalog images or a three-photo lifestyle carousel. One sample per business, checked by a person before it reaches you."
```

**Zelfde in het Engels.**

```
voor:  <li><svg viewBox="0 0 24 24" class="i"><path d="M20 6L9 17l-5-5" /></svg><span>One high-resolution visual, delivered by email download link.</span></li>
na:    <li><svg viewBox="0 0 24 24" class="i"><path d="M20 6L9 17l-5-5" /></svg><span>Pick catalog: {CATALOG_IMAGES} images — front, back, a fabric or logo detail, and one on a model.</span></li>
          <li><svg viewBox="0 0 24 24" class="i"><path d="M20 6L9 17l-5-5" /></svg><span>Pick lifestyle: {LIFESTYLE_IMAGES} photos in one styled look — a scene, one on a model, and a detail close-up.</span></li>
          <li><svg viewBox="0 0 24 24" class="i"><path d="M20 6L9 17l-5-5" /></svg><span>High resolution, delivered as an email download link.</span></li>
```

**Zelfde kop in het Engels.**

```
voor:  <h2>One product, turned into a publish-ready visual.</h2>
na:    <h2>One product, delivered in full.</h2>
```

**Zelfde in het Engels.**

```
voor:  <p>Four short steps from your photo to a finished visual in your inbox.</p>
na:    <p>Four short steps from your photo to a finished set in your inbox.</p>
```

**Zelfde chip in het Engels.**

```
voor:  <span class="chip"><span class="dot"></span>1 sample per business</span>
na:    <span class="chip"><span class="dot"></span>One complete product</span>
```

---

## pages/nl/test-sample.astro

12 wijzigingen.

**“pipeline” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  <p style="margin-top:1.1rem;color:var(--ink-3);max-width:52ch">Dezelfde pipeline en menselijke controle die we bij elke betaalde bestelling gebruiken — de eerlijke manier om de kwaliteit te beoordelen voordat je je vastlegt.</p>
na:    <p style="margin-top:1.1rem;color:var(--ink-3);max-width:52ch">Dezelfde productie en menselijke controle die we bij elke betaalde bestelling gebruiken — de eerlijke manier om de kwaliteit te beoordelen voordat je je vastlegt.</p>
```

**"Een geweldig resultaat" benoemt niet wat je krijgt.**

```
voor:  <h2>Geef ons een goede foto, krijg een geweldig resultaat</h2>
na:    <h2>Scherpe foto erin, publicatieklaar beeld eruit</h2>
```

**"In focus" is onvertaald Engels naast een "scherp" dat hetzelfde al zegt.**

```
voor:  <span>Helder, scherp en in focus</span>
na:    <span>Helder en haarscherp</span>
```

**"Laag-resolutie" hoort aan elkaar.**

```
voor:  <span>Wazige of laag-resolutie foto’s</span>
na:    <span>Wazige foto’s of foto’s met een lage resolutie</span>
```

**"Indien" is ambtelijk; op deze site staat "als".**

```
voor:  Indien nodig nemen we contact op via WhatsApp of e-mail.
na:    Als we iets moeten navragen, doen we dat via WhatsApp of e-mail.
```

**Zelfde import in het Nederlands.**

```
voor:  import { TEST_SAMPLE, turnaround } from '../../data/pricing.js';
na:    import { TEST_SAMPLE, turnaround, CATALOG_IMAGES, LIFESTYLE_IMAGES } from '../../data/pricing.js';
```

**"Een publicatieklare visual" — enkelvoud, terwijl je één product volledig geleverd krijgt. Lucas: "test sample is niet 1 beeld maar 1 product volledig geleverd."**

```
voor:  <p class="lead" style="margin-top:1.2rem">Upload één productfoto en zie hoe die een publicatieklare visual wordt — voordat je bestelt.</p>
na:    <p class="lead" style="margin-top:1.2rem">Upload één productfoto en krijg dat product volledig terug: {CATALOG_IMAGES} catalogbeelden, of een lifestyle-carousel van {LIFESTYLE_IMAGES} foto’s. Precies wat je bij een betaalde bestelling per product krijgt.</p>
```

**De meta-description die in Google staat, zei ook "een visual".**

```
voor:  description="Upload één productfoto en zie er een publicatieklare e-commerce visual van worden. Eén proef per bedrijf, door een persoon gecontroleerd."
na:    description="Upload één productfoto en krijg dat product volledig terug: vier catalogbeelden of een lifestyle-carousel van drie foto’s. Eén proef per bedrijf, door een persoon gecontroleerd."
```

**Dit was de plek waar de waarde het duidelijkst had moeten staan, en er stond "Eén visual".**

```
voor:  <li><svg viewBox="0 0 24 24" class="i"><path d="M20 6L9 17l-5-5" /></svg><span>Eén visual in hoge resolutie, geleverd via een downloadlink per e-mail.</span></li>
na:    <li><svg viewBox="0 0 24 24" class="i"><path d="M20 6L9 17l-5-5" /></svg><span>Kies je catalog: {CATALOG_IMAGES} beelden — voorkant, achterkant, een stof- of logodetail, en één op een model.</span></li>
          <li><svg viewBox="0 0 24 24" class="i"><path d="M20 6L9 17l-5-5" /></svg><span>Kies je lifestyle: {LIFESTYLE_IMAGES} foto’s in één gestylde look — een scène, één op een model, en een detailclose-up.</span></li>
          <li><svg viewBox="0 0 24 24" class="i"><path d="M20 6L9 17l-5-5" /></svg><span>In hoge resolutie, als downloadlink per e-mail.</span></li>
```

**De kop boven die lijst zei "omgezet in een publicatieklare visual" — enkelvoud.**

```
voor:  <h2>Eén product, omgezet in een publicatieklare visual.</h2>
na:    <h2>Eén product, volledig geleverd.</h2>
```

**"Een afgewerkte visual in je inbox" — enkelvoud, en de stappen tellen ook niet wat je krijgt.**

```
voor:  <p>Vier korte stappen van jouw foto tot een afgewerkte visual in je inbox.</p>
na:    <p>Vier korte stappen van jouw foto tot een afgewerkte set in je inbox.</p>
```

**Deze chip zei niet wat een proef is.**

```
voor:  <span class="chip"><span class="dot"></span>1 proef per bedrijf</span>
na:    <span class="chip"><span class="dot"></span>Eén volledig product</span>
```

---

## PricingPage.astro

23 wijzigingen.

**"Before any of it" — losstaande sectiekop waarin "it" naar niets verwijst.**

```
voor:  Before any of it
na:    Before you place an order
```

**Zelfde kop; "iets vastleggen" benoemt de handeling niet.**

```
voor:  Voordat je iets vastlegt
na:    Voordat je een bestelling plaatst
```

**Derde plek op de site met de afgekeurde "See it"-formule. Zelfde kop in het Engels.**

```
voor:  See it on your',
    ctaEm: 'own product.
na:    One of your own products,',
    ctaEm: 'delivered in full.
```

**Zelfde kop in het Nederlands. De sluitkop van /pricing.**

```
voor:  Zie het op je',
    ctaEm: 'eigen product.
na:    Eén volledig geleverd product,',
    ctaEm: 'van jezelf.
```

**“rung” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  One unit: a product. One rate, and it only ever moves down a rung. Every count has a price, so no order costs more per product than a smaller one — and there is no package to squeeze your line into.
na:    One unit: a product. One rate, and it only ever moves down a step. Every count has a price, so no order costs more per product than a smaller one — and there is no package to squeeze your line into.
```

**“ladder” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  The ladder
na:    The price per product
```

**“rung” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Pick the scope, count your products, read the rate. The rate applies to every product in the order, not only the ones past the rung.
na:    Pick the scope, count your products, read the rate. The rate applies to every product in the order, not only the ones above that count.
```

**“window” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  A reserved window is confirmed before you pay, never after. If the week you need cannot be held, you are told that instead of being given an optimistic guess.
na:    A reserved delivery date is confirmed before you pay, never after. If the week you need cannot be held, you are told that instead of being given an optimistic guess.
```

**“ladder” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  If the same output comes round every month, buying it by the month costs less than buying it order by order. That is all a plan is — not a bigger package, the same products at a lower price for committing to the month. Each card shows the difference against the ladder above.
na:    If the same output comes round every month, buying it by the month costs less than buying it order by order. That is all a plan is — not a bigger package, the same products at a lower price for committing to the month. Each card shows the difference against the price per product above.
```

**“trede” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Eén eenheid: een product. Eén tarief, en dat gaat alleen maar een trede omlaag. Elk aantal heeft een prijs, dus geen bestelling kost per product meer dan een kleinere — en er is geen pakket waar je lijn in moet passen.
na:    Eén eenheid: een product. Eén tarief, en dat zakt alleen maar één product per keer. Elk aantal heeft een prijs, dus geen bestelling kost per product meer dan een kleinere — en er is geen pakket waar je lijn in moet passen.
```

**“staffel” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  De staffel
na:    De prijs per product
```

**“trede” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Kies de scope, tel je producten, lees het tarief. Het tarief geldt voor elk product in de bestelling, niet alleen voor de producten voorbij de trede.
na:    Kies de scope, tel je producten, lees het tarief. Het tarief geldt voor elk product in de bestelling, niet alleen voor de producten boven die grens.
```

**“venster” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Een gereserveerd venster wordt bevestigd voordat je betaalt, nooit erna. Kan de week die je nodig hebt niet worden vastgehouden, dan hoor je dat — in plaats van een optimistische gok.
na:    Een vastgezette leverdatum wordt bevestigd voordat je betaalt, nooit erna. Kan de week die je nodig hebt niet worden vastgehouden, dan hoor je dat — in plaats van een optimistische gok.
```

**“staffel” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Komt dezelfde output elke maand terug, dan is per maand kopen goedkoper dan bestelling voor bestelling. Meer is een plan niet — geen groter pakket, dezelfde producten voor een lagere prijs omdat je je aan de maand verbindt. Elke kaart laat het verschil met de staffel hierboven zien.
na:    Komt dezelfde output elke maand terug, dan is per maand kopen goedkoper dan bestelling voor bestelling. Meer is een plan niet — geen groter pakket, dezelfde producten voor een lagere prijs omdat je je aan de maand verbindt. Elke kaart laat het verschil met de prijs per product hierboven zien.
```

**“ladder” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  No first-order discount, no volume negotiation, no package you have to fit your line into. The ladder above is the whole of it, and it applies to every product in the order. If you want to see the work before you commit, that is what the ${TEST_SAMPLE.en.price} test sample is for.
na:    No first-order discount, no volume negotiation, no package you have to fit your line into. The price per product above is the whole of it, and it applies to every product in the order. If you want to see the work before you commit, that is what the ${TEST_SAMPLE.en.price} test sample is for.
```

**“queue” en “capacity gate” en “capacity calendar” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  From ${WINDOW_THRESHOLD} products an order goes into the capacity calendar and gets the reserved window. Below that it runs in the standard queue. One line to cross, rather than a second question to answer.
na:    From ${WINDOW_THRESHOLD} products an order goes into the calendar and gets the reserved delivery date. Below that it runs in the normal turnaround. One line to cross, rather than a second question to answer.
```

**“pipeline” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  One product, ${sample.price} ${vatLabel('excl', 'en')} — ${sample.unit}. It runs through the same pipeline as a paid order, so what comes back is what you would get.
na:    One product, ${sample.price} ${vatLabel('excl', 'en')} — ${sample.unit}. It runs through the same production as a paid order, so what comes back is what you would get.
```

**“staffel” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Geen kennismakingskorting, geen onderhandeling over volume, geen pakket waar je lijn in moet passen. De staffel hierboven is het hele verhaal, en hij geldt voor elk product in de bestelling. Wil je het werk zien voordat je iets vastlegt, dan is de proefvisual van ${TEST_SAMPLE.nl.price} daarvoor.
na:    Geen kennismakingskorting, geen onderhandeling over volume, geen pakket waar je lijn in moet passen. De prijs per product hierboven is het hele verhaal, en hij geldt voor elk product in de bestelling. Wil je het werk zien voordat je iets vastlegt, dan is de proefvisual van ${TEST_SAMPLE.nl.price} daarvoor.
```

**“venster” en “wachtrij” en “capaciteitsagenda” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Vanaf ${WINDOW_THRESHOLD} producten gaat een bestelling in de capaciteitsagenda en krijgt hij het gereserveerde venster. Daaronder loopt hij in de standaard wachtrij. Eén grens om over te gaan, in plaats van een tweede vraag om te beantwoorden.
na:    Vanaf ${WINDOW_THRESHOLD} producten gaat een bestelling in de agenda en krijgt hij de vastgezette leverdatum. Daaronder loopt hij in de normale doorlooptijd. Eén grens om over te gaan, in plaats van een tweede vraag om te beantwoorden.
```

**“pipeline” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Eén product, ${sample.price} ${vatLabel('excl', 'nl')} — ${sample.unit}. Het loopt door dezelfde pipeline als een betaalde bestelling, dus wat terugkomt is wat je zou krijgen.
na:    Eén product, ${sample.price} ${vatLabel('excl', 'nl')} — ${sample.unit}. Het loopt door dezelfde productie als een betaalde bestelling, dus wat terugkomt is wat je zou krijgen.
```

**"One briefing" is intern; en het telt hier als de eenheid van een bestelling, wat een klant niet zo noemt.**

```
voor:  Catalog set and lifestyle carousel for each, one briefing, one invoice
na:    Catalog set and lifestyle carousel for each, one order, one invoice
```

**Zelfde regel in het Nederlands.**

```
voor:  Catalogset en lifestyle-carousel per stuk, één briefing, één factuur
na:    Catalogset en lifestyle-carousel per stuk, één bestelling, één factuur
```

**Zelfde woord, hier in de regel onder de prijstabel.**

```
voor:  ? 'Eén briefing, één factuur, ongeacht het aantal'
    : 'One briefing, one invoice, whatever the count'
na:    ? 'Eén bestelling, één factuur, ongeacht het aantal'
    : 'One order, one invoice, whatever the count'
```

---

## HowItWorksPage.astro

17 wijzigingen.

**Vierde plek met de afgekeurde "See it"-formule. Zelfde kop in het Engels.**

```
voor:  See it on your own product.
na:    One of your own products, delivered in full.
```

**Zelfde kop in het Nederlands. De sluitkop van /how-it-works.**

```
voor:  Zie het op je eigen product.
na:    Eén product van jezelf, volledig geleverd.
```

**"One image" is nog vager dan de knop die Lucas afkeurde: er staat zelfs niet bij van wat. Zelfde knop in het Engels.**

```
voor:  One image · ${TEST_SAMPLE.en.price}
na:    One product, delivered in full · ${TEST_SAMPLE.en.price}
```

**Zelfde knop in het Nederlands. De knop eronder.**

```
voor:  Eén beeld · ${TEST_SAMPLE.nl.price}
na:    Eén product volledig geleverd · ${TEST_SAMPLE.nl.price}
```

**“window” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  You send a folder of product photos and a short note. We give the order a window the calendar can actually hold, produce it, check it by hand, and hand it back image by image.
na:    You send a folder of product photos and a short note. We give the order a delivery date the calendar can actually hold, produce it, check it by hand, and hand it back image by image.
```

**“window” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  A reserved window is confirmed before you pay, never after. If the week you need cannot be held, you hear that — not an optimistic guess. It is the one promise on this site we would rather lose an order over than break.
na:    A reserved delivery date is confirmed before you pay, never after. If the week you need cannot be held, you hear that — not an optimistic guess. It is the one promise on this site we would rather lose an order over than break.
```

**“pipeline” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  The pipeline does the heavy lifting, but it is only the start. Every visual is finished in professional editing tools and colour-graded to your brand, and a person checks accuracy, consistency and framing before anything ships — the difference between a raw generator and something you would publish.
na:    The production does the heavy lifting, but it is only the start. Every visual is finished in professional editing tools and colour-graded to your brand, and a person checks accuracy, consistency and framing before anything ships — the difference between a raw generator and something you would publish.
```

**“pipeline” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  { t: 'Two ways in', b: 'On-site, or WhatsApp — whichever suits you. The same pipeline either way.' }
na:    { t: 'Two ways in', b: 'On-site, or WhatsApp — whichever suits you. The same production either way.' }
```

**“venster” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Jij stuurt een map met productfoto’s en een korte notitie. Wij geven de bestelling een venster dat de agenda ook echt kan vasthouden, produceren hem, controleren met de hand, en geven hem beeld voor beeld terug.
na:    Jij stuurt een map met productfoto’s en een korte notitie. Wij geven de bestelling een leverdatum die de agenda ook echt kan vasthouden, produceren hem, controleren met de hand, en geven hem beeld voor beeld terug.
```

**“venster” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Een gereserveerd venster wordt bevestigd voordat je betaalt, nooit erna. Kan de week die je nodig hebt niet worden vastgehouden, dan hoor je dat — geen optimistische gok. Het is de ene belofte op deze site waarvoor we liever een bestelling verliezen dan haar te breken.
na:    Een vastgezette leverdatum wordt bevestigd voordat je betaalt, nooit erna. Kan de week die je nodig hebt niet worden vastgehouden, dan hoor je dat — geen optimistische gok. Het is de ene belofte op deze site waarvoor we liever een bestelling verliezen dan haar te breken.
```

**“pipeline” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  De pipeline doet het zware werk, maar dat is pas het begin. Elke visual wordt afgewerkt in professionele editingtools en kleurgecorrigeerd naar je merk, en een mens controleert nauwkeurigheid, consistentie en kadrering voordat er iets weggaat — het verschil tussen een kale generator en iets dat je zou publiceren.
na:    De productie doet het zware werk, maar dat is pas het begin. Elke visual wordt afgewerkt in professionele editingtools en kleurgecorrigeerd naar je merk, en een mens controleert nauwkeurigheid, consistentie en kadrering voordat er iets weggaat — het verschil tussen een kale generator en iets dat je zou publiceren.
```

**“pipeline” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  { t: 'Consistentie', b: 'Dezelfde belichting, dezelfde hoek, dezelfde grade over elk product in de bestelling. Dat ze samen door de pipeline gaan is precies wat dat mogelijk maakt.' }
na:    { t: 'Consistentie', b: 'Dezelfde belichting, dezelfde hoek, dezelfde grade over elk product in de bestelling. Dat ze samen door de productie gaan is precies wat dat mogelijk maakt.' }
```

**“pipeline” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  One test sample per business — ${sample}, no commitment. It runs through the same pipeline as a paid order.
na:    One test sample per business — ${sample}, no commitment. It runs through the same production as a paid order.
```

**“pipeline” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Eén proefvisual per bedrijf — ${sample}, zonder verplichting. Hij loopt door dezelfde pipeline als een betaalde bestelling.
na:    Eén proefvisual per bedrijf — ${sample}, zonder verplichting. Hij loopt door dezelfde productie als een betaalde bestelling.
```

**Zelfde woord in het Nederlands.**

```
voor:  { t: 'Twee ingangen', b: 'Via de site of via WhatsApp — wat jou uitkomt. Dezelfde pipeline in beide gevallen.' }
na:    { t: 'Twee ingangen', b: 'Via de site of via WhatsApp — wat jou uitkomt. In beide gevallen precies dezelfde productie.' }
```

**"The window holds still" gaat hier over het kijkkader van de doorloop, maar leest als de leverdatum — twee betekenissen van hetzelfde woord op één pagina.**

```
voor:  One service at a time, from the phone photo you send to the files that come back. Pick one and scroll: the window holds still and shows what exists at that moment.
na:    One service at a time, from the phone photo you send to the files that come back. Pick one and scroll: the frame holds still and shows what exists at that moment.
```

**Zelfde dubbele betekenis in het Nederlands.**

```
voor:  Eén dienst tegelijk, van de telefoonfoto die je stuurt tot de bestanden die terugkomen. Kies er één en scroll: het venster blijft staan en laat zien wat er op dat moment bestaat.
na:    Eén dienst tegelijk, van de telefoonfoto die je stuurt tot de bestanden die terugkomen. Kies er één en scroll: het kader blijft staan en laat zien wat er op dat moment bestaat.
```

---

## FaqPage.astro

2 wijzigingen.

**Zelfde vage knop, hier op /faq. Zelfde knop in het Engels.**

```
voor:  One image · ${TEST_SAMPLE.en.price}
na:    One product, delivered in full · ${TEST_SAMPLE.en.price}
```

**Zelfde knop in het Nederlands. De knop op /faq.**

```
voor:  Eén beeld · ${TEST_SAMPLE.nl.price}
na:    Eén product volledig geleverd · ${TEST_SAMPLE.nl.price}
```

---

## CatalogPage.astro

12 wijzigingen.

**“ladder” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  See the price ladder
na:    See the price per product
```

**“ladder” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Standard is pure white (#FFFFFF). You can also enter any hex code — a light, neutral colour works best — applied behind every product you send. If you pick Amazon, bol or Zalando in the order, the background locks to white because those platforms require it; if you want your own colour as well, order the product twice and it is simply charged at the ladder rate.
na:    Standard is pure white (#FFFFFF). You can also enter any hex code — a light, neutral colour works best — applied behind every product you send. If you pick Amazon, bol or Zalando in the order, the background locks to white because those platforms require it; if you want your own colour as well, order the product twice and it is simply charged at the per-product rate.
```

**Ons eigen woord vervangen door het woord dat de klant gebruikt.**

```
voor:  Bekijk de prijsstaffel
na:    Bekijk de prijs per product
```

**Ons eigen woord vervangen door het woord dat de klant gebruikt.**

```
voor:  Standaard is puur wit (#FFFFFF). Je kunt ook elke hexcode invoeren — een lichte, neutrale kleur werkt het best — toegepast achter elk product dat je opstuurt. Kies je bij je bestelling Amazon, bol of Zalando, dan staat de achtergrond vast op wit omdat die platforms dat eisen; wil je daarnaast je eigen kleur, bestel het product dan twee keer en je betaalt gewoon het staffeltarief.
na:    Standaard is puur wit (#FFFFFF). Je kunt ook elke hexcode invoeren — een lichte, neutrale kleur werkt het best — toegepast achter elk product dat je opstuurt. Kies je bij je bestelling Amazon, bol of Zalando, dan staat de achtergrond vast op wit omdat die platforms dat eisen; wil je daarnaast je eigen kleur, bestel het product dan twee keer en je betaalt gewoon het tarief per product.
```

**“rung” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  The rate applies to every product in the order, not only the ones past the rung — so ${floorFrom} products are ${euro(floor, 'en')} each, all of them.
na:    The rate applies to every product in the order, not only the ones above that count — so ${floorFrom} products are ${euro(floor, 'en')} each, all of them.
```

**“rung” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  ${euro(entry, 'en')} ${vatLabel('excl', 'en')} for one product, and the rate falls a rung at a time to ${euro(floor, 'en')} from ${floorFrom} products up. Whatever the count, a set is four photos — front, back, a close-up of the logo or fabric, and one on-model shot.
na:    ${euro(entry, 'en')} ${vatLabel('excl', 'en')} for one product, and the rate falls a step at a time to ${euro(floor, 'en')} from ${floorFrom} products up. Whatever the count, a set is four photos — front, back, a close-up of the logo or fabric, and one on-model shot.
```

**“venster” en “capaciteitsagenda” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Onder ${WINDOW_THRESHOLD} producten: ${t0.queue.nl.toLowerCase()}. Vanaf ${WINDOW_THRESHOLD} gaat de bestelling in de capaciteitsagenda en krijgt hij het gereserveerde venster.
na:    Onder ${WINDOW_THRESHOLD} producten: ${t0.queue.nl.toLowerCase()}. Vanaf ${WINDOW_THRESHOLD} gaat de bestelling in de agenda en krijgt hij de vastgezette leverdatum.
```

**“trede” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Het tarief geldt voor elk product in de bestelling, niet alleen voor de producten voorbij de trede — ${floorFrom} producten kosten dus allemaal ${euro(floor, 'nl')}.
na:    Het tarief geldt voor elk product in de bestelling, niet alleen voor de producten boven die grens — ${floorFrom} producten kosten dus allemaal ${euro(floor, 'nl')}.
```

**“venster” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Onder ${WINDOW_THRESHOLD} producten: ${turnaround('unattended', 'nl').toLowerCase()}. ${t0.queue.nl} — een bestelling van ${WINDOW_THRESHOLD} producten of meer staat al in de agenda en houdt zijn venster vast, dus een drukke week kan een kleinere bestelling verschuiven. Vanaf ${WINDOW_THRESHOLD} producten is jouw bestelling degene met het venster: ${turnaround('attended', 'nl').toLowerCase()}.
na:    Onder ${WINDOW_THRESHOLD} producten: ${turnaround('unattended', 'nl').toLowerCase()}. ${t0.queue.nl} — een bestelling van ${WINDOW_THRESHOLD} producten of meer staat al in de agenda en houdt zijn leverdatum vast, dus een drukke week kan een kleinere bestelling verschuiven. Vanaf ${WINDOW_THRESHOLD} producten is jouw bestelling degene met de leverdatum: ${turnaround('attended', 'nl').toLowerCase()}.
```

**"Capacity calendar" en "reserved window" zijn beide onze woorden.**

```
voor:  Under ${WINDOW_THRESHOLD} products: ${t0.queue.en.toLowerCase()}. From ${WINDOW_THRESHOLD}, the order goes into the capacity calendar and gets the reserved window.
na:    Under ${WINDOW_THRESHOLD} products: ${t0.queue.en.toLowerCase()}. From ${WINDOW_THRESHOLD}, we hold a delivery date for the order and confirm it in writing.
```

**Drie keer "window" in één antwoord.**

```
voor:  Under ${WINDOW_THRESHOLD} products: ${turnaround('unattended', 'en').toLowerCase()}. ${t0.queue.en} — an order of ${WINDOW_THRESHOLD} products or more is already booked into the calendar and holds its window, so a busy week can move a smaller order. From ${WINDOW_THRESHOLD} products your own order is the one holding a window: ${turnaround('attended', 'en').toLowerCase()}.
na:    Under ${WINDOW_THRESHOLD} products: ${turnaround('unattended', 'en').toLowerCase()}. ${t0.queue.en} — an order of ${WINDOW_THRESHOLD} products or more already has a date held for it, so a busy week can move a smaller order. From ${WINDOW_THRESHOLD} products your own order is the one with the date: ${turnaround('attended', 'en').toLowerCase()}.
```

**"Trede voor trede" is onze prijstabel, niet zijn taal.**

```
voor:  ${euro(entry, 'nl')} ${vatLabel('excl', 'nl')} voor één product, en het tarief zakt trede voor trede naar ${euro(floor, 'nl')} vanaf ${floorFrom} producten. Bij elk aantal is een set vier foto’s — voorkant, achterkant, een close-up van het logo of de stof, en één on-model shot.
na:    ${euro(entry, 'nl')} ${vatLabel('excl', 'nl')} voor één product, en dat tarief zakt stap voor stap naar ${euro(floor, 'nl')} vanaf ${floorFrom} producten. Bij elk aantal is een set vier foto’s — voorkant, achterkant, een close-up van het logo of de stof, en één foto op een model.
```

---

## LifestylePage.astro

17 wijzigingen.

**“ladder” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  See the price ladder
na:    See the price per product
```

**“ladder” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  One styled look per order. A second scene for the same product is simply a second order at the ladder rate — which also means the two sets stay distinct rather than being blended into a mood that is neither.
na:    One styled look per order. A second scene for the same product is simply a second order at the per-product rate — which also means the two sets stay distinct rather than being blended into a mood that is neither.
```

**Ons eigen woord vervangen door het woord dat de klant gebruikt.**

```
voor:  Bekijk de prijsstaffel
na:    Bekijk de prijs per product
```

**Ons eigen woord vervangen door het woord dat de klant gebruikt.**

```
voor:  Eén gestylede look per bestelling. Een tweede scène voor hetzelfde product is gewoon een tweede bestelling tegen het staffeltarief — en zo blijven de twee sets ook echt van elkaar te onderscheiden in plaats van te vervagen tot een sfeer die geen van beide is.
na:    Eén gestylede look per bestelling. Een tweede scène voor hetzelfde product is gewoon een tweede bestelling tegen het tarief per product — en zo blijven de twee sets ook echt van elkaar te onderscheiden in plaats van te vervagen tot een sfeer die geen van beide is.
```

**“rung” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  The rate applies to every product in the order, not only the ones past the rung — so ${floorFrom} products are ${euro(floor, 'en')} each, all of them.
na:    The rate applies to every product in the order, not only the ones above that count — so ${floorFrom} products are ${euro(floor, 'en')} each, all of them.
```

**“rung” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  ${euro(entry, 'en')} ${vatLabel('excl', 'en')} for one product, and the rate falls a rung at a time to ${euro(floor, 'en')} from ${floorFrom} products up. Whatever the count, a carousel is three photos of one product in one styled look.
na:    ${euro(entry, 'en')} ${vatLabel('excl', 'en')} for one product, and the rate falls a step at a time to ${euro(floor, 'en')} from ${floorFrom} products up. Whatever the count, a carousel is three photos of one product in one styled look.
```

**“venster” en “capaciteitsagenda” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Onder ${WINDOW_THRESHOLD} producten: ${t0.queue.nl.toLowerCase()}. Vanaf ${WINDOW_THRESHOLD} gaat de bestelling in de capaciteitsagenda en krijgt hij het gereserveerde venster.
na:    Onder ${WINDOW_THRESHOLD} producten: ${t0.queue.nl.toLowerCase()}. Vanaf ${WINDOW_THRESHOLD} gaat de bestelling in de agenda en krijgt hij de vastgezette leverdatum.
```

**“trede” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Het tarief geldt voor elk product in de bestelling, niet alleen voor de producten voorbij de trede — ${floorFrom} producten kosten dus allemaal ${euro(floor, 'nl')}.
na:    Het tarief geldt voor elk product in de bestelling, niet alleen voor de producten boven die grens — ${floorFrom} producten kosten dus allemaal ${euro(floor, 'nl')}.
```

**“venster” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Onder ${WINDOW_THRESHOLD} producten: ${turnaround('unattended', 'nl').toLowerCase()}. ${t0.queue.nl} — een bestelling van ${WINDOW_THRESHOLD} producten of meer staat al in de agenda en houdt zijn venster vast, dus een drukke week kan een kleinere bestelling verschuiven. Vanaf ${WINDOW_THRESHOLD} producten is jouw bestelling degene met het venster: ${turnaround('attended', 'nl').toLowerCase()}.
na:    Onder ${WINDOW_THRESHOLD} producten: ${turnaround('unattended', 'nl').toLowerCase()}. ${t0.queue.nl} — een bestelling van ${WINDOW_THRESHOLD} producten of meer staat al in de agenda en houdt zijn leverdatum vast, dus een drukke week kan een kleinere bestelling verschuiven. Vanaf ${WINDOW_THRESHOLD} producten is jouw bestelling degene met de leverdatum: ${turnaround('attended', 'nl').toLowerCase()}.
```

**Zelfde interne woorden als op /catalog.**

```
voor:  Under ${WINDOW_THRESHOLD} products: ${t0.queue.en.toLowerCase()}. From ${WINDOW_THRESHOLD}, the order goes into the capacity calendar and gets the reserved window.
na:    Under ${WINDOW_THRESHOLD} products: ${t0.queue.en.toLowerCase()}. From ${WINDOW_THRESHOLD}, we hold a delivery date for the order and confirm it in writing.
```

**Zelfde antwoord als op /catalog, met drie keer "window".**

```
voor:  Under ${WINDOW_THRESHOLD} products: ${turnaround('unattended', 'en').toLowerCase()}. ${t0.queue.en} — an order of ${WINDOW_THRESHOLD} products or more is already booked into the calendar and holds its window, so a busy week can move a smaller order. From ${WINDOW_THRESHOLD} products your own order is the one holding a window: ${turnaround('attended', 'en').toLowerCase()}.
na:    Under ${WINDOW_THRESHOLD} products: ${turnaround('unattended', 'en').toLowerCase()}. ${t0.queue.en} — an order of ${WINDOW_THRESHOLD} products or more already has a date held for it, so a busy week can move a smaller order. From ${WINDOW_THRESHOLD} products your own order is the one with the date: ${turnaround('attended', 'en').toLowerCase()}.
```

**"Trede voor trede", en "gestylede" is een verkeerde vervoeging van stylen (gestyld).**

```
voor:  `${euro(entry, 'nl')} ${vatLabel('excl', 'nl')} voor één product, en het tarief zakt trede voor trede naar ${euro(floor, 'nl')} vanaf ${floorFrom} producten.
na:    `${euro(entry, 'nl')} ${vatLabel('excl', 'nl')} voor één product, en dat tarief zakt stap voor stap naar ${euro(floor, 'nl')} vanaf ${floorFrom} producten.
```

**"Gestylede" is een verkeerde vervoeging: stylen wordt gestyld.**

```
voor:  'Elke lifestyle-bestelling is je product in één gestylede look
na:    'Elke lifestyle-bestelling is je product in één gestylde look
```

**Zelfde vervoeging.**

```
voor:  'Eén gestylede look per bestelling
na:    'Eén gestylde look per bestelling
```

**Zelfde vervoeging, in de alt-tekst.**

```
voor:  Een gestylede lifestyle-scène gemaakt door VISUAILS
na:    Een gestylde lifestyle-scène gemaakt door VISUAILS
```

**"Gescoped" is een anglicisme én ons interne woord voor wat de klant bestelt.**

```
voor:  alles daarbuiten wordt gescoped en op offerte gezet, dus laat weten wat je in gedachten hebt en we komen met een prijs terug in plaats van er een te gokken.'
na:    alles daarbuiten spreken we eerst met je af en zetten we op een offerte, dus laat weten wat je in gedachten hebt en we komen met een prijs terug in plaats van er een te gokken.'
```

**"Gestylede" is een verkeerde vervoeging; de andere drie in dit bestand zijn al gecorrigeerd.**

```
voor:  Bij elk aantal is een carousel drie foto’s van één product in één gestylede look.
na:    Bij elk aantal is een carousel drie foto’s van één product in één gestylde look.
```

---

## VideoPage.astro

8 wijzigingen.

**“ladder” en “rung” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Catalog and lifestyle photos are priced per product, and that rate falls a rung at a time as the count rises. A clip is not on that ladder — the work per clip is the same whether it arrives alone or with fifty products, so the rate stays put. It is the same figure on its own as it is inside a larger order.
na:    Catalog and lifestyle photos are priced per product, and that rate falls a step at a time as the count rises. A clip is not part of that price per product — the work per clip is the same whether it arrives alone or with fifty products, so the rate stays put. It is the same figure on its own as it is inside a larger order.
```

**"Trede voor trede", plus een halve zin die de vervanging had achtergelaten.**

```
voor:  Catalog- en lifestylefoto’s zijn geprijsd per product, en dat tarief zakt trede voor trede naarmate het aantal stijgt. Een clip staat niet op die staffel — het werk per clip is hetzelfde of hij nu alleen komt of met vijftig producten, dus het tarief blijft staan. Los is het hetzelfde bedrag als binnen een grotere bestelling.
na:    Catalog- en lifestylefoto’s zijn geprijsd per product, en dat tarief zakt stap voor stap naarmate het aantal stijgt. Bij een clip werkt dat niet zo — het werk per clip is hetzelfde of hij nu alleen komt of met vijftig producten, dus het tarief blijft staan. Los is het hetzelfde bedrag als binnen een grotere bestelling.
```

**“venster” en “capaciteitsagenda” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Onder ${WINDOW_THRESHOLD} producten: ${t0.queue.nl.toLowerCase()}. Vanaf ${WINDOW_THRESHOLD} gaat de bestelling in de capaciteitsagenda en krijgt hij het gereserveerde venster.
na:    Onder ${WINDOW_THRESHOLD} producten: ${t0.queue.nl.toLowerCase()}. Vanaf ${WINDOW_THRESHOLD} gaat de bestelling in de agenda en krijgt hij de vastgezette leverdatum.
```

**“venster” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Onder ${WINDOW_THRESHOLD} producten: ${turnaround('unattended', 'nl').toLowerCase()}. ${t0.queue.nl} — een bestelling van ${WINDOW_THRESHOLD} producten of meer staat al in de agenda en houdt zijn venster vast, dus een drukke week kan een kleinere bestelling verschuiven. Vanaf ${WINDOW_THRESHOLD} producten is jouw bestelling degene met het venster: ${turnaround('attended', 'nl').toLowerCase()}.
na:    Onder ${WINDOW_THRESHOLD} producten: ${turnaround('unattended', 'nl').toLowerCase()}. ${t0.queue.nl} — een bestelling van ${WINDOW_THRESHOLD} producten of meer staat al in de agenda en houdt zijn leverdatum vast, dus een drukke week kan een kleinere bestelling verschuiven. Vanaf ${WINDOW_THRESHOLD} producten is jouw bestelling degene met de leverdatum: ${turnaround('attended', 'nl').toLowerCase()}.
```

**Zelfde interne woorden als op /catalog en /lifestyle.**

```
voor:  Under ${WINDOW_THRESHOLD} products: ${t0.queue.en.toLowerCase()}. From ${WINDOW_THRESHOLD}, the order goes into the capacity calendar and gets the reserved window.
na:    Under ${WINDOW_THRESHOLD} products: ${t0.queue.en.toLowerCase()}. From ${WINDOW_THRESHOLD}, we hold a delivery date for the order and confirm it in writing.
```

**"That ladder" is onze prijstabel.**

```
voor:  A clip does not sit on that ladder: it is one rate, whatever else is in the order.
na:    A clip does not work that way: it is one rate, whatever else is in the order.
```

**Zelfde in het Nederlands.**

```
voor:  Een clip staat niet op die staffel: het is één tarief, wat er verder ook in de bestelling zit.
na:    Bij een clip werkt dat niet zo: het is één tarief, wat er verder ook in de bestelling zit.
```

**Twee keer "window" in dit antwoord; /catalog en /lifestyle waren al aangepast, /video was blijven staan.**

```
voor:  Under ${WINDOW_THRESHOLD} products: ${turnaround('unattended', 'en').toLowerCase()}. ${t0.queue.en} — an order of ${WINDOW_THRESHOLD} products or more is already booked into the calendar and holds its window, so a busy week can move a smaller order. From ${WINDOW_THRESHOLD} products your own order is the one holding a window: ${turnaround('attended', 'en').toLowerCase()}.
na:    Under ${WINDOW_THRESHOLD} products: ${turnaround('unattended', 'en').toLowerCase()}. ${t0.queue.en} — an order of ${WINDOW_THRESHOLD} products or more already has a date held for it, so a busy week can move a smaller order. From ${WINDOW_THRESHOLD} products your own order is the one with the date: ${turnaround('attended', 'en').toLowerCase()}.
```

---

## PortalPage.astro

8 wijzigingen.

**Letterlijk de formule die Lucas afkeurde ("See it first"): "it" wordt in de kop zelf niet benoemd. Zelfde kop in het Engels.**

```
voor:  See it on your own product first.
na:    One of your own products, delivered in full, first.
```

**Zelfde kop in het Nederlands. De sluitkop van /portal.**

```
voor:  Zie het eerst op je eigen product.
na:    Eerst één product van jezelf, volledig geleverd.
```

**“window” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Received', 'The order is in and the window is held.
na:    Received', 'The order is in and the delivery date is held.
```

**“drop” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Treat the link the way you would treat a key: anyone who has it can see the drop. Send it on if a colleague needs it, and ask us for a new one if it goes somewhere it should not.
na:    Treat the link the way you would treat a key: anyone who has it can see the order. Send it on if a colleague needs it, and ask us for a new one if it goes somewhere it should not.
```

**Zelfde in het Engels.**

```
voor:  One visual, made from your photo, human-checked. The portal comes with the first real drop.
na:    One product in full, made from your photo, human-checked. The portal comes with every paid order.
```

**“drop” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Behandel de link zoals je een sleutel behandelt: wie hem heeft, kan de drop zien. Stuur hem gerust door als een collega hem nodig heeft, en vraag ons om een nieuwe als hij ergens belandt waar hij niet hoort.
na:    Behandel de link zoals je een sleutel behandelt: wie hem heeft, kan de bestelling zien. Stuur hem gerust door als een collega hem nodig heeft, en vraag ons om een nieuwe als hij ergens belandt waar hij niet hoort.
```

**"Het portaal komt bij de eerste echte bestelling" — na de sweep klopt dat niet meer: elke betaalde bestelling geeft toegang. En de lede eronder zei "Eén beeld".**

```
voor:  Eén beeld, gemaakt van jouw foto, door een mens nagekeken. Het portaal komt bij de eerste echte drop.
na:    Eén product volledig, gemaakt van jouw foto, door een mens nagekeken. Het portaal krijg je bij elke betaalde bestelling.
```

**"Het venster is vastgehouden" — intern woord in de eerste van de zes statussen.**

```
voor:  Ontvangen', 'De order is binnen en het venster is vastgehouden.
na:    Ontvangen', 'Je bestelling is binnen en de leverdatum staat vast.
```

---

## StudioPage.astro

6 wijzigingen.

**“window” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  It does not rush an order past the review', 'The reserved window is the window the work fits in, not a target the studio sprints at. An order that is not right does not ship on time; it ships right.
na:    It does not rush an order past the review', 'The reserved delivery date is the date the work fits in, not a target the studio sprints at. An order that is not right does not ship on time; it ships right.
```

**“venster” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Het jaagt een bestelling niet langs de controle', 'Het gereserveerde venster is het venster waarin het werk past, geen doel waar de studio naartoe sprint. Een bestelling die niet klopt gaat niet op tijd weg; die gaat goed weg.
na:    Het jaagt een bestelling niet langs de controle', 'De vastgezette leverdatum is de leverdatum waarin het werk past, geen doel waar de studio naartoe sprint. Een bestelling die niet klopt gaat niet op tijd weg; die gaat goed weg.
```

**“queue” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Size decides, at ${WINDOW_THRESHOLD} products`, `From ${WINDOW_THRESHOLD} products an order goes into the calendar and holds a committed date. Smaller orders run in a standard queue and yield to it, which is what makes the committed date committed.
na:    Size decides, at ${WINDOW_THRESHOLD} products`, `From ${WINDOW_THRESHOLD} products an order goes into the calendar and holds a committed date. Smaller orders run in a normal turnaround and yield to it, which is what makes the committed date committed.
```

**“wachtrij” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Omvang beslist, bij ${WINDOW_THRESHOLD} producten`, `Vanaf ${WINDOW_THRESHOLD} producten gaat een bestelling de agenda in en houdt hij een vastgelegde datum. Kleinere bestellingen draaien in een gewone wachtrij en wijken ervoor — precies dat maakt de vastgelegde datum vastgelegd.
na:    Omvang beslist, bij ${WINDOW_THRESHOLD} producten`, `Vanaf ${WINDOW_THRESHOLD} producten gaat een bestelling de agenda in en houdt hij een vastgelegde datum. Kleinere bestellingen draaien in een normale doorlooptijd en wijken ervoor — precies dat maakt de vastgelegde datum vastgelegd.
```

**Zelfde placeholder op /studio.**

```
voor:  Studio dashboard · capacity calendar
na:    Studio dashboard · delivery calendar
```

**Twee fouten in één zin: het werkwoord ontbreekt na "Het", en "mechanisme" is een het-woord, dus "die" moet "dat" zijn.**

```
voor:  Het waard om ronduit te zeggen, want een pagina over een mechanisme die alleen opsomt wat werkt, is een folder.
na:    Dat is het waard om ronduit te zeggen, want een pagina over een werkwijze die alleen opsomt wat er goed gaat, is een folder.
```

---

## ComparePage.astro

7 wijzigingen.

**“ladder” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  See the price ladder
na:    See the price per product
```

**Ons eigen woord vervangen door het woord dat de klant gebruikt.**

```
voor:  Bekijk de prijsstaffel
na:    Bekijk de prijs per product
```

**“ladder” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  ${orderNet} at ${ANCHOR_PRODUCTS} products — ${orderRate} per product, falling to ${floorRate} at the top of the ladder.
na:    ${orderNet} at ${ANCHOR_PRODUCTS} products — ${orderRate} per product, falling to ${floorRate} at the highest product count.
```

**“window” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  ${turnaround(tier, 'en')}. The window is cleared against the calendar before it is offered — if the week you need cannot be held, you are told that instead of given a date.
na:    ${turnaround(tier, 'en')}. The delivery date is cleared against the calendar before it is offered — if the week you need cannot be held, you are told that instead of given a date.
```

**“staffel” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  ${orderNet} bij ${ANCHOR_PRODUCTS} producten — ${orderRate} per product, aflopend tot ${floorRate} boven aan de staffel.
na:    ${orderNet} bij ${ANCHOR_PRODUCTS} producten — ${orderRate} per product, aflopend tot ${floorRate} bij het hoogste aantal producten.
```

**“venster” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  ${turnaround(tier, 'nl')}. Het venster wordt eerst tegen de agenda gehouden — kan de week die je nodig hebt niet, dan hoor je dat, in plaats van een datum.
na:    ${turnaround(tier, 'nl')}. De leverdatum wordt eerst tegen de agenda gehouden — kan de week die je nodig hebt niet, dan hoor je dat, in plaats van een datum.
```

**"de vergelijking met aan geen van beide kanten iets verstopt" is een tangconstructie die het Nederlands niet bouwt.**

```
voor:  Dit is de vergelijking met aan geen van beide kanten iets verstopt.'
na:    Hier staan ze naast elkaar, en aan geen van beide kanten is iets weggelaten.'
```

---

## BrandModelPage.astro

16 wijzigingen.

**“ladder” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Yours to keep', 'Set up once. Every order after runs at the normal ladder rate for its size.
na:    Yours to keep', 'Set up once. Every order after runs at the normal per-product rate for its size.
```

**“ladder” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  See the price ladder
na:    See the price per product
```

**“ladder” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  See the price ladder
na:    See the price per product
```

**Ons eigen woord vervangen door het woord dat de klant gebruikt.**

```
voor:  Bekijk de volledige prijsladder
na:    Bekijk alle prijzen per aantal
```

**Ons eigen woord vervangen door het woord dat de klant gebruikt.**

```
voor:  Bekijk de prijsstaffel
na:    Bekijk de prijs per product
```

**Ons eigen woord vervangen door het woord dat de klant gebruikt.**

```
voor:  The model is designed and locked before your first order is scheduled, so setup never eats into the reserved window an order of ${WINDOW_THRESHOLD} products or more is given.
na:    The model is designed and locked before your first order is scheduled, so setup never eats into the reserved delivery date an order of ${WINDOW_THRESHOLD} products or more is given.
```

**“venster” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Het model wordt ontworpen en vastgezet vóórdat je eerste bestelling ingepland wordt, zodat de setup nooit ten koste gaat van het gereserveerde venster dat een bestelling vanaf ${WINDOW_THRESHOLD} producten krijgt.
na:    Het model wordt ontworpen en vastgezet vóórdat je eerste bestelling ingepland wordt, zodat de setup nooit ten koste gaat van de vastgezette leverdatum die een bestelling vanaf ${WINDOW_THRESHOLD} producten krijgt.
```

**"Briefing" als kopje van de belofte.**

```
voor:  Gebouwd op jouw briefing', 'Leeftijd, styling, sfeer, en de dingen die je nooit wil zien.
na:    Gebouwd op wat jij ons vertelt', 'Leeftijd, styling, sfeer, en wat je nooit wil zien.
```

**"Things" is een loos zelfstandig naamwoord (STIJL.md regel 3).**

```
voor:  Built from your brief', 'Age, styling, mood, the things you never want to see.
na:    Built from what you tell us', 'Age, styling, mood, and what you never want to see.
```

**"Intake" en "briefing" in dezelfde stap.**

```
voor:  Intake', 'Je stuurt referenties en een briefing over de look die je wilt.
na:    Jij stuurt', 'Je stuurt referenties en vertelt welke look je wilt.
```

**Zelfde stap in het Engels.**

```
voor:  Intake', 'You send references and a brief on the look you want.
na:    You send', 'You send references and tell us the look you want.
```

**Een terugbetaling zonder aantal is een maatstaf zonder waarde, terwijl het aantal op dezelfde pagina bekend is.**

```
voor:  Credited back', 'across your first orders
na:    'Credited back', `across your first ${BRAND_MODEL_CREDIT_DROPS} orders`
```

**Zelfde, in het Nederlands.**

```
voor:  Terugverdiend', 'over je eerste bestellingen
na:    'Terugverdiend', `over je eerste ${BRAND_MODEL_CREDIT_DROPS} bestellingen`
```

**"je catalog" gaat hier over de catalogus van de klant, dus het Nederlandse woord; en de slotzin is een uit het Engels overgenomen infinitiefconstructie.**

```
voor:  zodat je catalog en je feed samenhangen in plaats van uit losse sessies samengesteld te lijken.'
na:    zodat je catalogus en je feed samenhangen in plaats van over te komen als losse sessies.'
```

**"Dit is waar X ophouden Y te zijn" is precies de constructie die STIJL.md als hét voorbeeld van fout Nederlands aanhaalt.**

```
voor:  'Dit is waar visuals ophouden foto’s te zijn en merkwaarde worden. Een consistent gezicht verandert een scroll-voorbij in herkenning: mensen kennen je beelden voordat ze je naam lezen.
na:    'Hier stoppen beelden foto’s te zijn: ze worden merkwaarde. Eén vast gezicht maakt van voorbijscrollen herkenning — mensen kennen je beelden voordat ze je naam lezen.
```

**"een catalog" is hier de catalogus van de klant.**

```
voor:  Dat is het deel dat een catalog overleeft.'
na:    Dat is het deel dat een hele catalogus overleeft.'
```

---

## ModelsPage.astro

4 wijzigingen.

**“ladder” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  See the price ladder
na:    See the price per product
```

**“ladder” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  See the price ladder
na:    See the price per product
```

**Ons eigen woord vervangen door het woord dat de klant gebruikt.**

```
voor:  Bekijk de volledige prijsladder
na:    Bekijk alle prijzen per aantal
```

**Ons eigen woord vervangen door het woord dat de klant gebruikt.**

```
voor:  Bekijk de prijsstaffel
na:    Bekijk de prijs per product
```

---

## StartPage.astro

14 wijzigingen.

**"Things" staat op de lijst loze zelfstandige naamwoorden in STIJL.md regel 3.**

```
voor:  Three things the studio does that a form cannot price on its own yet. Each has a page saying where it stands and how to get in the queue.
na:    Three services the studio does that a form cannot price on its own yet. Each has a page saying where it stands and how to get in line.
```

**“ladder” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Reserved capacity every month, below the ladder rate. Agreed in writing first.
na:    Reserved capacity every month, below the per-product rate. Agreed in writing first.
```

**"Dingen" is hetzelfde woord in het Nederlands.**

```
voor:  Drie dingen die de studio doet en die een formulier nog niet zelf kan prijzen. Elk heeft een pagina die zegt hoe het ervoor staat en hoe je in de wachtrij komt.
na:    Drie diensten die de studio doet en die een formulier nog niet zelf kan prijzen. Elk heeft een pagina die zegt hoe het ervoor staat en hoe je in de rij komt.
```

**Ons eigen woord vervangen door het woord dat de klant gebruikt.**

```
voor:  Elke maand gereserveerde capaciteit, onder het staffeltarief. Eerst schriftelijk afgesproken.
na:    Elke maand gereserveerde capaciteit, onder het tarief per product. Eerst schriftelijk afgesproken.
```

**Zelfde link in het Nederlands; de vervanging had hier een halve zin overgelaten.**

```
voor:  De hele staffel, en wat elke trede oplevert
na:    Alle prijzen per aantal, en wat je er bij elk aantal voor krijgt
```

**“queue” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Pick the work and the flow follows it. The rate per product falls as the count rises, and from ${WINDOW_THRESHOLD} products an order gets a reserved window instead of the standard queue.
na:    Pick the work and the flow follows it. The rate per product falls as the count rises, and from ${WINDOW_THRESHOLD} products an order gets a reserved delivery date instead of the normal turnaround.
```

**“pipeline” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  One product, ${sample.price}, ${sample.unit}. It runs through the same pipeline as a paid order, so what you see is what you would get.
na:    One product, ${sample.price}, ${sample.unit}. It runs through the same production as a paid order, so what you see is what you would get.
```

**“venster” en “wachtrij” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Kies het werk, dan volgt de flow. Het tarief per product daalt naarmate het aantal stijgt, en vanaf ${WINDOW_THRESHOLD} producten krijgt een bestelling een gereserveerd venster in plaats van de standaard wachtrij.
na:    Kies het werk, dan volgt de flow. Het tarief per product daalt naarmate het aantal stijgt, en vanaf ${WINDOW_THRESHOLD} producten krijgt een bestelling een vastgezette leverdatum in plaats van de normale doorlooptijd.
```

**“pipeline” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Eén product, ${sample.price}, ${sample.unit}. Het loopt door dezelfde pipeline als een betaalde bestelling, dus wat je ziet is wat je zou krijgen.
na:    Eén product, ${sample.price}, ${sample.unit}. Het loopt door dezelfde productie als een betaalde bestelling, dus wat je ziet is wat je zou krijgen.
```

**Linktekst naar /pricing met twee interne woorden; "what each rung buys" zegt een bezoeker niets.**

```
voor:  The whole ladder, and what each rung buys
na:    Every price by count, and what each one includes
```

**"Briefing" is ons woord; en "gebouwd vanuit" is naamwoordstijl.**

```
voor:  Eén gezicht, alleen voor jou. Gebouwd vanuit een briefing, dus het begint met een gesprek.
na:    Eén gezicht, alleen voor jou. We bouwen het van wat jij ons vertelt, dus het begint met een gesprek.
```

**"Built from a brief" — ons woord.**

```
voor:  One face made only for you. Built from a brief, so it starts with a conversation.
na:    One face made only for you. We build it from what you tell us, so it starts with a conversation.
```

**"By intake" is het meest prominente label op deze kaart, en het is ons woord.**

```
voor:  By intake
na:    After a conversation
```

**Zelfde label in het Nederlands.**

```
voor:  Via intake
na:    Na een gesprek
```

---

## TierCompare.astro

5 wijzigingen.

**“staffel” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Bekijk de staffel
na:    Bekijk de prijs per product
```

**“ladder” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  See the price ladder
na:    See the price per product
```

**“venster” en “wachtrij” en “trede” en “capaciteitsagenda” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Je kiest geen serviceniveau — de omvang van je bestelling bepaalt het. Vanaf ${WINDOW_THRESHOLD} producten gaat een bestelling in de capaciteitsagenda en krijgt hij het gereserveerde venster; daaronder loopt hij in de standaard wachtrij. Dat is ook precies het aantal waarbij het tarief per product een trede zakt, dus er is één grens, geen twee. Beide lopen door dezelfde productie en dezelfde controle.
na:    Je kiest geen serviceniveau — de omvang van je bestelling bepaalt het. Vanaf ${WINDOW_THRESHOLD} producten gaat een bestelling in de agenda en krijgt hij de vastgezette leverdatum; daaronder loopt hij in de normale doorlooptijd. Dat is ook precies het aantal waarbij het tarief per product een stap zakt, dus er is één grens, geen twee. Beide lopen door dezelfde productie en dezelfde controle.
```

**"Capacity calendar" en "reserved window" in een alinea die op vier pagina's wordt hergebruikt.**

```
voor:  `You do not pick a service level — the size of your order sets it. From ${WINDOW_THRESHOLD} products an order goes into the capacity calendar and gets the reserved win
na:    `You do not pick a service level — the size of your order sets it. From ${WINDOW_THRESHOLD} products we hold a delivery date for the order and confirm it in writ
```

**HERSTEL VAN MIJN EIGEN FOUT: mijn vervanging kapte deze zin midden in het woord "writing" af, waardoor er "confirm it in writdow" op vier pagina's stond. Meteen ook de twee interne woorden eruit die in de staart nog stonden.**

```
voor:  You do not pick a service level — the size of your order sets it. From ${WINDOW_THRESHOLD} products we hold a delivery date for the order and confirm it in writdow; below that it runs in the standard queue. That is also the count at which the rate per product drops a rung, so there is one line to cross rather than two. Both run through the same production and the same check.
na:    You do not pick a service level — the size of your order sets it. From ${WINDOW_THRESHOLD} products we hold a delivery date for the order and confirm it in writing; below that count the normal turnaround applies. That is also the count at which the rate per product drops a step, so there is one line to cross rather than two. Both run through the same production and the same check.
```

---

## FigDash.astro

2 wijzigingen.

**Zelfde naam in het dashboardvoorbeeld op de homepage; de hint zegt nu wat er in staat in plaats van "look" te herhalen.**

```
voor:  Brand kit', 'De look waar je bestellingen mee beginnen
na:    Je vaste look', 'Wie je product draagt, en waar het op staat
```

**Zelfde in het Engels.**

```
voor:  Brand kit', 'The look your orders start from
na:    Your look', 'Who wears your product, and what it sits on
```

---

## order/OrderFlow.astro

97 wijzigingen.

**“window” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  That is more than one reserved window holds, so it is planned with you rather than priced by a form.
na:    That is more than one reserved delivery date holds, so it is planned with you rather than priced by a form.
```

**“venster” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Dat is meer dan één gereserveerd venster aankan, dus dat plannen we samen in plaats van het door een formulier te laten prijzen.
na:    Dat is meer dan één vastgezette leverdatum aankan, dus dat plannen we samen in plaats van het door een formulier te laten prijzen.
```

**“ladder” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  A preview, worked out in your browser. The invoice is calculated again on our side, from the same ladder.
na:    A preview, worked out in your browser. The invoice is calculated again on our side, from the same price per product.
```

**“full outfit” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  A catalog set is priced and shot per product, so full outfits are not part of this order. Need one because it matters to the brand? Ask us and we will look at it with you.
na:    A catalog set is priced and shot per product, so complete looks are not part of this order. Need one because it matters to the brand? Ask us and we will look at it with you.
```

**“ladder” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  The whole ladder
na:    The whole price per product
```

**“window” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  This order does not need a reserved window
na:    This order does not need a reserved delivery date
```

**“windows” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  These windows can be held for you
na:    These delivery dates can be held for you
```

**“window” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Pick one. Nothing is reserved by looking at it — the window is held when this order arrives, and confirmed before anything is invoiced.
na:    Pick one. Nothing is reserved by looking at it — the delivery date is held when this order arrives, and confirmed before anything is invoiced.
```

**“window” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Send the order anyway and you get the first window that opens, in writing, before anything is invoiced.
na:    Send the order anyway and you get the first delivery date that opens, in writing, before anything is invoiced.
```

**"Two delivery dates and a conversation" is de interne planning, niet wat de klant hoeft te weten.**

```
voor:  products. More than that is two windows and a conversation. Send this and we will plan it with you.
na:    products. More than that we split over two weeks, and we plan that with you. Send this and we will come back with the dates.
```

**“window” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  That is our problem, not yours. Try again, or send the order and we will confirm a window by email.
na:    That is our problem, not yours. Try again, or send the order and we will confirm a delivery date by email.
```

**“window” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  That window went while you were filling this in
na:    That delivery date went while you were filling this in
```

**“window” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Without JavaScript the calendar cannot be checked from this page. Send the form and we will come back with a window in writing — no date is assumed in the meantime.
na:    Without JavaScript the calendar cannot be checked from this page. Send the form and we will come back with a delivery date in writing — no date is assumed in the meantime.
```

**“window” en “queue” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  An order with a reserved window is invoiced once that window is confirmed and before production starts. A queue order is invoiced on delivery.
na:    An order with a reserved delivery date is invoiced once that delivery date is confirmed and before production starts. A standard order is invoiced on delivery.
```

**“window” en “queue” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  An order with a reserved window lands in a portal you approve image by image. A queue order arrives as a download link.
na:    An order with a reserved delivery date lands in a portal you approve image by image. A standard order arrives as a download link.
```

**“window” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  There is no card form here on purpose. You are confirming an order — the payment link arrives by email the moment it is in, and your reserved window is held for seven days while you pay.
na:    There is no card form here on purpose. You are confirming an order — the payment link arrives by email the moment it is in, and your reserved delivery date is held for seven days while you pay.
```

**“window” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Your order is in — the window is not
na:    Your order is in — the delivery date is not
```

**“window” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  It arrived a moment after that window filled. Nothing is lost and nothing is invoiced: the order is recorded under its reference, and we come back with the first window that fits, in writing.
na:    It arrived a moment after that delivery date filled. Nothing is lost and nothing is invoiced: the order is recorded under its reference, and we come back with the first delivery date that fits, in writing.
```

**“window” en “ladder” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  JavaScript is off, so this page shows all five steps at once. Three things it cannot do that way: take your files, check the calendar, and add the total up as you go. Send the form and we will ask for the material by email, confirm a window in writing, and invoice the ladder rate for the count you pick.
na:    JavaScript is off, so this page shows all five steps at once. Three things it cannot do that way: take your files, check the calendar, and add the total up as you go. Send the form and we will ask for the material by email, confirm a delivery date in writing, and invoice the per-product rate for the count you pick.
```

**“pipeline” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  'The pipeline', `The same production run at one product and at ${ATTENDED_PER_WINDOW}.`
na:    'The production', `The same production run at one product and at ${ATTENDED_PER_WINDOW}.`
```

**“staffel” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Een voorbeeld, in je browser uitgerekend. De factuur wordt aan onze kant opnieuw berekend, uit dezelfde staffel.
na:    Een voorbeeld, in je browser uitgerekend. De factuur wordt aan onze kant opnieuw berekend, uit dezelfde prijs per product.
```

**“full outfit” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Een catalogset is per product geprijsd en per product geschoten, dus full outfits horen niet bij deze bestelling. Toch nodig omdat het belangrijk is voor je merk? Vraag het ons, dan kijken we er samen naar.
na:    Een catalogset is per product geprijsd en per product geschoten, dus complete setjes horen niet bij deze bestelling. Toch nodig omdat het belangrijk is voor je merk? Vraag het ons, dan kijken we er samen naar.
```

**“full outfit” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Waarom een full outfit meer kost
na:    Waarom een compleet setje meer kost
```

**“staffel” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  De hele staffel
na:    De hele prijs per product
```

**“venster” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Deze bestelling heeft geen gereserveerd venster nodig
na:    Deze bestelling heeft geen vastgezette leverdatum nodig
```

**“vensters” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Deze vensters kunnen voor je worden vastgehouden
na:    Deze leverdata kunnen voor je worden vastgehouden
```

**“venster” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Kies er één. Er wordt niets gereserveerd door ernaar te kijken — het venster wordt vastgehouden zodra deze bestelling binnenkomt, en bevestigd voordat er iets gefactureerd wordt.
na:    Kies er één. Er wordt niets gereserveerd door ernaar te kijken — de leverdatum wordt vastgehouden zodra deze bestelling binnenkomt, en bevestigd voordat er iets gefactureerd wordt.
```

**“venster” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Stuur de bestelling toch: je krijgt het eerste venster dat vrijkomt, op schrift, voordat er iets gefactureerd wordt.
na:    Stuur de bestelling toch: je krijgt de eerste leverdatum die vrijkomt, op schrift, voordat er iets gefactureerd wordt.
```

**“venster” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Groter dan één venster aankan
na:    Groter dan één leverdatum aankan
```

**“vensters” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  producten. Meer dan dat zijn twee vensters en een gesprek. Stuur dit en we plannen het samen.
na:    producten. Meer dan dat zijn twee leverdata en een gesprek. Stuur dit en we plannen het samen.
```

**“venster” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Dat is ons probleem, niet dat van jou. Probeer opnieuw, of stuur de bestelling en we bevestigen een venster per e-mail.
na:    Dat is ons probleem, niet dat van jou. Probeer opnieuw, of stuur de bestelling en we bevestigen een leverdatum per e-mail.
```

**“venster” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Dat venster is weg terwijl je dit invulde
na:    Die leverdatum is weg terwijl je dit invulde
```

**“venster” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Zonder JavaScript kan de agenda niet vanaf deze pagina worden gecheckt. Verstuur het formulier, dan komen we op schrift met een venster terug — tot die tijd wordt er geen datum aangenomen.
na:    Zonder JavaScript kan de agenda niet vanaf deze pagina worden gecheckt. Verstuur het formulier, dan komen we op schrift met een leverdatum terug — tot die tijd wordt er geen datum aangenomen.
```

**“venster” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Een bestelling met een gereserveerd venster wordt gefactureerd zodra dat venster bevestigd is en voordat de productie start. Een wachtrijbestelling wordt bij levering gefactureerd.
na:    Een bestelling met een vastgezette leverdatum wordt gefactureerd zodra die leverdatum bevestigd is en voordat de productie start. Een standaardbestelling wordt bij levering gefactureerd.
```

**“venster” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Een bestelling met een gereserveerd venster komt in een portaal waar je beeld voor beeld goedkeurt. Een wachtrijbestelling komt als downloadlink.
na:    Een bestelling met een vastgezette leverdatum komt in een portaal waar je beeld voor beeld goedkeurt. Een standaardbestelling komt als downloadlink.
```

**“venster” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Hier staat met opzet geen betaalformulier. Je bevestigt een bestelling — de betaallink komt per mail zodra hij binnen is, en je gereserveerde venster blijft zeven dagen staan terwijl je betaalt.
na:    Hier staat met opzet geen betaalformulier. Je bevestigt een bestelling — de betaallink komt per mail zodra hij binnen is, en je vastgezette leverdatum blijft zeven dagen staan terwijl je betaalt.
```

**“venster” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Je bestelling staat er — het venster niet
na:    Je bestelling staat er — de leverdatum niet
```

**“venster” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Hij kwam net binnen nadat dat venster volliep. Er gaat niets verloren en er wordt niets gefactureerd: de bestelling staat onder haar referentie geregistreerd en we komen op schrift terug met het eerste venster dat past.
na:    Hij kwam net binnen nadat die leverdatum volliep. Er gaat niets verloren en er wordt niets gefactureerd: de bestelling staat onder haar referentie geregistreerd en we komen op schrift terug met de eerste leverdatum die past.
```

**“venster” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  JavaScript staat uit, dus deze pagina toont alle vijf stappen tegelijk. Drie dingen kunnen zo niet: je bestanden aannemen, de agenda checken en het totaal meerekenen. Verstuur het formulier, dan vragen we het materiaal per e-mail op, bevestigen we een venster op schrift en factureren we het staffeltarief bij het aantal dat je kiest.
na:    JavaScript staat uit, dus deze pagina toont alle vijf stappen tegelijk. Drie dingen kunnen zo niet: je bestanden aannemen, de agenda checken en het totaal meerekenen. Verstuur het formulier, dan vragen we het materiaal per e-mail op, bevestigen we een leverdatum op schrift en factureren we het tarief per product bij het aantal dat je kiest.
```

**“pipeline” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  'De pipeline', `Dezelfde productie bij één product en bij ${ATTENDED_PER_WINDOW}.`
na:    'De productie', `Dezelfde productie bij één product en bij ${ATTENDED_PER_WINDOW}.`
```

**“capacity gate” en “capacity calendar” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  ${WINDOW_THRESHOLD} products or more, so this order goes in the capacity calendar. ${turnaround('attended', 'en')}.
na:    ${WINDOW_THRESHOLD} products or more, so this order goes in the calendar. ${turnaround('attended', 'en')}.
```

**“window” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Window still to be reserved
na:    Delivery date still to be reserved
```

**“venster” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  ${TIERS.unattended.queue.nl}. Vanaf ${WINDOW_THRESHOLD} producten krijgt een bestelling in plaats daarvan een gereserveerd venster.
na:    ${TIERS.unattended.queue.nl}. Vanaf ${WINDOW_THRESHOLD} producten krijgt een bestelling in plaats daarvan een vastgezette leverdatum.
```

**“window” en “queue” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Queue and reserved window, side by side
na:    Turnaround and reserved delivery date, side by side
```

**“queue” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  'Standard queue', `Up to ${WINDOW_THRESHOLD - 1} products`
na:    'Normal turnaround', `Up to ${WINDOW_THRESHOLD - 1} products`
```

**"One delivery date covers up to" loopt niet: een datum dekt geen producten, wij houden ruimte vrij.**

```
voor:  One window covers up to
na:    Per date we hold room for up to
```

**Zelfde zin in de melding voor een te grote bestelling.**

```
voor:  A single window covers up to
na:    Per date we hold room for up to
```

**“window” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Nothing was created and nothing was charged. Pick another window below and send again.
na:    Nothing was created and nothing was charged. Pick another delivery date below and send again.
```

**“wachtrij” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  'Standaard wachtrij', `Tot en met ${WINDOW_THRESHOLD - 1} producten`
na:    'Normale doorlooptijd', `Tot en met ${WINDOW_THRESHOLD - 1} producten`
```

**Zelfde in het Nederlands.**

```
voor:  Eén product, ${sample.price}, ${sample.unit}. Dezelfde pipeline als een betaalde bestelling.
na:    Eén product volledig — ${CATALOG_IMAGES} catalogbeelden of een carousel van ${LIFESTYLE_IMAGES} — voor ${sample.price}, ${sample.unit}. Dezelfde productie als een betaalde bestelling.
```

**"full outfit" staat in de tabel bij STIJL.md regel 3; de klant hoort te lezen wat het is.**

```
voor:  Plus {price} × {n} for full outfit.
na:    Plus {price} × {n} for a complete look — trousers, top and shoes in one shot.
```

**Zelfde regel in het Nederlands; "full outfit" was hier zelfs onvertaald Engels.**

```
voor:  Plus {price} × {n} voor full outfit.
na:    Plus {price} × {n} voor een compleet setje — broek, top en schoenen in één foto.
```

**"Reserved window" is het interne woord.**

```
voor:  ${TIERS.unattended.queue.en}. From ${WINDOW_THRESHOLD} products an order gets a reserved window instead.
na:    ${TIERS.unattended.queue.en}. From ${WINDOW_THRESHOLD} products we hold a delivery date for you instead.
```

**"Capaciteitsagenda" is onze planning, niet iets wat een klant kent.**

```
voor:  ${WINDOW_THRESHOLD} producten of meer, dus deze bestelling gaat in de capaciteitsagenda. ${turnaround('attended', 'nl')}.
na:    ${WINDOW_THRESHOLD} producten of meer, dus we zetten voor deze bestelling een leverdatum vast. ${turnaround('attended', 'nl')}.
```

**Kopje van de uitleg met het interne woord erin.**

```
voor:  Why a full outfit costs more
na:    Why a complete look costs more
```

**Deze functie schrijft de samenvattingsregel op het bevestigingsscherm.**

```
voor:  None — single product',
      outfitCount: (n: number) => `${n} full outfit${n === 1 ? '' : 's'}`,
      levelsH: 'Turnaround and reserved delivery date, side by side
na:    None — single product',
      outfitCount: (n: number) => `${n} complete look${n === 1 ? '' : 's'}`,
      levelsH: 'Standard turnaround and a held date, side by side
```

**"Pipeline" in de voettekst onder de proefvisual. De laatste zet op het bestelformulier, voor wie nog twijfelt: nu staat er hoeveel beelden één product oplevert.**

```
voor:  One product, ${sample.price}, ${sample.unit}. Same pipeline as a paid order.
na:    One product in full — ${CATALOG_IMAGES} catalog images or a ${LIFESTYLE_IMAGES}-photo carousel — for ${sample.price}, ${sample.unit}. Made the same way as a paid order.
```

**Nederlandse tak van dezelfde samenvattingsregel; een Nederlandse klant las hier letterlijk "1 full outfit".**

```
voor:  'Geen — los product',
      outfitCount: (n: number) => `${n} full outfit${n === 1 ? '' : 's'}`
na:    'Geen — los product',
      outfitCount: (n: number) => `${n} compleet${n === 1 ? '' : 'e'} setje${n === 1 ? '' : 's'}`
```

**Kop met twee interne woorden in één regel.**

```
voor:  Wachtrij en gereserveerd venster, naast elkaar
na:    Normale doorlooptijd en vaste leverdatum, naast elkaar
```

**Zelfde interne woord als label.**

```
voor:  'Gereserveerd venster', `Vanaf ${WINDOW_THRESHOLD} producten`
na:    'Vaste leverdatum', `Vanaf ${WINDOW_THRESHOLD} producten`
```

**"Eén venster telt maximaal" — zowel het interne woord als een zin die niet af is.**

```
voor:  Eén venster telt maximaal
na:    Per leverdatum houden we ruimte voor maximaal
```

**Zelfde, in de melding voor een te grote bestelling.**

```
voor:  Eén venster telt maximaal
na:    Per leverdatum houden we ruimte voor maximaal
```

**Interne woord in de melding die je krijgt als de datum tijdens het invullen volliep.**

```
voor:  Er is niets aangemaakt en niets in rekening gebracht. Kies hieronder een ander venster en verstuur opnieuw.
na:    Er is niets aangemaakt en niets in rekening gebracht. Kies hieronder een andere datum en verstuur opnieuw.
```

**"De briefing" is ons woord voor wat de klant ons vertelt.**

```
voor:  Je naam, merk en contactgegevens — niet deze bestelling of de briefing.
na:    Je naam, merk en contactgegevens — niet deze bestelling of wat je ons erover vertelde.
```

**Zelfde woord in de variant voor wie nog niet is ingelogd.**

```
voor:  Je naam, merk en contactgegevens — niet deze bestelling of de briefing. Ze worden bewaard zodra je voor het eerst inlogt; de link staat in je bevestigingsmail.
na:    Je naam, merk en contactgegevens — niet deze bestelling of wat je ons erover vertelde. Ze worden bewaard zodra je voor het eerst inlogt; de link staat in je bevestigingsmail.
```

**Foutmeldingsregel 2 uit STIJL.md: noemt de grens maar niet de uitweg.**

```
voor:  Too large — {max} per file is the ceiling.
na:    Too large — {max} per file is the ceiling. Pick a smaller photo, or send it to us by email afterwards.
```

**Zelfde melding in het Nederlands.**

```
voor:  Te groot — {max} per bestand is het maximum.
na:    Te groot — {max} per bestand is het maximum. Kies een kleinere foto, of mail hem ons na.
```

**Zegt wat er is, niet wat je nu moet doen.**

```
voor:  That is {max} files, which is the ceiling for one order.
na:    That is {max} files, the ceiling for one order. Remove one before you add another.
```

**Zelfde melding in het Nederlands.**

```
voor:  Dat zijn {max} bestanden, het maximum voor één bestelling.
na:    Dat zijn {max} bestanden, het maximum voor één bestelling. Haal er één weg voordat je een nieuwe toevoegt.
```

**Een melding zonder uitweg is een doodlopende weg (STIJL.md, foutmeldingen).**

```
voor:  We could not take files just now.
na:    Our upload server did not answer. Wait a minute and try again — or send the order now and email the photos after.
```

**Zelfde melding in het Nederlands.**

```
voor:  We konden nu geen bestanden aannemen.
na:    Onze uploadserver gaf geen antwoord. Wacht een minuut en probeer opnieuw — of verstuur de bestelling nu en mail de foto's erna.
```

**"Did not go through" zegt niet wat er aan het bestand mankeert.**

```
voor:  This one did not go through.
na:    We could not read this file. Try it again, or pick another photo of the same product.
```

**Zelfde melding in het Nederlands.**

```
voor:  Deze is niet doorgekomen.
na:    We konden dit bestand niet lezen. Probeer het nog eens, of kies een andere foto van hetzelfde product.
```

**Constateert het feit, geeft geen vervolgstap.**

```
voor:  This file is empty.
na:    This file is empty — 0 bytes. Pick the photo again from your camera roll.
```

**Zelfde melding in het Nederlands.**

```
voor:  Dit bestand is leeg.
na:    Dit bestand is leeg — 0 bytes. Kies de foto opnieuw uit je fotolijst.
```

**Geen vervolgstap.**

```
voor:  Nothing arrived with that one.
na:    Nothing arrived with that one. Select the photo again — sometimes the file picker hands over an empty slot.
```

**Zelfde melding in het Nederlands.**

```
voor:  Er kwam niets mee.
na:    Er kwam niets mee. Kies de foto opnieuw — soms geeft de bestandskiezer een leeg vakje door.
```

**Dezelfde lege melding als de generieke fout, terwijl de oorzaak anders is.**

```
voor:  This one did not go through.
na:    This upload was refused. Reload the page and add the file again — the order itself is still here.
```

**Zelfde melding in het Nederlands.**

```
voor:  Deze is niet doorgekomen.
na:    Deze upload werd geweigerd. Herlaad de pagina en voeg het bestand opnieuw toe — je bestelling staat er nog.
```

**"Did not go through" suggereert een verzendfout; het adres is onvolledig. Ook: geen schuld bij de lezer.**

```
voor:  That email address did not go through. Check it and send again.
na:    That does not look like a complete email address — it needs an @ and a domain, like naam@merk.nl. Check it and send again.
```

**Zelfde melding in het Nederlands.**

```
voor:  Dat e-mailadres kwam er niet doorheen. Controleer het en verstuur opnieuw.
na:    Dat lijkt geen volledig e-mailadres — er moet een @ en een domein in, zoals naam@merk.nl. Kijk het na en verstuur opnieuw.
```

**"Something went wrong" is precies de melding die STIJL.md verbiedt.**

```
voor:  Something went wrong at our end. Nothing has been charged. Try again, or email hello@visuails.com.
na:    Your order did not reach our server. Nothing has been charged and nothing was created. Try again, or email hello@visuails.com and we will enter it by hand.
```

**Zelfde melding in het Nederlands.**

```
voor:  Er ging iets mis aan onze kant. Er is niets in rekening gebracht. Probeer het opnieuw, of mail hello@visuails.com.
na:    Je bestelling kwam niet aan op onze server. Er is niets in rekening gebracht en er is niets aangemaakt. Probeer het opnieuw, of mail hello@visuails.com — dan zetten we hem met de hand in.
```

**Getal zonder eenheid; elke andere optie in de lijst noemt wel "products".**

```
voor:  More than ${ATTENDED_PER_WINDOW}
na:    More than ${ATTENDED_PER_WINDOW} products
```

**Zelfde, in het Nederlands.**

```
voor:  Meer dan ${ATTENDED_PER_WINDOW}
na:    Meer dan ${ATTENDED_PER_WINDOW} producten
```

**"Full outfit" als samenvattingslabel op het bevestigingsscherm (Engelse tak).**

```
voor:  'Full outfit',
      outfitN: '{price} extra × {n}',
      net: `Order value (${vatLabel('excl', 'en')})`
na:    'Complete look',
      outfitN: '{price} extra × {n}',
      net: `Order value (${vatLabel('excl', 'en')})`
```

**Zelfde label in de Nederlandse tak, waar het onvertaald Engels was.**

```
voor:  'Full outfit',
      outfitN: '{price} extra × {n}',
      net: `Orderbedrag (${vatLabel('excl', 'nl')})`
na:    'Compleet setje',
      outfitN: '{price} extra × {n}',
      net: `Orderbedrag (${vatLabel('excl', 'nl')})`
```

**"Available window" is ons woord voor de planning.**

```
voor:  { windowSub: 'Available window' }
na:    { windowSub: 'Dates we can hold' }
```

**Zelfde in het Nederlands.**

```
voor:  { windowSub: 'Beschikbaar venster' }
na:    { windowSub: 'Data die we kunnen vrijhouden' }
```

**"Venster wordt nog gereserveerd" — intern woord in de samenvatting.**

```
voor:  Venster wordt nog gereserveerd
na:    Leverdatum wordt nog vastgezet
```

**"Brief" als naam van stap drie: een klant weet dan niet wat hij moet invullen.**

```
voor:  Order', 'Material', 'Brief', 'Timing', 'Confirm
na:    Order', 'Material', 'Your notes', 'Timing', 'Confirm
```

**Zelfde stap in het Nederlands.**

```
voor:  Bestelling', 'Materiaal', 'Briefing', 'Timing', 'Bevestigen
na:    Bestelling', 'Materiaal', 'Jouw notitie', 'Timing', 'Bevestigen
```

**"Reserved window" als label naast de drempel.**

```
voor:  'Reserved window', `From ${WINDOW_THRESHOLD} products`
na:    'A date held for you', `From ${WINDOW_THRESHOLD} products`
```

**"Larger than one window holds" was in deze regel nog niet geraakt.**

```
voor:  Larger than one window holds
na:    Larger than one date can hold
```

**"Its brief" is ons woord voor wat de klant ons vertelde.**

```
voor:  Your name, brand and contact details — not this order or its brief.
na:    Your name, brand and contact details — not this order or the notes you wrote about it.
```

**Zelfde in de variant voor wie nog niet is ingelogd.**

```
voor:  Your name, brand and contact details — not this order or its brief. They are kept the moment you first sign in; the link is in your confirmation email.
na:    Your name, brand and contact details — not this order or the notes you wrote about it. They are kept the moment you first sign in; the link is in your confirmation email.
```

**De constanten moeten geïmporteerd zijn om ze te kunnen lezen.**

```
voor:  TIERS, reviewClaim, euro, TEST_SAMPLE
na:    TIERS, reviewClaim, euro, TEST_SAMPLE, CATALOG_IMAGES, LIFESTYLE_IMAGES
```

---

## order/HoldingPage.astro

15 wijzigingen.

**"Get in line" zegt niet wat de knop doet.**

```
voor:  Get in the queue
na:    Send your request
```

**“ladder” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  A set number of products every month, at a rate below the ladder.
na:    A set number of products every month, at a rate below the price per product.
```

**“queue” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  'What you get', `${planList[0].products}, ${planList[1].products} or ${planList[2].products} products a month, produced on reserved capacity rather than in the queue.`
na:    'What you get', `${planList[0].products}, ${planList[1].products} or ${planList[2].products} products a month, produced on reserved capacity rather than in the turnaround.`
```

**“staffel” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Een vast aantal producten per maand, tegen een tarief onder de staffel.
na:    Een vast aantal producten per maand, tegen een tarief onder de prijs per product.
```

**“wachtrij” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  'Wat je krijgt', `${planList[0].products}, ${planList[1].products} of ${planList[2].products} producten per maand, gemaakt op gereserveerde capaciteit in plaats van in de wachtrij.`
na:    'Wat je krijgt', `${planList[0].products}, ${planList[1].products} of ${planList[2].products} producten per maand, gemaakt op gereserveerde capaciteit in plaats van in de doorlooptijd.`
```

**"Intake" als het meest prominente woord op de pagina.**

```
voor:  Subscriptions are not self-serve yet. A plan is a minimum-term commitment against reserved studio capacity, so it is agreed in writing first — this form is that intake, and the first month is invoiced only once both sides have signed off.
na:    Subscriptions are not self-serve yet. A plan is a minimum-term commitment against reserved studio capacity, so it is agreed in writing first — this form starts that conversation, and the first month is invoiced only once both sides have signed off.
```

**Zelfde woord in het Nederlands.**

```
voor:  Abonnementen kun je nog niet zelf afsluiten. Een plan is een verplichting voor een minimumtermijn tegen gereserveerde studiocapaciteit, dus het wordt eerst schriftelijk afgesproken — dit formulier is die intake, en de eerste maand wordt pas gefactureerd als beide kanten akkoord zijn.
na:    Abonnementen kun je nog niet zelf afsluiten. Een plan is een verplichting voor een minimumtermijn tegen gereserveerde studiocapaciteit, dus het wordt eerst schriftelijk afgesproken — dit formulier begint dat gesprek, en de eerste maand wordt pas gefactureerd als beide kanten akkoord zijn.
```

**"Briefing" in de tijdlijnregel.**

```
voor:  'Timing', `${turnaround('unattended', 'nl')} zodra de briefing rond is. Er wordt geen datum genoemd voordat de agenda die vrijgeeft.`
na:    'Timing', `${turnaround('unattended', 'nl')} zodra we weten wat je nodig hebt. Er wordt geen datum genoemd voordat de agenda die vrijgeeft.`
```

**Zelfde woord in de uitleg over het merkmodel.**

```
voor:  Hier zit geen afrekenknop op, en die komt voorlopig ook niet. Een merkmodel wordt één keer gebouwd, vanuit een briefing over wie je klant is — de bruikbare versie daarvan begint met een gesprek, niet met een formulierveld.
na:    Hier zit geen afrekenknop op, en die komt voorlopig ook niet. Een merkmodel wordt één keer gebouwd, van wat jij ons vertelt over wie je klant is — de bruikbare versie daarvan begint met een gesprek, niet met een formulierveld.
```

**"Kom in de wachtrij" is de kop boven het formulier, met ons woord erin.**

```
voor:  Kom in de wachtrij
na:    Stuur je aanvraag
```

**"Scope" is ons woord.**

```
voor:  and the studio confirms scope and timing in writing before anything runs.'
na:    and the studio confirms what you are ordering and when, in writing, before anything runs.'
```

**"Once the brief is agreed".**

```
voor:  'Timing', `${turnaround('unattended', 'en')} once the brief is agreed. No date is named before the calendar clears it.`
na:    'Timing', `${turnaround('unattended', 'en')} once we know what you need. No date is named before the calendar clears it.`
```

**"From a brief about who your customer is".**

```
voor:  A Brand Model is built once, from a brief about who your customer is — the useful version of that starts with a conversation, not a form field.'
na:    A Brand Model is built once, from what you tell us about who your customer is — the useful version of that starts with a conversation, not a form field.'
```

**"By intake" — volgens het commentaar in dit bestand het eerste dat een bezoeker ziet.**

```
voor:  By intake
na:    After a conversation
```

**Zelfde label in het Nederlands.**

```
voor:  Via intake
na:    Na een gesprek
```

---

## order/ModelPicker.astro

2 wijzigingen.

**"Your briefing" is ons woord voor het formulier dat de klant net invulde.**

```
voor:  We read the products and your briefing and pick from the roster. This is the default, and it is a real answer — not a blank we will chase you about.
na:    We read the products and what you told us, and pick from the ten faces. This is the default, and it is a real answer — not a blank we will chase you about.
```

**Zelfde in het Nederlands.**

```
voor:  Wij kijken naar de producten en je briefing en kiezen uit de roster. Dit is de standaard, en het is een echt antwoord — geen leeg veld waar we je achteraf over lastigvallen.
na:    Wij kijken naar de producten en naar wat je ons vertelde, en kiezen uit de tien gezichten. Dit is de standaard, en het is een echt antwoord — geen leeg veld waar we je achteraf over lastigvallen.
```

---

## order/Step1Options.astro

1 wijziging.

**"De on-model shot" is onvertaald Engels in een Nederlandse kop boven de modelkeuze.**

```
voor:  De on-model shot
na:    De foto op een model
```

---

## lib/account.js

17 wijzigingen.

**"Standaard wachtrij" als kolomtekst in het dashboard.**

```
voor:  Standaard wachtrij — meestal 2–4 werkdagen.
na:    Normale doorlooptijd — meestal 2–4 werkdagen.
```

**Werkwoord plus voornaamwoord: los gelezen weet je niet wat er opnieuw wordt verstuurd.**

```
voor:  Send it again
na:    Send a new code
```

**Zelfde knop in het Nederlands.**

```
voor:  Opnieuw versturen
na:    Stuur een nieuwe code
```

**"See what it takes" — "it" staat niet in de knop.**

```
voor:  See what it takes
na:    See what a brand model needs
```

**Zelfde knop in het Nederlands; "daarvoor" verving het zelfstandig naamwoord.**

```
voor:  Bekijk wat daarvoor nodig is
na:    Bekijk wat een merkmodel nodig heeft
```

**"Something is still missing" zegt niet welk veld, bij een formulier met twaalf velden.**

```
voor:  Something is still missing. Every field except the ones marked optional has to be filled in — they end up on your invoice.
na:    One of the fields above is still empty. Everything except the ones marked optional has to be filled in — it all ends up on your invoice.
```

**Zelfde melding in het Nederlands.**

```
voor:  Er ontbreekt nog iets. Alles behalve de velden met "optioneel" moet ingevuld zijn — het komt op je factuur te staan.
na:    Een van de velden hierboven is nog leeg. Alles behalve de velden met "optioneel" moet ingevuld zijn — het komt allemaal op je factuur.
```

**Werkwoord plus voornaamwoord op de knop onder het revisieveld.**

```
voor:  Send this
na:    Send this note
```

**"No longer available" zegt niet waarom en niet wat je nu kunt doen.**

```
voor:  No longer available
na:    Removed after the storage period — ask us if you still need it
```

**Zelfde melding in het Nederlands.**

```
voor:  Niet meer beschikbaar
na:    Verwijderd na de bewaartermijn — vraag ons als je hem nog nodig hebt
```

**"Window" is de kolomkop boven de leverdatum in het dashboard.**

```
voor:  Window
na:    Delivery
```

**Zelfde kolomkop in het Nederlands.**

```
voor:  Venster
na:    Levering
```

**"Standard queue" is ons woord voor de doorlooptijd.**

```
voor:  Standard queue — typically 2–4 working days.
na:    Standard turnaround — usually 2–4 working days.
```

**"De herkomst van dit verzoek klopte niet" is de CSRF-controle in klanttaal vertaald, en zegt niets waar de lezer iets mee kan.**

```
voor:  ? 'De herkomst van dit verzoek klopte niet. Probeer het opnieuw vanaf je accountpagina.'
      : 'Request origin did not match. Try again from your account page.') + ' ' + detail) }), 403);
na:    ? 'Deze pagina is vanaf een andere site geopend, dus we hebben hem voor de zekerheid niet uitgevoerd. Ga terug naar je accountpagina en probeer het daar opnieuw.'
      : 'This page was opened from another site, so we did not run it. Go back to your account page and try again there.')) }), 403);
```

**"Something went wrong." is precies de melding die STIJL.md verbiedt — en dit is de terugval voor élke foutpagina.**

```
voor:  || 'Something went wrong.')}</p>`;
na:    || 'We cannot show this page right now. Go back to your account and try again in a few minutes — nothing has changed in the meantime.')}</p>`;
```

**"Brand kit" was het enige Engelse label in een Nederlandse navigatie naast Overzicht, Bestellingen en Je gegevens — en het zegt niet wat er achter zit. De lede van de pagina zei het al goed: het is de look waar je bestellingen mee beginnen.**

```
voor:  Brand kit',
    navDetails: 'Je gegevens
na:    Je vaste look',
    navDetails: 'Je gegevens
```

**Zelfde label in het Engels; "Your look" staat naast "Your details" in dezelfde vorm.**

```
voor:  Brand kit',
    navDetails: 'Your details
na:    Your look',
    navDetails: 'Your details
```

---

## lib/portal.js

4 wijzigingen.

**“window” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Your window
na:    Your delivery date
```

**“venster” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Jouw venster
na:    Jouw leverdatum
```

**Zelfde knop in het portaal.**

```
voor:  Send this
na:    'Send this note',
```

**"Versturen" zonder zelfstandig naamwoord op de knop onder het revisieveld.**

```
voor:  Versturen
na:    Verstuur deze notitie
```

---

## lib/admin.js

1 wijziging.

**De admin is jouw eigen scherm, dus jargon mag — maar als een klant belt over "mijn vaste look" en jij ziet "Brand kit" staan, moet je het in je hoofd omzetten. Dezelfde naam aan beide kanten scheelt die stap.**

```
voor:  <h2>Brand kit</h2>
  <p class="meta">Set by the customer in their own portal. Read-only here, deliberately.</p>
na:    <h2>Vaste look</h2>
  <p class="meta">Set by the customer in their own portal — the section they see as "Je vaste look". Read-only here, deliberately.</p>
```

---

## functions/api/order.js

6 wijzigingen.

**“venster” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  ? `Je venster staat gereserveerd: ${esc(from)} tot en met ${esc(to)}.`
na:    ? `Je leverdatum staat gereserveerd: ${esc(from)} tot en met ${esc(to)}.`
```

**“window” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  : `Your window is reserved: ${esc(from)} to ${esc(to)}.`;
na:    : `Your delivery date is reserved: ${esc(from)} to ${esc(to)}.`;
```

**"Briefing-foto checklist" in een onderwerpregel: een klant weet niet wat een briefingfoto is.**

```
voor:  lang === 'nl' ? 'Je briefing-foto checklist' : 'Your briefing-photo checklist'
na:    lang === 'nl' ? 'Zo maak je de productfoto’s die wij nodig hebben' : 'How to shoot the product photos we need'
```

**Zelfde titel in de mail zelf.**

```
voor:  h1(nl ? 'Je briefing-foto checklist' : 'Your briefing-photo checklist')
na:    h1(nl ? 'Zo maak je de productfoto’s die wij nodig hebben' : 'How to shoot the product photos we need')
```

**Zelfde woord in de eerste zin van die mail.**

```
voor:  ? 'Hier is de briefing-foto checklist — de vier hoeken, het licht en de achtergrond die een telefoonfoto tot een campagne maken.'
na:    ? 'Hier staat het in vier punten — de hoeken, het licht en de achtergrond die van een telefoonfoto een campagnebeeld maken.'
```

**Zelfde zin in het Engels.**

```
voor:  : "Here's the briefing-photo checklist — the four angles, lighting and background that turn a phone photo into a campaign.")
na:    : "Here it is in four points — the angles, lighting and background that turn a phone photo into a campaign image.")
```

---

## AiActPage.astro

3 wijzigingen.

**“drop” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  An approval record per order', 'On a drop, you approve or request a revision on each image individually in your portal, and every one of those decisions is stored against that image with the date it was made. If somebody later asks where an image came from and who signed it off, it is there and you can read it back from your own link.
na:    An approval record per order', 'On an order, you approve or request a revision on each image individually in your portal, and every one of those decisions is stored against that image with the date it was made. If somebody later asks where an image came from and who signed it off, it is there and you can read it back from your own link.
```

**“drop” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Een goedkeuringsdossier per bestelling', 'Bij een drop keur je in je portaal elk beeld afzonderlijk goed of vraag je een revisie aan, en elk van die beslissingen wordt bij dat beeld vastgelegd met de datum. Vraagt iemand later waar een beeld vandaan komt en wie het heeft geaccordeerd, dan staat het er en kun je het teruglezen via je eigen link.
na:    Een goedkeuringsdossier per bestelling', 'Bij een bestelling keur je in je portaal elk beeld afzonderlijk goed of vraag je een revisie aan, en elk van die beslissingen wordt bij dat beeld vastgelegd met de datum. Vraagt iemand later waar een beeld vandaan komt en wie het heeft geaccordeerd, dan staat het er en kun je het teruglezen via je eigen link.
```

**“pipeline” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  { mark: 'built', t: 'Built', b: 'The lighting, the background, the model, the motion. An AI image pipeline makes all of it. None of it is a place that exists or a shoot that happened.' }
na:    { mark: 'built', t: 'Built', b: 'The lighting, the background, the model, the motion. An AI image production makes all of it. None of it is a place that exists or a shoot that happened.' }
```

---

## data/brandModelBrief.js

13 wijzigingen.

**"Briefing" op het formulier dat er zelf naar heet.**

```
voor:  Een merkmodel wordt één keer ontworpen, voor jou, en nergens anders gebruikt. Het is niets wat je uit een lijst kiest — dus dit is een korte briefing, en daarna kijken we er samen naar en komen we met richtingen terug voordat er iets gebouwd wordt.
na:    Een merkmodel wordt één keer ontworpen, voor jou, en nergens anders gebruikt. Het is niets wat je uit een lijst kiest — dus dit zijn een paar korte vragen, en daarna kijken we er samen naar en komen we met richtingen terug voordat er iets gebouwd wordt.
```

**Zelfde in het Engels. "A short brief" op het formulier zelf.**

```
voor:  A Brand Model is designed once, for you, and used nowhere else. It is not something you pick off a list — so this is a short brief, and then we look at it together and come back with directions before anything is built.
na:    A Brand Model is designed once, for you, and used nowhere else. It is not something you pick off a list — so this is a handful of short questions, and then we go through your answers together and come back with directions before anything is built.
```

**De sectiekop heet naar het interne woord.**

```
voor:  De briefing
na:    Wat we van je nodig hebben
```

**Zelfde kop in het Engels.**

```
voor:  The brief
na:    What we need from you
```

**De verstuurknop met het interne woord — de plek waar een klant het het vaakst leest.**

```
voor:  Stuur de briefing
na:    Verstuur je antwoorden
```

**Zelfde knop in het Engels.**

```
voor:  Send the brief
na:    Send your answers
```

**De juridische regel onder de knop.**

```
voor:  Door deze briefing te versturen ga je akkoord met onze ', ' en ', '.
na:    Door dit te versturen ga je akkoord met onze ', ' en ', '.
```

**Zelfde regel in het Engels.**

```
voor:  By sending this brief you agree to our ', ' and ', '.
na:    By sending this you agree to our ', ' and ', '.
```

**De stap na het versturen.**

```
voor:  We lezen de briefing en komen binnen twee werkdagen terug met richtingen — niet één gezicht maar een paar, zodat je iets hebt om op te reageren.
na:    We lezen wat je invulde en komen binnen twee werkdagen terug met richtingen — niet één gezicht maar een paar, zodat je iets hebt om op te reageren.
```

**Zelfde stap in het Engels.**

```
voor:  We read the brief and come back within two working days with directions — not one face, a few, so you have something to react to.
na:    We read what you sent and come back within two working days with directions — not one face, a few, so you have something to react to.
```

**De prijsopmerking onderaan het formulier.**

```
voor:  Voor de briefing en het gesprek wordt niets berekend. Het setupbedrag en hoe je dat betaalt, spreken we af voordat er iets gebouwd wordt — nooit achteraf.
na:    Voor dit formulier en het gesprek erna betaal je niets. Het setupbedrag en hoe je dat betaalt, spreken we af voordat er iets gebouwd wordt — nooit achteraf.
```

**Zelfde opmerking in het Engels.**

```
voor:  Nothing is charged for the brief or for the conversation. The setup fee and how it is paid are settled before anything is built, never after.
na:    This form and the conversation after it cost you nothing. The setup fee and how it is paid are settled before anything is built, never after.
```

**Twee accenten op één woord: bij "ou" komt het accent alleen op de eerste klinker.**

```
voor:  'Dit is het veld dat van een gezicht jóúw gezicht maakt.
na:    'Dit is het veld dat van een gezicht jóuw gezicht maakt.
```

---

## data/catalogStyles.nl.js

3 wijzigingen.

**"Naadloos" staat op de lijst verboden woorden in STIJL.md regel 5.**

```
voor:  'Vaste camerageometrie, zodat nieuwe producten naadloos naast oude passen.' }
na:    'Vaste camerageometrie, zodat een nieuw product precies naast een oud past.' }
```

**Zelfde woord, en "naadloos" en "naad" staan twee keer in één zin.**

```
voor:  'Nieuwe producten passen naadloos in de set, zonder zichtbare naad.' }
na:    'Een nieuw product schuift zo in de bestaande set, zonder zichtbare naad.' }
```

**"Hoge-resolutie" hoort aan elkaar, en "marktplaats-klare" ook.**

```
voor:  Hoge-resolutie, marktplaats-klare bestanden
na:    Hogeresolutiebestanden, klaar voor de marktplaatsen
```

---

## data/channels.js

2 wijzigingen.

**"Onder die prijs per product" liep na de vervanging niet meer.**

```
voor:  Order the same product twice: one marketplace version on white, and one for your own shop and socials in the colour you want. The second one is a normal product on the ladder, so it is charged at the rate your total lands on — not as a surcharge.
na:    Order the same product twice: one marketplace version on white, and one for your own shop and socials in the colour you want. The second one counts as a normal product, so it is charged at the rate your total lands on — not as a surcharge.
```

**Zelfde in het Nederlands.**

```
voor:  Bestel hetzelfde product twee keer: één marktplaatsversie op wit, en één voor je eigen shop en socials in de kleur die je wilt. Die tweede telt als een gewoon product op de staffel, dus je betaalt het tarief waar je totaal op uitkomt — geen toeslag.
na:    Bestel hetzelfde product twee keer: één marktplaatsversie op wit, en één voor je eigen shop en socials in de kleur die je wilt. Die tweede telt gewoon als een extra product, dus je betaalt het tarief waar je totaal op uitkomt — geen toeslag.
```

---

## data/demo.js

19 wijzigingen.

**“drop” en “window” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Drop a folder and we read the folder name as the product; drop loose files and we sort them by filename. Two shots per product are required — the front and the back — and a detail and a worn shot are welcome if you have them. Phone photos on a table in window light are exactly right. Five minutes, however many products you have; the effort does not grow with the size of the order.
na:    Order a folder and we read the folder name as the product; order loose files and we sort them by filename. Two shots per product are required — the front and the back — and a detail and a worn shot are welcome if you have them. Phone photos on a table in delivery date light are exactly right. Five minutes, however many products you have; the effort does not grow with the size of the order.
```

**“window” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  We check the calendar and confirm a window
na:    We check the calendar and confirm a delivery date
```

**“capacity gate” en “capacity calendar” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  The capacity gate
na:    The calendar check
```

**“window” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Or it cannot, and you are told that with the next window that can
na:    Or it cannot, and you are told that with the next delivery date that can
```

**“venster” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Wij checken de agenda en bevestigen een venster
na:    Wij checken de agenda en bevestigen een leverdatum
```

**"en dat is wat X laat kloppen" is de Engelse cleft-zin, letterlijk vertaald.**

```
voor:  Elk product in de bestelling gaat als één batch door de pipeline, en dat is wat de belichting, de hoek en de grade over alle producten laat kloppen — los gedraaid zou dat niet zo zijn. Daarna wordt het met de hand afgewerkt in professionele editingtools, kleurgecorrigeerd naar je merk, en controleert een mens de pasvorm, de kleur tegen je eigen foto en de kadrering voordat er iets weggaat.
na:    Elk product in de bestelling gaat als één batch door de productie, en daardoor kloppen de belichting, de hoek en de kleur over alle producten met elkaar. Los gedraaid lukt dat niet. Daarna wordt het met de hand afgewerkt in professionele editingtools, kleurgecorrigeerd naar je merk, en controleert een mens de pasvorm, de kleur tegen je eigen foto en de kadrering voordat er iets weggaat.
```

**“capaciteitspoort” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  De capaciteitspoort
na:    De agendacheck
```

**“venster” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Of niet, en dan hoor je dat met het eerstvolgende venster dat het wél kan
na:    Of niet, en dan hoor je dat met de eerstvolgende leverdatum die het wél kan
```

**“queue” en “capacity gate” en “capacity calendar” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  From ${WINDOW_THRESHOLD_} products the order goes into the capacity calendar and gets ${TURN_ATT_.toLowerCase()} — in writing, and before anything is charged. If the week you need cannot be held, you are told that, with the next window that can. No date is invented to keep an order. Below ${WINDOW_THRESHOLD_} products there is no window to reserve: the order runs in the standard queue at ${TURN_UNATT_.toLowerCase()}.
na:    From ${WINDOW_THRESHOLD_} products the order goes into the calendar and gets ${TURN_ATT_.toLowerCase()} — in writing, and before anything is charged. If the week you need cannot be held, you are told that, with the next delivery date that can. No date is invented to keep an order. Below ${WINDOW_THRESHOLD_} products there is no delivery date to reserve: the order runs in the normal turnaround at ${TURN_UNATT_.toLowerCase()}.
```

**“venster” en “capaciteitsagenda” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Vanaf ${WINDOW_THRESHOLD_} producten gaat de bestelling de capaciteitsagenda in en krijgt hij ${TURN_ATT_NL_.toLowerCase()} — schriftelijk, en voordat er iets in rekening wordt gebracht. Kan de week die je nodig hebt niet worden vastgehouden, dan hoor je dat, met het eerstvolgende venster dat het wél kan. Er wordt geen datum verzonnen om een bestelling binnen te houden. Onder ${WINDOW_THRESHOLD_} producten valt er geen venster te reserveren: die bestelling loopt in de standaardwachtrij, ${TURN_UNATT_NL_.toLowerCase()}.
na:    Vanaf ${WINDOW_THRESHOLD_} producten gaat de bestelling de agenda in en krijgt hij ${TURN_ATT_NL_.toLowerCase()} — schriftelijk, en voordat er iets in rekening wordt gebracht. Kan de week die je nodig hebt niet worden vastgehouden, dan hoor je dat, met de eerstvolgende leverdatum die het wél kan. Er wordt geen datum verzonnen om een bestelling binnen te houden. Onder ${WINDOW_THRESHOLD_} producten valt er geen leverdatum te reserveren: die bestelling loopt in de normale doorlooptijd, ${TURN_UNATT_NL_.toLowerCase()}.
```

**Telwoord zonder zelfstandig naamwoord — letterlijk het foute voorbeeld uit STIJL.md regel 2.**

```
voor:  See the ten
na:    See the ten models
```

**Zelfde knop in het Nederlands.**

```
voor:  Bekijk de tien
na:    Bekijk de tien modellen
```

**"Do this" — "this" is de hele doorloop hierboven, maar de knop zegt het niet.**

```
voor:  Do this with your own product
na:    Start an order with your own products
```

**Zelfde knop in het Nederlands.**

```
voor:  Doe dit met je eigen product
na:    Start een bestelling met je eigen producten
```

**"Hoge-resolutie" hoort aan elkaar: hogeresolutie.**

```
voor:  'Hoge-resolutiebestanden, klaar voor e-commerce
na:    'Hogeresolutiebestanden, klaar voor e-commerce
```

**"Scope" is ons woord voor wat de klant bestelt.**

```
voor:  a short note on the look, when you need it, and a confirmation. The scope you choose applies to every product in the order
na:    a short note on the look, when you need it, and a confirmation. What you choose applies to every product in the order
```

**Zelfde in het Nederlands.**

```
voor:  een korte notitie over de look, wanneer je het nodig hebt, en een bevestiging. De scope die je kiest geldt voor elk product in de bestelling, dus je stelt hem één keer in en niet per product.
na:    een korte notitie over de look, wanneer je het nodig hebt, en een bevestiging. Wat je kiest geldt voor elk product in de bestelling, dus je kiest één keer en niet per product.
```

**Twee interne woorden in de labels van de doorloop.**

```
voor:  Scope', 'Material', 'Brief', 'Timing', 'Confirm
na:    What', 'Material', 'Notes', 'Timing', 'Confirm
```

**Zelfde labels in het Nederlands.**

```
voor:  Scope', 'Materiaal', 'Briefing', 'Timing', 'Bevestigen
na:    Wat', 'Materiaal', 'Notitie', 'Timing', 'Bevestigen
```

---

## data/faq.js

34 wijzigingen.

**“pipeline” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  VISUAILS maakt van een map met productfoto’s catalogsets, lifestyle-carousels en video voor een hele productlijn. De pipeline doet de productie op schaal; een mens controleert elke visual voordat die bij jou aankomt.
na:    VISUAILS maakt van een map met productfoto’s catalogsets, lifestyle-carousels en video voor een hele productlijn. Onze productie doet dat op schaal; een mens controleert elke visual voordat die bij jou aankomt.
```

**"Briefing" en "scope" in één antwoord over wat een bestelling is.**

```
voor:  Een bestelling is zoveel producten als je in één keer aanlevert — één briefing, één tarief, één factuur — met de scope die je kiest voor elk product: een catalogset, een lifestyle-carousel, of allebei. Er is geen pakket waar je lijn in moet passen en geen minimum; het tarief per product daalt naarmate het aantal stijgt. En over het woord "drop": in mode is dat jouw collectie die live gaat. Daarom noemen we onze eigen werkopdracht zo niet meer. De drop is van jou. Wat je bij ons koopt is een bestelling.
na:    Een bestelling is zoveel producten als je in één keer aanlevert — één keer aanleveren, één tarief, één factuur — met wat je per product kiest: een catalogset, een lifestyle-carousel, of allebei. Er is geen pakket waar je lijn in moet passen en geen minimum; het tarief per product daalt naarmate het aantal stijgt. En over het woord "bestelling": in mode is dat jouw collectie die live gaat. Daarom noemen we onze eigen werkopdracht zo niet meer. De bestelling is van jou. Wat je bij ons koopt is een bestelling.
```

**"Briefing" in het WhatsApp-antwoord.**

```
voor:  Altijd. Stuur de foto’s en een korte briefing en wij nemen het over. Dezelfde pipeline, dezelfde controles, dezelfde capaciteitsregels — WhatsApp is een ingang, geen sluiproute.
na:    Altijd. Stuur de foto’s en een korte notitie en wij nemen het over. Dezelfde productie, dezelfde controles, dezelfde capaciteitsregels — WhatsApp is een ingang, geen sluiproute.
```

**“venster” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Dan zeggen we dat, voordat je betaalt, in plaats van je een datum te geven en te hopen. Een gereserveerd venster wordt tegen de agenda gehouden voordat het wordt aangeboden — nooit erna. Een bestelling die al in de agenda staat, wijkt nooit voor een latere.
na:    Dan zeggen we dat, voordat je betaalt, in plaats van je een datum te geven en te hopen. Een vastgezette leverdatum wordt tegen de agenda gehouden voordat het wordt aangeboden — nooit erna. Een bestelling die al in de agenda staat, wijkt nooit voor een latere.
```

**“pipeline” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  VISUAILS turns a folder of product photos into catalog sets, lifestyle carousels and video for a whole product line. The pipeline does the production at scale; a person checks every visual before it reaches you.
na:    VISUAILS turns a folder of product photos into catalog sets, lifestyle carousels and video for a whole product line. Our production does that at scale; a person checks every visual before it reaches you.
```

**"One brief" en "the scope you choose" in één antwoord over wat een bestelling is.**

```
voor:  An order is however many products you send in one go — one brief, one rate, one invoice — with the scope you choose applied to each: a catalog set, a lifestyle carousel, or both. There is no package to fit your line into and no minimum, and the rate per product falls as the count rises. About the word "drop": in fashion it means your collection going live, so we stopped using it for our own work order. The drop is yours. What you buy from us is an order.
na:    An order is however many products you send in one go — one delivery, one rate, one invoice — with what you choose applied to each: a catalog set, a lifestyle carousel, or both. There is no package to fit your line into and no minimum, and the rate per product falls as the count rises. About the word "order": in fashion it means your collection going live, so we stopped using it for our own work order. The order is yours. What you buy from us is an order.
```

**“pipeline” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Always. Send the photos and a short brief and we take it from there. Same pipeline, same checks, same capacity rules — WhatsApp is a door, not a shortcut past anything.
na:    Always. Send the photos and a short brief and we take it from there. Same production, same checks, same capacity rules — WhatsApp is a door, not a shortcut past anything.
```

**“window” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Then we tell you that, before you pay, instead of giving you a date and hoping. A reserved window is confirmed against the calendar before it is offered — never after. An order already in the calendar is never pushed to make room for a later one.
na:    Then we tell you that, before you pay, instead of giving you a date and hoping. A reserved delivery date is confirmed against the calendar before it is offered — never after. An order already in the calendar is never pushed to make room for a later one.
```

**“venster” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Vanaf ${WINDOW_THRESHOLD} producten nadat de capaciteitscheck je venster heeft bevestigd en voordat de productie start — je reserveert dat venster, dus daar betaal je voor. Kleinere bestellingen worden bij levering gefactureerd. De proefvisual is het enige dat vooraf betaald wordt, en dat is er één per bedrijf.
na:    Vanaf ${WINDOW_THRESHOLD} producten nadat de capaciteitscheck je leverdatum heeft bevestigd en voordat de productie start — je reserveert die leverdatum, dus daar betaal je voor. Kleinere bestellingen worden bij levering gefactureerd. De proefvisual is het enige dat vooraf betaald wordt, en dat is er één per bedrijf.
```

**“staffel” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Nee, en dat is met opzet. Er was een kennismakingskorting van 20% en die is eraf gehaald: een tarief noemen en er dan een vijfde vanaf halen zegt dat het tarief nooit de prijs was. De staffel ís de korting — het tarief per product daalt naarmate je er meer bestelt, en het geldt voor elk product in de bestelling. ${FIRST_EG_PRODUCTS} complete producten is ${ex(ladderTotal('complete', FIRST_EG_PRODUCTS), 'nl')}, voor iedereen, altijd. Wil je het werk eerst zien, dan is daar de proefvisual voor.
na:    Nee, en dat is met opzet. Er was een kennismakingskorting van 20% en die is eraf gehaald: een tarief noemen en er dan een vijfde vanaf halen zegt dat het tarief nooit de prijs was. De prijs per product ís de korting — het tarief per product daalt naarmate je er meer bestelt, en het geldt voor elk product in de bestelling. ${FIRST_EG_PRODUCTS} complete producten is ${ex(ladderTotal('complete', FIRST_EG_PRODUCTS), 'nl')}, voor iedereen, altijd. Wil je het werk eerst zien, dan is daar de proefvisual voor.
```

**“trede” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Elk product in de bestelling gaat tegen hetzelfde tarief, en dat tarief wordt bepaald door hoeveel producten erin zitten. Eén compleet product is ${ex(ladderRate('complete', 1), 'nl')}; vanaf ${TOP_RUNG_AT} producten is datzelfde product ${ex(ladderFloor('complete'), 'nl')}. Omdat het tarief voor de hele bestelling geldt, verlaagt een trede omlaag de prijs van álle producten erin — niet alleen die voorbij de grens. Bij ${ENTRY_RUNG_LAST} producten betaal je ${ex(ladderRate('complete', ENTRY_RUNG_LAST), 'nl')} per product, bij ${SECOND_RUNG_AT} nog ${ex(ladderRate('complete', SECOND_RUNG_AT), 'nl')}.
na:    Elk product in de bestelling gaat tegen hetzelfde tarief, en dat tarief wordt bepaald door hoeveel producten erin zitten. Eén compleet product is ${ex(ladderRate('complete', 1), 'nl')}; vanaf ${TOP_RUNG_AT} producten is datzelfde product ${ex(ladderFloor('complete'), 'nl')}. Omdat het tarief voor de hele bestelling geldt, verlaagt één product erbij de prijs van álle producten erin — niet alleen die voorbij de grens. Bij ${ENTRY_RUNG_LAST} producten betaal je ${ex(ladderRate('complete', ENTRY_RUNG_LAST), 'nl')} per product, bij ${SECOND_RUNG_AT} nog ${ex(ladderRate('complete', SECOND_RUNG_AT), 'nl')}.
```

**“staffel” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Alleen als dezelfde output elke maand terugkomt. Het ${planName.studio}-plan is ${ex(PLAN_AMOUNT.studio, 'nl')} per maand voor ${PLAN_PRODUCTS.studio} producten en ${PLAN_CLIPS.studio} clips; op de staffel kost diezelfde output ${ex(studioSaving.onLadder, 'nl')}. Bestel je seizoensgebonden in plaats van maandelijks, dan is de staffel de goedkopere deur — een plan dat je niet volmaakt is geen besparing.
na:    Alleen als dezelfde output elke maand terugkomt. Het ${planName.studio}-plan is ${ex(PLAN_AMOUNT.studio, 'nl')} per maand voor ${PLAN_PRODUCTS.studio} producten en ${PLAN_CLIPS.studio} clips; op de prijs per product kost diezelfde output ${ex(studioSaving.onLadder, 'nl')}. Bestel je seizoensgebonden in plaats van maandelijks, dan is de prijs per product de goedkopere deur — een plan dat je niet volmaakt is geen besparing.
```

**“wachtrij” en “capaciteitsagenda” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Omdat het serviceniveau de omvang volgt. Vanaf ${WINDOW_THRESHOLD} producten gaat een bestelling in de capaciteitsagenda en krijgt hij ${turnaround('attended', 'nl').toLowerCase()}. Daaronder loopt hij in de standaard wachtrij: ${turnaround('unattended', 'nl').toLowerCase()}, gezegd als gebruikelijk en nooit als datum. Een datum noemen die we zouden moeten breken is erger dan geen datum noemen, en een bestelling die al in de agenda staat wijkt nooit voor een bestelling die er niet in staat.
na:    Omdat het serviceniveau de omvang volgt. Vanaf ${WINDOW_THRESHOLD} producten gaat een bestelling in de agenda en krijgt hij ${turnaround('attended', 'nl').toLowerCase()}. Daaronder loopt hij in de normale doorlooptijd: ${turnaround('unattended', 'nl').toLowerCase()}, gezegd als gebruikelijk en nooit als datum. Een datum noemen die we zouden moeten breken is erger dan geen datum noemen, en een bestelling die al in de agenda staat wijkt nooit voor een bestelling die er niet in staat.
```

**Ons eigen woord vervangen door het woord dat de klant gebruikt.**

```
voor:  From ${WINDOW_THRESHOLD} products, after the capacity check has confirmed your window and before production starts — the window is what you are reserving, so it is what you are paying for. Smaller orders are invoiced on delivery. The test sample is the one thing charged upfront, and it is one per business.
na:    From ${WINDOW_THRESHOLD} products, after the capacity check has confirmed your delivery date and before production starts — the delivery date is what you are reserving, so it is what you are paying for. Smaller orders are invoiced on delivery. The test sample is the one thing charged upfront, and it is one per business.
```

**“ladder” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  No, and that is deliberate. There was a 20% first-order discount and it has been removed: quoting a rate and then taking a fifth off it says the rate was never the price. The ladder is the discount — the rate per product falls as the count rises, and it applies to every product in the order. ${FIRST_EG_PRODUCTS} complete products is ${ex(ladderTotal('complete', FIRST_EG_PRODUCTS), 'en')}, for everyone, always. If you want to see the work first, that is what the test sample is for.
na:    No, and that is deliberate. There was a 20% first-order discount and it has been removed: quoting a rate and then taking a fifth off it says the rate was never the price. The price per product is the discount — the rate per product falls as the count rises, and it applies to every product in the order. ${FIRST_EG_PRODUCTS} complete products is ${ex(ladderTotal('complete', FIRST_EG_PRODUCTS), 'en')}, for everyone, always. If you want to see the work first, that is what the test sample is for.
```

**Ons eigen woord vervangen door het woord dat de klant gebruikt.**

```
voor:  Every product in the order is charged at the same rate, and that rate is set by how many products are in it. One complete product is ${ex(ladderRate('complete', 1), 'en')}; from ${TOP_RUNG_AT} products the same product is ${ex(ladderFloor('complete'), 'en')}. Because the rate applies to the whole order, crossing onto the next rung lowers the price of every product in it, not only the ones past the line: ${ENTRY_RUNG_LAST} products is ${ex(ladderRate('complete', ENTRY_RUNG_LAST), 'en')} each, and ${SECOND_RUNG_AT} is ${ex(ladderRate('complete', SECOND_RUNG_AT), 'en')} each.
na:    Every product in the order is charged at the same rate, and that rate is set by how many products are in it. One complete product is ${ex(ladderRate('complete', 1), 'en')}; from ${TOP_RUNG_AT} products the same product is ${ex(ladderFloor('complete'), 'en')}. Because the rate applies to the whole order, crossing onto one more product lowers the price of every product in it, not only the ones past the line: ${ENTRY_RUNG_LAST} products is ${ex(ladderRate('complete', ENTRY_RUNG_LAST), 'en')} each, and ${SECOND_RUNG_AT} is ${ex(ladderRate('complete', SECOND_RUNG_AT), 'en')} each.
```

**“ladder” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Only if the same output comes round every month. The ${planName.studio} plan is ${ex(PLAN_AMOUNT.studio, 'en')} a month for ${PLAN_PRODUCTS.studio} products and ${PLAN_CLIPS.studio} clips; the same output on the ladder is ${ex(studioSaving.onLadder, 'en')}. If your ordering is seasonal rather than monthly, the ladder is the cheaper door — a plan you do not fill is not a saving.
na:    Only if the same output comes round every month. The ${planName.studio} plan is ${ex(PLAN_AMOUNT.studio, 'en')} a month for ${PLAN_PRODUCTS.studio} products and ${PLAN_CLIPS.studio} clips; the same output on the price per product is ${ex(studioSaving.onLadder, 'en')}. If your ordering is seasonal rather than monthly, the price per product is the cheaper door — a plan you do not fill is not a saving.
```

**“queue” en “capacity gate” en “capacity calendar” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Because the service level follows the size. From ${WINDOW_THRESHOLD} products an order goes into the capacity calendar and gets ${turnaround('attended', 'en').toLowerCase()}. Below that it runs in the standard queue: ${turnaround('unattended', 'en').toLowerCase()}, stated as typical and never as a date. Quoting a date we would have to break is worse than not quoting one, and an order already in the calendar is never pushed for one that is not.
na:    Because the service level follows the size. From ${WINDOW_THRESHOLD} products an order goes into the calendar and gets ${turnaround('attended', 'en').toLowerCase()}. Below that it runs in the normal turnaround: ${turnaround('unattended', 'en').toLowerCase()}, stated as typical and never as a date. Quoting a date we would have to break is worse than not quoting one, and an order already in the calendar is never pushed for one that is not.
```

**Het antwoord op "hoe kan ik jullie uitproberen" noemde de prijs maar niet wat je ervoor krijgt.**

```
voor:  Op twee manieren. Een proefvisual van ${sample.price} ${vatLabel('excl', 'nl')} op je eigen product, ${sample.unit} — die loopt door dezelfde pipeline als een betaalde bestelling, dus wat je ziet is wat je zou krijgen. Of begin gewoon klein: het tarief is per product, dus een eerste bestelling mag een handvol stuks zijn.
na:    Op twee manieren. Een proefvisual van ${sample.price} ${vatLabel('excl', 'nl')} op je eigen product, ${sample.unit}: dat product volledig geleverd — ${CATALOG_IMAGES} catalogbeelden of een carousel van ${LIFESTYLE_IMAGES} foto’s. Die loopt door dezelfde productie als een betaalde bestelling, dus wat je ziet is wat je zou krijgen. Of begin gewoon klein: het tarief is per product, dus een eerste bestelling mag een handvol stuks zijn.
```

**“staffel” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  ${cat.name}. ${cat.line} Strak, consistent, gemaakt voor shoplistings en marktplaatsen. ${life.name}. ${life.line} Een gestylede scène in plaats van een product op een achtergrond. Neem je allebei, dan heet dat op de staffel de complete scope — voor elk product beide.
na:    ${cat.name}. ${cat.line} Strak, consistent, gemaakt voor shoplistings en marktplaatsen. ${life.name}. ${life.line} Een gestylede scène in plaats van een product op een achtergrond. Neem je allebei, dan heet dat op de prijs per product de complete scope — voor elk product beide.
```

**“wachtrij” en “capaciteitsagenda” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Het serviceniveau volgt de omvang. Vanaf ${WINDOW_THRESHOLD} producten gaat een bestelling in de capaciteitsagenda en krijgt hij ${turnaround('attended', 'nl').toLowerCase()}. Daaronder loopt hij in de standaard wachtrij: ${turnaround('unattended', 'nl').toLowerCase()}, zonder vaste leverdatum.
na:    Het serviceniveau volgt de omvang. Vanaf ${WINDOW_THRESHOLD} producten gaat een bestelling in de agenda en krijgt hij ${turnaround('attended', 'nl').toLowerCase()}. Daaronder loopt hij in de normale doorlooptijd: ${turnaround('unattended', 'nl').toLowerCase()}, zonder vaste leverdatum.
```

**“venster” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Bij elke bestelling vragen we of je tevreden bent met wat je hebt gekregen. Ben je dat niet, laat dan weten wat er niet klopt, dan nemen we het samen door — wat we afspreken hangt af van het probleem. Bij een bestelling met een gereserveerd venster: ${aftercare('attended', 'nl').toLowerCase()}, per beeld in het portaal, zodat één beeld dat terugmoet de rest niet ophoudt.
na:    Bij elke bestelling vragen we of je tevreden bent met wat je hebt gekregen. Ben je dat niet, laat dan weten wat er niet klopt, dan nemen we het samen door — wat we afspreken hangt af van het probleem. Bij een bestelling met een vastgezette leverdatum: ${aftercare('attended', 'nl').toLowerCase()}, per beeld in het portaal, zodat één beeld dat terugmoet de rest niet ophoudt.
```

**“staffel” en “trede” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  De staffel ís het antwoord op volume — er komt niets bovenop en er valt niets te onderhandelen. Het tarief geldt voor elk product in de bestelling, dus een trede omlaag verlaagt de prijs van allemaal: bij ${ENTRY_RUNG_LAST} producten is dat ${ex(ladderRate('complete', ENTRY_RUNG_LAST), 'nl')} per product, bij ${SECOND_RUNG_AT} nog ${ex(ladderRate('complete', SECOND_RUNG_AT), 'nl')}.
na:    De prijs per product ís het antwoord op volume — er komt niets bovenop en er valt niets te onderhandelen. Het tarief geldt voor elk product in de bestelling, dus één product erbij verlaagt de prijs van allemaal: bij ${ENTRY_RUNG_LAST} producten is dat ${ex(ladderRate('complete', ENTRY_RUNG_LAST), 'nl')} per product, bij ${SECOND_RUNG_AT} nog ${ex(ladderRate('complete', SECOND_RUNG_AT), 'nl')}.
```

**“staffel” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Alleen als dezelfde output elke maand terugkomt. Er zijn ${planList.length} plannen — ${planNames} — van ${ex(PLAN_AMOUNT.starter, 'nl')} per maand voor ${PLAN_PRODUCTS.starter} producten tot ${ex(PLAN_AMOUNT.brand, 'nl')} per maand voor ${PLAN_PRODUCTS.brand} producten met je merkmodel inbegrepen. Elk plan kost minder dan diezelfde output op de staffel, loopt minimaal ${PLAN_MIN_MONTHS} maanden, en ongebruikte producten schuiven ${PLAN_ROLLOVER_MONTHS} maand door. Bestel je zonder plan, dan loopt er niets door.
na:    Alleen als dezelfde output elke maand terugkomt. Er zijn ${planList.length} plannen — ${planNames} — van ${ex(PLAN_AMOUNT.starter, 'nl')} per maand voor ${PLAN_PRODUCTS.starter} producten tot ${ex(PLAN_AMOUNT.brand, 'nl')} per maand voor ${PLAN_PRODUCTS.brand} producten met je merkmodel inbegrepen. Elk plan kost minder dan diezelfde output op de prijs per product, loopt minimaal ${PLAN_MIN_MONTHS} maanden, en ongebruikte producten schuiven ${PLAN_ROLLOVER_MONTHS} maand door. Bestel je zonder plan, dan loopt er niets door.
```

**Zelfde antwoord in het Engels.**

```
voor:  Two ways. A ${sample.price} ${vatLabel('excl', 'en')} test sample on one of your own products, ${sample.unit} — it runs through the same pipeline as a paid order, so what you see is what you would get. Or simply start small: the rate is per product, so a first order can be a handful of pieces.
na:    Two ways. A ${sample.price} ${vatLabel('excl', 'en')} test sample on one of your own products, ${sample.unit}: that product delivered in full — ${CATALOG_IMAGES} catalog images or a ${LIFESTYLE_IMAGES}-photo carousel. It runs through the same production as a paid order, so what you see is what you would get. Or simply start small: the rate is per product, so a first order can be a handful of pieces.
```

**“ladder” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  ${cat.name}. ${cat.line} Clean, consistent, built for shop listings and marketplaces. ${life.name}. ${life.line} A styled scene rather than a product on a background. Take both and the ladder calls that the complete scope — both of them, for every product in the order.
na:    ${cat.name}. ${cat.line} Clean, consistent, built for shop listings and marketplaces. ${life.name}. ${life.line} A styled scene rather than a product on a background. Take both and the price per product calls that the complete scope — both of them, for every product in the order.
```

**“queue” en “capacity gate” en “capacity calendar” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  The service level follows the size. From ${WINDOW_THRESHOLD} products an order goes into the capacity calendar and gets ${turnaround('attended', 'en').toLowerCase()}. Below that it runs in the standard queue: ${turnaround('unattended', 'en').toLowerCase()}, with no fixed delivery date.
na:    The service level follows the size. From ${WINDOW_THRESHOLD} products an order goes into the calendar and gets ${turnaround('attended', 'en').toLowerCase()}. Below that it runs in the normal turnaround: ${turnaround('unattended', 'en').toLowerCase()}, with no fixed delivery date.
```

**“window” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  We ask on every order whether you are happy with what you got. If you are not, tell us what is wrong and we go through it with you — what we agree depends on the problem. On an order with a reserved window: ${aftercare('attended', 'en').toLowerCase()}, per image in the portal, so one image going back does not hold up the rest.
na:    We ask on every order whether you are happy with what you got. If you are not, tell us what is wrong and we go through it with you — what we agree depends on the problem. On an order with a reserved delivery date: ${aftercare('attended', 'en').toLowerCase()}, per image in the portal, so one image going back does not hold up the rest.
```

**“ladder” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  The ladder is the volume answer — nothing is stacked on top of it and there is nothing to negotiate. The rate applies to every product in the order, so crossing onto the next rung lowers the price of all of them: at ${ENTRY_RUNG_LAST} products it is ${ex(ladderRate('complete', ENTRY_RUNG_LAST), 'en')} each, at ${SECOND_RUNG_AT} it is ${ex(ladderRate('complete', SECOND_RUNG_AT), 'en')} each.
na:    The price per product is the volume answer — nothing is stacked on top of it and there is nothing to negotiate. The rate applies to every product in the order, so crossing onto one more product lowers the price of all of them: at ${ENTRY_RUNG_LAST} products it is ${ex(ladderRate('complete', ENTRY_RUNG_LAST), 'en')} each, at ${SECOND_RUNG_AT} it is ${ex(ladderRate('complete', SECOND_RUNG_AT), 'en')} each.
```

**“ladder” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  Only if the same output comes round every month. There are ${planList.length} plans — ${planNames} — from ${ex(PLAN_AMOUNT.starter, 'en')} a month for ${PLAN_PRODUCTS.starter} products up to ${ex(PLAN_AMOUNT.brand, 'en')} a month for ${PLAN_PRODUCTS.brand} with your Brand Model included. Every plan costs less than the same output on the ladder, runs for a minimum of ${PLAN_MIN_MONTHS} months, and rolls an unused product over ${PLAN_ROLLOVER_MONTHS} month. Order without one and nothing recurs.
na:    Only if the same output comes round every month. There are ${planList.length} plans — ${planNames} — from ${ex(PLAN_AMOUNT.starter, 'en')} a month for ${PLAN_PRODUCTS.starter} products up to ${ex(PLAN_AMOUNT.brand, 'en')} a month for ${PLAN_PRODUCTS.brand} with your Brand Model included. Every plan costs less than the same output on the price per product, runs for a minimum of ${PLAN_MIN_MONTHS} months, and rolls an unused product over ${PLAN_ROLLOVER_MONTHS} month. Order without one and nothing recurs.
```

**Zelfde inconsistentie: overal catalogbeeld, hier catalogusvisual.**

```
voor:  Een catalogusvisual: één kledingstuk, vierkant, op een egale achtergrond.
na:    Een catalogbeeld: één kledingstuk, vierkant, op een egale achtergrond.
```

**"Zijn eigen staffel" — het interne woord voor de prijstabel.**

```
voor:  Wil je maar één van beide, dan heeft die zijn eigen staffel: catalog vanaf
na:    Wil je maar één van beide, dan heeft die zijn eigen prijs per aantal: catalog vanaf
```

**Zelfde in het Engels.**

```
voor:  If you want only one of the two it has its own ladder: catalog from
na:    If you want only one of the two it has its own price by count: catalog from
```

**De constanten moeten geïmporteerd zijn.**

```
voor:  AMOUNT, TIERS, TEST_SAMPLE, euro, reviewClaim, turnaround, aftercare, perProduct
na:    AMOUNT, TIERS, TEST_SAMPLE, euro, reviewClaim, turnaround, aftercare, perProduct,
  CATALOG_IMAGES, LIFESTYLE_IMAGES
```

---

## data/schema.js

2 wijzigingen.

**Naamwoordstijl zonder werkwoord, rechtstreeks de Engelse fragmentzin — dit staat in Google.**

```
voor:  Voor elk product in de bestelling een catalogset en een lifestyle-carousel.
na:    Elk product in de bestelling krijgt een catalogset en een lifestyle-carousel.
```

**Zelfde: een zin zonder werkwoord.**

```
voor:  Eén korte clip. Dezelfde prijs los of toegevoegd aan elke bestelling.
na:    Eén korte clip. De prijs is hetzelfde, los of toegevoegd aan een bestelling.
```

---

## data/styles.js

2 wijzigingen.

**"Tier" hoort volgens STIJL.md nooit op de klantzijde.**

```
voor:  { title: 'Campaign-grade, every order', body: "No separate 'hero shot' tier — this finishing is the standard." }
na:    { title: 'Campaign-grade, every order', body: "There is no upgrade to buy for a hero shot — this finishing is the standard." }
```

**"Effortless" is de Engelse tegenhanger van "moeiteloos" uit de verboden lijst; de Nederlandse versie van deze regel is al aangepast.**

```
voor:  Minimal visuals that resemble authentic real-life photography — natural, effortless, like casual smartphone photography.
na:    Minimal visuals that look like an everyday photo — natural and unpolished, like something someone just took.
```

---

## data/styles.nl.js

8 wijzigingen.

**"Verkeerd gedaan is het..." is een los voltooid deelwoord vooraan, rechtstreeks uit het Engels.**

```
voor:  Verkeerd gedaan is het gewoon hard. Goed gedaan is het elektrisch. Wij hebben er een discipline van gemaakt.
na:    Verkeerd toegepast is dit licht gewoon hard. Goed toegepast is het elektrisch. Wij hebben er een discipline van gemaakt.
```

**"Moeiteloos" staat op de lijst verboden woorden in STIJL.md regel 5.**

```
voor:  — natuurlijk, moeiteloos, als spontane smartphonefotografie.'
na:    — natuurlijk en ongepolijst, als een foto die iemand net even maakte.'
```

**"Dat is wat X van Y scheidt" is de Engelse constructie, letterlijk vertaald.**

```
voor:  'Elke scène gehoorzaamt aan één lichtbron en één tijdstip van de dag. Dat is wat geloofwaardig van griezelig scheidt.' }
na:    'Elke scène houdt zich aan één lichtbron en één tijdstip van de dag. Dat scheidt geloofwaardig van griezelig.' }
```

**"Aspirationele" is een anglicisme dat het Nederlands niet kent.**

```
voor:  aardse, zandkleurige omgevingen — een verheven, aspirationele sfeer die premium prod
na:    aardse, zandkleurige omgevingen — een sfeer waar je in wilt stappen, en die premium prod
```

**"Het is de stijl die X laat Y" is de Engelse cleft-zin, letterlijk vertaald.**

```
voor:  Het is de stijl die feeds je laat vertrouwen. Geen studioglans, geen harde verkoop. Gewoon je product dat een geloofwaardig leven leidt.
na:    Deze stijl laat een feed je vertrouwen. Geen studioglans, geen harde verkoop. Gewoon je product in een geloofwaardig leven.
```

**Zonder accent leest "Niet een van" als "geen enkele"; bedoeld is het telwoord.**

```
voor:  Niet een van onze vier sferen — een lifestyle-scène op maat, ontworpen vanuit jouw referenties.
na:    Geen van onze vier vaste sferen — een lifestyle-scène op maat, ontworpen vanuit jouw referenties.
```

**Zelfde, en "die alleen jouw merk zou gebruiken" na een drievoudige opsomming loopt vast.**

```
voor:  Niet een van onze vier sferen — een scène ontworpen vanuit jouw referenties: de setting, styling en het licht die alleen jouw merk zou gebruiken.
na:    Geen van onze vier vaste sferen — een scène ontworpen vanuit jouw referenties. De setting, de styling en het licht die alleen bij jouw merk passen.
```

**"Aspirationele" is een anglicisme dat het Nederlands niet kent.**

```
voor:  Merken die een aspirationele feed bouwen
na:    Merken die een feed bouwen waar mensen bij willen horen
```

---

## data/videoStyles.js

12 wijzigingen.

**"Brief" is ons woord voor wat de klant ons meegeeft (STIJL.md regel 3).**

```
voor:  Multi-shot campaign pieces, built around your brief. Priced per project.
na:    Multi-shot campaign films, built around the story you want to tell. Priced per project.
```

**"Scope" als werkwoord in een kop.**

```
voor:  { title: 'Scope the campaign', body: 'Shots and deliverables agreed on WhatsApp.' }
na:    { title: 'Agree what the campaign covers', body: 'Shots and files agreed on WhatsApp.' }
```

**"A brief, taken seriously" — de kop draait om ons woord.**

```
voor:  { title: 'A brief, taken seriously', body: 'Shot list and story built to your launch, not a template.' }
na:    { title: 'Your idea, taken seriously', body: 'Shot list and story built to your launch, not a template.' }
```

**"Scoped" is intern.**

```
voor:  { title: 'A fixed price, up front', body: 'Scoped on WhatsApp. You approve before we start.' }
na:    { title: 'A fixed price, up front', body: 'Agreed on WhatsApp. You approve before we start.' }
```

**"One brief" telt hier als de eenheid van een opdracht.**

```
voor:  { title: 'One partner for the whole campaign', body: 'Stills, motion and every cut, one brief.' }
na:    { title: 'One partner for the whole campaign', body: 'Stills, motion and every cut, from one conversation.' }
```

**"Scoped entirely to your brief" — twee interne woorden in vier.**

```
voor:  Your own concept, pace and look — a video scoped entirely to your brief.
na:    Your own concept, pace and look — a video built entirely around what you tell us.
```

**Zelfde combinatie.**

```
voor:  Beyond the three formats — a video concept scoped to your brief: your story, your pace, your look.
na:    Beyond the three formats — a video concept built around your story, your pace, your look.
```

**"Brief" als naam van de eerste stap: een klant weet niet wat hij moet doen.**

```
voor:  { title: 'Brief', body: 'Tell us the idea and where it needs to run.' }
na:    { title: 'You tell us', body: 'Tell us the idea and where it needs to run.' }
```

**"Scope it with you" als werkwoord.**

```
voor:  { title: 'Concept', body: 'We design a custom motion concept and scope it with you.' }
na:    { title: 'Concept', body: 'We design a custom motion concept and agree it with you.' }
```

**"Your brief" nog een keer.**

```
voor:  { title: 'Built from your idea', body: 'No template — the concept starts from your brief and references.' }
na:    { title: 'Built from your idea', body: 'No template — the concept starts from what you tell us and the references you send.' }
```

**"Scoped before we start" als kop.**

```
voor:  { title: 'Scoped before we start', body: 'Shots, length and deliverables agreed up front, priced clearly.' }
na:    { title: 'Agreed before we start', body: 'Shots, length and files agreed up front, priced clearly.' }
```

**"Anything scoped and quoted".**

```
voor:  Anything scoped and quoted per project
na:    Anything agreed and quoted per project
```

---

## data/videoStyles.nl.js

12 wijzigingen.

**"Naadloos" staat op de lijst verboden woorden.**

```
voor:  { title: 'Loop het naadloos', body: 'Het laatste kader sluit aan op het eerste.' }
na:    { title: 'De loop sluit rond', body: 'Het laatste kader sluit aan op het eerste.' }
```

**Zelfde woord.**

```
voor:  'Begin- en eindkaders op elkaar afgestemd zodat het naadloos loopt.' }
na:    'Begin- en eindkader op elkaar afgestemd, zodat de loop niet hapert.' }
```

**Overal elders op de site heet het een catalogset; "catalogusset" is de enige uitzondering.**

```
voor:  'Deelt een grade met je catalogusset.' }
na:    'Krijgt dezelfde kleurbewerking als je catalogset.' }
```

**"Een brief, serieus genomen" — de kop draait om ons woord.**

```
voor:  { title: 'Een brief, serieus genomen', body: 'Shotlijst en verhaal gebouwd op jouw launch, geen template.' }
na:    { title: 'Jouw idee, serieus genomen', body: 'Shotlijst en verhaal gebouwd op jouw launch, geen template.' }
```

**"Scope bepaald" is intern.**

```
voor:  { title: 'Een vaste prijs, vooraf', body: 'Scope bepaald via WhatsApp. Jij keurt goed voordat we beginnen.' }
na:    { title: 'Een vaste prijs, vooraf', body: 'Afgesproken via WhatsApp. Jij keurt goed voordat we beginnen.' }
```

**"Één brief" als eenheid van een opdracht.**

```
voor:  { title: 'Eén partner voor de hele campagne', body: 'Stills, beweging en elke versie, één brief.' }
na:    { title: 'Eén partner voor de hele campagne', body: 'Stills, beweging en elke versie, uit één gesprek.' }
```

**"Afgekaderd op jouw brief" — "afkaderen" is geen Nederlands en "brief" is intern.**

```
voor:  Je eigen concept, tempo en look — een video volledig afgekaderd op jouw brief.
na:    Je eigen concept, tempo en look — een video die helemaal is gebouwd op wat jij ons vertelt.
```

**Zelfde combinatie.**

```
voor:  Voorbij de drie formaten — een videoconcept afgekaderd op jouw brief: jouw verhaal, jouw tempo, jouw look.
na:    Voorbij de drie formaten — een videoconcept gebouwd op jouw verhaal, jouw tempo, jouw look.
```

**"Brief" als naam van de eerste stap.**

```
voor:  { title: 'Brief', body: 'Vertel ons het idee en waar het moet draaien.' }
na:    { title: 'Jij vertelt', body: 'Vertel ons het idee en waar het moet draaien.' }
```

**"Jouw brief".**

```
voor:  { title: 'Gebouwd vanuit jouw idee', body: 'Geen template — het concept begint bij jouw brief en referenties.' }
na:    { title: 'Gebouwd op jouw idee', body: 'Geen template — het concept begint bij wat jij vertelt en de referenties die je stuurt.' }
```

**"Afgekaderd" is geen Nederlands woord.**

```
voor:  Alles wat per project wordt afgekaderd en geoffreerd
na:    Alles wat we per project afspreken en op een offerte zetten
```

**"Afgekaderde" is geen Nederlands woord.**

```
voor:  Een afgekaderde campagnefilm met meerdere shots
na:    Een campagnefilm met meerdere shots, van tevoren helemaal afgesproken
```

---

## pages/contact.astro

2 wijzigingen.

**Zelfde kop in het Engels.**

```
voor:  Rather see it <em>first</em>?
na:    Rather have <em>one of your own products</em> delivered in full first?
```

**"Detailed briefs" is ons woord.**

```
voor:  <p style="margin-top:.5rem;color:var(--ink-3)">For detailed briefs, invoices or attachments.</p>
na:    <p style="margin-top:.5rem;color:var(--ink-3)">For a long request, an invoice question or files you want to attach.</p>
```

---

## pages/how-it-works.astro

2 wijzigingen.

**“window” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  `You send the products. We check capacity, confirm a window, then produce ` +
na:    `You send the products. We check capacity, confirm a delivery date, then produce ` +
```

**Ons eigen woord vervangen door het woord dat de klant gebruikt.**

```
voor:  `and hand-check every visual. From ${WINDOW_THRESHOLD} products, the window ` +
na:    `and hand-check every visual. From ${WINDOW_THRESHOLD} products, the delivery date ` +
```

---

## pages/nl/about.astro

1 wijziging.

**"Persoon" is een de-woord, dus het bijvoeglijk naamwoord krijgt een -e.**

```
voor:  en een echt persoon beoordeelt elke afbeelding voordat die bij jou aankomt.
na:    en een echte persoon beoordeelt elk beeld voordat het bij jou aankomt.
```

---

## pages/nl/contact.astro

2 wijzigingen.

**"Mens" is een de-woord, dus "een echte mens".**

```
voor:  Stuur een bericht — een echt mens leest ze allemaal.
na:    Stuur een bericht — een echte mens leest ze allemaal.
```

**"Liever het eerst zien?" — precies de formule die Lucas afkeurde; "het" wordt niet benoemd. De kop op /contact zei "één beeld".**

```
voor:  Liever het <em>eerst</em> zien?
na:    Liever eerst <em>één product</em> van jezelf, volledig geleverd?
```

---

## pages/nl/guides.astro

1 wijziging.

**"geld kost aan overdoen, off-brand kleur en uren" — "geld" hoort niet bij "uren", de opsomming loopt vast.**

```
voor:  Wanneer een self-serve AI-tool echt genoeg is — en waar hij je stilletjes geld kost aan overdoen, off-brand kleur en uren.
na:    Wanneer een AI-tool die je zelf bedient echt genoeg is — en waar hij je stilletjes uren kost aan overdoen en kleur die niet bij je merk past.
```

---

## pages/nl/how-it-works.astro

2 wijzigingen.

**“venster” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  `Jij stuurt de producten. Wij bevestigen een venster, produceren en ` +
na:    `Jij stuurt de producten. Wij bevestigen een leverdatum, produceren en ` +
```

**"Leverdatum" is een de-woord, dus "die" en niet "dat" — een restant van toen het woord "venster" was.**

```
voor:  `is dat venster gereserveerd.`;
na:    `staat die leverdatum vast.`;
```

---

## pages/nl/start.astro

1 wijziging.

**“venster” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  `${WINDOW_THRESHOLD} producten is het venster gereserveerd.`;
na:    `${WINDOW_THRESHOLD} producten is de leverdatum gereserveerd.`;
```

---

## pages/nl/start/brand-model.astro

1 wijziging.

**"Briefing" in de meta-description.**

```
voor:  Het begint met een korte briefing en een gesprek over wie het moet dragen
na:    Het begint met een paar korte vragen en een gesprek over wie het moet dragen
```

---

## pages/nl/start/plan.astro

1 wijziging.

**Zelfde in het Nederlands.**

```
voor:  <Layout title="Vraag naar een maandplan — VISUAILS" description="Elke maand gereserveerde capaciteit, onder het staffeltarief. Plannen worden eerst schriftelijk afgesproken; dit is de intake.">
na:    <Layout title="Vraag naar een maandplan — VISUAILS" description="Elke maand gereserveerde capaciteit, onder het tarief per product. Plannen worden eerst schriftelijk afgesproken; hier begint dat.">
```

---

## pages/nl/terms.astro

2 wijzigingen.

**"Leveringsvenster" is het interne woord, ook in de voorwaarden.**

```
voor:  <li><strong>"Gereserveerde bestelling"</strong> — een bestelling van {WINDOW_THRESHOLD} producten of meer, die in onze capaciteitsagenda wordt ingepland en een gereserveerd leveringsvenster krijgt.</li>
na:    <li><strong>"Gereserveerde bestelling"</strong> — een bestelling van {WINDOW_THRESHOLD} producten of meer, die in onze agenda wordt ingepland en een vastgezette leverdatum krijgt.</li>
```

**"Een volledige briefing" — de klant weet niet wanneer die volledig is; dit staat in de voorwaarden, dus juist hier moet het meetbaar zijn.**

```
voor:  <p>Hoe lang een bestelling duurt, hangt af van hoe je bestelt. Losse producten lopen in de standaard wachtrij: {t0} vanaf een volledige briefing. We noemen voor een los product geen leverdatum, want een datum waarvoor we geen capaciteit hebben vrijgehouden is geen datum. Een gereserveerde bestelling loopt in {t1}, en houdt die plek terwijl kleinere bestellingen eromheen schuiven.</p>
na:    <p>Hoe lang een bestelling duurt, hangt af van hoe je bestelt. Losse producten lopen in de normale doorlooptijd: {t0} vanaf het moment dat we je foto’s en je notitie binnen hebben. We noemen voor een los product geen leverdatum, want een datum waarvoor we geen capaciteit hebben vrijgehouden is geen datum. Een gereserveerde bestelling loopt in {t1}, en houdt die plek terwijl kleinere bestellingen eromheen schuiven.</p>
```

---

## pages/nl/thank-you.astro

4 wijzigingen.

**“wachtrij” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  `visuals volgen uit de standaard wachtrij — ${TIMING.toLowerCase()}.`;
na:    `visuals volgen uit de normale doorlooptijd — ${TIMING.toLowerCase()}.`;
```

**"Je briefing" op de pagina direct na het betalen.**

```
voor:  Zodra de betaling binnen is, bekijken we je briefing, maken we je visuals klaar, en controleert een persoon elk resultaat met de hand voordat het je bereikt.
na:    Zodra de betaling binnen is, lezen we wat je hebt gestuurd, maken we je beelden klaar, en controleert een persoon elk resultaat met de hand voordat het bij jou aankomt.
```

**"Een complete briefing" — dezelfde onduidelijkheid in het Nederlands.**

```
voor:  {TIMING} van een complete briefing tot je downloadlink.
na:    {TIMING} vanaf het moment dat we je foto’s en je notitie hebben tot je downloadlink.
```

**"Gratis toe te voegen en het tilt het hele resultaat op" is een los infinitiefconstruct zonder onderwerp.**

```
voor:  Stuur een detail-close-up, de stof en een on-body shot — gratis toe te voegen en het tilt het hele resultaat op.
na:    Stuur een close-up van een detail, een foto van de stof en een foto op het lichaam. Toevoegen kost niets en het hele resultaat wordt er beter van.
```

---

## pages/nl/upload-guidelines.astro

1 wijziging.

**De kop begint met een los voltooid deelwoord, rechtstreeks uit de Engelse "Worn for fit".**

```
voor:  <h4>Gedragen voor de pasvorm</h4>
na:    <h4>Iemand die het aanheeft</h4>
```

---

## pages/privacy.astro

1 wijziging.

**“pipeline” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  <li><strong>An AI image-generation provider</strong> — used as part of the pipeline that creates your visuals.</li>
na:    <li><strong>An AI image-generation provider</strong> — used as part of the production that creates your visuals.</li>
```

---

## pages/start.astro

1 wijziging.

**Ons eigen woord vervangen door het woord dat de klant gebruikt.**

```
voor:  `${WINDOW_THRESHOLD} products the window is reserved.`;
na:    `${WINDOW_THRESHOLD} products the delivery date is reserved.`;
```

---

## pages/start/brand-model.astro

1 wijziging.

**Zelfde in het Engels.**

```
voor:  It starts with a short brief and a conversation about who should wear it
na:    It starts with a few short questions and a conversation about who should wear it
```

---

## pages/start/plan.astro

1 wijziging.

**"Intake" in de meta-description, die een bezoeker in Google leest.**

```
voor:  <Layout title="Ask about a monthly plan — VISUAILS" description="Reserved capacity every month, below the ladder rate. Plans are agreed in writing first; this is the intake.">
na:    <Layout title="Ask about a monthly plan — VISUAILS" description="Reserved capacity every month, below the per-product rate. Plans are agreed in writing first; this is where that starts.">
```

---

## pages/studio.astro

1 wijziging.

**“capacity gate” en “capacity calendar” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  title="How an order is run — the capacity calendar | VISUAILS"
na:    title="How an order is run — the calendar | VISUAILS"
```

---

## pages/terms.astro

3 wijzigingen.

**“capacity gate” en “capacity calendar” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  <li><strong>"Reserved order"</strong> — an order of {WINDOW_THRESHOLD} products or more, which is booked into our capacity calendar and given a reserved delivery window.</li>
na:    <li><strong>"Reserved order"</strong> — an order of {WINDOW_THRESHOLD} products or more, which is booked into our calendar and given a reserved delivery date.</li>
```

**“pipeline” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  <p>VISUAILS produces AI-assisted, human-reviewed product visuals — catalog images, lifestyle scenes, and video — from the source material you supply. Every visual is generated through our pipeline and checked by a person before delivery. We aim for consistent, publish-ready results, but visuals are creative work and exact outcomes can vary.</p>
na:    <p>VISUAILS produces AI-assisted, human-reviewed product visuals — catalog images, lifestyle scenes, and video — from the source material you supply. Every visual is generated through our production and checked by a person before delivery. We aim for consistent, publish-ready results, but visuals are creative work and exact outcomes can vary.</p>
```

**Zelfde in het Engels.**

```
voor:  <p>How long an order takes depends on how you order. Individual products run in the standard queue: {t0} from a complete brief. We do not name a delivery date for an individual product, because a date we have not reserved capacity for is not a date. A reserved order runs in {t1}, and it holds that place while smaller orders move around it.</p>
na:    <p>How long an order takes depends on how you order. Individual products run in the normal turnaround: {t0} from the moment we have your photos and your notes. We do not name a delivery date for an individual product, because a date we have not reserved capacity for is not a date. A reserved order runs in {t1}, and it holds that place while smaller orders move around it.</p>
```

---

## pages/thank-you.astro

3 wijzigingen.

**“queue” is ons woord voor achter de schermen — een bezoeker heeft het nooit in deze betekenis gelezen (STIJL.md regel 3).**

```
voor:  `visuals follow from the standard queue — ${TIMING.toLowerCase()}.`;
na:    `visuals follow from the normal turnaround — ${TIMING.toLowerCase()}.`;
```

**"Your brief" op de pagina direct na het betalen.**

```
voor:  Once the payment has come through we review your brief, prepare your visuals, and a person quality-checks every result before it reaches you.
na:    Once the payment has come through we read what you sent, prepare your visuals, and a person checks every result before it reaches you.
```

**"A complete brief" — de klant weet niet wanneer die compleet is.**

```
voor:  {TIMING} from a complete brief to your download link.
na:    {TIMING} from the moment we have your photos and your notes to your download link.
```

---
