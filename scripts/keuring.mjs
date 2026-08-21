/* ═══════════════════════════════════════════════════════════════════════════════
 * VISUAILS — DE KEURING
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   npm run keuring          — loop de hele build na en meld wat er mis is
 *   npm run keuring -- --json  — schrijf de meting naar visual/beeldmaten.json
 *                                (die `npm run krimpen` daarna leest)
 *
 * ── WAT DIT IS, EN WAT HET NIET IS ──────────────────────────────────────────
 *
 * De visuele vangrail (scripts/visueel.mjs) ziet VERANDERING: hij vergelijkt de
 * site met zichzelf van gisteren en meldt wat er verschoven is. Dat is precies
 * wat je wilt bij een verbouwing, en precies wat je NIET hebt aan een fout die
 * er al stond toen de referentie gemaakt werd. Een knop van 18 bij 18 pixels op
 * een telefoon is al maanden even groot; de vangrail zwijgt erover tot in
 * lengte van dagen.
 *
 * Deze keuring kijkt daarom niet naar gisteren maar naar REGELS. Elke controle
 * hieronder heeft een objectieve grens — een getal, een attribuut, een
 * bestaand of niet-bestaand pad — zodat er geen smaak in de uitkomst zit en een
 * melding altijd iets is om op te lossen en niet om over te discussiëren.
 *
 * ── WAT ER GEKEURD WORDT, EN WAAROM DIE GRENS ───────────────────────────────
 *
 *   overloop      Een element dat breder is dan het venster. Op een telefoon
 *                 levert dat een pagina op die zijwaarts schuift, en dat is de
 *                 meest gemelde en minst opgemerkte fout op mobiel: je ziet hem
 *                 alleen als je toevallig veegt. Grens: scrollWidth meer dan 2px
 *                 boven de vensterbreedte (2 en niet 0, want subpixels).
 *
 *   raakvlak      Een link of knop kleiner dan 24 bij 24 CSS-pixels. Dat is de
 *                 ondergrens van WCAG 2.2 (2.5.8, niveau AA) en niet een eigen
 *                 voorkeur. Alleen op 390px gemeten, want daar wordt getikt.
 *
 *   afgekapt      Tekst die breder is dan zijn vak terwijl dat vak verbergt.
 *                 Grens: scrollWidth meer dan 4px boven clientWidth op een
 *                 element met overflow hidden/clip én eigen tekst.
 *
 *   kop           Meer of minder dan één <h1>, of een sprong in de
 *                 koppenvolgorde (h2 → h4). Een schermlezer bouwt daar zijn
 *                 inhoudsopgave mee op; een sprong is een ontbrekend hoofdstuk.
 *
 *   alt           Een <img> zonder alt-ATTRIBUUT. Let op: alt="" is goed en
 *                 wordt niet gemeld — dat is de manier om te zeggen "dit is
 *                 versiering". Alleen het volledig ontbreken is een fout.
 *
 *   taal          Een pagina onder /nl/ die niet lang="nl" is, of andersom.
 *                 Hierop hangt de uitspraak van een schermlezer en het oordeel
 *                 van een zoekmachine over welke versie hij waar toont.
 *
 *   link          Een interne verwijzing naar een pad dat niet in dist staat.
 *                 Wordt tegen de BUILD gecontroleerd en niet opgehaald, dus het
 *                 is exact en het kost geen enkel verzoek.
 *
 *   console       Een fout in de console of een niet-afgevangen uitzondering.
 *
 *   beeld         Een bestand dat véél groter wordt aangeleverd dan het
 *                 getoond wordt. Grens: natuurlijke breedte meer dan 2,5 keer
 *                 de getoonde breedte — dus ruim voorbij wat een scherm met
 *                 dubbele pixeldichtheid nog gebruikt. Dit is de enige controle
 *                 die niet "fout" maar "verspilling" meldt, en hij staat er
 *                 omdat het de grootste post is die je niet ziet.
 *
 * ── DE VOORBEREIDING IS DIE VAN DE VANGRAIL ─────────────────────────────────
 *
 * Zelfde stille CSS, zelfde harde beeldlading, zelfde scrollronde. Twee
 * metingen van dezelfde build moeten hetzelfde opleveren, anders is een melding
 * geen melding maar een muntworp. De redenen staan uitgeschreven in
 * scripts/visueel.mjs; ze zijn hier niet anders.
 */

import { chromium } from 'playwright';
import { browserPad } from './lib/browserpad.mjs';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

/* fileURLToPath en niet .pathname — zie tests/paths.test.mjs. */
const WORTEL = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DIST = path.join(WORTEL, 'dist');

const BREEDTES = [390, 768, 1440, 1920];
const WERKERS = 6;
const ALS_JSON = process.argv.includes('--json');

const TYPES = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.webp': 'image/webp', '.avif': 'image/avif', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.json': 'application/json', '.png': 'image/png',
  '.ico': 'image/x-icon', '.mp4': 'video/mp4', '.txt': 'text/plain',
  '.xml': 'application/xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
};

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

/* ── ROUTES DIE GEEN BESTAND ZIJN ───────────────────────────────────────────
   /account, /admin, /o/<token> en /api/* staan niet in dist en horen daar ook
   niet: dat zijn Cloudflare Pages Functions (zie de map functions/). De eerste
   versie van deze keuring meldde ze 184 keer als kapotte link, wat het verslag
   onbruikbaar maakte en precies de reden is dat een controle die te veel roept
   wordt uitgezet.

   De lijst wordt uit de MAP functions/ afgeleid en niet met de hand bijgehouden,
   want een handgeschreven lijst is de volgende die achterloopt. Een bestand
   `functions/account/[[path]].js` betekent: alles onder /account/ wordt
   afgehandeld. */
function functieRoutes() {
  const wortel = path.join(WORTEL, 'functions');
  const uit = [];
  if (!fs.existsSync(wortel)) return uit;
  (function loop(d, r = '') {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.isDirectory()) { loop(path.join(d, e.name), r + '/' + e.name); continue; }
      if (!/\.(js|ts|mjs)$/.test(e.name)) continue;
      const basis = e.name.replace(/\.(js|ts|mjs)$/, '');
      if (/^\[\[.*\]\]$/.test(basis)) uit.push({ pad: r + '/', diep: true });
      else if (basis === 'index') uit.push({ pad: r + '/', diep: false });
      else uit.push({ pad: r + '/' + basis, diep: /^\[.*\]$/.test(basis) });
    }
  })(wortel);
  return uit;
}
const ROUTES = functieRoutes();
function doorFunctie(pad) {
  const p = pad.endsWith('/') ? pad : pad + '/';
  return ROUTES.some((r) => (r.diep ? p.startsWith(r.pad) : p === r.pad || p === r.pad + '/'));
}

/* Bestaat dit interne pad in de build? Alleen de padcomponent telt; een anker
   of een queryreeks is geen ander bestand. */
const padCache = new Map();
function padBestaat(href) {
  const schoon = href.split('#')[0].split('?')[0];
  if (!schoon || schoon === '/') return true;
  if (padCache.has(schoon)) return padCache.get(schoon);
  if (doorFunctie(schoon)) { padCache.set(schoon, true); return true; }
  const kaal = schoon.replace(/^\//, '').replace(/\/$/, '');
  const kandidaten = [
    path.join(DIST, kaal, 'index.html'),
    path.join(DIST, kaal + '.html'),
    path.join(DIST, kaal),
  ];
  const ja = kandidaten.some((k) => fs.existsSync(k));
  padCache.set(schoon, ja);
  return ja;
}

const STIL = `*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}
  .reveal,[class*="float"],[class*="rise"],[class*="foot-mark"]{opacity:1!important;transform:none!important}`;

/* ── WAT ER IN DE BROWSER GEMETEN WORDT ─────────────────────────────────────
   Eén evaluate met alles erin, en niet acht keer heen en weer: elke oversteek
   naar de pagina kost een ronde, en 364 keer acht rondes is drie minuten die
   nergens heen gaan. */
async function keurPagina(p, breedte) {
  return p.evaluate(({ breedte }) => {
    const uit = { overloop: [], raakvlak: [], afgekapt: [], kop: [], alt: [], links: [], beeld: [], bevatting: [] };
    const naam = (el) => {
      const t = el.tagName.toLowerCase();
      const k = typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
      const tekst = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30);
      return `${t}${k}${tekst ? ` "${tekst}"` : ''}`;
    };

    /* ── overloop ──────────────────────────────────────────────────────────
       Niet `scrollWidth > breedte` maar: KAN de pagina daadwerkelijk zijwaarts
       geschoven worden. Dat is wat een bezoeker merkt, en het scheelt een hoop
       vals alarm van elementen die netjes in een scroller of achter een dicht
       menu staan. */
    const voorX = window.scrollX;
    window.scrollTo(9999, window.scrollY);
    const kanNaar = Math.round(window.scrollX);
    window.scrollTo(voorX, window.scrollY);
    const docBreed = document.documentElement.scrollWidth;
    if (kanNaar > 2) {
      /* Welk element steekt uit? Alleen het BUITENSTE per tak melden, anders
         staat er tien keer hetzelfde omdat de kinderen mee uitsteken. */
      const schuldig = [];
      for (const el of document.querySelectorAll('body *')) {
        const cs = getComputedStyle(el);
        if (cs.position === 'fixed' || cs.display === 'none' || cs.visibility === 'hidden') continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (r.right <= breedte + 2 && r.left >= -2) continue;
        if (schuldig.some((s) => s.el.contains(el))) continue;
        schuldig.push({ el, r });
      }
      for (const s of schuldig.slice(0, 4)) {
        uit.overloop.push(`${naam(s.el)} — van ${Math.round(s.r.left)} tot ${Math.round(s.r.right)}px (venster ${breedte})`);
      }
      if (!schuldig.length) uit.overloop.push(`pagina schuift ${kanNaar}px zijwaarts (${docBreed}px breed bij een venster van ${breedte}px), geen enkel element aanwijsbaar`);
      else uit.overloop.unshift(`pagina schuift ${kanNaar}px zijwaarts`);
    }

    /* ── raakvlakken, alleen op de telefoonmaat ──────────────────────────── */
    if (breedte === 390) {
      const gezien = new Set();
      for (const el of document.querySelectorAll('a[href], button, [role="button"], input, select, summary')) {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        /* Een link midden IN een zin is uitgezonderd: WCAG 2.5.8 zondert
           inline-tekstlinks expliciet uit, want die kun je niet vergroten
           zonder de regelafstand te slopen. */
        if (el.tagName === 'A' && cs.display.startsWith('inline') && el.closest('p, li, td, dd, figcaption, span, em, strong, small')) continue;
        /* Weggestopt voor iedereen: een honingpot tegen spam, of een veld dat
           met opzet buiten beeld staat. Dat is geen raakvlak. */
        if (el.getAttribute('aria-hidden') === 'true' || el.getAttribute('tabindex') === '-1') continue;
        if (r.right < 0 || r.left > window.innerWidth) continue;
        /* EEN SELECTIEVAKJE IS ZO GROOT ALS ZIJN LABEL. Een <input> in een
           <label> wordt bediend door overal in dat label te tikken, dus dát is
           het raakvlak dat WCAG 2.5.8 bedoelt. Tien meldingen over vakjes van
           15 bij 15 gingen allemaal over een rij van 300 bij 44. */
        if (el.tagName === 'INPUT') {
          const lab = el.closest('label') || (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`));
          if (lab) {
            const lr = lab.getBoundingClientRect();
            if (lr.width >= 24 && lr.height >= 24) continue;
          }
        }
        if (r.width >= 24 && r.height >= 24) continue;
        const sleutel = naam(el);
        if (gezien.has(sleutel)) continue;
        gezien.add(sleutel);
        uit.raakvlak.push(`${sleutel} — ${Math.round(r.width)}x${Math.round(r.height)}px`);
      }
    }

    /* ── afgekapte tekst ─────────────────────────────────────────────────── */
    const gezienAf = new Set();
    for (const el of document.querySelectorAll('h1,h2,h3,h4,p,li,span,a,button,td,th,figcaption,em,strong')) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      if (!/hidden|clip/.test(cs.overflowX)) continue;
      const eigen = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (!eigen) continue;
      if (el.scrollWidth <= el.clientWidth + 4) continue;
      /* Het standaard "alleen voor schermlezers"-patroon is een vak van 1 bij 1
         pixel met clip-path. Dat is met opzet kleiner dan zijn tekst en geen
         afgekapte kop. */
      if (el.clientWidth <= 2 || el.clientHeight <= 2) continue;
      /* text-overflow: ellipsis is een KEUZE en geen fout. */
      if (cs.textOverflow === 'ellipsis') continue;
      const s = naam(el);
      if (gezienAf.has(s)) continue;
      gezienAf.add(s);
      uit.afgekapt.push(`${s} — ${el.scrollWidth}px tekst in ${el.clientWidth}px`);
    }

    /* ── koppen ──────────────────────────────────────────────────────────── */
    const koppen = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter((h) => {
      const cs = getComputedStyle(h);
      return cs.display !== 'none' && cs.visibility !== 'hidden';
    });
    const h1s = koppen.filter((h) => h.tagName === 'H1');
    if (h1s.length !== 1) uit.kop.push(`${h1s.length} keer <h1> (moet er één zijn)`);
    let vorig = 0;
    for (const h of koppen) {
      const n = +h.tagName[1];
      if (vorig && n > vorig + 1) {
        uit.kop.push(`sprong h${vorig} → h${n} bij "${(h.textContent || '').trim().slice(0, 40)}"`);
      }
      vorig = n;
    }

    /* ── alt en beeldmaat ────────────────────────────────────────────────── */
    for (const img of document.querySelectorAll('img')) {
      if (!img.hasAttribute('alt')) uit.alt.push(img.getAttribute('src') || '(zonder src)');
      const r = img.getBoundingClientRect();
      if (r.width < 8 || !img.naturalWidth) continue;
      const factor = img.naturalWidth / r.width;
      if (factor > 2.5) {
        uit.beeld.push({ src: img.currentSrc || img.src, natuurlijk: img.naturalWidth, getoond: Math.round(r.width), factor: +factor.toFixed(1) });
      }
    }

    /* ── BEVATTEND BLOK: EEN SCROLLER DIE ZIJN EIGEN INHOUD NIET VASTHOUDT ──
       Dit is de vorm van de fout die op 20 augustus de homepage 946px zijwaarts
       liet schuiven voor iedereen met beweging uitgezet, en die maandenlang
       onzichtbaar was omdat een animatie hem toevallig afdekte.

       De vorm: een element dat zijn inhoud AFKNIPT (overflow-x auto/scroll/
       hidden/clip) maar zelf `position: static` is en geen transform heeft. Zo'n
       element is geen bevattend blok, dus een `position: absolute` erbinnen hangt
       aan een voorouder ERBUITEN — en ontsnapt daarmee aan de afknipping. Zolang
       er toevallig een transform op staat (van een animatie, bijvoorbeeld) gaat
       het goed, en dat maakt het een fout die pas opduikt waar die animatie niet
       draait.

       De controle kijkt naar de VORM en niet naar het gevolg, want het gevolg
       is er niet altijd. Dat is precies de bedoeling: een keuring hoort de val
       te zien voordat iemand erin stapt. */
    for (const box of document.querySelectorAll('body *')) {
      /* <html> en <body> overslaan: het initiële bevattende blok is per definitie
         de wortel, dus daar kan niets aan ontsnappen. Zonder deze uitzondering
         meldt elke pagina zichzelf, omdat html een overflow-regel draagt voor de
         vloeiende scroll. */
      const cs = getComputedStyle(box);
      if (!/auto|scroll|hidden|clip/.test(cs.overflowX) && !/auto|scroll|hidden|clip/.test(cs.overflowY)) continue;
      if (cs.position !== 'static') continue;
      if (cs.transform !== 'none' || cs.filter !== 'none' || cs.perspective !== 'none') continue;
      if (cs.contain && /paint|layout|strict|content/.test(cs.contain)) continue;
      const los = [...box.querySelectorAll('*')].filter((e) => getComputedStyle(e).position === 'absolute');
      if (!los.length) continue;
      /* Alleen melden als die absolute kinderen ook echt buiten de scroller
         zouden vallen: hun bevattende blok is een voorouder van de scroller. */
      const ontsnapt = los.filter((e) => {
        let a = e.parentElement;
        while (a && a !== box) {
          const ac = getComputedStyle(a);
          if (ac.position !== 'static' || ac.transform !== 'none') return false;
          a = a.parentElement;
        }
        return a === box;
      });
      if (!ontsnapt.length) continue;
      uit.bevatting.push(`${naam(box)} knipt af (overflow ${cs.overflowX}/${cs.overflowY}) maar is position: static — ${ontsnapt.length} absoluut geplaatst kind ontsnapt (o.a. ${naam(ontsnapt[0])})`);
    }

    /* ── interne links ───────────────────────────────────────────────────── */
    for (const a of document.querySelectorAll('a[href]')) {
      const h = a.getAttribute('href');
      if (!h || /^(https?:|mailto:|tel:|#|javascript:)/.test(h)) continue;
      uit.links.push(h);
    }

    return uit;
  }, { breedte });
}

async function main() {
  if (!fs.existsSync(DIST)) {
    console.error('dist/ ontbreekt — draai eerst `npx astro build`.');
    process.exit(1);
  }
  const paden = allePaden();
  const srv = await serveer(4403);
  const browser = await chromium.launch({ executablePath: browserPad() });

  const rij = [];
  for (const breedte of BREEDTES) for (const u of paden) rij.push([breedte, u]);
  let volgende = 0, teller = 0;
  const bevindingen = [];
  const beeldMax = new Map();   // src → grootste getoonde breedte over de hele site
  const beeldNat = new Map();   // src → natuurlijke breedte

  if (!ALS_JSON) console.log(`\nVISUAILS — keuring van ${paden.length} pagina's × ${BREEDTES.length} breedtes\n`);

  const werker = async () => {
    let ctx = null, p = null, huidige = null;
    const fouten = [];
    for (;;) {
      const i = volgende++;
      if (i >= rij.length) break;
      const [breedte, u] = rij[i];
      if (breedte !== huidige) {
        if (ctx) await ctx.close();
        ctx = await browser.newContext({ viewport: { width: breedte, height: 1000 }, deviceScaleFactor: 1 });
        /* ── DE ONTHULPOORT WORDT HIER VOORAF OPENGEZET ────────────────────
           Layout.astro zet `js` op <html> en haalt die er 600 ms na `load`
           weer af, tenzij interactions.js `window.__vRevealLive = 1` heeft
           gezet. Op een trage of drukke machine haalt die module dat niet, de
           klasse verdwijnt, en pagina's met `.wk-step { min-height: 66svh }`
           worden ineens duizenden pixels korter. Dan meet de keuring de
           snelheid van deze machine in plaats van de site.

           De vlag wordt daarom vóór het laden gezet, zodat de waakhond altijd
           meteen terugkeert. De volledige uitleg staat in scripts/visueel.mjs. */
        await ctx.addInitScript(() => { window.__vRevealLive = 1; });
        p = await ctx.newPage();
        /* ── EEN 404 OP EEN FUNCTIONS-ROUTE IS GEEN FOUT VAN DE SITE ────────
           Deze keuring serveert dist/ als platte bestanden. /account/me bestaat
           daar niet, want dat is een Pages Function — en de site vraagt hem op
           elke pagina op om te weten of je ingelogd bent. In productie krijgt
           die vraag netjes antwoord.

           De eerste versie meldde dat zestien keer als consolefout. Daarom
           wordt hier de URL van het mislukte verzoek onthouden en tegen
           dezelfde routelijst gelegd als de linkcontrole: een 404 op een route
           die door een Function wordt afgehandeld, is een eigenschap van de
           voorvertoning en niet van de site. */
        p.on('response', (res) => {
          if (res.status() < 400) return;
          const u = res.url().replace(/^https?:\/\/[^/]+/, '');
          if (doorFunctie(u.split('?')[0])) return;
          fouten.push(`${res.status()} op ${u}`);
        });
        p.on('console', (m) => {
          if (m.type() !== 'error') return;
          /* De kale "Failed to load resource" zegt niet WELKE bron; die staat
             hierboven al met URL en al. */
          if (/Failed to load resource/.test(m.text())) return;
          fouten.push(m.text().slice(0, 160));
        });
        p.on('pageerror', (e) => fouten.push('uncaught: ' + String(e.message).slice(0, 160)));
        huidige = breedte;
      }
      fouten.length = 0;
      try {
        await p.goto(`http://127.0.0.1:4403${u}`, { waitUntil: 'load', timeout: 45000 });
      } catch (e) {
        bevindingen.push({ pad: u, breedte, soort: 'laden', tekst: String(e.message).split('\n')[0] });
        continue;
      }
      await p.addStyleTag({ content: STIL });
      /* Wachten tot de letters er zijn, om dezelfde reden als in
         scripts/visueel.mjs — daar staat de volledige uitleg. Kort: twaalf
         @font-face-regels met `font-display: swap`, en `waitUntil: 'load'`
         wacht daar niet op. Meet je ertussenin, dan meet je de terugvalletter,
         en dan wijkt elke regelafbreking op de pagina af van de vorige keer.
         Hier telt dat dubbel: afgekapte tekst en raakvlakken worden in pixels
         beoordeeld, en die pixels komen van de letter die op dat moment staat. */
      await p.evaluate(() => document.fonts.ready.then(() => undefined)).catch(() => {});

      /* En wachten tot de onthulpoort uitgepraat is — zie scripts/visueel.mjs
         voor de volledige uitleg. Kort: Layout.astro haalt de klasse `js` er
         600ms na `load` weer af als de onthulmodule zich niet gemeld heeft, en
         `.wk-step` hangt met `min-height: 66svh` aan diezelfde klasse. Meet je
         ertussenin, dan meet je een pagina die drieduizend pixels korter of
         langer is dan hij bij deze bezoeker wordt. */
      await p.waitForFunction(() => window.__vRevealLive === 1, { timeout: 3000 }).catch(() => {});
      await p.waitForTimeout(750);
      const eerste = await p.$('[data-hero-tab="0"]');
      if (eerste) { await eerste.click().catch(() => {}); await p.waitForTimeout(60); }
      await p.evaluate(() => { document.querySelectorAll('img[loading="lazy"]').forEach((i) => { i.loading = 'eager'; }); });
      await p.evaluate(() => Promise.race([
        Promise.all([...document.images].map((i) => (i.decode ? i.decode().catch(() => {}) : null))),
        new Promise((r) => setTimeout(r, 8000)),
      ]));
      await p.evaluate(() => new Promise((r) => {
        let y = 0;
        const stap = () => {
          window.scrollTo(0, y); y += 900;
          if (y < document.body.scrollHeight) requestAnimationFrame(stap);
          else { window.scrollTo(0, 0); requestAnimationFrame(() => setTimeout(r, 80)); }
        };
        stap();
      }));

      const html = await p.evaluate(() => document.documentElement.getAttribute('lang'));
      const wil = u.startsWith('/nl/') || u === '/nl/' ? 'nl' : 'en';
      if (html !== wil) bevindingen.push({ pad: u, breedte, soort: 'taal', tekst: `lang="${html}" waar "${wil}" hoort` });

      const r = await keurPagina(p, breedte);
      for (const soort of ['overloop', 'raakvlak', 'afgekapt', 'kop', 'alt', 'bevatting']) {
        for (const t of r[soort]) bevindingen.push({ pad: u, breedte, soort, tekst: t });
      }
      for (const b of r.beeld) {
        const nu = beeldMax.get(b.src) || 0;
        if (b.getoond > nu) beeldMax.set(b.src, b.getoond);
        beeldNat.set(b.src, b.natuurlijk);
      }
      for (const h of r.links) {
        if (!padBestaat(h)) bevindingen.push({ pad: u, breedte, soort: 'link', tekst: `${h} bestaat niet in de build` });
      }
      for (const f of new Set(fouten)) bevindingen.push({ pad: u, breedte, soort: 'console', tekst: f });

      teller++;
      if (!ALS_JSON && teller % 40 === 0) process.stdout.write(`  ${teller}/${rij.length}\n`);
    }
    if (ctx) await ctx.close();
  };

  await Promise.all(Array.from({ length: WERKERS }, werker));
  await browser.close();
  srv.close();

  /* Beeldverspilling pas NA afloop beoordelen: een bestand mag groot zijn zolang
     het ergens op de site ook groot getoond wordt. De vraag is dus niet "is hij
     hier te groot" maar "is hij NERGENS zo groot nodig". */
  const beeld = [];
  for (const [src, getoond] of beeldMax) {
    const nat = beeldNat.get(src) || 0;
    if (nat / getoond <= 2.5) continue;
    const opSchijf = path.join(DIST, src.replace(/^https?:\/\/[^/]+/, '').replace(/^\//, ''));
    let bytes = 0;
    try { bytes = fs.statSync(opSchijf).size; } catch { /* niet te vinden */ }
    beeld.push({ src: src.replace(/^https?:\/\/[^/]+/, ''), nat, getoond, factor: +(nat / getoond).toFixed(1), bytes });
  }
  beeld.sort((a, b) => b.bytes - a.bytes);

  if (ALS_JSON) {
    /* NAAR EEN BESTAND EN NIET NAAR STDOUT. `npm run keuring -- --json > x.json`
       lijkt te werken en doet het niet: npm zet er eerst zijn eigen twee regels
       banner boven, en dan is het geen geldige JSON meer. Dat kostte een halve
       meetronde. Het bestand schrijven kan niet misgaan. */
    const doel = path.join(WORTEL, 'visual', 'beeldmaten.json');
    fs.mkdirSync(path.dirname(doel), { recursive: true });
    fs.writeFileSync(doel, JSON.stringify({ bevindingen, beeld }));
    console.log(`\nmeting weggeschreven naar visual/beeldmaten.json (${beeld.length} beeld(en), ${bevindingen.length} bevinding(en))\n`);
    return;
  }

  const perSoort = new Map();
  for (const b of bevindingen) {
    if (!perSoort.has(b.soort)) perSoort.set(b.soort, []);
    perSoort.get(b.soort).push(b);
  }
  const volgorde = ['laden', 'console', 'link', 'taal', 'overloop', 'bevatting', 'afgekapt', 'kop', 'alt', 'raakvlak'];
  console.log(`\n${teller} pagina-metingen gedaan\n`);
  let totaal = 0;
  for (const soort of volgorde) {
    const lijst = perSoort.get(soort);
    if (!lijst || !lijst.length) continue;
    /* Dezelfde melding op vier breedtes is één probleem, geen vier. */
    const samen = new Map();
    for (const b of lijst) {
      const k = `${b.pad}|${b.tekst}`;
      if (!samen.has(k)) samen.set(k, { ...b, breedtes: [] });
      samen.get(k).breedtes.push(b.breedte);
    }
    console.log(`── ${soort.toUpperCase()} (${samen.size}) ${'─'.repeat(Math.max(0, 56 - soort.length))}`);
    for (const b of samen.values()) {
      const w = b.breedtes.length === BREEDTES.length ? 'alle' : b.breedtes.join('/');
      console.log(`  ${b.pad}  [${w}]`);
      console.log(`      ${b.tekst}`);
      totaal++;
    }
    console.log('');
  }
  if (!totaal) console.log('GEEN BEVINDINGEN\n');

  if (beeld.length) {
    const verspild = beeld.reduce((a, b) => a + b.bytes, 0);
    console.log(`── BEELD DAT VEEL GROTER WORDT AANGELEVERD DAN GETOOND (${beeld.length}) ────`);
    console.log(`   samen ${(verspild / 1024 / 1024).toFixed(1)} MB aan bestanden\n`);
    for (const b of beeld.slice(0, 25)) {
      console.log(`  ${b.src.padEnd(42)} ${String(b.nat).padStart(5)}px → getoond max ${String(b.getoond).padStart(4)}px  (${b.factor}x, ${(b.bytes / 1024 | 0)}kB)`);
    }
    if (beeld.length > 25) console.log(`  … en nog ${beeld.length - 25}`);
    console.log('');
  }

  if (totaal) process.exitCode = 1;
}

await main();
