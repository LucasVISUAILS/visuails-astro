/* VISUAILS — de dichte proef met meer schaarste, en eerlijk. 11 oktober 2026 (kG2, K5 punt 4).
 *
 *   node tests/proef-schaarste.test.mjs      (geen server)
 *
 * Lucas: *"Is het niet beter om iets meer schaarste gevoel te creëren in plaats
 * van 'even niet beschikbaar', om klanten het gevoel te geven dat als ze zich niet
 * aanmelden met email ze de volgende test sample drop ook misschien missen …"*
 *
 * Bewaakt, in NL en EN:
 *   · de dichte teksten zeggen: rondes, een beperkt aantal per ronde, wie op de
 *     lijst staat hoort het als eerste; "even niet beschikbaar" is weg;
 *   · EERLIJK: geen getal, geen aftelling, geen "nog N plekken" in de teksten
 *     (consumentenrecht: geen misleidende schaarste); alleen de prijs uit pricing.js;
 *   · de mail "de nieuwe ronde is open" in dezelfde woorden, en nog steeds dat het
 *     de enige mail is en dat het adres daarna weg is (kG2 = a);
 *   · /admin/proef zegt Lucas dat hij de lijst eerst mailt, zodat "als eerste" klopt.
 */
import { readFileSync } from 'node:fs';
import { weerOpenMail } from '../src/lib/proefStand.js';
import { TEST_SAMPLE } from '../src/data/pricing.js';

let pass = 0, fail = 0;
const ok = (naam, v, extra = '') => { if (v) { pass++; console.log(` ok   ${naam}`); } else { fail++; console.log(` FAIL ${naam} ${extra}`); } };
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const PAGINA = lees('src/components/TestSampleHal.astro');

/* De teksten uit de twee COPY-blokken: alles tussen `dichtH:` en `wachtNoot:`. */
const blokken = [...PAGINA.matchAll(/\n  dichtH: [\s\S]*?\n  wachtNoot: [^\n]*/g)].map((m) => m[0]);
ok('twee taalblokken met de dichte teksten gevonden', blokken.length === 2, String(blokken.length));
const [NL, EN] = blokken;
const veld = (blok, naam) => (new RegExp(`\\n  ${naam}: '((?:[^'\\\\]|\\\\.)*)'`).exec(blok) || [])[1] || '';

console.log('\nde woorden');
ok('NL kop: "De proef opent in rondes"', veld(NL, 'dichtH') === 'De proef opent in rondes');
ok('EN kop: "The test sample opens in rounds"', veld(EN, 'dichtH') === 'The test sample opens in rounds');
ok('NL: beperkt aantal per ronde, deze ronde gesloten, als eerste bericht', /Per ronde nemen we een beperkt aantal proeven aan/.test(veld(NL, 'dichtP')) && /Deze ronde is gesloten/.test(veld(NL, 'dichtP')) && /krijgt als eerste bericht als de volgende ronde opengaat/.test(veld(NL, 'dichtP')));
ok('EN: limited number per round, this round closed, first to hear', /We take a limited number of test samples per round/.test(veld(EN, 'dichtP')) && /This round is closed/.test(veld(EN, 'dichtP')) && /is the first to hear when the next round opens/.test(veld(EN, 'dichtP')));
ok('alleen lifestyle: dezelfde gedachte (NL en EN)', /beperkt aantal plekken per ronde/.test(veld(NL, 'lifestyleP')) && /limited number of places per round/.test(veld(EN, 'lifestyleP')));
ok('de knop: "Zet me op de lijst" / "Put me on the list"', veld(NL, 'wachtKnop') === 'Zet me op de lijst' && veld(EN, 'wachtKnop') === 'Put me on the list');
ok('"even niet beschikbaar" is weg', !/even niet beschikbaar|not available right now/i.test(NL + EN));
ok('de wachtlijst blijft één mail, daarna weg (kG2 = a)', /één keer; daarna halen we je adres van de lijst/.test(veld(NL, 'wachtOk')) && /once; after that we take your address off the list/.test(veld(EN, 'wachtOk')));

console.log('\neerlijk');
for (const [taal, blok] of [['NL', NL], ['EN', EN]]) {
  ok(`${taal}: geen enkel getal in de dichte teksten`, !/\d/.test(blok.replace(/wachtFout: \{[\s\S]*?\},/, '')), (blok.match(/[^\n]*\d[^\n]*/) || [''])[0].slice(0, 80));
  ok(`${taal}: geen "nog N plekken", geen aftelling, geen "bijna vol"`, !/nog \w+ plek|only \w+ (places|spots) left|countdown|aftel|bijna vol|almost full|laatste plekken|last (places|spots)/i.test(blok));
}

console.log('\nde mail als hij weer opengaat');
for (const lang of ['nl', 'en']) {
  const m = weerOpenMail(lang, 'open', 'https://visuails.com');
  const tekst = m.html.replace(/<[^>]+>/g, ' ');
  ok(`${lang}: onderwerp "nieuwe ronde"`, lang === 'nl' ? m.subject === 'De nieuwe proefronde van VISUAILS is open' : m.subject === 'A new VISUAILS test sample round is open');
  ok(`${lang}: kop "De nieuwe ronde is open"`, lang === 'nl' ? /De nieuwe ronde is open/.test(tekst) : /The new round is open/.test(tekst));
  ok(`${lang}: je hoort het als eerste, en een beperkt aantal per ronde`, lang === 'nl'
    ? /dus je hoort het als eerste/.test(tekst) && /Per ronde nemen we een beperkt aantal proeven aan/.test(tekst)
    : /so you are the first to hear/.test(tekst) && /We take a limited number of test samples per round/.test(tekst));
  /* De alinea over de ronde (de voettekst van elke mail draagt het KvK-nummer). */
  const alinea = (m.html.match(/<p[^>]*>[^<]*(?:ronde is open|round is open)[^<]*<\/p>/) || [''])[0].replace(/<[^>]+>/g, '');
  ok(`${lang}: de prijs uit pricing.js en geen ander getal in die alinea`, alinea.includes(TEST_SAMPLE[lang].price) && !/\d/.test(alinea.split(TEST_SAMPLE[lang].price).join('').replace(/&#\d+;/g, '')), alinea.slice(0, 120));
  ok(`${lang}: nog steeds de enige mail, adres daarna weg`, lang === 'nl' ? /Dit is de enige mail die je hierover krijgt/.test(tekst) : /This is the only email you get about this/.test(tekst));
  ok(`${lang}: één knop naar /test-sample`, /test-sample\//.test(m.html));
}
{
  const l = weerOpenMail('nl', 'lifestyle').html;
  ok('alleen lifestyle open: de mail zegt het', /de nieuwe ronde is open, voor een lifestylecarrousel/.test(l));
}

console.log('\n/admin/proef');
{
  const admin = lees('src/lib/admin.js');
  ok('de uitleg noemt de nieuwe kop', /toont \/test-sample "De proef opent in rondes"/.test(admin));
  ok('en zegt: mail de lijst meteen, vóór je de ronde ergens anders noemt', /Stuur de mail aan de wachtlijst dus meteen na het openzetten, vóór je de nieuwe ronde ergens anders noemt\./.test(admin));
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
