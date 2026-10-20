// Contrast van elke tekst in een vlak tegen de pixels die er echt achter staan (ook als dat
// een beeld is). De tekst wordt even doorzichtig gemaakt, het vlak gefotografeerd, en per
// tekstregel de slechtste achtergrond genomen: bij lichte letters de lichtste 2%, bij donkere
// de donkerste 2%.
//   import { meetVlak } from './meet-achter.mjs'; await meetVlak(page, selector, css?)
import sharp from 'sharp';

const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const L = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);

export async function meetVlak(page, sel, { schermPad } = {}) {
  const el = page.locator(sel).first();
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  const regels = await page.evaluate((sel) => {
    const e = document.querySelector(sel); if (!e) return null;
    const box = e.getBoundingClientRect();
    const uit = [];
    const tw = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
    let t;
    while ((t = tw.nextNode())) {
      if (!t.textContent.trim()) continue;
      const p = t.parentElement; const cs = getComputedStyle(p);
      if (!p.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
      // alleen voor een schermlezer (1 px, afgeknipt): niet te zien, dus geen contrast
      let verstopt = false; for (let q = p; q && q !== e; q = q.parentElement) { const c = getComputedStyle(q); const rq = q.getBoundingClientRect(); if (rq.width <= 2 || rq.height <= 2 || (c.clip && c.clip !== 'auto') || /inset\(50%/.test(c.clipPath)) { verstopt = true; break; } }
      if (verstopt) continue;
      const m = cs.color.match(/[\d.]+/g).map(Number);
      const r = document.createRange(); r.selectNodeContents(t);
      for (const q of r.getClientRects()) {
        if (q.width < 2 || q.height < 4) continue;
        uit.push({ x: q.left - box.left, y: q.top - box.top, w: q.width, h: q.height, kleur: m, px: parseFloat(cs.fontSize), tekst: t.textContent.trim().slice(0, 40) });
      }
    }
    return { w: box.width, h: box.height, regels: uit };
  }, sel);
  if (!regels) return null;
  // tekst weg, vlak fotograferen
  await page.addStyleTag({ content: `${sel} *, ${sel} { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; text-decoration-color: transparent !important; caret-color: transparent !important; } ${sel} svg, ${sel} svg * { opacity: 0 !important; }` });
  await page.waitForTimeout(80);
  const buf = await el.screenshot({ animations: 'disabled' });
  if (schermPad) await sharp(buf).toFile(schermPad);
  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  const sx = info.width / regels.w, sy = info.height / regels.h;
  const uit = [];
  for (const r of regels.regels) {
    const x0 = Math.max(0, Math.floor(r.x * sx)), y0 = Math.max(0, Math.floor(r.y * sy));
    const x1 = Math.min(info.width, Math.ceil((r.x + r.w) * sx)), y1 = Math.min(info.height, Math.ceil((r.y + r.h) * sy));
    const ls = [], pix = [];
    for (let y = y0; y < y1; y += 1) for (let x = x0; x < x1; x += 1) {
      const i = (y * info.width + x) * info.channels;
      ls.push(L(data[i], data[i + 1], data[i + 2])); pix.push([data[i], data[i + 1], data[i + 2]]);
    }
    if (!ls.length) continue;
    const srt = [...ls].sort((a, b) => a - b);
    const med = srt[Math.floor(srt.length / 2)];
    let [cr, cg, cb, ca = 1] = r.kleur;
    // doorschijnende letters: mengen met de mediaan van de grond
    if (ca < 1) { const mi = ls.indexOf(med); const [br, bg, bb] = pix[mi]; cr = cr * ca + br * (1 - ca); cg = cg * ca + bg * (1 - ca); cb = cb * ca + bb * (1 - ca); }
    const lt = L(cr, cg, cb);
    const slechtst = lt > med ? srt[Math.floor(srt.length * 0.98)] : srt[Math.floor(srt.length * 0.02)];
    const ratio = (Math.max(lt, slechtst) + 0.05) / (Math.min(lt, slechtst) + 0.05);
    uit.push({ tekst: r.tekst, px: r.px, ratio: Math.round(ratio * 100) / 100 });
  }
  uit.sort((a, b) => a.ratio - b.ratio);
  return uit;
}
