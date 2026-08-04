// VISUAILS — the question we ask about a product, beyond its photos.
//
// ONE FIELD, AND THAT IS LUCAS'S CALL
// He asked for material ("100% cotton, cow leather, 100% polyester") and for
// research into what else was worth asking. Presented with the research he
// chose the smallest version: material only, nothing else per product. That
// decision is deliberate and this file should not grow back without him saying
// so — the reasoning for the rejected fields is kept below so the argument does
// not have to be had twice.
//
//   · MATERIAL, but the weave-and-finish word rather than the percentages.
//     A study of digital fabrics found specular roughness — matte against
//     glossy — was the one parameter that significantly changes perceived
//     sheen, colour and lightness. Meanwhile Image2Garment shows a photograph
//     already gives up the material FAMILY reliably while missing the
//     percentages by ~19% on average. So "washed cotton twill, matte" changes
//     the render; "98% cotton, 2% elastane" changes nothing a viewer can see.
//     The field asks for the first and does not ask for the second — which is
//     why its placeholder and datalist are written the way they are.
//
// WHAT WAS OFFERED AND DECLINED, so nobody re-adds it on instinct:
//   · FIT, as a dropdown. Without fit conditioning generators fall back to an
//     averaged fit — the FitVTON ablation moved its fitting score 3.08 → 2.87
//     when fit supervision came out. Real but modest, and the worn photo in
//     shots.js carries the same information when a customer sends one.
//   · WHAT MUST NOT MOVE — a print or logo that migrates. The expensive
//     failure, but it lands in the free "anything we should know" textarea in
//     step 3 rather than as a field on all thirty cards.
//
// WHAT THE RESEARCH SAID TO LEAVE OUT REGARDLESS:
//   · A HEX CODE for the garment colour. A controlled test measured ΔE 11.25
//     when the target colour arrived as a hex in text against ΔE 0.90 when it
//     arrived as a reference image — twelve times worse. The photograph the
//     customer already uploaded IS the swatch. A hex field would cost them
//     time AND make the output worse, which is a rare combination.
//   · GARMENT CATEGORY. Try-on pipelines detect tops/bottoms/one-pieces
//     themselves.
//   · GSM, WEIGHT, STRETCH, THICKNESS. The same fabric study found sheen did
//     not influence perceived thickness or stretch — these are not carried by
//     a still image in either direction, so knowing them changes nothing.
//   · HARDWARE AND TRIM COLOUR. It is in the detail photo.
//
// IT IS OPTIONAL, at Lucas's direction, and it says what answering buys rather
// than being marked "recommended". The pattern matches the photo slots in
// shots.js: a customer who knows what skipping costs can make the trade
// themselves, and nagging is not a trade.
//
// THE MULTIPLIER IS WHY THIS STAYS AT ONE. A field per product times thirty
// products is thirty units of friction, so anything that can be asked once per
// ORDER is asked once per order — see ORDER_QUESTIONS at the bottom.
//
// The array shape is kept even at length one: every consumer generates its
// markup, its wire format and its validation by iterating it, so a second
// question is a data edit rather than a UI change.

/** Asked once per product, in this order. `id` is the posted field name. */
export const PRODUCT_QUESTIONS = [
  {
    id: 'material',
    type: 'text',
    maxLength: 80,
    name: { en: 'What is it made of?', nl: 'Waar is het van gemaakt?' },
    placeholder: {
      en: 'washed cotton twill, matte',
      nl: 'gewassen katoenen twill, mat',
    },
    buys: {
      en: 'How the fabric falls and catches light. Matte against glossy is the single biggest lever on how real the result looks — the weave and the finish matter here, the percentages do not.',
      nl: 'Hoe de stof valt en licht vangt. Mat tegenover glanzend is verreweg de grootste hefboom op hoe echt het resultaat oogt — het weefsel en de afwerking tellen hier, de percentages niet.',
    },
    // Not a closed list — a browser datalist, so it suggests without refusing.
    // Leather and denim are in it because they are the two that behave least
    // like the default cotton assumption.
    examples: {
      en: ['cotton jersey', 'washed cotton twill, matte', 'heavy fleece', 'denim, rigid',
           'cow leather, matte', 'satin polyester, glossy', 'ribbed knit', 'linen'],
      nl: ['katoenen jersey', 'gewassen katoenen twill, mat', 'zware fleece', 'denim, stug',
           'runderleer, mat', 'satijn polyester, glanzend', 'geribde tricot', 'linnen'],
    },
  },
];

export const PRODUCT_QUESTION_IDS = PRODUCT_QUESTIONS.map((q) => q.id);

/** Is this a field we are willing to store against a product? */
export function isProductQuestionId(id) {
  return typeof id === 'string' && PRODUCT_QUESTION_IDS.includes(id);
}

export function productQuestion(id) {
  return PRODUCT_QUESTIONS.find((q) => q.id === id);
}

/**
 * Asked once for the whole order.
 *
 * ONE QUESTION, NOT FOUR, and the reasoning is worth keeping. The research put
 * three things at order level: who the product is for, a few reference images,
 * and what the brand never does. Step 3 of this flow ALREADY carries a free
 * "anything we should know" textarea whose hint mentions the look and a
 * reference — so two of the three have a home, they are just not being asked
 * for by name.
 *
 * Adding three labelled fields beside an open one would be four boxes covering
 * the same ground, which is the bloat this flow keeps being trimmed of. So:
 * one new field for the thing the textarea genuinely does not prompt — who
 * wears this, which drives model casting and styling across every product in
 * the order — and the textarea's own hint does the rest.
 */
export const ORDER_QUESTIONS = [
  {
    id: 'audience',
    type: 'text',
    maxLength: 120,
    name: { en: 'Who wears this?', nl: 'Wie draagt dit?' },
    placeholder: {
      en: 'men, 20–30, skate and streetwear',
      nl: 'mannen, 20–30, skate en streetwear',
    },
    buys: {
      en: 'Which model we cast and how the scenes are styled — one answer that steers every product in the order.',
      nl: 'Welk model we kiezen en hoe de scènes gestyled worden — één antwoord dat elk product in de bestelling stuurt.',
    },
  },
];

export const ORDER_QUESTION_IDS = ORDER_QUESTIONS.map((q) => q.id);

export const COPY = {
  en: {
    aboutH: 'About the product',
    aboutLead: 'One optional question. It says what answering buys — skip it if it does not apply.',
    whatItBuys: 'What this buys',
    optional: 'Optional',
    sameForAll: 'Same for every product?',
    sameForAllHint: 'Fill the first product, then copy it down the list.',
    copyDown: 'Copy to all products',
    copied: 'Copied to {n} products',
    copiedOne: 'Copied to 1 product',
  },
  nl: {
    aboutH: 'Over het product',
    aboutLead: 'Eén optionele vraag. Erbij staat wat invullen oplevert — sla ’m over als het niet van toepassing is.',
    whatItBuys: 'Wat dit oplevert',
    optional: 'Optioneel',
    sameForAll: 'Voor elk product hetzelfde?',
    sameForAllHint: 'Vul het eerste product in en kopieer het naar de rest.',
    copyDown: 'Kopieer naar alle producten',
    copied: 'Gekopieerd naar {n} producten',
    copiedOne: 'Gekopieerd naar 1 product',
  },
};

export function copy(lang = 'en') {
  return COPY[lang === 'nl' ? 'nl' : 'en'];
}
