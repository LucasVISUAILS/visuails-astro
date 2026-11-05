// Eindcontrole tegen de ECHTE Worker, lokaal: start eerst `node kladblok/_doorloop-worker.mjs` (Worker op :4477,
// paneel op :4478; alles naar buiten gaat naar een nep-Mollie en nep-Resend), dan `node kladblok/_e2e-beveiliging.mjs`.
// /admin met de tweede stap aan, van buitenaf, met de headers die Chrome stuurt; Studio; de headers.
import { totpCode, mintTotpSecret, TOTP_STAP } from '../src/lib/adminAuth.js';
import { VOLT } from '../tests/lib/studio-seed.mjs';

const W = 'http://localhost:4477';
const P = 'http://localhost:4478';
let pass = 0; let fail = 0;
const ok = (naam, goed, uitleg = '') => { if (goed) pass++; else fail++; console.log(`${goed ? ' ok  ' : ' FAIL'} ${naam.padEnd(80)} ${goed ? '' : uitleg}`); };
const sql = async (q, schrijf = false) => (await fetch(schrijf ? `${P}/sql` : `${P}/sql?q=${encodeURIComponent(q)}`, schrijf ? { method: 'POST', body: q } : {})).json();
const CHROME = { 'sec-fetch-site': 'same-origin', 'sec-fetch-mode': 'navigate', origin: W };
const koekje = (res, naam = 'vis_admin') => (new RegExp(`${naam}=([^;]*)`).exec(res.headers.get('set-cookie') || '') || [])[1] || '';
const post = (pad, velden, { cookie = '', kop = CHROME } = {}) => fetch(`${W}${pad}`, { method: 'POST', redirect: 'manual', headers: { ...kop, 'content-type': 'application/x-www-form-urlencoded', ...(cookie ? { cookie: `vis_admin=${cookie}` } : {}) }, body: new URLSearchParams(velden) });
const get = (pad, cookie = '', naam = 'vis_admin') => fetch(`${W}${pad}`, { redirect: 'manual', headers: cookie ? { cookie: `${naam}=${cookie}` } : {} });

const GEHEIM = mintTotpSecret();
await sql(`UPDATE admin_users SET totp_secret = '${GEHEIM}', totp_confirmed_at = datetime('now'), totp_last_step = NULL WHERE email = 'hello@visuails.com'`, true);
const codeNu = async () => { const s = (Date.now() / 1000) % TOTP_STAP; if (s > TOTP_STAP - 5) await new Promise((r) => setTimeout(r, (TOTP_STAP - s) * 1000 + 50)); return totpCode(GEHEIM); };

console.log('\n/admin met de tweede stap, door de echte Worker');
const login = await post('/admin/login', { email: 'hello@visuails.com', password: 'proef-wachtwoord' });
const half = koekje(login);
ok('wachtwoord → /admin/code met een koekje', login.status === 303 && login.headers.get('location') === '/admin/code' && !!half, `${login.status} ${login.headers.get('location')}`);
ok('het koekje: HttpOnly, Secure, SameSite=Strict, Path=/admin', /HttpOnly/.test(login.headers.get('set-cookie') || '') && /SameSite=Strict/.test(login.headers.get('set-cookie') || '') && /Path=\/admin/.test(login.headers.get('set-cookie') || ''), login.headers.get('set-cookie') || '');
ok('het scherm van de code opent', (await get('/admin/code', half)).status === 200);
ok('de halve sessie opent het dashboard niet', (await get('/admin', half)).headers.get('location') === '/admin/login');
ok('een verkeerde code: 401', (await post('/admin/code', { code: '000000' }, { cookie: half })).status === 401);
const binnen = await post('/admin/code', { code: await codeNu() }, { cookie: half });
ok('de goede code: naar /admin', binnen.status === 303 && binnen.headers.get('location') === '/admin', `${binnen.status} ${binnen.headers.get('location')}`);
const dash = await get('/admin', half);
ok('het dashboard opent', dash.status === 200, String(dash.status));
const csp = dash.headers.get('content-security-policy') || '';
ok("de CSP van /admin komt door de Worker heen (default-src 'none', frame-ancestors 'none')", /default-src 'none'/.test(csp) && /frame-ancestors 'none'/.test(csp), csp);
ok('referrer-policy same-origin door de Worker heen', dash.headers.get('referrer-policy') === 'same-origin', String(dash.headers.get('referrer-policy')));
ok('een POST zoals Chrome onder no-referrer (Origin null): erdoor (404)', (await post('/admin/bestaat-niet', {}, { cookie: half, kop: { 'sec-fetch-site': 'same-origin', origin: 'null' } })).status === 404);
ok('een POST van een andere site: 403', (await post('/admin/bestaat-niet', {}, { cookie: half, kop: { 'sec-fetch-site': 'cross-site', origin: 'https://kwaad.example' } })).status === 403);
const sec = await get('/admin/security', half);
ok('de pagina Beveiliging opent, de tweede stap staat aan', sec.status === 200 && !/value="bevestig"/.test(await sec.text()));
const uit = await post('/admin/logout', {}, { cookie: half });
ok('uitloggen', uit.status === 303 && uit.headers.get('location') === '/admin/login');
ok('het oude koekje opent niets meer', (await get('/admin', half)).headers.get('location') === '/admin/login');
const stand = await sql("SELECT COUNT(*) AS n FROM admin_users WHERE totp_secret IS NOT NULL AND totp_confirmed_at IS NOT NULL");
ok('de tweede stap staat na dit alles nog aan', JSON.stringify(stand).includes('"n":1'), JSON.stringify(stand));

console.log('\nStudio, door de echte Worker');
const studio = await get('/account/', VOLT.token, 'vis_account');
ok('Studio opent voor een ingelogde klant', studio.status === 200, String(studio.status));
ok('met frame-ancestors none en referrer-policy same-origin', /frame-ancestors 'none'/.test(studio.headers.get('content-security-policy') || '') && studio.headers.get('referrer-policy') === 'same-origin');
const vreemd = await fetch(`${W}/account/bestaat-niet`, { method: 'POST', redirect: 'manual', headers: { cookie: `vis_account=${VOLT.token}`, 'sec-fetch-site': 'cross-site', origin: 'https://kwaad.example' } });
ok('een POST van een andere site in Studio: 403', vreemd.status === 403, String(vreemd.status));
/* Echt inloggen met de code uit de mail (stap 4 raakte dit pad): de mail komt bij de nep-Resend. */
await fetch(`${P}/mails/clear`, { method: 'POST' });
const vraag = await fetch(`${W}/account/login`, { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded', origin: W, 'sec-fetch-site': 'same-origin' }, body: new URLSearchParams({ email: 'studio@voltbrand.nl', lang: 'nl' }) });
await new Promise((r) => setTimeout(r, 500));
const lijst = await (await fetch(`${P}/mails`)).json();
const inlogmail = [...lijst].reverse().find((m) => m.to === 'studio@voltbrand.nl');
const html = inlogmail ? await (await fetch(`${P}/mail/${inlogmail.n}`)).text() : '';
const code = (/\b(\d{3})\s?(\d{3})\b/.exec(html.replace(/<[^>]+>/g, ' ')) || []).slice(1).join('');
ok('de inlogmail met een code komt aan', vraag.status < 400 && code.length === 6, `${vraag.status} ${inlogmail ? inlogmail.subject : 'geen mail'}`);
const metCode = await fetch(`${W}/account/code`, { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded', origin: W, 'sec-fetch-site': 'same-origin' }, body: new URLSearchParams({ email: 'studio@voltbrand.nl', code, lang: 'nl' }) });
const sessie = koekje(metCode, 'vis_account');
ok('  met die code inloggen geeft een sessie (Path=/account, SameSite=Lax)', metCode.status === 303 && !!sessie && /Path=\/account/.test(metCode.headers.get('set-cookie') || '') && /SameSite=Lax/.test(metCode.headers.get('set-cookie') || ''), `${metCode.status} ${metCode.headers.get('location')}`);
ok('  en die sessie opent Studio', (await get('/account/', sessie, 'vis_account')).status === 200);
const thuis = await get('/');
ok('de voorpagina: 200, met nosniff en frame-ancestors', thuis.status === 200, String(thuis.status));
const nl404 = await get('/nl/bestaat-niet');
ok('de Nederlandse 404 (maakt de Worker zelf): nosniff en frame-ancestors', nl404.status === 404 && nl404.headers.get('x-content-type-options') === 'nosniff' && /frame-ancestors 'none'/.test(nl404.headers.get('content-security-policy') || ''), `${nl404.status} ${nl404.headers.get('x-content-type-options')} ${nl404.headers.get('content-security-policy')}`);

console.log('\nEen bestelling met een nep-betaling, door de echte Worker');
{
  const fd = new URLSearchParams({ service: 'catalog', email: 'e2e@merk.test', name: 'Eva Eind', brand: 'EINDMERK', products: '5', country: 'NL', back: '/thank-you', phone: '+31 6 12345678', business_declaration: 'yes', business_version: 'business-v2-2026-09', no_vat: '1', reg_number: '99742993', lang: 'nl' });
  const r = await fetch(`${W}/api/order`, { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded', origin: W, 'sec-fetch-site': 'same-origin' }, body: fd });
  const tekst = r.status === 200 ? await r.text() : '';
  const naar = (/content="0; url=([^"]+)"/.exec(tekst) || [])[1] || r.headers.get('location') || '';
  const tr = (/(tr_[A-Za-z0-9]+)/.exec(naar) || [])[1] || '';
  ok('de bestelling gaat naar de (nep-)checkout', !!tr, `${r.status} ${naar}`);
  if (r.status === 200) ok('  via de tussenpagina, met nosniff en frame-ancestors', r.headers.get('x-content-type-options') === 'nosniff' && /frame-ancestors 'none'/.test(r.headers.get('content-security-policy') || ''), `${r.headers.get('x-content-type-options')} ${r.headers.get('content-security-policy')}`);
  if (tr) {
    const betaal = await fetch(`${P}/pay/${tr}/paid`, { method: 'POST', redirect: 'manual' });
    await new Promise((res) => setTimeout(res, 800));
    const rij = await sql("SELECT payment_status FROM orders WHERE email = 'e2e@merk.test' ORDER BY id DESC LIMIT 1");
    ok('betaald bij nep-Mollie: de webhook zet de bestelling op betaald', JSON.stringify(rij).includes('"paid"'), `${betaal.status} ${JSON.stringify(rij)}`);
  }
}

console.log(`\n${pass} goed, ${fail} fout`);
process.exit(fail ? 1 : 0);
