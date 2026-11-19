/* VISUAILS — levering 118 (17 november 2026), proefronde: toegankelijkheid van de gedeelde onderdelen (bouwer BF).
 *
 *   node tests/levering-118-toegankelijkheid.test.mjs      (geen build nodig: leest de bron, en draait de scripts uit
 *                                                           Layout.astro zelf in een browser op een kleine testpagina)
 *
 *   P11-01 · de cookiebalk staat direct na de skiplink; na een keuze gaat de focus terug; scroll-padding houdt de focus
 *            boven de balk;
 *   P2-01  · de cookieknoppen breken af (geen nowrap), de balk is hoogstens 60 % van het scherm;
 *   P11-02 · de focusrand in het witte paneel is inkt;
 *   P11-03 · gewone uitklappers (keuze a): geen role=menu/menuitem/aria-haspopup, wel aria-controls, en aria-expanded
 *            volgt wat je ziet (in de browser: hover, focus in het paneel, Tab eruit sluit);
 *   P11-05 · de galerij: tegels zijn links (geen role=listitem), elke look één tabstop;
 *   P11-07 · hoog contrast: gekozen keuzes, de schakelaar, de stap, velden en het logo;
 *   T1-07  · de schuifstroken zijn een tabstop met een naam;
 *   P4-03  · de taalwissel neemt ?style= en je invoer mee (in de browser: typen, wisselen, terug ingevuld).
 */
import { readFileSync, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright';
import { transform } from 'esbuild';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const lees = (p) => readFileSync(path.join(ROOT, p), 'utf8');
/* de bron zonder commentaar: de uitleg noemt de oude vorm (role="menuitem", nowrap) bij naam */
const zonder = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');
let pass = 0, fail = 0;
const ok = (naam, v, extra = '') => { if (v) { pass++; console.log(` ok   ${naam}`); } else { fail++; console.log(` FAIL ${naam} ${extra}`); } };

const layout = lees('src/layouts/Layout.astro');
const cc = lees('src/components/CookieConsent.astro');
const hal = lees('src/styles/hal.css');
const blok = hal.slice(hal.indexOf('LEVERING 118 · ONTWERP'));
const gal = lees('src/components/HalGalerij80.astro');

console.log('\nP11-01 · de cookiebalk vooraan');
const skip = layout.indexOf('<a class="skip-link" href="#main">'), balk = layout.indexOf('<CookieConsent lang={lang}');
ok('<CookieConsent> staat direct na de skiplink', skip > 0 && balk > skip && balk - skip < 700 && layout.indexOf('<header class="site-header">') > balk);
ok('  en maar één keer', layout.split('<CookieConsent lang={lang}').length === 2);
ok('scroll-padding-bottom met de hoogte van de balk (WCAG 2.4.11)', /:global\(html\) \{ scroll-padding-bottom: calc\(var\(--cc-h, 0px\) \+ 12px\); \}/.test(cc));
ok('na een keuze gaat de focus terug (accept, reject, save)', /\[data-cc="accept"\], \[data-cc="reject"\], \[data-cc="save"\]/.test(layout) && /getElementById\('main'\)/.test(layout));

console.log('\nP2-01 · de cookieknoppen bij 200 % zoom');
const knop = cc.match(/\.cc-btn \{([\s\S]*?)\n  \}/);
ok('geen white-space: nowrap meer op .cc-btn', knop && !/white-space: nowrap/.test(zonder(knop[1])) && /white-space: normal/.test(knop[1]));
ok('de balk is hoogstens 60 % van het scherm en schuift zelf', /\.cc \{ max-height: 60svh; overflow-y: auto;/.test(cc));

console.log('\nP11-02 · de focusrand in het paneel');
/* levering 118 (integratie IB): hal.css kent geen :is() (tests/live-qa-51); de kiezers staan uitgeschreven. */
ok('in .nav-menu: inkt #090D0B (wint van de mint van balk-99)', /\.site-header \.nav-menu a:focus-visible:not\(#k\):not\(#k\):not\(#k\),\s*html body\.hal \.site-header \.nav-menu button:focus-visible:not\(#k\):not\(#k\):not\(#k\) \{ outline-color: #090D0B !important; \}/.test(blok));

console.log('\nP11-03 · gewone uitklappers');
ok('geen role="menu", role="menuitem" of aria-haspopup in de balk', !/role="menuitem"/.test(zonder(layout)) && !/<div class="nav-menu[^"]*" role="menu"/.test(layout) && !/aria-haspopup/.test(zonder(layout)));
for (const [label, id] of [['nav_drops', 'nav-m-wat'], ['nav_how', 'nav-m-hoe'], ['nav_pricing', 'nav-m-prijs']]) {
  ok(`${label}: knop met aria-expanded en aria-controls="${id}", paneel met dat id`, layout.includes(`aria-expanded="false" aria-controls="${id}">{t('${label}')}`) && layout.includes(`id="${id}">`));
}
ok('de focus op de knop opent het paneel niet meer, de focus in het paneel wel', /\.has-menu:hover \.nav-menu, \.has-menu \.nav-menu:focus-within, \.has-menu\.menu-open \.nav-menu \{/.test(layout) && !/\.has-menu:focus-within \.nav-menu \{/.test(layout));

console.log('\nP11-05 · de galerij');
ok('de tegels zijn links: geen role="listitem", de rij is een groep', !/role="listitem"/.test(zonder(gal)) && /data-g8-baan role="group"/.test(gal));
ok('een look die al eerder stond: tabindex -1 en aria-hidden', /const dubbel = gezien\.has\(d\.href\)/.test(gal) && /tabindex=\{kopie \|\| t\.dubbel \? -1 : undefined\}/.test(gal) && /aria-hidden=\{kopie \|\| t\.dubbel \? 'true' : undefined\}/.test(gal));
/* tellen op de echte data: hoeveel tabstops blijven er over */
const G = JSON.parse(lees('src/data/galerij80.json'));
const uniek = new Set(G.rijen.flat().map((it) => `${it.soort}/${it.stijl}`));
ok(`tabstops: ${uniek.size} (was ${G.rijen.flat().length})`, uniek.size < G.rijen.flat().length && uniek.size <= 8);

console.log('\nP11-07 · hoog contrast');
const hc = blok.slice(blok.indexOf('@media (forced-colors: active)'));
ok('een gekozen label (verborgen rondje of vinkje): rand in Highlight', /label:has\(> input\[type="radio"\]:checked\),\s*html body\.hal label:has\(> input\[type="checkbox"\]:checked\) \{ outline: 2px solid Highlight;/.test(hc));
ok('een gekozen knop (aria-pressed / aria-checked): rand in Highlight', /main \[aria-pressed="true"\],\s*html body\.hal main \[aria-checked="true"\],\s*html body\.hal main \.is-gekozen \{ outline: 2px solid Highlight;/.test(hc));
ok('de voorrangschakelaar: een rand, aan = Highlight', /\.wk-schuif \{ forced-color-adjust: none;[^}]*border: 1px solid CanvasText;/.test(hc) && /> \.wk-schuif \{ background: Highlight !important;/.test(hc));
ok('de stap waar je bent: onderstreept', /\[aria-current="step"\]\[aria-current="step"\],\s*html body\.hal \.pl-rail-item\.is-current \{ text-decoration: underline 3px/.test(hc));
ok('velden en uploadvakken: een rand in CanvasText', /input:not\(\[type="radio"\]\):not\(\[type="checkbox"\]\)[\s\S]*main \.pu-slot-btn \{ border: 1px solid CanvasText !important; \}/.test(hc));
ok('het logo in balk en voet: CanvasText (alleen herkleurd)', /\.site-header \.hal-wm:not\(#k\):not\(#k\),[\s\S]*\.site-footer \.brand-mark \*:not\(#k\):not\(#k\) \{ fill: CanvasText !important; \}/.test(hc));

console.log('\nT1-07 · de schuifstroken');
const ls = lees('src/components/LifestyleHal.astro'), bm = lees('src/components/BrandModelHal.astro');
ok('Lifestyle: ul.h-strook tabindex 0 met een naam, role="list" blijft', /<ul class="h-strook" role="list" data-h-strook-rij tabindex="0" aria-label=\{c\.strook\}>/.test(ls));
ok('  de naam in NL en EN', /strook: 'Examples\. Scroll with the arrow keys\.'/.test(ls) && /strook: 'Voorbeelden\. Schuif met de pijltjestoetsen\.'/.test(ls));
ok('Merkmodel: ul.h-bm-uit tabindex 0 met een naam (NL en EN)', /<ul class="h-bm-uit" role="list" tabindex="0" aria-label=\{c\.outStrook\}>/.test(bm) && /outStrook: 'Brand model examples/.test(bm) && /outStrook: 'Voorbeelden van een merkmodel/.test(bm));
ok('een zichtbare focusrand van 2 px inkt', /\.h-strook:focus-visible,\s*html body\.hal \.h-bm-uit:focus-visible,\s*html body\.hal \.h-lk-held:focus-visible \{ outline: 2px solid #090D0B;/.test(blok));

console.log('\nP6-09 · de token voor Web Analytics');
const tokenRegel = layout.match(/const CF_RUW = ([^\n]*)\nconst CF_ANALYTICS_TOKEN = ([^\n]*)/);
ok('Layout leest PUBLIC_CF_ANALYTICS_TOKEN nog steeds bij het bouwen', /import\.meta\.env\.PUBLIC_CF_ANALYTICS_TOKEN/.test(layout));
if (tokenRegel) {
  const maak = new Function('ruw', `const CF_RUW = ${tokenRegel[1].replace('import.meta.env.PUBLIC_CF_ANALYTICS_TOKEN', 'ruw').replace(/;$/, '')}; return ${tokenRegel[2].replace(/;$/, '')};`);
  ok('een gewone sleutel blijft staan', maak('313a5e2e507840b8a99086181052cde1') === '313a5e2e507840b8a99086181052cde1');
  ok('  met spaties of aanhalingstekens eromheen ook', maak('  "313a5e2e507840b8a99086181052cde1" \n') === '313a5e2e507840b8a99086181052cde1');
  ok('leeg of niet gezet: leeg (er laadt niets)', maak(undefined) === '' && maak('') === '' && maak('   ') === '');
  ok('iets dat geen sleutel is: leeg, geen kapotte tag', maak('<script>') === '' && maak('abc') === '' && maak('a b c d e f g h i j k l m n o p') === '');
} else ok('de schoonmaak van de token staat in Layout', false);

/* ── in de browser: de scripts uit Layout.astro zelf, op een kleine testpagina ─────────────────────────────────────── */
const EXECUTABLE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let browser = null;
try { browser = await chromium.launch(existsSync(EXECUTABLE) ? { executablePath: EXECUTABLE } : {}); } catch (e) { console.log(`  --   geen browser (${e.message.split('\n')[0]}); de browserdelen overgeslagen`); }
if (browser) {
  const taal = layout.match(/<script is:inline define:vars=\{\{ taalMaxAge: [^}]*\}\}>([\s\S]*?)<\/script>/)[1];
  const modules = [...layout.matchAll(/<script>\n([\s\S]*?)<\/script>/g)].map((m) => m[1]).filter((s) => /levering 118/.test(s));
  const js = (await Promise.all(modules.map((m) => transform(m, { loader: 'ts' })))).map((r) => r.code).join('\n');
  const vorm = (lang) => `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><script>var taalMaxAge = 60;${taal}</script>
    <style>.nav-menu{visibility:hidden}.has-menu:hover .nav-menu,.has-menu .nav-menu:focus-within,.has-menu.menu-open .nav-menu{visibility:visible}#cc-bar[hidden]{display:none}</style></head><body>
    <a class="skip-link" href="#main">skip</a>
    <aside id="cc-bar"><button data-cc="reject">nee</button><button data-cc="accept">ja</button></aside>
    <header class="site-header"><ul><li class="has-menu"><button type="button" class="nav-trigger" aria-expanded="false" aria-controls="m1">Wat</button>
      <div class="nav-menu" id="m1"><a href="#a">A</a><a href="#b">B</a></div></li><li><a id="na" href="#c">C</a></li></ul>
      <a href="${lang === 'nl' ? '/start/video/' : '/nl/start/video/'}" hreflang="${lang === 'nl' ? 'en' : 'nl'}" class="wk-taal">${lang === 'nl' ? 'EN' : 'NL'}</a></header>
    <main id="main" tabindex="-1"><form action="/api/order" method="post"><input name="name"><input name="email" type="email">
      <select name="clips"><option value="">?</option><option value="3">3</option></select><textarea name="message"></textarea>
      <label><input type="radio" name="pref" value="mail" checked>mail</label><label><input type="radio" name="pref" value="wa">wa</label>
      <input type="hidden" name="cf-turnstile-response" value="geheim"><input name="company_hp"></form></main>
    <script>
      /* zoals consent.js: de balk weg na een keuze */
      document.querySelectorAll('#cc-bar button').forEach((b) => b.addEventListener('click', () => { document.getElementById('cc-bar').hidden = true; }));
      /* zoals interactions.js: een klik op de knop zet menu-open */
      document.addEventListener('click', (e) => { const t = e.target.closest && e.target.closest('.nav-trigger'); if (t) t.closest('.has-menu').classList.toggle('menu-open'); });
      ${js}
    </script></body></html>`;
  const srv = createServer((q, r) => {
    const u = new URL(q.url, 'http://x');
    if (/^\/(nl\/)?start\/video\/$/.test(u.pathname)) { r.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return r.end(vorm(u.pathname.startsWith('/nl/') ? 'nl' : 'en')); }
    r.writeHead(404); r.end();
  });
  await new Promise((r) => srv.listen(0, r));
  const BASIS = `http://127.0.0.1:${srv.address().port}`;
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });

  console.log('\nP4-03 · de taalwissel, in de browser');
  await page.goto(`${BASIS}/start/video/?style=motion#stap-2`);
  await page.fill('input[name=name]', 'Test Persoon');
  await page.fill('input[name=email]', 'test@voorbeeld.nl');
  await page.selectOption('select[name=clips]', '3');
  await page.fill('textarea[name=message]', 'Een bericht');
  await page.check('input[name=pref][value=wa]');
  await page.click('a[hreflang=nl]');
  await page.waitForURL(/\/nl\/start\/video\//);
  ok('?style= en #stap gaan mee (ook met de taalknop van het formulier, .wk-taal)', page.url().endsWith('/nl/start/video/?style=motion#stap-2'), page.url());
  const terug = await page.evaluate(() => ({ n: document.querySelector('[name=name]').value, e: document.querySelector('[name=email]').value, c: document.querySelector('[name=clips]').value, m: document.querySelector('[name=message]').value, p: document.querySelector('[name=pref]:checked').value, ts: document.querySelector('[name=cf-turnstile-response]').value, rest: sessionStorage.getItem('vis-taal-concept') }));
  ok('naam, e-mail, keuzelijst, bericht en rondje staan er weer', terug.n === 'Test Persoon' && terug.e === 'test@voorbeeld.nl' && terug.c === '3' && terug.m === 'Een bericht' && terug.p === 'wa', JSON.stringify(terug));
  ok('  een verborgen veld (botcheck) wordt niet overschreven', terug.ts === 'geheim');
  ok('  en de momentopname is daarna weg uit sessionStorage', terug.rest === null);
  await page.reload();
  ok('opnieuw laden zet niets meer terug (velden weer leeg)', await page.evaluate(() => document.querySelector('[name=name]').value) === '');

  console.log('\nP11-03 · aria-expanded volgt wat je ziet, in de browser');
  const exp = () => page.evaluate(() => document.querySelector('.nav-trigger').getAttribute('aria-expanded'));
  await page.focus('.skip-link'); await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
  await page.waitForTimeout(50);
  ok('Tab naar de knop: het paneel blijft dicht, aria-expanded "false"', (await page.evaluate(() => document.activeElement.className)) === 'nav-trigger' && await exp() === 'false' && await page.evaluate(() => getComputedStyle(document.querySelector('.nav-menu')).visibility) === 'hidden');
  await page.keyboard.press('Enter'); await page.waitForTimeout(50);
  ok('Enter: open, aria-expanded "true"', await exp() === 'true');
  await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); await page.waitForTimeout(50);
  ok('Tab door de links: blijft open', await exp() === 'true' && await page.evaluate(() => document.activeElement.textContent) === 'B');
  await page.keyboard.press('Tab'); await page.waitForTimeout(50);
  ok('Tab het paneel uit: dicht, aria-expanded "false"', await exp() === 'false' && await page.evaluate(() => getComputedStyle(document.querySelector('.nav-menu')).visibility) === 'hidden' && await page.evaluate(() => document.activeElement.id) === 'na');
  await page.hover('.nav-trigger'); await page.waitForTimeout(50);
  ok('onder de muis open: aria-expanded "true"', await exp() === 'true');
  await page.mouse.move(5, 790); await page.waitForTimeout(50);
  ok('de muis weg: "false"', await exp() === 'false');

  console.log('\nP11-01 · de focus na de cookiekeuze, in de browser');
  await page.focus('.skip-link'); await page.keyboard.press('Tab');
  ok('de tweede tabstop is de cookiebalk', await page.evaluate(() => document.activeElement.dataset.cc) === 'reject');
  await page.keyboard.press('Enter'); await page.waitForTimeout(50);
  ok('na "nee": de balk is weg en de focus staat weer op de skiplink (niet op <body>)', await page.evaluate(() => document.getElementById('cc-bar').hidden && document.activeElement.className === 'skip-link'));

  await browser.close();
  srv.close();
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
