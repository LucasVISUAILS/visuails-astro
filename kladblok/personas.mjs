/* WAT ZES VERSCHILLENDE MENSEN TEGENKOMEN — 7 september 2026
   ═══════════════════════════════════════════════════════════════════════════
   Lucas: "doe een controle om te kijken hoe de klantervaring op dit moment is.
   Bekijk het vanuit verschillende personen met verschillende leeftijden en
   persoonlijkheden."

   kladblok/klantreis.mjs legde vast WAT er staat. Dit meet de dingen waar een
   PERSOON op stukloopt, en die per persoon verschillen:

     · raakvlakken kleiner dan 44px          — vingers van 62, en iedereen op de trein
     · de kleinste lettergrootte in lopende tekst — leesbaarheid zonder bril
     · zinslengte en woordlengte              — haast, tweede taal, weinig geduld
     · Engelse leenwoorden in de NL-tekst     — de Nederlandse winkelier
     · hoe ver de eerstvolgende mens weg is   — de twijfelaar
     · hoeveel velden er verplicht zijn       — de ongeduldige

   node kladblok/personas.mjs */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { browserPad } from '../scripts/lib/browserpad.mjs';

const BASIS = process.env.BASIS || 'http://localhost:4331';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

const PADEN = ['/', '/how-it-works', '/pricing', '/catalog', '/lifestyle', '/video',
  '/test-sample', '/start', '/faq', '/contact', '/plans', '/gallery', '/studio'];
const NL = PADEN.map((p) => (p === '/' ? '/nl/' : `/nl${p}`));

/* Engelse woorden die in de Nederlandse tekst blijven staan. Niet elk leenwoord
   is fout — "online" is Nederlands geworden — maar deze lijst is wat een
   winkelier van 55 met een halve seconde aarzeling leest. */
const LEENWOORDEN = ['turnaround', 'lead time', 'checkout', 'shoot', 'brand', 'lifestyle',
  'catalog', 'catalogue', 'sample', 'plan', 'credits', 'upload', 'download', 'briefing',
  'deadline', 'workflow', 'dashboard', 'preview', 'render', 'output', 'asset', 'mockup',
  'template', 'batch', 'delivery', 'revision', 'account', 'login', 'sign in'];

const browser = await chromium.launch({ executablePath: browserPad() });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
await page.goto(`${BASIS}/`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
for (const t of ['Only what is necessary', 'Alleen het noodzakelijke']) {
  const k = page.getByRole('button', { name: new RegExp(t, 'i') });
  if (await k.count()) { await k.first().click().catch(() => {}); await page.waitForTimeout(400); break; }
}

const alles = [];
for (const pad of [...PADEN, ...NL]) {
  await page.goto(BASIS + pad, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => null);
  await page.waitForTimeout(1200);

  const uit = await page.evaluate((woorden) => {
    const zichtbaar = (el) => {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.15) return false;
      const r = el.getBoundingClientRect();
      return r.width > 1 && r.height > 1;
    };
    const tekst = (el) => (el.textContent || '').replace(/\s+/g, ' ').trim();

    /* ── raakvlakken ── 44px is de ondergrens die Apple en Google allebei noemen
       en die iedereen met een minder vaste hand meteen merkt. */
    const klikbaar = [...document.querySelectorAll('a, button, input[type="submit"], [role="button"], summary, label')]
      .filter(zichtbaar)
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { t: tekst(el).slice(0, 34), w: Math.round(r.width), h: Math.round(r.height),
          inKader: !!el.closest('header, nav, footer') };
      });
    const klein = klikbaar.filter((k) => k.h < 44 && k.t);

    /* ── lettergrootte in LOPENDE tekst, niet in etiketten ── */
    const lopend = [...document.querySelectorAll('p, li, dd')]
      .filter((el) => zichtbaar(el) && tekst(el).split(/\s+/).length > 6);
    const groottes = lopend.map((el) => Math.round(parseFloat(getComputedStyle(el).fontSize) * 10) / 10);

    /* ── zinnen ── */
    const bodyTekst = lopend.map(tekst).join(' ');
    const zinnen = bodyTekst.split(/(?<=[.!?])\s+/).map((z) => z.trim()).filter((z) => z.split(/\s+/).length > 2);
    const lengtes = zinnen.map((z) => z.split(/\s+/).length);
    const lang = zinnen.filter((z) => z.split(/\s+/).length > 28).slice(0, 3);

    /* ── leenwoorden, alleen op NL-pagina's ── */
    const laag = bodyTekst.toLowerCase();
    const gevonden = woorden.filter((w) => new RegExp(`(^|[^a-z])${w}([^a-z]|$)`, 'i').test(laag));

    /* ── de eerstvolgende mens ── */
    const mensRe = /(whatsapp|bel |bellen|telefoon|phone|mail ons|email us|contact|spreek|talk to)/i;
    const mens = [...document.querySelectorAll('a')]
      .filter((el) => zichtbaar(el) && mensRe.test(tekst(el) + ' ' + (el.getAttribute('href') || '')))
      .map((el) => ({ t: tekst(el).slice(0, 30), y: Math.round(el.getBoundingClientRect().top + window.scrollY),
        inKader: !!el.closest('header, nav, footer') }))
      .sort((a, b) => a.y - b.y);
    const mensBuitenKader = mens.filter((m) => !m.inKader)[0] || null;

    /* ── velden ── */
    const velden = [...document.querySelectorAll('input, select, textarea')]
      .filter((el) => zichtbaar(el) && !['hidden', 'submit', 'button'].includes(el.type));
    const verplicht = velden.filter((el) => el.required || el.getAttribute('aria-required') === 'true');

    return {
      klikbaar: klikbaar.length,
      kleinAantal: klein.length,
      kleinBuitenKader: klein.filter((k) => !k.inKader).length,
      kleinste: klein.sort((a, b) => a.h - b.h).slice(0, 4),
      kleinsteTekst: groottes.length ? Math.min(...groottes) : null,
      alineas: lopend.length,
      zinnen: zinnen.length,
      gemZin: lengtes.length ? Math.round((lengtes.reduce((a, b) => a + b, 0) / lengtes.length) * 10) / 10 : 0,
      langsteZin: lengtes.length ? Math.max(...lengtes) : 0,
      langeZinnen: lang.map((z) => z.slice(0, 150)),
      leenwoorden: gevonden,
      mensY: mensBuitenKader ? mensBuitenKader.y : null,
      mensT: mensBuitenKader ? mensBuitenKader.t : null,
      mensInKader: mens.some((m) => m.inKader),
      velden: velden.length,
      verplicht: verplicht.length,
    };
  }, LEENWOORDEN);

  alles.push({ pad, ...uit });
  const nl = pad.startsWith('/nl');
  console.log(`\n${pad}`);
  console.log(`   raakvlak <44px: ${uit.kleinAantal}/${uit.klikbaar} (buiten kop/voet: ${uit.kleinBuitenKader})${uit.kleinste[0] ? ` · kleinste "${uit.kleinste[0].t}" ${uit.kleinste[0].h}px` : ''}`);
  console.log(`   lopende tekst: ${uit.alineas} alinea's · kleinste ${uit.kleinsteTekst}px · zin gem. ${uit.gemZin} woorden, langste ${uit.langsteZin}`);
  if (nl && uit.leenwoorden.length) console.log(`   engels in NL: ${uit.leenwoorden.join(', ')}`);
  console.log(`   mens bereikbaar: ${uit.mensY !== null ? `"${uit.mensT}" op ${uit.mensY}px` : (uit.mensInKader ? 'alleen in kop/voet' : 'NERGENS')}`);
  if (uit.velden) console.log(`   velden: ${uit.velden}, waarvan ${uit.verplicht} verplicht`);
}

fs.writeFileSync(path.join(ROOT, 'kladblok', 'klantreis', 'personas.json'), JSON.stringify(alles, null, 1));
console.log(`\n${alles.length} pagina's · kladblok/klantreis/personas.json`);
await browser.close();
