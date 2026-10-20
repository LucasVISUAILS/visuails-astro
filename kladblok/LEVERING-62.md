# Levering 62 — schema A en bewogen achtergronden (19 oktober 2026)

Uit afvinklijst 41 (schema A, v41-knop a, v41-korrel a, de opening A) en afvinklijst 42 (alle kaarten
"doen", glas 2 "later"; vragen v42-glas a, v42-mix c, v42-bron a, v42-kaarten a, v42-korrel a, v42-tel a).
Uitrollen met **UITROLLEN.bat**, zonder migratie.

Het taalbestand (de redactiekopie) zit hier niet in. Daar begin ik pas na je akkoord.

## 1. Schema A, overal

- **De kleuren.** Wit, nevel `#F2F2F2`, lijn `#DDDDDD`, zwart `#000000`, grijs 2 `#3D3D3D`, grijs 3
  `#616161` (6,2:1), lichte kop `#6E6E6E` (5,1:1), violet `#4400FF`, violet diep `#3600CC` (hover) en lila
  `#8F66FF` (alleen als echo). Grijs zonder kleur: elke grijstint heeft drie gelijke kanalen.
- **Violet staat op vier plekken:** de voet, het €1-blok, de knop Bestellen bovenin en wat je kiest (een
  aangevinkt vakje, de gekozen kaart, stijl, look, gezicht, vorm, pakket). Verder nergens: knoppen zwart (v41-knop
  a), het kopwoord "productbeelden.", het sectienummer, stippen, icoontjes en links zwart (je antwoord "Ook zwart").
- **Waar je bent is geen keuze:** het menu-item van de pagina, een tab, een filter, de stap in het formulier en
  de taal blijven zwart of wit.
- **Overal toegepast:** de site, het bestelformulier, Studio, de privélink, /admin (licht en donker), de mails,
  de factuur, de fotogids (beide pdf's opnieuw gemaakt), de deelplaatjes, de schetsen in het zijpaneel, de
  favicons en de mailbeelden.
- **De opening (A):** "Stuur je productfoto's. Krijg catalog, lifestyle en video terug. Knoop, stiksel en kleur
  nagekeken." In het Engels: "Send your product photos. Get catalog, lifestyle and video back. Buttons,
  stitching and colour checked."
- **Het logopakket** in `images/Logo/visuails-logo-nieuw` is in schema A opnieuw gemaakt met het eigen script
  `maak-logopakket.py`, met dezelfde 87 bestandsnamen. Er is niets aan de vormen veranderd, alleen de kleuren.
  `KLEURENSCHEMA.md` en `LEES-MIJ.txt` daar zijn bijgewerkt. De oude pakketten (mercury-hard en de varianten in
  brand/logo) blijven staan als archief.
- **De scripts die favicons en het logopakket maken** (`make-favicons.mjs`, `make-logo-pack.mjs`) dragen nu ook
  de kleuren van schema A, zodat een nieuwe run geen oud violet terugzet.
- **Nacontrole:** op elke pagina, in beide talen en in elke stand, gezocht naar een oude kleur: nul gevonden.
  In de code buiten commentaar ook nul, op twee ongebruikte keuzepijlen na (`keuzepijl-0f0c24.svg`,
  `keuzepijl-f2f1f8.svg`; mag je weggooien).

## 2. Bewogen achtergronden in plaats van vlakken (lijst 42)

- **Elk sfeervlak** (waar eerst een egale kleur stond) draagt nu een bewogen foto uit je eigen shoots. 34
  beelden in `public/img/achter`, samen 0,77 MB: 32 van 10 tot 20 KB, en de twee van het €1-blok
  (134 en 173 KB, door de fijne ruis in het figuur). Gemaakt met
  `scripts/maak-achtergronden.py`. Draai dat script opnieuw als je een foto wilt wisselen.
- **Sluiter** waar een groot getal of lege ruimte is (je ziet een mens), **stroom** achter kaarten met tekst
  (het figuur lost op). Op licht: grijs, met violet alleen als gloed langs het figuur. Kleuren buiten het
  violet gaan naar grijs.
- **Per soort pagina een eigen foto:** prijzen en abonnementen, contact, edities, Studio, home, 404,
  juridisch, over, merkmodel, uploadrichtlijnen, elke look (catalog, lifestyle) en elke videostijl. Het
  €1-blok en de voet hebben één vast beeld.
- **Het €1-blok: violet glas** (glas 1) op een licht bewogen beeld van lifestyle-glow-05, met een lila
  spookrand. Het paneel is 84 % violet met 22 px vervaging, één zachte hoek, en rechtsonder de snede van 53°
  (36 bij 48 px). Ook op het open blok van /test-sample. **De vier foto's staan recht** (je notitie).
- **De voet:** violette stroom, zonder glas.
- **Fijne korrel** over elk beeld, als laag in de css (16 %), niet in het beeld zelf. Zo blijft hij fijn op
  elk scherm.
- **Op de telefoon en een kleine tablet** (tot 820 px) staat het beeld in een klein vlak rechtsboven in de
  hoek, en in een lang vlak als strook van 180 px bovenaan, met de inhoud eronder.
- **Blijft vlak:** de kaarten om te lezen (FAQ, stappen, prijskaarten, tabellen), de formulieren, de putten
  achter foto's en video, de laptopschermen van de klantshop, Studio, de privélink, /admin en de mails.
- **Glas staat alleen op het €1-blok.** De toets die op elke pagina naar glas zoekt, staat het nu alleen daar
  toe. De uitzondering staat ook in `docs/KLEURENSCHEMA.md` en `docs/DESIGN.md`.

**Gemeten:** elke regel tekst in elk sfeervlak, het €1-blok en de voet, tegen de pixels die er echt achter
staan, op alle 85 pagina's en op 8 breedtes (390, 600, 700, 820, 900, 1024, 1180, 1440): 1648 metingen,
alles 4,5:1 of meer, de laagste 4,56:1. De meting staat in `kladblok/levering-62/meting-achter.json`.
Onderweg ving die meting een paar plekken waar het figuur achter de tekst kwam. Die zijn verschoven, niet
weggepoetst met een waas.

**De hoekregel blijft kloppen.** Met de strook schuift de inhoud van een lang vlak op de telefoon
omlaag. Wat eerst linksboven in de hoek stond, staat nu langs de rand en heeft dus lichte hoeken:
het kaartje "Jij stuurt" op home, het scherm op /studio en het label op /about. Het glaspaneel
staat op de telefoon 14 px in de hoek van het €1-blok en loopt dus mee: 30 − 14 = 16 px. De
vier foto's blijven 22 px van de rand en houden hun eigen hoek. Gemeten met de hoekmeting
(`kladblok/hoek/hoekmeting.mjs`) op 89 pagina's en 9 breedtes, naast een bouw van vóór deze
levering: geen enkele nieuwe afwijking (en 136 minder). Opnieuw gedraaid op de bouw die je krijgt.

## 3. Klant tegen klant (je vraag over RLS)

- **RLS bestaat op je site niet, en dat is goed zo.** De site draait op Cloudflare D1, en de
  browser praat nooit met de database. Het vangnet is nu een toets:
  `tests/klant-scheiding.test.mjs` (`npm run test:scheiding`, in de vaste reeks).
- Klant B probeert met zijn eigen sessie bij de gegevens van klant A, op elke route die één
  klant leest of wijzigt: facturen, creditnota's, beelden, uploads, het zip-archief, Studio,
  goedkeuren, revisieronde, feedback, betalen, foto's, formaat, de privélink. Ook A zelf
  roept elke route aan, als controle. **144 controles, 0 fout.** Met sabotage nagekeken: haal
  je een eigendomscontrole weg, dan wordt de toets rood.
- Op /account en de privélink zat geen gat. Wel op twee open routes, waar iemand zonder in te
  loggen het e-mailadres van een bestaande klant kon intypen. **Die zijn nu dicht** (je
  antwoord "dicht de gaten"):
  - **Bestellen zonder inlog** (`/api/order`, ook het contactformulier). Een nieuwe klant
    wordt aangemaakt zoals altijd. Een bestaande klant blijft precies zoals hij is, ook zijn
    lege velden. Zijn opgeslagen adres, zijn eigen look en zijn eigen gezicht gelden alleen
    met zijn sessie (Studio bestelt via /account/order, dus daar werkt alles zoals het
    was). Zonder sessie valt de look of het gezicht stil weg, met een regel in het logboek.
    De bestelling zelf komt gewoon binnen, met de naam, het adres en het btw-nummer van het
    formulier.
  - **Een abonnement afsluiten zonder inlog** (`/api/plan`). Hoort het adres al bij een
    klant, dan gaat het formulier terug met: "Dit e-mailadres hoort al bij een account. Log
    in (rechtsboven, of via de link bij je gegevens); daarna sluit je hier je abonnement
    af." Altijd hetzelfde antwoord, wat er ook loopt, en er verandert niets en er gaat
    niets naar Mollie. Een nieuw adres gaat zoals altijd door naar de betaling.
- **Nagekeken:** blok 5 van de toets doet beide als buitenstaander en als de klant zelf. Op
  de code van vóór vandaag faalt hij op 10 punten, nu op 0. Twee oude toetsen gingen uit van
  het oude gedrag en zijn aangepast: `afvink-8-okt` ("ook een leeg veld blijft leeg") en
  `eigen-stijl` (de eigen look bestelt met de sessie, zoals Studio).
- **Bewust open:** `/api/order-status` en `/api/order-pay` (alleen ja/nee-standen, en betalen
  voor een ander kost niemand iets) en de terugkeer van Mollie op `/account/plan/return`
  (het kenmerk staat alleen in de mail van de klant). Uitleg in
  `kladblok/levering-62/klant-scheiding.md`.

## Testreeks

**Testreeks 267/267 groen** (23 min 44 s), na het dichten van de gaten. Nieuw: `test:scheiding` (klant
tegen klant). Aangepast: `minder-sjabloon-browser` (glas mag alleen op het €1-blok), `afvink-8-okt` en
`eigen-stijl` (de gaten), `doorloop-27` en `studio-merk` (schema A).

## Na het uitrollen

- Kijk op je telefoon naar een lookpagina en /pricing: daar zie je de strook en het beeld in de hoek.
- Probeer op /plans een abonnement af te sluiten met je eigen e-mailadres zonder in te loggen: je krijgt de
  melding om in te loggen.
- `keuzepijl-0f0c24.svg` en `keuzepijl-f2f1f8.svg` in `public/img/ui` worden niet meer gebruikt.

## Bestanden

- **CSS:**
  - `src/styles/` hal, global, stijl22, studio-hal, studio en werkplaats;
  - `public/` account, portal, admin en admin-voorvertoning.
- **Componenten:** BrandModelBrief, FigDash, FigGate, FormatenHal, LookDetailHal, Studiobrief, Uitleg,
  UitlegBalk, UitlegVoorbeeld, VideoHal, VideoStyleHal, VoorpaginaHal en Woordmerk; in `order/` AnglePicker,
  BackgroundPicker, BestelOverzicht, MarketplacePicker, ModelPicker, OrderFlow, PlanPicker, ProductUploader,
  RatioPicker en StylePicker; `src/layouts/Layout.astro`.
- **Code:** `functions/api/order.js` en `plan.js`; `src/lib/` invoicePdf, mailTemplate en poppetje;
  `src/data/status.js`; `src/scripts/pipeline.js`.
- **Beelden:** `public/img/achter/` (34 nieuw), de favicons, `og-nl.png` en `og-en.png`, de mailbeelden,
  16 schetsen in `public/img/schets`, `keuzepijl-f2f2f2.svg` (nieuw) en beide fotogidsen.
- **Scripts:** `maak-achtergronden.py` (nieuw), make-favicons, make-logo-pack, make-mail-assets, make-og,
  schetsen-zijpaneel en `lib/fotogids-html.mjs`.
- **Documenten:** `docs/KLEURENSCHEMA.md` en `docs/DESIGN.md`.
- **Toetsen:** `tests/klant-scheiding.test.mjs` (nieuw), de vijf aangepaste hierboven en `package.json`.
- **Kladblok:** dit bestand, `kladblok/COMMIT-BERICHT.txt` en `kladblok/levering-62/` (de scripts voor de
  kleurwissel, de contrastmeting en `klant-scheiding.md`).
