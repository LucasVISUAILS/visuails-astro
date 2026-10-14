/* VISUAILS — stil afronden na de revisietermijn (punt 3.03, V24 = a).
 *
 * De nachtelijke taak rondt een geleverde, betaalde bestelling zonder open
 * revisie af als er REVISIE_DAGEN niets is gebeurd sinds de laatste levering of
 * het laatste revisieantwoord. Hier tegen het echte schema:
 *   · precies op de laatste revisiedag nog niet, de nacht erna wel;
 *   · de klok telt vanaf de láátste levering of het laatste revisieantwoord;
 *   · open revisie, onbetaald, al afgerond, zonder levermail: overslaan;
 *   · abonnementswerk ('plan') gaat mee;
 *   · closed_at, een interne regel in order_events, de bewaartermijn van de
 *     bronfoto's, een regel in het nachtrapport en GEEN mail.
 */
import { d1, verseDb, telling } from './lib/d1sqlite.mjs';
import { tasks } from '../cron/index.js';
import { STIL_AFRONDEN_DAGEN, STIL_AFGEROND_NOTITIE } from '../src/lib/close.js';
import { REVISIE_DAGEN } from '../src/data/pricing.js';

let goed = 0, fout = 0;
const ok = (naam, w, v = true) => {
  const p = JSON.stringify(w) === JSON.stringify(v);
  if (p) goed++; else fout++;
  console.log(`${p ? '  ok ' : 'FAIL'}  ${naam}${p ? '' : `    verwacht ${JSON.stringify(v)} kreeg ${JSON.stringify(w)}`}`);
};

const gezien = [];
globalThis.fetch = async (url) => { gezien.push(String(url)); return new Response('{}', { status: 200 }); };

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
if (mislukt.length) throw new Error('schema laadt niet: ' + mislukt.join(' | '));
const env = { DB: d1(db), RESEND_API_KEY: 're_test', FROM_EMAIL: 'VISUAILS <orders@visuails.com>', NOTIFY_EMAIL: 'studio@voorbeeld.test' };

ok('de termijn is de revisietermijn', STIL_AFRONDEN_DAGEN, REVISIE_DAGEN);

/* Een moment N dagen geleden, om 12:00 UTC. */
const dagenTerug = (n) => db.prepare(`SELECT datetime(date('now', '-${n} days'), '+12 hours') AS t`).get().t;

let volg = 0;
const order = (ref, { betaald = 'paid', gemaild = 10, herlevering = null, gesloten = null, verborgen = null, status = 'delivered' } = {}) => {
  const id = ++volg;
  db.prepare(
    `INSERT INTO orders (id, ref, service, status, email, lang, payment_status, total_cents, delivered_at, delivery_mailed_at, redelivery_mailed_at, closed_at, hidden_at)
     VALUES (?, ?, 'catalog', ?, 'klant@voorbeeld.test', 'nl', ?, 4900, ?, ?, ?, ?, ?)`
  ).run(id, ref, status, betaald, gemaild == null ? null : dagenTerug(gemaild), gemaild == null ? null : dagenTerug(gemaild),
    herlevering == null ? null : dagenTerug(herlevering), gesloten, verborgen);
  db.prepare("INSERT INTO files (order_id, kind, r2_key, created_at) VALUES (?, 'delivery', ?, ?)").run(id, `lever/${ref}/1.jpg`, dagenTerug(gemaild ?? 30));
  db.prepare("INSERT INTO files (order_id, kind, r2_key, created_at) VALUES (?, 'upload', ?, ?)").run(id, `intake/${ref}/1.jpg`, dagenTerug(40));
  return id;
};
const revisie = (orderId, { gevraagd, beantwoord = null }) => {
  const f = db.prepare("SELECT id FROM files WHERE order_id = ? AND kind = 'delivery'").get(orderId).id;
  db.prepare('INSERT INTO revision_requests (file_id, order_id, note, created_at, resolved_at) VALUES (?, ?, ?, ?, ?)')
    .run(f, orderId, 'iets lichter graag', dagenTerug(gevraagd), beantwoord == null ? null : dagenTerug(beantwoord));
};

const R = REVISIE_DAGEN;
const opDeLaatsteDag = order('VIS-LAATSTE-DAG', { gemaild: R });
const deNachtErna = order('VIS-NACHT-ERNA', { gemaild: R + 1 });
const abonnement = order('VIS-ABO', { betaald: 'plan', gemaild: R + 3 });
const onbetaald = order('VIS-ONBETAALD', { betaald: 'unpaid', gemaild: R + 5 });
const alAf = order('VIS-AL-AF', { gemaild: R + 5, gesloten: '2026-01-02 03:04:05' });
const zonderMail = order('VIS-ZONDER-MAIL', { gemaild: null });
const herleverd = order('VIS-HERLEVERD', { gemaild: R + 10, herlevering: 2 });
const openRevisie = order('VIS-OPEN-REVISIE', { gemaild: R + 10 });
revisie(openRevisie, { gevraagd: R + 8 });
const recentAntwoord = order('VIS-RECENT-ANTWOORD', { gemaild: R + 10 });
revisie(recentAntwoord, { gevraagd: R + 8, beantwoord: 2 });
const oudAntwoord = order('VIS-OUD-ANTWOORD', { gemaild: R + 12 });
revisie(oudAntwoord, { gevraagd: R + 10, beantwoord: R + 1 });
const verborgen = order('VIS-VERBORGEN', { gemaild: R + 5, verborgen: '2026-01-01 00:00:00' });
const inProductie = order('VIS-PRODUCTIE', { gemaild: R + 5, status: 'in_production' });

const regel = await tasks.stilAfronden(env);
const af = (id) => !!db.prepare('SELECT closed_at FROM orders WHERE id = ?').get(id).closed_at;

ok('op de laatste revisiedag (tot en met vandaag) nog niet afgerond', af(opDeLaatsteDag), false);
ok('de nacht na de laatste revisiedag wel', af(deNachtErna), true);
ok('abonnementswerk gaat mee', af(abonnement), true);
ok('onbetaald blijft open', af(onbetaald), false);
ok('zonder levermail blijft open (de klant weet nog van niets)', af(zonderMail), false);
ok('herlevering twee dagen geleden: de klok begint opnieuw', af(herleverd), false);
ok('open revisie: blijft open', af(openRevisie), false);
ok('revisieantwoord twee dagen geleden: blijft open', af(recentAntwoord), false);
ok('revisieantwoord van ruim de termijn geleden: afgerond', af(oudAntwoord), true);
ok('verborgen (testwerk) wordt overgeslagen', af(verborgen), false);
ok('nog in productie: niet afgerond', af(inProductie), false);
ok('al afgerond: closed_at blijft zoals hij was',
  db.prepare('SELECT closed_at FROM orders WHERE id = ?').get(alAf).closed_at, '2026-01-02 03:04:05');

ok('één interne regel in order_events per afgeronde bestelling',
  telling(db, "SELECT COUNT(*) FROM order_events WHERE note = ? AND actor = 'intern'", STIL_AFGEROND_NOTITIE), 3);
ok('niet bij een bestelling die open bleef',
  telling(db, 'SELECT COUNT(*) FROM order_events WHERE order_id IN (?, ?, ?) AND note = ?', opDeLaatsteDag, openRevisie, onbetaald, STIL_AFGEROND_NOTITIE), 0);
ok('de bewaartermijn van de bronfoto’s loopt vanaf het afronden',
  telling(db, "SELECT COUNT(*) FROM files WHERE order_id = ? AND kind = 'upload' AND expires_at IS NOT NULL", deNachtErna), 1);
ok('en niet bij een open bestelling',
  telling(db, "SELECT COUNT(*) FROM files WHERE order_id = ? AND kind = 'upload' AND expires_at IS NOT NULL", opDeLaatsteDag), 0);

ok('het nachtrapport noemt het aantal en de kenmerken',
  /^3 bestellingen stil afgerond .*VIS-NACHT-ERNA, VIS-ABO, VIS-OUD-ANTWOORD\.$/.test(regel || ''), true);
ok('en zegt dat er geen mail uitging', /geen mail/.test(regel || ''), true);
ok('er ging geen mail (geen enkele fetch)', gezien.length, 0);

const tweede = await tasks.stilAfronden(env);
ok('een tweede nacht doet niets en meldt niets', tweede, null);
ok('en schrijft geen tweede regel',
  telling(db, 'SELECT COUNT(*) FROM order_events WHERE note = ?', STIL_AFGEROND_NOTITIE), 3);

/* De dag erna is de laatste revisiedag voorbij. */
db.prepare("UPDATE orders SET delivery_mailed_at = ?, delivered_at = ? WHERE id = ?").run(dagenTerug(R + 1), dagenTerug(R + 1), opDeLaatsteDag);
db.prepare("UPDATE files SET created_at = ? WHERE order_id = ? AND kind = 'delivery'").run(dagenTerug(R + 1), opDeLaatsteDag);
await tasks.stilAfronden(env);
ok('een dag later is ook die afgerond', af(opDeLaatsteDag), true);

console.log(`\n${goed} goed, ${fout} fout`);
if (fout) process.exit(1);
