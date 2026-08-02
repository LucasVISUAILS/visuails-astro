# Section 16 — the bug pass

Fixing what was broken, before the espresso-dominant rebuild starts. Lucas's
four decisions for that rebuild are recorded at the end; nothing here
anticipates them.

Everything below was reproduced before it was fixed and measured after. Where a
thing turned out **not** to be broken, that is stated too — three of the
reported symptoms had a different cause than the obvious one.

---

## 1 · The one that mattered: every write on /admin and /account was dead

**Symptom reported:** the sign-out button does nothing on the client and admin
dashboards.

**Actual scope:** sign-out was the visible edge of it. *Every* state-changing
POST on both surfaces returned 403 in production:

| Route | What it does |
|---|---|
| `POST /admin/logout` | sign out |
| `POST /admin/orders/<id>/status` | **change an order's status** — the core admin action |
| `POST /admin/orders/<id>/models` | attach a custom model to a customer |
| `POST /account/logout` | sign out |
| `POST /account/lock` | set or clear a brand lock |
| `POST /account/review` | approve or reject a delivered file |

Login was unaffected, because it is dispatched *before* the gate. Which is
exactly why the dashboard could be entered and then did nothing at all.

**Cause.** Every response from `admin.js`, `account.js` and `portal.js` carried
`Referrer-Policy: no-referrer`. That header is there for a good reason —
portal tokens live in the URL path and must not leak through `Referer` — but
under `no-referrer` Chrome does not merely strip `Referer`. **It also sends
`Origin: null` on a same-origin form POST.** `originIsSelf()`, whose whole job
is to compare `Origin` against our own host, was handed the string `"null"`,
`new URL('null')` threw, and it returned false. The CSRF gate refused the site
itself.

**How it was proven, without logging anyone out or changing any state:** POST to
a path that matches no route. The gate runs first, so the response is either
the 403 origin page or a plain 404. On the live site it answered:

> Request origin did not match. Try again from the dashboard itself.
> **Seen Origin: null.** Expected host: visuails.com.

That message existed because of task #271e, which added the raw values to a
previously useless error string. It is the reason this took minutes instead of
a day.

**Fix, in two parts, neither of which weakens the CSRF defence:**

1. `Referrer-Policy: no-referrer` → **`same-origin`** across all three files
   (9 headers). Full referrer to ourselves, nothing at all cross-origin — so
   the portal token still cannot leak, and `Origin` survives.
2. `originIsSelf()` now checks **`Sec-Fetch-Site` first**. The browser sets it,
   script cannot forge it, and unlike `Origin` it is unaffected by
   Referrer-Policy — so it keeps working if some future policy change
   suppresses `Origin` again. `same-origin` passes, `cross-site` is a hard
   reject, anything else falls through to the existing `Origin` comparison for
   browsers that send neither.

**Verified** by running both handlers under node against six header
combinations:

| Case | Before | After |
|---|---|---|
| Chrome form POST under `no-referrer` (`Origin: null`) | **403** | 303 ✔ |
| `Origin` absent entirely | 403 | 303 ✔ |
| normal same-origin POST | 303 | 303 ✔ |
| CSRF from another site | 403 | **403** ✔ |
| CSRF with a forged `Origin` but a real `Sec-Fetch-Site` | 303 ✗ | **403** ✔ |
| ancient browser, neither header | 403 | **403** ✔ |

Row five is worth noting: the new check is not merely a workaround, it closes a
case the old one would have let through.

The portal (`/o/<token>`) never had this gate, so approve / request-revision
was never affected.

---

## 2 · The homepage glitch: the H1 was hostage to an animation

**Symptom:** the hero headline renders half-faded, with the third line missing.

Measured on the live site: the three lines sat at opacity **0.93 / 0.83 / 0.66**
with residual `translateY`, six seconds after a finished load, and were still
creeping. Not a screenshot timing artefact.

**Cause.** `gsap.from(lines, { opacity: 0 })` writes the start state in JS, so
for as long as the tween runs it is the only thing between the reader and a
blank headline. GSAP's ticker is `requestAnimationFrame`-driven, and the
browser throttles rAF to roughly 1 Hz whenever a tab is not the foreground one
— so a 1.2s tween takes over a minute and the H1 sits at a fractional opacity
the whole time. It reads as a rendering fault, because it is one.

This is the exact pattern `DESIGN.md` already forbids: *"Reveals enhance an
already-visible default. Content is never gated on a class-triggered
transition."* The rule was written and then not applied to the one element it
matters most for.

**Fix — two blunt guards in `motion.js`:**

1. If the document is not visible when `init()` runs, the hero entrance does
   not start at all. There is nobody to show it to, and the base state is fully
   designed without it.
2. If it started and the document goes hidden — or if wall-clock time says it
   should have finished and it has not — every entrance tween jumps to its end.
   Wall-clock via `setTimeout`, because `setTimeout` is not rAF-throttled the
   way the ticker is. That is the entire point.

**Verified:**

| Case | Headline opacity |
|---|---|
| document hidden at init | `1 / 1 / 1` ✔ |
| normal load, mid-flight | `0.64 / 0.33 / 0` (animating) |
| normal load, settled | `1 / 1 / 1` ✔ |
| tab hidden mid-entrance | `1 / 1 / 1` ✔ |
| JavaScript disabled entirely | `1 / 1 / 1` ✔ |

---

## 3 · The chrome column was a glitch, and it is gone

The hero's left-hand chrome column — added in section 15 — rendered as an oily
dark smear with a stray blue seam where the photograph's sky began. Lucas read
it as a rendering fault, which is the correct read.

Two things were wrong with it. A narrow strip samples mostly the dark end of a
twelve-stop gradient, so the ramp never reverses inside the visible width and
the material never reads as metal. And `--chrome-filter`, which is what makes
it read as metal at all, is applied to the static fallback and not to the
canvas.

The photograph is full-bleed again and the shader is back on `.ch-promise`, the
surface it was designed and contrast-verified for. **Where the hero mechanic
finally lands is a question for the rebuild, not for a bug pass** — a hero
that is about to be redesigned espresso-dominant is not worth polishing twice.
Section 15's flag 15c stands.

---

## 4 · The nav could go invisible, because two clocks had to agree

The bar's legibility depended on two mechanisms with different timing: the
ground (a `background`, animated over 240ms by a CSS transition) and the ink (a
set of custom properties, which flip in a single frame because custom
properties do not transition). While they disagreed the nav was paper on paper.
Under rAF throttling — which is precisely when a scroll is being animated —
that window stretches.

Two mechanisms with different clocks cannot be tuned into agreement; they can
only be collapsed into one. Both transitions are removed, so the ground and the
ink switch in the same frame. Measured across the transition, in both
directions: **zero frames of disagreement**, where before there were up to
three.

Hover transitions stay — hover does not change the ground.

---

## 5 · Upload: not broken the way it looked, broken a different way

The wiring is fine. Every affordance is bound, the selectors match, the
`astro:page-load` re-init is correct, the client/server contract on
`/api/upload` matches exactly, and the endpoint is live in production —
`GET https://visuails.com/api/upload` answers `{"ok":false,"error":"method"}`,
which is a deployed Function doing its job.

What was broken:

**A failed upload deadlocked `/test-sample` and blamed the visitor.** The gate
let the form through only if a file staged, or if the server said
`unavailable`. Every other failure — 404, rate limit, dropped connection —
left the visitor pressing "Next" and being told *"Add at least one product
photo"* after they had added one and watched it fail. That is literally a
button that does nothing. Now: failures the visitor cannot act on let the form
through with a note that the photos will be requested by email; only failures
they *can* fix still block, and those name the actual problem and the actual
limit.

**The client-side caps were documented but did not exist.** `StartPage.astro`
claimed "the browser refuses exactly what `/api/upload` refuses". It did not:
a 40 MB file uploaded in full over 4G before the server rejected it. Both pages
now run the same four checks as the endpoint, in the same order, before the
request exists. Proven with zero network requests on an oversized file.

**`c('s3.prefillNote')` resolved to `''`**, so every returning signed-in
customer got an empty italic paragraph on step 3 — a copy key added to the
markup dictionary instead of the config blob. Moved, and a build-time
assertion now lists every key the client reads and **fails `astro build`** if
one is missing or empty. The class of bug is closed, not the instance.

---

## 6 · The portal, account and admin were still on the old palette

Section 15 moved the marketing site to harbor and did not port the three
stylesheets the Workers serve. So `/o/<token>`, `/account` and `/admin` were
still running the previous OKLCH ink/paper system — the single largest reason
the site did not feel like one thing. Ported in full: palette, the two-size
button system, the select caret, and the focus ring.

Two role confusions surfaced while porting and were fixed: `.pill.is-delivered`
was painting a *ground* with `--ink-100`, which in harbor is paper-on-dark
**body text**; and `admin.js`'s revision note put a cool grey-green panel
inside a warm clay card, visibly two temperatures in one block.

Contrast across all eight rendered surfaces: **0 failures in 263 measured
nodes**, up from 15 — including a `2.42:1` cancelled-order pill and fourteen
placeholders sitting at `4.49:1` against a 4.5 floor.

Still open, and out of scope for a CSS-only pass: the portal renders in a
fallback typeface rather than Archivo, and `.btn` is now a hard 38px while the
`<select>` and an inline-styled `<input>` beside it come out at 40–41px, so
control rows have a 2–3px baseline step. The input's height comes from an
inline `style=` in `src/lib/admin.js`.

---

## 7 · Two overflow bugs, one of them a whole class

A sweep of all 67 routes at 390px found three pages scrolling horizontally.
`body { overflow-x: hidden }` hid the scrollbar and not the problem: the page
still had a right edge the reader could not reach.

**`/compare` and `/nl/compare`** — the converge diagram's end label hangs to the
right of a 2px rule that is the last thing in the lane stack, so at 390px it
hung off the page: 424px (EN) and 433px (NL). Below 620px it now sits inside
the stack, which is the only side there is room on.

**`/nl/terms`** — one word. *"Aansprakelijkheidsbeperkingen"*, 29 characters, in
an `<h2>`, pushed the document to 412px. Dutch builds compounds by grammar
rather than by accident, so every heading on the site is one long word away
from the same thing. Fixed as a rule rather than as a patch: headings take
`hyphens: auto` (real syllable breaks, since `<html lang>` is set on every
page) with `overflow-wrap: break-word` underneath it.

---

## What the final sweep says

All 67 routes, at 1440px **and** 390px, checked for: HTTP status, sections at
zero opacity or hidden visibility, horizontal overflow, `H1` count, any
non-zero computed `border-radius`, JSON-LD presence, interactive controls
covered by another element, visible-but-empty elements, and page/console
errors. Plus every internal link resolved.

**Findings: 0.** The only entries are `/account` and `/account/me` returning
404 — Worker routes that a static `astro preview` does not run.

| Check | Result |
|---|---|
| Contrast, DOM walk, 20 routes EN+NL | 0 real failures |
| Contrast, pixel-sampled sticky nav over photographic heroes | 45 items, 0 failures, tightest 4.61:1 |
| Contrast, 8 Worker-rendered surfaces | 263 nodes, 0 failures |
| Horizontal overflow at 390px | 0 pages |
| Non-zero `border-radius` anywhere | 0 elements |
| LCP, throttled mobile, shader running | `/` 1572ms · `/catalog` 1884ms · `/pricing` 1160ms (budget 2500ms) |
| CLS | 0.0000 on all three |

LCP improved again on all three routes — the hero is one composited layer
lighter without the chrome column.

---

## Lucas's four decisions for the rebuild

Recorded here because the rebuild starts from them, not from this document.

1. **Ground: espresso-dominant**, like OPP — dark as the base surface, paper
   and the mist tints as the exception that lets a section breathe. The palette
   itself does not change; which token is the ground does.
2. **Imagery: hard placeholders.** Sharp neutral blocks labelled with what
   belongs there, filled in later.
3. **Dashboard explanation: public product pages**, OPP-style — pages that
   show and explain the client portal and the admin dashboard.
4. **Order: bugs first, delivered separately.** This document is that delivery.

Section 15's open flags (15a–15n) are unchanged by this pass, except 15c, which
this pass acted on by removing the chrome column rather than by resolving where
the shader belongs.
