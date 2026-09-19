import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('http://127.0.0.1:4399/nl/catalog/', { waitUntil: 'networkidle' });
await p.screenshot({ path: '/tmp/claude-0/kop.png', clip: { x: 0, y: 0, width: 500, height: 80 } });
await b.close();
