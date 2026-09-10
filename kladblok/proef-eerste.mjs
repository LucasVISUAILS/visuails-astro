/* HOE VER MOET IEMAND SCROLLEN VOOR HET EERSTE VELD — 10 september 2026
   Lucas: *"een test sample moet snel en moeiteloos zijn voor een eerste klant."*
   Eén getal dat dat meet, naast dezelfde meting op catalog. */
import { chromium } from 'playwright';
const B = process.env.BASIS || 'http://127.0.0.1:4331';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const [pad, naam] of [['/test-sample/', 'PROEF'], ['/start/catalog/', 'CATALOG']]) {
  for (const [maat, w, h] of [['breed', 1280, 1000], ['telefoon', 390, 844]]) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.goto(`${B}${pad}`, { waitUntil: 'domcontentloaded' });
    await p.evaluate(() => { for (const k of document.querySelectorAll('button, a')) if (/noodzakelijke|akkoord|accepteer/i.test(k.textContent || '')) k.click(); });
    await p.waitForTimeout(500);
    const u = await p.evaluate(() => {
      const zichtbaar = (e) => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
      const velden = [...document.querySelectorAll('input, select, textarea')]
        .filter((f) => f.type !== 'hidden' && zichtbaar(f));
      const eerste = velden[0];
      const y = eerste ? Math.round(eerste.getBoundingClientRect().top + window.scrollY) : null;
      const kern = document.querySelector('.s22') || document.body;
      return {
        eerste: y, hoogte: Math.round(kern.scrollHeight),
        woorden: (document.body.innerText.match(/\S+/g) || []).length,
        blokken: [...kern.children].filter(zichtbaar).map((e) => `${(e.className||'').split(' ').slice(-1)[0]}:${Math.round(e.getBoundingClientRect().height)}`),
      };
    });
    console.log(`${naam} ${maat.padEnd(9)} eerste veld op ${String(u.eerste).padStart(5)}px van ${String(u.hoogte).padStart(5)}px · ${u.woorden} woorden`);
    if (maat === 'breed') console.log(`   ${u.blokken.join('  ')}`);
    await p.close();
  }
}
await b.close();
