# Section 15 — harbor, schema, and the things a token-based checker cannot see

**What this was.** The build prompt in `visuailsseoprompt.md`, applied to the live
`visuails-astro` tree. Two open decisions were answered by Lucas before anything
was touched:

1. **Admin / back-office** — *"Admin UI later, now only the basis."* So: the D1
   schema, the status endpoints and the capacity table stay as they are and are
   documented; no admin UI was designed or extended this session.
2. **Hero mechanic** — *the WebGL chrome shader*, not the CSS ambient haze.

Everything below is either a change that shipped, or a flag. Per the working
agreement, **a flag that I raised and then resolved myself is still a flag**, and
it is reported rather than quietly folded into the diff.

---

## 1 · What the prompt asked for that was already there

Worth stating first, because it is most of §7 and all of the token discipline,
and because a report that only lists work makes a codebase look worse than it is.

The **hard-edge rule is fully implemented and better than the prompt asks.** Zero
non-zero `border-radius` declarations anywhere in `src/`, `public/*.css` or
`functions/` — one `--radius: 0` token in four stylesheets with an explicit
anti-scale note. Every native control is reset by name rather than by a blanket
`* { appearance: none }` (iOS Safari re-rounds each type independently and a
blanket reset does not survive it). Checkboxes, radios, range thumbs and progress
bars are rebuilt square. The focus ring is an `outline`, not a `box-shadow`, so it
stays rectangular on any ground. The WhatsApp launcher is a square block
deep-linking to `wa.me`, not a third-party circular widget.

Prices are correct and centralised: all eight figures in the prompt — €650,
€1,850, €89.99, €129.99, €69, €1,250 (+€250 × 5), €2,200, €0.99 — match
`src/data/pricing.js` exactly, with no EN/NL drift.

Routes are complete: all fourteen required URLs exist in both locales, the 24
`/order-*` redirects are real 301s, hreflang is reciprocal on all 68 pages, and
`/o/<token>` and `/account/login` carry `noindex, nofollow` at three layers each.

`portal_token` exceeds the brief: 256 bits from `crypto.getRandomValues`,
base64url, SHA-256 at rest, rate-limited, shape-checked before any I/O.

---

## 2 · The design system — harbor now ships

`src/styles/global.css`'s `:root` carried the OKLCH ink/paper system from
sections 1–14. Thirteen of the prompt's fourteen harbor hexes did not appear in
the codebase at all; the fourteenth, `#3C6B76`, existed only as `--brand` on the
logotype. Harbor is now the palette: warm ink, cool paper, espresso, the four
mist tints, harbor teal on the primary action and one headline word, clay held to
one moment at a time, and the 6% ghost fill.

The existing token *names* were kept and repointed. `--ink-900`, `--paper`,
`--accent`, `--line` and the rest are what ~95 kB of stylesheet and every
component already address colour through, so repointing them moved the whole
site; renaming them would have moved nothing and broken everything.

### FLAG 15a — this reverses a stated design principle, deliberately

`PRODUCT.md` says *"The photograph is the only colour."* `DESIGN.md` says *"There
is no marketing accent. 'Accent' resolves to ink: a primary button is a black
block with paper text."* Harbor puts a teal gradient on every primary CTA on the
site. That is a real reversal, made because the prompt makes it in as many words
("Accent one — harbor teal, spent on the primary action and one headline word
only"). Harbor's own licence is narrow — two things, and clay to one stat or chip
— so the principle survives in spirit. But it is a reversal, and it should be
yours rather than mine.

### FLAG 15b — three harbor values fail WCAG AA and were moved

Each move is the smallest one that clears the floor. `PRODUCT.md` commits to WCAG
2.2 AA with placeholders held to the same 4.5:1 as body, so the floor won.

| Prompt value | Measured | Shipped | Why |
|---|---|---|---|
| muted `rgba(30,25,18,.50)` | **3.28:1** on paper | `.64` → `#6A6863` | The prompt assigns this to footer links. Footer links are body text. `.62` clears 4.5:1 on `--paper` (4.74) and then **fails at 4.36–4.41 on the mist tints and the surface fill**, which is where half the muted text on this site actually sits — the floor has to be measured on the darkest ground a token lands on, not the lightest. At `.64` the worst ground is 4.62:1. |
| faint `rgba(34,29,21,.38)` | **2.31:1** | value kept, **role demoted** | Fails body *and* large. It ships at the prompt's own value but as a non-text token (rules, disabled, decorative). Captions and microcopy resolve to muted instead. A caption is a sentence someone reads. |
| CTA gradient `#3C6B76 → #4A7A85` | **4.23:1** at the light end | `→ #43717C` | A 17px/700 label is *not* "large text" under WCAG — that floor is 18.66px bold. `#467580` computed to 4.54 and then **measured 4.44** once rendered, because the browser interpolates the gradient in its own space and the lightest pixel is lighter than the lightest stop. `#43717C` measures 4.62. |

### What else changed in the system

**Buttons** were rebuilt to the prompt: two sizes as fixed heights (58px/17px·700
and 38px/14px·700 — "58px" is one number and padding + line-height + font-size is
three numbers that have to agree to produce it), three fills, teal gradient
primary, paper-with-inset-border secondary, espresso dark, 6% ghost. The
`translateY(-2px)` hover was removed: a button that lifts is a shadow argument
made with motion, and this system removed shadow as a depth signal.

**Mist tints** are now real section grounds, alternating down the homepage, with
no rule between them — the tint *is* the separation, which is what §7 asks for.

**Two feathered mask edges** (`.marquee` and the visual strip, both fading out
with a gradient mask) were replaced with hard edges. §8 bans them everywhere
outside the chrome field.

**The watermark finale** is built: the wordmark at page scale behind the footer
columns, clipped by the footer's own bottom edge, with the harbor-teal glow §7
specifies. The glow is the one sanctioned soft edge on the site and it is fenced
in the footer rather than exposed as a utility.

**A stats row** was added — four numbers at 50px/900 with muted labels, per §7.
Every figure is about this studio's own operation (a 48-hour window, 25–30
products, four house styles, €0.99), because a number describing a client's
business is a testimonial and there are none. Labels run at muted rather than at
the prompt's faint value, for the reason in 15b.

**Typography**: Archivo moved from eight static cuts to the variable `wght` axis
— one file instead of eight per subset. `DESIGN.md` called for exactly this swap
and it had not been made. See §4.

---

## 3 · The hero field — and the first version of it that was thrown away

Lucas chose the shader. The prompt puts it on the hero. It was on `.ch-promise`
("No wall of reviews yet"), not on the hero at all.

**First attempt:** chrome as the whole hero ground, photograph as a plate over its
right 62%. It rendered as flat dark. The headline needs roughly a 0.94 ink scrim
to clear 4.5:1 over a moving metal ground, and a 0.94 scrim is opaque — so the
surface that is this brand's signature was invisible in the exact place §8 asks
for it. *"Never under live text without a solid ink plate behind it"* and *"put it
behind the headline"* are one sentence asking for two things at once.

**What ships:** the chrome is the hero's ground and the photograph is a plate over
it, inset from the left, so the field reads as a hard vertical column running the
full height of the hero — through the copy band *and* through the facts plinth,
which is what makes it a ground rather than a stripe. No live text crosses it, so
it carries no scrim and the metal is at full strength. The plate's left edge is
hard. Below 900px the plate goes full-bleed: there is no room for two materials
on a phone, and the design system's first-screen test — *"what do I remember, the
chrome or a garment?"* — has to keep answering *the garment*.

### FLAG 15c — the second chrome surface is still withdrawn

§8 says *"exactly two surfaces (hero field + logotype)"*. The logotype was built
chrome-filled once and pulled after you saw it rendered and read the metal as
cheap at logo size. That is a verdict from a rendered page, which is stronger
evidence than a spec, so it was not reopened. One surface ships. With harbor's
teal now on every CTA, `--brand` also went back to flat ink — a teal logotype
would put the accent in the nav, the footer and the conversion bar of every page,
which is the opposite of "spent on the primary action and one headline word."

---

## 4 · The sticky nav was illegible, and no token-based check could have found it

The most serious defect found this session, and it predates it.

On every page opening with a photographic hero, the un-scrolled header kept the
**paper** side of the ink ramp and painted it onto the photograph. Sampled
against the actual rendered pixels behind each link — text hidden, screenshot
taken, worst pixel measured — the nav ran at **1.29–1.74:1**.

It is invisible to a token-based audit *by construction*: by token the header is
correct. `--ink-2` on `--bg` is 5.75:1. `--bg` is simply not what is behind it.
The DOM-walking contrast audit I ran reported the header as passing on every
route, because it read the same token. Only a pixel sample of the rendered page
disagreed.

Fixed by giving the header the dark ramp for as long as it is standing on a dark
ground, via `body:has(.hero-cover, .hero-editorial) .site-header:not(.scrolled)`,
with an `@supports` fallback that makes the bar solid rather than pretty. `:has()`
rather than a JS class: a nav only legible once a script has run is illegible on
first paint and with JS off.

Three follow-on defects surfaced from the same measurement and are also fixed:

- `.hero-editorial`'s top scrim stop was **0.34** — it is the plate the nav
  stands on, and at 0.34 the link cluster measured 1.62–1.88:1 on `/about` and
  `/how-it-works`. Now 0.74 in the header band only.
- The **language switcher** flipped its label to paper and kept its paper fill:
  white on white, **1.05:1**, on the control that tells you which language you
  are reading. The active chip is now a solid paper fill with ink text, and the
  switcher shell is an ink alpha rather than a paper one (a paper-alpha shell
  lightens the photograph behind it, which is the wrong direction).
- The footer wordmark went **ink on ink** when `--brand` was repointed to flat
  ink — invisible, and invisible in a way no contrast checker reports, because a
  checker looks at text and this is an `<svg>`. `--brand` now flips with the ramp.

**Final measurement: 45 nav items across 5 routes, pixel-sampled, zero failures,
tightest 4.61:1.**

---

## 5 · Structured data — 0 of 4 became 4 of 4

Every one of the 68 pages carried the same `ProfessionalService` block and
nothing else. §3's first sentence is *"No LocalBusiness schema"*, and
`ProfessionalService` is a direct subtype of `LocalBusiness` carrying the full
signal set — `address`, `telephone`, `priceRange`. So the site was not merely
missing the four required types; it was asserting the one type the prompt rules
out, with `areaServed: "Worldwide"` doing the work of contradicting the `@type` it
sat inside.

Now: `Organization` site-wide, `Service` on the four pillar pages × two locales,
`Product`/`Offer` for all seven tiers on `/pricing` plus the €0.99 sample on
`/test-sample`, and `FAQPage` on `/faq` and `/pricing`. One `@graph` per route
with `@id` references, derived from the URL inside `src/data/schema.js` — zero
page files needed editing, and every `@id` is byte-identical to the
`<link rel="canonical">` in the same `<head>`.

The FAQ copy moved to `src/data/faq.js` so the component and the schema read one
source. An answer written twice is an answer that eventually gets updated once.

`ProfessionalService`, `LocalBusiness` and `priceRange` now appear **zero** times
in `dist/`. No `aggregateRating`, no `Review`, no delivery date in any `Service`,
`Product` or `Offer` node.

---

## 6 · Performance — the budget is met with the shader running

§12's budget is *"LCP under 2.5s on mobile on 4G — with the hero motion running,
not measured with it disabled."*

Measured on a throttled mobile profile (390×844, 1.6 Mbps down, 150 ms RTT, 4×
CPU throttle), with the WebGL field live:

| Route | Before | After | CLS |
|---|---|---|---|
| `/` | 1764 ms | **1964 ms** | 0.0000 |
| `/catalog` | 3372 ms | **2068 ms** | 0.0000 |
| `/pricing` | 1232 ms | **1480 ms** | 0.0000 |

`/catalog` was over budget and the shader was not the reason — its LCP element
was its own `H1`, waiting on fonts. Two fixes: the variable Archivo file replaces
eight static cuts, and the latin roman is now `<link rel="preload">`ed, because a
woff2 referenced from inside a stylesheet is not discoverable until that
stylesheet has been fetched and parsed.

Also closed: **352 of 406 `<img>` tags had no `width`/`height`** and 406 of 406
had no `decoding`. All now carry true intrinsic dimensions read from the files
themselves, plus `decoding="async"` (or `sync` on the six eager LCP candidates).
CLS went to zero across the board. Eight `<img>` tags shipped a valueless `alt`
from one component defect on `/how-it-works`; fixed structurally so no frame can
reach empty again, with real EN and NL alt text.

---

## 7 · Motion

- **ScrollTrigger's refresh was broken.** The only refresh was a
  `load` listener with `{once: true}`, registered inside `init()` — which runs on
  every `astro:page-load`. From the second client-side navigation onward the
  event never fires again, so no refresh ever ran, and a dead listener leaked per
  navigation. Now a debounced `resize` + `orientationchange` handler owned by the
  same `gsap.context` teardown, plus a one-shot on `document.fonts.ready` (which,
  unlike `load`, resolves on client-side navigation too). Verified: 6 navigations
  then one resize produces exactly one refresh.
- **The before/after slider now snaps to edges** (§8), keyboard included, with a
  direction-aware rule so a keypress cannot be trapped at an edge, and an
  instant snap under reduced motion.
- **The gallery filter now crossfades** instead of flipping `display`. See FLAG
  15d.
- Reveals still enhance an already-visible default: a headless sweep of all 67
  routes finds zero sections at opacity 0 or visibility hidden.

### FLAG 15d — the gallery crossfade is composited, not WebGL

§8 asks for a WebGL crossfade on gallery filter change. It was built as a
GPU-composited opacity+scale crossfade instead. A texture dissolve would mean
uploading up to 38 grid photos as GL textures and running a second WebGL context
alongside the hero shader, on the one page that is already a wall of images,
against a budget stated *with* the shader running. The visible result is the same
~300 ms crossfade. This is a conscious substitution and it needs your call.

### FLAG 15e — Lenis is still not installed, and I did not install it

§8 asks for Lenis sitewide. It is not in the tree. It was removed in an earlier
section (flag cvii) precisely because a scroll-hijacking rAF loop is a permanent
main-thread cost on every page, against the same LCP budget §12 states. The
prompt asks for both. Re-adding it to satisfy one sentence and then breaking the
budget in another sentence is not a decision to make silently, and it is not one
a headless measurement settles — smooth scroll is a feel judgement. **Your call.**
The other half of that §8 requirement — timelines destroyed and rebuilt on every
Astro view transition — is implemented and verified.

---

## 8 · Internal linking — the plan was not implemented, and now is

§1's last bullet specifies a link graph. A body-anchor audit (header, submenu,
mobile drawer, footer and conversion bar excluded — a link on all 68 pages is not
a linking plan) found the `/custom-models` upsell on **1 of the 14** drop-content
pages, `/guides` with **zero** inbound body links, `/start` linking to one pillar
of four, and `/pricing` to two of four.

All closed, in both languages, without a single "Related pages" block, chip row
or card grid. Every link is inside a sentence in the page's own voice; the two
highest-value ones reuse copy that was already on the page (`/catalog`'s
on-model line, `/pricing`'s tier names). `/custom-models` inbound went 5 → 19.

One consequence caught in review: `/pricing`'s tier names rendered as links with
**no cue at rest** — no colour, no underline until hover. WCAG 1.4.1 is about not
relying on colour; relying on a pointer is worse. They now carry a hairline
underline at rest, thickened on interaction, so the page's one accent stays on
the CTA.

---

## 9 · Flags that are yours, not mine

Beyond 15a–15e above, these came out of the audit and are **not fixed**, because
each needs a decision or an asset rather than a patch.

**FLAG 15f — `/custom-models` argues its case with the same photograph twice.**
`model-01/02/03.webp` and `custom-models-01/02/03.webp` are byte-identical pairs
(md5-verified). On `/custom-models` the hero (`custom-models-03`, alt *"A VISUAILS
brand model portrait"*) and the standard-roster counter-example (`model-03`, alt
*"A VISUAILS model portrait"*) are the same photograph. The page's entire argument
is that the two are different. This needs new imagery, not code.

**FLAG 15g — nothing writes `orders.closed_at`.** It is read by `token.js` and
`portal.js`, and no code path sets it. Two documented promises depend on that
clock starting: the 90-day portal expiry, and the 90-day deletion of client source
files that `/terms` states. Portal tokens are currently immortal and the retention
promise has no mechanism behind it. Related: `order_tokens.expires_at` and
`revoked_at` also have readers and no writers.

**FLAG 15h — no code path can create a `kind='delivery'` file row.** The portal
gallery and the whole approve / request-revision surface read `kind='delivery'`;
the only `INSERT INTO files` in the codebase is hardcoded to `kind='upload'`. The
portal's highest-value screen is unreachable in production.

**FLAG 15i — the status machine fires no notification of any kind.** §4 says each
transition fires exactly one WhatsApp message via the Business API. There is no
Business API integration in the tree — every WhatsApp reference is a static
`wa.me` marketing link. `handleStatusUpdate` writes two rows and returns; it does
not send email either. A client learns of a status change by revisiting the
portal.

**FLAG 15j — the Mollie webhook does not exist.** `order.js` points at
`/api/webhooks/mollie`; the only webhook file is `functions/api/webhook/stripe.js`
— different path, different provider, and unreachable because no Stripe session
is ever created. Every Mollie payment stays `payment_status='unpaid'` forever.

**FLAG 15k — `makeRef()` can collide, and the failure mode is severe.** The
`VIS-{base36 time}-{random}` generator is not the `VIS-2026-0041` format §4
specifies, and its `INSERT` is wrapped in a `safe()` that swallows the unique
constraint. On a collision the insert is silently dropped, the subsequent
`SELECT ... WHERE ref = ?` returns the *pre-existing* order, and the new client's
photographs are attached to it while a fresh portal token for that old order is
emailed to the new client. Low probability, severe blast radius.

**FLAG 15l — uploads are not presigned.** §4 requires presigned PUT direct to R2
with image bytes never passing through a Worker. Every byte of every client image
currently transits the Pages Function. Per-file progress is real; the transport is
not what the prompt specifies.

**FLAG 15m — §4's `/start` is not the `/start` that exists.** No drop-date field
(the prompt calls it the most important field on the site), no brand-site fetch,
no folder-per-product SKU upload, no Shopify/CSV import, no style-and-model step,
no payment on confirm. Required fields are scope, product count, name, brand and
email — versus the prompt's brand, URL, drop date, files. The capacity gate is
the one part of §4 that meets or exceeds the spec.

**FLAG 15n — the section anatomy has three elements that cannot be built
honestly.** §7 asks for a grayscale logo strip and a full-saturation testimonial
wall. There are no client logos and no testimonials, and the evidence rule
forbids inventing either. The "No wall of reviews yet" section is the honest form
of that slot and it stays. §7's numbered 01–04 accordion was not built either:
the accordion was removed deliberately in an earlier section, and numbered
markers on a set of categories (rather than on a real sequence) are banned by
this system's own type rules. The live product demo — sticky headline,
auto-rotating demo card, vertical text menu — is also not built; it is a
component of real size and it did not fit this session honestly.

---

## 10 · How this was verified

Not by reading the diff.

- **`npm run build`** — 68 pages, clean, after every change.
- **Headless sweep of all 67 built routes**: HTTP status, sections at opacity 0
  or visibility hidden, horizontal overflow, `H1` count, any non-zero
  `border-radius` in the computed styles, presence of JSON-LD, and console/page
  errors. Two findings, both the same: `/start` requests `/account/me`, a Worker
  route that does not exist in a static preview.
- **DOM-walking contrast audit across 22 routes**, resolving the ground through
  the inherited `--bg` token rather than through `background-color` alone (the
  naive walker falls through to the body's paper on every dark section and
  reports a phantom 1.02:1). Zero real failures.
- **Pixel-sampling contrast audit of the sticky nav** — the one surface the token
  audit cannot see. 45 items, 5 routes, worst rendered pixel behind each label.
  Zero failures.
- **LCP and CLS** on a throttled mobile profile with the shader running.
- **Schema parsed out of `dist/`** and asserted by type and by count, including
  zero occurrences of the three prohibited strings.
- **`<img>` attributes cross-checked against the real file dimensions** read with
  `sharp`, not against what the markup claimed.

The verification scripts were throwaway. The measurements are in this document
because the numbers are the point, not the scripts.
