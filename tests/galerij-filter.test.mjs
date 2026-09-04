/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE FILTERBALK VAN DE GALERIJ  ·  npm run test:galerijfilter
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Op 2 september 2026 ging GSAP eruit. Gemeten aan de build: 68 kB bibliotheek
 * (index.xgxdCp6f.js, de hele GSAP-kern) werd op /gallery en /nl/gallery gehaald
 * voor één crossfade, waardoor die twee pagina's op 128 kB JavaScript stonden
 * tegen 58 kB voor de rest van de site. De Web Animations API doet hetzelfde
 * voor nul kilobyte; zie src/scripts/galerij-filter.js. Na de omzetting: 60 kB.
 *
 * ── WAAROM DEZE TOETS ER IS, EN WAT HIJ AL GEVANGEN HEEFT ──────────────────
 *
 * De eerste versie van die omzetting was FOUT, en de fout was in de bron niet te
 * zien. Elke animatie werd in een Map bijgehouden en er bij `finished` weer
 * uitgehaald — netjes opgeruimd, dacht ik. Maar een animatie met `fill:
 * forwards` blijft zijn eindwaarde opleggen nádat hij klaar is. Een uitgefade
 * foto was op het moment van de display-omslag dus al uit de boekhouding, werd
 * niet afgebroken, en hield opacity 0 vast. Bij de volgende filterklik kwam hij
 * terug als nieuwkomer: display goed, en onzichtbaar.
 *
 * Deze toets wees het aan met één meting — `getComputedStyle(img).opacity` van
 * elke ZICHTBARE foto nadat alles tot rust is gekomen. Dat is wat een bezoeker
 * ziet; de code zag er tot twee keer toe goed uit.
 *
 * ── WAT ER GEMETEN WORDT ───────────────────────────────────────────────────
 *
 *   · elke filterpil apart: blijft er precies één soort staan, is de pil
 *     ingedrukt, en staat er niets half doorzichtig
 *   · "alles" brengt de hele rij terug
 *   · ZES SNELLE KLIKKEN. Dat was de oude GSAP-fout die `killTweensOf` niet
 *     dekte: de display-omslag was een tijdlijn-callback, overleefde de kill en
 *     vuurde te laat af tegen een filter dat niet meer gold — vijf snelle
 *     klikken maakten de rij leeg. Nu bewaakt een generatieteller dat.
 *   · en dat alles ook met prefers-reduced-motion, want dat is een tweede pad
 *     door dezelfde functie en geen variant van het eerste.
 */
import { createServer } from 'node:http';
import { readFile, existsSync } from 'node:fs';
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
await new Promise(r=>s.listen(8092,r));
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const b=await chromium.launch(existsSync(EXE)?{executablePath:EXE}:{});
let goed=0,totaal=0;
const ok=(n,w,v)=>{totaal++;const g=JSON.stringify(w)===JSON.stringify(v);if(g)goed++;console.log(`${g?' ok  ':'FAIL '} ${String(n).padEnd(56)} ${g?'':`verwacht ${JSON.stringify(v)} kreeg ${JSON.stringify(w)}`}`);};

/* Wachten tot er niets meer beweegt in plaats van op een getal. Met 37 foto's
   en 22ms stagger duurt de laatste infade tot ~1,2s; een vaste 900ms meet dan
   het midden van de beweging en niet de uitkomst. */
const stil = (p) => p.evaluate(() => {
  const imgs=[...document.querySelectorAll('.photo-grid[data-filterable] img')];
  return imgs.every(i => i.getAnimations().every(a => a.playState !== 'running'));
});
/* TWEE KEER STIL, MET EEN GAT ERTUSSEN — en dat gat is geen slordigheid.
   De overgang heeft een NAAD: de vertrekkers zijn uitgefade, de omslag staat in
   een setTimeout en de nieuwkomers bestaan nog niet. Op dat moment beweegt er
   niets, en één enkele stilte-meting stopt precies daar — midden in de
   overgang, met de helft van de foto's nog op nul. Zo ging deze proef de eerste
   keer rood op iets wat niet stuk was. */
const rust = async (p) => {
  for (let i = 0; i < 40; i++) {
    if (await stil(p)) {
      await p.waitForTimeout(350);
      if (await stil(p)) { await p.waitForTimeout(60); return; }
    }
    await p.waitForTimeout(120);
  }
  throw new Error('de galerij komt niet tot rust');
};

const staat = (p) => p.evaluate(() => {
  const imgs=[...document.querySelectorAll('.photo-grid[data-filterable] img')];
  const zicht=imgs.filter(i=>i.style.display!=='none');
  return {
    totaal: imgs.length,
    zichtbaar: zicht.length,
    tags: [...new Set(zicht.map(i=>i.dataset.tag))].sort(),
    /* de invariant: geen enkele zichtbare foto mag half doorzichtig blijven staan */
    doorzichtig: zicht.filter(i=>Number(getComputedStyle(i).opacity) < 0.99).length,
    ingedrukt: [...document.querySelectorAll('.filter-bar button[data-filter-key]')].filter(k=>k.getAttribute('aria-pressed')==='true').map(k=>k.dataset.filterKey),
  };
});

for (const [pad, rustig] of [['/gallery', false], ['/nl/gallery', false], ['/gallery', true]]) {
  console.log(`\n── ${pad}${rustig ? '  (prefers-reduced-motion)' : ''}`);
  const ctx = await b.newContext({ viewport:{width:1440,height:1200}, reducedMotion: rustig ? 'reduce' : 'no-preference' });
  const p = await ctx.newPage();
  await p.goto(`http://127.0.0.1:8092${pad}`, { waitUntil:'load' });
  await p.waitForTimeout(400);

  let st = await staat(p);
  ok('alle foto’s staan bij het openen', st.zichtbaar, st.totaal);
  const sleutels = await p.evaluate(()=>[...document.querySelectorAll('.filter-bar button[data-filter-key]')].map(k=>k.dataset.filterKey));
  ok('er zijn filterpillen', sleutels.length > 1, true);

  /* Elke pil apart, en na elke klik moet er precies één soort overblijven. */
  for (const k of sleutels.filter(k=>k!=='all')) {
    await p.click(`.filter-bar button[data-filter-key="${k}"]`);
    await rust(p);
    st = await staat(p);
    ok(`"${k}" laat alleen ${k} staan`, st.tags, [k]);
    ok(`"${k}" laat niets half doorzichtig achter`, st.doorzichtig, 0);
    ok(`"${k}" is de ingedrukte pil`, st.ingedrukt, [k]);
    ok(`"${k}" toont er minstens één`, st.zichtbaar > 0, true);
  }

  await p.click('.filter-bar button[data-filter-key="all"]');
  await rust(p);
  st = await staat(p);
  ok('"all" brengt ze allemaal terug', st.zichtbaar, st.totaal);
  ok('en geen enkele blijft doorzichtig', st.doorzichtig, 0);

  /* DE FOUT DIE GSAP'S killTweensOf NIET DEKTE: vijf snelle klikken. */
  for (const k of [...sleutels, ...sleutels].slice(0, 6)) {
    await p.click(`.filter-bar button[data-filter-key="${k}"]`);
    await p.waitForTimeout(40);
  }
  const laatste = [...sleutels, ...sleutels].slice(0, 6).pop();
  await rust(p);
  st = await staat(p);
  ok('zes snelle klikken maken de rij niet leeg', st.zichtbaar > 0, true);
  ok('en wat er staat hoort bij de laatste klik', laatste === 'all' ? st.zichtbaar === st.totaal : st.tags, laatste === 'all' ? true : [laatste]);
  ok('en niets blijft doorzichtig hangen', st.doorzichtig, 0);

  await ctx.close();
}
await b.close(); s.close();
console.log(`\n${goed}/${totaal} geslaagd`);
process.exit(goed===totaal?0:1);
