// node kladblok/fmt-meet.mjs dist [pad]  (eerst npm run build; CHROMIUM=<pad> als Playwright zijn eigen browser niet vindt)
// fmt-meet.mjs <dist> [pad] — meet het formatenblok terwijl het speelt.
// Elke 40 ms: breedte/hoogte van het kader, welk label te zien is (opacity), en de twee minis.
// Faalt (exit 1) als er ooit een label te zien is op een kader dat niet de verhouding van dat label heeft.
import { createServer } from 'node:http';
import { readFile } from 'node:fs';
import { join, extname } from 'node:path';
import { chromium } from 'playwright';
const [DIST, PAD = '/nl/voorbeeld/uitleg/'] = process.argv.slice(2);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.json': 'application/json' };
const server = createServer((req, res) => { let f = join(DIST, decodeURIComponent(req.url.split('?')[0])); if (!extname(f)) f = join(f, 'index.html'); readFile(f, (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream' }); res.end(b); }); });
await new Promise((r) => server.listen(0, r));
const br = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const VERW = { 169: 16 / 9, 45: 4 / 5, 916: 9 / 16, 11: 1 };
const TOL = 0.004; // 0,4 %: afronding op hele pixels
let fout = 0;
for (const [W, H] of [[1440, 900], [390, 844], [320, 640]]) {
  const p = await br.newPage({ viewport: { width: W, height: H } });
  await p.goto(`http://127.0.0.1:${server.address().port}${PAD}`, { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);
  await p.evaluate(() => { for (const e of document.querySelectorAll('.h-in')) e.classList.add('is-in'); });
  // Eerst de stand vóór het spelen (wacht): vierkant, geen label.
  const voor = await p.evaluate(() => { const w = document.querySelector('.h-fmt'); return { staat: w.dataset.uitlegStaat, stand: w.dataset.stand }; });
  await p.evaluate(() => document.querySelector('.h-fmt-vlak').scrollIntoView({ block: 'center' }));
  await p.waitForTimeout(300);
  await p.evaluate(() => document.querySelector('.h-fmt')._u.opnieuw());
  const rijen = await p.evaluate(async () => {
    const w = document.querySelector('.h-fmt');
    const k = w.querySelector('.h-fmt-kader');
    const labels = [...w.querySelectorAll('.h-fmt-kader .h-fmt-label')];
    const minis = [...w.querySelectorAll('.h-fmt-mini')];
    const uit = [];
    const t0 = performance.now();
    while (performance.now() - t0 < 13800) {
      const r = k.getBoundingClientRect();
      const zicht = labels.map((l) => [l.dataset.v, Number(getComputedStyle(l).opacity)]).filter(([, o]) => o > 0.02);
      const m = minis.map((i) => { const q = i.getBoundingClientRect(); return [q.width / q.height, Number(getComputedStyle(i).opacity)]; });
      const knop = [...w.querySelectorAll('[aria-pressed="true"]')].map((b) => b.dataset.fmt).join();
      uit.push({ t: Math.round(performance.now() - t0), b: r.width, h: r.height, zicht, m, stand: w.dataset.stand, staat: w.dataset.uitlegStaat, knop });
      await new Promise((z) => setTimeout(z, 40));
    }
    return uit;
  });
  let slecht = 0;
  const vast = {};
  for (const x of rijen) {
    const rt = x.b / x.h;
    for (const [v, o] of x.zicht) {
      const afw = Math.abs(rt - VERW[v]) / VERW[v];
      if (afw > TOL) { slecht += 1; if (slecht < 6) console.log(`  FOUT ${W}px t=${x.t} label ${v} (opacity ${o.toFixed(2)}) op kader ${x.b.toFixed(1)}×${x.h.toFixed(1)} = ${rt.toFixed(4)}`); }
      if (o > 0.98) (vast[v] ||= []).push(rt);
    }
  }
  // Het 3:4-vak: zodra het te zien is, moet het 3:4 zijn, en het mag alleen bij "En meer".
  for (const x of rijen) for (const [rt, o] of x.m) {
    if (o > 0.02 && Math.abs(rt - 0.75) / 0.75 > TOL) { slecht += 1; console.log(`  FOUT ${W}px t=${x.t} 3:4-vak ${rt.toFixed(4)}`); }
    // Zichtbaar mag het alleen naast een vierkant kader (bij "En meer"), ook terwijl het verdwijnt.
    if (o > 0.02 && Math.abs(x.b / x.h - 1) > TOL) { slecht += 1; console.log(`  FOUT ${W}px t=${x.t} 3:4-vak naast een kader van ${(x.b / x.h).toFixed(3)}`); }
  }
  fout += slecht;
  const eind = rijen.filter((x) => x.stand === '11').at(-1);
  console.log(`${W}×${H}: voor het spelen staat=${voor.staat} stand=${voor.stand} · ${rijen.length} metingen · ${slecht} keer een label op een verkeerde vorm`);
  for (const [v, rs] of Object.entries(vast)) {
    const mn = Math.min(...rs), mx = Math.max(...rs);
    console.log(`  label ${v.padEnd(3)} volledig te zien: kader ${mn.toFixed(4)}–${mx.toFixed(4)}, moet ${VERW[v].toFixed(4)}`);
  }
  console.log(`  En meer: kader ${eind.b.toFixed(1)}×${eind.h.toFixed(1)} · 3:4-vak ${eind.m[0][0].toFixed(4)} (moet 0.7500) · knop aan: ${eind.knop} · staat ${eind.staat}`);
  // Tijdlijn: wanneer verandert de stand, wanneer staat het label er.
  if (W === 1440) {
    let vorige = '';
    for (const x of rijen) {
      const s = `${x.stand}|${x.knop}|${x.zicht.filter(([, o]) => o > 0.98).map(([v]) => v).join()}`;
      if (s !== vorige) { console.log(`   t=${String(x.t).padStart(5)} stand ${x.stand.padEnd(4)} knop ${x.knop.padEnd(4)} kader ${(x.b / x.h).toFixed(3)} label ${x.zicht.map(([v, o]) => `${v}:${o.toFixed(2)}`).join(' ')}`); vorige = s; }
    }
  }
  // Een eigen klik op elke knop: meet tijdens en na de overgang.
  for (const v of ['45', '169', '916', '11']) {
    await p.click(`.h-fmt-knop[data-fmt="${v}"]`);
    const r = await p.evaluate(async () => {
      const w = document.querySelector('.h-fmt'); const k = w.querySelector('.h-fmt-kader'); const labels = [...w.querySelectorAll('.h-fmt-kader .h-fmt-label')];
      const uit = []; const t0 = performance.now();
      while (performance.now() - t0 < 1600) { const q = k.getBoundingClientRect(); uit.push([q.width / q.height, labels.map((l) => [l.dataset.v, Number(getComputedStyle(l).opacity)]).filter(([, o]) => o > 0.02)]); await new Promise((z) => setTimeout(z, 30)); }
      return { uit, stand: w.dataset.stand, keuze: w.dataset.keuze, staat: w.dataset.uitlegStaat };
    });
    let s = 0;
    for (const [rt, zicht] of r.uit) for (const [lv] of zicht) if (Math.abs(rt - VERW[lv]) / VERW[lv] > TOL) s += 1;
    fout += s;
    const laatste = r.uit.at(-1);
    console.log(`  klik ${v.padEnd(3)} → stand ${r.stand} keuze ${r.keuze} staat ${r.staat} · kader ${laatste[0].toFixed(4)} (moet ${VERW[v].toFixed(4)}) · label ${laatste[1].map(([a, o]) => `${a}:${o.toFixed(2)}`).join(' ')} · ${s} verkeerd`);
  }
  await p.close();
}
await br.close();
server.close();
console.log(fout ? `\nNIET GOED: ${fout}` : '\nGOED: nooit een label op een verkeerde vorm');
process.exit(fout ? 1 : 0);
