/*
 * Elke gebouwde pagina op twee breedtes vastleggen, zodat het omzetten van 1735
 * inline style-attributen naar klassen NIET op mijn oog hoeft te steunen.
 *
 * `node kladblok/schermen.mjs voor`  → kladblok/schot-voor/
 * `node kladblok/schermen.mjs na`    → kladblok/schot-na/ + het verschil per pagina
 */
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync, globSync, readFileSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';

const DIST = '/tmp/vb/dist';
const ronde = process.argv[2] === 'na' ? 'na' : 'voor';
const UIT = `/tmp/vb/kladblok/schot-${ronde}`;

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.woff': 'font/woff', '.xml': 'application/xml', '.txt': 'text/plain', '.ico': 'image/x-icon' };
const server = createServer((req, res) => {
  let f = join(DIST, decodeURIComponent(req.url.split('?')[0]));
  if (!extname(f)) f = join(f, 'index.html');
  readFile(f).then(
    (buf) => { res.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream' }); res.end(buf); },
    () => { res.writeHead(404); res.end(); }
  );
});
await new Promise((r) => server.listen(8098, r));

const paden = globSync(join(DIST, '**/index.html')).map((f) => f.slice(DIST.length).replace(/\\/g, '/').replace(/\/index\.html$/, '') || '/');
const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch(existsSync(EXE) ? { executablePath: EXE } : {});
const BREEDTES = [[1280, 'breed'], [390, 'tel']];

for (const [w, naam] of BREEDTES) {
  /* ── EEN EIGEN CONTEXT PER WERKER ─────────────────────────────────────────
     Vier pagina's deelden één context, en één keer op de honderdtachtig leverde
     dat een opname op waarin /video/motion zijn eigen kop tweemaal liet zien: de
     ClientRouter van de ene tab die in de andere iets omwisselde, en cookies die
     ze deelden. Losse opname van diezelfde pagina uit dezelfde build: nul pixels
     verschil. Een vangnet dat één keer per ronde vals alarm geeft, leert je het
     alarm te negeren — dus krijgt elke werker zijn eigen context. */
  /* Vier pagina's tegelijk. Serieel duurde de ronde ruim tien minuten en dat is
     te lang om twee keer te doen bij elke stap van de opruiming. */
  const wachtrij = [...paden];
  const werker = async () => {
   const ctx = await browser.newContext({
     viewport: { width: w, height: 900 },
     deviceScaleFactor: 1,
     reducedMotion: 'reduce',
   });
   /* ── DE ClientRouter BLIJFT BUITEN DEZE METING ────────────────────────────
      /video/motion bleef als enige heen en weer springen, en de uitsnede liet
      zien wat: zijn eigen kop twee keer in één opname — de oude en de nieuwe
      momentopname van een view-transition, allebei tegelijk in beeld. Deze
      meting gaat over waar een element staat en hoe het eruitziet, niet over hoe
      de site van pagina naar pagina wisselt; dat laatste heeft zijn eigen toets
      (tests/nav.test.mjs). Dus wordt de router hier niet geladen. */
   await ctx.route('**/ClientRouter*.js', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
   let pad;
   while ((pad = wachtrij.shift())) {
    const page = await ctx.newPage();
    /* ── DE SCHERMEN MOETEN TWEE KEER HETZELFDE ZIJN, ANDERS IS HET GEEN VANGNET ──
       Eerste meting: 27 van de 182 schermen weken af ZONDER dat er iets veranderd
       was. Drie oorzaken, alle drie tijd of toeval: een geseede volgorde
       (Math.random), animaties die op een ander punt staan, en video's die
       autoplayen. Alle drie hieronder vastgezet vóór de eerste regel van de
       pagina draait — daarna is een verschil een verschil. */
    await page.addInitScript(() => {
      let zaad = 42;
      Math.random = () => { zaad = (zaad * 1103515245 + 12345) % 2147483648; return zaad / 2147483648; };
      const vast = 1788220800000; // 1 september 2026, 12:00 UTC
      const EchteDate = Date;
      Date.now = () => vast;
      // eslint-disable-next-line no-global-assign
      Date = class extends EchteDate {
        constructor(...a) { super(...(a.length ? a : [vast])); }
        static now() { return vast; }
      };
      Object.setPrototypeOf(Date, EchteDate);
    });
    await page.goto(`http://localhost:8098${pad}`, { waitUntil: 'networkidle' }).catch(() => {});
    /* De onthulling-op-scroll zet klassen; zonder deze duw staat de halve pagina
       nog op opacity 0 en vergelijk je twee toevalligheden. */
    await page.evaluate(async () => {
      document.documentElement.classList.add('js-n');
      for (const el of document.querySelectorAll('[data-reveal],[class*="reveal"]')) el.classList.add('is-in', 'in', 'zichtbaar');
      window.scrollTo(0, document.body.scrollHeight);
      await new Promise((r) => setTimeout(r, 250));
      window.scrollTo(0, 0);
      await new Promise((r) => setTimeout(r, 250));
    }).catch(() => {});
    /* Alles stilzetten op zijn beginpunt. Een <style> mag hier: deze server stuurt
       geen CSP mee — die wordt apart gemeten in kladblok/csp-proef.mjs. */
    await page.addStyleTag({ content: `*, *::before, *::after {
      animation-play-state: paused !important;
      animation-delay: -1ms !important;
      animation-duration: 1ms !important;
      transition-duration: 0ms !important;
      transition-delay: 0ms !important;
      caret-color: transparent !important;
    }
    /* Een <video> laat per ronde een ander frame zien, ook na pause(): welk frame
       er staat hangt af van hoe ver de decoder was. De ruimte die hij inneemt is
       wat deze vergelijking meet, niet zijn inhoud. */
    video { opacity: 0 !important; }` }).catch(() => {});
    /* ── EN DE ECHTE OORZAAK: loading="lazy" ──────────────────────────────────
       Na het vastzetten van tijd en toeval weken er nog 22 schermen af, en de
       uitsnede liet zien wat: een productfoto die in de ene ronde geladen was en
       in de andere nog niet. Het scrollen hieronder zet dat in gang, maar hoe ver
       het is als de opname valt, hangt van de netwerkbeurt af. Elke afbeelding
       eager maken en dan wachten tot ze ALLEMAAL gedecodeerd zijn, haalt de
       timing uit de vergelijking. */
    await page.evaluate(async () => {
      for (const v of document.querySelectorAll('video')) { try { v.pause(); v.currentTime = 0; } catch {} }
      for (const img of document.querySelectorAll('img')) {
        img.loading = 'eager';
        img.decoding = 'sync';
      }
      await new Promise((r) => setTimeout(r, 200));
      await Promise.all([...document.images].map((i) => (i.decode ? i.decode().catch(() => {}) : null)));
      if (document.fonts) await document.fonts.ready;
    }).catch(() => {});
    await page.waitForTimeout(350);
    const naamBestand = join(UIT, `${(pad === '/' ? 'home' : pad.slice(1)).replace(/\//g, '_')}-${naam}.png`);
    await mkdir(dirname(naamBestand), { recursive: true });
    await page.screenshot({ path: naamBestand, fullPage: true }).catch(() => {});
    await page.close();
   }
   await ctx.close();
  };
  await Promise.all([werker(), werker(), werker(), werker()]);
}
await browser.close();
server.close();

if (ronde === 'na') {
  const rapport = [];
  for (const f of globSync(join(UIT, '*.png'))) {
    const naam = f.split(/[\\/]/).pop();
    const voor = join('/tmp/vb/kladblok/schot-voor', naam);
    if (!existsSync(voor)) { rapport.push([naam, 'NIEUW', 0]); continue; }
    const a = PNG.sync.read(readFileSync(voor));
    const b = PNG.sync.read(readFileSync(f));
    if (a.width !== b.width || a.height !== b.height) { rapport.push([naam, `maat ${a.width}x${a.height} → ${b.width}x${b.height}`, 999999]); continue; }
    let anders = 0;
    for (let i = 0; i < a.data.length; i += 4) {
      if (Math.abs(a.data[i] - b.data[i]) > 6 || Math.abs(a.data[i+1] - b.data[i+1]) > 6 || Math.abs(a.data[i+2] - b.data[i+2]) > 6) anders++;
    }
    /* ── DE DREMPEL, EN WAAROM HIJ ER IS ─────────────────────────────────────
       Na het vastzetten van tijd, toeval, animaties, lazy-loading en video bleef
       er één scherm over met 203 afwijkende pixels: één kolom van 1 px breed en
       200 px hoog, een randje dat op een halve pixel valt en per ronde de andere
       kant op rondt. Dat is de bodem van deze meting. 400 ligt daar net boven en
       ruim onder elk verschil dat een verschoven of verdwenen stijl oplevert —
       het kleinste ECHTE verschil dat ik in deze ronde zag, was 8281. */
    if (anders > 400) rapport.push([naam, `${anders} px`, anders]);
  }
  rapport.sort((x, y) => y[2] - x[2]);
  await writeFile('/tmp/vb/kladblok/verschil.txt', rapport.map((r) => `${r[1].padStart(14)}  ${r[0]}`).join('\n') || 'geen enkel verschil', 'utf8');
  console.log(rapport.length ? rapport.slice(0, 40).map((r) => `${String(r[1]).padStart(14)}  ${r[0]}`).join('\n') : 'geen enkel verschil');
  console.log(`\n${rapport.length} van de ${globSync(join(UIT, '*.png')).length} schermen wijken af`);
} else {
  console.log(`${globSync(join(UIT, '*.png')).length} schermen vastgelegd`);
}
