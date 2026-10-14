/* VISUAILS — /start toont de looks, per dienst. 8 oktober 2026 (1.01, ronde A2).
 *
 *   node tests/start-looks.test.mjs        (leest dist/, dus eerst bouwen)
 *
 * Lucas: *"Klanten moeten wel kunnen kiezen wat ze willen, bijvoorbeeld catalog,
 * subscription, lifestyle imagery etc. omdat het anders lijkt alsof ik alleen
 * lifestyle foto's heb."* Wat hier bewaakt wordt:
 *   1 · /start (EN en NL) toont een groep Catalog én een groep Lifestyle, met
 *       precies de bestelbare looks uit de lookdata — niet de look op maat;
 *   2 · "Kies deze look" gaat naar het formulier uit de lookdata, met één
 *       taalvoorvoegsel; het formulier heeft een radio voor die look, zodat
 *       ?style= hem echt aanvinkt (StylePicker.astro);
 *   3 · "Probeer VISUAILS · €1" gaat naar /test-sample?style=<look> (1.06), en
 *       "Meer over deze look" naar de bestaande lookpagina;
 *   4 · de rustige rij: abonnement, video, eigen look, merkmodel, proef, App ons;
 *   5 · elk bedrag op de kaart komt uit pricing.js (de onderste trede).
 */
import { readFileSync, existsSync } from 'node:fs';
import { styles as lsEn } from '../src/data/styles.js';
import { styles as lsNl } from '../src/data/styles.nl.js';
import { catalogStyles as catEn } from '../src/data/catalogStyles.js';
import { catalogStyles as catNl } from '../src/data/catalogStyles.nl.js';
import { ladderFloor, euro, TEST_SAMPLE } from '../src/data/pricing.js';

let pass = 0, fail = 0;
const ok = (naam, v, extra = '') => { if (v) { pass++; console.log(` ok   ${naam}`); } else { fail++; console.log(` FAIL ${naam} ${extra}`); } };
const dist = (p) => new URL(`../dist/${p}`, import.meta.url);
if (!existsSync(dist('start/index.html'))) { console.log('dist/ ontbreekt — eerst bouwen'); process.exit(1); }
const lees = (p) => readFileSync(dist(p), 'utf8');
const ontsnap = (s) => s.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
const bestelbaar = (s) => s.slug !== 'custom' && s.orderHref && !s.orderLabel;

for (const [taal, pre, ls, cat] of [['en', '', lsEn, catEn], ['nl', '/nl', lsNl, catNl]]) {
  console.log(`\n/start (${taal})`);
  const html = ontsnap(lees(`${pre ? 'nl/' : ''}start/index.html`));
  const groep = (id) => {
    const i = html.indexOf(`data-st-groep="${id}"`);
    if (i < 0) return '';
    const j = html.indexOf('data-st-groep=', i + 20);
    return html.slice(i, j > 0 ? j : html.indexOf('st-onder', i));
  };
  for (const [id, data, dienst] of [['catalog', cat, 'catalog'], ['lifestyle', ls, 'lifestyle']]) {
    const g = groep(id);
    ok(`${taal}: groep ${id} staat er, met anker #${id}`, g && html.includes(`id="${id}"`));
    const looks = [...g.matchAll(/data-st-look="([a-z-]+)"/g)].map((m) => m[1]);
    const verwacht = data.filter(bestelbaar).map((s) => s.slug);
    ok(`${taal}: ${id} toont precies de bestelbare looks (${verwacht.join(', ')})`, JSON.stringify(looks) === JSON.stringify(verwacht), JSON.stringify(looks));
    ok(`${taal}: ${id} toont de look op maat niet`, !looks.includes('custom'));
    ok(`${taal}: ${id} noemt "vanaf ${euro(ladderFloor(id), taal)}"`, g.includes(euro(ladderFloor(id), taal)));
    for (const s of data.filter(bestelbaar)) {
      const kaart = g.slice(g.indexOf(`data-st-look="${s.slug}"`)).split('</li>')[0];
      const kies = (kaart.match(/href="([^"]+)"[^>]*data-st-kies/) || [])[1] || '';
      const doel = String(s.orderHref).replace(/^\/nl(?=\/)/, '');
      ok(`${taal}: ${s.slug} — Kies deze look → ${pre}${doel}`, kies === `${pre}${doel}`, kies);
      ok(`${taal}: ${s.slug} — geen dubbel taalvoorvoegsel`, !kies.startsWith('/nl/nl/'));
      const proef = (kaart.match(/href="([^"]+)"[^>]*data-st-proef/) || [])[1] || '';
      ok(`${taal}: ${s.slug} — proefknop → ${pre}/test-sample/?style=${s.slug}`, proef === `${pre}/test-sample/?style=${s.slug}`, proef);
      ok(`${taal}: ${s.slug} — proefknop zegt "${TEST_SAMPLE[taal].cta}"`, kaart.includes(TEST_SAMPLE[taal].cta));
      ok(`${taal}: ${s.slug} — Meer over deze look → ${pre}/${dienst}/${s.slug}/`, kaart.includes(`href="${pre}/${dienst}/${s.slug}/"`));
      ok(`${taal}: ${s.slug} — de zin uit de lookdata`, kaart.includes(s.tagline));
      /* Het formulier achter de knop moet de look kennen, anders vinkt ?style= niets aan. */
      if (dienst === 'lifestyle') {
        const form = lees(`${pre ? 'nl/' : ''}start/lifestyle/index.html`);
        ok(`${taal}: ${s.slug} — het formulier heeft een radio voor deze look`, new RegExp(`name="style"[^>]*value="${s.slug}"|value="${s.slug}"[^>]*name="style"`).test(form));
      }
    }
  }
  /* De rustige rij. */
  const rij = html.slice(html.indexOf('st-ook-rij'), html.indexOf('</nav>', html.indexOf('st-ook-rij')));
  for (const doel of ['/plans/', '/video/', '/start/custom-look/', '/custom-models/', '/test-sample/']) {
    ok(`${taal}: de rij linkt naar ${pre}${doel}`, rij.includes(`href="${pre}${doel}"`));
  }
  ok(`${taal}: de rij heeft App ons (wa.me)`, /href="https:\/\/wa\.me\//.test(rij));
  ok(`${taal}: geen grijs vlak op /start`, !html.includes('/img/plaatshouder/') && !html.includes('data-placeholder='));
}

/* De tegels op de voorpagina springen naar de groep, niet meer naar een filter.
   12 oktober 2026: de voorpagina is de hal. Zijn drie dienstbeelden ("Wat we
   maken") gaan naar de dienstpagina's, waar de looks en de bestelknoppen staan;
   "Start een bestelling" gaat naar /start, waar je eerst kiest (de vaste regel:
   een bestelknop gaat nooit rechtstreeks naar het formulier). Dat zijn twee
   deuren naar een keuze, geen van beide naar een formulier of een filter. */
console.log('\nde voorpagina');
for (const [p, pre] of [['index.html', ''], ['nl/index.html', '/nl']]) {
  const h = lees(p);
  const maken = h.slice(h.indexOf('id="maken"'), h.indexOf('</section>', h.indexOf('id="maken"')));
  for (const dienst of ['catalog', 'lifestyle', 'video']) {
    ok(`${pre || 'en'}: dienstbeeld ${dienst} → ${pre}/${dienst}/`, maken.includes(`href="${pre}/${dienst}/"`));
  }
  ok(`${pre || 'en'}: "Start een bestelling" → ${pre}/start/`, h.includes(`class="h-knop h-knop-inkt" href="${pre}/start/"`));
  ok(`${pre || 'en'}: geen knop rechtstreeks naar een formulier`, !/href="(?:\/nl)?\/start\/(?:catalog|lifestyle)\/"/.test(h));
  ok(`${pre || 'en'}: geen ?zie= meer`, !h.includes('?zie='));
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
