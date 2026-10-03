// Herontwerp · de privélink: een geleverde bestelling (licht/donker, 1440/390) en een lopende.
import crypto from 'node:crypto';
import fs from 'node:fs';
import { start, SITE, sql, sqlw } from './_dl.mjs';
const D = process.argv[2] || '/tmp/claude-0/portaal';
fs.mkdirSync(D, { recursive: true });
const rows = (r) => (Array.isArray(r) ? r : r.results || r.rows || []);
const tokenVoor = async (id) => {
  const token = crypto.randomBytes(32).toString('base64url').slice(0, 43);
  await sqlw(`INSERT INTO order_tokens (order_id, token_hash) VALUES (${id}, '${crypto.createHash('sha256').update(token).digest('hex')}')`);
  return token;
};
const geleverd = rows(await sql(`SELECT o.id FROM orders o WHERE o.service <> 'sample' AND o.status = 'delivered'
  AND (SELECT COUNT(*) FROM files f WHERE f.order_id = o.id AND f.kind = 'delivery' AND f.superseded_at IS NULL) >= 2 ORDER BY o.id DESC LIMIT 1`))[0];
const lopend = rows(await sql(`SELECT id FROM orders WHERE status IN ('in_production','received','qa') ORDER BY id DESC LIMIT 1`))[0];
await sqlw(`UPDATE files SET review_state = 'pending', reviewed_at = NULL WHERE order_id = ${geleverd.id} AND kind = 'delivery'`);
await sqlw(`UPDATE orders SET closed_at = NULL, revision_round_at = NULL WHERE id = ${geleverd.id}`);
const tg = await tokenVoor(geleverd.id); const tl = lopend ? await tokenVoor(lopend.id) : null;
for (const thema of ['licht', 'donker']) for (const [w, mob] of [[1440, false], [390, true]]) {
  const k = await start({ mobiel: mob, viewport: mob ? null : { width: w, height: 900 } });
  for (const [n, t] of [['geleverd', tg], ['lopend', tl]]) {
    if (!t) continue;
    await k.page.goto(`${SITE}/o/${t}?thema=${thema}`, { waitUntil: 'load' }); await k.page.waitForTimeout(400);
    const sc = await k.page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    console.log(thema, w, n, 'scroll', sc);
    await k.page.screenshot({ path: `${D}/${n}-${thema}-${w}.png`, fullPage: true });
  }
}
process.exit(0);
