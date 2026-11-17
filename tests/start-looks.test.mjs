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
 *   5 · elk bedrag op de kaart komt uit pricing.js (de onderste trede);
 *   6 · levering 116 (lijst 126): eerst de soort (#kies, vijf tegels zoals Wat we maken op de voorpagina), dan
 *       alleen de looks van die soort, met "Andere soort kiezen" terug naar #kies. Geen kopfoto, strook of band
 *       Op maat meer; merkmodel en abonnement staan in de rij van stap 1.
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
  /* De banden (15 oktober 2026, v28-start = a): Video met de vier stijlen en de
     aanvraag, Op maat met eigen look, merkmodel en abonnement. De rustige rij houdt
     alleen de proef en App ons. */
  const band = (id) => html.slice(html.indexOf(`id="${id}"`), html.indexOf('</section>', html.indexOf(`id="${id}"`)));
  const video = band('video');
  /* Lijst 109 (15 november 2026): op de videopagina alleen Motion en video op maat. */
  for (const slug of ['motion', 'campaign', 'lifestyle']) ok(`${taal}: de band Video heeft geen ${slug === 'motion' ? 'dode link' : slug}`, slug === 'motion' || !video.includes(`href="${pre}/video/${slug}/"`));
  for (const slug of ['motion', 'custom']) ok(`${taal}: de band Video heeft ${slug} → ${pre}/video/${slug}/`, video.includes(`href="${pre}/video/${slug}/"`));
  ok(`${taal}: en de aanvraag → ${pre}/start/video/`, video.includes(`href="${pre}/start/video/"`));
  /* Levering 116 (lijst 126): stap 1, de soort. */
  const kies = html.slice(html.indexOf('id="kies"'), html.indexOf('</section>', html.indexOf('id="kies"')));
  const tegels = [...kies.matchAll(/<a href="([^"]+)" class="st2-a"/g)].map((m) => m[1]);
  ok(`${taal}: stap 1 heeft vijf soorten, in de volgorde van de voorpagina`, JSON.stringify(tegels) === JSON.stringify(['#catalog', '#lifestyle', '#video', `${pre}/hooks/`, `${pre}/start/custom-look/`]), JSON.stringify(tegels));
  ok(`${taal}: elke soort zegt waarvoor, met een naam en een prijs`, (kies.match(/class="st2-voor"/g) || []).length === 5 && (kies.match(/class="st2-prijs"/g) || []).length === 5);
  ok(`${taal}: de prijs van productfoto's en lifestyle is de onderste trede`, kies.includes(euro(ladderFloor('catalog'), taal)) && kies.includes(euro(ladderFloor('lifestyle'), taal)));
  ok(`${taal}: de stappenrij staat op 01`, /<li aria-current="step"[^>]*><span>01<\/span>/.test(kies));
  const rij = kies.slice(kies.indexOf('h-st-ook-rij'));
  for (const doel of ['/custom-models/', '/plans/']) ok(`${taal}: de rij van stap 1 linkt naar ${pre}${doel}`, rij.includes(`href="${pre}${doel}"`));
  ok(`${taal}: de rij linkt naar ${pre}/test-sample/ (niet voor wie al klant is)`, /<li data-vis-uit[^>]*><a[^>]*href="[^"]*\/test-sample\/"/.test(rij));
  ok(`${taal}: de rij heeft App ons (wa.me)`, /href="https:\/\/wa\.me\//.test(rij));
  /* stap 2: elke groep en de video terug naar de soort, met de stappenrij op 02 */
  for (const id of ['catalog', 'lifestyle', 'video']) {
    const i = html.indexOf(`id="${id}"`);
    const kop = html.slice(i, html.indexOf('</nav>', i));
    ok(`${taal}: ${id} heeft "Andere soort kiezen" → #kies en staat op 02`, kop.includes('class="st2-terug" href="#kies"') && /aria-current="step"[^>]*><span>02/.test(kop));
  }
  ok(`${taal}: geen kopfoto, strook of band Op maat meer`, !html.includes('h-st-kort-rij') && !html.includes('id="op-maat"') && !html.includes('kopbeeld'));
  ok(`${taal}: welke stap er staat volgt het anker (start-126.css)`, /:has\(:is\(#catalog,\s?#lifestyle,\s?#video\):target\)/.test(readFileSync(new URL('../src/styles/start-126.css', import.meta.url), 'utf8')));
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
  // knoppensysteem lijst 88/89: de inktknop heet nu .h-knop.k.k-vol en draagt data-rol vóór href
  ok(`${pre || 'en'}: "Start een bestelling" → ${pre}/start/`, h.includes(`class="h-knop k k-vol" data-rol="doorgaan" href="${pre}/start/"`));
  ok(`${pre || 'en'}: geen knop rechtstreeks naar een formulier`, !/href="(?:\/nl)?\/start\/(?:catalog|lifestyle)\/"/.test(h));
  ok(`${pre || 'en'}: geen ?zie= meer`, !h.includes('?zie='));
  ok(`${pre || 'en'}: Bestel dit bij Eigen look → ${pre}/start/custom-look/ (levering 116: #op-maat bestaat niet meer)`, ontsnap(h).includes(`"bestel":"${pre}/start/custom-look/"`) && !h.includes('/start/#op-maat'));
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
