/*
 * VISUAILS — het vangnet vóór de beveiligingsronde (5 november 2026)
 *   npm run test:vangnet
 *
 * Lucas: "Ik heb 2FA aan staan voor /admin en dit mag niet kapot gaan terwijl je
 * aanpassingen doorvoert." Deze toets legt vast wat er NU goed werkt aan de
 * toegang tot /admin en Studio, zodat elke wijziging in de beveiligingsronde die
 * daar iets aan breekt, meteen rood wordt. Hij voegt niets toe aan de site.
 *
 *   1 · /admin van begin tot eind zoals een browser het doet, MET de tweede stap:
 *       wachtwoord, halve sessie, code, dashboard, de pagina Beveiliging, uitloggen.
 *   2 · de Origin-controle van /admin (originIsSelf). Die ging op 1 augustus 2026
 *       mis: onder `Referrer-Policy: no-referrer` stuurt Chrome `Origin: null`, en
 *       elke knop in /admin gaf een 403. Geen enkele toets keek ernaar. Hier wel:
 *       elke combinatie van Sec-Fetch-Site en Origin die een echte browser stuurt.
 *   3 · dezelfde controle voor Studio (/account).
 *   4 · de headers en koekjes waar dat op leunt: `referrer-policy: same-origin`,
 *       de CSP van /admin, HttpOnly/Secure/SameSite/Path van beide sessiekoekjes.
 *
 * Een POST naar een pad dat niet bestaat, is de proef voor de Origin-controle: komt
 * hij erdoor, dan antwoordt de server 404 ("niet gevonden"); houdt de controle hem
 * tegen, dan 403. Zo verandert de proef zelf niets.
 */
import { d1, verseDb, telling } from './lib/d1sqlite.mjs';
import { adminGet, adminPost } from '../src/lib/admin.js';
import { accountGet, accountPost } from '../src/lib/account.js';
import { portalGet } from '../src/lib/portal.js';
import { hashPassword, totpCode, mintTotpSecret, TOTP_STAP } from '../src/lib/adminAuth.js';
import { hashToken, mintToken } from '../src/lib/token.js';

let pass = 0; let fail = 0;
const ok = (naam, goed, uitleg = '') => {
  if (typeof goed !== 'boolean') throw new Error(`ok("${naam}") kreeg geen boolean`);
  if (goed) pass++; else fail++;
  console.log(`${goed ? ' ok  ' : ' FAIL'} ${String(naam).padEnd(84)} ${goed ? '' : uitleg}`);
};

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
if (mislukt.length) { console.error('schema:', mislukt); process.exit(1); }
const env = { DB: d1(db), ADMIN_ORIGIN: 'https://visuails.com' };
const WACHTWOORD = 'een-lang-en-uniek-wachtwoord-voor-het-vangnet';
db.prepare('INSERT INTO admin_users (id, email, password_hash) VALUES (1, ?, ?)').run('lucas@visuails.com', await hashPassword(WACHTWOORD));
const GEHEIM = mintTotpSecret();
db.prepare("UPDATE admin_users SET totp_secret = ?, totp_confirmed_at = datetime('now') WHERE id = 1").run(GEHEIM);

let ip = 0;
const nieuwIp = () => `10.9.${Math.floor(++ip / 250)}.${ip % 250}`;
/* Wat Chrome bij een gewone klik op een formulier in /admin meestuurt. */
const CHROME = { 'sec-fetch-site': 'same-origin', 'sec-fetch-mode': 'navigate', origin: 'https://visuails.com' };
const koekje = (res, naam = 'vis_admin') => (new RegExp(`${naam}=([^;]*)`).exec(res.headers.get('set-cookie') || '') || [])[1] || '';
const ctx = (request) => ({ request, env, waitUntil() {} });
const aPost = (pad, velden, { cookie = '', kop = CHROME } = {}) => adminPost(ctx(new Request(`https://visuails.com${pad}`, {
  method: 'POST', headers: { ...kop, 'cf-connecting-ip': nieuwIp(), ...(cookie ? { cookie: `vis_admin=${cookie}` } : {}) }, body: new URLSearchParams(velden),
})));
const aGet = (pad, cookie = '') => adminGet(ctx(new Request(`https://visuails.com${pad}`, { headers: { 'cf-connecting-ip': nieuwIp(), ...(cookie ? { cookie: `vis_admin=${cookie}` } : {}) } })));
const codeNu = async () => {
  const inStap = (Date.now() / 1000) % TOTP_STAP;
  if (inStap > TOTP_STAP - 5) await new Promise((r) => setTimeout(r, (TOTP_STAP - inStap) * 1000 + 50));
  return totpCode(GEHEIM);
};

/* ══ 1 · /admin VAN BEGIN TOT EIND, MET DE TWEEDE STAP ══════════════════════ */
console.log('\n1 · /admin van begin tot eind zoals een browser het doet, met de tweede stap');
let sessie = '';
{
  const login = await aPost('/admin/login', { email: 'lucas@visuails.com', password: WACHTWOORD });
  const half = koekje(login);
  ok('het wachtwoord stuurt naar de tweede stap', login.status === 303 && login.headers.get('location') === '/admin/code', `${login.status} ${login.headers.get('location')}`);
  ok('  met een koekje voor de halve sessie', half.length > 20);
  const scherm = await aGet('/admin/code', half);
  ok('het scherm van de tweede stap opent', scherm.status === 200 && /name="code"/.test(await scherm.text()));
  const dicht = await aGet('/admin', half);
  ok('de halve sessie opent het dashboard niet', dicht.status === 303 && dicht.headers.get('location') === '/admin/login');
  const fout = await aPost('/admin/code', { code: '000000' }, { cookie: half });
  ok('een verkeerde code komt er niet in', fout.status === 401);
  const goed = await aPost('/admin/code', { code: await codeNu() }, { cookie: half });
  ok('de goede code, met de headers van Chrome, komt binnen', goed.status === 303 && goed.headers.get('location') === '/admin', `${goed.status} ${goed.headers.get('location')}`);
  sessie = half;
  const dash = await aGet('/admin', sessie);
  ok('daarna opent het dashboard', dash.status === 200);
  const beveiliging = await aGet('/admin/security', sessie);
  const bTekst = await beveiliging.text();
  ok('de pagina Beveiliging opent en zegt dat de tweede stap aan staat', beveiliging.status === 200 && /herstelcodes/i.test(bTekst) && !/name="doen" value="bevestig"/.test(bTekst));
  ok('de tweede stap staat nog aan in de database', telling(db, 'SELECT COUNT(*) FROM admin_users WHERE totp_secret IS NOT NULL AND totp_confirmed_at IS NOT NULL') === 1);
}

/* ══ 2 · DE ORIGIN-CONTROLE VAN /admin ══════════════════════════════════════ */
console.log('\n2 · de Origin-controle van /admin (404 = erdoor, 403 = tegengehouden)');
{
  const proef = async (kop) => (await aPost('/admin/bestaat-niet', {}, { cookie: sessie, kop })).status;
  const GEVALLEN = [
    ['Chrome: same-origin met Origin van de site', { 'sec-fetch-site': 'same-origin', origin: 'https://visuails.com' }, 404],
    ['Chrome onder no-referrer: same-origin met Origin "null" (de fout van 1 augustus)', { 'sec-fetch-site': 'same-origin', origin: 'null' }, 404],
    ['same-origin zonder Origin', { 'sec-fetch-site': 'same-origin' }, 404],
    ['een browser zonder Sec-Fetch-Site, met Origin van de site', { origin: 'https://visuails.com' }, 404],
    ['cross-site, ook als Origin klopt: tegengehouden', { 'sec-fetch-site': 'cross-site', origin: 'https://visuails.com' }, 403],
    ['een andere site', { 'sec-fetch-site': 'cross-site', origin: 'https://kwaad.example' }, 403],
    ['een andere Origin zonder Sec-Fetch-Site', { origin: 'https://kwaad.example' }, 403],
    ['Origin "null" zonder Sec-Fetch-Site', { origin: 'null' }, 403],
    ['geen van beide', {}, 403],
    ['same-site (een subdomein) met een andere host', { 'sec-fetch-site': 'same-site', origin: 'https://www.visuails.com' }, 403],
  ];
  for (const [naam, kop, verwacht] of GEVALLEN) {
    const status = await proef(kop);
    ok(`${naam}: ${verwacht}`, status === verwacht, `kreeg ${status}`);
  }
  env.ALLOWED_ORIGIN_HOSTS = 'www.visuails.com';
  ok('same-site met een host uit ALLOWED_ORIGIN_HOSTS: 404', (await proef({ 'sec-fetch-site': 'same-site', origin: 'https://www.visuails.com' })) === 404);
  delete env.ALLOWED_ORIGIN_HOSTS;
  const zonder = await aPost('/admin/bestaat-niet', {}, { kop: CHROME });
  ok('zonder sessie: naar het inlogscherm, niet 404', zonder.status === 303 && zonder.headers.get('location') === '/admin/login');
  const code = await aPost('/admin/code', { code: '123456' }, { cookie: sessie, kop: { 'sec-fetch-site': 'cross-site', origin: 'https://kwaad.example' } });
  ok('de tweede stap houdt een POST van een andere site tegen (403)', code.status === 403);
}

/* ══ 3 · DE ORIGIN-CONTROLE VAN STUDIO ══════════════════════════════════════ */
console.log('\n3 · de Origin-controle van Studio (/account)');
{
  db.prepare("INSERT INTO customers (id, email, name, brand, country) VALUES (7, 'klant@vangnet.test', 'Mara', 'VANGNET', 'NL')").run();
  const klant = 'sessie-vangnet-klant-0007';
  db.prepare("INSERT INTO account_sessions (customer_id, token_hash, issued_at, expires_at) VALUES (7, ?, datetime('now'), datetime('now', '+30 days'))").run(await hashToken(klant));
  const proef = async (kop) => (await accountPost(ctx(new Request('https://visuails.com/account/bestaat-niet', {
    method: 'POST', headers: { ...kop, 'cf-connecting-ip': nieuwIp(), cookie: `vis_account=${klant}` }, body: new URLSearchParams({}),
  })))).status;
  const doorgelaten = await proef({ 'sec-fetch-site': 'same-origin', origin: 'https://visuails.com' });
  ok('Chrome: same-origin met Origin van de site komt erdoor (geen 403)', doorgelaten !== 403, `kreeg ${doorgelaten}`);
  const metNull = await proef({ 'sec-fetch-site': 'same-origin', origin: 'null' });
  ok('same-origin met Origin "null" komt erdoor (geen 403)', metNull !== 403, `kreeg ${metNull}`);
  ok('cross-site: 403', (await proef({ 'sec-fetch-site': 'cross-site', origin: 'https://visuails.com' })) === 403);
  ok('een andere site zonder Sec-Fetch-Site: 403', (await proef({ origin: 'https://kwaad.example' })) === 403);
  ok('geen van beide: 403', (await proef({})) === 403);
}

/* ══ 4 · DE HEADERS EN KOEKJES WAAR HET OP LEUNT ════════════════════════════ */
console.log('\n4 · de headers en koekjes waar dat op leunt');
{
  const loginPagina = await aGet('/admin/login');
  const dash = await aGet('/admin', sessie);
  const omleiding = await aGet('/admin');
  for (const [naam, res] of [['het inlogscherm', loginPagina], ['het dashboard', dash], ['een omleiding', omleiding]]) {
    ok(`/admin, ${naam}: referrer-policy same-origin (anders stuurt Chrome Origin "null")`, res.headers.get('referrer-policy') === 'same-origin', String(res.headers.get('referrer-policy')));
  }
  const csp = dash.headers.get('content-security-policy') || '';
  ok("/admin: de CSP blijft dicht (default-src 'none', frame-ancestors 'none', form-action 'self', geen unsafe-)", /default-src 'none'/.test(csp) && /frame-ancestors 'none'/.test(csp) && /form-action 'self'/.test(csp) && !/unsafe-/.test(csp), csp);
  ok('/admin: nosniff en HSTS', dash.headers.get('x-content-type-options') === 'nosniff' && /max-age=\d{7,}/.test(dash.headers.get('strict-transport-security') || ''));
  ok('/admin: niets in een cache (no-store)', /no-store/.test(dash.headers.get('cache-control') || ''));
  const login = await aPost('/admin/login', { email: 'lucas@visuails.com', password: WACHTWOORD });
  const sc = login.headers.get('set-cookie') || '';
  ok('het sessiekoekje van /admin: HttpOnly, Secure, SameSite=Strict, Path=/admin', /HttpOnly/.test(sc) && /Secure/.test(sc) && /SameSite=Strict/.test(sc) && /Path=\/admin(;|$)/.test(sc), sc);
  db.exec('DELETE FROM admin_sessions WHERE totp_pending = 1');
  const kl = await accountGet(ctx(new Request('https://visuails.com/account/login', { headers: { 'cf-connecting-ip': nieuwIp() } })));
  ok('Studio, het inlogscherm: referrer-policy same-origin', kl.headers.get('referrer-policy') === 'same-origin', String(kl.headers.get('referrer-policy')));
  ok('Studio: frame-ancestors none', /frame-ancestors 'none'/.test(kl.headers.get('content-security-policy') || ''), String(kl.headers.get('content-security-policy')));
  const portaal = await portalGet(ctx(new Request(`https://visuails.com/o/${await mintToken()}`, { headers: { 'cf-connecting-ip': nieuwIp() } })));
  ok('de privélink (ook een onbekende): referrer-policy same-origin of strenger', ['same-origin', 'no-referrer'].includes(String(portaal.headers.get('referrer-policy'))), String(portaal.headers.get('referrer-policy')));
}

/* ══ 5 · UITLOGGEN SLUIT DE SESSIE ══════════════════════════════════════════ */
console.log('\n5 · uitloggen sluit de sessie');
{
  const uit = await aPost('/admin/logout', {}, { cookie: sessie });
  ok('uitloggen gaat naar het inlogscherm en wist het koekje', uit.status === 303 && /vis_admin=;/.test(uit.headers.get('set-cookie') || '') && /Max-Age=0/.test(uit.headers.get('set-cookie') || ''));
  const daarna = await aGet('/admin', sessie);
  ok('het oude koekje opent daarna niets meer', daarna.status === 303 && daarna.headers.get('location') === '/admin/login');
  ok('de tweede stap staat na dit alles nog steeds aan', telling(db, 'SELECT COUNT(*) FROM admin_users WHERE totp_secret IS NOT NULL AND totp_confirmed_at IS NOT NULL') === 1);
}

console.log(`\n${pass} goed, ${fail} fout`);
process.exit(fail ? 1 : 0);
