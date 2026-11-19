/* VISUAILS — levering 119 (18 november 2026), bouwer C5: teksten en de juridische pagina's.
 *
 *   node tests/levering-119-teksten.test.mjs     (geen build nodig: rekent met de data en leest de bron)
 *
 * Wat hier bewaakt wordt, per proefronde:
 *   P6-10  het cookiebeleid noemt geen aantal meer (de kop zei "vijf", onder de lijst "alle vier", de lijst heeft er zes),
 *          en de cookiedialoog noemt geen "eigen beheer" / "admin side" meer;
 *   P6-14  privacybeleid en verwerkersovereenkomst tonen dezelfde datum boven de lijst, uit één bron (LIJST_GEWIJZIGD);
 *   P6-15  /how-it-works: achtergrond "Wit, of elke kleur die je opgeeft" (zoals /catalog), niet de drie demokleuren;
 *   P6-16  de FAQ zegt dat elke bestelling een bestelpagina heeft (zoals privacy §9 en order.js);
 *   P6-19  /plans zet de maandset als "Binnenkort" in het blok "Hoe het werkt";
 *   P6-22  /contact heeft het onderwerp "Privacy of je gegevens";
 *   P6-23  voorwaarden §11 en de tabel op /ai-act zeggen "foto's en video's", zoals /admin het doet (mp4);
 *   P7-07  de Engelse lijst ontvangers zegt "European Commission (VIES)";
 *   datums de vijf juridische pagina's staan op 18 november 2026.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { faqPageGroups } from '../src/data/faq.js';
import { WINDOW_THRESHOLD } from '../src/data/pricing.js';
import { LAATST_BIJGEWERKT, bijgewerktOp } from '../src/data/juridischeDatums.js';
import { ontvangers, subverwerkers, lijstRegel, lijstGewijzigdOp } from '../src/data/subverwerkers.js';
import { background, DEFAULT_ID } from '../src/data/backgrounds.js';

let pass = 0, fail = 0;
const ok = (naam, v, extra = '') => { if (v) { pass++; console.log(` ok   ${naam}`); } else { fail++; console.log(` FAIL ${naam} ${extra}`); } };
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const lees = (p) => readFileSync(join(ROOT, p), 'utf8');
/* Alleen wat de lezer ziet: commentaar eruit (zoals tests/legal.test.mjs). */
const zonderUitleg = (bron) => bron
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');
const faq = (l) => JSON.stringify(faqPageGroups(l));

console.log('\nP6-10 · het cookiebeleid telt niet meer, en de dialoog noemt geen beheerkant');
for (const [pad, l] of [['src/pages/cookie-policy.astro', 'en'], ['src/pages/nl/cookie-policy.astro', 'nl']]) {
  const p = zonderUitleg(lees(pad));
  ok(`${l}: geen telwoord in de kop of onder de lijst`, !/Het zijn er (vijf|vier|zes)|There are (five|four|six) in total|alle (vier|vijf|zes)\b|all (four|five|six)\b/i.test(p));
  ok(`${l}: de kop zegt dat ze allemaal bij naam staan`, l === 'nl' ? /Ze staan hieronder allemaal bij naam\./.test(p) : /Every one of them is named below\./.test(p));
  ok(`${l}: onder de lijst "allemaal"`, l === 'nl' ? /Dat zijn ze allemaal\./.test(p) : /That is all of them\./.test(p));
  /* De lijst zelf: zes regels met een cookienaam, en vis_admin staat er niet in (zie de noot in de Engelse pagina). */
  const lijst = p.slice(p.indexOf(l === 'nl' ? 'Wat we vandaag daadwerkelijk plaatsen' : 'What we actually set today'));
  const regels = (lijst.slice(0, lijst.indexOf('</ul>')).match(/<li>/g) || []).length;
  ok(`${l}: de lijst heeft nog zes cookies`, regels === 6, String(regels));
  ok(`${l}: geen vis_admin op de pagina`, !p.includes('vis_admin'));
}
{
  const ui = zonderUitleg(lees('src/i18n/ui.js'));
  ok('ui.js: geen "eigen beheer" meer', !/eigen beheer/.test(ui));
  ok('ui.js: geen "admin side" meer', !/admin side/i.test(ui));
  ok('ui.js: de noodzakelijke cookies noemen je taal (NL en EN)', /cc_nec_n: 'Je inlog bij VISUAILS Studio, een paar voorkeuren \(zoals je taal\)/.test(ui) && /cc_nec_n: 'Your sign-in to VISUAILS Studio, a few preferences \(such as your language\)/.test(ui));
}

console.log('\nP6-14 · één datum boven de lijst, uit één bron');
for (const l of ['nl', 'en']) {
  const datum = lijstGewijzigdOp(l);
  ok(`${l}: privacy en verwerkersovereenkomst tonen dezelfde datum (${datum})`, lijstRegel(l).includes(datum) && lijstRegel(l, 'subverwerkers').includes(datum), lijstRegel(l, 'subverwerkers'));
  ok(`${l}: de verwerkersovereenkomst zegt dat zij alleen de partijen met beeld toont`, l === 'nl' ? /alleen de partijen die je beelden krijgen/.test(lijstRegel(l, 'subverwerkers')) : /Only the parties that receive your images/.test(lijstRegel(l, 'subverwerkers')));
  ok(`${l}: geen tweede datum meer op de verwerkersovereenkomst`, !lijstRegel(l, 'subverwerkers').includes(lijstGewijzigdOp(l, 'subverwerkers')) || lijstGewijzigdOp(l, 'subverwerkers') === datum);
}
for (const pad of ['src/pages/privacy.astro', 'src/pages/nl/privacy.astro', 'src/pages/data-processing-agreement.astro', 'src/pages/nl/data-processing-agreement.astro']) {
  ok(`${pad.replace('src/pages/', '')}: de regel komt uit lijstRegel()`, /\{lijstRegel\('(en|nl)'(, 'subverwerkers')?\)\}/.test(lees(pad)));
}

console.log('\nP6-15 · /how-it-works: wit, of elke eigen kleur');
{
  const hw = lees('src/components/HowItWorksHal.astro');
  ok('NL: "Wit, of elke kleur die je opgeeft"', /catalog: `Achtergrond: \$\{WIT\}, of elke kleur die je opgeeft`/.test(hw));
  ok('EN: "White, or any colour you name"', /catalog: `Background: \$\{WIT\}, or any colour you name`/.test(hw));
  ok('de naam van wit komt uit backgrounds.js', /background\(DEFAULT_ID\)\?\.name\[lang\]/.test(hw) && background(DEFAULT_ID).name.nl === 'Wit');
  ok('geen lijst van demokleuren meer', !/lijst\(achtergronden\)/.test(hw));
  ok('/catalog zegt hetzelfde', /Je eigen kleur — elke kleur die je opgeeft/.test(lees('src/components/CatalogHal.astro')));
}

console.log('\nP6-16 · elke bestelling heeft een bestelpagina');
{
  ok('NL: "Elke bestelling heeft ook een eigen bestelpagina"', faq('nl').includes(`Elke bestelling heeft ook een eigen bestelpagina; vanaf ${WINDOW_THRESHOLD} producten toont die elke stap met de bijbehorende datum.`));
  ok('EN: "Every order also has its own order page"', faq('en').includes(`Every order also has its own order page; from ${WINDOW_THRESHOLD} products it shows every step with its date.`));
  ok('NL: niet meer "Vanaf … komt daar een eigen bestelpagina bij"', !/komt daar een eigen bestelpagina bij/.test(faq('nl')));
  ok('EN: niet meer "you also get a dedicated order page"', !/you also get a dedicated order page/.test(faq('en')));
  /* Het bewijs in de code: order.js maakt voor elke bestelling een link, zonder drempel. */
  const order = lees('functions/api/order.js');
  ok('order.js maakt de bestellink voor elke bestelling (geen drempel)', /let portalLink = null;\s*if \(orderId\) \{/.test(order));
  ok('privacy §9 zegt "elke bestelling"', /elke bestelling een eigen bestelpagina/.test(lees('src/pages/nl/privacy.astro')));
}

console.log('\nP6-19 · de maandset staat als "Binnenkort" in "Hoe het werkt"');
{
  const pl = zonderUitleg(lees('src/components/PlansHal.astro'));
  ok('NL: "Binnenkort: de maandset"', /\['Binnenkort: de maandset', 'Bij elk abonnement, zodra hij loopt; zie hieronder\.'\]/.test(pl));
  ok('EN: "Coming soon: the monthly set"', /\['Coming soon: the monthly set', 'With every plan, once it starts; see below\.'\]/.test(pl));
  ok('niet meer "Plus de maandset" / "Plus the monthly set"', !/Plus de maandset|Plus the monthly set/.test(pl));
}

console.log('\nP6-22 · /contact heeft een onderwerp voor privacy');
{
  const c = lees('src/components/ContactHal.astro');
  ok('NL: "Privacy of je gegevens"', /\['privacy', 'Privacy of je gegevens'\],\s*\['other', 'Anders'\]/.test(c));
  ok('EN: "Privacy or your data"', /\['privacy', 'Privacy or your data'\],\s*\['other', 'Other'\]/.test(c));
}

console.log('\nP6-23 · de markering staat in foto\'s én video\'s, overal');
{
  /* Wat de code doet: /admin zet de tag ook in mp4. */
  const xmp = lees('src/lib/xmp.js');
  const admin = lees('src/lib/admin.js');
  ok('xmp.js heeft zetHerkomstTagMp4 en admin.js gebruikt die', /export async function zetHerkomstTagMp4/.test(xmp) && /zetHerkomstTagMp4/.test(admin));
  const tn = zonderUitleg(lees('src/pages/nl/terms.astro'));
  const te = zonderUitleg(lees('src/pages/terms.astro'));
  ok('NL voorwaarden §11: "in de geleverde foto’s en video’s"', tn.includes('zetten in de geleverde foto’s en video’s een machineleesbare markering'));
  ok('NL: "Mist een geleverd bestand die markering"', tn.includes('Mist een geleverd bestand die markering, dan leveren we het op jouw verzoek opnieuw'));
  ok('EN terms §11: "into the delivered photos and videos"', te.includes('write a machine-readable marking into the delivered photos and videos'));
  ok('EN: "If a delivered file is missing that marking"', te.includes('If a delivered file is missing that marking'));
  const ai = zonderUitleg(lees('src/components/AiActHal.astro'));
  ok('/ai-act tabel NL: "foto’s en video’s"', ai.includes('zet in de geleverde foto’s en video’s een machineleesbare markering, en levert een bestand zonder markering op verzoek opnieuw'));
  ok('/ai-act tabel EN: "photos and videos"', ai.includes('writes a machine-readable marking into the delivered photos and videos, and delivers a file without one again on request'));
  ok('nergens meer "alleen foto’s" bij de markering', !/geleverde foto’s een machineleesbare|delivered photos, and delivers a photo|delivered photos that records it/.test(tn + te + ai));
}

console.log('\nP7-07 · de Europese Commissie heet in het Engels zo');
{
  const en = ontvangers('en').find((o) => o.id === 'vies');
  const nl = ontvangers('nl').find((o) => o.id === 'vies');
  ok('EN: "European Commission (VIES)"', en && en.naam === 'European Commission (VIES)', en && en.naam);
  ok('NL: "Europese Commissie (VIES)"', nl && nl.naam === 'Europese Commissie (VIES)', nl && nl.naam);
  ok('geen Nederlandse naam meer in de Engelse lijst', !ontvangers('en').some((o) => /Europese|Commissie/.test(o.naam)));
  ok('de andere namen zijn in beide talen gelijk', ontvangers('en').filter((o) => o.id !== 'vies').every((o) => o.naam === ontvangers('nl').find((x) => x.id === o.id).naam));
  ok('VIES staat nog steeds niet bij de subverwerkers', !subverwerkers('en').some((o) => o.id === 'vies'));
}

console.log('\nde juridische datums');
for (const d of ['terms', 'privacy', 'cookie-policy', 'data-processing-agreement', 'ai-act']) {
  ok(`${d}: 2026-11-18`, LAATST_BIJGEWERKT[d] === '2026-11-18', LAATST_BIJGEWERKT[d]);
}
ok('NL: "Laatst bijgewerkt: 18 november 2026"', bijgewerktOp('cookie-policy', 'nl') === 'Laatst bijgewerkt: 18 november 2026', bijgewerktOp('cookie-policy', 'nl'));
ok('EN: "Last updated: 18 November 2026"', bijgewerktOp('cookie-policy', 'en') === 'Last updated: 18 November 2026', bijgewerktOp('cookie-policy', 'en'));

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
