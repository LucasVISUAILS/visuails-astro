/**
 * Ronde 91, A07 (9 november 2026): de vijf kansen per inlogcode gelden ook als
 * de gokken tegelijk binnenkomen. Eerst werd vergeleken en daarna geteld; twaalf
 * gelijktijdige gokken werden alle twaalf vergeleken (code_attempts = 12). Nu
 * reserveert één voorwaardelijke UPDATE de poging vóór het vergelijken.
 * Echte SQLite-D1 (tests/lib/d1sqlite.mjs), zodat de UPDATE echt telt.
 * Draai: node tests/blind91-a-codepogingen.test.mjs
 */
import { accountPost } from '../src/lib/account.js';
import { hashToken } from '../src/lib/token.js';
import { d1, verseDb, telling } from './lib/d1sqlite.mjs';

let goed = 0, fout = 0;
function ok(naam, waar, detail = '') {
  if (waar) goed++; else fout++;
  console.log(`${waar ? ' ok  ' : ' FAIL'} ${naam}${waar ? '' : `  ${detail}`}`);
}
const { db } = verseDb(new URL('../schema.sql', import.meta.url));
db.exec(`INSERT INTO customers (id, email, name) VALUES (7, 'klant@voorbeeld.test', 'Kees')`);
const env = { DB: d1(db), PORTAL_SALT: 'zout' };
const CODE = '048210';
const zetCode = async () => {
  db.exec('DELETE FROM account_tokens; DELETE FROM rate_limits; DELETE FROM account_sessions;');
  db.prepare('INSERT INTO account_tokens (id, customer_id, token_hash, expires_at, code_hash, code_expires_at) VALUES (1, 7, ?, ?, ?, ?)')
    .run('link-' + Math.random(), new Date(Date.now() + 3600e3).toISOString(), await hashToken(`7:${CODE}`), new Date(Date.now() + 600e3).toISOString());
};
let ip = 0;
const raad = (code) => accountPost({
  request: new Request('https://visuails.com/account/code', {
    method: 'POST', body: new URLSearchParams({ email: 'klant@voorbeeld.test', code, lang: 'nl' }),
    headers: { 'content-type': 'application/x-www-form-urlencoded', origin: 'https://visuails.com', 'sec-fetch-site': 'same-origin', 'cf-connecting-ip': `198.51.100.${++ip}` },
  }),
  env, waitUntil: () => {},
});
const fouteCode = (i) => String(100000 + i);
const pogingen = () => telling(db, 'SELECT code_attempts FROM account_tokens WHERE id = 1');
const levend = () => telling(db, 'SELECT code_hash IS NOT NULL FROM account_tokens WHERE id = 1') === 1;
const sessies = () => telling(db, 'SELECT COUNT(*) FROM account_sessions');

console.log('\ntwaalf gelijktijdige missers');
await zetCode();
/* Een D1 die bij elke aanroep de beurt teruggeeft, zoals de echte over het
   netwerk: zonder dit lopen de verzoeken onder node netjes na elkaar. */
const echt = env.DB.prepare;
let vergeleken = 0;
env.DB.prepare = (sql) => {
  const st = echt(sql);
  const wacht = (fn) => async (...a) => { await new Promise((r) => setTimeout(r, 1)); return fn(...a); };
  const om = (s) => { s.first = wacht(s.first); s.all = wacht(s.all); s.run = wacht(s.run); const b = s.bind; s.bind = (...a) => om(b(...a)); return s; };
  if (/SET code_hash = NULL WHERE id = \?1 AND code_attempts/.test(sql)) vergeleken += 1;
  return om(st);
};
const uit = await Promise.all([...Array(12)].map((_, i) => raad(fouteCode(i))));
env.DB.prepare = echt;
ok('geen van de twaalf logt in', uit.every((r) => r.status !== 303), uit.map((r) => r.status).join(','));
ok('hooguit vijf zijn vergeleken (code_attempts ≤ 5)', pogingen() <= 5, `code_attempts=${pogingen()}, vergeleken=${vergeleken}`);
ok('  en precies vijf (geen poging is verloren)', pogingen() === 5 && vergeleken === 5, `code_attempts=${pogingen()}, vergeleken=${vergeleken}`);
ok('de code is dood', !levend());
const r = await raad(CODE);
ok('de goede code werkt daarna niet meer', r.status !== 303 && sessies() === 0, `${r.status}`);

console.log('\nna elkaar: zoals voorheen');
await zetCode();
for (let i = 0; i < 4; i++) await raad(fouteCode(i));
ok('vier missers: de code leeft nog, vier pogingen geteld', levend() && pogingen() === 4, `${pogingen()}`);
const vijfde = await raad(CODE);
ok('de goede code als vijfde poging werkt', vijfde.status === 303 && sessies() === 1, `${vijfde.status}`);
ok('  en is daarna op', !levend());
await zetCode();
for (let i = 0; i < 5; i++) await raad(fouteCode(i));
ok('vijf missers: dood', !levend() && pogingen() === 5, `${pogingen()}`);
ok('een zesde poging telt niet meer mee', (await raad(fouteCode(9))).status !== 303 && pogingen() === 5, `${pogingen()}`);
await zetCode();
ok('de goede code meteen: binnen', (await raad(CODE)).status === 303 && sessies() === 1);

console.log(`\n${goed} goed, ${fout} fout`);
if (fout) process.exit(1);
