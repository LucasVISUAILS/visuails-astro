/**
 * Ronde 91, A10 (9 november 2026): een omleiding naar "hetzelfde pad" begint met
 * precies één schuine streep. Astro stuurde `//admin?thema=donker` naar de
 * beheerroute en die antwoordde `Location: //admin` — zonder schema, dus voor de
 * browser https://admin/, een andere host. Dezelfde vorm stond in de tip-knop van
 * het portaal. Draai: node tests/blind91-a-omleiding.test.mjs
 */
import { adminGet } from '../src/lib/admin.js';
import { portalGet } from '../src/lib/portal.js';
import { hashToken, mintToken } from '../src/lib/token.js';
import { d1, verseDb } from './lib/d1sqlite.mjs';

let goed = 0, fout = 0;
function ok(naam, waar, detail = '') {
  if (waar) goed++; else fout++;
  console.log(`${waar ? ' ok  ' : ' FAIL'} ${naam}${waar ? '' : `  ${detail}`}`);
}
const naarAndereHost = (loc) => { try { return new URL(loc, 'https://visuails.com/x/').host !== 'visuails.com'; } catch { return true; } };

console.log('\nde themaknop van /admin');
for (const [pad, wil] of [
  ['//admin?thema=donker', '/admin'], ['///admin?thema=licht', '/admin'], ['//admin/orders/5/files?thema=donker', '/admin/orders/5/files'],
  ['/admin?thema=donker', '/admin'], ['/admin/planning?thema=licht&soort=asap', '/admin/planning?soort=asap'],
]) {
  const r = await adminGet({ request: new Request(`https://visuails.com${pad}`), env: {} });
  const loc = r.headers.get('location') || '';
  ok(`${pad} → ${wil}`, r.status === 303 && loc === wil && !naarAndereHost(loc), `${r.status} ${loc}`);
}

console.log('\nde tip-knop van het portaal');
{
  const { db } = verseDb(new URL('../schema.sql', import.meta.url));
  const token = mintToken();
  db.exec(`INSERT INTO orders (id, ref, service, status, email, total_cents, lang) VALUES (1, 'VIS-TEST-001', 'catalog', 'delivered', 'k@voorbeeld.test', 100, 'nl')`);
  db.prepare("INSERT INTO order_tokens (order_id, token_hash, issued_at) VALUES (1, ?, datetime('now'))").run(await hashToken(token));
  const env = { DB: d1(db), PORTAL_SALT: 'zout' };
  for (const pad of [`//o/${token}?tipweg=privelink`, `/o/${token}?tipweg=privelink`]) {
    const r = await portalGet({ request: new Request(`https://visuails.com${pad}`, { headers: { 'cf-connecting-ip': '192.0.2.1' } }), env, waitUntil: () => {} });
    const loc = r.headers.get('location') || '';
    ok(`${pad.replace(token, '<token>')} → /o/<token>`, r.status === 303 && loc === `/o/${token}` && !naarAndereHost(loc), `${r.status} ${loc.replace(token, '<token>')}`);
  }
}
console.log(`\n${goed} goed, ${fout} fout`);
if (fout) process.exit(1);
