// Ronde 9 · F31: "Keur alle … resterende beelden goed" in de privélink.
import crypto from 'node:crypto';
import { start, SITE, sql, sqlw } from './_dl.mjs';
const rows = (r) => (Array.isArray(r) ? r : r.results || r.rows || []);
const o = rows(await sql(`SELECT o.id, o.ref FROM orders o WHERE o.service <> 'sample' AND o.status = 'delivered'
  AND (SELECT COUNT(*) FROM files f WHERE f.order_id = o.id AND f.kind = 'delivery' AND f.superseded_at IS NULL) >= 2 ORDER BY o.id DESC LIMIT 1`))[0];
/* Testtoestand: alles weer open. */
await sqlw(`UPDATE files SET review_state = 'pending', reviewed_at = NULL WHERE order_id = ${o.id} AND kind = 'delivery'`);
await sqlw(`UPDATE orders SET closed_at = NULL, revision_round_at = NULL WHERE id = ${o.id}`);
const token = crypto.randomBytes(32).toString('base64url').slice(0, 43);
const hash = crypto.createHash('sha256').update(token).digest('hex');
await sqlw(`INSERT INTO order_tokens (order_id, token_hash) VALUES (${o.id}, '${hash}')`);
const s = await start(); const { page } = s;
await page.goto(`${SITE}/o/${token}`, { waitUntil: 'load' });
const knop = await page.evaluate(() => document.querySelector('form.alles button')?.innerText);
console.log('order', o.ref, '| knop:', knop);
await Promise.all([page.waitForNavigation(), page.click('form.alles button')]);
const na = rows(await sql(`SELECT review_state, COUNT(*) n FROM files WHERE order_id=${o.id} AND kind='delivery' AND superseded_at IS NULL GROUP BY review_state`));
const dicht = rows(await sql(`SELECT closed_at FROM orders WHERE id=${o.id}`))[0];
console.log('na:', JSON.stringify(na), '| closed_at:', dicht.closed_at, '| knop nog:', await page.evaluate(() => !!document.querySelector('form.alles')));
console.log(s.fouten);
await s.stop();
