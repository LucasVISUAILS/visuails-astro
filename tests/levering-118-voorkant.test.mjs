/* VISUAILS — levering 118 (17 november 2026), integratie IB: de overdrachten van de zeven bouwers aan de voorkant.
 *
 *   node tests/levering-118-voorkant.test.mjs     (geen build nodig: leest de bron, rekent met de data en draait twee
 *                                                  functies uit interactions.js met een nagebootste pagina)
 *
 * Wat hier bewaakt wordt, per proefronde:
 *   P2-10  de dienst heet Catalog in StartHal en OrderFlow; "fotolijst" is weg;
 *   P2-12  wat één product kost, direct onder het vanaf-bedrag op /start, /catalog en /lifestyle;
 *   P8-06  OrderFlow leest de ene voorrangszin uit pricing.js (voorrangBelofte / voorrangZin);
 *   L-16   die zin, het formulier en de voorwaarden zeggen "betaling én al je foto's";
 *   P8-08  voorrangTip() op /start, /catalog, /lifestyle en de voorpagina;
 *   P6-06/P6-18  AI-regel en tevredenheidsregel op /lifestyle, /video, de videostijl, /editions en /custom-models;
 *   P6-07  de voorpagina zegt "je mag ze overal gebruiken" in plaats van "zijn van jou";
 *   P1-03  de proefpagina noemt het bedrag met btw uit quoteTestSample();
 *   P1-10  de bedankpagina kijkt eerst naar geannuleerd en dan pas naar betaald; ?proef=al heeft een eigen blok;
 *   P4-08  een kader data-form-refusal="rate" op elk formulier naar /api/order, zonder dubbele zin erboven;
 *   P3-08  pipeline.js stuurt de extra beelden mee naar /api/capacity;
 *   L-07   PlanPicker: de inlogcode bij het e-mailveld, met een los formulier naar /account/code;
 *   D1-05  één korte kop in HalProef; P2-01 "Meten toestaan" (ui.js en LIVE-STAPPEN); T1-07 de lookpagina;
 *   T1-03  de vier voorbeeldbeelden op de proefpagina lazy; P9-09 de uitleg bij de uploadgrens;
 *   P4-09  de merkmodeltermijn uit termijnen.js op /custom-models, het formulier en de bedankpagina;
 *   P10-04 het cookiebeleid noemt vis-bestelling-s3; W1-02 de lichte chip in public/admin.css.
 */
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import {
  eenProductRegel, euro, voorrangBelofte, voorrangZin, voorrangTip, VOORRANG_COPY, AFTERCARE,
} from '../src/data/pricing.js';
import { AI_REGEL } from '../src/data/styles.js';
import { quoteTestSample } from '../src/lib/quote.js';
import * as TERMIJNEN from '../src/data/termijnen.js';
import { ui } from '../src/i18n/ui.js';

let pass = 0, fail = 0;
const ok = (naam, v, extra = '') => { if (v) { pass++; console.log(` ok   ${naam}`); } else { fail++; console.log(` FAIL ${naam} ${extra}`); } };
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const C = (n) => lees(`src/components/${n}.astro`);

/* Eén functie op het hoogste niveau uit een scriptbestand, op haakjes geteld. */
function functie(bron, naam) {
  const start = bron.indexOf(`function ${naam}(`);
  if (start < 0) throw new Error(`geen functie ${naam}`);
  let i = bron.indexOf('{', start), diep = 0;
  for (; i < bron.length; i++) {
    if (bron[i] === '{') diep++;
    else if (bron[i] === '}' && --diep === 0) return bron.slice(start, i + 1);
  }
  throw new Error(`functie ${naam} loopt niet af`);
}

const flow = C('order/OrderFlow');
const pipe = lees('src/scripts/pipeline.js');
const inter = lees('src/scripts/interactions.js');

console.log('\nP2-10 · één naam: Catalog');
ok('OrderFlow: geen "Catalog set(s)" of "Catalogset(s)" meer als naam', !/'Catalog ?sets?\.?'/.test(flow), (flow.match(/'Catalog ?sets?\.?'/g) || []).join(', '));
ok('OrderFlow: geen "fotolijst" meer in een zin (alleen nog in de uitlegregel)', !/uit je fotolijst/.test(flow) && /Kies de foto opnieuw uit je foto’s of je map\./.test(flow));
const start = C('StartHal');
ok('StartHal: de tegel heet Catalog (NL en EN), niet Productfoto’s / Product photos', (start.match(/naam: 'Catalog'/g) || []).length === 2 && !/naam: 'Productfoto’s'|naam: 'Product photos'/.test(start));

console.log('\nP2-12 · wat één product kost, direct onder het vanaf-bedrag');
ok('StartHal: per dienst eenProductRegel(lang, [id]) in de groep', /ladder: eenProductRegel\(lang, \[id\]\)/.test(start));
ok('  onder het tarief in de groep én op elke lookkaart', (start.match(/<p class="h-st-tarief-uitleg" data-vis-klant="niet-abonnee">\{g\.ladder\}<\/p>/g) || []).length === 2);
ok('  en in de tegel van stap 1 (NL en EN, catalog en lifestyle)', (start.match(/uitleg: eenProductRegel\('(nl|en)', \['(catalog|lifestyle)'\]\)/g) || []).length === 4 && /class="st2-uitleg"/.test(start));
ok('  de stijl staat in start-126.css (13,5 px, grijs uit de tokens)', /\.hal \.h-st-tarief-uitleg \{[^}]*var\(--h-t-fijn\)[^}]*var\(--h-inkt-3\)/.test(lees('src/styles/start-126.css')));
for (const [n, k] of [['CatalogHal', 'catalog'], ['LifestyleHal', 'lifestyle']]) {
  const b = C(n);
  /* levering 118 (17 november 2026, P2-12, hersteller H): een spatie vóór de <br> (regelafbreking.test) en in het NL de
     hoofdletters-variant ("Één", korte-zinnen.test): de feiten staan in hoofdletters. */
  ok(`${n}: het eerste feit draagt eenProductRegel(…, ['${k}']) in beide talen`, (b.match(new RegExp(`per product · \\$\\{ex\\} <br>\\$\\{eenProductRegel\\('(nl|en)', \\['${k}'\\](, \\{ hoofdletters: true \\})?\\)\\}`, 'g')) || []).length === 2);
  ok(`${n}: niet nog eens als eerste zin van de prijsband`, !new RegExp(`prijsRegel: \`\\$\\{eenProductRegel`).test(b));
}
ok('de regel zelf klopt los gelezen (NL catalog)', /^Eén product kost .+; vanaf \d+ producten .+ per product\.$/.test(eenProductRegel('nl', ['catalog'])), eenProductRegel('nl', ['catalog']));

console.log('\nP8-06 en L-16 · één voorrangszin, vanaf betaling én foto’s');
ok('voorrangBelofte NL noemt betaling én al je foto’s, Nederlandse tijd en de werkdag daarna', /betaling én al je foto’s/.test(voorrangBelofte('nl')) && /\(Nederlandse tijd\)/.test(voorrangBelofte('nl')) && /anders de werkdag daarna/.test(voorrangBelofte('nl')), voorrangBelofte('nl'));
ok('voorrangBelofte EN idem', /your payment and all your photos are in/.test(voorrangBelofte('en')) && /\(Dutch time\)/.test(voorrangBelofte('en')), voorrangBelofte('en'));
ok('VOORRANG_COPY.line draagt hem nog (NL en EN)', VOORRANG_COPY.nl.line.includes(voorrangBelofte('nl')) && VOORRANG_COPY.en.line.includes(voorrangBelofte('en')));
ok('OrderFlow importeert voorrangZin en voorrangBelofte uit pricing.js', /import \{[^}]*voorrangZin, voorrangBelofte \} from '\.\.\/\.\.\/data\/pricing\.js';/.test(flow));
ok('  sum.voorrangJa = voorrangZin() in beide talen', /voorrangJa: voorrangZin\('nl'\)/.test(flow) && /voorrangJa: voorrangZin\('en'\)/.test(flow));
ok('  wanneer.voorrang en de zin in stap 1 lezen voorrangBelofte()', (flow.match(/\$\{voorrangBelofte\('(nl|en)'\)\}/g) || []).length === 4);
ok('  geen eigen getypte voorrangsbelofte meer', !/vóór \$\{VOORRANG\.bestelVoorUur\}:00 binnen, dan/.test(flow) && !/before \$\{VOORRANG\.bestelVoorUur\}:00, we deliver/.test(flow));
ok('voorrangZin() zonder datum zegt hetzelfde', voorrangZin('nl') === `Voorrang — ${voorrangBelofte('nl')}`);
ok('voorwaarden NL: de termijn loopt vanaf betaling én foto’s', /Zijn je betaling én al je foto’s op een werkdag vóór \{VOORRANG\.bestelVoorUur\}:00 binnen/.test(lees('src/pages/nl/terms.astro')));
ok('voorwaarden EN idem', /Once your payment and all your photos are in on a working day before \{VOORRANG\.bestelVoorUur\}:00/.test(lees('src/pages/terms.astro')));

console.log('\nP8-08 · voorrang bij de levertijd');
ok('voorrangTip() heeft bedragen en grens uit VOORRANG', /\+20%/.test(voorrangTip('nl')) && /tot 9 producten/.test(voorrangTip('nl')), voorrangTip('nl'));
ok('/start: voorrangTip(lang) onderaan bij de prijsregel', /<p class="h-st-btw">\{voorrangTip\(lang\)\}<\/p>/.test(start));
for (const n of ['CatalogHal', 'LifestyleHal']) ok(`${n}: in de levertijdregel (NL en EN)`, /een vaste leverdatum\. \$\{voorrangTip\('nl'\)\}/.test(C(n)) && /a fixed delivery date\. \$\{voorrangTip\('en'\)\}/.test(C(n)));
const voor = C('VoorpaginaHal');
ok('voorpagina: onder de levertijd in de slotkaart', /<p class="r105-slotregel">\{LEVERTIJD\}\.<\/p>\s*\{\/\*[^*]*\*\/\}\s*<p class="r105-voorrang">\{voorrangTip\(lang\)\}<\/p>/.test(voor));
ok('  wit op inkt, 15 px (voorpagina-105.css)', /\.r105-voorrang \{[^}]*font: 450 15px[^}]*color: #FFFFFF/.test(lees('src/styles/voorpagina-105.css')));

console.log('\nP6-07 · een licentie, geen eigendom, op de voorpagina');
ok('NL: "Je mag de beelden overal gebruiken, voor altijd"', /Je mag de beelden overal gebruiken, voor altijd, en niemand anders krijgt ze/.test(voor) && !/De beelden zijn van jou/.test(voor));
ok('EN: "You may use the visuals anywhere, for ever"', /You may use the visuals anywhere, for ever, and nobody else gets them/.test(voor) && !/The visuals are yours/.test(voor));

console.log('\nP6-06 en P6-18 · AI en wat als het tegenvalt, bij de bestelknop');
ok('/lifestyle: AI_REGEL.look', /\{AI_REGEL\.look\[lang\]\}/.test(C('LifestyleHal')));
for (const n of ['VideoHal', 'VideoStyleHal']) ok(`${n}: AFTERCARE en AI_REGEL.look`, /\{AFTERCARE\[lang\]\} \{AI_REGEL\.look\[lang\]\}/.test(C(n)));
ok('EditionsHal: AI_REGEL.modellen (geen product van de klant) en AFTERCARE', /\{AI_REGEL\.modellen\[lang\]\} \{AFTERCARE\[lang\]\}/.test(C('EditionsHal')));
ok('BrandModelHal: het onderschrift zegt dat deze mensen niet bestaan', /\{c\.castNote\} \{AI_REGEL\.modellen\[lang\]\}/.test(C('BrandModelHal')));
ok('de regels zelf bestaan in beide talen', !!(AI_REGEL.look.nl && AI_REGEL.look.en && AI_REGEL.modellen.nl && AFTERCARE.nl && AFTERCARE.en));

console.log('\nP1-03 · de €1-proef met btw vóór betalen');
const ts = C('TestSampleHal');
const bruto = quoteTestSample().grossCents / 100;
ok(`de som geeft ${euro(bruto, 'nl')} incl. btw`, quoteTestSample().grossCents === 121, String(quoteTestSample().grossCents));
ok('de fijne druk leest quoteTestSample() in beide talen', (ts.match(/\$\{euro\(quoteTestSample\(\)\.grossCents \/ 100, '(nl|en)'\)\} \$\{vatLabel\('incl', '(nl|en)'\)\}/g) || []).length === 2 && /import \{ quoteTestSample \} from '\.\.\/lib\/quote\.js';/.test(ts));
ok('T1-03: de vier voorbeeldbeelden lazy', !/loading="eager"/.test(ts) && /alt=\{b\.alt\} loading="lazy"/.test(ts));

console.log('\nP1-10 · de bedankpagina: eerst geannuleerd, dan betaald');
const ty = C('ThankYouPage');
ok('de annuleringskop zegt "Je proef is geannuleerd" / "Your test sample has been cancelled"', /cancelled: 'Je proef is geannuleerd'/.test(ty) && /cancelled: 'Your test sample has been cancelled'/.test(ty));
ok('?proef=al: een eigen blok met kop, zonder betaalknop', /data-ty-proef-al role="status"/.test(ty) && /data-ty-title-proef-al=\{c\.titleProefAl\}/.test(ty) && /proefAlP: 'Voor je bedrijf is al een proef gemaakt\. Er is niets afgeschreven\.'/.test(ty));
{
  /* verifyPaid() in een nagebootste pagina: een tweede proef is betaald én geannuleerd. */
  const kop = { textContent: 'Je betaling wordt bevestigd.', dataset: { tyTitlePaid: 'Betaald — we gaan aan de slag.' } };
  const balk = { removeAttribute() {}, setAttribute() {} };
  const noot = { textContent: '' };
  const antwoord = { paid: true, cancelled: true, kind: 'sample-duplicate', payable: false, failed: false };
  const ctx = {
    document: { querySelector: (s) => (s === '[data-ty-title]' ? kop : s === '[data-ty-bar]' ? balk : null) },
    window: { setTimeout: (f) => f() },
    location: { search: '?paid=VIS-TEST-001' },
    URLSearchParams,
    fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve(antwoord) }),
    tyBetaalbaar: false,
  };
  vm.createContext(ctx);
  vm.runInContext(`${functie(inter, 'verifyPaid')}; this.verifyPaid = verifyPaid;`, ctx);
  ctx.verifyPaid('VIS-TEST-001', noot, { tyPaidNote: 'Betaald.' });
  await new Promise((r) => setTimeout(r, 20));
  ok('verifyPaid: betaald én geannuleerd zet de kop NIET op "Betaald"', kop.textContent === 'Je betaling wordt bevestigd.' && noot.textContent === '', kop.textContent);
  antwoord.cancelled = false;
  ctx.verifyPaid('VIS-TEST-001', noot, { tyPaidNote: 'Betaald.' });
  await new Promise((r) => setTimeout(r, 20));
  ok('  en alleen betaald wel', kop.textContent === 'Betaald — we gaan aan de slag.', kop.textContent);
}
ok('initThankYou: ?proef=al komt vóór de betaalknop', inter.indexOf("params.get('proef') === 'al'") > 0 && inter.indexOf("params.get('proef') === 'al'") < inter.indexOf("const pay = molliePayUrl(params.get('pay'));"));

console.log('\nP4-08 · te vaak verstuurd: een kader in plaats van een witte pagina');
ok('OrderFlow: kader rate met de WhatsApp- en mailweg', /data-form-refusal="rate"[^>]*>\s*\{f\.s3\.refuseRate\}/.test(flow));
ok('  refuseRate in NL en EN, met "niets afgeschreven" / "nothing was charged"', /refuseRate: 'Je hebt in korte tijd vaak verstuurd, [^']*niets afgeschreven/.test(flow) && /refuseRate: 'You sent this form many times[^']*nothing was charged/.test(flow));
ok('ContactHal: kader rate', /data-form-refusal="rate"[^>]*>\s*\{c\.weigerRate\}/.test(C('ContactHal')) && (C('ContactHal').match(/weigerRate: '/g) || []).length === 2);
for (const n of ['order/HoldingPage', 'BrandModelBrief']) ok(`${n}: kader rate vóór het formulier, NL en EN`, /<p class="form-terug" data-form-refusal="rate" role="status" tabindex="-1" hidden>/.test(C(n)) && /niets afgeschreven/.test(C(n)) && /nothing was charged/.test(C(n)));
ok('interactions.js: geen tweede zin erboven als er een eigen kader is', /eigenKader = !!document\.querySelector\(`\[data-form-refusal="\$\{CSS\.escape\(code\)\}"\]`\)/.test(inter) && /if \(!eigenZin && !eigenKader &&/.test(inter));

console.log('\nP3-08 · de extra hoeken gaan mee naar de agenda');
ok('runGate: &extras= uit extrasCount() (dezelfde telling als de prijs)', /const extras = extrasCount\(\);/.test(functie(pipe, 'runGate')) && /\/api\/capacity\?products=\$\{encodeURIComponent\(products\)\}&tier=attended\$\{svcDeel\}\$\{vanaf\}\$\{extrasDeel\}/.test(functie(pipe, 'runGate')));
ok('  en opnieuw vragen als een hoek wisselt terwijl de datums in beeld staan', /if \(\/\^angle_\(\?!note_\)\/\.test\(n\) && GATE_STEP !== null && current === GATE_STEP\) runGate\(\);/.test(pipe));

console.log('\nL-07 · de inlogcode bij het e-mailveld');
const pp = C('order/PlanPicker');
ok('een los formulier naar /account/code (geen formulier in een formulier)', /<form id="ps-codeform" method="post" action="\/account\/code" data-ps-codeform><\/form>\s*<form method="post" action="\/api\/plan"/.test(pp));
ok('  code, e-mail en taal horen er via form="ps-codeform" bij', /name="code" form="ps-codeform"/.test(pp) && /name="email" value="" form="ps-codeform"/.test(pp) && /name="lang" value=\{lang\} form="ps-codeform"/.test(pp) && /type="submit" form="ps-codeform"/.test(pp));
ok('  het blok staat direct onder het e-mailveld (na de rij met e-mail en telefoon)', pp.indexOf('data-ps-inlogcode') > pp.indexOf('data-ps-email') && pp.indexOf('data-ps-inlogcode') < pp.indexOf('class="ps-voorkeur"'));
ok('  de zin in NL en EN', /We stuurden je net een inlogmail met een code\./.test(pp) && /We just sent you a sign-in email with a code\./.test(pp));
ok('  het script toont hem bij ?fout=account&inlog=verstuurd en vult het adres in', /reden === 'account' && inlog && new URLSearchParams\(location\.search\)\.get\('inlog'\) === 'verstuurd'/.test(pp) && /if \(h\) h\.value = waarde;/.test(pp));
ok('  de knop heeft een rol (tests/knoppen)', /<button class="knop knop-lijn" data-rol="doorgaan" type="submit" form="ps-codeform">/.test(pp));

console.log('\nD1-05, P2-01, T1-07, P9-09');
ok('HalProef: één korte kop "Eerst zien?" / "See it first?"', /\{nl \? 'Eerst' : 'See it'\}<\/span> <span class="d">\{nl \? 'zien\?' : 'first\?'\}/.test(C('HalProef')) && !/\{kop\[0\]\}/.test(C('HalProef')));
ok('ui.js: Meten toestaan / Allow measuring, en Meten / Measuring', ui.nl.cc_accept === 'Meten toestaan' && ui.en.cc_accept === 'Allow measuring' && ui.nl.cc_ana_h === 'Meten' && ui.en.cc_ana_h === 'Measuring');
ok('LIVE-STAPPEN noemt de knop zoals hij heet', (lees('kladblok/LIVE-STAPPEN.md').match(/\*\*Meten toestaan\*\*/g) || []).length === 2 && !/Analytics accepteren/.test(lees('kladblok/LIVE-STAPPEN.md')));
ok('LookDetailHal: een paar krijgt tabindex en een naam', /tabindex=\{paar \? 0 : undefined\} aria-label=\{paar \? \(nl \? 'Voorbeelden\. Schuif met de pijltjestoetsen\.'/.test(C('LookDetailHal')));
const pu = C('order/ProductUploader');
ok('ProductUploader: de uploadgrens noemt een paar bestellingen op één dag, NL en EN', /Na een paar bestellingen op één dag/.test(pu) && /After a few orders on one day/.test(pu) && (pu.match(/limietBody:/g) || []).length === 2);

console.log('\nP4-09 · de merkmodeltermijn');
const N = Number(TERMIJNEN.MERKMODEL_RICHTINGEN_WERKDAGEN);
ok(`termijnen.js: MERKMODEL_RICHTINGEN_WERKDAGEN is een getal (${N})`, Number.isInteger(N) && N > 0);
ok('/custom-models (BrandModelHal): de stap Richtingen noemt de termijn, NL en EN', (C('BrandModelHal').match(/\$\{MERKMODEL_RICHTINGEN_WERKDAGEN\} (werkdagen|working days)/g) || []).length === 2);
ok('het merkmodelformulier (stap 5): de eerste stap noemt de termijn, NL en EN', (C('BrandModelBrief').match(/\$\{MERKMODEL_RICHTINGEN_WERKDAGEN\} (werkdagen|working days)/g) || []).length === 2);
ok('de bedankpagina (merkmodel): idem', (ty.match(/\$\{MERKMODEL_RICHTINGEN_WERKDAGEN\} (werkdagen|working days)/g) || []).length === 2);

console.log('\nP10-04 en W1-02');
ok('cookiebeleid NL en EN noemen vis-bestelling-s3', /<code>vis-bestelling-s3<\/code>/.test(lees('src/pages/nl/cookie-policy.astro')) && /<code>vis-bestelling-s3<\/code>/.test(lees('src/pages/cookie-policy.astro')));
ok('  en dat is de sleutel die pipeline.js gebruikt', /sessionStorage\.setItem\('vis-bestelling-s3'/.test(pipe));
ok('public/admin.css: .pl-chip.is-voorlopig gestippeld, zonder vlak', /\.pl-chip\.is-voorlopig \{ border-style: dotted; background: transparent; \}/.test(lees('public/admin.css')));

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
