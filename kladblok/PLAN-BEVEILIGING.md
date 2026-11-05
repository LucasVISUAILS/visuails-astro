# Plan: de beveiliging en de back-end sterker (5 november 2026)

Lucas: *"Kijk hoe je de beveiliging van de website kan gaan verbeteren en de back-end sterker kan maken om problemen
te voorkomen in de back-end. Controleer dit op de gehele website, inclusief /admin en Studio. Doe dit uitgebreid en
maak een plan voor jezelf om dit goed uit te voeren met nacontrole na elke stap. Ik heb 2FA aan staan voor /admin en
dit mag niet kapot gaan terwijl je aanpassingen doorvoert dus let hier op en kijk vooraf nog meer wat echt niet kapot
mag gaan en onthoud dat bij elke stap. Controleer jezelf altijd en wees kritisch."*

Dit plan is voor mezelf; de uitkomst staat in `kladblok/LEVERING-BEVEILIGING.md`. Het nummer van de levering laat ik
aan de chat met de brug (die gaat verder bij 89).

## 1 · Wat echt niet kapot mag

Bij elke stap lees ik deze lijst opnieuw en schrijf ik op welke punten de stap kan raken.

| # | Wat | Waarom het kwetsbaar is | Welke toetsen het bewaken |
|---|---|---|---|
| 1 | **/admin inloggen met de tweede stap**: wachtwoord → halve sessie (15 min) → code uit de app → dashboard; herstelcodes; elke code één keer; uitzetten, nieuwe codes en opnieuw beginnen vragen zelf een code | Lucas heeft hem aan. Breekt hij, dan komt hij niet meer in /admin, en via /admin loopt alles (leveren, betalen, klanten) | `test:tweedefactor` (49), `test:vangnet` §1 en §5 (nieuw), `test:beveiliging`, `test:beveiliging8okt`, `test:beveiliging69` |
| 2 | **De Origin-controle van /admin en Studio** (`originIsSelf`: eerst `Sec-Fetch-Site`, dan `Origin`) en `Referrer-Policy: same-origin` | Op 1 augustus gaf elke knop in /admin een 403, omdat `no-referrer` Chrome `Origin: null` liet sturen. Er was geen toets voor | `test:vangnet` §2, §3 en §4 (nieuw) |
| 3 | **De koekjes**: `vis_admin` met `Path=/admin` en `SameSite=Strict`; `vis_account` met `Path=/account` en `SameSite=Lax` | `Path=/admin` is waarom elke beheerroute onder /admin moet staan. `Lax` (niet `Strict`) is waarom de inloglink uit de mail werkt: in augustus brak `Strict` het inloggen | `test:vangnet` §4, `test:signin` |
| 4 | **Studio inloggen** met de code of de link uit de mail; uitloggen | Elke klant komt zo binnen | `test:signin`, `test:code`, `test:scheiding` |
| 5 | **De privélink** `/o/<kenmerk>` | Klanten keuren daar zonder inlog goed en downloaden | `test:scheiding` §4, `test:revisieronde`, `test:herbestel`, `test:afrondscherm` |
| 6 | **Betalen**: de Mollie-webhook (bestellingen, abonnementen, bijkopen, terugbetalingen), idempotent | Een fout kost echt geld of een dubbele factuur | `test:mollie`, `test:geld`, `test:geld69`, `test:abo*`, `test:bijkopen`, `test:terugboeking` |
| 7 | **Bestellen en uploaden**: `/api/order`, `/api/upload`, Turnstile, VIES | De voordeur | `test:order`, `test:upload`, `test:afvink8okt` (Turnstile), `test:vat` |
| 8 | **Mail**: Resend, de bounce-webhook (Svix-handtekening) | Inlogcodes en leveringen gaan per mail | `test:email`, `test:bounces`, `test:mailsmerk` |
| 9 | **De CSP en de hashes van de inline scripts** (bouwstap `csp-scripts`) | Een script zonder hash doet het niet meer op de site | `test:cspscripts`, `npm run check:csp` |
| 10 | **De nachtelijke cron** | Herinneringen, opruimen, incasso's | `test:retention`, `test:nachtgrenzen`, … |
| 11 | **Uitrollen, terugdraaien, back-up** | Het gereedschap waarmee Lucas zelf werkt | `test:uitrol`, `test:testreeks`, `test:backupterugzet` |

**Drie regels die uit deze lijst volgen:**
- **Geen nieuw verplicht geheim.** Wat een geheim nodig heeft dat live misschien niet gezet is, moet zonder dat geheim
  blijven werken zoals nu (of de stap komt eerst in `LIVE-STAPPEN.md`, en dan is het een vraag aan Lucas). Een strenge
  controle die live zonder sleutel alles weigert, is een uitrol die de site breekt.
- **Geen migratie die nodig is om in te loggen.** Werkt een wijziging alleen met een nieuwe kolom, dan moet hij zonder
  die kolom terugvallen op het oude gedrag (zoals `gebruikTotp()` doet als migratie 0052 ontbreekt). Liefst geen
  migratie in deze ronde.
- **Niet aan de inlog van /admin zelf** (`handleLogin`, `pendingAdmin`, `handleCodePost`, `gebruikTotp`,
  `currentAdmin`, `originIsSelf`, de koekjes) zonder dat er eerst een toets ligt die precies die wijziging bewaakt, en
  zonder de hele 2FA-set ervoor en erna.

## 2 · De werkwijze per stap (de nacontrole)

1. **Vooraf:** welke punten uit §1 kan deze stap raken? De code die ik verander helemaal lezen, en elke aanroeper
   (`grep`).
2. **Eerst het bewijs:** waar het kan, een toets die het gat laat zien en op de oude code **rood** is.
3. **De wijziging**, zo klein mogelijk. Geen opmaak en geen tekst die een klant ziet, tenzij het moet (dan in
   `TEKSTEN-BEVEILIGING.md`, NL en EN).
4. **Nacontrole, altijd, in deze volgorde:**
   - de nieuwe toets groen;
   - **de 2FA-set**: `test:vangnet`, `test:tweedefactor`, `test:beveiliging`, `test:beveiliging8okt`,
     `test:beveiliging69`, `test:scheiding`, `test:signin`, `test:admin`;
   - de toetsen van elk bestand dat ik raakte;
   - `npx astro build` als er iets in `src/` veranderde;
   - **de diff regel voor regel teruglezen** met één vraag: kan dit inloggen, de tweede stap, de Origin-controle, een
     betaling of een mail raken? Twijfel = niet doen, of eerst een toets erbij.
5. **Opslaan:** een commit "Onaf: …" en pushen; bovenaan de notitie wat nog niet af is.

## 3 · Eindcontrole

- De hele testreeks (`TESTREEKS_TEGELIJK=4 node scripts/testreeks.mjs`).
- `npm run kruip`, `npm run check:csp`, `npm run audit`, `npm run visueel` (er hoort niets zichtbaar te veranderen).
- **De echte Worker, lokaal** (`kladblok/_doorloop-worker.mjs`: de gebouwde site met een eigen D1 en R2, en een
  nep-Mollie en nep-Resend die alles opvangen wat naar buiten gaat): van buitenaf inloggen in /admin **met de tweede
  stap aan**, met de headers die Chrome stuurt; een knop in /admin; uitloggen; een klant die inlogt; een bestelling met
  een nep-betaling.
- `npm audit`.

## 4 · De stappen

Komen hierna, uit de naloop (stap 1 van de taken): per bevinding de ernst, het bewijs in de code, de reparatie en de
toets. Wat ik niet repareer, staat er met de reden.
