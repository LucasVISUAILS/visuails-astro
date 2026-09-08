# Zes mensen, dezelfde site

*7 september 2026 — gemeten met `kladblok/klantreis.mjs` (28 pagina's, twee
breedtes, twee talen) en `kladblok/personas.mjs` (26 pagina's op 390px).
Alle getallen hieronder komen uit `kladblok/klantreis/reis.json` en
`personas.json`; niets is geschat.*

---

## De korte versie

De site is goed. De taal is helder, de beloftes zijn concreet, elke pagina
heeft een WhatsApp-knop, en het bestelformulier is beter opgebouwd dan bij de
meeste bureaus — vier genummerde stappen, inloggen duidelijk optioneel.

Wat zes verschillende mensen gemeen hebben, is één ding: **de pagina's zijn
lang, en het moment waarop je iets kúnt doen ligt ver naar beneden.** Op
`/test-sample` — de pagina met de laagste drempel van de hele site — staat het
eerste invulveld op **3991px** op een telefoon, van een pagina van 9241px. Dat
is bijna vijf schermen scrollen om aan een proef van één euro te beginnen.

Drie dingen waren geen smaak maar fouten, en die zijn gerepareerd (zie
onderaan).

---

## 1 · Ruben, 29 — e-commercemanager bij een streetwear-merk

*Kent de markt, weet wat hij wil, kijkt 's avonds op zijn telefoon. Geeft je
twintig seconden.*

**Wat werkt.** De voorpagina op 390px doet precies wat hij nodig heeft: 34
woorden, "Start een bestelling" op 254px, "Probeer VISUAILS · €1" op 311px.
Twee knoppen, allebei zonder scrollen. Dit is de beste pagina van de site.

**Waar hij vastloopt.** Hij tikt op de €1-proef en belandt op een pagina waar
níets te tikken valt. De kop is goed, de prijs staat er (€1 op 453px), en dan
volgen 3,5 schermen uitleg voordat het formulier begint. Ruben is overtuigd op
scherm één en moet nog vier schermen door voordat hij mag beginnen.

> `/test-sample` · 9241px hoog · eerste veld op 3991px · eerste knop op 4230px

**Wat hij zou doen.** Terug, en het via `/start` proberen. Daar staat "Start
deze bestelling" op 1229px — anderhalf scherm. Dat lukt wel.

---

## 2 · Marja, 58 — kledingzaak met een webshop erbij

*Nederlandse tekst, desktop, leest alles. Wil weten wat ze krijgt en of er
iemand is als het misgaat.*

**Wat werkt.** De FAQ. 27 vragen, gemiddeld 16,5 woorden per zin, en de
antwoorden ontwijken niets — het antwoord over "waarom niet zelf met een
AI-tool" zegt eerlijk dat ze voor een deel wél een tool moet gebruiken. Dat
koopt vertrouwen. Er is op elke pagina een WhatsApp-knop, rechtsonder,
altijd zichtbaar.

**Waar ze struikelt.** Het Engels in de Nederlandse tekst. Op `/nl/faq` staan
in de lopende tekst: *shoot, lifestyle, catalog, plan, download, dashboard,
output, account*. Een deel daarvan zijn productnamen en die horen te blijven
staan — "Catalogset" en "Lifestyle-carousel" zijn hoe het heet. Maar
*dashboard*, *output* en *account* zijn geen productnamen, en op
`/nl/how-it-works` staan er zeven bij elkaar.

**Wat ze doet.** Ze leest verder, want de zinnen eromheen zijn duidelijk. Maar
ze aarzelt één keer per alinea, en dat is precies het aantal aarzelingen dat
ze bij een concurrent niet heeft.

---

## 3 · Ilse, 34 — freelance ontwerper, bestelt voor haar klanten

*Wil weten of ze het beeld aan haar klant mag overdragen. Dat is haar hele
vraag.*

**Wat werkte niet.** Ze klikt op "Wie is eigenaar van de resultaten?" en las:

> "De afgewerkte visuals zijn van jou om voor je bedrijf te gebruiken. Heb je
> een specifieke licentievraag, stel hem gerust en we bevestigen de details
> voor jouw geval op schrift."

Dat is een gebruiksrecht, geen eigendom, en het antwoord op haar vraag is
"mail ons maar". Terwijl `/terms` §6 er een véél sterker antwoord op heeft dat
zij nooit te zien kreeg: een **exclusieve** licentie, en een **kosteloze akte
van overdracht** op verzoek — mét de uitleg dat een overdrachtsclausule in
algemene voorwaarden naar Nederlands recht niet geldig is, dus dat wie dat wél
belooft iets belooft wat de wet niet toestaat.

Het zwakste zinnetje van de site stond op de vraag waar de sterkste alinea van
de site over gaat. **Gerepareerd** — dat antwoord staat er nu, in beide talen.

**Wat verder goed is voor haar.** De FAQ over bestellen als bureau is
uitstekend: hij vertelt uit zichzelf dat de €1-proef per bedríjf telt en niet
per e-mailadres, dus dat ze hem niet per klant kan herhalen. Dat is de
onprettige waarheid vóóraf vertellen, en dat is het juiste moment.

---

## 4 · Tom, 41 — marketingmanager, moet het intern verantwoorden

*Heeft een datum nodig, een factuur, en iets om aan inkoop te laten zien.*

**Wat werkt, en goed.** `/studio` legt de datumpoort uit met een echte
kalender in plaats van een belofte, inclusief de dagen die geweigerd worden en
waaróm. Dat is het soort openheid dat een inkoopafdeling ontwapent. Ook de
btw-uitleg (VIES, verlegging, 21% voor NL) is compleet.

**Wat er stond.** In diezelfde kalender:

> ma 3 aug · 8 / 11 · Te vroeg
> di 4 aug · 11 / 11 · Te vroeg
> **wo 5 aug · 11.285714285714286 / 11 · Te vroeg**

Zestien decimalen, op de twee dagen die de figuur het hardst moet maken: de
volle. Op `/studio` en `/nl/studio` allebei. Op precies de pagina die
zorgvuldigheid moet bewijzen. **Gerepareerd** — nu "11 / 11 · Vol", en er is
een test die het bewaakt.

---

## 5 · Yasmin, 24 — net begonnen merk, geen budget

*In de trein, op haar telefoon, zoekt de goedkoopste manier om het te
proberen.*

**Wat werkt.** Ze vindt de €1-proef binnen één scherm op de voorpagina. Ze
hoeft geen account te maken om te bestellen: op `/start/catalog` staat
"Inloggen" er wel, maar met de tekst "Al eerder bij ons besteld?" ernaast en
"Verder" gewoon eronder. Het is een aanbod, geen muur. Goed gedaan.

**Waar het schuurt.** Dezelfde als bij Ruben: vier schermen tot het formulier.
En daarna zijn er 22 velden, waarvan er 2 verplicht zijn. Dat laatste is
gunstig, maar dat wéét ze niet als ze naar het formulier kijkt — 22 velden
zien er als 22 velden uit.

**En één ding dat niemand haar vertelt boven de vouw:** wat er verkocht wordt.
De kop is "Jij uploadt. Wij leveren de campagne." Dat is een sterke zin, maar
"campagne" is abstract; het woord *productfoto* staat er niet. De foto
eronder redt het — maar op een klein scherm is de foto niet ver genoeg
zichtbaar om het uit te leggen. Dit is smaak, geen fout.

---

## 6 · Peter, 63 — verkoopt vintage kleding, sceptisch over AI

*Bril op de tafel, tikt met zijn duim, wil geen trucs.*

**Wat werkte niet.** Elke `.pijl` — de tweede navigatie van de site, "Bekijk
de galerij", "Vergelijk de abonnementen", "Bekijk de prijs per product" — was
18px hoog met nul padding. Dat is prima voor een link middenin een zin, maar
deze staan bijna nergens in een zin: ze staan alleen in hun eigen blok, als
knop bedoeld. Op een telefoon mikte hij met een duim op achttien pixels.
**Gerepareerd** naar 24px (WCAG 2.5.8 AA) via een pseudo-element, dus er is
niets verschoven.

**Wat hem geruststelt.** De AI Act-regel komt bij het bestand mee, en de FAQ
zegt uit zichzelf dat een klant het kan zien. Dat is de goede kant op eerlijk.

**Wat te klein blijft.** Op `/catalog` en `/lifestyle` staat "Past bij —
webshops die staan of vallen met een strak grid · marktplaatsverkopers met
strikte beeldregels" op **11,5px**. Dat is de kleinste tekst van de pagina, en
het is precies de regel die zegt of het product voor hem is. Dit haalt de
ondergrens van de eigen keuring (11,5px) en is dus geen fout — maar het is wel
de verkeerde regel om het kleinst te zetten.

---

# Fout of smaak

## Fout — gerepareerd vandaag

| Wat | Waar | Status |
|---|---|---|
| `11.285714285714286 / 11` in de datumkalender | `/studio`, `/nl/studio` | Nu `11 / 11`, met test |
| "Wie is eigenaar" gaf een gebruiksrecht op een eigendomsvraag, terwijl `/terms` §6 een exclusieve licentie én een kosteloze akte belooft | FAQ, beide talen | Herschreven |
| `.pijl` = 18px raakvlak, geen link-in-een-zin | hele site, 390px | 24px via `::before` |
| Vijf `..` in de orderbevestigingsmail | e-mail, beide talen | `clause()`, met test over 38 samengestelde mails |

## Smaak — jouw keuze

**1 · De afstand tot de eerste handeling.** Dit is de grootste, en het is een
structuurkeuze en geen bug. Drie plekken:

- `/test-sample` — eerste veld op 3991px (telefoon) van 9241px. Vijf schermen
  tot de proef van één euro. Voorstel: een tweede "Bestel de proef"-knop direct
  onder de kop, die naar het formulier springt.
- `/plans` — 137 woorden boven de vouw op een telefoon, geen prijs (€390 staat
  op 1050px) en geen knop (1128px). Wie op de abonnementenpagina komt, wil
  weten wat het kost. Voorstel: de drie prijzen naar boven.
- `/lifestyle` is 15861px op een telefoon (19 schermen), `/catalog` 14172px.
  Dat is niet per se te lang — het is goede tekst — maar er is nergens een weg
  terug naar boven.

**2 · Engels in de Nederlandse tekst.** *dashboard, output, account, batch,
upload, download*. Productnamen (Catalogset, Lifestyle-carousel, Videoclip)
horen te blijven; deze zes zijn geen productnamen. `/nl/how-it-works` en
`/nl/faq` zijn de dichtste plekken.

**3 · "Past bij" op 11,5px** op de twee belangrijkste dienstpagina's.

**4 · De voorpagina zegt "campagne", niet "productfoto's".** Sterke kop,
abstract woord.

## Niet aangeraakt, met reden

- **De lange pagina's zelf.** Ze zijn lang omdat er iets te vertellen valt en
  het goed verteld wordt. Het probleem is niet de lengte maar dat de handeling
  onderaan ligt — dat los je op met een knop, niet met een schaar.
- **De 22 velden op `/test-sample`.** Er zijn er 2 verplicht. Het formulier is
  vriendelijker dan het eruitziet.
- **De inlogkaart op `/start/*`.** Duidelijk optioneel, met "Verder" eronder.
  Geen muur.
