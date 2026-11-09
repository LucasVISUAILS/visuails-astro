/* VISUAILS — ronde 91 (K-03b), 9 november 2026: de lever- en herlevermail zeggen
 * "op je bestelpagina" en niet "in VISUAILS Studio". De knop in die mails opent de
 * privélink, en die is sinds lijst 85 (A3) dé bestelpagina. Alleen de voorregel
 * (preheader) zei nog Studio. Apart van K-03 omdat het in src/lib/admin.js staat.
 *   node tests/blind91-k-levermail-bestelpagina.test.mjs
 */
import { deliveryEmail, redeliveryEmail } from '../src/lib/admin.js';

let goed = 0, fout = 0;
const ok = (naam, v, uitleg = '') => { if (v) { goed++; console.log(` ok   ${naam}`); } else { fout++; console.log(` FAIL ${naam}${uitleg ? `\n       ${uitleg}` : ''}`); } };
const LINK = 'https://visuails.com/o/abc';
const pre = (html) => (html.match(/<div[^>]*display:none[^>]*>([^<]*)/) || [])[1] || '';

const lever = deliveryEmail({ order: { ref: 'VIS-TEST-0401', name: 'Sanne', lang: 'nl', service: 'catalog', details_json: '{}' }, link: LINK, n: 12 });
const leverEn = deliveryEmail({ order: { ref: 'VIS-TEST-0401', name: 'Sanne', lang: 'en', service: 'catalog', details_json: '{}' }, link: LINK, n: 12 });
const her = redeliveryEmail({ order: { ref: 'VIS-TEST-0401', name: 'Sanne', lang: 'nl' }, link: LINK, n: 3, revisions: 2, note: 'x' });
const herEn = redeliveryEmail({ order: { ref: 'VIS-TEST-0401', name: 'Sanne', lang: 'en' }, link: LINK, n: 1, revisions: 0 });

ok('levermail NL: "staat klaar op je bestelpagina"', lever.includes('VIS-TEST-0401 staat klaar op je bestelpagina'), pre(lever));
ok('levermail EN: "is waiting on your order page"', leverEn.includes('VIS-TEST-0401 is waiting on your order page'), pre(leverEn));
ok('herlevermail NL: "staan klaar op je bestelpagina"', her.includes('voor VIS-TEST-0401 staan klaar op je bestelpagina'));
ok('herlevermail EN: "is waiting on your order page"', herEn.includes('for VIS-TEST-0401 is waiting on your order page'));
ok('nergens meer "in VISUAILS Studio" in deze vier', ![lever, leverEn, her, herEn].some((h) => /in VISUAILS Studio/.test(h)));
ok('de knop opent nog steeds de privélink', lever.includes(`href="${LINK}"`) && her.includes(`href="${LINK}"`));

console.log(`\n${goed} goed, ${fout} fout`);
if (fout) process.exit(1);
