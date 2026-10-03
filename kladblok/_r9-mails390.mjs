import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: false })).newPage();
for (const n of [2]) {
  await p.goto(`http://localhost:4478/mail/${n}`);
  const m = await p.evaluate(() => ({ scroll: document.documentElement.scrollWidth - innerWidth, links: [...document.querySelectorAll('a')].map((a) => { const r = a.getBoundingClientRect(); return `${a.textContent.trim().slice(0, 30)}→${a.getAttribute('href').replace(/[?].*/, '?…')} (${Math.round(r.width)}x${Math.round(r.height)})`; }), klein: [...new Set([...document.querySelectorAll('body *')].filter((e) => [...e.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 11.5).map((e) => e.tagName + ':' + getComputedStyle(e).fontSize))] }));
  console.log(n, JSON.stringify(m));
  await p.screenshot({ path: `/tmp/claude-0/mail${n}-390.png`, fullPage: true });
}
await b.close();
