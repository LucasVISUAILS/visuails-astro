/* ── DE GRATIS GRENZEN, EN WAT ÉÉN RUN ERVAN GEBRUIKT — 8 oktober 2026 (9.05) ──
 *
 * Lucas koos (V3): Cloudflare Workers en Resend draaien allebei op het gratis
 * plan. Dat is een prima keuze zolang je weet waar de randen zitten, en die
 * randen zijn bij VISUAILS niet het aantal bezoekers maar de grootte van één
 * bestelling en het werk van één nacht. Dit bestand is de ENIGE plek waar die
 * getallen staan: de cron telt ertegen, /admin/diagnose toont ze, en
 * kladblok/LIVE-STAPPEN.md (de drukteproef) verwijst ernaar.
 *
 * DE GETALLEN VERANDEREN. Cloudflare en Resend passen hun plannen geregeld aan,
 * daarom staat bij elk getal de bron en de datum waarop hij is nagekeken. Klopt
 * er een niet meer, dan hier aanpassen — nergens anders.
 *
 *   Workers   https://developers.cloudflare.com/workers/platform/limits/
 *             (pagina bijgewerkt 5 sep 2026, nagekeken 8 okt 2026)
 *   D1        https://developers.cloudflare.com/d1/platform/limits/ en
 *             https://developers.cloudflare.com/d1/platform/pricing/
 *             (bijgewerkt 21 apr 2026, nagekeken 8 okt 2026)
 *   R2        https://developers.cloudflare.com/r2/pricing/
 *             (bijgewerkt 1 okt 2026, nagekeken 8 okt 2026)
 *   Resend    https://resend.com/pricing en
 *             https://resend.com/docs/knowledge-base/account-quotas-and-limits
 *             (nagekeken 8 okt 2026). Let op: elke ontvanger in to/cc/bcc telt
 *             apart, dus een factuurmail met een bcc aan hello@ telt twee keer.
 *
 * WAT DE CODE NIET KAN METEN: rekentijd (CPU). Binnen een Worker staat de klok
 * stil zolang er gerekend wordt (Date.now() loopt alleen bij wachten op het net),
 * dus 10 ms CPU zie je alleen in het Cloudflare-dashboard: Workers & Pages →
 * visuails-site of visuails-cron → Metrics → "CPU-tijd". De drukteproef kijkt
 * daar. Wat wél te tellen is — verzoeken aan de database, aan R2 en naar buiten
 * — telt de meetlat hieronder.
 */

export const GRENZEN = {
  gratis: {
    naam: 'gratis',
    /* Workers Free */
    verzoekenPerDag: 100000,
    cpuMsPerAanroep: 10,
    externPerAanroep: 50,        // fetch naar buiten: Resend, Mollie, VIES
    internPerAanroep: 1000,      // D1, R2 en KV via de bindings
    bodyMb: 100,
    cronTriggersPerAccount: 5,
    /* D1 Free */
    d1PerAanroep: 50,            // "Queries per Worker invocation"
    d1RijenGelezenPerDag: 5000000,
    d1RijenGeschrevenPerDag: 100000,
    d1MaxMb: 500,
    d1TimeTravelDagen: 7,
    /* R2 Free (per maand) */
    r2OpslagGb: 10,
    r2KlasseAPerMaand: 1000000,  // o.a. put en list
    r2KlasseBPerMaand: 10000000, // o.a. get en head
  },
  betaald: {
    naam: 'betaald',
    verzoekenPerDag: null,
    cpuMsPerAanroep: 30000,
    externPerAanroep: 10000,
    internPerAanroep: 10000,
    bodyMb: 100,
    cronTriggersPerAccount: 250,
    d1PerAanroep: 1000,
    d1RijenGelezenPerDag: null,
    d1RijenGeschrevenPerDag: null,
    d1MaxMb: 10240,
    d1TimeTravelDagen: 30,
    r2OpslagGb: 10,
    r2KlasseAPerMaand: 1000000,
    r2KlasseBPerMaand: 10000000,
  },
};

/** Resend Free. Apart van Cloudflare, want Lucas kan het ene plan zonder het andere wisselen. */
export const RESEND_GRATIS = { perDag: 100, perMaand: 3000, webhooks: 1, contacten: 1000 };

/** Welk plan geldt. Uit de variabele WORKERS_PLAN in cron/wrangler.toml; zonder: gratis. */
export function plan(env) {
  return String(env?.WORKERS_PLAN || '').trim() === 'betaald' ? GRENZEN.betaald : GRENZEN.gratis;
}

/* ── DE METER ZELF ───────────────────────────────────────────────────────────
 *
 * Een omhulsel om env.DB en env.UPLOADS dat elke aanroep telt, en een teller voor
 * fetch. Er verandert NIETS aan wat er gebeurt: elke aanroep gaat ongewijzigd
 * door naar de echte binding. De teller hangt in een WeakMap aan het omhulde env,
 * zodat een taak hem kan opvragen zonder dat er een verzonnen "binding" in env
 * komt te staan die /admin/diagnose dan als ontbrekend secret zou lezen.
 *
 * Een batch telt als één verzoek: het is één rondgang naar D1. Of Cloudflare hem
 * per statement telt, staat niet in de documentatie; de reserve hieronder vangt
 * dat verschil op. */
const METERS = new WeakMap();

export function nieuweMeter() {
  return { d1: 0, r2: 0, extern: 0, gestopt: [] };
}

function telStatement(st, m) {
  return {
    __echt: st,
    bind(...a) { return telStatement(st.bind(...a), m); },
    async first(...a) { m.d1++; return st.first(...a); },
    async all(...a) { m.d1++; return st.all(...a); },
    async run(...a) { m.d1++; return st.run(...a); },
    async raw(...a) { m.d1++; return st.raw(...a); },
  };
}

function telD1(db, m) {
  return {
    prepare(sql) { return telStatement(db.prepare(sql), m); },
    async batch(lijst) {
      m.d1++;
      return db.batch((lijst || []).map((s) => (s && s.__echt) || s));
    },
    async exec(sql) { m.d1++; return db.exec(sql); },
  };
}

function telR2(bucket, m) {
  const TELT = new Set(['list', 'get', 'put', 'delete', 'head', 'createMultipartUpload']);
  return new Proxy(bucket, {
    get(doel, naam) {
      const v = doel[naam];
      if (typeof v !== 'function') return v;
      if (!TELT.has(naam)) return v.bind(doel);
      return (...a) => { m.r2++; return v.apply(doel, a); };
    },
  });
}

/**
 * Omhul env voor één run. Geeft het omhulde env terug; de meter is op te vragen
 * met meterVan(env). Zonder DB of UPLOADS blijft dat deel gewoon weg.
 */
export function metMeter(env, m = nieuweMeter()) {
  const uit = { ...(env || {}) };
  if (env?.DB) uit.DB = telD1(env.DB, m);
  if (env?.UPLOADS) uit.UPLOADS = telR2(env.UPLOADS, m);
  METERS.set(uit, m);
  return uit;
}

export function meterVan(env) {
  return (env && METERS.get(env)) || null;
}

/** fetch tellen voor de duur van `werk`; daarna staat fetch weer zoals hij stond. */
export async function telFetch(m, werk) {
  const echt = globalThis.fetch;
  if (typeof echt !== 'function') return werk();
  globalThis.fetch = (...a) => { m.extern++; return echt(...a); };
  try {
    return await werk();
  } finally {
    globalThis.fetch = echt;
  }
}

/* ── DE RESERVE ──────────────────────────────────────────────────────────────
 *
 * Een taak die veel kan doen (wissen, de wachtruimte doorlopen) vraagt vóór elke
 * stap: is er nog ruimte? Er blijft altijd een reserve over voor de taken die na
 * hem komen en voor de hartslag aan het eind, want een nacht die halverwege op de
 * grens stuit, schrijft ook zijn hartslag niet meer — en dan zegt /admin "de nacht
 * staat stil" over een nacht die gewoon te druk was. */
export const RESERVE = { d1: 20, intern: 100, extern: 10 };

/** true als deze run nog `nodig` databaseverzoeken kan doen zonder de reserve aan te spreken. */
export function ruimte(env, { d1 = 1, intern = 1 } = {}) {
  const m = meterVan(env);
  if (!m) return true;
  const p = plan(env);
  if (m.d1 + d1 > p.d1PerAanroep - RESERVE.d1) return false;
  if (m.d1 + m.r2 + intern > p.internPerAanroep - RESERVE.intern) return false;
  return true;
}

/** Noteer dat een taak vannacht vroeg stopte; het nachtrapport noemt het. */
export function noteerStop(env, wie) {
  const m = meterVan(env);
  if (m && !m.gestopt.includes(wie)) m.gestopt.push(wie);
}

/** De meting als korte regel voor app_settings ('cron_meting') en /admin/diagnose. */
export function meetRegel(m, env) {
  const p = plan(env);
  return `database ${m.d1}/${p.d1PerAanroep} · R2 ${m.r2} · intern ${m.d1 + m.r2}/${p.internPerAanroep} · naar buiten ${m.extern}/${p.externPerAanroep} · plan ${p.naam}`;
}

/**
 * Een regel voor het nachtrapport, ALLEEN als het krap werd (70 % of meer van een
 * grens) of als een taak vroeg stopte. Een nacht die ruim binnen de grenzen bleef,
 * hoort niet in een mail: zie de kop van cron/index.js over mails die je leert
 * weg te vegen.
 */
export function drukteRegel(m, env) {
  const p = plan(env);
  const krap = [];
  if (m.d1 >= 0.7 * p.d1PerAanroep) krap.push(`${m.d1} van de ${p.d1PerAanroep} databaseverzoeken`);
  if (m.d1 + m.r2 >= 0.7 * p.internPerAanroep) krap.push(`${m.d1 + m.r2} van de ${p.internPerAanroep} verzoeken aan Cloudflare zelf`);
  if (m.extern >= 0.7 * p.externPerAanroep) krap.push(`${m.extern} van de ${p.externPerAanroep} verzoeken naar buiten (mail, Mollie)`);
  if (!krap.length && !m.gestopt.length) return null;
  const stop = m.gestopt.length
    ? ` ${m.gestopt.join(' en ')} stopte${m.gestopt.length === 1 ? '' : 'n'} op tijd om binnen de grens te blijven; morgennacht gaat de rest.`
    : '';
  return `DRUKTE: deze nacht gebruikte ${krap.length ? krap.join(', ') : 'bijna alle ruimte'} die het ${p.naam === 'gratis' ? 'gratis plan' : 'plan'} per run toestaat.${stop}`;
}
