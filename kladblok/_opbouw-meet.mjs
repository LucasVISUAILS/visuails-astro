// Meet de opbouw van elke publieke pagina: per sectie de hoogte, de kop en het
// aantal woorden, op 1440 en 390. Schrijft kladblok/_opbouw-meting.json.
// Gebruik: node kladblok/_opbouw-meet.mjs [pad ...]   (dist-server op 4399)
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const PADEN = process.argv.length > 2 ? process.argv.slice(2) : [
  '/nl/catalog/', '/nl/lifestyle/', '/nl/video/', '/nl/how-it-works/', '/nl/pricing/', '/nl/plans/',
  '/nl/start/', '/nl/test-sample/', '/nl/gallery/', '/nl/about/', '/nl/contact/', '/nl/faq/',
  '/nl/guides/', '/nl/models/', '/nl/custom-models/', '/nl/compare/', '/nl/studio/', '/nl/per-product/',
  '/nl/upload-guidelines/', '/nl/hooks/', '/nl/editions/', '/nl/ai-act/',
  '/nl/lifestyle/dunes/', '/nl/catalog/classic/', '/nl/video/motion/',
];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const uit = {};
for (const pad of PADEN) {
  uit[pad] = {};
  for (const w of [1440, 390]) {
    const p = await b.newPage({ viewport: { width: w, height: 900 } });
    await p.goto('http://127.0.0.1:4399' + pad, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(300);
    const m = await p.evaluate(() => {
      const main = document.querySelector('main');
      if (!main) return null;
      // De secties: de kinderen van de eerste wrapper met meer dan één kind.
      let bak = main;
      while (bak.children.length === 1) bak = bak.children[0];
      const woorden = (el) => (el.innerText || '').split(/\s+/).filter((x) => /\p{L}/u.test(x)).length;
      const secties = [...bak.children].filter((el) => el.getBoundingClientRect().height > 20 && getComputedStyle(el).display !== 'none').map((el) => {
        const k = el.querySelector('h1, h2, h3');
        return {
          tag: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).filter((c) => !c.startsWith('astro-')).slice(0, 3).join('.') : ''),
          h: Math.round(el.getBoundingClientRect().height),
          kop: k ? k.innerText.replace(/\s+/g, ' ').trim().slice(0, 80) : '',
          woorden: woorden(el),
          knoppen: el.querySelectorAll('a.knop, a.btn, button.knop').length,
          beelden: el.querySelectorAll('img').length,
        };
      });
      return {
        titel: document.title,
        hoogte: Math.round(document.documentElement.scrollHeight),
        woorden: woorden(main),
        secties,
      };
    });
    uit[pad][w] = m;
    await p.close();
  }
  const m = uit[pad][1440];
  console.log(`${pad.padEnd(26)} ${String(m?.hoogte).padStart(6)}px  ${String(m?.woorden).padStart(5)} woorden  ${m?.secties.length} secties`);
}
await b.close();
writeFileSync(new URL('./_opbouw-meting.json', import.meta.url), JSON.stringify(uit, null, 1));
