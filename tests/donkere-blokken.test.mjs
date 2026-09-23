/* VISUAILS — staat er tekst in een donker blok die je niet kunt lezen?
 *   npm run test:donker      (vereist een build: npm run build)
 * ══════════════════════════════════════════════════════════════════════════════
 * WAAROM DEZE TEST BESTAAT — 12 SEPTEMBER 2026
 * ══════════════════════════════════════════════════════════════════════════════
 * Lucas, over wat een bezoeker met een frisse blik hem vertelde: *"bij 'One link.
 * Your whole order.' gaf hij aan het dashboard in een donkere kleur te willen
 * zien omdat je dan meer onderscheid ziet in waar je naar wilt kijken, visuele
 * uitleg of tekst uitleg (links), pas dit ook toe op meerdere andere secties."*
 *
 * Dat is `.op-nacht` geworden (zie src/styles/global.css). Eén klasse die de
 * kleurROLLEN omdraait, zodat een figuur er niets voor hoeft te weten.
 *
 * ── EN PRECIES DAT IS WAT ERAAN GEVAARLIJK IS ───────────────────────────────
 *
 * Een component die zijn kleuren uit de rollen haalt, draait vanzelf mee. Een
 * component die ook maar één kleur ANDERS haalt, draait niet mee — en dan staat
 * er tekst die de bron niet verraadt. Beide gaten zaten er bij de eerste poging
 * in, en beide zijn in de browser gevonden en niet met het oog:
 *
 *   1 · ZWART OP ZWART, ratio 1,00. Zes elementen in FigDash hebben geen eigen
 *       `color` en erfden hem van een voorouder BUITEN het blok. Dat is niet
 *       "moeilijk leesbaar" — er stond niets, en dat valt bij kijken juist niet
 *       op, want je ziet geen tekst waar je geen tekst verwacht.
 *   2 · HET WOORD "REVISIE" IN DONKERBRUIN, ratio 2,37. `--flag-ink` wijst op
 *       `:root` naar `--clay-text`, en een var() binnen een declaratie lost op
 *       in de scope van die declaratie — dus met de lichte waarde. De donkere
 *       lijst verzette `--clay-text` en het veranderde niets.
 *
 * Gat 2 is het ergste, want het is precies waar de bezoeker over klaagde:
 * *"alleen duidelijk een kon approven maar niet goed kon zien of hij een revisie
 * aanvroeg."* Goedkeuren was het accent op 15:1; revisie was bruin op zwart.
 *
 * tests/leesbaar.test.mjs meet alleen KNOPPEN. Deze meet elk stuk tekst binnen
 * elk `.op-nacht`-blok op elke gebouwde pagina, tegen de grond die er
 * werkelijk achter ligt.
 */
import { existsSync, createReadStream } from 'node:fs';
import { stat, readdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join, extname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { buildStaat } from './lib/build.mjs';

let pass = 0, fail = 0;
const check = (naam, werkelijk, verwacht) => {
  const ok = JSON.stringify(werkelijk) === JSON.stringify(verwacht);
  if (ok) pass++; else fail++;
  console.log(`${ok ? ' ok  ' : 'FAIL '} ${String(naam).padEnd(56)} ${ok ? '' : `verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(werkelijk)}`}`);
};

const staat = buildStaat(new URL('../dist/index.html', import.meta.url));
if (!staat.er || staat.oud) { console.log(`geen bruikbare build — ${staat.uitleg}`); process.exit(1); }

const EXECUTABLE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.avif': 'image/avif',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
};
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    const schoon = decodeURIComponent(url.pathname).split('/').filter((p) => p && p !== '..');
    let bestand = join(DIST, ...schoon);
    let info = await stat(bestand).catch(() => null);
    if (info?.isDirectory()) { bestand = join(bestand, 'index.html'); info = await stat(bestand).catch(() => null); }
    if (!info?.isFile()) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[extname(bestand).toLowerCase()] || 'application/octet-stream' });
    createReadStream(bestand).pipe(res);
  } catch { res.writeHead(500); res.end('error'); }
});
const PORT = await new Promise((r) => server.listen(0, '127.0.0.1', () => r(server.address().port)));
const BASE = `http://127.0.0.1:${PORT}`;
const stop = () => { try { server.close(); } catch { /* al dicht */ } };
process.on('exit', stop);

async function allePaginas(map = DIST) {
  const uit = [];
  for (const item of await readdir(map, { withFileTypes: true })) {
    const pad = join(map, item.name);
    if (item.isDirectory()) uit.push(...await allePaginas(pad));
    else if (item.name === 'index.html') {
      const rel = relative(DIST, pad).split(sep).slice(0, -1).join('/');
      uit.push('/' + (rel ? rel + '/' : ''));
    }
  }
  return uit.sort();
}
const PAGINAS = await allePaginas();

console.log('\nVISUAILS — leesbaarheid in de donkere blokken\n');

const METING = `(() => {
  /* Relatieve luminantie en contrast volgens WCAG 2.1. Uitgeschreven en niet
     geïmporteerd, want dit draait in de browser en niet in node. */
  const lum = (c) => {
    const d = String(c).match(/[\\d.]+/g);
    if (!d || d.length < 3) return null;
    const [r, g, b] = d.slice(0, 3).map(Number).map((v) => {
      v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (a, b) => {
    const l1 = lum(a), l2 = lum(b);
    if (l1 === null || l2 === null) return null;
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };
  /* De grond is de eerste voorouder met een echte vulling. Een element met een
     doorzichtige achtergrond staat op wat eronder ligt, en dát is waartegen
     gelezen wordt — niet tegen 'transparent'. */
  const grond = (el) => {
    let n = el;
    while (n && n !== document.documentElement) {
      const bg = getComputedStyle(n).backgroundColor;
      if (bg && !/rgba\\(0, 0, 0, 0\\)|transparent/.test(bg)) return bg;
      n = n.parentElement;
    }
    return getComputedStyle(document.body).backgroundColor || 'rgb(255,255,255)';
  };

  const stuk = [];
  for (const blok of document.querySelectorAll('.op-nacht')) {
    for (const el of blok.querySelectorAll('*')) {
      /* Alleen elementen met EIGEN tekst: anders wordt elke wikkel meegeteld
         met de kleur van zijn kind en telt dezelfde fout tien keer. */
      const tekst = Array.from(el.childNodes)
        .filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join('').trim();
      if (!tekst) continue;
      const st = getComputedStyle(el);
      if (st.visibility === 'hidden' || st.display === 'none' || parseFloat(st.opacity) === 0) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const c = ratio(st.color, grond(el));
      if (c === null) continue;
      const px = parseFloat(st.fontSize);
      const groot = px >= 24 || (px >= 18.66 && parseInt(st.fontWeight, 10) >= 700);
      const eis = groot ? 3 : 4.5;
      if (c + 0.01 < eis) {
        stuk.push(tekst.slice(0, 30) + ' — ' + c.toFixed(2) + ':1 (' + st.color + ')');
      }
    }
  }
  return stuk;
})()`;

const browser = await chromium.launch(existsSync(EXECUTABLE) ? { executablePath: EXECUTABLE } : {});
const page = await browser.newPage({ locale: 'en-US', viewport: { width: 1440, height: 1000 } });

const stuk = [];
let blokken = 0;
for (const pad of PAGINAS) {
  await page.goto(BASE + pad, { waitUntil: 'load' });
  const n = await page.evaluate('document.querySelectorAll(".op-nacht").length');
  if (!n) continue;
  blokken += n;
  const gevonden = await page.evaluate(METING);
  for (const g of gevonden) stuk.push(`${pad} · ${g}`);
}
await browser.close();
stop();

/* Een test die nul blokken vindt is een test die niets meet. Zou `.op-nacht`
   ooit hernoemd worden, dan valt deze om in plaats van stil groen te blijven. */
check('er zijn donkere blokken om te meten', blokken > 0, true);
console.log(`   ${blokken} blok(ken) over ${PAGINAS.length} pagina's`);
check(`alle tekst in de donkere blokken is leesbaar`, stuk, []);

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exitCode = 1;
