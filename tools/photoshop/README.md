# tools/photoshop

Scripts voor de nabewerking van VISUAILS-beelden. ExtendScript (`.jsx`),
draaien via **Bestand → Scripts → Bladeren**.

Deze map is bewust géén onderdeel van de site. Astro bouwt alleen `src/`
en `public/`, dus wat hier staat wordt nooit gedeployed. Het staat hier
omdat het dan meelift op je versiebeheer en je back-ups.

---

## In volgorde van gebruik

| # | Script | Waarvoor precies |
|---|--------|------------------|
| 01 | `01-catalog-afwerken.jsx` | (sinds 8 okt 2026, punt 4.07: één keer starten op de hele werkmap — leest achtergrond, verhouding en maat uit de INSTELLINGEN-regel in `_briefing.txt`, snijdt uit, zet achtergrond en schaduw, slaat op als `VIS-…-p1-voorkant.jpg` in het vak en zet het ruwe beeld in `_ruw/`; sneltoets: zie `LEESMIJ.txt`) |
| 02 | `02-kader-normaliseren.jsx` | (alleen het kader: product overal even groot en op dezelfde plek — voor bestanden die al uitgesneden zijn of transparant zijn aangeleverd) |
| 03 | `03-varianten-exporteren.jsx` | (één afgewerkt document wegschrijven naar alle leverformaten en -maten, in mappen per variant) |
| 04 | `04-preflight-controle.jsx` | (laatste controle vóór levering: klopt de achtergrondkleur overal, het formaat, de kleurmodus en de marge — verandert zelf niets) |

Normaal draai je **01 → 04 → 03**. De preflight vóór de export, want een
fout die je pas na het exporteren ziet moet je twee keer opruimen.

---

## Wat je per order aanpast

Bij `01` niets meer: de achtergrond, de verhouding en de maat komen uit
de INSTELLINGEN-regel van elke `_briefing.txt` in de werkmap (4.07).

- **`expectedHex`** in `04` — nog wel met de hand: dezelfde waarde als
  `achtergrond=` in de INSTELLINGEN-regel.

---

## Drie dingen die makkelijk misgaan

**De volgorde van maskeren, schalen en schaduw.**
Je kunt het kader pas gelijktrekken als het product is uitgesneden
(anders is er niets om op te meten), en je moet het doen vóórdat de
schaduw erop gaat, want een laagstijl schaalt niet mee als je de laag
daarna nog verkleint. Script `01` doet die volgorde vanzelf goed. Draai
je `02` los op iets waar al een schaduw op zit, zet die schaduw dan even
uit.

**Select Subject is niet altijd het juiste gereedschap.**
Het zoekt één opvallend object. In een close-up van stof pakt het de
knoop in plaats van het kledingstuk. Daarom routeert `01` op de
vakmap: `op-model` krijgt Select Subject, `detail` krijgt alleen een
schone achtergrond, de rest gaat via de hoeken.

**Geen webp in de export, en dat is expres.**
De C2PA-markering van de modelaanbieder overleeft PNG en JPG, maar een
webp-omzetting wist hem. Wil je webp voor het web, doe dat dan bewust en
als laatste stap.

---

## Nog niet gebouwd

Bewust nog niet, omdat ze pas renderen bij meer volume of omdat ze beter
buiten Photoshop passen.

- **Kleurcorrectie op een doelcode.** Meet de gemiddelde kleur van het
  kledingstuk, reken het verschil met de hex van de klant uit en stel een
  correctielaag voor. Bewust *voorstellend* en niet automatisch: kleur
  forceren gaat een keer mis op een product met veel wassing.
- **Badge- en watermerkvariant.** Vraagt een grafisch element over het
  beeld. Dat hoort uit je merkbestanden te komen, niet uit code.
- **Contactvel per order.** Alle beelden van één order op één blad, om
  consistentie te beoordelen vóór levering. Dubbelt als klantpreview.
- ~~**Orderbestand als invoer.**~~ Gebouwd in 4.07 (8 okt 2026): de
  INSTELLINGEN-regel in `_briefing.txt` is dat orderbestand, als
  `sleutel=waarde` omdat ExtendScript geen JSON kent.

Formaten, conversies, contactvellen en controles horen op termijn
**buiten** Photoshop, in een mapscript naast `scripts/`. Dat is sneller,
betrouwbaarder en blokkeert je Photoshop niet. Photoshop moet alleen doen
wat alleen Photoshop kan: maskeren, laagstijlen en kleurlagen.

---

## Lightroom

Lightroom Classic is niet scriptbaar zoals Photoshop — er is geen
ExtendScript, alleen een Lua-plugin-SDK, en dat is zwaar gereedschap voor
wat hier nodig is. Wat wel werkt: ontwikkelvoorinstellingen,
exportvoorinstellingen die de leverspec afdwingen, en XMP-bestanden die
je van buitenaf wegschrijft.

Voor een pijplijn waarin het beeld gegenereerd wordt en niet geschoten,
verdient Lightroom eigenlijk geen plek. Voor eigen merkfotografie wel,
maar dat is dan een voorinstelling en geen script.
