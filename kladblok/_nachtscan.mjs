/* Contrastveeg over de nachtproef: dezelfde rekensom als
   kladblok/leesbaar-alles.mjs, maar met de proef-CSS erop. Meldt alleen tekst
   op een EFFEN vlak; tekst op een foto of verloop kan een rekensom niet
   beoordelen en staat apart geteld. */
import fs from 'node:fs';
import { chromium } from 'playwright';
const CSS = fs.readFileSync('kladblok/nachtproef.css', 'utf8');
const PADEN = JSON.parse(fs.readFileSync('kladblok/_paden.json', 'utf8'));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
let fout = 0; let beeld = 0;
for (const pad of PADEN) {
  const p = await ctx.newPage();
  try {
    const url = 'http://127.0.0.1:4399' + (pad === '/' ? '/nl/' : '/nl' + pad);
    let r0 = await p.goto(url, { waitUntil: 'load' });
    /* De kladblokserver geeft onder snelle opeenvolgende verzoeken af en toe
       een 404 terug op een pad dat wél bestaat. Eén keer opnieuw vragen lost
       het op; zonder deze regel meet je de 404-pagina en niet de site. */
    if (!r0 || r0.status() !== 200) { await p.waitForTimeout(250); r0 = await p.goto(url, { waitUntil: 'load' }); }
    if (!r0 || r0.status() !== 200) { console.log(pad, 'overgeslagen — status', r0 && r0.status()); await p.close(); continue; }
    await p.addStyleTag({ content: CSS });
    await p.evaluate(() => document.documentElement.setAttribute('data-nacht', ''));
    await p.waitForTimeout(150);
    const r = await p.evaluate(() => {
      const lum = (c) => { const v = c.match(/[\d.]+/g).map(Number).slice(0, 3).map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
      const meng = (voor, achter) => { const a = Number((voor.match(/[\d.]+/g) || [])[3] ?? 1); const v = voor.match(/[\d.]+/g).map(Number); const w = achter.match(/[\d.]+/g).map(Number); return `rgb(${v[0] * a + w[0] * (1 - a)},${v[1] * a + w[1] * (1 - a)},${v[2] * a + w[2] * (1 - a)})`; };
      const uit = []; let opBeeld = 0;
      for (const el of document.querySelectorAll('body *')) {
        if (el.children.length || !(el.textContent || '').trim()) continue;
        if (el.closest('[aria-hidden="true"]')) continue;
        /* De balk schildert zijn grond met een ::after, en een pseudo-element
           heeft geen node om langs te lopen. Deze veeg zou er dus altijd de
           PAGINAGROND onder zien en elke balktekst als onleesbaar melden.
           De balk is met de hand nagekeken in de schermafdrukken. */
        if (el.closest('.site-header, .nav-menu, .pk-sluit')) continue;
        const c = getComputedStyle(el);
        if (c.visibility === 'hidden' || c.display === 'none' || Number(c.opacity) < .1) continue;
        let n = el, g = null, foto = false;
        while (n && n !== document.documentElement) {
          const s = getComputedStyle(n);
          if (s.backgroundImage && s.backgroundImage !== 'none') { foto = true; break; }
          if (s.backgroundColor && s.backgroundColor !== 'rgba(0, 0, 0, 0)') { g = s.backgroundColor; break; }
          n = n.parentElement;
        }
        if (foto) { opBeeld++; continue; }
        if (!g) g = 'rgb(12,13,16)';
        const px = parseFloat(c.fontSize); const vet = Number(c.fontWeight) >= 700;
        const norm = (px >= 24 || (px >= 18.66 && vet)) ? 3 : 4.5;
        const l1 = lum(meng(c.color, g)); const l2 = lum(g);
        const v = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
        if (v < norm) uit.push(`${v.toFixed(2)}:1 (eis ${norm}) ${el.tagName}.${String(el.className).slice(0, 20)} — "${(el.textContent || '').trim().slice(0, 30)}" ${Math.round(px)}px`);
      }
      return { uit, opBeeld };
    });
    if (r.uit.length) { console.log('\n' + pad); for (const l of r.uit) console.log('   ' + l); }
    fout += r.uit.length; beeld += r.opBeeld;
  } catch (e) { console.log(pad, 'FOUT', e.message.slice(0, 60)); }
  await p.close();
}
console.log(`\n${PADEN.length} pagina's · ${fout} onleesbaar op een effen vlak, ${beeld} op beeld/verloop (handmatig)`);
await b.close();
