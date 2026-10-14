/* ── DE ONDERDELEN VAN DE BACK-UP DIE GEEN WRANGLER NODIG HEBBEN — 8 oktober 2026 (9.04)
 *
 * scripts/backup.mjs en scripts/terugzetten.mjs praten met Cloudflare; wat ze
 * beslissen — welke tabellen mee mogen, waar de kopie heen gaat, of een dump
 * deugt, welke oude sets weg mogen — staat hier, los te testen zonder netwerk
 * (tests/backup-terugzet.test.mjs).
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

/* ── ZONDER INLOGGEHEIMEN ────────────────────────────────────────────────────
 *
 * Een onversleutelde dump met de wachtwoordhash én het TOTP-geheim van /admin
 * geeft wie hem vindt ook de tweede factor. Daarom gaan deze tabellen LEEG mee:
 * hun opbouw staat in de dump (een teruggezette database heeft dus alle
 * tabellen), hun inhoud niet.
 *
 *   admin_users           wachtwoordhash en TOTP-geheim van /admin
 *   admin_recovery_codes  de herstelcodes van /admin
 *   admin_sessions        ingelogde /admin-sessies
 *   account_sessions      ingelogde Studio-sessies
 *   account_tokens        inlogcodes en -links van Studio (een code van zes
 *                         cijfers is ook gehasht in een middag te raden)
 *   rate_limits           tellers per gehasht ip-adres; vluchtig en privé
 *
 * WAAROM WEGLATEN EN NIET APART VERSLEUTELEN. Versleutelen vraagt een sleutel,
 * en die moet dan ergens staan waar het script hem kan lezen — op dezelfde
 * pc, dus naast de dump. Weglaten is eenvoudiger en even veilig: na een herstel
 * log je opnieuw in (Studio-klanten vragen een nieuwe code) en zet je je eigen
 * adminaccount opnieuw neer met scripts/hash-admin-password.mjs; zie
 * scripts/TERUGZETTEN.txt. Er gaat niets verloren wat niet opnieuw te maken is.
 *
 * Wat WEL meegaat en op een geheim lijkt: order_tokens en email_changes bevatten
 * gehashte willekeurige tokens van 256 bit (niet te raden, ook niet met de
 * hash), en zonder order_tokens werken de privélinks in de mails van klanten
 * na een herstel niet meer. app_settings bevat de zouten voor ip- en
 * betalerhashes; zonder die zouten herkent de site na een herstel een tweede
 * proef niet meer. customers.password_hash wordt nergens gevuld (er is geen
 * klantwachtwoord); de controle hieronder slaat alarm als dat ooit verandert.
 */
export const GEHEIME_TABELLEN = [
  'admin_users',
  'admin_recovery_codes',
  'admin_sessions',
  'account_sessions',
  'account_tokens',
  'rate_limits',
];

/** De tabellen waarvan de INHOUD mee mag, uit de lijst die sqlite_master geeft. */
export function tabellenVoorDump(namen) {
  return [...new Set((namen || []).map(String))]
    .filter((n) => n && !n.startsWith('_cf_') && !GEHEIME_TABELLEN.includes(n))
    .filter((n) => n === 'sqlite_sequence' || !n.startsWith('sqlite_'))
    .sort();
}

/* ── WAAR DE KOPIE HEEN GAAT ─────────────────────────────────────────────────
 *
 * Lucas koos (V6 = c): Google Drive. De map staat op één regel in
 * backups/BESTEMMING.txt (dat schrijft BACKUP.bat bij "instellen"), zodat het
 * pad niet in de code of in git staat. Volgorde: --naar <map>, dan de
 * omgevingsvariabele VISUAILS_BACKUP_MAP, dan BESTEMMING.txt, en anders de oude
 * plek backups/ in de projectmap.
 *
 * STAAT DE DRIVE-MAP ER NIET (Drive niet gestart, schijfletter anders), dan
 * schrijft het script NIET stil ergens anders heen: het maakt de kopie in
 * backups/ en zegt dat luid, in het logboek én in de regel die /admin toont. Een
 * back-up op de verkeerde plek is beter dan geen back-up; een back-up op de
 * verkeerde plek waar niemand van weet is dat niet.
 */
export function leesBestemmingBestand(bestand) {
  try {
    const regel = fs.readFileSync(bestand, 'utf8').split(/\r?\n/).map((r) => r.trim()).find((r) => r && !r.startsWith('#'));
    return regel || null;
  } catch {
    return null;
  }
}

export function kiesBestemming({ root, argv = [], env = process.env, bestaat = fs.existsSync } = {}) {
  const lokaal = path.join(root, 'backups');
  const i = argv.indexOf('--naar');
  const gevraagd = (i !== -1 && argv[i + 1]) || env.VISUAILS_BACKUP_MAP || leesBestemmingBestand(path.join(lokaal, 'BESTEMMING.txt'));
  if (!gevraagd) return { map: lokaal, waar: 'lokaal', reden: 'nog geen Drive-map ingesteld (BACKUP.bat, keuze 1)' };
  if (!bestaat(gevraagd)) return { map: lokaal, waar: 'lokaal', reden: `de map ${gevraagd} bestaat niet (staat Google Drive aan?)`, gevraagd };
  return { map: gevraagd, waar: 'drive', reden: null };
}

/** De map Prompts (9.04): mee in elke back-up. Op Lucas' pc C:\Users\Gebruiker\VISUAILS\Prompts. */
export function promptsMap(env = process.env) {
  return env.VISUAILS_PROMPTS_MAP || path.join(os.homedir(), 'VISUAILS', 'Prompts');
}

/** Een map recursief kopiëren; geeft aantal bestanden en bytes terug. */
export function kopieerMap(bron, doel) {
  let bestanden = 0;
  let bytes = 0;
  const loop = (van, naar) => {
    fs.mkdirSync(naar, { recursive: true });
    for (const e of fs.readdirSync(van, { withFileTypes: true })) {
      const a = path.join(van, e.name);
      const b = path.join(naar, e.name);
      if (e.isDirectory()) loop(a, b);
      else if (e.isFile()) { fs.copyFileSync(a, b); bestanden += 1; bytes += fs.statSync(a).size; }
    }
  };
  loop(bron, doel);
  return { bestanden, bytes };
}

/* ── DE CONTROLE NA ELKE DUMP ─────────────────────────────────────────────────
 *
 * Een export die geslaagd heet maar niet terug te lezen is, ontdek je pas op de
 * dag dat je hem nodig hebt. Dus wordt elke dump meteen ingelezen in een lege
 * SQLite-database in het geheugen (D1 ís SQLite): alles moet zonder fout laden,
 * PRAGMA integrity_check moet "ok" zeggen, en per tabel worden de rijen geteld.
 * Daarbij twee eisen die de belofte van deze back-up bewaken: de geheime
 * tabellen zijn leeg, en customers.password_hash is overal leeg.
 *
 * Foreign keys staan bij het inlezen UIT: de dump zet tabellen in alfabetische
 * volgorde neer, niet in de volgorde van hun verwijzingen. Daarna telt
 * PRAGMA foreign_key_check hoeveel verwijzingen nergens heen wijzen; dat is een
 * waarschuwing en geen fout (een klant die gewist is terwijl een oude rij nog
 * naar hem wijst, kan in de echte database ook bestaan).
 *
 * node:sqlite zit in Node 22.13 en later. Ontbreekt het, dan is de dump er wel
 * maar ongecontroleerd, en zegt de regel in /admin dat.
 */
export async function controleerDump(sql) {
  let DatabaseSync;
  try {
    ({ DatabaseSync } = await import('node:sqlite'));
  } catch {
    return { ok: false, reden: 'node:sqlite ontbreekt (Node 22.13 of nieuwer nodig)', tabellen: 0, rijen: 0, perTabel: {} };
  }
  const db = new DatabaseSync(':memory:', { enableForeignKeyConstraints: false });
  try {
    db.exec(sql);
  } catch (err) {
    return { ok: false, reden: `de dump laadt niet: ${String(err?.message || err).slice(0, 160)}`, tabellen: 0, rijen: 0, perTabel: {} };
  }
  const integriteit = db.prepare('PRAGMA integrity_check').all().map((r) => Object.values(r)[0]).join('; ');
  const namen = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' ORDER BY name").all().map((r) => r.name);
  const perTabel = {};
  let rijen = 0;
  for (const n of namen) {
    const c = Number(db.prepare(`SELECT COUNT(*) AS n FROM "${n.replace(/"/g, '""')}"`).get().n) || 0;
    perTabel[n] = c;
    rijen += c;
  }
  const lekken = GEHEIME_TABELLEN.filter((t) => perTabel[t] > 0);
  let klantHash = 0;
  try { klantHash = Number(db.prepare('SELECT COUNT(*) AS n FROM customers WHERE password_hash IS NOT NULL').get().n) || 0; } catch { klantHash = 0; }
  let wezen = 0;
  try { wezen = db.prepare('PRAGMA foreign_key_check').all().length; } catch { wezen = 0; }
  db.close();
  const fouten = [];
  if (integriteit !== 'ok') fouten.push(`integrity_check: ${integriteit.slice(0, 120)}`);
  if (lekken.length) fouten.push(`inloggeheimen in de dump: ${lekken.join(', ')}`);
  if (klantHash) fouten.push(`customers.password_hash is ${klantHash}x gevuld`);
  return {
    ok: fouten.length === 0,
    reden: fouten.join('; ') || null,
    tabellen: namen.length,
    rijen,
    perTabel,
    wezen,
  };
}

/**
 * De regel voor app_settings.backup_check, die /admin naast de back-upchip zet.
 * Alleen ASCII en geen dubbele aanhalingstekens: hij gaat als --command mee
 * naar wrangler, en op Windows kan dat via cmd.exe (zie lib/wrangler.mjs).
 */
export function controleRegel(c, { waar, reden, prompts, map = '' } = {}) {
  const delen = [];
  if (c?.ok) delen.push(`gecontroleerd, ${c.tabellen} tabellen, ${c.rijen} rijen`);
  else delen.push(`NIET gecontroleerd: ${String(c?.reden || 'onbekend')}`);
  /* 'drive' betekent: de ingestelde map. Heet die map niet naar Drive (een
     USB-schijf, later), dan zegt de regel dat ook niet. */
  delen.push(waar === 'drive'
    ? (/drive/i.test(map) || !map ? 'in Google Drive' : 'in de ingestelde map')
    : `LOKAAL op de pc${reden ? ` (${reden})` : ''}`);
  if (prompts) delen.push(prompts.bestanden !== null ? `prompts mee (${prompts.bestanden} bestanden)` : `prompts NIET mee (${prompts.reden})`);
  /* Geen aanhalingstekens (de aanroeper zet hem tussen '…' in SQL) en geen
     tekens buiten ASCII (cmd.exe en zijn codepagina). */
  return delen.join(' | ').replace(/["'\r\n]/g, '').replace(/[^\x20-\x7E]/g, '?');
}

/* ── OPRUIMEN: ALLEEN WAT ECHT EEN SET IS ────────────────────────────────────
 *
 * Een set is alles wat met dezelfde tijdstempel begint ("2026-10-11-1300-…").
 * Hiervoor telde elk bestand in de map als set naar zijn eerste zestien tekens,
 * dus ook _log en BESTEMMING.txt; dat die nooit weg gingen, kwam alleen doordat
 * ze alfabetisch achteraan stonden. Nu telt alleen wat de vorm van een stempel
 * heeft, en blijft al het andere altijd staan (LEESMIJ-TERUGZETTEN.txt ook). */
const SET = /^(\d{4}-\d{2}-\d{2}-\d{4})-/;
export function setsOmWegTeDoen(namen, houden) {
  const sets = [...new Set((namen || []).map((n) => SET.exec(n)?.[1]).filter(Boolean))].sort();
  if (!Number.isInteger(houden) || houden <= 0) return [];
  return sets.slice(0, Math.max(0, sets.length - houden));
}
export function hoortBijSet(naam, set) {
  return SET.exec(naam)?.[1] === set;
}

/** De nieuwste dump in een map, of null. */
export function nieuwsteDump(map) {
  try {
    const d = fs.readdirSync(map).filter((n) => /^\d{4}-\d{2}-\d{2}-\d{4}-d1\.sql$/.test(n)).sort();
    return d.length ? path.join(map, d[d.length - 1]) : null;
  } catch {
    return null;
  }
}
