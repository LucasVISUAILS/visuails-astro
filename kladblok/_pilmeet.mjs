import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: +process.argv[2] || 768, height: 900 } });
await p.goto('http://127.0.0.1:4399/nl/', { waitUntil: 'networkidle' });
console.log(await p.evaluate(() => [...document.querySelectorAll('.kiezer .kaart-tekst')].map(e => Math.round(e.getBoundingClientRect().height))));
await b.close();
