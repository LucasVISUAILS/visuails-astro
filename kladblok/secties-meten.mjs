import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const url of process.argv.slice(2)) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto('http://127.0.0.1:4399' + url, { waitUntil: 'networkidle' });
  await p.addStyleTag({ content: '.js .reveal.pending{opacity:1!important;transform:none!important}' });
  const r = await p.evaluate(() => {
    const out = [];
    document.querySelectorAll('main > section, main > div > section, .s22 > section, .s22 > div, main > *').forEach((s) => {
      const b = s.getBoundingClientRect(); if (b.height < 40) return;
      const h = s.querySelector('h1,h2,h3'); 
      const t = (s.textContent || '').replace(/\s+/g,' ').trim();
      out.push({ tag: s.tagName.toLowerCase() + (s.id ? '#' + s.id : '') + (s.className ? '.' + String(s.className).split(' ').slice(0,2).join('.') : ''), h: Math.round(b.height), kop: h ? h.textContent.trim().slice(0, 60) : '', woorden: t.split(' ').length, prijs: (t.match(/€\s?\d/g) || []).length });
    });
    return { totaal: Math.round(document.documentElement.scrollHeight), secties: out };
  });
  console.log(url, 'hoogte', r.totaal);
  for (const s of r.secties) console.log(`  ${String(s.h).padStart(5)}px  €×${s.prijs}  w${String(s.woorden).padStart(4)}  ${s.tag}  — ${s.kop}`);
  await p.close();
}
await b.close();
