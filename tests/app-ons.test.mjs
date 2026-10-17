/*
 * 1.08 · "KOM JE ER NIET UIT? APP ONS" ONDER ELKE STAP — 8 oktober 2026
 *
 * Onder elke stap van het bestelformulier één gewone wa.me-link. Het
 * klaargezette bericht noemt de stap en de bestelling, in de taal van de
 * pagina, en NOOIT persoonsgegevens: een link met tekst erin kan iedereen zien.
 *
 * Twee lagen:
 *   1 · de bron: het script vult alleen stap, dienst en aantal in, en leest
 *       geen enkel veld met gegevens van de klant;
 *   2 · de gebouwde pagina's (dist/): op /start/catalog, /start/lifestyle en
 *       /test-sample, NL en EN, staat onder elke stap precies één link, naar het
 *       nummer uit src/data/whatsapp.js, met een bericht dat bij die stap hoort.
 *
 * Leest dist/, dus eerst bouwen ($S/zwaar.sh npx astro build). Start zelf geen
 * server of browser: node tests/app-ons.test.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { WHATSAPP_NUMBER } from '../src/data/whatsapp.js';

let pass = 0;
let fail = 0;
function ok(name, got, want = true) {
  const good = JSON.stringify(got) === JSON.stringify(want);
  if (good) pass++; else fail++;
  console.log(`${good ? ' ok  ' : ' FAIL'} ${name.padEnd(72)}${good ? '' : `verwacht ${JSON.stringify(want)}, kreeg ${JSON.stringify(got)}`}`);
}
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

console.log('\n1.08 — "App ons" onder elke stap\n');

/* ── 1 · DE BRON ─────────────────────────────────────────────────────────── */
console.log('de bron');
const pipe = lees('src/scripts/pipeline.js');
const flow = lees('src/components/order/OrderFlow.astro');
const fn = (pipe.match(/function syncAppOns\(\) \{[\s\S]*?\n\}/) || [''])[0];
ok('pipeline.js heeft syncAppOns()', fn.length > 0);
ok('syncAppOns() leest geen klantvelden (naam, merk, e-mail, telefoon, adres, btw)',
  !/first_name|last_name|brand|email|phone|address|postal|city|vat|reg_number|value\(|\.value\b/.test(fn));
ok('syncAppOns() gebruikt waHref() uit whatsapp.js (het ene nummer)', /waHref\(c\('appOns\.bericht'/.test(fn) && /import \{ waHref \} from '\.\.\/data\/whatsapp\.js'/.test(pipe));
ok('het aantal komt erbij als het bekend is, niet bij de proef', /!cfg\.sample && Number\.isInteger\(n\) && n > 0/.test(fn));
ok('syncTotal() roept syncAppOns() aan (het aantal verandert daar)', /syncAppOns\(\);\s*paintPlan\(kind, n\);/.test(pipe));
ok('de regel is een gewone link met target en de zin "nieuw tabblad"',
  (flow.match(/<p class="pl-appons">\{f\.appOns\.vraag\} <a href=\{appOnsHref\([^)]*\)\} data-pl-appons=[^>]*target="_blank" rel="noopener">\{f\.appOns\.link\}<NieuwTabblad lang=\{lang\} \/><\/a><\/p>/g) || []).length, 5);
ok('geen tijdsbelofte in de regel', !/appOns: \{ vraag: '[^']*(uur|minuut|hour|minute|binnen|within)/.test(flow));
ok('NL en EN', /appOns: \{ vraag: 'Kom je er niet uit\?', link: 'App ons' \}/.test(flow) && /appOns: \{ vraag: 'Stuck\?', link: 'Message us on WhatsApp' \}/.test(flow));

/* ── 2 · DE GEBOUWDE PAGINA'S ─────────────────────────────────────────────── */
console.log('\nde gebouwde pagina\'s');
if (!existsSync(new URL('../dist/start/catalog/index.html', import.meta.url))) {
  ok('dist/ bestaat (bouw eerst: npx astro build)', false);
} else {
  const PAGINAS = [
    ['dist/start/catalog/index.html', 'en', 5, /of a catalog order\.$/],
    ['dist/nl/start/catalog/index.html', 'nl', 5, /van een catalogbestelling\.$/],
    ['dist/start/lifestyle/index.html', 'en', 5, /of a lifestyle order\.$/],
    ['dist/nl/start/lifestyle/index.html', 'nl', 5, /van een lifestylebestelling\.$/],
    ['dist/test-sample/index.html', 'en', 4, /of the trial \(Try VISUAILS · €\s?1\)\.$/],
    ['dist/nl/test-sample/index.html', 'nl', 4, /van de proef \(Probeer VISUAILS · €\s?1\)\.$/],
  ];
  const NAMEN = {
    en: { 5: ['order', 'photos', 'details', 'timing', 'payment'], 4: ['order', 'photos', 'details', 'payment'] },
    nl: { 5: ['bestelling', 'foto’s', 'gegevens', 'levertijd', 'betalen'], 4: ['bestelling', 'foto’s', 'gegevens', 'betalen'] },
  };
  for (const [pad, taal, stappen, slot] of PAGINAS) {
    const html = lees(pad);
    /* Elke stap: de sectie met data-pl-step="n" en de link met data-pl-appons="n". */
    const links = [...html.matchAll(/<a href="([^"]+)" data-pl-appons="(\d)"/g)].map((m) => [Number(m[2]), m[1].replace(/&amp;/g, '&')]);
    ok(`${pad}: één link per stap (${stappen})`, links.map(([n]) => n), Array.from({ length: stappen }, (_, i) => i + 1));
    let nummer = true;
    let bericht = true;
    let privé = true;
    for (const [n, href] of links) {
      const u = new URL(href);
      if (`${u.origin}${u.pathname}` !== `https://wa.me/${WHATSAPP_NUMBER}`) nummer = false;
      const tekst = u.searchParams.get('text') || '';
      const begin = taal === 'nl' ? `Hallo, ik zit bij stap ${n} (${NAMEN.nl[stappen][n - 1]}) ` : `Hello, I am at step ${n} (${NAMEN.en[stappen][n - 1]}) `;
      if (!tekst.startsWith(begin) || !slot.test(tekst)) { bericht = false; console.log('   ', tekst); }
      if (/@|\+31|\d{6,}|NL\d{9}B/.test(tekst)) privé = false;
    }
    ok(`${pad}: alle links naar het nummer uit whatsapp.js`, nummer);
    ok(`${pad}: bericht noemt stap, stapnaam en dienst, in het ${taal === 'nl' ? 'Nederlands' : 'Engels'}`, bericht);
    ok(`${pad}: geen persoonsgegevens in het bericht`, privé);
    /* Stap 2: alleen deze ene regel erbij. */
    const stap2 = (html.split('data-pl-step="2"')[1] || '').split('data-pl-step="3"')[0];
    ok(`${pad}: in stap 2 precies één App-ons-regel`, (stap2.match(/class="pl-appons"/g) || []).length, 1);
  }
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
