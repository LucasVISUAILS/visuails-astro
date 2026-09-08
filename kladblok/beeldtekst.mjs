/*
 * VISUAILS — leesbaarheid van tekst die op een FOTO ligt, in echte pixels.
 *
 * ── WAAROM DIT NAAST keuring.mjs BESTAAT ────────────────────────────────────
 *
 * keuring.mjs meet contrast tegen de achtergrondKLEUR: het loopt van het
 * tekstelement omhoog door zijn ouders tot het een `background-color` vindt die
 * niet doorzichtig is, en rekent daartegen. Dat klopt overal waar de grond een
 * kleur is — en het klopt NERGENS waar de grond een foto is. Op de voorpagina
 * vond het daardoor "te weinig contrast: geen" terwijl 7,8% van het vlak achter
 * de zin linksonder onder 4,5:1 lag, met een slechtste punt van 1,0:1: donkergrijs
 * op een zwarte mouw, tekst die letterlijk verdwijnt.
 *
 * Deze meter kijkt naar wat er te ZIEN is. Per tekstblok dat boven een <img> of
 * een background-image ligt:
 *
 *   1 · verberg de LETTERS (visibility op de kinderen, niet op het blok) zodat
 *       een eigen sluier of was van dat blok wél blijft staan — anders meet je
 *       de foto zonder het scherm dat er juist voor gemaakt is;
 *   2 · fotografeer de pagina;
 *   3 · lees elke pixel binnen het kader van de tekst en zet hem af tegen de
 *       computed `color` van dat blok.
 *
 * Gerapporteerd wordt het SLECHTSTE punt en het aandeel onder 4,5:1. Eén pixel
 * onder de norm is geen ramp — letters bedekken niet elk punt van hun kader —
 * maar een slechtste punt van 1,0:1 en een paar procent eronder betekent dat er
 * woorden wegvallen. De drempel hieronder is daarop gezet en niet op nul.
 *
 * Gebruik:  node kladblok/beeldtekst.mjs [pad ...]
 * Vereist een dev-server op 4331, net als keuring.mjs en te-dicht.mjs.
 */
import { chromium } from 'playwright';

const BASIS = 'http://localhost:4331';
const PADEN = process.argv.slice(2).length ? process.argv.slice(2) : [
  '/nl/', '/nl/catalog', '/nl/lifestyle', '/nl/video', '/nl/hooks', '/nl/editions',
  '/nl/models', '/nl/custom-models', '/nl/studio', '/nl/portal', '/nl/how-it-works',
  '/nl/pricing', '/nl/plans', '/nl/start', '/nl/gallery', '/nl/about', '/nl/compare',
];
const BREEDTES = [[1440, 900, 'breed'], [390, 844, 'telefoon']];

/* Onder deze twee tegelijk is het een melding. Zie de kop voor waarom niet op
   nul: een tekstKADER is groter dan de letters erin. */
const NORM = 4.5;
const AANDEEL = 0.5;   // procent van het kader dat onder de norm mag liggen
const SLECHTST = 3.0;  // en het slechtste punt mag daar niet onder

const lum = ([r, g, b]) => {
  const f = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => {
  const [h, l] = a > b ? [a, b] : [b, a];
  return (h + 0.05) / (l + 0.05);
};
const ontleed = (s) => {
  const n = (String(s).match(/-?\d*\.?\d+/g) || []).map(Number);
  const k = /color\(/.test(s) ? 255 : 1;
  return n.slice(0, 3).map((v) => v * k);
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
let meldingen = 0;
let gemeten = 0;

for (const pad of PADEN) {
  for (const [w, h, naam] of BREEDTES) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    try {
      await page.goto(BASIS + pad, { waitUntil: 'load', timeout: 30000 });
    } catch { await page.close(); continue; }
    await page.waitForTimeout(1200);
    /* De cookiebalk ligt over de onderkant van elke pagina en is zelf geen foto. */
    await page.evaluate(() => {
      const k = [...document.querySelectorAll('button')].find((b) => /noodzakelijke|necessary/i.test(b.textContent || ''));
      if (k) k.click();
    });
    await page.waitForTimeout(600);

    /* Welke tekstblokken liggen op beeld? Een blok telt mee als er onder zijn
       MIDDEN een <img>, <video> of een element met een background-image zit dat
       niet het blok zelf is. elementsFromPoint geeft de hele stapel, dus een
       eigen dekkende vulling tussen tekst en foto sluit hem terecht uit. */
    const kandidaten = await page.evaluate(() => {
      const uit = [];
      const tekstig = 'h1, h2, h3, h4, p, li, span.mono, .etiket, a.knop';
      for (const el of document.querySelectorAll(tekstig)) {
        const t = (el.textContent || '').trim();
        if (t.length < 8) continue;
        if (el.querySelector(tekstig)) continue;           // alleen de bladeren
        const r = el.getBoundingClientRect();
        if (r.width < 24 || r.height < 8) continue;
        if (r.bottom < 0 || r.top > innerHeight) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue;
        /* ── EEN KNOP MET EEN EIGEN VULLING LIGT NIET OP DE FOTO ─────────────
           De eerste versie meldde `a.knop.knop-inkt` op 1,02:1: een zwarte pil
           met witte letters, waarvan 4,5% van het KADER buiten de afronding
           valt en dus wit is. De letters komen daar nooit. Wie zijn eigen
           dekkende vulling meebrengt, meet je tegen die vulling en niet tegen
           wat eronder ligt — en dat doet keuring.mjs al. */
        const eigen = cs.backgroundColor || '';
        if (eigen && !/rgba\(0, 0, 0, 0\)|transparent/.test(eigen) && !/\/\s*0?\.\d/.test(eigen)) continue;
        const stapel = document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        let opBeeld = false;
        for (const n of stapel) {
          if (n === el || el.contains(n)) continue;
          const ncs = getComputedStyle(n);
          const dekkend = ncs.backgroundColor && !/rgba\(0, 0, 0, 0\)|transparent/.test(ncs.backgroundColor)
            && !/\/\s*0?\.\d/.test(ncs.backgroundColor);
          if (n.tagName === 'IMG' || n.tagName === 'VIDEO' || ncs.backgroundImage.includes('url(')) { opBeeld = true; break; }
          if (dekkend) break;                                // een echte vulling ertussen
        }
        if (!opBeeld) continue;
        el.dataset.btMerk = String(uit.length);
        uit.push({ i: uit.length, kleur: cs.color, naam: el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(/\s+/).slice(0, 2).join('.') : ''), tekst: t.slice(0, 44), box: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) } });
      }
      return uit;
    });

    if (kandidaten.length) {
      /* Alleen de letters weg — niet het blok, en niet zijn ::before. */
      await page.evaluate(() => {
        for (const el of document.querySelectorAll('[data-bt-merk]')) {
          el.style.color = 'transparent';
          el.style.textShadow = 'none';
          for (const k of el.children) k.style.color = 'transparent';
        }
      });
      await page.waitForTimeout(250);
      const png = await page.screenshot({ clip: { x: 0, y: 0, width: w, height: Math.min(h, 4000) } });
      /* sharp zit al in de boom (Astro's beeldpijplijn gebruikt hem) en is hier
         alleen een PNG-decoder: de pixels van de schermafdruk uitlezen kan in de
         pagina zelf niet. */
      const sharp = (await import('sharp').catch(() => null))?.default;
      if (!sharp) { console.log('sharp ontbreekt — npm i -D sharp'); process.exit(1); }
      const { data, info } = await sharp(png).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
      for (const k of kandidaten) {
        const tl = lum(ontleed(k.kleur));
        let onder = 0, totaal = 0, slechtst = 21;
        const x1 = Math.max(0, k.box.x), y1 = Math.max(0, k.box.y);
        const x2 = Math.min(info.width, k.box.x + k.box.w), y2 = Math.min(info.height, k.box.y + k.box.h);
        for (let y = y1; y < y2; y++) {
          for (let x = x1; x < x2; x++) {
            const o = (y * info.width + x) * info.channels;
            const r = ratio(lum([data[o], data[o + 1], data[o + 2]]), tl);
            totaal++; if (r < NORM) onder++; if (r < slechtst) slechtst = r;
          }
        }
        if (!totaal) continue;
        gemeten++;
        const pct = (100 * onder) / totaal;
        if (pct > AANDEEL && slechtst < SLECHTST) {
          meldingen++;
          console.log(`${pad} (${naam})`);
          console.log(`   ${k.naam} — slechtste ${slechtst.toFixed(2)}:1 · ${pct.toFixed(1)}% onder ${NORM}:1 — "${k.tekst}"`);
        }
      }
    }
    await page.close();
  }
}
await browser.close();
console.log(`\n${PADEN.length} pagina's × ${BREEDTES.length} breedtes · ${gemeten} tekstblok(ken) op beeld · ${meldingen} melding(en)`);
