/* VISUAILS — levering 118 (17 november 2026), proefronde: het bestelformulier (bouwer BC).
 *
 *   node tests/levering-118-bestelformulier.test.mjs     (geen build nodig: rekent met de data, draait losse functies uit
 *                                                         pipeline.js met nep-onderdelen, en leest de bron)
 *
 * De punten: L-10 (betaalstap volgt de btw-uitkomst), L-16 (voorrang telt vanaf betaald én foto's compleet), P1-03 (€1-proef
 * met btw vóór betalen), P1-04 (tweede proef: look en foto's mee), P1-06 (verhouding als blok, vaste Verder scrolt eerst),
 * P10-05 (offline: "foto's wachten"), P12-05 (factuur aan), P2-07 (automatisch herstellen), P9-02 (credits in "Wat je
 * krijgt"), P2-05 (tipbalk in de pagina), P10-04 (stap 3 overleeft verversen), P2-06 (geweigerde foto: geen Opnieuw),
 * P8-04 (voorrangsdag elke minuut), P3-05 (hoekvenster als <dialog>), T1-06 ("Hulp nodig?" met naam), P3-11 (volle dagen).
 * L-02 en P2-04 staan op "later" (advies) en zijn niet gebouwd.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { vatDecision, vatGate, verleggingTelt, VAT_TREATMENT, isEu, HOME_COUNTRY } from '../src/data/vat.js';
import { businessCheck } from '../src/data/business.js';
import { quoteTestSample } from '../src/lib/quote.js';
import { AMOUNT, VAT_RATE, VOORRANG, SERVICE_CREDITS, EXTRA_CREDITS, voorrangBelofte } from '../src/data/pricing.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
let pass = 0, fail = 0;
const ok = (naam, v, extra = '') => { if (v) { pass++; console.log(` ok   ${naam}`); } else { fail++; console.log(` FAIL ${naam} ${extra}`); } };
const lees = (p) => readFileSync(path.join(ROOT, p), 'utf8');

const pipe = lees('src/scripts/pipeline.js');
const flow = lees('src/components/order/OrderFlow.astro');
const css = lees('src/styles/werkplaats.css');

/** Eén functie op het hoogste niveau uit pipeline.js: van "function naam(" tot de eerste "}" aan het begin van een regel. */
function bron(naam) {
  const a = pipe.indexOf(`\nfunction ${naam}(`);
  if (a < 0) throw new Error(`geen functie ${naam} in pipeline.js`);
  const b = pipe.indexOf('\n}\n', a);
  return pipe.slice(a + 1, b + 2);
}
/** De functie als echte functie, met de namen die hij van buiten gebruikt als argumenten. */
function maak(naam, deps) {
  const namen = Object.keys(deps);
  // eslint-disable-next-line no-new-func
  return new Function(...namen, `${bron(naam)}\nreturn ${naam};`)(...namen.map((n) => deps[n]));
}
const contrast = (a, b) => {
  const lum = (hex) => {
    const [r, g, bl] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [lum(a), lum(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

/* ── L-10 · DE BETAALSTAP VOLGT WAT DE SERVER BESLIST ─────────────────────────────────────────────── */
console.log('\nL-10 · betaalUitkomst() met dezelfde functies als /api/order');
{
  const geval = ({ land, nummer = '', geenNr = false, stand = '', verlegd = false, reg = '', ip = '', postcode = '' }) => {
    const velden = { vat: nummer, reg_number: reg, postal_code: postcode };
    const q = (sel) => {
      if (sel.startsWith('select[name="country"]')) return { value: land };
      if (sel.includes('name="no_vat"')) return { checked: geenNr };
      if (sel === '[data-pl-verlegd-veld]') return { value: verlegd ? 'yes' : '' };
      return null;
    };
    const f = maak('betaalUitkomst', {
      q, value: (n) => velden[n] || '', form: { dataset: { ipLand: ip } }, HOME_COUNTRY, isEu,
      viesStandNu: () => stand, vatDecision, vatGate, verleggingTelt, businessCheck, VAT_TREATMENT,
    });
    return f();
  };
  ok('België zonder btw-nummer (wel registratienummer): nakijken, geen "meteen naar Mollie"', geval({ land: 'BE', geenNr: true, reg: '0123456789' }) === 'nakijken');
  ok('België, VIES bevestigd en verklaard: btw verlegd', geval({ land: 'BE', nummer: 'BE0123456789', stand: 'geldig', verlegd: true }) === 'verlegd');
  ok('België, VIES keurde af: nakijken', geval({ land: 'BE', nummer: 'BE0123456789', stand: 'ongeldig' }) === 'nakijken');
  ok('België, nog geen antwoord van VIES: de oude zin met beide uitkomsten', geval({ land: 'BE', nummer: 'BE0123456789', stand: '', verlegd: true }) === 'verlegdMisschien');
  ok('Verenigd Koninkrijk vanaf een ip buiten de EU: buiten de EU, btw €0', geval({ land: 'GB', ip: 'GB' }) === 'buiten');
  ok('Verenigd Koninkrijk vanaf een Nederlands ip: nakijken (zoals vatGate op de server)', geval({ land: 'GB', ip: 'NL' }) === 'nakijken');
  ok('"Ergens anders" (XX): nakijken', geval({ land: 'XX' }) === 'nakijken');
  ok('Nederland met KVK-nummer: gewoon 21 %', geval({ land: 'NL', reg: '12345678' }) === 'btw');
  ok('Canarische Eilanden (ES, postcode 35001): nakijken', geval({ land: 'ES', nummer: 'ESX1234567X', stand: 'geldig', verlegd: true, postcode: '35001' }) === 'nakijken');
  ok('de verleggingszin niet bij een door VIES afgekeurd nummer', /const applies = [^\n]*viesStandNu\(\) !== 'ongeldig'/.test(pipe));
  const sync = bron('syncBetaalUitkomst');
  ok('bij nakijken: de Mollie-zinnen weg, de knop "Bestelling versturen", de zin over de betaallink', /\[data-pl-mollie\]/.test(sync) && /lv118\.nakijkKnop/.test(sync) && /lv118\.nakijkZin/.test(sync));
  ok('  niet bij betalen met credits (de server slaat nakijken dan over)', /creditsKosten <= 0/.test(sync) && /if \(creditsKosten > 0\) return;/.test(sync));
  ok('  en hij draait na de credits-zinnen (zetGeldRegels)', /syncBetaalUitkomst\(\);\n\}/.test(bron('zetGeldRegels')));
  const som = bron('renderSummary');
  ok('de regel "Je betaalt" kent verlegd (€0), buiten de EU (€0) en nakijken', /lv118\.payVerlegd/.test(som) && /lv118\.payBuiten/.test(som) && /lv118\.payNakijken/.test(som) && /nul: euro\(0\)/.test(som));
  ok('het land van het ip-adres wordt onthouden uit /api/land', /form\.dataset\.ipLand = land/.test(bron('vulLandVoor')));
}

/* ── P1-03 · DE €1-PROEF MET BTW, VÓÓR BETALEN ─────────────────────────────────────────────────────── */
console.log('\nP1-03 · de proef met btw');
{
  const p = quoteTestSample();
  ok(`quoteTestSample(): ${AMOUNT.testSample} + ${VAT_RATE * 100}% = ${p.grossCents / 100}`, p.grossCents === Math.round(AMOUNT.testSample * 100) + Math.round(AMOUNT.testSample * 100 * VAT_RATE));
  ok('stap 1 toont het bedrag met btw uit quoteTestSample() (geen getypt bedrag)', /\{euro\(quoteTestSample\(\)\.grossCents \/ 100, lang\)\} \{vatLabel\('incl', lang\)\}/.test(flow) && !/<strong>\{sample\.price\}<\/strong>[^\n]*1[,.]21/.test(flow));
  const som = bron('renderSummary');
  ok('het overzicht: btw-regel en totaal uit quoteTestSample()', /quoteTestSample\(\{ vatRate: nul \? 0 : VAT_RATE \}\)/.test(som) && /lv118\.btwRegel/.test(som) && /lv118\.totaalRegel/.test(som));
}

/* ── L-16 EN P8-04 · VOORRANG ──────────────────────────────────────────────────────────────────────── */
console.log('\nL-16 en P8-04 · voorrang telt vanaf betaald én foto\'s compleet; de dag loopt mee');
{
  /* levering 118 (integratie IB, proefronde P8-06): het formulier leest de ene belofte uit pricing.js (voorrangBelofte), en
     die zegt nu zelf "betaling én al je foto's" (L-16). De oude regex pinde de getypte zin van BC vast. */
  ok('het formulier zegt het in beide talen (voorrangZin via voorrangBelofte, en voorrangDag)', /voorrangZin: `Bovenaan de lijst: \$\{voorrangBelofte\('nl'\)\}\.`/.test(flow) && /voorrangZin: `Top of the list: \$\{voorrangBelofte\('en'\)\}\.`/.test(flow)
    && /betaling én al je foto’s/.test(voorrangBelofte('nl')) && /your payment and all your photos are in/.test(voorrangBelofte('en'))
    && /voorrangDag: 'Betaal je nu en staan al je foto’s er/.test(flow) && /voorrangDag: 'Pay now with all your photos in/.test(flow));
  /* levering 118 (integratie IB, proefronde P8-06): sum.voorrangJa is voorrangZin() uit pricing.js, in beide talen. */
  ok('sum.voorrangJa noemt geen getypt uur meer (voorrangZin uit pricing.js)', !/voorrangJa: `[^`]*17:00/.test(flow) && /voorrangJa: voorrangZin\('nl'\)/.test(flow) && /voorrangJa: voorrangZin\('en'\)/.test(flow));
  const s = maak('voorrangSamenvatting', {
    cards: [{ a: 1 }, { a: 1 }], cardReady: (k) => k.klaar === true, c: (k, v) => `${k}|${JSON.stringify(v || {})}`, VOORRANG,
    voorrangDeadline: () => ({ datum: '2026-11-19', uur: VOORRANG.klaarUur }), voorrangDagNaam: () => 'donderdag 19 november',
  });
  ok('bevestigscherm met ontbrekende foto\'s: "de klok loopt vanaf je betaling én al je foto\'s"', /^lv118\.voorrangSumFotos/.test(s()));
  const s2 = maak('voorrangSamenvatting', {
    cards: [{ klaar: true }], cardReady: (k) => k.klaar === true, c: (k, v) => `${k}|${JSON.stringify(v || {})}`, VOORRANG,
    voorrangDeadline: () => ({ datum: '2026-11-19', uur: VOORRANG.klaarUur }), voorrangDagNaam: () => 'donderdag 19 november',
  });
  ok('bevestigscherm met alle foto\'s: de echte dag', s2().startsWith('lv118.voorrangSumDag') && s2().includes('donderdag 19 november'));
  ok('renderSummary gebruikt die regel', /rows\.push\(\[c\('sum\.voorrang'\), voorrangSamenvatting\(\)\]\)/.test(bron('renderSummary')));
  ok('elke minuut opnieuw (zetVoorrangKlok, 60000 ms) en bij elke stapwissel (show)', /60000/.test(bron('zetVoorrangKlok')) && /syncVoorrang\(\);\s*zetVoorrangKlok\(\);/.test(bron('show')));
  ok('syncVoorrang() zonder bedrag gebruikt het laatste bedrag', /if \(arguments\.length\) blok\.__net = net; else net = blok\.__net;/.test(bron('syncVoorrang')));
}

/* ── P12-05 · FACTUUR AAN ──────────────────────────────────────────────────────────────────────────── */
console.log('\nP12-05 · "Factuur aan" op het bevestigscherm');
{
  const velden = { brand: 'Testmerk BV', address_line1: 'Teststraat 1', address_line2: '', postal_code: '1234 AB', city: 'Teststad', vat: 'nl000000000b01' };
  const regel = (geenNr) => maak('factuurRegel', {
    value: (n) => velden[n] || '',
    q: (sel) => (sel === 'select[name="country"]' ? { value: 'NL', selectedIndex: 0, options: [{ textContent: 'Nederland' }] } : sel.includes('no_vat') ? { checked: geenNr } : null),
  })();
  ok('merk · adres · btw-nummer', regel(false) === 'Testmerk BV · Teststraat 1, 1234 AB Teststad, Nederland · NL000000000B01', regel(false));
  ok('  zonder btw-nummer als "geen btw-nummer" aan staat', regel(true) === 'Testmerk BV · Teststraat 1, 1234 AB Teststad, Nederland', regel(true));
  const som = bron('renderSummary');
  ok('met een knop "Wijzig" (data-rol) die naar stap 3 gaat', /wijzig\.dataset\.rol = 'wijzigen'/.test(som) && /show\(3\)/.test(som));
  ok('de knop: 13,5 px, inkt, raakvlak 24 px', /\.pl-sum-wijzig \{[\s\S]*?min-height: 24px[\s\S]*?var\(--h-t-fijn\)[\s\S]*?color: var\(--h-inkt\)/.test(css));
}

/* ── P9-02 · CREDITS IN "WAT JE KRIJGT" ────────────────────────────────────────────────────────────── */
console.log('\nP9-02 · in creditsmodus geen euro\'s in "Wat je krijgt"');
{
  const w = bron('wkOverzicht');
  ok('producten: "n × 4 credits" uit SERVICE_CREDITS', /const perCredits = Number\(\(SERVICE_CREDITS \|\| \{\}\)\[kind\]\)/.test(w) && /`\$\{perCredits\} credits`/.test(w) && SERVICE_CREDITS.catalog > 0);
  ok(`een hoek erbij: "+${EXTRA_CREDITS.photo} credits" uit EXTRA_CREDITS`, /inCredits \? `\+\$\{EXTRA_CREDITS\.photo\} credits`/.test(w));
  ok('de prijstrap weg en geen "excl. btw" onderin', /ul\.hidden = inCredits/.test(w) && /el\.textContent = inCredits \? beeldZin/.test(w));
  ok('ook als de creditsmodus later wisselt (zetCreditPrijzen tekent opnieuw)', /wkOverzicht\(\.\.\.form\.__wkArgs\)/.test(bron('zetCreditPrijzen')));
}

/* ── P2-05 · DE TIPBALK ────────────────────────────────────────────────────────────────────────────── */
console.log('\nP2-05 · de tipbalk in de pagina, één tip, en een fout bovenaan het product');
{
  const regel = css.slice(css.indexOf('html body.werkplaats.hal .of-werk .wk-tipbalk {'), css.indexOf('}', css.indexOf('html body.werkplaats.hal .of-werk .wk-tipbalk {')));
  ok('niet meer position: fixed', /position: static/.test(regel) && !/position: fixed/.test(regel));
  ok('  ook op de telefoon geen vaste plek', !/\.wk-tipbalk \{ left: max\(16px/.test(css));
  ok('boven de uploadvakken (vóór <ProductUploader>)', flow.indexOf('data-wk-tipbalk') < flow.indexOf('<ProductUploader lang={lang} />'));
  ok('wisselt niet vanzelf (loopt = false), geen pauzeknop', /let loopt = false;/.test(bron('bindWkTips')) && /\.wk-tipbalk \[data-wk-tip-pauze\] \{ display: none; \}/.test(css));
  const st = maak('cardStateText', {
    c: (k, v) => `${k}${v ? `:${v.list || v.shot || ''}` : ''}`, shotListText: (ids) => ids.join('+'), missingRequired: () => [], undecided: () => [], shotLabel: (x) => x,
  });
  const kaart = { el: { classList: { toggle() {} } }, slots: { front: { file: {}, status: 'done' }, back: { file: {}, status: 'failed' } } };
  ok('een mislukte foto staat bovenaan het product', st(kaart, true) === 'lv118.kaartFout:back', st(kaart, true));
  ok(`  rood met een woord (#B3261E op wit ${contrast('#B3261E', '#FFFFFF').toFixed(2)} : 1)`, contrast('#B3261E', '#FFFFFF') >= 4.5 && /\.pu-card\.has-fout \.pu-head \.pu-state \{ color: #B3261E;/.test(css));
}

/* ── P2-06 · GEWEIGERDE FOTO: GEEN OPNIEUW ────────────────────────────────────────────────────────── */
console.log('\nP2-06 · een te kleine foto krijgt alleen "Vervangen"');
{
  ok('paintSlot: Opnieuw niet bij s.geweigerd', /el\.retryBtn\.hidden = !\(filled && s\.status === 'failed' && !s\.geweigerd\)/.test(bron('paintSlot')));
  ok('retrySlot: een geweigerde foto gaat nooit alsnog naar de server', /if \(s\.geweigerd\) \{ paintSlot\(card, id\); return; \}/.test(bron('retrySlot')));
}

/* ── P10-05 · OFFLINE ──────────────────────────────────────────────────────────────────────────────── */
console.log('\nP10-05 · "Je verbinding is weg; 3 foto\'s wachten"');
{
  const tel = (offline, slots) => {
    const nav = globalThis.navigator;
    const f = maak('wachtendeFotos', { cards: [{ slots }] });
    Object.defineProperty(globalThis, 'navigator', { value: { onLine: !offline }, configurable: true });
    const n = f();
    Object.defineProperty(globalThis, 'navigator', { value: nav, configurable: true });
    return n;
  };
  ok('drie vakken die op het netwerk strandden: 3', tel(true, { a: { file: {}, status: 'failed', netwerkWeg: true }, b: { file: {}, status: 'failed', netwerkWeg: true }, c: { file: {}, status: 'sending' } }) === 3);
  ok('  een geweigerde (te kleine) foto telt niet', tel(false, { a: { file: {}, status: 'failed', netwerkWeg: true, geweigerd: true } }) === 0);
  ok('  een weigering van de server (te groot) telt niet', tel(false, { a: { file: {}, status: 'failed', netwerkWeg: false } }) === 0);
  ok('askMissing vraagt dat eerst', /if \(vraagWachtend\(box\)\) return false;/.test(bron('askMissing')));
  ok('knoppen "Wachten" en "Toch later"', /lv118\.wachtKnop/.test(bron('wachtModus')) && /lv118\.wachtLater/.test(bron('wachtModus')));
}

/* ── P2-07 EN P10-04 · HERSTELLEN ──────────────────────────────────────────────────────────────────── */
console.log('\nP2-07 en P10-04 · automatisch herstellen, stap 3 overleeft verversen');
{
  const cc = bron('checkConcept');
  ok('het concept komt vanzelf terug (herstelConcept zonder klik), "Verder gaan" weg', /herstelConcept\(c0, daar\);/.test(cc) && /verderKnop\.hidden = true/.test(cc) && /lv118\.conceptTerugH/.test(cc));
  ok('  "Opnieuw beginnen" laadt daarna een leeg formulier', /location\.replace\(location\.pathname \+ location\.search\)/.test(bron('bindConcept')));
  ok('de stap tot en met 3 onthouden, en bij elke stapwissel', /stap: Math\.min\(current, 3\)/.test(bron('maakConcept')) && /if \(!opstart\) bewaarConcept\(\);/.test(bron('show')));
  ok('stap 3 alleen in sessionStorage (dit tabblad), nooit in het concept', /sessionStorage\.setItem\('vis-bestelling-s3'/.test(bron('bewaarStap3')) && !/stap3Velden\(|sessionStorage\./.test(bron('maakConcept')));
  ok('  terug in stap 3 na verversen', /herstelStap3\(\)/.test(bron('herstelConcept')) && /show\(3\)/.test(bron('herstelConcept')));
  ok('  en weg na de bestelling (wisConcept)', /sessionStorage\.removeItem\('vis-bestelling-s3'\)/.test(bron('wisConcept')));
}

/* ── P1-04 · TWEEDE PROEF ──────────────────────────────────────────────────────────────────────────── */
console.log('\nP1-04 · tweede proef: deze look bestellen, met de foto\'s');
{
  const z = bron('zetProefBestel');
  ok('"Bestel deze look voor €…" met de prijs uit de ladder', /lv118\.proefBestel/.test(z) && /rateFor\(kind, 1\)/.test(z));
  ok('  naar het gewone formulier van dezelfde soort, met 1 product en stap 2', /\/start\/\$\{kind\}\//.test(z) && /\['products', '1'\]/.test(z) && /concept\.stap = 2/.test(z));
  ok('  de link staat in de bron', /data-pl-proef-bestel/.test(flow));
  ok('/start/catalog en /start/catalog/ zijn dezelfde pagina voor het concept', /replace\(\/\\\/\+\$\/, ''\)/.test(bron('checkConcept')));
}

/* ── P1-06 · VERHOUDING EN DE VASTE VERDER ─────────────────────────────────────────────────────────── */
console.log('\nP1-06 · de verhouding als blok in stap 1, de vaste Verder scrolt eerst');
{
  ok('blok "vorm" in stap 1 met dezelfde knoppen (data-wk-vorm)', /<WkBlok aan=\{werk\} id="vorm" nr="05"[\s\S]{0,400}data-wk-vorm=\{v\.id\}/.test(flow) && /vormBlok: \{ label: 'Vorm'/.test(flow) && /vormBlok: \{ label: 'Shape'/.test(flow));
  ok('  alleen tot 900 px', /\.wk-blok-vorm \{ display: none; \}/.test(css) && /\.wk-blok-vorm \{ display: block; \}/.test(css));
  ok('bindWkVorm bindt alle groepen', /qa\('\[data-wk-vormen\] \[data-wk-vorm\]'\)/.test(bron('bindWkVorm')));
  const v = bron('bindWkVolgendBlok');
  ok('de vaste Verder: "Nog n keuzes" en eerst naar het volgende blok', /lv118\.nogKeuzes/.test(v) && /e\.stopPropagation\(\)/.test(v) && /window\.scrollTo/.test(v) && /, true\);/.test(v));
  /* levering 118 (17 november 2026, N4 P1-06): de nep-DOM hierboven zag niet dat '[data-wk-onder]' in de echte pagina eerst
     de leverzin (<p class="wk-lever-zin" data-wk-onder=…>) vond. Nu: de kiezer uit de bron, toegepast op de tags van
     OrderFlow in bronvolgorde (zoals querySelector in de gebouwde pagina); de eerste treffer moet de balk met Verder zijn. */
  const kiezer = (/const balk = q\('([^']+)'\)/.exec(v) || [])[1] || '';
  const m = /^([a-z]*)((?:\.[\w-]+)*)((?:\[[\w-]+\])*)$/.exec(kiezer);
  const past = (tag, attrs) => {
    if (!m) return false;
    if (m[1] && m[1] !== tag) return false;
    const klassen = ((/\sclass="([^"]*)"/.exec(attrs) || [])[1] || '').split(/\s+/);
    if ((m[2].match(/\.[\w-]+/g) || []).some((k) => !klassen.includes(k.slice(1)))) return false;
    return (m[3].match(/\[[\w-]+\]/g) || []).every((a) => new RegExp(`\\s${a.slice(1, -1)}(?=[\\s=>/]|$)`).test(attrs));
  };
  const tags = [...flow.matchAll(/<([a-z][a-z0-9]*)(\s[^>]*)?>/g)];
  const eerste = tags.find((t) => past(t[1], t[2] || ''));
  const binnen = eerste ? flow.slice(eerste.index, flow.indexOf(`</${eerste[1]}>`, eerste.index)) : '';
  ok(`  de kiezer van de balk (${kiezer}) vindt in OrderFlow eerst de balk met Verder, niet de leverzin`, !!eerste && /data-pl-next/.test(binnen) && !/wk-lever-zin/.test(eerste[0]), eerste ? eerste[0].slice(0, 80) : 'geen treffer');
  ok('  en precies één element', tags.filter((t) => past(t[1], t[2] || '')).length === 1);
  ok('  de oude, dubbelzinnige kiezer zou de leverzin vinden (de toets vangt de fout)', (() => {
    const oud = tags.find((t) => /\sdata-wk-onder(?=[\s=>/]|$)/.test(t[2] || ''));
    return !!oud && /wk-lever-zin/.test(oud[0]);
  })());
}

/* ── P3-05 · HET HOEKVENSTER ───────────────────────────────────────────────────────────────────────── */
console.log('\nP3-05 · "Een hoek erbij" als <dialog>');
{
  ok('een <dialog>, geopend met showModal()', /<dialog class="wk-hoeken" data-wk-hoeken hidden aria-labelledby="wk-hoeken-h">/.test(flow) && /dlg\.showModal\(\)/.test(bron('bindWkHoeken')));
  ok('  Esc via sluit() (cancel), en close() bij Klaar', /addEventListener\('cancel'/.test(bron('bindWkHoeken')) && /dlg\.close\(\)/.test(bron('bindWkHoeken')));
  ok('  de twee "Zelf bedenken" krijgen de naam van hun groep', /pl-hoek-eigen input\[type="checkbox"\]/.test(bron('bindWkHoeken')) && /setAttribute\('aria-label'/.test(bron('bindWkHoeken')));
  ok('  geen glas of zachte schaduw: het dimmen doet het venster (inkt op 42 %)', /dialog\.wk-hoeken::backdrop \{ background: transparent; \}/.test(css));
}

/* ── T1-06 · "HULP NODIG?" ─────────────────────────────────────────────────────────────────────────── */
console.log('\nT1-06 · "Hulp nodig?" houdt zijn naam');
{
  ok('de tekst visueel verborgen, niet display:none', !/\.wk-hulp-t \{ display: none; \}/.test(css) && /\.wk-hulp-t \{ position: absolute; width: 1px; height: 1px;[^}]*clip: rect\(0 0 0 0\)/.test(css));
}

/* ── P3-11 · VOLLE DAGEN ───────────────────────────────────────────────────────────────────────────── */
console.log('\nP3-11 · volle dagen in de rij');
{
  const r = bron('renderWindows');
  ok('een grijze kaart "vol" en "(29–30 vol)" bij een venster erover', /pl-dag is-vol/.test(r) && /lv118\.volTussen/.test(r) && /info\.vol/.test(r));
  ok('runGate geeft `vol` van /api/capacity door', /vol: body\.vol/.test(pipe));
  ok(`  grijs op vlak leesbaar (#5E6461 op #F4F5F4: ${contrast('#5E6461', '#F4F5F4').toFixed(2)} : 1)`, contrast('#5E6461', '#F4F5F4') >= 4.5 && /\.pl-dag\.is-vol\) \{ cursor: default; border-style: dashed; background: #F4F5F4; color: #5E6461; \}/.test(flow));
}

/* ── DE WOORDEN ────────────────────────────────────────────────────────────────────────────────────── */
console.log('\nDe woorden: elke c(\'lv118.…\') staat in REQUIRED_COPY en in beide talen');
{
  const gebruikt = [...new Set([...pipe.matchAll(/'lv118\.([a-zA-Z0-9]+)'/g)].map((m) => m[1]))];
  const lijst = flow.slice(flow.indexOf('const REQUIRED_COPY = ['), flow.indexOf('];', flow.indexOf('const REQUIRED_COPY = [')));
  const blok = flow.slice(flow.indexOf('.lv118 = {'), flow.indexOf('};', flow.indexOf('.lv118 = {')));
  const mist = gebruikt.filter((k) => !lijst.includes(`'lv118.${k}'`) || !new RegExp(`\\b${k}: nl \\? '`).test(blok));
  ok(`${gebruikt.length} sleutels, allemaal in REQUIRED_COPY en met NL en EN`, gebruikt.length >= 20 && !mist.length, mist.join(', '));
  ok('geen bedrag getypt in de nieuwe woorden', !/€\s?\d/.test(blok.replace(/\/\*[\s\S]*?\*\//g, '')));
}

console.log(`\n${pass} goed, ${fail} fout`);
process.exit(fail ? 1 : 0);
