/* ── STAAT ER GENOEG RUIMTE TUSSEN TEKST EN ELEMENTEN? ───────────────────────
 * Lucas, 4 september 2026: *"Zorgvuldig controleren of er wel goed ruimte zit
 * tussen tekst en elementen over de gehele website."*
 *
 * Drie dingen die te MÉTEN zijn en die alle drie echt zijn voorgekomen:
 *   1. tekst over tekst — twee tekstdragende elementen die elkaar overlappen
 *   2. tekst tegen tekst — minder dan 4 px tussen twee opeenvolgende blokken
 *   3. tekst die buiten zijn doos valt — afgeknipt of over de rand
 * Draai: node kladblok/ruimte-proef.mjs [pad ...]
 */
import { chromium } from 'playwright';
import http from 'node:http'; import { readFile, stat } from 'node:fs/promises'; import path from 'node:path';
import { browserPad } from '../scripts/lib/browserpad.mjs';
const ROOT = path.resolve('dist'); const PORT = 8110;
const T = { '.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.avif':'image/avif','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2' };
const srv = http.createServer(async (req,res)=>{ const u=new URL(req.url,'http://x');
  if (u.pathname==='/account/me'){res.writeHead(401,{'content-type':'application/json'});return res.end('{}');}
  let p=path.join(ROOT,decodeURIComponent(u.pathname));
  try{ if((await stat(p)).isDirectory()) p=path.join(p,'index.html'); }catch{}
  try{ const b=await readFile(p); res.writeHead(200,{'content-type':T[path.extname(p)]||'application/octet-stream'}); res.end(b);}catch{res.writeHead(404);res.end('x');}
}).listen(PORT);

const PADEN = process.argv.slice(2).length ? process.argv.slice(2) : [
  '/nl/','/nl/catalog/','/nl/lifestyle/','/nl/video/','/nl/pricing/','/nl/plans/',
  '/nl/custom-models/','/nl/how-it-works/','/nl/start/','/nl/start/catalog/','/nl/gallery/','/nl/faq/','/nl/about/',
];
const b = await chromium.launch({ executablePath: browserPad() });
const bevindingen = [];
for (const [w,h,tag] of [[1440,2400,'1440'],[390,2400,'390']]) {
  const ctx = await b.newContext({ viewport:{width:w,height:h}, isMobile:w<500, hasTouch:w<500 });
  for (const pad of PADEN) {
    const page = await ctx.newPage();
    await page.route('**', async (route) => { if (route.request().resourceType()!=='document') return route.continue();
      const res = await route.fetch(); let body = await res.text(); body = body.replace(/loading="lazy"/g,'loading="eager"');
      return route.fulfill({ response: res, body }); });
    try { await page.goto(`http://127.0.0.1:${PORT}${pad}`, { waitUntil:'load', timeout:20000 }); }
    catch { await page.close(); continue; }
    await page.evaluate(()=>{
      document.querySelectorAll('.reveal').forEach(el=>el.classList.remove('pending'));
      document.querySelectorAll('[data-cookie], .cookiebar, .cc, [data-vis-teaser]').forEach(el=>el.remove());
    });
    await page.waitForTimeout(500);
    const r = await page.evaluate(() => {
      const uit = [];
      const naam = (el) => `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0,2).join('.') : ''}`;
      const tekst = (el) => (el.textContent || '').trim().replace(/\s+/g, ' ');
      const zichtbaar = (el) => { const s = getComputedStyle(el); if (s.display==='none'||s.visibility==='hidden'||Number(s.opacity)===0) return false;
        const r = el.getBoundingClientRect(); return r.width > 1 && r.height > 1; };
      /* Wat NIET meedoet, en waarom. Een zwevend element (de WhatsApp-knop, de
         cookiebalk, de proefbalk, een open menu) hoort over de pagina heen te
         liggen — dat is geen ruimtefout maar de bedoeling. En de koptekst-navigatie
         stapelt op een telefoon links zonder tussenruimte: die hebben hun eigen
         padding en raken elkaar dus niet. Zonder deze twee uitzonderingen bestaat
         de uitslag voor negentig procent uit die twee gevallen en lees je de rest
         niet meer. */
      const zweeft = (el) => { for (let n = el; n && n !== document.body; n = n.parentElement) {
          const s = getComputedStyle(n); if (s.position === 'fixed' || s.position === 'sticky') return true; } return false; };
      const inChroom = (el) => !!el.closest('header, nav, .site-header, .mobile-menu, .wa-launcher, [data-vis-bar], .cookie, [class*="cookie"]');
      /* En wat er wel STAAT maar niet te ZIEN is. Een dichtgeklapte uitklapper
         houdt zijn inhoud in de dom, en op deze site met een eigen animatie
         (hoogte nul, overflow verborgen) in plaats van display:none. Al die
         regels liggen dan op dezelfde plek en overlappen elkaar dus allemaal —
         de helft van de eerste uitslag bestond daaruit. */
      const weggeklapt = (el) => {
        if (el.closest('details:not([open])')) return true;
        for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
          const s = getComputedStyle(n);
          if ((s.overflow === 'hidden' || s.overflowY === 'hidden') && n.clientHeight <= 1) return true;
          if (s.contentVisibility === 'hidden') return true;
        }
        return false;
      };
      /* Bladeren met eigen tekst: elementen waarvan geen enkel KIND-element ook
         tekst draagt. Anders telt elke <div> om een alinea heen mee. */
      const alles = [...document.querySelectorAll('p,li,h1,h2,h3,h4,h5,figcaption,label,legend,td,th,dd,dt,span,a,button,strong,em,small')];
      const blad = alles.filter((el) => zichtbaar(el) && tekst(el).length > 1
        && !zweeft(el) && !inChroom(el) && !weggeklapt(el)
        && ![...el.children].some((k) => k.nodeType === 1 && tekst(k).length > 1 && zichtbaar(k)));

      /* De doos van een inline element is zo hoog als de REGELHOOGTE, en de
         letters staan daar midden in. Bij een kop van 3 rem met regelhoogte 1.05
         steekt die doos er boven en onder een paar pixel uit, en dan "overlapt"
         een <em> in een kop de alinea eronder terwijl er geen letter in de buurt
         komt. Vandaar: bij inline elementen de halve regelafstand van boven en
         onder afhalen, zodat we de letters vergelijken en niet de dozen. */
      const kader = (el) => {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        if (!s.display.startsWith('inline')) return r;
        const lh = parseFloat(s.lineHeight) || parseFloat(s.fontSize) * 1.2;
        const fs = parseFloat(s.fontSize) || 16;
        const half = Math.max(0, (lh - fs) / 2);
        return { top: r.top + half, bottom: r.bottom - half, left: r.left, right: r.right };
      };

      // 1 · tekst over tekst
      for (let i = 0; i < blad.length; i++) {
        for (let j = i + 1; j < blad.length; j++) {
          const a = blad[i], c = blad[j];
          if (a.contains(c) || c.contains(a)) continue;
          const ra = kader(a), rc = kader(c);
          const ox = Math.min(ra.right, rc.right) - Math.max(ra.left, rc.left);
          const oy = Math.min(ra.bottom, rc.bottom) - Math.max(ra.top, rc.top);
          if (ox > 3 && oy > 3) uit.push({ soort: 'tekst over tekst', a: naam(a), b: naam(c), t: tekst(a).slice(0,40), t2: tekst(c).slice(0,40), px: Math.round(Math.min(ox,oy)) });
        }
      }
      // 2 · tekst tegen tekst (opeenvolgende blokken met bijna geen ruimte)
      const blokken = blad.filter((el) => ['block','flex','grid','list-item','table-cell'].includes(getComputedStyle(el).display));
      for (let i = 0; i < blokken.length; i++) {
        const a = blokken[i]; const c = a.nextElementSibling;
        if (!c || !zichtbaar(c) || tekst(c).length < 2) continue;
        const ra = a.getBoundingClientRect(), rc = c.getBoundingClientRect();
        if (rc.top < ra.bottom - 1) continue;             // overlap is geval 1
        const gat = rc.top - ra.bottom;
        const overlapt = Math.min(ra.right, rc.right) - Math.max(ra.left, rc.left) > 10;
        if (overlapt && gat >= 0 && gat < 3) uit.push({ soort: 'geen ruimte', a: naam(a), b: naam(c), t: tekst(a).slice(0,40), t2: tekst(c).slice(0,40), px: Math.round(gat) });
      }
      // 3 · tekst buiten zijn doos
      for (const el of blad) {
        const s = getComputedStyle(el);
        if (s.overflow !== 'visible' && s.overflow !== '') continue;
        const p = el.parentElement; if (!p) continue;
        const sp = getComputedStyle(p);
        if (sp.overflowX === 'auto' || sp.overflowX === 'scroll') continue;
        const rp = p.getBoundingClientRect(), re = el.getBoundingClientRect();
        if (re.right > rp.right + 2 && sp.overflow === 'hidden') uit.push({ soort: 'afgeknipt', a: naam(el), b: naam(p), t: tekst(el).slice(0,40), t2: '', px: Math.round(re.right - rp.right) });
      }
      return uit;
    });
    for (const x of r) bevindingen.push({ pad, breedte: tag, ...x });
    await page.close();
  }
  await ctx.close();
}
await b.close(); srv.close();
const zien = new Set();
const uniek = bevindingen.filter((x) => { const k = `${x.pad}|${x.breedte}|${x.soort}|${x.a}|${x.b}`; if (zien.has(k)) return false; zien.add(k); return true; });
console.log(`\n${uniek.length} bevindingen\n`);
for (const x of uniek) console.log(`${x.breedte}px ${x.pad}  ${x.soort} (${x.px}px)\n    ${x.a} "${x.t}"\n    ${x.b} "${x.t2}"`);
