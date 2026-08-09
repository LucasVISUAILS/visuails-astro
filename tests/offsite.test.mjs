/* VISUAILS — naar buiten sturen onder form-action 'self'.
 *
 *   npm run test:offsite
 *
 * ── WAT HIER MISGING, EN WAAROM EEN TEST HET NIET ZAG ───────────────────────
 *
 * De reviewknoppen in VISUAILS Studio deden niets. Lucas, 9 augustus 2026:
 * *"Deze knoppen verwijzen nergens naartoe."* Een nieuw tabblad opende, bleef op
 * /account/feedback staan, en bleef leeg.
 *
 * De code was goed te lezen en fout: een POST naar onze eigen route, en daarna
 * een 303 naar Google. Wat niemand meenam is dat `form-action 'self'` — in de CSP
 * van precies deze pagina — óók over de REDIRECT gaat die op de post volgt. De
 * post kwam aan, de klik werd opgeslagen, en de reis erna werd door de browser
 * geblokkeerd.
 *
 * Er was geen test die dit kón vangen, want alle bestaande tests toetsen wat de
 * FUNCTIE teruggeeft. `{ ok: true, redirect: 'https://g.page/…' }` was in elke
 * test de juiste waarde en in de browser een leeg tabblad. Dat gat is de reden
 * dat dit bestand twee soorten controles heeft:
 *
 *   · de tussenpagina zelf — komt het doel er twee keer in te staan, één keer als
 *     meta refresh en één keer als knop die iemand kan aanklikken
 *   · een BRONCONTROLE — staat er nergens meer een 303 naar een externe url. Dat
 *     is de enige vorm die de fout opnieuw zou maken, en het is geen vorm die je
 *     aan een retourwaarde kunt zien.
 *
 * De meting waar dit op rust staat in scripts/csp-probe.mjs (echte Chromium, drie vormen
 * naast elkaar) en de uitkomst in de kop van src/lib/offsite.js.
 */

import { readFileSync } from 'node:fs';
import { offsitePage, isOffsiteUrl } from '../src/lib/offsite.js';
import { REVIEW_PLATFORMS } from '../src/data/reviews.js';
import { handleFeedbackPost } from '../src/lib/feedback.js';

let pass = 0, fail = 0;
const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) pass++; else fail++;
  console.log(`${ok ? ' ok  ' : 'FAIL '} ${String(name).padEnd(64)} ${ok ? '' : `expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`}`);
};

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

/*
 * Alleen de CODE, zonder commentaar.
 *
 * Nodig omdat de broncontrole onderaan naar `seeOther(checkout)` zoekt, en die
 * tekst staat in dat bestand ook in een uitleg over waarom hij er niet meer staat.
 * Zonder deze stap toetst de test dus of iemand de reden heeft opgeschreven in
 * plaats van of de fout weg is — en zou hij rood worden juist doordat de fout goed
 * gedocumenteerd is.
 *
 * De regexp voor een regelcommentaar eist een spatie of regelbegin vóór de twee
 * slashes, zodat `https://…` in een string blijft staan.
 */
const codeOnly = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1');

/* ══ 1 · WAT WEL EN NIET EEN DOEL MAG ZIJN ═══════════════════════════════════
   Een pagina die doorstuurt is de vorm van een open redirect, dus wordt de grens
   hier getoetst en niet bij de aanroeper. */
console.log('\nisOffsiteUrl');
{
  check('https met host', isOffsiteUrl('https://g.page/r/abc/review'), true);
  check('http mag niet', isOffsiteUrl('http://g.page/r/abc/review'), false);
  check('javascript: mag niet', isOffsiteUrl('javascript:alert(1)'), false);
  check('data: mag niet', isOffsiteUrl('data:text/html,<b>hoi</b>'), false);
  // De klassieker: een controle op startsWith('/') laat dit door als "intern".
  check('protocol-relatief mag niet', isOffsiteUrl('//evil.example/'), false);
  check('een pad mag niet', isOffsiteUrl('/account/orders'), false);
  check('leeg mag niet', isOffsiteUrl(''), false);
  check('null mag niet', isOffsiteUrl(null), false);
}

/* ══ 2 · DE TUSSENPAGINA ═════════════════════════════════════════════════════ */
console.log('\nde tussenpagina');
{
  const url = 'https://g.page/r/CfzOkJ97zZCKEBM/review';
  const out = offsitePage({ url, name: 'Google', lang: 'nl', css: '/account.css' });

  check('er komt html uit', typeof out, 'string');
  // DIT is de regel die de browser laat navigeren. Valt hij weg, dan is de pagina
  // een doodlopende weg met een knop erop.
  check('meta refresh naar het doel', out.includes(`<meta http-equiv="refresh" content="0; url=${url}">`), true);
  // En DIT is de regel die het nog laat werken als de meta refresh geblokkeerd is.
  check('een echte link naar hetzelfde doel', out.includes(`href="${url}"`), true);
  check('de naam van het doel staat erin', out.includes('Google'), true);
  check('geen index in een zoekmachine', out.includes('name="robots"'), true);
  check('de stylesheet van de aanroeper', out.includes('href="/account.css"'), true);

  // CSP: default-src 'none' met style-src 'self' verbiedt script, <style> en een
  // style-attribuut. Zou er één van in staan, dan is de tussenpagina zelf de
  // volgende stille storing.
  check('geen script', /<script/i.test(out), false);
  check('geen style-blok', /<style/i.test(out), false);
  check('geen style-attribuut', /\sstyle=/i.test(out), false);

  const en = offsitePage({ url, name: 'Trustpilot', lang: 'en', css: '/portal.css' });
  check('engels', en.includes('Continue to Trustpilot'), true);
  check('nederlands', out.includes('Ga verder naar Google'), true);
  check('de stylesheet van het portaal', en.includes('href="/portal.css"'), true);
}

/* ══ 3 · EEN DOEL DAT DE TOETS NIET HAALT, LEVERT GEEN PAGINA ════════════════
   De aanroepers rekenen op null om terug te vallen op hun eigen pagina. Geeft dit
   ooit html terug voor een url die de toets niet haalde, dan is de tussenpagina
   een open redirect geworden. */
console.log('\neen doel dat de toets niet haalt');
{
  check('http', offsitePage({ url: 'http://evil.example/', name: 'x' }), null);
  check('javascript:', offsitePage({ url: 'javascript:alert(1)', name: 'x' }), null);
  check('protocol-relatief', offsitePage({ url: '//evil.example/', name: 'x' }), null);
  check('een pad', offsitePage({ url: '/account/orders', name: 'x' }), null);
  check('niets', offsitePage({ url: null, name: 'x' }), null);
}

/* ══ 4 · AANHALINGSTEKENS BREKEN HET ATTRIBUUT NIET ══════════════════════════
   new URL() codeert een " al weg, dus dit is een tweede slot op dezelfde deur. Een
   test hoort de deur te controleren en niet het slot dat er nu op zit. */
console.log('\nontsnappen');
{
  const out = offsitePage({ url: 'https://example.com/?q="><b>', name: '"><b>hoi</b>', lang: 'nl' });
  check('geen ongecodeerde > in een attribuut', /content="0; url=[^"]*">/.test(out), true);
  check('de naam wordt ontsnapt', out.includes('<b>hoi</b>'), false);
  check('en staat er ontsnapt wel in', out.includes('&lt;b&gt;hoi&lt;/b&gt;'), true);
}

/* ══ 5 · ELKE PLATFORMURL HAALT DE TOETS ═════════════════════════════════════
   Zonder deze koppeling kan iemand in data/reviews.js een http-url of een
   verkorte link zetten en dan valt de knop stil terug op de bestelpagina. */
console.log('\nde platformlijst en de toets samen');
{
  for (const p of REVIEW_PLATFORMS) {
    check(`${p.id} mag als doel`, isOffsiteUrl(p.url), true);
    check(`${p.id} levert een pagina op`, typeof offsitePage({ url: p.url, name: p.name }), 'string');
  }
}

/* ══ 6 · DE KLIK GEEFT DE NAAM MEE ═══════════════════════════════════════════
   De tussenpagina zegt "Doorsturen naar Google". Zonder de naam uit deze
   retourwaarde zou de aanroeper de url terug moeten zoeken in REVIEW_PLATFORMS —
   een tweede plek waar dezelfde lijst gelezen wordt. */
console.log('\nde naam komt uit de klik mee');
{
  const noop = { DB: { prepare: () => ({ bind: () => ({ first: async () => null, run: async () => ({}), all: async () => ({ results: [] }) }) }) } };
  const form = new Map([['fb', 'click'], ['platform', 'google']]);
  const res = await handleFeedbackPost(noop, { orderId: 1, customerId: 1, form });
  check('de url', res.redirect, REVIEW_PLATFORMS.find((p) => p.id === 'google').url);
  check('en de naam', res.redirectName, 'Google');

  const bad = new Map([['fb', 'click'], ['platform', 'myspace']]);
  const res2 = await handleFeedbackPost(noop, { orderId: 1, customerId: 1, form: bad });
  check('een onbekend platform stuurt nergens heen', res2.redirect, null);
}

/* ══ 7 · DE BRONCONTROLE ═════════════════════════════════════════════════════
 *
 * Dit is de test die de oorspronkelijke bug wél had gevangen, en de enige vorm
 * waarin dat kan: de fout zit niet in wat een functie teruggeeft maar in het
 * SOORT antwoord dat de route geeft. Een 303 naar een externe url is onder
 * form-action 'self' altijd een leeg tabblad.
 *
 * Sabotage gedaan en gemeten: `seeOther(checkout)` terugzetten in account.js maakt
 * de eerste hieronder rood, en `seeOther(res.redirect || …)` de tweede en derde.
 */
console.log('\nde broncontrole: nergens meer een 303 naar buiten');
{
  const account = codeOnly(read('src/lib/account.js'));
  const portal = codeOnly(read('src/lib/portal.js'));
  // De CSP-header staat in code en niet in commentaar, dus die twee laatste
  // controles hebben de rauwe bron niet nodig.

  // De Mollie-betaallink. Deze knop maakte een betaling aan en liet daarna
  // zichtbaar niets gebeuren.
  check('account.js stuurt de betaallink niet met een 303', /seeOther\(\s*checkout/.test(account), false);
  check('account.js gebruikt de tussenpagina voor Mollie', /offsitePage\(\{[^}]*url:\s*checkout/.test(account), true);

  // De reviewknoppen, in beide schermen.
  check('account.js stuurt res.redirect niet met een 303', /seeOther\([^)]*res\.redirect/.test(account), false);
  check('portal.js stuurt res.redirect niet met een 303', /seeOther\([^)]*res\.redirect/.test(portal), false);
  check('account.js gebruikt de tussenpagina', account.includes('offsitePage('), true);
  check('portal.js gebruikt de tussenpagina', portal.includes('offsitePage('), true);

  // En de reden dat het nodig is, staat nog in de header van de pagina's zelf. Gaat
  // form-action ooit weg, dan mag deze test omvallen zodat iemand kijkt of de
  // tussenpagina nog nodig is — hij weghalen omdat het "ook zonder werkt" op één
  // browser is precies hoe dit terugkomt.
  check('account.js houdt form-action self', account.includes("form-action 'self'"), true);
  check('portal.js houdt form-action self', portal.includes("form-action 'self'"), true);
}

console.log(`\n${pass}/${pass + fail} passed`);
if (fail) process.exit(1);
