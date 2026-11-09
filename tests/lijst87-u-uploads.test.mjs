/*
 * LIJST 87 · D08, D11, D13 — UPLOADEN (9 november 2026)
 *
 *   D08 · een afgebroken JPEG kreeg een miniatuur en ging als "Verstuurd" door. Nu kijkt de beeldkeuring of
 *         de laatste 64 bytes de eindmarkering FF D9 bevatten (jpegEindigtNetjes in src/data/shots.js) en
 *         meldt anders zacht "lijkt onvolledig, kies hem opnieuw" (keurBeeld, code 'onvolledig'). Geen
 *         weigering: sommige telefoons zetten iets achter het einde.
 *   D11 · na een upload die op de verbinding strandde, gaan de vakken vanzelf verder bij het `online`-signaal
 *         (hervatNaVerbinding in src/scripts/pipeline.js). De grens van 40 per minuut is NIET veranderd:
 *         eerst meten met een echte grote bestelling.
 *   D13 · /admin laadde voor elk duimpje het volle origineel. Nu stuurt het formulier een kleine webp mee
 *         (veld `duim`); /api/upload zet hem naast het origineel (<sleutel>.duim.webp), listBatch() telt hem
 *         niet als foto en geeft hem als `preview`, /api/order zet hem in files.preview_key en /admin toont
 *         hem via /admin/files/<id>/duim (met het origineel als terugval).
 *
 *   node tests/lijst87-u-uploads.test.mjs
 */
import { readFileSync } from 'node:fs';
import { keurBeeld, jpegEindigtNetjes, JPEG_STAART } from '../src/data/shots.js';
import { listBatch, duimKeyVoor, isDuimKey, isWebpKop, MAX_DUIM_BYTES, MAX_BATCH_FILES, DUIM_ACHTER } from '../src/lib/uploads.js';
import { onRequestPost, onRequestDelete, onRequestGet } from '../functions/api/upload.js';

let goed = 0, fout = 0;
const ok = (naam, v, uitleg = '') => { if (v) { goed++; console.log(` ok   ${naam}`); } else { fout++; console.log(` FAIL ${naam}${uitleg ? `\n       ${uitleg}` : ''}`); } };
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

/* ── D08 ── */
console.log('\nD08 · een halve JPEG');
{
  const heel = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 0xff, 0xd9]);
  const half = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 5, 6]);
  const samsung = new Uint8Array([...new Array(10).fill(7), 0xff, 0xd9, ...new Array(40).fill(0x41)]);
  ok('een complete JPEG eindigt netjes', jpegEindigtNetjes(heel) === true);
  ok('een afgebroken JPEG niet', jpegEindigtNetjes(half) === false);
  ok('gegevens ná de eindmarkering (Samsung): nog steeds netjes', jpegEindigtNetjes(samsung) === true);
  ok('te weinig bytes: niets te melden', jpegEindigtNetjes(new Uint8Array([1])) === true);
  ok('we kijken in de laatste 64 bytes', JPEG_STAART === 64);
  const g = { w: 3000, h: 4000, mean: 0.5 };
  const dik = 3000 * 4000;
  ok('keurBeeld: onvolledig is een melding, geen weigering', JSON.stringify(keurBeeld({ ...g, onvolledig: true }, 'jpg', dik)) === JSON.stringify({ code: 'onvolledig', hard: false }));
  ok('  te klein wint nog steeds (dat weigert)', keurBeeld({ w: 400, h: 300, mean: 0.5, onvolledig: true }, 'jpg', 4000)?.code === 'te-klein');
  ok('  onvolledig gaat vóór donker', keurBeeld({ ...g, mean: 0.01, onvolledig: true }, 'jpg', dik)?.code === 'onvolledig');
  ok('  zonder afmetingen (de browser kon hem niet tekenen) toch gemeld', keurBeeld({ w: 0, h: 0, mean: null, onvolledig: true }, 'jpg', dik)?.code === 'onvolledig');
  ok('  een gewone foto: niets', keurBeeld({ ...g, onvolledig: false }, 'jpg', dik) === null);
  const pl = lees('src/scripts/pipeline.js');
  ok('pipeline.js leest de staart van een JPEG en geeft `onvolledig` mee', /jpegEindigtNetjes\(new Uint8Array\(await file\.slice\(Math\.max\(0, file\.size - JPEG_STAART\)\)\.arrayBuffer\(\)\)\)/.test(pl));
  const of = lees('src/components/order/OrderFlow.astro');
  ok('de zin in beide talen', of.includes("onvolledig: 'This photo looks incomplete: the end of the file is missing. Choose it again.'")
    && of.includes("onvolledig: 'Deze foto lijkt onvolledig: het einde van het bestand ontbreekt. Kies hem opnieuw.'"));
}

/* ── D11 ── */
console.log('\nD11 · vanzelf verder als de verbinding terug is');
{
  const pl = lees('src/scripts/pipeline.js');
  ok('failSlot onthoudt dat de verbinding het was', /s\.netwerkWeg = code === 'network';/.test(pl));
  ok('een luisteraar op `online`', /window\.addEventListener\('online', hervatNaVerbinding\)/.test(pl));
  const fn = pl.slice(pl.indexOf('function hervatNaVerbinding'), pl.indexOf("window.addEventListener('online'"));
  ok('  alleen vakken die op de verbinding strandden, en via retrySlot (de wachtrij)', /s\.status !== 'failed' \|\| !s\.netwerkWeg \|\| !s\.file/.test(fn) && /retrySlot\(card, id\)/.test(fn));
  ok('  niet als de opslag plat ligt of de daggrens bereikt is', /if \(uploadsOff \|\| uploadsVol\) return 0;/.test(fn));
  ok('de grens is niet blind verhoogd: nog 40 per minuut', /const RATE = \{ action: 'upload', limit: 40, windowSeconds: 60 \};/.test(lees('functions/api/upload.js')));
}

/* ── D13 ── */
console.log('\nD13 · het duimpje voor /admin');
const WEBP = (n = 40) => new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, ...new Array(n).fill(1)]);
const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0xff, 0xd9]);
{
  ok('isWebpKop: RIFF....WEBP', isWebpKop(WEBP()) && !isWebpKop(JPG));
  ok('duimKeyVoor / isDuimKey', duimKeyVoor('intake/x/001-ab-foto.jpg') === 'intake/x/001-ab-foto.jpg.duim.webp' && isDuimKey('a.jpg.duim.webp') && !isDuimKey('a.jpg') && DUIM_ACHTER === '.duim.webp');
  ok('een batch met al zijn duimpjes past in één R2-lijst (hoogstens 1000)', MAX_BATCH_FILES * 2 + 1 <= 1000, String(MAX_BATCH_FILES));

  /* een R2 in het geheugen */
  const R2 = new Map();
  const UPLOADS = {
    async list({ prefix, limit }) { return { objects: [...R2.keys()].filter((k) => k.startsWith(prefix)).sort().slice(0, limit).map((key) => ({ key, size: R2.get(key).bytes.length, customMetadata: R2.get(key).meta })) }; },
    async put(key, v, o) { const bytes = v instanceof Uint8Array ? v : new Uint8Array(await new Response(v).arrayBuffer()); R2.set(key, { bytes, meta: o?.customMetadata || {}, type: o?.httpMetadata?.contentType }); },
    async delete(key) { R2.delete(key); },
  };
  const env = { UPLOADS };
  const stuur = async (bestand, naam, duim, batch = '') => {
    const fd = new FormData();
    fd.append('file', new File([bestand], naam));
    if (batch) fd.append('batch', batch);
    fd.append('product', 'p1'); fd.append('shot', 'front');
    if (duim) fd.append('duim', new File([duim], 'duim.webp', { type: 'image/webp' }));
    const r = await onRequestPost({ request: new Request('https://visuails.com/api/upload', { method: 'POST', body: fd }), env });
    return { status: r.status, body: await r.json() };
  };
  const a = await stuur(JPG, 'voorkant.jpg', WEBP());
  ok('upload met duimpje: 200, en `duim: true`', a.status === 200 && a.body.duim === true, JSON.stringify(a.body));
  const sleutel = a.body.file.key, batch = a.body.batch;
  ok('  het duimpje staat naast het origineel, als image/webp', R2.get(duimKeyVoor(sleutel))?.type === 'image/webp');
  const b = await stuur(JPG, 'achterkant.jpg', null, batch);
  ok('upload zonder duimpje: gewoon 200, `duim: false`', b.status === 200 && b.body.duim === false);
  ok('  en het volgnummer telt het duimpje niet mee (002)', /\/002-/.test(b.body.file.key), b.body.file.key);
  const c = await stuur(JPG, 'detail.jpg', JPG, batch);
  ok('een duimpje dat geen webp is: weggelaten, de foto gaat door', c.status === 200 && c.body.duim === false && !R2.has(duimKeyVoor(c.body.file.key)));
  const d = await stuur(JPG, 'model.jpg', WEBP(MAX_DUIM_BYTES + 10), batch);
  ok('een te groot duimpje: weggelaten, de foto gaat door', d.status === 200 && d.body.duim === false);
  const e = await stuur(JPG, 'raar.duim.webp', null, batch);
  ok('een foto die zelf op .duim.webp eindigt, blijft gewoon een foto', e.status === 200 && !isDuimKey(e.body.file.key), e.body.file && e.body.file.key);

  const lijst = await listBatch(env, batch);
  ok('listBatch: alleen de vijf foto’s, niet de duimpjes', lijst.length === 5 && lijst.every((f) => !isDuimKey(f.key)), lijst.map((f) => f.key).join(' '));
  ok('  met `preview` waar er een duimpje is, leeg waar niet', lijst[0].preview === duimKeyVoor(sleutel) && lijst[1].preview === '');
  const get = await onRequestGet({ request: new Request(`https://visuails.com/api/upload?batch=${batch}`), env });
  const gj = await get.json();
  ok('GET ?batch: vijf foto’s, geen duimpje, en geen preview-sleutel naar buiten', gj.files.length === 5 && gj.files.every((f) => !('preview' in f)));

  await onRequestDelete({ request: new Request(`https://visuails.com/api/upload?batch=${batch}&key=${encodeURIComponent(sleutel)}`, { method: 'DELETE' }), env });
  ok('DELETE haalt het duimpje mee weg', !R2.has(sleutel) && !R2.has(duimKeyVoor(sleutel)));

  /* /api/order en /admin, in de bron */
  const order = lees('functions/api/order.js');
  ok('/api/order zet `preview` in files.preview_key', /INSERT INTO files \(order_id, kind, r2_key, filename, bytes, product_key, shot, preview_key\)/.test(order) && /f\.shot \|\| null, f\.preview \|\| null\]/.test(order));
  const admin = lees('src/lib/admin.js');
  ok('/admin kent /admin/files/<id>/duim', /path\.match\(\/\^\\\/admin\\\/files\\\/\(\\d\+\)\\\/duim\$\/\)/.test(admin) && /serveAdminFile\(context, Number\(duimMatch\[1\]\), \{ duim: true \}\)/.test(admin));
  ok('  met het origineel als terugval', /if \(duim && row\.preview_key\)/.test(admin));
  ok('de drie duimpjes in /admin gebruiken hem', (admin.match(/src="\/admin\/files\/\$\{f\.id\}\/duim"/g) || []).length === 3 && !/<img[^>]*src="\/admin\/files\/\$\{f\.id\}"/.test(admin));
  const pl = lees('src/scripts/pipeline.js');
  ok('het formulier stuurt het duimpje mee (veld `duim`)', /if \(duim\) fd\.append\('duim', duim, 'duim\.webp'\);/.test(pl));
  ok('  gemaakt uit dezelfde meting, 480 px, webp', /const DUIM_PX = 480;/.test(pl) && /'image\/webp', 0\.8\)/.test(pl) && /duim = await maakDuim\(bm\)/.test(pl));
  ok('  en de upload wacht er hoogstens 2,5 s op', /const DUIM_WACHT_MS = 2500;/.test(pl));
}

console.log(`\n${goed} goed, ${fout} fout`);
if (fout) process.exit(1);
