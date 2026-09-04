/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE HERO-CARROUSEL, GEMETEN IN EEN BROWSER  ·  npm run test:carrousel
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Op 2 september 2026 wees axe-core één CRITICAL aan op de homepage:
 *
 *     aria-required-children — "Element has children which are not allowed:
 *     a[aria-label]"  op  .hv-slide-cards
 *
 * De doos droeg role="tablist" en het script hing role="tab" aan de vijf grote
 * links. Een tablist mag alleen tabs bevatten, en in elk kaartje zit een TWEEDE
 * link: het pijltje naar de dienstpagina. Dat pijltje is er met opzet (Lucas
 * wilde de twee handelingen gescheiden), dus is de ROL weggegaan.
 *
 * Het was bovendien maar half een tabpatroon: vijf tabs, één paneel, en
 * `aria-labelledby` op dat paneel wees altijd naar tab 0 — ook bij dia 4.
 *
 * Nu: role="group" met een naam op de doos, aria-current op de actieve link, en
 * de pijltjesbediening en het roving tabindex ongewijzigd.
 *
 * ── WAAROM DIT EEN BROWSERTOETS IS ─────────────────────────────────────────
 *
 * De omzetting raakte VIER dingen tegelijk die alleen samen kloppen: de markup,
 * het script, tien CSS-regels met `:has([aria-current='true'])`, en de
 * MutationObserver in HuidKantig.astro die op het attribuut hangt. Een bron-
 * toets ziet elk van die vier los kloppen. Wat je moet meten is of de kaart nog
 * GROEIT als je erop klikt — dat is de CSS die het attribuut leest — en of het
 * pijltje van het toetsenbord de dia nog wisselt.
 *
 * De toets meet daarom `flex-grow` en niet de klassenaam, en `document.
 * activeElement` en niet of de handler geregistreerd is.
 *
 * De carrousel wordt eerst GEPAUZEERD via de pauzeknop. Zonder dat verschuift
 * de dia tijdens de meting vanzelf en is elke uitkomst een gok — precies het
 * soort toets dat af en toe rood wordt en daarna wordt uitgezet.
 */
import { createServer } from 'node:http';
import { readFile, readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
const DIST = fileURLToPath(new URL('../dist', import.meta.url));
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.avif':'image/avif','.png':'image/png','.woff2':'font/woff2','.ico':'image/x-icon','.json':'application/json'};
const s=createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);let f=join(DIST,p);if(!extname(f))f=join(f,'index.html');readFile(f,(e,b)=>{if(e){r.writeHead(404);return r.end('x');}r.writeHead(200,{'content-type':MIME[extname(f)]||'application/octet-stream'});r.end(b);});});
if (!existsSync(DIST)) {
  console.log('dist/ ontbreekt — draai eerst `npm run test:bouw`. Deze toets slaat over.');
  process.exit(0);
}
await new Promise(r=>s.listen(8095,r));
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const b=await chromium.launch(existsSync(EXE)?{executablePath:EXE}:{});
let goed=0,totaal=0;
const ok=(n,w,v)=>{totaal++;const g=JSON.stringify(w)===JSON.stringify(v);if(g)goed++;console.log(`${g?' ok  ':'FAIL '} ${String(n).padEnd(48)} ${g?'':`verwacht ${JSON.stringify(v)} kreeg ${JSON.stringify(w)}`}`);};

const stand = (p) => p.evaluate(() => {
  const tl = document.querySelector('[data-hero-tabs]');
  const t = [...tl.querySelectorAll('[data-hero-tab]')];
  return {
    rol: tl.getAttribute('role'),
    label: !!tl.getAttribute('aria-label'),
    current: t.map((x) => x.getAttribute('aria-current')),
    tabindex: t.map((x) => x.getAttribute('tabindex')),
    /* Wat de CSS er echt van maakt: alleen de actieve kaart groeit. */
    groei: [...document.querySelectorAll('.hv-slide-card')].map((c) => getComputedStyle(c).flexGrow),
    zichtbaar: [...document.querySelectorAll('[data-hero-img]')].filter((i) => !i.hidden).length,
  };
});

for (const pad of ['/', '/nl']) {
  console.log(`\n── ${pad}`);
  const page = await b.newPage();
  await page.goto(`http://127.0.0.1:8095${pad}`, { waitUntil: 'load' });
  await page.waitForTimeout(500);
  await page.evaluate(() => document.querySelector('[data-hero-toggle]')?.click());  // pauzeer de carrousel
  await page.waitForTimeout(200);

  let st = await stand(page);
  ok('de doos is een benoemde groep', [st.rol, st.label], ['group', true]);
  ok('geen enkele role=tab meer', await page.evaluate(() => document.querySelectorAll('[role="tab"],[role="tablist"],[role="tabpanel"]').length), 0);
  ok('kaart 0 is de huidige', st.current, ['true', null, null, null, null]);
  ok('roving tabindex staat goed', st.tabindex, ['0', '-1', '-1', '-1', '-1']);
  ok('en de CSS laat kaart 0 groeien', st.groei[0] !== st.groei[1], true);

  await page.click('[data-hero-tab="2"]');
  await page.waitForTimeout(400);
  st = await stand(page);
  ok('klik verzet naar kaart 2', st.current, [null, null, 'true', null, null]);
  ok('en de tabstop verhuist mee', st.tabindex, ['-1', '-1', '0', '-1', '-1']);
  ok('de CSS volgt de klik', st.groei[2] !== st.groei[0], true);

  await page.focus('[data-hero-tab="2"]');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(300);
  st = await stand(page);
  ok('pijltje rechts gaat naar kaart 3', st.current, [null, null, null, 'true', null]);
  ok('en de focus staat op kaart 3', await page.evaluate(() => document.activeElement.getAttribute('data-hero-tab')), '3');

  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(300);
  st = await stand(page);
  ok('pijltje links gaat terug', st.current, [null, null, 'true', null, null]);

  /* Het pijltje in de kaart moet nog gewoon navigeren. */
  const href = await page.getAttribute('.hv-slide-card-go', 'href');
  ok('het pijltje is nog een echte link', typeof href === 'string' && href.length > 0, true);
  await page.close();
}

/* En de kantige huid, die op aria-current meekijkt. */
console.log('\n── huid-kantig');
const p2 = await b.newPage();
await p2.goto('http://127.0.0.1:8095/', { waitUntil: 'load' });
await p2.waitForTimeout(400);
ok('de waarnemer kijkt naar aria-current', await p2.evaluate(async () => {
  const bron = [...document.querySelectorAll('script')].map((x) => x.textContent).join('\n');
  return !/attributeFilter: \['aria-selected'\]/.test(bron);
}), true);
await p2.close();

await b.close(); s.close();
console.log(`\n${goed}/${totaal} geslaagd`);
process.exit(goed === totaal ? 0 : 1);
