/* VISUAILS — de klantmails spreken de taal van de klant.  npm run test:aanhef
 *
 * ── WAT HIER GETOETST WORDT ──────────────────────────────────────────────────
 *
 * Vier mails die naar een klant gaan, in beide talen, en één vraag per mail:
 * staat de aanhef in dezelfde taal als de rest van de brief.
 *
 * Dat klinkt als een detail en het was er geen. Tot 24 augustus 2026 stond op
 * vier plekken `const hi = order.name ? \`Hi ${esc(order.name)},\` : 'Hi,';`, met
 * één regel erboven de vlag `nl` waar de héle rest van diezelfde mail op
 * splitste. Elke Nederlandse klant kreeg dus "Hi Mara," boven een verder
 * volledig Nederlandse brief — bij de bevestiging van zijn bestelling, bij de
 * levering, bij een herlevering en bij een nieuwe portaallink.
 *
 * Vier kopieën van één regel, en de vijfde klantmail (mailLegeWachtrij in
 * cron/index.js) deed het wél goed. Dat laatste is de reden dat dit een toets
 * verdient in plaats van alleen een reparatie: de goede versie stond er al, en
 * dat heeft de verkeerde vier keer niet tegengehouden.
 *
 * ── TEGEN DE ECHTE RENDERFUNCTIES ────────────────────────────────────────────
 *
 * Niet tegen greeting() alleen. Dat die functie klopt is de makkelijke helft; de
 * vraag is of de vier mails hem ook gebruiken, mét de taal van díé bestelling.
 * Een toets op de helper zou groen blijven staan terwijl één aanroeper zijn
 * eigen regel terugzet.
 *
 * ── EN DE TAAL VAN DE BRIEF WORDT APART VASTGESTELD ─────────────────────────
 *
 * `lang="nl"` op de <html> van de mail komt uit dezelfde `nl`-vlag als de
 * aanhef, dus dat naast elkaar leggen bewijst niets. Er wordt daarom gezocht
 * naar een woord uit de BODY dat alleen in die taal voorkomt. Twee metingen die
 * uit dezelfde bron komen, zijn één meting.
 */
import { customerEmail } from '../functions/api/order.js';
import { deliveryEmail, freshLinkEmail, redeliveryEmail } from '../src/lib/admin.js';
import { greeting } from '../src/lib/mailTemplate.js';

const R = [];
const ok = (naam, gekregen, verwacht = true) => R.push({
  naam,
  verwacht: JSON.stringify(verwacht),
  gekregen: JSON.stringify(gekregen),
  pass: JSON.stringify(gekregen) === JSON.stringify(verwacht),
});

const NAAM = 'Mara';
const order = (lang) => ({
  id: 1, ref: 'VIS-2026-0001', name: NAAM, email: 'klant@voorbeeld.nl',
  lang, status: 'delivered', brand: 'Voorbeeldmerk',
});

/* Per mail: hoe hij gerenderd wordt, en een woord dat alléén in de Nederlandse
   body voorkomt. Dat woord is het bewijs dat de brief zelf Nederlands is. */
const MAILS = [
  {
    naam: 'bevestiging (customerEmail)',
    render: (lang) => customerEmail(lang, 'VIS-2026-0001', 'catalog', NAAM, {}),
    nlWoord: /je bestelling|we hebben je|ontvangen/i,
  },
  {
    naam: 'levering (deliveryEmail)',
    render: (lang) => deliveryEmail({ order: order(lang), link: 'https://visuails.com/o/abc', n: 3 }),
    nlWoord: /staat klaar|je bestelling|beelden/i,
  },
  {
    naam: 'herlevering (redeliveryEmail)',
    render: (lang) => redeliveryEmail({ order: order(lang), link: 'https://visuails.com/o/abc', n: 2 }),
    nlWoord: /staat klaar|nieuwe|beelden/i,
  },
  {
    naam: 'nieuwe portaallink (freshLinkEmail)',
    render: (lang) => freshLinkEmail({ order: order(lang), link: 'https://visuails.com/o/abc' }),
    nlWoord: /link|bestelling/i,
  },
];

console.log('\nde aanhef volgt de taal van de brief');
for (const m of MAILS) {
  for (const [lang, verwacht] of [['nl', `Hoi ${NAAM},`], ['en', `Hi ${NAAM},`]]) {
    let html = '';
    try { html = String(m.render(lang) || ''); } catch (e) { html = `RENDERFOUT: ${e.message}`; }
    ok(`${m.naam} — ${lang}: "${verwacht}"`, html.includes(verwacht), true);

    /* DE ANDERE TAAL MAG ER NIET IN STAAN. Zonder deze helft zou "Hi Mara," in
       een Nederlandse mail blijven staan zolang "Hoi Mara," er ook maar ergens
       stond — en een mail met twee aanhef-regels is niet minder fout. */
    const andere = lang === 'nl' ? `Hi ${NAAM},` : `Hoi ${NAAM},`;
    ok(`  en niet "${andere}"`, html.includes(andere), false);
  }

  /* De taal van de BODY, uit een ander woord dan de aanhef. */
  const nlHtml = String(m.render('nl') || '');
  ok(`${m.naam} — de brief zelf is Nederlands`, m.nlWoord.test(nlHtml), true);
}

console.log('\nde helper zelf');
{
  ok('Nederlands groet met Hoi', greeting('Mara', 'nl'), 'Hoi Mara,');
  ok('Engels met Hi', greeting('Mara', 'en'), 'Hi Mara,');
  ok('een onbekende taal valt terug op Engels', greeting('Mara', 'de'), 'Hi Mara,');
  ok('geen taal ook', greeting('Mara'), 'Hi Mara,');

  /* GEEN NAAM IS EEN GELDIG GEVAL — een proefvisual vraagt er niet altijd om.
     "Hoi ," met een spatie voor de komma leest als een omgevallen sjabloon. */
  ok('zonder naam alleen de aanhef', greeting('', 'nl'), 'Hoi,');
  ok('null telt als zonder naam', greeting(null, 'en'), 'Hi,');
  ok('en spaties ook', greeting('   ', 'nl'), 'Hoi,');

  /* De esc() zit IN de helper en niet bij de aanroeper: vier aanroepers die hem
     zelf moeten zetten, zijn vier kansen om de naam van een klant ongefilterd in
     de HTML te zetten. */
  ok('de naam wordt ontsmet', greeting('A<b>&', 'nl'), 'Hoi A&lt;b&gt;&amp;,');
}

console.log('\nen de regel staat nergens meer met de hand');
{
  const { readFileSync } = await import('node:fs');
  const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
  /* Alleen in een STRING, niet in een comment: mailTemplate.js draagt de oude
     regel in zijn kop als uitleg van wat er is rechtgezet, en die hoort te
     blijven staan. Vandaar de zoektocht naar de toewijzing en niet naar de tekst. */
  const patroon = /const\s+hi\s*=\s*[^;]*`Hi \$\{/;
  for (const p of ['functions/api/order.js', 'src/lib/admin.js', 'src/lib/account.js']) {
    ok(`${p}: geen handgeschreven Engelse aanhef meer`, patroon.test(lees(p)), false);
  }
}

const w = Math.max(...R.map((r) => r.naam.length));
for (const r of R) console.log(`${r.pass ? ' ok ' : 'FOUT'}  ${r.naam.padEnd(w)}  verwacht ${r.verwacht.padEnd(10)} kreeg ${r.gekregen}`);
const stuk = R.filter((r) => !r.pass).length;
console.log(`\n${R.length - stuk}/${R.length} geslaagd`);
process.exit(stuk ? 1 : 0);
