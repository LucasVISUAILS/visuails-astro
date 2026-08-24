// VISUAILS — waar iemand het bestelformulier verlaat (Cloudflare Pages Function).
//
// POST /api/step   step=3&flow=drop&lang=nl   →   204, geen inhoud
//
// ─────────────────────────────────────────────────────────────────────────────
// WAT DIT IS EN WAAROM HET BESTAAT
// ─────────────────────────────────────────────────────────────────────────────
//
// Het bestelformulier is ÉÉN pagina met vijf stappen die met JavaScript worden
// gewisseld. Cloudflare Web Analytics meet paginabezoeken, dus zag het van die
// vier stapwissels precies niets. Van iedereen die aan een bestelling begon, was
// alleen bekend wie hem afmaakte; wie op stap 3 wegliep liet geen spoor na.
//
// Dit endpoint verhoogt één teller. Niets anders.
//
// ─────────────────────────────────────────────────────────────────────────────
// ER GAAT NIETS IN DAT NAAR EEN PERSOON LEIDT — EN DAT IS EEN ONTWERPKEUZE
// ─────────────────────────────────────────────────────────────────────────────
//
// Geen cookie, geen bezoeker-id, geen sessie, geen ip, geen tijdstip preciezer
// dan de dag. Wat er wordt weggeschreven is `day + flow + lang + step` met een
// getal erachter, en die vier waarden komen uit gesloten lijsten. Er is dus geen
// combinatie van velden die één bezoeker aanwijst.
//
// Daardoor is dit geen tracker: geen categorie in de cookiebanner, geen
// vermelding in het privacybeleid als "gegevens die wij over u verwerken", geen
// regel in het verwerkingsregister. De vraag was "bij welke stap lopen mensen
// weg", en die vraag heeft geen enkel gegeven over een individu nodig.
//
// DE PRIJS, EERLIJK OPGESCHREVEN. Zonder bezoeker-id kan één persoon meer dan
// één keer geteld worden: wie herlaadt en opnieuw tot stap 3 komt, staat twee
// keer op stap 1, 2 en 3. De VERHOUDING tussen de stappen blijft daarmee
// bruikbaar — dat is waar de trechter over gaat — maar het absolute getal is een
// bovengrens en geen bezoekersaantal. Het adminscherm zegt dat er ook bij, zodat
// niemand het als bezoekersaantal leest.
//
// ─────────────────────────────────────────────────────────────────────────────
// WAT ER GECONTROLEERD WORDT, EN WAAROM DAT MEER IS DAN NETHEID
// ─────────────────────────────────────────────────────────────────────────────
//
// De sleutel van de tabel is samengesteld uit vier waarden. Zou dit endpoint
// alles doorlaten wat er binnenkomt, dan kan iemand met een script willekeurige
// `flow`-waarden posten en groeit de tabel ongelimiteerd — een schrijfbare,
// onbegrensde tabel op een openbaar endpoint. Met de controle hieronder is het
// aantal mogelijke rijen per dag maximaal 6 × 2 × 8 = 96.
//
// De GETALLEN blijven met een script te vervuilen. Dat is de onvermijdelijke
// prijs van meten zonder identificatie, en het is de goede kant om fout te gaan:
// een vervuilde verhouding is een verkeerd inzicht, een onbegrensde tabel is een
// rekening. De ratelimiet hieronder maakt vervuilen bovendien traag genoeg om
// niet de moeite te zijn.
//
// ─────────────────────────────────────────────────────────────────────────────
// DIT MAG NOOIT IETS OPHOUDEN OF LATEN OMVALLEN
// ─────────────────────────────────────────────────────────────────────────────
//
// Een meting die het formulier vertraagt of breekt, kost meer bestellingen dan
// het inzicht ooit oplevert. Dus: 204 zonder inhoud, geen enkel antwoord waar de
// cliënt op moet wachten, en élke fout — geen tabel, geen binding, D1 plat — komt
// er als 204 uit. De aanroeper in src/scripts/pipeline.js kijkt niet naar het
// antwoord en kán er niets mee.
//
// Dat is precies het patroon dat elders in dit project juist FOUT is (de
// `.catch(() => {})` in het adminscherm die een mislukte statuswissel wegslikte),
// en het verschil is of er iets van de uitkomst afhangt. Daar hing de hele
// handeling ervan af. Hier is de uitkomst een getal in een overzicht dat niemand
// nodig heeft om te werken.

import { checkRate, clientIp, shouldSweep, sweepRateLimits } from '../../src/lib/ratelimit.js';

/*
 * De gesloten lijsten. `FLOWS` is dezelfde verzameling als ORDER_SERVICES in
 * functions/api/order.js — met de hand gelijkgehouden en niet geïmporteerd, omdat
 * die daar een `const` binnen het bestand is en dit endpoint niets van de
 * bestelroute hoort te laden om één woord te controleren. tests/funnel.test.mjs
 * legt de twee naast elkaar, dus uit elkaar lopen wordt rood.
 */
const FLOWS = new Set(['catalog', 'lifestyle', 'video', 'custom', 'brand-model', 'test-sample', 'drop']);
const LANGS = new Set(['en', 'nl']);
const MAX_STEP = 8;

/*
 * 60 per tien minuten per ip. Een mens die het formulier doorloopt stuurt vijf
 * berichten; wie twijfelt en heen en weer klikt hoogstens een paar keer dat. Ruimer
 * dan de tien van /api/order, want dit is de goedkoopste schrijfactie op de site en
 * een bezoeker die hier tegen een limiet loopt, verliest zijn bestelling niet — hij
 * verliest een getal in een overzicht.
 */
const LIMIT = 60;
const WINDOW_SECONDS = 600;

/** Altijd 204. Er is geen enkele toestand waarin de cliënt iets anders kan doen. */
const done = () => new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });

export async function onRequestPost({ request, env, waitUntil }) {
  try {
    if (!env.DB) return done();

    const rate = await checkRate(env, {
      ip: clientIp(request), action: 'step', limit: LIMIT, windowSeconds: WINDOW_SECONDS,
    });
    if (shouldSweep() && typeof waitUntil === 'function') waitUntil(sweepRateLimits(env));
    /* Geen 429 met een retry-after zoals bij /api/order: er is niemand die het
       opnieuw hoort te proberen. Stil laten vallen is hier het hele antwoord. */
    if (!rate.allowed) return done();

    let form;
    try {
      form = await request.formData();
    } catch {
      return done();
    }
    const get = (k) => { const v = form.get(k); return typeof v === 'string' ? v.trim() : ''; };

    const step = Number(get('step'));
    const flow = get('flow');
    const lang = get('lang');
    if (!Number.isInteger(step) || step < 1 || step > MAX_STEP) return done();
    if (!FLOWS.has(flow) || !LANGS.has(lang)) return done();

    /* De dag in UTC, uit de server en niet uit de cliënt. Een datum die de bezoeker
       meestuurt is een datum die de bezoeker kan kiezen, en dan staan er rijen in de
       tabel voor dagen die nog niet bestaan. */
    const day = new Date().toISOString().slice(0, 10);

    await env.DB.prepare(
      `INSERT INTO funnel_hits (day, flow, lang, step, hits) VALUES (?1, ?2, ?3, ?4, 1)
       ON CONFLICT(day, flow, lang, step) DO UPDATE SET hits = hits + 1`
    ).bind(day, flow, lang, step).run();

    return done();
  } catch (err) {
    /* Zie de noot bovenaan: geen tabel (migratie 0025 niet gedraaid), geen binding, D1
       plat — het antwoord blijft 204. De console is de enige plek waar dit terechtkomt,
       en dat is genoeg: een trechter die stilvalt is zichtbaar in het overzicht zelf,
       want dan staan er geen getallen van vandaag. */
    console.error('[step] niet geteld —', err?.message || err);
    return done();
  }
}

/*
 * GEEN onRequestGet. Een teller die met een GET te verhogen is, wordt verhoogd door
 * elke linkvoorvertoning en elke crawler die de URL ergens tegenkomt — en dan meet je
 * het internet in plaats van je bezoekers. Een GET valt hier door naar de 405 die
 * Pages zelf geeft.
 */
