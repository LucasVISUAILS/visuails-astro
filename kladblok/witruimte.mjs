/*
 * VISUAILS — witruimte en overloop, op drie breedtes.
 *
 * Lucas, 8 september 2026: *"Op telefoon mag op alle pagina's nog wel even goed
 * gekeken worden naar of er genoeg white space is. Check alle pagina's op
 * desktop, tablet en telefoon nauwkeurig voor dit soort fouten, te weinig ruimte
 * tussen tekst en elementen en inconsistenties."*
 *
 * te-dicht.mjs meet of twee blokken elkaar RAKEN (onder 8px). Deze meet iets
 * anders en algemener:
 *
 *   1 · OVERLOOP. Steekt er iets buiten het scherm? Dat is geen krappe marge
 *       maar een kapotte pagina, en op een telefoon zie je het pas als je
 *       zijwaarts veegt.
 *   2 · DE KANTLIJN. Hoeveel ruimte zit er tussen de schermrand en de eerste
 *       letter? Dat hoort op elke pagina hetzelfde te zijn; één pagina met een
 *       eigen padding valt op zonder dat je weet waarom.
 *   3 · DE ADEM BINNEN EEN SECTIE. De kleinste verticale afstand tussen twee
 *       opeenvolgende tekstblokken per sectie, en of die onder de norm van de
 *       site zakt.
 *
 * Gebruik:  node kladblok/witruimte.mjs [pad ...]   (dev-server op 4331)
 */
import { chromium } from 'playwright';

const BASIS = 'http://localhost:4331';
const PADEN = process.argv.slice(2).length ? process.argv.slice(2) : [
  '/nl/', '/nl/catalog', '/nl/lifestyle', '/nl/video', '/nl/hooks', '/nl/editions',
  '/nl/models', '/nl/custom-models', '/nl/studio', '/nl/portal', '/nl/how-it-works',
  '/nl/pricing', '/nl/plans', '/nl/start', '/nl/gallery', '/nl/about', '/nl/compare',
  '/nl/faq', '/nl/contact', '/nl/test-sample', '/nl/guides', '/nl/upload-guidelines',
];
const BREEDTES = [[1440, 'desktop'], [768, 'tablet'], [390, 'telefoon']];
/* Onder deze afstand tussen twee tekstblokken in dezelfde sectie wordt het
   krap. Niet 8 zoals in te-dicht.mjs — die zoekt aanrakingen; deze zoekt
   benauwdheid, en dat begint eerder. */
const ADEM = { desktop: 16, tablet: 14, telefoon: 12 };

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const kantlijnen = {};
let meldingen = 0;

for (const pad of PADEN) {
  for (const [w, naam] of BREEDTES) {
    const p = await browser.newPage({ viewport: { width: w, height: 900 } });
    try { await p.goto(BASIS + pad, { waitUntil: 'load', timeout: 25000 }); } catch { await p.close(); continue; }
    await p.waitForTimeout(800);
    await p.evaluate(() => {
      const k = [...document.querySelectorAll('button')].find((b) => /noodzakelijke|necessary/i.test(b.textContent || ''));
      if (k) k.click();
    });
    await p.waitForTimeout(400);

    const uit = await p.evaluate((grens) => {
      const fout = [];
      /* 1 · overloop */
      const breed = document.documentElement.scrollWidth;
      if (breed > innerWidth + 1) {
        /* welk element steekt eruit? */
        const daders = [...document.querySelectorAll('body *')].filter((el) => {
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          if (cs.position === 'fixed' || cs.visibility === 'hidden' || cs.display === 'none') return false;
          if (el.closest('[hidden], .mobile-drawer, .drawer, dialog')) return false;
          return r.right > innerWidth + 1 && r.width > 8 && r.width <= breed;
        }).slice(0, 3).map((el) => `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]}(+${Math.round(el.getBoundingClientRect().right - innerWidth)})`);
        if (daders.length) fout.push(`loopt ${breed - innerWidth}px over — ${daders.join(', ')}`);
      }
      /* 2 · kantlijn: de linkerkant van de eerste alinea in de eerste sectie */
      const eerste = document.querySelector('.s22 p.lopend, .s22 p, main p');
      const kant = eerste ? Math.round(eerste.getBoundingClientRect().left) : null;
      /* 3 · adem tussen opeenvolgende tekstblokken binnen één ouder */
      const tekstig = 'p, h1, h2, h3, h4, ul, ol, dl';
      const krap = [];
      for (const ouder of document.querySelectorAll('.s22 section, .s22 .paneel, .s22 .kamer')) {
        const kinderen = [...ouder.querySelectorAll(':scope > ' + tekstig.split(', ').join(', :scope > '))]
          .filter((el) => { const cs = getComputedStyle(el); return cs.display !== 'none' && el.getBoundingClientRect().height > 4; });
        for (let i = 1; i < kinderen.length; i++) {
          const a = kinderen[i - 1].getBoundingClientRect(), b = kinderen[i].getBoundingClientRect();
          const gat = Math.round(b.top - a.bottom);
          if (gat >= 0 && gat < grens) {
            krap.push(`${gat}px tussen ${kinderen[i-1].tagName.toLowerCase()} en ${kinderen[i].tagName.toLowerCase()} — "${(kinderen[i-1].textContent||'').trim().slice(0,32)}"`);
          }
        }
      }
      /* 4 · NABIJHEID. Staat een onderschrift dichter bij de VOLGENDE kaart dan
         bij zijn eigen? Dan vertelt de ruimte het verkeerde verhaal. Dit is de
         fout die op de voorpagina op een telefoon zat: 12 pixels binnen een
         kaart, 11 ertussen. Op breed onzichtbaar, want dan liggen de kaarten
         naast elkaar en staat die afstand horizontaal. */
      const nabij = [];
      for (const lijst of document.querySelectorAll('.s22 ul, .s22 ol, .s22 .kaarten, .s22 .rij')) {
        const items = [...lijst.children].filter((el) => el.getBoundingClientRect().height > 20);
        if (items.length < 2) continue;
        /* alleen gestapeld: staan ze naast elkaar, dan gaat nabijheid niet op */
        const a = items[0].getBoundingClientRect(), b = items[1].getBoundingClientRect();
        if (b.top < a.bottom - 4) continue;
        /* ── EEN STREEP OF EEN VLAK DOET HET WERK OOK ─────────────────────
           Nabijheid is één manier om te zeggen "dit hoort bij elkaar"; een
           lijntje ertussen of een eigen vlak eronder is een andere, en die
           tellen even hard. Een genummerde stappenlijst met een border-top per
           regel mag daarom op nul staan — daar scheidt de streep. Zonder deze
           uitzondering meldde de meter negen van dat soort lijsten, en een
           meter die goede opmaak aanwijst leert niemand meer iets. */
        const st = getComputedStyle(items[1]);
        const streep = ['borderTopWidth', 'borderBottomWidth'].some((k) => parseFloat(st[k]) > 0);
        const vlak = st.backgroundColor && !/rgba\(0, 0, 0, 0\)|transparent/.test(st.backgroundColor);
        if (streep || vlak) continue;
        const tussen = Math.round(b.top - a.bottom);
        let binnen = 0;
        for (const it of items.slice(0, 3)) {
          const k = [...it.children].filter((el) => el.getBoundingClientRect().height > 4);
          for (let i = 1; i < k.length; i++) {
            const p1 = k[i - 1].getBoundingClientRect(), p2 = k[i].getBoundingClientRect();
            if (p2.top >= p1.bottom - 2) binnen = Math.max(binnen, Math.round(p2.top - p1.bottom));
          }
        }
        if (binnen > 2 && tussen <= binnen * 1.4) {
          nabij.push(`${lijst.tagName.toLowerCase()}.${String(lijst.className).split(' ')[0]}: ${tussen}px tussen de blokken, ${binnen}px erbinnen`);
        }
      }
      return { fout, kant, krap: [...new Set(krap)].slice(0, 4), nabij: [...new Set(nabij)].slice(0, 4) };
    }, ADEM[naam]);

    if (uit.kant !== null) ((kantlijnen[naam] ||= {})[uit.kant] ||= []).push(pad);
    if (uit.fout.length || uit.krap.length || uit.nabij.length) {
      meldingen += uit.fout.length + uit.krap.length + uit.nabij.length;
      console.log(`### ${pad} (${naam})`);
      for (const f of uit.fout) console.log('   overloop : ' + f);
      for (const k of uit.krap) console.log('   krap     : ' + k);
      for (const n of uit.nabij) console.log('   nabijheid: ' + n);
    }
    await p.close();
  }
}
await browser.close();

console.log('\n── de kantlijn per breedte ──');
for (const [naam, waarden] of Object.entries(kantlijnen)) {
  const rijen = Object.entries(waarden).sort((a, b) => b[1].length - a[1].length);
  console.log(`${naam}:`);
  for (const [px, paden] of rijen) {
    console.log(`   ${String(px).padStart(4)}px  ${paden.length}×${paden.length <= 4 ? '  ' + paden.join(', ') : ''}`);
  }
}
console.log(`\n${PADEN.length} pagina's × ${BREEDTES.length} breedtes · ${meldingen} melding(en)`);
