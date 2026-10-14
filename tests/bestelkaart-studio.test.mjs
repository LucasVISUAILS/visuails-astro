/**
 * De bestelkaart in Studio — punt 2.03, 8 oktober 2026.
 *
 * Zonder server. Wat hier vastligt:
 *   · de dichte kaart: kenmerk, dienst, aantal, status; daaronder de Nu-zin en
 *     één knop, in een vaste volgorde (betalen → revisie bij ons → geleverd →
 *     foto ontbreekt → bezig → afgerond);
 *   · elke geleverde bestelling krijgt twee datums, uit DEZELFDE som als de
 *     levermail (leverdatums.js tegen deliveryEmail() in admin.js), nooit getypt;
 *   · de open kaart begint met "Downloaden (zip)";
 *   · afgeronde bestellingen staan ingeklapt onder "Afgerond (N)".
 */
import { readFileSync } from 'node:fs';
import { orderView, COPY } from '../src/lib/account.js';
import { deliveryEmail } from '../src/lib/admin.js';
import { leverDatums, leverMoment } from '../src/lib/leverdatums.js';
import { datum as mailDatum } from '../src/lib/mailTemplate.js';
import { REVISIE_DAGEN } from '../src/data/pricing.js';
import { DELIVERY_DAYS } from '../src/lib/retention.js';

let pass = 0;
let fail = 0;
function ok(name, cond, extra = '') {
  if (cond) pass++; else fail++;
  console.log(`${cond ? ' ok  ' : ' FAIL'} ${name}${cond || !extra ? '' : ` — ${extra}`}`);
}
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

/* "2026-10-15" → "15 okt" (de korte vorm van Studio, zie shortDate in account.js). */
const MND = { nl: ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'], en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] };
const kort = (iso, lang) => `${Number(iso.slice(8, 10))} ${MND[lang][Number(iso.slice(5, 7)) - 1]}`;
const plus = (ms, d) => new Date(ms + d * 86400000).toISOString().slice(0, 10);
const sqlNu = (d) => d.toISOString().slice(0, 19).replace('T', ' ');

const basis = { id: 77, ref: 'VIS-TEST-0077', service: 'catalog', product_count: 2, details_json: '{}', total_cents: 9800, lang: 'nl' };
const geleverd = [
  { id: 1, kind: 'delivery', product_key: 'p1', shot: 'front', filename: 'p1.webp', review_state: 'pending' },
  { id: 2, kind: 'delivery', product_key: 'p2', shot: 'front', filename: 'p2.webp', review_state: 'pending' },
];
const kaart = (o, files = [], lang = 'nl', extra = {}) => orderView(COPY[lang], lang, { ...basis, ...o }, files, [], extra.fb ?? null, 1, extra.open ?? 0, '');

/* ── 1 · DE TWEE DATUMS: DEZELFDE SOM ALS DE LEVERMAIL ─────────────────────── */
{
  const nu = new Date();
  const d = leverDatums(nu);
  ok('leverDatums: revisie = nu + REVISIE_DAGEN, bewaren = nu + DELIVERY_DAYS',
    d.revisieTot === plus(nu.getTime(), REVISIE_DAGEN) && d.bewaarTot === plus(nu.getTime(), DELIVERY_DAYS));
  for (const lang of ['nl', 'en']) {
    const html = deliveryEmail({ order: { ...basis, lang, name: 'Mara', service: 'catalog' }, link: 'https://visuails.com/o/x', n: 2, nu });
    ok(`levermail (${lang}) noemt dezelfde revisiedatum als leverDatums()`, html.includes(mailDatum(d.revisieTot, lang)), mailDatum(d.revisieTot, lang));
    ok(`levermail (${lang}) noemt dezelfde bewaardatum als leverDatums()`, html.includes(mailDatum(d.bewaarTot, lang)), mailDatum(d.bewaarTot, lang));
  }
  /* Studio rekent vanaf delivery_mailed_at, zoals D1 hem schrijft (UTC, zonder zone). */
  const v = kaart({ status: 'delivered', payment_status: 'paid', delivery_mailed_at: sqlNu(nu) }, geleverd);
  ok('Studio: "Revisie aanvragen kan tot en met …" met de dag van de mail', v.datums[0] === `Revisie aanvragen kan tot en met ${kort(d.revisieTot, 'nl')}.`, v.datums[0]);
  ok('Studio: "Je beelden staan hier tot en met …" met de dag van de mail', v.datums[1] === `Je beelden staan hier tot en met ${kort(d.bewaarTot, 'nl')}.`, v.datums[1]);
  const en = kaart({ status: 'delivered', payment_status: 'paid', delivery_mailed_at: sqlNu(nu) }, geleverd, 'en');
  ok('Studio (EN): dezelfde twee datums', en.datums.join(' | ') === `You can request a revision until ${kort(d.revisieTot, 'en')}. | Your images stay here until ${kort(d.bewaarTot, 'en')}.`, en.datums.join(' | '));
  /* Vlak voor middernacht UTC: de mail en Studio tellen dezelfde kalenderdag. */
  const laat = leverDatums('2026-10-08 23:59:59');
  ok('leverDatums: een D1-tijd vlak voor middernacht telt als UTC', laat.revisieTot === plus(Date.parse('2026-10-08T23:59:59Z'), REVISIE_DAGEN));
  ok('leverMoment: de levermail eerst, anders delivered_at', leverMoment({ delivery_mailed_at: 'a', delivered_at: 'b' }) === 'a' && leverMoment({ delivered_at: 'b' }) === 'b' && leverMoment({}) === null);
  ok('leverDatums: onleesbaar → null', leverDatums('') === null && leverDatums('gisteren') === null);
}
{
  const nu = new Date();
  const proef = kaart({ service: 'test-sample', status: 'delivered', payment_status: 'paid', delivered_at: sqlNu(nu) }, geleverd);
  ok('proef: een regel zonder revisie in plaats van de revisiedatum', proef.datums[0] === COPY.nl.datumProef && proef.datums.length === 2);
  const gebruikt = kaart({ status: 'delivered', payment_status: 'paid', delivery_mailed_at: sqlNu(nu), revision_round_at: sqlNu(nu) }, geleverd);
  ok('na een gebruikte ronde geen revisiedatum meer, wel de bewaardatum', gebruikt.datums.length === 1 && /staan hier tot en met/.test(gebruikt.datums[0]));
  const oud = kaart({ status: 'delivered', payment_status: 'paid', delivery_mailed_at: '2026-01-02 10:00:00' }, geleverd);
  ok('een datum die al voorbij is, staat er niet', oud.datums.length === 0, oud.datums.join(' | '));
  const bezig = kaart({ status: 'in_production', payment_status: 'paid' });
  ok('vóór de levering geen datums', bezig.datums.length === 0);
}
ok('geen getypte termijn in de nieuwe zinnen (REVISIE_DAGEN en DELIVERY_DAYS via leverDatums)',
  !/tot en met \d|until \d|binnen \d+ dagen|within \d+ days/.test(JSON.stringify([COPY.nl.datumRevisie('X'), COPY.nl.datumBewaar('X'), COPY.en.datumRevisie('X'), COPY.en.datumBewaar('X')]))
  /* Sinds 11 oktober 2026 (w2 = b) via leverDatumsVan(o): dezelfde som, plus het weer openen. */
  && /leverDatums\(leverMoment\(o\)\)|leverDatumsVan\(o\)/.test(lees('src/lib/account.js')));

/* ── 2 · DE DICHTE KAART: KENMERK, DIENST, AANTAL, STATUS; NU-ZIN; ÉÉN KNOP ── */
{
  const v = kaart({ status: 'in_production', payment_status: 'paid' });
  ok('dicht: alleen dienst en aantal naast kenmerk en status', v.bits.map(([k]) => k).join() === 'svc,num', v.bits.map(([k]) => k).join());
  const nu = new Date();
  const gevallen = [
    ['onbetaald → betalen, met het bedrag, als formulier naar /pay', kaart({ status: 'received', payment_status: 'unpaid' }),
      (x) => /^Nu betalen · /.test(x.nu.knop?.label) && x.nu.knop.form === '/account/orders/77/pay' && /nog niet betaald/.test(x.nu.zin)],
    ['geleverd → "Bekijk je beelden"', kaart({ status: 'delivered', payment_status: 'paid', delivery_mailed_at: sqlNu(nu) }, geleverd),
      (x) => x.nu.knop?.label === 'Bekijk je beelden' && x.nu.knop.href === '/account/orders?order=77#order-77'],
    ['revisie bij ons → de zin van de tijdlijn', kaart({ status: 'delivered', payment_status: 'paid', delivery_mailed_at: sqlNu(nu), revision_round_at: sqlNu(nu) }, [{ ...geleverd[0], review_state: 'revision_requested' }]),
      (x) => x.nu.zin === COPY.nl.flowNow.revising],
    ['foto ontbreekt → wijst het eerste lege vak aan, knop naar het fotoblok', kaart({ status: 'in_production', payment_status: 'paid' }, [{ id: 5, kind: 'upload', product_key: 'p1', shot: 'front', filename: 'a.jpg' }]),
      (x) => x.nu.zin === 'Er ontbreekt nog een foto: Product 1 · achterkant. Voeg hem toe, dan beginnen we met alles compleet.' && x.nu.knop?.href === '/account/orders?order=77#fotos-77'],
    ['bezig → wat er gebeurt, met de ingeplande dagen', kaart({ status: 'in_production', payment_status: 'paid', window_start: '2026-10-12', window_end: '2026-10-13' }),
      (x) => /^Onze studio maakt je beelden\. Ingepland van 12 okt tot 13 okt\.$/.test(x.nu.zin) && !!x.nu.knop],
    ['afgerond → "Downloaden (zip)" naar de zip', kaart({ status: 'delivered', payment_status: 'paid', closed_at: '2026-08-24 09:31:00', delivery_mailed_at: '2026-08-20 09:00:00' }, geleverd),
      (x) => x.nu.knop?.label === 'Downloaden (zip)' && /\/account\/orders\/77\/zip\?lang=nl$/.test(x.nu.knop.href)],
    ['geannuleerd → de zin, geen knop', kaart({ status: 'cancelled', payment_status: 'refunded', cancel_payment: 'refund' }),
      (x) => x.nu.knop === null && /geannuleerd/.test(x.nu.zin)],
  ];
  for (const [naam, v2, test] of gevallen) ok(`Nu-zin: ${naam}`, test(v2), JSON.stringify(v2.nu));
  /* Betalen gaat vóór een ontbrekende foto: eerst moet er betaald worden. */
  const beide = kaart({ status: 'received', payment_status: 'unpaid' }, [{ id: 5, kind: 'upload', product_key: 'p1', shot: 'front', filename: 'a.jpg' }]);
  ok('Nu-zin: betalen gaat vóór een ontbrekende foto', !!beide.nu.knop?.form);
}

/* ── 3 · DE VORM: ZIP EERST, KNOP ONDER DE DICHTE KAART, AFGEROND (N) ────── */
{
  const b = lees('src/components/studio/Bestelling.astro');
  const body = b.slice(b.indexOf('<div class="st-bestelling-body">'));
  ok('open: de inhoud begint met de map ("Downloaden (zip)")', body.indexOf('<section class="st-map">') > -1
    && body.indexOf('<section class="st-map">') < body.indexOf('v.windowLine') && body.indexOf('<section class="st-map">') < body.indexOf('<Betaling'));
  ok('open: de map staat er één keer (niet meer onder de kanten)', (b.match(/<section class="st-map">/g) || []).length === 1);
  ok('de knoptekst is "Downloaden (zip)" / "Download (zip)"', COPY.nl.bDownloadAll === 'Downloaden (zip)' && COPY.en.bDownloadAll === 'Download (zip)');
  ok('dicht: de Nu-zin en de datums staan in de kop (<summary>)', /<summary class="st-bestelling-kop">[\s\S]*class="st-nu-zin"[\s\S]*class="st-nu-datum"[\s\S]*<\/summary>/.test(b));
  ok('dicht: de ene knop staat na de <details>, binnen de kaart', /<\/details>[\s\S]*class="st-nu-knop"[\s\S]*<\/article>\s*$/.test(b));
  const css = lees('src/styles/studio.css');
  ok('open: de knop verdwijnt zonder script (details[open] + .st-nu-knop)', /\.st-bestelling-klap\[open\] \+ \.st-nu-knop \{ display: none; \}/.test(css));
  ok('geen script in de kaart', !/<script/.test(b));
  const pagina = lees('src/pages/account/orders.astro');
  ok('Afgerond (N): een <details> met de telling', /<details class="st-afgerond" open=\{afgerondOpen\}>/.test(pagina) && /t\.ordersAfgerond\(afgerond\.length\)/.test(pagina));
  ok('Afgerond (N): NL en EN', COPY.nl.ordersAfgerond(3) === 'Afgerond (3)' && COPY.en.ordersAfgerond(3) === 'Completed (3)');
  ok('Afgerond (N): de groep staat open als ?order= naar een afgeronde wijst', /afgerond\.some\(\(k\) => Number\(k\.view\.id\) === gevraagd\)/.test(pagina));
}
{
  const nu = new Date();
  ok('afgerond: een afgesloten bestelling zonder open vraag', kaart({ status: 'delivered', payment_status: 'paid', closed_at: '2026-08-24 09:31:00' }, geleverd, 'nl', { fb: { id: 1 } }).afgerond === true);
  ok('afgerond: geannuleerd', kaart({ status: 'cancelled', payment_status: 'refunded' }).afgerond === true);
  ok('niet afgerond: geleverd en nog open', kaart({ status: 'delivered', payment_status: 'paid', delivery_mailed_at: sqlNu(nu) }, geleverd).afgerond === false);
  ok('niet afgerond: net afgerond en de tevredenheidsvraag staat nog open', kaart({ status: 'delivered', payment_status: 'paid', closed_at: sqlNu(nu) }, geleverd).afgerond === false);
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
process.exit(fail ? 1 : 0);
