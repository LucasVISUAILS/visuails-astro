# Plan · Op maat (custom catalog, lifestyle, hooks, video)

**14 november 2026.** Gebouwd uit lijst 107 (alles volgens het advies) en je idee van 05:26. Volgorde (q7, q8): eerst
het gedeelde deel, daarna catalog, lifestyle, hooks en video; na stap 2 van het kaartveld, in de nieuwe kleuren.

## Hoe het voor de klant loopt

1. **Op maat kiezen.** Op elke dienstpagina een knop "Op maat"; hij kiest catalog, lifestyle, hooks of video.
2. **Kort begin op de site** (q2 c): zijn merknaam, wat hij verkoopt, zijn e-mailadres. Daarmee krijgt hij een account
   (een inloglink per mail, zoals nu) en gaat hij verder in Studio.
3. **In Studio:** het merkprofiel (g1, één keer), de eigen stap van de dienst, referenties (g2), wat het nooit mag
   zijn (g3), vragen buiten de lijntjes met een voorbeeldantwoord (g4), praktisch. Hij kan tussendoor stoppen (g5).
4. **Overzicht en versturen** (g6), zonder te betalen (q3). Een kopie per mail. De aanvraag staat als tegel in Studio.
5. **Het concept als bord in Studio** (q5): per foto goed of aanpassen met een notitie, daarna kort bellen als het
   nodig is. Elk besluit staat vast met datum (g7).
6. **Offerte en aanbetaling**, proefset, correctierondes (q1: één op het concept en één op de proefset; onze fouten
   altijd gratis), en daarna de **stijlkaart** per productsoort, zichtbaar voor de klant (q6).

## Per dienst (src/data/opMaat.js)

- **Catalog:** per productsoort de voorkant. Schoen, tas en pet in de 3D-stap (draaien, licht, camera, op zwart met
  mint spikkels, q4 a); zachte kleding met legwijzen in plaatjes. De omgeving, het model voor de on-model foto. Back,
  detail en on-model komen als concept van ons (c7).
- **Lifestyle:** de momentenbouwer met jouw drie eisen, tijd en licht, plek, mensen, energie en pose (wie en welk
  lichaamsdeel), formaten. De camera stellen wij voor (l6 later).
- **Hooks:** kanaal, het eerste moment, een storyboard van vier vakjes, het beeld waar hij in doorloopt, tekst en
  geluid, zijn eigen stijl hergebruiken.
- **Video:** doel, kanaal, lengte en formaat, de shotlijst (hoogstens vijf shots), hoofdproduct, bijstukken, materiaal
  (verplicht), tempo, geluid, eindbeeld, referentievideo's. De camerabeweging op het 3D-product komt later (v3).

## Wat er al staat (in mijn werkkopie, nog niet in je map)

| onderdeel | bestand | stand |
|---|---|---|
| vier tabellen: merkprofiel, aanvragen, referenties, besluiten | `migrations/0071-op-maat.sql`, `schema.sql` | klaar |
| wat de intake vraagt, per dienst, in NL en EN | `src/data/opMaat.js` | klaar, teksten voor jouw tekstronde |
| opslaan met versie, versturen, concept-bord, referenties, concept weggooien | `src/lib/opMaat.js` | klaar |
| het AVG-verzoek wist ook de aanvragen en de referentiebeelden | `src/lib/admin.js` | klaar |
| toets (36 controles, op een echte database) | `tests/op-maat.test.mjs`, `npm run test:opmaat` | groen |

## Wat nog komt, in deze volgorde

1. De eindpunten (`/api/op-maat`): beginnen, opslaan, versturen, referentie uploaden, besluit.
2. Het korte begin op de site (`/start/op-maat`, `/nl/start/op-maat`) en de knop "Op maat" op de dienstpagina's.
3. Studio: de tegel, de stappen met tussendoor opslaan, het overzicht, de kopie per mail.
4. De eigen stap per dienst: catalog eerst (de 3D-stap uit de proef met schoen, tas en pet; de legwijzen), dan
   lifestyle, hooks en video.
5. /admin: de aanvragen, het concept-bord zetten, de stand verder zetten.
6. Bij elk onderdeel een lijst met schermafdrukken.

## Wat jij nog beslist

- Prijzen: een nieuwe houding, extra foto's per soort, en of er later een ontwerpbedrag komt (q3 b). Tot dan: op
  aanvraag. Ik zet nergens een bedrag.
- Hoe snel het concept er is (ik noem geen termijn tot jij hem noemt).
- De 3D-modellen van tas en pet: zelf maken of met een licentie (de voorbeeldschoen is CC BY, met naamsvermelding).
