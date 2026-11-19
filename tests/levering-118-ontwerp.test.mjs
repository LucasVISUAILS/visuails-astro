/* VISUAILS — levering 118 (17 november 2026), proefronde: ontwerp van de gedeelde onderdelen (bouwer BF).
 *
 *   node tests/levering-118-ontwerp.test.mjs      (geen build nodig: leest de bron en rekent op de beelden zelf)
 *
 *   D1-01 · de bannerkop is effen (keuze a): het masker van de telefoon wordt niet meer geladen, de rand in de andere kleur is
 *           hard (geen blur, geen 42 %), en zonder WebGL staat de kop als inkt met een witte rand (hal.css, b94-effen);
 *           sinds levering 120 (19 november 2026) is de WebGL-kop helemaal weg: hier staat alleen nog dat hij niet terugkomt;
 *   D1-02 · witte tekst op de groene kaarten: een effen laag van 15 % in #04110B over het doek, en de tekst 100 % wit.
 *           Doorgerekend op de echte beelden (stuk-0 … 7 met de korrel als overlay): wit op het lichtste punt ≥ 4,5 : 1,
 *           ook op een pil met 10 % wit erover;
 *   D1-03 · de Studiobrief in de voet: wit;
 *   D1-05 · de grote €1 begint op de kolom (geen negatieve marge links);
 *   P2-03 · koppen hebben onder 341 px een ondergrens (h1 26, h2 22, h3 18), daarboven verandert niets.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const lees = (p) => readFileSync(path.join(ROOT, p), 'utf8');
let pass = 0, fail = 0;
const ok = (naam, v, extra = '') => { if (v) { pass++; console.log(` ok   ${naam}`); } else { fail++; console.log(` FAIL ${naam} ${extra}`); } };

const hal = lees('src/styles/hal.css');
const blok = hal.slice(hal.indexOf('LEVERING 118 · ONTWERP'));
const kaart = lees('src/styles/kaart-115.css');
const banner = lees('src/components/HalBanner94.astro');

console.log('\nD1-01 · de bannerkop effen');
/* levering 120 (19 november 2026, lijst 130 en 132): de WebGL-kop is weg (de kop is gewone tekst in één kleur die met de video
   meeloopt, zonder rand of waas). Wat D1-01 vastlegde (geen masker, geen negatief in de letters, een effen kop) blijft waar;
   de rand (hc.strokeText) en b94-effen bestaan niet meer. De nieuwe kop: tests/levering-120-videokop.test.mjs. */
ok('het masker van de telefoon wordt niet meer geladen (geen mImg.src = …)', !/mImg\.src\s*=/.test(banner));
ok('geen WebGL-kop meer (geen tekenLetters, geen kopKleur, geen regels voor b94-effen)', !/tekenLetters|function kopKleur|classList\.add\('b94-effen'\)|getContext\('webgl'/.test(banner) && !/\.b94-effen[^{}]*\{/.test(hal));
ok('  en het negatief van de video in de letters (svg-filter) tekent niet meer', !/g2\.drawImage\(/.test(banner) && !/feComponentTransfer/.test(banner));

console.log('\nD1-02 · het doek: een effen laag van 15 % en witte tekst');
const lagen = kaart.match(/:is\(\[data-kaart\][^{]*\{\s*background: ([^;]*);\s*background-blend-mode: ([^;]*);/);
ok('de kaart begint met een effen laag rgb(4 17 11 / .15)', lagen && /^linear-gradient\(rgb\(4 17 11 \/ \.15\) 0 0\), url\('\/img\/doek\/korrel\.webp'\)/.test(lagen[1]), lagen && lagen[1].slice(0, 80));
ok('  en de mengstanden schuiven mee (normal, overlay, normal, normal)', lagen && /^normal, overlay, normal, normal/.test(lagen[2]));
ok('  geen verloop: de laag heeft één kleur (0 0)', !/linear-gradient\([^)]*\d+deg/.test(kaart));
ok('de tweede tekst op een kaart wit (kaart-108 werd 86 %), met één :not(#k) meer', /\.kv-108\[data-kaart\] :is\(p, li, dd, span, small, label\)[^{]*:not\(#k\):not\(#k\) \{ color: #FFFFFF !important; \}/.test(kaart));
ok('de slotkaart: tekst en diensten wit (hal.css)', /\.h-lk-slot p:not\(\.h-pil\):not\(\.h-acties\) \{ color: #FFFFFF; \}/.test(hal) && /\.h-lk-diensten \.svcsw-k \{ color: #FFFFFF; \}/.test(hal));
ok('D1-03 · de Studiobrief in de voet: wit', /\.site-footer \.sb \.sb-zin \{ color: #FFFFFF; \}/.test(hal) && /:is\(\.site-footer \.sb, \.h-gd-brief\) :is\(\.sb-zin, \.sb-noot\):not\(#k\) \{ color: #FFFFFF !important; \}/.test(kaart));

/* het slechtste punt, op de beelden zelf: elk stuk met de korrel als overlay (getegeld zoals in de css, 256 px), dan de laag */
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const L = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const kr = await sharp(path.join(ROOT, 'public/img/doek/korrel.webp')).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const ALFA = 0.15, GROND = [4 / 255, 17 / 255, 11 / 255];
let slechtst = 99, slechtstPil = 99;
for (let i = 0; i < 8; i++) {
  const { data, info } = await sharp(path.join(ROOT, `public/img/doek/stuk-${i}.webp`)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let max = 0, maxPil = 0;
  for (let y = 0; y < info.height; y += 1) for (let x = 0; x < info.width; x += 1) {
    const o = (y * info.width + x) * 3, k = ((y % kr.info.height) * kr.info.width + (x % kr.info.width)) * 3;
    const c = [0, 1, 2].map((j) => {
      const s = data[o + j] / 255, kk = kr.data[k + j] / 255;
      const ov = s <= 0.5 ? 2 * s * kk : 1 - 2 * (1 - s) * (1 - kk);
      return ov * (1 - ALFA) + GROND[j] * ALFA;
    });
    const l = L(...c); if (l > max) max = l;
    const lp = L(...c.map((v) => v * 0.9 + 0.1)); if (lp > maxPil) maxPil = lp;
  }
  slechtst = Math.min(slechtst, 1.05 / (max + 0.05));
  slechtstPil = Math.min(slechtstPil, 1.05 / (maxPil + 0.05));
}
ok(`wit op het lichtste punt van alle acht stukken (met korrel en laag): ${slechtst.toFixed(2)} : 1 ≥ 4,5`, slechtst >= 4.5);
ok(`wit op een pil met 10 % wit erover: ${slechtstPil.toFixed(2)} : 1 ≥ 4,5`, slechtstPil >= 4.5);

console.log('\nD1-05 · de grote €1');
/* levering 118 (integratie IB): hal.css kent geen :is() (tests/live-qa-51); de kiezers staan uitgeschreven. */
ok('begint op de kolom: margin-left 0 voor .h-proef en .h-ts-open', /html body\.hal\.hal\.hal\.hal \.h-proef \.h-een,\s*html body\.hal\.hal\.hal\.hal \.h-ts-open \.h-een \{ margin-left: 0; \}/.test(blok));

console.log('\nP2-03 · koppen met een ondergrens als je inzoomt');
const smal = blok.match(/@media \(max-width: 340px\) \{([\s\S]*?)\n\}/);
ok('een blok @media (max-width: 340px)', !!smal);
const s = smal ? smal[1] : '';
ok('h1 clamp(26px, 7.4vw, 44px)', /\.h-kop\.h-h1 \{ font-size: clamp\(26px, 7\.4vw, 44px\); \}/.test(s));
ok('h2 clamp(22px, 6.3vw, 32px)', /\.h-kop\.h-h2 \{ font-size: clamp\(22px, 6\.3vw, 32px\); \}/.test(s));
ok('h3 clamp(18px, 4.6vw, 23px)', /\.h-kop\.h-h3 \{ font-size: clamp\(18px, 4\.6vw, 23px\); \}/.test(s));
/* levering 120: de bannerkop heeft geen aanloop meer (één titel met clamp(18px, …) in banner-94.css); de kop onder de video blijft */
ok('P2-09 · de kop onder de video ook (de aanloop van de bannerkop is weg sinds levering 120)', !/\.b94-aanloop/.test(s) && /\.ov110-kop \{ font-size: max\(18px, /.test(s));
/* boven 340 px verandert niets: de maten op 341 px zijn dezelfde als zonder ondergrens */
ok('op 341 – 900 px blijven de oude maten staan (min(7.4vw, 44px) …)', /\.h-kop\.h-h1 \{ font-size: min\(7\.4vw, 44px\); \}/.test(hal) && /\.h-kop\.h-h3 \{ font-size: min\(4\.6vw, 23px\); \}/.test(hal));
for (const [naam, vw, vloer] of [['h1', 7.4, 26], ['h2', 6.3, 22], ['h3', 4.6, 18]]) {
  const op195 = Math.max(vloer, (vw * 195) / 100);
  ok(`${naam} op 195 px (200 % zoom op 390): ${op195.toFixed(1)} px ≥ 11,5 (was ${((vw * 195) / 100).toFixed(2)})`, op195 >= 11.5 && op195 >= vloer);
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
