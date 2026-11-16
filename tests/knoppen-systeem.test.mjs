/**
 * VISUAILS — het knoppensysteem, in de bron (lijst 88 + 89, 9 november 2026).
 *
 * Lucas koos: de vulling zegt hoe belangrijk een knop is (hoogstens één volle per blok), het icoon zegt wat
 * hij doet (één vast icoon per rol), drie maten (36 · 44 · 52), altijd een pil, en per icoon één beweging van
 * alleen het bewegende deel. Deze toets kijkt in de bron; tests/knoppen-systeem-browser.test.mjs meet de
 * knoppen zelf in de browser.
 *
 *   node tests/knoppen-systeem.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lees = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
let fout = 0;
const ok = (naam, waar, extra = '') => { console.log(`${waar ? 'ok  ' : 'FOUT'} ${naam}${!waar && extra ? `\n     ${extra}` : ''}`); if (!waar) fout += 1; };

/* ── 1 · de iconen ── */
const { IKOON, ikoon, ROL, DEEL, rolIkoon, knopInhoud } = await import('../src/data/iconen.js');
for (const n of ['uploaden', 'ongedaan', 'mail', 'verwijderen', 'uitloggen']) ok(`icoon ${n} staat in het kit`, typeof IKOON[n] === 'string' && IKOON[n].startsWith('M'));
ok('ikoon() houdt zijn vorm: <svg class="ik ik-naam klasse" viewBox 0 0 24 24>', /^<svg class="ik ik-vink extra" viewBox="0 0 24 24" aria-hidden="true" focusable="false">/.test(ikoon('vink', 'extra')));
ok('ikoon() geeft het bewegende deel als <path class="ik-a">', ikoon('vink').includes('<path class="ik-a"'));
for (const [n, k] of Object.entries(DEEL)) {
  const svg = ikoon(n);
  const a = svg.match(/class="ik-a"[^>]*d="([^"]*)"/)[1];
  const r = svg.match(/class="ik-r"[^>]*d="([^"]*)"/);
  ok(`${n}: de eerste ${k} subpaden bewegen (ik-a), de rest staat (ik-r)`, r && (a.match(/M/g) || []).length === k && (a + r[1]).replace(/\s/g, '') === IKOON[n].replace(/\s/g, ''));
}
ok('pijl: schacht en kop allebei ik-a (de pijl beweegt in één stuk)', (ikoon('pijl').match(/class="ik-a ik-(schacht|kop)"/g) || []).length === 2);
ok('ongedaan maken draait als geheel (één pad)', (ikoon('ongedaan').match(/<path/g) || []).length === 1);
const VERWACHT = { doorgaan: 'pijl', bevestigen: 'vink', downloaden: 'downloaden', aanmerken: 'potlood', terugnemen: 'ongedaan', wijzigen: 'potlood', toevoegen: 'plus', uploaden: 'uploaden', navigeren: 'pijl-schuin', terug: 'pijl-links', mail: 'mail', gevaarlijk: 'verwijderen', uitloggen: 'uitloggen' };
ok('elke rol heeft zijn eigen icoon (SPEC-tabel)', Object.entries(VERWACHT).every(([r, i]) => ROL[r] && ROL[r].ik === i), JSON.stringify(ROL));
ok('doorgaan en navigeren: het icoon achter het woord, de rest ervoor', Object.entries(ROL).every(([r, v]) => !!v.na === (r === 'doorgaan' || r === 'navigeren')));
ok('knopInhoud zet het icoon op zijn plek en escapet de tekst', knopInhoud('doorgaan', 'A & B').startsWith('A &amp; B<svg') && knopInhoud('bevestigen', 'x').endsWith('</svg>x'));
ok('rolIkoon geeft niets voor WhatsApp (dat is het officiële icoon)', rolIkoon('contact') === '');

/* ── 2 · één bron ── */
const css = lees('src/styles/knoppen.css');
ok('public/knoppen.css is een letterlijke kopie (node scripts/knoppen-kopie.mjs)', lees('public/knoppen.css') === css);
ok('de site laadt hem (Layout.astro)', /import '\.\.\/styles\/knoppen\.css';/.test(lees('src/layouts/Layout.astro')));
ok('Studio laadt hem (StudioLayout.astro)', /import '\.\.\/styles\/knoppen\.css';/.test(lees('src/layouts/StudioLayout.astro')));
ok('/admin laadt de kopie', lees('src/lib/admin.js').includes('<link rel="stylesheet" href="/knoppen.css">'));
ok('de privélink laadt de kopie', lees('src/lib/portal.js').includes('<link rel="stylesheet" href="/knoppen.css">'));
ok('/knoppen.css wordt niet lang bewaard (no-cache, zoals admin.css)', /\/knoppen\.css\n\s+Cache-Control: no-cache/.test(lees('public/_headers')));

/* ── 3 · wat de laag vastlegt ── */
ok('drie maten: 36, 44, 52', /--k-h: 44px/.test(css) && /--k-h: 36px/.test(css) && /--k-h: 52px/.test(css));
/* lijst 93 (B2 a): knoppen 15 en 13,5; de grote knop is alleen hoger (52), zijn letter 15 (was 16) */
ok('letter 13,5 · 15 (ook groot), DM Sans 600', /--k-l: 15px/.test(css) && /--k-l: 13\.5px/.test(css) && !/--k-l: 16px/.test(css) && /font: 600 var\(--k-l\)/.test(css) && /'DM Sans'/.test(css));
ok('icoon 15 · 18 · 20', /--k-ik: 18px/.test(css) && /--k-ik: 15px/.test(css) && /--k-ik: 20px/.test(css));
/* levering 97 (lijst 96, B1 a "strak", B2 a "alles wat klikt"): scherp, hoeken 0; ook de icoonknoppen, het taal- en menuknopje, WhatsApp en Bestellen */
ok('zacht (levering 99, lijst 100 D3 a): --k-r 8 px, en sectie I zet alles wat klikt op var(--k-r); geen pil-knop meer', /:root \{ --k-r: 8px; \}/.test(css) && /\):not\(#k\):not\(#k\) \{ border-radius: var\(--k-r\) !important; \}/.test(css) && /\.h-cirkel:not\(#k\):not\(#k\) \{ border-radius: 50% !important; \}/.test(css) && !/border-radius: 999px/.test(css.replace(/\/\*[\s\S]*?\*\//g, '')));
ok('focus 2 px blauw uur, 2 px buiten; op inkt blauw licht', /outline: 2px solid var\(--k-blauw\); outline-offset: 2px/.test(css) && /outline-color: var\(--k-blauw-licht\)/.test(css));
ok('vol: inkt; onder de muis schuift blauw uur van links naar rechts (--k-schuif, levering 97)', /--k-schuif: linear-gradient\(90deg, #016645 0 50%, #090D0B 50% 100%\)/.test(css) && /var\(--k-schuif\) 100% 0 \/ 200% 100%/.test(css) && /var\(--k-schuif\) 0 0 \/ 200% 100%/.test(css));
ok('lijn: wit met inset 1,5 px #C6CAC8', /inset 0 0 0 1\.5px var\(--k-lijn\)/.test(css) && /--k-lijn: #C6CAC8/.test(css));
ok('op inkt: lijn wit 6 % met witte lijn 45 %', /rgb\(255 255 255 \/ \.06\); box-shadow: inset 0 0 0 1\.5px rgb\(255 255 255 \/ \.45\)/.test(css));
ok('aanraakscherm: kleine knop minstens 44 (onzichtbare rand van 4 px boven en onder)', /@media \(pointer: coarse\)[\s\S]*inset: -4px 0/.test(css));
ok('de beweging: .26s cubic-bezier(.22,.8,.2,1), alleen .ik-a', /--k-gaan: \.26s cubic-bezier\(\.22, \.8, \.2, 1\)/.test(css) && /\.ik \.ik-a \{ transition: transform var\(--k-gaan\)/.test(css));
ok('per icoon de beweging uit lijst 89 (de pijl 3 px sinds levering 97)', [/\.ik-pijl, \.ik-uitloggen\) \.ik-a \{ transform: translateX\(3px\)/, /\.ik-pijl-links \.ik-a \{ transform: translateX\(-2\.5px\)/, /\.ik-pijl-schuin \.ik-a \{ transform: translate\(2px, -2px\)/,
  /\.ik-downloaden \.ik-a \{ transform: translateY\(2\.5px\)/, /\.ik-uploaden \.ik-a \{ transform: translateY\(-2\.5px\)/, /\.ik-potlood \.ik-a \{ transform: rotate\(-12deg\)/, /\.ik-plus \.ik-a \{ transform: rotate\(90deg\)/,
  /\.ik-ongedaan \.ik-a \{ transform: rotate\(-28deg\)/, /\.ik-mail \.ik-a \{ transform: translateY\(-1\.5px\) scaleY\(\.82\)/, /\.ik-verwijderen \.ik-a \{ transform: translateY\(-1\.5px\) rotate\(-10deg\)/, /:active \.ik-vink \.ik-a \{ transform: scale\(\.82\); transition-duration: \.08s/].every((r) => r.test(css)));
ok('minder beweging: geen transform', /prefers-reduced-motion: reduce\)[\s\S]*transform: none !important/.test(css));
/* kleuren alleen uit KLEURENSCHEMA */
const schema = lees('docs/KLEURENSCHEMA.md').toUpperCase();
const kleuren = [...new Set((css.match(/#[0-9A-Fa-f]{6}\b/g) || []).map((c) => c.toUpperCase()))];
ok(`alle ${kleuren.length} kleuren van knoppen.css staan in KLEURENSCHEMA.md`, kleuren.every((c) => schema.includes(c)), kleuren.filter((c) => !schema.includes(c)).join(' '));

/* ── 4 · de oude beweging en de oude pijlen zijn weg ── */
const hal = lees('src/styles/hal.css');
ok('geen schacht en kop meer die uit elkaar schuiven (hal.css)', !/\.ik-schacht\s*\{\s*translate/.test(hal) && !/:hover \.ik-pijl \.ik-(schacht|kop)/.test(hal));
ok('geen schacht en kop meer die uit elkaar schuiven (maken-80.css)', !/ik-schacht|ik-kop/.test(lees('src/styles/maken-80.css')));
ok('geen pijl als data-URI op .knop-inkt of Bestellen bovenin', !/knop-inkt::after\s*\{[^}]*data:image/.test(hal) && !/nav-cta::after\s*\{[^}]*data:image/.test(hal));
const markup = [];
const loop = (d) => { for (const f of fs.readdirSync(path.join(ROOT, d))) { const p = path.join(d, f); if (fs.statSync(path.join(ROOT, p)).isDirectory()) loop(p); else if (/\.(astro|js)$/.test(f)) markup.push(p); } };
loop('src/components'); loop('src/pages'); loop('src/layouts');
markup.push('src/lib/admin.js', 'src/lib/portal.js', 'src/lib/account.js', 'src/lib/nuzin.js', 'src/lib/feedback.js');
const pijlInKnop = [];
for (const f of markup) {
  lees(f).split('\n').forEach((r, i) => {
    if (/^\s*(\*|\/\/|\/\*)/.test(r)) return;
    for (const m of r.matchAll(/<(a|button|summary)\b[^>]*class="[^"]*\b(k|btn|knop|h-knop|st-link|nu-link)\b[^"]*"[^>]*>([^<]*)/g)) if (/[→←↓]|&rarr;|&larr;|&darr;/.test(m[3])) pijlInKnop.push(`${f}:${i + 1}`);
  });
}
ok('geen getypte pijl (→ ← ↓) meer in een knop of knoplink', pijlInKnop.length === 0, pijlInKnop.slice(0, 8).join(' '));
const nz = lees('src/lib/nuzin.js');
ok('de knopteksten van "wat nu" hebben geen getypte pijl', !/aanmerken: '[^']*↓'|tevreden: '[^']*↓'/.test(nz));

/* ── 5 · /admin: de tweede stap, zonder confirm() ── */
const admin = lees('src/lib/admin.js');
ok('/admin gebruikt nergens confirm()', !/\bconfirm\(/.test(admin) && !/onsubmit=/.test(admin));
const zeker = admin.match(/<details class="k-zeker">[\s\S]*?<\/details>/g) || [];
ok(`elke gevaarlijke knop zit in een tweede stap (${zeker.length})`, zeker.length >= 10 && zeker.every((z) => z.includes('Zeker weten? Dit kan niet terug.') && /<button[^>]*class="btn btn-primary btn-sm" data-rol="gevaarlijk"[^>]*>\$\{rolIkoon\('gevaarlijk'\)\}Ja, /.test(z)));
for (const t of ['Deze bestelling annuleren', 'Deze bestelling verwijderen', 'Alles wissen', 'Deactiveren', 'Rechten intrekken']) {
  ok(`  ${t}: eerst de vraag, pas "Ja, …" verstuurt`, zeker.some((z) => z.includes(`${t}</summary>`)) && !new RegExp(`<button[^>]*>[^<]*${t}</button>`).test(admin.replace(/<details class="k-zeker">[\s\S]*?<\/details>/g, '')));
}
ok('de gevaarlijke knop is geen rood (alleen een lijn met de prullenbak)', !/data-rol="gevaarlijk"[^>]*style=/.test(admin) && !/#A32117/.test(css));
ok('elke .btn in /admin heeft een rol', !/<(button|a|summary)\b[^>]*class="btn\b[^"]*"(?![^>]*data-rol)[^>]*>/.test(admin), (admin.match(/<(button|a|summary)\b[^>]*class="btn\b[^"]*"(?![^>]*data-rol)[^>]*>/) || [''])[0].slice(0, 120));

/* ── 6 · de mails: hoogstens één knop per mail, geen iconen ── */
const { alleMails } = await import('./lib/alle-mails.mjs');
const mails = await alleMails();
const teVeel = mails.filter((m) => ((m.html || '').split('padding:14px 23px').length - 1) > 1).map((m) => m.id);
ok(`elke mail hoogstens één volle knop (${mails.length} mails)`, mails.length > 60 && teVeel.length === 0, teVeel.join(' '));
ok('geen svg of icoon in een mail', mails.every((m) => !/<svg|class="ik\b/.test(m.html || '')));
const mt = lees('src/lib/mailTemplate.js');
ok('de tekstlink van de mail: onderstreept, inkt, 16 px, zonder icoon', /export const tekstLink = [\s\S]*text-decoration:underline/.test(mt));
ok('"Nee, zet dit terug" is een tekstlink', /mailTekstLink\(undoLink, copy\.b\)/.test(lees('src/lib/account.js')));

/* ── 7 · de kleine afwijkingen ── */
ok('"Verstuur bericht" op /contact is een .k (dus 600)', /<button type="submit" class="h-knop k k-vol" data-rol="doorgaan">\{c\.vVerstuur\}/.test(lees('src/components/ContactHal.astro')));
ok('btn-quiet is een lijnpil (de laag noemt hem een lijnknop; Ongedaan maken op de privélink)', /btn-quiet/.test(css) && lees('src/lib/portal.js').includes('class="btn btn-quiet btn-sm" data-rol="terugnemen"'));
ok('de sterren in Studio en op de privélink dezelfde hoek (feedback.css, 10 px)', /\.fb-star \{[\s\S]*?border-radius: 10px;/.test(lees('public/feedback.css')));
ok('keuzeknoppen zonder browserrand (.sk-k, .h-fmt-knop, .h-gl-pil)', /\.hal button\.h-fmt-knop, \.hal button\.h-gl-pil, \.hal button\.sk-k \{ border: 0; \}/.test(hal));

/* ── 8 · elke knop in de bron draagt een rol ── */
const zonderRol = [];
for (const f of markup) {
  if (!/\.astro$/.test(f) && !/(portal|account)\.js$/.test(f)) continue;
  lees(f).split('\n').forEach((r, i) => {
    if (/^\s*(\*|\/\/|\/\*)/.test(r)) return;
    for (const m of r.matchAll(/<(a|button|summary)\b([^>]*)>/g)) {
      const attrs = m[2];
      const klas = (attrs.match(/class=(?:"([^"]*)"|\{`([^`]*)`\})/) || []).slice(1).join(' ').replace(/\$\{[^}]*\}/g, ' ');
      if (!klas.split(/\s+/).some((c) => ['k', 'btn', 'knop', 'h-knop'].includes(c))) continue;
      if (/\bcc-btn\b|\bmenu-toggle\b|\bnav-/.test(attrs)) continue;
      if (!/data-rol=/.test(attrs)) zonderRol.push(`${f}:${i + 1}`);
    }
  });
}
ok('elke knop (.k, .btn, .knop, .h-knop) in de bron heeft data-rol', zonderRol.length === 0, zonderRol.slice(0, 10).join(' '));

console.log(fout ? `\n${fout} fout(en)` : '\nalles goed');
process.exit(fout ? 1 : 0);
