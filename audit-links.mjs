/* Interne links, hreflang-paren en og-beelden: bestaat waar ze heen wijzen? */
import { readFileSync, globSync, existsSync } from 'node:fs';
import { parse } from 'parse5';
const walk = (n, fn) => { fn(n); for (const c of n.childNodes || []) walk(c, fn); };
const attr = (n, k) => (n.attrs || []).find(a => a.name === k)?.value;

const FUNCTIE = [/^\/o(\/|$)/, /^\/account(\/|$)/, /^\/admin(\/|$)/, /^\/api\//];
const bestaat = (p) => {
  const q = p.split('#')[0].split('?')[0].replace(/^\//, '').replace(/\/$/, '');
  if (q === '') return existsSync('dist/index.html');
  return existsSync(`dist/${q}/index.html`) || existsSync(`dist/${q}.html`) || existsSync(`dist/${q}`);
};

const dood = [], hreflangMis = [], ogMis = [];
for (const f of globSync('dist/**/*.html').sort()) {
  const pagina = '/' + f.replace(/^dist\//, '').replace(/index\.html$/, '').replace(/\.html$/, '');
  const doc = parse(readFileSync(f, 'utf8'));
  const alts = new Map();
  walk(doc, (n) => {
    if (n.nodeName === 'a') {
      const h = attr(n, 'href');
      if (!h || /^(https?:|mailto:|tel:|#|javascript:|data:)/.test(h)) return;
      const kaal = h.split('#')[0].split('?')[0];
      if (FUNCTIE.some(r => r.test(kaal))) return;
      if (!bestaat(kaal)) dood.push(`${pagina} → ${h}`);
    }
    if (n.nodeName === 'link' && attr(n, 'rel') === 'alternate' && attr(n, 'hreflang')) alts.set(attr(n, 'hreflang'), attr(n, 'href'));
    if (n.nodeName === 'meta' && (attr(n, 'property') === 'og:image' || attr(n, 'name') === 'twitter:image')) {
      const u = (attr(n, 'content') || '').replace('https://visuails.com', '');
      if (u.startsWith('/') && !existsSync('dist' + u)) ogMis.push(`${pagina} → ${u}`);
    }
  });
  const talen = [...alts.keys()].sort().join(',');
  if (alts.size && talen !== 'en,nl,x-default') hreflangMis.push(`${pagina}: ${talen || '(geen)'}`);
  for (const [t, u] of alts) {
    const p = u.replace('https://visuails.com', '');
    if (!bestaat(p)) hreflangMis.push(`${pagina}: hreflang ${t} → ${p} bestaat niet`);
  }
}
const toon = (naam, lijst) => {
  console.log(`── ${naam} (${lijst.length}) ──`);
  [...new Set(lijst)].slice(0, 15).forEach(x => console.log('   ' + x));
  if (lijst.length > 15) console.log(`   … en nog ${lijst.length - 15}`);
  console.log('');
};
toon('DODE INTERNE LINKS', dood);
toon('HREFLANG', hreflangMis);
toon('OG-BEELD ONTBREEKT', ogMis);
