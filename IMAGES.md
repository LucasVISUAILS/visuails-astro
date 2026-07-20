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
- **`logo-mark.webp`** — the real orange VISUAILS "V" mark, transparent
  background. Use small (~20px) next to the wordmark in header/footer.
- **`logo-wordmark.webp`** — the real VISUAILS wordmark, black text,
  transparent background. Use on light surfaces only.
- **`logo-wordmark-light.webp`** — the same wordmark recolored to `--ink`
  (off-white) for use on the dark theme (header/footer). This is the one
  Layout.astro actually uses.

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
