// Ronde 9, stap 2.3 — videoaanvraag per stijl in de testomgeving: formulier → bedankpagina → mails → /admin.
import { start, sql, SITE } from './_dl.mjs';
import { adminLogin } from './_admin.mjs';
const rows = (r) => (Array.isArray(r) ? r : r.results || r.rows || []);
await fetch('http://localhost:4478/mails/clear');
const s = await start();
for (const [stijl, clips] of [['motion', '2'], ['lifestyle', '4'], ['campaign', '1'], ['custom', 'Weet ik nog niet']]) {
  await s.page.goto(SITE + '/nl/start/video/');
  await s.page.fill('#h-name', 'Video Proef'); await s.page.fill('#h-brand', `Videomerk ${stijl}`);
  await s.page.fill('#h-email', `video-${stijl}@merk.test`); await s.page.fill('#h-phone', '0612345678');
  await s.page.selectOption('#h-style', stijl); await s.page.selectOption('#h-clips', clips);
  const tekst = s.page.locator('form[action="/api/order"] textarea');
  if (await tekst.count()) await tekst.first().fill(`Proefaanvraag ${stijl}: 8 seconden, product draait rond. TEST — niet uitvoeren.`);
  await Promise.all([s.page.waitForNavigation(), s.page.click('form[action="/api/order"] button[type="submit"]')]);
  const kop = await s.page.evaluate(() => document.querySelector('h1')?.innerText.replace(/\s+/g, ' '));
  console.log(stijl, '→', new URL(s.page.url()).pathname + new URL(s.page.url()).search, '|', kop);
}
await s.page.waitForTimeout(1500);
const mails = await fetch('http://localhost:4478/mails').then((r) => r.json());
for (const m of mails) console.log('mail', m.n, m.to, '|', m.subject);
const o = rows(await sql(`SELECT id, ref, service, status, payment_status, json_extract(details_json,'$.style') AS style, json_extract(details_json,'$.clips') AS clips FROM orders WHERE email LIKE 'video-%' ORDER BY id`));
console.log(JSON.stringify(o));
const k = await start({ viewport: { width: 1280, height: 900 } });
await adminLogin(k.page);
for (const r of o) {
  await k.page.goto(`${SITE}/admin/orders/${r.id}`);
  const t = await k.page.evaluate(() => (document.querySelector('main') || document.body).innerText.replace(/\s+/g, ' ').slice(0, 260));
  console.log('admin', r.ref, '|', t);
}
await s.stop(); await k.stop?.();
process.exit(0);
