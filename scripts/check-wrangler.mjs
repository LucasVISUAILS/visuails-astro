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
 * which of FOUR things is wrong, and they need different repairs:
 *
 *   0 · The OAuth access token has simply expired. Added 9 August 2026, after
 *       Lucas noticed that `npx wrangler whoami` followed by `npm run migrate`
 *       ran the whole migration clean, while `npm run migrate` on its own died on
 *       statement one. `whoami` renews the login; nothing else about the account
 *       or its permissions was ever wrong. This is listed first because it is the
 *       cheapest to rule out and, on the evidence, the likeliest — and because
 *       every one of the three below sends you looking at permissions for a
 *       problem that one read command removes.
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
 * HOW THIS TELLS THEM APART — by running the same read-only command under
 * different conditions and comparing, rather than printing a list of things to
 * try in order. That comparison is the whole reason this script exists.
 *
 *   cause 0 · run it again after a fresh `whoami`. Works → expired token, done.
 *   cause 1 · run it again with the token variables stripped from the child
 *             process. Fails with, works without → the token is the culprit.
 *   cause 3 · `d1 list` works but `d1 info <name>` does not → the permission is
 *             there and the database is on another account.
 *   cause 2 · `r2 bucket list` works and D1 does not → one missing permission,
 *             not an account or a role.
 *
 * All four fail otherwise, and then it is the role or the account itself.
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

/*
 * Een token melden zonder hem te tonen — én controleren of hij niet stuk is.
 *
 * DE CONTROLETEKENCONTROLE IS GEEN THEORIE. Op deze machine is exact dit al één
 * keer gebeurd: MOLLIE_API_KEY bleek één teken lang en bestond uit U+0016 (SYN),
 * het teken dat cmd.exe invoegt bij een mislukte rechtermuisknop-plakactie. Een
 * sleutel die er in de terminal goed uitziet en op de draad onleesbaar is, geeft
 * een foutmelding die over rechten lijkt te gaan en dat niet doet.
 *
 * Onwaarschijnlijke lengtes komen er ook bij: een Cloudflare-API-token is 40
 * tekens. Iets van 3 of van 300 is geen token maar een plakfout.
 */
const mask = (v) => {
  if (!v) return 'niet gezet';
  const bad = [...v].filter((ch) => ch.codePointAt(0) < 0x20 || ch.codePointAt(0) === 0x7f);
  const notes = [];
  if (bad.length) {
    notes.push(`⚠ bevat ${bad.length} controleteken(s): `
      + bad.map((ch) => `U+${ch.codePointAt(0).toString(16).padStart(4, '0').toUpperCase()}`).join(' '));
  }
  if (v !== v.trim()) notes.push('⚠ begint of eindigt met witruimte');
  if (v.length < 20) notes.push('⚠ korter dan enig echt token');
  return `set (${v.length} tekens)${notes.length ? ' — ' + notes.join(', ') : ''}`;
};
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

/*
 * ── TWEE EXTRA METINGEN DIE DE DRIE OORZAKEN VAN ELKAAR SCHEIDEN ─────────────
 *
 * `d1 info <naam>` faalt bij álle drie de oorzaken en zegt dus niet welke het is.
 * Deze twee wel, en ze kosten samen twee leesacties:
 *
 *   · `d1 list` mag met dezelfde d1-permissie als `d1 info`, maar hangt NIET aan
 *     één database. Lukt de lijst en faalt de info, dan heb je de permissie wel en
 *     staat deze database op een ánder account (oorzaak 3). Falen ze beide met
 *     7403, dan ontbreekt de D1-permissie zelf (oorzaak 1 of 2).
 *
 *   · `r2 bucket list` gebruikt een andere permissie. Werkt R2 en faalt D1, dan is
 *     het token of de sessie geldig voor dit account en mist alleen D1 — wat een
 *     token voor Pages-deploys precies is. Falen ze beide, dan is het de rol van
 *     je gebruiker of het account, niet één permissie.
 *
 * Ze draaien alleen als het bovenstaande al mislukt is; bij een werkende
 * omgeving is er niets te onderscheiden.
 */
/*
 * ── DE VIERDE OORZAAK, EN DEGENE DIE HET ECHT WAS ────────────────────────────
 *
 * 9 augustus 2026. Lucas: "wanneer ik npx wrangler whoami run en daarna npm run
 * migrate run werkt het wel." Dat is een oorzaak die dit script niet kende en die
 * niets met permissies te maken heeft: een verlopen OAuth-toegangstoken. `whoami`
 * vernieuwt hem, en alles daarna werkt.
 *
 * Deze meting staat vóór de andere twee omdat hij de goedkoopste en de meest
 * waarschijnlijke is — en omdat de andere twee er dan niet meer aan te pas komen.
 * Zonder deze regel stuurde de conclusie hieronder je naar API-tokens en
 * accountrollen voor een probleem dat met één leescommando weg is: uren zoeken in
 * de verkeerde hoek, en dat is precies wat dit script hoort te voorkomen.
 *
 * De scripts doen dit sinds vandaag zelf (warmLogin() in lib/wrangler.mjs), dus
 * als deze regel aanslaat is dat vooral een bevestiging — behalve wanneer je
 * wrangler met de hand aanroept, en dan is het het antwoord.
 */
let afterWhoami = null;
if (!asIs.ok && has7403(asIs.out)) {
  await wrangler(['whoami']);
  afterWhoami = await wrangler(['d1', 'info', db.name]);
  console.log(`  na een verse whoami   : ${afterWhoami.ok ? '✔ werkt' : has7403(afterWhoami.out) ? '✘ 7403' : '✘ mislukt'}`);
}

let list = null, r2 = null;
if (!asIs.ok && !(stripped && stripped.ok) && !(afterWhoami && afterWhoami.ok)) {
  list = await wrangler(['d1', 'list']);
  const seesDb = list.ok && new RegExp(`\\b${db.name}\\b`).test(list.out);
  console.log(`  d1 list              : ${list.ok ? (seesDb ? `✔ werkt, ziet "${db.name}"` : '✔ werkt, maar ziet deze database NIET') : has7403(list.out) ? '✘ 7403' : '✘ mislukt'}`);
  list.seesDb = seesDb;

  r2 = await wrangler(['r2', 'bucket', 'list']);
  console.log(`  r2 bucket list       : ${r2.ok ? '✔ werkt' : has7403(r2.out) ? '✘ 7403' : '✘ mislukt'}`);
}

// 4 · The verdict.
line();
console.log('Conclusie\n');

if (asIs.ok) {
  console.log('  Wrangler mag bij deze database. Als npm run fetch:order nog steeds');
  console.log('  faalt, zit het probleem niet in de autorisatie maar in R2 — draai:');
  console.log(`    npx wrangler r2 bucket list`);
} else if (afterWhoami && afterWhoami.ok) {
  console.log('  GEVONDEN: een verlopen toegangstoken, geen rechtenprobleem.');
  console.log('  Hetzelfde commando werkt zodra er een `wrangler whoami` voor is gegaan —');
  console.log('  dat is het commando dat je login vernieuwt. De foutmelding ("account is');
  console.log('  not authorized") stuurt je naar API-tokens en accountrollen; daar zit het');
  console.log('  niet.');
  console.log('');
  console.log('  Je hoeft hier niets aan te doen. npm run migrate, backup en fetch:order');
  console.log('  vernieuwen sinds 9 augustus 2026 zelf voordat ze beginnen (warmLogin() in');
  console.log('  scripts/lib/wrangler.mjs). Roep je wrangler met de hand aan en krijg je');
  console.log('  7403, draai dan eerst:');
  console.log('    npx wrangler whoami');
} else if (stripped && stripped.ok) {
  console.log('  GEVONDEN: het API-token in je omgeving is de oorzaak.');
  console.log(`  Zonder ${envToken.join(' / ')} werkt hetzelfde commando wél.`);
  console.log('  Twee manieren om het op te lossen:');
  console.log('   a) haal de variabele weg (Windows: systeeminstellingen →');
  console.log('      omgevingsvariabelen), dan valt wrangler terug op je login;');
  console.log('   b) of geef het token de juiste rechten in het dashboard:');
  console.log('      My Profile → API Tokens → dit token bewerken → toevoegen:');
  console.log('      Account · D1 · Edit   en   Account · Workers R2 Storage · Edit');
} else if (has7403(asIs.out) && list && list.ok && !list.seesDb) {
  console.log(`  GEVONDEN: de d1-permissie is er wél — "d1 list" werkt — maar database`);
  console.log(`  "${db.name}" staat NIET op het account dat wrangler nu gebruikt.`);
  console.log('  Dit is dus geen rechtenprobleem maar een verkeerd account. Zoek in het');
  console.log('  dashboard bij welk account de database hoort (de URL bevat het account-id)');
  console.log('  en zet dat id vast, zodat wrangler niet meer hoeft te kiezen:');
  console.log('    Windows: setx CLOUDFLARE_ACCOUNT_ID <het-account-id>');
  console.log('    (daarna een nieuwe terminal openen — setx geldt niet in deze)');
} else if (has7403(asIs.out) && r2 && r2.ok) {
  console.log('  GEVONDEN: R2 mag wél en D1 niet, op hetzelfde account. Dan is dit geen');
  console.log('  account- of rolprobleem maar precies één ontbrekende permissie — de vorm');
  console.log('  van een token of sessie die voor Pages/R2 is gemaakt en nooit D1 kreeg.');
  console.log(envToken.length
    ? '   → dashboard: My Profile → API Tokens → dit token → Account · D1 · Edit erbij'
    : '   → npx wrangler logout && npx wrangler login   (scopes worden nooit ruimer,');
  if (!envToken.length) console.log('      alleen opnieuw inloggen geeft d1:write erbij)');
} else if (has7403(asIs.out)) {
  console.log('  7403 op alles, ook zonder token. Dan is het niet één permissie maar het');
  console.log('  account of je rol daarin — in die volgorde nalopen:');
  console.log('   1) npx wrangler logout && npx wrangler login   (verse scopes)');
  console.log('   2) klopt het account? zet CLOUDFLARE_ACCOUNT_ID op het account');
  console.log(`      waar database "${db.name}" onder hangt`);
  console.log('   3) heeft je Cloudflare-gebruiker de rol Super Administrator of');
  console.log('      een rol met D1-rechten? Een member-rol zonder D1 geeft exact 7403.');
  console.log('   4) is er een openstaande betaling of verificatie op het account? Een');
  console.log('      geblokkeerd account weigert een dienst met dezelfde 7403 als een');
  console.log('      ontbrekende permissie — dat is te zien op de facturatiepagina.');
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
console.log('MIGRATIES, ALS HET HIER NIET GOED KOMT');
console.log('');
console.log('`npm run migrate` opnieuw draaien is niet gevaarlijk: dat script kijkt per');
console.log('opdracht wat er al in de database staat in plaats van bij te houden wat het');
console.log('gedraaid heeft (zie de noot bovenaan migrate.mjs), en vernieuwt sinds');
console.log('9 augustus 2026 zelf het token voordat het begint.');
console.log('');
console.log('Blijft wrangler weigeren, dan is het D1-console de weg eromheen — dat');
console.log('gebruikt de sessie van je browser en heeft dit token niet nodig:');
console.log('  dash.cloudflare.com → Workers & Pages → D1 → visuails → Console');
console.log('Voor plakken uit de migratiemap: haal de commentaarregels eruit of gebruik');
console.log('een MIGRATIE-*-PLAKKEN.sql als die er voor jouw migratie is.');
console.log('');
console.log('Eén migratie los, met wrangler:');
console.log(`  npx wrangler d1 execute ${db.name} --remote --file migrations/<bestand>.sql`);
console.log('');
