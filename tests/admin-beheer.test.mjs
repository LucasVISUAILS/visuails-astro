/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * BLOK 5 — HET PANEEL KAN NU OOK CORRIGEREN
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas' lijst van 12 augustus 2026 was zes wensen lang en kwam op één ding neer: het
 * adminpaneel kon LEZEN en nauwelijks iets rechtzetten. Zijn eigen voorbeeld: *"nu kan
 * een per ongeluk toegevoegd model er niet meer uit."*
 *
 * ── WAAROM DIT TEGEN EEN ECHTE DATABASE MOET ────────────────────────────────
 *
 * Vijf van de zes handelingen schrijven, en drie ervan raken beperkingen die alleen
 * een echte database afdwingt:
 *
 *   · het e-mailadres corrigeren botst tegen `UNIQUE INDEX ... lower(email)`
 *   · een boeking van nul wordt geweigerd door `CHECK (delta_cents <> 0)`
 *   · een model verwijderen laat een style lock achter die naar niets wijst
 *
 * Met de nepdatabase uit admin.test.mjs zou dit alle drie groen zijn en in productie
 * alle drie stuk. Zie tests/lib/d1sqlite.mjs voor de rest van die redenering.
 *
 * ── EN ÉÉN DING DAT GEEN KOLOM WAS MAAR EEN VALKUIL ─────────────────────────
 *
 * "Verbergen" kon vóór vandaag alleen door de STATUS van een model op 'in_design' te
 * zetten. Dat filtert het model weg in het portaal — maar de klant ziet dat statuswoord
 * in zijn eigen brand kit staan, dus verbergen las voor hem als *"jullie zijn er nog
 * mee bezig"*: een mededeling over werk dat niet bestaat. `hidden_at` is daarom een
 * eigen kolom, en deze test houdt vast dat de twee niet weer één veld worden.
 */
import { readFileSync } from 'node:fs';
import { adminPost, adminGet } from '../src/lib/admin.js';
import { mintToken, hashToken } from '../src/lib/token.js';
import { sendLoginLink } from '../src/lib/account.js';
import { d1, verseDb, telling } from './lib/d1sqlite.mjs';

let pass = 0;
let fail = 0;
function ok(name, got, want = true, shown) {
  const good = got === want;
  if (good) pass++; else fail++;
  console.log(`${good ? ' ok  ' : ' FAIL'} ${String(name).padEnd(58)}${good ? '' : `verwacht ${JSON.stringify(want)} kreeg ${JSON.stringify(shown ?? got)}`}`);
}

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
const tel = (sql, ...b) => telling(db, sql, ...b);

/* De mails onderscheppen: sendLoginLink() gaat via fetch naar Resend. De echte fetch
   blijft bewaard, want een test die hem sloopt en niet terugzet, sloopt de volgende. */
const echteFetch = globalThis.fetch;
const mails = [];
globalThis.fetch = async (url, init) => {
  if (String(url).includes('resend')) {
    mails.push(JSON.parse(init?.body || '{}'));
    return new Response(JSON.stringify({ id: 'mail-1' }), { status: 200 });
  }
  return new Response('{}', { status: 200 });
};

const adminToken = await mintToken();
db.exec(`INSERT INTO admin_users (id, email, password_hash) VALUES (1, 'studio@visuails.com', 'x')`);
db.prepare(
  `INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (1, 1, ?, '2099-01-01T00:00:00Z')`
).run(await hashToken(adminToken));

db.exec(`
  INSERT INTO customers (id, email, brand, name, phone, website, vat_number, created_at)
    VALUES (7, 'sanne@ateliernoord.nl', 'VOLT', 'Sanne de Vries', '+31612345678',
            'ateliernoord.nl', 'NL000000000B00', '2026-07-01T10:00:00Z'),
           (8, 'tweede@ateliernoord.nl', 'VOLT', 'Sanne de Vries', NULL, NULL, NULL, '2026-07-20T10:00:00Z');

  INSERT INTO orders (id, ref, customer_id, service, status, email, total_cents, lang)
    VALUES (10, 'VIS-2608-0010', 7, 'catalog', 'delivered', 'sanne@ateliernoord.nl', 8900, 'nl'),
           (11, 'VIS-2608-0011', 8, 'catalog', 'received', 'tweede@ateliernoord.nl', 4900, 'nl');

  INSERT INTO custom_models (id, customer_id, label, preview_key, status)
    VALUES (1, 7, 'Nora', 'models/7/1-nora.jpg', 'approved'),
           (2, 7, 'Per ongeluk', 'models/7/2-oeps.jpg', 'approved');

  INSERT INTO customer_style_locks (customer_id, style, custom_model_id)
    VALUES (7, 'glow', 2);

  INSERT INTO account_sessions (id, customer_id, token_hash, expires_at)
    VALUES (1, 7, 'sess-7', '2099-01-01T00:00:00Z');
  INSERT INTO account_tokens (id, customer_id, token_hash, expires_at)
    VALUES (1, 7, 'tok-7', '2099-01-01T00:00:00Z');
`);

const verwijderdUitR2 = [];
const env = {
  DB: d1(db),
  UPLOADS: { async delete(key) { verwijderdUitR2.push(key); } },
  RESEND_API_KEY: 're_test',
  FROM_EMAIL: 'VISUAILS <hallo@visuails.com>',
};

const post = (path, velden) => adminPost({
  request: new Request(`https://visuails.com${path}`, {
    method: 'POST',
    headers: { cookie: `vis_admin=${adminToken}`, origin: 'https://visuails.com' },
    body: new URLSearchParams(velden),
  }),
  env,
  waitUntil() {},
});
const get = (path) => adminGet({
  request: new Request(`https://visuails.com${path}`, { headers: { cookie: `vis_admin=${adminToken}` } }),
  env,
  waitUntil() {},
});

console.log('\nVISUAILS — het adminpaneel kan corrigeren\n');

console.log('het schema van migratie 0027 staat erin');
{
  ok('geen enkel statement uit schema.sql faalt', mislukt.length, 0, mislukt.slice(0, 3).join(' | '));
  const modelKolommen = db.prepare('PRAGMA table_info(custom_models)').all().map((c) => c.name);
  ok('custom_models heeft hidden_at', modelKolommen.includes('hidden_at'), true, modelKolommen.join(', '));
  ok('en hidden_reason', modelKolommen.includes('hidden_reason'), true);
  const klantKolommen = db.prepare('PRAGMA table_info(customers)').all().map((c) => c.name);
  ok('customers heeft deactivated_at', klantKolommen.includes('deactivated_at'), true);
  ok('en merged_into', klantKolommen.includes('merged_into'), true);
  ok('customer_credits bestaat',
    db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name='customer_credits'").get().n, 1);
  /* De CHECK die een boeking van nul tegenhoudt. Dat is geen sier: nul is een notitie
     en niet een boeking, en een ledger vol nulregels is een ledger die je niet leest. */
  let nulGeweigerd = false;
  try {
    db.exec(`INSERT INTO customer_credits (customer_id, delta_cents, reason) VALUES (7, 0, 'nul')`);
  } catch { nulGeweigerd = true; }
  ok('en weigert een boeking van nul', nulGeweigerd, true);
}

console.log('\neen model hernoemen');
{
  const res = await post('/admin/models/1/manage', { action: 'rename', label: 'Nora — winter' });
  ok('het gaat terug naar de klantpagina', res.status, 303);
  ok('de naam is gewijzigd', db.prepare('SELECT label FROM custom_models WHERE id = 1').get().label, 'Nora — winter');
  ok('en het staat in het logboek met oud én nieuw',
    /"Nora" → "Nora — winter"/.test(db.prepare("SELECT detail FROM admin_log WHERE action='model.rename'").get()?.detail || ''), true);

  /* Een lege naam is geen correctie maar een kaart met een gezicht en geen woord
     eronder in het portaal van de klant. */
  const leeg = await post('/admin/models/1/manage', { action: 'rename', label: '   ' });
  ok('een lege naam wordt geweigerd', leeg.status, 400);
  ok('en de oude naam staat er nog', db.prepare('SELECT label FROM custom_models WHERE id = 1').get().label, 'Nora — winter');
}

console.log('\neen model verbergen, en weer terug');
{
  /* DE REDEN IS VERPLICHT. Een verborgen model zonder reden is over drie maanden een
     raadsel, en dan durf je hem niet terug te zetten en niet te verwijderen. */
  const zonder = await post('/admin/models/1/manage', { action: 'hide', reason: '' });
  ok('verbergen zonder reden wordt geweigerd', zonder.status, 400);
  ok('en het model is niet verborgen', db.prepare('SELECT hidden_at FROM custom_models WHERE id = 1').get().hidden_at, null);

  await post('/admin/models/1/manage', { action: 'hide', reason: 'Model is gestopt met modellenwerk' });
  const na = db.prepare('SELECT hidden_at, hidden_reason, status FROM custom_models WHERE id = 1').get();
  ok('het model is verborgen', !!na.hidden_at, true);
  ok('met de reden erbij', na.hidden_reason, 'Model is gestopt met modellenwerk');
  /*
   * DE STATUS BLIJFT ONGEMOEID, en dat is de hele reden dat `hidden_at` een eigen
   * kolom is. De oude workaround zette de status op 'in_design', en dat woord leest de
   * klant in zijn eigen brand kit als "jullie zijn er nog mee bezig".
   */
  ok('en de status is niet misbruikt om te verbergen', na.status, 'approved');

  await post('/admin/models/1/manage', { action: 'unhide' });
  const terug = db.prepare('SELECT hidden_at, hidden_reason FROM custom_models WHERE id = 1').get();
  ok('terugzetten maakt hem weer zichtbaar', terug.hidden_at, null);
  /* En de reden gaat mee weg: een reden die blijft staan nadat het model weer
     zichtbaar is, is een onwaarheid op het scherm. */
  ok('en wist de reden', terug.hidden_reason, null);
}

console.log('\neen model verwijderen — de enige onomkeerbare');
{
  const zonder = await post('/admin/models/2/manage', { action: 'delete', confirm: 'iets anders' });
  ok('zonder de juiste naam gebeurt er niets', zonder.status, 400);
  ok('het model staat er nog', tel('SELECT COUNT(*) FROM custom_models WHERE id = 2'), 1);

  const res = await post('/admin/models/2/manage', { action: 'delete', confirm: 'Per ongeluk' });
  ok('met de juiste naam gaat het weg', res.status, 303);
  ok('de rij is verdwenen', tel('SELECT COUNT(*) FROM custom_models WHERE id = 2'), 0);
  ok('het portret is uit R2', verwijderdUitR2.includes('models/7/2-oeps.jpg'), true, verwijderdUitR2.join(' | '));
  /*
   * DE STYLE LOCK IS LOSGELATEN. De foreign key is ON DELETE SET NULL, dus strikt
   * genomen zou de database dit zelf doen — maar deze codebase vertrouwt daar in D1
   * bewust niet op, en er is een tweede reden: een lock die zijn model kwijt is, is een
   * voorkeur die naar niets wijst. Die hoort weg en niet leeg.
   */
  const lock = db.prepare('SELECT custom_model_id FROM customer_style_locks WHERE customer_id = 7').get();
  ok('de vaste look wijst niet meer naar het verdwenen model', lock?.custom_model_id ?? null, null);
  ok('en de andere modellen staan er nog', tel('SELECT COUNT(*) FROM custom_models WHERE customer_id = 7'), 1);
}

console.log('\nklantgegevens corrigeren');
{
  const res = await post('/admin/customers/7/details', {
    email: 'sanne@ateliernoord.nl',
    brand: 'VOLT Amsterdam',
    name: 'Sanne de Vries',
    phone: '',
    website: 'ateliernoord.nl',
    vat_number: 'NL123456789B01',
  });
  ok('het wordt opgeslagen', res.status, 303);
  const na = db.prepare('SELECT * FROM customers WHERE id = 7').get();
  ok('de merknaam is gewijzigd', na.brand, 'VOLT Amsterdam');
  ok('het btw-nummer is rechtgezet', na.vat_number, 'NL123456789B01');
  /* Leeg betekent leegmaken — behalve bij het e-mailadres. Wie een telefoonnummer
     weghaalt omdat het niet meer klopt, wil dat het weg is en niet dat het blijft staan. */
  ok('een leeg veld wordt ook echt leeg', na.phone, null);

  /* WAT ER IN HET LOGBOEK KOMT. Niet "de gegevens zijn bijgewerkt" — dat is bij een
     vraag over een factuur van drie maanden terug net zo nuttig als geen logregel. */
  const log = db.prepare("SELECT detail FROM admin_log WHERE action='customer.details'").get()?.detail || '';
  ok('het logboek noemt wat er veranderde', /brand: VOLT → VOLT Amsterdam/.test(log), true, log);
  ok('en ook het btw-nummer', /vat_number/.test(log), true, log);

  /*
   * HET ADRES MAG NIET BOTSEN. Er staat een unieke index op lower(email), dus zonder
   * eigen controle zou de UPDATE omvallen en kreeg de studio een foutpagina waar
   * "dat adres is al van een ander account" hoort te staan.
   */
  const botsing = await post('/admin/customers/7/details', {
    email: 'TWEEDE@ateliernoord.nl', brand: 'VOLT', name: '', phone: '', website: '', vat_number: '',
  });
  ok('een bezet adres wordt geweigerd', botsing.status, 400);
  ok('met het andere klantnummer erin', /#8/.test(await botsing.clone().text()), true);
  ok('en er is niets gewijzigd',
    db.prepare('SELECT email FROM customers WHERE id = 7').get().email, 'sanne@ateliernoord.nl');

  /* Een leeg e-mailadres is geen correctie maar een account dat niemand meer kan
     openen: het is de inlogsleutel én de plek waar de levering naartoe gaat. */
  const leeg = await post('/admin/customers/7/details', {
    email: '', brand: 'VOLT', name: '', phone: '', website: '', vat_number: '',
  });
  ok('een leeg e-mailadres wordt geweigerd', leeg.status, 400);
  ok('en een adres zonder apenstaartje ook',
    (await post('/admin/customers/7/details', { email: 'geen-adres', brand: 'x' })).status, 400);
}

console.log('\ntegoed boeken, met een verplichte reden');
{
  const zonder = await post('/admin/customers/7/credits', { amount: '50', reason: '' });
  ok('een boeking zonder reden wordt geweigerd', zonder.status, 400);
  ok('en er staat niets in het ledger', tel('SELECT COUNT(*) FROM customer_credits'), 0);

  ok('nul euro wordt geweigerd', (await post('/admin/customers/7/credits', { amount: '0', reason: 'x' })).status, 400);
  ok('geen bedrag ook', (await post('/admin/customers/7/credits', { amount: '', reason: 'x' })).status, 400);
  /* De bovengrens houdt een typefout van drie nullen tegen. Dit is een vrij tekstveld
     dat geld schrijft. */
  ok('meer dan € 1.000 in één boeking wordt geweigerd',
    (await post('/admin/customers/7/credits', { amount: '5000', reason: 'x' })).status, 400);

  await post('/admin/customers/7/credits', { amount: '50', reason: 'goodwill, revisie duurde te lang' });
  /* De komma, want wie op een Nederlands toetsenbord "12,50" typt bedoelt twaalf euro
     vijftig — dat afwijzen is een formulier dat uitlegt hoe het toevallig is gebouwd. */
  await post('/admin/customers/7/credits', { amount: '-12,50', reason: 'verrekend op factuur', order_id: '10' });

  const boekingen = db.prepare('SELECT * FROM customer_credits ORDER BY id').all();
  ok('er staan twee boekingen', boekingen.length, 2);
  ok('bijboeken is positief in centen', boekingen[0].delta_cents, 5000);
  ok('afboeken is negatief, en de komma is gelezen', boekingen[1].delta_cents, -1250);
  ok('de reden staat erbij', boekingen[0].reason, 'goodwill, revisie duurde te lang');
  ok('de bestelling is vastgelegd', boekingen[1].order_id, 10);
  ok('en wie het boekte', boekingen[0].admin_id, 1);
  /* Het saldo is een SOM en geen kolom: dat is precies waarom de reden per boeking
     bestaat. "Waar komt die vijfenveertig euro vandaan" is de vraag die je krijgt. */
  ok('het saldo is de som', tel('SELECT SUM(delta_cents) FROM customer_credits WHERE customer_id = 7'), 3750);

  /* Een bestelling van een ándere klant is een spoor dat de verkeerde kant op wijst. */
  const vreemd = await post('/admin/customers/7/credits', { amount: '10', reason: 'x', order_id: '11' });
  ok('een bestelling van een andere klant wordt geweigerd', vreemd.status, 400);
  ok('en er is niets bijgeboekt', tel('SELECT COUNT(*) FROM customer_credits'), 2);
}

console.log('\neen inloglink sturen vanuit het paneel');
{
  mails.length = 0;
  const res = await post('/admin/customers/7/signin-link', {});
  ok('het lukt', res.status, 303);
  ok('er is één mail uitgegaan', mails.length, 1, JSON.stringify(mails).slice(0, 120));
  ok('naar het adres van de klant', String(mails[0]?.to || '').includes('sanne@ateliernoord.nl'), true);
  /* DEZELFDE FUNCTIE ALS DE PUBLIEKE KANT, dus ook hetzelfde token in dezelfde tabel.
     Een tweede plek die tokens maakt is een tweede plek waar de geldigheidsduur, het
     hashen en de mailtekst uit elkaar kunnen lopen. */
  ok('en er staat een nieuw token in account_tokens',
    tel('SELECT COUNT(*) FROM account_tokens WHERE customer_id = 7') >= 1, true);
  ok('het staat in het logboek',
    /verstuurd/.test(db.prepare("SELECT detail FROM admin_log WHERE action='customer.signin_link'").get()?.detail || ''), true);
}

console.log('\neen account deactiveren — en dat het dan ook echt dicht is');
{
  const zonder = await post('/admin/customers/8/status', { action: 'deactivate', reason: '' });
  ok('zonder reden gebeurt er niets', zonder.status, 400);

  const raar = await post('/admin/customers/8/status', { action: 'deactivate', reason: 'x', merged_into: '999' });
  ok('een verwijzing naar een klant die niet bestaat wordt geweigerd', raar.status, 400);
  ok('naar zichzelf ook',
    (await post('/admin/customers/8/status', { action: 'deactivate', reason: 'x', merged_into: '8' })).status, 400);
  ok('en het account is nog actief', db.prepare('SELECT deactivated_at FROM customers WHERE id = 8').get().deactivated_at, null);

  const res = await post('/admin/customers/8/status', {
    action: 'deactivate',
    reason: 'Dubbele registratie — gebruikt het eerste adres',
    merged_into: '7',
  });
  ok('deactiveren lukt', res.status, 303);
  const na = db.prepare('SELECT * FROM customers WHERE id = 8').get();
  ok('het account is gedeactiveerd', !!na.deactivated_at, true);
  ok('met de reden erbij', /Dubbele registratie/.test(na.deactivated_reason || ''), true);
  ok('en de verwijzing naar het goede account', na.merged_into, 7);
  /* ER IS NIETS VERPLAATST, en dat is het verschil met samenvoegen. Lucas' keuze:
     bestellingen en facturen verhangen is een onomkeerbare operatie op de tabel waar de
     boekhouding aan hangt, en het probleem is op te lossen door de klant naar het goede
     account te sturen. */
  ok('de bestelling hangt nog aan het gedeactiveerde account',
    db.prepare('SELECT customer_id FROM orders WHERE id = 11').get().customer_id, 8);

  const weer = await post('/admin/customers/8/status', { action: 'reactivate' });
  ok('weer activeren lukt', weer.status, 303);
  const terug = db.prepare('SELECT deactivated_at, deactivated_reason, merged_into FROM customers WHERE id = 8').get();
  ok('het account is weer actief', terug.deactivated_at, null);
  ok('de reden is gewist', terug.deactivated_reason, null);
  ok('en de verwijzing ook', terug.merged_into, null);
}

console.log('\nde sessies en de inloglink gaan eruit bij deactiveren');
{
  /*
   * ZONDER DIT IS DEACTIVEREN EEN WOORD OP EEN SCHERM. De klant blijft doorwerken tot
   * zijn sessie verloopt, of vraagt tien seconden later een nieuwe inloglink aan en is
   * weer binnen. Beide gaten zitten dicht: de sessies en tokens worden verwijderd, en
   * sendLoginLink() weigert een gedeactiveerd account.
   */
  ok('klant 7 heeft nu een sessie', tel('SELECT COUNT(*) FROM account_sessions WHERE customer_id = 7') >= 1, true);
  await post('/admin/customers/7/status', { action: 'deactivate', reason: 'op verzoek van de klant' });
  ok('de sessies zijn weg', tel('SELECT COUNT(*) FROM account_sessions WHERE customer_id = 7'), 0);
  ok('en de openstaande inloglinks ook', tel('SELECT COUNT(*) FROM account_tokens WHERE customer_id = 7'), 0);

  mails.length = 0;
  const link = await post('/admin/customers/7/signin-link', {});
  ok('een inloglink sturen wordt geweigerd', link.status, 400);
  ok('en er is geen mail uitgegaan', mails.length, 0);
}

console.log('\nde publieke inlogweg weigert een gedeactiveerd account ook');
{
  /*
   * ── EEN GAT DAT DE MUTATIETEST BLOOTLEGDE ──────────────────────────────────
   *
   * De controle in account.js weggehaald en deze test bleef groen, want
   * handleCustomerSigninLink() kijkt er ZELF ook naar. Die tweede controle beschermt
   * echter alleen de adminknop. De weg die er werkelijk om gaat is de PUBLIEKE: een
   * gedeactiveerde klant die op /account/login zijn eigen adres invult.
   *
   * Dus wordt sendLoginLink() hier direct aangeroepen — dat is de kern van die
   * publieke weg, en de enige manier om hem te toetsen zonder het hele
   * inlogformulier na te bouwen. Zonder deze sectie is "gedeactiveerd" een woord op
   * een adminscherm: de klant vraagt tien seconden later een nieuwe link aan en is
   * weer binnen.
   */
  await post('/admin/customers/8/status', { action: 'deactivate', reason: 'nogmaals, voor deze test' });
  mails.length = 0;
  const req = new Request('https://visuails.com/account/login', { method: 'POST' });

  const uit = await sendLoginLink(env, req, 'tweede@ateliernoord.nl', 'nl');
  ok('sendLoginLink weigert het gedeactiveerde account', uit, false);
  ok('en er gaat geen mail uit', mails.length, 0);
  ok('en er komt geen token in de tabel', tel('SELECT COUNT(*) FROM account_tokens WHERE customer_id = 8'), 0);

  /* En de tegenhanger, want een weigering die alles weigert is geen weigering: een
     actief account krijgt zijn link wel. */
  await post('/admin/customers/8/status', { action: 'reactivate' });
  mails.length = 0;
  const weer = await sendLoginLink(env, req, 'tweede@ateliernoord.nl', 'nl');
  ok('een actief account krijgt zijn link wel', weer, true);
  ok('en dan gaat er één mail uit', mails.length, 1);
  /* Een adres dat niet bestaat geeft `false` en niet een fout — de publieke kant zegt
     altijd "kijk in je mail", want elk ander antwoord vertelt een vreemde of een
     bepaald adres een account heeft. */
  ok('een onbekend adres geeft false zonder te gooien',
    await sendLoginLink(env, req, 'niemand@nergens.nl', 'nl'), false);
}

console.log('\nde vaste look wordt expliciet losgelaten, niet aan cascade overgelaten');
{
  /*
   * OOK EEN GAT UIT DE MUTATIETEST. Het losmaken van de style lock weggehaald en de
   * test bleef groen — de foreign key is ON DELETE SET NULL, dus de database doet het
   * alsnog. Het gedrag klopt dan per ongeluk.
   *
   * Deze codebase vertrouwt in D1 bewust niet op cascade (zie de noot bij dezelfde
   * afweging in handleCustomerWipe), en er is hier een tweede reden: SET NULL laat een
   * lock achter die naar niets wijst, terwijl een voorkeur zonder model hoort te
   * verdwijnen en niet leeg te blijven. Er valt niets te meten aan gedrag dat de
   * database toevallig overneemt, dus wordt de VORM vastgehouden.
   */
  const SRC = readFileSync(new URL('../src/lib/admin.js', import.meta.url), 'utf8');
  const fn = (() => {
    const start = SRC.indexOf('async function handleModelManage');
    const einde = SRC.indexOf('\nasync function ', start + 10);
    return start === -1 ? '' : SRC.slice(start, einde === -1 ? undefined : einde);
  })();
  ok('handleModelManage is gevonden', fn.length > 500, true, `${fn.length} tekens`);
  ok('de style lock wordt expliciet losgelaten',
    /UPDATE customer_style_locks SET custom_model_id = NULL WHERE custom_model_id = \?1/.test(fn), true);
  ok('en dat gebeurt in dezelfde batch als het verwijderen',
    /env\.DB\.batch\(\[[\s\S]{0,400}customer_style_locks[\s\S]{0,200}DELETE FROM custom_models/.test(fn), true);
  /* En het portret gaat NA de rij uit R2. Andersom zou een mislukte DELETE een rij
     achterlaten die naar een verdwenen object wijst — precies de fout die de AVG-knop
     vandaag had. */
  ok('het portret gaat na de rij uit R2',
    fn.indexOf('DELETE FROM custom_models') < fn.indexOf('UPLOADS?.delete(model.preview_key)'), true);
}

console.log('\nde klantpagina laat het allemaal zien');
{
  await post('/admin/customers/7/status', { action: 'reactivate' });
  const res = await get('/admin/customers/7');
  ok('de pagina laadt', res.status, 200);
  const h = await res.text();

  /* HET AANMELDMOMENT. `customers.created_at` werd op twee plekken netjes geselecteerd
     en daarna weggegooid — een dode SELECT. Dit is de vraag die bij elk telefoontje als
     eerste komt. */
  ok('het aanmeldmoment staat erop', /klant sinds/.test(h), true);
  ok('er is een formulier om gegevens te corrigeren', h.includes('/admin/customers/7/details'), true);
  ok('een knop voor een nieuwe inloglink', h.includes('/admin/customers/7/signin-link'), true);
  ok('een tegoedpaneel', h.includes('/admin/customers/7/credits'), true);
  ok('met het saldo erin', /€37\.50/.test(h), true);
  ok('en de reden van een boeking', /goodwill, revisie duurde te lang/.test(h), true);
  /* De belofte die er NIET mag staan: dit verrekent niets automatisch. Zou die zin
     verdwijnen, dan gaat iemand ervan uit dat het bij het afrekenen wordt afgetrokken. */
  ok('en de waarschuwing dat het niet automatisch verrekend wordt', /niet<\/strong> automatisch/.test(h), true);
  ok('er is een deactiveerpaneel', h.includes('/admin/customers/7/status'), true);
  ok('en de modelkaart heeft hernoemen en verbergen', h.includes('/admin/models/1/manage'), true);
}

globalThis.fetch = echteFetch;

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
