/* HET MERKTEKEN STAAT OP ÉÉN PLEK — 8 september 2026
   ═══════════════════════════════════════════════════════════════════════════
   Lucas: *"Ook ® overal verwijderen omdat je dit volgens mij niet zomaar mag
   gebruiken. Als dat wel kan, houden."*

   De afweging staat in src/data/brand.js bij MERKTEKEN, met de twee bronnen die
   het niet met elkaar eens zijn. De korte versie: BOIP zegt dat geen wet het
   verbiedt, misleidende handelspraktijken zeggen iets anders, ™ mag altijd en
   belooft niets wat niet waar is.

   Deze test bewaakt niet WELK teken het is — dat is Lucas' keuze en die mag
   morgen ® worden als VISUAILS ingeschreven staat. Hij bewaakt dat het teken
   op ÉÉN plek staat. Het stond namelijk letterlijk overgetypt op zeven plekken
   in vijf bestanden, en dat is precies de vorm waarin zo'n verandering half
   blijft staan: vijf schermen nieuw, twee schermen oud, en niemand die het ziet
   omdat het één karakter is in een labelregel.

   CSS kan geen JavaScript lezen, dus --merkteken in global.css is een tweede
   kopie. Die wordt hier aan de eerste vastgeknoopt. */
import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import { MERKTEKEN, MERK } from '../src/data/brand.js';

let goed = 0;
let totaal = 0;
function check(naam, waarde, verwacht) {
  totaal += 1;
  const ok = JSON.stringify(waarde) === JSON.stringify(verwacht);
  if (ok) goed += 1;
  console.log(`${ok ? ' ok  ' : 'FAIL '} ${naam.padEnd(58)}${ok ? '' : `verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(waarde)}`}`);
}

console.log('\nde constante zelf');
{
  check('MERKTEKEN is één teken', [...MERKTEKEN].length, 1);
  check('MERK is de naam plus het teken', MERK, `VISUAILS${MERKTEKEN}`);
  /* ® mag hier komen te staan zodra VISUAILS ingeschreven is. Dan verandert
     deze regel mee, en niet eerder — de test hoort niet te beslissen wat er
     juridisch waar is, maar wel dat iemand er bewust langs komt. */
  check('en het is ™ zolang er geen inschrijving is', MERKTEKEN, '™');
}

console.log('\nde CSS-kopie loopt niet uit de pas');
{
  const css = readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');
  const m = css.match(/--merkteken:\s*"([^"]+)"/);
  check('--merkteken staat in global.css', !!m, true);
  if (m) {
    /* CSS schrijft een teken als een escape ("\2122"), want een letterlijke ™
       in een content-waarde is afhankelijk van de tekencodering van het
       bestand. Omzetten en dan pas vergelijken. */
    const uitCss = m[1].replace(/\\([0-9a-fA-F]{1,6})\s?/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)));
    check('en hij is hetzelfde teken als MERKTEKEN', uitCss, MERKTEKEN);
  }
  check('en .eyebrow-page zet hem samen in plaats van hem te typen',
    /\.eyebrow-page::before\s*\{[^}]*content:\s*"VISUAILS"\s*var\(--merkteken\)/.test(css), true);
}

console.log('\nnergens anders staat het teken overgetypt');
{
  /* Alles wat een bezoeker kan bereiken. brand.js is de bron en global.css de
     vastgeknoopte kopie; die twee zijn hierboven al gecontroleerd. */
  /* Eén glob per aanroep, en meteen genormaliseerd — tests/paths.test.mjs eist
     dat elk globresultaat binnen drie regels schuine strepen krijgt, en vier
     globs in één array zetten die afstand te ver op. */
  const zoek = (patroon) => globSync(patroon).map((f) => f.replace(/\\/g, '/'));
  const bestanden = [
    ...zoek('src/**/*.astro'),
    ...zoek('src/**/*.js'),
    ...zoek('src/**/*.css'),
    ...zoek('functions/**/*.js'),
  ].filter((f) => f !== 'src/data/brand.js' && f !== 'src/styles/global.css');

  const fout = [];
  for (const f of bestanden) {
    const tekst = readFileSync(f, 'utf8');
    /* Alleen een teken dat DIRECT achter de merknaam staat. Losse ™- of
       ®-tekens elders (een klantmerk in een citaat, bijvoorbeeld) zijn niet
       ons merkteken en gaan deze test niets aan. */
    for (const m of tekst.matchAll(/VISUAILS\s*[®™]/g)) {
      const regel = tekst.slice(0, m.index).split('\n').length;
      fout.push(`${f}:${regel} — ${m[0]}`);
    }
  }
  check(`${bestanden.length} bestanden nagelopen`, fout.length, 0);
  for (const r of fout) console.log(`      ${r}`);
}

const zoekDist = (patroon) => globSync(patroon).map((f) => f.replace(/\\/g, '/'));

console.log('\nen de gebouwde site draagt precies dit teken');
{
  const paginas = zoekDist('dist/**/*.html');
  if (!paginas.length) {
    console.log(' --   niet gecontroleerd: er is geen dist/');
  } else {
    const ander = [];
    for (const f of paginas) {
      const html = readFileSync(f, 'utf8');
      for (const m of html.matchAll(/VISUAILS\s*[®™]/g)) {
        if (m[0] !== MERK) ander.push(`${f.replace(/^dist\//, '')} — ${m[0]}`);
      }
    }
    check(`${paginas.length} gebouwde pagina's dragen alleen ${MERK}`, ander.length, 0);
    for (const r of ander.slice(0, 10)) console.log(`      ${r}`);
  }
}

console.log(`\n${goed}/${totaal} geslaagd`);
if (goed !== totaal) process.exit(1);
