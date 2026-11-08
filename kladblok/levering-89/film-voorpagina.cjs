// Levering 89 · een korte film van de voorpagina: de opening met het veld B1 achter de laptop (één scroll, de metro neemt
// het veld mee), dan rustig omlaag door Wat we maken en de galerij (de foto's hangen even, anti-gravity), de logoposter
// (de scroll drijft hem), Hoe het werkt en het €1-blok (B4 Nacht), en in de voet het tekstlogo onder de muis (het venster).
// Op een gemaakte klok zoals kladblok/levering-88/film89.cjs: elk beeld 1/30 s; de rit van de opening en de css-animaties
// lopen op die klok.
//   node kladblok/levering-89/film-voorpagina.cjs <basis> <map> [w h] [deel] [eerste beeld]
// (levering 89: 'opening' tot beeld 174, 'rest' van 175 tot 187 (Wat we maken), dan 'poster' vanaf 188: zonder grafische
// kaart bleef het schermbeeld boven de galerij hangen; ffmpeg met -framerate 24), en 'voet' (het venster in de voet)
// deel 'opening' (de opening en de rit), 'rest' (vanaf Wat we maken, met een verse pagina: zonder grafische kaart blijven drie
// WebGL-doeken in één pagina soms hangen) of 'alles'.
// Daarna: ffmpeg -framerate 30 -i <map>/f%04d.png -vf "scale=1280:-2:flags=lanczos,format=yuv420p" -c:v libx264
//   -preset veryfast -crf 20 -movflags +faststart voorpagina-89.mp4
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const [,, BASIS, MAP, W = 1440, H = 900, DEEL = 'alles', EERSTE = '0', PAD = '/nl/'] = process.argv;
  fs.mkdirSync(MAP, { recursive: true });
  for (const f of fs.readdirSync(MAP)) if (f.endsWith('.png') && Number(f.slice(1, 5)) >= +EERSTE) fs.unlinkSync(`${MAP}/${f}`);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: +W, height: +H } });
  p.on('pageerror', (e) => console.log('pageerror', e.message));
  const STAP = 1000 / 30;
  /* de klok alleen voor de opening; vanaf Wat we maken loopt alles op zijn eigen tijd (met de klok bleef de galerij
     zonder grafische kaart hangen) */
  const LOS = DEEL === 'rest' || DEEL === 'poster' || DEEL === 'voet';
  if (!LOS) await p.addInitScript(() => {
    let vt = 0; window.__o8Klok = () => vt; window.__zetKlok = (t) => { vt = t; };
    const start = new Map();
    window.__animaties = () => {
      for (const a of document.getAnimations()) {
        if (!start.has(a)) { const d = (a.effect && a.effect.getTiming && a.effect.getTiming().delay) || 0; if (d > 0) a.effect.updateTiming({ delay: 0 }); start.set(a, vt + d); a.pause(); }
        a.currentTime = Math.max(0, vt - start.get(a));
      }
    };
  });
  await p.goto(`${BASIS}${PAD}`, { waitUntil: 'load' });
  await p.evaluate(() => { document.getElementById('cc-bar')?.remove(); document.querySelector('.wa-dock')?.remove(); });
  await p.waitForFunction(() => !document.documentElement.classList.contains('vl8-aan'), null, { timeout: 15000 }).catch(() => {});
  await p.mouse.move(+W - 60, 300);
  await p.waitForFunction(() => window.__o8Stand && window.__o8Stand().kanSpelen, null, { timeout: 30000 }).catch(() => console.log('video niet klaar'));
  const t0 = await p.evaluate(() => document.querySelector('.o8-baan').getBoundingClientRect().top + scrollY - 56);
  let vt = 0, i = +EERSTE, y = 0;
  const beeld = async (scroll = true, n = 1) => {
    for (let k = 0; k < n; k++) {
      if (LOS) {
        if (scroll) await p.evaluate((y) => scrollTo(0, y), Math.round(y));
        await p.waitForTimeout(STAP);
        await p.screenshot({ path: `${MAP}/f${String(i++).padStart(4, '0')}.png`, timeout: 180000 });
        continue;
      }
      vt += STAP;
      await p.evaluate(([y, vt, s]) => { window.__zetKlok(vt); if (s) scrollTo(0, y); }, [Math.round(y), vt, scroll]);
      await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      await p.waitForFunction(() => !window.__o8Stand || !window.__o8Stand().zoekt, null, { timeout: 10000 }).catch(() => {});
      await p.evaluate(() => window.__animaties());
      await p.screenshot({ path: `${MAP}/f${String(i++).padStart(4, '0')}.png`, timeout: 180000 });
    }
  };
  const fase = () => p.evaluate(() => window.__o8Stand ? window.__o8Stand().fase : 'klaar');
  if (!LOS) {
    await beeld(true, 30);                                                         // de opening, 1 s stil: B1 achter de laptop
    let v = 0;
    while ((await fase()) === 'rust' && y < t0 + 60) { v += (700 - v) * 0.12; y += Math.max(2, v / 30); await beeld(); }
    for (let k = 0; k < 600 && (await fase()) !== 'klaar'; k++) await beeld(false); // de rit: de metro neemt het veld mee
    await beeld(false, 24);
    if (DEEL === 'opening') { console.log(i, 'beelden'); await b.close(); return; }
  } else {
    /* een sprong naar Wat we maken (de eindstand van de opening), of meteen naar de poster */
    await p.evaluate((d) => (d === 'poster' ? document.querySelector('[data-p9]') : d === 'voet' ? document.querySelector('.site-footer') : document.getElementById('maken'))?.scrollIntoView(), DEEL);
    await p.waitForTimeout(2500);
  }
  if (DEEL === 'voet') {
    /* het tekstlogo in de voet onder de muis: het venster */
    await beeld(false, 10);
    const bb = await p.evaluate(() => { const r = document.querySelector('.site-footer .footer-brand .brand').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
    await p.mouse.move(bb[0], bb[1], { steps: 6 });
    await beeld(false, 24);
    console.log(i, 'beelden'); await b.close(); return;
  }
  y = await p.evaluate(() => scrollY);
  /* rustig omlaag, met een zachte golf in de vaart, tot de poster; door de baan van de poster (de scroll drijft hem) */
  const naar = async (doel, vaart) => { while (y < doel - 1) { y = Math.min(doel, y + vaart); await beeld(); } };
  const top = (s) => p.evaluate((s) => { const e = document.querySelector(s); return e ? e.getBoundingClientRect().top + scrollY : 0; }, s);
  /* vanaf hier kost elk beeld zonder grafische kaart seconden: grotere stappen (de film draait op 24 beelden per seconde) */
  const R = LOS ? 1.8 : 1;
  if (DEEL !== 'poster') {
    await naar((await top('[data-g8]')) - 120, 40 * R);  // Wat we maken
    await beeld(true, 8);
    await naar((await top('[data-g8]')) + 260, 60 * R);  // de galerij, wat sneller: de foto's hangen even
    await beeld(true, 12);
    await naar(await top('[data-p9]'), 48 * R);
  }
  const baan = await p.evaluate(() => { const b = document.querySelector('[data-p9-baan]'); return b.getBoundingClientRect().height - document.querySelector('[data-p9-podium]').offsetHeight; });
  const p9 = y;
  await naar(p9 + baan * 0.62, 30 * R);                   // de V zuigt en klikt, de kop komt
  await beeld(true, 14);
  await naar(p9 + baan, 30 * R);                          // de V groeit tot de foto
  await beeld(true, 16);
  await naar((await top('.h-proef')) - 120, 56 * R);      // Hoe het werkt, het €1-blok
  await beeld(true, 20);
  const voet = await top('.site-footer');
  await naar(voet - 200, 56 * R);
  await beeld(true, 8);
  const bb = await p.evaluate(() => { const r = document.querySelector('.site-footer .footer-brand .brand').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
  await p.mouse.move(bb[0], bb[1], { steps: 6 });         // het tekstlogo onder de muis: het venster
  await beeld(false, 24);
  console.log(i, 'beelden');
  await b.close();
})();
