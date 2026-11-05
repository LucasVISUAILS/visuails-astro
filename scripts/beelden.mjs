/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * VISUAILS — ZELF BEELDEN EN ICONEN VERVANGEN (levering 71, 5 november 2026)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   BEELDEN.bat                       (dubbelklik; Lucas)
 *   node scripts/beelden.mjs          verwerk wat er in eigen-beelden\ staat
 *   node scripts/beelden.mjs --lijst  alleen de lijst van beeldvakken bijwerken
 *
 *   Uitgang: 0 groen, 1 rood (iets niet gedaan, of er ging iets mis), 3 er stond
 *   niets in de map (BEELDEN.bat opent dan BEELDVAKKEN.html).
 *
 * Lucas, 18 oktober: hij wil de beelden en iconen zelf kunnen vervangen, want "er
 * staan nog veel plaatshouders en oude foto's en stijlen op de site", en nu kost elke
 * beeldwissel een levering. Zoals FORMATEN.bat: een dubbelklik met een duidelijk
 * resultaat, geen opdrachtregel waarbij je "hoopt dat het gelukt is".
 *
 * ── WAT HIJ DOET ───────────────────────────────────────────────────────────────
 *
 *  1 · DE VAKKEN. Elk beeld dat de site vraagt, met zijn naam, de pagina's waar het
 *      staat, de verhouding en de maten die de site gebruikt. Uit de laatste build
 *      (dist/, die UITROLLEN.bat altijd maakt) en uit public/img. Weggeschreven in
 *      eigen-beelden\BEELDVAKKEN.html (om te bekijken) en kladblok\BEELDVAKKEN.md.
 *  2 · DE BEELDEN in eigen-beelden\: een bestand onder de NAAM van een vak (bv.
 *      lifestyle-august-02.png). Gekeurd op verhouding (hoogstens 2 % ernaast) en op
 *      maat (minstens zo breed als de grootste maat die de site vraagt). Dan: het
 *      origineel als webp (kwaliteit 92, hoogstens 2400 px), elke kleinere maat die
 *      de site gebruikt (-w380, -w760 …, kwaliteit 80) en de AVIF ernaast
 *      (scripts/make-avif.mjs). In public\img. Een oude naam (oude-beelden.json) komt
 *      in KLAAR in src/data/beeld.js, zodat hij geen plaatshouder meer is.
 *  3 · DE ICONEN in eigen-beelden\: een .svg onder de naam van een icoon in
 *      src/data/iconen.js (bv. vink.svg), gekeurd tegen het kit (raster 24, gevuld,
 *      geen lijn, geen transform, geen ingesloten beeld) en dan in iconen.js gezet.
 *  4 · EEN CONTACTBLAD voor en na: eigen-beelden\CONTACTBLAD.html. Het oude beeld
 *      staat in eigen-beelden\_vorige\, zodat je terug kunt. Een verwerkt bestand
 *      gaat naar eigen-beelden\_verwerkt\, zodat een tweede dubbelklik het niet
 *      nog eens doet.
 *
 * ── DRIE DINGEN DIE HIJ BEWAAKT ─────────────────────────────────────────────────
 *
 *  · DE MAAT. Ligt er al een beeld, dan krijgt het nieuwe precies dezelfde breedte en
 *    hoogte (bijgesneden op het midden, hoogstens 2 %). Daarop rekenen de width en
 *    height in de pagina's en de w-maten in de srcset; zo verspringt er niets.
 *  · DE TELEFOONVERSIE. De -w1200 / -w1400 van src/data/telefoonbeelden.js maakt
 *    scripts/make-telefoon.mjs, met de kwaliteit die daar per foto gemeten is. Die
 *    maat slaat dit script over en laat hij aan dat script.
 *  · DE HERKOMST (C2PA). Draagt het bestand content credentials (een jpg of png uit
 *    de beeldmaker, of een webp), dan komt dat blok in elke webp en AVIF die hieruit
 *    gemaakt wordt, zoals bij de beelden die er nu staan. Zonder dit zou het omzetten
 *    het stilletjes weghalen (docs/FABLE-EN-VISUAILS.md: "niet stilletjes een
 *    gemarkeerd bestand ongemarkeerd maken"). De handtekening hoort bij het origineel;
 *    na het omzetten klopt de hash niet meer, net als bij elke kleinere maat die er nu
 *    ligt. Het blok zegt waar het beeld vandaan komt; het is geen nieuwe handtekening.
 *
 * Het resultaat is GROEN of ROOD, in gewone woorden, met wat je moet doen als het
 * rood is. Daarna rol je uit zoals altijd. Alleen Node en sharp (al in het project).
 *
 * Paden met fileURLToPath en path.join, nooit met .pathname: de projectmap heet
 * "E:\Claude (VISUAILS)\visuails-astro" (zie tests/paths.test.mjs).
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { TELEFOONBEELDEN } from '../src/data/telefoonbeelden.js';

/* BEELDEN_WORTEL: alleen voor tests/zelf-vervangen-71.test.mjs, die het hele verloop
   in een tijdelijke map draait in plaats van in public/img. */
const WORTEL = process.env.BEELDEN_WORTEL ? path.resolve(process.env.BEELDEN_WORTEL) : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ZONDER_SCRIPTS = process.env.BEELDEN_ZONDER_SCRIPTS === '1';   /* idem: geen make-avif/make-telefoon */

/** Afwijking van de verhouding die nog mag (2 %). */
export const VERHOUDING_SPELING = 0.02;
/** De langste zijde van een origineel in public/img. */
export const MAX_ZIJDE = 2400;
export const KWALITEIT_ORIGINEEL = 92;
export const KWALITEIT_AFGELEID = 80;
const BEELD_EXT = /\.(png|jpe?g|webp|tiff?)$/i;
const REF = /\/img\/([a-z0-9][a-z0-9-]*?)(?:-w(\d+))?\.(webp|avif|png|jpe?g)/g;

/* ── 1 · DE VAKKEN ─────────────────────────────────────────────────────────── */

function* htmlBestanden(map) {
  if (!fs.existsSync(map)) return;
  for (const e of fs.readdirSync(map, { withFileTypes: true })) {
    const p = path.join(map, e.name);
    if (e.isDirectory()) { if (!['_astro', 'server', 'img', '_worker.js'].includes(e.name)) yield* htmlBestanden(p); }
    else if (e.name.endsWith('.html')) yield p;
  }
}

/** De pagina van een html-bestand in dist/: dist/nl/catalog/index.html → /nl/catalog/. */
export function paginaVan(dist, bestand) {
  const rel = path.relative(dist, bestand).split(path.sep).join('/');
  return `/${rel.replace(/(^|\/)index\.html$/, '$1')}`.replace(/\/+/g, '/');
}

/**
 * Alle beeldvakken: Map(naam → { naam, paginas:Set, breedtes:Set, vraag:{w,h}|null }).
 * `dist` is de map van de build, `img` public/img. Iconen, logo's, mail en de
 * submappen van public/img (hal/, laptop/, ui/ …) doen niet mee: dat zijn geen
 * vakken die je met een foto vult.
 */
export function vindVakken({ dist = path.join(WORTEL, 'dist'), img = path.join(WORTEL, 'public', 'img') } = {}) {
  const vakken = new Map();
  const vak = (naam) => {
    if (!vakken.has(naam)) vakken.set(naam, { naam, paginas: new Set(), breedtes: new Set(), vraag: null });
    return vakken.get(naam);
  };
  for (const f of htmlBestanden(dist)) {
    const html = fs.readFileSync(f, 'utf8');
    const pagina = paginaVan(dist, f);
    if (/\/plaatshouder\//.test(pagina)) continue;
    for (const m of html.matchAll(REF)) {
      if (/^(i-|og-|favicon|apple-touch)/.test(m[1])) continue;
      const v = vak(m[1]);
      v.paginas.add(pagina);
      if (m[2]) v.breedtes.add(Number(m[2]));
    }
    /* Een plaatshouder: de naam staat in het pad van de svg, de maat in het <img>. */
    for (const tag of html.match(/<img\b[^>]*>/g) || []) {
      const ph = /\/img\/plaatshouder\/([a-z0-9-]+?)(?:-donker)?\.svg/.exec(tag);
      const echt = /\ssrc="\/img\/([a-z0-9][a-z0-9-]*?)(?:-w\d+)?\.(?:webp|avif|png|jpe?g)"/.exec(tag);
      const naam = ph?.[1] || echt?.[1];
      if (!naam || /^(i-|og-|favicon|apple-touch)/.test(naam)) continue;
      const w = Number(/\swidth="(\d+)"/.exec(tag)?.[1]); const h = Number(/\sheight="(\d+)"/.exec(tag)?.[1]);
      const v = vak(naam);
      v.paginas.add(pagina);
      if (ph) v.plaatshouder = true;
      if (w && h && !v.vraag) v.vraag = { w, h };
    }
  }
  /* En de kleinere maten die er al liggen (een -w1200 voor de telefoon, bv.). */
  if (fs.existsSync(img)) {
    for (const f of fs.readdirSync(img)) {
      const m = /^([a-z0-9][a-z0-9-]*?)-w(\d+)\.webp$/.exec(f);
      if (m && vakken.has(m[1])) vakken.get(m[1]).breedtes.add(Number(m[2]));
    }
  }
  return vakken;
}

/**
 * Vakken die (nog) niet in de build staan: de beelden die nog moeten komen
 * (src/data/beeldenNodig.js, verborgen tot ze er zijn) en elk beeld dat een stijl
 * noemt, ook een stijl die alleen met de launchset op de site staat (August, Casual,
 * de nieuwe Classic). Zo kun je ze aanleveren vóórdat de schakelaar om gaat.
 */
export async function vakkenUitData(vakken) {
  const laad = (p) => import(pathToFileURL(path.join(WORTEL, p)).href);
  const naamVan = (src) => /\/img\/([a-z0-9][a-z0-9-]*?)(?:-w\d+)?\.(?:webp|avif|png|jpe?g)$/.exec(String(src || ''))?.[1];
  const voeg = (src, pagina, breedtes = [], vraag = null) => {
    const naam = naamVan(src);
    if (!naam) return;
    if (!vakken.has(naam)) vakken.set(naam, { naam, paginas: new Set(), breedtes: new Set(), vraag: null, uitData: true });
    const v = vakken.get(naam);
    v.paginas.add(pagina);
    for (const b of breedtes) v.breedtes.add(b);
    if (vraag && !v.vraag) v.vraag = vraag;
  };
  try {
    const { BEELDEN_NODIG } = await laad('src/data/beeldenNodig.js');
    for (const b of BEELDEN_NODIG || []) {
      const m = /(\d+)\s*[×x]\s*(\d+)/.exec(b.maat || '');
      voeg(b.bestand, b.plek || '', [], m ? { w: Number(m[1]), h: Number(m[2]) } : null);
      const v = vakken.get(naamVan(b.bestand));
      if (v && !fs.existsSync(path.join(WORTEL, 'public', b.bestand))) v.plaatshouder = true;
    }
  } catch { /* zonder die lijst: alleen de build */ }
  /* Een beeld van een nieuwe look heeft nog geen bestand en staat nog op geen pagina.
     Het krijgt de maat van HETZELFDE vak in de eerste look die er wel een heeft: de
     kop van August die van de kop van Flash, het derde beeld het derde beeld. */
  const { default: sharp } = await import('sharp');
  const opSchijf = (src) => src && fs.existsSync(path.join(WORTEL, 'public', String(src).replace(/^\//, '')));
  const zusje = async (lijst, kies) => {
    for (const z of lijst) {
      const src = kies(z);
      if (!opSchijf(src)) continue;
      try { const m = await sharp(path.join(WORTEL, 'public', String(src).replace(/^\//, ''))).metadata(); return { w: m.width, h: m.height }; } catch { /* volgende */ }
    }
    return null;
  };
  const metMaat = async (src, pagina, breedtes, lijst, kies) => {
    voeg(src, pagina, breedtes, opSchijf(src) ? null : await zusje(lijst, kies));
  };
  try {
    const { alleStyles } = await laad('src/data/styles.js');
    for (const s of alleStyles || []) {
      const pag = `/lifestyle/${s.slug}/${s.opSite === 'launch' ? ' (met de launchset)' : ''}`;
      await metMaat(s.heroPhoto, pag, [760], alleStyles, (z) => z.heroPhoto);
      await metMaat(s.cardPhoto, pag, [380, 760, 960], alleStyles, (z) => z.cardPhoto);
      for (const [i, g] of (s.grid || []).entries()) await metMaat(g.photo, pag, [760], alleStyles, (z) => z.grid?.[i]?.photo);
    }
    const { alleCatalogStyles } = await laad('src/data/catalogStyles.js');
    for (const s of alleCatalogStyles || []) {
      const pag = `/catalog/${s.slug}/${s.opSite === 'launch' ? ' (met de launchset)' : ''}`;
      for (const [i, f] of (s.fotos || []).entries()) await metMaat(f, pag, [760], alleCatalogStyles, (z) => z.fotos?.[i]);
      for (const [i, f] of (s.bijLaunch?.fotos || []).entries()) await metMaat(f, `${pag} (met de launchset)`, [760], alleCatalogStyles, (z) => z.fotos?.[i]);
    }
  } catch { /* zonder de stijldata: alleen de build */ }
  for (const v of vakken.values()) {
    if (v.uitData && !['webp', 'png', 'jpg'].some((e) => fs.existsSync(path.join(WORTEL, 'public', 'img', `${v.naam}.${e}`)))) v.plaatshouder = true;
  }
  return vakken;
}

/** De verhouding (b/h) en maat die een vak verwacht: van het bestand dat er ligt, anders van het <img>. */
export async function vakMaat(vak, img = path.join(WORTEL, 'public', 'img')) {
  const { default: sharp } = await import('sharp');
  for (const ext of ['webp', 'png', 'jpg', 'jpeg']) {
    const p = path.join(img, `${vak.naam}.${ext}`);
    if (fs.existsSync(p)) {
      try { const m = await sharp(p).metadata(); return { w: m.width, h: m.height, bron: 'bestand' }; } catch { /* volgende */ }
    }
  }
  if (vak.vraag) return { ...vak.vraag, bron: 'pagina' };
  return null;
}

/**
 * De minimale breedte: de grootste van de maten die de site gebruikt, de breedte van
 * het beeld dat er nu ligt (of bij een plaatshouder: de maat die de pagina vrijhoudt),
 * hoogstens 2400, en nooit minder dan 760.
 */
export function minimaleBreedte(vak, maat) {
  const uitBreedtes = vak.breedtes.size ? Math.max(...vak.breedtes) : 0;
  return Math.max(uitBreedtes, maat?.w ? Math.min(maat.w, MAX_ZIJDE) : 0, 760);
}

/** Of een beeld van b×h bij een vak past. Geeft { ok, waarom }. */
export function keurBeeld({ w, h }, vak, maat) {
  if (!(w > 0 && h > 0)) return { ok: false, waarom: 'het bestand is geen leesbaar beeld' };
  if (maat?.w && maat?.h) {
    const wil = maat.w / maat.h; const is = w / h;
    if (Math.abs(is - wil) / wil > VERHOUDING_SPELING) {
      return { ok: false, waarom: `de verhouding klopt niet: ${verhoudingTekst(w, h)}, het vak vraagt ${verhoudingTekst(maat.w, maat.h)}. Snijd het bij en zet het er opnieuw in.` };
    }
  }
  const min = minimaleBreedte(vak, maat);
  if (w < min) return { ok: false, waarom: `te klein: ${w} px breed, het vak vraagt minstens ${min} px.` };
  return { ok: true, waarom: '' };
}

export function verhoudingTekst(w, h) {
  const r = w / h;
  const bekend = [[1, 1], [4, 5], [5, 4], [3, 4], [4, 3], [2, 3], [3, 2], [9, 16], [16, 9]];
  const hit = bekend.find(([a, b]) => Math.abs(r - a / b) / (a / b) < VERHOUDING_SPELING);
  return hit ? `${hit[0]} : ${hit[1]} (${w} × ${h})` : `${w} × ${h}`;
}

/* ── 2 · VERWERKEN ─────────────────────────────────────────────────────────── */

/** De kleinere maat van een vak die scripts/make-telefoon.mjs maakt (of null). */
export function telefoonMaat(naam) {
  return TELEFOONBEELDEN[`/img/${naam}.webp`]?.klein ?? null;
}

/**
 * De maat van het nieuwe origineel. `maat` is wat er nu ligt of wat de pagina vraagt
 * (vakMaat). Ligt er een bestand, dan precies die maat; anders de verhouding van de
 * pagina op de breedte van het bestand (hoogstens 2400 px aan de langste zijde).
 */
export function doelMaat({ w, h }, maat) {
  if (maat?.bron === 'bestand') return { w: maat.w, h: maat.h };
  const r = maat?.w && maat?.h ? maat.w / maat.h : w / h;
  let dw = Math.min(w, MAX_ZIJDE); let dh = Math.round(dw / r);
  if (dh > MAX_ZIJDE) { dh = MAX_ZIJDE; dw = Math.round(dh * r); }
  return { w: dw, h: dh };
}

/**
 * Schrijft het origineel (op `doel`, zie doelMaat) en de kleinere maten, behalve de
 * telefoonversie (die maakt make-telefoon.mjs). Geeft de geschreven bestanden.
 */
export async function verwerkBeeld(bron, vak, { img = path.join(WORTEL, 'public', 'img'), vorige = null, doel = null } = {}) {
  const { default: sharp } = await import('sharp');
  const uit = [];
  if (vorige) {
    fs.mkdirSync(vorige, { recursive: true });
    const oud = path.join(img, `${vak.naam}.webp`);
    if (fs.existsSync(oud)) fs.copyFileSync(oud, path.join(vorige, `${vak.naam}-${new Date().toISOString().slice(0, 10)}.webp`));
  }
  /* Eén keer verliesloos naar de maat van het vak; elke webp komt daaruit. */
  const basis = doel
    ? sharp(bron).rotate().resize(doel.w, doel.h, { fit: 'cover', position: 'centre', kernel: 'lanczos3' })
    : sharp(bron).rotate().resize({ width: MAX_ZIJDE, height: MAX_ZIJDE, fit: 'inside', withoutEnlargement: true, kernel: 'lanczos3' });
  const png = await basis.png().toBuffer();
  const origineel = path.join(img, `${vak.naam}.webp`);
  await sharp(png).webp({ quality: KWALITEIT_ORIGINEEL }).toFile(origineel);
  uit.push(origineel);
  const telefoon = telefoonMaat(vak.naam);
  for (const b of [...vak.breedtes].sort((x, y) => x - y)) {
    if (b === telefoon) continue;
    const p = path.join(img, `${vak.naam}-w${b}.webp`);
    await sharp(png).resize({ width: b, withoutEnlargement: true, kernel: 'lanczos3' }).webp({ quality: KWALITEIT_AFGELEID }).toFile(p);
    uit.push(p);
  }
  return uit;
}

/* ── HERKOMST (C2PA) ───────────────────────────────────────────────────────── */

/** De uuid van een C2PA-blok in een AVIF (ISO BMFF), zoals in de beelden die er nu staan. */
const C2PA_UUID = Buffer.from('d8fec3d61b0e483c92975828877ec481', 'hex');
const isC2pa = (b) => !!b && b.length > 16 && b.includes('jumb') && b.includes('c2pa');

/**
 * Het C2PA-blok (de JUMBF-manifestwinkel) uit een webp, png, jpg of AVIF, of null.
 * webp: de RIFF-chunk "C2PA"; png: de chunk "caBX"; jpg: de APP11-segmenten met "JP"
 * (aan elkaar gezet); AVIF: de uuid-box hierboven.
 */
export function leesHerkomst(buf) {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf || []);
  try {
    if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
      for (let o = 12; o + 8 <= b.length;) {
        const id = b.toString('ascii', o, o + 4); const n = b.readUInt32LE(o + 4);
        if (id === 'C2PA') { const d = b.subarray(o + 8, o + 8 + n); return isC2pa(d) ? Buffer.from(d) : null; }
        o += 8 + n + (n & 1);
      }
      return null;
    }
    if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
      for (let o = 8; o + 8 <= b.length;) {
        const n = b.readUInt32BE(o); const id = b.toString('ascii', o + 4, o + 8);
        if (id === 'caBX') { const d = b.subarray(o + 8, o + 8 + n); return isC2pa(d) ? Buffer.from(d) : null; }
        if (id === 'IEND') break;
        o += 12 + n;
      }
      return null;
    }
    if (b[0] === 0xff && b[1] === 0xd8) {
      const delen = new Map();
      for (let o = 2; o + 4 <= b.length;) {
        if (b[o] !== 0xff) break;
        const m = b[o + 1];
        if (m === 0xd9 || m === 0xda) break;
        if (m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { o += 2; continue; }
        const n = b.readUInt16BE(o + 2);
        if (m === 0xeb && b.toString('ascii', o + 4, o + 6) === 'JP') {
          const en = b.readUInt16BE(o + 6); const z = b.readUInt32BE(o + 8);
          if (!delen.has(en)) delen.set(en, []);
          delen.get(en).push({ z, data: b.subarray(o + 12, o + 2 + n) });
        }
        o += 2 + n;
      }
      for (const stukken of delen.values()) {
        stukken.sort((x, y) => x.z - y.z);
        /* Elk vervolgsegment herhaalt de kop van de box (LBox + TBox, 8 bytes). */
        const d = Buffer.concat(stukken.map((s, i) => (i === 0 ? s.data : s.data.subarray(8))));
        if (isC2pa(d)) return d;
      }
      return null;
    }
    if (b.toString('ascii', 4, 8) === 'ftyp') {
      for (let o = 0; o + 8 <= b.length;) {
        let n = b.readUInt32BE(o); const t = b.toString('ascii', o + 4, o + 8); let kop = 8;
        if (n === 1) { n = Number(b.readBigUInt64BE(o + 8)); kop = 16; }
        if (n === 0) n = b.length - o;
        if (t === 'uuid' && b.subarray(o + kop, o + kop + 16).equals(C2PA_UUID)) {
          let p = o + kop + 16 + 4;
          const eindDoel = b.indexOf(0, p);
          const doel = b.toString('ascii', p, eindDoel); p = eindDoel + 1;
          if (doel === 'manifest') p += 8;
          const d = b.subarray(p, o + n);
          return isC2pa(d) ? Buffer.from(d) : null;
        }
        if (n < 8) break;
        o += n;
      }
    }
  } catch { /* een kapot bestand: geen herkomst */ }
  return null;
}

/** Een webp met het C2PA-blok `man` als chunk achteraan (een oud blok gaat eruit). */
export function zetHerkomstWebp(buf, man) {
  const b = Buffer.from(buf);
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WEBP') throw new Error('geen webp');
  const delen = [b.subarray(0, 12)];
  for (let o = 12; o + 8 <= b.length;) {
    const id = b.toString('ascii', o, o + 4); const n = b.readUInt32LE(o + 4);
    const eind = Math.min(b.length, o + 8 + n + (n & 1));
    if (id !== 'C2PA') delen.push(b.subarray(o, eind));
    o = eind;
  }
  const kop = Buffer.alloc(8); kop.write('C2PA', 0, 'ascii'); kop.writeUInt32LE(man.length, 4);
  delen.push(kop, man);
  if (man.length & 1) delen.push(Buffer.alloc(1));
  const uit = Buffer.concat(delen);
  uit.writeUInt32LE(uit.length - 8, 4);
  return uit;
}

/**
 * Een AVIF met het C2PA-blok als uuid-box ACHTERAAN. Achteraan en niet na ftyp: de
 * iloc in meta wijst met vaste posities in het bestand naar de beelddata, en een box
 * ervoor zou die allemaal verschuiven. Heeft het bestand al een blok, dan blijft het.
 */
export function zetHerkomstAvif(buf, man) {
  const b = Buffer.from(buf);
  if (b.toString('ascii', 4, 8) !== 'ftyp') throw new Error('geen avif');
  if (leesHerkomst(b)) return b;
  const inhoud = Buffer.concat([C2PA_UUID, Buffer.alloc(4), Buffer.from('manifest\0', 'latin1'), Buffer.alloc(8), man]);
  const kop = Buffer.alloc(8); kop.writeUInt32BE(8 + inhoud.length, 0); kop.write('uuid', 4, 'ascii');
  return Buffer.concat([b, kop, inhoud]);
}

/**
 * Zet het blok in elke webp en AVIF van een vak: eerst het origineel, dan de kleinere
 * webp's, dan de AVIF's. In die volgorde, zodat elke AVIF nieuwer blijft dan zijn webp
 * en de telefoonversie nieuwer dan het origineel: make-avif.mjs en make-telefoon.mjs
 * kijken naar de datum en zouden ze anders opnieuw maken (zonder het blok).
 */
export function zetHerkomst(img, naam, man) {
  const re = new RegExp(`^${naam.replace(/[-]/g, '\\-')}(-w\\d+)?\\.(webp|avif)$`);
  const orde = (f) => (f.endsWith('.avif') ? 2 : /-w\d+\./.test(f) ? 1 : 0);
  const bestanden = fs.readdirSync(img).filter((f) => re.test(f)).sort((a, b) => orde(a) - orde(b) || a.localeCompare(b));
  for (const f of bestanden) {
    const p = path.join(img, f);
    const buf = fs.readFileSync(p);
    fs.writeFileSync(p, f.endsWith('.webp') ? zetHerkomstWebp(buf, man) : zetHerkomstAvif(buf, man));
  }
  return bestanden;
}

/** Zet `naam` in KLAAR in de tekst van src/data/beeld.js (als hij er nog niet in staat). */
export function markeerKlaar(beeldJs, naam) {
  if (new RegExp(`'${naam}'`).test(beeldJs)) return { tekst: beeldJs, veranderd: false };
  const i = beeldJs.indexOf('export const KLAAR = new Set([');
  if (i < 0) throw new Error('src/data/beeld.js heeft geen KLAAR');
  const eind = beeldJs.indexOf(']);', i);
  const tekst = `${beeldJs.slice(0, eind)}  '${naam}',   // zelf vervangen met BEELDEN.bat, ${new Date().toISOString().slice(0, 10)}\n${beeldJs.slice(eind)}`;
  return { tekst, veranderd: true };
}

/* ── 3 · ICONEN ────────────────────────────────────────────────────────────── */

/**
 * Keurt een svg tegen het iconenkit (docs/DESIGN.md, src/data/iconen.js): raster 24
 * (viewBox 0 0 24 24), gevuld, geen lijn, geen transform, geen ingesloten beeld of
 * tekst. Geeft { ok, waarom, d } met `d` het pad zoals het in iconen.js komt.
 */
export function keurIcoon(svg) {
  const s = String(svg || '');
  const vb = /viewBox="([^"]+)"/.exec(s)?.[1]?.trim().split(/[\s,]+/).map(Number);
  if (!vb || vb.join(' ') !== '0 0 24 24') return { ok: false, waarom: 'het raster is niet 24 × 24 (viewBox "0 0 24 24"). Exporteer het icoon op het raster van het kit.' };
  if (/<(image|text|use|foreignObject|script)\b/i.test(s)) return { ok: false, waarom: 'er zit een ingesloten beeld, tekst of script in; een icoon is alleen vlakken.' };
  if (/\btransform\s*=/.test(s)) return { ok: false, waarom: 'er staat een transform in; zet de vormen recht op het raster (in je ontwerpprogramma: "transform toepassen").' };
  if (/\bstroke(-width)?\s*=\s*"(?!none)[^"]+"/i.test(s) || /stroke\s*:\s*(?!none)/i.test(s)) return { ok: false, waarom: 'er staat een lijn (stroke) in; de iconen zijn gevuld. Zet de lijn om in een vlak.' };
  if (/<(circle|ellipse|rect|polygon|polyline|line)\b/i.test(s)) return { ok: false, waarom: 'er staan vormen anders dan <path> in; zet alles om in paden.' };
  const paden = [...s.matchAll(/<path\b[^>]*\sd="([^"]+)"/g)].map((m) => m[1].trim());
  if (!paden.length) return { ok: false, waarom: 'er staat geen pad in.' };
  const kleur = [...s.matchAll(/\bfill="([^"]+)"/g)].map((m) => m[1].toLowerCase()).filter((f) => !['none', 'currentcolor', '#000', '#000000', 'black'].includes(f));
  if (kleur.length) return { ok: false, waarom: `er staat een kleur in (${kleur[0]}); de kleur komt van de plek waar het icoon staat. Maak het zwart of laat de kleur weg.` };
  const getallen = paden.join(' ').match(/-?\d*\.?\d+(?:e-?\d+)?/gi)?.map(Number) || [];
  const absoluut = paden.every((d) => !/[a-z]/.test(d.replace(/e-?\d/gi, '')));
  if (absoluut && getallen.some((n) => n < -0.01 || n > 24.01)) return { ok: false, waarom: 'een punt ligt buiten het raster van 24.' };
  const d = paden.join('').replace(/\s+/g, ' ');
  return { ok: true, waarom: absoluut ? '' : 'let op: het pad heeft relatieve of gebogen stukken; het kit tekent rechte, absolute lijnen. Het staat erin, kijk op de site of het goed valt.', d };
}

/** Zet het pad van een icoon in de tekst van src/data/iconen.js. Alleen een icoon dat er al is. */
export function zetIcoon(iconenJs, naam, d) {
  const re = new RegExp(`(\\n\\s*'${naam.replace(/[-]/g, '\\-')}':\\s*')([^']*)(')`);
  if (!re.test(iconenJs)) return { tekst: iconenJs, veranderd: false, waarom: `src/data/iconen.js kent geen icoon "${naam}". Geef het bestand de naam van een bestaand icoon.` };
  return { tekst: iconenJs.replace(re, (m, a, oud, c) => `${a}${d.replace(/'/g, '')}${c}`), veranderd: true, waarom: '' };
}

/* ── 4 · DE LIJST EN HET CONTACTBLAD ───────────────────────────────────────── */

const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export async function vakkenLijst(vakken, img = path.join(WORTEL, 'public', 'img')) {
  const rijen = [];
  for (const v of [...vakken.values()].sort((a, b) => a.naam.localeCompare(b.naam))) {
    const maat = await vakMaat(v, img);
    const ligt = fs.existsSync(path.join(img, `${v.naam}.webp`)) || fs.existsSync(path.join(img, `${v.naam}.png`)) || fs.existsSync(path.join(img, `${v.naam}.jpg`));
    rijen.push({
      naam: v.naam,
      paginas: [...v.paginas].sort(),
      verhouding: maat ? verhoudingTekst(maat.w, maat.h) : 'vrij',
      minimaal: minimaleBreedte(v, maat),
      maten: [...v.breedtes].sort((a, b) => a - b),
      stand: v.plaatshouder || !ligt ? 'plaatshouder' : 'staat er',
    });
  }
  /* De plaatshouders eerst: dat zijn de vakken waar nog iets in moet. */
  const eerst = (r) => (r.stand === 'plaatshouder' ? 0 : 1);
  return rijen.sort((a, b) => eerst(a) - eerst(b) || a.naam.localeCompare(b.naam));
}

export function lijstMarkdown(rijen) {
  const kop = `# Beeldvakken van de site (${new Date().toISOString().slice(0, 10)})\n\nGemaakt met \`node scripts/beelden.mjs --lijst\` (ook door BEELDEN.bat). Zet een bestand onder de **naam** in\n\`eigen-beelden\\\`, dubbelklik BEELDEN.bat, rol uit. De maat is de breedte die het beeld minstens moet hebben.\n\n| Naam | Stand | Verhouding | Minstens | Maten op de site | Pagina's |\n|---|---|---|---|---|---|\n`;
  return kop + rijen.map((r) => `| \`${r.naam}\` | ${r.stand} | ${r.verhouding} | ${r.minimaal} px | ${r.maten.map((m) => `-w${m}`).join(' ') || '—'} | ${r.paginas.slice(0, 6).join(' ')}${r.paginas.length > 6 ? ` +${r.paginas.length - 6}` : ''} |`).join('\n') + '\n';
}

export function lijstHtml(rijen, { img = '../public/img' } = {}) {
  const kaart = (r) => `<figure class="${r.stand === 'plaatshouder' ? 'mist' : ''}"><div class="beeld">${r.stand === 'plaatshouder' ? '<span>FOTO VOLGT</span>' : `<img src="${img}/${esc(r.naam)}.webp" loading="lazy" alt="">`}</div><figcaption><b>${esc(r.naam)}</b><br>${esc(r.verhouding)} · minstens ${r.minimaal} px<br><small>${esc(r.paginas.slice(0, 4).join(' · '))}</small></figcaption></figure>`;
  return `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Beeldvakken · VISUAILS</title><style>body{font:14px/1.45 system-ui,sans-serif;margin:24px;color:#0F1217;background:#fff}h1{font-size:22px}p{max-width:70ch}.raster{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px}figure{margin:0;border:1px solid #E6E8EC;border-radius:12px;overflow:hidden}figure.mist{border-color:#25508B}.beeld{aspect-ratio:4/5;background:#F4F5F7;display:grid;place-items:center}.beeld img{width:100%;height:100%;object-fit:cover}.beeld span{font:12px monospace;color:#636974}figcaption{padding:10px 12px}small{color:#636974}</style></head><body><h1>Beeldvakken van de site</h1><p>${rijen.length} vakken, waarvan ${rijen.filter((r) => r.stand === 'plaatshouder').length} nog een plaatshouder. Een blauw kader is een plaatshouder. Zet een bestand onder de naam in <code>eigen-beelden</code> en dubbelklik BEELDEN.bat.</p><div class="raster">${rijen.map(kaart).join('')}</div></body></html>`;
}

export function contactbladHtml(items) {
  const rij = (it) => `<tr><td><b>${esc(it.naam)}</b><br><small>${esc(it.paginas.slice(0, 4).join(' · '))}</small></td><td>${it.voor ? `<img src="${esc(it.voor)}" alt="">` : '<small>nog geen beeld</small>'}</td><td>${it.na ? `<img src="${esc(it.na)}" alt="">` : ''}</td><td class="${it.ok ? 'groen' : 'rood'}">${it.ok ? 'GOED' : 'NIET GEDAAN'}<br><small>${esc(it.waarom || '')}</small></td></tr>`;
  return `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Contactblad · VISUAILS</title><style>body{font:14px/1.45 system-ui,sans-serif;margin:24px;color:#0F1217;background:#fff}table{border-collapse:collapse;width:100%;table-layout:fixed}th{text-align:left;padding:0 10px}td{border-top:1px solid #E6E8EC;padding:10px;vertical-align:top;overflow-wrap:anywhere}img{max-width:min(240px,100%);max-height:240px;border-radius:8px}.groen{color:#0F1217;font-weight:700}.rood{color:#B3261E;font-weight:700}small{color:#636974;font-weight:400}</style></head><body><h1>Contactblad, ${new Date().toLocaleString('nl-NL')}</h1><table><tr><th>Naam</th><th>Voor</th><th>Na</th><th>Uitslag</th></tr>${items.map(rij).join('')}</table></body></html>`;
}

/* ── DE DUBBELKLIK ─────────────────────────────────────────────────────────── */

async function main() {
  const alleenLijst = process.argv.includes('--lijst');
  const map = path.join(WORTEL, 'eigen-beelden');
  const img = path.join(WORTEL, 'public', 'img');
  const groen = (t) => console.log(`  GOED   ${t}`);
  const rood = (t) => console.log(`  ROOD   ${t}`);
  const vandaag = new Date().toISOString().slice(0, 10);
  fs.mkdirSync(map, { recursive: true });

  const dist = path.join(WORTEL, 'dist');
  if (!fs.existsSync(path.join(dist, 'index.html'))) {
    console.log('\n  ROOD: er is nog geen build (de map dist\\). Dubbelklik eerst UITROLLEN.bat één keer, of draai npm run build, en dan dit bestand opnieuw.');
    process.exit(1);
  }
  const vakken = await vakkenUitData(vindVakken({ dist, img }));
  const rijen = await vakkenLijst(vakken, img);
  fs.writeFileSync(path.join(map, 'BEELDVAKKEN.html'), lijstHtml(rijen));
  fs.writeFileSync(path.join(WORTEL, 'kladblok', 'BEELDVAKKEN.md'), lijstMarkdown(rijen));
  console.log(`\n  De lijst van ${rijen.length} beeldvakken staat in eigen-beelden\\BEELDVAKKEN.html (open hem in je browser).`);
  if (alleenLijst) return;

  const bestanden = fs.readdirSync(map, { withFileTypes: true }).filter((e) => e.isFile() && (BEELD_EXT.test(e.name) || /\.svg$/i.test(e.name))).map((e) => e.name);
  if (!bestanden.length) {
    console.log('\n  Er staat nog geen beeld in eigen-beelden\\. Zet er een bestand in onder de naam van een vak en dubbelklik opnieuw. Er is niets veranderd.');
    process.exitCode = 3;   /* BEELDEN.bat opent dan de lijst van vakken */
    return;
  }
  const { default: sharp } = await import('sharp');
  const items = [];
  const verwerkt = [];
  let fouten = 0; let gedaan = 0;
  const beeldPad = path.join(WORTEL, 'src', 'data', 'beeld.js');
  const iconenPad = path.join(WORTEL, 'src', 'data', 'iconen.js');
  const beeldJsVoor = fs.readFileSync(beeldPad, 'utf8'); let beeldJs = beeldJsVoor;
  const iconenJsVoor = fs.readFileSync(iconenPad, 'utf8'); let iconenJs = iconenJsVoor;
  const oud = new Set(JSON.parse(fs.readFileSync(path.join(WORTEL, 'src', 'data', 'oude-beelden.json'), 'utf8')));
  const vorige = path.join(map, '_vorige');
  const herkomst = new Map();
  let telefoon = false;
  console.log('');
  for (const f of bestanden) {
    const naam = f.replace(/\.[^.]+$/, '').toLowerCase().trim();
    const bron = path.join(map, f);
    if (/\.svg$/i.test(f)) {
      const k = keurIcoon(fs.readFileSync(bron, 'utf8'));
      if (!k.ok) { fouten++; rood(`${f}: ${k.waarom}`); continue; }
      const z = zetIcoon(iconenJs, naam, k.d);
      if (!z.veranderd) { fouten++; rood(`${f}: ${z.waarom}`); continue; }
      iconenJs = z.tekst; gedaan++; verwerkt.push(f);
      groen(`${f}: het icoon "${naam}" staat in src\\data\\iconen.js${k.waarom ? ` (${k.waarom})` : ''}`);
      continue;
    }
    const v = vakken.get(naam);
    if (!v) { fouten++; rood(`${f}: er is geen vak met deze naam. Kijk in eigen-beelden\\BEELDVAKKEN.html welke namen er zijn, en geef het bestand precies die naam.`); items.push({ naam, paginas: [], ok: false, waarom: 'geen vak met deze naam' }); continue; }
    let meta;
    try { meta = await sharp(bron).metadata(); } catch { meta = {}; }
    const gedraaid = (meta.orientation || 1) >= 5;
    const w = gedraaid ? meta.height : meta.width; const h = gedraaid ? meta.width : meta.height;
    const maat = await vakMaat(v, img);
    const keur = keurBeeld({ w, h }, v, maat);
    const ligtEr = fs.existsSync(path.join(img, `${naam}.webp`));
    if (!keur.ok) { fouten++; rood(`${f}: ${keur.waarom}`); items.push({ naam, paginas: [...v.paginas], voor: ligtEr ? `../public/img/${naam}.webp` : '', ok: false, waarom: keur.waarom }); continue; }
    const geschreven = await verwerkBeeld(bron, v, { img, vorige: ligtEr ? vorige : null, doel: doelMaat({ w, h }, maat) });
    const man = leesHerkomst(fs.readFileSync(bron));
    if (man) herkomst.set(naam, man);
    if (telefoonMaat(naam)) telefoon = true;
    if (oud.has(naam)) beeldJs = markeerKlaar(beeldJs, naam).tekst;
    gedaan++; verwerkt.push(f);
    const maten = [...v.breedtes].sort((a, b) => a - b).map((b) => `-w${b}`).join(' ');
    groen(`${f}: ${geschreven.length} webp in public\\img (${maten || 'alleen het origineel'}), op ${v.paginas.size} pagina('s)${man ? ', met de herkomst (C2PA)' : ''}`);
    items.push({ naam, paginas: [...v.paginas], voor: ligtEr ? `_vorige/${naam}-${vandaag}.webp` : '', na: `../public/img/${naam}.webp`, ok: true });
  }
  if (beeldJs !== beeldJsVoor) fs.writeFileSync(beeldPad, beeldJs);
  if (iconenJs !== iconenJsVoor) fs.writeFileSync(iconenPad, iconenJs);
  if (items.length) fs.writeFileSync(path.join(map, 'CONTACTBLAD.html'), contactbladHtml(items));

  /* De telefoonversie en de AVIF: dezelfde scripts als altijd, daarna de herkomst. */
  const draai = (script) => {
    const r = spawnSync(process.execPath, [path.join(WORTEL, 'scripts', script)], { cwd: WORTEL, encoding: 'utf8' });
    if (r.status !== 0) { fouten++; rood(`scripts\\${script} ging mis: ${String(r.stderr || r.stdout || '').trim().split('\n').pop()}`); }
  };
  if (telefoon && !ZONDER_SCRIPTS) draai('make-telefoon.mjs');
  if (items.some((it) => it.ok) && !ZONDER_SCRIPTS) draai('make-avif.mjs');
  for (const [naam, man] of herkomst) zetHerkomst(img, naam, man);

  /* Wat gedaan is, gaat opzij: een tweede dubbelklik doet het niet nog eens. */
  if (verwerkt.length) {
    const opzij = path.join(map, '_verwerkt');
    fs.mkdirSync(opzij, { recursive: true });
    for (const f of verwerkt) {
      const doel = fs.existsSync(path.join(opzij, f)) ? path.join(opzij, `${vandaag}-${Date.now()}-${f}`) : path.join(opzij, f);
      fs.renameSync(path.join(map, f), doel);
    }
  }
  console.log('');
  if (fouten) {
    console.log(`  ROOD: ${fouten} bestand(en) niet gedaan, zie hierboven wat er mis is. ${gedaan} wel${gedaan ? ' (die staan nu in eigen-beelden\\_verwerkt\\)' : ''}.`);
    console.log('  Wat je doet: pas het bestand aan, zet het opnieuw in eigen-beelden\\ en dubbelklik nog een keer.');
    process.exit(1);
  }
  console.log(`  GROEN: ${gedaan} bestand(en) verwerkt. Bekijk eigen-beelden\\CONTACTBLAD.html; klopt het, rol dan uit met UITROLLEN.bat.`);
  console.log('  Wat je erin zette, staat nu in eigen-beelden\\_verwerkt\; het oude beeld in eigen-beelden\\_vorige\\. Die map gaat niet mee naar GitHub.');
}

const hierAangeroepen = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (hierAangeroepen) main().catch((e) => { console.error(`\n  ROOD: er ging iets mis: ${e?.message || e}`); process.exit(1); });

