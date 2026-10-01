// Ronde 4: het eerste tabblad van het abonnement — credits en tegoed — en facturering.
import { start, foto, tekst, sql, sqlw, SITE } from './_dl.mjs';
import { studioLogin } from './_studio.mjs';
const email = process.argv[2] || 'nora@merk.test';
const tegoed = process.argv[3];
const mobiel = process.argv[4] === 'mobiel';
if (tegoed) {
  const k = await sql(`SELECT id FROM customers WHERE email = '${email}'`);
  await sqlw(`INSERT INTO customer_credits (customer_id, delta_cents, reason) VALUES (${k[0].id}, ${Number(tegoed)}, 'Tegoed na annulering (doorloop)')`);
}
await sqlw('DELETE FROM rate_limits');
const s = await start({ mobiel }); const { page } = s;
await studioLogin(page, email);
for (const [naam, pad] of [['maand', '/account/plan'], ['facturering', '/account/plan?tab=facturering'], ['overzicht', '/account']]) {
  await page.goto(SITE + pad, { waitUntil: 'load' });
  console.log(`— ${naam}:`, (await tekst(page, 'main')).replace(/\s+/g, ' ').slice(0, 900));
  await foto(page, `saldo-${naam}${mobiel ? '-mob' : ''}`, { vol: true });
}
console.log(s.fouten);
await s.stop();
