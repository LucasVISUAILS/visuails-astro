/*
 * VISUAILS — BRITSE EN AMERIKAANSE SPELLING DOOR ELKAAR. 22 augustus 2026.
 * ═══════════════════════════════════════════════════════════════════════════
 * De Engelse tekst op deze site is Brits ("colour", "organised"). Eén
 * Amerikaanse variant ertussen valt niemand op als losse fout, maar samen
 * lezen ze als een site die door twee mensen is geschreven. Deze controle legt
 * per woordpaar naast elkaar hoe vaak elke variant voorkomt.
 *
 * "Catalog" is met opzet Amerikaans: het is de PRODUCTNAAM van de dienst en
 * staat in beide talen zo. Die staat daarom in de uitzonderingen.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'parse5';
const SKIP = new Set(['script','style','noscript','template','svg','head','code','kbd']);
const walk = (n, f) => { f(n); for (const c of n.childNodes || []) walk(c, f); };
const tekst = (n, out = []) => {
  if (n.nodeName === '#text') { out.push(n.value); return out; }
  if (SKIP.has(n.nodeName)) return out;
  for (const c of n.childNodes || []) tekst(c, out);
  return out;
};
const PAREN = [
  ['colour', 'color'], ['colours', 'colors'], ['coloured', 'colored'],
  ['organise', 'organize'], ['organised', 'organized'], ['organisation', 'organization'],
  ['recognise', 'recognize'], ['recognised', 'recognized'],
  ['licence', 'license'], ['licences', 'licenses'],
  ['centre', 'center'], ['centres', 'centers'],
  ['favourite', 'favorite'], ['behaviour', 'behavior'],
  ['catalogue', 'catalog'], ['catalogues', 'catalogs'],
  ['grey', 'gray'], ['metre', 'meter'], ['programme', 'program'],
  ['analyse', 'analyze'], ['practise', 'practice'],
  ['travelling', 'traveling'], ['cancelled', 'canceled'], ['labelled', 'labeled'],
  ['jewellery', 'jewelry'], ['modelling', 'modeling'],
];
const paden = [];
(function loop(d, rel) { for (const e of readdirSync(d, { withFileTypes: true })) {
  if (e.isDirectory()) loop(join(d, e.name), `${rel}${e.name}/`);
  else if (e.name === 'index.html') paden.push([`/${rel}`, join(d, e.name)]);
} }('dist', ''));

const tel = new Map();
for (const [url, f] of paden) {
  if (url.startsWith('/nl/')) continue;      // alleen de Engelse kant
  const doc = parse(readFileSync(f, 'utf8'));
  let body = null; walk(doc, (n) => { if (n.nodeName === 'body' && !body) body = n; });
  if (!body) continue;
  const t = tekst(body).join(' ').toLowerCase();
  for (const [gb, us] of PAREN) {
    for (const [w, soort] of [[gb, 'GB'], [us, 'US']]) {
      const n = (t.match(new RegExp(`\\b${w}\\b`, 'g')) || []).length;
      if (!n) continue;
      const k = `${gb}|${us}`;
      if (!tel.has(k)) tel.set(k, { GB: 0, US: 0, gbPag: new Set(), usPag: new Set() });
      tel.get(k)[soort] += n;
      tel.get(k)[soort === 'GB' ? 'gbPag' : 'usPag'].add(url);
    }
  }
}
console.log('\nBRITS TEGEN AMERIKAANS — alleen de Engelse pagina\'s\n');
let gemengd = 0;
for (const [k, v] of tel) {
  const [gb, us] = k.split('|');
  const beide = v.GB > 0 && v.US > 0;
  if (beide) gemengd++;
  const merk = gb === 'catalogue' || gb === 'catalogues';
  console.log(`${beide ? (merk ? 'merk ' : 'MIX  ') : '     '} ${gb.padEnd(14)} ${String(v.GB).padStart(4)}×   ${us.padEnd(14)} ${String(v.US).padStart(4)}×`);
  if (beide && !merk) {
    console.log(`        GB op: ${[...v.gbPag].slice(0, 5).join(' ')}`);
    console.log(`        US op: ${[...v.usPag].slice(0, 5).join(' ')}`);
  }
}
console.log(`\n${gemengd} woordpaar(en) waarvan beide varianten voorkomen.`);
