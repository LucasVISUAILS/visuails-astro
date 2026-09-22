/* Lost elk token in admin.css/portal.css/account.css/global.css OP?
   Een CSS-variabele die naar zichzelf wijst (direct of via een omweg) is
   ONGELDIG op berekeningstijd: de declaratie verdwijnt, de regel erft, en je
   ziet een witte knop met witte letters in plaats van een fout.

   Dit is de tweede keer dat die val toeslaat — de eerste was --ink/--ink-1 in
   global.css, en toen was de kop van de voorpagina onzichtbaar. Daarom staat
   hij nu in een script. */
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage();
let stuk = 0;
for (const blad of process.argv.slice(2)) {
  const css = (await import('node:fs')).readFileSync(blad, 'utf8');
  await p.setContent('<!doctype html><html><head><style>' + css + '</style></head><body><b>x</b></body></html>');
  /* ALLEEN WAT OP :root STAAT. global.css en stijl22.css zetten tientallen
     tokens binnen een scope (.s22, .studio, .lime-plate); die lossen op :root
     terecht niet op en zijn geen fout. Een veeg die elf valse meldingen geeft,
     wordt niet gedraaid. De drie handgekopieerde stylesheets zetten alles op
     :root, en daar is deze controle dus wél uitputtend. */
  const wortel = [...css.matchAll(/:root[^{]*\{([\s\S]*?)\n\}/g)].map((m) => m[1]).join('\n');
  const namen = [...new Set([...wortel.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gmi)].map((m) => m[1]))];
  const leeg = await p.evaluate((ns) => {
    const c = getComputedStyle(document.documentElement);
    return ns.filter((n) => c.getPropertyValue(n).trim() === '');
  }, namen);
  console.log(`${blad}  ${namen.length} tokens, ${leeg.length} lossen niet op`);
  for (const n of leeg) console.log('   ' + n);
  stuk += leeg.length;
}
await b.close();
process.exit(stuk ? 1 : 0);
