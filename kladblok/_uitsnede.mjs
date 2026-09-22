/* Eén uitsnede uit een renderafbeelding, om een detail te kunnen bekijken. */
import { PNG } from 'pngjs';
import { readFileSync, writeFileSync } from 'node:fs';
const [bron, doel, x, y, w, h] = process.argv.slice(2);
const png = PNG.sync.read(readFileSync(bron));
const uit = new PNG({ width: +w, height: +h });
PNG.bitblt(png, uit, +x, +y, +w, +h, 0, 0);
writeFileSync(doel, PNG.sync.write(uit));
console.log('ok', doel);
