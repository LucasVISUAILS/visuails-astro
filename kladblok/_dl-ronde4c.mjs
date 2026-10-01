// Ronde 4, deel 3: pauzeren na opzeggen (via een echt formulier), de offertemail
// (aanbetaling + zakelijke verklaring), de beschikbaarheid vóór /start/plan, en
// de tegoedmelding op een bestelpagina in /admin.
import { start, foto, tekst, mails, mailtekst, sql, sqlw, SITE } from './_dl.mjs';
import { adminLogin } from './_admin.mjs';
import { studioLogin } from './_studio.mjs';

await sqlw('DELETE FROM rate_limits');
const post = (page, action, velden) => page.evaluate(({ action, velden }) => {
  const f = document.createElement('form'); f.method = 'post'; f.action = action;
  for (const [k, v] of Object.entries(velden)) { const i = document.createElement('input'); i.name = k; i.value = v; f.append(i); }
  document.body.append(f); f.submit();
}, { action, velden });

/* 1 · Pauzeren op een opgezegd vooruitbetaald jaar: gebeurt niet. */
{
  const s = await start(); const { page } = s;
  await studioLogin(page, 'ronde4@merk.test');
  await page.goto(SITE + '/account/plan?tab=facturering', { waitUntil: 'load' });
  await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), post(page, '/account/plan/pause', { do: 'pause' })]);
  const k = await sql("SELECT s.status FROM subscriptions s JOIN customers c ON c.id = s.customer_id WHERE c.email = 'ronde4@merk.test' ORDER BY s.id DESC LIMIT 1");
  console.log('1 · pauzeren na opzeggen →', page.url().replace(SITE, ''), JSON.stringify(k));
  await s.stop();
}

/* 2 · Offerte op een aanvraag zonder zakelijke verklaring, als aanbetaling. */
{
  const o = await sql("SELECT id, ref, details_json FROM orders WHERE service IN ('custom','video') AND COALESCE(payment_status,'') <> 'paid' ORDER BY id DESC LIMIT 1");
  if (!o[0]) { console.log('2 · geen open aanvraag gevonden'); }
  else {
    console.log('2 · aanvraag', o[0].ref, 'verklaring:', JSON.parse(o[0].details_json || '{}').business_declaration);
    const s = await start(); const { page } = s;
    await adminLogin(page);
    await page.goto(SITE + `/admin/orders/${o[0].id}/files`, { waitUntil: 'load' });
    const f = page.locator(`form[action="/admin/orders/${o[0].id}/quote"]`);
    console.log('   formulier:', (await f.innerText()).replace(/\s+/g, ' '));
    await foto(page, 'r4-offerte-form', { vol: true });
    await f.locator('input[name="amount"]').fill('400');
    await f.locator('input[name="soort"][value="aanbetaling"]').check();
    const voor = (await mails()).length;
    await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), f.locator('button[type="submit"]').click()]);
    console.log('   na offerte →', page.url().replace(SITE, ''));
    for (const m of (await mails()).slice(voor)) {
      console.log(`   MAIL → ${JSON.stringify(m.to)} "${m.subject}"`);
      console.log('   ' + String(await mailtekst(m.n)).replace(/\s+/g, ' ').slice(0, 900));
    }
    console.log('   tijdlijn:', JSON.stringify(await sql(`SELECT note FROM order_events WHERE order_id = ${o[0].id} ORDER BY id DESC LIMIT 2`)));
    console.log('   opgeslagen soort:', JSON.parse((await sql(`SELECT details_json FROM orders WHERE id = ${o[0].id}`))[0].details_json).quote_kind);
    await s.stop();
  }
}

/* 3 · /start/plan: de beschikbaarheid, gewoon en vol. */
{
  const s = await start(); const { page } = s;
  await page.goto(SITE + '/nl/start/plan', { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  console.log('3 · gewoon:', await page.locator('[data-ps-plek]').innerText().catch(() => '(verborgen)'));
  await foto(page, 'r4-plek-gewoon');
  /* Vullen: genoeg lopende Brand-abonnementen om alleen Starter nog toe te laten. */
  const klant = (await sql('SELECT id FROM customers ORDER BY id LIMIT 1'))[0].id;
  await sqlw(`INSERT INTO subscriptions (customer_id, ref, plan, term, status, window_day, created_at) VALUES (${klant}, 'SUB-VOL-1', 'brand', 'monthly', 'paused', 3, datetime('now')), (${klant}, 'SUB-VOL-2', 'studio', 'monthly', 'paused', 3, datetime('now'))`);
  const r = await page.request.get(SITE + '/api/plan-plek');
  console.log('   api na vullen:', r.status(), await r.text());
  await page.goto(SITE + '/nl/start/plan?x=1', { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  console.log('   deels vol:', await page.locator('[data-ps-plek]').innerText().catch(() => '(verborgen)'));
  console.log('   uitgeschakeld:', await page.evaluate(() => [...document.querySelectorAll('input[name="plan"]')].map((r) => `${r.value}:${r.disabled ? 'vol' : 'open'}${r.checked ? '*' : ''}`).join(' ')));
  await foto(page, 'r4-plek-vol', { vol: false });
  await sqlw("DELETE FROM subscriptions WHERE ref LIKE 'SUB-VOL-%'");
  console.log('fouten:', s.fouten);
  await s.stop();
}

/* 4 · De tegoedmelding op een bestelpagina in /admin. */
{
  const o = await sql("SELECT id, customer_id FROM orders WHERE customer_id IS NOT NULL ORDER BY id DESC LIMIT 1");
  await sqlw(`INSERT INTO customer_credits (customer_id, delta_cents, reason) VALUES (${o[0].customer_id}, 5000, 'Proef (doorloop)')`);
  const s = await start(); const { page } = s;
  await adminLogin(page);
  await page.goto(SITE + `/admin/orders/${o[0].id}/files`, { waitUntil: 'load' });
  const t = (await tekst(page, 'main, body')).replace(/\s+/g, ' ');
  console.log('4 · kop:', t.match(/VIS-[A-Z0-9-]+ .{0,90}/)?.[0]);
  console.log('   tegoed:', t.match(/Deze klant heeft.{0,140}/)?.[0]);
  await s.stop();
}
