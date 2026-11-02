# Levering 82 · De letter en de lucht van 80 in Studio, de privélink en /admin

**2 november 2026 (gevraagd 01:52, je keuzes meteen daarna). Staat alleen in je map; je rolt zelf uit met
`UITROLLEN.bat`.** Bouwt voort op levering 81. De maten staan in `docs/RUST-80.md` §10. Het voorbeeld en je
oordeel: lijst 67.

---

## 1 · Wat je vroeg

- **01:52**: *"Ja door met Studio en admin"*.
- Je drie keuzes:
  - **De letter**: in alle drie (Studio, de privélink en /admin) lopende tekst 370, wat 500 was 450.
  - **De koppen**: alleen de paginakop van Studio en de privélink in VISUAILS Display, in hoofdletters. Kleine
    koppen in kaarten en heel /admin blijven DM Sans.
  - **De lucht**: Studio (en de privélink) één stap ruimer op de schaal; /admin blijft dicht.

## 2 · Wat er staat

### De letter
- **370 en 450** in `studio.css` en `studio-hal.css` (21 regels), `public/portal.css` (12) en `public/admin.css`
  (13), in de regels zelf; daarnaast de grote getallen in "Wat een credit oplevert" (CreditKaart). Gemeten op elke
  pagina: nergens nog DM Sans op 400 of 500. De vette delen (600 en 700: knoppen, referenties, kleine koppen)
  blijven zoals ze zijn, net als de mono-labels.

### De paginakop
- **Studio** ("WELKOM TERUG, MARA", "BESTELLINGEN", "ABONNEMENT & FACTURERING" …) en **de privélink** ("JE
  BESTELLING") in VISUAILS Display Bold, hoofdletters, zoals de koppen van de site. "Welkom terug," houdt zijn
  tweede toon (grijs).
- **De maat is niet veranderd** (Studio 40, telefoon 32; de privélink 36), want gemeten past hij overal op twee
  regels, ook met een lange voornaam ("WELCOME BACK, MAXIMILIAAN"). Alleen de pagina's zonder bestelling ("WE
  KUNNEN JE BESTELLING NU NIET BEREIKEN") zijn op de telefoon kleiner: min(36, 7 vw).
- De letter wordt vooraf geladen, zodat de kop niet verspringt.
- **/admin** houdt zijn koppen in DM Sans: dat is jouw werkplaats.

### De lucht (Studio en de privélink)
- **Studio**: de zijmarge 40 → 51 (telefoon 18 → 21), boven de kop 36 → 51, eronder 32 → 38, tussen de blokken
  40 → 51, onderaan 64 → 90, tussen de bestellingen 20 → 28.
- **De privélink**: de zijmarge 24 → 28 (telefoon 16 → 21), boven de kop 28 → 38, tussen de blokken 24 → 28,
  onderaan 48 → 67. De zin onder de kop kreeg 8 px lucht (hij lag er met de hoofdletters bijna tegenaan).
- Binnen een kaart verandert niets. **/admin** blijft dicht.

## 3 · Wat je kunt weggooien

Niets.

## 4 · Nagekeken

- `npx astro build`: klaar, zonder fouten. De hele testreeks: **273 van de 273 stappen goed**.
- **Nieuwe toets** `tests/werkplaats-82.test.mjs` (npm run test:werkplaats82, in de keten na publiek81): de letter
  in de bestanden en vooraf geladen; Studio (zeven pagina's, NL en EN), de privélink (ook de pagina's zonder
  bestelling) en /admin (zeven pagina's) op 1280 en 390 tegen de echte Worker: lopende tekst 370 en nergens 400 of
  500, de kop in Display in hoofdletters op hoogstens twee regels (/admin: DM Sans), de marges en de gaten tussen
  de blokken, niets zijwaarts, geen scriptfout.
- **Op het oog**: twintig schermen voor en na op 1280 en 390 (lijst 67).
- **Contrast** verandert niet: de kleuren en de lettermaten van de lopende tekst zijn dezelfde, alleen de dikte
  gaat van 400 naar 370.

## 5 · Uitrollen

Rol uit met `UITROLLEN.bat` vanuit je map. Het commitbericht staat in `kladblok/COMMIT-BERICHT.txt`.
