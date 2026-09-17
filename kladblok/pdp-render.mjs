import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1200, height: 728 }, deviceScaleFactor: 2 });
await p.goto('file:///home/claude/repo/kladblok/pdp-blueprint.html');
await p.waitForTimeout(700);
await p.screenshot({ path: 'kladblok/pdp-blueprint.png' });
await b.close();
