# Design

> **Status: target system, not shipped system.**
> This file describes the system the repositioning brief specifies, ahead of the build.
> The code in `src/styles/global.css` still carries the previous violet/rounded system
> (`--brand: #7B6CF5`, 52 `border-radius` declarations, 154 more inline in page files).
> Sections 1–3 of the build replace it.
>
> **Do not run `/impeccable document` before sections 1–3 land.** It reads the existing
> code and would capture the old system — the exact opposite of the reposition. Re-run it
> *after* section 3 to snapshot the shipped tokens against this target.

---

## Foundations

### Radius — zero, one token, no exceptions

```css
:root { --radius: 0; }
```

Every corner in the product is square. There is no radius scale, no `--r-sm` / `--r-lg` /
`--r-pill`, no "small radius for inputs, larger for cards". One token, so a rounded corner
cannot be reintroduced by accident and so a future decision is a one-line change.

The point is not minimalism. It is that a hard edge is the cheapest visible proof of
control, and control is the argument this brand makes in place of testimonials it does
not have.

Applies to: cards, inputs, selects, textareas, buttons, badges, tabs, modals, toasts,
tooltips, image containers, video posters, model thumbnails (**square, never circular** —
a circular avatar is a social-app tell and a crop the brand does not control),
progress bars, checkboxes, radios, range thumbs and tracks, focus rings, the WhatsApp
launcher, and Stripe Elements (`appearance.variables.borderRadius = '0px'`).

Native controls need `appearance: none` **per element** to actually go square — iOS
Safari re-rounds `<input type="search">`, `<select>`, `<button>`, and range thumbs
independently, and a blanket `* { appearance: none }` does not survive it. Checkboxes,
radios, range and progress get rebuilt square rather than reset.

### Colour — ink and paper, OKLCH, one accent family scoped to system surfaces

The interface is ink on paper so that product photography is the only saturated thing on
the screen. That is the design principle; the token set is its enforcement.

| Token | OKLCH | sRGB | Role |
|---|---|---|---|
| `--ink-900` | `oklch(0.16 0.006 75)` | `#0F0D0A` | Primary text; dark-section ground |
| `--ink-700` | `oklch(0.32 0.005 75)` | `#343230` | Secondary text; dark-section raise |
| `--ink-500` | `oklch(0.45 0.004 75)` | `#575553` | Muted body text **on paper only** |
| `--ink-300` | `oklch(0.72 0.003 75)` | `#A6A4A2` | Rules, disabled, dark-section body |
| `--ink-200` | `oklch(0.84 0.003 75)` | `#CCCAC8` | Hairlines on paper — `--line` |
| `--ink-100` | `oklch(0.89 0.002 75)` | `#DBDAD9` | Body text **on dark grounds** |
| `--paper` | `oklch(0.97 0.004 255)` | `#F3F5F8` | Body ground |
| `--paper-2` | `oklch(0.94 0.005 255)` | `#E9EBEE` | Recessed / inset ground |
| `--paper-lift` | `oklch(0.99 0.002 255)` | `#FBFCFD` | Raised ground |
| `--signal` | `oklch(0.55 0.075 215)` | `#357D8D` | System fills, borders, large text |
| `--signal-ink` | `oklch(0.45 0.075 215)` | `#0F5F6F` | System **text** |
| `--warn` | `oklch(0.58 0.115 45)` | `#B1623D` | Capacity fills, borders, large text |
| `--warn-ink` | `oklch(0.47 0.115 40)` | `#8F4023` | Capacity **text** |

**The two ramps run at opposite temperatures, and that crossing is the system.** Ink is
warm — hue 75, a graphite that reads as iron, soot and concrete. Paper is cool — hue 255,
a true off-white that reads as a photographic grey card or a studio wall. It used to be
the other way round, and that was the one place this palette agreed with the default: a
warm near-white body ground sits inside the cream/sand/parchment band that every generated
site of 2026 lands on. Cool paper leaves that band; warm ink is what stops the dark ground
reading as blue-black screen.

The paper band sits at chroma 0.002–0.005. If a build ever pushes paper chroma above
0.008, it has drifted back toward the saturated default and must come back.

Every value above is inside sRGB, **checked unclamped**. This is not pedantry: an
out-of-gamut `oklch()` is not an error, it is silently gamut-mapped by the browser, so the
shipped colour quietly stops being the hex on its own row and every ratio derived from it
becomes fiction. `--warn-ink` was `oklch(0.47 0.11 65)` for the whole life of this palette <!-- gamut:historical -->
and was outside sRGB by 0.003 on blue — the `#844B00` and the `6.44:1` this table used to
publish were never real. Nothing caught it because every colour tool in the suite clamps,
which is precisely what makes a clamping converter unable to audit its own input.

**There is no success green.** The previous system's `--success: #63C79A` is removed, along
with every `style="stroke:var(--success)"` checklist tick currently inline across `/video`,
`/catalog`, `/lifestyle`, `/custom-models`, `/pricing` and `/compare`. Ticks become
`--ink-900` on paper. A green tick is a SaaS-onboarding signal and it is the single
loudest remaining colour on pages that are otherwise about photographs.

**`--signal` and `--warn` are scoped.** They appear only on `/start`, the client portal,
and system surfaces (capacity gate, order state, form validation). They never appear on a
marketing page. Marketing pages are ink, paper, and photography.

> **Addendum, task #271c, 2026-07-29 — this rule is deliberately, narrowly widened, not
> reversed.** Lucas asked for a 4-colour scheme on top of the existing black/white/paper
> system, referencing a moodboard palette. Rather than invent new hues — which would break
> "the photograph is the only colour" above — the two new accents reuse `--signal` and
> `--warn` themselves, aliased as `--verify`/`--flag` in `global.css`, so no new value enters
> the gamut sweep or the contrast table on this page. They now also appear on the homepage
> and the four service pages (`/custom-models`, `/models`, `/catalog`, `/lifestyle`,
> `/video`) — but only as a coloured rule under one fact the page's own copy already states
> (a delivery window = Flag, a review/QC claim = Verify), never as a fill, never as body
> text, and never invented for a page whose copy makes neither claim. `/custom-models` and
> `/models` (`BrandModelPage.astro`, `ModelsPage.astro`) were checked against this test and
> left uncoloured: their trust-rows state pricing and positioning, not a window or a review,
> so colouring them would be decoration, not meaning — the one thing `colorize` rules out.
> The underlying tokens, their `/start`/portal scoping, and every contrast number in this
> file are untouched; only WHERE the same two colours may be *quoted* has widened, and only
> as a rule, per the "large text and fills only" constraint two sections below. See
> `global.css`'s `--verify`/`--flag` comment for the full reasoning.

#### Measured contrast — the rules these numbers force

Computed WCAG 2.1 ratios, sRGB, from the OKLCH values above.

Every `L` in the ramps is unchanged from the palette this replaced — the temperature swap
is a pure hue rotation — so the table below barely moved. That is what made a change this
broad safe to make at all.

On `--paper` (`#F3F5F8`):

| Foreground | Ratio | Verdict |
|---|---|---|
| `--ink-900` | **17.80** | Body, headings, ticks — pass |
| `--ink-700` | **11.64** | Body, secondary — pass |
| `--ink-500` | **6.83** | Muted body, placeholders, captions — pass |
| `--ink-300` | **2.28** | **Not a text colour.** Rules and disabled only |
| `--ink-200` | **1.50** | Hairlines only — this is `--line` |
| `--ink-100` | **1.28** | **Not a paper token.** Body text on dark grounds |
| `--signal` | **4.33** | **Fails body.** Fills, borders, ≥18px only |
| `--signal-ink` | **6.63** | System text — pass |
| `--warn` | **4.11** | **Fails body.** Fills, borders, ≥18px only |
| `--warn-ink` | **6.59** | Capacity text — pass |

On `--ink-900` (`#0F0D0A`):

| Foreground | Ratio | Verdict |
|---|---|---|
| `--paper` | **17.80** | Pass |
| `--paper-2` | **16.29** | Pass |
| `--ink-100` | **13.96** | Body on dark — pass |
| `--ink-300` | **7.82** | Muted body on dark — pass |
| `--ink-500` | **2.61** | **Unusable on dark.** Paper-side muted only |
| `--signal` | **4.12** | Large text and fills only |
| `--warn` | **4.33** | Large text and fills only |

Three rules fall out of the table and are not negotiable:

1. **`--signal` / `--warn` never set body text.** The `-ink` variants exist for exactly
   this. `4.33` is a fail, not a rounding error.
2. **`--ink-500` is a paper-side token; `--ink-300` is a dark-side token.** They are not
   interchangeable "muted" values. Swapping them ships a 2.6:1 or a 2.3:1.
3. **Placeholders use `--ink-500`, not `--ink-300`.** Placeholder text is held to the same
   4.5:1 as body — the muted-gray placeholder is the most common AA failure in this
   codebase's category and the one a screenshot never reveals.

Hairlines are exempt from text contrast (`--ink-200` on paper is 1.50:1, `--ink-300` is
2.28:1) but not from the 3:1 non-text requirement where they carry meaning: an input
border, a focus ring, or a selected-state boundary uses `--ink-700` or darker, never
`--line`.

**`--ink-200` exists because `--line` had to get harder without `--ink-100` moving.** The
default rule was `--ink-100` at 1.28:1, which is a rule you have to go looking for; at
1.50:1 it draws. `--ink-100` could not simply be darkened to do that job, because on dark
grounds it is `--ink-2`, the body text colour — dragging it down would have cost real
legibility to buy a harder hairline. Adding a step inside the ink ramp is not a third
ramp; "two ramps, no third" is a rule about ink versus paper.

#### Changing the palette — the ten places a colour is hand-carried

Editing `:root` in `global.css` does **not** change the palette. Ten colours live outside
it, in languages that cannot read a custom property, and each one silently keeps the old
value until somebody moves it by hand. This list is the checklist; work it top to bottom
and nothing is left behind.

| Where | What | Why it cannot be a `var()` |
|---|---|---|
| `global.css` `.on-ink` | four longhand `--paper` values with alpha | a custom property cannot carry an alpha; `color-mix` is used nowhere in this codebase |
| `global.css` `--select-caret` ×2 | two URL-encoded SVG strokes | a `data:` URI is an opaque string to CSS |
| `global.css` chrome ramp | twelve gradient stops | fenced separately — see the chrome section |
| `global.css` `.vis` placeholder | two ramp stops | inside a gradient, same as above |
| `Layout.astro` `<meta name="theme-color">` | one hex | an HTML attribute, not CSS at all |
| `Layout.astro` SVG sprite | six greys — three `gObj` stops, two `gGlass` stops, one flat fill | SVG presentation attributes in markup, not styled elements |
| `shader-hero.js` | one `vec3` | GLSL has no access to the document |
| `functions/api/order.js` | three mail hexes | mail clients strip `<style>` and cannot resolve properties |
| `public/img/logo-mark.webp` | rendered pixels | a raster; regenerate, never hand-edit |
| `public/portal.css` `:root` | the whole token block | served by a Worker that cannot import a hashed stylesheet |

The `--select-caret` row says "×2" rather than naming a second token, because there is no
second token: `global.css` declares `--select-caret` **twice under the same name**, once in
`:root` with a `%23343230` stroke and once in `.on-ink` with `%23F3F5F8`, so the caret
flips with the ground by scope rather than by a second variable. An earlier draft of this
table invented a `--select-caret-ink` to sit beside it. It never existed. A checklist that
names a token that is not there sends the next reader looking for a declaration to update,
finds nothing, and teaches them the checklist is unreliable — which is worse than the
omission it was trying to fix.

`theme-color` and the sprite are the two rows nothing else can catch. `verify2` §6
allowlists the `theme-color` attribute by name, so the literal is legal there and no other
tool reads it; this row is its only guard. The sprite is guarded, but only because it was
missed once: its six greys were re-cut onto the ink ramp when the ramp was hue 265, then
sat unchanged through the rotation to hue 75 while the comment above them went on claiming
they shared the interface ramp. `verify2` §6 now allowlists the flat fill **by value and in
both directions** — the sweep goes red if the sprite carries a grey the allowlist does not
name, and a companion check goes red if the allowlist names a grey the sprite does not
carry — so neither half can be updated alone. The five gradient stops are still on this
row's honour system, because `stop-color` is allowlisted wholesale.

Verifying the result is two commands, not one. `verify2` §3 proves contrast and §5 proves
the paper band, but its converter clamps to sRGB and therefore cannot see an out-of-gamut
value at all — `gamut_sweep.py` is the pass that can, and it must come back with zero.

### Elevation — hairlines and paper value, not shadow

`box-shadow` is removed as a depth signal. Depth is expressed by which paper a surface
sits on and whether it carries a 1px hairline.

| Level | Ground | Border | Used for |
|---|---|---|---|
| 0 | `--paper` | none | Page ground |
| 1 raised | `--paper-lift` | `1px solid var(--line)` | Cards, panels, pricing blocks |
| 2 recessed | `--paper-2` | `1px solid var(--line)` | Inputs, wells, code/spec blocks |
| 3 active | `--paper-lift` | `1px solid var(--ink-900)` | Selected card, focused field, current step |
| 4 floating | `--paper-lift` | `1px solid var(--ink-900)` | Modals, sticky nav, toasts, dropdowns |

Level 4 is the **sole** shadow exception, and it is an offset shadow with zero blur and
zero spread — a hard displaced rectangle, not a glow:

```css
box-shadow: 6px 6px 0 0 oklch(0.16 0.006 75 / 0.16);   /* .nav-menu   */
box-shadow: 6px 6px 0 0 oklch(0.16 0.006 75 / 0.22);   /* .convbar    */
```

Both live in `Layout.astro`'s scoped styles, not in `global.css`, because both elements are
layout chrome that exists once per page. The alpha differs on purpose: the nav menu drops
onto paper, the conversion bar drops onto whatever section it happens to be floating over,
so it needs the heavier one to stay legible against a dark ground. This block previously
published a single `0.10` at hue 265 — an alpha that was never used and a hue that stopped
existing — which is the same rot the token table had, in the one place a reader is most
likely to copy a value straight out of the document.

No gradients on UI surfaces. Not on buttons, not on cards, not on section grounds, not on
the nav bar. The only gradient in the system is the chrome field, and its scope is fixed
below.

### Focus

```css
:focus-visible {
  outline: 2px solid var(--ink-900);
  outline-offset: 2px;
  border-radius: 0;
}
```

`outline` rather than `box-shadow`, so the ring is square and survives on any ground.
On dark sections the ring flips to `--paper`. Focus is never removed, never replaced with
a colour change alone, and never suppressed on mouse input for form fields.

---

## Typography

Archivo stays. It is already self-hosted through Fontsource, already licence-clean and
AVG-clean (zero Google Fonts requests), and a heavy grotesque is the correct voice for a
brand arguing engineered control. Replacing it would be change for its own sake.

Two changes, both functional:

**1. Move from eight static cuts to one variable file.** `@fontsource/archivo` currently
loads `400 / 500 / 600 / 700 / 800 / 900 / 400-italic / 700-italic` — eight requests on
every page, against an LCP budget of under 2.5s on mobile 4G with a WebGL field running.
`@fontsource-variable/archivo` is one file across the whole weight axis. Preload the
variable roman; drop italic to a synthesised fallback or a single cut if the design
actually uses it (it currently uses it in exactly one place, `/video`'s hero `<em>`).

**2. Get display contrast from the width axis, not a second family.** Archivo's variable
build carries a `wdth` axis. Display sizes run expanded and heavy; body runs normal.
That is a contrast axis inside one family, which the type rules permit and which costs
zero additional bytes.

```css
--font-display: "Archivo Variable", "Archivo", system-ui, sans-serif;
--font-body:    "Archivo Variable", "Archivo", system-ui, sans-serif;
--font-data:    "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace;

h1, h2, .display { font-variation-settings: "wdth" 112; font-weight: 800; }
```

If the published Fontsource variable package exposes `wght` only and not `wdth`, do not
substitute a second display family — fall back to weight 900 plus `letter-spacing: -0.035em`
and move on. The width axis is an improvement, not a dependency.

**Third role: a monospace for data only.** `IBM Plex Mono`, 400 and 500, latin subset,
self-hosted via Fontsource (OFL 1.1). It sets prices, deadlines, turnaround figures,
capacity counts, order IDs, product counts, file specs, and table numerals — the things
the brand claims to control. It is the "instrument" reading made literal, and it is why
`€1,850`, `48h` and `8 products` can be legible as specifications rather than as marketing.

The discipline that keeps it from becoming a terminal-aesthetic tell:

- Mono never sets a heading.
- Mono never sets a sentence or a paragraph.
- Mono never appears for decoration, texture, or an "eyebrow".
- Mono appears only where a number, unit, date, ID or spec label appears.

If a mono string in a build is not a number or an identifier, it is wrong.

### Scale

```css
--t-hero: clamp(3.2rem, 7.4vw, 6rem);    /* at the 6rem ceiling — do not raise */
--t-h1:   clamp(2.5rem, 5.2vw, 4.2rem);
--t-h2:   clamp(2.1rem, 4.0vw, 3.3rem);
--t-h3:   clamp(1.2rem, 1.7vw, 1.45rem);
--t-body: 1.0625rem;
--t-sm:   0.9375rem;
--t-data: 0.875rem;                       /* mono runs one step down — it sets wide */
```

- Display letter-spacing floor: `-0.035em`. Never tighter than `-0.04em`.
- `text-wrap: balance` on h1–h3; `text-wrap: pretty` on prose.
- Prose measure capped at 68ch.
- Body line-height 1.6; display 1.02–1.08.
- **No uppercase tracked eyebrow above sections**, and **no `01 / 02 / 03` section
  numbering** except where the content genuinely is an ordered sequence — the four-step
  `/start` flow and the process strip on `/custom-models` qualify; nothing else does.
  The existing `.ed-meta` `( Where it fits )` pattern is a named parenthetical kicker used
  sparingly, not an eyebrow on every section; it survives only where it is already used
  and is not extended to new sections.

---

## Chrome — the signature, and its fence

Chrome is the one non-monochrome material in the system. It reads as brushed, reflective
metal: a non-monotonic lightness ramp that goes light-dark-light-dark rather than fading,
because a fade reads as a gradient and a reversal reads as a reflection.

### The gradient

Twelve stops. Maximum chroma `0.012`. Eight lightness direction reversals — verified, not
eyeballed. Nine stops sit on the ink hue, two run slightly warmer than it, and exactly one
crosses to the paper hue at 62%: a single cool reflection in a warm surface, which is what
stops the metal flattening into a tint.

That sentence used to read the other way round — one *warm* glint in a cool surface — and
the reversal is the whole temperature swap in miniature. When ink was blue-black and paper
was warm off-white, the odd stop out was the warm one. Ink is warm now and paper is cool,
so the same structural stop changed sign without a single number about the ramp's *shape*
changing. Twelve stops, eight reversals and a 0.012 ceiling are the invariants; which end
of the spectrum the outlier sits on is not.

```css
--chrome: linear-gradient(
  105deg,
  oklch(0.720 0.004 75)    0%,    /* #A6A4A2 */
  oklch(0.880 0.006 75)    9%,    /* #DAD7D3 */
  oklch(0.580 0.008 75)   17%,    /* #7D7A75 */
  oklch(0.940 0.003 60)   26%,    /* #EDEBE9 */
  oklch(0.660 0.010 75)   35%,    /* #96918C */
  oklch(0.410 0.006 75)   44%,    /* #4C4A47 */
  oklch(0.830 0.005 60)   53%,    /* #CAC6C4 */
  oklch(0.970 0.002 255)  62%,    /* #F4F5F6  — the cool glint */
  oklch(0.520 0.009 75)   71%,    /* #6C6863 */
  oklch(0.760 0.004 75)   80%,    /* #B2B1AE */
  oklch(0.350 0.007 75)   89%,    /* #3D3A37 */
  oklch(0.610 0.012 75)  100%     /* #87827B */
);

--chrome-filter: contrast(1.18) saturate(0.75);
```

The filter is part of the material, not an afterthought: `contrast` sharpens the
reversals into visible bands, `saturate(0.75)` pulls the residual chroma back so the
metal never tints. Applied to the chrome surface, never to its children.

### Exactly one surface

**The hero field** — a WebGL plane behind the homepage hero (EN `/` and NL `/nl`), with
real fresnel: reflectance rising toward grazing angles, not a scrolling gradient texture.
Hard rectangular bounds, no feathered edge, no vignette bleed into the page.

That is the complete list, and it used to have two entries. Chrome is forbidden on:
buttons, links, borders, dividers, icons, card grounds, section grounds, badges, form
controls, the nav bar, the footer, headings, **and the logotype**. `background-clip: text`
is a hard ban with no exception at all now, because the one thing it was excepted for is
gone.

A second chrome surface is not an extension of the signature; it is the point at which the
signature stops being one.

### The logotype was surface #2, and it was withdrawn

Worth writing down rather than quietly shortening the list above, because the sequence is
unusual: the blocking dependency this section used to carry was cleared, and then the
thing it was blocking was cancelled.

The dependency read: `public/img/logo-wordmark-light.webp` is a raster, a raster cannot
take a gradient fill, so chrome surface #2 cannot ship until the wordmark exists as SVG
paths. That conversion happened. The letterforms were outlined, the sprite went inline in
`Layout.astro` as `<symbol id="wordmark">` and `<symbol id="markglyph">`, and four
`<linearGradient>`s carried the twelve spec stops remapped per ground, solved to 3.25:1 so
a 17px word did not develop holes in its letterforms.

Then the client saw it rendered at logo size and read the metal as cheap rather than as
expensive — the exact opposite of what the material is in the system to say. That is a
verdict on the Removability test below, returned from a rendered page rather than argued
from a spec, and it is the strongest kind of evidence this document can get. So the
logotype is one flat ink: `.brand-word` and `.brand-mark` take `fill: var(--ink)` and
nothing else.

The premise held and the conclusion inverted. The SVG conversion was the right call
regardless — a `<use>`-driven symbol is what lets the mark take its colour from the ground
it lands on at all, which the raster never could, and it is what makes one flat value work
on both paper and ink without a second asset.

Two consequences that are easy to miss, both handled:

- `public/img/logo-mark.webp` is a **generated** raster, not a source file, and
  `Layout.astro`'s schema.org `logo:` field points at it. It is what a search result and a
  social card draw, neither of which can resolve an SVG `<use>` or a CSS custom property.
  It was regenerated flat from the shipped sprite and the shipped stylesheet. Changing the
  live logotype without it would have shipped chrome everywhere the site is *quoted* while
  the site itself went flat.
- The tokens `--wordmark-fill` and `--mark-fill` are **deleted**, not repointed. They
  existed only because a gradient `url()` is not a value `--ink` can express, so they had
  to be redeclared inside `.on-ink` in parallel with `--ink` and kept in step by hand. A
  flat logotype simply *is* `--ink`, so the aliases became a second thing that can drift,
  for no gain.

`--chrome-filter` stays declared and is **not** part of this retirement, which is the trap
worth naming: it looks like logotype machinery and is not. `.ch-promise .hero-fallback` is
a *surface* — the hero plane's static fallback — and is now its only reader. Deleting the
token along with the logo would silently unfilter that fallback.

Fallback order for the logotype is therefore no longer a chain: flat `--ink-900` on light
grounds, `--paper` on dark, which is exactly what `fill: var(--ink)` resolves to on each.
The old note said the flat version had to be legible on its own or the chrome was
decoration propping up a weak mark. It is legible on its own, and it is now the only
version there is.

### Degradation

- **No WebGL context:** the CSS `--chrome` gradient renders in the same rectangle, static.
- **`prefers-reduced-motion: reduce`:** the field **freezes**, it does not disappear. The
  chrome is identity; removing it under reduced motion gives that user a different brand.
- **`prefers-reduced-data: reduce`:** same freeze, and the shader module is never fetched.
- **Before hydration:** a static poster fills the rectangle, so the hero is never empty
  and never reflows.
- **Mobile:** the field caps at ~40vh so the first garment is above the fold.

Loaded as an Astro island with `client:visible`. The shader must not be in the critical
path of LCP.

### Two tests the chrome has to pass

**Removability.** Delete the chrome field and the chrome logotype fill. If the page is
still clearly this brand, the chrome is a signature. If the page collapses into a generic
monochrome template, the chrome was carrying the identity and the identity needs to be
built in the type, the grid and the copy first.

*Half of this test has now been run for real, on a rendered page, by the client.* The
chrome logotype fill was deleted and the page is still clearly this brand — the hard
edges, the ramp, the type and the copy carry it without the metal in the mark. Which is
the passing answer, not the failing one: it is what a signature is supposed to do when you
take one instance of it away. It also means the fence above is now load-bearing in a way
it was not before. With one surface left, "a second chrome surface" is not a slippery
slope argument; it is the difference between having a signature and having a texture.

**First screen.** Load the homepage and look away. *What do I remember — the chrome, or a
garment?* If the answer is the chrome, the field is too large, too bright, or too animated.
The correct answer is the garment. The chrome should be the thing you notice second, and
only then realise was there the whole time.

---

## Motion

Motion is part of the build, not a pass at the end — but it is the **last** section of the
reposition to be implemented, after the visual system is settled, so it is tuned against
real surfaces rather than guessed.

```css
--ease-out-quart: cubic-bezier(0.25, 1, 0.50, 1);
--ease-out-quint: cubic-bezier(0.22, 1, 0.36, 1);   /* the existing --ease; kept */
--ease-out-expo:  cubic-bezier(0.16, 1, 0.30, 1);

--dur-1: 120ms;   /* state: hover, focus, press */
--dur-2: 240ms;   /* element: reveal, expand, swap */
--dur-3: 450ms;   /* section: scroll reveal */
--dur-4: 900ms;   /* chrome, hero, page transition */
```

Ease-out only. No bounce, no elastic, no `ease-in-out` on entrances. Nothing overshoots —
overshoot is playfulness, and this brand's argument is control.

- **Reveals enhance an already-visible default.** Content is never gated on a
  class-triggered transition. Transitions do not fire on hidden tabs or in headless
  renderers, and a gated section ships blank. The existing `.reveal.pending` pattern is
  audited against this during section 1 and fixed if it hides by default.
- **Every animation ships a `prefers-reduced-motion` alternative** — typically an instant
  state, occasionally a crossfade. The chrome field is the documented exception: it
  freezes rather than vanishing.
- Stagger within a single list is legitimate. One identical entrance applied uniformly to
  every section is the tell, and the current site has it — it goes.
- Do not animate layout properties. `transform`, `opacity`, `filter`, `clip-path`, `mask`.
- GSAP + ScrollTrigger stay in `src/scripts/motion.js`, inside a `gsap.context()` reverted
  on `astro:before-swap` — `<ClientRouter />` makes page-local scripts unreliable, so all
  JS lives in shared modules re-inited on `astro:page-load`.

---

## Layout & spacing

```css
--container: 1240px;
--gutter: clamp(1.25rem, 4vw, 2.5rem);

--s-1: 0.25rem;  --s-2: 0.5rem;   --s-3: 0.75rem;  --s-4: 1rem;
--s-5: 1.5rem;   --s-6: 2rem;     --s-7: 3rem;     --s-8: 4.5rem;
--s-9: 7rem;     --s-10: 10rem;
```

The scale is deliberately non-uniform at the top so section rhythm varies. Sections do not
all get `--s-8`; a dense spec section sits tighter than a photograph, and the difference is
the rhythm.

- Flexbox for one dimension, Grid for two. Do not reach for Grid where `flex-wrap` is the
  simpler answer.
- Responsive grids without breakpoints: `repeat(auto-fit, minmax(280px, 1fr))`.
- **Cards are the lazy answer.** Nested cards are always wrong. The current site leans on
  identical icon-heading-text card grids; where a section's content is genuinely a list,
  it becomes a list with hairline rules rather than a grid of boxes.
- No side-stripe borders — a `border-left` heavier than 1px as a coloured accent is banned
  outright.

### z-index — semantic scale

```css
--z-base:           1;
--z-dropdown:     150;
--z-sticky:       200;
--z-bar:          250;
--z-grain:        300;   /* above the sticky bar, below any modal — deliberate */
--z-modal-back:   390;
--z-modal:        400;
--z-toast:        500;
--z-tooltip:      600;
```

Never an arbitrary `999` / `9999`. Absolutely-positioned dropdowns inside
`overflow: hidden` / `auto` containers get clipped — use `position: fixed`, the popover
API, or a portal.

---

## Accessibility

WCAG 2.2 AA, enforced by the contrast table above rather than by intention.

- Body ≥4.5:1, large text (≥18px, or bold ≥14px) ≥3:1, **placeholders held to 4.5:1**.
- Meaningful non-text boundaries ≥3:1 — input borders, focus rings, selected states.
- Square focus ring via `outline` + `outline-offset`, visible on every interactive target.
- Every animation has a reduced-motion alternative; `prefers-reduced-data` honoured too.
- Reveals never gate visibility.
- Touch targets ≥44px, including the square WhatsApp launcher and the language switcher.
- EN and NL parity on every change, with `hreflang` alternates on every route.
- Colour is never the sole carrier of state — capacity, validation and order status all
  carry a word as well as a `--signal` / `--warn` fill.

---

## What this system rejects

- **Rounded corners.** Any radius above 0, anywhere.
- **Shadow as depth.** Blur and spread are removed; level 4 offset-only is the exception.
- **Gradients on UI.** Buttons, cards, grounds, bars. The chrome field only.
- **Gradient text.** `background-clip: text` on any copy. Emphasis is weight and size.
- **Success green**, and every inline `stroke:var(--success)` tick in the page files.
- **Circular avatars** for model thumbnails.
- **Glassmorphism** as a default surface treatment.
- **Uppercase tracked eyebrows** above every section, and `01 / 02 / 03` scaffolding on
  sections that are not sequences.
- **The hero-metric template** — big number, small label, supporting stats.
- **Identical card grids** as the answer to every list.
- **Borrowed credibility** — invented testimonials, client names, logos, metrics, results,
  "as seen in" strips, countdown urgency, review walls. Industry figures are labelled as
  industry figures. Case-study slots stay empty until there is something true in them.
- **Cream, sand, bone, parchment** body grounds. Paper stays at chroma ≤0.004.
- **A second chrome surface.** There is one, and the logotype used to be the other.

---

## Build order

1. Hard edges sitewide — `--radius: 0`, strip 52 + 154 radius declarations, square native
   controls, square focus rings, hairline elevation, own square WhatsApp launcher.
2. Monochrome — the OKLCH ramp above replaces the violet system; `--success` deleted;
   `--signal` / `--warn` scoped to `/start`, portal and system surfaces.
3. Chrome — hero field only. The logotype was built chrome-filled after the SVG wordmark
   conversion cleared, then reverted to one flat `--ink` on the client's call; the SVG
   conversion itself stays, because that is what lets the mark take the ground's ink.
4. Copy, pricing, nav, `/ai-act`.
5. Order pipeline — `/start`, portal, capacity gate.
6. Motion, last.

Verification after each of 1–3: EN/NL parity by class count, tag balance, CSS class
existence, link validation, zero remaining `border-radius`, computed contrast for every
shipped token pair, and a headless render confirming no section ships blank.
