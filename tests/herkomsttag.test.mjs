/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * 4.01 · DE HERKOMSTTAG KOMT ER BIJ ELKE UPLOAD IN /admin VANZELF IN — 8 okt 2026
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * De Worker schrijft IPTC DigitalSourceType in de XMP van elke jpg en png
 * (src/lib/xmp.js). Deze toets leest de tag TERUG met exiftool (hetzelfde
 * programma dat scripts/tag-delivery.mjs gebruikt) en houdt het beeld zelf heel:
 * sharp decodeert de uitkomst tot dezelfde pixels, pngjs controleert elke CRC.
 *
 * Daarna dezelfde weg als Lucas: een jpg, png en webp in een vak op het bord, de
 * maandset, en de chip "AI-tag" / "geen AI-tag" op het bord.
 *
 * exiftool draait als los proces (perl), geen server; daarom mag dit direct.
 */
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { PNG } from 'pngjs';
import { exiftool } from 'exiftool-vendored';
import { tagJpeg, tagPng, zetHerkomstTag, voegTagToe, xmpPakket } from '../src/lib/xmp.js';
import { LEVERTAG, MAANDSETTAG, COMPOSITE, FULLY } from '../src/lib/iptc.js';
import { hasProvenanceTag } from '../src/lib/provenance.js';
import { adminGet, adminPost } from '../src/lib/admin.js';
import { mintToken, hashToken } from '../src/lib/token.js';
import { d1, verseDb, telling } from './lib/d1sqlite.mjs';

let pass = 0;
let fail = 0;
function ok(name, cond, extra = '') {
  if (cond) pass++; else fail++;
  console.log(`${cond ? ' ok  ' : ' FAIL'} ${name}${cond || !extra ? '' : ` — ${extra}`}`);
}

const map = mkdtempSync(join(tmpdir(), 'herkomsttag-'));
let teller = 0;
async function lees(bytes, ext) {
  const pad = join(map, `b${++teller}.${ext}`);
  writeFileSync(pad, Buffer.from(bytes));
  return exiftool.read(pad);
}
const pixels = async (bytes) => (await sharp(Buffer.from(bytes)).raw().toBuffer());
const gelijk = (a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b)) === 0;

try {
  /* ── 0 · ÉÉN CONSTANTE, WAARDE ONGEWIJZIGD ──────────────────────────────── */
  /* 11 oktober 2026 (kiptc = a): de leverwaarde is trainedAlgorithmicMedia. */
  ok('de leverwaarde staat in één constante: trainedAlgorithmicMedia (kiptc = a)', LEVERTAG === FULLY);
  ok('de maandset volgt /editions (trained)', MAANDSETTAG === FULLY);
  const AITAG = readFileSync(new URL('../scripts/lib/aitag.mjs', import.meta.url), 'utf8');
  const TAGDEL = readFileSync(new URL('../scripts/tag-delivery.mjs', import.meta.url), 'utf8');
  ok('scripts/lib/aitag.mjs schrijft standaard LEVERTAG', /writeSourceType\(file, value = LEVERTAG\)/.test(AITAG));
  ok('tag-delivery.mjs leest dezelfde constante', /\? FULLY : LEVERTAG/.test(TAGDEL));

  /* ── 1 · JPEG ─────────────────────────────────────────────────────────── */
  const basis = sharp({ create: { width: 48, height: 60, channels: 3, background: '#7a5a3c' } });
  const kaal = await basis.clone().jpeg({ quality: 90 }).toBuffer();
  {
    const r = tagJpeg(kaal);
    ok('jpg zonder XMP: getagd', r.status === 'getagd');
    const t = await lees(r.bytes, 'jpg');
    ok('exiftool leest de tag terug', t.DigitalSourceType === LEVERTAG, String(t.DigitalSourceType));
    ok('het beeld is pixel voor pixel hetzelfde', gelijk(await pixels(r.bytes), await pixels(kaal)));
    ok('nog een keer taggen verandert niets ("al")', tagJpeg(r.bytes).status === 'al' && gelijk(tagJpeg(r.bytes).bytes, r.bytes));
    ok('deterministisch: twee keer dezelfde uitkomst', gelijk(tagJpeg(kaal).bytes, r.bytes));
  }

  /* Een export zoals Photoshop hem maakt: Exif, ICC en een XMP-pakket met
     attributen, een geschiedenis en opvulruimte. */
  const PS_XMP = `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Adobe XMP Core 9.1-c002 79.a1cd12f, 2024/11/11-19:08:46        ">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:xmp="http://ns.adobe.com/xap/1.0/"
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/"
    xmlns:xmpMM="http://ns.adobe.com/xap/1.0/mm/"
    xmlns:stEvt="http://ns.adobe.com/xap/1.0/sType/ResourceEvent#"
   xmp:CreatorTool="Adobe Photoshop 26.1 (Windows)"
   xmp:CreateDate="2026-10-08T10:12:01+02:00"
   dc:format="image/jpeg"
   photoshop:ColorMode="3"
   photoshop:ICCProfile="sRGB IEC61966-2.1"
   xmpMM:DocumentID="xmp.did:5f1e2b9c-0000-4c1a-9a2b-voorbeeld">
   <xmpMM:History>
    <rdf:Seq>
     <rdf:li stEvt:action="created" stEvt:when="2026-10-08T10:12:01+02:00" stEvt:softwareAgent="Adobe Photoshop 26.1 (Windows)"/>
     <rdf:li stEvt:action="saved" stEvt:when="2026-10-08T10:14:44+02:00" stEvt:softwareAgent="Adobe Photoshop 26.1 (Windows)"/>
    </rdf:Seq>
   </xmpMM:History>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
${' '.repeat(2000)}
<?xpacket end="w"?>`;
  function metXmp(jpg, pakket) {
    const b = Buffer.from(jpg);
    const inhoud = Buffer.concat([Buffer.from('http://ns.adobe.com/xap/1.0/\0', 'latin1'), Buffer.from(pakket, 'utf8')]);
    const kop = Buffer.from([0xff, 0xe1, (inhoud.length + 2) >> 8, (inhoud.length + 2) & 0xff]);
    // Na de eerste reeks APP0/APP1(Exif)/APP2: zoals Photoshop, vóór de tabellen.
    let i = 2;
    while (b[i] === 0xff && b[i + 1] >= 0xe0 && b[i + 1] <= 0xe2) i += 2 + b.readUInt16BE(i + 2);
    return Buffer.concat([b.subarray(0, i), kop, inhoud, b.subarray(i)]);
  }
  const ps = metXmp(await basis.clone().withExif({ IFD0: { Software: 'Adobe Photoshop 26.1 (Windows)' } }).withIccProfile('srgb').jpeg({ quality: 90 }).toBuffer(), PS_XMP);
  {
    const voor = await lees(ps, 'jpg');
    ok('(de proef-export heeft echt Photoshop-XMP, Exif en ICC)', voor.CreatorTool === 'Adobe Photoshop 26.1 (Windows)' && !!voor.ProfileDescription && /^Adobe Photoshop 26\.1/.test(String(voor.Software)), JSON.stringify({ c: voor.CreatorTool, p: voor.ProfileDescription, s: voor.Software }));
    const r = tagJpeg(ps);
    const t = await lees(r.bytes, 'jpg');
    ok('Photoshop-export: de tag erbij', r.status === 'getagd' && t.DigitalSourceType === LEVERTAG, String(t.DigitalSourceType));
    ok('en de bestaande XMP blijft: CreatorTool en de geschiedenis', t.CreatorTool === 'Adobe Photoshop 26.1 (Windows)' && Array.isArray(t.History) && t.History.length === 2, JSON.stringify(t.History));
    ok('Exif en het kleurprofiel blijven', String(t.Software) === String(voor.Software) && t.ProfileDescription === voor.ProfileDescription);
    ok('maar één XMP-segment', (Buffer.from(r.bytes).toString('latin1').match(/http:\/\/ns\.adobe\.com\/xap\/1\.0\/\0/g) || []).length === 1);
    ok('pixels gelijk', gelijk(await pixels(r.bytes), await pixels(ps)));
  }
  {
    /* Al getagd met de andere waarde (bijv. door het oude script vóór 11 oktober, als element). */
    const pad = join(map, 'fully.jpg');
    writeFileSync(pad, kaal);
    await exiftool.write(pad, { 'XMP-iptcExt:DigitalSourceType': COMPOSITE }, { writeArgs: ['-overwrite_original'] });
    const r = tagJpeg(readFileSync(pad));
    const t = await lees(r.bytes, 'jpg');
    ok('een andere waarde wordt de leverwaarde (één claim per levering)', r.status === 'getagd' && t.DigitalSourceType === LEVERTAG, String(t.DigitalSourceType));
    const zelfde = readFileSync(pad);
    const r2 = tagJpeg(zelfde, COMPOSITE);
    ok('staat de waarde er al precies zo: niets aangeraakt', r2.status === 'al' && gelijk(r2.bytes, zelfde));
  }
  {
    /* Photoshop-XMP dat samengevoegd niet meer in één segment past. */
    const groot = PS_XMP.replace(' '.repeat(2000), ' '.repeat(65400 - Buffer.byteLength(PS_XMP) + 2000));
    const jpg = metXmp(kaal, groot);
    const r = tagJpeg(jpg);
    const t = await lees(r.bytes, 'jpg');
    ok('te groot om samen te voegen: een klein pakket met alleen de tag', r.status === 'getagd' && t.DigitalSourceType === LEVERTAG && !t.CreatorTool, JSON.stringify({ s: r.status, c: t.CreatorTool }));
    ok('en het beeld blijft heel', gelijk(await pixels(r.bytes), await pixels(kaal)));
  }

  /* ── 2 · PNG ──────────────────────────────────────────────────────────── */
  const png = await basis.clone().png().toBuffer();
  {
    const r = tagPng(png);
    const t = await lees(r.bytes, 'png');
    ok('png: getagd en teruggelezen', r.status === 'getagd' && t.DigitalSourceType === LEVERTAG, String(t.DigitalSourceType));
    let crcGoed = true;
    try { PNG.sync.read(Buffer.from(r.bytes)); } catch { crcGoed = false; }
    ok('png: elke chunk-CRC klopt (pngjs)', crcGoed);
    ok('png: pixels gelijk', gelijk(await pixels(r.bytes), await pixels(png)));
    ok('png: nog een keer = "al"', tagPng(r.bytes).status === 'al');
    const pad = join(map, 'titel.png');
    writeFileSync(pad, png);
    await exiftool.write(pad, { 'XMP-dc:Title': 'Proefbeeld' }, { writeArgs: ['-overwrite_original'] });
    const m = tagPng(readFileSync(pad));
    const tm = await lees(m.bytes, 'png');
    ok('png met bestaande XMP: samengevoegd', tm.DigitalSourceType === LEVERTAG && tm.Title === 'Proefbeeld', JSON.stringify({ d: tm.DigitalSourceType, t: tm.Title }));
  }

  /* ── 3 · NOOIT EEN KAPOT BESTAND ─────────────────────────────────────────── */
  {
    const rommel = new Uint8Array(4000).map((_, i) => (i * 7919) & 255);
    const a = zetHerkomstTag(rommel, 'echt.jpg');
    ok('rommel met .jpg: ongewijzigd terug, aiTag 0', a.aiTag === 0 && a.status === 'onleesbaar' && gelijk(a.bytes, rommel));
    const afgekapt = kaal.subarray(0, 40);
    ok('een afgekapte jpg: ongewijzigd', tagJpeg(afgekapt).status === 'onleesbaar');
    const verkeerd = zetHerkomstTag(kaal, 'eigenlijk-jpg.png');
    ok('een jpg met .png-naam: ongewijzigd, geen tag', verkeerd.status === 'onleesbaar' && verkeerd.aiTag === 0 && gelijk(verkeerd.bytes, kaal));
    const webp = await basis.clone().webp().toBuffer();
    const w = zetHerkomstTag(webp, 'beeld.webp');
    ok('webp: niet te taggen, aiTag 0, ongewijzigd', w.status === 'niet-te-taggen' && w.aiTag === 0 && gelijk(w.bytes, webp));
    ok('voegTagToe begrijpt geen XMP zonder RDF', voegTagToe('<x:xmpmeta/>') === null);
    ok('het eigen pakket is te lezen', hasProvenanceTag(new TextEncoder().encode(xmpPakket())));
  }

  /* ── 4 · DE WEG VAN LUCAS: /admin ───────────────────────────────────────── */
  const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
  ok('het schema laadt (met ai_tag)', mislukt.length === 0 && telling(db, "SELECT COUNT(*) FROM pragma_table_info('files') WHERE name = 'ai_tag'") === 1);
  const r2 = new Map();
  const alleBytes = async (body) => {
    if (body instanceof ArrayBuffer) return new Uint8Array(body.slice(0));
    if (ArrayBuffer.isView(body)) return new Uint8Array(body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength));
    return new Uint8Array(await new Response(body).arrayBuffer());
  };
  const env = {
    DB: d1(db),
    ADMIN_ORIGIN: 'https://visuails.com',
    UPLOADS: {
      async put(key, body, opts) { r2.set(key, { bytes: await alleBytes(body), opts }); },
      async get(key) { const o = r2.get(key); return o ? { body: new Blob([o.bytes]).stream(), httpMetadata: o.opts?.httpMetadata, arrayBuffer: async () => o.bytes.slice().buffer } : null; },
      async list() { return { objects: [] }; },
      async delete(key) { r2.delete(key); },
    },
  };
  db.exec(`
    INSERT INTO customers (id, email, name, brand, country) VALUES (71, 'tag@voorbeeldmerk.test', 'Sam de Wit', 'Voorbeeldmerk', 'NL');
    INSERT INTO orders (id, ref, customer_id, service, status, name, brand, email, total_cents, lang, product_count, details_json, payment_status, country)
      VALUES (701, 'VIS-TEST-0701', 71, 'catalog', 'in_production', 'Sam de Wit', 'Voorbeeldmerk', 'tag@voorbeeldmerk.test', 12000, 'nl', 1, '{}', 'paid', 'NL');
  `);
  const token = await mintToken();
  db.exec(`INSERT INTO admin_users (id, email, password_hash) VALUES (1, 'studio@visuails.com', 'x')`);
  db.prepare(`INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (1, 1, ?, '2099-01-01T00:00:00Z')`).run(await hashToken(token));
  const kop = { cookie: `vis_admin=${token}`, origin: 'https://visuails.com' };
  const inVak = async (shot, bytes, naam, type) => {
    const fd = new FormData();
    fd.append('product', 'p1'); fd.append('shot', shot);
    fd.append('files', new File([bytes], naam, { type }));
    const res = await adminPost({ request: new Request('https://visuails.com/admin/orders/701/deliver', { method: 'POST', headers: kop, body: fd }), env, waitUntil() {} });
    return res.headers.get('location') || '';
  };
  const rij = (shot) => db.prepare("SELECT * FROM files WHERE order_id = 701 AND kind = 'delivery' AND shot = ? AND superseded_at IS NULL").get(shot);

  const naarJpg = await inVak('front', kaal, 'export_v3.jpg', 'image/jpeg');
  const vj = rij('front');
  const opgeslagenJpg = r2.get(vj.r2_key).bytes;
  ok('jpg in een vak: de tag zit in het bestand in R2 (exiftool)', (await lees(opgeslagenJpg, 'jpg')).DigitalSourceType === LEVERTAG);
  ok('ai_tag = 1 en bytes = wat er in R2 staat', vj.ai_tag === 1 && vj.bytes === opgeslagenJpg.length, JSON.stringify({ a: vj.ai_tag, b: vj.bytes, r: opgeslagenJpg.length }));
  ok('geen waarschuwing in de terugweg', !/zondertag|formaat/.test(naarJpg), naarJpg);

  const naarPng = await inVak('back', png, 'export.png', 'image/png');
  const vp = rij('back');
  ok('png in een vak: getagd (exiftool)', (await lees(r2.get(vp.r2_key).bytes, 'png')).DigitalSourceType === LEVERTAG && vp.ai_tag === 1);
  ok('png: de terugweg meldt het formaat', /formaat=png/.test(naarPng), naarPng);
  const bordPng = await (await adminGet({ request: new Request(`https://visuails.com${naarPng}`, { headers: kop }), env, waitUntil() {} })).text();
  ok('het bord waarschuwt: "Dit beeld is png. Leverbeelden zijn standaard jpg."', /Dit beeld is png\. Leverbeelden zijn standaard jpg\./.test(bordPng));

  const webp = await basis.clone().webp().toBuffer();
  const naarWebp = await inVak('detail', webp, 'detail.webp', 'image/webp');
  ok('webp: ai_tag = 0, en de terugweg zegt het', rij('detail').ai_tag === 0 && /zondertag=1/.test(naarWebp) && /formaat=webp/.test(naarWebp), naarWebp);

  const bord = await (await adminGet({ request: new Request('https://visuails.com/admin/orders/701/files', { headers: kop }), env, waitUntil() {} })).text();
  ok('bord: chip "AI-tag" bij de jpg en de png', (bord.match(/<span class="or-let is-stil"[^>]*>AI-tag<\/span>/g) || []).length === 2);
  ok('bord: "geen AI-tag" in de waarschuwingskleur bij de webp', /<span class="or-let" title="Geen herkomsttag[^"]*">geen AI-tag<\/span><span class="or-let"[^>]*>webp<\/span>/.test(bord));

  /* Dezelfde jpg nog een keer: getagd is deterministisch, dus "ongewijzigd". */
  const weer = await inVak('front', kaal, 'export_v3.jpg', 'image/jpeg');
  ok('dezelfde jpg opnieuw: ongewijzigd (4.02 werkt ook met de tag)', /ongewijzigd=1/.test(weer) && rij('front').id === vj.id, weer);

  /* De maandset. */
  {
    const fd = new FormData();
    fd.append('month', '2026-11');
    fd.append('files', new File([kaal], 'maand-1.jpg', { type: 'image/jpeg' }));
    await adminPost({ request: new Request('https://visuails.com/admin/maandset', { method: 'POST', headers: kop, body: fd }), env, waitUntil() {} });
    const s = db.prepare('SELECT r2_key, bytes FROM shared_files ORDER BY id DESC').get();
    const b = r2.get(s.r2_key)?.bytes;
    const t = b ? await lees(b, 'jpg') : {};
    ok('maandset: getagd met de waarde van /editions', t.DigitalSourceType === MAANDSETTAG && s.bytes === b.length, JSON.stringify({ d: t.DigitalSourceType }));
  }
} finally {
  await exiftool.end();
  rmSync(map, { recursive: true, force: true });
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
