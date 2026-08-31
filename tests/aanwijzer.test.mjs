/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE AANWIJZER MOET OVERAL TE ZIEN ZIJN
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * De eigen muisaanwijzer op de homepage (HuidKantig.astro) heeft twee lagen: een
 * die de grond omkeert met `mix-blend-mode: difference`, en een vlakke die een
 * vaste kleur draagt. Welke van de twee je ziet, beslist opAccent().
 *
 * ── DE FOUT DIE DEZE TOETS VASTLEGT ─────────────────────────────────────────
 *
 * opAccent() keek eerst naar de TEKSTKLEUR van het element onder de muis. Boven
 * limetekst gaf hij dus true, en dan schildert `oplime` de pijl in --accent-ink,
 * bijna zwart. Op een limevlak klopt dat; op limetekst is de grond de donkere
 * pagina en was de pijl zwart op zwart. Lucas, 28 augustus: *"Wanneer je groene
 * tekst aanraakt of in de buurt komt wordt de gehele muis gelijk donker waardoor
 * hij moeilijk te zien is."*
 *
 * ── WAAROM DIT IN EEN ECHTE BROWSER MOET ────────────────────────────────────
 *
 * De hele beslissing bestaat uit getComputedStyle() over een keten van ouders.
 * Dat is precies het soort ding dat je niet kunt nabouwen in een toets: een
 * regex op de bron bewijst dat de regel wég is, niet dat het gedrag klopt. Dus
 * draait dit tegen de GEBOUWDE pagina, met echte muisgebeurtenissen.
 *
 * ── WAT ER BEWEZEN WORDT ────────────────────────────────────────────────────
 *
 *   · boven limetekst op een donkere grond blijft de omgekeerde laag liggen;
 *   · boven een echt limeVLAK komt de vlakke, donkere pijl — daar is zwart de
 *     leesbare keuze;
 *   · en de bron draagt de tekstkleurcontrole niet meer, zodat een herstel van
 *     die ene regel niet stilletjes terug kan sluipen.
 */
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat, readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { browserPad } from '../scripts/lib/browserpad.mjs';
import { buildStaat } from './lib/build.mjs';

let goed = 0; let totaal = 0;
function ok(naam, kreeg, verwacht = true) {
  totaal += 1;
  const isGoed = JSON.stringify(kreeg) === JSON.stringify(verwacht);
  if (isGoed) goed += 1;
  console.log(` ${isGoed ? 'ok  ' : 'FAIL'} ${String(naam).padEnd(58)}${isGoed ? '' : ` verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(kreeg)}`}`);
}

const DIST = fileURLToPath(new URL('../dist', import.meta.url));

/* ── EERST: IS DIE dist/ NOG VAN DEZE BRON? ────────────────────────────────
   Deze suite serveert dist/ aan een echte browser en meet wat de aanwijzer
   doet. Op een oude build meet hij dus de aanwijzer van gisteren, en meldt
   die uitkomst als de huidige. `npm test` bouwt sinds 30 augustus 2026 zelf,
   dus dit gaat over de losse run (`npm run test:aanwijzer`). Overslaan met een
   regel erbij, want de andere uitkomst — rood over een script dat al vervangen
   is — kost een middag zoeken in een bron waar niets mis mee is. */
const bouw = buildStaat(new URL('../dist/index.html', import.meta.url));
if (!bouw.er || bouw.oud) {
  console.log(` --   niet gecontroleerd: ${bouw.uitleg}`);
  process.exit(0);
}
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.avif': 'image/avif',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2',
};
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const schoon = decodeURIComponent(url.pathname).split('/').filter((p) => p && p !== '..');
  let bestand = join(DIST, ...schoon);
  let info = await stat(bestand).catch(() => null);
  if (info?.isDirectory()) { bestand = join(bestand, 'index.html'); info = await stat(bestand).catch(() => null); }
  if (!info?.isFile()) { res.writeHead(404); res.end('x'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(bestand).toLowerCase()] || 'application/octet-stream' });
  createReadStream(bestand).pipe(res);
});
const PORT = await new Promise((r) => server.listen(0, '127.0.0.1', () => r(server.address().port)));

const browser = await chromium.launch({ executablePath: process.env.CHROME || browserPad() });
/* Een ECHTE muis: de aanwijzer zet zichzelf uit op `(hover: none)` of een grove
   aanwijzer, en dan bewijst deze toets niets. */
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, hasTouch: false });
await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => document.documentElement.classList.contains('aw-aan'), null, { timeout: 5000 })
  .catch(() => { console.log(' !!   de aanwijzer startte niet — draait deze browser zonder fijne muis?'); });

/* De pagina zoeken naar wat er echt op staat, en niet naar een klasse die ik
   verzin: het eerste element met limetekst op een donkere grond, en het eerste
   dat zelf een dekkend limevlak IS. */
const doelen = await page.evaluate(() => {
  const acc = [198, 241, 0];
  const dicht = (v, marge = 44) => {
    const m = String(v).match(/[\d.]+/g);
    if (!m) return false;
    const a = m[3] !== undefined ? parseFloat(m[3]) : 1;
    return a >= 0.5 && Math.abs(+m[0] - acc[0]) < marge && Math.abs(+m[1] - acc[1]) < marge && Math.abs(+m[2] - acc[2]) < marge;
  };
  const zichtbaar = (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 6 && r.height > 6;
  };
  let tekst = null; let vlak = null;
  for (const el of document.body.querySelectorAll('*')) {
    if (!zichtbaar(el)) continue;
    const st = getComputedStyle(el);
    if (!vlak && dicht(st.backgroundColor)) vlak = el;
    if (!tekst && dicht(st.color) && !dicht(st.backgroundColor)) {
      // alleen als de grond eronder NIET lime is — dat is het gemelde geval
      let g = el; let limeGrond = false;
      for (let i = 0; g && i < 12; g = g.parentElement, i += 1) {
        const bg = getComputedStyle(g).backgroundColor;
        const m = String(bg).match(/[\d.]+/g);
        if (m && (m[3] === undefined || parseFloat(m[3]) > 0.5)) { limeGrond = dicht(bg); break; }
      }
      if (!limeGrond && el.textContent.trim()) tekst = el;
    }
    if (tekst && vlak) break;
  }
  const merk = (el, naam) => { if (el) el.setAttribute('data-aw-doel', naam); return Boolean(el); };
  return { tekst: merk(tekst, 'tekst'), vlak: merk(vlak, 'vlak') };
});

console.log('\nde pagina draagt allebei de gevallen');
ok('er staat limetekst op een donkere grond', doelen.tekst);
ok('en er staat een dekkend limevlak', doelen.vlak);

/* EEN GESTUURDE `mouseover` EN NIET page.hover(). Twee van de gevallen die deze
   toets moet raken zitten in een vaste balk die buiten het beeld staat tot je
   scrolt, en dan wacht Playwright dertig seconden op geometrie die er niet komt.
   Wat hier bewezen moet worden is de BESLISSING van opAccent(), en die hangt aan
   het doel van de gebeurtenis en niet aan de plek van de muis. De luisteraar zit
   op `document`, dus een bubbelende mouseover komt precies zo binnen als een
   echte. */
/* EERST DE MUIS WAKKER MAKEN. Beide lagen staan op `opacity: 0` tot er één
   mousemove is geweest — de klasse `wakker`. Zonder die stap meet deze toets
   twee onzichtbare lagen en komt hij tot de vrolijke conclusie dat de pijl niet
   zwart is, om de verkeerde reden. Precies dat gebeurde bij de eerste versie
   hiervan, en het is de reden dat de meting nu naar de DEKKING kijkt en niet
   alleen naar de klassen. */
await page.mouse.move(700, 400);
await page.waitForFunction(() => document.getElementById('aw2').classList.contains('wakker'), null, { timeout: 3000 });

const klassen = async (sel) => {
  await page.evaluate((s) => {
    const el = document.querySelector(s);
    el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
  }, sel);
  /* WACHTEN OP DE OVERGANG, MET DE DUUR DIE HET BLAD ZELF NOEMT.
   *
   * Twee versies hiervan waren fout en allebei op een leerzame manier. Een vaste
   * 60ms mat de vlakke laag halverwege zijn overgang en las dat als "niet
   * zichtbaar" — waarna de kleurcontrole slaagde zonder iets te bewijzen. En
   * "wachten tot twee metingen gelijk zijn" was erger: op het moment van de
   * eerste twee metingen was de overgang nog niet BEGONNEN, dus stond hij stil
   * op de oude waarde en heette dat rustig.
   *
   * Dus: de duur uit de berekende stijl halen en er ruim overheen gaan. Staat
   * die .2s ooit ergens anders, dan schuift deze wachttijd vanzelf mee — een
   * getal dat hier hardgecodeerd staat, is een toets die stil verkeerd meet
   * zodra iemand de animatie verlengt. */
  const wachtMs = await page.evaluate(() => {
    const d = getComputedStyle(document.getElementById('aw2')).transitionDuration || '0s';
    const secs = d.split(',').map((v) => parseFloat(v) || 0);
    return Math.max(120, Math.max(...secs) * 1000 * 2 + 80);
  });
  await page.waitForTimeout(wachtMs);
  return page.evaluate(() => {
    const om = document.getElementById('aw');
    const plat = document.getElementById('aw2');
    /* WELKE KLEUR DE BEZOEKER ECHT ZIET. De twee lagen wisselen met hun
       dekking, dus alleen de laag die bovenligt telt. Ligt de omgekeerde laag
       boven, dan is de kleur per definitie het tegendeel van de grond en dus
       nooit onzichtbaar; ligt de vlakke boven, dan is zijn `fill` het antwoord. */
    const platAan = parseFloat(getComputedStyle(plat).opacity) > 0.5;
    return {
      om: om.className,
      plat: plat.className,
      kleur: platAan ? getComputedStyle(plat.querySelector('svg')).fill : 'omgekeerd',
      /* De vulling van de omgekeerde laag telt sinds 30 augustus 2026 mee: hij
         bepaalt wat `difference` eruit rekent, en dus welke twee kleuren de pijl
         op een knoprand aanneemt. */
      omVulling: getComputedStyle(om.querySelector('svg')).fill,
      omMenging: getComputedStyle(om).mixBlendMode,
      /* De grond waar de pijl op ligt. Nodig om uit te rekenen wat `difference`
         ervan maakt — zie zichtbaar() in de toets. */
      grond: (() => {
        /* ── DOOR EEN CANVAS, EN OM DEZELFDE REDEN ALS DE PRODUCTIECODE ──────
         * `.btn-primary` staat op `color-mix(in srgb, var(--accent) 90%, …)`, en
         * Chrome berekent dat niet naar `rgb(198, 241, 0)` maar naar
         * `color(srgb 0.776471 0.945098 0 / 0.9)`. Een regex over de getallen
         * leest dan 0,78 waar hij 198 verwacht, en dan komt er uit deze toets een
         * limekleur waar zwart hoort te staan. Precies de val die opAccent() in
         * HuidKantig.astro op 28 augustus opving; hij geldt hier net zo goed.
         *
         * Eén pixel tekenen en teruglezen geeft ALTIJD 0-255 sRGB, welke
         * schrijfwijze er ook in ging. */
        const doek = document.createElement('canvas');
        doek.width = 1; doek.height = 1;
        const pen = doek.getContext('2d', { willReadFrequently: true });
        const lees = (v) => {
          try {
            pen.fillStyle = 'rgba(0,0,0,0)';
            pen.fillStyle = v;
            pen.globalCompositeOperation = 'copy';
            pen.fillRect(0, 0, 1, 1);
            const d = pen.getImageData(0, 0, 1, 1).data;
            return [d[0], d[1], d[2], d[3] / 255];
          } catch { return null; }
        };
        const d = document.querySelector('[data-aw-doel]');
        for (let i = 0, el = d; el && i < 12; el = el.parentElement, i += 1) {
          const c = lees(getComputedStyle(el).backgroundColor);
          if (c && c[3] > 0.5) return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
        }
        return 'rgb(3, 4, 6)';
      })(),
    };
  });
};

/* Bijna zwart. --accent-ink is #08090B; alles daaromheen is op een donkere
   pagina even onzichtbaar, dus de marge is ruim. */
const bijnaZwart = (v) => {
  if (v === 'omgekeerd') return false;
  const m = String(v).match(/[\d.]+/g);
  return Boolean(m) && +m[0] < 60 && +m[1] < 60 && +m[2] < 60;
};

/* ── WAT DE BEZOEKER ECHT ZIET — 30 augustus 2026 ────────────────────────────
 *
 * Ligt de vlakke laag boven, dan is zijn `fill` het antwoord en is dit een
 * doorgeefluik. Ligt de OMGEKEERDE laag boven, dan is er geen kleur om af te
 * lezen: `mix-blend-mode: difference` maakt er |grond − vulling| van, per pixel,
 * en dat staat in geen enkele berekende stijl.
 *
 * Die som hier naschrijven is geen nabootsing van de browser maar precies de
 * definitie van difference uit de compositing-specificatie. Wat de toets daarmee
 * bewijst is wat er op het scherm gebeurt, en niet welke klasse er toevallig
 * staat — en dat is nodig, want de hele fix van vandaag gaat erover dat één
 * klasse twee verschillende kleuren moet kunnen opleveren. */
const rgb = (v) => (String(v).match(/[\d.]+/g) || []).slice(0, 3).map(Number);
const zichtbaar = (k, grond) => {
  if (k.kleur !== 'omgekeerd') return k.kleur;
  const [gr, gg, gb] = rgb(grond);
  const [vr, vg, vb] = rgb(k.omVulling);
  if ([gr, gg, gb, vr, vg, vb].some((n) => !Number.isFinite(n))) return 'onbekend';
  return `rgb(${Math.abs(gr - vr)}, ${Math.abs(gg - vg)}, ${Math.abs(gb - vb)})`;
};
const PAGINA = 'rgb(3, 4, 6)';

if (doelen.tekst) {
  console.log('\nboven limetekst blijft de omgekeerde laag liggen');
  const k = await klassen('[data-aw-doel="tekst"]');
  ok('de vlakke laag staat niet op "oplime"', /oplime/.test(k.plat), false);
  /* En dat is de eis waar het echt om gaat. Limetekst zit vaak IN een link, en
     dan komt de vlakke laag wel degelijk boven — maar gevuld met het accent, en
     lime op een donkere pagina zie je prima. Wat niet mag is bijna zwart. */
  ok(`de pijl is niet bijna zwart (${k.kleur})`, bijnaZwart(k.kleur), false);
}

if (doelen.vlak) {
  console.log('\nboven een limevlak loopt de pijl over van kleur');
  const k = await klassen('[data-aw-doel="vlak"]');
  /* ── OMGEZET OP 30 AUGUSTUS 2026 ─────────────────────────────────────────
   *
   * Hier stond: op een limevlak zakt de omgekeerde laag weg en komt de vlakke
   * op, bijna zwart. Dat was leesbaar zolang de HELE pijl op de knop lag, en
   * precies dat is op een knoprand niet zo — de staart hangt op de donkere
   * pagina en verdween daar. Lucas: *"bij groene onderdelen gelijk zwart
   * waardoor hij lastig zichtbaar is."*
   *
   * Eén vlakke kleur kan die twee ondergronden niet allebei bedienen. Wat er nu
   * staat is de omgekeerde laag met een LIME vulling: `difference` rekent per
   * pixel |grond − lime| uit, en dat is zwart op de knop en lime op de pagina,
   * met het omslagpunt exact op de rand.
   *
   * Deze drie regels leggen dat vast in de volgorde waarin het stukgaat: de
   * menging moet difference zijn, de vulling moet het accent zijn, en de vlakke
   * laag mag NIET bovenkomen — want dan is er weer één kleur. */
  ok('de omgekeerde laag blijft liggen', /\bvast\b/.test(k.om), false);
  ok('en hij draagt de limevulling', /oplime/.test(k.om));
  ok(`de menging is difference (${k.omMenging})`, k.omMenging, 'difference');
  ok(`en de vulling is het accent (${k.omVulling})`, /198.*241.*\b0\b/.test(k.omVulling));
  /* En daarmee is de zichtbare kleur per pixel het tegendeel van de grond —
     nooit onzichtbaar, op geen van beide ondergronden. */
  ok('de pijl heeft dus geen vaste kleur meer', k.kleur, 'omgekeerd');
}

/* ── DE LIMEKNOP APART, EN NIET ALLEEN "EEN LIMEVLAK" ───────────────────────
 *
 * De zoeker hierboven pakt het EERSTE dekkende limevlak op de pagina, en dat kan
 * van alles zijn. Precies het geval dat stukging heeft een eigen naam: sinds
 * .btn-primary op color-mix() staat, berekent Chrome zijn achtergrond als
 * `color(srgb …)` en herkende de oude regex hem niet meer. Lucas zag daardoor
 * een lime pijl op een lime knop. Dus wordt die knop hier bij naam gecontroleerd.
 */
console.log('\nop een lime knop is de pijl donker en niet lime');
{
  const heeft = await page.evaluate(() => {
    const el = [...document.querySelectorAll('.btn-primary')].find((e) => e.getBoundingClientRect().width > 8);
    if (el) el.setAttribute('data-aw-doel', 'knop');
    return Boolean(el);
  });
  ok('er staat een .btn-primary op de pagina', heeft);
  if (heeft) {
    const k = await klassen('[data-aw-doel="knop"]');
    /* ── TWEE EISEN EN NIET ÉÉN — 30 augustus 2026 ───────────────────────
       Hier stond alleen dat de pijl donker moest zijn op de knop. Dat was waar
       en het was de helft: de andere helft van de pijl hangt op een knoprand op
       de donkere pagina, en dáár was hij ook donker en dus weg. Sinds vandaag
       telt allebei. */
    ok(`op de knop is de pijl donker (${zichtbaar(k, k.grond)})`, bijnaZwart(zichtbaar(k, k.grond)));
    ok(`en op de pagina ernaast juist niet (${zichtbaar(k, PAGINA)})`, bijnaZwart(zichtbaar(k, PAGINA)), false);
  }
}

/* ── EN DE RAND VAN DE KNOP ─────────────────────────────────────────────────
 *
 * Eén vlakke kleur klopt alleen als de pijl helemaal op één ondergrond ligt. Op
 * de rand van een limeknop hangt de punt op de lime en de staart op de donkere
 * pagina, en dan valt één van de twee helften weg — welke kleur je ook kiest.
 * De haarlijn in de tegenkleur lost dat op. Deze controle staat er zodat die
 * lijn niet wegbezuinigd wordt bij het volgende opruimen van dit stijlblad.
 */
console.log('\nde vlakke pijl draagt een randje in de tegenkleur');
{
  const rand = await page.evaluate(() => {
    const svg = document.querySelector('#aw2 svg path');
    const st = getComputedStyle(svg);
    return { stroke: st.stroke, breedte: parseFloat(st.strokeWidth) || 0, volgorde: st.paintOrder };
  });
  ok(`er is een lijn en hij is niet nul (${rand.breedte})`, rand.breedte > 0);
  ok('en hij wordt onder de vulling geschilderd', /stroke/.test(rand.volgorde));
  /* De vulling is op dit moment donker (we staan op de knop), dus de lijn hoort
     licht te zijn. Zijn ze allebei donker, dan doet de lijn niets. */
  ok(`de lijn is de tegenkleur van de vulling (${rand.stroke})`, bijnaZwart(rand.stroke), false);
}

console.log('\nde tekstkleurcontrole komt niet terug');
{
  /* Alleen het LICHAAM van opAccent, en niet het hele bestand: er staat elders
     een volkomen terechte getComputedStyle(...).color, namelijk de meting die
     de accentkleur zelf uitleest. Een controle over het hele bestand zou die
     ten onrechte afkeuren — en dat deed hij ook, meteen. */
  const bron = await readFile(new URL('../src/components/HuidKantig.astro', import.meta.url), 'utf8');
  const start = bron.indexOf('const opAccent = (t) => {');
  ok('opAccent staat er nog', start > -1);
  const lichaam = bron.slice(start, bron.indexOf('};', start));
  ok('opAccent leest geen tekstkleur meer',
    /getComputedStyle\([^)]*\)\.color/.test(lichaam), false);
  ok('en kijkt wel naar de achtergrond', /backgroundColor/.test(lichaam));
}

/* ── EN OP DE REST VAN DE SITE ──────────────────────────────────────────────
 *
 * De huid stond tot 28 augustus alleen op / en /nl; sinds vandaag draagt elke
 * pagina hem, en dus ook deze aanwijzer. De regel is overal dezelfde code, maar
 * de VLAKKEN verschillen per pagina: de voettekst is één groot limevlak, /plans
 * heeft een limekaart, en het bestelformulier heeft lime knoppen midden in een
 * donker formulier. Eén pagina controleren bewijst de logica; deze lus bewijst
 * dat er nergens een oppervlak staat waar hij alsnog verdwijnt.
 */
console.log('\nde aanwijzer blijft zichtbaar op de rest van de site');
for (const pad of ['/pricing/', '/plans/', '/start/catalog/', '/contact/', '/nl/']) {
  await page.goto(`http://127.0.0.1:${PORT}${pad}`, { waitUntil: 'load' });
  await page.mouse.move(700, 400);
  await page.waitForFunction(() => document.getElementById('aw2')?.classList.contains('wakker'), null, { timeout: 3000 })
    .catch(() => {});
  const heeft = await page.evaluate(() => {
    const el = [...document.querySelectorAll('.btn-primary')].find((e) => e.getBoundingClientRect().width > 8);
    if (el) el.setAttribute('data-aw-doel', 'knop');
    return Boolean(el);
  });
  if (!heeft) { console.log(`  --   ${pad} heeft geen .btn-primary`); continue; }
  const k = await klassen('[data-aw-doel="knop"]');
  ok(`${pad} — donker op de knop (${zichtbaar(k, k.grond)})`, bijnaZwart(zichtbaar(k, k.grond)));
  ok(`${pad} — en licht op de pagina ernaast`, bijnaZwart(zichtbaar(k, PAGINA)), false);
}

await browser.close();
server.close();
console.log(`\n${goed}/${totaal} geslaagd`);
process.exit(goed === totaal ? 0 : 1);
