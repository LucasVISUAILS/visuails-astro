// Ronde 9 · stap 7: mislukte incasso op een lopend abonnement (vervolg op _r9-koppelingen D; betaalt de eerste termijn via het paneel).
import fs from 'node:fs';
import { start, SITE, sql, mails } from './_dl.mjs';
import { adminLogin } from './_admin.mjs';
const CTRL = 'http://localhost:4478';
const post = (p) => fetch(CTRL + p, { method: 'POST' }).then((r) => r.json());
const uit = [];
const first = (await fetch(CTRL + '/payments').then((r) => r.json())).filter((p) => p.sequenceType === 'first' && p.status === 'open').at(-1);
const r1 = await post(`/pay/${first.id}/paid?json=1`);
uit.push(`eerste termijn ${first.description} betaald → webhook ${r1.webhook}`);
await new Promise((r) => setTimeout(r, 1200));
const ref = first.description.match(/SUB-[A-Z0-9-]+/)[0];
const [abo] = await sql(`SELECT id, ref, status, mollie_subscription_id FROM subscriptions WHERE ref='${ref}'`);
uit.push(`abonnement: ${JSON.stringify(abo)}`);
const voor = (await mails()).length;
const volgende = new Date(Date.now() + 31 * 86400000).toISOString().slice(0, 10);
const r = await post(`/sub/${abo.mollie_subscription_id}/charge?status=failed&op=${volgende}`);
await new Promise((res) => setTimeout(res, 1200));
uit.push(`incasso ${volgende} mislukt → webhook ${r.webhook}`);
uit.push(`daarna: ${JSON.stringify((await sql(`SELECT status, pause_reason FROM subscriptions WHERE id=${abo.id}`))[0])}`);
const nieuw = (await mails()).slice(voor);
const bewaar = JSON.parse(fs.readFileSync('/tmp/claude-0/koppelingen-mails.json', 'utf8')).filter((m) => m.label !== 'incasso');
for (const m of nieuw) {
  uit.push(`mail #${m.n} → ${[].concat(m.to).join(',')} "${m.subject}"`);
  bewaar.push({ label: 'incasso', to: m.to, subject: m.subject, html: await fetch(`${CTRL}/mail/${m.n}`).then((x) => x.text()), text: await fetch(`${CTRL}/mailtekst/${m.n}`).then((x) => x.text()) });
}
fs.writeFileSync('/tmp/claude-0/koppelingen-mails.json', JSON.stringify(bewaar, null, 1));
const k = await start(); const admin = k.page; await adminLogin(admin);
await admin.goto(`${SITE}/admin`);
uit.push(`/admin dashboard: ${await admin.evaluate((r) => [...document.querySelectorAll('main *')].filter((e) => e.children.length === 0 && e.textContent.includes(r)).map((e) => e.closest('li,tr,article,section,p')?.innerText.replace(/\s+/g, ' ').slice(0, 200)).slice(0, 2).join(' | ') || 'niet genoemd', ref)}`);
console.log(uit.join('\n'));
process.exit(0);
