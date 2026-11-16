# Levering 104 · 15 november 2026

De offerte op maat met betaallink, vanuit /admin. Gebouwd op levering 103. Jouw keuzes (15:21): de helft nu en de rest later, de klant drukt op **Akkoord** of **Iets aanpassen**, bij akkoord gaat de betaallink vanzelf naar het mailadres van de offerte, bedragen exclusief btw, en na de betaling een gewone bestelling.

## Zo loopt het

1. **Jij, in /admin/op-maat/<nummer>.** Je vult alles in en mailt de offerte met één knop:
   - de regels (naam;bedrag), beginnend met de schatting;
   - het mailadres voor de offerte en de betaallink (standaard dat van het account);
   - het land en het btw-nummer.

   De btw volgt dezelfde regel als elke bestelling: Nederland 21%, een ander EU-land met een door VIES bevestigd nummer verlegd, buiten de EU geen btw. Je ziet meteen wat de klant nu betaalt en wat later.
2. **De klant krijgt een mail** met de regels, het totaal, de helft nu (met btw) en de rest bij levering, en een knop naar de offerte in Studio.
3. **In Studio kiest hij:**
   - **Akkoord, stuur de betaallink.** Eerst vinkt hij aan dat hij zakelijk bestelt; bij verlegde btw staat de verleggingszin erin. Dan wordt het een gewone bestelling ("Catalog op maat" enz.) voor de helft, en gaat de bestaande betaallinkmail naar het adres van de offerte. In Studio staat ook een knop "Betaal €…".
   - **Iets aanpassen.** Hij schrijft wat er anders moet. De aanvraag komt terug bij jou, Nu doen zegt "Op maat: offerte · Offerte aanpassen", en je mailt een nieuwe offerte.
4. **Betaalt hij**, dan doet de webhook wat hij altijd doet: betaald, factuur ("Aanbetaling · Catalog op maat — volgens offerte"), en de bestelling staat in de planning.
5. **Het restant** vraag je op die bestelling met de bestaande knop "Restant vragen". Het bedrag (de andere helft) staat er al in. Mail en factuur zeggen ook daar "Catalog op maat".

## Wat er kan misgaan, en wat je dan ziet

- **De betaallink ging bij het akkoord niet weg** (geen Mollie- of mailsleutel). Dan zegt Nu doen "Op maat: betaallink · Betaallink sturen", en in /admin staat "Betaallink opnieuw mailen". De klant ziet in Studio dat de link volgt, en kan daar al betalen.
- **De offertemail ging niet weg** (geen mailsleutel). Dan zegt /admin dat meteen na het mailen.
- **Een gemailde offerte terugnemen?** Zet de stand terug naar "akkoord" en mail een nieuwe. Naar "offerte" en "vastgelegd" kan alleen nog via de offerte zelf, zodat er altijd een offerte en een bestelling achter staan.
- **Een bestelling die niet aangemaakt kon worden** zet het akkoord terug, zodat de klant het opnieuw kan proberen.

## Database

- **`migrations/0073-op-maat-offerte.sql`**: elf kolommen op `maat_offertes`:
  - mailadres, land, btw-nummer, btw-behandeling en -tarief, en het VIES-raadplegingsnummer;
  - wanneer de offerte gemaild is;
  - de bestelling die bij het akkoord ontstond;
  - de gevraagde aanpassing;
  - wanneer de betaallink wegging.

  `UITROLLEN.bat` draait hem zelf.
- **Bij verlegde btw** staat het VIES-bewijs ook op de bestelling (`vat_valid`, `vat_consultation`), waar de factuur en de ICP-opgaaf het lezen.
- **AVG-register 3.10** noemt de nieuwe gegevens. De bestelling die ontstaat, valt onder 3.1 (de fiscale bewaarplicht).

## Bestanden

- **Nieuw:**
  - `src/lib/opMaatOfferte.js` (de btw, de offertemail, akkoord, aanpassen, opnieuw sturen)
  - `migrations/0073-op-maat-offerte.sql`
  - `tests/op-maat-offerte.test.mjs` (`npm run test:opmaatofferte`, 40 controles)
- **Gewijzigd:**
  - `src/lib/adminOpMaat.js` (het offerteformulier, "Betaallink opnieuw mailen", alleen standen die kloppen)
  - `src/lib/opMaatApi.js` (akkoord en aanpassen)
  - `src/lib/opMaatRondes.js` (de oude offertefuncties zijn eruit)
  - `src/lib/opMaat.js` (welke standen je met de hand mag zetten)
  - `src/data/opMaat.js` (de tekst bij "vastgelegd")
  - `src/lib/account.js` (de offerte in Studio)
  - `src/pages/account/op-maat.astro`, `public/js/op-maat.js`, `src/styles/op-maat.css` (scherm 10)
  - `src/lib/nudoen.js` (aanpassing en betaallink)
  - `src/lib/betaallink.js` en `src/lib/invoice.js` ("Catalog op maat", "de helft van je offerte")
  - `src/lib/admin.js` (het restant staat al ingevuld en neemt de dienst mee)
  - `schema.sql`
  - `docs/AVG-VERWERKINGSREGISTER.md`
  - `docs/HOE-VISUAILS-WERKT.md`
  - `tests/op-maat-rondes.test.mjs`
  - `tests/op-maat-studio-browser.test.mjs` (akkoord, aanpassen, /admin: 53 controles)
  - `package.json`
