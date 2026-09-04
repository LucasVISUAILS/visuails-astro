/*
 * VISUAILS — mail die niet aankwam.  npm run test:bounces
 *
 * Doorlichting §3.7, 4 september 2026: Resend zei 200, de klant kreeg niets, en
 * /admin wist het niet. De webhook op /api/webhook/resend vangt bounces en
 * spamklachten op; /admin toont ze rood bij de bestelling en de klant.
 *
 * Getoetst:
 *   1. de Svix-handtekening — goed, fout, verlopen, zonder secret;
 *   2. wat er uit een gebeurtenis wordt gehaald, en wat genegeerd wordt;
 *   3. de webhook als geheel tegen de echte schema.sql: schrijven, dubbel, 401;
 *   4. de vlag in /admin: op de lijst, op de bestelling, op de klant — en NIET
 *      op een bestelling met een ander adres.
 */
import { DatabaseSync } from 'node:sqlite';
import { verseDb, d1 } from './lib/d1sqlite.mjs';
import { adminGet } from '../src/lib/admin.js';
import { hashToken } from '../src/lib/token.js';
import { verifySvix, parseBounce, bouncesFor, bounceLine } from '../src/lib/bounces.js';
import { onRequestPost } from '../functions/api/webhook/resend.js';

let geslaagd = 0, gezakt = 0;
function ok(naam, waarde, verwacht = true) {
  const goed = JSON.stringify(waarde) === JSON.stringify(verwacht);
  if (goed) { geslaagd++; console.log(`  ok   ${naam}`); }
  else { gezakt++; console.log(`FAIL  ${naam}    verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(waarde)}`); }
}

/* ── De handtekening, zoals Svix hem zet ─────────────────────────────────── */
const SECRET_BYTES = new Uint8Array(24).map((_, i) => i * 7 + 3);
const SECRET = 'whsec_' + btoa(String.fromCharCode(...SECRET_BYTES));
async function teken(body, { id = 'msg_1', ts = Math.floor(Date.now() / 1000), secret = SECRET } = {}) {
  const raw = Uint8Array.from(atob(secret.replace(/^whsec_/, '')), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${id}.${ts}.${body}`));
  return { id, timestamp: String(ts), signature: 'v1,' + btoa(String.fromCharCode(...new Uint8Array(mac))) };
}

console.log('\n1 · de handtekening');
{
  const body = '{"type":"email.bounced"}';
  const h = await teken(body);
  ok('een echte handtekening klopt', await verifySvix(body, h, SECRET), true);
  ok('met een andere body niet', await verifySvix(body + ' ', h, SECRET), false);
  ok('met een ander secret niet', await verifySvix(body, h, 'whsec_' + btoa('iets anders, 24 bytes...')), false);
  ok('zonder secret nooit', await verifySvix(body, h, ''), false);
  const oud = await teken(body, { ts: Math.floor(Date.now() / 1000) - 3600 });
  ok('een uur oud is verlopen', await verifySvix(body, oud, SECRET), false);
  ok('twee handtekeningen (sleutelwissel): één goede volstaat',
    await verifySvix(body, { ...h, signature: 'v1,AAAA ' + h.signature }, SECRET), true);
  ok('een v2-handtekening telt niet', await verifySvix(body, { ...h, signature: h.signature.replace('v1,', 'v2,') }, SECRET), false);
}

console.log('\n2 · wat er uit een gebeurtenis komt');
{
  const b = parseBounce({
    type: 'email.bounced', created_at: '2026-09-04T10:15:00.000Z',
    data: { email_id: 'em_1', to: ['Klant@Voorbeeld.NL'], subject: 'Je bestelling', bounce: { message: 'mailbox does not exist', type: 'Permanent', subType: 'General' } },
  });
  ok('het adres wordt kleingemaakt', b.email, 'klant@voorbeeld.nl');
  ok('de soort', b.kind, 'bounced');
  ok('type en subtype samen', b.bounceType, 'Permanent/General');
  ok('het tijdstip in D1-vorm', b.occurredAt, '2026-09-04 10:15:00');
  ok('een klacht heet complained', parseBounce({ type: 'email.complained', data: { to: 'a@b.nl' } }).kind, 'complained');
  ok('een afgeleverde mail is niets voor ons', parseBounce({ type: 'email.delivered', data: { to: ['a@b.nl'] } }), null);
  ok('zonder adres ook niets', parseBounce({ type: 'email.bounced', data: {} }), null);
  ok('de regel voor /admin noemt adres en datum',
    bounceLine({ email: 'a@b.nl', kind: 'bounced', occurred_at: '2026-09-04 10:15:00', bounce_type: 'Permanent/General' }).startsWith('Mail to a@b.nl bounced on 2026-09-04 (Permanent/General).'), true);
}

/* ── Een echte database ──────────────────────────────────────────────────── */
const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
if (mislukt.length) throw new Error('schema laadt niet: ' + mislukt.slice(0, 3).join(' | '));
const env = { DB: d1(db), RESEND_WEBHOOK_SECRET: SECRET };

const EVENT = (id, to, type = 'email.bounced') => JSON.stringify({
  type, created_at: '2026-09-04T10:15:00.000Z',
  data: { email_id: id, to: [to], subject: 'Je bestelling staat klaar', bounce: { message: 'mailbox does not exist', type: 'Permanent', subType: 'General' } },
});
async function webhook(body, h) {
  return onRequestPost({
    request: new Request('https://visuails.com/api/webhook/resend', {
      method: 'POST', body,
      headers: { 'svix-id': h.id, 'svix-timestamp': h.timestamp, 'svix-signature': h.signature, 'content-type': 'application/json' },
    }),
    env,
  });
}

console.log('\n3 · de webhook');
{
  const body = EVENT('em_1', 'Mara@Voorbeeld-Volt.nl');
  const h = await teken(body, { id: 'msg_a' });
  const r1 = await webhook(body, h);
  ok('een geldige bounce wordt aangenomen', r1.status, 200);
  ok('en staat in mail_bounces, kleingemaakt', db.prepare('SELECT email, kind FROM mail_bounces').all(), [{ email: 'mara@voorbeeld-volt.nl', kind: 'bounced' }]);

  const r2 = await webhook(body, h);
  ok('dezelfde aflevering nog eens is 200', r2.status, 200);
  ok('maar geen tweede rij', db.prepare('SELECT COUNT(*) AS n FROM mail_bounces').get().n, 1);

  const vals = await webhook(body, { ...h, signature: 'v1,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=' });
  ok('een verkeerde handtekening is 401', vals.status, 401);
  ok('en schrijft niets', db.prepare('SELECT COUNT(*) AS n FROM mail_bounces').get().n, 1);

  const geleverd = JSON.stringify({ type: 'email.delivered', data: { to: ['x@y.nl'] } });
  ok('een afgeleverde mail is 200 en niets', (await webhook(geleverd, await teken(geleverd, { id: 'msg_b' }))).status, 200);
  ok('  (nog steeds één rij)', db.prepare('SELECT COUNT(*) AS n FROM mail_bounces').get().n, 1);

  const zonder = await onRequestPost({ request: new Request('https://visuails.com/api/webhook/resend', { method: 'POST', body }), env: { DB: env.DB } });
  ok('zonder secret op de omgeving: 503, niets aangenomen', zonder.status, 503);

  const kaart = await bouncesFor(env, ['MARA@voorbeeld-volt.nl', 'iemand@anders.nl']);
  ok('bouncesFor vindt het adres ongeacht hoofdletters', kaart.has('mara@voorbeeld-volt.nl'), true);
  ok('en het andere adres niet', kaart.has('iemand@anders.nl'), false);
  const kaal = new DatabaseSync(':memory:');
  ok('zonder tabel (migratie 0045 nog niet gedraaid): een lege kaart, geen fout', (await bouncesFor({ DB: d1(kaal) }, ['a@b.nl'])).size, 0);
}

console.log('\n4 · de vlag in /admin');
{
  db.exec(`INSERT INTO admin_users (id, email, password_hash) VALUES (1, 'hello@visuails.com', 'x')`);
  const adminToken = 'proef-admin-token';
  db.prepare(`INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (1, 1, ?, '2099-01-01T00:00:00Z')`).run(await hashToken(adminToken));
  db.exec(`INSERT INTO customers (id, email, name, brand) VALUES (1, 'mara@voorbeeld-volt.nl', 'Mara', 'VOLT'), (2, 'sam@ander-merk.nl', 'Sam', 'ANDER')`);
  db.exec(`INSERT INTO orders (id, ref, email, customer_id, service, status, tier, product_count, lang, created_at)
           VALUES (11, 'VIS-2026-0011', 'Mara@Voorbeeld-Volt.nl', 1, 'catalog', 'received', 'attended', 3, 'nl', '2026-09-01'),
                  (12, 'VIS-2026-0012', 'sam@ander-merk.nl', 2, 'catalog', 'received', 'attended', 1, 'nl', '2026-09-02')`);
  const get = async (path) => (await adminGet({ request: new Request(`https://visuails.com${path}`, { headers: { cookie: `vis_admin=${adminToken}` } }), env, waitUntil() {} })).text();

  const lijst = await get('/admin');
  const kaart = (id) => (lijst.split(`id="order-${id}"`)[1] || '').split('<details class="or"')[0];
  ok('de lijst markeert de bestelling met het gebouncete adres', /mail bounced/.test(kaart(11)), true);
  ok('  en de rode regel staat in de kaart', /warnline is-rood/.test(kaart(11)), true);
  ok('de andere bestelling krijgt niets', /mail bounced|is-rood/.test(kaart(12)), false);

  const bestelling = await get('/admin/orders/11/files');
  ok('de bestandenpagina van 11 draagt de rode regel', /warnline is-rood/.test(bestelling), true);
  ok('die van 12 niet', /warnline is-rood/.test(await get('/admin/orders/12/files')), false);

  ok('de klantpagina van Mara ook', /warnline is-rood/.test(await get('/admin/customers/1')), true);
  ok('die van Sam niet', /warnline is-rood/.test(await get('/admin/customers/2')), false);

  ok('/admin/diagnose noemt het webhook-secret in de lanceerlijst', /RESEND_WEBHOOK_SECRET/.test(await get('/admin/diagnose')), true);
}

console.log(`\n${geslaagd}/${geslaagd + gezakt} geslaagd`);
process.exit(gezakt ? 1 : 0);
