/* ═══════════════════════════════════════════════════════════════════════════════
 * VISUAILS — DE VISUELE VANGRAIL
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   npm run visueel:ijk     — leg de huidige site vast als referentie
 *   npm run visueel         — vergelijk de site met die referentie
 *
 * ── WAAROM DIT BESTAAT — 20 augustus 2026 ────────────────────────────────────
 *
 * Op één dag zijn er drie fouten door de tests heen gekomen die geen van de
 * 1210 assertions kón zien, en die alle drie zijn gevonden doordat ik toevallig
 * naar een schermafdruk keek:
 *
 *   · het abonnementspaneel rende ZWART in plaats van limoen, omdat `.on-bright`
 *     op hetzelfde element stond als `background: var(--accent)`;
 *   · de drie plankaarten stonden op volle breedte onder elkaar zonder opmaak,
 *     omdat hun CSS in een ander bestand was achtergebleven;
 *   · een beeldblok kromp tot 2 bij 3 pixels door `margin-inline: auto` op een
 *     rasteritem.
 *
 * Alle drie hadden geldige HTML, geldige CSS, nul consolefouten en nul
 * horizontale overloop. De sweep zag ze niet. De testsuite zag ze niet. Ze zijn
 * gevonden omdat iemand keek — en dat schaalt niet naar 91 pagina's × 4 breedtes.
 *
 * ── WAT DIT WEL EN NIET IS ──────────────────────────────────────────────────
 *
 * GEEN pixelvergelijking van hele schermafdrukken. Die zijn zwaar (364 PNG's van
 * enkele honderden kilobytes), ze horen niet in een repository thuis, en ze slaan
 * alarm op een lettertype dat een halve pixel anders uitlijnt. Wat er wél in gaat
 * zijn twee vingerafdrukken per pagina per breedte, allebei klein genoeg om te
 * versiebeheren en allebei precies gericht op de fouten hierboven:
 *
 *   1 · DE VORM. Paginahoogte, en per sectie de hoogte en breedte. Een sectie die
 *       instort naar 0, een blok dat verdubbelt, een kaart die van 651 naar 0 gaat
 *       — dat is een GETAL dat verandert, en een getal kun je in een foutmelding
 *       zetten. "Sectie 3 op /plans ging van 651px naar 0px" is bruikbaar; een
 *       rood vlak in een pixeldiff is dat niet.
 *
 *   2 · DE KLEUR. De schermafdruk teruggebracht tot een raster van 12 bij 16
 *       gemiddelde kleuren. Dat is 192 getallen per beeld en het vangt precies het
 *       soort fout waar de vorm blind voor is: een paneel dat van limoen naar zwart
 *       gaat, houdt exact dezelfde afmetingen.
 *
 * Samen kosten ze ongeveer een kilobyte per pagina per breedte. De volle
 * schermafdrukken worden er wél bij weggeschreven, maar in een map die niet mee
 * gaat naar de repository — die zijn er om NAAR TE KIJKEN als er iets afwijkt, niet
 * om te vergelijken.
 *
 * ── DE DREMPEL ──────────────────────────────────────────────────────────────
 *
 * Vorm: meer dan 2% verschil in hoogte, of een sectie die er bij komt of afvalt.
 * Twee procent, want een lettertype dat net anders afbreekt verschuift een blok
 * een paar pixels en daar wil niemand een melding over.
 *
 * Kleur: gemiddeld meer dan 6 op een schaal van 255 over alle 192 vakjes, of één
 * vakje dat meer dan 60 afwijkt. Het eerste vangt een pagina die kantelt, het
 * tweede een blok dat van kleur verschiet terwijl de rest gelijk blijft — precies
 * het zwarte paneel.
 *
 * ── HET IS EEN VANGRAIL, GEEN RECHTER ───────────────────────────────────────
 *
 * Een melding betekent "hier is iets veranderd", niet "hier is iets stuk". Verander
 * je met opzet iets aan de opmaak, dan hoort de referentie opnieuw gezet te worden
 * — dat is één commando, en het staat expres NIET in `npm test`, zodat niemand hem
 * per ongeluk groen maakt door hem opnieuw te ijken.
 */

import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

/* fileURLToPath en niet .pathname — dat laatste is percent-gecodeerd en laat de
   schuine streep vóór een Windows-schijfletter staan. Deze repository is er twee
   keer in gelopen; zie tests/paths.test.mjs, die er sindsdien op controleert. */
const WORTEL = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DIST = path.join(WORTEL, 'dist');
const MAP = path.join(WORTEL, 'visual');
const IJKBESTAND = path.join(MAP, 'referentie.json');
const BEELDMAP = path.join(MAP, 'beelden');

const BREEDTES = [390, 768, 1440, 1920];
const RASTER_KOLOMMEN = 12;
const RASTER_RIJEN = 16;

const DREMPEL = {
  hoogte: 0.02,      // 2% verschil in paginahoogte
  sectie: 0.03,      // 3% verschil in sectiehoogte
  kleurGemiddeld: 6, // gemiddelde afwijking over alle vakjes, op 255
  kleurVakje: 60,    // één vakje dat er echt uit springt
};

const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml',
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2',
  '.json': 'application/json', '.ico': 'image/x-icon', '.avif': 'image/avif' };

function serveer(poort) {
  const s = http.createServer((req, res) => {
    let u = decodeURIComponent(req.url.split('?')[0]);
    let f = path.join(DIST, u);
    try { if (fs.statSync(f).isDirectory()) f = path.join(f, 'index.html'); } catch { /* geen map */ }
    if (!fs.existsSync(f) && fs.existsSync(f + '.html')) f += '.html';
    if (!fs.existsSync(f)) { res.writeHead(404); return res.end('nee'); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise((r) => s.listen(poort, '127.0.0.1', () => r(s)));
}

function allePaden() {
  const uit = [];
  (function loop(d, r = '') {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.isDirectory()) loop(path.join(d, e.name), r + '/' + e.name);
      else if (e.name === 'index.html') uit.push(r === '' ? '/' : r + '/');
    }
  })(DIST);
  return uit.sort();
}

/** Het raster van gemiddelde kleuren uit een PNG-buffer. */
function kleurraster(buf) {
  const png = PNG.sync.read(buf);
  const { width: W, height: H, data } = png;
  const uit = [];
  for (let ry = 0; ry < RASTER_RIJEN; ry++) {
    for (let rx = 0; rx < RASTER_KOLOMMEN; rx++) {
      const x0 = Math.floor((rx * W) / RASTER_KOLOMMEN), x1 = Math.floor(((rx + 1) * W) / RASTER_KOLOMMEN);
      const y0 = Math.floor((ry * H) / RASTER_RIJEN), y1 = Math.floor(((ry + 1) * H) / RASTER_RIJEN);
      let r = 0, g = 0, b = 0, n = 0;
      /* Om de vier pixels bemonsteren in plaats van alle. Bij een vakje van
         160 bij 300 is dat nog altijd twaalfduizend metingen voor één gemiddelde,
         en het scheelt het zestienvoudige aan rekentijd over 364 beelden. */
      for (let y = y0; y < y1; y += 2) {
        for (let x = x0; x < x1; x += 2) {
          const i = (W * y + x) << 2;
          r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
        }
      }
      if (!n) { uit.push(0, 0, 0); continue; }
      uit.push(Math.round(r / n), Math.round(g / n), Math.round(b / n));
    }
  }
  return uit;
}

async function vormVan(p) {
  return p.evaluate(() => {
    const secties = [...document.querySelectorAll('main > section, .site-footer, .site-header')];
    return {
      hoogte: document.body.scrollHeight,
      secties: secties.map((s) => {
        const r = s.getBoundingClientRect();
        const k = s.querySelector('h1, h2');
        return {
          naam: (k ? k.textContent : (s.getAttribute('class') || s.tagName)).trim().replace(/\s+/g, ' ').slice(0, 46),
          h: Math.round(r.height),
          b: Math.round(r.width),
        };
      }),
    };
  });
}

async function verzamel(ijken) {
  if (!fs.existsSync(DIST)) {
    console.error('dist/ ontbreekt — draai eerst `npx astro build`.\n  gezocht in: ' + DIST);
    process.exit(1);
  }
  fs.mkdirSync(MAP, { recursive: true });
  if (ijken) fs.rmSync(BEELDMAP, { recursive: true, force: true });
  fs.mkdirSync(BEELDMAP, { recursive: true });

  const paden = allePaden();
  const srv = await serveer(4402);
  const browser = await chromium.launch({
    executablePath: process.env.PW_CHROME || undefined,
  });

  /* ── EEN WERKRIJ MET ACHT WERKERS ─────────────────────────────────────────
     Achter elkaar duurde dit ruim tien minuten. Eén werker per breedte hielp,
     maar niet genoeg: de breedtes zijn ongelijk zwaar, dus drie zitten te wachten
     op de vierde. Een gedeelde rij van 364 opdrachten met acht werkers verdeelt
     het werk vanzelf en houdt elke werker bezig tot de rij leeg is.

     Acht en niet zestien: elke werker is een eigen browsercontext met een eigen
     rendervlak, en boven de acht wordt de machine de rem in plaats van de motor. */
  const nu = {};
  let teller = 0;
  const WERKERS = 8;
  const rij = [];
  for (const breedte of BREEDTES) for (const u of paden) rij.push([breedte, u]);
  let volgende = 0;

  const werker = async () => {
    let ctx = null, p = null, huidigeBreedte = null;
    /* Alles wat vanzelf beweegt uitzetten, anders is elke opname een andere dia
       van de carrousel en meldt deze vangrail elke keer iets. */
    const STIL = `*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}
        .reveal,[class*="float"],[class*="rise"]{opacity:1!important;transform:none!important}`;
    for (;;) {
      const i = volgende++;
      if (i >= rij.length) break;
      const [breedte, u] = rij[i];
      /* Alleen een nieuwe context als de breedte verandert. Bij een rij die op
         breedte gesorteerd is, is dat vier keer in plaats van 364 keer. */
      if (breedte !== huidigeBreedte) {
        if (ctx) await ctx.close();
        ctx = await browser.newContext({ viewport: { width: breedte, height: 1000 }, deviceScaleFactor: 1 });
        p = await ctx.newPage();
        huidigeBreedte = breedte;
      }
      await p.goto(`http://127.0.0.1:4402${u}`, { waitUntil: 'load' });
      await p.addStyleTag({ content: STIL });
      /* ── DE CARROUSEL OP DIA ÉÉN ZETTEN ──────────────────────────────────
         De hero wisselt vanzelf van dia, en dat is een JS-timer — de stille CSS
         hierboven raakt hem niet. Twee opnamen van dezelfde build vingen daardoor
         twee verschillende foto's, en dat waren de laatste twee valse meldingen
         die overbleven. Klikken op het eerste kaartje is precies wat de bezoeker
         ook kan: het script stopt de carrousel en toont dia 1. Geen apart
         testluikje in de sitecode, en dus ook niets dat live kan lekken. */
      const eerste = await p.$('[data-hero-tab="0"]');
      if (eerste) { await eerste.click().catch(() => {}); await p.waitForTimeout(60); }

      /* ── ELK BEELD HARD LATEN LADEN ──────────────────────────────────────
         Dit was de oorzaak van 48 valse meldingen, en het is subtiel genoeg om
         op te schrijven. De pagina's staan vol `<img loading="lazy">`, en een
         volle-paginaopname schildert die NIET als de browser ze nooit in beeld
         heeft gehad. Scrollen leek de oplossing, maar een scrollus die in één
         tik van boven naar beneden springt geeft de browser geen enkel frame om
         op te reageren: de lazy-lader ziet alleen de eindstand. Vandaar dat
         dezelfde build twee keer achter elkaar twee verschillende beelden gaf —
         de ene keer waren de foto's er, de andere keer stond er zwart.

         `loading = 'eager'` plus `decode()` haalt het uit het toeval: elk beeld
         wordt gehaald én gedecodeerd voordat er iets wordt vastgelegd. Trager,
         en dat is het waard — een vangrail die wolf roept, wordt uitgezet. */
      await p.evaluate(() => {
        document.querySelectorAll('img[loading="lazy"]').forEach((i) => { i.loading = 'eager'; });
      });
      await p.evaluate(() => Promise.race([
        Promise.all([...document.images].map((i) => (i.decode ? i.decode().catch(() => {}) : null))),
        new Promise((r) => setTimeout(r, 8000)),
      ]));

      /* En dan alsnog één keer door de pagina, met echte frames ertussen, zodat
         alles wat aan `animation-timeline: view()` hangt zijn eindstand haalt.
         De stille-CSS hierboven zet die animaties uit, maar een element dat er
         nooit langs is gekomen staat nog op zijn beginwaarde. */
      await p.evaluate(() => new Promise((r) => {
        let y = 0;
        const stap = () => {
          window.scrollTo(0, y);
          y += 900;
          if (y < document.body.scrollHeight) requestAnimationFrame(stap);
          else { window.scrollTo(0, 0); requestAnimationFrame(() => setTimeout(r, 80)); }
        };
        stap();
      }));
      await p.waitForTimeout(60);

      const buf = await p.screenshot({ fullPage: true });
      const sleutel = `${breedte}${u}`;
      nu[sleutel] = { vorm: await vormVan(p), kleur: kleurraster(buf) };

      const bestand = path.join(BEELDMAP, `${breedte}${u.replace(/\//g, '_') || '_'}.png`);
      fs.writeFileSync(bestand, buf);
      teller++;
      if (teller % 40 === 0) process.stdout.write(`  ${teller}/${rij.length}\n`);
    }
    if (ctx) await ctx.close();
  };
  await Promise.all(Array.from({ length: WERKERS }, werker));
  const browserVersie = browser.version();
  await browser.close();
  srv.close();
  return { nu, paden, teller, browserVersie };
}

function vergelijk(oud, nu) {
  const meldingen = [];
  for (const sleutel of Object.keys(nu)) {
    if (sleutel === META) continue;
    const a = oud[sleutel], b = nu[sleutel];
    if (!a) { meldingen.push({ sleutel, soort: 'nieuw', tekst: 'pagina staat niet in de referentie' }); continue; }

    // ── vorm ───────────────────────────────────────────────────────────────
    const h1 = a.vorm.hoogte, h2 = b.vorm.hoogte;
    if (h1 && Math.abs(h2 - h1) / h1 > DREMPEL.hoogte) {
      meldingen.push({ sleutel, soort: 'hoogte', tekst: `pagina ${h1}px → ${h2}px (${((h2 - h1) / h1 * 100).toFixed(1)}%)` });
    }
    if (a.vorm.secties.length !== b.vorm.secties.length) {
      meldingen.push({ sleutel, soort: 'secties', tekst: `${a.vorm.secties.length} → ${b.vorm.secties.length} secties` });
    } else {
      a.vorm.secties.forEach((s, i) => {
        const t = b.vorm.secties[i];
        if (!s.h) return;
        const verschil = Math.abs(t.h - s.h) / s.h;
        if (verschil > DREMPEL.sectie) {
          meldingen.push({ sleutel, soort: 'sectie', tekst: `"${s.naam}" ${s.h}px → ${t.h}px` });
        }
        if (s.b && !t.b) meldingen.push({ sleutel, soort: 'ingestort', tekst: `"${s.naam}" heeft geen breedte meer` });
      });
    }

    // ── kleur ──────────────────────────────────────────────────────────────
    if (a.kleur && b.kleur && a.kleur.length === b.kleur.length) {
      let som = 0, ergste = 0, ergsteVak = -1;
      for (let i = 0; i < a.kleur.length; i += 3) {
        const d = (Math.abs(a.kleur[i] - b.kleur[i]) + Math.abs(a.kleur[i + 1] - b.kleur[i + 1]) + Math.abs(a.kleur[i + 2] - b.kleur[i + 2])) / 3;
        som += d;
        if (d > ergste) { ergste = d; ergsteVak = i / 3; }
      }
      const gem = som / (a.kleur.length / 3);
      if (gem > DREMPEL.kleurGemiddeld) {
        meldingen.push({ sleutel, soort: 'kleur', tekst: `gemiddeld ${gem.toFixed(1)} afwijking over het hele beeld` });
      } else if (ergste > DREMPEL.kleurVakje) {
        const rij = Math.floor(ergsteVak / RASTER_KOLOMMEN), kol = ergsteVak % RASTER_KOLOMMEN;
        meldingen.push({ sleutel, soort: 'kleurvlek', tekst: `vak rij ${rij + 1} kolom ${kol + 1} wijkt ${ergste.toFixed(0)} af` });
      }
    }
  }
  for (const sleutel of Object.keys(oud)) {
    if (sleutel === META) continue;
    if (!nu[sleutel]) meldingen.push({ sleutel, soort: 'weg', tekst: 'pagina staat niet meer in de build' });
  }
  return meldingen;
}

// ─────────────────────────────────────────────────────────────────────────────
/* Gereserveerde sleutel in referentie.json. Geen pagina heet zo — elk pad
   begint met een breedte en een schuine streep. */
const META = '__meta';

const ijken = process.argv.includes('--ijk');

if (ijken) {
  console.log('\nVISUAILS — referentie vastleggen\n');
  const { nu, paden, teller, browserVersie } = await verzamel(true);
  nu[META] = { browser: browserVersie, gemaakt: new Date().toISOString().slice(0, 16).replace('T', ' ') };
  fs.writeFileSync(IJKBESTAND, JSON.stringify(nu));
  const kb = Math.round(fs.statSync(IJKBESTAND).size / 1024);
  console.log(`\n${teller} opnamen van ${paden.length} pagina's × ${BREEDTES.length} breedtes`);
  console.log(`referentie: visual/referentie.json (${kb} kB)`);
  console.log('beelden:    visual/beelden/ — om naar te kijken, gaat niet mee in git');
} else {
  if (!fs.existsSync(IJKBESTAND)) {
    console.error('geen referentie gevonden — draai eerst `npm run visueel:ijk`.\n  gezocht in: ' + IJKBESTAND);
    process.exit(1);
  }
  console.log('\nVISUAILS — visuele vangrail\n');
  const oud = JSON.parse(fs.readFileSync(IJKBESTAND, 'utf8'));
  const { nu, teller, browserVersie } = await verzamel(false);
  const meldingen = vergelijk(oud, nu);

  /* ── EERST DE BROWSER, DAN PAS DE PAGINA'S ───────────────────────────────
     Dit koste op 20 augustus 2026 een uur. De referentie was gemaakt met de ene
     Chromium en de vergelijking liep op een andere, en de uitkomst was 263
     meldingen die er allemaal echt uitzagen: pagina's 6 procent langer, secties
     die 490px groeiden, kleur die over het hele beeld afweek. Tachtig ervan
     kwamen van de browser en niet van de site — /privacy stond ertussen, en op
     die pagina staat geen enkel beeld.

     Een vangrail die niet kan zeggen "ik ben zelf veranderd", laat je zoeken naar
     een fout in code die in orde is. Dus staat de bouwversie nu in de referentie,
     en wordt daar als eerste naar gekeken. */
  const oudeBrowser = oud[META] && oud[META].browser;
  if (oudeBrowser && oudeBrowser !== browserVersie) {
    console.log('  ┌─ LET OP ────────────────────────────────────────────────────');
    console.log(`  │ De referentie is gemaakt met Chromium ${oudeBrowser}`);
    console.log(`  │ en deze meting draait op Chromium ${browserVersie}.`);
    console.log('  │');
    console.log('  │ Verschillen hieronder kunnen van de BROWSER komen en niet van');
    console.log('  │ de site — lettermetriek en afronding verschuiven per bouwversie.');
    console.log('  │ Draai npm run visueel:ijk op een build waarvan je zeker weet');
    console.log('  │ dat hij goed is, en vergelijk daarna pas.');
    console.log('  └─────────────────────────────────────────────────────────────\n');
  } else if (!oudeBrowser) {
    console.log('  (de referentie noteert geen browserversie — die werd nog niet');
    console.log('   bijgehouden toen hij gemaakt is. Eén keer npm run visueel:ijk');
    console.log('   lost dat op.)\n');
  }

  console.log(`\n${teller} opnamen vergeleken met de referentie\n`);
  if (!meldingen.length) {
    console.log('GEEN VERSCHILLEN');
  } else {
    const perPagina = new Map();
    for (const m of meldingen) {
      if (!perPagina.has(m.sleutel)) perPagina.set(m.sleutel, []);
      perPagina.get(m.sleutel).push(m);
    }
    for (const [sleutel, lijst] of perPagina) {
      console.log(`  ${sleutel}`);
      for (const m of lijst) console.log(`      ${m.soort.padEnd(10)} ${m.tekst}`);
    }
    console.log(`\n${meldingen.length} verschil(len) op ${perPagina.size} plek(ken).`);
    console.log('Kijk in visual/beelden/ naar de opname en beoordeel zelf.');
    console.log('Klopt het? Dan `npm run visueel:ijk` om de referentie bij te zetten.');
    process.exitCode = 1;
  }
}
