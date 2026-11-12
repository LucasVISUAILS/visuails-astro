/**
 * VISUAILS — de video's en de foto's van de opening (levering 90, 8 november 2026).
 *
 *   python3 scripts/laptop-video-90.py kladblok/levering-90/21_9_laptop-90.mp4 <werkmap>
 *   node scripts/laptop-video-90.mjs <werkmap>
 *
 * Uit de beelden van laptop-video-90.py (het veld zit er al in) maakt dit per breedte:
 * - public/img/hal/laptop-video/laptop-90-<b>.mp4 en laptop-90-<b>-terug.mp4: H.264 (yuv420p, BT.709), zonder geluid. Gewoon
 *   een video: de browser speelt hem af, niets wordt er per beeld bij getekend. Terug is dezelfde video achterstevoren, die
 *   de browser ook gewoon vooruit speelt (zoeken hoeft nooit).
 * - public/img/hal/opening/laptop-90-<b>.webp (geen avif, zie onder): beeld 0 zoals de browser het uit die video haalt, met de schermen
 *   doorzichtig (daaronder liggen de standen van de winkel). Zo is de foto beeld 0 van de video: de overgang van foto naar
 *   video is er niet te zien.
 * - src/data/laptopVideo90.json: de maten en de schermen van beeld 0.
 * De breedtes zijn veelvouden van 92: dan is de hoogte een heel getal (2944 : 1248 = 92 : 39).
 * Preset veryfast (de huisregel voor H.264 op CRF).
 *
 *   ALLEEN_FOTO=1 node scripts/laptop-video-90.mjs <werkmap>    alleen de foto's en src/data/laptopVideo90.json (na
 *                                                                ALLEEN_BEELD0=1 van laptop-video-90.py: de video's blijven)
 *   ALLEEN_JSON=1 …                                              alleen de json
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const werk = process.argv[2];
if (!werk) { console.error('gebruik: node scripts/laptop-video-90.mjs <werkmap>'); process.exit(1); }
const MATEN = [1288, 1840, 2392, 2944];
const hoogte = (b) => (b / 92) * 39;
const VID = path.join('public', 'img', 'hal', 'laptop-video');
const FOTO = path.join('public', 'img', 'hal', 'opening');
fs.mkdirSync(VID, { recursive: true }); fs.mkdirSync(FOTO, { recursive: true });
const meta = JSON.parse(fs.readFileSync(path.join(werk, 'video.json'), 'utf8'));
const KLEUR = ['-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv'];
/* zonder korrel is het veld een glad verloop: op CRF 20 gaf dat blokkerige randjes in de lucht. CRF 17 met aq-mode 3 (meer
   bits naar vlakke, donkere delen) blijft dicht bij de bron, en is nog vier keer kleiner dan met korrel (2392: 0,56 tegen 2,16 MB). */
const X264 = ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '17', '-x264-params', 'aq-mode=3:aq-strength=1.0', '-g', '48', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', ...KLEUR];
/* 60 per seconde (8 november 21:44, Lucas: "De animatie van de laptop kan toch wel sneller (tussen de 1.5 en 2.5 seconden of
   zoiets, kijk wat het beste is)"): alle 112 beelden in 1,87 s, en op een scherm van 60 Hz (of 120) staat elk beeld precies
   één (twee) verversing(en): geen haperend ritme. De browser speelt hem op gewone snelheid (1 ×). Tot nu 24 per seconde op 1,5 ×. */
const FPS = 60;
const IN = ['-framerate', String(FPS), '-i', path.join(werk, 'beeld', '%03d.png')];
const schaal = (b) => `scale=${b}:${hoogte(b)}:flags=lanczos+accurate_rnd+full_chroma_int:out_color_matrix=bt709:out_range=tv,format=yuv420p`;

const maten = {};
/* ALLEEN_FOTO=1: de video's blijven, alleen de foto's (beeld 0 uit de bestaande video's) en de json opnieuw */
const alleenFoto = process.env.ALLEEN_FOTO === '1';
for (const b of process.env.ALLEEN_JSON === '1' ? [] : MATEN) {
  const heen = path.join(VID, `laptop-90-${b}.mp4`), terug = path.join(VID, `laptop-90-${b}-terug.mp4`);
  if (!alleenFoto) {
    execFileSync('ffmpeg', ['-v', 'error', '-y', ...IN, '-vf', schaal(b), ...X264, heen]);
    execFileSync('ffmpeg', ['-v', 'error', '-y', ...IN, '-vf', `reverse,${schaal(b)}`, ...X264, terug]);
  }
  /* beeld 0 zoals de browser het uit de video haalt (BT.709, beperkt bereik) */
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', heen, '-frames:v', '1', '-vf', 'scale=in_color_matrix=bt709:in_range=tv:flags=lanczos,format=rgb24', '-f', 'rawvideo', '-'], { maxBuffer: 64 * 1024 * 1024 });
  /* in de gaten (dekking onder 1) de kleur van stil.png: daar is alleen de rand van het toestel over (laptop-video-90.py);
     sharp schaalt met voorvermenigvuldigde dekking */
  const stil = await sharp(path.join(werk, 'stil.png')).ensureAlpha().resize(b, hoogte(b), { kernel: 'lanczos3' }).raw().toBuffer();
  const rgba = Buffer.alloc(b * hoogte(b) * 4);
  for (let i = 0, j = 0; i < b * hoogte(b); i++, j += 3) {
    const a = stil[i * 4 + 3], gat = a < 255;
    rgba[i * 4] = gat ? stil[i * 4] : raw[j]; rgba[i * 4 + 1] = gat ? stil[i * 4 + 1] : raw[j + 1]; rgba[i * 4 + 2] = gat ? stil[i * 4 + 2] : raw[j + 2]; rgba[i * 4 + 3] = a;
  }
  const img = () => sharp(rgba, { raw: { width: b, height: hoogte(b), channels: 4 } });
  await img().webp({ quality: 92, alphaQuality: 100, smartSubsample: true, effort: 5 }).toFile(path.join(FOTO, `laptop-90-${b}.webp`));
  /* geen avif: die strijkt de korrel glad (gemeten: 1,2 tegen 2,6 in de video), en dan zie je de wissel van foto naar video */
  maten[b] = { mp4: fs.statSync(heen).size, terug: fs.statSync(terug).size, webp: fs.statSync(path.join(FOTO, `laptop-90-${b}.webp`)).size };
  console.log(b, '×', hoogte(b), JSON.stringify(maten[b]));
}
fs.writeFileSync(path.join('src', 'data', 'laptopVideo90.json'), JSON.stringify({
  bron: meta.bron, b: meta.b, h: meta.h, fps: FPS, beelden: meta.beelden, maten: MATEN,
  /* levering 93 (lijst 90, B2 b): 1,4 s in plaats van 1,87 s */
  snelheid: 1.336,
  /* beeld 0 tot en met 7 staat de klep nog stil (de gemiddelde beweging per beeld onder 0,3 op 255): daarin vervaagt de winkel
     (op 60 per seconde 133 ms; de winkel en de foto vervagen in 120 ms) */
  stilTot: 7,
  veld: meta.veld, schermen: meta.schermen,
}, null, 0) + '\n');
console.log('klaar');
