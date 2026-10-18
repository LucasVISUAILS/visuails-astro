// Meet per pagina en breedte elk element met de zware zachte hoek, zoekt zijn container
// en rekent uit welke hoek concentrisch moet meelopen (R - inzet) en welke licht blijft.
import { chromium } from 'playwright';
import fs from 'fs';
const UIT = new URL('./', import.meta.url).pathname;
const PAGINAS = process.env.PAGINAS ? process.env.PAGINAS.split(',') : JSON.parse(fs.readFileSync(UIT + 'paginas.json', 'utf8'));
const BREEDTES = (process.env.BREEDTES || '1440,768,390').split(',').map(Number);
const BASIS = process.env.BASIS || 'http://localhost:4399';

function meet() {
  const px = (v, w) => { const s = String(v).trim().split(/\s+/)[0]; return s.endsWith('%') ? parseFloat(s) / 100 * w : parseFloat(s) || 0; };
  const radii = (el, r) => { const cs = getComputedStyle(el); return [px(cs.borderTopLeftRadius, r.width), px(cs.borderTopRightRadius, r.width), px(cs.borderBottomRightRadius, r.width), px(cs.borderBottomLeftRadius, r.width)]; };
  const zichtbaar = (cs) => {
    const bg = cs.backgroundColor; const a = bg.startsWith('rgba') ? parseFloat(bg.split(',')[3]) : (bg === 'transparent' ? 0 : 1);
    return a > 0.02 || cs.backgroundImage !== 'none' || (parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none') || cs.boxShadow !== 'none' || cs.overflow === 'hidden' || cs.overflowX === 'hidden';
  };
  const naam = (el) => { if (!el) return ''; const c = (el.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean).slice(0, 3).join('.'); return el.tagName.toLowerCase() + (c ? '.' + c : ''); };
  const pad = (el) => { const d = []; let e = el; for (let i = 0; e && i < 4; i++, e = e.parentElement) d.unshift(naam(e)); return d.join(' > '); };
  const uit = [];
  for (const el of document.querySelectorAll('body *')) {
    if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') continue;
    const r = el.getBoundingClientRect(); if (r.width < 10 || r.height < 10) continue;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const rr = radii(el, r); const lo = Math.min(...rr), hi = Math.max(...rr);
    if (!(hi >= Math.max(lo * 2, lo + 3) && hi >= 5)) continue;            // alleen de zware zachte hoek
    // container: de dichtstbijzijnde voorouder met een zichtbare vorm en een ronding,
    // ook als die vorm met ::before of ::after getekend is (de topbalk).
    let c = el.parentElement, cr = null, crr = null;
    while (c && c !== document.body) {
      const ccs = getComputedStyle(c); const rc = c.getBoundingClientRect(); const rrc = radii(c, rc);
      if (Math.max(...rrc) > 0 && zichtbaar(ccs) && rc.width >= r.width && rc.height >= r.height) { cr = rc; crr = rrc; break; }
      let pv = null;
      for (const ps of ['::before', '::after']) { const pcs = getComputedStyle(c, ps); if (pcs.content === 'none' || pcs.content === 'normal') continue; const bg = pcs.backgroundColor; const a = bg.startsWith('rgba') ? parseFloat(bg.split(',')[3]) : (bg === 'transparent' ? 0 : 1); if ((a > 0.02 || pcs.backgroundImage !== 'none') && pcs.position === 'absolute') { pv = pcs; break; } }
      if (pv && rc.width >= r.width && rc.height >= r.height) {
        const q = (v) => { const s2 = String(v).trim().split(/\s+/)[0]; return s2.endsWith('%') ? parseFloat(s2) / 100 * rc.width : parseFloat(s2) || 0; };
        const pr = [q(pv.borderTopLeftRadius), q(pv.borderTopRightRadius), q(pv.borderBottomRightRadius), q(pv.borderBottomLeftRadius)].map((v) => Math.min(v, rc.height / 2, rc.width / 2));
        if (Math.max(...pr) > 0) { cr = rc; crr = pr; break; }
      }
      c = c.parentElement;
    }
    if (!cr) continue;
    crr = crr.map((v) => Math.min(v, cr.height / 2, cr.width / 2));
    const ccs = getComputedStyle(c); const bl = parseFloat(ccs.borderLeftWidth) || 0, bt = parseFloat(ccs.borderTopWidth) || 0;
    const ins = { l: r.left - cr.left - bl, t: r.top - cr.top - bt, r: cr.right - r.right - bl, b: cr.bottom - r.bottom - bt };
    const minIns = Math.min(ins.l, ins.t, ins.r, ins.b);
    const hoek = [[ins.l, ins.t], [ins.r, ins.t], [ins.r, ins.b], [ins.l, ins.b]];
    const cap = Math.min(r.width, r.height) / 2;
    const zone = hoek.map(([dx, dy], k) => dx >= -1 && dy >= -1 && dx <= crr[k] && dy <= crr[k] ? Math.min(cap, crr[k] - (dx + dy) / 2) : null);
    const inCont = zone.some((v) => v !== null && v > lo + 1.5) || minIns <= 16;
    if (!inCont) continue;                                                    // los in het vlak: blijft zoals het is
    const verwacht = zone.map((v) => (v !== null && v > lo + 1.5 ? Math.round(v * 10) / 10 : lo));
    const fout = rr.some((v, k) => Math.abs(v - verwacht[k]) > 1.5);
    uit.push({ el: pad(el), tekst: (el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 40), rr: rr.map((v) => Math.round(v * 10) / 10), c: naam(c), crr: crr.map((v) => Math.round(v * 10) / 10), ins: Object.fromEntries(Object.entries(ins).map(([k, v]) => [k, Math.round(v)])), verwacht, fout });
  }
  return uit;
}

const b = await chromium.launch({ executablePath: process.env.CHROME || undefined });
const alles = [];
const werk = [];
for (const w of BREEDTES) for (const p of PAGINAS) werk.push([w, p]);
let i = 0;
async function draai() {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  while (i < werk.length) {
    const [w, p] = werk[i++];
    await page.setViewportSize({ width: w, height: 900 });
    try {
      await page.goto(BASIS + p, { waitUntil: 'load', timeout: 30000 }); await page.waitForTimeout(Number(process.env.WACHT || 250));
      const r = await page.evaluate(meet);
      for (const x of r) alles.push({ pagina: p, w, ...x });
    } catch (e) { alles.push({ pagina: p, w, fout: true, err: String(e).slice(0, 120) }); }
  }
  await ctx.close();
}
await Promise.all([draai(), draai(), draai(), draai()]);
await b.close();
fs.writeFileSync(UIT + (process.env.NAAM || 'meting') + '.json', JSON.stringify(alles, null, 0));
console.log('metingen', alles.length, 'afwijkend', alles.filter((x) => x.fout === true && x.el).length);
