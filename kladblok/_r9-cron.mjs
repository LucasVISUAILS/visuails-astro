// Ronde 9 · stap 7: de nachtelijke taken met de tijd vooruit — op een KOPIE van de testdatabase,
// met nep-Mollie, nep-R2 en een Resend die alles opvangt. Mails → /tmp/claude-0/cron-mails.json.
//   node kladblok/_r9-cron.mjs
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { d1 } from '../tests/lib/d1sqlite.mjs';
import cron from '../cron/index.js';

const bron = (() => {
  const dir = '/tmp/claude-0/doorloop-persist/v3/d1';
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : (e.name.endsWith('.sqlite') && e.name !== 'metadata.sqlite' ? [path.join(d, e.name)] : []));
  return walk(dir)[0];
})();
for (const ext of ['', '-wal', '-shm']) {
  fs.rmSync('/tmp/claude-0/cron.sqlite' + ext, { force: true });
  if (fs.existsSync(bron + ext)) fs.copyFileSync(bron + ext, '/tmp/claude-0/cron.sqlite' + ext);
}
const db = new DatabaseSync('/tmp/claude-0/cron.sqlite');
const q = (s) => db.prepare(s).all();
const x = (s) => db.exec(s);

/* ── scenario's: de tijd vooruit door datums terug te zetten ── */
const klant = q("SELECT id FROM customers WHERE email='studio@voltbrand.nl'")[0].id;
const order = (ref, extra) => {
  const rij = { ref, customer_id: klant, service: 'catalog', status: 'received', tier: 'unattended', product_count: 2, email: `cron-${ref.slice(4, 8).toLowerCase()}@merk.test`, lang: 'nl', name: 'Mara', brand: 'VOLT', total_cents: 17800, vat_cents: 3738, vat_rate: 0.21, payment_status: 'unpaid', ...extra };
  const cols = Object.keys(rij);
  const lit = (v) => (v === null ? 'NULL' : typeof v === 'number' ? v : /^datetime\(|^date\(/.test(v) ? v : `'${String(v).replace(/'/g, "''")}'`);
  x(`INSERT INTO orders (${cols.join(',')}) VALUES (${cols.map((c) => lit(rij[c])).join(',')})`);
};
order('VIS-HRNR-001', { created_at: "datetime('now','-4 days')" });                                      // dag 4 onbetaald → herinnering
order('VIS-VRYG-002', { tier: 'attended', created_at: "datetime('now','-8 days')", payment_reminder_at: "datetime('now','-5 days')",
  window_start: "date('now','+6 days')", window_end: "date('now','+7 days')", window_expires_at: "datetime('now','-1 hours')" }); // reservering verlopen → vrijgegeven
order('VIS-VRVL-003', { created_at: "datetime('now','-15 days')", payment_reminder_at: "datetime('now','-12 days')" }); // dag 15 → vervallen
order('VIS-HRNR-EN4', { lang: 'en', email: 'cron-en@merk.test', created_at: "datetime('now','-4 days')" }); // Engelse herinnering
/* Beelden verlopen: een geleverde bestelling waarvan de levering 91 dagen oud is. */
const geleverd = q("SELECT id, ref FROM orders WHERE status='delivered' AND service<>'test-sample' LIMIT 1")[0];
x(`UPDATE files SET announced_at=datetime('now','-91 days'), expires_at=NULL WHERE order_id=${geleverd.id} AND kind='delivery'`);
x(`UPDATE orders SET delivered_at=datetime('now','-91 days'), closed_at=datetime('now','-91 days') WHERE id=${geleverd.id}`);
/* Geleverd zonder levermail. */
const ander = q(`SELECT id, ref FROM orders WHERE id<>${geleverd.id} AND status IN ('human_check','in_production') LIMIT 1`)[0];
x(`UPDATE orders SET status='delivered', delivered_at=datetime('now','-1 days'), delivery_mailed_at=NULL WHERE id=${ander.id}`);
/* Back-up elf dagen oud. */
x("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('backup_last_run', datetime('now','-11 days'))");
/* Lege wachtrij: de vaste week begint over vijf dagen en er staat niets vast. */
const over5 = new Date(Date.now() + 5 * 86400000).getUTCDate();
x(`UPDATE subscriptions SET window_day=${Math.min(28, over5)} WHERE customer_id=${klant}`);
x(`DELETE FROM plan_queue WHERE customer_id=${klant}`);
/* Een factuur die bij de betaling bleef hangen (pdf mislukt). */
const fac = q("SELECT id, number FROM invoices ORDER BY id DESC LIMIT 1")[0];
if (fac) x(`UPDATE invoices SET status='pending', pdf_key=NULL, created_at=datetime('now','-2 hours') WHERE id=${fac.id}`);

/* ── nep-buitenwereld ── */
const gevangen = [];
const echteFetch = globalThis.fetch;
globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  if (u.includes('api.resend.com/emails')) { gevangen.push(JSON.parse(String(opts.body))); return new Response('{"id":"em_x"}', { status: 200, headers: { 'content-type': 'application/json' } }); }
  if (u.endsWith('/v2/payments')) { const id = 'tr_cron' + gevangen.length; return new Response(JSON.stringify({ id, status: 'open', _links: { checkout: { href: `https://www.mollie.com/checkout/test-mode?id=${id}` } } }), { status: 201, headers: { 'content-type': 'application/json' } }); }
  if (u.includes('api.mollie.com')) return new Response('{"status":404}', { status: 404, headers: { 'content-type': 'application/json' } });
  return echteFetch(url, opts);
};
const r2 = new Map([[`intake/${'b'.repeat(43)}/oud.jpg`, { size: 2_400_000, uploaded: new Date(Date.now() - 10 * 86400000) }]]);
const UPLOADS = {
  async list({ prefix }) { return { objects: [...r2].filter(([k]) => k.startsWith(prefix)).map(([key, v]) => ({ key, ...v })), truncated: false }; },
  async delete(k) { for (const key of [].concat(k)) r2.delete(key); },
  async put(k, v) { r2.set(k, { size: v?.byteLength || 0, uploaded: new Date() }); },
  async get() { return null; }, async head() { return null; },
};
const env = {
  DB: d1(db), UPLOADS, RESEND_API_KEY: 're_proef', MOLLIE_API_KEY: 'test_proefsleutelproefsleutel1234567890',
  FROM_EMAIL: 'VISUAILS <orders@visuails.com>', NOTIFY_EMAIL: 'hello@visuails.com', PUBLIC_ORIGIN: 'https://visuails.com',
  PURGE_ENABLED: process.env.PURGE || 'false', PORTAL_SALT: 'proef-zout-portaal', PAYER_SALT: 'proef-zout-betaler', VISUAILS_VAT: 'NL000000000B00',
};
const wacht = [];
await cron.scheduled({ cron: '10 3 * * *', scheduledTime: Date.now() }, env, { waitUntil: (p) => wacht.push(p) });
await Promise.all(wacht);

console.log(`PURGE_ENABLED=${env.PURGE_ENABLED} · ${gevangen.length} mails`);
for (const m of gevangen) console.log(`  → ${[].concat(m.to).join(',')}  "${m.subject}"${m.attachments?.length ? ` [+${m.attachments.map((a) => a.filename).join(',')}]` : ''}`);
const rapport = gevangen.find((m) => /Nachtelijke taken/.test(m.subject));
if (rapport) console.log('\nNACHTRAPPORT:\n' + (rapport.text || rapport.html.replace(/<[^>]+>/g, ' ')).trim());
console.log('\nna afloop:', JSON.stringify(q(`SELECT ref, status, payment_status, window_start, payment_reminder_at IS NOT NULL AS herinnerd FROM orders WHERE ref LIKE 'VIS-HRNR%' OR ref LIKE 'VIS-VRYG%' OR ref LIKE 'VIS-VRVL%'`)));
console.log('bestanden van', geleverd.ref, 'over:', q(`SELECT COUNT(*) AS n FROM files WHERE order_id=${geleverd.id} AND kind='delivery'`)[0].n, '· wachtruimte over:', r2.size);
fs.writeFileSync(`/tmp/claude-0/cron-mails${process.env.PURGE === 'true' ? '-purge' : ''}.json`, JSON.stringify(gevangen.map((m) => ({ to: m.to, subject: m.subject, html: m.html, text: m.text, attachments: (m.attachments || []).map((a) => a.filename) })), null, 1));
process.exit(0);
