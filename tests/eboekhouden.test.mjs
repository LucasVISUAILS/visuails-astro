/* VISUAILS — facturen, creditnota's en betalingen naar e-Boekhouden (punt 8.08)
 *
 *   node tests/eboekhouden.test.mjs
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * WAT DIT BEWIJST — 8 oktober 2026
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * src/lib/eboekhouden.js praat met een API die hier niet bereikbaar is. Deze toets
 * zet er daarom een NAGEMAAKTE e-Boekhouden tegenover die zich gedraagt zoals de
 * OpenAPI-specificatie (v1) het beschrijft: dezelfde paden, veldnamen en
 * foutcodes, en dezelfde weigeringen — een sessie zonder geldig token (403), een
 * verzoek zonder sessie (401), een onbekende grootboekrekening (MUT_007), een
 * btw-code die niet bestaat (MUT_109), een factuurnummer dat al bestaat
 * (MUT_019), een betaling op een factuur die er niet is (MUT_115), een
 * omzetregel op een debiteurenrekening (MUT_106). Een fout in de vorm van wat er
 * verstuurd wordt, valt hier dus om, en niet pas bij Lucas.
 *
 * De database is echt (schema.sql op node:sqlite), en de facturen en creditnota's
 * komen uit de echte issueInvoice()/issueCreditNote(): wat hier geboekt wordt, is
 * wat VISUAILS werkelijk uitgeeft.
 *
 * De gevallen uit de opdracht: NL 21%, EU verlegd, buiten de EU, creditnota,
 * dubbele aanroep = één boeking, storing = wachtrij, storno. En daarnaast: de
 * koppeling uit, de proefreeks, de vanafdatum, een factuur die er al met de hand
 * in stond, een abonnementsfactuur, tegoed, /admin, en de hele webhook.
 */

import { d1, verseDb } from './lib/d1sqlite.mjs';
import { issueInvoice, issueCreditNote, issueSubscriptionInvoice } from '../src/lib/invoice.js';
import {
  koppelingAan, instellingen, naarEuro, inOfEx, btwCodeVoor, STANDAARD, verzamel, verwerk, meldStorno,
  boekhoudingAchteraf, nachtrun, opnieuw, standPerDocument, mislukteBoekingen, koppelingStand, relatieVelden,
  testKoppeling,
} from '../src/lib/eboekhouden.js';

let geslaagd = 0, gezakt = 0;
function ok(naam, waarde, verwacht = true) {
  const goed = JSON.stringify(waarde) === JSON.stringify(verwacht);
  if (goed) { geslaagd++; console.log(`  ok   ${naam}`); }
  else { gezakt++; console.log(`FAIL  ${naam}    verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(waarde)}`); }
}

/* ══ DE NAGEMAAKTE E-BOEKHOUDEN ═════════════════════════════════════════════
 * Eén administratie in het geheugen. De grootboekrekeningen hebben een intern
 * id dat NIET gelijk is aan de code (501 voor 1300), want dat is precies het
 * verschil dat de API maakt en dat de client moet overbruggen. */
const TOKEN = 'tok_proefadministratie_0001';
const BTW_ENUM = ['HOOG_VERK_21', 'LAAG_VERK_9', 'VERL_VERK', 'VERL_VERK_L9', 'AFW', 'BU_EU_VERK', 'BI_EU_VERK',
  'BI_EU_VERK_D', 'AFST_VERK', 'LAAG_INK_9', 'HOOG_INK_21', 'VERL_INK', 'AFW_VERK', 'BU_EU_INK', 'BI_EU_INK', 'GEEN'];
const TARIEF = { HOOG_VERK_21: 0.21, LAAG_VERK_9: 0.09 };

function nepBoekhouden() {
  const st = {
    sessies: new Set(),
    teller: 7000,
    grootboek: [
      { id: 501, code: '1300', description: 'Debiteuren', category: 'DEB' },
      { id: 502, code: '8000', description: 'Omzet', category: 'VW' },
      { id: 503, code: '1105', description: 'Mollie', category: 'FIN' },
      { id: 504, code: '1010', description: 'Bank', category: 'FIN' },
    ],
    relaties: [],
    mutaties: [],
    verzoeken: [],
    storing: false,
    vijfhonderd: false,
  };
  const json = (status, body) => new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  const fout = (status, code, title) => json(status, { type: 'validation', code, title, status, traceId: 'NEP-' + code });
  const grootboek = (id) => st.grootboek.find((l) => l.id === id) || null;

  function valideerMutatie(b) {
    if (!Number.isInteger(b.type) || b.type < 1 || b.type > 7) return ['MUT_001', 'Type is invalid.'];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(b.date || ''))) return ['MUT_003', 'Date is missing.'];
    if (!Number.isInteger(b.ledgerId)) return ['MUTA_001', 'Ledger id is missing.'];
    const kop = grootboek(b.ledgerId);
    if (!kop) return ['MUT_007', 'Unknown ledger for mutation.'];
    /* Aanname uit de praktijk (de open-sourceclients): een verkoopfactuur staat
       op Debiteuren, een factuurbetaling op een geldrekening. */
    if (b.type === 2 && kop.category !== 'DEB') return ['NEP_DEB', 'Verkoopfactuur hoort op een debiteurenrekening.'];
    if (b.type === 3 && kop.category !== 'FIN') return ['NEP_FIN', 'Factuurbetaling hoort op een geldrekening.'];
    if (b.inExVat !== undefined && !['IN', 'EX'].includes(b.inExVat)) return ['MUT_017', "In/Ex VAT must be 'IN' or 'EX'."];
    if ([1, 2].includes(b.type) && b.inExVat === undefined) return ['MUTA_005', 'In/Ex VAT is missing.'];
    if (!Array.isArray(b.rows) || !b.rows.length) return ['MUT_100', 'Rows are missing.'];
    if ([1, 2, 3, 4].includes(b.type)) {
      if (!Number.isInteger(b.relationId)) return ['MUT_012', 'Relation is missing.'];
      if (!st.relaties.some((r) => r.id === b.relationId)) return ['MUT_013', 'Relation not found.'];
    }
    if (b.type === 2) {
      if (!b.invoiceNumber) return ['MUT_002', 'Invoice number is missing.'];
      if (st.mutaties.some((m) => m.type === 2 && m.invoiceNumber === b.invoiceNumber && m.relationId === b.relationId)) return ['MUT_019', 'Invoice number already exists.'];
    }
    for (const r of b.rows) {
      if (!BTW_ENUM.includes(r.vatCode)) return ['MUT_109', 'Invalid VAT code.'];
      if (typeof r.amount !== 'number' || !Number.isFinite(r.amount)) return ['NEP_AMOUNT', 'amount moet een getal zijn'];
      if (Math.round(r.amount * 100) / 100 !== r.amount) return ['NEP_DEC', 'meer dan twee decimalen'];
      if ([1, 2, 5, 6, 7].includes(b.type)) {
        if (!Number.isInteger(r.ledgerId)) return ['MUTA_004', 'Ledger ID for row is missing.'];
        const l = grootboek(r.ledgerId);
        if (!l) return ['MUT_104', 'Unknown ledger for row.'];
        if ([1, 2, 5, 6].includes(b.type) && ['FIN', 'CRED', 'DEB'].includes(l.category)) return ['MUT_106', 'Invalid ledger category for row.'];
      }
      if ([3, 4].includes(b.type)) {
        if (!r.invoiceNumber) return ['MUT_120', 'Invoice number is missing.'];
        if (!Number.isInteger(r.relationId)) return ['MUT_112', 'Relation is missing.'];
        if (!st.relaties.some((x) => x.id === r.relationId)) return ['MUT_113', 'Relation not found.'];
        if (!st.mutaties.some((m) => m.type === 2 && m.invoiceNumber === r.invoiceNumber && m.relationId === r.relationId)) return ['MUT_115', 'Invoice not found.'];
      }
    }
    return null;
  }

  async function fetchFn(url, opts = {}) {
    const u = new URL(String(url));
    if (u.hostname !== 'api.e-boekhouden.nl') throw new Error('nep-e-Boekhouden: onverwacht adres ' + u.hostname);
    const method = String(opts.method || 'GET').toUpperCase();
    const auth = opts.headers?.Authorization ?? null;
    const body = opts.body ? JSON.parse(opts.body) : undefined;
    st.verzoeken.push({ method, pad: u.pathname, query: Object.fromEntries(u.searchParams), body, auth, type: opts.headers?.['Content-Type'] || null });
    if (st.storing) throw new TypeError('fetch failed');
    if (st.vijfhonderd) return json(503, { type: 'error', code: 'ERR_001', title: 'Er is iets misgegaan.', status: 503 });

    if (u.pathname === '/v1/session' && method === 'POST') {
      if (!body?.accessToken) return fout(400, 'API_SESSION_003', 'Access token is missing or empty.');
      if (!body?.source) return fout(400, 'API_SESSION_001', 'Source is missing.');
      if (!/^[\w_ ]{1,10}$/.test(body.source)) return fout(400, 'API_SESSION_002', 'Source does not match pattern.');
      if (body.accessToken !== TOKEN) return json(403, { securityType: 0, type: 'security', title: 'Geen toegang.', status: 403, code: 'SECURITY_001' });
      const t = `sessie-${++st.teller}`;
      st.sessies.add(t);
      return json(200, { token: t, expiresIn: 3600 });
    }
    /* De specificatie: `Authorization: SESSION_TOKEN` — kaal, zonder "Bearer". */
    if (!auth || !st.sessies.has(auth)) return new Response(null, { status: 401 });
    if (u.pathname === '/v1/session' && method === 'DELETE') { st.sessies.delete(auth); return new Response(null, { status: 204 }); }

    const q = Object.fromEntries(u.searchParams);
    if (u.pathname === '/v1/ledger' && method === 'GET') {
      const items = st.grootboek.filter((l) => !q.code || l.code === q.code);
      return json(200, { items, count: items.length });
    }
    if (u.pathname === '/v1/relation' && method === 'GET') {
      const items = st.relaties
        .filter((r) => (!q.email || r.emailAddress === q.email) && (!q.code || r.code === q.code))
        .map((r) => ({ id: r.id, type: r.type, code: r.code }));
      return json(200, { items, count: items.length });
    }
    if (u.pathname === '/v1/relation' && method === 'POST') {
      if (!body?.name) return fout(400, 'REL_002', 'Name is mandatory.');
      if (body.type && !['B', 'P'].includes(body.type)) return fout(400, 'REL_001', 'Relation type is invalid (B,P).');
      if (body.code && st.relaties.some((r) => r.code === body.code)) return fout(400, 'REL_049', 'Code already exists.');
      if (body.companyRegistrationNumber && !/^\d+$/.test(body.companyRegistrationNumber)) return fout(400, 'REL_008', 'Company registration number must be numeric.');
      const r = { id: ++st.teller, ...body, code: body.code || `R${st.teller}` };
      st.relaties.push(r);
      return json(201, { id: r.id, code: r.code });
    }
    if (u.pathname === '/v1/mutation' && method === 'GET') {
      const items = st.mutaties
        .filter((m) => (!q.type || String(m.type) === q.type)
          && (!q.invoiceNumber || m.invoiceNumber === q.invoiceNumber)
          && (!q.description || m.description === q.description))
        .map((m) => ({ id: m.id, type: m.type, date: m.date, invoiceNumber: m.invoiceNumber, ledgerId: m.ledgerId }));
      return json(200, { items, count: items.length });
    }
    const een = u.pathname.match(/^\/v1\/mutation\/(\d+)$/);
    if (een && method === 'GET') {
      const m = st.mutaties.find((x) => x.id === Number(een[1]));
      return m ? json(200, m) : fout(404, 'MUT_404', 'Mutation not found.');
    }
    if (u.pathname === '/v1/mutation' && method === 'POST') {
      const f = valideerMutatie(body);
      if (f) return fout(400, f[0], f[1]);
      const m = { id: ++st.teller, ...body };
      st.mutaties.push(m);
      return json(201, { id: m.id });
    }
    return fout(404, 'EP_001', 'Endpoint niet gevonden.');
  }

  /* Wat er voor een factuurnummer nog openstaat: het bruto van de factuur (of
     creditnota) min wat erop betaald is. 0 = afgeletterd. */
  function open(nummer) {
    let saldo = 0;
    for (const m of st.mutaties) {
      for (const r of m.rows || []) {
        if (m.type === 2 && m.invoiceNumber === nummer) {
          const t = TARIEF[r.vatCode] || 0;
          saldo += m.inExVat === 'EX' ? Math.round(r.amount * 100 * (1 + t)) : Math.round(r.amount * 100);
        }
        if (m.type === 3 && r.invoiceNumber === nummer) saldo -= Math.round(r.amount * 100);
      }
    }
    return saldo;
  }

  return { st, fetch: fetchFn, open, posts: (pad) => st.verzoeken.filter((v) => v.method === 'POST' && v.pad === pad) };
}

/* ══ DE OMGEVING ════════════════════════════════════════════════════════════ */
function bucket() {
  const inhoud = new Map();
  return {
    async put(key, body) { inhoud.set(key, body); return { key }; },
    async get(key) { const v = inhoud.get(key); return v ? { body: v, size: v.length } : null; },
  };
}

const VANDAAG = '2026-10-08';
const ENV_BASIS = {
  EBOEKHOUDEN_API_TOKEN: TOKEN,
  EBOEKHOUDEN_VANAF: '2026-01-01',
  SELLER_ADDRESS: 'Voorbeeldstraat 12|1234 AB Rotterdam',
  VISUAILS_VAT: 'NL000000000B00',
  VISUAILS_KVK: '00000000',
};

function verseOmgeving(extra = {}) {
  const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
  if (mislukt.length) throw new Error('schema laadt niet: ' + mislukt.slice(0, 3).join(' | '));
  return { db, env: { ...ENV_BASIS, ...extra, DB: d1(db), UPLOADS: bucket() } };
}

let volg = 0;
/* Een klant, een bestelling, een betaalde Mollie-betaling en de factuur — via de
   echte issueInvoice(). Alle gegevens onmiskenbaar verzonnen. */
async function betaaldeBestelling(db, env, { land = 'NL', btwNummer = null, behandeling = 'nl_standard', netto = 10000, btw = 2100, kvk = '99999999', tegoed = 0, proef = 0, betaald = null } = {}) {
  volg++;
  const email = `klant${volg}@voorbeeld.test`;
  const kid = Number(db.prepare(
    `INSERT INTO customers (email, name, brand, country, vat_number, reg_number, address_line1, postal_code, city)
     VALUES (?, ?, ?, ?, ?, ?, 'Voorbeeldstraat 12', '1234 AB', 'Rotterdam')`
  ).run(email, `Testpersoon ${volg}`, `Testmerk ${volg}`, land, btwNummer, kvk).lastInsertRowid);
  const ref = `VIS-TST-${String(volg).padStart(3, '0')}`;
  const details = tegoed ? JSON.stringify({ tegoed_cents: tegoed }) : '{}';
  const oid = Number(db.prepare(
    `INSERT INTO orders (ref, customer_id, service, status, name, brand, email, vat_number, lang, product_count, details_json,
                         total_cents, vat_cents, vat_rate, vat_treatment, country, address_line1, postal_code, city,
                         payment_status, paid_at, testmodus)
     VALUES (?, ?, 'catalog', 'received', ?, ?, ?, ?, 'nl', 4, ?, ?, ?, ?, ?, ?, 'Voorbeeldstraat 12', '1234 AB', 'Rotterdam',
             'paid', ?, ?)`
  ).run(ref, kid, `Testpersoon ${volg}`, `Testmerk ${volg}`, email, btwNummer, details, netto, btw, btw ? 0.21 : 0, behandeling, land,
    `${VANDAAG} 10:00:00`, proef).lastInsertRowid);
  const tr = `tr_test${String(volg).padStart(6, '0')}`;
  db.prepare(
    `INSERT INTO payments (order_id, provider, external_id, status, amount_cents, currency) VALUES (?, 'mollie', ?, 'paid', ?, 'EUR')`
  ).run(oid, tr, betaald ?? (netto + btw - tegoed));
  const factuur = await issueInvoice(env, oid, { today: VANDAAG });
  return { kid, oid, tr, email, factuur, merk: `Testmerk ${volg}`, persoon: `Testpersoon ${volg}` };
}

const rij = (db, sleutel) => db.prepare('SELECT * FROM boekhouding_boekingen WHERE sleutel = ?').get(sleutel);
const telRijen = (db) => db.prepare('SELECT COUNT(*) AS n FROM boekhouding_boekingen').get().n;

console.log('\nVISUAILS — de koppeling met e-Boekhouden\n');

/* ══ 1 · DE REKENREGELS ═════════════════════════════════════════════════════ */
console.log('de rekenregels');
{
  ok('centen naar euro: 12345 → 123.45', naarEuro(12345), 123.45);
  ok('negatief blijft negatief: -12100 → -121', naarEuro(-12100), -121);
  ok('een halve cent wordt niet meegestuurd', naarEuro(10000.4), 100);
  const inst = instellingen({});
  ok('NL → HOOG_VERK_21', btwCodeVoor('nl_standard', inst), 'HOOG_VERK_21');
  ok('EU verlegd → BI_EU_VERK_D', btwCodeVoor('eu_reverse_charge', inst), 'BI_EU_VERK_D');
  ok('buiten de EU → BU_EU_VERK', btwCodeVoor('outside_scope', inst), 'BU_EU_VERK');
  ok('een bestelling (btw = netto × 21%) gaat exclusief', inOfEx({ netCents: 10000, vatCents: 2100, btwCode: 'HOOG_VERK_21' }), { inExVat: 'EX', cents: 10000 });
  ok('een termijn (netto teruggerekend uit bruto) gaat inclusief', inOfEx({ netCents: 826, vatCents: 174, grossCents: 1000, btwCode: 'HOOG_VERK_21' }), { inExVat: 'IN', cents: 1000 });
  let gooit = null;
  try { inOfEx({ netCents: 10000, vatCents: 500, btwCode: 'HOOG_VERK_21' }); } catch (e) { gooit = e.name; }
  ok('btw die niet bij de code past: weigeren, niet boeken', gooit, 'EboekhoudenFout');
  gooit = null;
  try { inOfEx({ netCents: 10000, vatCents: 2100, btwCode: 'BI_EU_VERK_D' }); } catch (e) { gooit = e.name; }
  ok('btw op een document met een 0%-code: weigeren', gooit, 'EboekhoudenFout');
  ok('zonder token staat de koppeling uit', koppelingAan({}), false);
  ok('een token van alleen spaties telt niet', koppelingAan({ EBOEKHOUDEN_API_TOKEN: '   ' }), false);
  const anders = instellingen({ EBOEKHOUDEN_GROOTBOEK_OMZET: '8100', EBOEKHOUDEN_BRON: 'veel te lange bron!', EBOEKHOUDEN_BTW_BUITEN_EU: 'GEEN' });
  ok('een eigen omzetrekening geldt ook voor EU en buiten de EU', [anders.grootboek.omzet, anders.grootboek.omzetEu, anders.grootboek.omzetBuitenEu], ['8100', '8100', '8100']);
  ok('een ongeldige bron valt terug op de standaard', anders.bron, STANDAARD.bron);
  ok('de btw-code buiten de EU is in te stellen', anders.btw.buitenEu, 'GEEN');
  const rel = relatieVelden({ email: 'X@Voorbeeld.Test', bedrijf: 'Testmerk', naam: 'Testpersoon', land: 'DE', btw: 'de 123456789', kvk: 'HRB 12345' }, 'VIS9');
  ok('een relatie: zakelijk, code, kleine letters in het e-mailadres', [rel.type, rel.code, rel.emailAddress], ['B', 'VIS9', 'x@voorbeeld.test']);
  ok('  het land als naam, het btw-nummer zonder spatie', [rel.country, rel.vatNumber], ['Duitsland', 'DE123456789']);
  ok('  een registratienummer met letters gaat niet mee (REL_008)', rel.companyRegistrationNumber === undefined);
}

/* ══ 2 · UIT ZOLANG HET TOKEN ER NIET IS ════════════════════════════════════ */
console.log('\nuit zolang het geheim niet gezet is');
{
  const { db, env } = verseOmgeving({ EBOEKHOUDEN_API_TOKEN: '' });
  const nep = nepBoekhouden();
  await betaaldeBestelling(db, env);
  ok('verzamelen doet niets', await verzamel(env, { vandaag: VANDAAG }), 0);
  const v = await verwerk(env, { fetchFn: nep.fetch });
  ok('boeken doet niets', v.uit, true);
  ok('  en er gaat geen enkel verzoek naar e-Boekhouden', nep.st.verzoeken.length, 0);
  ok('  en er staat geen rij', telRijen(db), 0);
  ok('na een betaling: niets achteraf', boekhoudingAchteraf({ env, waitUntil: () => {} }, { orderId: 1 }), null);
  ok('het nachtrapport zwijgt', await nachtrun(env, { fetchFn: nep.fetch }), null);
}

/* ══ 3 · NL 21%, EU VERLEGD, BUITEN DE EU ═══════════════════════════════════ */
console.log('\nNederland 21%, EU verlegd, buiten de EU');
{
  const { db, env } = verseOmgeving();
  const nep = nepBoekhouden();
  const nl = await betaaldeBestelling(db, env);
  const eu = await betaaldeBestelling(db, env, { land: 'DE', btwNummer: 'DE123456789', behandeling: 'eu_reverse_charge', btw: 0, kvk: null });
  const vs = await betaaldeBestelling(db, env, { land: 'US', behandeling: 'outside_scope', btw: 0, kvk: null });
  ok('drie facturen uitgegeven', [nl.factuur?.status, eu.factuur?.status, vs.factuur?.status], ['issued', 'issued', 'issued']);

  const nieuw = await verzamel(env, { vandaag: VANDAAG });
  ok('zes boekingen klaargezet (drie facturen, drie betalingen)', nieuw, 6);
  const uit = await verwerk(env, { fetchFn: nep.fetch });
  ok('alle zes geboekt', [uit.geboekt, uit.mislukt], [6, 0]);

  const fact = (nr) => nep.st.mutaties.find((m) => m.type === 2 && m.invoiceNumber === nr);
  const bet = (nr) => nep.st.mutaties.find((m) => m.type === 3 && m.invoiceNumber === nr);
  const fNl = fact(nl.factuur.number);
  ok('NL: soort 2 op Debiteuren (id, niet de code)', [fNl?.type, fNl?.ledgerId], [2, 501]);
  ok('NL: ons factuurnummer', fNl?.invoiceNumber, nl.factuur.number);
  ok('NL: exclusief, netto € 100 op Omzet met HOOG_VERK_21', [fNl?.inExVat, fNl?.rows?.[0]?.amount, fNl?.rows?.[0]?.ledgerId, fNl?.rows?.[0]?.vatCode], ['EX', 100, 502, 'HOOG_VERK_21']);
  ok('NL: de factuurdatum', fNl?.date, VANDAAG);
  const bNl = bet(nl.factuur.number);
  ok('NL: betaling soort 3 op de tussenrekening Mollie, € 121', [bNl?.type, bNl?.ledgerId, bNl?.rows?.[0]?.amount], [3, 503, 121]);
  ok('NL: de betalingsregel draagt factuurnummer, relatie, GEEN en Debiteuren', [bNl?.rows?.[0]?.invoiceNumber, bNl?.rows?.[0]?.relationId === fNl?.relationId, bNl?.rows?.[0]?.vatCode, bNl?.rows?.[0]?.ledgerId], [nl.factuur.number, true, 'GEEN', 501]);
  ok('NL: de factuur staat niet meer open', nep.open(nl.factuur.number), 0);

  const fEu = fact(eu.factuur.number);
  ok('EU: BI_EU_VERK_D, € 100, geen btw', [fEu?.rows?.[0]?.vatCode, fEu?.rows?.[0]?.amount, fEu?.inExVat], ['BI_EU_VERK_D', 100, 'EX']);
  ok('EU: de betaling dekt hem', nep.open(eu.factuur.number), 0);
  const relEu = nep.st.relaties.find((r) => r.id === fEu?.relationId);
  ok('EU: de relatie draagt het btw-nummer en het land', [relEu?.vatNumber, relEu?.country], ['DE123456789', 'Duitsland']);

  const fVs = fact(vs.factuur.number);
  ok('buiten de EU: BU_EU_VERK', fVs?.rows?.[0]?.vatCode, 'BU_EU_VERK');
  ok('buiten de EU: afgeletterd', nep.open(vs.factuur.number), 0);

  const relNl = nep.st.relaties.find((r) => r.id === fNl?.relationId);
  ok('de relatie: zakelijk, naam = merk, contact = persoon', [relNl?.type, relNl?.name, relNl?.contact], ['B', nl.merk, nl.persoon]);
  ok('  met e-mailadres, KVK-nummer, adres en vaste code', [relNl?.emailAddress, relNl?.companyRegistrationNumber, relNl?.postalCode, relNl?.code], [nl.email, '99999999', '1234 AB', `VIS${nl.kid}`]);
  ok('drie klanten, drie relaties', nep.st.relaties.length, 3);

  const sessie = nep.st.verzoeken.filter((v) => v.pad === '/v1/session' && v.method === 'POST');
  ok('één sessie voor de hele run, met bron VISUAILS', [sessie.length, sessie[0]?.body?.source], [1, 'VISUAILS']);
  ok('het token gaat alleen naar /v1/session', nep.st.verzoeken.every((v) => v.pad === '/v1/session' || !JSON.stringify(v).includes(TOKEN)), true);
  ok('elk verzoek daarna draagt het kale sessietoken (geen "Bearer")', nep.st.verzoeken.filter((v) => v.pad !== '/v1/session' || v.method === 'DELETE').every((v) => /^sessie-\d+$/.test(String(v.auth))), true);
  ok('een POST zegt dat hij JSON stuurt', nep.posts('/v1/mutation').every((v) => v.type === 'application/json'), true);
  ok('en de sessie wordt netjes gesloten', nep.st.verzoeken.some((v) => v.method === 'DELETE' && v.pad === '/v1/session'), true);
  ok('in de database: allemaal geboekt, met het nummer uit e-Boekhouden', db.prepare("SELECT COUNT(*) n FROM boekhouding_boekingen WHERE status = 'geboekt' AND eb_mutatie_id IS NOT NULL").get().n, 6);
  ok('geen /v1/invoice (de factuurmodule van e-Boekhouden)', nep.st.verzoeken.some((v) => v.pad.startsWith('/v1/invoice')), false);
}

/* ══ 4 · CREDITNOTA EN TERUGBETALING ════════════════════════════════════════ */
console.log('\ncreditnota en terugbetaling');
{
  const { db, env } = verseOmgeving();
  const nep = nepBoekhouden();
  const a = await betaaldeBestelling(db, env);
  await verzamel(env, { vandaag: VANDAAG });
  await verwerk(env, { fetchFn: nep.fetch });

  /* Zoals de webhook het doet: Mollie meldt amountRefunded, de betaling krijgt
     haar restitutietotaal, en issueCreditNote() geeft de nota uit. */
  db.prepare('UPDATE payments SET refunded_cents = 12100 WHERE external_id = ?').run(a.tr);
  db.prepare("UPDATE orders SET refunded_cents = 12100, payment_status = 'refunded' WHERE id = ?").run(a.oid);
  const nota = await issueCreditNote(env, a.oid, { refundedGrossCents: 12100, today: VANDAAG });
  ok('creditnota uitgegeven', nota?.status, 'issued');

  ok('creditnota en terugbetaling klaargezet', await verzamel(env, { vandaag: VANDAAG }), 2);
  const uit = await verwerk(env, { fetchFn: nep.fetch });
  ok('allebei geboekt', [uit.geboekt, uit.mislukt], [2, 0]);
  const m = nep.st.mutaties.find((x) => x.type === 2 && x.invoiceNumber === nota.number);
  const f = nep.st.mutaties.find((x) => x.type === 2 && x.invoiceNumber === a.factuur.number);
  ok('de creditnota: soort 2 met een NEGATIEF bedrag', [m?.type, m?.rows?.[0]?.amount, m?.rows?.[0]?.vatCode], [2, -100, 'HOOG_VERK_21']);
  ok('  bij dezelfde relatie als de factuur', m?.relationId === f?.relationId, true);
  ok('  en er is geen tweede relatie bijgekomen', nep.st.relaties.length, 1);
  const t = nep.st.mutaties.find((x) => x.type === 3 && x.invoiceNumber === nota.number);
  ok('de terugbetaling: soort 3, € -121 van Mollie, tegen de creditnota', [t?.ledgerId, t?.rows?.[0]?.amount, t?.rows?.[0]?.invoiceNumber], [503, -121, nota.number]);
  ok('de creditnota is afgeletterd', nep.open(nota.number), 0);
  ok('de factuur blijft betaald', nep.open(a.factuur.number), 0);

  /* Een DEELrestitutie op een tweede bestelling: € 50 van € 121. */
  const b = await betaaldeBestelling(db, env);
  db.prepare('UPDATE payments SET refunded_cents = 5000 WHERE external_id = ?').run(b.tr);
  db.prepare('UPDATE orders SET refunded_cents = 5000 WHERE id = ?').run(b.oid);
  const deel = await issueCreditNote(env, b.oid, { refundedGrossCents: 5000, today: VANDAAG });
  await verzamel(env, { vandaag: VANDAAG });
  await verwerk(env, { fetchFn: nep.fetch });
  const md = nep.st.mutaties.find((x) => x.type === 2 && x.invoiceNumber === deel.number);
  ok('deelrestitutie: netto € 41,32 met 21%, tot op de cent als de nota', [md?.rows?.[0]?.amount, md?.inExVat], [-41.32, 'EX']);
  ok('  netto + btw in e-Boekhouden = de € 50 die terugging', nep.open(deel.number), 0);
  ok('  en de factuur zelf blijft betaald', nep.open(b.factuur.number), 0);

  /* Een creditnota ALS TEGOED (er gaat geen geld terug): wel de nota, geen
     terugbetaling — hij blijft openstaan als tegoed van de klant. */
  const c = await betaaldeBestelling(db, env);
  const tegoedNota = await issueCreditNote(env, c.oid, { refundedGrossCents: 12100, today: VANDAAG, reason: 'Bestelling geannuleerd — bedrag blijft staan als tegoed' });
  await verzamel(env, { vandaag: VANDAAG });
  await verwerk(env, { fetchFn: nep.fetch });
  ok('tegoed: de creditnota staat erin', !!nep.st.mutaties.find((x) => x.type === 2 && x.invoiceNumber === tegoedNota.number), true);
  ok('  maar er is geen geld terug geboekt', nep.st.mutaties.some((x) => x.type === 3 && x.invoiceNumber === tegoedNota.number), false);
  ok('  en hij staat open als tegoed van € 121', nep.open(tegoedNota.number), -12100);
}

/* ══ 5 · DUBBEL AANROEPEN = ÉÉN BOEKING ═════════════════════════════════════ */
console.log('\ndubbel aanroepen geeft één boeking');
{
  const { db, env } = verseOmgeving();
  const nep = nepBoekhouden();
  const a = await betaaldeBestelling(db, env);
  ok('eerste keer verzamelen: twee', await verzamel(env, { vandaag: VANDAAG }), 2);
  ok('tweede keer verzamelen: niets nieuws', await verzamel(env, { vandaag: VANDAAG }), 0);
  /* Twee runs TEGELIJK, zoals bij een melding die Mollie twee keer vlak na
     elkaar aflevert. */
  const [r1, r2] = await Promise.all([verwerk(env, { fetchFn: nep.fetch }), verwerk(env, { fetchFn: nep.fetch })]);
  ok('samen precies twee boekingen', r1.geboekt + r2.geboekt, 2);
  ok('  één factuur in e-Boekhouden', nep.st.mutaties.filter((m) => m.type === 2 && m.invoiceNumber === a.factuur.number).length, 1);
  ok('  één betaling', nep.st.mutaties.filter((m) => m.type === 3 && m.invoiceNumber === a.factuur.number).length, 1);
  const voor = nep.posts('/v1/mutation').length;
  await verwerk(env, { fetchFn: nep.fetch });
  await nachtrun(env, { fetchFn: nep.fetch, vandaag: VANDAAG });
  ok('nog een run en een nacht: geen enkele POST meer', nep.posts('/v1/mutation').length, voor);

  /* Een poging die NA de POST werd afgebroken (de Worker stopte): de rij staat
     nog op 'bezig', de mutatie staat al in e-Boekhouden. */
  const b = await betaaldeBestelling(db, env);
  await verzamel(env, { vandaag: VANDAAG });
  const sleutel = `factuur:${b.factuur.number}`;
  await verwerk(env, { fetchFn: nep.fetch });
  db.prepare("UPDATE boekhouding_boekingen SET status = 'bezig', poging_at = datetime('now', '-1 hour'), eb_mutatie_id = NULL WHERE sleutel = ?").run(sleutel);
  const posts = nep.posts('/v1/mutation').length;
  await verwerk(env, { fetchFn: nep.fetch });
  ok('afgebroken na de POST: overgenomen, niet opnieuw geboekt', [rij(db, sleutel).status, nep.posts('/v1/mutation').length], ['geboekt', posts]);
  ok('  met het nummer uit e-Boekhouden erbij', rij(db, sleutel).eb_mutatie_id === nep.st.mutaties.find((m) => m.invoiceNumber === b.factuur.number && m.type === 2).id, true);

  /* Lucas had de factuur al met de hand ingevoerd, bij een eigen relatie. */
  const c = await betaaldeBestelling(db, env);
  nep.st.relaties.push({ id: 900, type: 'B', code: 'HANDWERK', name: 'Met de hand', emailAddress: 'iemand-anders@voorbeeld.test' });
  nep.st.mutaties.push({ id: 901, type: 2, date: VANDAAG, ledgerId: 501, invoiceNumber: c.factuur.number, inExVat: 'EX', relationId: 900, rows: [{ ledgerId: 502, vatCode: 'HOOG_VERK_21', amount: 100 }] });
  await verzamel(env, { vandaag: VANDAAG });
  await verwerk(env, { fetchFn: nep.fetch });
  ok('al met de hand ingevoerd: niet nog eens', nep.st.mutaties.filter((m) => m.type === 2 && m.invoiceNumber === c.factuur.number).length, 1);
  ok('  de rij neemt zijn nummer en relatie over', [rij(db, `factuur:${c.factuur.number}`).eb_mutatie_id, rij(db, `factuur:${c.factuur.number}`).eb_relatie_id], [901, 900]);
  ok('  en de betaling gaat tegen die factuur in', nep.open(c.factuur.number), 0);
}

/* ══ 6 · STORING = WACHTRIJ ═════════════════════════════════════════════════ */
console.log('\neen storing wordt een wachtrij');
{
  const { db, env } = verseOmgeving();
  const nep = nepBoekhouden();
  const a = await betaaldeBestelling(db, env);
  const b = await betaaldeBestelling(db, env);
  await verzamel(env, { vandaag: VANDAAG });
  nep.st.storing = true;
  let gegooid = false;
  let uit;
  try { uit = await verwerk(env, { fetchFn: nep.fetch }); } catch { gegooid = true; }
  ok('e-Boekhouden onbereikbaar: verwerk() gooit niet', gegooid, false);
  ok('  één poging, dan stoppen (de rest strandt op hetzelfde)', [uit.mislukt, nep.st.verzoeken.length], [1, 1]);
  const eerste = rij(db, `factuur:${a.factuur.number}`);
  ok('  de rij staat op mislukt, met de reden', [eerste.status, /niet bereikbaar/.test(eerste.laatste_fout)], ['mislukt', true]);
  ok('  de andere factuur wacht gewoon', rij(db, `factuur:${b.factuur.number}`).status, 'wacht');
  ok('  de betaling ook (haar factuur staat er nog niet)', rij(db, `betaling:${a.tr}`).status, 'wacht');
  const st = await standPerDocument(env, [a.factuur.number, b.factuur.number]);
  ok('/admin ziet "mislukt" en "staat klaar"', [st.get(a.factuur.number)?.stand, st.get(b.factuur.number)?.stand], ['mislukt', 'wacht']);

  await verwerk(env, { fetchFn: nep.fetch });
  ok('een gewone run probeert de mislukte NIET opnieuw', rij(db, `factuur:${a.factuur.number}`).pogingen, 1);
  nep.st.storing = false;
  nep.st.vijfhonderd = true;
  const d = await betaaldeBestelling(db, env);
  await verzamel(env, { vandaag: VANDAAG });
  const verzoekenVoor = nep.st.verzoeken.length;
  await verwerk(env, { fetchFn: nep.fetch });
  ok('een 503: ook mislukt, met de foutcode erin', /ERR_001/.test(rij(db, `factuur:${d.factuur.number}`).laatste_fout || ''), true);
  ok('  zonder het token de schuld te geven', /token/i.test(rij(db, `factuur:${d.factuur.number}`).laatste_fout || ''), false);
  ok('  en er is gewacht met de rest', nep.st.verzoeken.length - verzoekenVoor, 1);
  nep.st.vijfhonderd = false;

  const regel = await nachtrun(env, { fetchFn: nep.fetch, vandaag: VANDAAG });
  ok("'s nachts één herkansing: alles alsnog geboekt", db.prepare("SELECT COUNT(*) n FROM boekhouding_boekingen WHERE status = 'geboekt'").get().n, 6);
  ok('  het nachtrapport zegt het', /6 boekingen in e-Boekhouden gezet/.test(String(regel)), true);
  ok('  en de facturen zijn afgeletterd', [nep.open(a.factuur.number), nep.open(b.factuur.number), nep.open(d.factuur.number)], [0, 0, 0]);

  /* Een fout die blijft (een rekening die niet bestaat): het nachtrapport noemt
     hem, en de knop "Opnieuw" werkt zodra het is opgelost. */
  const c = await betaaldeBestelling(db, env);
  nep.st.grootboek = nep.st.grootboek.filter((l) => l.code !== '8000');
  const nacht = await nachtrun(env, { fetchFn: nep.fetch, vandaag: VANDAAG });
  ok('een blijvende fout staat in het nachtrapport, met het nummer', /MISLUKT/.test(String(nacht)) && String(nacht).includes(c.factuur.number), true);
  ok('  met de reden in gewone woorden', /Grootboekrekening 8000 bestaat niet/.test(String(nacht)), true);
  ok('  en in de lijst voor /admin', (await mislukteBoekingen(env)).map((r) => r.document), [c.factuur.number]);
  nep.st.grootboek.push({ id: 502, code: '8000', description: 'Omzet', category: 'VW' });
  const id = rij(db, `factuur:${c.factuur.number}`).id;
  const knop = await opnieuw(env, { id, fetchFn: nep.fetch });
  ok('"Opnieuw" boekt de factuur én daarna haar betaling', [knop.geboekt, knop.mislukt], [2, 0]);
  ok('  niets meer mislukt', (await mislukteBoekingen(env)).length, 0);

  /* Twaalf facturen die mislukten, met twaalf betalingen die erop wachten: die
     mogen de betaling van een NIEUWE factuur niet verdringen (de LIMIT). */
  const veel = verseOmgeving();
  const nep2 = nepBoekhouden();
  for (let i = 0; i < 12; i++) await betaaldeBestelling(veel.db, veel.env);
  await verzamel(veel.env, { vandaag: VANDAAG });
  veel.db.prepare("UPDATE boekhouding_boekingen SET status = 'mislukt', laatste_fout = 'oud' WHERE soort = 'factuur'").run();
  const nieuweKlant = await betaaldeBestelling(veel.db, veel.env);
  await verzamel(veel.env, { vandaag: VANDAAG });
  const r = await verwerk(veel.env, { fetchFn: nep2.fetch, max: 10 });
  ok('twaalf wachtende betalingen verdringen een nieuwe niet', [rij(veel.db, `factuur:${nieuweKlant.factuur.number}`).status, rij(veel.db, `betaling:${nieuweKlant.tr}`).status], ['geboekt', 'geboekt']);
  ok('  en die twaalf tellen als "wacht op hun factuur"', r.wacht, 12);

  /* Een token dat niet (meer) klopt: inloggen faalt, en dat staat er. */
  const fout = verseOmgeving({ EBOEKHOUDEN_API_TOKEN: 'tok_verlopen' });
  await betaaldeBestelling(fout.db, fout.env);
  await verzamel(fout.env, { vandaag: VANDAAG });
  await verwerk(fout.env, { fetchFn: nep.fetch });
  const stand = await koppelingStand(fout.env);
  ok('verkeerd token: de laatste fout zegt "inloggen lukt niet"', /Inloggen bij e-Boekhouden lukt niet/.test(String(stand.laatsteFout?.laatste_fout)), true);
  ok('  en wijst naar het token', /EBOEKHOUDEN_API_TOKEN/.test(String(stand.laatsteFout?.laatste_fout)), true);
  ok('  en verder niets geprobeerd', fout.db.prepare("SELECT COUNT(*) n FROM boekhouding_boekingen WHERE status = 'mislukt'").get().n, 1);
}

/* ══ 7 · STORNO ═════════════════════════════════════════════════════════════ */
console.log('\nstorno (de bank van de klant haalt het geld terug)');
{
  const { db, env } = verseOmgeving();
  const nep = nepBoekhouden();
  const a = await betaaldeBestelling(db, env);
  await verzamel(env, { vandaag: VANDAAG });
  await verwerk(env, { fetchFn: nep.fetch });
  ok('eerst betaald en afgeletterd', nep.open(a.factuur.number), 0);

  ok('de storno komt op de lijst', await meldStorno(env, { molliePaymentId: a.tr, totaalCents: 12100, vandaag: VANDAAG }), 1);
  ok('  een tweede melding met hetzelfde totaal: niets erbij', await meldStorno(env, { molliePaymentId: a.tr, totaalCents: 12100, vandaag: VANDAAG }), 0);
  await verwerk(env, { fetchFn: nep.fetch });
  const s = nep.st.mutaties.find((m) => m.type === 3 && m.rows?.[0]?.amount < 0);
  ok('storno: soort 3, € -121 van Mollie, tegen de factuur', [s?.ledgerId, s?.rows?.[0]?.amount, s?.rows?.[0]?.invoiceNumber], [503, -121, a.factuur.number]);
  ok('  de factuur staat weer open: de klant heeft niet betaald', nep.open(a.factuur.number), 12100);

  /* Via de webhook-haak, zoals in het echt: amountChargedBack op de betaling. */
  const b = await betaaldeBestelling(db, env);
  const beloften = [];
  const echteFetch = globalThis.fetch;
  globalThis.fetch = nep.fetch;
  try {
    const werk = boekhoudingAchteraf({ env, waitUntil: (p) => beloften.push(p) }, { payment: { id: b.tr, amountChargedBack: { value: '60.50', currency: 'EUR' } } });
    ok('de haak geeft zijn werk aan waitUntil', beloften.length, 1);
    await werk;
  } finally { globalThis.fetch = echteFetch; }
  ok('  en boekt de factuur, de betaling en de storno', [rij(db, `factuur:${b.factuur.number}`)?.status, rij(db, `betaling:${b.tr}`)?.status, rij(db, `storno:${b.tr}:6050`)?.status], ['geboekt', 'geboekt', 'geboekt']);
  ok('  de helft staat weer open', nep.open(b.factuur.number), 6050);
}

/* ══ 8 · PROEFREEKS, VANAFDATUM, TEGOED, ABONNEMENT ═════════════════════════ */
console.log('\nproefreeks, vanafdatum, tegoed en een abonnementstermijn');
{
  const { db, env } = verseOmgeving();
  const nep = nepBoekhouden();
  const proef = await betaaldeBestelling(db, env, { proef: 1 });
  ok('een proefbestelling krijgt een PROEF-nummer', /^PROEF-/.test(proef.factuur.number), true);
  await verzamel(env, { vandaag: VANDAAG });
  ok('  en gaat standaard niet naar e-Boekhouden', rij(db, `factuur:${proef.factuur.number}`) === undefined);
  const metProef = { ...env, EBOEKHOUDEN_PROEFREEKS: 'aan' };
  await verzamel(metProef, { vandaag: VANDAAG });
  ok('  wel met EBOEKHOUDEN_PROEFREEKS = aan (de proefadministratie)', rij(db, `factuur:${proef.factuur.number}`)?.status, 'wacht');

  const later = { ...env, EBOEKHOUDEN_VANAF: '2026-12-01' };
  const oud = await betaaldeBestelling(db, env);
  await verzamel(later, { vandaag: VANDAAG });
  ok('vanaf 1 december: een factuur van oktober blijft erbuiten', rij(db, `factuur:${oud.factuur.number}`) === undefined);
  const zonderVanaf = { ...env, EBOEKHOUDEN_VANAF: '' };
  /* De factuur hierboven krijgt de datum van vandaag (de echte klok). De eerste
     run is dus "morgen", zodat die factuur van de dag ervoor is — welke dag de
     reeks ook draait. (Eerst stond hier vast 9 oktober 2026; vanaf 10 oktober
     viel de factuur daardoor ná de vanafdatum en faalde de test.) */
  const morgen = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
  await verzamel(zonderVanaf, { vandaag: morgen });
  ok('zonder vanafdatum: de dag van de eerste run, en die wordt onthouden', db.prepare("SELECT value FROM app_settings WHERE key = 'boekhouding_vanaf'").get()?.value, morgen);
  ok('  een factuur van de dag ervoor gaat dus niet mee', rij(db, `factuur:${oud.factuur.number}`) === undefined);

  const t = await betaaldeBestelling(db, env, { tegoed: 2100 });
  await verzamel(env, { vandaag: VANDAAG });
  await verwerk(metProef, { fetchFn: nep.fetch, max: 20 });
  ok('deels met tegoed betaald: de factuur volledig, de betaling € 100', [nep.st.mutaties.find((m) => m.type === 2 && m.invoiceNumber === t.factuur.number)?.rows?.[0]?.amount, nep.st.mutaties.find((m) => m.type === 3 && m.invoiceNumber === t.factuur.number)?.rows?.[0]?.amount], [100, 100]);
  ok('  het tegoeddeel staat open, en /admin zegt waarom', [nep.open(t.factuur.number), /met tegoed betaald/.test((await standPerDocument(env, [t.factuur.number])).get(t.factuur.number)?.notitie || '')], [2100, true]);

  /* Een abonnementstermijn: de factuur rekent terug uit het bruto bedrag. */
  const kid = Number(db.prepare("INSERT INTO customers (email, name, brand, country, address_line1, postal_code, city) VALUES ('abo@voorbeeld.test', 'Testpersoon Abo', 'Testmerk Abo', 'NL', 'Voorbeeldstraat 12', '1234 AB', 'Rotterdam')").run().lastInsertRowid);
  const sid = Number(db.prepare("INSERT INTO subscriptions (customer_id, ref, plan, status, vat_treatment, vat_rate) VALUES (?, 'SUB-TST-001', 'starter', 'active', 'nl_standard', 0.21)").run(kid).lastInsertRowid);
  const spid = Number(db.prepare("INSERT INTO subscription_payments (subscription_id, external_id, status, amount_cents, currency, month, created_at) VALUES (?, 'tr_abotest001', 'paid', 1000, 'EUR', '2026-10', ?)").run(sid, `${VANDAAG} 09:00:00`).lastInsertRowid);
  const abo = await issueSubscriptionInvoice(env, spid, { today: VANDAAG });
  ok('abonnementsfactuur uitgegeven', abo?.status, 'issued');
  const beloften = [];
  const echteFetch = globalThis.fetch;
  globalThis.fetch = nep.fetch;
  try { await boekhoudingAchteraf({ env, waitUntil: (p) => beloften.push(p) }, { subscriptionPaymentId: spid }); } finally { globalThis.fetch = echteFetch; }
  const ma = nep.st.mutaties.find((m) => m.type === 2 && m.invoiceNumber === abo.number);
  ok('termijn van € 10: inclusief geboekt, zodat de btw tot op de cent klopt', [ma?.inExVat, ma?.rows?.[0]?.amount], ['IN', 10]);
  ok('  en de incasso ertegenover', nep.open(abo.number), 0);
  db.prepare('UPDATE subscription_payments SET refunded_cents = 1000 WHERE id = ?').run(spid);
  await verzamel(env, { vandaag: VANDAAG });
  await verwerk(env, { fetchFn: nep.fetch });
  ok('  een restitutie op een termijn: terug tegen de abonnementsfactuur', nep.open(abo.number), 1000);
}

/* ══ 9 · /admin ═════════════════════════════════════════════════════════════ */
console.log('\n/admin: de kolom, de knop en de diagnose');
{
  const { adminGet, adminPost } = await import('../src/lib/admin.js');
  const { mintToken } = await import('../src/lib/token.js');
  const { db, env } = verseOmgeving();
  const nep = nepBoekhouden();
  const a = await betaaldeBestelling(db, env);
  await verzamel(env, { vandaag: VANDAAG });
  await verwerk(env, { fetchFn: nep.fetch });
  const b = await betaaldeBestelling(db, env);
  await verzamel(env, { vandaag: VANDAAG });
  nep.st.storing = true;
  await verwerk(env, { fetchFn: nep.fetch });
  nep.st.storing = false;

  /* De echte database, met één uitzondering: de sessie van de beheerder. */
  const echt = env.DB;
  const DB = {
    ...echt,
    prepare(sql) {
      if (/FROM admin_sessions s JOIN admin_users/.test(sql)) {
        return { bind() { return this; }, async first() { return { session_id: 1, admin_id: 1, email: 'hello@visuails.com', expires_at: '2099-01-01 00:00:00' }; }, async run() { return { meta: { changes: 0 } }; } };
      }
      if (/admin_sessions/.test(sql)) return { bind() { return this; }, async first() { return null; }, async run() { return { meta: { changes: 0 } }; }, async all() { return { results: [] }; } };
      return echt.prepare(sql);
    },
    batch: echt.batch,
  };
  const adminEnv = { ...env, DB, MOLLIE_API_KEY: 'test_0123456789abcdefghijklmnopqrstuv', RESEND_API_KEY: 're_nep' };
  const token = await mintToken();
  const vraag = (method, pad, form = null) => {
    const headers = { cookie: `vis_admin=${token}` };
    if (method === 'POST') headers.origin = 'https://visuails.com';
    const request = new Request(`https://visuails.com${pad}`, { method, headers, body: form || undefined });
    return method === 'POST' ? adminPost({ request, env: adminEnv, waitUntil() {} }) : adminGet({ request, env: adminEnv, waitUntil() {} });
  };

  const fact = await (await vraag('GET', '/admin/facturen?kwartaal=2026-Q4')).text();
  ok('/admin/facturen: de stand staat in de cel Status, zonder extra kolom', fact.includes('uitgereikt<br><span class="pill">in de boekhouding</span>') && !fact.includes('<th>Boekhouding</th>'), true);
  ok('  "in de boekhouding" bij de geboekte factuur', fact.includes('in de boekhouding'), true);
  ok('  "mislukt" met een knop Opnieuw bij de andere', fact.includes('is-warn">mislukt') && fact.includes('action="/admin/boekhouding/opnieuw"'), true);
  ok('  het blok met mislukte boekingen en de reden', fact.includes('id="boekhouding"') && /niet bereikbaar/.test(fact), true);

  const diagVoor = await (await vraag('GET', '/admin/diagnose')).text();
  ok('/admin/diagnose noemt de fout zolang hij openstaat', /niet bereikbaar/.test(diagVoor) && diagVoor.includes(b.factuur.number), true);

  const fd = new FormData();
  fd.append('id', String(rij(db, `factuur:${b.factuur.number}`).id));
  fd.append('kwartaal', '2026-Q4');
  /* De knop gebruikt de echte fetch: die gaat hier naar de nagemaakte. */
  const echteFetch = globalThis.fetch;
  globalThis.fetch = nep.fetch;
  let terug;
  try { terug = await vraag('POST', '/admin/boekhouding/opnieuw', fd); } finally { globalThis.fetch = echteFetch; }
  ok('"Opnieuw" stuurt terug naar de facturen, met de uitkomst', [terug.status, terug.headers.get('location')], [303, '/admin/facturen?kwartaal=2026-Q4&boekhouding=ok#boekhouding']);
  ok('  en de factuur staat erin, met haar betaling', [rij(db, `factuur:${b.factuur.number}`).status, rij(db, `betaling:${b.tr}`).status], ['geboekt', 'geboekt']);

  const diag = await (await vraag('GET', '/admin/diagnose')).text();
  ok('/admin/diagnose: een blok over de boekhouding', diag.includes('De boekhouding (e-Boekhouden)'), true);
  ok('  koppeling aan, met de instellingen om na te kijken', diag.includes('EBOEKHOUDEN_GROOTBOEK_MOLLIE') && diag.includes('BI_EU_VERK_D') && diag.includes('>aan<'), true);
  ok('  en na "Opnieuw" is er geen openstaande fout meer', /niet bereikbaar/.test(diag), false);
  ok('  het token zelf staat er nooit in', diag.includes(TOKEN), false);

  globalThis.fetch = nep.fetch;
  let test;
  try { test = await (await vraag('POST', '/admin/boekhouding/test', new FormData())).text(); } finally { globalThis.fetch = echteFetch; }
  ok('"Koppeling testen": inloggen lukt, rekeningen gevonden', test.includes('Inloggen lukt') && test.includes('gevonden'), true);
  ok('  en er is niets geboekt', nep.st.mutaties.length, 4);

  const t = await testKoppeling({ ...env, EBOEKHOUDEN_GROOTBOEK_MOLLIE: '9999' }, { fetchFn: nep.fetch });
  ok('test met een rekening die niet bestaat: die staat als niet gevonden', t.rekeningen.find((r) => r.naam === 'Tussenrekening Mollie')?.gevonden, false);

  const uitEnv = { ...adminEnv, EBOEKHOUDEN_API_TOKEN: '' };
  const leeg = verseOmgeving({ EBOEKHOUDEN_API_TOKEN: '' });
  const leegEnv = { ...uitEnv, DB: { ...leeg.env.DB, prepare: (sql) => (/admin_sessions/.test(sql) ? DB.prepare(sql) : leeg.env.DB.prepare(sql)), batch: leeg.env.DB.batch } };
  const request = new Request('https://visuails.com/admin/facturen', { headers: { cookie: `vis_admin=${token}` } });
  const zonder = await (await adminGet({ request, env: leegEnv, waitUntil() {} })).text();
  ok('koppeling uit en nooit iets geboekt: de tabel blijft zoals hij was', zonder.includes('id="boekhouding"') || zonder.includes('in de boekhouding') || zonder.includes('<br><span class="pill'), false);
  void a;
}

/* ══ 10 · DE HELE WEG: BESTELLEN, BETALEN, WEBHOOK, BOEKEN ═════════════════
 * Zoals tests/geldroute.test.mjs, met e-Boekhouden erbij — en eerst met
 * e-Boekhouden plat: de betaling, de factuur en de mail moeten er dan gewoon
 * zijn, en de webhook antwoordt Mollie meteen. */
console.log('\nde hele weg, via de webhook');
{
  const { db, env: basis } = verseOmgeving();
  const env = { ...basis, MOLLIE_API_KEY: 'live_abcdefghijklmnopqrstuvwxyz0123', RESEND_API_KEY: 're_test', NOTIFY_EMAIL: 'hello@visuails.com', FROM_EMAIL: 'VISUAILS <orders@visuails.com>', PUBLIC_ORIGIN: 'https://visuails.com' };
  const nep = nepBoekhouden();
  const betalingen = new Map();
  const mails = [];
  let n = 0;
  const echteFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url);
    if (u.startsWith('https://api.e-boekhouden.nl')) return nep.fetch(url, opts);
    if (u.endsWith('/v2/payments') && String(opts.method).toUpperCase() === 'POST') {
      const p = JSON.parse(String(opts.body));
      const id = `tr_web${String(++n).padStart(6, '0')}`;
      const rec = { id, status: 'open', amount: p.amount, description: p.description, metadata: p.metadata || {}, _links: { checkout: { href: `https://www.mollie.com/checkout/${id}` } } };
      betalingen.set(id, rec);
      return new Response(JSON.stringify(rec), { status: 201, headers: { 'content-type': 'application/json' } });
    }
    const m = u.match(/\/v2\/payments\/(tr_[0-9a-zA-Z]+)$/);
    if (m) {
      const rec = betalingen.get(m[1]);
      return new Response(JSON.stringify(rec || { status: 404 }), { status: rec ? 200 : 404, headers: { 'content-type': 'application/json' } });
    }
    if (u.includes('resend')) mails.push(JSON.parse(String(opts.body || '{}')));
    return new Response(JSON.stringify({ id: 'msg_test' }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  try {
    const { onRequestPost: bestel } = await import('../functions/api/order.js');
    const { onRequestPost: webhook } = await import('../functions/api/webhook/mollie.js');
    const fd = new FormData();
    for (const [k, v] of Object.entries({
      service: 'catalog', products: 4, name: 'Testpersoon Web', brand: 'TESTMERK WEB', email: 'web@voorbeeld.test', phone: '+31 6 12345678',
      country: 'NL', address_line1: 'Voorbeeldstraat 12', postal_code: '1234 AB', city: 'Rotterdam', lang: 'nl', style: 'classic',
      background: 'studio-white', business_declaration: 'yes', business_version: 'v1', no_vat_number: '1', reg_number: '99999999',
    })) fd.append(k, String(v));
    await bestel({ request: new Request('https://visuails.com/api/order', { method: 'POST', body: fd }), env, waitUntil: () => {} });
    const tr = [...betalingen.keys()][0];
    ok('de bestelling heeft een Mollie-betaling', !!tr, true);
    const rec = betalingen.get(tr);
    rec.status = 'paid';
    rec.paidAt = `${VANDAAG}T10:00:00.000Z`;

    nep.st.storing = true;
    const beloften = [];
    const post = () => { const f = new FormData(); f.append('id', tr); return new Request('https://visuails.com/api/webhook/mollie', { method: 'POST', body: f }); };
    const mailsVoor = mails.length;
    const res = await webhook({ request: post(), env, waitUntil: (p) => beloften.push(p) });
    ok('e-Boekhouden plat: Mollie krijgt toch meteen 200', res.status, 200);
    const factuur = db.prepare("SELECT number, status FROM invoices").get();
    ok('  de factuur is uitgegeven', factuur?.status, 'issued');
    ok('  en gemaild', mails.length > mailsVoor, true);
    ok('  de boekhouding loopt via waitUntil, niet ervoor', beloften.length, 1);
    await Promise.all(beloften);
    ok('  en eindigt als "mislukt" in de lijst', rij(db, `factuur:${factuur.number}`)?.status, 'mislukt');

    nep.st.storing = false;
    const regel = await nachtrun(env, { vandaag: VANDAAG });
    ok("'s nachts alsnog: factuur en betaling in e-Boekhouden", [rij(db, `factuur:${factuur.number}`)?.status, rij(db, `betaling:${tr}`)?.status], ['geboekt', 'geboekt']);
    ok('  afgeletterd', nep.open(factuur.number), 0);
    ok('  en het nachtrapport zegt het', /in e-Boekhouden gezet/.test(String(regel)), true);

    /* Mollie levert dezelfde melding nog eens af: niets dubbel. */
    const posts = nep.posts('/v1/mutation').length;
    const b2 = [];
    await webhook({ request: post(), env, waitUntil: (p) => b2.push(p) });
    await Promise.all(b2);
    ok('dezelfde melding nog eens: geen nieuwe boeking', nep.posts('/v1/mutation').length, posts);

    /* En een webhook zonder token: geen enkel verzoek naar e-Boekhouden. */
    const zonder = { ...env, EBOEKHOUDEN_API_TOKEN: '' };
    const voor = nep.st.verzoeken.length;
    const b3 = [];
    const r3 = await webhook({ request: post(), env: zonder, waitUntil: (p) => b3.push(p) });
    ok('zonder token: 200, niets in waitUntil, geen verzoek', [r3.status, b3.length, nep.st.verzoeken.length - voor], [200, 0, 0]);
  } finally {
    globalThis.fetch = echteFetch;
  }
}

console.log(`\n${geslaagd}/${geslaagd + gezakt} geslaagd`);
if (gezakt) process.exitCode = 1;
