/*
 * VISUAILS — STAAT ER RUIMTE TUSSEN TEKSTEN EN ELEMENTEN?
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Lucas, 9 september 2026: *"Er zitten geen spaties tussen. Zorg dat er altijd
 * ruimte zit tussen teksten en elementen."*
 *
 * ── DE FOUT DIE DIT VANGT ──────────────────────────────────────────────────
 *
 * Twee tekstelementen die naast elkaar staan en elkaar RAKEN: "GezichtAva",
 * "ogen?Vraag". Hij ontstaat op drie manieren, en alle drie zijn ze onzichtbaar
 * in de bron:
 *
 *   1. Astro knipt witruimte weg tussen een expressie en een element, dus
 *      `{a} <b>{c}</b>` levert soms `ac` op.
 *   2. Een `gap` op een flexrij die niet aankomt — bijvoorbeeld omdat de
 *      kinderen door JavaScript zijn gemaakt en Astro's scoped CSS ze daarom
 *      niet raakt (`data-astro-cid`). Dit is precies wat er op 9 september bij
 *      de merkkit-strook gebeurde.
 *   3. Een `margin` die door een latere regel op nul wordt gezet.
 *
 * Geen daarvan is te zien in een test die de HTML leest, want in de HTML staat
 * het goed. Het is alleen te MÉTEN, in echte pixels, in een echte browser.
 *
 * ── HOE ───────────────────────────────────────────────────────────────────
 *
 * Voor elk paar tekstelementen dat op DEZELFDE REGEL staat (hun verticale
 * midden ligt binnen een halve regelhoogte van elkaar) en direct na elkaar
 * komt: hoeveel pixels zit ertussen? Nul of bijna nul is een fout, tenzij het
 * ene element in het andere zit of er leestekens tussen staan die er hóren te
 * plakken — een punt achter een woord raakt dat woord met opzet.
 *
 * Gebruik:  node kladblok/spatie.mjs [pad ...]   (dev-server op 4331)
 */
import { chromium } from 'playwright';

const BASIS = 'http://localhost:4331';
const PADEN = process.argv.slice(2).length ? process.argv.slice(2) : [
  '/nl/', '/nl/start', '/nl/start/catalog', '/nl/start/lifestyle', '/nl/start/complete',
  '/nl/start/plan', '/nl/pricing', '/nl/plans', '/nl/how-it-works', '/nl/catalog',
  '/nl/lifestyle', '/nl/about', '/nl/contact', '/nl/test-sample', '/nl/faq',
  '/start/catalog', '/pricing', '/how-it-works',
];
const ONDERGRENS = 2;   // px — daaronder raken ze elkaar

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
let meldingen = 0;

for (const pad of PADEN) {
  const p = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try { await p.goto(BASIS + pad, { waitUntil: 'load', timeout: 25000 }); } catch { await p.close(); continue; }
  await p.waitForTimeout(900);

  const raak = await p.evaluate((grens) => {
    const uit = [];
    /* Leestekens die er hóren te plakken. Een punt, een komma of een sluithaakje
       achter een woord is geen fout maar typografie. */
    const PLAKT = /^[.,;:!?)\]}»…%‰°'"’”\-–—/]|[(\[{«'"‘“\-–—/]$/;
    const zichtbaar = (el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
    };
    const tekstVan = (el) => (el.textContent || '').replace(/\s+/g, ' ').trim();

    for (const ouder of document.querySelectorAll('body *')) {
      const kinderen = [...ouder.children].filter((k) => {
        if (!zichtbaar(k)) return false;
        const d = getComputedStyle(k).display;
        /* Alleen elementen die NAAST elkaar kunnen staan. Een blok onder een
           blok raakt verticaal en dat meet te-dicht.mjs al. */
        if (d === 'block' || d === 'grid' || d === 'table' || d === 'list-item') return false;
        return tekstVan(k).length > 0;
      });
      if (kinderen.length < 2) continue;

      for (let i = 0; i < kinderen.length - 1; i += 1) {
        const a = kinderen[i];
        const b = kinderen[i + 1];
        /* ── DE LETTERS METEN EN NIET DE DOZEN ─────────────────────────────
           De eerste versie mat `getBoundingClientRect()` van de elementen zelf,
           en die geeft de RANDDOOS. Twee tabelcellen naast elkaar raken elkaar
           altijd — hun ruimte zit als padding BINNEN de cel — dus meldde hij de
           hele prijstabel, de taalwissel en de stappenbalk. Eenennegentig
           meldingen, geen enkele echt.

           Een Range over de inhoud geeft de doos om de LETTERS. Daar zit de
           padding buiten, en dan is "€89 ✕ €109" in een tabel opeens 40 pixels
           uit elkaar terwijl "GezichtAva" nul blijft. Dat is precies het
           verschil dat deze meter moet zien. */
        /* Het LAATSTE tekstknooppunt van a en het EERSTE van b, en een Range om
           precies dat knooppunt. Een Range over de hele inhoud is niet genoeg:
           bevat een element blokkinderen (zoals de stappenbalk, waar elke stap
           een nummer en een label onder elkaar zet), dan rekt die Range mee tot
           de volle breedte van het blok en meet je alsnog dozen. */
        const tekstRand = (el, laatste) => {
          const wandel = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
            acceptNode: (n) => (n.nodeValue && n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
          });
          let gevonden = null;
          while (wandel.nextNode()) {
            gevonden = wandel.currentNode;
            if (!laatste) break;
          }
          if (!gevonden) return el.getBoundingClientRect();
          const r = document.createRange();
          r.selectNodeContents(gevonden);
          const dozen = [...r.getClientRects()].filter((d) => d.width > 0);
          if (!dozen.length) return el.getBoundingClientRect();
          /* Breekt de tekst over meer regels, dan telt de regel die aan de
             buurman grenst: de laatste voor a, de eerste voor b. */
          return laatste ? dozen[dozen.length - 1] : dozen[0];
        };
        const ra = tekstRand(a, true);
        const rb = tekstRand(b, false);
        /* Dezelfde regel? Hun middens moeten binnen een halve regelhoogte van
           elkaar liggen; anders staat b onder a en is dit geen naast-elkaar. */
        const midA = ra.top + ra.height / 2;
        const midB = rb.top + rb.height / 2;
        if (Math.abs(midA - midB) > Math.max(ra.height, rb.height) / 2) continue;
        if (rb.left < ra.left) continue;          // omgekeerde volgorde (rtl of wrap)
        const gat = rb.left - ra.right;
        if (gat >= grens || gat < -4) continue;   // ruim genoeg, of ze overlappen (ander probleem)

        const ta = tekstVan(a);
        const tb = tekstVan(b);
        /* Eindigt a op een openend teken of begint b met een sluitend teken,
           dan hoort het te plakken. */
        if (PLAKT.test(tb[0]) || PLAKT.test(ta[ta.length - 1])) continue;
        /* Een element dat alleen een teken draagt (een pijl, een bolletje) is
           een sierteken en geen tekst. */
        if (ta.length < 2 || tb.length < 2) continue;

        uit.push({
          gat: Math.round(gat),
          a: ta.slice(0, 34),
          b: tb.slice(0, 34),
          waar: `${ouder.tagName.toLowerCase()}.${String(ouder.className || '').trim().split(/\s+/)[0] || '—'}`,
        });
      }
    }
    /* Eén melding per plek: dezelfde fout op dertig productkaarten is één fout. */
    const gezien = new Set();
    return uit.filter((m) => {
      const s = `${m.waar}|${m.a}|${m.b}`;
      if (gezien.has(s)) return false;
      gezien.add(s);
      return true;
    });
  }, ONDERGRENS);

  if (raak.length) {
    console.log('###', pad);
    for (const m of raak) {
      meldingen += 1;
      console.log(`   ${String(m.gat).padStart(2)}px  "${m.a}" ✕ "${m.b}"   in ${m.waar}`);
    }
  }
  await p.close();
}

await browser.close();
console.log(meldingen
  ? `\n${meldingen} plek(ken) waar twee teksten elkaar raken.`
  : '\nOveral ruimte tussen teksten en elementen.');
