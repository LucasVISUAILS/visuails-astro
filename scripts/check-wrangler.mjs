/**
 * VISUAILS — why wrangler says 7403, answered by measurement instead of guessing.
 *
 *   npm run check:wrangler
 *
 * WHAT 7403 IS. Cloudflare returns "The given account is not valid or is not
 * authorized to access this service [code: 7403]". That is NOT the logged-out
 * error — being logged out is 10000. 7403 means wrangler presented credentials,
 * Cloudflare accepted them as valid, and then refused them for THIS resource on
 * THIS account. So the fix is never "log in again" on its own; it is finding out
 * which of three things is wrong, and they need different repairs:
 *
 *   1 · An API token in the environment is silently overriding `wrangler login`.
 *       CLOUDFLARE_API_TOKEN wins over the OAuth session, always, with no notice.
 *       A token minted for Pages deploys has no D1 and no R2 permission, so
 *       every d1/r2 command fails while `wrangler pages deploy` keeps working —
 *       which is exactly the shape of "some commands work and some don't".
 *
 *   2 · The OAuth session has stale scopes. `wrangler login` grants a fixed set
 *       at login time and never widens it afterwards. A session created before
 *       this project had a D1 database does not gain d1:write when the database
 *       appears; it keeps the scopes it was born with.
 *
 *   3 · Wrangler is talking to the wrong account. If the login can see more than
 *       one account and CLOUDFLARE_ACCOUNT_ID is unset or wrong, the resource
 *       genuinely is not on the account being asked.
 *
 * HOW THIS TELLS THEM APART. Cause 1 is provable: run the same read-only command
 * twice, once with the environment as-is and once with the token variables
 * stripped from the child process. If it fails with the token and succeeds
 * without, the token is the culprit and nothing else needs investigating. That
 * comparison is the whole reason this script exists rather than a list of things
 * to try in order.
 *
 * IT PRINTS NO SECRETS. Token values are reported as set/not set and by length
 * only. The account id is not a secret — it is in wrangler.toml's sibling
 * dashboard URLs — but it is masked anyway, because the output of this script is
 * the kind of thing that gets pasted into a chat.
 *
 * IT CHANGES NOTHING. Every command it runs is a read.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { wrangler as callWrangler, WRANGLER_RUNNER } from './lib/wrangler.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** The database this project binds, read from wrangler.toml rather than typed. */
function boundDatabase() {
  const toml = fs.readFileSync(path.join(ROOT, 'wrangler.toml'), 'utf8');
  const name = toml.match(/database_name\s*=\s*"([^"]+)"/);
  const id = toml.match(/database_id\s*=\s*"([^"]+)"/);
  if (!name) throw new Error('check-wrangler: no database_name in wrangler.toml');
  return { name: name[1], id: id ? id[1] : null };
}

const mask = v => (v ? `set (${v.length} tekens)` : 'niet gezet');
const maskId = v => (v ? `${v.slice(0, 4)}…${v.slice(-4)}` : 'niet gezet');

/** Run wrangler and capture everything, including the failure. */
const wrangler = (argv, env = process.env) => callWrangler(argv, { env });

const has7403 = s => /\b7403\b/.test(s);
const has10000 = s => /\b10000\b/.test(s);

const line = () => console.log('─'.repeat(72));

// ─────────────────────────────────────────────────────────────────────────────

const db = boundDatabase();
console.log('\nVISUAILS · wrangler-diagnose');
line();
console.log(`Database uit wrangler.toml : ${db.name}  (${maskId(db.id)})`);

// 1 · What is in the environment.
const TOKEN_VARS = ['CLOUDFLARE_API_TOKEN', 'CF_API_TOKEN', 'CLOUDFLARE_API_KEY', 'CLOUDFLARE_EMAIL'];
const envToken = TOKEN_VARS.filter(k => process.env[k]);
console.log('\nOmgevingsvariabelen');
for (const k of TOKEN_VARS) console.log(`  ${k.padEnd(22)} ${mask(process.env[k])}`);
console.log(`  ${'CLOUDFLARE_ACCOUNT_ID'.padEnd(22)} ${maskId(process.env.CLOUDFLARE_ACCOUNT_ID)}`);

for (const f of ['.env', '.env.local', '.dev.vars']) {
  if (fs.existsSync(path.join(ROOT, f))) {
    const keys = fs.readFileSync(path.join(ROOT, f), 'utf8')
      .split('\n').map(l => l.split('=')[0].trim())
      .filter(k => /^CLOUDFLARE_|^CF_/.test(k));
    if (keys.length) console.log(`  ⚠ ${f} zet ook: ${keys.join(', ')}`);
  }
}

// 2 · Who wrangler thinks it is, and with which scopes.
line();
console.log('whoami');
const who = await wrangler(['whoami']);
const accounts = [...who.out.matchAll(/│\s*([^│]+?)\s*│\s*([0-9a-f]{32})\s*│/g)]
  .map(m => ({ name: m[1].trim(), id: m[2] }));
const scopes = [...who.out.matchAll(/^-\s*([a-z0-9_]+:[a-z]+)/gim)].map(m => m[1]);

if (!who.ok && has10000(who.out)) {
  console.log('  ✘ niet ingelogd (fout 10000). Draai eerst: npx wrangler login');
} else if (accounts.length) {
  for (const a of accounts) console.log(`  account: ${a.name}  (${maskId(a.id)})`);
  if (accounts.length > 1 && !process.env.CLOUDFLARE_ACCOUNT_ID) {
    console.log('  ⚠ meer dan één account en CLOUDFLARE_ACCOUNT_ID is niet gezet —');
    console.log('    wrangler kan dan de verkeerde kiezen. Zet hem expliciet.');
  }
} else {
  console.log('  (geen account uit de output te lezen)');
}

if (scopes.length) {
  const need = ['d1:write', 'workers_r2:write'];
  console.log(`  scopes: ${scopes.length} stuks`);
  for (const n of need) {
    console.log(`    ${scopes.includes(n) ? '✔' : '✘'} ${n}`);
  }
  if (need.some(n => !scopes.includes(n))) {
    console.log('    → een ontbrekende scope komt NIET vanzelf terug; opnieuw inloggen is de enige weg:');
    console.log('      npx wrangler logout && npx wrangler login');
  }
} else if (envToken.length) {
  console.log('  (geen scopelijst — dat hoort zo bij een API-token: die heeft');
  console.log('   permissies in het dashboard staan, geen OAuth-scopes)');
}

// 3 · The actual read, twice: as-is, and with the token stripped.
line();
console.log(`d1 info ${db.name}`);
const asIs = await wrangler(['d1', 'info', db.name]);
console.log(`  met huidige omgeving : ${asIs.ok ? '✔ werkt' : has7403(asIs.out) ? '✘ 7403' : '✘ mislukt'}`);

let stripped = null;
if (envToken.length) {
  const clean = { ...process.env };
  for (const k of TOKEN_VARS) delete clean[k];
  stripped = await wrangler(['d1', 'info', db.name], clean);
  console.log(`  zonder API-token     : ${stripped.ok ? '✔ werkt' : has7403(stripped.out) ? '✘ 7403' : '✘ mislukt'}`);
}

// 4 · The verdict.
line();
console.log('Conclusie\n');

if (asIs.ok) {
  console.log('  Wrangler mag bij deze database. Als npm run fetch:order nog steeds');
  console.log('  faalt, zit het probleem niet in de autorisatie maar in R2 — draai:');
  console.log(`    npx wrangler r2 bucket list`);
} else if (stripped && stripped.ok) {
  console.log('  GEVONDEN: het API-token in je omgeving is de oorzaak.');
  console.log(`  Zonder ${envToken.join(' / ')} werkt hetzelfde commando wél.`);
  console.log('  Twee manieren om het op te lossen:');
  console.log('   a) haal de variabele weg (Windows: systeeminstellingen →');
  console.log('      omgevingsvariabelen), dan valt wrangler terug op je login;');
  console.log('   b) of geef het token de juiste rechten in het dashboard:');
  console.log('      My Profile → API Tokens → dit token bewerken → toevoegen:');
  console.log('      Account · D1 · Edit   en   Account · Workers R2 Storage · Edit');
} else if (has7403(asIs.out)) {
  console.log('  7403 blijft staan, ook zonder token. Dan is het de account of de scope:');
  console.log('   1) npx wrangler logout && npx wrangler login   (verse scopes)');
  console.log('   2) klopt het account? zet CLOUDFLARE_ACCOUNT_ID op het account');
  console.log(`      waar database "${db.name}" onder hangt`);
  console.log('   3) heeft je Cloudflare-gebruiker de rol Super Administrator of');
  console.log('      een rol met D1-rechten? Een member-rol zonder D1 geeft exact 7403.');
} else if (/ENOENT|EINVAL/.test(asIs.out)) {
  console.log(`  Node kan "${WRANGLER_RUNNER}" niet starten. Dit is geen`);
  console.log('  rechtenprobleem: npm/Node zelf is niet bereikbaar vanuit dit script.');
  console.log('  Controleer of node en npm in je PATH staan (node -v && npm -v).');
} else if (has10000(asIs.out) || /necessary to set a CLOUDFLARE_API_TOKEN/.test(asIs.out)) {
  console.log('  Wrangler heeft helemaal geen inloggegevens. npx wrangler login');
} else {
  console.log('  Geen 7403 en geen 10000 — ruwe uitvoer hieronder, die zegt meer:');
  console.log(asIs.out.trim().split('\n').slice(-12).map(l => '    ' + l).join('\n'));
}

line();
console.log('Migratie 0008 hoeft hier niet op te wachten: die kun je ook plakken in');
console.log('het D1-console in het dashboard. Als wrangler wél werkt:');
console.log(`  npx wrangler d1 execute ${db.name} --remote --file migrations/0008-lowercase-customer-email.sql`);
console.log('');
