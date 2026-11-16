# Plan van aanpak · levering 100: zwart, wit, mint en het kaartveld

14 november 2026. Proef en keuzes: lijst 104 ("Het veld van de kaarten").

## 1 · Wat Lucas vroeg

> *"Ik wil iets als ovyonlabs waarbij de kleur echt minimaal is en de rest wit en zwart. Ik wil wel de kaarten met de kleuren
> gebruiken maar de website zelf heel simpel en 3 kleuren. Kaarten geven de rest van het gevoel, maken het af en geven de
> website beweging."* (01:59)

> *"Ik wil ook gebruik maken van het links rechts principe waarbij de ene sectie rechts staat en de ander links."* (01:59)

> *"Het blauwe uur gaat dan weg en ik wil wat varianten van mint groen die op elkaar aansluiten."* (01:59)

> *"Ik wil niet dat je het design van ovyon pakt maar de kleuren en rust."* (01:59)

> *"Het inkt wil ik dan ook wat meer richting zwart trekken maar niet pikzwart."* (02:04)

> *"Deze achtergrond bedoel ik als space, niet letterlijk … Gewoon een rustig gevoel, en alleen voor de kaarten hier en daar
> (bijvoorbeeld 1 euro kaarten)."* (02:12, met de logo-animatie 04:40 als voorbeeld)

> *"de kaarten zijn los van elkaar en ze lopen, volledig los van elkaar in elkaar over."* (02:14)

> *"laat de lijnen op elkaar over lopen per kaart. Dus daarom een grote kaart maken en de verticale rijen gebruiken per
> pagina zodat alle animaties smooth op elkaar overlopen."* (02:19)

> *"Nee ik wil niet dat elke achtergrond dezelfde kenmerken heeft, daarom wou ik dat je een grote kaart maakt met die
> kenmerken en daaruit allemaal kleine kaarten knipt en gebruikt als de achtergronden van die kaarten."* (02:33)

## 2 · De kleuren (KLEURENSCHEMA.md, levering 100)

### De site heeft drie kleuren

- **Wit `#FFFFFF`**: de grond, overal.
- **Zwart `#090D0B`**: alle tekst, de balk, het logo en de lijnknoppen.
  - Het oude inkt was `#0B0F17`, met een lichtheid van 17 % en een blauwe toon.
  - Het nieuwe zwart is iets zwarter (15 %), maar niet pikzwart, met een zweem van de kleurtoon van de mint.
  - Op wit haalt het 19,6 : 1.
- **Mint `#3DFFB0`**: alleen de knop die een bestelling begint (Bestellen, Start een bestelling, Probeer voor €1).
  - Er staat zwart op (15,0 : 1).
  - Onder de muis schuift `#1FEA9C` van links naar rechts (12,4 : 1).

**Afgeleid, geen nieuwe kleuren:**
- grijs `#5E6461` voor kleine tekst (6,1 : 1 op wit);
- lijn `#E7EAE8` voor scheiding;
- veldlijn `#8A908D` voor de rand van een invulveld (3,25 : 1);
- vlak `#F4F5F4` onder een pil of chip.

Elk van deze vier heeft de kleurtoon van het zwart.

### De mint-trap is alleen voor de kaarten

Alle tinten hebben dezelfde kleurtoon (163°). Ze lopen alleen op in licht en verzadiging, en sluiten daardoor op elkaar aan.

| naam | kleur | in de kaart |
|---|---|---|
| mint 950 | `#01140B` | de diepste nacht |
| mint 900 | `#002416` | de grond aan de lichte kant |
| mint 800 | `#023D29` | de brede vlakken |
| mint 700 | `#016645` | de gloed van de band; ook het logo op wit als het groen moet zijn (7,0 : 1) |
| mint 600 | `#11976A` | de rand van de band, de gloed na de druk |
| mint 500 | `#3DFFB0` | de gloed in de hoek (dezelfde als de knop) |
| mint 300 | `#9DF5D2` | de kern van de band, kleine tekst op de kaart (14,9 : 1 op mint 950) |
| mint 100 | `#E4FCEF` | het lichtste licht in de kern |

400 en 200 vallen af: naast 500 en 300 voegen ze niets toe.

### Wat weggaat

- **Blauw uur `#25508B`, blauw diep `#1A4279` en blauw licht `#80A7DD`.** Nergens meer, ook niet in het logo onder de muis.
  Het logo blijft zwart en wordt onder de muis mint 700 (een schommel van 3,6 s, zoals nu).
- **De gloed in de velden** (eerst roze, sinds levering 99 zacht mint) en alle oude velden (b1 tot p6, h1, c2, c4). Het
  kaartveld komt ervoor in de plaats.
- **De stukjes (posterkleur in het klein, levering 89).** Op wit met zwart en mint zijn ze niet meer nodig:
  - de lege fotoplek wordt vlak `#F4F5F4`;
  - "geleverd" wordt een zwarte pil met wit;
  - de initialen worden zwart op vlak.
- **De fotoblokken met glas (lijst 86).** De €1-kaart en het slot worden kaarten van het veld.
- **Het éne inktblok op 53° per pagina.** Dat vervangen de kaarten.

### Ook weg (14 november, 03:36 – 03:48)

- **De glazen platen** achter tekst (de fotoblokken, de Studiobrief, het slot). Op de donkere kaart is witte tekst zonder
  plaat goed leesbaar: gemeten minstens 7,5 : 1 op het lichtste punt.
- **Alle afgeknipte hoeken en elke snede van 53°:**
  - het €1-blok, het slot en de laatste plankaart;
  - de snede tussen twee knoppen naast elkaar, tussen de pijlknoppen, de documenten, de formaten, de filters en de
    sociale knoppen;
  - de keuzes in het bestelformulier.
  - Knoppen staan nu los naast elkaar, met 10 px ertussen, elk 8 px rond. Rijen die iets kiezen zijn pillen met 8 px
    ertussen, rondjes blijven rond.
  - Dit staat al in de werkkopie van levering 99 (`src/styles/zonder-snede-99.css`, en het eind van `hal.css`).

### Wat blijft

- **Wit als grond** en de foto's van Lucas als de kleur van de pagina.
- **De bovenbalk.** Die wordt zwart, met het witte woordmerk en mint Bestellen.
- **8 px hoeken** op knoppen, 18 px op kaarten.
- **De focusrand:** 2 px zwart op wit, 2 px mint op zwart en op een kaart.
- **Links:** zwart met een streep eronder; onder de muis een dikkere streep. Er komt geen gekleurde link.
- **Geselecteerde tekst:** mint 300 met zwart (15,3 : 1).
- **Statussen** (pil plus woord):
  - wacht: veldlijn;
  - bezig: vlak;
  - klaar: zwart met wit;
  - aandacht: mint 100 met mint 700 (6,5 : 1).
  - Een fout in een formulier blijft rood, met een woord erbij.

## 3 · Het kaartveld

### Het idee

- **Eén grote kaart per pagina**, zo breed als het scherm en zo hoog als de pagina. Op die kaart staan veel verschillende
  kenmerken door elkaar.
- **Elke kaart op de site is een stuk dat eruit geknipt is**, op de plek waar de kaart op de pagina staat. Daardoor heeft
  geen kaart dezelfde achtergrond: de ene heeft de band, de volgende een gloed, de derde een horizon, of alleen een rustig
  donker stuk.
- **Omdat het één kaart is, lopen ze in elkaar over.** Een lijn die onderaan uit de ene kaart loopt, loopt in de grote
  kaart door en komt verderop terug, en de beweging is overal dezelfde. De kaarten staan los: rechts, links, rechts.
- **Het gevoel is dat van de logo-animatie (04:40):** brede zachte vlakken, een band licht met een heldere rand, een gloed
  en korrel. Geen sterren, geen bolletjes, geen nevel.
- **Kaarten maken sommige dingen specialer** (Lucas, 03:03): *"De kaarten zijn bedoelt voor het specialer maken van sommige
  dingen. Een goed voorbeeld is het abonnement scherm … Hier is namelijk niet echt een specifieke foto voor dus moet het beeld
  een sfeerbeeld worden."*
  - Een kaart komt alleen waar geen eigen foto is en het om een dienst of moment gaat: een abonnement, je saldo, bedankt,
    je eerste bestelling, een eigen look die nog niet bestaat, of een plek die op een video wacht.
  - Waar een foto van Lucas of een productbeeld iets laat zien, blijft de foto.
  - Hoogstens drie kaarten per pagina, in Studio één per scherm.
  - **Lijst 105, ingevuld (03:35): alle 21 plekken "doen".**
    - Studio: abonnement zonder abonnement, je saldo, de eerste bestelling, je vaste look, inloggen en abonnement gestart.
    - Op elke pagina: de €1-kaart, het slot, de Studiobrief in de voet en de 404.
    - De pagina's: /plans (de kop én de drie plannen, elk een ander stuk van de grote kaart), /start/plan, /editions,
      /hooks, de clips op /video, /start/custom-look, de tegel Eigen look, /thank-you, /start Op maat en de poster op de
      voorpagina.
    - Mijn kanttekening: met de Studiobrief erbij staan er op de meeste pagina's drie tot vier kaarten. Daarom wordt de
      brief een lage, smalle kaart (een band van één regel hoog), zodat hij weinig weegt.
  - De rest van de site is wit.
- **Het logopakket** is geknipt uit dezelfde grote kaart: elk beeld (op het veld, bureaublad, telefoon, favicon) is een
  ander stuk.

### De kenmerken van de grote kaart

- **A · de grond:** zwart met brede, trage vlakken van mint 950, 900 en 800 (ruis op 1300 en 2100 px). Nergens een harde
  rand.
- **B · de band:**
  - één brede band licht die in een eigen ritme over de pagina slingert (golf van ~950 px), met een lichte en een donkere
    kant;
  - opbouw: een brede gloed van mint 700 (380 px), een heldere rand van mint 600 tot 300 (90 px) en een kern van mint 300
    tot 100 (28 px);
  - hij komt op en verdwijnt, dus niet elke kaart heeft hem.
- **C · de snede:** dunne lijnen langs 53,13° (de hoek van het merk), om de ~1600 px, in stukken: een kern van mint 300 met
  een gloed van mint 700.
- **D · de gloed:** zachte vlekken van mint 500 en 600, hoogstens één per vak van 800 px. Niet elk vak heeft er een, en
  elke vlek heeft een eigen maat (260 tot 580 px).
- **E · de horizon:** hier en daar een licht gebogen lijn van mint 300, met lichter erboven en donkerder eronder.
- **F · korrel:** grof, zoals in de logo-animatie, sterker in de middentonen.

### De kaarten zijn vooral zwart (Lucas, 04:28 en 04:42)

> *"Ik zat meer te denken aan zwarte achtergrond met mint dunne strepen met een soort fade het donkere maar de binnenkant van
> de strepen zijn heel strak en fel."* En eerder: meer kleurverschil, maar alleen zwart en groen.

- De grond is zwart #090D0B met donkergroene vlakken (mint 950, 900, 800). Elke kaart heeft een zacht groen licht in een
  hoek weg van de tekst en een diepere zwarte hoek ertegenover.
- De strepen zijn dun: een strakke, felle kern (mint 500 naar 100, 2 tot 2,5 px) met een gloed van mint 600 die zacht
  wegvaagt in het donker. Geen brede waas meer.

### De aderen (Lucas, 03:35 tot 05:29)

- **Elke kaart heeft minstens één eigen streep (G),** langs 53,13° of 126,87° (om en om), licht gebogen, door het rechterdeel
  van de kaart, weg van de tekst.
- **Waar een streep de rand kruist, loopt hij door in het wit als ader.** Alleen waar hij de rand echt kruist, niet waar hij
  er vlak langs loopt.
  - Hij gaat gewoon door in de lijn van zijn streep, even dik, zonder punt en zonder vork.
  - Buiten de kaart is hij twee dunne evenwijdige lijnen: de randen van de streep, met de binnenkant wit. Die witte
    binnenkant begint al een stukje in de kaart (16 px), zodat de kaart naar de rand toe al opengaat. Er zit geen rand van
    de kaart in de ader.
  - De ader loopt als geul tot 145 px de kaart in (06:07 en 06:29): wit aan de rand, en hoe verder in de kaart hoe dieper
    en donkerder (naar mint 900 en zwart), met een felle rand aan beide kanten en een schaduw ernaast die dieper sterker
    wordt. Onder tekst blijft de geul donker en de rand mint 700. De puls loopt door de hele ader, ook door het diepe stuk, en stopt aan het uiteinde buiten de kaart.
  - Hij vaagt heel geleidelijk weg in het wit, over 60 px (gekozen uit 36, 60 en 90: bij 36 zie je het geleidelijke niet,
    bij 90 worden het weer lange stralen tussen de kaarten).
- **De aderen bewegen niet.** Ze staan stil; alleen hun licht ademt (zie hieronder).

### Leesbaarheid

- **Het licht wijkt voor de tekst.** De shader kent de tekstvlakken (`data-tekstvlak`), met een zachte uitloop van 260 px:
  - de dunne strepen blijven zichtbaar, maar worden donkerder: hun kern mint 700 in plaats van fel mint (Lucas, 05:46:
    "De aderen op de kaart moeten wel gewoon zichtbaar blijven"), zodat een ader nooit uit het niets komt;
  - het zachte licht (gloed, brede band) blijft voor de helft.
- **Gemeten op de proef**, over de hele lus, op het lichtste punt onder de tekst (99,5 %): wit haalt minstens **8,8 : 1**
  op 1440 en **7,6 : 1** op 390 (gemeten 14 november, 06:45, met de strepen zichtbaar onder tekst). De eis is 4,5 : 1.

### Het ademen (16 s; lijst 104, vraag "lus") — vervangt de zwaartekracht-lus

> *"De aderen blijven continu op dezelfde plek staan maar ademen op de plek zelf"* (05:26); *"super traag en smooth"* (05:29).

- Niets beweegt letterlijk: geen val, geen druk, geen golf in de vorm. De lijnen, de band en de aderen staan stil.
- **De puls (06:06):** door elke harde lijn trekt rustig een elektrische puls van licht: de kern gaat heel geleidelijk van
  donker (mint 700/600) naar bijna wit en weer terug. Elke lijn heeft zijn eigen moment, dus nooit alle lijnen tegelijk.
  De puls gaat 107 px per seconde, komt per lijn elke 14 s terug, loopt door in de ader en stopt aan het uiteinde. Bij de
  eigen streep van een kaart loopt hij vanuit het midden naar beide aderen.
- De gloed om de lijnen en het groene licht ademen mee in 16 s. De gloeden en het groene licht ademen mee.
- Bij "minder beweging" staat alles stil, in één vast beeld.
- Zonder WebGL krijgt elke kaart een vaste gloed in css (mint 700 → 800 → zwart).

### Hoe het gebouwd wordt

- **Eén canvas vast achter de pagina** (`position: fixed`, `pointer-events: none`) met één shader. De pagina zelf staat er
  doorzichtig boven.
  - Buiten de kaarten tekent de shader wit, dus de site blijft wit.
  - Binnen de kaarten tekent hij de grote kaart in paginacoördinaten (hij scrolt mee met de pagina, niet met het scherm).
  - Voor beelden buiten de site (het logopakket) kiest `window.__veldVerschuif` welk stuk van de grote kaart je ziet.
- **De kaarten zijn gewone elementen met `data-kaart`.** De shader krijgt hun rechthoeken (hoogstens 8 per pagina) en meet
  opnieuw bij resize, fonts.ready en ResizeObserver.
- **Zuinig:**
  - de dichtheid is hoogstens 1,5;
  - het canvas tekent alleen als er een kaart in beeld is (IntersectionObserver op de kaarten; in de proef nog niet);
  - het stopt als het tabblad verborgen is.
- **Bestanden:**
  - `src/scripts/kaartveld.js` (uit `kladblok/levering-100/kaartveld.js`);
  - `src/components/Kaart.astro` (`<Kaart>` met een slot en `tekstvlak`);
  - `src/styles/kaart-100.css`.

## 4 · De pagina: links en rechts

- **Elke sectie is een rij van 12 kolommen**, om en om rechts en links. De tekst staat in 4 kolommen aan de ene kant. Aan
  de andere kant staat een foto (5 kolommen) of een kaart (6 kolommen).
- **Het oog volgt een Z:** van de tekst links naar het beeld rechts, één rij omlaag, en weer terug.
- **Op de telefoon** komt alles onder elkaar. Een kaart is dan 88 % breed en om en om links en rechts uitgelijnd, zodat het
  heen en weer blijft.

**De voorpagina, rij voor rij:**

1. tekst links, foto rechts: de kop, Start een bestelling en Probeer voor €1;
2. foto links, tekst rechts: Wat we maken, als lijst met prijzen uit `src/data/pricing.js` (de kaarten-carrousel uit
   levering 99 blijft hier, maar op wit);
3. tekst links, het verhaal van Hoe het werkt rechts (de animatie uit levering 99; geen kaart, want het heeft eigen beeld);
4. **kaart** links, foto rechts: de proef, €1;
5. de galerij, op wit, over de hele breedte;
6. tekst links, **kaart** rechts: het slot;
7. de voet, zwart #090D0B met witte tekst (Lucas, 04:55).

De opening met de laptop (de video van Lucas) blijft; zie open vraag 1.

## 5 · De stappen

Elke stap eindigt met een lijst in een artifact. Er wordt pas geleverd na Lucas' "ja".

| fase | wat | bestanden | klaar als |
|---|---|---|---|
| **0 · nu** | kleuren, logopakket, dit plan, de proef | `docs/KLEURENSCHEMA.md`, `images/Logo/visuails-logo-100/`, dit bestand, `kladblok/levering-100/` | Lucas lijst 104 heeft ingevuld |
| **1 · tokens** | de kleuren op de site: zwart, wit, mint; blauw uur weg uit alle css; de balk zwart; favicons uit pakket 100 | `src/styles/hal.css`, `knoppen.css`, `balk-99.css`, `global.css`, `public/favicon*`, de tests die kleuren meten | geen `#25508B`, `#1A4279`, `#80A7DD` of `#0B0F17` meer in src (een test bewaakt dat) |
| **2 · het kaartveld** | het script, `<Kaart>`, de css, de val zonder WebGL | `src/scripts/kaartveld.js`, `src/components/Kaart.astro`, `src/styles/kaart-100.css`, `tests/kaartveld-100.test.mjs` | contrast onder tekst ≥ 4,5 : 1 gemeten over de hele lus, op 1440 en 390; stil bij minder beweging |
| **3 · de voorpagina en Studio** | links-rechts, de kaarten uit lijst 105 (voorpagina: €1, het slot, de tegel Eigen look; Studio: abonnement, saldo, eerste bestelling, inloggen), levering 99 erin opgenomen (carrousel, lifestyle, het verhaal van Hoe het werkt), de stukjes weg | `VoorpaginaHal.astro`, `HalMaken80.astro`, `HalHoeKort80.astro`, `HalProef.astro` | screenshots 1440 / 390, testreeks groen |
| **4 · de andere pagina's** | /catalog, /lifestyle, /video, /pricing, /start, /test-sample, /about, /faq, /plans, /editions, /hooks, /thank-you, de 404; de kaarten uit lijst 105, hoogstens drie per pagina | de Hal-componenten van die pagina's | elke pagina gemeten (contrast, 11,5 px, koppen ≤ 2 regels) |
| **5 · beelden** | logo-animaties in zwart, wit en mint; deelplaatjes (lijst 103: welke vorm); bureaubladen uit het pakket | `images/Logo/visuails-logo-100/animatie/`, `deelplaatjes/`, `scripts/make-og.mjs` | contactblad in pakket 100 |
| **6 · nalopen** | de hele testreeks; als klant door de site; mails en /admin (donker: zwart met mint) | `tests/`, `src/emails/`, `/admin` | `LEVERING-100.md`, Lucas zegt ja |

**Levering 99** staat stil en gaat in fase 1 en 3 op. De carrousel, de lifestyle-animatie, het verhaal van Hoe het werkt, de
zwevende balk en de drift in de galerij gaan mee. De mint knop zat er al in. Het blauw en de gloed gaan eruit.

## 6 · Open vragen (komen in de lijsten)

1. **De opening met de laptop:** blijft die zoals hij is, op wit?
   - Mijn advies: ja. De laptopschermen tonen de winkel van een klant en houden hun eigen kleuren.
   - Wel komt er wit omheen in plaats van het blauwe veld b1.
2. **De poster ("Bouw de wereld van je merk")**:
   - a: een kaart van het veld;
   - b: een foto van Lucas over de hele breedte.
   - Mijn advies: b. Zo blijven er drie kaarten.
3. **Admin donker:** zwart met mint als accent? (Studio blijft licht.)
4. **De deelplaatjes:** kiezen in lijst 103. Ze worden gemaakt in fase 5, op wit of op het veld.

## 7 · Wat er in deze levering in de map staat

- `docs/KLEURENSCHEMA.md`: bovenaan de sectie levering 100. De rest staat eronder als geschiedenis.
- `kladblok/PLAN-KAARTVELD-100.md`: dit plan.
- `kladblok/levering-100/kaartveld.js`: het script van de proef (de bron voor fase 2).
- `kladblok/levering-100/lijst-104.html`: de proef zelf, om in de browser te openen.
- `images/Logo/visuails-logo-100/`: het logopakket in de nieuwe kleuren (87 bestanden, met LEESMIJ.md en contactblad-100.jpg).

**Er verandert nog niets aan de site zelf.** Dat begint bij fase 1, na lijst 104.
