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
| `--ink-900` | `oklch(0.16 0.006 265)` | `#0C0D10` | Primary text; dark-section ground |
| `--ink-700` | `oklch(0.32 0.005 265)` | `#323335` | Secondary text; dark-section raise |
| `--ink-500` | `oklch(0.45 0.004 265)` | `#545557` | Muted body text **on paper only** |
| `--ink-300` | `oklch(0.72 0.003 265)` | `#A4A4A6` | Hairlines, disabled, dark-section body |
| `--ink-100` | `oklch(0.89 0.002 265)` | `#DADBDC` | Hairlines on paper, dividers |
| `--paper` | `oklch(0.97 0.004 85)` | `#F6F5F2` | Body ground |
| `--paper-2` | `oklch(0.94 0.004 85)` | `#ECEBE8` | Recessed / inset ground |
| `--paper-lift` | `oklch(0.99 0.002 85)` | `#FCFCFA` | Raised ground |
| `--signal` | `oklch(0.55 0.07 255)` | `#55749A` | System fills, borders, large text |
| `--signal-ink` | `oklch(0.45 0.09 255)` | `#305686` | System **text** |
| `--warn` | `oklch(0.58 0.11 70)` | `#A36D24` | Capacity fills, borders, large text |
| `--warn-ink` | `oklch(0.47 0.11 65)` | `#844B00` | Capacity **text** |

The paper band sits at chroma 0.002–0.004 on hue 85. That is deliberately below the
warm-neutral default band — it is a true off-white with a trace of warmth, not cream,
sand, bone or parchment. If a build ever pushes paper chroma above 0.008, it has drifted
into the saturated default and must come back.

**There is no success green.** The previous system's `--success: #63C79A` is removed, along
with every `style="stroke:var(--success)"` checklist tick currently inline across `/video`,
`/catalog`, `/lifestyle`, `/custom-models`, `/pricing` and `/compare`. Ticks become
`--ink-900` on paper. A green tick is a SaaS-onboarding signal and it is the single
loudest remaining colour on pages that are otherwise about photographs.

**`--signal` and `--warn` are scoped.** They appear only on `/start`, the client portal,
and system surfaces (capacity gate, order state, form validation). They never appear on a
marketing page. Marketing pages are ink, paper, and photography.

#### Measured contrast — the rules these numbers force

Computed WCAG 2.1 ratios, sRGB, from the OKLCH values above.

On `--paper` (`#F6F5F2`):

| Foreground | Ratio | Verdict |
|---|---|---|
| `--ink-900` | **17.80** | Body, headings, ticks — pass |
| `--ink-700` | **11.63** | Body, secondary — pass |
| `--ink-500` | **6.82** | Muted body, placeholders, captions — pass |
| `--ink-300` | **2.27** | **Not a text colour.** Hairlines and disabled only |
| `--ink-100` | **1.28** | Hairlines only |
| `--signal` | **4.44** | **Fails body by 0.06.** Fills, borders, ≥18px only |
| `--signal-ink` | **6.83** | System text — pass |
| `--warn` | **4.02** | **Fails body.** Fills, borders, ≥18px only |
| `--warn-ink` | **6.44** | Capacity text — pass |

On `--ink-900` (`#0C0D10`):

| Foreground | Ratio | Verdict |
|---|---|---|
| `--paper` | **17.80** | Pass |
| `--ink-100` | **13.96** | Pass |
| `--ink-300` | **7.82** | Muted body on dark — pass |
| `--ink-500` | **2.61** | **Unusable on dark.** Paper-side muted only |
| `--signal` | **4.01** | Large text and fills only |
| `--warn` | **4.43** | Large text and fills only |

Three rules fall out of the table and are not negotiable:

1. **`--signal` / `--warn` never set body text.** The `-ink` variants exist for exactly
   this. `4.44` is a fail, not a rounding error.
2. **`--ink-500` is a paper-side token; `--ink-300` is a dark-side token.** They are not
   interchangeable "muted" values. Swapping them ships a 2.6:1 or a 2.3:1.
3. **Placeholders use `--ink-500`, not `--ink-300`.** Placeholder text is held to the same
   4.5:1 as body — the muted-gray placeholder is the most common AA failure in this
   codebase's category and the one a screenshot never reveals.

Hairlines are exempt from text contrast (`--ink-100` on paper is 1.28:1, `--ink-300` is
2.27:1) but not from the 3:1 non-text requirement where they carry meaning: an input
border, a focus ring, or a selected-state boundary uses `--ink-700` or darker, never
`--ink-100`.

### Elevation — hairlines and paper value, not shadow

`box-shadow` is removed as a depth signal. Depth is expressed by which paper a surface
sits on and whether it carries a 1px hairline.

| Level | Ground | Border | Used for |
|---|---|---|---|
| 0 | `--paper` | none | Page ground |
| 1 raised | `--paper-lift` | `1px solid var(--ink-100)` | Cards, panels, pricing blocks |
| 2 recessed | `--paper-2` | `1px solid var(--ink-100)` | Inputs, wells, code/spec blocks |
| 3 active | `--paper-lift` | `1px solid var(--ink-900)` | Selected card, focused field, current step |
| 4 floating | `--paper-lift` | `1px solid var(--ink-900)` | Modals, sticky nav, toasts, dropdowns |

Level 4 is the **sole** shadow exception, and it is an offset shadow with zero blur and
zero spread — a hard displaced rectangle, not a glow:

```css
box-shadow: 6px 6px 0 0 oklch(0.16 0.006 265 / 0.10);
```

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
eyeballed. One warm inflection at 62% on the paper hue, which is what stops it reading as
cold steel and ties it to the page ground.

```css
--chrome: linear-gradient(
  105deg,
  oklch(0.72 0.004 265)   0%,    /* #A3A4A7 */
  oklch(0.88 0.006 265)   9%,    /* #D5D7DB */
  oklch(0.58 0.008 265)  17%,    /* #787A7F */
  oklch(0.94 0.003 250)  26%,    /* #EAEBED */
  oklch(0.66 0.010 265)  35%,    /* #8F9299 */
  oklch(0.41 0.006 265)  44%,    /* #494A4E */
  oklch(0.83 0.005 250)  53%,    /* #C5C8CA */
  oklch(0.97 0.002  85)  62%,    /* #F6F5F4  — the warm glint */
  oklch(0.52 0.009 265)  71%,    /* #66696E */
  oklch(0.76 0.004 265)  80%,    /* #B0B1B4 */
  oklch(0.35 0.007 265)  89%,    /* #393A3E */
  oklch(0.61 0.012 265) 100%     /* #80838B */
);

--chrome-filter: contrast(1.18) saturate(0.75);
```

The filter is part of the material, not an afterthought: `contrast` sharpens the
reversals into visible bands, `saturate(0.75)` pulls the residual chroma back so the
metal never tints. Applied to the chrome surface, never to its children.

### Exactly two surfaces

1. **The hero field** — a WebGL plane behind the homepage hero (EN `/` and NL `/nl`),
   with real fresnel: reflectance rising toward grazing angles, not a scrolling gradient
   texture. Hard rectangular bounds, no feathered edge, no vignette bleed into the page.
2. **The logotype** — the VISUAILS wordmark, chrome-filled.

That is the complete list. Chrome is forbidden on: buttons, links, borders, dividers,
icons, card grounds, section grounds, badges, form controls, the nav bar, the footer,
headings, and **any text other than the logotype** (`background-clip: text` on body or
heading copy is a hard ban regardless of the fill).

A third chrome surface is not an extension of the signature; it is the point at which the
signature stops being one.

### Blocking dependency — the wordmark is a raster file

`public/img/logo-wordmark-light.webp` is a flat single-ink WebP. It passes the
single-ink test the brief requires, but **a raster cannot take a gradient fill**, so
chrome surface #2 cannot ship until the wordmark exists as SVG paths or as live text with
the correct optical corrections. Outline the letterforms to paths, inline the SVG in
`Layout.astro` (header and footer both), and fill with the chrome gradient via a
`<linearGradient>` — not via CSS `background-clip`, which will not survive the
single-ink fallback.

Fallback order for the logotype: SVG gradient fill → flat `--ink-900` (light grounds) /
`--paper` (dark grounds). Both must be legible; if the flat version is not, the chrome
version is decoration propping up a weak mark.

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
- **Gradients on UI.** Buttons, cards, grounds, bars. The chrome field and logotype only.
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
- **A third chrome surface.**

---

## Build order

1. Hard edges sitewide — `--radius: 0`, strip 52 + 154 radius declarations, square native
   controls, square focus rings, hairline elevation, own square WhatsApp launcher.
2. Monochrome — the OKLCH ramp above replaces the violet system; `--success` deleted;
   `--signal` / `--warn` scoped to `/start`, portal and system surfaces.
3. Chrome — hero field and logotype, gated on the SVG wordmark conversion.
4. Copy, pricing, nav, `/ai-act`.
5. Order pipeline — `/start`, portal, capacity gate.
6. Motion, last.

Verification after each of 1–3: EN/NL parity by class count, tag balance, CSS class
existence, link validation, zero remaining `border-radius`, computed contrast for every
shipped token pair, and a headless render confirming no section ships blank.
