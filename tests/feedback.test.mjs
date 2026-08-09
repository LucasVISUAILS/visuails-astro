/* VISUAILS — de tevredenheidsvraag en wat erna komt.
 *
 *   npm run test:feedback
 *
 * Fase 1 van reviewverzamelingspecificatie.md: §2 stap 1 en stap 2.
 *
 * ── WAT HIER HET RISICO IS, EN HET IS GEEN OPMAAKRISICO ─────────────────────
 *
 * Eén regel in deze code is juridisch en niet cosmetisch: bij een LAGE score
 * moeten de publieke reviewknoppen blijven staan. Ze filteren op score — alleen
 * tevreden klanten naar Google sturen — heet review gating, en dat is bij Google
 * en Trustpilot tegen de richtlijnen én in de EU een oneerlijke handelspraktijk.
 *
 * Dat is precies het soort regel dat iemand later "opruimt" omdat het onlogisch
 * lijkt om een ontevreden klant naar Trustpilot te wijzen. Vandaar dat het
 * hieronder als eerste staat, met de reden erbij.
 *
 * D1 draait op node:sqlite met het echte migratiebestand, zodat de UNIQUE op
 * order_id en de CHECK op de score meedoen in plaats van te worden nagebouwd.
 */

import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import {
  feedbackBlock, handleFeedbackPost, loadFeedback,
  saveScore, saveNote, savePlatformClick, saveTestimonial,
} from '../src/lib/feedback.js';
import { REVIEW_PLATFORMS, parsePlatforms, SCORE_HIGH } from '../src/data/reviews.js';

let pass = 0, fail = 0;
const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) pass++; else fail++;
  console.log(`${ok ? ' ok  ' : 'FAIL '} ${String(name).padEnd(62)} ${ok ? '' : `expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`}`);
};

/* ── D1 op node:sqlite ───────────────────────────────────────────────────── */
function d1(db) {
  return {
    prepare(sql) {
      const st = {
        _a: [],
        bind(...a) { st._a = a; return st; },
        async first() { return db.prepare(sql).get(...st._a) ?? null; },
        async run() { return { success: true, meta: db.prepare(sql).run(...st._a) }; },
        async all() { return { results: db.prepare(sql).all(...st._a) }; },
      };
      return st;
    },
  };
}

function fresh() {
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE customers (id INTEGER PRIMARY KEY);');
  db.exec('CREATE TABLE orders (id INTEGER PRIMARY KEY, closed_at TEXT);');
  // Het echte migratiebestand, niet een kopie: wijkt het schema af van wat deze
  // test aanneemt, dan valt dat hier om en niet in productie.
  db.exec(readFileSync(new URL('../migrations/0020-order-feedback.sql', import.meta.url), 'utf8'));
  db.prepare('INSERT INTO customers (id) VALUES (1)').run();
  db.prepare("INSERT INTO orders (id, closed_at) VALUES (7, '2026-08-09 10:00:00')").run();
  return db;
}

/** Een formulierpost nabootsen zoals de browser hem stuurt. */
const form = (obj) => ({ get: (k) => (Object.prototype.hasOwnProperty.call(obj, k) ? String(obj[k]) : null) });

const GOOGLE = REVIEW_PLATFORMS.find((p) => p.id === 'google').url;
const TRUSTPILOT = REVIEW_PLATFORMS.find((p) => p.id === 'trustpilot').url;

console.log('\nVISUAILS — tevredenheid en reviews\n');

/* ══ 1 · DE REGEL DIE NIET MAG VERDWIJNEN ═════════════════════════════════════
 *
 * Dit staat eerst omdat het de enige regel is die geld noch opmaak kost maar een
 * overtreding zou zijn. §2: de publieke opties blijven bij een lage score
 * zichtbaar, kleiner en onderaan, niet verborgen.
 */
console.log('geen review gating');
{
  const low = feedbackBlock({ lang: 'nl', action: '/x', feedback: { score: 1 } });
  check('een score van 1 toont Google', low.includes(GOOGLE) === false && low.includes('value="google"'), true);
  check('een score van 1 toont Trustpilot', low.includes('value="trustpilot"'), true);
  check('en het privéformulier staat ervóór',
    low.indexOf('name="note"') < low.indexOf('value="google"'), true);
  check('met uitleg waarom de knoppen er staan', low.includes('Ook als je niet tevreden was'), true);

  /*
   * AANWEZIG IN DE HTML IS NIET GENOEG. Met alleen die controle bleef deze test
   * groen toen ik `hidden` op het blok zette — vastgesteld met sabotage. Onzichtbaar
   * gemaakte knoppen zijn voor een klant hetzelfde als weggehaalde knoppen, en dus
   * evengoed review gating.
   *
   * Vandaar dat er ook gekeken wordt of er niets is dat ze wegstopt: geen `hidden`,
   * geen display:none, geen visibility:hidden, en geen nulhoogte. Dat is een brede
   * controle op een smal blok, en dat is hier goedkoop.
   */
  const hiders = /\bhidden\b|display:\s*none|visibility:\s*hidden|max-height:\s*0|opacity:\s*0/i;
  for (const score of [1, 2, 3]) {
    const b = feedbackBlock({ lang: 'nl', action: '/x', feedback: { score } });
    check(`score ${score}: beide platformen aanwezig`,
      b.includes('value="google"') && b.includes('value="trustpilot"'), true);
    // De verborgen velden van het formulier heten input type="hidden" — die horen
    // er wél te zijn. Dus alleen buiten die tags kijken.
    const visible = b.replace(/<input[^>]*type="hidden"[^>]*>/g, '');
    check(`score ${score}: niets stopt de knoppen weg`, hiders.test(visible), false);
  }
  // En bij een hoge score staan ze vooraan in plaats van onderaan.
  const high = feedbackBlock({ lang: 'nl', action: '/x', feedback: { score: 5 } });
  check('score 5: geen privéformulier', high.includes('name="note"'), false);
  check('score 5: wél de platformen', high.includes('value="google"'), true);
  check('de grens ligt op 4', SCORE_HIGH, 4);
  check('score 4 is hoog', feedbackBlock({ lang: 'nl', action: '/x', feedback: { score: 4 } }).includes('name="note"'), false);
  check('score 3 is laag', feedbackBlock({ lang: 'nl', action: '/x', feedback: { score: 3 } }).includes('name="note"'), true);
}

/* ══ 2 · GEEN BELONING ═══════════════════════════════════════════════════════
 * §3 verbiedt korting of credit in ruil voor een review. Er hoort dus nergens in
 * dit blok een woord over te staan — ook niet per ongeluk, in een van de twee
 * talen, in een van de vier toestanden.
 */
console.log('\ngeen beloning in beeld');
{
  const forbidden = /korting|discount|credit|tegoed|cadeau|voucher|gratis|for free|reward|beloning/i;
  for (const lang of ['nl', 'en']) {
    for (const fb of [null, { score: 1 }, { score: 5 }, { score: 5, testimonial_consent: 1 }]) {
      const html = feedbackBlock({ lang, action: '/x', feedback: fb });
      if (forbidden.test(html)) { console.log('   ', lang, JSON.stringify(fb), html.match(forbidden)[0]); }
      check(`${lang} · ${fb ? 'score ' + fb.score : 'nog niets'}: geen beloning genoemd`, forbidden.test(html), false);
    }
  }
}

/* ══ 3 · DE VIER TOESTANDEN ══════════════════════════════════════════════════ */
console.log('\nde toestanden van het blok');
{
  const none = feedbackBlock({ lang: 'nl', action: '/x', feedback: null });
  check('nog niets: de vraag staat er', none.includes('Ben je tevreden'), true);
  check('nog niets: vijf knoppen', (none.match(/name="score"/g) || []).length, 5);
  check('nog niets: geen platformen', none.includes('value="google"'), false);
  check('nog niets: geen testimonialveld', none.includes('name="quote"'), false);

  const withNote = feedbackBlock({ lang: 'nl', action: '/x', feedback: { score: 2, private_note: 'de kleur klopt niet' } });
  check('notitie verstuurd: formulier weg', withNote.includes('name="note"'), false);
  check('notitie verstuurd: bedankt', withNote.includes('we hebben het gelezen'), true);
  check('notitie verstuurd: platformen blijven', withNote.includes('value="google"'), true);
  check('de notitie zelf komt NIET terug op het scherm', withNote.includes('de kleur klopt niet'), false);

  const quoted = feedbackBlock({ lang: 'nl', action: '/x', feedback: { score: 5, testimonial_consent: 1 } });
  check('testimonial gegeven: veld weg', quoted.includes('name="quote"'), false);
  check('testimonial gegeven: bedankt', quoted.includes('voordat we het plaatsen'), true);

  check('een score is terug te draaien', none.includes('value="reset"') === false
    && feedbackBlock({ lang: 'nl', action: '/x', feedback: { score: 5 } }).includes('value="reset"'), true);
}

/* ══ 4 · DE KNOPPEN OPENEN IN EEN NIEUW TABBLAD ══════════════════════════════
 * §2 vraagt dat letterlijk. rel="noopener" hoort erbij: zonder dat krijgt het
 * nieuwe tabblad een verwijzing naar dit venster.
 */
console.log('\nde platformknoppen');
{
  const b = feedbackBlock({ lang: 'en', action: '/x', feedback: { score: 5 } });
  check('nieuw tabblad', (b.match(/target="_blank"/g) || []).length >= 2, true);
  check('noopener', (b.match(/rel="noopener"/g) || []).length >= 2, true);
  check('geen rechtstreekse link naar het platform in de html',
    b.includes('trustpilot.com') || b.includes('g.page'), false);
  check('en geen extern script — de site blijft op nul',
    /<script|widget\.trustpilot|trustpilot\.com\/bootstrap/i.test(b), false);
}

/* ══ 5 · WAT ER NAAR DE DATABASE GAAT ════════════════════════════════════════ */
console.log('\nopslaan');
{
  const db = fresh(); const env = { DB: d1(db) };
  check('score 4 opgeslagen', (await saveScore(env, 7, 1, '4')).ok, true);
  check('en teruggelezen', (await loadFeedback(env, 7)).score, 4);
  check('bijwerken naar 5', (await saveScore(env, 7, 1, 5)).ok, true);
  check('nog steeds één rij', db.prepare('SELECT COUNT(*) c FROM order_feedback').get().c, 1);
  check('en de nieuwe score staat er', (await loadFeedback(env, 7)).score, 5);

  // `changed` is wat bepaalt of er een mail naar de studio gaat. Dezelfde score
  // nog een keer opsturen is geen nieuw feit — zie notifyStudio().
  check('dezelfde score nog eens: niet veranderd', (await saveScore(env, 7, 1, 5)).changed, false);
  check('een andere score: wel veranderd', (await saveScore(env, 7, 1, 2)).changed, true);
  await saveScore(env, 7, 1, 5);

  check('een 0 wordt geweigerd', (await saveScore(env, 7, 1, 0)).ok, false);
  check('een 6 wordt geweigerd', (await saveScore(env, 7, 1, 6)).ok, false);
  check('tekst wordt geweigerd', (await saveScore(env, 7, 1, 'vijf')).ok, false);
  check('de score is niet veranderd', (await loadFeedback(env, 7)).score, 5);

  check('eerste notitie: nieuw', await saveNote(env, 7, '  de achtergrond is niet wit  '), true);
  check('notitie getrimd opgeslagen', (await loadFeedback(env, 7)).private_note, 'de achtergrond is niet wit');
  check('een lege notitie doet niets', await saveNote(env, 7, '   '), false);
  // De eerste notitie wint. Anders zou een herhaalde POST de tekst overschrijven
  // die de studio al gelezen heeft, én een tweede mail sturen.
  check('een tweede notitie is niet nieuw', await saveNote(env, 7, 'toch iets anders'), false);
  check('en de eerste staat er nog', (await loadFeedback(env, 7)).private_note, 'de achtergrond is niet wit');

  await savePlatformClick(env, 7, 'trustpilot');
  await savePlatformClick(env, 7, 'google');
  check('twee klikken, in de volgorde van reviews.js',
    (await loadFeedback(env, 7)).platforms_clicked, 'google,trustpilot');
  await savePlatformClick(env, 7, 'google');
  check('twee keer dezelfde klik telt één keer',
    (await loadFeedback(env, 7)).platforms_clicked, 'google,trustpilot');
  check('een onbekend platform wordt geweigerd', await savePlatformClick(env, 7, 'facebook'), false);
  check('en verandert niets', (await loadFeedback(env, 7)).platforms_clicked, 'google,trustpilot');
}

/* ══ 6 · DE TOESTEMMING ══════════════════════════════════════════════════════
 * §3: geen testimonial zonder expliciete, aparte toestemming. Zonder vinkje wordt
 * de tekst NIET bewaard — niet "bewaard maar niet getoond", want dat is een tekst
 * over jezelf op onze server waar je geen ja tegen hebt gezegd.
 */
console.log('\nde testimonial');
{
  const db = fresh(); const env = { DB: d1(db) };
  await saveScore(env, 7, 1, 5);

  check('zonder vinkje: geweigerd',
    await saveTestimonial(env, 7, { text: 'top gedaan', name: 'VOLT', consent: false }), false);
  check('en er staat niets in de database', (await loadFeedback(env, 7)).testimonial_text, null);

  check('met vinkje: opgeslagen',
    await saveTestimonial(env, 7, { text: 'top gedaan', name: 'VOLT', consent: true }), true);
  const row = await loadFeedback(env, 7);
  check('de tekst staat er', row.testimonial_text, 'top gedaan');
  check('de naam staat er', row.testimonial_name, 'VOLT');
  check('toestemming staat op 1', row.testimonial_consent, 1);
  check('goedkeuring staat op 0 — publiceren is een aparte handeling', row.testimonial_approved, 0);

  check('een lege tekst met vinkje doet niets',
    await saveTestimonial(env, 7, { text: '  ', consent: true }), false);
}

/* ══ 7 · DE POST-VERWERKING ══════════════════════════════════════════════════ */
console.log('\nde post');
{
  const db = fresh(); const env = { DB: d1(db) };

  let res = await handleFeedbackPost(env, { orderId: 7, customerId: 1, form: form({ fb: 'score', score: '5' }) });
  check('score: geen omleiding', res, { ok: true, redirect: null });

  res = await handleFeedbackPost(env, { orderId: 7, customerId: 1, form: form({ fb: 'click', platform: 'google' }) });
  check('klik: omleiding naar Google', res.redirect, GOOGLE);
  res = await handleFeedbackPost(env, { orderId: 7, customerId: 1, form: form({ fb: 'click', platform: 'trustpilot' }) });
  check('klik: omleiding naar Trustpilot', res.redirect, TRUSTPILOT);
  res = await handleFeedbackPost(env, { orderId: 7, customerId: 1, form: form({ fb: 'click', platform: 'nep' }) });
  check('een verzonnen platform leidt nergens naartoe', res, { ok: false, redirect: null });

  res = await handleFeedbackPost(env, { orderId: 7, customerId: 1, form: form({ fb: 'quote', quote: 'goed', quote_consent: '1' }) });
  check('quote met vinkje', (await loadFeedback(env, 7)).testimonial_text, 'goed');

  res = await handleFeedbackPost(env, { orderId: 7, customerId: 1, form: form({ fb: 'onbekend' }) });
  check('een onbekende actie doet niets', res, { ok: false, redirect: null });
}

/* ══ 7b · DE MELDING NAAR DE STUDIO ══════════════════════════════════════════
 *
 * Het scherm belooft "dan kijken we ernaar". Zonder deze mail komt de klacht in
 * een kolom terecht die niemand opent, en is die zin een halve waarheid.
 *
 * Wat hier vastligt is WANNEER hij uitgaat, en vooral wanneer niet: een tevreden
 * klant mag niemand wekken, en dezelfde klacht mag niet twee keer binnenkomen.
 * Resend wordt gestubd — er gaat vanuit een test geen enkel verzoek de deur uit.
 */
console.log('\nde melding naar de studio');
{
  const sent = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    sent.push(JSON.parse(init.body));
    return { ok: true, status: 200, text: async () => '' };
  };

  try {
    const db = fresh();
    const env = { DB: d1(db), RESEND_API_KEY: 'test', NOTIFY_EMAIL: 'studio@visuails.com' };
    // orders heeft in deze test alleen id en closed_at; notifyStudio leest meer
    // kolommen en vangt dat zelf op. Dat is precies het geval dat we willen zien:
    // de mail gaat uit, ook als de bestelling niet volledig te lezen is.
    const post = (obj) => handleFeedbackPost(env, { orderId: 7, customerId: 1, form: form(obj) });

    await post({ fb: 'score', score: '5' });
    check('een 5 wekt niemand', sent.length, 0);
    await post({ fb: 'score', score: '4' });
    check('een 4 ook niet', sent.length, 0);

    await post({ fb: 'score', score: '2' });
    check('een 2 stuurt één mail', sent.length, 1);
    check('naar NOTIFY_EMAIL', sent[0].to, 'studio@visuails.com');
    check('met de score in het onderwerp', sent[0].subject.includes('2/5'), true);
    check('en het onderwerp zegt dat het een lage score is', sent[0].subject.includes('Lage score'), true);
    check('de mail zegt dat er nog geen uitleg is', sent[0].html.includes('nog geen uitleg'), true);

    await post({ fb: 'score', score: '2' });
    check('dezelfde 2 nog eens: geen tweede mail', sent.length, 1);

    await post({ fb: 'note', note: 'de mouw is krom en de kleur klopt niet' });
    check('een notitie stuurt een mail', sent.length, 2);
    check('met de klacht erin', sent[1].html.includes('de mouw is krom'), true);
    check('en een ander onderwerp', sent[1].subject.includes('Klacht'), true);
    check('de mail zegt dat het privé is', sent[1].html.includes('geen enkel reviewplatform'), true);

    await post({ fb: 'note', note: 'nog een keer' });
    check('dezelfde notitie opnieuw: geen tweede mail', sent.length, 2);

    await post({ fb: 'score', score: '1' });
    check('een lagere score is nieuw nieuws', sent.length, 3);

    // Een tevreden klant die daarna toch een testimonial geeft, mag niets sturen.
    await post({ fb: 'score', score: '5' });
    await post({ fb: 'quote', quote: 'prima', quote_consent: '1' });
    check('een testimonial mailt niet', sent.length, 3);

    // Zonder sleutel gaat er niets uit, en er gaat ook niets stuk.
    const quiet = { DB: d1(fresh()), NOTIFY_EMAIL: 'x@y.z' };
    const before = sent.length;
    await handleFeedbackPost(quiet, { orderId: 7, customerId: 1, form: form({ fb: 'score', score: '1' }) });
    check('zonder RESEND_API_KEY gaat er niets uit', sent.length, before);

    // En als Resend omvalt, blijft het antwoord van de klant staan.
    globalThis.fetch = async () => { throw new Error('resend down'); };
    const db2 = fresh();
    const env2 = { DB: d1(db2), RESEND_API_KEY: 'test' };
    const res = await handleFeedbackPost(env2, { orderId: 7, customerId: 1, form: form({ fb: 'score', score: '1' }) });
    check('een omgevallen mail breekt de post niet', res.ok, true);
    check('en de score staat gewoon in de database', (await loadFeedback(env2, 7)).score, 1);
  } finally {
    globalThis.fetch = realFetch;
  }
}

/* ══ 8 · TERUGZETTEN ═════════════════════════════════════════════════════════
 * De score mag veranderen, maar wat je al hebt VERSTUURD blijft staan: een
 * privénotitie onder je weghalen omdat je je cijfer bijstelt, zou betekenen dat
 * wij hem al gelezen hebben en jij denkt dat hij nooit is aangekomen.
 */
console.log('\nterug naar de vraag');
{
  const db = fresh(); const env = { DB: d1(db) };
  await saveScore(env, 7, 1, 5);
  await handleFeedbackPost(env, { orderId: 7, customerId: 1, form: form({ fb: 'reset' }) });
  check('een kale rij verdwijnt', await loadFeedback(env, 7), null);

  await saveScore(env, 7, 1, 2);
  await saveNote(env, 7, 'de mouw is krom');
  await handleFeedbackPost(env, { orderId: 7, customerId: 1, form: form({ fb: 'reset' }) });
  const row = await loadFeedback(env, 7);
  check('een rij met een notitie blijft', row !== null, true);
  check('en de notitie staat er nog', row.private_note, 'de mouw is krom');
}

/* ══ 9 · parsePlatforms ══════════════════════════════════════════════════════ */
console.log('\nparsePlatforms');
{
  check('lege waarde', parsePlatforms(null), []);
  check('één id', parsePlatforms('google'), ['google']);
  check('witruimte eromheen', parsePlatforms(' google , trustpilot '), ['google', 'trustpilot']);
  check('onbekende ids vallen weg', parsePlatforms('google,myspace'), ['google']);
  check('een verwijderd platform leest als afwezig', parsePlatforms('yelp'), []);
}

console.log(`\n${pass}/${pass + fail} passed`);
if (fail) process.exit(1);
