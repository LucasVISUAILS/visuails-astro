import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const pad of process.argv.slice(2)) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto('http://127.0.0.1:4399' + pad, { waitUntil: 'domcontentloaded' });
  await p.addStyleTag({ content: '*{transition:none!important;animation:none!important} .reveal,.pending{opacity:1!important;transform:none!important}' });
  const r = await p.evaluate(() => [...document.querySelectorAll('main section, main > div > section, .s22 > section')].filter((s,i,a)=>a.indexOf(s)===i && !s.parentElement.closest('section')).map(s => ({ h: Math.round(s.getBoundingClientRect().height), kop: (s.querySelector('h1,h2')?.innerText || s.className).replace(/\s+/g,' ').slice(0,60), w: s.innerText.split(/\s+/).length })));
  const tot = await p.evaluate(() => document.documentElement.scrollHeight);
  console.log(`\n${pad} ${tot}px`); for (const x of r) console.log(`  ${String(x.h).padStart(5)}  ${String(x.w).padStart(4)}w  ${x.kop}`);
  await p.close();
}
await b.close();
