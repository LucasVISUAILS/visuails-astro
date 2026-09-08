/* Herkleurt de contourbestanden van het logopakket: elke pixel die (deels)
   het oude accent draagt, schuift met het verschil oud→nieuw mee, gewogen op
   hoe geel hij is. Zo blijven anti-aliasrandjes en jpg-ruis netjes en verandert
   de VORM nergens — alleen de kleur.

     node kladblok/herkleur-contour.mjs <bron-map> <doel-map> OUD NIEUW
     node kladblok/herkleur-contour.mjs <bron-map> <doel-map> meet NIEUW

   "meet" — 7 september 2026. De eerste vorm gaat ervan uit dat elk bestand in
   de map hetzelfde oude groen draagt. Dat bleek niet zo: in het logopakket op
   Lucas' schijf stonden zesentwintig contourbestanden op #C8F206 en één op
   #D2E04A, omdat er ooit een ronde half is blijven liggen. De hele map door de
   script halen met OUD=#C8F206 zou dat ene bestand nóg een keer verschuiven —
   het verschil oud→nieuw is klein genoeg om binnen de tinttolerantie te vallen,
   dus het zou stil gebeuren en het zou fout zijn.

   Met "meet" bepaalt het script per bestand welk verzadigd groen er het meest
   in voorkomt en gebruikt dát als oud. Een bestand dat al goed staat krijgt dan
   een verschuiving van nul en blijft byte-voor-byte hetzelfde. Zo is de opdracht
   idempotent: twee keer draaien verandert niets meer. */
import fs from 'node:fs'; import path from 'node:path';
import sharp from 'sharp';
const [bron, doel, OUD = '#C8F206', NIEUW = '#D2E04A'] = process.argv.slice(2);
const MEET = String(OUD).toLowerCase() === 'meet';
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const tint = (r, g, b) => { const [R,G,B]=[r,g,b].map(v=>v/255); const mx=Math.max(R,G,B), mn=Math.min(R,G,B), d=mx-mn; let h = d===0?0: mx===R? ((G-B)/d)%6 : mx===G? (B-R)/d+2 : (R-G)/d+4; return ((h*60)+360)%360; };
const [nR, nG, nB] = hex(NIEUW);
let oR, oG, oB, dR, dG, dB, oudHue;
function zetOud(r, g, b) {
  [oR, oG, oB] = [r, g, b];
  dR = nR - oR; dG = nG - oG; dB = nB - oB;
  oudHue = tint(oR, oG, oB);
}
if (!MEET) zetOud(...hex(OUD));

/* Het meest voorkomende VERZADIGDE groen in een bestand. Wit, zwart en grijs
   vallen af op verzadiging; de zwarte contourlijn dus ook. */
function meetOud(data) {
  const telling = new Map();
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3]; if (a < 200) continue;
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx === 0 || (mx - mn) / mx < 0.4) continue;
    const k = (r << 16) | (g << 8) | b;
    telling.set(k, (telling.get(k) || 0) + 1);
  }
  let beste = null, n = 0;
  for (const [k, v] of telling) if (v > n) { n = v; beste = k; }
  return beste === null ? null : [(beste >> 16) & 255, (beste >> 8) & 255, beste & 255];
}

function gewicht(r, g, b) {
  const R=r/255, G=g/255, B=b/255; const mx=Math.max(R,G,B), mn=Math.min(R,G,B), d=mx-mn;
  if (d < 0.05) return 0;
  let h = mx===R? ((G-B)/d)%6 : mx===G? (B-R)/d+2 : (R-G)/d+4; h=((h*60)+360)%360;
  const s = d / mx;
  const dh = Math.min(Math.abs(h - oudHue), 360 - Math.abs(h - oudHue));
  if (dh > 25) return 0;
  return Math.max(0, Math.min(1, (s - 0.12) / 0.5)) * (1 - dh / 25);
}
const files = fs.readdirSync(bron, { recursive: true }).filter((f) => /\.(png|jpg)$/i.test(f));
for (const f of files) {
  const src = path.join(bron, f), out = path.join(doel, f);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const img = sharp(src); const meta = await img.metadata();
  const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (MEET) {
    const gemeten = meetOud(data);
    if (!gemeten) { console.log(`  ${f}  geen verzadigd groen gevonden — overgeslagen`); continue; }
    zetOud(...gemeten);
    const gelijk = dR === 0 && dG === 0 && dB === 0;
    console.log(`  ${f}  oud #${gemeten.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()}${gelijk ? ' — staat al goed' : ''}`);
  }
  let n = 0;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3]; if (a === 0) continue;
    const w = gewicht(data[i], data[i + 1], data[i + 2]); if (w === 0) continue; n++;
    data[i] = Math.max(0, Math.min(255, Math.round(data[i] + w * dR)));
    data[i + 1] = Math.max(0, Math.min(255, Math.round(data[i + 1] + w * dG)));
    data[i + 2] = Math.max(0, Math.min(255, Math.round(data[i + 2] + w * dB)));
  }
  let s = sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } });
  if (/\.jpg$/i.test(f)) s = s.flatten({ background: '#000' }).jpeg({ quality: 92 }); else s = s.png({ compressionLevel: 9 });
  await s.toFile(out);
  console.log(`  ${f}  ${n} px geraakt`);
}
