/* VISUAILS — levering 118 (17 november 2026), herstel na het naspelen (N4 → hersteller H2).
 *
 *   node tests/levering-118-herstel.test.mjs     (geen build: echte functies met een SQLite-D1, en de bron)
 *
 * De punten uit "Te herstellen" (lv118/naspelen-118.md §4) die zonder browser te toetsen zijn:
 *   B1-01  een aangenomen twijfelproef (details.proef_twijfel) staat op de /admin-bestelpagina en in Nu doen;
 *   #7     "Bestel je elders in de EU zonder btw-nummer…" alleen als die uitkomst kan (zetNaEu in pipeline.js);
 *   #8     Studio zegt bij een bestelling zonder foto's niet meer "je bestelling en je bestanden binnen";
 *   koppen de kortere koppen (NL en EN) en de maatregels voor 320 – 390 px.
 * P1-06, P11-04, P11-07 en het tellen van de regels doet tests/levering-118-herstel-browser.test.mjs (na een build).
 * Verzonnen namen en adressen (Teststraat 1, 1234 AB Teststad); niets hiervan bestaat.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { adminGet } from '../src/lib/admin.js';
import { nuDoen, nuDoenHtml, nuDoenTekst, soortLabel, watTekst, knopVoor } from '../src/lib/nudoen.js';
import { nuZin, NU_TEKST } from '../src/lib/nuzin.js';
import { mintToken, hashToken } from '../src/lib/token.js';
import { isEu, HOME_COUNTRY } from '../src/data/vat.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
let pass = 0, fail = 0;
const ok = (naam, v, extra = '') => { if (v) { pass++; console.log(` ok   ${naam}`); } else { fail++; console.log(` FAIL ${naam} ${extra}`); } };
const lees = (p) => readFileSync(path.join(ROOT, p), 'utf8');

/* ── B1-01 · DE TWIJFELPROEF IN /ADMIN ──────────────────────────────────────────────────────────── */
console.log('\nB1-01 · een aangenomen twijfelproef op de bestelpagina en in Nu doen');
{
  const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
  ok('het schema laadt', mislukt.length === 0, mislukt.join('; '));
  const env = { DB: d1(db), PUBLIC_ORIGIN: 'https://visuails.com' };
  const twijfel = 'zelfde bedrijfsnaam en postcode als eerdere betaalde proef VIS-HS-0001';
  db.exec(`
    INSERT INTO customers (id, email, name, brand, country) VALUES (1, 'proef@example.com', 'Test Persoon', 'Test Proefhuis BV', 'NL');
    INSERT INTO orders (id, ref, customer_id, service, status, name, brand, email, total_cents, vat_cents, lang, product_count, payment_status, country, review_state, created_at, paid_at, details_json) VALUES
      (1, 'VIS-HS-0001', 1, 'test-sample', 'delivered', 'Test Persoon', 'Test Proefhuis BV', 'proef@example.com', 100, 21, 'nl', 1, 'paid', 'NL', 'approved', datetime('now','-9 days'), datetime('now','-9 days'), '{}'),
      (2, 'VIS-HS-0002', 1, 'test-sample', 'received',  'Test Persoon', 'Test Proefhuis B.V.', 'ander-proef@example.com', 100, 21, 'nl', 1, 'paid', 'NL', 'approved', datetime('now','-2 hours'), datetime('now','-2 hours'), '${JSON.stringify({ proef_twijfel: twijfel, address: 'Teststraat 1', postal_code: '1234 AB', city: 'Teststad' })}'),
      (3, 'VIS-HS-0003', 1, 'test-sample', 'received',  'Test Persoon', 'Ander Merk', 'derde-proef@example.com', 100, 21, 'nl', 1, 'paid', 'NL', 'approved', datetime('now','-3 hours'), datetime('now','-3 hours'), '{}');
  `);
  const lijst = await nuDoen(env.DB);
  ok('Nu doen leest zonder fout', lijst.fout === null, lijst.fout);
  const r2 = lijst.regels.find((r) => r.ref === 'VIS-HS-0002');
  const r3 = lijst.regels.find((r) => r.ref === 'VIS-HS-0003');
  ok('de twijfelproef staat in Nu doen, met de reden uit details', !!r2 && r2.proefTwijfel === twijfel, JSON.stringify(r2));
  ok('  een gewone proef niet als twijfel', !!r3 && !r3.proefTwijfel);
  ok('  het etiket is "Proef nakijken" (een gewone: "Betaald, niet opgepakt")', soortLabel(r2) === 'Proef nakijken' && soortLabel(r3) === 'Betaald, niet opgepakt');
  ok('  de tekst noemt de reden', watTekst(r2).includes(`mogelijk een tweede proef (${twijfel})`));
  const k = knopVoor(r2, 'dashboard');
  ok('  op het dashboard: Nakijken, naar de regel op de bestelpagina (geen POST)', k.label === 'Nakijken' && k.href === '/admin/orders/2/files#proef-twijfel' && !k.post, JSON.stringify(k));
  ok('  op de bestelpagina blijft Oppakken de volgende stap', knopVoor(r2, 'bestelling').label === 'Oppakken' && knopVoor(r3, 'dashboard').label === 'Oppakken');
  const html = nuDoenHtml(lijst);
  ok('  in de HTML: "Nakijken" als navigatie (data-rol="navigeren")', /data-soort="oppakken">\s*<span class="nd-soort">Proef nakijken<\/span>[\s\S]*?data-rol="navigeren" href="\/admin\/orders\/2\/files#proef-twijfel"/.test(html));
  ok('  en in het nachtrapport', nuDoenTekst(lijst).some((l) => l.includes('Proef nakijken · VIS-HS-0002')));

  db.exec("INSERT INTO admin_users (id, email, password_hash) VALUES (1, 'studio@example.com', 'x')");
  const token = await mintToken();
  db.prepare(`INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (1, 1, ?, '2099-01-01T00:00:00Z')`).run(await hashToken(token));
  const get = async (pad) => (await adminGet({ request: new Request(`https://visuails.com${pad}`, { headers: { cookie: `vis_admin=${token}` } }), env, waitUntil() {} })).text();
  const pagina = await get('/admin/orders/2/files');
  ok('de bestelpagina: een rij "Proef" met "Nakijken" en de reden, met het anker #proef-twijfel', /<dt>Proef<\/dt><dd><strong class="or-botcheck" id="proef-twijfel">Nakijken<\/strong> — mogelijk een tweede proef: zelfde bedrijfsnaam en postcode als eerdere betaalde proef VIS-HS-0001\./.test(pagina));
  ok('  "Volgende stap" noemt het ook', /Volgende stap:<\/strong> Oppakken &mdash; [^<]*mogelijk een tweede proef/.test(pagina));
  const gewoon = await get('/admin/orders/3/files');
  ok('  een gewone proef heeft die rij niet', !/id="proef-twijfel"/.test(gewoon) && /<h2>Wat de klant koos<\/h2>|Volgende stap/.test(gewoon));
}

/* ── #7 · DE EU-ZIN IN DE BETAALSTAP ────────────────────────────────────────────────────────────── */
console.log('\n#7 · "Bestel je elders in de EU zonder btw-nummer…" alleen als het kan');
{
  const pipe = lees('src/scripts/pipeline.js');
  const a = pipe.indexOf('\nfunction zetNaEu(');
  const bron = pipe.slice(a + 1, pipe.indexOf('\n}\n', a) + 2);
  const draai = (land, uitkomst) => {
    const naEu = { hidden: false };
    const q = (sel) => (sel === '[data-pl-after-eu]' ? naEu : sel.startsWith('select[name="country"]') ? { value: land } : null);
    // eslint-disable-next-line no-new-func
    const zetNaEu = new Function('q', 'HOME_COUNTRY', 'isEu', 'betaalUitkomst', `${bron}\nreturn zetNaEu;`)(q, HOME_COUNTRY, isEu, () => uitkomst);
    zetNaEu();
    return naEu.hidden;
  };
  ok('BE met bevestigd nummer (verlegd): weg', draai('BE', 'verlegd') === true);
  ok('BE met nummer zonder antwoord van VIES: weg', draai('BE', 'verlegdMisschien') === true);
  ok('BE zonder nummer (nakijken): blijft (de proef laat hem zien; elders verbergt de nakijkzin het blok)', draai('BE', 'nakijken') === false);
  ok('NL en buiten de EU: weg', draai('NL', 'btw') === true && draai('GB', 'buiten') === true);
  ok('nog geen land: blijft', draai('', '') === false);
  ok('syncReg() en syncBetaalUitkomst() roepen hem aan', /\n  zetNaEu\(soort\);\n/.test(pipe) && /function syncBetaalUitkomst\(\) \{\n  zetNaEu\(\);/.test(pipe));
}

/* ── #8 · GEEN FOTO'S: NIET "EN JE BESTANDEN BINNEN" ────────────────────────────────────────────── */
console.log('\n#8 · Studio bij een bestelling zonder foto\'s');
{
  const o = { id: 9, ref: 'VIS-HS-0009', status: 'received', service: 'catalog', payment_status: 'paid', total_cents: 9000, product_count: 2 };
  const zonder = nuZin(o, { geenFotos: true, bedrag: true }, 'nl');
  ok('nuZin met geenFotos: de nieuwe zin en de knop naar de fotovakken', zonder.soort === 'fotoMist' && zonder.zin === NU_TEKST.nl.flow.receivedZonderFotos && JSON.stringify(zonder.knoppen) === '["fotos"]', JSON.stringify(zonder));
  ok('  niet meer "je bestanden binnen"', !/bestanden binnen/.test(zonder.zin) && /nog geen foto/.test(zonder.zin));
  ok('  Engels ook', nuZin(o, { geenFotos: true, bedrag: true }, 'en').zin === 'We have your order, but no photos yet. Add them, and we schedule it in.');
  ok('  met foto\'s blijft het de oude zin', nuZin(o, { bedrag: true }, 'nl').zin === NU_TEKST.nl.flow.received);
  ok('  in productie zonder foto\'s: geen nieuwe zin (alleen bij ontvangen)', nuZin({ ...o, status: 'in_production' }, { geenFotos: true, bedrag: true }, 'nl').zin === NU_TEKST.nl.flow.in_production);
  const acc = lees('src/lib/account.js');
  ok('Studio geeft geenFotos mee (er kunnen foto\'s bij en er is er nog geen)', /geenFotos: !!fotos && !uploaded\.length/.test(acc));
  ok('  de tijdlijn ("Nu:") gebruikt dezelfde zin', /const zonderFotos = status === 'received' && nasturenOpen\(o\) && !\(files \|\| \[\]\)\.some\(\(f\) => f\.kind === 'upload'\);/.test(acc) && /\(zonderFotos && t\.flowNow\.receivedZonderFotos\)/.test(acc));
}

/* ── KOPPEN · HOOGSTENS TWEE REGELS OP 320 – 390 PX ─────────────────────────────────────────────── */
console.log('\nKoppen · de kortere teksten (NL en EN) en de maten');
{
  const start = lees('src/components/StartHal.astro');
  ok('/nl/start: "Wat heb je nodig? Dan kies je de look." (EN ongewijzigd)', start.includes("h1: ['Wat heb je nodig?', 'Dan kies je de look.']") && start.includes("h1: ['What do you need?', 'Then pick the look.']"));
  const nl = lees('src/pages/nl/data-processing-agreement.astro');
  const en = lees('src/pages/data-processing-agreement.astro');
  ok('verwerkersovereenkomst NL: §4 en §11 korter', nl.includes('<h2>4. Persoonsgegevens en betrokkenen</h2>') && nl.includes('<h2>11. Doorgifte buiten de EER</h2>'));
  ok('  EN: §4 en §11 korter', en.includes('<h2>4. Personal data and data subjects</h2>') && en.includes('<h2>11. Transfers outside the EEA</h2>'));
  ok('  de tekst eronder noemt de afkorting al', /buiten de EER/.test(nl) && /outside the EEA/.test(en));
  const ty = lees('src/components/ThankYouPage.astro');
  ok('bedankpagina: de credits-koppen en de Engelse "al een proef" korter', ty.includes("titleCredits: 'Betaald met credits — we beginnen.'") && ty.includes("titleCredits: 'Paid with credits — we are on it.'") && ty.includes("titleProefAl: 'Your company had a sample already.'"));
  const css = lees('src/styles/hal.css');
  const k108 = lees('src/styles/kaart-108.css');
  ok('de bedankkop wint nu van hal.css en krimpt mee (min 27 px, venster − 88 px / 10,5)', k108.includes('html body.hal .h-form-bedankt .ty-bar.kv-108 .hoog.hoog-2:not(#k) { font-size: min(27px, calc((100vw - 88px) / 10.5)); line-height: 1.06; }'));
  ok('/test-sample NL: venster − 128 px / 10,6', css.includes('html[lang="nl"] body.hal .h-ts-open .h-proef-kop .l, html[lang="nl"] body.hal .h-ts-open .h-proef-kop .d { font-size: min(1em, calc((100vw - 128px) / 10.6)); }'));
  ok('/start/brand-model: venster − 32 px / 9,7, hoogstens 36', css.includes('html body.hal .h-form-merkmodel:not(.h-ts-form) .s22 .bm-kop .hoog { font-size: min(36px, calc((100vw - 32px) / 9.7)); }'));
  ok('/ai-act: de slotkop venster − 76 px / 11,3', css.includes('html body.hal .h-jur-tekst .jur-uit h2 { font-size: min(7vw, 26px, calc((100vw - 76px) / 11.3)); }'));
  /* levering 120 (19 november 2026, lijst 132): de bannerkop is gewone tekst zonder rand (geen b94-effen meer); de regel die de
     rand in hoog contrast op 0 zette is daarom weg. Getoetst wordt nu dat er nergens meer een rand op de bannerkop staat. */
  ok('P11-07 in de bron: de V in de werkplaatsbalk CanvasText, en de bannerkop zonder rand', /html body\.hal \.wk-merk \.hal-vm \*:not\(#k\):not\(#k\) \{ fill: CanvasText !important; \}/.test(css) && !/\.b94[^{}]*\{[^}]*-webkit-text-stroke: [1-9]/.test(css));
}

console.log(`\n${pass} goed, ${fail} fout`);
process.exit(fail ? 1 : 0);
