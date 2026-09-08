/* Leesbaarheid en witruimte op de nieuwe voorpagina.
   Meet per tekstelement het contrast tegen de echte achtergrond eronder, de
   lettergrootte, en de verticale ruimte tussen de secties. */
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const [naam, w, h] of [['desktop', 1440, 900], ['tablet', 768, 1024], ['telefoon', 390, 844]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.emulateMedia({ reducedMotion: 'reduce' });
  await p.goto('http://localhost:4331' + (process.argv[2] || '/nl/') + '', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.waitForTimeout(2500);
  await p.evaluate(async () => {
    document.querySelector('astro-dev-toolbar')?.remove();
    const imgs = [...document.querySelectorAll('img')]; imgs.forEach((i) => { i.loading = 'eager'; });
    await Promise.all(imgs.map((i) => i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; })));
  });
  const uit = await p.evaluate(() => {
    const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= .03928 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
    const rgb = (s) => (s.match(/[\d.]+/g) || []).slice(0, 4).map(Number);
    const meng = (v, o) => v.length === 4 && v[3] < 1 ? v.slice(0, 3).map((c, i) => c * v[3] + o[i] * (1 - v[3])) : v.slice(0, 3);
    const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };
    /* De echte grond onder een element. Een verloop heeft geen background-color,
       dus die gevallen staan in de tabel met de donkerste kleur die eronder kan
       liggen — de strengste meting. */
    const TABEL = [
      ['.knop-inkt', [17, 17, 17]], ['.knop-geel', [210, 224, 74]], ['.paneel-slot', [26, 26, 26]], ['.paneel', [245, 245, 245]], ['.knop-wit', [255, 255, 255]], ['.balk-cta', [17, 17, 17]],
      ['.kaart-pil', [255, 255, 255]], ['.kaart-merk', [255, 255, 255]],
      ['.poster-tekst', [26, 26, 26]], ['.hero-clip', [17, 17, 17]],
      ['.maatlijn', [255, 255, 255]], ['.paneel-slot', [26, 26, 26]],
      ['.paneel', [245, 245, 245]], ['.hero', [233, 237, 238]],
      ['.kamer', [17, 17, 17]], ['.vp2', [17, 17, 17]],
    ];
    const grond = (el) => {
      let n = el;
      while (n && n !== document.documentElement) {
        const c = rgb(getComputedStyle(n).backgroundColor);
        if (c.length >= 3 && (c[3] === undefined || c[3] > .5)) return c.slice(0, 3);
        for (const [sel, kleur] of TABEL) if (n.matches(sel)) return kleur;
        n = n.parentElement;
      }
      return [255, 255, 255];
    };
    const vp = document.querySelector('.s22') || document.querySelector('main');
    const slecht = [], klein = [];
    for (const el of vp.querySelectorAll('*')) {
      const t = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ').trim();
      if (t.length < 2) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < .3) continue;
      if (el.closest('[aria-hidden="true"]')) continue;
      const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
      const fs = parseFloat(cs.fontSize), gew = parseInt(cs.fontWeight) || 400;
      const kleur = meng(rgb(cs.color), grond(el));
      const c = ratio(kleur, grond(el));
      const groot = fs >= 24 || (fs >= 18.66 && gew >= 700);
      const eis = groot ? 3 : 4.5;
      if (c < eis) slecht.push({ t: t.slice(0, 34), fs: +fs.toFixed(1), c: +c.toFixed(2), eis, kl: cs.color, gr: grond(el).join(',') });
      if (fs < 11.5) klein.push({ t: t.slice(0, 30), fs: +fs.toFixed(1) });
    }
    /* Witruimte: de afstand tussen de onderkant van de ene sectie en de bovenkant van de volgende. */
    const blokken = [...vp.children].map((el) => ({ k: el.className || el.tagName, r: el.getBoundingClientRect() }));
    const gaten = blokken.slice(1).map((b, i) => ({ tussen: `${String(blokken[i].k).slice(0, 22)} → ${String(b.k).slice(0, 22)}`, gat: Math.round(b.r.top - blokken[i].r.bottom) }));
    /* Binnenmarge: hoeveel lucht heeft een paneel vanbinnen. */
    const paneel = vp.querySelector('.paneel');
    const pad = paneel ? getComputedStyle(paneel).padding : '';
    return { slecht, klein, gaten, pad, breed: document.documentElement.scrollWidth };
  });
  console.log(`\n══ ${naam} (${w}) ══ scrollbreedte ${uit.breed} · paneelmarge ${uit.pad}`);
  console.log('te klein:', uit.klein.length ? JSON.stringify(uit.klein.slice(0, 8)) : 'geen');
  console.log('te weinig contrast:', uit.slecht.length ? JSON.stringify(uit.slecht.slice(0, 10), null, 1) : 'geen');
  console.log('gaten:', uit.gaten.map((g) => `${g.gat}`).join(' · '));
  if (naam === 'desktop') console.log('gaten uitgeschreven:', JSON.stringify(uit.gaten, null, 1));
  await p.close();
}
await b.close();
