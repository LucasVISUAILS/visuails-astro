/* Leesbaarheid van Studio, gemeten in een echte browser.
 *
 *   node scripts/dash-leesbaar.mjs               # licht (de beginstand)
 *   VISUAILS_THEMA=donker node scripts/dash-leesbaar.mjs
 *   VISUAILS_NAV=dicht …                          # met de zijbalk ingeklapt
 *
 * ── WAAROM DIT NAAST tests/leesbaar.test.mjs BESTAAT ────────────────────────
 *
 * Die toets loopt over de GEBOUWDE pagina's in dist/. Studio staat daar niet
 * bij: dat wordt per verzoek door de Worker gerenderd en bestaat dus nergens als
 * bestand. Precies daar zit de meeste kans op deze fout, want daar staan de
 * meeste tinten uit een trap die voor drie verschillende vlakken moet kloppen.
 *
 * Deze veeg vond op 28 augustus 2026 één echte fout: "nog niet ingesteld" op de
 * vaste-lookkaart stond op `--ink-4`, en die trede is `--ink-300`. Gemeten
 * 1,84:1. De enige onleesbare tekst op het hele dashboard, en uitgerekend de
 * tekst die zegt dat je nog iets moet doen.
 *
 * ── 6 SEPTEMBER 2026: DE ECHTE WORKER, DE ECHTE NEPDATA ─────────────────────
 *
 * Hier stond een fixture van een paar honderd regels voor de oude renderer in
 * account.js. Die renderer is weg; Studio is een stel Astro-pagina's. Dit
 * script meet nu op de gebouwde Worker, in dit proces, met de nepdata die ook
 * tests/studio-vorm.test.mjs en kladblok/studio-proef.mjs gebruiken
 * (tests/lib/studio-worker.mjs) — met de echte CSP erop, want de Worker zet
 * hem zelf. Vereist een verse build.
 *
 * Uitvoer: één regel per bevinding, of niets. Sluit af met code 1 als er iets
 * is, zodat hij in een keten wél kan meedoen.
 */
import { chromium } from 'playwright';
import { browserPad } from './lib/browserpad.mjs';
import { startStudio, VOLT } from '../tests/lib/studio-worker.mjs';

/* Licht is de beginstand sinds sectie 21; donker is de cookie. */
const THEMA = process.env.VISUAILS_THEMA === 'donker' ? 'donker' : 'licht';
const SECTIES = ['/account', '/account/orders', '/account/brand-kit', '/account/details',
                 '/account/invoices', '/account/plan', '/account/plan?tab=bestellen',
                 '/account/plan?tab=edities', '/account/plan?tab=look', '/account/plan?tab=facturering',
                 '/account/plan/return', '/account/login'];

const VEEG = () => {
  const nr = c => { if(!c) return null; const g=c.startsWith('color('); const m=c.match(/-?[\d.]+/g); if(!m) return null;
    const v=m.map(Number); return g ? v.slice(0,3).map(x=>x*255).concat(v.length>3?[v[3]]:[]) : v; };
  const lin = v => { v/=255; return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4) };
  const lum = ([r,g,b]) => 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b);
  const meng = (f,a) => { const al=f.length>3?f[3]:1; return [0,1,2].map(i=>f[i]*al+a[i]*(1-al)) };
  const grond = el => { let n=el, st=[]; while(n && n!==document.documentElement){ const bg=nr(getComputedStyle(n).backgroundColor);
    if(bg){const a=bg.length>3?bg[3]:1; if(a>0){st.push(bg); if(a>=.999) break}} n=n.parentElement }
    let u=(nr(getComputedStyle(document.documentElement).backgroundColor)||[255,255,255]).slice(0,3);
    for(let i=st.length-1;i>=0;i--) u=meng(st[i],u); return u };
  const uit=[];
  document.querySelectorAll('body *').forEach(el=>{
    const cs=getComputedStyle(el); if(cs.display==='none'||cs.visibility==='hidden'||+cs.opacity===0) return;
    const r=el.getBoundingClientRect(); if(r.width<3||r.height<3) return;
    if(![...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim().length>1)) return;
    const g=grond(el), v=meng(nr(cs.color),g);
    const L1=lum(v)+.05, L2=lum(g)+.05, ratio=L1>L2?L1/L2:L2/L1;
    const px=parseFloat(cs.fontSize)||16;
    const eis=(px>=24||(px>=18.66&&+cs.fontWeight>=700))?3:4.5;
    if(ratio<eis) uit.push(`${(el.className||el.tagName).toString().slice(0,30)} ${ratio.toFixed(2)}:1 (eis ${eis}) "${el.textContent.trim().slice(0,30)}"`);
  });
  const de=document.documentElement;
  if(de.scrollWidth>de.clientWidth+1) uit.push('HORIZONTALE OVERLOOP '+de.scrollWidth+' > '+de.clientWidth);
  return [...new Set(uit)];
};

const studio = await startStudio();
const browser = await chromium.launch({ executablePath: process.env.CHROME || browserPad() });
const context = await browser.newContext();
/* De vriesbladzijde: overgangen uit, zodat de meting de eindkleur leest en niet
   een tussenkleur van `.btn` zijn transition. Als eigen stylesheet en niet als
   addStyleTag, want `style-src 'self'` weigert inline opmaak — ook die van een
   meetgereedschap. */
await context.route('**/__vries.css', (route) => route.fulfill({ contentType: 'text/css',
  body: '*,*::before,*::after{transition:none !important;animation:none !important}' }));
const cookies = [{ name: 'vis_account', value: VOLT.token, url: studio.url }, { name: 'vis_lang', value: 'nl', url: studio.url }];
if (THEMA === 'donker') cookies.push({ name: 'vis_thema', value: 'donker', url: studio.url });
if (process.env.VISUAILS_NAV === 'dicht') cookies.push({ name: 'vis_nav', value: 'dicht', url: studio.url });
await context.addCookies(cookies);

let gevonden = 0;
try {
  for (const sec of SECTIES) {
    for (const [w, naam] of [[1280, 'breed'], [420, 'telefoon']]) {
      const page = await context.newPage();
      const fout = [];
      page.on('pageerror', (e) => fout.push('JS: ' + e.message));
      page.on('console', (m) => { if (m.type() === 'error') fout.push('console: ' + m.text()); });
      page.on('response', (r) => { if (r.status() >= 400) fout.push(`${r.status()} op ${new URL(r.url()).pathname}`); });
      await page.setViewportSize({ width: w, height: 1400 });
      const res = await page.goto(`${studio.url}${sec}`, { waitUntil: 'networkidle' });
      if (!res || res.status() !== 200) { fout.push(`gaf ${res ? res.status() : 'niets'}`); }
      /* Wachten op de opmaak en de letters, niet op het netwerk: een knop die
         vóór zijn stylesheet gemeten wordt, staat op de kale grond. */
      await page.waitForFunction(() => getComputedStyle(document.body).backgroundColor !== 'rgba(0, 0, 0, 0)', null, { timeout: 5000 }).catch(() => {});
      await page.evaluate(() => document.fonts?.ready).catch(() => {});
      await page.evaluate(() => new Promise((klaar) => {
        const l = document.createElement('link');
        l.rel = 'stylesheet'; l.href = '/__vries.css';
        l.onload = klaar; l.onerror = klaar;
        document.head.appendChild(l);
      }));
      await page.waitForTimeout(150);
      const bev = await page.evaluate(VEEG);
      [...fout, ...bev].forEach((x) => { gevonden += 1; console.log(`${sec} @${naam} — ${x}`); });
      await page.close();
    }
  }
} finally {
  await browser.close();
  await studio.dispose();
}
console.log(gevonden ? `\n${gevonden} bevinding(en)` : `\ngeen onleesbare tekst in Studio (${THEMA})`);
process.exit(gevonden ? 1 : 0);
