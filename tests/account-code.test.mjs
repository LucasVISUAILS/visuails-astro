// VISUAILS — de zescijferige inlogcode, en waarom hij niet te raden is.
// 7 augustus 2026.
//
// WAAROM DIT BESTAAT. De code is het enige geheim in dit project dat een mens
// kán raden. Zes cijfers zijn twintig bits; wat hem draagt is niet de lengte
// maar drie grenzen eromheen, en elke grens is een regel code die per ongeluk
// weg kan vallen zonder dat er iets zichtbaar stukgaat:
//
//   1 · TIEN MINUTEN. Verloopt hij niet, dan wordt van twintig bits een
//       kwestie van geduld.
//   2 · VIJF POGINGEN, en dan is de code dood. Telt de teller niet op, of
//       overleeft de code zijn eigen limiet, dan is een miljoen gokjes een
//       middagje werk.
//   3 · EÉN CODE PER KLANT. Doodt een nieuwe aanvraag de vorige niet, dan
//       koopt elke aanvraag er vijf pogingen bij op een code die nog geldig
//       is — tien aanvragen zijn dan vijftig gokken tegelijk.
//
// En één ding dat geen grens is maar een belofte: het scherm mag NOOIT
// verklappen of een e-mailadres bekend is. Een onbekend adres en een verkeerd
// overgetypte code krijgen hetzelfde antwoord, dezelfde statuscode, dezelfde
// zin. Dat is de reden dat handleCodePost() nergens "dit adres kennen we niet"
// zegt, en het is met een test makkelijker vast te houden dan met discipline.
//
// De vierde regel test wat er NA de vijfde misser gebeurt. Lucas: *"Misschien
// na een paar keer fout invullen alsnog een mail sturen om in te loggen."* De
// mail is er al — dus de code sterft en de link in diezelfde mail blijft leven,
// en het scherm zegt dat. Een doodlopende weg zou hier de echte fout zijn.
import { accountPost } from '../src/lib/account.js';
import { hashToken } from '../src/lib/token.js';

let fails = 0;
const check = (name, cond, got = '') => {
  console.log(`${cond ? ' ok  ' : 'FAIL '} ${String(name).padEnd(60)} ${got}`);
  if (!cond) fails++;
};

const CUSTOMER_ID = 7;
const EMAIL = 'studio@voltbrand.nl';
const CODE = '048210';
const soon = () => new Date(Date.now() + 9 * 60000).toISOString();
const past = () => new Date(Date.now() - 60000).toISOString();

/**
 * Een D1 die één account_tokens-rij kent. Hij doet de WHERE van de echte query
 * na — adres moet matchen én er moet een code op de rij staan — want anders
 * test dit de stub in plaats van de handler.
 */
function makeDb(row) {
  const writes = [];
  const state = row ? { ...row } : null;
  const db = {
    writes,
    state,
    prepare(sql) {
      const st = {
        sql,
        _b: [],
        bind(...a) { st._b = a; return st; },
        async first() {
          if (/FROM account_tokens at/.test(sql)) {
            if (!state || st._b[0] !== EMAIL || !state.code_hash) return null;
            return state;
          }
          return null; // rate_limits: geen rij leest overal als "mag"
        },
        async all() { return { results: [] }; },
        async run() {
          writes.push(sql.replace(/\s+/g, ' ').trim());
          // De pogingenteller echt laten oplopen, inclusief het doodgaan van de
          // code op de laatste — anders bewijst de vierde test niets.
          if (state && /UPDATE account_tokens\s+SET code_attempts = code_attempts \+ 1/.test(sql)) {
            state.code_attempts += 1;
            if (state.code_attempts >= st._b[1]) state.code_hash = null;
          }
          return {};
        },
      };
      return st;
    },
    async batch(list) {
      for (const st of list) writes.push((st.sql || '').replace(/\s+/g, ' ').trim());
      return [];
    },
  };
  return db;
}

async function post(fields, db) {
  const request = new Request('https://visuails.com/account/code', {
    method: 'POST',
    body: new URLSearchParams({ lang: 'nl', ...fields }),
    headers: { origin: 'https://visuails.com', 'content-type': 'application/x-www-form-urlencoded' },
  });
  const res = await accountPost({ request, env: { DB: db }, waitUntil() {} });
  const body = res.status === 303 ? '' : await res.text();
  return {
    status: res.status,
    body,
    cookie: res.headers.get('set-cookie') || '',
    to: res.headers.get('location') || '',
    writes: db.writes,
  };
}

const liveRow = async (over = {}) => ({
  id: 11,
  customer_id: CUSTOMER_ID,
  code_hash: await hashToken(`${CUSTOMER_ID}:${CODE}`),
  code_expires_at: soon(),
  code_attempts: 0,
  expires_at: new Date(Date.now() + 3600_000).toISOString(),
  used_at: null,
  ...over,
});

// ── 1 · DE GOEDE AFLOOP ──────────────────────────────────────────────────────
console.log('\n── de code werkt ──');
{
  const db = makeDb(await liveRow());
  const r = await post({ email: EMAIL, code: CODE }, db);
  check('the right code signs you in', r.status === 303 && /vis_account=/.test(r.cookie), r.status);
  check('and lands on the dashboard', r.to === '/account', r.to);
  check('the code is burned on the way in',
    r.writes.some((w) => /UPDATE account_tokens SET code_hash = NULL/.test(w)));
  check('a session is created', r.writes.some((w) => /INSERT INTO account_sessions/.test(w)));
  // Een code uit een mail overtypen bewijst hetzelfde als een link uit die mail
  // openen: dat je bij dat postvak kunt.
  check('and the address counts as verified',
    r.writes.some((w) => /email_verified = 1/.test(w)));
}

{
  // Mensen typen "048 210" over van hun scherm. Dat moet werken, en plakken ook.
  const db = makeDb(await liveRow());
  const r = await post({ email: EMAIL, code: ' 048 210 ' }, db);
  check('spaces in the typed code are ignored', r.status === 303, r.status);
}

// ── 2 · DE DRIE GRENZEN ──────────────────────────────────────────────────────
console.log('\n── en anders niet ──');
{
  const db = makeDb(await liveRow());
  const r = await post({ email: EMAIL, code: '111111' }, db);
  check('a wrong code does not sign you in', r.status !== 303 && !/vis_account=/.test(r.cookie), r.status);
  check('the attempt is counted',
    r.writes.some((w) => /code_attempts = code_attempts \+ 1/.test(w)));
  // GEEN TELLER OP HET SCHERM, en dat is geen vergeetachtigheid: hij zou
  // alleen verschijnen bij een adres dat bestaat, en daarmee is het een
  // opsommingsorakel. Zie de sectie hieronder.
  check('and says nothing about how many tries are left', !/poging/.test(r.body));
}

{
  const db = makeDb(await liveRow({ code_expires_at: past() }));
  const r = await post({ email: EMAIL, code: CODE }, db);
  check('an expired code is refused even when it matches', r.status !== 303, r.status);
  check('and nothing is written for it', !db.writes.some((w) => /INSERT INTO account_sessions/.test(w)));
}

{
  // DE BELANGRIJKSTE. Vijf keer mis, en dan moet de code dood zijn — ook als de
  // zesde poging toevallig de juiste is.
  const db = makeDb(await liveRow());
  for (let i = 0; i < 5; i++) await post({ email: EMAIL, code: '111111' }, db);
  check('five wrong tries kill the code', db.state.code_hash === null, String(db.state.code_hash));
  const r = await post({ email: EMAIL, code: CODE }, db);
  check('and the right code no longer works after that',
    r.status !== 303 && !/vis_account=/.test(r.cookie), r.status);
  // Lucas: "ook als je de code bent vergeten gaat het via mail." De mail is er
  // al — dus dit is geen doodlopende weg maar een verwijzing terug.
  check('the screen points back at the link in the same email',
    /link in dezelfde mail/.test(r.body), r.body.includes('link in dezelfde mail'));
  check('and offers a fresh one', /action="\/account\/login"/.test(r.body));
}

// ── 3 · WAT ER NIET UIT MAG LEKKEN ───────────────────────────────────────────
console.log('\n── geen account-opsomming ──');
{
  const known = makeDb(await liveRow());
  const a = await post({ email: EMAIL, code: '111111' }, known);
  const b = await post({ email: 'niemand@example.com', code: '111111' }, makeDb(null));
  check('an unknown address answers with the same status', a.status === b.status, `${a.status} / ${b.status}`);
  // De enige verschillen tussen de twee pagina's mogen het ingevulde adres en
  // de resterende pogingen zijn — nergens een zin over of het adres bestaat.
  // Het ENIGE verschil mag het ingevulde adres zijn — dat de bezoeker zelf net
  // heeft ingetypt. Verder letter voor letter dezelfde pagina.
  const strip = (s) => s.replace(/value="[^"]*"/g, '');
  check('and with the same page, letter for letter', strip(a.body) === strip(b.body));
  check('nothing on it says the address is unknown', !/onbekend|bestaat niet|geen account/i.test(b.body));
}

{
  const db = makeDb(await liveRow());
  const r = await post({ email: EMAIL, code: '12345' }, db);
  check('five digits is refused before any lookup', r.status !== 303, r.status);
  check('and costs no attempt', !db.writes.some((w) => /code_attempts/.test(w)));
}

// ── 4 · ZONDER MIGRATIE 0017 ─────────────────────────────────────────────────
console.log('\n── als 0017 nog niet gedraaid is ──');
{
  const db = makeDb(await liveRow());
  const original = db.prepare.bind(db);
  db.prepare = (sql) => {
    const st = original(sql);
    if (/FROM account_tokens at/.test(sql)) {
      st.first = async () => { throw new Error('no such column: code_hash'); };
    }
    return st;
  };
  const r = await post({ email: EMAIL, code: CODE }, db);
  check('a missing column does not 500', r.status === 400, r.status);
  check('and the page sends them to the link instead', /link in de mail/.test(r.body));
}

// ── 5 · LOGIN-CSRF ───────────────────────────────────────────────────────────
console.log('\n── van een andere site ──');
{
  // Deze route maakt een sessie, dus een vervalste POST van buitenaf zou het
  // slachtoffer kunnen inloggen op het account van de AANVALLER — waarna hij
  // zijn foto's daarin uploadt. /account/login heeft dat probleem niet (die
  // stuurt alleen een mail), en daarom staat de Origin-controle in deze
  // handler zelf in plaats van in de gedeelde reeks verderop.
  const db = makeDb(await liveRow());
  const request = new Request('https://visuails.com/account/code', {
    method: 'POST',
    body: new URLSearchParams({ lang: 'nl', email: EMAIL, code: CODE }),
    headers: { origin: 'https://evil.example', 'content-type': 'application/x-www-form-urlencoded' },
  });
  const res = await accountPost({ request, env: { DB: db }, waitUntil() {} });
  check('a cross-site post cannot create a session', res.status === 403, res.status);
  check('and writes nothing', !db.writes.some((w) => /INSERT INTO account_sessions/.test(w)));
}

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
if (fails) process.exit(1);
