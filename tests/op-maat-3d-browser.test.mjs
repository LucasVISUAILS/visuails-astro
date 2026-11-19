/**
 * DE STAND IN 3D, IN DE INTAKE VAN CATALOG OP MAAT — 15 november 2026, lijst 113.
 *
 *   npm run test:opmaat3d-browser
 *
 * Door de echte Worker (tests/lib/studio-worker.mjs), als ingelogde klant VOLT, met WebGL (SwiftShader):
 *   1 · alleen de groepen van zijn producten, met de standaard als eerste hoek;
 *   2 · per product een beeld van stippen; three.js komt van onszelf (/js/), niets van buiten;
 *   3 · de standaard kost niets; een andere stand voor de groep wel, één keer (de schatting van de server);
 *   4 · één product anders laten staan in het venster: opgeslagen in zijn rij, een tweede stand in de schatting;
 *       "Zelfde als de groep" haalt hem weer weg;
 *   5 · zonder WebGL werkt de stand per groep nog, met een zin erbij;
 *   6 · de vorm op 1280 en 390: geen horizontale scroll, tekst minstens 11,5 px, het beeld donker als de site.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { metVisIn } from './lib/vis-in.mjs';
import { startStudio, VOLT } from './lib/studio-worker.mjs';
import { browserPad } from '../scripts/lib/browserpad.mjs';
import { schatting } from '../src/data/opMaatPrijs.js';
import { normaliseerInhoud } from '../src/lib/opMaat.js';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const OUT = path.join(ROOT, '.render');
fs.mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
function ok(naam, kreeg, wil = true) {
  const g = JSON.stringify(kreeg) === JSON.stringify(wil);
  if (g) pass++; else fail++;
  console.log(`${g ? ' ok  ' : ' FAIL'} ${naam}${g ? '' : `\n        verwacht ${JSON.stringify(wil)}, kreeg ${JSON.stringify(kreeg)}`}`);
}

const studio = await startStudio();
const host = new URL(studio.url).hostname;
const metGL = metVisIn(await chromium.launch({ executablePath: process.env.CHROME || browserPad(), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }));
const zonderGL = metVisIn(await chromium.launch({ executablePath: process.env.CHROME || browserPad(), args: ['--disable-gpu', '--disable-software-rasterizer', '--disable-webgl'] }));
const nieuw = async (b, breed) => {
  const ctx = await b.newContext({ viewport: { width: breed, height: breed < 600 ? 844 : 900 }, reducedMotion: 'reduce' });
  await ctx.addCookies([{ name: 'vis_account', value: VOLT.token, domain: host, path: '/' }, { name: 'vis_lang', value: 'nl', domain: host, path: '/' }]);
  const p = await ctx.newPage();
  p.buiten = [];
  await p.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, (r) => { p.buiten.push(r.request().url()); r.abort(); });
  p.fouten = [];
  p.on('pageerror', (e) => p.fouten.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/Transition was aborted/.test(m.text())) p.fouten.push(m.text()); });
  return p;
};
const wachtOpslag = (p) => p.waitForFunction(() => /Opgeslagen/.test(document.getElementById('om-stand')?.textContent || ''), null, { timeout: 15000 });
const opslaan = async (p) => { await p.waitForTimeout(700); await wachtOpslag(p); };
const regels = (p) => p.evaluate(() => [...document.querySelectorAll('#om-regels p')].map((r) => [r.children[0].textContent, r.children[1].textContent]));
const pose = async (p) => ((await regels(p)).find((r) => /eigen stand/i.test(r[0])) || [null, null])[1];
const zichtbareGroepen = (p) => p.evaluate(() => [...document.querySelectorAll('#om-standen [data-groep]')].filter((g) => !g.hidden).map((g) => g.dataset.groep));
const beeldenKlaar = (p) => p.waitForFunction(() => { const i = [...document.querySelectorAll('#om-standen .om-3d-beeld img')]; return i.length > 0 && i.every((x) => x.src.startsWith('data:image/jpeg') && x.complete); }, null, { timeout: 60000 });

try {
  console.log('\n1 · de groepen van zijn producten');
  const p = await nieuw(metGL, 1280);
  await p.goto(`${studio.url}/account/op-maat?dienst=catalog`, { waitUntil: 'load' });
  /* levering 119 (18 november 2026, P12-09): alleen kijken maakt geen aanvraag meer, dus bij het openen is er geen "Opgeslagen";
     hier stond wachtOpslag(). Nu wachten tot de 3D-module de groepen zet; de eerste wijziging (een rij erbij, hieronder) maakt
     de aanvraag, en daarna wacht opslaan() wel op de opslag. */
  await p.waitForFunction(() => [...document.querySelectorAll('#om-standen [data-groep]')].some((g) => !g.hidden), null, { timeout: 15000 });
  ok('alleen kijken: nog geen aanvraag, de link blijft ?dienst=catalog (P12-09)', /\/account\/op-maat\?dienst=catalog$/.test(p.url()), true);
  ok('met één T-shirt staat alleen Top er', await zichtbareGroepen(p), ['top']);
  ok('de eerste hoek is de standaard, en staat aan', await p.evaluate(() => { const r = document.querySelector('[data-groep="top"] input:checked'); return [r.value, !!r.closest('.om-pil').querySelector('.om-std')]; }), ['voorkant', true]);
  await p.click('[data-rij-erbij="soorten"]');
  await p.selectOption('[data-rij="soorten"] [data-rij-item]:nth-child(2) [data-veld="soort"]', 'schoen');
  await p.click('[data-rij-erbij="soorten"]');
  await p.selectOption('[data-rij="soorten"] [data-rij-item]:nth-child(3) [data-veld="soort"]', 'hoodie');
  await opslaan(p);
  ok('na de eerste wijziging is er een aanvraag: de link wordt ?id= (P12-09)', /\/account\/op-maat\?id=\d+$/.test(p.url()), true);
  ok('een schoen erbij: Top en Shoes, in de volgorde headwear … shoes', await zichtbareGroepen(p), ['top', 'shoes']);
  ok('bij Top de namen van zijn producten', await p.textContent('[data-groep="top"] [data-groep-namen]'), 'T-shirt · Hoodie');

  console.log('\n2 · een beeld van stippen per product, three.js van onszelf');
  await beeldenKlaar(p);
  ok('drie beelden: T-shirt, hoodie en schoen', await p.locator('#om-standen .om-3d-beeld img').count(), 3);
  ok('niets van buiten geladen', p.buiten, []);
  ok('three.js komt uit /js/', await p.evaluate(() => performance.getEntriesByType('resource').some((r) => /\/js\/three\.module\.min\.js$/.test(r.name))), true);
  /* het beeld is het zwart van de site met witte stippen: het midden is lichter dan de rand */
  const licht = await p.evaluate(async () => {
    const img = document.querySelector('[data-groep="top"] .om-3d-beeld img');
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const gem = (sx, sy, w, h) => { const d = x.getImageData(sx, sy, w, h).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2]; return s / (d.length / 4) / 3; };
    return { midden: gem(c.width * 0.35, c.height * 0.3, c.width * 0.3, c.height * 0.4), hoek: gem(0, 0, 20, 20) };
  });
  ok('het model is te zien: het midden lichter dan de hoek', licht.midden > licht.hoek + 8, true);
  ok('de hoek is het zwart van de site', licht.hoek < 30, true);

  console.log('\n3 · de standaard kost niets, een andere stand per groep één keer');
  ok('alles standaard: geen regel voor de stand', await pose(p), null);
  await p.click('[data-groep="top"] input[value="zijkant"]', { force: true });
  await opslaan(p);
  const inh1 = { soorten: [{ soort: 'tshirt', aantal: 1 }, { soort: 'schoen', aantal: 1 }, { soort: 'hoodie', aantal: 1 }], standen: { top: { hoek: 'zijkant' } } };
  const want1 = schatting('catalog', normaliseerInhoud('catalog', inh1)).regels.find((r) => r.id === 'c-pose');
  ok('Top op de zijkant: één stand, twee producten (70 + 2 × 10), van de server', await pose(p), `€${want1.bedrag}`);
  ok('  en dat is € 90', want1.bedrag, 90);
  ok('de tegels zeggen wat het per product kost', await p.textContent('[data-groep="top"] .om-3d-tegel small'), 'Stand van de groep · + €10 per product per bestelling');
  ok('de schoen staat nog op de standaard', await p.textContent('[data-groep="shoes"] .om-3d-tegel small'), 'Standaard · kosteloos');
  await p.click('[data-groep="top"] input[value="wij"]', { force: true });
  await opslaan(p);
  ok('"Wij kiezen" kost niets', await pose(p), null);
  await p.click('[data-groep="top"] input[value="zijkant"]', { force: true });
  await opslaan(p);

  console.log('\n4 · één product anders laten staan');
  await p.click('[data-groep="top"] .om-3d-tegel:nth-child(2) .om-tekstknop');
  await p.waitForSelector('#om-3d[open]');
  ok('het venster heet naar het product', await p.textContent('#om-3d-titel'), 'Hoodie');
  ok('de hoeken van zijn groep, de huidige staat aan', await p.evaluate(() => [...document.querySelectorAll('#om-3d-hoeken button')].map((b) => b.textContent + (b.getAttribute('aria-pressed') === 'true' ? '*' : ''))), ['Voorkant', 'Drie kwart', 'Zijkant*']);
  await p.focus('#om-3d-scene');
  for (let i = 0; i < 4; i++) await p.keyboard.press('ArrowLeft');
  ok('alleen een voorkant: verder dan de zijkant draait hij niet', await p.waitForFunction(() => /draai -100°/.test(document.getElementById('om-3d-stand').textContent), null, { timeout: 5000 }).then(() => true, () => false), true);
  for (let i = 0; i < 3; i++) await p.keyboard.press('ArrowRight');
  await p.keyboard.press('ArrowDown');
  ok('met de pijltjes draait hij: de stand staat eronder', await p.waitForFunction(() => /draai -55°.*kantel 10°/.test(document.getElementById('om-3d-stand').textContent), null, { timeout: 5000 }).then(() => true, async () => p.textContent('#om-3d-stand')), true);
  await p.fill('#om-3d-notitie', 'Iets schuiner, met de capuchon zichtbaar');
  await p.click('#om-3d-gebruik');
  await opslaan(p);
  ok('het venster is dicht', await p.evaluate(() => document.getElementById('om-3d').open), false);
  ok('de hoodie heeft een eigen stand, in zijn rij', await p.evaluate(() => { const r = document.querySelectorAll('[data-rij="soorten"] [data-rij-item]')[2]; return ['yaw', 'pitch', 'tekst'].map((k) => r.querySelector(`[data-veld="voorkant.${k}"]`).value); }), ['-55', '10', 'Iets schuiner, met de capuchon zichtbaar']);
  ok('de tegel zegt het', await p.textContent('[data-groep="top"] .om-3d-tegel:nth-child(2) .om-3d-eigen'), 'Eigen stand');
  const inh2 = { ...inh1, soorten: [inh1.soorten[0], inh1.soorten[1], { soort: 'hoodie', aantal: 1, voorkant: { yaw: -55, pitch: 10 } }] };
  const want2 = schatting('catalog', normaliseerInhoud('catalog', inh2)).regels.find((r) => r.id === 'c-pose');
  ok('twee standen nu (2 × 70 + 2 × 10), van de server', await pose(p), `€${want2.bedrag}`);
  ok('  en dat is € 160', want2.bedrag, 160);
  /* na herladen staat alles er nog */
  await p.reload({ waitUntil: 'load' }); await beeldenKlaar(p);
  ok('na herladen: de eigen stand en de groep staan er nog', await p.evaluate(() => [document.querySelector('[data-groep="top"] input:checked').value, !!document.querySelector('[data-groep="top"] .om-3d-tegel:nth-child(2) .om-3d-eigen')]), ['zijkant', true]);
  await p.click('[data-groep="top"] .om-3d-tegel:nth-child(2) .om-tekstknop');
  await p.waitForSelector('#om-3d[open]');
  ok('het venster opent met zijn eigen notitie', await p.inputValue('#om-3d-notitie'), 'Iets schuiner, met de capuchon zichtbaar');
  await p.click('#om-3d-groep-terug');
  await opslaan(p);
  ok('"Zelfde als de groep": weer één stand', await pose(p), `€${want1.bedrag}`);

  console.log('\n4b · flat lay of ghost mannequin (Lucas, 15 november 17:15)');
  ok('ghost mannequin staat aan als standaard', await p.evaluate(() => document.querySelector('input[name="standLook"]:checked').value), 'ghost');
  await p.click('[data-groep="top"] .om-3d-tegel:nth-child(2) .om-tekstknop'); await p.waitForSelector('#om-3d[open]');
  await p.click('#om-3d-hoeken button:nth-child(2)'); await p.click('#om-3d-gebruik'); await opslaan(p);
  await p.click('input[name="standLook"][value="flatlay"]', { force: true });
  await opslaan(p); await beeldenKlaar(p);
  ok('flat lay: de hoeken van boven, de eerste is de standaard', await p.evaluate(() => [...document.querySelectorAll('[data-groep="top"] [data-look="flatlay"] .om-pil span')].map((s) => s.firstChild.textContent)), ['Recht van boven', 'Iets schuin', 'Diagonaal', 'Schuin van boven', 'Wij kiezen']);
  ok('  de rij van ghost mannequin is weg', await p.evaluate(() => document.querySelector('[data-groep="top"] [data-look="ghost"]').hidden), true);
  ok('  de eigen stand van de hoodie past niet meer en is weg, met een zin', await p.evaluate(() => [!!document.querySelector('.om-3d-eigen'), document.querySelector('[data-look-melding]').textContent]), [false, 'Je eigen stand past niet bij deze look en is weggehaald.']);
  ok('  alles in de standaard: geen regel voor de stand', await pose(p), null);
  const plat = await p.evaluate(async () => {
    const img = document.querySelector('[data-groep="top"] .om-3d-beeld img');
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 240) n++;
    return n / (d.length / 4);
  });
  ok('  het T-shirt ligt plat en is van boven groot te zien', plat > 0.02, true);
  await p.click('[data-groep="top"] [data-look="flatlay"] input[value="diagonaal"]', { force: true }); await opslaan(p);
  const want3 = schatting('catalog', normaliseerInhoud('catalog', { ...inh1, standLook: 'flatlay', standen: { top: { hoek: 'diagonaal' } } })).regels.find((r) => r.id === 'c-pose');
  ok('  diagonaal kost een stand, van de server', [await pose(p), want3.bedrag], ['€90', 90]);
  await p.locator('#om-standen').screenshot({ path: path.join(OUT, 'op-maat-3d-flatlay-1280.png') });
  await p.click('input[name="standLook"][value="ghost"]', { force: true }); await opslaan(p);
  await p.click('[data-groep="top"] [data-look="ghost"] input[value="zijkant"]', { force: true }); await opslaan(p); await beeldenKlaar(p);
  ok('terug naar ghost mannequin: de hoeken van ghost tellen weer', await pose(p), `€${want1.bedrag}`);
  ok('geen fouten in de console', p.fouten, []);

  console.log('\n6 · de vorm');
  const vorm = (q) => q.evaluate(() => {
    const klein = [...document.querySelectorAll('#om-standen *')].filter((e) => e.offsetParent && [...e.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 11.5).map((e) => e.className.toString() || e.tagName);
    return { klein: [...new Set(klein)], breed: document.documentElement.scrollWidth > innerWidth + 1 };
  });
  ok('1280: geen tekst kleiner dan 11,5 px, geen horizontale scroll', await vorm(p), { klein: [], breed: false });
  await p.locator('#om-standen').screenshot({ path: path.join(OUT, 'op-maat-3d-1280.png') });
  await p.click('[data-groep="top"] .om-3d-tegel:nth-child(1) .om-tekstknop'); await p.waitForSelector('#om-3d[open]'); await p.waitForTimeout(400);
  await p.screenshot({ path: path.join(OUT, 'op-maat-3d-venster-1280.png') });
  await p.keyboard.press('Escape');
  const t = await nieuw(metGL, 390);
  await t.goto(p.url(), { waitUntil: 'load' }); await beeldenKlaar(t);
  ok('390: geen tekst kleiner dan 11,5 px, geen horizontale scroll', await vorm(t), { klein: [], breed: false });
  ok('390: twee beelden naast elkaar', await t.evaluate(() => { const b = [...document.querySelectorAll('[data-groep="top"] .om-3d-tegel')].map((x) => x.getBoundingClientRect().top); return Math.abs(b[0] - b[1]) < 2; }), true);
  await t.locator('#om-standen').screenshot({ path: path.join(OUT, 'op-maat-3d-390.png') });
  await t.click('[data-groep="top"] .om-3d-tegel:nth-child(1) .om-tekstknop'); await t.waitForSelector('#om-3d[open]'); await t.waitForTimeout(400);
  ok('390: het venster past', await t.evaluate(() => { const r = document.getElementById('om-3d').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; }), true);
  await t.screenshot({ path: path.join(OUT, 'op-maat-3d-venster-390.png') });

  console.log('\n5 · zonder WebGL');
  const z = await nieuw(zonderGL, 1280);
  await z.goto(p.url(), { waitUntil: 'load' });
  await z.waitForFunction(() => !document.querySelector('#om-standen [data-geen-3d]').hidden, null, { timeout: 15000 }).catch(() => {});
  ok('een zin dat 3D hier niet kan', await z.evaluate(() => !document.querySelector('#om-standen [data-geen-3d]').hidden), true);
  ok('de groepen en de hoeken staan er wel', await zichtbareGroepen(z), ['top', 'shoes']);
  ok('geen knop naar een venster dat niet kan', await z.locator('#om-standen .om-tekstknop').count(), 0);
  ok('geen fouten in de console', z.fouten, []);
} finally {
  await metGL.close(); await zonderGL.close(); await studio.dispose();
}
console.log(`\n${pass} goed, ${fail} fout`);
process.exit(fail ? 1 : 0);
