# Working agreement

**Section 12 of the repositioning brief. This document is a RECONSTRUCTION.**

The raw text of brief section 12 was pasted into a conversation and never saved to
a file. It is gone — the context it lived in has been compacted twice since. What
follows is rebuilt from three surviving sources: the constraints quoted verbatim
inside other saved documents, the framing in `AUDIT-TASK-0.md` §H (*"Flags —
positioning & pricing — section 12 requires these, not a silent workaround"*), and
the rules that have actually governed every build decision in sections 1–11.

**Lucas: read this one properly and correct it.** Everything quoted in `"double
quotes"` below is your wording, preserved exactly. Everything else is my inference
from how those rules were applied, and inference is exactly the thing this
document exists to prevent. If a rule here is wrong, it has been wrong for eleven
sections.

This is why sections 13 and 14 were saved verbatim to `BRIEF-13-SERVICE-TIERS.md`
and `BRIEF-14-VAT-BTW.md` the moment they arrived, and why any future section
should be too, before a single line of it is acted on.

---

## 1 · The evidence rule

> **"never invent testimonials, client names, logos, metrics, or results"**

The hardest rule in the brief and the one with the least room in it. VISUAILS has
no published clients yet. Every convention of the category — the logo strip, the
"trusted by 200+ brands", the five-star quote card, the 3× conversion stat — is
therefore unavailable, and the site has to be persuasive without any of them.

In practice this has meant: finished work is shown, and it is never attributed.
No names, no logos, no numbers that describe someone else's business. Where a page
would conventionally carry proof, it carries the method instead — what happens,
in what order, with what you get to approve.

The AskUserQuestion answer *"Finished work, but no names"* is the operating
version of this rule and it has held on every page.

**A number about your own operation is not a testimonial and is allowed** — the
capacity gate's real availability, a real turnaround, a real price. A number about
a client's outcome is not, even if a client eventually says it.

## 2 · The flag rule

> **"flag anything considered a positioning or pricing mistake instead of silently
> working around it"**

This is the rule that makes the rest of the agreement work, and it is the one that
distinguishes this build from a normal one. The default failure mode of a
competent implementer is to notice a problem, quietly route around it, and ship
something that works — leaving the person who owns the business unaware that a
decision was made on their behalf.

So: when the brief asks for something that is wrong, or two parts of it collide,
or a price does not survive arithmetic, the work stops and it gets written down.
`AUDIT-TASK-0.md` §H is the first ten of these. `FLAGS.md` is the running
register.

**The corollary, which is easy to lose:** a flag that is raised and then
*resolved by me* is still a flag. It gets reported. Silently fixing a positioning
mistake is the same failure as silently working around one — you end up not
knowing what your own site says.

**The second corollary, learned the hard way:** a flag that turns out to have been
overstated gets **corrected in public**, not quietly dropped. Flag (cv) was
reported as "the site renders blank without JavaScript" and the truth was
narrower. The correction is in `REPORT-SECTION-11.md` §12. A register that only
ever grows more alarming is not a register, it is a mood.

## 3 · The bilingual rule

> **EN and NL both, every change.**

EN at `/`, NL at `/nl`. Not a translation layer — two parallel page trees, six
`[slug]` template pairs, two copies of every data module that carries prose.

The operational consequence is the one that bites: **grepping this codebase in one
language only is a false-clean generator.** So is scoping a grep to one file type.
Every verifier in `/tmp` that counts or compares anything does it across both
trees, and several of them exist specifically because an English-only check
reported green on a broken Dutch page.

Typography convention, which is deliberate and should stay: **EN copy uses
straight apostrophes (`'`), NL copy uses typographic (`'`)** — except the ported
NL legal pages, which use straight and are the known exception.

## 4 · The delivery-date rule

> **"never promise a delivery date the capacity gate hasn't cleared"**

No page states a date the backend has not agreed to. The gate at
`functions/api/capacity.js` is the only thing on the site allowed to name a day,
and it does so from real remaining capacity rather than from a marketing promise.

Section 13 sharpens this into its strongest form, and this is the sharpest single
constraint in the whole brief:

> **"Standard queue. NO named delivery date — show 'typically 2–4 working days,'
> never a date. This is the single most important constraint in this section."**

The two tiers differ here on purpose and the difference must be **visible, not
hidden**. Tier 1 gets a committed date because the gate cleared it. Tier 0 gets a
queue, states that it is a queue, and never gets a date at all.

**Tier 0 always yields to Tier 1 in the gate.** Tier 0 orders can be pushed; Tier
1 orders cannot.

## 5 · The AI Act rule

> **"never turn AI Act page into a fear pitch"**

On `/ai-act` specifically: do not state or imply the client will be fined, do not
call ordinary AI product imagery a "deepfake", do not assert where legal liability
sits.

The third of those is the one that catches good intentions. §H flag 9 was exactly
this — a line saying the approval log *is* your AI Act human-review documentation.
That is an assertion about what a law requires, made by a photo studio, in
marketing copy. Rewritten to the factual version: every approval and revision is
timestamped and exportable as a PDF record of human review. What that record
satisfies is the reader's lawyer's problem, and saying so is not our job.

The page's argument is that a human looked at it. That is true, it is unusual in
this category, and it does not need a threat behind it.

## 6 · The token rule

> **"portal_token must be ≥128 bits from crypto.getRandomValues, base64url,
> single-use on issue, expiring 90 days after order close. Rate-limit lookups.
> This URL is the only thing protecting client data — do not ship a short or
> sequential token."**

Quoted in full because it is the only security requirement in the brief and it is
already correct in the code. `test_token.mjs` proves it, `mutate_test_token.py`
proves the test, and `sabotage_token_test.py` proves the harness.

Open ambiguity, flag (xxxviii): "single-use on issue" has two readings — the token
is generated once and reused for the life of the order, or it is consumed by first
use. The build assumes the first. If you meant the second, the portal is wrong.

## 7 · The performance budget

> **LCP under 2.5s on mobile 4G with the shader running.**

The shader is the chrome signature and it is the expensive thing on the page. The
budget is stated *with* it running, which means the budget is a constraint on
everything else.

This is what killed Lenis (flag cvii): a scroll-hijacking rAF loop is a permanent
main-thread cost paid on every page, against a budget that is already spending its
headroom on the thing that makes the brand look like itself.

## 8 · How I hold myself to all of this

Not part of your brief — this is the method that grew out of it, and it is written
down because it is now the most expensive thing in the repo to rebuild.

**Every check ships in three layers.** A checker that reads the source; a mutation
harness that feeds the checker deliberately broken copies and asserts it rejects
each one *for the stated reason*; and a meta-test that weakens the checker and
asserts the harness notices. Currently 42 green suites: seven node suites, fifteen
static verifiers, fourteen mutation harnesses, six meta-tests. `bash
/tmp/run_suite.sh` runs all of it in about six minutes.

Four rules earned by failure, each of which has caught something real:

**A verifier scoped to one file is worse than no verifier.** The first
`check_motion.py` read one stylesheet of fifteen and printed OK on a tree carrying
58 violations. A checker scoped too narrowly does not find fewer bugs than no
checker — it finds none and says so in green. Every checker now carries *blindness
floors*: minimum counts that make a narrowed harvest fail loudly on a healthy
repo.

**A test that has only ever been green is a claim, not evidence.** The way to
convert it is a negative control — deliberately break something you are not
confident will be caught. Doing this to the motion meta-test found a real gap the
same afternoon.

**A checker that tests a collection through one element has an untested
collection.** The motion harness had one case for a three-element ban, so two
thirds of it could be deleted with every case still reporting correct.

**Assert the reason, not the exit code.** Two different checks firing on the same
broken input means disabling either one leaves the exit code unchanged. Only an
assertion on *why* it failed notices.

## 9 · Constraints inherited from section 13

From `BRIEF-13-SERVICE-TIERS.md`, verbatim, because they bind the next build step:

> **"Do not use words like 'basic,' 'lite,' or 'starter' for Tier 0, and never
> style it as a lesser card. It is a different SERVICE MODEL, not a worse product.
> Frame it as 'order individual products' against 'run a whole drop.'"**

> **"Fully automated through the same pipeline as Tier 1. This tier is only viable
> BECAUSE the pipeline exists; do not build a separate flow for it."**

> **"put the review-level claim in a single content variable per tier, not
> hardcoded across pages."**

Placement is a hard constraint: Tier 0 lives on `/pricing` (bottom block) and on
`/catalog`, `/lifestyle`, `/video`, and is reachable from `/start` step 1 as "a
single product". It must **not** appear on the homepage, in the nav, or in any
hero.

Review level is *"human-checked on both tiers for now"*, with the code structured
so Tier 0 can be degraded to a spot-check later **without a copy rewrite** — which
is what `REVIEW_CLAIM` in `src/data/pricing.js` is for.

## 10 · Constraints inherited from section 14 (deferred, but binding when built)

You deferred 14 with *"for now"*. Recorded here so nothing about it gets
improvised later. Full text in `BRIEF-14-VAT-BTW.md`.

The load-bearing ones: determination logic is **server-side only, never trust the
client**; *"Never apply reverse charge to a Dutch customer"*; *"STRIPE IS NOT
ENOUGH"*; VIES validation server-side only, never from client JS; Greece is `EL`
not `GR`; DE and ES never return company names, so a null `company_name` must not
be treated as invalid; on VIES failure, **do not silently zero-rate**; Tier 1
prices excl. VAT, Tier 0 incl. VAT, and *"Never show an unlabelled price."*; the
VAT field belongs on the CONFIRM step; sequential invoice numbers with no gaps;
and *"Do not implement the KOR small-business exemption unless explicitly told
to."*

Two decisions still block it: whether you are registered for VAT rather than on
the KOR (the build assumes registered — **stop and flag if that is wrong**), and
which payment processor.

## 11 · Decisions already taken — do not re-litigate

Recorded so they are not re-opened by a later pass that has forgotten why.

From your AskUserQuestion answers: audience is *established brands replacing a
shoot*; the feel is *precision — this is an instrument*; the anti-references are
*an AI SaaS product page*, *a dropshipping or growth-hack site*, *a stock photo
marketplace*; proof is *finished work, but no names*; the first belief a visitor
must form is *"this is not an AI toy."*

Structural: `/custom-models` is the live URL and `/models` 301s to it (§H flag 8);
video is a priced add-on to a drop; the founding offer is a free Drop Pilot in
exchange for a published case study.

Design decisions already rejected once, with reasons on file: true CSS `subgrid`
for the door rows; widening `.gate-note` past its 78ch measure; the 48-hour window
line at `capacity.js:65–68`; step 5's ruled width; square radio marks; the blue
`--signal` boxes; the "01–05" numbered rail; the "■ START" page kicker.

**Reversed by a later section, which is the normal case and worth noting:** the
round-3 answer *"Raise per-product to €89"* was overtaken by section 13's tier
structure. When a later brief section contradicts an earlier decision, the brief
wins and the reversal gets recorded rather than silently applied.

---

## 12 · What is still open

`FLAGS.md` carries the full register. Four things there need you rather than me:

**The upgrade-prompt trigger number.** `UPGRADE_TRIGGER_PRODUCTS = 12`, from your
section 13 text. After the 2026-07-27 catalog/lifestyle increase the break-even
against a Full Drop is **9** nominally, **11** like-for-like ex-VAT (flag lxxxv,
recomputed — it used to be 19/23, before that increase). The docstring in
`pricing.js` is current as of this edit. Prompting at 12 is now arithmetic on
both readings, where it used to be early on both. I have not chosen whether it
should move, and the section 13 rule — *"Factual, no pressure, once per quarter
maximum"* — read like it wanted the arithmetic even before the numbers crossed;
now they have crossed on their own, without anyone deciding it. Your call.

**Whether the motion retimings survive review** (flags cxi, cxviii, cxxii).
Aesthetic, visible, and already built. `REPORT-SECTION-11.md` §8.

**The KOR and the processor**, both blocking section 14.

**This document.** It is the only part of the brief I am working from that you
have not read back.
