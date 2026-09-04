/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * ELKE FOTO RESERVEERT ZIJN RUIMTE VOORDAT HIJ ER IS  ·  npm run test:beeldruimte
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Gemeten op /gallery, 390px, met CPU-rem en 1,6 Mbit: CLS 0,113 — de slechtste
 * van de site, en ruim boven de 0,1 die nog "goed" heet. Het raster groeide van
 * 4717 naar 5412 px terwijl de foto's binnenkwamen. De brede tegels stonden op
 * `height: 0px` tot hun beeld er was en sprongen dan naar 434.
 *
 * De oorzaak stond in global.css: `.photo-grid .wide { aspect-ratio: unset; }`.
 * `unset` is `initial` is `auto`, en `auto` betekent "gebruik de NATUURLIJKE
 * verhouding" — die de browser pas kent als het beeld binnen is. De verhouding
 * stond er wel degelijk op (width/height op elke <img>), maar de UA-regel die
 * die attributen gebruikt, werd door deze auteursdeclaratie overschreven. Zie de
 * volledige noot bij `.photo-grid .wide` in src/styles/global.css.
 *
 * ── WAAROM DEZE TOETS DE FOTO'S VERTRAAGT EN NIET BLOKKEERT ────────────────
 *
 * De eerste opzet brak de beeldverzoeken af. Dat meet iets anders: een beeld dat
 * FAALT heeft ook geen verhouding, dus stond alles op nul — zowel vóór als ná de
 * reparatie. Een toets die in beide gevallen hetzelfde zegt, weet niets.
 *
 * Hier houdt de server de bytes twee seconden vast. Het verzoek loopt, het beeld
 * is onderweg, en dat is precies de toestand waarin een bezoeker de pagina ziet
 * opbouwen. Wat er dan gereserveerd staat, is wat er niet meer hoeft te
 * verspringen.
 *
 * Gemeten en niet aangenomen: `img.complete === false` staat in de uitkomst,
 * zodat een toets die per ongeluk ná het laden meet, zichzelf verraadt.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs';
import { existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const DIST = fileURLToPath(new URL('../dist', import.meta.url));

let goed = 0, totaal = 0;
const ok = (naam, werkelijk, verwacht) => {
  totaal++;
  const gelijk = JSON.stringify(werkelijk) === JSON.stringify(verwacht);
  if (gelijk) goed++;
  console.log(`${gelijk ? ' ok  ' : 'FAIL '} ${String(naam).padEnd(52)} ${gelijk ? '' : `verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(werkelijk)}`}`);
};

if (!existsSync(DIST)) {
  console.log('dist/ ontbreekt — draai eerst `npm run test:bouw`. Deze toets slaat over.');
  process.exit(0);
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.json': 'application/json' };
const TRAAG = /\.(webp|avif|png|jpe?g)$/i;

const server = createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  let f = join(DIST, p);
  if (!extname(f)) f = join(f, 'index.html');
  readFile(f, (err, buf) => {
    if (err) { res.writeHead(404); return res.end('x'); }
    const stuur = () => {
      res.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream' });
      res.end(buf);
    };
    if (TRAAG.test(f)) setTimeout(stuur, 2000); else stuur();
  });
});
await new Promise((r) => server.listen(8084, r));

const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch(existsSync(EXE) ? { executablePath: EXE } : {});

/* Twee breedtes: op 390px is .wide twee van de twee kolommen, op 1440px twee van
   de vier. Een reservering die alleen op één breedte klopt, is geen reservering. */
for (const [pad, w] of [['/gallery', 390], ['/gallery', 1440], ['/nl/gallery', 390]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(`http://127.0.0.1:8084${pad}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  /* lazy eraf: een beeld dat nog niet aan de beurt is, zegt niets over
     reservering — het is er gewoon nog niet aan begonnen. */
  await page.evaluate(() => document.querySelectorAll('img[loading="lazy"]').forEach((i) => { i.loading = 'eager'; }));
  await page.waitForTimeout(500);

  const meting = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll('.photo-grid img')];
    const onderweg = imgs.filter((i) => !i.complete);
    return {
      totaal: imgs.length,
      onderweg: onderweg.length,
      zonderRuimte: onderweg.filter((i) => i.getBoundingClientRect().height < 40)
        .map((i) => `${i.className || '(smal)'} ${i.getAttribute('src').split('/').pop()}`),
      breedOnderweg: onderweg.filter((i) => i.classList.contains('wide')).length,
    };
  });

  console.log(`\n── ${pad} @${w}px — ${meting.onderweg} van ${meting.totaal} nog onderweg, waarvan ${meting.breedOnderweg} breed`);
  ok('er zijn beelden die nog onderweg zijn', meting.onderweg > 0, true);
  ok('en daar zitten brede tegels bij', meting.breedOnderweg > 0, true);
  ok('geen enkel beeld staat op nul hoogte', meting.zonderRuimte, []);

  await ctx.close();
}

await browser.close();

/* Windows: process.exit() vlak na browser.close() struikelt in libuv

   ("Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), src\\win\\async.c")

   omdat de pipes van Chromium nog aan het sluiten zijn. Eén tik wachten

   laat ze dichtgaan; de uitslag verandert er niet door — 4 sept 2026. */

await new Promise((r) => setTimeout(r, 300));
server.close();
console.log(`\n${goed}/${totaal} geslaagd`);
process.exit(goed === totaal ? 0 : 1);
