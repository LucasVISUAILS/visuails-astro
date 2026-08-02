# Section 18 — the OPP palette, rounded corners, and the two logos

Two instructions drive this section, and the second one arrived while the first
was half-finished:

> *"trek gelijk en voeg ronde hoeken toe aan de website, en maak de vibe en look
> meer als www.onlinepaymentplatform.com. Ook klopt het kleurenschema niet, pas
> dit aan."*

> *"Voeg deze logo's toe maar nooit samen naast elkaar zetten. Pas de kleuren aan
> naar het kleurenschema van de website."*

Both reverse a rule that was previously fenced. Section 15 froze the colour
scheme and section 1 banned rounded corners outright — `DESIGN.md` argued the
hard edge at some length. Both are now gone by instruction, and the file says so
rather than quietly disagreeing with the tree.

---

## 1 · The palette

Measured off the live onlinepaymentplatform.com rather than guessed from the
screenshots: their grounds are `rgb(0,0,0)` / `rgb(8,8,8)` / `rgb(23,23,23)` and
their accent is `rgb(144,190,255)`. What shipped here is that structure with a
VISUAILS-specific four-step ink ramp and two gradients.

| Token | Value | Role | Measured |
|---|---|---|---|
| `--bg-0` | `#08090B` | page ground | — |
| `--bg-raise` | `#101216` | raised band | — |
| `--surface` | `#17191E` | card off the ground | — |
| `--surface-2` | `#1F2229` | the step above | — |
| `--ink-1` | `#FFFFFF` | headings, primary | 16.75:1 on `--surface` |
| `--ink-2` | white 80% | body | 10.94:1 |
| `--ink-3` | white 66% | muted | 7.53:1 |
| `--ink-4` | white 52% | faint | 4.62:1 |
| `--accent` | `#90BEFF` | fill, links, accent word | **10.43:1 in both directions** |
| `--grad-1` | `#5B7CFA → #9A6BF5 → #E86BB0` | panel ground | stops 5.41–8.75:1 vs near-black |
| `--grad-2` | `#9A6BF5 → #E86BB0 → #F2955C` | panel ground | as above |

The ink ramp is measured on `--surface`, the **lightest** ground any of it lands
on, not on `--bg-0` — same rule that turned harbor's `.62` into `.64`, applied
before it could bite.

**Two things in that table are counter-intuitive, and both are now enforced by
scopes rather than by discipline.**

`#90BEFF` carries **near-black**, not white. White on it is 1.91:1. This is the
one that actually shipped broken for a build: the `.on-ink` token scope still
said `--accent-on: var(--paper-on-dark)` from harbor, when the accent was a dark
teal and a paper label was correct. `.convbar` opts into that scope by name, so
the conversion bar's CTA measured **1.91:1 on all 68 pages** in the first audit
pass. `--accent-on` now resolves to `--accent-ink` in every scope with no
override anywhere.

The gradients carry near-black too, by a factor of two on every stop. A gradient
panel is not a background change, it is an **inversion of the whole ramp** — so
`.panel-grad` is a scope that restates the ink ramp, the three line values, the
accent and all six button tokens. Setting `--grad-1` on a section by hand
produces white body copy at 2.28:1 every time, which is why the primitive exists
instead of the declaration.

### The three names that changed role, not value

A palette swap that only changes values is a find-and-replace. Three names here
were doing two jobs each, and the second job is invisible until it breaks.

**`--ink-900` was never an ink.** It was the darkest step of harbor's ramp *and*,
because the two happened to be the same colour, the token every dark surface used
as its **ground**: `.on-ink`, `.cta-band`, `.convbar`, `::selection`, the three
hero scrims, and `--bg`/`--bg-deep` inside the dark scope. Aliased to `--ink-1`
— the obvious reading of the name — it turned the footer, the conversion bar and
three hero grounds **white**, in one line. It resolves to `--bg-0`.

**`--paper` was doing the same trick backwards.** It was the light ground *and*
the "light ink on a dark scrim" value, used as `color: var(--paper)` on five
badge and caption rules that sit over photographs. Those are `--paper-on-dark`
now.

**`::selection` inverted ink and paper**, with a second rule for the dark scope.
On a near-black-everywhere palette that inversion collapses — both values are
near-black, so the selection was invisible in both scopes. It is the accent now,
and there is one rule instead of two.

### `--scrim`, because a gradient stop cannot take a token

Every veil over a photograph — hero fades, tile caption gradients, badge pills,
the spread reveal — hand-wrote the harbor espresso in **two notations that were
the same colour and did not know it**: `oklch(0.16 0.006 75 / a)` in nineteen
places and `rgb(25 21 16 / a)` in twenty-two. A gradient stop cannot take a
colour token and apply its own alpha, so what is tokenised is the *channels*:
every scrim now reads `rgb(var(--scrim) / a)` and the family moves with the
palette.

### The Worker stylesheets

`portal.css`, `account.css` and `admin.css` are served by Pages Functions and
cannot import the hashed build asset, so each carries a hand-copy of `:root`.
All three were still entirely on harbor — the whole `/o/<token>`, `/account` and
`/admin` experience was a warm paper interface hanging off a near-black site.
Ported in full, with the role/value collision above resolved the same way and
written down in each file.

---

## 2 · Rounded corners

```css
--r-lg: 16px;   /* cards, panels, tiles   */
--r-md: 8px;    /* buttons, fields, pills */
--r-sm: 4px;    /* the small stuff        */
```

Three steps and **no pill**: the instruction was "meer als OPP", not
OPP-to-the-pixel, and a fully round control beside an 8px input is the undecided
look.

Two structural decisions came with it.

**There is no blanket reset.** The old rule was `*, *::before, *::after {
border-radius: 0 }`, and the instinct when reversing it is to change the `0` to a
token. That paints a radius onto table cells, horizontal rules and the grain
overlay. Radius is applied per primitive, in one block per stylesheet.

**There is exactly one place the scale is written**, and finding that out cost a
build: a second `--radius: 0` was still sitting *below* the alias in the same
`:root`, in all four stylesheets. Later declarations win, so the entire site
rendered hard-edged while the scale above it looked correct in the file. That is
the kind of bug that survives a careful read of the diff.

---

## 3 · The two logos

Both PNGs arrived as flat two-colour rasters. A raster cannot survive in this
system for two reasons, and the previous wordmark demonstrated both: a fixed ink
colour goes invisible the first time the palette moves (the old one was `#EEF0F6`
and measured **1.05:1** the day the ground turned pale — invisible in a way no
contrast checker reports, because a checker looks at text and that was an image),
and a raster cannot take a scope-inherited fill at all.

So each was thresholded, **cropped to its ink bounding box**, and traced to a
single path: the V glyph's ink occupied 308,280→945,933 of its source (hence the
`642×658` viewBox), the logotype's 114,270→1759,543 (hence `1650×278`). Cropping
to the ink is what makes `height:` alone a reliable sizing lever — there is no
invisible padding baked in, so `.brand-word { height: 17px }` means seventeen
pixels of letterform.

Neither path carries a `fill` attribute, on purpose. `fill` is an inherited SVG
property, so each `<use>` site sets it from `--brand` and one symbol serves every
ground. Both marks measure white on every surface they appear on, and flip to
`CanvasText` under forced-colours and `#000` in print, unchanged.

### "Nooit samen naast elkaar" is a build failure now

A house rule that lives in a comment gets broken by the next component that needs
"a logo here". So it is checked, on the built HTML, on every page:

> For any wordmark `<use>` and any glyph `<use>` on a page, their nearest common
> ancestor must be `<body>`.

That formulation is the one that catches a lockup without banning the legitimate
arrangement — the sticky header carries the logotype while the conversion bar
carries the glyph, and those two may coexist. Sharing a container, a row or a
component may not. `scripts/brand-lockup-guard.mjs` runs at `astro:build:done`
and throws.

Verified both ways: it passes on all 72 pages as built, and when a wordmark was
deliberately added beside the conversion bar's glyph it failed the build on all
72 with the containing element named.

---

## 4 · Three things found while verifying, none of them cosmetic

**The chrome scrim was on the wrong layer, and had been all along.**
`.ch-promise`'s directional scrim — the gradient that keeps the founder quote off
the raw metal — was the *first background layer of `.hero-fallback`*, which sits
at `z-index: -2` against the canvas's `-1`. It only ever darkened the fallback.
**Every visitor whose browser actually ran the shader saw the headline, the quote
and the byline sitting directly on unscrimmed chrome**, and the three carefully
measured media queries tuning those stops were tuning a plate almost nobody was
looking at. The section read as an oily smear because that is what unscrimmed
chrome under text looks like — the same complaint that got the hero's chrome
column removed in section 16, from the same cause, one surface over.

The scrim is its own layer now (`.ch-promise::before`, canvas at `-2`, fallback
at `-3`), so one declaration governs both paths and the measured stops mean what
they say in both.

**A 1px horizontal scroll on `/nl/custom-models/`, from the grid algorithm.** A
`1fr` track's automatic minimum is min-content, not zero, so one long Dutch
compound in the editorial column made the track wider than the grid containing
it, and the page scrolled sideways by the difference. Fixed with `min-width: 0`
on the grid children. Same class as the `hyphens: auto` rule from section 16 —
Dutch builds compounds by grammar rather than by accident — but a different
mechanism, so it needed a different fix rather than the same one applied harder.

**The pixel-sampling nav audit was measuring antialiasing.** Rewritten, and the
rewrite is in the repo (`pixnav.mjs`) because the reasoning matters more than the
result. Searching an element's box for its worst-contrast pixel always finds a
glyph edge — a pixel halfway between ink and ground — and always reports ~1.2:1.
It now samples a ring strictly *outside* the rect, reports the ring's 10th
percentile rather than its single worst pixel, and excludes three cases that are
false positives by construction: elements that paint their own opaque ground
(the DOM audit owns those), elements with an opaque ancestor, and multi-line
text (whose ring runs through the neighbouring line).

---

## 4b · The favicon (added after the section-18 report was first written)

> *"voeg het witte logo toe aan de website favicon in browser tab"*

The old set was a **black** V on transparent — correct against the paper palette it was
cut for, and after the palette flip it was a black mark in a dark browser tab. Replaced
with the white mark on the `#08090B` ground.

**White on a dark square, not white on transparent**, which is the one decision here worth
stating: a transparent white mark is invisible on Chrome's and Safari's light tab strip,
which is the default most people are looking at. The square is `--bg-0`, so the icon is
the site's own ground rather than a colour picked separately for it.

Seven files, all generated by `npm run favicons` from **the same `<symbol id="markglyph">`
the header reads**, so the tab icon and the mark on the page cannot drift:

| File | Size | Corners |
|---|---|---|
| `favicon.ico` | 16 · 32 · 48 | 3 / 6 / 10px — three real renders, not one image resized three times |
| `favicon.svg` | vector | 12px @64 — the only version that stays crisp at 16px on a scaled display |
| `favicon-32/48/192/512.png` | — | 20% of the edge |
| `apple-touch-icon.png` | 180 | **none** — iOS masks it itself and ignores transparency; a pre-rounded tile gets rounded twice and shows dark slivers in the corners |

The `<link>` order matters and is now deliberate: a browser takes the **last** icon link it
understands, so the `.ico` is first as the floor and the SVG last as the ceiling.

**And one thing found while doing it:** `<meta name="theme-color">` was still `#F3F5F8`,
the retired paper value — a near-white address bar above a near-black page on Android
Chrome, two builds after the ground changed. It is `#08090B` now. It was already on
`DESIGN.md`'s "places a colour is hand-carried" checklist and still went stale, which is
the argument for the checklist rather than against it; that table has been rewritten with
the six rows section 18 added (`--scrim`, `.panel-grad`, the two gradients, `.foot-glow`,
the favicon generator) and with the raster row it no longer has.

---

## 5 · What the verification says

| Check | Result |
|---|---|
| Build | 72 pages, 0 errors |
| Brand lockup guard | holds on 72 pages; fails correctly when violated |
| Contrast, DOM walk, **all 68 routes** EN+NL, 1440px **and** 390px | **0 real failures** (22 entries, all three known false-positive classes — see below) |
| Contrast, pixel-sampled, nav + hero chrome over photographs, 14 routes × 2 scroll states | 173 measured, **0 failures**, tightest **4.98:1** against a 4.5 floor |
| Language switcher chip, measured inside its own box on 14 routes | tightest **12.23:1** |
| Contrast, three Worker stylesheets rendered | 102 nodes, **0 failures**, tightest 6.00:1 |
| Radius, Worker surfaces | card/note/facts 16px · btn/select/input/pill 8px |
| Horizontal overflow at 390px, all 68 routes | **0 pages** |
| Page errors, all 68 routes | **0** |
| LCP, throttled mobile (1.6 Mbps / 150 ms / 4× CPU), shader running | `/` 1604ms · `/catalog` 2176ms · `/pricing` 1508ms · `/portal` 1232ms · `/studio` 1168ms — budget 2500ms |
| CLS | 0.0012 / 0 / 0 / 0 / 0 |

**The 22 contrast entries that are not failures**, checked individually so the
number is honest rather than waved away:

- `.hv-pipe-n` and `.pp-state-n` (16 + 24 across routes) are `color: transparent`
  with `-webkit-text-stroke` — outlined numerals. The audit reads the fill and
  sees nothing. The stroke is white at 66% on near-black: **10.1:1**, at
  1.9–2.4rem and weight 900.
- `.cv-meet-t` (4) is absolutely positioned *outside* the 2px rule that is its
  parent, so the audit's ground walk climbs into that rule and compares white to
  white. It sits on the page ground.

---

## 6 · What did not change, and what is still open

The **capacity gate, the pricing source of truth, and the no-invented-proof rule**
are untouched — no testimonial, client name, logo, metric or delivery date was
added anywhere in this section, and every price still comes from
`src/data/pricing.js`.

**EN/NL parity** holds on every change: both locale trees were edited together and
both were audited at both viewports.

Section 15's backend flags **15g–15n are unchanged** and remain open — no
`closed_at` writer, no `kind='delivery'` writer, no notifications, no Mollie
webhook, `makeRef()` collision risk, uploads not presigned, `/start` not matching
§4. Nothing in this section touched them, and nothing in this section should be
read as having.

**Flag 15c (where the chrome mechanic belongs) is narrowed but not closed.** The
scrim bug above is fixed, so `.ch-promise` now renders as designed rather than as
a smear — but "designed" is still a WebGL plane behind a founder quote on a page
whose look has moved twice since the plane was specified. It survives this section
on the strength of being an explicit upfront decision, not on the strength of
having been re-examined against the OPP direction.

**One thing to look at rather than a bug:** the gradient closing panel is
currently the only place `--grad-1` appears, and `--grad-2` appears nowhere. The
palette carries two gradients because OPP uses two; the fence in `.panel-grad`
says at most one or two per page, and a second one has not yet been placed.
