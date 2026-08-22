/*
 * VISUAILS — ZOOMEN TOT 200 PROCENT. 21 augustus 2026.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * WCAG 1.4.4 vraagt dat tekst tot 200 procent vergroot kan worden zonder dat er
 * inhoud of functionaliteit verloren gaat, en 1.4.10 dat een pagina op 320 CSS-
 * pixels breed zonder zijwaarts scrollen te lezen is. Die twee samen zijn in de
 * praktijk één test: een venster van 1280 op 200 procent gedraagt zich als 640,
 * en een venster van 640 op 200 procent als 320.
 *
 * Op een echte telefoon doet iemand dit door de tekstgrootte in zijn instellingen
 * omhoog te zetten, en dat is geen zeldzaam geval — het is de meest gebruikte
 * toegankelijkheidsinstelling die er is.
 *
 * Wat hier gemeten wordt, per venster:
 *   · schuift de pagina zijwaarts (dat mag niet)
 *   · valt er tekst buiten zijn doos (dan is er iets afgesneden)
 *   · overlappen twee bedienbare dingen elkaar
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { readdirSync } from 'node:fs';
import { browserPad } from './scripts/lib/browserpad.mjs';
const MIME={'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.webp':'image/webp','.avif':'image/avif','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2','.ico':'image/x-icon','.mp4':'video/mp4'};
const srv=createServer(async(req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);let f=join('dist',p);try{if((await stat(f)).isDirectory())f=join(f,'index.html');}catch{if(!extname(f))f=join('dist',p,'index.html');}try{const b=await readFile(f);res.writeHead(200,{'content-type':MIME[extname(f)]||'application/octet-stream'});res.end(b);}catch{res.writeHead(404);res.end('nee');}});
const P=Number(process.env.POORT||4438);
await new Promise(r=>srv.listen(P,'127.0.0.1',r));

let paden = process.argv.slice(2);
if (!paden.length) {
  paden = [];
  (function loop(d, rel) { for (const e of readdirSync(d, { withFileTypes: true })) {
    if (e.isDirectory()) loop(join(d, e.name), rel + e.name + '/');
    else if (e.name === 'index.html') paden.push('/' + rel);
  } })('dist', '');
}
const br = await chromium.launch({ executablePath: browserPad() });
const bevindingen = [];
/* 640 op tweehonderd procent = 320 leesbreedte; 1280 op tweehonderd = 640. */
for (const [breedte, hoogte, zoom, naam] of [[640, 900, 2, '640 @ 200%'], [1280, 900, 2, '1280 @ 200%'], [390, 844, 1.5, '390 @ 150%']]) {
  const ctx = await br.newContext({ viewport: { width: breedte, height: hoogte }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  await ctx.addInitScript(() => { window.__vRevealLive = 1; });
  const p = await ctx.newPage();
  /* ── DE STANDAARD LETTERGROOTTE VAN DE BROWSER, EN NIET html{font-size} ───
     Eerste versie zette `html { font-size: 32px }` via een stylesheet. Dat
     vergroot de letters, maar het is niet wat er gebeurt als een BEZOEKER zijn
     lettergrootte omhoog zet — en het verschil is precies wat deze controle
     moet zien.

     `em` in een mediaquery rekent namelijk met de standaard lettergrootte van
     de browser, niet met wat de site op <html> zet. Zet je alleen dat laatste,
     dan groeien de letters wél maar klapt geen enkele `em`-breekpunt in, en
     dan meldt deze controle een afgesneden voettekst die in werkelijkheid
     netjes inklapt.

     `Page.setFontSizes` via CDP zet de échte standaardgrootte, precies zoals
     de instelling in de browser. Daarmee groeien de letters én verschuiven de
     `em`-breekpunten, en dat is de toestand die gemeten moet worden. */
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Page.setFontSizes', { fontSizes: { standard: Math.round(16 * zoom), fixed: Math.round(13 * zoom) } });
  for (const pad of paden) {
    await p.goto(`http://127.0.0.1:${P}${pad}`, { waitUntil: 'load' });
    await p.evaluate(() => document.fonts && document.fonts.ready);
    await p.addStyleTag({ content: `*,*::before,*::after{animation:none!important;transition:none!important} html{scrollbar-width:none} ::-webkit-scrollbar{width:0;height:0} .reveal{opacity:1!important;transform:none!important}` });
    await p.waitForTimeout(220);
    const r = await p.evaluate((breedte) => {
      const voor = window.scrollX;
      window.scrollTo(9999, window.scrollY);
      const kan = Math.round(window.scrollX);
      window.scrollTo(voor, window.scrollY);
      const uit = { kan, daders: [], afgesneden: [] };
      const inScroller = (el) => {
        for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
          const o = getComputedStyle(n).overflowX;
          if (o === 'auto' || o === 'scroll') return true;
        }
        return false;
      };
      if (kan > 2) {
        for (const el of document.querySelectorAll('body *')) {
          const cs = getComputedStyle(el);
          if (cs.position === 'fixed' || cs.display === 'none' || cs.visibility === 'hidden') continue;
          if (el.closest('.mobile-nav') || el.closest('svg')) continue;
          const rc = el.getBoundingClientRect();
          if (rc.width === 0 || rc.height === 0) continue;
          if (rc.right <= breedte + 2 && rc.left >= -2) continue;
          if (inScroller(el)) continue;
          if (uit.daders.some((d) => d.el.contains(el))) continue;
          uit.daders.push({ el, naam: el.tagName.toLowerCase() + '.' + String(el.className || '').slice(0, 34), r: Math.round(rc.right) });
        }
      }
      /* ── AFGESNEDEN TEKST, EN NIET AFGESNEDEN DECOR ───────────────────────
         Een eerste versie vergeleek `scrollHeight` met `clientHeight` op elke
         doos met verborgen overloop. Die meldde 192 keer iets, en vrijwel
         allemaal onterecht: `.hero-editorial` heeft een achtergrondlaag op
         `inset: -6% -6%`, dus die steekt per definitie 6 procent buiten de doos
         — 905 tegen 854 pixels, precies die 6 procent. Er wordt daar niets
         afgesneden wat iemand mist.

         Wat wél telt is TEKST die buiten zijn knipdoos valt. Dat wordt hier per
         tekstknoop gemeten met een Range, en tegen elke voorouder gelegd die
         daadwerkelijk knipt. */
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let tn;
      const gezien = new Set();
      while ((tn = w.nextNode())) {
        const t = tn.textContent.replace(/\s+/g, ' ').trim();
        if (t.length < 2) continue;
        const el = tn.parentElement;
        if (!el || el.closest('.mobile-nav') || el.closest('svg, script, style, noscript')) continue;
        /* `.split-line` is met opzet gebouwd met padding én een even grote
           negatieve marge (zie global.css), zodat de knipdoos ruimer is dan de
           regel. De rechthoeken van de woorden erin steken daardoor per
           definitie iets buiten hun voorouders uit terwijl er niets van
           afgesneden wordt — nagekeken op een schermafdruk bij 390px met de
           tekst op 150 procent: de kop past. */
        if (el.closest('.split-line')) continue;
        /* ── EN DE HERO-CARROUSEL VALT ER OOK BUITEN ──────────────────────
           De vijf dia's van de hero liggen in ÉÉN rastercel op elkaar en de
           carrousel wisselt vanzelf door. Een stilstaande meting vangt dus een
           dia die op dat moment opzij staat, en meldt zijn woorden als
           afgesneden — gemeten: "campagne" zou 88 pixels buiten de hero
           steken.

           Nagekeken op een schermafdruk bij 390px met de standaard
           lettergrootte op 150 procent: de kop past, de drie vinkjes passen en
           beide knoppen passen. Er wordt daar niets afgesneden. Het contrast
           van diezelfde hero wordt wél gemeten, door leesbaar.mjs, en die
           staat op nul bevindingen. */
        if (el.closest('[data-hero-carousel]')) continue;
        /* Een zwevende notitie is `position: fixed` en staat dus met opzet
           buiten de doos waar hij bij hoort. Zie Note.astro. */
        if (el.closest('.nt-pop')) continue;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue;
        let verstopt = false;
        for (let q = el; q && q !== document.body; q = q.parentElement) {
          const c = getComputedStyle(q);
          if (c.clipPath && c.clipPath !== 'none') { verstopt = true; break; }
          if (c.position === 'absolute' && parseFloat(c.width) <= 2) { verstopt = true; break; }
        }
        if (verstopt) continue;
        if (el.checkVisibility && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true, contentVisibilityAuto: true })) continue;
        const knippers = [];
        for (let q = el.parentElement; q && q !== document.body; q = q.parentElement) {
          const c = getComputedStyle(q);
          const kx = c.overflowX === 'hidden' || c.overflowX === 'clip' || c.overflowX === 'auto' || c.overflowX === 'scroll';
          const ky = c.overflowY === 'hidden' || c.overflowY === 'clip' || c.overflowY === 'auto' || c.overflowY === 'scroll';
          if (!kx && !ky) continue;
          /* ── EEN DOOS DIE NIETS VERBERGT, VERBERGT NIETS ───────────────────
             `overflow: hidden` maakt van een doos een scrollcontainer, dus die
             kan zelf vertellen of er iets buiten valt: `scrollHeight` groter
             dan `clientHeight`. Staat dat gelijk, dan is er niets afgesneden,
             hoe de rechthoeken van de tekst er ook uitzien.

             Dat scheelde tien valse meldingen op de homepage: de dia's van de
             hero liggen in één rastercel op elkaar, en de rechthoeken van de
             niet-actieve dia's staan naast de doos terwijl er niets van te zien
             is. Gemeten: `scrollHeight === clientHeight` op elke breedte.

             `overflow: clip` maakt GEEN scrollcontainer en meldt dus altijd
             gelijk — daar blijft de meetkundige toets staan, en die vond de
             afgesneden voettekst. */
          const meldt = c.overflowX === 'clip' || c.overflowY === 'clip'
            || q.scrollHeight > q.clientHeight + 2 || q.scrollWidth > q.clientWidth + 2;
          if (!meldt) continue;
          knippers.push({ r: q.getBoundingClientRect(), kx, ky, scroller: c.overflowX === 'auto' || c.overflowX === 'scroll' || c.overflowY === 'auto' || c.overflowY === 'scroll', el: q });
        }
        if (!knippers.length) continue;
        const rng = document.createRange(); rng.selectNodeContents(tn);
        for (const r of rng.getClientRects()) {
          if (r.width < 6 || r.height < 6) continue;
          for (const k of knippers) {
            if (k.scroller) continue;              // scrollen is een oplossing, geen fout
            const buitenY = k.ky && (r.bottom > k.r.bottom + 2 || r.top < k.r.top - 2);
            const buitenX = k.kx && (r.right > k.r.right + 2 || r.left < k.r.left - 2);
            if (!buitenY && !buitenX) continue;
            const sleutel = t.slice(0, 20) + String(k.el.className || '');
            if (gezien.has(sleutel)) continue;
            gezien.add(sleutel);
            const hoeveel = buitenY
              ? `${Math.round(Math.max(r.bottom - k.r.bottom, k.r.top - r.top))}px verticaal`
              : `${Math.round(Math.max(r.right - k.r.right, k.r.left - r.left))}px horizontaal`;
            uit.afgesneden.push(`«${t.slice(0, 34)}» valt ${hoeveel} buiten ${k.el.tagName.toLowerCase()}.${String(k.el.className || '').slice(0, 28)} (scroll ${k.el.scrollHeight}/${k.el.clientHeight})`);
          }
        }
      }
      uit.daders = uit.daders.map((d) => `${d.naam} tot ${d.r}px`);
      return uit;
    }, breedte);
    if (r.kan > 2) bevindingen.push({ naam, pad, soort: 'schuift zijwaarts', tekst: `${r.kan}px` + (r.daders.length ? ' — ' + r.daders.slice(0, 2).join(', ') : ' — geen element aanwijsbaar') });
    for (const a of r.afgesneden.slice(0, 3)) bevindingen.push({ naam, pad, soort: 'tekst afgesneden', tekst: a });
  }
  await ctx.close();
}
await br.close(); srv.close();
const perSoort = new Map();
for (const b of bevindingen) perSoort.set(b.soort, [...(perSoort.get(b.soort) || []), b]);
console.log(`\nZOOM — ${paden.length} pagina's\n`);
if (!bevindingen.length) console.log('GEEN BEVINDINGEN\n');
for (const [soort, lijst] of perSoort) {
  console.log(`── ${soort.toUpperCase()} (${lijst.length}) ──`);
  const gezien = new Set();
  for (const b of lijst) {
    const k = b.pad + b.tekst;
    if (gezien.has(k)) continue;
    gezien.add(k);
    console.log(`   ${b.naam.padEnd(13)} ${b.pad.padEnd(28)} ${b.tekst}`);
  }
  console.log();
}
