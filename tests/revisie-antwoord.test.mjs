/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * EEN REVISIE KRIJGT EEN ANTWOORD, EN EEN ANDER BEELD  ·  npm run test:revisieantwoord
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas, 27 augustus 2026:
 *
 *   "als de klant een revisie aanvraagt en een foto dus wil aanpassen kan ik
 *    niet de foto vervangen naar een andere foto en dan deze terug sturen naar
 *    de klant waar na de foto in zijn order dus veranderd, de klant krijgt dan
 *    dezelfde foto weer terug en ziet er ook geen note bij van wat er is
 *    aangepast terwijl ik deze wel heb ingevuld."
 *
 * Drie dingen tegelijk mis, en ze versterkten elkaar.
 *
 * ── 1 · DE KNOP VERVING NIETS ──────────────────────────────────────────────
 * /admin/revisions/:id/resolve zette review_state terug op 'pending' op HETZELFDE
 * bestand. Er werd niets geüpload en niets vervangen, dus de klant kreeg exact
 * dezelfde foto opnieuw ter beoordeling. De juiste weg bestond al helemaal —
 * upload op hetzelfde product en dezelfde shot, resupersede() zet het oude beeld
 * op superseded_at, closeReplacedRevisions() sluit het verzoek bij het
 * aankondigen — maar die begon op een ander scherm. De enige knop die op de
 * revisiekaart stond, was de knop die het werk NIET deed.
 *
 * ── 2 · DE NOTITIE VAN DE KLANT WERD GEWIST ────────────────────────────────
 * In dezelfde batch stond `review_note = NULL`. Precies op het moment dat je een
 * ronde afhandelde, verdween de zin waaróm er een ronde was — en alles wat
 * daarna naar files.review_note kijkt, meldde "Geen notitie achtergelaten" over
 * een klant die wel degelijk iets had opgeschreven.
 *
 * ── 3 · HET ANTWOORD KWAM NERGENS AAN ──────────────────────────────────────
 * De regel ging naar revision_requests.resolution_note, en die kolom werd in de
 * hele codebase alleen beschreven en nooit gelezen. Het invoerveld beloofde
 * "deze regel gaat naar de klant"; dat werd niet waargemaakt.
 *
 * Deze toets draait de ECHTE route over een ECHTE database, want dat is het
 * soort fout dat een test op "wordt de functie aangeroepen" niet vindt.
 */

import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { adminPost } from '../src/lib/admin.js';
import { mintToken, hashToken } from '../src/lib/token.js';

let goed = 0;
let totaal = 0;
function ok(naam, waarde, verwacht) {
  totaal += 1;
  const gelijk = JSON.stringify(waarde) === JSON.stringify(verwacht);
  if (gelijk) goed += 1;
  console.log(`${gelijk ? ' ok  ' : 'FAIL '} ${naam.padEnd(60)}${gelijk ? '' : `verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(waarde)}`}`);
}

/* Dezelfde D1-schil als tests/revisieronde.test.mjs. */
function d1(db) {
  const maak = (sql) => {
    const st = {
      _a: [], _sql: sql,
      bind(...a) { st._a = a; return st; },
      async all() { return { results: db.prepare(sql).all(...st._a) }; },
      async run() { return { success: true, meta: db.prepare(sql).run(...st._a) }; },
      async first() { return db.prepare(sql).get(...st._a) ?? null; },
    };
    return st;
  };
  return {
    prepare: maak,
    async batch(lijst) {
      db.exec('BEGIN');
      try {
        const uit = [];
        for (const st of lijst) uit.push({ success: true, meta: db.prepare(st._sql).run(...st._a) });
        db.exec('COMMIT');
        return uit;
      } catch (err) { db.exec('ROLLBACK'); throw err; }
    },
  };
}

const KLACHT = 'Er staat een model op de foto, daar heb ik niet om gevraagd.';
const ANTWOORD = 'Model eruit, product opnieuw uitgesneden op wit.';

function opzet() {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
  db.prepare("INSERT INTO customers (email) VALUES ('klant@merk.nl')").run();
  const customerId = db.prepare('SELECT id FROM customers').get().id;
  db.prepare(
    `INSERT INTO orders (ref, email, service, status, payment_status, customer_id, lang)
     VALUES ('VIS-RA-001', 'klant@merk.nl', 'catalog', 'delivered', 'paid', ?, 'nl')`
  ).run(customerId);
  const orderId = db.prepare("SELECT id FROM orders WHERE ref = 'VIS-RA-001'").get().id;
  db.prepare(
    `INSERT INTO files (order_id, kind, filename, r2_key, product_key, shot,
                        review_state, review_note, reviewed_at)
     VALUES (?, 'delivery', 'p1-worn.webp', 'k/1', 'p1', 'worn',
             'revision_requested', ?, datetime('now'))`
  ).run(orderId, KLACHT);
  const fileId = db.prepare('SELECT id FROM files ORDER BY id DESC LIMIT 1').get().id;
  db.prepare(
    `INSERT INTO revision_requests (file_id, order_id, customer_id, note) VALUES (?, ?, ?, ?)`
  ).run(fileId, orderId, customerId, KLACHT);
  return { db, env: { DB: d1(db) }, orderId, fileId, customerId };
}

/* EEN ECHTE ADMINSESSIE, EN NIET EEN GESTUBDE. currentAdmin() zoekt de gehashte
   cookie op in admin_sessions × admin_users; zonder die twee rijen valt elke
   POST terug op een 303 naar /admin/login — en dan meet je niets. Dat overkwam
   deze toets bij de eerste keer draaien: alle beweringen faalden tegelijk, wat
   het herkenbare beeld is van een verzoek dat de handler nooit bereikte. */
async function sessie(db) {
  const token = await mintToken();
  db.prepare("INSERT INTO admin_users (email, password_hash) VALUES ('lucas@visuails.com', 'x')").run();
  const adminId = db.prepare('SELECT id FROM admin_users ORDER BY id DESC LIMIT 1').get().id;
  db.prepare(
    "INSERT INTO admin_sessions (admin_id, token_hash, expires_at) VALUES (?, ?, datetime('now', '+1 day'))"
  ).run(adminId, await hashToken(token));
  return token;
}

async function afhandelen(env, db, fileId, regel) {
  const token = await sessie(db);
  const body = new URLSearchParams({ fixed: regel });
  const request = new Request(`https://visuails.com/admin/revisions/${fileId}/resolve`, {
    method: 'POST',
    headers: {
      cookie: `vis_admin=${token}`,
      origin: 'https://visuails.com',
      'content-type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  return adminPost({ request, env, waitUntil() {} });
}

console.log('\nde notitie van de klant overleeft het afhandelen');
{
  const { db, env, fileId } = opzet();
  await afhandelen(env, db, fileId, ANTWOORD);
  const f = db.prepare('SELECT review_state, review_note FROM files WHERE id = ?').get(fileId);
  /* DIT IS DE REGRESSIE. Stond hier ooit `review_note = NULL`, dan is dit weer
     null en meldt elk scherm dat ernaar kijkt "geen notitie achtergelaten". */
  ok('de klacht staat er nog', f.review_note, KLACHT);
  ok('en de toestand is wél terug op pending', f.review_state, 'pending');
}

console.log('\nhet antwoord van de studio wordt bewaard én is te lezen');
{
  const { db, env, fileId } = opzet();
  await afhandelen(env, db, fileId, ANTWOORD);
  const r = db.prepare(
    'SELECT resolved_at, resolution_note FROM revision_requests WHERE file_id = ?'
  ).get(fileId);
  ok('de regel staat op het verzoek', r.resolution_note, ANTWOORD);
  ok('en het verzoek is afgehandeld', !!r.resolved_at, true);

  /* En hij is op te halen langs de weg die het klantscherm gebruikt: de laatste
     afgehandelde regel per beeld. Zou die subquery ooit sneuvelen, dan valt deze
     regel om in plaats van dat de klant stilletjes niets meer te zien krijgt. */
  const zicht = db.prepare(
    `SELECT (SELECT rr.resolution_note FROM revision_requests rr
              WHERE rr.file_id = f.id AND rr.resolved_at IS NOT NULL
                AND rr.resolution_note IS NOT NULL
              ORDER BY rr.resolved_at DESC LIMIT 1) AS fix_note
       FROM files f WHERE f.id = ?`
  ).get(fileId);
  ok('en het klantscherm kan hem vinden', zicht.fix_note, ANTWOORD);

  const e = db.prepare(
    "SELECT note FROM order_events WHERE actor = 'admin' ORDER BY id DESC LIMIT 1"
  ).get();
  ok('en hij staat op de tijdlijn van de bestelling', e?.note, ANTWOORD);
}

console.log('\nafhandelen zonder regel doet niets');
{
  const { db, env, fileId } = opzet();
  const res = await afhandelen(env, db, fileId, '   ');
  ok('de route weigert', res.status, 400);
  const f = db.prepare('SELECT review_state, review_note FROM files WHERE id = ?').get(fileId);
  ok('en het verzoek staat nog open', f.review_state, 'revision_requested');
  ok('met de klacht er nog bij', f.review_note, KLACHT);
}

/* ─────────────────────────────────────────────────────────────────────────────
   EN DE WEG DIE HET BEELD WÉL VERVANGT, STAAT OP DE KAART
   ─────────────────────────────────────────────────────────────────────────────
   Dit is een broncontrole en geen meting, met opzet: de vervangroute zelf heeft
   al een toets (tests/admin.test.mjs dekt /deliver en resupersede). Wat hier
   misging was niet de route maar het ONTBREKEN van de knop ernaartoe — en dat
   is precies iets dat je in de bron vastzet. */
console.log('\nde revisiekaart biedt de vervanging aan');
{
  const bron = readFileSync(new URL('../src/lib/admin.js', import.meta.url), 'utf8');
  const kaart = bron.slice(bron.indexOf('function revisionCard'), bron.indexOf('function orderCard'));
  ok('er staat een uploadformulier naar /deliver',
    /action="\/admin\/orders\/\$\{r\.order_id\}\/deliver"/.test(kaart), true);
  ok('met product en shot al ingevuld',
    /name="product" value="\$\{esc\(r\.product_key\)\}"/.test(kaart)
    && /name="shot" value="\$\{esc\(r\.shot\)\}"/.test(kaart), true);
  ok('en een bestandsveld', /type="file" name="files"/.test(kaart), true);
  /* De oude knop mag blijven bestaan — soms hoeft er niets vervangen te worden —
     maar hij mag niet meer klinken alsof hij het beeld heeft aangepast. */
  /* Op de KNOP en niet ergens in de tekst: de noot hierboven citeert de oude
     naam om uit te leggen waarom hij weg is, en daar mag deze toets niet op
     aanslaan. Dat deed hij bij de eerste keer draaien wel. */
  ok('de afvinkknop belooft geen nieuw beeld meer',
    /type="submit">Opgelost/.test(kaart), false);
}

console.log(`\n${goed}/${totaal} geslaagd`);
process.exit(goed === totaal ? 0 : 1);
