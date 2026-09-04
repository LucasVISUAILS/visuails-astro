# Bestellen bij VISUAILS — doorlichting van de catalogstroom en VISUAILS Studio

3 september 2026. **Dit is onderzoek 2, los van "Wat Fable 5.1 voor VISUAILS kan doen" (`FABLE-EN-VISUAILS.md`).** Hier gaat het alleen over het bestellen: is het te ingewikkeld, klopt alles, en wat kan er weg.

## Hoe ik het heb gedaan

Ik heb op de live site, ingelogd op het testaccount "Test", een echte catalogbestelling geplaatst: 3 producten, voor- en achterkant per product, model Fiye, wit, 1:1, standaard levertijd. Kenmerk **VIS-NZDT-1I5**, € 267 excl. btw — **die staat nu onbetaald in je admin en mag geannuleerd worden.** Daarna ben ik door VISUAILS Studio gelopen (overzicht, bestellingen, je vaste look). Vervolgens heb ik de varianten geprobeerd die je noemde: "Meer dan 52 producten", 21 producten (vaste leverdatum), 5 producten, en stap 2 zonder één foto. Wat ik in de browser zag, heb ik daarna in de code nagelezen (`OrderFlow.astro`, `ProductUploader.astro`, `pipeline.js`, `functions/api/order.js`, `src/lib/account.js`, `interactions.js`) zodat elke bevinding hieronder een plek in de code heeft en niet alleen een indruk is.

Ik heb de stroom ook vijf keer "als iemand anders" doorlopen — die vijf staan in §4, en waar een bevinding uit zo'n persoon komt, staat dat erbij.

## Eerst wat goed is

Dit moet blijven, dus ik noem het voordat ik ga schrappen. Vijf stappen met een naam en een balk erboven. Het totaal rekent live mee en de staffelprikkel ("nog 2 producten en het tarief zakt naar €65") is precies goed. Alles wat in Je vaste look staat is voorgevuld en ingeklapt, dus een terugkerende klant kiest alleen een aantal en uploadt. Elke optionele vraag zegt wat invullen oplevert. Een product klapt dicht met "Klaar" zodra voor- en achterkant erin staan, en onderaan staat "Alle 3 producten hebben wat we nodig hebben". Er is geen betaalmuur, en de samenvatting vóór verzenden zegt eerlijk "er is nog niets aangemaakt". Dat is een sterke basis; de rest van dit document gaat over wat er bovenop is gestapeld.

---

## 1 · Wat niet klopt — dit eerst

Elk punt: wat ik zag, waarom het telt, wat ik voorstel, en wat het oplevert.

### 1.1 "Meer dan 52 producten" stuurt niemand naar jou

Kies je de laatste optie, dan verandert alleen het totaal in "dat plannen we samen in plaats van het door een formulier te laten uitrekenen" — en daarna gaat de knop Verder gewoon naar stap 2, met één productkaart en een knop "Nog een product toevoegen". Geen WhatsApp, geen mail, geen ander pad. Precies wat je vermoedde. In de code is er geen enkele drempel die naar persoonlijk contact leidt; de enige drempel (10 producten) leidt naar de agenda (`OrderFlow.astro`, de `too-large`-paneel zegt "Stuur dit en we plannen het samen" zonder link).

*Voorstel.* Bij "Meer dan …" de rest van stap 1 inklappen en twee knoppen tonen: **App ons** (WhatsApp, met voorgevulde tekst "Ik wil ongeveer N producten laten fotograferen") en **Mail ons**, plus één regel: "Boven de 52 plannen we het in twee leverdata; we antwoorden binnen een werkdag." Wil je, zoals je zegt, al vanaf 20 persoonlijk contact, dan wordt het getal in de lijst 20 en heet de laatste optie "Meer dan 20 — we plannen het samen". Dat is één constante (`maxProducts`) plus de knoppen.

*Wat het oplevert.* Grote klanten komen bij jou terecht in plaats van in een formulier dat niet voor ze gebouwd is, en je krijgt de vraag mét aantal binnen in plaats van een half ingevulde bestelling.

### 1.2 Stap 2 is geen poort: je kunt met nul foto's door

Met 21 producten en "0 van 21 producten klaar" ging ik met Verder gewoon naar stap 3, 4 en de samenvatting. De code zegt dat dit bewust is ("een upload die mislukt mag geen bestelling blokkeren"), maar het botst met je eigen regel van 8 augustus: materiaal vooraf compleet, geen namailen, zodat productie meteen kan starten. Bij mijn eigen bestelling stond in de samenvatting "Alle 3 producten hebben wat we nodig hebben" — die regel bestaat dus, maar niets houdt een klant tegen die er 0 van 21 heeft, en hij merkt pas na het versturen dat er iets mist.

*Voorstel.* Geen harde poort (die reden is goed), maar een **tussenstap met gevolg**: "Bij 21 producten missen voor- en achterkant. Toch versturen? Dan starten we pas als alles binnen is en nemen we contact op." Twee knoppen: *Foto's toevoegen* (standaard) en *Toch versturen*. En in stap 5 bij Referentiemateriaal de echte stand: "18 van 21 compleet".

*Wat het oplevert.* Minder navragen per bestelling (jouw grootste tijdvreter) en een klant die niet verrast wordt door een mail "we missen nog…".

### 1.3 Stap 5 zegt "geen betaalformulier, link per mail" — de bedankpagina toont meteen "Rond de betaling af" (twee keer)

De tekst boven de vinkjes belooft dat de betaallink per mail komt en dat er met opzet geen betaalformulier staat. De bedankpagina laat daarna direct een Mollie-knop zien — **twee keer onder elkaar** — en Studio toont "Nu betalen". Dat is drie keer dezelfde boodschap in drie vormen, en de eerste spreekt de andere twee tegen. De dubbele knop is een bug: `init()` in `interactions.js` draait bij het laden én bij `astro:page-load`, en `initThankYou()` voegt de knop elke keer opnieuw toe zonder te kijken of hij er al staat.

*Voorstel.* Kies één verhaal. Direct kunnen betalen is beter voor conversie (de klant is er nú), dus: stap 5 zegt "Na het versturen kun je direct betalen, of later via de link in je mail; we beginnen zodra de betaling binnen is." Bedankpagina: één knop. Dubbele-knop-bug: één regel (`if (box.dataset.tyDone) return;`).

*Wat het oplevert.* Geen tegenstrijdige beloftes op het moment dat iemand zijn geld gaat overmaken, en minder "welke van de twee?"-vragen.

### 1.4 Bedankpagina: "Bevestiging verstuurd naar" toont geen adres maar de spamtekst

Onder het kopje staat "Na een paar minuten nog niets? Kijk in je spam…" — de spamnotitie — en het e-mailadres ontbreekt. Het kopje belooft een adres; de waarde is een zin. Daarnaast staat "Bekijk je bestelling — log in met het e-mailadres van deze bestelling, we sturen je een link" terwijl ik al ingelogd was.

*Voorstel.* Adres tonen (dat zit in de bestelling), spamtekst eronder in kleine letters; de inlogzin alleen voor wie níet is ingelogd.

*Wat het oplevert.* Kleine dingen, maar dit is de pagina die een klant screenshot en aan zijn collega stuurt.

### 1.5 Studio: de productnamen zijn weg — elk product heet "Product 1, 2, 3"

Ik typte "Test - Grijze tee", "Test - Hoodie zwart", "Test - Broek beige". In Studio heten ze Product 1, 2 en 3. De naam wordt wél gepost en wél opgeslagen (in `details_json`), en de zip en de studio-mail gebruiken hem — alleen `/account/orders` leest die kolom niet mee en labelt puur op `product_key`. Twee regels in `loadOrders()` en `productCard()`.

*Wat het oplevert.* De klant herkent zijn eigen producten; "je krijgt ze met dezelfde naam terug" (belofte in stap 2) klopt dan ook in Studio.

### 1.6 Studio-dashboard: "We plannen hem in" bij een onbetaalde bestelling

Dashboard-tekst bij mijn bestelling: "We hebben je bestelling en je bestanden binnen. We plannen hem in." Status Ontvangen, tijdlijn van vier stappen. Nergens: nog niet betaald. Dat staat alleen één klik verder op Bestellingen. Een klant die niet betaalt, denkt dat het loopt — en jij hebt een bestelling die nooit start.

*Voorstel.* Een eerste stap in de tijdlijn: **Wacht op betaling → Ontvangen → In productie → Nagekeken → Geleverd**, met de betaalknop ook op het dashboard zolang die stap open staat. `progressBlock()` leest `payment_status` nu niet.

*Wat het oplevert.* Sneller betaald, en de tijdlijn vertelt de waarheid.

### 1.7 Stap 4 bij minder dan 10 producten: "Bestellingen onder dat aantal…"

"Dat aantal" verwijst naar niets op dit scherm (de 10 staat alleen in stap 1). Alleen in het Nederlands; de Engelse regel zegt "under the threshold". Zie ook 2.5: deze stap is bij kleine bestellingen sowieso leeg.

### 1.8 Studio-dashboard: "Laatst geleverd" toont zes lege tegels

Zes grijze vakken zonder beeld. Het zijn echte geleverde bestanden waarvan de `<img>` niets tekent — meest waarschijnlijk bestanden zonder `filename`, die dan als `application/octet-stream` worden geserveerd en door `nosniff` niet als beeld worden gelezen (`serveAccountFile`/`mimeFor` in `account.js`). Te bevestigen door één tegel-URL direct te openen.

*Wat het oplevert.* Dit is de plek waar een terugkerende klant zijn resultaat ziet; zes lege vakken zeggen "hier is niets", terwijl er iets is.

### 1.9 Kleinere tekstfouten die de code liet zien

De hint "je krijgt nog steeds 4 beelden" bij de gratis extra foto staat op élke dienst, ook lifestyle (3 beelden). Twee commentaren en een knoptekst noemen nog "meer dan 30" terwijl het plafond per dienst 52/70/30 is. `ThankYouPage` toont de betaalvraag ook als er geen betaling is (contactformulier, checklist).

---

## 2 · Wat te druk is — en wat er weg kan zonder dat er informatie verdwijnt

### 2.1 Stap 1 is drie formulieren in één

Op één scherm: aantal (53 opties), totaal, een waarschuwing over complete setjes, "Boven 52 plannen we het samen", kanalen (zes kaarten met technische eisen: "RGB 255,255,255", "1.000px op de langste zijde, 1.600px om zoom aan te zetten", "1:1,44", "IPTC-eigenschap DigitalSourceType"), drie uitlegblokken daaronder, "Je krijgt jpg", achtergrond, twaalf modelgezichten, beeldverhouding en een levertijd-uitleg. Persona Tom (§4) haakt hier af; persona Mark leest alles en wordt er onzeker van.

Die technische eisen zijn **jouw** kennis — het bewijs dat je het weet — maar de klant hoeft ze niet te lezen om te kiezen. Wat hij moet weten past in één regel per kanaal: "Amazon — hoofdbeeld verplicht wit, wij regelen dat." De rest achter het vraagteken-notitieblok dat je op 21 augustus zelf als regel koos.

*Voorstel.* Kanaalkaart = naam + één regel + swatch. De drie uitlegblokken ("De achtergrond staat vast op zuiver wit", "Wil je ook je eigen achtergrond?", "Welk beeld vooraan hoort") worden één regel met een ?-blok. "Boven 52…" alleen tonen als iemand boven de 40 kiest. De setje-waarschuwing naar het ?-blok bij het aantal.

*Wat het oplevert.* Stap 1 wordt half zo lang zonder dat er iets verdwijnt, en de blik gaat naar de drie keuzes die ertoe doen: hoeveel, wie draagt het, welke vorm.

### 2.2 Een keuzelijst met 53 regels

"Hoeveel producten?" is een dropdown met 1 t/m 52 plus "meer dan". Op een telefoon is dat scrollen door een wiel. Persona Yusuf (40 producten) telt in de lijst.

*Voorstel.* Een getalveld met − en +, vier snelknoppen (1 · 5 · 10 · 20) en daaronder de staffel als vier regels: "1–4 → €89 · 5–9 → €65 · 10–19 → €51 · 20+ → €39". De prikkel "nog 2 producten en…" blijft.

*Wat het oplevert.* Sneller kiezen, en de staffel is in één oogopslag te zien in plaats van te ontdekken.

### 2.3 Stap 2 begint met twee schermen tekst voordat de eerste upload in beeld is

Eerst een uitlegblok met vier fotosoorten (elk twee alinea's), dan "Over het product" met twee uitgelegde vragen, dan pas de kaarten. Op mobiel zijn dat ruwweg twee volle schermen scrollen. De uitleg is goed; de plek niet.

*Voorstel.* De uitleg **in de kaart**: elk uploadvak krijgt één regel ("Recht van voren, vul het beeld") en een klein voorbeeldbeeld van hoe zo'n foto eruitziet — voorkant, achterkant, detail, gedragen. Dat is precies wat je vroeg: laten zíen in plaats van uitleggen. De lange versie blijft achter een ?-blok. "Waar is het van gemaakt" en "De exacte kleur" staan al in de kaart; het losse blok erboven kan weg.

*Wat het oplevert.* De klant ziet meteen wat hij moet doen; minder verkeerde foto's (de hoek en de afstand zie je in het voorbeeld); en de pagina is korter.

### 2.4 Uitleg staat vaak twee keer

"Vanaf 4 beelden per product — voor, achter, detail, op model" staat in de kop én in het dienstblok eronder. "Alle bedragen zijn excl. btw" staat naast het totaal én als aparte regel én als ?-blok én cursief eronder ("Dit rekent je browser uit…"). Kies er één per scherm.

### 2.5 Stap 4 is leeg bij minder dan 10 producten

Eén kader: "Deze bestelling heeft geen vastgezette leverdatum nodig. Standaard levertijd." En een knop Verder. Een stap waarin niets te kiezen is, is een klik voor niets.

*Voorstel.* Onder de 10 producten stap 4 overslaan: vier stappen, en de levertijd staat in de samenvatting ("Meestal 2–4 dagen"). Boven de 10 blijft de datumkiezer. Daar dan: de zes datumtegels hebben allemaal dezelfde onderregel "Data die we kunnen vrijhouden" — die regel kan één keer boven het raster; en zondag als eerste leverdag is opvallend (zondag 6 – maandag 7 september) — klopt dat met je agenda?

*Wat het oplevert.* Kleine bestelling: één klik minder, en geen stap die "leeg" voelt.

### 2.6 Stap 5 is twaalf regels tekst

De samenvatting is compleet maar toont niets. Persona Sanne wil zíen wat ze bestelt.

*Voorstel.* Boven de tabel een strook: de drie productthumbnails (de voorkant die ze zelf uploadden), het gekozen gezicht, een swatch van de achtergrond, en een kadertje in de gekozen verhouding. Daaronder de tabel, korter: kanalen, formaat en verhouding op één regel. De twee vinkjes blijven (juridisch nodig), maar de tweede kan korter: "Ik vraag VISUAILS nu te beginnen en weet dat ik na levering niet meer kan herroepen."

*Wat het oplevert.* Een klant controleert een beeld sneller dan een tabel, en fouten (verkeerd model, verkeerde foto) vallen hier op in plaats van na levering.

---

## 3 · Waar een foto helpt om te laten zien wat de klant koos

Je vroeg waar beeld meerwaarde heeft. Dit zijn de plekken waar nu een woord staat en een beeld beter werkt:

**Beeldverhouding.** De drie kaarten tonen nu een leeg grijs kader. Zet er hetzelfde catalogusbeeld in, uitgesneden op 1:1, 4:5 en 3:4. Dan ziet de klant wat "staand" met zijn product doet.

**Achtergrond.** Een swatch is een kleur; een swatch met een product erop is een keuze. Eén miniatuur (het T-shirt) op wit, gebroken wit en beige.

**Kanalen.** Per kanaal één voorbeeldbeeld: "zo ziet je hoofdbeeld eruit op Amazon" (packshot op wit) naast "zo op je eigen shop" (op eigen kleur).

**Stap 2, de vier fotosoorten.** Voorbeeldfoto's van een echte aanlevering: telefoonfoto van voorkant, achterkant, detail, gedragen — en daarnaast wat het wordt. Dit is de plek waar een foto het meeste scheelt in navragen.

**Stap 5.** Thumbnails van de eigen uploads en het gekozen gezicht (zie 2.6).

**Studio, per product.** Nu staat er een leeg vakje, "Product 1" en "Hier is nog niets voor geleverd". Toon de eigen voorkant als thumbnail en de productnaam; "Bekijk de foto's" wordt "Wat je stuurde" zolang er niets geleverd is.

**Je vaste look, lifestyle.** Een stijl (Glow, Dunes, Flash, Phone-made) is een beeld, geen woord. De rij lifestyle hoort een stijl-miniatuur te tonen naast het gezicht.

Het model-raster heeft dit al goed: twaalf gezichten met naam en twee woorden. Dat is de maat voor de rest.

---

## 4 · Vijf keer bestellen als iemand anders

**Sanne, 24, start een streetwear-merk, bestelt vanaf haar telefoon tussen twee dingen door.** Ze kiest 3 producten, scrolt langs de kanaalkaarten zonder te lezen, vindt de modellen leuk, en zit dan in stap 2 twee schermen te scrollen tot de eerste upload. Ze uploadt alleen voorkanten omdat de rest "optioneel" leek — de achterkant is verplicht, maar dat staat in dezelfde grijze stijl als de rest. Ze komt door stap 4 ("leeg?") en verstuurt. Bedankpagina: twee betaalknoppen, ze klikt de eerste. *Wat zij nodig heeft:* korte kaarten, voorbeeldfoto's in het uploadvak, de verplichte foto's visueel anders dan de optionele, een samenvatting met plaatjes.

**Mark, 47, verkoopt werkkleding via bol en Amazon, wantrouwt AI, leest alles.** Hij leest de kanaalkaarten en raakt onzeker: "1:1,44", "IPTC DigitalSourceType", "Amazon controleert dat automatisch" — moet híj daar iets mee? Hij zoekt een plek om te vragen en vindt alleen de WhatsApp-knop onderaan. Hij wil weten wat er gebeurt als een foto wordt afgekeurd door Amazon; dat staat er niet. *Wat hij nodig heeft:* één geruststellende regel per kanaal ("wij leveren volgens de eisen van Amazon en bol"), de specificaties achter een ?-blok, en één zin over wat er gebeurt als iets niet goed is (jouw revisieronde).

**Yusuf, 31, dropshipper, 40 producten, wil het vandaag af hebben en betaalt op prijs.** Hij scrolt door 53 opties, ziet €39 per product bij 40, en wil door. In stap 2 moet hij 40 kaarten vullen; de knop "Kopieer naar alle producten" helpt, maar 80 verplichte foto's is een middag. Hij kiest "Liever één hele map sturen" — dat is precies zijn manier van werken, en de tekst erbij zegt dat het "minder precies" is en dat je moet terugkomen met vragen. Hij verstuurt met 12 van 40 klaar en hoort daar niets over. *Wat hij nodig heeft:* een getalveld, de map-route als volwaardig pad met duidelijke mapnaam-regels (map = productnaam; voorkant.jpg/achterkant.jpg), en de tussenstap van 1.2 zodat hij weet dat productie pas start als alles er is. Eigenlijk is hij de klant voor wie "boven 20 → persoonlijk contact" bedoeld is.

**Elise, 38, marketingmanager bij een merk met 200 producten, bestelt namens iemand anders.** Ze wil een offerte kunnen doorsturen en een factuur met het juiste btw-nummer. Ze kiest "Meer dan 52" en komt in een formulier voor één product. Ze wil weten of ze een collega toegang kan geven tot Studio (nu: nee). *Wat zij nodig heeft:* het contactpad van 1.1, een "stuur deze samenvatting als offerte"-knop op stap 5, en later een tweede e-mailadres per account.

**Tom, 58, maakt leren tassen, niet handig met formulieren.** Hij begrijpt "SKU" niet, weet niet wat "beeldverhouding" is en waarom hij moet kiezen, en durft "Wij kiezen er een die bij je merk past" niet aan te klikken omdat het als een lege keuze voelt. De uitleg over stof en kleurcode (#1B3A2F) is voor hem een taal die hij niet spreekt. Hij belt liever. *Wat hij nodig heeft:* "Productnaam" zonder SKU, een aanbevolen keuze die al aanstaat (1:1 staat al goed), "Wij kiezen" als eerste tegel met een gezicht erop in plaats van een leeg vak, een telefoonnummer of WhatsApp-knop bovenaan de stroom, en de kleurvraag in gewone woorden ("bosgroen" mag, een code mag ook).

Wat de vijf delen: **niemand had de technische kanaalteksten nodig, iedereen had voorbeeldfoto's nodig, en drie van de vijf kwamen op een plek waar het formulier ze had moeten doorsturen naar jou.**

---

## 5 · VISUAILS Studio — Je vaste look

Wat er nu staat per dienst: Catalog "Fiye · Wit · 1:1 · Amazon, Onze eigen webshop", Lifestyle "Ava · Wit · 16:9", Video "Aaron · Wit". Bij het uitklappen toont elke dienst hetzelfde formulier: Wie het draagt, Waar het op staat (wit / gebroken wit / beige), Beeldverhouding (niet bij video), Kanalen (alleen bij catalog).

### 5.1 De achtergrond hoort alleen bij catalog

Je had gelijk: lifestyle en video tonen "Waar het op staat" en slaan een kleur op (`account.js`: kanalen en verhouding zijn per dienst afgeschermd, de achtergrond niet). In de bestelstroom zelf is dat al goed geregeld (`bgApplies = service !== 'lifestyle'`), dus de twee kanten spreken elkaar tegen. Weghalen bij lifestyle en video, en de opgeslagen "Wit" daar negeren.

### 5.2 Wat er per dienst wél hoort te staan

| Dienst | Wel | Niet | Erbij |
|---|---|---|---|
| Catalog | gezicht, achtergrond, verhouding, kanalen | — | eigen hex-kleur (kan in de bestelstroom wel, hier niet — inconsistent) |
| Lifestyle | gezicht, **stijl** (Glow / Dunes / Flash / Phone-made, met miniatuur), verhouding (4:5 standaard) | achtergrond, kanalen | één regel "moment of omgeving" als vaste voorkeur, optioneel |
| Video | gezicht, stijl (Motion / Lifestyle / Campaign), **verticaal of vierkant** | achtergrond | pas tonen als video bestelbaar is; nu is het een voorkeur voor iets wat niet te bestellen is |

De stijl is voor lifestyle wat de achtergrond voor catalog is: dé vaste keuze. Dat hij hier ontbreekt terwijl de achtergrond er wel staat, is het belangrijkste dat er aan deze pagina moet gebeuren.

### 5.3 Kleinere punten op deze pagina

De inleiding "wie je product draagt, en waar het op staat" klopt niet meer nu er ook verhouding en kanalen staan. De alinea "Dit zijn standaardinstellingen en geen regels…" is vijf regels voor één gedachte; "Dit zijn je standaardkeuzes — per bestelling kun je ervan afwijken" is genoeg. De rij per dienst met gezicht en swatch is goed; voeg voor lifestyle de stijl-miniatuur toe. "Je eigen modellen" met "KLAAR VOOR GEBRUIK" is helder; heeft een klant er geen, laat dan één tegel "Een eigen model laten maken → €450" zien in plaats van een lege sectie. Eén opslaan-knop per dienst is goed; laat na opslaan de rij dichtklappen met een korte bevestiging.

---

## 6 · De andere bestelformulieren — voorstel, niet gebouwd

Twee regels vooraf die voor alle diensten gelden. **Eén scherm per beslissing, en alles wat uit Je vaste look komt staat voorgevuld en ingeklapt** — dat werkt bij catalog al en is de reden dat een terugkerende klant in drie minuten klaar is. En **alleen vragen wat de productie verandert**; alles wat "leuk om te weten" is, gaat eruit (dat was ook je besluit bij de intake-vragen in augustus).

**Lifestyle (bestaat al in `OrderFlow`, met `StylePicker`).** Stap 1: aantal; stijl als vier beeldkaarten (Glow, Dunes, Flash, Phone-made) plus "Eigen look → gesprek"; gezicht; verhouding met 4:5 vooraf gekozen en de optie "één beeld breed voor een banner". Géén kanalen, géén achtergrond. Stap 2: dezelfde vier foto's, maar "gedragen" hier sterk aangeraden in plaats van optioneel (pasvorm is bij lifestyle het halve beeld). Eén vrije regel per bestelling: "Is er een moment of plek waar je merk bij hoort?" — optioneel, en het is de enige vrije tekst. Stap 3–5 als catalog. Weg: de vraag "wie draagt dit" als tekst (het gezicht is al gekozen) en de "wat we moeten weten"-tekstbox.

**Video (nu een aanvraagpagina, geen formulier — terecht zolang er geen voorbeelden zijn).** Als het bestelbaar wordt: soort (Motion / Lifestyle / Campaign, elk met een voorbeeldclip — zonder clip niet lanceren), aantal clips, verticaal of vierkant (9:16 vooraf), gezicht, dezelfde fotoset. Geen achtergrond, geen muziek- of tekstkeuze (jij levert stil en zonder tekst; dat staat op de pagina). Custom video blijft een gesprek.

**Hooks (pagina staat, nog niet bestelbaar).** Bewust geen keuzes: de klant stuurt de fotoset en een link naar zijn shop, jij kiest het format. Formulier = foto's + link + "welk product moet het meest opvallen" (één zin). Prijs vanaf €119 staat erbij; bestelknop pas als `KIND_IMAGES.hooks` een gewicht heeft.

**Merkmodel (€450, briefingformulier bestaat).** De acht vragen blijven; twee dingen erbij die het gesprek daarna korter maken: drie tot vijf referentiebeelden uploaden ("gezichten of sfeer die bij je merk passen — geen echte personen die we moeten nabootsen"), en leeftijd/looks als klikbare chips in plaats van vrije tekst (20–25 · 25–35 · 35–50 · 50+; tattoos ja/nee; enz.). Betaling na jouw akkoord op het voorstel, zoals nu.

**Custom look (gesprek eerst).** Geen prijsladder, geen aantal. Formulier = referentiebeelden (verplicht, minimaal 3), shoplink, drie vragen (voor welk moment, wat mag er niet in, wanneer moet het live) en een WhatsApp-knop. Daarna maak jij het voorstel.

**"Proefvisual" → "Probeer VISUAILS · €1".** Eens met je redenering: de klant krijgt een set (4 catalog of 3 lifestyle), geen visual, en "probeer VISUAILS" maakt nieuwsgierig naar wat er voor €1 komt. De naam staat op meer plekken dan de knop: `footCta` in `OrderFlow.astro`, de dienstnaam in `pricing.js` (`TEST_SAMPLE.nl.name`, waar `services.js` hem uit leest), de /test-sample-pagina, de bedankpagina, FAQ's en de homepage-sectie. Omdat `tests/nav.test.mjs` en `tests/promises.test.mjs` op woorden toetsen, eerst `npm run test:nav` en `test:promises` draaien na de hernoeming. De formulierkant van de proef: kind (catalog of lifestyle), dezelfde foto-eisen als een gewone bestelling, gezicht optioneel, geen kanalen en geen achtergrond (altijd wit) — dat is al zo, en dat moet zo blijven.

---

## 7 · In welke volgorde

Eerst wat een klant verkeerd stuurt en klein is om te maken: de dubbele betaalknop en de tegenstrijdige tekst in stap 5 (1.3), de productnamen in Studio (1.5), "dat aantal" (1.7), het adres op de bedankpagina (1.4), de achtergrond weg bij lifestyle en video (5.1). Dat is samen een ochtend.

Dan de twee dingen die jou werk besparen: het contactpad boven het maximum (1.1) en de tussenstap bij ontbrekende foto's (1.2). Een dag.

Dan het rustiger maken: kanaalkaarten inkorten en de uitleg achter ?-blokken (2.1), het getalveld (2.2), de uitleg in de kaart met voorbeeldfoto's (2.3, dit vraagt ook fotowerk: één echte aanlevering als voorbeeldset), stap 4 overslaan onder de 10 (2.5), de visuele samenvatting (2.6). Twee tot drie dagen, en de voorbeeldfoto's zijn maakwerk.

Daarna de betaalstap in de Studio-tijdlijn (1.6) en de lege tegels (1.8) — de eerste is een klein datamodel-besluit, de tweede is eerst meten welke van de oorzaken het is.

De andere formulieren (§6) pas nadat catalog zo staat; dan kopieer je een stroom die klopt in plaats van een die nog verandert.

## Opruimen

Testbestelling **VIS-NZDT-1I5** (3 producten, € 267 excl., onbetaald) annuleren in het adminportaal. Er is verder niets aangemaakt en niets betaald.
