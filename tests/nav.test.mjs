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
    const rules = selectors.filter((sel) => new RegExp(`${link.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*(,|$)`, 'm').test(sel));
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

/* ══ 5 · WAT HET FORMULIER POST ═════════════════════════════════════════════
 *
 * Dit is de belangrijkste test van het bestand, en de reden staat in
 * functions/api/order.js: een onbekende `service` wordt daar niet geweigerd maar
 * STIL omgezet naar 'catalog'.
 *
 *   const svc = ORDER_SERVICES.has(service) ? service : 'catalog';
 *
 * Zou dit formulier `service="hooks"` posten, dan komt elke aanvraag binnen als
 * een catalogbestelling — met een referentie, in de bestellijst, tussen het echte
 * werk. Niemand zou het merken tot iemand zich afvraagt waarom er catalogorders
 * zijn die niemand geplaatst heeft.
 */
/*
 * LET OP: HooksPage.astro bestaat nog wél — het is het concept, maar er is geen
 * pagina meer die hem rendert. Deze sectie blijft daarom staan: zodra de pagina
 * terugkomt, moet het formulier nog steeds `service=video` posten, en dat is
 * precies iets wat je bij het terugzetten vergeet.
 */
console.log('\nwat het formulier post');
{
  const page = read('src/components/HooksPage.astro');
  const order = read('functions/api/order.js');

  const svc = /name="service" value="([^"]+)"/.exec(page)?.[1];
  check('service is video en niet hooks', svc, 'video');
  // En die waarde moet echt in de lijst staan die order.js accepteert.
  const known = new RegExp(`ORDER_SERVICES = new Set\\(\\[[^\\]]*'${svc}'`).test(order);
  check('en die waarde staat in ORDER_SERVICES', known, true);
  check('het onderscheid zit in request=hooks', /name="request" value="hooks"/.test(page), true);

  // video mag niet afgerekend worden, anders is een aanvraag een betaalbare order.
  const quote = read('src/lib/quote.js');
  check('video is niet betaalbaar', /PAYABLE_SERVICES = new Set\(\['catalog', 'lifestyle', 'complete'\]\)/.test(quote), true);

  check('de honeypot zit erin', /name="company_hp"/.test(page), true);
  // Het vinkje is toestemming en dus NOOIT verplicht. `required` erop zou het van
  // een keuze in een voorwaarde veranderen, en dan is het geen toestemming meer.
  const box = /<input type="checkbox" name="notify"[^>]*>/.exec(page)?.[0] || '';
  check('het notify-vinkje bestaat', box !== '', true);
  check('en is niet verplicht', /required/.test(box), false);
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
 *    Die tekst staat nog steeds als bestand op de schijf. Een uitklapper op de
 *    homepage is precies de plek waar iemand hem er ooit uit copy-pastet.
 *
 * 2. DE PRIJS. De strook staat er juist omdat de dienst nog niet besteld kan
 *    worden en de prijs nog niet vastligt. Eén "vanaf €119" in dit paneel maakt
 *    van een aankondiging een openbaar aanbod.
 *
 * 3. HET DRIEHOEKJE. Drie engines, drie manieren om de marker te verbergen. Wie
 *    er één weghaalt bij het opschonen, ziet dat op zijn eigen browser niet.
 */
console.log('\nhet vraagteken naast hooks');
{
  const home = read('src/components/HomeV2.astro');

  // De uitklapper zelf, en de summary die de hele titelregel is.
  check('er is een <details> bij Hooks', /<details class="hv-q">/.test(home), true);
  check('de titelregel is de summary', /<summary class="hv-soon-h hv-q-sum">/.test(home), true);
  check('het rondje is decoratie', /class="hv-q-mark" aria-hidden="true">\?</.test(home), true);
  // De toegankelijke naam staat in de summary en niet in een title-attribuut: een
  // title wordt niet voorgelezen en op een telefoon nooit gezien.
  check('en er staat een naam voor de handeling in', /class="hv-q-say">\{c\.svcSoonQ\}</.test(home), true);

  // Het driehoekje, op alle drie de manieren. Los geteld, want één ervan
  // weghalen is de fout die alleen op iemand anders' browser te zien is.
  const css = home.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const rule of [
    '.hv-q > .hv-q-sum { list-style: none',
    '.hv-q > .hv-q-sum::marker',
    '.hv-q > .hv-q-sum::-webkit-details-marker',
  ]) {
    check(`de marker is weg via ${rule.split('.hv-q-sum').pop() || 'list-style'}`, css.includes(rule), true);
  }
  // En de verborgen naam is écht verborgen, niet met display:none (dan valt hij
  // ook uit de toegankelijkheidsboom en is de knop weer "?").
  check('de naam is visueel verborgen, niet weggehaald', /\.hv-q-say \{[^}]*clip-path: inset\(50%\)/.test(css), true);
  check('en niet met display: none', /\.hv-q-say \{[^}]*display: none/.test(css), false);

  /*
   * DE PANEELTEKST, per taal uit de bron gehaald.
   *
   * De copy van de homepage zit in HomeV2.astro zelf en niet in ui.js, dus valt
   * hij niet te importeren; hij wordt hier uit de brontekst gelezen. Twee blokken
   * verwacht — Engels en Nederlands — want één taal controleren is een halve
   * controle, en dat is precies het gat waar bij deze strook eerder al iets in
   * verdween.
   */
  const blocks = [...home.matchAll(/svcSoonQBody: \[([\s\S]*?)\n {4}\],/g)].map((m) => m[1]);
  check('beide talen hebben een paneeltekst', blocks.length, 2);
  for (const [i, b] of blocks.entries()) {
    const lang = i === 0 ? 'en' : 'nl';
    check(`${lang}: vier regels in het paneel`, [...b.matchAll(/\n\s*\['/g)].length, 4);

    // Wat er MOET staan.
    check(`${lang}: één foto is niet genoeg`, /(not enough|niet genoeg)/.test(b), true);
    check(`${lang}: een specialist kijkt hem na`, /specialist/.test(b), true);
    check(`${lang}: 24 tot 48 uur`, /24 (to|tot) 48/.test(b), true);
    check(`${lang}: het scherm heet VISUAILS Studio`, /VISUAILS Studio/.test(b), true);

    // Wat er NIET mag staan. "viral" en "scroll" zijn de twee woorden waar Lucas
    // om vroeg ze weg te laten; het eurotekens-verbod is de prijs die nog niet
    // vastligt; "genoeg" zonder "niet" ervoor is de fout van de oude pagina.
    check(`${lang}: geen prijs in het paneel`, /€/.test(b), false);
    check(`${lang}: het woord viral staat er niet`, /viral/i.test(b), false);
    check(`${lang}: de scroll wordt niet genoemd`, /scroll/i.test(b), false);
    check(`${lang}: geen belofte van bereik`,
      /(guarantee|gegarandeerd|meer volgers|more followers|gaat viraal)/i.test(b), false);
  }

  // En de voetregel zegt waarom de knop dood is, in beide talen.
  const feet = [...home.matchAll(/svcSoonQFoot: '([^']*)'/g)].map((m) => m[1]);
  check('beide talen hebben een voetregel', feet.length, 2);
  check('en die zegt dat de prijs nog niet vastligt',
    feet.every((f) => /(not settled|niet vast)/.test(f)), true);
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

  // De pagina's die er met opzet géén hebben.
  for (const pad of ['/thank-you', '/portal', '/studio', '/demo']) {
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

console.log(`\n${pass}/${pass + fail} passed`);
if (fail) process.exit(1);
