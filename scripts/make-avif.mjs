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

/* fileURLToPath en niet .pathname — zie tests/paths.test.mjs. */
const WORTEL = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const IMG = path.join(WORTEL, 'public', 'img');

const ALLES = process.argv.includes('--al');
const KLEIN = 700;           // onder deze breedte: 4:4:4
const KWALITEIT = 52;
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

const bestanden = alleWebp(IMG).sort();
let gemaakt = 0, overgeslagen = 0, webpBytes = 0, avifBytes = 0;

console.log(`\nVISUAILS — AVIF naast ${bestanden.length} webp-bestanden\n`);

for (const bron of bestanden) {
  const doel = bron.replace(/\.webp$/, '.avif');
  const bronStat = fs.statSync(bron);
  webpBytes += bronStat.size;

  if (!ALLES && fs.existsSync(doel) && fs.statSync(doel).mtimeMs >= bronStat.mtimeMs) {
    avifBytes += fs.statSync(doel).size;
    overgeslagen++;
    continue;
  }

  const meta = await sharp(bron).metadata();
  const buf = await sharp(bron)
    .avif({
      quality: KWALITEIT,
      effort: EFFORT,
      chromaSubsampling: (meta.width || 0) <= KLEIN ? '4:4:4' : '4:2:0',
    })
    .toBuffer();

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
