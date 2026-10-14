/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE HERKOMSTTAG SCHRIJVEN, IN DE WORKER — 8 oktober 2026 (punt 4.01)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * /ai-act §6 belooft dat elk geleverd bestand een machine-leesbare herkomsttag
 * draagt (IPTC `DigitalSourceType` in de XMP). Die tag kwam alleen uit
 * scripts/tag-delivery.mjs (exiftool), en dat script is nooit gedraaid. De
 * hoofdweg naar de klant is /admin, dus zet de Worker de tag er nu zelf in, bij
 * elke jpg en png die daar binnenkomt: "Map uploaden", een vak op het bord, een
 * vervanging op een revisiekaart en de maandset. Geen handeling meer.
 *
 * In augustus is dit bewust NIET gedaan (zie de kop van provenance.js): een fout in
 * eigen bytes maakt een geleverd bestand kapot, en dat is erger dan een bestand
 * zonder tag. Die zorg blijft de regel van dit bestand:
 *
 *   ELKE TWIJFEL = HET ORIGINEEL ONAANGEROERD TERUG. Klopt een lengte niet, ontbreekt
 *   een marker, is het XMP geen geldig UTF-8: dan komt het bestand ongewijzigd terug
 *   en zegt /admin "geen AI-tag". Nooit een half geschreven bestand.
 *
 * Wat er gebeurt:
 *   JPEG  één APP1-segment met "http://ns.adobe.com/xap/1.0/\0" + het XMP-pakket.
 *         Staat er al XMP (Photoshop zet er een), dan wordt de tag daarin
 *         samengevoegd; past het samengevoegde pakket niet in één segment (64 KB),
 *         dan vervangt een klein pakket met alleen de tag het oude. Na de
 *         startscan (SOS) wordt geen byte aangeraakt.
 *   PNG   één iTXt-chunk "XML:com.adobe.xmp" (ongecomprimeerd) vóór de eerste IDAT,
 *         met een eigen CRC; een bestaande wordt samengevoegd of vervangen.
 *   MP4   één XMP-uuid-box achteraan (11 oktober 2026, zie tagMp4 hieronder).
 *   rest  niets (webp, avif, mov): die krijgen op het bord "geen AI-tag".
 *
 * Deterministisch: hetzelfde bestand levert altijd dezelfde bytes op. Daardoor
 * herkent "Map uploaden" een ongewijzigd beeld ook na het taggen (4.02).
 *
 * Elke metadatawijziging maakt een C2PA-handtekening ongeldig (exiftool net zo);
 * zie §25 en de risico-regel in het voorstel van 4.01.
 */
import { LEVERTAG } from './iptc.js';
import { hasProvenanceTag } from './provenance.js';

const NS = 'http://iptc.org/std/Iptc4xmpExt/2008-02-29/';
const XMP_KOP = 'http://ns.adobe.com/xap/1.0/\0';
const PNG_SLEUTEL = 'XML:com.adobe.xmp';
/** De grootste inhoud van één JPEG-segment: 65535 min de twee lengtebytes. */
const MAX_SEGMENT = 65533;

const enc = new TextEncoder();

/** Een eigen, klein XMP-pakket met alleen de tag. */
export function xmpPakket(waarde = LEVERTAG) {
  return '<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>\n'
    + '<x:xmpmeta xmlns:x="adobe:ns:meta/">\n'
    + ' <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">\n'
    + `  <rdf:Description rdf:about="" xmlns:Iptc4xmpExt="${NS}"\n`
    + `   Iptc4xmpExt:DigitalSourceType="${waarde}"/>\n`
    + ' </rdf:RDF>\n'
    + '</x:xmpmeta>\n'
    + '<?xpacket end="w"?>';
}

const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * De tag in een bestaand XMP-pakket zetten. Geeft het nieuwe pakket, hetzelfde
 * pakket als de waarde er al precies zo in stond, of null als het pakket niet te
 * begrijpen is (dan maakt de aanroeper een eigen pakket).
 */
export function voegTagToe(pakket, waarde = LEVERTAG) {
  const p = String(pakket || '');
  if (!/<rdf:RDF[\s>]/.test(p)) return null;
  /* Welk voorvoegsel hoort bij de IPTC-uitbreiding? Meestal Iptc4xmpExt. */
  const decl = p.match(new RegExp(`xmlns:([A-Za-z_][\\w.-]*)\\s*=\\s*["']${escRe(NS)}["']`));
  if (decl) {
    const pre = escRe(decl[1]);
    /* Als attribuut: Iptc4xmpExt:DigitalSourceType="…" */
    const attr = new RegExp(`(\\s${pre}:DigitalSourceType\\s*=\\s*)(["'])([^"']*)\\2`);
    const a = p.match(attr);
    if (a) return a[3] === waarde ? p : p.replace(attr, `$1$2${waarde}$2`);
    /* Als element met tekst: <Iptc4xmpExt:DigitalSourceType>…</…> */
    const el = new RegExp(`(<${pre}:DigitalSourceType\\s*>)([^<]*)(</${pre}:DigitalSourceType\\s*>)`);
    const e = p.match(el);
    if (e) return e[2].trim() === waarde ? p : p.replace(el, `$1${waarde}$3`);
    /* Als element met rdf:resource: <Iptc4xmpExt:DigitalSourceType rdf:resource="…"/> */
    const res = new RegExp(`(<${pre}:DigitalSourceType\\s+rdf:resource\\s*=\\s*)(["'])([^"']*)\\2`);
    const r = p.match(res);
    if (r) return r[3] === waarde ? p : p.replace(res, `$1$2${waarde}$2`);
    /* Het voorvoegsel is er, de eigenschap niet. Op de Description die het
       voorvoegsel declareert, of — staat het hoger (rdf:RDF, x:xmpmeta) — op de
       eerste Description. */
    const eigen = p.slice(0, decl.index).lastIndexOf('<');
    const tagNaam = (p.slice(eigen).match(/^<([\w:.-]+)/) || [])[1];
    const doel = tagNaam === 'rdf:Description' ? eigen : p.search(/<rdf:Description[\s/>]/);
    if (doel < 0) return null;
    const na = doel + '<rdf:Description'.length;
    return `${p.slice(0, na)} ${decl[1]}:DigitalSourceType="${waarde}"${p.slice(na)}`;
  }
  /* Nog geen IPTC-uitbreiding: namespace en eigenschap op de eerste Description. */
  const doel = p.search(/<rdf:Description[\s/>]/);
  if (doel >= 0) {
    const na = doel + '<rdf:Description'.length;
    return `${p.slice(0, na)} xmlns:Iptc4xmpExt="${NS}" Iptc4xmpExt:DigitalSourceType="${waarde}"${p.slice(na)}`;
  }
  /* Een RDF zonder Description: er een bij zetten. */
  const rdf = p.match(/<rdf:RDF[^>]*>/);
  if (!rdf) return null;
  const na = rdf.index + rdf[0].length;
  return `${p.slice(0, na)}<rdf:Description rdf:about="" xmlns:Iptc4xmpExt="${NS}" Iptc4xmpExt:DigitalSourceType="${waarde}"/>${p.slice(na)}`;
}

function samen(...delen) {
  const n = delen.reduce((s, d) => s + d.length, 0);
  const uit = new Uint8Array(n);
  let o = 0;
  for (const d of delen) { uit.set(d, o); o += d.length; }
  return uit;
}

function begintMet(b, at, tekst) {
  if (at + tekst.length > b.length) return false;
  for (let i = 0; i < tekst.length; i++) if (b[at + i] !== tekst.charCodeAt(i)) return false;
  return true;
}

/** UTF-8 streng lezen; null bij ongeldige bytes. */
function leesUtf8(bytes) {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { return null; }
}

/** Het pakket dat erin gaat: samengevoegd als het kan, anders het kleine. */
function nieuwPakket(oud, waarde, maxBytes) {
  const tekst = oud == null ? null : leesUtf8(oud);
  const samengevoegd = tekst == null ? null : voegTagToe(tekst, waarde);
  if (samengevoegd != null && samengevoegd === tekst) return { al: true };
  if (samengevoegd != null) {
    const b = enc.encode(samengevoegd);
    if (b.length <= maxBytes) return { bytes: b };
  }
  return { bytes: enc.encode(xmpPakket(waarde)) };
}

/**
 * JPEG: de tag in het APP1-XMP-segment.
 * @returns {{ bytes: Uint8Array, status: 'getagd'|'al'|'onleesbaar' }}
 */
export function tagJpeg(input, waarde = LEVERTAG) {
  const b = input instanceof Uint8Array ? input : new Uint8Array(input);
  const onleesbaar = { bytes: b, status: 'onleesbaar' };
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return onleesbaar;
  let i = 2;
  let invoegen = 2;
  let kop = true;          // nog in de eerste reeks APP0/APP1-segmenten
  let xmp = null;
  let sos = false;
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff) return onleesbaar;
    const m = b[i + 1];
    if (m === 0xff) { i += 1; continue; }                                  // opvulbyte
    if (m === 0x01 || (m >= 0xd0 && m <= 0xd8)) { i += 2; continue; }      // geen lengte
    if (m === 0xd9) return onleesbaar;                                     // EOI vóór de scan
    if (m === 0xda) { sos = true; break; }                                 // vanaf hier: niet aanraken
    const len = (b[i + 2] << 8) | b[i + 3];
    if (len < 2 || i + 2 + len > b.length) return onleesbaar;
    const einde = i + 2 + len;
    if (m === 0xe1 && !xmp && begintMet(b, i + 4, XMP_KOP)) {
      xmp = { start: i, einde, data: b.subarray(i + 4 + XMP_KOP.length, einde) };
    }
    if (kop && (m === 0xe0 || (m === 0xe1 && begintMet(b, i + 4, 'Exif\0')))) invoegen = einde;
    else kop = false;
    i = einde;
  }
  if (!sos) return onleesbaar;
  const pk = nieuwPakket(xmp ? xmp.data : null, waarde, MAX_SEGMENT - XMP_KOP.length);
  if (pk.al) return { bytes: b, status: 'al' };
  const inhoud = samen(enc.encode(XMP_KOP), pk.bytes);
  const len = inhoud.length + 2;
  const segment = samen(new Uint8Array([0xff, 0xe1, len >> 8, len & 0xff]), inhoud);
  const uit = xmp
    ? samen(b.subarray(0, xmp.start), segment, b.subarray(xmp.einde))
    : samen(b.subarray(0, invoegen), segment, b.subarray(invoegen));
  return { bytes: uit, status: 'getagd' };
}

/* CRC-32 voor de png-chunk (zelfde polynoom als zip.js). */
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(...delen) {
  let c = 0xffffffff;
  for (const d of delen) for (let i = 0; i < d.length; i++) c = CRC[(c ^ d[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
const u32 = (n) => new Uint8Array([(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]);
const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/**
 * PNG: de tag in een iTXt-chunk "XML:com.adobe.xmp".
 * @returns {{ bytes: Uint8Array, status: 'getagd'|'al'|'onleesbaar' }}
 */
export function tagPng(input, waarde = LEVERTAG) {
  const b = input instanceof Uint8Array ? input : new Uint8Array(input);
  const onleesbaar = { bytes: b, status: 'onleesbaar' };
  if (b.length < 8 || PNG_SIG.some((x, k) => b[k] !== x)) return onleesbaar;
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let i = 8;
  let eerste = true;
  let idat = -1;
  let iend = false;
  let oud = null;
  while (i + 12 <= b.length) {
    const len = dv.getUint32(i);
    const type = String.fromCharCode(b[i + 4], b[i + 5], b[i + 6], b[i + 7]);
    const einde = i + 12 + len;
    if (len > 0x7fffffff || einde > b.length) return onleesbaar;
    if (eerste && type !== 'IHDR') return onleesbaar;
    eerste = false;
    if (type === 'IDAT' && idat < 0) idat = i;
    if (type === 'iTXt' && !oud && begintMet(b, i + 8, `${PNG_SLEUTEL}\0`)) {
      const data = b.subarray(i + 8, i + 8 + len);
      let o = PNG_SLEUTEL.length + 1;
      const gecomprimeerd = data[o];
      o += 2;                                            // vlag + methode
      const taalEinde = data.indexOf(0, o);
      const vertaalEinde = taalEinde < 0 ? -1 : data.indexOf(0, taalEinde + 1);
      oud = { start: i, einde, tekst: (gecomprimeerd === 0 && vertaalEinde >= 0) ? data.subarray(vertaalEinde + 1) : null };
    }
    if (type === 'IEND') { iend = true; break; }
    i = einde;
  }
  if (!iend || idat < 0) return onleesbaar;
  const pk = nieuwPakket(oud ? oud.tekst : null, waarde, 0x7fffffff);
  if (pk.al) return { bytes: b, status: 'al' };
  const type = enc.encode('iTXt');
  const data = samen(enc.encode(PNG_SLEUTEL), new Uint8Array([0, 0, 0, 0, 0]), pk.bytes);
  const chunk = samen(u32(data.length), type, data, u32(crc32(type, data)));
  const uit = oud
    ? samen(b.subarray(0, oud.start), chunk, b.subarray(oud.einde))
    : samen(b.subarray(0, idat), chunk, b.subarray(idat));
  return { bytes: uit, status: 'getagd' };
}

/* ══ MP4 — 11 oktober 2026 (kiptc, video a) ══════════════════════════════════
 *
 * Lucas: video "ja, als het in /admin zonder extra stap lukt". Het lukt, op één
 * voorwaarde die de hele aanpak bepaalt: GEEN BYTE VAN DE FILM VERSCHUIFT.
 *
 * Een mp4 is een rij boxen (ISO BMFF). In `moov` staan de tabellen (stco/co64)
 * met de ABSOLUTE positie van elk stuk beeld en geluid in `mdat`. Een box
 * ertussen zetten, of vóór `mdat` iets langer maken, zet al die posities
 * verkeerd: de film speelt dan niet meer. Achteraan iets toevoegen verschuift
 * niets. Dus:
 *
 *   geen XMP          één top-level box `uuid` met het XMP-kenmerk
 *                     (BE7ACFCB-97A9-42E8-9C71-999491E3AFAC, Adobe XMP deel 3)
 *                     ACHTERAAN; exiftool leest hem als XMP-iptcExt.
 *   XMP achteraan     die box vervangen (samengevoegd, of een eigen klein pakket).
 *   XMP ergens anders samengevoegd IN DEZELFDE LENGTE (opvulspaties vóór
 *                     `<?xpacket end`), anders niets.
 *
 * En ELKE TWIJFEL = HET ORIGINEEL, net als bij jpg en png: geen `ftyp` vooraan,
 * geen `moov` of `mdat`, boxen die niet precies op de bestandslengte uitkomen,
 * een box "tot het einde" (grootte 0), twee XMP-boxen, of een gefragmenteerde
 * mp4 (`moof`/`mfra`: daar zoekt een speler `mfro` in de laatste bytes, en die
 * mogen we niet wegduwen).
 *
 * GEHEUGEN. Alleen de koppen van de boxen worden gelezen (een paar bytes per
 * box, via Blob.slice), nooit de film zelf. De uitkomst is een Blob uit de
 * stukken van het origineel plus de nieuwe box. /admin doet dit alleen tot
 * MAX_SCAN_BYTES, dezelfde grens als bij jpg en png; een grotere film gaat
 * ongewijzigd door, zonder chip ("niet gekeken" is iets anders dan "geen tag").
 */
const XMP_UUID = [0xbe, 0x7a, 0xcf, 0xcb, 0x97, 0xa9, 0x42, 0xe8, 0x9c, 0x71, 0x99, 0x94, 0x91, 0xe3, 0xaf, 0xac];
const MP4_MAX_BOXEN = 4096;
const MP4_MAX_XMP = 1024 * 1024;

/** Kan dit bestand hier een tag als video krijgen? Alleen mp4. */
export function kanTaggenVideo(naam) {
  return /\.mp4$/i.test(String(naam || ''));
}

function mp4Box(pakketBytes) {
  const n = 8 + 16 + pakketBytes.length;
  return samen(u32(n), enc.encode('uuid'), new Uint8Array(XMP_UUID), pakketBytes);
}

/** De top-level boxen, of null als iets niet klopt. */
async function mp4Boxen(lees, grootte) {
  const boxen = [];
  let off = 0;
  while (off < grootte) {
    if (boxen.length >= MP4_MAX_BOXEN || grootte - off < 8) return null;
    const kop = await lees(off, Math.min(32, grootte - off));
    if (kop.length < 8) return null;
    const dv = new DataView(kop.buffer, kop.byteOffset, kop.byteLength);
    let maat = dv.getUint32(0);
    const type = String.fromCharCode(kop[4], kop[5], kop[6], kop[7]);
    if (!/^[\x20-\x7e]{4}$/.test(type)) return null;
    let kopLen = 8;
    if (maat === 1) {
      if (kop.length < 16) return null;
      maat = dv.getUint32(8) * 2 ** 32 + dv.getUint32(12);
      kopLen = 16;
    } else if (maat === 0) {
      return null;                                     // "tot het einde": niet aanraken
    }
    if (maat < kopLen || off + maat > grootte) return null;
    let xmp = false;
    if (type === 'uuid') {
      if (kop.length < kopLen + 16 || maat < kopLen + 16) return null;
      xmp = XMP_UUID.every((x, k) => kop[kopLen + k] === x);
    }
    boxen.push({ type, start: off, einde: off + maat, inhoud: off + kopLen + (type === 'uuid' ? 16 : 0), xmp });
    off += maat;
  }
  return off === grootte ? boxen : null;
}

/**
 * MP4: de tag in een XMP-uuid-box. Werkt op een Blob (een File uit een
 * formulier is er een) en leest alleen de boxkoppen.
 * @returns {Promise<{ blob: Blob, status: 'getagd'|'al'|'onleesbaar', box?: [number, number] }>}
 *   `box`: begin en einde van de XMP-box in de nieuwe blob (om terug te lezen).
 */
export async function tagMp4(blob, waarde = LEVERTAG) {
  const onleesbaar = { blob, status: 'onleesbaar' };
  const grootte = Number(blob?.size) || 0;
  if (grootte < 16 || typeof blob.slice !== 'function') return onleesbaar;
  const lees = async (o, n) => new Uint8Array(await blob.slice(o, o + n).arrayBuffer());
  const boxen = await mp4Boxen(lees, grootte);
  if (!boxen || !boxen.length || boxen[0].type !== 'ftyp') return onleesbaar;
  const soorten = new Set(boxen.map((b) => b.type));
  if (!soorten.has('moov') || !soorten.has('mdat') || soorten.has('moof') || soorten.has('mfra')) return onleesbaar;
  const xmps = boxen.filter((b) => b.xmp);
  if (xmps.length > 1) return onleesbaar;

  if (!xmps.length) {
    const box = mp4Box(enc.encode(xmpPakket(waarde)));
    return { blob: new Blob([blob, box]), status: 'getagd', box: [grootte, grootte + box.length] };
  }

  const x = xmps[0];
  const inhoudLen = x.einde - x.inhoud;
  if (inhoudLen > MP4_MAX_XMP) return onleesbaar;
  const tekst = leesUtf8(await lees(x.inhoud, inhoudLen));
  const samengevoegd = tekst == null ? null : voegTagToe(tekst, waarde);
  if (samengevoegd != null && samengevoegd === tekst) return { blob, status: 'al', box: [x.start, x.einde] };

  if (x.einde === grootte) {
    /* De XMP staat achteraan: vervangen mag, er komt niets achter. */
    const box = mp4Box(enc.encode(samengevoegd != null ? samengevoegd : xmpPakket(waarde)));
    return { blob: new Blob([blob.slice(0, x.start), box]), status: 'getagd', box: [x.start, x.start + box.length] };
  }
  /* Ergens ertussen: alleen in precies dezelfde lengte. */
  if (samengevoegd == null) return onleesbaar;
  /* De opvulruimte die een XMP-pakket daarvoor heeft (exiftool en Adobe zetten
     er een paar kB spaties vóór `<?xpacket end`) eerst weg, dan opnieuw tot
     precies de oude lengte. */
  const eind = samengevoegd.lastIndexOf('<?xpacket end');
  if (eind < 0) return onleesbaar;
  const kern = `${samengevoegd.slice(0, eind).replace(/\s+$/, '')}\n`;
  const staart = samengevoegd.slice(eind);
  const tekort = inhoudLen - enc.encode(kern + staart).length;
  if (tekort < 0) return onleesbaar;
  const opgevuld = enc.encode(`${kern}${' '.repeat(tekort)}${staart}`);
  if (opgevuld.length !== inhoudLen) return onleesbaar;
  return { blob: new Blob([blob.slice(0, x.inhoud), opgevuld, blob.slice(x.einde)]), status: 'getagd', box: [x.start, x.einde] };
}

/**
 * De tag op een mp4 uit /admin. Nooit een fout: bij twijfel het origineel.
 * @returns {Promise<{ blob: Blob, aiTag: 0|1, status: string }>}
 *   aiTag: 1 als de XMP-box van de uitkomst de tag aantoonbaar draagt.
 */
export async function zetHerkomstTagMp4(blob, waarde = LEVERTAG) {
  let r;
  try { r = await tagMp4(blob, waarde); } catch { r = { blob, status: 'onleesbaar' }; }
  let aiTag = 0;
  if (r.box && r.status !== 'onleesbaar') {
    try {
      const terug = new Uint8Array(await r.blob.slice(r.box[0], r.box[1]).arrayBuffer());
      aiTag = hasProvenanceTag(terug) ? 1 : 0;
    } catch { aiTag = 0; }
  }
  return { blob: r.blob, aiTag, status: r.status };
}

/** Kan dit bestand de tag hier krijgen? Alleen jpg en png. */
export function kanTaggen(naam) {
  return /\.(jpe?g|png)$/i.test(String(naam || ''));
}

/**
 * De tag zetten op een bestand uit /admin.
 *
 * @param {ArrayBuffer|Uint8Array} buffer  de bytes zoals ze binnenkwamen
 * @param {string} naam                    de bestandsnaam (de extensie beslist)
 * @param {string} [waarde]                LEVERTAG, of MAANDSETTAG voor de maandset
 * @returns {{ bytes: ArrayBuffer, aiTag: 0|1, status: string }}
 *   aiTag: 1 als het opgeslagen bestand de tag draagt, anders 0.
 */
export function zetHerkomstTag(buffer, naam, waarde = LEVERTAG) {
  const b = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let r = { bytes: b, status: 'niet-te-taggen' };
  try {
    if (/\.jpe?g$/i.test(naam)) r = tagJpeg(b, waarde);
    else if (/\.png$/i.test(naam)) r = tagPng(b, waarde);
  } catch {
    r = { bytes: b, status: 'onleesbaar' };
  }
  const uit = r.bytes;
  const ab = (uit.byteOffset === 0 && uit.byteLength === uit.buffer.byteLength) ? uit.buffer : uit.slice().buffer;
  return { bytes: ab, aiTag: hasProvenanceTag(ab) ? 1 : 0, status: r.status };
}
