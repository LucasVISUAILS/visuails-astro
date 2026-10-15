/* VISUAILS — doorloop 27: de directe punten
 *   node tests/doorloop-27.test.mjs
 * ══════════════════════════════════════════════════════════════════════════════
 * WAAROM DEZE TOETS BESTAAT — 14 OKTOBER 2026
 * ══════════════════════════════════════════════════════════════════════════════
 * Lucas: *"Ik wil dat je de gehele website op alle mogelijkheden gaat controleren
 * en handmatig gaat gebruiken in de browser (…) en kom met een lijst van dingen
 * die duidelijk (gelijk toepassen) en optioneel aangepast moeten worden."*
 *
 * Elke bestelvorm is besteld, betaald, door /admin gevuld, goedgekeurd en
 * gereviseerd; de abonnementen zijn afgesloten, geïncasseerd, gepauzeerd en
 * opgezegd. Wat daarbij als "direct" uitkwam (B02–B37 in
 * kladblok/DOORLOOP-27.md), staat hier per punt vast. De browserkant
 * (contrast, koppen, de bedankpagina) is met dezelfde schermen nagelopen; deze
 * toets bewaakt de bron, zodat een volgende ronde het niet stil terugdraait.
 */
import { readFileSync } from 'node:fs';
import { verseDb, d1 } from './lib/d1sqlite.mjs';

let pass = 0, fail = 0;
function ok(naam, kreeg, verwacht = true) {
  const p = JSON.stringify(kreeg) === JSON.stringify(verwacht);
  if (p) { pass += 1; console.log(` ok   ${naam}`); }
  else { fail += 1; console.log(`FAIL   ${naam}`.padEnd(72) + `verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(kreeg)}`); }
}
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

/* ── B13 · de kaart "nog geen abonnement" blijft donker in de hal-huid ─────── */
console.log('B13 · Studio, geen abonnement: de kaart is donker, de letters wit');
{
  const hal = lees('src/styles/studio-hal.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const wit = hal.indexOf('body.studio.st-hal .st-kaart-vlak:not(.st-cijfers)');
  const donker = hal.indexOf('body.studio.st-hal .st-kaart-vlak.st-geenabo');
  ok('studio-hal.css zet .st-geenabo terug op donker', donker > -1);
  ok('  ná de regel die elke kaart wit maakt (zelfde specificiteit)', donker > wit && wit > -1);
  ok('  met een donkere grond', /\.st-kaart-vlak\.st-geenabo\s*\{[^}]*background:\s*#0F0C24/i.test(hal));
  ok('de plan-pagina gebruikt die twee klassen samen', /st-kaart-vlak st-geenabo|st-geenabo st-kaart-vlak/.test(lees('src/pages/account/plan.astro')) || /class="[^"]*st-kaart-vlak[^"]*st-geenabo/.test(lees('src/pages/account/plan.astro')));
}

/* ── B03 / B10 · Oppakken is één klik; Revisie openen blijft op de bestelling ─ */
console.log('\nB03 · B10 · Nu doen');
{
  const { knopVoor } = await import('../src/lib/nudoen.js');
  const r = { id: 7, soort: 'oppakken', extra: null };
  ok('dashboard: Oppakken post de status In productie', [knopVoor(r).post, knopVoor(r).href, knopVoor(r).velden], [true, '/admin/orders/7/status', { status: 'in_production', back: 'files' }]);
  ok('bestelpagina: ook één klik', !!knopVoor(r, 'bestelling').post);
  ok('nachtrapport (een mail): een link naar het lijstje', [knopVoor(r, 'rapport', 'https://x').href, !!knopVoor(r, 'rapport').post], ['https://x/admin/orders/7/files#status', false]);
  const rv = { id: 7, soort: 'revisie', extra: 350 };
  ok('Revisie openen op de bestelpagina springt naar het vakje', knopVoor(rv, 'bestelling').href, '#rev-350');
  ok('  en op het dashboard naar de kaart', knopVoor(rv, 'dashboard').href, '#rev-350');
  ok('het werkbordvakje met een revisie draagt die id', /id="rev-\$\{f\.id\}"/.test(lees('src/lib/admin.js')));
}

/* ── B06 / B07 · de bestellimiet en het Engelse voorbeeldadres ───────────────── */
console.log('\nB06 · B07 · het bestelformulier');
{
  const flow = lees('src/components/order/OrderFlow.astro');
  const pl = lees('src/scripts/pipeline.js');
  ok('een eigen zin voor de bestellimiet (NL en EN)', (flow.match(/^\s+rate: '/gm) || []).length >= 2);
  ok('  en de zin staat in de verplichte lijst', /'submit\.generic', 'submit\.rate'/.test(flow));
  ok('pipeline.js kiest hem bij 429 + error rate', /status === 429 && body && body\.error === 'rate'[\s\S]{0,400}c\('submit\.rate'/.test(pl));
  ok('het Engelse voorbeeld is name@brand.com', /like name@brand\.com/.test(flow) && !/like naam@merk\.nl\. Check/.test(flow));
}

/* ── B08 · de revisiemail aan Lucas: werkbordwoorden, één notitie ─────────── */
console.log('\nB08 · de revisiemail aan Lucas');
{
  const { db } = verseDb(new URL('../schema.sql', import.meta.url));
  db.exec(`INSERT INTO orders (id, ref, service, email, status, payment_status, lang) VALUES (90, 'VIS-RV-0090', 'catalog', 'klant@voorbeeld.test', 'delivered', 'paid', 'nl')`);
  db.exec(`INSERT INTO files (id, order_id, kind, filename, r2_key, product_key, shot) VALUES
    (901, 90, 'delivery', 'a.jpg', 'k/a', 'p1', 'detail'),
    (902, 90, 'delivery', 'b.jpg', 'k/b', 'p2', 'worn')`);
  const gezien = [];
  const oudFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts = {}) => { gezien.push({ url: String(url), body: opts.body ? String(opts.body) : '' }); return new Response('{"id":"m"}', { status: 200, headers: { 'content-type': 'application/json' } }); };
  const env = { DB: d1(db), RESEND_API_KEY: 're_test', NOTIFY_EMAIL: 'studio@voorbeeld.test', FROM_EMAIL: 'VISUAILS <orders@visuails.com>', PUBLIC_ORIGIN: 'https://visuails.com' };
  const { notifyRevisionRound } = await import('../src/lib/notify.js');
  const notitie = 'Product 1 detail: de knoop is onscherp. Product 2 op model: te lang.';
  await notifyRevisionRound(env, { orderId: 90, items: [{ fileId: 901, note: notitie }, { fileId: 902, note: notitie }] });
  globalThis.fetch = oudFetch;
  const mail = gezien.filter((g) => g.url.includes('resend')).map((g) => JSON.parse(g.body))[0] || {};
  const html = String(mail.html || '');
  ok('één mail', gezien.filter((g) => g.url.includes('resend')).length, 1);
  ok('"Product 1 · Detail" in plaats van "p1 · detail"', html.includes('Product 1 · Detail') && !html.includes('p1 · detail'));
  ok('"Product 2 · Op een model" in plaats van "p2 · worn"', /Product 2 · (Op een model|Gedragen)/.test(html) && !html.includes('p2 · worn'));
  ok('de notitie van de ronde staat er één keer', html.split('de knoop is onscherp').length - 1, 1);
}

/* ── B11 / B12 · de zip: wat de pagina zegt, en de leesmij ────────────────── */
console.log('\nB11 · B12 · de map en de leesmij');
{
  const portal = lees('src/lib/portal.js');
  const account = lees('src/lib/account.js');
  ok('privélink belooft geen "map per product" meer bij een gewone levering', !/folderBodyKaal: \(fmt\) => `(Eén map per product|One folder per product)/.test(portal));
  ok('Studio ook niet', !/folderBody: '(Eén map per product met alle|One folder per product with every)/.test(account));
  const { deliveryReadme } = await import('../src/lib/delivery.js');
  const plat = [{ name: 'VISUAILS-VIS-X/VIS-X-p1-voorkant.jpg', bytes: 10 }, { name: 'VISUAILS-VIS-X/VIS-X-p2-voorkant.jpg', bytes: 10 }];
  for (const lang of ['nl', 'en']) {
    const t = deliveryReadme({ order: { ref: 'VIS-X', lang, service: 'catalog' }, entries: plat });
    ok(`${lang}: geen visuails.com/nl/portal of /portal meer (dat is de uitlegpagina)`, /visuails\.com\/(nl\/)?portal/.test(t), false);
    ok(`${lang}: de revisie via de levermail of VISUAILS Studio (visuails.com/account)`, /visuails\.com\/account/.test(t) && /VISUAILS Studio/.test(t));
    ok(`${lang}: een platte map heeft geen "dertig mappen"`, /dertig mappen|thirty folders/.test(t), false);
    ok(`${lang}: WhatsApp staat erbij`, /\+31 6 25436130/.test(t));
    ok(`${lang}: geen "dashboard"`, /dashboard/i.test(t), false);
  }
}

/* ── B14 / B16 · de keuze uit de link ─────────────────────────────────────── */
console.log('\nB14 · B16 · aanvraag met de goede keuze');
{
  const { videoStyles: nl } = await import('../src/data/videoStyles.nl.js');
  const { videoStyles: en } = await import('../src/data/videoStyles.js');
  for (const [taal, lijst, pre] of [['nl', nl, '/nl'], ['en', en, '']]) {
    for (const slug of ['motion', 'lifestyle']) {
      ok(`${taal} ${slug}: de knop draagt ?style=${slug}`, lijst.find((s) => s.slug === slug)?.ctaHref, `${pre}/start/video/?style=${slug}`);
    }
  }
  const cat = await import('../src/data/catalogStyles.js');
  const catNl = await import('../src/data/catalogStyles.nl.js');
  const lijst = (m) => m.catalogStyles || m.styles || m.default || [];
  ok('catalog custom → ?voor=catalog (EN)', lijst(cat).some((s) => /\/start\/custom-look\/\?voor=catalog$/.test(s.orderHref || '')));
  ok('catalog custom → ?voor=catalog (NL)', lijst(catNl).some((s) => /\/nl\/start\/custom-look\/\?voor=catalog$/.test(s.orderHref || '')));
  const ix = lees('src/scripts/interactions.js');
  ok('interactions.js kiest h-style en h-for uit de link', /zet\('select#h-style', q\.get\('style'\)\)/.test(ix) && /zet\('select#h-for', q\.get\('voor'\)\)/.test(ix));
  ok('  alleen een optie die het formulier zelf heeft', /\[\.\.\.el\.options\]\.some\(\(o\) => o\.value === waarde\)/.test(ix));
}

/* ── B15 / B17 / B23 / B24 / B27 · de bedankpagina ───────────────────────── */
console.log('\nB15 · B17 · B23 · B24 · B27 · de bedankpagina');
{
  const ty = lees('src/components/ThankYouPage.astro');
  const ix = lees('src/scripts/interactions.js');
  ok('een aanvraag: "Bekijk je aanvraag"', /ctaRequest: 'Bekijk je aanvraag'/.test(ty) && /data-ty-cta-request=/.test(ty) && /cta\.dataset\.tyCtaRequest/.test(ix));
  ok('een betaalde offerte: eigen zin, geen levertijd', /flowQuote: 'We gaan aan de slag zoals in de offerte staat/.test(ty) && /params\.get\('soort'\) === 'offerte'/.test(ix));
  const pay = lees('functions/api/order-pay.js');
  ok('order-pay stuurt soort=offerte bij video en eigen look', /o\.service === 'video' \|\| o\.service === 'custom' \? '&soort=offerte'/.test(pay));
  ok('  en soort=merkmodel bij een merkmodel', /o\.service === 'brand-model' \? '&soort=merkmodel'/.test(pay));
  ok('datum volgt: ook de Levertijd-rij', /data-ty-timing-volgt=/.test(ty) && /tyTimingVolgt/.test(ix));
  ok('WhatsApp-link met kenmerk (bestelling, aanvraag, bericht)', ['data-ty-wa-bestelling', 'data-ty-wa-aanvraag', 'data-ty-wa-bericht'].every((a) => ty.includes(a)) && /function zetWhatsappTekst/.test(ix));
  ok('  en de oude zin "ik heb net een aanvraag gedaan" is weg', /ik heb net een aanvraag gedaan via de site/.test(ty), false);
  const order = lees('functions/api/order.js');
  ok('met credits betaald: &credits=1 op de terugkeer', /'paid=' \+ encodeURIComponent\(ref\) \+ \(metCredits \? '&credits=1' : ''\)/.test(order));
  ok('  de bedankpagina zegt dan "betaald met je credits" en belooft geen factuur', /titleCredits:/.test(ty) && /data-ty-verder-credits=/.test(ty) && /tyVerderCredits/.test(ix) && /tyTitleCredits/.test(ix));
}

/* ── B20 · geen machtiging vernieuwen die nergens kan ────────────────────── */
console.log('\nB20 · de mail bij een mislukte afschrijving');
{
  const m = lees('src/lib/cancelMail.js').replace(/\/\*[\s\S]*?\*\//g, '');
  ok('geen "vernieuw dan je machtiging" / "renew your mandate"', /vernieuw dan je machtiging|renew your mandate/.test(m), false);
  ok('  maar: antwoord of app ons, dan sturen we een link', /dan sturen we je een link om je nieuwe rekening te koppelen/.test(m) && /we send you a link to connect your new account/.test(m));
}

/* ── B21 · één soort datum bij credits ────────────────────────────────────── */
console.log('\nB21 · credits: overal "geldig tot en met"');
{
  const { saldoWeergave } = await import('../src/lib/creditWeergave.js');
  const nu = new Date('2026-10-14T10:00:00Z');
  const s = saldoWeergave({ saldo: 55, vervalt: [{ op: '2027-01-14', aantal: 10 }], bijgekocht: { saldo: 10, vervalt: [{ op: '2027-01-14', aantal: 10 }] }, echteDatums: [{ op: '2027-01-14', aantal: 45 }, { op: '2027-02-14', aantal: 10 }] }, 'nl', nu);
  ok('bijgekocht: geldig tot en met 13 januari', /blijven geldig tot en met 13 januari/.test(s.bijgekocht || ''));
  ok('nergens meer "vervalt op" / "vervallen op" in de weergave', /vervalt op|vervallen op/.test(lees('src/lib/creditWeergave.js').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')), false);
  ok('stap 5 ook: "blijven geldig tot en met {datum}"', /oudste: 'De oudste gaan eerst: \{aantal\} daarvan blijven geldig tot en met \{datum\}\.'/.test(lees('src/components/order/OrderFlow.astro')));
  ok('  met de dag ervóór (dagVoor)', /creditDatum\(dagVoor\(op\[0\]\.op\)\)/.test(lees('src/scripts/pipeline.js')));
}

/* ── B22 · Studio heet Studio ─────────────────────────────────────────────── */
console.log('\nB22 · /start/plan');
ok('geen "in je dashboard" / "in your dashboard" meer', /in je dashboard|in your dashboard/.test(lees('src/components/order/PlanPicker.astro')), false);

/* ── B25 · koppen op de telefoon ─────────────────────────────────────────── */
console.log('\nB25 · koppen op de telefoon');
{
  const hal = lees('src/styles/hal.css').replace(/\/\*[\s\S]*?\*\//g, '');
  ok('≤ 480 px: h1 40 px, h2 32 px', /@media \(max-width: 480px\) \{\s*\.hal \.h-h1 \{ font-size: 40px; \}\s*\.hal \.h-h2 \{ font-size: 32px; \}/.test(hal));
  ok('≤ 380 px: h1 36 px, h2 28 px, en het lichte deel donkerder (onder 32 px)', /@media \(max-width: 380px\) \{\s*\.hal \.h-h1 \{ font-size: 36px; \}\s*\.hal \.h-h2 \{ font-size: 28px; \}\s*\.hal \.h-h2 \.l, \.hal \.h-h2\.l \{ color: var\(--h-inkt-3\); \}/.test(hal));
}

/* ── B26 · met credits: geen euroregels ───────────────────────────────────── */
console.log('\nB26 · stap 5 met credits');
{
  const pl = lees('src/scripts/pipeline.js');
  ok('de euroregels dragen data-pl-geld', /rows\.push\(\[c\('sum\.net'\), euro\(net\), 'geld'\]\)/.test(pl) && /dt\.dataset\.plGeld = ''/.test(pl));
  ok('zetGeldRegels verbergt ze bij credits en toont de creditregel', /function zetGeldRegels\(\)/.test(pl) && /qa\('\[data-pl-geld\]', host\)\.forEach\(\(el\) => \{ el\.hidden = credits; \}\)/.test(pl));
  ok('syncCredits zet creditsKosten', /creditsKosten = metCredits \? kost\.credits : 0;/.test(pl));
  /* B26b: ook het totaal naast het formulier en in stap 1. */
  ok('het totaal wordt "N credits" bij credits', /c\('sum\.creditsTotaal', \{ n: creditsKosten \}\)/.test(pl));
  ok('  en de noot de creditregel', /el\.textContent = c\('sum\.creditsWaarde', \{ n: creditsKosten \}\); el\.dataset\.plMetCredits = '1';/.test(pl));
  ok('  "excl. btw" gaat weg', /qa\('\.bo-totaal-s, \.pl-total-excl'\)\.forEach\(\(el\) => \{ el\.hidden = credits; \}\)/.test(pl));
  ok('  zonder credits komt de euroregel terug', /el\.textContent = totaalEuro; delete el\.dataset\.plMetCredits;/.test(pl) && /totaalEuro = quote \? euro\(quote\.net\) : dash;/.test(pl));
  const of = lees('src/components/order/OrderFlow.astro');
  ok('  de tekst staat in NL en EN', (of.match(/creditsTotaal: '\{n\} credits',/g) || []).length, 2);
  ok('  en in REQUIRED_COPY', /'sum\.creditsTotaal'/.test(of));
  /* De vlag heette eerst dataset.plCredits — dat is data-pl-credits, de haak van
     het creditblok zelf. syncCredits() vond daarna het totaal als "het blok"
     (tests/credits-stap5-browser zag vijf elementen). Nooit meer die naam. */
  ok('  de vlag botst niet met de haak [data-pl-credits]', /dataset\.plCredits\b/.test(pl), false);
}

/* ── B38 · het overzicht: "Gezicht — " werd "Wij kiezen er een" ────────────── */
console.log('\nB38 · gezicht in het meelopende overzicht');
{
  const pl = lees('src/scripts/pipeline.js');
  const of = lees('src/components/order/OrderFlow.astro');
  ok('bij "wij kiezen" staat de korte vorm in het overzicht', /\} else if \(mp && !mp\.matches\(':disabled'\)\) \{[\s\S]{0,200}modelText = c\('sum\.modelKort'\);/.test(pl));
  ok('  NL en EN', /modelKort: 'Wij kiezen er een',/.test(of) && /modelKort: 'We pick one',/.test(of));
  ok('  en in REQUIRED_COPY', /'sum\.modelKort'/.test(of));
}

/* ── B29 / B30 · het contactformulier ─────────────────────────────────────── */
console.log('\nB29 · B30 · contact');
{
  const cp = lees('src/components/ContactHal.astro');
  const ix = lees('src/scripts/interactions.js');
  const order = lees('functions/api/order.js');
  ok('het nummerveld is verplicht zodra WhatsApp aanstaat', /data-nodig-bij-whatsapp/.test(cp) && /function initNummerBijWhatsapp/.test(ix) && /tel\.required = !!\(wa && wa\.checked\)/.test(ix));
  ok('de kopie zegt het als WhatsApp zonder nummer e-mail werd', /je koos WhatsApp, maar er stond geen telefoonnummer bij/.test(order));
  ok('de Engelse kopie noemt een Engels onderwerp', /TOPICS_EN = \{ 'order-support': 'Question about an order'/.test(order) && /\(nlC \? TOPICS : TOPICS_EN\)/.test(order));
}

/* ── B32 / B34 / B35 · /admin ─────────────────────────────────────────────── */
console.log('\nB32 · B34 · B35 · /admin');
{
  const a = lees('src/lib/admin.js');
  ok('annuleren: zichtbare taalregel onder de reden', /Je reden komt letterlijk in de annuleringsmail en op de tijdlijn/.test(a));
  ok('namens bestellen: een telefoonveld in het formulier', /<input name="phone" type="tel" maxlength="40" required value="\$\{esc\(customer\.phone \|\| ''\)\}"/.test(a));
  ok('  en fouten in gewone taal met status 400', /Er staat geen geldig telefoonnummer bij/.test(a) && /Terug naar \$\{esc\(c\.brand/.test(a));
  const order = lees('functions/api/order.js');
  ok('een aanvraag zonder land (video, eigen look) gaat niet op de btw-lijst', /const aanvraagZonderPrijs = !effCountry && \['video', 'custom'\]\.includes\(svc\);/.test(order) && /if \(aanvraagZonderPrijs\) \{ review\.needsReview = false; review\.reasons = \[\]; \}/.test(order));
}

/* ── B37 · de taalknop neemt de zoekstring mee ────────────────────────────── */
console.log('\nB39 · planning: een dichte dag is geen volle dag');
{
  const ad = lees('src/lib/admin.js');
  ok('de dichte dag wordt eerst nagekeken', /dicht = blackouts\.has\(dag\);/.test(ad) && /if \(dag >= eerste && !dicht\) paar = windowFor/.test(ad));
  ok('  met de reden en de weg terug', /staat dicht\$\{waarom \? ` \(\$\{esc\(waarom\)\}\)` : ''\}\. Kies een andere dag, of zet hem weer open onderaan de planning\. \$\{terugLink\}/.test(ad));
  ok('  "Sluit een dag" staat er niet meer', /Sluit een dag of kies/.test(ad), false);
}

console.log('\nB46 · de vragenregel in de mail van een aanvraag');
{
  const { vragen } = await import('../src/lib/mailTemplate.js');
  ok('aanvraag NL: "mijn aanvraag"', decodeURIComponent(vragen('nl', 'VIS-X', { aanvraag: true })).includes('een vraag over mijn aanvraag VIS-X:'));
  ok('aanvraag EN: "my request"', decodeURIComponent(vragen('en', 'VIS-X', { aanvraag: true })).includes('a question about my request VIS-X:'));
  ok('bestelling blijft "mijn bestelling"', decodeURIComponent(vragen('nl', 'VIS-X')).includes('een vraag over mijn bestelling VIS-X:'));
  ok('order.js geeft aanvraag mee', /mailVragen\(lang, ref, \{ aanvraag \}\)/.test(lees('functions/api/order.js')));
}

console.log('\nB37 · taalwissel');
ok('Layout: zoekstring en anker gaan mee bij de taalklik', /a\.setAttribute\('href', a\.getAttribute\('href'\)\.split\('#'\)\[0\] \+ location\.search \+ location\.hash\)/.test(lees('src/layouts/Layout.astro')));

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exitCode = 1;
