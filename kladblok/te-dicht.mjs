/* WAT STAAT ER TE DICHT OP ELKAAR — 8 september 2026
   ═══════════════════════════════════════════════════════════════════════════
   Lucas: *"er zijn af en toe teksten die te dicht op knoppen, andere teksten,
   of foto's staan"* en *"Er zijn ook teksten die niet altijd op dezelfde hoogte
   staan waardoor het af en toe rommelig eruit kan zien."*

   Dat zijn twee klachten en allebei zijn ze meetbaar. tests/a11y.test.mjs vangt
   al de harde variant — tekst die OVER tekst valt. Wat ontbrak is de zachte:
   twee blokken die elkaar niet raken maar zo dicht op elkaar staan dat ze als
   één blok lezen, en rijen waarvan de cellen niet op één lijn beginnen.

   WAT HIJ MEET, en waarom deze grenzen:

   · AFSTAND. Tussen twee zichtbare buren die allebei iets dragen (tekst, een
     knop, een beeld) hoort minstens 8px te zitten. Onder de 8 lezen ze als één
     ding; onder de 4 lijkt het een fout. Alleen ECHTE buren: geen ouder tegen
     kind, en geen twee dingen in verschillende kolommen.
   · UITLIJNING. Cellen van dezelfde rij (dezelfde ouder, naast elkaar) horen
     op dezelfde bovenlijn te beginnen. Verschilt die meer dan 2px, dan is het
     een rommelige rij en geen bedoeld verspringen.

   node kladblok/te-dicht.mjs                 → de hele site, beide breedtes
   node kladblok/te-dicht.mjs /nl/catalog     → één pagina */
import { chromium } from 'playwright';
import { browserPad } from '../scripts/lib/browserpad.mjs';
/* De meter zelf staat in kladblok/lib/dichtmeter.mjs, zodat Studio en /admin
   hem kunnen delen. Zie de noot daar. */
import { meetDicht } from './lib/dichtmeter.mjs';

const BASIS = process.env.BASIS || 'http://localhost:4331';
const PADEN = process.argv.length > 2 ? process.argv.slice(2) : [
  '/nl/', '/nl/catalog', '/nl/lifestyle', '/nl/video', '/nl/pricing', '/nl/plans',
  '/nl/models', '/nl/custom-models', '/nl/start', '/nl/test-sample', '/nl/faq',
  '/nl/contact', '/nl/how-it-works', '/nl/studio', '/nl/gallery', '/nl/about',
];

const browser = await chromium.launch({ executablePath: browserPad() });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto(`${BASIS}/`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
for (const t of ['Alleen het noodzakelijke', 'Only what is necessary']) {
  const k = page.getByRole('button', { name: new RegExp(t, 'i') });
  if (await k.count()) { await k.first().click().catch(() => {}); await page.waitForTimeout(400); break; }
}

let totaal = 0;
for (const pad of PADEN) {
  for (const [maat, w, h] of [['breed', 1440, 900], ['telefoon', 390, 844]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto(BASIS + pad, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => null);
    await page.waitForTimeout(1400);
    /* Helemaal naar beneden en terug: alles wat pas bij het scrollen verschijnt,
       staat dan op zijn plek in plaats van op zijn beginstand. */
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(900);

    const uit = await page.evaluate(meetDicht);

    const n = uit.dicht.length + uit.scheef.length;
    totaal += n;
    if (n) {
      console.log(`\n${pad}  (${maat})`);
      for (const r of uit.dicht.slice(0, 8)) console.log(`   te dicht : ${r}`);
      for (const r of uit.scheef.slice(0, 6)) console.log(`   scheef   : ${r}`);
      if (uit.dicht.length > 8) console.log(`   … en nog ${uit.dicht.length - 8} te dicht`);
      if (uit.scheef.length > 6) console.log(`   … en nog ${uit.scheef.length - 6} scheef`);
    }
  }
}
console.log(`\n${PADEN.length} pagina's × 2 breedtes · ${totaal} plek(ken) gevonden`);
await browser.close();
