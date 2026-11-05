// Fotografeert elke poster uit posters-<taal>.html (1200 × 1500, schaal 1,6 → 1920 × 2400) en een kale versie zonder
// tekst (schaal 1) om het contrast te meten. TAAL=nl|en node render.cjs [nummers...] → uit-<taal>/
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const TAAL = process.env.TAAL || 'nl';
const HIER = __dirname, UIT = path.join(HIER, `uit-${TAAL}`); fs.mkdirSync(UIT, { recursive: true });
const alleen = process.argv.slice(2);
(async () => {
  const b = await chromium.launch();
  for (const [dsf, kaal] of [[1.6, false], [1, true]]) {
    const p = await b.newPage({ viewport: { width: 1240, height: 1600 }, deviceScaleFactor: dsf });
    await p.goto('file://' + path.join(HIER, `posters-${TAAL}.html`));
    await p.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map((i) => i.decode().catch(() => {}))); });
    await p.waitForTimeout(400);
    await p.evaluate(() => window.pas());
    const maten = await p.evaluate(() => [...document.querySelectorAll('.p')].map((s) => {
      const o = s.getBoundingClientRect();
      return { naam: s.dataset.naam, tekst: [...s.querySelectorAll('.t')].map((t) => {
        const r = t.getBoundingClientRect(), c = getComputedStyle(t);
        return { tekst: t.innerText.replace(/\s+/g, ' ').trim(), x: r.left - o.left, y: r.top - o.top, w: r.width, h: r.height, kleur: c.color, px: parseFloat(c.fontSize), soort: t.className };
      }) };
    }));
    if (kaal) { fs.writeFileSync(path.join(UIT, 'maten.json'), JSON.stringify(maten, null, 1)); await p.evaluate(() => document.body.classList.add('kaal')); await p.waitForTimeout(100); }
    for (const s of await p.$$('.p')) {
      const naam = await s.getAttribute('data-naam');
      if (alleen.length && !alleen.some((a) => naam.startsWith(a))) continue;
      await s.screenshot({ path: path.join(UIT, kaal ? `kaal-${naam}.png` : `${naam}.png`) });
    }
    await p.close();
  }
  await b.close();
})();
