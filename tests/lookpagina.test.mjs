/* VISUAILS — de lookpagina's: de data en de bron. 11 oktober 2026 (k101 = a, K5 punt 5).
 *
 *   node tests/lookpagina.test.mjs      (geen server; de browserkant: lookpagina-browser.test.mjs)
 *
 * Bewaakt:
 *   · elke look (lifestyle en catalog, NL en EN) heeft `kort` met drie korte
 *     regels: kleding, gevoel, kanalen — een nieuwe look is één blok data;
 *   · de catalogbeelden (`fotos`) bestaan echt (isEcht), en de sjablonen filteren
 *     met isEcht: nooit een grijs vlak of een getekend vak (ProductScene is weg);
 *   · beide sjablonen gebruiken LookDetail.astro; "Kies deze look" gaat naar
 *     style.orderHref en "Probeer VISUAILS · €1" naar de proef met de look;
 *   · de routes (titel, meta) zijn niet aangeraakt.
 */
import { readFileSync } from 'node:fs';
import { styles as lsEn } from '../src/data/styles.js';
import { styles as lsNl } from '../src/data/styles.nl.js';
import { catalogStyles as catEn } from '../src/data/catalogStyles.js';
import { catalogStyles as catNl } from '../src/data/catalogStyles.nl.js';
import { isEcht } from '../src/lib/beeldAanwezig.js';

let pass = 0, fail = 0;
const ok = (naam, v, extra = '') => { if (v) { pass++; console.log(` ok   ${naam}`); } else { fail++; console.log(` FAIL ${naam} ${extra}`); } };
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

console.log('de lookdata');
for (const [naam, lijst] of [['styles.js', lsEn], ['styles.nl.js', lsNl], ['catalogStyles.js', catEn], ['catalogStyles.nl.js', catNl]]) {
  for (const s of lijst) {
    const k = s.kort || {};
    ok(`${naam} ${s.slug}: kort.kleding, kort.gevoel, kort.kanalen`, ['kleding', 'gevoel', 'kanalen'].every((x) => typeof k[x] === 'string' && k[x].trim().length > 8));
    ok(`${naam} ${s.slug}: elke regel kort (hoogstens 90 tekens) en zonder getal`, ['kleding', 'gevoel', 'kanalen'].every((x) => String(k[x] || '').length <= 90 && !/\d/.test(String(k[x] || ''))));
  }
}
ok('NL en EN hebben dezelfde looks', JSON.stringify(lsEn.map((s) => s.slug)) === JSON.stringify(lsNl.map((s) => s.slug)) && JSON.stringify(catEn.map((s) => s.slug)) === JSON.stringify(catNl.map((s) => s.slug)));
for (const [naam, lijst] of [['catalogStyles.js', catEn], ['catalogStyles.nl.js', catNl]]) {
  for (const s of lijst) {
    ok(`${naam} ${s.slug}: fotos is een lijst van echte beelden`, Array.isArray(s.fotos) && s.fotos.every((f) => isEcht(f)), JSON.stringify(s.fotos));
  }
}
ok('Classic heeft beelden (het raster en het afgewerkte beeld)', catEn.find((s) => s.slug === 'classic').fotos.length >= 2);

console.log('\nde sjablonen');
{
  const ls = lees('src/components/LifestyleStyleDetail.astro');
  const cs = lees('src/components/CatalogStyleDetail.astro');
  /* Sinds 12 oktober 2026 (afvinklijst 8) staan alle lookpagina's in de hal:
     LookDetailHal.astro, met zijn opmaak in hal.css (de regels met .h-lk). */
  const lk = lees('src/components/LookDetailHal.astro');
  const lkCss = lees('src/styles/hal.css').split('\n').filter((l) => /\.h-lk/.test(l)).join('\n');
  for (const [n, src] of [['Lifestyle', ls], ['Catalog', cs]]) {
    ok(`${n}: gebruikt LookDetailHal`, /import LookDetailHal from '\.\/LookDetailHal\.astro'/.test(src) && /<LookDetailHal\b/.test(src));
    ok(`${n}: filtert de beelden met isEcht`, /\.filter\(\(src(: any)?\) => isEcht\(src\)\)/.test(src));
    ok(`${n}: geen getekend vak (ProductScene)`, !/ProductScene/.test(src));
    ok(`${n}: "Kies deze look" / "Choose this look" (of de eigen knoptekst bij een look op aanvraag)`, /style\.orderLabel \?\? 'Kies deze look'/.test(src) && /style\.orderLabel \?\? 'Choose this look'/.test(src));
    ok(`${n}: de proef met de look, tekst uit TEST_SAMPLE`, /\?style=\$\{encodeURIComponent\(style\.slug\)\}/.test(src) && /label: TEST_SAMPLE\[lang\]\.cta/.test(src));
    ok(`${n}: de lange uitleg in het slot "meer"`, /<Fragment slot="meer">/.test(src));
  }
  ok('LookDetailHal: de drie koppen in NL en EN', /kleding: 'Voor welke kleding', gevoel: 'Welk gevoel', kanalen: 'Welke kanalen'/.test(lk) && /kleding: 'What clothing', gevoel: 'What it feels like', kanalen: 'Which channels'/.test(lk));
  ok('LookDetailHal: de uitleg ingeklapt in Disclose (<details>)', /<Disclose summary=\{c\.meer\} tone="plain">\s*<slot name="meer" \/>/.test(lk));
  ok('LookDetailHal: geen beeld wordt bijgesneden (height: auto, geen object-fit)', !/object-fit/.test(lk + lkCss) && /height: auto/.test(lkCss));
  ok('LookDetailHal: geen inline style (strenge CSP)', !/ style=\{|style="/.test(lk.replace(/<style>[\s\S]*<\/style>/, '')));
}

console.log('\nde routes zijn niet aangeraakt');
for (const [p, titel] of [['src/pages/lifestyle/[slug].astro', '— Lifestyle style | VISUAILS'], ['src/pages/catalog/[slug].astro', '— Catalog style | VISUAILS']]) {
  ok(`${p}: titel en meta`, lees(p).includes(titel) && /description=\{metaDescription\(/.test(lees(p)));
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
