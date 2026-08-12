/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE TRECHTER — DE ENIGE MEETPUNTEN OP HET DUURSTE FORMULIER VAN DE SITE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * /start is één pagina met vijf stappen die met JavaScript wisselen. Web Analytics
 * meet paginabezoeken en zag dus van vier van die vijf stappen niets: bekend was wie
 * een bestelling AFMAAKTE, niet wie op stap 3 wegliep. Adverteren naar zo'n formulier
 * is het budget uitgeven om niets te leren.
 *
 * Deze test draait het ECHTE endpoint (functions/api/step.js) tegen het ECHTE
 * schema.sql, met D1 op node:sqlite. Niet een kopie van de query, want dan test je je
 * kopie — en dit endpoint schrijft in een tabel die openbaar bereikbaar is.
 *
 * DE VIER VRAGEN, en de laatste twee zijn de eigenlijke reden dat dit bestand bestaat:
 *
 *   1 · WORDT ER GETELD, en telt een tweede bericht op bij het eerste in plaats van
 *       een tweede rij te maken.
 *   2 · GAAT HET FORMULIER NOOIT OMVER. Geen tabel, geen binding, geen leesbaar
 *       lichaam: altijd 204, nooit een fout die de bezoeker raakt.
 *   3 · IS DE TABEL BEGRENSD. Dit is een openbaar endpoint dat schrijft. Zonder de
 *       controle op stap, dienst en taal kan iemand met een script willekeurige
 *       waarden posten, en dan is de sleutel onbegrensd en groeit de tabel zonder
 *       plafond. Dát is het verschil tussen "de getallen zijn te vervuilen" (dat is
 *       de prijs van meten zonder identificatie) en "de tabel is te vullen" (dat is
 *       een rekening).
 *   4 · BLIJFT DE DIENSTENLIJST GELIJK aan die van de bestelroute. FLOWS hier en
 *       ORDER_SERVICES in functions/api/order.js zijn twee handgehouden kopieën van
 *       dezelfde verzameling. Lopen ze uit elkaar, dan verdwijnt een hele dienst
 *       stilletjes uit de meting — de trechter blijft dan groen en leeg.
 */
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { onRequestPost } from '../functions/api/step.js';
import { adminGet } from '../src/lib/admin.js';
import { mintToken, hashToken } from '../src/lib/token.js';

let pass = 0;
let fail = 0;
function ok(name, got, want = true, shown) {
  const good = got === want;
  if (good) pass++; else fail++;
  const label = good ? ' ok  ' : ' FAIL';
  console.log(`${label} ${name.padEnd(60)}${good ? '' : `expected ${JSON.stringify(want)} got ${JSON.stringify(shown ?? got)}`}`);
}

function fresh({ noTable = false } = {}) {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
  if (noTable) db.exec('DROP TABLE funnel_hits');
  return db;
}

/* D1 op node:sqlite. `rate_limits` staat in schema.sql, dus checkRate() draait hier
 * ECHT en niet nagebootst — inclusief het zout uit app_settings en de upsert met
 * RETURNING. Dat is de bedoeling: de limiet is onderdeel van wat dit endpoint doet. */
function d1(db) {
  return {
    prepare(sql) {
      const st = {
        _a: [],
        bind(...a) { st._a = a; return st; },
        async all() { return { results: db.prepare(sql).all(...st._a) }; },
        async run() { return { success: true, meta: db.prepare(sql).run(...st._a) }; },
        async first() { return db.prepare(sql).get(...st._a) ?? null; },
      };
      return st;
    },
  };
}

const post = (db, fields, { ip = '198.51.100.7' } = {}) => {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(fields)) body.append(k, String(v));
  return onRequestPost({
    request: new Request('https://visuails.com/api/step', {
      method: 'POST', body, headers: { 'CF-Connecting-IP': ip },
    }),
    env: db ? { DB: d1(db) } : {},
    waitUntil: () => {},
  });
};

const rows = (db) => db.prepare('SELECT day, flow, lang, step, hits FROM funnel_hits ORDER BY step').all();
const count = (db) => db.prepare('SELECT COUNT(*) AS n FROM funnel_hits').get().n;

console.log('\nVISUAILS — de trechter\n');

console.log('er wordt geteld');
{
  const db = fresh();
  const res = await post(db, { step: 1, flow: 'drop', lang: 'nl' });
  ok('het antwoord is 204', res.status, 204);
  ok('en er staat één rij', count(db), 1);
  const r = rows(db)[0];
  ok('met de goede stap', r.step, 1);
  ok('de goede dienst', r.flow, 'drop');
  ok('de goede taal', r.lang, 'nl');
  ok('en de dag van vandaag in UTC', r.day, new Date().toISOString().slice(0, 10));
}
{
  const db = fresh();
  await post(db, { step: 2, flow: 'catalog', lang: 'en' });
  await post(db, { step: 2, flow: 'catalog', lang: 'en' });
  await post(db, { step: 2, flow: 'catalog', lang: 'en' });
  /* Zonder de ON CONFLICT zou dit drie rijen zijn of een UNIQUE-fout. Dit is de check
   * die het verschil ziet tussen "opgeteld" en "opnieuw geprobeerd". */
  ok('drie berichten worden één rij met drie', count(db), 1);
  ok('en de teller staat op drie', rows(db)[0].hits, 3);
}
{
  const db = fresh();
  for (const step of [1, 2, 3, 4, 5]) await post(db, { step, flow: 'drop', lang: 'nl' });
  ok('vijf stappen zijn vijf rijen', count(db), 5);
  ok('en de stappen staan er allemaal', rows(db).map((r) => r.step).join(','), '1,2,3,4,5');
}
{
  /* Dezelfde stap in twee talen is twee rijen: de taal hoort bij de sleutel, want een
   * trechter die in één taal slechter loopt is een tekstprobleem. */
  const db = fresh();
  await post(db, { step: 1, flow: 'drop', lang: 'nl' });
  await post(db, { step: 1, flow: 'drop', lang: 'en' });
  ok('twee talen zijn twee rijen', count(db), 2);
}

console.log('\nde tabel blijft begrensd');
{
  const db = fresh();
  const weiger = async (fields, wat) => {
    const before = count(db);
    const res = await post(db, fields);
    ok(wat, `${res.status}/${count(db) - before}`, '204/0');
  };
  await weiger({ step: 0, flow: 'drop', lang: 'nl' }, 'stap 0 wordt niet geteld');
  await weiger({ step: 9, flow: 'drop', lang: 'nl' }, 'stap 9 ook niet');
  await weiger({ step: -1, flow: 'drop', lang: 'nl' }, 'een negatieve stap niet');
  await weiger({ step: 1.5, flow: 'drop', lang: 'nl' }, 'een halve stap niet');
  await weiger({ step: 'drie', flow: 'drop', lang: 'nl' }, 'tekst als stap niet');
  await weiger({ step: 1, flow: 'bestaat-niet', lang: 'nl' }, 'een onbekende dienst niet');
  await weiger({ step: 1, flow: '', lang: 'nl' }, 'een lege dienst niet');
  await weiger({ step: 1, flow: 'drop', lang: 'de' }, 'een taal die de site niet heeft niet');
  await weiger({ step: 1, flow: 'drop', lang: '' }, 'een lege taal niet');
  await weiger({ flow: 'drop', lang: 'nl' }, 'een bericht zonder stap niet');
  /* En de dag komt van de server. Een datum die de bezoeker meestuurt is een datum die
   * de bezoeker kiest, en dan staan er rijen voor dagen die nog niet bestaan. */
  const before = count(db);
  await post(db, { step: 1, flow: 'drop', lang: 'nl', day: '2099-01-01' });
  ok('een meegestuurde datum wordt genegeerd', count(db) - before, 1);
  ok('en de rij staat op vandaag',
    db.prepare("SELECT COUNT(*) AS n FROM funnel_hits WHERE day = '2099-01-01'").get().n, 0);
}

console.log('\nhet formulier gaat nooit omver');
{
  const db = fresh({ noTable: true });
  const res = await post(db, { step: 1, flow: 'drop', lang: 'nl' });
  ok('zonder migratie 0025 nog steeds 204', res.status, 204);
}
{
  const res = await post(null, { step: 1, flow: 'drop', lang: 'nl' });
  ok('zonder database ook 204', res.status, 204);
}
{
  /* Een lichaam dat geen formulier is. Dit is wat een verdwaalde crawler of een kapot
     bericht oplevert, en het mag geen 500 worden. */
  const res = await onRequestPost({
    request: new Request('https://visuails.com/api/step', {
      method: 'POST', body: 'niet-eens-een-formulier', headers: { 'content-type': 'application/json' },
    }),
    env: { DB: d1(fresh()) },
    waitUntil: () => {},
  });
  ok('een onleesbaar lichaam ook 204', res.status, 204);
}
{
  /* En een D1 die middenin omvalt. Hier is de lege catch juist — zie de noot in het
     endpoint over waarom dit het tegenovergestelde geval is van de weggeslikte
     statuswissel in admin.js: er hangt niets van de uitkomst af. */
  const kapot = {
    prepare() {
      return { bind() { return this; }, async run() { throw new Error('D1_ERROR: storing'); }, async first() { return null; }, async all() { throw new Error('D1_ERROR: storing'); } };
    },
  };
  const res = await onRequestPost({
    request: new Request('https://visuails.com/api/step', {
      method: 'POST', body: new URLSearchParams({ step: '1', flow: 'drop', lang: 'nl' }),
    }),
    env: { DB: kapot },
    waitUntil: () => {},
  });
  ok('een D1 die omvalt levert 204 en geen 500', res.status, 204);
}

console.log('\nde ratelimiet');
{
  /* 60 per tien minuten. Een mens stuurt vijf berichten; dit is de rem op een script.
     De limiet draait hier ECHT tegen rate_limits in schema.sql. */
  const db = fresh();
  for (let i = 0; i < 60; i++) await post(db, { step: 1, flow: 'drop', lang: 'nl' });
  const na60 = db.prepare("SELECT hits FROM funnel_hits WHERE step = 1").get().hits;
  ok('zestig berichten komen door', na60, 60);
  await post(db, { step: 1, flow: 'drop', lang: 'nl' });
  await post(db, { step: 1, flow: 'drop', lang: 'nl' });
  ok('en daarna wordt er niet meer geteld',
    db.prepare("SELECT hits FROM funnel_hits WHERE step = 1").get().hits, 60);
  /* Een ander ip staat in een eigen emmer — anders zou één script iedereen buitensluiten
     en meet je vanaf dat moment niemand meer. */
  await post(db, { step: 1, flow: 'catalog', lang: 'nl' }, { ip: '203.0.113.55' });
  ok('een ander ip meet gewoon door',
    db.prepare("SELECT hits FROM funnel_hits WHERE flow = 'catalog'").get().hits, 1);
}

console.log('\nde afspraken tussen bestanden');
{
  const src = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
  const step = src('../functions/api/step.js');
  const order = src('../functions/api/order.js');
  const pipeline = src('../src/scripts/pipeline.js');

  /* Vraag 4 uit de kop. Twee handgehouden kopieën van dezelfde verzameling; loopt er één
     achter, dan verdwijnt een dienst uit de meting zonder dat er iets rood wordt. */
  /* Met indexOf en niet met een regex uit een string: een patroon dat je in een
   * template opbouwt, is een patroon met twee lagen escapes, en de eerste versie
   * hiervan vond daardoor NIETS — waarna de vergelijking eronder groen stond omdat
   * null gelijk is aan null. Dat is dezelfde val als eerder in dit project: een check
   * die slaagt om de verkeerde reden. Vandaar dat het lezen nu apart wordt vastgesteld
   * én dat de vergelijking op een niet-lege tekst staat. */
  const setOf = (text, name) => {
    const at = text.indexOf(`${name} = new Set([`);
    if (at === -1) return null;
    const open = text.indexOf('[', at);
    const close = text.indexOf(']', open);
    if (open === -1 || close === -1) return null;
    return text.slice(open + 1, close)
      .split(',').map((x) => x.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean).sort().join(',');
  };
  const flows = setOf(step, 'FLOWS');
  const services = setOf(order, 'ORDER_SERVICES');
  ok('FLOWS is te lezen uit step.js', typeof flows === 'string' && flows.length > 0, true, flows);
  ok('ORDER_SERVICES is te lezen uit order.js', typeof services === 'string' && services.length > 0, true, services);
  ok('en het zijn er zes', (flows || '').split(',').length, 6, flows);
  ok('en ze zijn dezelfde verzameling', flows, services);

  /* De meting hangt aan show() en aan niets anders. Staat de aanroep er niet meer, dan
     is de trechter leeg en groen — en een leeg overzicht leest als "niemand begint aan
     een bestelling" in plaats van "er wordt niets gemeten". */
  ok('pipeline.js meet in show()', /  measure\(to\);/.test(pipeline));
  ok('en stuurt naar /api/step', pipeline.includes("'/api/step'"));
  /* Eén keer per stap per paginalading: zonder deze verzameling meet je twijfel. */
  ok('met een verzameling die dubbel tellen tegenhoudt', pipeline.includes('reached.has(step)'));
  ok('die bij elke init geleegd wordt', pipeline.includes('reached.clear()'));

  /* En stap 1 wordt ook geteld, want zonder stap 1 is er geen noemer en is elk
     percentage in het adminscherm een percentage van niets. */
  ok('init opent met show(1), dus stap 1 heeft een teller',
    /show\(1, \{ focus: false \}\)/.test(pipeline));

  /* GEEN GET. Een teller die met een GET te verhogen is, wordt verhoogd door elke
     linkvoorvertoning en elke crawler die de URL ergens tegenkomt. */
  ok('er is geen onRequestGet', /export async function onRequestGet/.test(step), false);

  /* En de tabel staat in beide plekken: schema.sql voor een verse database, de migratie
     voor de bestaande. Eén van de twee vergeten is hoe een verse en een live database
     stilletjes uit elkaar gaan lopen — schema.sql zegt dat zelf in zijn kop. */
  ok('funnel_hits staat in schema.sql', src('../schema.sql').includes('funnel_hits'));
  ok('en in migrations/0025-funnel.sql', src('../migrations/0025-funnel.sql').includes('funnel_hits'));
}

console.log('\nen het adminscherm zegt wat de getallen betekenen');
{
  /* Het scherm ECHT renderen, via adminGet, tegen dezelfde node:sqlite-database. Een
   * trechterpagina die niet rendert is een trechter die je niet hebt, en de twee dingen
   * die hier fout kunnen gaan zijn juist de dingen die je niet ziet aan de code: of de
   * percentages van de goede noemer komen, en of het scherm het zegt als de meting zelf
   * niet klopt (meer op stap 2 dan op stap 1). */
  const db = fresh();
  const token = await mintToken();
  db.prepare('INSERT INTO admin_users (id, email, password_hash) VALUES (1, ?, ?)')
    .run('lucas@example.com', 'x');
  db.prepare('INSERT INTO admin_sessions (admin_id, token_hash, expires_at) VALUES (1, ?, ?)')
    .run(await hashToken(token), new Date(Date.now() + 36e5).toISOString());

  const day = new Date().toISOString().slice(0, 10);
  const put = (step, hits) => db.prepare(
    'INSERT INTO funnel_hits (day, flow, lang, step, hits) VALUES (?, ?, ?, ?, ?)'
  ).run(day, 'drop', 'nl', step, hits);
  put(1, 100); put(2, 80); put(3, 40); put(4, 30); put(5, 25);

  const res = await adminGet({
    request: new Request('https://visuails.com/admin/funnel', { headers: { cookie: `vis_admin=${token}` } }),
    env: { DB: d1(db) },
    waitUntil() {},
  });
  ok('het scherm antwoordt met 200', res.status, 200);
  const page = await res.text();
  ok('en noemt zich de trechter', /Trechter/.test(page));
  /* De noemer is stap 1: 40 van 100 is 40%, en niet 40 van iets anders. */
  ok('40 op stap 3 is 40% van stap 1', page.includes('40%'), true);
  ok('en 25 op stap 5 is 25%', page.includes('25%'), true);
  /* Het verlies tussen stap 2 en 3 is (80-40)/80 = 50%. Dat is het getal waarop je iets
     doet, en het staat er als verlies en niet als aandeel. */
  ok('het verlies van stap 2 naar 3 staat er als 50%', /&minus;50%/.test(page), true);
  /* En het scherm zegt zelf dat dit geen bezoekersaantallen zijn. Zonder die zin is de
     eerste conclusie die iemand trekt "we hadden 100 bezoekers", en dat staat er niet. */
  ok('en het zegt dat dit geen bezoekersaantallen zijn', /geen bezoekersaantallen/.test(page));

  /* De omgekeerde toestand: meer op stap 2 dan op stap 1. Dat is een meetfout en geen
     trechter, en een percentage van een verkeerde noemer is een conclusie waar iemand
     een advertentiebudget op zet. */
  const db2 = fresh();
  db2.prepare('INSERT INTO admin_users (id, email, password_hash) VALUES (1, ?, ?)').run('l@e.com', 'x');
  db2.prepare('INSERT INTO admin_sessions (admin_id, token_hash, expires_at) VALUES (1, ?, ?)')
    .run(await hashToken(token), new Date(Date.now() + 36e5).toISOString());
  db2.prepare('INSERT INTO funnel_hits (day, flow, lang, step, hits) VALUES (?, ?, ?, ?, ?)').run(day, 'drop', 'nl', 1, 10);
  db2.prepare('INSERT INTO funnel_hits (day, flow, lang, step, hits) VALUES (?, ?, ?, ?, ?)').run(day, 'drop', 'nl', 2, 30);
  const res2 = await adminGet({
    request: new Request('https://visuails.com/admin/funnel', { headers: { cookie: `vis_admin=${token}` } }),
    env: { DB: d1(db2) },
    waitUntil() {},
  });
  const page2 = await res2.text();
  ok('een stap die stijgt wordt gemarkeerd als meetfout',
    /kijk naar de meting/.test(page2), true);

  /* En zonder migratie 0025 zegt het scherm WAT eraan scheelt, in plaats van een lege
     trechter te tonen die leest als "niemand begint aan een bestelling". */
  const db3 = fresh({ noTable: true });
  db3.prepare('INSERT INTO admin_users (id, email, password_hash) VALUES (1, ?, ?)').run('l@e.com', 'x');
  db3.prepare('INSERT INTO admin_sessions (admin_id, token_hash, expires_at) VALUES (1, ?, ?)')
    .run(await hashToken(token), new Date(Date.now() + 36e5).toISOString());
  const res3 = await adminGet({
    request: new Request('https://visuails.com/admin/funnel', { headers: { cookie: `vis_admin=${token}` } }),
    env: { DB: d1(db3) },
    waitUntil() {},
  });
  const page3 = await res3.text();
  ok('zonder de tabel wijst het scherm naar migratie 0025', /migratie 0025/.test(page3), true);
  ok('en niet naar een leeg overzicht', /Nog niets gemeten/.test(page3), false);
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
