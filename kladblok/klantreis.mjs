/* DE KLANTREIS, VASTGELEGD OM NAAR TE KIJKEN — 7 september 2026
   ═══════════════════════════════════════════════════════════════════════════
   Lucas: "doe een controle om te kijken hoe de klantervaring op dit moment is.
   Bekijk het vanuit verschillende personen met verschillende leeftijden en
   persoonlijkheden."

   Dat is kijkwerk, geen meetwerk — kladblok/kruis-controle.mjs doet het meten al.
   Maar kijken zonder iets om naar te kijken wordt speculeren, en daar heeft
   niemand iets aan. Dit legt vast wat er STAAT: per pagina een schermafdruk op
   twee breedtes, de eerste woorden die iemand leest, de knoppen die er zijn, en
   de weg die ze aanbieden.

   WAT HET WEL MEET, want het is zonde om er niet naar te kijken als je toch de
   pagina open hebt:
     · hoeveel woorden er boven de vouw staan (1440 en 390)
     · welke handeling als eerste wordt aangeboden, en hoe ver naar beneden
     · of er een prijs op de pagina staat en waar
     · hoe lang de pagina is
     · hoeveel klikken tot de eerste prijs, vanaf de voorpagina

     node kladblok/klantreis.mjs            → de hele reis, beide talen
     node kladblok/klantreis.mjs /nl/ /nl/pricing */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { browserPad } from '../scripts/lib/browserpad.mjs';

const BASIS = process.env.BASIS || 'http://localhost:4331';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'kladblok', 'klantreis');
fs.mkdirSync(OUT, { recursive: true });

/* De reis zoals een klant hem loopt, niet zoals de sitemap hem opsomt. */
const REIS = [
  '/', '/how-it-works', '/pricing', '/gallery', '/catalog', '/lifestyle', '/video',
  '/test-sample', '/start', '/start/catalog', '/faq', '/contact', '/studio', '/plans',
];
const PADEN = process.argv.length > 2
  ? process.argv.slice(2)
  : [...REIS, ...REIS.map((p) => (p === '/' ? '/nl/' : `/nl${p}`))];

const browser = await chromium.launch({ executablePath: browserPad() });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

/* De cookiemelding staat over de onderkant en zit op elke afdruk in de weg.
   Eén keer wegklikken; het cookie geldt voor de hele context. */
await page.goto(`${BASIS}/`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);
for (const t of ['Only what is necessary', 'Alleen het noodzakelijke']) {
  const k = page.getByRole('button', { name: new RegExp(t, 'i') });
  if (await k.count()) { await k.first().click().catch(() => {}); await page.waitForTimeout(500); break; }
}

const regels = [];
for (const pad of PADEN) {
  await page.goto(BASIS + pad, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => null);
  await page.waitForTimeout(1600);

  for (const [maat, w, h] of [['breed', 1440, 900], ['telefoon', 390, 844]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(500);

    const uit = await page.evaluate((hoogte) => {
      const zichtbaar = (el) => {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.15) return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      };
      const tekst = (el) => (el.textContent || '').replace(/\s+/g, ' ').trim();

      /* Wat staat er BOVEN DE VOUW — dus zonder scrollen. Dat is het enige stuk
         pagina waarvan je zeker weet dat iemand het gezien heeft. */
      const bovenDeVouw = [...document.querySelectorAll('h1,h2,h3,p,li,a,button,span')]
        .filter((el) => zichtbaar(el) && el.getBoundingClientRect().top < hoogte && el.getBoundingClientRect().bottom > 0)
        .filter((el) => !el.querySelector('h1,h2,h3,p,li,a,button,span'))
        .map(tekst).filter(Boolean);
      const woordenBoven = bovenDeVouw.join(' ').split(/\s+/).filter(Boolean).length;

      /* De eerste echte handeling: een knop of een knopachtige link, en hoe ver
         naar beneden hij staat. Navigatie en taalschakelaar tellen niet — dat is
         chroom, geen aanbod. */
      const isChroom = (el) => !!el.closest('header, nav, footer, [data-cookie], .cookie, .cc');
      const acties = [...document.querySelectorAll('a.knop, a.btn, button.knop, button.btn, a[class*="cta"], button[type="submit"]')]
        .filter((el) => zichtbaar(el) && !isChroom(el))
        .map((el) => ({ t: tekst(el), y: Math.round(el.getBoundingClientRect().top + window.scrollY) }))
        .filter((a) => a.t)
        .sort((a, b) => a.y - b.y);

      /* Staat er een bedrag op de pagina, en hoe ver naar beneden het eerste? */
      const prijsRe = /(€|EUR)\s?\d/;
      const prijsEl = [...document.querySelectorAll('*')]
        .filter((el) => zichtbaar(el) && !el.children.length && prijsRe.test(tekst(el)))
        .map((el) => ({ t: tekst(el).slice(0, 40), y: Math.round(el.getBoundingClientRect().top + window.scrollY) }))
        .sort((a, b) => a.y - b.y)[0] || null;

      return {
        titel: document.title,
        h1: [...document.querySelectorAll('h1')].filter(zichtbaar).map(tekst)[0] || '',
        eersteWoorden: bovenDeVouw.slice(0, 14).join(' · ').slice(0, 320),
        woordenBoven,
        acties: acties.slice(0, 4),
        prijs: prijsEl,
        hoog: document.documentElement.scrollHeight,
        koppen: [...document.querySelectorAll('h2')].filter(zichtbaar).map(tekst).slice(0, 12),
      };
    }, h);

    const slug = `${pad.replace(/\W+/g, '-').replace(/^-|-$/g, '') || 'home'}-${maat}`;
    await page.screenshot({ path: path.join(OUT, `${slug}.png`), fullPage: maat === 'breed' });

    regels.push({ pad, maat, ...uit });
    if (maat === 'breed') {
      console.log(`\n${pad}`);
      console.log(`   "${uit.h1}"  ·  ${uit.hoog}px lang`);
      console.log(`   boven de vouw: ${uit.woordenBoven} woorden`);
      console.log(`   eerste actie: ${uit.acties[0] ? `"${uit.acties[0].t}" op ${uit.acties[0].y}px` : 'GEEN'}`);
      console.log(`   eerste prijs: ${uit.prijs ? `${uit.prijs.t} op ${uit.prijs.y}px` : 'geen bedrag'}`);
      console.log(`   kopjes: ${uit.koppen.slice(0, 5).join(' | ') || '—'}`);
    } else {
      console.log(`   op 390: ${uit.woordenBoven} woorden boven de vouw · eerste actie ${uit.acties[0] ? `op ${uit.acties[0].y}px` : 'geen'}`);
    }
  }
}

fs.writeFileSync(path.join(OUT, 'reis.json'), JSON.stringify(regels, null, 1));
console.log(`\n${PADEN.length} pagina's · afdrukken in kladblok/klantreis/ · gegevens in reis.json`);
await browser.close();
