# Site-wide inconsistency and bug check

*Part (b) of "continue with 11, 12 and 13 for now. and check the website after
for inconsistenties and bugs." Sections 11, 12 and 13 were reported separately
in `REPORT-SECTION-11.md`, `WORKING-AGREEMENT.md` and `REPORT-SECTION-13.md`.
This is the check that came after.*

---

## 1 · The short version

The suite is at **72 suites, all green**, up from 42 when this check started.
Thirty of those suites are new: nine dimensions of the site that nothing was
watching before are now watched, and each of them is watched by a checker that
has itself been proven to work.

The check found **two live defects**, fixed both, and confirmed that everything
else it can see is consistent. Neither is large. Both hid in the same way — by
being the case nobody looks at — and that is the interesting part, so they get
their own section below.

The second one is worth naming here, because it changes what the number at the
top of this report means. One of the checkers in the suite was itself broken. It
had been printing OK for months on a defect it was specifically written to catch,
and the only thing that ever found out was the exercise of writing down proof
that it worked.

What the check cannot see is also written down, in section 6. That list is
short but it is not empty, and pretending otherwise would make this report
worth less than the number at the top of it.

---

## 2 · The two things that were actually broken

### 2a · Four citations pointing at the wrong lines

**Four citations in `REPORT-SECTION-14-VAT.md` were pointing at the wrong
lines.**

Section 13's work added a ten-line comment block to the head of
`src/data/pricing.js`. Everything below that block moved down by ten. Section 6
of the VAT report cites four of those lines by number — the two places the
video price appears as a Tier 0 item and the two places it is sold as a Tier 1
add-on — and after the shift all four addresses landed in the wrong place.

The reason this is worth a section rather than a line: **the report was still
true.** The claim it makes — that €49 sits in both tiers at once, deliberately,
and that section 14's per-tier VAT display rule cannot hold for a single number
in both — is exactly as correct as it was when it was written. Only the
addresses were wrong. That is the failure a reader cannot catch, because
catching it means opening a second file and counting lines, which nobody does
while reading a report.

Fixed in both places: the report now cites `:709`, `:714`, `:592`, `:661`, and
`check_report14.py`'s own table was updated to match. It is recorded as flag
**cxxxiv**, kept open as a *tooling* flag rather than closed, because the class
is general and unsolved: every line-anchored citation in every document in this
repo is one unrelated insertion away from lying, and `check_report14.py` is the
only file in the repo that holds any of them to their targets. No other report
cites code by line number today. If one starts to, it needs its own checker or
it will rot the same way this one did.

### 2b · A checker that skipped the one case it existed for

**`check_lang_parity.py` was silently ignoring an `en:` branch with no Dutch
sibling.**

The checker pairs each English object literal in the data files with its Dutch
one and compares their shapes — same keys, same array lengths, same structure at
every depth. That is the check that catches a Dutch page quietly dropping a
paragraph, because a missing key renders as nothing rather than as an error.

A branch with no sibling could not be paired, so it was skipped. Not compared,
not counted, not mentioned. Which means the single likeliest way this site loses
parity — English written, Dutch not written yet — was the exact case that
produced no output whatsoever.

The census line made it worse rather than better. Deleting a whole Dutch branch
moved the count from `19 paired en:/nl: objects, 521 top-level keys` to `18 …
518`, and the checker printed **OK** on the next line. The number that recorded
the loss and the verdict that denied it were two lines apart in the same output.

**Nothing found this in months of green runs.** What found it was writing the
mutation harness down. `mutate_check_lang_parity.py` breaks the site nineteen
different ways and asserts the checker rejects each one; on its first execution
three cases failed — an unpaired `en:` branch, an unpaired `nl:` branch, and an
entire Dutch branch deleted outright. All three exited 0.

Fixed with an `unpaired-branch` rule that names the leftover branch and its line
and says what to do about it. Two decisions in the repair are worth stating
because they are the kind that get reversed by someone tidying up later. The
object count is now pinned **exactly** — paired objects are structural, they
change a handful of times in the life of the site, and pinning them is the only
detection there is for a bilingual block vanishing. The key count is deliberately
left as a **floor**, because copy keys change on ordinary edits and a number that
goes red every time you write a sentence gets bumped without being read, which is
worse than having no number. Recorded as flag **cxxxv**.

The same defect class then turned up one level higher, in the suite runner
itself: a suite whose file had gone missing was skipped without a word, so the
run stayed green and simply got shorter. Same fix — missing is now loud, and the
suite count is pinned so that a name quietly removed from a loop fails the run.

---

## 3 · What is now watched that was not before

Nine dimensions were added during this check. Each one is a distinct class of
bug that renders perfectly, builds without complaint, and shows up only for a
visitor.

**CSS custom properties.** 42 files carrying CSS, 72 properties defined, 64
read, 1138 `var()` uses. A `var()` reading a property nothing defines falls
back silently or renders nothing at all; neither is an error. Zero of those
exist without a fallback. Nine properties are defined and read by nothing, and
one — `--pos` — is *read* three times and *set* by nothing, which means the
before/after slider on the comparison rows is permanently frozen at its 50%
fallback. Both are ratcheted at their exact counts, so the next one is a
failure rather than a fact.

**The DOM contract.** 18 files, 51 data attributes emitted, 50 read, 95
selector strings, 40 class tokens, 3 ids. This is the seam between markup and
`src/scripts/`: a script reaching for a class the markup stopped emitting is a
feature that silently stops working, and there is no error anywhere. All five
rules at zero.

**Accessibility.** 40 files, 357 headings, 275 links and buttons, 43 named form
controls, 30 label targets, 60 images. Zero unlabelled controls, zero images
without alt, zero links with no accessible name, zero orphaned `aria-*`
references. Ten heading-level skips are *recorded* rather than zero — see
section 5.

**Published promises against the code that implements them.** 72 files, 26 copy
sites across 5 promises, 5 of 5 owning constants resolved. This is the one that
matters most commercially: a page saying "typically 2–4 working days" while
`/api/capacity` serves a different number renders exactly as well as one that
agrees. The sentence is grammatical, the JSON is valid, and the disagreement is
visible only to a customer reading the page while the widget beside it fills in
from the API. Nothing throws. Nothing looks wrong.

**Language regions.** 15 files, 2492 lines inside bilingual branches. Catches
English shipped inside a Dutch branch — which is how "Timing" went out
untranslated on two live pages before this existed.

**Internal links.** 63 files, 268 hrefs against 64 routes, 14 redirects and 83
public files. Catches dead links, and separately catches a hard-coded `/pricing`
inside a component that renders in both languages: correct in English, and on
the Dutch page it silently drops the visitor back out of `/nl`. The page still
builds, the link still works, and the only symptom is a visitor whose language
changed when they clicked something.

**Page metadata.** 48 wrappers, 48 titles, 24 distinct English and 24 distinct
Dutch. **Language parity** across the data files: 19 paired `en:`/`nl:`
objects, 521 top-level keys. **The order flow**, 55 assertions.

---

## 4 · Why "all green" is a claim and not evidence

A checker that reports zero and a checker whose patterns quietly stopped
matching print the same thing. That is not a hypothetical here — one of these
checkers *did* publish a false sentence during development, and another read
one stylesheet of fifteen and printed OK on a tree with four defects in it.

So every checker in the suite is itself under test, in two layers.

A **mutation harness** breaks the site on purpose, one defect at a time, and
asserts the checker rejects each one *and* accepts the near-misses. There are
now 24 of them. The promises harness is a good example of the shape: it moves a
constant while the copy stands (someone tuned capacity and the site kept selling
the old promise) *and* moves the copy while the constant stands (someone edited
a sentence and the machine kept the old behaviour), because a harness that only
ever mutated one side would prove the rule fires without proving it looks at
both ends.

A **meta-test** then breaks the *checker* — neutering one rule at a time — and
asserts the harness goes red in exactly the places that rule is responsible for
and nowhere else. There are now 14. This is what stops a harness from being
green for the wrong reason.

This is not a theoretical hierarchy. Section 2b is what the middle layer is for,
and it fired: a checker that had been green for months turned out to be blind to
its own headline case, and the harness is what saw it. The top layer answers the
obvious next question — *what proves the harness?* — by disabling every rule in
the checker at once and asserting the harness goes red in exactly the places
those rules own. `check_links.py` needed that most, because it survived its
twenty-seven-case harness without a single edit: **a harness that has never gone
red has never demonstrated that it can.** It now has, on command.

The counts: **10 node suites, 24 static verifiers, 24 mutation harnesses, 14
meta-tests.** They run in that order because each layer is worth nothing without
the one below it.

---

## 5 · What is open, and why it stays open

**Ten heading-level skips**, in `ComparePage`, `HomePage`, `HowItWorksPage`,
`LifestylePage`, and both languages of `thank-you` and `upload-guidelines`. The
worst is `thank-you`, which goes h1 straight to h4. These are recorded rather
than fixed because fixing a heading level means seeing the rendered page, and
this container cannot build the site (section 6). They are pinned at exactly ten
— an eleventh is a failure.

**The 12-month retention promise is published in ten places and enforced by
nothing.** Five English statements and five Dutch, across both privacy pages and
both terms pages, all saying delivered visuals are kept for twelve months.
Nothing deletes anything at twelve months, and Cloudflare Pages Functions has no
cron triggers, so this promise is kept by hand or not at all. The checker now
holds all ten statements to each other so they cannot drift apart, and
deliberately does **not** invent a `RETENTION_MONTHS` constant — a constant that
nothing reads would dress the gap up as an implementation. Flag **lxiii**.

**The video price sits in both tiers at once** at the same €49. That was a good
simplicity decision and it collides with section 14's rule that Tier 0 prices
show inclusive of VAT and Tier 1 exclusive. €49 incl. and €49 excl. are
different prices. Flag **xc**; it needs a decision, not a fix.

**Three decisions are still blocking section 14**, which was deferred: whether
you are on the KOR (**lxxxix**), which payment processor (**xlii**), and the two
readings of "single-use on issue" for the portal token (**xxxviii**).

The full list, with everything smaller, is in `FLAGS.md` — 8 blocked on a
decision from you, 30 open, 15 numbered tooling flags and one unnumbered, the
rest closed.

---

## 6 · What this check cannot see

Honest limits, because a report that does not state them reads as broader than
it is.

**Nothing has been rendered.** The npm registry is blocked from this container,
so there is no `node_modules`, no `dist/`, and `astro build` has never run here.
Every check in this report is static analysis, plain `node` against the data
modules, or Playwright against hand-built HTML. **No page of this site has been
seen by a browser.** That is why heading levels are recorded rather than
corrected, and why layout, spacing and visual regressions are entirely outside
this report's scope.

**Two checkers used to be wired in without a saved mutation harness** —
`check_lang_parity.py` and `check_links.py`. Both had been negative-controlled by
hand when written and both passed, but the harness was never written to a file,
so the evidence lived in a transcript rather than in the suite. That gap is now
closed: both have harnesses, both have meta-tests, and all four are in the run.

Closing it is what found the second defect, and the split is the point. One of
the two was fine — `check_links.py` passed all twenty-seven cases without a
single edit. The other was not: `check_lang_parity.py` failed three, and they
were the three that mattered. **The hand-run negative control had said both were
sound, and it was wrong about one of them.** That is the honest reading of "I
checked it by hand and it looked right" anywhere else in this repo, and it is why
"probably load-bearing" was the correct phrase to have used here rather than the
cautious one.

**The rest of the suite has not been swept for the same defect.** A check that
skips is indistinguishable from a check that passes, and `check_lang_parity.py`
is the third instance of that shape found so far. Nothing systematically looks
for the fourth.

**No check in this repo compares a comment to its subject.** A docstring in
`order.js` was false for months and would never have gone red, because its
subject happened to be accidentally correct. Flag **cxxxii**.

---

## 7 · Where things stand

Sections 11, 12 and 13 are built and reported. The site-wide check is complete
against everything it can reach, two real defects were found and fixed, and the
verification apparatus grew from 42 suites to 72 with proof chains behind the
new ones.

Section 14 remains deferred, as instructed, and is blocked on the three
decisions in section 5 above.
