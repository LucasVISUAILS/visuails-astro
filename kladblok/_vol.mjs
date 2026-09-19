import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const url of process.argv.slice(2)) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 0.35 });
  await p.goto('http://127.0.0.1:4399' + url, { waitUntil: 'networkidle' });
  await p.addStyleTag({ content: '.js .reveal.pending,.reveal.pending{opacity:1!important;transform:none!important} .cc, [class*=cookie]{display:none!important}' });
  await p.evaluate(() => new Promise(r => { let y = 0; const t = setInterval(() => { y += 900; window.scrollTo(0, y); if (y > document.body.scrollHeight) { clearInterval(t); window.scrollTo(0,0); r(); } }, 60); }));
  await p.waitForTimeout(400);
  const naam = url.replace(/\//g, '_').replace(/^_|_$/g, '') || 'home';
  await p.screenshot({ path: `/tmp/claude-0/vol-${naam}.png`, fullPage: true });
  await p.close();
}
await b.close();
