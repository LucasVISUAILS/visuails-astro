/* VISUAILS — ronde 2, 23 september 2026.
 *
 * Wat deze ronde neerzette en wat niet stil mag teruglopen:
 *   1. de galerij toont meerdere leveringen, filterbaar op dienst en soort,
 *      en een plaatshouder zegt dat hij er een is;
 *   2. bestellen via WhatsApp: een klant aanmaken in /admin, en de foto's uit
 *      de app bij een bestelling namens de klant;
 *   3. /start/plan zegt wat je krijgt en wat je bespaart, zonder "zelf te
 *      verdelen" als tweede prijs;
 *   4. /faq is tabs met JavaScript en de volle lijst zonder;
 *   5. geen slot met drie knoppen.
 * Leest de bron en, waar dat kan, dist/.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { LEVERINGEN, DIENSTEN, SOORTEN, gebruikteDiensten, gebruikteSoorten } from '../src/data/leveringen.js';

let goed = 0, fout = 0;
const ok = (naam, waar, verwacht = true, kreeg = '') => {
  if (waar) { goed += 1; console.log(` ok   ${naam}`); }
  else { fout += 1; console.log(` FAIL ${naam}`.padEnd(72) + ` verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(kreeg)}`); }
};
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const dist = (p) => { const f = new URL(`../dist/${p}`, import.meta.url); return existsSync(f) ? readFileSync(f, 'utf8') : null; };

console.log('\n1 · de galerij met leveringen');
{
  ok('minstens vier leveringen', LEVERINGEN.length >= 4, '>=4', LEVERINGEN.length);
  ok('elke levering heeft een bekende dienst en soort',
    LEVERINGEN.every((l) => DIENSTEN[l.dienst] && SOORTEN[l.soort]), true);
  ok('elk bestelnummer heeft de vorm VIS-nnnn-nnnn', LEVERINGEN.every((l) => /^VIS-\d{4}-\d{4}$/.test(l.ref)), true);
  ok('geen dubbele id of bestelnummer',
    new Set(LEVERINGEN.map((l) => l.id)).size === LEVERINGEN.length && new Set(LEVERINGEN.map((l) => l.ref)).size === LEVERINGEN.length, true);
  ok('er zijn minstens twee diensten om op te filteren', gebruikteDiensten().length >= 2, '>=2', gebruikteDiensten().length);
  ok('en geen soort in het menu zonder levering', gebruikteSoorten().every((s) => LEVERINGEN.some((l) => l.soort === s)), true);
  const html = dist('nl/gallery/index.html');
  if (html) {
    const kaarten = (html.match(/class="gl-item"/g) || []).length;
    ok('dist: elke levering staat als kaart op /nl/gallery', kaarten === LEVERINGEN.length, LEVERINGEN.length, kaarten);
    const volgt = LEVERINGEN.filter((l) => l.beelden === 'volgt').length;
    const tags = (html.match(/gl-volgt/g) || []).length;
    ok('dist: elke plaatshouder zegt "Beelden volgen"', tags === volgt, volgt, tags);
    ok('dist: de filterbalk is verborgen tot het script draait', /data-gl-filters hidden/.test(html), true);
    ok('dist: de eerste levering staat open', /<details class="gl-kaart[^"]*"[^>]*open/.test(html), true);
  } else ok('dist/nl/gallery is gebouwd', false, 'bestand', 'ontbreekt');
}

console.log('\n2 · bestellen via WhatsApp');
{
  const admin = lees('src/lib/admin.js');
  ok('er is een route om een klant aan te maken', /path === '\/admin\/customers\/new'\) return handleNewCustomer/.test(admin), true);
  ok('die gebruikt dezelfde upsertCustomer als het bestelformulier', /handleNewCustomer[\s\S]{0,2000}upsertCustomer\(env,/.test(admin), true);
  ok('het formulier staat op de klantenlijst', /\$\{nieuweKlantFormulier\(\)\}/.test(admin), true);
  ok('de bestelling namens de klant neemt foto\'s mee', /name="fotos" multiple/.test(admin), true);
  ok('  en post multipart', /action="\/admin\/customers\/\$\{customer\.id\}\/order" enctype="multipart\/form-data"/.test(admin), true);
  ok('  en geeft ze door als upload_batch', /zet\('upload_batch', uploadBatch\)/.test(admin), true);
  ok('  met de grenzen van het bestelformulier', /MAX_FILE_BYTES/.test(admin) && /MAX_BATCH_FILES/.test(admin) && /typeFor\(f\.name\)/.test(admin), true);
}

console.log('\n3 · /start/plan');
{
  const pp = lees('src/components/order/PlanPicker.astro');
  ok('"Zelf te verdelen" staat niet meer op de kaart', !/\{c\.budgetKop\}/.test(pp), true);
  ok('de kaart noemt wat je bespaart', /ps-plan-voordeel/.test(pp) && /jeBespaart/.test(pp), true);
  ok('de voordelen staan onder de kop', /class="ps-voordelen"/.test(pp), true);
  ok('de verzendknop staat in stap 5 en niet op de zwarte plaat',
    pp.indexOf('ps-verzend') > pp.indexOf('class="ps-af"') && pp.indexOf('class="ps-af"') > pp.indexOf('class="ps-sum lime-plate'), true);
  const inlog = (pp.match(/class="[^"]*plan-al-klant/g) || []).length;
  ok('de inlogregel staat één keer in de markup', inlog === 1, 1, inlog);
}

console.log('\n4 · /faq');
{
  const faq = lees('src/components/FaqPage.astro');
  ok('de index draagt de tabs', /data-faq-tab=\{g\.id\}/.test(faq), true);
  ok('zonder script wordt er niets verborgen', !/faq-groep"[^>]*hidden/.test(faq), true);
  const html = dist('nl/faq/index.html');
  if (html) ok('dist: alle groepen staan in de html', (html.match(/data-faq-groep=/g) || []).length >= 5, '>=5', (html.match(/data-faq-groep=/g) || []).length);
}

console.log('\n5 · het slot heeft hooguit twee knoppen');
{
  const map = new URL('../src/components/', import.meta.url);
  for (const f of readdirSync(map).filter((n) => n.endsWith('.astro'))) {
    const s = readFileSync(new URL(f, map), 'utf8');
    for (const m of s.matchAll(/<section class="paneel paneel-slot[^"]*"[^>]*>([\s\S]*?)<\/section>/g)) {
      /* Knoppen met data-vis-in / data-vis-uit wisselen elkaar af: tel ze als één. */
      const knoppen = (m[1].match(/class="knop /g) || []).length - (m[1].match(/data-vis-in hidden/g) || []).length;
      const vast = (m[1].match(/target="_blank"[^>]*>\{style\.ctaLabel\}/g) || []).length; // VideoStyleDetail: of-of
      ok(`${f}: ${knoppen - vast} knop(pen) in het slot`, knoppen - vast <= 2, '<=2', knoppen - vast);
    }
  }
}

console.log(`\n${goed}/${goed + fout} geslaagd`);
process.exit(fout ? 1 : 0);
