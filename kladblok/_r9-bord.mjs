// Ronde 9 · F17: het werkbord per dienst (lifestyle 3 beelden, catalog 4 + extra hoeken).
import { start, foto, tekst, SITE, sql } from './_dl.mjs';
import { adminLogin } from './_admin.mjs';
const rijen = await sql("SELECT id, ref, service, json_extract(details_json,'$.extra_slots') AS ex FROM orders WHERE payment_status='paid' OR ref='VIS-DYFD-AM9' ORDER BY id DESC LIMIT 40");
const lijst = Array.isArray(rijen) ? rijen : (rijen.results || rijen.rows || []);
const cat = lijst.find((r) => r.ex) ; const life = lijst.find((r) => r.service === 'lifestyle');
console.log('catalog met hoeken:', cat, '\nlifestyle:', life);
const s = await start(); const { page } = s;
console.log(await adminLogin(page));
for (const o of [cat, life].filter(Boolean)) {
  await page.goto(`${SITE}/admin/orders/${o.id}/files`, { waitUntil: 'load' });
  const t = await tekst(page, 'main, body');
  const vakken = await page.$$eval('input[name=shot]', (xs) => [...new Set(xs.map((x) => x.value))]);
  console.log(`\n== ${o.ref} (${o.service}) vakken:`, vakken.join(','));
  console.log(t.split('\n').filter((r) => /van \d+|\d+\/\d+|Beeld|Driekwart|Flat|Op een model|Gedragen|4K|Extra hoeken/i.test(r)).slice(0, 25).join('\n'));
  await foto(page, `r9-bord-${o.service}`, { vol: true });
}
console.log(s.fouten);
await s.stop();
