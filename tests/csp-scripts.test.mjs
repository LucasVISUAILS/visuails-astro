/*
 * ═══════════════════════════════════════════════════════════════════════════
 * script-src OP DE PUBLIEKE SITE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * public/_headers legde sinds 9 augustus 2026 uit waarom er GEEN
 * Content-Security-Policy op de statische pagina's stond: `style-src 'self'`
 * blokkeert ook inline style-attributen, en dat zijn er 1663. Dat argument klopt
 * en het gaat over stijl. Over scripts zegt het niets — `script-src` is een eigen
 * richtlijn, en zonder `default-src` raakt hij geen enkel style-attribuut.
 *
 * ── WAT HIER WORDT BEWAAKT ─────────────────────────────────────────────────
 *
 * §1 de header dekt ELK inline script in de build. Dat is de hele reden dat de
 *    hashes uit dist/ komen en niet uit een lijst: negen unieke scripts over 93
 *    pagina's, en één ervan hangt aan CF_ANALYTICS_TOKEN, dus in Lucas'
 *    productiebuild is die hash een andere dan hier.
 * §1b style-src, sinds scripts/stijl-uit-de-pagina.mjs de 1735 attributen en de
 *    302 <style>-elementen uit de build haalde. Hier wordt geteld dat het er nul
 *    zijn, dat de klassenstylesheet is ingehaakt, en dat de laag klopt — want de
 *    klassen winnen door `@layer` en niet door specificiteit.
 * §2 de manieren om deze header stil waardeloos te maken: 'unsafe-inline' erbij
 *    (de browser negeert dan de hele hashlijst), of `default-src` erbij (die zet
 *    ook de richtlijnen aan die nog niemand heeft nagerekend).
 * §3 de beaconhost. src/scripts/consent.js hangt static.cloudflareinsights.com
 *    pas NA een expliciete ja aan de pagina. Staat die host niet in de header,
 *    dan is het gevolg van "ja" een geblokkeerd script en geen enkele melding.
 * §4 wat er NIET gehasht hoeft te worden: JSON-blokken worden nooit uitgevoerd.
 *
 * ── EN DE BROWSERPROEF ─────────────────────────────────────────────────────
 *
 * Deze toets rekent na. Of de browser het ook zo ziet, is met
 * kladblok/csp-proef.mjs gemeten: alle 93 pagina's achter de echte header, geen
 * enkele securitypolicyviolation — en met één hash weggehaald meteen wél, zodat
 * vaststaat dat die proef iets kan zien.
 */

import { globSync, readFileSync } from 'node:fs';
import { inlineScriptHashes, cspWaarde, SCRIPT_HOSTS } from '../scripts/csp-scripts.mjs';
import { haalAttributenEruit, klasseVoor, inDeLaag, LAAG } from '../scripts/stijl-uit-de-pagina.mjs';
import { buildStaat } from './lib/build.mjs';

let goed = 0;
let totaal = 0;
function check(naam, waarde, verwacht) {
  totaal += 1;
  const ok = JSON.stringify(waarde) === JSON.stringify(verwacht);
  if (ok) goed += 1;
  console.log(`${ok ? ' ok  ' : 'FAIL '} ${naam.padEnd(58)}${ok ? '' : `verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(waarde)}`}`);
}

const vers = buildStaat(new URL('../dist/index.html', import.meta.url));

/* ══ 1 · DE HEADER DEKT ELK INLINE SCRIPT IN DE BUILD ═════════════════════ */
console.log('\nde hashes komen uit de build en dekken hem helemaal');
if (!vers) {
  console.log('     (dist is niet vers — deze toets leest de gebouwde site en slaat over)');
} else {
  const headers = readFileSync(new URL('../dist/_headers', import.meta.url), 'utf8');
  const regel = (/Content-Security-Policy:\s*(.+)/.exec(headers) || [, ''])[1].trim();
  check('er staat een CSP in dist/_headers', regel.length > 0, true);

  /* De schuine strepen recht, zoals tests/paths.test.mjs eist: op Windows geeft
     globSync backslashes terug en dan klopt geen enkele padvergelijking meer. */
  const paginas = globSync('dist/**/*.html').map((f) => f.replace(/\\/g, '/'));
  check('er zijn genoeg pagina’s doorzocht', paginas.length > 50, true);

  const nodig = new Set();
  for (const p of paginas) for (const h of inlineScriptHashes(readFileSync(p, 'utf8'))) nodig.add(h);
  check('er zijn inline scripts om te dekken', nodig.size > 0, true);

  const ongedekt = [...nodig].filter((h) => !regel.includes(h));
  /* DIT IS DE TOETS. Eén pagina met een script dat niet in de lijst staat, is
     één pagina waarop de cookiebanner of de taalwissel stil niet meer werkt —
     en stil is het woord, want een geblokkeerd script meldt zich alleen in de
     console van de bezoeker. */
  check('elke hash uit de build staat in de header', ongedekt, []);

  /* En de andere kant op: een hash in de header die nergens meer voorkomt, is
     een script dat is weggehaald. Geen beveiligingsprobleem, wel het begin van
     een lijst die niemand meer durft op te ruimen. */
  /* Alleen de hashes UIT script-src, want de header draagt er sinds 1 september
     ook één voor een <style> — zie §1b. Zonder deze afbakening zou een geldige
     stijlhash hier als "verouderd script" worden aangemerkt. */
  const scriptDeel = (/script-src[^;]*/.exec(regel) || [''])[0];
  const inHeader = (scriptDeel.match(/'sha256-[^']+'/g) || []);
  const verouderd = inHeader.filter((h) => !nodig.has(h));
  check('en er staat geen hash in die nergens meer bij hoort', verouderd, []);

  check('de gebundelde scripts mogen van self', /script-src[^;]*'self'/.test(regel), true);

  /* ══ 1b · EN DE STIJL, SINDS scripts/stijl-uit-de-pagina.mjs ══════════════
     Dit is de toets die de hele opruiming vasthoudt. Eén nieuw style-attribuut of
     één nieuw <style>-element in de build, en `style-src 'self'` blokkeert het —
     zonder foutmelding, alleen een pagina die er anders uitziet bij de bezoeker.
     Daarom wordt hier geteld en niet gesteund op de bouwstap: die stap kán falen,
     en dit is wat dat merkt. */
  let attrs = 0;
  let stijlEls = 0;
  let stijlBuitenNoscript = 0;
  for (const p of paginas) {
    const h = readFileSync(p, 'utf8');
    attrs += (h.match(/\sstyle="/g) || []).length;
    stijlEls += (h.match(/<style[^>]*>/g) || []).length;
    stijlBuitenNoscript += (h.replace(/<noscript>[\s\S]*?<\/noscript>/g, '').match(/<style[^>]*>/g) || []).length;
  }
  check('geen enkel style-attribuut in de build', attrs, 0);
  /* ── ÉÉN UITZONDERING, EN DIE IS VERDIEND ────────────────────────────────
     Een <style> binnen <noscript> kan niet naar een gedeelde stylesheet: daar IS
     de plek de voorwaarde. Hem toch verhuizen heeft één keer de before/after-
     slider gesloopt — zie de kop van scripts/stijl-uit-de-pagina.mjs en
     tests/vergelijker.test.mjs. Wat hier geldt is dus niet "geen enkel <style>"
     maar "geen enkel <style> dat altijd geldt". */
  check('er staat wel een <style> in de build', stijlEls > 0, true);
  check('maar geen enkele buiten een <noscript>', stijlBuitenNoscript, 0);
  /* En dan heeft die ene een hash nodig, anders blokkeert style-src hem juist
     voor de bezoeker voor wie hij bedoeld is. */
  const stijlHashes = ((/style-src[^;]*/.exec(regel) || [''])[0].match(/'sha256-[^']+'/g) || []);
  check('en hij staat als hash in style-src', stijlHashes.length, 1);
  check('style-src staat in de header', /style-src 'self'/.test(regel), true);
  check("en zonder 'unsafe-inline'", /style-src[^;]*'unsafe-inline'/.test(regel), false);

  /* De klassen moeten ergens vandaan komen: een pagina met vs-klassen en zonder
     de stylesheet is een pagina zonder opmaak. */
  const eerste = readFileSync(paginas.find((p) => /index\.html$/.test(p)), 'utf8');
  check('de gegenereerde stylesheet is ingehaakt',
    /<link rel="stylesheet" href="\/_astro\/vis-uit-de-pagina\.[0-9a-f]{8}\.css">/.test(eerste), true);
  /* ── EN DE LAAG, WANT DAAR HANGT DE HELE CASCADE AAN ──────────────────────
     De klassen winnen niet op specificiteit maar doordat ze BUITEN `@layer basis`
     staan. Zou een van de twee helften wegvallen — de wikkeling om de bestaande
     stylesheets, of het feit dat deze ene er niet in zit — dan verliezen ze van
     elke iets diepere componentregel. Dat is precies wat er bij de eerste opzet
     gebeurde: .page-hero .container:has(> .lead) > .lead haalde (0,4,0) en won. */
  const bladen = globSync('dist/_astro/*.css').map((f) => f.replace(/\\/g, '/'));
  const eigen = bladen.filter((f) => /vis-uit-de-pagina/.test(f));
  check('er is precies één gegenereerde stylesheet', eigen.length, 1);
  check('en die staat niet in een laag',
    readFileSync(eigen[0], 'utf8').startsWith('@layer'), false);
  const buiten = bladen.filter((f) => !/vis-uit-de-pagina/.test(f))
    .filter((f) => !readFileSync(f, 'utf8').startsWith('@layer basis{'));
  check('elke andere stylesheet zit wél in @layer basis', buiten.map((f) => f.split('/').pop()), []);
  check('frame-ancestors blijft staan', /frame-ancestors 'none'/.test(regel), true);
  check('object-src staat uit', /object-src 'none'/.test(regel), true);
  check('en base-uri is vastgezet', /base-uri 'self'/.test(regel), true);

  /* ══ 2 · DE DRIE MANIEREN OM DEZE HEADER STIL WAARDELOOS TE MAKEN ══════ */
  console.log('\nde header oogt niet strenger dan hij is');
  check("geen 'unsafe-inline' bij script-src", /'unsafe-inline'/.test(regel), false);
  /* `default-src` is en blijft weg. Niet omdat hij niets zou doen, maar omdat hij
     ALLE richtlijnen tegelijk zet — ook de richtlijnen die hier nog niet zijn
     nagerekend (img-src, font-src, connect-src). Wie die erbij wil, hoort ze te
     meten zoals script-src en style-src gemeten zijn, en niet in één klap aan te
     zetten en te hopen. */
  check("geen default-src (die zet ook wat nog niet gemeten is)", /default-src/.test(regel), false);

  /* ══ 3 · DE BEACONHOST ════════════════════════════════════════════════ */
  console.log('\nde beacon die pas na een ja komt, mag ook binnen');
  const consent = readFileSync(new URL('../src/scripts/consent.js', import.meta.url), 'utf8');
  const host = (/s\.src = '(https:\/\/[^/']+)/.exec(consent) || [, ''])[1];
  check('consent.js noemt een host', host.length > 0, true);
  check('en die host staat in SCRIPT_HOSTS', SCRIPT_HOSTS.includes(host), true);
  check('en dus in de header', regel.includes(host), true);

  /* ══ 4 · JSON IS GEEN SCRIPT ══════════════════════════════════════════ */
  console.log('\nJSON-blokken worden niet gehasht');
  const metJson = `<script type="application/ld+json">{"a":1}</script>
                   <script type="application/json" data-x>{"b":2}</script>
                   <script>alert(1)</script>
                   <script src="/x.js"></script>`;
  check('alleen het uitvoerbare script levert een hash', inlineScriptHashes(metJson).size, 1);
  /* Een <script src> hoort er ook niet bij: die valt onder 'self' en een hash van
     zijn (lege) inhoud zou een hash zijn die niets toelaat. */
  check('en een <script src> levert er geen', inlineScriptHashes('<script src="/x.js"></script>').size, 0);
}

/* ══ 5 · DE STAP ZIT IN DE BUILD EN NIET IN EEN LOSSE OPDRACHT ════════════ */
console.log('\nde header wordt gebouwd en niet met de hand bijgehouden');
{
  const config = readFileSync(new URL('../astro.config.mjs', import.meta.url), 'utf8');
  check('cspScripts staat tussen de integraties', /cspScripts\(\)/.test(config), true);
  check('stijlUitDePagina staat er vóór', /stijlUitDePagina\(\), cspScripts\(\)/.test(config), true);
  /* inlineStylesheets: 'never' is de helft die de <style>-elementen wegneemt.
     Zonder die regel zet Astro kleine componentstylesheets weer IN de pagina en
     zijn het er 302 in plaats van 16. */
  check("Astro zet geen stylesheet meer in de pagina", /inlineStylesheets: 'never'/.test(config), true);
  /* ALS LAATSTE. avif-naast-webp schrijft HTML terug; hashen vóór die stap is
     hashen van een pagina die daarna nog verandert. */
  const rij = (/integrations:\s*\[([^\]]+)\]/.exec(config) || [, ''])[1];
  check('en als laatste in de rij', rij.trim().split(',').map((s) => s.trim()).filter(Boolean).pop(), 'cspScripts()');

  /* De hashes mogen nergens ingetypt staan: één ervan hangt aan
     CF_ANALYTICS_TOKEN en is in de productiebuild een andere dan hier. */
  const headersBron = readFileSync(new URL('../public/_headers', import.meta.url), 'utf8');
  check('public/_headers bevat geen ingetypte hash', /sha256-/.test(headersBron), false);
}

/* ══ 6 · DE OMZETTING ZELF ════════════════════════════════════════════════ */
console.log('\nhet omzetten laat de declaraties met rust');
{
  const { html, gevonden } = haalAttributenEruit('<p class="lead" style="margin-top:1.2rem;max-width:60ch">x</p>');
  const klasse = klasseVoor('margin-top:1.2rem;max-width:60ch');
  check('de klasse komt achter de bestaande klassen', html, `<p class="lead ${klasse}">x</p>`);
  check('en de waarde wordt onthouden', gevonden.get('margin-top:1.2rem;max-width:60ch'), klasse);

  const zonder = haalAttributenEruit('<div style="color:red">x</div>');
  check('een element zonder class krijgt er een', zonder.html, `<div class="${klasseVoor('color:red')}">x</div>`);

  /* Een leeg attribuut zette niets en hoort geen regel op te leveren. */
  const leeg = haalAttributenEruit('<div style="">x</div>');
  check('een leeg style-attribuut verdwijnt zonder klasse', leeg.html, '<div>x</div>');
  check('en levert geen regel op', leeg.gevonden.size, 0);

  /* Twee elementen met dezelfde waarde delen één klasse — dat is het hele
     argument: 1735 attributen, 149 waarden. */
  const twee = haalAttributenEruit('<a style="color:red"></a><b style="color:red"></b>');
  check('gelijke waarden delen één klasse', twee.gevonden.size, 1);

  /* Een > binnen aanhalingstekens mag niet voor het einde van de tag worden
     aangezien; url('a>b') is zeldzaam maar niet onmogelijk. */
  const groter = haalAttributenEruit('<i data-x="a>b" style="color:red"></i>');
  check('een > binnen aanhalingstekens breekt de tag niet',
    groter.html, `<i data-x="a>b" class="${klasseVoor('color:red')}"></i>`);

  check(`inDeLaag wikkelt in @layer ${LAAG}`, inDeLaag('.a{color:red}').startsWith(`@layer ${LAAG}{`), true);
  check('en doet dat geen tweede keer', inDeLaag(inDeLaag('.a{color:red}')), inDeLaag('.a{color:red}'));
}

console.log(`\n${goed}/${totaal} geslaagd`);
if (goed !== totaal) process.exit(1);
