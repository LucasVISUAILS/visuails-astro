/*
 * VISUAILS — de lettermaten (levering 94, 12 november 2026, lijst 93).
 *
 * Lucas (lijst 92): "de tekst groottes over de gehele website mogen ook op consistentie gecontroleerd worden". Gemeten op
 * 92 pagina's: onder de 17 px stonden 24 verschillende maten, tot twaalf op één pagina. Lijst 93 (A2 a, B2 a, C1 b): vier
 * maten voor alle tekst onder de koppen, op de site, het bestelformulier, Studio en de privélink (niet /admin):
 *   lopend 17 · klein 15 · fijn 13,5 · label 12 (ook de mono-labels, in 600); knoppen 15 en 13,5.
 *
 * Deze toets leest de bron: elke font-size en elk font in px of rem van 11,5 tot 16,75 px moet een van de vier zijn (of
 * het token). Vanaf 16,8 px (1,05 rem) is het een kleine kop (de subkoppen van het formulier), die tellen niet. Wat niet telt: het nagemaakte laptopscherm (.sc-…: dat is een foto van een winkel op schermmaat), em en
 * procenten (die volgen hun ouder), en clamp/min/max (koppen die meeschalen).
 *
 *   node tests/lettermaten-94.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let goed = 0, fout = 0;
const ok = (naam, c, extra = '') => { if (c) goed++; else fout++; console.log(`${c ? ' ok  ' : ' FAIL'} ${naam}${c || !extra ? '' : ` — ${extra}`}`); };
const loop = (d, uit = []) => { for (const n of fs.readdirSync(d)) { const v = path.join(d, n); if (fs.statSync(v).isDirectory()) loop(v, uit); else uit.push(v); } return uit; };

const bestanden = [
  ...loop(path.join(ROOT, 'src', 'styles')).filter((f) => f.endsWith('.css')),
  ...loop(path.join(ROOT, 'src', 'components')).filter((f) => f.endsWith('.astro')),
  ...loop(path.join(ROOT, 'src', 'layouts')).filter((f) => f.endsWith('.astro')),
  ...loop(path.join(ROOT, 'src', 'pages')).filter((f) => f.endsWith('.astro')),
].filter((f) => !/admin/i.test(path.relative(ROOT, f)));

const MATEN = new Set([12, 13.5, 15, 17]);
const mis = [];
for (const f of bestanden) {
  let s = fs.readFileSync(f, 'utf8');
  if (f.endsWith('.astro')) s = (s.match(/<style[^>]*>[\s\S]*?<\/style>/g) || []).join('\n');
  for (const m of s.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
    const sel = m[1].trim().split('\n').pop().trim(), body = m[2];
    if (/\.sc-|@font-face|keyframes/.test(sel)) continue;
    const px = [];
    for (const k of body.matchAll(/font-size:\s*(\d*\.?\d+)(px|rem)\s*(?:!important)?\s*(?:;|$)/g)) px.push(+k[1] * (k[2] === 'rem' ? 16 : 1));
    for (const k of body.matchAll(/font:\s*(?:italic\s+)?\d{3}\s+(\d*\.?\d+)(px|rem)\b/g)) px.push(+k[1] * (k[2] === 'rem' ? 16 : 1));
    for (const p of px) if (p >= 11.5 && p < 16.75 && !MATEN.has(Math.round(p * 100) / 100)) mis.push(`${path.relative(ROOT, f)} · ${sel.slice(0, 60)} · ${p}px`);
  }
}
ok(`elke lettermaat onder de 17 px is 15, 13,5 of 12 (${bestanden.length} bestanden)`, mis.length === 0, `${mis.length}: ${mis.slice(0, 6).join(' | ')}`);

const g = fs.readFileSync(path.join(ROOT, 'src', 'styles', 'global.css'), 'utf8');
ok('de vier tokens staan in global.css (:root): lopend 17, klein 15, fijn 13,5, label 12',
  /--h-t-lopend:\s*17px/.test(g) && /--h-t-klein:\s*15px/.test(g) && /--h-t-fijn:\s*13\.5px/.test(g) && /--h-t-label:\s*12px/.test(g));

const mono500 = [];
for (const f of bestanden) {
  const s = fs.readFileSync(f, 'utf8');
  for (const m of s.matchAll(/font:\s*500 (?:var\(--h-t-label\)|12px)[^;]*var\(--h-mono\)/g)) mono500.push(path.relative(ROOT, f));
}
ok('de mono-labels in één stem: 12 px in 600 (lijst 93, B2 a)', mono500.length === 0, mono500.slice(0, 4).join(' | '));

const b = fs.readFileSync(path.join(ROOT, 'src', 'styles', 'banner-94.css'), 'utf8');
ok('de banner volgt (lijst 93, C2): de stap en de zin 15, het nummer en het hoekje 12',
  /\.b94-tx \{ font: 600 var\(--h-t-klein\)/.test(b) && /\.b94-zin \{[^}]*font: 400 var\(--h-t-klein\)/.test(b) && /\.b94-nr \{ font: 600 var\(--h-t-label\)/.test(b) && /font: 600 var\(--h-t-label\)\/1\.3 var\(--h-mono\)/.test(b));

console.log(`\n${goed} goed, ${fout} fout`);
process.exit(fout ? 1 : 0);
