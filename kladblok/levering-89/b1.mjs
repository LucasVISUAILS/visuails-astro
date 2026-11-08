// Levering 89 · het veld B1 Horizon achter de laptop, als vast beeld (liggend 1920 × 1080 en staand 1080 × 1920).
// Dezelfde tekening als op de site (src/scripts/veld.js, zaad 0,37, t 12000, zonder korrel: de korrel legt
// opening-80.css erover). Daarna loopt het onderste deel naar blauw uur #25508B: vanaf 70 % van de hoogte tot 80 % erheen
// (zodat de naam van de stand onder de laptop wit op 4,5 : 1 haalt), en de onderste 12 % helemaal (zodat het podium zonder
// rand overgaat in de uitloop van 88c).
//   node kladblok/levering-89/b1.mjs [uitmap]      (standaard public/img/hal)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { browserPad } from '../../scripts/lib/browserpad.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const UIT = process.argv[2] ? path.resolve(process.argv[2]) : path.join(ROOT, 'public/img/hal');
const VELD = fs.readFileSync(path.join(ROOT, 'src/scripts/veld.js'), 'utf8');
const BLAUW = [0x25, 0x50, 0x8B];
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

const browser = await chromium.launch({ executablePath: browserPad(), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1920 } });
await page.setContent('<!doctype html><meta charset="utf-8"><style>html,body{margin:0}canvas{display:block}</style><canvas id="c"></canvas>');
await page.addScriptTag({ type: 'module', content: `${VELD}\nwindow.maak = (b, h) => { const c = document.getElementById('c'); const n = c.cloneNode(); c.replaceWith(n); n.id = 'c'; n.style.width = b + 'px'; n.style.height = h + 'px'; const v = maakVeld(n, 'b1', { korrel: 0, bewaar: true, zaad: 0.37, b, h }); v.teken(12000); const u = n.toDataURL('image/png'); v.weg(); return u; }; window.klaar = true;` });
await page.waitForFunction(() => window.klaar);
for (const [naam, b, h] of [['veld-b1', 1920, 1080], ['veld-b1-staand', 1080, 1920]]) {
  const u = await page.evaluate(([b, h]) => window.maak(b, h), [b, h]);
  const { data, info } = await sharp(Buffer.from(u.split(',')[1], 'base64')).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let y = 0; y < info.height; y++) {
    const f = y / (info.height - 1), w = Math.max(ss(0.70, 0.86, f) * 0.8, ss(0.88, 1, f));
    for (let x = 0; x < info.width; x++) { const i = (y * info.width + x) * 3; for (let k = 0; k < 3; k++) data[i + k] = Math.round(data[i + k] * (1 - w) + BLAUW[k] * w); }
  }
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 3 } }).webp({ quality: 90, effort: 6 }).toFile(path.join(UIT, `${naam}.webp`));
  console.log(`${naam}.webp`, info.width, '×', info.height);
}
await browser.close();
