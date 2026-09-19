import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const url of process.argv.slice(2)) {
  const p = await b.newPage({ viewport: { width: 390, height: 800 } });
  await p.goto('http://127.0.0.1:4399' + url, { waitUntil: 'networkidle' });
  const r = await p.evaluate(() => {
    const over = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    const klein = [...document.querySelectorAll('body *')].filter(e => { const cs = getComputedStyle(e); return e.textContent.trim() && cs.display !== 'none' && parseFloat(cs.fontSize) < 11.5 && e.children.length === 0; }).map(e => `${e.className}:${parseFloat(getComputedStyle(e).fontSize).toFixed(1)}`);
    return { over, hoogte: document.documentElement.scrollHeight, klein: [...new Set(klein)].slice(0, 8) };
  });
  console.log(url, JSON.stringify(r));
  await p.close();
}
await b.close();
