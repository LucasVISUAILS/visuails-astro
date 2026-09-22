import fs from 'node:fs';
import { chromium } from 'playwright';
const CSS = fs.readFileSync('kladblok/nachtproef.css', 'utf8');
const [pad, sel] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage();
await p.goto('http://127.0.0.1:4399' + pad, { waitUntil: 'load' });
await p.addStyleTag({ content: CSS });
await p.evaluate(() => document.documentElement.setAttribute('data-nacht', ''));
await p.waitForTimeout(300);
console.log(await p.evaluate((s) => {
  const uit = [];
  for (const el of document.querySelectorAll(s)) {
    const c = getComputedStyle(el);
    let n = el, g = '';
    while (n) { const bg = getComputedStyle(n).backgroundColor; if (bg && bg !== 'rgba(0, 0, 0, 0)') { g = bg + ' <' + n.tagName + '.' + String(n.className).slice(0, 30) + '>'; break; } n = n.parentElement; }
    uit.push({ el: el.tagName + '.' + String(el.className).slice(0, 30), tekst: (el.textContent || '').trim().slice(0, 20), kleur: c.color, grond: g });
    if (uit.length >= 5) break;
  }
  return JSON.stringify(uit, null, 1);
}, sel));
await b.close();
