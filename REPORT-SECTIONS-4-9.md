# Report — sections 4–9

Written 25 July 2026, after commits `a3767af`, `55f845f` and `63e01bd`.

The brief says to flag anything I consider a positioning or pricing mistake instead
of silently working around it. This is that flag list, plus one thing I found while
checking for inconsistencies that turned out to matter more than any of the copy.

---

## 1 · Your deploy folder is about to ship the old site

This is the item to deal with first, and it is not a copy problem.

`E:\Claude (VISUAILS)\visuails-astro` is a git repo on `main`, pointed at
`github.com/LucasVISUAILS/visuails-astro`. `push-to-github.bat` runs `git add -A`,
commits, pushes, and Cloudflare Pages builds whatever arrives. That folder is the
deploy source.

I sync files into it over a bridge that can write and overwrite but **cannot delete**.
So every file this repositioning removed is still sitting there. I compared the two
trees file by file: **33 stale files, and zero missing ones.** The folder is completely
current on everything that still exists. It is stale only in what it *also* still has.

The 33:

`src/pages/de/` (27 files — the entire German site, dropped in commit `1da48ee`),
the three `*.de.js` data modules, `src/pages/models.astro`, `src/pages/nl/models.astro`,
and `src/components/ThreeWay.astro`.

What is actually inside the German pages, read from `de/pricing.astro` on your disk
just now: Lifestyle at **€35 per visual**, a price that exists nowhere else any more.
Catalog at €39,99 described as *"etwa €10 pro Foto"* — the exact per-photo framing we
removed. All three add-ons that were taken off `/pricing`: Multi-Format-Export +€19,99,
4K-Export +€9,99, Priority-Lieferung +€29,99. *"3 Revisionsrunden"* on every tier,
including the ones that now include none. Delivery *"in ~24 Std."* in the meta
description. And *"Keine Abos"* — no subscriptions — which stopped being true the day
the €2,200/month retainer shipped.

Every single claim this repositioning has spent its time retiring is still live in that
folder, in German, ready to deploy. `models.astro` is the same problem in a different
shape: it would shadow the `/models` → `/custom-models` redirect and undo the merge from
commit `bad0357`.

I have put **`cleanup-stale-files.bat`** in that folder. It asks for confirmation, then
deletes the 33. Run it, then run `push-to-github.bat` as normal — `git add -A` records
deletions on its own, so nothing else is needed.

**One thing matters about the order, whether you use the script or do it by hand:**
`de/pricing.astro` imports `ThreeWay.astro`. If you delete `ThreeWay.astro` on its own
and leave the German folder, that import breaks and the Cloudflare build fails outright —
which means nothing deploys at all until it is fixed. The German folder has to go first,
or everything has to go together. The script does it in that order deliberately.

---

## 2 · ~~One decision I need from you~~ — answered, and built

**Resolved 25 July 2026.** Your answer went further than the question: revision rounds
are gone from the service entirely, replaced by a check-in on every order. What follows
is the flag as it was raised; what shipped is recorded at the end of this section, and
the reasoning is kept permanently in the header of `src/data/pricing.js`.

### `/terms` §6 — the delivery target and the revision cap

Every delivery and revision claim on the site now reads from the tier model in
`pricing.js`. One place does not, and it is the one place that is contractually binding:

> **6. Delivery & revisions**
> We target delivery in around 24 hours from a complete brief… Each order includes up to
> 3 revision rounds so we can refine the result to match your brief.

Both halves are now wrong. Ordering a single product puts you in the standard queue at
two to four working days, not around 24 hours — and it includes **zero** revision rounds,
with revisions sold as a paid add-on. The three rounds belong to a drop. The terms page
promises both to everyone.

I did not rewrite it. Changing a delivery target and a revision entitlement in a contract
is a commercial decision, not a copy fix, and the brief is explicit that I flag those
rather than work around them. It is also the same paragraph that blocks the capacity /
delivery-window wording the audit asks for, so it is one decision, not three.

What I need from you is the shape you want:

- **Delivery** — split it by tier the way the rest of the site does (standard queue,
  typically 2–4 working days / a reserved 48-hour window confirmed before you pay), or
  keep one conservative outer limit that covers both.
- **Revisions** — state 3 for a drop and 0-plus-paid-add-on for individual products, or
  keep a flat number and change what the tiers actually include.

Tell me which and I will write both language versions in one pass.

While I am in there: **§4 is the only place on the entire site that still types a price**
(€39.99 and €59.99, EN and NL). Everywhere else reads from `pricing.js`. If you approve
the §6 rewrite I will move those to `pricing.js` in the same edit, so terms can never
drift from the pricing page again.

### What shipped

§6 is now **"Delivery"** and nothing else, and it states both timings by reading
`turnaround()` rather than typing them — so the contract cannot drift from the tier model
the way it just did. It says outright that we do not name a date for an individual
product, because a date the capacity gate has not cleared is not a date.

§10 absorbed what §6 used to promise, in its new form. It is the **only** place on the
site that enumerates the three remedies — revision, refund, credit on the next order —
and that is deliberate: a page that offers you a refund before you have ordered is a
returns policy, and reads as exactly the defensiveness this change removes.

§4 no longer types its prices. **There are now zero typed prices anywhere on the site.**

Nine other surfaces named a count or an entitlement that stopped existing. All of them
are now the check-in, read from a single `aftercare` field per tier:

- **Tier 0 no longer sells revisions as a paid add-on.** This is a pricing change and the
  one item here you may want to reverse. *"Revisions available as a paid add-on"*
  monetises dissatisfaction — a louder version of the same insecurity — and cannot sit on
  the same page as "we put it right". It removes a revenue line you had never priced.
- The FAQ question *"How many revisions do I get?"* is retired outright, EN and NL. It is
  now *"What if the visuals are not right?"* — a question about the outcome rather than
  the allowance.
- The door table on `/start` and the Tier 0 table on `/pricing` relabel their last row
  from **Revisions** to **After delivery**. A row labelled "Revisions" over a sentence
  that never mentions revisions is a worse lie than the number was.
- The three `/pricing` packages (Pilot, Full Drop, retainer) dropped their *"Revision
  rounds included"* bullet for the tier's own aftercare line.
- The homepage lead-magnet checklist offered *"the mistakes that cost you a revision
  round"* — which prices a correction to you, and never was true.
- `/upload-guidelines` ended its recommended-set note *"with fewer revisions"*. The
  homepage carries the same paragraph and already stopped a clause earlier, so the long
  page now matches its own twin.

One rule governed every rewrite: **nothing references the count it replaced, even to deny
it.** "We do not count rounds" is the same insecurity wearing a boast. The count is not
mentioned; it is absent. The single exception is /terms §10, where the contract says we
would rather understand what you actually wanted than work through a fixed number of
rounds — that is a contract, not a marketing surface, and it is the sentence a client
goes looking for.

### Deferred, not blocking — the `/privacy` portal-token statement

The audit asks `/privacy` to describe how the order-portal link protects your clients'
data. There is no portal yet — it is built in section 10 — so any statement I write today
would describe something that does not exist. It waits for the portal. `/ai-act` §5 has
the same dependency and already says "Being built" rather than claiming it.

---

## 3 · Changes you should know about

Nothing here needs a reply. These are decisions I made inside the brief where I think
you should know I made them.

### `/ai-act`

The brief said the page must never become a fear pitch, must not tell you that you will
be fined, must not call ordinary AI product imagery a deepfake, and must not assert where
legal liability sits. I built to that, and it pushed the page in a few directions worth
naming.

§5 does not follow the brief's literal wording. It is split into "Today" and "Being
built", because half of what the section describes depends on the portal from section 10.
Writing it as one present-tense list would have claimed things that are not shipped.

§4 deliberately does not say whether the faces in the standard model library depict real
people. I do not have that answer, and "never invent" applies to our own supply chain as
much as to client work. It is a real gap and worth closing when you know.

§2 states outright that we add no provenance metadata to delivered files. That is
accurate today and it is also a decision point: if you want C2PA content credentials, the
page is where the commitment would live.

The **Digital Omnibus is deliberately absent.** It reached political agreement on 6 May
2026 and Member States confirmed it on 13 May, but it is not formally adopted. A legal
page that describes unadopted law as law is exactly the kind of page the brief told me
not to write. When it is adopted the page should be revisited — that is why its sitemap
entry says `monthly` while the other legal pages say `yearly`.

The page is linked from two places in content, not from the footer alone: the fitting-room
small print on the homepage, and one FAQ item. Both sit where the question actually comes
up. The FAQ question is *"Are the visuals AI-generated?"* and not *"do I have to disclose
this?"* — the second phrasing is the fear pitch coming back in through the door the brief
closed.

### `/terms` and `/privacy`

Sections 7 through 12 of `/terms` are now **8 through 13**, because the file-retention
section was inserted at 7. If you have ever cited a clause number to a client in writing,
that reference has moved. I checked: nothing on the site cites a clause number, so
there is nothing to update internally.

"Drop" is now a defined term in §2, which is what lets the deposit clause attach to
something specific. That deposit clause names no threshold and no product — it triggers
on an order being invoiced rather than charged at checkout, which deliberately leaves the
free founding-offer Drop Pilot outside it.

The tax-retention period still carries no number of years. I would rather it say the
period required by law than name a figure I have not verified against your accountant.

`/terms` now links to `/privacy` for the first time.

### The revision guarantee

Three claims changed because they were false against the tier model, not because they were
positioned wrongly.

The homepage founder quote used to say *"we keep refining until it matches your brand."*
That was the most visible revision promise on the site, in your own voice, and unbounded —
while a drop includes three rounds and a single product includes none. It now reads *"I
would rather redo one than ship it,"* which says the same thing about how you work without
granting a round count nothing can honour.

The homepage close used to end *"and you approve before final delivery"* about the test
sample. There is no approval step in the test-sample flow — `test-sample.astro` says the
finished visual arrives as a download link. I cut the clause rather than replacing it,
because everything true about the sample was already in the sentence and filling the gap
would have meant inventing a sixth fact.

`/order-catalog` stated its queue and its timing but said nothing about revisions, while
`/order-lifestyle` — same tier, same pipeline — stated all three. Catalog is the busier
of the two forms, so the form that said least about its own terms was the one most people
fill in. It now states the terms and links across to how a drop works, because "revisions
are a paid add-on" on its own is a downsell, while the same sentence next to "running a
whole drop instead?" is a difference in service model — which is what section 13 says the
tier actually is.

### One thing about the palette worth knowing

`--ink-2` and `--accent-bright` resolve to the same colour. A link styled `--accent-bright`
placed inside text coloured `--ink-2` is exactly the colour of its surroundings — invisible.
I nearly shipped one. Links carry no underline by default in this system, so any inline
link in quiet small print needs either a lighter surrounding context or an explicit
underline. Three places already use `colour + underline + 2px offset`; one link on
`/order-lifestyle` is still colour-only and should be brought in line at some point.

---

## 4 · State of the build

Sections 1 through 3 are done. Sections 4 through 9 are done except the `/terms` §6
decision above. Verification is green: 76 static routes, 38 EN and 38 NL, no orphans,
no dead internal links, every EN page has its NL twin, no page missing a title or
description, no duplicate or over-length meta descriptions, and two distinct price points
sitewide — both of them in the flagged §4.

Next is section 10 (the order pipeline, the portal and the capacity gate), then 11
(motion), then 12, and section 13 last, as you asked.
