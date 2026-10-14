/**
 * VISUAILS — na een update van de afhankelijkheden één keer installeren.
 *
 * ── WAAROM DIT BESTAND ER IS — 8 oktober 2026 (punt o17) ────────────────────
 *
 * Astro ging van 6.4.8 naar 7.3.7 (bekend lek in 6.4.8), met de
 * Cloudflare-adapter, wrangler en sharp mee. package.json en package-lock.json
 * zijn bijgewerkt, maar node_modules op Lucas' computer heeft nog de oude
 * versies, en tot die is bijgewerkt bouwt `npm run build` met Astro 6 — of
 * helemaal niet. Lucas typt geen commando's, dus: NA-UPDATE-INSTALLEREN.bat
 * dubbelklikken, en dit script doet drie dingen, en stopt bij de eerste fout:
 *
 *   1. kijken of Node nieuw genoeg is. Astro 7 wil 22.12 of hoger; de eis
 *      komt uit package-lock.json (het `engines`-veld van astro), zodat een
 *      volgende update hem vanzelf meeneemt;
 *   2. `npm ci`: node_modules opnieuw, precies zoals package-lock.json zegt —
 *      niet `npm install`, dat het lock-bestand kan herschrijven;
 *   3. één keer bouwen, als bewijs dat het op deze computer werkt.
 *
 * Er wordt niets gepusht, niets gedeployd en niets in Cloudflare aangeraakt.
 * Opnieuw dubbelklikken kan altijd; het doet dan hetzelfde nog een keer.
 *
 * Gebruik:  node scripts/na-update-installeren.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/** Is versie `v` (bv. "22.11.0" of "v22.11.0") minstens `eis` (bv. "22.12.0")? */
export function versieMinstens(v, eis) {
  const deel = (s) => String(s).replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
  const a = deel(v), b = deel(eis);
  for (let i = 0; i < 3; i++) {
    if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) > (b[i] || 0);
  }
  return true;
}

/** De laagste Node-versie die astro in package-lock.json vraagt (">=22.12.0" → "22.12.0"). */
export function nodeEisUitLock(lockTekst, terugval = '22.12.0') {
  try {
    const eis = JSON.parse(lockTekst)?.packages?.['node_modules/astro']?.engines?.node || '';
    const m = /(\d+\.\d+\.\d+)/.exec(eis);
    return m ? m[1] : terugval;
  } catch {
    return terugval;
  }
}

function versieVan(wortel, pakket) {
  try {
    return JSON.parse(fs.readFileSync(path.join(wortel, 'node_modules', pakket, 'package.json'), 'utf8')).version;
  } catch {
    return '?';
  }
}

/* `npm` is op Windows npm.cmd; met shell:true vindt Windows hem zelf. Er gaan
   geen paden mee als argument — de map staat in `cwd` — dus de spaties en
   haakjes in "E:\Claude (VISUAILS)\visuails-astro" kunnen hier niets breken. */
function draai(wortel, opdracht) {
  console.log(`\n> ${opdracht}\n`);
  const r = spawnSync(opdracht, { cwd: wortel, stdio: 'inherit', shell: true });
  return r.status === 0;
}

function stop(stap, uitleg) {
  console.log(`\nGESTOPT BIJ STAP ${stap} — er is niets live gezet.`);
  for (const regel of uitleg) console.log(`  · ${regel}`);
  process.exit(1);
}

const hierAangeroepen = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (hierAangeroepen) {
  const wortel = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  if (!fs.existsSync(path.join(wortel, 'astro.config.mjs')) || !fs.existsSync(path.join(wortel, 'package-lock.json'))) {
    stop(0, ['Dit script staat niet in de projectmap (astro.config.mjs of package-lock.json ontbreekt).']);
  }

  /* ── 1 · NODE ── */
  const eis = nodeEisUitLock(fs.readFileSync(path.join(wortel, 'package-lock.json'), 'utf8'));
  console.log(`Stap 1 van 3 · Node ${process.versions.node} (nodig: ${eis} of hoger)`);
  if (!versieMinstens(process.versions.node, eis)) {
    stop(1, [
      `Je Node is ${process.versions.node}; Astro 7 wil ${eis} of hoger.`,
      'Ga naar nodejs.org, klik op de groene LTS-knop en installeer die (gewoon steeds "Next").',
      'Sluit daarna dit venster en dubbelklik NA-UPDATE-INSTALLEREN.bat opnieuw.',
    ]);
  }

  /* ── 2 · INSTALLEREN ── */
  console.log('\nStap 2 van 3 · node_modules opnieuw, precies volgens package-lock.json (±1–3 minuten)');
  /* --no-audit: de ene melding die overblijft (sharp in miniflare, de lokale
     Cloudflare-simulator) staat in het o17-verslag; hier zou hij alleen
     schrikken zonder dat er iets aan te doen is. */
  if (!draai(wortel, 'npm ci --no-audit --no-fund')) {
    stop(2, [
      'Sluit elk ander venster waarin npm run dev, wrangler of de site draait (ook in VS Code), en dubbelklik opnieuw.',
      'Staat het internet aan? npm haalt de pakketten op.',
      'Zegt de fout EPERM of EBUSY: een bestand in node_modules is nog open. Herstart de computer en dubbelklik opnieuw.',
      'Lukt het dan nog niet: stuur de laatste twintig regels hierboven naar Claude.',
    ]);
  }

  /* ── 3 · BOUWEN ── */
  console.log('\nStap 3 van 3 · één keer bouwen als controle (±30 seconden)');
  if (!draai(wortel, 'npm run build')) {
    stop(3, ['Het installeren lukte, het bouwen niet. Stuur de laatste twintig regels hierboven naar Claude.']);
  }

  console.log(`\nKLAAR · Astro ${versieVan(wortel, 'astro')}, Cloudflare-adapter ${versieVan(wortel, '@astrojs/cloudflare')}, wrangler ${versieVan(wortel, 'wrangler')} · bouwen gelukt.`);
  console.log('Je kunt weer werken en uitrollen zoals altijd. Dit hoeft pas weer na de volgende update van de afhankelijkheden.');
}
