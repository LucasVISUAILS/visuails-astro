// Ronde 9 · stap 6: veiligheid — klant A probeert bij B te komen, verlopen tokens, herkomstcontrole, cookies.
import { start, SITE, sql, sqlw } from './_dl.mjs';
import { bestel, betaal } from './_bestel.mjs';
import { studioLogin } from './_studio.mjs';
const uit = [];
async function klant(naam) {
  const k = await start(); await sqlw('DELETE FROM rate_limits');
  const email = `${naam}${Date.now() % 100000}@merk.test`;
  await bestel(k.page, { pad: '/nl/start/catalog', aantal: 1, klant: { email, first_name: naam, brand: `Merk ${naam}` }, land: 'NL', vat: null });
  if (/4478|nep-mollie/.test(k.page.url())) await betaal(k.page);
  const [o] = await sql(`SELECT id, ref, portal_token_hash FROM orders WHERE email='${email}'`);
  return { k, email, o };
}
const A = await klant('anna'); const B = await klant('bob');
const [bFile] = await sql(`SELECT id FROM files WHERE order_id=${B.o.id} LIMIT 1`);
const [bInv] = await sql(`SELECT id FROM invoices WHERE order_id=${B.o.id} LIMIT 1`).catch(() => [null]);
await studioLogin(A.k.page, A.email);
const req = A.k.page.request;
const toets = async (wat, url, opts) => {
  const r = await (opts ? req.post(SITE + url, { ...opts, maxRedirects: 0 }) : req.get(SITE + url, { maxRedirects: 0 }));
  uit.push(`${wat.padEnd(42)} ${r.status()} ${r.headers().location ? '→ ' + r.headers().location : ''}`);
};
await toets('A opent B\'s bestand', `/account/files/${bFile.id}/f`);
if (bInv) await toets('A opent B\'s factuur-pdf', `/account/invoices/${bInv.id}/pdf`);
await toets('A opent B\'s zip', `/account/orders/${B.o.id}/zip`);
await toets('A betaalt B\'s bestelling', `/account/orders/${B.o.id}/pay`, { headers: { origin: SITE } });
await toets('A keurt B\'s bestand goed', '/account/review', { headers: { origin: SITE }, form: { file: String(bFile.id), action: 'approve' } });
await toets('A zet foto\'s bij B\'s bestelling', `/account/orders/${B.o.id}/fotos`, { headers: { origin: SITE }, multipart: { fotos: { name: 'x.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('x') } } });
await toets('A: kaart van B via ?order=', `/account/orders?order=${B.o.id}`);
uit.push(`  staat B's kenmerk op A's pagina? ${(await (await req.get(SITE + `/account/orders?order=${B.o.id}`)).text()).includes(B.o.ref)}`);
/* Herkomstcontrole: POST met een vreemde Origin. */
await toets('POST /account/details van evil.test', '/account/details', { headers: { origin: 'https://evil.test' }, form: { first_name: 'Hack' } });
await toets('POST /account/review zonder Origin', '/account/review', { form: { file: '1', action: 'approve' } });
/* Privélink: geknutselde en ingetrokken tokens. */
await toets('privélink met verzonnen token', '/o/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
/* Admin zonder sessie. */
const anon = await start();
for (const u of ['/admin', `/admin/orders/${B.o.id}/files`, '/admin/facturen?csv=1', `/admin/invoices/${bInv ? bInv.id : 1}/pdf`]) {
  const r = await anon.page.request.get(SITE + u, { maxRedirects: 0 });
  uit.push(`${('anoniem ' + u).padEnd(42)} ${r.status()} ${r.headers().location ? '→ ' + r.headers().location : ''}`);
}
const r2 = await anon.page.request.post(SITE + `/admin/orders/${B.o.id}/cancel`, { form: { reason: 'x', payment: 'none' }, maxRedirects: 0 });
uit.push(`${'anoniem POST annuleren'.padEnd(42)} ${r2.status()}`);
/* Cookies: standaard niets aan. */
const c = await start({});
await c.ctx.clearCookies();
await c.page.goto(SITE + '/nl'); await c.page.waitForTimeout(800);
const banner = await c.page.evaluate(() => { const b = document.querySelector('[data-consent], .cookie, #cookie, [class*="consent"]'); return b ? (b.innerText || '').replace(/\s+/g, ' ').slice(0, 160) : 'geen banner'; });
const scripts = await c.page.evaluate(() => [...document.scripts].map((s) => s.src).filter((s) => /google|analytics|plausible|gtag|meta|facebook|hotjar|clarity/i.test(s)));
uit.push(`cookiemelding: "${banner}" · trackers geladen vóór keuze: ${scripts.length ? scripts.join(', ') : 'geen'} · cookies: ${(await c.ctx.cookies()).map((x) => x.name).join(', ') || 'geen'}`);
console.log(uit.join('\n'));
process.exit(0);
