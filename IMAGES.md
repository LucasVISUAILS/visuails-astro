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
