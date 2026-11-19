# Levering 117 · De zware punten uit de proefronde

**17 november 2026. Staat alleen in je map; je rolt zelf uit met `UITROLLEN.bat`.**

Je koos in lijst 127 overal het advies (16:48). Dit zijn de 2 blokkerende en 17 hoge punten. De 90 middenpunten komen in
levering 118, de lage en kleine in 119. Het pakket en het sectiesysteem op de andere pagina's schuiven op tot daarna.

## Eerst: wat jij moet doen

1. **Turnstile, de Resend-webhook en analytics (W1-10).** Live staat er geen botcheck. Zolang dat zo is, kan elk
   internetadres hoogstens 5 keer per dag foto's uploaden (de site is dan bewust streng). Volg `LIVE-STAPPEN.md`
   §6 (Resend-webhook), §6b (Turnstile) en §6c (analytics: `PUBLIC_CF_ANALYTICS_TOKEN` in `.env` ontbreekt nog, dus er wordt
   niets gemeten, ook niet bij wie toestaat). De live Mollie-sleutel blijft tot je open gaat op test (§9).
2. **Foto's boven de 50 (B1-06).** Kijk in /admin of er al bestellingen zijn met precies 50 foto's terwijl er meer
   gestuurd zijn. De ontbrekende foto's staan nog in de opslag onder `intake/<batch>/`; na de uitrol ziet /admin ze weer.
3. **Opruimen (B1-12).** Laat na de uitrol één nacht het opruimen in verslagmodus draaien en kijk of de telling klopt
   (`LIVE-STAPPEN.md` §5). Gebruik *Voorgoed verwijderen* pas daarna weer.
4. **Factuurreeks (P5-08).** Kijk of de echte reeks (VIS-2026-…) al een nummer van een testbetaling heeft. Zo ja: een
   creditnota.
5. **Btw verleggen met de hand (P5-04).** Stem eerst met je boekhouder af of een met de hand gecontroleerd nummer zonder
   VIES-raadplegingsnummer op de factuur goed genoeg is.
6. **Nalezen:** de nieuwe zin over de 2-jaarskopie in voorwaarden §8 (contracttekst), de bewaartabel (de termijn bij de
   beeldmaker "met de hand binnen 90 dagen na levering" moet je ook zo doen), en de klantmail "Je betaling is binnen — je
   leverdatum is vervallen".
7. **Video:** maak de clips voor Motion en Custom (2 elk, `src/data/videoExamples.js`), later één voor de bovenkant van
   /video en een echte hook voor /hooks.

## Wat er veranderde

| punt | wat er mis was | nu |
|---|---|---|
| B1-06 | een bestelling met meer dan 50 foto's kreeg er 50 | de opslag wordt helemaal doorgebladerd: 60 van 60 |
| B1-12 | de nachtelijke opruiming faalde al 12 nachten; *Voorgoed verwijderen* wiste te veel | geen te lang zoekpatroon meer; bij twijfel blijft een bestand staan |
| P3-09 | een leverdatum na ±2 weken werd altijd geweigerd | de gekozen dag wordt zelf getoetst; datums tot 60 dagen werken |
| P5-08 | een testbetaling van een offerte of restant gaf een echt factuurnummer | één gedeelde regel voor de proefstand, overal waar een bestelling ontstaat |
| P3-10 | wie te laat betaalde hield zijn datum, ook als een ander de dag intussen had | bij betalen wordt de agenda opnieuw getoetst; past het niet, dan gaat de datum leeg met een mail aan klant en jou |
| P12-01 | ingelogd bestellen voor een ander merk vulde je account met diens btw/KVK | het account verandert alleen met het vinkje *Bewaar* |
| P5-12 | een Merk-abonnee betaalde €450 voor het inbegrepen merkmodel | ingelogd €0, "Inbegrepen in je abonnement", één per abonnement; de op-maatschatting telt hem niet |
| P8-01 (a) | voorrang én leverdatum bij 10–20 producten | voorrang alleen tot 9 producten; de voorwaarden lezen dat getal |
| P5-04 (a) | VIES keurt af en /admin kon niet verleggen | derde knop op /admin/vat: *Nummer klopt (met de hand gecontroleerd) — btw verleggen*, met verplicht "Hoe gecontroleerd?" |
| P4-04 | een video-offerte had alleen een bedrag | verplicht *Wat je krijgt* en *Klaar op*, in mail, /o/, factuur en Studio |
| P5-06 | Lifestyle op maat was nooit te versturen | het moment telt als uitleg; een volledige aanvraag gaat door |
| P5-07 | de intake op maat mailde niemand | drie mails (aanvraag ontvangen, voorbeeld klaar, reactie aan de studio) en een regel in Studio *Nu te doen* |
| P3-01 (a) | /compare en /pricing rekenden met 30 producten | het voorbeeld is 20 producten = €800 (uit de code) |
| P4-01 | lege vakken "Nog niet opgenomen" | weg; bovenaan /video en op /hooks de bannerclip (met poster, start pas als je klikt) |
| P6-01 (a) | 90 dagen tegenover 2 jaar | één bewaartabel (`src/data/bewaartermijnen.js`, getallen uit de code) in voorwaarden §7, privacy §6, verwerkersovereenkomst §12 en de FAQ; datum 17 november 2026 |
| P6-05 | Phone-made beloofde echte telefoonscènes | "die eruitzien alsof ze met de telefoon gemaakt zijn"; banner stap 05 "in een gebouwde scène" (even breed) |
| P9-01 (a) | de voorwaarden beloofden bijkopen dat Studio niet toont | de voorwaarden volgen de vlag: "in overleg, via Bespreek met ons" |
| T1-01 | op een trage verbinding 11,5 s alleen de grijze V | het laadscherm wacht alleen op de letters en het eerste beeld, met een noodrem op 2,5 s |
| W1-10 | Turnstile, webhook, analytics live uit | jouw stap 1 hierboven |

## Toetsen

17 nieuwe toetsen (`tests/levering-117-*.test.mjs`), alle zonder build; de toetsen voor B1-06, B1-12, P3-09, P5-08,
P3-10 en P12-01 falen op de oude code. Bijgewerkt omdat ze het oude gedrag vastpinden: klant-scheiding (P12-01),
proefmerk (P5-08), opruimlijst (de btw-knop start ook de betaalklok), bedragen §22 (voorrang tot 9), video-examples,
juridische-datums, lijst87-g-teksten.

- **De hele reeks** is gedraaid na een nieuwe build: 291 snelle toetsen en 81 browsertoetsen, alle groen.
  `opening90` zakte één keer in de volle reeks (de vergelijking van de foto met beeld 0 van de video, onder zware last);
  los twee keer gedraaid: 52/52.
- **Bijgesteld na de eerste reeks:** de nieuwe toetsen staan nu in de keten; de clip op /video en /hooks heeft alleen een
  haarlijn (geen zachte schaduw); /video hoeft geen laptopstand meer; P12-01 iets ruimer: ingelogd vult een bestelling
  lege accountvelden wél als het merk op de bestelling hetzelfde is als dat van je account (anders belandde je eigen
  tweede bestelling onnodig op de btw-lijst), en voor een ander merk nooit.
