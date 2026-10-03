// Ronde 9, F65: foto's bij een abonnementsproduct moeten mee naar de bestelling die de weekstart maakt.
import { start, sql, SITE } from './_dl.mjs';
import { adminLogin } from './_admin.mjs';
const volt = await fetch('http://localhost:4478/').then((r) => r.json()).then((j) => j.volt);
const s = await start({ cookie: volt.token }); const { page } = s;
await page.goto(SITE + '/account/plan?tab=bestellen');
const add = page.locator('form[action="/account/plan/queue"]:has(input[name="do"][value="add"])');
await add.locator('#q-name').fill('Hoodie F65 (TEST)');
await add.locator('#q-type').selectOption('jacket').catch(async () => add.locator('#q-type').selectOption({ index: 3 }));
await add.locator('input[name="fotos_voorkant"]').setInputFiles('/tmp/claude-0/dl/voor.jpg');
await add.locator('input[name="fotos_achterkant"]').setInputFiles('/tmp/claude-0/dl/achter.jpg');
await add.locator('input[name="fotos_detail"]').setInputFiles('/tmp/claude-0/dl/detail.jpg');
await Promise.all([page.waitForNavigation(), add.locator('button[type="submit"]').last().click()]);
console.log('na toevoegen:', page.url());
const q = (await sql(`SELECT id, name, note, upload_batch, locked_at FROM plan_queue WHERE customer_id=${volt.id} ORDER BY id DESC LIMIT 1`))[0];
console.log('rij:', q);
if (!q.locked_at) {
  await Promise.all([page.waitForNavigation(), page.evaluate((id) => { const f = [...document.querySelectorAll('form')].find((f) => f.querySelector('input[name="do"][value="lock"]') && f.querySelector(`input[name="id"][value="${id}"]`)); f.requestSubmit(f.querySelector('button')); }, q.id)]);
  console.log('na lock:', page.url(), (await sql(`SELECT locked_at FROM plan_queue WHERE id=${q.id}`))[0]);
}
const a = await start(); await adminLogin(a.page);
await a.page.goto(SITE + `/admin/customers/${volt.id}`);
const f = a.page.locator(`form[action="/admin/customers/${volt.id}/week"]`);
if (!await f.count()) { console.log('GEEN weekknop:', (await a.page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '))).match(/ABONNEMENTSWEEK[\s\S]{0,400}/)?.[0]); }
else {
  await Promise.all([a.page.waitForNavigation(), f.locator('button[type="submit"]').click()]);
  console.log('week:', a.page.url());
  const o = (await sql(`SELECT id, ref, service, details_json FROM orders WHERE customer_id=${volt.id} ORDER BY id DESC LIMIT 1`))[0];
  const d = JSON.parse(o.details_json);
  console.log('order', o.ref, 'product_p1 =', d.product_p1, 'garment_p1 =', d.garment_p1, 'note_p1 =', d.note_p1, 'batch_p1 =', d.batch_p1 ? 'ja' : 'nee');
  console.log('files:', await sql(`SELECT kind, product_key, shot, filename FROM files WHERE order_id=${o.id}`));
  await a.page.goto(SITE + `/admin/orders/${o.id}/files`);
  const t = await a.page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
  console.log('bord:', t.slice(t.indexOf('Product 1'), t.indexOf('Product 1') + 260));
  await a.page.screenshot({ path: '/tmp/claude-0/f65-bord.png', fullPage: true });
}
await s.stop(); await a.stop();
