/* WAT STAAT ER TE DICHT OP ELKAAR — 8 september 2026
   ═══════════════════════════════════════════════════════════════════════════
   Lucas: *"er zijn af en toe teksten die te dicht op knoppen, andere teksten,
   of foto's staan"* en *"Er zijn ook teksten die niet altijd op dezelfde hoogte
   staan waardoor het af en toe rommelig eruit kan zien."*

   Dat zijn twee klachten en allebei zijn ze meetbaar. tests/a11y.test.mjs vangt
   al de harde variant — tekst die OVER tekst valt. Wat ontbrak is de zachte:
   twee blokken die elkaar niet raken maar zo dicht op elkaar staan dat ze als
   één blok lezen, en rijen waarvan de cellen niet op één lijn beginnen.

   WAT HIJ MEET, en waarom deze grenzen:

   · AFSTAND. Tussen twee zichtbare buren die allebei iets dragen (tekst, een
     knop, een beeld) hoort minstens 8px te zitten. Onder de 8 lezen ze als één
     ding; onder de 4 lijkt het een fout. Alleen ECHTE buren: geen ouder tegen
     kind, en geen twee dingen in verschillende kolommen.
   · UITLIJNING. Cellen van dezelfde rij (dezelfde ouder, naast elkaar) horen
     op dezelfde bovenlijn te beginnen. Verschilt die meer dan 2px, dan is het
     een rommelige rij en geen bedoeld verspringen.

   node kladblok/te-dicht.mjs                 → de hele site, beide breedtes
   node kladblok/te-dicht.mjs /nl/catalog     → één pagina */
import { chromium } from 'playwright';
import { browserPad } from '../scripts/lib/browserpad.mjs';

const BASIS = process.env.BASIS || 'http://localhost:4331';
const PADEN = process.argv.length > 2 ? process.argv.slice(2) : [
  '/nl/', '/nl/catalog', '/nl/lifestyle', '/nl/video', '/nl/pricing', '/nl/plans',
  '/nl/models', '/nl/custom-models', '/nl/start', '/nl/test-sample', '/nl/faq',
  '/nl/contact', '/nl/how-it-works', '/nl/studio', '/nl/gallery', '/nl/about',
];

const browser = await chromium.launch({ executablePath: browserPad() });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto(`${BASIS}/`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
for (const t of ['Alleen het noodzakelijke', 'Only what is necessary']) {
  const k = page.getByRole('button', { name: new RegExp(t, 'i') });
  if (await k.count()) { await k.first().click().catch(() => {}); await page.waitForTimeout(400); break; }
}

let totaal = 0;
for (const pad of PADEN) {
  for (const [maat, w, h] of [['breed', 1440, 900], ['telefoon', 390, 844]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto(BASIS + pad, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => null);
    await page.waitForTimeout(1400);
    /* Helemaal naar beneden en terug: alles wat pas bij het scrollen verschijnt,
       staat dan op zijn plek in plaats van op zijn beginstand. */
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(900);

    const uit = await page.evaluate(() => {
      const zichtbaar = (el) => {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.2) return false;
        const r = el.getBoundingClientRect();
        return r.width > 2 && r.height > 2;
      };
      /* ── WAT TELT ALS BUUR, EN WAAROM DE EERSTE VERSIE ONBRUIKBAAR WAS ──
         De eerste versie vond 202 plekken op drie pagina's, en bijna allemaal
         waren ze goed: "€69" met "per clip · excl. btw" 3px eronder is geen
         fout maar één ding — een getal met zijn onderschrift. Zo ook een
         stapnummer met zijn titel, en een naam met zijn regel.

         Een meter die goede typografie afkeurt, wordt genegeerd, en dan vangt
         hij ook de echte fouten niet meer. Dus: alleen BLOKKEN tellen als
         buur — een alinea, een kop, een lijst, een figuur, een knoppenrij —
         en nooit een inline label bij zijn waarde. */
      const BLOK = 'p, h1, h2, h3, h4, ul, ol, figure, img, table, form, .acties, .knop, .btn';
      const isBlok = (el) => {
        if (!el.matches(BLOK)) return false;
        const d = getComputedStyle(el).display;
        return d !== 'inline' && d !== 'contents';
      };
      /* Wat BINNEN een nagebouwd scherm staat, telt niet mee. De figuren op
         /studio en /how-it-works tekenen een interface na — een berichtje, een
         kalenderrij, een statusregel — en daar is 6px tussen twee regels
         precies wat een interface doet. De meter gaat over de PAGINA. */
      const chroom = (el) => el.closest('header, nav, footer, [data-cookie], .cookie, .cc, [data-pk], .pk, figure[class^="fg"], figure[class*=" fg"], .fb, [class^="fb-"]');
      const naam = (el) => `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''}`;
      const kort = (el) => (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40);

      const alles = [...document.querySelectorAll('main *')].filter((el) => zichtbaar(el) && !chroom(el) && isBlok(el));

      const dicht = [];
      const scheef = [];
      for (const el of alles) {
        const ouder = el.parentElement;
        if (!ouder) continue;
        const ouderStijl = getComputedStyle(ouder);
        const rij = (ouderStijl.display === 'flex' && ouderStijl.flexDirection.startsWith('row'))
          || ouderStijl.display === 'grid';
        const broers = [...ouder.children].filter((b) => b !== el && zichtbaar(b) && isBlok(b));
        const a = el.getBoundingClientRect();
        for (const b of broers) {
          const r = b.getBoundingClientRect();
          const overlapX = Math.min(a.right, r.right) - Math.max(a.left, r.left);
          if (overlapX < Math.min(a.width, r.width) * 0.5) {
            /* Naast elkaar in dezelfde rij: dan horen ze op één lijn te
               beginnen. Alleen als de ouder ook echt een rij IS — twee
               absoluut geplaatste dingen die toevallig naast elkaar staan,
               zeggen niets. */
            /* En ze moeten elkaar VERTICAAL overlappen: staat de tweede
               helemaal onder de eerste, dan is de rij afgebroken (flex-wrap
               op een telefoon) en is dat geen scheve uitlijning maar precies
               wat afbreken hoort te doen. */
            const overlapY = Math.min(a.bottom, r.bottom) - Math.max(a.top, r.top);
            /* ── EEN GECENTREERDE RIJ IS NIET SCHEEF ────────────────────────
               8 september 2026. `align-items: center` op de ouder is geen
               ongeluk maar een keuze: twee beelden met een andere verhouding,
               of een alinea van twee regels naast één knop, horen dan op hun
               MIDDEN uit te lijnen en niet op hun bovenkant. De meter zag daar
               215px en 9px "scheef" en had in allebei de gevallen ongelijk.
               Wat wél fout kan zijn in zo'n rij — twee ONDERSCHRIFTEN die
               daardoor op verschillende hoogtes eindigen — is een andere meting
               en hoort niet met deze te worden verward; die is opgelost in
               stijl22.css door de figuren te laten strekken. */
            /* Gecentreerd óf op de basislijn: allebei zijn het een KEUZE om
               niet op de bovenkant uit te lijnen, en bij een basislijn hoort dat
               zelfs zo — twee tekstgroottes naast elkaar hebben dan per definitie
               een andere bovenkant, en dat is precies wat je wilt. De meter
               meldde daar 3px "scheef" op een kop met een bijzin ernaast. */
            const mid = (x) => /^(center|safe center|baseline|first baseline|last baseline)$/.test(x);
            /* Ook als de ouder strekt maar één van de twee zichzelf centreert
               — de gele draad tussen de twee studiobeelden doet precies dat. */
            const gecentreerd = mid(ouderStijl.alignItems)
              || mid(getComputedStyle(el).alignSelf) || mid(getComputedStyle(b).alignSelf);
            if (rij && !gecentreerd && overlapY > 4 && Math.abs(a.top - r.top) > 2 && a.top < r.top) {
              scheef.push(`${naam(el)} en ${naam(b)} beginnen ${Math.round(Math.abs(a.top - r.top))}px uit elkaar — "${kort(el)}"`);
            }
            continue;
          }
          /* ── EEN OPSCHRIFT HOORT DICHT OP ZIJN KOP ─────────────────────
             `<p class="mono">Catalog</p>` boven `<h2>Op je productpagina</h2>`
             is één ding: een opschrift met zijn kop. Zes pixels ertussen is
             daar juist goed — verder uit elkaar en ze lezen als twee koppen.
             Tien van de achttien resterende meldingen waren dit, en een meter
             die goede typografie blijft aanwijzen leert niemand meer iets. */
          const opschrift = (x, y) => x.matches('p.mono, p.etiket, .etiket, .kicker')
            && y.matches('h1, h2, h3, h4');
          const gat = r.top - a.bottom;
          if (gat >= 0 && gat < 8 && !opschrift(el, b)) {
            dicht.push(`${Math.round(gat)}px tussen ${naam(el)} en ${naam(b)} — "${kort(el)}" / "${kort(b)}"`);
          }
        }
      }
      const uniek = (l) => [...new Set(l)];
      return { dicht: uniek(dicht), scheef: uniek(scheef) };
    });

    const n = uit.dicht.length + uit.scheef.length;
    totaal += n;
    if (n) {
      console.log(`\n${pad}  (${maat})`);
      for (const r of uit.dicht.slice(0, 8)) console.log(`   te dicht : ${r}`);
      for (const r of uit.scheef.slice(0, 6)) console.log(`   scheef   : ${r}`);
      if (uit.dicht.length > 8) console.log(`   … en nog ${uit.dicht.length - 8} te dicht`);
      if (uit.scheef.length > 6) console.log(`   … en nog ${uit.scheef.length - 6} scheef`);
    }
  }
}
console.log(`\n${PADEN.length} pagina's × 2 breedtes · ${totaal} plek(ken) gevonden`);
await browser.close();
