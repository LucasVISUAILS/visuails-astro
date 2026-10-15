/* VISUAILS — geen data:-beelden in de css van de panelen
 *   node tests/paneel-beelden.test.mjs
 * ══════════════════════════════════════════════════════════════════════════════
 * WAAROM DEZE TOETS BESTAAT — 14 OKTOBER 2026 (doorloop 27, B02)
 * ══════════════════════════════════════════════════════════════════════════════
 * Elke keuzelijst in /admin, VISUAILS Studio en de privélink had geen pijltje.
 * Het pijltje was een `url("data:image/svg+xml,…")` in --select-caret, en de
 * CSP van die drie panelen zegt `img-src 'self'` — een data:-adres is niet
 * 'self'. De browser weigerde het stil (alleen een regel in de console), en de
 * keuzelijst zag eruit als een tekstveld.
 *
 * De pijltjes staan nu als bestand in public/img/ui/. Deze toets houdt het zo:
 * geen data:-beeld in de css die onder die CSP geladen wordt, en elk
 * /img/ui/-bestand waar die css naar wijst bestaat ook echt.
 */
import { readFileSync, existsSync } from 'node:fs';

let pass = 0, fail = 0;
function ok(naam, waar, kreeg = '') {
  if (waar) { pass += 1; console.log(` ok   ${naam}`); }
  else { fail += 1; console.log(`FAIL   ${naam}`.padEnd(70) + kreeg); }
}

/* De css die onder `img-src 'self'` draait: admin.js, account.js en portal.js
   zetten die kop (zie de CSP-regels daar). studio.css en studio-hal.css komen
   via account.css-pagina's mee. */
const BESTANDEN = ['public/admin.css', 'public/account.css', 'public/portal.css', 'src/styles/studio.css', 'src/styles/studio-hal.css'];
/* global.css en hal.css komen via de Astro-pagina's van Studio (/account/plan)
   ook onder die CSP; daar telt alleen het pijltje (de korrel en het woordmerk
   zijn data:-beelden op de publieke site, waar de CSP ze toelaat). */
const PIJL_IN = ['src/styles/global.css', 'src/styles/hal.css'];

for (const pad of BESTANDEN) {
  const bron = readFileSync(new URL(`../${pad}`, import.meta.url), 'utf8');
  const code = bron.replace(/\/\*[\s\S]*?\*\//g, '');
  const data = [...code.matchAll(/url\(\s*["']?data:/g)].length;
  ok(`${pad} · geen data:-beeld`, data === 0, `${data} keer url(data:…)`);
  for (const m of code.matchAll(/url\(\s*["']?(\/img\/ui\/[^"')]+)["']?\s*\)/g)) {
    ok(`${pad} · ${m[1]} bestaat`, existsSync(new URL(`../public${m[1]}`, import.meta.url)), 'ontbreekt in public/');
  }
}

for (const pad of PIJL_IN) {
  const code = readFileSync(new URL(`../${pad}`, import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const pijlData = [...code.matchAll(/--select-caret:\s*url\(\s*["']?data:/g)].length;
  ok(`${pad} · het keuzepijltje is een bestand`, pijlData === 0, `${pijlData} keer --select-caret: url(data:…)`);
  for (const m of code.matchAll(/url\(\s*["']?(\/img\/ui\/[^"')]+)["']?\s*\)/g)) {
    ok(`${pad} · ${m[1]} bestaat`, existsSync(new URL(`../public${m[1]}`, import.meta.url)), 'ontbreekt in public/');
  }
}
/* Het pijltje moet ook getekend wórden: in admin.css wist een
   `input[…], textarea, select { background: … }` de background-image. */
const adminCss = readFileSync(new URL('../public/admin.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
ok('admin.css · html body select zet het pijltje terug', /html body select \{[^}]*background-image: var\(--select-caret\)/.test(adminCss));

/* En de CSP zelf: staat er ooit data: bij img-src van admin, dan mag deze toets
   weg — maar dan bewust. */
const admin = readFileSync(new URL('../src/lib/admin.js', import.meta.url), 'utf8');
ok('admin.js · img-src is alleen self', /img-src 'self';/.test(admin), 'img-src veranderd?');

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exitCode = 1;
