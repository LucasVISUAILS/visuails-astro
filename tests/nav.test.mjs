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

import { readFileSync, existsSync } from 'node:fs';
import { ui } from '../src/i18n/ui.js';

let pass = 0, fail = 0;
const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) pass++; else fail++;
  console.log(`${ok ? ' ok  ' : 'FAIL '} ${String(name).padEnd(58)} ${ok ? '' : `expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`}`);
};
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
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
console.log('\nde prijsvorm');
{
  const pricing = read('src/data/pricing.js');
  // Alleen de code, want de noot bij de functie noemt de naam ook.
  const code = pricing.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1');
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
  const stripped = (f) => read(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/(^|\s)\/\/.*$/gm, '$1');
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

  const sitemap = read('public/sitemap.xml').replace(/<!--[\s\S]*?-->/g, '');
  check('en hij staat niet in de sitemap', /hooks/.test(sitemap), false);

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

console.log(`\n${pass}/${pass + fail} passed`);
if (fail) process.exit(1);
