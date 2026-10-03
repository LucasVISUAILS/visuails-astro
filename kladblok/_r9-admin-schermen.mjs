// Herontwerp · /admin: de hoofdschermen, licht en donker, 1440 en 390.
import fs from 'node:fs';
import { start, SITE, sql } from './_dl.mjs';
import { adminLogin } from './_admin.mjs';
const D = process.argv[2] || '/tmp/claude-0/admin';
const alleen = process.argv[3] ? process.argv[3].split(',') : null;
fs.mkdirSync(D, { recursive: true });
const rows = (r) => (Array.isArray(r) ? r : r.results || r.rows || []);
const o = rows(await sql(`SELECT id FROM orders WHERE status='delivered' ORDER BY id DESC LIMIT 1`))[0];
const k1 = rows(await sql(`SELECT id FROM customers ORDER BY id LIMIT 1`))[0];
const paginas = [['dashboard', '/admin'], ['planning', '/admin/planning'], ['klanten', '/admin/customers'], ['klant', `/admin/customers/${k1.id}`], ['bestelling', `/admin/orders/${o.id}`], ['facturen', '/admin/facturen'], ['melding', '/admin/melding'], ['btw', '/admin/vat']];
for (const thema of ['licht', 'donker']) for (const [w, mob] of [[1440, false], [390, true]]) {
  const k = await start({ mobiel: mob, viewport: mob ? null : { width: w, height: 900 } });
  await adminLogin(k.page);
  await k.page.goto(`${SITE}/admin?thema=${thema}`);
  for (const [n, p] of paginas) {
    if (alleen && !alleen.includes(n)) continue;
    await k.page.goto(SITE + p); await k.page.waitForTimeout(300);
    const sc = await k.page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    console.log(thema, w, n, 'scroll', sc);
    await k.page.screenshot({ path: `${D}/${n}-${thema}-${w}.png`, fullPage: true });
  }
}
process.exit(0);
