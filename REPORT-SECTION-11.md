# Report — section 11, motion

Written 26 July 2026, against an uncommitted working tree: 18 files changed,
+388 / −85. Nothing in this report has been synced to your machine yet.

Section 11 is the motion pass. DESIGN.md files it as *"the **last** section of the
reposition to be implemented, after the visual system is settled, so it is tuned
against real surfaces rather than guessed"* — so this is motion applied to pages
that already exist, not motion designed in the abstract.

The short version: there is now a four-step duration scale and a three-curve ease
set, every moving rule on the site has been moved onto them, three animations that
broke the system's own rules were fixed, one dead animation was deleted, and the
whole thing is held in place by a checker, a 40-case mutation harness, and an
11-sabotage meta-test. The full suite is **42 green.**

The part that needs your eyes is section 8. Some of this is visible.

---

## 1 · The scale

`src/styles/global.css` `:root` now carries this, matching DESIGN.md's fenced
block exactly:

```css
--ease-out-quart: cubic-bezier(0.25, 1, 0.50, 1);
--ease-out-quint: cubic-bezier(0.22, 1, 0.36, 1);
--ease-out-expo:  cubic-bezier(0.16, 1, 0.30, 1);

--dur-1: 120ms;   /* state:   hover, focus, press */
--dur-2: 240ms;   /* element: reveal, expand, swap */
--dur-3: 450ms;   /* section: scroll reveal */
--dur-4: 900ms;   /* chrome, hero, page transition */

--ease: var(--ease-out-quint);
```

Three curves, increasing in how hard they brake. Quart for short state changes
where a hard brake reads as a snap, quint as the default, expo for the long moves
where the deceleration *is* the effect.

The four durations are the load-bearing decision, and the rule is: **duration
encodes role, not taste.** You do not ask "should this be fast or slow", you ask
"is this a state, an element, a section, or the chrome", and the number follows.
That is what makes the scale enforceable — a reviewer can check a duration against
what is moving, which is not possible against a preference.

`--ease` predates the scale and is used in 34 places. It is now an *alias* to
`--ease-out-quint` rather than a second definition, so the curve exists exactly
once and the two names cannot drift apart.

There is deliberately **no matching `--dur`**, and that turned out to matter — see
section 5.

`--ease-in-out: cubic-bezier(0.7, 0, 0.2, 1)` survives as the one symmetric curve,
legal only where both ends are rest rather than arrival. It is used three times:
the hero cue line, the magnet's return-to-rest, and the compare slider's idle
demo. An entrance that eases *in* starts by accelerating away from nothing, which
is the "sliding in from off-stage" tell the ease-out rule exists to kill.

---

## 2 · The GSAP vocabulary, and an off-by-one that would have shipped

`src/scripts/motion.js` had hardcoded ease strings scattered through five
functions. They are now one object at the top of the file:

```js
const EASE = { quart: 'power3.out', quint: 'power4.out', expo: 'expo.out' };
```

**GSAP's power eases are off by one against their mathematical names.** `power1`
is quad, `power2` is cubic, `power3` is quart, `power4` is quint. Every hardcoded
`'power2.out'` in that file was therefore a *cubic* ease sitting next to CSS rules
running quart and quint — close enough that nobody would ever have seen it, and
wrong in a way no visual review catches. The object states the pairing in a
comment so the next person does not have to re-derive it:

```
EASE.quart  power3.out  ==  --ease-out-quart  cubic-bezier(0.25, 1, 0.50, 1)
EASE.quint  power4.out  ==  --ease-out-quint  cubic-bezier(0.22, 1, 0.36, 1)
EASE.expo   expo.out    ==  --ease-out-expo   cubic-bezier(0.16, 1, 0.30, 1)
```

`'none'` is the fourth legal value and means something different — constant
velocity, for motion that is scrubbed or mechanical rather than arriving.

---

## 3 · Four fixes in motion.js

**The `EASE` vocabulary**, replacing every hardcoded power-ease string across
`heroCover()`, `chapterHeads()`, `spread()`, `staggerGroups()` and `marquee()`.

**The `.ch-orb` bloom, removed.** `chapterHeads()` carried a tween on `.ch-orb`
guarded by `if (orb)`. No page has produced a `.ch-orb` element since the markup
and the stylesheet moved on — the tween outlived both. I removed it rather than
re-pointing it: a guard that can never be true reads as a feature under a
condition, and there is no condition.

**`round 14px` removed from the contact-sheet spread.** The clipPath was
`inset(52% 6% 6% 6% round 14px)`, which put a 14px radius on every frame for the
1.1 seconds the sheet took to open. A rounded corner is not less of a rounded
corner for being temporary, and radius 0 is section 1 of the system. Now
`inset(52% 6% 6% 6%)`.

**The comet — the file's only two actual rule breaks.** The stroke ran on
`power2.inOut`; it now runs on `'none'`. A line drawing itself is a mechanism, not
an arrival: a pen moves at the speed it moves, and a tip that decelerates over the
last third reads as the stroke running out of ink. The head ran on `back.out(2)`,
which overshoots to roughly 1.3× and settles back — banned outright by
DESIGN.md's *"Nothing overshoots — overshoot is playfulness, and this brand's
argument is control."* It is a dot the size of a full stop, so the bounce was the
only part of it anyone would ever have noticed. Now `EASE.quart`.

---

## 4 · The reveal inversion

DESIGN.md: *"Reveal animations must enhance an already-visible default."*

203 elements on this site carry `reveal pending` in the **server-rendered** HTML.
`.reveal.pending { opacity: 0 }` was unconditional, so the hiding shipped in the
CSS and the un-hiding depended on JavaScript running. Transitions pause on hidden
tabs and never fire in headless renderers. Any path where `interactions.js` did
not execute left 203 elements at `opacity: 0` — a blank page that is technically
fully populated.

Every reveal rule is now scoped behind `.js`, which JavaScript adds to `<html>`.
The hiding is opted into by the thing that can undo it. With no JS the content is
simply visible, which is the correct default.

The same inversion was applied to `.reveal-mask`, the media reveal.

---

## 5 · Three entrances instead of one

DESIGN.md: *"stagger within a single list is legitimate but one identical entrance
applied uniformly is the tell."*

The old rule gave **every** revealed element a 16px rise plus a fade. One
entrance, 203 elements, no relationship to what was being revealed. That is the
uniform reflex, precisely.

It is now three moves, each tied to what it reveals:

A plain `.reveal` fades only — `opacity` over `--dur-3` on quint. No translate.
A section arriving is not a section sliding in.

A `.reveal-group > .reveal` keeps the rise and the 80ms-per-child stagger, because
there the movement describes something true: a group is a list, its children have
an order, and the stagger is that order made visible.

A `.reveal-mask` scales its image from 1.18 to 1 over `--dur-4` on expo — the one
entrance that moves a photograph, and the one where the long deceleration is the
whole effect.

**This is the aesthetic change most likely to read as "something is missing."**
The universal 16px rise is gone from 171 non-group reveals. It was doing very
little and doing it everywhere; if you want it back, say so and it is one rule.

---

## 6 · The `--dur` alias, and why it is not coming back

The old codebase had a single `--dur: 0.45s`. In the retokenisation it became
`var(--dur-3)`, which is arithmetically correct and was the wrong thing to do.

`--dur` was on `.btn`, `.card`, `.site-header` and both gallery filter bars. Those
are hover and press states. Mapping the alias to `--dur-3` put **four hover states
at 450ms on a pass whose entire purpose was to put hover states at 120ms** — and
it did so invisibly, because `--dur-3` is a perfectly valid token with a perfectly
valid value.

**An alias is invisible to every check that reasons about values, because it *has*
a valid value.** Only a by-name check catches it. `check_motion` check 9 now
refuses any `--dur*` token that does not name a step, at both the definition site
and every call site, so the alias cannot be reintroduced.

The consequence of removing it is real and visible — section 8.

---

## 7 · The sitewide pass

Fourteen stylesheets carry motion. The pass touched all of them.

```
17  src/styles/global.css          8  src/layouts/Layout.astro
 4  src/components/StartPage.astro 2  src/pages/test-sample.astro
 2  src/pages/nl/test-sample.astro 1  public/portal.css
 1  src/components/FaqPage.astro   1  src/components/PricingPage.astro
 1  src/pages/gallery.astro        1  src/pages/guides.astro
 1  src/pages/nl/gallery.astro     1  src/pages/nl/guides.astro
 1  src/pages/thank-you.astro      1  src/pages/nl/thank-you.astro
```

Four other things came out of it.

**Four layout-property animations, fixed.** DESIGN.md restricts animation to
`transform`, `opacity`, `filter`, `clip-path`, `mask`. Four rules were animating
`width`, `max-height` or `margin`, each of which forces layout on every frame.

**Bare timing keywords, gone.** A `transition` shorthand with a duration and no
timing function silently runs on CSS `ease`, which is `cubic-bezier(.25,.1,.25,1)`
— an ease-**in**-out. Several rules were doing this: an entrance that accelerates
away from nothing, shipped by omission rather than by decision.

**The WhatsApp launcher was redesigned rather than retimed.** Its hover gesture
was a pill widening to reveal a label, which animates `width`. It is now a fixed
48px square with the label wiped in by `clip-path`. Same idea, no layout.

**Reduced motion is complete, not merely present.** A `.001ms` animation that is
still `infinite` does not stop — it runs a thousand times a second forever. The
`prefers-reduced-motion` block now sets `animation-iteration-count: 1 !important`
alongside the durations. The chrome field freezes rather than vanishing, per
DESIGN.md.

**Two ambient loops are exempt from the scale, on principle.** The hero cue line
and the compare slider's idle demo run 1.8s and 7s. The four-step scale describes
*arrivals* — a thing moving from absent to present. A loop never arrives, so
asking which of the four steps it belongs to has no answer. `check_motion` prints
both by name every run, so the exemption is a visible list rather than a silent
hole.

---

## 8 · What you will actually see

This is the part I would like you to look at before it is committed.

**`.btn` and `.card` hover and press went from 450ms to 120ms.** The site header's
scrolled state went from 450ms to 240ms. These are the most-touched elements on
the site and this is the single most noticeable change of the whole pass. 450ms on
a button press is genuinely slow — you can feel the lag between click and
response — and 120ms is the correct number for a state change. But it is a large
step and you should feel it before it ships.

Also changed: the accordion icon 400 → 240ms; the mobile nav drawer and conversion
bar 400 → 450ms; guide cards, source buttons, quiz choices, doors, rail items and
portal buttons all 200–250 → 120ms; both progress bars 180ms and 500ms → 120ms;
image zooms on `.make-tile` and `.sp-media` → 900ms.

And from section 3: the chapter-head orb bloom is gone, the comet's stroke is now
linear with a head that no longer bounces, and the contact-sheet spread no longer
rounds its corners mid-open.

---

## 9 · Two departures from DESIGN.md, both deliberate

**`::view-transition` runs at `--dur-3` (450ms), not `--dur-4` (900ms).**
DESIGN.md files page transitions under `--dur-4`. The site was already at 0.5s;
`--dur-3` keeps what it does, `--dur-4` would double the time between a click and
a readable page. I would rather depart from the document than make navigation feel
slower, but it is a departure and it is flagged rather than quietly taken.

**Lenis is not being added.** The impeccable skill lists it among libraries for
advanced motion. Three reasons against: DESIGN.md never mentions it; npm is
returning 403 in this container so it could be neither installed nor verified; and
a scroll-hijacking rAF loop runs directly against the *"LCP under 2.5s on mobile
4G with the shader running"* constraint. The native scroll is fine and the shader
is the expensive thing on this page. This is a decision, not an oversight — if you
want smooth scroll, say so and it goes on the list for a session with a working
registry.

---

## 10 · How this is held in place

Three layers, all green, all wired into the suite.

**`check_motion.py`** — 9 checks over every stylesheet on the site. Current
census: 42 moving rules across 14 stylesheets, 9 motion tokens.

**Its first version read one file and printed OK on a tree carrying 58
violations.** That is the defect worth remembering from this whole section: a
checker scoped to one file does not find fewer bugs than no checker, it finds none
and says so in green. The checker now has two blindness floors — a minimum
stylesheet count and a minimum rule count — that make a narrowed harvest fail
loudly on a *healthy* repo, so the failure mode cannot recur silently.

**`mutate_check_motion.py`** — 40 deliberately broken copies fed to the checker
through a path seam. 32 must be rejected with a specific stated reason, 8 must be
accepted with byte-identical output. Asserting the *reason* rather than the exit
code is what catches a check that has been disabled while a different check
happens to still fire on the same mutation.

**`sabotage_check_motion.py`** — 11 weakened copies of the *checker*, each testing
that the harness notices. This exists because a harness reporting 38/38 against a
checker whose conditions have been turned into `if False` would reproduce the
original failure one layer up, and would look greener doing it.

**The meta-test was green on its first run, which is not evidence.** So I planted
a negative control I was not confident would be caught: narrowing check 8's banned
ease tuple from `('back.', 'bounce.', 'elastic.')` to `('back.',)`. The meta-test
correctly went red — proving it can — **and in doing so found a real gap.** The
harness had a single case for that three-element ban, so two thirds of it could be
deleted with all 38 cases still reporting correct. That is the harness-shaped
version of the same scope defect the checker started with. Closed with two new
cases; the sabotage is now permanent so they stay honest.

**The rule this generalises to: a checker that tests a collection through one
element has an untested collection.** And: a test that has only ever been green is
a claim, not evidence — the way to convert it is a negative control.

---

## 11 · One bug this pass surfaced elsewhere

`verify2.py` went red mid-pass with `unresolved var(): ['--dur']`. There is no
live `--dur` anywhere — the reference it found was **inside the comment explaining
why `--dur` was retired.**

Its var()-resolution check rebuilt its file list from raw source with no comment
stripping, thirty lines below the same file already stripping comments for a
different check. Comment-blindness has two directions and only one is loud:

- prose reporting as code sends someone to fix working code (this is how it
  surfaced), and
- a **declaration** inside a commented-out block silently resolves a real orphan,
  so the check goes quiet about exactly the rot it exists to find.

The second is the expensive one and nothing reports it. I probed it: all 72
declarations on the site survive stripping, so it is currently empty — but that
was true by luck rather than by construction. Fixed by routing the loop through
`vlib.strip_comments`. **This is the second time this class of defect has bitten,
so auditing the remaining regex verifiers for it moves from housekeeping to
next-session work.**

---

## 12 · Flags

Open, needing you:

- **(cxxii)** `.btn` / `.card` hover and press 450 → 120ms, `.site-header`
  450 → 240ms. Aesthetic, needs your eyes. Section 8.
- **(cxi)** the universal 16px rise is gone from 171 non-group reveals. Aesthetic.
- **(cxviii)** the sitewide retimings listed in section 8. Aesthetic.
- **(cvii)** Lenis is not being added. Decision, section 9.
- **(cix)** `::view-transition` at `--dur-3` rather than DESIGN.md's `--dur-4`.
  Decision, section 9.
- **(cxiv)** ambient infinite loops exempted from the four-duration scale.
  Principle, section 7.
- **(cvi)** `Layout.astro` still has no skip link. Accessibility, unrelated to
  motion, found while working in that file.

Open, tooling:

- **(cxv)** `verify3.py` still scans `<style>` blocks with a naive `<style[^>]*>`
  pattern. `vlib._regions` is the correct walker and is already in use in
  `check_motion`; verify3 has not been moved over.
- **(cxxiii)** `/tmp/_patch_dur_alias.py`'s final sweep is comment-blind. One-shot
  script, already run, low.
- **(lxii)** the remaining regex verifiers are unaudited for comment-blindness.
  **Now urgent** — see section 11.

Fixed this section: (cxvi) the one-file harvest; (cxvii) four layout-property
animations; (cxix) a `rules()` off-by-one; (cxxi) the `--dur` alias; (cxxiv)
verify2's comment-blindness; (cxxv) the harness's untested ban tuple.

**A correction to an earlier flag.** (cv) was reported as *"the site renders blank
without JavaScript."* That was **overstated.** The real hole was narrower: the
site rendered correctly with JS disabled, but broke when JS ran and the module
failed to load — which is the `.reveal` inversion in section 4, now fixed. I would
rather correct the record than leave a scarier claim standing because it was
convenient.

---

## 13 · State

Not committed. Not synced. `git status` shows 18 modified files against HEAD
`a877a1b`; the container is on `master` with no remote, your folder is on `main`.

Suite: **ALL GREEN — 42 suites.** Seven node suites, fifteen static verifiers,
fourteen mutation harnesses, six meta-tests.

Sections 12 (working agreement) and 13 (service tiers) are next, then the sitewide
inconsistency and bug check you asked for. Section 14 stays deferred.
