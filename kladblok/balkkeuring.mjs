/*
 * VISUAILS — de balk op elke pagina: staat hij overal gelijk, en is hij leesbaar?
 *
 * ── WAAROM DIT BESTAAT ──────────────────────────────────────────────────────
 *
 * Lucas, 8 september 2026: *"Sommige pagina's top balk heel slecht zichtbaar en
 * leesbaar. Ook staat het logo hier links terwijl op de homepage hij in het
 * midden staat, maak dit consistent en controleer letterlijk elke pagina op dit
 * soort fouten."*
 *
 * Twee dingen die je met het blote oog niet betrouwbaar ziet:
 *
 *   1 · DE PLAATS. Het merkteken, het menu en de knoppenrij horen op elke
 *       pagina op dezelfde x te staan. Eén pagina met een andere containerbreedte
 *       of een andere hero verschuift ze, en dat valt pas op als je twee tabbladen
 *       naast elkaar legt.
 *   2 · DE LEESBAARHEID. De balk is doorzichtig glas; wat eronder ligt bepaalt
 *       het contrast. keuring.mjs zoekt de achtergrondKLEUR van de ouders en
 *       vindt daar niets, want de balk zelf is transparant. Dus meet deze de
 *       ECHTE pixels: letters onzichtbaar maken, schermafdruk, en elk punt
 *       binnen het tekstkader afzetten tegen de computed kleur.
 *
 * Allebei in TWEE standen, want de balk klapt om bij het scrollen.
 *
 * Gebruik:  node kladblok/balkkeuring.mjs [pad ...]   (dev-server op 4331)
 */
import { chromium } from 'playwright';
import sharp from 'sharp';

const BASIS = 'http://localhost:4331';
const PADEN = process.argv.slice(2).length ? process.argv.slice(2) : [
  '/nl/', '/nl/catalog', '/nl/lifestyle', '/nl/video', '/nl/hooks', '/nl/editions',
  '/nl/models', '/nl/custom-models', '/nl/studio', '/nl/portal', '/nl/how-it-works',
  '/nl/pricing', '/nl/plans', '/nl/start', '/nl/gallery', '/nl/about', '/nl/compare',
  '/nl/faq', '/nl/contact', '/nl/test-sample', '/nl/thank-you', '/nl/guides',
  '/nl/upload-guidelines', '/nl/ai-act', '/nl/terms', '/nl/privacy', '/nl/proef',
  '/nl/start/complete', '/nl/start/plan', '/nl/404',
];
const NORM = 4.5;

const L = ([r, g, b]) => {
  const f = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => { const [h, l] = a > b ? [a, b] : [b, a]; return (h + 0.05) / (l + 0.05); };
const ontleed = (s) => {
  const n = (String(s).match(/-?\d*\.?\d+/g) || []).map(Number);
  const k = /color\(/.test(s) ? 255 : 1;
  return [...n.slice(0, 3).map((v) => v * k), n.length > 3 ? n[3] : 1];
};
const meng = (voor, achter) => voor.slice(0, 3).map((v, i) => v * voor[3] + achter[i] * (1 - voor[3]));

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const plaatsen = [];
let meldingen = 0;

for (const pad of PADEN) {
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try { await p.goto(BASIS + pad, { waitUntil: 'load', timeout: 25000 }); } catch { await p.close(); continue; }
  await p.waitForTimeout(900);
  await p.evaluate(() => {
    const k = [...document.querySelectorAll('button')].find((b) => /noodzakelijke|necessary/i.test(b.textContent || ''));
    if (k) k.click();
  });
  await p.waitForTimeout(500);

  for (const stand of ['boven', 'gescrold']) {
    if (stand === 'gescrold') { await p.evaluate(() => window.scrollTo(0, 1400)); await p.waitForTimeout(900); }

    const maat = await p.evaluate(() => {
      const h = document.querySelector('.site-header');
      if (!h) return null;
      const r = (sel) => { const el = h.querySelector(sel); if (!el) return null; const b = el.getBoundingClientRect(); return { x: Math.round(b.left), r: Math.round(b.right), m: Math.round(b.left + b.width / 2), w: Math.round(b.width) }; };
      const tekst = [];
      for (const [naam, sel] of [['menu', '.nav-links > li > a'], ['inloggen', '.nav-account-link'], ['taal', '.lang-switch .ls:not(.on)'], ['taal-aan', '.lang-switch .ls.on']]) {
        const el = h.querySelector(sel); if (!el) continue;
        const b = el.getBoundingClientRect();
        tekst.push({ naam, kleur: getComputedStyle(el).color, box: { x: Math.round(b.x) + 2, y: Math.round(b.y) + 2, w: Math.max(1, Math.round(b.width) - 4), h: Math.max(1, Math.round(b.height) - 4) } });
      }
      return { merk: r('.brand, .brand-link, a[class*="brand"]'), nav: r('.nav-links'), acties: r('.nav-actions'), hoogte: Math.round(h.getBoundingClientRect().height), tekst };
    });
    if (!maat) continue;
    plaatsen.push({ pad, stand, merk: maat.merk?.x, navM: maat.nav?.m, actiesR: maat.acties?.r, hoogte: maat.hoogte });

    await p.evaluate(() => { for (const el of document.querySelectorAll('.site-header a, .site-header button, .site-header span, .site-header svg, .site-header b')) el.style.color = 'transparent'; });
    await p.waitForTimeout(80);
    const png = await p.screenshot({ clip: { x: 0, y: 0, width: 1440, height: Math.max(60, maat.hoogte) } });
    const { data, info } = await sharp(png).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
    await p.evaluate(() => { for (const el of document.querySelectorAll('.site-header a, .site-header button, .site-header span, .site-header svg, .site-header b')) el.style.color = ''; });

    for (const t of maat.tekst) {
      const kl = ontleed(t.kleur);
      let slechtst = 21;
      for (let y = t.box.y; y < Math.min(info.height, t.box.y + t.box.h); y++)
        for (let x = t.box.x; x < Math.min(info.width, t.box.x + t.box.w); x++) {
          const o = (y * info.width + x) * info.channels;
          const grond = [data[o], data[o + 1], data[o + 2]];
          const r = ratio(L(meng(kl, grond)), L(grond));
          if (r < slechtst) slechtst = r;
        }
      if (slechtst < NORM) { meldingen++; console.log(`${pad} (${stand}) — ${t.naam} ${slechtst.toFixed(2)}:1`); }
    }
  }
  await p.close();
}
await browser.close();

console.log('\n── staat de balk overal op dezelfde plek? ──');
const groepen = {};
for (const r of plaatsen) {
  const sleutel = `merk ${r.merk} · menumidden ${r.navM} · rechterrand ${r.actiesR} · hoogte ${r.hoogte}`;
  (groepen[sleutel] ||= []).push(`${r.pad} (${r.stand})`);
}
const rijen = Object.entries(groepen).sort((a, b) => b[1].length - a[1].length);
for (const [sleutel, waar] of rijen) {
  console.log(`${String(waar.length).padStart(3)}×  ${sleutel}`);
  if (waar.length <= 6) console.log(`      ${waar.join(', ')}`);
}
console.log(`\n${PADEN.length} pagina's × 2 standen · ${meldingen} leesbaarheidsmelding(en) · ${rijen.length} verschillende balkindeling(en)`);
