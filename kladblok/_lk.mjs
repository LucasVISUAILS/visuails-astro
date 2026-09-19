import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('http://127.0.0.1:4399/nl/lifestyle', { waitUntil: 'networkidle' });
await p.addStyleTag({ content: '.js .reveal.pending{opacity:1!important;transform:none!important}' });
console.log(await p.evaluate(() => [...document.querySelectorAll('#looks > *, #looks .sr-kamer, #looks .sr-lead, #looks .sr-komend')].map(e => `${e.className.split(' ').slice(0,2).join('.')} ${Math.round(e.getBoundingClientRect().height)} pad:${getComputedStyle(e).paddingTop}`).join('\n')));
console.log(await p.evaluate(() => { const k = document.querySelector('.sr-kamer'); return [...k.children].map(e => `${e.className} ${Math.round(e.getBoundingClientRect().height)}`).join(' | '); }));
await b.close();
