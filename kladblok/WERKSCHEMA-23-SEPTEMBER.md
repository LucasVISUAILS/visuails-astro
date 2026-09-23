# Werkschema — ronde 23 september 2026

Voor mezelf: dit bestand is de bron van waarheid voor deze ronde. Na elke stap
vink ik hier af en schrijf ik op wat er veranderd is (bestanden + test). Loopt
het gesprek vol, dan begin ik opnieuw bij de eerste open regel hieronder.

**Keuzes van Lucas (23 sep):** e-mailveld = *Studiobrief, hooguit één per
maand*. Pagina-opbouw = *eerst blauwdruk, dan bouwen*.

**Vaste regels:** eerst de stand in zijn map lezen (stage + cmp) vóór elke
levering · nooit committen of pushen · prijzen alleen via pricing.js · geen
echt adres in demo's · geen logo's ontwerpen · 11,5 px leesvloer ·
KLEURENSCHEMA (violet alleen voor actie, geen verloop, geen gloed) · "een
specialist", nooit "een mens" · na elke CSS-wijziging eerst bouwen en dán pas
testen (de testreeks weigert een build die ouder is dan de css).

---

## Fase 0 · Stand van zaken

- [x] 0.1 Zijn map en mijn kopie vergeleken (24 kernbestanden: gelijk).

## Fase 1 · De concrete punten

- [x] **1.1 Hooks en Editions uit het hoofdmenu**
  - `src/i18n/ui.js` drops (EN + NL): de twee items eruit. Voettekst houdt ze
    met label; de pagina's blijven; "Ook: Hooks · Editions" op de voorpagina blijft.
  - Tests: nav.test.mjs (en wat er verder op de drops leunt).
- [x] **1.2 Taal: `/` volgt de bezoeker, en de site onthoudt de keuze**
  - ~~Worker-ingang met run_worker_first~~ → GEWIJZIGD: inline script in
    Layout.astro (zie logboek: een Worker-antwoord krijgt de headers uit
    _headers niet, dus geen CSP/HSTS op `/`). Volgorde op `/`: cookie
    `vis_lang` → navigator.languages → Engels; niet bij interne herkomst.
  - Taalknop op de site zet `vis_lang` (Path=/, 1 jaar, Secure, SameSite=Lax).
    Controleren: botst niet met de Studio-cookie (Path=/account, HttpOnly).
  - Cookiebeleid EN + NL: vis_lang wordt nu ook door de taalknop op de site gezet.
  - Controleren: build schrijft `run_worker_first` en de eigen `main` in
    dist/server/wrangler.json; lokaal proberen met `wrangler dev` als dat kan.
- [x] **1.3 Licentie en leesmij in de taal van het scherm**
  - `deliveryDocs()` krijgt de taal van het scherm waar gedownload wordt
    (dashboard: vis_lang / Accept-Language; portaal: heeft al `lang`). Onbekend →
    tweetalig bestand. Ook de Editions-set (account.js ~6326) en elke andere
    plek waar licenceText() draait.
  - Test erbij: EN-scherm → LICENCE.txt Engels; NL → LICENTIE.txt; onbekend → beide.
- [x] **1.4 Galerij: "Zo ziet een levering eruit" als standaard**
  - Standaardweergave = één levering als orderflow-mock-up (jouw foto's →
    de set → goedkeuren → bestanden/formaten), met de jeans compleet.
  - Schakelaar "Alle beelden": het huidige raster met filter, zonder mock-up.
  - Werkt zonder JS (standaard zichtbaar), telefoon 320–390, EN + NL.
- [x] **1.5 De twintig conceptpagina's weg**
  - `src/pages/concept/*`, `ConceptLayout.astro`, `conceptInhoud.js`;
    concept-resten.test.mjs bijwerken; sitemap/llms/links nalopen.
- [x] **1.6 Video heeft een deur** — nalopen: tegel op voorpagina, /video, menu.
  Alleen repareren als er ergens een doodlopende knop staat.
- [x] **1.7 Je naam op de site**
  - /about: blok met foto-plaatshouder (`/img/lucas.webp`, "Foto volgt") + tekst.
  - Voorpagina: trustlijn één regel met je voornaam → /about.
  - Framing (geen modekennis): je bent niet de fotograaf, je bent degene die
    de beelden controleert en instaat voor de levering. Voorstel-tekst + uitleg
    in het verslag.
- [x] **1.8 Studiobrief (e-mailveld)**
  - Component `Studiobrief.astro`: voettekst (alle pagina's), /guides,
    /editions (+ /plans#binnenkort). Eén veld, één knop, één regel wat je krijgt.
  - Backend: `service=subscribe` met `bron` + taal; D1 `subscribers`; welkomstmail;
    Resend-contact als `RESEND_AUDIENCE_ID` gezet is (jij zet de secret).
  - Honeypot/ratelimit zoals de andere formulieren; werkt zonder JS.
  - Privacyverklaring EN + NL (§2, §3, §4, bewaartermijn) — nu staat er "nooit als nieuwsbrief".
- [ ] **1.9 Tussentijdse controle fase 1** — build, volledige testreeks, leesbaar
  + spatie op de geraakte pagina's, 320/390/1440, EN + NL.

## Fase 2 · Opbouw van alle andere pagina's (blauwdruk, niet bouwen)

- [x] 2.1 Meten: elke publieke pagina op 1440 en 390 — secties, hoogtes, woorden.
- [x] 2.2 Per pagina: wat is de kern, wat staat er dubbel, wat mist, wat moet
  eerder. Zelfde toets als bij de voorpagina.
- [x] 2.3 `kladblok/PAGINA-OPBOUW.md` + `kladblok/pagina-opbouw.html` (tekening
  per pagina: nu → voorstel).
- [ ] 2.4 STOP: Lucas keurt, daarna pas bouwen.

## Fase 3 · Nacontrole en levering

- [ ] 3.1 Elk punt hierboven opnieuw langs: staat het er echt, in beide talen?
- [ ] 3.2 Volledige testreeks groen (na een verse build, zonder tussentijdse edits).
- [ ] 3.3 Links (audit-links), leesbaar-alles, spatie-alles, horizontale scroll 320–1440.
- [ ] 3.4 Stage + cmp van elk bestand in zijn map, dan leveren.
- [ ] 3.5 Verslag: wat af is, wat open staat, wat hij zelf moet doen (secret,
  foto, bannerbeelden).

---

## Logboek

- 1.1 gedaan (bron): Layout.astro `menuDrops` = drops zonder `soon`; balk + lade
  lezen menuDrops, voettekst drops. nav.test.mjs: nieuwe paragraaf op dist/.
  → nog meten na build.
- 1.5 gedaan: pagina's, ConceptLayout, conceptInhoud weg in mijn kopie;
  tips-paneel.test bijgewerkt; `opruimen-concepten.bat` voor zijn map (commit
  kan niet verwijderen). public/img/concept blijft (voorpagina).
- 1.2 gedaan (bron), KOERSWIJZIGING: niet in de Worker maar een inline script
  in Layout — Cloudflare past _headers (CSP, HSTS) niet toe op wat een Worker
  teruggeeft. Klik op taalknop → vis_lang Path=/ 1 jaar. Alleen op `/`, niet
  bij interne herkomst of zachte navigatie. Cookiebeleid EN+NL bijgewerkt.
  Test: tests/taal-onthouden.test.mjs (+ test:taal in package.json).
- 1.3 gedaan: delivery.js deliveryDocs({taal}) + downloadTaal(); account.js
  serveOrderZip + maandset-zip lezen ?lang, knoppen dragen ?lang=${lang};
  portal.js geeft taal door. delivery.test 117/117.
- 1.7 gedaan: AboutPage "Ik ben Lucas." (plaatshouder /img/lucas.webp 4:5,
  framing: geen fotograaf/geen mode, kijkt zoals de klant kijkt, legt elk beeld
  naast de foto, aanspreekbaar). "Klein team" en "real people" weg. Voorpagina
  trustlijn 1e regel "Gemaakt door Lucas, in Enschede" → /about.
- 1.8 gedaan: functions/api/studiobrief.js + src/pages/api/studiobrief.js;
  Studiobrief.astro (voet donker / gidsen licht / editions donker); privacy
  NL+EN (§2, §3, §4, §6). Resend-contact + optioneel RESEND_SEGMENT_NL/EN.
  Geen migratie (taal in `source`). test:studiobrief 28/28. NB: de oude
  `service=subscribe`-tak in order.js is dood (telefoon verplicht) — laten staan.
- 1.6 bron nagelopen: tegel → /start/?zie=video, /start toont "op aanvraag",
  /video heeft aanvraagknop. Nog klikken na build.
- 1.4 gedaan: Levering.astro (Studio-venster: meta, 3 stappen, map uit
  deliveryEntries/deliveryDocs), GalleryPage: schakelaar Een levering / Alle
  beelden (radio + :has, #alle-beelden), raster ongewijzigd. galerij-filter
  test bijgewerkt (eerst omschakelen) 109/109.
- 1.6 gedaan: alle videodeuren leiden naar /start/video (aanvraag) of een
  stijlpagina; niets doodlopends.
- 1.9 tussentijds: volledige reeks 150 scripts gedraaid; 4 rood waarvan 2 door
  de verouderde build (mijn edit tijdens de run) en 2 echt: verplichte-velden
  (data-melding op het Studiobrief-veld) en maandset (zip-link heeft nu
  ?lang=). Beide gerepareerd, opnieuw groen. leesbaar 0, spatie: 1 vals
  alarm (DOM-volgorde in de vensterbalk, nu rechtgezet) en 8px tussen veld en
  knop op 390 (nu 10,4px).
- Fase 2: gemeten (25 pagina's), PAGINA-OPBOUW.md + pagina-opbouw.html
  (gegenereerd door _pagina-opbouw-maak.py). 159.738 → ±108.000 px. STOP.
