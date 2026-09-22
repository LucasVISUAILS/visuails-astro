/* De site in de nacht, als proef. Injecteert kladblok/nachtproef.css in de
   ECHTE gebouwde pagina's en maakt van elke pagina twee afdrukken: dag en
   nacht, even breed, zodat je ze naast elkaar kunt leggen.
   node kladblok/_nachtproef.mjs            (vereist: build + dist-server 4399) */
import fs from 'node:fs';
import { chromium } from 'playwright';

const CSS = fs.readFileSync('kladblok/nachtproef.css', 'utf8');
const UIT = 'kladblok/nacht';
fs.mkdirSync(UIT, { recursive: true });

const PAGINAS = [
  ['thuis', '/nl/'],
  ['catalog', '/nl/catalog/'],
  ['prijzen', '/nl/pricing/'],
  ['bestellen', '/nl/start/'],
  ['faq', '/nl/faq/'],
  ['perproduct', '/nl/per-product/'],
];

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await b.newContext({ viewport: { width: 1440, height: 1200 }, deviceScaleFactor: 1 });

for (const [naam, pad] of PAGINAS) {
  for (const stand of ['dag', 'nacht']) {
    const p = await ctx.newPage();
    await p.goto('http://127.0.0.1:4399' + pad, { waitUntil: 'load' });
    if (stand === 'nacht') {
      await p.addStyleTag({ content: CSS });
      await p.evaluate(() => document.documentElement.setAttribute('data-nacht', ''));
    }
    await p.evaluate(() => document.fonts.ready);
    /* De onthullingen lopen op `animation-timeline: view()`. Zonder een keer
       langs de hele pagina te scrollen staan ze halverwege, en dan beoordeel je
       een animatie in plaats van een kleur. */
    await p.evaluate(async () => {
      const h = document.body.scrollHeight;
      for (let y = 0; y < h; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); }
      window.scrollTo(0, 0);
    });
    await p.waitForTimeout(900);
    await p.screenshot({ path: `${UIT}/${naam}-${stand}.png`, fullPage: false });
    await p.evaluate(() => window.scrollTo(0, Math.round(document.body.scrollHeight * 0.42)));
    await p.waitForTimeout(700);
    await p.screenshot({ path: `${UIT}/${naam}-${stand}-midden.png`, fullPage: false });
    await p.close();
  }
  console.log(naam, 'klaar');
}
await ctx.close(); await b.close();
