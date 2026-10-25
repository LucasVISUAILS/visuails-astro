# Teksten · levering 74 (25 oktober 2026)

Elke zin die een klant leest en die in levering 74 nieuw is of veranderde, NL en EN, met de plek.
Een ● is nieuw of anders; een ○ staat in de code maar is nu niet in beeld (de regels onder de
stappen en de zinnen in de uitlegbalk zijn op 16:56 weggehaald). Jij loopt ze na; ik heb geen
enkele zin als af beschouwd.

## Voorpagina · de opening
● Alt-tekst van de still (`HalOpening.astro`)
  NL: Twee handen houden een laptop met de webshop van een merk en een telefoon met de telefoonfoto van dezelfde roze jeans
  EN: Two hands hold a laptop showing a brand’s web shop and a phone with the phone photo of the same pink jeans
● Naam van de tabs voor een schermlezer
  NL: Kies wat je wilt zien · EN: Pick what you want to see

## Voorpagina · Hoe het werkt (`VoorpaginaHal.astro`)
Catalog
● Stap 1, het bijschrift in het vak · NL: jouw foto’s · EN: your photos
● Stap 2, op het hoogtepunt van de lagen · NL: Gemaakt met AI · EN: Made with AI
○ Stap 1, de regel · NL: Drie foto’s van je product zijn genoeg om te beginnen. · EN: Three photos of your product are all you need to start.
○ Balk 1 · NL: Je uploadt drie foto’s per product: voorkant, achterkant en detail. We kijken meteen of ze compleet zijn. · EN: You upload three photos per product: … We check right away that they are complete.
○ Balk 2 · NL: Wij maken elk beeld uit je foto’s, met dezelfde uitstraling voor je hele set. · EN: We make every image from your photos, with the same look across your whole set.

Lifestyle
● Stappen · NL: Kies je look · Upload je foto’s · Ontvang je beelden · EN: Pick your look · Upload your photos · Get your images
● In het vak van stap 1 · NL: Look gekozen: Flash · EN: Look picked: Flash (de vierde tegel heet zoals je eigen look in de collectie heet; zonder naam "Eigen look" · "Your own look")
● In het vak van stap 2 · NL: de namen van de foto's die binnenkomen (uit `SHOTS`, al bestaande
  namen) en daaronder Compleet · EN: Complete
● In het vak van stap 3 · NL: 4 beelden in Flash · EN: 4 images in Flash
○ Regels · NL: Een look uit de collectie, of een eigen stijl die wij voor je merk ontwerpen. · Upload de foto’s van je product. · In de look die je koos. Vaak binnen een dag, soms een paar dagen.
  EN: A look from the collection, or a style of your own that we design for your brand. · Upload the photos of your product. · In the look you picked. (levertijd)
○ Balk · NL: Je kiest een look uit de collectie, of laat ons een eigen stijl voor je merk ontwerpen. · Je uploadt de foto’s van je product. We kijken meteen of ze compleet zijn. · Je ontvangt je beelden in de look die je koos, en downloadt alles in één keer.
  EN: You pick a look from the collection, or have us design a style of your own for your brand. · You upload the photos of your product. We check right away that they are complete. · You get your images in the look you picked, and download everything at once.

Video
● Stappen · NL: Kies je stijl · Upload je foto’s · Ontvang je clip · EN: Pick your style · Upload your photos · Get your clip
● In het vak van stap 1, onder de stijlen · NL: Voorbeelden volgen binnenkort · EN: Examples coming soon
● In het vak van stap 2 · dezelfde lijst als bij lifestyle, met Compleet · Complete
● In het vak van stap 3 · NL: Voorbeeldclips volgen binnenkort · EN: Example clips coming soon
○ Regels · NL: Een videostijl uit de collectie, of een eigen stijl voor je merk. · Een korte, verticale clip van je product.
  EN: A video style from the collection, or a style of your own for your brand. · A short, vertical clip of your product.
○ Balk · NL: Je kiest een videostijl, of laat ons er een voor je merk ontwerpen. · … · Je ontvangt een korte, verticale clip van je product, voor reels en je webshop. Voorbeelden volgen binnenkort.
  EN: You pick a video style, or have us design one for your brand. · … · You get a short, vertical clip of your product, for reels and your shop. Examples are coming soon.

## Voorpagina · elders
● Formaten, in het beeld naast 16:9 en 9:16 · NL en EN: LIFESTYLE
● Nog vragen?, de kaart van de shootdag · NL: per shootdag, alles meegerekend. · EN: per shoot day, all in.
Weg (de zinnen staan nog in de code): de tekst links van Formaten, de zin in elke kaart van Wat we
maken, de zinnen onder Veelgestelde vragen en AI en de AI Act.

## /how-it-works · de sectie die "Met de hand" heette (`HowItWorksHal.astro`)
● Label · NL: Nagekeken · EN: Checked (was: Met de hand · By hand)
● Kop · NL: Gemaakt met AI. Tot in detail nagekeken. · EN: Made with AI. Checked in every detail.
  (eerst "Nagekeken tot op het detail." · "Checked down to the detail.": brak in drie regels, gemeten op
  1440, 1280 en 390; dit past in twee)
  (was: Meer dan AI. Met de hand afgewerkt. · More than AI. Finished by hand.)
● Zin · NL: Elk beeld wordt in de studio nagekeken tegen je foto voordat jij het ziet.
  EN: Every image is checked against your photo in the studio before you see it.
● Alt-tekst van het na-beeld · NL: Hetzelfde T-shirt, afgewerkt op lichtgrijs en nagekeken · EN: The same T-shirt, finished on light grey and checked

## FAQ (`src/data/faq.js`; ook in de gegevens voor Google op de pagina's met vragen)
● "Is dit AI?" (lang) · NL: …gegenereerd uit foto’s van jouw echte product en nagekeken voordat die wordt geleverd — …
  EN: …generated from photographs of your real product and checked before it is delivered — …
● "Is dit AI, en moet ik dat vermelden?" (twee keer per taal) · NL: …elk beeld wordt gegenereerd uit foto’s van je echte product en nagekeken. …
  EN: …every image is generated from photographs of your real product and checked. …
● "Klopt mijn product?" · NL: Wat we wél doen: elk verschil dat we zien rechtzetten, … · EN: What we do: correct every difference we spot, …

## De belofte over je product (`PRODUCTTROUW` in `src/data/pricing.js`; op /upload-guidelines, /how-it-works en in de FAQ)
● Lang · NL: …kleur, print, logo, sluitingen en naden worden nagelopen en bijgewerkt waar de AI
  ervan afwijkt, … (was: "nagelopen en met de hand bijgewerkt")
  EN: …colour, print, logo, closures and seams are checked and corrected wherever the AI drifts, …
  (was: "corrected by hand")
● Kort · NL: Herkenbaar, nagelopen tegen je foto (was: Herkenbaar, met de hand nagelopen)
  EN: Recognisable, checked against your photo (was: Recognisable, corrected by hand)

## /how-it-works · de beschrijving voor Google (`src/pages/how-it-works.astro`, `nl/how-it-works.astro`)
● NL: Jij stuurt de producten en kiest een leverdatum. Wij maken elke visual en kijken hem na tegen
  je foto. Vanaf 10 producten ligt de datum vast zodra je betaalt. (was: "Wij produceren en
  controleren elke visual met de hand.")
● EN: You send the products and pick a delivery date. We make every visual and check it against
  your photo. From 10 products, the delivery date is fixed once you pay. (was: "We produce and
  hand-check every visual.")
  Het getal 10 komt uit `WINDOW_THRESHOLD` in de code.

## De doorloop (/voorbeeld, `src/data/demo.js`)
● NL: Elk beeld wordt afgewerkt in professionele editingtools, … · EN: Each image is finished in professional editing tools, …

Bewust niet veranderd: "Hooks maken en plannen we met de hand" (/hooks, FAQ) en "we lossen het met de
hand op" (bedankpagina). Dat gaat over planning en contact, niet over hoe een beeld gemaakt wordt.
Ook niet: "we controleren het met de hand" bij een btw-nummer en "dan zetten we hem met de hand in"
bij een bestelling die niet aankwam (het bestelformulier), het menselijke werk in de voorwaarden
(dat gaat over auteursrecht) en "menselijk oordeel op elke visual" op /about. Dat laatste is
positionering; zeg het als je ook die zin weg wilt.
