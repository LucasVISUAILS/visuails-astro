/**
 * FORMATEN.bat → scripts/formaten.mjs — 12 oktober 2026 (K6, k-lever = a).
 *
 *   node tests/formaten-script.test.mjs
 *
 * Zonder Cloudflare: het echte schema op SQLite (tests/lib/d1sqlite.mjs) als
 * D1, een Map als R2, en een paar test-PNG's die sharp hier maakt. De
 * herkomsttag is echt (exiftool via scripts/lib/aitag.mjs). Wat vastligt:
 *   · de koppeling PNG → beeld: werkmap-pad, dezelfde naam als de jpg uit
 *     /admin, de gok uit de naam; een jpg in de map wordt geen WebP;
 *   · de droogloop verandert niets;
 *   · de WebP komt uit de PNG (kwaliteit 90), de PNG blijft de PNG, beide met
 *     de herkomsttag, en de map van Lucas blijft onaangeroerd;
 *   · file_assets krijgt png, webp én de bestaande jpg, zodat de zip per
 *     product JPG/, PNG/ en WEBP/ heeft (deliveryEntries, de leesmij);
 *   · Klaar in /admin/formaten alleen als elk beeld compleet is;
 *   · vervangen ruimt de vorige objecten op; weigeren bij video, dubbele PNG's,
 *     een niet-jpg-levering en een zip boven de 2 GB;
 *   · FORMATEN.bat volgt de vorm van de andere .bat-bestanden.
 * Verzonnen merk en namen; niets hiervan bestaat.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import sharp from 'sharp';
import { maakPlan, planTekst, voerUit, laadBestelling, leesMap, schoonPad, origineleNaam, REF_VORM, WEBP_OPTIES } from '../scripts/formaten.mjs';
import { readSourceType, writeSourceType, closeExif, LEVERTAG } from '../scripts/lib/aitag.mjs';
import { guessProductShot } from '../src/lib/admin.js';
import { loadDeliveryFiles, deliveryEntries, deliveryReadme, orderProductNames } from '../src/lib/delivery.js';
import { formatenVoorOrders, formaatView } from '../src/lib/formaten.js';
import { d1, verseDb } from './lib/d1sqlite.mjs';

let pass = 0;
let fail = 0;
function ok(name, cond, extra = '') {
  if (cond) pass++; else fail++;
  console.log(`${cond ? ' ok  ' : ' FAIL'} ${name}${cond || !extra ? '' : ` — ${extra}`}`);
}

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
ok('het schema laadt zonder fouten', mislukt.length === 0, mislukt.slice(0, 2).join(' | '));
const REF = 'VIS-TEST-0701';
db.exec(`
  INSERT INTO customers (id, email, name, brand) VALUES (71, 'formaten@voorbeeldmerk.test', 'Iris de Wit', 'FORMAATMERK');
  INSERT INTO orders (id, ref, customer_id, service, status, name, brand, email, total_cents, lang, product_count, details_json, payment_status)
    VALUES (701, '${REF}', 71, 'catalog', 'delivered', 'Iris de Wit', 'FORMAATMERK', 'formaten@voorbeeldmerk.test', 12000, 'nl', 2,
            '{"product_p1":"Jas groen","product_p2":"Broek"}', 'paid'),
           (702, 'VIS-TEST-0702', 71, 'video', 'delivered', 'Iris de Wit', 'FORMAATMERK', 'formaten@voorbeeldmerk.test', 9000, 'nl', 1, '{}', 'paid');
  INSERT INTO files (id, order_id, kind, r2_key, filename, bytes, product_key, shot, superseded_at) VALUES
    (7100, 701, 'delivery', 'delivery/${REF}/p1-front-0a0b0c0d-oud.jpg', '${REF}-p1-voorkant.jpg', 900, 'p1', 'front', '2026-10-10 10:00:00'),
    (7101, 701, 'delivery', 'delivery/${REF}/p1-front-1a2b3c4d-magnific_aa11.jpg', '${REF}-p1-voorkant.jpg', 1000, 'p1', 'front', NULL),
    (7102, 701, 'delivery', 'delivery/${REF}/p1-back-2b3c4d5e-magnific_bb22.jpg', '${REF}-p1-achterkant.jpg', 1100, 'p1', 'back', NULL),
    (7103, 701, 'delivery', 'delivery/${REF}/p2-front-3c4d5e6f-IMG_0003.jpg', '${REF}-p2-voorkant.jpg', 1200, 'p2', 'front', NULL),
    (7104, 701, 'delivery', 'delivery/${REF}/p2-back-4d5e6f70-IMG_0004.jpg', '${REF}-p2-achterkant.jpg', 1300, 'p2', 'back', NULL);
  INSERT INTO formaat_verzoeken (order_id, formaat) VALUES (701, 'png'), (701, 'webp');
`);

const r2 = new Map();
const verwijderd = [];
const tagged = [];
const io = {
  query: async (sql) => db.prepare(sql).all(),
  exec: async (statements) => { db.exec(statements.join('\n')); },
  put: async (key, file, type) => { r2.set(key, { bytes: fs.readFileSync(file), type }); },
  del: async (key) => { verwijderd.push(key); r2.delete(key); },
  tag: async (file) => { await writeSourceType(file, LEVERTAG); tagged.push(path.extname(file)); },
};

/* De map van Lucas: drie PNG's die bij een beeld horen, een jpg en een vreemde. */
const MAP = fs.mkdtempSync(path.join(os.tmpdir(), 'k6-formaten-'));
const png = async (rel, kleur, w = 640, h = 800) => {
  const p = path.join(MAP, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  await sharp({ create: { width: w, height: h, channels: 3, background: kleur } }).png().toFile(p);
  return p;
};
await png('magnific_aa11.png', '#c86464');
await png('p1 - Jas groen/2 achterkant/export.png', '#64c864');
await png('p2-voorkant.png', '#6464c8');
await png('onbekend.png', '#888888');
await sharp({ create: { width: 64, height: 64, channels: 3, background: '#000' } }).jpeg().toFile(path.join(MAP, 'magnific_bb22.jpg'));
const mapVoor = Object.fromEntries((await leesMap(MAP)).map((b) => [b.rel, fs.readFileSync(b.pad).toString('base64')]));

/* ── 1 · KLEINE STUKKEN ─────────────────────────────────────────────────────── */
console.log('\n1 · de kleine stukken');
ok('een gesleept pad met aanhalingstekens wordt schoon', schoonPad('  "C:\\Users\\lucas\\Magnific (1)\\VIS-TEST"  ') === 'C:\\Users\\lucas\\Magnific (1)\\VIS-TEST');
ok('de originele naam uit een /admin-sleutel', origineleNaam(`delivery/${REF}/p1-front-1a2b3c4d-magnific_aa11.jpg`) === 'magnific_aa11.jpg');
ok('en uit een sleutel zonder vak', origineleNaam(`delivery/${REF}/1a2b3c4d-los.jpg`) === 'los.jpg');
ok('het bestelnummer: VIS-…, en niets anders', REF_VORM.test('VIS-MF3K-7QX') && !REF_VORM.test('VIS-1 & del') && !REF_VORM.test('ABC-1234'));
ok('WebP op kwaliteit 90, niet lossless (zie de kop van het script)', WEBP_OPTIES.quality === 90 && !WEBP_OPTIES.lossless);

/* ── 2 · DE DROOGLOOP ───────────────────────────────────────────────────────── */
console.log('\n2 · de droogloop');
const plan1 = async () => {
  const { order, levering, assets } = await laadBestelling(io, REF);
  return { order, plan: maakPlan({ order, levering, assets, bronnen: await leesMap(MAP), gok: guessProductShot }) };
};
{
  const { order, plan } = await plan1();
  const per = Object.fromEntries(plan.stappen.map((s) => [s.label, `${s.bron.rel}|${s.hoe}`]));
  ok('p1 voorkant: dezelfde naam als de jpg uit /admin', per['p1 voorkant'] === 'magnific_aa11.png|naam als de jpg', JSON.stringify(per));
  ok('p1 achterkant: het pad uit de werkmap', per['p1 achterkant'] === `${path.join('p1 - Jas groen', '2 achterkant', 'export.png')}|werkmap`);
  ok('p2 voorkant: de gok uit de naam', per['p2 voorkant'] === 'p2-voorkant.png|gok uit de naam');
  ok('het vervangen beeld (superseded) doet niet mee', !plan.stappen.some((s) => s.file.id === 7100) && plan.beelden.length === 4);
  ok('p2 achterkant heeft nog geen PNG', plan.zonderPng.map((f) => f.id).join() === '7104');
  ok('een jpg in de map wordt geen WebP', plan.overgeslagen.some((o) => /magnific_bb22\.jpg/.test(o) && /nooit uit de jpg/.test(o)));
  ok('een PNG die nergens bij hoort, wordt gemeld', plan.meldingen.some((m) => /onbekend\.png/.test(m)));
  ok('de jpg-rij komt erbij (de jpg uit /admin, hetzelfde object)', plan.stappen.every((s) => s.jpg && s.jpg.r2_key === s.file.r2_key));
  ok('geen fouten, en het past in één zip', !plan.fouten.length && !plan.pastNiet);
  const t = planTekst(order, plan);
  ok('de tabel noemt elk beeld, wat er mist en de zipgrootte', /p1 voorkant/.test(t) && /Nog zonder PNG/.test(t) && /p2 achterkant/.test(t) && /De zip wordt ongeveer/.test(t), t);
  ok('de droogloop schreef niets: geen R2, geen file_assets, verzoeken open',
    r2.size === 0 && db.prepare('SELECT COUNT(*) AS n FROM file_assets').get().n === 0 && db.prepare('SELECT COUNT(*) AS n FROM formaat_verzoeken WHERE klaar_at IS NULL').get().n === 2);
}

/* ── 3 · DOEN, MET ÉÉN BEELD NOG ZONDER PNG ──────────────────────────────────── */
console.log('\n3 · doen (nog niet compleet)');
{
  const { order, plan } = await plan1();
  const uit = await voerUit(order, plan, io);
  ok('zes nieuwe objecten in R2: per beeld een PNG en een WebP', r2.size === 6 && [...r2.keys()].every((k) => k.startsWith(`delivery/${REF}/`)));
  ok('de types kloppen', [...r2.entries()].every(([k, v]) => (k.endsWith('.png') ? v.type === 'image/png' : v.type === 'image/webp')));
  const webpKey = [...r2.keys()].find((k) => /^delivery\/VIS-TEST-0701\/p1-front-.*\.webp$/.test(k));
  const meta = await sharp(r2.get(webpKey).bytes).metadata();
  ok('de WebP is een echte WebP, op de maat van de PNG', meta.format === 'webp' && meta.width === 640 && meta.height === 800, JSON.stringify({ f: meta.format, w: meta.width }));
  const pngKey = webpKey.replace(/\.webp$/, '.png');
  const pngMeta = await sharp(r2.get(pngKey).bytes).metadata();
  ok('de PNG blijft een PNG op volle maat', pngMeta.format === 'png' && pngMeta.width === 640);
  const tmp = path.join(os.tmpdir(), `k6-tagcheck-${process.pid}`);
  fs.writeFileSync(`${tmp}.png`, r2.get(pngKey).bytes);
  fs.writeFileSync(`${tmp}.webp`, r2.get(webpKey).bytes);
  ok('beide dragen de herkomsttag (LEVERTAG)', (await readSourceType(`${tmp}.png`)) === LEVERTAG && (await readSourceType(`${tmp}.webp`)) === LEVERTAG);
  fs.rmSync(`${tmp}.png`, { force: true }); fs.rmSync(`${tmp}.webp`, { force: true });
  const mapNa = Object.fromEntries((await leesMap(MAP)).map((b) => [b.rel, fs.readFileSync(b.pad).toString('base64')]));
  ok('de map van Lucas is onaangeroerd (geen tag, geen extra bestanden)', JSON.stringify(mapNa) === JSON.stringify(mapVoor));
  const rijen = db.prepare('SELECT file_id, format, r2_key FROM file_assets ORDER BY file_id, format').all();
  ok('file_assets: per gekoppeld beeld jpg, png en webp', rijen.length === 9 && [7101, 7102, 7103].every((id) => rijen.filter((r) => r.file_id === id).map((r) => r.format).join() === 'jpg,png,webp'));
  ok('de jpg-rij wijst naar de bestaande jpg', rijen.filter((r) => r.format === 'jpg').every((r) => r.r2_key === db.prepare('SELECT r2_key FROM files WHERE id = ?').get(r.file_id).r2_key));
  ok('niet compleet: geen Klaar, en het script zegt welk beeld mist', !uit.klaar && uit.mist.join() === 'p2 achterkant' && /nog NIET compleet/.test(uit.tekst) && /p2 achterkant/.test(uit.tekst), uit.tekst);
  ok('de verzoeken staan nog open', db.prepare('SELECT COUNT(*) AS n FROM formaat_verzoeken WHERE klaar_at IS NULL').get().n === 2);

  /* De zip zoals de klant hem krijgt. */
  const env = { DB: d1(db) };
  const files = await loadDeliveryFiles(env, 701);
  const o = db.prepare('SELECT * FROM orders WHERE id = 701').get();
  const entries = deliveryEntries(files, 'nl', { ref: REF, service: o.service, details: o.details_json, productNames: orderProductNames(o.details_json) });
  const namen = entries.map((e) => e.name);
  ok('zip: p1 heeft JPG/, PNG/ en WEBP/', ['JPG/1-voorkant.jpg', 'PNG/1-voorkant.png', 'WEBP/1-voorkant.webp', 'JPG/2-achterkant.jpg', 'PNG/2-achterkant.png', 'WEBP/2-achterkant.webp'].every((n) => namen.includes(`VISUAILS-${REF}/01 - Jas groen/${n}`)), namen.join('\n'));
  ok('zip: de jpg in JPG/ is het object uit /admin', entries.find((e) => e.name.endsWith('01 - Jas groen/JPG/1-voorkant.jpg'))?.key === `delivery/${REF}/p1-front-1a2b3c4d-magnific_aa11.jpg`);
  ok('zip: p2 achterkant (nog zonder PNG) staat er gewoon als jpg', namen.includes(`VISUAILS-${REF}/${REF}-p2-achterkant.jpg`));
  const leesmij = deliveryReadme({ order: o, entries, productNames: orderProductNames(o.details_json) });
  ok('de leesmij noemt JPG, PNG en WEBP', /Formaten\s+JPG, PNG, WEBP/.test(leesmij) && /PNG\//.test(leesmij));
}

/* ── 4 · DE LAATSTE PNG ERBIJ: COMPLEET, DUS KLAAR ─────────────────────────────── */
console.log('\n4 · compleet');
{
  await png('IMG_0004.png', '#c8c864');
  fs.rmSync(path.join(MAP, 'onbekend.png'));
  const { order, plan } = await plan1();
  ok('de tweede ronde doet alleen p2 achterkant (dezelfde naam als de jpg)', plan.stappen.length === 1 && plan.stappen[0].file.id === 7104 && plan.stappen[0].hoe === 'naam als de jpg', JSON.stringify(plan.stappen.map((s) => s.file.id)));
  ok('en slaat de drie die al PNG en WebP hebben over (en zegt het)', plan.alKlaar.map((f) => f.id).join() === '7101,7102,7103' && /Al klaar/.test(planTekst(order, plan)));
  const uit = await voerUit(order, plan, io);
  ok('compleet: Klaar gezet voor beide formaten', uit.klaar && uit.gezet === 2 && db.prepare('SELECT COUNT(*) AS n FROM formaat_verzoeken WHERE klaar_at IS NOT NULL').get().n === 2, uit.tekst);
  ok('het script zegt welke bestelling klaar is', new RegExp(`^${REF} is klaar`).test(uit.tekst) && /\/admin\/formaten staat op Klaar/.test(uit.tekst), uit.tekst);
  ok('elk beeld heeft nu drie formaten', db.prepare('SELECT COUNT(*) AS n FROM file_assets').get().n === 12);
  ok('de herkomsttag ging in elk nieuw bestand (2 × 4)', tagged.length === 8, String(tagged.length));
  const v = formaatView({ id: 701, service: 'catalog', status: 'delivered' }, (await formatenVoorOrders({ DB: d1(db) }, [701])).get(701), { lang: 'nl' });
  ok('Studio: "PNG geleverd" en "WebP geleverd"', v.knoppen.every((k) => k.klaar && /geleverd/.test(k.staat)), JSON.stringify(v.knoppen));
}
{
  /* Opnieuw, bewust (--vervang of J op de vraag): de vorige objecten gaan weg. */
  const { order, levering, assets } = await laadBestelling(io, REF);
  const plan = maakPlan({ order, levering, assets, bronnen: await leesMap(MAP), gok: guessProductShot, vervang: true });
  const oud = db.prepare("SELECT r2_key FROM file_assets WHERE format IN ('png', 'webp')").all().map((r) => r.r2_key);
  const uit = await voerUit(order, plan, io);
  ok('vervangen: alle vier opnieuw, en de vorige PNG/WebP zijn uit R2 weg', plan.stappen.length === 4 && oud.length === 8 && oud.every((k) => verwijderd.includes(k) && !r2.has(k)));
  ok('nooit de jpg uit /admin weggehaald', !verwijderd.some((k) => k.endsWith('.jpg')));
  ok('nog steeds twaalf rijen, en klaar (er stond niets meer open)', db.prepare('SELECT COUNT(*) AS n FROM file_assets').get().n === 12 && uit.klaar && uit.gezet === 0 && /geen open verzoek/.test(uit.tekst), uit.tekst);
}

/* ── 5 · WEIGEREN ───────────────────────────────────────────────────────────── */
console.log('\n5 · weigeren');
{
  const { order, levering, assets } = await laadBestelling(io, 'VIS-TEST-0702');
  const plan = maakPlan({ order, levering, assets, bronnen: [], gok: guessProductShot });
  ok('video: geen andere formaten', plan.fouten.some((f) => /video/.test(f)));
  let gegooid = false;
  try { await voerUit(order, plan, io); } catch { gegooid = true; }
  ok('en voerUit weigert dan', gegooid);
}
{
  const { order, levering, assets } = await laadBestelling(io, REF);
  const b = (rel, bytes = 1000) => ({ pad: path.join(MAP, rel), rel, naam: path.basename(rel), bytes });
  const dubbel = maakPlan({ order, levering, assets, bronnen: [b('magnific_aa11.png'), b('p1-voorkant.png')], gok: guessProductShot, vervang: true });
  ok('twee PNG\'s voor één beeld: fout, met beide namen', dubbel.fouten.some((f) => /Twee PNG's voor p1 voorkant/.test(f) && /magnific_aa11\.png/.test(f) && /p1-voorkant\.png/.test(f)));
  const teGroot = maakPlan({ order, levering, assets: [], bronnen: [b('magnific_aa11.png', 1.9 * 1024 ** 3)], gok: guessProductShot });
  ok('boven de 2 GB: past niet, en de tabel zegt het', teGroot.pastNiet && /PAST NIET IN ÉÉN ZIP/.test(planTekst(order, teGroot)));
  const levPng = levering.map((f) => (f.id === 7103 ? { ...f, r2_key: `delivery/${REF}/p2-front-3c4d5e6f-IMG_0003.png` } : f));
  const nietJpg = maakPlan({ order, levering: levPng, assets: [], bronnen: [b('p2-voorkant.png')], gok: guessProductShot });
  ok('een beeld dat in /admin niet als jpg kwam: gemeld en overgeslagen', !nietJpg.stappen.length && nietJpg.meldingen.some((m) => /niet als jpg geleverd/.test(m)));
}

/* ── 6 · FORMATEN.bat EN DE README ──────────────────────────────────────────── */
console.log('\n6 · FORMATEN.bat');
{
  const bat = fs.readFileSync(new URL('../FORMATEN.bat', import.meta.url), 'latin1');
  ok('CRLF-regeleinden', !/[^\r]\n/.test(bat) && /\r\n/.test(bat));
  ok('alleen ASCII (cmd.exe en zijn codepagina)', !/[^\x00-\x7F]/.test(bat));
  ok('springt naar zijn eigen map', /cd \/d "%~dp0"/.test(bat));
  ok('controleert dat hij in de projectmap staat', /if not exist "astro\.config\.mjs" goto nietindemap/.test(bat));
  ok('geen blokken tussen haakjes', /\(\s*$/m.test(bat.replace(/^REM.*$/gim, '')) === false);
  ok('roept het script aan, dat de vragen stelt', /node scripts\\formaten\.mjs --vraag/.test(bat));
  ok('wacht aan het eind (pause)', /pause\r\nexit \/b 0/.test(bat));
  ok('met een korte uitleg bovenin', /REM .*PNG/.test(bat) && /Magnific/.test(bat) && /Klaar/.test(bat));
  const readme = fs.readFileSync(new URL('../README.md', import.meta.url), 'utf8');
  ok('de README noemt FORMATEN.bat', /FORMATEN\.bat/.test(readme));
}

await closeExif();
fs.rmSync(MAP, { recursive: true, force: true });
console.log(`\n${pass}/${pass + fail} geslaagd`);
process.exit(fail ? 1 : 0);
