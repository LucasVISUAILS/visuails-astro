# Design

> **Status, 18 augustus 2026: de kleurentabel hieronder was nog die van sectie 18
> en beschreef een accent dat de site niet meer draagt.** Bijgewerkt. Lees deze
> noot voordat je iets hieronder leest.
>
> Dit bestand heeft nu vier paletten beschreven, en drie keer bleef de vorige
> als tabel staan. Dat is precies hoe iemand een waarde overneemt die nergens
> meer bestaat: `#90BEFF` stond hier nog op vier plekken terwijl `global.css`
> al sinds augustus `#C6F100` draagt. De regel die daaruit volgt en die
> hieronder wordt toegepast: **een vervangen palet wordt uit dit bestand
> VERWIJDERD, niet doorgestreept.**
>
> This file has now described three palettes. Sections 1–14 shipped an OKLCH ink/paper
> system; section 15 replaced it with **VISUAILS harbor** (warm ink, cool paper,
> espresso, teal and clay); section 18 replaced *that*, on Lucas's instruction, with a
> **cool near-black scheme modelled on onlinepaymentplatform.com** — and reversed the
> hard-edge rule at the same time, so the "Radius — zero, one token, no exceptions"
> section below is wrong twice over: there is a scale now, and it is not zero.
>
> The authoritative palette is the `:root` block in `src/styles/global.css`. The
> summary immediately below is section 18's; the harbor table that used to sit here is
> gone rather than kept for reference, because a superseded palette in a design file is
> a palette somebody will copy a value out of.
>
> Everything else in this file — elevation, focus, the chrome fence, motion, layout,
> z-index, accessibility, and the rejection list — still holds, with two amendments
> recorded in "Section 18 amendments" below.

---

## The shipped palette (section 18)

Cool near-black as the base surface, white ink in four alpha steps, one light-blue
accent that works as text *and* as a fill, and two decorative gradients that are
allowed on panels and never under body copy.

| Token | Value | Role | Measured |
|---|---|---|---|
| `--bg-0` | `#030406` | The page ground | one step down, 27 aug 2026 — see the note below the table |
| `--bg-raise` | `#0A0C10` | Raised band, recessed panel | — |
| `--surface` | `#101318` | A card off the ground | — |
| `--surface-2` | `#171A20` | The step above that | — |
| `--ink-1` | `#FFFFFF` | Headings and primary text | 16.75:1 on `--surface` |
| `--ink-2` | white 80% | Body / secondary | 10.94:1 |
| `--ink-3` | white 66% | Muted, captions | 7.53:1 |
| `--ink-4` | white 52% | Faint | 4.62:1 |
| `--line` | white 12% | Hairline | — |
| `--line-strong` | white 22% | Rule, control border — **never text** | — |
| `--accent` | `#C6F100` | Primary fill, links, the accent word | 15.16:1 both directions |
| `--accent-ink` | `#08090B` | What sits ON an accent fill (was equal to `--bg-0`; since 27 aug 2026 it is not, and that is correct — this is ink, not ground) | white on the accent is 1.31:1 and is never correct |
| `--accent-dim` | `#ABD200` | Hover / pressed | — |
| `--scrim` | `8 9 11` (channels) | Every veil over a photograph | see below |

**De grondtrap ging één stap omlaag, 27 augustus 2026.** Lucas: *"Ik wil de
achtergrond kleur van de website denk ik een stuk donkerder hebben. Pas dit niet
alleen aan op de website maar ook in het kleurenschema."* Vandaar hier en niet
met een overschrijving op één pagina.

De ONDERLINGE afstanden zijn bewaakt: er zat 8, 7 en 8 punten tussen de vier
treden en dat is nu 7, 6 en 7. De trap is wat een paneel van de grond
onderscheidt; alleen naar beneden schuiven zonder die afstanden te bewaken maakt
van vier treden één vlak. De grond zakt het hardst (5 punten), de bovenste trede
het minst (8), zodat het zichtbare verschil tussen een tegel en de pagina eerder
groter dan kleiner wordt. De 'whisper of blue' uit sectie 18 blijft: elke trede
houdt 3 tot 9 punten meer blauw dan rood.

Voor lichte tekst kan dit alleen gunstig zijn — elke verhouding die in
Layout.astro tegen deze waarden is gemeten wordt ruimer, niet krapper. Wat wél
opnieuw gemeten moet worden is het moment dat er iets DONKERS op een van deze
treden komt te staan; dat geval bestaat op dit moment niet.

Two things about this table are counter-intuitive and are the reason it is written down:

**The accent carries near-black, not white.** `#C6F100` is a lime. The instinct is
white text on it; white is 1.31:1. Everything set on an accent fill takes `--accent-ink`.

*(Tot 18 augustus 2026 stond hier `#90BEFF` met 1.91:1 — het lichtblauw van
sectie 18. De eigenschap die de regel draagt is dezelfde en zeldzaam: één waarde
die zowel als tekst op de grond als als vlak onder bijna-zwarte tekst werkt.
Lucas, over de aanleiding: "ik wil denk ik af van de pastelkleuren die nu veel
gebruikt worden en een wat serieuzere kleurenschema kiezen".)*

**So do the gradients.** Every stop of both gradients is more legible under near-black
than under white, by a factor of two. `.panel-grad` in `global.css` is a scope that
restates the entire ink ramp, the line values, the accent and all six button tokens for
exactly this reason — a gradient panel is not a background change, it is an inversion,
and doing it by hand produces white body copy at 2.28:1 every time.

**`--scrim` is channels, not a colour.** A gradient stop cannot take a colour token and
apply its own alpha to it, so scrims read `rgb(var(--scrim) / 0.62)`. Before section 18
the same espresso was hand-written in two notations — `oklch(0.16 0.006 75 / a)` and
`rgb(25 21 16 / a)` — in forty places that did not know they were the same colour.

### The three names that changed ROLE, not value

A palette swap that only changes values is a find-and-replace. Three names in this
codebase were doing two jobs each, and the second job is invisible until it breaks:

- **`--ink-900`** was the darkest ink *and*, by coincidence of value, the token every
  dark section used as its **ground** — `.on-ink`, the hero scrims, `.cta-band`,
  `.convbar`, `::selection`. Aliased to white (the obvious reading of the name) it turned
  the footer, the conversion bar and three hero scrims white in one line. It is the
  ground. It resolves to `--bg-0`.
- **`--paper`** was the light ground *and* the "light ink on a dark scrim" value, used as
  `color: var(--paper)` on five badge and caption rules. Those now read
  `--paper-on-dark`.
- **`::selection`** inverted ink and paper, and needed a second rule for the dark scope.
  On a near-black-everywhere palette that inversion collapses — both values are
  near-black. Selection is the accent now, and there is one rule.

### Radius — a three-step scale, and one place it is written

Section 18 reversed the hard-edge rule on Lucas's instruction ("voeg ronde hoeken toe").
The section below titled "Radius — zero, one token, no exceptions" describes the retired
rule and is kept only because the *reasoning* in it is still the reason the scale is
small.

```css
--r-lg: 16px;   /* cards, panels, tiles      */
--r-md: 8px;    /* buttons, fields, pills    */
--r-sm: 4px;    /* the small stuff inside    */
--radius: var(--r-md);   /* legacy alias */
```

Three steps and no pill: a fully round control beside an 8px input is the undecided look.

**There is no blanket reset.** `*, *::before, *::after { border-radius: … }` is how a
radius ends up on a table cell and a horizontal rule; radius is applied per primitive.
And there is exactly one place the scale is written — a second `--radius: 0` sitting
below the alias in the same `:root` silently squared the entire site while the scale
above it looked correct in the file.

### Section 19 — one ground, and colour as emphasis

Two instructions: *"ik wil dat de achtergrond van de website 1 kleur wordt"* and *"de
tegels … vellere kleuren"*, again pointing at onlinepaymentplatform.com.

**One ground.** The page was `--bg-0` for most of it, `--bg-raise` for a banded section,
`#000` for the footer, plus four mist tints. Each step was small enough to read as a seam
rather than a decision. Every full-width ground is `--bg-0` now; `.on-paper`,
`.well-deep`, `.well-raise` and the four `.mist-*` classes are declared together as
no-ops in one block. **If a section needs distinguishing, the answer is a tile, a panel, a
rule or more space — not a second ground.**

**De vier felle vlakken — HERZIEN, augustus 2026.**

Ze waren blauw, violet, roze en koraal, en dat was het probleem: vier
gelijkwaardige kleuren die niets onderscheidden omdat ze allemaal even hard
riepen. HERONTWERP.md §2.2 telde het na op de gebouwde site — twee ervan
renderden als hetzelfde groen en twee als hetzelfde grijs, want de tokens waren
al herbenoemd zonder dat deze tabel meeging.

De namen zijn gebleven (er hangen tientallen regels aan) en de waarden niet:

| Token | Waarde | Rol |
|---|---|---|
| `--fill-blue` | `var(--accent)` | het ene vlak in een raster dat gelezen moet worden |
| `--fill-violet` | `var(--accent-dim)` | de tweede stap, als er echt twee nodig zijn |
| `--fill-pink` | wit 66% | een derde onderscheid, zonder tweede kleur |
| `--fill-coral` | wit 40% | de zwakste; ook de waarschuwingsstreep in lijsten |

Dat volgt het ontwerpprincipe dat PRODUCT.md sinds augustus draagt: *"Colour
marks the point; the photograph still carries it."* Eén vlak per raster krijgt
kleur, de rest onderscheidt zich met wittinten — want kleur op alles is kleur op
niets, en dan concurreert de fotografie met het meubilair.

*(De contrasttabel hieronder hoorde bij de oude vier waarden en staat er nog als
verantwoording van de meetmethode. De GETALLEN gelden niet meer.)*

The gradient stops themselves (`#5B7CFA` at 5.41, `#9A6BF5` at 5.50) **cannot carry body
copy**: near-black at the muted step lands at 3.57 and 3.62 against a 4.5 floor. A tile
has a paragraph in it, not just a headline, so the fills were lifted in OKLCH with hue and
chroma held until the third ink step cleared. A fill needs roughly **8:1 against
near-black** before a full three-step ramp holds on it — that is the number to reuse.

**`.on-bright` is the inversion, worn by both devices.** `.panel-grad` used to own the
whole ink/line/accent/button restatement privately. The coloured tiles need exactly the
same, so it is a scope now and both wear it; each `.tile-c-*` class does nothing but name
a colour, which is the test of whether the factoring was right.

**Specificity, twice, and both were real bugs caught in the browser.** `.tile.tile-c-blue`
is doubled because `.tile { background: var(--surface) }` sits lower in the file and wins
on source order — a coloured tile rendered dark with near-black text on it. `.w-blue.w-blue`
is doubled because `.hv-stat dt` is a descendant selector and outranks a single class.
And the stat-row override still had to move **into HomeV2's own scoped block**, because
Astro compiles component styles with a `[data-astro-cid]` attribute: a scoped rule always
outranks a global utility, however many times you double it. The override has to live in
the scope that caused the conflict.

**The fence:** at most two coloured tiles per grid, never two of the same hue, and never
behind a photograph.

### Section 19 — cookie consent

`src/components/CookieConsent.astro` + `src/scripts/consent.js`. Built to the Dutch AP's
stated requirements, each one structural rather than remembered:

- **Reject as prominent as accept** — one shared `.cc-btn` class, so they cannot diverge;
  reject is first in the DOM and in the tab order. Asserted in the test from the *computed*
  height, weight, size, radius and background of both buttons.
- **Nothing pre-ticked** — the analytics box is off, and off is also what "no answer yet"
  means.
- **No cookies before consent** — the analytics beacon is no longer rendered in
  `Layout.astro` at all; `consent.js` appends it after a yes. Verified with a real token:
  0 requests before an answer, 0 after a refusal, 1 after a yes.
- **No cookie wall** — a bottom bar, not a modal. The page scrolls and works identically
  whether it is answered or ignored. Asserted by scrolling with the bar up.
- **Withdrawal as easy as consent** — a "Cookie preferences" control in the footer of
  every page and inside the cookie policy, showing the current answer rather than a blank
  form.
- Consent is **versioned and expires at 12 months**; bumping `CONSENT_VERSION` invalidates
  every stored answer, because a yes to one question is not a yes to a different one.

**Switching analytics on is a build setting, not a code edit.** Set
`PUBLIC_CF_ANALYTICS_TOKEN` in the Pages project as a **plaintext Variable** (not a
Secret — a Cloudflare Web Analytics token is public by design and ends up in the page
source of every site that uses it) and redeploy. It used to be a literal in
`Layout.astro`, which meant a deployment-owned value lived inside the thing being
deployed. Verified with the variable set: 0 beacon requests before an answer, 0 after a
refusal, 1 after a yes; and a build without the variable carries no token at all.

The old comment on that line claimed cookieless analytics "needs no consent banner".
Cookieless means no cookie-storage consent under ePrivacy, which is not the same as no
consent at all — and the safe side of that argument costs one banner that was going to
exist anyway.

The site sets three cookies and `/cookie-policy` now names all three rather than
describing categories. Worth stating plainly: **none of this was legally required today** —
the only cookies are strictly necessary. It was built because the policy already promised
it, and because the analytics switch needs a lawful gate the day it is turned on.

### Section 18 amendments to the rest of this document

- **The chrome fence still stands**, but the ramp moved hue: harbor ran it warm (75) with
  one cool inflection; it runs cool (255) with one warm inflection now. The rule is that
  the ramp runs on the ink hue with a single opposing reflection — not the numbers.
- **The chrome scrim was on the wrong layer.** `.ch-promise`'s directional scrim was the
  first background layer of `.hero-fallback`, i.e. *under* the canvas. Every visitor
  whose browser ran the shader saw the copy on raw metal. The scrim is its own layer
  above both paths now (`.ch-promise::before`).
- **The two brand marks are never placed together.** The V glyph and the logotype are
  alternative signatures, not a lockup. Enforced as a build failure —
  `scripts/brand-lockup-guard.mjs` fails `astro build` if a wordmark and a glyph share
  any ancestor below `<body>`.

---

## Harbor — the retired palette (section 15, superseded by section 18)

The value table that sat here is deleted. A superseded palette in a design file is a
palette somebody copies a value out of, and this file has now carried two of them.
Harbor's values are in git history and in `REPORT-SECTION-15.md`; the section-18 table
above is the live one.

What survives harbor, because it is about *method* rather than about warm ink:

1. **A faint value is not a text colour.** Harbor's `--ink-300` was 2.31:1; the current
   `--line-strong` is white at 22%. Both are rules. Captions and microcopy resolve to
   the muted step, and `--ink-faint` is aliased to it for exactly this reason.
2. **An accent does not set body text until it has been measured setting body text.**
   Harbor needed a separate `-text` cut for both accents; `#C6F100` does not, and that
   is a property of the value, not a licence.
3. **A muted value is measured on the DARKEST ground it lands on.** Harbor's `.62`
   cleared 4.5:1 on paper and failed at 4.36 on the mist tints, which is where half the
   muted text sat. That is how `.62` became `.64`, and it is why section 18's ramp was
   measured on `--surface` rather than on `--bg-0`.
4. **Colour is never the sole carrier of state.** Every capacity, validation and order
   status carries a word as well as a fill.
5. **The sticky nav over a hero has ONE ink tier, not three.** Measured against rendered
   pixels the second tier ran 1.62–4.09:1. A 76px bar standing on a photograph whose
   exposure the studio does not control has room for one legible value; hierarchy comes
   from weight and position. This is the one place the ramp is deliberately flattened,
   and it is invisible to a token-walking contrast audit by construction — which is why
   there is a pixel-sampling audit as well.

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

### Colour — ink and paper, OKLCH ~ **INGETROKKEN, 18 augustus 2026**

> **Alles in deze paragraaf beschrijft het EERSTE palet (secties 1–14) en geen
> enkel token hieronder bestaat nog.** `--ink-500`, `--paper`, `--paper-lift`,
> `--signal`, `--warn`: de namen leven deels voort met heel andere waarden, de
> hexcodes in de tabellen hieronder komen in `global.css` niet meer voor.
>
> Het stond hier nog omdat de statusnoot bovenaan dit bestand alleen de HARBOR-tabel
> heeft opgeruimd en deze oudere over het hoofd zag. Gevonden op 18 augustus door
> `tests/promises.test.mjs`, die elke hexwaarde in dit bestand tegen `global.css`
> houdt — twaalf spookkleuren, waarvan `--ink-500` en `--paper` de gevaarlijkste
> zijn omdat die namen nog bestaan en dus geloofwaardig lezen.
>
> **Het geldende palet staat in "The shipped palette" bovenaan dit bestand, en de
> waarheid staat in het `:root`-blok van `src/styles/global.css`.** Wat hieronder
> volgt blijft staan als verantwoording van de contrastmethode — de manier waarop
> hier gemeten wordt, geldt nog steeds — maar geen enkele WAARDE eruit mag worden
> overgenomen.

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

#### Changing the palette — the places a colour is hand-carried

Editing `:root` in `global.css` does **not** change the palette. A dozen colours live
outside it, in languages that cannot read a custom property, and each one silently keeps
the old value until somebody moves it by hand. This list is the checklist; work it top to
bottom and nothing is left behind.

Section 18 proved why it exists and where it was incomplete: `theme-color` was still the
retired paper value two builds after the ground turned near-black, painting a near-white
address bar above a near-black page on Android Chrome, and nothing in the tree could see
it. The rows added since are marked.

| Where | What | Why it cannot be a `var()` |
|---|---|---|
| `global.css` `.on-ink` | four longhand paper values with alpha | a custom property cannot carry an alpha; `color-mix` is used nowhere in this codebase |
| `global.css` `--select-caret` ×2 | two URL-encoded SVG strokes | a `data:` URI is an opaque string to CSS |
| `global.css` chrome ramp | twelve gradient stops | fenced separately — see the chrome section |
| `global.css` `.vis` placeholder | two ramp stops | inside a gradient, same as above |
| `global.css` `--scrim` **(new, §18)** | three channel numbers | a gradient stop cannot take a token AND apply its own alpha, so what is tokenised is the channels — every scrim reads `rgb(var(--scrim) / a)` and follows this one row |
| `global.css` `.panel-grad` **(new, §18)** | ~14 longhand `rgb(8 9 11 / a)` values | same alpha problem, inverted: the panel's ink is near-black on a bright ground |
| `global.css` `--grad-1` / `--grad-2` **(new, §18)** | six gradient stops | inside a gradient |
| `Layout.astro` `<meta name="theme-color">` | one hex | an HTML attribute, not CSS at all |
| `Layout.astro` `.foot-glow` **(new, §18)** | two radial stops | inside a gradient |
| `Layout.astro` SVG sprite | six greys — three `gObj` stops, two `gGlass` stops, one flat fill | SVG presentation attributes in markup, not styled elements |
| `shader-hero.js` | one `vec3` | GLSL has no access to the document |
| `functions/api/order.js` | three mail hexes | mail clients strip `<style>` and cannot resolve properties |
| `scripts/make-favicons.mjs` **(new, §18)** | `GROUND` and `INK` | a build script, not a stylesheet — but it emits SEVEN files (`favicon.ico`, `favicon.svg`, four PNGs, `apple-touch-icon.png`), so this one row covers all seven **and re-running `npm run favicons` is the whole update** |
| `public/portal.css` · `account.css` · `admin.css` | the whole token block, ×3 | served by Workers that cannot import a hashed stylesheet |

Three rows are worth reading twice.

**`--select-caret` says "×2" rather than naming a second token, because there is no second
token.** `global.css` declares `--select-caret` **twice under the same name**, once in
`:root` and once in `.on-ink`, so the caret flips with the ground by scope rather than by
a second variable. (Both currently carry the same white stroke, because every ground is
dark — the second declaration is not redundant, it is the thing that stops being redundant
the moment a light ground returns.) An earlier draft of this table invented a
`--select-caret-ink` to sit beside it. It never existed. A checklist that names a token
that is not there sends the next reader looking for a declaration to update, finds
nothing, and teaches them the checklist is unreliable — which is worse than the omission
it was trying to fix.

**The favicon row replaced a raster row.** It used to read `public/img/logo-mark.webp` —
"a raster; regenerate, never hand-edit" — and the honest problem with that instruction is
that it did not say *how*. The mark is an inline `<symbol>` now, and the icons are
generated from that same symbol by `npm run favicons`, so the mark in the header and the
mark in the tab are the same path by construction rather than by somebody remembering to
re-export both.

**`theme-color` and the sprite are the two rows nothing else can catch.** `verify2` §6
allowlists the `theme-color` attribute by name, so the literal is legal there and no other
tool reads it; this row is its only guard, and §18 is the proof that a row alone is not
enough — it was on the list and it still went stale. The sprite is guarded, but only
because it was missed once: its six greys were re-cut onto the ink ramp at one hue, then
sat unchanged through a rotation while the comment above them went on claiming they shared
the interface ramp. `verify2` §6 now allowlists the flat fill **by value and in both
directions** — the sweep goes red if the sprite carries a grey the allowlist does not name,
and a companion check goes red if the allowlist names a grey the sprite does not carry —
so neither half can be updated alone. The five gradient stops are still on this row's
honour system, because `stop-color` is allowlisted wholesale.

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

**1. Move from eight static cuts to one variable file. — DONE, section 15.**
`@fontsource-variable/archivo/wght.css` replaced the eight imports, and the latin
roman is preloaded. `/catalog`'s LCP was 3372ms waiting on fonts and is now 2068ms.
The `wdth` axis was not taken: nothing in the system varies width. `@fontsource/archivo` currently
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

**The hero field** — and as of section 15 it is *actually* the hero. It had been
mounted on `.ch-promise` ("No wall of reviews yet"), not on the hero at all. It is
now the hero's ground, with the photograph as a hard-edged plate inset from the
left so the field reads as a column running the full height. It carries no scrim,
because the first version — chrome as the whole ground, photo over its right 62% —
needed a 0.94 ink scrim for the headline and a 0.94 scrim is opaque: the signature
was invisible in the one place §8 puts it. A WebGL plane behind the homepage hero
(EN `/` and NL `/nl`), with
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

Task #272 tried giving this one flat value a colour — harbor teal, on Lucas's own request
after the harbor style guide — and shipped it briefly (`--brand` carrying `oklch(0.499
0.054 214.5)`, `.brand-word`/`.brand-mark` reading it). Reverted the same day, 2026-07-30:
seeing it live alongside the rest of a fuller colour pass, the preference was for the
logotype to stay neutral — white on dark, ink on light — while colour does its work
elsewhere on the page. `--brand` is back to aliasing `--ink-900`, unread, exactly as it
was before task #272 and available again for whatever the next deliberate exception turns
out to be.

One correction survived the revert on purpose rather than being rolled back with it:
`public/favicon.ico` and `favicon-32/48/192/512.png` were still the *original*
cyan-to-periwinkle gradient when task #272 started — a gap the monochrome pass never
closed, unrelated to whether the logotype is flat ink or flat teal. Reverting the colour
literally (`git revert`) would have put that stale gradient back. It didn't: the favicon
set was regenerated a second time, flat `#0F0D0A` (`--ink-900`) from the same SVG path
data, so the found-and-fixed inconsistency stays fixed independent of which colour
decision is currently live.

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

## Disclosure — when a block folds

*(Added August 2026. Lucas: "het wordt namelijk best druk om naar te kijken …
bedenk manieren om dit tegen te gaan maar alsnog dezelfde info en stappen
behouden." Measured before deciding anything: the homepage carried 2,435 words
across 24 sections, step 1 of the order flow 1,212, `/ai-act` 1,567 with nothing
folded — against a median of 346 words across 41 pages. Three places, not a
sitewide disease, and the fix is disclosure rather than deletion.)*

`src/components/Disclose.astro` is the only disclosure on this site. It replaced
five near-identical ones — `.faq-item` on /catalog, `.acc-item` on /faq,
`.hv-notfor` / `.hv-vat` / `.hv-faq-item` on the homepage, `.pl-why` in the
order form — which between them were five places to fix one focus ring.

**The rule.** Fold a block when it answers a question only SOME readers have.
Keep it open when every reader needs it to decide.

**The hard line under it.** Nothing on the belief ladder ever folds. PRODUCT.md
names four rungs — it is not an AI toy, it holds up across a collection, it
costs less and lands sooner, finding out costs €1 — and those are exactly
what a sceptical visitor arrived to test. Folding one to win quiet trades the
argument for the aesthetic, which is the one trade this site cannot make.

**Consequences of that rule, applied:**

- Reference and legal prose folds. `/ai-act` keeps its message open (what the
  rules are aimed at, what you get, why the image has to be right) and folds
  what is looked up rather than read: what to do when publishing, what we do not
  claim, who is responsible, where we are.
- Optional form answers fold, and fold to their own ANSWER rather than to a
  label. Step 1's channel, background and model pickers each collapse to one
  line stating what is currently selected, so nothing is hidden — only the
  controls are. `Disclose`'s `liveAttr` prop renders that line; pipeline.js
  writes it.
- One open at a time uses the native exclusive accordion (`name` on `<details>`),
  not script. Browsers without it open independently, which is the old behaviour.
- Secondary detail INSIDE a section folds; a section that is its own argument
  does not. On the homepage that means the price ladder's rung table, the
  portal's three-way explainer and the launch-date arithmetic fold, while the
  sections making the case stay open.

**Never** fold a price, a delivery promise, or a constraint that changes what
somebody would order. A number nobody sees is a number nobody was told.

## A control shows what it chooses

*(Added August 2026. Lucas, on the customer dashboard's brand kit: "ik wil dat de
brand kit veel mooier wordt om in te stellen, dus echt foto's toevoegen bij
modellen, het voelt allemaal zo zielloos nu.")*

The word was "zielloos", but the defect under it is not decoration. That page
asked a brand to choose the face of their product line from a `<select>` holding
ten first names, and the ground their product sits on from four colour names
with their hex codes. Nobody can pick a model from a name — what is being decided
*is* what someone looks like. A dropdown reading `Off-white · #F7F5F1` is a
colour the reader has to imagine, on a site whose entire promise is not having to
imagine.

So: **when a choice is visual, the control is the thing it chooses.** A face is a
portrait. A colour is that colour. A format is its own proportion. The name goes
underneath as the label, not in place of the thing.

What that costs, and how it is paid:

- **Weight.** Thirteen portraits per service, three services, is thirty-nine
  images on one page. The exclusive accordion (`name` on `<details>`) means one
  service's grid is on screen at a time, `loading="lazy"` keeps the rest off the
  wire, and the roster grid reads its 800px derivatives, never the 1195px
  originals — see `src/data/models.js` on why both sizes exist.
- **Layout stability.** Every tile carries `width`/`height` attributes so the box
  is reserved before the bytes land. That means the CSS must also say
  `height: auto`, because an element with both a width and a height specified
  ignores `aspect-ratio` outright — measured in Chromium, the tiles rendered
  118×535 instead of 118×157 until it was added.
- **State that is not only colour.** A checked tile gets a frame *and* a tick.
  On a grid of photographs a coloured border alone reads as a hover, and colour
  as the sole carrier of state is out under the token rules regardless.
- **A real "no preference".** Not an absent tile — a tile, drawn as a dashed
  frame or a hatched swatch, saying so in words. "Ask me per order" is an
  answer, and an answer needs somewhere to be clicked.

The picker still posts plain radio inputs in a plain `<form>`: no script anywhere
on the dashboard, which is what keeps its CSP at `default-src 'none'`. Making a
control look like its own subject is a rendering decision, not a reason to reach
for JavaScript.

## What this system rejects

- ~~**Rounded corners.** Any radius above 0, anywhere.~~ **Retired.** This was the
  first system's rule and it has been false in the code since the three-step scale
  landed; leaving it here as a live prohibition meant the document forbade what
  every stylesheet already did. The scale is **24 / 14 / 8** (`--r-lg` / `--r-md` /
  `--r-sm`), raised from 16 / 8 / 4 in August 2026 at Lucas's direction after
  seeing four options rendered side by side. What survives of the original rule is
  the part that was always the real point: **no pill**, and **one scale**. A fully
  round control beside a 14px input is the undecided look, and a hardcoded px
  radius anywhere is a fourth step nobody decided on — every corner on this site
  reads a token, verified by grep.
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
