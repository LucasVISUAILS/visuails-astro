/*
 * LEVERING 117 · VERVOLG OP P5-12 EN P4-04 — DE VOORKANT DOET MEE
 * 17 november 2026
 *
 *   node tests/levering-117-vervolg.test.mjs        (geen build nodig)
 *
 *   1 · P5-12: /account/me zegt `merkmodelInbegrepen` (Merk: ja, Starter: nee), en /start/brand-model
 *       (BrandModelBrief.astro) post ingelogd naar /account/order en toont dan "Inbegrepen in je
 *       abonnement" in plaats van de prijs, in NL en EN;
 *   2 · P4-04: Studio (de bestelkaart) toont wat je krijgt en "Klaar op <datum>" uit de offerte, in plaats
 *       van "zoals afgesproken in de offerte".
 */
import { readFileSync } from 'node:fs';
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { accountGet, studioScreen } from '../src/lib/account.js';
import { hashToken } from '../src/lib/token.js';

let pass = 0;
let fail = 0;
function ok(name, cond, extra = '') {
  if (cond) pass++; else fail++;
  console.log(`${cond ? ' ok  ' : ' FAIL'} ${name}${cond || !extra ? '' : ` — ${extra}`}`);
}
console.log('\nVISUAILS — levering 117: vervolg P5-12 (merkmodelformulier) en P4-04 (Studio)\n');

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
ok('het schema laadt', mislukt.length === 0, mislukt.slice(0, 1).join(''));
const klaar = new Date(Date.now() + 20 * 864e5).toISOString().slice(0, 10);
const MAANDEN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
const klaarNl = `${Number(klaar.slice(8))} ${MAANDEN[Number(klaar.slice(5, 7)) - 1]} ${klaar.slice(0, 4)}`;
db.exec(`
  INSERT INTO customers (id, email, name, brand, country) VALUES (1, 'merk@proefmerk.test', 'Testa Proef', 'MERKPROEF', 'NL'), (2, 'starter@proefmerk.test', 'Testa Starter', 'STARTPROEF', 'NL');
  INSERT INTO subscriptions (customer_id, ref, plan, term, status) VALUES (1, 'ABO-TEST-1', 'brand', 'monthly', 'active'), (2, 'ABO-TEST-2', 'starter', 'monthly', 'active');
  INSERT INTO orders (id, ref, customer_id, service, status, email, lang, total_cents, vat_cents, vat_rate, payment_status, details_json, created_at)
  VALUES (11708, 'VIS-TEST-11708', 1, 'video', 'received', 'merk@proefmerk.test', 'nl', 36000, 7560, 0.21, 'paid',
          '{"style":"motion","quote_kind":"volledig","quote_inhoud":"Twee Motion-clips van 8 seconden","quote_klaar_op":"${klaar}"}', datetime('now'));
`);
for (const [cid, t] of [[1, 'sessie-merk-0001'], [2, 'sessie-starter-0002']]) {
  db.prepare("INSERT INTO account_sessions (customer_id, token_hash, issued_at, expires_at) VALUES (?, ?, datetime('now'), datetime('now', '+30 days'))").run(cid, await hashToken(t));
}
const env = { DB: d1(db), PUBLIC_ORIGIN: 'https://visuails.com' };
let ip = 1;
const kop = (s) => ({ 'cf-connecting-ip': `10.117.0.${ip++}`, 'accept-language': 'nl', cookie: `vis_account=${s}` });
const ctx = (request) => ({ request, env, waitUntil() {} });

console.log('1 · P5-12: /account/me en het merkmodelformulier');
{
  const me = async (s) => { const r = await accountGet(ctx(new Request('https://visuails.com/account/me', { headers: kop(s) }))); return r.ok ? r.json() : { status: r.status }; };
  const merk = await me('sessie-merk-0001');
  const starter = await me('sessie-starter-0002');
  ok('Merk-abonnee: merkmodelInbegrepen = true', merk.merkmodelInbegrepen === true, JSON.stringify(merk.merkmodelInbegrepen ?? merk));
  ok('Starter: merkmodelInbegrepen = false', starter.merkmodelInbegrepen === false, JSON.stringify(starter.merkmodelInbegrepen ?? starter));

  const bron = readFileSync(new URL('../src/components/BrandModelBrief.astro', import.meta.url), 'utf8');
  ok('het formulier vraagt wie er ingelogd is (window.visAccount)', /visAccount\(\)/.test(bron));
  ok('  en post dan naar /account/order', /setAttribute\('action', '\/account\/order'\)/.test(bron));
  ok('  en zet bij merkmodelInbegrepen de prijs weg en "inbegrepen" aan', /me\.merkmodelInbegrepen/.test(bron) && /\[data-bm-geld\]/.test(bron) && /\[data-bm-inbegrepen\]/.test(bron));
  ok('  NL: "Inbegrepen in je abonnement"', bron.includes("'Inbegrepen in je abonnement'"));
  ok('  EN: "Included in your plan"', bron.includes("'Included in your plan'"));
  const geld = (bron.match(/data-bm-geld\b/g) || []).length;
  const inb = (bron.match(/data-bm-inbegrepen hidden/g) || []).length;
  ok('  de prijs boven en in stap 5 kan weg, en de vervanging staat verborgen klaar', geld >= 5 && inb >= 3, `${geld} / ${inb}`);
}

console.log('\n2 · P4-04: Studio toont de afspraak uit de offerte');
{
  const r = await studioScreen(ctx(new Request('https://visuails.com/account/orders', { headers: kop('sessie-merk-0001') })), 'orders');
  const s = r instanceof Response ? await r.text() : JSON.stringify(r);
  ok('"Wat je krijgt: Twee Motion-clips van 8 seconden"', s.includes('Wat je krijgt: Twee Motion-clips van 8 seconden'), s.slice(0, 200));
  ok(`"Klaar op ${klaarNl}"`, s.includes(`Klaar op ${klaarNl}`));
  /* De kopij-tabel reist mee in het antwoord van studioScreen; kijk dus naar de leverregel van de kaart zelf. */
  const regel = (s.match(/"windowLine":"([^"]*)"/) || [])[1] || '';
  ok('de leverregel van de kaart is de afspraak, niet "zoals afgesproken in de offerte"', regel.startsWith('Wat je krijgt') && !regel.includes('zoals afgesproken'), regel);
}

console.log(`\n${pass} goed, ${fail} fout`);
process.exit(fail ? 1 : 0);
