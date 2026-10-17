/* VISUAILS — WhatsApp-knoppen met een vaste tekst op vijf momenten (punt 7.05).
 *   node tests/wa-momenten.test.mjs          (geen server, geen browser)
 *
 *   1 · waLink() per moment en taal: de tekst, het nummer, Bellen voorop bij een
 *       Nederlandse klant, geen wa.me bij een onzeker landnummer, geen ik-vorm,
 *       en dezelfde vervaldatum als de herinneringsmail;
 *   2 · de plekken: de bestelpagina in /admin (betaling open met "dag N van 14",
 *       mail kwam niet aan), de zijkolom "wacht op betaling" op het dashboard,
 *       de studiomails (betaling niet gelukt, incasso niet gelukt) en het
 *       nachtrapport (mail kwam niet aan);
 *   3 · de telefoontekst in stap 3 en geen "we appen je" meer in klantteksten.
 * Verzonnen merken en adressen; niets hiervan bestaat.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { waLink, waTekst, waNummer, WA_MOMENTEN, contactKnoppen, vervalDatum, betaalDag, reviewLink } from '../src/lib/waLink.js';
import { waNummer as waNummerAdmin, adminGet } from '../src/lib/admin.js';
import { notifyPaymentFailed, notifySubscriptionFailed } from '../src/lib/notify.js';
import { tasks } from '../cron/index.js';
import { VERVAL_DAG, BETALEN_NA_BTW_AKKOORD } from '../src/data/termijnen.js';
import { mintToken, hashToken } from '../src/lib/token.js';

let goed = 0, fout = 0;
/* De aanhef (17 oktober 2026, afvinklijst 33): het dagdeel in het land van de klant,
   of "Hallo"/"Hello". De tekst hangt dus af van het uur waarop de toets draait. */
const GROET_NL = '(?:Goedemorgen|Goedemiddag|Goedenavond|Hallo)';
const GROET_EN = '(?:Good morning|Good afternoon|Good evening|Hello)';
const GROET_NL_URL = GROET_NL;
const GROET_EN_URL = '(?:Good%20morning|Good%20afternoon|Good%20evening|Hello)';
const ok = (naam, w, v = true) => {
  const p = JSON.stringify(w) === JSON.stringify(v);
  if (p) goed++; else fout++;
  console.log(`${p ? '  ok ' : 'FAIL'}  ${naam}${p ? '' : `    verwacht ${JSON.stringify(v)} kreeg ${JSON.stringify(w)}`}`);
};
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const zonderIk = (t) => !/\b(ik|mij|mijn|me)\b/i.test(t.replace(/VISUAILS/g, '')) && !/\b(I|my)\b/.test(t);

console.log('\n1 · waLink() per moment en taal');
const sanne = { ref: 'VIS-AB12-C3D', name: 'Sanne Voorbeeld', lang: 'nl', email: 'sanne@voorbeeld-volt.test', phone: '06 12345678', land: 'NL', created_at: '2026-10-01 10:00:00' };
const lena = { ...sanne, name: 'Lena Muster', lang: 'en', phone: '0151 23456789', land: 'DE' };
/* Ronde B (8 oktober 2026): twee momenten die Lucas zelf vroeg — credits
   bespreken (2.07) en een teruggeboekte betaling (8.11), allebei alleen in een
   studiomail. */
ok('precies zeven momenten', Object.keys(WA_MOMENTEN), ['betaling', 'fotos', 'bounce', 'incasso', 'review', 'credits', 'terugboeking']);
ok('waNummer() staat nog in admin.js (dezelfde functie)', waNummerAdmin === waNummer);
let gooit = false;
try { waTekst('levering', sanne); } catch { gooit = true; }
ok('een zesde moment (levering) bestaat niet', gooit);

const lijst = [{ key: 'p1', index: 1, naam: 'Hoodie zwart', mist: ['back'] }];
for (const moment of Object.keys(WA_MOMENTEN)) {
  const extra = moment === 'fotos' ? { lijst } : {};
  const nl = waLink(moment, sanne, extra);
  const en = waLink(moment, lena, extra);
  ok(`${moment}: NL begint met de aanhef ("Goedemiddag Sanne," of "Hallo Sanne,")`, new RegExp(`^${GROET_NL} Sanne,`).test(nl.tekst));
  ok(`${moment}: EN begint met de aanhef ("Good afternoon Lena," of "Hello Lena,")`, new RegExp(`^${GROET_EN} Lena,`).test(en.tekst));
  ok(`${moment}: eindigt op VISUAILS`, nl.tekst.endsWith('VISUAILS') && en.tekst.endsWith('VISUAILS'));
  ok(`${moment}: zonder ik-vorm`, zonderIk(nl.tekst) && zonderIk(en.tekst), true);
  /* Review: WhatsApp voorop, ook bij een Nederlandse klant (V27 = b). */
  ok(`${moment}: NL-klant → tel: +wa.me/31…, ${moment === 'review' ? 'appen' : 'Bellen'} voorop`, [nl.tel, new RegExp(`^https://wa\\.me/31612345678\\?text=${GROET_NL_URL}%20Sanne`).test(nl.wa), nl.belEerst], ['tel:+31612345678', true, moment !== 'review']);
  ok(`${moment}: Duitse klant → wa.me/49… en tel:+49…, appen voorop`, [new RegExp(`^https://wa\\.me/4915123456789\\?text=${GROET_EN_URL}%20Lena`).test(en.wa), en.tel, en.belEerst], [true, 'tel:+4915123456789', false]);
  if (!['incasso', 'review', 'credits'].includes(moment)) ok(`${moment}: het kenmerk staat erin`, nl.tekst.includes('VIS-AB12-C3D') && en.tekst.includes('VIS-AB12-C3D'));
}
ok('credits: saldo en eerste vervaldatum staan erin', /nu 72, de eerste vervallen op 31 oktober/.test(waTekst('credits', sanne, { saldo: 72, vervalt: '31 oktober' })) && /72 right now, the first ones expire on 31 October/.test(waTekst('credits', lena, { saldo: 72, vervalt: '31 October' })));
ok('review: kenmerk en de reviewlink, en "eerlijke review" (niet gefilterd op score)',
  waTekst('review', sanne).includes('VIS-AB12-C3D') && waTekst('review', sanne).includes(reviewLink()) && /eerlijke review/.test(waTekst('review', sanne)) && /honest review/.test(waTekst('review', lena)));
ok('bounce: half adres, niet het hele', /s…@voorbeeld-volt\.test/.test(waTekst('bounce', sanne)) && !waTekst('bounce', sanne).includes('sanne@'));
ok('betaling: de vervaldatum staat erin', waTekst('betaling', sanne).includes(`vervalt de bestelling na ${vervalDatum(sanne)}`));
/* Dezelfde som als stuurBetaallink(): VERVAL_DAG na bestellen, BETALEN_NA_BTW_AKKOORD na een btw-akkoord. */
const verwacht = (iso, n, lang) => new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'nl-NL', { day: 'numeric', month: 'long', timeZone: 'Europe/Amsterdam' }).format(new Date(Date.parse(iso.replace(' ', 'T') + 'Z') + n * 86400000));
ok('vervaldatum = bestellen + VERVAL_DAG (als de herinneringsmail)', vervalDatum(sanne), verwacht(sanne.created_at, VERVAL_DAG, 'nl'));
ok('vervaldatum na btw-akkoord = akkoord + BETALEN_NA_BTW_AKKOORD', vervalDatum({ ...sanne, review_state: 'approved', reviewed_at: '2026-10-03 09:00:00' }), verwacht('2026-10-03 09:00:00', BETALEN_NA_BTW_AKKOORD, 'nl'));
ok('dag 5 van 14', betaalDag(sanne, new Date('2026-10-05T12:00:00Z')), { dag: 5, van: VERVAL_DAG });
ok('wacht op de btw-controle: geen klok', betaalDag({ ...sanne, review_state: 'pending' }), null);
ok('incasso: de maand als die er is', /abonnement van oktober/.test(waTekst('incasso', sanne, { maand: '2026-10' })) && /subscription for October/.test(waTekst('incasso', lena, { maand: '2026-10' })));
const twijfel = waLink('betaling', { ...sanne, phone: '0470 12 34 56', land: '' });
ok('landnummer onzeker → geen wa.me, wel bellen', [twijfel.wa, twijfel.tel], ['', 'tel:0470123456']);
const knoppenNl = contactKnoppen(waLink('betaling', sanne), { wie: 'VOLT', email: sanne.email, onderwerp: 'x' });
ok('knoppen NL: Bel vóór App, en Mail met dezelfde tekst', knoppenNl.indexOf('Bel VOLT') < knoppenNl.indexOf('App VOLT') && new RegExp(`mailto:sanne@voorbeeld-volt\\.test\\?subject=x&body=${GROET_NL_URL}%20Sanne`).test(knoppenNl));
const knoppenDe = contactKnoppen(waLink('betaling', lena), { wie: 'MUSTER' });
ok('knoppen DE: App vóór Bel', knoppenDe.indexOf('App MUSTER') < knoppenDe.indexOf('Bel MUSTER'));
ok('Bellen is de violette knop bij NL, appen bij DE', /btn btn-primary btn-sm" href="tel:/.test(knoppenNl) && /btn btn-primary btn-sm" href="https:\/\/wa\.me/.test(knoppenDe));

/* ══ 2 · DE PLEKKEN ═════════════════════════════════════════════════════════ */
console.log('\n2 · de plekken');
const gezien = [];
const echteFetch = globalThis.fetch;
globalThis.fetch = async (url, opts = {}) => {
  gezien.push({ url: String(url), body: opts.body ? String(opts.body) : '' });
  return new Response('{"id":"msg"}', { status: 200, headers: { 'content-type': 'application/json' } });
};
const mails = () => gezien.filter((g) => g.url.includes('resend')).map((g) => JSON.parse(g.body));

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
ok('het schema laadt', mislukt.length, 0);
const env = { DB: d1(db), RESEND_API_KEY: 're_test', NOTIFY_EMAIL: 'studio@voorbeeld.test', FROM_EMAIL: 'VISUAILS <orders@visuails.com>', PUBLIC_ORIGIN: 'https://visuails.com' };
db.exec(`
  INSERT INTO customers (id, email, name, first_name, brand, phone, country) VALUES
    (1, 'sanne@voorbeeld-volt.test', 'Sanne Voorbeeld', 'Sanne', 'VOLT', '06 12345678', 'NL'),
    (2, 'lena@muster-mode.test', 'Lena Muster', 'Lena', 'MUSTER', '0151 23456789', 'DE');
  INSERT INTO orders (id, ref, customer_id, service, status, name, brand, email, phone, total_cents, vat_cents, lang, product_count, payment_status, country, created_at)
    VALUES (11, 'VIS-TEST-0011', 1, 'catalog', 'received', 'Sanne Voorbeeld', 'VOLT', 'sanne@voorbeeld-volt.test', '06 12345678', 10000, 2100, 'nl', 2, 'unpaid', 'NL', datetime('now', '-4 days')),
           (12, 'VIS-TEST-0012', 2, 'catalog', 'received', 'Lena Muster', 'MUSTER', 'lena@muster-mode.test', '0151 23456789', 10000, 0, 'en', 2, 'unpaid', 'DE', datetime('now', '-1 days')),
           (13, 'VIS-TEST-0013', 1, 'catalog', 'delivered', 'Sanne Voorbeeld', 'VOLT', 'sanne@voorbeeld-volt.test', '06 12345678', 10000, 2100, 'nl', 2, 'paid', 'NL', datetime('now', '-9 days'));
  INSERT INTO mail_bounces (event_id, email, kind, bounce_type, occurred_at) VALUES ('ev_1', 'lena@muster-mode.test', 'bounced', 'Permanent', datetime('now', '-2 hours'));
  INSERT INTO admin_users (id, email, password_hash) VALUES (1, 'studio@voorbeeld.test', 'x');
`);
const adminToken = await mintToken();
db.prepare(`INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (1, 1, ?, '2099-01-01T00:00:00Z')`).run(await hashToken(adminToken));
const get = async (pad) => {
  const res = await adminGet({ request: new Request(`https://visuails.com${pad}`, { headers: { cookie: `vis_admin=${adminToken}` } }), env, waitUntil() {} });
  return { status: res.status, html: await res.text() };
};

{
  const { status, html } = await get('/admin/orders/11/files');
  ok('bestelpagina laadt', status, 200);
  ok('betaling open: "dag 5 van 14" en de knoppen, Bellen voorop (NL)',
    /id="betaling"/.test(html) && html.includes(`dag 5 van ${VERVAL_DAG}`) && html.indexOf('href="tel:+31612345678"') > -1
      && html.indexOf('href="tel:+31612345678"') < html.search(new RegExp(`href="https://wa\\.me/31612345678\\?text=${GROET_NL_URL}%20Sanne`)));
}
{
  const { html } = await get('/admin/orders/12/files');
  ok('bounce: de rode regel met App (DE, voorop) en Bel, zonder mailknop',
    /Mail aan lena@muster-mode\.test kwam niet aan/.test(html) && new RegExp(`href="https://wa\\.me/4915123456789\\?text=${GROET_EN_URL}%20Lena%2C%20our%20email`).test(html)
      && !new RegExp(`mailto:lena@muster-mode\\.test\\?subject=[^"]*body=${GROET_EN_URL}%20Lena%2C%20our%20email`).test(html));
  ok('betaling open (EN-klant): de tekst in het Engels', new RegExp(`wa\\.me/4915123456789\\?text=${GROET_EN_URL}%20Lena%2C%20your%20order%20VIS-TEST-0012%20is%20still%20open`).test(html));
}
{
  const { html } = await get('/admin/orders/13/files');
  ok('betaald en geleverd: geen betaalknoppen', /id="betaling"/.test(html), false);
}
{
  const { status, html } = await get('/admin');
  ok('dashboard laadt', status, 200);
  const zij = html.slice(html.indexOf('class="db-zij"'));
  ok('zijkolom "wacht op betaling": de twee bestellingen met "dag N van 14"', /class="db-wacht"/.test(zij) && zij.includes('VIS-TEST-0011') && zij.includes(`dag 5 van ${VERVAL_DAG}`) && zij.includes(`dag 2 van ${VERVAL_DAG}`));
  ok('  met Bel/App/Mail', /class="db-wacht"[\s\S]*href="tel:\+31612345678"[\s\S]*wa\.me\/31612345678[\s\S]*mailto:sanne@voorbeeld-volt\.test/.test(zij));
}
{
  gezien.length = 0;
  await notifyPaymentFailed(env, 11, 'expired');
  const m = mails()[0];
  ok('studiomail "Betaling niet gelukt": de knop Bel (NL) en de link App', /Betaling niet gelukt/.test(m?.subject || '') && /href="tel:\+31612345678"/.test(m?.html || '') && new RegExp(`wa\\.me/31612345678\\?text=${GROET_NL_URL}%20Sanne`).test(m?.html || ''));
  ok('  Bel staat vóór App', (m?.html || '').indexOf('tel:+31612345678') < (m?.html || '').indexOf('wa.me/31612345678'));
  gezien.length = 0;
  await notifyPaymentFailed(env, 13, 'expired');
  ok('  niet bij een bestelling die inmiddels betaald is', /wa\.me|tel:/.test(mails()[0]?.html || ''), false);
  gezien.length = 0;
  await notifySubscriptionFailed(env, { subRef: 'ABO-TEST-1', plan: 'Studio', brand: 'MUSTER', email: 'lena@muster-mode.test', reason: 'failed' });
  const i = mails()[0];
  ok('studiomail "Incasso niet gelukt": App (DE) met de Engelse tekst', /Incasso niet gelukt/.test(i?.subject || '') && new RegExp(`wa\\.me/4915123456789\\?text=${GROET_EN_URL}%20Lena%2C%20the%20payment%20for%20your%20VISUAILS%20subscription`).test(i?.html || ''));
}
{
  const regel = await tasks.mailNietAan(env);
  ok('nachtrapport: "Mail kwam niet aan" met de bestelling en de app-link', /^Mail kwam niet aan bij 1 klant:/.test(regel || '') && /VIS-TEST-0012 \(MUSTER, kwam niet aan\)/.test(regel || '') && new RegExp(`app MUSTER: https://wa\\.me/4915123456789\\?text=${GROET_EN_URL}%20Lena`).test(regel || ''));
  ok('  en bellen als tweede regel', /\n\s+bel MUSTER: tel:\+4915123456789/.test(regel || ''));
  db.exec("UPDATE mail_bounces SET created_at = datetime('now', '-3 days')");
  ok('  een oude bounce staat er de volgende ochtend niet meer', await tasks.mailNietAan(env), null);
}
globalThis.fetch = echteFetch;

/* ══ 3 · DE TELEFOONTEKST EN GEEN "WE APPEN JE" ══════════════════════════════ */
console.log('\n3 · de telefoontekst in stap 3, en geen "we appen je" meer');
const flow = lees('src/components/order/OrderFlow.astro');
ok('stap 3 NL: "We nemen contact met je op als er iets met je bestelling is."', flow.includes("phoneHint: 'We nemen contact met je op als er iets met je bestelling is.'"));
ok('stap 3 EN: gelijkwaardig', flow.includes("phoneHint: 'We get in touch if anything comes up with your order.'"));
ok('de keuzelijst "Hoe kunnen we je het beste bereiken" blijft', /contactvoorkeur/.test(flow));
const klantbestanden = [];
const loop = (map) => {
  for (const naam of readdirSync(map)) {
    const pad = join(map, naam);
    if (statSync(pad).isDirectory()) loop(pad);
    else if (/\.(astro|js|mjs|json)$/.test(naam)) klantbestanden.push(pad);
  }
};
for (const m of ['src', 'functions', 'cron']) loop(fileURLToPath(new URL(`../${m}`, import.meta.url)));
const zonderCommentaar = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
const treffers = klantbestanden.filter((p) => /\bwe appen je\b|\bwe whatsappen je\b|\bwe message you if\b/i.test(zonderCommentaar(readFileSync(p, 'utf8'))));
ok('nergens meer "we appen je" / "we message you if" in klantteksten', treffers.map((p) => p.split('/wt-w3/')[1] || p), []);
ok('billing.js: phoneErr met "we nemen contact met je op"', /phoneErr: 'Vul een nummer in waarop we je kunnen bereiken — we nemen contact met je op als er iets met je bestelling is\.'/.test(lees('src/data/billing.js')));
ok('"app ons" voor wie zelf een vraag heeft, blijft', /app ons/.test(lees('src/lib/mailTemplate.js')));

console.log(`\n${goed}/${goed + fout} geslaagd`);
process.exit(fout ? 1 : 0);
