/* ═══════════════════════════════════════════════════════════════════════════════
 * VISUAILS — BEELDEN TERUGBRENGEN NAAR DE MAAT WAAROP ZE GETOOND WORDEN
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   npm run krimpen         — alleen rekenen en laten zien wat het zou schelen
 *   npm run krimpen -- --doen  — het ook echt doen
 *
 * ── WAAROM DIT DE GROOTSTE POST IS ──────────────────────────────────────────
 *
 * De AVIF-stap heeft public/img gehalveerd, van 19,4 naar 9,3 MB, en dat was het
 * codec-deel van het probleem. Dit is het andere deel, en het is groter: er
 * worden bestanden van 2400 pixels breed geserveerd in vakjes van 380. Dat is
 * zes keer zo veel pixels als er getoond worden, en op een scherm met dubbele
 * dichtheid nog altijd drie keer.
 *
 * Gemeten met `npm run keuring -- --json`, en dat woord "gemeten" is hier het
 * hele punt: de keuring opent elke pagina op 390, 768, 1440 en 1920 en noteert
 * hoe breed elk beeld ECHT wordt weergegeven. Dit script gokt dus niet welke
 * maat genoeg is, het leest het af.
 *
 * ── DE REKENSOM ─────────────────────────────────────────────────────────────
 *
 * doelbreedte = grootste weergavebreedte over de HELE site × 2
 *
 * Maal twee voor schermen met dubbele pixeldichtheid, en de grootste over de
 * hele site omdat één bestand op meerdere plekken staat: banners-13 is 771px op
 * /video en 380px in de galerij, en dan telt de 771. Daarna afgerond naar boven
 * op een stap van 100px, en nooit groter dan het bestand al is.
 *
 * Alles onder de 1,4× winst blijft ongemoeid — voor een paar kilobyte is het
 * opnieuw encoderen van een foto het risico niet waard.
 *
 * ── HET IS OMKEERBAAR, EN DAAR WORDT OP GESTAAN ─────────────────────────────
 *
 * Dit script overschrijft bestanden. Daarom weigert het te draaien als er in
 * public/img nog niet-vastgelegde wijzigingen staan: zolang de map schoon is, is
 * `git checkout -- public/img` de weg terug, en die weg moet er zijn voordat er
 * iets gebeurt. Git IS de reservekopie; een tweede map met originelen zou
 * dezelfde bestanden nog een keer bewaren en na één ronde niet meer kloppen.
 *
 * Na afloop: `npm run avif` (de AVIF's naast de gekrompen webp's zijn dan
 * verouderd en worden opnieuw gemaakt), daarna `npm run build` en
 * `npm run visueel` om te zien dat er niets veranderd is aan hoe het eruitziet.
 */

import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const WORTEL = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const IMG = path.join(WORTEL, 'public', 'img');
const METING = path.join(WORTEL, 'visual', 'beeldmaten.json');

const DOEN = process.argv.includes('--doen');
const DICHTHEID = 2;      // schermen met dubbele pixeldichtheid
const STAP = 100;         // afronden naar boven op honderdtallen
const DREMPEL = 1.4;      // onder deze winst niet aanraken

function schoon() {
  try {
    const uit = execFileSync('git', ['status', '--porcelain', '--', 'public/img'], { cwd: WORTEL, encoding: 'utf8' });
    return uit.trim() === '';
  } catch {
    return null;   // geen git — dan kan dit script het niet beoordelen
  }
}

if (!fs.existsSync(METING)) {
  console.error(`\nGeen meting gevonden op ${path.relative(WORTEL, METING)}.`);
  console.error('Maak hem eerst:  npm run keuring -- --json\n');
  process.exit(1);
}

const meting = JSON.parse(fs.readFileSync(METING, 'utf8'));
if (!Array.isArray(meting.beeld)) {
  console.error('\nDe meting bevat geen `beeld`-lijst. Draai `npm run keuring -- --json` opnieuw.\n');
  process.exit(1);
}

/* De keuring noteert wat de browser KOOS — meestal de .avif. Terugvertalen naar
   de webp, want dat is het bronbestand; de AVIF wordt daar door make-avif.mjs
   uit gemaakt en is dus altijd de afgeleide. */
const perWebp = new Map();
for (const b of meting.beeld) {
  const webp = b.src.replace(/\.avif$/, '.webp');
  if (!webp.startsWith('/img/') || !webp.endsWith('.webp')) continue;
  const nu = perWebp.get(webp);
  if (!nu || b.getoond > nu.getoond) perWebp.set(webp, { getoond: b.getoond, nat: b.nat });
}

const plan = [];
for (const [webp, m] of perWebp) {
  const bestand = path.join(IMG, webp.replace('/img/', ''));
  if (!fs.existsSync(bestand)) continue;
  const doel = Math.min(m.nat, Math.ceil((m.getoond * DICHTHEID) / STAP) * STAP);
  if (doel >= m.nat) continue;
  if (m.nat / doel < DREMPEL) continue;
  plan.push({ webp, bestand, nat: m.nat, getoond: m.getoond, doel, bytes: fs.statSync(bestand).size });
}
plan.sort((a, b) => b.bytes - a.bytes);

console.log(`\nVISUAILS — ${plan.length} beeld(en) staan groter op schijf dan ze ooit getoond worden\n`);
let voor = 0;
for (const p of plan) {
  voor += p.bytes;
  console.log(`  ${p.webp.replace('/img/', '').padEnd(36)} ${String(p.nat).padStart(5)}px → ${String(p.doel).padStart(4)}px   (getoond max ${p.getoond}px, nu ${(p.bytes / 1024 | 0)}kB)`);
}
console.log(`\n  samen ${(voor / 1024 / 1024).toFixed(1)} MB aan webp, plus de AVIF's ernaast`);

if (!DOEN) {
  console.log('\nDit was alleen de rekensom. `npm run krimpen -- --doen` voert het uit.');
  console.log('Daarna: npm run avif && npm run build && npm run visueel\n');
  process.exit(0);
}

const gitSchoon = schoon();
if (gitSchoon === false) {
  console.error('\npublic/img heeft niet-vastgelegde wijzigingen. Leg die eerst vast of zet ze terug —');
  console.error('zonder schone map is er geen weg terug als het resultaat tegenvalt.\n');
  process.exit(1);
}
if (gitSchoon === null) console.log('\n(geen git gevonden — er is dus geen automatische weg terug)');

let na = 0, gedaan = 0;
for (const p of plan) {
  const buf = await sharp(p.bestand)
    .resize({ width: p.doel, withoutEnlargement: true })
    /* Kwaliteit 82 en effort 5: dat is waar de rest van public/img op staat.
       Een verkleining opnieuw comprimeren op een hogere kwaliteit dan het
       origineel maakt het bestand groter zonder dat iemand het ziet. */
    .webp({ quality: 82, effort: 5 })
    .toBuffer();
  if (buf.length >= p.bytes) {
    console.log(`  = ${p.webp} — kleiner formaat gaf geen kleiner bestand, overgeslagen`);
    na += p.bytes;
    continue;
  }
  fs.writeFileSync(p.bestand, buf);
  /* De AVIF ernaast is nu verouderd. Weghalen in plaats van bijwerken: make-avif
     kijkt naar de wijzigingsdatum en maakt hem toch opnieuw, en een AVIF van de
     oude afmetingen naast een gekrompen webp is precies het soort stille
     tegenspraak waar een <picture> op stukloopt. */
  const avif = p.bestand.replace(/\.webp$/, '.avif');
  if (fs.existsSync(avif)) fs.unlinkSync(avif);
  na += buf.length;
  gedaan++;
}

console.log(`\n${gedaan} beeld(en) verkleind: ${(voor / 1024 / 1024).toFixed(1)} MB → ${(na / 1024 / 1024).toFixed(1)} MB webp`);
console.log('\nNu nog:  npm run avif && npm run build && npm run visueel\n');
