/* WAAR ZITTEN DE 7.400 PIXELS VAN DE PROEF — 10 september 2026
   Blok voor blok, zodat "te lang" een adres krijgt in plaats van een gevoel. */
import { chromium } from 'playwright';
const B = process.env.BASIS || 'http://127.0.0.1:8790';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const [pad, naam, breedte] of [['/test-sample/', 'PROEF breed', 1280], ['/test-sample/', 'PROEF telefoon', 390], ['/start/catalog/', 'CATALOG breed', 1280]]) {
  const p = await b.newPage({ viewport: { width: breedte, height: 1000 } });
  await p.goto(`${B}${pad}`, { waitUntil: 'domcontentloaded' });
  await p.evaluate(() => { for (const k of document.querySelectorAll('button, a')) if (/noodzakelijke|akkoord|accepteer/i.test(k.textContent || '')) k.click(); });
  await p.waitForTimeout(500);
  const uit = await p.evaluate(() => {
    const zichtbaar = (e) => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
    const kern = document.querySelector(".s22") || document.body;
    const rijen = [...kern.children].filter(zichtbaar).map((e) => ({
      tag: e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : ''),
      h: Math.round(e.getBoundingClientRect().height),
      w: (e.innerText.match(/\S+/g) || []).length,
      kop: (e.querySelector('h1,h2,h3') || {}).textContent?.trim().slice(0, 48) || '',
    }));
    return { totaal: Math.round(kern.scrollHeight), rijen };
  });
  console.log(`\n══ ${naam} — ${uit.totaal}px`);
  for (const r of uit.rijen) console.log(`   ${String(r.h).padStart(5)}px ${String(r.w).padStart(4)}w  ${r.tag.padEnd(30)} ${r.kop}`);
  await p.close();
}
await b.close();
