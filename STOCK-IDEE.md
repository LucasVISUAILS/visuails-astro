# Maandelijkse beeldendrop bij het abonnement — een idee voor later

> **De naam is Editions, en hij staat sinds 18 augustus 2026 op de site.**
> Aangekondigd zoals Hooks: een strook onder de vier diensttegels met een
> uitgeschakelde knop en het label "nog niet klaar", plus een menu-item zonder
> link. Er staat geen prijs bij en er wordt niets beloofd wat hieronder nog
> open is.
>
> **Waarom dat woord.** Een editie is een oplage: een set die in één keer
> gemaakt is, gedateerd, voor deze maand. Dat is per definitie maandelijks, het
> zegt *gemaakt* in plaats van *geoogst*, en het staat in dezelfde taal als de
> rest van de site — de drukkerij en de kleurproef. Het woord "stock" komt er
> met opzet niet in; §2 hieronder legt uit waarom dat de vergelijking is die je
> verliest. Niet gekozen: *Drops* (botst met de wire-waarde `drop` in
> `ORDER_SERVICES`), *Library* (precies wat §6 verbiedt) en *Feed* (een
> platformwoord dat niet zegt wat je krijgt).
>
> **Wat de aankondiging al belooft, en dus vastligt.** Vier regels in het
> uitlegpaneel: dat er elke maand een set landt óók zonder nieuw product; dat
> hij op jouw kleurenschema, ondergrond en gezichten gemaakt is; dat er een
> goedkopere GEDEELDE variant is die ook naar andere merken gaat; en dat het
> één kaart in VISUAILS Studio wordt en geen tweede bibliotheek. Die vier zijn
> door `tests/nav.test.mjs` vastgezet — inclusief de eis dat het woord "stock"
> alleen ontkend mag vallen en nooit in de naam, de omschrijving of de knop.
>
> > ⚠ **GEZICHTEN ZIJN ER OP 20 AUGUSTUS 2026 UITGEHAALD.** De regel hierboven
> > zegt "op jouw kleurenschema, ondergrond en gezichten", en die derde klopt
> > niet meer. Lucas: het kiezen van modellen per set maakt het controlewerk zo
> > groot dat de prijs fors omhoog zou moeten, en juist die prijs wil hij laag
> > houden. De belofte staat sindsdien in `src/data/pricing.js` zonder gezichten
> > — zie de noot bij `STOCK_ON_BRAND` — en op de site is het nooit anders
> > gezegd. Dit statusblok liep dertien dagen achter; rechtgezet op 2 september
> > 2026, tegelijk met de bouw van /editions.
>
> **Wat nog open stond, staat hieronder in §5.** Drie van de vier zijn op
> 2 september 2026 beslist en die staan doorgestreept; wat er nog ligt is het
> capaciteitsgetal voor een on-brand set.

Lucas, 17 augustus 2026: *"exclusive subscription stock fotos die elke maand
toegevoegd worden, het zijn off-brand fotos die klanten zelf kunnen kiezen om te
posten zonder dat ze een bestelling hoeven te plaatsen. Ze kunnen ook voor
on-brand kiezen zodat ik fotos maak die bij hun feed passen door hun kleurenschema
te gebruiken. Soort van deathtostock.com idee."*

Niet gebouwd, niet ingepland. Dit bestand bestaat omdat een idee dat alleen in een
gesprek staat, weg is — en omdat er drie dingen aan zitten die je vóór het bouwen
moet weten en niet erna.

---

## 1 · Waarom dit anders is dan alles wat er nu staat

Elk product dat VISUAILS vandaag verkoopt, is op bestelling gemaakt. Catalogset,
lifestyle-carousel, clip, merkmodel: het tweede exemplaar kost net zoveel als het
eerste, want er gaat een reviewpas overheen. Dat is de reden dat `capacity.js`
bestaat en dat het abonnementsbudget op 30% van de begeleide maandcapaciteit is
gezet — de bovengrens van de hele onderneming is de aandacht van één persoon.

Een off-brand drop is het EERSTE dat die grens doorbreekt. Eén keer gemaakt,
onbeperkt geleverd: de dertigste abonnee kost er niets extra aan. Dat is
structureel iets anders dan een korting op volume, en het is de enige vorm op de
hele lijst waarbij omzet niet aan uren vastzit.

De on-brand variant doet dat NIET. Beelden die op het kleurenschema van één merk
zijn gemaakt, zijn per klant werk, en dus staat de aandachtsgrens er weer. Dat
betekent iets concreets voor het ontwerp: **on-brand hoort budget te verbruiken
zoals een product dat doet** (of een eigen capaciteitsgetal te krijgen), en
off-brand niet. Ze in één "inbegrepen" gooien is hoe de agenda stilletjes
overboekt raakt.

## 2 · Death to Stock is een ongelukkig voorbeeld, en dat is nuttig

Nagekeken op 17 augustus 2026. Wat ze vandaag zijn: $20 per maand voor een merk,
$69 voor een bureau, 15.000+ beelden met ~500 nieuwe per maand, onbeperkt
downloaden.

Twee dingen daaraan raken dit plan rechtstreeks:

**Hun hele positionering is anti-AI.** Ze zeggen het met zoveel woorden: *"made by
real creators, not AI."* Je zou dus het ding zijn waartegen zij zich afzetten. Hun
verhaal overnemen werkt niet — je kunt niet hun belofte doen met jouw methode.

**En op hun eigen terrein win je niet.** 15.000 beelden voor $20 per maand is een
prijs waar geen enkele losse maker tegenop kan. Als de off-brand drop het
hoofdgerecht is, concurreer je met een gevestigde partij op volume en prijs, en
dat is precies het gevecht dat een eenmanszaak niet moet zoeken.

**Maar de helft die zij structureel NIET kunnen, is de helft die jij wel kunt.**
Vijfhonderd beelden per maand maken die op het kleurenschema van één specifiek
merk zijn afgestemd, kan met echte fotografen niet uit. Met jouw methode wel. Dus:
**on-brand is de kop van dit idee en off-brand is de staart**, niet andersom. Dat
is de omkering die dit onderzoek oplevert.

## 3 · "Exclusief" en "stock" trekken aan elkaar

Death to Stock zegt dat hun makers exclusief zijn, niet dat hun beelden dat per
abonnee zijn — 15.000 beelden worden door alle leden gedeeld. Bij hen kan dat,
want hun leden zitten in verschillende branches.

Bij jou niet. **Jouw klanten zijn allemaal kledingmerken in e-commerce, en dus
elkaars concurrenten.** Twee abonnees die dezelfde drop-foto posten, is erger dan
twee willekeurige stockkopers die dat doen: die twee staan in dezelfde feed, voor
dezelfde koper. De waarde van een gedeeld beeld daalt naarmate je er meer van
verkoopt — het amortiseert niet, het doet het omgekeerde.

Je hebt dat probleem al twee keer opgelost en allebei de keren op dezelfde manier:

| | gedeeld, goedkoop, eerlijk gezegd | eigen, duurder, van hen |
|---|---|---|
| gezichten | de roster (`ModelPicker` vertelt dit met zoveel woorden) | het merkmodel |
| hooks | een format dat al bestaat | een format voor één merk |
| beelden | de off-brand drop | de on-brand drop |

De derde rij is dit idee, en hij is al ingevuld. Off-brand = gedeeld, en dat staat
erbij zoals het bij de roster erbij staat. On-brand = van hen alleen.

## 4 · Waarom dit het abonnement sterker maakt dan een korting dat doet

Het huidige abonnement heeft één zwakke maand: de maand waarin een merk niets
nieuws heeft. Geen nieuwe producten betekent niets te fotograferen, saldo dat
doorschuift, en een afschrijving die als een rekening voelt. Dat is precies de
maand waarin iemand opzegt.

Een drop landt ELKE maand, ongeacht of er iets te fotograferen viel. Dat is een
directer antwoord op wat je zelf als doel stelde — *"als dit wegvalt weet ik niet
meer wat ik moet posten"* — dan welke prijsprikkel dan ook. Een klant zonder
nieuwe collectie heeft dan nog steeds een reden dat het abonnement er is.

## 5 · Wat er beslist moet zijn vóór de eerste drop

> **DRIE VAN DE VIER ZIJN BESLIST — 2 september 2026.** Ze staan hieronder
> onveranderd, want de afweging is nog steeds waarom het besluit is wat het is.
> Wat er per punt uit gekomen is:
>
> · **De licentie.** Beslist zoals hieronder voorgesteld: wat je tijdens je
>   abonnement hebt gedownload, blijft van jou. Er is nu een TWEEDE
>   licentietekst voor gedeeld beeld (`gedeeldeLicentie()` in
>   `src/lib/scaffold.js`) en een eigen alinea in voorwaarden §8. Dat was geen
>   luxe: de bestaande tekst gaf op élke levering een EXCLUSIEVE licentie, en
>   §8 verbood met zoveel woorden dat wij geleverd beeld aan iemand anders
>   licentiëren. Twintig abonnees met een exclusieve licentie op dezelfde twintig
>   beelden is een tegenstrijdigheid waar elk van de twintig ons op kon
>   aanspreken.
>
> · **De gezichten.** Vervallen op 20 augustus — er komen er geen in. Zie het
>   statusblok bovenaan.
>
> · **De herkomstmarkering.** Beslist: merkneutraal beeld zonder product draagt
>   `trainedAlgorithmicMedia` ("door een model gemaakt") en niet de
>   `compositeWithTrainedAlgorithmicMedia` die een gewone levering draagt. Dat
>   verschil staat nu ook op /ai-act §6, die tot vandaag de zwakkere waarde voor
>   ÉLK bestand beloofde.
>
> · **Bij welk plan het hoort.** Beslist: off-brand bij alle drie, on-brand als
>   betaalde add-on bovenop elk plan — € 149 per maand na een eenmalige opzet
>   van € 295 (`AMOUNT.editions`). `ADVISORY` bestaat niet meer.
>
> **Wat er nog ligt:** het capaciteitsgetal. `KIND_IMAGES` heeft geen regel voor
> een on-brand set, en zonder gewicht kan de agenda er niet mee rekenen. Dat is
> te meten en niet te verzinnen, en het is de reden dat /editions vandaag geen
> bestelknop heeft.


**De licentie, en dan met name na opzegging.** Death to Stock eist dat je stopt met
gebruiken, met één uitzondering: wat al op social staat mag blijven staan mét
creditvermelding. Dat is te verdedigen en het is ook het soort voorwaarde dat
kwaad bloed zet — en handhaven kun je het niet. De eerlijke keuze is
waarschijnlijk: **wat je tijdens je abonnement hebt gedownload, blijft van jou.**
Dat maakt opzeggen minder eng, en dat is een nadeel; maar een voorwaarde die je
niet kunt afdwingen en die klanten boos maakt, is een slechtere ruil.

**Wat er met de gezichten gebeurt.** Een drop met een gezicht uit de gedeelde
roster zet datzelfde gezicht bij tientallen merken tegelijk, en veel zichtbaarder
dan een catalogfoto dat doet. De openheid die `ModelPicker.astro` nu geeft, is
daar geschreven voor één bestelling; bij een drop hoort dezelfde openheid luider.

**De herkomstmarkering.** `provenance.js` en de /ai-act-pagina gelden hier
onverkort, en bij beelden die tientallen merken doorgeven, is de keten langer dan
bij een bestelling die bij één klant blijft.

**Bij welk plan het hoort.** Off-brand kan bij alle drie, want het kost per abonnee
niets. On-brand kan dat niet — zie §1 — en hoort dus bij het duurste plan of bij
`ADVISORY`, waar het meedenken ook zit.

## 6 · Wat dit niet moet worden

Geen tweede bibliotheek naast de bestelstroom, met een eigen zoekfunctie, eigen
mappen en eigen rechtenbeheer. Dat is een tweede product en je hebt er één.

De goedkoopste vorm die het idee waarmaakt: **de drop van deze maand verschijnt als
een blok op `/account/plan`**, naast het saldo en de wachtrij, en downloaden gaat
via dezelfde weg als een geleverde bestelling. Dat is één kaart en één R2-pad,
geen nieuw systeem. Groeit het uit, dan is dat een besluit dat je neemt omdat het
werkt, en niet iets waar je vooraf voor bouwt.
