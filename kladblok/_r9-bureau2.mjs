// Ronde 9 · klanttype 7: betaalde video via /api/order-pay → betaalmail (F40, O21) en portaal (F40).
import { start, SITE, sql, mails, mailtekst } from './_dl.mjs';
import { betaal } from './_bestel.mjs';
const [o] = await sql("SELECT id, ref, email FROM orders WHERE email LIKE 'bureau%@merk.test' AND service='video' ORDER BY id DESC LIMIT 1");
const k = await start(); const { page } = k;
const voor = (await mails()).length;
const loc = (await fetch(`${SITE}/api/order-pay?ref=${o.ref}&lang=nl`, { redirect: 'manual' })).headers.get('location');
await page.goto(loc, { waitUntil: 'load' });
console.log('naar:', page.url());
await betaal(page);
console.log('terug:', page.url());
await page.waitForTimeout(1500);
for (const m of (await mails()).slice(voor)) {
  const t = await mailtekst(m.n);
  console.log(`MAIL "${m.subject}"`);
  if (/Betaling ontvangen/.test(m.subject)) console.log(t.slice(0, 700));
}
// het portaal: de link uit de eerste mail
const alle = await mails();
let link = null;
for (const m of alle) { if (m.subject.includes(o.ref) && /aanvraag/.test(m.subject)) { const t = await mailtekst(m.n); link = (t.match(/https?:\/\/[^\s)]+\/o\/[A-Za-z0-9_-]+/) || [])[0]; if (link) break; } }
if (link) {
  await page.goto(link.replace(/^https?:\/\/[^/]+/, SITE), { waitUntil: 'load' });
  console.log('portaal:', (await page.evaluate(() => document.querySelector('main').innerText)).replace(/\n{2,}/g, '\n').slice(0, 700));
} else console.log('geen portaallink gevonden');
process.exit(0);
