/*
 * VISUAILS — levering 72: sneller en beter te lezen, zonder dat je er iets van ziet (5 november 2026)
 *   npm run test:laden72
 *
 * In Q4 gaan de advertenties aan; elke klik landt op een landingspagina, meestal op een telefoon.
 * Gemeten met Playwright en Lighthouse (kladblok/LEVERING-72.md); dit houdt vast wat er veranderde:
 *
 *   1 · de letters krijgen zeven dagen cache, zoals de foto's (public/_headers)
 *   2 · de vergelijker en de lookkaart op /catalog vragen niet meer "100vw": een laptop laadt de
 *       versie van 1200 px in plaats van 1800 voor een vak van 558 en 300 px (gemeten)
 *   3 · wat axe vond, opgelost zonder iets te verplaatsen: geen <a role="listitem">, een <aside>
 *       binnen <main> met een rol in plaats van een tweede bijlage-oriëntatiepunt, schuifrijen met
 *       alleen beelden te bereiken met de toets (met de naam van hun kop), de hulpknop met een naam.
 *
 * Statisch, over dist/: snel, en het breekt af als de build ouder is dan de bron.
 */
import fs from 'node:fs';
import { buildStaat } from './lib/build.mjs';

let pass = 0; let fail = 0;
const ok = (naam, cond, extra = '') => { if (cond) { pass++; console.log(`  ✓ ${naam}`); } else { fail++; console.log(`  ✗ ${naam}${extra ? `  — ${extra}` : ''}`); } };
const lees = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

const staat = buildStaat(new URL('../dist/index.html', import.meta.url));
if (!staat.er || staat.oud) {
  console.error(`\n  dist/ ${staat.er ? 'is ouder dan de bron' : 'bestaat niet'}: draai eerst npm run build.`);
  process.exit(1);
}

console.log('\n1 · de letters in de cache');
{
  for (const bestand of ['public/_headers', 'dist/_headers']) {
    const h = lees(bestand);
    ok(`${bestand}: /fonts/* zeven dagen`, /^\/fonts\/\*\r?\n {2}Cache-Control: public, max-age=604800$/m.test(h));
    ok(`${bestand}: de foto's houden hun zeven dagen`, /^\/img\/\*\r?\n {2}Cache-Control: public, max-age=604800$/m.test(h));
  }
  ok('elke letter die een pagina vooraf laadt, staat onder /fonts/', [...lees('dist/index.html').matchAll(/<link rel="preload" as="font"[^>]*href="([^"]+)"/g)].every((m) => m[1].startsWith('/fonts/')));
}

console.log('\n2 · /catalog vraagt de maat die er staat');
for (const pad of ['dist/catalog/index.html', 'dist/nl/catalog/index.html']) {
  const html = lees(pad);
  const bronnen = [...html.matchAll(/<source type="image\/avif" srcset="[^"]*catalog-after[^"]*"([^>]*)>/g)].map((m) => /sizes="([^"]*)"/.exec(m[1])?.[1]);
  ok(`${pad}: de vergelijker 558 px, op een telefoon het scherm min de rand`, bronnen.includes('(min-width: 600px) 558px, calc(100vw - 42px)'), JSON.stringify(bronnen));
  ok(`${pad}: de lookkaart 300 px vanaf 700 px`, bronnen.includes('(min-width: 700px) 300px, calc(100vw - 40px)'), JSON.stringify(bronnen));
  ok(`${pad}: geen catalog-after meer met 100vw`, !bronnen.includes('100vw'));
  ok(`${pad}: de <img> heeft dezelfde sizes als zijn <source>`, [...html.matchAll(/<img[^>]*srcset="[^"]*catalog-after[^"]*"[^>]*>/g)].every((m) => /sizes="\(min-width: (600px\) 558px|700px\) 300px)/.test(m[0])));
}
{
  const cmp = lees('src/components/Compare.astro');
  ok('Compare.astro: sizes is een keuze; wie hem niet meet, houdt wat hij had', /sizes\?: string;/.test(cmp) && (cmp.match(/sizes=\{sizes\}/g) || []).length === 2);
}

console.log('\n3 · wat axe vond');
{
  const thuis = lees('dist/index.html');
  ok('voorpagina: geen <a role="listitem"> meer (een link mag die rol niet hebben)', !/<a\b[^>]*role="listitem"/.test(thuis));
  ok('voorpagina: de rijen met looks zijn een groep met een naam', (thuis.match(/class="g8-baan"[^>]*role="group" aria-label="(Lifestyle|Catalog)"/g) || []).length === 2);
  const asides = [
    ['dist/pricing/index.html', 'h-pr-som', 'region'], ['dist/custom-models/index.html', 'h-bm-kost', 'region'],
    ['dist/start/plan/index.html', 'ps-sum', 'none'], ['dist/start/plan/index.html', 'ps-af', 'none'],
    ['dist/test-sample/index.html', 'pl-signin', 'none'], ['dist/thank-you/index.html', 'ty-side', 'none'],
  ];
  for (const [pad, klasse, rol] of asides) {
    const tag = new RegExp(`<aside class="${klasse}[^"]*"[^>]*>`).exec(lees(pad))?.[0] || '';
    ok(`${pad}: <aside class="${klasse}"> blijft een aside (geen andere opmaak) met role="${rol}"`, tag.includes(`role="${rol}"`), tag);
  }
  const rijen = [
    ['dist/about/index.html', 'h-ab-band', 'ov-werk'], ['dist/lifestyle/index.html', 'h-strook', 'ls-rij'], ['dist/custom-models/index.html', 'h-bm-uit', 'bm-uit-h'],
  ];
  for (const [pad, klasse, kop] of rijen) {
    const html = lees(pad);
    const tag = new RegExp(`<(div|ul) class="${klasse}[ "][^>]*>`).exec(html)?.[0] || '';
    ok(`${pad}: .${klasse} met de toets te bereiken, met de naam van de kop`, tag.includes('tabindex="0"') && tag.includes(`aria-labelledby="${kop}"`) && html.includes(`id="${kop}"`), tag);
  }
  ok('/about: de band is geen tweede oriëntatiepunt met dezelfde naam als zijn sectie', /class="h-ab-band[^"]*"[^>]*role="group"/.test(lees('dist/about/index.html')));
  const look = lees('dist/lifestyle/flash/index.html');
  ok('een lookpagina met een paar: de schuifrij met de toets te bereiken, met de naam van de look', /<figure class="h-lk-held[^"]*is-paar[^"]*"[^>]*tabindex="0"[^>]*aria-label="Flash"/.test(look) || /<figure class="h-lk-held[^"]*is-paar[^"]*"[^>]*aria-label="Flash"[^>]*tabindex="0"/.test(look));
  const form = lees('dist/start/catalog/index.html');
  ok('het formulier: de hulpknop heeft een naam, ook als het woord op een telefoon verborgen is', /<summary class="wk-hulp-knop" aria-label="[^"]+"/.test(form));
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
process.exit(fail ? 1 : 0);
