import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 390, height: 800 } });
await p.goto('http://127.0.0.1:4399/nl/', { waitUntil: 'networkidle' });
await p.addStyleTag({ content: '.reveal.pending{opacity:1!important;transform:none!important} .cc,[class*=cookie]{display:none!important}' });
const lb = p.locator('.lb').first(); await lb.scrollIntoViewIfNeeded();
await lb.screenshot({ path: '/tmp/claude-0/lb-390.png' });
console.log('overflow', await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth));
await b.close();
