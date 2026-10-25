/* ═══════════════════════════════════════════════════════════════════════════════
 * VISUAILS — AVIF NAAST ELKE WEBP
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   npm run avif          — maak wat er ontbreekt of verouderd is
 *   npm run avif -- --al  — maak alles opnieuw
 *
 * ── WAAROM — 20 augustus 2026 ────────────────────────────────────────────────
 *
 * public/img is 21 MB, met achttien bestanden boven de 300 kB. Gemeten op de vijf
 * zwaarste: 2.884 kB aan webp wordt 1.064 kB aan AVIF, 63 procent minder, bij een
 * kwaliteit waar op deze foto's met het oog niets aan te zien is. Over de hele map
 * is dat ruwweg 21 MB naar 8 MB.
 *
 * Op een glasvezellijn merkt niemand dat. Op 4G in een winkelstraat — waar een
 * kledingmerk deze site opent — is dat het verschil tussen een pagina die staat en
 * een pagina die nog aan het opbouwen is terwijl je al scrolt.
 *
 * ── WAAROM NAAST EN NIET IN PLAATS VAN ──────────────────────────────────────
 *
 * AVIF wordt sinds 2024 door alle grote browsers gelezen, maar "alle grote" is niet
 * "alle". Een `<picture>` met AVIF eerst en webp erachter kost één regel markup en
 * heeft geen enkel risico: wie AVIF niet kent, pakt de webp die er altijd al stond.
 * Vervangen zou dat vangnet weghalen voor een besparing die we al hebben.
 *
 * ── KWALITEIT 52, EFFORT 4 ──────────────────────────────────────────────────
 *
 * Gemeten en niet gekozen. Op effort 2 is het encoderen twee keer zo snel en het
 * bestand een vijfde groter; op effort 6 duurt het drie keer zo lang voor twee
 * procent winst. Kwaliteit 52 is bij AVIF ruwweg wat 75 bij webp is — de schaal is
 * niet dezelfde, en dat is precies de fout die iemand hier ooit gaat maken als het
 * niet opgeschreven staat.
 *
 * `chromaSubsampling: '4:4:4'` staat aan voor de kleinere afgeleiden. De standaard
 * 4:2:0 gooit kleurdetail weg, en op een productfoto van 380 pixels breed waar het
 * hele punt de KLEUR van het kledingstuk is, is dat het verkeerde detail om weg te
 * gooien. Op de grote beelden staat het uit, want daar zie je het niet en scheelt
 * het een derde van de bestandsgrootte.
 *
 * ── KWALITEIT 64 VANAF 1000 PX — 20 oktober 2026 (levering 66) ───────────────
 *
 * Lucas, afvinklijst 44 vraag 2 = b. Op een MacBook of iPhone staan de grote foto's
 * bijna op ware grootte, en dan verdween op kwaliteit 52 het fijne detail: het
 * spikkelen van beton, de draad van stof. Gemeten op acht grote foto's, op
 * schermgrootte (1200 px) tegen de webp: SSIM gemiddeld 0,979 op 52 en 0,991 op 64.
 * Samen 1375 kB op 52, 2462 kB op 64. Daarom 64 vanaf 1000 px breed (GROOT); de
 * kleinere afgeleiden houden 52, daar was niets te zien. Telefoons laden van de
 * grootste foto's een kleinere versie (scripts/make-telefoon.mjs), dus op een
 * telefoon wordt het lichter in plaats van zwaarder.
 *
 *   npm run avif -- --groot   maakt alleen de beelden vanaf 1000 px opnieuw
 *
 * ── WAT DIT SCRIPT NIET AANRAAKT ────────────────────────────────────────────
 *
 * De laptopstanden (hal/stand/ en hal/laptop-*) en de telefoonversies (de -w1200 en
 * -w1400 uit src/data/telefoonbeelden.js) hebben elk een eigen script, dat de AVIF
 * rechtstreeks uit een verliesloze foto maakt (laptop-standen.mjs: kwaliteit 78,
 * 4:4:4; make-telefoon.mjs: 64). Tot levering 66
 * stonden ze hier niet uitgezonderd: `npm run avif -- --al` had de standen dan
 * opnieuw uit de webp gemaakt, op 52.
 *
 * ── IDEMPOTENT ──────────────────────────────────────────────────────────────
 *
 * Een bestand wordt overgeslagen als de AVIF nieuwer is dan de webp. Dat maakt dit
 * veilig om in een bouwstap te hangen en het scheelt zes minuten bij elke build
 * waarin er geen beeld veranderd is.
 */

import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { telefoonVersies } from '../src/data/telefoonbeelden.js';

/* fileURLToPath en niet .pathname — zie tests/paths.test.mjs. */
const WORTEL = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const IMG = path.join(WORTEL, 'public', 'img');

const ALLES = process.argv.includes('--al');
const ALLEEN_GROOT = process.argv.includes('--groot');
const KLEIN = 700;           // onder deze breedte: 4:4:4
const KWALITEIT = 52;
const GROOT = 1000;          // vanaf deze breedte: KWALITEIT_GROOT (levering 66)
const KWALITEIT_GROOT = 64;
/* eigen scripts, zie WAT DIT SCRIPT NIET AANRAAKT */
const TELEFOON = new Set(telefoonVersies().map((p) => p.replace(/^\/img\//, '')));
const EIGEN_SCRIPT = (rel) => rel.startsWith('hal/stand/') || rel.startsWith('hal/laptop-') || TELEFOON.has(rel);
const EFFORT = 4;

function alleWebp(map) {
  const uit = [];
  for (const e of fs.readdirSync(map, { withFileTypes: true })) {
    const vol = path.join(map, e.name);
    if (e.isDirectory()) uit.push(...alleWebp(vol));
    else if (e.name.endsWith('.webp')) uit.push(vol);
  }
  return uit;
}

const bestanden = alleWebp(IMG).filter((f) => !EIGEN_SCRIPT(path.relative(IMG, f).split(path.sep).join('/'))).sort();
let gemaakt = 0, overgeslagen = 0, webpBytes = 0, avifBytes = 0;

console.log(`\nVISUAILS — AVIF naast ${bestanden.length} webp-bestanden\n`);

for (const bron of bestanden) {
  const doel = bron.replace(/\.webp$/, '.avif');
  const bronStat = fs.statSync(bron);
  webpBytes += bronStat.size;

  const meta = await sharp(bron).metadata();
  const groot = (meta.width || 0) >= GROOT;
  const opnieuw = ALLES || (ALLEEN_GROOT && groot);
  if (!opnieuw && fs.existsSync(doel) && fs.statSync(doel).mtimeMs >= bronStat.mtimeMs) {
    avifBytes += fs.statSync(doel).size;
    overgeslagen++;
    continue;
  }
  if (ALLEEN_GROOT && !groot && fs.existsSync(doel)) { avifBytes += fs.statSync(doel).size; overgeslagen++; continue; }

  const pak = (q) => sharp(bron)
    .avif({
      quality: q,
      effort: EFFORT,
      chromaSubsampling: (meta.width || 0) <= KLEIN ? '4:4:4' : '4:2:0',
    })
    .toBuffer();
  let buf = await pak(groot ? KWALITEIT_GROOT : KWALITEIT);
  /* Wordt een groot beeld op 64 groter dan zijn webp (bij veel korrel, zoals de
     voor-foto van catalog-before-1x1), dan eerst 52 proberen, zoals voorheen. */
  if (groot && buf.length >= bronStat.size) buf = await pak(KWALITEIT);

  /* ── EEN AVIF DIE GROTER IS DAN ZIJN WEBP, SCHRIJVEN WE NIET ──────────────
     Dat gebeurt: bij hele kleine beelden en bij vlakken met weinig detail wint
     webp. Een <picture> die dan alsnog AVIF eerst aanbiedt, maakt de pagina
     zwaarder in plaats van lichter — en niemand zou het merken, want het bestand
     bestaat en het laadt. Dus: bestaat er geen AVIF, dan valt de <picture>
     vanzelf terug op de webp. */
  if (buf.length >= bronStat.size) {
    if (fs.existsSync(doel)) fs.unlinkSync(doel);
    avifBytes += bronStat.size;
    overgeslagen++;
    process.stdout.write(`  = ${path.relative(IMG, bron)} — webp is kleiner, geen AVIF\n`);
    continue;
  }

  fs.writeFileSync(doel, buf);
  avifBytes += buf.length;
  gemaakt++;
  if (bronStat.size > 200 * 1024) {
    process.stdout.write(`  · ${path.relative(IMG, bron).padEnd(40)} ${(bronStat.size / 1024 | 0)}kB → ${(buf.length / 1024 | 0)}kB\n`);
  }
}

const winst = webpBytes ? ((1 - avifBytes / webpBytes) * 100).toFixed(0) : 0;
console.log(`\n${gemaakt} gemaakt, ${overgeslagen} overgeslagen`);
console.log(`webp ${(webpBytes / 1024 / 1024).toFixed(1)} MB → avif ${(avifBytes / 1024 / 1024).toFixed(1)} MB (${winst}% minder)`);
console.log('\nDe webp blijft staan: <picture> biedt AVIF eerst aan en valt terug.');
