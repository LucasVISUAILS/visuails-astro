/* STRUCTUURCONTROLE OVER dist/ — statisch, geen browser.
 *
 * De bestaande audits kijken naar tekst (audit-tekst), naar links (audit-links),
 * naar harde feiten (audit-feiten), naar NL/EN-paren (audit-paar) en naar
 * gestructureerde data (audit-jsonld). Wat niemand controleerde is de BOUW van
 * de pagina zelf: koppenvolgorde, dubbele id's, aria die naar niets wijst,
 * knoppen zonder naam, beelden zonder afmeting. Dat zijn precies de fouten die
 * geen console-melding geven en op een screenshot niet te zien zijn, en die een
 * schermlezer of een trage verbinding wél merkt.
 */
import { readFileSync, globSync } from 'node:fs';
import { parse } from 'parse5';

const walk = (n, fn) => { fn(n); for (const c of n.childNodes || []) walk(c, fn); };
const attr = (n, k) => (n.attrs || []).find((a) => a.name === k)?.value;
const heeft = (n, k) => (n.attrs || []).some((a) => a.name === k);

/* De toegankelijke naam zoals een schermlezer hem opbouwt, vereenvoudigd:
 * aria-label wint, dan aria-labelledby, dan de eigen tekst, dan de alt van een
 * beeld erin, dan de <title> van een svg erin, dan title=. */
const NAAM_SKIP = new Set(['script', 'style', 'template']);
function naamVan(n, ids) {
  const al = attr(n, 'aria-label');
  if (al && al.trim()) return al.trim();
  const lb = attr(n, 'aria-labelledby');
  if (lb) {
    const stukken = lb.split(/\s+/).map((id) => ids.get(id)).filter(Boolean);
    if (stukken.length) return stukken.map((el) => tekstVan(el)).join(' ').trim() || '(leeg doelwit)';
  }
  const t = tekstVan(n).trim();
  if (t) return t;
  let uit = '';
  walk(n, (k) => {
    if (uit) return;
    if (k.nodeName === 'img') { const a = attr(k, 'alt'); if (a && a.trim()) uit = a.trim(); }
    if (k.nodeName === 'svg') {
      const sl = attr(k, 'aria-label');
      if (sl && sl.trim()) uit = sl.trim();
      else { const ti = (k.childNodes || []).find((c) => c.nodeName === 'title'); if (ti) { const pt = tekstVan(ti).trim(); if (pt) uit = pt; } }
    }
  });
  if (uit) return uit;
  const ti = attr(n, 'title');
  return ti && ti.trim() ? ti.trim() : '';
}
function plat(n, out) {
  if (n.nodeName === '#text') { out.push(n.value); return; }
  if (NAAM_SKIP.has(n.nodeName)) return;
  if (attr(n, 'aria-hidden') === 'true') return;
  for (const c of n.childNodes || []) plat(c, out);
}
/* plat() vult een array; één hulpje eromheen zodat de aanroepen leesbaar blijven. */
function tekstVan(n) { const a = []; plat(n, a); return a.join(''); }

const bev = {
  koppen: [], dubbeleId: [], loosAria: [], geenAlt: [], geenMaat: [],
  geenNaam: [], titelKort: [], titelDubbel: [], omschrijving: [], taal: [],
  tabindex: [], blank: [], legeKop: [], mains: [], knopType: [], label: [],
};

const titels = new Map(), omschrijvingen = new Map();
const mainTeller = [];
const bestanden = globSync('dist/**/*.html').sort();

for (const f of bestanden) {
  const pagina = '/' + f.replace(/^dist\//, '').replace(/index\.html$/, '').replace(/\.html$/, '');
  const doc = parse(readFileSync(f, 'utf8'));
  const html = doc.childNodes.find((c) => c.nodeName === 'html');
  const body = html?.childNodes.find((c) => c.nodeName === 'body');
  if (!body) continue;

  /* alle id's eerst, want aria-verwijzingen mogen vooruit wijzen */
  const ids = new Map(); const dubbel = new Map();
  walk(doc, (n) => {
    const id = attr(n, 'id');
    if (!id) return;
    if (ids.has(id)) dubbel.set(id, (dubbel.get(id) || 1) + 1); else ids.set(id, n);
  });
  for (const [id, n] of dubbel) bev.dubbeleId.push(`${pagina}  id="${id}" komt ${n}× voor`);

  /* taal */
  const lang = attr(html, 'lang') || '';
  const verwacht = pagina.startsWith('/nl') ? 'nl' : 'en';
  if (!lang.startsWith(verwacht)) bev.taal.push(`${pagina}  lang="${lang}" maar verwacht ${verwacht}`);

  /* titel en omschrijving */
  let titel = '', omschr = '';
  walk(doc, (n) => {
    if (n.nodeName === 'title') titel = tekstVan(n).trim();
    if (n.nodeName === 'meta' && attr(n, 'name') === 'description') omschr = (attr(n, 'content') || '').trim();
  });
  if (!titel || titel.length < 12) bev.titelKort.push(`${pagina}  titel "${titel}" (${titel.length})`);
  else if (titel.length > 65) bev.titelKort.push(`${pagina}  titel ${titel.length} tekens, wordt afgekapt: "${titel}"`);
  if (titel) { const l = titels.get(titel) || []; l.push(pagina); titels.set(titel, l); }
  if (!omschr) bev.omschrijving.push(`${pagina}  geen meta description`);
  else if (omschr.length < 50 || omschr.length > 165) bev.omschrijving.push(`${pagina}  description ${omschr.length} tekens`);
  if (omschr) { const l = omschrijvingen.get(omschr) || []; l.push(pagina); omschrijvingen.set(omschr, l); }

  /* koppen: precies één h1, geen overgeslagen niveau, geen lege kop */
  const rij = [];
  walk(body, (n) => {
    if (n.nodeName === 'template') return;              /* inhoud van <template> telt niet mee */
    if (/^h[1-6]$/.test(n.nodeName)) {
      /* een kop binnen een <template> bereikt deze tak niet, want walk daalt er
         niet in af zodra we hem overslaan — parse5 hangt template-inhoud onder
         .content, en daar loopt walk sowieso niet doorheen. */
      const t = tekstVan(n).replace(/\s+/g, ' ').trim();
      rij.push({ n: +n.nodeName[1], t, verborgen: attr(n, 'aria-hidden') === 'true' || heeft(n, 'hidden') });
      if (!t && attr(n, 'aria-hidden') !== 'true') bev.legeKop.push(`${pagina}  lege <${n.nodeName}>`);
    }
    if (n.nodeName === 'main') mainTeller.push(pagina);
  });
  const h1 = rij.filter((r) => r.n === 1 && !r.verborgen);
  if (h1.length !== 1) bev.koppen.push(`${pagina}  ${h1.length}× <h1>${h1.length ? ' — ' + h1.map((x) => `"${x.t.slice(0, 40)}"`).join(', ') : ''}`);
  let vorig = 0;
  for (const r of rij) {
    if (r.verborgen) continue;
    if (vorig && r.n > vorig + 1) bev.koppen.push(`${pagina}  h${vorig} → h${r.n} slaat een niveau over bij "${r.t.slice(0, 46)}"`);
    vorig = r.n;
  }

  /* beelden, knoppen, links, formulieren */
  walk(body, (n) => {
    if (n.nodeName === 'img') {
      if (!heeft(n, 'alt')) bev.geenAlt.push(`${pagina}  <img src="${attr(n, 'src')}"> zonder alt`);
      const w = attr(n, 'width'), h = attr(n, 'height');
      const stijl = attr(n, 'style') || '';
      if ((!w || !h) && !/aspect-ratio/.test(stijl)) bev.geenMaat.push(`${pagina}  <img src="${attr(n, 'src')}"> zonder width/height`);
    }
    if (n.nodeName === 'a' || n.nodeName === 'button') {
      const verborgen = attr(n, 'aria-hidden') === 'true' || heeft(n, 'hidden') || attr(n, 'tabindex') === '-1';
      if (!verborgen && !naamVan(n, ids)) {
        bev.geenNaam.push(`${pagina}  <${n.nodeName}${n.nodeName === 'a' ? ` href="${attr(n, 'href')}"` : ` class="${attr(n, 'class') || ''}"`}> zonder toegankelijke naam`);
      }
      if (n.nodeName === 'a' && attr(n, 'target') === '_blank') {
        const rel = attr(n, 'rel') || '';
        if (!/noopener|noreferrer/.test(rel)) bev.blank.push(`${pagina}  target="_blank" zonder rel=noopener → ${attr(n, 'href')}`);
      }
      if (n.nodeName === 'button' && !heeft(n, 'type')) {
        let p = n.parentNode, inForm = false;
        while (p) { if (p.nodeName === 'form') { inForm = true; break; } p = p.parentNode; }
        if (inForm) bev.knopType.push(`${pagina}  <button class="${attr(n, 'class') || ''}"> zonder type binnen een <form> — verstuurt bij klik`);
      }
    }
    const ti = attr(n, 'tabindex');
    if (ti && +ti > 0) bev.tabindex.push(`${pagina}  tabindex="${ti}" op <${n.nodeName}>`);
    for (const k of ['aria-labelledby', 'aria-describedby', 'aria-controls', 'aria-owns']) {
      const v = attr(n, k);
      if (!v) continue;
      for (const id of v.split(/\s+/).filter(Boolean)) {
        if (!ids.has(id)) bev.loosAria.push(`${pagina}  <${n.nodeName}> ${k}="${id}" — die id bestaat niet`);
      }
    }
    if (n.nodeName === 'label') {
      const fo = attr(n, 'for');
      if (fo && !ids.has(fo)) bev.label.push(`${pagina}  <label for="${fo}"> wijst naar niets`);
    }
    if (['input', 'select', 'textarea'].includes(n.nodeName)) {
      const type = attr(n, 'type') || 'text';
      if (['hidden', 'submit', 'button', 'reset', 'image'].includes(type)) return;
      if (attr(n, 'aria-hidden') === 'true' || heeft(n, 'hidden') || attr(n, 'tabindex') === '-1') return;
      const id = attr(n, 'id');
      let gelabeld = !!(attr(n, 'aria-label') || attr(n, 'aria-labelledby') || attr(n, 'title'));
      if (!gelabeld && id) walk(body, (m) => { if (m.nodeName === 'label' && attr(m, 'for') === id) gelabeld = true; });
      if (!gelabeld) { let p = n.parentNode; while (p && p !== body) { if (p.nodeName === 'label') { gelabeld = true; break; } p = p.parentNode; } }
      if (!gelabeld) bev.label.push(`${pagina}  <${n.nodeName} type="${type}" name="${attr(n, 'name') || ''}"> zonder label`);
    }
  });
}

/* meer dan één <main> per pagina */
const perPagina = {};
for (const p of mainTeller) perPagina[p] = (perPagina[p] || 0) + 1;
for (const [p, n] of Object.entries(perPagina)) if (n > 1) bev.mains.push(`${p}  ${n}× <main>`);

/* De 404 wordt door de sitemap-stap twee keer weggeschreven — met en zonder
   slash, zodat Cloudflare hem in beide vormen serveert. Dat is één pagina, geen
   dubbele titel. */
const zelfdePagina = (p) => !/^\/nl\/404$/.test(p);

/* dubbele titels en omschrijvingen — alleen binnen dezelfde taal is dat fout,
   want de NL- en de EN-pagina delen soms een merknaam-titel. */
for (const [t, ps] of titels) {
  const nl = ps.filter((p) => p.startsWith('/nl')).filter(zelfdePagina), en = ps.filter((p) => !p.startsWith('/nl')).filter(zelfdePagina);
  for (const groep of [nl, en]) if (groep.length > 1) bev.titelDubbel.push(`"${t.slice(0, 56)}" op ${groep.join(', ')}`);
}
for (const [t, ps] of omschrijvingen) {
  const nl = ps.filter((p) => p.startsWith('/nl')).filter(zelfdePagina), en = ps.filter((p) => !p.startsWith('/nl')).filter(zelfdePagina);
  for (const groep of [nl, en]) if (groep.length > 1) bev.omschrijving.push(`zelfde description op ${groep.join(', ')} — "${t.slice(0, 50)}…"`);
}

const namen = {
  koppen: 'koppenvolgorde', dubbeleId: "dubbele id's", loosAria: 'aria wijst naar niets',
  geenAlt: 'beeld zonder alt', geenMaat: 'beeld zonder afmeting', geenNaam: 'bedienbaar element zonder naam',
  titelKort: 'paginatitel', titelDubbel: 'dubbele paginatitel', omschrijving: 'meta description',
  taal: 'lang-attribuut', tabindex: 'positieve tabindex', blank: 'target=_blank', legeKop: 'lege kop',
  mains: 'meer dan één <main>', knopType: 'knop zonder type', label: 'formulierlabel',
};
let totaal = 0;
for (const [k, v] of Object.entries(bev)) {
  if (!v.length) continue;
  totaal += v.length;
  console.log(`\n── ${namen[k]} (${v.length})`);
  for (const r of v.slice(0, 40)) console.log('   ' + r);
  if (v.length > 40) console.log(`   … en nog ${v.length - 40}`);
}
console.log(`\n${bestanden.length} pagina's, ${totaal} bevinding(en).`);
process.exit(totaal ? 1 : 0);
