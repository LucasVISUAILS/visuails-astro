/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE LAATSTE STAP VAN DE REVIEWLUS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * `order_feedback.testimonial_approved` bestaat sinds migratie 0020. Het scherm
 * om het vinkje te zetten kwam er in augustus 2026. En daarna gebeurde er nog
 * steeds niets: geen enkele regel op de site las die kolom. Een klant kon dus een
 * aanbeveling typen, expliciet toestemming geven, door Lucas goedgekeurd worden —
 * en de tekst kwam nergens terecht.
 *
 * Dat is erger dan een ontbrekende functie: het is toestemming vragen voor iets
 * wat je vervolgens niet doet.
 *
 * Wat hier bewaakt wordt zijn de vier dingen die deze keten stil kunnen breken:
 *
 *   · het ANKER in src/data/testimonials.js waar het script op knipt — verdwijnt
 *     dat, dan schrijft `npm run testimonials` niets meer en zegt het dat ook;
 *   · de PRIVACYGRENS in de query: drie kolommen, geen e-mail, geen bestelnummer;
 *   · de TOESTEMMING in diezelfde query, als tweede sluiting op dezelfde deur;
 *   · en dat de homepage zijn eigen kop terugneemt zodra er wél iets staat. Een
 *     kop die zegt "nog geen muur vol reviews" boven drie reviews is precies de
 *     tegenstrijdigheid waar dit blok voor bedoeld is.
 */
import { readFileSync } from 'node:fs';
import { TESTIMONIALS, TESTIMONIALS_UPDATED, testimonialsToShow } from '../src/data/testimonials.js';

let goed = 0; let totaal = 0;
function ok(naam, kreeg, verwacht = true) {
  totaal += 1;
  const isGoed = JSON.stringify(kreeg) === JSON.stringify(verwacht);
  if (isGoed) goed += 1;
  console.log(` ${isGoed ? 'ok  ' : 'FAIL'} ${String(naam).padEnd(58)}${isGoed ? '' : ` verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(kreeg)}`}`);
}

const lees = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

console.log('het gegenereerde bestand houdt zich aan zijn eigen vorm');
{
  const data = lees('../src/data/testimonials.js');
  ok('het anker waar het script op knipt staat erin', data.includes('/** @type {'), true);
  ok('de lijst is een array', Array.isArray(TESTIMONIALS), true);
  ok('de datum is leeg of een echte datum',
    TESTIMONIALS_UPDATED === '' || /^\d{4}-\d{2}-\d{2}$/.test(TESTIMONIALS_UPDATED), true);
  ok('testimonialsToShow kapt af', testimonialsToShow(0).length, 0);
  ok('en vraagt nooit meer dan er is', testimonialsToShow(99).length, TESTIMONIALS.length);

  /* Elke rij precies drie sleutels. Komt er ooit een e-mailadres of een
     bestelnummer bij, dan staat dat in een bestand dat in git zit en door de
     hele wereld gelezen wordt. */
  const sleutels = TESTIMONIALS.map((r) => Object.keys(r).sort().join(','));
  ok('elke rij draagt alleen tekst, naam en maand',
    sleutels.every((k) => k === 'month,name,text'), true);
  ok('en geen enkele rij bevat een apenstaartje',
    TESTIMONIALS.some((r) => JSON.stringify(r).includes('@')), false);
}

console.log('\nde query in het script is de privacygrens');
{
  const script = lees('../scripts/testimonials.mjs');
  ok('alleen goedgekeurde rijen', /testimonial_approved\s*=\s*1/.test(script), true);
  ok('en alleen met toestemming', /testimonial_consent\s*=\s*1/.test(script), true);
  ok('geen e-mailadres in de SELECT', /SELECT[\s\S]*?FROM/.exec(script)[0].includes('email'), false);
  ok('geen bestelnummer in de SELECT', /SELECT[\s\S]*?FROM/.exec(script)[0].includes('order_id'), false);
  /* De maand en niet de dag: een citaat dateren op de dag suggereert een
     precisie die niemand nodig heeft, en het is een gegeven minder waarmee een
     bestelling te herleiden is. */
  ok('de datum is een maand', /substr\(updated_at, 1, 7\)/.test(script), true);
  ok('het script schrijft niet als het ophalen mislukte',
    /res\.ok[\s\S]{0,400}process\.exit\(1\)/.test(script), true);
  ok('en kent een --dry om eerst te kijken', /--dry/.test(script), true);
}

/* ── "DE HOMEPAGE NEEMT ZIJN EIGEN KOP TERUG" STOND HIER ──────────────────
   Sectie 21 (5 september 2026): de voorpagina heeft geen reviewblok meer —
   Lucas: tekst mag weg zolang de kern helder blijft, en er zijn nog geen
   reviews (TESTIMONIALS is leeg). Zodra testimonialsToShow() iets teruggeeft,
   hoort er weer een plek voor en komt deze toets terug. */
console.log('\nde homepage verzint geen reviews');
{
  /* Sinds 12 oktober 2026 is de voorpagina VoorpaginaHal.astro (de hal). */
  const home = lees('../src/components/VoorpaginaHal.astro');
  /* Een klasse die met review, quote of zegt BEGINT (review-kaart, quote,
     zegt-wie). Hier stond "ergens in de klasse", en dat ging in de hal rood op
     `h-label-zegt`: de regel op de AI Act-kaart die zegt wat het IPTC-kenmerk
     betekent — geen citaat van wie dan ook. */
  ok('er staat geen getypt citaat van een klant', /class="(?:[^"]*\s)?(review|quote|zegt)[\w-]*/.test(home), false);
}

/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * HET BLOK OP DE SITE — 8 oktober 2026 (G3)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas: *"Graag wel bouwen maar onzichtbaar houden tot ik er 1 echt accepteer
 * en erin zet."* En: stilstaand tot er "echt 5 of zoiets" zijn, dan een lopende
 * band met een lichte fade aan de zijkant. Deze sectie legt vast:
 *
 *   · 0 gepubliceerd   → NIETS in de HTML: geen sectie, geen kop;
 *   · 3                → stilstaand, één lijst, geen kopie;
 *   · 5                → een band, met de lijst twee keer en de tweede aria-hidden;
 *   · "TEST — niet plaatsen" en testnamen komen er NOOIT op, ook niet tussen echte.
 *
 * Het blok wordt ECHT gerenderd, met Astro's container-API in een kleine
 * Vite-server (een paar seconden), en niet nagebootst: een toets die zijn eigen
 * versie van de opmaak controleert, bewijst niets over de opmaak die er staat.
 */
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { aanbevelingenOpSite, blokVorm, isTestExemplaar, BAND_VANAF, maandLabel } from '../src/data/aanbevelingen.js';

/* Verzonnen voorbeelden — onmiskenbaar verzonnen merken, geen echte personen. */
const ECHT = [
  { text: 'De catalogfoto’s van onze nieuwe jassen stonden binnen een dag online.', name: 'Noor', month: '2026-09' },
  { text: 'Eén keer revisie gevraagd op een kraag, en die klopte daarna precies.', name: 'Merk Voorbeeldjas', month: '2026-09' },
  { text: 'Fijn dat ik niet hoefde te regelen wie er model zou staan.', name: 'Teun van Proefmerk', month: '2026-08' },
  { text: 'De lifestylecarrousel deed het beter dan onze eigen shoot.', name: 'Atelier Verzonnen', month: '2026-08' },
  { text: 'Snel, duidelijk en zonder gedoe over bestanden.', name: 'Studio Nergens', month: '2026-07' },
];
const TESTEN = [
  { text: 'TEST — niet plaatsen. Mooie beelden, alles klopte.', name: 'Lucas', month: '2026-10' },
  { text: 'Geweldige service!', name: 'Test lifestyle', month: '2026-10' },
  { text: 'Dit is een proef, do not publish.', name: 'Iemand', month: '2026-10' },
];

console.log('\nwie er op de site komt, en in welke vorm');
{
  ok('de band begint bij vijf', BAND_VANAF, 5);
  ok('0 → niets', blokVorm(0), 'niets');
  ok('1 → stil', blokVorm(1), 'stil');
  ok('3 → stil', blokVorm(3), 'stil');
  ok('4 → stil', blokVorm(4), 'stil');
  ok('5 → band', blokVorm(5), 'band');
  ok('"TEST — niet plaatsen" is een testexemplaar', isTestExemplaar(TESTEN[0]), true);
  ok('een naam die met "Test" begint ook', isTestExemplaar(TESTEN[1]), true);
  ok('"do not publish" ook', isTestExemplaar(TESTEN[2]), true);
  ok('een gewone zin met "test" erin niet',
    isTestExemplaar({ text: 'We hebben eerst de proef gedaan als test, daarna dertig producten.', name: 'Noor' }), false);
  ok('geen enkel echt voorbeeld valt weg', aanbevelingenOpSite(ECHT).length, 5);
  ok('tussen echte vallen de testen weg', aanbevelingenOpSite([...TESTEN, ...ECHT.slice(0, 2)]).length, 2);
  ok('alleen testen → niets', aanbevelingenOpSite(TESTEN).length, 0);
  ok('een lege tekst telt niet', aanbevelingenOpSite([{ text: '   ', name: 'Noor', month: '2026-09' }]).length, 0);
  ok('de maand in het Nederlands', maandLabel('2026-10', 'nl'), 'oktober 2026');
  ok('en in het Engels', maandLabel('2026-10', 'en'), 'October 2026');
  ok('de site leest het gegenereerde bestand',
    aanbevelingenOpSite().length, TESTIMONIALS.filter((r) => !isTestExemplaar(r) && String(r.text || '').trim()).slice(0, 12).length);
}

console.log('\nhet blok, echt gerenderd');
{
  const ROOT = fileURLToPath(new URL('..', import.meta.url));
  let vite = null;
  try {
    const { createServer } = await import('vite');
    const { getViteConfig } = await import('astro/config');
    const cfg = await getViteConfig(
      { server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom', logLevel: 'silent', optimizeDeps: { noDiscovery: true, include: [] } },
      { root: ROOT, configFile: false, logLevel: 'silent' },
    )({ mode: 'test', command: 'serve' });
    vite = await createServer({ ...cfg, configFile: false, root: ROOT });
    const { default: Aanbevelingen } = await vite.ssrLoadModule('/src/components/Aanbevelingen.astro');
    const { experimental_AstroContainer } = await vite.ssrLoadModule('astro/container');
    const container = await experimental_AstroContainer.create();
    const render = (lijst, lang = 'nl') => container.renderToString(Aanbevelingen, { props: { lang, lijst, vervolg: true } });
    const tel = (html, re) => (html.match(re) || []).length;

    const nul = await render([]);
    ok('0 gepubliceerd: niets in de HTML', nul.trim(), '');
    ok('alleen testen: ook niets', (await render(TESTEN)).trim(), '');

    const drie = await render(ECHT.slice(0, 3));
    ok('3: het blok staat er, stilstaand', /data-aanbevelingen="stil"/.test(drie), true);
    ok('3: drie kaarten', tel(drie, /<li class="ab-kaart"/g), 3);
    ok('3: geen band en geen kopie', /ab-band|ab-kopie|aria-hidden="true"/.test(drie), false);
    ok('3: met een kop', /<h2 id="ab-h"/.test(drie), true);
    ok('3: hoort bij het hoofdstuk erboven', /class="paneel ab vervolg"/.test(drie), true);

    const vijf = await render(ECHT);
    ok('5: een band', /data-aanbevelingen="band"/.test(vijf), true);
    ok('5: de lijst twee keer', tel(vijf, /<ul class="ab-spoor[^"]*"/g), 2);
    ok('5: de tweede is aria-hidden', /<ul class="ab-spoor ab-kopie" role="list" aria-hidden="true"/.test(vijf), true);
    ok('5: de eerste niet', /<ul class="ab-spoor" role="list"[^>]*aria-hidden/.test(vijf), false);
    ok('5: tien kaarten, elk citaat precies twee keer', tel(vijf, /<li class="ab-kaart"/g) === 10
      && ECHT.every((r) => vijf.split(r.text).length - 1 === 2), true);
    ok('5: in de kopie staat niets wat focus kan krijgen',
      /<a\b|<button\b|tabindex="0"/.test((vijf.split('ab-kopie')[1] || '')), false);
    ok('5: het raam kan focus krijgen (en zet de band dan stil)', /class="ab-raam"[^>]*tabindex="0"/.test(vijf), true);

    const gemengd = await render([...ECHT, ...TESTEN]);
    ok('TEST-voorbeelden komen er nooit op, ook niet tussen echte',
      /TEST|niet plaatsen|do not publish|Test lifestyle/.test(gemengd), false);
    ok('  en de echte staan er wel', /data-aanbevelingen="band"/.test(gemengd), true);

    const en = await render(ECHT.slice(0, 1), 'en');
    ok('Engels: de kop en de maand', /What brands say\./.test(en) && /September 2026/.test(en), true);
  } catch (e) {
    ok(`het blok kon niet gerenderd worden (${String(e?.message || e).slice(0, 80)})`, false, true);
  } finally {
    if (vite) await vite.close();
  }
}

console.log('\nde beweging: stil voor wie dat vraagt, en te pauzeren');
{
  const src = lees('../src/components/Aanbevelingen.astro');
  const bewegend = (src.match(/@media \(prefers-reduced-motion: no-preference\) \{[\s\S]*?\n {2}\}/) || [''])[0];
  ok('de animatie staat alleen onder no-preference', /animation:\s*ab-loop/.test(bewegend)
    && (src.match(/animation:\s*ab-loop/g) || []).length === 1, true);
  ok('van links naar rechts (van -50% naar 0)', /@keyframes ab-loop \{ from \{ transform: translateX\(-50%\); \} to \{ transform: translateX\(0\); \} \}/.test(src), true);
  ok('een zachte fade aan beide zijkanten', /mask-image: linear-gradient\(to right, transparent 0,[^;]*transparent 100%\)/.test(bewegend), true);
  ok('stil onder de muis en bij focus', /:hover \.ab-loop,[\s\S]*?:focus-within \.ab-loop[\s\S]*?animation-play-state: paused/.test(bewegend), true);
  ok('zonder beweging: de kopie weg en zijwaarts te schuiven',
    /\.ab-kopie \{ display: none; \}/.test(src) && /\.ab-raam \{[^}]*overflow-x: auto/.test(src), true);
}

console.log('\nop de gebouwde site');
{
  const verwacht = aanbevelingenOpSite().length > 0;
  const paginas = ['dist/index.html', 'dist/nl/index.html', 'dist/pricing/index.html', 'dist/nl/pricing/index.html'];
  if (!existsSync(new URL(`../${paginas[0]}`, import.meta.url))) {
    console.log(' --   niet gecontroleerd: geen build (draai `npx astro build`)');
  } else {
    for (const p of paginas) {
      const html = lees(`../${p}`);
      ok(`${p}: blok ${verwacht ? 'aanwezig' : 'afwezig'} (${aanbevelingenOpSite().length} gepubliceerd)`,
        /data-aanbevelingen=|id="ab-h"/.test(html), verwacht);
      ok(`${p}: geen testexemplaar`, /TEST — niet plaatsen|TEST &mdash; niet plaatsen/.test(html), false);
    }
  }
  /* En de drie plekken die de regel gebruiken, gebruiken dezelfde. */
  ok('het script laat proefbestellingen weg', /order_id NOT IN \(SELECT id FROM orders WHERE testmodus = 1\)/.test(lees('../scripts/testimonials.mjs')), true);
  ok('en leest de testregel uit de site', /import \{ isTestExemplaar \} from '\.\.\/src\/data\/aanbevelingen\.js'/.test(lees('../scripts/testimonials.mjs')), true);
  ok('/admin toont hem als test', /isTestExemplaar\(\{ text: r\.testimonial_text/.test(lees('../src/lib/admin.js')), true);
  /* De voorpagina is sinds 12 oktober 2026 de hal; daar staat het blok met
     huid="hal" (de kop als de andere hal-secties), op dezelfde plek als op de
     oude voorpagina: vlak voor de proef. */
  ok('home en /pricing tonen het blok',
    /<Aanbevelingen lang=\{lang\} huid="hal" \/>/.test(lees('../src/components/VoorpaginaHal.astro'))
    && /<Aanbevelingen lang=\{lang\} huid="hal" \/>/.test(lees('../src/components/PricingHal.astro')), true);
}

console.log(`\n${goed}/${totaal} geslaagd`);
process.exit(goed === totaal ? 0 : 1);
