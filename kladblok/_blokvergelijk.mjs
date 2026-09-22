/* VISUAILS — welke blokken lijken op elkaar en zijn het net niet?
 *
 * Lucas: *"Ook zijn niet alle FAQ blokken consistent met elkaar. Controleer
 * welke andere blokken ook niet consistent op elkaar lijken."*
 *
 * Wat "consistent" meetbaar maakt: blokken met DEZELFDE klasse horen dezelfde
 * binnenruimte, rand, ronding, grond en lettergrootte te hebben. Waar dat per
 * exemplaar verschilt, is er ergens een uitzondering gemaakt die niemand meer
 * kent. Dit script groepeert elk zichtbaar blok op zijn klasse en meldt alleen
 * de klassen waarbinnen de maten UIT ELKAAR lopen.
 *
 *   node kladblok/_blokvergelijk.mjs /nl/faq /nl/pricing …
 */
import { chromium } from 'playwright';

const PADEN = process.argv.length > 2 ? process.argv.slice(2) : ['/nl/faq/'];
const BASIS = process.env.BASIS || 'http://127.0.0.1:4399';

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

let totaal = 0;
for (const pad of PADEN) {
  await page.goto(BASIS + pad, { waitUntil: 'load' }).catch(() => null);
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => { document.querySelectorAll('.cc, [class*="cookie"]').forEach((e) => e.remove()); });
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } window.scrollTo(0, 0); });
  await page.waitForTimeout(800);

  const groepen = await page.evaluate(() => {
    const op = {};
    for (const el of document.querySelectorAll('main [class]')) {
      const r = el.getBoundingClientRect();
      if (r.width < 40 || r.height < 20) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none') continue;
      const klas = (el.className || '').toString().trim().split(/\s+/).filter((c) => !/^(reveal|pending|is-|has-)/.test(c)).sort().join('.');
      if (!klas || klas.split('.').length > 3) continue;
      const vorm = [
        cs.paddingTop + ' ' + cs.paddingRight + ' ' + cs.paddingBottom + ' ' + cs.paddingLeft,
        cs.borderTopWidth + '/' + cs.borderBottomWidth + ' ' + cs.borderTopColor,
        cs.borderRadius.split(' ')[0],
        cs.backgroundColor,
        cs.fontSize,
      ].join(' | ');
      (op[klas] ||= {})[vorm] = ((op[klas] || {})[vorm] || 0) + 1;
    }
    return op;
  });

  const scheef = Object.entries(groepen).filter(([, v]) => Object.keys(v).length > 1);
  if (!scheef.length) continue;
  console.log('\n══ ' + pad + ' ' + '═'.repeat(Math.max(0, 54 - pad.length)));
  for (const [klas, vormen] of scheef) {
    const rijen = Object.entries(vormen).sort((a, b) => b[1] - a[1]);
    /* Eén afwijker tussen tien gelijke is interessant; twee groepen van
       gelijke grootte zijn meestal twee soorten met dezelfde klasse. */
    console.log(' .' + klas);
    for (const [vorm, n] of rijen) console.log('    ×' + String(n).padEnd(3) + vorm);
    totaal += 1;
  }
}
console.log('\n' + totaal + ' klasse(n) met uiteenlopende maten over ' + PADEN.length + ' pagina(\'s)');
await browser.close();
