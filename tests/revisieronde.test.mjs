/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * ÉÉN REVISIERONDE PER BESTELLING  ·  npm run test:revisieronde
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas, 24 augustus 2026:
 *
 *   "Klanten kunnen niet meer zoveel revisies aanvragen als ze willen omdat dit
 *    simpelweg niet haalbaar is voor me. Ik wil dat ze eenmalig een revisie
 *    kunnen aanvragen per order en dan alle foto's moeten selecteren/doorgeven
 *    wat niet goed is."
 *
 * De zin stond sinds 20 augustus op /pricing, /start en elke tredetabel. Het
 * gedrag eronder bestond niet: de klant kon per beeld, onbeperkt vaak, een
 * revisie vragen. Tussen de belofte en de code zat dus een gat waarin iemand iets
 * kan vragen wat de site hem toezegt en wat op geen enkele vastlegging te
 * weigeren valt.
 *
 * ── WAAROM DIT DE ZWAARSTE TOETS VAN DEZE RONDE IS ─────────────────────────
 *
 * Omdat de fout maar één kant op valt en beide kanten geld kosten. Een ronde die
 * per ongeluk twee keer mag, is precies de onhaalbaarheid waar Lucas van af wil.
 * Een ronde die ten onrechte geweigerd wordt, is een belofte breken op het scherm
 * van een klant die net heeft betaald.
 *
 * ── TEGEN EEN ECHTE DATABASE EN NIET TEGEN EEN STUB ────────────────────────
 *
 * De grendel is een `WHERE revision_round_at IS NULL` in de UPDATE. Een stub die
 * de SQL alleen ONTHOUDT, kan niet zien of die WHERE werkt — hij zou groen
 * blijven als de regel er niet stond. Dus draait alles hieronder op node:sqlite,
 * met een echte batch die de statements werkelijk uitvoert.
 *
 * De sessie is wél gestubd, en alleen die: een echte inlogsessie nabouwen toetst
 * account.js's cookiepad en dat heeft zijn eigen suite (account-signin).
 *
 * ── EN DE POORT STAAT OP TWEE SCHERMEN ─────────────────────────────────────
 *
 * Het gemailde portaal (portal.js) en het ingelogde dashboard (account.js) hebben
 * allebei hun eigen handler. Dat is niet te vermijden — de een kent de bestelling
 * uit een token, de ander uit een formulier — en het is precies de constructie
 * die in dit project al twee keer uit elkaar is gelopen. Deel 4 hieronder legt ze
 * daarom naast elkaar op de dingen die gelijk MOETEN zijn.
 */

import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { accountGet, accountPost } from '../src/lib/account.js';
import { mintToken, hashToken } from '../src/lib/token.js';
import {
  revisionRoundState, canRequestRevisionRound, REVISION_ROUND_STATES,
} from '../src/data/pricing.js';

let pass = 0, fail = 0;
const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) pass++; else fail++;
  console.log(`${ok ? ' ok  ' : 'FAIL '} ${String(name).padEnd(60)} ${ok ? '' : `verwacht ${JSON.stringify(expected)} kreeg ${JSON.stringify(actual)}`}`);
};
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

/* ══ 1 · DE POORT ZELF ══════════════════════════════════════════════════════
 *
 * Een zuivere functie, dus zonder database. Vier redenen om nee te zeggen en ze
 * betekenen niet hetzelfde — daarom een toestand en geen boolean. Zie de noot bij
 * revisionRoundState() in src/data/pricing.js.
 */
console.log('\nde poort kent vier redenen om nee te zeggen');
{
  check('een verse bestelling mag',            revisionRoundState({}), 'beschikbaar');
  check('de proefvisual niet',                 revisionRoundState({ service: 'test-sample' }), 'nvt');
  check('een gebruikte ronde niet',            revisionRoundState({ revision_round_at: '2026-08-24 10:00:00' }), 'gebruikt');
  check('een ingetrokken recht niet',          revisionRoundState({ revisions_revoked_at: '2026-08-01' }), 'ingetrokken');
  check('een afgeronde bestelling niet',       revisionRoundState({ closed_at: '2026-08-20' }), 'gesloten');
  check('en niets is ook niets',               revisionRoundState(null), 'nvt');

  /* DE VOLGORDE IS DE VOLGORDE VAN DE UITLEG. Een afgesloten bestelling waarvan
     de ronde óók gebruikt is, hoort 'gebruikt' te melden: dat is het antwoord op
     de vraag die de klant stelt. "Deze bestelling is afgerond" leest als een deur
     die je zelf niet dicht hebt gedaan. */
  check('gebruikt wint van gesloten',
    revisionRoundState({ closed_at: '2026-08-20', revision_round_at: '2026-08-19' }), 'gebruikt');
  check('en van ingetrokken',
    revisionRoundState({ revisions_revoked_at: '2026-08-01', revision_round_at: '2026-08-19' }), 'gebruikt');

  /* De boolean is AFGELEID en niet een tweede keer opgeschreven — anders kunnen
     "mag het" en "waarom niet" uit elkaar lopen, en dat is nu net het paar dat in
     één scherm naast elkaar staat. */
  for (const staat of REVISION_ROUND_STATES) {
    const o = {
      beschikbaar: {},
      gebruikt: { revision_round_at: 'x' },
      ingetrokken: { revisions_revoked_at: 'x' },
      gesloten: { closed_at: 'x' },
      nvt: { service: 'test-sample' },
    }[staat];
    check(`canRequestRevisionRound volgt '${staat}'`, canRequestRevisionRound(o), staat === 'beschikbaar');
  }
}

/* ══ EEN ECHTE DATABASE ═════════════════════════════════════════════════════ */

const KLANT = 7;
const inAnHour = new Date(Date.now() + 3600e3).toISOString().slice(0, 19).replace('T', ' ');

/*
 * ── DE ECHTE schema.sql EN GEEN NAGEBOUWDE TABELLEN ────────────────────────
 *
 * De eerste versie hiervan tekende vijf tabellen met de hand. Die miste
 * `window_start`, `files.bytes` en nog een stuk of zes kolommen, waardoor
 * loadOrders() en loadDeliveryFiles() stilletjes niets teruggaven — en de
 * schermcontrole in deel 4 dus groen kon staan terwijl er helemaal geen
 * bestelling op de pagina stond.
 *
 * Dat is de valkuil van een nagebouwd schema: hij faalt naar LEEG, en leeg ziet
 * eruit als "de knop staat er niet". Het echte bestand kan dat niet, en als er
 * ooit iets in verandert waar deze code op leunt, valt het hier om in plaats van
 * op de dag van de uitrol.
 */
function bouwDb({ closed = null, roundAt = null, revoked = null, ownerId = KLANT } = {}) {
  const db = new DatabaseSync(':memory:');
  db.exec(read('schema.sql'));

  db.prepare('INSERT INTO customers (id, email, name, brand, revisions_revoked_at) VALUES (?,?,?,?,?)')
    .run(KLANT, 'studio@voorbeeld.nl', 'Mara', 'VOLT', revoked);
  /* Een tweede, ECHTE klant voor het geval "de bestelling is van iemand anders".
     schema.sql legt een foreign key op orders.customer_id, dus een verzonnen
     nummer wordt daar geweigerd — en dat is precies goed: de toets hoort de
     situatie na te bootsen die kan bestaan, namelijk een andere klant met een
     eigen bestelling, en niet een nummer dat nergens naar wijst. */
  if (ownerId !== KLANT) {
    db.prepare('INSERT INTO customers (id, email, name, brand) VALUES (?,?,?,?)')
      .run(ownerId, 'iemand@anders.nl', 'Iemand', 'ANDERS');
  }
  /* `email` is NOT NULL op orders — schema.sql zegt het en een nagebouwde tabel
     zei het niet. Precies het soort verschil waar de noot hierboven over gaat. */
  db.prepare(`INSERT INTO orders (id, ref, email, customer_id, service, status, tier, product_count, lang, created_at, closed_at, revision_round_at)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(91, 'VIS-2026-0091', 'studio@voorbeeld.nl', ownerId, 'catalog', 'delivered', 'attended', 3, 'nl', '2026-08-01', closed, roundAt);
  /* Een TWEEDE bestelling, van dezelfde klant. Zonder die tweede kan de controle
     hieronder niet bewijzen dat beelden van een andere bestelling eruit vallen —
     en dat is nu net de controle die een klant zou laten aanwijzen wat niet bij
     deze bestelling hoort. */
  db.prepare(`INSERT INTO orders (id, ref, email, customer_id, service, status, tier, product_count, lang, created_at)
              VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run(92, 'VIS-2026-0092', 'studio@voorbeeld.nl', ownerId, 'catalog', 'delivered', 'attended', 1, 'nl', '2026-08-02');

  for (const [id, orderId, state, extra] of [
    [1, 91, 'pending', {}],
    [2, 91, 'pending', {}],
    [3, 91, 'pending', {}],
    [4, 91, 'approved', {}],                              // al goedgekeurd — mag niet mee
    [5, 91, 'pending', { superseded_at: '2026-08-10' }],  // vervangen — mag niet mee
    [6, 92, 'pending', {}],                               // andere bestelling — mag niet mee
  ]) {
    db.prepare(`INSERT INTO files (id, order_id, kind, r2_key, filename, bytes, review_state, superseded_at, product_key, shot)
                VALUES (?,?,'delivery',?,?,?,?,?,?,?)`)
      .run(id, orderId, `k${id}`, `beeld-${id}.jpg`, 120000, state, extra.superseded_at ?? null, 'p1', 'front');
  }
  return db;
}

/* De D1-schil. `batch` voert de statements ECHT uit — zie de kop: zonder dat is
   de grendel in de UPDATE niet te meten. */
function d1(db, hash) {
  const uitvoeren = (sql, binds) => {
    const st = db.prepare(sql);
    return /^\s*select/i.test(sql) ? st.all(...binds) : st.run(...binds);
  };
  return {
    prepare(sql) {
      const st = {
        sql, _b: [],
        bind(...a) { st._b = a; return st; },
        async first() {
          if (sql.includes('FROM account_sessions')) {
            return st._b[0] === hash
              ? { session_id: 1, expires_at: inAnHour, customer_id: KLANT, email: 'studio@voorbeeld.nl', name: 'Mara', brand: 'VOLT' }
              : null;
          }
          try { return uitvoeren(sql, st._b)[0] ?? null; } catch { return null; }
        },
        async all() {
          try { return { results: uitvoeren(sql, st._b) }; } catch { return { results: [] }; }
        },
        async run() { try { uitvoeren(sql, st._b); } catch { /* zoals D1: stil */ } return {}; },
      };
      return st;
    },
    async batch(stmts) {
      for (const st of stmts) uitvoeren(st.sql, st._b);
      return [];
    },
  };
}

async function ronde(db, velden) {
  const token = await mintToken();
  const env = { DB: d1(db, await hashToken(token)), RESEND_API_KEY: '', NOTIFY_EMAIL: '' };
  const request = new Request('https://visuails.com/account/review', {
    method: 'POST',
    body: new URLSearchParams(velden),
    headers: {
      cookie: `vis_account=${token}`,
      origin: 'https://visuails.com',
      'content-type': 'application/x-www-form-urlencoded',
    },
  });
  const res = await accountPost({ request, env, waitUntil() {} });
  return { status: res.status, location: res.headers.get('location') };
}

const stand = (db, id = 91) => db.prepare('SELECT revision_round_at, revision_round_note, revision_round_count FROM orders WHERE id = ?').get(id);
const staten = (db) => db.prepare("SELECT id, review_state FROM files WHERE order_id IN (91,92) ORDER BY id").all().map((r) => `${r.id}:${r.review_state}`);
const verzoeken = (db) => db.prepare('SELECT file_id, note FROM revision_requests ORDER BY file_id').all();

/* ══ 2 · DE RONDE WORDT INGEDIEND, ÉÉN KEER ═════════════════════════════════ */
console.log('\néén ronde wordt aangenomen en vastgelegd');
{
  const db = bouwDb();
  const params = new URLSearchParams();
  params.append('action', 'round');
  params.append('order', '91');
  params.append('note', 'De kleur van het jasje klopt op geen van deze.');
  params.append('bad', '1');
  params.append('bad', '3');
  const r = await ronde(db, params);

  check('hij stuurt terug naar de bestelling', r.location, '/account/orders#order-91');
  check('de aangevinkte beelden staan op revisie', staten(db),
    ['1:revision_requested', '2:pending', '3:revision_requested', '4:approved', '5:pending', '6:pending']);
  check('er staan twee verzoeken in het logboek', verzoeken(db).length, 2);
  check('met de notitie van de klant', verzoeken(db)[0].note, 'De kleur van het jasje klopt op geen van deze.');

  const s = stand(db);
  check('de ronde is gestempeld', Boolean(s.revision_round_at), true);
  check('met het aantal erbij', s.revision_round_count, 2);
  check('en de notitie van het geheel', s.revision_round_note, 'De kleur van het jasje klopt op geen van deze.');

  /* ── EN DE TWEEDE RONDE WORDT GEWEIGERD ──────────────────────────────────
     Dit is de hele reden dat dit bestand bestaat. Niets mag er nog veranderen:
     geen beeld erbij, geen verzoek erbij, en de stempel blijft die van de eerste. */
  const eerste = s.revision_round_at;
  const tweede = new URLSearchParams();
  tweede.append('action', 'round');
  tweede.append('order', '91');
  tweede.append('note', 'En deze ook nog.');
  tweede.append('bad', '2');
  await ronde(db, tweede);

  check('een tweede ronde raakt geen enkel beeld', staten(db),
    ['1:revision_requested', '2:pending', '3:revision_requested', '4:approved', '5:pending', '6:pending']);
  check('en schrijft geen verzoek bij', verzoeken(db).length, 2);
  check('en laat de eerste stempel staan', stand(db).revision_round_at, eerste);
  check('en het aantal ook', stand(db).revision_round_count, 2);
}

/* ══ 3 · WAT ER NIET IN DE RONDE MAG ════════════════════════════════════════ */
console.log('\nwat er niet in een ronde hoort, valt eruit');
{
  /* Een goedgekeurd beeld, een vervangen beeld en een beeld van een ANDERE
     bestelling — alle drie in één POST, samen met één geldig beeld. Alleen dat
     ene hoort te worden aangemerkt.

     Het beeld van bestelling 92 is de gevaarlijkste: dat is een geldige sessie
     die een nummer in een formulier verhoogt. Zonder de `order_id = ?1` in de
     controlequery zou hij een andere bestelling van zichzelf aanmerken — en
     daarmee de ronde van díé bestelling opmaken zonder er een aan te vragen. */
  const db = bouwDb();
  const p = new URLSearchParams();
  p.append('action', 'round');
  p.append('order', '91');
  p.append('note', 'Deze drie.');
  p.append('bad', '2');   // geldig
  p.append('bad', '4');   // al goedgekeurd
  p.append('bad', '5');   // vervangen
  p.append('bad', '6');   // andere bestelling
  await ronde(db, p);

  check('alleen het geldige beeld is aangemerkt', staten(db),
    ['1:pending', '2:revision_requested', '3:pending', '4:approved', '5:pending', '6:pending']);
  check('en de telling zegt één', stand(db).revision_round_count, 1);
}

console.log('\neen lege of stille ronde verandert niets');
{
  for (const [naam, velden] of [
    ['zonder aangevinkt beeld', [['action', 'round'], ['order', '91'], ['note', 'Er klopt iets niet.']]],
    ['zonder notitie', [['action', 'round'], ['order', '91'], ['bad', '1']]],
    ['met een lege notitie', [['action', 'round'], ['order', '91'], ['note', '   '], ['bad', '1']]],
  ]) {
    const db = bouwDb();
    const p = new URLSearchParams();
    for (const [k, v] of velden) p.append(k, v);
    await ronde(db, p);
    check(`${naam} — geen beeld geraakt`, staten(db).filter((x) => x.includes('revision_requested')).length, 0);
    check(`${naam} — geen stempel`, stand(db).revision_round_at, null);
  }
}

console.log('\nde poort geldt ook voor een POST die het formulier omzeilt');
{
  for (const [naam, opties] of [
    ['een afgeronde bestelling', { closed: '2026-08-20' }],
    ['een ingetrokken recht', { revoked: '2026-08-01' }],
    ['een bestelling van iemand anders', { ownerId: 999 }],
  ]) {
    const db = bouwDb(opties);
    const p = new URLSearchParams();
    p.append('action', 'round');
    p.append('order', '91');
    p.append('note', 'Toch maar proberen.');
    p.append('bad', '1');
    await ronde(db, p);
    check(`${naam} — geen beeld geraakt`, staten(db).filter((x) => x.includes('revision_requested')).length, 0);
    check(`${naam} — geen stempel`, stand(db).revision_round_at, null);
  }

  /* DE OUDE WEG IS DICHT. `action=revise` was tot 24 augustus 2026 de per-beeld
     revisie, onbeperkt herhaalbaar. Een tabblad dat sinds gisteren openstaat,
     draagt dat formulier nog — en het hoort niets meer te doen. */
  const db = bouwDb();
  await ronde(db, [['action', 'revise'], ['file', '1'], ['note', 'Zoals vroeger.']]
    .reduce((u, [k, v]) => (u.append(k, v), u), new URLSearchParams()));
  check('action=revise doet niets meer', staten(db).filter((x) => x.includes('revision_requested')).length, 0);
}

/* ══ 4 · WAT DE KLANT ZIET, VOOR EN NA ══════════════════════════════════════ */
console.log('\nhet scherm wisselt van formulier naar WhatsApp');
{
  const toon = async (db) => {
    const token = await mintToken();
    const env = { DB: d1(db, await hashToken(token)) };
    const request = new Request('https://visuails.com/account/orders', {
      headers: { cookie: `vis_account=${token}`, 'accept-language': 'nl' },
    });
    const res = await accountGet({ request, env, waitUntil() {} });
    return await res.text();
  };

  /* PER BESTELLING GETELD EN NIET OVER DE HELE PAGINA. Dit scherm toont álle
     bestellingen van de klant onder elkaar, en bestelling 92 heeft zijn eigen
     ronde nog. `name="bad"` ergens op de pagina zoeken vond dus die van 92 en
     meldde dat de vinkjes van 91 er nog stonden — een toets die de verkeerde
     bestelling las. Vandaar `form="rr91"`: dat attribuut zegt bij WELKE ronde
     een vinkje hoort, en dat is precies de vraag. */
  const vinkjes = (html, id) => (html.match(new RegExp(`form="rr${id}"`, 'g')) || []).length;

  const voor = await toon(bouwDb());
  check('vooraf staat het rondeformulier er', /id="rr91"/.test(voor), true);
  check('met een vinkje bij elk openstaand beeld van 91', vinkjes(voor, 91), 3);
  check('en nog geen WhatsApp-link', /wa\.me/.test(voor.split('id="rr91"')[1] || ''), false);

  const na = await toon(bouwDb({ roundAt: '2026-08-24 10:00:00' }));
  check('daarna is het formulier weg', /id="rr91"/.test(na), false);
  check('en zijn de vinkjes van 91 weg', vinkjes(na, 91), 0);
  check('en staat er een WhatsApp-link', /wa\.me/.test(na), true);
  /* En de ANDERE bestelling houdt zijn eigen ronde. Eén ronde per bestelling is
     niet één ronde per klant — zie de noot in migrations/0034-revisieronde.sql
     over waarom dit op `orders` staat en niet op `customers`. */
  check('en bestelling 92 houdt zijn eigen ronde', /id="rr92"/.test(na), true);
}

/* ══ 5 · DE TWEE SCHERMEN KUNNEN NIET UIT ELKAAR LOPEN ══════════════════════
 *
 * portal.js en account.js hebben allebei hun eigen handler, en dat is niet te
 * vermijden: de een kent de bestelling uit een token, de ander uit een formulier.
 * Precies deze constructie liep in dit project al twee keer uit elkaar — het
 * duidelijkst bij `revision_requests`, waar de helft van de verzoeken niet in de
 * revisielijst terechtkwam omdat één van de twee die rij niet schreef.
 *
 * Dus wordt de BRON naast elkaar gelegd op de dingen die gelijk moeten zijn.
 * Niet op de schrijfwijze — dat toetst opmaak — maar op de vier feiten waar het
 * misgaat als er één ontbreekt.
 */
console.log('\nhet portaal en het dashboard doen hetzelfde');
{
  const portal = read('src/lib/portal.js');
  const account = read('src/lib/account.js');

  for (const [naam, bron] of [['portal.js', portal], ['account.js', account]]) {
    check(`${naam} vraagt het aan de gedeelde poort`, bron.includes('canRequestRevisionRound('), true);
    check(`${naam} schrijft ook revision_requests`, bron.includes('INSERT INTO revision_requests'), true);
    check(`${naam} zet de grendel in de UPDATE`, /revision_round_at\s*=\s*datetime\('now'\)[\s\S]{0,240}?WHERE id = \?1 AND revision_round_at IS NULL/.test(bron), true);
    check(`${naam} meldt de ronde als één partij`, /notifyRevision\([\s\S]{0,160}?round:\s*true/.test(bron), true);
    /* En de oude, onbeperkte weg staat op geen van beide nog open. */
    check(`${naam} accepteert 'revise' niet meer`, /'approve',\s*'revise'/.test(bron), false);
  }
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
process.exit(fail ? 1 : 0);
