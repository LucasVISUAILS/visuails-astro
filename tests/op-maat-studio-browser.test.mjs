/**
 * DE INTAKE OP MAAT IN STUDIO — 15 november 2026, lijst 112.
 *
 *   npm run test:opmaat-browser
 *
 * Door de echte Worker (tests/lib/studio-worker.mjs), als ingelogde klant VOLT:
 *   1 · de uitzondering op "geen script": alleen /account/op-maat mag één bestand van onze eigen site laden;
 *   2 · catalog: een stap van de schaal zet de keuzes, de schatting rekent mee (dezelfde bedragen als
 *       src/data/opMaatPrijs.js), en zonder "wat bedoel je" kan hij niet versturen;
 *   3 · hooks en video: het idee, de vragen, de shotlijst met de camera;
 *   4 · de vorm: geen vorm met één zachte hoek, geen horizontale scroll, tekst minstens 11,5 px.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { metVisIn } from './lib/vis-in.mjs';
import { startStudio, VOLT, NOORD } from './lib/studio-worker.mjs';
import { browserPad } from '../scripts/lib/browserpad.mjs';
import { schatting } from '../src/data/opMaatPrijs.js';
import { normaliseerInhoud } from '../src/lib/opMaat.js';
import { mintToken, hashToken } from '../src/lib/token.js';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const OUT = path.join(ROOT, '.render');
fs.mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
function ok(naam, kreeg, wil = true) {
  const g = JSON.stringify(kreeg) === JSON.stringify(wil);
  if (g) pass++; else fail++;
  console.log(`${g ? ' ok  ' : ' FAIL'} ${naam}${g ? '' : `\n        verwacht ${JSON.stringify(wil)}, kreeg ${JSON.stringify(kreeg)}`}`);
}

/* Schermen 9 en 10 (lijst 112): een aanvraag met een klaargezette ronde, en een met een offerte. */
const adminToken = await mintToken();
const VB = 'maat/7007/7700/voorbeeld/r1-1-muur.webp';
const studio = await startStudio({
  extraSql: [
    `INSERT INTO admin_users (id, email, password_hash) VALUES (904, 'studio@visuails.com', 'x')`,
    `INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (904, 904, '${await hashToken(adminToken)}', '2099-01-01T00:00:00Z')`,
    `INSERT INTO maat_aanvragen (id, customer_id, dienst, stand, inhoud_json, versie, verstuurd_op) VALUES (7700, 7007, 'catalog', 'voorstel', '{"soorten":[{"soort":"jas","voorkant":{"legwijze":"hanger"}}]}', 3, datetime('now'))`,
    `INSERT INTO maat_voorbeelden (id, aanvraag_id, ronde, r2_key, bestandsnaam) VALUES (77001, 7700, 1, '${VB}', 'muur.webp')`,
    `INSERT INTO maat_aanvragen (id, customer_id, dienst, stand, inhoud_json, versie, verstuurd_op) VALUES (7701, 7007, 'lifestyle', 'offerte', '{"aantal":2}', 3, datetime('now'))`,
    `INSERT INTO maat_offertes (aanvraag_id, regels_json, totaal_cents, aanbetaling_cents, email, land, btw_behandeling, btw_tarief, verstuurd_op) VALUES (7701, '[{"naam":"Basis 2 × €110","bedrag":220},{"naam":"Je moment uitwerken","bedrag":135}]', 35500, 17800, 'inkoop@example.test', 'NL', 'nl_standard', 0.21, datetime('now'))`,
    /* 15 november 2026: een tweede offerte, voor "Iets aanpassen". */
    `INSERT INTO maat_aanvragen (id, customer_id, dienst, stand, inhoud_json, versie, verstuurd_op) VALUES (7702, 7007, 'hooks', 'offerte', '{}', 3, datetime('now'))`,
    `INSERT INTO maat_offertes (aanvraag_id, regels_json, totaal_cents, aanbetaling_cents, email, land, btw_behandeling, btw_tarief, verstuurd_op) VALUES (7702, '[{"naam":"Hook op maat","bedrag":240}]', 24000, 12000, 'inkoop@example.test', 'NL', 'nl_standard', 0.21, datetime('now'))`,
  ],
  extraR2: [[VB, 'ba2-na-achter.webp']],
});
const host = new URL(studio.url).hostname;
const browser = metVisIn(await chromium.launch({ executablePath: process.env.CHROME || browserPad() }));
const nieuw = async (breed) => {
  const ctx = await browser.newContext({ viewport: { width: breed, height: breed < 600 ? 844 : 900 } });
  await ctx.addCookies([{ name: 'vis_account', value: VOLT.token, domain: host, path: '/' }, { name: 'vis_lang', value: 'nl', domain: host, path: '/' }]);
  const p = await ctx.newPage();
  await p.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, (r) => r.abort());
  p.fouten = [];
  p.on('pageerror', (e) => p.fouten.push(e.message));
  /* Een 422 hoort erbij: versturen met wat er nog mist (zie hieronder) is precies wat de toets nadoet. */
  p.on('console', (m) => { if (m.type() === 'error' && !/status of 422|Transition was aborted/.test(m.text())) p.fouten.push(m.text());   /* een afgebroken paginaovergang is de browser, niet de site */ });
  return p;
};
const wachtOpslag = (p) => p.waitForFunction(() => /Opgeslagen/.test(document.getElementById('om-stand')?.textContent || ''), null, { timeout: 15000 });
const vorm = (p) => p.evaluate(() => {
  const zacht = [...document.querySelectorAll('.om *, .om-blok, .om-tegel')].filter((e) => {
    const c = getComputedStyle(e);
    const r = [c.borderTopLeftRadius, c.borderTopRightRadius, c.borderBottomRightRadius, c.borderBottomLeftRadius].map(parseFloat);
    return r.some((x) => x > 0) && new Set(r).size > 1 && !e.closest('.om-schat');   // een balk onderaan mag boven rond zijn
  }).map((e) => e.className.toString());
  const klein = [...document.querySelectorAll('.om *')].filter((e) => e.offsetParent && [...e.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 11.5).map((e) => e.className.toString() || e.tagName);
  return { zacht: [...new Set(zacht)].slice(0, 5), klein: [...new Set(klein)].slice(0, 5), breed: document.documentElement.scrollWidth > innerWidth + 1 };
});

try {
  console.log('\n1 · alleen hier een script, alleen van onszelf');
  {
    const csp = async (pad) => (await studio.fetch(pad, { token: VOLT.token })).headers.get('content-security-policy') || '';
    const keuze = await csp('/account/op-maat');
    const form = await csp('/account/op-maat?dienst=catalog');
    const overzicht = await csp('/account');
    ok('de keuze uit vier diensten draait zonder script', /script-src/.test(keuze), false);
    ok('het formulier mag een script van onszelf, en fetch naar onszelf', /script-src 'self';/.test(form) && /connect-src 'self'/.test(form) && !/unsafe/.test(form), true);
    ok('de rest van Studio blijft zonder script', /script-src/.test(overzicht), false);
    const html = await (await studio.fetch('/account/op-maat?dienst=catalog', { token: VOLT.token })).text();
    const scripts = [...html.matchAll(/<script\b[^>]*>/g)].map((m) => m[0]);
    ok('één script, een bestand onder /js/, niets in de pagina zelf', scripts.length === 1 && /src="\/js\/op-maat\.js"/.test(scripts[0]), true);
    ok('in de navigatie staat Op maat', /href="\/account\/op-maat"/.test(html), true);
  }

  console.log('\n2 · catalog, op 1280 breed');
  {
    const p = await nieuw(1280);
    await p.goto(`${studio.url}/account/op-maat?dienst=catalog`, { waitUntil: 'load' });
    await wachtOpslag(p);
    ok('een nieuwe aanvraag: de link wordt ?id=', /\/account\/op-maat\?id=\d+$/.test(p.url()), true);
    await p.click('.om-stap >> nth=2');
    await wachtOpslag(p);
    await p.fill('[data-rij="soorten"] [data-veld="aantal"]', '3');
    /* lijst 113: de stand per groep; de top in drie kwart (geen standaard, dus c-pose) */
    await p.click('[data-groep="top"] input[value="driekwart"]', { force: true });
    await p.waitForTimeout(700); await wachtOpslag(p);
    const zicht = await p.evaluate(() => ({ totaal: document.getElementById('om-totaal').textContent, regels: [...document.querySelectorAll('#om-regels p span:first-child')].map((s) => s.textContent), mist: [...document.querySelectorAll('#om-mist li')].map((l) => l.textContent) }));
    const verwacht = schatting('catalog', normaliseerInhoud('catalog', {
      soorten: [{ soort: 'tshirt', aantal: 3 }], standen: { top: { hoek: 'driekwart' } }, licht: { eigen: true }, camera: 'laag', omgeving: { soort: 'echte-plek' }, vasteMaten: true, grading: { eigen: true }, model: { pose: '' }, gekozen: ['c-licht', 'c-maat', 'c-grading', 'c-camera', 'c-modelpose'],
    }));
    ok('"een hele wereld" zet de keuzes van Room 84 aan', await p.evaluate(() => [...document.querySelectorAll('input[data-toggle]:checked')].map((c) => c.dataset.toggle)), ['c-licht', 'c-maat', 'c-grading', 'c-camera', 'c-modelpose']);
    ok('de schatting komt van de server, met dezelfde bedragen als opMaatPrijs.js', zicht.totaal, `€${verwacht.totaal.toLocaleString('nl-NL')}`);
    ok('met een regel per keuze, de basis voorop', zicht.regels[0], 'Basis');
    ok('zonder "wat bedoel je" kan hij niet versturen: het licht, de maten, de grading en de omgeving missen', ['eigen licht', 'vaste verhoudingen', 'eigen color grading', 'een volledige omgeving'].every((n) => zicht.mist.some((m) => m.includes(n))), true);
    ok('en de pose van het model', zicht.mist.some((m) => m.includes('vaste pose van het model')), true);
    const v = await vorm(p);
    ok('geen vorm met één zachte hoek', v.zacht, []);
    ok('geen tekst kleiner dan 11,5 px', v.klein, []);
    ok('geen horizontale scroll', v.breed, false);
    await p.screenshot({ path: path.join(OUT, 'op-maat-catalog-1280.png'), fullPage: true });
    /* versturen lukt pas als alles er staat */
    await p.click('#om-verstuur');
    await p.waitForTimeout(800);
    ok('versturen zonder alles: hij blijft op de pagina', /\?id=\d+$/.test(p.url()) && await p.evaluate(() => !document.getElementById('om-mist').hidden), true);
    for (const [pad, t] of [['toelichting.c-licht', 'Eén directe flits van dichtbij'], ['toelichting.c-maat', 'De tas korter dan een onderarm'], ['toelichting.c-grading', 'Warm wit, koel tapijt'], ['toelichting.c-camera', 'Een beetje scheef'], ['model.pose', 'Hij zit op het tapijt en ritst een laars open'], ['omgeving.tekst', 'Gebroken wit sierpleister in waaiers, een laag gespikkeld tapijt']]) await p.fill(`[data-pad="${pad}"]`, t);
    await p.click('input[name="contact"][value="mail"]', { force: true });
    await p.waitForTimeout(700); await wachtOpslag(p);
    ok('na het invullen mist er niets meer', await p.evaluate(() => [...document.querySelectorAll('#om-mist li')].map((l) => l.textContent)), []);
    await p.click('#om-verstuur');
    await p.waitForFunction(() => !document.getElementById('om-verstuur'), null, { timeout: 15000 });
    ok('verstuurd: de velden staan vast en de knop is weg', await p.evaluate(() => document.querySelector('.om-velden').disabled && !document.getElementById('om-verstuur')), true);
    ok('geen fouten in de console', p.fouten, []);
    await p.context().close();
  }

  console.log('\n3 · hooks en video, en de telefoon');
  for (const [dienst, breed] of [['hooks', 1280], ['video', 390], ['lifestyle', 390]]) {
    const p = await nieuw(breed);
    await p.goto(`${studio.url}/account/op-maat?dienst=${dienst}`, { waitUntil: 'load' });
    await wachtOpslag(p);
    if (dienst !== 'lifestyle') {
      ok(`${dienst}: de vragen staan pas open bij "bedenk het voor mij"`, await p.evaluate(() => getComputedStyle(document.querySelector('.om-als-ons')).display), 'none');
      await p.click('input[name="idee"][value="ons"]', { force: true });
      await wachtOpslag(p);
      ok(`${dienst}: nu wel`, await p.evaluate(() => getComputedStyle(document.querySelector('.om-als-ons')).display !== 'none'), true);
    }
    if (dienst === 'video') {
      await p.click('input[name="idee"][value="eigen"]', { force: true });
      await p.selectOption('[data-rij="shots"] [data-veld="beweging"]', 'crane');
      await p.click('[data-rij-erbij="shots"]');
      await p.waitForTimeout(700); await wachtOpslag(p);
      const regels = await p.evaluate(() => [...document.querySelectorAll('#om-regels p')].map((x) => x.textContent));
      ok('video: een extra shot en een crane staan in de schatting', regels.some((r) => /Extra shots/.test(r)) && regels.some((r) => /Camerabewegingen.*€40/.test(r)), true);
    }
    const v = await vorm(p);
    ok(`${dienst} op ${breed}: geen zachte hoek, geen kleine tekst, geen horizontale scroll`, [v.zacht, v.klein, v.breed], [[], [], false]);
    await p.screenshot({ path: path.join(OUT, `op-maat-${dienst}-${breed}.png`), fullPage: true });
    ok(`${dienst}: geen fouten in de console`, p.fouten, []);
    await p.context().close();
  }
  console.log('\n4 · de voorbeeldronde en de offerte (schermen 9 en 10)');
  {
    const p = await nieuw(1280);
    await p.goto(`${studio.url}/account/op-maat?id=7700`, { waitUntil: 'load' });
    await p.waitForFunction(() => { const i = document.querySelector('.om-voorbeeld img'); return i && i.complete; }, null, { timeout: 15000 });
    ok('het voorbeeld laadt, achter zijn eigen sessie', await p.evaluate(() => document.querySelector('.om-voorbeeld img').naturalWidth > 0), true);
    ok('de teller: ronde 1, nog twee gratis', await p.evaluate(() => [document.querySelectorAll('.om-teller li.is-aan').length, /Nog 2 gratis rondes/.test(document.querySelector('.om-teller-tekst').textContent)]), [1, true]);
    ok('een ander ziet het beeld niet', (await studio.fetch('/account/op-maat/beeld/77001', { token: NOORD.token })).status, 404);
    await p.click('input[data-beeld="77001"][value="aanpassen"]', { force: true });
    await p.click('#om-reactie');
    ok('aanpassen zonder wat er anders moet: hij hoort het', await p.evaluate(() => /Wat moet anders/.test(document.getElementById('om-ronde-stand').textContent)), true);
    await p.fill('#om-wel', 'De muur'); await p.fill('#om-anders', 'Het tapijt grijzer'); await p.fill('#om-blijven', 'De flits');
    await p.click('#om-reactie');
    await p.waitForFunction(() => !document.getElementById('om-ronde'), null, { timeout: 15000 });
    ok('verstuurd: de studio is weer aan zet', await p.evaluate(() => /concept/.test(document.querySelector('.om-strook')?.textContent || '')), true);
    const v = await vorm(p);
    ok('geen zachte hoek, geen kleine tekst', [v.zacht, v.klein], [[], []]);
    await p.goto(`${studio.url}/account/op-maat?id=7701`, { waitUntil: 'load' });
    ok('de offerte: de regels, het totaal, de helft met btw en de rest', await p.evaluate(() => [...document.querySelectorAll('.om-offerte .om-regels p')].map((x) => x.textContent.replace(/\s+/g, ' ').trim())),
      ['Basis 2 × €110€220', 'Je moment uitwerken€135', 'Totaal excl. btw€355', 'Nu, de helft€178', 'Btw 21% over de helft€37,38', 'Nu te betalen€215,38', 'Bij levering, excl. btw€177']);
    ok('de betaallink gaat naar het adres van de offerte', await p.evaluate(() => /inkoop@example\.test/.test(document.querySelector('.om-offerte').textContent)), true);
    await p.screenshot({ path: path.join(OUT, 'op-maat-offerte-1280.png'), fullPage: true });
    await p.click('#om-offerte-akkoord');
    ok('akkoord zonder het zakelijk-vinkje: hij hoort waarom', await p.evaluate(() => /zakelijk bestelt/.test(document.getElementById('om-offerte-stand').textContent)), true);
    await p.check('#om-zakelijk');
    await p.click('#om-offerte-akkoord');
    await p.waitForFunction(() => /Je gaf akkoord/.test(document.querySelector('.om-offerte')?.textContent || ''), null, { timeout: 15000 });
    ok('akkoord: een bestelling met een betaalknop voor de helft', await p.evaluate(() => { const a = document.querySelector('.om-offerte a[href^="/api/order-pay?ref=VIS-"]'); return a ? a.textContent.trim() : null; }), 'Betaal €215,38');
    await p.screenshot({ path: path.join(OUT, 'op-maat-offerte-akkoord-1280.png'), fullPage: true });
    await p.goto(`${studio.url}/account/op-maat?id=7702`, { waitUntil: 'load' });
    await p.click('#om-aanpassen summary');
    await p.fill('#om-aanpassing', 'Graag zonder tekst op beeld');
    await p.click('#om-offerte-aanpassen');
    await p.waitForFunction(() => /Je vroeg/.test(document.querySelector('.om-offerte')?.textContent || ''), null, { timeout: 15000 });
    ok('iets aanpassen: de klant ziet dat er een nieuwe offerte komt', await p.evaluate(() => /Graag zonder tekst op beeld/.test(document.querySelector('.om-offerte').textContent)), true);
    const v2 = await vorm(p);
    ok('de offerte: geen zachte hoek, geen kleine tekst', [v2.zacht, v2.klein], [[], []]);
    ok('geen fouten in de console', p.fouten, []);
    await p.context().close();
  }

  console.log('\n5 · /admin/op-maat');
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await ctx.addCookies([{ name: 'vis_admin', value: adminToken, domain: host, path: '/' }]);
    const p = await ctx.newPage();
    await p.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, (r) => r.abort());
    await p.goto(`${studio.url}/admin/op-maat`, { waitUntil: 'load' });
    ok('de lijst toont de aanvragen, "wij zijn aan zet" voorop', await p.evaluate(() => [document.querySelectorAll('tbody tr').length >= 2, /Wij zijn aan zet/.test(document.querySelector('tbody tr').textContent)]), [true, true]);
    ok('Op maat is een tab van Klanten: Klanten staat aan in het menu, de tab "Op maat" is de huidige', await p.evaluate(() => [
      !!document.querySelector('.adm-side a.bar-link.is-active[href="/admin/customers"]'),
      !document.querySelector('.adm-side [href="/admin/op-maat"]'),
      document.querySelector('.klant-tabs [aria-current="page"]')?.textContent,
    ]), [true, true, 'Op maat']);
    await p.goto(`${studio.url}/admin`, { waitUntil: 'load' });
    ok('Nu doen op het dashboard: "Op maat: voorbeeld" met de knop naar de aanvraag', await p.evaluate(() => {
      const r = [...document.querySelectorAll('.nd-regel[data-soort="opmaat"]')].find((x) => x.querySelector('a[href="/admin/op-maat/7700"]'));
      return r ? [r.querySelector('.nd-soort').textContent, r.querySelector('.nd-knop').textContent.trim()] : null;
    }), ['Op maat: voorbeeld', 'Voorbeeld maken']);
    await p.goto(`${studio.url}/admin/op-maat/7700`, { waitUntil: 'load' });
    ok('de aanvraag: de reactie van de klant met wat goed is, anders moet en moet blijven', await p.evaluate(() => /Goed: De muur[\s\S]*Anders: Het tapijt grijzer[\s\S]*Blijven: De flits/.test(document.body.innerText)), true);
    ok('een beeld voor ronde 2 kan erbij', await p.evaluate(() => /Een beeld voor ronde 2/.test(document.body.innerText)), true);
    ok('zonder beelden in ronde 2 kan er geen ronde naar de klant', await p.evaluate(() => /naar de klant/.test(document.body.innerText)), false);
    await p.screenshot({ path: path.join(OUT, 'op-maat-admin-1280.png'), fullPage: true });
    await p.goto(`${studio.url}/admin/op-maat/7701`, { waitUntil: 'load' });
    ok('na het akkoord: de bestelling staat erbij, en zonder mailsleutel de knop om de link opnieuw te mailen', await p.evaluate(() => [/bestelling VIS-/.test(document.body.innerText), !!document.querySelector('input[name="do"][value="link"]')]), [true, true]);
    await p.goto(`${studio.url}/admin`, { waitUntil: 'load' });
    ok('Nu doen: de gevraagde aanpassing en de betaallink die niet wegging', await p.evaluate(() => ['7702', '7701'].map((n) => {
      const r = [...document.querySelectorAll('.nd-regel[data-soort="opmaat"]')].find((x) => x.querySelector(`a[href="/admin/op-maat/${n}"]`));
      return r ? r.querySelector('.nd-knop').textContent.trim() : null;
    })), ['Offerte aanpassen', 'Betaallink sturen']);
    await p.goto(`${studio.url}/admin/op-maat/7702`, { waitUntil: 'load' });
    ok('de aanpassing van de klant staat bovenaan de offerte', await p.evaluate(() => /De klant vraagt een aanpassing[\s\S]*Graag zonder tekst op beeld/.test(document.body.innerText)), true);
    ok('het formulier: regels, mailadres, land en btw-nummer, ingevuld met de vorige offerte', await p.evaluate(() => [document.querySelector('textarea[name="regels"]').value, document.querySelector('input[name="email"]').value, document.querySelector('select[name="land"]').value]), ['Hook op maat;240', 'inkoop@example.test', 'NL']);
    await p.fill('textarea[name="regels"]', 'Hook op maat;220');
    await p.click('form:has(input[name="do"][value="offerte"]) button[type="submit"]');
    await p.waitForURL(/klaar=offerte/, { timeout: 15000 });
    ok('nieuwe offerte gemaild (hier zonder mailsleutel: dat zegt /admin ook)', await p.evaluate(() => [/€220/.test(document.body.innerText), /de mail ging niet weg/.test(document.body.innerText)]), [true, true]);
    await p.screenshot({ path: path.join(OUT, 'op-maat-admin-offerte-1280.png'), fullPage: true });
    await ctx.close();
  }
} finally {
  await browser.close();
  await studio.dispose();
}
console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
