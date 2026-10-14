# Voorstel — de voorpagina van de grond af

**22 september 2026.** Lucas: *"bedenk hoe de VISUAILS homepagina verbeterd kan
worden met name door het zo te maken dat klanten snel begrijpen wat ze kunnen
verwachten en hoe het systeem werkt."* Dit is het plan; er is nog niets gebouwd.

---

## 1. Wat er nu staat, en wat elke sectie doet

Gemeten op 1440, na de ronde van vandaag: 7.700 px, tien blokken.

| # | Sectie | Wat de bezoeker eruit haalt | Oordeel |
|---|---|---|---|
| 0 | Opening: kop + laptop | Wat het is (productbeelden, geen shoot) en hoe het eruitziet | **Blijft.** Net opnieuw gedaan. |
| 1 | Maatlijn: vier feiten | Eén product mag · vanaf €89 · eigen week · rechten | **Blijft.** Dit is de snelste samenvatting op de site. |
| 2 | Van jouw foto naar je shop (4 stations) | Hoe het werkt | **Blijft**, schuift één plek naar beneden. |
| 3 | Wat we maken (3 tegels + deur) | De drie diensten met prijs | **Blijft**, strakker. |
| 4 | De catalogset. De carrousel. Of allebei. | Zeven beelden op een rij + de combinatieprijs | **Weg.** Zegt wat 3 al zei, met dezelfde beelden als 2. |
| 5 | Eén tarief per product. Daalt met het aantal. | Drie vanaf-prijzen + drie abonnementen | **Weg.** De prijs staat al in 1 en 3; de staffel is het werk van /pricing. |
| 6 | Kies een gezicht (roster van tien) | Er zit een model bij | **Blijft, kleiner.** Het is een echt verschil met de concurrent, maar tien koppen is een eigen pagina. |
| 7 | Direct antwoord (vier vragen) | Bezwaren | **Blijft.** |
| 8 | Proef €1 (slot) | De eerste stap | **Blijft.** |
| 9 | Trustlijn | Enschede, KVK, WhatsApp | **Blijft.** |

Wat er **niet** staat, en wat een bezoeker wél zoekt voordat hij bestelt:

- **Bewijs.** Nergens één eerlijk voor-en-na. De laptop laat het eindresultaat zien, maar niet wat erin ging. De roze jeans in de band is klein en staat in een uitlegcontext, niet als bewijs.
- **De stijlen.** Nul. De bezoeker ziet pas op /lifestyle dat er iets te kiezen valt, terwijl de stijl het eerste is wat een modemerk wil weten ("past dit bij mijn merk?"). En jouw eigen bestelregel is "eerst een look, dan het formulier" — de voorpagina biedt die look nergens aan.
- **Voor wie het is.** De pagina spreekt niemand aan. Een merk met twaalf producten, een shop met tweehonderd sku's en een bureau dat voor klanten bestelt, lezen alle drie dezelfde tekst en herkennen zich er geen van drieën in.

Het onderliggende probleem: de pagina is opgebouwd als **catalogus van wat wij hebben** (diensten, sets, tarieven, gezichten) in plaats van als **antwoord op wat de bezoeker vraagt**. Die vraagt, in deze volgorde: wat is het — is het goed — hoe werkt het — kan het in mijn stijl — wat kost het — wat als het misgaat — hoe begin ik.

---

## 2. De nieuwe opbouw

Negen blokken, in de volgorde van de vraag hierboven. Doel: ±6.500 px (zie §7.4).

### 0 · Opening — *wat is het*
Zoals nu: kop met wisselwoord, laptop, maatlijn eronder. Niets aan doen.

### 1 · Dit stuur jij. Dit krijg je terug. — *is het goed* (NIEUW)
Eén echt paar, groot: de telefoonfoto van het T-shirt op de houten tafel links,
het afgewerkte catalogbeeld rechts, met de schuifknop die op /how-it-works al
staat (`Compare.astro`). Daaronder één regel in mono: *ingestuurd met een
telefoon · 4 beelden terug · 2048 px · jpg, png, webp*.

Waarom dit op twee en niet lager: dit is de vraag die iedereen heeft en die de
laptop niet beantwoordt. Wie hier gelooft dat het echt is, leest de rest; wie
het niet gelooft, scrollt niet verder — dus hoort het bewijs vóór de uitleg.

Later, als je meer paren hebt: drie paren als tabs (t-shirt / jeans / sneaker),
uit je voorbeeldmerken in Magnific. Nu één, en die is echt.

### 2 · Van jouw foto naar je shop — *hoe werkt het*
De band met de vier stations, ongewijzigd. Hij staat nu op de goede plek: ná
het bewijs, vóór de keuzes.

### 3 · Wat we maken — *wat kan ik kiezen*
De drie tegels blijven, met twee wijzigingen:
- de vierde tegel ("Bekijk alle diensten · 8 deuren") wordt een regel onder de
  drie: *Ook: Hooks, Editions, video op aanvraag, werk op maat →*. Een deur die
  op een tegel lijkt maar geen dienst is, is de ene tegel die een bezoeker
  aanklikt en dan niet begrijpt;
- de prijs blijft op de tegel ("vanaf €89 per product") — dat is wat sectie 5
  overbodig maakt.

### 4 · De stijlen — *past het bij mijn merk* (NIEUW)
Een **strook die opzij scrolt**, met scroll-snap en twee pijlen, in de taal van
de laptop-carrousel: per stijl één groot beeld (staand, 4:5), de naam, de
dienst waar hij bij hoort, en één zin over het moment. Drie tot vier kaarten
in beeld op een breed scherm, één-en-een-half op een telefoon zodat je ziet dat
er meer is.

Elke kaart linkt naar die stijl op zijn dienstpagina (`/lifestyle#glow`,
`/catalog#wit`). Dat is jouw bestelregel in één klik: eerst de look, dan het
formulier — en het is de kortste weg van voorpagina naar bestelling die de site
dan heeft.

Inhoud komt uit `styles.js` (lifestyle), `backgrounds.js` (catalog: wit,
gebroken wit, beige — als drie kleine kaarten of één kaart met drie stalen) en
`komendeStijlen.js` (Still, als "binnenkort"-kaart zonder link). Vervang jij
de stijlen, dan volgt de strook vanzelf.

**Geen diavoorstelling die zelf draait.** Je vroeg om een "dia slide"; mijn
advies is een strook die de bezoeker zelf beweegt, en wel hierom: een
carrousel die zelf doorloopt toont één stijl tegelijk en verbergt de rest,
precies het tegenovergestelde van "laten zien wat er allemaal mogelijk is".
Een strook toont er drie of vier naast elkaar en nodigt uit om te schuiven. De
laptop erboven beweegt al; twee dingen die zelf bewegen op één pagina vechten
om aandacht. Wil je toch beweging: een langzame, doorlopende strook (marquee)
die stilstaat zodra de muis erop komt — dat is te doen, maar ik zou het niet
als eerste bouwen.

### 5 · Een gezicht zit erbij — *wat zit er nog meer in*
De roster van tien wordt één rij van vijf koppen, een kop "Een gezicht uit de
bibliotheek zit bij elke bestelling, zonder meerprijs" en twee links (alle
tien, jouw merkmodel). Helft van de hoogte, zelfde boodschap.

### 6 · Voor wie — *is dit voor mij* (NIEUW, klein)
Drie regels, geen kaarten. Elke regel één situatie en één deur:

- *Je begint een merk en hebt twaalf producten* → catalogset, vanaf één product
- *Je hebt een shop met honderden sku's* → vanaf 10 producten je eigen week op de kalender
- *Je bestelt voor klanten (bureau, fotograaf)* → één account, per bestelling een ander merk (zie §7.3)

Dit is de sectie die "wat visuails voor ze kan betekenen" doet, en hij hoort
kort: drie zinnen waarin een bezoeker zichzelf herkent, en dan door.

### 7 · Direct antwoord
Ongewijzigd: de vier bezwaren, twee-bij-twee.

### 8 · Proef €1 — slot
Ongewijzigd.

### 9 · Trustlijn
Ongewijzigd.

---

## 3. Wat er bewust níét in komt

- **Reviews of logo's van klanten.** Er zijn er nog geen, en een lege of verzonnen sectie is erger dan geen sectie. Zodra Trustpilot drie echte reviews heeft: één regel onder de trustlijn, met de score en een link. Niet eerder.
- **De abonnementen.** Die zijn een tweede deur voor wie al besteld heeft; ze staan op /plans en in de voettekst, en voor een ingelogde klant wisselt de opening al naar "Start een abonnement". Op de voorpagina van een nieuwe bezoeker leiden ze af.
- **De prijsstaffel.** Eén vanaf-prijs per dienst is genoeg om te weten of het in je budget past; de staffel is /pricing.
- **Een tweede uitleg van het proces.** De band is de uitleg; /how-it-works is de lange versie. Niets ertussen.

---

## 4. In cijfers

| | Nu | Voorstel |
|---|---|---|
| Blokken | 10 | 9 |
| Hoogte op 1440 | 7.700 px | ±6.500 px |
| Secties die uitleggen | 7 | 4 |
| Secties die tonen | 3 | 5 |
| Klikken van voorpagina naar een look | 2 (dienst → look) | 1 (stijlkaart) |

---

## 5. Bouwvolgorde en wat het kost

1. **Weg: De set en Tarieven.** Twee secties, hun CSS en hun copy uit `Voorpagina.astro`. Een uur, meteen zichtbaar.
2. **Voor-en-na.** `Compare.astro` bestaat; het paar (`catalog-before-1x1` / `catalog-after`) bestaat. Een dagdeel.
3. **De stijlenstrook.** Nieuw component (`Stijlstrook.astro`), leest uit de drie databestanden, scroll-snap, pijlen, toetsenbord, `prefers-reduced-motion`. Een dag, inclusief de ankers op de dienstpagina's en de tests.
4. **Gezichten kleiner, Voor wie erbij, deur-tegel naar regel.** Een dagdeel.
5. Meten: leesbaarheid, spatiescan, telefoon op 320/360/390, de volledige testreeks.

Wat ik van jou nodig heb voordat 3 kan: **welke stijlen er in de strook horen.**
Je zei dat Dunes, Flash, Glow en Phone-made verouderd zijn. De strook kan met
die vier gebouwd worden en volgt vanzelf als je ze vervangt — maar als je al
weet welke ervoor in de plaats komen, bouw ik hem meteen op de nieuwe.

---

## 6. Waar ik over twijfel

- **Voor-en-na op plek 1 of plek 2** (vóór of ná de band). Ik zeg vóór: bewijs eerst. Het argument voor ná: dan snapt de bezoeker eerst wát hij ziet. Beide verdedigbaar; jouw keuze.
- **De stijlenstrook op catalog én lifestyle, of alleen lifestyle.** Catalog heeft drie achtergronden, geen stijlen. Drie kleine stalen in één kaart houdt de strook eerlijk; drie losse kaarten maakt catalog groter dan het is.
- **Of "Voor wie" er wel in moet.** Het is de enige nieuwe sectie zonder beeld. Als de pagina na 1–4 al vol genoeg voelt, laat hem weg; de drie situaties kunnen dan als drie regels in de FAQ.

---

## 7. Controle van het plan — 22 september, tweede lezing

Lucas: *"Controleer dit plan nog een keer zorgvuldig."* Nagelopen tegen de
code. Vier correcties, één aanvulling.

1. **De ankers per stijl bestaan niet.** §2.4 zegt dat een stijlkaart linkt
   naar `/lifestyle#glow`. /lifestyle en /catalog hebben alleen `#looks`,
   geen id per stijl. Dus stap 3 van de bouwvolgorde krijgt er een regel bij:
   elke look-kaart op de dienstpagina's een `id` met de slug, en de strook
   linkt daarheen. Klein, maar zonder dat werkt de "één klik naar een look"
   niet en landt de bezoeker bovenaan de reeks.
2. **Het wisselwoord "productvideo's" belooft iets wat op aanvraag is.** De
   kop draait "Al je productvideo's. Zonder shoot." terwijl de videotegel
   "op aanvraag" zegt en geen bestelknop heeft. Dat is precies het soort
   tegenspraak dat een bezoeker onthoudt. Twee opties: het woord uit de
   reeks halen zolang `VIDEO_OP_AANVRAAG` aanstaat (de lijst leest dan de
   vlag), of video in de kop laten en de tegel een echte weg geven —
   "Aanvragen →" naar /contact met het onderwerp ingevuld. Mijn advies: het
   tweede. Een dienst die je verkoopt, hoort een deur te hebben; "op aanvraag"
   zonder knop is een gesloten deur met een bordje.
3. **"Voor wie", derde regel.** Er stond "één account, per klant een merk".
   Wat de site echt doet (FAQ): je bestelt onder je eigen account en vult per
   bestelling de merknaam en factuurgegevens van die klant in. Dat is de
   juiste zin — "per bestelling een ander merk, één account" — en hij moet
   zo, want de eerste versie belooft een merkenbeheer dat er niet is.
4. **De hoogte.** ±6.000 px was een schatting van vóór de stapel-opening;
   die is 1.560 px in plaats van 990. Realistisch na dit plan: ±6.500 px op
   1440. Nog steeds korter dan nu (7.700) én met twee secties méér die iets
   tonen.

Aanvulling: **de maatlijn zegt "Jouw eigen week op de kalender"**, en dat
geldt vanaf 10 producten. Wie met één product komt — de proef, de starter —
leest een belofte die niet voor hem is, en leest nérgens wat wél voor hem
geldt ("zo snel mogelijk, meestal binnen een dag"). Voorstel: dat feit
wordt "Kleine bestelling: zo snel mogelijk · vanaf 10: jouw eigen week". Eén
regel, twee waarheden, uit `turnaround()` in pricing.js zodat hij niet kan
verouderen.

---

## 8. Bannerbeelden in de merkkleuren — ja, als Editions-voorbeelden

Lucas: *"Moet ik grote/kleine bannerbeelden in mijn kleurenschema maken … het
zouden beelden van Editions kunnen zijn, echte beelden die klanten ook
kunnen krijgen."*

Ja — en de reden waarom is precies de tweede helft van je zin. Een sfeerbeeld
dat alleen sfeer is, is decoratie, en decoratie is wat deze site sinds sectie
21 juist kwijt wil. Een sfeerbeeld dat **een Editions-drop laat zien** is
bewijs: dit is wat een abonnee elke maand krijgt. Dan is het beeld inhoud.

Wat ik zou maken, en waar het heen gaat:

| Beeld | Maat | Waar |
|---|---|---|
| Twee brede banners (liggend, 16:9 en 21:9-uitsnede uit hetzelfde beeld) | 2400×1350 | De donkere slotpanelen (voorpagina, /plans), de kop van /plans, de OG-afbeelding |
| Vier staande (4:5) | 1080×1350 | De stijlenstrook (als "Editions"-kaarten), /plans |
| Eén vierkant | 1600×1600 | Studio, het abonnementsblok |

**De kleurregel die je zelf hebt gesteld, geldt hier hard:** de PLEK in het
palet (koelgrijze muren en gronden, puur zwart in de schaduwen), de KLEDING
vrij, en het violet alleen als **licht** — een lichtbron, een reflectie in
een raam, een LED-strip — nooit als vlak of als kledingkleur. Dat is dezelfde
truc als de limebaan van augustus, in de nieuwe kleur, en hij houdt de
2%-regel uit KLEURENSCHEMA.md in stand: het accent is klein en het is een
actie (licht dat ergens op valt), geen behang.

Wat ik ertegen zou zeggen: **niet vóór de stijlen.** Een bannerbeeld voegt
gevoel toe; de stijlenstrook voegt begrip toe. Als je één dag hebt, gaat die
naar de strook. En: maak ze in jouw promptgrammatica (het moment eerst, dan
plek, licht, pose) — ik schrijf de prompts als je wilt, met de
visuails-style-methode, drie versies per beeld.

---

## 9. Wat de site verder mist — niet reviews, niet foto's

Zeven dingen, in volgorde van wat het meest kost om níét te doen.

1. **Niemand vangt de bezoeker op die vandaag niet bestelt.** Negentig
   procent klikt weg zonder te bestellen, en de site heeft geen enkele manier
   om die persoon ooit nog te bereiken. Je hebt een lead magnet (de Content &
   Posting Playbook) die nergens op de site staat, en je hebt Resend met
   audiences. Eén regel in de voettekst en op /guides — "De playbook, gratis:
   [e-mail] →" — is de goedkoopste conversie die je kunt bouwen, en voor een
   bedrijf vóór de lancering de belangrijkste.
2. **Een Nederlander die `visuails.com` intypt landt op de Engelse pagina.**
   Er is geen taaldetectie. Google stuurt via hreflang goed, maar een gedeelde
   link, een visitekaartje, een Instagram-bio: allemaal `/`. Voorstel: één
   keer, alleen op `/`, een `Accept-Language`-check in de Worker die `nl`
   naar `/nl/` stuurt — met een cookie zodat wie op EN klikt, EN houdt. Geen
   balk, geen popup.
3. **Twee van de acht "deuren" gaan nergens heen.** Hooks (op aanvraag) en
   Editions (binnenkort) staan in het menu en de voettekst als diensten. Wie
   erop klikt, vindt een pagina die eindigt in "neem contact op". Zet ze uit
   het hoofdmenu tot ze te bestellen zijn; de voettekst is genoeg, en de
   "binnenkort"-regel onder Wat we maken ook.
4. **De galerij toont losse beelden, geen levering.** Wat een bezoeker wil
   zien is wat hij KRIJGT: één product, alle zeven beelden en de drie
   uitsnedes bij elkaar. Nu staan er vijfentwintig losse foto's van
   verschillende producten. Eén "zo ziet een levering eruit"-blok bovenaan
   /gallery — de roze jeans, compleet — en de losse beelden eronder.
5. **Twintig conceptpagina's in de build.** `/concept/*` — de rondes van
   6 september, alle in het gele palet, op noindex, 117 pagina's per build
   waarvan 20 niets meer betekenen. Ze staan er omdat je zei "laten staan",
   en toen was het schema nog geel. Nu zijn het twintig pagina's in een
   kleur die de site niet meer heeft, bereikbaar voor wie de URL gokt. Mijn
   advies: weg uit de repo (ze blijven in git), of naar een map buiten
   `src/pages`.
6. **Video heeft geen deur** — zie §7.2.
7. **Je naam staat nergens.** /about vertelt het verhaal, de voettekst zegt
   Enschede en een KVK-nummer. Voor een eenmanszaak die aan modemerken
   verkoopt is "gemaakt door een persoon met een naam" het sterkste
   vertrouwenssignaal dat er zonder reviews te krijgen is. Eén regel onder de
   trustlijn — voornaam, plaats, "elk beeld gaat door mijn handen" — als je
   dat wilt. Jouw keuze; ik snap het als je het niet wilt.

En één ding om te **verwijderen** dat niet in §1 stond: de proefkaart die na
de cookiekeuze linksboven verschijnt ("Eerst zien? Eén product voor €1").
Hij staat op elke pagina, over de kop heen, en zegt wat de opening en het
slot allebei al zeggen. Drie keer dezelfde €1-boodschap in één scherm leest
als aandringen.
