/* Staat er ergens tekst die doorzichtig blijft?
   `reveal pending` + animation-timeline: view() zou bij het scrollen naar 1
   moeten lopen. Dit meet de werkelijke doorzichtigheid van elk reveal-blok
   NADAT het in beeld is geweest, in een gewoon venster — niet in een
   fullPage-opname, want die verandert de viewport en daarmee de tijdlijn. */
import { chromium } from 'playwright';
const BASIS = process.env.BASIS || 'http://127.0.0.1:4399';
const PADEN = process.argv.length > 2 ? process.argv.slice(2) : ['/nl/', '/nl/faq/', '/nl/catalog/', '/nl/how-it-works/', '/nl/pricing/'];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
let fout = 0;
for (const pad of PADEN) {
  await p.goto(BASIS + pad, { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);
  await p.evaluate(() => { document.querySelectorAll('.cc, [class*="cookie"]').forEach((e) => e.remove()); });
  /* Langzaam helemaal naar beneden, zodat elk blok echt in beeld is geweest. */
  await p.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 300) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
  });
  await p.waitForTimeout(600);
  const flauw = await p.evaluate(() => {
    const uit = [];
    for (const el of document.querySelectorAll('.reveal, [class*="pending"]')) {
      const r = el.getBoundingClientRect();
      if (r.height < 8) continue;
      const o = Number(getComputedStyle(el).opacity);
      if (o < 0.9) uit.push({ klas: (el.className || '').toString().split(' ').slice(0, 3).join(' '), o: Math.round(o * 100) / 100, tekst: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40) });
    }
    return uit;
  });
  if (flauw.length) {
    console.log('\n' + pad);
    for (const f of flauw.slice(0, 10)) console.log('   opacity ' + f.o + '  .' + f.klas + '  "' + f.tekst + '"');
    if (flauw.length > 10) console.log('   … en nog ' + (flauw.length - 10));
    fout += flauw.length;
  }
}
console.log('\n' + fout + ' blok(ken) bleven doorzichtig na scrollen');
await b.close();
