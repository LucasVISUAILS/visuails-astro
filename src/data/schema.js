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
//   Product/Offer — the seven pricing tiers on /pricing, the €0.99 sample on
//                   /test-sample, EN and NL (4 pages).
//   FAQPage       — /faq and /pricing, EN and NL (4 pages).
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
  AMOUNT, PACKAGES, PER_PRODUCT, TEST_SAMPLE,
  FULL_DROP_MIN, FULL_DROP_MAX, PILOT_PRODUCTS,
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
const ORG_DESCRIPTION =
  'Product-visual studio for clothing brands and modern e-commerce: catalog, lifestyle and video visuals built from a single product photo — a whole drop, or one product at a time.';

function organizationNode() {
  return {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: 'VISUAILS',
    description: ORG_DESCRIPTION,
    url: SITE,
    logo: `${SITE}/img/logo-mark.webp`,
    image: `${SITE}/img/banners-09.webp`,
    email: 'hello@visuails.com',
    telephone: '+31625436130',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Enschede',
      addressCountry: 'NL',
    },
    areaServed: 'Worldwide',
    sameAs: ['https://wa.me/31625436130'],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE — the four pillar pages.
//
// `source` says which pricing.js table the name, one-liner, unit and price come
// from, so nothing here is typed. What IS typed is `serviceType`: schema.org
// wants a short classification of the work, and neither table holds one — a
// product name ("Catalog set") is not a service type ("Product photography").
// ─────────────────────────────────────────────────────────────────────────────

const PILLARS = {
  '/catalog': {
    source: 'perProduct',
    id: 'catalog',
    amount: 'catalog',
    name: { en: 'Catalog visuals for e-commerce', nl: 'Catalogbeeld voor e-commerce' },
    serviceType: { en: 'Product photography', nl: 'Productfotografie' },
  },
  '/lifestyle': {
    source: 'perProduct',
    id: 'lifestyle',
    amount: 'lifestyle',
    name: { en: 'Lifestyle visuals for e-commerce', nl: 'Lifestylebeeld voor e-commerce' },
    serviceType: { en: 'Lifestyle product photography', nl: 'Lifestyle-productfotografie' },
  },
  '/video': {
    source: 'perProduct',
    id: 'video',
    amount: 'video',
    name: { en: 'Product video clips', nl: 'Productvideoclips' },
    serviceType: { en: 'Product video production', nl: 'Productvideoproductie' },
  },
  '/custom-models': {
    source: 'package',
    id: 'brand-model',
    amount: 'brandModel',
    serviceType: { en: 'Brand model creation', nl: 'Merkmodel-creatie' },
  },
};

/** The pricing.js row a pillar or product entry points at. */
function rowFor(entry, lang) {
  const l = norm(lang);
  const table = entry.source === 'package' ? PACKAGES[l] : PER_PRODUCT[l];
  const row = table.find((r) => r.id === entry.id);
  if (!row) {
    throw new Error(`schema.js: no ${entry.source} row "${entry.id}" in pricing.js (${l})`);
  }
  return row;
}

function serviceNode(path, lang, url) {
  const entry = PILLARS[path];
  const l = norm(lang);
  const row = rowFor(entry, l);
  const amount = AMOUNT[entry.amount];

  return {
    '@type': 'Service',
    '@id': `${url}#service`,
    name: entry.name ? entry.name[l] : row.name,
    serviceType: entry.serviceType[l],
    description: row.line,
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
        // "per product" / "per clip" / "one-time setup" — pricing.js's own
        // unit label, so the machine-readable unit and the printed one agree.
        unitText: row.unit,
      },
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCT / OFFER — the seven tiers on /pricing, plus the sample.
//
// Order follows section 3 of the brief. `quantity` is the only thing stated
// here that pricing.js does not already carry on the row, and both figures are
// read from pricing.js constants rather than typed.
// ─────────────────────────────────────────────────────────────────────────────

const PRICING_TIERS = [
  {
    slug: 'drop-pilot',
    source: 'package',
    id: 'pilot',
    amount: 'dropPilot',
    quantity: { '@type': 'QuantitativeValue', value: PILOT_PRODUCTS, unitText: 'products' },
  },
  {
    slug: 'full-drop',
    source: 'package',
    id: 'full-drop',
    amount: 'fullDrop',
    quantity: {
      '@type': 'QuantitativeValue',
      minValue: FULL_DROP_MIN,
      maxValue: FULL_DROP_MAX,
      unitText: 'products',
    },
  },
  { slug: 'catalog-set', source: 'perProduct', id: 'catalog', amount: 'catalog' },
  { slug: 'lifestyle-carousel', source: 'perProduct', id: 'lifestyle', amount: 'lifestyle' },
  { slug: 'video-clip', source: 'perProduct', id: 'video', amount: 'video' },
  { slug: 'brand-model', source: 'package', id: 'brand-model', amount: 'brandModel' },
  {
    slug: 'studio-retainer',
    source: 'package',
    id: 'retainer',
    amount: 'retainer',
    // A monthly rate, said in the way a machine can read it. UN/CEFACT MON =
    // months; the human-readable "per month" is already on unitText.
    reference: { '@type': 'QuantitativeValue', value: 1, unitCode: 'MON' },
  },
];

// The one fact in this file that pricing.js states only as a bullet inside a
// package's `includes` list — and that list is not usable here, because it also
// contains the reserved-window promise this file is forbidden to quote. So the
// credit is restated as one sentence per language, with BOTH numbers read from
// pricing.js: change the credit or the number of drops it covers and this
// sentence changes with them.
const BRAND_MODEL_CREDIT = {
  en: `${euro(AMOUNT.brandModelCredit, 'en')} is credited against each of your first ${BRAND_MODEL_CREDIT_DROPS} drops.`,
  nl: `${euro(AMOUNT.brandModelCredit, 'nl')} wordt verrekend met elk van je eerste ${BRAND_MODEL_CREDIT_DROPS} drops.`,
};

function productNode({ slug, name, description, amount, unitText, url, lang, quantity, reference }) {
  const l = norm(lang);
  const priceSpec = {
    '@type': 'UnitPriceSpecification',
    price: priceValue(amount),
    priceCurrency: 'EUR',
    unitText,
  };
  if (reference) priceSpec.referenceQuantity = reference;

  const offer = {
    '@type': 'Offer',
    '@id': `${url}#offer-${slug}`,
    price: priceValue(amount),
    priceCurrency: 'EUR',
    url,
    availability: 'https://schema.org/InStock',
    seller: { '@id': ORG_ID },
    priceSpecification: priceSpec,
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
  return PRICING_TIERS.map((tier) => {
    const row = rowFor(tier, l);
    const description =
      tier.id === 'brand-model' ? `${row.line} ${BRAND_MODEL_CREDIT[l]}` : row.line;
    return productNode({
      slug: tier.slug,
      name: row.name,
      description,
      amount: AMOUNT[tier.amount],
      unitText: row.unit,
      url,
      lang: l,
      quantity: tier.quantity,
      reference: tier.reference,
    });
  });
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
