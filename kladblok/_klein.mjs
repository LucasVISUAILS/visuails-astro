import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 390, height: 800 } });
await p.goto('http://127.0.0.1:4399/nl/how-it-works/', { waitUntil: 'networkidle' });
console.log(await p.evaluate(() => [...document.querySelectorAll('body *')].filter(e => { const cs = getComputedStyle(e); return e.textContent.trim() && cs.display !== 'none' && parseFloat(cs.fontSize) < 11.5 && e.children.length === 0; }).map(e => `${e.tagName}.${e.parentElement.className} "${e.textContent.trim().slice(0,40)}"`)));
await b.close();
