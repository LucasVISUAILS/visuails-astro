# Wat er aan de teksten is veranderd

7 augustus 2026. Elke regel hieronder is door `scripts/__copyfix*.py` toegepast,
en dat script weigert te draaien als het origineel er niet exact één keer staat.
Dit bestand is dus geen samenvatting achteraf maar de uitdraai van wat er gebeurd is.

**83 wijzigingen in 16 bestanden.**

De maatstaf staat in `STIJL.md`; de stem waar die uit is afgeleid in `STEM-BRON.md`.

## src/components/HomeV2.astro

**productienotitie zichtbaar voor de klant**

```
- <p class="ph-spec">{c.dashPortalSpec}</p>
+ (verwijderd)
```

**productienotitie zichtbaar voor de klant**

```
- <p class="ph-spec">{c.dashStudioSpec}</p>
+ (verwijderd)
```

**ongebruikte sleutel**

```
- dashPortalSpec: 'Screenshot to place · 16:10 · /img/portal-gallery.webp',
+ (verwijderd)
```

**ongebruikte sleutel**

```
- dashStudioSpec: 'Screenshot to place · 16:10 · /img/admin-capacity.webp',
+ (verwijderd)
```

**ongebruikte sleutel**

```
- dashPortalSpec: 'Screenshot te plaatsen · 16:10 · /img/portal-gallery.webp',
+ (verwijderd)
```

**ongebruikte sleutel**

```
- dashStudioSpec: 'Screenshot te plaatsen · 16:10 · /img/admin-capacity.webp',
+ (verwijderd)
```

**knop zonder zelfstandig naamwoord**

```
- ctaSample: `See it first — ${sample.price}`,
+ ctaSample: `One image of your product — ${sample.price}`,
```

**knop zonder zelfstandig naamwoord**

```
- ctaSample: `Zie het eerst — ${sample.price}`,
+ ctaSample: `Eén beeld van jouw product — ${sample.price}`,
```

**"dingen" — het getal draagt geen zelfstandig naamwoord**

```
- svcH: ['Four things the studio makes,', 'and what you get back.'],
+ svcH: ['Four kinds of visual we make,', 'and what lands in your folder.'],
```

**"dingen" — het getal draagt geen zelfstandig naamwoord**

```
- svcH: ['Vier dingen die de studio maakt,', 'en wat je terugkrijgt.'],
+ svcH: ['Vier soorten beeld die we maken,', 'en wat er in je map belandt.'],
```

**zonder "omlaag" leest het als een bereik in plaats van een daling**

```
- Per product geprijsd, van ${euro(ladderRate('complete', 1), 'nl')} tot ${euro(FLOOR_RATE_EN, 'nl')} naarmate het aantal stijgt.
+ Je betaalt per product: van ${euro(ladderRate('complete', 1), 'nl')} omlaag naar ${euro(FLOOR_RATE_EN, 'nl')} naarmate je er meer bestelt.
```

**"ride on top of" en "stand on their own", allebei letterlijk**

```
- Een videoclip en je merkmodel komen daarbovenop, of staan op zichzelf.
+ Een videoclip en je eigen merkmodel kun je erbij nemen, of los bestellen.
```

**"de scroll stoppen" en "het gevoel verkopen", twee vertaalde uitdrukkingen**

```
- 'Gestileerde scènes in context die de scroll stoppen en het gevoel verkopen.',
+ 'Je product in een gestylede scène waar mensen op blijven hangen.',
```

**"card on file" is een verzonnen Nederlandse uitdrukking geworden**

```
- Geen proefperiode met je pas op de plank.
+ Geen proefperiode, en we bewaren je pasgegevens niet.
```

**Engelse "priced for"-constructie met het voorzetsel achteraan**

```
- Vier situaties waar deze studio op geprijsd is.
+ Vier situaties waar deze prijzen voor gemaakt zijn.
```

## src/components/StudioPage.astro

**productienotitie zichtbaar voor de klant**

```
- <p class="ph-spec">{c.gateSpec}</p>
+ (verwijderd)
```

**productienotitie zichtbaar voor de klant**

```
- <p class="ph-spec">{c.boardSpec}</p>
+ (verwijderd)
```

**ongebruikte sleutel**

```
- gateSpec: 'Screenshot to place · 16:10 · /img/admin-capacity.webp',
+ (verwijderd)
```

**ongebruikte sleutel**

```
- boardSpec: 'Screenshot to place · 16:10 · /img/admin-orders.webp',
+ (verwijderd)
```

**ongebruikte sleutel**

```
- gateSpec: 'Screenshot te plaatsen · 16:10 · /img/admin-capacity.webp',
+ (verwijderd)
```

**ongebruikte sleutel**

```
- boardSpec: 'Screenshot te plaatsen · 16:10 · /img/admin-orders.webp',
+ (verwijderd)
```

**belooft alles, noemt niets**

```
- ctaPortal: 'See what you get',
+ ctaPortal: 'See a delivered order',
```

**belooft alles, noemt niets**

```
- ctaPortal: 'Zie wat je krijgt',
+ ctaPortal: 'Bekijk een geleverde bestelling',
```

## src/components/PortalPage.astro

**productienotitie zichtbaar voor de klant**

```
- <p class="ph-spec">{c.gallerySpec}</p>
+ (verwijderd)
```

**ongebruikte sleutel**

```
- gallerySpec: 'Screenshot to place · 16:10 · /img/portal-gallery.webp',
+ (verwijderd)
```

**ongebruikte sleutel**

```
- gallerySpec: 'Screenshot te plaatsen · 16:10 · /img/portal-gallery.webp',
+ (verwijderd)
```

**"drop" is ons woord, niet dat van de klant**

```
- h1: ['One link.', 'Your whole drop.'],
+ h1: ['One link.', 'Your whole order.'],
```

**"drop" is ons woord, niet dat van de klant**

```
- h1: ['Eén link.', 'Je hele drop.'],
+ h1: ['Eén link.', 'Je hele bestelling.'],
```

**"drop" is ons woord, niet dat van de klant**

```
- ctaHow: 'How a drop is run',
+ ctaHow: 'How an order is run',
```

**"drop draait" is bovendien geen Nederlands**

```
- ctaHow: 'Hoe een drop draait',
+ ctaHow: 'Hoe een bestelling loopt',
```

## src/i18n/ui.js

**vaste balk: twee keer "het", en een bedrag zonder eenheid**

```
- cb_text: 'See it on your own product first.',
    cb_cta: `Test sample · ${TEST_SAMPLE.en.price}`,
+ cb_text: 'Send us one product and see what comes back, before you order anything.',
    cb_cta: `One image · ${TEST_SAMPLE.en.price}`,
```

**vaste balk: twee keer "het", en een bedrag zonder eenheid**

```
- cb_text: 'Zie het eerst op je eigen product.',
    cb_cta: `Proefvisual · ${TEST_SAMPLE.nl.price}`,
+ cb_text: 'Stuur ons één product en zie wat eruit komt, voordat je iets bestelt.',
    cb_cta: `Eén beeld · ${TEST_SAMPLE.nl.price}`,
```

**de enige primaire knop in de kop, op 72 paginas — "Start" wat?**

```
- nav_start: 'Start',
+ nav_start: 'Order',
```

**de enige primaire knop in de kop, op 72 paginas — "Start" wat?**

```
- nav_start: 'Start',
+ nav_start: 'Bestellen',
```

## src/data/pricing.js

**de gedeelde regel zei ook alleen "het"**

```
- en: { name: 'Test sample', price: euro(AMOUNT.testSample, 'en'), unit: 'one per business', line: 'See it on your own product first.' },
  nl: { name: 'Proefvisual', price: euro(AMOUNT.testSample, 'nl'), unit: 'één per bedrijf', line: 'Zie het eerst op je eigen product.' },
+ en: { name: 'Test sample', price: euro(AMOUNT.testSample, 'en'), unit: 'one per business', line: 'One image of one of your products, before you order anything.' },
  nl: { name: 'Proefvisual', price: euro(AMOUNT.testSample, 'nl'), unit: 'één per bedrijf', line: 'Eén beeld van één van je producten, voordat je iets bestelt.' },
```

## src/components/HowItWorksPage.astro

**kale zelfstandig naamwoord als knop, geen prijs**

```
- ctaSampleBtn: 'Test sample',
+ ctaSampleBtn: `One image · ${TEST_SAMPLE.en.price}`,
```

**kale zelfstandig naamwoord als knop, geen prijs**

```
- ctaSampleBtn: 'Proefvisual',
+ ctaSampleBtn: `Eén beeld · ${TEST_SAMPLE.nl.price}`,
```

## src/components/FaqPage.astro

**kale zelfstandig naamwoord als knop, geen prijs**

```
- ctaSample: 'Test sample',
+ ctaSample: `One image · ${TEST_SAMPLE.en.price}`,
```

**kale zelfstandig naamwoord als knop, geen prijs**

```
- ctaSample: 'Proefvisual',
+ ctaSample: `Eén beeld · ${TEST_SAMPLE.nl.price}`,
```

## src/components/BrandModelPage.astro

**tien wat?**

```
- libAllCta: 'See all ten',
+ libAllCta: 'See all ten models',
```

**tien wat?**

```
- libAllCta: 'Bekijk alle tien',
+ libAllCta: 'Bekijk alle tien modellen',
```

**hero-lead van 62 woorden, met "Wat vaststaat is dat" erbovenop**

```
- lead: 'Een model dat één keer voor jouw merk ontworpen wordt en door niemand anders geboekt kan worden. Neem er één, of bouw een kleine cast — en kies per bestelling wie er loopt: een eigen gezicht of een van de tien standaardmodellen. Wat vaststaat is dat één gezicht een hele bestelling draagt, zodat je assortiment als één lijn leest in plaats van als een map losse shoots.',
+ lead: 'Een model dat we één keer voor jouw merk ontwerpen, en dat geen ander merk kan boeken. Neem er één of bouw een kleine cast. Per bestelling kies je wie er op staat: je eigen gezicht, of een van de tien standaardmodellen. Eén gezicht draagt de hele bestelling, dus je assortiment leest als één lijn in plaats van als een map losse shoots.',
```

**"Exclusief van constructie" — woord voor woord uit het Engels**

```
- ['Exclusief van constructie', 'Geen ander merk kan dit gezicht bestellen. Geen belofte — een eigenschap van hoe het gemaakt is.'],
+ ['Exclusief, en niet op ons woord', 'Geen ander merk kan dit gezicht bestellen. Dat is geen belofte maar een gevolg van hoe het gemaakt is.'],
```

**spelfout: stafeltarief → staffeltarief, en "loopt tegen" is Engels**

```
- ['Van jou om te houden', 'Één keer opgezet. Elke bestelling daarna loopt tegen het normale stafeltarief voor die omvang.'],
+ ['Van jou, en het blijft van jou', 'Je zet het één keer op. Elke bestelling daarna betaal je gewoon de prijs per product die bij die omvang hoort.'],
```

**"Negen richtingen, om tegenin te gaan" suggereert het tegenovergestelde**

```
- dirH: 'Negen richtingen, om tegenin te gaan.',
+ dirH: 'Negen richtingen om op te reageren.',
```

**het werkwoord "overstappen" ontbreekt**

```
- Je kunt later naar een merkmodel zonder iets over te doen.
+ Je kunt later alsnog overstappen op een eigen merkmodel, zonder iets over te doen.
```

**"kost" bestaat niet als enkelvoudig zelfstandig naamwoord**

```
- libNote: 'Standaardmodellen zitten in het tarief dat je al per product betaalt. Er is geen kost per model en geen upgrade om er een vrij te spelen.',
+ libNote: 'Standaardmodellen zitten in de prijs per product die je toch al betaalt. Je betaalt niets extra per model en er is geen upgrade voor nodig.',
```

## src/lib/account.js

**"Send it" — wat wordt er verstuurd?**

```
- loginSubmit: 'Send it',
+ loginSubmit: 'Send my code',
```

**"Versturen" — wat wordt er verstuurd?**

```
- loginSubmit: 'Versturen',
+ loginSubmit: 'Stuur mijn code',
```

**de duur is uit de vertaling weggevallen; STIJL.md eist dat "later" een tijd heeft**

```
- loginTooMany: 'Te veel pogingen. Even wachten en opnieuw proberen.',
+ loginTooMany: 'Te veel pogingen achter elkaar. Wacht een minuut en probeer het dan opnieuw.',
```

**"Niet gevonden." — geen onderwerp, geen uitweg**

```
- notFound: 'Niet gevonden.',
+ notFound: 'Deze pagina bestaat niet. Ga terug naar je overzicht.',
```

**zelfde melding, Engelse kant**

```
- notFound: 'Not found.',
+ notFound: 'This page does not exist. Go back to your overview.',
```

**"In menselijke controle" — geen Nederlander zegt dit**

```
- ovHumanCheck: 'In menselijke controle',
+ ovHumanCheck: 'Wordt nagekeken',
```

**de statuspil, die naast de tegel hierboven staat**

```
- human_check: { en: 'In human check', nl: 'In menselijke controle' },
+ human_check: { en: 'Being checked', nl: 'Wordt nagekeken' },
```

**de tegel op het overzicht, Engelse kant**

```
- ovHumanCheck: 'In human check',
+ ovHumanCheck: 'Being checked',
```

## src/data/styles.nl.js

**"het woord doen" bestaat niet — het is "het woord voeren"**

```
- 'Het geeft producten de ruimte om vanzelfsprekend te voelen. Woestijnlicht, linnentexturen, negatieve ruimte die het woord doet.',
+ 'Producten krijgen hier de ruimte. Woestijnlicht, linnen, en veel leegte eromheen die het werk doet.',
```

**"afval van de flits" — falloff is geen afval, dat is vuilnis**

```
- { title: 'Hard licht, hard geplaatst', body: 'De afval van de flits wordt gecontroleerd zodat het product scherp blijft terwijl de wereld erachter wegvalt.' },
+ { title: 'Hard licht, strak geplaatst', body: 'De flits valt precies af waar hij moet: het product blijft scherp en de achtergrond zakt weg.' },
```

**"Contrast zonder slachtoffers" — letterlijk vertaald, zegt niets**

```
- { title: 'Contrast zonder slachtoffers', body: 'We voeren de kracht op terwijl we productkleur en textuur beschermen tegen overbelichting.' },
+ { title: 'Hard, maar niets brandt uit', body: 'We zetten het contrast hoog en houden tegelijk de kleur en de structuur van je product heel.' },
```

**"moeiteloos" staat op de lijst met woorden die hier nooit staan**

```
- tagline: 'Ziet er moeiteloos uit. Is het niet.',
+ tagline: 'Ziet eruit alsof het zo gemaakt is. Dat is het niet.',
```

**"uit de hand" betekent in het Nederlands: uit de klauwen**

```
- { title: 'Houd het uit de hand', body: 'Natuurlijke hoeken en een vleugje imperfectie, zonder statiefstijfheid.' },
+ { title: 'Alsof het uit de hand geschoten is', body: 'Natuurlijke hoeken en een beetje scheef, zonder dat het er stijf van een statief uitziet.' },
```

**"uitsneed-ronde" is geen woord**

```
- { title: 'Feed-native vanaf het eerste kader', body: 'Geen aparte uitsneed-ronde nodig — het is klaar zoals geleverd.' },
+ { title: 'Meteen goed voor je feed', body: 'Je hoeft er niets meer uit te snijden — de verhouding klopt al zoals je hem krijgt.' },
```

## src/components/CatalogPage.astro

**de zin die Lucas zelf aanwees — "Het is ook waar" en "begint te ogen"**

```
- 'Het is ook waar een klein merk stilletjes gevestigd begint te ogen. Als elk product in je assortiment op dezelfde manier is geschoten — zelfde kader, zelfde licht, zelfde kleur — leest de collectie als één doordachte lijn in plaats van een mix van telefoonfoto’s. Die consistentie bouwt vertrouwen, en vertrouwen verhoogt de conversie.',
+ 'Het is ook wat een klein merk groter laat lijken dan het is. Staat elk product op dezelfde manier op de foto — zelfde kader, zelfde licht, zelfde kleur — dan ziet je collectie eruit als één doordachte lijn en niet als een verzameling telefoonfoto’s. Dat wekt vertrouwen, en vertrouwen verkoopt.',
```

**"de verkoop sluiten" bestaat niet in het Nederlands**

```
- Catalogfotografie: helderheid die de verkoop sluit.
+ Catalogfotografie: zo duidelijk dat er niets meer te twijfelen valt.
```

**de slotbepaling hangt nergens aan vast, en dit is de hero-lead**

```
- een stof- of logo-close-up en één on-model shot, en per product bij te bestellen.
+ een close-up van de stof of het logo, en één foto op een model. Meer beelden per product kan altijd.
```

## src/components/LifestylePage.astro

**"helderheid wekken" klopt niet; de tweede helft valt om**

```
- De scènes die verlangen wekken, niet alleen helderheid.
+ Beelden die iets losmaken, niet alleen laten zien wat het is.
```

**"verlangen, in context" is woord voor woord en zegt niets**

```
- Lifestylefotografie: verlangen, in context.
+ Lifestylefotografie: je product in een scène waar iemand zichzelf in ziet.
```

**"de scroll stoppen" is een letterlijk vertaalde uitdrukking**

```
- het sfeerbeeld dat de scroll stopt
+ het sfeerbeeld waar iemand op blijft hangen
```

**Engelse conditionele constructie die het Nederlands niet kent**

```
- het laat mensen zien wie ze ermee zouden zijn
+ het laat iemand zien hoe hij eruitziet met jouw product aan
```

## src/components/VideoPage.astro

**"plateaus" is niet "stopt" — de bewering wordt onwaar**

```
- Productvideo: beweging waar een stilstaande foto stopt.
+ Productvideo: beweging waar een foto niet verder komt.
```

**"de moedertaal" is een letterlijk overgezet beeld**

```
- waar beweging de moedertaal is
+ waar alles beweegt
```

**"boven de vouw" is Engels vakjargon**

```
- een moment van leven boven de vouw
+ iets dat leeft, meteen bij het eerste beeld
```

## src/components/order/OrderFlow.astro

**foutmelding met Engelse zinsbouw die niet zegt wat er ontbreekt**

```
- firstErr: 'Vertel ons aan wie we dit richten.',
+ firstErr: 'Vul je voornaam in — die komt op de factuur.',
```

**zelfde melding, Engelse kant: zegt niet welk veld**

```
- firstErr: 'Tell us who to address this to.',
+ firstErr: 'Fill in your first name — it goes on the invoice.',
```

**"full outfit" is ons woord; dit label hangt aan een toeslag**

```
- outfitLabel: 'Zitten hier full outfits bij?',
+ outfitLabel: 'Zitten er complete setjes bij? (broek, top en schoenen samen)',
```

**zelfde label, Engelse kant**

```
- outfitLabel: 'Any of these a full outfit?',
+ outfitLabel: 'Any complete outfits in here? (trousers, top and shoes together)',
```

**"Lopend totaal" is letterlijk vertaald**

```
- totalLabel: 'Lopend totaal',
+ totalLabel: 'Totaal tot nu toe',
```

**twee losse deelwoorden zonder onderwerp, als introzin van stap 4**

```
- lead: 'Tegen de echte agenda gecheckt in plaats van beloofd.',
+ lead: 'We kijken in de echte agenda. Wat je hier ziet, houden we ook vrij.',
```

**"planningshorizon" is een woord van achter de schermen, in een foutkop**

```
- fullH: 'Niets vrij binnen de planningshorizon',
+ fullH: 'De komende weken zitten vol',
```

**zelfde foutkop, Engelse kant**

```
- fullH: 'Nothing free inside the planning horizon',
+ fullH: 'The next few weeks are full',
```

## src/lib/portal.js

**"even" zonder tijd, op het scherm waar iemand al vastzit**

```
- busyBody: 'Even wachten en de pagina opnieuw laden.',
+ busyBody: 'Wacht een minuut en laad de pagina opnieuw.',
```

**zelfde melding, Engelse kant**

```
- busyBody: 'Give it a moment and reload the page.',
+ busyBody: 'Wait a minute and reload the page.',
```

**dezelfde status in het portaal**

```
- human_check: { en: 'In human check', nl: 'In menselijke controle' },
+ human_check: { en: 'Being checked', nl: 'Wordt nagekeken' },
```

## src/lib/admin.js

**en in admin, zodat de drie schermen hetzelfde woord gebruiken**

```
- human_check: 'In human check',
+ human_check: 'Being checked',
```
