# Levering 68: Blauw uur, overal (24 oktober 2026)

Afvinklijst 55, ingevuld: blauw **a** (Blauw uur `#25508B`), logo **a** (het hele logo kleurt,
in het tempo van een schommel; het logo zelf beweegt niet), tempo **b** (3,6 s), warm **a**
(geen warme kleur), blok **b** (één inktblok per pagina, afgesneden op 53°) en effecten **a**
(E1 snede-wis, E4 tl-buis, E5 vlagje vult, E6 blok op 53°). Jouw woorden: *"Ik denk dat deze
kleur de kleur word, het voelt niet als een ai tool kleur en ook niet als een copy cat van
een ander merk."*

Uitrollen met **UITROLLEN.bat**, zonder migratie. Leveringen 65 en 66 staan nog niet live (de
laatste uitrol in `kladblok/uitrol-log.txt` is c1086f6, 20 oktober 11:56); rol 65, 66 en 68 samen
uit. `kladblok/COMMIT-BERICHT.txt` beschrijft ze alle drie. Een levering 67 is er niet.

## 1. Het schema

| Kleur | Waarde | Rol | Gemeten |
|---|---|---|---|
| Wit | `#FFFFFF` | de grond, overal | — |
| Inkt | `#0B0F17` | alle tekst, het logo, de knoppen, het ene blok | 19,18:1 op wit |
| Blauw uur | `#25508B` | één plek per scherm (Bestellen), het logo onder de muis, links, focus, selectie | 8,08:1 op wit, wit erop 8,08:1 |
| Grijs | `#636974` | alleen kleine tekst | 5,52:1 op wit, 4,50:1 op lijn |
| Lijn | `#E6E8EC` | alleen scheiding, nooit tekst | 1,23:1 op wit |

Afgeleid, elk met één rol: vlak `#F4F5F7`, lijn sterk `#C5C8CF`, veldlijn `#858A94` (3,47:1,
een veldgrens vraagt 3:1), blauw diep `#1A4279` (een blauwe knop onder de muis) en blauw licht
`#80A7DD` (alleen op inkt, 7,75:1). 60 · 30 · 10 in elke sectie; geen verloop als vlak, geen
glas, geen bewogen achtergrond. **Blauw en inkt nooit als gelijken naast elkaar**: samen halen
ze maar 2,37:1. Alles staat in `docs/KLEURENSCHEMA.md` (bovenaan; schema A is nu geschiedenis)
en kort in `docs/DESIGN.md`.

## 2. Wat er op de site verandert

- **De tokens.** `hal.css` draagt de vijf kleuren als `--h-wit`, `--h-inkt`, `--h-blauw`,
  `--h-grijs`, `--h-lijn` en de afgeleide. De oude namen (`--h-violet`, `--h-lila`,
  `--h-nevel`, `--h-nacht` …) blijven bestaan en wijzen naar de nieuwe kleur, zodat een
  vergeten verwijzing niet breekt. `global.css` kreeg dezelfde set als `--merk-*`.
- **De letterlijke kleuren.** Elk grijs zonder kleur werd het koele grijs met **dezelfde
  helderheid** (toon 263°, de toon van de inkt), dus elk contrast is gelijk gebleven. Violet
  werd blauw uur, lila blauw licht, amber (aandacht) vlak met blauwe letters. Commentaar en
  de laptopschermen (de winkel van een klant) bleven staan. Het script en zijn tabel:
  `kladblok/levering-68/kleurmap.py` (met `kleur.py`), toe te passen op elk bestand.
- **Kaarten** zijn wit met een haarlijn (`--h-kaart-rand`), niet meer grijs. Links zijn blauw
  met een streep op 38 %. Selectie blauw met wit.
- **Het ene inktblok** (`.h-lk-slot`): inkt, rechtsonder afgesneden op 53° (64 × 48, op de
  telefoon 40 × 30), met witte tekst en een witte knop. Het €1-blok: wit, het paneel met de
  tekst in inkt met dezelfde snede (36 × 48). Geen glas meer.
- **De voet** is wit met een haarlijn: het woordmerk groot in inkt, links inkt, onder de muis
  blauw.
- **Het logo** beweegt niet meer. Onder de muis (of met de toets op een link eromheen) kleurt
  het hele logo als één vlak van inkt naar blauw uur en terug, als een schommel: 3,6 s, de
  kleur volgt (1 − cos)/2, dus traag aan de uiteinden en snel in het midden; de muis eraf laat
  hem in 0,7 s uitlopen. Gebouwd met `@property --vs-fase` en `--vs-amp` in `global.css`,
  `account.css`, `admin.css` en `portal.css`; `VMerk.astro`, `Woordmerk.astro` en
  `wordmarkPath.js` tekenen daarvoor een tweede laag (`.mk-kleur`) in plaats van de oude lijn.
  Minder beweging: het logo wordt meteen blauw. Hoog contrast: geen kleurlaag.
- **E4, de tl-buis.** De streep van een sectielabel springt aan zoals een tl-buis: twee keer
  haperen, dan aan (460 ms, in stappen). Eén keer, als de kop in beeld komt; nooit in de
  opening en nooit bij het laden. E1 (de wis op 53°), E5 (het vlagje van de V bij laden) en
  E6 (het blok) stonden er al of zijn hierboven beschreven; alleen hun kleur veranderde.
- **Mails, factuur, status, Studio, account en beheer** volgen hetzelfde schema
  (`mailTemplate.js`, `invoicePdf.js`, `status.js`, `poppetje.js`, `studio-hal.css`,
  `studio.css`, `werkplaats.css`, de drie losse css-bestanden in `public/`).
- **Opnieuw gemaakt:** favicons en het app-icoon (wit V op blauw uur), de mailplaatjes, de
  schetsen in het bestelformulier, de keuzepijlen (`keuzepijl-0b0f17.svg`, `-f4f5f7.svg`), de
  deelplaatjes (`og-nl.png`, `og-en.png`), de fotogids (NL en EN), en de laptopfoto met alle
  18 standen (108 bestanden in `public/img/hal/stand/`, de webshop op het scherm in de nieuwe
  kleuren; `halStanden.bron.json` heeft de nieuwe vingerafdruk). De scripts kregen de nieuwe
  kleuren, zodat een volgende keer hetzelfde uitkomt.

## 3. Logo's en posters (buiten de sitemap)

- **`images\Logo\visuails-logo-blauw-uur\`**: het hele pakket opnieuw (svg, png transparant en
  op een tegel, jpg, favicons, een contactblad, `LEES-MIJ.txt` en `KLEURENSCHEMA.md`). De vorm
  is niet aangepast, alleen de kleur: inkt, blauw uur en wit. Het oude pakket
  (`visuails-logo-nieuw`, violet) staat er nog; dat kun je weggooien.
- **`images\Posters\blauw-uur\`**: de twaalf posters, vier stories, twee posts, de banner, de
  e-mailkop, de LinkedIn-kop en het visitekaartje (voor en achter), op 3 ×, met twee
  contactbladen en een `LEES-MIJ.txt`. Vlakken zijn vlak (geen verloop of korrel), 06 is de
  app-tegel in plaats van glas, 01–03 zijn gemaakt van de witte catalogstand van nu, en het
  model op 04 staat lager zodat geen merk of balk over zijn gezicht valt. Alle lijnen en
  kruisjes opnieuw nagerekend tegen de echte vormen: 0 meldingen.
- Het script van de posters staat in `kladblok/levering-68/posters/` (met zijn beelden en de
  twee letters), zodat je ze zonder internet opnieuw kunt maken.

## 4. Wat open staat

- **De opening over de volle breedte** (Schets 58) heb ik niet gebouwd: dat wacht op jouw
  akkoord. De grond achter de laptop is nu puur wit; de zachte rand blijft.
- **Het merkboek** (de deck uit de vorige chats) is nog violet. De posters, het logopakket en
  het kleurenschema zijn wel bij; zeg het als het merkboek ook om moet.
- **Ongebruikte bestanden** mogen weg zodra jij wilt: vijf oude keuzepijlen in
  `public/img/ui/` (`-f2f2f2`, `-f2f3f5`, `-f2f1f8`, `-0f0c24`, `-000000`); niets verwijst er
  nog naar. Ik heb niets verwijderd. (De sfeerbeelden in `public/img/hal/` blijven: het menu
  en het telefoonscherm gebruiken ze nog.)

## Nagekeken

- **Op het oog**, voor en na: home, een lookpagina, Studio, het bestelformulier, beheer licht
  en donker, de mails en de telefoon.
- **Contrast**: elke kleur hierboven nagerekend (WCAG); de grijzen houden hun oude helderheid.
- **Testreeks:** 268 van 268 groen, op een verse build. De werkomgeving brak de reeks na 238
  af (een tijdslimiet, geen fout); de laatste 30 heb ik daarna apart gedraaid, ook groen.
  Daarvoor al los: `hoekregel-browser` 61/61 en `minder-sjabloon-browser` 891/891.
- **De posters**: 23 beelden, 0 meldingen uit de controle (een lijn hangt altijd aan iets
  echts; een kruisje staat altijd op een echte hoek).

## Bestanden

- **Stijl:** `src/styles/hal.css`, `global.css`, `studio-hal.css`, `studio.css`,
  `werkplaats.css`, `stijl22.css`; `public/account.css`, `admin.css`, `portal.css`,
  `admin-voorvertoning.css`.
- **Onderdelen:** `VMerk.astro`, `Woordmerk.astro`, `VoorpaginaHal.astro`, `Studiobrief.astro`,
  `Uitleg.astro`, `UitlegBalk.astro`, `Note.astro`, `Aanbevelingen.astro`, `FigBoard.astro`,
  `FigGallery.astro`, `FigGate.astro`, `FigOverzicht.astro`, `studio/Plaatshouder.astro` en
  acht in `order/`; `src/layouts/Layout.astro` (de themakleur).
- **Code:** `src/lib/mailTemplate.js`, `invoicePdf.js`, `poppetje.js`; `src/data/status.js`,
  `wordmarkPath.js`, `halStanden.bron.json`.
- **Scripts:** `make-favicons.mjs`, `make-logo-pack.mjs`, `make-mail-assets.mjs`, `make-og.mjs`,
  `schetsen-zijpaneel.py`, `scripts/lib/fotogids-html.mjs`.
- **Beelden:** favicons en `apple-touch-icon.png`, `public/img/mail/` (6), `public/img/schets/`
  (16), `public/img/ui/` (2 nieuw), `public/img/hal/` (laptop, masker, pov) en
  `public/img/hal/stand/` (108), `og-nl.png`, `og-en.png`, de twee fotogidsen.
- **Toetsen:** `tests/studio-merk.test.mjs` (de schommel in plaats van de lijn) en
  `tests/doorloop-27.test.mjs` (inkt `#0B0F17`).
- **Documenten:** `docs/KLEURENSCHEMA.md`, `docs/DESIGN.md`.
- **Kladblok:** dit bestand, `COMMIT-BERICHT.txt`, `levering-68/` (kleurmap, posters).

Elk beeld dat ik in je map zet (ook de svg's), krijgt onderweg herkomstgegevens (C2PA) mee,
zoals bij 66; wat je ziet blijft gelijk. Een keuzepijl van 214 bytes wordt daardoor ongeveer
8 kB.
