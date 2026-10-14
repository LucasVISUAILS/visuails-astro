/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * kiptc · DE HERKOMSTTAG IN EEN MP4 — 11 oktober 2026 (K5 punt 2)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas: video "ja, als het in /admin zonder extra stap lukt". src/lib/xmp.js
 * (tagMp4) zet de tag als XMP-uuid-box ACHTERAAN, zodat geen byte van de film
 * verschuift. Deze toets:
 *   · leest de tag terug met exiftool;
 *   · laat ffmpeg elk beeld en elk stukje geluid decoderen en vergelijkt de
 *     framemd5 van voor en na: de film is dezelfde (overgeslagen als ffmpeg er
 *     niet is — dan alleen de boxen en exiftool's QuickTime-lezing);
 *   · een mp4 met XMP vóór mdat (zoals exiftool hem schrijft): samengevoegd in
 *     dezelfde lengte, de rest van de XMP blijft;
 *   · een gefragmenteerde mp4, een afgekapte, een box "tot het einde": het
 *     origineel ongewijzigd terug;
 *   · de weg door /admin: een mp4 in een bestelling → in R2 met tag, ai_tag = 1,
 *     en de chip "AI-tag" op het bord; boven de grens van 32 MB gaat hij
 *     ongewijzigd door, zonder chip.
 *   · iptc.js: de leverwaarde is trainedAlgorithmicMedia, en /ai-act en
 *     /editions noemen hem via TAG_WOORD.
 *
 * exiftool en ffmpeg draaien als losse processen, geen server; daarom mag dit
 * direct. Verzonnen merk.
 */
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { exiftool } from 'exiftool-vendored';
import { tagMp4, zetHerkomstTagMp4, kanTaggenVideo } from '../src/lib/xmp.js';
import { LEVERTAG, FULLY, COMPOSITE, TAG_WOORD, tagNaam } from '../src/lib/iptc.js';
import { adminGet, adminPost } from '../src/lib/admin.js';
import { mintToken, hashToken } from '../src/lib/token.js';
import { d1, verseDb } from './lib/d1sqlite.mjs';

let pass = 0;
let fail = 0;
function ok(name, cond, extra = '') {
  if (cond) pass++; else fail++;
  console.log(`${cond ? ' ok  ' : ' FAIL'} ${name}${cond || !extra ? '' : ` — ${extra}`}`);
}
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

const map = mkdtempSync(join(tmpdir(), 'herkomsttag-video-'));
const heeft = (cmd) => { try { execFileSync(cmd, ['-version'], { stdio: 'ignore' }); return true; } catch { return false; } };
const FFMPEG = heeft('ffmpeg');
let n = 0;
const schrijf = (bytes, ext = 'mp4') => { const p = join(map, `v${++n}.${ext}`); writeFileSync(p, Buffer.from(bytes)); return p; };
const blobBytes = async (b) => new Uint8Array(await b.arrayBuffer());
const boxen = (b) => {
  const buf = Buffer.from(b); const uit = []; let o = 0;
  while (o + 8 <= buf.length) { let m = buf.readUInt32BE(o); const t = buf.toString('latin1', o + 4, o + 8); if (m === 1) m = Number(buf.readBigUInt64BE(o + 8)); if (m < 8) break; uit.push(t); o += m; }
  return uit;
};
const frames = (pad) => execFileSync('ffmpeg', ['-v', 'error', '-i', pad, '-map', '0', '-f', 'framemd5', '-'], { encoding: 'utf8' })
  .split('\n').filter((r) => r && !r.startsWith('#')).join('\n');
const decodeert = (pad) => { try { execFileSync('ffmpeg', ['-v', 'error', '-xerror', '-i', pad, '-f', 'null', '-'], { stdio: 'pipe' }); return true; } catch { return false; } };

/* Een synthetische, structureel geldige mp4 (geen echte film) voor als ffmpeg ontbreekt. */
const box = (type, inhoud) => { const b = Buffer.alloc(8 + inhoud.length); b.writeUInt32BE(8 + inhoud.length, 0); b.write(type, 4, 'latin1'); Buffer.from(inhoud).copy(b, 8); return b; };
const synthetisch = Buffer.concat([box('ftyp', Buffer.from('isom\0\0\x02\0isomiso2mp41', 'latin1')), box('moov', Buffer.alloc(64, 1)), box('mdat', Buffer.alloc(512, 7))]);

try {
  /* ── 0 · DE WAARDE ───────────────────────────────────────────────────── */
  ok('de leverwaarde is trainedAlgorithmicMedia (kiptc = a)', LEVERTAG === FULLY && tagNaam() === 'trainedAlgorithmicMedia');
  ok('TAG_WOORD zegt het in gewone woorden', TAG_WOORD[LEVERTAG].nl === 'door een AI-model gemaakt' && TAG_WOORD[LEVERTAG].en === 'made by an AI model' && TAG_WOORD[COMPOSITE].nl === 'deels door een AI-model gemaakt');
  const AIACT = lees('src/components/AiActHal.astro'); // de hal sinds 13 oktober; AiActPage.astro staat op de opruimlijst
  ok('/ai-act (EN en NL) noemt de waarde uit iptc.js', /with the value \$\{tagNaam\(LEVERTAG\)\}: a machine-readable line saying the image was \$\{TAG_WOORD\[LEVERTAG\]\.en\}/.test(AIACT)
    && /met de waarde \$\{tagNaam\(LEVERTAG\)\}: een machineleesbare regel die zegt dat het beeld \$\{TAG_WOORD\[LEVERTAG\]\.nl\} is/.test(AIACT));
  ok('/ai-act: ook video’s', /In the photos and videos we deliver/.test(AIACT) && /In de foto’s en video’s die we leveren/.test(AIACT));
  const ED = lees('src/components/EditionsHal.astro');
  ok('/editions: geen "sterkste van de twee" meer als ze gelijk zijn', /MAANDSETTAG === LEVERTAG \? ', dezelfde waarde als elke levering van ons'/.test(ED) && /MAANDSETTAG === LEVERTAG \? ', the same value as every delivery of ours'/.test(ED));
  ok('nergens meer "partially modified by AI" als uitleg van de leverwaarde', !/partially modified by AI/.test(lees('scripts/tag-delivery.mjs')));
  ok('alleen .mp4 is een video die getagd wordt', kanTaggenVideo('film.MP4') && !kanTaggenVideo('film.mov') && !kanTaggenVideo('beeld.jpg'));

  /* ── 1 · EEN ECHTE MP4 (ffmpeg) OF EEN SYNTHETISCHE ───────────────────── */
  const bronnen = [];
  if (FFMPEG) {
    const gewoon = join(map, 'gewoon.mp4');
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc=duration=1:size=96x64:rate=12', '-f', 'lavfi', '-i', 'sine=duration=1', '-pix_fmt', 'yuv420p', '-c:v', 'libx264', '-c:a', 'aac', '-shortest', gewoon]);
    const snel = join(map, 'snel.mp4');
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', gewoon, '-c', 'copy', '-movflags', '+faststart', snel]);
    bronnen.push(['mdat vóór moov', gewoon], ['moov vóór mdat (faststart)', snel]);
  } else {
    console.log(' --   ffmpeg ontbreekt: alleen de synthetische mp4, zonder afspeelcontrole');
    bronnen.push(['synthetisch', schrijf(synthetisch)]);
  }
  for (const [naam, pad] of bronnen) {
    const voor = readFileSync(pad);
    const r = await zetHerkomstTagMp4(new Blob([voor]));
    const na = await blobBytes(r.blob);
    ok(`${naam}: getagd, ai_tag 1`, r.status === 'getagd' && r.aiTag === 1, r.status);
    ok(`${naam}: het origineel staat er byte voor byte vooraan`, Buffer.compare(Buffer.from(na.subarray(0, voor.length)), voor) === 0);
    ok(`${naam}: één XMP-box erbij, achteraan`, boxen(na).join(',') === `${boxen(voor).join(',')},uuid`, boxen(na).join(','));
    const p = schrijf(na);
    const t = await exiftool.read(p);
    ok(`${naam}: exiftool leest de tag terug`, t.DigitalSourceType === LEVERTAG, String(t.DigitalSourceType));
    if (FFMPEG) {
      ok(`${naam}: exiftool leest de film nog (duur ${t.Duration})`, Number(t.Duration) > 0.9 || /^1(\.0+)? s$/.test(String(t.Duration)), String(t.Duration));
      ok(`${naam}: ffmpeg decodeert alles zonder fout`, decodeert(p));
      ok(`${naam}: elk beeld en elk stukje geluid is gelijk (framemd5)`, frames(pad) === frames(p) && frames(p).split('\n').length > 20);
    }
    const weer = await zetHerkomstTagMp4(new Blob([na]));
    ok(`${naam}: nog een keer: "al", niets aangeraakt`, weer.status === 'al' && weer.aiTag === 1 && Buffer.compare(Buffer.from(await blobBytes(weer.blob)), Buffer.from(na)) === 0);
    const twee = await blobBytes((await zetHerkomstTagMp4(new Blob([voor]))).blob);
    ok(`${naam}: deterministisch`, Buffer.compare(Buffer.from(twee), Buffer.from(na)) === 0);
  }

  /* ── 2 · XMP VÓÓR MDAT (zoals exiftool hem schrijft) ───────────────────── */
  {
    let pad;
    if (FFMPEG) {
      pad = schrijf(readFileSync(bronnen[0][1]));
      await exiftool.write(pad, { 'XMP-dc:Title': 'Proefbeeld', 'XMP-iptcExt:DigitalSourceType': COMPOSITE }, { writeArgs: ['-overwrite_original'] });
    } else {
      /* Zonder ffmpeg: dezelfde vorm met de hand (exiftool weigert een nepfilm). */
      const pakket = `<?xpacket begin='\ufeff' id='W5M0MpCehiHzreSzNTczkc9d'?>\n<x:xmpmeta xmlns:x='adobe:ns:meta/'>\n <rdf:RDF xmlns:rdf='http://www.w3.org/1999/02/22-rdf-syntax-ns#'>\n  <rdf:Description rdf:about='' xmlns:dc='http://purl.org/dc/elements/1.1/' xmlns:Iptc4xmpExt='http://iptc.org/std/Iptc4xmpExt/2008-02-29/'>\n   <dc:title><rdf:Alt><rdf:li xml:lang='x-default'>Proefbeeld</rdf:li></rdf:Alt></dc:title>\n   <Iptc4xmpExt:DigitalSourceType>${COMPOSITE}</Iptc4xmpExt:DigitalSourceType>\n  </rdf:Description>\n </rdf:RDF>\n</x:xmpmeta>\n${' '.repeat(2048)}\n<?xpacket end='w'?>`;
      const x = box('uuid', Buffer.concat([Buffer.from('be7acfcb97a942e89c71999491e3afac', 'hex'), Buffer.from(pakket)]));
      pad = schrijf(Buffer.concat([synthetisch.subarray(0, 100), x, synthetisch.subarray(100)]));
    }
    const voor = readFileSync(pad);
    const volgorde = boxen(voor);
    ok('exiftool zette de XMP vóór mdat', volgorde.indexOf('uuid') >= 0 && volgorde.indexOf('uuid') < volgorde.indexOf('mdat'), volgorde.join(','));
    const r = await zetHerkomstTagMp4(new Blob([voor]));
    const na = await blobBytes(r.blob);
    ok('samengevoegd: getagd, in precies dezelfde lengte', r.status === 'getagd' && r.aiTag === 1 && na.length === voor.length, `${r.status} ${voor.length} → ${na.length}`);
    const p = schrijf(na);
    const t = await exiftool.read(p);
    ok('de andere waarde is vervangen, de titel blijft', t.DigitalSourceType === LEVERTAG && t.Title === 'Proefbeeld', JSON.stringify({ d: t.DigitalSourceType, t: t.Title }));
    if (FFMPEG) ok('en de film is dezelfde (framemd5)', frames(pad) === frames(p));
  }

  /* ── 3 · ELKE TWIJFEL = HET ORIGINEEL ──────────────────────────────────── */
  {
    const geval = async (naam, bytes) => {
      const r = await zetHerkomstTagMp4(new Blob([bytes]));
      const na = await blobBytes(r.blob);
      ok(`${naam}: onaangeroerd terug, ai_tag 0`, r.status === 'onleesbaar' && r.aiTag === 0 && Buffer.compare(Buffer.from(na), Buffer.from(bytes)) === 0, r.status);
    };
    if (FFMPEG) {
      const frag = join(map, 'frag.mp4');
      execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', bronnen[0][1], '-c', 'copy', '-movflags', 'frag_keyframe+empty_moov', frag]);
      await geval('gefragmenteerde mp4 (moof)', readFileSync(frag));
    }
    await geval('afgekapt', synthetisch.subarray(0, synthetisch.length - 10));
    const totEinde = Buffer.from(synthetisch); totEinde.writeUInt32BE(0, totEinde.length - 520);
    await geval('mdat "tot het einde" (grootte 0)', totEinde);
    await geval('geen ftyp vooraan', Buffer.concat([box('moov', Buffer.alloc(16)), box('mdat', Buffer.alloc(16))]));
    await geval('geen moov', Buffer.concat([box('ftyp', Buffer.alloc(16)), box('mdat', Buffer.alloc(16))]));
    await geval('een jpg met .mp4 erachter', Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0xff, 0xd9]));
    const xmpBox = (tekst) => { const inh = Buffer.concat([Buffer.from('be7acfcb97a942e89c71999491e3afac', 'hex'), Buffer.from(tekst)]); return box('uuid', inh); };
    await geval('twee XMP-boxen', Buffer.concat([synthetisch, xmpBox('<x/>'), xmpBox('<y/>')]));
  }

  /* ── 4 · DE WEG DOOR /admin ────────────────────────────────────────────── */
  {
    const { db } = verseDb(new URL('../schema.sql', import.meta.url));
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
        async put(key, body, opts) { r2.set(key, { bytes: await alleBytes(body), opts, soort: body?.constructor?.name }); },
        async get(key) { const o = r2.get(key); return o ? { body: new Blob([o.bytes]).stream(), httpMetadata: o.opts?.httpMetadata, arrayBuffer: async () => o.bytes.slice().buffer } : null; },
        async list() { return { objects: [] }; },
        async delete(key) { r2.delete(key); },
      },
    };
    db.exec(`
      INSERT INTO customers (id, email, name, brand, country) VALUES (72, 'film@voorbeeldmerk.test', 'Sam de Wit', 'Voorbeeldmerk', 'NL');
      INSERT INTO orders (id, ref, customer_id, service, status, name, brand, email, total_cents, lang, product_count, details_json, payment_status, country)
        VALUES (702, 'VIS-TEST-0702', 72, 'video', 'in_production', 'Sam de Wit', 'Voorbeeldmerk', 'film@voorbeeldmerk.test', 12000, 'nl', 1, '{}', 'paid', 'NL');
      INSERT INTO admin_users (id, email, password_hash) VALUES (1, 'studio@visuails.com', 'x');
    `);
    const token = await mintToken();
    db.prepare(`INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (1, 1, ?, '2099-01-01T00:00:00Z')`).run(await hashToken(token));
    const kop = { cookie: `vis_admin=${token}`, origin: 'https://visuails.com' };
    const upload = async (bytes, naam) => {
      const fd = new FormData();
      fd.append('product', 'p1'); fd.append('shot', 'front');
      fd.append('files', new File([bytes], naam, { type: 'video/mp4' }));
      const res = await adminPost({ request: new Request('https://visuails.com/admin/orders/702/deliver', { method: 'POST', headers: kop, body: fd }), env, waitUntil() {} });
      return res.headers.get('location') || String(res.status);
    };
    const film = FFMPEG ? readFileSync(bronnen[0][1]) : synthetisch;
    const terug = await upload(film, 'VIS-TEST-0702-reveal.mp4');
    const rij = db.prepare("SELECT * FROM files WHERE order_id = 702 AND kind = 'delivery' ORDER BY id DESC").get();
    ok('mp4 geüpload in /admin: er is een rij', !!rij, terug);
    const opgeslagen = rij && r2.get(rij.r2_key);
    ok('  in R2 met de tag (exiftool)', !!opgeslagen && (await exiftool.read(schrijf(opgeslagen.bytes))).DigitalSourceType === LEVERTAG);
    ok('  ai_tag = 1 en bytes = wat er in R2 staat', rij && rij.ai_tag === 1 && rij.bytes === opgeslagen.bytes.length, JSON.stringify({ a: rij?.ai_tag, b: rij?.bytes, r: opgeslagen?.bytes.length }));
    ok('  het type blijft video/mp4', opgeslagen?.opts?.httpMetadata?.contentType === 'video/mp4');
    ok('  geen "exporteer als jpg"-waarschuwing in de terugweg', !/zondertag/.test(terug), terug);
    if (FFMPEG) ok('  en de film in R2 speelt (ffmpeg)', decodeert(schrijf(opgeslagen.bytes)));
    const bord = await (await adminGet({ request: new Request('https://visuails.com/admin/orders/702/files', { headers: kop }), env, waitUntil() {} })).text();
    ok('  het bord toont de chip "AI-tag"', /<span class="or-let is-stil"[^>]*>AI-tag<\/span>/.test(bord));
    ok('admin.js: boven MAX_SCAN_BYTES geen tag en geen chip (dezelfde grens als jpg en png)', /const taggenVideo = kanTaggenVideo\(clean\) && Number\(file\.size\) <= MAX_SCAN_BYTES;/.test(lees('src/lib/admin.js')));
    ok('admin.js: de film wordt niet in zijn geheel gelezen om te taggen (Blob, alleen de boxkoppen)', /const t = await zetHerkomstTagMp4\(file, LEVERTAG\);/.test(lees('src/lib/admin.js')) && !/arrayBuffer\(\)/.test(lees('src/lib/xmp.js').slice(lees('src/lib/xmp.js').indexOf('async function mp4Boxen'), lees('src/lib/xmp.js').indexOf('export async function tagMp4')).replace(/blob\.slice\(o, o \+ n\)\.arrayBuffer\(\)/g, '')));
  }
} finally {
  await exiftool.end();
  rmSync(map, { recursive: true, force: true });
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
