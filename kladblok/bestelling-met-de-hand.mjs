/* DE BESTELSTROOM ALS EEN KLANT HEM DOET — 7 september 2026
   ═══════════════════════════════════════════════════════════════════════════
   Lucas: "probeer alle mogelijkheden dan ook te gebruiken en actief fouten of
   onlogische dingen op te sporen."

   kladblok/kruis-controle.mjs opent elke pagina en kijkt of hij heel is. Dat is
   niet hetzelfde als hem GEBRUIKEN. Dit harnas klikt: het vult stap 1 in, gaat
   door naar stap 2, kiest een achtergrond, een gezicht, een verhouding, uploadt
   een foto, vult de gegevens in — en let bij elke stap op of de knop die er
   staat ook echt werkt en of het bedrag klopt met wat de prijslijst zegt.

   HET STOPT VÓÓR DE BETALING. Dat is met opzet: een echte bestelling plaatsen
   met een echt e-mailadres is één ding, maar er hoort geen betaling bij een
   controle. De laatste stap die dit harnas doet is "staat de knop klaar en klopt
   het bedrag" — de betaling zelf loopt in kladblok/keten-doorloop.mjs, met een
   nagebootste Mollie, van begin tot creditnota.

     node kladblok/bestelling-met-de-hand.mjs
     DIENST=lifestyle node kladblok/bestelling-met-de-hand.mjs
     TAAL=nl node kladblok/bestelling-met-de-hand.mjs */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { browserPad } from '../scripts/lib/browserpad.mjs';

const BASIS = process.env.BASIS || 'http://localhost:4331';
const DIENST = process.env.DIENST || 'catalog';
const TAAL = process.env.TAAL === 'nl' ? 'nl' : 'en';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'kladblok', 'bestelling');
fs.mkdirSync(OUT, { recursive: true });

const log = [];
let stuk = 0;
const L = (t) => { log.push(t); console.log(`   ${t}`); };
const BAD = (t) => { stuk++; log.push(`⚠️ ${t}`); console.log(`   !! ${t}`); };

const browser = await chromium.launch({ executablePath: browserPad() });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const fouten = [];
ctx.on('console', (m) => { if (m.type() === 'error' && !/account\/me|401/.test(m.text())) fouten.push(m.text().slice(0, 140)); });
ctx.on('pageerror', (e) => fouten.push(`PAGEERROR ${String(e).slice(0, 140)}`));

/* Een gegenereerd proefbeeld van 1400x1750, en die maat is het punt.
   Eerst stond hier public/img/catalog-after-w420.webp, en toen wees het
   formulier drie van de vier foto's terecht af: "Too small — 420 pixels on the
   long side, and we need at least 1000." Dat is de kwaliteitspoort die precies
   doet waar hij voor is; wie hem met een te klein testbeeld voedt, test hem en
   niet de stroom erachter. Zie MIN_LANGE_ZIJDE in src/data/shots.js.
   Maken:  node -e "..." → kladblok/bestelling/proefbeeld.webp */
const PROEF = path.join(OUT, 'proefbeeld.webp');
if (!fs.existsSync(PROEF)) { console.error(`ontbreekt: ${PROEF} — zie de noot hierboven`); process.exit(2); }
const beeld = fs.readFileSync(PROEF);
let geupload = false;
let aantal = 1;

const page = await ctx.newPage();
let nr = 0;
const kiek = async (naam) => {
  const f = `${String(++nr).padStart(2, '0')}-${DIENST}-${TAAL}-${naam}.png`;
  await page.screenshot({ path: path.join(OUT, f), fullPage: true });
  L(`📷 ${f}`);
};

/* Welke stap staat er open? pipeline.js zet aria-current / hidden op de panelen,
   dus vraag het de pagina in plaats van het te tellen. */
const huidigeStap = () => page.evaluate(() => {
  const zichtbaar = [...document.querySelectorAll('[data-pl-step]')].filter((el) => {
    const cs = getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden' && el.getBoundingClientRect().height > 0;
  });
  return zichtbaar.map((el) => el.getAttribute('data-pl-step'));
});

/* De knoppen die pipeline.js zelf bedient. */
const volgende = async () => {
  const knop = page.locator('[data-pl-next]:visible').first();
  if (!(await knop.count())) return false;
  const label = (await knop.innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
  if (await knop.isDisabled().catch(() => false)) { BAD(`de knop "${label}" staat uit terwijl de stap ingevuld is`); return false; }
  await knop.click();
  await page.waitForTimeout(600);
  L(`→ "${label}"`);
  return true;
};

const url = `${BASIS}${TAAL === 'nl' ? '/nl' : ''}/start/${DIENST}`;
console.log(`\n▶ ${url}`);
const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
await page.waitForTimeout(1800);
if (!res || res.status() !== 200) BAD(`${url} → ${res ? res.status() : 'geen antwoord'}`);
/* De cookiemelding staat over de onderkant van het formulier heen en vangt
   kliks af. Een mens klikt hem weg; dit harnas kiest de terughoudende knop,
   dezelfde die de site zelf vooropzet. */
for (const tekst of ['Only what is necessary', 'Alleen het noodzakelijke']) {   // cc_reject in src/i18n/ui.js
  const k = page.getByRole('button', { name: new RegExp(tekst, 'i') });
  if (await k.count()) { await k.first().click().catch(() => {}); await page.waitForTimeout(400); L(`cookiemelding weggeklikt ("${tekst}")`); break; }
}
L(`open: stap ${(await huidigeStap()).join(',') || '—'}`);
await kiek('stap1');

/* ── STAP 1 · het aantal ──────────────────────────────────────────────────── */
{
  /* De <select name="products"> staat er wel, maar hidden en aria-hidden: hij is
     de waarde die meegaat met het formulier, niet de bediening. Wat een klant
     ZIET is een getalveld met een min en een plus en vier sneltoetsen (1, 5, 10,
     het maximum). Dus dat is ook wat dit harnas gebruikt — anders test je een
     besturing die niemand aanraakt. */
  const chips = page.locator('[data-pl-qty-set]:visible');
  const getal = page.locator('[data-pl-qty-input]:visible').first();
  if (await chips.count()) {
    const labels = await chips.allTextContents();
    L(`snelkeuzes: ${labels.join(' / ')} · plus/min aanwezig: ${await page.locator('[data-pl-qty-inc]:visible').count() ? 'ja' : 'NEE'}`);
    await chips.nth(1).click();                       // "5"
    await page.waitForTimeout(400);
    L(`na klik op "${labels[1]}": veld staat op ${await getal.inputValue()}`);
    await page.locator('[data-pl-qty-inc]:visible').first().click();
    await page.waitForTimeout(400);
    const na = await getal.inputValue();
    L(`na één keer plus: ${na}`);
    if (String(na) !== String(Number(labels[1]) + 1)) BAD(`plus rekende ${labels[1]} → ${na}`);
    /* En wat komt er in het veld dat DAADWERKELIJK verstuurd wordt? */
    aantal = Number(na) || aantal;
    const verborgen = await page.locator('select[name="products"]').first().inputValue().catch(() => '');
    L(`select name="products" staat op "${verborgen}"`);
    if (verborgen && verborgen !== na) BAD(`het zichtbare veld zegt ${na}, het verstuurde veld zegt ${verborgen}`);
  } else if (await getal.count()) {
    await getal.fill('6'); await getal.dispatchEvent('change'); await page.waitForTimeout(400);
    L(`geen snelkeuzes; getalveld ingevuld op ${await getal.inputValue()}`);
  } else {
    const knoppen = await page.locator('[data-pl-step="1"] button:visible, [data-pl-step="1"] a.knop:visible').allTextContents();
    L(`geen aantalkeuze; wel ${knoppen.length} knop(pen): ${knoppen.map((k) => k.replace(/\s+/g, ' ').trim()).slice(0, 4).join(' | ')}`);
  }
}

/* Het bedrag dat de pagina toont, en of het meebeweegt met het aantal. */
const bedrag = async () => (await page.locator('[data-pl-total], .pl-total, [data-total]').first().innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
const eerste = await bedrag();
if (eerste) L(`bedrag na stap 1: ${eerste}`);

/* ── DOOR DE STAPPEN ──────────────────────────────────────────────────────── */
for (let i = 0; i < 8; i++) {
  const voor = (await huidigeStap()).join(',');
  /* Alles wat op deze stap gekozen MOET worden, kiezen: de eerste optie van elke
     radiogroep die nog leeg is. Zo raakt elke stap ingevuld zonder dat dit harnas
     hoeft te weten welke velden er zijn. */
  const gekozen = await page.evaluate(() => {
    const namen = new Set();
    for (const r of document.querySelectorAll('input[type="radio"]')) {
      const el = r;
      const cs = getComputedStyle(el.closest('label') || el);
      if (cs.display === 'none') continue;
      if (!el.name || namen.has(el.name)) continue;
      const groep = [...document.querySelectorAll(`input[type="radio"][name="${CSS.escape(el.name)}"]`)];
      if (groep.some((g) => g.checked)) { namen.add(el.name); continue; }
      groep[0].click();
      namen.add(el.name);
    }
    for (const s of document.querySelectorAll('select')) {
      if (!s.value && s.options.length > 1) { s.selectedIndex = 1; s.dispatchEvent(new Event('change', { bubbles: true })); }
    }
    return [...namen];
  });
  if (gekozen.length) L(`ingevuld op stap ${voor}: ${gekozen.join(', ')}`);

  /* Elk leeg tekstveld dat zichtbaar en verplicht is. Lucas vroeg om de proef op
     hello@visuails.com; de rest is verzonnen — geen echt adres, dat is de
     staande regel. */
  const getypt = await page.evaluate(() => {
    const gevuld = [];
    const waarde = (el) => {
      const n = `${el.name || ''} ${el.id || ''} ${el.type} ${el.getAttribute('autocomplete') || ''} ${el.placeholder || ''}`.toLowerCase();
      if (el.type === 'email' || /e-?mail/.test(n)) return 'hello@visuails.com';
      if (el.type === 'tel' || /phone|telefoon/.test(n)) return '0600000000';
      if (/postal|postcode|zip/.test(n)) return '1011 AB';
      if (/city|plaats|stad/.test(n)) return 'Proefstad';
      if (/address|adres|street|straat/.test(n)) return 'Proefstraat 1';
      if (/vat|btw/.test(n)) return '';
      if (/brand|merk|company|bedrijf|organization/.test(n)) return 'PROEF';
      if (/first|voornaam/.test(n)) return 'Proef';
      if (/last|achternaam|surname/.test(n)) return 'Klant';
      if (/name|naam/.test(n)) return 'Proef Klant';
      if (/url|website/.test(n)) return 'https://voorbeeld.nl';
      if (el.tagName === 'TEXTAREA') return 'Een korte proefopdracht: houd de kleur zoals hij is.';
      return 'proef';
    };
    for (const el of document.querySelectorAll('input, textarea')) {
      if (['hidden', 'file', 'radio', 'checkbox', 'submit', 'button'].includes(el.type)) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      if (!el.offsetParent && cs.position !== 'fixed') continue;
      if (el.value) continue;
      if (!el.required && !el.hasAttribute('data-pl-req')) continue;
      const v = waarde(el);
      if (!v) continue;
      el.value = v;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      gevuld.push(el.name || el.id || el.type);
    }
    /* Verplichte vinkjes (voorwaarden, zakelijke verklaring) aanzetten, plus de
       ontsnappingsvinkjes die een verplicht veld overbodig maken. Die staan in
       de opmaak als `data-pl-req-unless="no_vat"`: het veld is verplicht TENZIJ
       dit vinkje aan staat. Zonder dat vinkje blijft het formulier terecht
       staan met "Fill in your VAT number, or tick the box below" — en dan test
       je de foutmelding in plaats van de stroom. */
    const ontsnapping = new Set([...document.querySelectorAll('[data-pl-req-unless]')].map((el) => el.getAttribute('data-pl-req-unless')));
    for (const el of document.querySelectorAll('input[type="checkbox"]')) {
      const verplicht = el.required || el.hasAttribute('data-pl-req');
      const ontsnapt = ontsnapping.has(el.name) || ontsnapping.has(el.id) || ontsnapping.has((el.id || '').replace(/^pl-/, ''));
      if (!verplicht && !ontsnapt) continue;
      if (el.checked) continue;
      el.click();
      gevuld.push((el.name || el.id || 'vinkje') + (ontsnapt ? ' (ontsnapping)' : ''));
    }
    return gevuld;
  });
  if (getypt.length) L(`getypt op stap ${voor}: ${getypt.join(', ')}`);

  /* STAP 2 IS DE UPLOAD, EN DIE VULT GEEN RADIOKNOP. Zonder foto's houdt het
     formulier je terecht tegen — dat is het formulier dat zijn werk doet, niet
     een fout. Dus hier gaan er echt bestanden in, via dezelfde bulkkiezer die
     een klant gebruikt: één foto per shot, voor elk product dat hij koos. */
  const bulk = page.locator('[data-pl-file]').first();
  if (await bulk.count() && !geupload) {
    /* Voor ELK product dat in stap 1 gekozen is, want anders houdt stap 2 je
       terecht tegen: zes producten besteld en één ingevuld is een onvolledige
       bestelling. Vier kanten per product, met de namen die de handleiding
       aanleert — inclusief "op-model", dat tot vandaag een fantoomproduct
       maakte. Zie de noot bij productStem() in src/data/shots.js. */
    const kanten = ['voorkant', 'achterkant', 'detail', 'op-model'];
    const bestanden = [];
    for (let p = 1; p <= aantal; p++) {
      for (const k of kanten) bestanden.push({ name: `product-${String(p).padStart(2, '0')}-${k}.webp`, mimeType: 'image/webp', buffer: beeld });
    }
    await bulk.setInputFiles(bestanden);
    await page.waitForTimeout(1200 + aantal * 500);
    geupload = true;
    const kaarten = await page.locator('.pu-card, [data-pl-card]').count();
    const klaar = await page.locator('text=/^Ready$|^Klaar$/i').count();
    L(`${bestanden.length} foto's gekozen voor ${aantal} product(en) · ${kaarten} kaart(en), ${klaar} met "klaar"`);
    if (kaarten > aantal) BAD(`${kaarten} kaarten voor ${aantal} producten — er is er een uit een bestandsnaam ontstaan`);
    const melding = (await page.locator('[data-pl-step-error]:visible').first().innerText().catch(() => '')).trim();
    if (melding) L(`melding na uploaden: "${melding}"`);
  }

  await page.waitForTimeout(400);
  await kiek(`stap-${voor || i}`);

  if (!(await volgende())) break;
  const na = (await huidigeStap()).join(',');
  if (na === voor) { BAD(`de knop bracht je niet verder: stap ${voor} bleef staan`); break; }
}

await kiek('einde');
const laatste = await bedrag();
if (laatste) L(`bedrag aan het eind: ${laatste}`);
L(`eindstap: ${(await huidigeStap()).join(',') || '—'}`);

if (fouten.length) { for (const f of [...new Set(fouten)].slice(0, 8)) BAD(`console: ${f}`); }

fs.writeFileSync(path.join(OUT, `LOGBOEK-${DIENST}-${TAAL}.md`), `# Bestelstroom ${DIENST} (${TAAL})\n\n${log.map((l) => `- ${l}`).join('\n')}\n`);
console.log(stuk ? `\n${stuk} probleem(en) — zie kladblok/bestelling/` : '\nde stroom loopt door tot het eind');
await browser.close();
process.exit(stuk ? 1 : 0);
