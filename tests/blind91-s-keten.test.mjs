/*
 * RONDE 91 · S — DE KETEN IN STUDIO, LIVE GETEST
 * 9 november 2026
 *
 * De bevindingen uit de live test van Studio (91/bevindingen/S.md) die open stonden:
 *   S02  geannuleerd zonder geld terug, met beelden die blijven: niet "Er wordt niets voor gemaakt";
 *   S03  op de proefkaart stond "Bij de proef zit geen revisieronde…" twee keer;
 *   S05  de samenvatting van stap 3 plakte label, "optioneel", vraagteken en uitleg aan elkaar;
 *   S10  .ronde-warn had een amberen vlak; het kleurenschema kent geen warme kleur;
 *   S11  na een herlevering zei de kop nog "Je 4 beelden staan klaar…";
 *   S12  na afronden stond "Je beelden staan hier tot en met …" twee keer onder elkaar;
 *   S13  "Alle 2 zijn goed" → "Allebei goed";
 *   S14  de mail "We hebben je revisieronde": enkelvoud bij 1 beeld, meervoud bij 2;
 *   S15  de herlevermail zei pas na de zin welke link eronder stond.
 *
 * Deel 1 zonder server. Deel 2 (S05) en deel 3 (S02, S03, S11, S12 in de echte Worker) hebben dist/ nodig
 * (eerst `npx astro build`) en chromium; zonder dist/ worden ze overgeslagen en dat staat in de uitvoer.
 *
 *   node tests/blind91-s-keten.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { nuZin, NU_TEKST } from '../src/lib/nuzin.js';
import { orderView, productView, COPY } from '../src/lib/account.js';
import { redeliveryEmail } from '../src/lib/admin.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lees = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
let pass = 0;
let fail = 0;
function ok(name, cond, extra = '') {
  if (cond) pass++; else fail++;
  console.log(`${cond ? ' ok  ' : ' FAIL'} ${name}${cond || !extra ? '' : ` — ${extra}`}`);
}
console.log('\nVISUAILS — ronde 91 S: de keten in Studio\n');

const sqlNu = (ms = Date.now()) => new Date(ms).toISOString().slice(0, 19).replace('T', ' ');
const basis = { id: 91, ref: 'VIS-TEST-0091', service: 'catalog', product_count: 2, details_json: '{}', total_cents: 9800, lang: 'nl', payment_status: 'paid' };
const kaart = (o, files = [], lang = 'nl') => orderView(COPY[lang], lang, { ...basis, ...o }, files, [], null, 1, 0, '');
const beeld = (id, extra = {}) => ({ id, kind: 'delivery', product_key: 'p1', shot: ['front', 'back', 'detail', 'worn'][id % 4], filename: `p1-${id}.webp`, review_state: 'pending', ...extra });

/* ── S02 · GEANNULEERD, DE BEELDEN BLIJVEN ──────────────────────────────── */
{
  const NL_OUD = 'Deze bestelling is geannuleerd. Er wordt niets voor gemaakt.';
  const NL_NIEUW = 'Deze bestelling is geannuleerd. De beelden die al klaar waren, kun je hieronder nog downloaden.';
  const EN_NIEUW = 'This order was cancelled. The images that were already finished can still be downloaded below.';
  const twee = [beeld(1), beeld(2, { review_state: 'approved' })];
  const geen = { status: 'cancelled', cancel_payment: 'none' };
  ok('S02 nuZin: geannuleerd met geld \'none\' en levende beelden → de downloadzin', nuZin({ ...basis, ...geen }, { files: twee }).zin === NL_NIEUW, nuZin({ ...basis, ...geen }, { files: twee }).zin);
  ok('S02 nuZin (EN): dezelfde zin in het Engels', nuZin({ ...basis, ...geen }, { files: twee }, 'en').zin === EN_NIEUW);
  ok('S02 nuZin: zonder beelden de oude zin', nuZin({ ...basis, ...geen }, { files: [] }).zin === NL_OUD);
  ok('S02 nuZin: alleen uploads tellen niet', nuZin({ ...basis, ...geen }, { files: [{ id: 9, kind: 'upload' }] }).zin === NL_OUD);
  ok('S02 nuZin: verlopen beelden tellen niet', nuZin({ ...basis, ...geen }, { files: [beeld(1, { expires_at: '2026-01-01' })], vandaag: '2026-11-09' }).zin === NL_OUD);
  ok('S02 nuZin: vervangen beelden tellen niet', nuZin({ ...basis, ...geen }, { files: [beeld(1, { superseded_at: '2026-11-01' })] }).zin === NL_OUD);
  ok('S02 nuZin: onbetaald geannuleerd (cancel_payment leeg) — de beelden zijn ingetrokken, oude zin', nuZin({ ...basis, status: 'cancelled', cancel_payment: null }, { files: twee }).zin === NL_OUD);
  ok('S02 nuZin: terugbetaald blijft de terugbetaalzin', nuZin({ ...basis, status: 'cancelled', cancel_payment: 'refund' }, { files: twee, geannuleerd: 'refunding' }).zin === NU_TEKST.nl.flow.cancelledRefunding);

  const v = kaart(geen, twee);
  ok('S02 Studio: de Nu-zin van de kaart (uit de tijdlijn) is de downloadzin', v.nu.zin === NL_NIEUW, v.nu.zin);
  ok('S02 Studio: de tijdlijn zegt hetzelfde', v.progress.now === NL_NIEUW, v.progress.now);
  ok('S02 Studio: en de map met de downloadknop staat er', !!(v.folder && v.folder.href));
  ok('S02 Studio (EN)', kaart(geen, twee, 'en').nu.zin === EN_NIEUW, kaart(geen, twee, 'en').nu.zin);
  ok('S02 Studio: zonder beelden de oude zin', kaart(geen, []).nu.zin === NL_OUD, kaart(geen, []).nu.zin);
  ok('S02 Studio: tegoed blijft de tegoedzin', kaart({ status: 'cancelled', cancel_payment: 'credit' }, twee).nu.zin === COPY.nl.flowNow.cancelledCredit);
  ok('S02 de zin staat letterlijk gelijk in account.js en nuzin.js (NL en EN)', COPY.nl.flowNow.cancelledKept === NU_TEKST.nl.flow.cancelledKept && COPY.en.flowNow.cancelledKept === NU_TEKST.en.flow.cancelledKept);
}

/* ── S11 · NA DE HERLEVERING ZEGT DE KOP WAT ER NOG TE DOEN IS ───────────── */
{
  const na = { status: 'delivered', delivery_mailed_at: sqlNu(Date.now() - 3 * 864e5), revision_round_at: sqlNu(Date.now() - 2 * 864e5) };
  /* De stand uit de live test: 4 beelden, 2 goedgekeurd, Detail aangemerkt en vervangen (nieuw), 1 nog open. */
  const stand = [
    beeld(1, { review_state: 'approved' }),
    beeld(2, { review_state: 'approved' }),
    beeld(3, { review_state: 'revision_requested', superseded_at: sqlNu() }),
    beeld(4),
    beeld(5, { shot: 'detail', replaced_for: 'Het label staat scheef.' }),
  ];
  const z = nuZin({ ...basis, ...na }, { files: stand });
  ok('S11 nuZin: 2 open, waarvan 1 nieuw', z.zin === 'Nog 2 beelden om goed te keuren; 1 daarvan is nieuw.' && z.soort === 'teBekijken', z.zin);
  ok('S11 nuZin: geen "Je 4 beelden" meer', !/Je 4 beelden|in één keer/.test(z.zin));
  ok('S11 nuZin (EN)', nuZin({ ...basis, ...na }, { files: stand }, 'en').zin === '2 images still to approve; 1 of them is new.', nuZin({ ...basis, ...na }, { files: stand }, 'en').zin);
  const alleenNieuw = [beeld(1, { review_state: 'approved' }), beeld(2, { review_state: 'approved' }), beeld(4, { review_state: 'approved' }), beeld(5, { replaced_for: 'x' })];
  ok('S11 nuZin: alleen het nieuwe beeld open → "Je nieuwe beeld staat klaar…"', nuZin({ ...basis, ...na }, { files: alleenNieuw }).zin === 'Je nieuwe beeld staat klaar. Bekijk het en keur het goed.', nuZin({ ...basis, ...na }, { files: alleenNieuw }).zin);
  ok('S11 nuZin (EN): "Your new image is ready…"', nuZin({ ...basis, ...na }, { files: alleenNieuw }, 'en').zin === 'Your new image is ready. Look it over and approve it.');
  const tweeNieuw = [beeld(1, { review_state: 'approved' }), beeld(5, { replaced_for: 'x' }), beeld(6, { replaced_for: 'y' })];
  ok('S11 nuZin: twee nieuwe → "Je 2 nieuwe beelden staan klaar…"', nuZin({ ...basis, ...na }, { files: tweeNieuw }).zin === 'Je 2 nieuwe beelden staan klaar. Bekijk ze en keur ze goed.', nuZin({ ...basis, ...na }, { files: tweeNieuw }).zin);
  ok('S11 nuZin: een nieuwe clip is "hem"', nuZin({ ...basis, ...na, service: 'video' }, { files: alleenNieuw }).zin === 'Je nieuwe clip staat klaar. Bekijk hem en keur hem goed.');
  /* Nog in de ronde (niet gebruikt): 2 van 4 goedgekeurd → wat er nog te doen is, met de ronde erbij. */
  const inRonde = { status: 'delivered', delivery_mailed_at: sqlNu(Date.now() - 864e5) };
  const half = [beeld(1, { review_state: 'approved' }), beeld(2, { review_state: 'approved' }), beeld(3), beeld(4)];
  const zr = nuZin({ ...basis, ...inRonde }, { files: half });
  ok('S11 nuZin: in de ronde, 2 van 4 goedgekeurd → "Nog 2 beelden…" met aanmerken en de ronde', zr.zin === `Nog 2 beelden om goed te keuren. ${NU_TEKST.nl.aanmerkZin(2)} ${NU_TEKST.nl.rondeZin('')}` && zr.knoppen.join() === 'allesGoed,aanmerken', zr.zin);
  ok('S11 nuZin: 1 over → enkelvoud', nuZin({ ...basis, ...inRonde }, { files: [beeld(1, { review_state: 'approved' }), beeld(2)] }).zin.startsWith('Nog 1 beeld om goed te keuren. Klopt er iets niet, vink het aan'));
  const vers = [beeld(1), beeld(2), beeld(3), beeld(4)];
  ok('S11 nuZin: de eerste levering houdt de oude zin', nuZin({ ...basis, ...inRonde }, { files: vers }).zin === `${NU_TEKST.nl.teBekijkenKern(4, false)} ${NU_TEKST.nl.rondeZin('')}`);
  const v = kaart(na, stand);
  ok('S11 Studio: de kop van de kaart zegt de stand', v.nu.zin === 'Nog 2 beelden om goed te keuren; 1 daarvan is nieuw.', v.nu.zin);
}

/* ── S13 · ALLEBEI GOED ─────────────────────────────────────────────────── */
{
  const o = { ...basis, status: 'delivered', delivery_mailed_at: sqlNu() };
  const g = (n) => ({ key: 'p1', delivered: Array.from({ length: n }, (_, i) => beeld(i + 1)), uploaded: [] });
  ok('S13 NL bij 2: "Allebei goed — keur dit product goed"', productView(COPY.nl, 'nl', o, g(2)).allesGoed?.label === 'Allebei goed — keur dit product goed', productView(COPY.nl, 'nl', o, g(2)).allesGoed?.label);
  ok('S13 EN bij 2: "Both are good — approve this product"', productView(COPY.en, 'en', o, g(2)).allesGoed?.label === 'Both are good — approve this product');
  ok('S13 NL bij 3 blijft "Alle 3 zijn goed — keur dit product goed"', productView(COPY.nl, 'nl', o, g(3)).allesGoed?.label === 'Alle 3 zijn goed — keur dit product goed');
  ok('S13 EN bij 3 blijft "All 3 are good — approve this product"', productView(COPY.en, 'en', o, g(3)).allesGoed?.label === 'All 3 are good — approve this product');
}

/* ── S15 · DE HERLEVERMAIL ZEGT WELKE LINK ERONDER STAAT ────────────────── */
{
  const LINK = 'https://visuails.com/o/0000testtoken0000';
  const nl = redeliveryEmail({ order: { ref: 'VIS-TEST-0091', name: 'Testa', lang: 'nl' }, link: LINK, n: 1, revisions: 1 });
  const en = redeliveryEmail({ order: { ref: 'VIS-TEST-0091', name: 'Testa', lang: 'en' }, link: LINK, n: 1, revisions: 1 });
  const zinNl = 'Dit is je nieuwe link; je eerdere link werkt ook nog. Allebei brengen je naar dezelfde bestelling.';
  const zinEn = 'This is your new link; your earlier link still works too. Both take you to the same order.';
  ok('S15 NL: de nieuwe zin staat erin', nl.includes(zinNl));
  ok('S15 EN: de nieuwe zin staat erin', en.includes(zinEn));
  ok('S15 de oude zin is weg (NL en EN)', !nl.includes('Je eerdere link blijft ook werken') && !en.includes('Your earlier link keeps working too'));
  const naZin = nl.slice(nl.indexOf(zinNl));
  ok('S15 de link staat direct ná de zin', naZin.indexOf(LINK) > 0 && naZin.indexOf(LINK) < 400, String(naZin.indexOf(LINK)));
}

/* ── S14 · DE MAIL "WE HEBBEN JE REVISIERONDE": ENKELVOUD EN MEERVOUD ───── */
{
  const can = await import('../src/lib/cancelMail.js');
  const echteFetch = globalThis.fetch;
  const sent = [];
  globalThis.fetch = async (url, opts = {}) => {
    if (String(url).includes('api.resend.com/emails')) sent.push(JSON.parse(opts.body));
    return { ok: true, status: 200, text: async () => '', json: async () => ({ id: 'x' }) };
  };
  const stil = console.error; console.error = () => {};
  const ENV = { RESEND_API_KEY: 're_test', NOTIFY_EMAIL: 'studio@voorbeeld.test', PUBLIC_ORIGIN: 'https://visuails.com' };
  const mail = async (n, lang) => { sent.length = 0; await can.mailRondeOntvangen(ENV, { ref: 'VIS-TEST-0091', email: 'testa@voorbeeld.test', name: 'Testa', lang }, n); return sent[0]?.html || ''; };
  try {
    const een = await mail(1, 'nl');
    const twee = await mail(2, 'nl');
    const oneEn = await mail(1, 'en');
    const twoEn = await mail(2, 'en');
    ok('S14 NL bij 1: enkelvoud ("1 beeld", "We passen het aan", "de nieuwe versie klaarstaat")', /We hebben 1 beeld genoteerd met je opmerking\. We passen het aan; je krijgt een mail zodra de nieuwe versie klaarstaat/.test(een), een.slice(0, 0));
    ok('S14 NL bij 1: geen meervoud', !/passen ze aan|nieuwe versies|opmerkingen/.test(een));
    ok('S14 NL bij 2: meervoud ("2 beelden", "We passen ze aan", "de nieuwe versies klaarstaan")', /We hebben 2 beelden genoteerd met je opmerkingen\. We passen ze aan; je krijgt een mail zodra de nieuwe versies klaarstaan/.test(twee));
    ok('S14 EN bij 1: enkelvoud', /We noted 1 image with your comment\. We.ll adjust it; you get an email as soon as the new version is ready/.test(oneEn));
    ok('S14 EN bij 2: meervoud', /We noted 2 images with your comments\. We.ll adjust them; you get an email as soon as the new versions are ready/.test(twoEn));
  } finally {
    globalThis.fetch = echteFetch;
    console.error = stil;
  }
}

/* ── S10 · .ronde-warn IN HET KLEURENSCHEMA ─────────────────────────────── */
{
  const css = lees('public/account.css');
  const zonderCommentaar = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');
  const regel = (zonderCommentaar(css).match(/\.ronde-warn\s*\{([^}]*)\}/) || [])[1] || '';
  ok('S10 .ronde-warn heeft geen amberen vlak meer', regel && !/229\s*,?\s*180|e5b45c/i.test(regel), regel);
  ok('S10 .ronde-warn: vlak en streep uit de revisiestand (--st-rev-fill, --st-rev-ink), tekst in inkt', /background:\s*var\(--st-rev-fill/.test(regel) && /border-left:\s*2px solid var\(--st-rev-ink/.test(regel) && /color:\s*var\(--ink/.test(regel), regel);
  const lum = (hex) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const ratio = (a, b) => { const x = lum(a); const y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  /* De waarden van de tokens, uit account.css zelf: licht (#F4F5F7, inkt #0F1217) en donker (#122039, #F4F5F7). */
  const vlakken = [...css.matchAll(/--st-rev-fill:\s*(#[0-9A-Fa-f]{6})/g)].map((m) => m[1].toUpperCase());
  ok('S10 de tokens bestaan licht en donker', vlakken.includes('#F4F5F7') && vlakken.includes('#122039'), vlakken.join(','));
  ok('S10 contrast licht ≥ 4,5:1 (inkt #0F1217 op #F4F5F7)', ratio('#0F1217', '#F4F5F7') >= 4.5, ratio('#0F1217', '#F4F5F7').toFixed(2));
  ok('S10 contrast donker ≥ 4,5:1 (#F4F5F7 op #122039)', ratio('#F4F5F7', '#122039') >= 4.5, ratio('#F4F5F7', '#122039').toFixed(2));
  /* Geen warme kleur als waarde in account.css en portal.css (commentaar telt niet). */
  const warm = [];
  for (const f of ['public/account.css', 'public/portal.css']) {
    const s = zonderCommentaar(lees(f));
    for (const m of s.matchAll(/#([0-9a-fA-F]{6})\b|rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)/g)) {
      const [r, g, b] = m[1] ? [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)) : [m[2], m[3], m[4]].map(Number);
      const mx = Math.max(r, g, b); const mn = Math.min(r, g, b);
      if (mx === mn) continue;
      const d = mx - mn; let h;
      if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
      h = (h * 60 + 360) % 360;
      const l = (mx + mn) / 510; const sat = d / 255 / (1 - Math.abs(2 * l - 1));
      if ((h < 70 || h > 340) && sat > 0.35 && l > 0.2 && l < 0.95) warm.push(`${f}: ${m[0]}`);
    }
  }
  ok('S10 geen warme kleur als waarde in account.css en portal.css', warm.length === 0, warm.join(' | '));
}

/* ── S03 / S12 · DE DATUMS STAAN OP DE KAART MAAR ÉÉN KEER (de bron) ──────── */
{
  const astro = lees('src/components/studio/Bestelling.astro');
  const css = lees('src/styles/studio.css');
  ok('S03/S12 Bestelling.astro: de kopdatums krijgen is-ook-in-map als de map ze ook toont', /datumsInMap = !!\(v\.afrondScherm && v\.folder && v\.datums\.length > 0\)/.test(astro) && /st-nu-datum\$\{datumsInMap \? ' is-ook-in-map' : ''\}/.test(astro));
  ok('S03/S12 de map toont ze onder dezelfde voorwaarde', /\{datumsInMap && <p class="st-map-datum">/.test(astro));
  ok('S03/S12 studio.css verbergt de kopregels als de kaart open is', /\.st-bestelling-klap\[open\] \.st-nu-datum\.is-ook-in-map \{ display: none; \}/.test(css));
}

/* ── S05 · DE SAMENVATTING NEEMT ALLEEN HET WOORD VAN HET LABEL ─────────── */
const DIST = path.join(ROOT, 'dist');
const EXECUTABLE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let chromium = null;
try { ({ chromium } = await import('playwright')); } catch { chromium = null; }
const bron = lees('src/scripts/pipeline.js');
const fn = (bron.match(/function labelTekst\(lab\) \{[\s\S]*?\n\}/) || [])[0] || '';
ok('S05 pipeline.js: labelTekst() bestaat en labelVan() gebruikt hem', !!fn && /return lab \? \(labelTekst\(lab\) \|\| key\) : key;/.test(bron));
ok('S05 pipeline.js: labelVan() leest niet meer de hele textContent van het label', !/lab \? lab\.textContent\.replace/.test(bron));

const paginaNl = path.join(DIST, 'nl/start/catalog/index.html');
const paginaEn = path.join(DIST, 'start/catalog/index.html');
if (!chromium || !fs.existsSync(paginaNl) || !fs.existsSync(paginaEn)) {
  console.log(' --   S05 in de browser overgeslagen (geen dist/ of geen playwright)');
} else {
  const browser = await chromium.launch(fs.existsSync(EXECUTABLE) ? { executablePath: EXECUTABLE } : {});
  try {
    for (const [lang, pagina, woord] of [['nl', paginaNl, 'Btw-nummer'], ['en', paginaEn, 'VAT number']]) {
      const html = fs.readFileSync(pagina, 'utf8');
      const label = (html.match(/<label for="pl-vat"[\s\S]*?<\/label>/) || [])[0] || '';
      ok(`S05 (${lang}) het gebouwde label heeft vraagteken en uitleg (anders toetst dit niets)`, /uitleg-mark/.test(label) && /uitleg-paneel/.test(label));
      const page = await browser.newPage();
      /* De markup van het gebouwde formulier, met "optioneel" zichtbaar zoals in de live test. */
      await page.setContent(`<!doctype html><meta charset="utf-8"><body>${label.replace(/<script[\s\S]*?<\/script>/g, '').replace(' data-pl-vat-opt hidden', ' data-pl-vat-opt')}<input id="pl-vat" name="vat" value="NL000000000B01"></body>`);
      const tekst = await page.evaluate(`(() => { ${fn}; return labelTekst(document.querySelector('label[for="pl-vat"]')); })()`);
      const oud = await page.evaluate(() => document.querySelector('label[for="pl-vat"]').textContent.replace(/\*/g, '').replace(/\s+/g, ' ').trim());
      ok(`S05 (${lang}) de oude manier plakte er alles aan (de bevinding)`, oud.length > woord.length + 20 && /\?/.test(oud), oud.slice(0, 60));
      ok(`S05 (${lang}) labelTekst() geeft alleen "${woord}"`, tekst === woord, tekst);
      /* Een label waarin het woord zelf in een element staat: de terugval. */
      await page.setContent(`<!doctype html><meta charset="utf-8"><body><label for="x"><span>Bedrijfsnaam</span><span class="req">*</span><button type="button" class="uitleg-mark">?</button><span class="uitleg-paneel" popover="auto">Uitleg</span></label></body>`);
      const terugval = await page.evaluate(`(() => { ${fn}; return labelTekst(document.querySelector('label')); })()`);
      ok(`S05 (${lang}) terugval: het woord in een element, zonder sterretje, vraagteken en uitleg`, terugval === 'Bedrijfsnaam', terugval);
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

/* ── DEEL 3 · IN DE ECHTE WORKER: S02, S03, S11, S12 ZOALS DE KLANT ZE ZIET ── */
if (!chromium || !fs.existsSync(path.join(DIST, 'server', 'wrangler.json'))) {
  console.log(' --   deel 3 (Studio in de Worker) overgeslagen (geen dist/server of geen playwright)');
} else {
  const { startStudio, VOLT } = await import('./lib/studio-worker.mjs');
  const { metVisIn } = await import('./lib/vis-in.mjs');
  const extraSql = [
    /* 7090 afgerond en 7088 de proef, met een levermail van eergisteren: dan staan de datums er. */
    `UPDATE orders SET delivery_mailed_at = datetime('now', '-2 days'), delivered_at = datetime('now', '-2 days'), closed_at = datetime('now', '-1 day') WHERE id = 7090`,
    `UPDATE files SET review_state = 'approved' WHERE order_id = 7090`,
    `UPDATE orders SET delivery_mailed_at = datetime('now', '-2 days'), delivered_at = datetime('now', '-2 days') WHERE id = 7088`,
    `UPDATE files SET expires_at = date('now', '+60 days') WHERE order_id IN (7090, 7088)`,
    /* 7095: geannuleerd zonder geld terug, met twee beelden die blijven. */
    `INSERT INTO orders (id, ref, customer_id, service, status, name, brand, email, total_cents, lang, created_at, tier, product_count, payment_status, payment_provider, paid_at, vat_cents, vat_rate, vat_treatment, delivered_at, delivery_mailed_at, cancelled_at, cancel_reason, cancel_payment)
     VALUES (7095, 'VIS-2611-0095', ${VOLT.id}, 'catalog', 'cancelled', 'Mara', 'VOLT', '${VOLT.email}', 9800, 'nl', datetime('now', '-5 days'), 'unattended', 1, 'paid', 'mollie', datetime('now', '-5 days'), 2058, 0.21, 'nl_standard', datetime('now', '-3 days'), datetime('now', '-3 days'), datetime('now', '-1 day'), 'Op verzoek', 'none')`,
    `INSERT INTO files (id, order_id, kind, r2_key, filename, bytes, expires_at, review_state, product_key, shot) VALUES
       (70951, 7095, 'delivery', 'proef/7090/p1-front.webp', 'VOLT-p1-front.webp', 180000, date('now', '+60 days'), 'pending', 'p1', 'front'),
       (70952, 7095, 'delivery', 'proef/7090/p1-back.webp', 'VOLT-p1-back.webp', 180000, date('now', '+60 days'), 'approved', 'p1', 'back')`,
    /* 7096: de stand van S11 — 4 beelden, 2 goedgekeurd, Detail aangemerkt en vervangen, 1 nog open. */
    `INSERT INTO orders (id, ref, customer_id, service, status, name, brand, email, total_cents, lang, created_at, tier, product_count, payment_status, payment_provider, paid_at, vat_cents, vat_rate, vat_treatment, delivered_at, delivery_mailed_at, revision_round_at)
     VALUES (7096, 'VIS-2611-0096', ${VOLT.id}, 'catalog', 'delivered', 'Mara', 'VOLT', '${VOLT.email}', 9800, 'nl', datetime('now', '-6 days'), 'unattended', 1, 'paid', 'mollie', datetime('now', '-6 days'), 2058, 0.21, 'nl_standard', datetime('now', '-4 days'), datetime('now', '-4 days'), datetime('now', '-3 days'))`,
    `INSERT INTO files (id, order_id, kind, r2_key, filename, bytes, expires_at, review_state, product_key, shot, superseded_at, created_at) VALUES
       (70961, 7096, 'delivery', 'proef/7090/p1-front.webp', 'a.webp', 1000, date('now', '+60 days'), 'approved', 'p1', 'front', NULL, datetime('now', '-4 days')),
       (70962, 7096, 'delivery', 'proef/7090/p1-back.webp', 'b.webp', 1000, date('now', '+60 days'), 'approved', 'p1', 'back', NULL, datetime('now', '-4 days')),
       (70963, 7096, 'delivery', 'proef/7090/p1-detail.webp', 'c.webp', 1000, date('now', '+60 days'), 'revision_requested', 'p1', 'detail', datetime('now', '-1 day'), datetime('now', '-4 days')),
       (70964, 7096, 'delivery', 'proef/7090/p1-worn.webp', 'd.webp', 1000, date('now', '+60 days'), 'pending', 'p1', 'worn', NULL, datetime('now', '-4 days')),
       (70965, 7096, 'delivery', 'proef/7090/p1-detail.webp', 'e.webp', 1000, date('now', '+60 days'), 'pending', 'p1', 'detail', NULL, datetime('now'))`,
    /* 7094: geleverd, de ronde nog open — voor de nakijkpagina (S10). */
    `INSERT INTO orders (id, ref, customer_id, service, status, name, brand, email, total_cents, lang, created_at, tier, product_count, payment_status, payment_provider, paid_at, vat_cents, vat_rate, vat_treatment, delivered_at, delivery_mailed_at)
     VALUES (7094, 'VIS-2611-0094', ${VOLT.id}, 'catalog', 'delivered', 'Mara', 'VOLT', '${VOLT.email}', 9800, 'nl', datetime('now', '-3 days'), 'unattended', 1, 'paid', 'mollie', datetime('now', '-3 days'), 2058, 0.21, 'nl_standard', datetime('now', '-1 day'), datetime('now', '-1 day'))`,
    `INSERT INTO files (id, order_id, kind, r2_key, filename, bytes, expires_at, review_state, product_key, shot) VALUES
       (70941, 7094, 'delivery', 'proef/7090/p1-front.webp', 'f.webp', 1000, date('now', '+60 days'), 'pending', 'p1', 'front')`,
    `INSERT INTO revision_requests (file_id, order_id, customer_id, note, created_at, resolved_at) VALUES (70963, 7096, ${VOLT.id}, 'Het label staat scheef.', datetime('now', '-3 days'), datetime('now', '-1 day'))`,
  ];
  const studio = await startStudio({ extraSql });
  const browser = metVisIn(await chromium.launch(fs.existsSync(EXECUTABLE) ? { executablePath: EXECUTABLE } : {}));
  const host = new URL(studio.url).hostname;
  /* Hoe vaak een zin ZICHTBAAR op een kaart staat (innerText telt alleen wat getekend wordt). */
  const telZichtbaar = (page, sel, re) => page.evaluate(([s, bronRe]) => {
    const el = document.querySelector(s);
    if (!el) return -1;
    return (el.innerText.match(new RegExp(bronRe, 'g')) || []).length;
  }, [sel, re]);
  try {
    for (const thema of ['licht', 'donker']) {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'nl-NL' });
      await ctx.addCookies([
        { name: 'vis_account', value: VOLT.token, domain: host, path: '/' },
        ...(thema === 'donker' ? [{ name: 'vis_thema', value: 'donker', domain: host, path: '/' }] : []),
      ]);
      const page = await ctx.newPage();
      const res = await page.goto(`${studio.url}/account/orders`, { waitUntil: 'load' });
      ok(`Studio ${thema}: bestellingen 200`, res.status() === 200, String(res.status()));
      /* Alles open, zoals de klant hem openklapt. */
      for (const id of [7090, 7088]) await page.evaluate((i) => { const d = document.getElementById(`order-${i}`); if (d) d.open = true; }, id);
      ok(`S12 Studio ${thema}: afgerond — "Je beelden staan hier tot en met" één keer op de open kaart`, (await telZichtbaar(page, '#order-7090', 'Je beelden staan hier tot en met')) === 1, String(await telZichtbaar(page, '#order-7090', 'Je beelden staan hier tot en met')));
      ok(`S03 Studio ${thema}: proef — "Bij de proef zit geen revisieronde" één keer op de open kaart`, (await telZichtbaar(page, '#order-7088', 'Bij de proef zit geen revisieronde')) === 1, String(await telZichtbaar(page, '#order-7088', 'Bij de proef zit geen revisieronde')));
      /* De gegevens zelf zijn niet veranderd: zonder de nieuwe klasse stond de zin er twee keer (de bevinding). */
      const zonder = await page.evaluate(() => { const els = [...document.querySelectorAll('#order-7090 .is-ook-in-map')]; els.forEach((e) => e.classList.remove('is-ook-in-map')); const n = (document.querySelector('#order-7090').innerText.match(/Je beelden staan hier tot en met/g) || []).length; els.forEach((e) => e.classList.add('is-ook-in-map')); return n; });
      ok(`S12 Studio ${thema}: zonder de regel stond hij er twee keer (de toets ziet het verschil)`, zonder === 2, String(zonder));
      for (const id of [7090, 7088]) await page.evaluate((i) => { const d = document.getElementById(`order-${i}`); if (d) d.open = false; }, id);
      ok(`S12 Studio ${thema}: dicht staat de bewaardatum in de kop (één keer)`, (await telZichtbaar(page, '#order-7090', 'Je beelden staan hier tot en met')) === 1);
      ok(`S03 Studio ${thema}: dicht staat de proefregel in de kop (één keer)`, (await telZichtbaar(page, '#order-7088', 'Bij de proef zit geen revisieronde')) === 1);
      /* Geannuleerd staat ingeklapt onder "Afgerond (N)", en de productklappers zijn dicht: alles open, anders tekent
         de browser die tekst niet en is innerText leeg. */
      await page.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true; }));
      const zin95 = await page.evaluate(() => document.querySelector('#order-7095 .st-nu-zin')?.innerText || '(geen zin)');
      ok(`S02 Studio ${thema}: geannuleerd met beelden — de downloadzin`, zin95 === 'Deze bestelling is geannuleerd. De beelden die al klaar waren, kun je hieronder nog downloaden.', zin95);
      ok(`S02 Studio ${thema}: en de downloadknop staat eronder`, await page.evaluate(() => !!document.querySelector('#order-7095 .st-map a.btn')));
      const zin96 = await page.evaluate(() => document.querySelector('#order-7096 .st-nu-zin')?.innerText || '');
      ok(`S11 Studio ${thema}: na de herlevering zegt de kop wat er nog te doen is`, zin96 === 'Nog 2 beelden om goed te keuren; 1 daarvan is nieuw.', zin96);
      /* S13 in de Worker: het product van 7096 heeft nog 2 open beelden. */
      const knop = await page.evaluate(() => [...document.querySelectorAll('#order-7096 button')].map((b) => b.innerText.trim()).find((x) => /goed — keur dit product goed/.test(x)) || '');
      ok(`S13 Studio ${thema}: de productknop zegt "Allebei goed"`, knop === 'Allebei goed — keur dit product goed', knop);
      await ctx.close();
    }
    /* S10 · de nakijkpagina van een revisieronde: geen warme kleur, contrast ≥ 4,5:1. De pagina komt uit de Worker;
       de browser tekent hem met de stylesheets van de Worker. Alleen licht: de losse kaarten van account.js staan
       altijd licht (themaCookie() geeft 'licht'); de donkere tokens zijn hierboven in de css getoetst. */
    for (const thema of ['licht']) {
      const ronde = await studio.fetch('/account/orders/7094/ronde', { method: 'POST', cookie: `vis_thema=${thema}`, body: new URLSearchParams({ file: '70941', 'note-70941': 'Iets lichter graag.' }), headers: { 'content-type': 'application/x-www-form-urlencoded', origin: 'http://localhost' } });
      const rondeHtml = await ronde.text();
      ok(`S10 ${thema}: de nakijkpagina komt (200, met .ronde-warn)`, ronde.status === 200 && /class="ronde-warn"/.test(rondeHtml), String(ronde.status));
      if (ronde.status !== 200) continue;
      const page = await browser.newPage({ colorScheme: thema === 'donker' ? 'dark' : 'light' });
      await page.goto(`${studio.url}/account`, { waitUntil: 'load' });
      await page.setContent(rondeHtml.replace('<head>', `<head><base href="${studio.url}/">`), { waitUntil: 'load' });
      const m = await page.evaluate(() => {
        const el = document.querySelector('.ronde-warn');
        if (!el) return null;
        const st = getComputedStyle(el);
        return { kleur: st.color, vlak: st.backgroundColor, streep: st.borderLeftColor, streepBreed: st.borderLeftWidth, thema: document.documentElement.getAttribute('data-thema') || '' };
      });
      if (!m) { ok(`S10 ${thema}: .ronde-warn getekend`, false); await page.close(); continue; }
      const rgb = (c) => (String(c).match(/[\d.]+/g) || []).slice(0, 3).map(Number);
      const l = (c) => { const [r, g, b] = rgb(c).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
      const c = (Math.max(l(m.kleur), l(m.vlak)) + 0.05) / (Math.min(l(m.kleur), l(m.vlak)) + 0.05);
      const warm = (x) => { const [r, g, b] = rgb(x); return r > b + 20 && g > b + 10; };
      ok(`S10 ${thema}: vlak en streep zijn niet warm (${m.vlak} · ${m.streep}, data-thema "${m.thema}")`, !warm(m.vlak) && !warm(m.streep), `${m.vlak} · ${m.streep}`);
      ok(`S10 ${thema}: de streep is blauw en 2px`, (() => { const [r, g, b] = rgb(m.streep); return b > r + 40 && m.streepBreed === '2px'; })(), `${m.streep} ${m.streepBreed}`);
      ok(`S10 ${thema}: contrast tekst ≥ 4,5:1`, c >= 4.5, `${c.toFixed(2)}:1 · ${m.kleur} op ${m.vlak}`);
      await page.close();
    }
  } finally {
    await browser.close();
    await studio.dispose();
  }
}

console.log(`\n${pass} goed, ${fail} fout\n`);
process.exit(fail ? 1 : 0);
