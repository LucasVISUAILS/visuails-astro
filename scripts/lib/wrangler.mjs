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
export async function wrangler(argv, { env = process.env, maxBuffer = 64 * 1024 * 1024 } = {}) {
  // Lokaal geïnstalleerd: rechtstreeks via node, zonder shell (zie localWrangler).
  // Anders via npx, met de shell alleen op Windows omdat het daar niet anders kan.
  const [cmd, args, opts] = LOCAL
    ? [process.execPath, [LOCAL, ...argv], {}]
    : [NPX, ['wrangler', ...argv], { shell: isWindows }];
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

/** Zelfde aanroep, maar gooit bij mislukking — voor scripts die door moeten. */
export async function wranglerOrThrow(argv, opts) {
  const r = await wrangler(argv, opts);
  if (!r.ok) throw new Error(`wrangler ${argv.join(' ')} mislukte:\n${r.out.trim()}`);
  return r.stdout;
}

export const WRANGLER_RUNNER = LOCAL ? `node ${LOCAL}` : NPX;
export const WRANGLER_IS_LOCAL = Boolean(LOCAL);
