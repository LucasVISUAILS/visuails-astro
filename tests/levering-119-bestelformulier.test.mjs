/* VISUAILS — levering 119 (18 november 2026), proefronde: het bestelformulier en de bedankpagina (bouwer C1).
 *
 *   node tests/levering-119-bestelformulier.test.mjs     (geen build nodig: draait losse functies uit pipeline.js en
 *                                                         interactions.js met nep-onderdelen, en leest de bron)
 *
 * De punten: L-03 (geen "Waar je verkoopt" zonder vraag), L-04 (controle toont wat de klant invulde), L-05 (één woord voor de
 * leverdatum), L-14 (fout onder het zakelijk-vinkje), L-15 (overgenomen soort zegt het), P1-01 (€1-melding klapt in boven een
 * €1-blok), P1-07 (geen vierde tegel, namen op twee regels), P1-09 ("Nog niet betaald" na 20 s), P10-01 (het verschil in het
 * totaal), P10-02 (productnaam hoogstens 80 tekens, lange woorden breken), P10-09 (gezicht per product), P11-11 (namen voor de
 * schermlezer), P11-13 (focus na Later), P11-14 (role=alert), P11-15 (aria-pressed op de trap), P2-11 (stijl als één regel),
 * P3-02 (boven 20 het paneel), P3-14 (achtergrond per hoek), P6-26 (proefknoppen bij een gesloten ronde), P8-07 (één
 * leverzin met voorrang), P9-08 (afgebroken overgang). P11-12 zit in ModelKeuze/ModelPicker (C4): zie de notities.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
let pass = 0, fail = 0;
const ok = (naam, v, extra = '') => { if (v) { pass++; console.log(` ok   ${naam}`); } else { fail++; console.log(` FAIL ${naam} ${extra}`); } };
const lees = (p) => readFileSync(path.join(ROOT, p), 'utf8');

const pipe = lees('src/scripts/pipeline.js');
const inter = lees('src/scripts/interactions.js');
const flow = lees('src/components/order/OrderFlow.astro');
const css = lees('src/styles/werkplaats.css');
const ty = lees('src/components/ThankYouPage.astro');

/** Eén functie op het hoogste niveau, op haakjes geteld. */
function functie(bron, naam) {
  const start = bron.indexOf(`\nfunction ${naam}(`);
  if (start < 0) throw new Error(`geen functie ${naam}`);
  let i = bron.indexOf('{', bron.indexOf(')', start)), diep = 0;
  for (; i < bron.length; i++) {
    if (bron[i] === '{') diep++;
    else if (bron[i] === '}' && --diep === 0) return bron.slice(start + 1, i + 1);
  }
  throw new Error(`functie ${naam} loopt niet af`);
}
/** De functie als echte functie, met wat hij van buiten gebruikt als argumenten. */
function maak(bron, naam, deps) {
  const namen = Object.keys(deps);
  // eslint-disable-next-line no-new-func
  return new Function(...namen, `${functie(bron, naam)}\nreturn ${naam};`)(...namen.map((n) => deps[n]));
}
const c = (k, v = {}) => `${k}|${Object.entries(v).map(([a, b]) => `${a}=${b}`).join(',')}`;
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)]; return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

/* ── DE WOORDEN ─────────────────────────────────────────────────────────────────────────────────────────── */
console.log('\nDe nieuwe woorden (lv119) in beide talen en in REQUIRED_COPY');
{
  const sleutels = ['producten', 'bericht', 'contact', 'modelPerN', 'bgRest', 'soortZoals', 'dagenNu'];
  const blok = flow.slice(flow.indexOf('(PIPE[l] as Record<string, unknown>).lv119 = {'), flow.indexOf('// ── The contract, enforced at build time'));
  ok('het blok lv119 staat er', blok.length > 100);
  for (const k of sleutels) {
    ok(`  ${k}: NL en EN`, new RegExp(`\\n    ${k}: nl \\? '[^']+' : '[^']+',`).test(blok));
    ok(`  ${k}: in REQUIRED_COPY en gebruikt door pipeline.js`, flow.includes(`'lv119.${k}'`) && pipe.includes(`'lv119.${k}'`));
  }
  ok('geen bedrag getypt in lv119', !/€\s?\d/.test(blok));
}

/* ── L-03 ─────────────────────────────────────────────────────────────────────────────────────────────────── */
console.log('\nL-03 · "Waar je verkoopt" alleen als de vraag er is');
{
  const som = functie(pipe, 'renderSummary');
  ok('de regel hangt aan chGevraagd: niet in de verborgen .wk-opslag, tenzij er een kanaal aan staat', /const chGevraagd = !!chField && \(!chField\.closest\('\.wk-opslag'\) \|\| chOn\.length > 0\);/.test(som) && /if \(chGevraagd\) \{/.test(som));
  ok('de kanaalkiezer staat in de werkplaats in .wk-opslag (verborgen)', /<WkOm aan=\{werk\} klasse="wk-opslag" verborgen>\s*<slot \/>/.test(flow));
}

/* ── L-04 en P1-07 ────────────────────────────────────────────────────────────────────────────────────────── */
console.log('\nL-04 en P1-07 · het controlescherm');
{
  const kaart = (n, naam, soort) => ({ n, input: { value: naam }, soortEl: soort ? { value: soort } : null });
  const deps = (cards, styling = true) => ({
    cards, cfg: { styling: styling ? { garments: [{ id: 'jas', naam: 'Jas' }, { id: 'broek', naam: 'Broek' }] } : null },
    soortVan: (k) => (k && k.soortEl ? k.soortEl.value : ''),
    soortNaam: (k) => ({ jas: 'Jas', broek: 'Broek' })[k.soortEl.value] || '',
    cardLabel: (k) => k.input.value.trim() || `Product ${k.n}`,
  });
  const r = maak(pipe, 'productenRegel', deps([kaart(1, 'TEST-merk Hoodie', 'jas'), kaart(2, '', 'broek')]))();
  ok('per product naam en soort: "01 TEST-merk Hoodie (jas) · 02 Product 2 (broek)"', r === '01 TEST-merk Hoodie (jas) · 02 Product 2 (broek)', r);
  ok('zonder namen en soorten geen regel', maak(pipe, 'productenRegel', deps([kaart(1, '', ''), kaart(2, '', '')]))() === '');
  const tien = Array.from({ length: 10 }, (_, i) => kaart(i + 1, `P${i + 1}`, ''));
  ok('boven de acht: "+2"', /· \+2$/.test(maak(pipe, 'productenRegel', deps(tien))()));
  const som = functie(pipe, 'renderSummary');
  ok('het bericht letterlijk, met zijn eigen regels', /rows\.push\(\[c\('lv119\.bericht'\), bericht, 'bericht'\]\)/.test(som) && /dd\.classList\.add\('pl-sum-bericht'\)/.test(som) && /dd\.pl-sum-bericht\) \{ white-space: pre-line; \}/.test(flow));
  ok('hoe we de klant bereiken: het label van de gekozen voorkeur', /input\[name="contact_preference"\]:checked/.test(som) && /c\('lv119\.contact'\)/.test(som));
  ok('foto\'s later: "die stuur je na het bestellen in VISUAILS Studio" (NL en EN), niet "we nemen contact met je op"', /noFiles: 'Nog geen foto’s: die stuur je na het bestellen in VISUAILS Studio'/.test(flow) && /noFiles: 'No photos yet: you send them after ordering, in VISUAILS Studio'/.test(flow) && !/noFiles: 'Nog niets gestuurd — we nemen contact met je op'/.test(flow));
  ok('een kleur met een naam zonder hexcode; een eigen kleur houdt zijn code', /const basis = perHoek \|\| \(bgName && !eigenKleur \? bgName : bgName \? `\$\{bgName\} — \$\{bgHex\}` : bgHex\);/.test(som));
  const strip = functie(pipe, 'renderStrip');
  ok('P1-07: de strook heeft geen tegel voor de verhouding of de achtergrond meer', !/is-ratio|is-bg|ratio-shape/.test(strip));
  ok('P1-07: de naam loopt over twee regels (line-clamp 2), zonder "…" op één regel', /\.pl-sum-cap\) \{[^}]*-webkit-line-clamp: 2;[^}]*\}/.test(flow) && !/\.pl-sum-cap\) \{[^}]*white-space: nowrap/.test(flow));
}

/* ── P3-14 ────────────────────────────────────────────────────────────────────────────────────────────────── */
console.log('\nP3-14 · de achtergrond per hoek, alleen de afwijkingen');
{
  const knop = (id, hoek, verborgen = false) => ({ dataset: { wkKleur: id, wkHoekNaam: hoek }, closest: () => (verborgen ? { hidden: true } : null) });
  const staal = (hex, naam) => ({ dataset: { wkC: hex }, childNodes: [{}, { textContent: naam }] });
  const stalen = [staal('#FFFFFF', 'Wit'), staal('#F5F5F5', 'Lichtgrijs'), staal('#EDE4D8', 'Beige'), { dataset: { wkC: 'eigen' }, childNodes: [] }];
  const geval = (kleuren, extra = []) => maak(pipe, 'achtergrondPerHoek', {
    werkAan: () => true,
    qa: (s) => (s === '[data-wk-kleur]' ? [knop('front', 'Voorkant'), knop('back', 'Achterkant'), knop('detail', 'Detail'), knop('model', 'Op model'), ...extra] : s === '[data-wk-c]' ? stalen : []),
    wkKleurVan: (id) => kleuren[id] || '#FFFFFF',
    c: (k, v) => (k === 'lv119.bgRest' ? `rest ${v.kleur}` : k),
  })();
  ok('alleen de voorkant beige: "Voorkant beige · rest wit"', geval({ front: '#EDE4D8' }) === 'Voorkant beige · rest wit', geval({ front: '#EDE4D8' }));
  ok('alles wit: "Wit"', geval({}) === 'Wit');
  ok('een eigen kleur heet zijn code', geval({ back: '#1E3A5F' }) === 'Achterkant #1E3A5F · rest wit', geval({ back: '#1E3A5F' }));
  ok('een verborgen extra hoek telt niet mee', geval({}, [knop('extra1', 'Zijkant', true)]) === 'Wit');
  ok('buiten de werkplaats: leeg (de oude regel)', maak(pipe, 'achtergrondPerHoek', { werkAan: () => false, qa: () => [], wkKleurVan: () => '', c })() === '');
}

/* ── P10-09 ───────────────────────────────────────────────────────────────────────────────────────────────── */
console.log('\nP10-09 · een eigen gezicht per product');
{
  const kaarten = [{ n: 1, m: '' }, { n: 2, m: 'seme' }, { n: 3, m: '' }];
  const f = (cards) => maak(pipe, 'modelAfwijkingen', {
    cards, modelVan: (k) => k.m, modelNaamVan: (k) => k.m.charAt(0).toUpperCase() + k.m.slice(1),
    c: (k, v) => (k === 'pu.product' ? `Product ${v.n}` : `${v.n} producten met een eigen gezicht`),
  })();
  ok('"Ava · product 2: Seme" (de functie geeft het stuk erachter)', f(kaarten) === ' · product 2: Seme', f(kaarten));
  ok('niemand wijkt af: leeg', f([{ n: 1, m: '' }]) === '');
  ok('vier of meer: alleen het aantal', f([1, 2, 3, 4].map((n) => ({ n, m: 'ava' }))) === ' · 4 producten met een eigen gezicht');
  ok('in het controlescherm én in "Wat je krijgt"', /const perProduct = modelAfwijkingen\(\);/.test(functie(pipe, 'renderSummary')) && /if \(modelText\) modelText \+= modelAfwijkingen\(\);/.test(functie(pipe, 'syncSummaries')));
  ok('een wissel op de kaart werkt het overzicht bij', /rij\.addEventListener\('change', \(\) => \{ paintCard\(card\); syncCopyDown\(cards\[0\]\); syncSummaries\(\); \}\);/.test(pipe));
}

/* ── L-15 ─────────────────────────────────────────────────────────────────────────────────────────────────── */
console.log('\nL-15 · een overgenomen soort zegt dat hij overgenomen is');
{
  const opties = () => ['', 'jas', 'broek'].map((v) => ({ value: v, textContent: v ? v.charAt(0).toUpperCase() + v.slice(1) : 'Kies', dataset: {} }));
  const sel = () => {
    const s = { value: '', options: opties(), classList: { aan: false, toggle(k, b) { this.aan = b; } } };
    s.options.forEach((o) => Object.defineProperty(o, 'selected', { get: () => s.value === o.value }));
    return s;
  };
  const kaarten = [1, 2, 3, 4].map((n) => ({ n, soortEl: sel(), soortEigen: false }));
  kaarten[0].soortEl.value = 'jas'; kaarten[0].soortEigen = true;
  kaarten[2].soortEl.value = 'broek'; kaarten[2].soortEigen = true;
  const zet = maak(pipe, 'zetSoortVoorstel', { c: (k, v) => `${v.soort} · zoals product ${v.n}` });
  const veld = { value: '' };
  maak(pipe, 'syncSoorten', {
    cfg: { styling: {} }, cards: kaarten, ontkoppelAlles() {}, paintErbij() {}, zetSoortVoorstel: zet,
    q: () => veld, form: { appendChild() {} }, soortVan: (k) => k.soortEl.value, document: {},
  })();
  const tekst = (k) => k.soortEl.options.find((o) => o.selected).textContent;
  ok('product 2 neemt Jas over en zegt "Jas · zoals product 1"', kaarten[1].soortEl.value === 'jas' && tekst(kaarten[1]) === 'Jas · zoals product 1', tekst(kaarten[1]));
  ok('product 3 koos zelf Broek: gewoon "Broek"', tekst(kaarten[2]) === 'Broek' && !kaarten[2].soortEl.classList.aan);
  ok('product 4 neemt Broek over van product 3', tekst(kaarten[3]) === 'Broek · zoals product 3' && kaarten[3].soortEl.classList.aan, tekst(kaarten[3]));
  ok('de andere opties houden hun eigen naam', kaarten[1].soortEl.options[2].textContent === 'Broek');
  kaarten[1].soortEigen = true;
  maak(pipe, 'syncSoorten', { cfg: { styling: {} }, cards: kaarten, ontkoppelAlles() {}, paintErbij() {}, zetSoortVoorstel: zet, q: () => veld, form: { appendChild() {} }, soortVan: (k) => k.soortEl.value, document: {} })();
  ok('kiest de klant zelf, dan is het geen voorstel meer', tekst(kaarten[1]) === 'Jas' && !kaarten[1].soortEl.classList.aan);
}

/* ── P3-02 ────────────────────────────────────────────────────────────────────────────────────────────────── */
console.log('\nP3-02 · boven 20 het paneel "Meer dan 20 producten?"');
{
  const luister = () => { const l = {}; return { l, addEventListener(t, f) { (l[t] = l[t] || []).push(f); }, fire(t) { (l[t] || []).forEach((f) => f({})); } }; };
  const select = Object.assign(luister(), { value: '', options: [...Array.from({ length: 20 }, (_, i) => ({ value: String(i + 1) })), { value: 'Meer dan 20 producten?' }], dispatchEvent(e) { this.fire(e.type); } });
  const input = Object.assign(luister(), { max: '20', value: '', focus() {} });
  const box = {};
  const q = (s) => (s === '[data-pl-qty]' ? box : s === 'select[name="products"]' ? select : s === '[data-pl-qty-input]' ? input : null);
  maak(pipe, 'bindQty', { q, qa: () => [], location: { search: '' }, URLSearchParams, Event: class { constructor(t) { this.type = t; } } })();
  input.value = '21'; input.fire('input');
  ok('21 intikken: de keuzelijst staat op "meer" (het paneel), niet stil op 20', select.value === 'Meer dan 20 producten?' && input.value === '', `${select.value}|${input.value}`);
  input.value = '7'; input.fire('input');
  ok('7 intikken: gewoon 7', select.value === '7');
  input.value = '0'; input.fire('input');
  ok('0 intikken: 1 (onder het minimum verandert niets)', select.value === '1');
}

/* ── P8-07 ────────────────────────────────────────────────────────────────────────────────────────────────── */
console.log('\nP8-07 · met voorrang één leverzin');
{
  const t = { textContent: '' };
  const lever = { dataset: { wkOnder: 'Zodra het klaar is: vaak binnen een dag, soms een paar dagen.', wkBoven: 'Vanaf 10 producten …', wkDrempel: '10' }, classList: { toggle() {} } };
  const dag = { textContent: 'Betaal je nu en staan al je foto’s er, dan is het uiterlijk donderdag 19 november om 17:00 klaar.' };
  let aan = false, n = 3;
  const f = maak(pipe, 'zetWkLever', {
    q: (s) => (s === '[data-wk-lever]' ? lever : s === '[data-wk-lever-t]' ? t : s === '[data-pl-voorrang-dag]' ? dag : null),
    productCount: () => n, voorrangAan: () => aan,
  });
  f(); ok('zonder voorrang: "vaak binnen een dag"', /vaak binnen een dag/.test(t.textContent));
  aan = true; f(); ok('met voorrang: de voorrangsdag in plaats van "vaak binnen een dag"', t.textContent === dag.textContent);
  n = 12; f(); ok('vanaf de drempel blijft de zin over de leverdatum', /Vanaf 10/.test(t.textContent));
  ok('de dag onder de schakelaar gaat weg zolang hij in de leverzin staat', /dagZin\.hidden = !dag \|\| \(voorrangAan\(\) && !!q\('\[data-wk-lever-t\]'\)\);/.test(functie(pipe, 'syncVoorrang')) && /zetWkLever\(\);\n\}/.test(functie(pipe, 'syncVoorrang')) && /zetWkLever\(\);/.test(functie(pipe, 'wkOverzicht')));
}

/* ── P10-01 ───────────────────────────────────────────────────────────────────────────────────────────────── */
console.log('\nP10-01 · "Toevoegen" noemt het verschil in het totaal');
{
  ok('het verschil uit totaalBij(n + 1) − totaalBij(n), niet het tarief van de nieuwe trede', /const verschil = nu !== null && straks !== null \? round2\(straks - nu\) : null;/.test(pipe) && !/rateFor\(kindOf\(\), n \+ 1\)/.test(pipe));
  ok('NL: "+ {prijs} in totaal", "Zelfde totaal", "{prijs} minder in totaal"', /toeSub: '\+ \{prijs\} in totaal · eigen vier beelden'/.test(flow) && /toeSubNul: 'Zelfde totaal · eigen vier beelden'/.test(flow) && /toeSubMinder: '\{prijs\} minder in totaal · eigen vier beelden'/.test(flow));
  ok('EN: "+ {prijs} in total", "Same total", "{prijs} less in total"', /toeSub: '\+ \{prijs\} in total · its own four images'/.test(flow) && /toeSubNul: 'Same total · its own four images'/.test(flow) && /toeSubMinder: '\{prijs\} less in total · its own four images'/.test(flow));
}

/* ── L-05 ─────────────────────────────────────────────────────────────────────────────────────────────────── */
console.log('\nL-05 · één begrip voor de leverdatum');
{
  const tekst = flow.split('\n').filter((r) => !/^\s*(\/\/|\*|\/\*|\{\/\*)/.test(r) && /'|`/.test(r));
  const fout = tekst.filter((r) => /gereserveerd|reserveer|vastgezette leverdatum|vrijgehouden|vrijhouden|houden we ook vrij|leverdatum vast\.|still to be reserved|reserved delivery date|chosen: 'Held for you'|Nothing is reserved/i.test(r));
  ok('geen "gereserveerd", "vastgezet", "vrijgehouden", "reserved" meer voor de leverdatum', fout.length === 0, fout.join(' | ').slice(0, 300));
  ok('NL: "vastgehouden zodra je bestelt, vast zodra je betaalt"', /vastgehouden zodra je bestelt, vast zodra je betaalt/.test(flow) && /zodra je bestelt, houden we de datum zeven dagen voor je vast, en vast staat hij zodra je betaalt/.test(flow));
  ok('EN: "held once you order, fixed once you pay"', /held once you order, fixed once you pay/.test(flow) && /we hold the date for you for seven days, and it is fixed once you pay/.test(flow));
  ok('de gekozen datum heet "Gekozen" / "Chosen" (vóór het bestellen is er nog niets vastgehouden)', /chosen: 'Gekozen',/.test(flow) && /chosen: 'Chosen',/.test(flow));
}

/* ── L-14 ─────────────────────────────────────────────────────────────────────────────────────────────────── */
console.log('\nL-14 · de fout bij het zakelijk-vinkje onder het label');
{
  const nieuw = () => ({ className: '', textContent: '', hidden: true, classList: { contains(k) { return this.el.className.split(' ').includes(k); } } });
  const maakEl = () => { const e = nieuw(); e.classList.el = e; return e; };
  let na = null;
  const label = { tagName: 'LABEL', get nextElementSibling() { return na; }, after(e) { na = e; }, querySelector: () => { throw new Error('niet ín het label zoeken'); } };
  const f = maak(pipe, 'markeerVeld', { document: { createElement: maakEl } });
  f(label, 'VISUAILS levert uitsluitend zakelijk.');
  ok('de regel staat ná het label (volle breedte), niet in de flexrij', !!na && na.className === 'pl-veld-fout' && na.textContent === 'VISUAILS levert uitsluitend zakelijk.' && na.hidden === false);
  const eerste = na;
  f(label, 'Nog eens.');
  ok('een tweede ronde hergebruikt dezelfde regel', na === eerste && na.textContent === 'Nog eens.');
  const v = functie(pipe, 'validateStep');
  ok('geen ballon van de browser bij een vinkje; wel de focus en aria-describedby naar de regel', /if \(zichtbaar && bad\.type !== 'checkbox'\) bad\.reportValidity\(\);/.test(v) && /bad\.setAttribute\('aria-describedby'/.test(v));
  ok('clearStepError haalt die verwijzing weer weg', /\[aria-describedby\*="pl-veld-fout-"\]/.test(functie(pipe, 'clearStepError')));
  ok('het zakelijk-vinkje is een <label class="pl-consent"> buiten een .field of fieldset', /<label class="pl-consent">\s*<input type="checkbox" name="business_declaration"/.test(flow));
}

/* ── P11 · toegankelijkheid ───────────────────────────────────────────────────────────────────────────────── */
console.log('\nP11-11, P11-13, P11-14, P11-15 · de schermlezer');
{
  ok('P11-11: "Registratienummer optioneel" (de spatie in de span)', /<span class="pl-opt" data-pl-reg-opt hidden>\{` \$\{f\.optional\}`\}<\/span><\/label>/.test(flow));
  ok('P11-11: het vraagteken bij het btw-nummer staat naast het label, niet erin', /<\/label><Uitleg tekst=\{f\.s3\.vatHint\} over=\{f\.s3\.vat\} lang=\{lang\} \/>/.test(flow) && !/<label for="pl-vat">((?!<\/label>).)*<Uitleg/.test(flow));
  ok('P11-14: de melding "al geprobeerd" heeft role="alert"', /class="pl-weigering pl-proef-al" data-pl-proef-al role="alert" tabindex="-1" hidden/.test(flow));
  ok('P11-15: de trap draagt aria-pressed (in de HTML en bijgewerkt in wkOverzicht)', /data-pl-qty-set=\{String\(tr\.van\)\} aria-pressed="false"/.test(flow) && /knop\.setAttribute\('aria-pressed', String\(nu\)\)/.test(functie(pipe, 'wkOverzicht')));
  ok('P11-15: de gekozen stijlkaart had al aria-current="true" (geen wijziging nodig)', /<a class="wk-stijl is-gekozen" href=\{lp\('\/catalog'\)\} aria-current="true">/.test(flow));
  // P11-13: na Later de focus terug en een live-zin
  const focus = [];
  const later = { hidden: false, isConnected: true, dataset: { plDagenNaar: 'later' }, closest: () => ({ parentNode: {} }), focus: () => focus.push('later') };
  const eerder = { hidden: false, isConnected: true, dataset: { plDagenNaar: 'eerder' }, closest: () => ({ parentNode: {} }), focus: () => focus.push('eerder') };
  let live = null;
  const stap = { appendChild(e) { live = e; } };
  const host = { dataset: { plFocus: 'later' }, closest: () => stap, parentNode: stap };
  const f = maak(pipe, 'dagenNaBladeren', {
    q: (s) => (s === '[data-pl-dagen-live]' ? live : null),
    qa: (s) => (s === '[data-pl-dagen-naar]' ? [eerder, later] : []),
    document: { createElement: () => ({ setAttribute(k, v) { this[k] = v; }, className: '' }) },
    c: (k, v) => (k === 'lv119.dagenNu' ? `Nu: ${v.van} tot ${v.tot}` : k),
    deel: (taal, iso) => iso,
    setTimeout: (fn) => fn(),
  });
  f(host, [{ start: '2026-11-27', end: '2026-11-28' }, { start: '2026-12-01', end: '2026-12-02' }], 'nl-NL');
  ok('P11-13: de focus gaat terug naar "Later →"', focus.join() === 'later', focus.join());
  ok('P11-13: een live-regio in de stap zegt "Nu: … tot …"', !!live && live['aria-live'] === 'polite' && live.textContent === 'Nu: 2026-11-27 tot 2026-12-02', live && live.textContent);
  ok('P11-13: zonder bladeren niets (geen focussprong bij het eerste tekenen)', (() => { focus.length = 0; f({ dataset: {}, closest: () => stap }, [], 'nl-NL'); return focus.length === 0; })());
  ok('P11-13: Eerder en Later zetten de vlag op het vak vóór runGate()', /host\.dataset\.plFocus = 'later';/.test(pipe) && /host\.dataset\.plFocus = 'eerder';/.test(pipe));
}

/* ── P2-11 ────────────────────────────────────────────────────────────────────────────────────────────────── */
console.log('\nP2-11 · de stijl als één regel bij één huisstijl (keuze b)');
{
  ok('de kop is "Je stijl" / "Your style" en de kaarten zitten in een <details> met "Classic · Wijzigen"', /kop=\{wkStijlKaarten \? WK\.stijlKort\.kop : WK\.stijl\.kop\}/.test(flow) && /<details class="wk-stijl-vouw">\s*<summary class="wk-stijl-kort">/.test(flow) && /stijlKort: \{ kop: 'Je stijl', wijzig: 'Wijzigen' \}/.test(flow) && /stijlKort: \{ kop: 'Your style', wijzig: 'Change' \}/.test(flow));
  ok('de details sluiten na de kaarten (Classic en de eigen look blijven bereikbaar)', /<\/div>\s*<\/details>\s*\)\}/.test(flow));
  const regel = css.slice(css.indexOf('summary.wk-stijl-kort {'));
  ok('de regel is een pil van 48 px, 15 px tekst, inkt op wit', /min-height: 48px;/.test(regel) && /border-radius: 999px;/.test(regel) && /font: 450 15px\/1\.3/.test(regel) && contrast('#090D0B', '#FFFFFF') >= 4.5);
  ok('focusrand en geen marker van de browser', /summary\.wk-stijl-kort:focus-visible \{ outline: 2px solid var\(--h-blauw\)/.test(css) && /::-webkit-details-marker \{ display: none; \}/.test(css));
}

/* ── P10-02 ───────────────────────────────────────────────────────────────────────────────────────────────── */
console.log('\nP10-02 · een productnaam heeft een grens');
{
  /* integrator I9: de grens staat nu op één plek (attributes.js), voor formulier en server. */
  ok('OrderFlow: PRODUCT_NAAM_MAX (80, uit attributes.js) in cfg', /PRODUCT_NAAM_MAX,\n\} from '\.\.\/\.\.\/data\/attributes\.js';/.test(flow) && /productNaamMax: PRODUCT_NAAM_MAX,/.test(flow)
    && /export const PRODUCT_NAAM_MAX = 80;/.test(lees('src/data/attributes.js')));
  ok('pipeline.js: maxLength op het veld', /input\.maxLength = Number\(cfg\.productNaamMax\) \|\| 80;/.test(pipe));
  ok('het controlescherm breekt lange woorden (overflow-wrap: anywhere)', /\.pl-summary :global\(dd\) \{[^}]*overflow-wrap: anywhere;/.test(flow));
}

/* ── P1-01 ────────────────────────────────────────────────────────────────────────────────────────────────── */
console.log('\nP1-01 · de €1-melding klapt in zolang een €1-blok in beeld is');
{
  const m = functie(inter, 'meldingen');
  ok('na het openen een scroll-luisteraar die section.h-proef in beeld controleert', /const proefBlokInBeeld = \(\) => \[\.\.\.document\.querySelectorAll\('section\.h-proef'\)\]/.test(m) && /window\.addEventListener\('scroll', inklap, \{ passive: true \}\)/.test(m));
  ok('ingeklapt: zonder is-open en inert (Tab slaat hem over), en terug als het blok voorbij is', /el\.inert = true;\s*el\.classList\.remove\('is-open'\);/.test(m) && /el\.inert = false;\s*el\.classList\.add\('is-open'\);/.test(m));
  ok('weggeklikt of gevolgd: de luisteraar ruimt zichzelf op', /if \(meldingOpen !== soort \|\| !el\.isConnected \|\| el\.hidden\) \{\s*window\.removeEventListener\('scroll', inklap\);/.test(m));
  ok('bij een nieuwe ronde (zachte navigatie) eerst de oude luisteraar weg', /if \(meldingInklap\) \{ window\.removeEventListener\('scroll', meldingInklap\); meldingInklap = null; \}/.test(m));
}

/* ── P1-09 ────────────────────────────────────────────────────────────────────────────────────────────────── */
console.log('\nP1-09 · terug van Mollie zonder te betalen: na 20 s "Nog niet betaald"');
{
  ok('de kop in beide talen, als data-ty-title-open', /titleOpen: 'Nog niet betaald\.',/.test(ty) && /titleOpen: 'Not paid yet\.',/.test(ty) && /data-ty-title-open=\{c\.titleOpen\}/.test(ty));
  ok('de zin en de knop in beide talen', /tyOpenNote: 'Mollie heeft nog geen betaling van je\./.test(inter) && /tyOpenCta: 'Betaal nu',/.test(inter) && /tyOpenNote: 'Mollie has no payment from you yet\./.test(inter) && /tyOpenCta: 'Pay now',/.test(inter));
  // verifyPaid met een nagebootste pagina en een klok die meteen afgaat
  const els = {};
  const mk = (naam, extra = {}) => (els[naam] = Object.assign({ textContent: '', dataset: {}, attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, removeAttribute(k) { delete this.attrs[k]; } }, extra));
  const kop = mk('kop', { textContent: 'Je betaling wordt bevestigd.', dataset: { tyTitleOpen: 'Nog niet betaald.', tyTitlePaid: 'Betaald — we gaan aan de slag.' } });
  const balk = mk('balk');
  const stil = mk('stil', { textContent: 'Je factuur komt zo in je mail.', dataset: { tyVerderOnbetaald: 'Na je betaling krijg je de factuur.' } });
  const noot = mk('noot');
  let knop = null;
  noot.after = (w) => { knop = w; w.remove = () => { knop = null; }; };
  let antwoord = { paid: false, cancelled: false, failed: false, payable: true };
  const d = { tyOpenNote: 'OPEN', tyOpenCta: 'Betaal nu', tyRetryCta: 'Opnieuw betalen', tyPaidNote: 'Betaald.', tyCheckingSlow: 'traag', tyCheckingSlowPay: 'traag+knop' };
  const tijden = [];
  const ctx = {
    document: {
      querySelector: (s) => (s === '[data-ty-title]' ? kop : s === '[data-ty-bar]' ? balk : s === '[data-ty-verder-stil]' ? stil : (s === '.ty-pay-cta' || s === '.ty-pay-cta[data-ty-open-knop]') ? knop : null),
      createElement: () => ({ dataset: {}, attrs: {}, append() {}, setAttribute(k, v) { this.attrs[k] = v; }, insertAdjacentHTML() {} }),
    },
    window: { setTimeout: (f, ms) => { tijden.push(ms); f(); } },
    location: { search: '?paid=VIS-TEST-001' },
    URLSearchParams,
    fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve(antwoord) }),
    ikoon: () => '', pageLang: () => 'nl', encodeURIComponent,
  };
  vm.createContext(ctx);
  vm.runInContext(`let tyBetaalbaar = false; ${functie(inter, 'zetBetaalknop')} ${functie(inter, 'zetNogNietBetaald')} ${functie(inter, 'verifyPaid')}; this.verifyPaid = verifyPaid; this.zetNogNietBetaald = zetNogNietBetaald;`, ctx);
  // eerst alleen de eerste vijf vragen (0 + 2 + 3 + 5 + 5 = 15 s): dan nog geen "Nog niet betaald"
  let gezienBij = null;
  const oud = ctx.window.setTimeout;
  ctx.window.setTimeout = (f, ms) => { tijden.push(ms); const som = tijden.reduce((a, b) => a + b, 0); if (gezienBij === null && kop.textContent === 'Nog niet betaald.') gezienBij = som - ms; f(); };
  ctx.verifyPaid('VIS-TEST-001', noot, d);
  await new Promise((r) => setTimeout(r, 50));
  ok('na 20 s open bij Mollie: kop "Nog niet betaald.", de zin, en "Betaal nu"', kop.textContent === 'Nog niet betaald.' && noot.textContent === 'OPEN' && !!knop && knop.attrs['data-ty-open-knop'] === '', `${kop.textContent}|${noot.textContent}|${!!knop}`);
  ok('  niet eerder dan 20 s (de vraag op 20 s zette hem)', gezienBij === 20000, String(gezienBij));
  ok('  "je factuur komt zo" wordt "na je betaling"', stil.textContent === 'Na je betaling krijg je de factuur.');
  ok('  na de minuut blijft "Nog niet betaald" staan (geen "dit duurt langer")', noot.textContent === 'OPEN');
  ctx.window.setTimeout = oud;
  antwoord = { paid: true, cancelled: false, failed: false, payable: false };
  ctx.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve(antwoord) });
  ctx.verifyPaid('VIS-TEST-001', noot, d);
  await new Promise((r) => setTimeout(r, 20));
  ok('komt de betaling toch: "Betaald", de knop weg, de factuurzin terug', kop.textContent === 'Betaald — we gaan aan de slag.' && knop === null && stil.textContent === 'Je factuur komt zo in je mail.', `${kop.textContent}|${!!knop}|${stil.textContent}`);
}

/* ── P6-26 ────────────────────────────────────────────────────────────────────────────────────────────────── */
console.log('\nP6-26 · de proefknoppen bij een gesloten ronde');
{
  const knop = (tekst) => ({ dataset: {}, childNodes: [{ nodeType: 3, textContent: tekst }, { nodeType: 1, textContent: '' }] });
  const run = async (stand, bewaard) => {
    const knoppen = [knop('Probeer VISUAILS · €1'), knop('Zie het eerst')];
    let gevraagd = 0;
    const opslag = { v: bewaard ? JSON.stringify(bewaard) : null, getItem() { return this.v; }, setItem(k, v) { this.v = v; } };
    const ctx = {
      document: { querySelectorAll: (s) => (s === 'a[data-vis-uit][href*="test-sample"]' ? knoppen : []) },
      I18N: { nl: { proefWacht: 'Proef {bedrag} · op de wachtlijst', proefWachtKaal: 'Proef · op de wachtlijst' } },
      pageLang: () => 'nl', sessionStorage: opslag, Date, JSON,
      fetch: () => { gevraagd += 1; return Promise.resolve({ ok: true, json: () => Promise.resolve({ stand }) }); },
    };
    vm.createContext(ctx);
    vm.runInContext(`const PROEF_STAND_SLEUTEL = 'vis-proef-stand'; ${functie(inter, 'proefKnoppenStand')}; proefKnoppenStand();`, ctx);
    await new Promise((r) => setTimeout(r, 20));
    return { knoppen, gevraagd, opslag };
  };
  const dicht = await run('dicht');
  ok('dicht: "Proef €1 · op de wachtlijst" (het bedrag van de knop zelf)', dicht.knoppen[0].childNodes[0].textContent === 'Proef €1 · op de wachtlijst', dicht.knoppen[0].childNodes[0].textContent);
  ok('  een knop zonder bedrag: "Proef · op de wachtlijst"', dicht.knoppen[1].childNodes[0].textContent === 'Proef · op de wachtlijst');
  ok('  het antwoord wordt vijf minuten bewaard', /"stand":"dicht"/.test(dicht.opslag.v));
  const open = await run('open');
  ok('open: de knop blijft "Probeer VISUAILS · €1"', open.knoppen[0].childNodes[0].textContent === 'Probeer VISUAILS · €1');
  const bewaard = await run('open', { stand: 'dicht', at: Date.now() });
  ok('met een bewaard antwoord geen nieuwe vraag', bewaard.gevraagd === 0 && bewaard.knoppen[0].childNodes[0].textContent === 'Proef €1 · op de wachtlijst');
  ok('init() roept het aan', /proefKnoppenStand\(\);/.test(inter.slice(inter.indexOf('export function init()'))));
  ok('geen bedrag getypt in de woorden', /proefWacht: 'Proef \{bedrag\} · op de wachtlijst'/.test(inter) && /proefWacht: 'Sample \{bedrag\} · join the waitlist'/.test(inter));
}

/* ── P9-08 ────────────────────────────────────────────────────────────────────────────────────────────────── */
console.log('\nP9-08 · een afgebroken overgang is geen scriptfout');
{
  ok('pageswap en pagereveal: de beloften van de overgang afgevangen', /window\.addEventListener\('pageswap', vangOvergang\);/.test(inter) && /window\.addEventListener\('pagereveal', vangOvergang\);/.test(inter) && /\['ready', 'finished', 'updateCallbackDone'\]/.test(inter));
  ok('alleen deze afbreekmelding wordt stil gelaten', /\/Transition was aborted\|ViewTransition\|transition was skipped\/i/.test(inter) && /r\.name === 'AbortError' \|\| r\.name === 'InvalidStateError'/.test(inter));
  // en hij doet het ook: een nagebootste afwijzing
  const lijst = {};
  const ctx = { window: { addEventListener: (t, f) => { lijst[t] = f; } } };
  vm.createContext(ctx);
  const blok = inter.slice(inter.indexOf('const vangOvergang = '), inter.indexOf('// Signing in to the gate'));
  vm.runInContext(blok, ctx);
  let stil = false;
  lijst.unhandledrejection({ reason: { name: 'AbortError', message: 'Transition was aborted because of invalid state. ViewTransition opt-in disabled' }, preventDefault: () => { stil = true; } });
  let ander = false;
  lijst.unhandledrejection({ reason: { name: 'TypeError', message: 'x is undefined' }, preventDefault: () => { ander = true; } });
  ok('  de melding van P9-08 stil, een andere fout niet', stil && !ander);
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
