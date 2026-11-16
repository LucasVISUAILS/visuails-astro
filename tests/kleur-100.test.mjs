/**
 * Levering 100 (14 november 2026, lijst 104): zwart, wit en mint.
 * Bewaakt dat de oude kleuren niet terugkomen in de site: blauw uur #25508B, blauw diep #1A4279, blauw licht #80A7DD,
 * de snede-fade #2D61A8, het oude inkt #0B0F17 en #0F1217, en de oude grond #FBFCFF. Ook als rgb().
 * Uitgezonderd (fase 6, de mails en de factuur): src/lib/mailTemplate.js en src/lib/invoicePdf.js.
 * En: kleur-100.css staat als voorlaatste stijlblad (kaart-100.css komt erna) in Layout.astro, met de zwarte voet, Bestellen in mint en de selectie in mint 300.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WORTEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let goed = 0, fout = 0;
const ok = (naam, waar, extra = '') => { if (waar) { goed++; console.log(' ok   ' + naam); } else { fout++; console.log(' FAIL ' + naam + (extra ? ' — ' + extra : '')); } };

const OUD = ['25508B', '1A4279', '80A7DD', '2D61A8', '0B0F17', '0F1217', 'FBFCFF'];
const OUD_RGB = [[37, 80, 139], [26, 66, 121], [128, 167, 221], [45, 97, 168], [11, 15, 23], [15, 18, 23], [251, 252, 255]];
const UIT = new Set(['src/lib/mailTemplate.js', 'src/lib/invoicePdf.js']);
const bestanden = [];
const loop = (d) => { for (const n of fs.readdirSync(path.join(WORTEL, d), { withFileTypes: true })) { const p = path.join(d, n.name); if (n.isDirectory()) loop(p); else if (/\.(css|astro|js|ts|mjs|svg|json)$/.test(n.name)) bestanden.push(p.split(path.sep).join('/')); } };
loop('src');
for (const n of fs.readdirSync(path.join(WORTEL, 'public'))) if (n.endsWith('.css')) bestanden.push('public/' + n);

const hexRe = new RegExp('(?:#|%23)(' + OUD.join('|') + ')(?![0-9a-f])', 'gi');   /* ook in data-uri's (%23) */
const rgbRe = /rgba?\(\s*(\d+)(?:\s*,\s*|\s+)(\d+)(?:\s*,\s*|\s+)(\d+)/g;
const gevonden = [];
for (const f of bestanden) {
  if (UIT.has(f)) continue;
  const s = fs.readFileSync(path.join(WORTEL, f), 'utf8');
  /* de laptopschermen tonen de winkel van een klant en houden hun eigen kleuren (plan, open vraag 1): regels voor .sc… en
     .hl-scherm tellen niet mee */
  const zonderSchermen = s.split('\n').filter((r) => !/\.(sc|sc-[a-z-]+|hl-scherm[a-z-]*|hl-laag)\b/.test(r)).join('\n');
  for (const m of zonderSchermen.matchAll(hexRe)) gevonden.push(`${f}: #${m[1]}`);
  for (const m of zonderSchermen.matchAll(rgbRe)) { const t = [+m[1], +m[2], +m[3]]; if (OUD_RGB.some((o) => o.every((v, i) => v === t[i]))) gevonden.push(`${f}: rgb(${t.join(' ')})`); }
}
ok(`geen blauw uur, oud inkt of oude grond meer in ${bestanden.length} bestanden van de site`, gevonden.length === 0, gevonden.slice(0, 6).join(' · '));

const layout = fs.readFileSync(path.join(WORTEL, 'src/layouts/Layout.astro'), 'utf8');
const imports = [...layout.matchAll(/^import '\.\.\/styles\/([^']+)';/gm)].map((m) => m[1]);
/* levering 108: na kaart-100.css komen alleen nog kaart-108.css (de tekst op de nieuwe kaarten) en telefoon-115.css (de telefoon
   in het midden); geen van beide zet een kleur van de site zelf */
const NA_KAART = ['kaart-108.css', 'telefoon-115.css'];
const kern = imports.filter((i) => !NA_KAART.includes(i));
ok('kleur-100.css en daarna kaart-100.css zijn de laatste stijlbladen in Layout.astro (daarna alleen kaart-108 en telefoon-115)', kern[kern.length - 2] === 'kleur-100.css' && kern[kern.length - 1] === 'kaart-100.css' && imports.slice(-NA_KAART.length).every((i) => NA_KAART.includes(i)), imports.slice(-4).join(', '));

const css = fs.readFileSync(path.join(WORTEL, 'src/styles/kleur-100.css'), 'utf8');
ok('de voet is zwart #090D0B', /\.site-footer \{[^}]*background: #090D0B/.test(css));
ok('Bestellen in de balk is mint #3DFFB0, onder de muis #1FEA9C', /\.nav-cta[\s\S]*?background: #3DFFB0/.test(css) && /#1FEA9C/.test(css));
ok('geselecteerde tekst: mint 300 met zwart', /::selection[^{]*\{ background: #9DF5D2; color: #090D0B; \}/.test(css));

console.log(`\n${goed} goed, ${fout} fout`);
process.exit(fout ? 1 : 0);
