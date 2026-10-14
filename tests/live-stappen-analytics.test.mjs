/* VISUAILS — twee live-stappen uit afvinklijst 3 (11 oktober 2026): Workers Paid
 * vóór de lancering (w1 = a) en Web Analytics alleen na toestemming (cfo14).
 *   node tests/live-stappen-analytics.test.mjs      (geen server; leest dist/_headers als die er is)
 *
 * De stap zegt: zet PUBLIC_CF_ANALYTICS_TOKEN in .env en rol uit. Dat werkt
 * alleen als de site die variabele bij het bouwen leest, de beacon pas na "ja"
 * laadt, en de CSP zijn twee hosts (script en meting) toestaat. Dat ligt hier vast.
 */
import { readFileSync, existsSync } from 'node:fs';
import { SCRIPT_HOSTS, CONNECT_HOSTS } from '../scripts/csp-scripts.mjs';
import { ui } from '../src/i18n/ui.js';

let goed = 0, fout = 0;
const ok = (naam, w, v = true) => {
  const p = JSON.stringify(w) === JSON.stringify(v);
  if (p) goed++; else fout++;
  console.log(`${p ? '  ok ' : 'FAIL'}  ${naam}${p ? '' : `    verwacht ${JSON.stringify(v)} kreeg ${JSON.stringify(w)}`}`);
};
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const stappen = lees('kladblok/LIVE-STAPPEN.md');
const sectie = (kop) => { const i = stappen.indexOf(kop); const j = stappen.indexOf('\n## ', i + 1); return i < 0 ? '' : stappen.slice(i, j < 0 ? undefined : j); };

console.log('\nWorkers Paid');
const s9 = sectie('## 9 · Live');
ok('in stap 9, vóór 9a', s9.includes('Workers Paid ($5 per maand)') && s9.indexOf('Workers Paid') < s9.indexOf('**9a ·'));
ok('waar het zit en wiens keuze het is', /Workers & Pages\*\* → \*\*Plans\*\*/.test(s9) && /afvinklijst 3 \(w1\)/.test(s9));
ok('en WORKERS_PLAN gaat mee', /WORKERS_PLAN/.test(s9));

console.log('\nWeb Analytics');
const s6c = sectie('## 6c · Web Analytics');
ok('stap 6c staat tussen 6b en 7', stappen.indexOf('## 6b ·') < stappen.indexOf('## 6c ·') && stappen.indexOf('## 6c ·') < stappen.indexOf('## 7 ·'));
ok('ook in het overzicht bovenaan', /\| 6c \| Web Analytics/.test(stappen));
ok('de regel voor .env, letterlijk', s6c.includes('`PUBLIC_CF_ANALYTICS_TOKEN=313a5e2e507840b8a99086181052cde1`'));
ok('zegt dat het geen geheim is', /geen geheim/.test(s6c));
ok('en dat hij daarna uitrolt', /UITROLLEN\.bat/.test(s6c));
ok('de knoppen heten zoals in de cookiemelding', s6c.includes(`**${ui.nl.cc_accept}**`) && s6c.includes(`**${ui.nl.cc_reject}**`));
ok('geen commando om te typen', /npm |npx |wrangler /.test(s6c), false);

console.log('\nwat de stap aanneemt over de site');
const layout = lees('src/layouts/Layout.astro');
ok('Layout leest PUBLIC_CF_ANALYTICS_TOKEN bij het bouwen', /import\.meta\.env\.PUBLIC_CF_ANALYTICS_TOKEN/.test(layout));
ok('  en geeft hem aan consent.js, niet als eigen <script src>', /initConsent\(window\.__VIS_CF_TOKEN\)/.test(layout) && !/<script[^>]+cloudflareinsights/.test(layout));
const consent = lees('src/scripts/consent.js');
ok('consent.js hangt de beacon zelf aan', /static\.cloudflareinsights\.com\/beacon\.min\.js/.test(consent));
ok('CSP script-src: static.cloudflareinsights.com', SCRIPT_HOSTS.includes('https://static.cloudflareinsights.com'));
ok('CSP connect-src: cloudflareinsights.com (de meting zelf)', CONNECT_HOSTS.includes('https://cloudflareinsights.com'));
ok('.env gaat niet mee naar git', /^\.env\*?$/m.test(lees('.gitignore')));
if (existsSync(new URL('../dist/_headers', import.meta.url))) {
  const h = lees('dist/_headers');
  ok('gebouwd: script-src met de beaconhost', /script-src[^;\n]*https:\/\/static\.cloudflareinsights\.com/.test(h));
  ok('gebouwd: connect-src met de meethost', /connect-src[^;\n]*https:\/\/cloudflareinsights\.com/.test(h));
} else console.log('  --   dist/_headers ontbreekt (niet gebouwd), overgeslagen');

console.log(`\n${goed}/${goed + fout} geslaagd`);
if (fout) process.exit(1);
