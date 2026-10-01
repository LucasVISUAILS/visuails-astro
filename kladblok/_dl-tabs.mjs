// Elke Studio-tab per abonnementsvorm: tekst, fouten, en wat opvalt.
import { start, tekst, SITE, foto } from './_dl.mjs';
import { studioLogin } from './_studio.mjs';
const tabs = ['', '?tab=planning', '?tab=bestellen', '?tab=edities', '?tab=look', '?tab=facturering'];
for (const email of process.argv.slice(2)) {
  const s = await start(); const { page } = s;
  await studioLogin(page, email);
  console.log(`\n######## ${email}`);
  for (const t of tabs) {
    const r = await page.goto(SITE + '/account/plan/' + t, { waitUntil: 'load' });
    const x = (await tekst(page, 'main')).replace(/\s+/g, ' ');
    const verdacht = [...new Set((x.match(/(undefined|NaN|null|\[object|€ ?0[,.]00|0 van de 0|van de 0|slot(s)? |TODO|monthly|yearly|prepaid|maat\b)/g) || []))];
    console.log(`${t || '(maand)'} ${r.status()} ${x.length}t ${verdacht.length ? 'LET OP: ' + verdacht.join(', ') : ''}`);
    if (t === '' || t === '?tab=facturering') console.log('   ', x.slice(0, 700));
    await foto(page, `tab-${email.split('@')[0]}-${(t || 'maand').replace(/\W/g, '')}`, { vol: true });
  }
  console.log(s.fouten.filter((f) => !/account\/me/.test(f)));
  await s.stop();
}
