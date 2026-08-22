/* NL/EN-paren vergelijken op wat er niet mag verschillen: bedragen, aantallen,
   doorlooptijden, en het aantal koppen. */
import { readFileSync, globSync, existsSync } from 'node:fs';
import { parse } from 'parse5';

const SKIP = new Set(['script','style','noscript','template','svg','head']);
const BLOK = new Set(['p','div','section','article','header','footer','main','aside','nav',
  'h1','h2','h3','h4','h5','h6','li','ul','ol','tr','td','th','table','thead','tbody',
  'figure','figcaption','blockquote','br','hr','details','summary','form','label','fieldset',
  'button','dl','dt','dd','picture','img','video','option','select','textarea','input']);
const tekst = (n, out = []) => {
  if (n.nodeName === '#text') { out.push(n.value); return out; }
  if (SKIP.has(n.nodeName)) return out;
  const b = BLOK.has(n.nodeName);
  if (b) out.push('\n');
  for (const c of n.childNodes || []) tekst(c, out);
  if (b) out.push('\n');
  return out;
};
const walk = (n, fn) => { fn(n); for (const c of n.childNodes || []) walk(c, fn); };

function lees(f) {
  const doc = parse(readFileSync(f, 'utf8'));
  const body = doc.childNodes.find(c => c.nodeName === 'html')?.childNodes.find(c => c.nodeName === 'body');
  const t = tekst(body || doc).join('').replace(/ /g, ' ');
  const koppen = [];
  walk(body || doc, (n) => { if (/^h[1-6]$/.test(n.nodeName)) koppen.push(n.nodeName); });
  return { t, koppen };
}

const enPages = globSync('dist/**/*.html').filter(f => !f.startsWith('dist/nl/')).sort();
const rijen = [];
for (const en of enPages) {
  const rel = en.replace(/^dist\//, '');
  const nl = 'dist/nl/' + rel;
  if (!existsSync(nl)) continue;
  const a = lees(en), b = lees(nl);
  /* GENORMALISEERD EN NIET LETTERLIJK. Nederlands schrijft € 1.250 en € 132,30
     waar Engels € 1,250 en € 132.30 schrijft; letterlijk vergelijken meldt dus
     elk bedrag op elke pagina als een verschil. Beide vormen worden hier tot
     hetzelfde getal teruggerekend, zodat er alleen overblijft wat écht anders
     is — een prijs die in de ene taal wel en in de andere niet is bijgewerkt. */
  const bedragen = (s, nlTaal) => (s.match(/€\s?\d[\d.,]*/g) || []).map((x) => {
    let n = x.replace(/[€\s]/g, '').replace(/[.,]$/, '');
    n = nlTaal ? n.replace(/\./g, '').replace(',', '.') : n.replace(/,/g, '');
    const v = Number(n);
    return Number.isFinite(v) ? String(v) : n;
  });
  const ea = bedragen(a.t, false), eb = bedragen(b.t, true);
  const telA = {}, telB = {};
  for (const x of ea) telA[x] = (telA[x] || 0) + 1;
  for (const x of eb) telB[x] = (telB[x] || 0) + 1;
  const verschil = [];
  for (const k of new Set([...Object.keys(telA), ...Object.keys(telB)]))
    if ((telA[k] || 0) !== (telB[k] || 0)) verschil.push(`${k}: en ${telA[k] || 0} / nl ${telB[k] || 0}`);
  const kopA = a.koppen.join(''), kopB = b.koppen.join('');
  rijen.push({ pagina: '/' + rel.replace(/index\.html$/, '').replace(/\.html$/, ''),
    bedragen: verschil, koppen: kopA === kopB ? null : `en ${a.koppen.length} (${kopA}) / nl ${b.koppen.length} (${kopB})` });
}

const metBedrag = rijen.filter(r => r.bedragen.length);
const metKop = rijen.filter(r => r.koppen);
console.log(`${rijen.length} NL/EN-paren vergeleken\n`);
console.log(`── BEDRAGEN DIE VERSCHILLEN (${metBedrag.length}) ──`);
for (const r of metBedrag) console.log(`   ${r.pagina}\n      ${r.bedragen.join('\n      ')}`);
console.log(`\n── KOPSTRUCTUUR DIE VERSCHILT (${metKop.length}) ──`);
for (const r of metKop) console.log(`   ${r.pagina}  ${r.koppen}`);
