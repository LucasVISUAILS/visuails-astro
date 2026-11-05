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

## 4 · De stappen (uit de naloop; elke bevinding eerst zelf nagekeken in de code)

De naloop liep in vier delen tegelijk (/admin; Studio en de privélink; de openbare API, de webhooks en de cron; wat
overal geldt). Het derde deel werd halverwege gestopt en is opnieuw gestart met een smallere opdracht (alleen lezen:
bestellen, uploaden, de betaalwebhook, de mailwebhook, de nachtelijke taak); dat deel leverde stap 14 tot en met 19. Elke bevinding hieronder heb ik zelf in de code nagelezen voordat ik hem opnam.
"Raakt" verwijst naar de punten in §1.

| Stap | Wat | Ernst | Raakt | Bewijs eerst |
|---|---|---|---|---|
| 1 | **De grens van 100 waarden per query** (D1). Het dashboard van /admin geeft een 500 zodra de lijst meer dan 100 verschillende klanten heeft; de rode pil "teruggeboekt" en de markering "mail kwam niet aan" vallen dan stil weg; ook Studio (feedback bij >100 bestellingen), het kiezen van veel beelden, Formaten en het wissen van een grote klant. Eén hulpfunctie die in groepen van 80 vraagt | middel (zeker, groeit mee met de zaak) | 1, 6 | de nep-D1 dwingt de echte grens af; /admin met 150 klanten |
| 2 | **Studio: "Gegevens opslaan" met een leeg KvK-veld** gooit een fout (nagespeeld); en `?fout=__proto__` of `?ronde=valueOf` laat een pagina vastlopen | middel / laag | 4 | nagespeeld |
| 3 | **Studio: het e-mailadres wijzigen en terugzetten.** Wie een sessie heeft gestolen, kan met een tweede wijziging en een openstaande bevestiging het terugzetten van de eigenaar omzeilen. Erbij: een grens per klant op wijzigingsmails, en het IP-adres in `email_changes` gezouten in plaats van kaal | middel | 3, 4, 8 | de keten nagespeeld in een toets |
| 4 | **Studio: de inlogcode.** Het tellen van pogingen is "eerst lezen, dan schrijven" (gelijktijdige pogingen tellen niet mee); per account geen grens per dag | laag | 4 | gelijktijdige pogingen in een toets |
| 5 | **De privélink kan een bestelling buiten het venster heropenen** (Studio controleert dat wel) | laag | 5 | nagespeeld in een toets |
| 6 | **Bestanden met een oud, onbekend type** worden met dat type getoond (alleen gegevens van vóór 31 augustus) | laag | 5 | toets |
| 7 | **De open doorverwijzing in `/api/order`** (`https://visuails.com//kwaad/thank-you` → `//kwaad/thank-you`) | laag-middel | 7 | nagespeeld |
| 8 | **/admin:** twee foutmeldingen zonder `esc()`, de omleiding van `?thema=` met het ruwe pad, een restant dat twee keer kan, en een offerte van 0 cent | laag | 1, 2 | toetsen |
| 9 | **Mail:** geen regeleinden of stuurtekens in het onderwerp | laag | 8 | toets |
| 10 | **Headers op HTML die de Worker zelf maakt** buiten de drie helpers (de tussenpagina naar Mollie, de Nederlandse 404): nosniff en frame-ancestors erbij. Alleen deze twee: een strengere CSP kan de stap naar Mollie breken | laag | 2, 6, 9 | toets |
| 11 | **Opruimen:** verlopen sessies en inlogcodes blijven in de database staan | laag (groei) | 1, 4, 10 | toets |
| 12 | **De back-up:** de controle op geheimen gebeurt pas nadat het bestand in Google Drive staat | laag | 11 | toets |
| 13 | **Een klant wissen:** eerst de bestanden, dan de database; mislukt de database, dan zijn de bestanden weg en de gegevens niet | laag-middel | 1 | toets |
| 14 | **De betaalwebhook: een betaalde bestelling kan voorgoed onbetaald blijven.** De rij in `payments` staat vóór `UPDATE orders SET payment_status = 'paid'`. Hapert D1 op die UPDATE, dan 500 en Mollie komt terug, maar de herhaling stuit op de UNIQUE van `payments`, leest dat als "al gedaan" en stopt. De nacht stuurt dan een betaalherinnering en annuleert later een bestelling die betaald is. Ook: mislukt de tijdlijnregel "Betaling ontvangen" (geen `.catch`), dan gaan factuur en melding nooit uit | **hoog** | 6, 8 | nagespeeld: eerste aflevering faalt op de UPDATE, de tweede moet hem alsnog op betaald zetten |
| 15 | **Mislukte incasso: bij elke herhaalde aflevering opnieuw een mail** aan de klant en de studio (`ON CONFLICT DO NOTHING` zonder naar het resultaat te kijken) | laag-middel | 6, 8 | toets met twee afleveringen |
| 16 | **De betaalwebhook: een 429 of 401 van Mollie telt als blijvend** (200, Mollie stopt met proberen), dus een echte `paid` kan wegvallen bij drukte of tijdens een sleutelwissel | laag-middel | 6 | toets |
| 17 | **De betaalherinnering van de nacht: eerst versturen, dan stempelen.** Lukt het stempelen niet, dan de volgende nacht nog een herinnering met een tweede Mollie-betaling; twee runs tegelijk sturen er twee. Eerst claimen, en bij een fout de claim terug | laag | 6, 10 | toets |
| 18 | **Upload:** de hele body wordt gelezen vóór de groottecontrole (eerst `Content-Length`); en DELETE kan een foto weghalen die al aan een geplaatste bestelling hangt | laag | 7 | toets |
| 19 | **`/api/plan`: mislukt het opzoeken van een bestaand adres, dan telt het als nieuw** (`.catch(() => null)`); dat heropent het pad dat op 19 oktober dicht ging. Weigeren in plaats van doorlaten | laag | 6, 7 | toets |

**Niet in deze ronde, met advies (in de notitie):** /admin op een eigen subdomein (de sterkste stap, maar dat vraagt
DNS en Cloudflare van Lucas); inloggen via de link uit de mail zonder vooraf geopend tabblad (een bewuste keuze in de
code); het verschil in antwoordtijd bij een bekend of onbekend adres; de bevestiging van een nieuw e-mailadres op een
GET (een mailscanner kan hem openen); teksten uit de adresbalk in meldingen van /admin (onschadelijk gemaakt, maar te
kiezen); de zouten in `app_settings` die in de back-up meegaan; de lokale Miniflare-bestanden die nog in git staan
(onder "Mag weg"). Uit het vierde deel van de naloop, nagekeken maar bewust niet nu: Turnstile op `/api/plan` (een
nieuwe stap in het abonnementsformulier); de landcode bij bestellen en abonneren tegen de lijst houden (raakt de btw,
en een land dat in het formulier staat maar niet in de lijst zou een echte klant weigeren); lengtegrenzen op de velden
van `/api/order`; de oude checklist-tak in `/api/order` (stuurt niet meer mail dan het contactformulier); de
studiobrief en de uploadgrenzen als D1 helemaal plat ligt (dan ligt alles plat); een merkteken op de creditherinnering
zodat een tweede run op dezelfde dag niet opnieuw mailt.
