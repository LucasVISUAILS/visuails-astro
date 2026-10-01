import { start, foto, tekst, SITE } from './_dl.mjs';
import { adminLogin } from './_admin.mjs';
const s = await start(); const { page } = s;
await adminLogin(page);
const pads = ['/admin', '/admin/planning', '/admin/customers', '/admin/maandset', '/admin/testimonials', '/admin/vat', '/admin/funnel', '/admin/berichten', '/admin/log', '/admin/security', '/admin/diagnose', '/admin/agenda'];
const EN = /\b(the|and|your|order|orders|customer|customers|file|files|upload|delete|save|update|cancel|hidden|client|status for|this|not yet|none|payment|refund|week of|no )\b/gi;
for (const p of pads) {
  const r = await page.goto(SITE + p, { waitUntil: 'load' });
  const t = (await tekst(page, 'body')).replace(/\n{2,}/g, '\n');
  const en = [...new Set((t.match(/[^\n]*\b(the|your|customer|client|this order|Nothing|None yet|Save|Update|Delete)\b[^\n]*/g) || []))].slice(0, 8);
  console.log(`\n### ${p} → ${r.status()} (${t.length} tekens)`);
  for (const l of en) console.log('  EN? ', l.slice(0, 160));
  await foto(page, 'admin' + p.replace(/\W/g, '-'), { vol: true });
}
console.log(s.fouten);
await s.stop();
