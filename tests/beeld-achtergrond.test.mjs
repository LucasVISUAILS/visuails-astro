/**
 * Een andere achtergrond per beeld, en de uitleg-tips — 15 oktober 2026
 * (werklijst 27, afvinklijst 28 v28-tips = a).
 *
 *   node tests/beeld-achtergrond.test.mjs        (geen server, geen browser)
 *
 * Wat hier vastligt:
 *   · het dossier houdt een kleur op een vak of een gekozen hoek, niet gelijk aan
 *     de achtergrond van de bestelling, en de voorkant blijft wit bij een
 *     marktplaats die dat eist (schoonBeeldAchtergronden); sinds afvinklijst 29
 *     (v29-hex = b) ook een eigen kleur: `beeld_bg_<vak>=eigen` met de code in
 *     `beeld_hex_<vak>`, in het dossier één veld met de code;
 *   · /admin, de werkmap en de bevestiging lezen hetzelfde (beeldAchtergronden);
 *   · het formulier tekent een keuze per beeld en de tips, en de tips volgen de
 *     regels: één tegelijk, Begrepen en een kruisje, Esc, en wat weg is blijft weg;
 *   · de opslag staat in het cookiebeleid.
 */
import { readFileSync } from 'node:fs';
import { schoonBeeldAchtergronden, beeldAchtergronden, beeldAchtergrondRegel, BEELD_BG_HEXES, beeldAchtergrondInstellingen } from '../src/data/beeldachtergrond.js';
import { bestelInstellingen } from '../src/lib/herbestel.js';
import { instellingen } from '../src/lib/scaffold.js';
import { TIPS, TIP_IDS, tipsUitCookie } from '../src/data/tips.js';
import { TIPS_SLEUTEL, TIPS_COOKIE } from '../src/data/cookies.js';
import { portalGet } from '../src/lib/portal.js';
import { studioTip } from '../src/lib/account.js';
import { hashToken, mintToken } from '../src/lib/token.js';
import { verseDb, d1 } from './lib/d1sqlite.mjs';
import { onRequestPost as orderPost } from '../functions/api/order.js';
import { BUSINESS_VERSION } from '../src/data/business.js';

let pass = 0;
let fail = 0;
function ok(name, cond, extra = '') {
  if (cond) pass++; else fail++;
  console.log(`${cond ? ' ok  ' : ' FAIL'} ${name}${cond || !extra ? '' : ` — ${extra}`}`);
}
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

console.log('\nVISUAILS — achtergrond per beeld en de tips\n');

console.log('het dossier');
{
  const d = schoonBeeldAchtergronden({
    background: 'white', background_hex: '#FFFFFF', channels: 'own',
    'angle_three-quarter': '1',
    beeld_bg_worn: '#ede4d8', beeld_bg_back: '#FFFFFF', beeld_bg_detail: '#123456',
    'beeld_bg_three-quarter': '#F5F5F5', beeld_bg_inside: '#F5F5F5', beeld_bg_bestaat: '#F5F5F5', beeld_bg_front: '',
  }, 'catalog');
  ok('een aanbevolen kleur op een vak blijft, in hoofdletters', d.beeld_bg_worn === '#EDE4D8');
  ok('gelijk aan de achtergrond van de bestelling: weg', !('beeld_bg_back' in d));
  ok('een eigen code mag ook (v29-hex = b)', d.beeld_bg_detail === '#123456', d.beeld_bg_detail);
  ok('een gekozen hoek mag; een niet gekozen hoek niet', d['beeld_bg_three-quarter'] === '#F5F5F5' && !('beeld_bg_inside' in d));
  ok('een onbekend vak en een lege waarde: weg', !('beeld_bg_bestaat' in d) && !('beeld_bg_front' in d));
  const wit = schoonBeeldAchtergronden({ background_hex: '#F5F5F5', channels: 'own,bol', beeld_bg_front: '#EDE4D8', beeld_bg_worn: '#EDE4D8' }, 'catalog');
  ok('bol eist een witte hoofdafbeelding: de voorkant valt weg, op model blijft', !('beeld_bg_front' in wit) && wit.beeld_bg_worn === '#EDE4D8');
  const ls = schoonBeeldAchtergronden({ beeld_bg_worn: '#EDE4D8' }, 'lifestyle');
  ok('lifestyle heeft geen achtergrond: alles weg', !('beeld_bg_worn' in ls));
  ok('de keuzelijst biedt de aanbevolen kleuren', BEELD_BG_HEXES.join(',') === '#FFFFFF,#F5F5F5,#EDE4D8', BEELD_BG_HEXES.join(','));
  const e = schoonBeeldAchtergronden({
    background_hex: '#FFFFFF', channels: 'own',
    beeld_bg_worn: 'eigen', beeld_hex_worn: '#c9d6e3',
    beeld_bg_back: 'eigen', beeld_hex_back: 'abc',
    beeld_bg_detail: 'eigen', beeld_hex_detail: 'rood',
    beeld_bg_front: 'eigen', beeld_hex_front: '#ffffff',
    beeld_hex_bestaat: '#C9D6E3',
  }, 'catalog');
  ok('"eigen" met een code: één veld met de code, in hoofdletters', e.beeld_bg_worn === '#C9D6E3', e.beeld_bg_worn);
  ok('  een code van drie tekens wordt er zes', e.beeld_bg_back === '#AABBCC', e.beeld_bg_back);
  ok('  "eigen" zonder geldige code: weg', !('beeld_bg_detail' in e));
  ok('  "eigen" gelijk aan de hoofdkleur: weg', !('beeld_bg_front' in e));
  ok('  geen beeld_hex_-velden meer in het dossier', !Object.keys(e).some((k) => k.startsWith('beeld_hex_')), Object.keys(e).join(','));
  const eWit = schoonBeeldAchtergronden({ background_hex: '#FFFFFF', channels: 'amazon', beeld_bg_front: 'eigen', beeld_hex_front: '#C9D6E3' }, 'catalog');
  ok('  ook een eigen kleur niet op de voorkant bij Amazon', !('beeld_bg_front' in eWit));
  const eLs = schoonBeeldAchtergronden({ beeld_bg_worn: 'eigen', beeld_hex_worn: '#C9D6E3' }, 'lifestyle');
  ok('  lifestyle: allebei weg', !Object.keys(eLs).some((k) => k.startsWith('beeld_')), JSON.stringify(eLs));
}

console.log('\nwie het leest');
{
  const det = { background_hex: '#FFFFFF', extra_slots: 'extra1:three-quarter', 'angle_three-quarter': '1', beeld_bg_worn: '#EDE4D8', 'beeld_bg_three-quarter': '#F5F5F5' };
  const lijst = beeldAchtergronden('catalog', det);
  ok('in de volgorde van de vakken, met het vaknummer', lijst.map((b) => `${b.nr}:${b.vak}:${b.hex}`).join(' ') === '4:worn:#EDE4D8 5:extra1:#F5F5F5', lijst.map((b) => `${b.nr}:${b.vak}:${b.hex}`).join(' '));
  ok('de regel voor mail en scherm', beeldAchtergrondRegel('catalog', det, 'nl') === 'Op een model: beige · Driekwart: lichtgrijs', beeldAchtergrondRegel('catalog', det, 'nl'));
  ok('  en in het Engels', beeldAchtergrondRegel('catalog', det, 'en') === 'On a model: beige · Three-quarter: light grey', beeldAchtergrondRegel('catalog', det, 'en'));
  const detE = { background_hex: '#FFFFFF', beeld_bg_worn: '#C9D6E3' };
  const lijstE = beeldAchtergronden('catalog', detE);
  ok('een eigen kleur heet "eigen kleur" en draagt zijn code', lijstE[0] && lijstE[0].eigen === true && lijstE[0].naam.nl === 'eigen kleur', JSON.stringify(lijstE[0]));
  ok('  de regel: "Op een model: eigen kleur #C9D6E3"', beeldAchtergrondRegel('catalog', detE, 'nl') === 'Op een model: eigen kleur #C9D6E3', beeldAchtergrondRegel('catalog', detE, 'nl'));
  ok('  en in het Engels', beeldAchtergrondRegel('catalog', detE, 'en') === 'On a model: own colour #C9D6E3', beeldAchtergrondRegel('catalog', detE, 'en'));
  const parenE = Object.fromEntries(instellingen({ ref: 'VIS-TEST-0029', service: 'catalog', kanaal: 'own' }, { index: 1, background: '#FFFFFF', beeldAchtergronden: lijstE }));
  ok('  de werkmap krijgt de code zoals elke andere', parenE.achtergrond_4 === '#C9D6E3', JSON.stringify(parenE));
  ok('opnieuw bestellen neemt de achtergrond per foto mee, ook een eigen kleur', JSON.stringify(beeldAchtergrondInstellingen('catalog', { ...det, beeld_bg_back: '#C9D6E3' })) === JSON.stringify([{ sleutel: 'back', hex: '#C9D6E3' }, { sleutel: 'worn', hex: '#EDE4D8' }, { sleutel: 'three-quarter', hex: '#F5F5F5' }]), JSON.stringify(beeldAchtergrondInstellingen('catalog', { ...det, beeld_bg_back: '#C9D6E3' })));
  const inst = bestelInstellingen({ ref: 'VIS-TEST-0029', service: 'catalog', details_json: JSON.stringify({ ...det, beeld_bg_back: '#C9D6E3' }) });
  ok('  in /account/orders/<id>/instellingen (bestelInstellingen)', inst && Array.isArray(inst.beelden) && inst.beelden.length === 3, JSON.stringify(inst && inst.beelden));
  const paren = Object.fromEntries(instellingen({ ref: 'VIS-TEST-0027', service: 'catalog', kanaal: 'own' }, { index: 1, background: '#FFFFFF', ratio: '4:5', beeldAchtergronden: lijst }));
  ok('de werkmap: achtergrond_4 en achtergrond_5 in de INSTELLINGEN-regel', paren.achtergrond_4 === '#EDE4D8' && paren.achtergrond_5 === '#F5F5F5' && paren.achtergrond === '#FFFFFF', JSON.stringify(paren));
  ok('/admin leest het (bord en brief)', /beeldAchtergronden: beeldAchtergronden\(order\.service, details\)/.test(lees('src/lib/admin.js')) && /rij\('Per beeld'/.test(lees('src/lib/admin.js')));
  ok('/api/order schoont het op en de bevestiging noemt het', /schoonBeeldAchtergronden\(details, service\)/.test(lees('functions/api/order.js')) && /'Per beeld' : 'Per image'/.test(lees('functions/api/order.js')));
}

console.log('\nhet formulier');
{
  const bp = lees('src/components/order/BackgroundPicker.astro');
  ok('een keuze per beeld, met "Zoals de rest" als eerste', /name=\{beeldBgVeld\(b\.id\)\}/.test(bp) && /<option value="">\{PF\.zoals\}<\/option>/.test(bp));
  ok('  de hoeken verborgen en uit tot ze gekozen zijn', /hidden=\{b\.hoek\}/.test(bp) && /disabled=\{b\.hoek\}/.test(bp));
  ok('  "Eigen kleur…" als laatste keuze, met een kleurvak zonder name en een codeveld', /<option value=\{BEELD_BG_EIGEN\}>\{PF\.eigen\}<\/option>/.test(bp) && /type="color" class="bg-perfoto-kleur"(?![^>]*name=)/.test(bp) && /name=\{beeldHexVeld\(b\.id\)\}/.test(bp));
  const pl = lees('src/scripts/pipeline.js');
  const fn = pl.slice(pl.indexOf('function syncBeeldBg('), pl.indexOf('function bindBeeldBg('));
  ok('  de voorkant vast op wit bij een marktplaats', /id === 'front'/.test(fn) && /sel\.disabled = wit/.test(fn));
  ok('  de tegels in "Wat je krijgt" krijgen de kleur van hun beeld', /--bo-bg/.test(fn));
  ok('  het codeveld staat alleen aan bij "Eigen kleur…", met de waarschuwing bij donker', /hexIn\.disabled = !isEigen/.test(fn) && /isLight\(eigen\) === false/.test(fn));
  const van = pl.slice(pl.indexOf("inst.beelden"), pl.indexOf("inst.beelden") + 1400);
  ok('  opnieuw bestellen zet de keuzes per foto terug, een eigen kleur in het codeveld', /sel\.value = 'eigen'/.test(van) && /hx\.value = hex/.test(van));
  ok('  nooit HTML uit een keuze op de pagina', !/innerHTML|insertAdjacentHTML/.test(pl.slice(pl.indexOf('function syncBeeldBg('), pl.indexOf('function pickCustom('))));
}

console.log('\nde tips');
{
  ok('zeven tips, in beide talen', TIP_IDS.length === 7 && ['nl', 'en'].every((l) => ['fotos', 'credits', 'levering', 'abonnement', 'privelink'].every((k) => typeof TIPS[l][k] === 'string' && TIPS[l][k].length > 20) && TIPS[l].studio.punten.length === 3));
  ok('de cookie leest alleen bekende tips', [...tipsUitCookie(`a=1; ${TIPS_COOKIE}=studio,hack,levering`, TIPS_COOKIE)].join(',') === 'studio,levering');
  const pl = lees('src/scripts/pipeline.js');
  const tip = pl.slice(pl.indexOf('const tipsWegNu'), pl.indexOf('/** Check the custom radio'));
  ok('formulier: één tegelijk', /qa\('\[data-pl-tip\]'\)\.some\(\(x\) => !x\.hidden\)/.test(tip));
  ok('formulier: Esc sluit hem', /e\.key !== 'Escape'/.test(tip));
  ok('formulier: weg is weg (localStorage, met try)', /localStorage\.setItem\(TIPS_SLEUTEL/.test(tip) && /try \{/.test(tip));
  const of = lees('src/components/order/OrderFlow.astro') + lees('src/components/order/BackgroundPicker.astro');
  ok('formulier: elke tip heeft Begrepen en een kruisje', ['bgfoto', 'fotos', 'credits'].every((id) => new RegExp(`data-pl-tip="${id}"[\\s\\S]{0,400}data-pl-tip-weg[\\s\\S]{0,200}data-pl-tip-weg`).test(of)));
  for (const [p, l] of [['src/pages/cookie-policy.astro', 'en'], ['src/pages/nl/cookie-policy.astro', 'nl']]) {
    const c = lees(p);
    ok(`cookiebeleid (${l}): de cookie en de notitie staan erin`, /<code>\{TIPS_COOKIE\}<\/code>/.test(c) && /<code>\{TIPS_SLEUTEL\}<\/code>/.test(c));
  }
  ok('de namen', TIPS_SLEUTEL === 'vis-tips' && TIPS_COOKIE === 'vis_tips');
  /* Studio: één tip per pagina, weg via een link. */
  const r = new Request('https://visuails.com/account/plan?tab=credits');
  const st = studioTip(r, 'nl', 'abonnement', new Set());
  ok('Studio: de tip met een weglink op dezelfde pagina', st && st.weg === '/account/plan?tab=credits&tipweg=abonnement' && /drie maanden/.test(st.tekst), st?.weg);
  ok('Studio: weggeklikt is weg', studioTip(r, 'nl', 'abonnement', new Set(['abonnement'])) === null);
  const lay = lees('src/layouts/StudioLayout.astro');
  ok('Studio: Begrepen en het kruisje zijn links (geen script)', /<a class="btn btn-2nd btn-sm" href=\{tip\.weg\}>/.test(lay) && /<a class="st-tip-x" href=\{tip\.weg\}/.test(lay));
  /* De privélink. */
  const { db } = verseDb(new URL('../schema.sql', import.meta.url));
  db.exec("INSERT INTO customers (id, email, brand) VALUES (1, 'studio@voorbeeldmerk.test', 'VOORBEELDMERK')");
  db.exec("INSERT INTO orders (id, ref, customer_id, service, status, tier, product_count, email, lang, brand, total_cents, payment_status, details_json) VALUES (1, 'VIS-TEST-0727', 1, 'catalog', 'in_production', 'unattended', 1, 'studio@voorbeeldmerk.test', 'nl', 'VOORBEELDMERK', 9800, 'paid', '{}')");
  const token = mintToken();
  db.prepare('INSERT INTO order_tokens (order_id, token_hash) VALUES (1, ?)').run(await hashToken(token));
  const haal = (pad, cookie = '') => portalGet({ request: new Request(`https://visuails.com${pad}`, { headers: cookie ? { cookie } : {} }), env: { DB: d1(db) }, waitUntil() {} });
  const html = await (await haal(`/o/${token}`)).text();
  ok('privélink: de tip staat onder de kop', /<aside class="tip" role="note"/.test(html) && /opent je bestelling zonder inloggen/.test(html));
  const weg = await haal(`/o/${token}?tipweg=privelink`);
  const koek = weg.headers.get('set-cookie') || '';
  ok('privélink: wegklikken zet de cookie op /o en stuurt terug zonder parameter', weg.status === 303 && weg.headers.get('location') === `/o/${token}` && /^vis_tips=privelink; Path=\/o;/.test(koek), koek);
  const na = await (await haal(`/o/${token}`, 'vis_tips=privelink')).text();
  ok('privélink: daarna geen tip meer', !/<aside class="tip"/.test(na));
}

console.log('\nde route (functions/api/order.js), met een eigen kleur');
{
  const echteFetch = globalThis.fetch;
  globalThis.fetch = async (url) => (String(url).includes('mollie')
    ? new Response(JSON.stringify({ id: 'tr_1', _links: { checkout: { href: 'https://pay.mollie.test/tr_1' } } }), { status: 201, headers: { 'content-type': 'application/json' } })
    : new Response(JSON.stringify({ id: 'em_1' }), { status: 200, headers: { 'content-type': 'application/json' } }));
  const { db } = verseDb(new URL('../schema.sql', import.meta.url));
  const fd = new FormData();
  const velden = {
    service: 'catalog', products: '2', lang: 'nl', mode: 'json', redirect: '/nl/thank-you',
    first_name: 'Testa', last_name: 'Proef', name: 'Testa Proef', brand: 'Proefmerk',
    email: 'inkoop@proefmerk.test', phone: '+31 6 00000000',
    address_line1: 'Verzonnenstraat 1', postal_code: '1234 AB', city: 'Nergenshuizen', country: 'NL',
    business_declaration: 'yes', business_version: BUSINESS_VERSION,
    background: 'white', background_hex: '#FFFFFF', channels: 'own',
    beeld_bg_worn: 'eigen', beeld_hex_worn: '#c9d6e3',
    beeld_bg_back: '#EDE4D8', beeld_hex_back: '',
    beeld_bg_detail: '', beeld_hex_detail: '#123456',
  };
  for (const [k, v] of Object.entries(velden)) fd.append(k, v);
  const res = await orderPost({
    request: new Request('https://visuails.com/api/order', { method: 'POST', body: fd, headers: { Origin: 'https://visuails.com', 'CF-Connecting-IP': '203.0.113.29' } }),
    env: { DB: d1(db), MOLLIE_API_KEY: 'test_abcdefghijklmnopqrstuvwxyz0123', RESEND_API_KEY: 're_x', NOTIFY_EMAIL: 'studio@visuails.test', FROM_EMAIL: 'x@y.z' },
    waitUntil: () => {},
  });
  globalThis.fetch = echteFetch;
  const rij = db.prepare('SELECT details_json FROM orders ORDER BY id DESC LIMIT 1').get();
  const det = rij ? JSON.parse(rij.details_json || '{}') : {};
  ok('de bestelling komt binnen', res.status < 400 && !!rij, String(res.status));
  ok('  "eigen" wordt één veld met de code', det.beeld_bg_worn === '#C9D6E3', JSON.stringify(det.beeld_bg_worn));
  ok('  een aanbevolen kleur blijft gewoon', det.beeld_bg_back === '#EDE4D8', JSON.stringify(det.beeld_bg_back));
  ok('  een code zonder "eigen" in de keuzelijst telt niet', !('beeld_bg_detail' in det));
  ok('  geen beeld_hex_ in het dossier', !Object.keys(det).some((k) => k.startsWith('beeld_hex_')), Object.keys(det).filter((k) => k.startsWith('beeld_')).join(','));
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
process.exit(fail ? 1 : 0);
