/* VISUAILS — het menu, de sitemap en de site-brede vormregels.
 *
 *   npm run test:nav
 *
 * ── WAAROM DIT BESTAAT ──────────────────────────────────────────────────────
 *
 * Er was geen enkele test die naar de navigatie of naar de sitemap keek. Dat viel
 * op bij het toevoegen van Hooks als vierde categorie op 9 augustus 2026, want de
 * constructie die er stond kon STIL verschuiven:
 *
 *   ui[lang].drops.map((s, i) => ({ href: dropHrefs[i], title: s[0], desc: s[1] }))
 *
 * Drie parallelle lijsten — paden, Engelse teksten, Nederlandse teksten — die
 * alleen goed blijven zolang alle drie in dezelfde volgorde staan. Wie een item in
 * het midden toevoegt en één lijst vergeet, krijgt Lifestyle met de url van Video
 * en een build die vrolijk doorloopt. Er is geen foutmelding, geen rode test, en op
 * de site staat een menu dat naar het verkeerde bestaat wijst.
 *
 * Dat is nu opgelost door elke ingang zijn eigen href te laten dragen. Deze test
 * houdt die vorm vast, plus de twee dingen die bij een nieuwe pagina altijd worden
 * vergeten: de sitemap, en het paar EN/NL.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { parse } from 'parse5';
import { buildStaat } from './lib/build.mjs';
import { buildGraph } from '../src/data/schema.js';
import { ui } from '../src/i18n/ui.js';

let pass = 0, fail = 0;
const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) pass++; else fail++;
  console.log(`${ok ? ' ok  ' : 'FAIL '} ${String(name).padEnd(58)} ${ok ? '' : `expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`}`);
};
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

/*
 * Alleen de CODE, zonder commentaar.
 *
 * DIT IS DE DERDE KEER DAT IK HIER INTRAP, dus staat hij nu bovenaan in plaats van
 * per sectie opnieuw. Elke broncontrole die een verwijderde regel opspoort, vindt
 * óók de noot die uitlegt dat die regel verwijderd is — en straft daarmee het
 * opschrijven van de reden. Eerst in tests/offsite.test.mjs (`seeOther(checkout)`),
 * toen bij het prijsbereik (Lucas' citaat "niet €39 - €19"), en nu bij
 * `.cb-note { display: none }`.
 *
 * De regexp voor een regelcommentaar eist een spatie of regelbegin vóór de twee
 * slashes, zodat `https://…` in een string blijft staan.
 */
const codeOnly = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
  .replace(/(^|\s)\/\/.*$/gm, '$1');

const LANGS = ['en', 'nl'];

/* ══ 1 · ELKE INGANG DRAAGT ZIJN EIGEN HREF ══════════════════════════════════
   Dit is de regel die de index-koppeling onmogelijk maakt. Zou iemand terugkeren
   naar `['Catalog', 'beschrijving']`-paren, dan valt dit om — en dat is precies
   de bedoeling, want dan is de stille verschuiving terug. */
console.log('\nde vorm van het menu');
for (const lang of LANGS) {
  const drops = ui[lang].drops;
  check(`${lang}: het zijn objecten en geen paren`, drops.every((d) => d && typeof d === 'object' && !Array.isArray(d)), true);
  check(`${lang}: elk item heeft een titel en een beschrijving`, drops.every((d) => d.title && d.desc), true);
  /*
   * EEN href IS OPTIONEEL SINDS 9 AUGUSTUS 2026, en alleen wanneer `soon` erop
   * staat. Dat paar is de hele regel: een item zonder href is een dienst die nog
   * geen pagina heeft, en Layout.astro tekent hem dan als uitgeschakeld. Een item
   * zonder href én zonder `soon` zou een gewone dienst zijn die stil nergens meer
   * naartoe wijst — dat is de fout die deze twee regels onmogelijk maken.
   */
  check(`${lang}: alleen een "binnenkort" mag zonder href`, drops.every((d) => d.href || d.soon), true);
  check(`${lang}: en een dienst met een href is niet binnenkort`, drops.every((d) => !(d.href && d.soon)), true);
  const linked = drops.filter((d) => d.href);
  check(`${lang}: elke href begint met een schuine streep`, linked.every((d) => d.href.startsWith('/')), true);
  // Geen taal in de href: localizedPath() zet /nl/ ervoor. Stond er ooit /nl/ in,
  // dan werd het /nl/nl/… en dat is een 404 die alleen op de Nederlandse site zichtbaar is.
  check(`${lang}: geen taalvoorvoegsel in de href`, linked.some((d) => d.href.startsWith('/nl/')), false);
}

/* ══ 2 · EN EN NL GAAN OVER DEZELFDE PAGINA'S ════════════════════════════════
   Niet dezelfde ORDE — die mag per taal verschillen sinds de objecten hun eigen
   href dragen — maar wel dezelfde VERZAMELING. Eén taal met een item erbij is een
   pagina die de helft van de bezoekers niet kan vinden. */
console.log('\nde twee talen dekken dezelfde pagina\'s');
{
  const hrefs = LANGS.map((l) => ui[l].drops.map((d) => d.href || `(geen href) ${d.title}`).sort());
  check('dezelfde verzameling paden', hrefs[0], hrefs[1]);
  // Op TITEL en niet op href, want een item dat nog geen pagina heeft, heeft ook
  // geen href om mee te vergelijken.
  const soon = LANGS.map((l) => ui[l].drops.filter((d) => d.soon).map((d) => d.title).sort());
  check('en hetzelfde is "binnenkort"', soon[0], soon[1]);
}

/* ══ 3 · "BINNENKORT" HEEFT EEN LABEL OM TE TONEN ═══════════════════════════
   Een item met `soon: true` maar zonder tekst in die taal, rendert een leeg
   pil-vormig randje. Dat is erger dan geen label: het ziet uit als een storing. */
console.log('\nhet label bij een dienst die nog niet kan');
for (const lang of LANGS) {
  const hasSoon = ui[lang].drops.some((d) => d.soon);
  check(`${lang}: er is een nav_soon-tekst`, hasSoon ? Boolean(ui[lang].nav_soon) : true, true);
}
{
  const layout = read('src/layouts/Layout.astro');
  // Het label hoort op ALLE DRIE de plekken waar de menu-items staan: de
  // dropdown, de mobiele lade en de footer. Eén ervan vergeten betekent dat de
  // dienst op de telefoon als gewoon bestelbaar leest.
  const count = (layout.match(/mi-soon/g) || []).length;
  check('het label staat op drie plekken plus zijn stijl', count >= 4, true);
  check('en dropHrefs is nergens meer', layout.includes('dropHrefs'), false);

  /*
   * ── EEN UITGESCHAKELDE INGANG MOET DEZELFDE MAAT HEBBEN ALS EEN LINK ──────
   *
   * Lucas op zijn telefoon, 9 augustus 2026: *"hooks staat er heel raar in en
   * inconsistent met de andere knoppen."* De oorzaak: de mobiele lade maakte
   * `.mobile-nav > a` groot, en Hooks is geen <a> maar een <span> — dus erfde hij
   * niets en stond hij op body-formaat tussen zes regels van 27 pixels.
   *
   * De reparatie was de SELECTOR delen en niet de getallen herhalen.
   *
   * ── EN DEZE TEST WAS EERST WAARDELOOS ─────────────────────────────────────
   *
   * Eerste versie zocht met een regexp of ergens in het bestand `.mobile-nav > a,`
   * gevolgd door `.mobile-nav > .mi-off {` stond. Bij de sabotage bleef hij groen:
   * er zijn TWEE regels die `.mobile-nav > a` opmaken (de gewone en die in de
   * media query voor smalle schermen), en zolang één van de twee het paar nog had,
   * vond de regexp een match. Een test die "ergens" zoekt, controleert niets.
   *
   * Nu wordt er GETELD: elke plek die de link opmaakt, moet ook .mi-off in dezelfde
   * selector hebben. Splitst iemand er één, dan lopen de aantallen uiteen.
   */
  const css = codeOnly(layout);

  /*
   * PER REGEL, en niet door te tellen. Tellen was mijn tweede poging en die was ook
   * fout: `.mobile-nav > .mi-off` komt drie keer voor en `.mobile-nav > a` twee
   * keer, want de grijstint is met opzet een regel die ALLEEN over .mi-off gaat.
   * Gelijkheid eisen maakte die tint tot een fout.
   *
   * Wat de regel echt is: er mag geen enkele selectorlijst zijn die de LINK opmaakt
   * zonder .mi-off erin. Een regel die alleen .mi-off opmaakt mag wel — dat is
   * precies wat een afwijkende kleur is. Dus wordt de css in regels geknipt en wordt
   * elke selectorlijst afzonderlijk bekeken.
   */
  const selectors = [...css.matchAll(/([^{}]+)\{[^{}]*\}/g)].map((m) => m[1].trim());
  const pairs = [
    ['de dropdown', '.nav-menu a', '.nav-menu .mi-off'],
    ['de mobiele lade', '.mobile-nav > a', '.mobile-nav > .mi-off'],
    ['de footer', '.footer-col a', '.footer-col .mi-off'],
  ];
  for (const [naam, link, off] of pairs) {
    // Selectorlijsten die de link opmaken. `a,` of `a {` — niet `a:hover`, want een
    // hovertoestand hoort een uitgeschakeld item juist niet te krijgen.
    /* ── EN EEN `:not()` ERACHTER TELT NOG STEEDS ALS DEZELFDE REGEL ────────
       Op 21 augustus 2026 werd `.mobile-nav > a` verfijnd tot
       `.mobile-nav > a:not(.mobile-home)`, omdat het merkteken in de lade een
       link werd en daardoor per ongeluk alles erfde wat een ingang hoort te
       krijgen — inclusief een onderrandje van 26 pixels breed.

       Deze controle zocht letterlijk naar `.mobile-nav > a` gevolgd door een
       komma of het regeleinde, en vond dus niets meer. Dat is precies het
       omgekeerde van wat hij moet doen: hij bestaat om te merken dat de link
       en het uitgeschakelde item uit elkaar lopen, niet om te eisen dat de
       selector nooit verandert. Een verfijning met `:not()` is nog steeds
       dezelfde regel, dus die wordt hier toegestaan. */
    const rules = selectors.filter((sel) => new RegExp(`${link.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(:not\\([^)]*\\))*\\s*(,|$)`, 'm').test(sel));
    check(`${naam}: er is een regel die de link opmaakt`, rules.length > 0, true);
    const missing = rules.filter((sel) => !sel.includes(off));
    check(`${naam}: elke regel noemt ook .mi-off`, missing, []);
  }

  /*
   * En de grijstint moet ná de maat komen. Ook dit was eerst te los: ik zocht met
   * lastIndexOf op ".mi-off { color: var(--ink-3)" en vond daarmee de regel van de
   * dropdown, die toevallig wél achteraan stond — dus bleef de test groen terwijl de
   * tint van de LADE naar voren was gehaald. Nu wordt precies die ene regel gezocht.
   */
  const tint = css.lastIndexOf('.mobile-nav > .mi-off, .footer-col .mi-off');
  const size = css.lastIndexOf('.mobile-nav > .mi-off { display: block');
  check('de tint van de lade komt ná zijn maat', tint > size && size > -1, true);
}

/* ══ 4 · (WAS: HOOKS IS HELEMAAL AANGESLOTEN) ═══════════════════════════════
   Hier stond dat /hooks bestond, in de sitemap zat en niet noindex was. Op
   9 augustus 2026 is die pagina verborgen op verzoek van Lucas, en sectie 8
   hieronder toetst nu het omgekeerde: de pagina bestaat NIET en staat NIET in de
   sitemap, terwijl het menu-item wel blijft staan. Twee tests die elkaars
   tegendeel beweren kunnen niet naast elkaar bestaan, dus is deze weg en niet
   uitgezet. */

/* ══ 5 · WAT ELK FORMULIER POST ALS `service` ══════════════════════════════
 *
 * Dit is de belangrijkste test van het bestand, en de reden staat in
 * functions/api/order.js: een onbekende `service` wordt daar niet geweigerd maar
 * STIL omgezet naar 'catalog'.
 *
 *   const svc = ORDER_SERVICES.has(service) ? service : 'catalog';
 *
 * Post een formulier een waarde die niet in die lijst staat, dan komt elke
 * aanvraag binnen als een catalogbestelling — met een referentie, in de
 * bestellijst, tussen het echte werk. Niemand zou het merken tot iemand zich
 * afvraagt waarom er catalogorders zijn die niemand geplaatst heeft.
 *
 * HERSCHREVEN OP 18 AUGUSTUS 2026, EN STERKER GEWORDEN. Deze sectie las
 * src/components/HooksPage.astro en toetste dat ÉÉN formulier het goed deed.
 * Dat bestand wordt door niets meer geïmporteerd en gaat van de schijf, en de
 * makkelijke uitweg — de sectie weghalen — zou de enige bewaking op deze
 * stille omzetting hebben weggehaald voor ALLE formulieren.
 *
 * Dus doet hij nu het omgekeerde van wat hij deed: hij zoekt zelf elk .astro-
 * bestand dat naar /api/order post en een `service` meestuurt, en eist dat die
 * waarde bestaat. Er hoeft niemand meer aan te denken bij een nieuw formulier —
 * en er ligt geen enkele afhankelijkheid meer op een bestand dat weg mag.
 *
 * 'contact' IS GELDIG EN STAAT NIET IN ORDER_SERVICES. De contactformulieren
 * posten `service="contact"` naar hetzelfde eindpunt, en order.js vangt dat af
 * met een eigen tak (`if (service === 'contact')`) die returnt vóór de regel
 * hierboven. Dat is nagekeken en niet aangenomen — het zag er bij het schrijven
 * van deze test precies uit als de bug die hij zoekt. De tak wordt daarom UIT
 * order.js gelezen en niet hier ingetypt: verdwijnt hij daar, dan wordt
 * `service="contact"` wél stil een catalogbestelling, en dan hoort deze test
 * rood te worden.
 */
console.log('\nwat elk formulier post als service');
{
  const order = read('functions/api/order.js');

  // De lijst zoals order.js hem kent, uit order.js gelezen.
  const lijst = /ORDER_SERVICES = new Set\(\[([^\]]*)\]\)/.exec(order)?.[1] || '';
  const toegestaan = new Set([...lijst.matchAll(/'([^']+)'/g)].map((m) => m[1]));
  check('ORDER_SERVICES is gevonden', toegestaan.size > 0, true);

  // De eigen takken die vóór de omzetting returnen. Nu alleen 'contact'.
  for (const m of order.matchAll(/if \(service === '([^']+)'\)/g)) toegestaan.add(m[1]);
  check("'contact' heeft een eigen tak in order.js", toegestaan.has('contact'), true);

  // Elk .astro-bestand dat naar /api/order post.
  const astros = [];
  (function loop(dir) {
    for (const e of readdirSync(new URL(`../${dir}/`, import.meta.url), { withFileTypes: true })) {
      if (e.isDirectory()) loop(`${dir}/${e.name}`);
      else if (e.name.endsWith('.astro')) astros.push(`${dir}/${e.name}`);
    }
  }('src'));

  const posters = [];
  for (const f of astros) {
    const src = read(f);
    if (!src.includes('action="/api/order"')) continue;
    for (const m of src.matchAll(/name="service"\s+value="([^"]*)"/g)) posters.push([f, m[1]]);
  }
  // Als deze lus ooit niets meer vindt, blijft de sectie groen zonder iets te
  // toetsen. Dat is erger dan geen test, dus staat het aantal er ook in.
  check('er zijn formulieren gevonden die service posten', posters.length >= 2, true);

  const fout = posters.filter(([, v]) => !toegestaan.has(v)).map(([f, v]) => `${f} → "${v}"`);
  check('elke geposte service bestaat en wordt niet stil catalog', fout, []);

  /* DE HONEYPOT EN HET VINKJE, op elk formulier dat naar /api/order post.
     Ook dit stond alleen op HooksPage en gold in werkelijkheid overal. */
  const zonderHp = posters.filter(([f]) => !read(f).includes('name="company_hp"')).map(([f]) => f);
  check('elk bestelformulier heeft de honeypot', [...new Set(zonderHp)], []);

  // Het vinkje is toestemming en dus NOOIT verplicht. `required` erop zou het van
  // een keuze in een voorwaarde veranderen, en dan is het geen toestemming meer.
  const verplicht = [];
  for (const f of [...new Set(posters.map(([x]) => x))]) {
    for (const m of read(f).matchAll(/<input type="checkbox" name="notify"[^>]*>/g)) {
      if (/required/.test(m[0])) verplicht.push(f);
    }
  }
  check('geen enkel notify-vinkje is verplicht', [...new Set(verplicht)], []);

  // video mag niet afgerekend worden, anders is een aanvraag een betaalbare order.
  const quote = read('src/lib/quote.js');
  check('video is niet betaalbaar', /PAYABLE_SERVICES = new Set\(\['catalog', 'lifestyle', 'complete'\]\)/.test(quote), true);
}

/* ══ 6 · HET VINKJE HEEFT EEN GRONDSLAG ═════════════════════════════════════
   Een vinkje dat om mail vraagt terwijl de privacyverklaring dat doel niet noemt,
   is een toestemming zonder grondslag. Beide talen, want een Nederlandse bezoeker
   leest de Nederlandse. */
console.log('\nde privacyverklaring dekt het');
{
  const en = read('src/pages/privacy.astro');
  const nl = read('src/pages/nl/privacy.astro');
  check('EN §2 noemt het bericht bij lancering', /launch notice/i.test(en), true);
  check('EN §3 noemt het doel', /asked to be notified about/i.test(en), true);
  check('NL §2 noemt het bericht bij lancering', /bericht bij lancering/i.test(nl), true);
  check('NL §3 noemt het doel', /waarvoor je om bericht vroeg/i.test(nl), true);
}

/* ══ 7 · GEEN PRIJSBEREIK BIJ EEN EIGEN DIENST ══════════════════════════════
 *
 * Lucas, 9 augustus 2026: *"Wel zou ik uberhaupt bij alle services 1 prijs willen
 * noemen en niet een range. Dus liever vanaf €... en niet €39 - €19 of zoiets."*
 *
 * Deze test staat hier en niet in een prijstest, omdat het geen rekenregel is maar
 * een VORMREGEL over wat er op een pagina mag staan — dezelfde familie als de
 * nav-regels hierboven, en net als die alleen aan de bron te zien.
 *
 * euroRange() mag bestaan en heeft precies één toegestane aanroeper: SHOOT_DAY, de
 * geschatte kosten van een productiedag ELDERS. Dat is geen prijs van ons; de
 * spreiding is daar het punt. Zodra er een tweede aanroeper komt, staat er
 * waarschijnlijk een dienstprijs als bereik op een pagina, en dan wil ik dat hier
 * horen en niet van een klant.
 */
/* ══ 6b · DE CONVBAR HOUDT ZIJN UITLEG OP EEN TELEFOON ══════════════════════
 *
 * Lucas: *"ook mist hier tekst en logo bij de pop up."* Op zijn telefoon stond er
 * een kale groene knop met een kruisje: `.cb-note` werd onder de 900px op
 * display:none gezet en `.cb-logo` onder de 600px, allebei door mij, in de ronde
 * waarin de balk korter moest. Ik heb hem korter gemaakt door de UITLEG weg te
 * halen — en dat is het enige waardoor de knop iets betekent.
 *
 * Deze test is daarom een verbod en geen bevestiging: nergens mag een media query
 * die twee elementen nog verbergen.
 */
console.log('\nde balk onderaan houdt zijn uitleg');
{
  const css = codeOnly(read('src/layouts/Layout.astro'));
  // Alles wat .cb-note of .cb-logo op display:none zet, in welke query dan ook.
  const hidesNote = /\.cb-note[^{}]*\{[^}]*display:\s*none/.test(css);
  const hidesLogo = /\.cb-logo[^{}]*\{[^}]*display:\s*none/.test(css);
  check('de tekst wordt nergens verborgen', hidesNote, false);
  check('het teken ook niet', hidesLogo, false);
  // En de knop van WhatsApp moet boven de balk uit blijven; die staat op één plek.
  check('de whatsapp-knop wijkt voor de balk', /--wa-bottom: 142px/.test(css), true);
}

console.log('\nde prijsvorm');
{
  // Alleen de code, want de noot bij de functie noemt de naam ook.
  const code = codeOnly(read('src/data/pricing.js'));
  const calls = [...code.matchAll(/euroRange\(/g)].length;
  // Eén keer de declaratie (`export function euroRange(`), twee keer de aanroep in
  // SHOOT_DAY — één per taal. Meer dan dat is een nieuwe plek met een bereik.
  check('euroRange heeft geen nieuwe aanroepers', calls, 3);
  check('en die aanroepen staan in SHOOT_DAY', /range: euroRange\(AMOUNT\.shootDayLow, AMOUNT\.shootDayHigh/.test(code), true);

  /*
   * En nergens in de TEKSTEN een handgeschreven bereik met twee eurotekens.
   *
   * Ook hier moet het commentaar eruit, en dat wist ik pas toen deze regel rood
   * werd op zijn eigen uitleg: in de noot bij euroRange() staat Lucas' citaat
   * *"niet €39 - €19 of zoiets"*, en dat is precies het patroon waar dit op zoekt.
   * Dezelfde valkuil als in tests/offsite.test.mjs — een broncontrole die proza
   * meeleest, straft het opschrijven van de regel.
   */
  const stripped = (f) => codeOnly(read(f));
  const files = ['src/data/pricing.js', 'src/components/PricingPage.astro', 'src/components/HomeV2.astro'];
  const handwritten = files.filter((f) => /€\s?\d[\d.,]*\s*[–—-]\s*€/.test(stripped(f)));
  check('geen handgeschreven bereik met twee eurotekens', handwritten, []);
}

/* ══ 8 · HOOKS IS VERBORGEN, MAAR NIET ONZICHTBAAR ══════════════════════════
 *
 * Lucas: *"Verberg de pagina voor nu (…) maar post hem voor nu wel alvast tussen de
 * services als knop die niet werkt met een label erbij dat deze nog niet klaar is."*
 *
 * Twee dingen die tegen elkaar in kunnen gaan zodra iemand er één van aanraakt: de
 * pagina mag niet bestaan, en het item moet blijven staan. Zonder deze test is de
 * meest waarschijnlijke fout dat iemand het item weghaalt "omdat de pagina er niet
 * is", of de pagina terugzet zonder de tekst die er nog niet is.
 */
console.log('\nverborgen, maar niet onzichtbaar');
{
  check('er is geen /hooks-pagina', existsSync(new URL('../src/pages/hooks.astro', import.meta.url)), false);
  check('en geen Nederlandse',      existsSync(new URL('../src/pages/nl/hooks.astro', import.meta.url)), false);

  /*
   * De sitemap staat sinds 9 augustus 2026 in dist/ en niet meer in public/: hij wordt
   * bij elke build uit de build gelezen (scripts/sitemap-and-404.mjs), omdat het
   * handgeschreven bestand veertien pagina's achterliep. Deze test las het oude pad en
   * viel daardoor meteen om — precies zoals bedoeld, want een test die stil groen
   * blijft op een verplaatst bestand is erger dan een test die kapot gaat.
   *
   * Bestaat dist/ niet (een schone kloon zonder build), dan wordt deze controle
   * OVERGESLAGEN in plaats van rood. Hij gaat over de uitvoer van de build; is die er
   * niet, dan is er niets te controleren en zou rood alleen maar wennen aan rood zijn.
   *
   * ── EN EEN OUDE BUILD OOK — 13 augustus 2026 ───────────────────────────────
   *
   * Zelfde reden als in tests/planning.test.mjs, waar een `dist/` van vóór een
   * prijswijziging om 02:11 twee rode regels gaf over een prijs die in de bron al
   * weg was. Hier is het gevaar de andere kant op: een oude sitemap die `hooks`
   * niet bevat omdat die pagina er tóén niet in stond, geeft GROEN over een vraag
   * die niemand heeft gesteld. Een stille valse goedkeuring is erger dan een
   * overgeslagen controle, want je merkt hem nooit.
   */
  const sitemapPad = new URL('../dist/sitemap.xml', import.meta.url);
  const staat = buildStaat(sitemapPad);
  if (staat.er && !staat.oud) {
    const sitemap = read('dist/sitemap.xml').replace(/<!--[\s\S]*?-->/g, '');
    check('en hij staat niet in de sitemap', /hooks/.test(sitemap), false);
  } else {
    console.log(` --   sitemap niet gecontroleerd: ${staat.uitleg}`);
  }

  // Het item staat er nog, zonder href, in beide talen.
  for (const lang of LANGS) {
    const hooks = ui[lang].drops.find((d) => d.title === 'Hooks');
    check(`${lang}: het item staat in het menu`, Boolean(hooks), true);
    check(`${lang}: en heeft geen href`, hooks?.href, undefined);
    check(`${lang}: en is als binnenkort gemarkeerd`, hooks?.soon, true);
  }

  // Layout tekent een item zonder href als iets anders dan een link.
  const layout = read('src/layouts/Layout.astro');
  check('een item zonder href wordt geen link', /aria-disabled="true"/.test(layout), true);
  check('en de strook op de homepage heeft een uitgeschakelde knop',
    /<button[^>]*hv-soon-btn[^>]*disabled/.test(read('src/components/HomeV2.astro')), true);
}

/* ══ 9 · HET VRAAGTEKEN NAAST HOOKS ═════════════════════════════════════════
 *
 * Lucas: *"misschien naast hooks een klein vraagteken logo zetten waar mensen op
 * kunnen klikken waarna ze het concept kunnen zien van wat het precies inhoud."*
 *
 * Deze sectie bewaakt drie dingen die alle drie eerder al één keer fout zijn
 * gegaan, en dat is de reden dat ze hier staan en niet in mijn hoofd:
 *
 * 1. DE TOON. De oude HooksPage.astro overtrad de toonregels op acht punten,
 *    waaronder *"Eén product en één idee is genoeg"* — twee keer. Lucas had daar
 *    expliciet voor gewaarschuwd: *"dat is eerder op de site fout geweest en
 *    inmiddels gecorrigeerd, dus deze nieuwe pagina moet het meteen goed doen."*
 *    Dat bestand is op 18 augustus 2026 verwijderd, dus er valt niets meer uit
 *    te copy-pasten — maar de zin staat nog wél geciteerd in
 *    HOOKS-COPY-CONCEPT.md, en de controle hieronder gaat over de tekst en niet
 *    over waar hij vandaan zou komen. Hij blijft dus staan.
 *
 * 2. DE PRIJS. De strook staat er juist omdat de dienst nog niet besteld kan
 *    worden en de prijs nog niet vastligt. Eén "vanaf €119" in dit paneel maakt
 *    van een aankondiging een openbaar aanbod.
 *
 * 3. DE CONSTRUCTIE. Die is op 21 augustus 2026 veranderd en de eisen eronder
 *    zijn meeveranderd — zie het blok hieronder voor wat er nu wordt bewaakt.
 */
console.log('\nhet vraagteken naast hooks');
{
  const home = read('src/components/HomeV2.astro');

  /* ── DE CONSTRUCTIE IS OP 21 AUGUSTUS 2026 VERVANGEN ────────────────────
     Hier stond een <details> met het driehoekje op drie manieren verborgen, en
     die eisen stonden hieronder één voor één. Lucas: *"wanneer een klant over
     een vraagteken gaat dat het niet uitklapt maar een floating note blok laat
     zien om ruimte op de site te besparen."* Dat is nu <Note>, en die staat op
     één plek voor de hele site in plaats van hier nog een keer.

     WAT DEZE TOETS BEWAAKT IS DAAROM VERANDERD, EN DAT IS GEEN VERZWAKKING. De
     drie oude eisen waren allemaal gevolgen van "het is een <details>". Wat er
     onder lag — het vraagteken is decoratie, de knop heeft een naam voor wie
     hem niet ziet, en de tekst staat er in beide talen — geldt onverkort, en
     staat hieronder. */
  check('Hooks krijgt een zwevende notitie', /<Note lang=\{lang\} term=\{soon\.name\} wide>/.test(home), true);
  check('de titelregel is de naam plus het vraagteken', /<span class="hv-svc-card-t hv-q-t">/.test(home), true);
  check('en de stroken worden uit één lus getekend', /c\.svcSoonList\.map/.test(home), true);

  /* ── GEEN <p> IN EEN NOTITIE, EN DIT IS EEN GEMETEN FOUT ────────────────
     <Note> is inline en staat dus binnen een <p>. Een <p> daarbinnen sluit de
     buitenste — dat is geen mening maar hoe elke HTML-parser werkt — en dan valt
     de hele notitie uit haar eigen span. Gevolg op 21 augustus: de zwevende
     notitie kwam LEEG tevoorschijn en de 168 woorden stonden gewoon in de kaart.
     Niets viel om, er was geen foutmelding, en in de bron zag het er goed uit.

     Vandaar deze toets op de GEBOUWDE pagina en niet op de bron: in de bron is
     het correct, en pas de parser laat zien wat ervan wordt. */
  /* Met parse5 en niet met een reguliere expressie, en dat is precies het punt:
     de fout die dit moet vangen is een fout in de BOOM, niet in de tekst. In de
     platte html stond alles op de goede plek; pas een parser laat zien dat het
     <p> de omhullende span had gesloten. Een regexp zou hier dus altijd groen
     zijn geweest. */
  const gebouwd = read('dist/index.html');
  const doc = parse(gebouwd);
  const loop = (n, f) => { f(n); for (const c of n.childNodes || []) loop(c, f); };
  const woordenIn = (n) => n.nodeName === '#text'
    ? n.value.split(/\s+/).filter(Boolean).length
    : (n.childNodes || []).reduce((a, c) => a + woordenIn(c), 0);
  const popjes = [];
  loop(doc, (n) => {
    const cl = (n.attrs || []).find((a) => a.name === 'class');
    if (cl && /\bnt-pop\b/.test(cl.value)) popjes.push(n);
  });
  check('er staan minstens twee zwevende notities op de homepage', popjes.length >= 2, true);
  check('en geen enkele is leeg', popjes.filter((n) => woordenIn(n) === 0).length, 0);
  check('de Hooks-notitie draagt haar hele paneel', Math.max(...popjes.map(woordenIn)) > 150, true);
  check('het rondje is decoratie', /class="nt-mark" aria-hidden="true">\?</.test(gebouwd), true);
  check('en de knop draagt een naam voor wie hem niet ziet', /class="nt-say">What Hooks means</.test(gebouwd), true);
  check('de notitie hangt aan de knop via aria-describedby', /aria-describedby="nt-\d+"/.test(gebouwd), true);

  /*
   * ── HET KNOPLABEL MOET EEN ZELFSTANDIG NAAMWOORD BEVATTEN ────────────────
   *
   * Note.astro maakt van `term` het onzichtbare knoplabel: in het Engels
   * `What ${term} means`, in het Nederlands `Uitleg: ${term}`. Dat werkt
   * alleen als term een DING is. Op 21 augustus 2026 stonden er drie labels
   * in de gebouwde site die dat niet waren:
   *
   *     "What we record means"
   *     "What goes in a credit means"
   *     "What the tag cannot be relied on means"
   *
   * Alle drie onzichtbaar op het scherm — je ziet enkel het vraagteken — en
   * alle drie onverstaanbaar voor precies de bezoeker die op het label is
   * aangewezen. Geen enkele bestaande controle kon ze zien, want de opmaak
   * was correct; alleen de TAAL was fout.
   *
   * Deze controle leest de gebouwde labels van alle pagina's met notities en
   * weigert er twee soorten: labels die met een voornaamwoord beginnen, en
   * labels met een persoonsvorm erin. Een zelfstandig naamwoord heeft geen
   * van beide. Het is een grove zeef, en dat is de bedoeling: hij hoeft geen
   * Nederlands te kunnen, hij hoeft alleen te merken dat er een ZIN staat
   * waar een ding hoort te staan.
   */
  {
    const paden = [];
    (function zoek(u, rel) {
      for (const e of readdirSync(u, { withFileTypes: true })) {
        const kind = new URL(`${e.name}${e.isDirectory() ? '/' : ''}`, u);
        if (e.isDirectory()) zoek(kind, `${rel}${e.name}/`);
        else if (e.name === 'index.html') paden.push([`${rel}${e.name}`, kind]);
      }
    }(new URL('../dist/', import.meta.url), ''));

    const platte = (n, o = []) => {
      if (n.nodeName === '#text') { o.push(n.value); return o; }
      for (const c of n.childNodes || []) platte(c, o);
      return o;
    };
    const labels = new Set();
    for (const [, u] of paden) {
      const h = readFileSync(u, 'utf8');
      if (!h.includes('nt-say')) continue;
      loop(parse(h), (n) => {
        const cl = (n.attrs || []).find((a) => a.name === 'class');
        if (cl && /\bnt-say\b/.test(cl.value)) labels.add(platte(n).join('').replace(/\s+/g, ' ').trim());
      });
    }
    // De term staat tussen de vaste omhulsels; die halen we eraf.
    const termen = [...labels]
      .map((l) => l.replace(/^What /, '').replace(/ means$/, '').replace(/^Uitleg: ?/, ''))
      .filter((t) => t && t !== 'this' && t !== 'Uitleg');

    /* ALLEEN ONDERWERPSVOORNAAMWOORDEN, en met opzet niet je/jouw/your/uw.
       "Je vaste week" is een prima zelfstandig naamwoord — "je" is daar een
       bezittelijk voornaamwoord en geen onderwerp. De eerste versie van deze
       controle sloeg daarop aan; dat is een valse melding en die kost meer dan
       hij oplevert. De persoonsvorm hieronder is de echte zeef. */
    const voornaamwoord = /^(we|i|they|he|she|it|wij|ik|hij)\b/i;
    const persoonsvorm = /\b(means?|is|are|was|were|cannot|can|does|do|goes|go|record|records|gives?|kunt|kun|kan|wordt|worden|past|staat|gaat|hebt|heeft|zijn|vastleggen|rekenen)\b/i;

    const slecht = termen.filter((t) => voornaamwoord.test(t) || persoonsvorm.test(t));
    check('elk notitielabel gaat over een ding en niet over een zin', slecht, []);
    check('en er zijn er genoeg om iets te controleren', termen.length >= 8, true);
  }

  /*
   * DE PANEELTEKST, per taal uit de bron gehaald.
   *
   * De copy van de homepage zit in HomeV2.astro zelf en niet in ui.js, dus valt
   * hij niet te importeren; hij wordt hier uit de brontekst gelezen. Twee blokken
   * verwacht — Engels en Nederlands — want één taal controleren is een halve
   * controle, en dat is precies het gat waar bij deze strook eerder al iets in
   * verdween.
   */
  /* De panelen heten nu `qBody` en staan binnen svcSoonList, één per
     aangekondigde dienst per taal. Twee diensten × twee talen = vier blokken.
     De HOOKS-blokken zijn de eerste van elk paar; die worden hieronder op hun
     eigen eisen getoetst, en de Editions-blokken daarna op de hunne — want de
     twee diensten beloven niet hetzelfde en één gedeelde lijst eisen zou de
     zwakste van de twee worden. */
  const alle = [...home.matchAll(/qBody: \[([\s\S]*?)\n {8}\],/g)].map((m) => m[1]);
  check('vier panelen: twee diensten, twee talen', alle.length, 4);
  const blocks = [alle[0], alle[2]].filter(Boolean);   // Hooks: en, nl
  const edities = [alle[1], alle[3]].filter(Boolean);  // Editions: en, nl
  check('beide talen hebben een paneeltekst', blocks.length, 2);
  for (const [i, b] of blocks.entries()) {
    const lang = i === 0 ? 'en' : 'nl';
    check(`${lang}: vier regels in het paneel`, [...b.matchAll(/\n\s*\['/g)].length, 4);

    // Wat er MOET staan.
    /* De CLAIM: met één foto lukt het niet. Lucas schreef "Met één foto red je
       het niet" en "One photo alone won't work" — hetzelfde, anders gezegd. */
    check(`${lang}: één foto is niet genoeg`,
      /(not enough|niet genoeg|red je het niet|won.t work|isn.t (enough|sufficient)|is not (enough|sufficient))/i.test(b), true);
    check(`${lang}: een specialist kijkt hem na`, /specialist/.test(b), true);
    /* ── DE LEVERTIJD KOMT UIT DE BRON — 18 augustus 2026 ────────────────
       Hier stond `/24 (to|tot) 48/` en die toets hield een FOUTE belofte vast.
       De homepage zei "binnen 24 tot 48 uur" terwijl elke andere pagina
       turnaround('unattended') = "2-4 werkdagen" zegt; een bezoeker die
       doorklikte zag de belofte verdubbelen, en /studio opent uitgerekend met
       "Anyone can put '48 hours' on a website."

       De nieuwe eis is sterker dan de oude: niet WELK getal er staat, maar dat
       er geen getal getypt IS. Zolang de regel turnaround() aanroept, kan deze
       tegenspraak niet terugkomen — ook niet als het getal ooit verandert.

       ── EN turnaroundShort() TELT MEE — 25 augustus 2026 ─────────────────
       Dit patroon eiste letterlijk `turnaround(`, en daarmee pinde het de NAAM
       van de functie in plaats van waar het om gaat. In de precisieronde van
       25 augustus ging deze regel over op `turnaroundShort('unattended')`, om
       een echte fout te repareren: `turnaround('unattended', 'nl')` geeft
       "Meestal 2–4 werkdagen", en de zin zette daar "Binnen " voor. Op de
       Nederlandse homepage stond dus "Binnen Meestal 2–4 werkdagen", en in het
       Engels "in estimated delivery: 2–4 working days" — het LABEL lekte de zin
       in. turnaroundShort() geeft "2–4 werkdagen" zonder dat label.

       Allebei lezen hetzelfde getal uit src/data/pricing.js, dus de belofte die
       deze toets bewaakt is onveranderd: geen getypt getal. Het patroon staat
       er nu naar die belofte en niet naar één functienaam. */
    check(`${lang}: de levertijd komt uit turnaround()`, /turnaround(Short)?\('unattended'/.test(b), true);
    check(`${lang}: en staat er niet als getypt getal`, /24 (to|tot) 48/.test(b), false);
    check(`${lang}: het scherm heet VISUAILS Studio`, /VISUAILS Studio/.test(b), true);

    // Wat er NIET mag staan. "viral" en "scroll" zijn de twee woorden waar Lucas
    // om vroeg ze weg te laten; het eurotekens-verbod is de prijs die nog niet
    // vastligt; "genoeg" zonder "niet" ervoor is de fout van de oude pagina.
    check(`${lang}: geen prijs in het paneel`, /€/.test(b), false);
    check(`${lang}: het woord viral staat er niet`, /viral/i.test(b), false);
    /* ── HET SCROLL-VERBOD IS VERVALLEN — 24 augustus 2026 ────────────────
       Hier stond `check(... /scroll/i.test(b), false)`, omdat Lucas in augustus
       vroeg de woorden "viral" en "scroll" van de site te houden. In de
       tekstronde van 24 augustus schreef hij zelf "Scroll-stopping", en op de
       vraag of dat een vergissing was: *"Mijn nieuwe zin wint, haal het verbod
       weg."*

       Bewust teruggedraaid dus, en niet vergeten. Het verbod op "viral" hierboven
       BLIJFT staan — dat is een belofte over de uitkomst en iets anders dan een
       woord dat beschrijft hoe iets eruitziet. */
    /* ── WAT HIER VERBODEN IS, IS EEN BELOFTE OVER DE UITKOMST ────────────
       Niet het woord "guarantee". Deze regel ving op 24 augustus 2026 de zin
       "We guarantee the format and the execution — not the reach" — de zin die
       precies doet wat dit blok WIL, namelijk het bereik uitdrukkelijk buiten de
       belofte zetten. Een verbod op het woord keurt dus de goede formulering af.

       Tegelijk mistte hij "grow your following", wat wél een belofte over bereik
       is. Te bot en te smal in één regel.

       Wat er nu staat: verboden is een toezegging over wat een post DOET —
       volgers, bereik, betrokkenheid, viraal gaan. Garanderen mag, zolang het
       over het werk gaat en niet over de uitkomst ervan. */
    /* ── EEN KANS MAG, EEN TOEZEGGING NIET — 24 augustus 2026 ─────────────
       Lucas, gevraagd of de regel "boost engagement and grow your following"
       eruit moest: *"Kan je dit ook niet framen als in dat het kan dat je
       betrokkenheid kan vergroten en meer volgers kan aantrekken."*

       Dat is de juiste uitweg en hij is scherper dan het woord verbieden. Een
       video die de beste KANS geeft op meer volgers, is waar; een video die
       volgers OPLEVERT, hangt af van het platform en de timing — precies wat de
       regel eronder in dit paneel zegt.

       Dus dezelfde constructie als bij het woord "stock" verderop: het woord mag
       vallen, maar er moet een mogelijkheidswoord vlak omheen staan. Zonder
       hedge is het een toezegging, en die blijft verboden. */
    const bereikTermen = /(more followers|meer volgers|nieuwe volgers|grow your (following|audience)|meer bereik|gaat viraal|goes viral|engagement|betrokkenheid)/gi;
    const hedge = /(chance|kans|can |kan |could|kunnen|mogelijk|helps?|helpt)/i;
    const zonderHedge = [];
    for (const m of b.matchAll(bereikTermen)) {
      const rond = b.slice(Math.max(0, m.index - 80), m.index + 80);
      if (!hedge.test(rond)) zonderHedge.push(rond.replace(/\s+/g, ' ').trim());
    }
    check(`${lang}: bereik alleen als kans, nooit als toezegging`, zonderHedge, []);
  }

  // En de voetregel zegt waarom de knop dood is, in beide talen.
  /* De voetregel is gedeeld geworden: hij zei bij elke aangekondigde dienst
     hetzelfde, en twee kopieën van dezelfde zin is hoe er straks één wordt
     bijgewerkt en de ander niet. Eén per taal dus. */
  const feet = [...home.matchAll(/svcSoonFoot: '([^']*)'/g)].map((m) => m[1]);
  check('beide talen hebben een voetregel', feet.length, 2);
  /* ── DE CLAIM EN NIET DE WOORDEN — 24 augustus 2026 ────────────────────
     Hier stond `/(not settled|niet vast)/`. Lucas herschreef de regel naar
     "Pricing and ordering details are still being finalized" / "Omdat we de
     tarieven en het bestelproces nog afronden" — precies dezelfde mededeling,
     andere woorden, en de toets ging rood op een verbetering.
     Dat is de derde keer in dit project dat een toets de SPELLING van een regel
     vasthield in plaats van wat hij belooft. Wat er moet staan is: er is nog
     geen prijs, en daarom kun je nog niet bestellen. */
  check('en die zegt dat de prijs nog niet vastligt',
    feet.every((f) => /(not settled|niet vast|being finalized|nog afronden|still being|nog niet)/i.test(f)), true);

  /* ── EDITIONS ─────────────────────────────────────────────────────────────
   * Aangekondigd op 18 augustus 2026. Het idee staat in STOCK-IDEE.md, en dat
   * document bevat drie dingen die je bij het schrijven van deze copy verkeerd
   * kunt doen. Alle drie staan ze hier, want ze zijn alleen bij het aankondigen
   * te voorkomen en niet meer erna.
   *
   * 1. HET WOORD "STOCK" MAG ER NIET IN. Death to Stock positioneert zich
   *    letterlijk als "made by real creators, not AI", en op hun terrein —
   *    vijftienduizend beelden voor $20 — win je niet. Jezelf stock noemen is
   *    de vergelijking opzoeken die je verliest.
   * 2. DE GEDEELDE SET MOET GEDEELD HETEN. Jouw klanten zijn allemaal
   *    kledingmerken en dus elkaars concurrenten; twee abonnees die hetzelfde
   *    beeld posten staan in dezelfde feed voor dezelfde koper. Dat mag geen
   *    kleine lettertjes worden — de modelkiezer noemt de gedeelde roster ook
   *    met zoveel woorden gedeeld.
   * 3. GEEN TWEEDE BIBLIOTHEEK. §6 van dat document is expliciet: één kaart en
   *    één R2-pad naast het saldo, geen eigen zoekfunctie en eigen mappen. De
   *    copy hoort dat te zeggen, want een aankondiging die "bibliotheek" belooft
   *    is een belofte die iemand later moet bouwen.
   */
  check('Editions staat in beide talen in het menu',
    [...read('src/i18n/ui.js').matchAll(/title: 'Editions'/g)].length, 2);
  check('en met soon: true, dus zonder link',
    /title: 'Editions'[^}]*soon: true/.test(read('src/i18n/ui.js')), true);
  check('beide talen hebben een Editions-paneel', edities.length, 2);

  /* DE LABELS DRAGEN HET WOORD HELEMAAL NIET. In het uitlegpaneel mag "stock"
     ontkend voorkomen; in de naam, de omschrijving en de knop niet, want dat
     zijn de drie regels die de dienst POSITIONEREN. Een bezoeker die alleen de
     strook scant, leest die drie en niets anders. */
  for (const veld of ['name', 'desc', 'cta']) {
    const waarden = [...home.matchAll(new RegExp(`${veld}: '([^']*)'`, 'g'))].map((m) => m[1]);
    const metStock = waarden.filter((v) => /stock/i.test(v));
    check(`geen enkele ${veld} noemt stock`, metStock, []);
  }
  for (const [i, b] of edities.entries()) {
    const lang = i === 0 ? 'en' : 'nl';
    check(`${lang}: vier regels in het Editions-paneel`, [...b.matchAll(/\n\s*\['/g)].length, 4);
    /* HET WOORD "STOCK" MAG WEL, MAAR ALLEEN ONTKEND. Eerste versie van deze
       regel verbood het woord helemaal, en toen viel hij om op de eigen copy:
       die zegt "the half a stock library structurally cannot do" en "the reason
       this is not a stock library". Dat is precies de juiste positionering —
       het is de vergelijking benoemen om hem af te wijzen — en een regel die
       het goede geval afkeurt, wordt weggehaald in plaats van gevolgd.

       Wat er dus staat: elke keer dat het woord valt, moet er een ontkenning
       vlak omheen staan. Zo blijft "wij verkopen stockfoto's" verboden en
       blijft "dit is geen stockbibliotheek" toegestaan.

       Per VOORKOMEN gezocht met een index en niet met matchAll: een globale
       regexp met context eromheen slikt bij de eerste treffer de aanloop van de
       tweede op, en dan lijkt een correct ontkende zin plotseling kaal. Dat
       gebeurde hier ook echt — de tweede vermelding kwam terug als
       "a stock library." zonder het "this is not" ervoor. */
    const zonderOntkenning = [];
    for (let k = b.toLowerCase().indexOf('stock'); k !== -1; k = b.toLowerCase().indexOf('stock', k + 1)) {
      const rond = b.slice(Math.max(0, k - 60), k + 60);
      /* `nooit` en `never` stonden hier niet bij, en dat kostte een ronde: de
         copy zei "wat een stockbibliotheek nooit kan bieden" — zo ontkennend als
         het maar kan — en deze regel las hem als een kale vermelding. Een lijst
         ontkenningen die de sterkste ontkenning niet kent, keurt de beste zin af. */
      if (!/(not|never|cannot|no |geen|niet|nooit|kán niet|kan niet)/i.test(rond)) zonderOntkenning.push(rond);
    }
    check(`${lang}: het woord stock valt alleen ontkend`, zonderOntkenning, []);
    check(`${lang}: de gedeelde set heet gedeeld`,
      /(shared|gedeeld)/i.test(b), true);
    check(`${lang}: en er staat bij dat hij naar andere merken gaat`,
      /(other brands|andere merken)/i.test(b), true);
    /* Ook hier de claim en niet de formulering: "no second library" zegt
       hetzelfde als "not a second library", en een toets die op het lidwoord
       staat, keurt de kortere zin af. */
    check(`${lang}: geen tweede bibliotheek beloofd`,
      /((not|no) a? ?second library|geen tweede \w*bibliotheek)/i.test(b), true);
    check(`${lang}: geen prijs in het Editions-paneel`, /€/.test(b), false);
    check(`${lang}: het komt binnen in VISUAILS Studio`, /VISUAILS Studio/.test(b), true);
  }
}

/* ══ DE META-OMSCHRIJVING VAN ELKE PAGINA ══════════════════════════════════════
 *
 * Boven ongeveer 160 tekens kapt Google de omschrijving af met een beletselteken.
 * Dat is geen ramp, maar het betekent wel dat de LAATSTE zin — meestal de zin die
 * zegt wat je moet doen — nooit gelezen wordt, op precies de plek waar iemand
 * kiest of hij klikt.
 *
 * OP DE GEBOUWDE PAGINA'S EN NIET OP DE BRON, om twee redenen. De bron kent
 * omschrijvingen die uit een variabele komen (zie /start) en die kan een regexp op
 * .astro niet meten. En dit is een vraag over wat er in de zoekresultaten
 * terechtkomt, dus hoort hij gesteld te worden aan wat er wordt uitgeserveerd.
 *
 * 160 EN GEEN 155 OF 165. Google publiceert geen grens — hij is in pixels en niet
 * in tekens — dus elk getal hier is een afspraak en geen wet. 160 is het getal
 * waar de vakliteratuur op uitkomt en, belangrijker, het getal waar de pagina's
 * van deze site vandaag onder zitten. Een grens die je vandaag al overtreedt, is
 * een test die je morgen uitzet.
 */
/* ══ HET KRUIMELPAD ════════════════════════════════════════════════════════════
 *
 * Zonder BreadcrumbList toont Google het kale pad van de url onder de titel; met,
 * toont hij de namen die wij geven. Deze site heeft twee niveaus en had er geen.
 *
 * WAT HIER BEWAAKT WORDT is niet dat elke pagina er een heeft — een paar hebben
 * hem met opzet niet — maar dat er nooit een VERZONNEN naam in staat. Zie de kop
 * bij CRUMBS in src/data/schema.js: een kruimelpad met een gegokt woord erin komt
 * in het zoekresultaat terecht, en dan is het ons woord dat niet klopt.
 */
console.log('\n══ het kruimelpad wijst naar echte pagina\'s met echte namen');
{
  const paden = [
    ['/lifestyle/glow', 'nl', 'https://visuails.com/nl/lifestyle/glow', 3],
    ['/lifestyle/glow', 'en', 'https://visuails.com/lifestyle/glow', 3],
    ['/pricing', 'en', 'https://visuails.com/pricing', 2],
    ['/start/catalog', 'nl', 'https://visuails.com/nl/start/catalog', 3],
  ];
  for (const [pad, taal, url, diepte] of paden) {
    const node = buildGraph({ path: pad, lang: taal, url })['@graph']
      .find((n) => n['@type'] === 'BreadcrumbList');
    check(`${taal} ${pad}: er is een spoor`, Boolean(node), true);
    check(`  met ${diepte} stappen`, node?.itemListElement?.length, diepte);
    /* De LAATSTE kruimel is de pagina zelf en krijgt geen link — dat schrijft
       schema.org voor, en een link naar waar je al bent is geen navigatie. */
    check('  de laatste is geen link', 'item' in (node?.itemListElement?.at(-1) || {}), false);
    /* En elke andere kruimel wijst naar een pagina die ECHT bestaat in dist.
       Een kruimelpad naar een 404 is een fout die alleen een zoekmachine ziet. */
    const dist = new URL('../dist/', import.meta.url);
    const staat = buildStaat(new URL('index.html', dist));
    if (staat.er && !staat.oud) {
      const kapot = node.itemListElement
        .filter((it) => it.item)
        .map((it) => String(it.item).replace('https://visuails.com', ''))
        .filter((rel) => !existsSync(new URL(`.${rel.replace(/\/$/, '')}/index.html`.replace('/./', './'), dist)));
      check('  en elke stap bestaat als pagina', kapot, []);
    }
    /* Het taalvoorvoegsel reist mee. Een Nederlands kruimelpad dat naar de
       Engelse pagina wijst, stuurt de lezer naar een taal die hij niet koos. */
    if (taal === 'nl') {
      check('  en blijft in het Nederlands',
        node.itemListElement.filter((it) => it.item).every((it) => it.item.includes('/nl')), true);
    }
  }

  // De pagina's die er met opzet géén hebben. (/demo stond hier tot 24 augustus
  // 2026 bij; die route bestaat niet meer, en een uitzondering toetsen op een
  // pagina die niet gebouwd wordt, bewijst niets meer.)
  for (const pad of ['/thank-you', '/portal', '/studio']) {
    const node = buildGraph({ path: pad, lang: 'en', url: `https://visuails.com${pad}` })['@graph']
      .find((n) => n['@type'] === 'BreadcrumbList');
    check(`${pad} krijgt er bewust geen`, Boolean(node), false);
  }
}

console.log('\n══ elke meta-omschrijving past in een zoekresultaat');
{
  const dist = new URL('../dist/index.html', import.meta.url);
  const staat = buildStaat(dist);
  if (!staat.er || staat.oud) {
    console.log(` --   niet gecontroleerd: ${staat.uitleg}`);
  } else {
    const root = new URL('../dist/', import.meta.url);
    const paden = [];
    const loop = (dir) => {
      for (const e of readdirSync(new URL(dir, root), { withFileTypes: true })) {
        if (e.isDirectory()) loop(`${dir}${e.name}/`);
        else if (e.name === 'index.html') paden.push(`${dir}${e.name}`);
      }
    };
    loop('');
    const telang = [];
    for (const pad of paden) {
      const html = readFileSync(new URL(pad, root), 'utf8');
      const m = html.match(/<meta name="description" content="([^"]*)"/);
      if (!m) continue;
      /* De entiteiten terug naar tekens voordat er geteld wordt: `&#38;` is één
         teken in een zoekresultaat en vijf in de html. Zonder deze stap keurt de
         toets een omschrijving af om opmaak die de lezer nooit ziet. */
      const tekst = m[1]
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
      if (tekst.length > 160) telang.push(`${pad} (${tekst.length})`);
    }
    check(`${paden.length} pagina's gemeten, geen enkele boven 160 tekens`,
      telang.length, 0, telang.join(', '));
  }
}

/*
 * ─────────────────────────────────────────────────────────────────────────────
 * DE LINKS UIT HET DASHBOARD MOETEN ERGENS UITKOMEN — 17 AUGUSTUS 2026
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Gevonden door ernaar te kijken: de kaart voor een klant zónder abonnement
 * verwees naar /plans en /nl/abonnement. Geen van beide bestaat — de drie
 * abonnementen staan in de sectie met id="plans" op /pricing. Twee 404's in het
 * dashboard van precies de klant die je iets wilde verkopen.
 *
 * src/lib/account.js is een Pages Function en wordt door geen enkele bouwstap
 * doorgelopen, dus er is niets dat zo'n verwijzing opmerkt. Deze sectie is dat:
 * elke vaste interne link uit dat bestand moet in `dist` een pagina zijn, of een
 * route zijn die de Function zelf afhandelt.
 *
 * Alleen VASTE links. Wat met een template-expressie is opgebouwd, weet deze test
 * niet uit te rekenen, en doen alsof is erger dan overslaan.
 */
console.log('\nevery fixed internal link in the dashboard resolves');
{
  const dist = new URL('../dist/', import.meta.url);
  /* GEEN buildStaat() HIER, en dat is een correctie op de eerste versie.
     buildStaat vergelijkt `dist` met het jongste bestand in `src/` — dus zodra je
     account.js aanraakt, sloeg deze sectie zichzelf over. Precies op het moment dat
     hij nodig is: de fout die hij moet vinden ONTSTAAT door een wijziging in
     account.js. Gemeten toen ik de kapotte link terugzette om te controleren of
     deze toets hem zou vinden: hij vond hem niet, want hij draaide niet.
     
     En de vergelijking is hier ook inhoudelijk verkeerd. account.js is een Pages
     Function; die zit niet in de Astro-bouw. Wat deze sectie leest zijn STATISCHE
     pagina's, en die worden niet oud doordat een Function verandert. Bestaan is
     dus de enige eis. */
  if (!existsSync(new URL('index.html', dist))) {
    console.log(' --   niet gecontroleerd: dist/index.html ontbreekt — draai `npx astro build`');
  } else {
    const src = readFileSync(new URL('../src/lib/account.js', import.meta.url), 'utf8');

    /* De routes die account.js en portal.js zelf bedienen. Die staan niet in dist,
       want ze bestaan alleen op het moment dat er iemand ingelogd is. */
    const eigenRoutes = /^\/(account|api|portal|order)(\/|$)/;

    const gevonden = new Set();
    for (const m of src.matchAll(/href="(\/[^"$]*?)"/g)) {
      const href = m[1].split('#')[0].split('?')[0];
      if (href && !href.includes('${')) gevonden.add(href);
    }
    check(`found some to check (${gevonden.size})`, gevonden.size > 0, true);

    for (const href of [...gevonden].sort()) {
      if (eigenRoutes.test(href)) continue;
      /* Een pagina in dist is een map met een index.html, of een bestand dat er
         letterlijk staat (een css- of afbeeldingsbestand). */
      const alsMap = new URL(`.${href.replace(/\/$/, '')}/index.html`, dist);
      const alsBestand = new URL(`.${href}`, dist);
      check(`account.js → ${href}`, existsSync(alsMap) || existsSync(alsBestand), true);
    }
  }
}

/* ══ 11 · /account WORDT NOOIT GELOKALISEERD ═══════════════════════════════
 *
 * /account is ÉÉN Cloudflare Pages Function. Hij leest zijn eigen taal uit de
 * gegevens van de klant — er is nooit een Nederlandse route geweest om naar te
 * lokaliseren. Wie hem toch door localizedPath() haalt, stuurt elke bezoeker
 * van /nl/* naar /nl/account, en dat is een 404 op de INLOGLINK.
 *
 * DIT IS TWEE KEER GEBEURD, EN DAT IS DE REDEN DAT DEZE SECTIE BESTAAT.
 *
 *   · 28 juli 2026 — in Layout.astro, op de inloglink in de navigatie. Gevonden
 *     door Lucas, gerepareerd, en er staat een noot van tien regels bij die
 *     precies uitlegt waarom het `href="/account"` moet zijn.
 *   · 18 augustus 2026 — in ModelPicker.astro en OrderFlow.astro, op de
 *     "log in"-knop in de bestelstroom. Zeven Nederlandse pagina's linkten naar
 *     een 404. Die noot van tien regels stond dus al op de site en had deze
 *     twee niet tegengehouden, want hij stond in een ander bestand.
 *
 * Een reparatie op één plek terwijl hetzelfde patroon ergens anders nog staat,
 * is geen reparatie — het is een noot. Daarom staat de regel nu in een test en
 * gaat hij over de HELE bron in plaats van over één bestand.
 */
console.log('\n/account wordt nooit gelokaliseerd');
{
  const bestanden = [];
  (function loop(dir) {
    for (const e of readdirSync(new URL(`../${dir}/`, import.meta.url), { withFileTypes: true })) {
      if (e.isDirectory()) loop(`${dir}/${e.name}`);
      else if (/\.(astro|js|ts)$/.test(e.name)) bestanden.push(`${dir}/${e.name}`);
    }
  }('src'));

  /* Elke vorm waarmee /account door de taalhulp kan lopen. lp() is de lokale
     alias die bijna elk bestand aanmaakt; localizedPath() is het origineel. */
  const patroon = /(?:\blp|localizedPath)\(\s*(?:lang\s*,\s*)?['"`]\/account/;
  const fout = bestanden.filter((f) => patroon.test(codeOnly(read(f))));
  check('geen enkel bestand haalt /account door lp()', fout, []);

  /* En het resultaat, in de gebouwde site. Eigen `dist` — de andere secties
     declareren hem binnen hun eigen blok, en die zijn hier niet zichtbaar.
     Bestaat dist/ niet (een schone kloon zonder build), dan wordt dit deel
     overgeslagen: de broncontrole hierboven is de harde, deze is de bevestiging. */
  const distMap = new URL('../dist/', import.meta.url);
  if (existsSync(distMap)) {
    const treffers = [];
    (function loop(u, rel) {
      for (const e of readdirSync(u, { withFileTypes: true })) {
        const kind = new URL(`${e.name}${e.isDirectory() ? '/' : ''}`, u);
        if (e.isDirectory()) loop(kind, `${rel}${e.name}/`);
        else if (e.name.endsWith('.html') && readFileSync(kind, 'utf8').includes('href="/nl/account"')) {
          treffers.push(`${rel}${e.name}`);
        }
      }
    }(distMap, ''));
    check('en geen enkele gebouwde pagina linkt naar /nl/account', treffers, []);
  }
}

/*
 * ══════════════════════════════════════════════════════════════════════════
 * DE KNOP ZEGT WAT ER ACHTER DE KNOP GEBEURT
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Lucas, 21 augustus 2026: *"als je op /catalog zit en je klikt op start an
 * order kom je weer bij het keuzemenu van catalog, lifestyle en complete …
 * ik wil dat er niet start an order staat maar iets van Get Catalog visuals."*
 *
 * Twee fouten zaten daarin, en ze zijn elkaars spiegelbeeld:
 *
 *   1. Een dienstpagina die naar /start wijst. Die stuurt iemand die al
 *      gekozen heeft terug naar het keuzescherm — drie klikken waar er twee
 *      nodig zijn, en de derde is een vraag die hij al beantwoord had.
 *
 *   2. Een knop die "Start an order" heet maar naar /start/video gaat. Die
 *      belooft een keuze en levert een formulier. Dit stond tot 21 augustus
 *      onderaan /video, en het is dezelfde fout van de andere kant.
 *
 * Deze controle houdt allebei tegen, in de GEBOUWDE site en in beide talen.
 * Ze staat hier en niet in wandel.mjs omdat er geen browser voor nodig is en
 * `npm test` altijd draait.
 */
{
  console.log('\nde knop zegt wat er achter de knop gebeurt');
  const DIENSTEN = ['/catalog', '/lifestyle', '/video', '/custom-models', '/plans'];
  const ALGEMEEN = /^(start an order|start een bestelling|order now|bestel nu)$/i;

  const paginas = [];
  (function zoek(u, rel) {
    for (const e of readdirSync(u, { withFileTypes: true })) {
      const kind = new URL(`${e.name}${e.isDirectory() ? '/' : ''}`, u);
      if (e.isDirectory()) zoek(kind, `${rel}${e.name}/`);
      else if (e.name === 'index.html') paginas.push([`/${rel}`, kind]);
    }
  }(new URL('../dist/', import.meta.url), ''));

  const lus = (n, f) => { f(n); for (const c of n.childNodes || []) lus(c, f); };
  const plat = (n, o = []) => {
    if (n.nodeName === '#text') { o.push(n.value); return o; }
    if (n.nodeName === 'script' || n.nodeName === 'style' || n.nodeName === 'svg') return o;
    for (const c of n.childNodes || []) plat(c, o);
    return o;
  };
  const kaal = (p) => p.replace(/^\/nl/, '').replace(/\/$/, '') || '/';

  const terugNaarKiezen = [];
  const beloofdeKeuze = [];

  for (const [pad, u] of paginas) {
    const html = readFileSync(u, 'utf8');
    if (!html.includes('/start')) continue;
    const doc = parse(html);
    let main = null;
    lus(doc, (n) => { if (n.nodeName === 'main' && !main) main = n; });
    if (!main) continue;
    const opDienstpagina = DIENSTEN.includes(kaal(pad));
    lus(main, (n) => {
      if (n.nodeName !== 'a') return;
      const href = (n.attrs || []).find((a) => a.name === 'href')?.value || '';
      const kl = (n.attrs || []).find((a) => a.name === 'class')?.value || '';
      if (!/\bbtn\b/.test(kl)) return;              // alleen knoppen, geen lopende tekst
      const tekst = plat(n).join(' ').replace(/\s+/g, ' ').trim();
      const doel = href.split('?')[0].replace(/\/$/, '');
      if (opDienstpagina && /^(\/nl)?\/start$/.test(doel)) {
        terugNaarKiezen.push(`${kaal(pad)}: "${tekst}"`);
      }
      if (/^(\/nl)?\/start\/.+/.test(doel) && ALGEMEEN.test(tekst)) {
        beloofdeKeuze.push(`${pad}: "${tekst}" -> ${href}`);
      }
    });
  }

  check('geen knop op een dienstpagina wijst terug naar /start', terugNaarKiezen, []);
  check('en geen knop belooft een keuze maar levert een formulier', beloofdeKeuze, []);
  check('er zijn genoeg pagina\'s doorzocht om iets te betekenen', paginas.length > 80, true);
}

console.log(`\n${pass}/${pass + fail} passed`);
if (fail) process.exit(1);
