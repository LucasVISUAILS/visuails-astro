// VISUAILS — what each service is called, in words, in one place. August 2026.
//
// WHY THIS FILE EXISTS. The same map lived twice: `const SERVICE` in
// src/lib/account.js and again in src/lib/portal.js, six identical keys each.
// Both copies carried the same comment recording the same bug — 'drop' was
// missing from both, so every Full Drop order showed no service name at all,
// in the portal AND in the account dashboard, and it had to be found twice and
// fixed twice in the same audit pass. That comment is the argument for this
// file: a map that has to be repaired in two places is a map that will be
// repaired in one.
//
// The third caller is the one that started this. functions/api/order.js had no
// map at all and printed the raw column value, so an order confirmation said
// "we hebben je catalog-aanvraag ontvangen" and the summary table read
// "Dienst: catalog" — a slug, lowercase, in the first message a paying customer
// gets. Adding a third private copy to fix that is how the second one happened.
//
// 'test-sample' reads its name from TEST_SAMPLE rather than restating it, which
// is what portal.js already did; account.js had typed the same two words by
// hand and happened to match.
//
// THE MISSING-KEY RULE, kept from portal.js's own comment: serviceLabel()
// returns null for a service it does not know, and callers fall back to
// whatever they were going to show anyway. It does not invent a label from the
// slug — a made-up name in a customer's order confirmation is worse than a
// blank, because a blank is visibly missing and a guess is not. The real fix
// for a missing key is to add it here.

import { TEST_SAMPLE } from './pricing.js';

export const SERVICE = {
  catalog: { en: 'Catalog', nl: 'Catalog' },
  lifestyle: { en: 'Lifestyle', nl: 'Lifestyle' },
  video: { en: 'Video', nl: 'Video' },
  custom: { en: 'Your Brand Model', nl: 'Jouw merkmodel' },
  'test-sample': { en: TEST_SAMPLE.en.name, nl: TEST_SAMPLE.nl.name },
  // ORDER_SERVICES in functions/api/order.js has always included 'drop' — the
  // value StartPage.astro's attended-tier door posts. One label covers both the
  // fixed 8-product Drop Pilot and a larger custom drop, which pricing.js
  // already treats as one tier rather than two services.
  drop: { en: 'Full Drop', nl: 'Volledige drop' },
};

/** @param {string} service @param {'en'|'nl'} lang @returns {string|null} */
export function serviceLabel(service, lang) {
  const s = SERVICE[service];
  return s ? s[lang] || s.en : null;
}
