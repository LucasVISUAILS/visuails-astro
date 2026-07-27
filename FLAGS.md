# Flag register

Every positioning, pricing, security, correctness and tooling problem raised
during the reposition, in one place. Consolidated 26 July 2026, at the end of
section 12.

The rule that produces this file is in `WORKING-AGREEMENT.md` §2: *"flag anything
considered a positioning or pricing mistake instead of silently working around
it."* In practice the register grew wider than positioning and pricing, because
the same rule applies to anything where a decision would otherwise be made on
Lucas's behalf without him knowing.

Numbering is roman, sequential by the order flags were raised, with gaps where a
flag was closed inside the same report that opened it. `H1`–`H10` are the ten
positioning and pricing flags from `AUDIT-TASK-0.md` §H, which predate the roman
series.

Four states: **NEEDS LUCAS** (blocked on a decision), **OPEN** (known, unfixed,
not blocking), **TOOLING** (about the verification apparatus, not the site), and
**CLOSED**.

---

## NEEDS LUCAS — a decision is blocked on these

**H1 · Package prices are inverted against per-product prices.**
`SUPERSEDED by section 13`, but read it before assuming it is gone. The original
arithmetic: 25 products cost €1,000 à la carte and €1,850 as a Full Drop, so the
package cost 85% more than the same products bought individually, and Full Drop at
20 products (€92.50 each) was dearer per unit than Drop Pilot (€81.25). Section 13
answered it structurally — the drop includes materially more per product
(`DROP_INCLUDES = catalog + lifestyle`) and the two tiers are different service
models rather than volume bands. **What is not answered is whether the resulting
numbers are the ones you want.** They are in `src/data/pricing.js` and nothing has
had your eyes on it since section 13 arrived.

**lxxxv · The upgrade break-even is 23 products, not 19, and the prompt fires
at 12.** `UPGRADE_TRIGGER_PRODUCTS = 12` comes from your section 13 text. The real
break-even against a Drop Pilot is 23. Which number the prompt fires on is yours.
Section 13 says *"Factual, no pressure, once per quarter maximum"*, which reads
like it wants 23.

The half of this that was mine is fixed: the `UPGRADE_BREAK_EVEN` docstring in
`pricing.js` no longer claims 19 is the answer, and the prompt itself now sidesteps
the question — it names the crossover instead of claiming a saving, so it is true
at 12 and at 30 and under either VAT reading. See cxxix. What is still yours is
whether a brand at twelve products should be hearing from us at all.

**cxxii · `.btn` and `.card` hover and press went 450ms → 120ms; `.site-header`
450 → 240ms.** The most-touched elements on the site and the most noticeable
change in the motion pass. 450ms on a button press is genuinely laggy and 120ms is
the correct number, but it is a large step and it is built but not committed.
`REPORT-SECTION-11.md` §8.

**cxi · The universal 16px rise is gone from 171 non-group reveals.** Sections now
fade in without translating; groups keep the rise and the stagger. This is
DESIGN.md's *"one identical entrance applied uniformly is the tell"* applied
literally, and it is the change most likely to read as "something is missing."
One rule to put back.

**cxviii · The rest of the sitewide retimings.** Accordion icon 400 → 240ms; nav
drawer and conversion bar 400 → 450ms; guide cards, source buttons, quiz choices,
doors, rail items and portal buttons 200–250 → 120ms; both progress bars → 120ms;
image zooms → 900ms. `REPORT-SECTION-11.md` §8.

**lxxxix · The KOR.** Section 14 assumes you are registered for VAT and **not** on
the small-business scheme. If that is wrong, everything in section 14 inverts.
Half-closed: you deferred section 14, so it is not blocking today.

**xlii · The payment processor is undecided.** Blocks section 14 and blocks
anything that takes money.

**xxxviii · "single-use on issue" has two readings.** The portal token is
generated once and reused for the life of the order (what is built), or it is
consumed by first use (what the phrase can also mean). If you meant the second,
the portal is wrong.

---

## OPEN — known, unfixed, not blocking

**xix ·** `.rc-num` numerals are unstyled — they inherit body figures where the
rest of the site uses tabular.

**xxxvii ·** `PRODUCTS_PER_DAY = 18` in the capacity gate was set as a placeholder
and has never been checked against what you can actually finish. This is the
constant the 48-hour drop promise rests on. See also H4.

**xxxix ·** `public/portal.css` uses the fallback font stack rather than Archivo,
because the portal is served outside Astro's bundler and cannot reach the
`@fontsource` files. Fixing it needs a working npm.

**xli ·** The portal serves full-resolution delivery images as previews whenever
`preview_key` is null. A client's browser downloads the deliverable to render the
thumbnail.

**xliv ·** Nothing sweeps abandoned `intake/<batch>/` prefixes in R2. An upload
that is started and never confirmed stays there permanently. Needs an R2 lifecycle
rule, which is a dashboard setting rather than code.

**lvi ·** The `:not()` selector in the door rows cannot be verified in this
container — no browser, no build. It is correct by reading and unproven by
running.

**lxiii ·** 12-month delivery retention is published in four places and enforced
by nothing. There is no job that deletes anything. Pages Functions has no cron
triggers, so this promise is kept by hand or not at all. `check_promises.py` now
holds the ten statements of it — five English, five Dutch, across both privacy
pages and both terms pages — to each other, so they cannot drift apart; it
deliberately does NOT invent a `RETENTION_MONTHS` constant, because a constant
nothing reads would dress the gap up as an implementation. The ratchet is the
only thing standing here: the number is still enforced by a human remembering.

**lxiv ·** Nothing ever writes `order_tokens.revoked_at`. The column exists, the
revocation path does not.

**lxxv ·** A failed `orders` INSERT still yields a dated confirmation to the
customer. The date comes from the gate, which succeeded; the order does not exist.

**lxxxvii ·** *"re-validate quarterly"* (VAT numbers) needs a cron-triggered
Worker. Pages Functions have no cron triggers, so this needs a separate Worker or
an external scheduler.

**lxxxviii ·** *"sequential invoice numbers, no gaps"* on D1, which has no
sequences. Needs a transactional counter row and a documented recovery path.

**xc ·** The video price appears in both tiers. `/video` says "from €49 / video"
while video is also a priced add-on inside a drop, so the site quotes two
different things for the same word.

**xci ·** `/terms` §4 says prices are "exclusive of VAT" as a blanket statement.
Under section 13, Tier 0 prices are inclusive. The terms page contradicts the
pricing page.

**xcii ·** The VAT field is on `/start` step 3. Section 14 says it belongs on the
CONFIRM step.

**xciii ·** `orders.total_cents` is written by nothing.

**xcviii ·** Brief sections 11 and 12 have no surviving text. Section 11 was built
from DESIGN.md's own motion block, which is authoritative and specific, so the
exposure is small. **Section 12 is a reconstruction** — `WORKING-AGREEMENT.md`.
The exposure there is not small.

**cvi ·** `Layout.astro` has no skip link. Accessibility; found while working in
that file during the motion pass.

**cvii ·** Lenis is not being added. Decision, with reasons:
`REPORT-SECTION-11.md` §9.

**cix ·** `::view-transition` runs at `--dur-3` (450ms) where DESIGN.md files page
transitions under `--dur-4` (900ms). Deliberate departure — doubling it would
double the time between a click and a readable page.

**cxiv ·** Ambient infinite loops (the hero cue line, the compare slider's idle
demo) are exempt from the four-duration scale, on the principle that the scale
describes arrivals and a loop never arrives. `check_motion` prints both by name
every run so the exemption stays visible.

**cxxvi · The Dutch word "Timing" was shipped untranslated on two live pages.**
Found during the section 13 sweep, fixed, and the reason it survived is the part
worth keeping: the label was typed into the markup while the sentence beside it
came from `pricing.js`, so every check that reasons about *values* saw a correct
tier and said nothing. It is now derived along with the row it labels, which means
the class of bug — a hand-typed label next to a generated value — cannot recur on
these rows specifically. It can still recur anywhere else.

**cxxvii · `/pricing`'s Tier 0 block has no review row; `TierCompare` has one.**
The same tier makes the human-checked claim on three pages and stays silent about
it on a fourth. Both are defensible in isolation — `/pricing`'s block is a price
list, `TierCompare` is a comparison — but a reader who visits both sees Tier 0
claim human review only when it is standing next to Tier 1, which is the reading
you would least want. One row to add or one to remove, and it is a copy decision
rather than a bug.

**cxxviii · `TIERS.*.yieldsToAttended` is read by nothing.** It looks like the
switch that implements section 13's *"always yields to Tier 1 in the capacity
gate"* and it is decorative; the real mechanism is `QUEUE_FLOOR_PER_DAY = 3` in
`src/data/capacity.js`, which reserves throughput no attended window may take.
Left in place with a comment saying so at both declarations, because it names a
true property of the tier and a reader who finds only the number in `capacity.js`
has to reconstruct which direction it protects. Flagged rather than deleted, and
flagged rather than wired — wiring it would mean two places to change the gate.

**cxxix · The upgrade prompt deliberately does not say what section 13 says.**
Your example sentence is *"You've ordered 14 products this quarter. A Full Drop
covers 25 for less."* At the trigger that is false — 14 × €99.98 is €1,399.72,
which is less than €1,850, not more — so the built sentence names the crossover
instead: *"…costs less from 23 products on."* This also survives section 14: Tier 1
is quoted excl. VAT and Tier 0 incl., so the like-for-like crossover for a business
that reclaims is 23 rather than 19, and any saving claim between the two would be
wrong for exactly the customer most likely to check it with a calculator. The
substitution is mine, it contradicts your text, and it is one sentence to change
back if you would rather have yours.

**cxxx · The once-per-quarter rule is held down by review, not by a test.** The
prompt fires at most once per brand per quarter, and the thing enforcing it is the
`WHERE` clause of a compare-and-set `UPDATE` in `functions/api/order.js`. The test
harness's fake D1 routes on SQL fragments and never evaluates a `WHERE`, so a
mutation that relaxes that guard is invisible to it — the one mutation the block
would most like to make. Everything *around* the query is covered; the query's own
condition is not. Written down rather than papered over.

**cxxxvi · The client portal is finished and no client can reach it.** Nothing in
the codebase ever writes a row to `order_tokens`. The table is created by
`0001-section-10-pipeline.sql:36`, read on every lookup at `src/lib/portal.js:447`,
and its use counter incremented at `:483` — the read side is complete and correct.
The write side does not exist. `mintToken()` at `src/lib/token.js:60` is real and
sound, but its only caller is `src/lib/uploads.js:81`, where it generates upload
*batch* ids, not portal tokens. So the sequence is: order lands, order closes,
and there is no URL to put in the delivery mail. This does not block the deploy —
the site, the order pipeline and the capacity gate are all unaffected — it blocks
the first real delivery to a Tier 1 client, which is a different and later day.
Whatever closes an order has to mint a token, store its SHA-256, and put the URL
in the mail; flag **xxxviii** (which reading of *"single-use on issue"* was meant)
has to land first, because it changes what that code does. Found by walking every
table in the schema and asking which ones nothing writes to, rather than by
reading the portal, which looks complete from the inside.

**Low priority:** **lv** `.opt` radios paint as squares in some engines · **lvii**
`shoot_start.py` never regenerates `slices/` · **lxvi** the dead `.ba*` slider
family is still in the tree (`.ba-knob` is load-bearing for a mutation-harness
case, so it cannot simply be deleted) · **finding 12** `/pricing` shows "FROM €650"
directly above an €1,850 total · **cxxxi** `shouldPromptUpgrade` reads *"crosses
12"* as `>= 12`; `> 12` is a one-character change and one product either side
changes nothing about whether the sentence is worth sending.

---

## TOOLING — about the verification apparatus

**lxii · The remaining regex verifiers are unaudited for comment-blindness.**
**Urgent.** The class has now bitten twice: once in a one-shot patch script (cxxiii)
and once in a live suite verifier (cxxiv). Both directions are wrong and only one
is loud — prose reported as code sends someone to fix working code, while a
declaration inside a commented-out block silently resolves a real orphan and the
check goes quiet about exactly the rot it exists to find. `vlib.strip_comments` is
the fix and it exists.

**cxv ·** `verify3.py` still scans `<style>` blocks with a naive `<style[^>]*>`
pattern. `vlib._regions` is the correct walker — it tracks quote and brace depth
in the opening tag and skips self-closing tags — and is already in use in
`check_motion`.

**lxix ·** `class_census.py` has no mutation harness.

**verify2.py has no mutation harness**, and now carries an unharnessed fix
(cxxiv). New this section.

**lxxiii ·** `pipeline.js`'s selectors are swept by no verifier. Partially
addressed.

**lxxiv ·** `test_portal.mjs` has no ROOT seam, so it cannot be pointed at a
staged copy and therefore cannot be mutation-tested.

**xcvii ·** Several harnesses `sub()`-prepend text into line-anchored files, which
works but shifts every line number below the insertion. Fragile in a way that will
eventually produce a confusing failure.

**xxix ·** `/tmp/desc_slug.mjs` re-implements the logic it is supposed to verify,
so it agrees with the code by construction rather than by checking.

**lxxxiv ·** `device_stage_files` silently serves a stale staged copy rather than
re-fetching. Mitigated by gating on mtime via `verify_sync.py --newer-than`.

**cxxiii ·** `/tmp/_patch_dur_alias.py`'s final sweep is comment-blind. One-shot,
already run, low.

**cxxxii · A docstring was false for months because its subject was accidentally
correct.** `customerEmail()` in `order.js` stated that the Tier 0 timing paragraph
*"is assembled from TIERS in src/data/pricing.js and is never typed here"* while
that branch was two string literals. The literals happened to match `TIERS`
byte-for-byte in both languages, so nothing rendered wrong and nothing would ever
have gone red. Fixed — the branch now goes through `tierRow()`/`turnaround()` with
byte-identical output, and a mutation case pins it. Kept as a tooling flag because
the class is general: **no check in this repo compares a comment to its subject**,
so a docstring is only as true as the last person who read both.

**cxxxiv · Four citations in `REPORT-SECTION-14-VAT.md` went stale, and the only
thing that noticed was the checker written to notice.** Section 13's work added a
ten-line comment block to the head of `src/data/pricing.js`, which shifted every
line below it by ten. §6 of the VAT report cites four of those lines by number —
`:699`, `:704`, `:582`, `:651` — and all four now pointed at the wrong code. The
report still read as true, because the *claim* was true; only the addresses were
wrong, which is the failure mode a reader cannot catch, because checking it means
opening a second file and counting. Fixed in both places (report and
`check_report14.py`'s table, now `:709`, `:714`, `:592`, `:661`). Kept as a
tooling flag because the class is general and unsolved: **every line-anchored
citation in every report in this repo is one unrelated insertion away from
lying**, and `check_report14.py` is the only file that holds any of them. The
other reports cite nothing by line number today; if one starts to, it needs its
own checker or it will rot the same way. Related to **xcvii**, which is the same
hazard pointed the other way.

**cxxxv · A checker skipped the one case it was written for, and said nothing
while it did.** `check_lang_parity.py` pairs each `en:` object literal with the
next `nl:` one and compares their shapes. A branch with no sibling was `continue`d
— not compared, not counted, not mentioned. So the single likeliest way this site
loses parity, *English written and Dutch not written yet*, was the one case that
produced no output at all. Worse, the census line moved with it: deleting an
entire Dutch branch took the count from `19 paired en:/nl: objects, 521 top-level
keys` to `18 … 518` and the checker still printed **OK** underneath. The number
that would have shown the loss was printed on the same line as the verdict that
denied it.

Nothing found this in months of green runs. What found it was writing the
mutation harness down: `mutate_check_lang_parity.py` failed three of its nineteen
cases on first execution — unpaired `en:`, unpaired `nl:`, whole Dutch branch
deleted — all three exiting 0. Fixed with an `unpaired-branch` rule that reports
leftovers by name and line.

Two things are worth keeping from the repair. **The census is now pinned exactly
and the key count deliberately is not.** Paired objects are structural and change
a handful of times in the life of the site, so an exact pin costs one line of
maintenance per event; copy keys change on ordinary edits, and *a number that goes
red on every edit gets bumped without being read, which is worse than no number at
all*. A floor still catches the thing that matters there — a parser that finds the
braces and has stopped reading between them loses hundreds of keys, not twenty.

**The same defect class then turned up one level up, in `run_suite.sh` itself.**
A suite listed in a loop whose file had vanished from `/tmp` was skipped in
silence: the run stayed green and simply got shorter. Fixed with a loud `GONE`
for any listed-but-missing file, plus an exact `EXPECT_SUITES` pin — `want()`
cannot see a name *deleted from a loop*, which is the "this one is flaky, I'll
take it out for now" failure, and the pin can. Both guards were negative-
controlled on trimmed copies before being trusted.

Kept as a tooling flag rather than closed, because the class is general and this
is its third instance: **a check that skips is indistinguishable from a check that
passes, and every skip in this repo is a place where absence of evidence is
printed as evidence of absence.** Both checkers now have meta-tests
(`sabotage_lang_parity_check.py`, `sabotage_check_links.py`); the rest of the
suite has not been swept for silent skips.

**cxxxviii · A rejecting case can pass on somebody else's finding.** Every
mutation harness in this suite judges a "must be caught" case the same way: run
the checker, confirm a non-zero exit, then confirm an expected string appears in
the output. That last step is a substring over the WHOLE output, so a case whose
own defect went completely undetected still passes as long as *something else*
in the run produced a matching message. `sabotage_astro_expr_check.py` proved
this is not theoretical — with one mechanism disabled, the mutated defect went
unreported and eleven unrelated findings of the same kind took its place, and the
harness reported all eighteen cases judged correctly. Fixed in
`mutate_check_astro_expr.py`, which now requires **exactly one** finding, in the
file its own mutation was written into, of exactly the kind named. **The other 23
mutation harnesses have not been swept for this.** It is the same shape as
cxxxiii and cxxxv: an assertion loose enough to be satisfied by the wrong
evidence.

**Low:** **lxxvi** `order.js`'s `if (gate.window && orderId)` is redundant ·
**lxxvii** `order.js`'s `isWellFormedBatch(batch) ?` pre-check is redundant ·
**cxxxiii** `mutate_check_derived_copy`'s control case asserted a typed file count
and went red when a component was added; it now derives the count from the stage
and asserts a floor, but the same typed-count pattern may exist in other harnesses.

---

## CLOSED

**H2** shoot-day anchor — itemised on the page rather than narrowed, so the range
is defensible. **H3** the founding offer scoped to a free Drop Pilot in exchange
for a published case study. **H5** `/compare` rewritten to shoot-day-vs-VISUAILS
while keeping a shorter self-serve-tool section. **H6** video is a priced add-on
to a drop — but see **xc**, which is the residue. **H7** retention split: sources
90 days, deliveries 12 months — but see **lxiii**, which is the residue. **H8**
`/custom-models` kept as the live URL, `/models` 301s to it. **H9** the AI Act
compliance claim rewritten to the factual version. **H10** the radius and
`--success` sweeps completed.

**cv · CORRECTED, not merely closed.** Reported as *"the site renders blank
without JavaScript."* That was **overstated.** The site rendered correctly with JS
disabled; the real hole was narrower — JS running while the module failed to load
left 203 `reveal pending` elements at `opacity: 0`. Fixed by scoping every reveal
rule behind `.js`. The register keeps the correction rather than the original
claim.

**lxviii · CORRECTED.** Four pages were reported as ignoring
`prefers-reduced-motion`. They were not — they are covered by the global `*` nuke.
The real defect was different and narrower: the reduced-motion block set durations
but not `animation-iteration-count`, so a `.001ms` animation that was still
`infinite` did not stop. Fixed.

**xl · CORRECTED.** Both halves were false by the time anyone read them again,
and both were written before section 10 built the thing that falsified them.
`orders.lang` **is** read — `src/lib/portal.js:445` selects it and `:293`/`:330`
use it to pick the portal's language, which is the whole reason it is stored at
order time. And the rate-limiter salt does **not** reset on a cold start:
`getSalt()` writes it with `INSERT OR IGNORE INTO app_settings` and then SELECTs
the winner back, so `saltCache` is a per-isolate cache in front of a persisted
value, not the value itself. Found while verifying `BACKEND-SETUP.md` against
the code rather than against this file. **This is flag cxxxii's shape one level
up: a claim about the code that nothing compares to the code.**

**cxvi ·** `check_motion.py` read one stylesheet of fifteen and printed OK on a
tree carrying 58 violations. Fixed, and the fix generalised into the blindness
floors every checker now carries.

**cxvii ·** Four animations were moving layout properties (`width`, `max-height`,
`margin`). Fixed; the WhatsApp launcher was redesigned rather than retimed.

**cxix ·** `check_motion.rules()` had an off-by-one in its region walker.

**cxxi ·** The `--dur` alias mapped to `--dur-3`, putting four hover states at
450ms during a pass whose purpose was to put hover states at 120ms. Retired, and
`check_motion` check 9 now refuses any `--dur*` token that does not name a step,
at both definition and call sites. **An alias is invisible to every check that
reasons about values, because it has a valid value — only a by-name check catches
it.**

**cxxiv ·** `verify2.py`'s var()-resolution check read raw source and was
comment-blind. Fixed via `vlib.strip_comments`. Promoted **lxii** to urgent.

**cxxv ·** `mutate_check_motion.py` had one case for a three-element banned tuple,
so two thirds of the ban could be deleted with all 38 cases still reporting
correct. Found by a negative control against the meta-test. Closed with two new
cases plus a permanent sabotage. **A checker that tests a collection through one
element has an untested collection.**

**cxxxvii · The first compile found a defect class that 38 checkers could not
see, and there were two of them.** `npm run build` on Lucas's machine stopped at
`HomePage.astro` with `Expected ")" but found "$render"`. The cause was one
`{/* … */}` comment written inside a JavaScript expression instead of inside
markup. `{/* … */}` is an Astro comment **only when it is a child of markup**;
inside an open expression the `{` is an ordinary JS brace, Astro passes the text
through untouched, and esbuild reads `( {} $render\`…\` )`. Nothing in the repo
modelled that distinction, so nothing could have caught it — and a second,
identical instance was sitting in `StartPage.astro`'s doors map, primed to break
the very next build. Both fixed. `check_astro_expr.py` now models markup-vs-
expression context across all 63 templates; `mutate_check_astro_expr.py` holds
eighteen cases against it, ten that must be caught and eight legal look-alikes
that must not be; `sabotage_astro_expr_check.py` disables six of the checker's
mechanisms in four rounds and requires the harness to notice each one. Three
notes worth keeping:

- **The reported line was not the defect's line.** `compressHTML: true` collapses
  static markup whitespace, so the generated JS runs far shorter than the source
  through a template region. esbuild said 491; the source line was 572. Do not
  trust the number as an offset into the `.astro` file — trust the file name and
  read for the construct.
- **The checker found the real defect on its first run, and also shipped six
  false positives.** "It fired correctly once" is exactly what a broken version
  of this checker looks like too. That is why the meta-test exists and why round
  C pins the false positives specifically.
- **Two of the checker's six precision mechanisms cannot be proven by a legal
  case.** Getting the tag stack wrong can only ever push a level that should not
  exist, too many levels reads as markup, and markup accepts — so the only
  symptom is a real defect going unreported. Both are mapped to rejecting cases,
  in a round of their own. The harness carried the opposite mistake until the
  meta-test ran: its void case was written `<img … />`, which short-circuits
  before the VOID set is consulted, so it named one mechanism and exercised
  another and could not have failed either way. **A name is not a mechanism.**

Residue: **cxxxviii**, the loose reason-check the fix exposed, which is a
property of every other harness too.
