// Ronde 9 · F32-familie: elementen waar een kleurtoken ongeldig is (verwijst naar niets).
import { start, SITE } from './_dl.mjs';
const paden = (process.argv[2] || '/nl/,/,/nl/catalog/,/nl/lifestyle/,/nl/pricing/,/nl/faq/,/nl/start/catalog/,/nl/contact/,/nl/gallery/,/nl/video/').split(',');
const s = await start({ mobiel: process.argv[3] === '390' }); const { page } = s;
for (const pad of paden) {
  await page.goto(SITE + pad, { waitUntil: 'load' });
  const r = await page.evaluate(() => {
    const tokens = ['--ink', '--ink-2', '--ink-3', '--bg', '--paper', '--line', '--accent', '--surface'];
    const fout = new Map();
    for (const e of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(e);
      for (const t of tokens) {
        const p = e.parentElement ? getComputedStyle(e.parentElement).getPropertyValue(t) : 'x';
        if (cs.getPropertyValue(t) === '' && p !== '') { const k = `${t} @ ${e.tagName.toLowerCase()}.${String(e.className).split(' ')[0]}`; fout.set(k, (fout.get(k) || 0) + 1); }
      }
    }
    return [...fout.entries()].map(([k, n]) => `${k} ×${n}`);
  });
  console.log(pad, r.length ? r.join(' | ') : 'ok');
}
await s.stop();
