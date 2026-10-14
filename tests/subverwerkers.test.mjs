/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE LIJST ONTVANGERS — ÉÉN BRON, EN DE MELDING VOORAF — 8 oktober 2026 (o08, o09)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * src/data/subverwerkers.js is sinds vandaag de enige plek waar staat wie de
 * gegevens van een klant ontvangt. Het privacybeleid (§5) en de
 * verwerkersovereenkomst (§8) lezen hem; het register volgt hem (zie
 * tests/register.test.mjs). Deze toets houdt drie dingen vast:
 *
 *   1 · ELKE REGEL IS COMPLEET, in beide talen. Een lege "waar" of een
 *       ontbrekende Engelse grondslag is op een juridische pagina een gat dat
 *       niemand ziet tot een klant ernaar vraagt.
 *   2 · DE DATUM "LAATST GEWIJZIGD" VEROUDERT NIET STIL. Zelfde regel als in
 *       tests/juridische-datums.test.mjs: git mag niet nieuwer zijn dan de datum.
 *   3 · DE MELDTERMIJN IS ÉÉN GETAL. "30 dagen vooraf" stond met de hand op vier
 *       plekken; een nieuwe maker valt er sinds vandaag ook onder, dus het getal
 *       dat de klant leest en het getal waar Lucas zich aan houdt, moeten één zijn.
 */
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  ONTVANGERS, LIJST_GEWIJZIGD, MELDTERMIJN_DAGEN, subverwerkers, ontvangers, lijstGewijzigdOp, lijstRegel,
} from '../src/data/subverwerkers.js';
import { LAATST_BIJGEWERKT } from '../src/data/juridischeDatums.js';
import { buildStaat } from './lib/build.mjs';

let pass = 0;
let fail = 0;
function ok(name, got, want = true, shown) {
  const good = got === want;
  if (good) pass++; else fail++;
  console.log(`${good ? ' ok  ' : ' FAIL'} ${String(name).padEnd(62)}${good ? '' : `verwacht ${JSON.stringify(want)} kreeg ${JSON.stringify(shown ?? got)}`}`);
}
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

console.log('\nVISUAILS — de lijst ontvangers (o08, o09)\n');

console.log('elke regel is compleet, in beide talen');
{
  const ids = new Set();
  for (const o of ONTVANGERS) {
    ok(`${o.id}: unieke id`, ids.has(o.id), false);
    ids.add(o.id);
    ok(`${o.id}: heeft een naam`, typeof o.naam === 'string' && o.naam.trim().length > 2, true);
    for (const veld of ['wat', 'waar', 'grond']) {
      ok(`${o.id}: ${veld} in het Nederlands en het Engels`,
        !!(o[veld] && String(o[veld].nl || '').trim() && String(o[veld].en || '').trim()), true);
    }
    if (o.via) ok(`${o.id}: "via" wijst naar een bestaande partij`, ONTVANGERS.some((x) => x.id === o.via), true);
  }
  /* Wie er MOET staan, na vandaag. */
  const namen = ontvangers('nl').map((o) => o.naam);
  ok('WhatsApp (Meta) staat erin (o09)', namen.includes('WhatsApp Ireland Ltd. (Meta)'), true);
  ok('het platform staat erin', namen.includes('Magnific AI, S.L.U.'), true);
  ok('en de modelmaker, via het platform (o08)',
    ontvangers('nl').some((o) => o.naam === 'Google (Gemini)' && o.via === 'magnific'), true);
  ok('en de tweede maker, ook via het platform (ko08 = a)',
    ontvangers('nl').some((o) => o.naam === 'ByteDance (BytePlus Pte. Ltd.)' && o.via === 'magnific' && o.waar === 'Singapore'), true);
  ok('de meldtermijn is 14 dagen (kmeld = b)', MELDTERMIJN_DAGEN, 14);
  /* Mollie is voor de betaling een eigen verantwoordelijke en raakt het
     beeldmateriaal niet; die staat als eigen alinea in het privacybeleid. */
  ok('Mollie staat er niet in', namen.some((n) => /Mollie/.test(n)), false);
  ok('alles in de lijst ontvangt beeldmateriaal of staat in het privacybeleid',
    subverwerkers('en').length <= ontvangers('en').length, true);
}

console.log('\nde datum "laatst gewijzigd"');
{
  ok('LIJST_GEWIJZIGD is een datum', /^\d{4}-\d{2}-\d{2}$/.test(LIJST_GEWIJZIGD), true, LIJST_GEWIJZIGD);
  const d = new Date(`${LIJST_GEWIJZIGD}T00:00:00Z`);
  ok('en geen datum in de toekomst', d.getTime() <= Date.now() + 864e5, true, LIJST_GEWIJZIGD);
  /* 11 oktober 2026: ByteDance erbij (ko08 = a). */
  ok('als tekst, Nederlands', lijstGewijzigdOp('nl'), '11 oktober 2026');
  ok('als tekst, Engels', lijstGewijzigdOp('en'), '11 October 2026');
  ok('de regel boven de lijst noemt hem', lijstRegel('nl').includes(lijstGewijzigdOp('nl')), true);
  /* Een gewijzigde lijst is een gewijzigd document: de datum bovenaan de twee
     pagina's mag niet ouder zijn dan de lijst die ze afdrukken. */
  for (const doc of ['privacy', 'data-processing-agreement']) {
    ok(`${doc}: "laatst bijgewerkt" is niet ouder dan de lijst`,
      LAATST_BIJGEWERKT[doc] >= LIJST_GEWIJZIGD.slice(0, 7), true, `${LAATST_BIJGEWERKT[doc]} < ${LIJST_GEWIJZIGD}`);
  }
  /* En git mag niet nieuwer zijn dan de datum, op maandniveau — dezelfde regel als
     tests/juridische-datums.test.mjs. Zonder git (een kopie zonder .git) slaat
     hij over in plaats van rood te gaan. */
  let gitMaand = '';
  try {
    gitMaand = execFileSync('git', ['log', '-1', '--format=%cs', '--', 'src/data/subverwerkers.js'], { cwd: ROOT, encoding: 'utf8' }).trim().slice(0, 7);
  } catch { gitMaand = ''; }
  if (gitMaand) {
    ok('git is niet nieuwer dan LIJST_GEWIJZIGD', gitMaand <= LIJST_GEWIJZIGD.slice(0, 7), true, `git ${gitMaand}`);
  } else {
    console.log('      (git overgeslagen — bestand nog niet vastgelegd of geen git)');
  }
}

console.log('\nde melding vooraf is één getal, en geldt ook voor een nieuwe maker');
{
  ok('MELDTERMIJN_DAGEN is een positief geheel getal', Number.isInteger(MELDTERMIJN_DAGEN) && MELDTERMIJN_DAGEN > 0, true);
  const en = read('src/pages/data-processing-agreement.astro');
  const nl = read('src/pages/nl/data-processing-agreement.astro');
  ok('EN §8 gebruikt de constante', en.includes('<strong>at least {MELDTERMIJN_DAGEN} days in advance</strong>'), true);
  ok('NL §8 gebruikt de constante', nl.includes('<strong>minstens {MELDTERMIJN_DAGEN} dagen vooraf</strong>'), true);
  ok('EN geen ingetypte 30 dagen meer bij de melding', /30 days(’|') notice|at least 30 days/.test(en), false);
  ok('NL idem', /melding van 30 dagen|minstens 30 dagen/.test(nl), false);
  /* De kern van o08: een nieuwe MAKER is een toevoeging, een nieuw model van een
     bekende maker niet. Staat dat er niet, dan omzeilt elke modelwissel de
     melding — precies wat de doorlichting vond. */
  ok('EN een nieuwe maker valt onder de melding', /a maker that is not on the list yet is an addition/.test(en), true);
  ok('EN een nieuwer model van een bekende maker niet', /A newer model from a maker already on the list is not a change/.test(en), true);
  ok('NL een nieuwe maker valt onder de melding', /een maker die nog niet in de lijst staat is een toevoeging/.test(nl), true);
  ok('NL een nieuwer model niet', /Een nieuwer model van een maker die er al in staat, is geen wijziging/.test(nl), true);
  ok('EN bezwaar maken staat erbij', /you may object during that period/.test(en), true);
  ok('NL idem', /je mag er in die periode bezwaar tegen maken/.test(nl), true);
}

console.log('\nde gebouwde pagina\'s tonen de lijst en de datum');
{
  const pad = (p) => new URL(`../dist/${p}/index.html`, import.meta.url);
  /* Een build die er is maar ouder is dan de bron, bewijst niets — zie
     tests/lib/build.mjs. Dan overslaan in plaats van een oude pagina te lezen. */
  const staat = buildStaat(pad('data-processing-agreement'));
  if (!staat.er || staat.oud) {
    console.log(`      (overgeslagen — ${staat.uitleg})`);
  } else {
    const vwo = { en: readFileSync(pad('data-processing-agreement'), 'utf8'), nl: readFileSync(pad('nl/data-processing-agreement'), 'utf8') };
    const priv = { en: readFileSync(pad('privacy'), 'utf8'), nl: readFileSync(pad('nl/privacy'), 'utf8') };
    for (const lang of ['en', 'nl']) {
      ok(`${lang}: de overeenkomst toont de datum`, vwo[lang].includes(lijstGewijzigdOp(lang)), true);
      ok(`${lang}: het privacybeleid ook`, priv[lang].includes(lijstGewijzigdOp(lang)), true);
      for (const s of subverwerkers(lang)) {
        const naam = s.naam.replace(/&/g, '&amp;');
        ok(`${lang}: de overeenkomst noemt ${s.naam}`, vwo[lang].includes(naam), true);
        ok(`${lang}: het privacybeleid noemt ${s.naam}`, priv[lang].includes(naam), true);
      }
    }
  }
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
