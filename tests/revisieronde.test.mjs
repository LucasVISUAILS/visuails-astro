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
import { portalGet } from '../src/lib/portal.js';
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
          /* ── DEZE SCHIL WERPT, ZOALS D1 WERPT — 24 augustus 2026 ──────────
             Hier stond `catch { return null }` op alle drie. Dat leek onschuldig
             en maakte deel 6 hieronder waardeloos: de terugval in loadOrder()
             hangt aan een worp, en een schil die worpen opeet laat elke
             foutafhandeling groen staan zonder hem ooit te draaien. Gemeten:
             /o/<token> gaf 404 in plaats van de 200 die de echte code geeft,
             omdat de query stilletjes null teruggaf in plaats van te klagen.

             Een testschil mag simpeler zijn dan het echte ding. Hij mag niet
             VRIENDELIJKER zijn — dan toetst hij een wereld die niet bestaat. */
          return uitvoeren(sql, st._b)[0] ?? null;
        },
        async all() {
          return { results: uitvoeren(sql, st._b) };
        },
        async run() { uitvoeren(sql, st._b); return {}; },
      };
      return st;
    },
    async batch(stmts) {
      for (const st of stmts) uitvoeren(st.sql, st._b);
      return [];
    },
  };
}

/* ── HET FORMULIER EN DE HANDLER MOETEN DEZELFDE NAAM GEBRUIKEN ─────────────
 *
 * Twee schermen dragen de revisieronde en ze doen het elk met een eigen
 * veldnaam: het dashboard op `file`, het gemailde portaal op `bad`. Dat mag —
 * ze staan los van elkaar — maar BINNEN één bestand moeten het vakje en de
 * lezer het eens zijn. Zijn ze dat niet, dan levert de klant een ronde in, ziet
 * hij een omleiding, en is er niets vastgelegd. Er komt geen foutmelding.
 *
 * Vandaar dat de naam hier uit de bron wordt gelezen en niet in deze toets
 * staat: dit is meteen de controle dat de twee helften bij elkaar horen. */
const VELDNAAM = (() => {
  /* ── ANKEREN OP HET RONDEFORMULIER, NIET OP DE EERSTE CHECKBOX ────────────
     De eerste versie hiervan pakte `<input type="checkbox" … name="…">` en
     `form.getAll('…')` allebei als EERSTE treffer in het bestand. In account.js
     is dat twee keer `channels` — het vinkje uit de merkkit — en die twee waren
     het toevallig met elkaar eens. De controle stond dus op groen terwijl hij
     naar het verkeerde paar keek, en de ronde-invoer bleef fout.

     Nu wordt er geankerd op wat de ronde ECHT bindt: het `form`-attribuut van
     het vakje (`ronde-<id>` op het dashboard, `rr` in het gemailde portaal) en
     de getAll BINNEN de rondehandler. Twee ankers die er alleen zijn omdat de
     revisieronde bestaat. */
  const uit = {};
  const BRON = {
    account: { pad: 'src/lib/account.js', form: /form="ronde-\$\{[^}]*\}"[^>]*name="([a-z]+)"/,
               handler: /async function handleRevisionRound[\s\S]{0,900}?form\.getAll\('([a-z]+)'\)/ },
    portaal: { pad: 'src/lib/portal.js', form: /form="rr"[^>]*name="([a-z]+)"/,
               handler: /form\.getAll\('([a-z]+)'\)/ },
  };
  for (const [wie, b] of Object.entries(BRON)) {
    const src = read(b.pad);
    const vakje = b.form.exec(src);
    const lezer = b.handler.exec(src);
    check(`${wie}: het vakje van de ronde is gevonden`, Boolean(vakje), true);
    check(`${wie}: de handler van de ronde is gevonden`, Boolean(lezer), true);
    check(`${wie}: het vakje en de handler gebruiken dezelfde veldnaam`,
          vakje && lezer ? `${vakje[1]} / ${lezer[1]}` : 'niet gevonden',
          vakje && lezer ? `${vakje[1]} / ${vakje[1]}` : 'gevonden');
    uit[wie] = vakje && vakje[1];
  }
  return uit;
})();

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
const db91 = (db) => db.prepare('SELECT closed_at FROM orders WHERE id = 91').get();

/* ══ 2 · DE RONDE WORDT INGEDIEND, ÉÉN KEER ═════════════════════════════════ */
console.log('\néén ronde wordt aangenomen en vastgelegd');
{
  const db = bouwDb();
  const params = new URLSearchParams();
  params.append('action', 'round');
  params.append('order', '91');
  /* ── EEN NOTITIE PER BEELD — 26 augustus 2026 ────────────────────────────
     Het dashboard vraagt sinds de laatste ronde per AANGEVINKT BEELD wat eraan
     schort, in `note-<id>`, en stuurt de hele ronde terug met `?ronde=notitie`
     zodra er één ontbreekt. Deze toets stuurde één `note` voor de hele ronde —
     de oude vorm — en zag daardoor een dashboard dat het gewoon deed voor een
     kapot dashboard aan. De reden staat bij handleRevisionRound(): een vinkje
     zonder tekst zegt "er is iets mis" en niet WAT, en dan wordt de ronde alsnog
     een telefoongesprek. */
  params.append('note', 'De kleur van het jasje klopt op geen van deze.');
  params.append('note-1', 'De kleur van het jasje klopt op geen van deze.');
  params.append('note-3', 'De kleur van het jasje klopt op geen van deze.');
  /* ── DE VELDNAAM WORDT GELEZEN EN NIET GETYPT — 26 augustus 2026 ─────────
     Hier stond `bad`, en dat is de naam die het GEMAILDE portaal gebruikt.
     src/lib/account.js is intussen op `file` overgegaan, en deze toets bleef
     `bad` posten: de handler kreeg een lege ronde binnen, stuurde terug met
     `?ronde=leeg`, en drie controles gingen rood op een dashboard dat het gewoon
     deed. Een toets die zijn eigen invoer verzint, toetst de helft die hij zelf
     heeft ingevuld — zie de kop van tests/nazicht.test.mjs.

     De naam komt nu uit de bron. Verandert hij nog eens, dan verandert deze
     toets mee in plaats van rood te gaan. */
  for (const id of ['1', '3']) params.append(VELDNAAM.account, id);
  const r = await ronde(db, params);

  /* De omleiding is `?ronde=verstuurd` geworden; hij was `#order-91`. Het scherm
     leest die parameter en zet er een bevestiging bij — zie de vier uitkomsten
     bij `ronde=` in account.js. */
  check('hij stuurt terug met een bevestiging', r.location, '/account/orders?ronde=verstuurd');
  check('de aangevinkte beelden staan op revisie', staten(db),
    ['1:revision_requested', '2:pending', '3:revision_requested', '4:approved', '5:pending', '6:pending']);
  check('er staan twee verzoeken in het logboek', verzoeken(db).length, 2);
  check('met de notitie van de klant', verzoeken(db)[0].note, 'De kleur van het jasje klopt op geen van deze.');

  const s = stand(db);
  check('de ronde is gestempeld', Boolean(s.revision_round_at), true);
  /* ── HET DASHBOARD VULT DE TWEE SAMENVATTINGSKOLOMMEN — sinds 4 september 2026
     Tot dan schreef alleen het GEMAILDE portaal `revision_round_note` en
     `revision_round_count`; het dashboard zette alleen de stempel, en /admin
     toonde bij een ronde uit Studio "Geen toelichting achtergelaten" terwijl de
     klant per beeld wél iets had opgeschreven. Nu staan beide gevuld: de telling
     en de (ontdubbelde) notities. Per beeld blijft alles in revision_requests. */
  check('het dashboard telt de beelden van de ronde', s.revision_round_count, 2);
  check('en zet de notitie op de bestelling (één keer, want twee keer dezelfde)',
    s.revision_round_note, 'De kleur van het jasje klopt op geen van deze.');

  /* ── EN DE TWEEDE RONDE WORDT GEWEIGERD ──────────────────────────────────
     Dit is de hele reden dat dit bestand bestaat. Niets mag er nog veranderen:
     geen beeld erbij, geen verzoek erbij, en de stempel blijft die van de eerste. */
  const eerste = s.revision_round_at;
  const tweede = new URLSearchParams();
  tweede.append('action', 'round');
  tweede.append('order', '91');
  tweede.append('note', 'En deze ook nog.');
  tweede.append(VELDNAAM.account, '2');
  tweede.append('note-2', 'En deze ook nog.');
  await ronde(db, tweede);

  check('een tweede ronde raakt geen enkel beeld', staten(db),
    ['1:revision_requested', '2:pending', '3:revision_requested', '4:approved', '5:pending', '6:pending']);
  check('en schrijft geen verzoek bij', verzoeken(db).length, 2);
  check('en laat de eerste stempel staan', stand(db).revision_round_at, eerste);
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
  p.append(VELDNAAM.account, '2');
  p.append(`note-2`, 'Iets klopt niet.');   // geldig
  p.append(VELDNAAM.account, '4');
  p.append(`note-4`, 'Iets klopt niet.');   // al goedgekeurd
  p.append(VELDNAAM.account, '5');
  p.append(`note-5`, 'Iets klopt niet.');   // vervangen
  p.append(VELDNAAM.account, '6');
  p.append(`note-6`, 'Iets klopt niet.');   // andere bestelling
  await ronde(db, p);

  /* ── ALLES OF NIETS — sinds 25 augustus 2026 ──────────────────────────────
     Hier stond dat het geldige beeld wél werd aangemerkt en het onbekende niet.
     handleRevisionRound() doet dat niet meer: *"Eén beeld dat niet van deze
     klant is, of niet meer leeft, maakt de hele verzending ongeldig. Niet 'de
     rest wel even': de klant heeft vijf beelden aangewezen en verwacht dat er
     vijf worden bekeken."* Dat is een betere regel — half uitvoeren is de
     variant waarin de klant denkt dat hij vijf beelden heeft ingediend en er
     vier krijgt — en de ronde blijft ONGEBRUIKT, dus hij kan het opnieuw doen. */
  check('een onbekend beeld maakt de hele ronde ongeldig', staten(db),
    ['1:pending', '2:pending', '3:pending', '4:approved', '5:pending', '6:pending']);
  check('en de ronde is niet verbruikt', stand(db).revision_round_at, null);
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
    p.append(VELDNAAM.account, '1');
    p.append(`note-1`, 'Iets klopt niet.');
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
  /* ── ÉÉN BESTELLING OPEN TEGELIJK — 27 augustus 2026 ─────────────────────
   *
   * /account/orders toonde ALLE bestellingen als uitklapkaarten onder elkaar.
   * Sinds het herontwerp staat er een tabel met elke bestelling als rij, en
   * daaronder de ene bestelling die openstaat — welke dat is komt uit `?order=`
   * en anders uit "wat vraagt iets van de klant".
   *
   * Deze toets moet daarom ZEGGEN welke bestelling hij bekijkt. Dat maakt hem
   * bovendien scherper dan hij was: "staat het formulier van 91 ergens op de
   * pagina" werd waar zolang íéts het renderde, terwijl de vraag is of 91 zijn
   * eigen ronde heeft en 92 de zijne. Nu wordt dat per bestelling gevraagd, wat
   * dezelfde correctie is als de noot hieronder over `form="ronde-<id>"`. */
  const toon = async (db, orderId = 91) => {
    const token = await mintToken();
    const env = { DB: d1(db, await hashToken(token)) };
    const request = new Request(`https://visuails.com/account/orders?order=${orderId}`, {
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
  /* Het formulier heet sinds de laatste ronde `ronde-<id>` en niet meer `rr<id>`.
     Zelfde bedoeling: het attribuut zegt bij WELKE bestelling een vinkje hoort,
     zodat de telling van 91 niet die van 92 meepakt. */
  const vinkjes = (html, id) =>
    (html.match(new RegExp(`<input type="checkbox" form="ronde-${id}"`, 'g')) || []).length;

  const voor = await toon(bouwDb());
  check('vooraf staat het rondeformulier er', /id="ronde-91"/.test(voor), true);
  check('met een vinkje bij elk openstaand beeld van 91', vinkjes(voor, 91), 3);
  check('en nog geen WhatsApp-link', /wa\.me/.test(voor.split('id="rr91"')[1] || ''), false);

  const na = await toon(bouwDb({ roundAt: '2026-08-24 10:00:00' }));
  check('daarna is het formulier weg', /id="ronde-91"/.test(na), false);
  check('en zijn de vinkjes van 91 weg', vinkjes(na, 91), 0);
  check('en staat er een WhatsApp-link', /wa\.me/.test(na), true);
  /* En de ANDERE bestelling houdt zijn eigen ronde. Eén ronde per bestelling is
     niet één ronde per klant — zie de noot in migrations/0034-revisieronde.sql
     over waarom dit op `orders` staat en niet op `customers`. */
  /* En de ANDERE bestelling houdt zijn eigen ronde: 92 opengeklapt heeft er wél
     een terwijl die van 91 gebruikt is. Eén ronde per bestelling is niet één
     ronde per klant. */
  const na92 = await toon(bouwDb({ roundAt: '2026-08-24 10:00:00' }), 92);
  check('en bestelling 92 houdt zijn eigen ronde', /id="ronde-92"/.test(na92), true);
  check('en die van 91 is daar niet te vinden', /id="ronde-91"/.test(na92), false);

  /* De tabel noemt ze allebei, ook al staat er één open. Dat is wat de tabel
     komt doen: zonder hem zou een klant met twee leveringen er één kwijt zijn. */
  check('de tabel noemt beide bestellingen', /VIS-2026-0091/.test(na) && /VIS-2026-0092/.test(na), true);

  /* ══ 4b · "ALLES GOED" PER PRODUCT — 4 september 2026 (doorlichting §3.6) ═══
   *
   * Vier keer op Goedkeuren drukken voor een product dat gewoon klopt, was de
   * zwaarte van de beoordeling. Eén knop onder de tegels keurt alle openstaande
   * beelden van dat product goed. Hij staat er alleen als er meer dan één te
   * keuren is, en hij raakt niets anders: geen goedgekeurd beeld, geen vervangen
   * beeld, geen beeld van een andere bestelling, en niets op een gesloten
   * bestelling. Aanmerken blijft per beeld, dus het rondeformulier blijft staan. */
  const knop = (html) => (html.match(/value="approve-product"/g) || []).length;
  check('de knop "alles goed" staat bij het product met drie open beelden', knop(voor), 1);
  check('en noemt hoeveel het er zijn', /Alle 3 zijn goed/.test(voor), true);
  /* Bestelling 91 staat óók op deze pagina (hij vraagt iets van de klant), dus
     de knop wordt binnen de KAART van 92 geteld en niet over de hele pagina. */
  const een = await toon(bouwDb(), 92);
  const kaart92 = (een.split('id="order-92"')[1] || '').split('id="order-')[0];
  check('bij één open beeld staat hij er niet — daar is Goedkeuren genoeg', knop(kaart92), 0);
  check('(de kaart van 92 is wel gevonden)', kaart92.length > 0, true);

  const dbAlles = bouwDb();
  const rAlles = await ronde(dbAlles, [['action', 'approve-product'], ['order', '91'], ['product', 'p1']]);
  check('de POST keert terug naar de bestelling', rAlles.location, '/account/orders#order-91');
  check('de drie open beelden van p1 zijn goedgekeurd, de rest niet geraakt', staten(dbAlles),
    ['1:approved', '2:approved', '3:approved', '4:approved', '5:pending', '6:pending']);
  check('en de bestelling is daarmee afgerond', Boolean(db91(dbAlles).closed_at), true);
  check('de ronde is niet verbruikt — aanmerken kon nog steeds', stand(dbAlles).revision_round_at, null);

  const dbDicht = bouwDb({ closed: '2026-08-20' });
  await ronde(dbDicht, [['action', 'approve-product'], ['order', '91'], ['product', 'p1']]);
  check('op een gesloten bestelling gebeurt er niets', staten(dbDicht).filter((x) => x.endsWith(':approved')).length, 1);

  const dbAnder = bouwDb({ ownerId: 8 });
  await ronde(dbAnder, [['action', 'approve-product'], ['order', '91'], ['product', 'p1']]);
  check('en op de bestelling van een ander ook niet', staten(dbAnder).filter((x) => x.endsWith(':approved')).length, 1);

  const dbVreemd = bouwDb();
  await ronde(dbVreemd, [['action', 'approve-product'], ['order', '91'], ['product', "p1' OR 1=1 --"]]);
  check('een productsleutel die geen sleutel is, wordt geweigerd', staten(dbVreemd).filter((x) => x.endsWith(':approved')).length, 1);
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
    /* ── ÉÉN BERICHT PER RONDE, HOE HET OOK HEET — 26 augustus 2026 ────────
       Deze eis stond als `notifyRevision(… round: true)` en pinde daarmee de
       AANROEPVORM. account.js is overgegaan op een eigen `notifyRevisionRound()`,
       wat schoner is: een ronde is geen revisie met een vlaggetje. De toets ging
       rood op de betere versie. Wat hij bewaakt is dat er ÉÉN melding per ronde
       uitgaat en niet één per beeld — de studio moet niet vijf mails krijgen
       voor één verzoek. Beide vormen voldoen daaraan. */
    check(`${naam} meldt de ronde als één partij`,
          /notifyRevisionRound\(/.test(bron) || /notifyRevision\([\s\S]{0,160}?round:\s*true/.test(bron), true);
    /* En de oude, onbeperkte weg staat op geen van beide nog open. */
    check(`${naam} accepteert 'revise' niet meer`, /'approve',\s*'revise'/.test(bron), false);
  }
}

/* ══ 6 · EN ZONDER MIGRATIE 0034 BLIJFT DE SITE OVEREIND ═══════════════════
 *
 * DIT IS EEN GEMETEN STORING EN GEEN VOORZORG. Op 24 augustus 2026 werd deze
 * ronde uitgerold zonder `npm run migrate` te draaien. Wat er toen gebeurde,
 * nagemeten op een database zonder de drie kolommen:
 *
 *   /account/orders   HTTP 200 — de terugval uit 0013/0015 ving het op
 *   /o/<token>        HTTP 503 — de gemailde klantlink gaf een storingspagina
 *   /admin            viel om op de revisie-inbox, die vooraan in de Promise.all
 *                     staat die het hele dashboard opbouwt
 *
 * De vergeten migratie is niet de fout die hier getoetst wordt. Die hoort een
 * keer te gebeuren — dat is precies waarom account.js die terugval al drie
 * migraties lang heeft. De fout is dat dezelfde bescherming op de ene plek stond
 * en op de andere niet, en uitgerekend niet op het enige adres dat een klant
 * ZONDER account heeft.
 *
 * ── WAT ER GEMETEN WORDT ───────────────────────────────────────────────────
 *
 * Het schema van vandaag MINUS het 0034-blok, en dan de echte handlers erop. Niet
 * "staat er een try/catch in het bestand" — dat toetst de schrijfwijze en zou
 * groen blijven bij een catch die het verkeerde opvangt.
 *
 * De splitsing gebeurt op de kop van het blok in schema.sql. Wordt die hernoemd,
 * dan valt deze toets om op zijn eigen aanname in plaats van stilletjes het hele
 * schema te draaien en niets te bewijzen — vandaar de controle op nul kolommen.
 */
console.log('\nzonder migratie 0034 blijft elk scherm overeind');
{
  const vol = read('schema.sql');
  const merk = '-- 0034 · ÉÉN REVISIERONDE PER BESTELLING';
  check('het 0034-blok is te vinden in schema.sql', vol.includes(merk), true);

  const db = new DatabaseSync(':memory:');
  db.exec(vol.split(merk)[0].replace(/-- ═+\n$/, ''));
  const kolommen = db.prepare('PRAGMA table_info(orders)').all()
    .filter((c) => c.name.startsWith('revision_round')).length;
  check('en die database heeft de drie kolommen dus niet', kolommen, 0);

  db.prepare('INSERT INTO customers (id, email, name, brand) VALUES (?,?,?,?)')
    .run(KLANT, 'studio@voorbeeld.nl', 'Mara', 'VOLT');
  db.prepare(`INSERT INTO orders (id, ref, email, customer_id, service, status, tier, product_count, lang, created_at)
              VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run(91, 'VIS-2026-0091', 'studio@voorbeeld.nl', KLANT, 'catalog', 'delivered', 'attended', 3, 'nl', '2026-08-01');
  db.prepare(`INSERT INTO files (id, order_id, kind, r2_key, filename, bytes, review_state, product_key, shot)
              VALUES (1, 91, 'delivery', 'k1', 'b1.jpg', 1000, 'pending', 'p1', 'front')`).run();

  const token = await mintToken();
  const hash = await hashToken(token);
  const ptok = await mintToken();
  db.prepare('INSERT INTO order_tokens (id, order_id, token_hash, expires_at) VALUES (1, 91, ?, ?)')
    .run(await hashToken(ptok), '2099-01-01');

  const env = { DB: d1(db, hash) };

  const dash = await accountGet({
    request: new Request('https://visuails.com/account/orders', {
      headers: { cookie: `vis_account=${token}`, 'accept-language': 'nl' },
    }),
    env, waitUntil() {},
  });
  check('/account/orders geeft nog steeds 200', dash.status, 200);

  const poort = await portalGet({
    request: new Request(`https://visuails.com/o/${ptok}`, { headers: { 'accept-language': 'nl' } }),
    env, waitUntil() {},
  });
  check('/o/<token> geeft 200 en geen 503', poort.status, 200);
  const html = await poort.text();
  check('  en toont echt de bestelling', html.includes('VIS-2026-0091'), true);

  /* De inbox van het beheerscherm, rechtstreeks: hij staat vooraan in de
     Promise.all die /admin opbouwt, dus een worp hier neemt het hele dashboard
     mee. Een lege lijst is het goede antwoord; een worp niet. */
  const { loadRevisionInboxVoorTest } = await import('../src/lib/admin.js').catch(() => ({}));
  if (typeof loadRevisionInboxVoorTest === 'function') {
    let wierp = false;
    try { await loadRevisionInboxVoorTest(env); } catch { wierp = true; }
    check('de revisie-inbox werpt niet', wierp, false);
  }
}


/* ══ 6 · DE NAKIJKSTAP ═══════════════════════════════════════════════════════
 *
 * POST /account/orders/<id>/ronde, sinds 27 augustus 2026. Een POST die HTML
 * teruggeeft in plaats van om te leiden: hetzelfde formulier, één keer door de
 * server heen, met uitgeschreven wat erin staat.
 *
 * Waarom hij een toets verdient: hij is de enige plek waar de klant leest WAT
 * hij verstuurt bij de handeling die hij niet kan terugdraaien, en hij stelt
 * dezelfde eisen als handleRevisionRound() nog een keer. Twee keer dezelfde
 * vraag is hier de bedoeling — deze pagina mag niets tonen wat de verzendstap
 * zou weigeren — en dus moeten beide keren dezelfde uitkomst geven.
 *
 * En het belangrijkste: er wordt NIETS opgeslagen. Een tussenstap die stiekem
 * een halve ronde vastlegt, is een tussenstap die je niet kunt wegklikken.
 */
console.log('\nde nakijkstap toont wat je verstuurt en legt niets vast');
{
  const nakijken = async (db, velden, orderId = 91) => {
    const token = await mintToken();
    const env = { DB: d1(db, await hashToken(token)), RESEND_API_KEY: '', NOTIFY_EMAIL: '' };
    const body = new URLSearchParams();
    for (const [k, v] of velden) body.append(k, v);
    const request = new Request(`https://visuails.com/account/orders/${orderId}/ronde`, {
      method: 'POST', body,
      headers: { cookie: `vis_account=${token}`, origin: 'https://visuails.com', 'accept-language': 'nl',
                 'content-type': 'application/x-www-form-urlencoded' },
    });
    const res = await accountPost({ request, env, waitUntil() {} });
    return { status: res.status, location: res.headers.get('location'), html: await res.text() };
  };

  {
    const db = bouwDb();
    const r = await nakijken(db, [['file', '1'], ['file', '2'], ['file', '3']]);
    check('drie aangevinkte beelden geven een pagina', r.status, 200);
    check('en die noemt ze alle drie',
      ['name="note-1"', 'name="note-2"', 'name="note-3"'].every((n) => r.html.includes(n)), true);
    check('met een verborgen veld per beeld, zodat de verzendstap ze terugkrijgt',
      (r.html.match(/name="file" value="[123]"/g) || []).length, 3);
    check('het formulier post naar de verzendroute', /action="\/account\/review"/.test(r.html), true);
    check('en draagt action=round mee', /name="action" value="round"/.test(r.html), true);
    check('de teller noemt het aantal', /3 beelden aangemerkt/.test(r.html), true);
    /* DIT IS DE KERN. Wie deze pagina wegklikt, heeft niets gebruikt. */
    check('er is niets aan de bestelling veranderd', stand(db).revision_round_at, null);
    check('en geen enkel beeld is aangemerkt',
      staten(db).filter((x) => x.includes('revision_requested')).length, 0);
    check('en er staat niets in revision_requests', verzoeken(db).length, 0);
  }

  {
    const db = bouwDb();
    const r = await nakijken(db, []);
    check('niets aangevinkt gaat terug met ronde=leeg', /ronde=leeg/.test(r.location || ''), true);
    check('en verbruikt de ronde niet', stand(db).revision_round_at, null);
  }

  {
    const db = bouwDb();
    /* Beeld 6 hoort bij bestelling 92. Wie dat id in de POST van 91 stopt, mag
       geen pagina krijgen die doet alsof het erbij hoort. */
    const r = await nakijken(db, [['file', '1'], ['file', '6']]);
    check('een beeld van een andere bestelling wordt geweigerd', /ronde=mislukt/.test(r.location || ''), true);
  }

  {
    const db = bouwDb();
    /* Beeld 5 is superseded, beeld 4 is al goedgekeurd. Allebei mogen ze niet in
       een ronde belanden — dezelfde levendheidseis als de verzendstap. */
    const r = await nakijken(db, [['file', '1'], ['file', '5']]);
    check('een vervangen beeld wordt geweigerd', /ronde=mislukt/.test(r.location || ''), true);
  }

  {
    const db = bouwDb({ roundAt: '2026-08-24 10:00:00' });
    const r = await nakijken(db, [['file', '1']]);
    check('een gebruikte ronde geeft geen nakijkpagina', r.status, 303);
    check('en stuurt terug naar de bestelling', /order=91/.test(r.location || ''), true);
  }

  {
    const db = bouwDb({ revoked: '2026-08-01' });
    const r = await nakijken(db, [['file', '1']]);
    check('een ingetrokken recht geeft geen nakijkpagina', r.status, 303);
  }

  {
    /* Terugnemen zonder script: dezelfde lijst opnieuw gepost met één id als
       `drop`. De pagina komt terug zonder dat beeld, en nog steeds zonder dat er
       iets is vastgelegd. */
    const db = bouwDb();
    const r = await nakijken(db, [['file', '1'], ['file', '2'], ['file', '3'], ['drop', '2']]);
    check('een teruggenomen beeld valt uit de lijst', r.html.includes('name="note-2"'), false);
    check('en de andere twee blijven staan',
      r.html.includes('name="note-1"') && r.html.includes('name="note-3"'), true);
    check('de teller telt mee', /2 beelden aangemerkt/.test(r.html), true);
    check('en ook hier is niets vastgelegd', stand(db).revision_round_at, null);
  }

  {
    /* Alles terugnemen is hetzelfde als niets aanvinken. */
    const db = bouwDb();
    const r = await nakijken(db, [['file', '1'], ['drop', '1']]);
    check('het laatste beeld terugnemen gaat terug met ronde=leeg', /ronde=leeg/.test(r.location || ''), true);
  }

  {
    /* EN DE HELE WEG, VAN VINKJE TOT RIJ. De nakijkpagina geeft velden terug; die
       velden gaan naar de verzendstap; die legt vast. Als die twee uit elkaar
       lopen, staat de klant voor een scherm dat iets anders verstuurt dan het
       laat zien — precies wat deze stap moest wegnemen. */
    const db = bouwDb();
    const kijk = await nakijken(db, [['file', '1'], ['file', '2']]);
    const ids = [...kijk.html.matchAll(/name="file" value="(\d+)"/g)].map((m) => m[1]);
    const p = new URLSearchParams();
    p.append('action', 'round');
    for (const id of ids) { p.append('file', id); p.append(`note-${id}`, `Notitie voor ${id}.`); }
    await ronde(db, p);
    check('wat de nakijkpagina teruggaf, is precies wat er is vastgelegd',
      verzoeken(db).map((r) => r.file_id), [1, 2]);
    check('met de notities die erbij getypt zijn',
      verzoeken(db).map((r) => r.note), ['Notitie voor 1.', 'Notitie voor 2.']);
    check('en de ronde is nu op', Boolean(stand(db).revision_round_at), true);
  }
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
process.exit(fail ? 1 : 0);
