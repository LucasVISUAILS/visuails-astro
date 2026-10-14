/* ── DE BACK-UP NAAR GOOGLE DRIVE: DE MAP KIEZEN — 8 oktober 2026 (punt 9.04) ──
 *
 * Lucas koos (V6 = c): de back-up komt in Google Drive. Google Drive voor
 * desktop zet "Mijn Drive" op de pc als een gewone map, meestal G:\Mijn Drive
 * (of G:\My Drive). Dit script zoekt die map, stelt een submap
 * "VISUAILS back-ups" voor, maakt hem aan, controleert of er geschreven kan
 * worden, en zet het pad op één regel in backups\BESTEMMING.txt. Daar leest
 * scripts/backup.mjs het elke week. Het pad staat zo niet in de code en niet in
 * git (backups\ wordt genegeerd).
 *
 * Lucas start dit via BACKUP.bat, keuze 1. Hij hoeft alleen op Enter te drukken,
 * of een andere map te plakken.
 *
 *   node scripts/backup-instellen.mjs               → vragen
 *   node scripts/backup-instellen.mjs --map <pad>   → zonder vragen (voor de test)
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { leesBestemmingBestand } from './lib/backupdelen.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BESTAND = path.join(ROOT, 'backups', 'BESTEMMING.txt');
export const SUBMAP = 'VISUAILS back-ups';

/** Waar Google Drive voor desktop "Mijn Drive" gewoonlijk neerzet. */
export function driveKandidaten({ platform = process.platform, home = os.homedir(), bestaat = fs.existsSync } = {}) {
  const uit = [];
  if (platform === 'win32') {
    for (const letter of 'GHIJKLMNOPQRSTUVWXYZDEF') {
      for (const naam of ['Mijn Drive', 'My Drive']) uit.push(`${letter}:\\${naam}`);
    }
  }
  for (const naam of [['Google Drive', 'Mijn Drive'], ['Google Drive', 'My Drive'], ['Google Drive'], ['Mijn Drive'], ['My Drive']]) {
    uit.push(path.join(home, ...naam));
  }
  return uit.filter((p) => { try { return bestaat(p); } catch { return false; } });
}

/** Een geplakt pad schoonmaken: aanhalingstekens eromheen, onzichtbare tekens (cmd.exe), spaties. */
export function schoonPad(invoer) {
  return String(invoer || '').replace(/[\x00-\x1F\x7F]/g, '').trim().replace(/^"(.*)"$/, '$1').trim();
}

/** De map aanmaken en controleren dat er echt geschreven kan worden. */
export function zetBestemming(map, bestand = BESTAND) {
  fs.mkdirSync(map, { recursive: true });
  const proef = path.join(map, `.schrijfproef-${process.pid}`);
  fs.writeFileSync(proef, 'ok');
  fs.rmSync(proef, { force: true });
  fs.mkdirSync(path.dirname(bestand), { recursive: true });
  fs.writeFileSync(bestand, [
    '# Waar scripts/backup.mjs de wekelijkse back-up neerzet. Gezet door BACKUP.bat (keuze 1).',
    '# Een andere map? Draai BACKUP.bat opnieuw en kies 1.',
    map,
    '',
  ].join('\r\n'));
  return map;
}

async function main() {
  const args = process.argv.slice(2);
  console.log('VISUAILS · waar komt de back-up?\n');
  const i = args.indexOf('--map');
  if (i !== -1 && args[i + 1]) {
    const map = zetBestemming(schoonPad(args[i + 1]));
    console.log(`  ✔ ingesteld: ${map}`);
    return;
  }

  const nu = leesBestemmingBestand(BESTAND);
  if (nu) console.log(`  Nu ingesteld: ${nu}\n`);
  const gevonden = driveKandidaten();
  const voorstel = nu || (gevonden[0] ? path.join(gevonden[0], SUBMAP) : null);
  if (gevonden.length) {
    console.log(`  Google Drive gevonden op: ${gevonden[0]}`);
  } else {
    console.log('  Ik vind Google Drive niet op deze pc. Staat Google Drive voor desktop aan?');
    console.log('  (Rechtsonder in de taakbalk het Drive-icoon; "Mijn Drive" staat dan in de Verkenner.)');
  }
  console.log('');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const vraag = voorstel
    ? `  Druk op Enter voor:  ${voorstel}\n  of plak een andere map en druk op Enter: `
    : '  Plak de map waar de back-up moet komen en druk op Enter: ';
  const antwoord = schoonPad(await rl.question(vraag));
  rl.close();
  const map = antwoord || voorstel;
  if (!map) {
    console.log('\n  ✖ Geen map gekozen. Er is niets veranderd.');
    process.exitCode = 1;
    return;
  }
  try {
    zetBestemming(map);
  } catch (err) {
    console.log(`\n  ✖ In ${map} kan niet geschreven worden: ${err?.message || err}`);
    console.log('    Er is niets veranderd. Staat Google Drive aan, en klopt de schijfletter?');
    process.exitCode = 1;
    return;
  }
  console.log(`\n  ✔ De back-up komt voortaan in: ${map}`);
  if (!/drive/i.test(map)) console.log('    (Let op: dit pad lijkt niet in Google Drive te staan. Dat mag, maar dan ligt de kopie niet buiten huis.)');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
