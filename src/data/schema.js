// VISUAILS — structured data (JSON-LD), built per route.
//
// WHAT THIS REPLACED, AND WHY
// Every page used to carry one hand-written `ProfessionalService` block emitted
// from Layout.astro. Two things were wrong with it:
//
//   1 · ProfessionalService is a subtype of LocalBusiness, and section 3 of the
//       brief opens with "No LocalBusiness schema — this is not a location-bound
//       service." A remote studio that ships files is not a place you visit, and
//       telling a search engine otherwise invites it to rank the site for
//       "photographer near Enschede" queries it cannot serve. It also drags in
//       LocalBusiness expectations — opening hours, a visitable address, a
//       `priceRange` band — none of which describe this business. `priceRange`
//       was on that block; it is gone and must not come back. The real prices
//       are Offers now, which is where a price belongs and where it can be
//       exact instead of "€€".
//
//   2 · The same block on all 68 pages says the same thing 68 times and says
//       nothing about any of them. Section 3 asks for four types, three of them
//       page-specific.
//
// WHAT IS EMITTED
//   Organization  — every page. One node, one @id, referenced by everything.
//   Service       — the four pillar pages, EN and NL (8 pages).
//   Product/Offer — what /pricing sells: the three ladder scopes, the three
//                   monthly plans and the two add-ons; plus the test sample on
//                   /test-sample. EN and NL (4 pages).
//   FAQPage       — /faq and /pricing, EN and NL (4 pages).
//
// MIGRATED TO THE LADDER AND THE PLANS (August 2026). This file used to build
// its Offers out of PACKAGES and PER_PRODUCT — a Drop Pilot at a fixed count, a
// Full Drop at a band, a retainer. Section 0 of src/data/pricing.js retired all
// three, so the Offers are built from LADDER and plans() instead. Two rules
// came out of that and both are load-bearing:
//
//   · AN OFFER'S `price` IS THE LADDER'S ENTRY RUNG, never its floor. The floor
//     is real but it is only real from TOP_RUNG products up, and a search
//     result that shows the cheapest rung as THE price has quoted a number a
//     visitor cannot buy at. The rest of the ladder rides along as one
//     UnitPriceSpecification per rung, each carrying the product count it
//     applies to, which is exactly what the rate table on /pricing prints.
//   · NO PRICE APPEARS HERE THAT THE VISIBLE PAGE DOES NOT ALSO SHOW. Every
//     rung, every plan amount, the Brand Model setup and the clip rate are all
//     printed on /pricing. A JSON-LD price that disagrees with the page is the
//     mismatch src/data/faq.js's header warns about, arriving from the other
//     direction.
//
// And the word "drop" is not what this studio sells any more — it means the
// client's own collection going live. What is sold is an order.
//
// HOW A PAGE GETS ITS GRAPH
// From its URL, not from a prop. Layout.astro already derives the
// language-neutral base path for hreflang and the language switcher; the graph
// is derived from that same value. No page file passes anything, so no page
// file can forget to.
//
// THREE RULES THIS FILE IS HELD TO
//   · NO INVENTED FACTS. No aggregateRating, no review, no counts, no claims
//     about anyone's business. The project's standing rule is never to invent
//     testimonials, client names, logos, metrics or results, and structured
//     data is the easiest place in a codebase to break it — a rating property
//     is one line and it would be a lie.
//   · NO DELIVERY PROMISE. Nothing here quotes a turnaround, a window or a
//     date. The capacity gate is the only thing on this site allowed to name a
//     day, and a promise quoted back inside a search result is a promise made
//     by something that never checked the calendar. This is why the Offers
//     below carry prices and quantities but never `deliveryLeadTime` and never
//     the tier `turnaround` strings.
//   · NO TYPED NUMBERS. Every euro comes from src/data/pricing.js, every
//     question and answer from src/data/faq.js — the same modules the visible
//     pages render from, so the markup cannot drift from the copy.

import {
  AMOUNT, TEST_SAMPLE, perProduct,
  LADDER, ladderRate,
  plans, PLAN_AMOUNT,
  BRAND_MODEL_CREDIT_DROPS, euro,
} from './pricing.js';
import { pricingFaqs, faqPageItems } from './faq.js';

export const SITE = 'https://visuails.com';

// One organization, one identifier, forever. Every Service, Product and Offer
// below points at this string instead of repeating the object — which is the
// whole reason the payload is a @graph rather than a bare node.
export const ORG_ID = `${SITE}/#organization`;

const norm = (lang) => (lang === 'nl' ? 'nl' : 'en');

/** Trailing slashes off (except at the root) so route matching is exact. */
function normalizePath(path) {
  const p = path || '/';
  return p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p;
}

/**
 * A price as schema.org wants it: a bare decimal, no symbol, no thousands
 * separator, '.' for cents whatever the locale prints. euro() is for humans;
 * this is for machines, and the two must never be confused.
 */
function priceValue(n) {
  return Math.round(n * 100) % 100 === 0 ? String(n) : n.toFixed(2);
}

/**
 * Plain text out of the two FAQ answers that carry markup.
 *
 * An Answer's `text` has to be the answer a visitor actually reads. Two /faq
 * answers are authored as HTML because they contain a link and a <strong>;
 * stripping the tags here means those two answers still come from the one
 * source in faq.js rather than being re-typed as a prose twin that would drift.
 * Entities are decoded because "&amp;" in a JSON string is just wrong, not
 * escaped.
 */
function htmlToText(html) {
  return String(html)
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// ORGANIZATION
// ─────────────────────────────────────────────────────────────────────────────

// `address` is kept, and it is not the LocalBusiness signal the old block was.
// PostalAddress on an Organization says where the company is registered — the
// same fact the footer's KVK and VAT numbers state — and carries none of the
// "visit us here" semantics that LocalBusiness attaches to it. Locality and
// country only: there is no shopfront and no street to publish.
//
// The description is English on every page, deliberately. Organization is ONE
// entity with ONE @id, and an @id that describes itself in two different
// languages depending on which page you crawled is a contradiction about a
// single node. The locale-specific copy lives on the page-scoped nodes below,
// which have locale-specific @ids and so can differ honestly.
//
// "a whole drop" used to end this sentence. It does not any more: "drop" means
// the client's collection going live, and using it for a work order is the
// collision that retired the package model. See section 0 of pricing.js.
const ORG_DESCRIPTION =
  'Product-visual studio for clothing brands and modern e-commerce: catalog, lifestyle and video visuals built from a single product photo — a whole collection in one order, or one product at a time.';

function organizationNode() {
  return {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: 'VISUAILS',
    description: ORG_DESCRIPTION,
    url: SITE,
    // The favicon set, not img/logo-mark.webp. That raster is the cyan-to-
    // periwinkle mark from the retired palette — the one thing on the site
    // still wearing it, and the one image Google would have shown next to the
    // brand in a knowledge panel. favicon-512.png is cut from the same traced
    // glyph as everything else by scripts/make-favicons.mjs, so it follows the
    // palette automatically instead of needing a hand export.
    logo: `${SITE}/favicon-512.png`,
    image: `${SITE}/img/banners-09.webp`,
    email: 'hello@visuails.com',
    telephone: '+31625436130',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Enschede',
      addressCountry: 'NL',
    },
    areaServed: 'Worldwide',
    // Every profile the studio actually controls. sameAs is how a search
    // engine knows these accounts and this domain are one publisher rather
    // than three unrelated things with the same name — it is the entity-
    // resolution field, not a link list, so an account that is not ours does
    // not belong here even if we post to it.
    sameAs: [
      'https://wa.me/31625436130',
      'https://www.instagram.com/visuails_com/',
      'https://www.facebook.com/profile.php?id=61590208333392',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// COPY THIS FILE OWNS, AND WHY IT OWNS IT.
//
// Everything below reads its euros from pricing.js and its questions from
// faq.js. Three short strings per language are typed here instead, and each one
// has a reason a future editor should know before "fixing" it:
//
//   · `serviceType` — schema.org wants a short classification of the work and
//     pricing.js holds none. A product name ("Catalog set") is not a service
//     type ("Product photography").
//   · The COMPLETE scope's name, and the Brand Model's name and one-liner.
//     These came out of PACKAGES, which section 0 of pricing.js retired. Their
//     visible twins are the COPY tables in PricingPage.astro (`kinds.complete`,
//     `brandModelName`) and BrandModelPage.astro. When those two pages are
//     migrated off PACKAGES, the right move is to give pricing.js one home for
//     these names and delete this block — not to add a fourth copy.
//   · The video one-liner. perProduct('video').line still ends "added to a
//     drop", and this file may not say that; /pricing's own videoLine already
//     says "any order", so this matches that.
//
// NOTHING HERE IS A NUMBER, and nothing here is a delivery promise.
// ─────────────────────────────────────────────────────────────────────────────

const COMPLETE_NAME = { en: 'Complete', nl: 'Compleet' };

const COMPLETE_LEAD = {
  en: 'A catalog set and a lifestyle carousel for every product in the order.',
  nl: 'Voor elk product in de bestelling een catalogset en een lifestyle-carousel.',
};

const VIDEO_LINE = {
  en: 'One short clip. The same rate on its own or added to any order.',
  nl: 'Eén korte clip. Dezelfde prijs los of toegevoegd aan elke bestelling.',
};

const BRAND_MODEL_NAME = { en: 'Your Brand Model', nl: 'Jouw merkmodel' };
const BRAND_MODEL_LINE = {
  en: 'One face. Every order. Only yours.',
  nl: 'Eén gezicht. Elke bestelling. Alleen van jou.',
};
const BRAND_MODEL_UNIT = { en: 'one-time setup', nl: 'eenmalige setup' };

/** "Starter plan" / "Starter-plan" — the joiner differs, so it is not a concat. */
const PLAN_NAME = { en: (n) => `${n} plan`, nl: (n) => `${n}-plan` };

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE — the four pillar pages.
//
// `kind` points at a ladder in pricing.js; `amount` at a flat AMOUNT key. A
// pillar has one or the other, never both.
//
// THE PRICE ON A PILLAR SERVICE IS THE ENTRY RUNG, and only the entry rung.
// /catalog, /lifestyle and /video each print one figure — perProduct().price,
// which IS ladderRate(kind, 1) — and none of them shows the rate table. The
// whole ladder belongs to /pricing, which does show it, so this node quotes the
// one number its own page quotes and nothing more.
// ─────────────────────────────────────────────────────────────────────────────

const PILLARS = {
  '/catalog': {
    id: 'catalog',
    kind: 'catalog',
    name: { en: 'Catalog visuals for e-commerce', nl: 'Catalogbeeld voor e-commerce' },
    serviceType: { en: 'Product photography', nl: 'Productfotografie' },
  },
  '/lifestyle': {
    id: 'lifestyle',
    kind: 'lifestyle',
    name: { en: 'Lifestyle visuals for e-commerce', nl: 'Lifestylebeeld voor e-commerce' },
    serviceType: { en: 'Lifestyle product photography', nl: 'Lifestyle-productfotografie' },
  },
  '/video': {
    id: 'video',
    amount: 'video',
    description: VIDEO_LINE,
    name: { en: 'Product video clips', nl: 'Productvideoclips' },
    serviceType: { en: 'Product video production', nl: 'Productvideoproductie' },
  },
  '/custom-models': {
    amount: 'brandModel',
    description: BRAND_MODEL_LINE,
    unit: BRAND_MODEL_UNIT,
    name: BRAND_MODEL_NAME,
    serviceType: { en: 'Brand model creation', nl: 'Merkmodel-creatie' },
  },
};

function serviceNode(path, lang, url) {
  const entry = PILLARS[path];
  const l = norm(lang);
  // The three pillars that are a per-product line item still read their
  // one-liner and their unit label from pricing.js's own accessor, so the
  // Service description and the sentence on the page are one string.
  const row = entry.id && entry.id !== 'video' ? perProduct(entry.id, l) : null;
  const amount = entry.kind ? ladderRate(entry.kind, 1) : AMOUNT[entry.amount];
  const unit = entry.unit ? entry.unit[l] : (row ? row.unit : perProduct('video', l).unit);
  const description = entry.description ? entry.description[l] : row.line;

  return {
    '@type': 'Service',
    '@id': `${url}#service`,
    name: entry.name[l],
    serviceType: entry.serviceType[l],
    description,
    url,
    inLanguage: l,
    provider: { '@id': ORG_ID },
    areaServed: 'Worldwide',
    offers: {
      '@type': 'Offer',
      '@id': `${url}#offer`,
      price: priceValue(amount),
      priceCurrency: 'EUR',
      url,
      availability: 'https://schema.org/InStock',
      seller: { '@id': ORG_ID },
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: priceValue(amount),
        priceCurrency: 'EUR',
        // Every figure in pricing.js is net. Saying so is the machine-readable
        // half of vatLabel() — a page that prints "excl. VAT" beside a number
        // and a graph that stays silent about it are quoting two prices.
        valueAddedTaxIncluded: false,
        // "per product" / "per clip" / "one-time setup" — pricing.js's own
        // unit label, so the machine-readable unit and the printed one agree.
        unitText: unit,
      },
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCT / OFFER — what /pricing sells, plus the sample.
//
// Order follows the page: the three ladder scopes first, then the two add-ons
// that sit on top of an order, then the three monthly plans. Nothing is typed
// but the names above — every euro and every product count is read.
//
// A NOTE ON `price` VS `priceSpecification`, because the two say different
// things and it would be easy to collapse them. `price` is the single figure a
// consumer shows when it has room for one: for a ladder scope that is the ENTRY
// rung, what one product costs, because that is the only rung a visitor can buy
// at without qualifying for it. `priceSpecification` is then the whole ladder —
// one UnitPriceSpecification per rung, each with the product count it applies
// to in `eligibleQuantity`. That is the same table /pricing prints, rung for
// rung, which is what keeps the graph and the page from quoting each other's
// numbers back differently.
// ─────────────────────────────────────────────────────────────────────────────

/** The three ladder scopes, in the order /pricing's rate table reads them. */
const LADDER_SCOPES = [
  { slug: 'complete', kind: 'complete' },
  { slug: 'catalog-set', kind: 'catalog' },
  { slug: 'lifestyle-carousel', kind: 'lifestyle' },
];

// The one fact in this file that pricing.js states only as a bullet inside a
// plan's `includes` list — and that list is not usable here, because it also
// contains the reserved-window promise this file is forbidden to quote. So the
// credit is restated as one sentence per language, with BOTH numbers read from
// pricing.js: change the credit or the number of orders it covers and this
// sentence changes with them. ("drops" was the word here until the ladder
// replaced the packages; it is orders now, everywhere.)
const BRAND_MODEL_CREDIT = {
  en: `${euro(AMOUNT.brandModelCredit, 'en')} is credited against each of your first ${BRAND_MODEL_CREDIT_DROPS} orders.`,
  nl: `${euro(AMOUNT.brandModelCredit, 'nl')} wordt verrekend met elk van je eerste ${BRAND_MODEL_CREDIT_DROPS} bestellingen.`,
};

function productNode({ slug, name, description, amount, unitText, url, lang, quantity, reference, rungs }) {
  const l = norm(lang);
  const spec = (price, unit) => ({
    '@type': 'UnitPriceSpecification',
    price: priceValue(price),
    priceCurrency: 'EUR',
    // pricing.js holds net figures only. Stating that here is the
    // machine-readable half of vatLabel(): a page that prints "excl. VAT" and a
    // graph that says nothing have quoted two different prices for one thing.
    valueAddedTaxIncluded: false,
    unitText: unit,
  });

  let priceSpecification;
  if (rungs) {
    // One specification per rung. `eligibleQuantity` is what makes a falling
    // rate readable rather than contradictory: without it this would be five
    // prices for one product and no way to tell which applies.
    priceSpecification = rungs.map(([lo, hi, rate]) => {
      const s = spec(rate, unitText);
      s.eligibleQuantity = hi === null
        ? { '@type': 'QuantitativeValue', minValue: lo, unitText: 'products' }
        : { '@type': 'QuantitativeValue', minValue: lo, maxValue: hi, unitText: 'products' };
      return s;
    });
  } else {
    priceSpecification = spec(amount, unitText);
    if (reference) priceSpecification.referenceQuantity = reference;
  }

  const offer = {
    '@type': 'Offer',
    '@id': `${url}#offer-${slug}`,
    price: priceValue(amount),
    priceCurrency: 'EUR',
    url,
    availability: 'https://schema.org/InStock',
    seller: { '@id': ORG_ID },
    priceSpecification,
  };
  if (quantity) offer.eligibleQuantity = quantity;

  return {
    '@type': 'Product',
    '@id': `${url}#product-${slug}`,
    name,
    description,
    inLanguage: l,
    brand: { '@id': ORG_ID },
    offers: offer,
  };
}

function pricingProductNodes(lang, url) {
  const l = norm(lang);
  const nodes = [];

  // ── The ladder ────────────────────────────────────────────────────────────
  // The unit label is read off a per-product row rather than typed, so the
  // machine-readable unit is the one the pillar pages print. All three scopes
  // are sold by the product, so all three share it.
  const perProductUnit = perProduct('catalog', l).unit;
  for (const scope of LADDER_SCOPES) {
    const rungs = LADDER[scope.kind];
    const isComplete = scope.kind === 'complete';
    // The complete scope has no per-product row of its own — it IS the other
    // two bought together — so its description is built from both of theirs
    // behind one typed lead sentence.
    const description = isComplete
      ? `${COMPLETE_LEAD[l]} ${perProduct('catalog', l).line} ${perProduct('lifestyle', l).line}`
      : perProduct(scope.kind, l).line;
    nodes.push(productNode({
      slug: scope.slug,
      name: isComplete ? COMPLETE_NAME[l] : perProduct(scope.kind, l).name,
      description,
      // The entry rung, and only the entry rung — see the block comment above.
      amount: ladderRate(scope.kind, 1),
      unitText: perProductUnit,
      url,
      lang: l,
      rungs,
    }));
  }

  // ── The two add-ons ───────────────────────────────────────────────────────
  nodes.push(productNode({
    slug: 'brand-model',
    name: BRAND_MODEL_NAME[l],
    description: `${BRAND_MODEL_LINE[l]} ${BRAND_MODEL_CREDIT[l]}`,
    amount: AMOUNT.brandModel,
    unitText: BRAND_MODEL_UNIT[l],
    url,
    lang: l,
  }));
  nodes.push(productNode({
    slug: 'video-clip',
    name: perProduct('video', l).name,
    description: VIDEO_LINE[l],
    amount: AMOUNT.video,
    unitText: perProduct('video', l).unit,
    url,
    lang: l,
  }));

  // ── The plans ─────────────────────────────────────────────────────────────
  // One Offer per plan, because a plan is a fixed monthly amount for a fixed
  // monthly output — there is no rate to fall, so nothing to specify a range
  // over. The included-products line comes from plans(), so the count in the
  // description and the count the page lists are the same string.
  for (const plan of plans(l)) {
    nodes.push(productNode({
      slug: `plan-${plan.id}`,
      name: PLAN_NAME[l](plan.name),
      description: `${plan.line} ${plan.includes[0]}.`,
      amount: PLAN_AMOUNT[plan.id],
      unitText: plan.unit,
      url,
      lang: l,
      // A monthly rate, said in the way a machine can read it. UN/CEFACT MON =
      // months; the human-readable "per month" is already on unitText.
      reference: { '@type': 'QuantitativeValue', value: 1, unitCode: 'MON' },
    }));
  }

  return nodes;
}

function testSampleNode(lang, url) {
  const l = norm(lang);
  const s = TEST_SAMPLE[l];
  return productNode({
    slug: 'test-sample',
    name: s.name,
    description: s.line,
    amount: AMOUNT.testSample,
    unitText: s.unit,
    url,
    lang: l,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// FAQPAGE — /faq and /pricing.
//
// The items come straight out of src/data/faq.js, which is the same module the
// two components render from. That is the entire point: a Question node and the
// <summary> a visitor reads are the same string, so they cannot disagree.
// ─────────────────────────────────────────────────────────────────────────────

function faqNode(items, lang, url) {
  const l = norm(lang);
  return {
    '@type': 'FAQPage',
    '@id': `${url}#faq`,
    url,
    inLanguage: l,
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.html ? htmlToText(item.html) : item.a,
      },
    })),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// THE GRAPH
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The JSON-LD graph for one page.
 *
 * @param path  language-neutral base path ('/pricing'), i.e. Layout's `base`.
 * @param lang  'en' | 'nl'.
 * @param url   the page's canonical absolute URL. Passed in rather than rebuilt
 *              here so that every @id in the graph is byte-identical to the
 *              <link rel="canonical"> in the same <head>. Two URLs for one page
 *              is how a search engine ends up with two pages.
 */
export function buildGraph({ path = '/', lang = 'en', url = SITE } = {}) {
  const p = normalizePath(path);
  const l = norm(lang);
  const nodes = [organizationNode()];

  if (PILLARS[p]) nodes.push(serviceNode(p, l, url));
  if (p === '/pricing') nodes.push(...pricingProductNodes(l, url));
  if (p === '/test-sample') nodes.push(testSampleNode(l, url));
  if (p === '/faq') nodes.push(faqNode(faqPageItems(l), l, url));
  if (p === '/pricing') nodes.push(faqNode(pricingFaqs(l), l, url));

  return { '@context': 'https://schema.org', '@graph': nodes };
}

/**
 * The same graph, serialised for `set:html` inside <script type="application/ld+json">.
 *
 * Every '<' is escaped to its < form. JSON.stringify does not do this,
 * and it only takes one answer growing a less-than sign in it for a closing
 * script tag to be found early and the rest of the document to be parsed as
 * JavaScript.
 */
export function graphJson(opts) {
  return JSON.stringify(buildGraph(opts)).replace(/</g, '\\u003c');
}

export default buildGraph;
