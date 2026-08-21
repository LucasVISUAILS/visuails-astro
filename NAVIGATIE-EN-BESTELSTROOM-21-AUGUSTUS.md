# Navigatie en bestelstroom — 21 augustus 2026

Dit is het verslag van de ronde die volgde op jouw vraag om *"heel diep na te
denken over de beste orderflow en site navigation voor VISUAILS"*, met als
voorbeeld dat je vanaf `/catalog` op **Start an order** klikt en dan opnieuw bij
het keuzemenu van catalog, lifestyle en complete uitkomt.

Ik heb het aangepakt als een verbouwing in vier lagen: eerst de kaart van wat er
stond, dan de bestelstroom, dan het menu, dan de tekst. Onderaan staat wat er
gecontroleerd is, wat er onderweg nog stuk bleek, en wat er nog van jou nodig is.

---

## 1 · De kaart, zoals hij was

Voordat ik iets aanraakte heb ik de site uitgelezen: welke pagina bestaat, wie
linkt ernaar, en hoeveel klikken staan er tussen "ik weet wat ik wil" en "ik vul
het formulier in". Dat leverde drie feiten op waar de rest uit volgt.

**De bovenbalk had zeven ingangen.** Twee uitklappers — *Wat we maken* en *Hoe
het werkt* — en daarnaast los: Jouw merkmodel, Galerij, Prijzen, Abonnement,
Contact. Dat is er twee te veel om in één blik te lezen, en erger: het zei iets
wat niet klopt. Een merkmodel en een abonnement zijn dingen die je koopt, maar ze
stonden buiten het menu dat "wat we maken" heet. Wie daar keek, kreeg een
onvolledig antwoord op de enige vraag die dat menu hoort te beantwoorden.

**De uitklapper *Hoe het werkt* had acht items.** Acht is geen menu meer, dat is
een lijst waarin je zoekt. Twee ervan hoorden er inhoudelijk ook niet:
`/compare` is een geldvergelijking (een shootdag tegen een bestelling) en
`/ai-act` is een verantwoording. Geen van beide is een processtap.

**De bestelstroom strafte de bezoeker die het al wist.** Vanaf `/catalog` waren
het drie klikken naar het catalogusformulier: *Start an order* → `/start` →
Catalog kiezen → `/start/catalog`. Die middelste stap stelde een vraag die de
bezoeker één pagina eerder al had beantwoord door überhaupt op `/catalog` te
staan. Vier knoppen op `/catalog` wezen naar `/start`; nul wezen naar
`/start/catalog`.

Daarnaast liep ik tegen iets aan wat je niet had gevraagd maar wat wel telt: de
tien stijlpagina's — `/catalog/classic`, `/lifestyle/dunes` en de acht andere —
hadden **elk precies één inkomende link**, van hun eigen hub, en verwezen naar
geen enkele zusterpagina. Tien geïndexeerde pagina's aan één draadje, en wie op
Dunes belandde en wilde weten hoe Flash eruitziet moest terug naar boven en
opnieuw beginnen.

---

## 2 · De bestelstroom: de deur en de knop

De kern van de verbouwing is één regel, en die is makkelijk op te schrijven:

> **De knop zegt wat er achter de knop gebeurt.**

Er zijn zes manieren om bij VISUAILS iets te bestellen — catalogus, lifestyle,
allebei, video, merkmodel, abonnement. Die zes staan nu op één plek in de code,
in `src/data/orderDoors.js`, met per deur de leespagina, het formulier, de naam
in beide talen en de tekst die op de knop hoort. Elke dienstpagina haalt zijn
knoptekst en zijn bestemming daar vandaan. Dat is niet alleen netter: het maakt
het onmogelijk om een knop te hebben die iets anders zegt dan hij doet, want de
tekst en het adres komen uit dezelfde regel.

Wat je daarvan ziet:

| Waar je staat | Wat er nu op de knop staat | Waar hij heen gaat |
| --- | --- | --- |
| `/catalog` | Order catalog visuals | `/start/catalog` |
| `/lifestyle` | Order lifestyle visuals | `/start/lifestyle` |
| `/video` | Ask about a video clip | `/start/video` |
| `/custom-models` | Start your Brand Model | `/start/brand-model` |
| `/plans` | Start a plan | `/start/plan` |
| `/catalog/classic` | Order Classic | `/start/catalog` |
| `/lifestyle/dunes` | Order Dunes | `/start/lifestyle?style=dunes` |

Drie klikken werden er twee, en op een stijlpagina staat de stijl bij aankomst
in het formulier al aangevinkt. Dat laatste vroeg een kleine ingreep in de
stijlkiezer: die leest nu `?style=` uit het adres, controleert de waarde tegen
een streng patroon, en stuurt daarna een echt `change`-event de pagina in —
anders zou de prijsberekening ernaast niet meeveranderen en zou het formulier
een stijl tonen die het zelf niet weet.

**`/start` blijft bestaan**, precies zoals je koos: voor wie nog niets gekozen
heeft. Vanaf de homepage, de prijzenpagina en de vergelijkingspagina wijst de
knop daar nog steeds heen, want daar heeft de bezoeker nog geen dienst in zijn
hoofd. Wat verdwenen is, is de omweg voor wie dat wél had.

**En alle diensten zijn overal kiesbaar.** Onder de hoofdknop van elke
dienstpagina staat één regel: *Also available: Lifestyle · Both together · Video
· Brand Model · Monthly plan*. Bewust een regel en geen blok met kaarten — een
kaartenblok zou op elke dienstpagina opnieuw een schermvullende keuze neerzetten,
en dat is exact de fout die `/start` maakte. De hoofdknop is het antwoord voor
negen van de tien; die regel is de zijdeur voor de tiende en kost vijf regels
hoogte in plaats van tweehonderd.

Op de stijlpagina's staat er een tweede regel boven: *Other looks: Flash · Glow
· Phone-made · Custom*. Daarmee is het draadje weg. Elke stijlpagina heeft nu
tussen de twee en zes inkomende links in plaats van één, en vanaf elke
stijlpagina loop je naar elke andere look en naar elke andere dienst.

---

## 3 · Het menu

De bovenbalk ging van zeven ingangen naar vijf: *Wat we maken*, *Hoe het werkt*,
Prijzen, Galerij, Contact. En het principe daarachter is hetzelfde als bij de
knop — **alles wat je koopt staat in één menu**:

*Wat we maken* ging van vijf naar zeven items: Catalog, Lifestyle, Video, Jouw
merkmodel, Abonnement, en de twee die er nog niet zijn (Hooks en Editions, die
geen `href` hebben en dus geen link zijn — die constructie is ongemoeid
gebleven).

*Hoe het werkt* ging van acht naar zes. `/compare` en `/ai-act` zijn eruit, en
allebei naar een plek waar iemand ze zoekt in plaats van een plek waar ze
toevallig pasten: `/compare` staat nu naast de prijzen op `/pricing` én in de
voettekst, `/ai-act` in de juridische regel onderaan naast privacy en
voorwaarden. **Geen enkele URL is veranderd** en geen van beide pagina's is een
link kwijtgeraakt; ze zijn alleen verhuisd.

Twee kleinere dingen die opvielen toen ik dit uittekende:

Het **merkteken in de mobiele lade was geen link**. Op desktop is het dat wel.
Wie op een telefoon het menu opende, had geen enkele weg terug naar de homepage
behalve de terugknop van de browser. Nu is het een link met een leesbaar label.

En de **voettekst herhaalde zichzelf**: Jouw merkmodel en Abonnement stonden
twee keer in dezelfde kolom zodra ze in het menu erboven kwamen. Weg. In ruil
kregen `/compare`, `/studio`, `/demo` en `/about` er een plek bij — dat waren
bijna-wezen, met nul of één inkomende link vanuit de lopende tekst.

---

## 4 · Het vraagteken: een zwevende notitie

Je vroeg om een vraagteken dat **niet uitklapt maar een zwevend blok toont**, om
ruimte te sparen. Dat is er, als één component (`src/components/Note.astro`) die
overal hetzelfde werkt.

Wat het doet: naast een term staat een klein rondje met een `?`. Ga je er met de
muis overheen, of tab je ernaartoe, dan verschijnt het blok zwevend boven de
pagina — het duwt niets weg en de pagina blijft even lang. Escape sluit het, en
klikken werkt ook, zodat het op een telefoon net zo bruikbaar is als op een
laptop.

Een paar keuzes daarin die ik expliciet wil noemen:

Het is een **echte knop** en geen `title=""`. Een browsertooltip verschijnt na
een seconde, verdwijnt vanzelf, is niet met het toetsenbord te bereiken en is op
een telefoon onzichtbaar. Deze is dat allemaal wel.

Het blok is **`position: fixed`** en niet absoluut. De banden op deze site
knippen af wat erbuiten valt; een absoluut geplaatste notitie zou half achter de
rand van zijn eigen band verdwijnen. Nu wordt de positie bij het openen berekend
en bij scrollen bijgewerkt.

Het raakvlak is **24 bij 24 pixels**, ook al is het zichtbare rondje kleiner.
Dat is de WCAG-eis voor een aanraakdoel, en zonder die ingreep is het op een
telefoon een kansspel.

Er staan **achttien vraagtekens** in de broncode, en omdat een aantal daarvan
op meerdere pagina's terugkomt zijn het **48 notities** in de gebouwde site —
vierentwintig in elke taal: op de homepage bij
Hooks, Editions, het credit, de twee stockregels en de tijdstempel; op `/start`,
`/how-it-works`, `/pricing`, `/plans`, `/portal`, `/catalog`, `/lifestyle`,
`/video` en in het bestelformulier zelf bij de btw, de vaste week, de machtiging
en de foto op een model. Steeds volgens dezelfde regel: **wat je moet weten om
te beslissen staat er gewoon, wat je alleen wilt weten als je doorvraagt zit
achter het vraagteken.**

---

## 5 · Minder tekst, meer beeld

De btw-alinea uit je schermafbeelding is daar het duidelijkste voorbeeld van. Die
las:

> All figures are excl. VAT. Dutch customers pay 21% VAT at checkout. If you are
> an EU business outside the Netherlands, enter your VAT number: if VIES confirms
> it, you pay 0% and the VAT is reverse charged. Outside the EU the supply falls
> outside European VAT.

Nu staat er één regel — *All figures are excl. VAT.* — met een vraagteken. De
rest is er nog, woord voor woord, maar alleen voor wie erom vraagt. Dat is
zesenvijftig woorden minder op vijf plekken in de bestelstroom, precies daar waar
iemand op het punt staat te betalen.

Zo zijn er meer ingekort:

- De voetregel onder het Studio-scherm op de homepage: **65 woorden werden er 27**.
  Wat eruit is, is de zin over tijdstempels; die zit achter het vraagteken. De
  twee links zijn gebleven.
- Het credit-blok op `/plans`: **55 woorden werden er 26**. De twee zinnen die
  twijfel wegnemen — je hoeft niets nieuws te hebben, en wat je niet gebruikt
  vervalt niet — staan er gewoon. De opsomming van wát erin kan is een voorbeeld
  en geen voorwaarde, dus die zit achter het vraagteken.
- De herkomsttag op `/portal`: **96 woorden werden er 51**. Wat je moet dóén
  staat er voluit; waarom de techniek onbetrouwbaar is, is techniek.
- De "Hooks"- en "Editions"-panelen op de homepage waren uitklappers die de
  pagina langer maakten zodra je ze opende. Nu zijn het zwevende notities: even
  veel uitleg, geen extra hoogte.

Op de homepage staan nu **1958 woorden in de hoofdinhoud, waarvan 497
achter een vraagteken** en een groot deel van de rest labels in figuren — het
Studio-scherm, de prijstabel, de plannenvergelijking, de doorloop van een
bestelling. De lopende tekst is 884 woorden. De vorm die je vroeg — minder
lezen, meer kijken — zit dus vooral hierin: wat er staat is grotendeels iets om
naar te kíjken, en wat er te lezen valt is opgedeeld in twee lagen.

---

## 6 · De bug die je meldde

> *"Wanneer ik op de homepage kom kan ik op de service knoppen klikken zonder
> naar de service te gaan, maar als ik wissel van taal of ik ga naar een andere
> pagina en ik ga terug naar de homepage, dan ga ik wél naar die service toe."*

Dit was een echte bug, en de oorzaak is subtiel genoeg om op te schrijven.

De site navigeert "zacht": bij het klikken op een link wordt de nieuwe pagina
ingeladen en wisselt alleen de inhoud, zonder volledige herlading. Astro's
ClientRouter voert een inline `<script>` daarbij **precies één keer** uit — de
eerste keer dat hij het tegenkomt — en daarna nooit meer, ook niet op een andere
pagina. De Nederlandse homepage draagt letterlijk dezelfde scripttekst als de
Engelse, dus die telde als "al gedraaid".

Gevolg: het script dat van de dienstkaarten tabbladen maakt (klikken wisselt de
achtergrondfoto) liep alleen bij de eerste aankomst. Kwam je terug, dan waren het
weer gewone links en ging je naar de dienstpagina.

Ik heb het gereproduceerd voordat ik het repareerde: binnenkomen op `/pricing`
en dan zacht naar `/` — werkt. Daarna `/pricing` → `/` — stuk. De reparatie is
`data-astro-rerun` op de betrokken scripts, plus een opruimstap zodat er bij elke
herstart niet een extra luisteraar bijkomt. Er staat nu een test op die drie
routes naar de homepage aflegt en na elke route controleert of de kaarten nog
tabbladen zijn — en die telt ook de luisteraars, zodat een lek zichtbaar wordt
voordat het merkbaar is.

---

## 7 · Wat er onderweg nog stuk bleek

Een paar dingen die ik niet zocht maar wel tegenkwam:

**"Order Classic" leverde een bestelling zonder Classic erin.** De knop op de
stijlpagina wees naar het algemene formulier, dus de stijl waar de hele pagina
over ging werd nergens vastgelegd. Nu gaat de stijl mee in het adres en staat hij
bij aankomst aangevinkt.

**"Order Custom Brand" beloofde een tarief dat nog niet bestaat.** Een eigen look
wordt eerst ontworpen; er ís geen prijs per product tot dat gebeurd is. Die knop
heet nu *Ask for a Custom Brand look* en gaat naar de aanvraagpagina.

**Een `<p>` in een zwevende notitie maakte hem leeg.** De HTML-parser sluit bij
een `<p>` binnen een `<p>` de buitenste — waardoor de notitie uit haar eigen
omhulsel viel: het zwevende blok was leeg en de 168 woorden stonden gewoon in de
kaart. In de broncode was daar niets aan te zien. Er staat nu een controle op die
de gebouwde pagina echt ontleedt en weigert als een notitie leeg is.

**Escape opende de notitie meteen weer.** Sluiten zette de focus terug op de
knop, en focus opent de notitie. Opgelost met een korte onderdrukking die
vervalt zodra je ergens anders heen gaat.

**`/nl/nl/start/catalog`.** De vergelijkingscomponent vertaalde het adres zelf al,
dus een aanroeper die een vertaald adres meegaf kreeg het er twee keer voor.

**Drie onzichtbare labels.** Het vraagteken draagt een naam voor wie het niet
ziet, en die wordt opgebouwd als *"What … means"*. Bij drie nieuwe notities stond
daar een zin in plaats van een ding: *"What we record means"*. Op het scherm zie
je daar niets van; met een schermlezer is het onverstaanbaar. Er staat nu een
controle op die elk label in de gebouwde site naleest.

---

## 8 · Hoe het gecontroleerd is

Alles hieronder staat groen op de huidige bouw.

- **`npm test` — 3163 assertions over 50 suites, exit 0.** Daar zitten drie nieuwe
  controles bij: de knop mag niet iets anders zeggen dan hij doet, een zwevende
  notitie mag niet leeg zijn, en een notitielabel moet over een ding gaan.
- **`npm run keuring` — 364 metingen (91 pagina's × 4 breedtes): geen bevindingen.**
  Die kijkt naar horizontaal scrollen, te kleine raakvlakken, overlappende tekst
  en consolefouten. De nieuwe keuzerijen breken netjes af op 390 pixels.
- **`npm run visueel` — 364 opnamen tegen de referentie.** Deze vangrail was zelf
  stuk: hij meldde tot twee keer toe een verschil van 3091 pixels op `/demo` dat
  er niet was. Dat is gerepareerd (zie hieronder) en daarna twee keer achter
  elkaar schoon gedraaid.
- **Vijf audits over de gebouwde site:** tekstfouten (0 meldingen op 93 pagina's),
  NL/EN-paren (0 bedragen die verschillen, 0 kopstructuren die verschillen), dode
  links (0), hreflang (0), JSON-LD (93 blokken, 0 stuk).
- **Een doorloop met een echte browser** (`wandel.mjs`): vanaf elke dienstpagina
  naar het juiste formulier, van stijlpagina naar formulier met de stijl al
  aangevinkt, de keuzerij heen en terug, het menu na een zachte navigatie, en de
  zwevende notitie inclusief Escape en toetsenbordbediening. Geen consolefouten.

Over die vangrail: hij vergeleek bouwsels met elkaar, maar mat in de praktijk hoe
druk de machine het had. De pagina verbergt inhoud tot de scripts draaien en
haalt die noodrem er na 600 ms weer af; haalde de machine dat net niet, dan werd
`/demo` ineens 3091 pixels korter. Wachten kan dat niet oplossen, want op het
moment dat je merkt dat het te laat is, is het al gebeurd. De vlag wordt nu
gezet vóórdat de pagina laadt, in beide vangrails. Dat verbergt geen fout: de
vangrail moet zien of ónze wijziging iets verschuift, en daarvoor moet de
toestand aan beide kanten dezelfde zijn.

---

## 9 · Wat er nog van jou nodig is

Dit staat nog open — deels uit de vorige ronde:

1. **`npm run migrate`** draaien; migratie 0032 is aangepast.
2. **`SELLER_ADDRESS`** als Pages-secret zetten (jouw echte adres hoort daar, niet
   in de code).
3. **`functions/api/debug-egress-ip.js` verwijderen** — ik kan op jouw schijf niets
   weggooien.
4. **`npm run krimpen`** staat klaar als proefdraai: 73 beelden die veel groter
   worden aangeleverd dan ze getoond worden, samen 6,2 MB.
5. Beslissen of de **machtigingsbetaling van € 1** een factuur nodig heeft.
6. Optioneel: **`INVOICE_BCC`** instellen.

En daarna de gewone stappen: `git push`, dan `npm run cron:check` en
`npm run cron:deploy`, met `RESEND_API_KEY` gecontroleerd op het cron-project.
