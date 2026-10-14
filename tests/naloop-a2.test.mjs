/*
 * NALOOP RONDE A2 — 8 oktober 2026
 *
 * De kleine restpunten uit de verslagen van ronde A2. Geen server, geen browser:
 *   node tests/naloop-a2.test.mjs
 * De browserkant (ladderregel zonder kader, land op het abonnementsformulier,
 * voorrang op de bedankpagina) staat in tests/naloop-a2-browser.test.mjs, de
 * vanaf-bedragen in tests/vanaf-bedragen.test.mjs.
 */
import { readFileSync } from 'node:fs';

let pass = 0;
let fail = 0;
function ok(name, got, want = true) {
  const good = JSON.stringify(got) === JSON.stringify(want);
  if (good) pass++; else fail++;
  console.log(`${good ? ' ok  ' : ' FAIL'} ${name.padEnd(76)}${good ? '' : `verwacht ${JSON.stringify(want)}, kreeg ${JSON.stringify(got)}`}`);
}
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

/* ── 5 · STYLEPICKER: "GEKOZEN BIJ DE LOOK" ──────────────────────────────── */
console.log('\n5 · StylePicker zegt niet meer "op de lifestyle-pagina"');
{
  const sp = lees('src/components/order/StylePicker.astro');
  ok('NL: "Gekozen bij de look."', /vastHint: 'Gekozen bij de look\. Hier veranderen kan met één klik\.'/.test(sp));
  ok('EN: "Picked from the looks."', /vastHint: 'Picked from the looks\. Changing it here is one click\.'/.test(sp));
  ok('nergens meer "lifestyle-pagina" / "lifestyle page" in de hint', /vastHint: '[^']*(lifestyle-pagina|lifestyle page)/.test(sp), false);
}

/* ── 6 · STAP 2 BELOOFT NIET MEER DAT DE STUDIO WACHT ────────────────────── */
console.log('\n6 · laterLead: foto’s in Studio, na FOTO_WACHT_DAGEN maken we wat er is (V31-2 = c)');
{
  const { copy } = await import('../src/data/shots.js');
  const { FOTO_WACHT_DAGEN, inWoorden } = await import('../src/data/termijnen.js');
  const nl = copy('nl').laterLead;
  const en = copy('en').laterLead;
  ok('NL noemt VISUAILS Studio en "maken we wat er is"', /VISUAILS Studio/.test(nl) && /dan maken we wat er is\./.test(nl));
  ok('EN noemt VISUAILS Studio en "we make what we have"', /VISUAILS Studio/.test(en) && /we make what we have\./.test(en));
  ok('de termijn komt uit termijnen.js (NL)', nl.includes(`na ${inWoorden(FOTO_WACHT_DAGEN, 'nl')} dag`));
  ok('de termijn komt uit termijnen.js (EN)', en.includes(`after ${inWoorden(FOTO_WACHT_DAGEN, 'en')} day`));
  ok('de oude belofte is weg', /begint pas als ze er zijn|does not start until they arrive/.test(nl + en), false);
  ok('in de bron geen getypte "een dag"/"one day"', /laterLead: `[^`]*(een dag|één dag|one day)/.test(lees('src/data/shots.js')), false);
}

/* ── 7 · LEVERMAIL EN STUDIO REKENEN DE DATUMS OP ÉÉN PLEK ──────────────── */
console.log('\n7 · deliveryEmail() haalt de datums uit leverdatums.js');
{
  const admin = lees('src/lib/admin.js');
  const start = admin.indexOf('export function deliveryEmail(');
  const fn = admin.slice(start, admin.indexOf('\nexport function', start + 10) > 0 ? admin.indexOf('\nexport function', start + 10) : start + 6000);
  ok('admin.js importeert leverDatums uit ./leverdatums.js', /import \{ leverDatums \} from '\.\/leverdatums\.js';/.test(admin));
  ok('deliveryEmail() roept leverDatums(nu) aan', /leverDatums\(nu\)/.test(fn));
  ok('en rekent zelf niet meer met REVISIE_DAGEN of DELIVERY_DAYS', /(REVISIE_DAGEN|DELIVERY_DAYS) \* 86400000/.test(fn), false);
  const { deliveryEmail } = await import('../src/lib/admin.js');
  const { leverDatums } = await import('../src/lib/leverdatums.js');
  const { datum: mailDatum } = await import('../src/lib/mailTemplate.js');
  const nu = new Date('2026-10-08T23:30:00Z');
  const d = leverDatums(nu);
  for (const lang of ['nl', 'en']) {
    const html = deliveryEmail({ order: { ref: 'VIS-TEST', lang, name: 'Mara', service: 'catalog', details_json: '{}' }, link: 'https://visuails.com/o/x', n: 2, nu });
    ok(`levermail (${lang}) vlak voor middernacht UTC: revisie- en bewaardatum uit leverDatums()`,
      html.includes(mailDatum(d.revisieTot, lang)) && html.includes(mailDatum(d.bewaarTot, lang)));
  }
}

/* ── 8 · WAnummer KIEST HET LANDNUMMER UIT HET LAND VAN DE KLANT ─────────── */
console.log('\n8 · waNummer(): NL, BE en DE met hun eigen landnummer; bij twijfel geen wa.me');
{
  const { waNummer, ontbreektBlok } = await import('../src/lib/admin.js');
  /* Verzonnen nummers in de vorm van het land, geen echte. */
  ok('NL 06 12345678 → 31612345678', waNummer('06 12345678', 'NL'), '31612345678');
  ok('BE 0470 12 34 56 → 32470123456 (was 31…)', waNummer('0470 12 34 56', 'BE'), '32470123456');
  ok('DE 0151 23456789 → 4915123456789', waNummer('0151 23456789', 'DE'), '4915123456789');
  ok('al internationaal (+32) blijft zoals het is, ook bij land NL', waNummer('+32 470 12 34 56', 'NL'), '32470123456');
  ok('00-voorloper telt als internationaal', waNummer('0049 151 23456789', ''), '4915123456789');
  ok('"+31 (0)6 …" → zonder de (0)', waNummer('+31 (0)6 12345678', 'NL'), '31612345678');
  ok('land onbekend + 0 vooraan → twijfel: geen wa.me', waNummer('0470 12 34 56', ''), '');
  ok('land waar de 0 bij het nummer hoort (IT) → geen wa.me', waNummer('06 1234 5678', 'IT'), '');
  ok('zonder voorloper en zonder landnummer → geen wa.me', waNummer('612345678', 'ES'), '');
  ok('leeg → leeg', waNummer('', 'NL'), '');

  const lijst = [{ key: 'p1', index: 1, naam: 'Hoodie', mist: ['back'] }];
  const order = { ref: 'VIS-TEST', lang: 'nl', name: 'Mara Proef', brand: 'Proefmerk', email: 'mara@proefmerk.test' };
  const be = ontbreektBlok(order, lijst, { tel: '0470 12 34 56', nl: false, land: 'BE' });
  ok('ontbreektBlok (BE): wa.me/32…, niet 31…', /wa\.me\/32470123456\?/.test(be) && !/wa\.me\/31/.test(be));
  const twijfel = ontbreektBlok(order, lijst, { tel: '0470 12 34 56', nl: false, land: '' });
  ok('ontbreektBlok (land onbekend): alleen tel:, geen wa.me', /href="tel:0470123456"/.test(twijfel) && !/wa\.me/.test(twijfel));
  ok('  en geen "geen telefoonnummer bekend" terwijl er een nummer is', /Geen telefoonnummer bekend/.test(twijfel), false);
  const admin = lees('src/lib/admin.js');
  ok('planning: het land staat in de query en gaat mee naar waNummer()',
    /c\.phone AS c_phone, COALESCE\(o\.country, c\.country\) AS land/.test(admin) && /waNummer\(o\.phone \|\| o\.c_phone, o\.land\)/.test(admin));
}

/* ── 9 · VOORRANG OP DE BEDANKPAGINA ─────────────────────────────────────── */
console.log('\n9 · voorrang reist via sessionStorage naar de bedankpagina');
{
  const pl = lees('src/scripts/pipeline.js');
  const ia = lees('src/scripts/interactions.js');
  const ty = lees('src/components/ThankYouPage.astro');
  ok('pipeline.js zet vis-ty-voorrang (en haalt hem weg zonder voorrang)',
    /if \(voorrangAan\(\)\) sessionStorage\.setItem\('vis-ty-voorrang', '1'\);\s*else sessionStorage\.removeItem\('vis-ty-voorrang'\);/.test(pl));
  ok('interactions.js leest hem alleen via eigen() (dus alleen bij dit kenmerk)',
    /eigen\('vis-ty-voorrang'\) === '1'/.test(ia) && !/sessionStorage\.getItem\('vis-ty-voorrang'\)/.test(ia));
  ok('de bedankpagina draagt de voorrangsregel uit verder.js',
    /voorrang: leverregel\(\{ lang, levering: \{ soort: 'voorrang' \} \}\)/.test(ty) && /data-ty-verder-voorrang=\{VERDER_ALT\.voorrang\}/.test(ty));
  ok('cookiebeleid NL noemt voorrang bij de vis-ty-sleutels', /of je voorrang koos[^<]*<\/?[^>]*>?[\s\S]{0,120}vis-ty-/.test(lees('src/pages/nl/cookie-policy.astro')));
  ok('cookiebeleid EN noemt priority bij de vis-ty-sleutels', /whether you chose priority[\s\S]{0,140}vis-ty-/.test(lees('src/pages/cookie-policy.astro')));
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
