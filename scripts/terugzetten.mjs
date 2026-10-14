/* ── DE PROEF OP HET TERUGZETTEN — 8 oktober 2026 (punt 9.04) ────────────────
 *
 * Er is nog nooit een back-up teruggezet (§12 van het overzicht). Een back-up
 * waarvan je niet weet of hij terug te zetten is, is een hoop; dit maakt er een
 * feit van. Lucas start het met BACKUP.bat, keuze 3. Er verandert NIETS live.
 *
 *   1 · de nieuwste <stamp>-d1.sql uit de back-upmap (Google Drive, of anders
 *       backups\ in de projectmap) — of het bestand dat je meegeeft;
 *   2 · een LEGE lokale D1 in een tijdelijke map, met dezelfde wrangler die de
 *       site gebruikt (`d1 execute --local --persist-to`), en de dump erin;
 *   3 · per tabel de rijen tellen in die teruggezette database en vergelijken
 *       met <stamp>-controle.json, dat de back-up bij het maken schreef;
 *   4 · de geheime tabellen moeten leeg zijn (zie lib/backupdelen.mjs);
 *   5 · de tijdelijke map weg, en één regel in backups\_log\terugzet-proef.txt.
 *
 * Werkt dit, dan werkt een echt herstel ook: dat is dezelfde opdracht, alleen
 * met --remote op een lege database in plaats van --local. Hoe dat gaat staat in
 * scripts/TERUGZETTEN.txt (in de back-upmap: LEESMIJ-TERUGZETTEN.txt).
 *
 *   node scripts/terugzetten.mjs              → de nieuwste back-up
 *   node scripts/terugzetten.mjs <bestand>    → precies die
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { wrangler, asCommandArg } from './lib/wrangler.mjs';
import { GEHEIME_TABELLEN, kiesBestemming, nieuwsteDump } from './lib/backupdelen.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);

const DB = (() => {
  const toml = fs.readFileSync(path.join(ROOT, 'wrangler.toml'), 'utf8');
  const m = /database_name\s*=\s*"([^"]+)"/.exec(toml);
  if (!m) throw new Error('terugzetten: geen database_name in wrangler.toml');
  return m[1];
})();

/** Welke dump. Een meegegeven bestand, anders de nieuwste in de back-upmap, anders lokaal. */
export function kiesDump(args, root = ROOT) {
  const gegeven = args.find((a) => /\.sql$/i.test(a));
  if (gegeven) return fs.existsSync(gegeven) ? gegeven : null;
  const b = kiesBestemming({ root, argv: args });
  return nieuwsteDump(b.map) || nieuwsteDump(path.join(root, 'backups'));
}

/** Tellingen uit de teruggezette database tegen die van de back-up. */
export function vergelijk(verwacht, gekregen) {
  const verschil = [];
  for (const [t, n] of Object.entries(verwacht || {})) {
    if (!(t in gekregen)) verschil.push(`${t}: ontbreekt`);
    else if (Number(gekregen[t]) !== Number(n)) verschil.push(`${t}: ${gekregen[t]} in plaats van ${n}`);
  }
  for (const t of GEHEIME_TABELLEN) {
    if (Number(gekregen[t]) > 0) verschil.push(`${t}: ${gekregen[t]} rijen, terwijl hij leeg hoort te zijn`);
  }
  return verschil;
}

function log(regel) {
  try {
    const map = path.join(ROOT, 'backups', '_log');
    fs.mkdirSync(map, { recursive: true });
    /* Lokale tijd, zoals de stempels van de back-ups zelf: Lucas leest dit. */
    const d = new Date();
    const p2 = (n) => String(n).padStart(2, '0');
    const wanneer = `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
    fs.appendFileSync(path.join(map, 'terugzet-proef.txt'), `${wanneer}  ${regel}\r\n`);
  } catch { /* het logboek is een gemak, geen voorwaarde */ }
}

async function main() {
  console.log('VISUAILS · proef: een back-up terugzetten in een lege database\n');
  const dump = kiesDump(argv);
  if (!dump) {
    console.log('  ✖ Geen back-up gevonden. Maak er eerst een (BACKUP.bat, keuze 2).');
    log('MISLUKT: geen back-up gevonden');
    process.exit(1);
  }
  const controleBestand = dump.replace(/-d1\.sql$/i, '-controle.json');
  let verwacht = null;
  try { verwacht = JSON.parse(fs.readFileSync(controleBestand, 'utf8')).perTabel || null; } catch { verwacht = null; }
  console.log(`  back-up:   ${dump}`);
  console.log(`  controle:  ${verwacht ? path.basename(controleBestand) : 'geen controle.json (een back-up van vóór 8 oktober) — alleen inlezen'}`);

  const tijdelijk = fs.mkdtempSync(path.join(os.tmpdir(), 'visuails-terugzet-'));
  let uitkomst = 1;
  try {
    process.stdout.write('  terugzetten in een lege lokale database… ');
    const zet = await wrangler(['d1', 'execute', DB, '--local', '--persist-to', tijdelijk, '-y', '--file', dump]);
    if (!zet.ok) {
      console.log('MISLUKT');
      console.error('    ' + zet.out.trim().split('\n').filter(Boolean).slice(-4).join('\n    ').slice(0, 1200));
      log(`MISLUKT bij inlezen: ${path.basename(dump)}`);
      return;
    }
    console.log('gelukt');

    process.stdout.write('  rijen tellen… ');
    const TABELLEN_SQL = asCommandArg("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' ORDER BY name");
    const lijst = await wrangler(['d1', 'execute', DB, '--local', '--persist-to', tijdelijk, '--json', '--command', TABELLEN_SQL]);
    const namen = (JSON.parse(lijst.stdout.slice(lijst.stdout.indexOf('[')))?.[0]?.results || []).map((r) => r.name)
      .filter((n) => /^\w+$/.test(n));
    const gekregen = {};
    /* Eén rij met een kolom per tabel, in stukken van twintig tabellen. Niet met
       UNION ALL: D1 weigert dat boven een handvol delen ("too many terms in
       compound SELECT"). En in stukken, zodat de opdracht ruim onder de grens van
       een Windows-commandoregel blijft (zie CMD_MAX in lib/wrangler.mjs). */
    for (let i = 0; i < namen.length; i += 20) {
      const stuk = namen.slice(i, i + 20);
      const q = asCommandArg(`SELECT ${stuk.map((n) => `(SELECT COUNT(*) FROM ${n}) AS ${n}`).join(', ')}`);
      const r = await wrangler(['d1', 'execute', DB, '--local', '--persist-to', tijdelijk, '--json', '--command', q]);
      let rij = null;
      try { rij = JSON.parse(r.stdout.slice(r.stdout.indexOf('[')))?.[0]?.results?.[0] || null; } catch { rij = null; }
      if (!r.ok || !rij) {
        console.log('MISLUKT');
        console.error('    ' + r.out.trim().split('\n').filter(Boolean).slice(-3).join(' ').slice(0, 600));
        log(`MISLUKT bij tellen: ${path.basename(dump)}`);
        return;
      }
      for (const n of stuk) gekregen[n] = Number(rij[n]);
    }
    const totaal = Object.values(gekregen).reduce((a, b) => a + b, 0);
    console.log(`${namen.length} tabellen, ${totaal} rijen`);

    const verschil = verwacht ? vergelijk(verwacht, gekregen) : vergelijk({}, gekregen);
    console.log('');
    if (verschil.length) {
      console.log('  ✖ TERUGZETTEN WIJKT AF:');
      for (const v of verschil) console.log(`     · ${v}`);
      log(`AFWIJKING: ${path.basename(dump)} — ${verschil.join('; ')}`);
      return;
    }
    console.log(`  ✔ TERUGZETTEN WERKT: ${namen.length} tabellen en ${totaal} rijen, precies zoals bij het maken.`);
    console.log('    De tabellen met inloggeheimen zijn leeg, zoals bedoeld. Bij een echt herstel');
    console.log('    zet je daarna je adminaccount opnieuw neer — zie LEESMIJ-TERUGZETTEN.txt.');
    log(`WERKT: ${path.basename(dump)} — ${namen.length} tabellen, ${totaal} rijen`);
    uitkomst = 0;
  } finally {
    fs.rmSync(tijdelijk, { recursive: true, force: true });
    process.exitCode = uitkomst;
  }
}

/* Alleen draaien als script, niet bij een import (de test leest kiesDump en vergelijk). */
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
