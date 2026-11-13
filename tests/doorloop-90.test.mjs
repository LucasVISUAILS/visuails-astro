/**
 * VISUAILS — doorloop 90: wat de test van A tot Z op 8 november 2026 vond (de live site, Studio, /admin en
 * testbestellingen in de Mollie-testmodus), en wat daarvan in de code is rechtgezet.
 *
 *   node tests/doorloop-90.test.mjs        (npm run test:doorloop90; leest de bronnen, geen build nodig)
 *
 * Lucas, 8 november 21:44: "Zoek actief naar problemen, fouten en andere misverstanden die gefixt moeten worden."
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lees = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
let goed = 0, fout = 0;
const ok = (naam, cond, extra = '') => { if (cond) goed++; else fout++; console.log(`${cond ? ' ok  ' : ' FAIL'} ${naam}${cond || !extra ? '' : ` — ${extra}`}`); };

const flow = lees('src/components/order/OrderFlow.astro');
const pipeline = lees('src/scripts/pipeline.js');
const admin = lees('src/lib/admin.js');

/* Een HTML-patroon geldt voor de hele waarde en wordt in Chrome met de vlag v gelezen. */
const alsPatroon = (attr) => new RegExp(`^(?:${attr})$`, 'v');
const patroonVan = (id) => {
  const m = flow.match(new RegExp(`id="${id}"[^>]*?pattern="([^"]+)"`));
  return m ? m[1] : '';
};

console.log('\nB01 · de weigering van een tweede proef noemt ook het KVK-nummer');
{
  ok('NL: e-mailadres, telefoonnummer of KVK-nummer', /op dit e-mailadres, telefoonnummer of KVK-nummer staat er al een\./.test(flow));
  ok('EN: email address, phone number or registration number', /this email address, phone number or registration number already has one\./.test(flow));
  ok('de oude zin is weg', !/this email address or phone number already has one/.test(flow) && !/op dit e-mailadres of telefoonnummer staat/.test(flow));
}

console.log('\nB02 · een e-mailadres zonder .com of .nl komt niet door stap 3');
{
  const p = patroonVan('pl-email');
  ok('het veld heeft een patroon', !!p, 'geen pattern op #pl-email');
  if (p) {
    const re = alsPatroon(p);
    for (const [w, verwacht] of [['hello@visuails', false], ['naam@gmail', false], ['x@y.c', false], ['hello@visuails.com', true], ['a.b@c.co.uk', true], ['test+claude@merk.nl', true]]) {
      ok(`  ${w} → ${verwacht ? 'goed' : 'fout'}`, re.test(w) === verwacht);
    }
  }
  ok('een eigen zin voor de vorm, NL en EN', /emailVorm: 'Dit e-mailadres lijkt niet compleet\./.test(flow) && /emailVorm: 'This email address looks incomplete\./.test(flow));
  ok('het veld draagt die zin', /id="pl-email"[^>]*data-pl-err-vorm=\{f\.s3\.emailVorm\}/.test(flow));
  ok('pipeline kiest de vormzin bij patternMismatch of typeMismatch', /function foutTekst\(veld\)/.test(pipeline) && /v\.patternMismatch \|\| v\.typeMismatch\) && veld\.dataset\.plErrVorm/.test(pipeline));
  ok('  op alle drie de plekken (bubbel, regel bij het veld, foutvak)', (pipeline.match(/foutTekst\((bad|field)\)/g) || []).length >= 3);
}

console.log('\nB04 · een telefoonnummer zonder cijfers komt niet door stap 3');
{
  const p = patroonVan('pl-phone');
  ok('het veld heeft een patroon', !!p, 'geen pattern op #pl-phone');
  if (p) {
    const re = alsPatroon(p);
    for (const [w, verwacht] of [['abc', false], ['1234567', false], ['+31 6 00000000', true], ['06-12345678', true], ['+32 (0)470 12 34 56', true], ['+49 30 1234567', true], ['0612345678', true]]) {
      ok(`  ${w} → ${verwacht ? 'goed' : 'fout'}`, re.test(w) === verwacht);
    }
  }
  ok('een eigen zin, NL en EN', /phoneVorm: 'Dat lijkt nog geen telefoonnummer\./.test(flow) && /phoneVorm: 'That does not look like a phone number yet\./.test(flow));
}

console.log('\nB03 · de postcode in het Engelse formulier is niet Brits');
{
  ok('OrderFlow: geen AB1 2CD', !/AB1 2CD/.test(flow));
  ok('billing.js: geen AB1 2CD', !/AB1 2CD/.test(lees('src/data/billing.js')));
}

console.log('\nB05 · de proefpagina zegt niet meer "4 photos, or 4"');
{
  const ts = lees('src/components/TestSampleHal.astro');
  ok('geen half zinnetje', !/photos, or \$\{LIFESTYLE_IMAGES\}/.test(ts) && !/foto’s, of \$\{LIFESTYLE_IMAGES\}/.test(ts));
  ok('bij gelijke aantallen: "4 beelden, catalog of lifestyle"', /CATALOG_IMAGES === LIFESTYLE_IMAGES \? `\$\{CATALOG_IMAGES\} beelden, catalog of lifestyle`/.test(ts) && /`\$\{CATALOG_IMAGES\} images, catalog or lifestyle`/.test(ts));
}

console.log('\nB08 · het kenmerk staat in de omschrijving bij Mollie (checkout en bankafschrift)');
{
  const { paymentDescription } = await import('../src/lib/quote.js');
  ok('met kenmerk', paymentDescription({ service: 'catalog', products: 1, ref: 'VIS-ABCD-EFG' }, 'nl') === 'VISUAILS VIS-ABCD-EFG — 1 product, catalogsets');
  ok('EN met kenmerk', paymentDescription({ service: 'lifestyle', products: 5, ref: 'VIS-ABCD-EFG' }, 'en') === 'VISUAILS VIS-ABCD-EFG — 5 products, lifestyle carousels');
  ok('video met kenmerk', paymentDescription({ service: 'video', products: 2, ref: 'VIS-X' }, 'nl') === 'VISUAILS VIS-X — 2 videoclips');
  ok('zonder kenmerk ongewijzigd', paymentDescription({ service: 'catalog', products: 1 }, 'nl') === 'VISUAILS — 1 product, catalogsets');
  ok('order.js geeft het kenmerk mee', /description: paymentDescription\(\{ \.\.\.quote, ref \}, lang\)/.test(lees('functions/api/order.js')));
  ok('de €1-proef ook', /description: `\$\{lang === 'nl' \? 'VISUAILS proef' : 'VISUAILS test sample'\}\$\{ref \? ` \$\{ref\}` : ''\}`/.test(lees('src/lib/mollie.js')));
}

console.log('\nE-A4 · drie verouderde meldingen in /admin');
{
  const h = admin.slice(admin.indexOf('async function handlePayLinkResend'), admin.indexOf('async function handlePayLinkResend') + 1600);
  ok('"Betaallink opnieuw mailen" stuurt de herinnering (geen btw-mail)', /stuurBetaallinkMail\(env, orderId, \{ origin: new URL\(context\.request\.url\)\.origin, offerte, herinnering: !offerte \}\)/.test(h));
  ok('  en bij een offerte de offerte', /offerte = !!\(JSON\.parse\(o\.details_json \|\| '\{\}'\) \|\| \{\}\)\.quote_kind/.test(h));
  ok('de formaatwaarschuwing alleen bij een open PNG/WebP-verzoek', /SELECT formaat FROM formaat_verzoeken WHERE order_id = \?1 AND klaar_at IS NULL/.test(admin) && /const zonderFormaat = migrated && gevraagd\.length/.test(admin));
  ok('  en niet meer "nog geen JPG, PNG én WEBP"', !/nog geen JPG, PNG én WEBP/.test(admin));
  ok('de dashboardregel zegt niet meer "zet de status opnieuw op geleverd"', !/Zet de status opnieuw op <strong>geleverd<\/strong>/.test(admin) && /Naar de bestelling: Leveringsmail opnieuw proberen/.test(admin));
}

console.log('\nB08, B09, B21 · een fout staat in beeld, bij het veld');
{
  ok('B08: een fout in de stap waar je staat, zet de pagina niet terug naar de kop', /if \(i !== current\) \{ show\(i\); validateStep\(i\); \}/.test(pipeline));
  ok('B09: de servermelding over het e-mailadres staat bij het veld in stap 3', /markeerVeld\(anker, c\('submit\.email'\)\)/.test(pipeline));
  const mis = pipeline.slice(pipeline.indexOf("  box.hidden = false;\n  if (box.tabIndex < 0) box.tabIndex = -1;"), pipeline.indexOf("  box.hidden = false;\n  if (box.tabIndex < 0) box.tabIndex = -1;") + 900);
  ok('B21: het blok met ontbrekende foto\'s springt in beeld na de tekenbeurt, niet vloeiend', /requestAnimationFrame\(\(\) => requestAnimationFrame\(spring\)\)/.test(mis) && !/'smooth'/.test(mis));
}

console.log('\nB11 · voorrang noemt de echte dag, of de grens van 15:00');
{
  const { voorrangZin } = await import('../src/data/pricing.js');
  ok('zondagavond betaald → dinsdag 10 november', voorrangZin('nl', '2026-11-08 21:11:00') === 'Voorrang — geleverd uiterlijk dinsdag 10 november om 17:00, of de toeslag komt terug');
  ok('EN', voorrangZin('en', '2026-11-08T21:11:00Z') === 'Priority — delivered by 17:00 on Tuesday 10 November, or the surcharge comes back');
  ok('dinsdagochtend betaald → woensdag', /woensdag 11 november/.test(voorrangZin('nl', '2026-11-10 09:00:00')));
  ok('zonder betaaldatum: de regel met 15:00', /als je op een werkdag vóór 15:00 betaalt \(anders de werkdag daarna\)/.test(voorrangZin('nl')));
  const verder = lees('src/lib/verder.js');
  ok('verder.js geeft de betaaldatum door', /\{ soort: 'voorrang', betaald: String\(o\.paid_at\) \}/.test(verder) && /t\.voorrang\(l\.betaald \|\| null\)/.test(verder));
  /* K-10 (ronde 91) leest er service, status en closed_at bij; het gaat erom dat paid_at erin zit. */
  ok('de betaalmail leest paid_at', /SELECT id,[^']*\btier\b[^']*\bpaid_at FROM orders WHERE ref = \?1/.test(lees('src/lib/invoiceMail.js')));
  ok('Studio ook', /voorrangZin\(lang, o\.paid_at \|\| null\)/.test(lees('src/lib/account.js')));
}

console.log('\nB12, B13, B14, B23 · de mails');
{
  const order = lees('functions/api/order.js');
  ok('B12: met afwijkingen per beeld heet het de standaardachtergrond', /const kop = perBeeld \? \(nl \? 'Standaardachtergrond' : 'Default background'\)/.test(order));
  ok('B13: "1 product" in de mail aan jou', /\$\{Number\(products\) === 1 \? 'product' : 'producten'\}/.test(order) && !/products \? `\$\{esc\(products\)\} producten`/.test(order));
  ok('B14: de mail aan jou zegt niet meer dat het dezelfde link is als die van de klant', !/Dezelfde link als de klant kreeg/.test(order) && /ze werken allebei/.test(order));
  ok('B23: een EU-btw-nummer dat VIES niet bevestigde, staat in de mail aan de klant', /vat && vat\.reason === 'eu-unconfirmed'\)/.test(order) && /Je btw-nummer konden we bij de Europese controle \(VIES\) niet bevestigen\./.test(order));
}

console.log('\nB15 · een testbestelling heeft in /admin een eigen pil');
{
  ok('de bestelpagina leest testmodus', /COALESCE\(testmodus, 0\) AS testmodus\n\s+FROM orders WHERE id = \?1/.test(admin));
  /* Ronde 91 (w7): "test" en niet "proef" voor een bestelling met een testsleutel. */
  ok('en toont "Test"', />Test<\/span>' : ''\}<\/p>/.test(admin));
}

console.log('\nB17 · terug van Mollie zonder te betalen: na een minuut de knop');
{
  const ia = lees('src/scripts/interactions.js');
  ok('NL en EN zeggen niet meer "je hoeft niet opnieuw te betalen" tegen iedereen', !/Je hoeft niet opnieuw te betalen\./.test(ia) && !/You do not need to pay again\./.test(ia));
  ok('na de minuut, als er nog betaald kan worden: de zin en de knop', /tyBetaalbaar && d\.tyCheckingSlowPay \? d\.tyCheckingSlowPay : d\.tyCheckingSlow/.test(ia) && /if \(tyBetaalbaar\) zetBetaalknop\(ref, noot, d\);/.test(ia));
  ok('betaalbaar volgt het laatste antwoord', /tyBetaalbaar = !!s\.payable && !s\.paid && !s\.cancelled;/.test(ia));
  ok('de oude verwijzing naar de bevestigingsmail is weg', !/tyCheckingSlow: '[^']*De betaallink staat in je bevestigingsmail/.test(ia) && !/tyCheckingSlow: '[^']*The payment link is in your confirmation email/.test(ia));
}

console.log('\nB20, B28 · lange notitie en een website zonder https://');
{
  ok('B20: het notitieveld stopt bij 2000 tekens, net als de server', /id="pl-msg" name="message" maxlength="2000"/.test(flow));
  ok('B28: het websiteveld is tekst, geen url', /type="text" inputmode="url" id="pl-web"/.test(flow) && /type="text" inputmode="url" id="h-web"/.test(lees('src/components/order/HoldingPage.astro')));
}

console.log('\nB25, B26 · het abonnementsformulier');
{
  const plan = lees('functions/api/plan.js');
  const pp = lees('src/components/order/PlanPicker.astro');
  ok('B25: het land reist mee terug', /function terug\(reden, lang, land = ''\)/.test(plan) && /return terug\('account', lang, land\)/.test(plan));
  ok('  en het formulier zet het terug', /var land = qs\.get\('land'\);/.test(pp) && /\/\^\[A-Z\]\{2\}\$\/\.test\(land\)/.test(pp));
  ok('B26: het bedrag met btw staat bij de afschrijving', /met \$\{pct\}% btw in Nederland\), tot je opzegt/.test(pp) && /with \$\{pct\}% VAT in the Netherlands\) automatically every month/.test(pp));
}

console.log('\nB29, B30, B31, B36 · terug van Mollie, de stap 5-zinnen, de leverregel');
{
  ok('B29: terug uit de browsercache geeft de knop vrij en toont het blok', /window\.addEventListener\('pageshow', \(e\) => \{\s*if \(!e\.persisted\) return;[\s\S]{0,500}?busy = false;/.test(pipeline) && /checkOpenOrder\(\);\s*\}\);/.test(pipeline));
  ok('B30: het blok zegt niet meer "je ging terug"', !/Je ging terug vanaf de betaalpagina/.test(flow) && !/You pressed back on the payment page/.test(flow));
  ok('B31: zonder leverdatum zegt stap 5 waar de betaalknop staat', /data-pl-after-nowindow hidden/.test(flow) && /naGeenVenster\.hidden = !\(attended && !ws\)/.test(pipeline));
  ok('B19: de bevestiging "als je niet meteen betaalt"', /Betaal je niet meteen\? Dan volgt je bevestiging/.test(flow) && /Not paying straight away\?/.test(flow));
  ok('B36: "Je beelden komen op je leverdatum"', /Je beelden komen op je leverdatum/.test(lees('src/lib/verder.js')));
}

console.log('\nD · /admin');
{
  /* Ronde 91 (w6, 9 november 2026): de teller (de tegel "onbetaald") is weg; het filter blijft. */
  ok('D01: geannuleerd telt niet als onbetaald (het filter; de tegel is weg)', (admin.match(/service != 'test-sample' AND status != 'cancelled'/g) || []).length === 1);
  ok('D02: zoeken neemt het filter niet mee', !/\$\{filter \? `<input type="hidden" name="f" value="\$\{esc\(filter\)\}">` : ''\}/.test(admin) && /Geen bestelling gevonden voor/.test(admin));
  ok('D12, D13, D35: de uitleg over formaten volgt JPG als standaard', /Formaten: JPG hier, PNG en WebP op aanvraag/.test(admin) && !/het commando is hoe een bestelling de deur uit gaat/.test(admin));
  ok('D15: geen "4:5 — 4:5"', /naam\.includes\(String\(r\.label \|\| ''\)\) \? esc\(naam\)/.test(admin));
  ok('D19: "Deze bestelling is geleverd;" in kleine letters', /toLowerCase\(\)\)\}; de leverdag verzetten kan niet meer\./.test(admin));
  ok('D20: de stille knop leesbaar in het donkere thema', /html\[data-thema="donker"\] \.btn\.btn-quiet \{ color: rgb\(244 245 247 \/ \.72\); \}/.test(lees('public/admin.css')));
  ok('D27: één kop Revisies', /<span class="ref">Revisierecht<\/span>/.test(admin));
  ok('D29: testabonnementen tellen niet mee per maand', /maandNetto: rijen\.reduce\(\(n, r\) => n \+ \(r\.test \? 0 : r\.maandNetto\), 0\)/.test(lees('src/lib/abonnees.js')));
  ok('D36: de intro van de btw-controle klopt', !/Bestellingen van buiten de EU staan hier niet meer/.test(admin));
  ok('D37: een betaalde bestelling krijgt geen betaallink', /Gegevens kloppen — goedkeuren \(al betaald\)/.test(admin) && /\['paid', 'credits', 'plan'\]\.includes\(String\(\(vers \|\| order\)\.payment_status \|\| ''\)\)\) return seeOther\(terug\('akkoord'\)\)/.test(admin));
  ok('D38: geen "1 producten" of "€ 0,00 erbij"', /Number\(o\.product_count\) === 1 \? 'product' : 'producten'/.test(admin) && /alBtw \|\| betaald \|\| !\(withVat > 0\)/.test(admin));
  ok('D40: PROEF-documenten niet in de tegels en de CSV', /const rijen = alle\.filter\(\(r\) => !isProef\(r\)\);/.test(admin) && /test niet meegeteld/.test(admin));
}

console.log('\nLijst 84 · de voetknop en Aanmelden volgen de inktknop (K2)');
{
  const hal = lees('src/styles/hal.css');
  ok('één token voor de inktknop', /html body\.hal \{\s*--knop-inkt: linear-gradient\(126\.87deg, #0F1217 0%/.test(hal));
  ok('de voet en de Studiobrief gebruiken het', /html body\.hal \.site-footer \.btn-primary, html body\.hal \.sb\.sb-licht \.sb-veld button \{\s*background: #0F1217 var\(--knop-inkt\)/.test(hal));
  ok('minder beweging: zonder overgang', /@media \(prefers-reduced-motion: reduce\) \{\s*html body\.hal \.site-footer \.btn-primary, html body\.hal \.sb\.sb-licht \.sb-veld button \{ transition: none; \}/.test(hal));
}

console.log('\nA · de publieke site');
{
  const hal = lees('src/styles/hal.css');
  const op = lees('src/styles/opening-80.css');
  ok('F1: de Studiobrief op Editions is weer inkt in de witte kaart', /html body\.hal \.h-lk-slot \.h-ed-brief \.sb-kop \{ color: var\(--h-inkt\); \}/.test(hal));
  ok('F3: de structured data belooft niet meer één foto', !/'Product-visual studio[^']*single product photo/.test(lees('src/data/schema.js')) && /made from a few phone photos of each product/.test(lees('src/data/schema.js')));
  ok('F3: stap 2 zegt drie foto\'s, zoals de verplichte vakken', /Three photos are enough: the front, the back and a detail\./.test(flow) && /Drie foto’s zijn genoeg: de voorkant, de achterkant en een detail\./.test(flow));
  ok('F3: Catalog EN niet meer "One photo in."', !/'One photo in\.'/.test(lees('src/components/CatalogHal.astro')));
  ok('S1: de WebSite-knoop in beide talen', /inLanguage: \['en', 'nl'\],/.test(lees('src/data/schema.js')));
  ok('S3: elk deel van een meta-beschrijving begint met een hoofdletter', /\.map\(\(p\) => p\.charAt\(0\)\.toUpperCase\(\) \+ p\.slice\(1\)\);/.test(lees('src/data/meta.js')));
  const { metaDescription } = await import('../src/data/meta.js');
  ok('  "… catalog style. From €39 …"', metaDescription(['Classic: a signature VISUAILS catalog style', 'from €39 / product excl. VAT — from 4 photos']) === 'Classic: a signature VISUAILS catalog style. From €39 / product excl. VAT — from 4 photos.');
  ok('S3: /plans zonder losse "excl. VAT."', /a month \$\{vatLabel\('excl', 'en'\)\} for/.test(lees('src/pages/plans.astro')) && /per maand \$\{vatLabel\('excl', 'nl'\)\} voor/.test(lees('src/pages/nl/plans.astro')));
  ok('S4: de voet heet "Try VISUAILS · €1"', /foot_sample: TEST_SAMPLE\.en\.cta,/.test(lees('src/i18n/ui.js')) && !/`Test sample · \$\{TEST_SAMPLE\.en\.price\}`/.test(lees('src/i18n/ui.js')));
  ok('S5: geen "adminportaal" in de cookiedialoog', !/voor het adminportaal/.test(lees('src/i18n/ui.js')));
  ok('S7: geen "Motion in motion"', /\/motion\/i\.test\(name\) \? 'See it move'/.test(lees('src/components/VideoExamples.astro')));
  ok('S8: de feitenregel op een telefoon onder elkaar, zonder streep vooraan', /@media \(max-width: 599px\) \{\s*\.o8 \.o8-feiten \{ flex-direction: column;/.test(op));
  ok('S9: de feitenregel gaat weg met de winkel', /html\.o8-aan \.o8\.o8-winkel-uit \.o8-feiten, html\.o8-aan \.o8\.o8-speelt \.o8-feiten \{ opacity: 0;/.test(op));
  ok('S10: de naam in de laptopspeler mag smal afbreken', /\.hal \.hl-naam b \{ white-space: normal; overflow: visible;/.test(hal));
  ok('S11: Inloggen, de tweede link en Cookievoorkeuren onder de muis blauw', /\.nav-account-link:hover[^{]*\{ color: var\(--h-blauw\) !important; \}/.test(hal) && /\.o8-acties \.h-link:hover/.test(hal) && /\.site-footer \.foot-cc:hover/.test(hal));
  ok('S15: llms.txt zonder hoofdletter midden in de zin', /z\.charAt\(0\)\.toLowerCase\(\) \+ z\.slice\(1\)\)\(turnaround\('unattended', 'en'\)/.test(lees('scripts/llms-txt.mjs')));
}

console.log('\nOpruimen · verborgen testbestellingen blijven niet in de btw-controle staan');
{
  ok('Nu doen: btw-controle zonder verborgen bestellingen', /WHERE o\.review_state = 'pending' AND COALESCE\(o\.status, ''\) <> 'cancelled' AND o\.hidden_at IS NULL AND \$\{EEN\}/.test(lees('src/lib/nudoen.js')));
  ok('de teller en de pagina /admin/vat ook', /WHERE review_state = 'pending' AND hidden_at IS NULL/.test(admin) && /WHERE o\.review_state IN \('pending', 'rejected'\) AND COALESCE\(o\.status, ''\) <> 'cancelled' AND o\.hidden_at IS NULL/.test(admin));
}

console.log(`\n${goed} goed, ${fout} fout`);
if (fout) process.exit(1);
