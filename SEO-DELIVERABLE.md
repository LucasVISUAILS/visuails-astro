# SEO deliverable

**What this is.** The five SEO items on the closing `## Deliver:` list of the
repositioning brief, plus the implementation checklist, written against the
build in `dist/` rather than against the brief's intentions. Every route,
title, description, H1, JSON-LD node, anchor and filename below was extracted
from the shipped files by script; nothing in the tables was typed by hand, so
this document cannot describe a page the build does not have.

Three items on that Deliver list are not here and are not missing: the order
pipeline / capacity-gate / client-portal spec, the resolved answers on the two
open decisions, and the design-system reference. Those live in `PRODUCT.md`,
`FLAGS.md` + `WORKING-AGREEMENT.md` §12, and `DESIGN.md` respectively, and
duplicating them here would create a second copy to keep in step.

**Where it disagrees with the brief, it says so.** Section 4 in particular:
the internal-linking plan the brief specifies is *partly* implemented, and the
part that is not is enumerated rather than smoothed over.

Measured against the build of 68 HTML pages in `dist/`, `public/sitemap.xml`
(64 URLs), `public/_redirects` (24 lines) and `public/img` (73 files).

---

## 1 · Sitemap structure

The build emits 68 HTML pages: 34 English at `/`, 34 Dutch at `/nl`, a strict
one-to-one pair for every route. Four of them carry `noindex, follow` and are
absent from `sitemap.xml` — the two 404s and the two thank-you pages — which
is why the sitemap holds 64 URLs and not 68. There is no route in the sitemap
that the build does not produce, and no indexable route the build produces
that the sitemap omits.

Roles used in the tree:

- **pillar** — one per deliverable type, plus the premium differentiator. These
  are the four routes that carry `Service` schema.
- **supporting** — content and trust pages that feed the pillars.
- **style** — a child of a pillar, one per named style. Long-tail, thin by
  design: a name, a price, a gallery and an order button.
- **flow** — the order pipeline and the pages that exist to be arrived at.
- **legal** — reference documents, linked from the footer bottom row only.
- **noindex** — served, crawlable, explicitly excluded.

The homepage sits above the vocabulary: it is the entry point, and it links
into every pillar.

```
/                                    homepage · entry point           [index]
├── /catalog                         pillar · Service schema          [index]
│   ├── /catalog/classic             style                            [index]
│   └── /catalog/custom              style                            [index]
├── /lifestyle                       pillar · Service schema          [index]
│   ├── /lifestyle/glow              style                            [index]
│   ├── /lifestyle/dunes             style                            [index]
│   ├── /lifestyle/flash             style                            [index]
│   ├── /lifestyle/phone-made        style                            [index]
│   └── /lifestyle/custom            style                            [index]
├── /video                           pillar · Service schema          [index]
│   ├── /video/motion                style                            [index]
│   ├── /video/lifestyle             style                            [index]
│   ├── /video/campaign              style                            [index]
│   └── /video/custom                style                            [index]
├── /custom-models                   pillar · Service schema          [index]
├── /models                          supporting · standard roster     [index]
├── /pricing                         supporting · Product ×7 + FAQ    [index]
├── /how-it-works                    supporting                       [index]
├── /gallery                         supporting                       [index]
├── /compare                         supporting · shoot day vs drop   [index]
├── /guides                          supporting · content hub         [index]
├── /faq                             supporting · FAQPage             [index]
├── /about                           supporting                       [index]
├── /contact                         supporting                       [index]
├── /upload-guidelines               supporting                       [index]
├── /ai-act                          supporting · trust, footer-only  [index]
├── /start                           flow · the 5-step pipeline       [index]
├── /test-sample                     flow · €1 trial · Product     [index]
├── /thank-you                       flow · post-conversion        [NOINDEX]
├── /privacy                         legal                            [index]
├── /terms                           legal                            [index]
├── /cookie-policy                   legal                            [index]
└── /404                             error                         [NOINDEX]

/nl                                  — the same 34 routes, same roles, same
                                       nesting, same four noindex pages.
```

Dutch mirrors English exactly. Every EN route has a `/nl` twin at the same
slug — the slugs are not translated (`/nl/catalog`, not `/nl/catalogus`), and
the style children keep their English style names because the style names are
product names. All 68 pages carry `hreflang` `en` / `nl` / `x-default` with
full reciprocity and a self-referencing canonical.

### Routes that are not in `dist/`

Four surfaces are Cloudflare Pages Functions, not static pages. They never
render through `Layout.astro`, never appear in the sitemap, and set their own
headers:

| Route | Served by | Robots |
|---|---|---|
| `/o` and `/o/<portal_token>` | `functions/o/index.js`, `functions/o/[[token]].js` → `src/lib/portal.js` | `x-robots-tag: noindex, nofollow` **and** `<meta robots>` `noindex, nofollow, noarchive` |
| `/account`, `/account/login`, `/account/me` | `functions/account/*` → `src/lib/account.js` | same pair |
| `/admin`, `/admin/login`, `/admin/logout` | `functions/admin/[[path]].js` → `src/lib/admin.js` | same pair |
| `/api/*` | `functions/api/*` | JSON endpoints, no HTML |

`robots.txt` deliberately does **not** `Disallow` any of these. The reasoning
is written into the file itself: a `Disallow` forbids the fetch that would
carry the `x-robots-tag`, so a leaked portal URL could still be indexed as a
bare URL. Letting the crawler in to be told no is stronger than keeping it
out. The one `Disallow` in the file is `/thank-you`, which also carries the
meta tag — belt and braces on the page that costs a conversion every time
someone lands on it cold.

### The 24 redirects

`public/_redirects` carries 24 lines, every one of them an explicit `301`.
Cloudflare Pages defaults to 302, and a retired route that 302s tells a search
engine to keep the old URL indexed, which is the opposite of the point. The
file covers three groups:

| Sources | Destination | Lines | What it covers |
|---|---|---|---|
| `/order`, `/order-catalog`, `/order-custom`, `/order-lifestyle`, `/order-video` | `/start` | 10 | The retired six-page order funnel. Five sources, each listed twice — with and without a trailing slash, because Cloudflare treats those as distinct sources and the site builds with `trailingSlash: 'ignore'`. |
| the same five under `/nl/` | `/nl/start` | 10 | The Dutch half of the same funnel. |
| `/order-status`, `/nl/order-status` | `/o` | 4 | The old order-lookup form. Both languages land on `/o`: the portal is one Function that answers in the language the *order* was placed in, so there is no `/nl/o` to send anyone to. |

Two constraints the file records and this document repeats because they are
easy to break later: a rule in `_redirects` outranks a real page, so a typo in
the left column silently takes a live route off the air with no build error;
and no splats are used, so every source is auditable against `src/pages/` by
eye. `astro.config.mjs` carries no `redirects` block on purpose — Astro's
static implementation emits a meta-refresh stub, which is a 200, not a 301.

The `/models` → `/custom-models` redirect that §H·8 once specified is **not**
in the file. `/models` is a real route again (task #270, 2026-07-29) and
shares its roster data with `/custom-models` through `src/data/models.js`. The
reasoning is left in `_redirects` as a comment so that the next person who
greps for a stale redirect finds the decision instead of nothing.

---

## 2 · Page-by-page SEO breakdown

Every indexable English route — 32 of them. Titles, descriptions and H1s are
the exact strings in `dist/`; character counts are of those strings as
shipped, including the ` | VISUAILS` or ` — VISUAILS` suffix where one is
present. "Links out" and "links in" count **body** links only: anchors inside
`<main>`, excluding the header nav, the mobile drawer, the footer and the
persistent conversion bar, all of which appear identically on all 68 pages and
would otherwise report every page as linking to every other.

All 32 titles are at or under 60 characters (longest: `/guides` at 59) and all
32 descriptions are at or under 155 (longest: `/gallery` at 153).
`src/data/meta.js` sets a hard ceiling of 152 for the *assembled* descriptions
on the style pages — it drops trailing clauses rather than truncating — and
the hand-written prose descriptions on the other pages run slightly above it,
to 153 EN and 155 NL.

| URL | Title | Len | Meta description | Len | H1 | Primary intent / keyword | Links out (body) | Links in (body) |
|---|---|---|---|---|---|---|---|---|
| `/` | Product visuals for clothing brands, no shoot \| VISUAILS | 56 | Catalog and lifestyle visuals for clothing brands, from your own product photos. No shoot. 25–30 products for €1,850. See it on yours for €1. | 144 | The brand you envisioned, visualized. | “product visuals for clothing brands” — category entry, commercial | **10** — `/ai-act`, `/catalog`, `/contact`, `/custom-models`, `/lifestyle`, `/models`, `/pricing`, `/start`, `/test-sample`, `/video` | **2** — `/404`, `/thank-you` |
| `/about` | VISUAILS — About us | 19 | VISUAILS is a product-visual studio in Enschede, Netherlands — modern production speed with human judgement on every visual we deliver. | 135 | Great visuals, without the studio. | brand/company lookup — navigational | **1** — `/test-sample` | **0** — none |
| `/ai-act` | AI Act transparency — VISUAILS | 30 | How VISUAILS visuals are made, what we can put in writing about an order, and what we will not claim on your behalf under the EU AI Act. | 136 | AI Act | “AI Act transparency” — trust, informational | **1** — `/contact` | **2** — `/`, `/faq` |
| `/catalog` | Catalog photos for clothing brands, no shoot \| VISUAILS | 55 | €89.99 per product: four photos — front, back, a fabric or logo close-up, and one on-model shot. Typically 2–4 working days. | 124 | Clean, consistent product visuals — built to scale. | “catalog photos for clothing brands” — commercial | **4** — `/catalog/classic`, `/catalog/custom`, `/pricing`, `/start` | **5** — `/`, `/catalog/classic`, `/catalog/custom`, `/pricing`, `/start` |
| `/catalog/classic` | Classic — Catalog style \| VISUAILS | 34 | Classic: a signature VISUAILS catalog style. €89.99 / product — 4 photos. Typically 2–4 working days. Human-checked, every visual. | 130 | Classic. | “classic catalog style” — style long-tail | **3** — `/catalog`, `/start`, `/test-sample` | **1** — `/catalog` |
| `/catalog/custom` | Custom Brand — Catalog style \| VISUAILS | 39 | Custom Brand: a signature VISUAILS catalog style. Designed once — then €89.99 / product. Typically 2–4 working days. Human-checked, every visual. | 145 | Custom Brand. | “custom brand catalog style” — style long-tail | **3** — `/catalog`, `/start`, `/test-sample` | **1** — `/catalog` |
| `/compare` | Shoot day vs VISUAILS — the honest comparison | 45 | A production day runs €2,500–8,000. A drop is €1,850 for 25–30 products. The honest comparison, including where a shoot day still wins. | 135 | A shoot day, or a drop. | “shoot day vs …” — comparison, mid-funnel | **3** — `/pricing`, `/start`, `/test-sample` | **2** — `/custom-models`, `/guides` |
| `/contact` | VISUAILS — Contact us | 21 | Questions about an order, support, or a custom request? Message VISUAILS on WhatsApp or email hello@visuails.com — we usually reply within the hour. | 148 | Let's grow together. | contact lookup — navigational | **3** — `/faq`, `/pricing`, `/test-sample` | **6** — `/`, `/ai-act`, `/faq`, `/pricing`, `/privacy`, `/video` |
| `/cookie-policy` | Cookie Policy — VISUAILS | 24 | How VISUAILS uses cookies: essential cookies by default, analytics only with your consent. | 90 | Cookie Policy | legal reference — no search intent targeted | **1** — `/privacy` | **1** — `/privacy` |
| `/custom-models` | Your Brand Model — one face, every drop \| VISUAILS | 50 | One face, designed for your brand alone — on every product, every drop. €1,250 one-time setup, €250 back on each of your first 5 drops. | 135 | One face. Every drop. Only yours. | “your brand model” — premium differentiator, commercial | **4** — `/compare`, `/models`, `/pricing`, `/start` | **5** — `/`, `/faq`, `/lifestyle`, `/models`, `/pricing` |
| `/faq` | Frequently asked questions — VISUAILS | 37 | What a drop is, what it costs (€1,850 for 25–30 products), how the calendar works, what if something is off, rights and payment — answered plainly. | 147 | Questions, answered. | question queries about a drop — informational | **6** — `/ai-act`, `/contact`, `/custom-models`, `/pricing`, `/terms`, `/test-sample` | **3** — `/contact`, `/guides`, `/how-it-works` |
| `/gallery` | VISUAILS — A look at the styles we produce | 42 | The real VISUAILS photo library — campaign, Dunes, Flash, Glow and Phone-made lifestyle visuals. Get a feel for the range, then start with a test sample. | 153 | A look at the styles we produce | “styles we produce” — visual browsing, mid-funnel | **2** — `/start`, `/test-sample` | **1** — `/lifestyle` |
| `/guides` | Guides — product photography for clothing brands \| VISUAILS | 59 | Practical guides for clothing and e-commerce brands: photographing your product with a phone, AI visuals against a shoot, and what product visuals cost. | 152 | Everything worth knowing before you shoot. | “product photography for clothing brands” — informational hub | **7** — `/compare`, `/faq`, `/how-it-works`, `/pricing`, `/start`, `/test-sample`, `/upload-guidelines` | **0** — none |
| `/how-it-works` | How it works — VISUAILS | 23 | You send the products. We check capacity, confirm a window, then produce and hand-check every visual. Shop-ready files for 25–30 products. | 138 | One folder in. A whole drop out. | “how it works” — process, mid-funnel | **5** — `/faq`, `/start`, `/terms`, `/test-sample`, `/upload-guidelines` | **1** — `/guides` |
| `/lifestyle` | Lifestyle photos that sell the product \| VISUAILS | 49 | Three photos of one product in one styled look — a carousel ready to post. €129.99 per product. Typically 2–4 working days. | 123 | Your product, in scenes that sell. | “lifestyle photos that sell the product” — commercial | **9** — `/custom-models`, `/gallery`, `/lifestyle/custom`, `/lifestyle/dunes`, `/lifestyle/flash`, `/lifestyle/glow`, `/lifestyle/phone-made`, `/pricing`, `/start` | **6** — `/`, `/lifestyle/custom`, `/lifestyle/dunes`, `/lifestyle/flash`, `/lifestyle/glow`, `/lifestyle/phone-made` |
| `/lifestyle/custom` | Custom — Lifestyle style \| VISUAILS | 35 | Custom: a signature VISUAILS lifestyle style. On request. Typically 2–4 working days. Human-checked, every visual. | 114 | Custom. | style long-tail | **3** — `/lifestyle`, `/start`, `/test-sample` | **1** — `/lifestyle` |
| `/lifestyle/dunes` | Dunes — Lifestyle style \| VISUAILS | 34 | Dunes: a signature VISUAILS lifestyle style. €129.99 / product. Typically 2–4 working days. Human-checked, every visual. | 120 | Dunes. | style long-tail | **3** — `/lifestyle`, `/start`, `/test-sample` | **1** — `/lifestyle` |
| `/lifestyle/flash` | Flash — Lifestyle style \| VISUAILS | 34 | Flash: a signature VISUAILS lifestyle style. €129.99 / product. Typically 2–4 working days. Human-checked, every visual. | 120 | Flash. | style long-tail | **3** — `/lifestyle`, `/start`, `/test-sample` | **1** — `/lifestyle` |
| `/lifestyle/glow` | Glow — Lifestyle style \| VISUAILS | 33 | Glow: a signature VISUAILS lifestyle style. €129.99 / product. Typically 2–4 working days. Human-checked, every visual. | 119 | Glow. | style long-tail | **3** — `/lifestyle`, `/start`, `/test-sample` | **1** — `/lifestyle` |
| `/lifestyle/phone-made` | Phone-made — Lifestyle style \| VISUAILS | 39 | Phone-made: a signature VISUAILS lifestyle style. €129.99 / product. Typically 2–4 working days. Human-checked, every visual. | 125 | Phone-made. | style long-tail | **3** — `/lifestyle`, `/start`, `/test-sample` | **1** — `/lifestyle` |
| `/models` | Ten standard models, in every drop \| VISUAILS | 45 | Ten standard models, shared across every brand and included in every drop at no extra cost. Pick one, or let us match one to your product. | 138 | Ten faces. Already included. | “standard models included” — objection handling, commercial | **3** — `/custom-models`, `/pricing`, `/start` | **2** — `/`, `/custom-models` |
| `/pricing` | Pricing — VISUAILS | 18 | Priced by the drop — Drop Pilot €650, Full Drop €1,850 for 25–30 products. Individual products from €89.99. | 107 | Priced by the drop, not by the image. | “pricing” — transactional | **5** — `/catalog`, `/contact`, `/custom-models`, `/start`, `/test-sample` | **11** — `/`, `/catalog`, `/compare`, `/contact`, `/custom-models`, `/faq`, `/guides`, `/lifestyle`, `/models`, `/start`, `/video` |
| `/privacy` | Privacy Policy — VISUAILS | 25 | How VISUAILS collects, uses and protects your personal data — written in plain English and aligned with the EU GDPR. Enschede, Netherlands. | 139 | Privacy Policy | legal reference — no search intent targeted | **2** — `/contact`, `/cookie-policy` | **2** — `/cookie-policy`, `/terms` |
| `/start` | Start an order — VISUAILS | 25 | Two ways to work with VISUAILS: run a whole drop with a reserved window, or order individual products from the standard queue. Same pipeline either way. | 152 | Two ways in. | order intent — transactional flow | **3** — `/catalog`, `/pricing`, `/test-sample` | **24** — `/`, `/404`, `/catalog`, `/catalog/classic`, `/catalog/custom`, `/compare`, `/custom-models`, `/gallery`, `/guides`, `/how-it-works`, `/lifestyle`, `/lifestyle/custom`, `/lifestyle/dunes`, `/lifestyle/flash`, `/lifestyle/glow`, `/lifestyle/phone-made`, `/models`, `/pricing`, `/terms`, `/test-sample`, `/upload-guidelines`, `/video`, `/video/lifestyle`, `/video/motion` |
| `/terms` | Terms of Service — VISUAILS | 27 | The terms governing your use of VISUAILS — AI-assisted, human-reviewed product visuals. Orders, pricing, usage rights, payment, VAT and Dutch law. | 146 | Terms of Service | legal reference — no search intent targeted | **3** — `/privacy`, `/start`, `/test-sample` | **2** — `/faq`, `/how-it-works` |
| `/test-sample` | Test VISUAILS with 1 product — test sample | 42 | Upload one product photo and see it become a publish-ready e-commerce visual. One sample per business, checked by a person before it reaches you. | 145 | Test VISUAILS with 1 product | “test with one product” — trial, transactional | **2** — `/start`, `/upload-guidelines` | **23** — `/`, `/about`, `/catalog/classic`, `/catalog/custom`, `/compare`, `/contact`, `/faq`, `/gallery`, `/guides`, `/how-it-works`, `/lifestyle/custom`, `/lifestyle/dunes`, `/lifestyle/flash`, `/lifestyle/glow`, `/lifestyle/phone-made`, `/pricing`, `/start`, `/terms`, `/upload-guidelines`, `/video/campaign`, `/video/custom`, `/video/lifestyle`, `/video/motion` |
| `/upload-guidelines` | Upload guidelines — VISUAILS | 28 | Simple tips for the product photos you send us, so your visuals come out sharp, accurate and fast. | 98 | How to shoot photos we can work magic with | “how to photograph your product” — support, informational | **2** — `/start`, `/test-sample` | **4** — `/guides`, `/how-it-works`, `/test-sample`, `/thank-you` |
| `/video` | Short product videos, from your photos \| VISUAILS | 49 | Eight seconds of subtle motion, for product pages, social and simple ads. €69 per clip. Typically 2–4 working days. | 115 | Short product videos that move. | “short product videos” — commercial | **7** — `/contact`, `/pricing`, `/start`, `/video/campaign`, `/video/custom`, `/video/lifestyle`, `/video/motion` | **5** — `/`, `/video/campaign`, `/video/custom`, `/video/lifestyle`, `/video/motion` |
| `/video/campaign` | Campaign — Video style \| VISUAILS | 33 | Campaign: a signature VISUAILS video style. Quoted per project. Typically 2–4 working days. Human-checked, every visual. | 120 | Campaign. | style long-tail | **2** — `/test-sample`, `/video` | **1** — `/video` |
| `/video/custom` | Custom — Video style \| VISUAILS | 31 | Custom: a signature VISUAILS video style. Quoted per project. Typically 2–4 working days. Human-checked, every visual. | 118 | Custom. | style long-tail | **2** — `/test-sample`, `/video` | **1** — `/video` |
| `/video/lifestyle` | Lifestyle Video — Video style \| VISUAILS | 40 | Lifestyle Video: a signature VISUAILS video style. €69 / clip. Typically 2–4 working days. Human-checked, every visual. | 119 | Lifestyle Video. | style long-tail | **3** — `/start`, `/test-sample`, `/video` | **1** — `/video` |
| `/video/motion` | Motion — Video style \| VISUAILS | 31 | Motion: a signature VISUAILS video style. €69 / clip. Typically 2–4 working days. Human-checked, every visual. | 110 | Motion. | style long-tail | **3** — `/start`, `/test-sample`, `/video` | **1** — `/video` |

Two things the table makes visible that are worth naming rather than
leaving in a column:

- **`/about`, `/guides` and `/thank-you` have zero inbound body links.**
  They are reachable only from the footer, which every page carries. For
  `/about` that is defensible. For `/guides` it is not — it is the content
  hub the brief asks the pillars to link into, and nothing links into it.
- **`/start` (24 inbound) and `/test-sample` (23 inbound) absorb most of the
  internal link equity on the site**, followed by `/pricing` (11). That is
  the correct shape for a conversion site and it is the one part of the
  brief's linking plan that is unambiguously implemented.

### Dutch — where NL differs

The NL tree carries the same 32 indexable routes, the same H1 count, the
same robots directive and — verified by script — **the same set of body
link targets on every single page**, path-for-path, with zero differences
across all 34 pairs. So the only thing that differs is the copy, and the
only thing worth tabulating is length. Dutch descriptions run longer on 22 of
the 32 pairs (mean +3.7 characters, peak +12, and the longest description on
the site is `/nl` at 155); Dutch titles are a wash (mean −0.3, longest 56).
The two largest negative swings are the assembled style descriptions, where
`src/data/meta.js` has dropped a trailing clause to stay under its ceiling —
`/nl/catalog/custom` at −25 is the assembly working as designed. That ceiling
is 152 rather than 160 because `nl/catalog/custom` once resolved to exactly
160 — Google's cut, with zero margin, set by content variables nobody edits
with a character counter in hand.

| URL | Title | Len | Desc len | H1 | Δ vs EN (title / desc) |
|---|---|---|---|---|---|
| `/nl` | Productbeelden zonder fotoshoot \| VISUAILS | 42 | 155 | Het merk dat je voor ogen had, gevisualiseerd. | -14 / +11 |
| `/nl/about` | VISUAILS — Over ons | 19 | 146 | Geweldige visuals, zonder de studio. | +0 / +11 |
| `/nl/ai-act` | Transparantie en de AI Act — VISUAILS | 37 | 147 | AI Act | +7 / +11 |
| `/nl/catalog` | Catalogfoto's zonder fotoshoot \| VISUAILS | 41 | 127 | Strakke, consistente productvisuals — gebouwd om te schalen. | -14 / +3 |
| `/nl/catalog/classic` | Classic — Catalog-stijl \| VISUAILS | 34 | 140 | Classic. | +0 / +10 |
| `/nl/catalog/custom` | Eigen merk — Catalog-stijl \| VISUAILS | 37 | 120 | Eigen merk. | -2 / -25 |
| `/nl/compare` | Shootdag vs VISUAILS — de eerlijke vergelijking | 47 | 147 | Een shootdag, of een drop. | +2 / +12 |
| `/nl/contact` | VISUAILS — Neem contact op | 26 | 141 | Laten we samen groeien. | +5 / -7 |
| `/nl/cookie-policy` | Cookiebeleid — VISUAILS | 23 | 99 | Cookiebeleid | -1 / +9 |
| `/nl/custom-models` | Jouw merkmodel — één gezicht, elke drop \| VISUAILS | 50 | 139 | Eén gezicht. Elke drop. Alleen van jou. | +0 / +4 |
| `/nl/faq` | Veelgestelde vragen — VISUAILS | 30 | 147 | Vragen, beantwoord. | -7 / +0 |
| `/nl/gallery` | VISUAILS — Een blik op de stijlen die we maken | 46 | 144 | Een blik op de stijlen die we maken | +4 / -9 |
| `/nl/guides` | Gidsen — productfotografie voor kledingmerken \| VISUAILS | 56 | 145 | Alles wat de moeite waard is vóór je shoot. | -3 / -7 |
| `/nl/how-it-works` | Hoe het werkt — VISUAILS | 24 | 145 | Eén map erin. Een hele drop eruit. | +1 / +7 |
| `/nl/lifestyle` | Lifestylebeelden die je product verkopen \| VISUAILS | 51 | 128 | Jouw product, in scènes die verkopen. | +2 / +5 |
| `/nl/lifestyle/custom` | Custom — Lifestyle-stijl \| VISUAILS | 35 | 125 | Custom. | +0 / +11 |
| `/nl/lifestyle/dunes` | Dunes — Lifestyle-stijl \| VISUAILS | 34 | 130 | Dunes. | +0 / +10 |
| `/nl/lifestyle/flash` | Flash — Lifestyle-stijl \| VISUAILS | 34 | 130 | Flash. | +0 / +10 |
| `/nl/lifestyle/glow` | Glow — Lifestyle-stijl \| VISUAILS | 33 | 129 | Glow. | +0 / +10 |
| `/nl/lifestyle/phone-made` | Phone-made — Lifestyle-stijl \| VISUAILS | 39 | 135 | Phone-made. | +0 / +10 |
| `/nl/models` | Tien standaardmodellen, in elke drop \| VISUAILS | 47 | 148 | Tien gezichten. Al inbegrepen. | +2 / +10 |
| `/nl/pricing` | Prijzen — VISUAILS | 18 | 105 | Geprijsd per drop, niet per beeld. | +0 / -2 |
| `/nl/privacy` | Privacybeleid — VISUAILS | 24 | 136 | Privacybeleid | -1 / -3 |
| `/nl/start` | Start een bestelling — VISUAILS | 31 | 130 | Twee ingangen. | +6 / -22 |
| `/nl/terms` | Algemene voorwaarden — VISUAILS | 31 | 143 | Algemene voorwaarden | +4 / -3 |
| `/nl/test-sample` | Test VISUAILS met 1 product — proefvisual | 41 | 137 | Test VISUAILS met 1 product | -1 / -8 |
| `/nl/upload-guidelines` | Uploadrichtlijnen — VISUAILS | 28 | 106 | Zo maak je foto's waar wij magie mee kunnen doen | +0 / +8 |
| `/nl/video` | Korte productvideo's uit je eigen foto's \| VISUAILS | 51 | 126 | Korte productvideo’s die bewegen. | +2 / +11 |
| `/nl/video/campaign` | Campaign — Video-stijl \| VISUAILS | 33 | 131 | Campaign. | +0 / +11 |
| `/nl/video/custom` | Custom — Video-stijl \| VISUAILS | 31 | 129 | Custom. | +0 / +11 |
| `/nl/video/lifestyle` | Lifestyle Video — Video-stijl \| VISUAILS | 40 | 129 | Lifestyle Video. | +0 / +10 |
| `/nl/video/motion` | Motion — Video-stijl \| VISUAILS | 31 | 120 | Motion. | +0 / +10 |

---

## 3 · Schema, in JSON-LD

Every page ships exactly one `<script type="application/ld+json">` block, and
that block is always a single `@graph`. The graph is built in
`src/data/schema.js` from the page's language-neutral path — not from a prop,
so no page file can forget to pass one — and it is handed the canonical URL
that the `<link rel="canonical">` on the same page uses, so every `@id` in the
graph is byte-identical to the canonical above it. The `Organization` node is
the only node with a fixed, site-wide `@id` (`https://visuails.com/#organization`);
every `Service`, `Product` and `Offer` refers to it by `{"@id": …}` rather
than repeating it, which is the entire reason the payload is a `@graph` and
not a bare node. Page-scoped nodes hang their `@id` off the canonical with a
fragment (`…/pricing/#product-full-drop`), so two languages of the same page
describe two honestly distinct entities while still pointing at one company.

What is emitted, across the build:

| Type | Count | Where |
|---|---|---|
| `Organization` | 68 | One per route, all 68 pages |
| `Service` | 8 | `/catalog`, `/lifestyle`, `/video`, `/custom-models`, EN and NL |
| `Product` | 16 | 7 tiers × the two `/pricing` pages, + 1 × the two `/test-sample` pages |
| `FAQPage` | 4 | `/faq` (21 questions) and `/pricing` (6 questions), EN and NL |
| `ProfessionalService` | **0** | — |
| `LocalBusiness` | **0** | — |
| `priceRange` | **0** | — |

One correction to make in public rather than quietly: an earlier count in
this session recorded 67 `Organization` nodes. Re-extracted from `dist/` for
this document, the count is 68 — one node on each of the 68 pages, none
missing, none doubled. The other four counts match that earlier run exactly.
The difference is one page and it is worth reconciling before either number is
quoted anywhere else.

The last three rows are the brief's section 3 rule — *"No LocalBusiness schema
— this is not a location-bound service"* — held to literally. A hand-written
`ProfessionalService` block used to go out on all 68 pages; `ProfessionalService`
is a subtype of `LocalBusiness`, so it was removed rather than adjusted, and
its `priceRange` (a `LocalBusiness` property, and a band where the site knows
exact figures) went with it. The `Offer` nodes below are what replaced it: the
same information, exact instead of "€€", and attached to the thing being sold
rather than to the company. `address` is kept on `Organization` and is not the
same signal — `PostalAddress` on an `Organization` states where a company is
registered, which is the same fact the footer's KVK and VAT numbers state, and
carries none of the "visit us here" semantics.

Three rules `src/data/schema.js` is held to, all three visible in the payloads
below: no invented facts (no `aggregateRating`, no `review`, no counts), no
delivery promise (no `deliveryLeadTime`, no turnaround string — the capacity
gate is the only thing on this site allowed to name a day), and no typed
numbers (every euro comes from `src/data/pricing.js`, every question from
`src/data/faq.js`, the same modules the visible pages render from).

### Organization — site-wide, on all 68 pages

```json
{
  "@type": "Organization",
  "@id": "https://visuails.com/#organization",
  "name": "VISUAILS",
  "description": "Product-visual studio for clothing brands and modern e-commerce: catalog, lifestyle and video visuals built from a single product photo — a whole drop, or one product at a time.",
  "url": "https://visuails.com",
  "logo": "https://visuails.com/img/logo-mark.webp",
  "image": "https://visuails.com/img/banners-09.webp",
  "email": "hello@visuails.com",
  "telephone": "+31625436130",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Enschede",
    "addressCountry": "NL"
  },
  "areaServed": "Worldwide",
  "sameAs": [
    "https://wa.me/31625436130"
  ]
}
```

### Service — `/catalog`

One of eight. `serviceType` is the only string in the node typed by hand:
schema.org wants a short classification of the work, and a product name
("Catalog set") is not a service type ("Product photography"). `name`,
`description`, `price` and `unitText` are all read from `src/data/pricing.js`.

```json
{
  "@type": "Service",
  "@id": "https://visuails.com/catalog/#service",
  "name": "Catalog visuals for e-commerce",
  "serviceType": "Product photography",
  "description": "Four photos: front, back, a fabric or logo close-up, and one on-model shot.",
  "url": "https://visuails.com/catalog/",
  "inLanguage": "en",
  "provider": {
    "@id": "https://visuails.com/#organization"
  },
  "areaServed": "Worldwide",
  "offers": {
    "@type": "Offer",
    "@id": "https://visuails.com/catalog/#offer",
    "price": "89.99",
    "priceCurrency": "EUR",
    "url": "https://visuails.com/catalog/",
    "availability": "https://schema.org/InStock",
    "seller": {
      "@id": "https://visuails.com/#organization"
    },
    "priceSpecification": {
      "@type": "UnitPriceSpecification",
      "price": "89.99",
      "priceCurrency": "EUR",
      "unitText": "per product"
    }
  }
}
```

### Product / Offer — the seven tiers on `/pricing`

The full set as emitted, in the order section 3 of the brief lists them. Note
`eligibleQuantity` on the two package tiers (a fixed 8 for Drop Pilot, a
25–30 band for Full Drop), and `referenceQuantity` with UN/CEFACT `MON` on the
retainer so a machine can read "per month". The Brand Model description is
assembled from the pricing row plus one sentence carrying both the credit
amount and the number of drops it covers, because the credit is stated in
`pricing.js` only inside an `includes` list that also contains the reserved-window
promise this file is forbidden to quote.

```json
[
  {
    "@type": "Product",
    "@id": "https://visuails.com/pricing/#product-drop-pilot",
    "name": "Drop Pilot",
    "description": "Eight products, one committed window. The way to find out what we do with your line before you hand us the whole thing.",
    "inLanguage": "en",
    "brand": {
      "@id": "https://visuails.com/#organization"
    },
    "offers": {
      "@type": "Offer",
      "@id": "https://visuails.com/pricing/#offer-drop-pilot",
      "price": "650",
      "priceCurrency": "EUR",
      "url": "https://visuails.com/pricing/",
      "availability": "https://schema.org/InStock",
      "seller": {
        "@id": "https://visuails.com/#organization"
      },
      "priceSpecification": {
        "@type": "UnitPriceSpecification",
        "price": "650",
        "priceCurrency": "EUR",
        "unitText": "once per brand"
      },
      "eligibleQuantity": {
        "@type": "QuantitativeValue",
        "value": 8,
        "unitText": "products"
      }
    }
  },
  {
    "@type": "Product",
    "@id": "https://visuails.com/pricing/#product-full-drop",
    "name": "Full Drop",
    "description": "One drop. One deadline. One invoice.",
    "inLanguage": "en",
    "brand": {
      "@id": "https://visuails.com/#organization"
    },
    "offers": {
      "@type": "Offer",
      "@id": "https://visuails.com/pricing/#offer-full-drop",
      "price": "1850",
      "priceCurrency": "EUR",
      "url": "https://visuails.com/pricing/",
      "availability": "https://schema.org/InStock",
      "seller": {
        "@id": "https://visuails.com/#organization"
      },
      "priceSpecification": {
        "@type": "UnitPriceSpecification",
        "price": "1850",
        "priceCurrency": "EUR",
        "unitText": "per drop"
      },
      "eligibleQuantity": {
        "@type": "QuantitativeValue",
        "minValue": 25,
        "maxValue": 30,
        "unitText": "products"
      }
    }
  },
  {
    "@type": "Product",
    "@id": "https://visuails.com/pricing/#product-catalog-set",
    "name": "Catalog set",
    "description": "Four photos: front, back, a fabric or logo close-up, and one on-model shot.",
    "inLanguage": "en",
    "brand": {
      "@id": "https://visuails.com/#organization"
    },
    "offers": {
      "@type": "Offer",
      "@id": "https://visuails.com/pricing/#offer-catalog-set",
      "price": "89.99",
      "priceCurrency": "EUR",
      "url": "https://visuails.com/pricing/",
      "availability": "https://schema.org/InStock",
      "seller": {
        "@id": "https://visuails.com/#organization"
      },
      "priceSpecification": {
        "@type": "UnitPriceSpecification",
        "price": "89.99",
        "priceCurrency": "EUR",
        "unitText": "per product"
      }
    }
  },
  {
    "@type": "Product",
    "@id": "https://visuails.com/pricing/#product-lifestyle-carousel",
    "name": "Lifestyle carousel",
    "description": "Three photos of one product in one styled look — a carousel ready to post.",
    "inLanguage": "en",
    "brand": {
      "@id": "https://visuails.com/#organization"
    },
    "offers": {
      "@type": "Offer",
      "@id": "https://visuails.com/pricing/#offer-lifestyle-carousel",
      "price": "129.99",
      "priceCurrency": "EUR",
      "url": "https://visuails.com/pricing/",
      "availability": "https://schema.org/InStock",
      "seller": {
        "@id": "https://visuails.com/#organization"
      },
      "priceSpecification": {
        "@type": "UnitPriceSpecification",
        "price": "129.99",
        "priceCurrency": "EUR",
        "unitText": "per product"
      }
    }
  },
  {
    "@type": "Product",
    "@id": "https://visuails.com/pricing/#product-video-clip",
    "name": "Video clip",
    "description": "One short clip. The same rate on its own or added to a drop.",
    "inLanguage": "en",
    "brand": {
      "@id": "https://visuails.com/#organization"
    },
    "offers": {
      "@type": "Offer",
      "@id": "https://visuails.com/pricing/#offer-video-clip",
      "price": "69",
      "priceCurrency": "EUR",
      "url": "https://visuails.com/pricing/",
      "availability": "https://schema.org/InStock",
      "seller": {
        "@id": "https://visuails.com/#organization"
      },
      "priceSpecification": {
        "@type": "UnitPriceSpecification",
        "price": "69",
        "priceCurrency": "EUR",
        "unitText": "per clip"
      }
    }
  },
  {
    "@type": "Product",
    "@id": "https://visuails.com/pricing/#product-brand-model",
    "name": "Your Brand Model",
    "description": "One face. Every drop. Only yours. €250 is credited against each of your first 5 drops.",
    "inLanguage": "en",
    "brand": {
      "@id": "https://visuails.com/#organization"
    },
    "offers": {
      "@type": "Offer",
      "@id": "https://visuails.com/pricing/#offer-brand-model",
      "price": "1250",
      "priceCurrency": "EUR",
      "url": "https://visuails.com/pricing/",
      "availability": "https://schema.org/InStock",
      "seller": {
        "@id": "https://visuails.com/#organization"
      },
      "priceSpecification": {
        "@type": "UnitPriceSpecification",
        "price": "1250",
        "priceCurrency": "EUR",
        "unitText": "one-time setup"
      }
    }
  },
  {
    "@type": "Product",
    "@id": "https://visuails.com/pricing/#product-studio-retainer",
    "name": "Studio retainer",
    "description": "The studio, on standing order.",
    "inLanguage": "en",
    "brand": {
      "@id": "https://visuails.com/#organization"
    },
    "offers": {
      "@type": "Offer",
      "@id": "https://visuails.com/pricing/#offer-studio-retainer",
      "price": "2200",
      "priceCurrency": "EUR",
      "url": "https://visuails.com/pricing/",
      "availability": "https://schema.org/InStock",
      "seller": {
        "@id": "https://visuails.com/#organization"
      },
      "priceSpecification": {
        "@type": "UnitPriceSpecification",
        "price": "2200",
        "priceCurrency": "EUR",
        "unitText": "per month",
        "referenceQuantity": {
          "@type": "QuantitativeValue",
          "value": 1,
          "unitCode": "MON"
        }
      }
    }
  }
]
```

### FAQPage — `/pricing`

One of four. The `/faq` page's block is the same shape with 21 questions
instead of 6. Questions and answers come out of `src/data/faq.js`, the same
module the visible accordion renders from, so a `Question` node and the
`<summary>` a visitor reads are the same string and cannot disagree. Two `/faq`
answers are authored as HTML because they contain a link; those are stripped
to plain text here rather than re-typed as a prose twin that would drift.

```json
{
  "@type": "FAQPage",
  "@id": "https://visuails.com/pricing/#faq",
  "url": "https://visuails.com/pricing/",
  "inLanguage": "en",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "When do I pay?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "For a drop, after the capacity gate has confirmed your window and before production starts — the window is what you are reserving, so it is what you are paying for. Individual products are invoiced on delivery. The test sample is the one thing charged upfront, and it is one per business."
      }
    },
    {
      "@type": "Question",
      "name": "How does VAT and reverse-charge work?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "We are based in the Netherlands (VAT NL005407575B96). EU businesses with a valid VAT number can supply it at checkout for reverse-charge and faster invoicing. It is optional."
      }
    },
    {
      "@type": "Question",
      "name": "What if my drop is more than 30 products?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The Full Drop band is 25–30 because that is what fits one reserved window. A larger collection is run as consecutive drops, quoted before anything is booked. We will not squeeze it into one window and hope."
      }
    },
    {
      "@type": "Question",
      "name": "Why is there no delivery date on individual products?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Because a drop can never be pushed for a single order, and an individual order can. Quoting a date we would have to break is worse than not quoting one. \"Typically 2–4 working days\" is what the queue typically does — stated as typical, never as a date."
      }
    },
    {
      "@type": "Question",
      "name": "Does a video cost more inside a drop?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No. €69 a clip either way — on its own, or added to any drop. Video is priced the same because it is the same work."
      }
    },
    {
      "@type": "Question",
      "name": "Is there a subscription?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Only if you want one. The studio retainer is €2,200 a month for brands running a drop every month. Everything else is bought when you need it, with nothing recurring."
      }
    }
  ]
}
```

---

## 4 · Internal linking plan

Section 1 of the brief specifies two things:

> Internal linking: pillar pages ↔ `/pricing` ↔ `/start` ↔ `/guides` content ↔
> `/compare`. Every drop-content page links to `/custom-models` as the upsell.

Below is that plan written out as edges, and then checked against the build. A
link only counts if it is a real anchor inside `<main>` on the page in
question. The chrome — header nav, drops submenu, mobile drawer, footer,
conversion bar — is identical on all 68 pages and would make every check pass
trivially, so it is excluded throughout. Where the chrome is the *only* thing
carrying a required edge, that is recorded as **chrome only**, which is a gap:
a footer link on 68 pages is not a topical signal.

### The intended plan

| # | Edge | Why the brief wants it |
|---|---|---|
| 1 | each pillar → `/pricing` | the price is the objection the pillar raises |
| 2 | `/pricing` → each pillar | the tier names have to resolve to the work |
| 3 | each pillar → `/start` | the pillar is the last page before ordering |
| 4 | `/start` → each pillar | someone mid-flow needs to check what they are buying |
| 5 | `/pricing` ↔ `/start` | price → order, order → price |
| 6 | `/start` ↔ `/guides` | the flow's soft exit; the hub's conversion exit |
| 7 | `/guides` ↔ `/pricing` | "what product visuals cost" is a guide topic |
| 8 | `/guides` ↔ `/compare` | the comparison is the hub's strongest article |
| 9 | `/pricing` ↔ `/compare` | the shoot-day number sits on both |
| 10 | every drop-content page → `/custom-models` | the upsell |

### What the build actually does

Edges 1–5, the pillar/pricing/start core:

| Edge | `/catalog` | `/lifestyle` | `/video` | `/custom-models` |
|---|---|---|---|---|
| pillar → `/pricing` | yes | yes | yes | yes |
| `/pricing` → pillar | yes | **chrome only** | **chrome only** | yes |
| pillar → `/start` | yes | yes | yes | yes |
| `/start` → pillar | yes | **chrome only** | **chrome only** | **chrome only** |
| pillar → `/custom-models` | **chrome only** | yes | **chrome only** | n/a |

`/pricing` ↔ `/start` is reciprocal in the body on both sides. That edge is
implemented.

Edges 6–9, the `/guides` and `/compare` cluster:

| Edge | Present in body? |
|---|---|
| `/guides` → `/start` | yes |
| `/start` → `/guides` | **no — chrome only** |
| `/guides` → `/pricing` | yes |
| `/pricing` → `/guides` | **no — chrome only** |
| `/guides` → `/compare` | yes |
| `/compare` → `/guides` | **no — chrome only** |
| `/pricing` → `/compare` | **no — chrome only** |
| `/compare` → `/pricing` | yes |

Edge 10, the `/custom-models` upsell, across the 14 drop-content pages the
rule names (`/models` is listed underneath for completeness — it is not one of
them, and it is the only other page that carries the link):

| Page | Links to `/custom-models` in body? |
|---|---|
| `/catalog` | **no** |
| `/catalog/classic` | **no** |
| `/catalog/custom` | **no** |
| `/lifestyle` | yes — "Explore models", under the H2 "Add a consistent model." |
| `/lifestyle/glow` | **no** |
| `/lifestyle/dunes` | **no** |
| `/lifestyle/flash` | **no** |
| `/lifestyle/phone-made` | **no** |
| `/lifestyle/custom` | **no** |
| `/video` | **no** |
| `/video/motion` | **no** |
| `/video/lifestyle` | **no** |
| `/video/campaign` | **no** |
| `/video/custom` | **no** |
| `/models` | yes — "Explore Your Brand Model" |

### The gaps, stated plainly

The plan is **not** implemented. Of the ten edges: three are fully met (every
pillar → `/pricing`, every pillar → `/start`, and `/pricing` ↔ `/start`
reciprocally in the body on both sides); one is met on two pillars of four and
one on one of four; four are one-directional; and the upsell rule is met on 1
of the 14 drop-content pages it names.

1. **The `/custom-models` upsell is missing from 13 of 14 drop-content pages.**
   Only `/lifestyle` carries it. `/catalog` and `/video` — the two other
   pillars, both of which the brief names explicitly — do not link to the
   premium page anywhere in their body copy, and neither do any of the eleven
   style children. This is the single largest gap in the section and it is on
   the highest-value edge in the plan: `/custom-models` is the €1,250 page.
   `/models` does carry the link, which is correct but is not one of the pages
   the rule names.

2. **`/guides` has zero inbound body links from anywhere on the site.** It
   links out to seven pages — `/compare`, `/faq`, `/how-it-works`, `/pricing`,
   `/start`, `/test-sample`, `/upload-guidelines` — and receives nothing back
   except the footer link that every page carries. A content hub that only
   emits links is a dead end in reverse: it passes equity out and accumulates
   none, and nothing on the site tells a crawler the hub is topically related
   to the pillars.

3. **`/compare` has two inbound body links** (`/custom-models` and `/guides`)
   and none from `/pricing`, where the €2,500–8,000 shoot-day figure it is
   built around also appears. The `/guides` ↔ `/compare` edge the brief draws
   is one-directional.

4. **`/start` links out to only three pages** — `/catalog`, `/pricing`,
   `/test-sample`. The brief's "↔" between the flow and the pillars and
   between the flow and `/guides` is, in practice, 24 pages pointing *at*
   `/start` and `/start` pointing back at one pillar out of four.

5. **`/pricing` names tiers it does not link to.** It links to `/catalog` and
   `/custom-models` but not to `/lifestyle` or `/video`, although "Lifestyle
   carousel" and "Video clip" are two of the seven tiers on the page.

6. **`/about` has zero inbound body links**, same as `/guides`. Less
   consequential — `/about` is not a ranking target — but it is the same
   structural fact and it is worth knowing that the footer is doing all the
   work for both.

7. **Every gap above is doubled.** A script comparing all 34 EN/NL pairs found
   **zero** differences in body link targets, path for path. The Dutch tree is
   an exact structural mirror, which is good news for consistency and means
   each missing edge is missing twice.

### What is working, and should not be disturbed

`/start` (24 inbound body links) and `/test-sample` (23) are linked from
almost every page that could sensibly link to them, and `/pricing` (11) sits
correctly behind both. The pillar → style → pillar loops are complete in both
directions on all three pillar families: every style page links back up to its
parent, and every parent lists all of its children. The legal cluster
(`/privacy` ↔ `/cookie-policy`, `/terms` → `/privacy`) is reciprocal. None of
this needs changing; the fixes above are additions, not rewrites.

---

## 5 · Image naming structure

Section 10 of the brief says extend the live convention, don't replace it:
`hero-{style}.webp`, `lifestyle-{style}-{NN}.webp`, `banners-{NN}.webp`,
`catalog-before.webp` / `catalog-after.webp`, `model-{NN}.webp`,
`custom-models-{NN}.webp`, all WebP. `public/img` holds 73 files. All 73 are
`.webp`. Here is every one of them against that convention.

| Pattern | Files | Members | Conforms |
|---|---|---|---|
| `hero-{style}.webp` | 1 | `hero-dunes` | yes, but see (a) |
| `lifestyle-{style}-{NN}.webp` | 30 | `dunes` 01–02, `flash` 01–08, `glow` 01–06, `phone-made` 01–14 | yes — the only clean family |
| `banners-{NN}.webp` | 17 | 01–17 | yes, but see (e) and (g) |
| `catalog-before/after.webp` | 2 | `catalog-before`, `catalog-after` | yes |
| `model-{NN}.webp` | 3 | 01–03 | see (b) and (d) |
| `custom-models-{NN}.webp` | 5 | 01–05 | yes, but see (d) |
| `model-{name}.webp` | 10 | `aaron`, `ava`, `dana`, `elias`, `fabi`, `lisa`, `maegan`, `rae`, `ryan`, `seme` | **off-convention** — (b) |
| `model-raw-{NN}.webp` | 2 | 01–02 | **off-convention** — (c) |
| logo rasters | 3 | `logo-mark`, `logo-wordmark`, `logo-wordmark-light` | outside the convention by nature |
| **total** | **73** | | |

Sixty-six of the 73 appear as a rendered image somewhere in the build
(`<img>`, `<source>`, an inline `style`, or a CSS `url()`). One more,
`logo-mark.webp`, is referenced only from `<meta>` and JSON-LD, which is
deliberate and documented in `IMAGES.md`: a search card draws a raster and
cannot resolve an SVG `<use>` or a custom property, so the mark has to exist
as pixels for that consumer specifically. Alt text is complete — the audit
this session found 406 `<img>` elements with zero missing `width`, zero
missing `height`, zero missing `decoding` and zero missing or empty `alt`.

### The deviations

**(a) `hero-{style}` has exactly one member.** The convention names four
styles — glow, dunes, flash, phone-made — and only `hero-dunes.webp` exists.
It is used on `/` and `/nl` as the homepage hero and as their `og:image`; it
is not the hero of `/lifestyle/dunes`, which is what the filename implies. A
one-member family whose name promises four is a convention that will be
guessed wrongly by the next person to add a hero.

**(b) `model-` means two different things.** `model-01/02/03.webp` are generic
portraits; `model-aaron.webp` … `model-seme.webp` are the ten named
standard-roster headshots that `/models` renders from `src/data/models.js`.
A filename cannot tell you which it is, and the two sets are used for
different arguments on the page. The named files are also the newer, larger
batch (1195×1600) against the numbered ones' 800×1071 — with one exception:
`model-rae.webp` is 800×1071, the only roster portrait not cut to the roster's
own size.

**(c) `model-raw-{NN}` is a sub-convention that does not appear in the brief's
list.** Two files, both used on `/custom-models`, both extreme close-ups
chosen for a "look at this detail" moment. The sub-convention is reasonable —
the suffix is doing real work — but it is undocumented anywhere except
`IMAGES.md`, and it makes `model-` a three-way prefix rather than a two-way
one.

**(d) Three files are byte-identical duplicates under two names.** Verified by
checksum:

| | |
|---|---|
| `model-01.webp` | identical to `custom-models-01.webp` |
| `model-02.webp` | identical to `custom-models-02.webp` |
| `model-03.webp` | identical to `custom-models-03.webp` |

This is not only wasted bytes. On `/custom-models` it produces a content
error: the page's hero is `custom-models-03.webp` with alt "A VISUAILS brand
model portrait", and further down, the "this is what a standard model looks
like" counter-example is `model-03.webp` with alt "A VISUAILS model portrait".
The page's whole argument is that a Brand Model is not one of the standard
models, and it is illustrated with the same photograph twice, under two names,
with two different alt texts. Whichever file is wrong, one of them is.

**(e) Six files ship and are referenced nowhere in the build.** No `<img>`, no
CSS, no meta, no JSON-LD — searched across `dist/` with HTML comments stripped
so that a comment naming a file does not count as a use:

```
banners-10.webp            1200×896     66 kB
banners-11.webp            1200×896     69 kB
banners-15.webp            2400×1792   184 kB
banners-17.webp            2400×1792   566 kB
logo-wordmark.webp         1646×276     41 kB
logo-wordmark-light.webp   1646×276      8 kB
```

The two logo rasters are known dead and `IMAGES.md` says so — both were
superseded by the inline SVG sprite in `Layout.astro`, and the only mention of
`logo-wordmark-light.webp` left in the shipped HTML is inside a comment
recording what the SVG replaced. The four banners are simply unused: 885 kB of
photography that deploys on every build and is served to nobody.

**(f) `IMAGES.md` is one file behind.** It opens "72 files" and there are 73;
`hero-dunes.webp` is not in its inventory. It also states that `banners-09`
through `banners-17` are the 2400px batch, and `banners-10` and `banners-11`
are 1200×896 — half the linear resolution of the rest of that range, which is
consistent with their being the two that went unused.

### The rule for the next batch

Concrete enough to apply without re-reading this document:

1. **Lowercase, hyphens, zero-padded two-digit index, `.webp`. No exceptions.**
   `{family}-{variant}-{NN}.webp` is the full shape; drop `{variant}` where a
   family has none, drop `{NN}` where a family has exactly one member by
   definition.
2. **`lifestyle-{style}-{NN}.webp` for anything belonging to a named style**,
   where `{style}` is byte-identical to the slug at `/lifestyle/{style}`. A new
   style gets a new token here *and* a new route, or it gets neither. Continue
   the existing counters — the next Glow file is `lifestyle-glow-07.webp`.
3. **`hero-{page}.webp`, not `hero-{style}.webp`.** The one existing file is
   the homepage hero, not the Dunes-page hero, so the token should name the
   page it opens. Either rename `hero-dunes.webp` to `hero-home.webp` and use
   the pattern for page heroes, or retire the pattern and put page heroes in
   `banners-`. Do not add a second `hero-{style}` file until that is decided —
   two files under a pattern that means two different things is how (b)
   happened.
4. **`banners-{NN}.webp` for un-owned campaign photography**, continuing at
   `banners-18`. Never renumber an existing file: the numbers are referenced
   in components by hand.
5. **`model-{firstname}.webp` means a person on the `/models` roster and
   nothing else.** Lowercase, no index. Every new roster portrait is 1195×1600
   or larger, portrait orientation. `model-rae.webp` should be re-cut to match.
6. **Retire `model-{NN}.webp`.** Non-roster portraits go to a new
   `portrait-{NN}.webp` family so that the `model-` prefix carries exactly one
   meaning. Because the three current `model-{NN}` files are byte-identical to
   `custom-models-01/02/03`, this is a deletion and a reference update, not a
   re-encode — and it forces the `/custom-models` duplicate-photo decision in
   (d) rather than leaving it.
7. **`custom-models-{NN}.webp` for Brand Model examples**, continuing at 06.
   `{parent}-raw-{NN}.webp` stays available for detail crops where the "raw"
   register is the point, and only there.
8. **`{context}-before.webp` / `{context}-after.webp`** for compare pairs. One
   pair per context, named for the context, never numbered.
9. **A file does not enter `public/img` without a reference in `src/` in the
   same change**, and `IMAGES.md` is updated in that change. Both rules exist
   because of (e) and (f): four unused banners and a stale inventory are the
   same failure, which is that adding a file is currently cheaper than
   accounting for it.

---

## 6 · Implementation checklist

Everything ticked below was measured on the current build in this session. The
numbers are repeated here rather than summarised so the checklist can be read
on its own.

### Done

- [x] **68 pages build, EN and NL, one-to-one.** 34 routes per language, no
      orphan on either side.
- [x] **Exactly one `<h1>` on every one of the 68 pages.** No page with zero,
      none with two.
- [x] **Every title ≤ 60 characters** (longest: `/guides`, 59).
- [x] **Every meta description ≤ 155 characters**, with `src/data/meta.js`
      holding the assembled style-page descriptions to 152 by dropping a
      trailing clause rather than truncating mid-word.
- [x] **Self-referencing canonical on all 68 pages**, absolute, built off the
      configured site origin.
- [x] **Full `hreflang` reciprocity on all 68 pages** — `en`, `nl` and
      `x-default`, each pair pointing at the other and back.
- [x] **One valid JSON-LD block per page**, always a single `@graph`, with
      every `@id` byte-identical to the canonical it sits beside.
- [x] **Schema types per the brief.** `Organization` ×68, `Service` ×8
      (the four pillars, both languages), `Product` ×16 (seven tiers × two
      pricing pages, plus the sample × two), `FAQPage` ×4 (`/faq` 21 questions,
      `/pricing` 6, both languages).
- [x] **`ProfessionalService`, `LocalBusiness` and `priceRange`: zero
      occurrences.** The brief's section 3 rule, enforced by removal rather
      than by adjustment.
- [x] **No invented facts, no delivery promise, no typed number in the
      structured data.** Prices come from `src/data/pricing.js`, questions from
      `src/data/faq.js`; nothing quotes a turnaround.
- [x] **406 `<img>` elements, all complete.** Zero missing `width`, zero
      missing `height`, zero missing `decoding`, zero missing or empty `alt`.
- [x] **LCP inside budget with the WebGL chrome shader running**, on a
      throttled mobile profile (1.6 Mbps, 150 ms RTT, 4× CPU): `/` 1964 ms,
      `/catalog` 2068 ms, `/pricing` 1480 ms, against a 2.5 s budget. CLS
      0.0000 on all three. Measured with the hero motion on, as section 12
      requires.
- [x] **Contrast passes WCAG AA.** A DOM-walking audit across 22 routes found
      zero text failing; a separate pixel-sampling audit of the sticky nav over
      the photographic heroes (45 items across 5 routes) found zero failures,
      tightest 4.61:1.
- [x] **24 host-level 301s in `public/_redirects`**, every status written
      explicitly, no splats, covering the retired order funnel in both
      languages and `/order-status` → `/o`.
- [x] **`sitemap.xml` and the build agree.** 64 URLs, every one of them a real
      route; the four excluded pages are exactly the four that carry
      `noindex`.
- [x] **`noindex` where it belongs and nowhere else.** `/thank-you`, `/nl/thank-you`,
      `/404`, `/nl/404` as meta tags; `/o`, `/account` and `/admin` as
      `x-robots-tag` response headers *and* meta tags, because a token URL
      needs the header a non-HTML-parsing client will still read.
- [x] **`robots.txt` reasoned rather than defaulted** — no `Disallow` on a
      redirect source and none on `/o`, both for stated reasons.
- [x] **`/start` is the single order route**, matching section 4: five steps,
      in the order the brief specifies.
- [x] **Structural NL parity.** All 34 pairs carry the same body link targets,
      path for path, with zero differences.

### Open

Ordered by impact. One line each on why it is still open.

1. **The `/custom-models` upsell is absent from 13 of the 14 drop-content
   pages** (§4, gap 1). Only `/lifestyle` carries it. Highest-value edge in the
   brief's linking plan, cheapest to fix, and doubled across NL.
2. **`/guides` receives no inbound body links from anywhere** (§4, gap 2). The
   content hub emits seven links and receives none; only the footer connects it
   to the site.
3. **`/guides` has no articles.** Its six H2s are cards pointing at
   `/upload-guidelines`, `/how-it-works`, `/compare`, `/pricing` and `/faq` —
   pages that already exist. There is no `/guides/{slug}` route in the build,
   so "guides content" as a link target in the brief's plan currently has
   nothing to point at.
4. **`/start` links out to one pillar of four**, and `/pricing` links to two of
   four (§4, gaps 4 and 5) — including no link to `/lifestyle` or `/video`
   despite both being named tiers on the pricing page.
5. **`/compare` → `/guides` and `/pricing` → `/compare` are chrome-only**
   (§4, gap 3). The comparison page is the strongest mid-funnel asset on the
   site and two of its three natural inbound edges are footer links.
6. **`/custom-models` illustrates its central contrast with the same
   photograph twice** (§5, deviation d). `model-03.webp` and
   `custom-models-03.webp` are byte-identical. This is a content decision, not
   a build fix — someone has to say which image is wrong.
7. **Six image files ship with no reference in the build** (§5, deviation e) —
   four unused banners at 885 kB plus two dead logo rasters. Left in place
   because deleting the logo rasters is the last step of a decision recorded in
   `IMAGES.md` and the four banners may be intended for pages not yet written.
8. **The `model-` prefix carries three meanings** (§5, deviations b and c) and
   `hero-{style}` has one member under a name that promises four (deviation a).
   Renaming touches component references and `src/data/models.js`; the rule for
   the next batch is written in §5 so that nothing new makes it worse in the
   meantime.
9. **`model-rae.webp` is 800×1071** where the other nine roster portraits are
   1195×1600 — the only roster file not cut to the roster's own size.
10. **`IMAGES.md` says 72 files and there are 73**, and it misdescribes
    `banners-10` and `banners-11` as part of the 2400 px batch when they are
    1200×896. A stale inventory is what makes deviation (e) hard to notice.
11. **56 of the 68 pages share one `og:image`** (`banners-05.webp`). Six pages
    set their own. Not a defect — a shared social card is a defensible default
    — but it is the largest remaining piece of undifferentiated metadata on the
    site, and the pillar pages in particular have their own photography to use.
12. **Analytics is wired but switched off.** `CF_ANALYTICS_TOKEN` in
    `Layout.astro` is an empty string, so the beacon never renders. The site
    ships analytics-ready and is currently measuring nothing; none of the SEO
    work above can be evaluated against real behaviour until a token is pasted
    in.
