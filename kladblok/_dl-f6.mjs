// F6: de adminschermen die nog niet inhoudelijk gebruikt waren — planning,
// maandset, aanbevelingen, trechter, berichten, log. Tekst op Engelse resten,
// consolefouten, en of elk scherm zegt wat het is.
import { start, foto, tekst, SITE, sqlw } from './_dl.mjs';
import { adminLogin } from './_admin.mjs';

await sqlw('DELETE FROM rate_limits');
const s = await start(); const { page } = s;
await adminLogin(page);
const ENGELS = /\b(the|and|order[s]?|customer[s]?|save|update|delete|submit|loading|error|week of|no \w+ yet|pending|paid|unpaid|received|delivered)\b/gi;
for (const pad of ['/admin/planning', '/admin/maandset', '/admin/testimonials', '/admin/funnel', '/admin/berichten', '/admin/log', '/admin/security']) {
  const r = await page.goto(SITE + pad, { waitUntil: 'load' });
  const t = (await tekst(page, 'main, body')).replace(/\s+/g, ' ');
  const eng = [...new Set((t.match(ENGELS) || []).map((w) => w.toLowerCase()))];
  console.log(`${pad} → ${r.status()} · ${t.length} tekens · Engels?: ${eng.join(', ') || '—'}`);
  console.log('   ' + t.slice(0, 260));
  await foto(page, 'f6' + pad.replace(/\//g, '-'), { vol: true });
}
console.log('fouten:', s.fouten);
await s.stop();
