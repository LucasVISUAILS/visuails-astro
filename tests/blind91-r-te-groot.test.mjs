/*
 * RONDE 91 · E18 — EEN LEVERBESTAND BOVEN 32 MB: EERST ZEGGEN, DAN NETJES WEIGEREN
 * 9 november 2026 (ronde 91, R)
 *
 * Boven MAX_SCAN_BYTES (32 MB, src/lib/provenance.js) zet /admin geen AI-tag in een jpg, png of mp4, en het
 * bord zei dan niets: geen chip, niet bij "geen AI-tag". /ai-act belooft de tag op elk geleverd bestand.
 *
 *   1 · de server (handleDeliveryUpload): niets opslaan, een 413 met de bestanden, de grootte en wat je kunt doen;
 *       wat toch wordt overgeslagen (_aangeleverd/, _ruw/) telt niet mee; webp en klein blijven gewoon door;
 *   2 · de browser (public/admin-voorvertoning.js): bij het kiezen staat er meteen een melding, en versturen
 *       gaat niet zolang zo'n bestand erin staat; zonder groot bestand gewoon versturen.
 * Verzonnen merken en adressen; niets hiervan bestaat.
 *
 *   node tests/blind91-r-te-groot.test.mjs
 */
import fs from 'node:fs';
import http from 'node:http';
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { adminGet, adminPost, teGrootOmTeTaggen } from '../src/lib/admin.js';
import { MAX_SCAN_BYTES } from '../src/lib/provenance.js';
import { mintToken, hashToken } from '../src/lib/token.js';

let pass = 0;
let fail = 0;
function ok(name, got, want = true) {
  const good = JSON.stringify(got) === JSON.stringify(want);
  if (good) pass++; else fail++;
  console.log(`${good ? ' ok  ' : ' FAIL'} ${name}${good ? '' : ` — verwacht ${JSON.stringify(want)}, kreeg ${JSON.stringify(got)}`}`);
}
console.log('\nVISUAILS — ronde 91 E18: leverbestanden boven 32 MB\n');

const JPGKOP = [0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1];
const groot = (naam, extra = 1) => { const b = new Uint8Array(MAX_SCAN_BYTES + extra); b.set(JPGKOP); return new File([b], naam); };
const klein = (naam) => new File([new Uint8Array([...JPGKOP, 1, 2, 3])], naam);

console.log('1 · de server');
ok('de grens is 32 MB', MAX_SCAN_BYTES, 32 * 1024 * 1024);
ok('teGrootOmTeTaggen: jpg, png en mp4 boven de grens', teGrootOmTeTaggen([groot('a.jpg'), groot('b.PNG'), groot('c.mp4'), groot('d.webp'), klein('e.jpg'), groot('VIS/p1/_aangeleverd/f.jpg'), groot('VIS/p1/_ruw/g.png')]).map((f) => f.name), ['a.jpg', 'b.PNG', 'c.mp4']);
ok('precies op de grens is nog goed', teGrootOmTeTaggen([groot('h.jpg', 0)]).length, 0);

const { db } = verseDb(new URL('../schema.sql', import.meta.url));
const r2 = new Map();
const UPLOADS = {
  async put(k, body, opts = {}) { const b = body && typeof body.getReader === 'function' ? new Uint8Array(await new Response(body).arrayBuffer()) : body; r2.set(k, { b, opts }); return { key: k }; },
  async get(k) { const x = r2.get(k); return x ? { body: new Response(x.b).body, arrayBuffer: async () => x.b, size: x.b?.length || 0 } : null; },
  async head(k) { return r2.has(k) ? { key: k } : null; },
  async delete(k) { r2.delete(k); },
};
const env = { DB: d1(db), UPLOADS };
db.exec("INSERT INTO admin_users (id, email, password_hash) VALUES (1, 'studio@voorbeeld.test', 'x')");
const token = await mintToken();
db.prepare("INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (1, 1, ?, '2099-01-01T00:00:00Z')").run(await hashToken(token));
db.exec(`
  INSERT INTO customers (id, email, name, brand, country) VALUES (1, 'klant@voorbeeld-merk.test', 'Testklant', 'Testmerk', 'NL');
  INSERT INTO orders (id, ref, customer_id, service, status, tier, name, brand, email, total_cents, vat_cents, lang, product_count, payment_status, country, created_at, paid_at) VALUES
    (82, 'VIS-RE-0082', 1, 'catalog', 'in_production', 'unattended', 'Testklant', 'Testmerk', 'klant@voorbeeld-merk.test', 20000, 4200, 'nl', 2, 'paid', 'NL', datetime('now','-1 days'), datetime('now','-1 days'));
`);
const post = async (fd) => {
  const res = await adminPost({ request: new Request('https://visuails.com/admin/orders/82/deliver', { method: 'POST', headers: { cookie: `vis_admin=${token}`, origin: 'https://visuails.com' }, body: fd }), env, waitUntil() {} });
  return { status: res.status, html: await res.text() };
};
const leveringen = () => db.prepare("SELECT COUNT(*) n FROM files WHERE order_id = 82 AND kind = 'delivery'").get().n;
{
  const fd = new FormData();
  fd.append('files', klein('VIS-RE-0082-p1-voorkant.jpg'));
  fd.append('files', groot('magnific-4k.png'));
  const r = await post(fd);
  ok('een te grote png in de selectie: 413', r.status, 413);
  ok('  met de naam, de grootte in MB en de grens', /magnific-4k\.png \(32,0 MB\)/.test(r.html) && /groter dan 32 MB/.test(r.html), true);
  ok('  en wat je kunt doen (jpg, verkleinen, deliver.mjs)', /Exporteer als jpg of verklein het, of lever het met scripts\/deliver\.mjs/.test(r.html), true);
  ok('  niets opgeslagen, ook het kleine bestand niet (geen halve levering)', [leveringen(), r2.size], [0, 0]);
}
{
  const fd = new FormData();
  fd.append('files', groot('film.mp4'));
  const r = await post(fd);
  ok('een mp4 boven 32 MB: ook 413', r.status, 413);
}
{
  const fd = new FormData();
  fd.append('files', klein('VIS-RE-0082-p1-voorkant.jpg'));
  fd.append('files', groot('VIS-RE-0082/p1 - Hoodie/_aangeleverd/klantfoto.jpg'));
  const r = await post(fd);
  /* 200: de uitslag noemt het overgeslagen bronbestand; geen 413. */
  ok('een groot bestand in _aangeleverd/ telt niet mee: gewoon opgeslagen', [r.status < 400, leveringen()], [true, 1]);
}

console.log('\n2 · de browser');
const { status, html: bord } = await (async () => {
  const res = await adminGet({ request: new Request('https://visuails.com/admin/orders/82/files', { headers: { cookie: `vis_admin=${token}` } }), env, waitUntil() {} });
  return { status: res.status, html: await res.text() };
})();
ok('het bord laadt', status, 200);
ok('met het script', /<script src="\/admin-voorvertoning\.js" defer><\/script>/.test(bord), true);
const JS = fs.readFileSync(new URL('../public/admin-voorvertoning.js', import.meta.url), 'utf8');
ok('het script noemt dezelfde grens als de server', /var GRENS = 32 \* 1024 \* 1024; \/\/ = MAX_SCAN_BYTES/.test(JS), true);
ok('en zet bestandsnamen alleen als tekst neer (geen innerHTML)', /innerHTML/.test(JS), false);

let posts = 0;
const server = http.createServer((req, res) => {
  if (req.method === 'POST') { posts += 1; req.resume(); res.writeHead(303, { location: '/admin/orders/82/files' }); return res.end(); }
  if (req.url.startsWith('/admin-voorvertoning.js')) { res.writeHead(200, { 'content-type': 'text/javascript' }); return res.end(JS); }
  if (req.url.startsWith('/admin/orders/82/files')) { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(bord); }
  res.writeHead(404); return res.end();
});
await new Promise((r) => server.listen(0, r));
const PORT = server.address().port;
const { chromium } = await import('playwright');
const { browserPad } = await import('../scripts/lib/browserpad.mjs');
const browser = await chromium.launch({ executablePath: process.env.CHROME || browserPad() });
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
  const page = await ctx.newPage();
  const fouten = [];
  page.on('pageerror', (e) => fouten.push(String(e).slice(0, 160)));
  await page.goto(`http://localhost:${PORT}/admin/orders/82/files`, { waitUntil: 'load' });
  const formSel = 'form[action="/admin/orders/82/deliver"]:has(input[type="file"][name="files"][multiple]:not([webkitdirectory]))';
  const form = page.locator(formSel).last();
  ok('er is een uploadformulier voor losse bestanden', (await form.count()) > 0, true);
  const invoer = form.locator('input[type="file"][name="files"]');
  const grootBuf = Buffer.alloc(MAX_SCAN_BYTES + 1024); Buffer.from(JPGKOP).copy(grootBuf);
  await invoer.setInputFiles([{ name: 'magnific-4k.png', mimeType: 'image/png', buffer: grootBuf }]);
  const melding = form.locator('[data-te-groot]');
  ok('bij het kiezen: meteen een melding (role=alert)', [await melding.count(), await melding.getAttribute('role').catch(() => null)], [1, 'alert']);
  const tekst = (await melding.textContent().catch(() => '')) || '';
  ok('  met naam, grootte en de grens', /magnific-4k\.png \(32,0 MB\)/.test(tekst) && /de grens is 32 MB/.test(tekst), true);
  const zicht = await melding.evaluate((el) => { const s = getComputedStyle(el); const r = el.getBoundingClientRect(); return { zichtbaar: s.display !== 'none' && r.height > 0, px: parseFloat(s.fontSize) }; });
  ok('  zichtbaar en leesbaar (≥ 12 px)', zichtbaar(zicht), true);
  await form.locator('button[type="submit"], button:not([type])').first().click();
  await page.waitForTimeout(600);
  ok('versturen gaat niet zolang het grote bestand erin staat', posts, 0);
  await invoer.setInputFiles([{ name: 'VIS-RE-0082-p1-voorkant.jpg', mimeType: 'image/jpeg', buffer: Buffer.from([...JPGKOP, 1, 2, 3]) }]);
  ok('een klein bestand gekozen: de melding is weg', await form.locator('[data-te-groot]').count(), 0);
  await Promise.all([page.waitForNavigation({ timeout: 10000 }).catch(() => {}), form.locator('button[type="submit"], button:not([type])').first().click()]);
  await page.waitForTimeout(300);
  ok('en dan gewoon versturen', posts, 1);
  ok('geen scriptfouten', fouten, []);
  await ctx.close();
} finally {
  await browser.close();
  server.close();
}
function zichtbaar(z) { return z.zichtbaar && z.px >= 12; }

console.log(`\n${pass} goed, ${fail} fout`);
process.exit(fail ? 1 : 0);
