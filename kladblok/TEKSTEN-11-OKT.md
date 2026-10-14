# Teksten van 11 oktober 2026 (NL en EN, met plek)

Naslag bij afvinklijst 4. Per bouwer: F3 (bestelformulier), K5 (formaten, herkomsttag, privacy, proef, lookpagina's), J3 (voorwaarden, weer openen). Onderaan wat de hoofdbouwer na het samenvoegen nog aanpaste.

## Teksten F3 — bestelformulier stap 1–3 en 1.04 (11 okt 2026)

Elke nieuwe of gewijzigde klanttekst: plek · NL · EN. Woorden staan in `src/data/shots.js` (COPY), `src/components/order/OrderFlow.astro` (FORM/PIPE), `src/components/order/ModelKeuze.astro`, `src/data/contactvoorkeur.js` en de twee cookiebeleidpagina's.

### Stap 1

**1. Uitleg onder "Wie draagt het?"** (ModelKeuze.astro, staat nu in stap 1; catalog en lifestyle)
- NL: Kies een gezicht, of tik op het VISUAILS-vak: dan kiezen wij er een die bij je merk past. Per product kun je in de volgende stap afwijken.
- EN: Pick a face, or tap the VISUAILS tile and we choose one that fits your brand. You can change it per product in the next step.

**2. Naam van stap 2 in de rail** (OrderFlow FORM.nl.rail) en in "Zo werkt het" op /start (StartPage.astro)
- NL: Je foto’s *(was: Materiaal)*
- EN: Your photos *(ongewijzigd)*

### Stap 2 — één kaart per product

**3. Regel boven de kaarten** (shots.js `stapLead`)
- NL: Per product één knop: kies de 3 of 4 foto’s tegelijk. Voorkant, achterkant en detail zijn nodig, de draagfoto is optioneel.
- EN: One button per product: pick its 3 or 4 photos at once. Front, back and detail are needed; the worn photo is optional.

**4. De knop op elke kaart** (shots.js `kies` / `kiesNog`)
- NL: Kies de foto’s van dit product · zodra er een foto staat: Foto’s bijzetten
- EN: Choose this product’s photos · once a photo is in: Add photos

**5. Onder de knop, alleen op de eerste kaart** (shots.js `kiesHint`)
- NL: Kies ze in deze volgorde: voorkant, achterkant, detail, gedragen. Staat er een in het verkeerde vak? Wissel hem eronder.
- EN: Pick them in this order: front, back, detail, worn. Landed in the wrong slot? Swap it underneath.

**6. Wisselkeuze per gevuld vak** (shots.js `wissel`, `wisselMet`, `wisselLabel`)
- NL: Wissel… · met achterkant (enz.) · voor schermlezers: Wissel voorkant met een ander vak
- EN: Swap… · with back (etc.) · for screen readers: Swap front with another slot

**7. Bij elk vak, alleen op de eerste kaart: de regel uit shots.js `regel`** (door de vorige bouwer klaargezet, nu voor het eerst te zien). Bij de draagfoto met de aanname erachter (`zonder`), bij het detail met de tip met het witte vel (`tip`, dezelfde zin als in `how`):
- NL voorkant: Plat op een lege vloer of tegen een deur, helemaal in beeld, bij daglicht.
- NL achterkant: Zelfde plek en licht, product omgedraaid.
- NL detail: Het logo, de print of het label — wat in je beelden moet kloppen. Geen logo? Dan de stof. Tip: leg een wit vel printpapier half in beeld; dan zien we welke kleur het licht geeft.
- NL gedragen: Laat zien hoe het valt. Zonder draagfoto gaan we uit van een normale, rechte pasvorm.
- EN front: Flat on a clear floor or against a door, fully in frame, in daylight.
- EN back: Same spot and light, product turned over.
- EN detail: The logo, the print or the label — whatever has to be right in your images. No logo? Then the fabric. Tip: put a sheet of white printer paper half in the frame; it shows us what colour the light adds.
- EN worn: Show how it hangs. Without a worn photo we assume a regular, straight fit.

**8. Soort product op de kaart** (shots.js `soortKies`, `soort`)
- NL: Kies een soort *(eerste optie)* · voor schermlezers: Soort product — Product 1
- EN: Pick a kind · for screen readers: Kind of product — Product 1

**9. In "Meer over dit product": erbij in beeld** (shots.js `erbijH`, `erbijHint`, `erbijGeen`, `erbijEerst`; de woorden komen uit het weggehaalde "Wat je opstuurt")
- NL kop: Erbij in beeld
- NL uitleg: Wordt niet als product gefotografeerd en kost niets. Zit er een logo op? Dat halen we weg. Laat je het leeg, dan kiezen wij.
- NL als er niets bij kan: Bij deze soort product staat er verder niets in beeld.
- NL zonder soort: Kies eerst de soort product; dan zie je wat er nog bij in beeld kan.
- EN heading: Alongside in the photo
- EN hint: Not photographed as a product, and free. Has a logo on it? We remove it. Leave it empty and we choose.
- EN nothing fits: With this kind of product nothing else is in the frame.
- EN no kind yet: Pick the kind of product first; then you see what can go alongside it.

**10. Tussenscherm bij lege verplichte vakken (2.05)** (ProductUploader + shots.js). De regels per product komen uit `ontbrekendRegels()` ("p2 Hoodie: geen achterkant, geen detail"); de zin eronder is de bestaande `laterLead`.
- NL kop zonder enige foto: Je hebt nog geen foto’s gekozen
- NL knoppen: Nu toevoegen · Later in VISUAILS Studio *(was: Foto’s toevoegen · Toch versturen)*
- EN heading with no photo at all: You have not chosen any photos yet
- EN buttons: Add them now · Later, in VISUAILS Studio *(was: Add the photos · Send without them)*

### Stap 3

**11. Contactvoorkeur** (contactvoorkeur.js; ook op het abonnementsformulier /plans, dat dezelfde woorden leest)
- NL: E-mail · Telefoon of WhatsApp *(was: WhatsApp)*
- EN: Email · Phone or WhatsApp *(was: WhatsApp)*

### 1.04 — de bestelling waar je mee bezig was

**12. Blok bovenaan het formulier** (OrderFlow FORM.concept en PIPE.concept)
- NL kop: Je was bezig met een bestelling
- NL regel: {dienst} · {n} producten · {n} foto’s — bv. "Catalogsets · 3 producten · 7 foto’s" (1 product · 1 foto · nog geen foto’s)
- NL als er foto's weg zijn: Eén foto is niet meer bij ons; zet die opnieuw neer. / {n} foto’s zijn niet meer bij ons; zet die opnieuw neer.
- NL noot: Je gegevens bewaren we niet; die vul je straks opnieuw in.
- NL knoppen: Verder gaan · Opnieuw beginnen
- EN heading: You were in the middle of an order
- EN line: {service} · {n} products · {n} photos (1 product · 1 photo · no photos yet)
- EN gone: One photo is no longer with us; add it again. / {n} photos are no longer with us; add them again.
- EN note: Your details are not kept; you fill them in again afterwards.
- EN buttons: Carry on · Start again

**13. Cookiebeleid, onder "In je browser bewaard, niet als cookie"** (src/pages/nl/cookie-policy.astro en src/pages/cookie-policy.astro; sleutel en termijn uit cookies.js)
- NL: Eén notitie blijft langer staan: begin je een bestelling maar plaats je hem nog niet, dan onthoudt dit apparaat je keuzes — look, aantal, opties en de namen van je producten — en welke foto’s er al bij ons staan, zodat je verder kunt waar je was (vis-bestelling). Je naam, e-mailadres, telefoon en adres staan daar niet in. Die notitie blijft 6 dagen staan en verdwijnt zodra je de bestelling plaatst of opnieuw begint.
- EN: One note stays longer: if you start an order but do not place it yet, this device remembers your choices — look, number, options and your product names — and which photos are already with us, so you can carry on where you were (vis-bestelling). Your name, email address, phone and address are not in it. That note stays for 6 days and is gone as soon as you place the order or start again.

### Weg uit stap 2 (ter info, geen nieuwe tekst)
Het tippaneel, de uitklapgids "Wat we vragen, en waar elke foto voor is" (de pdf-link staat er nog los), "Wat je opstuurt — en wat er nog bij kan" met de uitleg over styling, "Sla deze over" / "Toch toevoegen", "Vorige" / "Volgend product" / "Product 1 van 5 · 0 af", de zin "Stuur je alles mee, dan kunnen we meteen beginnen…", en de uitleg "Klik op een product om er meteen heen te gaan" in het tussenscherm.

## Teksten K5 (11 okt 2026)

Per tekst: plek · NL · EN. Alleen nieuwe of gewijzigde klantteksten.

### 1 · Andere formaten (k401)

**Studio, bestelkaart (geleverde bestelling, onder de map "Downloaden (zip)")** — src/lib/formaten.js
- Kop + uitleg
  - NL: **Andere formaten** JPG is de standaard. PNG kies je voor een transparante achtergrond, WebP laadt snel op je eigen site.
  - EN: **Other formats** JPG is the default. Choose PNG for a transparent background; WebP loads fast on your own site.
- Knoppen
  - NL: Ook als PNG · Ook als WebP
  - EN: Also as PNG · Also as WebP
- Na de klik (de knop wordt een regel)
  - NL: PNG aangevraagd · 11 okt — na "Klaar" in /admin: PNG geleverd · 12 okt
  - EN: PNG requested · 11 Oct — after "Klaar": PNG delivered · 12 Oct
- Melding na de klik
  - NL: Genoteerd: we maken de beelden van deze bestelling ook als PNG.
  - EN: Noted: we will also make the images of this order as PNG.
- Melding bij een fout
  - NL: Dat lukte nu niet. Probeer het later opnieuw, of mail ons het kenmerk van je bestelling.
  - EN: That did not work just now. Try again later, or email us your order reference.

**LEESMIJ.txt / README.txt in de leverzip, deel 2 "Welk formaat pak je waarvoor"** — src/lib/delivery.js (alleen als png en webp er niet allebei al in zitten; niet bij video of de proef)
- NL: Ook PNG of WebP nodig? Vraag het aan bij deze bestelling in Studio, op visuails.com/account.
- EN: Need PNG or WebP as well? Request it on this order in Studio, at visuails.com/account.

**/admin/formaten** (alleen NL, geen klanttekst): "Leverbeelden zijn jpg. Een klant kan op een geleverde bestelling in Studio ook PNG of WebP aanvragen …" en de chip "Formaten · N" op het dashboard.

### 2 · Herkomsttag (kiptc = a)

**/ai-act, "Wat je van ons krijgt" → "Een markering in het bestand"** — src/components/AiActPage.astro (de waarde komt uit src/lib/iptc.js)
- NL: In de foto’s en video’s die we leveren zetten we de IPTC-eigenschap DigitalSourceType, met de waarde trainedAlgorithmicMedia: een machineleesbare regel die zegt dat het beeld door een AI-model gemaakt is. Platforms en zoekmachines kunnen die lezen. Mist een geleverd bestand de markering, laat het ons weten; dan leveren we het opnieuw, met markering. Wat die markering níét doet, staat hieronder bij “Wat wij níét beweren”.
- EN: In the photos and videos we deliver we write the IPTC property DigitalSourceType, with the value trainedAlgorithmicMedia: a machine-readable line saying the image was made by an AI model. Platforms and search engines can read it. If a delivered file is missing the marking, tell us and we deliver it again, with the marking. What the marking does not do is set out below, under “What we do not claim”.

**/editions, "Allebei met AI gemaakt, en dat staat in het bestand"** — src/components/EditionsPage.astro
- NL: Elk bestand draagt een machineleesbare herkomsttag: “door een AI-model gemaakt”, dezelfde waarde als elke levering van ons. De zichtbare vermelding … (rest ongewijzigd)
- EN: Every file carries a machine-readable provenance tag: “made by an AI model”, the same value as every delivery of ours. The visible disclosure … (rest unchanged)

**LEESMIJ/README in de zip van een videobestelling** — src/lib/delivery.js
- NL: Ze zijn met AI gemaakt. In de video's staat dat ook als machineleesbaar gegeven (…) — bij foto's blijft "In de foto's".
- EN: They were made with AI. The videos carry that as machine-readable data too (…) — for photos "The photos" stays.

### 3 · Privacy en verwerkersovereenkomst

#### VOOR AFVINKLIJST 4

Lucas leest deze zinnen nog na. Ze staan al op de pagina's (privacy §5 en §6, verwerkersovereenkomst §8 en §12, NL en EN) en in het register. **Let op:** §7 van de voorwaarden (terms) zegt nog "ten hoogste twaalf maanden in ons eigen archief"; die pagina's doet J3, dus die zin moet daar nog mee (zelfde tekst als privacy §6 hieronder).

**Privacy §6 · Bronmateriaal** — src/pages/privacy.astro, src/pages/nl/privacy.astro
- NL: de productfoto’s, stijlreferenties en andere bestanden die je uploadt, worden 90 dagen na het afsluiten van je bestelling uit onze opslag verwijderd. Een eigen kopie van je productfoto’s en stijlreferenties bewaren we zolang je klantaccount bestaat, zodat een nieuwe bestelling dezelfde look houdt: tot 2 jaar na je laatste bestelling. Wil je die eerder weg? Mail ons vanaf het adres van je account, dan verwijderen we hem; een reden hoef je niet te geven. Een nieuwe bestelling kan daarna wel anders uitvallen dan je eerdere look.
- EN: the product photos, style references and other files you upload are deleted from our storage 90 days after your order closes. We keep our own copy of your product photos and style references for as long as your customer account exists, so that a new order keeps the same look: up to 2 years after your last order. Want it gone sooner? Email us from the address of your account and we delete it; you do not need to give a reason. A new order may then turn out differently from your earlier look.

**Privacy §6 · Geleverde visuals**
- NL: je afgeronde visuals staan 90 dagen na levering in VISUAILS Studio om te downloaden; daarna worden ze daar verwijderd. Een kopie van de visuals die wij maakten, bewaren we zonder einddatum in ons eigen archief, zodat we je look gelijk kunnen houden en kunnen blijven verbeteren. Dat is ons werkarchief en geen back-up voor jou, dus bewaar zelf ook een kopie. Wil je onze kopie weg? Mail ons vanaf het adres van je account, dan verwijderen we hem, ook uit dat archief; een reden hoef je niet te geven. Eén uitzondering: visuals waarop een echt, herkenbaar persoon staat — bijvoorbeeld je eigen model, of iemand op een draagfoto — bewaren we alleen zolang je klantaccount bestaat.
- EN: your finished visuals stay in VISUAILS Studio to download for 90 days from delivery; after that they are removed there. We keep a copy of the visuals we made in our own archive, with no end date, so that we can keep your look consistent and keep improving it. That is our working archive, not a backup for you, so keep your own copy. Want our copy gone? Email us from the address of your account and we delete it, from that archive too; you do not need to give a reason. One exception: visuals showing a real, recognisable person — your own model, for example, or someone in a worn photo — we keep only for as long as your customer account exists.

**Privacy §6 · Mail en WhatsApp (nieuw)**
- NL: de mails en WhatsApp-berichten die we met je uitwisselen, bewaren we 2 jaar na ons laatste contact, net als je account; daarna verwijderen we ze.
- EN: the emails and WhatsApp messages we exchange with you are kept for 2 years after our last contact, as with your account, and then deleted.
- (Weg: "Correspondentie over een bestelling bewaren we zolang die nuttig is …" / "Correspondence about an order is kept for as long as it is useful …")

**Privacy §6 · Back-ups**
- NL: eens per week maken we een kopie van onze database, en we bewaren de 4 meest recente; een oudere kopie die we opruimen, staat daarna nog tot 30 dagen in de prullenbak van Google Drive. Wat we verwijderen, is daardoor uiterlijk na 9 weken ook uit de back-ups verdwenen.
- EN: once a week we make a copy of our database, and we keep the 4 most recent copies; an older copy we clear out then sits in the Google Drive bin for up to 30 days. Something we delete is therefore gone from the back-ups too after 9 weeks at the latest.
- (Het getal komt uit retention.js: 4 × 7 + 30 = 58 dagen, naar boven afgerond 9 weken. Lucas koos "8 weken"; zie de vraag in het verslag.)

**Verwerkersovereenkomst §12 · Teruggave en verwijdering** — src/pages/data-processing-agreement.astro, src/pages/nl/data-processing-agreement.astro
- Aanloop NL: … Voor onze eigen kopieën, in onze mailbox en op onze werkmachine, gelden de termijnen hieronder; wat wij op het platform van Magnific hebben gegenereerd, verwijderen wij binnen dezelfde termijn met de hand; Resend bewaart verzonden mail 30 dagen.
- Aanloop EN: … Our own copies, in our mailbox and on our workstation, follow the periods below; what we generated on Magnific’s platform, we delete by hand within the same period; Resend keeps sent email for 30 days.
- NL materiaal: 90 dagen nadat je bestelling is afgesloten, daarna uit onze opslag verwijderd. Een eigen kopie van je productfoto’s en stijlreferenties bewaren wij zolang je klantaccount bestaat, tot 2 jaar na je laatste bestelling, zodat een nieuwe bestelling dezelfde look houdt.
- EN material: 90 days after your order closes, then deleted from our storage. Our own copy of your product photos and style references we keep for as long as your customer account exists, up to 2 years after your last order, so that a new order keeps the same look.
- NL beelden: 90 dagen in VISUAILS Studio, zodat je ze in die tijd opnieuw kunt ophalen. Een kopie blijft zonder einddatum in ons eigen archief, om je look gelijk te houden en te verbeteren. Beelden waarop een echt, herkenbaar persoon staat — je eigen model, iemand op een draagfoto — bewaren wij alleen zolang je klantaccount bestaat.
- EN visuals: 90 days in VISUAILS Studio, so you can fetch them again in that time. A copy stays in our own archive with no end date, to keep your look consistent and to improve it. Visuals showing a real, recognisable person — your own model, someone in a worn photo — we keep only for as long as your customer account exists.
- NL daarna: Wil je iets eerder weg — je materiaal, onze kopie ervan of de beelden in ons archief? Mail ons vanaf het adres van je account, dan verwijderen wij het; een reden hoef je niet te geven. Een nieuwe bestelling kan daarna wel anders uitvallen dan de eerdere look. Alleen een wettelijke bewaarplicht kan in de weg staan, en dan zeggen wij welke. (rest ongewijzigd)
- EN after: Want something gone sooner — your material, our copy of it, or the visuals in our archive? Email us from the address of your account and we delete it; you do not need to give a reason. A new order may then turn out differently from the earlier look. Only a statutory retention duty can stand in the way, and then we say which one. (rest unchanged)

**Subverwerkerslijst (privacy §5, verwerkersovereenkomst §8)** — src/data/subverwerkers.js
- Nieuwe regel · ByteDance (BytePlus Pte. Ltd.) · Singapore
  - NL: maker van de videomodellen die wij via Magnific gebruiken. Verwerkt je beeld als subverwerker van Magnific · via Magnific: standaardcontractbepalingen (art. 46 lid 2 sub c AVG)
  - EN: maker of the video models we use through Magnific. Processes your image as Magnific’s sub-processor · through Magnific: Standard Contractual Clauses (Art. 46(2)(c) GDPR)
- Melding vooraf: "minstens 14 dagen vooraf" / "at least 14 days in advance" (was 30).
- "Deze lijst is voor het laatst gewijzigd op 11 oktober 2026." / "This list was last changed on 11 October 2026."

### 4 · Proef dicht, met schaarste (kG2)

**/test-sample, het dichte blok** — src/components/TestSamplePage.astro (geen getallen, geen aftelling: dat staat nergens in de data)
- Kop · NL: De proef opent in rondes · EN: The test sample opens in rounds
- Tekst · NL: Per ronde nemen we een beperkt aantal proeven aan, zodat elke proef en elke lopende bestelling de aandacht krijgt die hij nodig heeft. Deze ronde is gesloten. Laat je e-mailadres achter: wie op de lijst staat, krijgt als eerste bericht als de volgende ronde opengaat.
  · EN: We take a limited number of test samples per round, so every sample and every running order gets the attention it needs. This round is closed. Leave your email address: whoever is on the list is the first to hear when the next round opens.
- Alleen lifestyle open, kop · NL: De catalogproef zit tussen twee rondes · EN: The catalog test sample is between rounds
- Alleen lifestyle, tekst · NL: De lifestyleproef is nu open: die kies je hieronder. De catalogproef opent in rondes, met een beperkt aantal plekken per ronde. Laat je e-mailadres achter: wie op de lijst staat, krijgt als eerste bericht als hij weer opengaat.
  · EN: The lifestyle test sample is open now: choose it below. The catalog one opens in rounds, with a limited number of places per round. Leave your email address: whoever is on the list is the first to hear when it opens again.
- Knop · NL: Zet me op de lijst · EN: Put me on the list
- Melding leeg veld · NL: Vul je e-mailadres in, dan krijg je als eerste bericht als de volgende ronde opengaat. · EN: Enter your email address and you will be the first to hear when the next round opens.
- Na aanmelden · NL: Je staat op de lijst. Gaat de volgende ronde open, dan mailen we je als eerste, één keer; daarna halen we je adres van de lijst. · EN: You are on the list. When the next round opens, we email you first, once; after that we take your address off the list.
- Ongewijzigd: "We gebruiken je adres alleen voor deze ene mail." / "We use your address for this one email only."

**Mail aan de wachtlijst** — src/lib/proefStand.js (weerOpenMail)
- Onderwerp · NL: De nieuwe proefronde van VISUAILS is open · EN: A new VISUAILS test sample round is open
- Kop · NL: De nieuwe ronde is open · EN: The new round is open
- Tekst · NL: Je stond op de lijst voor de proef van VISUAILS, dus je hoort het als eerste: de nieuwe ronde is open[, voor een lifestylecarrousel]. Eén product voor €1, gemaakt van jouw eigen foto. Per ronde nemen we een beperkt aantal proeven aan.
  · EN: You were on the list for the VISUAILS test sample, so you are the first to hear: the new round is open[, for a lifestyle carousel]. One product for €1, made from your own photo. We take a limited number of test samples per round.
- Ongewijzigd: de knop, en "Dit is de enige mail die je hierover krijgt: we hebben je adres nu van de lijst gehaald."

**/admin/proef** (alleen NL): "… toont /test-sample "De proef opent in rondes" …" en de regel "De pagina belooft dat wie op de lijst staat als eerste bericht krijgt. Stuur de mail aan de wachtlijst dus meteen na het openzetten, vóór je de nieuwe ronde ergens anders noemt."

### 5 · Lookpagina's kort en beeldvullend (k101 = a)

**Vaste koppen op elke lookpagina** — src/components/LookDetail.astro
- NL: Voor welke kleding · Welk gevoel · Welke kanalen · Meer over {look} (ingeklapt) · Kies {look}. (slotkop; bij de eigen look: "Je eigen look, eerst als voorstel.")
- EN: What clothing · What it feels like · Which channels · More about {look} · Choose {look}. (custom: "Your own look, as a proposal first.")
- Knoppen onderaan · NL: Kies deze look · Probeer VISUAILS · €1 (eigen look: de bestaande knoptekst, bv. "Vraag een eigen look aan") · EN: Choose this look · Try VISUAILS · €1
- In "Meer over …" (lange uitleg, bestaande teksten uit de lookdata) nieuwe tussenkoppen · NL: Hoe {look} voelt · Ideaal voor · Hoe {look} tot stand komt / In drie stappen · Wat er in elk kader gaat · Waarom het werkt · Wat je krijgt · EN: How {look} feels · Best for · How {look} comes together / In three steps · What goes into every frame · Why it works · What you get

**De drie regels per look** — src/data/styles.js, styles.nl.js, catalogStyles.js, catalogStyles.nl.js (`kort`)
| Look | Kleding (NL / EN) | Gevoel (NL / EN) | Kanalen (NL / EN) |
|---|---|---|---|
| Dunes | Premium breiwerk, linnen en lederwaren. / Premium knitwear, linen and leather goods. | Zonnig en rustig: aardetinten, lange zachte schaduwen, ingetogen luxe. / Sun-washed and calm: earthy tones, long soft shadows, quiet luxury. | Campagnes, advertenties en banners, met ruimte voor je eigen tekst. / Campaigns, ads and banners, with room left for your own text. |
| Flash | Streetwear, sneakers en accessoires. / Streetwear, sneakers and accessories. | Harde flits, diepe schaduwen, kleur die knalt: de look van het nachtleven. / Hard flash, deep shadows, colour that punches: the nightlife look. | Social-advertenties en drops die in een feed moeten opvallen. / Social ads and drops that need to stand out in a feed. |
| Glow | Avondkleding, badmode en statementstukken. / Eveningwear, swimwear and statement pieces. | Golden hour: lage zon en warm amberlicht, een avond die goed verliep. / Golden hour: low sun and warm amber light, an evening that went well. | Campagnes, launches en een feed waar mensen bij willen horen. / Campaigns, launches and a feed people want to belong to. |
| Phone-made | Kleding die verkoopt op herkenbaarheid. / Pieces that sell on being relatable. | Daglicht door een raam, een net niet perfect kader: het leest als echt. / Daylight through a window, a slightly imperfect frame: it reads as real. | Organische posts en UGC-achtige advertenties, al in de verhouding van Instagram. / Organic posts and UGC-style ads, already in the Instagram ratio. |
| Eigen look (lifestyle) | Assortimenten waar de scène het verhaal is. / Ranges where the scene is the story. | Je eigen wereld: een scène ontworpen vanuit jouw referenties. / Your own world: a scene designed from your references. | Campagnes die hun eigen handtekening nodig hebben. / Campaigns that need their own signature. |
| Classic | Je hele assortiment in één keer, van T-shirts tot jassen, tassen en petten. / Your whole range in one go, from T-shirts to jackets, bags and caps. | Strak en gelijk: hetzelfde licht en dezelfde hoek voor elk product. / Clean and consistent: the same light and angle for every product. | Je webshop, en marktplaatsen zoals Amazon en bol.com. / Your webshop, and marketplaces such as Amazon and bol.com. |
| Custom Brand (catalog) | Assortimenten waar herkenning belangrijker is dan neutraliteit. / Ranges where recognition matters more than neutrality. | Een achtergrond, schaduw en props die zeggen: dit zijn wij, nog vóór het logo. / A backdrop, shadow and props that say this is us, before the logo does. | Je eigen webshop, waar je look je etalage is. / Your own shop, where your look is your storefront. |

## Klantteksten bouwer J3 · 11 oktober 2026 (w2, o22)

Per tekst: plek · NL · EN.

### VOOR AFVINKLIJST 4

#### 1 · Voorwaarden §10, de eerste trede "Eén ronde zit erbij" (w2 = b)

Plek: `src/data/pricing.js`, REVISIEBELEID, eerste regel. Eén bron: dezelfde zin staat daardoor op **/terms §10**, op **/faq** (de revisievraag) en in **Studio** onder het formulier van de revisieronde.

- NL (nieuw, vet): Bij elke bestelling hoort één revisieronde. Je vraagt hem aan binnen 7 dagen na levering; daarin verwerken we je aanpassingen, per beeld, in VISUAILS Studio. Vraag je in die dagen niets aan, dan ronden we je bestelling af. **De levering geldt dan als aanvaard**; je beelden blijven gewoon te downloaden. **Is daar een reden voor, dan kunnen we een afgeronde bestelling in overleg weer openen; dat beslissen wij per geval.**
- EN (nieuw, vet): Every order comes with one revision round. You request it within 7 days of delivery; that is where your adjustments go, image by image, in VISUAILS Studio. If you request nothing in those days, we complete your order. **The delivery then counts as accepted**; your images stay available to download. **If there is a reason to, we can reopen a completed order in consultation with you; we decide that case by case.**

("7" komt uit REVISIE_DAGEN, niet getypt.)

#### 3 · Voorwaarden §5, nieuwe alinea direct na "Een merkmodel is een gezicht dat niet bestaat." (o22, portretrecht)

Plek: `src/pages/nl/terms.astro` en `src/pages/terms.astro`, §5 "Jouw verantwoordelijkheden" / "Your responsibilities". "drie" komt uit GEZICHTSZOEKERS (`src/data/modelChecks.js`, dezelfde lijst als /ai-act), "twee weken" uit PORTRET_VERVANGEN_WEKEN (`src/data/termijnen.js`).

- NL: **Als een gezicht op een bestaand persoon lijkt.** Elk gezicht dat wij maken, ook dat van onze vaste modellen, halen we vóór gebruik door drie verschillende gezichtszoekmachines, om na te gaan dat het niet als gezicht van een bestaand persoon online staat. Dat iemand toevallig op zo’n gezicht lijkt, valt nooit helemaal uit te sluiten. Beroept die persoon zich op zijn of haar portretrecht, dan vervangen wij alle beelden met dat gezicht door beelden met een ander model, op onze kosten; welk model en hoe we het aanpakken, overleggen we met jou. Meestal is dat binnen twee weken klaar; bij veel beelden of video’s kan het langer duren. Krijg jij zo’n melding, stuur die dan meteen aan ons door.
- EN: **If a face resembles a real person.** Every face we make, including those of our standard models, is put through three different face-search engines before it is used, to check that it does not appear online as the face of an existing person. A chance resemblance to someone can never be ruled out completely. If that person invokes their portrait rights (the right to their own likeness), we replace every image with that face with images of a different model, at our cost; we agree with you which model to use and how we go about it. This is usually done within two weeks; with many images or videos it can take longer. If you receive such a claim, forward it to us straight away.

Bewust niet: "garantie", "zeker", vrijwaring of schadevergoeding. "Gezichtszoekmachines" en niet "zoekmachines voor beelden": /ai-act zegt uitdrukkelijk dat het géén omgekeerde beeldzoekopdracht is (Yandex, PimEyes, FaceCheck.ID).

### Nieuwe klanttekst (geen juridische zin)

#### 2 · Tijdlijnregel na "Weer openen" in /admin

Plek: `src/lib/close.js`, `heropenNotitie()`. Komt op de tijdlijn van de bestelling in **Studio** en op de **privélink** (/o/…), in de taal van de bestelling, op het moment dat Lucas in /admin op "Weer openen" drukt. Er gaat geen mail uit.

- NL: Weer geopend door VISUAILS op 11 oktober 2026.
- EN: Reopened by VISUAILS on 11 October 2026.

(De datum is die van het weer openen, Nederlandse tijd.)

## Na het samenvoegen (hoofdbouwer)

**Voorwaarden §7, geleverde visuals** — src/pages/nl/terms.astro, src/pages/terms.astro (was: "ten hoogste twaalf maanden in ons eigen archief")
- NL: Een kopie van de visuals die wij maakten, bewaren we zonder einddatum in ons eigen archief, zodat we je look gelijk kunnen houden en kunnen blijven verbeteren. Dat is ons werkarchief en geen back-up voor jou, dus bewaar zelf ook een kopie. Wil je onze kopie weg? Mail ons vanaf het adres van je account, dan verwijderen we hem, ook uit dat archief; een reden hoef je niet te geven. Visuals waarop een echt, herkenbaar persoon staat, bewaren we alleen zolang je klantaccount bestaat (zie het privacybeleid, §6).
- EN: We keep a copy of the visuals we made in our own archive, with no end date, so that we can keep your look consistent and keep improving it. That is our working archive, not a backup for you, so keep your own copy. Want our copy gone? Email us from the address of your account and we delete it, from that archive too; you do not need to give a reason. Visuals showing a real, recognisable person we keep only for as long as your customer account exists (see our Privacy Policy, §6).

**Voorwaarden §5** — de woorden "ook dat van onze vaste modellen" / "including those of our standard models" staan er alleen als het logboek in src/data/modelChecks.js voor elk vast model is ingevuld (rosterVolledigGecontroleerd(), zoals /ai-act).

**Studio en /admin, het saldo** — src/lib/creditWeergave.js. Bij drie of meer vervaldatums (was: "De rest vervalt op …", en dat klopte dan niet):
- NL: De rest vervalt later, in stappen; de laatste op {datum}.
- EN: The rest expires later, in steps; the last on {date}.
