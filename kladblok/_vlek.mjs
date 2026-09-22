/* Elke productfoto die als TEGEL op een paginagrond ligt: de kleur van de
   fotorand tegenover de grond eromheen, en hoe groot dat verschil is.
   Een foto met een eigen wit valt op als een vlek, ook als niemand kan zeggen
   waarom. `lean` is blauw min rood: de gronden van het schema leunen koel
   (+3 tot +11), dus een foto met lean 0 of lager is warmer dan alles eromheen. */
import { chromium } from 'playwright';
const PADEN = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const gezien = new Map();
for (const pad of PADEN) {
  const p = await ctx.newPage();
  const r = await p.goto('http://127.0.0.1:4399' + pad, { waitUntil: 'load' }).catch(() => null);
  if (!r || r.status() !== 200) { await p.close(); continue; }
  await p.evaluate(() => document.fonts.ready);
  await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(x => setTimeout(x, 50)); } window.scrollTo(0, 0); });
  await p.waitForTimeout(600);
  const lijst = await p.evaluate(() => {
    const uit = [];
    for (const el of document.querySelectorAll('img')) {
      const r = el.getBoundingClientRect();
      if (r.width < 90 || r.height < 90) continue;
      let n = el.parentElement, grond = null;
      while (n) { const bg = getComputedStyle(n).backgroundColor; if (bg && bg !== 'rgba(0, 0, 0, 0)') { grond = bg; break; } n = n.parentElement; }
      uit.push({ src: (el.currentSrc || el.src).split('/').pop(), grond,
                 vak: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)] });
    }
    return uit;
  });
  const png = await p.screenshot({ fullPage: true });
  const sharp = (await import('sharp')).default;
  const beeld = sharp(png);
  const meta = await beeld.metadata();
  const scroll = 0;
  for (const x of lijst) {
    if (gezien.has(x.src)) continue;
    const [bx, by, bw, bh] = x.vak;
    const y = by + (await ctx.pages()[0] ? 0 : 0);
    /* De bovenste 6 pixelrijen binnen het beeld: daar zit de grond van de foto. */
    const top = Math.max(0, y); if (top + 6 > meta.height || bx + bw > meta.width) continue;
    /* .stats() leest de INVOER en niet de bewerking ervoor, dus eerst uitsnijden
       naar een buffer en daar de statistiek van nemen. */
    const knip = await sharp(png).extract({ left: bx + 2, top: top + 2, width: Math.max(2, bw - 4), height: 6 }).toBuffer();
    const s = await sharp(knip).stats();
    const f = s.channels.slice(0, 3).map((c) => Math.round(c.mean));
    const g = (x.grond || '').match(/\d+/g)?.slice(0, 3).map(Number) || null;
    gezien.set(x.src, { src: x.src, foto: f, grond: g, pad });
  }
  await p.close();
}
const hex = (c) => '#' + c.map((v) => v.toString(16).padStart(2, '0').toUpperCase()).join('');
for (const v of gezien.values()) {
  const lf = v.foto[2] - v.foto[0];
  const lg = v.grond ? v.grond[2] - v.grond[0] : null;
  const d = v.grond ? Math.max(...[0, 1, 2].map((i) => Math.abs(v.foto[i] - v.grond[i]))) : null;
  console.log(`${v.src.padEnd(30)} foto ${hex(v.foto)} lean ${String(lf).padStart(3)}   grond ${v.grond ? hex(v.grond) : '—'} lean ${String(lg ?? '—').padStart(3)}   Δ ${String(d ?? '—').padStart(3)}   ${v.pad}`);
}
await b.close();
