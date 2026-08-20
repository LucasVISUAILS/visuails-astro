# Real photography in public/img/ (72 files, all .webp)

Every photo below is real VISUAILS campaign/product photography (or the
real brand logo) — not placeholders. Use these generously; they are the
product. Only fall back to the `.vis` SVG placeholder (see Layout.astro's
sprite + global.css `.vis` classes) for a literal "plain product on white"
catalog moment where no real photo applies — everything else should use a
real photo.

- **`banners-01.webp` … `banners-17.webp`** (17) — general campaign / hero
  photography, moody and cinematic. Best for page heroes and any full-bleed
  opening image. `banners-09` through `banners-17` are the newest, highest-
  resolution batch (2400px) — prefer these for the homepage/largest heroes.
- **`lifestyle-dunes-01.webp`, `-02.webp`** (2) — "Dunes": warm, sun-washed, quiet.
- **`lifestyle-flash-01.webp` … `-08.webp`** (8) — "Flash": hard on-camera
  flash, night, high contrast.
- **`lifestyle-glow-01.webp` … `-06.webp`** (6) — "Glow": golden hour, warm bloom.
- **`lifestyle-phone-made-01.webp` … `-14.webp`** (14) — "Phone-made": candid,
  natural daylight, unstaged-looking.
- **`model-01.webp`, `model-02.webp`, `model-03.webp`** (3) — close, direct
  generic portrait shots. Good for a hero split or a page that doesn't need
  a specific named model.
- **`custom-models-01.webp` … `-05.webp`** (5) — custom-model example
  portraits/section backgrounds, softer editorial treatment.
- **`model-raw-01.webp`, `model-raw-02.webp`** (2) — NEW: extreme close-up,
  hyperreal "raw beauty" headshots (visible pores/freckles/a small tattoo) —
  a different, more intense register than the custom-models set. Use where
  the copy is specifically about AI image *quality/detail* (e.g. a
  custom-models "look at this detail" moment), not as a generic portrait.
- **`model-aaron.webp`, `model-ava.webp`, `model-dana.webp`,
  `model-elias.webp`, `model-fabi.webp`, `model-lisa.webp`,
  `model-maegan.webp`, `model-rae.webp`, `model-ryan.webp`,
  `model-seme.webp`** (10) — real, named standard-model headshots (portrait,
  ~1600px long edge) for the `/models` roster. Use `object-fit:cover` in a
  circle or card — do not force-crop the source file itself.
- **`catalog-before.webp`, `catalog-after.webp`** (2) — the one real
  before/after pair: a raw phone photo of a garment (before) and the same
  garment as a clean catalog flat-lay (after). Use for `.ba` (drag compare)
  or `.spot` (cursor-lens compare, see global.css) wherever this exact
  moment appears.

### The `-w<width>` files are generated, and are not photographs

Thirteen files carry a `-w800` or `-w960` suffix: `model-<name>-w800.webp`
(nine of the ten roster portraits) and `lifestyle-flash-02-w960.webp`,
`lifestyle-glow-01-w960.webp`, `lifestyle-phone-made-11-w960.webp`,
`banners-13-w960.webp`. They are the same photograph as the un-suffixed file
beside them, resized — nothing above needs re-reading because of them.

They exist because two grids draw those photographs small: the look picker on
`/start/lifestyle` (~410 CSS px on a desktop) and the roster on `/models`
(~211 px). Those two pages were shipping 1.3 MB and 1.4 MB of photography so
the browser could throw most of it away; they now ship 487 kB and 522 kB.

**Do not hand-make one.** `scripts/make-thumbs.mjs` generates all thirteen and
argues both numbers — each width is ~2× the widest CSS box the image is ever
drawn in, measured in a browser rather than read off the CSS. The width is in
the filename so a file always states its own size. Add a source to the JOBS
table there rather than resizing something by hand, and use the derivative
only where the tile is small: anything that shows one of these large keeps the
original. Rae and `lifestyle-dunes-01` have no derivative on purpose — both
are already at or under the target width, so one would be a re-encode.

### The three logo rasters — one is generated, two are dead

The live logotype is not a raster at all any more. It is an inline SVG sprite in
`Layout.astro` (`<symbol id="wordmark">` and `<symbol id="markglyph">`), drawn
through `<use>` and filled with `fill: var(--ink)`, so it takes the ink of
whatever ground it lands on. Do not reintroduce a raster logo into a page.

- **`logo-mark.webp`** (4654 b, 512×512, RGB, **no alpha**) — a **generated**
  file, not a source file. Flat `--ink` monogram on a `--paper` square. Its one
  job is `Layout.astro:98`, the schema.org `logo:` field: search results and
  social cards draw a raster and cannot resolve an SVG `<use>` or a custom
  property, so the mark has to exist as pixels for them specifically. The square
  paper ground is deliberate — that is what a search card composites onto, and a
  transparent PNG of dark ink disappears on a dark card.

  **Regenerate it, never hand-edit it.** `/tmp/render_logo.mjs` renders it from
  the shipped sprite and the shipped stylesheet via headless Chromium, asserts
  the computed fill equals the page's own `--ink`, and PIL encodes the result.
  Rendering from the real sources is the whole point: the raster cannot then
  disagree with the site. It has been regenerated twice for exactly this reason
  — once when a cyan-to-periwinkle mark went monochrome, once when the chrome
  ramp went flat. If the logotype changes a third time, this file changes with
  it or the search card keeps showing a logo the site no longer has.

- **`logo-wordmark.webp`** (41270 b, 1646×276, RGBA) — black wordmark on
  transparency. **Referenced by nothing.** Not by a page, not by a component,
  not by the sprite; the only mention left in the repo is this line. Superseded
  by the outlined SVG paths. Deletion candidate, kept for now only because it is
  the last artefact of the original letterforms.

- **`logo-wordmark-light.webp`** (8010 b, 1646×276, RGBA) — the same wordmark in
  off-white for dark grounds. **Also dead**: the only thing naming it is a
  comment at `Layout.astro:252` recording what the SVG replaced. It is worth
  understanding *why* it is dead rather than just that it is, because the reason
  is the argument against ever going back: a two-file light/dark pair is two
  assets to keep in step, and neither of them can follow `--ink` when a ground
  changes. One `<use>` with one fill does both and cannot drift.

## Compare interactions — two options, pick per context

- **`.ba`** (drag-handle slider, global.css + `initCompare()` in
  interactions.js): a fixed handle the visitor drags left/right. Familiar,
  precise. Good for a page where the before/after is one supporting proof
  point among several.
- **`.spot`** (cursor-following circular lens, `initSpotlight()`): the
  after-shot reveals through a circle that follows the mouse (or a
  finger-drag on touch). More playful, more "this is the point of the
  business" — reserved for the homepage's flagship proof moment and any
  other single most-important before/after on a page. Don't use both on the
  same page for the same photo pair.

## Any `/img/` path not listed above will 404

svelte-config-style asset warnings don't exist here (this is Astro static
output) — a typo just breaks the image silently in the browser. Only
reference filenames listed above.

## AVIF naast elke webp — en waarom de markup er niets van weet

`npm run avif` (scripts/make-avif.mjs) zet naast elke `.webp` in deze map een
`.avif` van dezelfde afmetingen: 173 bestanden, 19.4 MB aan webp tegen 9.3 MB
aan AVIF. Per pagina gemeten op de zwaarste: de homepage gaat van 4833 kB naar
2163 kB, /gallery van 9239 kB naar 4130 kB — allebei 55 procent minder, bij een
kwaliteit waar op deze foto's met het oog niets aan te zien is.

**De webp blijft staan en wordt niet vervangen.** Een `<picture>` biedt de AVIF
eerst aan en valt terug op de webp voor wie AVIF niet leest. Er is dus geen
scherm waarop dit slechter is dan wat het vervangt, en dat is de hele reden dat
het naast elkaar staat in plaats van in plaats van elkaar.

**Er staat nergens een `<picture>` in de bron.** `scripts/avif-naast-webp.mjs`
is een build-integratie die na het bouwen door dist/ loopt en elke `<img>` die
naar een `/img/*.webp` wijst waar een `.avif` naast ligt, inpakt. 740 beelden op
58 pagina's, uit één regel code. Waarom niet met een component: er staan 73
`<img>`-tags in 38 bestanden, en de eerste heldieafbeelding draagt
`transition:name`, een Astro-directive die niet door een component heen kan.

Twee dingen die je moet weten als je hier iets aan verandert:

- **Een ontbrekende AVIF is geen terugval maar een gat.** make-avif schrijft geen
  AVIF als die groter zou worden dan de webp — bij kleine beelden en bij vlakken
  met weinig detail wint webp. Een `<source>` die naar een bestand wijst dat er
  niet is, kiest de browser wél, en dan toont hij niets: geen icoon, geen fout,
  een leeg vlak. De integratie kijkt daarom per pad op schijf, en laat bij een
  `srcset` de hele bron vallen zodra er één breedte in ontbreekt.
- **`picture { display: contents }` en `source { display: none }` staan in
  global.css en zijn allebei nodig.** Zonder de eerste wordt de `<picture>` het
  rasteritem in plaats van de `<img>`; zonder de tweede wordt de `<source>` een
  eigen rastertegel naast het beeld — vier foto's in vier kolommen werden acht
  items in twee rijen. Het staat daar met de meting erbij.

Beelden die pas in de browser gemaakt worden (de modelkiezer vult zijn
miniaturen met JS) krijgen geen AVIF. Dat zijn er zes, ze zitten achter een klik,
en een `img.src` omzetten zonder terugval zou ze op een oudere browser breken.
