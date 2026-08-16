/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE BESTELSTROOM AFLOPEN ZOALS EEN KLANT DAT DOET
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   npm run walk            → alle vier de stromen, beide talen
 *   npm run walk /nl/start/lifestyle
 *
 * ── WAAROM DIT BESTAAT NAAST tests/ ────────────────────────────────────────
 *
 * De toetsen in tests/ lezen bronbestanden en gebouwde html. Ze zijn snel, ze
 * draaien overal, en ze kunnen één ding principieel niet: het formulier BEDIENEN.
 * Alles wat pas stukgaat als er geklikt wordt — een luisteraar die aan een
 * selector hangt die niets rendert, een stap die je kunt passeren met een leeg
 * verplicht veld, een veld dat verborgen is en toch post, een fout die nooit
 * verschijnt — is voor die toetsen onzichtbaar.
 *
 * Dit script draait het echte bundel in een echte Chromium tegen dist/, en doet
 * wat een klant doet: kiezen, invullen, doorklikken. Wat het oplevert is een
 * lijst met wat er onderweg misging.
 *
 * DRIE DINGEN DIE ALLEEN HIER TE ZIEN ZIJN, en die alle drie eerder echt zijn
 * voorgekomen in dit project:
 *
 *   · `[pipeline] ReferenceError` bij het laden — een const die onder de aanroep
 *     stond. De pagina zag er goed uit; de stroom was dood. Elke console-fout
 *     telt hier daarom als bevinding, ook als er verder niets van te zien is.
 *   · Een veld dat met CSS verborgen is en toch in de POST zit. Hier na te gaan
 *     met een echte FormData van het echte formulier.
 *   · Een verplicht veld dat op geen enkele stap zichtbaar is — dan blokkeert
 *     reportValidity() het versturen zonder dat er iets te zien is om in te
 *     vullen, en de klant zit vast op een knop die niets doet.
 *
 * ── GEEN TEST ──────────────────────────────────────────────────────────────
 *
 * Er wordt niets afgekeurd en er is geen exitcode om op te sturen in CI. Dit is
 * een verrekijker en geen hek. Wat het vindt, hoort daarna een toets in tests/ te
 * worden — dezelfde afspraak als bij scripts/account-render.mjs.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(ROOT, '.render');
fs.mkdirSync(OUT, { recursive: true });

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('Er is geen dist/. Draai eerst `npx astro build` — dit script loopt over de gebouwde site.');
  process.exit(1);
}

const PORT = 4187;
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.avif': 'image/avif',
  '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.xml': 'application/xml',
  '.txt': 'text/plain', '.webmanifest': 'application/manifest+json',
};

/* Een echte server en geen file://. Het bundel doet fetch() en zet cookies, en
   op file:// is de origin `null` — dan werkt de helft niet en meet je iets
   anders dan wat je uitserveert. */
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(String(req.url).split('?')[0]);
  let f = path.join(DIST, p);
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f) || !f.startsWith(DIST)) { res.writeHead(404); return res.end('niet gevonden'); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
  return res.end(fs.readFileSync(f));
});
await new Promise((r) => server.listen(PORT, r));

const FLOWS = process.argv[2]
  ? [process.argv[2]]
  : [
    '/start/catalog', '/start/lifestyle', '/start/complete', '/test-sample',
    '/nl/start/catalog', '/nl/start/lifestyle', '/nl/start/complete', '/nl/test-sample',
  ];

const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium' });
const bevindingen = [];
const meld = (flow, wat) => { bevindingen.push(`${flow}: ${wat}`); console.log(`   ✗ ${wat}`); };

for (const flow of FLOWS) {
  console.log(`\n▶ ${flow}`);
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 1600 });

  /* Elke fout uit de console telt. Zie de kop: een ReferenceError bij het laden
     liet de pagina er ongeschonden uitzien en had de stroom dood. De
     404's van dit servertje op ontbrekende assets zijn geen codefout en gaan
     eruit — alles wat uit een script komt, blijft staan. */
  const fouten = [];
  page.on('pageerror', (e) => fouten.push(`JS-fout: ${String(e).slice(0, 200)}`));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (/Failed to load resource/.test(t)) return;
    fouten.push(`console: ${t.slice(0, 200)}`);
  });

  await page.goto(`http://localhost:${PORT}${flow}`, { waitUntil: 'networkidle' });

  const isSample = flow.includes('test-sample');

  // 1 · HET SCRIPT LEEFT. Zonder is-live is de rest van deze wandeling een
  //     wandeling door een formulier dat op niemands klik reageert.
  const live = await page.evaluate(() => !!document.querySelector('#pl-form.is-live'));
  if (!live) meld(flow, 'het formulier draagt geen is-live — pipeline.js is niet geïnitialiseerd');

  // 2 · STAP 1 INVULLEN, zoals een klant. Bij de proef is het aantal vast.
  if (!isSample) {
    const gekozen = await page.evaluate(() => {
      const s = document.querySelector('select[name="products"]');
      if (!s) return null;
      const opt = [...s.options].find((o) => o.value === '2');
      if (!opt) return null;
      s.value = '2';
      s.dispatchEvent(new Event('change', { bubbles: true }));
      return s.value;
    });
    if (gekozen !== '2') meld(flow, 'het aantal producten is niet te kiezen');
  }

  /* En de look, als die er is. Niet omdat dit script een mening heeft over welke
     look — de eerste is goed genoeg — maar omdat stap 1 er anders terecht op
     blijft staan, en dan komt de wandeling nooit bij stap 2 en 3 en zien we die
     helft van het formulier niet. */
  await page.evaluate(() => {
    const veld = document.querySelector('[data-pl-look]');
    if (!veld || veld.hidden) return;
    const eerste = veld.querySelector('input[name="style"]');
    if (eerste && !veld.querySelector('input[name="style"]:checked')) {
      eerste.checked = true;
      eerste.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });

  // 3 · DE VRAGEN DIE BIJ DEZE DIENST HOREN, en alleen die.
  const zicht = await page.evaluate(() => {
    const zichtbaar = (sel) => { const el = document.querySelector(sel); return el ? !el.hidden : null; };
    return {
      bg: zichtbaar('[data-pl-bg]'),
      look: zichtbaar('[data-pl-look]'),
      ratio: zichtbaar('[data-pl-ratio]'),
      ratioTegels: [...document.querySelectorAll('[data-pl-ratio-tile]')].filter((t) => !t.hidden).length,
      ratioGekozen: document.querySelector('input[name="ratio"]:checked')?.value || '',
    };
  });
  if (zicht.ratio !== true) meld(flow, 'de beeldverhouding wordt niet gevraagd');
  if (!zicht.ratioGekozen) meld(flow, 'er staat geen verhouding aangevinkt — een bestelling zonder vorm');
  /* Bij de proef hangt het af van wat er AANGEVINKT staat en niet van de route:
     de bezoeker kiest de soort in het formulier zelf, en de pagina opent op
     catalog. Dit script verwachtte er eerst de lookvraag en meldde het correcte
     gedrag als fout. */
  const soort = isSample
    ? await page.evaluate(() => document.querySelector('[data-pl-kind]:checked')?.value || '')
    : '';
  const wilLook = isSample ? soort === 'lifestyle' : /lifestyle|complete/.test(flow);
  const wilBg = isSample ? soort !== 'lifestyle' : /catalog|complete/.test(flow);
  if (wilLook && zicht.look === false) meld(flow, 'de lookvraag is verborgen terwijl deze dienst hem heeft');
  if (!wilLook && zicht.look === true) meld(flow, 'de lookvraag staat er terwijl deze dienst hem niet heeft');
  if (wilBg && zicht.bg === false) meld(flow, 'de achtergrondvraag is verborgen terwijl deze dienst hem heeft');
  console.log(`   verhouding: ${zicht.ratioGekozen || '—'} · ${zicht.ratioTegels} tegels · look ${zicht.look} · achtergrond ${zicht.bg}`);

  /* 4 · WAT ER GEPOST ZOU WORDEN. De harde vraag van dit script: CSS houdt geen
     veld uit een POST, en een `hidden` fieldset zonder `disabled` reist gewoon
     mee. Dit is een echte FormData van het echte formulier, dus wat hier in zit,
     zit ook in de inzending. */
  const velden = await page.evaluate(() => {
    const f = document.querySelector('#pl-form');
    const uit = [];
    for (const [k, v] of new FormData(f).entries()) {
      if (typeof v === 'string') uit.push([k, v.slice(0, 40)]);
    }
    return uit;
  });
  const heeft = (n) => velden.some(([k]) => k === n);
  if (!wilLook && heeft('style')) meld(flow, '`style` zit in de POST terwijl deze dienst geen look vraagt');
  if (!wilBg && heeft('background')) meld(flow, '`background` zit in de POST terwijl deze dienst geen achtergrond vraagt');
  if (!heeft('ratio')) meld(flow, '`ratio` zit niet in de POST');

  /* 5 · EEN VERPLICHT VELD DAT NERGENS TE ZIEN IS, blokkeert reportValidity() op
     iets wat de klant niet kan invullen — de knop doet dan niets en zegt niets.

     OP `el.required` EN NIET OP `[data-pl-req]`, en dat is het verschil tussen een
     meting en een schrikbeeld. Dit script las eerst het attribuut, en meldde toen
     op alle acht de stromen dat `vat_confirmed` en `reg_number` onbereikbaar
     verplicht waren. Ze zijn dat niet: init() haalt `required` van álles af en
     syncRequired() zet hem terug op precies wat op dat moment op het scherm staat
     — gemeten, `required=false` op allebei. Een gereedschap dat acht keer wolf
     roept, is een gereedschap dat niemand meer draait.

     Een veld in een uitgezette fieldset telt ook niet: dat wordt niet gevalideerd
     en het post niet. Zie syncStyle() in pipeline.js. */
  const onzichtbaarVerplicht = await page.evaluate(() => {
    const uit = [];
    document.querySelectorAll('#pl-form [data-pl-req="1"]').forEach((el) => {
      if (!el.required || el.matches(':disabled')) return;
      const stap = el.closest('.pl-step');
      if (!stap) { uit.push(`${el.name || el.id || el.tagName} (buiten elke stap)`); return; }
      const was = stap.className;
      stap.classList.add('is-current');
      const r = el.getBoundingClientRect();
      const stijl = getComputedStyle(el);
      // `position: absolute` met 1px is de standaardtruc voor een radio die
      // verborgen is maar wel bediend wordt via zijn label — die telt als zichtbaar.
      const zichtbaar = (r.width > 0 && r.height > 0) || stijl.position === 'absolute';
      stap.className = was;
      if (!zichtbaar) uit.push(el.name || el.id || el.tagName);
    });
    return uit;
  });
  for (const v of onzichtbaarVerplicht) meld(flow, `verplicht veld dat nergens te zien is: ${v}`);

  /* 6 · DOORLOPEN MET DE DOORGAAN-KNOP, en niet met de zijbalk.
     De zijbalk springt met opzet NIET over een onbeantwoorde stap heen — die
     poort is het hele punt van stap 1. Dit script meldde dat eerst als fout op
     alle acht de stromen; wat er in werkelijkheid gebeurt is precies goed:
     klikken zonder antwoord houdt je op stap 1 en zet er *"Choose how many
     products before you continue"* bij, en met antwoord ga je door.

     WAT HIER WÉL EEN BEVINDING IS: geblokkeerd worden zonder dat er iets te lezen
     staat. Een knop die niets doet en niets zegt, is de ergste toestand van een
     formulier — de klant weet niet dat hij iets moet en niet wat. */
  const stappen = await page.evaluate(() => document.querySelectorAll('.pl-step').length);
  let bereikt = 1;
  for (let i = 2; i <= stappen; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const na = await page.evaluate(() => {
      const knop = document.querySelector('.pl-step.is-current [data-pl-next]');
      if (knop) knop.click();
      const stap = document.querySelector('.pl-step.is-current');
      const fout = stap && stap.querySelector('[data-pl-step-error]');
      return {
        nu: Number(stap?.dataset.plStep || 0),
        gezegd: fout && !fout.hidden ? String(fout.textContent || '').trim() : '',
        knop: !!knop,
      };
    });
    if (!na.knop) break;
    if (na.nu > bereikt) { bereikt = na.nu; continue; }
    if (!na.gezegd) meld(flow, `stap ${bereikt} laat je niet door en zegt niet waarom`);
    else console.log(`   stap ${bereikt} houdt je tegen en zegt waarom: "${na.gezegd.slice(0, 60)}"`);
    break;
  }
  console.log(`   ${bereikt} van ${stappen} stappen doorlopen met Doorgaan`);

  // 7 · DE PRODUCTKAARTEN, met alles wat eraan hangt.
  if (!isSample) {
    const kaarten = await page.evaluate(() => {
      const el = document.querySelector('.pu-card');
      if (!el) return null;
      return {
        n: document.querySelectorAll('.pu-card').length,
        vakken: [...el.querySelectorAll('[data-pu-slot]')].map((s) => s.dataset.puSlot),
        plusje: !!el.querySelector('.pu-ref-add'),
        verhoudingPerBeeld: el.querySelectorAll('.pu-ratios select').length,
        betaaldVak: !!el.querySelector('.pu-extra select'),
      };
    });
    if (!kaarten) meld(flow, 'er staan geen productkaarten na het kiezen van 2 producten');
    else {
      console.log(`   ${kaarten.n} kaarten · ${kaarten.vakken.length} vakken · plusje ${kaarten.plusje} · ${kaarten.verhoudingPerBeeld} verhoudingen per beeld · betaald vak ${kaarten.betaaldVak}`);
      if (kaarten.n !== 2) meld(flow, `2 producten gekozen, ${kaarten.n} kaarten getekend`);
      if (!kaarten.plusje) meld(flow, 'het gratis plusje staat niet op de kaart');
      if (!kaarten.betaaldVak) meld(flow, 'het betaalde extra-vak staat niet op de kaart');
      const wilPerBeeld = /lifestyle|complete/.test(flow);
      if (wilPerBeeld && !kaarten.verhoudingPerBeeld) meld(flow, 'geen verhouding per beeld op een dienst die dat wel heeft');
      if (!wilPerBeeld && kaarten.verhoudingPerBeeld) meld(flow, 'verhouding per beeld op een dienst die één verhouding voor de hele bestelling heeft');
    }
  }

  // 8 · TOETSENBORD. Een formulier waar je niet doorheen kunt tabben, is een
  //     formulier dat een deel van je klanten niet kan invullen.
  const bereikbaar = await page.evaluate(() => {
    const stap = document.querySelector('.pl-step.is-current');
    if (!stap) return -1;
    return stap.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])').length;
  });
  if (bereikbaar <= 0) meld(flow, 'er is niets met het toetsenbord te bereiken op de zichtbare stap');

  for (const f of fouten) meld(flow, f);

  await page.screenshot({ path: path.join(OUT, `walk${flow.replace(/\W+/g, '-')}.png`), fullPage: false });
  await page.close();
}

await browser.close();
server.close();

console.log(`\n${'═'.repeat(70)}`);
if (!bevindingen.length) {
  console.log('Alle stromen doorlopen, niets gevonden.');
} else {
  console.log(`${bevindingen.length} bevinding${bevindingen.length === 1 ? '' : 'en'}:\n`);
  for (const b of bevindingen) console.log(`  · ${b}`);
}
console.log('\n▶ echte browser, gebouwde site — een verrekijker en geen hek. Wat hier omhoog komt, hoort een toets in tests/ te worden.');
