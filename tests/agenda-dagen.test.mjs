/*
 * ═══════════════════════════════════════════════════════════════════════════
 * DE AGENDA DICHTZETTEN — DE KNOP DIE ER NIET WAS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `blackout_days` bestaat sinds migratie 0001 en werd sindsdien alleen GELEZEN.
 * De poort sloeg zo'n dag netjes over, capacity.js rekende eromheen, en er was
 * geen enkel scherm om er een rij in te zetten. Sinds Lucas op 31 augustus 2026
 * zei *"ik ben namelijk ook in het weekend gewoon in te plannen"* is dat geen
 * ontbrekend gemak meer maar een gat in een belofte: het weekend staat open
 * TENZIJ hij hem dichtzet, en dichtzetten kon hij niet.
 *
 * ── WAT HIER WORDT VASTGELEGD, EN WAAROM JUIST DAT ─────────────────────────
 *
 * §1 het scherm biedt de handeling aan — een formulier, geen JavaScript, want
 *    dit paneel draait er geen (`default-src 'none'`).
 * §2 dichtzetten schrijft één rij, openzetten haalt hem weg, en allebei komen
 *    ze in het logboek terecht. Een dag die dicht ging zonder dat ergens staat
 *    waarom, is over drie maanden een raadsel.
 * §3 DE TUSSENSTAP. Een dag waarop al werk staat, gaat niet in één klik dicht.
 *    Dit is de kern van het bestand: dichtzetten breekt niets wat je ziet — de
 *    bestelling houdt haar venster, de klant heeft haar mail nog — en precies
 *    daarom moet het scherm eerst laten lezen wie erop staat.
 * §4 de weigeringen: geen datum, geen reden, een dag in het verleden, een
 *    jaartal dat is verschreven.
 * §5 EN DE STILLE: dit scherm las een DERDE agenda. Twee eigen query's die op
 *    readCalendar() leken maar het niet waren — een vastgezet wachtrij-item
 *    telde hier niet mee en een verlopen onbetaald venster telde hier nog wel.
 *    Twee kanten op fout, in het ene scherm waarop hij beslist of er nog iets
 *    bij kan.
 */

import { readFileSync } from 'node:fs';
import { adminGet, adminPost } from '../src/lib/admin.js';
import { mintToken } from '../src/lib/token.js';

let fails = 0;
let totaal = 0;
const check = (naam, cond, got = '') => {
  totaal += 1;
  if (!cond) fails += 1;
  console.log(`${cond ? ' ok  ' : 'FAIL '} ${String(naam).padEnd(60)} ${cond ? '' : got}`);
};
const section = (n) => console.log(`\n${n}`);

const VANDAAG = new Date().toISOString().slice(0, 10);
const dag = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

/* Eén bestelling met een venster over overmorgen heen — de dag die §3 gebruikt. */
const ORDERS = [
  {
    id: 91, ref: 'VIS-8K2-QQ1', brand: 'VOLT', name: 'Mara', service: 'catalog',
    status: 'received', tier: 'attended', lang: 'nl', product_count: 10,
    window_start: dag(2), window_end: dag(3), created_at: VANDAAG, payment_status: 'paid',
  },
];

function makeEnv({ dicht = [] } = {}) {
  const writes = [];
  const prepared = [];
  const dagen = [...dicht];

  const pick = (sql, binds) => {
    const s = sql.replace(/\s+/g, ' ');
    if (s.includes('FROM admin_sessions') || s.includes('FROM admin_users')) {
      return { admin_id: 1, id: 1, email: 'hello@visuails.com', expires_at: '2099-01-01', totp_pending: 0 };
    }
    if (s.includes('FROM rate_limits')) return null;
    /* De redactielijst (met reason) vóór de kale lezing van readCalendar (alleen day). */
    if (s.includes('SELECT day, reason FROM blackout_days')) return dagen;
    if (s.includes('FROM blackout_days')) return dagen.map((d) => ({ day: d.day }));
    if (s.includes('FROM plan_queue')) return [];
    /* De bezettingscontrole van handleBlackoutDay: hij vraagt naar ref en merk. */
    if (s.includes('o.ref AS ref')) {
      return ORDERS
        .filter((o) => o.window_start <= binds[0] && (o.window_end || o.window_start) >= binds[0])
        .map((o) => ({ ref: o.ref, wie: o.brand, window_start: o.window_start, window_end: o.window_end }));
    }
    if (s.includes('FROM orders')) return ORDERS;
    if (s.includes('FROM admin_log')) return [];
    return null;
  };

  const stmt = (sql) => {
    prepared.push(sql.replace(/\s+/g, ' '));
    const st = {
      sql,
      _b: [],
      bind(...a) { st._b = a; return st; },
      async first() { const r = pick(sql, st._b); return Array.isArray(r) ? r[0] : r; },
      async all() { const r = pick(sql, st._b); return { results: Array.isArray(r) ? r : (r ? [r] : []) }; },
      async run() { record(st); return { success: true }; },
    };
    return st;
  };

  const record = (st) => {
    if (!/^\s*(UPDATE|INSERT|DELETE)/i.test(st.sql)) return;
    writes.push({ sql: st.sql.replace(/\s+/g, ' '), binds: st._b });
  };

  const DB = {
    writes,
    prepared,
    prepare: stmt,
    async batch(list) { for (const st of list) record(st); return list.map(() => ({ success: true })); },
  };
  return { DB, dagen };
}

async function req(method, path, { env, body } = {}) {
  const token = await mintToken();
  const init = {
    method,
    headers: {
      cookie: `vis_admin=${token}`,
      ...(method === 'POST' ? { origin: 'https://visuails.com' } : {}),
    },
  };
  if (body) init.body = body;
  const request = new Request(`https://visuails.com${path}`, init);
  return method === 'POST'
    ? adminPost({ request, env, waitUntil() {} })
    : adminGet({ request, env, waitUntil() {} });
}

const schrijf = (env, re) => env.DB.writes.filter((w) => re.test(w.sql));

// ─────────────────────────────────────────────────────────────────────────────
section('§1 · het scherm biedt de handeling aan, zonder JavaScript');
// ─────────────────────────────────────────────────────────────────────────────
{
  const env = makeEnv({ dicht: [{ day: dag(9), reason: 'vakantie' }] });
  const res = await req('GET', '/admin/agenda', { env });
  const h = await res.text();

  check('de agenda laadt', res.status === 200, res.status);
  check('er staat een kop "Dagen dichtzetten"', /Dagen dichtzetten/.test(h));
  check('met een echt datumveld', /<input id="bo-dag" type="date" name="dag"/.test(h));
  check('dat niet in het verleden begint', h.includes(`min="${VANDAAG}"`));
  check('en een reden vraagt', /name="reason"[^>]*required/.test(h));
  check('het formulier post naar /admin/agenda/dagen',
    /<form method="post" action="\/admin\/agenda\/dagen"/.test(h));

  /* GEEN SCRIPT. Het paneel stuurt `default-src 'none'` en heeft geen script-src,
     dus een datumkiezer die JavaScript nodig heeft zou een leeg vak zijn. */
  check('er staat geen enkel <script> op de pagina', !/<script/i.test(h));
  check('en geen inline style-attribuut', !/ style="/.test(h));

  check('de al dichte dag staat in de lijst', h.includes(dag(9)) && /vakantie/.test(h));
  check('met een knop om hem weer open te zetten', /value="open"/.test(h));
}

// ─────────────────────────────────────────────────────────────────────────────
section('§2 · dichtzetten schrijft, openzetten wist, allebei met een logregel');
// ─────────────────────────────────────────────────────────────────────────────
{
  const env = makeEnv();
  const res = await req('POST', '/admin/agenda/dagen', {
    env,
    body: new URLSearchParams({ do: 'dicht', dag: dag(20), reason: 'vakantie' }),
  });
  check('de handeling stuurt terug naar de agenda', res.status === 303, res.status);
  check('en de bestemming is het juiste anker',
    res.headers.get('location') === '/admin/agenda#dagen', res.headers.get('location'));

  const ins = schrijf(env, /INSERT INTO blackout_days/);
  check('er wordt precies één rij geschreven', ins.length === 1, ins.length);
  check('met de dag en de reden erin', ins[0]?.binds[0] === dag(20) && ins[0]?.binds[1] === 'vakantie');
  /* ON CONFLICT en niet OR IGNORE: twee keer dezelfde dag met een andere reden hoort
     de reden bij te werken, niet stil de eerste te laten staan. */
  check('een tweede keer dezelfde dag werkt de reden bij',
    /ON CONFLICT\(day\) DO UPDATE SET reason/.test(ins[0]?.sql || ''));
  check('en het logboek weet wie hem dichtzette',
    schrijf(env, /INSERT INTO admin_log/).some((w) => w.binds.some((b) => /agenda-dag-dicht/.test(String(b)))));
}
{
  const env = makeEnv({ dicht: [{ day: dag(20), reason: 'vakantie' }] });
  const res = await req('POST', '/admin/agenda/dagen', {
    env, body: new URLSearchParams({ do: 'open', dag: dag(20) }),
  });
  check('openzetten stuurt ook terug', res.status === 303, res.status);
  const del = schrijf(env, /DELETE FROM blackout_days/);
  check('en wist precies die ene dag', del.length === 1 && del[0].binds[0] === dag(20));
  check('ook dat komt in het logboek',
    schrijf(env, /INSERT INTO admin_log/).some((w) => w.binds.some((b) => /agenda-dag-open/.test(String(b)))));
  /* OPENZETTEN VRAAGT GEEN REDEN. Het geeft ruimte terug en kan niets breken —
     een verplicht veld zou hier alleen een drempel zijn voor het herstellen van
     een vergissing. */
  check('en vraagt geen reden', del.length === 1);
}

// ─────────────────────────────────────────────────────────────────────────────
section('§3 · een bezette dag gaat niet in één klik dicht');
// ─────────────────────────────────────────────────────────────────────────────
{
  const env = makeEnv();
  const res = await req('POST', '/admin/agenda/dagen', {
    env, body: new URLSearchParams({ do: 'dicht', dag: dag(2), reason: 'ziek' }),
  });
  const h = await res.text();

  check('het antwoord is een conflict en geen omleiding', res.status === 409, res.status);
  check('er is nog niets geschreven', schrijf(env, /INSERT INTO blackout_days/).length === 0);
  check('de bestelling staat er met naam en toenaam', /VIS-8K2-QQ1/.test(h) && /VOLT/.test(h));
  check('en met het venster erbij', h.includes(dag(2)) && h.includes(dag(3)));

  /* DE ZIN DIE ER MOET STAAN. Lucas' eigen regel: "de klant wordt wel altijd
     gecontacteerd wanneer een order niet op tijd geleverd kan worden." Deze knop
     mag niet suggereren dat dat geregeld is. */
  /* Op de regelafstand na: de zin staat over twee bronregels verdeeld, en dat
     mag hem niet laten falen. Wat wordt vastgelegd is de ZIN, niet de opmaak. */
  const plat = h.replace(/\s+/g, ' ');
  check('het scherm zegt dat er nog niemand iets gehoord heeft',
    /nog niets gehoord/.test(plat));
  check('en dat de vensters blijven staan', /blijven staan/.test(plat));

  check('er staat een tweede knop om het toch te doen', /value="ja"/.test(h) && /Toch dichtzetten/.test(h));
  check('en een weg terug', /Laat maar/.test(h));
  /* De reden reist mee in het verborgen veld: hem opnieuw laten typen is de
     zekerste manier om hem de tweede keer leeg te krijgen. */
  check('de reden reist mee naar de tweede stap', /name="reason" value="ziek"/.test(h));
}
{
  const env = makeEnv();
  const res = await req('POST', '/admin/agenda/dagen', {
    env, body: new URLSearchParams({ do: 'dicht', dag: dag(2), reason: 'ziek', confirm: 'ja' }),
  });
  check('met de bevestiging erbij gaat hij wél dicht', res.status === 303, res.status);
  const ins = schrijf(env, /INSERT INTO blackout_days/);
  check('en de rij staat er', ins.length === 1 && ins[0].binds[0] === dag(2));
  check('het logboek noemt dat er werk op stond',
    schrijf(env, /INSERT INTO admin_log/).some((w) => w.binds.some((b) => /bestelling\(en\) hadden hier al een venster/.test(String(b)))));
  /* EN DE BESTELLING WORDT NIET AANGERAAKT. Dit scherm zegt dat Lucas er niet is;
     wat er met dat venster moet gebeuren is een gesprek en geen automatische
     verschuiving die de klant nooit gezien heeft. */
  check('er wordt geen enkel venster verzet', schrijf(env, /UPDATE orders/).length === 0);
}

// ─────────────────────────────────────────────────────────────────────────────
section('§4 · de weigeringen');
// ─────────────────────────────────────────────────────────────────────────────
{
  const gevallen = [
    ['geen datum', { do: 'dicht', dag: 'morgen', reason: 'x' }],
    ['een dag in het verleden', { do: 'dicht', dag: dag(-3), reason: 'x' }],
    ['een verschreven jaartal', { do: 'dicht', dag: dag(900), reason: 'x' }],
    ['geen reden', { do: 'dicht', dag: dag(11), reason: '   ' }],
  ];
  for (const [naam, velden] of gevallen) {
    const env = makeEnv();
    const res = await req('POST', '/admin/agenda/dagen', { env, body: new URLSearchParams(velden) });
    check(`${naam} → 400`, res.status === 400, res.status);
    check(`${naam} → en niets geschreven`, schrijf(env, /INSERT INTO blackout_days/).length === 0);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
section('§5 · het scherm leest dezelfde agenda als de poort');
// ─────────────────────────────────────────────────────────────────────────────
{
  const env = makeEnv();
  await req('GET', '/admin/agenda', { env });
  const alle = env.DB.prepared.join('\n');

  /* De twee bronnen die agenda.js optelt. Stond plan_queue er niet bij, dan zag een
     dag die voor een abonnee al vastgezet is er hier leeg uit. */
  check('de vastgezette wachtrij wordt meegeteld', /FROM plan_queue/.test(alle));
  check('en alleen wat écht vastgezet is',
    /locked_at IS NOT NULL/.test(alle) && /taken_at IS NULL/.test(alle));
  /* En de uitsluiting die de poort wél had en dit scherm niet: een onbetaald venster
     waarvan de termijn verlopen is, is weer vrij. */
  check('een verlopen onbetaald venster telt niet meer mee',
    /window_expires_at <= datetime\('now'\)/.test(alle));

  const bron = readFileSync(new URL('../src/lib/admin.js', import.meta.url), 'utf8');
  check('admin.js leest de agenda via readCalendar()', /readCalendar\(env, vandaag\)/.test(bron));
  check('en telt niet meer zelf met bookedFromRows()', !/bookedFromRows/.test(bron));
}

// ─────────────────────────────────────────────────────────────────────────────
section('§6 · een vastgelegd venster verzetten en loslaten');
// ─────────────────────────────────────────────────────────────────────────────
/*
 * Tot nu toe was een venster onherroepelijk. Er stond geen enkele hand meer aan,
 * en het antwoord op "de dag gaat dicht, waar gaat dit werk heen" was een UPDATE
 * in D1 — de handeling die niemand vastlegt.
 *
 * Wat hier wordt vastgelegd, is vooral wat het NIET doet: het rekent het paar zelf
 * uit in plaats van het uit het formulier over te nemen, het houdt zich aan dezelfde
 * aanloop als de klant, en het mailt niemand.
 */
function orderEnv({ status = 'received' } = {}) {
  const env = makeEnv();
  const echt = env.DB.prepare;
  env.DB.prepare = (sql) => {
    const st = echt(sql);
    const s2 = sql.replace(/\s+/g, ' ');
    if (/FROM orders WHERE id = \?1/.test(s2)) {
      st.first = async () => ({
        id: 91, ref: 'VIS-8K2-QQ1', service: 'catalog', tier: 'attended',
        status, product_count: 10, window_start: dag(2), window_end: dag(3),
      });
    }
    return st;
  };
  return env;
}

{
  const env = orderEnv();
  const res = await req('POST', '/admin/orders/91/window', {
    env, body: new URLSearchParams({ do: 'verzet', dag: dag(9), reason: 'dag dichtgezet' }),
  });
  check('verzetten stuurt terug naar de bestelling', res.status === 303, res.status);

  const upd = schrijf(env, /UPDATE orders SET window_start = \?2, window_end = \?3/);
  check('er wordt één venster geschreven', upd.length === 1, upd.length);
  check('de aangewezen dag is de eerste van het paar', upd[0]?.binds[1] === dag(9), upd[0]?.binds);
  /* HET PAAR KOMT UIT windowFor() EN NIET UIT HET FORMULIER. Het formulier stuurt
     één dag; stond de tweede erin, dan kon Lucas hier een venster typen dat de
     agenda nooit gezien heeft. */
  check('en de tweede dag is erbij gerekend', upd[0]?.binds[2] === dag(10), upd[0]?.binds);

  check('de klant ziet het op zijn tijdlijn',
    schrijf(env, /INSERT INTO order_events/).some((w) => /Venster verzet naar/.test(String(w.binds[2] || ''))));
  check('en het logboek noemt het oude én het nieuwe venster',
    schrijf(env, /INSERT INTO admin_log/).some((w) => w.binds.some((b) => new RegExp(`${dag(2)}.*${dag(9)}`).test(String(b)))));
}
{
  const env = orderEnv();
  await req('POST', '/admin/orders/91/window', {
    env, body: new URLSearchParams({ do: 'verzet', dag: dag(9) }),
  });
  /* DE BESTELLING TELT NIET TEGEN ZICHZELF. Zonder exceptId zou een order die één
     dag opschuift, haar eigen gewicht op de nieuwe dagen tegenkomen. */
  const alle = env.DB.prepared.join('\n');
  check('de agenda wordt gelezen zonder deze bestelling erin', /id <> \?2/.test(alle), alle.includes('id <>'));
}
{
  const env = orderEnv();
  const res = await req('POST', '/admin/orders/91/window', {
    env, body: new URLSearchParams({ do: 'verzet', dag: dag(1) }),
  });
  /* DE AANLOOP GELDT OOK VOOR LUCAS. Niet omdat het systeem hem niet vertrouwt,
     maar omdat de aanloop de reden is dat de belofte te halen is. */
  check('een dag binnen de aanloop wordt geweigerd', res.status === 400, res.status);
  check('en er wordt niets geschreven', schrijf(env, /UPDATE orders SET window_start/).length === 0);
}
{
  const env = orderEnv();
  const res = await req('POST', '/admin/orders/91/window', {
    env, body: new URLSearchParams({ do: 'los', reason: 'klant belt terug' }),
  });
  check('loslaten stuurt terug', res.status === 303, res.status);
  const upd = schrijf(env, /UPDATE orders SET window_start = NULL, window_end = NULL/);
  check('en maakt de twee dagen echt leeg', upd.length === 1, upd.length);
  /* LEEGMAKEN EN NIET NEGEREN: bleef het paar staan, dan houdt agenda.js die dagen
     bezet voor werk dat er geen aanspraak meer op maakt — dezelfde regel die
     queueAsap() in subscription.js aanhoudt. */
  check('de tijdlijn zegt dat het losgelaten is',
    schrijf(env, /INSERT INTO order_events/).some((w) => /losgelaten/.test(String(w.binds[2] || ''))));
}
{
  for (const status of ['delivered', 'cancelled']) {
    const env = orderEnv({ status });
    const res = await req('POST', '/admin/orders/91/window', {
      env, body: new URLSearchParams({ do: 'verzet', dag: dag(9) }),
    });
    check(`een ${status} bestelling krijgt geen nieuw venster`, res.status === 400, res.status);
    check(`  en er wordt niets geschreven`, schrijf(env, /UPDATE orders SET window_start/).length === 0);
  }
}
{
  /* GEEN MAIL. /studio en /portal beloven allebei dat een statuswissel de klant niet
     mailt — zie de kop van notify.js. Deze handeling breekt die belofte niet. */
  const env = orderEnv();
  let gemaild = 0;
  const echt = globalThis.fetch;
  globalThis.fetch = async (u, i) => {
    if (String(u).includes('resend.com')) { gemaild += 1; return new Response('{}', { status: 200 }); }
    return echt(u, i);
  };
  await req('POST', '/admin/orders/91/window', {
    env, body: new URLSearchParams({ do: 'verzet', dag: dag(9) }),
  });
  globalThis.fetch = echt;
  check('verzetten mailt niemand', gemaild === 0, gemaild);
}
{
  const env = orderEnv();
  const res = await req('GET', '/admin/orders/91/files', { env });
  const h = (await res.text()).replace(/\s+/g, ' ');
  check('het scherm biedt de handeling aan', /Venster verzetten/.test(h));
  check('met één datumveld en niet twee',
    (h.match(/name="dag"/g) || []).length === 1, (h.match(/name="dag"/g) || []).length);
  check('en het zegt dat er geen mail uitgaat', /geen mail/.test(h));
}

console.log(`\n${totaal - fails}/${totaal} geslaagd`);
if (fails) process.exit(1);
