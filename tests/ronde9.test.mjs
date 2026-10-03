/**
 * Ronde 9 — de reparaties uit de live-doorloop van 2 oktober 2026, als regels.
 *
 * Elk blok noemt het F-nummer uit kladblok/WERKLIJST-RONDE-9.md. Waar het gedrag
 * in een module zit, wordt die module aangeroepen; waar het in de browser zit
 * (pipeline.js), wordt de bron gelezen — de echte doorloop staat in kladblok/_r9-*.mjs.
 */
import { readFileSync } from 'node:fs';
import { leverVakken, vakNaam, vakWoord, extraVakken } from '../src/data/levervakken.js';
import { deliveryReadme } from '../src/lib/delivery.js';
import { ordersView, weergaveStatus } from '../src/lib/account.js';

let fout = 0; let goed = 0;
/* Vergelijken in plaats van alleen "waar" (ronde 9): ok() met een derde argument
   negeerde dat argument, en dan is een lege lijst of een tekst altijd "waar". */
function gelijk(naam, w, v) { const p = JSON.stringify(w) === JSON.stringify(v); ok(naam, p, p ? '' : `verwacht ${JSON.stringify(v)} kreeg ${JSON.stringify(w)}`); }
function ok(naam, waar, extra = '') {
  if (waar) { goed++; console.log(` ok   ${naam}`); }
  else { fout++; console.log(` FAIL ${naam} ${extra}`); }
}
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

console.log('\nF17 · de vakjes per dienst');
{
  const life = leverVakken('lifestyle', {});
  ok('lifestyle levert drie beelden', life.length === 3 && life.map((v) => v.nl).join() === 'Beeld 1,Beeld 2,Beeld 3');
  const cat = leverVakken('catalog', { extra_slots: 'extra1:three-quarter,extra2:flat-lay' });
  ok('catalog: vier vaste plus de bijbestelde hoeken', cat.map((v) => v.id).join() === 'front,back,detail,worn,extra1,extra2');
  ok('een hoek heet naar de hoek', vakNaam('catalog', { extra_slots: 'extra1:three-quarter' }, 'extra1') === 'Driekwart', vakNaam('catalog', { extra_slots: 'extra1:three-quarter' }, 'extra1'));
  ok('een lifestylebeeld heet geen voorkant', vakNaam('lifestyle', null, 'front') === 'Beeld 1' && vakWoord('lifestyle', null, 'front', 'en') === 'image-1');
  ok('details als tekst werken ook', extraVakken('{"extra_slots":"extra1:flat-lay"}').length === 1);
  ok('rommel in extra_slots wordt genegeerd', extraVakken({ extra_slots: 'x:1,extra1:,extra2:flat-lay' }).map((v) => v.id).join() === 'extra2');
}

console.log('\nF17 · de leesmij in de zip noemt de namen die er echt staan');
{
  const leesmij = deliveryReadme({ order: { ref: 'VIS-TEST', lang: 'nl', service: 'lifestyle' }, entries: [] });
  ok('lifestyle: 1-beeld-1', /1-beeld-1/.test(leesmij) && !/voorkant/.test(leesmij));
  const zonder = deliveryReadme({ order: { ref: 'VIS-TEST', lang: 'nl' }, entries: [] });
  ok('zonder dienst: de vaste vier', /1-voorkant/.test(zonder));
}

console.log('\nF10 · de tegel en het filter tellen hetzelfde');
{
  const orders = [
    { id: 1, status: 'received', payment_status: 'paid', total_cents: 100 },
    { id: 2, status: 'received', payment_status: 'unpaid', total_cents: 100 },
    { id: 3, status: 'in_production', payment_status: 'paid', total_cents: 100 },
    { id: 4, status: 'delivered', payment_status: 'paid', total_cents: 100 },
  ];
  const t = { flAll: 'Alle', flEmpty: '', flClear: '', emptyOrders: '', ovInProduction: 'Bij ons in de maak' };
  const v = ordersView(t, 'nl', orders, 'bij_ons');
  ok('betaald-ontvangen en in productie, niet onbetaald of geleverd', v.shown.map((o) => o.id).join() === '1,3', v.shown.map((o) => o.id).join());
  ok('en het filter staat als knop in de rij', v.filters.some((f) => f.key === 'bij_ons' && f.active));
  ok('onbetaald blijft "wacht op betaling"', weergaveStatus(orders[1]) === 'awaiting_payment');
  const acc = lees('src/lib/account.js');
  ok('de tegel heet naar wat hij telt', /ovInProduction: 'Bij ons in de maak'/.test(acc));
  ok('de URL-parameter wordt geaccepteerd', /wanted === BIJ_ONS/.test(acc));
}

console.log('\nF15 · een verwerkte revisieronde zegt dat ook');
{
  const portal = lees('src/lib/portal.js');
  ok('portaal: aparte toestand na de herlevering', /rrDoneTitle: 'Je revisieronde is verwerkt'/.test(portal) && /const nogOpen = files\.some/.test(portal));
  ok('portaal: beelden op product en vak, niet op id', /files\.sort\(\(a, b\) => prod\(a\) - prod\(b\) \|\| plek\(a\) - plek\(b\)/.test(portal));
  const acc = lees('src/lib/account.js');
  ok('Studio: idem', /if \(!openNog && !nieuw\) ronde = \{ kind: 'done', h: t\.rdDoneH/.test(acc));
  ok('Studio: p10 na p9', /CAST\(SUBSTR\(f\.product_key, 2\) AS INTEGER\)/.test(acc));
}

console.log('\nF16 · de map belooft alleen de formaten die er zijn');
{
  const portal = lees('src/lib/portal.js');
  ok('portaal kiest de zin op de formaten', /drieFormaten \? t\.folderBody : t\.folderBodyKaal\(fmtLijst\)/.test(portal));
  const acc = lees('src/lib/account.js');
  ok('Studio belooft geen PNG/JPG/WebP meer', !/folderBody: 'Eén map per product, en daarin hetzelfde beeld als PNG/.test(acc));
}

console.log('\nF19 · een afgeronde bestelling zegt niet meer "bekijk ze"');
{
  const acc = lees('src/lib/account.js');
  ok('afgerond = geleverd + closed_at', /const afgerond = status === 'delivered' && !!o\.closed_at && !revising/.test(acc));
  ok('met een eigen zin', /closed: 'Deze bestelling is afgerond\./.test(acc));
}

console.log('\nF5, F6, F11, F26, O2, O5 · het bestelformulier');
{
  const pl = lees('src/scripts/pipeline.js');
  const mp = lees('src/components/order/ModelPicker.astro');
  ok('F5: het VISUAILS-vak is grijs tot het gekozen is', /\.mp-opt-any:not\(:has\(input:checked\)\) \.mp-thumb-merk \{ filter: grayscale\(1\)/.test(mp));
  ok('F5: geen voorkeuze (Lucas: eerst kiezen)', /checked=\{!verplicht\}/.test(mp));
  ok('F6: geen voorbeeldshirt in de strook van stap 5', !/const eg = q\('\.bg-eg'\)/.test(pl));
  ok('F11: afwijkende verhouding per beeld in het overzicht', /c\('sum\.ratioAfwijk'\)/.test(pl));
  ok('F26: dezelfde naam vervangt zijn eigen vak', /const zelfdeNaam = guess && card\.slots\[guess\]/.test(pl));
  ok('O2: modeltegels met srcset', /srcset=\{thumbSet\(m\)\}/.test(mp));
  ok('O5: extra hoeken en 4K tellen mee in de credits', /extrasCount\(\) \* \(Number\(ex\.photo\) \|\| 0\)/.test(pl));
  ok('F7: het land komt uit de select', /q\('select\[name="country"\]'\)/.test(pl));
}

console.log('\nO1, O3, O4 · mails en kleine teksten');
{
  ok('O1: "net al betaald?" bij de betaalknop', /Net al betaald\?/.test(lees('functions/api/order.js')));
  ok('O1: één woord voor de ronde', !/correctieronde/.test(lees('src/lib/invoiceMail.js').split('\n').filter((r) => !/nextModel:/.test(r)).join('\n')) && !/correctieronde, tot en met/.test(lees('src/lib/admin.js')));
  ok('O3: de knop zegt dat het WhatsApp is', /Extra foto’s sturen via WhatsApp/.test(lees('src/components/ThankYouPage.astro')));
  ok('O4: /account/profile gaat naar je gegevens', /'\/account\/profile': '\/account\/details\/'/.test(lees('src/lib/account.js')));
}

console.log('\nF18 · een beoordeelbeeld bij uploaden via /admin (besluit Lucas, 2 okt)');
{
  const adm = lees('src/lib/admin.js');
  const js = lees('public/admin-voorvertoning.js');
  ok('de admin-CSP staat alleen eigen scripts toe', /default-src 'none'; script-src 'self';/.test(adm) && !/unsafe-inline/.test(adm.match(/'content-security-policy':[\s\S]{0,400}/)[0]));
  ok('het script staat alleen op de bestelpagina', /voorvertoning \? '<script src="\/admin-voorvertoning\.js" defer><\/script>/.test(adm) && /title: order\.ref, body, voorvertoning: true/.test(adm));
  ok('alleen bij uploadformulieren van een levering', /\\\/admin\\\/orders\\\/\\d\+\\\/deliver\$/.test(js));
  ok('maximaal 1600 px, webp', /var MAX = 1600;/.test(js) && /'image\/webp'/.test(js));
  ok('geen fetch (CSP)', !/fetch\(/.test(js));
  ok('de server koppelt op naam en slaat preview_key op', /voorvertoningen\.get\(relPath\)/.test(adm) && /INSERT INTO files \(order_id, kind, r2_key, filename, bytes, product_key, shot, preview_key\)/.test(adm));
  ok('alleen webp tot 3 MB wordt aangenomen', /VOORVERTONING_MAX = 3 \* 1024 \* 1024/.test(adm) && /image\\\/webp/.test(adm));
}

console.log('\nTelefoon verplicht (besluit Lucas, 2 okt)');
{
  const acc = lees('src/lib/account.js');
  ok('Studio: phone in de verplichte set', /const REQUIRED = \[[^\]]*'phone'\]/.test(acc));
  ok('met dezelfde vormtoets', /form\.has\('phone'\) && !!one\('phone'\) && !normalizePhone\(one\('phone'\)\)/.test(acc));
  ok('en niet meer als optioneel getoond', /phone: veld\('phone', t\.detPhone, d\.phone, \{ type: 'tel', auto: 'tel', hint: t\.detPhoneHint \}\)/.test(acc));
}

console.log('\nF31 · de privélink kan alles in één keer goedkeuren');
{
  const portal = lees('src/lib/portal.js');
  ok('de actie bestaat en gebruikt het token, niet het formulier', /if \(action === 'approve-all'\)/.test(portal) && /WHERE order_id = \?1 AND kind = 'delivery' AND review_state = 'pending'[\s\S]{0,200}\.bind\(order\.order_id\)/.test(portal));
  ok('en rondt af als alles goed is', /approve-all[\s\S]{0,900}maybeCloseOrder\(env, order\.order_id\)/.test(portal));
  ok('de knop verschijnt pas vanaf twee open beelden', /nogOpen >= 2/.test(portal));
}

console.log('\nF32 · de menuknop op de telefoon heeft weer streepjes');
{
  const css = lees('src/styles/stijl22.css');
  const root = css.match(/:root \{ --s22-rand[\s\S]*?\}/)[0];
  ok('--inkt staat op :root (de balk staat buiten .s22)', /--inkt: var\(--ink\);/.test(root));
}

console.log('\nF33 · terug of verversen midden in het formulier vraagt het eerst');
{
  const pl = lees('src/scripts/pipeline.js');
  ok('een beforeunload-waarschuwing', /function bindVertrekWaarschuwing\(\)[\s\S]{0,200}addEventListener\('beforeunload'/.test(pl) && /bindVertrekWaarschuwing\(\);/.test(pl));
  ok('niet tijdens het versturen, niet op een lege stap 1', /if \(busy\) return;\s*if \(current <= 1 && !staged\.length\) return;/.test(pl));
}

console.log('\nF34 · de welkomstmail van de Studiobrief heeft meteen een weg eruit');
{
  const sb = lees('functions/api/studiobrief.js');
  const mail = lees('src/lib/mail.js');
  ok('een afmeldlink in de tekst', /meld me af/.test(sb) && /afmeldMailto\(lang\)/.test(sb));
  ok('en de kop List-Unsubscribe', /headers: \{ 'List-Unsubscribe': `<\$\{afmeldMailto\(lang\)\}>` \}/.test(sb));
  ok('sendMail laat alleen List-Unsubscribe(-Post) door', /\^List-Unsubscribe\(-Post\)\?\$/.test(mail));
}

console.log('\nO11, O13, O14 · teksten');
{
  ok('O11: geen "laten fotograferen" in de WhatsApp-tekst', !/producten laten fotograferen/.test(lees('src/components/order/OrderFlow.astro')));
  ok('O13: onbetaald → "Er wordt nog niets gemaakt"', /tyUnpaidFlow: 'Er wordt nog niets gemaakt/.test(lees('src/scripts/interactions.js')));
  ok('O14: stijlnaam zonder dubbel slug', /const zelfde = hit &&/.test(lees('src/lib/admin.js')));
}

console.log('\nF35 · de taal van het inlogformulier telt, ook als die Engels is');
{
  const acc = lees('src/lib/account.js');
  ok('twee plekken, allebei met en én nl', (acc.match(/const lang = formTaal === 'nl' \|\| formTaal === 'en' \? formTaal : negotiate\(request\);/g) || []).length === 2);
  ok('de oude nl-only-regel is weg', !/String\(form\.get\('lang'\) \|\| ''\) === 'nl' \? 'nl' : negotiate\(request\)/.test(acc));
  ok('O17: Engels zonder Nederlandse zinsbouw', /Once everything is approved, the order is complete/.test(acc));
  ok('O18: zonder btw als er geen btw is', /'incl\. btw' : 'zonder btw'/.test(lees('src/lib/admin.js')));
}

console.log('\nF37, O21 · de betaallink na de btw-controle zegt waarom er btw op staat');
{
  const { stuurBetaallink } = await import('../src/lib/betaallink.js');
  const echteFetch = globalThis.fetch;
  async function mailVoor(rij) {
    const verstuurd = [];
    globalThis.fetch = async (url, init) => { verstuurd.push(JSON.parse(init.body)); return new Response('{"id":"x"}', { status: 200 }); };
    const env = {
      MOLLIE_API_KEY: 'test_x', RESEND_API_KEY: 're_x',
      DB: { prepare: () => ({ bind: () => ({ first: async () => rij, run: async () => ({}) }), first: async () => rij, run: async () => ({}) }) },
    };
    try { await stuurBetaallink(env, rij.id, { origin: 'https://visuails.test' }); }
    finally { globalThis.fetch = echteFetch; }
    return verstuurd.map((m) => m.html || '').join('\n');
  }
  const basis = { id: 1, ref: 'VIS-TEST-001', email: 'klant@example.test', name: 'Erika Muster', lang: 'en', service: 'catalog', product_count: 3, total_cents: 26700, vat_rate: 0.21, payment_status: 'open', status: 'received', details_json: '{}' };
  const eu = await mailVoor({ ...basis, vat_number: 'DE123456789', vat_cents: 5607, vat_treatment: 'nl_21' });
  ok('EU-nummer niet bevestigd → de mail noemt VIES en verleggen', /could not confirm your VAT number/.test(eu) && /reverse-charge/.test(eu), eu.slice(0, 200));
  ok('en zegt niet meer "Everything is in order"', !/Everything is in order/.test(eu));
  ok('O21: met aanhef op voornaam', /Erika/.test(eu));
  const nl = await mailVoor({ ...basis, lang: 'nl', vat_number: 'NL123456789B01', vat_cents: 5607, vat_treatment: 'nl_21' });
  ok('NL-nummer met btw → gewoon "Alles klopt"', /Alles klopt/.test(nl) && !/VIES/.test(nl));
  const verlegd = await mailVoor({ ...basis, vat_number: 'DE811111111', vat_cents: 0, vat_treatment: 'reverse_charge' });
  ok('btw verlegd (0) → geen VIES-zin', /Everything is in order/.test(verlegd) && !/VIES/.test(verlegd));
}

console.log('\nO22 · /admin/orders/<id> stuurt door naar de bestellingspagina');
ok('een 303 naar /files', /const kaleOrder = path\.match\(\/\^\\\/admin\\\/orders\\\/\(\\d\+\)\\\/\?\$\/\);\s*if \(kaleOrder\) return seeOther\(`\/admin\/orders\/\$\{kaleOrder\[1\]\}\/files`\);/.test(lees('src/lib/admin.js')));

console.log('\nO19, O20 · btw-controle: bedanktkop en terugmelding in /admin/vat');
{
  const ty = lees('src/components/ThankYouPage.astro');
  ok('O19: een eigen kop bij nakijken (nl en en)', /titleReview: 'Bedankt — je bestelling staat erin\.'/.test(ty) && /titleReview: 'Thanks — your order is in\.'/.test(ty) && /data-ty-title-review=\{c\.titleReview\}/.test(ty));
  ok('O19: interactions zet hem bij ?nakijk=1', /params\.get\('nakijk'\) === '1' && !pay\)[\s\S]{0,400}tyTitleReview/.test(lees('src/scripts/interactions.js')));
  const adm = lees('src/lib/admin.js');
  ok('O20: vier uitkomsten terug naar de lijst', ['tegoed', 'mislukt', 'akkoord', 'afgewezen'].every((u) => adm.includes(`seeOther(terug('${u}'))`)));
  ok('O20: de lijst toont de regel, ref geschoond', /\$\{vatTerugmelding\(request\)\}/.test(adm) && /replace\(\/\[\^A-Z0-9-\]\/gi, ''\)/.test(adm));
}

console.log('\nF38 · bedanktpagina toont alleen het adres van DEZE bestelling');
{
  const ia = lees('src/scripts/interactions.js');
  const pl = lees('src/scripts/pipeline.js');
  ok('pipeline legt het kenmerk erbij', /sessionStorage\.setItem\('vis-ty-ref', tyRef\.toUpperCase\(\)\)/.test(pl));
  ok('interactions leest alleen via eigen()', (ia.match(/sessionStorage\.getItem\('vis-ty-/g) || []).length === 1 && /const eigen = \(k\) =>/.test(ia));
  ok('adres, aantal, soort, leverdata en F28 lopen via eigen()', ["eigen('vis-ty-mail')", "eigen('vis-ty-n')", "eigen('vis-ty-kind')", "eigen('vis-ty-venster')"].every((x) => ia.includes(x)));
}

console.log('\nF39 · omschrijving bij Mollie na een offerte');
{
  const { paymentDescription, ladderKey } = await import('../src/lib/quote.js');
  const pd = (service, extra = {}) => paymentDescription({ service: ladderKey(service), products: 1, ...extra }, 'nl');
  ok('eigen look: geen "undefined"', pd('custom', { ref: 'VIS-X', offerte: true }) === 'VISUAILS eigen look VIS-X');
  ok('video-offerte: geen telling die we niet kennen', pd('video', { ref: 'VIS-X', offerte: true }) === 'VISUAILS videoclips VIS-X');
  ok('onbekende dienst: nooit "undefined"', !/undefined/.test(pd('iets-nieuws')));
  ok('catalog ongewijzigd', pd('catalog') === 'VISUAILS — 1 product, catalogsets');
  ok('order-pay en Studio geven ref en offerte mee', /ref: o\.ref, offerte: o\.service === 'video' \|\| o\.service === 'custom'/.test(lees('functions/api/order-pay.js')) && /ref: order\.ref, offerte: order\.service === 'video' \|\| order\.service === 'custom'/.test(lees('src/lib/account.js')));
}

console.log('\nF40, O21 · na betalen van een offerte: hoe komen de foto\'s bij ons');
{
  const { invoiceEmail } = await import('../src/lib/invoiceMail.js');
  const inv = { number: 'PROEF-2026-0001' };
  const v = invoiceEmail({ lang: 'nl', order: { ref: 'VIS-X', service: 'video', name: 'Bram Bureau' }, invoice: inv, snap: { netCents: 13800, vatCents: 2898 } }).html;
  ok('video: "Beantwoord dan deze mail met de foto’s"', /Beantwoord dan deze mail met de foto’s/.test(v) && !/We maken je beelden en onze beeldredactie/.test(v));
  ok('O21: met aanhef', /Hoi Bram,/.test(v));
  const c = invoiceEmail({ lang: 'en', order: { ref: 'VIS-X', service: 'catalog' }, invoice: inv, snap: { netCents: 100, vatCents: 21 } }).html;
  ok('catalog: de gewone zin, zonder naam geen "Hi,"', /We make your images and our image editors check every one/.test(c) && !/Hi,/.test(c));
  ok('webhook leest de naam', /SELECT ref, email, name, lang, service, window_start, window_end FROM orders/.test(lees('functions/api/webhook/mollie.js')));
  const po = lees('src/lib/portal.js');
  ok('portaal: eigen lege staat voor video en eigen look', /emptyOfferte:/.test(po) && /emptyRequest:/.test(po) && /o\.payment_status,/.test(po));
  ok('Studio: levertijd uit de offerte', /fOfferte: 'Levertijd zoals afgesproken in de offerte/.test(lees('src/lib/account.js')));
}

console.log('\nF41 · eigen look na offerte is te betalen in Studio');
{
  const acc = lees('src/lib/account.js');
  ok('knop', /const payable = isPayableService\(o\.service\) \|\| o\.service === SAMPLE_SERVICE \|\| offerteBetaalbaar\(o\);/.test(acc));
  ok('en de route erachter', /isPayableService\(order\.service\) \|\| order\.service === SAMPLE_SERVICE \|\| offerteBetaalbaar\(order\)/.test(acc));
  ok('alleen met goedgekeurde offerte en een bedrag', /o\.service === 'custom' && String\(o\.review_state \|\| ''\) === REVIEW\.approved && Number\(o\.total_cents\) > 0/.test(acc));
  ok('review_state staat in de kaartquery', /vat_treatment, review_state, brand,/.test(acc));
}

console.log('\nO23 · aanvraagmails noemen wat er aangevraagd is');
{
  const { customerEmail } = await import('../functions/api/order.js');
  const v = customerEmail('nl', 'VIS-X', 'video', 'Bram Bureau', { aanvraag: true, details: { request: 'video', style: 'motion', clips: '2' } });
  ok('video: soort en aantal', /aanvraag voor video \(Motion, 2 clips\) ontvangen/.test(v));
  const l = customerEmail('en', 'VIS-X', 'custom', 'Bram', { aanvraag: true, details: { request: 'custom-look' } });
  ok('eigen look: niet "Aanvraag op maat"', /your custom look request/.test(l) && !/Custom request request/.test(l));
  const ord = lees('functions/api/order.js');
  ok('adminmail: "Nieuwe aanvraag · …" zonder wachtrij', /Nieuwe aanvraag · \$\{details\.request === 'custom-look'/.test(ord) && /tier && !isAanvraag/.test(ord));
  ok('Studio en betaalmail: "Eigen look"', /function dienstNaam\(o, lang\)/.test(lees('src/lib/account.js')) && /svcNaam = lang === 'nl' \? 'Eigen look' : 'Custom look'/.test(lees('src/lib/betaallink.js')));
}

console.log('\nO25 · een account met meer merken ziet per bestelling het merk');
{
  const acc = lees('src/lib/account.js');
  ok('alleen bij meer dan één merk', /if \(merken\.size > 1\) st\.orders\.forEach\(\(o\) => \{ o\._toonMerk = true; \}\);/.test(acc));
  ok('als eerste stukje in de kop', /\['brand', o\._toonMerk && o\.brand \? o\.brand : null\],/.test(acc));
}

console.log('\nF42 · een geleverde clip is in het portaal te bekijken');
{
  const po = lees('src/lib/portal.js');
  ok('<video> voor mp4/webm/mov', /const isClip = \/\\\.\(mp4\|webm\|mov\|m4v\)\$\/i\.test\(name\);/.test(po) && /<video src="\/o\/\$\{token\}\/f\/\$\{f\.id\}" controls preload="metadata" playsinline><\/video>/.test(po));
  ok("CSP staat media-src 'self' toe", /img-src 'self'; media-src 'self'; style-src/.test(po));
  ok('en de opmaak', /\.shot video \{/.test(lees('public/portal.css')));
}

console.log('\nF43, F44 · de factuur van een offerte');
{
  const { snapshotFromOrder } = await import('../src/lib/invoice.js');
  const env = {};
  const v = snapshotFromOrder({ lang: 'nl', service: 'video', total_cents: 13800, vat_cents: 2898, vat_rate: 0.21, details_json: JSON.stringify({ request: 'video', style: 'motion', clips: '2' }), name: 'Bram' }, env, { number: 'PROEF-1', date: '2026-10-02' });
  ok('F43: "Video (Motion) — volgens offerte"', v.lines[0].description === 'Video (Motion) — volgens offerte', v.lines[0].description);
  const l = snapshotFromOrder({ lang: 'en', service: 'custom', total_cents: 10000, vat_cents: 2100, vat_rate: 0.21, details_json: JSON.stringify({ request: 'custom-look', quote_kind: 'aanbetaling' }), name: 'Bram' }, env, { number: 'PROEF-2', date: '2026-10-02' });
  ok('F43: eigen look, aanbetaling', l.lines[0].description === 'Deposit · Custom look — design as quoted', l.lines[0].description);
  const c = snapshotFromOrder({ lang: 'nl', service: 'catalog', product_count: 3, total_cents: 26700, vat_cents: 0, vat_rate: 0, details_json: '{}', name: 'X' }, env, { number: 'PROEF-3', date: '2026-10-02' });
  ok('catalog ongewijzigd', c.lines[0].description === 'Catalog — 3 producten', c.lines[0].description);
  const inv = lees('src/lib/invoice.js');
  ok('F44: zonder adres op de bestelling het adres van de klant', /if \(!snap\.customer\.address\.length && order\.customer_id\)/.test(inv));
  ok('F44: admin waarschuwt, de offertemail wijst naar Je gegevens', /Geen factuuradres bij deze aanvraag/.test(lees('src/lib/admin.js')) && /const adresVraag = offerte && !String\(o\.address_line1/.test(lees('src/lib/betaallink.js')));
}

console.log('\nO26–O28 · admin en levermail bij video');
{
  const adm = lees('src/lib/admin.js');
  ok('O26: "Betaald: € 138,00" in Nederlandse notatie', /Betaald: \$\{esc\(mailBedrag\(Number\(order\.total_cents\) \|\| 0, 'nl'\)\)\} excl\. btw/.test(adm));
  ok('O27: "geleverde bestanden", en niet bij een video zonder producten', /'geleverd bestand heeft' : 'geleverde bestanden hebben'/.test(adm) && /unmapped && !\(order\.service === 'video' && !Number\(order\.product_count\)\)/.test(adm));
  const { deliveryEmail } = await import('../src/lib/admin.js');
  const m = deliveryEmail({ order: { lang: 'nl', name: 'Bram', service: 'video', ref: 'VIS-X' }, link: 'https://x', n: 2 });
  const tekst = String(m.html || m);
  ok('O28: levermail video zegt "2 clips"', /2 clips/.test(tekst) && !/2 beelden/.test(tekst) && /Bekijk je clips/.test(tekst));
}

console.log('\nF45 · telefoon en e-mail vóór verzenden, en terug van de server met de antwoorden erin');
{
  const ia = lees('src/scripts/interactions.js');
  ok('normalizePhone ook in de browser', /import \{ normalizePhone \} from '\.\.\/lib\/payer\.js';/.test(ia) && /!normalizePhone\(v\.value\)\) v\.setCustomValidity\(v\.dataset\.melding\)/.test(ia));
  ok('e-mail zoals isEmail() op de server', /v\.type === 'email' && v\.value\.trim\(\) && !\/\^\[\^\\s@\]\+@\[\^\\s@\]\+\\\.\[\^\\s@\]\+\$\/\.test/.test(ia));
  ok('antwoorden bewaren en terugzetten bij ?error=', /function initFormulierTerug\(\)/.test(ia) && /sessionStorage\.setItem\(TERUG_SLEUTEL/.test(ia) && /setTimeout\(initFormulierTerug, 0\)/.test(ia));
  ok('niet voor het bestelformulier, niet de honeypot', /f\.id !== 'pl-form'/.test(ia) && /el\.name === 'company_hp'/.test(ia));
  ok('merkmodel springt naar de stap van het veld', /addEventListener\('vis:toonveld'/.test(lees('src/components/BrandModelBrief.astro')));
  const { normalizePhone } = await import('../src/lib/payer.js');
  ok('"0612" is geen nummer, "06 1234 5678" wel', !normalizePhone('0612') && !!normalizePhone('06 1234 5678'));
}

console.log('\nO30 · merkmodel: bedanktpagina, bevestiging en betaalmail');
{
  ok('redirect met ?soort=merkmodel', /value=\{lp\('\/thank-you'\) \+ '\?soort=merkmodel'\}/.test(lees('src/components/BrandModelBrief.astro')));
  ok('bedanktpagina: richtingen, geen levertijd', /params\.get\('soort'\) === 'merkmodel'/.test(lees('src/scripts/interactions.js')) && /flowModel:/.test(lees('src/components/ThankYouPage.astro')));
  const { invoiceEmail } = await import('../src/lib/invoiceMail.js');
  const m = invoiceEmail({ lang: 'nl', order: { ref: 'VIS-X', service: 'brand-model', name: 'Mila Model' }, invoice: { number: 'PROEF-1' }, snap: { netCents: 45000, vatCents: 9450 } }).html;
  ok('betaalmail: richtingen en correctieronde, geen "per beeld goed"', /een paar richtingen/.test(m) && !/per beeld goed/.test(m));
  const { customerEmail } = await import('../functions/api/order.js');
  const c = customerEmail('nl', 'VIS-X', 'brand-model', 'Mila', {});
  ok('bevestiging: correctieronde, geen revisieronde per bestelling', /één correctieronde/.test(c) && !/1 revisieronde per bestelling/.test(c));
}

console.log('\nF47–F49 · merkmodel in /admin');
{
  const adm = lees('src/lib/admin.js');
  ok('F47: briefing op de bestelpagina', /<h2>Briefing merkmodel<\/h2>/.test(adm) && /\$\{merkmodelBlok\}/.test(adm));
  ok('F48: vastleggen mailt de klant en rondt af, één keer', /if \(status === 'locked' && model\.status !== 'locked' && model\.customer_id\)/.test(adm) && /Je merkmodel staat klaar/.test(adm) && /SET status = 'delivered', delivered_at = COALESCE/.test(adm));
  ok('F49: naam en gezicht i.p.v. "c5"', /eigenModellen\.set\(`c\$\{m\.id\}`, m\)/.test(adm) && /class="keuze-gezicht"/.test(adm) && /\(eigen merkmodel\)/.test(adm));
}

console.log('\nF50 · abonnement zonder account: het adres zoals getypt, en "al een abonnement" met uitleg');
{
  const pl = lees('functions/api/plan.js');
  ok('geen normalizeEmail() als accountadres', !/normalizeEmail\(/.test(pl.replace(/\/\*[\s\S]*?\*\//g, '')) && /const email = tekst\(form\.get\('email'\), 254\)\.toLowerCase\(\);/.test(pl));
  ok('/account/plan wordt ?fout=bestaat', /antwoord\.headers\.get\('Location'\) === '\/account\/plan'/.test(pl) && /return terug\('bestaat', lang\);/.test(pl));
  const pp = lees('src/components/order/PlanPicker.astro');
  ok('de zin staat in beide talen', /bestaat: 'Op dit e-mailadres loopt al een abonnement\./.test(pp) && /bestaat: 'There is already a plan on this email address\./.test(pp));
  ok('antwoorden terug na ?fout= op het abonnementsformulier', /form\[action\$="\/api\/plan"\]/.test(lees('src/scripts/interactions.js')));
}

console.log('\nF51, F52 · tegoed: boeken op kenmerk, en het juiste bedrag in stap 5');
{
  const adm = lees('src/lib/admin.js');
  ok('F51: het kenmerk VIS-… telt bij tegoed boeken', /const isRef = \/\^VIS-\[A-Z0-9-\]\{3,\}\$\/i\.test\(rauwOrder\);/.test(adm) && /SELECT id FROM orders WHERE ref = \?1 AND customer_id = \?2/.test(adm) && /placeholder="VIS-…"/.test(adm));
  const pl = lees('src/scripts/pipeline.js');
  ok('F52: tegoed van de ingelogde klant gaat eraf in de betaalregel', /tegoedMeCents = cents > 0 \? cents : 0;/.test(pl) && /c\('sum\.tegoedRest', \{ tegoed: euro\(tegoed\), rest: euro\(rest\) \}\)/.test(pl));
  const of = lees('src/components/order/OrderFlow.astro');
  ok('F52: teksten in beide talen en doorgegeven aan de browser', /tegoedRest: '− \{tegoed\}: je betaalt bij Mollie \{rest\}'/.test(of) && /tegoedRest: '− \{tegoed\}: you pay \{rest\} at Mollie'/.test(of) && /'sum\.tegoed', 'sum\.tegoedRest', 'sum\.tegoedNul', 'sum\.tegoedAf'/.test(of));
}

console.log('\nF53, O36, O37 · annuleren na betalen');
{
  const adm = lees('src/lib/admin.js');
  ok('F53: admin zegt in welke stand het geld is', /function geldTerugStand\(o\)/.test(adm) && /terugbetaling aangevraagd bij Mollie/.test(adm) && (adm.match(/geldTerugStand\(/g) || []).length >= 3);
  ok('O36: geen uploadblok en geen upload op een geannuleerde bestelling', /order\.status === 'cancelled' \? `<h2>Het werk erin zetten<\/h2>/.test(adm) && /if \(order\.status === 'cancelled'\) \{\s*return html\(page\(\{ title: 'Admin', body: errorBody\(`\$\{order\.ref\} is geannuleerd/.test(adm));
  const acc = lees('src/lib/account.js');
  ok('F53: Studio zegt waar het geld is', /cancelledRefunding: 'Deze bestelling is geannuleerd\. Je betaling komt terug/.test(acc) && /cancelledRefunding: 'This order was cancelled\. Your payment is on its way back/.test(acc) && /const now = geannuleerdGeld \? geannuleerdGeld :/.test(acc));
  const st = lees('functions/api/order-status.js');
  ok('O37: order-status geeft refund mee', /const refund = cancelled && lastPaid/.test(st) && /\n    refund,\n/.test(st));
  const ty = lees('src/components/ThankYouPage.astro');
  ok('O37: bedankpagina zegt dat het geld terugkomt', /handPTerug: 'Je betaling kwam binnen nadat deze bestelling al geannuleerd was\./.test(ty) && /handPTerug: 'Your payment came in after/.test(ty) && /data-ty-hand-terug=\{c\.handPTerug\}/.test(ty));
  ok('O37: script wisselt de zin, ook als de webhook later is', /if \(d\.refund && handP && handP\.dataset\.tyHandTerug\)/.test(lees('src/scripts/interactions.js')));
}

console.log('\nF54, F55, O39 · klant via WhatsApp');
{
  const adm = lees('src/lib/admin.js');
  ok('F54: land is een keuzelijst, ook bij corrigeren', /function landKeuze\(id, gekozen\)/.test(adm) && /<label>Land \$\{landKeuze\('', 'NL'\)\}<\/label>/.test(adm) && /\$\{landKeuze\('cd-country', customer\.country\)\}/.test(adm) && !/name="country" type="text" maxlength="2"/.test(adm));
  ok('F54: server weigert een land buiten de lijst', /if \(!LANDEN_ADMIN\.some\(\(c\) => c\.id === country\)\)/.test(adm) && /if \(!LANDEN_ADMIN\.some\(\(l\) => l\.id === land\)\)/.test(adm));
  ok('F54: adres en land te corrigeren', /address_line1 = \?8, postal_code = \?9, city = \?10, country = \?11/.test(adm));
  ok('O39: jouw notitie, niet "bericht van de klant"', /rij\(d\.placed_by \? 'Jouw notitie \(ziet de klant\)' : 'Bericht van de klant', berichtRegel\)/.test(adm));
  const acc = lees('src/lib/account.js');
  ok('F55: Studio heeft een fotoroute, alleen voor de eigen bestelling', /const fotos = \/\^\\\/account\\\/orders\\\/\(\\d\+\)\\\/fotos\$\/\.exec\(path\);/.test(acc) && /WHERE id = \?1 AND customer_id = \?2'\s*\)\.bind\(orderId, customer\.customer_id\)/.test(acc) && /`aangeleverd\/\$\{o\.ref\}\//.test(acc));
  ok('F55: studio hoort het', /notifyFotosToegevoegd\(env, \{ orderId, count: n \}\)/.test(acc) && /export async function notifyFotosToegevoegd/.test(lees('src/lib/notify.js')));
  ok('F55: formulier op de kaart', /v\.fotos && \(/.test(lees('src/components/studio/Bestelling.astro')) && /enctype="multipart\/form-data"/.test(lees('src/components/studio/Bestelling.astro')));
  ok('O40: terug van Mollie zegt de kaart dat de betaling verwerkt wordt', /successUrl: `\$\{origin\}\$\{home\}\?order=\$\{orderId\}&terug=1#order-\$\{orderId\}`/.test(acc) && /searchParams\.get\('terug'\) === '1' && v\.status === 'awaiting_payment'/.test(lees('src/components/studio/Bestelling.astro')));
  ok('F55: bevestigingsmail wijst naar Studio als er geen foto\'s zijn', /fotos: \(!staged\.length && \['catalog', 'lifestyle', 'drop'\]\.includes\(svc\)\)/.test(lees('functions/api/order.js')));
}

console.log('\nklanttype 13 · alleen het toetsenbord');
{
  const pl = lees('src/scripts/pipeline.js');
  ok('focus valt niet weg als een productkaart dichtklapt', /focusTerug = ready && card\.el\.contains\(document\.activeElement\)/.test(pl) && /if \(focusTerug\) \{/.test(pl));
  ok('productnaam heeft een zichtbare focusrand', /\.pu-name:focus-visible\) \{ border-bottom-color: var\(--accent\); box-shadow: 0 1px 0 0 var\(--accent\); \}/.test(lees('src/components/order/ProductUploader.astro')));
}

console.log('\nklanttype 14 · tablet, lifestyle');
{
  const po = lees('src/lib/portal.js');
  ok('O44: revisieblok wijst naar boven, met meervoud', /de nieuwe versies staan'\} hierboven, bij je bestanden/.test(po) && /the new version\$\{n === 1 \? ' is' : 's are'\} above/.test(po) && !/de nieuwe versie staat hieronder/.test(po));
}

console.log('\nF57, F58 · de map en de terugknop');
{
  const dl = lees('src/lib/delivery.js');
  ok('F57: leesmij beschrijft een platte map zoals hij is', /const plat = mappen\.length === 0;/.test(dl) && /Alle beelden staan los in deze map/.test(dl) && /\$\{productTal\} \$\{productTal === 1 \? 'product' : 'producten'\}/.test(dl) && /meerFormaten \? \[/.test(dl));
  const pl = lees('src/scripts/pipeline.js');
  ok('F58: elke stap een #stap-N via Astro navigate()', /import\('astro:transitions\/client'\)\.then\(\(m\) => \{ astroNavigate = m && m\.navigate; \}\)/.test(pl) && /const doel = `#stap-\$\{to\}`;/.test(pl) && /if \(!eersteStapGetoond\) \{/.test(pl));
  ok('F58: popstate zet de stap terug, vooruit alleen langs geldige stappen', /window\.addEventListener\('popstate', \(\) => \{\s*if \(!document\.contains\(form\)\) return;/.test(pl) && /if \(!validateStep\(i\)\) \{\s*show\(i, \{ uitHistorie: true \}\);/.test(pl));
}

console.log('\nF59 · bestelmatrix');
{
  ok('F59: meer kanalen blijven allemaal staan', /details\[k\] = \(k === 'channels' && details\[k\]\) \? `\$\{details\[k\]\},\$\{cleaned\}` : cleaned;/.test(lees('functions/api/order.js')));
  ok('admin: eigen achtergrondkleur heet "Eigen kleur"', /id === 'custom' \? 'Eigen kleur'/.test(lees('src/lib/admin.js')));
}

console.log('\nO49–O51 · Studio');
{
  ok('O49: tabbalk breekt af op de telefoon', /flex-direction: row; flex-wrap: wrap; gap: \.3rem; overflow-x: visible;/.test(lees('src/styles/studio.css')));
  const acc = lees('src/lib/account.js');
  ok('O50: geen betaalknop op de btw-lijst', /!opBtwLijst \? `\/account\/orders\/\$\{o\.id\}\/pay` : ''/.test(acc) && /btwLijst: 'Je bestelling is binnen\. We kijken eerst je btw-gegevens na;/.test(acc));
  ok('O51: na de bewaartermijn zegt de Nu-regel dat', /closedExpired: 'Deze bestelling is afgerond en de downloadtermijn is voorbij\./.test(acc) && /allesVerlopen \? \(t\.flowNow\.closedExpired/.test(acc));
}

console.log('\nO52 · /admin op de telefoon');
{
  ok('O52: tabellen breken woorden niet meer om de twee letters af onder 720 px', /table\.files td, table\.tbl td, table\.ag-tabel td \{ overflow-wrap: normal; word-break: normal; \}/.test(lees('public/admin.css')));
}

console.log('\nF62 · terugboeking (chargeback)');
{
  const wh = lees('functions/api/webhook/mollie.js');
  ok('F62: de webhook leest amountChargedBack vóór de dubbel-poort', wh.indexOf('await meldChargeback(env, order, payment, ref);') > 0 && wh.indexOf('await meldChargeback(env, order, payment, ref);') < wh.indexOf("duplicate delivery for"));
  ok('F62: één keer per bedrag, vastgelegd in admin_log', /action = 'payment\.chargeback' AND order_id = \?1 AND detail = \?2/.test(wh) && /notifyChargeback\(env, \{ orderId: order\.id/.test(wh));
  ok('F62: studiomail en regel op de bestelpagina', /export async function notifyChargeback/.test(lees('src/lib/notify.js')) && /\$\{chargebackBlok\}/.test(lees('src/lib/admin.js')));
}

console.log('\nO54 · lage-score-mail');
ok('O54: de zin noemt de echte score', /wie een \$\{score\} geeft en niets typt/.test(lees('src/lib/feedback.js')) && !/wie een 1 of 2 geeft/.test(lees('src/lib/feedback.js')));

/* Dode bestanden: in de map, maar door niets geïmporteerd en dus niet in de
   site. HomeV2.astro is de voorpagina van vóór sectie 21 (nu Voorpagina.astro);
   hij staat nog in de map en hoort weg (zie de werklijst, 3 oktober). Tot dan
   telt hij hier niet mee — een woord of maat erin bereikt geen bezoeker. */
const DOOD = /(^|\/)HomeV2\.astro$/;

console.log('\nO62 · leesbaarheidsvloer 11,5 px');
{
  const { readdirSync, statSync } = await import('node:fs');
  const loop = (d) => readdirSync(new URL(`../${d}`, import.meta.url)).flatMap((n) => { const pad = `${d}/${n}`; return statSync(new URL(`../${pad}`, import.meta.url)).isDirectory() ? loop(pad) : (/\.(css|astro)$/.test(n) && !DOOD.test(pad) ? [pad] : []); });
  const te = [];
  for (const f of [...loop('src'), 'public/account.css', 'public/admin.css', 'public/portal.css', 'public/admin-voorvertoning.css']) {
    const t = lees(f);
    for (const m of t.matchAll(/font-size: ?(0?\.\d+)rem/g)) if (Number(m[1]) < 0.72) te.push(`${f} ${m[0]}`);
    for (const m of t.matchAll(/font-size: ?(\d+(?:\.\d+)?)px/g)) if (Number(m[1]) < 11.5 && !/Stations\.astro/.test(f)) te.push(`${f} ${m[0]}`);
  }
  gelijk('O62: geen tekst kleiner dan .72rem / 11,5 px in de stijlen (het vinkje in Stations is een teken, geen tekst)', te, []);
}

console.log('\nRonde 9 · melding bovenaan Studio');
{
  const { d1, verseDb } = await import('./lib/d1sqlite.mjs');
  const M = await import('../src/lib/melding.js');
  const { db } = verseDb(new URL('../schema.sql', import.meta.url));
  const env = { DB: d1(db) };
  const nu = new Date('2026-10-03T10:00:00Z');
  gelijk('zonder melding: null', await M.leesMelding(env, nu), null);
  gelijk('zonder soort geweigerd', (await M.zetMelding(env, { soort: 'x', nl: 'a' }, nu)).ok, false);
  gelijk('zonder Nederlandse tekst geweigerd', (await M.zetMelding(env, { soort: 'info', nl: '  ' }, nu)).ok, false);
  gelijk('eindtijd in het verleden geweigerd', (await M.zetMelding(env, { soort: 'info', nl: 'a', tot: '2026-10-01T10:00' }, nu)).ok, false);
  ok('storing met eindtijd gezet', (await M.zetMelding(env, { soort: 'storing', nl: 'Downloads haperen.\n<b>x</b>', en: '', tot: '2026-10-05T18:00' }, nu)).ok, true);
  const m = await M.leesMelding(env, nu);
  gelijk('gelezen: soort, één regel, eindtijd in UTC (Amsterdam 18:00 = 16:00Z)', [m.soort, m.nl, m.tot], ['storing', 'Downloads haperen. <b>x</b>', '2026-10-05T16:00:00.000Z']);
  gelijk('Engels valt terug op Nederlands', M.meldingTekst(m, 'en'), 'Downloads haperen. <b>x</b>');
  gelijk('na de eindtijd: weg', await M.leesMelding(env, new Date('2026-10-05T16:00:01Z')), null);
  gelijk('vervangen houdt één rij', ((await M.zetMelding(env, { soort: 'druk', nl: 'Druk', en: 'Busy' }, nu)).ok && db.prepare("SELECT COUNT(*) AS n FROM app_settings WHERE key='studio_melding'").get().n), 1);
  await M.wisMelding(env);
  gelijk('weghalen', await M.leesMelding(env, nu), null);
  gelijk('kapotte database breekt Studio niet', await M.leesMelding({ DB: { prepare() { throw new Error('weg'); } } }, nu), null);
  const lay = lees('src/layouts/StudioLayout.astro');
  gelijk('Studio-schil en inlogkaart tonen hem (Astro zet de tekst zelf om, dus geen HTML-injectie)', (lay.match(/meldingTxt && <p class=\{`st-banner is-\$\{melding\.soort\}`\} role="status">/g) || []).length, 2);
  const adm = lees('src/lib/admin.js');
  ok('/admin/melding: lezen, zetten en weghalen, met logboek', /if \(path === '\/admin\/melding'\) return renderMelding\(context, url\);/.test(adm) && /if \(path === '\/admin\/melding'\) return handleMeldingPost\(context, admin\);/.test(adm) && /'melding\.zet'/.test(adm));
  ok('de klanttekst gaat in /admin door esc()', /\$\{esc\(m\.nl\)\}/.test(adm) && /\$\{esc\(view\.studioMelding\.nl\)\}/.test(adm));
}

console.log('\nRonde 9 · woordkeus');
{
  const { readdirSync, statSync } = await import('node:fs');
  const loop = (d) => readdirSync(new URL(`../${d}`, import.meta.url)).flatMap((n) => { const pad = `${d}/${n}`; return statSync(new URL(`../${pad}`, import.meta.url)).isDirectory() ? loop(pad) : (/\.(js|astro|mjs)$/.test(n) && !DOOD.test(pad) ? [pad] : []); });
  const bestanden = [...loop('src'), ...loop('functions'), 'scripts/llms-txt.mjs'];
  const tekst = (f) => lees(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1');
  const zoek = (re) => bestanden.filter((f) => re.test(tekst(f)));
  gelijk('"specialist" staat nergens meer in een klanttekst', zoek(/\b[Ss]pecialist/), []);
  gelijk('"Lucas" alleen nog op /about, in de juridische pagina\'s en in werknotities', zoek(/['"`][^'"`\n]*\bLucas\b[^'"`\n]*['"`]/).filter((f) => !/AboutPage|privacy|terms|data-processing/.test(f)), []);
  ok('NL: carrousel met dubbele r', zoek(/carousels?: 'carousels'/).length === 1 && /carousels: 'carrousels'/.test(lees('src/components/PlansPage.astro')));
}

console.log('\nF63 · geen herinnering aan wat dezelfde nacht vervalt');
{
  const { d1, verseDb } = await import('./lib/d1sqlite.mjs');
  const { tasks } = await import('../cron/index.js');
  const { db } = verseDb(new URL('../schema.sql', import.meta.url));
  db.exec("INSERT INTO customers (id, email, brand, name, country) VALUES (1, 'k@voorbeeld.nl', 'K', 'K', 'NL')");
  const rij = (id, ref, dagen) => db.exec(`INSERT INTO orders (id, ref, customer_id, service, status, tier, product_count, email, lang, total_cents, vat_cents, vat_rate, payment_status, created_at)
    VALUES (${id}, '${ref}', 1, 'catalog', 'received', 'unattended', 1, 'k@voorbeeld.nl', 'nl', 8900, 1869, 0.21, 'unpaid', datetime('now', '-${dagen} days'))`);
  rij(1, 'VIS-DAG4-0001', 4); rij(2, 'VIS-DAG20-002', 20);
  const echte = globalThis.fetch; const gezien = [];
  globalThis.fetch = async (u, o = {}) => { gezien.push(String(u)); return String(u).endsWith('/v2/payments')
    ? new Response(JSON.stringify({ id: 'tr_1', status: 'open', _links: { checkout: { href: 'https://www.mollie.com/checkout/tr_1' } } }), { status: 201, headers: { 'content-type': 'application/json' } })
    : new Response('{"id":"x"}', { status: 200, headers: { 'content-type': 'application/json' } }); };
  const regel = await tasks.remindUnpaid({ DB: d1(db), MOLLIE_API_KEY: 'test_abcdefghijklmnopqrstuvwxyz0123', RESEND_API_KEY: 're_x', FROM_EMAIL: 'x <o@visuails.com>', PUBLIC_ORIGIN: 'https://visuails.com' });
  globalThis.fetch = echte;
  gelijk('F63: dag 4 krijgt een herinnering, dag 20 (vervalt vannacht) niet', regel, '1 betaalherinnering verstuurd: VIS-DAG4-0001.');
}

console.log(`\n${goed}/${goed + fout} geslaagd`);
if (fout) { console.log(`${fout} FAILED`); process.exit(1); }
