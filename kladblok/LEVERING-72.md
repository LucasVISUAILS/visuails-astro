# Levering 72: snel en goed te lezen voor je advertenties (5 november 2026)

Cloudsessie, branch `claude/voor-de-launch`, na levering 71. Je antwoord ("alles advies"): 14 = ja, ik mag veranderen
hoe pagina's laden zolang je er niets van ziet, bewaakt met `npm run visueel`; de opening blijft precies zoals hij is.

**Een bezoeker ziet niets anders.** De vangrail (`npm run visueel`) is groen op de pagina's die stilstaan, en op de
voorpagina geeft hij dezelfde ruis als tegen zichzelf (zie §4). Geen migratie.

## 1 · Wat ik vond

Gemeten op de landingspagina's (voorpagina, /catalog, /lifestyle, /video, /hooks, de lookpagina's, /pricing, /plans,
/start en /test-sample, NL en EN), op 390 px (een telefoon op 4G, 150 ms en 1,6 Mbit/s, en een 4 × trager toestel)
en op 1440 px. Met Playwright en met Lighthouse (telefoon). Lokaal met brotli, zoals Cloudflare de site uitlevert.
De opening is niet opnieuw gemeten; dat staat in `kladblok/levering-84/meting.json` en RUST-80 §12 – §15.

- **De site is al vlot.** Lighthouse op de telefoon: prestaties 80 – 92, toegankelijkheid 100. Het grootste beeld
  staat binnen 1,6 – 2,7 s (Playwright, 4G) op alles behalve de voorpagina (de opening) en /catalog op de
  telefoon. Na brotli is het CSS ± 76 kB en het script ± 37 kB per pagina; de rest is beeld.
- **Eén verspringing op elke pagina, 0,017**, bij een eerste bezoek: de WhatsApp-knop schuift boven de cookiekaart
  (`bottom`). Ruim binnen "goed" (onder 0,1). Niet veranderd, zie §5.
- **De voorpagina verspringt soms 0,118** op de telefoon (2 van de 3 Lighthouse-rondes, vóór en na deze levering
  hetzelfde): in de opening schuiven de laptopschermen (`.o8-sc`) 52 px op als de stilstaande foto (`.o8-st`)
  verschijnt. De opening raak ik niet aan; zie §5.
- **Beelden groter dan ze staan:** op /catalog vroegen de vergelijker en de lookkaart `sizes="100vw"`, dus een
  laptop laadde `catalog-after` op 1800 px voor een vak van 558 en 300 px.
- **De letters** (DM Sans, VISUAILS Display, IBM Plex Mono 500 en 600, ± 110 kB) hadden geen cache: wie terugkomt,
  vraagt ze bij elke pagina opnieuw na.
- **axe** (85 openbare pagina's, 1440 en 390): 4 soorten, 210 plekken (zie §3).
- **`npm run kruip`:** 20 "lege links" op /faq; **`npm run audit`:** 200 bevindingen in `audit:bouw`;
  **`npm run check:csp`:** 3 van 3 zoals verwacht. Bij kruip en audit bleken het blinde vlekken van de scripts (§3).

## 2 · Per pagina: voor · na · wat ik deed

Playwright, één koude lading, brotli. Het grootste beeld (LCP) en de verspringing (CLS) op 390; het gewicht (kB,
over de lijn) op 390 en 1440. NL is binnen een paar kB hetzelfde (`kladblok/levering-72/meting-voor.json` en
`meting-na.json`). **Let op:** LCP schommelt van ronde tot ronde ± 0,7 s op hetzelfde bestand; /catalog op 390
(4,4 → 2,4) en /pricing (1,6 → 2,3) zijn die schommeling, geen verandering.

| Pagina | LCP 390 | CLS 390 | kB 390 | kB 1440 | Wat ik deed |
|---|---|---|---|---|---|
| / | 2,0 → 2,0 s | 0,017 → 0,017 | 1383 → 1383 | 4291 → 4291 | de looks: een groep in plaats van een lijst (axe); de veeg-kopieën een afmeting (audit) |
| /catalog/ | 4,4 → 2,4 s | 0,017 → 0,017 | 824 → 824 | **1323 → 1264** | de vergelijker en de lookkaart vragen hun echte breedte: een laptop laadt 1200 px in plaats van 1800 (−59 kB) |
| /lifestyle/ | 2,5 → 2,7 s | 0,017 → 0,017 | 646 → 646 | 887 → 887 | de beeldenrij met de toets te bereiken (axe) |
| /video/ | 2,5 → 2,5 s | 0,017 → 0,017 | 317 → 317 | 418 → 418 | — |
| /hooks/ | 1,9 → 1,9 s | 0,017 → 0,017 | 242 → 242 | 343 → 343 | — |
| /lifestyle/flash/ | 2,2 → 2,2 s | 0,017 → 0,017 | 673 → 673 | 974 → 974 | de schuifrij van het paar met de toets te bereiken (axe) |
| /lifestyle/phone-made/ | 2,2 → 2,2 s | 0,017 → 0,017 | 669 → 669 | 920 → 920 | idem |
| /catalog/classic/ | 2,3 → 2,2 s | 0,017 → 0,017 | 593 → 593 | 891 → 891 | — |
| /video/motion/ | 1,9 → 1,9 s | 0,017 → 0,017 | 241 → 241 | 584 → 584 | — |
| /pricing/ | 1,6 → 2,3 s | 0,017 → 0,000 | 232 → 232 | 360 → 360 | de som rechts een rol, geen tweede bijlage-oriëntatiepunt (axe) |
| /plans/ | 1,9 → 1,9 s | 0,017 → 0,000 | 228 → 228 | 328 → 328 | — |
| /start/ | 2,2 → 2,2 s | 0,000 → 0,000 | 567 → 567 | 954 → 954 | — |
| /test-sample/ | 1,8 → 1,8 s | 0,017 → 0,017 | 624 → 624 | 763 → 763 | de hulpknop een naam; het inlogblok een rol (axe) |
| **elke pagina** | | | | | **de letters 7 dagen in de cache**: een tweede bezoek vraagt ze niet opnieuw na (4 verzoeken per pagina minder; meet je niet bij een koude lading) |

Lighthouse (telefoon), voor → na: / 80 → 80, /catalog 87 → 87, /pricing 92 → 92, /test-sample 83 → 86, /start
(NL) 90 → 86 (schommeling); toegankelijkheid overal 100 → 100. Alles in `kladblok/levering-72/lighthouse.json`.

## 3 · Wat ik veranderde

- **`public/_headers`:** `/fonts/*` krijgt `Cache-Control: public, max-age=604800`, zeven dagen, met dezelfde afweging
  als de foto's (een ANDERE letter krijgt een andere naam).
- **`/catalog`:** `Compare.astro` kreeg een keuze `sizes`; `CatalogHal.astro` geeft hem de gemeten breedte
  (`(min-width: 600px) 558px, calc(100vw - 42px)`), en de lookkaart `(min-width: 700px) 300px, calc(100vw - 40px)`.
  Gemeten op 360 tot 1920 px: elke breedte krijgt nog steeds minstens zoveel pixels als hij toont. Wie Compare
  zonder `sizes` gebruikt (/how-it-works, de lookpagina's), houdt wat hij had.
- **axe, alles opgelost** (na: 0 meldingen op 85 pagina's):
  - `aria-allowed-role` (168×): de tegels met looks op de voorpagina waren `<a role="listitem">`. Nu een gewone link
    in een groep met dezelfde naam (`HalGalerij80.astro`).
  - `landmark-complementary-is-top-level` (24×): zes `<aside>`'s binnen `<main>`. Ze blijven een `<aside>`, want
    `section` en `div` krijgen in global.css eigen ruimte en dat zou je zien; ze kregen een rol: `region` waar ze een
    naam hebben (de som op /pricing, de kosten op /custom-models), `none` waar niet (het overzicht in /start/plan,
    het inlogblok, de zijkolom van de bedankpagina).
  - `scrollable-region-focusable` (14×): vier schuifrijen met alleen beelden (/about, /lifestyle, /custom-models, het
    paar op een lookpagina) waren niet met de toets te bereiken. Nu `tabindex="0"` met de naam van hun kop. De rand
    verschijnt alleen bij de toets (`:focus-visible`), niet bij een klik of veeg.
  - `summary-name` (4×): de hulpknop in het formulier had op een telefoon geen naam (`WkBalk.astro`).
- **`npm run audit`**: de veeg-kopieën in de looks (168×) kregen `width` en `height`; CSS zet ze toch op 100 %, dus
  er verandert niets aan wat je ziet. De andere 32 waren blinde vlekken van het script (§ hieronder).
- **De meetscripts zelf**, zodat ze geen dingen melden die er niet zijn:
  - `scripts/kruip.mjs`: een link in een voorouder met `aria-hidden` of `inert` telt niet. De 20 "lege links" op /faq
    waren de onzichtbare kopie van de schakelaar van levering 83.
  - `scripts/meten/audit-bouw.mjs`: een knop of link in een verborgen sjabloon telt niet (28×; axe vond op de echte
    pagina niets), en een kop met `aria-label` is niet leeg (de kop van de opening, 4×).

## 4 · Nagekeken

- **`npm run visueel`:** de referentie was van vóór levering 74 (1064 verschillen). Eerst opnieuw vastgelegd op de
  stand van levering 71, dan tegen zichzelf gedraaid: 8 kleurvlekken, allemaal op `/`, `/nl/` en
  `/voorbeeld/voorpagina` (de opening en de looks bewegen). Na deze levering: **7 kleurvlekken op dezelfde drie
  pagina's, geen enkele vormafwijking, niets op een andere pagina.** `visual/referentie.json` gaat mee, zodat de
  vangrail weer bruikbaar is.
- **De opening**: niets aan veranderd; `opening-88-browser`, `laptop-84`, `voorpagina-80` en `aantal-lat-browser`
  groen in de reeks.
- **De herkomst (C2PA)**: geen beeld aangeraakt; de blokken staan erin zoals ze stonden.
- **De testreeks** (`TESTREEKS_TEGELIJK=4 node scripts/testreeks.mjs`): **284 van 284 groen** (8 min 50 s), geen
  enkele herkansing.
- **Nieuw:** `tests/laden-72.test.mjs` (28): de lettercache, de `sizes` op /catalog (EN en NL), en elke axe-reparatie
  in de build.

## 5 · Open punten (voorstellen, niet gebouwd)

- **De opening verspringt soms (0,118 op de telefoon).** *Voorstel:* de plek van `.o8-st` vasthouden voordat de foto
  er is, zodat de schermen niet schuiven. Dat raakt de opening, dus niet gedaan; samen met jou als je het wilt.
- **De WhatsApp-knop (0,017 op elke pagina).** Hij schuift boven de cookiekaart met `bottom`. Met `translate` telt het
  niet als verspringen, maar dan bewegen de randgevallen (de proefkaart, de uitlegbalk, de melding) anders.
  *Advies:* laten; 0,017 is ruim "goed".
- **/catalog op de telefoon** laadt `catalog-before-1x1` (176 kB) en `catalog-after-w1200` (117 kB) voor een vak van
  348 px, en `ba2-na-detail-grijs` (68 kB) voor 71 – 149 px. Een versie van 760 px (en 380 voor de detailfoto) zou
  op een telefoon ± 250 kB schelen. Dat zijn nieuwe bestanden; bij `catalog-before` bleek een kleinere eerder niet
  lichter (`telefoonbeelden.js`). *Advies:* meenemen als je die foto's toch opnieuw maakt (BEELDEN.bat maakt dan de
  maten).
- **De opening op de voorpagina** laadt de schermbeelden (`hal/opening/scherm/*`) groter dan ze staan (Lighthouse:
  ± 160 kB). Raakt de opening: niet gedaan.
- **Lighthouse "uses-long-cache-ttl"** zegt lokaal "57 bestanden", omdat mijn testserver geen headers meegeeft. Op
  Cloudflare hebben `/_astro/*` een jaar, `/img/*` zeven dagen en nu ook `/fonts/*`. Kijk na de uitrol in de browser
  (Netwerk, een letter) of `max-age=604800` erop staat.

## 6 · Mag weg

Niets.

## 7 · Voor het overzicht

- **§16.1:** levering 72 gebouwd: de lettercache, de maten op /catalog en axe schoon; na de uitrol één keer kijken
  of de letters `max-age=604800` hebben.
- **§16.2:** de twee voorstellen voor de opening (de verspringing en de schermbeelden) als vraag voor later.
- **§17:** `npm run visueel` heeft weer een bruikbare referentie (5 november, stand van levering 71).

## 8 · Bestanden

- **Bron:** `public/_headers`, `src/components/Compare.astro`, `src/components/CatalogHal.astro`,
  `src/components/HalGalerij80.astro`, `src/components/BrandModelHal.astro`, `src/components/PricingHal.astro`,
  `src/components/order/PlanPicker.astro`, `src/components/order/OrderFlow.astro`, `src/components/ThankYouPage.astro`,
  `src/components/OverHal.astro`, `src/components/LifestyleHal.astro`, `src/components/LookDetailHal.astro`,
  `src/components/order/WkBalk.astro`.
- **Meetscripts:** `scripts/kruip.mjs`, `scripts/meten/audit-bouw.mjs`.
- **Toetsen:** nieuw `tests/laden-72.test.mjs`; `package.json` (`test:laden72` in de keten).
- **De vangrail:** `visual/referentie.json` (opnieuw vastgelegd).
- **Kladblok:** `kladblok/LEVERING-72.md` (dit bestand), `kladblok/TEKSTEN-72.md`, `kladblok/levering-72/`
  (`meting-voor.json`, `meting-na.json`, `axe.json`, `lighthouse.json`), `kladblok/COMMIT-BERICHT.txt`.
