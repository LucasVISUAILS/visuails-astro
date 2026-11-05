/*
 * VISUAILS — DE LAUNCHSET, IN BEIDE STANDEN (levering 70, 5 november 2026)
 *   node tests/launchset-70.test.mjs        (npm run test:launchset70)
 *
 * De launchset staat achter één schakelaar (LAUNCHSET in src/data/launchset.js) die
 * uit staat tot Lucas' voorbeeldbeelden klaar zijn (vraag 5 = ja). Deze toets loopt
 * beide standen na zonder twee builds: de functies nemen de stand als parameter.
 * Ligt er een proefbuild met de schakelaar aan (.astro/dist-launch, zie onderaan),
 * dan kijkt hij die ook na; anders zegt hij hoe je hem maakt.
 *
 *   uit   catalog Classic, Custom · lifestyle Dunes, Flash, Glow, Phone-made, Custom
 *         · video Motion, Lifestyle Video, Campaign, Custom (de site zoals hij was)
 *   aan   catalog Classic, Casual, Custom · lifestyle Flash, Phone-made, August,
 *         Custom · video Motion, Shift, Custom · in de maak alleen Dusk · /hooks IG Split
 *         · de adressen van Dunes, Glow, Lifestyle Video en Campaign een 302 naar het
 *         overzicht van hun dienst
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LAUNCHSET, OP_SITE, opDeSite, siteLijst, inLaunch, siteStijlen, verborgenAdressen, aantalInWoorden, vasteOpSite, vulVasteLooks,
} from '../src/data/launchset.js';
import { alleStyles, styles } from '../src/data/styles.js';
import { alleStyles as alleStylesNl } from '../src/data/styles.nl.js';
import { alleCatalogStyles, catalogStyles } from '../src/data/catalogStyles.js';
import { alleCatalogStyles as alleCatalogNl } from '../src/data/catalogStyles.nl.js';
import { alleVideoStyles, videoStyles } from '../src/data/videoStyles.js';
import { alleVideoStyles as alleVideoNl } from '../src/data/videoStyles.nl.js';
import { komendeStijlen } from '../src/data/komendeStijlen.js';
import { doorverwijzing } from '../src/middleware.js';
import { examplesFor } from '../src/data/videoExamples.js';

let goed = 0; let fout = 0;
const ok = (naam, kreeg, wil = true) => {
  const g = JSON.stringify(kreeg) === JSON.stringify(wil);
  g ? goed++ : fout++;
  console.log(` ${g ? 'ok  ' : 'FAIL'} ${String(naam).padEnd(86)}${g ? '' : ` verwacht ${JSON.stringify(wil)}, kreeg ${JSON.stringify(kreeg)}`}`);
};
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const lees = (p) => readFileSync(join(ROOT, p), 'utf8');
const slugs = (lijst, stand) => siteLijst(lijst, stand).map((s) => s.slug);

console.log('\nVISUAILS — de launchset in beide standen\n');

console.log('de schakelaar');
{
  /* Uit tot Lucas hem omzet (vraag 5 = ja). Deze toets pint de stand NIET vast: zet hij
     hem op true, dan moet de uitrol gewoon doorgaan. Hij kijkt alleen dat het één
     boolean is en dat die geldt (zonder VISUAILS_LAUNCHSET). */
  const inBestand = /const LAUNCHSET_IN_HET_BESTAND = (true|false);/.exec(lees('src/data/launchset.js'))?.[1];
  ok('de schakelaar is één boolean in src/data/launchset.js', ['true', 'false'].includes(inBestand), true);
  ok('  en geldt (tenzij VISUAILS_LAUNCHSET hem voor een proefbuild overschrijft)', process.env.VISUAILS_LAUNCHSET ? 'overgeslagen' : LAUNCHSET, process.env.VISUAILS_LAUNCHSET ? 'overgeslagen' : inBestand === 'true');
  console.log(`      (de schakelaar staat nu ${LAUNCHSET ? 'AAN' : 'uit'})`);
  ok('opSite kent alleen tot-launch en launch', [...alleStyles, ...alleCatalogStyles, ...alleVideoStyles].every((s) => !('opSite' in s) || Object.values(OP_SITE).includes(s.opSite)), true);
  ok('een stijl zonder opSite staat er in beide standen', [opDeSite({}, false), opDeSite({}, true)], [true, true]);
  ok('tot-launch: wel uit, niet aan', [opDeSite({ opSite: 'tot-launch' }, false), opDeSite({ opSite: 'tot-launch' }, true)], [true, false]);
  ok('launch: niet uit, wel aan', [opDeSite({ opSite: 'launch' }, false), opDeSite({ opSite: 'launch' }, true)], [false, true]);
}

console.log('\nwat er op de site staat, per stand (NL en EN dezelfde slugs)');
for (const stand of [false, true]) {
  const s = stand ? 'aan' : 'uit';
  const wil = stand
    ? { lifestyle: ['flash', 'phone-made', 'august', 'custom'], catalog: ['classic', 'casual', 'custom'], video: ['motion', 'shift', 'custom'] }
    : { lifestyle: ['dunes', 'flash', 'glow', 'phone-made', 'custom'], catalog: ['classic', 'custom'], video: ['motion', 'lifestyle', 'campaign', 'custom'] };
  ok(`${s}: lifestyle`, slugs(alleStyles, stand), wil.lifestyle);
  ok(`${s}: catalog`, slugs(alleCatalogStyles, stand), wil.catalog);
  ok(`${s}: video`, slugs(alleVideoStyles, stand), wil.video);
  ok(`${s}: NL heeft dezelfde slugs, in dezelfde volgorde`, [slugs(alleStylesNl, stand), slugs(alleCatalogNl, stand), slugs(alleVideoNl, stand)], [wil.lifestyle, wil.catalog, wil.video]);
  /* De lookpagina vraagt per stijl drie korte regels (tests/lookpagina.test.mjs, voor
     wat er nu staat); voor de nieuwe looks hier, in beide talen. */
  for (const lijst of [alleStyles, alleStylesNl, alleCatalogStyles, alleCatalogNl]) {
    for (const st of siteStijlen(lijst, stand).filter((x) => x.kort)) {
      const regels = Object.values(st.kort);
      if (!regels.every((r) => r.length > 8 && r.length <= 90 && !/\d/.test(r))) ok(`${s}: ${st.slug} heeft drie korte regels zonder cijfer`, regels, 'drie regels van 9 tot 90 tekens');
    }
  }
  const verborgen = verborgenAdressen({ lifestyle: alleStyles, catalog: alleCatalogStyles, video: alleVideoStyles }, stand);
  ok(`${s}: de adressen met een 302`, Object.keys(verborgen).sort(), stand
    ? ['/lifestyle/dunes', '/lifestyle/glow', '/nl/lifestyle/dunes', '/nl/lifestyle/glow', '/nl/video/campaign', '/nl/video/lifestyle', '/video/campaign', '/video/lifestyle'].sort()
    : ['/catalog/casual', '/lifestyle/august', '/nl/catalog/casual', '/nl/lifestyle/august', '/nl/video/shift', '/video/shift'].sort());
  if (stand) {
    ok('aan: /lifestyle/dunes/ gaat naar /lifestyle/', doorverwijzing('/lifestyle/dunes/', verborgen), '/lifestyle/');
    ok('aan: /nl/video/campaign gaat naar /nl/video/', doorverwijzing('/nl/video/campaign', verborgen), '/nl/video/');
    ok('aan: /lifestyle/flash blijft gewoon', doorverwijzing('/lifestyle/flash', verborgen), null);
  }
  ok(`${s}: in de maak`, komendeStijlen('lifestyle', 'nl', stand).map((k) => k.naam), stand ? ['Dusk'] : ['Studio', 'Nacht']);
  ok(`${s}: in de maak bij catalog, video en hooks`, ['catalog', 'video', 'hooks'].map((d) => komendeStijlen(d, 'en', stand).length > 0), stand ? [false, false, false] : [true, true, true]);
  ok(`${s}: het aantal vaste lifestyle-looks`, aantalInWoorden(vasteOpSite(alleStyles, stand), 'nl'), stand ? 'drie' : 'vier');
  ok(`${s}: het aantal vaste videoformaten`, aantalInWoorden(vasteOpSite(alleVideoStyles, stand), 'en'), stand ? 'two' : 'three');
}

console.log('\nbij de launch verandert Classic en Motion, verder niets');
{
  const classic = alleCatalogStyles.find((s) => s.slug === 'classic');
  const motion = alleVideoStyles.find((s) => s.slug === 'motion');
  ok('uit: Classic houdt zijn tekst', inLaunch(classic, false).tagline, classic.tagline);
  ok('aan: Classic zegt ghost mannequin en in de lens', /ghost mannequin/i.test(inLaunch(classic, true).tagline) && /lens/i.test(inLaunch(classic, true).tagline), true);
  ok('aan: Motion is één doorlopend shot met één handeling', /one shot, one action/i.test(inLaunch(motion, true).tagline), true);
  ok('  in het Nederlands ook', /één shot, één handeling/.test(inLaunch(alleVideoNl.find((s) => s.slug === 'motion'), true).tagline), true);
  ok('aan: een stijl zonder bijLaunch blijft hetzelfde object', inLaunch(alleStyles[1], true), alleStyles[1]);
  ok('inLaunch zet bijLaunch niet door naar de pagina', 'bijLaunch' in inLaunch(classic, true), false);
  ok('{vaste} wordt ingevuld met het aantal op de site', vulVasteLooks([{ slug: 'a' }, { slug: 'b', opSite: 'launch' }, { slug: 'custom', t: 'onze {vaste}' }], 'nl', false)[2].t, 'onze één');
  ok('  en in de stand aan', vulVasteLooks([{ slug: 'a' }, { slug: 'b', opSite: 'launch' }, { slug: 'custom', t: 'onze {vaste}' }], 'nl', true)[2].t, 'onze twee');
  ok('geen {vaste} blijft staan in een stijl', JSON.stringify([alleStyles, alleStylesNl, alleVideoStyles, alleVideoNl]).includes('{vaste}'), false);
}

console.log('\nde prijs volgt de dienst, niet de stijl');
{
  const casual = alleCatalogStyles.find((s) => s.slug === 'casual');
  const classic = alleCatalogStyles.find((s) => s.slug === 'classic');
  ok('Casual kost hetzelfde als Classic (dezelfde prijsregel)', [casual.priceTrust, casual.cardPrice], [classic.priceTrust, classic.cardPrice]);
  ok('Shift staat op aanvraag, zoals alle video', alleVideoStyles.find((s) => s.slug === 'shift').priceTrust, 'On request');
  ok('Shift heeft twee voorbeelden, zoals elke videostijl', examplesFor('shift').length, 2);
  ok('STYLE_PUNTEN blijft leeg (alle vaste looks wegen even zwaar)', /export const STYLE_PUNTEN = \{\s*\};/.test(lees('src/data/pricing.js')) || /STYLE_PUNTEN = Object\.freeze\(\{\s*\}\)/.test(lees('src/data/pricing.js')), true);
}

console.log('\nwie welke lijst leest');
{
  /* De site leest de site-lijst onder de oude naam; de server, Studio, /admin en de
     factuur de volledige lijst, zodat een oude bestelling in Dunes geldig blijft. */
  ok('styles.js: `styles` is de site-lijst', styles.map((s) => s.slug), slugs(alleStyles, LAUNCHSET));
  ok('catalogStyles.js en videoStyles.js idem', [catalogStyles.map((s) => s.slug), videoStyles.map((s) => s.slug)], [slugs(alleCatalogStyles, LAUNCHSET), slugs(alleVideoStyles, LAUNCHSET)]);
  ok('de server neemt elke bestaande stijl aan (de volledige lijst)', /import \{ alleStyles as STYLES \}/.test(lees('functions/api/order.js')) && /import \{ alleVideoStyles as VIDEO_STYLES \}/.test(lees('functions/api/order.js')), true);
  ok('/admin kent elke stijl bij naam', /import \{ alleStyles as ALLE_LOOKS \}/.test(lees('src/lib/admin.js')) && /alleCatalogStyles as ALLE_CATALOG_LOOKS/.test(lees('src/lib/admin.js')) && /alleVideoStyles as ALLE_VIDEO_LOOKS/.test(lees('src/lib/admin.js')), true);
  ok('een vaste look in Dunes blijft geldig (vasteLook.js)', /import \{ alleStyles as LOOKS \}/.test(lees('src/lib/vasteLook.js')), true);
  ok('Studio kiest uit de site, toont uit alles', /const VASTE_LOOKS = LOOKS_EN\.filter/.test(lees('src/lib/account.js')) && /ALLE_LOOKS_NL : ALLE_LOOKS_EN/.test(lees('src/lib/account.js')), true);
  ok('de middleware verwijst door met een 302', /status: 302/.test(lees('src/middleware.js')), true);
  ok('en niet via public/_redirects', /\/lifestyle\/(dunes|glow)\s+\/lifestyle\/?\s+30[12]/.test(lees('public/_redirects')), false);
}

/* ── DE BUILDS ─────────────────────────────────────────────────────────────── */
const pagina = (dist, p) => existsSync(join(dist, p, 'index.html'));
const htmls = (dist) => {
  const uit = [];
  const loop = (d) => { for (const n of readdirSync(d)) { const p = join(d, n); if (n === '_astro' || n === 'server' || n === 'img') continue; if (statSync(p).isDirectory()) loop(p); else if (n === 'index.html') uit.push(p); } };
  loop(dist);
  return uit;
};
const VERBORGEN_LINK = /href="(\/nl)?\/(lifestyle\/(dunes|glow)|video\/(lifestyle|campaign))\/?["?#]/;
const NIEUW_LINK = /href="(\/nl)?\/(lifestyle\/august|catalog\/casual|video\/shift)\/?["?#]/;

/* Een build nakijken in de stand waarmee hij gemaakt is. */
function controleerBuild(dist, stand) {
  const nieuw = ['catalog/casual', 'lifestyle/august', 'video/shift', 'nl/catalog/casual', 'nl/lifestyle/august', 'nl/video/shift'];
  const weg = ['lifestyle/dunes', 'lifestyle/glow', 'video/lifestyle', 'video/campaign', 'nl/lifestyle/dunes', 'nl/lifestyle/glow'];
  if (stand) {
    ok('Casual, August en Shift hebben een pagina, EN en NL', nieuw.every((p) => pagina(dist, p)), true);
    ok('Dunes, Glow, Lifestyle Video en Campaign niet', weg.some((p) => pagina(dist, p)), false);
    ok('geen pagina linkt nog naar een verborgen stijl', htmls(dist).filter((f) => VERBORGEN_LINK.test(readFileSync(f, 'utf8'))).map((f) => f.slice(dist.length)), []);
    const hooks = readFileSync(join(dist, 'hooks', 'index.html'), 'utf8');
    ok('/hooks noemt IG Split', /IG Split/.test(hooks), true);
    const ls = readFileSync(join(dist, 'nl', 'lifestyle', 'index.html'), 'utf8');
    ok('/nl/lifestyle: "in de maak" is alleen Dusk', /Dusk/.test(ls) && !/>Nacht</.test(ls), true);
    ok('/nl/lifestyle: drie sferen', /drie sferen/i.test(ls.replace(/<[^>]+>/g, ' ')), true);
  } else {
    ok('de pagina\'s van Dunes, Glow, Lifestyle Video en Campaign bestaan', weg.every((p) => pagina(dist, p)), true);
    ok('die van Casual, August en Shift niet', nieuw.some((p) => pagina(dist, p)), false);
    ok('en geen pagina linkt naar Casual, August of Shift', htmls(dist).filter((f) => NIEUW_LINK.test(readFileSync(f, 'utf8'))).map((f) => f.slice(dist.length)), []);
  }
}

console.log(`\nde build in dist/ (de schakelaar ${LAUNCHSET ? 'aan' : 'uit'})`);
{
  const dist = join(ROOT, 'dist');
  if (!existsSync(join(dist, 'index.html'))) console.log('      (overgeslagen — geen dist/)');
  else controleerBuild(dist, LAUNCHSET);
}

console.log('\nde proefbuild met de schakelaar aan (.astro/dist-launch)');
{
  const dist = join(ROOT, '.astro', 'dist-launch');
  if (LAUNCHSET) console.log('      (overgeslagen — de schakelaar staat al aan; dist/ is de aan-stand)');
  else if (!existsSync(join(dist, 'index.html'))) console.log('      (overgeslagen — maak hem met: VISUAILS_LAUNCHSET=aan npx astro build --outDir .astro/dist-launch)');
  else controleerBuild(dist, true);
}

console.log(`\n${goed}/${goed + fout} geslaagd`);
if (fout) process.exit(1);
