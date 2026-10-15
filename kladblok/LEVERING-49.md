# Levering 49 — 15 oktober 2026

Alles uit afvinklijst 28 (de 14 kaarten op "doen", v28-start t/m v28-balk op a), je berichten van 08:12 tot 08:30 voor zover die niet al in 48b zaten, en de volledige controle daarna.

● = nieuwe of veranderde tekst die de klant ziet. Eerst NL, daaronder EN.

---

## 1 · /start: wat je kunt verwachten (v28-start a, werklijst 6)

Bovenaan een korte strook in drie stappen, daaronder drie rustige banden: Beeld, Video en Op maat.

● De strook
> Zo gaat het · Jij stuurt een paar foto’s — Drie telefoonfoto’s per product zijn genoeg. · Wij doen de rest — Vaak binnen een dag, soms een paar dagen. · Jij keurt goed — Beeld voor beeld, daarna alles in één keer downloaden.
> How it goes · You send a few photos — Three phone photos per product are enough. · We do the rest — Often within a day, sometimes a few days. · You approve — Image by image, then download everything at once.

● De band Video
> Video. Op aanvraag. — Kies een stijl en stuur een korte briefing; wij antwoorden met een prijs en een datum. · Vraag een video aan
> Video. On request. — Pick a style and send a short brief; we reply with a price and a date. · Ask about a video

● De band Op maat
> Op maat. Voor wie meer wil.
> Eigen look — Een look die alleen van jou is, gemaakt rond je merk. · Vraag een eigen look aan
> Jouw merkmodel — Eén gezicht voor je merk, door niemand anders gebruikt. · Meer over je merkmodel
> Abonnement — Elke maand een vast aantal credits, voor merken die vaak iets nieuws uitbrengen. · Bekijk de abonnementen (een abonnee ziet hier "Je abonnement")
> Made to fit. When you want more.
> Your own look — A look that is yours alone, built around your brand. · Ask for your own look
> Your Brand Model — One face for your brand, used by nobody else. · More about your Brand Model
> Plan — A fixed number of credits each month, for brands that release often. · See the plans (a subscriber sees "Your plan")

● Onder de prijs bij Beeld
> Of vanaf €… per product met een abonnement
> Or from €… per product with a plan

## 2 · Voorpagina "Drie soorten beeld": drie platte kaarten (v28-maken a, werklijst 7)

Geen 3D meer. Drie kaarten met beeld, naam, één zin, vanaf-prijs en knop; op de telefoon veeg je ze opzij.

● De drie zinnen
> Productfoto’s — Voorkant, achterkant, detail en op model, op de achtergrond die bij je merk past. · Bekijk productfoto’s
> Lifestyle — Je product in een sfeer: vier beelden in één look, klaar voor een carrousel. · Bekijk lifestyle
> Video — Een korte, verticale clip van je product, voor reels en je webshop. · Bekijk video
> Product photos — Front, back, detail and on model, on the background that suits your brand. · See product photos
> Lifestyle — Your product in a setting: four images in one look, ready for a carousel. · See lifestyle
> Video — A short, vertical clip of your product, for reels and your shop. · See video

## 3 · Stap 2: rechtzetten, opbouwen, nakijken (08:17 en 11:59, werklijst 40)

Stap 2 begint nu met 4,25 seconden handwerk, voordat er wordt uitgeknipt en afgewerkt. Het blijft handwerk en wordt geen "AI-ruis die oplost" (afvinklijst 24).

1. **Rechtzetten (0–1,5 s).** Je telefoonfoto (de broek schuin op de betonvloer) krijgt een transformatiekader met acht grepen. De muis pakt de greep rechtsonder en de foto kantelt, draait en rekt tot de broek recht staat, precies op de plek van het geleverde beeld. Dat is gemeten: de homografie tussen je foto en het geleverde beeld, uit de vier hoeken van de broek en daarna verfijnd op de omtrek (IoU 0,94). Die is omgezet in een CSS-transform in procenten en cqw, en doet daardoor op elke breedte hetzelfde.
2. **Opbouwen (1,45–2,35 s).** Een penseel met een ring zo groot als de kwast en een zachte rand werkt de rechtgezette foto in vijf halen over tot het geleverde beeld. Het beton wordt wit, de broek schoon.
3. **Nakijken (2,4–4,25 s).** Een loep die echt vergroot (2x) gaat langs de knoop, het stiksel van de zak en de kleur van de pijp. In de loep staat eerst je foto op die plek. Dan schuift er een scheidslijn overheen en staat ons beeld er: zelfde plek, zelfde detail. Per punt een vinkje, ook in het lijstje.

Daarna volgt alles van 48b: uitknippen, je achtergrond, de schaduw en "gelijk aan je set". Stap 2 duurt nu 12,1 s. Pauzeren werkt ook hier. Zonder script of bij minder beweging staat het eindbeeld er gewoon.

Bijvangst: in de wachtstand (voordat stap 2 speelt) stak de rechte uitsnede over de schuine telefoonfoto heen. Zo zag je één broek met een extra pijp, ook op je eigen schermafdruk. Nu staat daar alleen je foto.

Gemeten met de CPU 4x vertraagd: op 1440 zitten 2 van de 219 frames boven 50 ms (bij de start), op een telefoon geen. Op 320, 390 en 1440 past alles en loopt de loep niet buiten het vak. Het kleine beeld voor de loep (je foto, rechtgezet) is 11 kB. Alleen wat de loep laat zien zit erin; de rest is wit.

**Iets veranderen?** Alle vormen en tijden van de eerste 4,25 s komen uit één script:

    python scripts/maak-recht.py

Dat schrijft `src/data/maakRecht.js`, `src/styles/maak-recht.css` en `public/img/ba2-voor-front-recht.webp` (nodig: numpy, opencv, pillow, scipy).

● Het label op de plek van het bijschrift
> Rechtzetten · Opbouwen uit je foto · Nakijken tegen je foto
> Straighten · Build from your photo · Check against your photo

● Het lijstje in stap 2
> Nagekeken (Knoop · Stiksel · Kleur) · Uitgeknipt · Jouw achtergrond #EFEFEF · Schaduw 20% · Gelijk aan je set
> Checked (Button · Seams · Colour) · Cut out · Your background #EFEFEF · Shadow 20% · Matches your set

De andere animaties heb ik op weggelaten stappen nagelopen. Wat ik vond, staat als voorstel in afvinklijst 29.

## 4 · De bovenbalk: smaller, compacter en rustiger (v28-balk a, werklijst 28, en 13:02)

De balk is nu hoogstens 1080 px breed en staat in het midden (was over de hele breedte). Hij is 52 px hoog (was 66). De links zijn 14,5 px en de knoppen 36 tot 38 px hoog. Gemeten op 1920, 1440, 1280, 1181 en 1024 px, uitgelogd en ingelogd: alles staat op één regel en binnen de balk. Onder 900 px blijft het menu achter de knop.

Uitgelogd: "Inloggen" en één kleine knop naar de andere taal. Ingelogd: één rondje met je initiaal (de eerste letter van je merk, naam of e-mailadres). Daarachter staan Studio, de taal en Uitloggen. Het menu werkt als de andere drie: klik, Esc en klik-ernaast.

● Het menu
> Ingelogd als … · VISUAILS Studio · Taal NL EN · Uitloggen
> Signed in as … · VISUAILS Studio · Language NL EN · Sign out
● Voor schermlezers, op de knop
> Je account: VISUAILS Studio, taal en uitloggen
> Your account: VISUAILS Studio, language and sign out

## 5 · De ronde pijl bij tekstlinks (v28-hlink a, werklijst 35)

Een dunne rand in de lijnkleur van de site om het rondje.

## 6 · Je abonnement in vier tabs (v28-abotabs a, werklijst 24)

Overzicht (saldo, bestellen, maandset) · Credits (bijkopen, creditboek, wat een credit oplevert) · Facturen (termijnen en bijkopen) · Je plan (pauzeren, opzeggen). Na een bijkoop kom je op Credits, na pauzeren of opzeggen op Je plan. Oude links met `?tab=facturering` gaan naar Je plan. Op een telefoon staan de vier tabs op één regel.

● Tabs en de tab Facturen
> Overzicht · Credits · Facturen · Je plan
> Facturen van je abonnement — Elke termijn en elke bijkoop van extra credits. Facturen van losse bestellingen staan onder Facturen in het menu. · Al je facturen
> Leeg: Er is nog geen factuur van je abonnement. Je eerste komt zodra je eerste termijn betaald is.
> Overview · Credits · Invoices · Your plan
> Your plan invoices — Every term and every top-up of extra credits. Invoices for single orders are under Invoices in the menu. · All your invoices
> Empty: There is no plan invoice yet. Your first one arrives as soon as your first term is paid.
● Elders
> Je termijnfacturen staan onder de tab Facturen. · Bekijk ze
> Your plan invoices are under the Invoices tab. · See them

Een factuur voor bijgekochte credits heette in de lijst "Abonnement (credits)". Nu heet hij "Extra credits" (werklijst 17).

## 7 · Studio in het midden (werklijst 15)

Met de zijbalk dicht mag de kolom 1360 px breed worden (was 1200) en hij staat in het midden; de bovenbalk lijnt mee. Gemeten op 1024 tot 1920 px, op alle zes Studio-pagina's. Bijvangst: een melding stond op de telefoon 32 px van de rand in plaats van 16.

## 8 · Je foto's in Studio (werklijst 14)

Zelf doorlopen als klant met 12 producten. Onder "Wat jij stuurde" staat nu de knop "Foto’s toevoegen of wijzigen". Die opent dat product in Je foto's. Extra foto's kun je vervangen of verwijderen; bij verwijderen eerst "Ja, verwijder deze foto". De vaste vier (en de bijbestelde hoeken) niet: die staan vast zodra we ze hebben. Een nieuwe extra foto krijgt het laagste vrije nummer. De tijdlijn en de studiomail ("Foto's gewijzigd") noemen wat er vervangen of verwijderd is.

● Teksten
> Foto’s toevoegen of wijzigen · Extra foto (voorbeeld of detail) · Andere foto kiezen · Verwijderen · Ja, verwijder deze foto
> Voorkant, achterkant, detail en gedragen staan vast zodra we ze hebben. Klopt er een niet? Laat het ons weten, dan lossen we het op.
> Add or change photos · Extra photo (example or detail) · Choose another photo · Remove · Yes, remove this photo
> Front, back, detail and worn stay as they are once we have them. Is one not right? Let us know and we will sort it out.
● Wat er ontbreekt, in Studio, het formulier, de mails en /admin
> Product 2 · Hoodie zwart: geen achterkant (was: p2 Hoodie zwart: geen achterkant)

## 9 · Opnieuw bestellen met alle instellingen (werklijst 33)

In Studio staat bij elke catalog- en lifestylebestelling (niet bij de proef, een geannuleerde of video) "Opnieuw bestellen met alle instellingen". Het formulier neemt de kanalen, de achtergrond (ook per beeld), de verhouding, het model, de extra hoeken (met je eigen naam bij een eigen hoek), de notitie en het aantal outfits over. Bovenaan staat wat het overnam. Niet mee: voorrang, je producten, je foto's en je gegevens. Flat lay valt eruit (zie 10). De instellingen haalt het formulier op bij `/account/orders/<id>/instellingen`. Alleen de eigenaar krijgt ze.

● In Studio
> Opnieuw bestellen met alle instellingen
> Neemt alles van deze bestelling over: de achtergrond, de verhouding, het model, de kanalen en de extra hoeken. Je loopt het na voordat je bestelt; je producten en foto’s voeg je zelf toe. (lifestyle: de look, de verhouding, het model, het aantal outfits en je notitie)
> Order again with all settings
> Copies everything from this order: the background, the aspect ratio, the model, the channels and the extra angles. You check it before you order; you add your products and photos yourself.
● Bovenaan het formulier
> Instellingen overgenomen — Van VIS-2608-3312: 2 kanalen, de achtergrond, de verhouding, het model en 3 extra hoeken (Binnenkant, Driekwart, Binnenkant van de kraag). Loop ze na voordat je bestelt. Je producten en foto’s voeg je zelf toe; voorrang staat uit. · Begrepen
> Settings copied — From VIS-2608-3312: 2 channels, the background, the aspect ratio, the model and 3 extra angles (Inside, Three-quarter, Binnenkant van de kraag). Check them before you order. You add your products and photos yourself; priority is off. · Got it
> Als het ophalen mislukt: De instellingen van die bestelling konden we niet ophalen. Je kiest ze hieronder gewoon zelf.
> If fetching fails: We could not fetch the settings of that order. Simply choose them below yourself.

## 10 · Extra hoeken: niets dat al in je set zit (werklijst 32)

Flat lay is uit de keuze: die zit al in de standaardset. Oude bestellingen met flat lay blijven gewoon leesbaar in /admin en de werkmap. "Los detail" heet nu "Tweede detail": het las als hetzelfde beeld als het detail in je set.

● De hoek
> Tweede detail — Nog één naast het detail in je set: een rits, een zool, een knoop, beeldvullend.
> A second detail — One more next to the detail in your set: a zip, a sole, a button, filling the frame.

## 11 · Een foto een andere achtergrond geven (werklijst 27)

In stap 1, onder de achtergrond, staat een uitklapper met een keuze per beeld (met de schets op die kleur). Je kunt ook op een tegel in "Wat je krijgt" klikken: die tegels staan nu in de kleur van hun beeld. Alleen de drie aanbevolen kleuren. Kies je bol, Amazon of Zalando, dan blijft de voorkant wit. De server houdt alleen geldige keuzes: een aanbevolen kleur, op een vak of een gekozen hoek, anders dan de hoofdkleur. /admin toont een rij "Per beeld", de werkmap krijgt `achtergrond_<vaknummer>` in de INSTELLINGEN-regel, en het Photoshop-script vult dat vak met die kleur. De bevestiging en de samenvatting in stap 5 noemen het.

● In stap 1
> Een foto een andere achtergrond geven (optioneel)
> Elk beeld krijgt de achtergrond hierboven. Wil je er één anders, bijvoorbeeld de foto op een model op beige? Kies het hier.
> Zoals de rest · De voorkant blijft wit: dat eist de marktplaats die je koos.
> Give one photo a different background (optional)
> Every image gets the background above. Want one different, for example the on-model photo on beige? Choose it here.
> Same as the rest · The front stays white: the marketplace you chose requires it.
● In de bevestiging
> Per beeld — Op een model: beige · Driekwart: gebroken wit
> Per image — On a model: beige · Three-quarter: off-white

## 12 · De tips (v28-tips a)

Zeven tips, één tegelijk, altijd met "Begrepen" en een kruisje (in het formulier sluit Esc hem ook). Ze staan in de pagina en dekken nooit een knop af. Wat je wegklikt, komt niet terug: in het formulier via de browser (`vis-tips`), in Studio en op de privélink via een cookie (`vis_tips`), want daar draait geen script. Het cookiebeleid (NL en EN) noemt beide.

● De tips
> Formulier, na je eerste kleurkeuze: Tip: je kunt ook één foto een andere achtergrond geven, hieronder of door op een beeld in “Wat je krijgt” te klikken. Helemaal optioneel.
> Stap 2: Tip: de foto’s die we nodig hebben staan per product bovenaan. Een extra foto mag erbij, maar hoeft niet.
> Stap 5 (abonnee): Tip: met credits betaal je je producten. Kies je voorrang, een outfit of een eigen look met toeslag, dan betaal je deze bestelling via Mollie.
> Studio, eerste bezoek: Welkom in VISUAILS Studio — Bij Bestellingen volg je elke bestelling, van je foto’s tot de levering. · Als je beelden klaar zijn, keur je ze per beeld goed, of vraag je één revisieronde. · Bij Je vaste look leg je je achtergrond, verhouding en model vast voor elke volgende bestelling.
> Studio, eerste levering: Tip: keur je beelden per stuk goed. Klopt er iets niet, vraag dan één revisieronde aan: alles wat je wilt aanpassen, in één keer.
> Studio, abonnement: Tip: zolang je abonnement loopt, spaar je tot drie maanden aan credits. Je bestelt via het gewone formulier en betaalt in stap 5 met credits.
> Privélink: Tip: deze link opent je bestelling zonder inloggen. Deel hem alleen met wie je vertrouwt.
> Form, after your first colour: Tip: you can also give one photo a different background, below or by clicking an image in “What you get”. Entirely optional.
> Step 2: Tip: the photos we need are at the top of each product. An extra photo is welcome, but not required.
> Step 5 (subscriber): Tip: credits pay for your products. Choose priority, an outfit or your own look with a surcharge, and you pay this order through Mollie.
> Studio, first visit: Welcome to VISUAILS Studio — Under Orders you follow every order, from your photos to delivery. · When your images are ready, approve them one by one, or ask for one revision round. · Under Your look you fix your background, aspect ratio and model for every next order.
> Studio, first delivery: Tip: approve your images one by one. Is something not right? Ask for one revision round: everything you want changed, in one go.
> Studio, plan: Tip: while your plan runs, you save up to three months of credits. You order through the usual form and pay with credits in step 5.
> Private link: Tip: this link opens your order without signing in. Only share it with people you trust.
> Knoppen: Begrepen · Tip sluiten / Got it · Close tip

## 13 · De factuur: nieuw uiterlijk, hetzelfde systeem (werklijst 16)

Alleen `src/lib/invoicePdf.js`, en daarin alleen het tekenen. Nummering, bedragen, btw en de teksten zijn niet aangeraakt. Het woordmerk staat als vector in de kop (dezelfde vorm als `woordmerk.js`), "FACTUUR" in violet. Partijen en gegevens staan op een lila vlak, de tabelkop op een lichte band met haarlijnen per regel, en het totaal in violet op een lila vak. De voorbeelden heb ik met nepgegevens gemaakt.

## 14 · De favicons uit het logopakket (werklijst 41)

`public/favicon*.png`, `favicon.ico`, `favicon.svg` en `apple-touch-icon.png` zijn nu een kopie uit `images/Logo/visuails-logo-nieuw/favicon`. `scripts/make-favicons.mjs` maakt ze niet meer; hij stopt tenzij je `OUDE_FAVICONS=1` zet.

## 15 · Kleine teksten breder, korte koppen op één regel (12:21)

De regel van 5 tot 7 woorden per regel bleef voor ledes en gewone alinea's. Maar de maat stond in em, waardoor kleine tekst ook een smalle kolom kreeg. Een noot van 14 px stond op 210 px, met 4 à 5 woorden per regel (gemeten op alle pagina's: mediaan 5,0, 675 blokken op 1440). Nu krijgt tekst van 15,5 px en kleiner (noten, bijschriften, de zin onder een kaart, de voet, formulierhints) 23 em (EN) / 26 em (NL). Dat zijn zo'n 9 woorden per regel, zoals op de legal pages. Tekst vanaf 16 px houdt 15 / 16,5 em. Het is één regel in hal.css, zonder lijst klassen (zie de kop "KLEINE TEKST" daar). Na de wijziging opnieuw gemeten: mediaan 6,3 woorden per blok (bij 2 regels telt de halve laatste regel mee; volle regels zitten op 8 à 9). Op 320, 390, 1024 en 1440 is geen enkele pagina breder geworden dan het scherm.

Koppen: ik heb elke kop gemeten die in twee tonen over twee regels staat (72 koppen, op 1440 en 390). Alleen Contact ("Get in touch." / "Neem contact op.") en de FAQ ("Questions, answered." / "Vragen, beantwoord.") passen op 1440 én 390 op één regel. Die staan nu op één regel, nog steeds in twee tonen. De andere passen niet en blijven zoals ze zijn. De kopjes in de linkerkolom van de legal pages breken expres in die smalle kolom.

● De openingstijden in de WhatsApp-kaart op Contact (in één regel, en 09:00–20:00 breekt niet meer midden in de tijd)
> Ma–vr 08:00–20:00 · za–zo 09:00–20:00 (Nederlandse tijd)
> Mon–Fri 08:00–20:00 · Sat–Sun 09:00–20:00 (Dutch time)

## 16 · De fotogids (pdf) in de nieuwe stijl (12:32)

`scripts/lib/fotogids-html.mjs` is opnieuw opgemaakt in de stijl van de site: Urbanist, het woordmerk als vector (uit `woordmerk.js`, onveranderd), een lila pil "Fotogids", de kop in twee tonen, de vier vakken op een nevelvlak, de blokken als witte kaarten met ronde hoeken en de vijf vragen op het violette vlak. Weg zijn de zwarte balk, de hoofdletters en de monospace. De woorden zijn niet veranderd: die komen uit `src/data/fotogids.js`, dezelfde bron als de pagina en de mail. Nog steeds één A4, geen letter onder 8,7 pt, en elke tekst minstens 4,5:1. Het lichte deel van de kop is op papier daarom #6A6880 en niet het #807E97 van de site, want dat haalt op wit 3,9:1. NL 187 kB, EN 176 kB. Opnieuw maken: `node scripts/handleiding.mjs`.

## 17 · Vragen uit afvinklijst 28

**k-klant: zien klanten zonder abonnement credits?** Nee. Nagelopen op alle pagina's, uitgelogd en als klant zonder abonnement: nergens credits. Een regel "of 4 credits met een abonnement" bij de bestelknoppen raad ik af, want een credit zegt een niet-abonnee niets. Daarom staat er op /start bij Beeld nu een regel in euro's: "Of vanaf €23,32 per product met een abonnement" (catalog; lifestyle €29,14). Dat bedrag komt uit het voordeligste abonnement (`aboVanafPerProduct()` in pricing.js), zodat het meegaat als de prijzen veranderen.

---

## Volledige controle

**De hele site, pagina voor pagina.** Alle 95 pagina's, plus Studio als abonnee (18 schermen) en als klant zonder abonnement (7), het adminportaal (18) en vier privélinks. Elk op 390 en 1440 px, met alle 1.416 interne links nagelopen, en de ankers op de doelpagina. Daarnaast contrast en toegankelijkheid gemeten met axe (op 1440, de voorpagina's ook op 390), en overloop op 320, 390, 1024 en 1440.

- Geen scriptfouten en geen kapotte beelden. Geen pagina scrolt opzij. Geen kapotte interne link en geen anker dat nergens heen gaat. (In de testomgeving geven de factuur-pdf's een 404, omdat daar wel de facturen in de database staan maar de pdf's niet in de opslag. Live staan ze er wel.)
- **Hersteld: dubbele id's.** Op de verwerkersovereenkomst stond `id="sub-processors"` (NL `subverwerkers`) twee keer. In Studio stond `id="fb-h"` bij elke afgeronde bestelling, dus dubbel zodra er twee waren. Elk blok heeft nu een eigen id.
- **Hersteld: contrast onder 4,5:1.** Op /how-it-works waren de gedimde dagen in de agenda 3,7:1, nu 5,0:1. Op /start/plan stond "/ mnd" op de gekozen kaart op 4,46:1, nu ruim erboven. In /admin/planning stonden de voorbije dagen op 2,2:1, nu op de gewone kleur; alleen de balkjes zijn nog zwak.
- **Hersteld: vijf beelden zonder AVIF** (catalog-raster in vier breedtes en bg-staal-vrij). Die gingen als losse webp de deur uit, ruwweg twee keer zo zwaar. De build telde daarbij vijftien svg's als "ontbrekend". Die melding telt nu alleen webp's en is leeg.
- **Abonnement doorgelopen** (werklijst 11): bijkopen en betalen, Facturen, pauzeren, hervatten, bespreken, opzeggen, plus alle mails. Wat ik heb aangepast:
  - De tip "zolang je abonnement loopt, spaar je…" staat er niet meer bij een pauze of na het opzeggen.
  - De regel "zolang je abonnement loopt, vervallen je credits niet" staat er dan ook niet meer. Het blok erboven zegt al hoe lang ze geldig blijven.
  - In de studiomail "Credits bespreken" staat nu "Pro · gepauzeerd" in plaats van "studio · paused".
  - Hervatten lukte in de testomgeving niet. Dat komt doordat het testabonnement geen Mollie-mandaat heeft; een echt abonnement heeft dat wel, en de toets dekt het.
  - Wat de route betreft: na een bijkoop kom je op Credits, na een pauze of opzegging op Je plan. De bevestiging staat steeds bovenaan en de mail gaat mee.

## Testreeks

- `node scripts/testreeks.mjs`: 248 stappen. Eerste ronde 246 goed. Twee toetsen vielen om door bewuste wijzigingen uit deze levering, niet door fouten:
  - `test:vanaf`: /start toont sinds k-klant ook "Of vanaf €23,32 per product met een abonnement". De toets liet alleen de onderste trede van de ladder toe. Nu loopt hij die regel apart na: het bedrag moet gelijk zijn aan `aboVanafPerProduct()` (39/39).
  - `test:ronde9`: de toets zoekt de aanroep `notifyFotosToegevoegd(env, { orderId, count: aantal` op één regel. In account.js staat hij weer zo (alleen de opmaak, 174/174).
- Daarna opnieuw gebouwd en beide toetsen plus nasturen-per-vak nagelopen: alles goed. Stand: 248/248.

## Uitrollen

OPRUIMEN.bat is niet nodig. Draai UITROLLEN.bat. Er zijn geen migraties. Nieuw endpoint: `GET /account/orders/<id>/instellingen` (achter je Studio-sessie, alleen de eigenaar).
