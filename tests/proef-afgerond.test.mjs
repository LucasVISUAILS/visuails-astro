/**
 * De privélink van de €1-proef als eerste verkooppagina — punt 3.08, 8 oktober 2026.
 *
 * Zonder server (node:sqlite met het echte schema.sql). Wat hier vastligt:
 *   · een proef is afgerond op het moment van levering (V29 = a), met de reden
 *     "proef" op de tijdlijn; een gewone bestelling niet;
 *   · de privélink toont dan meteen de downloads, "Bestel in deze look" met
 *     "catalogfoto’s vanaf €39 per product" (uit de staffel, niet getypt) en het
 *     afrondblok van 3.05 (tevredenheid); goedkeuren en een ronde blijven dicht;
 *   · Studio toont voor de proef hetzelfde; de levermail noemt hetzelfde bedrag.
 */
import { maybeCloseOrder } from '../src/lib/close.js';
import { portalGet, portalPost } from '../src/lib/portal.js';
import { orderView, COPY } from '../src/lib/account.js';
import { deliveryEmail } from '../src/lib/admin.js';
import { ladderFloor, euro } from '../src/data/pricing.js';
import { hashToken, mintToken } from '../src/lib/token.js';
import { verseDb, d1 } from './lib/d1sqlite.mjs';

let pass = 0;
let fail = 0;
function ok(name, cond, extra = '') {
  if (cond) pass++; else fail++;
  console.log(`${cond ? ' ok  ' : ' FAIL'} ${name}${cond || !extra ? '' : ` — ${extra}`}`);
}

console.log('\nVISUAILS — de proef als eerste verkooppagina (3.08)\n');

function db() {
  const { db: d, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
  if (mislukt.length) throw new Error(mislukt.join(' | '));
  d.exec("INSERT INTO customers (id, email, brand) VALUES (1, 'studio@voorbeeld-volt.nl', 'VOLT')");
  return d;
}
const PROEF = (d, { closed = false, status = 'delivered' } = {}) => d.prepare(`INSERT INTO orders (id, ref, customer_id, service, status, tier, product_count, email, lang, brand, total_cents, payment_status, delivered_at, delivery_mailed_at, closed_at, details_json)
  VALUES (1, 'VIS-PROEF-0001', 1, 'test-sample', ?, 'unattended', 1, 'studio@voorbeeld-volt.nl', 'nl', 'VOLT', 100, 'paid', datetime('now'), datetime('now'), ${closed ? "datetime('now')" : 'NULL'}, ?)`)
  .run(status, JSON.stringify({ sample_type: 'catalog', background: 'light-grey', background_hex: '#F5F5F5', ratio: 'portrait45', model: 'ava' }));
const BEELD = (d, id = 1) => d.exec(`INSERT INTO files (id, order_id, kind, r2_key, filename, bytes, review_state, product_key, shot) VALUES (${id}, 1, 'delivery', 'k${id}', 'b${id}.jpg', 1000, 'pending', 'p1', 'front')`);

/* ── 1 · AFGEROND BIJ LEVERING ─────────────────────────────────────────────── */
{
  const d = db();
  PROEF(d);
  BEELD(d);
  const env = { DB: d1(d) };
  ok('maybeCloseOrder: een geleverde proef met een beeld is af', await maybeCloseOrder(env, 1) === true);
  const o = d.prepare('SELECT closed_at FROM orders WHERE id = 1').get();
  ok('  closed_at staat', !!o.closed_at);
  const ev = d.prepare("SELECT note, actor FROM order_events WHERE order_id = 1 ORDER BY id DESC LIMIT 1").get();
  ok('  met de reden "proef" op de tijdlijn', /\(proef\)/.test(ev?.note || '') && ev.actor === 'system', ev?.note);
  ok('  nog een keer: niets nieuws', await maybeCloseOrder(env, 1) === false && d.prepare('SELECT COUNT(*) n FROM order_events WHERE order_id = 1').get().n === 1);
}
{
  const d = db();
  PROEF(d, { status: 'in_production' });
  BEELD(d);
  ok('een proef die nog niet geleverd is, blijft open', await maybeCloseOrder({ DB: d1(d) }, 1) === false);
}
{
  const d = db();
  PROEF(d);
  ok('een geleverde proef zonder beeld blijft open (geen lege afronding)', await maybeCloseOrder({ DB: d1(d) }, 1) === false);
}
{
  const d = db();
  d.exec("INSERT INTO orders (id, ref, customer_id, service, status, email, lang) VALUES (1, 'VIS-GEWOON-0001', 1, 'catalog', 'delivered', 'studio@voorbeeld-volt.nl', 'nl')");
  BEELD(d);
  ok('een gewone bestelling met een open beeld wordt NIET afgerond', await maybeCloseOrder({ DB: d1(d) }, 1) === false);
}

/* ── 2 · DE PRIVÉLINK VAN DE PROEF ─────────────────────────────────────────── */
async function privelink({ closed }) {
  const d = db();
  PROEF(d, { closed });
  BEELD(d);
  const token = mintToken();
  d.prepare('INSERT INTO order_tokens (order_id, token_hash) VALUES (1, ?)').run(await hashToken(token));
  const env = { DB: d1(d), RESEND_API_KEY: '', NOTIFY_EMAIL: '' };
  const ctx = (init) => ({ request: new Request(`https://visuails.com/o/${token}`, init), env, waitUntil() {} });
  return {
    d,
    html: async () => (await portalGet(ctx())).text(),
    post: (velden) => portalPost(ctx({ method: 'POST', body: new URLSearchParams(velden) })),
  };
}
for (const closed of [true, false]) {
  const p = await privelink({ closed });
  const html = await p.html();
  const naam = closed ? 'afgerond bij levering' : 'een oude proef zonder closed_at';
  ok(`${naam}: meteen het afrondblok`, html.includes('id="afgerond"') && html.indexOf('id="afgerond"') < html.indexOf('class="facts"'));
  ok(`  de downloads bovenaan`, html.indexOf('class="folder"', html.indexOf('id="afgerond"')) > -1 && html.indexOf('class="folder"') < html.indexOf('class="herbestel"'));
  ok(`  "Bestel in deze look" vóór de tevredenheidsvraag`, html.indexOf('class="herbestel"') < html.indexOf('class="fb"') && />Bestel in deze look<\/a>/.test(html));
  ok(`  met de echte keuzes in de link`, html.includes('href="/nl/start/catalog/?bg=F5F5F5&amp;ratio=portrait45&amp;face=ava"'));
  ok(`  "catalogfoto’s vanaf ${euro(ladderFloor('catalog'), 'nl')} per product" uit de staffel`, html.includes(`catalogfoto’s vanaf ${euro(ladderFloor('catalog'), 'nl')} per product`));
  ok(`  de tevredenheidsvraag staat er`, html.includes('Ben je tevreden met wat je hebt gekregen?'));
  ok(`  en de zin bovenaan: "Je proefset staat klaar om te downloaden."`, html.includes('Je proefset staat klaar om te downloaden.'));
  ok(`  geen goedkeurknoppen en geen revisieronde`, !/value="approve-all"|value="approve"|id="rr"/.test(html));
  const r = await p.post({ fb: 'score', score: '5' });
  ok(`  een score wordt aangenomen`, r.status === 303 && p.d.prepare('SELECT score FROM order_feedback WHERE order_id = 1').get()?.score === 5);
  const a = await p.post({ action: 'approve-all' });
  ok(`  "alles goedkeuren" doet niets bij een proef`, a.status === 303 && p.d.prepare("SELECT review_state FROM files WHERE id = 1").get().review_state === 'pending');
}

/* ── 3 · STUDIO EN DE LEVERMAIL ────────────────────────────────────────────── */
{
  const o = { id: 1, ref: 'VIS-PROEF-0001', service: 'test-sample', status: 'delivered', payment_status: 'paid', total_cents: 100, lang: 'nl', closed_at: new Date().toISOString().slice(0, 19).replace('T', ' '), delivered_at: new Date().toISOString().slice(0, 19).replace('T', ' '), details_json: JSON.stringify({ sample_type: 'lifestyle', style: 'glow', ratio: 'story' }) };
  const v = orderView(COPY.nl, 'nl', o, [{ id: 1, kind: 'delivery', review_state: 'pending', product_key: 'p1' }], [], null, 0);
  ok('Studio: de proef heeft het afrondblok met de tevredenheidsvraag', v.afrondScherm === true && /Ben je tevreden/.test(v.feedbackHtml));
  ok('Studio: "Bestel in deze look" naar het lifestyleformulier', v.herbestel?.label === 'Bestel in deze look' && v.herbestel.href === '/nl/start/lifestyle/?style=glow&ratio=story' && v.herbestel.vanaf === `lifestylecarrousels vanaf ${euro(ladderFloor('lifestyle'), 'nl')} per product`);
  ok('Studio: de kaart vraagt aandacht zolang de vraag openstaat', v.afgerond === false && v.openNow === true);
  const mail = deliveryEmail({ order: { ref: 'VIS-PROEF-0001', lang: 'nl', name: 'Mara', service: 'test-sample', details_json: JSON.stringify({ sample_type: 'catalog' }) }, link: 'https://visuails.com/o/x', n: 4 });
  ok('levermail van de proef: dezelfde zin en hetzelfde vanaf-bedrag als de privélink', mail.includes('Je proefset staat klaar om te downloaden.') && mail.includes(`catalogfoto’s vanaf ${euro(ladderFloor('catalog'), 'nl')} per product`));
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
process.exit(fail ? 1 : 0);
