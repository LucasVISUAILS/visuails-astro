# Eindverslag ronde 9 — concept (3 oktober 2026, nacht)

Concept: geschreven zonder jou, op de stand van WERKLIJST-RONDE-9.md. Wat nog van jou afhangt staat onder "Werkschema voor jou". Bewijs per punt staat in de werklijst; schermen in `kladblok/ronde-9/`.

## In één alinea

De site doet wat hij belooft voor alle veertien klanttypes. De zware fouten zaten in het bestellen en leveren: hoeken niet berekend vanaf 10 producten (F25), een bord dat alleen cataloghoeken kende (F17), bulk-upload die vakken door elkaar zette (F23, F26), en een abonnement dat bij een plus-adres op het verkeerde account landde (F50). Die staan allemaal live sinds de deploy van 2 oktober 23:16 en zijn daar nagekeken. Wat sindsdien in de werkkopie is gemaakt (herontwerp van Studio, privélink en /admin, plus de kleine punten van vannacht) wacht op jouw deploy.

## Per klanttype

| # | Klant | Wat goed ging | Wat fout ging (hersteld) | Open |
|---|---|---|---|---|
| 1 | Jonge starter | Catalog 1 product, betalen, mails, privélink, revisie, afronden; terugknop/verversen/dubbelklik (testomgeving, 390) | F13 lege revisieronde, F58 terugknop, O75 mail op 390 | maillink op ander apparaat, zip/factuur-pdf openen (downloads = jouw ja) |
| 2 | Boetiek | Leesroute home → dienst → prijzen → FAQ, contact, lifestyle met 4K en 16:9 | F17 indeling, O74 prijsbereik bovenaan dienstpagina's | /admin-klantpagina, factuur nalopen (jij logt in) |
| 3 | Drukke webshop | 12 producten, 72 beelden als map, revisie met "geen nieuw beeld nodig", alles goedkeuren | **F25** hoeken niet betaald, F15, F16, F19 | f t/m l in /admin (jij logt in) |
| 4 | Wantrouwig | WhatsApp, contact, Studiobrief, juridische pagina's, lifestyle 1 product | F34 afmeldlink | O12 tijdsbelofte (besluit) |
| 5 | Engels, buiten EU | Geen btw, Engelse mails en Mollie | F35 Nederlandse inlogcode | — |
| 6 | EU-bedrijf | VIES, btw-lijst afwijzen/goedkeuren, factuur klopt | O20, O22 | — |
| 7 | Bureau | Video- en eigen-lookaanvraag, offerte, levering video | F38–F43, O23–O28 | F44 adres op factuur (besluit) |
| 8 | Merkmodel | Formulier, betalen, vastleggen, bestellen met eigen model | F45, F47–F49, O29 | — |
| 9 | Abonnee | Pro afgesloten (SUB-PFDC-8X6), vaste look, product, week verzet, pauze/hervat, mails | **F50**, F64 terugkeerpagina | weekstart in /admin (5.10), daarna opzeggen |
| 10 | Boos | Revisie op 3 beelden, tegoed, tweede bestelling met tegoed | F51, F52 | — |
| 11 | Annuleerder | Annuleren onbetaald/betaald, terugbetalen, creditnota | O41 | O53 deels terugbetalen (voorstel) |
| 12 | WhatsApp via admin | Klant en bestelling namens hem, foto's later | F54 land, F55 | — |
| 13 | Toetsenbord | Hele keten zonder muis; elke stop heeft een focusring | — | — |
| 14 | Tablet | 768 × 1024 zonder zijwaarts scrollen, keten live | O43 | — |

## DIRECT — gedaan

- Alle F- en O-punten met "hersteld" in de werklijst. Live sinds 2 okt 23:16: F1–F63 voor zover hersteld. In de werkkopie, wacht op deploy: herontwerp Studio/privélink/admin, losse kaartschermen, F64, O8, O16, O24, O29, O31–O33, O35, O41, O43, O45, O57, O70–O77.
- Keuring na het herontwerp: contrast (Studio NL/EN, /admin, licht en donker), Engelse stand, toetsenbordfocus in beide zijbalken — zie `kladblok/ronde-9/herontwerp/keuring-verslag.txt`.
- Stap 9: voorstellen in `CONCEPT-RONDE-9.md`; drie ervan als klikbare schets in `kladblok/ronde-9/concept-schetsen.html` (prijscalculator, keuzehulp, startlijstje), bedragen uit pricing.js.
- Volledige testreeks: groen op de werkkopie (zie onder "Testreeks").

## OPTIONEEL — voor jou

Besluiten (elk met mijn advies in de werklijst):

1. **O12** bedankpagina "meestal binnen het uur" → mijn advies: "meestal dezelfde werkdag".
2. **O55** PURGE_ENABLED op de cron-worker aan (eerst één backup). Zonder dit belooft /privacy iets wat niet gebeurt.
3. **O53** knop "Deel terugbetalen" in /admin — ja/nee.
4. **F30** herkomsttag bij leveren via de browser — meeschrijven bij upload, of /ai-act aanpassen.
5. **F44** adres op de factuur na een aanvraag — verplicht vragen of uit Studio halen (nu: uit Studio).
6. **O60** geen 401 in de console voor bezoekers (cookie "vis_in") — ja/nee.
7. **O47** formulier bewaren bij verversen — ja/nee.
8. Stap 9: per regel ja / nee / later in CONCEPT-RONDE-9.md.

## Niet te testen, en hoe jij het controleert

Zie "Niet te testen" in de werklijst (Safari/iPhone, Outlook, echte betaling, €1-proef met een nieuw adres, chargeback, laadtijd, bounces). Nieuw vannacht: live op 390 lukt vanuit hier niet (het Chrome-venster gaat niet smaller dan het scherm, en de werkplek mag visuails.com niet bereiken); de telefoonbreedte is in de testomgeving gedaan op dezelfde code.

## Werkschema voor jou

1. **Deploy** de werkkopie (alle bestanden die vannacht in je map zijn gezet). Daarna kijk ik op live na: kaartschermen, mail op telefoon, "Vanaf €49".
2. **Resend**: opnieuw verbinden en de webhook met RESEND_WEBHOOK_SECRET zetten (O59).
3. **Cron-worker** deployen (en O55 beslissen).
4. **/admin** (jij logt in, ik kijk mee): klanttype 3 f–l, week starten voor SUB-PFDC-8X6 (5.10), klantpagina klanttype 2.
5. **Opruimen**: "Studio Proefmerk" en SUB-PFDC-8X6 opzeggen na de weekstart; testbestellingen verbergen; HomeV2.astro weggooien (wordt nergens gebruikt).
6. **Besluiten** hierboven, en stap 9.

## Testreeks

157 scripts uit package.json "test" (zonder test:bouw), na `npm run build` op de werkkopie van 3 okt 02:53: alles groen. Eén toets aangepast omdat het gedrag bewust veranderde: tests/request-flow (O77, "1 clip"), tests/plan-fotos (O71, ?ok=toegevoegd); tests/ronde9 slaat HomeV2.astro over.
