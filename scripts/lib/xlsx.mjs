/*
 * VISUAILS — EEN TABEL ALS .xlsx, ZONDER PYTHON EN ZONDER PAKKET (5 november 2026)
 *
 * Levering 71. Lucas vult zijn tekstronde in Excel in; TEKSTEN.bat maakt de tabel
 * en TEKSTEN-TOEPASSEN.bat leest hem terug. Tot vandaag maakte
 * scripts/tekstblad-xlsx.py de xlsx, en op zijn pc staat geen Python (de opdracht
 * van 25 oktober: "ga er niet van uit dat hij Python heeft"). Een xlsx is een zip
 * met een paar XML-bestanden erin; Node heeft zlib, en meer is er niet nodig.
 *
 *   schrijfXlsx(rijen, { kolommen, breedtes, blad })  → Buffer
 *   leesXlsx(buffer)                                    → [[cel, cel, …], …]
 *
 * SCHRIJVEN: één werkblad, de eerste rij vet en vastgezet, elke cel tekst
 * (inlineStr, zodat er geen tabel met gedeelde teksten nodig is), terugloop aan.
 * LEZEN: wat Excel er na het opslaan van maakt, dus ook gedeelde teksten
 * (sharedStrings.xml), rich text (<r><t>…</t></r>), lege cellen tussendoor
 * (de kolom komt uit de celnaam, "C7"), en getallen als tekst.
 *
 * Wat dit niet doet: formules, datums, meerdere bladen lezen (alleen het eerste),
 * versleutelde bestanden. Een tekstronde heeft die niet nodig.
 */
import zlib from 'node:zlib';

/* ── CRC-32, zoals zip hem wil ───────────────────────────────────────────── */
const CRC_TABEL = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
export function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABEL[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

/* ── ZIP ─────────────────────────────────────────────────────────────────── */
/** Een zip uit [{ naam, data: Buffer|string }], elk bestand met deflate. */
export function maakZip(bestanden) {
  const delen = [];
  const centraal = [];
  let offset = 0;
  /* Een vaste datum (1 januari 2026, 00:00) in DOS-vorm: dezelfde invoer geeft
     dezelfde bytes, wat toetsen en vergelijken makkelijker maakt. */
  const dosTijd = 0;
  const dosDatum = ((2026 - 1980) << 9) | (1 << 5) | 1;
  for (const b of bestanden) {
    const naam = Buffer.from(b.naam, 'utf8');
    const ruw = Buffer.isBuffer(b.data) ? b.data : Buffer.from(String(b.data), 'utf8');
    const ingepakt = zlib.deflateRawSync(ruw);
    const crc = crc32(ruw);
    const kop = Buffer.alloc(30);
    kop.writeUInt32LE(0x04034b50, 0);
    kop.writeUInt16LE(20, 4);          // versie nodig
    kop.writeUInt16LE(0x0800, 6);      // vlag: namen in UTF-8
    kop.writeUInt16LE(8, 8);           // deflate
    kop.writeUInt16LE(dosTijd, 10);
    kop.writeUInt16LE(dosDatum, 12);
    kop.writeUInt32LE(crc, 14);
    kop.writeUInt32LE(ingepakt.length, 18);
    kop.writeUInt32LE(ruw.length, 22);
    kop.writeUInt16LE(naam.length, 26);
    kop.writeUInt16LE(0, 28);
    delen.push(kop, naam, ingepakt);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0);
    c.writeUInt16LE(20, 4);
    c.writeUInt16LE(20, 6);
    c.writeUInt16LE(0x0800, 8);
    c.writeUInt16LE(8, 10);
    c.writeUInt16LE(dosTijd, 12);
    c.writeUInt16LE(dosDatum, 14);
    c.writeUInt32LE(crc, 16);
    c.writeUInt32LE(ingepakt.length, 20);
    c.writeUInt32LE(ruw.length, 24);
    c.writeUInt16LE(naam.length, 28);
    c.writeUInt32LE(offset, 42);
    centraal.push(c, naam);
    offset += kop.length + naam.length + ingepakt.length;
  }
  const cd = Buffer.concat(centraal);
  const eind = Buffer.alloc(22);
  eind.writeUInt32LE(0x06054b50, 0);
  eind.writeUInt16LE(bestanden.length, 8);
  eind.writeUInt16LE(bestanden.length, 10);
  eind.writeUInt32LE(cd.length, 12);
  eind.writeUInt32LE(offset, 16);
  return Buffer.concat([...delen, cd, eind]);
}

/** De bestanden in een zip als Map(naam → Buffer). Gooit bij iets wat geen zip is. */
export function leesZip(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 22) throw new Error('geen zip-bestand (te kort)');
  let e = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i -= 1) {
    if (buf.readUInt32LE(i) === 0x06054b50) { e = i; break; }
  }
  if (e < 0) throw new Error('geen zip-bestand (geen einde gevonden)');
  const aantal = buf.readUInt16LE(e + 10);
  let p = buf.readUInt32LE(e + 16);
  const uit = new Map();
  for (let n = 0; n < aantal; n += 1) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('zip: kapotte inhoudsopgave');
    const methode = buf.readUInt16LE(p + 10);
    const grootte = buf.readUInt32LE(p + 20);
    const lNaam = buf.readUInt16LE(p + 28);
    const lExtra = buf.readUInt16LE(p + 30);
    const lCommentaar = buf.readUInt16LE(p + 32);
    const lokaal = buf.readUInt32LE(p + 42);
    const naam = buf.slice(p + 46, p + 46 + lNaam).toString('utf8');
    const lnL = buf.readUInt16LE(lokaal + 26);
    const leL = buf.readUInt16LE(lokaal + 28);
    const start = lokaal + 30 + lnL + leL;
    const ruw = buf.slice(start, start + grootte);
    if (methode === 0) uit.set(naam, ruw);
    else if (methode === 8) uit.set(naam, zlib.inflateRawSync(ruw));
    else throw new Error(`zip: onbekende inpakmethode ${methode} bij ${naam}`);
    p += 46 + lNaam + lExtra + lCommentaar;
  }
  return uit;
}

/* ── XML ─────────────────────────────────────────────────────────────────── */
const esc = (s) => String(s ?? '')
  /* Tekens die XML 1.0 niet toestaat (behalve tab, nieuwe regel, return) weg. */
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const ontEsc = (s) => String(s ?? '')
  .replace(/&#x([0-9a-f]+);/gi, (m, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(Number(d)))
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

/** "A", "B", … "Z", "AA" — de kolomletter van index 0, 1, … */
export function kolomLetter(i) {
  let n = i + 1; let s = '';
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
}
function kolomIndex(letters) {
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function bladXml(rijen, breedtes, vastKop) {
  const rijXml = rijen.map((rij, r) => {
    const cellen = rij.map((waarde, k) => {
      const ref = `${kolomLetter(k)}${r + 1}`;
      const stijl = r === 0 && vastKop ? 1 : 2;
      if (waarde == null || waarde === '') return `<c r="${ref}" s="${stijl}"/>`;
      return `<c r="${ref}" s="${stijl}" t="inlineStr"><is><t xml:space="preserve">${esc(waarde)}</t></is></c>`;
    }).join('');
    return `<row r="${r + 1}">${cellen}</row>`;
  }).join('');
  const cols = breedtes.length
    ? `<cols>${breedtes.map((b, i) => `<col min="${i + 1}" max="${i + 1}" width="${Number(b) || 20}" customWidth="1"/>`).join('')}</cols>`
    : '';
  const breed = Math.max(1, ...rijen.map((r) => r.length));
  const pane = vastKop ? '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' : '<sheetViews><sheetView workbookViewId="0"/></sheetViews>';
  const filter = vastKop ? `<autoFilter ref="A1:${kolomLetter(breed - 1)}${Math.max(1, rijen.length)}"/>` : '';
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${pane}${cols}<sheetData>${rijXml}</sheetData>${filter}</worksheet>`;
}

/**
 * Een xlsx. `rijen` is een lijst van lijsten (tekst of getal; een getal wordt als
 * tekst opgeslagen, zodat Excel er niets mee doet). De eerste rij is de kop: vet en
 * vastgezet. Of meerdere bladen: `schrijfXlsx(null, { bladen: [{ naam, rijen,
 * breedtes, kop }] })`, `kop: false` voor een blad zonder kop (een uitleg).
 */
export function schrijfXlsx(rijen, { breedtes = [], blad = 'Teksten', bladen = null } = {}) {
  const lijst = bladen || [{ naam: blad, rijen, breedtes, kop: true }];
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="49" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyNumberFormat="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  const namen = lijst.map((b) => esc(b.naam).slice(0, 31));
  const filters = lijst.map((b, i) => (b.kop === false ? '' : `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${namen[i]}'!$A$1:$${kolomLetter(Math.max(0, Math.max(1, ...b.rijen.map((r) => r.length)) - 1))}$${Math.max(1, b.rijen.length)}</definedName>`)).join('');
  return maakZip([
    { naam: '[Content_Types].xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${lijst.map((b, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>` },
    { naam: '_rels/.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { naam: 'xl/workbook.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${namen.map((n, i) => `<sheet name="${n}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>${filters ? `<definedNames>${filters}</definedNames>` : ''}</workbook>` },
    { naam: 'xl/_rels/workbook.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${lijst.map((b, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${lijst.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    ...lijst.map((b, i) => ({ naam: `xl/worksheets/sheet${i + 1}.xml`, data: bladXml(b.rijen, b.breedtes || [], b.kop !== false) })),
    { naam: 'xl/styles.xml', data: styles },
  ]);
}

/** De tekst van een <si> of <is>: alle <t> achter elkaar (ook rich text). */
function tekstVan(xml) {
  const delen = [];
  for (const m of String(xml).matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>|<t(?:\s[^>]*)?\/>/g)) delen.push(ontEsc(m[1] || ''));
  return delen.join('');
}

/** Een blad van een xlsx (het eerste, of het blad met naam `blad`) als lijst van rijen (lege cellen als ''). */
export function leesXlsx(buf, { blad = null } = {}) {
  const z = leesZip(buf);
  /* Welk bestand het blad is: workbook.xml → de relatie → het pad. */
  const wb = String(z.get('xl/workbook.xml') || '');
  const rels = String(z.get('xl/_rels/workbook.xml.rels') || '');
  const bladen = [...wb.matchAll(/<sheet\b[^>]*>/g)].map((m) => ({ naam: ontEsc(/\bname="([^"]*)"/.exec(m[0])?.[1] || ''), id: /\br:id="([^"]+)"/.exec(m[0])?.[1] }));
  const gekozen = (blad && bladen.find((x) => x.naam.toLowerCase() === String(blad).toLowerCase())) || bladen[0];
  const eerste = gekozen?.id;
  let pad = 'xl/worksheets/sheet1.xml';
  if (eerste) {
    const rel = new RegExp(`<Relationship\\b[^>]*\\bId="${eerste}"[^>]*\\bTarget="([^"]+)"`).exec(rels)
      || new RegExp(`<Relationship\\b[^>]*\\bTarget="([^"]+)"[^>]*\\bId="${eerste}"`).exec(rels);
    if (rel) pad = rel[1].startsWith('/') ? rel[1].slice(1) : `xl/${rel[1].replace(/^\.\//, '')}`;
  }
  const sheet = z.get(pad);
  if (!sheet) throw new Error(`xlsx: het eerste blad (${pad}) ontbreekt`);
  const gedeeld = [];
  const sst = z.get('xl/sharedStrings.xml');
  if (sst) for (const m of String(sst).matchAll(/<si>([\s\S]*?)<\/si>/g)) gedeeld.push(tekstVan(m[1]));
  const rijen = [];
  for (const r of String(sheet).matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>|<row\b([^>]*)\/>/g)) {
    const nr = Number(/\br="(\d+)"/.exec(r[1] || r[3] || '')?.[1]) || rijen.length + 1;
    const rij = [];
    for (const c of String(r[2] || '').matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attr = c[1] || '';
      const ref = /\br="([A-Z]+)\d+"/.exec(attr)?.[1];
      const k = ref ? kolomIndex(ref) : rij.length;
      const type = /\bt="([^"]+)"/.exec(attr)?.[1] || '';
      const binnen = c[2] || '';
      let waarde = '';
      if (type === 's') waarde = gedeeld[Number(/<v>([\s\S]*?)<\/v>/.exec(binnen)?.[1])] ?? '';
      else if (type === 'inlineStr') waarde = tekstVan(/<is>([\s\S]*?)<\/is>/.exec(binnen)?.[1] || '');
      else waarde = ontEsc(/<v>([\s\S]*?)<\/v>/.exec(binnen)?.[1] || '');
      while (rij.length < k) rij.push('');
      rij[k] = waarde;
    }
    while (rijen.length < nr - 1) rijen.push([]);
    rijen[nr - 1] = rij;
  }
  return rijen;
}
