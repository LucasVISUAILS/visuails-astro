/* Een SEO-doorlichting van de GEBOUWDE site. Geen scores uit een tool maar de
   onderliggende feiten, geteld: titels, descriptions, koppen, interne links,
   gestructureerde data, hreflang, canonicals, robots en de sitemap. */
import { globSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';

const DIST = '/tmp/vb/dist';
const paginas = globSync(join(DIST, '**/*.html')).sort();
const pad = (f) => f.slice(DIST.length).replace(/\\/g, '/');
const tekst = (h) => h.replace(/<script[\s\S]*?<\/script>/g, ' ')
  .replace(/<style[\s\S]*?<\/style>/g, ' ')
  .replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/g, ' ').replace(/\s+/g, ' ').trim();

const rijen = [];
for (const f of paginas) {
  const h = readFileSync(f, 'utf8');
  const t = (h.match(/<title>([^<]*)<\/title>/) || [, ''])[1];
  const d = (h.match(/name="description"\s+content="([^"]*)"/) || [, ''])[1];
  const canon = (h.match(/rel="canonical"\s+href="([^"]*)"/) || [, ''])[1];
  const og = (h.match(/property="og:image"\s+content="([^"]*)"/) || [, ''])[1];
  const robots = (h.match(/name="robots"\s+content="([^"]*)"/) || [, ''])[1];
  const alts = [...h.matchAll(/<link rel="alternate" hreflang="([^"]*)"/g)].map((m) => m[1]);
  const h1 = [...h.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)].map((m) => tekst(m[1]));
  const h2 = [...h.matchAll(/<h2[^>]*>/g)].length;
  const woorden = tekst(h).split(' ').length;
  const intern = [...h.matchAll(/<a\b[^>]*href="(\/[^"]*)"/g)].map((m) => m[1].split('#')[0].split('?')[0]);
  const ld = [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .flatMap((m) => { try { const g = JSON.parse(m[1]); return (g['@graph'] || [g]).map((n) => n['@type']); } catch { return ['ONLEESBAAR']; } });
  rijen.push({ f: pad(f), t, d, canon, og, robots, alts, h1, h2, woorden, intern, ld, bytes: statSync(f).size });
}

const zeg = (kop, lijst, hoeveel = 12) => {
  console.log(`\n${kop}: ${lijst.length}`);
  for (const r of lijst.slice(0, hoeveel)) console.log(`   ${r}`);
  if (lijst.length > hoeveel) console.log(`   … en nog ${lijst.length - hoeveel}`);
};

console.log(`${rijen.length} gebouwde pagina's\n${'='.repeat(60)}`);

/* 1 · TITELS */
const teLang = rijen.filter((r) => r.t.length > 60).map((r) => `${r.f} (${r.t.length}) ${r.t.slice(0, 70)}`);
const teKort = rijen.filter((r) => r.t.length < 20).map((r) => `${r.f} (${r.t.length}) ${r.t}`);
const dubbeleT = Object.entries(rijen.reduce((a, r) => { (a[r.t] ||= []).push(r.f); return a; }, {}))
  .filter(([, v]) => v.length > 1).map(([k, v]) => `${v.length}× "${k.slice(0, 55)}" → ${v.slice(0, 3).join(', ')}`);
zeg('titels boven 60 tekens (Google knipt af)', teLang);
zeg('titels onder 20 tekens', teKort);
zeg('dezelfde titel op meerdere pagina\'s', dubbeleT);

/* 2 · DESCRIPTIONS */
const dLang = rijen.filter((r) => r.d.length > 160).map((r) => `${r.f} (${r.d.length})`);
const dKort = rijen.filter((r) => r.d.length && r.d.length < 70).map((r) => `${r.f} (${r.d.length}) ${r.d.slice(0, 60)}`);
const dLeeg = rijen.filter((r) => !r.d).map((r) => r.f);
const dubbeleD = Object.entries(rijen.reduce((a, r) => { if (r.d) (a[r.d] ||= []).push(r.f); return a; }, {}))
  .filter(([, v]) => v.length > 1).map(([k, v]) => `${v.length}× ${v.slice(0, 3).join(', ')} — "${k.slice(0, 50)}"`);
zeg('descriptions boven 160 tekens', dLang);
zeg('descriptions onder 70 tekens (te weinig ruimte benut)', dKort);
zeg('zonder description', dLeeg);
zeg('dezelfde description op meerdere pagina\'s', dubbeleD);

/* 3 · KOPPEN EN OMVANG */
zeg('geen of meer dan één h1', rijen.filter((r) => r.h1.length !== 1).map((r) => `${r.f} — ${r.h1.length}`));
zeg('minder dan 300 woorden (dun voor een indexeerbare pagina)',
  rijen.filter((r) => r.woorden < 300 && !/noindex/.test(r.robots)).map((r) => `${r.f} — ${r.woorden} woorden`));
zeg('geen enkele h2', rijen.filter((r) => r.h2 === 0 && !/noindex/.test(r.robots)).map((r) => r.f));

/* 4 · CANONICAL, HREFLANG, ROBOTS */
zeg('zonder canonical', rijen.filter((r) => !r.canon).map((r) => r.f));
zeg('canonical wijst niet naar zichzelf', rijen.filter((r) => {
  if (!r.canon) return false;
  const eigen = r.f.replace(/index\.html$/, '').replace(/\.html$/, '/');
  return !r.canon.endsWith(eigen) && !r.canon.endsWith(eigen.replace(/\/$/, ''));
}).map((r) => `${r.f} → ${r.canon}`));
zeg('zonder hreflang-paar', rijen.filter((r) => r.alts.length < 2 && !/noindex/.test(r.robots)).map((r) => `${r.f} — ${r.alts.join(',') || 'geen'}`));
zeg('op noindex', rijen.filter((r) => /noindex/.test(r.robots)).map((r) => `${r.f} — ${r.robots}`));
zeg('zonder og:image', rijen.filter((r) => !r.og).map((r) => r.f));

/* 5 · GESTRUCTUREERDE DATA */
const perType = {};
for (const r of rijen) for (const t of new Set(r.ld)) (perType[t] ||= []).push(r.f);
console.log('\ngestructureerde data, per type:');
for (const [t, v] of Object.entries(perType).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`   ${String(v.length).padStart(3)} pagina's  ${t}`);
}
zeg('zonder enige ld+json', rijen.filter((r) => !r.ld.length).map((r) => r.f));

/* 6 · INTERNE LINKS */
const inkomend = {};
for (const r of rijen) for (const l of new Set(r.intern)) inkomend[l] = (inkomend[l] || 0) + 1;
const routes = rijen.filter((r) => !/noindex/.test(r.robots))
  .map((r) => r.f.replace(/index\.html$/, '').replace(/\.html$/, '/'));
const wees = routes.filter((rt) => !(inkomend[rt] || inkomend[rt.replace(/\/$/, '')]));
zeg('pagina\'s zonder enige interne link ernaartoe', wees, 20);
const top = Object.entries(inkomend).filter(([k]) => routes.includes(k))
  .sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${String(v).padStart(3)}×  ${k}`);
zeg('meest gelinkte pagina\'s', top, 8);

/* 7 · SITEMAP EN ROBOTS */
const sm = existsSync(join(DIST, 'sitemap.xml')) ? readFileSync(join(DIST, 'sitemap.xml'), 'utf8') : '';
const locs = [...sm.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);
console.log(`\nsitemap: ${locs.length} url's`);
const inSitemap = new Set(locs.map((u) => new URL(u).pathname));
zeg('indexeerbaar maar niet in de sitemap', routes.filter((rt) => !inSitemap.has(rt)), 15);
zeg('in de sitemap maar op noindex', [...inSitemap].filter((u) => {
  const r = rijen.find((x) => x.f.replace(/index\.html$/, '') === u);
  return r && /noindex/.test(r.robots);
}), 10);
const rb = existsSync(join(DIST, 'robots.txt')) ? readFileSync(join(DIST, 'robots.txt'), 'utf8') : '(geen robots.txt)';
console.log('\nrobots.txt:\n' + rb.split('\n').map((l) => '   ' + l).join('\n'));
