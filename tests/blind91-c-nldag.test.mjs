/*
 * DE NEDERLANDSE DAG — 9 november 2026 (ronde 91, C01/C02/C03)
 *
 * Cloudflare rekent in UTC, de klant in Europe/Amsterdam. Tussen middernacht en
 * 01:00 (winter) of 02:00 (zomer) was het voor de code nog gisteren:
 *   · de leverkalender gaf een dag te vroeg vrij (twee wachtdagen in plaats van
 *     LEAD_DAYS = 3);
 *   · "revisie aanvragen kan tot en met …" viel een dag te vroeg;
 *   · "je beelden staan hier tot en met <dag>" noemde de dag waarop ze verdwijnen,
 *     terwijl ze op die dag al weg zijn (files.expires_at is een moment).
 * Deze toets zet de klok vast en houdt vast:
 *   1 · nlDag() geeft de Nederlandse dag, ook in de nachten van de zomertijd;
 *   2 · /api/capacity rekent vanaf de Nederlandse dag;
 *   3 · revisieTot = Nederlandse leverdag + REVISIE_DAGEN, en het stille afronden
 *       (STIL_AFRONDEN_SQL) sluit nooit vóór het einde van die dag, en uiterlijk
 *       de nacht erna;
 *   4 · bewaarTot is de laatste HELE Nederlandse dag vóór het verdwijnen, voor elke
 *       levertijd over een heel jaar (ook bij zomer- en wintertijd).
 */
import { d1, verseDb } from './lib/d1sqlite.mjs';

const EchteDate = Date;
let NU = EchteDate.now();
class KlokDate extends EchteDate {
  constructor(...a) { if (a.length === 0) super(NU); else super(...a); }
  static now() { return NU; }
}
globalThis.Date = KlokDate;

const { nlDag, vandaagNL, plusDagen } = await import('../src/lib/nlDag.js');
const { leverDatums } = await import('../src/lib/leverdatums.js');
const { amsterdamNaarUtc } = await import('../src/lib/melding.js');
const { STIL_AFRONDEN_SQL } = await import('../src/lib/close.js');
const { REVISIE_DAGEN } = await import('../src/data/pricing.js');
const { DELIVERY_DAYS } = await import('../src/lib/retention.js');
const { LEAD_DAYS, firstOfferableDay } = await import('../src/data/capacity.js');
const capaciteit = await import('../functions/api/capacity.js');

let goed = 0, fout = 0;
const ok = (naam, kreeg, wil = true) => {
  const p = JSON.stringify(kreeg) === JSON.stringify(wil);
  if (p) goed++; else fout++;
  console.log(`${p ? '  ok ' : 'FAIL'}  ${naam}${p ? '' : `    verwacht ${JSON.stringify(wil)} kreeg ${JSON.stringify(kreeg)}`}`);
};
const nl = (lokaal) => amsterdamNaarUtc(lokaal).getTime();
const sqlStempel = (ms) => new EchteDate(ms).toISOString().slice(0, 19).replace('T', ' ');

console.log('\nVISUAILS — de Nederlandse dag (ronde 91, C01/C02/C03)\n');

console.log('1 · nlDag()');
ok('13 nov 00:30 NL (12 nov 23:30 UTC) is 13 november', nlDag(nl('2026-11-13T00:30')), '2026-11-13');
ok('1 jul 01:30 NL (30 jun 23:30 UTC) is 1 juli', nlDag(nl('2026-07-01T01:30')), '2026-07-01');
ok('25 okt 02:30 NL (de nacht van de wintertijd) is 25 oktober', nlDag(nl('2026-10-25T02:30')), '2026-10-25');
ok('28 mrt 2027 03:30 NL (de nacht van de zomertijd) is 28 maart', nlDag(nl('2027-03-28T03:30')), '2027-03-28');
ok('1 jan 2027 00:30 NL is 1 januari 2027', nlDag(nl('2027-01-01T00:30')), '2027-01-01');
ok('plusDagen over de jaargrens', plusDagen('2026-12-30', 3), '2027-01-02');

console.log('2 · /api/capacity rekent vanaf de Nederlandse dag');
for (const lok of ['2026-11-13T00:30', '2027-03-28T01:30', '2027-01-01T00:30', '2026-11-12T23:30']) {
  NU = nl(lok);
  const res = await capaciteit.onRequestGet({ request: new Request('https://visuails.test/api/capacity?tier=unattended&products=3'), env: {} });
  const j = await res.json();
  ok(`${lok} NL: today = ${nlDag(NU)}, eerste dag ${firstOfferableDay(j.today)} (${LEAD_DAYS} volle dagen wachten)`, j.today, nlDag(NU));
}

console.log('3 · revisie tot en met, en het stille afronden');
{
  const { db } = verseDb(new URL('../schema.sql', import.meta.url));
  const D = d1(db);
  let id = 0, teVroeg = [], teLaat = [], verkeerd = [];
  /* elk half uur van 9 november 18:00 tot 11 november 06:00, en rond beide klokwisselingen */
  const momenten = [];
  for (const [van, uren] of [['2026-11-09T18:00', 36], ['2026-10-24T20:00', 12], ['2027-03-27T20:00', 12], ['2026-12-31T20:00', 8]]) {
    for (let i = 0; i < uren * 2; i++) momenten.push(nl(van) + i * 18e5);
  }
  for (const ms of momenten) {
    id++;
    const d = leverDatums(sqlStempel(ms));
    if (d.revisieTot !== plusDagen(nlDag(ms), REVISIE_DAGEN)) verkeerd.push(sqlStempel(ms));
    db.prepare(`INSERT INTO orders (id, ref, service, status, email, payment_status, delivery_mailed_at, delivered_at)
                VALUES (?, ?, 'catalog', 'delivered', 'r@voorbeeld.test', 'paid', ?, ?)`).run(id, `VIS-R-${id}`, sqlStempel(ms), sqlStempel(ms));
    /* de nacht draait om 03:10 UTC: dan is date('now') ook in Nederland vandaag */
    const dicht = (dag) => db.prepare(STIL_AFRONDEN_SQL.replace("date('now')", `'${dag}'`).replace(/LIMIT \d+/, 'LIMIT 100000')).all().some((r) => r.id === id);
    if (dicht(d.revisieTot)) teVroeg.push(`${sqlStempel(ms)} UTC → tot en met ${d.revisieTot}`);
    if (!dicht(plusDagen(d.revisieTot, 2))) teLaat.push(sqlStempel(ms));
  }
  ok(`${momenten.length} levermomenten: revisieTot = Nederlandse leverdag + ${REVISIE_DAGEN}`, verkeerd, []);
  ok('nooit afgerond in de nacht van de laatste beloofde dag', teVroeg.slice(0, 3), []);
  ok('wel afgerond uiterlijk de nacht daarna (+1 dag speling in de winter)', teLaat.slice(0, 3), []);
  ok('geleverd 10 nov 00:30 NL: revisie tot en met 17 november', leverDatums(sqlStempel(nl('2026-11-10T00:30'))).revisieTot, '2026-11-17');
  void D;
}

console.log('4 · "staan hier tot en met": de laatste hele dag');
{
  const fouten = [];
  const start = nl('2026-01-01T00:00');
  for (let ms = start; ms < start + 366 * 864e5; ms += 37 * 6e4 * 13) { /* elke 8 u 1 min, schuift door de dag */
    const { bewaarTot } = leverDatums(sqlStempel(ms));
    const weg = ms + DELIVERY_DAYS * 864e5;                      /* files.expires_at: het moment */
    const eindeDag = amsterdamNaarUtc(`${plusDagen(bewaarTot, 1)}T00:00`).getTime();
    const dagErna = amsterdamNaarUtc(`${plusDagen(bewaarTot, 2)}T00:00`).getTime();
    if (eindeDag > weg) fouten.push(`${sqlStempel(ms)}: tot en met ${bewaarTot}, weg ${sqlStempel(weg)}`);
    if (dagErna <= weg) fouten.push(`${sqlStempel(ms)}: ${bewaarTot} is niet de LAATSTE hele dag`);
  }
  ok('een jaar levermomenten: de genoemde dag is heel, en de laatste hele', fouten.slice(0, 3), []);
  ok('geleverd 10 nov 15:00 NL: weg op 8 feb 15:00, dus tot en met 7 februari', leverDatums(sqlStempel(nl('2026-11-10T15:00'))).bewaarTot, '2027-02-07');
  ok('geleverd 10 nov 00:30 NL: weg op 8 feb 00:30, dus tot en met 7 februari', leverDatums(sqlStempel(nl('2026-11-10T00:30'))).bewaarTot, '2027-02-07');
}

console.log('5 · vandaagNL volgt de klok');
NU = nl('2026-11-13T00:30');
ok('vandaagNL() om 00:30 NL', vandaagNL(), '2026-11-13');

globalThis.Date = EchteDate;
console.log(`\n${goed} goed, ${fout} fout`);
process.exit(fout ? 1 : 0);
