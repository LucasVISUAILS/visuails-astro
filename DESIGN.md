# Design

> **Stand: 22 september 2026.** `KLEURENSCHEMA.md` in de wortel draagt de
> kleuren; dit bestand draagt de rest van het systeem (elevatie, focus, motion,
> layout, z-index, toegankelijkheid, en de lijst met wat we niet doen). Wijkt
> de code van KLEURENSCHEMA.md af, dan volgt de code dat document.
>
> **De regel van dit bestand, en waarom hij er is.** Er zijn nu zes paletten
> beschreven en vijf keer bleef de vorige als tabel staan — zo houdt iemand een
> waarde over die nergens meer bestaat. `#90BEFF` stond hier ooit op vier
> plekken terwijl de site al `#C6F100` droeg, en op 22 september stond de hele
> gele familie er nog terwijl het accent al twee dagen violet was. Dus: **een
> vervangen palet en een vervangen lettersysteem worden uit dit bestand
> VERWIJDERD, niet doorgestreept.** Die regel is op 22 september op de twee
> ingetrokken paletten én op de typografiesectie toegepast.
>
> Wat historie is, is als historie gemarkeerd: "Twee ingetrokken paletten" en
> "Section 21" staan er om de REDENERING, niet om de waarden.
>
> De radius-paragraaf hieronder ("zero, one token, no exceptions") is sinds
> augustus 2026 onwaar in beide richtingen: er is een schaal, en hij is niet
> nul. Zie `--r-sm` / `--r-md` / `--r-card` / `--r-pill` in `global.css`.

---

## Het palet (sectie 22 — licht en donker, violet) — 20 september 2026

> **20 september 2026.** `KLEURENSCHEMA.md` in de wortel van dit project is
> leidend; wijkt de code daarvan af, dan volgt de code het document. Deze tabel
> is de samenvatting, niet de bron. De gele set van sectie 20 staat hieronder
> als ingetrokken paragraaf — de waarden gelden niet meer, de verantwoording
> blijft leesbaar.

Grond in drie stappen, inkt puur zwart in drie sterktes, en één violet dat
**alleen actie** is: een knop, een link, een focusring. Nooit een groot vlak,
nooit een icoon, nooit tekst die geen actie is.

| Token | Waarde | Rol | Gemeten |
|---|---|---|---|
| `--paper` | `#F2F3F5` | De paginagrond | — |
| `--surface` | `#E4E7EC` | Een kaart van de grond af | — |
| `--sunken` | `#DADEE5` | Een verdiept vlak: invoer, tabelkop | — |
| `--ink` | `#000000` | Koppen en lopende tekst | 19,3:1 op `--paper` |
| `--ink-2` | zwart 66% | Secundair | 8,7:1 op `--paper` |
| `--ink-3` | zwart 56% | Gedempt, bijschriften | 6,5:1 op `--paper` |
| `--line` | zwart 20% | Haarlijn | — |
| `--line-soft` | zwart 10% | De stillere haarlijn | — |
| `--line-strong` | zwart 34% | Regel, randje om een veld — **nooit tekst** | — |
| `--panel` | `#000000` | Het donkere paneel: voet, cta-band, scrim | — |
| `--on-panel` | `#F2F3F5` | Wat op dat paneel staat | 19,3:1 |
| `--accent` | `#4A1FFF` | Vulling van een actie, en verder niets | wit erop 7,16:1 |
| `--on-accent` | `#FFFFFF` | Wat op een accentvlak staat — **nooit zwart**, dat is 2,93:1 en in het schema met zoveel woorden afgekeurd | 7,16:1 |
| `--accent-text` | `#3D17D6` | Het accent als LETTER op papier | 9,0:1 op `--paper` |
| `--accent-tint` | `#E4DFFF` | De lichte werktint: statusvlak, gemarkeerde rij | — |
| `--on-accent-tint` | `#2A0E8F` | Wat op die tint staat | 10,5:1 |
| `--scrim` | `0 0 0` (kanalen) | Elke sluier over een foto | zie hieronder |

**De statusset — vijf standen, vijftien tokens.** Eén component (`.stand` in
`global.css`, handkopie in `admin.css`, `portal.css` en `account.css`, en een
mailversie in `mailTemplate.js`), en één tabel die zegt welke ruwe statuswaarde
bij welke stand hoort: `src/data/status.js`. Het gelukte pad loopt voller
naarmate het vordert, dus het werkt ook in grijswaarden.

| Stand | Vulling | Rand | Letter | Waarvoor |
|---|---|---|---|---|
| `wait` | transparant | `#7C8096` | `#4A4E6B` | binnen, wacht op betaling, concept |
| `work` | `#E4DFFF` | violet 30% | `#3D17D6` | in productie, wordt nagekeken, verstuurd |
| `done` | `#1F0B66` | `#1F0B66` | `#FFFFFF` | geleverd, betaald, goedgekeurd |
| `rev` | `#F6E7D1` | amber 30% | `#8A4D06` | revisie gevraagd, incasso mislukt |
| `can` | `#E4E7EC` | `#83868A` | `#3E4145` | geannuleerd, vervallen, gearchiveerd |

De pil is 28px hoog, mono, hoofdletters, 11px, met een stip van 6px in
`currentColor` — en **altijd het woord ernaast**, nooit kleur alleen.

**Drie regels die het schema hard maakt.** Geen verlopen. Geen slagschaduw (een
randsimulatie met `inset 0 0 0 1px` mag). En hooguit zo'n 2% violet per scherm:
is dat ergens niet haalbaar, dan wordt dat gemeld en niet opgelost met een
extra kleur.

## Twee ingetrokken paletten — verwijderd, 22 september 2026

Hier stonden de volledige paragrafen van **sectie 20** (Komma's geel,
`#D2E04A` / `#B8CC46` / `#E4F474` / `#9EB42F`) en van **harbor** (warme inkt,
teal en klei). Allebei weg, en dat is de regel die bovenaan dit bestand staat
en die drie keer eerder niet is toegepast: *een vervangen palet wordt uit dit
bestand VERWIJDERD, niet doorgestreept.*

Lucas, 22 september: *"pas het ook aan op andere plekken waar de verouderde
kleuren nog staan."* Dit bestand was de grootste plek. Er stonden 280 regels
met hexwaarden die nergens meer bestaan, inclusief een tabel die zich als "the
shipped palette" aanbood — precies het soort regel waar iemand een waarde uit
overneemt.

**Wat de twee wél hebben nagelaten, want dat gaat over methode en niet over
een kleur:**

1. **Een flauwe waarde is geen tekstkleur.** Harbor's `--ink-300` haalde
   2,31:1. Bijschriften en microcopy gaan naar de gedempte trede, en die trede
   wordt gemeten op de DONKERSTE grond waar hij op landt — niet op papier.
2. **Een accent zet geen lopende tekst tot het als lopende tekst is gemeten.**
   Vandaar `--accent-text` (`#3D17D6`) náást `--accent` (`#4A1FFF`): de vulling
   en de letter zijn niet dezelfde waarde, want de eisen zijn niet dezelfde.
3. **Kleur draagt nooit alleen een status.** Elke capaciteit, validatie en
   bestelstatus draagt ook een woord.
4. **Een balk over een foto heeft ÉÉN inkttrede, geen drie.** Gemeten op
   gerenderde pixels liep de tweede trede daar op 1,62–4,09:1. Hiërarchie komt
   daar uit gewicht en positie. Dit is de enige plek waar de ladder bewust plat
   is, en het is onzichtbaar voor een audit die alleen tokens naloopt — vandaar
   dat er ook een pixelaudit is.

De waarden zelf staan in de git-geschiedenis en in `REPORT-SECTION-15.md`.
`KLEURENSCHEMA.md` draagt het huidige palet; de tabel hierboven is de
samenvatting daarvan.


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

> **Herschreven 22 september 2026.** Wat hier stond ging over Archivo, over een
> `wdth`-as die uit één familie display-contrast moest halen, en over IBM Plex
> Mono als derde rol — een stapel beslissingen uit sectie 15. Daarna zijn de
> letters nog drie keer gewisseld (Hubot Sans + Satoshi + Sometype Mono, toen
> Instrument Sans, toen Figtree) en stond hier dus een typografisch systeem dat
> de site al een half jaar niet meer draagt. Zelfde regel als bij de paletten:
> weg, niet doorgestreept.

**Drie families, vier rollen.** Alle drie zelf gehost via Fontsource — nul
verzoeken naar Google Fonts, dus niets wat de cookiebanner of de
privacyverklaring raakt.

| Token | Familie | Rol |
|---|---|---|
| `--font-heading` | **Anybody Variable** | Koppen. Op `font-stretch: 125%` en in kapitalen; dat is het gezicht van de site. De perskop van de voorpagina draait diezelfde as de andere kant op — 78% en gewicht 900 — en is de enige plek waar dat mag. |
| `--font-body` | **Figtree Variable** | Lopende tekst, labels in formulieren, alles wat je echt leest. |
| `--font-mono` | **Martian Mono Variable** | Etiketten, maten, referenties, knoplabels. Op `font-stretch: 82%`: op 100% is hij zó breed dat een ordernummer uit zijn cel loopt. |
| `--font-merk` | Anybody Variable, 125% | De merknaam in een labelregel. Dezelfde snit als de koppen, met eigen letterafstand. |

**Waarom drie en niet twee.** Anybody en Martian Mono hebben allebei een
breedte-as, en de site gebruikt die as als contrastmiddel in plaats van een
vierde familie erbij te halen: breed voor koppen, smal voor mono. Figtree heeft
er geen en hoeft er geen — twee breedtes binnen één alinea lezen als twee
lettertypen.

**Wat een letterwissel wél raakt.** `scripts/fonts-voor-worker.mjs` bepaalt
welke snitten de build meekopieert, en `public/admin.css` / `src/styles/studio.css`
schrijven hun eigen `--font-kop` / `--font-mono` met dezelfde namen erin. Staat
daar een familie die de build niet levert, dan rendert een heel werkscherm in
Arial zonder dat er iets stukgaat — dat is op 7 september gebeurd en het is de
reden dat die drie bestanden nu uit dezelfde lijst lezen.


### Scale

```css
--t-hero: clamp(3.2rem, 7.4vw, 6rem);    /* at the 6rem ceiling — do not raise */
--t-h1:   clamp(2.5rem, 5.2vw, 4.2rem);
--t-h2:   clamp(2.1rem, 4.0vw, 3.3rem);
--t-h3:   clamp(1.2rem, 1.7vw, 1.45rem);
--t-body: 1.0625rem;
--t-lg:   clamp(1.1rem, 1.4vw, 1.25rem);
```

> **Bijgewerkt 31 augustus 2026.** Hier stonden `--t-sm`, `--t-data` en een
> `--font-data` met IBM Plex Mono erin. Alle drie bestaan niet en hebben nooit
> bestaan; er staat geen letter mono op deze site. De schaal die er wél is, loopt
> `--t-hero`, `--t-h1`, `--t-h2`, `--t-h3`, `--t-lg`, `--t-body`, met daarnaast
> `--t-page-h1`, `--t-page-h1-sm`, `--t-page-h2` en `--t-statement` voor de koppen
> die per pagina afwijken.

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
- Beweging draait op CSS en op de Web Animations API. Er zit geen
  animatiebibliotheek meer in de site. `<ClientRouter />` maakt pagina-eigen
  scripts onbetrouwbaar, dus JS staat in gedeelde modules die op
  `astro:page-load` opnieuw starten en hun eigen opruimwerk doen.

  > *Bijgewerkt, 2 september 2026.* Hier stond dat GSAP en ScrollTrigger in
  > `src/scripts/interactions.js` wonen, binnen een `gsap.context()` die bij een
  > zachte navigatie wordt teruggedraaid. Dat klopte niet meer: GSAP was uit
  > interactions.js verdwenen en stond alleen nog in de filterbalk van de
  > galerij. Gemeten aan de build was dat 68 kB bibliotheek voor één crossfade,
  > op de twee pagina's die daardoor op 128 kB JavaScript stonden tegen 58 kB
  > voor de rest van de site. Die crossfade doet nu `element.animate()` —
  > dezelfde bewegingen, dezelfde tijden, en de curves staan met hun GSAP-naam
  > erbij in `src/scripts/galerij-filter.js`. Na de omzetting: 60 kB.
  >
  > In dezelfde week ging Lenis eruit, om dezelfde reden. Wat overblijft is de
  > browser.

---

## Layout & spacing

```css
--container-cap:    1760px;
--container:       min(var(--container-cap), 100%);
--container-narrow: 760px;
--container-wide:  min(1920px, 100%);
--pad-x:           clamp(20px, 4.5vw, 96px);
--rand-x:          calc(max(0px, (100% - var(--container-cap)) / 2) + var(--pad-x));
```

> **Bijgewerkt 5 september 2026 — weer een maat breder.** Lucas, bij sectie 21:
> *"de website mag ook weer breder om meer white space te creëren."* De cap
> gaat van 1640 naar 1760, `wide` naar 1920, en de zijmarge groeit mee naar
> 4,5vw (max 96px) — ruimte zit dan in de marge én tussen de kolommen, zoals
> bij Komma. De ladder smal < cap < breed blijft staan.
>
> **Bijgewerkt 1 september 2026 — een maatje smaller, en één ladder.**
> Lucas: *"Ik wil de breedte van de website toch 1 maatje smaller maken omdat het
> nu wel erg breed is."* Er stond `min(1720px, 100%)` met
> `clamp(1.2rem, 4vw, 5.5rem)`, en dat was niet wat de bezoeker zag:
> `body.huid-kantig` — de huid die op elke pagina op twee na staat — zette er
> `--container: 100%` en `--pad-x: 20px` overheen. De inhoud liep dus op élk
> scherm tot twintig pixels van de rand, en de ladder in dit document gold voor
> `/proef`.
>
> Twee ladders waarvan er één stil wint is geen ladder. De huid overschrijft de
> maten niet meer; wat hierboven staat zijn de maten van de site. Opgemeten op
> `/pricing`, inhoudsbreedte van een gewone `.container`:
>
> | scherm | was | wordt |
> |---:|---:|---:|
> | 390 | 350 | 350 |
> | 768 | 728 | 714 |
> | 1024 | 984 | 952 |
> | 1280 | 1240 | 1190 |
> | 1440 | 1400 | 1339 |
> | 1920 | 1880 | 1512 |
> | 2560 | 2520 | 1512 |
>
> De telefoon verandert niet — daar was nooit iets mis en elke pixel telt er.
>
> *Bijgesteld dezelfde dag:* de eerste stap zette de cap op 1560 en Lucas vroeg om
> *"een tikje ruimer"*. 1640 is die tik: tachtig pixels erbij waar hij klemt, en
> niets veranderd op alles daaronder.
>
> `--rand-x` is nieuw en hoort bij de bovengrens: zolang de inhoud schermvullend
> was, lijnde alles wat zich op de tekst richtte uit met `--pad-x`. Met een cap
> zijn dat twee verschillende afstanden, en de annotatielaag van de huid (de
> maatverdeling op een hoofdnaad, het zoekerkader op de hero) leest daarom dit
> token. `100%` en niet `100vw`, want `100vw` telt de scrollbalk mee.

> **Bijgewerkt 31 augustus 2026 — dit blok beschreef een systeem dat niet bestaat.**
> Er stond `--container: 1240px` met een `--gutter` en een schaal `--s-1` tot en met
> `--s-10`. Geen van die zestien tokens is ooit in `src/styles/global.css` gezet. De
> container is inmiddels `min(1720px, 100%)` (zie de lange noot in global.css over
> waarom hij van 1240 af moest), de marge heet `--pad-x`, en ruimte wordt met
> `clamp()` per plek gezet in plaats van uit een genummerde schaal gehaald.
>
> Dat laatste is een echte keuze en geen slordigheid: een schaal van tien stappen
> nodigt uit tot `--s-7` waar `--s-6` bedoeld was, en het verschil is dan niet meer
> te beredeneren. De twee afstanden die wél een naam verdienen — de ruimte onder een
> kop — hebben er een: `--gap-head-block` en `--gap-head-lede`, met de meting die ze
> heeft opgeleverd erbij in global.css.
>
> `tests/ontwerpdoc.test.mjs` houdt dit blok voortaan tegen de code aan.

Ritme wordt per sectie gezet en niet uit een schaal getrokken. Een dichte specsectie
zit strakker dan een fotoblok, en dat verschil is het ritme.

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
--z-sticky:       200;
--z-bar:          250;
--z-grain:        300;   /* above the sticky bar, below any modal — deliberate */
--z-modal:        400;
--z-toast:        500;
```

> **Bijgewerkt 31 augustus 2026.** Hier stonden er negen. De andere vier —
> `--z-base` (1), `--z-dropdown` (150), `--z-modal-back` (390) en `--z-tooltip`
> (600) — zijn uit global.css gehaald omdat ze wel gezet waren en nergens
> gebruikt; de noot in dat bestand zegt het met zoveel woorden. De GATEN in de
> schaal blijven met opzet: vijftig tussen elke laag, zodat er iets tussen past
> zonder dat alles opschuift, en zodat de vier verdwenen waarden er zo weer in
> kunnen als er ooit een dropdown of een tooltip komt.

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

> *Nagemeten 30 augustus 2026.* De homepage staat inmiddels op **890 zichtbare
> woorden in acht secties** (2044 en dertien secties vlak vóór die ronde; de
> 2.435 hierboven is de meting van augustus). De maatregel is sindsdien niet
> alleen "uitklappen in plaats van weghalen" geworden maar ook echt weghalen:
> wat een pagina UITLEGT is naar de pagina gegaan die er al over ging, wat een
> pagina BEWIJST is blijven staan. Zie de noten in `HomeV2.astro` per geschrapte
> sectie voor welke afweging per band is gemaakt, en `HERONTWERP.md` voor de
> stand van het hele herontwerp.

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

## Section 21 — the homepage, flat and full-bleed (5 September 2026) ~ HISTORIE

> **Lees dit als verslag, niet als opdracht (22 september 2026).** Deze
> paragraaf beschrijft de homepage-ronde van 5 september, inclusief de kleuren
> en letters van toen. Twee paletten en drie letterwissels later klopt er van
> de WAARDEN niets meer; de redenering eronder — waarom een vol scherm, waarom
> panelen in plaats van secties, wat er wegging en waarom — is waarom hij
> blijft staan. Voor de geldende waarden: `KLEURENSCHEMA.md` en de tabel
> bovenaan dit bestand.

Lucas, after section 20: *"hoe het nu wordt voelt zo vriendelijk nog"* — the
reference is ovyonlabs.com/works/komma and the Lue site, and the brief is
*"visueel uitleggen wat visuails doet"*, cutting copy where it does not carry
the core. `src/components/Voorpagina.astro` replaces HomeV2 (5,150 lines →
~600). What "strak" means here, measured on those two sites, and revised in
the second round the same day:

- **One full-screen banner.** Photo edge to edge, `min-height: 100svh`, a
  dark scrim, the headline bottom-left, mono labels top-left, one HUD chip
  top-right, three facts in a glass card bottom-right. Nothing vertical, no
  V pattern behind anything — Lucas: *"vind ik maar niks"* — only two loose
  outline strokes of the mark on the process panel, off-centre.
- **Panels, not sections.** Full-bleed, white (`#F5F5F5`) and Komma's dark
  grey (`#111111`, measured from his screenshot; `#212121` was wrong), one
  hairline between them. One shared side margin (`--vp-x`) so every heading
  sits on one vertical line; `--vp-y` is `clamp(5rem, 11vw, 11rem)` and the
  rest of the site takes the same section padding.
- **The accent word is a yellow block, on cap height.** `h1 em, h2 em` draw
  `--accent` as a one-colour gradient sized `.9em` and offset `.27em` from the
  top of the inline box — a full background fills the whole 1.4em font box and
  overlaps the line above at line-height 1.02. Descenders hang out of the
  block like a marker. Never yellow letters, never italics.
- **Hairlines instead of cards.** Tables, lists and rows draw `--line`;
  cards keep a hairline and lose their shadow and hover lift sitewide.
  Corner ticks (two, not four — *"vier is een fotolijst, twee is een
  aantekening"*) on `.vp-kader-lijn`, `.cta-band` and `.photo-split-media`;
  crop marks on the closing poster.
- **Hard edges.** The August "lamp" layer — `.rand-los` masks, `.foto-licht`,
  `.korrel-mee`, the `brand-beam`/`brand-glow` atmosphere images — is switched
  off in global.css; a panel ends where it ends. /studio's hero and closer are
  plain ink panels now, registered in the dark-ground scope.
- **Type.** Toen: Hubot Sans + Satoshi + Sometype Mono, gekozen uit twee
  letterbladen (`kladblok/font-keuze*.html`). Alle drie zijn vervangen — zie
  "Typography" hierboven voor wat de site nu draagt. De rol-indeling uit deze
  ronde is wél gebleven: een smalle kop, een leesletter, en een mono als
  tweede stem voor labels, chips, de navigatie en de vertrouwensregel.
- **Pills and glass.** Buttons are pills again (`--r-pill`, 42px, 1.5rem
  inset), as are the nav links, the language switch and the chips. Glass
  (`.glas`, `.glas-licht`: 62% ink, 16px blur, a 1px light rim, 22px radius)
  is a material for the hero facts, the HUD chips and the Try-card — not for
  the header, not for buttons.
- **The Try-card.** `Proefkaart.astro` replaces the conversion bar: a glass
  card bottom-left, mark, one sentence from `TEST_SAMPLE`, one pill. Shows
  after 60% of a viewport of scrolling and only once the cookie choice is
  made; closing silences it for seven days (localStorage); not on
  /test-sample, /start, /thank-you, /account, /o. One 480ms ease-out, fade
  only under reduced motion.
- **Motion.** Scroll-driven `vis-rise` (10px, opacity) on tiles, frames and
  steps; hover scale on the service tiles and grayscale→colour on the faces.
  The set frames animate the photo, not the frame, so a waiting frame never
  counts as overflow of the row.
- **Numbers only where there is a sequence.** `01–04` on the four steps and
  on the seven frames of one set — the panel numerals are gone.
- **Yellow once, full width: the footer.** Site-wide (global.css, "DE VOET
  ALS GEEL VLAK"), black ink on it; the primary button inverts to black.
- **Photos are named before they exist.** Every image is `voorpagina-*` and
  gets a build-time placeholder in the size the page asks for until the file
  lands in `public/img` (see `src/data/beeld.js`); `data-plaatshouder="donker"`
  gives a dark one under a scrim.

Gone with it: the hero carousel, the FAQ cards, the floating notes on the
homepage, the yellow wash on the first screen (`body::after`), the conversion
bar and its ~270 lines in Layout.astro, the dead `.hv-*`/`.sel-*`/`.sch-*`
layer of HuidKantig (what remains there: square radii, the seam hairline
between sections, the menu bridge, the WhatsApp pill and the pointer), and
the leaf-shaped V (`logo-mark.webp`) — that mark is retired; the tile mark
with the flag stays, recoloured to the accent on `#111111`. The accent itself
moved once more the same evening, from Komma's measured `#DEDA14` to `#C8F206`
— Lucas: *"een stuk meer toxic groen/gelig"* — one step short of the old lime.
And back, on 6 September: Lucas compared the site with Komma's pages and the
feeling did not match. Measured per pixel in Komma's own images the UI yellow
is a soft lime (`#E4F474` as a letter on black, `#B8CC46` as a ring, `#9EB42F`
as a glow) and the photographic yellow a metallic olive-gold (`#D4D444`);
`#C8F206` was more saturated and greener than anything in them. The family is
now `#D2E04A` / `#B8CC46` / `#E4F474` / `#9EB42F` — KLEURENSCHEMA.md is the
one file that carries it.

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
