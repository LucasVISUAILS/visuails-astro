/**
 * VISUAILS — de knoppen voor /admin en de privélink (knoppensysteem, lijst 88 + 89, 9 november 2026).
 *
 * src/styles/knoppen.css is de enige bron. /admin (public/admin.css) en de privélink (public/portal.css) gaan
 * niet door Vite; zij laden public/knoppen.css. Dit script schrijft die kopie, letterlijk.
 * tests/knoppen-systeem.test.mjs gaat na dat de twee gelijk zijn.
 *
 *   node scripts/knoppen-kopie.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WORTEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bron = fs.readFileSync(path.join(WORTEL, 'src/styles/knoppen.css'), 'utf8');
fs.writeFileSync(path.join(WORTEL, 'public/knoppen.css'), bron);
console.log('public/knoppen.css bijgewerkt (' + bron.length + ' tekens)');
