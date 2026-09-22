/* Elke <section> die BINNEN een andere <section> staat en toch de volle
   paginapadding van global.css meekrijgt. Dat is lucht die niemand besteld
   heeft — zie de noot bij .wk in FigWalk.astro. */
import { chromium } from 'playwright';
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const DIST = 'dist';
function paginas(dir, uit = []) {
  for (const naam of readdirSync(dir)) {
    const p = path.join(dir, naam);
    if (statSync(p).isDirectory()) paginas(p, uit);
    else if (naam === 'index.html') uit.push('/' + path.relative(DIST, path.dirname(p)).split(path.sep).join('/') + '/');
  }
  return uit;
}
const alle = paginas(DIST).filter((p) => p.startsWith('/nl/') || !p.startsWith('/nl')).sort();

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
const vondsten = [];
for (const pad of alle) {
  const url = 'http://127.0.0.1:4399' + (pad === '//' ? '/' : pad);
  try { await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 }); } catch { continue; }
  const hits = await p.evaluate(() => {
    const uit = [];
    for (const s of document.querySelectorAll('section section')) {
      const cs = getComputedStyle(s);
      const top = parseFloat(cs.paddingTop), bot = parseFloat(cs.paddingBottom);
      if (top >= 40 || bot >= 40) {
        uit.push({ klas: (s.className || '').toString().split(' ').slice(0, 2).join(' '), top: Math.round(top), bot: Math.round(bot) });
      }
    }
    return uit;
  });
  for (const h of hits) vondsten.push({ pad, ...h });
}
await b.close();
const perKlas = {};
for (const v of vondsten) { (perKlas[v.klas] ||= []).push(v.pad); }
for (const [k, lijst] of Object.entries(perKlas).sort((a, b2) => b2[1].length - a[1].length)) {
  console.log(String(lijst.length).padStart(3), k || '(geen klasse)', '→', lijst.slice(0, 3).join(', ') + (lijst.length > 3 ? ' …' : ''));
}
console.log('\ntotaal', vondsten.length, 'geneste secties met paginapadding, over', alle.length, 'pagina\'s');
