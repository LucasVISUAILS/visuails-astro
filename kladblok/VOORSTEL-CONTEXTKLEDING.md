# Bijkleding — de styling zit erbij

Voorstel, 22 september 2026. **Derde versie. Vervangt die van 20 en 21 september.**

Lucas, over versie twee:

> *"De sleutel die je had voorgesteld snap ik maar is nog steeds niet helemaal
> handig omdat niet elk kledingstuk past op alle kleding die de klant dan
> doorstuurt. Ik wil dat je hier meer over na gaat denken alsof wij echt een
> fotografiestudio zijn maar we brengen in dit geval niet extra kosten in
> rekening. Het gaat om het aangeleverde product en dat word dan ook center of
> attention; de extra producten die het model dan draagt zijn puur toevoeging om
> de outfit wat meer gevoel te geven."*

---

## 0 · Waarom de "sleutel" van gisteren niet deugde

Ik stelde één merkvoorkeur voor: de klant kiest één keer *wit, zwart, denim of
beige*, en dat geldt voor al zijn bestellingen.

**Je bezwaar is dodelijk en ik heb er geen weerwoord op.** Een merkvoorkeur is
één laag te grof:

| Merk koos één keer | Stuurt vervolgens | Wat eruit komt |
|---|---|---|
| zwart | een zwarte hoodie | zwart op zwart — het silhouet verdwijnt |
| denim | een jeans | denim op denim |
| wit | een wit T-shirt | wit op wit |
| beige | een wollen pantalon | een pantalon met een T-shirt: verkeerd register |

**De tegenhanger is een functie van het PRODUCT, niet van het merk.** Daarmee valt
elke oplossing af waarin de klant één keer iets kiest — en dat is de hele
denkrichting van de vorige twee versies. Die is hierbij ingetrokken.

Twee versies lang heb ik naar het verkeerde probleem gekeken. De vraag was
steeds *"hoe geven we de klant controle"*, en jouw zin hierboven zegt dat het
die vraag niet is.

---

## 1 · Het juiste uitgangspunt: wij zijn de stylist

Bij een echte studio kiest de klant de tegenhanger **niet**. Die vraag wordt hem
nooit gesteld. De stylist staat bij het rek, kijkt naar het stuk dat er die dag
ligt, en trekt er iets bij dat dát stuk goed laat staan. Het is vakwerk, geen
voorkeur, en het gebeurt per kledingstuk.

En zo staat het ook in de vakliteratuur. Uit een e-commerce-handleiding voor
studiofotografie:

> *"Secondary items should enhance rather than compete — partial visibility of
> coordinating pieces works better than fully matching complete looks."*

Dat is exact jouw zin, in andere woorden: het aangeleverde product is het
onderwerp, de rest is er om het beeld te laten kloppen.

**De vraag verandert daarmee van:**

> ~~Hoe geven we de klant controle over de bijkleding?~~

**naar:**

> **Hoe nemen we per product een goede stylingbeslissing — en hoe laten we die
> zien vóór het beeld geleverd is?**

En er komt iets gratis bij dat een fysieke studio niet kan zeggen: **bij hen is
een stylist een dagtarief op de factuur; bij jou zit hij erbij.** Dat is een
verkoopargument dat nu nergens op de site staat, en het is waar.

---

## 2 · Regel nul: laat zo min mogelijk van de tegenhanger zien

Voordat er één kledingstuk gekozen wordt: **de uitsnede is je goedkoopste
stylinggereedschap en je gebruikt hem nu al.**

Een broekshot afgesneden op borsthoogte toont vijftien procent van een top. Een
sieradenshot toont een halslijn. Wat je niet ziet, kan niet fout zijn. Zalando's
eigen richtlijn staat dit expliciet toe — *"body cropping allowed as long as the
article remains recognizable"* — en het citaat hierboven zegt dat gedeeltelijke
zichtbaarheid juist bééter werkt dan een complete look.

Dus de volgorde is: **eerst wegsnijden, dan pas kiezen.** Dat staat al in
`garments.js` en het is de reden dat er maar drie plekken zijn in plaats van
veertien.

---

## 3 · Hoe een stylist trekt: zes regels, allemaal uit het product zelf

Dit is de kern van dit voorstel. Zes regels, en het mooie is: **ze zijn allemaal
af te leiden uit het product dat de klant net heeft geüpload.** Er hoeft niets
gevraagd te worden, want de foto's vertellen het al — net zoals de stylist het
aan het stuk aan het rek ziet.

**1 · Toonverschil. Het silhouet moet loskomen.**
De tegenhanger heeft altijd een andere toon dan het product. Zwarte hoodie →
lichte broek. Wit shirt → middendonkere of donkere broek. Zonder toonverschil
verliest het product zijn vorm, en de vorm is precies waarvoor een catalogbeeld
bestaat. Dit is regel één omdat alle andere er niets toe doen als deze faalt.

**2 · Volume tegen volume.**
Ruim met strak. Zalando's richtlijn zegt het letterlijk: *"combine wide-cut tops
with slim trousers and vice versa."* Een wijde hoodie krijgt een smallere broek;
een wide-leg jeans krijgt een aansluitende top. Twee keer ruim is één blob
waarin het product niet meer te vinden is.

**3 · Hetzelfde register.**
Een wollen pantalon krijgt geen hoodie. Een nylon trainingsbroek krijgt geen
overhemd. Verschil in register leest niet als styling maar als een vergissing —
en dan kijkt de klant naar de fout in plaats van naar zijn product.

**4 · Kleur is neutraal TEN OPZICHTE VAN het product.**
Heeft het product kleur, dan is de tegenhanger kleurloos: wit, zwart, grijs,
ecru. Is het product zelf kleurloos, dan mag de tegenhanger een greintje warmte
dragen (ecru, gewassen denim) zodat het beeld niet dood is. Nooit twee kleuren
die om aandacht vragen.

**5 · Nooit concurreren.**
Geen print, geen logo, geen opvallend beslag, geen textuur die harder praat dan
het product. Dit is precies wat de koffer van een echte stylist bevat — de
standaardlijst is *"a selection of nude, black and white"* hemdjes en hosiery,
allemaal ongemerkt en allemaal bedoeld om niet gezien te worden. Saai is hier
het vak.

**6 · Materiaal en seizoen kloppen.**
Geen wollen jas over een linnen hemdje. Geen zomershort op een zware bergschoen.
Het beeld moet één dag kunnen zijn.

**Merk op wat er NIET in staat:** de smaak van het merk, de smaak van de klant,
en de mijne. Alle zes gaan ze over het stuk dat er ligt.

---

## 4 · Het rek

De zes regels hebben iets nodig om uit te trekken. Dat is een **rek**: een
kleine, vaste verzameling neutrale stukken die jij één keer maakt en die per
stuk getagd is op de assen uit §3.

```
per plek        toon               volume      register
──────────────────────────────────────────────────────────────
TOP             licht / mid / donker   strak / ruim   casual / net
BROEK           licht / mid / donker   strak / ruim   casual / net
SCHOEN          licht / donker         —              casual / net
```

Drie plekken × drie tonen × twee volumes × twee registers is in theorie 36,
maar dat hoeft niet: **twaalf tot vijftien stuks dekt vrijwel alles**, omdat een
schoen geen volume-as heeft en "net" bij de meeste merken zelden voorkomt. Begin
met acht en vul aan waar je merkt dat er niets past.

Het rek is geen keuzelijst voor de klant. **Hij ziet hem nooit.** Hij is jouw
koffer.

---

## 5 · Wat de klant ziet: een uitkomst, geen vraag

Geen tab, geen keuzelijst, geen garderobe. Op de productkaart één regel die het
ANTWOORD toont — en dat antwoord is per product anders, want de zes regels zijn
per product toegepast:

```
Zwarte hoodie · oversized
   Styling  licht grijze broek, recht model · witte sneaker       aanpassen

Wide-leg jeans · washed
   Styling  aansluitend wit T-shirt · lage zwarte schoen          aanpassen
```

Dit is wat jouw oorspronkelijke zorg oplost — *"hij krijgt mijn mening"* — en het
lost hem beter op dan een keuzelijst. Een keuzelijst vraagt de klant om jouw werk
te doen. Een zichtbare uitkomst laat hem er ja of nee tegen zeggen, wat het enige
is dat hij echt wil.

### Als hij toch iets wil: drie assen, geen stukken

Klikt hij "aanpassen", dan krijgt hij géén rek te zien. Hij krijgt de drie
dingen die een merkeigenaar op de set tegen een stylist zou zeggen:

```
    Liever lichter    ·    zo laten    ·    Liever donkerder
    Liever strakker   ·    zo laten    ·    Liever ruimer
    Schoenen in beeld ·    zonder schoenen / blote voeten
```

**Waarom assen en geen stukken.** Niemand zegt tegen een stylist "geef me stuk
nummer vier". Iedereen zegt "kan het iets donkerder eronder". De as is een zin
die elke merkeigenaar kan uitspreken zonder jouw rek te kennen, en hij werkt op
élk product — ook op eentje dat nog niet bestond toen je het rek maakte. Een
keuzelijst met foto's veroudert; een as niet.

En heel belangrijk: **hij hoeft nooit iets te kiezen.** "Zo laten" staat er al.

### En helemaal onderaan, klein

`Ik stuur er zelf iets bij` — voor het streetwearmerk met een signatuurshirt. Dit
blijft bestaan, maar het is geen functie meer waar het ontwerp omheen gebouwd
is. Het is de laatste deur, en hij wordt nooit gevraagd.

---

## 6 · De uitzondering: merken zonder kleding

Een tas, een sieraad, een horloge. De uitsnede is de hele figuur en **alle drie
de plekken staan open** — je kleedt het model volledig aan. Daar is geen
"tegenhanger" maar een **hele outfit**, en een outfit heeft een wereld.

Dit is de enige plek waar een merkvraag wél klopt, en dan niet over kleur maar
over waar hun klant die tas draagt:

> **Waar draagt jullie klant dit?**
> ▸ Werk  ▸ Stad  ▸ Avond  ▸ Weekend

Vier werelden, één keer, bij het merkmodel. Voor een tassenmerk ís dat de
positionering — wat het model draagt, zegt voor wie de tas is — en het is een
vraag die ze zonder nadenken kunnen beantwoorden, want ze beantwoorden hem elke
dag in hun marketing.

De zes regels blijven er bovenop werken: binnen "Stad" kiest regel 1 nog steeds
een toon die de tas laat loskomen.

**Waarom dit niet in tegenspraak is met §0:** daar viel de merkvoorkeur om omdat
hij per PRODUCT verkeerd uitpakt. Hier is er geen product om tegenaan te botsen —
de klant lévert geen kleding — dus kan er ook niets botsen.

---

## 7 · Waar dit echt moet landen: de werkmap

Zonder dit is alles hierboven decoratie. **De uitkomst van de zes regels moet als
tekst in de productie-opdracht staan**, per product, naast de rest:

```
product 7 · zwarte hoodie, oversized, katoen
uitsnede   heup en hoger
styling    broek: licht grijs, recht, casual   (regel 1: toonverschil,
                                                regel 2: ruim ↔ strak)
           schoen: niet in beeld
klant      geen aanpassing
```

Twee redenen: de persoon die het beeld maakt moet het lezen in plaats van zelf
verzinnen, en als er later iets misgaat is terug te vinden wélke regel hem daar
bracht. Dat is precies wat een stylingbrief bij een echte shoot ook doet.

---

## 8 · Wat hieraan mis kan gaan

- **Het rek is klein, dus beelden gaan rijmen.** Tien klanten met een zwarte
  hoodie krijgen dezelfde lichtgrijze broek. Dit is het echte risico en je
  ontkomt er niet aan met acht stuks. Tegenmaat: meerdere varianten per vakje en
  rouleren, en accepteren dat een onzichtbare tegenhanger mág rijmen — dat is
  waarom hij onzichtbaar moet zijn.
- **De zes regels moeten iets over het product weten.** Toon, volume, register
  en materiaal — vier dingen die uit de aangeleverde foto's gelezen moeten
  worden. Lukt dat automatisch niet betrouwbaar, dan is het een handeling in de
  productie en geen systeem. **Toets dit eerst op tien echte bestellingen voordat
  je er iets omheen bouwt.**
- **"Aanpassen" kan alsnog verkeerd uitpakken.** Vraagt iemand "liever donkerder"
  bij een zwart product, dan botst zijn wens met regel 1. Dat moet de as
  weigeren, met een zin erbij: *"donkerder kan hier niet — dan verdwijnt de vorm
  van je hoodie. We houden het op licht grijs."* Eerlijk en kort, en het laat
  zien dat er een vakman achter zit.
- **Het is werk dat de klant niet ziet.** Je bouwt een rek en zes regels voor
  iets wat bij goed gebruik niemand opvalt. Dat voelt als verkeerd geïnvesteerd,
  tot de eerste keer dat iemand een zwarte broek onder een zwarte hoodie krijgt.

---

## 9 · Volgorde

| | Wat | Waarom | Grootte |
|---|---|---|---|
| **1** | De zes regels opschrijven in `garments.js` en publiceren op de site | Het is de belofte, en het is alleen tekst. Levert meteen de verkoopzin op: *"de styling zit erbij"* | een halve dag |
| **2** | De contextvraag aanzetten bij catalog | Jouw broek-met-shirt-voorbeeld is een catalog on-model shot, en daar gebeurt nu niets | één regel |
| **3** | Het rek maken — acht stuks, getagd | Zonder rek zijn de regels theorie | een dag + beeld |
| **4** | De stylingregel op de productkaart tonen | De uitkomst zichtbaar vóór het beeld bestaat | een halve dag |
| **5** | De drie assen ("aanpassen") | Pas als je uit de proeven weet welke as mensen missen | een dag |

Stap 1 en 2 samen zijn een halve dag, en stap 1 is de enige die je meteen ook
kunt verkopen.

---

## 10 · Eén zin voor op de site

Omdat dit nu een dienst is in plaats van een detail, verdient het een regel waar
de klant hem leest — bij de stijlen, of onder het bestelformulier:

> **De styling zit erbij.** Je product is het onderwerp; wat het model er verder
> bij draagt kiezen wij, per stuk, zo dat jouw product loskomt en niets ermee
> concurreert. Effen, ongemerkt, nooit met een logo. Een fotostudio rekent
> hiervoor een stylist per dag; bij ons staat het gewoon in de prijs.

---

## 11 · Het poppetje — eerlijk beoordeeld

Lucas, 22 september:

> *"Wellicht kan je een soort systeem creëren waarbij de klant zijn productsoort
> kiest zoals 'hoodie' en dan mogelijke extra kledingstukken kan toevoegen zoals
> broek licht zichtbaar (hier zie je dan ook een soort getekend poppetje van wat
> er op de foto zichtbaar wordt bij een on-model shot en wat je kan toevoegen als
> je dat wilt, anders bedenken wij kleding die erbij past, dus dit blijft volledig
> vrijblijvend en optioneel), pet, ketting/oorbellen en t-shirt onder de hoodie.
> Wanneer de klant dan op het juiste vak een foto van de broek toevoegt kleurt de
> broek op het poppetje."*

**Kort: de tekening is een goed idee, de lege vakjes zijn dat niet. Zelfde
tekening, andere begintoestand, en dan klopt het.**

### Wat eraan deugt — vier dingen, en ze zijn geen van alle klein

**1 · Het lost het uitlegprobleem op dat je zelf aanwees.**
*"Als een t-shirt wordt aangeleverd zie je de schoenen niet."* Dat in woorden
uitleggen kost een alinea per producttype; een tekening met de uitsnede erop
kost nul lezen. Dit is het sterkste argument vóór en het is de reden dat de rest
van dit hoofdstuk over de tekening gaat en niet over of hij er moet komen.

**2 · Een leeg vak leest anders dan een leeg formulierveld.**
Een invoerveld zegt "vul mij in". Een plek op een tekening zegt "hier zou iets
kunnen". Dat verschil is echt en het past bij je eis dat het vrijblijvend blijft.

**3 · Het inkleuren is goede terugkoppeling.**
De klant ziet meteen dat zijn broekfoto op de goede plek is beland. Dat vangt een
bestaande faalkans af: een losse contextfoto die in de werkmap niet van een
productfoto te onderscheiden is (zie `CONTEXT_UPLOAD_PREFIX`).

**4 · Het is het huisidioom en het staat er al.**
`ShotDiagram.astro` is precies dit: lijntekeningen van een kledingstuk, SVG, die
de inktkleur erven, leesbaar op 40px én op 200px. De noot erbij zegt waarom het
tekeningen zijn en geen foto's — *"these are instructions: here is what YOU
should send"* — en dat is exact de rol die jouw poppetje moet spelen. Er hoeft
geen nieuwe beeldtaal bij.

### Wat eraan niet deugt

**1 · Vier lege vakjes zijn een uitnodiging, geen optie.** ← het zwaarste bezwaar
Hoe vaak er ook "optioneel" boven staat: een tekening met vier holtes leest als
een onaf formulier. Visueel gewicht is de boodschap. En daarmee zet je precies
terug wat je twee berichten geleden wegstreepte — *"het idee met de klant meer te
laten leveren voelt voor mij niet goed"* — alleen mooier verpakt.

**2 · Honderd keer dezelfde uitleg.**
Dit staat letterlijk in je eigen codebase, bovenaan `ProductUploader.astro`:

> *"Four shots × 25 products is a hundred slots, and a slot that explains itself
> is four explanations printed a hundred times. That is Lucas's standing
> complaint about this site — 'soms wordt het te veel' — arriving as a
> hundredfold."*

De oplossing die daar gekozen is, is de goede: **de tekeningen staan ÉÉN KEER
bovenaan de stap, en in een kaart is een vakje alleen nog een tekeningetje plus
een woord.** *"The diagram is the index into an explanation given once."* Een
poppetje per productkaart is dat probleem opnieuw, bij dertig producten.

**3 · De tekening en de data kunnen uit elkaar lopen.**
Er zijn acht uitsnedes in `garments.js`. Acht handgetekende poppetjes die elk
apart bijgewerkt moeten worden als er een producttype bij komt, is precies het
soort bedrading dat stil verkeerd gaat staan. **De tekening moet uit `CROPS` en
`contextSlots()` volgen, niet ernaast staan.** Eén poppetje, waarvan de zichtbare
delen door de uitsnede worden bepaald.

**4 · Een pet is geen context maar een styling-ingreep.**
Van de vier plekken die je noemt is er één die uit de toon valt. Een broek aan de
rand van het beeld verandert niets aan de lading van de foto; een pet verandert
het register van het hele beeld. Dat is niet "iets meer gevoel geven", dat is
regie — en het schuurt tegen de grens met de outfitshot die in `garments.js`
staat. Een pet mag, maar hij hoort niet in hetzelfde rijtje als de rest.

### De versie die ik wél zou bouwen

**Precies dezelfde tekening, maar hij begint VOL.**

De zes regels uit §3 hebben de styling al gekozen. Het poppetje toont die keuze
in plaats van gaten:

```
       ┌─ pet          — geen
   ●───┤
  ╱│╲  ├─ hoodie       — JOUW PRODUCT
       ├─ t-shirt eronder — wit, effen
  ╱ ╲  └─ broek        — licht grijs, recht model
```

Zelfde tekening, zelfde interactie, omgekeerde boodschap. Geen "vul in" maar
"dit krijg je" — en elk ingekleurd deel is aanklikbaar als hij het anders wil.
Daarmee blijft §1 overeind (wij zijn de stylist) én krijg je alles wat jouw idee
goed maakt: de uitsnede wordt getoond in plaats van uitgelegd, en wat hij
verandert kleurt mee.

En volgens het patroon dat er al staat: **het poppetje staat één keer bovenaan
de stap**, groot, met de uitleg eromheen. Op de kaart zelf staat de uitkomst als
regel (§5), met eventueel het poppetje op 40px ernaast als index. Niet dertig
poppetjes.

### Drie plekken erbij, en één die je moet laten

Je noemt vier plekken voor een hoodie. Nagelopen tegen de uitsnede `upper`
(heup en hoger, gezicht in beeld):

| Plek | Zichtbaar bij een hoodie? | Oordeel |
|---|---|---|
| **Broek** | de tailleband, onderrand van het beeld | **Ja** — staat er al |
| **T-shirt eronder** | kraag en zoom | **Toevoegen.** Dit is een nieuw soort plek: een LAAG en geen buurman. Hij staat niet in `CONTEXT_SLOTS` en hij hoort er wel in |
| **Oorbellen** | ja, gezicht is in beeld | **Toevoegen.** Klein, zichtbaar, verandert niets aan de lading |
| **Ketting** | onder een capuchon nauwelijks | **Niet aanbieden.** Een plek waarvan het antwoord onzichtbaar is, is een vraag die je niet stelt — dezelfde regel die `garments.js` al toepast op de modelvraag |
| **Pet** | zeer zichtbaar | **Ja, maar apart.** Zie hierboven: dit is regie, geen context |

Daaruit volgt een scherpere regel dan "staat het in beeld", en hij komt uit jouw
eigen woorden — je schreef *"broek licht zichtbaar"*, en dat is al denken in
gradaties:

> **Drie niveaus van zichtbaarheid, en alleen het middelste wordt aangeboden.**
> · **Draagt het beeld** — het product zelf. Geen keuze.
> · **Randje in beeld** — broek, schoen, zoom, kraag, oorbel. Hier mag een
>   voorkeur, want het is zichtbaar genoeg om op te vallen en klein genoeg om
>   niets te verpesten.
> · **Nauwelijks zichtbaar** — de ketting onder de capuchon. Niet aanbieden.

### Wat ik zou doen

1. **Het poppetje eerst als UITLEG bouwen** — één tekening, afgeleid uit `CROPS`,
   bovenaan de stap en op /how-it-works. Dat is het goedkoopste deel en het lost
   het probleem op dat je zelf het lastigst noemde.
2. **Pas interactief maken als de zes regels uit §3 bestaan.** Een poppetje met
   lege vakjes en geen stylingsysteem erachter is een formulier met plaatjes.
3. **`underlayer` en `earrings` toevoegen** aan `CONTEXT_SLOTS`, en de pet als
   apart geval behandelen.

---

## 12 · De stylingpagina aan het eind — dit is de beste versie tot nu toe

Lucas, 22 september:

> *"Wat als je nou op het einde van het product invullen een pagina weergeeft met
> de optie om bij sommige producten of alle producten in 1x een bijpassende outfit
> toe te passen met foto's van de klant. De klant mag eventueel ook producten van
> andere bedrijven/merken gebruiken (als dit mag), wel bewerken wij het product
> dan zo dat er geen ander logo of merknaam van dat kledingstuk in beeld komt."*

**Dit is de goede vorm, en hij lost drie dingen tegelijk op die de vorige versies
elk apart lieten liggen.**

### Waarom dit wél werkt waar "één merkvoorkeur" niet werkte

Jouw bezwaar tegen de merkvoorkeur was: *"niet elk kledingstuk past op alle
kleding die de klant dan doorstuurt."* Dat bezwaar raakt deze vorm niet, en het
verschil is het **moment**:

| | Merkvoorkeur (ingetrokken) | Deze pagina |
|---|---|---|
| Wanneer | één keer, vóór er producten zijn | aan het eind, mét alle producten in beeld |
| Waarop | alles, voor altijd | een **selectie** die de klant zelf maakt |
| Kan hij zien wat het raakt? | nee | ja, hij kijkt naar de lijst |

Een merk met acht hoodies en vier broeken kan hier zeggen: *deze acht krijgen dit
shirt, die vier laat ik aan jullie.* Dat is per product juist, zonder per product
werk. Precies het gat tussen mijn twee vorige voorstellen.

### En waarom het je eerdere bezwaar níét terugbrengt

*"Het idee met de klant meer te laten leveren voelt voor mij niet goed."* Dat
blijft staan, en deze pagina houdt zich eraan op drie punten:

- **Hij staat aan het EIND.** Wie doorklikt heeft niets gemist; de styling is dan
  al gekozen door ons.
- **Het is één upload voor twaalf beelden** in plaats van twaalf uploads. De
  verhouding tussen moeite en opbrengst kantelt volledig.
- **Er staat geen leeg vakje op een productkaart.** De kaart blijft wat hij in §5
  is: een uitkomst.

### Waar hij moet staan — en waar níét

**Niet als zesde stap.** De rail is nu `Bestelling · Materiaal · Jouw gegevens ·
Levertijd · Betalen`, en de noot bij die regel in `OrderFlow.astro` zegt precies
waarom dat telt:

> *"Dat is het punt waarop iemand afhaakt: niet omdat het veel is, maar omdat het
> MEER is dan aangekondigd. De rail is een belofte over wat er nog komt."*

Een zesde bolletje maakt het formulier voor iedereen langer, ook voor de negentig
procent die deze pagina overslaat. **Dus: onderaan stap 2, ná de productkaarten,
als een blok — niet als stap.** Hij staat er precies waar jij hem wilde (aan het
eind van het invullen), zonder de belofte te breken.

### Hoe het blok eruitziet

```
┌──────────────────────────────────────────────────────────────────────┐
│  ZELF IETS MEEGEVEN?                                      optioneel  │
│                                                                      │
│  We hebben voor elk product al iets gekozen. Wil je een eigen stuk    │
│  in beeld — je huisshirt, je eigen schoen — dan kan dat hier, voor    │
│  één product of voor allemaal tegelijk.                              │
│                                                                      │
│  ☐ alles selecteren                                                  │
│  ☑ 1 · Boxy hoodie · zwart        wit T-shirt · licht grijze broek   │
│  ☑ 2 · Boxy hoodie · ecru         zwart T-shirt · donkere broek      │
│  ☐ 3 · Wide-leg jeans · washed    wit T-shirt · lage zwarte schoen   │
│  …                                                                   │
│                                                                      │
│  Wat wil je meegeven?     [ top ▾ ]    [ foto kiezen ]               │
│                                                                      │
│              [ Toepassen op 2 producten ]                            │
└──────────────────────────────────────────────────────────────────────┘
```

Drie dingen die dit blok goed maken en die je er niet uit moet laten:

**1 · De regel per product staat er al bij.** Je kiest niet in het duister maar
tegen een zichtbaar alternatief. Dat maakt "laat maar" ook een echte keuze.

**2 · Na het toepassen komt er een controle terug.** Dit is de belangrijkste en
het is jouw eigen bezwaar, op ordeniveau:

> *Toegepast op 8 producten. Op 2 daarvan houden we onze eigen keuze aan: bij
> "Hoodie · wit" zou je witte shirt tegen het product wegvallen.*

Zonder die controle is bulk toepassen precies de fout waar je voor waarschuwde —
één shirt onder twaalf producten waarvan er twee wit zijn. **Mét die controle is
het het tegenovergestelde: het laat zien dat er een vakman meekijkt.** Eén zin, en
hij verkoopt het hele systeem.

**3 · Wat hij meegeeft, wordt bewaard.** Een merk dat zijn huisshirt één keer
aanlevert, wil hem volgende bestelling weer. Sla het op bij het account als
*"jouw vaste stukken"* en het is bij bestelling twee één klik. Dit is de goede
versie van wat ik in versie twee fout deed: geen abstracte kleurvoorkeur, maar een
concreet stuk dat ze zelf hebben aangewezen.

### Het logo weghalen — doe dit altijd, niet op verzoek

Je schrijft *"wel bewerken wij het product dan zo dat er geen ander logo of
merknaam in beeld komt."* **Maak daar geen dienstverlening van maar een
huisregel**, om drie redenen:

- Het scheelt de klant een beslissing.
- Het beschermt jou. Een logo van een concurrent in de catalogusfoto van je klant
  is een probleem van je klant, en jij zou degene zijn die het erin zette.
- Het is een verkoopzin: **"wat je ook meestuurt, er staat maar één merk op de
  foto: dat van jou."**

Bij een fysieke studio plakt de stylist zulke logo's af met tape, en dat is altijd
te zien. Jij haalt ze gewoon weg. Dat is een van die plekken waar het geen
compromis is dat je genereert in plaats van fotografeert.

### De juridische kant, eerlijk en zonder jurist te spelen

Ik ben geen jurist en dit is geen juridisch advies; als dit een functie wordt die
echt gebruikt gaat worden, is het twintig minuten met iemand die het wel is waard.
De vorm van het probleem is wel te schetsen, en het valt uiteen in **twee dingen
die vaak door elkaar lopen:**

**1 · Een kledingstuk van een ander merk in beeld.** Een voorwerp afbeelden dat je
bezit, is op zichzelf geen inbreuk; het gebeurt in elke modefoto. Het logo
weghalen maakt dat niet slechter maar **beter**: geen merkgebruik, geen
gesuggereerd verband tussen de twee merken. Dat is ook precies waarom stylisten op
de set afplakken.

**2 · De FOTO van dat kledingstuk.** Hier zit het echte risico, en het gaat niet
over het merk maar over het beeld. Maakt de klant zelf een foto van zijn eigen
shirt: prima. Trekt hij een productfoto van de webshop van dat merk: dan gebruikt
hij andermans foto, en dat is auteursrecht.

Daarom hoort er bij dat uploadvakje één instructie te staan — geen kleine letter
maar de opdracht zelf:

> **Een foto die je zelf hebt gemaakt, van een stuk dat je in huis hebt.**

`/terms` §5 legt die verantwoordelijkheid al bij de klant (*"material you did not
have the rights to"*), dus juridisch sta je goed; wat ontbreekt is dat je het
zegt op het moment dat het ertoe doet.

### Wat hieraan mis kan gaan

- **Het is een blok dat de meeste mensen overslaan, en dat moet ook.** Wordt het
  te aanwezig, dan leest stap 2 alsnog als onaf. Dicht beginnen, één regel, en
  pas openklappen als iemand erop klikt.
- **Eén slechte foto raakt nu twaalf beelden in plaats van één.** De schaal die
  het blok efficiënt maakt, werkt ook de verkeerde kant op. Dus: na het uploaden
  meteen tonen wat je ziet, en bij een onbruikbare foto het meteen zeggen — niet
  pas bij de proef.
- **"Toepassen op alles" verleidt tot toepassen op alles.** De controle uit punt 2
  is niet optioneel; zonder die zin is deze functie netto schadelijk.
- **Bewaarde stukken verouderen.** Een huisshirt van vorig seizoen staat er over
  een jaar nog. Bij elke nieuwe bestelling één regel: *"nog steeds dit shirt?"*

### Waar dit het vorige hoofdstuk vervangt, en waar niet

Het poppetje uit §11 blijft: dat is de UITLEG, bovenaan stap 2. De stylingregel op
de kaart uit §5 blijft: dat is de UITKOMST. Wat dit blok vervangt, is het
"aanpassen"-paneel mét zijn drie assen op elke kaart — die kunnen weg, want:

- een eigen stuk meegeven gaat hier beter (in bulk, aan het eind, met de lijst
  erbij);
- en de nudge "iets donkerder" hoort eigenlijk bij de proef, niet bij het
  bestellen — op dat moment heeft de klant iets om naar te kijken.

Dat is netto **minder** interface dan versie drie, en dat is precies de goede
richting.

---

## 13 · Het overzichtscherm, uitgetekend

Proef: `kladblok/kledingproef/overzicht.html`. Lucas' specificatie:

> *"Ik wil het scherm (dat overigens ook simpelweg overgeslagen kan worden) denk
> ik als een soort overzicht maken van wat de klant allemaal heeft opgestuurd, en
> hij kan per product dus nog producten toevoegen (het verschil tussen
> hoofdproduct en extra kleding moet dan ook heel duidelijk zichtbaar zijn). Ik
> denk dat ik ook de klant zijn productsoort wil laten kiezen (misschien met een
> knop om alvast op alle producten toe te passen)."*

**Drie ontwerpbeslissingen die ik anders heb ingevuld dan je ze schreef, en
waarom.**

### 1 · Het producttype is al toegepast, er is geen knop

Je noemde *"misschien met een knop om alvast op alle producten toe te passen"*.
In de proef staat er geen knop maar staat het er al: je kiest bovenaan één soort
en de regel ernaast zegt `✓ toegepast op alle 12 · per product aan te passen`.

Reden: een merk stuurt meestal twaalf keer hetzelfde soort. Een knop maakt van het
normale geval een handeling en van het uitzonderlijke geval twee. Zo is het
normale geval één handeling (kiezen) en het uitzonderlijke twee (kiezen, dan bij
één rij afwijken). En het is meteen zichtbaar dat het overal geldt, wat een knop
pas ná het indrukken vertelt.

### 2 · Geen groen — drie tinten inkt

Je schreef *"dan wordt de broek op het poppetje een groene kleur of een andere
bijpassende kleur."* Het probleem dat je aanwijst is echt; de oplossing zou ik
anders doen, om twee redenen, en de proef zet ze naast elkaar zodat je het zelf
kunt zien.

**De drie waarden staan in een VOLGORDE.** Hoofdproduct → door jou erbij → door
ons. Dat is een rangorde, en een rangorde lees je aan gewicht af, niet aan kleur.
Zwart, half en licht zeggen die volgorde vanzelf; groen zegt alleen "anders" en
laat de lezer zoeken waar het in de rij thuishoort. Dit is geen schemaregel maar
de grondregel van elke datavisualisatie: geordende waarden krijgen een
waardenreeks, ongeordende krijgen tinten.

**En groen is een zesde kleur.** Het schema heeft violet voor actie en vijf
statuskleuren. Een groen dat alleen in deze tekening voorkomt betekent verder
niets — en op dit scherm staat het twaalf keer, wat méér gekleurd oppervlak is dan
de enige knop.

**Wat het verschil wél draagt: vier signalen, en geen ervan is kleur.**

| Signaal | Jouw product | Erbij gezet | Door ons |
|---|---|---|---|
| Vulling in de tekening | zwart | half (45%) | licht (13%) |
| Duimpje | 48px, vierkant, zwarte rand van 2px | 38px, **rond**, halve rand | — |
| Opschrift links | JOUW PRODUCT | ERBIJ ZETTEN | WIJ KIEZEN |
| Wat het kost | het tarief | niets | niets |

Wie snel kijkt ziet het aan de vulling; wie twijfelt leest het opschrift. Het
rond-tegen-vierkant is de sterkste van de vier op een klein scherm.

### 3 · In een rij verdwijnt de doezellaag

De grote tekening bovenaan (§11) doezelt alles buiten de uitsnede weg — dat is
daar de uitleg. Op 64px doet diezelfde laag het tegenovergestelde: hij trekt
zwart, half en licht allemaal naar dezelfde lichte waarde, en dan is er niets meer
te onderscheiden. In een rij blijft het kader dus staan als lijn en gaat de
vulling eraf. Dezelfde tekening, twee maten, twee instellingen.

### Wat er gebeurt als je iets toevoegt

Drie dingen tegelijk, en dat is wat het scherm zijn terugkoppeling geeft:

1. Het stuk op het poppetje gaat van licht naar half — van ons naar van jou.
2. Het vakje `+ top` wordt een rond duimpje met de naam en een kruisje.
3. De regel **wij kiezen** wordt korter: het T-shirt staat er niet meer in.

En waar een plek niet bestaat, staat hij er niet — niet uitgegrijsd maar afwezig,
met één regel eronder: *"Geen schoenvakje: bij een hoodie staan de schoenen niet
in beeld."* Dat is `contextSlots()` uit `garments.js`, zichtbaar gemaakt.

### Twee dingen die nog in de proef ontbreken

- **De controleregel staat er wel, maar hij is nog tekst.** *"Op 2 van de 12
  producten houden we onze eigen keuze aan."* Daar hoort een uitklap bij die zegt
  wélke twee, anders is het een bewering zonder bewijs.
- **Wat je erbij zet zou bewaard moeten worden** bij het account ("jouw vaste
  stukken"), zodat bestelling twee één klik is. Zit nog niet in de tekening.
