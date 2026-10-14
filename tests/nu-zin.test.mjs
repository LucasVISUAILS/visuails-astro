/**
 * "Wat nu" — punt 3.01, 8 oktober 2026.
 *
 * Zonder server (node:sqlite met het echte schema.sql). Wat hier vastligt:
 *   · één functie nuZin() kiest zin, datums en knoppen; de bestelkaart in Studio,
 *     het overzicht en de privélink zeggen voor dezelfde bestelling hetzelfde;
 *   · de zinnen in nuzin.js zijn letterlijk die van de tijdlijn (COPY.flowNow,
 *     flowStep, de datumregels in account.js) — wijkt er één af, dan valt dit om;
 *   · de volgorde: betalen gaat vóór alles wat rustig klinkt;
 *   · de privélink opent met het blok: zin, violette "Alles goed — naar je
 *     downloads" (V22 = a), statuspad, leverregel, "Nu betalen" zolang er niet
 *     betaald is; alles zonder script;
 *   · "Alles goed" landt op #afgerond als de bestelling daarmee afgerond is;
 *   · de tellertegels alleen boven 0 (V23 = b);
 *   · de levermail zegt dezelfde kern met de revisiedatum.
 */
import { readFileSync } from 'node:fs';
import { nuZin, NU_TEKST, statusPad, nuKnopLabel, leverMailZin, eersteMistVan, korteDatum } from '../src/lib/nuzin.js';
import { orderView, overviewView, watNuView, COPY } from '../src/lib/account.js';
import { deliveryEmail } from '../src/lib/admin.js';
import { portalGet, portalPost } from '../src/lib/portal.js';
import { hashToken, mintToken } from '../src/lib/token.js';
import { leverDatums } from '../src/lib/leverdatums.js';
import { verseDb, d1 } from './lib/d1sqlite.mjs';

let pass = 0;
let fail = 0;
function ok(name, cond, extra = '') {
  if (cond) pass++; else fail++;
  console.log(`${cond ? ' ok  ' : ' FAIL'} ${name}${cond || !extra ? '' : ` — ${extra}`}`);
}
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const sqlNu = (d) => d.toISOString().slice(0, 19).replace('T', ' ');
const vandaag = new Date().toISOString().slice(0, 10);
const dagen = (n) => sqlNu(new Date(Date.now() + n * 86400000));

console.log('\nVISUAILS — wat nu (3.01)\n');

/* ── 1 · DEZELFDE WOORDEN ALS DE TIJDLIJN ─────────────────────────────────── */
for (const lang of ['nl', 'en']) {
  const a = COPY[lang];
  const n = NU_TEKST[lang];
  const verschil = Object.keys(n.flow).filter((k) => n.flow[k] !== a.flowNow[k]);
  ok(`${lang}: de tijdlijnzinnen in nuzin.js zijn letterlijk COPY.flowNow`, verschil.length === 0 && Object.keys(a.flowNow).every((k) => k in n.flow), verschil.join(', '));
  ok(`${lang}: de stappen zijn letterlijk COPY.flowStep`, JSON.stringify(n.stap) === JSON.stringify(a.flowStep));
  ok(`${lang}: de datumregels en de ontbreekt-zin zijn die van Studio`,
    n.datumRevisie('X') === a.datumRevisie('X') && n.datumBewaar('X') === a.datumBewaar('X') && n.datumProef === a.datumProef
    && n.nuMist('v', 'p') === a.nuMist('v', 'p') && n.flowWindow('a', 'b') === a.flowWindow('a', 'b'));
  ok(`${lang}: "Bekijk je beelden" en "Downloaden (zip)" zijn de woorden van Studio`, n.knop.bekijk === a.nuBekijkBeelden && n.knop.downloaden === a.bDownloadAll);
}
ok('de violette knop heet "Alles goed — naar je downloads" (V22 = a)', nuKnopLabel('allesGoed', 'nl') === 'Alles goed — naar je downloads' && nuKnopLabel('allesGoed', 'en') === 'All good — to your downloads');
ok('geen getypte termijn in de nieuwe zinnen', !/\d+ dagen|\d+ days|tot en met \d|until \d/.test(JSON.stringify([NU_TEKST.nl.teBekijkenKern(3), NU_TEKST.nl.rondeZin(''), NU_TEKST.nl.revisieBijna, NU_TEKST.nl.verwijderdBijna, NU_TEKST.en.teBekijkenKern(3), NU_TEKST.en.rondeZin('')])));
ok('geen ik-vorm en geen "we appen je"', !/\b(ik|mij|mijn)\b|we appen/i.test(JSON.stringify(NU_TEKST.nl)));

/* ── 2 · DE VOLGORDE ───────────────────────────────────────────────────────── */
{
  const basis = { id: 1, ref: 'VIS-TEST-0001', service: 'catalog', product_count: 2, details_json: '{}', total_cents: 9800, lang: 'nl' };
  const lever = [
    { id: 1, kind: 'delivery', product_key: 'p1', review_state: 'pending' },
    { id: 2, kind: 'delivery', product_key: 'p2', review_state: 'pending' },
  ];
  const z = (o, ctx = {}) => nuZin({ ...basis, ...o }, { vandaag, ...ctx }, 'nl');
  const mist = { product: 'Product 1', vak: 'achterkant' };
  ok('onbetaald → betalen, ook als er een foto ontbreekt', z({ status: 'received', payment_status: 'unpaid' }, { eersteMist: mist }).soort === 'betalen');
  ok('onbetaald op de btw-lijst → btw, zonder betaalknop', (() => { const r = z({ status: 'received', payment_status: 'unpaid', review_state: 'pending' }); return r.soort === 'btw' && r.knoppen.length === 0; })());
  ok('betaald, foto ontbreekt → fotoMist met de knop', (() => { const r = z({ status: 'in_production', payment_status: 'paid' }, { eersteMist: mist }); return r.soort === 'fotoMist' && r.knoppen[0] === 'fotos'; })());
  ok('in de maak → de zin van de tijdlijn met de dagen', z({ status: 'in_production', payment_status: 'paid', window_start: '2026-10-12', window_end: '2026-10-13' }).zin === 'Onze studio maakt je beelden. Ingepland van 12 okt tot 13 okt.');
  const geleverd = z({ status: 'delivered', payment_status: 'paid', delivery_mailed_at: sqlNu(new Date()) }, { files: lever });
  ok('geleverd → te bekijken, met "Alles goed" eerst en "Iets aanmerken"', geleverd.soort === 'teBekijken' && geleverd.knoppen.join() === 'allesGoed,aanmerken', JSON.stringify(geleverd));
  ok('  met de revisie- en de bewaardatum', geleverd.datums.length === 2 && /tot en met/.test(geleverd.datums[0]));
  ok('  en de zin noemt het aantal en de ene revisieronde', /^Je 2 beelden staan klaar\..*één revisieronde/.test(geleverd.zin));
  const bijna = z({ status: 'delivered', payment_status: 'paid', delivery_mailed_at: dagen(-6) }, { files: lever });
  ok('revisietermijn binnen 2 dagen → revisieBijna gaat vóór te bekijken', bijna.soort === 'revisieBijna', bijna.soort);
  const bijOns = z({ status: 'delivered', payment_status: 'paid', delivery_mailed_at: dagen(-1), revision_round_at: dagen(-1) }, { files: [{ ...lever[0], review_state: 'revision_requested' }, lever[1]] });
  ok('revisie ingediend → ligt bij ons, geen knop', bijOns.soort === 'revisieBijOns' && bijOns.knoppen.length === 0 && bijOns.zin === COPY.nl.flowNow.revising);
  const af = z({ status: 'delivered', payment_status: 'paid', delivery_mailed_at: dagen(-3), closed_at: dagen(-1) }, { files: lever.map((f) => ({ ...f, review_state: 'approved' })), fb: null });
  ok('net afgerond zonder cijfer → downloaden en "Hoe vond je het?"', af.soort === 'afgerondZonderScore' && af.knoppen.join() === 'downloaden,tevreden');
  const afMet = z({ status: 'delivered', payment_status: 'paid', delivery_mailed_at: dagen(-3), closed_at: dagen(-1) }, { files: lever.map((f) => ({ ...f, review_state: 'approved' })), fb: { score: 5 } });
  ok('afgerond met cijfer → de zin van de tijdlijn, downloaden', afMet.soort === 'afgerond' && afMet.zin === COPY.nl.flowNow.closed);
  const afOud = z({ status: 'delivered', payment_status: 'paid', delivery_mailed_at: dagen(-80), closed_at: dagen(-79) }, { files: lever.map((f) => ({ ...f, review_state: 'approved' })), fb: null });
  ok('binnen 14 dagen van de bewaardatum → verwijderdBijna gaat vóór de vraag', afOud.soort === 'verwijderdBijna', afOud.soort);
  const proef = z({ service: 'test-sample', status: 'delivered', payment_status: 'paid', delivered_at: dagen(-1) }, { files: [lever[0]], fb: null });
  ok('proef geleverd → afgerond (V29 = a): downloaden en "Hoe vond je het?"', proef.soort === 'proef' && proef.knoppen.join() === 'downloaden,tevreden' && proef.datums[0] === COPY.nl.datumProef);
  ok('geannuleerd → geen knop', z({ status: 'cancelled' }).knoppen.length === 0);
  ok('statuspad: wacht op betaling eerst zolang er niet betaald is', statusPad({ ...basis, status: 'received', payment_status: 'unpaid' }, { lang: 'nl' }).map((s) => s.label).join(' · ') === 'Wacht op betaling · Ontvangen · In productie · Wordt nagekeken · Geleverd');
  ok('statuspad: geleverd staat op "nu"', statusPad({ ...basis, status: 'delivered', payment_status: 'paid' }, { lang: 'en' }).at(-1).state === 'is-now');
  ok('eersteMistVan: "Product 2 · Hoodie" en het vak in kleine letters', JSON.stringify(eersteMistVan([{ key: 'p2', index: 2, naam: 'Hoodie', mist: ['back'] }], 'nl')) === JSON.stringify({ product: 'Product 2 · Hoodie', vak: 'achterkant' }));
  ok('eersteMistVan: onbekend (null) → niets', eersteMistVan(null) === null);

  /* Dezelfde bestelling, dezelfde zin: de bestelkaart in Studio (orderView). */
  const o = { ...basis, status: 'delivered', payment_status: 'paid', delivery_mailed_at: sqlNu(new Date()) };
  const kaart = orderView(COPY.nl, 'nl', o, lever, [], null, 0, 0, '');
  ok('Studio-bestelkaart: dezelfde zin als nuZin()', kaart.nu.zin === nuZin(o, { files: lever }, 'nl').zin);
  ok('Studio-bestelkaart: "Alles goed" als formulier naar approve-order, "Iets aanmerken" naar de ronde',
    kaart.nu.knoppen[0]?.approveOrder === 1 && /#ronde-1$/.test(kaart.nu.knoppen[1]?.href || ''), JSON.stringify(kaart.nu.knoppen));
}

/* ── 3 · HET OVERZICHT: WAT NU BOVENAAN, TEGELS ALLEEN BOVEN 0 ─────────────── */
{
  const t = COPY.nl;
  const orders = [
    { id: 11, ref: 'VIS-A', service: 'catalog', status: 'in_production', payment_status: 'paid', total_cents: 9800, lang: 'nl', created_at: '2026-10-05' },
    { id: 10, ref: 'VIS-B', service: 'catalog', status: 'delivered', payment_status: 'paid', total_cents: 9800, lang: 'nl', created_at: '2026-10-01', delivery_mailed_at: sqlNu(new Date()) },
  ];
  const files = new Map([[10, [{ id: 5, kind: 'delivery', review_state: 'pending', product_key: 'p1' }, { id: 6, kind: 'delivery', review_state: 'pending', product_key: 'p2' }]]]);
  const v = overviewView(t, 'nl', { name: 'Mara Test', email: 'm@voorbeeld.nl' }, orders, files);
  ok('tegels: alleen de tellers boven 0', v.stats.every(([, , n]) => n > 0) && v.stats.length === 3, JSON.stringify(v.stats.map(([, l, n]) => [l, n])));
  const w = watNuView(t, 'nl', orders, files, new Map(), new Map(), v.featured);
  ok('bovenaan: de geleverde bestelling die op de klant wacht, niet de nieuwste', w.boven.id === 10 && w.bovenIsActie);
  ok('  met dezelfde zin als haar bestelkaart', w.nu.zin === orderView(t, 'nl', orders[1], files.get(10), [], null, 0).nu.zin);
  ok('  en hoogstens twee knoppen', w.nu.knoppen.length >= 1 && w.nu.knoppen.length <= 2);
  const leeg = overviewView(t, 'nl', { email: 'x@voorbeeld.nl' }, [], new Map());
  ok('geen bestellingen: geen tegels', leeg.stats.length === 0);
  const pagina = lees('src/pages/account/index.astro');
  ok('de tegelrij staat er alleen met tegels', /\{v\.stats\.length > 0 && \(/.test(pagina));
  ok('het "wat nu"-blok staat vóór de tegels', pagina.indexOf('st-watnu-blok') > -1 && pagina.indexOf('st-watnu-blok') < pagina.indexOf('st-cijfers'));
  ok('En nog 1 bestelling: NL en EN', t.ovNogMeer(1) === 'En nog 1 bestelling:' && COPY.en.ovNogMeer(2) === 'And 2 more orders:');
  const kaart = lees('src/components/studio/Bestelkaart.astro');
  ok('overzichtskaart: Nu-zin, datums en knoppen, geen script', /st-watnu-zin/.test(kaart) && /st-watnu-datums/.test(kaart) && !/<script/.test(kaart));
}

/* ── 4 · DE PRIVÉLINK ──────────────────────────────────────────────────────── */
async function privelink(opzet) {
  const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
  if (mislukt.length) throw new Error('schema: ' + mislukt.join(' | '));
  db.exec("INSERT INTO customers (id, email, name, brand) VALUES (1, 'studio@voorbeeld-volt.nl', 'Mara', 'VOLT')");
  opzet(db);
  const token = mintToken();
  db.prepare('INSERT INTO order_tokens (order_id, token_hash) VALUES (?, ?)').run(1, await hashToken(token));
  const env = { DB: d1(db), RESEND_API_KEY: '', NOTIFY_EMAIL: '' };
  const get = async () => {
    const r = await portalGet({ request: new Request(`https://visuails.com/o/${token}`), env, waitUntil() {} });
    return { status: r.status, html: await r.text() };
  };
  const post = async (velden) => portalPost({
    request: new Request(`https://visuails.com/o/${token}`, { method: 'POST', body: new URLSearchParams(velden) }),
    env, waitUntil() {},
  });
  return { db, env, get, post, token };
}
const ORDER = (extra) => `INSERT INTO orders (id, ref, customer_id, service, status, tier, product_count, email, lang, name, brand, total_cents, vat_cents, vat_rate, payment_status, created_at, details_json${extra.cols || ''})
  VALUES (1, 'VIS-TEST-3001', 1, '${extra.service || 'catalog'}', '${extra.status}', 'unattended', 2, 'studio@voorbeeld-volt.nl', 'nl', 'Mara', 'VOLT', 9800, 2058, 0.21, '${extra.betaald || 'paid'}', '2026-10-01 10:00:00', '{}'${extra.vals || ''})`;
const BEELD = (id, state = 'pending') => `INSERT INTO files (id, order_id, kind, r2_key, filename, bytes, review_state, product_key, shot) VALUES (${id}, 1, 'delivery', 'k${id}', 'b${id}.jpg', 1000, '${state}', 'p${id}', 'front')`;

{
  const open = await privelink((db) => db.exec(ORDER({ status: 'received', betaald: 'unpaid' })));
  const { status, html } = await open.get();
  ok('privélink onbetaald: 200', status === 200);
  const top = html.indexOf('class="nu"');
  ok('het blok staat direct onder de kop, vóór de feiten', top > -1 && top < html.indexOf('class="facts"') && top > html.indexOf('<h1>'));
  ok('  met de zin van Studio', html.includes(COPY.nl.flowNow.awaiting_payment));
  ok('  "Nu betalen" met de betaallink uit de mail', /href="\/api\/order-pay\?ref=VIS-TEST-3001&amp;lang=nl">Nu betalen</.test(html));
  ok('  het statuspad van Studio', html.includes('class="pad"') && html.includes('Wacht op betaling') && html.includes('Wordt nagekeken'));
  ok('  en de leverregel', html.includes('class="nu-lever"') && /We leveren je beelden/.test(html));
  ok('  geen script op de pagina', !/<script/i.test(html));
}
{
  const p = await privelink((db) => {
    db.exec(ORDER({ status: 'delivered', cols: ', delivery_mailed_at', vals: `, '${sqlNu(new Date())}'` }));
    db.exec(BEELD(1)); db.exec(BEELD(2));
  });
  const { html } = await p.get();
  const d = leverDatums(new Date());
  ok('geleverd: de zin met het aantal en de revisiedatum eronder', html.includes('Je 2 beelden staan klaar.') && html.includes(`Revisie aanvragen kan tot en met ${korteDatum(d.revisieTot, 'nl')}.`));
  ok('  violet: "Alles goed — naar je downloads", een gewoon formulier', /<form method="post" action="" class="nu-form"><input type="hidden" name="naar" value="afgerond"><button class="btn btn-primary" type="submit" name="action" value="approve-all">Alles goed — naar je downloads<\/button>/.test(html));
  ok('  "Eerst downloaden" als gewone link ernaast', /class="nu-link" href="\/o\/[^"]+\/zip">Eerst downloaden</.test(html));
  ok('  "Iets aanmerken ↓" is een anker naar het raster', html.includes('href="#werk">Iets aanmerken ↓') && html.includes('id="werk"'));
  ok('  geen leverregel meer na de levering', !html.includes('class="nu-lever"'));
  const r = await p.post({ action: 'approve-all', naar: 'afgerond' });
  ok('"Alles goed" landt op #afgerond als de bestelling daarmee af is', r.status === 303 && /#afgerond$/.test(r.headers.get('location') || ''), r.headers.get('location'));
  ok('  en de bestelling is afgerond', !!p.db.prepare('SELECT closed_at FROM orders WHERE id = 1').get().closed_at);
}
{
  const p = await privelink((db) => {
    db.exec(ORDER({ status: 'delivered', cols: ', delivery_mailed_at, revision_round_at', vals: `, '${sqlNu(new Date())}', '${sqlNu(new Date())}'` }));
    db.exec(BEELD(1, 'revision_requested')); db.exec(BEELD(2));
  });
  const r = await p.post({ action: 'approve-all' });
  ok('"Alles goed" met een open revisie: niets afgerond, terug naar het werk', /#werk$/.test(r.headers.get('location') || ''));
}

/* ── 5 · DE LEVERMAIL ZEGT HETZELFDE ───────────────────────────────────────── */
{
  const nu = new Date('2026-10-08T10:00:00Z');
  const html = deliveryEmail({ order: { ref: 'VIS-TEST', lang: 'nl', name: 'Mara', service: 'catalog', details_json: '{}' }, link: 'https://visuails.com/o/x', n: 12, nu });
  const kern = leverMailZin(12, { lang: 'nl', datum: '§' }).split('§')[0];
  ok('levermail: dezelfde kern als de privélink en Studio', html.includes(kern.replace(/—/g, '&mdash;')) || html.includes(kern), kern);
  ok('levermail: de revisiedatum in de rondezin', /één revisieronde, tot en met <strong>/.test(html));
  ok('levermail: één knop "Bekijk je beelden"', (html.match(/Bekijk je beelden/g) || []).length >= 1);
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
process.exit(fail ? 1 : 0);
