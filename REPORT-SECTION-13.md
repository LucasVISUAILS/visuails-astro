# Report — section 13, service tiers

Written 26 July 2026. Sections 11 and 12 were reported in `REPORT-SECTION-11.md`
and `WORKING-AGREEMENT.md`. This is the third and last of the three you asked for:
*"continue with 11, 12 and 13 for now."*

Section 13 is built. The full verification suite — 42 checkers, mutation harnesses
and meta-tests — is green, including the 223-assertion test over the order
endpoint. Nothing here is committed yet.

Section 14 is untouched, as you asked.

---

## 1 · What section 13 actually changed

Your first line does the work: *"The dividing line is not order size, it is
whether a human commits to a deadline."* Everything below follows from reading
that as a statement about **service model**, not about volume.

So the site now has two tiers that are described in the same voice, at the same
weight, with the same review promise, differing in exactly the things a deadline
commitment implies:

**Tier 0 — "order individual products."** Standard queue. No portal, delivery by
link. No named date, ever — *"typically 2–4 working days"* and nothing more
specific. Catalog €39.99, Lifestyle €59.99, Video €49.

**Tier 1 — "run a whole drop."** A reserved 48-hour window cleared by the capacity
gate before it is offered. Client portal with per-image approve or request-revision.
Priority in the queue.

The words *basic*, *lite* and *starter* appear nowhere near Tier 0, and the two
columns are styled identically — same border weight, same type scale, same
spacing. That was your instruction and it is also the more honest layout: a card
that is visually quieter makes an argument the copy is explicitly not making.

---

## 2 · The constraint you called the most important one

*"NO named delivery date — show 'typically 2-4 working days,' never a date."*

There is now exactly one place in the codebase where Tier 0's timing sentence
exists: `TIERS.unattended.turnaround` in `src/data/pricing.js`, in both languages.
Every surface that prints it — the pricing page, the three product pages, the
comparison block, the order form, **and the confirmation email** — reads it from
there.

The email is worth a paragraph, because it was the exception and I found it by
accident. `customerEmail()` in `functions/api/order.js` carried a docstring saying
the timing paragraph *"is assembled from TIERS in src/data/pricing.js and is never
typed here"* — and directly underneath it, the Tier 0 branch was two hardcoded
strings. They happened to match `TIERS` byte-for-byte in both languages, so no
client ever received a wrong sentence and no check would ever have gone red. The
docstring had been false for months while being invisibly, coincidentally correct.

It is fixed, the output is byte-identical, and there is now a mutation case that
fails if anyone types that sentence back in. But the general problem stands and I
have flagged it (`FLAGS.md` · cxxxii): **nothing in this repo compares a comment to
its subject.** A docstring is only as true as the last person who read both halves.

The reason this matters more than a tidy-up: an email is the one surface nobody
greps. If Tier 0's turnaround ever changes, the site would have updated and the
confirmation would not, and the first person to notice would be a client holding
two different promises.

---

## 3 · The upgrade path, and where I did not follow you

This is the part you called *"where Tier 0 earns its place"*, and it is built end
to end: volume tracked in D1, a threshold, a once-per-quarter claim, and the line
itself rendered in three places.

**Your example sentence is arithmetically false, so I did not ship it.**

You wrote: *"You've ordered 14 products this quarter. A Full Drop covers 25 for
less."* At fourteen products the client has spent 14 × €99.98 = **€1,399.72**. A
Full Drop is **€1,850**. It is not "for less" — it is €450 more, and any client who
opens a calculator finds that in thirty seconds. Section 13 also asks for
*"factual, no pressure"*, and the example does not meet the standard the same
paragraph sets.

What ships instead names the crossover rather than claiming a saving:

> You've ordered 14 products this quarter. For reference, a Full Drop covers 25–30
> products for €1,850, and costs less from 23 products on.

That sentence is true at 12, at 14, at 30, and — this is the part that decided it —
it stays true under section 14. Section 14 quotes Tier 1 **excluding** VAT and Tier
0 **including** it, which moves the like-for-like crossover for a business that
reclaims from 19 to 23. A saving claim pitched anywhere between those two numbers
would be wrong for precisely the customer most likely to check it. Naming the
crossover is true under both readings, so there is no version of section 14 that
can turn this sentence into a lie later.

**It is one sentence to change back** if you would rather have yours. `FLAGS.md`
· cxxix.

**"Once per quarter maximum"** is enforced by the database rather than by the
application, which matters because two orders can arrive at the same moment. The
claim is a single `UPDATE … WHERE upgrade_prompt_at IS NULL OR upgrade_prompt_at <
datetime('now','-3 months')`, and the line is printed only if that update reports a
changed row. Two concurrent orders, one prompt, no lock, no transaction.

**Where the prompt fires is still your decision.** `UPGRADE_TRIGGER_PRODUCTS = 12`
is your number. The break-even is 23. Firing at twelve means telling a brand about
a product that would cost them more today — factual, but early. That is flag lxxxv
and it is genuinely a positioning question rather than a bug.

**A failed lookup can never cost you an order.** The volume read and the claim are
both wrapped: if D1 is unreachable, the client still gets a reference number and a
working confirmation, minus one marketing sentence. There is a mutation case that
deliberately breaks the lookup and requires the order to survive.

---

## 4 · Three things I decided, that you should know about

**The prompt is styled to be quiet, and that was a design decision, not a copy one.**
In the client's confirmation it sits below a rule, at 13px, muted, **after** the
aftercare promise. The same true sentence set at body weight directly under the
confirmation reads as an upsell, and the client would be right to read it that way.
"No pressure" is a styling constraint that no copy review can enforce. The last
thing a confirmation should say is that a person checks the work — a price
comparison must not be allowed to take that position.

**Your notification is louder, but deliberately not an alert.** The raced-booking
banner above it is an emergency and looks like one. Dressing an opportunity the
same way trains the eye to skip both.

**The event log records the volume, not just the fact.** `upgrade_prompt_at`
remembers *when* a quarter was claimed and never *at what count*. "Why did this
brand get the line at 12 and the next one at 19" is the first question anyone asks
of a prompt that fired, and the event log is the only place that answer can live.

---

## 5 · Four flags from the sweep

Full text in `FLAGS.md`; the short version:

**The Dutch word "Timing" was live and untranslated on two pages** (cxxvi). Fixed.
It survived because the label was typed into markup while the sentence beside it
was generated, so every check that reasons about values saw a correct tier and said
nothing. Same defect class as the email above, arriving from the other direction.

**`/pricing`'s Tier 0 block has no human-review row; the comparison block does**
(cxxvii). So Tier 0 claims human review on three pages and stays silent on a
fourth — visible only when standing next to Tier 1, which is the worst available
reading. One row to add or one to remove. Copy decision, not a bug.

**`yieldsToAttended` is decorative** (cxxviii). It reads like the switch that
implements *"always yields to Tier 1 in the capacity gate"* and nothing reads it.
The real mechanism is `QUEUE_FLOOR_PER_DAY = 3`, which reserves throughput no
attended window may take. I left the field in place with a comment at both
declarations rather than deleting it or wiring it — wiring it would mean two places
to change the gate, which is how they drift.

**Your brief contains a tension I had to resolve** — Tier 0 *"must NOT appear on
the homepage, in the nav, or in any hero"*, and *"the difference must be VISIBLE,
not hidden."* I read the first as being about **acquisition surfaces** and the
second as being about **the tier's own pages**. So nothing on the homepage or in
the nav mentions Tier 0, and the moment you are on `/catalog`, `/lifestyle`,
`/video` or `/pricing`, the queue language is stated in the open rather than in a
footnote. If you meant it more strictly, the three product-page comparison blocks
are the thing to cut.

---

## 6 · What the verification found, and one thing it did not

42 suites green. Three findings worth naming because each was a checker catching
something a reading would not have:

The order-endpoint test grew to **223 assertions**, and while writing them I found
that three earlier mutations had been silently lost: a mutation that makes the
endpoint *throw* killed the test process, so the harness reported `Node.js v22.22.2`
as the failure and could not tell a caught bug from a broken case. The test driver
now converts a rejection into a reportable failure. Those three cases are recovered.

**A report went stale and the checker caught it.** `REPORT-SECTION-14-VAT.md` cites
specific file-and-line locations, and section 13 moved six of them; its price-call
census moved by exactly one. The one is accounted for — the upgrade prompt names
the Full Drop price through `euro()` rather than typing it — and the corroborating
detail is that the *file* count did not move. A new call inside a file that already
priced things is a sentence being assembled correctly; a new calling file would
have meant some new surface started printing prices, which is a different fact.

**And the honest limitation:** the once-per-quarter rule is guarded by review, not
by a test (cxxx). The test harness's fake database routes on SQL fragments and
never evaluates a `WHERE` clause, so relaxing the compare-and-set's own guard — the
single mutation I would most like to make — is invisible to it. Everything around
the query is covered. The query's own condition is not. That is written into the
harness rather than left for someone to discover.

---

## 7 · One thing you have to do before this deploys

**There is a new database migration.** `migrations/0002-section-13-upgrade-prompt.sql`
adds one column, and the upgrade prompt cannot work without it. It has to run
against both databases:

```
wrangler d1 execute visuails --local  --file=./migrations/0002-section-13-upgrade-prompt.sql
wrangler d1 execute visuails --remote --file=./migrations/0002-section-13-upgrade-prompt.sql
```

Running it twice is safe and **will look like a failure** — you get `duplicate
column name: upgrade_prompt_at`, which is the migration telling you it has already
been applied.

If it never runs, nothing breaks and nothing is lost: the volume read fails, the
failure is swallowed, and orders continue exactly as they do today without the
prompt. That is the correct failure mode, and it is also why this would be easy to
forget for a long time.

---

## 8 · Where this leaves things

Sections 11, 12 and 13 are built. The remaining half of your instruction — *"and
check the website after for inconsistenties and bugs"* — is next, and it starts
from a green suite rather than from nothing. The suite is the floor, not the
ceiling: it proves the things somebody thought to write a check for.

Section 14 stays untouched until you say otherwise, and it is still blocked on two
decisions of yours: the payment processor, and whether you are on the KOR.
