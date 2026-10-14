/**
 * NA-UPDATE-INSTALLEREN.bat → scripts/na-update-installeren.mjs (8 oktober 2026,
 * punt o17: Astro 6.4.8 → 7.3.7). Lucas dubbelklikt het één keer na een update
 * van de afhankelijkheden: Node-check, `npm ci`, één keer bouwen.
 *
 * Wat hier getest wordt, is wat zonder netwerk en zonder Windows kan: de
 * versievergelijking, de Node-eis uit het lock-bestand, en de regels voor .bat-
 * bestanden uit de werkafspraken (CRLF, `cd /d "%~dp0"`, geen paden binnen een
 * `( … )`-blok, alleen ASCII zodat cmd.exe geen codepagina-rommel toont).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { versieMinstens, nodeEisUitLock } from '../scripts/na-update-installeren.mjs';

let goed = 0, totaal = 0;
function ok(naam, kreeg, wil = true) {
  totaal++;
  const g = JSON.stringify(kreeg) === JSON.stringify(wil);
  if (g) goed++;
  console.log(`${g ? ' ok  ' : ' FAIL'} ${naam}${g ? '' : `  verwacht ${JSON.stringify(wil)} kreeg ${JSON.stringify(kreeg)}`}`);
}

const wortel = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

/* ── de versievergelijking ── */
ok('22.12.0 is genoeg voor 22.12.0', versieMinstens('22.12.0', '22.12.0'));
ok('v22.22.0 is genoeg', versieMinstens('v22.22.0', '22.12.0'));
ok('24.1.0 is genoeg', versieMinstens('24.1.0', '22.12.0'));
ok('22.11.9 is te oud', versieMinstens('22.11.9', '22.12.0'), false);
ok('20.19.0 is te oud', versieMinstens('20.19.0', '22.12.0'), false);
ok('22.2.0 is te oud (geen tekstvergelijking)', versieMinstens('22.2.0', '22.12.0'), false);

/* ── de eis uit het lock-bestand ── */
ok('eis uit een lock', nodeEisUitLock(JSON.stringify({ packages: { 'node_modules/astro': { engines: { node: '>=22.12.0' } } } })), '22.12.0');
ok('geen eis → terugval', nodeEisUitLock('{}'), '22.12.0');
ok('kapot bestand → terugval', nodeEisUitLock('{niet'), '22.12.0');
const echteEis = nodeEisUitLock(fs.readFileSync(path.join(wortel, 'package-lock.json'), 'utf8'));
ok('het echte lock-bestand noemt een Node-eis voor astro', /^\d+\.\d+\.\d+$/.test(echteEis));
ok('de Node van deze testomgeving voldoet eraan', versieMinstens(process.versions.node, echteEis));

/* ── het .bat-bestand ── */
const bat = fs.readFileSync(path.join(wortel, 'NA-UPDATE-INSTALLEREN.bat'), 'utf8');
const regels = bat.split('\n');
ok('CRLF op elke regel', regels.slice(0, -1).every((r) => r.endsWith('\r')));
ok('alleen ASCII', /^[\x00-\x7F]*$/.test(bat));
ok('cd /d "%~dp0" vooraan', /^@echo off\r\nsetlocal\r\ncd \/d "%~dp0"\r\n/.test(bat));
ok('roept het script aan', /^node scripts\\na-update-installeren\.mjs\r$/m.test(bat));
let binnen = 0, padInBlok = false;
for (const r of regels) {
  const t = r.trim();
  if (binnen && /\\|%~dp0|\.(mjs|js|json|bat|txt)\b/i.test(t) && !/^echo /i.test(t)) padInBlok = true; // `exit /b` is geen pad
  if (binnen && /^echo /i.test(t) && /[()]/.test(t)) padInBlok = true; // een ) in echo sluit het blok
  if (t.endsWith('(')) binnen++;
  if (t === ')') binnen--;
}
ok('geen paden of haakjes binnen een ( … )-blok', padInBlok, false);
ok('blokken zijn dicht', binnen, 0);

console.log(`\n${goed}/${totaal} geslaagd`);
if (goed !== totaal) process.exit(1);
