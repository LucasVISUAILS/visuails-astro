# TASK 0 — Full site audit before the repositioning

**Scope:** 58 page files (29 routes × EN/NL) = 74 URLs including dynamic style slugs, plus the shared Layout (header, mobile drawer, footer, cookie bar) and the design-token layer.

**Method:** every route enumerated from `src/pages/**`, every `<section>` extracted with its heading, then judged against the new brief — drop as unit of sale, monochrome + hard edges + chrome, new navigation, one `/start` pipeline.

**Verdict key**
- **KEEP** — survives as-is, only gets the new visual system (radius 0, mono palette, type).
- **RESTYLE** — content stands, but the section is built on radius/colour/shadow that section 1–2 kills; rebuild the shell.
- **REWRITE** — copy or claim is wrong under the new positioning; new words needed.
- **DEMOTE** — stays on the site but moves down the page or down the IA.
- **REMOVE** — deleted (URL 301s where it had traffic).

EN and NL are exact structural mirrors — every verdict below applies to both files. Where NL diverges it is called out.

---

## A · Shared surfaces (`src/layouts/Layout.astro`, `src/i18n/ui.js`)

| Surface | Verdict | Note |
|---|---|---|
| Header nav: Services ▾ · Pricing · Gallery · Test Sample · FAQ · Contact | **REWRITE** | Becomes Drops ▾ · Your Brand Model · Gallery · Pricing · Start · Contact. FAQ drops out of the top bar into the footer. Catalog / Lifestyle / Video become the Drops sub-items. |
| Header CTA "Order now" → `/order` | **REWRITE** | Becomes **Start** → `/start`. |
| Language switcher (flags) | **RESTYLE** | Flags are the only saturated colour left in the chrome. Replace with `EN / NL` text toggle in ink. |
| Mobile drawer (mirrors nav) | **REWRITE + RESTYLE** | Same IA change; drawer panel must lose its radius and its blur. |
| Footer: Services / Company / Get in touch | **KEEP + REWRITE labels** | Structure is right. Column 1 renames to Drops, gains Your Brand Model; Company gains AI Act. |
| Cookie bar | **RESTYLE** | Square, hairline, ink-only. |
| Sticky "test sample" CTA bar | **KEEP** | Brief keeps €0.99 sample as primary CTA sitewide. |
| Grain / colour-wash body layers | **REMOVE** | Purple wash and grain are the old palette's mood. Mono system carries mood through paper values. |
| `--r-sm/lg/xl/2xl/pill/media` tokens (52 uses in global.css, 154 inline in pages) | **REMOVE → `--radius: 0`** | Single largest mechanical job in section 1. |
| Purple/cyan palette (`--brand #7B6CF5`, `--accent-bright #5FE3F0`, `--success #63C79A`) | **REMOVE** | Replaced wholesale by the ink/paper OKLCH ramp. `--success` green is explicitly banned. |
| `#hero-shader` WebGL | **REWRITE** | Kept as a technique, re-authored as the chrome field with fresnel; hero headline moves onto a solid `--ink-900` plate. |

---

## B · Homepage — `/` and `/nl` (`index.astro`)

17 sections. This page carries the whole repositioning.

1. **COVER** — hero, 3-line H1 "The brand you envisioned, visualized." + ticker → **KEEP H1, REWRITE subline, REBUILD shell.** H1 is explicitly preserved. Chrome field behind it, ink plate under the type, ticker demoted or cut.
2. **STATEMENT** (clothing-brand niche + recognition line) → **KEEP, RESTYLE.**
3. **DEVELOP** "One photo in. The rest is ours." + Compare slider + WhatsApp reply line → **REWRITE.** "One photo in" is the per-product story; the drop story is "one folder in". Compare slider stays (rebuilt square, GSAP draggable, keyboard).
4. **"Real output. Zero photoshoots."** → **KEEP, RESTYLE.**
5. **"Four ways to look bigger than you are."** → **KEEP.** Explicitly protected by the brief.
6. **SET** "How it all comes together" (Catalog / Lifestyle / Video grid) → **DEMOTE.** Moves below the custom-model section; reframed as what's *inside* a drop rather than as the menu.
7. **LEDGER** "One product. Four photos. €39.99. That's the deal." (accordion, per-product prices, "About €10 a photo") → **REMOVE from homepage.** Replaced by "One drop. One deadline. One invoice." — €1,850 / 48 hours. The accordion content migrates to `/pricing`'s bottom small-orders block.
8. **BRAND ANATOMY** → **KEEP, RESTYLE.**
9. **PROCESS** "From photo to publish" (Upload / We build / …) → **REWRITE.** Steps become drop-shaped; the 24-hour claim here is corrected to 48 hours for a drop.
10. **Marquee** → **KEEP or REMOVE** — decorative; keep only if it survives the mono system without reading as filler. My recommendation: keep, set in ink hairline.
11. **QUALITY** "The more you show us, the more we guarantee." → **KEEP, RESTYLE.**
12. **LEAD MAGNET** (one-page checklist) → **KEEP.** Explicitly preserved.
13. **MODELS** "One face. Every campaign." → **PROMOTE + REWRITE.** Becomes full-width, above the services grid, headline "One face. Every drop. Only yours."
14. **AI COMPARE** "Not all AI is equal." → **REWRITE.** Reanchored to the shoot day, not to AI tools.
15. **ThreeWay** component (per-photo pricing inside) → **REWRITE.** Table reorders: photoshoot primary (€2,500–8,000, 2–4 weeks), VISUAILS second (€1,850, 48h), AI tool third. Per-photo figures stripped.
16. **PROMISE** "No wall of reviews yet." → **KEEP.** Explicitly protected.
17. **PLANS** "Find your way in" (Per product / Custom & volume) → **REWRITE.** Becomes the four packages.
18. **CLOSE** "See it on your own product first." (€0.99 sample) → **KEEP.**
- **NEW:** "The photo is the fitting room." block, high on page, with the mandatory small print.
- **NEW:** case-study section, three empty slots, must read as resolved when empty.
- **NEW:** "The first three brands, free." replacing the founding-perks copy.

---

## C · Service pages (become Drops sub-items — URLs unchanged)

### `/catalog` · `/nl/catalog` — 10 sections
Hero **KEEP** · "One product. Four photos. €39.99." **DEMOTE** (drops below the SEO block, loses "About €10 a photo") · SEO explainer "clarity that closes the sale" **KEEP** · style picker **KEEP, RESTYLE** · three-steps **KEEP** · "Everything a listing needs" **KEEP** · before/after **KEEP, RESTYLE** · "Fast means nothing if it isn't right" **KEEP** · FAQ **KEEP** · CTA band **REWRITE** (points at `/start`, not `/order-catalog`).

### `/catalog/[slug]` — `classic`, `custom` (×2 languages) — 7 sections
All **KEEP + RESTYLE**. Only change: 24-hour claims audited (single product — the claim is *valid* here), CTA repointed to `/start`.

### `/lifestyle` · `/nl/lifestyle` — 8 sections
Hero **KEEP** · "One product. Three photos. A carousel." **KEEP** (recent work, still true) · four moods **KEEP, RESTYLE** · SEO explainer **KEEP** · "Add a consistent model" **REWRITE** (points at Your Brand Model) · four transformations **KEEP** · "The range, in motion" **KEEP** · CTA **REWRITE**.

### `/lifestyle/[slug]` — `dunes`, `flash`, `glow`, `phone-made`, `custom` — 8 sections each
All **KEEP + RESTYLE**. `glow` as a style name is fine (it's a lighting look, not the removed UI glow).

### `/video` · `/nl/video` — 6 sections
Hero **KEEP** · ways to add motion **KEEP, RESTYLE** · SEO explainer **KEEP** · "Two ways to buy video" **REWRITE** (needs a ruling — see flag 6) · photo strip **KEEP** · CTA **REWRITE**.
`--success` green ticks on the checklist → **RESTYLE** (ink).

### `/video/[slug]` — `motion`, `lifestyle`, `campaign`, `custom` — 6 sections each
All **KEEP + RESTYLE**.

---

## D · Model pages → merge into "Your Brand Model"

### `/models` — 7 sections
Hero "One face. Every visual." **KEEP** · intro **KEEP** · `#standard` roster **KEEP, RESTYLE** (thumbnails square, never circular) · `#custom` **REMOVE — duplicate** · "How a custom model comes together" **REMOVE — duplicate** · "What you provide / Pricing & timing" **REMOVE — duplicate** · CTA **KEEP**.

### `/custom-models` — 9 sections
This is the stronger of the two. **KEEP as the merge target**, rewritten under "Your Brand Model" with the €1,250 setup + €250-credit copy. `/models` 301s here (or the reverse — see flag 8).
Sections: hero **KEEP** · "Your model, not a model" **KEEP** · SEO explainer **KEEP** · directions grid **KEEP, RESTYLE** · "Real output, not a mockup" **KEEP** · "Why not just prompt a generic AI tool?" **KEEP** · process **KEEP** · "What you provide / Pricing & timing" **REWRITE** (new pricing) · CTA **REWRITE**.

---

## E · Order funnel → collapses into `/start`

| Route | Verdict |
|---|---|
| `/order` (hub, 3 sections) | **REMOVE** → 301 `/start` |
| `/order-catalog` (3 sections) | **REMOVE** → 301 `/start` |
| `/order-lifestyle` (3 sections) | **REMOVE** → 301 `/start` |
| `/order-video` (3 sections) | **REMOVE** → 301 `/start` |
| `/order-custom` (3 sections, WhatsApp deep-link hand-off) | **REMOVE** → 301 `/start`. Its WhatsApp link pattern survives as the square launcher; the rounded WhatsApp button style does not. |
| `/order-status` (2 sections, shows a fabricated example order **VIS-10428**) | **REMOVE** → 301 `/o/…` entry. Invented order data also trips the "never invent" rule. |
| `/thank-you` (2 sections, order-ref display) | **KEEP, RESTYLE.** Still the post-`/start` landing until the portal handles it. |
| `/test-sample` (6 sections) | **KEEP as its own route** *and* branch one of `/start` step 1, per brief. Two-step form **RESTYLE** (square inputs, `appearance:none`). |
| **NEW `/start`** | 5 steps, capacity-gated date picker, R2 presigned uploads, Stripe with `borderRadius: '0px'`. |

---

## F · Content & trust pages

| Route | Sections | Verdict |
|---|---|---|
| `/pricing` | 11 | **REWRITE.** Four packages up top, each compared against a shoot day; "Pay as you go" per-product table **DEMOTED** to a bottom "add to an existing drop / small orders" block; `€1,000–2,000+ / day` anchor → `€2,500–8,000`; add-ons and volume blocks fold into the packages. |
| `/compare` | 5 | **REWRITE, URL kept.** Becomes "Shoot day vs VISUAILS". See flag 5 — I want to keep an AI-tools section inside it rather than lose that search intent. |
| `/how-it-works` | 6 | **REWRITE.** "One photo in. A campaign out." → drop-shaped. All ~24h claims corrected. |
| `/about` | 5 | **KEEP, RESTYLE.** Voice is right; no pricing claims. |
| `/faq` | 3 (grouped Q&A) | **REWRITE selectively.** Contains "about €10 a photo" and 24h claims. |
| `/gallery` | 4 | **KEEP, RESTYLE.** Masks must be hard-edged; WebGL crossfade only. |
| `/guides` | 3 (5 cards) | **KEEP, RESTYLE.** Update 24h claims inside guide copy. |
| `/upload-guidelines` | 4 | **KEEP, RESTYLE.** Becomes more load-bearing — `/start` step 3 links here. |
| `/contact` | 3 | **KEEP, RESTYLE.** |
| `/privacy` | 3 | **REWRITE (additions).** Must gain the 90-day source-file retention clause and the portal-token statement. |
| `/terms` | 3 | **REWRITE (additions).** Retention clause, capacity/delivery-window wording, deposit terms (50/50). |
| `/cookie-policy` | 2 | **KEEP.** |
| **NEW `/ai-act`** | — | **BUILD.** Copy supplied in the brief; hard constraints respected. |

---

## G · Redirect map (nothing breaks)

```
/order              → /start        301
/order-catalog      → /start        301
/order-lifestyle    → /start        301
/order-video        → /start        301
/order-custom       → /start        301
/order-status       → /o            301
/models             → /custom-models   301   (see flag 8 — SHIPPED)
```
This line originally read `→ /your-brand-model`. Flag 8 below argued against
minting a third slug and won, so the merge shipped onto `/custom-models`.
`astro.config.mjs` now carries a `redirects` entry for `/models` and
`/nl/models` so neither 404s in the meantime — in a static build that is a
meta-refresh stub, not a real 301, so section 10 still has to replace both with
host-level 301s alongside the `/order*` set.

Plus `/nl/*` equivalents for all of the above. `/catalog`, `/lifestyle`, `/video` and every `[slug]` URL stay exactly where they are.

---

## H · Flags — positioning & pricing (section 12 requires these, not a silent workaround)

**1 · The package prices are inverted against the per-product prices, and against each other.**
Full Drop €1,850 for 20–30 products is €61.67–€92.50 per product. Drop Pilot €650 for exactly 8 is €81.25 per product. Current à-la-carte Catalog is €39.99 per product. So: a brand with 25 products pays **€1,000 buying à la carte** and **€1,850 buying the Full Drop** — the package costs 85% more than the same products bought individually, and the per-product block we are keeping on `/pricing` is the cheaper door. Any prospect who does the arithmetic finds it. Also, Full Drop at the low end of its range (20 products, €92.50 each) is *more expensive per unit* than Drop Pilot (€81.25). Volume should reward volume. Three ways out: (a) a drop includes materially more per product than the €39.99 tier — say catalog set + lifestyle carousel + a video — and we say so on the price; (b) the per-product tier rises; (c) the drop prices come down. **This needs your decision before I write any pricing copy.**

**2 · The shoot-day anchor at €2,500–8,000 is high enough to cost trust.** A small NL clothing brand booking a photographer, a small studio and one model for a day pays well under that; the current €1,000–2,000 line is closer to what they've actually quoted. If a prospect has a real quote in their inbox, an €2,500–8,000 anchor reads as inflated and takes the rest of the page down with it. Recommendation: keep the higher range but *itemise* it on the page (photographer + studio + model + styling + retouch + your day), so it's defensible, or narrow to €2,000–5,000. Either way I'd label it as a range for a full-day production, not "a shoot".

**3 · "The first three brands, free." collides with the €0.99 test sample.** If the first three brands get a drop free, the €0.99 sample is a weaker offer than the thing sitting next to it, and both are on the page at once. It also gives away up to €5,550. Needs scoping — free *what*, exactly (a Drop Pilot? a Full Drop?), and what we get back (a named case study, permission to publish, a testimonial). I'd write it as "The first three brands, free — in exchange for a published case study," and retire it the moment three slots are gone.

**4 · The 48-hour drop promise is a bigger operational commitment than the 24-hour single.** 20–30 products finished, reviewed and delivered in 48 hours is the load-bearing claim of the whole reposition. The capacity gate protects the calendar, but it does not protect a single overloaded 48-hour window. I'd want the ceiling constant set deliberately (products/48h, not drops/week) before `/start` ships a date the site is bound to.

**5 · Rewriting `/compare` to "Shoot day vs VISUAILS" abandons a live search intent.** The page currently ranks for and answers "AI photo tools vs done-for-you". That's a real acquisition query and the honest tone of that page is one of the site's better assets. Recommendation: rewrite the page as briefed *and* keep a shorter "and if you're weighing a self-serve tool" section inside it, rather than deleting the AI comparison from the site entirely.

**6 · Video has no home in the drop model.** The four packages (Drop Pilot, Full Drop, Brand Model, Studio retainer) don't mention video, but `/video` stays as an SEO landing with "from €49 / video" and a campaign-quote tier. Either video is included in a drop (say how many clips), or it's a priced add-on to a drop, or it stays a separate small order. Right now the site would say all three.

**7 · Retention (90 days) and portal expiry (90 days) are the same number, so the client's gallery dies with their source files.** Deliveries should outlive sources. Suggest: source files deleted 90 days after close; delivery gallery and download links live 12 months; both stated in terms.

**8 · Merge direction for the model pages.** `/custom-models` is the better page and has the stronger URL for the new "Your Brand Model" positioning; `/models` has the standard-roster content and likely the older backlinks. My recommendation: keep **`/custom-models`** as the live URL (it already carries the exclusive-face story), fold the `#standard` roster into it as a secondary block, and 301 `/models` → `/custom-models`. Introducing a third URL (`/your-brand-model`) would burn the equity of both. Tell me if you'd rather have the clean new slug.

**9 · "This log IS the AI Act human-review documentation" needs softer wording.** Section 8 forbids asserting where legal liability sits; saying the approval log *is* your compliance documentation is exactly that assertion. I'll write it as: every approval and revision is timestamped and exportable as a PDF record of human review — factual, no claim about what it satisfies.

**10 · Two mechanical debts worth naming before section 1 starts.** 154 inline `border-radius` declarations across page files plus 52 in `global.css`, and `--success` green used as an inline `style="stroke:var(--success)"` on checklists across at least six page files. Both are find-and-replace-shaped, but they're in page files, not just the stylesheet, so the radius-0 pass is a real sweep, not a token change.

---

## I · What I need from you to start

- **Approve or amend the verdicts above** (particularly the REMOVEs: `/order*` × 5, `/order-status`, the duplicated `/models` sections, and the homepage ledger).
- **Decide flag 1** (package vs per-product pricing) — this blocks all pricing copy.
- **Decide flag 8** (merge direction) — this blocks the redirect map.
- Flags 2, 3, 5, 6, 7 change copy but not structure; I can proceed on my recommendations if you'd rather not adjudicate each one.

On approval I start with sections 1–3 (radius 0 → monochrome → chrome), then 4–9 (copy and pricing), then 10 (`/start` + portal), then 11 (motion) last, exactly as the build order specifies.
