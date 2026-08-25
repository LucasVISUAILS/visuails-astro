# Schrijfwijzer VISUAILS

Lucas, 24 augustus 2026:

> Ik wil ook dat je alle zinnen die ik aanpas opsla in hoe ik zinnen
> gestructureerd wil hebben, dus sla deze op en wanneer ik bijvoorbeeld nieuwe
> secties aan de website toevoeg, verminderd dit wellicht de kans op foute
> zinnen en spellingsfouten.

Dit is dat document. Het is **niet verzonnen maar afgeleid**: elke regel hier komt
uit een vergelijking van de 199 zinnen die Lucas in de tekstronde van de homepage
zelf herschreef, naast wat er stond. Waar een patroon vaker dan een paar keer
terugkomt, staat het er met de telling erbij.

Wie hier iets aan toevoegt, doet dat op dezelfde manier: eerst meten wat er in de
correcties zit, dan opschrijven. Een schrijfwijzer die uit smaak bestaat, wordt
niet gevolgd.

---

## 1 · De vorm van een zin

**Langer mag, vaag niet.** In 92 van de 199 herschrijvingen werd de zin *langer*
en in 26 korter. Dat is het tegenovergestelde van de gebruikelijke reflex, en het
is consequent: wat erbij komt is steeds een concreet gegeven — wát je krijgt, hoe
snel, hoeveel, waarvoor. Wat eruit gaat is de omweg.

> was: `Cut, colour, print and hardware stay exactly as they are on the sample.`
> is : `Guaranteed product accuracy: Cut, color, print & details remain unchanged.`

**Eén zin liever dan twee.** 26 keer werden twee korte zinnen één lopende zin.
Twee losse mededelingen achter elkaar lezen als een opsomming; één zin met een
gedachtestreepje of een dubbele punt legt het verband.

> was: `Dit kwam binnen. Dit ging eruit.`
> is : `Jouw ruwe foto → Onze studioproductie`

**Begin bij de handeling of bij wie het doet.** 18 keer verplaatst: `Upload…`,
`We require…`, `Wij leveren…`, `Je stuurt…`. Niet bij de omstandigheid.

> was: `The same set as a catalog order: front and back at a minimum…`
> is : `We require a full visual set: at least a clear front and back view…`

---

## 2 · Het etiket met de dubbele punt

15 keer opgebouwd als **korte benoeming, dubbele punt, uitwerking**. Dit is het
meest herkenbare patroon in zijn correcties.

> `Guaranteed product accuracy: Cut, color, print & details remain unchanged.`
> `Productnauwkeurigheid: pasvorm, kleur en details blijven ongewijzigd.`
> `Test sample: Upload your own product and receive 4 catalog photos…`

De benoeming is een **zelfstandig naamwoord of een korte constatering**, nooit een
hele zin, en hij eindigt niet op een punt. Wat na de dubbele punt komt begint met
een hoofdletter wanneer het een volledige zin is, en met een kleine letter wanneer
het een opsomming is.

---

## 3 · Woorden die hij aanzet

Geteld over alle correcties, alleen waar het woord er nog niet stond:

| woord | keer | waar het voor staat |
|---|---|---|
| direct / instant | 26 | dat er niets tussen zit — geen wachttijd, geen tussenstap |
| exclusive / exclusief | 10 | dat iets alleen van deze klant is |
| gebouwd / engineered | 6 | dat het gemaakt is en niet toevallig ontstaan |
| naadloos / seamless | 6 | dat het in zijn bestaande feed of shop past |
| commercieel / commercial | 3 | dat je het mag gebruiken om te verkopen |

Dit is geen lijst met verplichte woorden. Het is waar de teksten over gáán, en een
nieuwe sectie die geen van deze vijf dingen belooft, mist waarschijnlijk het punt.

---

## 4 · Wat je NIET mag beloven

Dit deel komt niet uit smaak maar uit toetsen die roodgaan, en het is het enige
deel van dit document dat afgedwongen wordt (zie §6).

**Geen uitkomst.** Volgers, bereik, betrokkenheid, viraal gaan — dat hangt van het
platform en de timing af en niet van het werk. Mag wél **als kans**, en dat is
Lucas' eigen oplossing:

> mag niet: `engineered to boost engagement and grow your following`
> mag wel : `built to give a post its best chance at more engagement and new followers`
> mag wel : `gebouwd om je post de beste kans te geven op meer betrokkenheid`

**Geen prijs in een paneel van een dienst die nog niet te koop is.** De prijs ligt
nog niet vast; dat hoort er ook te staan.

**Het woord "stock" alleen ontkend.** Jezelf stock noemen is de vergelijking
opzoeken die je verliest. Benoemen om af te wijzen mag: *"wat een stockbibliotheek
nooit kan bieden"*.

**De gedeelde set heet gedeeld, met zoveel woorden.** Niet "niet exclusief" maar
*"dezelfde set gaat ook naar andere merken"*. De klanten zijn kledingmerken en dus
elkaars concurrenten; twee abonnees die hetzelfde beeld posten staan in dezelfde
feed voor dezelfde koper. Dat mag geen kleine lettertjes worden.

**De levertijd komt uit `turnaround()`** en wordt niet als getal getypt. Een
getypt getal loopt uit de pas met de rest van de site zodra het verandert — dat is
één keer gebeurd en de homepage beloofde toen het dubbele van elke andere pagina.

---

## 5 · Tekens

Deze zijn mechanisch en worden afgedwongen. Ze gingen in de ronde van 24 augustus
allebei mis, en allebei stil.

**Het kastlijntje krijgt spaties: ` — `.** Gemeten op de bron: 3.666 keer mét
spaties, 5 keer zonder — en die vijf vielen op als een andere hand. Zonder spaties
plakt het aan de woorden en breekt de regel op een andere plek af.

**De apostrof in een woord is `’` (U+2019) en niet `'`.** In de aangeleverde
correcties stond het 25 om 10 door elkaar. Twee redenen, en de tweede is de
zwaarste: het staat lelijk naast elkaar in dezelfde alinea, én een rechte apostrof
in een zin die in een single-quoted JavaScript-string belandt, **beëindigt die
string**. Daar lag `src/i18n/ui.js` een ronde eerder op zijn rug, op het woord
`Catalogusfoto's`.

`scripts/tekst-toepassen.mjs` zet dit automatisch om bij het toepassen van een
tekstronde, dus in de ingevulde bestanden hoeft er niet op gelet te worden.

---

## 6 · Wat hiervan een toets is

Een document verandert niets aan wat er morgen wordt geschreven; een toets wel.
Van het bovenstaande is dit afgedwongen:

| regel | waar |
|---|---|
| geen belofte over de uitkomst, tenzij als kans | `tests/nav.test.mjs` |
| "stock" alleen ontkend | `tests/nav.test.mjs` |
| de gedeelde set heet gedeeld en gaat naar andere merken | `tests/nav.test.mjs` |
| de prijs staat niet in een "binnenkort"-paneel | `tests/nav.test.mjs` |
| levertijd uit `turnaround()`, niet getypt | `tests/nav.test.mjs` |
| kastlijntje met spaties, apostrof als `’` | `tests/schrijfwijze.test.mjs` |
| de beloftes over levering en revisie | `tests/promises.test.mjs` |

**En één regel die GEEN toets werd, met de meting erbij.** Op 24 augustus vroeg
Lucas een alternatief voor *"Bekijk de prijs per product"*, omdat die regel op
/nl/catalog drie keer stond en op /nl/lifestyle twee keer. De voor de hand
liggende wacht — *geen linktekst drie keer in dezelfde `<main>`* — is geschreven
en weer weggehaald: hij vond 28 plekken, en de meeste waren goed. Een e-mailadres
dat drie keer in een juridische alinea staat, of dezelfde hoofdknop boven, in het
midden en onder een lange pagina, is herhaling die werkt.

Wat er in het catalogusgeval mis was, is niet het AANTAL maar de PLAATS: de derde
stond onder de tredetabel, waar de link iets over die tabel hoort te zeggen en
niet het algemene ding dat de knoppen erboven en eronder al zeggen. Die staat er
nu als `Bekijk het tarief vanaf N producten`. Dat oordeel is niet te tellen, dus
het staat hier en niet in een toets.

De rest — de lengte, het etiket met de dubbele punt, de woorden — is *stijl* en
staat er bewust niet als toets in. Een toets die een schrijfstijl afdwingt, keurt
op een dag de betere zin af, en dan wordt hij weggehaald in plaats van gevolgd.
Dat is precies wat er met vijf toetsen in deze ronde gebeurde: ze pinden de
spelling van een regel in plaats van wat hij belooft, en gingen rood op een
verbetering.
