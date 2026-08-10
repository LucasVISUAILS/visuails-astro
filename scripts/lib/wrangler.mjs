/* Wrangler aanroepen vanuit een script, op Windows én elders.
 *
 * WAAROM DIT BESTAAT — `spawn npx ENOENT` op Windows, 6 augustus 2026.
 *
 * Twee scripts riepen wrangler aan met `execFile('npx', ['wrangler', ...])`.
 * Op macOS en Linux werkt dat. Op Windows niet, en het faalt op een manier die
 * er niet uitziet als het probleem dat het is: `npx` bestaat daar niet als
 * uitvoerbaar bestand, alleen als `npx.cmd`, en sinds de patch voor
 * CVE-2024-27980 (Node 18.20 / 20.12 / 21.7 en later) weigert Node een `.cmd`
 * of `.bat` te starten zonder `shell: true`. Het resultaat is een kale
 * `spawn npx ENOENT` — geen woord over wrangler, geen woord over Windows.
 *
 * Dat maakte scripts/check-wrangler.mjs stuk op precies de machine waarvoor het
 * geschreven was: een diagnose die zelf niet kan draaien, meldt "geen 7403
 * gevonden" en stuurt je de verkeerde kant op. En het betekent dat
 * `npm run fetch:order` op Windows nooit bij de 7403 kán zijn gekomen — het
 * struikelde eerder.
 *
 * DE OPLOSSING, en waarom niet zomaar `shell: true` overal. Met een shell erbij
 * hervormt Windows de argumentenlijst tot één regel tekst die cmd.exe opnieuw
 * uit elkaar haalt, en dan gaan aanhalingstekens en `&` in een argument een
 * eigen leven leiden. Dus: de shell alleen op Windows, waar hij nodig is, en
 * elk argument dat van buiten komt eerst gecontroleerd door de aanroeper
 * (zie assertSafeArg hieronder) in plaats van erop te vertrouwen dat het
 * meevalt.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';

const run = promisify(execFile);
const require = createRequire(import.meta.url);

const isWindows = process.platform === 'win32';
const NPX = isWindows ? 'npx.cmd' : 'npx';

/**
 * Wrangler's eigen JS-startbestand, als het lokaal geïnstalleerd is.
 *
 * WAAROM DIT DE BETERE WEG IS. De npx-route hierboven heeft de shell nodig op
 * Windows, en Node waarschuwt daar sinds DEP0190 terecht voor: met `shell: true`
 * worden argumenten niet ge-escaped maar aan elkaar geplakt, dus de shell mag
 * ze opnieuw interpreteren. Draai je in plaats daarvan `node <pad>/wrangler.js`,
 * dan is er geen `.cmd`, geen shell, geen waarschuwing en geen hervorming van de
 * argumentenlijst — Node geeft ze door zoals ze zijn.
 *
 * Het kost wel een `npm i -D wrangler`. Zolang die er niet is valt alles terug
 * op npx, want een script dat pas werkt na een installatie is een script dat op
 * het verkeerde moment stukgaat. Twee wegen, dezelfde uitkomst, en de betere
 * wint zodra hij beschikbaar is.
 *
 * Dat vastzetten is los daarvan de moeite waard: `npx wrangler` haalt bij elke
 * aanroep de nieuwste versie op, dus een commando dat vorige week werkte kan
 * vandaag anders reageren zonder dat er iets in deze repo veranderd is.
 */
function localWrangler() {
  for (const entry of ['wrangler/bin/wrangler.js', 'wrangler']) {
    try { return require.resolve(entry); } catch { /* niet geïnstalleerd */ }
  }
  return null;
}

const LOCAL = localWrangler();

/**
 * Weiger alles wat een shell anders zou kunnen lezen dan als tekst.
 *
 * Alleen nodig omdat Windows een shell in de weg heeft staan, maar het wordt
 * overal toegepast: een controle die op één platform aan staat, is een controle
 * waarvan niemand weet of hij werkt.
 *
 * @param {string} value @param {string} what — voor de foutmelding
 */
export function assertSafeArg(value, what = 'argument') {
  if (typeof value !== 'string' || !value.length) {
    throw new Error(`${what} ontbreekt`);
  }
  if (/[&|;<>^"'`$\\\r\n]/.test(value)) {
    throw new Error(`${what} bevat een teken dat hier niet mag: ${JSON.stringify(value)}`);
  }
}

/**
 * Draai wrangler en geef alles terug — ook als het misgaat.
 *
 * Gooit niet bij een niet-nul exitcode; de aanroepers hier willen juist de
 * fouttekst kunnen lezen (dat is het hele punt van de diagnose). Wie wél wil
 * dat het gooit, kijkt naar `ok`.
 *
 * @param {string[]} argv       argumenten ná `wrangler`
 * @param {object}  [opts]
 * @param {NodeJS.ProcessEnv} [opts.env]
 * @param {number}  [opts.maxBuffer]
 * @returns {Promise<{ok: boolean, out: string, stdout: string}>}
 */
/**
 * Een argument zó opschrijven dat cmd.exe het als ÉÉN argument teruggeeft.
 *
 * WAAROM DIT ERBIJ MOEST — 7 augustus 2026. Het scriptje dat migraties draait
 * gaf `--command SELECT name FROM pragma_table_info('files')` mee, en wrangler
 * antwoordde met "Unknown arguments: name, FROM, pragma_table_info('files')".
 * Dat is de valkuil die bovenaan dit bestand al beschreven staat, van de andere
 * kant: met `shell: true` plakt Windows de argumentenlijst tot één regel tekst
 * die cmd.exe daarna zelf opnieuw uit elkaar haalt — en dan is elke spatie in
 * een argument een nieuwe scheiding. De waarschuwing stond er dus wel, maar de
 * bescherming niet.
 *
 * Alleen aanhalingstekens eromheen is genoeg voor wat hier langskomt (SQL,
 * paden, databasenamen); een ingesloten " wordt verdubbeld, wat cmd.exe als een
 * letterlijke " leest. Percenttekens blijven ongemoeid — die worden alleen
 * uitgebreid in een .bat-bestand, niet op deze aanroeplaag.
 */
function quoteForCmd(value) {
  const v = String(value);
  return /[\s"&|<>^()]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/**
 * Eén SQL-opdracht op één regel zetten — maar niet binnen een string.
 *
 * ── WAAROM DIT HIER STAAT EN NIET IN MIGRATE.MJS ────────────────────────────
 *
 * Dit stond in scripts/migrate.mjs, want daar werd het op 7 augustus 2026 uit nood
 * geschreven: `--command` wil één argument zonder regeleindes, en de SQL in
 * migrations/ staat over meerdere regels omdat dat leesbaar is.
 *
 * Op 10 augustus 2026 bleek waarom het daar niet hoort. `npm run backup -- --files`
 * meldde "inventaris van de bestanden… leeg of mislukt" en haalde geen enkel object
 * op. De inventarisquery in backup.mjs staat over twee regels, precies zoals de SQL
 * in migrations/, en die ging rechtstreeks naar `--command`. assertSafeArg() hierboven
 * — de controle uit dit bestand zelf — weigert `\r` en `\n` met zoveel woorden; dat
 * aanroepen deed backup.mjs niet. De regel stond dus wél in het project, één bestand
 * verderop, en het aanroeppunt kende hem niet.
 *
 * Elke plek die `--command` gebruikt heeft dit nodig. Dan hoort het bij de laag die
 * wrangler aanroept, niet bij het script dat er het eerst tegenaan liep.
 *
 * ── WAT HIER NIET MAG GEBEUREN ──────────────────────────────────────────────
 *
 * Witruimte weghalen die BINNEN een tekstwaarde staat. `DEFAULT 'nl_standard'`
 * overleeft dat prima, maar de dag dat er een DEFAULT met twee spaties of een
 * regeleinde in komt, zou dit stilletjes een andere waarde de database in schrijven.
 * Daarom telt dit aanhalingstekens mee en geeft het `null` terug zodra het niet zeker
 * weet wat het aan het inkorten is. `null` betekent: doe het via een bestand.
 */
export function oneLine(stmt) {
  let out = '';
  let inString = false;
  let space = false;
  for (let i = 0; i < stmt.length; i++) {
    const ch = stmt[i];
    if (inString) {
      // Een regeleinde binnen een tekstwaarde is deel van die waarde. Dat is
      // niet in te korten, dus dan valt de hele opdracht terug op een bestand.
      if (ch === '\n' || ch === '\r') return null;
      out += ch;
      if (ch === "'") {
        if (stmt[i + 1] === "'") { out += "'"; i++; } else { inString = false; }
      }
      continue;
    }
    if (ch === "'") {
      if (space) { out += ' '; space = false; }
      inString = true;
      out += ch;
      continue;
    }
    if (/\s/.test(ch)) { if (out) space = true; continue; }
    if (space) { out += ' '; space = false; }
    out += ch;
  }
  // Een aanhalingsteken dat nooit dichtgaat betekent dat dit iets anders is dan
  // wat ik denk dat het is. Niet inkorten.
  return inString ? null : out;
}

/**
 * Wanneer --command niet meer kan.
 *
 * cmd.exe knipt een commandoregel af rond 8191 tekens, en dan krijg je geen
 * foutmelding maar een half statement. De langste opdracht in migrations/ is 445
 * tekens, dus 6000 is ruim — en als er ooit een backfill komt die er overheen
 * gaat, gaat die via een bestand in plaats van kapot.
 *
 * Een " in de SQL gaat ook naar het bestand. quoteForCmd() verdubbelt hem, en
 * hoe cmd.exe een verdubbelde " binnen een geciteerd argument leest hangt af van
 * waar hij staat. Geen enkele migratie gebruikt ze (SQLite accepteert " voor
 * kolomnamen, maar hier staat overal gewone tekst), dus dit kost niets.
 */
export const CMD_MAX = 6000;

/**
 * Kan deze SQL als `--command` mee, of moet hij via een bestand?
 *
 * Geeft de ingekorte regel terug, of `null`. Eén plek voor de drie voorwaarden, zodat
 * een nieuw aanroeppunt ze niet opnieuw hoeft te bedenken — en dat is precies wat er
 * met backup.mjs gebeurde.
 */
export function asCommandArg(sql) {
  const line = oneLine(sql);
  if (!line || line.length > CMD_MAX || line.includes('"')) return null;
  return line;
}

/**
 * Het argument ná `--command` inkorten, waar de aanroeper dat vergeet.
 *
 * ── WAAROM DIT HIER GEBEURT EN NIET BIJ DE AANROEPER — 10 AUGUSTUS 2026 ─────
 *
 * Ik repareerde scripts/backup.mjs door de query door asCommandArg() te halen, en keek
 * daarna naar de andere aanroeppunten. Drie van de vier gaven meerregelige SQL mee:
 *
 *   scripts/backup.mjs      de inventaris  — meldde "leeg of mislukt", haalde niets op
 *   scripts/fetch-order.mjs listUploads()  — een template over vier regels
 *   scripts/deliver.mjs     query()        — geeft door wat de aanroeper aanlevert
 *
 * Alleen migrate.mjs deed het goed, en dat is het bestand waar de regel geschreven is.
 * Een regel die drie van de vier keer vergeten wordt, is geen regel maar een valkuil.
 * De vierde keer dat ik in dit project iets tegenkwam dat al opgelost was, is het
 * moment om te stoppen met het beter opschrijven en het onvergeetbaar te maken.
 *
 * ── WAAROM DIT GEEN STILLE HERSCHRIJVING IS ────────────────────────────────
 *
 * Er verandert niets aan de betekenis van de SQL: alleen witruimte BUITEN een
 * tekstwaarde wordt ingekort, en oneLine() geeft `null` — geen wijziging dus — zodra
 * het niet zeker weet waar het naar kijkt. Wat cmd.exe anders zou zien als het einde
 * van het commando, ziet SQLite als één spatie.
 *
 * Kan het niet veilig ingekort worden, dan gaat het ONGEWIJZIGD door. Dan faalt de
 * aanroep zoals hij vandaag faalt, en dat is geen achteruitgang — migrate.mjs vraagt
 * asCommandArg() zelf al vooraf en valt in dat geval terug op een bestand.
 */
function flattenCommand(argv) {
  const i = argv.indexOf('--command');
  if (i === -1 || i === argv.length - 1) return argv;
  const line = asCommandArg(argv[i + 1]);
  if (!line || line === argv[i + 1]) return argv;
  const copy = argv.slice();
  copy[i + 1] = line;
  return copy;
}

export async function wrangler(rawArgv, { env = process.env, maxBuffer = 64 * 1024 * 1024 } = {}) {
  const argv = flattenCommand(rawArgv);
  // Lokaal geïnstalleerd: rechtstreeks via node, zonder shell (zie localWrangler).
  // Anders via npx, met de shell alleen op Windows omdat het daar niet anders kan
  // — en dan met aanhalingstekens, want de shell hakt anders elk argument met
  // een spatie erin in stukken.
  const [cmd, args, opts] = LOCAL
    ? [process.execPath, [LOCAL, ...argv], {}]
    : isWindows
      ? [NPX, ['wrangler', ...argv].map(quoteForCmd), { shell: true }]
      : [NPX, ['wrangler', ...argv], {}];
  try {
    const { stdout, stderr } = await run(cmd, args, {
      env,
      maxBuffer,
      windowsHide: true,
      ...opts,
    });
    return { ok: true, out: `${stdout}\n${stderr}`, stdout };
  } catch (e) {
    return {
      ok: false,
      out: `${e.stdout || ''}\n${e.stderr || ''}\n${e.message || ''}`,
      stdout: e.stdout || '',
    };
  }
}

/* Alleen voor de test. Het net hierboven is niet te zien aan wat wrangler teruggeeft,
 * en een vangnet waarvan niemand kan nakijken of het er nog hangt, is er over een half
 * jaar niet meer. Zie tests/wrangler-args.test.mjs. */
export const __flattenCommand = flattenCommand;

/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * EERST `whoami`, DAN DE REST
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ── WAT LUCAS OP 9 AUGUSTUS 2026 OPMERKTE ───────────────────────────────────
 *
 * `npm run migrate` viel om met 7403 op het állereerste statement. Draaide hij
 * eerst `npx wrangler whoami` en daarna hetzelfde commando, dan liep de hele
 * migratie zonder één fout door — 56 opdrachten uitgevoerd, 81 overgeslagen.
 *
 * Dat is betere informatie dan wat er tot vandaag in migrate.mjs stond. Daar
 * heette het "7403 komt en gaat" en "hoe meer aanroepen je doet hoe groter de
 * kans dat je erin loopt", met een retry na drie seconden als antwoord. Dat is de
 * verklaring die je verzint als je alleen ziet dát het soms werkt. Het is niet
 * willekeurig: één leescommando ervoor maakt het verschil, elke keer.
 *
 * ── WAT ER VERMOEDELIJK GEBEURT, EN WAT IK NIET WEET ────────────────────────
 *
 * `wrangler login` levert een OAuth-toegangstoken dat kort geldig is en met een
 * refresh-token vernieuwd moet worden. `whoami` is het commando dat die
 * vernieuwing doet en het resultaat naar wrangler's configuratie schrijft, zodat
 * alles daarna een vers token gebruikt.
 *
 * Waarom de aanroepen uit dit script dat niet zelf voor elkaar krijgen, weet ik
 * niet zeker — het zijn kindprocessen zonder terminal, en dat is de meest
 * waarschijnlijke reden, maar ik heb het niet bewezen. Dat hoeft ook niet: het
 * middel is één extra leesactie aan het begin, en dat is goedkoop genoeg om niet
 * eerst het mechanisme te hoeven kennen.
 *
 * Wat wél telt is dat 7403 hier NIET betekent wat de foutmelding zegt. "The given
 * account is not valid or is not authorized to access this service" leest als een
 * rechtenprobleem, en stuurt je naar API-tokens, accountrollen en permissies —
 * uren zoeken in de verkeerde hoek. Vandaar dat dit hier staat en niet in een
 * commentaarregel bij één aanroeper.
 *
 * ── MEMOÏSEERD, EN MET force ────────────────────────────────────────────────
 *
 * Eén keer per proces, want een tweede keer vernieuwt niets en kost een aanroep.
 * `force: true` is voor de retry halverwege een lange run: is het token daar
 * alsnog verlopen, dan is opnieuw vernieuwen precies de reparatie — en dat is wat
 * de oude retry-na-drie-seconden juist níet deed, die probeerde hetzelfde
 * verlopen token nog een keer.
 *
 * Mislukken is geen fout. Is er helemaal geen login, dan faalt het echte commando
 * hierna met zijn eigen, duidelijkere melding; hier stoppen zou die melding
 * vervangen door een minder bruikbare.
 */
let warmed = null;

export async function warmLogin({ env = process.env, force = false } = {}) {
  if (force) warmed = null;
  if (!warmed) warmed = wrangler(['whoami'], { env });
  return warmed;
}

/** Zelfde aanroep, maar gooit bij mislukking — voor scripts die door moeten. */
export async function wranglerOrThrow(argv, opts) {
  const r = await wrangler(argv, opts);
  if (!r.ok) throw new Error(`wrangler ${argv.join(' ')} mislukte:\n${r.out.trim()}`);
  return r.stdout;
}

export const WRANGLER_RUNNER = LOCAL ? `node ${LOCAL}` : NPX;
export const WRANGLER_IS_LOCAL = Boolean(LOCAL);
