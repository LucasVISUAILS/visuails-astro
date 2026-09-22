import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1100, height: 900 } });
await p.goto('file:///home/claude/repo/visuails-styleguide.html', { waitUntil: 'networkidle' });
console.log(await p.evaluate(() => document.documentElement.scrollHeight));
await p.screenshot({ path: '/tmp/claude-0/sg.png', fullPage: true });
await b.close();
