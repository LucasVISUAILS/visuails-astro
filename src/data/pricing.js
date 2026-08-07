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

// ─────────────────────────────────────────────────────────────────────────────
// 0 · THE LADDER, THE PLANS, AND VAT — the model, August 2026.
//
// WHAT CHANGED AND WHY. Until now the offer was package-shaped: a Drop Pilot of
// exactly 8 products, a Full Drop of 25–30, and per-product rates for anything
// else. Lucas called it confusing, and so did people he showed it to, and the
// numbers agreed with them:
//
//   · "Drop" already means something in fashion — a collection going live. The
//     site used it for a work order of 25–30 products, so one word carried two
//     meanings in the same sentence.
//   · The buyer had to pick a SIZE and a SERVICE LEVEL at the same time. Two
//     independent axes stacked on one price list.
//   · And there was a hole between them. The Pilot stopped at 8, the Full Drop
//     started at 25, so a brand with 14 products paid à la carte —
//     14 × €219.98 = €3,079.72, twelve hundred euro MORE than a Full Drop of
//     thirty. /pricing admitted this in its own copy. A ladder whose best
//     advice is "pretend you have 25 products" is not a ladder.
//
// THE REPLACEMENT is two doors rather than three tiers, and it is the hybrid
// Lucas picked out of PRICING-MODEL-OPTIONS.md:
//
//   Front door — LADDER. One unit: a product. One rate, which falls as the
//   count rises. Every count has a price and the price only ever improves, so
//   the hole cannot come back. The falling rate is also the honest upsell: the
//   order form can say "two more products and every product drops a rung."
//
//   Back door — PLANS. A monthly amount for a monthly output. Every plan is
//   priced strictly below the ladder total for the same number of products
//   (asserted at the bottom of this file), so the upgrade prompt is arithmetic
//   rather than persuasion.
//
// The old drop constants below are DERIVED from this ladder now rather than
// typed, so the pages that have not been migrated yet keep printing numbers
// that are arithmetically true while they wait their turn.
// ─────────────────────────────────────────────────────────────────────────────

// Rungs are [minProducts, maxProducts | null, ratePerProduct]. `null` is the
// open top rung. Three kinds, and the ratio between them is deliberate: catalog
// -only is 60% of a complete product and lifestyle-only is 75%, so buying both
// separately costs about 135% of the bundle. That bundle saving is roughly the
// same at every rung, which is what makes it explainable in one sentence
// instead of a table of exceptions.
//
// "ROUGHLY", AND THE ONE PLACE IT IS DELIBERATELY OFF. Lucas, August 2026: "ik
// vind de 112 euro voor lifestyle een rare prijs, maak dit 109." He is right
// about what it was: 149 x 0.75 = 111.75, rounded to 112 — a number that is
// visibly the OUTPUT of a formula rather than a price somebody chose, on the
// entry rung, which is the one a first-time buyer reads. 109 is 73.2% of the
// complete rate rather than 75%, so the entry rung's bundle saving is 33% where
// the others are 35%. That difference is not published anywhere and costs the
// customer nothing — it makes the first rung slightly cheaper, never dearer.
//
// The ratio still generates the other rungs; it is a tool for deriving prices,
// not a law the prices must obey. Where a derived figure looks like arithmetic
// showing through, the chosen number wins. Every rung remains strictly falling,
// which is the property assertLadder() actually enforces.
export const LADDER = {
  // Catalog set AND lifestyle carousel — seven finished images per product.
  complete: [[1, 4, 149], [5, 9, 109], [10, 19, 85], [20, 34, 65], [35, null, 55]],
  // Catalog set only — four images.
  catalog: [[1, 4, 89], [5, 9, 65], [10, 19, 51], [20, 34, 39], [35, null, 33]],
  // Lifestyle carousel only — three images.
  lifestyle: [[1, 4, 109], [5, 9, 82], [10, 19, 64], [20, 34, 49], [35, null, 41]],
};

/** The per-product rate for a kind at a given product count. */
export function ladderRate(kind, products = 1) {
  const rungs = LADDER[kind];
  if (!rungs) throw new Error(`pricing.js: unknown ladder kind "${kind}"`);
  const n = Math.max(1, Math.floor(Number(products) || 1));
  const rung = rungs.find(([lo, hi]) => n >= lo && (hi === null || n <= hi));
  // Unreachable while the top rung is open-ended; thrown rather than defaulted
  // because a silent fallback here would quote the wrong price, not no price.
  if (!rung) throw new Error(`pricing.js: no ladder rung covers ${n} products`);
  return rung[2];
}

/** What `products` of `kind` cost in total, before VAT and before any discount. */
export function ladderTotal(kind, products) {
  const n = Math.max(0, Math.floor(Number(products) || 0));
  return n === 0 ? 0 : n * ladderRate(kind, n);
}

/** The lowest rate a kind ever reaches — what "from €x" means on a page. */
export function ladderFloor(kind) {
  const rungs = LADDER[kind];
  if (!rungs) throw new Error(`pricing.js: unknown ladder kind "${kind}"`);
  return rungs[rungs.length - 1][2];
}

// FIRST ORDER, once per brand. This replaces the Drop Pilot rather than
// sitting beside it: the Pilot was a loss-leader wearing a package's clothes,
// with a size (exactly 8) and a rule ("once per brand") that both had to be
// explained. A plain percentage off a first order is the same incentive with
// nothing to explain, and it works at every order size instead of one.
export const FIRST_ORDER_DISCOUNT = 0.20;

/** The monthly plans — the back door. Products per month, and what is included. */
export const PLAN_AMOUNT = { starter: 390, studio: 790, brand: 1690 };
export const PLAN_PRODUCTS = { starter: 5, studio: 12, brand: 30 };
/** Video clips included in a plan, per month. */
export const PLAN_CLIPS = { starter: 0, studio: 2, brand: 0 };
/** Minimum term, in months, and how long an unused product rolls over. */
export const PLAN_MIN_MONTHS = 3;
export const PLAN_ROLLOVER_MONTHS = 1;

// WHICH ORDERS GET THE RESERVED WINDOW.
//
// The package model asked the buyer two questions at once: how big is your
// order, and do you want a committed date. Two axes, one price list. Under the
// ladder the service level FOLLOWS the size instead of being a second choice —
// from this many products up, the order is put in the capacity calendar and
// gets the reserved 48-hour window; below it, it runs in the standard queue at
// 2–4 working days. Ten because that is where the ladder's third rung starts,
// so the buyer crosses one line, not two.
export const WINDOW_THRESHOLD = 10;
// TIERS' labels below are template strings evaluated at module load, before the
// export above is in scope from their point of view — so the two read the same
// literal through this one alias rather than a typed 10 in three places.
const WINDOW_THRESHOLD_LABEL = 10;

/** 'attended' | 'unattended' — which tier's promises an order of this size gets. */
export function tierFor(products) {
  return (Math.floor(Number(products) || 0) >= WINDOW_THRESHOLD) ? 'attended' : 'unattended';
}

// ── VAT ──────────────────────────────────────────────────────────────────────
// Dutch VAT, and the interim model Lucas chose (Aug 2026): charge 21% to
// everyone at checkout and correct EU B2B reverse charge afterwards on the
// invoice. BRIEF-14-VAT-BTW.md specifies live VIES validation instead; that is
// deliberately NOT what this implements, and the trade is stated here so the
// next reader does not think it was forgotten. Over-collecting VAT is never a
// penalty; under-collecting is. VIES goes down, has per-member-state quirks,
// and would be half the build.
//
// Every figure in this file is NET. Nothing anywhere should print a price
// without saying which of the two it is — that is BRIEF-14's hardest rule and
// the reason vatLabel() exists rather than a string typed per page.
export const VAT_RATE = 0.21;
export const vatOf = (net) => Math.round(net * VAT_RATE * 100) / 100;
export const withVat = (net) => Math.round(net * (1 + VAT_RATE) * 100) / 100;

// PAGES PRINT NET ONLY. There was a gross figure beside every net one until
// Lucas pointed out the flaw: VAT is not one rate. A French or German buyer is
// charged their own country's rate, so "€1,190 excl. VAT — €1,439.90 incl.
// VAT" is a number that is only true for a Dutch reader, printed to everyone.
// A wrong price shown confidently is worse than no price shown at all.
//
// So `withVat()` and `vatOf()` stay — the checkout still has to compute a real
// amount, and that computation is server-side where the country is known — but
// nothing rendered to a visitor may use them. Every price carries
// vatLabel('excl') and the page states vatNote() once.
/**
 * One sentence on how VAT is handled, said once per page rather than per price.
 *
 * CORRECTED AUGUST 2026, when catalog and lifestyle became payable. This used
 * to promise the rate "of your own country", which describes the model
 * BRIEF-14-VAT-BTW.md specifies and which needs a per-country table plus live
 * VIES validation before a reverse charge may be applied. Neither exists. What
 * the checkout actually does — Lucas's own interim model, confirmed again when
 * payments were switched on — is charge 21% to everybody and settle the reverse
 * charge afterwards on the invoice.
 *
 * A sentence promising a local rate above a checkout that charges 21% is a
 * discrepancy the customer finds at the worst possible moment, so the sentence
 * moved to match the behaviour rather than the other way round. When the
 * per-country model is built, this is the line that changes back — and
 * src/lib/quote.js's VAT_RATE is the other half.
 */
export function vatNote(lang = 'en') {
  return lang === 'nl'
    ? 'Alle bedragen zijn excl. btw. Bij het afrekenen wordt 21% btw toegevoegd. Ben je een EU-bedrijf buiten Nederland met een geldig btw-nummer, geef het door — dan wordt de verlegging op je factuur rechtgezet.'
    : 'All figures are excl. VAT. 21% VAT is added at checkout. If you are an EU business outside the Netherlands with a valid VAT number, give it to us and the reverse charge is settled on your invoice.';
}

/** "excl. VAT" / "incl. VAT", in the reader's language. Never typed on a page. */
export function vatLabel(kind = 'excl', lang = 'en') {
  const nl = lang === 'nl';
  if (kind === 'incl') return nl ? 'incl. btw' : 'incl. VAT';
  if (kind === 'rate') return nl ? '21% btw' : '21% VAT';
  return nl ? 'excl. btw' : 'excl. VAT';
}

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
  // THE ENTRY RUNG, not a flat rate any more. A page that prints one number for
  // "a catalog set" is now printing what ONE costs; the rate falls from here as
  // the count rises (LADDER above). Pages that can show the whole ladder should
  // — ladderRate() / ladderTotal() / ladderFloor() are for exactly that — and
  // any page still printing a single figure should say "from".
  catalog: LADDER.catalog[0][2],       // €89 at 1–4 products, €33 at 35+
  lifestyle: LADDER.lifestyle[0][2],   // €109 at 1–4 products, €41 at 35+
  complete: LADDER.complete[0][2],     // €149 at 1–4 products, €55 at 35+
  // RAISED, TASK #271f, 2026-07-30. Was €49, "left alone" by the comment
  // above — that held until Lucas asked for the opposite: video must rise
  // above €49 regardless of the Single Product/Full outfit feature this task
  // also adds ("video moet sowieso duurder worden dan €49"), and the exact
  // figure was explicitly delegated to me ("bedenk een passende prijs"). €69
  // is that decision, stated here so Lucas can correct it if it's wrong: a
  // clean round number, a ~41% rise, and it keeps the ladder's existing order
  // — video cheapest, then catalog, then lifestyle — so it doesn't disturb the
  // "is the drop the better deal" comparison the block above is protecting.
  // Still priced identically inside or outside a drop, on purpose — see
  // PACKAGES below, which quotes this same AMOUNT.video for a drop's add-on.
  // check_report14.py freezes the OLD figure ('49') against
  // REPORT-SECTION-14-VAT.md's own frozen arithmetic, the same treatment
  // CATALOG_AT_WRITING / LIFESTYLE_AT_WRITING already get in that checker —
  // updated alongside this change.
  video: 69,

  // The three package amounts that used to sit here — dropPilot, fullDrop and
  // retainer — are gone. They were kept as ladder-derived values through the
  // migration so unmigrated pages kept printing arithmetically true numbers;
  // every one of those pages has since moved, and the last two consumers
  // (functions/admin/debug-mollie.js, src/data/capacity.js) now read the
  // ladder and WINDOW_THRESHOLD directly.
  brandModel: 1250, // one-time setup
  brandModelCredit: 250, // credited against each of your first five drops
  retainer: PLAN_AMOUNT.brand,  // the top monthly plan

  // The anchor VISUAILS is measured against.
  shootDayLow: 2500,
  shootDayHigh: 8000,
};

// Drop Pilot is a fixed count, not a range.


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



// A drop product includes the catalog set AND the lifestyle carousel. This is
// the resolution to flag 1 in AUDIT-TASK-0.md §H: without it, a drop is simply
// a more expensive way to buy the same catalog sets that sit in the Tier 0
// block on the same page. Video is NOT included — it is an add-on at the same
// rate inside or outside a drop, which is what makes that rate quotable.


// ─────────────────────────────────────────────────────────────────────────────
// 1b · FULL OUTFIT — task #271f, 2026-07-30.
//
// Lucas: "Ik moet voor alle services een optie hebben: Single Product/Full
// outfit" — a shot can show one product, or several products styled together
// on the same model (e.g. trousers and a t-shirt worn together), and the
// second is real extra work for him, so it has to cost more than the first.
//
// THREE STRUCTURAL DECISIONS, ALL LUCAS'S OWN, FROM TWO ROUNDS OF QUESTIONS:
//   1. Applies to BOTH tiers — Tier 0 (per product) and Tier 1 (drops) — not
//      just one. "Beide."
//   2. Priced as a FLAT SURCHARGE PER SHOT, not a percentage of the order and
//      not a separate line item with its own base price. "Vaste toeslag per
//      shot."
//   3. Capped at 3 products per order. "Max 3 producten." Past that point it
//      is no longer "a couple of pieces styled together" and belongs in a
//      conversation, the same reasoning FULL_DROP_MIN/MAX already applies to
//      "more than a form can hold."
//
// €50 is Lucas's own figure too (confirmed against catalog €139.99 = 89.99 +
// 50, and lifestyle €179.99 = 129.99 + 50). Applied the same way to video —
// video's outfit price is AMOUNT.video + OUTFIT_SURCHARGE, following the same
// "priced the same as every other style" rule the AMOUNT.video comment above
// states for the base rate.
export const OUTFIT_SURCHARGE = 50;
export const MAX_OUTFIT_PRODUCTS = 3;

// ─────────────────────────────────────────────────────────────────────────────
// 1c · EXTRA PHOTOS PER PRODUCT — August 2026.
//
// Lucas: "de mogelijkheid tot extra fotos voor hetzelfde product. Klanten
// dienen zelf aan te geven wat voor beeld het moet worden e.g. close up foto
// van model zonder gezicht."
//
// So this is not a fifth angle on the standard list — it is a described,
// one-off frame the customer asks for in their own words. That difference is
// the whole pricing argument, and it cuts both ways:
//   · It costs MORE attention per image than a set photo, which is templated.
//     Somebody has to read the sentence, decide what it means, and quite often
//     go a round on it. €35 at the entry rung against the set's implied
//     €22.25 (€89 for four) is that gap, stated.
//   · It costs LESS than a full outfit shot at €50, which carries a fit check
//     ACROSS several garments. One extra angle of one product does not.
//
// IT FOLLOWS THE LADDER — LUCAS'S CALL, AGAINST MY RECOMMENDATION, AND THE
// CONSEQUENCE IS RECORDED HERE RATHER THAN ARGUED AGAIN. I proposed a flat
// rate on the OUTFIT_SURCHARGE model, because the reason the ladder falls is
// that templated work amortises over a run and a per-image description does
// not: at the bottom rung an extra photo earns €13 while costing more studio
// time than a €8.25 set image. Lucas chose the ladder anyway, for consistency
// with what the customer already sees. That is a legitimate trade — one price
// story instead of three — and this comment exists so the margin shape is
// visible if it ever needs revisiting, not to relitigate it.
//
// THE RUNGS ARE DERIVED, NOT INVENTED. Each is LADDER.catalog's rung as a
// fraction of its own entry rate, applied to €35 and rounded to whole euros:
//   89→1.000×35 = 35 · 65→0.730×35 = 25.6 → 26 · 51→0.573×35 = 20.1 → 20
//   39→0.438×35 = 15.3 → 15 · 33→0.371×35 = 13.0 → 13
// Written out rather than computed at runtime so the numbers on the page are
// the numbers in this file, and asserted below so a rounding change cannot
// quietly break the fall.
export const EXTRA_PHOTO_LADDER = [[1, 4, 35], [5, 9, 26], [10, 19, 20], [20, 34, 15], [35, null, 13]];

// Past four extra frames on one product it is no longer "one more angle", it
// is a second brief — the same reasoning MAX_OUTFIT_PRODUCTS applies to "more
// than a form can hold".
export const MAX_EXTRA_PER_PRODUCT = 4;

/**
 * The rate for one extra photo, at the order's product count.
 *
 * Keyed on PRODUCTS, not on how many extras were ordered: "follows the ladder"
 * means the customer sees one rung for the whole order, which is the
 * consistency the choice was made for. Pricing extras on their own count would
 * be a second ladder to explain and would reward a customer for piling extras
 * onto one product.
 */
export function extraPhotoRate(products = 1) {
  const n = Math.max(1, Math.floor(Number(products) || 1));
  const rung = EXTRA_PHOTO_LADDER.find(([lo, hi]) => n >= lo && (hi === null || n <= hi));
  if (!rung) throw new Error(`pricing.js: no extra-photo rung covers ${n} products`);
  return rung[2];
}

// The ladder has to FALL and has to line up with the product ladder it was
// derived from, or the page prints two price stories that contradict each
// other. Checked at module load, beside assertLadder()'s own reasoning.
(function assertExtraLadder() {
  const rates = EXTRA_PHOTO_LADDER.map((r) => r[2]);
  for (let i = 1; i < rates.length; i++) {
    if (rates[i] >= rates[i - 1]) {
      throw new Error(`pricing.js: EXTRA_PHOTO_LADDER is not strictly falling at rung ${i} (${rates.join(', ')}).`);
    }
  }
  if (EXTRA_PHOTO_LADDER.length !== LADDER.catalog.length) {
    throw new Error('pricing.js: EXTRA_PHOTO_LADDER must have the same rungs as LADDER.catalog — it is derived from it.');
  }
  EXTRA_PHOTO_LADDER.forEach((r, i) => {
    const [lo, hi] = LADDER.catalog[i];
    if (r[0] !== lo || r[1] !== hi) {
      throw new Error(`pricing.js: EXTRA_PHOTO_LADDER rung ${i} does not span the same products as LADDER.catalog.`);
    }
  });
  // An extra photo must never be cheaper than a set image at the same rung —
  // that is the whole argument for its existence, and an edit to either ladder
  // that inverted it would be selling bespoke work at templated prices.
  EXTRA_PHOTO_LADDER.forEach((r, i) => {
    const perSetImage = LADDER.catalog[i][2] / 4;
    if (r[2] <= perSetImage) {
      throw new Error(
        `pricing.js: an extra photo at €${r[2]} is not dearer than a set image at €${perSetImage.toFixed(2)} `
        + `on rung ${i}. A described one-off costs more attention than a templated angle — see the comment above.`
      );
    }
  });
})();

// Why it costs what it costs, written the way OUTFIT_COPY is: a statement of
// the extra work, not a defence of the price.
export const EXTRA_PHOTO_COPY = {
  en: 'An extra photo is one you describe — a detail from another angle, the product on a model cropped at the neck, a flat-lay for a banner. Because it is written rather than picked from a list, someone reads it, decides what it means and checks the result against what you asked for. That reading is the extra work behind the rate.',
  nl: 'Een extra foto is er een die jij beschrijft — een detail vanuit een andere hoek, het product op een model bijgesneden bij de hals, een flat-lay voor een banner. Omdat het geschreven is in plaats van gekozen uit een lijst, leest iemand het, bepaalt wat het betekent en legt het resultaat naast wat je vroeg. Dat lezen is het extra werk achter het tarief.',
};

// The one thing NOT delegated to me: why it costs more. Lucas was explicit
// that this has to be explained, and explained factually rather than
// defensively ("Leg dit uit maar niet verdedigend") — so this is a statement
// of what the extra work actually is, not a justification offered because the
// price was questioned. Read wherever the outfit choice is offered (the /start
// step 1 field today; a service page is a reasonable next place to reuse it).
export const OUTFIT_COPY = {
  en: 'A full outfit means every product in the shot is checked for fit against the others and matched to how it would really look worn together — not composited separately and placed side by side. That check is the extra work behind the price.',
  nl: 'Een full outfit betekent dat elk product in het shot wordt gecontroleerd op pasvorm ten opzichte van de andere producten, en zo precies mogelijk wordt nagebootst zoals het er in het echt uit zou zien als je het samen draagt — niet los samengesteld en naast elkaar gezet. Die controle is het extra werk achter de prijs.',
};

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
    label: { en: `Under ${WINDOW_THRESHOLD_LABEL} products`, nl: `Onder ${WINDOW_THRESHOLD_LABEL} producten` },
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
    // ELKE BESTELLING GEEFT TOEGANG TOT HET DASHBOARD, sinds augustus 2026.
    //
    // Lucas: *"klant krijgt na elke bestelling (ook test sample van 0,99 cent)
    // toegang tot het klantendashboard."* Deze regel zei nog "download link by
    // email or WhatsApp" en zette daarmee het dashboard neer als iets van de
    // hogere trede — terwijl /account elke bestelling van een klant toont,
    // ongeacht tier, en sinds vandaag met de foto's erbij. De tabel beloofde
    // dus minder dan het product doet, en dat is de vervelendste soort fout:
    // hij kost je verkopen zonder dat iemand klaagt.
    //
    // Het verschil tussen de treden zit niet meer in het dashboard maar in wat
    // je er kunt: hieronder kijken en downloaden, hierboven daarnaast per beeld
    // goedkeuren of een revisie vragen. Dat verschil staat nu in beide kolommen
    // met zoveel woorden.
    delivery: {
      en: 'In your dashboard to view and download, plus a link by email or WhatsApp',
      nl: 'In je dashboard om te bekijken en downloaden, plus een link via e-mail of WhatsApp',
    },
    // The promise is identical to attended's — see the block comment above for
    // why it is a standard rather than a counted entitlement.
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
    label: { en: `From ${WINDOW_THRESHOLD_LABEL} products`, nl: `Vanaf ${WINDOW_THRESHOLD_LABEL} producten` },
    // A committed window, cleared by the capacity gate before it is offered.
    // The site must never print a date the gate has not cleared.
    turnaround: {
      en: 'A reserved 48-hour window, confirmed before you pay',
      nl: 'Een gereserveerd venster van 48 uur, bevestigd voordat je betaalt',
    },
    queue: {
      // Reworded with the model, and the promise is now about SIZE rather than
      // about a product the buyer picked: an order past WINDOW_THRESHOLD holds
      // its slot against anything smaller arriving after it. Same guarantee,
      // stated in the terms the ladder actually uses.
      en: 'Priority in the queue — a booked window is never given up for a later, smaller order',
      nl: 'Voorrang in de wachtrij — een geboekt venster wijkt nooit voor een latere, kleinere bestelling',
    },
    delivery: {
      en: 'Same dashboard, plus per-image approve or request-revision',
      nl: 'Zelfde dashboard, plus per beeld goedkeuren of een revisie vragen',
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
// TIER0_PRODUCT, PILOT_PER_PRODUCT, FULL_DROP_PER_PRODUCT_MIN/MAX and
// UPGRADE_BREAK_EVEN were here, with about eighty lines of comment arguing the
// arithmetic between them. All five were derived from a package price divided
// by a package size, and both halves of every one of those divisions has been
// deleted. What they were FOR — telling a client at what point ordering
// differently is cheaper — is now planSaving() and upgradePrompt(), which
// subtract two figures the client can recompute rather than naming a crossover
// they have to take on trust.

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
  // The plan that would have covered this quarter's rate of ordering, and what
  // the same output costs on the ladder. Both figures are computed, and
  // assertLadder() guarantees the plan is the cheaper of the two — so this is a
  // subtraction the client can repeat, not a claim they have to believe.
  const perMonth = Math.ceil(products / 3);
  const id = planFor(perMonth) || 'brand';
  const s = planSaving(id);
  const name = plans(lang).find((p) => p.id === id)?.name || id;
  const price = euro(PLAN_AMOUNT[id], lang);
  return lang === 'nl'
    ? `Je hebt dit kwartaal ${products} producten besteld — ongeveer ${perMonth} per maand. Het ${name}-plan dekt ${PLAN_PRODUCTS[id]} producten per maand voor ${price}; op losse bestellingen is dat ${euro(s.onLadder, lang)}.`
    : `You've ordered ${products} products this quarter — about ${perMonth} a month. The ${name} plan covers ${PLAN_PRODUCTS[id]} products a month for ${price}; the same output ordered one at a time is ${euro(s.onLadder, lang)}.`;
}

/**
 * A full quote for `products` of `kind`, net / VAT / gross, plus the rate that
 * produced it and the next rung if there is one.
 *
 * ONE function, because the alternative is every page doing its own
 * multiplication — and BRIEF-14's rule is that no price may be printed without
 * saying whether VAT is in it. A page that computes its own total will
 * eventually print one without the label.
 *
 * `firstOrder` applies FIRST_ORDER_DISCOUNT, which is the whole of what used to
 * be the Drop Pilot.
 */
export function quote(kind, products, { firstOrder = false } = {}) {
  const n = Math.max(0, Math.floor(Number(products) || 0));
  const rate = n === 0 ? ladderRate(kind, 1) : ladderRate(kind, n);
  const gross0 = ladderTotal(kind, n);
  const discount = firstOrder ? Math.round(gross0 * FIRST_ORDER_DISCOUNT * 100) / 100 : 0;
  const net = Math.round((gross0 - discount) * 100) / 100;
  // The next rung, so a page can say "two more and every product drops to €65".
  const rungs = LADDER[kind];
  const idx = rungs.findIndex(([lo, hi]) => n >= lo && (hi === null || n <= hi));
  const next = idx >= 0 && idx < rungs.length - 1 ? rungs[idx + 1] : null;
  return {
    products: n,
    rate,
    listTotal: gross0,
    discount,
    net,
    vat: vatOf(net),
    gross: withVat(net),
    nextRung: next ? { at: next[0], rate: next[2], addProducts: Math.max(0, next[0] - n) } : null,
  };
}

/**
 * What a plan would have saved, against the same output bought on the ladder.
 * Returns null when the plan does not win, which cannot happen — assertLadder()
 * fails the build first — but a caller should not have to know that.
 */
export function planSaving(id) {
  if (!(id in PLAN_AMOUNT)) throw new Error(`pricing.js: unknown plan "${id}"`);
  const onLadder = ladderTotal('complete', PLAN_PRODUCTS[id]) + PLAN_CLIPS[id] * AMOUNT.video;
  const saving = Math.round((onLadder - PLAN_AMOUNT[id]) * 100) / 100;
  return saving > 0 ? { onLadder, price: PLAN_AMOUNT[id], saving } : null;
}

/** The cheapest plan that covers this many products a month, or null. */
export function planFor(productsPerMonth) {
  const n = Math.floor(Number(productsPerMonth) || 0);
  const ids = Object.keys(PLAN_PRODUCTS).sort((a, b) => PLAN_PRODUCTS[a] - PLAN_PRODUCTS[b]);
  return ids.find((id) => PLAN_PRODUCTS[id] >= n) || null;
}

/** The plans, as copy. Same shape as PACKAGES so a page can swap one for the other. */
export function plans(lang = 'en') {
  const l = lang === 'nl' ? 'nl' : 'en';
  const nlx = l === 'nl';
  const meta = {
    starter: {
      name: 'Starter',
      line: nlx ? 'Genoeg om elke maand iets nieuws te laten zien.' : 'Enough to have something new to show every month.',
    },
    studio: {
      name: 'Studio',
      line: nlx ? 'Voor merken die continu posten, niet alleen bij een lancering.' : 'For brands posting continuously, not only at a launch.',
    },
    brand: {
      name: nlx ? 'Merk' : 'Brand',
      line: nlx ? 'Een hele collectie per maand, met je eigen gezicht erbij.' : 'A whole collection a month, with your own face on it.',
    },
  };
  return Object.keys(PLAN_AMOUNT).map((id) => {
    const saving = planSaving(id);
    const products = PLAN_PRODUCTS[id];
    const clips = PLAN_CLIPS[id];
    return {
      id,
      name: meta[id].name,
      line: meta[id].line,
      price: euro(PLAN_AMOUNT[id], l),
      unit: nlx ? 'per maand' : 'per month',
      products,
      includes: [
        nlx ? `${products} producten per maand` : `${products} products a month`,
        nlx ? 'Catalogset en lifestyle-carousel voor elk' : 'A catalog set and a lifestyle carousel for each',
        ...(clips ? [nlx ? `${clips} videoclips per maand` : `${clips} video clips a month`] : []),
        ...(id === 'brand' ? [nlx ? 'Je merkmodel inbegrepen' : 'Your Brand Model included'] : []),
        turnaround('attended', l),
        nlx
          ? `Minimaal ${PLAN_MIN_MONTHS} maanden, ongebruikte producten schuiven ${PLAN_ROLLOVER_MONTHS} maand door`
          : `${PLAN_MIN_MONTHS} months minimum, unused products roll over ${PLAN_ROLLOVER_MONTHS} month`,
      ],
      saving: saving
        ? (nlx
            ? `Op de staffel zou dit ${euro(saving.onLadder, l)} kosten — ${euro(saving.saving, l)} per maand verschil.`
            : `The same output on the ladder is ${euro(saving.onLadder, l)} — ${euro(saving.saving, l)} a month more.`)
        : null,
    };
  });
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
  // The package-ladder rungs that used to open this function are gone with the
  // packages: they asserted that Tier 0 per-product > Pilot per-product > Full
  // Drop per-product, an ordering that only meant anything while those three
  // things existed. The ladder's own monotonicity is asserted at the bottom of
  // this function instead, per kind, which is the same guarantee applied to the
  // thing that actually sets prices now.

  // The Brand Model credit must retire the setup fee in a whole number of
  // drops, or "credited against each of your first five drops" is untrue.
  if (!Number.isInteger(BRAND_MODEL_CREDIT_DROPS)) {
    throw new Error(
      `pricing.js: the Brand Model credit (${AMOUNT.brandModelCredit}) does not ` +
      `divide the setup fee (${AMOUNT.brandModel}) into whole drops.`
    );
  }

  // EVERY PLAN MUST BEAT THE LADDER. This replaces the old "the retainer must
  // cost more than the drop it contains" check, which asserted the opposite
  // relationship and fired the moment the plans were priced: under the package
  // model the retainer was a bundle sold ABOVE its contents, and under this one
  // a plan is the cheaper way to buy the same output. That is not a style
  // preference — upgradePrompt() below tells a client, in euros, what a plan
  // would have saved them, and a prompt whose arithmetic a client can disprove
  // with a calculator costs more than it earns. So the saving is asserted at
  // build time rather than trusted.
  for (const id of Object.keys(PLAN_AMOUNT)) {
    const onLadder = ladderTotal('complete', PLAN_PRODUCTS[id]) + PLAN_CLIPS[id] * AMOUNT.video;
    if (!(PLAN_AMOUNT[id] < onLadder)) {
      throw new Error(
        `pricing.js: the ${id} plan costs ${PLAN_AMOUNT[id]} for ` +
        `${PLAN_PRODUCTS[id]} products, which is ${onLadder} on the ladder — a ` +
        `plan that does not beat the ladder is a worse deal wearing a ` +
        `subscription's clothes, and upgradePrompt() would be lying.`
      );
    }
  }

  // The ladder itself has to fall. A rung that costs more per product than the
  // one below it is the exact failure the old package model shipped with (8
  // products at €81.25 against 20 at €92.50), and it is invisible until a
  // prospect divides.
  for (const [kind, rungs] of Object.entries(LADDER)) {
    for (let i = 1; i < rungs.length; i++) {
      if (!(rungs[i][2] < rungs[i - 1][2])) {
        throw new Error(
          `pricing.js: the ${kind} ladder is inverted at rung ${i} — ` +
          `${rungs[i][2]} is not less than ${rungs[i - 1][2]}. Buying more must ` +
          `always cost less per product.`
        );
      }
    }
  }

  // Two assertions about the package crossover were here — that
  // UPGRADE_BREAK_EVEN products à la carte really did cost more than a Full
  // Drop, and that FULL_DROP_MIN products à la carte did too. Both compared a
  // package price against a flat per-product price, and neither of those
  // exists now: the ladder has no crossover to assert because there is nothing
  // to cross over to. What replaced them is the plan check below.

  // EVERY PLAN MUST BEAT THE LADDER. This replaces the old "the retainer must
  // cost more than the drop it contains" check, which asserted the opposite
  // relationship and fired the moment the plans were priced: under the package
  // model the retainer was a bundle sold ABOVE its contents, and under this one
  // a plan is the cheaper way to buy the same output. That is not a style
  // preference — upgradePrompt() below tells a client, in euros, what a plan
  // would have saved them, and a prompt whose arithmetic a client can disprove
  // with a calculator costs more than it earns. So the saving is asserted at
  // build time rather than trusted.
  for (const id of Object.keys(PLAN_AMOUNT)) {
    const onLadder = ladderTotal('complete', PLAN_PRODUCTS[id]) + PLAN_CLIPS[id] * AMOUNT.video;
    if (!(PLAN_AMOUNT[id] < onLadder)) {
      throw new Error(
        `pricing.js: the ${id} plan costs ${PLAN_AMOUNT[id]} for ` +
        `${PLAN_PRODUCTS[id]} products, which is ${onLadder} on the ladder — a ` +
        `plan that does not beat the ladder is a worse deal wearing a ` +
        `subscription's clothes, and upgradePrompt() would be lying.`
      );
    }
  }

  // The ladder itself has to fall. A rung that costs more per product than the
  // one below it is the exact failure the old package model shipped with (8
  // products at €81.25 against 20 at €92.50), and it is invisible until a
  // prospect divides.
  for (const [kind, rungs] of Object.entries(LADDER)) {
    for (let i = 1; i < rungs.length; i++) {
      if (!(rungs[i][2] < rungs[i - 1][2])) {
        throw new Error(
          `pricing.js: the ${kind} ladder is inverted at rung ${i} — ` +
          `${rungs[i][2]} is not less than ${rungs[i - 1][2]}. Buying more must ` +
          `always cost less per product.`
        );
      }
    }
  }

  // Two package-crossover assertions were here — that UPGRADE_BREAK_EVEN
  // products à la carte cost more than a Full Drop, and that FULL_DROP_MIN
  // products did too. Both compared a package price against a flat
  // per-product price, and neither of those things exists now: a ladder has
  // no crossover to assert, because there is nothing on the other side to
  // cross to. The plan check above is what carries that duty now.
}

assertLadder();

// PACKAGES WAS HERE — the Drop Pilot, the Full Drop, the Brand Model and the
// Studio retainer as a bilingual price list, roughly 230 lines of it. It went
// with the package model: nothing had imported it since /pricing,
// /custom-models and schema.js were migrated to the ladder, and a retired
// price list left inside the file that is meant to be the single source of
// truth is worse than no file at all — the next reader finds "Drop Pilot,
// €650, 8 products" written out in full with no way to tell it is a ghost.
// plans() further up is what replaced it.

export const PER_PRODUCT = {
  en: [
    { id: 'catalog', tier: 'unattended', name: 'Catalog set', price: euro(AMOUNT.catalog, 'en'), outfitPrice: euro(AMOUNT.catalog + OUTFIT_SURCHARGE, 'en'), unit: 'per product', line: 'From four photos: front, back, a fabric or logo close-up, and one on-model shot. Add more per product.' },
    { id: 'lifestyle', tier: 'unattended', name: 'Lifestyle carousel', price: euro(AMOUNT.lifestyle, 'en'), outfitPrice: euro(AMOUNT.lifestyle + OUTFIT_SURCHARGE, 'en'), unit: 'per product', line: 'Three photos of one product in one styled look — a carousel ready to post.' },
    { id: 'video', tier: 'unattended', name: 'Video clip', price: euro(AMOUNT.video, 'en'), outfitPrice: euro(AMOUNT.video + OUTFIT_SURCHARGE, 'en'), unit: 'per clip', line: 'One short clip. The same rate on its own or added to a drop.' },
  ],
  nl: [
    { id: 'catalog', tier: 'unattended', name: 'Catalogset', price: euro(AMOUNT.catalog, 'nl'), outfitPrice: euro(AMOUNT.catalog + OUTFIT_SURCHARGE, 'nl'), unit: 'per product', line: 'Vanaf vier foto’s: voorkant, achterkant, een stof- of logodetail, en één on-model shot. Per product bij te bestellen.' },
    { id: 'lifestyle', tier: 'unattended', name: 'Lifestyle-carousel', price: euro(AMOUNT.lifestyle, 'nl'), outfitPrice: euro(AMOUNT.lifestyle + OUTFIT_SURCHARGE, 'nl'), unit: 'per product', line: 'Drie foto’s van één product in één gestylede look — een carousel klaar om te posten.' },
    { id: 'video', tier: 'unattended', name: 'Videoclip', price: euro(AMOUNT.video, 'nl'), outfitPrice: euro(AMOUNT.video + OUTFIT_SURCHARGE, 'nl'), unit: 'per clip', line: 'Eén korte clip. Dezelfde prijs los of toegevoegd aan een drop.' },
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

// getPricing() and `export default getPricing` were here. getPricing() existed
// to bundle PACKAGES and PER_PRODUCT for a caller that never arrived; with
// PACKAGES gone it bundled one thing, and nothing imported either.
