/*
 * VISUAILS — WELKE CHROME DRAAIT DE VANGRAILS. 21 augustus 2026.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `chromium.launch()` zonder pad laat Playwright zelf zoeken, en Playwright
 * zoekt naar de bouwnummer-map die bij ZIJN versie hoort. Zodra `npm install`
 * playwright een minor omhoog tikt, verandert dat nummer en staat er:
 *
 *     browserType.launch: Executable doesn't exist at
 *     /opt/pw-browsers/chromium_headless_shell-1234/...
 *
 * terwijl er een prima Chrome naast staat. De vangrails vielen daardoor om
 * zonder dat er iets aan de site mankeerde — en een vangrail die omvalt bij
 * een dependency-bump is een vangrail die je op een dag niet meer draait.
 *
 * Daarom deze volgorde:
 *   1. PW_CHROME, als iemand hem expliciet zet;
 *   2. de Chrome die in dit beeld staat, ALS die er is;
 *   3. anders niets — dan zoekt Playwright zelf, wat op een gewone laptop
 *      (Windows, macOS) precies goed is.
 *
 * Stap 2 mag nooit een hard pad zijn zonder existsSync-controle: op Lucas'
 * machine bestaat /opt niet eens, en dan zou de vangrail dáár omvallen.
 */

import fs from 'node:fs';

const KANDIDATEN = [
  '/opt/pw-browsers/chromium',                              // symlink in dit beeld
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',     // waar die symlink heen wees
];

export function browserPad() {
  if (process.env.PW_CHROME) return process.env.PW_CHROME;
  for (const k of KANDIDATEN) {
    try { if (fs.existsSync(k)) return k; } catch { /* niets */ }
  }
  return undefined;   // Playwright zoekt het zelf uit
}
