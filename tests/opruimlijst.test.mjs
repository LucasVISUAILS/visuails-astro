/* VISUAILS — de opruimlijst van §17 (punt 9.01), vastgelegd.
 *   node tests/opruimlijst.test.mjs      (vereist een build: npx astro build)
 * ══════════════════════════════════════════════════════════════════════════════
 * 8 OKTOBER 2026 — PUNT 9.01, RONDE A1
 * ══════════════════════════════════════════════════════════════════════════════
 * §17 van het overzicht van 6 oktober is een lijst van plekken waar de code of een
 * tekst afweek van hoe VISUAILS werkt. Lucas koos: opruimen in pakketten, A eerst
 * (wat een klant ziet of het geld raakt), dan B (wat een volgende lezer verkeerd
 * informeert). Deze toets houdt elk opgeruimd punt opgeruimd. Per blok staat het
 * §17-nummer erbij, zodat een rode regel meteen zegt over welk besluit het gaat.
 *
 * Geen echte gegevens: elke klant en elk adres hieronder is verzonnen.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { d1, verseDb, telling } from './lib/d1sqlite.mjs';

let pass = 0, fail = 0;
function ok(naam, kreeg, verwacht = true) {
  const goed = JSON.stringify(kreeg) === JSON.stringify(verwacht);
  if (goed) pass += 1; else fail += 1;
  console.log(` ${goed ? 'ok  ' : 'FAIL'} ${String(naam).padEnd(66)}${goed ? '' : ` verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(kreeg)}`}`);
}
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const dist = (p) => { const f = new URL(`../dist/${p}`, import.meta.url); return existsSync(f) ? readFileSync(f, 'utf8') : null; };
const meta = (html) => (/<meta name="description" content="([^"]*)"/.exec(html || '') || [])[1] ?? null;

const P = await import('../src/data/pricing.js');

/* ═══ A #1 · §17.2 en §17.17 · VIDEO ZONDER VASTE PRIJS (o23) ══════════════════
   Op /video/motion en /video/lifestyle stond € 69 per clip, ook in de Google-
   omschrijving, terwijl video op aanvraag is. */
console.log('A · video noemt geen bedrag zolang hij op aanvraag is');
{
  const { videoStyles: en } = await import('../src/data/videoStyles.js');
  const { videoStyles: nl } = await import('../src/data/videoStyles.nl.js');
  const clip = P.euro(P.AMOUNT.video, 'en').replace(/\s/g, '');
  const clipNl = P.euro(P.AMOUNT.video, 'nl').replace(/\s/g, '');
  ok('de vlag staat aan (anders is dit blok niet van toepassing)', P.VIDEO_OP_AANVRAAG, true);
  for (const [taal, lijst] of [['en', en], ['nl', nl]]) {
    for (const s of lijst.filter((x) => x.slug === 'motion' || x.slug === 'lifestyle')) {
      const velden = `${s.priceTrust}|${s.priceUnit}|${s.cardPrice}|${s.cardDesc}`;
      ok(`${taal} ${s.slug}: geen €-bedrag in de prijsvelden`, /€/.test(velden), false);
      ok(`  en geen "vaste prijs"`, /fixed price|vaste prijs/i.test(velden), false);
    }
  }
  for (const pad of ['video/motion/index.html', 'video/lifestyle/index.html', 'nl/video/motion/index.html', 'nl/video/lifestyle/index.html']) {
    const html = dist(pad);
    ok(`${pad} is gebouwd`, !!html);
    if (!html) continue;
    const m = meta(html) || '';
    ok(`  de meta-omschrijving noemt geen clipprijs`, m.replace(/\s/g, '').includes(pad.startsWith('nl/') ? clipNl : clip), false);
    ok(`  en zegt dat het op aanvraag is`, /On request|Op aanvraag/.test(m), true);
    /* De feitenrij bovenaan de pagina. */
    ok(`  de feitenrij noemt geen clipprijs`, /vs-feiten[\s\S]*?<\/ul>/.exec(html)?.[0].includes('69') ?? null, false);
  }
  /* §17.17: het proefbedrag kwam getypt in VideoStyleDetail.astro te staan. */
  const detail = lees('src/components/VideoStyleHal.astro');
  ok('VideoStyleHal typt geen €-bedrag meer (sinds 13 oktober de opvolger van VideoStyleDetail)', /€\s?\d/.test(detail.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')), false);
  ok('  maar leest TEST_SAMPLE', /TEST_SAMPLE\.(nl|en)\.price/.test(detail), true);
}

/* ═══ A #2 · §17.19 · EIGEN LOOK: "VANAF HET GEWONE TARIEF" (o23) ══════════════
   customer_styles.surcharge_cents kan € 0–500 per product toeslaan, dus "het
   gewone tarief" als belofte klopte niet. */
console.log('\nA · een eigen look belooft geen kale "gewone tarief" meer');
{
  const oud = [
    ['src/components/PricingHal.astro', 'One design fee and one correction round, then the ordinary rate.'],
    ['src/components/PricingHal.astro', 'Eén ontwerpbedrag en één correctieronde, daarna het gewone tarief.'],
    ['src/components/order/HoldingPage.astro', 'After that every product runs at the normal rate.'],
    ['src/components/order/HoldingPage.astro', 'Daarna loopt elk product tegen het gewone tarief.'],
    ['src/components/order/HoldingPage.astro', 'orderable at the ordinary rate'],
    ['src/components/order/HoldingPage.astro', 'te bestellen tegen het gewone tarief'],
    ['src/data/faq.js', 'and after that every product runs at the normal rate'],
    ['src/data/faq.js', 'en daarna gaat elk product tegen het gewone tarief'],
    ['src/data/catalogStyles.js', "'One design fee, then the normal per-product rate'"],
    ['src/data/catalogStyles.nl.js', "'Eén ontwerpbedrag, daarna het gewone tarief per product'"],
    ['src/data/styles.js', 'every carousel after it at the ordinary lifestyle rate'],
    ['src/data/styles.nl.js', 'elke carrousel daarna tegen het gewone lifestyle-tarief'],
    ['src/pages/terms.astro', 'one design fee, one correction round, then the normal rate per product.'],
    ['src/pages/nl/terms.astro', 'één ontwerpbedrag, één correctieronde, daarna het gewone tarief per product.'],
  ];
  for (const [f, zin] of oud) ok(`${f.split('/').pop()}: "${zin.slice(0, 44)}…" is weg`, lees(f).includes(zin), false);
  ok('/pricing zegt "vanaf het gewone tarief"', /daarna vanaf het gewone tarief/.test(lees('src/components/PricingHal.astro')) && /then from the ordinary rate/.test(lees('src/components/PricingHal.astro')), true);
  ok('de voorwaarden noemen de toeslag (NL)', /plus een toeslag per product als de look meer werk vraagt/.test(lees('src/pages/nl/terms.astro')), true);
  ok('  en (EN)', /plus a surcharge per product where the look takes more work/.test(lees('src/pages/terms.astro')), true);
  for (const pad of ['terms/index.html', 'nl/terms/index.html', 'pricing/index.html', 'nl/pricing/index.html']) {
    const html = dist(pad);
    ok(`${pad} draagt de nieuwe zin`, !!html && /toeslag per product|surcharge per product|vanaf het gewone tarief|from the ordinary rate/.test(html), true);
  }
}

/* ═══ A #3 · §17.5 (de verkoop) en §16.4 · CATALOG + LIFESTYLE NIET MEER TE KOOP ═
   Lucas koos V12 = a: /start/complete stuurt door naar /start. Oude bestellingen
   met service 'drop' blijven werken; alleen nieuw verkopen is dicht. */
console.log('\nA · catalog + lifestyle in één bestelling wordt niet meer verkocht');
{
  for (const p of ['src/pages/start/complete.astro', 'src/pages/nl/start/complete.astro', 'src/components/order/CombiKeuze.astro']) {
    ok(`${p} is weg`, existsSync(new URL(`../${p}`, import.meta.url)), false);
  }
  /* Na OPRUIMEN.bat staan ze niet meer op de lijst, maar dan zijn ze ook weg (hierboven getoetst). */
  ok('de LIJST.txt noemt de twee pagina\'s onder "moet weg" (of ze zijn al opgeruimd)',
    /moet weg \(punt 9\.01\)[^]*?src\/pages\/start\/complete\.astro[^]*?src\/pages\/nl\/start\/complete\.astro/.test(lees('_opruimen/LIJST.txt'))
      || !['src/pages/start/complete.astro', 'src/pages/nl/start/complete.astro'].some((p) => existsSync(new URL(`../${p}`, import.meta.url))), true);
  ok('/admin biedt "Compleet" niet meer aan bij een bestelling namens de klant', /<option value="drop">/.test(lees('src/lib/admin.js')), false);

  const { onRequestPost: orderPost } = await import('../functions/api/order.js');
  const { db } = verseDb(new URL('../schema.sql', import.meta.url));
  const env = { DB: d1(db) };
  const post = (velden) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(velden)) fd.append(k, v);
    return orderPost({ request: new Request('https://visuails.com/api/order', { method: 'POST', body: fd, headers: { 'cf-connecting-ip': '203.0.113.9' } }), env, waitUntil() {} });
  };
  const basis = { lang: 'nl', email: 'oud-tabblad@voorbeeld.test', name: 'Verzonnen Klant', brand: 'Verzonnen Merk', products: '3', business_confirm: 'on' };
  const json = await post({ ...basis, service: 'drop', mode: 'json' });
  const body = await json.json().catch(() => ({}));
  ok('een POST met service=drop wordt geweigerd (410)', [json.status, body.error], [410, 'dienst-gestopt']);
  ok('  en er staat geen bestelling in de database', telling(db, 'SELECT COUNT(*) FROM orders'), 0);
  const gewoon = await post({ ...basis, service: 'drop' });
  ok('zonder JavaScript: terug naar het keuzescherm', [gewoon.status, gewoon.headers.get('location')], [303, '/nl/start/']);
  ok('  ook dan geen bestelling', telling(db, 'SELECT COUNT(*) FROM orders'), 0);

  /* Wat blijft: een bestaande 'drop'-bestelling blijft te betalen (met haar eigen
     bedrag) en houdt haar naam (facturen en Studio lezen die rijen). De trede zelf
     is sinds 14 oktober 2026 weg (afvinklijst 23): een nieuwe prijs bestaat niet. */
  const { isPayableService } = await import('../src/lib/quote.js');
  const { serviceLabel } = await import('../src/data/services.js');
  ok("een bestaande 'drop'-rij blijft een te betalen dienst", isPayableService('drop'), true);
  ok('  en houdt haar naam', serviceLabel('drop', 'nl'), 'Catalog + Lifestyle');
  ok('  maar de ladder kent hem niet meer', 'complete' in P.LADDER, false);
}

/* ═══ A #4 · §17.22 · EEN VERVALLEN BESTELLING KRIJGT cancelled_at ══════════════ */
console.log('\nA · de nachttaak zet cancelled_at bij een vervallen bestelling');
{
  const { tasks } = await import('../cron/index.js');
  const { db } = verseDb(new URL('../schema.sql', import.meta.url));
  const env = { DB: d1(db) };
  db.prepare(
    `INSERT INTO orders (ref, service, email, lang, status, payment_status, total_cents, vat_cents, created_at)
     VALUES ('VIS-VERV-001', 'catalog', 'vervallen@voorbeeld.test', 'nl', 'received', 'unpaid', 26700, 0, datetime('now', '-30 days'))`
  ).run();
  await tasks.cancelStaleApprovals(env);
  const rij = db.prepare("SELECT status, cancelled_at FROM orders WHERE ref = 'VIS-VERV-001'").get();
  ok('de bestelling is vervallen', rij.status, 'cancelled');
  ok('  en heeft een cancelled_at', typeof rij.cancelled_at === 'string' && rij.cancelled_at.length > 0, true);

  /* De eenmalige correctie voor wat al vervallen was. */
  const { db: db2 } = verseDb(new URL('../schema.sql', import.meta.url));
  const zet = (ref, metRegel, cancelledAt = null) => {
    const r = db2.prepare(
      `INSERT INTO orders (ref, service, email, lang, status, payment_status, total_cents, cancelled_at, created_at)
       VALUES (?, 'catalog', 'oud@voorbeeld.test', 'nl', 'cancelled', 'unpaid', 26700, ?, '2026-08-01 10:00:00')`
    ).run(ref, cancelledAt);
    if (metRegel) db2.prepare("INSERT INTO order_events (order_id, status, note, actor, created_at) VALUES (?, 'cancelled', 'Vervallen', 'system', '2026-08-15 03:00:00')").run(r.lastInsertRowid);
  };
  zet('VIS-OUD-MET', true);
  zet('VIS-OUD-ZONDER', false);
  zet('VIS-OUD-AL', true, '2026-08-10 12:00:00');
  const mig = lees('migrations/0058-vervallen-cancelled-at.sql').replace(/--.*$/gm, '');
  db2.exec(mig);
  const na = (ref) => db2.prepare('SELECT cancelled_at FROM orders WHERE ref = ?').get(ref).cancelled_at;
  ok('0058: de datum komt van de tijdlijnregel', na('VIS-OUD-MET'), '2026-08-15 03:00:00');
  ok('0058: zonder tijdlijnregel blijft hij leeg (geen verzonnen datum)', na('VIS-OUD-ZONDER'), null);
  ok('0058: een datum die er al stond, blijft staan', na('VIS-OUD-AL'), '2026-08-10 12:00:00');
  db2.exec(mig);
  ok('0058: twee keer draaien verandert niets', na('VIS-OUD-MET'), '2026-08-15 03:00:00');
}

/* ═══ A #5 · §17.18 · EEN LOOK OP AANVRAAG IS GEEN VASTE LOOK ═══════════════════ */
console.log('\nA · "custom" kan niet als vaste lifestyle-look worden vastgezet');
{
  const { lookGeldig } = await import('../src/lib/vasteLook.js');
  ok("lookGeldig('custom') is false", lookGeldig('custom'), false);
  ok("  een huisstijl blijft geldig", lookGeldig('dunes'), true);
  ok("  een eigen look van de klant ook", lookGeldig('cs-12'), true);
  const acc = lees('src/lib/account.js');
  ok('account.js: LOOK_IDS komt uit de vaste looks', /const LOOK_IDS = VASTE_LOOKS\.map/.test(acc), true);
  ok('  en de keuzelijst in Studio ook', /\.\.\.VASTE_LOOKS\.map\(\(lk\)/.test(acc), true);
  ok('  en nergens meer de hele lijst als keuze', /\.\.\.LOOKS_EN\.map\(/.test(acc), false);
}

/* ═══ B · WAT EEN VOLGENDE LEZER VERKEERD INFORMEERDE ═══════════════════════════ */
console.log('\nB #6 · §17.16 · de termijnen van een onbetaalde bestelling op één plek');
{
  const T = await import('../src/data/termijnen.js');
  const V = await import('../src/data/vat.js');
  ok('vier benoemde termijnen', [T.VENSTER_VASTHOUDEN_DAGEN, T.BETALEN_NA_BTW_AKKOORD, T.HERINNERING_DAG, T.VERVAL_DAG].every(Number.isInteger), true);
  ok('  herinnering vóór vrijgeven vóór vervallen', T.HERINNERING_DAG < T.VENSTER_VASTHOUDEN_DAGEN && T.VENSTER_VASTHOUDEN_DAGEN < T.VERVAL_DAG, true);
  ok('PAYMENT_DAYS in vat.js is BETALEN_NA_BTW_AKKOORD', V.PAYMENT_DAYS, T.BETALEN_NA_BTW_AKKOORD);
  ok('inWoorden(7) leest als in de mails', [T.inWoorden(7, 'nl'), T.inWoorden(7, 'en')], ['zeven', 'seven']);
  const code = (f) => lees(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  ok("order.js typt geen '+7 days' meer", /'\+7 days'/.test(code('functions/api/order.js')), false);
  ok('  en leest VENSTER_VASTHOUDEN_DAGEN', /VENSTER_VASTHOUDEN_DAGEN/.test(code('functions/api/order.js')), true);
  const cron = code('cron/index.js');
  ok("de cron typt geen '-7 days' meer", /-7 days/.test(cron), false);
  ok('  en geen "zeven dagen" of "seven days" in een mail', /zeven dagen|seven days/.test(cron), false);
  ok('  maar leest de termijnen uit termijnen.js', /from '\.\.\/src\/data\/termijnen\.js'/.test(cron), true);
  ok('/admin start de vasthoudtermijn met VENSTER_VASTHOUDEN_DAGEN', (code('src/lib/admin.js').match(/\+\$\{VENSTER_VASTHOUDEN_DAGEN\} days/g) || []).length, 2);
}

console.log('\nB #7, #8 · §17.1, §17.3, §17.4, §17.23 · geen tweede bron, geen oud bedrag');
{
  const pr = lees('src/data/pricing.js');
  ok('VOORRANG_COPY.limits leest VOORRANG', /limits: `Available up to \$\{VOORRANG\.maxProducten\} products, or \$\{VOORRANG\.maxClips\} clips/.test(pr), true);
  ok('  en noemt hetzelfde getal', P.VOORRANG_COPY.nl.limits.includes(`tot ${P.VOORRANG.maxProducten} producten, of ${P.VOORRANG.maxClips} clips`), true);
  ok('plans.js noemt het merkmodel niet meer "€ 1.250"', /1\.250/.test(lees('src/data/plans.js')), false);
  ok('het outfitcommentaar rekent niet met oude prijzen', /139\.99|179\.99/.test(pr), false);
  ok('niemand verwijst nog naar "zie eigenStijlCredits()"', /zie eigenStijlCredits\(\)/.test(pr), false);
  ok('retention.js zegt niet meer dat een revisieverzoek closed_at wist', /op NULL bij een revisieverzoek/.test(lees('src/lib/retention.js')), false);
  ok('admin.js noemt geen "12 maanden na LEVERING" meer', /12 maanden na LEVERING/.test(lees('src/lib/admin.js')), false);
}

console.log('\nB #9 · §17.6 · ADVISORY is weg (zie ook tests/plans.test.mjs)');
{
  ok('plans.js definieert geen ADVISORY', /export const ADVISORY/.test(lees('src/data/plans.js')), false);
}

console.log('\nB #10 · §17.8, §17.9 · scripts/deliver.mjs is gerepareerd, /admin is de gewone weg');
{
  const d = lees('scripts/deliver.mjs');
  const vorm = /if \(!(\/\^VIS-[^\n]*?\/i?)\.test\(ref\)\)/.exec(d)?.[1];
  ok('de referentiecontrole staat er', !!vorm, true);
  if (vorm) {
    const re = new Function(`return ${vorm}`)();
    ok('  een echte referentie (letters én cijfers) komt erdoor', re.test('VIS-MF3K-7QX'), true);
    ok('  onzin niet', re.test('VIS-; DROP TABLE'), false);
  }
  ok('de slotzin zegt niet meer onvoorwaardelijk "de klant ziet dit meteen"', /\nDe klant ziet dit meteen/.test(d), false);
  ok('de kop noemt /admin de gewone weg', /\/admin IS DE GEWONE WEG/.test(d), true);
}

console.log('\nB #13 · §17.10 · de kop van account.js klopt over het e-mailadres');
ok('geen "THE ACCOUNT EMAIL IS NOT EDITABLE HERE" meer', /NOT EDITABLE HERE/.test(lees('src/lib/account.js')), false);

console.log('\nB #14 · §17.7, §17.24 · PRODUCT.md en de schrijfregels');
{
  ok('PRODUCT.md noemt de drop niet meer de eenheid van verkoop', /The drop is the unit of sale/.test(lees('docs/PRODUCT.md')), false);
  const tabel = lees('docs/SCHRIJFWIJZER.md').split('\n').filter((r) => r.startsWith('|'));
  ok('SCHRIJFWIJZER.md zet "naadloos" niet meer als zijn woord in de tabel', tabel.some((r) => /naadloos/i.test(r)), false);
  ok('STIJL.md: euro() wint, zonder spatie', /zoals `euro\(\)` hem maakt — €1, €89, €0,99/.test(lees('docs/STIJL.md')), true);
}

console.log('\nB #15 · §17.13 · geen uitzondering meer voor HomeV2.astro');
ok('tests/ronde9.test.mjs kent DOOD niet meer', /DOOD/.test(lees('tests/ronde9.test.mjs')), false);
/* Na OPRUIMEN.bat is hij van de lijst, maar dan ook uit src/components: dat telt ook. */
ok('  en HomeV2.astro staat in LIJST.txt (of is al opgeruimd)', /src\/components\/HomeV2\.astro #/.test(lees('_opruimen/LIJST.txt')) || !existsSync(new URL('../src/components/HomeV2.astro', import.meta.url)), true);

console.log('\nC #17 · §17.25 · Rae laadt haar kleine bestand; het oude grijs heeft nog een naam');
{
  const { ROSTER } = await import('../src/data/models.js');
  const rae = ROSTER.find((m) => m.name === 'Rae');
  ok('de thumb van Rae is het -w800-bestand', rae.thumb, '/img/model-rae-w800.webp');
  ok('  en dat bestand staat in public/img', existsSync(new URL('../public/img/model-rae-w800.webp', import.meta.url)), true);
  const { achtergrondNaam, RECOMMENDED } = await import('../src/data/backgrounds.js');
  /* 17 oktober 2026 (levering 58): Lichtgrijs is nu #F5F5F5, de aanbevolen kleur. Het oude
     #EDEDED heet daarom Grijs, zodat twee kleuren niet dezelfde naam dragen. */
  ok('#EDEDED heet Grijs', [achtergrondNaam('#ededed', 'nl'), achtergrondNaam('#EDEDED', 'en')], ['Grijs', 'Grey']);
  ok('  maar staat niet weer in de keuzelijst', RECOMMENDED.some((b) => b.hex.toUpperCase() === '#EDEDED'), false);
  ok('  en Lichtgrijs is #F5F5F5', [achtergrondNaam('#f5f5f5', 'nl'), achtergrondNaam('#F5F5F5', 'en')], ['Lichtgrijs', 'Light grey']);
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exitCode = 1;
