# Report — section 14, VAT / BTW

Written 26 July 2026, against `BRIEF-14-VAT-BTW.md` and commit `11d0eb8`.

You asked two things: what still needs to happen, and whether section 14 can be
added here. Nothing has been built for section 14 — this is the reading you
asked for before any of it is.

---

## 1 · The short answer

**Yes, it can be added, but not as one step.** Sections 11, 12 and 13 are design
and copy work on a site that already exists. Section 14 is not that. About a
fifth of it is copy work on the pages we already have, and the rest is a
payment-and-billing back office that this project does not contain a single line
of.

So I would split it:

**14a — the display layer.** The incl./excl. labels, the terms clause, the four
places that call the VAT number "optional", the break-even fix. Content and one
data module. Small, and it should go **before** section 13, not after — reason in
§8.

**14b and 14c — the machinery.** VIES validation, the evidence record, invoicing,
the quarterly export. These are a project of their own and they cannot start
until two questions are answered. Neither blocks 11, 12 or 13.

**Two questions have to be answered before any of 14 is built**, and one of them
section 14 asks for itself.

---

## 2 · The KOR question, which section 14 tells me to stop on

Section 14's first paragraph:

> *"Assume registered for VAT (NOT the KOR) — if that is wrong, stop and flag it,
> because the whole model below changes."*

I am flagging it, but not because I think you are on the KOR — because I cannot
tell from anything in the project, and the thing that looks like an answer is not
one.

The site already publishes **VAT NL005407575B96** and **KVK 99742993** — in the
footer of every page, on both privacy pages, both terms pages, and the pricing
FAQ. That is not proof either way. A business can hold a BTW-id and still be
registered for the kleineondernemersregeling. If you are on the KOR you charge
0% domestically, you cannot deduct input VAT, and the determination table in
section 14 inverts rather than adjusts.

One good side-effect of this: **section 14 asks for our VAT number and KVK number
on every invoice, and I do not need you to supply them.** They are already in the
codebase. They should move out of `Layout.astro:460` into a data module so they
are typed once rather than six times, but that is our problem, not yours.

---

## 3 · What section 14 assumes exists

Section 14's central heading is **"STRIPE IS NOT ENOUGH"**, and its invoicing
section says *"do not rely on Stripe's template."* Both sentences assume a Stripe
integration to be insufficient and a template to decline.

**There is no payment processor in this project.** Not Stripe, not Mollie, not
anything. No invoice is generated. There is no dashboard for the export to come
out of. `/start` step 5 confirms an order and says so in as many words — the page
currently reads *"There is no card form here on purpose. You are confirming an
order, not paying for one."*

It goes one level deeper than that. The `orders` table has a `total_cents`
column, and **nothing writes to it.** `functions/api/order.js` inserts fifteen
fields into that row and a price is not among them — not on any code path, in
either language, for either tier. So there is not yet an amount for VAT to be a
percentage of, and `total_cents` carries no basis either: no rate, no net, no
gross, nothing that says which of the three it would be.

This does not make section 14 wrong. Its argument is right and it survives the
correction: no processor validates a VAT number against VIES, so the Worker is
needed whichever one we pick. But it means section 14 is not an amendment to
payment handling. It is the specification for building payment handling, with a
VAT layer on top, and it should be sized that way.

**And the processor is not decided.** `BACKEND-SETUP.md:229` says "Mollie for
iDEAL, or Stripe". `DESIGN.md:35` and `AUDIT-TASK-0.md:110` both assume Stripe
Elements with `borderRadius: '0px'`. So the design system has picked one by
implication and the backend plan has not picked at all. For a Dutch,
consumer-reachable Tier 0 this matters — iDEAL is the dominant method here and
Mollie is the usual route to it. **That decision belongs before the VAT layer,
not after.**

---

## 4 · The break-even I gave you two messages ago is wrong

`REPORT-SECTION-10.md` §5 says **"The break-even is 19."** Section 14 changes
that, and I would rather correct it in the same breath than let it sit.

Section 14 requires Tier 0 displayed **including** VAT and Tier 1 **excluding**
it. That makes €99.98 an incl-VAT figure and €1,850 an excl-VAT figure. The
break-even divides one by the other, so as soon as the display rule lands, it is
comparing two different things.

A Tier 0 product net of VAT is 99.98 / 1.21 = **€82.63**. Against the Full Drop
at €1,850 net:

| products | à la carte, net | Full Drop, net | difference |
|---|---|---|---|
| 12 | €991.54 | €1,850 | drop costs **€858 more** |
| 14 | €1,156.79 | €1,850 | drop costs **€693 more** |
| 19 | €1,569.93 | €1,850 | drop costs **€280 more** |
| 22 | €1,817.82 | €1,850 | drop costs **€32 more** |
| 23 | €1,900.45 | €1,850 | drop is **€50 cheaper** ✓ |

**The break-even is 23.** It comes out at 23 on the incl-VAT basis too
(23 × €99.98 = €2,299.54 against €2,238.50), which is the point — the number is
stable as long as you do not mix the two bases. Only the mixed comparison moves
it.

So the upgrade prompt now has three candidate numbers in play: your brief says
**12**, its own example sentence says **14**, and the arithmetic says **23**. The
gap between 12 and 23 is nearly €900 of a customer's money, in a message that
tells them they are saving some. `UPGRADE_BREAK_EVEN` will be fixed to divide
like against like; which number the prompt actually fires on is still yours.

One thing that does *not* break, which I checked because it would have been
expensive to miss: `pricing.js` asserts that buying `FULL_DROP_MIN` products
individually must cost more than a Full Drop — *"the drop has to be the cheaper
door."* On net figures that is 25 × €82.63 = €2,065.70 against €1,850. It still
holds. The margin halves (the ratio goes from 1.35 to 1.12), but the positioning
survives, and it survives on the incl basis too: a Full Drop works out at €89.54
per product incl. VAT against Tier 0's €99.98.

---

## 5 · Four places the site currently contradicts section 14

These are live copy today, in both languages.

**`/terms` §4 states a blanket "prices are exclusive of VAT".** `terms.astro:115`
and `nl/terms.astro:62` — *"Unless stated otherwise, prices are exclusive of VAT
where applicable."* Under section 14, Tier 0 is displayed **inclusive**. So the
terms would contradict the prices on the page, and they would contradict them
specifically for the consumer-facing prices, which is the exact case EU consumer
law is about. §4 has to be split per tier.

**The VAT number is described as optional and inconsequential, in four places.**
`FaqPage.astro:164` (EN) and `:298` (NL): *"Yes. You can add it at checkout —
optional, and useful for B2B invoicing inside the EU."* `PricingPage.astro:121`
(EN) and `:198` (NL): *"It is optional."* And `StartPage.astro:793` renders the
field with an explicit "optional" chip beside the label. Under section 14 it is
still optional to supply — you may decline and pay 21% — but it stops being a
convenience for the bookkeeping and becomes **the single input that changes the
total.** All four need rewriting, both languages.

**The VAT field is on the wrong step, and it is not the step section 14 thinks.**
Section 14 says it belongs on confirm, *"not step 2."* It is currently on **step
3 · BRIEF** (`StartPage.astro:793`), between the brief and the timing. The
instruction is right and the move is needed; the diagnosis is one step off.

**Nothing records that we validated anything.** `customers.vat_number` and
`orders.vat_number` both exist, both free text, both written straight from the
form with no check of any kind. Section 14 is blunt about what that record is
for — *"Tax authorities can demand proof that we validated BEFORE applying
reverse charge. This record is the proof."* We do not have it. That is a new D1
table and a migration.

---

## 6 · One thing section 14 does not resolve

**The video price sits in both tiers at once.**

`AMOUNT.video = 49` is listed in `TIERS.unattended` as a Tier 0 item
(`pricing.js:709`, `:714`) and also sold as *"added to any drop"* on Tier 1
(`pricing.js:592`, `:661`) — deliberately at the same rate either way, which was
a simplicity decision and a good one.

Section 14's display rule is per tier: Tier 0 inclusive, Tier 1 exclusive. **The
same number cannot be both.** €49 incl. VAT and €49 excl. VAT are different
prices, and both appear on the site today as the same figure.

Either video is priced differently depending on which door it comes through, or
the incl./excl. rule keys off the *context a price is rendered in* rather than the
tier it belongs to. The second is the smaller change and probably the right one,
but it is a change to what section 14 says, so I am not making it unasked.

---

## 7 · What I checked and found correct

Worth saying, because I went looking for problems and these were not any.

**All four Tier 0 prices section 14 names exist and match**: `testSample: 0.99`,
`catalog: 39.99`, `lifestyle: 59.99`, `video: 49`. So does the shoot-day
comparison range — `shootDayLow: 2500`, `shootDayHigh: 8000`. Section 14 is not
naming a product the pricing model has dropped.

**€2,238.50 is right.** 1,850 × 1.21. The worked example in the brief checks out.

**The 132 price call sites are one problem, not 132.** *"Never show an unlabelled
price"* touches **132 calls to `euro()` / `euroRange()` / `perProduct()` across 40
files**, which sounds like a sitewide edit. It is not: every one of them goes
through `euro()`, `euroRange()`, or a pre-formatted string in `PACKAGES` /
`PER_PRODUCT` / `TEST_SAMPLE` / `SHOOT_DAY`, all in `src/data/pricing.js`. The
label belongs there. Same reasoning as section 13's *"put the review-level claim
in a single content variable per tier, not hardcoded across pages."*

A note on that number, because I first wrote a different one and the correction is
more interesting than the digit. The figure I originally quoted came from
`grep -rn 'euro(' src functions | wc -l`, which returns **131**. That command
answers a question nobody asked. It counts **lines containing at least one match**,
so five files that put two calls on one line contribute one each; and it counts
**prose**, because a comment explaining why `euroRange()` rounds looks exactly like
a call to it. Correcting only the first error gives 140 across 41 files, which is
what I nearly sent you.

The honest number strips comments first and then counts occurrences: **132 across
40 files.** The eight-call gap is entirely explanatory comments in
`ComparePage.astro` (3), `interactions.js` (2), and one each in `FaqPage.astro`,
`PricingPage.astro` and `pipeline.js`. `interactions.js` mentions `euro()` twice
and calls it zero times — so it is the 41st file in the raw count and not a price
surface at all, which is the entire difference between 41 and 40.

`check_report14.py` now recomputes all four figures on every run — comment-stripped
and raw, occurrences and lines — and fails if the report and the repository
disagree in either direction. That is the only reason this got caught: the report
and the checker were both written by me, and the checker was the one that had to
open the files. **None of the 132 are in `functions/`.** The whole surface is
render-side, which is why one change at the formatting chokepoint reaches all of
it.

Every figure in this section moved by one when section 13 landed, and the one is
accounted for: `upgradePrompt()` in `pricing.js` names the full-drop price through
`euro(AMOUNT.fullDrop, lang)` instead of typing it. The **file** counts did not
move, which is the detail that makes the drift benign — a new call inside a file
that already priced things is a sentence being assembled correctly, where a new
calling *file* would have meant some new surface started printing prices, and
that would be a fact section 14 has to account for rather than a footnote.

That checker is in the suite under the same rule as everything else in it: 28
deliberately broken copies of the repository are fed to it and it has to object
to each one, and a meta-test then disables three of its assertions and requires
the harness to catch exactly those three. Two of the 28 exist only because this
document is a file the checker reads — one changes a number the report states,
one rewords the sentence carrying it. The second is the one that matters. A
number that drifts is caught by anyone re-reading; a binding that quietly stops
matching reads as green forever. **This report cannot now be edited away from
the repository without something going red.**

---

## 8 · Two things in section 14 that are harder than they read

**"Sequential invoice numbers, no gaps."** D1 is SQLite and has no sequences.
`AUTOINCREMENT` gives you monotonic-with-gaps, which is precisely the thing the
requirement rules out — a failed insert burns a number and the gap is permanent.
Doable, but the number has to be allocated in the same transaction that commits
the invoice row, never before it, and an invoice row can then never be deleted;
a mistake becomes a credit note. That is a design constraint on the whole
invoicing module, not a detail inside it.

**"Studio retainer: re-validate quarterly."** Cloudflare Pages Functions have no
cron triggers. This project's entire backend is Pages Functions. A quarterly job
means a **separate Worker with a scheduled trigger** — a new deployment artefact,
a new thing in the dashboard, a new thing that can silently stop running. It is
the right requirement; it just does not fit in the box we currently have.

One I cannot resolve here at all: **whether VIES is reachable from a Cloudflare
Worker.** It should be — it is an ordinary SOAP/REST endpoint — but this
container has no build and restricted network, so that is an assumption rather
than a test. It gets tested on the first deploy, not before.

---

## 9 · Where section 14 goes in the build order

You pinned section 13 as *"na stap 12."* Section 14 arrived without a position.

**14a should go before 13.** Section 13 builds the tier comparison, the Tier 0
door and the upgrade prompt — every one of them a surface covered in prices.
Building 13 first means writing those prices unlabelled and then going back
through them; and the upgrade prompt in particular is built directly on the
break-even number that section 14 moves. It is the same work either way, done
once instead of twice.

**14b and 14c go after everything else**, because they are blocked on your two
answers and on a processor that does not exist yet, and because nothing on the
public site breaks while they are missing.

So the order I would run:

```
11 · motion                    ← next, unblocked
12 · working agreement
14a · VAT display layer        ← needs the KOR answer + the video-price answer
13 · service tiers             ← builds against labelled prices
14b · VIES + evidence          ← needs a processor first
14c · invoicing + ICP export
```

---

## 10 · What still needs to happen, in full

Beyond the sections above, the standing backlog:

**Waiting on you.** `PRODUCTS_PER_DAY = 18` — the operational claim every
promised date is derived from. The upload caps, 25 MB and 80 files. Whether the
standard-library faces depict identifiable people, for `/ai-act` §4. Which number
the upgrade prompt fires on. And the two new ones above: the KOR, and the
processor.

**Still to run on your machine, in this order:** `cleanup-stale-files.bat`, then
`push-to-github.bat`. Twelve retired order pages are still on your disk and
`git add -A` will put them back. That is unchanged from the last report and it is
the only destructive thing outstanding.

**Housekeeping** — none of it visible to a client, all of it real: the portal
token has no revocation writer; nothing sweeps abandoned upload batches out of
R2; the 12-month retention promise is published in four places and enforced by
nothing; `portal.css` is using the fallback font stack because the font swap
needs an `npm install` this container cannot run; the sitemap is a checked-in
file rather than generated at build; six `[slug]` templates want collapsing into
three; and there is a Dutch grammar pass owed across the whole site.

And the standing caveat: **no page of this site has ever been rendered by Astro
in this container.** The npm registry is blocked here. Everything above is static
analysis, plain Node, and browser testing of extracted logic. The first real
render happens on Cloudflare.
