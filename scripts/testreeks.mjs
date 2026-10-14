/**
 * VISUAILS — DE VOLLEDIGE TESTREEKS, SNELLER (punt 9.11, 8 oktober 2026)
 *
 *   node scripts/testreeks.mjs            (npm run test:reeks)
 *   TESTREEKS_TEGELIJK=1 node scripts/testreeks.mjs   één tegelijk, zoals npm test
 *
 * ── WAAROM ───────────────────────────────────────────────────────────────────
 *
 * Lucas koos bij 9.02 dat UITROLLEN.bat ALTIJD de volledige testreeks draait
 * (V2 = a), met als advies "zolang het onder de vijf minuten blijft". `npm test`
 * draait de keten één voor één, en elke schakel start een eigen npm: op Windows
 * kost dat alleen al een halve seconde per test, keer 160.
 *
 * Dit script draait PRECIES DEZELFDE KETEN — het leest hem uit "test" in
 * package.json, dus een test die de hoofdbouwer daar toevoegt, draait hier ook —
 * met drie verschillen:
 *
 *   1. de build (de eerste schakel) eerst en alleen, zoals in npm test;
 *   2. daarna een paar tests tegelijk (het aantal kernen min één, hoogstens vier),
 *      elk als `node tests/x.test.mjs` zonder npm ertussen. Claude draait de reeks
 *      al maanden zo, zes tegelijk (alle-tests.sh); de vaste poorten van de tests
 *      verschillen van elkaar en tijdelijke mappen zijn per test eigen;
 *   3. een test die faalt, draait aan het eind nog één keer alleen. Faalt hij dan
 *      weer, dan is hij echt rood. Slaagt hij alleen, dan telt hij als groen met
 *      een melding: dan lag het aan de drukte, niet aan de site.
 *
 * Elke schakel draait hoogstens één keer, ook als hij twee keer in de keten staat.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WORTEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** De keten uit package.json: [{ naam, opdracht }], dubbele opdrachten één keer. */
export function keten(pkg) {
  const delen = String(pkg.scripts?.test || '').split('&&').map((s) => s.trim()).filter(Boolean);
  const gezien = new Set();
  const uit = [];
  for (const d of delen) {
    const m = /^npm run (\S+)$/.exec(d);
    const naam = m ? m[1] : d;
    const opdracht = m ? pkg.scripts[naam] : d;
    if (!opdracht) throw new Error(`testreeks: "${naam}" staat in de keten maar niet in package.json`);
    /* test:mollie draait ook debug-mollie-reading; een losse schakel met precies
       die ene opdracht hoeft dan niet nog eens. */
    const stukken = opdracht.split('&&').map((s) => s.trim());
    if (stukken.every((s) => gezien.has(s))) continue;
    stukken.forEach((s) => gezien.add(s));
    uit.push({ naam, opdracht });
  }
  return uit;
}

export function hoeveelTegelijk(env = process.env) {
  const n = parseInt(env.TESTREEKS_TEGELIJK, 10);
  if (n > 0) return n;
  return Math.max(1, Math.min(4, (os.cpus()?.length || 2) - 1));
}

function draai(opdracht, wortel) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const bin = path.join(wortel, 'node_modules', '.bin');
    const env = { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH || process.env.Path || ''}` };
    let uit = '';
    const k = spawn(opdracht, { cwd: wortel, shell: true, env, windowsHide: true });
    const neem = (b) => { uit += b.toString('utf8'); if (uit.length > 2e6) uit = uit.slice(-1e6); };
    k.stdout.on('data', neem);
    k.stderr.on('data', neem);
    k.on('error', (e) => resolve({ code: 127, uit: `${uit}\n${e.message}`, ms: Date.now() - t0 }));
    k.on('close', (code) => resolve({ code: code ?? 1, uit, ms: Date.now() - t0 }));
  });
}

const sec = (ms) => `${(ms / 1000).toFixed(1).replace('.', ',')} s`;

/**
 * @returns {Promise<{goed: boolean, rood: string[], wiebel: string[], ms: number}>}
 */
export async function testreeks({ wortel = WORTEL, tegelijk = hoeveelTegelijk(), zeg = (s) => console.log(s), run = draai } = {}) {
  const pkg = JSON.parse(fs.readFileSync(path.join(wortel, 'package.json'), 'utf8'));
  const stappen = keten(pkg);
  const t0 = Date.now();
  const totaal = stappen.length;
  let n = 0;
  const regel = (s, r) => zeg(`${String(++n).padStart(4)}/${totaal}  ${r.code === 0 ? 'goed' : 'FOUT'}  ${s.naam}  (${sec(r.ms)})`);

  zeg(`De testreeks: ${totaal} stappen, eerst de build, daarna ${tegelijk} tegelijk.`);
  const [eerste, ...rest] = stappen;
  const b = await run(eerste.opdracht, wortel);
  regel(eerste, b);
  if (b.code !== 0) {
    zeg(`\n── ${eerste.naam} faalt; de rest heeft dan geen zin ──\n${b.uit.split(/\r?\n/).slice(-40).join('\n')}`);
    zeg(`\nFOUT: ${eerste.naam}`);
    return { goed: false, rood: [eerste.naam], wiebel: [], ms: Date.now() - t0 };
  }

  const mis = [];
  let i = 0;
  const werker = async () => {
    while (i < rest.length) {
      const s = rest[i++];
      const r = await run(s.opdracht, wortel);
      regel(s, r);
      if (r.code !== 0) mis.push({ s, r });
    }
  };
  await Promise.all(Array.from({ length: Math.min(tegelijk, rest.length) }, werker));

  /* Wie faalde, krijgt één losse kans: zonder drukte eromheen. */
  const rood = [];
  const wiebel = [];
  for (const { s, r } of mis) {
    const r2 = tegelijk > 1 ? await run(s.opdracht, wortel) : r;
    if (r2.code === 0) { wiebel.push(s.naam); zeg(`        ${s.naam}: los nog een keer → goed (lag aan de drukte)`); continue; }
    rood.push(s.naam);
    /* Eerst de rode regels, dan het einde (14 oktober 2026). Alleen de laatste
       40 regels liet bij test:stap2-kaart-browser zien dát er 6 van de 333
       misgingen, maar niet wélke: die stonden eerder in de uitvoer. */
    const regels = r2.uit.split(/\r?\n/).filter(Boolean);
    const rodeRegels = regels.filter((x) => /\bFAIL\b|Error|ERR_/.test(x)).slice(0, 40);
    zeg(`\n── ${s.naam} faalt ──\n${rodeRegels.length ? `de rode regels:\n${rodeRegels.join('\n')}\nhet einde:\n` : ''}${regels.slice(-30).join('\n')}`);
  }
  const ms = Date.now() - t0;
  zeg(rood.length ? `\nFOUT: ${rood.join(', ')}` : `\nAlles groen: ${totaal} stappen in ${Math.floor(ms / 60000)} min ${Math.round((ms % 60000) / 1000)} s.`);
  return { goed: rood.length === 0, rood, wiebel, ms };
}

const hierAangeroepen = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (hierAangeroepen) {
  const r = await testreeks();
  process.exitCode = r.goed ? 0 : 1;
}
