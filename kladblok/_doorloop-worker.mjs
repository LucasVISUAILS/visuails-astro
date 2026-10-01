/**
 * De hele site lokaal, met een nep-Mollie en een nep-Resend. 23 september 2026.
 *
 *   node kladblok/_doorloop-worker.mjs
 *
 *   · Worker (dist/server) op http://localhost:4477 met eigen D1 + R2
 *   · nep-Mollie + nep-Resend via dev.outboundService (alles wat de Worker
 *     naar buiten stuurt, komt hier langs)
 *   · bedieningspaneel op http://localhost:4478:
 *       GET  /                    overzicht
 *       GET  /mails               alle "verstuurde" mails (json)
 *       GET  /mail/<n>            één mail als html
 *       POST /mails/clear
 *       GET  /payments            alle nep-betalingen
 *       GET  /checkout/<tr_id>    de nep-betaalpagina (knoppen betaald/mislukt/geannuleerd)
 *       POST /pay/<tr_id>/<status>  status zetten + webhook naar de Worker
 *       POST /sub/<sub_id>/charge   een termijn incasseren (recurring betaling + webhook)
 *       GET  /sql?q=SELECT …      lezen uit de D1 (node:sqlite op hetzelfde bestand)
 *       POST /sql  (body = SQL)   schrijven
 *
 * Admin: hello@visuails.com / proef-wachtwoord
 * Klant VOLT (Mara) is ingelogd met cookie vis_account=<VOLT.token>.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { hashToken } from '../src/lib/token.js';
import { hashPassword } from '../src/lib/adminAuth.js';
import { studioSeed, IMG, VOLT, NOORD } from '../tests/lib/studio-seed.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const PORT = 4477;
const CTRL = 4478;
const PERSIST = process.env.DOORLOOP_PERSIST || '/tmp/claude-0/doorloop-persist';
const MAILS_FILE = '/tmp/claude-0/doorloop-mails.json';
const ADMIN = { email: 'hello@visuails.com', password: 'proef-wachtwoord' };

const { getPlatformProxy, unstable_startWorker } = await import('wrangler');
const config = path.join(ROOT, 'dist', 'server', 'wrangler.json');
if (!fs.existsSync(config)) throw new Error('dist/server/wrangler.json ontbreekt — draai eerst `npm run build`');

/* ── verse database ── */
fs.rmSync(PERSIST, { recursive: true, force: true });
fs.mkdirSync(PERSIST, { recursive: true });
{
  const proxy = await getPlatformProxy({ configPath: config, persist: { path: path.join(PERSIST, 'v3') } });
  const schema = fs.readFileSync(path.join(ROOT, 'schema.sql'), 'utf8').replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  const stmts = schema.split(';').map((s) => s.trim().replace(/\s+/g, ' ')).filter(Boolean);
  await proxy.env.DB.exec(`${stmts.join(';\n')};`);
  const img = IMG.filter((f) => fs.existsSync(path.join(ROOT, 'public', 'img', f)));
  const seed = studioSeed({ hash: await hashToken(VOLT.token), hash2: await hashToken(NOORD.token), img });
  await proxy.env.DB.exec(`${seed.sql.map((s) => s.replace(/\s+/g, ' ')).join(';\n')};`);
  for (const [key, file] of seed.r2) {
    await proxy.env.UPLOADS.put(key, fs.readFileSync(path.join(ROOT, 'public', 'img', file)), { httpMetadata: { contentType: 'image/webp' } });
  }
  const ph = await hashPassword(ADMIN.password);
  await proxy.env.DB.prepare('INSERT INTO admin_users (email, password_hash) VALUES (?1, ?2)').bind(ADMIN.email, ph).run();
  await proxy.dispose();
}

/* ── nep-Mollie ── */
const rid = (p) => p + Math.random().toString(36).slice(2, 12);
const payments = new Map();
const customers = new Map();
const mandates = new Map(); // cst → [mandate]
const subs = new Map();
const mails = [];
const onbekend = [];
const nu = () => new Date().toISOString();

function paymentView(p) {
  return {
    resource: 'payment', id: p.id, mode: 'test', createdAt: p.createdAt, status: p.status,
    amount: p.amount, description: p.description, method: p.status === 'open' ? null : (p.method || 'ideal'),
    metadata: p.metadata ?? null, locale: p.locale, redirectUrl: p.redirectUrl, webhookUrl: p.webhookUrl,
    sequenceType: p.sequenceType || 'oneoff', profileId: 'pfl_proef',
    ...(p.paidAt ? { paidAt: p.paidAt } : {}), ...(p.failedAt ? { failedAt: p.failedAt } : {}),
    ...(p.canceledAt ? { canceledAt: p.canceledAt } : {}), ...(p.expiredAt ? { expiredAt: p.expiredAt } : {}),
    ...(p.customerId ? { customerId: p.customerId } : {}), ...(p.mandateId ? { mandateId: p.mandateId } : {}),
    ...(p.subscriptionId ? { subscriptionId: p.subscriptionId } : {}),
    ...(p.amountRefunded ? { amountRefunded: p.amountRefunded } : {}),
    /* https, want offsite.js laat alleen https door; de browser (Playwright) routeert nep-mollie.test naar dit paneel. */
    _links: { checkout: p.status === 'open' ? { href: `https://nep-mollie.test/checkout/${p.id}`, type: 'text/html' } : undefined },
  };
}
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });

async function mollie(req, url) {
  const p = url.pathname.replace(/^\/v2/, '');
  const m = req.method;
  const body = m === 'POST' ? await req.json().catch(() => ({})) : null;
  let x;
  if (m === 'GET' && p.startsWith('/methods')) return json({ count: 2, _embedded: { methods: [{ resource: 'method', id: 'ideal', description: 'iDEAL', status: 'activated' }, { resource: 'method', id: 'creditcard', description: 'Card', status: 'activated' }] } });
  if (m === 'POST' && p === '/payments') {
    const id = rid('tr_');
    const pay = { id, createdAt: nu(), status: 'open', ...body };
    payments.set(id, pay);
    console.log(`[mollie] betaling ${id} ${body.amount?.value} "${body.description}" seq=${body.sequenceType || 'oneoff'}`);
    return json(paymentView(pay), 201);
  }
  if ((x = p.match(/^\/payments\/([^/]+)$/)) && m === 'GET') {
    const pay = payments.get(x[1]);
    return pay ? json(paymentView(pay)) : json({ status: 404, title: 'Not Found', detail: 'No payment exists with token ' + x[1] }, 404);
  }
  if ((x = p.match(/^\/payments\/([^/]+)\/refunds$/)) && m === 'POST') {
    const pay = payments.get(x[1]);
    if (!pay) return json({ status: 404, title: 'Not Found' }, 404);
    const prev = Number(pay.amountRefunded?.value || 0);
    const value = (prev + Number(body.amount.value)).toFixed(2);
    pay.amountRefunded = { currency: 'EUR', value };
    if (Number(value) >= Number(pay.amount.value)) pay.status = 'refunded';
    console.log(`[mollie] restitutie ${x[1]} ${body.amount.value}`);
    return json({ resource: 'refund', id: rid('re_'), amount: body.amount, status: 'pending', paymentId: x[1], description: body.description, createdAt: nu() }, 201);
  }
  if (m === 'POST' && p === '/customers') {
    const id = rid('cst_');
    customers.set(id, { id, ...body, createdAt: nu() });
    console.log(`[mollie] klant ${id} ${body.email}`);
    return json({ resource: 'customer', id, mode: 'test', name: body.name, email: body.email, metadata: body.metadata ?? null, createdAt: nu() }, 201);
  }
  if ((x = p.match(/^\/customers\/([^/]+)\/mandates$/)) && m === 'GET') {
    const list = mandates.get(x[1]) || [];
    return json({ count: list.length, _embedded: { mandates: list } });
  }
  if ((x = p.match(/^\/customers\/([^/]+)\/subscriptions$/)) && m === 'POST') {
    const id = rid('sub_');
    const start = body.startDate || nu().slice(0, 10);
    const sub = { resource: 'subscription', id, mode: 'test', createdAt: nu(), status: 'active', amount: body.amount, times: body.times ?? null, timesRemaining: body.times ?? null, interval: body.interval, startDate: start, nextPaymentDate: start, description: body.description, method: null, mandateId: body.mandateId, webhookUrl: body.webhookUrl, customerId: x[1] };
    subs.set(id, sub);
    console.log(`[mollie] abonnement ${id} ${body.amount?.value}/${body.interval} start=${start} times=${body.times ?? '∞'}`);
    return json(sub, 201);
  }
  if ((x = p.match(/^\/customers\/([^/]+)\/subscriptions\/([^/]+)$/))) {
    const sub = subs.get(x[2]);
    if (!sub) return json({ status: 404, title: 'Not Found', detail: 'No subscription exists with token ' + x[2] }, 404);
    if (m === 'DELETE') { sub.status = 'canceled'; sub.canceledAt = nu(); console.log(`[mollie] abonnement ${x[2]} opgezegd`); return json(sub); }
    return json(sub);
  }
  console.warn('[mollie] ONBEKEND', m, p);
  onbekend.push(`mollie ${m} ${p}`);
  return json({ status: 404, title: 'Not Found', detail: 'mock: ' + p }, 404);
}

async function resend(req, url) {
  const body = await req.json().catch(() => ({}));
  if (url.pathname === '/emails') {
    const mail = { n: mails.length + 1, at: nu(), to: body.to, from: body.from, subject: body.subject, bcc: body.bcc, reply_to: body.reply_to, html: body.html, text: body.text, attachments: (body.attachments || []).map((a) => ({ filename: a.filename, bytes: a.content ? String(a.content).length : 0 })) };
    mails.push(mail);
    fs.writeFileSync(MAILS_FILE, JSON.stringify(mails, null, 1));
    console.log(`[resend] #${mail.n} → ${JSON.stringify(mail.to)} "${mail.subject}"`);
    return json({ id: rid('em_') });
  }
  if (url.pathname === '/contacts') { console.log('[resend] contact', body.email); return json({ id: rid('ct_') }); }
  console.warn('[resend] ONBEKEND', req.method, url.pathname);
  onbekend.push(`resend ${req.method} ${url.pathname}`);
  return json({ id: rid('x_') });
}

async function outbound(req) {
  const url = new URL(req.url);
  if (url.hostname === 'api.mollie.com') return mollie(req, url);
  if (url.hostname === 'api.resend.com') return resend(req, url);
  if (url.hostname === 'ec.europa.eu') {
    /* nep-VIES: een nummer dat op 000 eindigt is ongeldig, 999 = geen antwoord, de rest geldig. */
    const m = url.pathname.match(/\/ms\/([A-Z]{2})\/vat\/([^/]+)/);
    const nr = m ? m[2] : '';
    const code = /000$/.test(nr) ? 'INVALID' : /999$/.test(nr) ? 'MS_UNAVAILABLE' : 'VALID';
    console.log(`[vies] ${m?.[1]}${nr} → ${code}`);
    return json({ isValid: code === 'VALID', requestDate: nu(), userError: code, name: code === 'VALID' ? 'PROEFBEDRIJF GMBH' : '---', address: '---', requestIdentifier: 'WAPIAAAA' + Date.now() });
  }
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return globalThis.fetch(req.url, req);
  console.warn('[buiten] ONBEKEND', req.method, req.url);
  onbekend.push(`${req.method} ${req.url}`);
  return new Response('mock: geen verbinding naar buiten', { status: 502 });
}

/* ── de Worker ── */
const bind = (v) => ({ type: 'plain_text', value: v });
const worker = await unstable_startWorker({
  config,
  bindings: {
    MOLLIE_API_KEY: bind('test_proefsleutelproefsleutel1234567890'),
    RESEND_API_KEY: bind('re_proef_sleutel'),
    PORTAL_SALT: bind('proef-zout-portaal'),
    PAYER_SALT: bind('proef-zout-betaler'),
    SELLER_ADDRESS: bind('VISUAILS\nVoorbeeldstraat 1\n1234 AB Voorbeeldstad'),
    VISUAILS_VAT: bind('NL000000000B00'),
    VISUAILS_KVK: bind('00000000'),
    VISUAILS_IBAN: bind('NL00BANK0000000000'),
  },
  dev: { persist: PERSIST, server: { port: PORT }, logLevel: 'warn', outboundService: outbound },
});
await worker.ready;
console.log(`[worker] ${await worker.url}`);

/* ── D1 rechtstreeks (lezen/schrijven naast de Worker) ── */
function sqliteFile() {
  const dir = path.join(PERSIST, 'v3', 'd1');
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : (e.name.endsWith('.sqlite') ? [path.join(d, e.name)] : []));
  return walk(dir)[0];
}
function runSql(q, write = false) {
  const db = new DatabaseSync(sqliteFile(), { readOnly: !write });
  try {
    if (write) { db.exec(q); return { ok: true }; }
    return db.prepare(q).all();
  } finally { db.close(); }
}

/* ── webhook naar de Worker, zoals Mollie dat doet ── */
async function webhook(pay) {
  const target = pay.webhookUrl || `http://localhost:${PORT}/api/webhook/mollie`;
  const res = await fetch(target, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: `id=${encodeURIComponent(pay.id)}` });
  console.log(`[webhook] ${pay.id} ${pay.status} → ${res.status}`);
  return res.status;
}
function zetStatus(pay, status) {
  pay.status = status;
  const t = nu();
  if (status === 'paid') {
    pay.paidAt = t; pay.method = pay.method || 'ideal';
    if (pay.sequenceType === 'first' && pay.customerId) {
      const md = { resource: 'mandate', id: rid('mdt_'), mode: 'test', status: 'valid', method: 'directdebit', customerId: pay.customerId, createdAt: t, details: { consumerName: 'Proef', consumerAccount: 'NL00BANK0000000000' } };
      mandates.set(pay.customerId, [...(mandates.get(pay.customerId) || []), md]);
      pay.mandateId = md.id;
    }
  }
  if (status === 'failed') pay.failedAt = t;
  if (status === 'canceled') pay.canceledAt = t;
  if (status === 'expired') pay.expiredAt = t;
}

/* ── bedieningspaneel ── */
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const readBody = (req) => new Promise((r) => { let b = ''; req.on('data', (c) => { b += c; }); req.on('end', () => r(b)); });
http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${CTRL}`);
  const send = (status, body, type = 'application/json') => { res.writeHead(status, { 'content-type': type + '; charset=utf-8' }); res.end(typeof body === 'string' ? body : JSON.stringify(body, null, 1)); };
  let x;
  try {
    if (url.pathname === '/') return send(200, { worker: `http://localhost:${PORT}`, admin: ADMIN, volt: VOLT, noord: NOORD, mails: mails.length, payments: [...payments.keys()], subs: [...subs.keys()], onbekend });
    if (url.pathname === '/mails') return send(200, mails.map(({ html, text, ...m }) => m));
    if ((x = url.pathname.match(/^\/mail\/(\d+)$/))) { const m = mails[Number(x[1]) - 1]; return m ? send(200, m.html || `<pre>${esc(m.text)}</pre>`, 'text/html') : send(404, 'geen mail', 'text/plain'); }
    if ((x = url.pathname.match(/^\/mailtekst\/(\d+)$/))) { const m = mails[Number(x[1]) - 1]; return m ? send(200, m.text || m.html?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ') || '', 'text/plain') : send(404, 'geen mail', 'text/plain'); }
    if (url.pathname === '/mails/clear') { mails.length = 0; fs.writeFileSync(MAILS_FILE, '[]'); return send(200, { ok: true }); }
    if (url.pathname === '/payments') return send(200, [...payments.values()].map(paymentView));
    if (url.pathname === '/subs') return send(200, [...subs.values()]);
    if ((x = url.pathname.match(/^\/checkout\/(tr_[A-Za-z0-9]+)$/))) {
      const pay = payments.get(x[1]);
      if (!pay) return send(404, 'geen betaling', 'text/plain');
      return send(200, `<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>Nep-Mollie</title>
<style>body{font:16px system-ui;max-width:32rem;margin:4rem auto;padding:0 1rem;color:#222}h1{font-size:1.3rem}form{display:inline}button{font:inherit;padding:.6rem 1rem;margin:.3rem .3rem 0 0;border:1px solid #444;background:#fff;border-radius:6px;cursor:pointer}button.p{background:#222;color:#fff}dl{display:grid;grid-template-columns:auto 1fr;gap:.3rem 1rem}</style></head>
<body><h1>Nep-Mollie · betaalpagina</h1>
<dl><dt>Bedrag</dt><dd>€ ${esc(pay.amount?.value)}</dd><dt>Omschrijving</dt><dd>${esc(pay.description)}</dd><dt>Soort</dt><dd>${esc(pay.sequenceType || 'oneoff')}</dd><dt>Status</dt><dd>${esc(pay.status)}</dd></dl>
<p>${['paid', 'failed', 'canceled', 'expired'].map((s) => `<form method="post" action="/pay/${pay.id}/${s}"><button class="${s === 'paid' ? 'p' : ''}" data-pay="${s}">${{ paid: 'Betalen', failed: 'Mislukt', canceled: 'Annuleren', expired: 'Verlopen' }[s]}</button></form>`).join('')}</p>
</body></html>`, 'text/html');
    }
    if ((x = url.pathname.match(/^\/pay\/(tr_[A-Za-z0-9]+)\/(paid|failed|canceled|expired|open)$/)) && req.method === 'POST') {
      const pay = payments.get(x[1]);
      if (!pay) return send(404, 'geen betaling', 'text/plain');
      zetStatus(pay, x[2]);
      const status = await webhook(pay);
      if (url.searchParams.get('json')) return send(200, { ok: true, webhook: status, payment: paymentView(pay) });
      res.writeHead(303, { location: pay.redirectUrl || `http://localhost:${PORT}/` }); return res.end();
    }
    if ((x = url.pathname.match(/^\/sub\/(sub_[A-Za-z0-9]+)\/charge$/)) && req.method === 'POST') {
      const sub = subs.get(x[1]);
      if (!sub) return send(404, 'geen abonnement', 'text/plain');
      const status = url.searchParams.get('status') || 'paid';
      const id = rid('tr_');
      const pay = { id, createdAt: nu(), status: 'open', amount: sub.amount, description: sub.description, sequenceType: 'recurring', customerId: sub.customerId, mandateId: sub.mandateId, subscriptionId: sub.id, webhookUrl: sub.webhookUrl, method: 'directdebit' };
      payments.set(id, pay);
      zetStatus(pay, status);
      /* ?op=2026-10-23 → de termijn valt op die datum (maand verder in de tijd). */
      const op = url.searchParams.get('op');
      if (op) { pay.createdAt = `${op}T08:00:00.000Z`; if (pay.paidAt) pay.paidAt = `${op}T08:00:00.000Z`; if (pay.failedAt) pay.failedAt = `${op}T08:00:00.000Z`; }
      if (sub.timesRemaining != null && status === 'paid') sub.timesRemaining -= 1;
      if (sub.timesRemaining === 0) sub.status = 'completed';
      const wh = await webhook(pay);
      return send(200, { ok: true, webhook: wh, payment: paymentView(pay), sub });
    }
    if (url.pathname === '/sql' && req.method === 'GET') return send(200, runSql(url.searchParams.get('q')));
    if (url.pathname === '/sql' && req.method === 'POST') return send(200, runSql(await readBody(req), true));
    return send(404, { fout: 'onbekend pad' });
  } catch (err) {
    return send(500, { fout: String(err?.message || err) });
  }
}).listen(CTRL, () => console.log(`[paneel] http://localhost:${CTRL}`));

process.on('SIGTERM', async () => { await worker.dispose(); process.exit(0); });
