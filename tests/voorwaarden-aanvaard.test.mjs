/* VISUAILS — voorwaarden §10: stil afgerond = aanvaard, en weer openen (11 oktober 2026, w2 = b).
 *
 * Lucas koos bij w2 voor b: achter "dan ronden we je bestelling af" komt "De
 * levering geldt dan als aanvaard." Met zijn notitie erbij één zin dat VISUAILS
 * een afgeronde bestelling in overleg weer kan openen — een bevoegdheid van ons,
 * geen recht van de klant. De tekst staat één keer (REVISIEBELEID in pricing.js)
 * en /terms §10, /faq en Studio lezen hem uit.
 */
import { readFileSync, existsSync } from 'node:fs';
import { revisiebeleid, REVISIE_DAGEN } from '../src/data/pricing.js';
import { LAATST_BIJGEWERKT } from '../src/data/juridischeDatums.js';

let goed = 0, fout = 0;
const ok = (naam, w, v = true) => {
  const p = JSON.stringify(w) === JSON.stringify(v);
  if (p) goed++; else fout++;
  console.log(`${p ? '  ok ' : 'FAIL'}  ${naam}${p ? '' : `    verwacht ${JSON.stringify(v)} kreeg ${JSON.stringify(w)}`}`);
};
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

const [, nl1] = revisiebeleid('nl')[0];
const [, en1] = revisiebeleid('en')[0];

ok('NL: "De levering geldt dan als aanvaard." direct na het afronden',
  /dan ronden we je bestelling af\. De levering geldt dan als aanvaard;/.test(nl1));
ok('EN: gelijk', /we complete your order\. The delivery then counts as accepted;/.test(en1));
ok('NL: de downloads blijven genoemd', /je beelden blijven gewoon te downloaden/.test(nl1));
ok('EN: idem', /your images stay available to download/.test(en1));
ok('NL: weer openen in overleg, door ons', /kunnen we een afgeronde bestelling in overleg weer openen; dat beslissen wij per geval\./.test(nl1));
ok('EN: idem', /we can reopen a completed order in consultation with you; we decide that case by case\./.test(en1));
ok('NL: geen recht op heropenen beloofd', /recht op|kun je .*laten heropenen|heb je het recht/i.test(nl1), false);
ok('EN: geen recht beloofd', /you (are entitled|have the right|may ask us to reopen)|right to reopen/i.test(en1), false);
ok('de termijn komt nog steeds uit REVISIE_DAGEN', nl1.includes(`binnen ${REVISIE_DAGEN} dagen`) && en1.includes(`within ${REVISIE_DAGEN} days`));
ok('nog steeds vier treden', [revisiebeleid('nl').length, revisiebeleid('en').length], [4, 4]);

ok('/terms NL en EN lezen het revisiebeleid uit (§10)',
  /revisiebeleid\('nl'\)\.map/.test(lees('src/pages/nl/terms.astro')) && /revisiebeleid\('en'\)\.map/.test(lees('src/pages/terms.astro')));
ok('geen eigen kopie van de zin in /terms',
  /geldt dan als aanvaard|counts as accepted/.test(lees('src/pages/nl/terms.astro') + lees('src/pages/terms.astro')), false);
ok('de voorwaarden staan op oktober 2026', LAATST_BIJGEWERKT.terms, '2026-10');

/* Gebouwd? Dan ook op de pagina zelf. */
for (const [pad, zin] of [['dist/nl/terms/index.html', 'De levering geldt dan als aanvaard'], ['dist/terms/index.html', 'The delivery then counts as accepted']]) {
  if (!existsSync(new URL(`../${pad}`, import.meta.url))) { console.log(`  --   ${pad} ontbreekt (niet gebouwd), overgeslagen`); continue; }
  ok(`${pad} toont de zin`, lees(pad).includes(zin));
}

console.log(`\n${goed}/${goed + fout} geslaagd`);
if (fout) process.exit(1);
