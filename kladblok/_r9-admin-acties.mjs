// Ronde 9 · stap 5: /admin — verbergen, verwijderen (verkeerd en goed kenmerk), CSV per kwartaal, sessie kwijt.
import { start, SITE, sql, sqlw } from './_dl.mjs';
import { bestel, betaal } from './_bestel.mjs';
import { adminLogin } from './_admin.mjs';
const k = await start(); const { page } = k;
const uit = [];
/* Twee bestellingen: één betaald, één niet. */
const email = `acties${Date.now() % 100000}@merk.test`;
for (const st of ['paid', null]) {
  await sqlw('DELETE FROM rate_limits');
  await bestel(page, { pad: '/nl/start/catalog', aantal: 1, klant: { email, first_name: 'Ad', brand: 'Merk Acties' }, land: 'NL', vat: null });
  if (st && /4478|nep-mollie/.test(page.url())) await betaal(page);
}
const [betaald, open] = await sql(`SELECT id, ref, payment_status FROM orders WHERE email='${email}' ORDER BY id`);
const admin = await k.ctx.newPage(); await adminLogin(admin);
const regels = () => admin.evaluate(() => [...document.querySelectorAll('main .okline, main .warnline, main .err, main .notice')].map((e) => e.textContent.trim()).join(' | ').slice(0, 220));
const post = async (id, actie, velden) => {
  await admin.goto(`${SITE}/admin/orders/${id}/files`);
  await admin.evaluate(([a, v]) => { const f = document.querySelector(`form[action$="/${a}"]`); for (const [n, w] of Object.entries(v)) f.elements[n].value = w; f.requestSubmit(); }, [actie, velden]);
  await admin.waitForLoadState('load'); await admin.waitForTimeout(500);
  return `${admin.url().replace(SITE, '')} — ${await regels() || (await admin.evaluate(() => document.querySelector('main')?.innerText.slice(0, 160).replace(/\s+/g, ' ')))}`;
};
uit.push(`verbergen (betaald): ${await post(betaald.id, 'hide', {})}`);
await admin.goto(`${SITE}/admin`); uit.push(`  staat nog op het dashboard? ${await admin.evaluate((r) => document.querySelector('main').innerText.includes(r), betaald.ref)}`);
uit.push(`weer tonen: ${await post(betaald.id, 'hide', {})}`);
uit.push(`verwijderen betaald: ${await admin.goto(`${SITE}/admin/orders/${betaald.id}/files`).then(() => admin.evaluate(() => (document.querySelector('form[action$="/delete"]') ? 'formulier staat er' : 'geen verwijderformulier — ' + ([...document.querySelectorAll('main')].map((m) => (m.innerText.match(/Voorgoed verwijderen[^\n]*\n[^\n]*/) || [''])[0]).join('')).replace(/\s+/g, ' '))))}`);
uit.push(`verwijderen open, verkeerd kenmerk: ${await post(open.id, 'delete', { confirm: 'VIS-XXXX-XXX' })}`);
uit.push(`  bestaat nog? ${(await sql(`SELECT COUNT(*) AS n FROM orders WHERE id=${open.id}`))[0].n}`);
uit.push(`verwijderen open, goed kenmerk: ${await post(open.id, 'delete', { confirm: open.ref })}`);
uit.push(`  bestaat nog? ${(await sql(`SELECT COUNT(*) AS n FROM orders WHERE id=${open.id}`))[0].n}`);
/* CSV. */
const csv = await admin.request.get(`${SITE}/admin/facturen?csv=1`);
const tekst = await csv.text();
uit.push(`CSV: ${csv.status()} ${csv.headers()['content-type']} ${csv.headers()['content-disposition']}`);
uit.push('  ' + tekst.split('\n').slice(0, 4).join('\n  '));
/* Sessie kwijt: cookie weg → volgende klik → inlogscherm, en daarna terug naar waar je was? */
const cookies = await k.ctx.cookies();
await k.ctx.clearCookies();
await k.ctx.addCookies(cookies.filter((c) => !/admin/i.test(c.name)));
await admin.goto(`${SITE}/admin/customers`); await admin.waitForTimeout(400);
uit.push(`zonder sessie /admin/customers → ${admin.url().replace(SITE, '')} — "${(await admin.evaluate(() => document.querySelector('h1')?.textContent || '')).trim()}"`);
await adminLogin(admin);
uit.push(`na opnieuw inloggen → ${admin.url().replace(SITE, '')}`);
console.log(uit.join('\n'));
process.exit(0);
