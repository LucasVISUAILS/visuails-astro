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
  ok('O1: één woord voor de ronde', !/correctieronde/.test(lees('src/lib/invoiceMail.js')) && !/correctieronde, tot en met/.test(lees('src/lib/admin.js')));
  ok('O3: de knop zegt dat het WhatsApp is', /Extra foto’s sturen via WhatsApp/.test(lees('src/components/ThankYouPage.astro')));
  ok('O4: /account/profile gaat naar je gegevens', /'\/account\/profile': '\/account\/details\/'/.test(lees('src/lib/account.js')));
}

console.log(`\n${goed}/${goed + fout} geslaagd`);
if (fout) { console.log(`${fout} FAILED`); process.exit(1); }
