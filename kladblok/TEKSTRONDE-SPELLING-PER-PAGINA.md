# Tekstronde: de lijst per pagina en per taal (5 november 2026)

Bijlage bij `kladblok/TEKSTRONDE-SPELLING.md` (naloop van levering 73). **Er is geen enkele zin veranderd.**

Gemaakt met dezelfde regels als `npm run spelling` (hunspell nl en en_GB, de zichtbare tekst plus alt, aria-label en title, de eigen woordenlijst in `scripts/meten/spelling.mjs`) en `npm run audit:tekst`, op de build van levering 72 (de tekst is gelijk aan 71), 95 pagina's. Het script zelf toont per woord hoogstens drie pagina's; deze lijst toont ze allemaal.

**Zo lees je hem**

- **●** = om naar te kijken: de punten A en B uit `TEKSTRONDE-SPELLING.md`, en de twee echte fouten hieronder.
- "Onbekend": het woordenboek van de taal van de pagina kent het woord niet. Bijna altijd goed: een samenstelling, een naam, een afkorting (zie C in `TEKSTRONDE-SPELLING.md`).
- "Andere taal": het woord bestaat in de andere taal. Bijna altijd met opzet (Catalog, feed, on-model).
- Woorden op 30 pagina's of meer staan in het menu, de voet of de cookiekaart; die staan één keer, hieronder.

## De twee echte fouten

- **/start/lifestyle en /nl/start/lifestyle:** in het uitklapvak bij "Stukken die samen gedragen worden?" staan twee zinnen zonder spatie aan elkaar: "…achter de prijs.Verkoop je een set…" / "…behind the price.Selling a set…". In `src/components/order/OrderFlow.astro` r. 2929 staat `{LC.waarom} {LC.set}`; de build slikt de spatie tussen de twee in. **Gerepareerd** op 5 november (naloop deel 9): nu `{`${LC.waarom} ${LC.set}`}`.
- **/studio:** "or a whole product at **once once** you have looked at its images" (`StudioHal.astro` › `galleryLede`).

## Op (bijna) elke Nederlandse pagina

- Onbekend: adminportaal (48×), com (48×), cookieloze (48×), Cookievoorkeuren (48×), Eén (48×), gestylede (47×), NL (46×), paginatellingen (48×), productvisuals (46×), Shootdag (46×)
- Andere taal: Analytics (48×), English (48×), hello (48×), on-model (46×), vs (46×)

## Op (bijna) elke Engelse pagina

- Onbekend: com (47×), cookieless (47×), NL (47×), VISUAILS (47×)
- Andere taal: Nederlands (47×)

## Nederlands, per pagina

### /nl/

- Onbekend: catalogbeeld, Catalogset, fashionmerk, shootdag, trainedAlgorithmicMedia
- Andere taal: ads, feed, Phone-made, STD, zip-hoodie

### /nl/about/

- Onbekend: catalogbeeld, Dunes-stijl, Flash-stijl, Glow-stijl, Phone-made-stijl, px, shootdag
- Andere taal: feed, visual

### /nl/ai-act/

- Onbekend: AI-beeld, AI-beeldpijplijn, AI-gebruik, AI-hulpmiddel, AI-persoon, AI-regel, AI-systeem, AI-vermelding, AI-verordening, catalogset, deepfake, deepfakes, DigitalSourceType, IPTC-eigenschap, machineleesbare, trainedAlgorithmicMedia
- Andere taal: AI-melding, AI-model, compliant, contains-synthetic-performer, Merchant, shoot

### /nl/catalog/

- Onbekend: bannerformaat, **● catalog-look**, **● catalog-stijl**, catalogbeeld, catalogfoto, Catalogfoto’s, catalogset, Catalogset, excl, linesheets, productset, px, webshoppagina
- Andere taal: Shopping-feeds, Still, t-shirt, visual

### /nl/catalog/classic/

- Onbekend: **● Catalog-stijlen**, Classic-catalogvisual, Classic-stijl, Marktplaats-proof, Packshots, px, softbox-opstelling
- Andere taal: Classic-set, direction, grid, t-shirt, visual

### /nl/catalog/custom/

- Onbekend: **● catalog-look**, **● Catalog-stijlen**, **● catalogstijl**, **● catalogus-snelheid**
- Andere taal: look-set, props, Props, visual

### /nl/compare/

- Onbekend: catalogset, catalogtarief, excl, productiedag, prompten, retoucheur, shootdag, teamdag, VISUAILS-bestelling
- Andere taal: layout, self-serve, visual

### /nl/contact/

- Onbekend: catalogfoto’s, vr, za, Za

### /nl/cookie-policy/

- Onbekend: botcontrole, botherkenning, cookiebanner, cookieloos, cookievoorkeuren, inloglink, ip-adres, privélink, trackingcookies, trackingpixels, VISUAILS-website, weggeklikt, wegklikt
- Andere taal: analytics, embeds, Turnstile

### /nl/custom-models/

- Onbekend: excl, merkmodel-portret, Zonverbleekte
- Andere taal: AI-tools, Americana, Bold, Coastal, colour-block, editorial, Editorial, energy, feed, High-fashion, luxury, Quiet, sun-worn

### /nl/data-processing-agreement/

- Onbekend: Blackmagic, botcontrole, ByteDance, BytePlus, **● doorlegt**, EXIF-gegevens, Gemini-modellen, HK, Inc, inloglink, ip-adressen, jíj, Magnific, Málaga, NDA, pentest, Pte, sessietokens, subverwerker, subverwerkers, Subverwerkers, Vaarwerkhorst, verwerkersvoorwaarden
- Andere taal: Adobe’s, artificial, circumstances, Company, end-to-end, EU-VS, For, improve, intelligence, LLC, locally, Ltd, models, our, parties, Resend, stored, that, third, third-party, those, TLS, Turnstile, Under, use, visuals, voices, will, Workspace, you, your
- audit:tekst: dubbel woord: "Five Five" (de naam van Resend, Plus Five Five, Inc.), geen fout

### /nl/editions/

- Onbekend: excl, maandset, merkneutraal
- Andere taal: visual

### /nl/faq/

- Onbekend: Act-pagina, Act-regel, AI-gegenereerd, AI-markering, AI-schakelaar, bannerformaat, bannermaat, Catalogbeelden, catalogbestelling, catalogfoto, catalogfoto’s, catalogset, Catalogset, catalogsets, excl, extra-fototarief, FFFFFF, hexcode, logodetail, maandset, Merk-abonnement, merkneutraal, productset, px, shoplistings, socialmediafeeds, socialmediaplatform
- Andere taal: AI-tool, detail-close-up, feed, grade, hook, hooks, layout, posts, props, shoot, visual, visuals

### /nl/gallery/

- Onbekend: Canvastas, catalogbeeld, Catalogset, Dunes-stijl, Flash-stijl, Glow-stijl, Kabelbrei, LEESMIJ, Overshirt, Phone-made-stijl, px, Spiegelselfie, txt, VISUAILS-VIS
- Andere taal: Beam, Hoodie, Lifestyle-visual, op-model, Outerwear, Phone-made

### /nl/guides/

- Onbekend: catalogfoto, excl
- Andere taal: AI-tool, AI-tools, shoot

### /nl/hooks/

- Onbekend: excl
- Andere taal: feed, hook, Hook, hooks, posts, visual

### /nl/how-it-works/

- Onbekend: catalogbeelden, catalogbestelling, catalogset, EU-btw, excl, px, studiodag, uploaddag, VIES-verificatie, vr, za
- Andere taal: editing, Reels, visual

### /nl/lifestyle/

- Onbekend: catalogset, excl, px, VISUAILS-model, webshoppagina
- Andere taal: detail-close-up, Phone-made

### /nl/lifestyle/custom/

- Onbekend: look-scène, look-stijl, stylingrichting
- Andere taal: Phone-made, visual

### /nl/lifestyle/dunes/

- Onbekend: Dunes-scène, Dunes-stijl, excl, **● laaghoekig**
- Andere taal: layout, Phone-made, visual

### /nl/lifestyle/flash/

- Onbekend: excl, Flash-scène, Flash-stijl, flitsverlichte, Social-advertenties
- Andere taal: feed, nightlife-look, on-camera, Phone-made, visual

### /nl/lifestyle/glow/

- Onbekend: **● Campagnekwaliteit-afwerking**, Editorial-merken, excl, Glow-scène, Glow-stijl, **● laaghoekig**, locatieshoot, statementstukken
- Andere taal: editorial, feed, golden-hour, Phone-made, props, visual

### /nl/lifestyle/phone-made/

- Onbekend: excl, Feed-klare, **● lifestyle-scènes**, Phone-made-scène, Phone-made-stijl, **● telefoon-echte**, UGC-achtige, uitsnedes
- Andere taal: feed, Phone-made, posts, Social-first, visual

### /nl/models/

- Onbekend: Fabi, Maegan, Seme, VISUAILS-standaardmodel
- Andere taal: Editorial

### /nl/per-product/

- Onbekend: catalogbeeld, catalogfoto’s, catalogset, excl

### /nl/plans/

- Onbekend: catalogset, Catalogset, catalogsets, contentdrops, excl, maandset
- Andere taal: feed, hooks

### /nl/pricing/

- Onbekend: cataloghoek, catalogset, Catalogset, excl, px, shootdag
- Andere taal: hook, setup
- audit:tekst: punt zonder spatie: "beelden.Twee": op het scherm twee regels of een verborgen variant, geen fout

### /nl/privacy/

- Onbekend: AI-aanbieder, AI-modellen, AI-modellenindustrie, autoriteitpersoonsgegevens, AVG-rechten, bestellink, botcontrole, botherkenning, briefinginhoud, Btw-nummer, ByteDance, BytePlus, cosmetiek, e-Boekhouden, **● eenrichtings-gehashte**, **● eenrichtings-SHA**, **● eenrichtings-versleutelde**, Gemini-modellen, HK, Inc, inloglink, ip-adres, KVK-nummer, Magnific, Málaga, nl, **● privé-webadres**, privélink, Pte, subverwerker, Vaarwerkhorst, vestigings, WhatsApp-berichten
- Andere taal: artificial, circumstances, Company, end-to-end, EU-VS, improve, intelligence, LLC, Ltd, models, our, parties, referrer, Resend, that, third, third-party, those, Turnstile, Under, use, visual, visuals, voices, will, Workspace, you, your
- audit:tekst: dubbel woord: "Five Five" (de naam van Resend, Plus Five Five, Inc.), geen fout

### /nl/start/

- Onbekend: catalogbeeld, EU-btw, excl, VIES-verificatie
- Andere taal: Phone-made

### /nl/start/brand-model/

- Onbekend: Btw-nummer, excl, gezichtstattoo, incl, jóuw, Non-binair
- Andere taal: Curvy

### /nl/start/catalog/

- Onbekend: Bancontact, betaallink, Btw-nummer, **● catalog-look**, catalogset, Catalogsets, EU-btw, excl, Fabi, FFFFFF, Hexwaarde, Maegan, mapnaam, Seme, shoplink, VIES-verificatie, VISUAILS-vak
- Andere taal: Editorial
- audit:tekst: lege link (href="#"): in een verborgen blok dat het script vult (betalen), geen fout
- audit:tekst: punt zonder spatie: "product.Met": op het scherm twee regels of een verborgen variant, geen fout

### /nl/start/custom-look/

- Onbekend: catalogset, Catalogsets, EU-btw, excl, lifestylescène, Lifestylescènes, shoplink, VIES-verificatie
- Andere taal: props

### /nl/start/lifestyle/

- Onbekend: Bancontact, betaallink, Btw-nummer, EU-btw, excl, Fabi, Maegan, mapnaam, Seme, shoplink, VIES-verificatie, VISUAILS-vak
- Andere taal: Editorial, Phone-made
- audit:tekst: lege link (href="#"): in een verborgen blok dat het script vult (betalen), geen fout
- audit:tekst: punt zonder spatie: "product.Met": op het scherm twee regels of een verborgen variant, geen fout
- audit:tekst: punt zonder spatie: "look.Tel": op het scherm twee regels of een verborgen variant, geen fout
- audit:tekst: **● punt zonder spatie: "prijs.Verkoop"** in het uitklapvak "complete look" (twee zinnen aan elkaar; `OrderFlow.astro` r. 2929)

### /nl/start/plan/

- Onbekend: Btw-nummer, catalogset, Catalogset, catalogsets, excl, mnd
- Andere taal: hooks

### /nl/start/video/

- Onbekend: EU-btw, excl, shoplink, VIES-verificatie
- Andere taal: feed, paid

### /nl/studio/

- Onbekend: Act-pagina, Btw-nummer, catalogfoto’s, EFEFEF, Excl, FFFFFF, herkomsttag, lookbook, privélink, Privélink, productmappen, trainedAlgorithmicMedia, voorgevuld
- Andere taal: AI-model, Digital, Editorial, feed, op-model, WhatsApp-link
- audit:tekst: punt zonder spatie: "kijken.Bij": op het scherm twee regels of een verborgen variant, geen fout

### /nl/terms/

- Onbekend: Aansprakelijkheids, Act-pagina, AI-beeld, AI-vermelding, bestellink, betaallink, Catalogbeelden, catalogbestand, catalogfoto’s, DigitalSourceType, hertinten, HK, IE-lijst, IPTC-eigenschap, KVK-nummer, **● lifestyle-scènes**, maandset, machine-uitvoer, machineleesbare, Merk-abonnement, merkneutrale, privélink, proefvisual, publicatieklare, px, sublicentiëren, Vaarwerkhorst, vestigings
- Andere taal: detail-close-up, Digital, visual, Visual, visuals, Visuals

### /nl/test-sample/

- Onbekend: Bancontact, betaallink, Btw-nummer, catalogbeeld, catalogfoto’s, catalogset, Catalogset, excl, Fabi, FFFFFF, Hexwaarde, Maegan, mapnaam, px, Seme, shoplink
- Andere taal: Editorial, Phone-made
- audit:tekst: lege link (href="#"): in een verborgen blok dat het script vult (betalen), geen fout

### /nl/upload-guidelines/

- Onbekend: catalogfoto, catalogfoto’s, catalogset, Spiegelselfie
- audit:tekst: punt zonder spatie: "aan.Zonder": op het scherm twee regels of een verborgen variant, geen fout

### /nl/video/

- Onbekend: webshoppagina
- Andere taal: ads, Reels, visual

### /nl/video/campaign/

- Onbekend: e-mailbanner, paginakop, Productlaunches, Shotlijst
- Andere taal: Campaign-clip, feed, grade, MP, Reels, Stories, visual

### /nl/video/custom/

- Onbekend: Afgekaderd, e-mailbanner, motion-stijl, paginakop
- Andere taal: feed, grade, look-clip, motion-concept, MP, preset, Reels, Stories, visual

### /nl/video/lifestyle/

- Onbekend: e-mailbanner, paginakop
- Andere taal: feed, lifestyle-stills, MP, Reels, Stories, visual

### /nl/video/motion/

- Onbekend: e-mailbanner, E-mailheaders, paginakop
- Andere taal: cuts, feed, feeds, launch-teasers, Motion-clip, MP, Reels, Stories, visual

### /nl/voorbeeld/uitleg/

- Onbekend: Btw-nummer, catalogbeeld, Catalogset, EFEFEF, Excl, FFFFFF, LEESMIJ, mockup, productmappen, pufferjas, px, Spiegelselfie, studiodag, txt, VISUAILS-VIS, voorgevuld, vr, za
- Andere taal: about, Editorial, feeds, gallery, grids, how-it-works, op-model, Reels, Stories, WhatsApp-link

### /nl/voorbeeld/voorpagina/

- Onbekend: catalogbeeld, Catalogset, fashionmerk, shootdag, trainedAlgorithmicMedia
- Andere taal: ads, feed, Phone-made, STD, zip-hoodie

## Engels, per pagina

### /

- Onbekend: trainedAlgorithmicMedia

### /about/

- Onbekend: px, walkthrough

### /ai-act/

- Onbekend: deepfakes, deployer, DigitalSourceType, photoshoot, trainedAlgorithmicMedia
- Andere taal: TikTok

### /catalog/

- Onbekend: excl, px, walkthrough
- audit:tekst: punt zonder spatie: "photos.Every": op het scherm twee regels of een verborgen variant, geen fout

### /catalog/classic/

- Onbekend: Packshots, px, softbox

### /catalog/custom/

- Onbekend: storefront

### /compare/

- Onbekend: excl

### /custom-models/

- Onbekend: don’ts, excl
- Andere taal: Streetwear

### /data-processing-agreement/

- Onbekend: Blackmagic, ByteDance, BytePlus, HK, Inc, Magnific, Magnific’s, Málaga, NDA, Pte, Vaarwerkhorst
- Andere taal: Autoriteit, helpdesk, Persoonsgegevens, Snuverink
- audit:tekst: dubbel woord: "Five Five" (de naam van Resend, Plus Five Five, Inc.), geen fout

### /editions/

- Onbekend: excl
- Andere taal: mo

### /faq/

- Onbekend: excl, FFFFFF, px

### /gallery/

- Onbekend: Overshirt, px, txt, walkthrough

### /guides/

- Onbekend: excl

### /hooks/

- Onbekend: excl

### /how-it-works/

- Onbekend: excl, px, walkthrough
- Andere taal: TikTok

### /lifestyle/

- Onbekend: excl, px, walkthrough
- Andere taal: TikTok

### /lifestyle/dunes/

- Onbekend: excl

### /lifestyle/flash/

- Onbekend: excl
- Andere taal: sneakers, Streetwear

### /lifestyle/glow/

- Onbekend: Eveningwear, excl

### /lifestyle/phone-made/

- Onbekend: excl

### /models/

- Onbekend: Fabi, Maegan, Seme, upsold

### /per-product/

- Onbekend: excl

### /plans/

- Onbekend: excl, orderable

### /pricing/

- Onbekend: excl, px
- audit:tekst: punt zonder spatie: "images.Two": op het scherm twee regels of een verborgen variant, geen fout

### /privacy/

- Onbekend: autoriteitpersoonsgegevens, ByteDance, BytePlus, HK, Inc, Magnific, Magnific’s, Málaga, nl, Pte, Vaarwerkhorst
- Andere taal: Autoriteit, Persoonsgegevens, Snuverink
- audit:tekst: dubbel woord: "Five Five" (de naam van Resend, Plus Five Five, Inc.), geen fout

### /start/

- Onbekend: excl

### /start/brand-model/

- Onbekend: excl, incl

### /start/catalog/

- Onbekend: Bancontact, catalogs, excl, Fabi, FFFFFF, Maegan, Seme
- Andere taal: iDEAL
- audit:tekst: lege link (href="#"): in een verborgen blok dat het script vult (betalen), geen fout
- audit:tekst: punt zonder spatie: "product.With": op het scherm twee regels of een verborgen variant, geen fout

### /start/custom-look/

- Onbekend: excl, orderable

### /start/lifestyle/

- Onbekend: Bancontact, catalogs, excl, Fabi, Maegan, Seme
- Andere taal: iDEAL
- audit:tekst: lege link (href="#"): in een verborgen blok dat het script vult (betalen), geen fout
- audit:tekst: punt zonder spatie: "product.With": op het scherm twee regels of een verborgen variant, geen fout
- audit:tekst: punt zonder spatie: "look.Count": op het scherm twee regels of een verborgen variant, geen fout
- audit:tekst: **● punt zonder spatie: "price.Selling"** in het uitklapvak "complete look" (twee zinnen aan elkaar; `OrderFlow.astro` r. 2929)

### /start/plan/

- Onbekend: excl
- Andere taal: mo

### /start/video/

- Onbekend: excl

### /studio/

- Onbekend: EFEFEF, Excl, FFFFFF, lookbook, trainedAlgorithmicMedia, walkthrough
- audit:tekst: punt zonder spatie: "inbox.You": op het scherm twee regels of een verborgen variant, geen fout
- audit:tekst: punt zonder spatie: "along.Every": op het scherm twee regels of een verborgen variant, geen fout
- audit:tekst: **● dubbel woord: "at once once"**

### /terms/

- Onbekend: DigitalSourceType, HK, px, showpiece, Vaarwerkhorst
- Andere taal: Snuverink

### /test-sample/

- Onbekend: Bancontact, catalogs, excl, Fabi, FFFFFF, Maegan, px, Seme
- Andere taal: iDEAL
- audit:tekst: lege link (href="#"): in een verborgen blok dat het script vult (betalen), geen fout

### /upload-guidelines/

- audit:tekst: punt zonder spatie: "it.Without": op het scherm twee regels of een verborgen variant, geen fout

### /video/

- Onbekend: walkthrough
- Andere taal: TikTok

### /video/campaign/

- Onbekend: recut
- Andere taal: TikTok

### /video/custom/

- Andere taal: TikTok

### /video/lifestyle/

- Andere taal: TikTok

### /video/motion/

- Andere taal: sneaker, TikTok

### /voorbeeld/uitleg/

- Onbekend: EFEFEF, Excl, FFFFFF, px, txt, walkthrough
- Andere taal: TikTok, **● voorbeeld**, **● voorpagina**
- audit:tekst: description te kort: 57: Preview: the mock-ups on the site, animated step by step.

### /voorbeeld/voorpagina/

- Onbekend: trainedAlgorithmicMedia
