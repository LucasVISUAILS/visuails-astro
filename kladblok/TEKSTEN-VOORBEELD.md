# Teksten van de nieuwe voorpagina, de hal (12 oktober 2026)

Naslag bij afvinklijst 5 en ontwerpplan versie 9. Eerst het voorbeeld op /nl/voorbeeld/ en /voorbeeld/; sinds jouw "direct live bij je volgende UITROLLEN" (12 oktober, 18:26) staat dit op / en /nl/, en /voorbeeld/ stuurt door.

**Wat er sinds het voorbeeld veranderd is (12 oktober, avond)** — staat hieronder ook op zijn plek, met ◆:
- Bewerken zegt nu "het formaat dat je kiest" in plaats van "de uitsnede per kanaal" (jouw ja in de chat).
- Het beeld bij stap 3 toont geen drie formaten meer (1:1, 4:5, 9:16) maar de vier beelden van een proef, elk met een vinkje, en "⟨4⟩ van ⟨4⟩ goedgekeurd".
- Het aanbevelingenblok (G3) staat er weer, vlak voor de proef. Het blijft onzichtbaar tot jij de eerste echte aanbeveling publiceert.

Per tekst: plek · NL · EN. Getallen tussen ⟨ ⟩ komen uit de data, nooit getypt (pricing.js, shots.js, models.js, iptc.js).

**Leeswijzer**
- ✔ = stond in afvinklijst 5 en is daar akkoord gegeven (tv-1 … tv-6). Alleen voor de volledigheid hier.
- ● = NIEUW of anders dan in de lijst. Graag nalezen.

---

## 1 · De opening

**Labelpil boven de kop** ✔
- NL: VISUAILS · Enschede, NL
- EN: VISUAILS · Enschede, NL

**Kop** ✔ (uit brand.js, TAGLINE, met het wisselende violette woord)
- NL: Al je ⟨productbeelden / catalogfoto's / lifestylebeelden / productvideo's⟩. Zonder shoot.
- EN: All your ⟨product imagery / catalog photos / lifestyle images / product videos⟩. Without a shoot.

**Zin onder de kop** ✔
- NL: Stuur je productfoto's. Krijg catalog, lifestyle en video terug.
- EN: Send your product photos. Get catalog, lifestyle and video back.

**Knoppen** ✔
- NL: Start een bestelling · Probeer VISUAILS · ⟨€1⟩ (een bestaande klant ziet: Sluit een abonnement af)
- EN: Start an order · Try VISUAILS · ⟨€1⟩ (an existing customer sees: Start a plan)

**De drie feiten in pillen** ● (tweede pil langer dan in de lijst)
- NL: Vanaf ⟨€39⟩ per product · Vaak binnen een dag, soms een paar dagen · Geen minimum
- EN: From ⟨€39⟩ per product · Often within a day, sometimes a few days · No minimum
- Waarom langer: in de lijst stond "Vaak binnen een dag". Jouw vaste regel (ronde 8, levertijdDelen() in pricing.js) zegt: "vaak binnen een dag" nooit zonder "soms een paar dagen". Die regel heb ik laten voorgaan. Wil je hier toch de korte vorm, zeg het: dan is het één woord in de code, maar dan wijkt deze plek af van de rest van de site.

## 2 · De laptop en de telefoon

**Belletje bij de telefoon** ● (in het plan stond "Jouw telefoonfoto")
- NL: Wat jij stuurt · Een paar telefoonfoto's
- EN: What you send · A few phone photos
- Waarom: jouw notitie bij d-bellen ("de klant hoeft alleen een paar foto's te sturen"). Meervoud zegt dat beter dan één foto.

**Belletje bij de laptop** ✔ (wisselt mee met de dia)
- NL: Wat je terugkrijgt · Je catalogbeeld · ⟨2048⟩ px / Je lifestylebeeld · ⟨2048⟩ px / Je productvideo · 9:16
- EN: What you get back · Your catalog image · ⟨2048⟩ px / Your lifestyle image · ⟨2048⟩ px / Your product video · 9:16

**Bediening onder het beeld** (namen uit laptopSlides.js, zoals nu)
- NL: Catalogset · 4 beelden · ⟨1 / 7⟩; knoppen (voor schermlezers): Vorig beeld · Volgend beeld · Zet de beelden stil / Laat de beelden lopen ●
- EN: Catalog set · 4 images · ⟨1 / 7⟩; buttons: Previous image · Next image · Pause the images / Play the images ●

**Regel onder de bediening** (staat nu ook op de site, jouw zin van 20 september)
- NL: Een voorbeeld. Je krijgt de losse bestanden en gebruikt ze waar je wilt.
- EN: An example. You get the files and use them wherever you like.

**Wat er op het nagemaakte webshopscherm staat** ● (verzonnen merk, geen prijs van ons)
- NL: JOUWMERK · Nieuw · Denim · Jassen · Accessoires · Home / Denim · Wide leg jeans · € 79,95 · In winkelmand · Gratis retour binnen 30 dagen
- EN: JOUWMERK · New · Denim · Jackets · Accessories · Home / Denim · Wide leg jeans · €79.95 · Add to cart · Free returns within 30 days

**Beschrijving van de foto (alt)** ●
- NL: Een laptop op schoot met een webshoppagina, en een telefoon in de hand met de foto die je instuurt
- EN: A laptop on a lap showing a shop page, and a phone in hand with the photo you send in

## 3 · Hoe het werkt

**Label en kop** ✔
- NL: Hoe het werkt · Dit stuur jij. Dit krijg je terug.
- EN: How it works · What you send. What you get back.

**De drie stappen** ✔ (tweede regel met de lange levertijd, zie boven)
- NL: Jij stuurt — ⟨Drie⟩ telefoonfoto's zijn genoeg om te beginnen. · Wij maken — Catalog, lifestyle of video. Vaak binnen een dag, soms een paar dagen. · Jij keurt goed — Per beeld goedkeuren. Alles in één keer downloaden.
- EN: You send — ⟨Three⟩ phone photos are all you need to start. · We make — Catalog, lifestyle or video. Often within a day, sometimes a few days. · You approve — Approve image by image. Download everything at once.

**Kleine labels op de stapbeelden** ●
- NL: jouw telefoonfoto · catalogbeeld · ⟨2048⟩ px · ◆ ⟨4⟩ van ⟨4⟩ goedgekeurd
- EN: your phone photo · catalog image · ⟨2048⟩ px · ◆ ⟨4⟩ of ⟨4⟩ approved
- ◆ Waarom: "1:1 shop · 4:5 advertentie · 9:16 reel" las als "je krijgt alle drie", terwijl de klant één formaat per bestelling kiest (en 9:16 bestaat voor catalog niet). De vier beelden bij stap 3 zijn de proefset (voorkant, achterkant, detail, draagfoto) en zijn versiering; de zin van de stap zegt het in woorden.

**Beschrijving van de stapbeelden (alt)** ●
- NL: Ingestuurd: een telefoonfoto van een T-shirt op een houten tafel · Geleverd: hetzelfde T-shirt, afgewerkt op gebroken wit
- EN: Sent in: a phone photo of a T-shirt on a wooden table · Delivered: the same T-shirt, finished on off-white

**De dienstband onder de stappen** ● (helemaal nieuw, voor jouw notitie bij d-bellen)
- Links, bij drie van je telefoonfoto's
  - NL: Jij stuurt alleen een paar foto's.
  - EN: You only send a few photos.
- Rechts, met de vier dingen die wij doen
  - NL: Wij doen de rest:
  - EN: We do the rest:
- Maken
  - NL: Maken — Elk beeld in de look die je kiest.
  - EN: Creating — Every image in the look you pick.
- Bewerken
  - NL: Bewerken — Retouche, kleur en het formaat dat je kiest. ◆
  - EN: Editing — Retouching, colour and the format you choose. ◆
- Het AI-kenmerk
  - NL: Het AI-kenmerk — Een machineleesbaar kenmerk in elk bestand (IPTC).
  - EN: The AI marking — A machine-readable marking in every file (IPTC).
- Controle (de zin komt uit reviewClaim() in pricing.js, dezelfde als elders op de site)
  - NL: Controle — Elke visual wordt door ons gemaakt en zorgvuldig gecontroleerd.
  - EN: Checking — Every visual is made by us and carefully checked.
- Link
  - NL: Meer over de AI-markering → /ai-act
  - EN: More about the AI marking → /ai-act

## 4 · Wat we maken

**Label en kop** ✔
- NL: Wat we maken · Drie soorten beeld. Per product geprijsd.
- EN: What we make · Three kinds of image. Priced per product.

**De drie beelden** ✔
- NL: Productfoto's · vanaf ⟨€39⟩ per product — Lifestyle · vanaf ⟨€49⟩ per product — Video · ⟨op aanvraag⟩
- EN: Product photos · from ⟨€39⟩ per product — Lifestyle · from ⟨€49⟩ per product — Video · ⟨on request⟩

**Regel eronder** ✔
- NL: Eén product: ⟨€89⟩ (catalog) of ⟨€109⟩ (lifestyle). Meer producten, lager tarief.
- EN: One product: ⟨€89⟩ (catalog) or ⟨€109⟩ (lifestyle). More products, a lower rate.

**Alleen op de telefoon, onder de veegrij** ●
- NL: Veeg voor de andere twee
- EN: Swipe for the other two

**Beschrijving van de beelden (alt)** ●
- NL: Twaalf catalogbeelden op wit in een raster · Sfeerbeeld: een model met een violet vest en een tas loopt door een witte hal · Een bewogen opname van hetzelfde sfeerbeeld
- EN: Twelve catalog images on white in a grid · Mood image: a model in a violet cardigan with a bag walks through a white hall · A motion-blurred shot of the same mood image

## 5 · Looks en het gezicht

✔ Kies een look. Je collectie als één shoot. / Pick a look. Your collection as one shoot. · Probeer · ⟨€1⟩ / Try · ⟨€1⟩ · Een gezicht zit erbij. ⟨Tien⟩ modellen, zonder meerprijs. / A face comes with it. ⟨Ten⟩ models, at no extra cost. · Alle ⟨tien⟩ / All ⟨ten⟩

## 6 · Meer weten

✔ Meer weten · Nog vragen? / Learn more · Any questions? · Shootdag vs VISUAILS · ⟨€2.500–8.000⟩ kost één shootdag, alles meegerekend. Hier stuur je foto's en keur je goed. · Veelgestelde vragen — Goedkeuren, revisies, levertijd, rechten. · AI en de AI Act — Hoe je het vermeldt, met een zin die je kunt gebruiken.

**Belletjes op de FAQ-kaart** ● (versiering; dezelfde vier woorden als de zin eronder, uit één lijst)
- NL: Goedkeuren? · Revisies? · Levertijd? · Rechten?
- EN: Approvals? · Revisions? · Delivery time? · Rights?

**Het kenmerk op de AI Act-kaart** ● (versiering; de waarde komt uit src/lib/iptc.js, de echte die in elk bestand komt)
- NL: IPTC · Digital Source Type · ⟨trainedAlgorithmicMedia⟩ · ⟨door een AI-model gemaakt⟩
- EN: IPTC · Digital Source Type · ⟨trainedAlgorithmicMedia⟩ · ⟨made by an AI model⟩
- "Digital Source Type" laat ik in het Engels: zo heet het veld in de IPTC-standaard en zo zie je het in een bestandsviewer.

## 6b · Aanbevelingen ◆

Zelfde teksten als op /pricing (Aanbevelingen.astro); alleen de pil is nieuw. Rendert niets zolang er geen enkele aanbeveling gepubliceerd is.
- NL: Aanbevelingen ◆ · Wat merken zeggen. · zonder naam: Klant van VISUAILS
- EN: Recommendations ◆ · What brands say. · without a name: VISUAILS client

## 7 · Het slotbeeld en vertrouwen

✔ Proef · Eerst zien? Eén product voor ⟨€1⟩ · Gemaakt van jouw eigen foto · ⟨één per bedrijf⟩. · Probeer VISUAILS · ⟨€1⟩ · Of start een bestelling
✔ EN: Trial · See it first? One product for ⟨€1⟩ · Made from your own photo · ⟨one per business⟩. · Try VISUAILS · ⟨€1⟩ · Or start an order
✔ Gemaakt in Enschede · Ingeschreven bij de KVK · Elk beeld door ons gecontroleerd · Directe lijn via WhatsApp / Made in Enschede · Registered with the KVK · Every image checked by us · Direct line on WhatsApp

## 8 · Overal (balk, lade, footer)

Geen nieuwe woorden. Alleen de vorm is anders: Urbanist, geen hoofdletters meer in de groepskoppen, het woordmerk links en groot onderaan. Het ™ achter het logo is overal weg (tv-1).
