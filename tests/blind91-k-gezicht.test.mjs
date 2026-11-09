/* VISUAILS — ronde 91 (K-C1), 9 november 2026: in het Catalog-formulier staat het gezicht
 * standaard op "Wij kiezen", zoals bij de €1-proef. Lucas koos dat in lijst 85 (C1 = a).
 * Tot vandaag moest een klant op /start/catalog zelf een gezicht aanwijzen voordat hij
 * verder kon ("Pick who wears it — or pick the first tile and we choose one").
 *
 * Leest de bron, en de gebouwde pagina als die er is (een ontbrekende build wordt
 * overgeslagen, niet afgekeurd — zie tests/lib/build.mjs).
 *   node tests/blind91-k-gezicht.test.mjs
 */
import { readFileSync, existsSync } from 'node:fs';

let goed = 0, fout = 0;
const ok = (naam, v, uitleg = '') => { if (v) { goed++; console.log(` ok   ${naam}`); } else { fout++; console.log(` FAIL ${naam}${uitleg ? `\n       ${uitleg}` : ''}`); } };
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

for (const [pad, lang] of [['src/pages/start/catalog.astro', 'en'], ['src/pages/nl/start/catalog.astro', 'nl']]) {
  const src = lees(pad);
  ok(`${lang}: de catalogpagina geeft verplicht={false} mee aan de gezichtskiezer`,
    new RegExp(`<ModelKeuze slot="model" lang="${lang}" soort="catalog" verplicht=\\{false\\} />`).test(src));
}

/* De kiezer zelf: zonder `verplicht` staat "wij kiezen" aangevinkt en eist geen radio iets. */
const picker = lees('src/components/order/ModelPicker.astro');
ok('ModelPicker: "wij kiezen" is checked zolang verplicht uit staat',
  /value=\{MODEL_ANY\} checked=\{!verplicht\} required=\{verplicht\}/.test(picker));

/* De proef blijft zoals hij was. */
ok('de €1-proef houdt verplicht={false}', /<ModelKeuze[^>]*soort="proef"[^>]*verplicht=\{false\}/.test(lees('src/components/TestSampleHal.astro')));

/* De gebouwde pagina, als die er is. */
for (const [p, lang] of [['dist/start/catalog/index.html', 'en'], ['dist/nl/start/catalog/index.html', 'nl']]) {
  const url = new URL(`../${p}`, import.meta.url);
  if (!existsSync(url)) { console.log(` --   ${p} niet gebouwd, overgeslagen`); continue; }
  const h = readFileSync(url, 'utf8');
  const any = (h.match(/<input type="radio" name="model" value="any"[^>]*>/) || [''])[0];
  ok(`${lang} (dist): "wij kiezen" staat aangevinkt`, / checked[\s>]/.test(any), any);
  ok(`${lang} (dist): en geen gezicht is verplicht`, !/<input type="radio" name="model"[^>]* required/.test(h));
}

console.log(`\n${goed} goed, ${fout} fout`);
if (fout) process.exit(1);
