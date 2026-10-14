# De uitleg in beweging (14 oktober 2026)

Naslag bij afvinklijst 24 en 25 (levering 39). Getallen tussen ⟨ ⟩ komen uit de data, nooit getypt.

**Leeswijzer**: = zelfde tekst als nu · ● nieuw of anders, graag nalezen.

Lucas, 14 oktober, 04:14: "Wanneer mogelijk van alle mockups wellicht animaties maken van hoe het precies werkt en de klant visueel word meegenomen in hoe het werkt. […]"
05:21: "Bij formaten kloppen de formaten niet met wat er getoond word. […]"
06:56: afvinklijst 24 ingevuld, alles "doen". 07:08: beeld 1 (de hoodie van een ander merk) niet gebruiken. 08:13: de schaduw in "Wij maken" moet de echte schaduw van de foto zijn. 08:29: de Goedkeuren-knoppen zijn niet consistent.

## Hoe elke animatie werkt
- Speelt één keer zodra het blok voor de helft in beeld is (of de helft van het scherm vult, voor een mockup die hoger is dan het scherm); daarna stil, met een knop "opnieuw". Pauze kan altijd (WCAG 2.2.2). Uit beeld of in een ander tabblad: vanzelf pauze. Met "minder beweging" of zonder JavaScript staat de eindstand er meteen.
- Alleen het formatenblok loopt rond (Lucas: "een loop … het einde het begin weer"); de rest speelt één keer.
- ● De balk met de zin blijft onderin het scherm staan zolang de mockup hoger is dan het scherm (de levering, Studio en de stappen op een telefoon), en zakt terug op zijn plek als het blok ophoudt.
- = de knop (alleen als label voor schermlezers): Zet de uitleg stil · Speel de uitleg verder · Speel de uitleg opnieuw · EN Pause the walkthrough · Resume the walkthrough · Play the walkthrough again.
- ● Live op: de voorpagina (de drie stappen en het formatenblok onder "Hoe het werkt"), /about (de controle), /how-it-works (de datumkiezer), /studio (de rondleiding en beeld voor beeld goedkeuren), /gallery (een levering).

## Hoe het werkt, op de voorpagina (de drie stappen)
- ● 1. Je stuurt ⟨drie⟩ telefoonfoto’s per product: ⟨voorkant, achterkant en detail⟩. · EN You send ⟨three⟩ phone photos per product: ⟨front, back and detail⟩.
- ● 2. Wij werken elk beeld af: uitknippen, jouw achtergrond eronder en een natuurlijke schaduw, bij elk beeld op dezelfde manier. · EN We finish every image: cut out, your background underneath and a natural shadow, the same way on every image.
- = 3. Je keurt per beeld goed en downloadt alles in één keer. · EN You approve image by image and download everything at once.
- ● in het middelste vak, de lagen: Uitgeknipt · Achtergrond ⟨#FFFFFF⟩ · Natuurlijke schaduw · EN Cut out · Background · Natural shadow. Eronder: Elk beeld dezelfde achtergrond · EN Same background on every image.
- ● alt van het middelste vak: De roze jeans, uitgeknipt en op wit gezet, met de natuurlijke schaduw eronder · EN The pink jeans, cut out and set on white, with the natural shadow underneath
- ● Wat je ziet in vak 2: de uitsnede op het dambord (transparant), het wit schuift eronder, de schaduw komt als losse laag van rechtsonder en schuift onder de broek tot hij zacht en klein is, en dan vloeit alles over in het geleverde beeld. De eindstand is het beeld dat de klant krijgt, met zijn eigen schaduw. (Eerst: twee ovaaltjes onder de pijpen.)

## Formaten (nieuw, voorpagina onder "Hoe het werkt")
- ● Formaten · Het formaat dat jij nodig hebt. / Geleverd. · EN Formats · The format you need. / Delivered.
- ● Kies in het bestelformulier waar je beelden heen gaan. Wij leveren elk beeld precies op die maat. · EN Choose in the order form where your images are going. We deliver every image at exactly that size.
- ● ⟨16:9 en 9:16⟩ kies je bij lifestyle, per beeld. Catalog leveren we in ⟨1:1, 4:5 of 3:4⟩, één verhouding per bestelling. · EN ⟨16:9 and 9:16⟩ are for lifestyle, chosen per image. Catalog comes in ⟨1:1, 4:5 or 3:4⟩, one ratio per order.
- ● knoppen: ⟨16:9⟩ · ⟨4:5⟩ · ⟨9:16⟩ · En meer · EN And more. "En meer" toont ⟨1:1⟩ en ⟨3:4⟩ naast elkaar, elk met een ander beeld uit dezelfde look. Zalando staat er niet meer in.
- ● eronder: Op wit voor marktplaatsen · Als JPG; PNG of WebP op aanvraag · EN On white for marketplaces · As JPG; PNG or WebP on request
- ● de zinnen:
  1. Jij kiest het formaat. Breed: ⟨16:9⟩ voor een banner of paginakop. · EN You pick the format. Wide: ⟨16:9⟩ for a banner or page header.
  2. Staand: ⟨4:5⟩ voor je webshop en je feed. · EN Upright: ⟨4:5⟩ for your shop and your feed.
  3. Het hele scherm: ⟨9:16⟩ voor Reels, Stories en TikTok. · EN The whole screen: ⟨9:16⟩ for Reels, Stories and TikTok.
  4. En meer: ⟨1:1⟩ voor ⟨marktplaatsen en advertenties⟩, ⟨3:4⟩ voor ⟨klassieke webshop-grids⟩. · EN And more: ⟨1:1⟩ for ⟨marketplaces and ads⟩, ⟨3:4⟩ for ⟨classic webshop grids⟩.
- Nagemeten met kijkplan/fmt-meet.mjs op 1440, 390 en 320 px: nul keer een label op een verkeerde vorm; het 3:4-vak meet 0,7500.

## Zalando zet de verhouding vast (bestelformulier, v24-zalando = a)
- ● Vink je Zalando aan, dan verschijnt een vierde tegel en staan de andere drie uit: ⟨1:1,44⟩ · Zalando ⟨1:1,44⟩ · De vorm die Zalando eist. · EN ⟨1:1.44⟩ · Zalando ⟨1:1.44⟩ · The shape Zalando requires.
- ● eronder: Vast op 1:1,44, omdat je op Zalando verkoopt. Zalando neemt beelden alleen in die vorm aan. · EN Fixed to 1:1.44, because you sell on Zalando. Zalando only accepts images in that shape.
- ● Vink je Zalando weer uit, dan staat je eigen keuze terug. Zonder JavaScript zet de server de verhouding zelf vast. Ook naast Amazon of bol wint 1:1,44 (die eisen geen vorm).
- ● de Zalando-tegel bij de kanalen: Op wit en in 1:1,44, alleen JPG. Lees de notitie over de on-model shot. · EN On white and in 1:1.44, JPG only. Read the note about the on-model shot.
- ● uitleg bij "Je krijgt wat de marktplaats aanneemt": We leveren als JPG, en dat nemen Amazon, bol en Zalando alle drie aan. Wil je voor Amazon of bol ook PNG? Vraag het aan bij je bestelling in VISUAILS Studio; Zalando neemt alleen JPG. De AI-vermelding zit in elk formaat dat wij leveren. · EN You get what the marketplace takes · We deliver as JPG, which Amazon, bol.com and Zalando all accept. Want PNG as well for Amazon or bol.com? Request it on the order in VISUAILS Studio; Zalando takes JPG only. The AI disclosure is in every format we deliver. (Eerst: "niet als webp".)
- ● in het overzicht van de bestelling, bij een marktplaats: Bestandsformaat · JPG, dat elke marktplaats aanneemt (PNG op aanvraag bij Amazon en bol; Zalando neemt alleen JPG) · EN File format · JPG, which every marketplace accepts (PNG on request for Amazon and bol; Zalando takes JPG only)
- ● FAQ "Kan ik deze op Amazon, bol en Zalando gebruiken?": … dus die keuze zet de achtergrond vast op #FFFFFF. Zalando eist daarnaast elk beeld in 1:1,44, dus kies je Zalando, dan staat ook de verhouding daarop vast. Alles komt als JPG, en dat nemen ze alle drie aan. … · EN … so picking one locks the background to #FFFFFF. Zalando also requires every image in 1:1.44, so picking Zalando locks the shape to that as well. Everything comes as JPG, which all three accept. …

## De uitleg bij de verhoudingen (ratios.js, `what`)
- ● 1:1: Werkt op een hoofdafbeelding bij Amazon en bol, en in feeds en advertenties. De veiligste keuze als je twijfelt. Zalando vraagt een eigen staande maat, 1:1,44. · EN Works on a main image at Amazon and bol.com, and in feeds and ads. The safest choice if you are not sure. Zalando asks for its own upright size, 1:1.44.
- ● 4:5: De staande stand in de thema’s van Shopify zelf en het staande formaat van de feeds van Instagram en Facebook. Meer product op dezelfde schermbreedte. · EN The portrait setting in Shopify's own themes and the upright size of Instagram and Facebook feeds. More of the product on the same screen width.
- ● 3:4: Het klassieke webshop-portret. Iets smaller en hoger dan 4:5, en sinds 2025 ook de vorm van het profielraster op Instagram. · EN The classic webshop portrait. A little narrower and taller than 4:5, and since 2025 also the shape of Instagram's profile grid.
- ● Zalando 1:1,44: De staande maat die Zalando voor elk beeld eist: 1:1,44, aanbevolen op 1801 × 2600 px. Vast voor deze bestelling, omdat je op Zalando verkoopt. · EN The upright size Zalando requires for every image: 1:1.44, recommended at 1801 × 2600 px. Fixed for this order because you sell on Zalando.

## De controle (/about)
- ● 1. De voorkant: jouw foto naast ons beeld. Klopt de kleur van de stof? · EN The front: your photo next to our image. Is the colour of the fabric right?
- ● 2. De achterkant: zitten de zakken en naden op dezelfde plek? · EN The back: are the pockets and seams in the same place?
- ● 3. Het detail: de knoop en het logo, van dichtbij. · EN The detail: the button and the logo, up close.
- ● 4. Op het model: valt de pasvorm, klopt de lengte? · EN On the model: does the fit hold, is the length right?
- ● 5. Klopt alles, dan gaat het naar jou. Twijfelen we, dan vragen we het eerst. · EN If it all matches, it goes to you. If we are unsure, we ask first.
- ● de vier beelden: Voorkant · Kleur van de stof · Achterkant · Zakken en naden · Detail · Knoop en logo · Op model · Pasvorm en lengte (EN Front · Colour of the fabric · Back · Pockets and seams · Detail · Button and logo · On model · Fit and length) · Nagekeken · EN Checked · Twijfel? Dan vragen we het je eerst. · EN In doubt? Then we ask you first.

## De datumkiezer (/how-it-works)
- ● 1. De aanvraag: ⟨20⟩ producten. Een vaste datum beslaat ⟨2⟩ dagen, dus ⟨10⟩ per dag. · EN The request: ⟨20⟩ products. A fixed date takes ⟨2⟩ days, so ⟨10⟩ a day.
- ● 2. Vandaag en de ⟨3⟩ dagen erna zijn te vroeg: eerst moeten je foto’s binnen zijn. · EN Today and the ⟨3⟩ days after are too soon: your photos have to be in first.
- ● 3. ⟨Vrijdag 7 heeft 8 vrij en zaterdag 8 heeft 6 vrij⟩: te krap voor ⟨10⟩ per dag. · EN ⟨Friday 7 has 8 free and Saturday 8 has 6 free⟩: too tight for ⟨10⟩ a day.
- ● 4. ⟨Zondag 9 en maandag 10⟩ hebben genoeg plek: ⟨10⟩ per dag past, ⟨2⟩ dagen achter elkaar. · EN ⟨Sunday 9 and Monday 10⟩ have enough room: ⟨10⟩ a day fits, ⟨2⟩ days in a row.
- ● 5. Aangeboden: ⟨9 – 10 aug⟩. ⟨10⟩ producten passen eerder: ⟨7 – 8 aug⟩. · EN Offered: ⟨9 – 10 Aug⟩. ⟨10⟩ products fit sooner: ⟨7 – 8 Aug⟩.
- ● per dag in de lijst: ⟨n⟩ vrij · Te krap · Past · EN ⟨n⟩ free · Too tight · Fits

## VISUAILS Studio, de rondleiding (/studio)
- = 1. In VISUAILS Studio zie je in één oogopslag hoe je bestellingen ervoor staan. · EN VISUAILS Studio shows at a glance where all your orders stand.
- = 2. Per bestelling: waar hij is, je leverdatum en je factuur. · EN Per order: where it is, your delivery date and your invoice.
- = 3. Bij levering staat elk beeld naast de foto die je stuurde. · EN On delivery, every image sits next to the photo you sent.
- ● 4. Goedkeuren doe je per beeld. Wil je iets anders? Vink het aan en zeg wat: hier liever wit dan grijs. · EN You approve image by image. Want something different? Tick it and say what: here, white instead of grey.
- ● 5. Wij passen het aan en leveren het opnieuw: nu op wit, net als de rest. · EN We change it and deliver it again: on white now, like the rest.
- ● wat de cursor typt: Toch liever op wit dan grijs, zoals de rest. · EN On white rather than grey after all, like the rest. Daarna: ⟨4⟩ foto’s geleverd · ⟨3⟩ goedgekeurd · 1 aangepast, en bij het modelbeeld "Opnieuw geleverd" (EN Delivered again).
- ● de knoppen per beeld, zoals op het echte scherm: Goedkeuren · Goedgekeurd · Deze aanmerken · Downloaden; eronder Eén revisieronde · Vink aan wat je anders wilt, zeg erbij hoe, en stuur het als één ronde. · Revisieronde versturen. EN Approve · Approved · Mark this one · Download · One revision round · Tick what you would like different, say how, and send it as one round. · Send revision round. (Eerst: "Niet goed", "Vink aan wat niet goed is, schrijf erbij wat eraan schort", "Verstuur deze revisieronde".)
- De rondleiding stopt op Bestellingen; Je vaste look staat er nog en kan de bezoeker zelf aanklikken.

## Goedkeuren, beeld voor beeld (/studio)
- = 1. Je keurt per beeld goed: één klik, en dat beeld is klaar. · EN You approve image by image: one click and that image is done.
- = 2. De rest van je bestelling wacht niet op de beelden die je nog niet bekeek. · EN The rest of your order does not wait for the images you have not looked at yet.
- ● 3. Wil je iets anders? Zeg het in je eigen woorden. Alleen dat beeld gaat terug. · EN Want something different? Say it in your own words. Only that image goes back.
- ● 4. Je bestanden staan in één map, per product, als JPG. PNG of WebP vraag je erbij aan. · EN Your files sit in one folder, per product, as JPG. PNG or WebP you request on top. (Eerst: "als PNG, JPG en WebP".)
- ● per beeld: Goedkeuren · Goedgekeurd · Deze aanmerken · Revisie aangevraagd (EN Approve · Approved · Mark this one · Revision requested); de teller: ⟨2⟩ van ⟨4⟩ goedgekeurd · 1 in je ronde (EN ⟨2⟩ of ⟨4⟩ approved · 1 in your round). Geen datum meer achter "Goedgekeurd", zoals op het echte scherm.
- ● het veld: Wat wil je anders? Zeg het in je eigen woorden. · placeholder: In je eigen woorden — hoe specifieker, hoe sneller het goed is. · Revisieronde versturen · EN What would you like different? Say it in your own words. · In your own words — the more specific, the faster we get it right. · Send revision round
- ● de map: Eén map per product, en daarin elk beeld als JPG. PNG of WebP erbij? Eén klik op de bestelling. · ⟨80⟩ bestanden · JPG · en nog ⟨19⟩ productmappen · EN One folder per product, and in it every image as JPG. Need PNG or WebP too? One click on the order. · ⟨80⟩ files · JPG · and ⟨19⟩ more product folders

## Een levering (/gallery)
- ● vier stappen: 01 Binnengekomen · ⟨5⟩ telefoonfoto’s op de magazijnvloer: de ⟨3⟩ verplichte en ⟨2⟩ extra. — 02 In de studio · Elk beeld afgewerkt op jouw achtergrond, en nagekeken naast de foto die je stuurde. — 03 Jij keurt goed · Per beeld goedkeuren. Wil je iets anders? Vink het aan en zeg wat. — 04 Gedownload · Eén map, ⟨4⟩ bestanden: elk beeld als JPG, in ⟨1:1⟩. PNG of WebP vraag je erbij aan.
  EN 01 Came in · ⟨5⟩ phone photos on a warehouse floor: the ⟨3⟩ required ones and ⟨2⟩ extra. — 02 In the studio · Every image finished on your background, and checked next to the photo you sent. — 03 You approve · Approve image by image. Want something different? Tick it and say what. — 04 Downloaded · One folder, ⟨4⟩ files: every image as JPG, in ⟨1:1⟩. PNG or WebP you request on top.
- ● de controles in stap 2: Uitgeknipt, op jouw achtergrond (lifestyle: In de look die je koos) · Kleur vergeleken met jouw foto · Naden, knoop en logo nagelopen · Door ons nagekeken, beeld voor beeld · EN Cut out, on your background (In the look you chose) · Colour compared with your photo · Seams, button and logo checked · Checked by us, image by image. (Eerst "Nagekeken door onze beeldredactie"; dat zegt meer dan waar is.)
- ● stap 3: Goedkeuren (violet, zoals overal) · Deze aanmerken (een vinkje) · per beeld Goedgekeurd · EN Approve · Mark this one · Approved
- ● Verhouding en maat · ⟨1:1 · 2048 px⟩ (lifestyle: per beeld) · EN Ratio and size. (Eerst stond er "Elk beeld in 3 formaten"; de klant kiest één verhouding.)
- ● de zinnen: 1. Je stuurt een paar telefoonfoto’s, gewoon op de vloer van je magazijn. · 2. In de studio werken we elk beeld af en kijken we het na, naast jouw foto. · 3. Jij keurt per beeld goed. Wil je iets anders? Vink het aan en zeg wat. · 4. Je downloadt één map: elk beeld als JPG, in de verhouding die je koos. · EN You send a few phone photos, simply on your warehouse floor. · In the studio we finish every image and check it, next to your photo. · You approve image by image. Want something different? Tick it and say what. · You download one folder: every image as JPG, in the ratio you chose.

## Overig in deze ronde
- ● Beeld 1 (lifestyle-phone-made-01, de hoodie met de rode cirkel van een ander merk) is weg: de kop van de catalogpagina toont nu beeld 03, de voor/na beeld 09, en de galerij en de demo slaan hem over. De acht bestanden staan op de opruimlijst ("moet weg"), dus eerst OPRUIMEN.bat en dan UITROLLEN.bat.
- ● De laptop bij lifestyle: vier vaste namen, het derde scherm is een plaat "Alleen het product" in plaats van beeld band-08.
- ● FAQ: "Kan ik een sfeer krijgen die niet bij de vaste looks hoort?" · EN "Can I get a mood that is not one of the set looks?"
- ● Bestandsformaat overal: als JPG; PNG of WebP op aanvraag, vanuit je bestelling in VISUAILS Studio (catalogstijlen, FAQ, Hoe het werkt, Studio).
- ● Twee nieuwe beelden: ba2-na-model-wit (het modelbeeld op wit, de grijze achtergrond rij voor rij naar 255, schaduw behouden) en ba2-na-front-uitgeknipt (de voorkant uitgeknipt op kleur, zonder schaduw erin; 14 oktober opnieuw gemaakt).

## Bronnen voor de formaten (gelezen 14 oktober 2026)
- Zalando partner university, Zalando image guidelines: "Aspect ratio (width x height): 1:1.44", best 1801 × 2600, minimaal 762 × 1100, JPG.
- Shopify Help, product media types: "For square product images, a size of 2048 x 2048 px usually displays best." Dawn (card-product.liquid): portrait = 0,8. Horizon (_product-card-gallery.liquid): portrait = 4 / 5, standaard.
- bol partnerplatform, rules for images: 500 × 500 tot 6000 × 6000 px, zoom vanaf 1200 × 1200, wit en neutraal hoofdbeeld; geen verhouding.
- Sked Social (Instagram): 1:1 1080 × 1080, 4:5 1080 × 1350, 3:4 1080 × 1440 (in de app), Stories en Reels 1080 × 1920. Kapwing en Oktopost: profielraster sinds begin 2025 in 3:4.
- Sked Social (TikTok): TikTok raadt 9:16 aan.
