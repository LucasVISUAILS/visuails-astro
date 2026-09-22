import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await (await b.newContext({ viewport: { width: 1440, height: 950 } })).newPage();
await p.goto('http://127.0.0.1:4399' + process.argv[2], { waitUntil: 'load' });
await p.evaluate(() => document.fonts.ready);
await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(x => setTimeout(x, 40)); } window.scrollTo(0,0); });
await p.waitForTimeout(400);
console.log(await p.evaluate(() => {
  const res = [];
  const pad = (el) => { const s = []; let n = el; while (n && n !== document.body) { s.unshift(n.tagName.toLowerCase() + (n.className && typeof n.className === 'string' ? '.' + n.className.split(' ').filter(Boolean).slice(0,2).join('.') : '')); n = n.parentElement; } return s.slice(-4).join(' > '); };
  for (const ouder of document.querySelectorAll('body *')) {
    const k = [...ouder.children].filter(e => e.checkVisibility?.() && !['absolute','fixed'].includes(getComputedStyle(e).position) && !e.closest('[aria-hidden="true"], svg, [class*="lc-"]'));
    for (let i = 0; i < k.length - 1; i++) {
      const ra = k[i].getBoundingClientRect(), rb = k[i+1].getBoundingClientRect();
      if (rb.top < ra.bottom - 2 && rb.left < ra.right - 2 && ra.left < rb.right - 2) {
        const t = (e) => [...e.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join(' ').trim();
        if (t(k[i]).length > 2 && t(k[i+1]).length > 2)
          res.push(`${Math.round(ra.bottom - rb.top)}px  ${pad(k[i])} "${t(k[i]).slice(0,30)}"  ⇄  ${pad(k[i+1])} "${t(k[i+1]).slice(0,30)}"`);
      }
    }
  }
  return [...new Set(res)].join('\n');
}));
await b.close();
