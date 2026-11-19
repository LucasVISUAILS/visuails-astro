/*
 * LEVERING 118 · /start, /plans, DE €1-PROEF EN DE KIEZERS (bouwer BD)
 * 17 november 2026
 *
 *   node tests/levering-118-start-plans.test.mjs        (geen build nodig: leest de bron en rekent met pricing.js)
 *
 * P1-11  wachtlijst: bij een dichte proef het blok bovenaan, na aanmelden in beeld en de focus op de uitkomst
 * P4-02  /start stap 2 video: de kaart is de keuze (/start/video/?style=…), "Bekijk" klein eronder
 * L-06   abonnementsformulier: het vinkje "geen btw-nummer" krijgt geen veldstijl meer
 * P1-05  "Gekozen" bij de look: inkt met witte tekst, contrast gemeten
 * P10-07 terug uit het formulier: de stap volgt de hash (data-stap), niet alleen :target
 * L-08   12 maanden vooruit: "Wat er nu gebeurt" noemt geen machtiging
 * P11-04 stapwissel in /start: focus naar de kop van de nieuwe stap, die kop is niveau 1
 * P3-03  /plans noemt het eigen aantal credits met het vanaf-bedrag uit de code
 * P2-02  /start bij 200 % zoom: onder 300 px stapelt de tegel, chips lopen niet buiten beeld
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { euro, customCreditsTotal, CUSTOM_CREDITS_MIN, CUSTOM_CREDITS_MAX, vatLabel } from '../src/data/pricing.js';
import { videoOpPagina } from '../src/data/videoStyles.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const lees = (p) => readFileSync(ROOT + p, 'utf8');

let pass = 0;
let fail = 0;
function ok(name, cond, extra = '') {
  if (cond) pass++; else fail++;
  console.log(`${cond ? ' ok  ' : ' FAIL'} ${name}${cond || !extra ? '' : ` — ${extra}`}`);
}
console.log('\nVISUAILS — levering 118, bouwer BD: /start, /plans, proef en kiezers\n');

/* contrast volgens WCAG */
const lum = (hex) => {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const start = lees('src/components/StartHal.astro');
const css = lees('src/styles/start-126.css');
const picker = lees('src/components/order/PlanPicker.astro');
const style = lees('src/components/order/StylePicker.astro');
const plans = lees('src/components/PlansHal.astro');
const proef = lees('src/components/TestSampleHal.astro');
const hal = lees('src/styles/hal.css');

/* ── P1-05 ── */
console.log('P1-05 · "Gekozen" bij de look');
{
  const blok = (style.match(/\.look-gekozen \{[\s\S]*?\n {2}\}/) || [''])[0];
  ok('de pil is inkt', /background: var\(--ink\)/.test(blok), blok);
  ok('de tekst is wit, niet --accent (in de hal gelijk aan de inkt)', /color: #fff;/.test(blok) && !/color: var\(--accent\)/.test(blok), blok);
  const inkt = (hal.match(/--h-inkt: (#[0-9A-Fa-f]{6})/) || [])[1];
  const c = inkt ? contrast('#FFFFFF', inkt) : 0;
  ok(`wit op de inkt van de hal (${inkt}) haalt ≥ 4,5 : 1 (gemeten ${c.toFixed(2)} : 1)`, c >= 4.5);
}

/* ── L-06 ── */
console.log('\nL-06 · het vinkje "Ik heb geen btw-nummer"');
{
  ok('de veldstijl raakt geen checkbox meer', /\.ps-veld input:not\(\[type=checkbox\]\), \.ps-veld select \{/.test(picker));
  ok('geen kale ".ps-veld input" meer in de CSS (ook niet bij focus of op de telefoon)', !/\.ps-veld input[,: {]/.test(picker.replace(/\.ps-veld input:not\(\[type=checkbox\]\)/g, '')));
  ok('het vinkje staat nog in het btw-veld', /<label class="ps-consent ps-klein" data-ps-geenbtw>\s*<input type="checkbox" name="no_vat"/.test(picker));
}

/* ── L-08 ── */
console.log('\nL-08 · 12 maanden vooruit: geen machtiging in "Wat er nu gebeurt"');
{
  const nlV = (picker.match(/nuVooruit: '([^']+)'/g) || []).map((m) => m.slice(12, -1));
  ok('een vooruitzin in NL en EN', nlV.length === 2, JSON.stringify(nlV));
  ok('NL: het hele jaar nu, geen machtiging', /hele jaar nu via Mollie\. Er is geen machtiging\./.test(nlV[0] || ''));
  ok('EN: the whole year now, no mandate', /whole year now through Mollie\. There is no mandate\./.test(nlV[1] || ''));
  ok('de eerste regel heeft een maand- en een vooruitvorm', /<li class="ps-nu-maand">\{z\}<\/li><li class="ps-nu-vooruit" data-ps-nu-vooruit>\{c\.nuVooruit\}<\/li>/.test(picker));
  ok('zonder :has() alleen de maandzin (vooruit verborgen)', /\.ps-nu-vooruit \{ display: none; \}/.test(picker));
  ok('met vooruit (en niet op maat): vooruitzin aan, maandzin en de noot over de machtiging uit',
    /:has\(\[name="term"\]\[value="prepaid"\]:checked\):not\(:has\(\[name="plan"\]\[value="maat"\]:checked\)\) \.ps-nu-vooruit \{ display: list-item; \}/.test(picker)
    && /value="prepaid"\]:checked\):not\(:has\(\[name="plan"\]\[value="maat"\]:checked\)\) li\.ps-nu-maand \{ display: none; \}/.test(picker)
    && /value="prepaid"\]:checked\):not\(:has\(\[name="plan"\]\[value="maat"\]:checked\)\) span\.ps-nu-maand \{ display: none; \}/.test(picker));
  ok('de regel bij de knop zegt nog steeds: daarna niets meer af', /Daarna schrijven we niets meer af/.test(picker));
}

/* ── P3-03 ── */
console.log('\nP3-03 · /plans: je eigen aantal credits, vanaf-bedrag uit de code');
{
  ok('maatVanaf = customCreditsTotal(CUSTOM_CREDITS_MIN).total, zoals /pricing',
    /const maatVanaf = customCreditsTotal\(CUSTOM_CREDITS_MIN\)\.total;/.test(plans) && /const maatVanaf = customCreditsTotal\(CUSTOM_CREDITS_MIN\)\.total;/.test(lees('src/components/PricingHal.astro')));
  const zinnen = (plans.match(/maatBespreek: `[^`]+`/g) || []);
  ok('een zin in EN en NL', zinnen.length === 2);
  ok('geen getypt bedrag of aantal in de zin', zinnen.every((z) => !/€\s?\d|\b\d{2,}\b/.test(z)) && zinnen.every((z) => z.includes('${e(maatVanaf)}') && z.includes('${CUSTOM_CREDITS_MIN}') && z.includes('${CUSTOM_CREDITS_MAX}')), zinnen.join(' | '));
  ok('de zin staat in de regel "Bespreek met ons" (#op-maat, met de vlag uit)', /id="op-maat" data-k14-bespreek><span>\{bespreek\.zin\} \{c\.maatBespreek\}<\/span> <a class="h-knop k k-lijn" data-rol="contact"/.test(plans));
  ok('geen link naar het abonnement op maat met de vlag uit (lijst 85, K-14)', !/plan=maat|\$\{CUSTOM_MONTH_ID\}#maat-credits[^]*data-k14-bespreek/.test(plans.slice(plans.indexOf('data-k14-bespreek'))));
  const bedrag = euro(customCreditsTotal(CUSTOM_CREDITS_MIN).total, 'nl');
  console.log(`      (zo leest hij nu: "Een eigen aantal credits per maand kan ook: van ${CUSTOM_CREDITS_MIN} tot ${CUSTOM_CREDITS_MAX}, vanaf ${bedrag} per maand ${vatLabel('excl', 'nl')}.")`);
}

/* ── P1-11 ── */
console.log('\nP1-11 · wachtlijst bij een dichte proef');
{
  ok('de uitkomsten zijn focusbaar (tabindex -1)', /data-ts-wacht="ok" role="status" tabindex="-1" hidden/.test(proef) && /data-ts-wacht=\{k\} role="alert" tabindex="-1" hidden/.test(proef));
  const toon = proef.slice(proef.indexOf('function toon('), proef.indexOf('function proefStand('));
  ok('bij "dicht" komt het blok vóór de €1-kop', /if \(stand === 'dicht'\) \{\s*const opening = document\.querySelector<HTMLElement>\('\.h-ts-open'\);\s*if \(opening && opening\.previousElementSibling !== blok\) opening\.before\(blok\);/.test(toon));
  const i0 = toon.indexOf('blok.hidden = false');
  const i1 = toon.indexOf('window.scrollTo(');
  const i2 = toon.indexOf('melding.focus({ preventScroll: true })');
  ok('na het tonen: scrollen tot onder de balk, dan de focus op de uitkomst', i0 > 0 && i1 > i0 && i2 > i1);
  ok('één keer per bezoek (toon() loopt twee keer)', /!blok\.dataset\.tsGetoond/.test(toon) && /blok\.dataset\.tsGetoond = '1'/.test(toon));
  ok('de balk wordt gemeten, niet gegokt', /querySelector<HTMLElement>\('\.site-header'\)/.test(toon) && /getBoundingClientRect\(\)\.bottom/.test(toon));
}

/* ── P4-02 ── */
console.log('\nP4-02 · /start stap 2 video: de kaart is de keuze');
{
  ok('de kaart gaat naar de aanvraag met ?style=', /<a class="h-st-vk-a" href=\{`\$\{lp\(door\('video'\)!\.bestel\)\}\?style=\$\{encodeURIComponent\(v\.slug\)\}`\}/.test(start));
  ok('"Bekijk" is een kleine link onder de kaart, naar de infopagina', /<a class="st2-vk-bekijk" href=\{lp\(`\/video\/\$\{v\.slug\}`\)\}>\{c\.videoMeer\}<span class="sr-only"> \{v\.naam\}<\/span><\/a>/.test(start));
  ok('op de kaart staat "Kies deze stijl" / "Pick this style"', /videoKies: 'Pick this style'/.test(start) && /videoKies: 'Kies deze stijl'/.test(start) && /\{c\.videoKies\}/.test(start));
  const hold = lees('src/components/order/HoldingPage.astro');
  ok('de aanvraag heeft dezelfde stijlen in zijn keuzelijst (videoOpPagina)', /import \{ videoOpPagina as videoStylesEn \} from '\.\.\/\.\.\/data\/videoStyles\.js'/.test(hold) && /<option value=\{v\.slug\}>/.test(hold) && videoOpPagina.length > 0);
  ok('en ?style= kiest hem voor (initAanvraagKeuze)', /zet\('select#h-style', q\.get\('style'\)\)/.test(lees('src/scripts/interactions.js')));
  ok('de knop "Vraag een video aan" blijft voor wie nog niet weet welke stijl', /data-rol="doorgaan" href=\{lp\(door\('video'\)!\.bestel\)\}>\{c\.videoCta\}/.test(start));
  ok('de kaart duwt de link niet uit het li (kolom, height auto)', /html body\.hal \.st2 \.h-st-vk > li \{ display: flex; flex-direction: column;/.test(css) && /html body\.hal \.st2 \.h-st-vk-a \{ height: auto;/.test(css));
}

/* ── P10-07 en P11-04 ── */
console.log('\nP10-07 · P11-04 · de stap volgt de hash, de focus de stap');
{
  const targetRegels = css.split('\n').filter((r) => /:target/.test(r) && /\{ display: none; \}/.test(r));
  ok('elke :target-regel geldt alleen zonder data-stap (zonder script)', targetRegels.length === 5 && targetRegels.every((r) => /\.st2:not\(\[data-stap\]\)/.test(r)), targetRegels.join('\n'));
  ok('de oude ankerregel staat er nog (tests/start-looks)', /:has\(:is\(#catalog,\s?#lifestyle,\s?#video\):target\)/.test(css));
  for (const r of [
    /\.st2\[data-stap="kies"\] :is\(\.h-st-kies, \.h-st-video\) \{ display: none; \}/,
    /\.st2\[data-stap\]:not\(\[data-stap="kies"\]\) \.st2-soort \{ display: none; \}/,
    /\.st2\[data-stap="video"\] \.h-st-kies \{ display: none; \}/,
    /\.st2:is\(\[data-stap="catalog"\], \[data-stap="lifestyle"\]\) \.h-st-video \{ display: none; \}/,
    /\.st2\[data-stap="catalog"\] \.h-st-groep:not\(#catalog\), \.st2\[data-stap="lifestyle"\] \.h-st-groep:not\(#lifestyle\) \{ display: none; \}/,
  ]) ok(`data-stap-regel: ${r.source.slice(0, 60)}…`, r.test(css));

  /* De vier standen nagerekend: welke delen staan er bij elke data-stap? Een klein model van de regels hierboven. */
  const delen = { soort: '.st2-soort', kies: '.h-st-kies', video: '.h-st-video', catalog: '#catalog', lifestyle: '#lifestyle' };
  const zichtbaar = (stap) => {
    const weg = new Set();
    if (stap === 'kies') { weg.add('kies'); weg.add('video'); weg.add('catalog'); weg.add('lifestyle'); }
    else weg.add('soort');
    if (stap === 'video') { weg.add('kies'); weg.add('catalog'); weg.add('lifestyle'); }
    if (stap === 'catalog') { weg.add('video'); weg.add('lifestyle'); }
    if (stap === 'lifestyle') { weg.add('video'); weg.add('catalog'); }
    return Object.keys(delen).filter((d) => !weg.has(d)).sort().join(',');
  };
  ok('#kies → alleen stap 1', zichtbaar('kies') === 'soort');
  ok('#catalog → de looks, alleen catalog', zichtbaar('catalog') === 'catalog,kies');
  ok('#lifestyle → de looks, alleen lifestyle', zichtbaar('lifestyle') === 'kies,lifestyle');
  ok('#video → alleen video', zichtbaar('video') === 'video');

  const script = start.slice(start.indexOf('const STAPPEN'));
  ok('het script zet data-stap uit de hash; een onbekende hash is stap 1', /const stapVan = \(hash: string\) => \{[^}]*STAPPEN\.includes\(h\) \? h : 'kies'; \}/.test(script));
  ok('vóór de wissel van de pagina (astro:before-swap, op het nieuwe document)', /addEventListener\('astro:before-swap', \(e: any\) => \{ if \(e\.newDocument\) zetStap\(e\.to\?\.hash \|\| '', e\.newDocument\); \}\)/.test(script));
  ok('en bij page-load, popstate en een klik op een stap-anker', /'astro:page-load', \(\) => zetStap\(location\.hash\)/.test(script) && /addEventListener\('popstate', \(\) => zetStap\(location\.hash\)\)/.test(script) && /closest\?\.\('\.st2 a\[href\^="#"\]'\)/.test(script));
  /* levering 118 (17 november 2026, N4 P11-04): de focus hing alleen aan hashchange, maar de ClientRouter doet een ankerklik
     met pushState (geen hashchange). Nu doet naarKop() het, vanuit de klik én vanuit hashchange. */
  ok('naarKop(): naar boven en de focus op de kop van de nieuwe stap', /function naarKop\(stap: string\) \{\s*setTimeout\(\(\) => \{\s*scrollTo\(\{ top: 0 \}\);\s*document\.getElementById\(KOP\[stap\]\)\?\.focus\(\{ preventScroll: true \}\);/.test(script));
  ok('  vanuit de klik op een stap-anker (pushState, geen hashchange) en vanuit hashchange', /closest\?\.\('\.st2 a\[href\^="#"\]'\)[\s\S]{0,900}naarKop\(stapVan\(a\.hash\)\)/.test(script) && /addEventListener\('hashchange', \(\) => \{[\s\S]{0,120}naarKop\(stapVan\(location\.hash\)\)/.test(script));
  const KOP = { kies: 'st2-kop', catalog: 'st-g-catalog', lifestyle: 'st-g-lifestyle', video: 'st-video' };
  ok('de kaart met koppen in het script klopt', script.includes(`const KOP: Record<string, string> = { kies: 'st2-kop', catalog: 'st-g-catalog', lifestyle: 'st-g-lifestyle', video: 'st-video' };`));
  ok(`stap 1: <h1 id="${KOP.kies}"> met tabindex -1`, /<h1 id="st2-kop" class="h-kop h-h1" tabindex="-1">/.test(start));
  ok('stap 2 (catalog, lifestyle): de kop is niveau 1 voor de schermlezer en focusbaar', /<h2 id=\{`st-g-\$\{g\.id\}`\} class="h-kop h-h3" aria-level="1" tabindex="-1">/.test(start));
  ok('stap 2 (video): idem', /<h2 id="st-video" class="h-kop h-h3" aria-level="1" tabindex="-1">/.test(start));
  ok('één echte h1 in de bron (tests/paginakeuring)', (start.match(/<h1\b/g) || []).length === 1);
  ok('met de muis geen focusrand op de kop, met het toetsenbord wel', /\[tabindex="-1"\]:focus:not\(:focus-visible\) \{ outline: none; \}/.test(css) && /\[tabindex="-1"\]:focus-visible \{ outline: 2px solid var\(--h-blauw\);/.test(css));
}

/* ── P2-02 ── */
console.log('\nP2-02 · /start bij 200 % zoom');
{
  const blok = (css.match(/@media \(max-width: 300px\) \{[\s\S]*?\n\}/) || [''])[0];
  ok('er is een blok onder 300 px', blok.length > 0);
  ok('de tegel stapelt: één kolom, beeld niet meer over vier rijen', /\.st2-a \{ grid-template-columns: minmax\(0, 1fr\); \}/.test(blok) && /\.st2-beeld \{ grid-row: auto;/.test(blok));
  ok('geen afbreekstreepjes midden in een woord', /hyphens: manual/.test(blok));
  ok('de chips mogen over twee regels en worden niet breder dan de kolom', /\.h-st-chip \{ height: auto; min-height: 40px; max-width: 100%;[^}]*white-space: normal;/.test(blok));
  ok('het blok staat ná het telefoonblok (640 px), zodat het wint', css.indexOf('@media (max-width: 300px)') > css.indexOf('@media (max-width: 640px)'));
  /* gemeten: 390 px op 200 % = 195 px */
  const breed = 195;
  const oud = breed - 2 * 20 - 92 - 16;
  const nieuw = breed - 2 * 16;
  ok(`tekstkolom bij ${breed} px: was ${oud} px, nu ${nieuw} px (≥ 150 px voor "Productfoto's" met pijl)`, oud === 47 && nieuw >= 150);
  const maten = [...blok.matchAll(/font[^;]*?(\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1]));
  ok('geen nieuwe lettermaat onder 17 px buiten 15 / 13,5 / 12 (tests/lettermaten94)', maten.every((m) => m >= 17 || [15, 13.5, 12].includes(m)), maten.join(','));
}
{
  const bek = (css.match(/\.st2-vk-bekijk \{[^}]*\}/) || [''])[0];
  ok('"Bekijk" is 13,5 px in inkt', /font: 600 13\.5px\/1\.3/.test(bek) && /color: var\(--h-inkt\)/.test(bek));
}

console.log(`\n${pass} goed, ${fail} fout`);
process.exit(fail ? 1 : 0);
