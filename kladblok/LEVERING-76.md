# Levering 76 · Rustiger in één beeld, de snede als overgang, de balk zonder rand, de nieuwe letter, elke sectie een productvel

**26 oktober 2026 (gevraagd 26 oktober, 10:52). Staat alleen in je map; je rolt zelf uit met
`UITROLLEN.bat`.** Bouwt voort op levering 75. Die staat nog niet live (je map staat op 74, commit
6c3a869), dus deze levering bevat 75 ook; het commitbericht noemt ze allebei.

---

## 1 · Wat je vroeg

- *"Past de laptop en kop wel samen in 1 beeld. Voor mijn gevoel is het nog krap. Ik wil echt dat
  het beeld rustig en overzichtelijk aanvoelt."*
- *"Ook zou ik de tekst wat moderner willen maken dan dat het nu is door een nieuwe free to use maar
  wel moderne en vernieuwende tekst font te zoeken."*
- *"Ook de animatie voor het verplaatsen van tekst mag wat anders. Ik zat te denken aan een effect
  dat wanneer je scrollt de tekst weg word gesneden op een VISUAILS style manier tijdens dat de
  laptop ook verdwijnt en dan heel kort wit scherm dan komt de tekst op de nieuwe plek terecht met
  een soortgelijk effect en komen de elementen tevoorschijn."*
- *"De topbar mag nog wel wat doorzichtiger en subtieler met geen outlining eromheen, dus zorg dat
  hij door de zichtbaarheid te verlagen hij ook een licht andere kleur krijgt maar wel duidelijk
  zichtbaar blijft."*
- *"Ik wil dat je de style van de eerste 2 secties op de homepagina gaat overnemen voor de rest van
  de homepagina … eventueel kan je wat inspiraties op doen voor het ontwerp van sommige onderdelen
  door middel van de bijgevoegde video's."*
- **11:09**, Lijst 58: Instrument Sans, de kop in 600, overal, de labels blijven IBM Plex Mono.
- **12:12**: *"make at least one deliberate move - a distinctive pairing, a considered scale, custom
  spacing - so it reads as your choice, not the builder's default. Zorg dat het echt een unieke
  VISUAILS achtig gevoel krijgt."*
- **12:29**: *"De format sectie mag wel subtiel/klein toegevoegd worden aan how it works animatie
  om de homepage wat kleiner en compacter te houden."*
- **13:00**, met vier beelden uit video's (één groot en twee middel; 60 : 30 : 10; 5 – 7 woorden per
  regel; een productpagina op een monitor): *"Vergeet niet gebruik te maken van deze regels op elke
  pagina en de editorial rust in de foto op het computerscherm wil ik op elke sectie terug zien dus
  kijk hoe je op elke sectie op de homepage je dit kan krijgen."*

## 2 · Wat er staat

### De opening: ruim in één beeld (`HalOpening.astro`, `opening.css`)
- De apparaten beslaan hoogstens **48 %** van de breedte (was 58 %).
- Lucht op drie plekken, elk met een eigen maat: onder de balk 28 – 64 px, tussen de hand en de kop
  26 – 52 px, onderaan 32 – 72 px. Wat er dan nog over is van de hoogte komt in gelijke delen
  boven en onder: het geheel staat in het midden onder de balk.
- De kop hoogstens **56,9 px** (was 76; een stap op de nieuwe schaal, zie De letter). Op een groot
  scherm loopt hij dan niet meer tot de telefoon, en dat is rustiger.
- Op de telefoon meer lucht onder de balk (30 px) en tussen de hand en de kop (22 px).
- Gemeten op 1440 × 900: de laptop 69 px onder de balk, de kop 56,9 px (smal), onderaan 66 px vrij.

### De overgang: de snede, even wit, de snede terug
- Terwijl de apparaten het beeld uit schuiven (36 – 56 % van de scroll) gaat **één rechte snede op
  53,13°** door kop, zin en standen tegelijk: dezelfde hoek als de snede in je V (horizontaal 0,75 ×
  de hoogte). Wat links van de snede ligt is weg. Een dunne lijn in inkt loopt een kier achter de
  snijrand, in het wit: de lijn als echo, dun en verschoven.
- Het beeld lost op tot 66 %; tot 72 % is het scherm **even helemaal wit** (alleen de balk).
- Dan legt **dezelfde snede** het label ("Zonder shoot") en de kop van Hoe het werkt bloot, van
  links naar rechts; het vlagje van het label gaat aan als een tl-buis. Daarna verschijnen de tabs,
  de drie blokken en de balk eronder, kort na elkaar.
- De letters die naar het label vlogen (74, 75) en de lichte stand van Hoe het werkt (75) zijn weg.
- Met de wieltik (de stroom) duurt de hele weg 2,8 s; de snede zelf ongeveer een halve seconde.

### De balk: doorzichtiger, zonder rand, licht getint (`hal.css`, "LEVERING 76 · DE PIL")
- Geen haarlijn, geen witte binnenrand, geen lichtrand bovenin; één zachte schaduw in plaats van drie.
- Het glas is de lijnkleur (`#E6E8EC`) op 56 % in plaats van wit op 64 %. Op wit wordt dat
  `#F1F2F4`: een licht grijze pil in de toon van de inkt, die zonder rand toch duidelijk te zien
  is. Over een beeld zie je meer van wat eronder ligt.
- Gemeten: op wit halen de menuletters 17,1 : 1; boven het donkerste vlak blijft de grond minstens
  `#86898E`, en dan 5,5 : 1.
- Het taalknopje is in de pil wit glas (het was vlak, en dat is nu lichter dan de pil zelf). De
  uitklapmenu's en de WhatsApp-knop hebben dezelfde look, zonder rand.

### De rest van de voorpagina: elke sectie een productvel (`src/styles/voorpagina-rust.css`)
Het scherm in je opening (en je Shopify-voorbeeld) toont een productpagina: één groot beeld op
lichtgrijs, ernaast een smalle kolom die bovenaan begint (kruimel, naam, prijs, de maten als knopjes,
één inktknop, een kleine regel) en korter is dan het beeld. Veel wit, geen kaders. Zo staat nu elke
sectie na Hoe het werkt, met je drie regels erin:
- **Eén groot**: het beeld, 4 : 5, zo hoog als past onder de balk (400 – 660 px).
  **Twee middel**: de kop van de sectie (32 px, de tweede toon op een eigen regel, zoals naam en
  prijs) en de naam of de knop. **De rest klein**: het label als kruimel, de prijs, de knopjes, de
  regel eronder.
- **Om en om**, zoals een lookbook: Wat we maken het beeld links, Looks rechts.
- **Wat we maken**: de drie gelijke kaarten zijn weg. Productfoto's · Lifestyle · Video zijn knopjes
  in de vorm van de tabs van Hoe het werkt; het beeld, de prijs en de knop wisselen mee, het beeld
  langs dezelfde snede als bij de looks. Productfoto's toont de jeans zoals hij geleverd wordt, op zijn
  eigen grijs (dezelfde als op het laptopscherm); lifestyle het sfeerbeeld; video een staande clip
  midden op het vlak.
- **Looks** (uit je video "Complete o look"): geen kader meer. De naam staat bovenaan in de kolom
  (stond met een gat onderaan), de vijf looks zijn de knopjes, de gezichten de kleurbolletjes met één
  regel ernaast (was een losse rij eronder), dan Probeer · €1. De pijlen en de teller bovenaan zijn
  weg: de kleine beelden kiezen. Wisselen met de snede van de opening (53°, een witte kier op de
  snijrand); niets beweegt vanzelf.
- **Meer weten**: de drie grijze kaarten zijn drie regels met een haarlijn, zoals het detailblok
  onder een productknop: de naam, en klein wat erachter zit (€2.500 – 8.000 per shootdag; goedkeuren,
  revisies, levertijd, rechten; de IPTC-waarde). De kop "Nog vragen?" is hier het grote element.
- **De proef**: in dezelfde kolom, de kop kleiner en de €1 hoogstens 180 px (was 260). Naast het
  inktblok staat nu één beeld groot (de jeans gedragen) met de andere drie als strook kleine beelden,
  zoals op het scherm (was vier gelijke vakken). Dit blok staat ook op twaalf andere soorten pagina's
  (prijzen, catalog, lifestyle, FAQ …) en is daar mee veranderd. Een klant die al bestelde, ziet nog steeds zijn eigen vier beelden.
- **Formaten** zit in **stap 3 van Hoe het werkt** (12:29), de losse sectie is weg. Na de vier
  vinkjes snijdt een kader de geleverde beelden bij tot het formaat (catalog 1:1 → 4:5, lifestyle
  4:5 → 9:16, 0,5 s), en rechtsonder staat klein in mono welke er zijn (uit `ratios.js`), de gekozen
  in inkt: één keuze, niet "je krijgt ze alle drie". De stroom gaat van Hoe het werkt naar Wat we maken.
- **De regel eronder**: tekst met een vinkje, zonder vlakjes. **De nummers**: 01 tot en met 05.

Gemeten op de voorpagina (1440): Wat we maken en Looks elk één groot element (het beeld, 36 % van de
sectie) en één à twee middel; Meer weten één groot (de kop) en de drie namen; wit 78 – 98 % per sectie,
blauw 0 – 1 %. Uit de andere video's heb ik bewust niets letterlijk genomen: tekst die over beelden
schuift, scheve kaarten en donkere achtergronden passen niet bij "rustig en overzichtelijk".

### De drie regels op alle pagina's (gemeten op 88 pagina's, 1440 en 390)
- **5 – 7 woorden per regel**, per woord op een volle regel geteld: lopende tekst vanaf 16 px mediaan
  5,8 (telefoon 5,7), kleine tekst mediaan 8,5 (je afspraak van 15 oktober: 8 – 10). Klopt. Alleen de
  vijf juridische documenten liepen door de nieuwe, smallere letter op tot mediaan 10 en soms 13;
  hun maat is 8 % smaller gezet, nu mediaan 9,2 (`hal.css`, v19-lang).
- **60 : 30 : 10**: wit is per sectie mediaan 91 %; blauw komt buiten foto's en de knop Bestellen
  nergens boven de 1 %.
  Wat niet klopt: het **inktblok onderaan** de look-, video-, hooks-, editions-, merkmodel-, modellen-
  en overpagina (`.h-lk-slot`) vult zijn sectie voor 80 % met inkt. Zie mijn voorstel bij 4.
- **Eén groot, twee middel**: de koppen bovenaan de andere pagina's zijn 76 px naast een groot beeld
  of een prijs, de sectiekoppen 56 px. Op het scherm wint het beeld meestal, maar het zijn twee grote
  elementen. Op de voorpagina staat de kop nu op 56,9 en de sectiekoppen op 32 (de schaal van 4 : 3).
  Zie mijn voorstel bij 4.

### De letter: Instrument Sans in drie stemmen (`hal.css`, "LEVERING 76 · DE LETTER")
- **Instrument Sans** (OFL 1.1, gratis, ook commercieel), zelf gehost in `public/fonts/instrument-sans/`
  (latin en latin-ext, 76 kB), zoals IBM Plex Mono. Geen nieuw npm-pakket, dus je hoeft niets te
  installeren. Op de site, in Studio, op de privélink en in /admin (`studio-hal.css`, `admin.css`,
  `account.css`, `portal.css`, `scripts/fonts-voor-worker.mjs`). Urbanist blijft als terugval in de
  rij staan. De mails blijven Arial.
- **De zet** (12:12): één familie, drie stemmen, met de maten uit de snede van je V (de
  3-4-5-driehoek van 53,13°):
  - **Smal** voor koppen, namen en grote cijfers: de breedte-as op **80 %**, de 4 : 5 van die
    driehoek. Een smalle, hoge kop leest als een modeblad; dezelfde letter op volle breedte ernaast
    houdt de tekst rustig en leesbaar.
  - **Normaal** (100 %) voor alles wat je leest en bedient.
  - **Mono** (IBM Plex Mono) voor labels, nummers en kenmerken, zoals het was.
  - **Een schaal van 4 : 3 per stap** op de voorpagina, de andere verhouding uit dezelfde driehoek:
    13,5 · 18 · 24 · 32 · 42,7 · 56,9 … tot de €1 op 179,8.
  - **Spatiëring per maat**: smal heeft minder krappe spatiëring nodig dan breed: −0,01 em (was
    −0,025 bij Urbanist), de grote kop en grote cijfers −0,015 em.
- Gemeten: smal op 80 % is 13 % smaller dan Urbanist op dezelfde grootte, dus nergens breekt een kop
  eerder af. De kop van de opening is gemeten opnieuw op maat gezet (13,4 × zo breed als hoog, Engels
  14,9; op de telefoon het eerste deel 8,0 en 9,35).
- Instrument Sans gaat van 400 tot 700: wat 300 vroeg (de grote cijfers zoals €39), staat nu in 400.


## 3 · Bewust anders dan het schema (en waarom)
- **De snede als overgang**: E1 (de snede bij elk element dat verschijnt) is in 75 vervallen. Dit is
  geen terugkeer: de snede zit alleen op de overgang van de opening naar Hoe het werkt en op het
  wisselen van de looks, omdat je erom vroeg. Alles wat gewoon verschijnt, doet dat nog steeds met
  alleen de dekking.
- **Glas op de balk**: blijft, want de balk zweeft. Zonder rand is de tint nu wat hem zichtbaar
  houdt.

## 4 · Mijn mening, kort
- De opening voelt nu als één foto met een onderschrift. Kleiner dan 48 % zou ik niet gaan: dan
  wordt de laptop een detail en lees je de winkel in het scherm niet meer.
- De snede is het sterkste merkmoment van de pagina geworden. Daarom staat hij op twee plekken en
  niet meer.
- De smalle koppen zijn de grootste verandering in het gevoel van de site. Vind je 80 % te smal, dan
  is het één getal (`--h-smal` in `hal.css`); 86 % is de rustigere variant, 90 % is bijna niet meer
  te zien.
- Formaten in stap 3 is beter dan een eigen sectie: het formaat hoort bij wat je terugkrijgt. Hij
  is bewust klein; wie het mist, ziet het op de pagina's van catalog en lifestyle terug.
- Het lookpaneel is rustiger dan de strook, maar je ziet de looks nu één voor één. Met vijf looks
  werkt dat; worden het er twintig, dan wil je een tweede rij of een link naar alle looks.
- Het productvel is het sterkste idee uit je video's voor deze site: je verkoopt beeld voor
  productpagina's, en nu ziet je eigen voorpagina er zo uit.
- Meer weten heeft bewust geen foto. Een gezicht naast "Nog vragen?" leest als een medewerker die er
  niet is. De grote kop en de witruimte doen hier het werk.
- **Voorstel voor de andere pagina's**: het inktblok onderaan (`.h-lk-slot`, op zeven soorten pagina's)
  net zo opbouwen als het €1-blok: het blok smaller, met één groot beeld van die pagina ernaast. Dan
  klopt 60 : 30 : 10 ook daar, en eindigt elke pagina als een productvel. En **dezelfde schaal op
  alle pagina's**: de paginakop van 76 naar 56,9 px en de sectiekoppen van 56 naar 42,7, zodat het
  beeld het ene grote element is. Allebei niet gebouwd: het eerste is per pagina een beeldkeuze, het
  tweede verandert het gevoel van elke pagina. Zeg ja (op één of allebei) en ik doe het in de
  volgende levering.

## 5 · Goed om te weten
- **Uitrollen**: 75 staat nog niet live; rol 76 uit en je hebt ze allebei. Daarna pas de
  cloudsessie (de prompt heb ik niet aangepast).
- De content credentials (C2PA) die onderweg aan beelden worden toegevoegd, blijven erin.

## 6 · Bestanden
- Nieuw: `src/styles/voorpagina-rust.css`, `public/fonts/instrument-sans/` (twee woff2, `OFL.txt`,
  `LEES-MIJ.txt`), `kladblok/LEVERING-76.md`.
- Aangepast: `src/components/HalOpening.astro` (de lucht, de snede, de stops),
  `src/styles/opening.css` (de indeling, de snede, de kop, het formaat in stap 3),
  `src/components/VoorpaginaHal.astro` (de productvellen, het lookpaneel, Meer weten, Formaten in stap 3),
  `src/styles/hal.css` (de balk, de letter, de proef als productvel, de maat van de juridische pagina's), `src/styles/studio-hal.css`, `src/layouts/Layout.astro`
  (de letter vooraf laden), `src/components/Studiobrief.astro` (het lokveld zonder ronding),
  `public/admin.css`, `public/account.css`, `public/portal.css`, `scripts/fonts-voor-worker.mjs`,
  de toetsen `opening-74`, `hal-voorbeeld`, `homerail` en `hoe-stappen-29` (de zin over het formaat in stap 3 voor een schermlezer),
  `docs/DESIGN.md`, `docs/KLEURENSCHEMA.md`, `kladblok/PLAN-OPENING-SCROLL.md` en
  `kladblok/COMMIT-BERICHT.txt`.
- `FormatenHal.astro` blijft bestaan (op /voorbeeld/uitleg); hij staat alleen niet meer op de
  voorpagina.
- Plus alles van levering 75 (zie `kladblok/LEVERING-75.md`), omdat 75 nog niet is uitgerold.

## 7 · Nagekeken
- Alle toetsen die de voorpagina raken, los gedraaid na de laatste wijziging: `opening-74` 90/90,
  `hal-voorbeeld` 131/131, `homerail` 32/32, `hoekregel` 134/0, `minder-sjabloon` 891/0,
  `plaatshouders-pad` 30/30, `proef-look` 92/92, `klant-stand` 127/127.
- De volledige ronde (269 stappen): 267 goed. `backupterugzet` faalt hier altijd (die heeft je echte
  back-upmap nodig); `hoe-stappen-29` zocht het bijschrift "4 van 4 goedgekeurd" zonder de zin voor een
  schermlezer die er sinds deze levering achter staat: de toets is aangepast, nu 23/23.
- Toegankelijkheid (axe) op de voorpagina, NL en EN, 1440 en 390, met en zonder minder beweging:
  geen fouten.
- Verspringen bij het laden (CLS): hoogstens 0,008 met de letter op tijd. Komt de letter 0,9 s te laat
  binnen, dan tot 0,08 op de telefoon (onder de grens van 0,1); dat is het wisselen van letter, dat
  deed Urbanist ook.
- Geen horizontale scroll op 320, 390, 1024, 1280 en 1440; de knopjes van Wat we maken passen op 320.

## 8 · Uitrollen
Uit je map, met `UITROLLEN.bat`. Het commitbericht staat in `kladblok/COMMIT-BERICHT.txt`.
