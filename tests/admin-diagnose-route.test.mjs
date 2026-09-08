/*
 * ═══════════════════════════════════════════════════════════════════════════
 * DE DIAGNOSE ZIT IN DE PADTABEL, EN NIET ERNAAST
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 23 augustus 2026. `functions/admin/debug-mollie.js` was een STATISCH
 * routebestand, en dat wint in Pages Functions van de catch-all `[[path]].js`.
 * Daarmee viel het buiten de padtabel in src/lib/admin.js — en dus buiten de
 * ene centrale originIsSelf()-controle die daar vóór de hele POST-tabel staat.
 *
 * Het had wél een sessiecontrole. Maar het sessiecookie is `SameSite=Lax`, en
 * dat wordt bij een gewone navigatie van buitenaf meegestuurd: één aangeklikte
 * link naar /admin/debug-mollie terwijl je ingelogd bent, en de GET maakte twee
 * echte betalingen aan bij Mollie.
 *
 * Deze test bewaakt drie dingen, en de eerste is de belangrijkste omdat hij
 * over de hele MAP gaat en niet over dit ene bestand:
 *
 *   1 · er staat geen enkel los routebestand naast de vangroute;
 *   2 · de leesroute hangt achter de sessiecontrole;
 *   3 · de route die iets AANMAAKT is een POST en hangt achter originIsSelf().
 */
import { readdirSync } from 'node:fs';
import { adminGet, adminPost } from '../src/lib/admin.js';
import { mintToken } from '../src/lib/token.js';

let geslaagd = 0, gezakt = 0;
function ok(naam, waarde, verwacht = true, extra = '') {
  const goed = JSON.stringify(waarde) === JSON.stringify(verwacht);
  if (goed) geslaagd++; else gezakt++;
  console.log(`${goed ? ' ok ' : 'FAIL'}   ${naam.padEnd(60)} ${goed ? '' : `verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(waarde)}`} ${extra}`);
}

/* ══ 1 · GEEN LOS ROUTEBESTAND NAAST DE PADTABEL ═══════════════════════════
 *
 * Dit is de regel, niet de uitzondering. Elk bestand hier dat geen `[[path]].js`
 * of `index.js` is, wint van de catch-all en krijgt daarmee de centrale
 * controles NIET. Wie er een neerzet, hoort hier tegenaan te lopen.
 */
/* ── DE MAP IS VERHUISD, HET GEVAAR NIET — 7 september 2026 ─────────────────
 *
 * Dit stuk keek in functions/admin en functions/account. Die mappen bestaan niet
 * meer: sinds de site één Worker is (zie wrangler.toml) draait er van /functions
 * alleen nog functions/api/*, dat vanuit src/pages/api/ geïmporteerd wordt, en de
 * drie lege routemappen zijn vandaag verwijderd.
 *
 * De REGEL is ongewijzigd, alleen het adres. Astro kiest een statische route
 * (`/admin/iets`) vóór een vangroute (`[...path].js`), net zoals Pages Functions
 * een los bestand vóór `[[path]].js` koos. Wie hier een bestand neerzet, staat
 * dus opnieuw buiten de padtabel in src/lib/admin.js en daarmee buiten de ene
 * centrale originIsSelf()-controle. Dat is letterlijk debug-mollie.js opnieuw.
 *
 * /admin en /o mogen dus ALLEEN de vangroute bevatten.
 *
 * /account is de uitzondering, en met reden: de zeven schermen daar zijn
 * Astro-pagina's die studioScreen() aanroepen, en die doet de sessie, de
 * omleidingen en de rechten — dezelfde poort, alleen via een andere deur. Wat er
 * NIET mag staan is een .js: dat zou een endpoint zijn dat zijn eigen
 * controles moet meebrengen. */
console.log('\nnaast de vangroute staat geen los routebestand');
{
  for (const [map, mag] of [['src/pages/admin', ['[...path].js']], ['src/pages/o', ['[...token].js']]]) {
    const los = readdirSync(new URL('../' + map, import.meta.url)).filter((n) => !mag.includes(n));
    ok(`${map} bevat alleen de vangroute`, los, [], los.length ? `los: ${los.join(', ')}` : '');
  }
  /* In /account mag een scherm, maar geen tweede endpoint. */
  const account = readdirSync(new URL('../src/pages/account', import.meta.url), { recursive: true })
    .map((n) => String(n).replace(/\\/g, '/'));
  const losseJs = account.filter((n) => n.endsWith('.js') && n !== '[...path].js');
  ok('src/pages/account bevat maar één endpoint', losseJs, [], losseJs.length ? `los: ${losseJs.join(', ')}` : '');

  /* En het bestand dat dit alles veroorzaakte is echt weg, niet hernoemd of
     verplaatst. Zoeken in de hele boom, want "weg" moet weg betekenen. */
  const overal = readdirSync(new URL('../', import.meta.url), { recursive: true })
    .map((n) => String(n).replace(/\\/g, '/'))
    .filter((n) => !n.startsWith('node_modules') && !n.startsWith('dist') && !n.startsWith('.git'));
  ok('debug-mollie.js bestaat nergens meer', overal.some((n) => n.endsWith('debug-mollie.js')), false);
}

/* ══ 2 · DE TWEE ROUTES ZITTEN IN DE GOEDE HELFT VAN DE TABEL ══════════════ */
console.log('\nde routes staan in de padtabel, aan de goede kant van de poort');
{
  const bron = await (await import('node:fs/promises')).readFile(
    new URL('../src/lib/admin.js', import.meta.url), 'utf8'
  );
  const iGet = bron.indexOf('export async function adminGet');
  const iPost = bron.indexOf('export async function adminPost');
  const iPoort = bron.indexOf('if (!originIsSelf(request, env))');
  const iLees = bron.indexOf("if (path === '/admin/diagnose') return renderDiagnose");
  const iProbe = bron.indexOf("if (path === '/admin/diagnose/probe') return handleDiagnoseProbe");

  ok('de leesroute staat in adminGet', iLees > iGet && iLees < iPost);
  ok('de proberoute staat in adminPost', iProbe > iPost);
  ok('en NA de originIsSelf-poort', iProbe > iPoort);
  /* De volgorde is het hele punt: staat hij ervóór, dan is hij even onbeschermd
     als het losse bestand was. */
  ok('de poort staat dus tussen adminPost en de proberoute', iPost < iPoort && iPoort < iProbe);
}

/* ══ 3 · EN HET GEDRAG, DOOR DE ECHTE HANDLERS HEEN ════════════════════════ */

/** Een omgeving met een geldige adminsessie, en verder zo min mogelijk. */
function omgeving() {
  const db = {
    prepare(sql) {
      const s = sql.replace(/\s+/g, ' ');
      const st = {
        bind() { return st; },
        async first() {
          if (s.includes('FROM admin_sessions') || s.includes('FROM admin_users')) {
            return { admin_id: 1, id: 1, email: 'hello@visuails.com', expires_at: '2099-01-01' };
          }
          return null;
        },
        async all() { return { results: [] }; },
        async run() { return { success: true, meta: { changes: 0 } }; },
      };
      return st;
    },
    async batch() { return []; },
  };
  return { DB: db, MOLLIE_API_KEY: 'test_0123456789abcdefghijklmnopqrstuv', RESEND_API_KEY: 're_nep' };
}

async function verzoek(method, pad, { cookie = true, origin = 'https://visuails.com' } = {}) {
  const token = await mintToken();
  const headers = {};
  if (cookie) headers.cookie = `vis_admin=${token}`;
  if (method === 'POST' && origin) headers.origin = origin;
  const request = new Request(`https://visuails.com${pad}`, { method, headers });
  const context = { request, env: omgeving(), waitUntil() {} };
  return method === 'POST' ? adminPost(context) : adminGet(context);
}

console.log('\nde leesroute vraagt een sessie en raakt Mollie niet aan');
{
  const zonder = await verzoek('GET', '/admin/diagnose', { cookie: false });
  ok('zonder sessie: doorverwijzing naar de inlogpagina', zonder.status, 303);
  ok('en wel naar /admin/login', zonder.headers.get('location'), '/admin/login');

  /* GEEN ENKELE FETCH. Dat is de kern van de splitsing: de GET kijkt alleen naar
     de vorm van de secrets en praat met niemand. Zou iemand de probes ooit
     terugzetten in de leesroute, dan telt deze regel ze. */
  const echt = globalThis.fetch;
  let geteld = 0;
  globalThis.fetch = async (...a) => { geteld++; return echt(...a); };
  const met = await verzoek('GET', '/admin/diagnose');
  globalThis.fetch = echt;

  ok('met sessie: 200', met.status, 200);
  ok('en er is geen enkel extern verzoek gedaan', geteld, 0);
  const html = await met.text();
  ok('de pagina noemt de secrets bij naam', /MOLLIE_API_KEY/.test(html) && /RESEND_API_KEY/.test(html));
  ok('en toont geen enkele waarde', /test_0123456789/.test(html), false);
  ok('er staat een knop naar de POST', /action="\/admin\/diagnose\/probe"/.test(html));
}

console.log('\nde proberoute hangt achter sessie én origin');
{
  const zonder = await verzoek('POST', '/admin/diagnose/probe', { cookie: false });
  ok('zonder sessie: doorverwijzing', zonder.status, 303);

  const vreemd = await verzoek('POST', '/admin/diagnose/probe', { origin: 'https://kwaadaardig.example' });
  ok('met sessie maar een vreemde origin: 403', vreemd.status, 403);
  const tekst = await vreemd.text();
  ok('en er is niets uitgevoerd', /Request origin did not match/.test(tekst));

  const geen = await verzoek('POST', '/admin/diagnose/probe', { origin: null });
  ok('zonder origin-kop: ook 403', geen.status, 403);

  /* En met een goede origin loopt hij wél — met een gestubde fetch, zodat deze
     test nooit een echte betaling bij Mollie aanmaakt. */
  const echt = globalThis.fetch;
  const geraakt = [];
  globalThis.fetch = async (url) => {
    geraakt.push(String(url));
    return new Response(JSON.stringify({ count: 0, _embedded: { methods: [] } }), {
      status: 200, headers: { 'content-type': 'application/json' },
    });
  };
  const goed = await verzoek('POST', '/admin/diagnose/probe');
  globalThis.fetch = echt;

  ok('met een goede origin: 200', goed.status, 200);
  ok('en hij praat met Mollie', geraakt.some((u) => u.startsWith('https://api.mollie.com/v2')));
  const json = JSON.parse(await goed.text());
  ok('het antwoord draagt de vier probes',
    Object.keys(json.probes || {}).sort(), ['A_transport', 'B_auth', 'C_minimalPayment', 'D_realPayment']);
  ok('en geen enkele secretwaarde', /test_0123456789abcdefghijklmnopqrstuv/.test(JSON.stringify(json)), false);
}

console.log(`\n${geslaagd}/${geslaagd + gezakt} geslaagd`);
if (gezakt) process.exitCode = 1;
