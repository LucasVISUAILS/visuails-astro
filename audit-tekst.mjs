/* Eenmalige controleronde over dist/ — statisch, geen browser. */
import { readFileSync, globSync } from 'node:fs';
import { parse } from 'parse5';

const files = globSync('dist/**/*.html').sort();
const SKIP_TAGS = new Set(['script','style','noscript','template','svg','head']);
/* Blokgrenzen worden een NIEUWE REGEL en geen spatie. Anders plakt het slot van de
   ene alinea aan het begin van de volgende en meldt de controle "for you ," als
   een spatie vóór een komma terwijl er in de pagina niets aan de hand is. */
const BLOK = new Set(['p','div','section','article','header','footer','main','aside','nav',
  'h1','h2','h3','h4','h5','h6','li','ul','ol','tr','td','th','table','thead','tbody',
  'figure','figcaption','blockquote','br','hr','details','summary','form','label','fieldset',
  'button','dl','dt','dd','picture','img','video','option','select','textarea','input']);

/* Sommige <span>'s zijn met CSS een blok — de regels van een <h1>, de regels
   binnen een zwevende notitie. Voor de parser zijn het inline-elementen, dus
   plakte "…klaar.Wij leveren…" aan elkaar en meldde deze controle een punt
   zonder spatie die op het scherm niet bestaat. */
const BLOK_KLASSE = /\b(nt-p|hv-line|hv-q-row|hv-q-foot)\b/;
/* Klassen waarvan niet het element zelf maar zijn KINDEREN display:block zijn.
   `.hv-promise-h span, .hv-promise-h em { display: block }` — de <h2> is al een
   blok, dus die in BLOK_KLASSE zetten hielp niets: de regelovergang zit TUSSEN
   de span en de em. Zonder dit las de controle "reviews.Dus laten we" als een
   punt zonder spatie, en dat stond er op het scherm nooit. */
const BLOK_KINDEREN = /\b(hv-promise-h)\b/;
function textOf(node, out, ouderBlokt = false) {
  if (node.nodeName === '#text') { out.push(node.value); return out; }
  if (SKIP_TAGS.has(node.nodeName)) return out;
  const kl = (node.attrs || []).find((a) => a.name === 'class');
  const blok = ouderBlokt || BLOK.has(node.nodeName) || (kl && BLOK_KLASSE.test(kl.value));
  const kinderenBlokken = !!(kl && BLOK_KINDEREN.test(kl.value));
  if (blok) out.push('\n');
  for (const c of node.childNodes || []) textOf(c, out, kinderenBlokken);
  if (blok) out.push('\n');
  return out;
}
function walk(node, fn) { fn(node); for (const c of node.childNodes || []) walk(c, fn); }
function attr(n, name) { return (n.attrs || []).find(a => a.name === name)?.value; }

const bevindingen = [];
const add = (soort, pagina, detail) => bevindingen.push({ soort, pagina, detail });
const titels = new Map(), descs = new Map();

for (const f of files) {
  const pagina = '/' + f.replace(/^dist\//, '').replace(/index\.html$/, '').replace(/\.html$/, '');
  const doc = parse(readFileSync(f, 'utf8'));

  let title = null, desc = null, canonical = null, lang = null;
  const ids = new Map();
  walk(doc, (n) => {
    if (n.nodeName === 'html') lang = attr(n, 'lang');
    if (n.nodeName === 'title') title = (n.childNodes?.[0]?.value || '').trim();
    if (n.nodeName === 'meta' && attr(n, 'name') === 'description') desc = attr(n, 'content');
    if (n.nodeName === 'link' && attr(n, 'rel') === 'canonical') canonical = attr(n, 'href');
    const id = attr(n, 'id');
    if (id) ids.set(id, (ids.get(id) || 0) + 1);
    if (n.nodeName === 'a') {
      const href = attr(n, 'href'), target = attr(n, 'target'), rel = attr(n, 'rel') || '';
      if (href === '#' || href === '') add('lege link', pagina, JSON.stringify(href));
      if (target === '_blank' && !/noopener/.test(rel)) add('_blank zonder noopener', pagina, href);
    }
  });

  for (const [id, n] of ids) if (n > 1) add('dubbel id', pagina, `${id} (${n}x)`);
  if (!title) add('geen title', pagina, '');
  if (!desc) add('geen description', pagina, '');
  if (!canonical) add('geen canonical', pagina, '');
  if (title) { if (title.length > 65) add('title te lang', pagina, `${title.length}: ${title}`);
               titels.set(title, [...(titels.get(title) || []), pagina]); }
  if (desc) { if (desc.length > 165) add('description te lang', pagina, `${desc.length}`);
              if (desc.length < 60) add('description te kort', pagina, `${desc.length}: ${desc}`);
              descs.set(desc, [...(descs.get(desc) || []), pagina]); }
  const nl = pagina === '/nl/' || pagina.startsWith('/nl/');
  if (nl !== (lang === 'nl')) add('verkeerd lang-attribuut', pagina, String(lang));

  const body = doc.childNodes.find(c => c.nodeName === 'html')?.childNodes.find(c => c.nodeName === 'body');
  const ruw = textOf(body || doc, []).join('').replace(/ /g, ' ');
  const regels = ruw.split('\n').map(r => r.replace(/[ \t]+/g, ' ').trim()).filter(Boolean);

  const controles = [
    ['mojibake', /(Ã.|â€|�)/g],
    ['spatie vóór leesteken', /\S ([,;:!?])(?=\s|$)/g],
    ['plaatshouder', /(lorem ipsum|TODO|FIXME|\bTBD\b|\{\{|\bundefined\b|\bNaN\b|\[object Object\])/gi],
    ['punt zonder spatie', /[a-z]{2}\.[A-Z][a-z]{2}/g],
    ['dubbel woord', /\b(\w{3,})[ ]+\1\b/gi, /oversized oversized/i],
    ['dubbele spatie', /\w {2,}\w/g],
    ['losse haak', /\([^)]{0,120}$|^[^(]{0,120}\)/g],
  ];
  /* Het derde veld is een uitzondering: een patroon dat WEL matcht maar goed is.
     "how oversized oversized really is" is geen verdubbeling maar een woordgrap
     die in beide talen zo bedoeld is. Zonder deze uitzondering staan er acht
     meldingen in elke run, en acht bekende meldingen zijn precies hoeveel er
     nodig is om de negende, echte, niet meer te zien. */
  for (const [naam, re, tenzij] of controles) {
    const seen = new Set();
    for (const regel of regels) {
      if (tenzij && tenzij.test(regel)) continue;
      if (regel.length < 3) continue;
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(regel))) {
        const sleutel = m[0].toLowerCase();
        if (seen.has(sleutel)) break;
        seen.add(sleutel);
        add(naam, pagina, `«${regel.length > 130 ? regel.slice(Math.max(0, m.index - 50), m.index + 70) : regel}»`);
        break;
      }
      if (seen.size > 4) break;
    }
  }
}

/* /nl/404 en /nl/404/ zijn HETZELFDE bestand: scripts/sitemap-and-404.mjs legt
   de Nederlandse 404 op beide adressen neer, omdat Cloudflare Pages er maar één
   van serveert en welke dat is per route verschilt. Twee paden, één pagina —
   dus geen dubbele title en geen dubbele description. */
const ZELFDE_PAGINA = (ps) => ps.every((p) => p.replace(/\/$/, '') === ps[0].replace(/\/$/, ''));
for (const [t, ps] of titels) if (ps.length > 1 && !ZELFDE_PAGINA(ps)) add('dubbele title', ps.join(' '), t);
for (const [d, ps] of descs) if (ps.length > 1 && !ZELFDE_PAGINA(ps)) add('dubbele description', ps.join(' '), d.slice(0, 70));

const perSoort = new Map();
for (const b of bevindingen) perSoort.set(b.soort, [...(perSoort.get(b.soort) || []), b]);
console.log(`${files.length} pagina's · ${bevindingen.length} meldingen\n`);
for (const [soort, lijst] of [...perSoort].sort((a,b)=>b[1].length-a[1].length)) {
  console.log(`── ${soort.toUpperCase()} (${lijst.length}) ──`);
  for (const b of lijst.slice(0, 14)) console.log(`   ${b.pagina}  ${b.detail}`);
  if (lijst.length > 14) console.log(`   … en nog ${lijst.length - 14}`);
  console.log('');
}
