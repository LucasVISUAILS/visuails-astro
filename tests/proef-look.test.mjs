/* VISUAILS — de €1-proef begint bij een look. 8 oktober 2026 (1.06, ronde A2).
 *
 *   node tests/proef-look.test.mjs        (leest dist/, dus eerst bouwen)
 *
 * Bewaakt:
 *   1 · elke lookpagina en elke lookkaart (/start, /catalog#looks,
 *       /lifestyle#looks, de stijlenstrook op de voorpagina) heeft de stille
 *       knop "Probeer VISUAILS · €1" naar /test-sample?style=<look>;
 *   2 · /test-sample kent precies die looks (catalog of lifestyle);
 *   3 · de oude popup (proefkaart) staat op geen enkele pagina meer. Sinds
 *       14 oktober 2026 is er een nieuwe, op verzoek van Lucas: de melding
 *       onderin het scherm (KlantMelding.astro, tests/klant-stand.test.mjs §7);
 *   4 · V18 = a: een proef bewaart de gegevens altijd, zonder vinkje, en de
 *       pagina zegt dat;
 *   5 · "Inloggen" in het formulier brengt je na de code terug in hetzelfde
 *       formulier, met de look — en nergens anders heen.
 * Het gedrag in de browser (vraag weg, look aangevinkt) staat in
 * tests/proef-browser.test.mjs.
 */
import { readFileSync, existsSync } from 'node:fs';
import { styles as lsEn } from '../src/data/styles.js';
import { styles as lsNl } from '../src/data/styles.nl.js';
import { catalogStyles as catEn } from '../src/data/catalogStyles.js';
import { catalogStyles as catNl } from '../src/data/catalogStyles.nl.js';
import { TEST_SAMPLE } from '../src/data/pricing.js';
import { formulierTerugVeilig, formulierTerug, terugVeilig, studioAuth } from '../src/lib/account.js';

let pass = 0, fail = 0;
const ok = (naam, v, extra = '') => { if (v) { pass++; console.log(` ok   ${naam}`); } else { fail++; console.log(` FAIL ${naam} ${extra}`); } };
const dist = (p) => new URL(`../dist/${p}`, import.meta.url);
if (!existsSync(dist('index.html'))) { console.log('dist/ ontbreekt — eerst bouwen'); process.exit(1); }
const lees = (p) => readFileSync(dist(p), 'utf8').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
const bron = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const bestelbaar = (s) => s.slug !== 'custom' && s.orderHref && !s.orderLabel;

/* ══ 1 · DE KNOP OP ELKE LOOKPAGINA EN LOOKKAART ══════════════════════════ */
for (const [taal, pre, ls, cat] of [['en', '', lsEn, catEn], ['nl', '/nl', lsNl, catNl]]) {
  console.log(`\nde stille proefknop (${taal})`);
  const cta = TEST_SAMPLE[taal].cta;
  const proef = (slug) => `href="${pre}/test-sample/?style=${slug}"`;
  const looks = [...cat.filter(bestelbaar).map((s) => ['catalog', s.slug]), ...ls.filter(bestelbaar).map((s) => ['lifestyle', s.slug])];
  const thuis = lees(`${pre ? 'nl/' : ''}index.html`);
  for (const [dienst, slug] of looks) {
    const pagina = lees(`${pre ? 'nl/' : ''}${dienst}/${slug}/index.html`);
    ok(`${taal}: /${dienst}/${slug} — knop naar de proef met deze look`, pagina.includes(proef(slug)));
    ok(`${taal}: /${dienst}/${slug} — de knop zegt "${cta}"`, new RegExp(`${proef(slug).replace(/[?.]/g, '\\$&')}[^>]*>${cta.replace(/[.]/g, '\\.')}<`).test(pagina));
    const hub = lees(`${pre ? 'nl/' : ''}${dienst}/index.html`);
    ok(`${taal}: /${dienst}#looks — kaart ${slug} heeft de proefknop`, hub.includes(proef(slug)));
    ok(`${taal}: /start — kaart ${slug} heeft de proefknop`, lees(`${pre ? 'nl/' : ''}start/index.html`).includes(proef(slug)));
    ok(`${taal}: voorpagina — stijlenstrook ${slug} heeft de proefknop`, thuis.includes(proef(slug)));
  }
  /* De look op maat is een aanvraag: geen ?style=custom. */
  const maat = lees(`${pre ? 'nl/' : ''}lifestyle/custom/index.html`);
  ok(`${taal}: /lifestyle/custom — geen proef met style=custom`, !maat.includes('style=custom'));

  /* ══ 2 · /test-sample KENT DEZE LOOKS ══ */
  const ts = lees(`${pre ? 'nl/' : ''}test-sample/index.html`);
  const rauw = readFileSync(dist(`${pre ? 'nl/' : ''}test-sample/index.html`), 'utf8');
  const m = rauw.match(/data-ts-looks="([^"]*)"/);
  let kaart = {};
  try { kaart = JSON.parse(m ? m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&') : '{}'); } catch { kaart = {}; }
  ok(`${taal}: /test-sample kent precies de bestelbare looks`, JSON.stringify(Object.keys(kaart).sort()) === JSON.stringify(looks.map(([, s]) => s).sort()), JSON.stringify(Object.keys(kaart)));
  ok(`${taal}: en per look de goede soort`, looks.every(([d, s]) => kaart[s]?.soort === d));
  ok(`${taal}: het script zet de soort en verbergt de vraag`, /data-pl-kind="' ?\+ ?look\.soort/.test(ts) && /vraag\.hidden ?= ?true/.test(ts));
  ok(`${taal}: de regel "kies opnieuw" wijst naar de proef zonder look`, new RegExp(`data-ts-anders[^>]*hidden[^>]*>[^<]*<a href="${pre}/test-sample/"`).test(ts));

  /* ══ 3 · DE POPUP IS WEG ══ */
  for (const p of ['index.html', 'plans/index.html', 'catalog/index.html']) {
    ok(`${taal}: geen proefkaart op /${p.replace('index.html', '')}`, !/id="proefkaart"|data-proefkaart/.test(lees(`${pre ? 'nl/' : ''}${p}`)));
  }

  /* ══ 4 · V18 = a ══ */
  ok(`${taal}: /test-sample zegt dat de proef een account aanmaakt`, /data-ts-account/.test(ts) && (taal === 'nl' ? /account in VISUAILS Studio aan/ : /sets up your account in VISUAILS Studio/).test(ts));
  ok(`${taal}: en het vinkje "Bewaar mijn gegevens" staat er niet (verborgen)`, /\[data-pl-save-offer\][^{]*\{\s*display:\s*none\s*!important/.test(readFileSync(new URL('../src/styles/hal.css', import.meta.url), 'utf8')));
}
console.log('\nde server bewaart de gegevens van een proef altijd');
ok('order.js: saveRequested is waar voor test-sample', /const saveRequested = service === 'test-sample' \|\|/.test(bron('functions/api/order.js')));

/* ══ 5 · TERUG IN HETZELFDE FORMULIER ═════════════════════════════════════ */
console.log('\nna inloggen terug in het formulier');
for (const goed of ['/test-sample/', '/nl/test-sample/?style=dunes', '/start/lifestyle/?style=flash', '/nl/start/catalog/', '/start/plan']) {
  ok(`toegestaan: ${goed}`, formulierTerugVeilig(goed));
}
for (const fout of ['//evil.example/', 'https://evil.example/test-sample/', '/test-sample/../account', '/start/lifestyle/?style=<x>', '/admin', '/nl/start/onbekend/', '']) {
  ok(`geweigerd: ${JSON.stringify(fout)}`, !formulierTerugVeilig(fout));
}
ok('terugVeilig (Studio) is niet verruimd', !terugVeilig('/test-sample/'));
const req = (terug, ref) => new Request(`https://visuails.com/account/login?lang=nl&terug=${encodeURIComponent(terug)}`, { headers: ref ? { Referer: ref } : {} });
ok('de look komt mee uit de Referer', formulierTerug(req('/nl/test-sample/', 'https://visuails.com/nl/test-sample/?style=dunes')) === '/nl/test-sample/?style=dunes');
ok('een Referer van een andere site telt niet', formulierTerug(req('/nl/test-sample/', 'https://evil.example/nl/test-sample/?style=dunes')) === '/nl/test-sample/');
ok('een Referer van een ander pad telt niet', formulierTerug(req('/nl/test-sample/', 'https://visuails.com/nl/start/catalog/?style=glow')) === '/nl/test-sample/');
ok('een terug buiten de lijst wordt niets', formulierTerug(req('/admin/', 'https://visuails.com/admin/')) === '');
{
  const db = { prepare() { const st = { bind() { return st; }, async first() { return null; }, async all() { return { results: [] }; }, async run() { return {}; } }; return st; } };
  const res = await studioAuth({ request: req('/nl/start/lifestyle/', 'https://visuails.com/nl/start/lifestyle/?style=glow'), env: { DB: db } });
  ok('/account/login?terug= zet het doel in een cookie en laadt zichzelf opnieuw', res instanceof Response && res.status === 303 && res.headers.get('location') === '/account/login?lang=nl');
  const cookie = res instanceof Response ? (res.headers.get('set-cookie') || '') : '';
  ok('  met het formulier en de look erin', decodeURIComponent(cookie).includes('vs_terug=/nl/start/lifestyle/?style=glow') && /Path=\/account/.test(cookie) && /HttpOnly/.test(cookie));
}
const of = bron('src/components/order/OrderFlow.astro');
ok('de knop Inloggen in het formulier stuurt het pad mee', /href=\{`\/account\/login\?lang=\$\{lang\}&terug=\$\{encodeURIComponent\(Astro\.url\.pathname\)\}`\}/.test(of));
const tsHtml = lees('nl/test-sample/index.html');
ok('op /nl/test-sample wijst Inloggen naar /account/login met terug=/nl/test-sample/', tsHtml.includes('/account/login?lang=nl&terug=%2Fnl%2Ftest-sample%2F'));

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
