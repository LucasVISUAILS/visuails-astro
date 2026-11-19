/*
 * VISUAILS — levering 120 (19 november 2026, lijst 130 en 132): de kop op de video (bouwer K). Leest de bron, geen build nodig.
 *
 * Lucas koos één titel in één maat met een korte beschrijving eronder, in VISUAILS Display 2 Light (300), geen waas over de
 * video, en de kleur van de tekst volgt de video: "op het begin zwart, en wanneer de video van de telefoon-overlay naar de
 * echte uitlegvideo snapt de tekst de gehele video wit, tot het stuk op het einde waar hij weer naar zwart smooth mee fade
 * terwijl de achtergrond weer wit wordt." De WebGL-kop (negatief, masker, kopKleur) is weg.
 *
 *   1 · de tekst: titel en beschrijving in het Nederlands en het Engels, met de typografische apostrof;
 *   2 · de kleur (ronde 2, lijst 133: "zo lang mogelijk 1 kleur"): het plan uit het gemeten licht achter de kop (kopPlan):
 *       begin en eind inkt, een wissel alleen als de kleur onder 3 : 1 zakt en de andere 15 % beter is, elke kleur minstens
 *       1,5 s; hoeveel wissels en hoe lang onder 3 : 1;
 *   3 · de banner: gewone html-tekst (één h1), geen WebGL, de kleur per videobeeld uit de tijd van de video;
 *   (5 · het deelplaatje: scripts/make-og.mjs leest de titel en de nieuwe letter)
 *   4 · de opmaak: de letter, één maat met clamp (76 / 40 px), text-wrap: balance, de zin 17 – 20 px en hoogstens 36 em,
 *       de video met zijn midden onder de bovenbalk; de oude regels (aanloop, --b94-em, Display Blok, b94-effen) zijn weg;
 *   5 · de letter wordt vooraf geladen (Layout) en het laadscherm wacht erop (Voorlader80).
 *
 *   node tests/levering-120-videokop.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
let goed = 0, fout = 0;
const ok = (naam, c, extra = '') => { if (c) goed++; else fout++; console.log(`${c ? ' ok  ' : ' FAIL'} ${naam}${c || !extra ? '' : ` — ${extra}`}`); };
const lees = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const { BANNER, kopPlan, KOP_LICHT, KOP_REGELS } = await import(pathToFileURL(path.join(ROOT, 'src/data/banner94.js')).href);

console.log('\nVISUAILS — de kop op de video (levering 120)\n\n1 · de tekst');
const TEKST = {
  en: ['Your brand’s visual content partner', 'Product photos, lifestyle images and videos of your clothing. AI lays the groundwork; we finish every image and check it down to the last detail.'],
  nl: ['De beeldmakers achter jouw merk', 'Productfoto’s, lifestylebeelden en video’s van je kleding. AI legt de basis, wij werken elk beeld af en controleren het tot in detail.'],
};
for (const taal of ['en', 'nl']) {
  const T = BANNER[taal];
  ok(`${taal}: de titel "${TEKST[taal][0]}"`, T.titel === TEKST[taal][0], T.titel);
  ok(`${taal}: de beschrijving`, T.beschrijving === TEKST[taal][1], T.beschrijving);
  ok(`${taal}: de typografische apostrof (’), geen rechte (')`, !/'/.test(T.titel + T.beschrijving));
  ok(`${taal}: geen kop, kopTelefoon of aanloop meer`, !('kop' in T) && !('kopTelefoon' in T));
}

console.log('\n2 · de kleur: het plan uit het licht achter de kop (0 = inkt, 1 = wit)');
const bytes = Uint8Array.from(atob(KOP_LICHT.d), (c) => c.charCodeAt(0));
ok(`het licht is gemeten voor elk beeld van de video (${KOP_LICHT.beelden} beelden, 24 per seconde, 26,75 s)`, KOP_LICHT.fps === 24 && KOP_LICHT.beelden === 642 && bytes.length === 2 * 642);
ok('de regels: 3 : 1, 15 % beter, 1,5 s vasthouden', KOP_REGELS.grens === 3 && KOP_REGELS.beter === 1.15 && KOP_REGELS.vast === 1.5);
const lin = (b) => { const c = b / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const cInkt = (i) => (lin(bytes[2 * i]) + 0.05) / 0.0537, cWit = (i) => 1.05 / (lin(bytes[2 * i + 1]) + 0.05);
const plan = kopPlan();
ok('begin in inkt, eind in inkt (het beeld is daar wit)', plan.kleur[0] === 0 && plan.kleur[plan.kleur.length - 1] === 0 && cInkt(0) > 15 && cInkt(641) > 15);
ok(`nooit twee wissels binnen 1,5 s (${plan.wissels.map((w) => `${w.t.toFixed(2)} ${w.naar}`).join(', ')})`, plan.wissels.every((w, i) => i === 0 || w.t - plan.wissels[i - 1].t >= 1.5 - 1e-9) && plan.wissels.length >= 1 && plan.wissels[0].t >= 1.5);
ok('elke wissel op een beeld waar de oude kleur onder 3 : 1 zakt en de nieuwe minstens 15 % beter is', plan.wissels.every(({ beeld: i, naar }) => { const oud = naar === 'wit' ? cInkt(i) : cWit(i), nieuw = naar === 'wit' ? cWit(i) : cInkt(i); return oud < 3 && nieuw >= 1.15 * oud; }));
const onder = [...plan.contrast].map((c, i) => [c, i]).filter(([c]) => c < 3).map(([, i]) => i);
const stukken = []; for (const i of onder) { if (stukken.length && i === stukken[stukken.length - 1][1] + 1) stukken[stukken.length - 1][1] = i; else stukken.push([i, i]); }
ok(`${plan.wissels.length} wissels in één doorloop (hoogstens 6); ${(onder.length / 24).toFixed(2)} s onder 3 : 1 (hoogstens 2,5 s): ${stukken.map(([a, b]) => `${(a / 24).toFixed(2)}–${((b + 1) / 24).toFixed(2)}`).join(', ')}`, plan.wissels.length <= 6 && onder.length / 24 <= 2.5);
ok('een korte flits verandert niets: het stuk op 15,9 – 16,3 s houdt de kleur van ervoor en erna', plan.kleur[Math.round(15.8 * 24)] === plan.kleur[Math.round(16.1 * 24)] && plan.kleur[Math.round(16.1 * 24)] === plan.kleur[Math.round(16.5 * 24)]);

console.log('\n3 · de banner (HalBanner94.astro)');
const ban = lees('src/components/HalBanner94.astro');
ok('één h1: de titel; de beschrijving eronder als <p class="b94-zin">', (ban.match(/<h1\b/g) || []).length === 1 && /<h1 id="b94-h1" class="b94-kop">\{T\.titel\}<\/h1>\s*<p class="b94-zin">\{T\.beschrijving\}<\/p>/.test(ban));
ok('geen WebGL, geen canvas, geen masker, geen kopKleur, geen svg-filter meer', !/getContext\('webgl'|<canvas|tekenLetters|function kopKleur|feComponentTransfer|data-b94-laag|b94-basis|mImg/.test(ban));
ok('het script neemt het plan uit banner94.js (geen vaste tijden meer: geen kopWit, geen KLEUR_EIND)', /import \{ kopPlan \} from '\.\.\/data\/banner94\.js';/.test(ban) && /plan = kopPlan\(\)/.test(ban) && !/kopWit|KLEUR_EIND/.test(ban + lees('src/data/banner94.js').replace(/\/\*[\s\S]*?\*\//g, '')));
ok('de kleur per videobeeld uit de tijd van dat beeld (requestVideoFrameCallback, mediaTime), naar --b94-kleur', /requestVideoFrameCallback\(lus\)/.test(ban) && /mediaTijd >= 0 \? mediaTijd : vid\.currentTime/.test(ban) && /setProperty\('--b94-kleur', k\)/.test(ban));
ok('na een sprong (seeked, loadeddata, emptied, de lus terug) meteen goed, anders een zachte overgang van 0,35 s', /opV\('loadeddata', naSprong\); opV\('seeked', naSprong\); opV\('emptied', naSprong\);/.test(ban) && /if \(springt \|\| \(vorigeT >= 0 && Math\.abs\(t - vorigeT\) > 0\.25\)\) meteen = true;/.test(ban) && /opV\('seeking', \(\) => \{ springt = true; \}\);/.test(ban) && /\.b94-kopvak \{ transition: color \.35s ease-in-out; \}/.test(lees('src/styles/banner-94.css')) && /\.b94\.b94-meteen \.b94-kopvak \{ transition: none; \}/.test(lees('src/styles/banner-94.css')));
ok('minder beweging: het stille eindbeeld en de kleur van 18 s', /const t = stilVast \? STIL_T : \(mediaTijd >= 0/.test(ban) && /const STIL_T = 18;/.test(ban));
ok('de bron telt de maat waarop de video getekend wordt, 1920 boven 1280 beeldpunten', /const getekend = Math\.max\(beeld\.clientWidth, vr\.width, vr\.height \* 16 \/ 9\);/.test(ban) && /getekend \* dpr > 1280 \? vid\.dataset\.groot : vid\.dataset\.klein/.test(ban));
ok('de stappen, de pauzeknop, de knoppen en stapBij zijn er nog', /function stapBij\(/.test(ban) && /data-b94-pauze/.test(ban) && /class="b94-knop h-acties"/.test(ban) && /data-b94-ga=\{i\}/.test(ban));

console.log('\n4 · de opmaak (banner-94.css, hal.css)');
const css = lees('src/styles/banner-94.css'), hal = lees('src/styles/hal.css');
ok('de letter: VISUAILS Display 2 Light (300) uit public/fonts', /@font-face \{ font-family: 'VISUAILS Display 2'; font-style: normal; font-weight: 300;[^}]*VISUAILSDisplay2-Light\.woff2/.test(css) && fs.existsSync(path.join(ROOT, 'public/fonts/visuails-display/VISUAILSDisplay2-Light.woff2')));
ok('de titel: 300, text-wrap: balance, geen hoofdletters', /\.b94-kop:not\(#k\) \{\s*margin: 0; font: 300 var\(--b94-titel, 40px\)\/1\.06 'VISUAILS Display 2'[^}]*text-transform: none; text-wrap: balance;/.test(css));
ok('één maat: op de computer hoogstens 76 px (zo groot als naast de telefoon past), op de telefoon hoogstens 40 px', /--b94-titel: min\(76px, var\(--b94-kol\) \/ 7\.7\)/.test(css) && /--b94-titel: clamp\(18px, \(100vw - 2 \* var\(--b94-rand\)\) \/ 7\.7, 40px\)/.test(css));
ok('de kolom eindigt 24 px voor de telefoon (37,76 % van de getekende video)', /--b94-kol: calc\(50cqw - \.1224 \* var\(--b94-vb\) - var\(--b94-rand\) - 24px\);/.test(css) && /--b94-vb: max\(100cqw, \(100cqh \+ var\(--b94-balk\)\) \* 16 \/ 9\);/.test(css));
ok('de beschrijving in DM Sans, 17 – 20 px, hoogstens 36 em (ook tegen --h-maat van hal.css)', /\.b94-zin:not\(#k\) \{\s*--h-maat: min\(36em, 100%\); margin: \.9em 0 0; max-width: min\(36em, 100%\); font: 400 var\(--b94-zinmaat, 17px\)\/1\.5 var\(--h-letter\);/.test(css) && /--b94-zinmaat: clamp\(17px, 1\.25vw, 20px\)/.test(css));
ok('de kleur: --b94-kleur op de video, inkt op de grond', /\.b94-kopvak \{ position: relative; z-index: 2; color: var\(--b94-kleur, var\(--h-inkt, #090D0B\)\); \}/.test(css) && /@media \(max-width: 1099\.98px\) \{\s*\.b94-kopvak \{ color: var\(--h-inkt, #090D0B\);/.test(css));
ok('de video: zijn midden een halve balk lager, cover zonder rand, nooit lager dan 16 : 9', /top: calc\(50% \+ var\(--b94-balk\) \/ 2\); transform: translateY\(-50%\);/.test(css) && /height: max\(calc\(100% \+ var\(--b94-balk\)\), 56\.25cqw\); object-fit: cover;/.test(css));
ok('de banner een balk (en 10 px) lager dan de video, zodat die niet vergroot wordt', /height: max\(600px, min\(100svh, 56\.25vw - var\(--b94-balk\) - 10px\)\);/.test(css));
ok('geen waas: geen backdrop-filter of verloop op de kop', !/\.b94-kopvak[^{]*\{[^}]*(backdrop-filter|gradient|text-shadow)/.test(css));
ok('weg: de blokletter, --b94-em, de aanloop, de lagen van het negatief', !/VISUAILS Display Blok|--b94-em|b94-aanloop|b94-breekt|\.b94-gat|\.b94-vul|b94-basis|b94-effect/.test(css));
ok('weg uit hal.css: de regel voor de aanloop en de regels voor b94-effen', !/\.b94-aanloop \{/.test(hal) && !/\.b94-effen[^{}]*\{/.test(hal));

console.log('\n5 · de letter laden');
ok('Layout laadt VISUAILS Display 2 Light vooraf op de voorpagina (niet meer de blokletter)', /const KOPBLOK = '\/fonts\/visuails-display\/VISUAILSDisplay2-Light\.woff2';/.test(lees('src/layouts/Layout.astro')));
ok('het laadscherm wacht op de letter van de kop', /document\.fonts\.load\('300 1em "VISUAILS Display 2"'\)/.test(lees('src/components/Voorlader80.astro')));

console.log('\n6 · het deelplaatje (scripts/make-og.mjs)');
{
  const og = lees('scripts/make-og.mjs').replace(/\/\*[\s\S]*?\*\//g, '');   /* zonder commentaar */
  ok('make-og leest BANNER[lang].titel (geen .kop meer) in VISUAILS Display 2 Light', /const g = BANNER\[lang\]\.titel;/.test(og) && !/BANNER\[lang\]\.kop/.test(og) && /VISUAILSDisplay2-Light\.woff2/.test(og) && !/VISUAILSDisplayBlok/.test(og));
  /* levering 123 (19 november 2026): niet meer op de bestandstijd. Bij het leveren in Lucas' map kwam de letter ná de plaatjes
     binnen, dus faalde de vergelijking terwijl de plaatjes wel nieuw waren. Nu: de plaatjes bestaan, zijn echte jpg's van 1200 × 630. */
  ok('de deelplaatjes bestaan en zijn 1200 × 630 (jpg)', ['og-en', 'og-nl', 'og-voorpagina-en', 'og-voorpagina-nl'].every((n) => {
    const b = fs.readFileSync(path.join(ROOT, `public/img/${n}.jpg`));
    if (b[0] !== 0xFF || b[1] !== 0xD8) return false;
    for (let i = 2; i < b.length - 9; ) { if (b[i] !== 0xFF) return false; const m = b[i + 1], l = b.readUInt16BE(i + 2); if (m >= 0xC0 && m <= 0xC3) return b.readUInt16BE(i + 5) === 630 && b.readUInt16BE(i + 7) === 1200; i += 2 + l; }
    return false;
  }));
}

console.log(`\n${goed} goed, ${fout} fout`);
process.exit(fout ? 1 : 0);
