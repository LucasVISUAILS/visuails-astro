// Levering 88c · een film van de opening: één scroll omlaag op het podium, dan handen af tot Wat we maken; dan één scroll
// omhoog en hij speelt terug. Op een gemaakte klok: elk beeld 1/60 s (de rit, de video en de css-animaties lopen op die klok;
// de video zoekt dan per filmbeeld het beeld dat de klok wil, met dezelfde snelheden als in het echt).
//   node kladblok/levering-88/film89.cjs <basis> <map> [w h]
// Daarna: ffmpeg -framerate 60 -i <map>/f%04d.png -vf "scale=1280:-2:flags=lanczos,format=yuv420p" -c:v libx264
//   -preset veryfast -crf 20 -movflags +faststart opening-88c.mp4
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const [,, BASIS, MAP, W = 1440, H = 900, PAD = '/nl/'] = process.argv;
  fs.mkdirSync(MAP, { recursive: true });
  for (const f of fs.readdirSync(MAP)) if (f.endsWith('.png')) fs.unlinkSync(`${MAP}/${f}`);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: +W, height: +H } });
  p.on('pageerror', (e) => console.log('pageerror', e.message));
  await p.addInitScript(() => {
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
  await p.evaluate(() => { document.getElementById('cc-bar')?.remove(); document.querySelector('.wa-launcher')?.remove(); });
  await p.waitForFunction(() => !document.documentElement.classList.contains('vl8-aan'), null, { timeout: 15000 }).catch(() => {});
  await p.mouse.move(+W - 60, 300);
  await p.waitForFunction(() => window.__o8Stand && window.__o8Stand().kanSpelen, null, { timeout: 30000 }).catch(() => console.log('video niet klaar'));
  const t0 = await p.evaluate(() => document.querySelector('.o8-baan').getBoundingClientRect().top + scrollY - 56);
  let vt = 0, i = 0, y = Math.max(0, Math.round(t0 - 300));
  await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(400);
  const beeld = async (scroll = true) => {
    vt += 1000 / 60;
    await p.evaluate(([y, vt, s]) => { window.__zetKlok(vt); if (s) scrollTo(0, y); }, [Math.round(y), vt, scroll]);
    await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    /* de video zoekt het beeld van de klok: wacht tot hij er is */
    await p.waitForFunction(() => !window.__o8Stand().zoekt, null, { timeout: 10000 }).catch(() => {});
    await p.evaluate(() => new Promise((r) => requestAnimationFrame(r)));
    await p.evaluate(() => window.__animaties());
    await p.screenshot({ path: `${MAP}/f${String(i++).padStart(4, '0')}.png` });
  };
  const fase = () => p.evaluate(() => window.__o8Stand().fase);
  for (let k = 0; k < 18; k++) await beeld();                                  // even stil
  /* gewoon naar de laptop scrollen, zoals een zachte scroll; voorbij 8 px in de baan start hij en staat de pagina vast */
  let v = 0;
  while ((await fase()) === 'rust' && y < t0 + 60) { v += (700 - v) * 0.12; y += Math.max(2, v / 60); await beeld(); }
  console.log('start bij', Math.round(y - t0), 'px in de baan, beeld', i);
  /* handen af: tot Wat we maken open staat, en nog 1,2 s */
  for (let k = 0; k < 900 && (await fase()) !== 'klaar'; k++) await beeld(false);
  console.log('klaar bij beeld', i);
  for (let k = 0; k < 72; k++) await beeld(false);
  /* één scroll omhoog: hij speelt terug */
  await p.mouse.move(+W / 2, +H / 2); await p.mouse.wheel(0, -100);
  for (let k = 0; k < 900 && (await fase()) !== 'rust'; k++) await beeld(false);
  console.log('terug bij beeld', i);
  for (let k = 0; k < 48; k++) await beeld(false);
  console.log(i, 'beelden');
  await b.close();
})();
