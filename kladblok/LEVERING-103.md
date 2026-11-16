# Levering 103 · 15 november 2026

De schermen 9 en 10 uit lijst 112: de voorbeeldrondes en de offerte, in Studio én in /admin. Gebouwd op levering 102. Lucas (03:10): *"Vanaf nu wil ik dat je door blijft gaan met alles wat nog open staat en de komende lijsten 'advies' laat kiezen"*. Hier is daarom overal het advies gevolgd.

## De voorbeeldrondes

1. **De klant verstuurt** zijn aanvraag (levering 102). In **/admin/op-maat** (een tab van Klanten) staat hij bovenaan met "Wij zijn aan zet", en Nu doen op het dashboard zegt het ook.
2. **De studio opent de aanvraag.** Ze ziet:
   - de schatting;
   - alles wat de klant invulde;
   - zijn referentiebeelden;
   - zijn reacties.
3. **De studio zet beelden bij een ronde**: altijd in neutrale kleuren en zonder het product van de klant. Met **"Ronde n naar de klant"** zet ze die ronde klaar. Dat kan alleen met beelden, en alleen als de klant nog niet op die ronde reageerde.
4. **In Studio ziet de klant**:
   - de beelden, alleen achter zijn eigen sessie;
   - de teller (ronde 1 van 3, nog 2 gratis);
   - per beeld goed of aanpassen;
   - de drie vragen: wat is goed, wat moet anders, en wat moet in elk geval blijven (lijst 112, blijven = ja).

   Aanpassen kan pas als hij ook schrijft wat er anders moet.
5. **Stuurt hij zijn reactie**, dan is de studio weer aan zet voor de volgende ronde. **"Dit is goed: naar de offerte"** zet de aanvraag op akkoord.
6. **Na de derde ronde** zegt de teller dat we samen kijken wat er nog kan (lijst 110: daarna kunnen er kosten bij komen).

## De offerte

- **In /admin** zet de studio de offerte als regels "naam;bedrag". De schatting staat er al in, zodat ze alleen hoeft aan te vullen. Totaal en aanbetaling (de helft) rekenen vanzelf.
- **In Studio** ziet de klant de regels, het totaal, de helft nu en de rest bij levering. Hij geeft met één knop akkoord, en de datum van zijn akkoord staat vast.
- **Nog niet gebouwd: het betalen van de aanbetaling.** Na het akkoord ziet de klant dat hij een betaallink krijgt, en /admin zegt "stuur hem de betaallink". Een eigen Mollie-betaling met een factuur voor de aanbetaling is geld, met een factuurreeks en btw. Die bouw ik pas met jou erbij.

## Waar het in /admin staat

- **Een tab van Klanten**, naast Alle klanten en Abonnees, en geen eigen menu-ingang. Advies gevolgd: het menu blijft bij acht ingangen (je keuze van lijst 85, w8), en een vaste plek erbij brak twee bewakers.
- **Nu doen** op het dashboard en in het nachtrapport zegt wanneer wij aan zet zijn:
  - "Op maat: voorbeeld" (de klant verstuurde of reageerde);
  - "Op maat: offerte" (de stijl is goed);
  - "Op maat: aanbetaling" (akkoord op de offerte: stuur de betaallink).

  Zet je de aanvraag op vastgelegd of gesloten, dan gaat de regel weg. Zonder migratie 0071/0072 valt Nu doen niet om, de regel blijft dan gewoon weg.

## Database

- **`migrations/0072-op-maat-rondes.sql`** maakt twee nieuwe tabellen: `maat_voorbeelden` en `maat_offertes`. `UITROLLEN.bat` draait hem zelf.
- **AVG-register 3.10** en de verwijdering van een account nemen beide tabellen en de voorbeeldbeelden in R2 mee.

## Bestanden

- **Nieuw:**
  - `src/lib/opMaatRondes.js`
  - `src/lib/adminOpMaat.js`
  - `migrations/0072-op-maat-rondes.sql`
  - `tests/op-maat-rondes.test.mjs` (`npm run test:opmaatrondes`)
- **Gewijzigd:**
  - `src/pages/account/op-maat.astro`, `src/styles/op-maat.css` en `public/js/op-maat.js` (schermen 9 en 10)
  - `src/lib/opMaatApi.js` (de reactie, het akkoord, de voorbeeldbeelden)
  - `src/lib/account.js` (de route voor een voorbeeldbeeld, de ronde en de offerte in het scherm)
  - `src/lib/admin.js` (de tab bij Klanten, de routes, de AVG-verwijdering)
  - `src/lib/nudoen.js` (de drie regels "Op maat" in Nu doen)
  - `schema.sql`
  - `docs/AVG-VERWERKINGSREGISTER.md`
  - `docs/HOE-VISUAILS-WERKT.md`
  - `tests/op-maat-studio-browser.test.mjs` (de rondes, de offerte en /admin)
  - `package.json`
