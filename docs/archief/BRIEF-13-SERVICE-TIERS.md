# Brief · Section 13 — Service tiers: attended vs unattended

> **This file is the user's own text, pasted verbatim and unedited.**
> It is stored in the repo because the original repositioning brief was never
> saved anywhere and could not be recovered from the transcript. Every later
> section of the brief gets the same treatment. Do not rewrite, summarise or
> "tidy" the block below — if it needs interpretation, write the interpretation
> underneath it, not over it.
>
> Received: 2026-07-25. Build order given by the user: **"Voeg dit toe als stap
> 13. Doe dit zorgvuldig en na stap 12."** Section 12 is the flagging /
> working-agreement section, so 13 is the last build section — but its pricing
> and delivery-promise rules are binding on all copy written before it.

---

## VERBATIM

```
═══════════════════════════════════════════════════════════════
13 · SERVICE TIERS — ATTENDED vs UNATTENDED
═══════════════════════════════════════════════════════════════

Small brands are NOT being priced out. The dividing line is not order size, it
is whether a human commits to a deadline. Commitment is the scarce resource in
a one-person studio, not production time.

TIER 0 — UNATTENDED (per-product: Catalog €39.99, Lifestyle €59.99, Video €49)
· Standard queue. NO named delivery date — show "typically 2-4 working days,"
  never a date. This is the single most important constraint in this section.
· No client portal. Delivery by email/WhatsApp link.
· No revision round included; revisions are a paid add-on.
· Always yields to Tier 1 in the capacity gate — Tier 0 orders can be pushed,
  Tier 1 orders cannot.
· Fully automated through the same pipeline as Tier 1. This tier is only viable
  BECAUSE the pipeline exists; do not build a separate flow for it.

TIER 1 — ATTENDED (Drop Pilot, Full Drop, Brand Model, Studio retainer)
· Committed delivery date, cleared by the capacity gate.
· Client portal with per-image approve / request-revision.
· Revision rounds included. Priority in the queue.

WHAT THIS MEANS FOR THE UI
· Tier 0 lives on /pricing (bottom block) and on the /catalog, /lifestyle,
  /video pages. It is reachable from /start step 1 as "a single product." It
  must NOT appear on the homepage, in the nav, or in any hero.
· The difference must be VISIBLE, not hidden — Tier 0 explicitly states
  "standard queue, no fixed delivery date." Understating this is how a solo
  studio ends up with commitments it cannot meet, and it is also what makes the
  low price honest rather than a downgrade in disguise.
· Do not use words like "basic," "lite," or "starter" for Tier 0, and never
  style it as a lesser card. It is a different SERVICE MODEL, not a worse
  product. Frame it as "order individual products" against "run a whole drop."

UPGRADE PATH — build this, it is where Tier 0 earns its place
· Track per-brand per-product order volume in D1.
· When a brand crosses 12 individual products in a rolling quarter, surface a
  one-line prompt in their confirmation: "You've ordered 14 products this
  quarter. A Full Drop covers 25 for less." Factual, no pressure, once per
  quarter maximum.
· Tier 0's job is not revenue. It is portfolio material, catching brands before
  they grow, and filling gaps between committed drops.

THE HUMAN-REVIEW CLAIM
The site currently promises "human-checked, every visual." Keep that promise
across BOTH tiers for now — volume is low and it is a genuine differentiator.
But structure the code so review can be degraded to a spot-check on Tier 0
later without a copy rewrite: put the review-level claim in a single content
variable per tier, not hardcoded across pages.
```

---

## Consequences for work already in flight (written after the verbatim, not over it)

1. **This reverses the €89 / €129 per-product decision.** Section 13 fixes Tier 0
   at the *current* prices — Catalog €39.99, Lifestyle €59.99, Video €49 — and
   states the reason in its first line. `src/data/pricing.js` is built to
   section 13, not to the earlier answer.
2. **It invalidates the 24-hour single-product claim.** "NO named delivery date
   — show 'typically 2-4 working days,' never a date" is called the single most
   important constraint in the section, and it applies to exactly the orders
   the 24-hour line was attached to.
3. **It scopes the revision guarantee.** Tier 0 has no revision round included;
   the site's abuse-proof guarantee is revision-based, so the guarantee copy
   has to name which tier it belongs to.
4. **It does not, on its own, fix flag 1.** See `AUDIT-TASK-0.md` §H·1 and the
   arithmetic recorded in `src/data/pricing.js`.
