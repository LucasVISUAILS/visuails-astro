/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE FOTOGIDS — het bestand dat met een vraag om een foto meegaat
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas, 7 september 2026: *"Stel een klant mist nog een foto van een specifieke
 * kant van het product contacteer ik hem via mail of whatsapp (voorkeur), en
 * vraag ik om die specifieke foto en stuur ik hem gelijk de handleiding erbij
 * zodat hij zijn weg kan vinden en volgende keer weer dat bestand erbij kan
 * pakken om het goed te doen. Ik wil niet dat klanten denken dat ze niet goed
 * genoeg hun best hebben gedaan met foto's maken dus frame het als een soort
 * handleiding met tips."*
 *
 * ── SINDS 8 OKTOBER 2026: ÉÉN A4 (punt 5.07) ─────────────────────────────────
 *
 * Dit waren drie bladen: de vier opnamen met tekening en foto, zes tips, en één
 * echte set. Lucas koos één A4 om naast je kast te hangen, in vier blokken —
 * licht, ondergrond, kader, close-up — met onderaan vijf vragen voor je
 * uploadt, en dezelfde tekst op /upload-guidelines en in de checklistmail.
 *
 *   de woorden   src/data/fotogids.js (leest shots.js voor de vakken en grenzen)
 *   het vel      scripts/lib/fotogids-html.mjs (HTML, zonder browser te testen)
 *   de pdf       dit script: HTML → Chromium → pdf, één pagina per taal
 *
 * Het vel MOET op één pagina passen. Chromium meet hier hoe hoog het werd; is
 * het hoger dan A4, dan stopt het script met een melding in plaats van een pdf
 * met een tweede pagina waar een halve regel op staat. Na het printen telt
 * pdf-lib de pagina's nog eens en zet de vingerafdruk van de bron erin
 * (trefwoord "fotogids-…"), zodat tests/fotogids.test.mjs ziet of de pdf bij de
 * huidige tekst hoort.
 *
 * Letters als base64 uit @fontsource in node_modules (dezelfde bron als
 * scripts/fonts-voor-worker.mjs), en de twee foto's ook als base64: deze pdf
 * gaat vaak via WhatsApp en wordt op een telefoon geopend, soms zonder netwerk.
 *
 * Uitvoer: public/downloads/visuails-fotogids-nl.pdf en -en.pdf. Draaien:
 * node scripts/handleiding.mjs (npm run handleiding).
 */
import { chromium } from 'playwright';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
/* Alleen om de voorbeeldbeelden te verkleinen voordat ze in de pdf gaan. sharp
   zit al in het project voor scripts/make-avif.mjs. */
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { createRequire } from 'node:module';

/* Dezelfde browserzoeker als make-og.mjs en de keuring: PW_CHROME wint, anders
   een van de bekende paden, anders laat Playwright het zelf uitzoeken. */
import { browserPad } from './lib/browserpad.mjs';
import { gidsHtml, trefwoord, BESTAND, BEELD_BIJ_BLOK } from './lib/fotogids-html.mjs';
import { fotogids } from '../src/data/fotogids.js';

const require = createRequire(import.meta.url);
const wortel = join(dirname(fileURLToPath(import.meta.url)), '..');
const UIT = join(wortel, 'public', 'downloads');

/* Dezelfde letter als de site. Uit node_modules en niet uit public/, om
   dezelfde reden die scripts/fonts-voor-worker.mjs noemt: @fontsource is de bron
   en een kopie in de repo veroudert stil bij een npm update. */
/* Sinds 15 oktober 2026 de hal-stijl: alleen Urbanist, zoals de site. */
const LETTERS = [
  ['Urbanist Variable', '@fontsource-variable/urbanist/files/urbanist-latin-wght-normal.woff2'],
];

async function fontRegels() {
  const stukken = [];
  for (const [naam, pad] of LETTERS) {
    const bin = await readFile(require.resolve(pad));
    stukken.push(
      `@font-face { font-family: "${naam}"; font-style: normal; font-weight: 100 900; `
      + `src: url(data:font/woff2;base64,${bin.toString('base64')}) format("woff2"); }`
    );
  }
  return stukken.join('\n');
}

/* ── EERST KLEINER MAKEN, DAN PAS INSLUITEN ──────────────────────────────────
 * Chromium slaat een ingesloten beeld verliesvrij op bij het printen; een webp
 * van 760 pixels werd zo 8 MB per taal (gemeten, 12 september). Op het vel is
 * een foto 27 mm breed: 320 pixels is op 300 dpi ruim genoeg, ook als iemand
 * inzoomt. JPEG en geen webp, want JPEG opent overal. */
const BREEDTE = 320;

async function beeldData(naam) {
  const pad = new URL(`../public/img/${naam}.webp`, import.meta.url);
  try {
    const bin = await sharp(fileURLToPath(pad))
      .resize({ width: BREEDTE, withoutEnlargement: true })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer();
    return `data:image/jpeg;base64,${bin.toString('base64')}`;
  } catch (err) {
    /* Ontbreekt het bestand, dan staat bij dat blok de tekening of niets — de
       gids gaat gewoon door. Een pdf die niet gemaakt kan worden omdat er één
       foto mist, is erger dan een blok zonder foto. */
    console.warn(`  (beeld ${naam}.webp niet gebruikt — ${err?.message || 'niet gevonden'})`);
    return null;
  }
}

const A4_PX = 297 / 25.4 * 96;

async function maak(browser, lang, fonts, beelden) {
  const page = await browser.newPage();
  await page.setContent(gidsHtml(lang, { fonts, beelden }), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);

  /* ── PAST HET OP ÉÉN A4? ─────────────────────────────────────────────────
     .blad is precies 297 mm hoog met overflow verborgen, dus de vraag is of de
     INHOUD erin past: de onderkant van de vijf vragen moet boven de contactregel
     blijven. Meten en hard stoppen is goedkoper dan hopen. */
  const maat = await page.evaluate(() => {
    const blad = document.querySelector('.blad').getBoundingClientRect();
    const vragen = document.querySelector('.vragen').getBoundingClientRect();
    const contact = document.querySelector('.contact').getBoundingClientRect();
    return { blad: blad.height, scroll: document.querySelector('.blad').scrollHeight, onder: vragen.bottom, contact: contact.top };
  });
  if (process.env.METEN) console.log(`  ${lang}: blad ${Math.round(maat.blad)} · vragen tot ${Math.round(maat.onder)} · contact vanaf ${Math.round(maat.contact)} (A4 ${Math.round(A4_PX)})`);
  if (maat.scroll > A4_PX + 1 || maat.onder > maat.contact - 8) {
    throw new Error(`handleiding: het vel van ${lang} past niet op één A4 (inhoud tot ${Math.round(maat.onder)}px, contactregel op ${Math.round(maat.contact)}px). Kort de tekst in src/data/fotogids.js in of verklein de marges.`);
  }

  const bin = await page.pdf({
    width: '210mm',
    height: '297mm',
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });
  await page.close();

  /* Tellen en tekenen: één pagina, en de vingerafdruk van de bron erin. */
  const doc = await PDFDocument.load(bin);
  if (doc.getPageCount() !== 1) {
    throw new Error(`handleiding: de pdf van ${lang} heeft ${doc.getPageCount()} pagina's in plaats van één.`);
  }
  const g = fotogids(lang);
  doc.setTitle(`VISUAILS — ${g.etiket}`);
  doc.setSubject(g.titelVol);
  doc.setKeywords([trefwoord(lang)]);
  doc.setAuthor('VISUAILS');
  doc.setLanguage(lang === 'nl' ? 'nl-NL' : 'en-GB');
  const doel = join(UIT, BESTAND[lang]);
  await writeFile(doel, await doc.save());
  return doel;
}

async function main() {
  await mkdir(UIT, { recursive: true });
  const fonts = await fontRegels();
  const namen = Object.values(BEELD_BIJ_BLOK);
  const beelden = Object.fromEntries(await Promise.all(namen.map(async (n) => [n, await beeldData(n)])));
  const browser = await chromium.launch({ executablePath: browserPad() });
  const gemaakt = [];
  try {
    for (const lang of ['nl', 'en']) gemaakt.push(await maak(browser, lang, fonts, beelden));
  } finally {
    await browser.close();
  }
  for (const p of gemaakt) console.log(`fotogids: ${p.replace(wortel + '/', '')}`);
}

await main();
