import { chromium } from 'playwright';
const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const pg = await br.newPage({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 2 });
await pg.goto('http://127.0.0.1:4340/start/catalog/', { waitUntil: 'load' });
await pg.waitForTimeout(700);
/* De drie vouwen delen `name="s1"` — dat is een exclusieve accordeon, dus er kan
   er maar één open. Daarom per opname eerst de juiste openzetten. */
for (const [naam, sel] of [['bg', '[data-pl-bg] .bg-grid'], ['model', '.mp-grid']]) {
  const box = await pg.evaluate((s) => {
    const el = document.querySelector(s);
    const det = el.closest('details');
    if (det) { det.removeAttribute('name'); det.open = true; }
    if (s === '.mp-grid') {
      const tpl = document.querySelector('[data-pl-own-tile]');
      if (tpl && !el.querySelector('.is-own')) {
        const n = tpl.content.cloneNode(true);
        const img = n.querySelector('img'); if (img) img.src = '/img/model-03.webp';
        const nm = n.querySelector('.mp-name'); if (nm) nm.textContent = 'Nova';
        el.appendChild(n);
      }
    }
    el.scrollIntoView({ block: 'start' });
    return null;
  }, sel);
  await pg.waitForTimeout(500);
  const r = await pg.evaluate((s) => {
    const el = document.querySelector(s);
    const b = el.getBoundingClientRect();
    return { x: Math.max(0, b.x - 10), y: Math.max(0, b.y - 10), width: Math.min(b.width + 20, 1270), height: Math.min(b.height + 20, 990) };
  }, sel);
  if (r.height < 10) { console.log(naam, 'nog steeds leeg', JSON.stringify(r)); continue; }
  await pg.screenshot({ path: `/tmp/k-${naam}.png`, clip: r });
  console.log(naam, 'ok', Math.round(r.width) + '×' + Math.round(r.height));
}
await br.close();
