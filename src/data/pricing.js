// VISUAILS — the price ladder and the service-tier model, in one place.
//
// WHY THIS FILE EXISTS
// Prices used to live as literal strings in ~40 page files, twice over (EN with
// a decimal point, NL with a comma). That guarantees drift: the moment one page
// is updated and another is missed, the site quotes the same thing two ways and
// the cheaper quote is the one a prospect screenshots. Every euro figure on the
// site now comes from here. Nothing else may hardcode a price.
//
// The numbers below are stored ONCE, as numbers, and formatted per locale on
// the way out — so "€39.99" and "€39,99" cannot disagree about the amount.
//
// SECTION 13 OF THE BRIEF IS THE GOVERNING DOCUMENT FOR THE TIER MODEL.
// It is stored verbatim at /BRIEF-13-SERVICE-TIERS.md. Its central claim:
// the dividing line between tiers is not order size, it is whether a human
// commits to a deadline. Tier 0 is unattended and cheap and honest about the
// queue; Tier 1 is attended and buys a committed date. Read that file before
// changing anything here.

// ─────────────────────────────────────────────────────────────────────────────
// 1 · AMOUNTS — the only place a number is written down.
// ─────────────────────────────────────────────────────────────────────────────

export const AMOUNT = {
  // Tier 0 · unattended, per product.
  //
  // RAISED BACK, DELIBERATELY, AND THIS TIME THE REASON IS ON RECORD. Section
  // 13 fixed these low — €39.99 / €59.99 — specifically so Tier 0 stayed an
  // accessible entry point for small brands ("Small brands are NOT being
  // priced out"), and the comment that used to sit here told a future editor
  // not to re-raise them without re-reading that reasoning. This IS that
  // re-read: Lucas asked explicitly (2026-07-27) to raise the à la carte
  // prices so the drop packages read as the obviously better deal, accepting
  // that this trades away some of Tier 0's small-brand accessibility in
  // exchange for a clearer nudge toward Tier 1. Catalog and lifestyle are the
  // two DROP_INCLUDES prices — the ones that compound into TIER0_PRODUCT below
  // and therefore into every "is the drop cheaper yet" comparison — so those
  // are the two that moved. Video did not: it is priced identically inside or
  // outside a drop by design (see its own comment), so raising it would not
  // make the drop look any more attractive relative to buying à la carte, it
  // would just cost every client more everywhere. If that should change too,
  // it is a separate decision — say so and it moves on its own line.
  testSample: 0.99,
  catalog: 89.99,   // 4-photo set, one product — was €39.99 under section 13
  lifestyle: 129.99, // 3-photo carousel, one product — was €59.99 under section 13
  video: 49,        // one clip — same rate standalone or added to a drop, left alone

  // Tier 1 · attended packages.
  dropPilot: 650,   // exactly 8 products, once per brand
  fullDrop: 1850,   // see FULL_DROP_MIN / MAX below
  brandModel: 1250, // one-time setup
  brandModelCredit: 250, // credited against each of your first five drops
  retainer: 2200,   // per month

  // The anchor VISUAILS is measured against.
  shootDayLow: 2500,
  shootDayHigh: 8000,
};

// Drop Pilot is a fixed count, not a range.
export const PILOT_PRODUCTS = 8;

// Full Drop product band.
//
// DEVIATION FROM THE BRIEF, DELIBERATE AND FLAGGED (brief section 12 requires
// flagging rather than silently working around it):
// The brief specifies 20–30 products for the Full Drop. At 20 products €1,850
// is €92.50 per product, which is MORE per product than the Drop Pilot's
// €81.25 — volume would punish volume, and a prospect who divides finds it.
// €1,850 / €81.25 = 22.8, so any floor of 23 or higher clears it. The floor is
// set to 25 because section 13's own upgrade-path copy uses 25 as the Full
// Drop's product count ("A Full Drop covers 25 for less"). At 25 the ladder is
// strictly monotonic — see LADDER below, which asserts this at build time.
export const FULL_DROP_MIN = 25;
export const FULL_DROP_MAX = 30;

// A drop product includes the catalog set AND the lifestyle carousel. This is
// the resolution to flag 1 in AUDIT-TASK-0.md §H: without it, a drop is simply
// a more expensive way to buy the same catalog sets that sit in the Tier 0
// block on the same page. Video is NOT included — it is an add-on at the same
// rate inside or outside a drop, which is what makes that rate quotable.
export const DROP_INCLUDES = ['catalog', 'lifestyle'];

// ─────────────────────────────────────────────────────────────────────────────
// 2 · FORMATTING — hand-rolled, not Intl, so the output is identical on every
// machine and in every Node build regardless of installed locale data.
// ─────────────────────────────────────────────────────────────────────────────

const SEP = {
  en: { thousands: ',', decimal: '.' },
  nl: { thousands: '.', decimal: ',' },
};

/**
 * Format an amount as euros for a locale.
 * Whole amounts print without decimals (€1,850 / €1.850); amounts with cents
 * print with exactly two (€39.99 / €39,99). That matches how the site already
 * writes them and avoids "€49.00" reading like a rounding artefact.
 */
export function euro(amount, lang = 'en') {
  const s = SEP[lang] || SEP.en;
  const hasCents = Math.round(amount * 100) % 100 !== 0;
  const fixed = amount.toFixed(hasCents ? 2 : 0);
  const [whole, cents] = fixed.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, s.thousands);
  return `€${grouped}${cents ? s.decimal + cents : ''}`;
}

/** A range, e.g. "€2,500–8,000" — the currency symbol is not repeated. */
export function euroRange(low, high, lang = 'en') {
  const s = SEP[lang] || SEP.en;
  const fmt = (n) => n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, s.thousands);
  return `€${fmt(low)}–${fmt(high)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3 · SERVICE TIERS — section 13.
//
// Three promises are held here rather than in page copy, because each is the
// kind of claim that a solo studio gets held to and each was previously
// repeated across dozens of files:
//
//   turnaround — what the site is allowed to say about timing for this tier.
//   reviewLevel — how much human review this tier gets.
//   aftercare — what happens after delivery if the client is not happy.
//
// Section 13 asks explicitly for the review claim to be "a single content
// variable per tier, not hardcoded across pages," so that Tier 0 review can be
// degraded to a spot-check later without a copy rewrite. Changing
// `reviewLevel` below from 'full' to 'spot' changes every page at once.
// The turnaround promise is held the same way for the same reason — section 13
// calls the Tier 0 delivery-date rule "the single most important constraint in
// this section", and a constraint that important does not belong in markup.
//
// ── WHY THERE IS NO REVISION COUNT ──────────────────────────────────────────
//
// There used to be: `revisionsIncluded` was 3 on attended and 0 on unattended,
// and eleven surfaces printed one of those numbers. It is gone on the client's
// instruction, and the reasoning is worth keeping because it will look like an
// omission to anyone who has read a competitor's pricing page:
//
//   "I think revision rounds show insecurity, and that is something a premium
//    service should not show."
//
// He is right, and the tier model is better without it. A counted entitlement
// tells a client two things before they have bought anything: that we expect to
// get it wrong, and that we have already decided how much wrongness they are
// allowed. Three rounds is not generous, it is a cap with a bow on it.
//
// What replaces it is a standard, not an entitlement: we ask on every order
// whether the client is happy, and when the answer is no we go into it with
// them and agree how to put it right. That can be a revision, a refund, or
// credit against the next order — decided with the client once the problem is
// understood, not rationed in advance.
//
// TWO RULES FOLLOW, and both are load-bearing:
//
//   1 · The three remedies are NOT listed on marketing surfaces. A page that
//       offers you a refund before you have ordered is a returns policy, and
//       reads as exactly the defensiveness this change removes. They are
//       enumerated once, in /terms §10, where a client goes to find out what
//       they can hold us to.
//
//   2 · Tier 0 no longer sells revisions. The old copy read "Revisions
//       available as a paid add-on", which monetises dissatisfaction — a louder
//       version of the same insecurity, and impossible to hold on the same page
//       as "we put it right". FLAGGED to the client as a pricing change rather
//       than made silently: it removes a (never-priced) revenue line.
//
// The tiers still differ, and now they differ on something real. Attended gets
// a committed window, priority in the queue, and a portal where every image is
// approved or flagged individually. Unattended gets the standard queue and a
// message. Section 13 frames the split as "order individual products" against
// "run a whole drop" — revisions were never the actual difference, they were
// just the difference that was easiest to put a number on.
// ─────────────────────────────────────────────────────────────────────────────

export const REVIEW_CLAIM = {
  full: {
    en: 'Human-checked, every visual',
    nl: 'Met de hand gecontroleerd, elke visual',
  },
  spot: {
    en: 'Human-checked on a sample of every order',
    nl: 'Steekproefsgewijs met de hand gecontroleerd',
  },
};

export const TIERS = {
  // TIER 0 — UNATTENDED.
  // Never described as "basic", "lite" or "starter", and never styled as a
  // lesser card. Section 13: "It is a different SERVICE MODEL, not a worse
  // product." The frame is "order individual products" vs "run a whole drop."
  unattended: {
    id: 'unattended',
    reviewLevel: 'full',
    committedDate: false,
    portal: false,
    // DOCUMENTATION, NOT A SWITCH. Nothing reads this field — grep it. It records
    // section 13's "always yields to Tier 1 in the capacity gate" next to the tier
    // it describes, because that is where a reader looks for it; the yielding
    // itself is QUEUE_FLOOR_PER_DAY in src/data/capacity.js, which reserves
    // throughput no attended window may take.
    //
    // Left in place rather than deleted because it names a real property of the
    // tier, and a reader who finds only the number in capacity.js has to
    // reconstruct which direction it protects. Flipping it changes nothing —
    // if you came here to change how the gate behaves, change the floor.
    yieldsToAttended: true,
    label: { en: 'Order individual products', nl: 'Bestel losse producten' },
    // The ONLY sanctioned timing language for this tier. No date, no "24
    // hours", no "next day" — section 13 supplies this exact substitute.
    turnaround: {
      en: 'Typically 2–4 working days',
      nl: 'Meestal 2–4 werkdagen',
    },
    // Stated openly, not buried. Section 13: "The difference must be VISIBLE,
    // not hidden [...] it is also what makes the low price honest rather than
    // a downgrade in disguise."
    queue: {
      en: 'Standard queue, no fixed delivery date',
      nl: 'Standaard wachtrij, geen vaste leverdatum',
    },
    delivery: {
      en: 'Delivered as a download link by email or WhatsApp',
      nl: 'Geleverd als downloadlink via e-mail of WhatsApp',
    },
    // The instrument here is a message, because there is no portal on this
    // tier. The promise is identical to attended's — see the block comment
    // above for why it is a standard rather than a counted entitlement.
    aftercare: {
      en: 'We ask if you are happy with them, and put right anything that is not',
      nl: 'We vragen of je tevreden bent, en zetten recht wat dat niet is',
    },
  },

  // TIER 1 — ATTENDED.
  attended: {
    id: 'attended',
    reviewLevel: 'full',
    committedDate: true,
    portal: true,
    // Also unread. See the note on unattended.yieldsToAttended above.
    yieldsToAttended: false,
    label: { en: 'Run a whole drop', nl: 'Draai een hele drop' },
    // A committed window, cleared by the capacity gate before it is offered.
    // The site must never print a date the gate has not cleared.
    turnaround: {
      en: 'A reserved 48-hour window, confirmed before you pay',
      nl: 'Een gereserveerd venster van 48 uur, bevestigd voordat je betaalt',
    },
    queue: {
      en: 'Priority in the queue — a drop is never pushed for a single order',
      nl: 'Voorrang in de wachtrij — een drop wijkt nooit voor een losse bestelling',
    },
    delivery: {
      en: 'Client portal with per-image approve or request-revision',
      nl: 'Klantportaal met per beeld goedkeuren of revisie aanvragen',
    },
    // Same promise as unattended, different instrument: `delivery` above says
    // where flagging happens, this says what flagging gets you. The two rows
    // sit next to each other in the /start and /pricing tables, so they must
    // not restate one another.
    aftercare: {
      en: 'Anything you flag, we look at with you until it is right',
      nl: 'Alles wat je markeert bekijken we samen tot het klopt',
    },
  },
};

/** The review claim for a tier, in one call. Pages use this, never a literal. */
export function reviewClaim(tierId, lang = 'en') {
  const tier = TIERS[tierId];
  if (!tier) throw new Error(`pricing.js: unknown tier "${tierId}"`);
  return REVIEW_CLAIM[tier.reviewLevel][lang] || REVIEW_CLAIM[tier.reviewLevel].en;
}

/** The sanctioned timing language for a tier. Pages use this, never a literal. */
export function turnaround(tierId, lang = 'en') {
  const tier = TIERS[tierId];
  if (!tier) throw new Error(`pricing.js: unknown tier "${tierId}"`);
  return tier.turnaround[lang] || tier.turnaround.en;
}

/**
 * What happens after delivery, per tier. Pages use this, never a literal.
 *
 * The third of the three held promises, and the newest. It exists as an
 * accessor rather than a bare property read for the same reason the other two
 * do: eleven surfaces used to type a revision count, every one of them had to
 * be found and rewritten by hand when the count went away, and the next change
 * to this promise should cost one edit instead of eleven.
 */
export function aftercare(tierId, lang = 'en') {
  const tier = TIERS[tierId];
  if (!tier) throw new Error(`pricing.js: unknown tier "${tierId}"`);
  return tier.aftercare[lang] || tier.aftercare.en;
}

/**
 * The five facts that describe a service tier, in the order they are shown,
 * with their column labels in both languages.
 *
 * WHY THIS IS HERE AND NOT IN THE PAGES. Two surfaces render this set —
 * TierCompare.astro (on /catalog, /lifestyle and /video) and the Tier 0 block
 * on /pricing — which meant two copies of the labels in two languages, four
 * lists to keep in step. They had already fallen out of step: /pricing's Dutch
 * list read `['Timing', 'Wachtrij', 'Levering', 'Na levering']`, with the
 * first label left in English on a live Dutch page. Nothing could have caught
 * that, because there was nothing to compare it against. There is now.
 *
 * Section 13 states the rule about the review claim specifically — "put the
 * review-level claim in a single content variable per tier, not hardcoded
 * across pages" — and the reasoning does not stop at that one row.
 *
 * ORDER IS PART OF THE DATA. The two tier columns sit side by side and a
 * comparison whose rows do not line up is not a comparison, so the sequence
 * lives here rather than being re-typed per page.
 */
export const TIER_ROWS = [
  { key: 'turnaround', label: { en: 'Timing', nl: 'Levertijd' } },
  { key: 'queue', label: { en: 'Queue', nl: 'Wachtrij' } },
  { key: 'delivery', label: { en: 'Delivery', nl: 'Levering' } },
  { key: 'review', label: { en: 'Review', nl: 'Controle' } },
  { key: 'aftercare', label: { en: 'After delivery', nl: 'Na levering' } },
];

/**
 * One cell of the tier table.
 *
 * DELEGATES RATHER THAN RE-READS. Three of the five rows already had a named
 * accessor before this table existed — reviewClaim(), turnaround(), aftercare()
 * — each written because the promise it returns is one the studio is held to,
 * and each documented as "pages use this, never a literal". Reading
 * `tier.turnaround[lang]` here instead would have produced the same string
 * today while quietly creating a second path to it, so a guard added to the
 * accessor tomorrow would cover the pages and miss the table. The two rows
 * without an accessor (queue, delivery) fall through to the plain read.
 *
 * `review` in particular is not stored on the tier at all — it is derived from
 * the tier's review LEVEL — and that indirection is what lets Tier 0 be
 * degraded to a spot-check later without a copy rewrite, which section 13 asks
 * for explicitly.
 *
 * Throws on an unknown key rather than returning undefined: a silently empty
 * cell in a comparison table reads as "this tier does not get that", which is
 * the single worst thing this block could say by accident.
 */
const ROW_ACCESSOR = {
  review: reviewClaim,
  turnaround,
  aftercare,
};

export function tierRow(tierId, key, lang = 'en') {
  const tier = TIERS[tierId];
  if (!tier) throw new Error(`pricing.js: unknown tier "${tierId}"`);
  if (!TIER_ROWS.some((r) => r.key === key)) {
    throw new Error(`pricing.js: "${key}" is not a tier row`);
  }
  const accessor = ROW_ACCESSOR[key];
  if (accessor) return accessor(tierId, lang);
  return tier[key][lang] || tier[key].en;
}

/** The row labels for one language, in order. */
export function tierRowLabels(lang = 'en', keys = null) {
  const rows = keys ? TIER_ROWS.filter((r) => keys.includes(r.key)) : TIER_ROWS;
  return rows.map((r) => r.label[lang] || r.label.en);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4 · DERIVED ARITHMETIC — computed, never typed.
// ─────────────────────────────────────────────────────────────────────────────

/** What one product costs à la carte at Tier 0, at drop scope (catalog + lifestyle). */
export const TIER0_PRODUCT = DROP_INCLUDES.reduce((sum, k) => sum + AMOUNT[k], 0);

export const PILOT_PER_PRODUCT = AMOUNT.dropPilot / PILOT_PRODUCTS;
export const FULL_DROP_PER_PRODUCT_MAX = AMOUNT.fullDrop / FULL_DROP_MIN; // most expensive
export const FULL_DROP_PER_PRODUCT_MIN = AMOUNT.fullDrop / FULL_DROP_MAX; // cheapest

/**
 * How many Tier 0 products a brand must order in a quarter before a Full Drop
 * is cheaper than what they are already spending.
 *
 * RECOMPUTED when catalog/lifestyle were raised (2026-07-27). TIER0_PRODUCT
 * went from €99.98 to €219.98, which moves both numbers below — worth reading
 * again rather than trusting the old ones, because FLAG (1)'s conclusion does
 * not just shift, it flips.
 *
 * FLAGGED (1) — section 13's example upgrade prompt reads "You've ordered 14
 * products this quarter. A Full Drop covers 25 for less." At the OLD prices
 * that sentence was false at the trigger: 14 products at drop scope was
 * 14 × €99.98 = €1,399.72, less than €1,850. At the new prices it is now TRUE
 * at 14 — 14 × €219.98 = €3,079.72, well past the Full Drop's €1,850 — so the
 * brief's own example stopped being wrong by accident of a price change, not
 * by design. That is not license to make it a saving claim, because it is
 * still false for the narrower case section 13's sentence does not
 * distinguish: a brand ordering CATALOG SETS ONLY, no lifestyle, at 14
 * products pays 14 × €89.99 = €1,259.86 — still under €1,850. The prompt
 * stays written as a comparison rather than a saving for exactly that reason:
 * "drop scope" and "catalog only" disagree about whether 14 is past the line,
 * and the code cannot know which one a given brand has been buying without
 * asserting something that is true for one mix and false for the other.
 *
 * FLAGGED (2) — THIS NUMBER IS 9 AND THE LIKE-FOR-LIKE ANSWER IS 11. Both are
 * correct; they answer different questions, and the difference is VAT.
 *
 *    9  €1,850 ÷ €219.98 = 8.41 → 9. The two figures as the site prints them
 *       today.
 *   11  €1,850 ÷ (€219.98 ÷ 1.21) = €1,850 ÷ €181.80 = 10.18 → 11. The same
 *       sum with both sides ex-VAT.
 *
 * Section 14 sets the rule that produces the gap: Tier 1 prices are quoted
 * EXCLUSIVE of VAT and Tier 0 prices INCLUSIVE. So 9 divides a VAT-inclusive
 * price into a VAT-exclusive one, and a business customer reclaiming VAT does
 * not reach the crossover until 11.
 *
 * The constant stays at the nominal figure deliberately: it is the number a
 * reader gets by dividing the two prices printed on /pricing, and a page that
 * showed the ex-VAT figure next to those two prices would look like it could
 * not do arithmetic. No VAT divisor is introduced here — section 14 is
 * explicitly out of scope for now (Lucas: no KOR, files a normal return), and
 * pre-empting it with a rate constant in this file is how two sources of
 * truth start. Revisit if and when VAT handling is built.
 *
 * Neither number decides where the prompt FIRES; that is
 * UPGRADE_TRIGGER_PRODUCTS, and it comes from section 13 rather than from this
 * sum. See FLAGS.md · lxxxv. It is worth noting the trigger (12) now fires
 * AFTER the nominal break-even (9) rather than before it — a brand that gets
 * the prompt has already been past the "a drop would be cheaper" line for a
 * few products, which the prompt's own wording ("costs less from N products
 * on") still states honestly since N is named, not implied.
 */
export const UPGRADE_BREAK_EVEN = Math.ceil(AMOUNT.fullDrop / TIER0_PRODUCT);

/** The trigger section 13 specifies for the upgrade prompt. */
export const UPGRADE_TRIGGER_PRODUCTS = 12;

/**
 * Has this brand ordered enough individual products in the window to be told
 * what a Full Drop costs?
 *
 * `>=` rather than `>`. Section 13 says "when a brand crosses 12 individual
 * products in a rolling quarter", which reads both ways; a constant named
 * UPGRADE_TRIGGER_PRODUCTS that fires at thirteen is a bug someone eventually
 * writes, and one product either side of the line changes nothing about whether
 * the sentence is worth sending. FLAGGED, and a one-character change.
 */
export function shouldPromptUpgrade(products) {
  return Number.isInteger(products) && products >= UPGRADE_TRIGGER_PRODUCTS;
}

/**
 * The upgrade prompt itself. One line, in the client's language, or null.
 *
 * IT IS A COMPARISON, NOT A SAVING CLAIM. Section 13's example reads "You've
 * ordered 14 products this quarter. A Full Drop covers 25 for less." At
 * today's prices that sentence happens to be true at drop scope — fourteen
 * products is 14 × €219.98 = €3,079.72, more than €1,850 — but it is still
 * false for a brand that has only been ordering catalog sets: 14 × €89.99 =
 * €1,259.86, under €1,850. Section 13 asks for "factual, no pressure," and a
 * claim that is true for one buying pattern and false for another is not
 * factual for the general case — this follows the standard, because a prompt
 * a client can disprove with a calculator costs more than it earns. See the
 * FLAGGED comment on UPGRADE_BREAK_EVEN above for the full arithmetic.
 *
 * IT MAKES NO CLAIM ABOUT WHAT THEY SPENT, AT ANY COUNT. Saying "less than you
 * spent" would be safe above UPGRADE_BREAK_EVEN — assertLadder() keeps that
 * arithmetic true — but only in the numbers the site prints today. Section 14
 * quotes Tier 1 EXCLUSIVE of VAT and Tier 0 INCLUSIVE, so the like-for-like
 * crossover for a business that reclaims is 23, not 19, and a saving claim made
 * anywhere between the two is wrong for precisely the customer most likely to
 * check it. Naming the crossover is true under both readings, so there is no
 * version of section 14 that can turn this sentence into a lie.
 *
 * Below the trigger it returns null, so a caller has one thing to test rather
 * than a threshold to re-derive.
 */
export function upgradePrompt(products, lang = 'en') {
  if (!shouldPromptUpgrade(products)) return null;
  const price = euro(AMOUNT.fullDrop, lang);
  const band = `${FULL_DROP_MIN}–${FULL_DROP_MAX}`;
  return lang === 'nl'
    ? `Je hebt dit kwartaal ${products} producten besteld. Ter info: een Full Drop dekt ${band} producten voor ${price}, en vanaf ${UPGRADE_BREAK_EVEN} producten is dat goedkoper.`
    : `You've ordered ${products} products this quarter. For reference, a Full Drop covers ${band} products for ${price}, and costs less from ${UPGRADE_BREAK_EVEN} products on.`;
}

/** Brand Model setup is fully creditable across five drops: 5 × €250 = €1,250. */
export const BRAND_MODEL_CREDIT_DROPS = AMOUNT.brandModel / AMOUNT.brandModelCredit;

// ─────────────────────────────────────────────────────────────────────────────
// 5 · BUILD-TIME ASSERTIONS.
//
// These run when Astro imports this module, so a broken ladder fails the build
// instead of shipping. That is the whole point of centralising the numbers: it
// is not enough that they live in one file, the relationships between them have
// to be enforced. Flag 1 in AUDIT-TASK-0.md §H existed precisely because these
// relationships were never checked.
// ─────────────────────────────────────────────────────────────────────────────

function assertLadder() {
  const rungs = [
    ['Tier 0 à la carte, per product', TIER0_PRODUCT],
    ['Drop Pilot, per product', PILOT_PER_PRODUCT],
    [`Full Drop at ${FULL_DROP_MIN} products`, FULL_DROP_PER_PRODUCT_MAX],
    [`Full Drop at ${FULL_DROP_MAX} products`, FULL_DROP_PER_PRODUCT_MIN],
  ];
  for (let i = 1; i < rungs.length; i++) {
    const [prevName, prev] = rungs[i - 1];
    const [name, cur] = rungs[i];
    if (!(cur < prev)) {
      throw new Error(
        `pricing.js: the ladder is inverted. "${name}" costs ${cur.toFixed(2)} ` +
        `per product but "${prevName}" costs ${prev.toFixed(2)} — buying more ` +
        `must always cost less per product, or the packages argue against ` +
        `themselves. See AUDIT-TASK-0.md §H flag 1.`
      );
    }
  }

  // The Brand Model credit must retire the setup fee in a whole number of
  // drops, or "credited against each of your first five drops" is untrue.
  if (!Number.isInteger(BRAND_MODEL_CREDIT_DROPS)) {
    throw new Error(
      `pricing.js: the Brand Model credit (${AMOUNT.brandModelCredit}) does not ` +
      `divide the setup fee (${AMOUNT.brandModel}) into whole drops.`
    );
  }

  // The retainer must cost more than the drop it contains, or it is a discount
  // on nothing.
  if (AMOUNT.retainer <= AMOUNT.fullDrop) {
    throw new Error(
      `pricing.js: the monthly retainer (${AMOUNT.retainer}) does not exceed the ` +
      `Full Drop it includes (${AMOUNT.fullDrop}).`
    );
  }

  // The upgrade prompt names UPGRADE_BREAK_EVEN as the count from which a Full
  // Drop "costs less". That has to be true AT that count and not merely after
  // it: Math.ceil returns the first integer where the drop is cheaper OR EQUAL,
  // and "costs less" is false at equal. It cannot happen at today's numbers —
  // €1,850 / €219.98 is not a whole number — which is exactly why it needs an
  // assertion rather than a reader's confidence. If this fires, the fix is the
  // definition, not the copy.
  if (UPGRADE_BREAK_EVEN * TIER0_PRODUCT <= AMOUNT.fullDrop) {
    throw new Error(
      `pricing.js: the upgrade prompt says a Full Drop costs less from ` +
      `${UPGRADE_BREAK_EVEN} products on, but ${UPGRADE_BREAK_EVEN} products à ` +
      `la carte is ${(UPGRADE_BREAK_EVEN * TIER0_PRODUCT).toFixed(2)}, which does ` +
      `not exceed the Full Drop at ${AMOUNT.fullDrop}. Define UPGRADE_BREAK_EVEN ` +
      `as Math.floor(fullDrop / TIER0_PRODUCT) + 1, and do not soften the copy.`
    );
  }

  // Tier 0 must never be the expensive door for a whole drop's worth of work.
  if (TIER0_PRODUCT * FULL_DROP_MIN <= AMOUNT.fullDrop) {
    throw new Error(
      `pricing.js: buying ${FULL_DROP_MIN} products à la carte costs ` +
      `${(TIER0_PRODUCT * FULL_DROP_MIN).toFixed(2)}, which is not more than the ` +
      `Full Drop at ${AMOUNT.fullDrop}. The drop has to be the cheaper door.`
    );
  }
}

assertLadder();

// ─────────────────────────────────────────────────────────────────────────────
// 6 · THE PACKAGES — Tier 1.
//
// The last bullet of each attended package reads from aftercare() rather than
// being typed. It used to say "Revision rounds included" — a countable
// entitlement, and the last one left on the site after section 3 removed the
// count from the tier model. A package's inclusions and the tier it belongs to
// are now the same sentence, so they cannot drift apart again.
//
// The timing bullet is the same principle, applied late: it was typed out four
// times ("A reserved 48-hour window, confirmed before you pay" ×2, its Dutch
// twin ×2) while turnaround() sat twenty lines up documented as "Pages use
// this, never a literal." The count bullet was worse — `products:
// PILOT_PRODUCTS` and `'Exactly 8 products'` on the SAME object, twenty lines
// above a Full Drop that does it correctly with `${FULL_DROP_MIN}–…`. Both are
// now derived. What remains typed here is prose that reads a number as a word
// ("Eight products, one committed window"), which check_promises.py holds to
// PILOT_PRODUCTS from the outside.
// ─────────────────────────────────────────────────────────────────────────────

export const PACKAGES = {
  en: [
    {
      id: 'pilot',
      tier: 'attended',
      name: 'Drop Pilot',
      price: euro(AMOUNT.dropPilot, 'en'),
      unit: 'once per brand',
      products: PILOT_PRODUCTS,
      line: 'Eight products, one committed window. The way to find out what we do with your line before you hand us the whole thing.',
      // "Once per brand" is structural, not a marketing flourish: it is what
      // stops the Pilot being a cheaper per-product substitute for the Full
      // Drop bought repeatedly. Parallel to the existing one-test-sample-per-
      // business rule, so the site already sets this expectation.
      onceOnly: true,
      includes: [
        `Exactly ${PILOT_PRODUCTS} products`,
        'Catalog set and lifestyle carousel for each',
        turnaround('attended', 'en'),
        'Client portal, approve or request a revision per image',
        aftercare('attended', 'en'),
      ],
    },
    {
      id: 'full-drop',
      tier: 'attended',
      name: 'Full Drop',
      price: euro(AMOUNT.fullDrop, 'en'),
      unit: 'per drop',
      products: [FULL_DROP_MIN, FULL_DROP_MAX],
      line: 'One drop. One deadline. One invoice.',
      includes: [
        `${FULL_DROP_MIN}–${FULL_DROP_MAX} products`,
        'Catalog set and lifestyle carousel for each',
        turnaround('attended', 'en'),
        'Client portal, approve or request a revision per image',
        aftercare('attended', 'en'),
        `Video clips at ${euro(AMOUNT.video, 'en')} each, added to any drop`,
      ],
    },
    {
      id: 'brand-model',
      tier: 'attended',
      name: 'Your Brand Model',
      price: euro(AMOUNT.brandModel, 'en'),
      unit: 'one-time setup',
      line: 'One face. Every drop. Only yours.',
      // `creditLine` used to sit here: "€250 credited against each of your
      // first 5 drops — the setup pays itself back." It was rendered in
      // exactly one place, /pricing, and task #246 is about that page asking
      // to be read rather than looked at. The clause after the dash was a sum
      // the reader had to do in their head — 250 × 5 against a setup price two
      // lines above — so FigPayback draws the sum, and the clause before the
      // dash became that figure's run label. Nothing was dropped; one sentence
      // stopped being a sentence. The credit itself is still stated in
      // `includes` below, which is what /custom-models prints.
      includes: [
        'A model built for your brand, used by no one else',
        'Consistent across every product and every drop',
        `${euro(AMOUNT.brandModelCredit, 'en')} back on each of your first ${BRAND_MODEL_CREDIT_DROPS} drops`,
        'Kept current as your line changes',
      ],
    },
    {
      id: 'retainer',
      tier: 'attended',
      name: 'Studio retainer',
      price: euro(AMOUNT.retainer, 'en'),
      unit: 'per month',
      line: 'The studio, on standing order.',
      // PROPOSED, NOT BRIEFED. The brief gives the price and the name but never
      // defines what a retainer includes. These inclusions are a proposal and
      // are flagged as such to the user; if they change, they change here only.
      proposed: true,
      includes: [
        'One Full Drop every month',
        'Your Brand Model included and kept current',
        'First position in the capacity queue',
        aftercare('attended', 'en'),
      ],
    },
  ],
  nl: [
    {
      id: 'pilot',
      tier: 'attended',
      name: 'Drop Pilot',
      price: euro(AMOUNT.dropPilot, 'nl'),
      unit: 'eenmalig per merk',
      products: PILOT_PRODUCTS,
      line: 'Acht producten, één vastgelegd venster. Zo ontdek je wat we met jouw lijn doen voordat je ons de hele collectie geeft.',
      onceOnly: true,
      includes: [
        `Precies ${PILOT_PRODUCTS} producten`,
        'Catalogset en lifestyle-carousel voor elk product',
        turnaround('attended', 'nl'),
        'Klantportaal, per beeld goedkeuren of een revisie aanvragen',
        aftercare('attended', 'nl'),
      ],
    },
    {
      id: 'full-drop',
      tier: 'attended',
      name: 'Full Drop',
      price: euro(AMOUNT.fullDrop, 'nl'),
      unit: 'per drop',
      products: [FULL_DROP_MIN, FULL_DROP_MAX],
      line: 'Eén drop. Eén deadline. Eén factuur.',
      includes: [
        `${FULL_DROP_MIN}–${FULL_DROP_MAX} producten`,
        'Catalogset en lifestyle-carousel voor elk product',
        turnaround('attended', 'nl'),
        'Klantportaal, per beeld goedkeuren of een revisie aanvragen',
        aftercare('attended', 'nl'),
        `Videoclips voor ${euro(AMOUNT.video, 'nl')} per stuk, toe te voegen aan elke drop`,
      ],
    },
    {
      id: 'brand-model',
      tier: 'attended',
      name: 'Jouw merkmodel',
      price: euro(AMOUNT.brandModel, 'nl'),
      unit: 'eenmalige setup',
      line: 'Eén gezicht. Elke drop. Alleen van jou.',
      // `creditLine` — zie de EN-tak hierboven. Beide talen verliezen dezelfde
      // zin op hetzelfde moment, want de tekening spreekt geen van beide.
      includes: [
        'Een model gebouwd voor jouw merk, door niemand anders gebruikt',
        'Consistent op elk product en in elke drop',
        `${euro(AMOUNT.brandModelCredit, 'nl')} terug op elk van je eerste ${BRAND_MODEL_CREDIT_DROPS} drops`,
        'Bijgehouden terwijl je lijn verandert',
      ],
    },
    {
      id: 'retainer',
      tier: 'attended',
      name: 'Studio-retainer',
      price: euro(AMOUNT.retainer, 'nl'),
      unit: 'per maand',
      line: 'De studio, op vaste afspraak.',
      proposed: true,
      includes: [
        'Elke maand één Full Drop',
        'Jouw merkmodel inbegrepen en bijgehouden',
        'Eerste plaats in de capaciteitswachtrij',
        aftercare('attended', 'nl'),
      ],
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// 7 · PER-PRODUCT — Tier 0.
//
// Section 13: this block lives on /pricing (bottom), on /catalog, /lifestyle
// and /video, and is reachable from /start step 1 as "a single product." It
// must NOT appear on the homepage, in the nav, or in any hero.
// ─────────────────────────────────────────────────────────────────────────────

export const PER_PRODUCT = {
  en: [
    { id: 'catalog', tier: 'unattended', name: 'Catalog set', price: euro(AMOUNT.catalog, 'en'), unit: 'per product', line: 'Four photos: front, back, a fabric or logo close-up, and one on-model shot.' },
    { id: 'lifestyle', tier: 'unattended', name: 'Lifestyle carousel', price: euro(AMOUNT.lifestyle, 'en'), unit: 'per product', line: 'Three photos of one product in one styled look — a carousel ready to post.' },
    { id: 'video', tier: 'unattended', name: 'Video clip', price: euro(AMOUNT.video, 'en'), unit: 'per clip', line: 'One short clip. The same rate on its own or added to a drop.' },
  ],
  nl: [
    { id: 'catalog', tier: 'unattended', name: 'Catalogset', price: euro(AMOUNT.catalog, 'nl'), unit: 'per product', line: 'Vier foto’s: voorkant, achterkant, een stof- of logodetail, en één on-model shot.' },
    { id: 'lifestyle', tier: 'unattended', name: 'Lifestyle-carousel', price: euro(AMOUNT.lifestyle, 'nl'), unit: 'per product', line: 'Drie foto’s van één product in één gestylede look — een carousel klaar om te posten.' },
    { id: 'video', tier: 'unattended', name: 'Videoclip', price: euro(AMOUNT.video, 'nl'), unit: 'per clip', line: 'Eén korte clip. Dezelfde prijs los of toegevoegd aan een drop.' },
  ],
};

/**
 * One Tier 0 line item by id, in one call — the same shape as reviewClaim()
 * and turnaround() above, and for the same reason.
 *
 * The alternative at the call site is `PER_PRODUCT[lang].find(p => p.id === x)`,
 * which is typed `T | undefined` and so needs a `!` on every use; six page
 * wrappers each carrying a non-null assertion is six places a rename fails
 * silently under a type-checker and loudly at render. This throws with the id
 * that was asked for instead.
 *
 * Called from page frontmatter, never at module scope — PER_PRODUCT is a const
 * declared above, so a top-level call from assertLadder() would hit its TDZ.
 */
export function perProduct(id, lang = 'en') {
  const list = PER_PRODUCT[lang] || PER_PRODUCT.en;
  const item = list.find((p) => p.id === id);
  if (!item) throw new Error(`pricing.js: unknown per-product id "${id}"`);
  return item;
}

export const TEST_SAMPLE = {
  en: { name: 'Test sample', price: euro(AMOUNT.testSample, 'en'), unit: 'one per business', line: 'See it on your own product first.' },
  nl: { name: 'Proefvisual', price: euro(AMOUNT.testSample, 'nl'), unit: 'één per bedrijf', line: 'Zie het eerst op je eigen product.' },
};

// ─────────────────────────────────────────────────────────────────────────────
// 8 · THE ANCHOR — what a full-day production costs.
//
// FLAGGED (AUDIT-TASK-0.md §H flag 2): this range is the brief's figure and is
// not sourced. It is presented as the cost of a full DAY of production with
// every line counted, not as "what a shoot costs", and it is itemised by
// category. No per-line euro figures are invented — the brief's standing rule
// is never to invent metrics, and a made-up "photographer: €600" would be one.
// ─────────────────────────────────────────────────────────────────────────────

export const SHOOT_DAY = {
  en: {
    range: euroRange(AMOUNT.shootDayLow, AMOUNT.shootDayHigh, 'en'),
    basis: 'A full production day, everything counted',
    items: ['Photographer', 'Studio or location', 'Model', 'Styling', 'Retouching', 'Your own day'],
    caveat: 'Ranges widely by city, by studio and by how much of it you do yourself.',
  },
  nl: {
    range: euroRange(AMOUNT.shootDayLow, AMOUNT.shootDayHigh, 'nl'),
    basis: 'Een volledige productiedag, alles meegerekend',
    items: ['Fotograaf', 'Studio of locatie', 'Model', 'Styling', 'Retouche', 'Je eigen dag'],
    caveat: 'Loopt sterk uiteen per stad, per studio en per hoeveel je zelf doet.',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 9 · THE ACCESSOR — what pages import.
// ─────────────────────────────────────────────────────────────────────────────

export function getPricing(lang = 'en') {
  const l = lang === 'nl' ? 'nl' : 'en';
  return {
    lang: l,
    packages: PACKAGES[l],
    perProduct: PER_PRODUCT[l],
    testSample: TEST_SAMPLE[l],
    shootDay: SHOOT_DAY[l],
    tiers: TIERS,
    review: (tierId) => reviewClaim(tierId, l),
    turnaround: (tierId) => turnaround(tierId, l),
    aftercare: (tierId) => aftercare(tierId, l),
    euro: (n) => euro(n, l),
  };
}

export default getPricing;
