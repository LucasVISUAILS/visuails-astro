/* VISUAILS — maakt een migratie iets aan dat een latere migratie weghaalt?
 *   npm run test:migratievolgorde
 * ══════════════════════════════════════════════════════════════════════════════
 * WAAROM DEZE TEST BESTAAT — 12 SEPTEMBER 2026
 * ══════════════════════════════════════════════════════════════════════════════
 * Lucas draaide `npm run migrate` op de echte database en kreeg:
 *
 *     ERROR  A request to the Cloudflare API (…/d1/database/…/query) failed.
 *     UNIQUE constraint failed: order_tokens.order_id
 *     Command failed: … CREATE UNIQUE INDEX IF NOT EXISTS idx_order_tokens_live
 *
 * Geen van beide kanten was op zichzelf fout:
 *
 *   · Migratie 0001 maakte `idx_order_tokens_live` aan — één levend token per
 *     bestelling, als databaseregel in plaats van als afspraak.
 *   · Migratie 0044 haalde die index er op 4 september uitdrukkelijk weer af,
 *     omdat een klant die de eerste leveringsmail later opende "deze link is
 *     vervangen" te zien kreeg. Sindsdien MAG een bestelling meerdere levende
 *     links hebben, en die staan er inmiddels ook.
 *
 * Wat ze samen fout maakt is scripts/migrate.mjs: dat draait ÁLLE migraties bij
 * elke run opnieuw, met opzet, zodat een run die halverwege strandt gewoon
 * opnieuw kan. Op een lege database is 0001 → 0044 "aanmaken, weghalen" en
 * klopt het. Op de echte database botst 0001 op gegevens die 0044 heeft
 * toegestaan — en omdat het script bij een fout stopt, kwam geen énkele
 * migratie erna nog aan de beurt. Migratie 0047 (de contactvoorkeur) had
 * daardoor drie dagen lang niet gedraaid zonder dat iemand het merkte.
 *
 * ── DE REGEL ────────────────────────────────────────────────────────────────
 *
 *   Wat een latere migratie WEGHAALT, mag een eerdere migratie niet meer
 *   AANMAKEN.
 *
 * `IF NOT EXISTS` redt je hier niet: de index bestaat niet meer (0044 haalde
 * hem weg), dus hij wordt echt opnieuw aangemaakt — en dán pas botst hij op de
 * gegevens. Dat is precies waarom dit niet als "veilig herhaalbaar" werd
 * gezien, en waarom er een toets voor nodig is in plaats van oplettendheid.
 *
 * Dit is een statische controle: hij leest de bestanden en raakt geen database.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { statements, stripComments } from '../scripts/lib/sql.mjs';

let pass = 0, fail = 0;
const ok = (naam, voorwaarde, uitleg = '') => {
  if (voorwaarde) { pass++; console.log(` ok   ${naam}`); }
  else { fail++; console.log(` FAIL ${naam}${uitleg ? '\n       ' + uitleg : ''}`); }
};

const DIR = fileURLToPath(new URL('../migrations/', import.meta.url));
const BESTANDEN = readdirSync(DIR).filter((n) => n.endsWith('.sql')).sort();

console.log('\nVISUAILS — de volgorde van de migraties\n');
ok(`er zijn migraties om te lezen (${BESTANDEN.length})`, BESTANDEN.length > 0);

/* Wat elke migratie aanmaakt en weghaalt. Alleen wat er ECHT draait: het
   commentaar gaat er eerst af, want een weggehaalde regel blijft vaak als
   toelichting staan — en die hoort deze toets niet als opdracht te lezen. */
const maakt = new Map();   // naam → [bestand, …]
const haaltWeg = new Map(); // naam → [bestand, …]

const voegToe = (kaart, naam, bestand) => {
  const sleutel = naam.toLowerCase();
  if (!kaart.has(sleutel)) kaart.set(sleutel, []);
  kaart.get(sleutel).push(bestand);
};

for (const naam of BESTANDEN) {
  const sql = stripComments(readFileSync(join(DIR, naam), 'utf8'));
  for (const opdracht of statements(sql)) {
    const plat = opdracht.replace(/\s+/g, ' ').trim();
    let m;
    if ((m = /^CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?([A-Za-z0-9_]+)/i.exec(plat))) voegToe(maakt, m[1], naam);
    else if ((m = /^CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([A-Za-z0-9_]+)/i.exec(plat))) voegToe(maakt, m[1], naam);
    else if ((m = /^CREATE\s+(?:OR\s+REPLACE\s+)?VIEW\s+(?:IF\s+NOT\s+EXISTS\s+)?([A-Za-z0-9_]+)/i.exec(plat))) voegToe(maakt, m[1], naam);
    else if ((m = /^DROP\s+(?:INDEX|TABLE|VIEW)\s+(?:IF\s+EXISTS\s+)?([A-Za-z0-9_]+)/i.exec(plat))) voegToe(haaltWeg, m[1], naam);
  }
}

console.log(`   ${maakt.size} ding(en) aangemaakt, ${haaltWeg.size} weggehaald`);

/* ══ DE CONTROLE ══════════════════════════════════════════════════════════
   Voor alles wat ergens wordt weggehaald: staat er in een EERDER bestand nog
   een aanmaakopdracht? Dan botst die bij elke volgende run. */
const botsingen = [];
for (const [naam, wegBestanden] of haaltWeg) {
  const laatsteWeg = wegBestanden[wegBestanden.length - 1];
  for (const maakBestand of maakt.get(naam) || []) {
    if (maakBestand < laatsteWeg) {
      botsingen.push(`${naam}: aangemaakt in ${maakBestand}, weggehaald in ${laatsteWeg}`);
    }
  }
}
ok('niets wordt aangemaakt dat later weer wordt weggehaald',
  botsingen.length === 0,
  botsingen.join('\n       ')
  + (botsingen.length ? '\n       → haal de CREATE uit de eerdere migratie; de latere is de waarheid.' : ''));

/* ══ EN DE INDEX UIT DE MELDING VAN 12 SEPTEMBER, MET NAAM ════════════════
   De algemene regel hierboven vangt hem al. Deze staat er los bij omdat een
   toets die één keer een echte storing heeft gevangen, die storing bij naam
   hoort te noemen — anders is over een jaar niet meer te zien waar de regel
   vandaan komt. */
ok('idx_order_tokens_live wordt nergens meer aangemaakt',
  !(maakt.get('idx_order_tokens_live') || []).length,
  `staat nog in: ${(maakt.get('idx_order_tokens_live') || []).join(', ')}`);
ok('  en migratie 0044 haalt hem nog steeds weg',
  (haaltWeg.get('idx_order_tokens_live') || []).some((n) => n.startsWith('0044')),
  'de DROP is verdwenen — een database van vóór 4 september houdt de index dan');

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exitCode = 1;
