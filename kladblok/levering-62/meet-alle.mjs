// Levering 62 · lijst 42: elke tekst in elk sfeervlak, het €1-blok en de voet tegen de pixels
// erachter, op elke pagina, op 1440, 900 en 390.   node meet-alle.mjs <uit.json> [breedtes] [paginas]
import { chromium } from 'playwright';
import fs from 'node:fs';
import { meetVlak } from './meet-achter.mjs';
const UIT = process.argv[2] || 'meting-alle.json';
const BREED = (process.argv[3] || '1440,900,390').split(',').map(Number);
const PAG = process.argv[4] ? process.argv[4].split(',') : JSON.parse(fs.readFileSync(new URL('../hoek/paginas.json', import.meta.url), 'utf8'));
const SEL = ['.h-kopbeeld-getal', '.h-nf-getal', '.h-weten-rij > .h-groot > a', '.h-sd-sl-groot', '.h-pl-kern', '.h-pr-som', '.h-st-band', '.h-lk-slot', '.h-rest', '.jur-uit', '.h-ct-wa', '.h-vd-klip', '.h-ed-vgl li.is-eigen', '.h-sd-scherm', '.h-ov-ctrl', '.h-ov-cijfer-licht', '.lime-plate', 'section.h-proef', 'footer.site-footer'];
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined });
const uit = [];
await Promise.all(BREED.map(async (w) => {
  const ctx = await b.newContext({ viewport: { width: w, height: w < 600 ? 844 : 900 }, reducedMotion: 'reduce' });
  for (const p of PAG) {
    const page = await ctx.newPage();
    try {
      await page.goto((process.env.BASIS || 'http://127.0.0.1:4399') + p, { waitUntil: 'load', timeout: 45000 });
      const k = await page.$('#cc-bar [data-cc="reject"]'); if (k && await k.isVisible()) await k.click();
      await page.addStyleTag({ content: '.wa-launcher,.h-melding{display:none!important}' });
      const n = await page.evaluate((SEL) => { let i = 0; const lijst = []; for (const s of SEL) for (const e of document.querySelectorAll(s)) { const r = e.getBoundingClientRect(); if (r.width < 40 || r.height < 40) continue; if (e.closest('[hidden]')) continue; e.setAttribute('data-meet', String(i)); lijst.push([i, s, getComputedStyle(e).backgroundImage.match(/achter\/([\w-]+)\.webp/)?.[1] || '']); i++; } return lijst; }, SEL);
      await page.waitForTimeout(300);
      for (const [i, s, beeld] of n) {
        await page.evaluate((i) => { const v = document.querySelector(`[data-meet="${i}"]`); for (const e of document.querySelectorAll('body *')) { if (v && (v.contains(e) || e.contains(v))) continue; const cs = getComputedStyle(e); if (cs.position === 'fixed' || cs.position === 'sticky') e.style.visibility = 'hidden'; } }, i);
        const m = await meetVlak(page, `[data-meet="${i}"]`);
        const laag = (m || []).filter((x) => x.ratio < 4.5);
        uit.push({ p, w, s, beeld, n: (m || []).length, min: m && m[0] ? m[0].ratio : null, minTekst: m && m[0] ? m[0].tekst : '', onder: laag.map((x) => `${x.ratio} ${x.px}px ${x.tekst}`) });
      }
    } catch (e) { uit.push({ p, w, fout: e.message.slice(0, 120) }); }
    await page.close();
  }
  await ctx.close();
}));
await b.close();
fs.writeFileSync(UIT, JSON.stringify(uit, null, 1));
const fout = uit.filter((x) => x.fout || (x.onder && x.onder.length));
console.log('metingen', uit.length, '· onder 4,5 of fout:', fout.length);
for (const x of fout) console.log(x.w, x.p, x.s, x.beeld || '', x.fout || x.onder.slice(0, 3).join(' | '));
