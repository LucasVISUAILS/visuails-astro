/*
 * ═══════════════════════════════════════════════════════════════════════════
 * DE TWEEDE FACTOR OP DE BEHEERDERSLOGIN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Lucas' keuze na de beveiligingsronde van 31 augustus 2026: *"Tweede factor met
 * herstelcodes."* Het beheerderswachtwoord opent elke klant, elk bestand en elke
 * betaling, en het was het enige slot.
 *
 * ── WAT HIER BEWEZEN MOET WORDEN, EN IN DEZE VOLGORDE ──────────────────────
 *
 * Een tweede factor kan op twee manieren stukgaan, en de tweede is erger:
 *
 *   1. hij houdt niemand tegen — de halve sessie opent tóch iets, of een
 *      willekeurige code werkt;
 *   2. hij houdt de eigenaar tegen — hij gaat aan voordat er een werkende app is,
 *      of de herstelcodes doen het niet.
 *
 * Daarom staan de rekenkundige toetsen bovenaan (tegen de officiële testvectoren
 * van RFC 6238, want een eigen implementatie die alleen zichzelf gelooft, bewijst
 * niets) en de buitensluit-toetsen onderaan.
 */

import { d1, verseDb, telling } from './lib/d1sqlite.mjs';
import { adminGet, adminPost } from '../src/lib/admin.js';
import { hashPassword, verifyTotp, totpCode, mintRecoveryCodes, hashRecoveryCode, TOTP_STAP } from '../src/lib/adminAuth.js';
import { mintToken, hashToken } from '../src/lib/token.js';

let goed = 0;
let totaal = 0;
function ok(naam, kreeg, verwacht) {
  totaal += 1;
  const isGoed = JSON.stringify(kreeg) === JSON.stringify(verwacht);
  if (isGoed) goed += 1;
  console.log(` ${isGoed ? 'ok  ' : 'FAIL'} ${String(naam).padEnd(58)}${isGoed ? '' : ` verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(kreeg)}`}`);
}

/* ══ 1 · DE REKENKUNDE, TEGEN DE OFFICIËLE VECTOREN ═══════════════════════
 *
 * RFC 6238 bijlage B, met het geheim "12345678901234567890" in base32. De RFC
 * publiceert acht cijfers; deze implementatie geeft er zes, dus de laatste zes.
 * Een eigen TOTP die alleen zichzelf gelooft, bewijst niets — dit is het enige
 * bewijs dat elke authenticator-app dezelfde code zal tonen.
 */
console.log('\nde codes komen overeen met de testvectoren van RFC 6238');
{
  const geheim = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
  for (const [t, verwacht] of [[59, '287082'], [1111111109, '081804'], [1234567890, '005924'], [2000000000, '279037']]) {
    ok(`T=${t} geeft ${verwacht}`, await verifyTotp(verwacht, geheim, { nu: t * 1000, drift: 0 }), true);
  }
  ok('een verkeerde code wordt geweigerd', await verifyTotp('000000', geheim, { nu: 59000, drift: 0 }), false);
  ok('en iets dat geen zes cijfers is ook', await verifyTotp('12345', geheim, { nu: 59000 }), false);

  /* HET DRIFTVENSTER. Eén stap terug en één vooruit, dus negentig seconden. Ruimer
     vergroot het radenvenster evenredig; smaller sluit een telefoon buiten waarvan
     de klok een halve minuut afwijkt. */
  ok('een code van één stap terug mag nog',
    await verifyTotp('287082', geheim, { nu: (59 + TOTP_STAP) * 1000 }), true);
  ok('maar drie stappen terug niet',
    await verifyTotp('287082', geheim, { nu: (59 + 3 * TOTP_STAP) * 1000 }), false);
}

/* ══ 2 · DE INLOG IN TWEE STAPPEN ════════════════════════════════════════ */
const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
if (mislukt.length) { console.error('schema:', mislukt); process.exit(1); }
const env = { DB: d1(db), ADMIN_ORIGIN: 'https://visuails.com' };

const WACHTWOORD = 'een-lang-en-uniek-wachtwoord';
db.prepare('INSERT INTO admin_users (id, email, password_hash) VALUES (1, ?, ?)')
  .run('lucas@visuails.com', await hashPassword(WACHTWOORD));

const koekje = (res) => {
  const rauw = res.headers.get('set-cookie') || '';
  const m = /vis_admin=([^;]*)/.exec(rauw);
  return m ? m[1] : '';
};
const post = (pad, velden, cookie = '') => adminPost({
  request: new Request(`https://visuails.com${pad}`, {
    method: 'POST',
    headers: { origin: 'https://visuails.com', ...(cookie ? { cookie: `vis_admin=${cookie}` } : {}) },
    body: new URLSearchParams(velden),
  }),
  env,
  waitUntil() {},
});
const get = (pad, cookie = '') => adminGet({
  request: new Request(`https://visuails.com${pad}`, { headers: cookie ? { cookie: `vis_admin=${cookie}` } : {} }),
  env,
  waitUntil() {},
});

/* De code die een app op dit moment zou tonen.
   HIER STOND EEN ZOEKTOCHT: een lus van een miljoen pogingen langs verifyTotp().
   Die duurde zo lang dat de tijdstap ondertussen omsloeg — de gevonden code was
   bij het invullen al verlopen, en deze toets viel willekeurig om in een volle
   run terwijl hij los altijd groen was. Een toets die zijn eigen antwoord moet
   raden, meet zijn eigen snelheid. */
/* Een code vlak voor de wissel naar de volgende stap van 30 seconden kan bij
   een drukke testreeks (alles parallel) net over de grens vallen. Dan eerst die
   paar seconden afwachten, zodat elke toets midden in een stap begint. */
const codeNu = async (secret) => {
  const inStap = (Date.now() / 1000) % 30;
  if (inStap > 25) await new Promise((r) => setTimeout(r, (30 - inStap) * 1000 + 50));
  return totpCode(secret);
};

/* ── EEN CODE WERKT MAAR ÉÉN KEER — 8 oktober 2026 (o19) ────────────────────
   Deze toets gebruikt de code van NU, en doet dat in een paar milliseconden
   meerdere keren. In het echt zit er minstens een halve minuut tussen twee
   inlogmomenten; sinds migratie 0052 weigert de server dezelfde stap een tweede
   keer. `latereStap()` doet alsof die halve minuut voorbij is, door de bewaarde
   stap te wissen. Sectie 7 toetst de weigering zelf. */
const latereStap = () => db.exec('UPDATE admin_users SET totp_last_step = NULL');

console.log('\nzonder tweede factor verandert er niets aan het inloggen');
{
  const res = await post('/admin/login', { email: 'lucas@visuails.com', password: WACHTWOORD });
  ok('het wachtwoord alleen is genoeg', [res.status, res.headers.get('location')], [303, '/admin']);
  ok('en de sessie is meteen heel', telling(db, 'SELECT COUNT(*) FROM admin_sessions WHERE totp_pending = 0'), 1);
  const dash = await get('/admin', koekje(res));
  ok('het dashboard opent', dash.status, 200);
  db.exec('DELETE FROM admin_sessions');
}

/* ══ 3 · AANZETTEN KAN NIET ZONDER EEN WERKENDE APP ══════════════════════
 *
 * Dit is de toets tegen de gevaarlijkste fout: een tweede stap die aan gaat
 * voordat de eigenaar hem kan gebruiken. Het geheim wordt gezet, maar zolang er
 * geen kloppende code is ingetypt, vraagt het inloggen er niet om.
 */
console.log('\nde tweede stap gaat pas aan als er één keer een code klopte');
{
  const in1 = await post('/admin/login', { email: 'lucas@visuails.com', password: WACHTWOORD });
  const c = koekje(in1);
  await post('/admin/security', { doen: 'start' }, c);
  const rij = db.prepare('SELECT totp_secret, totp_confirmed_at FROM admin_users WHERE id = 1').get();
  ok('er staat een geheim', /^[A-Z2-7]{32}$/.test(rij.totp_secret || ''), true);
  ok('maar het is niet bevestigd', rij.totp_confirmed_at, null);

  db.exec('DELETE FROM admin_sessions');
  const halverwege = await post('/admin/login', { email: 'lucas@visuails.com', password: WACHTWOORD });
  ok('en het inloggen vraagt nog nergens om', halverwege.headers.get('location'), '/admin');

  /* Nu wél bevestigen, met een code die de app op dit moment zou tonen. */
  db.exec('DELETE FROM admin_sessions');
  const in2 = await post('/admin/login', { email: 'lucas@visuails.com', password: WACHTWOORD });
  const c2 = koekje(in2);
  const juist = await codeNu(rij.totp_secret);
  const bev = await post('/admin/security', { doen: 'bevestig', code: juist }, c2);
  ok('bevestigen lukt', bev.status, 200);
  const lijf = await bev.text();
  ok('en levert tien herstelcodes op', (lijf.match(/[A-Z2-9]{5}-[A-Z2-9]{5}-[A-Z2-9]{5}-[A-Z2-9]{5}/g) || []).length, 10);
  ok('die gehasht in de database staan', telling(db, 'SELECT COUNT(*) FROM admin_recovery_codes'), 10);
  ok('en niet leesbaar', telling(db, "SELECT COUNT(*) FROM admin_recovery_codes WHERE code_hash LIKE '%-%'"), 0);
  ok('nu staat hij aan',
    Boolean(db.prepare('SELECT totp_confirmed_at FROM admin_users WHERE id = 1').get().totp_confirmed_at), true);
}

console.log('\nmet de tweede stap aan komt het wachtwoord alleen niet meer binnen');
{
  db.exec('DELETE FROM admin_sessions');
  const res = await post('/admin/login', { email: 'lucas@visuails.com', password: WACHTWOORD });
  ok('het wachtwoord stuurt naar de tweede stap', [res.status, res.headers.get('location')], [303, '/admin/code']);
  const c = koekje(res);
  ok('de sessie staat op halverwege', telling(db, 'SELECT COUNT(*) FROM admin_sessions WHERE totp_pending = 1'), 1);

  /* DE KERN: een halve sessie opent nergens iets. */
  const dash = await get('/admin', c);
  ok('het dashboard blijft dicht', [dash.status, dash.headers.get('location')], [303, '/admin/login']);
  const beheer = await get('/admin/customers', c);
  ok('en de klantenlijst ook', beheer.headers.get('location'), '/admin/login');

  const fout = await post('/admin/code', { code: '000000' }, c);
  ok('een verkeerde code komt er niet in', fout.status, 401);
  ok('en de halve sessie blijft staan zodat je niet opnieuw hoeft in te loggen',
    telling(db, 'SELECT COUNT(*) FROM admin_sessions WHERE totp_pending = 1'), 1);

  const geheim = db.prepare('SELECT totp_secret FROM admin_users WHERE id = 1').get().totp_secret;
  const juist = await codeNu(geheim);
  latereStap();
  const binnen = await post('/admin/code', { code: juist }, c);
  ok('de goede code maakt de sessie heel', [binnen.status, binnen.headers.get('location')], [303, '/admin']);
  const dash2 = await get('/admin', c);
  ok('en dan opent het dashboard', dash2.status, 200);
}

/* ══ 4 · DE HERSTELCODE ══════════════════════════════════════════════════ */
console.log('\neen herstelcode werkt één keer en daarna nooit meer');
{
  const codes = mintRecoveryCodes(2);
  db.exec('DELETE FROM admin_recovery_codes');
  for (const c of codes) {
    db.prepare('INSERT INTO admin_recovery_codes (admin_id, code_hash) VALUES (1, ?)').run(await hashRecoveryCode(c));
  }
  db.exec('DELETE FROM admin_sessions');
  const res = await post('/admin/login', { email: 'lucas@visuails.com', password: WACHTWOORD });
  const c = koekje(res);

  const binnen = await post('/admin/code', { code: codes[0] }, c);
  ok('de herstelcode komt binnen', binnen.headers.get('location'), '/admin');
  ok('en is opgemaakt', telling(db, 'SELECT COUNT(*) FROM admin_recovery_codes WHERE used_at IS NOT NULL'), 1);

  db.exec('DELETE FROM admin_sessions');
  const res2 = await post('/admin/login', { email: 'lucas@visuails.com', password: WACHTWOORD });
  const tweede = await post('/admin/code', { code: codes[0] }, koekje(res2));
  ok('dezelfde code werkt geen tweede keer', tweede.status, 401);

  /* Met streepjes of zonder, en in kleine letters: dit wordt van papier
     overgetypt op het slechtste moment van de maand. */
  db.exec('DELETE FROM admin_sessions');
  const res3 = await post('/admin/login', { email: 'lucas@visuails.com', password: WACHTWOORD });
  const slordig = await post('/admin/code', { code: codes[1].replace(/-/g, '').toLowerCase() }, koekje(res3));
  ok('een code zonder streepjes en in kleine letters werkt ook', slordig.headers.get('location'), '/admin');
}

/* ══ 5 · UITZETTEN VRAAGT EEN CODE ═══════════════════════════════════════
 *
 * Wie een sessie overneemt mag de tweede stap niet kunnen uitzetten of de
 * herstelcodes kunnen vervangen — dan is hij alleen een drempel voor de eigenaar.
 */
console.log('\nuitzetten en nieuwe codes vragen zelf ook een code');
{
  db.exec('DELETE FROM admin_sessions');
  db.exec('DELETE FROM admin_recovery_codes');
  const res = await post('/admin/login', { email: 'lucas@visuails.com', password: WACHTWOORD });
  const c = koekje(res);
  const geheim = db.prepare('SELECT totp_secret FROM admin_users WHERE id = 1').get().totp_secret;
  latereStap();
  await post('/admin/code', { code: await codeNu(geheim) }, c);

  await post('/admin/security', { doen: 'uit', code: '000000' }, c);
  ok('uitzetten met een verkeerde code doet niets',
    Boolean(db.prepare('SELECT totp_confirmed_at FROM admin_users WHERE id = 1').get().totp_confirmed_at), true);

  /* 8 oktober 2026: `afbreken` en `start` liepen om de codecontrole heen. */
  await post('/admin/security', { doen: 'afbreken' }, c);
  ok('afbreken zonder code zet hem niet uit',
    Boolean(db.prepare('SELECT totp_confirmed_at FROM admin_users WHERE id = 1').get().totp_confirmed_at), true);
  await post('/admin/security', { doen: 'start', code: '000000' }, c);
  const naStart = db.prepare('SELECT totp_secret, totp_confirmed_at FROM admin_users WHERE id = 1').get();
  ok('opnieuw beginnen met een verkeerde code verandert het geheim niet',
    [naStart.totp_secret, Boolean(naStart.totp_confirmed_at)], [geheim, true]);

  latereStap();
  await post('/admin/security', { doen: 'uit', code: await codeNu(geheim) }, c);
  const na = db.prepare('SELECT totp_secret, totp_confirmed_at FROM admin_users WHERE id = 1').get();
  ok('met de goede code gaat hij uit', [na.totp_secret, na.totp_confirmed_at], [null, null]);
  ok('en de herstelcodes gaan mee', telling(db, 'SELECT COUNT(*) FROM admin_recovery_codes'), 0);
}

/* ══ 6 · DE HALVE SESSIE EN DE GRENS PER ACCOUNT — 8 oktober 2026 ═════════ */
console.log('\nde halve sessie leeft kort, en raden telt per account');
{
  db.exec('DELETE FROM admin_sessions');
  db.exec('DELETE FROM rate_limits');
  const geheim = 'JBSWY3DPEHPK3PXP';
  db.prepare("UPDATE admin_users SET totp_secret = ?, totp_confirmed_at = datetime('now') WHERE id = 1").run(geheim);
  const half = await post('/admin/login', { email: 'lucas@visuails.com', password: WACHTWOORD });
  const rij = db.prepare('SELECT expires_at FROM admin_sessions WHERE totp_pending = 1').get();
  const minuten = (Date.parse(rij.expires_at) - Date.now()) / 60000;
  ok('een halve sessie verloopt binnen een kwartier', minuten > 0 && minuten <= 15.5, true, minuten);
  latereStap();
  await post('/admin/code', { code: await codeNu(geheim) }, koekje(half));
  const heel = db.prepare('SELECT expires_at FROM admin_sessions WHERE totp_pending = 0').get();
  ok('na de code krijgt hij de volle termijn', (Date.parse(heel.expires_at) - Date.now()) / 86400000 > 7, true, heel.expires_at);

  db.exec('DELETE FROM rate_limits');
  let laatste = null;
  for (let i = 0; i < 21; i++) {
    /* Elke poging uit een ANDER /64-blok, zodat alleen de grens per account kan
       ingrijpen en niet die per IP. */
    laatste = await adminPost({
      request: new Request('https://visuails.com/admin/login', {
        method: 'POST',
        headers: { origin: 'https://visuails.com', 'cf-connecting-ip': `2001:db8:${(i + 1).toString(16)}::1` },
        body: new URLSearchParams({ email: 'lucas@visuails.com', password: 'fout' }),
      }),
      env, waitUntil() {},
    });
  }
  ok('na twintig foute pogingen op één account volgt een 429, ook vanaf steeds een ander adres', laatste.status, 429);

  /* Een volle emmer mag de eigenaar niet buitensluiten als zijn tweede stap aan
     staat: het goede wachtwoord brengt hem nog bij de code. */
  const metCode = await adminPost({
    request: new Request('https://visuails.com/admin/login', {
      method: 'POST',
      headers: { origin: 'https://visuails.com', 'cf-connecting-ip': '198.51.100.77' },
      body: new URLSearchParams({ email: 'lucas@visuails.com', password: WACHTWOORD }),
    }),
    env, waitUntil() {},
  });
  ok('met tweede stap: het goede wachtwoord gaat door naar de code', [metCode.status, metCode.headers.get('location')], [303, '/admin/code']);
  db.prepare('UPDATE admin_users SET totp_secret = NULL, totp_confirmed_at = NULL WHERE id = 1').run();
  const zonderCode = await adminPost({
    request: new Request('https://visuails.com/admin/login', {
      method: 'POST',
      headers: { origin: 'https://visuails.com', 'cf-connecting-ip': '198.51.100.78' },
      body: new URLSearchParams({ email: 'lucas@visuails.com', password: WACHTWOORD }),
    }),
    env, waitUntil() {},
  });
  ok('zonder tweede stap: een volle emmer houdt ook het goede wachtwoord tegen', zonderCode.status, 429);
  db.exec('DELETE FROM rate_limits');
  const weerOpen = await post('/admin/login', { email: 'lucas@visuails.com', password: WACHTWOORD });
  ok('en een goede inlog telt zelf niet mee', [weerOpen.status, telling(db, "SELECT COUNT(*) FROM rate_limits WHERE bucket LIKE 'admin-login-acct:%'")], [303, 0]);

  db.exec('DELETE FROM rate_limits');
  let perIp = null;
  for (let i = 0; i < 11; i++) {
    perIp = await adminPost({
      request: new Request('https://visuails.com/admin/login', {
        method: 'POST',
        headers: { origin: 'https://visuails.com', 'cf-connecting-ip': `2001:db8:aa:bb::${(i + 1).toString(16)}` },
        body: new URLSearchParams({ email: `iemand${i}@example.com`, password: 'fout' }),
      }),
      env, waitUntil() {},
    });
  }
  ok('elf pogingen uit één /64-blok lopen tegen de grens per IP', perIp.status, 429);
  db.exec('DELETE FROM rate_limits');
  db.prepare('UPDATE admin_users SET totp_secret = NULL, totp_confirmed_at = NULL WHERE id = 1').run();
}

/* ══ 7 · EEN CODE WERKT MAAR ÉÉN KEER — 8 oktober 2026 (o19) ══════════════ */
console.log('\neen 2FA-code werkt maar één keer');
{
  db.exec('DELETE FROM admin_sessions');
  db.exec('DELETE FROM rate_limits');
  const geheim = 'JBSWY3DPEHPK3PXP';
  db.prepare("UPDATE admin_users SET totp_secret = ?, totp_confirmed_at = datetime('now'), totp_last_step = NULL WHERE id = 1").run(geheim);
  const code = await codeNu(geheim);

  const eerst = await post('/admin/login', { email: 'lucas@visuails.com', password: WACHTWOORD });
  const binnen = await post('/admin/code', { code }, koekje(eerst));
  ok('de code komt de eerste keer binnen', [binnen.status, binnen.headers.get('location')], [303, '/admin']);
  ok('en zijn stap is bewaard',
    typeof db.prepare('SELECT totp_last_step FROM admin_users WHERE id = 1').get().totp_last_step, 'number');

  const tweede = await post('/admin/login', { email: 'lucas@visuails.com', password: WACHTWOORD });
  const nogEens = await post('/admin/code', { code }, koekje(tweede));
  ok('dezelfde code een tweede keer: geweigerd', nogEens.status, 401);
  ok('met een uitleg dat hij net al gebruikt is', /net al gebruikt/.test(await nogEens.text()), true);
  ok('en die halve sessie blijft half',
    telling(db, 'SELECT COUNT(*) FROM admin_sessions WHERE totp_pending = 1'), 1);

  /* Een code van een LATERE stap gaat wel: de bewaarde stap één terugzetten
     doet hetzelfde als een halve minuut wachten. */
  db.exec('UPDATE admin_users SET totp_last_step = totp_last_step - 1');
  const later = await post('/admin/code', { code }, koekje(tweede));
  ok('een nieuwere stap komt wel binnen', later.headers.get('location'), '/admin');

  /* Op /admin/security geldt hetzelfde: met een net gebruikte code gaat de
     tweede stap niet uit. */
  const sessie = koekje(eerst);
  await post('/admin/security', { doen: 'uit', code }, sessie);
  ok('uitzetten met een net gebruikte code doet niets',
    Boolean(db.prepare('SELECT totp_confirmed_at FROM admin_users WHERE id = 1').get().totp_confirmed_at), true);

  /* Zonder migratie 0052 (geen kolom) werkt het inloggen zoals vroeger: een
     vergeten migratie sluit de enige beheerder niet buiten. */
  const zonderKolom = { ...env, DB: { ...env.DB, prepare(sql) {
    if (/totp_last_step/.test(sql)) throw new Error('no such column: totp_last_step');
    return env.DB.prepare(sql);
  } } };
  db.exec('DELETE FROM admin_sessions');
  db.exec('DELETE FROM rate_limits');
  const zPost = (pad, velden, cookie = '') => adminPost({
    request: new Request(`https://visuails.com${pad}`, {
      method: 'POST',
      headers: { origin: 'https://visuails.com', ...(cookie ? { cookie: `vis_admin=${cookie}` } : {}) },
      body: new URLSearchParams(velden),
    }),
    env: zonderKolom, waitUntil() {},
  });
  const zIn = await zPost('/admin/login', { email: 'lucas@visuails.com', password: WACHTWOORD });
  const zCode = await zPost('/admin/code', { code }, koekje(zIn));
  ok('zonder de kolom: de code werkt zoals vroeger', zCode.headers.get('location'), '/admin');

  db.exec('DELETE FROM admin_sessions');
  db.exec('DELETE FROM rate_limits');
  db.prepare('UPDATE admin_users SET totp_secret = NULL, totp_confirmed_at = NULL, totp_last_step = NULL WHERE id = 1').run();
}

console.log(`\n${goed}/${totaal} geslaagd`);
if (goed !== totaal) process.exit(1);
