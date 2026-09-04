/* Leest de GEBOUWDE site en keurt vier dingen die geen enkele bestaande toets
   over alle 93 pagina's tegelijk bekijkt: interne links die nergens heen gaan,
   afbeeldingen zonder alt, koppen die een niveau overslaan, en de meta die een
   deelbare pagina moet hebben. Meten, niet aannemen. */
import { globSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = '/tmp/vb/dist';
const paginas = globSync(join(DIST, '**/*.html'));

const bestaat = (pad) => {
  const p = pad.split('#')[0].split('?')[0];
  if (p === '' || p === '/') return existsSync(join(DIST, 'index.html'));
  const f = join(DIST, p);
  if (existsSync(f) && statSync(f).isFile()) return true;
  return existsSync(join(f, 'index.html'));
};

const dood = [], zonderAlt = [], sprongen = [], metaMist = [];
const redirects = existsSync(join(DIST, '_redirects'))
  ? readFileSync(join(DIST, '_redirects'), 'utf8').split('\n').map((r) => r.trim().split(/\s+/)[0]).filter(Boolean)
  : [];
const geredirect = (p) => redirects.some((r) => r === p || (r.endsWith('*') && p.startsWith(r.slice(0, -1))));

for (const f of paginas) {
  const naam = f.slice(DIST.length).replace(/\\/g, '/');
  const html = readFileSync(f, 'utf8');

  for (const m of html.matchAll(/<a\b[^>]*href="([^"]+)"/g)) {
    const h = m[1];
    if (!h.startsWith('/')) continue;
    if (h.startsWith('/api/') || h.startsWith('/account') || h.startsWith('/admin') || h.startsWith('/portal')) continue;
    if (!bestaat(h) && !geredirect(h.split('#')[0])) dood.push([naam, h]);
  }

  for (const m of html.matchAll(/<img\b([^>]*)>/g)) {
    if (!/\salt\s*=/.test(m[1])) zonderAlt.push([naam, m[1].slice(0, 80)]);
  }

  const kop = [...html.matchAll(/<h([1-6])\b/g)].map((m) => Number(m[1]));
  const h1 = kop.filter((n) => n === 1).length;
  if (h1 !== 1) sprongen.push([naam, `h1 × ${h1}`]);
  for (let i = 1; i < kop.length; i++) {
    if (kop[i] - kop[i - 1] > 1) { sprongen.push([naam, `h${kop[i - 1]} → h${kop[i]}`]); break; }
  }

  const mist = [];
  if (!/<title>[^<]{5,}<\/title>/.test(html)) mist.push('title');
  if (!/name="description"\s+content="[^"]{20,}"/.test(html)) mist.push('description');
  if (!/property="og:title"/.test(html)) mist.push('og:title');
  if (!/property="og:image"/.test(html)) mist.push('og:image');
  if (!/rel="canonical"/.test(html)) mist.push('canonical');
  if (!/<html[^>]*\slang="/.test(html)) mist.push('lang');
  if (mist.length) metaMist.push([naam, mist.join(', ')]);
}

const toon = (titel, lijst) => {
  console.log(`\n${titel}: ${lijst.length}`);
  for (const [a, b] of lijst.slice(0, 25)) console.log(`   ${a.padEnd(46)} ${b}`);
  if (lijst.length > 25) console.log(`   … en nog ${lijst.length - 25}`);
};
console.log(`${paginas.length} pagina's gelezen`);
toon('dode interne links', dood);
toon('afbeeldingen zonder alt', zonderAlt);
toon('koppenvolgorde', sprongen);
toon('ontbrekende meta', metaMist);
