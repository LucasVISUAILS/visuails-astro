// Levering 88 (88b) · een film van de opening met de metro, op een gemaakte klok: elk beeld 1/60 s (de rit en de css-animaties
// lopen op die klok, de video zoekt per beeld). node kladblok/levering-88/film88.cjs <basis> n3 <map> [w h]
// Daarna: ffmpeg -framerate 60 -i <map>/f%04d.png -vf "scale=1280:-2:flags=lanczos,format=yuv420p" -c:v libx264
//   -preset veryfast -crf 20 -movflags +faststart opening-88.mp4
// 88b: MEET=1 zet alleen de laptop op wit (geen blauw, balk of kop); met LOG=1 erbij schrijft hij per beeld de rit, het
//   videobeeld en hoe ver het doek de laptop schuift. python3 kladblok/levering-88/rand.py <map> <log> meet dan zijn rand.
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const [,, BASIS, SOORT, MAP, W = 1440, H = 900, PAD = '/nl/'] = process.argv;
  fs.mkdirSync(MAP, { recursive: true });
  for (const f of fs.readdirSync(MAP)) if (f.endsWith('.png')) fs.unlinkSync(`${MAP}/${f}`);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: +W, height: +H } });
  p.on('pageerror', (e) => console.log('pageerror', e.message));
  await p.addInitScript(() => {
    let vt = 0; window.__o8Klok = () => vt; window.__zetKlok = (t) => { vt = t; };
    /* de css-animaties op dezelfde klok */
    const start = new Map();
    window.__animaties = () => {
      for (const a of document.getAnimations()) {
        /* een animatie met wachttijd: de wachttijd wordt een later begin op deze klok. Stilgezet in haar wachttijd toont
           Chromium in de schermafdruk het element zonder animatie (vol), terwijl het in de browser verborgen is. */
        if (!start.has(a)) { const d = (a.effect && a.effect.getTiming && a.effect.getTiming().delay) || 0; if (d > 0) a.effect.updateTiming({ delay: 0 }); start.set(a, vt + d); a.pause(); }
        a.currentTime = Math.max(0, vt - start.get(a));
      }
    };
  });
  await p.goto(`${BASIS}${PAD}?metro=${SOORT}`, { waitUntil: 'load' });
  await p.evaluate(() => { document.getElementById('cc-bar')?.remove(); document.querySelector('.wa-launcher')?.remove(); });
  /* MEET=1: alleen de laptop op wit (het blauw, de balk en de kop weg), om zijn rand per beeld in de schermafdruk te meten */
  if (process.env.MEET) await p.addStyleTag({ content: '.o8-metro, .o8-vlak, .o8-veeg, header, .o8-kop, .o8-onder, .o8-kies, .o8-sc, .o8-beeld, .m8 { visibility: hidden !important; } html, body, .o8, .o8-podium { background: #fff !important; }' });
  await p.waitForFunction(() => !document.documentElement.classList.contains('vl8-aan'), null, { timeout: 15000 }).catch(() => {});
  await p.mouse.move(1380, 300);
  await p.waitForFunction(() => window.__o8Stand && window.__o8Stand().kanSpelen, null, { timeout: 30000 }).catch(() => console.log('video niet klaar'));
  const baan = await p.evaluate(() => { const b = document.querySelector('.o8-baan'), po = document.querySelector('.o8-podium'); return { top: b.getBoundingClientRect().top + scrollY, R: b.offsetHeight - po.offsetHeight }; });
  const t0 = baan.top - 56, trig = t0 + baan.R * 0.6 * 0.816;
  /* het scrollpad: snelheid in px per seconde per stuk */
  /* we beginnen net boven het podium (de opening zelf staat in de film van levering 87) */
  const begin = process.env.BEGIN === 'trig' ? Math.round(trig - 40) : Math.max(0, Math.round(t0 - 260));
  await p.evaluate((y) => scrollTo(0, y), begin); await p.waitForTimeout(400);
  const plan = [
    { tot: begin, v: 0, duur: process.env.BEGIN === 'trig' ? 0 : 0.3 },                    // even stil
    { tot: t0, v: 700 },                                 // naar de laptop
    { tot: trig + 10, v: 760 },                          // door de video
    { tot: trig + 250, v: 420 },                         // nog wat door terwijl hij vertrekt
    { tot: trig + 250, v: 0, duur: 1.6 },                // stil: het blauw rijdt weg, de diensten komen omhoog
  ];
  let y = begin, vt = 0, i = 0, v = 0;
  const beeld = async () => {
    vt += 1000 / 60;
    await p.evaluate(([y, vt]) => { window.__zetKlok(vt); scrollTo(0, y); }, [Math.round(y), vt]);
    await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    await p.waitForTimeout(18);
    await p.evaluate(() => window.__animaties());
    if (process.env.LOG) console.log(i, JSON.stringify(await p.evaluate(() => { const s = window.__o8Stand(); return [+s.rit.toFixed(4), s.getekend, +(s.schuif || 0).toFixed(5), +(s.ritBeeld || 0).toFixed(3), +(s.ritVeeg || 0).toFixed(4), s.beeld, s.gepauzeerd]; })));
    if (process.env.GEEN_BEELD) { i++; return; }
    await p.screenshot({ path: `${MAP}/f${String(i++).padStart(4, '0')}.png` });
  };
  for (const st of plan) {
    if (st.v === 0) { const n = Math.round((st.duur || 0) * 60); for (let k = 0; k < n; k++) { v *= 0.8; await beeld(); } continue; }
    while (y < st.tot - 0.5) {
      v += (st.v - v) * 0.12;                 // zacht naar de nieuwe snelheid
      y = Math.min(st.tot, y + Math.max(2, v / 60));
      await beeld();
    }
  }
  console.log(i, 'beelden', JSON.stringify(await p.evaluate(() => window.__o8Stand())));
  await b.close();
})();
