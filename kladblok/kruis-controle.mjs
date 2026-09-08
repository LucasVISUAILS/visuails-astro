/* DE SITE MET DE HAND DOORLOPEN, MAAR DAN ZONDER HAND — 7 september 2026
   ═══════════════════════════════════════════════════════════════════════════
   Lucas: "even de website handmatig gebruiken om te kijken of echt letterlijk
   alles werkt."

   Wat een mens doet als hij dat doet: elke pagina openen, kijken of er iets
   staat, op alles klikken wat een link is, en merken dat er iets kapot is. Dit
   doet precies dat, maar dan op elke pagina in beide talen, en het onthoudt wat
   het zag. Wat het NIET doet is oordelen over smaak — dat is kijkwerk, en daar
   zijn de schermafdrukken voor.

   Wat het meet, per pagina:
     · de statuscode
     · elke fout in de console en elk mislukt netwerkverzoek (een gebroken
       plaatje of een 404 op een stylesheet is precies wat je met het oog mist)
     · elke interne link die nergens heen gaat
     · lege koppen, lege knoppen, links zonder tekst
     · plaatjes zonder alt
     · zijwaartse overloop op 390px
     · een <html lang> die niet klopt met het pad

   Gebruik:  node kladblok/kruis-controle.mjs            (dev-server op 4331)
             BASIS=http://localhost:8788 node kladblok/kruis-controle.mjs */
import { chromium } from 'playwright';
import { browserPad } from '../scripts/lib/browserpad.mjs';

const BASIS = process.env.BASIS || 'http://localhost:4331';

/* Elke publieke pagina, in beide talen. De /start-pagina's staan erbij omdat
   juist dáár het formulier zit; /account, /admin en /o hebben hun eigen
   harnassen (studio-proef, admin-proef, keten-doorloop) omdat ze een sessie en
   een database nodig hebben. */
const PADEN = [
  '/', '/pricing', '/how-it-works', '/gallery', '/faq', '/about', '/contact',
  '/compare', '/models', '/custom-models', '/plans', '/studio', '/guides',
  '/upload-guidelines', '/test-sample', '/proef', '/portal', '/ai-act',
  '/catalog', '/catalog/classic', '/catalog/custom',
  '/lifestyle', '/lifestyle/glow', '/lifestyle/custom',
  '/video', '/video/motion', '/video/campaign',
  '/editions', '/hooks', '/thank-you',
  '/start', '/start/catalog', '/start/lifestyle', '/start/complete',
  '/start/video', '/start/plan', '/start/brand-model', '/start/custom-look',
];
const ALLE = [...PADEN, ...PADEN.map((p) => (p === '/' ? '/nl/' : `/nl${p}`))];

const browser = await chromium.launch({ executablePath: browserPad() });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });

/* Alles wat de pagina zelf ophaalt, in één emmer per pagina. */
let consoleFouten = [];
let netwerkFouten = [];
ctx.on('console', (m) => { if (m.type() === 'error') consoleFouten.push(m.text().slice(0, 160)); });
ctx.on('requestfailed', (r) => netwerkFouten.push(`${r.url().replace(BASIS, '')} ${r.failure()?.errorText || ''}`.slice(0, 160)));
ctx.on('response', (r) => { if (r.status() >= 400) netwerkFouten.push(`${r.status()} ${r.url().replace(BASIS, '')}`.slice(0, 160)); });

const bestaat = new Set();       // paden die 200 gaven
const gemist = new Map();        // pad → wie ernaar linkt
const rapport = [];
let stuk = 0;

const page = await ctx.newPage();

for (const pad of ALLE) {
  consoleFouten = []; netwerkFouten = [];
  const res = await page.goto(BASIS + pad, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => null);
  const status = res ? res.status() : 0;
  if (status === 200) bestaat.add(pad.replace(/\/$/, '') || '/');

  const uit = await page.evaluate(() => {
    const zichtbaar = (el) => {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    const tekstVan = (el) => (el.textContent || '').replace(/\s+/g, ' ').trim()
      || el.getAttribute('aria-label') || el.getAttribute('title') || '';

    const links = [...document.querySelectorAll('a[href]')]
      .filter((a) => zichtbaar(a))
      .map((a) => ({ href: a.getAttribute('href'), tekst: tekstVan(a) }));

    const leegLink = links.filter((l) => !l.tekst && !document.querySelector(`a[href="${CSS.escape(l.href)}"] img, a[href="${CSS.escape(l.href)}"] svg`)).map((l) => l.href);

    const leegKop = [...document.querySelectorAll('h1,h2,h3')]
      .filter((h) => zichtbaar(h) && !tekstVan(h)).map((h) => h.tagName);

    const leegKnop = [...document.querySelectorAll('button')]
      .filter((b) => zichtbaar(b) && !tekstVan(b) && !b.querySelector('svg,img')).length;

    const zonderAlt = [...document.querySelectorAll('img')]
      .filter((i) => zichtbaar(i) && i.getAttribute('alt') === null)
      .map((i) => (i.getAttribute('src') || '').split('/').pop());

    return {
      titel: document.title,
      lang: document.documentElement.lang,
      h1: [...document.querySelectorAll('h1')].filter(zichtbaar).map(tekstVan),
      links,
      leegLink, leegKop, leegKnop, zonderAlt,
      tekstlengte: (document.body.innerText || '').trim().length,
    };
  }).catch(() => null);

  /* Interne links verzamelen om ze straks tegen de lijst te houden. */
  if (uit) {
    for (const l of uit.links) {
      if (!l.href || /^(https?:|mailto:|tel:|#|javascript:)/.test(l.href)) continue;
      const doel = l.href.split('#')[0].split('?')[0].replace(/\/$/, '') || '/';
      if (!gemist.has(doel)) gemist.set(doel, new Set());
      gemist.get(doel).add(pad);
    }
  }

  /* 390px: loopt er iets buiten beeld? */
  await page.setViewportSize({ width: 390, height: 844 });
  const breed = await page.evaluate(() => document.documentElement.scrollWidth).catch(() => 0);
  await page.setViewportSize({ width: 1440, height: 900 });

  const taalVerwacht = pad.startsWith('/nl') ? 'nl' : 'en';
  const problemen = [];
  if (status !== 200) problemen.push(`status ${status}`);
  if (uit && !uit.titel) problemen.push('geen <title>');
  if (uit && uit.h1.length === 0) problemen.push('geen zichtbare h1');
  if (uit && uit.h1.length > 1) problemen.push(`${uit.h1.length} h1's`);
  if (uit && uit.lang && !uit.lang.startsWith(taalVerwacht)) problemen.push(`lang="${uit.lang}" op een ${taalVerwacht}-pad`);
  if (uit && uit.tekstlengte < 200) problemen.push(`bijna geen tekst (${uit.tekstlengte} tekens)`);
  if (uit && uit.leegKop.length) problemen.push(`lege kop: ${uit.leegKop.join(',')}`);
  if (uit && uit.leegKnop) problemen.push(`${uit.leegKnop} knop(pen) zonder tekst`);
  if (uit && uit.leegLink.length) problemen.push(`link zonder tekst: ${uit.leegLink.slice(0, 3).join(' ')}`);
  if (uit && uit.zonderAlt.length) problemen.push(`img zonder alt: ${uit.zonderAlt.slice(0, 3).join(' ')}`);
  if (breed > 391) problemen.push(`zijwaartse overloop op 390px: ${breed}px`);
  if (consoleFouten.length) problemen.push(`console: ${consoleFouten.slice(0, 2).join(' | ')}`);
  if (netwerkFouten.length) problemen.push(`netwerk: ${[...new Set(netwerkFouten)].slice(0, 3).join(' | ')}`);

  if (problemen.length) { stuk++; rapport.push(`\n${pad}\n   ${problemen.join('\n   ')}`); }
  else rapport.push(`✓ ${pad}`);
  process.stdout.write(problemen.length ? 'x' : '.');
}

/* Links die nergens heen gaan. Alleen paden die we zelf hebben bezocht kunnen
   we met zekerheid goedkeuren; de rest wordt apart opgehaald. */
const teControleren = [...gemist.keys()].filter((p) => !bestaat.has(p));
const dood = [];
for (const p of teControleren) {
  const r = await page.goto(BASIS + p, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => null);
  if (!r || r.status() >= 400) dood.push(`${p} (${r ? r.status() : 'geen antwoord'}) ← ${[...gemist.get(p)].slice(0, 3).join(', ')}`);
  process.stdout.write(r && r.status() < 400 ? '.' : 'x');
}

console.log('\n' + rapport.join('\n'));
console.log(`\n${'─'.repeat(70)}`);
console.log(dood.length ? `DODE INTERNE LINKS (${dood.length}):\n  ${dood.join('\n  ')}` : 'Geen dode interne links.');
console.log(`\n${ALLE.length} pagina's bekeken · ${stuk} met een opmerking · ${gemist.size} verschillende interne linkdoelen`);
await browser.close();
process.exit(stuk || dood.length ? 1 : 0);
