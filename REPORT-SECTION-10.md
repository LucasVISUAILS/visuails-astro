# Report — section 10, and the sync

<!-- namen-bijgewerkt -->
> **Namen bijgewerkt, 30 augustus 2026.** Dit document noemt bestanden die inmiddels anders heten of niet meer bestaan. De tekst eronder is niet herschreven — een deel van die namen staat in geciteerde foutmeldingen en bouwuitvoer, en die aanpassen zou het bewijs vervalsen in plaats van bijwerken. Wat ze vandaag zijn:
>
> - `ThreeWay.astro` → niets — verwijderd, samen met de Duitse site
> - `src/pages/order-catalog.astro` → de vier `order-*`-pagina's zijn opgegaan in één `/start` (301's staan in `public/_redirects`) — ook order-custom, order-lifestyle en order-video; /order-status is /o geworden


Written 26 July 2026, after commits `4273aa5`, `86e75de`, `a586010` and `30360d5`.

Section 10 of the brief — one order pipeline, a client portal, a capacity gate, and
host-level 301s — is built, committed, and synced to your machine. The sync is
verified rather than assumed; that verification is item 2 below.

Sections 1–9 were reported in `REPORT-SECTIONS-4-9.md`. This picks up from there.

---

## 1 · Run the two batch files in this order, or the old site comes back

**`cleanup-stale-files.bat` first. `push-to-github.bat` second.**

This is the only thing in this report that needs you, and it is destructive if
done backwards.

The reason is the same one from the last report, one round further on. The bridge
I sync over can write and overwrite but **cannot delete**. Section 10 removed
twelve order pages from the repository. They are still sitting in
`E:\Claude (VISUAILS)\visuails-astro`, and I confirmed that on your disk five
minutes ago rather than inferring it:

```
src/pages/order/                 src/pages/nl/order/
src/pages/order-catalog.astro    src/pages/nl/order-catalog.astro
src/pages/order-custom.astro     src/pages/nl/order-custom.astro
src/pages/order-lifestyle.astro  src/pages/nl/order-lifestyle.astro
src/pages/order-status.astro     src/pages/nl/order-status.astro
src/pages/order-video.astro      src/pages/nl/order-video.astro
```

`push-to-github.bat` runs `git add -A`. Run it first and those twelve files are
pushed straight back into the repository, Cloudflare rebuilds the entire old order
funnel alongside `/start`, and **nothing looks wrong** — the `_redirects` rules
still point visitors at the new pages, because Cloudflare follows redirect rules
ahead of assets. The old funnel just sits there, live, at URLs nobody is sent to,
in the build, in the repo, with its own prices and its own claims.

Two things are better than they were:

The **German site is already gone from your folder.** So is `ThreeWay.astro`, both
`models.astro` files, and the three `*.de.js` data modules — all 33 stale files
from the last report. An earlier cleanup ran. That group of the script is now a
no-op.

So `cleanup-stale-files.bat` will delete **exactly those twelve order pages and
nothing else.** I checked every one of the nineteen paths the script names against
the current repository: none of them still exists. There is no path in that script
that should survive.

The script refuses to run group 2 if `StartPage.astro` is not in the folder, so it
cannot leave you with no way to order anything. `StartPage.astro` is there
(80,270 bytes, synced today), so it will proceed.

---

## 2 · The sync is verified, byte for byte

Forty-four files went to a Windows machine I cannot see. Rather than trust the
transport, I pulled all forty-four back into the container and compared bytes.

```
files compared   : 44
byte-identical   : 44
missing on device: 0
differing        : 0
```

That covers the awkward cases specifically: `functions/o/[[token]].js` (double
brackets in a filename), `public/_redirects` (no extension), the space in
`Claude (VISUAILS)`, and two files carrying ~9,000 bytes of non-ASCII between them.

The part that mattered most was the line endings. Both `.bat` files use multi-line
`if (...)` and `for ... do (...)` blocks, and cmd.exe misparses those in an LF-only
file. Commit `30360d5` converted them to CRLF and pinned them with `.gitattributes`.
On your disk right now:

```
cleanup-stale-files.bat : 5,328 bytes, 164 CRLF, 0 bare LF
push-to-github.bat      :   907 bytes,  35 CRLF, 0 bare LF
```

Identical sha256 to the container copies. The cleanup script on your machine is
the form cmd.exe parses correctly.

One caveat worth recording, because it nearly produced a false result: the staging
tool reports success and the correct byte count while **silently serving a copy it
staged the previous day**. The first run of this check reported `push-to-github.bat`
as LF-only on your machine. It was not — the container was comparing against its
own memory of yesterday. The verifier now refuses to compare against any staged
file older than a cutoff I pass it. Without that it would have sent me rewriting a
transport that was working.

---

## 3 · The 24-hour promise and the revision rounds are gone

You asked for this directly and it has never been confirmed back to you:

> *"Change promises 'around 24 hours' delivery and 'up to 3 revision rounds' to
> everyone. Both are now wrong for a single-product order... I think revision
> rounds show insecurity, and that is something a premium service should not show."*

Both are out. Zero live mentions of either across the whole project — every
remaining occurrence of the string "24 hour" in the source is inside a comment
explaining why it was removed.

**Delivery** is now derived per tier from `pricing.js` rather than typed. A drop
gets the window the capacity gate actually cleared. A single product gets
"typically 2–4 working days" and no date at all, which is what section 13 requires.

**Revisions** are replaced by the aftercare check-in you described — we ask whether
you are happy with the photos, and if the answer is no we work out what fixes it
with you rather than counting rounds against you. That wording went into `/terms`
§6 and §10 in both languages, and `/terms` §4 no longer types its own prices; it
imports them.

Both changes are mechanised, not just done. A verifier walks every page that
derives a price or a delivery claim and fails if any of them hardcodes one, and
a test walks all six order-confirmation emails and fails if any of them names an
hour count. Both are in the suite that runs on every change.

---

## 4 · Two numbers I cannot set for you

**`PRODUCTS_PER_DAY = 18`** (`src/data/capacity.js:45`). Every date the capacity
gate offers is derived from this. At drop scope one product is a catalog set of 4
images plus a lifestyle carousel of 3, so 18 products/day is **126 finished,
human-checked images in a day.** If that is wrong, it is wrong in exactly one
place — change the constant and the whole calendar moves. The file's own assertions
will tell you immediately if a new value stops a Full Drop fitting the window it
is sold with. I have reserved 3 products/day underneath it so single-product
orders cannot be starved by drops.

**The upload caps: 25 MB per file, 80 files per batch** (`src/lib/uploads.js:47,53`).
These are printed to clients as limits. They are my guesses at what your workflow
tolerates, not measurements.

There is a third, smaller one. `/ai-act` §4 asks whether the standard-library faces
depict identifiable real people. I did not answer it, because "never invent" forbids
me answering it and it is a fact about the pipeline rather than a copy decision.
The page currently offers a per-model answer in writing instead. **If you have a
definite answer, it belongs on the page and is worth more than the offer.**

---

## 5 · One arithmetic error in your own brief

Section 13 says to trigger the upgrade prompt when a brand crosses **12** individual
products in a rolling quarter, and the example sentence in the brief has it firing
at **14**. Both are below the point where a drop is actually cheaper.

A single product à la carte is catalog (€39.99) + lifestyle (€59.99) = **€99.98**.
The Full Drop is €1,850. So:

| products | à la carte | Full Drop | prompt says |
|---|---|---|---|
| 12 | €1,199.76 | €1,850 | upgrade → pays €650 **more** |
| 14 | €1,399.72 | €1,850 | upgrade → pays €450 **more** |
| 19 | €1,899.62 | €1,850 | upgrade → correct |

**The break-even is 19.** As written, the prompt tells a good customer to spend
several hundred euros more than they need to, in a message framed as helping them
save. That is the single most expensive kind of copy to get wrong.

`pricing.js` already derives the true figure (`UPGRADE_BREAK_EVEN`, currently 19)
so whichever number you choose it will only be written once. I have not built the
prompt yet — section 13 comes last — so this is a decision you still have.
Flagging rather than silently correcting, as the brief asks.

---

## 6 · Where the site stands

Sections 1 through 10 of the brief are done. Remaining: **11** (motion / Lenis),
**12** (working agreement), **13** (service tiers) last, as you asked.

Route census: 64 pages, 5 function patterns, 82 public assets, 62 URLs in the
sitemap. EN and NL are in step — 24 style-block pairs compared with zero
mismatches, 34 i18n keys present in both locales with none missing from either.
No orphaned hooks, no dead internal links, no missing images. The 28 redirect
rules are all explicit 301s, all resolving, each route present in both slash
forms, and none of them shadows a live route.

The verification suite is 32 suites, all green. It is not just a set of checks —
every checker in it ships with a harness that feeds it deliberately broken input
and fails if it does not object, and three of those harnesses are themselves tested
against sabotaged copies of what they audit. A check that has only ever passed is
indistinguishable from a check that cannot fail, and this project has enough of
them now that the difference matters.

One thing that is worth saying plainly: **no page of this site has ever been
rendered by Astro in this container.** The npm registry is blocked here, so
`astro build` cannot run. Everything above is verified by static analysis, plain
Node, and browser testing of extracted logic — which is why the suite is as
paranoid as it is. The first real render happens on Cloudflare.
