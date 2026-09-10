import { chromium } from 'playwright';
const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const [naam, w, h] of [['breed', 1440, 900], ['laptop', 1280, 720], ['telefoon', 390, 844]]) {
  const pg = await br.newPage({ viewport: { width: w, height: h } });
  await pg.goto('http://127.0.0.1:4340/start/', { waitUntil: 'load' });
  await pg.waitForTimeout(600);
  const m = await pg.evaluate(() => {
    const r = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { top: Math.round(b.top + scrollY), h: Math.round(b.height), bot: Math.round(b.bottom + scrollY) }; };
    const deur1 = document.querySelector('.st-deur:not([hidden])');
    const zicht = [...document.querySelectorAll('.st-deur')].filter(e => getComputedStyle(e).display !== 'none');
    return {
      kop: r('.st-kop'), h1: r('#st-h1'), lead: r('.st-kop .lopend'),
      takrij: r('.st-takrij'), deuren: r('.st-deuren'),
      eersteDeur: deur1 ? { h: Math.round(deur1.getBoundingClientRect().height), top: Math.round(deur1.getBoundingClientRect().top + scrollY) } : null,
      zichtbaar: zicht.length,
      kolommen: getComputedStyle(document.querySelector('.st-deuren')).gridTemplateColumns,
      paginahoogte: document.documentElement.scrollHeight,
    };
  });
  console.log('\n══', naam, `${w}×${h}`);
  console.log(JSON.stringify(m, null, 1));
  await pg.close();
}
await br.close();
