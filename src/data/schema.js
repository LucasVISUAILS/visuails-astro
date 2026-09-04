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
//   FAQPage       — /faq, /pricing, /catalog, /lifestyle en /video, EN en NL
//                   (10 pagina's). De laatste drie sinds 23 augustus 2026; zie
//                   de noot bij dienstVragen in buildGraph().
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
// client’s own collection going live. What is sold is an order.
//
// HOW A PAGE GETS ITS GRAPH
// From its URL, not from a prop. Layout.astro already derives the
// language-neutral base path for hreflang and the language switcher; the graph
// is derived from that same value. No page file passes anything, so no page
// file can forget to.
//
// THREE RULES THIS FILE IS HELD TO
//   · NO INVENTED FACTS. No aggregateRating, no review, no counts, no claims
//     about anyone’s business. The project's standing rule is never to invent
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
  euro,
} from './pricing.js';
import { pricingFaqs, faqPageItems, serviceFaqs, homeObjectionFaqs } from './faq.js';
/* De gidsen en de doorloopstappen, allebei uit de lijst die de PAGINA ook rendert.
   Zie de kop van guides.js en de ItemList/HowTo hieronder: een knoop mag alleen
   zeggen wat er te lezen valt, dus staat er geen tweede lijst in dit bestand. */
import { guides, GUIDES_HUB } from './guides.js';
import { WALK_STEPS, WALK_COPY } from './demo.js';
import { WHATSAPP_NUMBER, waHref } from './whatsapp.js';

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
// the client’s collection going live, and using it for a work order is the
// collision that retired the package model. See section 0 of pricing.js.
const ORG_DESCRIPTION =
  'Product-visual studio for clothing brands and modern e-commerce: catalog, lifestyle and video visuals built from a single product photo — a whole collection in one order, or one product at a time.';

/*
 * ── DE WEBSITE ZELF, ALS KNOOP — 2 september 2026 ──────────────────────────
 *
 * De graph had een Organization en per pagina een Service of een FAQPage, maar
 * niets dat de SITE als ding beschreef. Dat is het knooppunt waar de rest aan
 * hangt: het zegt dat deze twee taalversies één publicatie van één uitgever
 * zijn, en het is waar een `SearchAction` aan zou hangen als de site ooit een
 * zoekfunctie krijgt.
 *
 * GEEN SearchAction VANDAAG. Die belooft een zoekpagina op een vast adres, en
 * die is er niet. Een sitelinks-zoekvak aanvragen dat op een 404 uitkomt, is
 * erger dan er geen hebben.
 */
function websiteNode(lang) {
  return {
    '@type': 'WebSite',
    '@id': `${SITE}/#website`,
    name: 'VISUAILS',
    url: SITE,
    description: ORG_DESCRIPTION,
    inLanguage: norm(lang),
    publisher: { '@id': ORG_ID },
  };
}

/*
 * ── DE PAGINA ZELF, ALS KNOOP — 3 september 2026 ───────────────────────────
 *
 * De graph beschreef de uitgever (Organization), de publicatie (WebSite) en wat er
 * te koop is (Service, Product), maar niets beschreef HET DING WAAR JE OP STAAT. Dat
 * is de knoop waar `dateModified` aan hangt, en die datum was de grootste ontbrekende
 * post uit de GEO-doorlichting: een model dat tussen twee bronnen kiest, neemt de
 * bron die zegt wanneer hij voor het laatst klopte.
 *
 * DE DATUM STAAT HIER NIET IN, EN DAT IS DE HELE TRUC. Dit bestand draait tijdens het
 * renderen en heeft geen toegang tot de geschiedenis; de enige datum die het zou
 * kunnen noemen is "nu", en dat is precies de leugen die we niet vertellen (zie de
 * kop van scripts/gewijzigd-op.mjs). Die bouwstap vult `dateModified` na de build in,
 * uit git, per pagina. Deze functie levert de vorm, die stap levert het feit.
 *
 * GEEN KNOOP OP EEN noindex-PAGINA. Een WebPage-knoop op een 404 of een bedankpagina
 * beschrijft iets wat niet in een index hoort te staan, en de bouwstap zou er dan een
 * datum op zetten die niemand ooit leest.
 */
/*
 * Een preciezer type voor de paginaknoop, waar dat een echt feit is en geen etiket.
 * CollectionPage betekent "deze pagina is een verzameling verwijzingen" en ImageGallery
 * betekent "deze pagina is beeld"; allebei kloppen, allebei zeggen iets wat WebPage
 * niet zegt. De rest blijft WebPage — een type opplakken omdat het specifieker klinkt,
 * is precies de verzonnen precisie waar de kop van dit bestand tegen waarschuwt.
 */
const PAGINA_TYPE = {
  '/guides': 'CollectionPage',
  '/gallery': 'ImageGallery',
  '/models': 'CollectionPage',
};

function webPageNode({ url, lang, title, description, kruimels, type = 'WebPage' }) {
  return {
    '@type': type,
    '@id': `${url}#webpage`,
    url,
    ...(title ? { name: title } : {}),
    ...(description ? { description } : {}),
    isPartOf: { '@id': `${SITE}/#website` },
    about: { '@id': ORG_ID },
    inLanguage: norm(lang),
    // Alleen verwijzen naar een kruimelpad dat er ook echt is. Een @id dat nergens
    // heen wijst is erger dan geen verwijzing.
    ...(kruimels ? { breadcrumb: { '@id': `${url}#breadcrumb` } } : {}),
  };
}

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
    telephone: `+${WHATSAPP_NUMBER}`,
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Enschede',
      addressCountry: 'NL',
    },
    areaServed: 'Worldwide',
    /* ── DE VELDEN DIE EEN ENTITEIT AANWIJSBAAR MAKEN — 2 september 2026 ────
     *
     * Toegevoegd na de GEO-doorlichting (kladblok/geo-audit.mjs). Een
     * zoekmachine rangschikt pagina's; een taalmodel dat een ANTWOORD citeert
     * moet eerst weten wíé het citeert, en dat is wat deze velden doen. Ze
     * staan er alle vier op bewijs:
     *
     *   · `legalName`, `vatID` en `taxID` staan al zichtbaar in de voettekst
     *     van elke pagina (Layout.astro) — een machineleesbare kopie van iets
     *     wat een mens er al kan lezen, en geen nieuwe claim.
     *   · `knowsAbout` komt uit PILLARS en is niet ingetypt: een dienst erbij
     *     levert hier vanzelf een term op, en er kan niets in staan wat we niet
     *     doen.
     *   · `contactPoint` herhaalt het adres en het nummer die hierboven al
     *     staan, maar dan als aanspreekpunt — het veld waar een model naar
     *     kijkt bij "hoe bereik ik ze".
     *
     * WAT ER MET OPZET NIET IN ZIT: `foundingDate`, `numberOfEmployees` en
     * `aggregateRating`. Van de eerste twee weet dit bestand het antwoord niet,
     * en een schema-veld is geen plek om te schatten. Een `aggregateRating`
     * zonder echte reviews is bovendien precies waar Google handmatige
     * maatregelen voor uitdeelt — zie testimonials.js, dat om dezelfde reden
     * leeg is en de site dat gewoon laat zeggen. */
    legalName: 'VISUAILS',
    vatID: 'NL005407575B96',
    taxID: '99742993',
    knowsAbout: Object.values(PILLARS).map((e) => e.serviceType.en),
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'sales',
      email: 'hello@visuails.com',
      telephone: `+${WHATSAPP_NUMBER}`,
      areaServed: 'Worldwide',
      availableLanguage: ['en', 'nl'],
    },
    sameAs: [
      waHref(),
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

const COMPLETE_NAME = { en: 'Complete bundle', nl: 'Complete bundel' };

const COMPLETE_LEAD = {
  en: 'A catalog set and a lifestyle carousel for every product in the order.',
  nl: 'Elk product in de bestelling krijgt een catalogset en een lifestyle-carousel.',
};

const VIDEO_LINE = {
  en: 'One short clip. The same rate on its own or added to any order.',
  nl: 'Eén korte clip. De prijs is hetzelfde, los of toegevoegd aan een bestelling.',
};

const HOOKS_LINE = {
  en: 'A short vertical video that carries on into the image below it in the feed.',
  nl: 'Een korte verticale video die doorloopt in het beeld eronder in de feed.',
};
const HOOKS_UNIT = { en: 'per product, from', nl: 'per product, vanaf' };

const EDITIONS_LINE = {
  en: 'A monthly set of brand imagery with no product in it, made for one brand.',
  nl: 'Elke maand een set merkbeeld zonder product erin, gemaakt voor één merk.',
};
const EDITIONS_UNIT = { en: 'per month, plus a one-time setup', nl: 'per maand, plus een eenmalige opzet' };

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
  /* ── HOOKS — 2 SEPTEMBER 2026 ─────────────────────────────────────────
   * Een vaste ONDERGRENS en geen ladder: `AMOUNT.hooks` is een vanaf-prijs, en
   * `unit` zegt dat er ook bij ("per product, vanaf"), want een Offer met een
   * kaal bedrag zegt tegen een machine dat het DE prijs is.
   *
   * `availability` is hier PreOrder en niet InStock. Dat is geen detail: het
   * schema is het machineleesbare deel van dezelfde belofte die de pagina in
   * woorden doet, en die pagina zegt met zoveel woorden dat je dit vandaag niet
   * kunt bestellen. Twee antwoorden op één vraag is precies wat dit bestand
   * moet voorkomen. */
  '/hooks': {
    amount: 'hooks',
    description: HOOKS_LINE,
    unit: HOOKS_UNIT,
    availability: 'https://schema.org/PreOrder',
    name: { en: 'Hook videos', nl: 'Hookvideo’s' },
    serviceType: { en: 'Short-form product video production', nl: 'Productie van korte productvideo’s' },
  },
  /* Editions — 2 september 2026. Een maandbedrag, dus `unitText` zegt "per
   * maand" én dat er een opzet bij hoort; een Offer met een kaal bedrag zou
   * tegen een machine zeggen dat dat de hele prijs is. PreOrder om dezelfde
   * reden als bij /hooks: de pagina zegt in woorden dat het nog niet loopt. */
  '/editions': {
    amount: 'editions',
    description: EDITIONS_LINE,
    unit: EDITIONS_UNIT,
    availability: 'https://schema.org/PreOrder',
    name: { en: 'Editions — monthly brand imagery', nl: 'Editions — maandelijks merkbeeld' },
    serviceType: { en: 'Brand imagery subscription', nl: 'Abonnement op merkbeeld' },
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
      availability: entry.availability || 'https://schema.org/InStock',
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
/* BRAND_MODEL_CREDIT stond hier — de zin over de € 250 die over vijf bestellingen
   terugkwam. Die credit bestaat sinds 23 augustus 2026 niet meer; zie de noot bij
   AMOUNT.brandModel in pricing.js. Wat in de plaats komt, is de zin die de prijs
   nu draagt, en die zegt hetzelfde als de pagina: één keer, en verder niets.

   HIER STAAT DEZELFDE ZIN ALS OP HET SCHERM, en dat is de regel van dit bestand:
   geen prijs in de graph die de zichtbare pagina niet ook toont. */
const BRAND_MODEL_ONCE = {
  en: 'Paid once, when the model is designed. Not per image, not per order, not per year.',
  nl: 'Eén keer betaald, als het model ontworpen wordt. Niet per beeld, niet per bestelling, niet per jaar.',
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
    description: `${BRAND_MODEL_LINE[l]} ${BRAND_MODEL_ONCE[l]}`,
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
// THE TRAIL — 14 augustus 2026
// ─────────────────────────────────────────────────────────────────────────────
//
// WAT ONTBRAK. Deze site heeft 87 pagina's en twee niveaus — /lifestyle/glow,
// /video/campaign, /start/catalog — en geen enkele pagina vertelde een
// zoekmachine waar ze hing. Zonder BreadcrumbList toont Google het kale pad van
// de url onder de titel; met, toont hij de namen. Dat is het hele verschil:
// "visuails.com › lifestyle › glow" tegenover "Lifestyle › Glow".
//
// ── WAAROM DIT EEN TABEL IS EN GEEN AFLEIDING UIT DE URL ───────────────────
//
// De verleiding is om 'glow' met een hoofdletter te schrijven en klaar te zijn.
// Dat gaat op deze site meteen mis: 'phone-made' wordt dan 'Phone-made' (klopt),
// 'ai-act' wordt 'Ai-act' (fout), 'data-processing-agreement' wordt een zin van
// vier woorden die nergens zo staat, en 'custom-models' krijgt een naam die van
// de pagina zelf verschilt. Een kruimelpad met een verzonnen naam erin is erger
// dan geen kruimelpad: het staat in het zoekresultaat, en het is dan ONS woord
// dat niet klopt.
//
// Dus: alleen wat hier met naam en toenaam staat, krijgt een spoor. Een pagina
// die er niet in staat, krijgt geen BreadcrumbList — geen gok, geen halve.
// Vandaar ook dat crumbsFor() null teruggeeft in plaats van een deel: een spoor
// dat halverwege ophoudt, wijst naar een niveau dat er niet is.
//
// ── EN GEEN ITEM VOOR DE PAGINA ZELF ───────────────────────────────────────
//
// De laatste kruimel is de pagina waar je op staat, en die krijgt bewust geen
// `item`-url. Dat is wat de schema.org-documentatie voorschrijft en het is ook
// logisch: een link naar de pagina waar je al bent, is geen navigatie.

/*
 * ── /guides ALS ItemList — 3 september 2026 ────────────────────────────────
 *
 * De gidsenhub is vijf kaarten die elk naar één pagina wijzen. Voor een lezer is dat
 * een keuzemenu; voor een model dat "waar leg ik uit hoe je met een telefoon
 * fotografeert" moet beantwoorden, was het tot vandaag vijf koppen zonder verband.
 * Een ItemList zegt: dit is een verzameling, dit zijn de leden, en dit is de volgorde.
 *
 * DE LIJST KOMT UIT src/data/guides.js, hetzelfde bestand dat de pagina rendert. Dat
 * is niet netheid maar de regel uit de kop van dit bestand, toegepast op tekst in
 * plaats van op geld: er staat hier niets wat de zichtbare pagina niet ook toont. Een
 * uitgetypte kopie zou machineleesbaar zijn en dus onzichtbaar als hij afwijkt.
 */
function guidesItemList(lang, url) {
  const l = norm(lang);
  const lijst = guides(l);
  const hub = GUIDES_HUB[l] || GUIDES_HUB.en;
  // Het voorvoegsel van deze pagina, op dezelfde manier afgeleid als in
  // breadcrumbNode(): uit de canonieke url, zodat /nl vanzelf klopt.
  const eind = String(url).lastIndexOf('/guides');
  const prefix = eind > 0 ? String(url).slice(0, eind) : SITE;
  return {
    '@type': 'ItemList',
    '@id': `${url}#itemlist`,
    name: hub.naam,
    description: hub.lede,
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    numberOfItems: lijst.length,
    itemListElement: lijst.map((g, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: g.title,
      description: g.desc,
      url: `${prefix}${g.pad}/`,
    })),
  };
}

/*
 * ── /how-it-works ALS HowTo — 3 september 2026 ─────────────────────────────
 *
 * Deze pagina beschrijft één bestelling van formulier tot download, in zes stappen die
 * op de pagina zelf staan (FigWalk). Dat is letterlijk wat een HowTo is, en het is het
 * soort knoop waar een model een stappenlijst uit overneemt in plaats van hem uit
 * lopende tekst te moeten raden.
 *
 * DRIE DINGEN DIE HIER MET OPZET NIET IN STAAN:
 *
 *   · GEEN `totalTime`, `estimatedCost`, `supply` of `tool`. De eerste is de regel uit
 *     de kop van dit bestand — niets hier noemt een doorlooptijd, want de agenda is de
 *     enige die een dag mag noemen. De andere drie zouden verzonnen zijn.
 *   · GEEN `image` per stap. De beelden in die figuur zijn met zoveel woorden
 *     plaatsvervangers ("a drawing, not a screenshot"), en een HowToStep met een
 *     illustratie erin zegt: zo ziet het eruit. Dat zou het niet.
 *   · GEEN eigen tekst. Naam en tekst van elke stap komen uit WALK_COPY in
 *     src/data/demo.js — dezelfde bron als FigWalk rendert, op deze pagina én op
 *     /demo. Twee beschrijvingen van één proces is hoe /start en /how-it-works ooit
 *     uit elkaar zijn gelopen; zie de kop van HowItWorksPage.astro.
 *
 * En de eerlijkheid erbij: Google toont sinds 2023 geen HowTo-resultaat meer in de
 * gewone zoekresultaten. Deze knoop staat er dus niet voor een plaatje in Google maar
 * voor de lezer die géén zoekmachine is — en die is voor deze site de reden dat er
 * ook een /llms.txt ligt.
 */
function howToNode(lang, url) {
  const l = norm(lang);
  const t = WALK_COPY[l] || WALK_COPY.en;
  const stappen = WALK_STEPS
    .map((id) => t.steps[id])
    .filter(Boolean);
  if (!stappen.length) return null;
  return {
    '@type': 'HowTo',
    '@id': `${url}#howto`,
    name: t.title,
    description: t.lede,
    inLanguage: l,
    step: stappen.map((st, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: st.h,
      text: htmlToText(st.b),
    })),
  };
}

const CRUMB_ROOT = { en: 'Home', nl: 'Home' };

const CRUMBS = {
  '/about': { en: 'About', nl: 'Over ons' },
  '/ai-act': { en: 'AI Act', nl: 'AI-verordening' },
  '/catalog': { en: 'Catalog', nl: 'Catalog' },
  '/catalog/classic': { en: 'Classic', nl: 'Classic' },
  '/catalog/custom': { en: 'Custom Brand', nl: 'Custom Brand' },
  '/compare': { en: 'Compare', nl: 'Vergelijken' },
  '/contact': { en: 'Contact', nl: 'Contact' },
  '/cookie-policy': { en: 'Cookie policy', nl: 'Cookiebeleid' },
  '/custom-models': { en: 'Brand Model', nl: 'Merkmodel' },
  '/data-processing-agreement': { en: 'Data processing agreement', nl: 'Verwerkersovereenkomst' },
  '/editions': { en: 'Editions', nl: 'Editions' },
  '/faq': { en: 'FAQ', nl: 'Veelgestelde vragen' },
  '/gallery': { en: 'Gallery', nl: 'Galerij' },
  '/guides': { en: 'Guides', nl: 'Gidsen' },
  '/hooks': { en: 'Hooks', nl: 'Hooks' },
  '/how-it-works': { en: 'How it works', nl: 'Hoe het werkt' },
  '/lifestyle': { en: 'Lifestyle', nl: 'Lifestyle' },
  '/lifestyle/custom': { en: 'Custom', nl: 'Custom' },
  '/lifestyle/dunes': { en: 'Dunes', nl: 'Dunes' },
  '/lifestyle/flash': { en: 'Flash', nl: 'Flash' },
  '/lifestyle/glow': { en: 'Glow', nl: 'Glow' },
  '/lifestyle/phone-made': { en: 'Phone-made', nl: 'Phone-made' },
  '/models': { en: 'Models', nl: 'Modellen' },
  '/pricing': { en: 'Pricing', nl: 'Tarieven' },
  '/privacy': { en: 'Privacy', nl: 'Privacy' },
  '/start': { en: 'Order', nl: 'Bestellen' },
  '/start/brand-model': { en: 'Brand Model', nl: 'Merkmodel' },
  '/start/catalog': { en: 'Catalog sets', nl: 'Catalogsets' },
  '/start/complete': { en: 'Catalog and lifestyle', nl: 'Catalog en lifestyle' },
  '/start/lifestyle': { en: 'Lifestyle carousels', nl: 'Lifestyle-carousels' },
  '/start/plan': { en: 'Plan', nl: 'Plan' },
  '/start/video': { en: 'Video', nl: 'Video' },
  '/terms': { en: 'Terms', nl: 'Voorwaarden' },
  /* ── VIER PAGINA'S DIE GEEN KRUIMELPAD HADDEN — 2 september 2026 ─────────
   * Gevonden met kladblok/seo-audit.mjs: zeventien gebouwde pagina's misten een
   * BreadcrumbList. Dertien daarvan horen dat te missen — de twee homepages
   * (een kruimelpad naar jezelf zegt niets) en elf 404- en bedankpagina's die
   * op noindex staan. Deze vier niet: het zijn gewone, indexeerbare pagina's
   * die alleen nooit in deze tabel zijn gezet. Een kruimelpad is wat een
   * zoekresultaat "visuails.com › Abonnementen" laat tonen in plaats van een
   * kale URL, en dat is precies het regeltje waarop geklikt wordt. */
  '/plans': { en: 'Plans', nl: 'Abonnementen' },
  '/portal': { en: 'Your portal', nl: 'Jouw portaal' },
  '/start/custom-look': { en: 'Custom look', nl: 'Eigen look' },
  '/studio': { en: 'VISUAILS Studio', nl: 'VISUAILS Studio' },
  '/test-sample': { en: 'Try VISUAILS', nl: 'Probeer VISUAILS' },
  '/upload-guidelines': { en: 'Upload guidelines', nl: 'Uploadrichtlijnen' },
  '/video': { en: 'Video', nl: 'Video' },
  '/video/campaign': { en: 'Campaign', nl: 'Campaign' },
  '/video/custom': { en: 'Custom', nl: 'Custom' },
  '/video/lifestyle': { en: 'Lifestyle', nl: 'Lifestyle' },
  '/video/motion': { en: 'Motion', nl: 'Motion' },
};

/*
 * WAT ER MET OPZET NIET IN STAAT. /portal, /studio, /thank-you en /demo zijn
 * pagina's waar je terechtkomt en niet naartoe zoekt: een kruimelpad in een
 * zoekresultaat van een bedankpagina nodigt uit tot een klik die niets oplevert.
 * En /nl-varianten staan er niet apart in, want buildGraph krijgt het
 * TAALNEUTRALE pad — zie de `path`-parameter daar — dus /nl/lifestyle/glow en
 * /lifestyle/glow zijn hier één regel met twee namen.
 */

/** De kruimels voor dit pad, of null als we niet elke laag bij naam kennen. */
function crumbsFor(p, lang) {
  if (p === '/' || !CRUMBS[p]) return null;
  const delen = p.split('/').filter(Boolean);
  const trail = [];
  for (let i = 0; i < delen.length; i += 1) {
    const sub = `/${delen.slice(0, i + 1).join('/')}`;
    const naam = CRUMBS[sub];
    // Een tussenniveau zonder naam betekent geen spoor. Zie de kop hierboven:
    // liever geen kruimelpad dan een kruimelpad met een verzonnen woord erin.
    if (!naam) return null;
    trail.push({ path: sub, name: naam[lang] || naam.en });
  }
  return trail;
}

/**
 * De BreadcrumbList voor deze pagina, of null.
 *
 * `url` is de canonieke url van de pagina zelf en wordt gebruikt om de ANDERE
 * urls te bouwen, zodat het taalvoorvoegsel klopt zonder dat deze functie iets
 * over talen hoeft te weten: /nl/lifestyle/glow levert /nl/lifestyle op, en
 * /lifestyle/glow levert /lifestyle op. Datzelfde argument als bij buildGraph —
 * één url per pagina, afgeleid en niet opnieuw opgebouwd.
 */
function breadcrumbNode(p, lang, url) {
  const trail = crumbsFor(p, norm(lang));
  if (!trail) return null;

  // Het voorvoegsel van deze pagina: alles vóór het taalneutrale pad. Voor
  // https://visuails.com/nl/lifestyle/glow is dat 'https://visuails.com/nl'.
  const eind = String(url).lastIndexOf(p);
  const prefix = eind > 0 ? String(url).slice(0, eind) : SITE;

  const items = [{ name: CRUMB_ROOT[norm(lang)] || CRUMB_ROOT.en, url: `${prefix}/` }]
    .concat(trail.map((t) => ({ name: t.name, url: `${prefix}${t.path}` })));

  return {
    '@type': 'BreadcrumbList',
    '@id': `${url}#breadcrumb`,
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      // Geen `item` op de laatste: dat is de pagina zelf. Zie de kop.
      ...(i === items.length - 1 ? {} : { item: it.url }),
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
 * @param title / description  de <title> en <meta description> van deze pagina, voor
 *              de WebPage-knoop. Doorgegeven en niet hier opgebouwd, om dezelfde
 *              reden als `url`: er is één tekst en die staat in de pagina.
 * @param noindex  staat de pagina op noindex, dan komt er geen WebPage-knoop.
 */
export function buildGraph({
  path = '/', lang = 'en', url = SITE, title, description, noindex = false,
} = {}) {
  const p = normalizePath(path);
  const l = norm(lang);
  const nodes = [organizationNode(), websiteNode(l)];

  /* Het kruimelpad, waar we het pad bij naam kennen. Vóór de dienstknoop, want
     dit gaat over WAAR de pagina hangt en de rest over wat erop staat — en een
     graph leest prettiger van plaats naar inhoud. Zie de kop hierboven voor
     waarom een onbekend pad hier niets oplevert in plaats van een gok. */
  const crumbs = breadcrumbNode(p, l, url);
  /* De paginaknoop vóór het kruimelpad, en met een verwijzing ernaar. Zie
     webPageNode() hierboven voor waarom er geen datum in staat en waarom een
     noindex-pagina er geen krijgt. */
  if (!noindex) {
    nodes.push(webPageNode({
      url, lang: l, title, description, kruimels: Boolean(crumbs), type: PAGINA_TYPE[p] || 'WebPage',
    }));
  }
  if (crumbs) nodes.push(crumbs);

  if (PILLARS[p]) nodes.push(serviceNode(p, l, url));
  if (p === '/pricing') nodes.push(...pricingProductNodes(l, url));
  if (p === '/test-sample') nodes.push(testSampleNode(l, url));
  if (p === '/faq') nodes.push(faqNode(faqPageItems(l), l, url));
  /* ── DE HOMEPAGE HAD DRIE VRAGEN EN GEEN KNOOP — 2 september 2026 ─────────
   * De bezwaardenrij toont vier vragen met hun antwoord uitgeklapt, en de
   * graph zweeg erover. Dat is dezelfde mechanische reden als bij de
   * dienstpagina's hierboven: dit bestand leest het pad en niet de props. Nu de
   * drie beantwoorde vragen in faq.js staan (HOME_OBJECTION_QUESTIONS), is het
   * één regel. De vierde blijft erbuiten: zijn antwoord woont in HomeV2 zelf en
   * een knoop mag alleen zeggen wat hier te lezen valt. */
  if (p === '/') nodes.push(faqNode(homeObjectionFaqs(l), l, url));
  if (p === '/pricing') nodes.push(faqNode(pricingFaqs(l), l, url));

  /* ── DE DIENSTPAGINA'S HADDEN HUN VRAGEN NIET IN DE GRAPH — 23 AUG 2026 ────
   *
   * /catalog, /lifestyle en /video hebben samen twintig <summary>-vragen staan,
   * en geen ervan was als FAQPage gemarkeerd: de kop van dit bestand zei
   * "FAQPage — /faq and /pricing, EN and NL (4 pages)" en dat klopte. De reden
   * was mechanisch en niet inhoudelijk — die vragen stonden in het COPY-object
   * van de componenten, en dit bestand leest het pad en geen props.
   *
   * Nu ze in faq.js staan, is het één regel. serviceFaqs() geeft een lege lijst
   * terug voor een pad dat geen vragen heeft, en een lege mainEntity is precies
   * wat je niet wilt publiceren — vandaar de lengtecontrole en niet alleen de
   * padvergelijking. */
  const dienstVragen = serviceFaqs(p.replace(/^\//, ''), l);
  if (dienstVragen.length) nodes.push(faqNode(dienstVragen, l, url));

  /* De twee pagina's die een eigen vorm hebben in plaats van een dienst of een prijs.
     Zie guidesItemList() en howToNode() hierboven — allebei gebouwd uit de lijst die
     de pagina zelf ook rendert. */
  if (p === '/guides') nodes.push(guidesItemList(l, url));
  if (p === '/how-it-works') {
    const howto = howToNode(l, url);
    if (howto) nodes.push(howto);
  }

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
