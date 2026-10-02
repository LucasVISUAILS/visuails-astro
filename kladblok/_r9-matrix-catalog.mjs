// Ronde 9 · stap 2.1: catalog — elke achtergrond, beeldverhouding en marktplaats komt goed in het dossier en in /admin.
import { start, SITE, sql, sqlw } from './_dl.mjs';
import { bestel } from './_bestel.mjs';
import { adminLogin } from './_admin.mjs';
const k = await start(); const { page } = k;
const admin = await k.ctx.newPage(); await adminLogin(admin);
const cellen = [
  ['achtergrond off-white', { background: 'off-white' }],
  ['achtergrond beige', { background: 'beige' }],
  ['achtergrond eigen kleur', { background: 'custom', stap1: async (p) => { const h = p.locator('input[name="background_hex"], input[name="bg_hex"], input[type="color"]').first(); if (await h.count()) await h.fill('#335577'); } }],
  ['verhouding 4:5', { ratio: 'portrait45' }],
  ['verhouding 3:4', { ratio: 'portrait34' }],
  ['verhouding 16:9', { ratio: 'wide' }],
  ['verhouding 9:16', { ratio: 'story' }],
  ['kanalen amazon+bol+zalando', { stap1: async (p) => { await p.evaluate(() => { const d = document.querySelector('input[name^="channel"]')?.closest('details'); if (d) d.open = true; }); for (const c of ['amazon', 'bol', 'zalando']) { const l = p.locator(`label:has(input[name^="channel"][value="${c}"])`).first(); if (await l.count()) await l.click(); } } }],
  ['model Ava', { model: 'ava' }],
];
let t = 0;
for (const [naam, o] of cellen) {
  t += 1; await sqlw('DELETE FROM rate_limits');
  const email = `cat${Date.now() % 100000}${t}@merk.test`;
  try {
    await bestel(page, { pad: '/nl/start/catalog', aantal: 1, land: 'NL', vat: null, klant: { email, first_name: 'Cato', brand: 'Matrix Catalog' }, ...o });
  } catch (e) { console.log(`${naam.padEnd(28)} FOUT ${String(e.message).slice(0, 160)}`); continue; }
  const [d] = await sql(`SELECT id, ref, total_cents, details_json FROM orders WHERE email='${email}'`);
  if (!d) { console.log(`${naam.padEnd(28)} geen bestelling`); continue; }
  const det = JSON.parse(d.details_json || '{}');
  await admin.goto(`${SITE}/admin/orders/${d.id}/files`);
  const koos = await admin.evaluate(() => { const m = document.querySelector('main').innerText; const i = m.indexOf('WAT DE KLANT KOOS'); return m.slice(i + 18, m.indexOf('HET WERK ERIN') > i ? m.indexOf('HET WERK ERIN') : i + 300).replace(/\s+/g, ' ').trim(); });
  console.log(`${naam.padEnd(28)} ${d.ref} ${d.total_cents} · bg=${det.background || '-'}${det.background_hex ? ' ' + det.background_hex : ''} ratio=${det.ratio || '-'} kanalen=${det.channels || det.channel || '-'} model=${det.model || '-'} || admin: ${koos.slice(0, 160)}`);
}
process.exit(0);
