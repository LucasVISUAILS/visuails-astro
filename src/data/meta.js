// VISUAILS — meta description assembly.
//
// The style detail pages build their description out of content variables: a
// style name from the data module, a price from pricing.js, a turnaround and a
// review claim from the tier table. None of those lengths are knowable when
// the template is written, so the length of the result is not knowable either.
//
// nl/cat/custom resolved to exactly 160 characters — Google's cut, with zero
// margin. One word added to REVIEW_CLAIM, one cent added to a price, one
// longer style name, and a live page would have gone over without anyone
// touching that page or that copy. Shaving a word off the Dutch preamble to
// buy twelve characters only moves the cliff; it does not remove it.
//
// So the assembly drops trailing clauses instead. The first two parts — what
// the page is, and what it costs — always survive. The turnaround and review
// claim are tier facts, restated in the trust row a few lines into the page,
// so a snippet losing them loses nothing a reader needed. Nothing is ever cut
// mid-word, and nothing throws: a copy change must not break a build.
// /tmp/desc_slug.mjs still measures every resolved description.
//
// This is deliberately NOT used for the flow pages (order-*, test-sample,
// thank-you). Those descriptions are prose sentences, not a list of clauses,
// and joining them on '. ' would read like a spec sheet.

export const META_LIMIT = 160;

/**
 * Join clause parts into a meta description that cannot exceed `limit`.
 *
 * @param {Array<string>} parts  clauses, most important first, no trailing dots
 * @param {number} limit         character ceiling (default 160)
 * @param {number} keep          how many leading parts are never dropped
 * @returns {string}
 */
export function metaDescription(parts, limit = META_LIMIT, keep = 2) {
  const clean = parts
    .map((p) => String(p ?? '').trim().replace(/\.+$/, ''))
    .filter(Boolean);
  const build = (n) => clean.slice(0, n).join('. ') + '.';
  let used = clean.length;
  while (used > keep && build(used).length > limit) used -= 1;
  return build(used);
}
