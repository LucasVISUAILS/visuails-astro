/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * NADEN — waar de pagina een rechte lijn laat zien die er niet hoort te zijn
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas, 22 augustus 2026, met vier schermafdrukken: *"De randen zijn nog steeds
 * veel te hard en niet volledig in de website geïntegreerd en zijn er sommige
 * spotlights op de website die harde randen van secties laten zien, dit moet
 * allemaal veel meer weggestopt zijn en smooth eruit zien."*
 *
 * ── WAAROM DIT EEN METING IS EN GEEN OOGCONTROLE ───────────────────────────
 *
 * Een naad is een van de weinige opmaakfouten die je op een schermafdruk WEL
 * ziet en in de stijlbladen NIET terugvindt: hij ontstaat uit de optelsom van
 * een grond, een sluier, een foto en een vervaging die elk apart kloppen. Ik heb
 * er in deze ronde al drie op het oog gerepareerd en er telkens één gemist, want
 * een verschil van twaalf grijswaarden zie je pas als je weet waar je kijkt —
 * maar over 1920 pixels kaarsrecht is het het eerste wat een bezoeker ziet.
 *
 * ── WAT EEN NAAD ONDERSCHEIDT VAN EEN VERLOOP ──────────────────────────────
 *
 * Allebei zijn het overgangen; het verschil zit in de SNELHEID en de RECHTHEID.
 *
 *   · Een verloop verdeelt zijn verschil over honderden rijen: het verschil
 *     tussen twee opeenvolgende rijen is dan een fractie van een grijswaarde.
 *   · Een naad stopt zijn hele verschil in één of twee rijen.
 *   · Ruis en textuur springen ook per rij, maar in WILLEKEURIGE richting: de
 *     ene pixel omhoog, de buurman omlaag.
 *
 * Dus wordt er op drie dingen tegelijk getoetst, en alleen alle drie samen is
 * een naad: het verschil tussen twee buurrijen is groot genoeg (>= DREMPEL),
 * het heeft over minstens DEKKING van de breedte HETZELFDE TEKEN, en het is
 * geen tekst (die wordt weggehaald voor de meting).
 *
 * Tekst weghalen is niet optioneel. Een regel tekst geeft per definitie een
 * scherpe overgang naar de regel erboven, over de hele tekstbreedte, met
 * hetzelfde teken. Zonder die stap bestaat de uitslag uit niets anders.
 *
 * ── GEBRUIK ────────────────────────────────────────────────────────────────
 *
 *   node naden.mjs                  alle pagina's, 390 en 1920
 *   node naden.mjs / /studio/       alleen deze
 *   B=1920 node naden.mjs /         alleen deze breedte
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { readdirSync } from 'node:fs';
import { browserPad } from './scripts/lib/browserpad.mjs';

/* WORTEL — welke bouw wordt gemeten. Standaard `dist`, maar met
   `WORTEL=dist-verify npm run naden` kun je een oudere bouw meten en zo
   vaststellen of een uitslag een REGRESSIE is of altijd al zo was. Dat is
   23 augustus 2026 precies één keer de doorslag geweest: 682 meldingen zagen
   er alarmerend uit tot dezelfde meting op de bouw van 2 augustus er op drie
   pagina's 81 gaf tegen 36 nu. */
const WORTEL = process.env.WORTEL || 'dist';
const MIME = { '.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.webp':'image/webp','.avif':'image/avif','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2','.ico':'image/x-icon','.mp4':'video/mp4' };
const srv = createServer(async (req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); let f = join(WORTEL, p);
  try { if ((await stat(f)).isDirectory()) f = join(f, 'index.html'); } catch { if (!extname(f)) f = join(WORTEL, p, 'index.html'); }
  try { const b = await readFile(f); res.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream' }); res.end(b); }
  catch { res.writeHead(404); res.end('nee'); }
});
const P = Number(process.env.POORT || 4471);
await new Promise((r) => srv.listen(P, '127.0.0.1', r));

const BREEDTES = (process.env.B || '390,1920').split(',').map(Number);
/* Een verschil van 2 grijswaarden tussen twee buurrijen is op een bijna zwarte
   pagina al zichtbaar; onder de 1,6 zie je niets meer. */
const DREMPEL = 1.6;
/* Een SECTIENAAD loopt van rand tot rand. Een kaartrand, een streep onder een
   kop of de bovenkant van een foto in een raster houdt op bij de container en
   haalt die dekking nooit. 0,9 laat dus precies over waar het hier over gaat:
   lijnen die dwars over het hele scherm lopen. */
const DEKKING = 0.90;

let paden = process.argv.slice(2);
if (!paden.length) {
  paden = [];
  (function loop(d, rel) {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.isDirectory()) loop(join(d, e.name), `${rel}/${e.name}`);
      else if (e.name === 'index.html') paden.push(`${rel}/` || '/');
    }
  })(WORTEL, '');
  paden = paden.map((p) => (p === '/' ? '/' : p)).sort();
}

/* Tekst weg, en alles wat vast op het scherm ligt ook: een balk die meescrolt
   staat op elke opname op dezelfde plek en levert dus op elke opname dezelfde
   "naad" op de rand van die balk. */
/* ── EN DE ONTHULLINGEN AF — 23 augustus 2026 ─────────────────────────────
   Een element met .reveal.pending staat halverwege een overgang: verschoven,
   half doorzichtig, of allebei. Een opname daarvan meet een MOMENT en geen
   opmaak, en dat gaf zeven verticale meldingen op /lifestyle waar de pagina
   zelf geen enkele elementgrens op die kolom kende — de DOM-navraag gaf
   letterlijk "(niets)". Alles in zijn eindstand zetten is de enige manier om te
   meten wat een bezoeker uiteindelijk ziet in plaats van wat hij onderweg
   passeert. Daarom staan animatie, overgang en de doorloopstanden hieronder uit. */
const KAAL = `*{color:transparent!important;text-shadow:none!important;-webkit-text-fill-color:transparent!important;text-decoration-color:transparent!important;caret-color:transparent!important}
.cc,.convbar,.wa-launcher,header.site-header,.pl-total-bar{display:none!important}
*{scrollbar-width:none!important}::-webkit-scrollbar{display:none!important}
*,*::before,*::after{animation:none!important;transition:none!important}
.reveal,.reveal-group,.pending{opacity:1!important;transform:none!important;clip-path:none!important;filter:none!important}`;

const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

const gem2 = (v) => v;
function zoekNaden(data, W, H, kanalen) {
  const rij = new Float32Array(W);
  const gevonden = [];
  /* horizontale naden: rij y tegen rij y+1 */
  for (let y = 2; y < H - 3; y++) {
    let som = 0, plus = 0, min = 0;
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * kanalen, j = ((y + 1) * W + x) * kanalen;
      const d = lum(data[j], data[j + 1], data[j + 2]) - lum(data[i], data[i + 1], data[i + 2]);
      rij[x] = d; som += Math.abs(d);
      if (d >= DREMPEL) plus++; else if (d <= -DREMPEL) min++;
    }
    const deel = Math.max(plus, min) / W;
    if (deel >= DEKKING) {
      /* ── EEN LIJN IS GEEN NAAD ──────────────────────────────────────────
         De site zet met opzet een haarlijn tussen twee opeenvolgende banden
         (`.band + .band` in global.css). Die geeft per definitie twee scherpe
         overgangen: omhoog de lijn in en omlaag er weer uit. Dat is opmaak en
         geen fout, en zolang de meting hem meldt is de uitslag niet te lezen.
         Het verschil is objectief: na een LIJN staat het niveau weer waar het
         stond, na een NAAD niet. Dus wordt vier rijen boven en vier rijen onder
         gemeten; blijven die binnen twee grijswaarden van elkaar, dan is het een
         lijn en telt hij niet mee. */
      const niveau = (yy) => { let t = 0; for (let x = 0; x < W; x++) { const i = (yy * W + x) * kanalen; t += lum(data[i], data[i + 1], data[i + 2]); } return t / W; };
      const stap = y >= 5 && y < H - 6 ? Math.abs(niveau(y + 5) - niveau(y - 4)) : 99;
      if (stap >= 2) gevonden.push({ richting: 'horizontaal', op: y, sprong: +gem2(som / W).toFixed(2), stap: +stap.toFixed(2), deel: +deel.toFixed(2) });
    }
  }
  /* verticale naden: kolom x tegen kolom x+1 */
  for (let x = 2; x < W - 3; x++) {
    let som = 0, plus = 0, min = 0;
    for (let y = 0; y < H; y++) {
      const i = (y * W + x) * kanalen, j = (y * W + x + 1) * kanalen;
      const d = lum(data[j], data[j + 1], data[j + 2]) - lum(data[i], data[i + 1], data[i + 2]);
      som += Math.abs(d);
      if (d >= DREMPEL) plus++; else if (d <= -DREMPEL) min++;
    }
    const deel = Math.max(plus, min) / H;
    if (deel >= DEKKING) {
      /* Zelfde toets als bij een rij: een LIJN keert terug naar zijn niveau,
         een NAAD niet. Zonder dit had elke verticale treffer `stap 0` en stond
         een kolomrand van één pixel bovenaan de uitslag naast een echte naad. */
      const kolom = (xx) => { let t = 0; for (let y = 0; y < H; y++) { const i = (y * W + xx) * kanalen; t += lum(data[i], data[i + 1], data[i + 2]); } return t / H; };
      const stap = x >= 5 && x < W - 6 ? Math.abs(kolom(x + 5) - kolom(x - 4)) : 99;
      if (stap >= 2) gevonden.push({ richting: 'verticaal', op: x, sprong: +(som / H).toFixed(2), stap: +stap.toFixed(2), deel: +deel.toFixed(2) });
    }
  }
  /* naast elkaar liggende rijen zijn één naad */
  const samen = [];
  for (const g of gevonden.sort((a, b) => a.richting.localeCompare(b.richting) || a.op - b.op)) {
    const vorig = samen[samen.length - 1];
    if (vorig && vorig.richting === g.richting && g.op - vorig.tot <= 2) {
      vorig.tot = g.op; vorig.sprong = Math.max(vorig.sprong, g.sprong); vorig.deel = Math.max(vorig.deel, g.deel); vorig.stap = Math.max(vorig.stap || 0, g.stap || 0);
    } else samen.push({ ...g, tot: g.op });
  }
  return samen;
}

const br = await chromium.launch({ executablePath: browserPad() });
const alles = [];
let opnamen = 0;

for (const breedte of BREEDTES) {
  const ctx = await br.newContext({ viewport: { width: breedte, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  await ctx.addStyleTag ? null : null;
  const page = await ctx.newPage();
  await page.addStyleTag ? null : null;
  for (const pad of paden) {
    await page.goto(`http://127.0.0.1:${P}${pad}`, { waitUntil: 'load' });
    await page.addStyleTag({ content: KAAL });
    await page.waitForTimeout(700);
    const hoogte = await page.evaluate(() => document.documentElement.scrollHeight);
    /* Venster voor venster en niet één lange opname: een volledige-paginaopname
       verschuift svh-eenheden en schildert vaste lagen op de verkeerde plek.
       Dezelfde reden als in leesbaar.mjs. */
    for (let y = 0; y < hoogte; y += 900) {
      await page.evaluate((v) => window.scrollTo(0, v), y);
      await page.waitForTimeout(260);
      const buf = await page.screenshot({ type: 'png' });
      const { createCanvas, loadImage } = { createCanvas: null, loadImage: null };
      opnamen++;
      const sharp = (await import('sharp')).default;
      const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
      const rauw = zoekNaden(data, info.width, info.height, info.channels);
      if (!rauw.length) continue;
      /* WAT LIGT DAAR? Een naad zonder verklaring is niet te repareren, en de
         helft van de treffers is een rand die er hoort te zijn (de bovenkant
         van een foto, een kaartrand die toevallig de volle breedte haalt).
         Daarom vraagt de meting de pagina zelf wat er op die hoogte begint of
         eindigt. */
      /* ── EN OF DAT ELEMENT ZIJN EIGEN GROND SCHILDERT ────────────────────
         Dat is het verschil tussen een naad en een rand, en het is objectief
         te meten in plaats van te raden aan een klassenaam. Een tegel, een
         kaart, een foto en een paneel hebben een EIGEN vlak: hun rand hoort er
         te zijn en is de bedoeling van het ontwerp. Een naad is het
         tegenovergestelde — een stap op een plek waar niemand iets schildert,
         dus waar twee stukken van dezelfde grond niet op elkaar aansluiten.
         Vandaar: schildert er iets op die rij, dan is het een RAND; schildert
         er niets, dan is het een NAAD. */
      const uitleg = await page.evaluate((lijst) => lijst.map((n) => {
        const treffers = []; let schildert = false, beeld = false;
        for (const el of document.querySelectorAll('body *')) {
          const r = el.getBoundingClientRect();
          if (r.width < 40 || r.height < 4) continue;
          for (const [kant, v] of n.richting === 'horizontaal'
            ? [['boven', r.top], ['onder', r.bottom]]
            : [['links', r.left], ['rechts', r.right]]) {
            if (Math.abs(v - n.op) <= 2.5) {
              treffers.push(`${el.tagName.toLowerCase()}${el.className ? '.' + String(el.className).trim().split(/\s+/).slice(0, 2).join('.') : ''}:${kant}`);
              const tag = el.tagName.toLowerCase();
              if (['img', 'picture', 'video', 'canvas', 'svg'].includes(tag)) { beeld = true; schildert = true; continue; }
              const st = getComputedStyle(el);
              const kleur = st.backgroundColor;
              const dekkend = kleur && kleur !== 'transparent' && !/rgba\(\s*0,\s*0,\s*0,\s*0\s*\)/.test(kleur);
              const rand = n.richting === 'horizontaal'
                ? (kant === 'boven' ? parseFloat(st.borderTopWidth) : parseFloat(st.borderBottomWidth))
                : (kant === 'links' ? parseFloat(st.borderLeftWidth) : parseFloat(st.borderRightWidth));
              if (dekkend || st.backgroundImage !== 'none' || rand > 0 || st.boxShadow !== 'none') schildert = true;
              /* Een element dat nog aan het onthullen is, staat halverwege een
                 overgang: die rand is een moment en geen opmaak. */
              if (el.classList.contains('pending') && !el.classList.contains('in')) schildert = true;
            }
          }
        }
        /* ── EN WAT ERBINNEN LIGT TELT OOK ────────────────────────────────
           Een rand hoeft niet op een elementgrens te vallen om er te horen. De
           vergelijkingsschuif (.cmp) tekent een limoen deellijn MIDDEN in zijn
           eigen vak: kaarsrecht, over de volle hoogte, met een echte
           kleurstap — en er ligt geen enkele elementgrens op die kolom, dus de
           navraag hierboven gaf "(niets)" en de lijn kwam als naad binnen.

           Dat is de laatste zeven meldingen van 23 augustus 2026 geweest, en het
           wijst op een scherpere regel dan alleen naar grenzen kijken: ligt de
           rij of de kolom BINNEN iets dat zijn eigen grond schildert, dan is het
           per definitie de inhoud van dat vlak en niet een naad tussen twee
           stukken pagina. Body en main schilderen niets, en de secties sinds
           vandaag ook niet, dus deze toets vangt precies de goede dingen: een
           foto, een tegel, een paneel, een schuif. */
        if (!schildert) {
          for (const el of document.querySelectorAll('img, picture, video, canvas, .cmp, .vis, .tile, .lime-panel, .lime-plate, .card, .photo-band')) {
            const r = el.getBoundingClientRect();
            if (r.width < 40 || r.height < 40) continue;
            const binnen = n.richting === 'horizontaal'
              ? (n.op > r.top + 2 && n.op < r.bottom - 2)
              : (n.op > r.left + 2 && n.op < r.right - 2);
            if (binnen) { schildert = true; treffers.push(`in ${el.tagName.toLowerCase()}${el.className ? '.' + String(el.className).trim().split(/\s+/).slice(0, 2).join('.') : ''}`); break; }
          }
        }
        return { wat: [...new Set(treffers)].slice(0, 4).join(' '), schildert, beeld };
      }), rauw);
      rauw.forEach((n, i) => alles.push({ pad, breedte, scroll: y, ...n,
        wat: uitleg[i]?.wat || '(niets)', schildert: !!uitleg[i]?.schildert, beeld: !!uitleg[i]?.beeld }));
    }
  }
  await ctx.close();
}
await br.close();
srv.close();

/* ── EEN FOTORAND IS GEEN NAAD, EN OP 390px ZIJN HET ER HONDERDEN ─────────
   23 augustus 2026. De uitslag op 390px bestond voor negentig procent uit
   randen van foto's: op een telefoon vult elke foto de volle breedte, dus haalt
   zijn eigen bovenrand moeiteloos de dekkingseis van 90 procent, met een stap
   van honderd grijswaarden erbij. Dat is geen fout — dat IS de foto — maar het
   maakte de lijst onleesbaar en dus onbruikbaar: 682 meldingen waarin de drie
   die ertoe deden niet meer te vinden waren.

   Gecontroleerd dat het geen regressie was voordat er een filter kwam: dezelfde
   meting op de bouw van 2 augustus gaf op drie pagina's 81 meldingen tegen 36
   nu. De metingen zijn dus altijd al zo geweest en de site is er beter aan toe,
   niet slechter.

   De scheiding gebruikt wat de meting toch al ophaalt: de pagina vertelt welk
   element op die rij begint of eindigt. Ligt daar een <img>, een <picture> of
   een van de beeldhouders, dan is het een BEELDRAND en gaat hij naar de tweede
   lijst. Die lijst blijft staan — een foto die op de verkeerde plek eindigt is
   nog steeds het bekijken waard — maar hij bepaalt de uitslag niet meer. */
const naden  = alles.filter((n) => !n.schildert);
const randen = alles.filter((n) => n.schildert);

const toon = (lijst, kop, max) => {
  console.log(kop);
  lijst.sort((a, b) => (b.stap || 0) - (a.stap || 0));
  for (const n of lijst.slice(0, max)) {
    /* Ook bij een verticale naad hoort de scrolpositie erbij: zonder die
       staat er een kolom zonder plek, en dan is hij niet terug te vinden. */
    const waar = n.richting === 'horizontaal' ? `y=${n.op + n.scroll}` : `x=${n.op} @${n.scroll}`;
    console.log(`  stap ${String((n.stap || 0).toFixed(1)).padStart(5)}  ${n.richting[0]} ${waar.padEnd(10)} ${String(n.breedte).padStart(4)}px  ${n.pad.padEnd(22)} ${n.wat}`);
  }
  if (lijst.length > max) console.log(`  … en nog ${lijst.length - max}`);
};

console.log(`\nNADEN — ${paden.length} pagina('s) × ${BREEDTES.join('/')} px, ${opnamen} opnamen\n`);
if (randen.length) toon(randen, `EIGEN RANDEN (${randen.length}) — daar schildert een foto, tegel of paneel zijn eigen vlak; die rand hoort er te zijn:`, 12);
if (!naden.length) { console.log('\nGEEN NADEN\n'); process.exit(0); }
toon(naden, `\nNADEN (${naden.length}):`, 60);
console.log(`\n${naden.length} naad(en).\n`);
process.exit(1);
