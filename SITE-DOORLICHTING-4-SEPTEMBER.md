# De site doorgelicht — 4 september 2026

Terwijl Lucas de foto's maakt: de hele publieke site bekeken op 1440 en 390 px (36 schermafdrukken in tegels, plus cijfers per pagina), de homepage gelezen als front-end-bouwer, elke stijl op de drie dienstpagina's bekeken, en het abonnement — "super saai en niet waardevol" — opnieuw ontworpen. Plaatshouders voor foto's zijn bewust niet aangeraakt.

Meetscript: `node kladblok/doorlichting-site.mjs` (tegels + `cijfers.json`), `node kladblok/doorlichting-detail.mjs /nl/ …` (tikdoelen, alt, kleine tekst per pagina).

## 1 · Gebouwd

### 1.1 /start/plan — het abonnement afsluiten, opnieuw ontworpen

Wat er stond: vier grijze vakken onder elkaar met een radio, drie regels uitleg per vak en zes bedragen; daaronder nog drie vakken en een alinea over de machtiging. Alles even zwaar, niets dat zei wat je krijgt.

Wat er nu staat (`src/components/order/PlanPicker.astro`, volledig herschreven):

- **Links drie stappen** — *1 Welk abonnement* (vier kaarten in twee kolommen, naam + maandbedrag + één regel + feiten; de maand op maat met "vanaf €325 / mnd" en de drie velden die pas verschijnen als hij aanstaat), *2 Welke termijn* (twee kaarten naast elkaar; bij een maand op maat gedempt met "loopt altijd maandelijks"), *3 Je vaste week*.
- **Rechts één plaat in de accentkleur** — dezelfde `.lime-plate.plaat-vol` als op /plans en de homepage — die per keuze laat zien wat de maand oplevert: naam, bedrag, *Elke maand* (12 producten — 84 afgemaakte beelden; 2 motion-clips; merkmodel; vaste week; doorschuiven; prijsslot op de jaartermijn; opzegbaar of looptijd), *Los besteld: €1.158 — je bespaart €368*, *Wat er nu gebeurt* in drie stappen, en de knop. Bij de maand op maat drie uitgerekende voorbeelden (5/10/20 producten met carrousel) in plaats van een bedrag dat er niet kan staan.
- **Zonder script**: zeven varianten staan in de HTML en CSS `:has()` zet er één aan; de bedragen komen uit plans.js/pricing.js bij het bouwen. De plaat plakt mee bij het scrollen; onder 60rem staat hij onder de keuzes.
- De uitleg over de eigen look in een abonnement is een uitklapregel geworden (*Wil je een eigen look erin?*) in plaats van een kop met alinea midden in het formulier.
- Pagina van 3.387 → 2.428 px op desktop; 718 → 531 woorden. Alle toetsen die naar dit bestand kijken (subscribe, nazicht, plans, planstart, zacht, a11y, cspscripts) groen.

### 1.2 Elke stijl een eigen sectie, de eigen look bovenaan

Nieuwe component `src/components/StyleRows.astro`, op /catalog, /lifestyle en /video in plaats van het tegelraster:

- **Bovenaan de eigen look** als brede band: beeld, "Op maat", naam, tagline, beschrijving, de drie stappen (intake → haalbaarheid → offerte), prijsregel en twee knoppen (aanvragen / ontdek).
- Daaronder **"Of kies een vaste look"** met één regel uitleg, en dan elke vaste stijl als eigen regel: beeld (5:4, links/rechts afwisselend), naam, tagline, beschrijving, *Past bij* (drie uit `bestFor`), prijsregel, *Bestel X* + *Ontdek X*.
- De data blijft `styles.js` / `catalogStyles.js` / `videoStyles.js`; de pagina zet hem om naar één vorm. Lifestyle heeft foto's; catalog gebruikt tot morgen de getekende scène, video de posters.
- Kosten in lengte: /lifestyle 12.135 → 14.329 px, /catalog 11.019 → 11.507, /video 9.056 → 11.133. Zie §3 voor wat daar tegenover weg kan.

### 1.3 Kleine reparaties die op de schermafdrukken opvielen

- Homepage: *"zie hoe een bestelling draaitWat we opslaan…"* — de punt en spatie tussen twee zinnen ontbraken (NL én EN).
- Homepage: *"Nog niet klaar Hooks & Editions — lees wat ze zijn"* las als één kromme zin; nu *Hooks & Editions* met het etiket als pil erachter.
- /how-it-works: het kopje *KIES ER ÉÉN OM TE VOLGEN* stond in de koppenletter op .74rem — een streepje van zeven pixels. Nu de broodletter, leesbaar.
- /start: *Start deze bestelling* was een onderstreepte link van 13 px in de hoek van de kaart; nu een knop op elke kaart.
- Footer op een aanraakscherm: zestien links van 16 px hoog onder elkaar; nu wat lucht per regel (`pointer: coarse`), op desktop ongewijzigd.

## 2 · De homepage, gelezen als front-end-bouwer

Wat goed staat: hero met één boodschap en twee knoppen; de before/after-slider die in één beeld het product uitlegt; vier diensten met een eigen kaart; de prijsband met de laddertarieven; het abonnementsblok; vier stappen; het Studio-beeld; vier FAQ's; een eerlijk vertrouwensblok; complete footer. Technisch: 115 KB HTML (34 KB na gzip), Layout.css 113 KB (22 KB na gzip) plus zes kleine stylesheets, 59 KB JS, hero-beeld met `fetchpriority=high`, beide fonts voorgeladen, 9 beelden waarvan 8 lui. Geen horizontale overloop op 390 px op geen enkele pagina.

Wat ik zou verbeteren, in volgorde:

1. **De prijsregel "VAN €149 TOT €65"** — twee even grote getallen naast elkaar, en "van hoog tot laag" leest als een bereik dat de verkeerde kant op gaat. Beter één getal met de beweging erin: *€149 per product, en dat daalt tot €65 vanaf 20* — of de kleine ladder (1–4 / 5–9 / 10–19 / 20+) die /pricing al heeft.
2. **Sociale bewijskracht ontbreekt eerlijk** — het vertrouwensblok zegt dat al. Zodra de eerste drie klanten er zijn: drie logo's of drie zinnen met naam en merk, boven de FAQ. Tot dan is het blok goed zoals het is; alleen de *FOTO VOLGT* moet weg (komt morgen).
3. **De vierde dienstkaart (Je merkmodel) heeft geen beeld** — een leeg kader tussen drie foto's. Tot de foto er is: de kaart een scène of een van de tien modelgezichten geven, of hem tijdelijk op drie kaarten zetten.
4. **Het Studio-blok** ("Wat kun je verwachten na je bestelling") is een tekening met vinkjes en 700 px hoog; het zegt weinig dat het blok *Van map tot lancering* niet al zegt. Kandidaat om in te korten tot de tekst + één knop, of samen te voegen met stap 4.
5. **Twee keer dezelfde knop** onder *Wat wij maken* en in de prijsband (*Start een bestelling*), en nog eens in de hero en de footer. Vier keer op één pagina is één keer te veel; onder *Wat wij maken* mag hij weg — de kaarten hebben elk al een link.
6. **Mobiel**: de chipbalk onder de hero (VISUAILS · Catalogset · …) wordt afgesneden en de WhatsApp-knop ligt over de pauzeknop van de carrousel. Overweeg de balk op mobiel weg te laten of de WhatsApp-knop pas te tonen na de hero.
7. **Te kleine tekst**: de eyebrows op de dienstkaarten (10 px), de tags op de slider (10,2 px), de chipbalk (12,5 px). Alles onder 12 px is op een telefoon niet te lezen; 11–12 px als vloer.

## 3 · Per pagina — druk, onduidelijk, beter

Cijfers op 1440 / 390 px (hoogte, woorden, secties):

| Pagina | Hoogte 1440 | Hoogte 390 | Woorden | Secties | Opmerking |
|---|---|---|---|---|---|
| / | 9.557 | 11.686 | 1.144 | 9 | zie §2 |
| /catalog | 11.507 | 13.821 | 1.255 | 10 | na §1.2; twee stijlen |
| /lifestyle | 14.329 | 18.052 | 1.318 | 12 | langste pagina van de site |
| /video | 11.133 | 13.788 | 1.157 | 9 | |
| /custom-models | 10.832 | 16.253 | 1.483 | 11 | meeste woorden na Editions |
| /hooks | 8.565 | 12.511 | 1.268 | 8 | geen beelden |
| /editions | 10.627 | 13.621 | 1.631 | 10 | meeste woorden, geen beelden, 6 plaatshouders |
| /pricing | 6.574 | 7.980 | 870 | 6 | tabel scrolt op mobiel zonder hint |
| /plans | 5.940 | 9.411 | 1.269 | 7 | goed |
| /how-it-works | 10.051 | 12.250 | 1.461 | 9 | veel lege ruimte in de smalle kolom |
| /gallery | 9.100 | 9.481 | 212 | 3 | 4,4 MB beeld (lui) |
| /compare | 6.595 | 9.843 | 1.258 | 7 | |
| /start | 3.735 | 5.901 | 579 | 6 | goed, knop nu zichtbaar |

Wat er per pagina beter kan:

- **/lifestyle** (18.052 px op een telefoon). Met de stijlregels erbij is dit de pagina om te snoeien. Kandidaten: *Vier sferen. Dezelfde foto, vier keer anders afgewerkt* (824 px) zegt nu hetzelfde als de stijlregels; *Het assortiment, in beweging* (844 px) en *Voeg een consistent model toe* (984 px) kunnen naar één regel met een link. Dat haalt ~2.500 px weg en de pagina blijft compleet.
- **/catalog** en **/video**: dezelfde opbouw, dezelfde kandidaten (*Waar het past* + *Drie stappen* + *Alles wat … nodig heeft* + *model toevoegen* zijn op elke dienstpagina vier secties van 700–1.000 px). Een vaste inkorting: de *stappen* als drie regels in plaats van drie kaarten.
- **/editions** en **/hooks**: de twee pagina's zonder één beeld en met de meeste woorden (1.631 / 1.268). Zes plaatshouders op Editions. Zodra de foto's er zijn: eerst hier, want een pagina die alleen uit tekst bestaat over een visuele dienst is het minst overtuigend.
- **/custom-models**: 16.253 px op mobiel, 1.483 woorden. De uitleg van het merkmodel is compleet maar drie keer verteld (wat het is, hoe het werkt, waarom). Eén keer volstaat; de tien gezichten en de prijs zijn wat blijft hangen.
- **/pricing** op mobiel: de tabel scrolt horizontaal en de afgesneden kolomkop ("PER P") is de enige hint. Beter: op mobiel alleen *Complete bundel* tonen met een wissel naar *Catalogset* / *Lifestyle-carrousel*, of een vervaagde rand rechts die zegt dat er meer is.
- **/how-it-works**: de smalle middenkolom laat op 1440 px links en rechts een derde van het scherm leeg, en tussen de keuzeknoppen en de vier beelden zit 350 px niets. De figuur mag breder, of de tekst ernaast.
- **/gallery**: 44 beelden, 4,4 MB — lui geladen, dus de eerste weergave is licht, maar wie doorscrolt haalt alles binnen. Overweeg kleinere varianten (`srcset`) voor de tegels.
- **Tikdoelen op mobiel**: op elke pagina ~25 links onder 28 px — vooral de footer (nu gerepareerd) en losse tekstlinks in alinea's (*Wat maakt een foto bruikbaar?*, *Bekijk de galerij*). De "?"-notities zijn 24 px, bewust (SC 2.5.8-minimum).
- **Alt-teksten**: home 2, /start 3, /how-it-works 4 beelden zonder alt (decoratief kan, maar de modelgezichten en de before-foto zijn dat niet).

## 4 · Doorgevoerd — de tweede ronde (4 september, later op de dag)

Lucas: "ga bezig met de verbeteringen en aanpassingen". Gedaan, in de volgorde van §2 en §3:

- **Homepage** — de prijsregel is één bedrag (*Per product €149*) met de vier treden als kleine trap ernaast (1–4 / 5–9 / 10–19 / 20+, de onderste vet en in de accentkleur); de dubbele *Start een bestelling* onder *Wat wij maken* is weg; eyebrows op de dienstkaarten hebben een vloer van 11,5 px en de schuiflabels *Ingestuurd/Geleverd* staan op 11,5 px; op een telefoon houdt de hero-voet ruimte vrij voor de WhatsApp-knop zodat hij niet op de pauzeknop ligt. De "lege" vierde kaart bleek een timing-artefact van de schermafdruk — het beeld laadt gewoon. Het Studio-blok laat ik staan: dat was in augustus al bewust van 350 woorden naar één figuur teruggebracht.
- **De waaier** — per look drie of vier beelden, licht gedraaid, met een gloed in de kleur van de look; de kleine kaart is de ingestuurde telefoonfoto (*INGESTUURD*), het grootste beeld draagt *GELEVERD*. Een catalogset van vier past: vijf kaarten, de vier vierkant op een rij, de telefoonfoto eronder; de shots die nog komen staan er met hun naam op.
- **/lifestyle** — de vier schuifvergelijkingen (824 px) zijn weg (de waaiers dragen het paar al); *Voeg een consistent model toe* is één regel met een portret en een link in plaats van een fotosplit van 984 px. 14.329 → 12.642 px (390 px: 18.330 → 15.665).
- **/video** — de fotostrook van vijf banners onder de waaiers is weg: 11.133 → 9.240 px.
- **/custom-models** — het merkmodel werd drie keer uitgelegd; *Wat het is* is nu één alinea over wat het dóét, en de herhaling in *Waar je het gebruikt* is eruit.
- **/pricing op mobiel** — de eerste kolom blijft staan bij het schuiven, rechts een vervaagde rand zolang er meer is, en één regel eronder: *Schuif opzij voor de kolommen Catalogset en Lifestyle-carousel.*
- **/how-it-works** — minder lucht tussen de keuze en de eerste beelden, en de stappen op 42 in plaats van 48 svh (walk.js leest de echte staphoogte, dus het tempo klopt nog).
- **Alt-teksten** — op /start (de drie kaarten) en /how-it-works (telefoonfoto, modelgezichten) benoemd.
- **De drie stappen** op /catalog, /lifestyle en /video staan op één rij in plaats van als fotosplit van ~1.000 px (de foto staat sinds de waaiers al hoger). /catalog 11.480 → 10.811 px, /lifestyle → 12.028, /video → 8.628.
- `npm test` volledig groen op de verse build.

## 5 · Wat er nog ligt

- Foto's (morgen): homepage *FOTO VOLGT*, de vier voorbeeldfoto's, Catalog-scènes, Editions (6), Hooks.
- De snoei op /lifestyle, /catalog, /video uit §3 — één beslissing: welke van de vier vaste secties per dienstpagina mag naar één regel.
- De prijsregel op de homepage (§2.1) en de vierde dienstkaart (§2.3).
- De mobiele prijstabel op /pricing.
- `npm test` volledig groen op de verse build; migraties 0042–0045 zijn gedraaid; de Mollie-sleutel op de cron en de Resend-webhook staan in WERKLIJST.md.
