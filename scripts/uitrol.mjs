/**
 * VISUAILS — ÉÉN DUBBELKLIK "UITROLLEN" (punt 9.02, 8 oktober 2026)
 *
 *   UITROLLEN.bat        → node scripts/uitrol.mjs
 *   TERUGDRAAIEN.bat     → node scripts/uitrol.mjs terugdraaien
 *   node scripts/uitrol.mjs --droog                 alles tonen, niets committen/pushen/live zetten
 *   node scripts/uitrol.mjs --droog --zonder-tests  idem, zonder de testreeks (alleen bij --droog)
 *
 * ── WAAROM DIT BESTAAT ───────────────────────────────────────────────────────
 *
 * Na elke ronde typte Lucas vijf commando's (git add -A, commit, push, npm run
 * deploy, npm run cron:deploy) en keek Claude daarna live na. Hoe een nieuwe
 * migratie op de live-database kwam stond nergens: Claude zei het per keer, en
 * Lucas typte het (afvinklijst V1 = b). De cron was daardoor nog nooit
 * gedeployed. Nu is het één dubbelklik, één J/N en een paar minuten wachten.
 *
 * Lucas' antwoorden: V1 = b → de migraties worden een vaste stap in de knop;
 * V2 = a → de knop draait ALTIJD de volledige testreeks (npm test).
 *
 * ── DE STAPPEN — elk stopt bij een fout ─────────────────────────────────────
 *
 *   0  opruimen   staat er in _opruimen nog iets onder een kop met "moet"? Dan
 *                 eerst OPRUIMEN (na J/N). Plus: is dit een git-map met GitHub erachter?
 *   1  geheimen   gaat er iets mee dat niet naar GitHub mag (.dev.vars, .env,
 *                 dumps, back-ups, sleutels in de tekst, heel grote bestanden)?
 *   2  tests      de hele reeks van npm test (build + alle scripts), via
 *                 scripts/testreeks.mjs: dezelfde keten, een paar tegelijk (9.11)
 *   3  tonen      welke bestanden en welke NIEUWE migraties (met naam) meegaan,
 *                 dan "Doorgaan? J/N". Terugdraaien zet de database niet terug,
 *                 daarom staat deze vraag vóór commit en migraties.
 *   4  bewaren    commit (bericht uit kladblok/COMMIT-BERICHT.txt, anders de datum) en push
 *   5  migraties  alleen de nieuwe, via scripts/migrate.mjs, en daarna nagekeken
 *   6  site       npm run deploy
 *   7  nachtwerk  npm run cron:deploy
 *   8  nakijken   zes adressen op visuails.com: status en een korte inhoudscontrole
 *
 * Daarna een eindscherm in gewone woorden en een regel in kladblok/uitrol-log.txt.
 *
 * ── HOE "NIEUWE MIGRATIE" HIER WORDT BEPAALD ────────────────────────────────
 *
 * Er is geen register van gedraaide migraties: scripts/migrate.mjs leest de
 * toestand uit de database zelf (bestaat kolom x al?) en slaat over wat er al
 * staat. Dat doet deze knop ook. Hij vraagt de live-database één keer om zijn
 * plattegrond (tabellen, kolommen, indexen) en legt elke migratie daarnaast:
 * mist er een kolom, tabel of index die de migratie maakt, dan is hij nieuw.
 *
 * Gevolg: een migratie die Lucas al met de hand in de console draaide (0052 en
 * 0053 op 8 oktober) telt als "staat er al" en draait niet nog eens. En zou hij
 * toch draaien, dan slaat migrate.mjs de ALTER over omdat de kolom bestaat.
 * Een migratie die alleen gegevens bijwerkt (geen kolom of tabel) is niet uit
 * de database af te lezen; die telt als nieuw zolang hij nog niet op GitHub stond.
 * Een migratie die een tabel ombouwt (RENAME, DROP TABLE) draait de knop nooit.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { statements, stripComments } from './lib/sql.mjs';
import { openVoorUitrol, allesOpruimen, verslag as opruimVerslag } from './opruimen.mjs';
import { keten } from './testreeks.mjs';

const HIER = path.dirname(fileURLToPath(import.meta.url));
export const SITE = 'https://visuails.com';

/* ═══════════════════════════════════════════════════════════════════════════
 * 1 · GEHEIMEN — wat nooit mee mag
 * ═══════════════════════════════════════════════════════════════════════════ */

const NAAM_NEE = [
  [/(^|\/)\.dev\.vars/i, 'lokale geheimen voor wrangler dev (.dev.vars)'],
  [/(^|\/)\.env(\.|$)/i, 'een .env-bestand met sleutels'],
  [/(^|\/)backups?\//i, 'een back-up (met klantgegevens)'],
  [/\.(sqlite3?|db|d1)$/i, 'een databasebestand'],
  [/(dump|backup|back-up|export)[^/]*\.(sql|json|csv|gz|zip|tar)$/i, 'lijkt op een database-export'],
  [/\.(bak|pem|key|p12|pfx|keystore)$/i, 'een sleutel of reservekopie'],
  [/(^|\/)id_(rsa|ed25519|ecdsa)/i, 'een SSH-sleutel'],
  [/(^|\/)_opruimen\/[^/]+\//, 'een kopie uit _opruimen (hoort in .gitignore)'],
];

const INHOUD_NEE = [
  [/\b(?:live|test)_[A-Za-z0-9]{30,}\b/g, 'een Mollie-sleutel'],
  [/\bre_[A-Za-z0-9]{6,}_[A-Za-z0-9]{12,}\b/g, 'een Resend-sleutel'],
  [/\b[sr]k_(?:live|test)_[A-Za-z0-9]{16,}\b/g, 'een Stripe-sleutel'],
  [/\bwhsec_[A-Za-z0-9+/=]{20,}/g, 'een webhookgeheim'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/g, 'een privésleutel'],
  [/\bCLOUDFLARE_API_TOKEN\s*[=:]\s*["']?[A-Za-z0-9_-]{30,}/g, 'een Cloudflare-token'],
];

/* Verzonnen sleutels in tests en voorbeelden. Een echte sleutel is willekeurig;
   deze zijn het alfabet, nullen, of het voorbeeld uit de documentatie van Mollie. */
const NEP_SLEUTELS = new Set(['test_dHar4XY7LxsDOtmnkVtjNVWXLSlXsM']);
export function nepSleutel(s) {
  if (NEP_SLEUTELS.has(s)) return true;
  const staart = s.replace(/^(?:live|test|re|sk_live|sk_test|rk_live|rk_test|whsec)_/, '');
  if (/abcdefgh|0123456|123456789|xxxxx|XXXXX|00000000|aaaaaaaa/i.test(staart)) return true;
  return new Set(staart).size <= 4;
}

export const MAX_MB = 25;

/**
 * Wat er niet mee mag. `items` zijn de regels uit leesStatus(); alleen wat
 * er komt of verandert wordt bekeken (wat weg gaat, kan geen geheim meenemen).
 */
export function geheimenControle(wortel, items) {
  const problemen = [];
  for (const it of items) {
    if (it.soort === 'weg') continue;
    const pad = it.pad;
    for (const [re, waarom] of NAAM_NEE) {
      if (re.test(pad)) { problemen.push({ pad, waarom }); break; }
    }
    let st;
    try { st = fs.statSync(path.join(wortel, pad)); } catch { continue; }
    if (!st.isFile()) continue;
    if (st.size > MAX_MB * 1024 * 1024) {
      problemen.push({ pad, waarom: `${(st.size / 1048576).toFixed(0)} MB — te groot voor GitHub (grens hier: ${MAX_MB} MB)` });
      continue;
    }
    if (st.size > 2 * 1024 * 1024) continue;
    const buf = fs.readFileSync(path.join(wortel, pad));
    if (buf.subarray(0, 8000).includes(0)) continue; // beeld of ander binair bestand
    const tekst = buf.toString('utf8');
    for (const [re, waarom] of INHOUD_NEE) {
      re.lastIndex = 0;
      const echt = (tekst.match(re) || []).filter((m) => !nepSleutel(m));
      if (echt.length) problemen.push({ pad, waarom: `bevat ${waarom}` });
    }
    if (/\.sql$/i.test(pad) && !/^migrations\//.test(pad) && pad !== 'schema.sql') {
      const inserts = (tekst.match(/\bINSERT\s+INTO\b/gi) || []).length;
      if (inserts > 50) problemen.push({ pad, waarom: `lijkt op een database-dump (${inserts} INSERT-regels)` });
    }
  }
  return problemen;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * GIT — wat er mee zou gaan
 * ═══════════════════════════════════════════════════════════════════════════ */

/** `git status --porcelain=v1 -z -uall` → [{ pad, soort, van? }] */
export function leesStatus(z) {
  const delen = String(z).split('\0');
  const r = [];
  for (let i = 0; i < delen.length; i++) {
    const d = delen[i];
    if (!d || d.length < 4) continue;
    const xy = d.slice(0, 2);
    const pad = d.slice(3);
    if (xy[0] === 'R' || xy[0] === 'C') { r.push({ pad, van: delen[++i], soort: 'verplaatst' }); continue; }
    if (xy === '??') r.push({ pad, soort: 'nieuw' });
    else if (xy.includes('D')) r.push({ pad, soort: 'weg' });
    else if (xy[0] === 'A') r.push({ pad, soort: 'nieuw' });
    else r.push({ pad, soort: 'gewijzigd' });
  }
  return r;
}

/** Alle paden die gestaged moeten worden (bij een verplaatsing: oud én nieuw). */
export function stagePaden(items) {
  return items.flatMap((i) => (i.van ? [i.van, i.pad] : [i.pad]));
}

/** Voor het scherm: een "weg" en een "nieuw" met dezelfde naam zijn een verplaatsing. */
export function koppelVerplaatsingen(items) {
  const naam = (p) => p.split('/').pop();
  const weg = items.filter((i) => i.soort === 'weg');
  const nieuw = items.filter((i) => i.soort === 'nieuw');
  const telNaam = (lijst) => lijst.reduce((m, i) => m.set(naam(i.pad), (m.get(naam(i.pad)) || 0) + 1), new Map());
  const tw = telNaam(weg), tn = telNaam(nieuw);
  const gekoppeld = new Set();
  const uit = [];
  for (const n of nieuw) {
    const k = naam(n.pad);
    if (tw.get(k) !== 1 || tn.get(k) !== 1) continue;
    const w = weg.find((x) => naam(x.pad) === k);
    gekoppeld.add(w).add(n);
    uit.push({ pad: n.pad, van: w.pad, soort: 'verplaatst' });
  }
  return [...items.filter((i) => !gekoppeld.has(i)), ...uit];
}

const SOORT_WOORD = { nieuw: 'nieuw', gewijzigd: 'gewijzigd', weg: 'weg', verplaatst: 'verplaatst' };

/** De lijst "Dit gaat mee", in gewone woorden. Toont er hoogstens `max`. */
export function toonBestanden(items, max = 60) {
  const scherm = koppelVerplaatsingen(items);
  const tel = (s) => scherm.filter((i) => i.soort === s).length;
  const kop = `Dit gaat mee: ${items.length === 0 ? 'geen bestanden' : `${scherm.length} bestand(en)`}`
    + (scherm.length ? ` (${['nieuw', 'gewijzigd', 'verplaatst', 'weg'].filter(tel).map((s) => `${tel(s)} ${SOORT_WOORD[s]}`).join(', ')})` : '');
  const volgorde = { nieuw: 0, gewijzigd: 1, verplaatst: 2, weg: 3 };
  const lijst = scherm
    .sort((a, b) => volgorde[a.soort] - volgorde[b.soort] || a.pad.localeCompare(b.pad))
    .map((i) => `   ${SOORT_WOORD[i.soort].padEnd(10)} ${i.van ? `${i.van}  ->  ${i.pad}` : i.pad}`);
  const regels = [kop, ...lijst.slice(0, max)];
  if (lijst.length > max) {
    const perMap = new Map();
    for (const i of scherm.slice(0)) {
      const m = i.pad.includes('/') ? `${i.pad.split('/')[0]}/` : '(projectmap)';
      perMap.set(m, (perMap.get(m) || 0) + 1);
    }
    regels.push(`   … en nog ${lijst.length - max} meer. Per map: ${[...perMap].map(([m, n]) => `${m} ${n}`).join(' · ')}`);
  }
  return regels.join('\n');
}

/* ═══════════════════════════════════════════════════════════════════════════
 * MIGRATIES — welke zijn nieuw voor de live-database?
 * ═══════════════════════════════════════════════════════════════════════════ */

const OMBOUW = /\bRENAME\s+TO\b|\bPRAGMA\s+foreign_keys\b|\bDROP\s+TABLE\b/i;

/** Wat een migratie achterlaat in het schema: kolommen, tabellen, indexen, en weggehaalde indexen. */
export function voetafdruk(sql) {
  const v = { kolommen: [], tabellen: [], indexen: [], wegIndexen: [], ombouw: OMBOUW.test(stripComments(sql)), data: 0 };
  const hernoemd = new Map();
  const st = statements(sql);
  for (const s of st) {
    const r = /^ALTER\s+TABLE\s+(\w+)\s+RENAME\s+TO\s+(\w+)/i.exec(s);
    if (r) hernoemd.set(r[1], r[2]);
  }
  for (const s of st) {
    let m;
    if ((m = /^ALTER\s+TABLE\s+(\w+)\s+ADD\s+COLUMN\s+(\w+)/i.exec(s))) v.kolommen.push([m[1], m[2]]);
    else if ((m = /^CREATE\s+(?:TEMP\w*\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i.exec(s))) {
      /* Bij een ombouw heet de nieuwe tabel eerst x_new en daarna x: dan telt x. */
      v.tabellen.push(hernoemd.get(m[1]) || m[1]);
    } else if ((m = /^CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i.exec(s))) v.indexen.push(m[1]);
    else if ((m = /^DROP\s+INDEX\s+(?:IF\s+EXISTS\s+)?(\w+)/i.exec(s))) v.wegIndexen.push(m[1]);
    else if (/^ALTER\s+TABLE\s+\w+\s+RENAME/i.test(s) || /^PRAGMA\b/i.test(s)) { /* hoort bij de ombouw */ }
    else v.data++;
  }
  return v;
}

/** De plattegrond van de database, uit één vraag (zie SCHEMA_SQL).
 *
 *  ZONDER DE TABELLEN VAN D1 ZELF — 14 oktober 2026. D1 houdt eigen tabellen bij
 *  (`_cf_KV` live, `_cf_METADATA` lokaal) en weigert elke vraag die erin kijkt:
 *  pragma_table_info('_cf_KV') gaf "not authorized: SQLITE_AUTH" (code 7500), en
 *  daarmee stopte UITROLLEN.bat bij stap 3. De tabellen van SQLite zelf
 *  (sqlite_sequence) horen ook niet bij onze migraties. substr en geen LIKE:
 *  geen backslash of procentteken dat onderweg iets anders kan gaan betekenen. */
export const SCHEMA_SQL = "SELECT 'index' AS k, name AS n, NULL AS c FROM sqlite_master WHERE type = 'index' "
  + "AND substr(name, 1, 4) <> '_cf_' AND substr(name, 1, 7) <> 'sqlite_' "
  + "UNION ALL SELECT 'table', m.name, p.name FROM sqlite_master m JOIN pragma_table_info(m.name) p WHERE m.type = 'table' "
  + "AND substr(m.name, 1, 4) <> '_cf_' AND substr(m.name, 1, 7) <> 'sqlite_'";

export function leesSchema(rijen) {
  const s = { tabellen: new Set(), indexen: new Set(), kolommen: new Map() };
  for (const { k, n, c } of rijen) {
    if (k === 'index') { s.indexen.add(n); continue; }
    s.tabellen.add(n);
    if (!s.kolommen.has(n)) s.kolommen.set(n, new Set());
    if (c) s.kolommen.get(n).add(c);
  }
  return s;
}

/**
 * Elke migratie naast de live-database leggen.
 * @param {{naam: string, sql: string, opGithub: boolean}[]} migraties
 * @returns {{naam, status: 'nieuw'|'staat-er'|'ombouw', mist: string[], lang: boolean}[]}
 *   lang = stond al op GitHub (een oude migratie die nooit live is gedraaid)
 */
export function vergelijkMigraties(migraties, schema) {
  return migraties.map(({ naam, sql, opGithub }) => {
    const v = voetafdruk(sql);
    const mist = [
      ...v.kolommen.filter(([t, c]) => !schema.kolommen.get(t)?.has(c)).map(([t, c]) => `kolom ${t}.${c}`),
      ...v.tabellen.filter((t) => !schema.tabellen.has(t)).map((t) => `tabel ${t}`),
      ...v.indexen.filter((i) => !schema.indexen.has(i)).map((i) => `index ${i}`),
      ...v.wegIndexen.filter((i) => schema.indexen.has(i)).map((i) => `index ${i} moet weg`),
    ];
    const iets = v.kolommen.length + v.tabellen.length + v.indexen.length + v.wegIndexen.length;
    const nieuw = mist.length > 0 || (!iets && !opGithub);
    const status = !nieuw ? 'staat-er' : v.ombouw ? 'ombouw' : 'nieuw';
    return { naam, status, mist: !iets && !opGithub ? ['werkt alleen gegevens bij; nog niet op GitHub'] : mist, lang: nieuw && opGithub };
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
 * KLEINE HULPEN
 * ═══════════════════════════════════════════════════════════════════════════ */

const MAANDEN = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
const twee = (n) => String(n).padStart(2, '0');
export const datumKort = (d) => `${d.getDate()} ${MAANDEN[d.getMonth()]} ${twee(d.getHours())}:${twee(d.getMinutes())}`;
export const datumLog = (d) => `${d.getFullYear()}-${twee(d.getMonth() + 1)}-${twee(d.getDate())} ${twee(d.getHours())}:${twee(d.getMinutes())}`;

/** Het commitbericht: uit kladblok/COMMIT-BERICHT.txt, tenzij dat al eens gebruikt is. */
export function commitBericht(wortel, eerdere, nu) {
  const p = path.join(wortel, 'kladblok', 'COMMIT-BERICHT.txt');
  let t = '';
  try { t = fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n').trim(); } catch { /* geen bestand */ }
  if (t && !eerdere.some((e) => e.trim() === t)) return { tekst: t, bron: 'kladblok/COMMIT-BERICHT.txt' };
  return { tekst: `Uitrol ${datumLog(nu)}`, bron: t ? 'de datum (COMMIT-BERICHT.txt was al gebruikt)' : 'de datum' };
}

/* ── PASSEN DE GEÏNSTALLEERDE ONDERDELEN BIJ DE LOCK? — 8 oktober 2026 (o17) ──
   Na de overstap naar Astro 7 staat in package-lock.json een andere versie dan in
   node_modules op Lucas' pc, tot hij NA-UPDATE-INSTALLEREN.bat heeft gedraaid.
   Zonder die controle zou de uitrol met de oude Astro 6 bouwen en live zetten —
   en het lek dat de update dicht moest, bleef open. */
export function afhankelijkhedenGelijk(wortel, namen = ['astro', '@astrojs/cloudflare', 'wrangler']) {
  let lock;
  try { lock = JSON.parse(fs.readFileSync(path.join(wortel, 'package-lock.json'), 'utf8')); } catch { return []; }
  const anders = [];
  for (const naam of namen) {
    const wil = lock?.packages?.[`node_modules/${naam}`]?.version;
    if (!wil) continue;
    let heeft = null;
    try { heeft = JSON.parse(fs.readFileSync(path.join(wortel, 'node_modules', naam, 'package.json'), 'utf8')).version; } catch { /* ontbreekt */ }
    if (heeft !== wil) anders.push({ naam, wil, heeft });
  }
  return anders;
}

/** De zes adressen die stap 8 nakijkt. */
export const ADRESSEN = [
  { pad: '/', naam: 'voorpagina', moet: [/<html[^>]*\blang="en"/i, /VISUAILS/], versie: true },
  { pad: '/nl/', naam: 'Nederlandse voorpagina', moet: [/<html[^>]*\blang="nl"/i] },
  { pad: '/start/catalog/', naam: 'bestelformulier catalog', moet: [/<form\b/i] },
  { pad: '/account/login', naam: 'inloggen Studio', moet: [/name="email"/i] },
  { pad: '/admin/login', naam: 'inloggen /admin', moet: [/type="password"/i] },
  { pad: '/api/capacity?tier=unattended&products=3', naam: 'agenda (API)', json: (j) => j && j.ok === true },
];

/** De gebouwde bestanden die de voorpagina laadt: zo zie je of live de nieuwe versie is. */
export function versieVan(html) {
  return [...new Set(String(html).match(/\/_astro\/[\w.-]+\.(?:css|js)/g) || [])].sort().join(' ');
}

export async function kijkNa({ haal, wortel, wacht, pogingen = 3, site = SITE, nu = Date.now }) {
  let distHtml = '';
  try { distHtml = fs.readFileSync(path.join(wortel, 'dist', 'index.html'), 'utf8'); } catch { /* geen build */ }
  const verwacht = versieVan(distHtml);
  const uit = [];
  for (const a of ADRESSEN) {
    let laatste = { goed: false, uitleg: 'niet opgevraagd' };
    for (let n = 1; n <= pogingen; n++) {
      const url = `${site}${a.pad}${a.pad.includes('?') ? '&' : '?'}uitrol=${nu()}`;
      try {
        const r = await haal(url, { redirect: 'follow', headers: { 'cache-control': 'no-cache' } });
        const body = await r.text();
        if (r.status !== 200) laatste = { goed: false, status: r.status, uitleg: `status ${r.status}` };
        else if (a.json) {
          let j = null;
          try { j = JSON.parse(body); } catch { /* geen json */ }
          laatste = a.json(j) ? { goed: true, status: 200, uitleg: 'geeft antwoord' } : { goed: false, status: 200, uitleg: 'antwoord klopt niet' };
        } else {
          const mist = a.moet.filter((re) => !re.test(body));
          if (mist.length) laatste = { goed: false, status: 200, uitleg: 'de pagina mist wat er hoort te staan' };
          else if (a.versie && verwacht && versieVan(body) !== verwacht) laatste = { goed: false, status: 200, uitleg: 'toont nog de vorige versie' };
          else laatste = { goed: true, status: 200, uitleg: a.versie && verwacht ? 'de nieuwe versie' : 'in orde' };
        }
      } catch (e) {
        laatste = { goed: false, uitleg: `niet bereikbaar (${String(e.message || e).slice(0, 60)})` };
      }
      if (laatste.goed) break;
      if (n < pogingen) await wacht(5000);
    }
    uit.push({ ...a, ...laatste });
  }
  return uit;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * DE ECHTE AANROEPEN (in de test vervangen door een nep)
 * ═══════════════════════════════════════════════════════════════════════════ */

const isWindows = process.platform === 'win32';

/* Wrangler's eigen startbestand, als het geïnstalleerd is — zelfde keuze als
   scripts/lib/wrangler.mjs: dan geen npx, geen shell en geen gedoe met
   aanhalingstekens in "E:\Claude (VISUAILS)". */
function lokaleWrangler(wortel) {
  const req = createRequire(path.join(wortel, 'package.json'));
  for (const e of ['wrangler/bin/wrangler.js', 'wrangler']) {
    try { return req.resolve(e); } catch { /* niet geïnstalleerd */ }
  }
  return null;
}

/** Een argument zó dat cmd.exe het als één geheel doorgeeft (alleen nodig met shell). */
function citeer(a) {
  return /[\s"&|<>^()]/.test(a) ? `"${String(a).replace(/"/g, '""')}"` : a;
}

/**
 * Eén programma draaien.
 * @param {'git'|'npm'|'npx'|'node'|'wrangler'} cmd
 * @param {string[]} args
 * @param {{cwd: string, zichtbaar?: boolean, opRegel?: (r: string) => void, invoer?: string}} o
 * @returns {Promise<{code: number, out: string}>}
 */
export function echteRun(cmd, args, { cwd, zichtbaar = false, opRegel, invoer } = {}) {
  let bin = cmd;
  let argv = args;
  let shell = false;
  if (cmd === 'node') bin = process.execPath;
  else if (cmd === 'npm' || cmd === 'npx') { bin = isWindows ? `${cmd}.cmd` : cmd; shell = isWindows; }
  else if (cmd === 'wrangler') {
    const lok = lokaleWrangler(cwd);
    if (lok) { bin = process.execPath; argv = [lok, ...args]; }
    else { bin = isWindows ? 'npx.cmd' : 'npx'; argv = ['wrangler', ...args]; shell = isWindows; }
  }
  if (shell) argv = argv.map(citeer);
  return new Promise((resolve) => {
    let out = '';
    let rest = '';
    let kind;
    try {
      kind = spawn(bin, argv, { cwd, shell, windowsHide: !zichtbaar, stdio: zichtbaar ? 'inherit' : ['pipe', 'pipe', 'pipe'] });
    } catch (e) {
      resolve({ code: 127, out: String(e.message || e) });
      return;
    }
    const neem = (stuk) => {
      const t = stuk.toString('utf8');
      out += t;
      if (out.length > 4e6) out = out.slice(-2e6);
      if (!opRegel) return;
      rest += t;
      const regels = rest.split(/\r?\n/);
      rest = regels.pop();
      for (const r of regels) opRegel(r);
    };
    if (!zichtbaar) {
      kind.stdout.on('data', neem);
      kind.stderr.on('data', neem);
      if (invoer != null) kind.stdin.end(invoer); else kind.stdin.end();
    }
    kind.on('error', (e) => resolve({ code: 127, out: `${out}\n${e.message}` }));
    kind.on('close', (code) => {
      if (rest && opRegel) opRegel(rest);
      resolve({ code: code ?? 1, out });
    });
  });
}

/** Staat de Chromium van Playwright op deze pc? null = weet niet (dan zeggen de tests het zelf). */
export async function testBrowserAanwezig(wortel) {
  if (process.env.PW_CHROME) return true;
  try {
    const { chromium } = createRequire(path.join(wortel, 'package.json'))('playwright');
    const p = chromium.executablePath();
    return Boolean(p && fs.existsSync(p));
  } catch { return null; }
}

/** J/N vragen in het venster. */
export function echteVraag(tekst) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(`${tekst} `, (a) => { rl.close(); resolve(a.trim()); });
  });
}

const isJa = (a) => /^j(a)?$/i.test(String(a || '').trim()) || /^y(es)?$/i.test(String(a || '').trim());

/* ═══════════════════════════════════════════════════════════════════════════
 * DE UITROL
 * ═══════════════════════════════════════════════════════════════════════════ */

export const STAPNAMEN = [
  'opruimen en voorbereiden', 'geheimen', 'tests', 'tonen wat meegaat',
  'commit en push', 'migraties', 'site live', 'nachtwerk live', 'nakijken',
];

/**
 * @param {object} o
 * @param {string} o.wortel
 * @param {typeof echteRun} o.run
 * @param {(t: string) => Promise<string>} o.vraag
 * @param {typeof fetch} o.haal
 * @param {(s: string) => void} [o.zeg]
 * @param {() => Date} [o.nu]
 * @param {(ms: number) => Promise<void>} [o.wacht]
 * @param {boolean} [o.droog]       alles laten zien, niets bewaren of live zetten
 * @param {boolean} [o.zonderTests] alleen samen met droog
 * @param {boolean} [o.voortgang]   testteller op één regel (alleen in een echt venster)
 */
export async function uitrollen(o) {
  const { wortel, run, vraag, haal } = o;
  const zeg = o.zeg || ((s) => console.log(s));
  const nu = o.nu || (() => new Date());
  const wacht = o.wacht || ((ms) => new Promise((r) => setTimeout(r, ms)));
  const droog = Boolean(o.droog);
  const zonderTests = droog && Boolean(o.zonderTests);
  const start = nu();
  const u = { stap: 0, bestanden: [], nieuweMigraties: [], commit: null, adressen: [], droog };

  const kop = (n) => zeg(`\n── Stap ${n} van 8 · ${STAPNAMEN[n]} ${'─'.repeat(Math.max(3, 44 - STAPNAMEN[n].length))}`);
  const git = (args, extra) => run('git', args, { cwd: wortel, ...extra });

  const klaar = (uitkomst, regels = []) => {
    const r = { ...u, uitkomst, regels };
    r.scherm = eindscherm(r, nu());
    zeg(`\n${r.scherm}`);
    if (!droog && fs.existsSync(path.join(wortel, 'astro.config.mjs'))) schrijfLog(wortel, r, nu());
    return r;
  };
  const gestopt = (n, ...regels) => { u.stap = n; return klaar('gestopt', regels); };

  /* ── 0 · opruimen en voorbereiden ─────────────────────────────────────── */
  kop(0);
  if (!fs.existsSync(path.join(wortel, 'astro.config.mjs'))) return gestopt(0, 'Dit script staat niet in de projectmap van VISUAILS.');
  const binnen = await git(['rev-parse', '--is-inside-work-tree']);
  if (binnen.code !== 0) return gestopt(0, 'Deze map is (nog) geen git-map, of git is niet geïnstalleerd.', 'Vraag Claude wat er mis is.');
  const top = (await git(['rev-parse', '--show-toplevel'])).out.trim();
  /* Op Windows heeft één map soms twee namen: C:\Users\GEBRUI~1\… (de korte
     8.3-naam, die %TEMP% geeft) en C:/Users/Gebruiker/… (wat git zegt). Daardoor
     stopte de nagespeelde uitrol in tests/uitrol.test.mjs op Lucas' pc bij stap 0
     (14 oktober 2026). realpathSync.native schrijft allebei uit tot de lange naam. */
  const echt = (p) => { try { return fs.realpathSync.native(p); } catch { return path.resolve(p); } };
  const zelfde = (a, b) => (isWindows ? echt(a).toLowerCase() === echt(b).toLowerCase() : echt(a) === echt(b));
  if (top && !zelfde(top, wortel)) return gestopt(0, `Git kijkt naar een andere map (${top}) dan de projectmap. Vraag Claude.`);
  const origin = await git(['remote', 'get-url', 'origin']);
  if (origin.code !== 0) return gestopt(0, 'Er is geen koppeling met GitHub (origin) in deze map. Vraag Claude.');
  const tak = (await git(['rev-parse', '--abbrev-ref', 'HEAD'])).out.trim();
  if (!tak || tak === 'HEAD') return gestopt(0, 'Git staat niet op een tak (losse commit). Vraag Claude.');
  u.tak = tak;

  let open = openVoorUitrol(wortel);
  if (open.aantal) {
    zeg(`In _opruimen staat nog werk dat vóór de uitrol moet gebeuren (${open.aantal}):`);
    for (const i of open.lijst) zeg(`   weg:         ${i.pad}${i.reden ? `  —  ${i.reden}` : ''}`);
    for (const i of open.verplaats) zeg(`   verplaatsen: ${i.bron} -> ${i.doel}`);
    if (droog) {
      zeg('(droog: OPRUIMEN wordt niet uitgevoerd)');
    } else {
      const a = await vraag('Nu opruimen? Er wordt niets verwijderd, alleen verplaatst. J/N');
      if (!isJa(a)) return gestopt(0, 'Je koos nee. Dubbelklik eerst OPRUIMEN.bat, of start de uitrol opnieuw en kies J.');
      zeg(opruimVerslag(allesOpruimen(wortel, nu())));
      open = openVoorUitrol(wortel);
      if (open.aantal) return gestopt(0, `Na het opruimen staat er nog ${open.aantal} op de oude plek (zie hierboven). Vraag Claude.`);
    }
  } else zeg('Niets dat eerst weg of op een andere plek moet.');

  const ongelijk = afhankelijkhedenGelijk(wortel);
  if (ongelijk.length) {
    return gestopt(0, 'De geïnstalleerde onderdelen passen niet bij package-lock.json:',
      ...ongelijk.map((x) => `   ${x.naam}: geïnstalleerd ${x.heeft || 'niets'}, nodig ${x.wil}`),
      'Dubbelklik eerst NA-UPDATE-INSTALLEREN.bat en daarna opnieuw UITROLLEN.bat.');
  }

  /* ── 1 · geheimen ─────────────────────────────────────────────────────── */
  u.stap = 1;
  kop(1);
  const status = async () => {
    const r = await git(['-c', 'core.quotepath=false', 'status', '--porcelain=v1', '-z', '--untracked-files=all']);
    if (r.code !== 0) throw new Error(r.out);
    return leesStatus(r.out);
  };
  let items;
  try { items = await status(); } catch (e) { return gestopt(1, 'Git kon niet zeggen wat er veranderd is:', String(e.message).trim().slice(0, 400)); }
  u.bestanden = items;
  const fouten = geheimenControle(wortel, items);
  if (fouten.length) {
    return gestopt(1, 'Dit mag niet mee naar GitHub:', ...fouten.map((f) => `   ${f.pad}  —  ${f.waarom}`),
      'Haal het uit de projectmap (of laat Claude het in .gitignore zetten) en dubbelklik opnieuw.');
  }
  zeg(`In orde: ${items.length} gewijzigde bestand(en) nagekeken, geen geheimen, dumps of te grote bestanden.`);

  /* ── 2 · tests ────────────────────────────────────────────────────────── */
  u.stap = 2;
  kop(2);
  if (zonderTests) {
    zeg('(droog, zonder tests: de testreeks is overgeslagen)');
  } else {
    const browser = await (o.browserAanwezig || testBrowserAanwezig)(wortel);
    if (browser === false) {
      zeg('De testbrowser (Chromium voor Playwright) staat nog niet op deze pc. Zonder die browser kan een deel van de tests niet draaien.');
      const a = droog ? 'n' : await vraag('Nu installeren? Eenmalig, ongeveer 150 MB. J/N');
      if (!isJa(a)) return gestopt(2, 'De testbrowser ontbreekt, dus de testreeks kan niet draaien.', 'Start opnieuw en kies J om hem te installeren.');
      const inst = await run('npx', ['playwright', 'install', 'chromium'], { cwd: wortel, zichtbaar: true });
      if (inst.code !== 0) return gestopt(2, 'Het installeren van de testbrowser lukte niet (zie hierboven). Geef de melding aan Claude.');
    }
    const pkg = JSON.parse(fs.readFileSync(path.join(wortel, 'package.json'), 'utf8'));
    let totaal = 0;
    try { totaal = keten(pkg).length; } catch { /* dan zegt de testreeks zelf wat er mis is */ }
    const logPad = path.join(wortel, 'kladblok', 'uitrol-tests.txt');
    fs.mkdirSync(path.dirname(logPad), { recursive: true });
    const log = fs.createWriteStream(logPad);
    let teller = 0;
    let bezig = '';
    let rood = '';
    const t0 = Date.now();
    zeg(`De volledige testreeks (${totaal} stappen, eerst de build). Dit duurt een paar minuten.`);
    /* scripts/testreeks.mjs draait dezelfde keten als `npm test` (hij leest hem
       uit package.json), maar een paar tegelijk en zonder npm per test: punt 9.11. */
    const r = await run('node', [path.join('scripts', 'testreeks.mjs')], {
      cwd: wortel,
      opRegel: (regel) => {
        log.write(`${regel}\n`);
        const f = /^FOUT: (.+)$/.exec(regel.trim());
        if (f) rood = f[1];
        const m = /^\s*(\d+)\/(\d+)\s+(goed|FOUT)\s+(\S+)/.exec(regel);
        if (!m) return;
        teller = Number(m[1]);
        bezig = m[4];
        if (o.voortgang) process.stdout.write(`\r   ${String(teller).padStart(3)}/${m[2]}  ${bezig.padEnd(30)}`);
      },
    });
    await new Promise((res) => log.end(res));
    if (o.voortgang) process.stdout.write('\n');
    const duur = Math.round((Date.now() - t0) / 1000);
    u.testduur = duur;
    if (r.code !== 0) {
      const staart = r.out.split(/\r?\n/).filter(Boolean).slice(-25).map((x) => `   | ${x}`);
      return gestopt(2, `Een test faalt: ${rood || bezig || 'de build'} (na ${Math.floor(duur / 60)} min ${duur % 60} s).`,
        'De laatste regels:', ...staart,
        'Alles staat in kladblok\\uitrol-tests.txt. Geef dat bestand aan Claude.');
    }
    zeg(`Alles groen (${teller || totaal} stappen, ${Math.floor(duur / 60)} min ${duur % 60} s).`);
  }

  /* ── 3 · tonen wat meegaat ────────────────────────────────────────────── */
  u.stap = 3;
  kop(3);
  try { items = await status(); } catch (e) { return gestopt(3, 'Git kon niet zeggen wat er veranderd is:', String(e.message).trim().slice(0, 400)); }
  const laat = geheimenControle(wortel, items);
  if (laat.length) {
    return gestopt(3, 'Tijdens de tests is er iets bijgekomen dat niet mee mag:', ...laat.map((f) => `   ${f.pad}  —  ${f.waarom}`));
  }
  u.bestanden = items;

  /* GitHub vóór? Dan weigert de push straks, na een commit. Liever nu stoppen. */
  const haalOp = await git(['fetch', '--quiet', 'origin']);
  if (haalOp.code === 0) {
    const achter = await git(['rev-list', '--count', `HEAD..origin/${tak}`]);
    const n = parseInt(achter.out, 10);
    if (achter.code === 0 && n > 0) {
      return gestopt(3, `GitHub heeft ${n} commit(s) die nog niet op deze pc staan.`, 'Er is niets gedaan. Vraag Claude hoe die erbij komen.');
    }
  } else zeg('(GitHub was even niet te bereiken om te vergelijken; de push in stap 4 merkt het vanzelf.)');

  /* De migraties: de live-database vragen wat er al staat. */
  const migMap = path.join(wortel, 'migrations');
  let opGithubR = await git(['ls-tree', '-r', '--name-only', `origin/${tak}`, '--', 'migrations']);
  if (opGithubR.code !== 0) opGithubR = await git(['ls-tree', '-r', '--name-only', 'HEAD', '--', 'migrations']);
  const opGithub = new Set(opGithubR.code === 0 ? opGithubR.out.split(/\r?\n/).map((s) => s.split('/').pop()) : []);
  const migraties = fs.readdirSync(migMap).filter((f) => f.endsWith('.sql')).sort()
    .map((naam) => ({ naam, sql: fs.readFileSync(path.join(migMap, naam), 'utf8'), opGithub: opGithub.has(naam) }));
  let gewarmd = false;
  const schemaLezen = async () => {
    /* Eerst `whoami`: dat vernieuwt het inlogtoken (zie warmLogin in scripts/lib/wrangler.mjs). */
    if (!gewarmd) { gewarmd = true; await run('wrangler', ['whoami'], { cwd: wortel }); }
    const r = await run('wrangler', ['d1', 'execute', dbNaam(wortel), '--remote', '--json', '--command', SCHEMA_SQL], { cwd: wortel });
    if (r.code !== 0) return { fout: r.out };
    try {
      /* De JSON begint op een eigen regel met "[" en daarna "{". Niet de eerste "["
         in de uitvoer: een waarschuwing van wrangler ("▲ [WARNING] …") staat er
         vaak vóór, en die begint ook met een haak. */
      const m = /^\[\s*[{\]]/m.exec(r.out);
      const j = JSON.parse(r.out.slice(m ? m.index : r.out.indexOf('[')));
      return { schema: leesSchema(j?.[0]?.results || []) };
    } catch { return { fout: `onverwacht antwoord: ${r.out.slice(0, 300)}` }; }
  };
  let s = await schemaLezen();
  if (s.fout && /login|logged in|authenticat|non-interactive|CLOUDFLARE_API_TOKEN|10000|7403/i.test(s.fout) && !droog) {
    const a = await vraag('Wrangler is niet (meer) ingelogd bij Cloudflare. Nu inloggen? (er opent een browser) J/N');
    if (isJa(a)) {
      await run('wrangler', ['login'], { cwd: wortel, zichtbaar: true });
      s = await schemaLezen();
    }
  }
  if (s.fout) {
    /* Eerst de regels die de fout NOEMEN ("text" in de JSON van wrangler), dan
       het einde: alleen het einde liet op 14 oktober "code": 7500 zien, maar niet
       waarom. */
    const foutRegels = String(s.fout).trim().split(/\r?\n/);
    const noemt = foutRegels.filter((x) => /"text"|✘|\[ERROR\]/.test(x)).slice(0, 4);
    return gestopt(3, 'Kon de live-database niet lezen, dus ook niet zeggen welke migraties nieuw zijn.',
      ...[...noemt, ...foutRegels.slice(-4)].map((x) => `   | ${x}`), 'Er is niets gedaan. Probeer het over een paar minuten opnieuw, of geef dit aan Claude.');
  }
  const vergeleken = vergelijkMigraties(migraties, s.schema);
  const ombouw = vergeleken.filter((m) => m.status === 'ombouw');
  if (ombouw.length) {
    return gestopt(3, `Deze migratie bouwt een tabel om, en dat doet de knop nooit: ${ombouw.map((m) => m.naam).join(', ')}.`, 'Er is niets gedaan. Vraag Claude.');
  }
  u.nieuweMigraties = vergeleken.filter((m) => m.status === 'nieuw');

  zeg(toonBestanden(items));
  zeg('');
  if (!u.nieuweMigraties.length) zeg('Nieuwe migraties: geen');
  else {
    zeg(`Nieuwe migraties voor de live-database (${u.nieuweMigraties.length}):`);
    for (const m of u.nieuweMigraties) {
      zeg(`   ${m.naam}${m.lang ? '   (stond al op GitHub, maar is nooit op live gedraaid)' : ''}`);
      zeg(`      ${m.mist.slice(0, 4).join(', ')}${m.mist.length > 4 ? ` en nog ${m.mist.length - 4}` : ''}`);
    }
    zeg('   Let op: TERUGDRAAIEN.bat zet de site terug, NIET de database. Migraties voegen alleen toe.');
  }
  if (tak !== 'main') zeg(`\nLet op: je staat op tak "${tak}", niet op main.`);
  zeg('');
  const leeg = !items.length && !u.nieuweMigraties.length;
  const antwoord = await vraag(leeg ? 'Er is niets nieuws. Toch opnieuw live zetten en nakijken? J/N' : 'Doorgaan? J/N');
  if (!isJa(antwoord)) return gestopt(3, 'Je koos nee.');

  /* ── 4 · commit en push ───────────────────────────────────────────────── */
  u.stap = 4;
  kop(4);
  const eerdere = (await git(['log', '-20', '--format=%B%x00'])).out.split('\0');
  const bericht = commitBericht(wortel, eerdere, nu());
  if (droog) {
    zeg(`(droog) zou committen met bericht uit ${bericht.bron}: "${bericht.tekst.split('\n')[0]}"`);
    zeg(`(droog) zou pushen naar origin/${tak}`);
  } else {
    if (items.length) {
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'visuails-uitrol-'));
      try {
        const lijst = path.join(tmp, 'paden');
        fs.writeFileSync(lijst, stagePaden(items).join('\0'));
        const add = await git(['--literal-pathspecs', 'add', '-A', `--pathspec-from-file=${lijst}`, '--pathspec-file-nul']);
        if (add.code !== 0) return gestopt(4, 'Git kon de bestanden niet klaarzetten:', add.out.trim().slice(0, 400), 'Er is niets live gezet.');
        const msg = path.join(tmp, 'bericht');
        fs.writeFileSync(msg, `${bericht.tekst}\n`);
        const c = await git(['commit', '-F', msg]);
        if (c.code !== 0) return gestopt(4, 'De commit lukte niet:', c.out.trim().slice(0, 400), 'Er is niets live gezet.');
      } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
      }
      u.commit = (await git(['rev-parse', '--short', 'HEAD'])).out.trim();
      zeg(`Commit ${u.commit}: "${bericht.tekst.split('\n')[0]}" (bericht uit ${bericht.bron}).`);
    } else zeg('Geen gewijzigde bestanden: geen nieuwe commit.');
    const p = await git(['push', '-u', 'origin', tak], { zichtbaar: true });
    if (p.code !== 0) {
      return gestopt(4, 'Pushen naar GitHub lukte niet (zie de melding hierboven).',
        u.commit ? 'De commit staat op deze pc, niet op GitHub. Er is niets live gezet; dubbelklik later opnieuw.' : 'Er is niets live gezet.');
    }
    zeg('Op GitHub gezet.');
  }

  /* ── 5 · migraties ────────────────────────────────────────────────────── */
  u.stap = 5;
  kop(5);
  if (!u.nieuweMigraties.length) zeg('Geen nieuwe migraties.');
  else if (droog) zeg(`(droog) zou draaien: node scripts/migrate.mjs ${u.nieuweMigraties.map((m) => m.naam.slice(0, 4)).join(' ')}`);
  else {
    const m = await run('node', [path.join('scripts', 'migrate.mjs'), ...u.nieuweMigraties.map((x) => x.naam.slice(0, 4))], { cwd: wortel, zichtbaar: true });
    if (m.code !== 0) {
      return gestopt(5, 'Een migratie lukte niet (zie hierboven). De site draait nog de vorige versie.',
        'Je code staat wel op GitHub. Dubbelklik later opnieuw: wat al gedraaid is, wordt overgeslagen.');
    }
    /* Nakijken, niet aannemen: staan de kolommen er nu echt? */
    const na = await schemaLezen();
    const nogNieuw = na.schema ? vergelijkMigraties(migraties, na.schema).filter((x) => x.status !== 'staat-er' && u.nieuweMigraties.some((y) => y.naam === x.naam) && x.mist.some((z) => !z.startsWith('werkt alleen'))) : [];
    if (na.fout) return gestopt(5, 'De migraties zijn gedraaid, maar de database was daarna niet te lezen om het na te kijken. Dubbelklik opnieuw.');
    if (nogNieuw.length) return gestopt(5, `Na het draaien mist er nog iets: ${nogNieuw.map((x) => `${x.naam} (${x.mist.join(', ')})`).join('; ')}.`, 'Er is niets live gezet. Vraag Claude.');
    u.migratiesGedraaid = true;
    zeg(`Gedraaid en nagekeken: ${u.nieuweMigraties.map((x) => x.naam).join(', ')}.`);
  }

  /* ── 6 · site live ────────────────────────────────────────────────────── */
  u.stap = 6;
  kop(6);
  if (droog) zeg('(droog) zou draaien: npm run deploy');
  else {
    const d = await run('npm', ['run', 'deploy'], { cwd: wortel, zichtbaar: true });
    if (d.code !== 0) {
      return gestopt(6, 'De site kon niet live gezet worden (zie hierboven). Bezoekers zien nog de vorige versie.',
        ...(u.migratiesGedraaid ? ['De nieuwe migraties staan wel al in de database; dat kan geen kwaad, de oude site gebruikt ze niet.'] : []),
        'Dubbelklik later opnieuw, of geef de melding aan Claude.');
    }
  }

  /* ── 7 · nachtwerk live ───────────────────────────────────────────────── */
  u.stap = 7;
  kop(7);
  if (droog) zeg('(droog) zou draaien: npm run cron:deploy');
  else {
    const c = await run('npm', ['run', 'cron:deploy'], { cwd: wortel, zichtbaar: true });
    if (c.code !== 0) { u.stap = 7; return klaar('cron-niet'); }
  }

  /* ── 8 · nakijken ─────────────────────────────────────────────────────── */
  u.stap = 8;
  kop(8);
  if (droog) { zeg('(droog) zou zes adressen op visuails.com nakijken.'); return klaar('droog'); }
  u.adressen = await kijkNa({ haal, wortel, wacht });
  for (const a of u.adressen) zeg(`   ${a.goed ? 'goed ' : 'FOUT '} ${a.naam.padEnd(26)} ${a.pad.padEnd(44)} ${a.uitleg}`);
  if (u.adressen.some((a) => !a.goed)) return klaar('nakijk-rood');
  return klaar('live');
}

/** De naam van de database uit wrangler.toml (zelfde bron als migrate.mjs). */
function dbNaam(wortel) {
  const toml = fs.readFileSync(path.join(wortel, 'wrangler.toml'), 'utf8');
  const m = /database_name\s*=\s*"([^"]+)"/.exec(toml);
  return m ? m[1] : 'visuails';
}

/** Het eindscherm: één kop in hoofdletters, daaronder wat er moet gebeuren. */
export function eindscherm(r, nu) {
  const streep = '='.repeat(64);
  const wanneer = datumKort(nu);
  let kop;
  let onder = r.regels || [];
  if (r.uitkomst === 'live') {
    kop = `LIVE EN NAGEKEKEN · ${wanneer}`;
    onder = ['Site, nachtwerk en zes adressen: alles in orde.'];
  } else if (r.uitkomst === 'droog') {
    kop = `PROEFRIT KLAAR · ${wanneer} — er is niets bewaard of live gezet`;
  } else if (r.uitkomst === 'cron-niet') {
    kop = 'SITE LIVE, NACHTWERK NIET — klik nog een keer';
    onder = ['De site is bijgewerkt; het nachtwerk (cron) draait nog de vorige versie.', 'Dubbelklik UITROLLEN.bat nog een keer; hij slaat over wat al gedaan is.'];
  } else if (r.uitkomst === 'nakijk-rood') {
    kop = `LIVE, MAAR NIET ALLES GOED · ${wanneer}`;
    onder = [
      ...r.adressen.filter((a) => !a.goed).map((a) => `   ${a.naam}: ${a.uitleg}  (${SITE}${a.pad.split('?')[0]})`),
      'Kijk zelf even op visuails.com. Is de site echt stuk, dubbelklik dan TERUGDRAAIEN.bat',
      'en geef deze melding aan Claude.',
    ];
  } else {
    kop = `GESTOPT BIJ STAP ${r.stap} — er is niets live gezet`;
  }
  return [streep, `  ${kop}`, streep, ...onder].join('\n');
}

/** Eén regel in kladblok/uitrol-log.txt. */
export function logRegel(r, nu) {
  const wat = {
    live: 'LIVE EN NAGEKEKEN', 'cron-niet': 'SITE LIVE, NACHTWERK NIET', 'nakijk-rood': 'LIVE, NAKIJKEN ROOD',
    gestopt: `GESTOPT BIJ STAP ${r.stap}`, droog: 'PROEFRIT', terug: 'TERUGGEDRAAID', 'terug-mislukt': 'TERUGDRAAIEN MISLUKT',
  }[r.uitkomst] || r.uitkomst;
  const delen = [datumLog(nu), wat];
  if (r.commit) delen.push(`commit ${r.commit}`);
  if (r.bestanden) delen.push(`${r.bestanden.length} bestand(en)`);
  if (r.nieuweMigraties) delen.push(`migraties: ${r.nieuweMigraties.length ? r.nieuweMigraties.map((m) => m.naam).join(', ') : 'geen'}`);
  if (r.adressen?.length) delen.push(`adressen ${r.adressen.filter((a) => a.goed).length}/${r.adressen.length}`);
  if (r.uitkomst === 'gestopt' && r.regels?.[0]) delen.push(r.regels[0].trim().slice(0, 120));
  return delen.join('  ·  ');
}

export function schrijfLog(wortel, r, nu) {
  const p = path.join(wortel, 'kladblok', 'uitrol-log.txt');
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const kop = fs.existsSync(p) ? '' : 'Elke keer dat UITROLLEN.bat of TERUGDRAAIEN.bat draaide, één regel (nieuwste onderaan).\r\n\r\n';
  fs.appendFileSync(p, `${kop}${logRegel(r, nu)}\r\n`);
}

/* ═══════════════════════════════════════════════════════════════════════════
 * TERUGDRAAIEN
 * ═══════════════════════════════════════════════════════════════════════════ */

export async function terugdraaien({ wortel, run, vraag, zeg = (s) => console.log(s), nu = () => new Date() }) {
  zeg([
    'Dit zet de SITE terug naar de versie van vóór de laatste uitrol.',
    '',
    'Wat NIET teruggaat:',
    '  · de database: migraties blijven staan (ze voegen alleen toe, dus de oude site werkt ermee);',
    '  · het nachtwerk (cron): dat draait door op de nieuwste versie;',
    '  · GitHub: je code blijft daar staan zoals hij is.',
    '',
    'Eén keer klikken is genoeg. Daarna: geef Claude de melding van wat er stuk was.',
  ].join('\n'));
  const a = await vraag('\nDe site terugzetten? J/N');
  if (!isJa(a)) { zeg('Niets gedaan.'); return { uitkomst: 'niets' }; }
  const naam = (/^\s*name\s*=\s*"([^"]+)"/m.exec(fs.readFileSync(path.join(wortel, 'wrangler.toml'), 'utf8')) || [])[1] || 'visuails-site';
  const r = await run('wrangler', ['rollback', '--name', naam, '--message', 'Teruggezet met TERUGDRAAIEN.bat', '--yes'], { cwd: wortel, zichtbaar: true });
  const uit = { uitkomst: r.code === 0 ? 'terug' : 'terug-mislukt' };
  schrijfLog(wortel, uit, nu());
  const streep = '='.repeat(64);
  zeg(r.code === 0
    ? `${streep}\n  SITE TERUGGEZET · ${datumKort(nu())}\n${streep}\nKijk op visuails.com of het weer goed is. De database is niet veranderd.`
    : `${streep}\n  TERUGZETTEN LUKTE NIET\n${streep}\nZie de melding hierboven en geef die aan Claude. Er is niets veranderd.`);
  return uit;
}

/* ═══════════════════════════════════════════════════════════════════════════ */

const hierAangeroepen = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (hierAangeroepen) {
  const args = process.argv.slice(2);
  const wortel = path.resolve(HIER, '..');
  const basis = { wortel, run: echteRun, vraag: echteVraag, haal: (...x) => fetch(...x) };
  if (args[0] === 'terugdraaien') {
    const r = await terugdraaien(basis);
    process.exitCode = r.uitkomst === 'terug-mislukt' ? 1 : 0;
  } else {
    const r = await uitrollen({ ...basis, droog: args.includes('--droog'), zonderTests: args.includes('--zonder-tests'), voortgang: Boolean(process.stdout.isTTY) });
    process.exitCode = r.uitkomst === 'live' || r.uitkomst === 'droog' ? 0 : 1;
  }
}
