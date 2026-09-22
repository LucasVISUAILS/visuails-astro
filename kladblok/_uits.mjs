/* Snij een strook uit een plaat — pngjs bitblt, met hoogtecheck. */
import { PNG } from 'pngjs';
import fs from 'node:fs';
const [, , bron, doel, yS, hS, sS] = process.argv;
const p = PNG.sync.read(fs.readFileSync(bron));
const s = Number(sS || 2);
let y = Math.round(Number(yS) * s), h = Math.round(Number(hS) * s);
if (y >= p.height) { console.log('y buiten beeld', p.height / s); process.exit(0); }
if (y + h > p.height) h = p.height - y;
const uit = new PNG({ width: p.width, height: h });
PNG.bitblt(p, uit, 0, y, p.width, h, 0, 0);
fs.writeFileSync(doel, PNG.sync.write(uit));
console.log(doel, p.width / s + '×' + h / s);
