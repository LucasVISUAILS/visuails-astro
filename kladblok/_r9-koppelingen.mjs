// Ronde 9 · stap 7: koppelingen die live niet te forceren zijn — dubbele webhook, chargeback, bounce, mislukte incasso.
// Elke mail die daarbij ontstaat wordt bewaard in /tmp/claude-0/koppelingen-mails.json (om daarna via Resend naar hello@ te sturen).
import fs from 'node:fs';
import crypto from 'node:crypto';
import { start, SITE, sql, sqlw, mails } from './_dl.mjs';
import { bestel, betaal } from './_bestel.mjs';
import { adminLogin } from './_admin.mjs';
const CTRL = 'http://localhost:4478';
const post = (p) => fetch(CTRL + p, { method: 'POST' }).then((r) => r.json());
const uit = [];
const bewaar = [];
const nieuweMails = async (sinds, label) => {
  const alle = await mails();
  const nieuw = alle.slice(sinds);
  for (const m of nieuw) {
    const html = await fetch(`${CTRL}/mail/${m.n}`).then((r) => r.text());
    const text = await fetch(`${CTRL}/mailtekst/${m.n}`).then((r) => r.text());
    bewaar.push({ label, to: m.to, subject: m.subject, html, text });
  }
  return nieuw.map((m) => `#${m.n} → ${[].concat(m.to).join(',')} "${m.subject}"`);
};
const k = await start(); const { page } = k;

/* ── A · dubbele webhook ─────────────────────────────────────────── */
await sqlw('DELETE FROM rate_limits');
const emailA = `dubbel${Date.now() % 100000}@merk.test`;
await bestel(page, { pad: '/nl/start/catalog', aantal: 1, klant: { email: emailA, first_name: 'Dirk', brand: 'Merk Dubbel' }, land: 'NL', vat: null });
await betaal(page); await page.waitForTimeout(800);
const [oA] = await sql(`SELECT o.id, o.ref, p.external_id FROM orders o JOIN payments p ON p.order_id=o.id WHERE o.email='${emailA}'`);
const telA = async () => JSON.stringify((await sql(`SELECT (SELECT COUNT(*) FROM payments WHERE order_id=${oA.id}) AS betalingen, (SELECT COUNT(*) FROM invoices WHERE order_id=${oA.id}) AS facturen, (SELECT payment_status FROM orders WHERE id=${oA.id}) AS status, (SELECT COUNT(*) FROM order_events WHERE order_id=${oA.id}) AS gebeurtenissen`))[0]);
const voorA = (await mails()).length;
uit.push(`A dubbele webhook · ${oA.ref} vóór: ${await telA()}`);
for (let i = 0; i < 3; i++) uit.push(`  webhook opnieuw → ${(await post(`/rewebhook/${oA.external_id}`)).webhook}`);
uit.push(`  na 3× opnieuw: ${await telA()} · nieuwe mails: ${(await nieuweMails(voorA, 'dubbel')).join(' | ') || 'geen'}`);

/* ── B · chargeback ──────────────────────────────────────────────── */
const voorB = (await mails()).length;
const cb = await post(`/chargeback/${oA.external_id}`);
await new Promise((r) => setTimeout(r, 800));
uit.push(`B chargeback op ${oA.ref} (status blijft 'paid', amountChargedBack = volledig) → webhook ${cb.webhook}`);
uit.push(`  daarna: ${await telA()} · refunded_cents ${(await sql(`SELECT refunded_cents FROM orders WHERE id=${oA.id}`))[0].refunded_cents} · nieuwe mails: ${(await nieuweMails(voorB, 'chargeback')).join(' | ') || 'GEEN'}`);
uit.push(`  laatste gebeurtenis: ${JSON.stringify((await sql(`SELECT kind, substr(COALESCE(note,''),1,120) AS note FROM order_events WHERE order_id=${oA.id} ORDER BY id DESC LIMIT 1`).catch(() => [{}]))[0])}`);
const admin = await k.ctx.newPage(); await adminLogin(admin);
await admin.goto(`${SITE}/admin/orders/${oA.id}/files`);
uit.push(`  /admin bestelpagina zegt: ${await admin.evaluate(() => (document.querySelector('main')?.innerText.match(/(chargeback|terugboeking|teruggeboekt|storno)[^\n]*/i) || ['niets over een terugboeking'])[0])}`);

/* ── C · bounce ──────────────────────────────────────────────────── */
const secret = 'whsec_' + Buffer.from('proef-geheim-resend-webhook-32b!').toString('base64');
const bounceVoor = async (type, id) => {
  const body = JSON.stringify({ type, created_at: new Date().toISOString(), data: { email_id: 'em_' + id, from: 'VISUAILS <orders@visuails.com>', to: [emailA], subject: `Bestelling ${oA.ref}`, bounce: { type: 'Permanent', subType: 'General', message: 'mailbox does not exist' } } });
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = crypto.createHmac('sha256', Buffer.from(secret.slice(6), 'base64')).update(`msg_${id}.${ts}.${body}`).digest('base64');
  const r = await fetch(`${SITE}/api/webhook/resend`, { method: 'POST', headers: { 'content-type': 'application/json', 'svix-id': `msg_${id}`, 'svix-timestamp': ts, 'svix-signature': `v1,${sig}` }, body });
  return `${r.status} ${await r.text()}`;
};
uit.push(`C bounce (email.bounced) → ${await bounceVoor('email.bounced', 'b1')} · nog eens dezelfde → ${await bounceVoor('email.bounced', 'b1')}`);
const nep = await fetch(`${SITE}/api/webhook/resend`, { method: 'POST', headers: { 'content-type': 'application/json', 'svix-id': 'msg_x', 'svix-timestamp': String(Math.floor(Date.now() / 1000)), 'svix-signature': 'v1,AAAA' }, body: '{}' });
uit.push(`  zonder geldige handtekening → ${nep.status}`);
await admin.goto(`${SITE}/admin/orders/${oA.id}/files`);
uit.push(`  /admin bestelpagina: ${await admin.evaluate(() => [...document.querySelectorAll('main .warnline.is-rood')].map((e) => e.textContent.trim()).join(' | ') || 'geen melding')}`);
await admin.goto(`${SITE}/admin`);
uit.push(`  /admin dashboard: ${await admin.evaluate((r) => { const rij = [...document.querySelectorAll('main tr, main li, main article')].find((e) => e.textContent.includes(r)); return rij ? (rij.querySelector('.warnline')?.textContent.trim() || 'rij zonder melding') : 'rij niet gevonden'; }, oA.ref)}`);

/* ── D · mislukte incasso ────────────────────────────────────────── */
await sqlw('DELETE FROM rate_limits');
const emailD = `incasso${Date.now() % 100000}@merk.test`;
await page.goto(SITE + '/nl/start/plan/?plan=studio', { waitUntil: 'load' });
const f = page.locator('main form[action="/api/plan"]');
for (const [n, v] of Object.entries({ first_name: 'Ina', last_name: 'Incasso', email: emailD, phone: '06 1234 5678', brand: 'Merk Incasso', address_line1: 'Teststraat 1', postal_code: '1234 AB', city: 'Teststad' })) await f.locator(`[name=${n}]`).fill(v);
await f.locator('[name=country]').selectOption('NL');
await page.evaluate(() => { const c = document.querySelector('[name=no_vat]'); if (c && !c.checked) c.click(); });
await f.locator('[name=reg_number]').fill('12345678');
await f.locator('[name=window_day]').selectOption('4');
await page.evaluate(() => { const c = document.querySelector('[name=business_declaration]'); if (c && !c.checked) c.click(); });
await Promise.all([page.waitForNavigation().catch(() => {}), f.locator('button[type=submit]').last().click()]);
await page.waitForTimeout(1200);
uit.push(`D abonnement afsluiten → ${page.url().replace(SITE, '')}`);
if (/checkout/.test(page.url())) await betaal(page);
await new Promise((r) => setTimeout(r, 1000));
const subs = await fetch(CTRL + '/subs').then((r) => r.json());
const [abo] = await sql(`SELECT s.id, s.ref, s.status, s.mollie_subscription_id FROM subscriptions s JOIN customers c ON c.id=s.customer_id WHERE c.email='${emailD}'`);
uit.push(`  na eerste betaling: ${JSON.stringify(abo)} · nep-Mollie-abonnementen: ${subs.length}`);
const sub = subs.find((s) => s.id === abo?.mollie_subscription_id) || subs.at(-1);
if (sub) {
  const voorD = (await mails()).length;
  const volgende = new Date(Date.now() + 31 * 86400000).toISOString().slice(0, 10);
  const r = await post(`/sub/${sub.id}/charge?status=failed&op=${volgende}`);
  await new Promise((res) => setTimeout(res, 1000));
  uit.push(`  incasso ${volgende} mislukt → webhook ${r.webhook}`);
  uit.push(`  daarna: ${JSON.stringify((await sql(`SELECT status, pause_reason FROM subscriptions WHERE id=${abo.id}`))[0])} · mails: ${(await nieuweMails(voorD, 'incasso')).join(' | ') || 'GEEN'}`);
  await admin.goto(`${SITE}/admin/subscriptions/${abo.id}`).catch(() => {});
  uit.push(`  /admin: ${await admin.evaluate(() => (document.querySelector('main')?.innerText.match(/[^\n]*(mislukt|gepauzeerd|pauze)[^\n]*/i) || ['—'])[0].slice(0, 200))}`);
}
fs.writeFileSync('/tmp/claude-0/koppelingen-mails.json', JSON.stringify(bewaar, null, 1));
console.log(uit.join('\n'));
process.exit(0);
