/* HET BIJNA-ZWART VAN EEN AANGELEVERDE AFBEELDING RECHTZETTEN — 7 september 2026
   ═══════════════════════════════════════════════════════════════════════════
   De tegenhanger van kladblok/herkleur-contour.mjs, dat het GROEN verschuift.
   Sommige aangeleverde logobestanden dragen een eigen zwart: #000000 in het
   contourorigineel, #16110C in het woordmerk uit ChatGPT, #08090B in een oude
   render. Geen van drieën is de merkinkt (#111111), en op een licht vel zie je
   dat: twee logo's naast elkaar met een verschillend zwart lezen als twee
   verschillende merken.

     node kladblok/herkleur-donker.mjs <bron> <doel> [DOEL-INKT] [GROND]

   HOE. Niet zoeken-en-vervangen op één waarde: dan houd je een randje van de
   oude kleur over waar de rand is uitgevloeid, en juist die randjes zijn wat je
   op een vergroting ziet. In plaats daarvan wordt elke INKTPIXEL (neutraal of
   simpelweg donker) op zijn plek op de trap tussen de grond en het donkerste punt
   opnieuw gemengd tussen de grond en de doelinkt. De donkerste pixel landt
   exact op de doelinkt, wit blijft wit, en alles ertussen schuift evenredig mee.
   De VORM verandert daardoor nergens — geen pixel gaat aan of uit.

   VERZADIGDE PIXELS BLIJVEN ONGEMOEID. Het groen van het merk valt buiten de
   neutraaldrempel en wordt dus niet aangeraakt; dat is werk voor
   herkleur-contour.mjs, dat je erna of ervoor draait. */
import sharp from 'sharp';

const [bron, doel, INKT = '#111111', GROND = '#FFFFFF'] = process.argv.slice(2);
if (!bron || !doel) { console.error('gebruik: node kladblok/herkleur-donker.mjs <bron> <doel> [DOEL-INKT] [GROND]'); process.exit(2); }
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const [iR, iG, iB] = hex(INKT);
const [gR, gG, gB] = hex(GROND);
const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const grondL = lum(gR, gG, gB);

/* WAT TELT ALS INKT. Twee wegen naar hetzelfde antwoord, want één was niet
   genoeg. Eerst probeerde ik alleen "neutraal": weinig verzadiging. Dat liet
   het woordmerk ongemoeid, want het zwart daarin is #16110C — bruinig, en met
   (22-12)/22 = 0,45 verzadiging valt het buiten elke redelijke drempel. En dat
   is nou juist het bestand dat het hardst een correcte inkt nodig had.

   Dus ook: DONKER. Alles onder 55% van de luminantie van de grond is inkt,
   welke tint het ook heeft. Het merkgroen zit op 82% van wit en blijft daar
   ruim boven, dus dat wordt niet meegenomen — dat is werk voor
   herkleur-contour.mjs. */
const isInkt = (r, g, b) => {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  if (mx === 0 || (mx - mn) / mx < 0.18) return true;
  return lum(r, g, b) < grondL * 0.55;
};

const img = sharp(bron);
const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });

/* WELKE PIXEL IS "DE INKT ZOALS HIJ NU IS". Niet de allerdonkerste: in het
   woordmerk zit één handjevol pixels op zuiver zwart terwijl de letters zelf
   #16110C zijn. Op de allerdonkerste ijken zette de letters daardoor op #222222
   — netjes evenredig, en toch niet de kleur die gevraagd werd.

   Dus de MEEST VOORKOMENDE inktkleur. Dat is per definitie het vlak van de
   letter of de lijn, en dat is wat iemand ziet. De paar pixels die nóg donkerder
   zijn lopen tegen de klem aan en landen ook op de doelinkt; dat is één stap
   op een verloop van tweehonderd en zichtbaar is het niet. */
const telling = new Map();
for (let i = 0; i < data.length; i += 4) {
  if (data[i + 3] < 200) continue;
  const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
  /* Alleen wat ECHT donker is telt mee voor de ijking. Zonder deze regel wint
     de grond zelf: wit is óók neutraal, dus óók "inkt", en dan is de meest
     voorkomende inktkleur #FEFEFE. */
  if (!isInkt(r, g, b) || lum(r, g, b) > grondL * 0.5) continue;
  const k = (r << 16) | (g << 8) | b;
  telling.set(k, (telling.get(k) || 0) + 1);
}
let vaakst = null, aantal = 0;
for (const [k, v] of telling) if (v > aantal) { aantal = v; vaakst = k; }
if (vaakst === null) { console.error('geen donkere pixels gevonden'); process.exit(1); }
const donkerste = lum((vaakst >> 16) & 255, (vaakst >> 8) & 255, vaakst & 255);
const span = grondL - donkerste;
if (span < 1) { console.error('de meest voorkomende inktkleur is niet donker'); process.exit(1); }

let n = 0;
for (let i = 0; i < data.length; i += 4) {
  if (data[i + 3] === 0) continue;
  const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
  if (!isInkt(r, g, b)) continue;
  const u = Math.max(0, Math.min(1, (grondL - lum(r, g, b)) / span));
  if (u === 0) continue;
  n++;
  data[i] = Math.round(gR + (iR - gR) * u);
  data[i + 1] = Math.round(gG + (iG - gG) * u);
  data[i + 2] = Math.round(gB + (iB - gB) * u);
}

let s = sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } });
s = /\.jpe?g$/i.test(doel) ? s.flatten({ background: GROND }).jpeg({ quality: 92 }) : s.png({ compressionLevel: 9 });
await s.toFile(doel);
const h = (v) => Math.round(v).toString(16).padStart(2, '0');
console.log(`${bron} → ${doel}\n  inkt was #${h((vaakst >> 16) & 255)}${h((vaakst >> 8) & 255)}${h(vaakst & 255)} (${aantal} px), ${n} pixels hermengd naar #${h(iR)}${h(iG)}${h(iB)}`);
