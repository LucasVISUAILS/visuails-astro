/*
 * LIJST 87 · E06, E07, E09 — DE MAILS (9 november 2026)
 *
 *   E06 · twee klantmails hadden een onderwerp van meer dan 60 tekens; op een telefoon valt dan het
 *         belangrijkste weg. Nu "Gebruik 116 credits vóór 8 februari 2027" en "Pauze 3 maanden:
 *         hervatten of opzeggen? — VIS-AB-0012" (cron/index.js), ook in het Engels.
 *   E07 · een studiomail over één abonnee (incasso, geld terug, nieuw, gepauzeerd/hervat/opgezegd,
 *         overstap) had hello@ als antwoordadres: op "Beantwoorden" mailde Lucas zichzelf. Nu het adres
 *         van de klant (src/lib/notify.js). De mails over een bestelling deden het al.
 *   E09 · de knop in een mail heeft een rand van 1 px in de lijnkleur (#E6E8EC), zodat hij in een
 *         donker gemaakt mailprogramma niet wegvalt; de binnenruimte is 1 px kleiner, dus de maat blijft.
 * Er gaat niets de deur uit: fetch naar Resend wordt opgevangen. Verzonnen klant en adres.
 *
 *   node tests/lijst87-u-mail.test.mjs
 */
import { readFileSync } from 'node:fs';

let goed = 0, fout = 0;
const ok = (naam, v, uitleg = '') => { if (v) { goed++; console.log(` ok   ${naam}`); } else { fout++; console.log(` FAIL ${naam}${uitleg ? `\n       ${uitleg}` : ''}`); } };
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

/* ── E07 ── */
const verstuurd = [];
globalThis.fetch = async (url, init = {}) => {
  if (String(url).includes('api.resend.com')) {
    verstuurd.push(JSON.parse(init.body));
    return new Response(JSON.stringify({ id: 'x' }), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  return new Response('{}', { status: 404 });
};
const db = { prepare() { const st = { bind() { return st; }, first: async () => null, all: async () => ({ results: [] }), run: async () => ({ meta: { changes: 1 } }) }; return st; } };
const env = { RESEND_API_KEY: 're_test', NOTIFY_EMAIL: 'studio@voorbeeld.test', DB: db };
const KLANT = 'inkoop@teststad-merk.test';
const N = await import('../src/lib/notify.js');

console.log('\nE07 · Beantwoorden gaat naar de klant');
const gevallen = [
  ['incasso niet gelukt', () => N.notifySubscriptionFailed(env, { subRef: 'VIS-AB-0012', plan: 'Starter', brand: 'Testmerk', email: KLANT, reason: 'failed', bedragCents: 0 })],
  ['abonnement gepauzeerd (incasso gestopt)', () => N.notifySubscriptionFailed(env, { subRef: 'VIS-AB-0012', plan: 'Starter', brand: 'Testmerk', email: KLANT, gestopt: true })],
  ['geld terug op een abonnement', () => N.notifySubscriptionRefunded(env, { subRef: 'VIS-AB-0012', plan: 'Starter', brand: 'Testmerk', email: KLANT })],
  ['nieuw abonnement', () => N.notifySubscriptionStarted(env, { subRef: 'VIS-AB-0012', plan: 'Starter', term: 'monthly', brand: 'Testmerk', email: KLANT, credits: 10 })],
  ['abonnement gepauzeerd', () => N.notifyAboWijziging(env, { soort: 'pauze', subRef: 'VIS-AB-0012', plan: 'Starter', brand: 'Testmerk', email: KLANT, reden: 'rustige periode' })],
  ['abonnement opgezegd', () => N.notifyAboWijziging(env, { soort: 'opgezegd', subRef: 'VIS-AB-0012', plan: 'Starter', brand: 'Testmerk', email: KLANT, reden: 'anders' })],
  ['overstap', () => N.notifyAboWijziging(env, { soort: 'overstap', subRef: 'VIS-AB-0012', plan: 'Starter', brand: 'Testmerk', email: KLANT, naar: { naam: 'Pro', credits: 1, bedrag: '—' } })],
];
for (const [naam, doe] of gevallen) {
  verstuurd.length = 0;
  await doe();
  const m = verstuurd[0];
  ok(`${naam}: naar de studio, antwoordadres de klant`, m && m.to === 'studio@voorbeeld.test' && m.reply_to === KLANT, JSON.stringify(m && { to: m.to, reply_to: m.reply_to }));
}
{
  verstuurd.length = 0;
  await N.notifyAboWijziging(env, { soort: 'hervat', subRef: 'VIS-AB-0012', plan: 'Starter', brand: 'Testmerk', email: '' });
  ok('zonder bekend adres: terug naar hello@ (geen leeg antwoordadres)', verstuurd[0] && verstuurd[0].reply_to === 'hello@visuails.com', JSON.stringify(verstuurd[0] && verstuurd[0].reply_to));
}

/* ── E09 ── */
console.log('\nE09 · de knop: een rand van 1 px in de lijnkleur, en dezelfde maat');
{
  const { button } = await import('../src/lib/mailTemplate.js');
  const h = button('https://visuails.com/nl', 'Naar je bestelpagina');
  const td = (h.match(/<td bgcolor[^>]*>/) || [''])[0];
  ok('rand 1px solid #E6E8EC', /border:1px solid #E6E8EC/.test(td), td);
  ok('binnenruimte 14px 23px (was 15px 24px: + 1 px rand = dezelfde maat)', /padding:14px 23px/.test(td), td);
  ok('nog steeds een pil', /border-radius:999px/.test(td), td);
  const schema = lees('docs/KLEURENSCHEMA.md');
  ok('#E6E8EC is de lijn uit KLEURENSCHEMA.md', /De lijn blijft `#E6E8EC`/.test(schema));
}

/* ── E06 ── */
console.log('\nE06 · de onderwerpen');
{
  const cron = lees('cron/index.js');
  ok('spaarplafond NL: "Gebruik {n} credits vóór {datum}"', cron.includes('? `Gebruik ${o.boven} credits vóór ${op}`'));
  ok('spaarplafond EN: "Use {n} credits before {date}"', cron.includes(': `Use ${o.boven} credits before ${op}`'));
  ok('pauze NL', cron.includes('`Pauze ${PAUZE_MAX_MAANDEN} maanden: hervatten of opzeggen? — ${o.ref}`'));
  ok('pauze EN', cron.includes('`Paused ${PAUZE_MAX_MAANDEN} months: resume or cancel? — ${o.ref}`'));
  ok('de oude lange vormen zijn weg', !cron.includes('komen er ${o.nieuw} credits bij — gebruik er vóór die dag') && !cron.includes('staat ${PAUZE_MAX_MAANDEN} maanden op pauze'));
  /* De langste die echt kunnen voorkomen: een datum met de langste maand, een saldo van vier cijfers. */
  const voorbeelden = [
    'Gebruik 1200 credits vóór 30 september 2027',
    'Use 1200 credits before 30 September 2027',
    'Pauze 3 maanden: hervatten of opzeggen? — VIS-AB-0012',
    'Paused 3 months: resume or cancel? — VIS-AB-0012',
  ];
  for (const v of voorbeelden) ok(`"${v}": ${v.length} tekens, niet meer dan 60`, v.length <= 60);
}

console.log(`\n${goed} goed, ${fout} fout`);
if (fout) process.exit(1);
