/*
 * VISUAILS — IS ELKE TEKST OP DE SITE ECHT TE LEZEN. 21 augustus 2026.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Lucas: *"Check ook of alle teksten goed zichtbaar zijn."*
 *
 * WAAROM DIT NIET UIT DE STYLESHEET TE HALEN IS. De gebruikelijke manier om
 * contrast te controleren is `color` tegen `background-color` leggen. Op deze
 * site klopt dat op de helft van de plekken niet: er staat tekst op foto's, op
 * verlopen, op een paneel waar een beeld met `multiply` tegen een kleur ligt,
 * en op een vignettering. Geen van die vier heeft een `background-color` die
 * zegt wat je ziet.
 *
 * DUS WORDT ER GEMETEN WAT ER STAAT. Elke pagina wordt twee keer afgedrukt:
 * één keer gewoon, en één keer met alle tekstkleuren op doorzichtig. Die
 * tweede afdruk is de zuivere achtergrond, met exact dezelfde opmaak — geen
 * enkel element verschuift, want alleen `color` verandert. Daarna wordt per
 * tekstregel de SLECHTSTE achtergrondpixel onder die regel opgezocht en het
 * contrast daartegen berekend. Slechtste, niet gemiddelde: één lichte plek
 * onder een woord is precies waar een lezer struikelt.
 *
 * De grens is die van WCAG 2.1 AA: 4,5:1 voor gewone tekst, 3:1 voor tekst
 * vanaf 24px of vanaf 18,66px vet.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { readdirSync } from 'node:fs';
import { PNG } from 'pngjs';
import { browserPad } from './scripts/lib/browserpad.mjs';

const MIME={'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.webp':'image/webp','.avif':'image/avif','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2','.ico':'image/x-icon','.mp4':'video/mp4'};
const srv=createServer(async(req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);let f=join('dist',p);try{if((await stat(f)).isDirectory())f=join(f,'index.html');}catch{if(!extname(f))f=join('dist',p,'index.html');}try{const b=await readFile(f);res.writeHead(200,{'content-type':MIME[extname(f)]||'application/octet-stream'});res.end(b);}catch{res.writeHead(404);res.end('nee');}});
const POORT = Number(process.env.POORT || 4414);
await new Promise(r=>srv.listen(POORT,'127.0.0.1',r));

const lum = (r,g,b)=>{const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);};return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b);};
const STIL = `*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}
  .reveal,[class*="float"],[class*="rise"]{opacity:1!important;transform:none!important}
  html{scrollbar-width:none} ::-webkit-scrollbar{width:0;height:0}`;
/* Alleen de KLEUR verdwijnt, niets anders — zo blijft de opmaak identiek en
   ligt elke tekstregel in de tweede afdruk op exact dezelfde plek. */
const KAAL = `*{color:transparent!important;text-shadow:none!important;-webkit-text-fill-color:transparent!important;text-decoration-color:transparent!important}`;
/* ── DE ZWEVENDE LAGEN GAAN UIT, EN DAAR IS EEN REDEN VOOR ─────────────────
   Een `position: fixed` element wordt in een afdruk van de HELE pagina maar
   één keer getekend — op de plek waar het in het venster stond — en landt
   daarmee over de inhoud die daar toevallig staat. De cookiebalk viel zo over
   de voettekst van /nl/404, en dan meet deze controle de knoptekst tegen de
   balk in plaats van tegen de voettekst: 1,25 : 1, en er is niets aan de hand.

   Ze gaan daarom uit in ALLEBEI de afdrukken, zodat de inhoud eronder eerlijk
   gemeten wordt. De zwevende lagen zelf — de cookiebalk, de koptekst, de
   WhatsApp-knop, de conversiebalk — worden daarna apart gemeten in een
   venster-afdruk, waar ze wél staan waar ze horen. Zie ZWEVEND onderaan. */
const GEENZWEEF = `.cc,.convbar,.wa-launcher,header.site-header,.grain,.pl-total-bar{visibility:hidden!important}`;

const BREEDTES = (process.env.B || '390,1440').split(',').map(Number);
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
let gemeten = 0;

for (const breedte of BREEDTES) {
  /* ── GEEN TRAAG SCROLLEN TIJDENS EEN METING ─────────────────────────────
     De site gebruikt Lenis voor traag doorrollen, en Lenis onderschept
     `window.scrollTo`: die wordt een ANIMATIE. Deze controle schuift naar een
     positie, leest de rechthoeken van elke tekstregel op en drukt daarna het
     venster af — en als de pagina tussen die twee stappen nog doorrolt, staan
     de rechthoeken van de eerste stap niet meer waar ze in de afdruk staan.

     Gemeten gevolg: de bestelknop in de voettekst werd gemeld op 1,13 : 1
     terwijl hij 15,16 haalt. Zijn rechthoek stond op y=945 in een venster van
     900 — de knop was tijdens de afdruk al doorgerold, en er werd dus gemeten
     op een plek waar hij niet stond. Dezelfde oorzaak zat achter de rare
     waarden in de doorloop op /how-it-works.

     `prefers-reduced-motion: reduce` zet Lenis helemaal uit (zie de noot
     bovenaan src/scripts/smooth-scroll.js). Dat is geen omweg maar precies de
     stand waarin een deel van de bezoekers de site ziet, en de enige waarin
     een stilstaande meting betekenis heeft. */
  const ctx = await br.newContext({ viewport: { width: breedte, height: 1000 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  await ctx.addInitScript(() => { window.__vRevealLive = 1; });
  const p = await ctx.newPage();
  for (const pad of paden) {
    await p.goto(`http://127.0.0.1:${POORT}${pad}`, { waitUntil: 'load' });
    await p.evaluate(() => document.fonts && document.fonts.ready);
    await p.addStyleTag({ content: STIL });
    await p.addStyleTag({ content: GEENZWEEF });
    await p.waitForTimeout(220);

    /* ── VENSTER VOOR VENSTER, EN NIET ÉÉN AFDRUK VAN DE HELE PAGINA ──────
       Een afdruk van de hele pagina liegt op twee manieren, en allebei zijn ze
       hier gemeten:

         · `svh`-maten. /how-it-works en /demo gebruiken `.wk-step { min-height:
           66svh }`. Bij een afdruk voorbij het venster verschuift die maat, en
           dan staan de rechthoeken die vóór de afdruk zijn opgehaald ergens
           anders dan wat er getekend is. Resultaat: een limoen knop die
           gemeten werd tegen de grond eronder — 1,69 : 1 gemeld voor een knop
           die in werkelijkheid 10 : 1 haalt.
         · alles wat plakt of zweeft. Een `position: sticky` kop wordt in zo'n
           afdruk één keer getekend en staat dus negen schermen lang op de
           verkeerde plek.

       Dus wordt de pagina scherm voor scherm afgelopen: scrollen, de regels in
       VENSTERcoördinaten ophalen, en het venster afdrukken. Dat is precies wat
       een bezoeker ziet, en het kost alleen tijd. */
    const hoogte = await p.evaluate(() => window.innerHeight);
    const totaal = await p.evaluate(() => document.documentElement.scrollHeight);
    for (let top = 0; top < totaal; top += Math.round(hoogte * 0.9)) {
      await p.evaluate((y) => window.scrollTo(0, y), top);
      await p.waitForTimeout(90);

      const runs = await p.evaluate(() => {
        const uit = [];
        const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let n;
        while ((n = w.nextNode())) {
          const t = n.textContent.replace(/\s+/g, ' ').trim();
          if (t.length < 2) continue;
          const el = n.parentElement;
          if (!el) continue;
          const cs = getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue;
          if (el.closest('[hidden], [aria-hidden="true"], .mobile-nav, .nt-pop, svg, script, style, noscript')) continue;
          if (el.closest('.cc, .convbar, .wa-launcher, header.site-header, .pl-total-bar')) continue;   // apart gemeten, zie ZWEVEND
          /* ── DE DOORLOOP OP /demo EN /how-it-works VALT ERBUITEN ─────────
             Dat blok (`[data-walk]`) is een animatie die aan de SCROLLPOSITIE
             hangt: welke stap helder staat en welke gedimd is, verandert
             terwijl je schuift. Een stilstaande afdruk vangt dus willekeurig
             een halve overgang, en dan meet deze controle een toestand die
             niemand ooit ziet — gemeten: dezelfde kop op 1,18 en op 8,4 : 1,
             afhankelijk van waar de afdruk viel.

             Het blok wordt in plaats daarvan met een echte browser doorlopen
             in wandel.mjs, waar de stappen één voor één actief gemaakt worden
             en er dus wél iets vaststaat om te meten. */
          /* De doorloop mag weer mee sinds het trage scrollen uit staat: de
             rare waarden daar (dezelfde kop op 1,18 én op 8,4) kwamen van
             rechthoeken die tijdens de afdruk waren doorgerold, niet van de
             animatie zelf. Wat nu nog wegvalt is alleen wat écht gedimd is,
             via de dekkings-optelsom hierboven. */
          // (geen uitzondering meer voor [data-walk])
          /* ── DE OPTELSOM VAN ALLE DEKKINGEN ─────────────────────────────
             Een element op `opacity: .18` is niet onzichtbaar maar wél met
             opzet weggezet — de stappen in de doorloop op /how-it-works dimmen
             zo alles wat niet de huidige stap is. Zulke tekst meten tegen de
             contrasteis levert 1,3 : 1 en een melding die nergens over gaat.

             Onder de helft: overslaan, want dat is een toestand en geen tekst
             die gelezen moet worden. Daarboven telt hij gewoon mee, en dan is
             de gemeten kleur ook echt de kleur die je ziet — vandaar dat de
             dekking hieronder in de kleur verrekend wordt. */
          let verstopt = false, dek = 1;
          for (let q = el; q && q !== document.body; q = q.parentElement) {
            const c = getComputedStyle(q);
            if (c.clipPath && c.clipPath !== 'none') { verstopt = true; break; }
            if (c.position === 'absolute' && parseFloat(c.width) <= 2) { verstopt = true; break; }
            dek *= Number(c.opacity);
          }
          if (verstopt || dek < 0.5) continue;
          if (el.checkVisibility && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true, contentVisibilityAuto: true })) continue;
          const klem = [];
          for (let q = el.parentElement; q && q !== document.body; q = q.parentElement) {
            const c = getComputedStyle(q);
            if (c.overflow !== 'visible' && c.overflow !== '') klem.push(q.getBoundingClientRect());
          }
          const rng = document.createRange(); rng.selectNodeContents(n);
          for (const r of rng.getClientRects()) {
            if (r.width < 6 || r.height < 6) continue;
            if (klem.some((k) => r.bottom <= k.top + 1 || r.top >= k.bottom - 1 || r.right <= k.left + 1 || r.left >= k.right - 1)) continue;
            /* Alleen wat VOLLEDIG in beeld staat: een regel die half onder de
               onderrand valt, wordt bij de volgende schuif alsnog gemeten. */
            if (r.top < 2 || r.bottom > window.innerHeight - 2) continue;
            uit.push({ t: t.slice(0, 34), kleur: cs.color, dek, px: parseFloat(cs.fontSize), gew: cs.fontWeight,
              x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) });
          }
        }
        return uit;
      });
      if (!runs.length) continue;

      const kaal = await p.addStyleTag({ content: KAAL });
      await p.waitForTimeout(70);
      const buf = await p.screenshot();       // alleen het venster
      await p.evaluate((el) => el.remove(), kaal);
      const png = PNG.sync.read(buf);

      for (const r of runs) {
        const num = (r.kleur.match(/[\d.]+/g) || []).map(Number);
        if (num.length < 3) continue;
        const alfa = (num[3] === undefined ? 1 : num[3]) * (r.dek === undefined ? 1 : r.dek);
        if (alfa < 0.15) continue;
        const y0 = Math.max(0, r.y + Math.round(r.h * 0.22));
        const y1 = Math.min(png.height - 1, r.y + Math.round(r.h * 0.78));
        let Lmin = 1, Lmax = 0, n = 0, rgbMin = null, rgbMax = null;
        for (let y = y0; y <= y1; y += 1) {
          for (let x = Math.max(0, r.x); x < Math.min(r.x + r.w, png.width); x += 2) {
            const i = (png.width * y + x) << 2;
            const rgb = [png.data[i], png.data[i + 1], png.data[i + 2]];
            const L = lum(rgb[0], rgb[1], rgb[2]);
            if (L < Lmin) { Lmin = L; rgbMin = rgb; }
            if (L > Lmax) { Lmax = L; rgbMax = rgb; }
            n++;
          }
        }
        if (!n) continue;
        gemeten++;
        /* ── DOORZICHTIGE TEKST MENGT PER KANAAL, NIET PER LUMINANTIE ───────
           Deze regel is één keer fout geweest en de fout was leerzaam. De
           middelste prijstegel op /pricing draagt `rgba(8 9 11 / .68)` op een
           vulling van #C6F100. Meng je de LUMINANTIES — 0,68 × 0,0028 plus
           0,32 × 0,7493 — dan kom je op 0,2417 en dus op 2,74 : 1, en dat
           meldde deze controle ook keurig.

           Maar zo werkt een browser niet. Die mengt de KANALEN: 0,68 × (8 9 11)
           plus 0,32 × (198 241 0) geeft (69 83 8), en de luminantie dáárvan is
           0,0750 — 6,40 : 1. sRGB is niet lineair in luminantie, dus de twee
           volgordes geven verschillende antwoorden en alleen de tweede is wat
           je ziet.

           Vandaar dat hier de RGB van de slechtste achtergrondpixel wordt
           bewaard en niet alleen zijn luminantie. */
        const Lt0 = lum(num[0], num[1], num[2]);
        const kies = Lt0 > Lmax ? [Lmax, rgbMax] : (Lt0 < Lmin ? [Lmin, rgbMin]
          : (Math.abs(Lt0 - Lmin) < Math.abs(Lt0 - Lmax) ? [Lmin, rgbMin] : [Lmax, rgbMax]));
        const Lb = kies[0];
        const bgRgb = kies[1];
        const Lt = alfa >= 0.995 ? Lt0
          : lum(num[0] * alfa + bgRgb[0] * (1 - alfa),
                num[1] * alfa + bgRgb[1] * (1 - alfa),
                num[2] * alfa + bgRgb[2] * (1 - alfa));
        const c = (Math.max(Lt, Lb) + 0.05) / (Math.min(Lt, Lb) + 0.05);
        const groot = r.px >= 24 || (r.px >= 18.66 && Number(r.gew) >= 700);
        const grens = groot ? 3 : 4.5;
        if (process.env.LEES_DEBUG && r.t.includes(process.env.LEES_DEBUG)) {
          try {
            const { writeFileSync } = await import('node:fs');
            writeFileSync(`/tmp/dbg-${breedte}-${r.y}.png`, buf);
            writeFileSync(`/tmp/dbg-${breedte}-${r.y}.json`, JSON.stringify({ rect: r, scrollY: top }));
          } catch {}
          console.log(`[debug] «${r.t}» kleur=${r.kleur} alfa=${alfa} rect=${r.x},${r.y} ${r.w}x${r.h} Lmin=${Lmin.toFixed(4)} rgbMin=${rgbMin} Lmax=${Lmax.toFixed(4)} rgbMax=${rgbMax} → ${c.toFixed(2)}:1`);
        }
        if (c + 0.02 < grens) bevindingen.push({ pad, breedte, c: +c.toFixed(2), grens, t: r.t, px: Math.round(r.px) });
      }
    }
  }
  await ctx.close();
}
/* ══ ZWEVEND ═══════════════════════════════════════════════════════════════
   De vaste lagen — koptekst, cookiebalk, WhatsApp-knop, conversiebalk — staan
   op elke pagina hetzelfde en zijn hierboven met opzet verborgen (zie de noot
   bij GEENZWEEF). Hier worden ze wél gemeten, in een VENSTER-afdruk in plaats
   van een pagina-afdruk: dan staat een vast element precies waar het hoort.

   Eén pagina volstaat, en met opzet de homepage: die heeft een foto onder de
   koptekst, en dat is het zwaarste geval dat er is. */
for (const breedte of BREEDTES) {
  const ctx = await br.newContext({ viewport: { width: breedte, height: 1000 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  await ctx.addInitScript(() => { window.__vRevealLive = 1; });
  const p = await ctx.newPage();
  await p.goto(`http://127.0.0.1:${POORT}/`, { waitUntil: 'load' });
  await p.evaluate(() => document.fonts && document.fonts.ready);
  await p.addStyleTag({ content: STIL });
  await p.waitForTimeout(400);
  const runs = await p.evaluate(() => {
    const uit = [];
    for (const wortel of document.querySelectorAll('.cc, .convbar, .wa-launcher, header.site-header, .pl-total-bar')) {
      const w = document.createTreeWalker(wortel, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = w.nextNode())) {
        const t = n.textContent.replace(/\s+/g, ' ').trim();
        if (t.length < 2) continue;
        const el = n.parentElement;
        if (!el) continue;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue;
        if (el.closest('[hidden], [aria-hidden="true"], svg')) continue;
        if (el.checkVisibility && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
        let verstopt = false;
        for (let q = el; q && q !== document.body; q = q.parentElement) {
          const c = getComputedStyle(q);
          if (c.clipPath && c.clipPath !== 'none') { verstopt = true; break; }
          if (c.position === 'absolute' && parseFloat(c.width) <= 2) { verstopt = true; break; }
        }
        if (verstopt) continue;
        const rng = document.createRange(); rng.selectNodeContents(n);
        for (const r of rng.getClientRects()) {
          if (r.width < 6 || r.height < 6) continue;
          if (r.top < 0 || r.bottom > window.innerHeight) continue;
          uit.push({ t: t.slice(0, 34), kleur: cs.color, px: parseFloat(cs.fontSize), gew: cs.fontWeight,
            x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) });
        }
      }
    }
    return uit;
  });
  const kaal = await p.addStyleTag({ content: KAAL });
  await p.waitForTimeout(120);
  const buf = await p.screenshot();          // venster, niet de hele pagina
  await p.evaluate((el) => el.remove(), kaal);
  const png = PNG.sync.read(buf);
  for (const r of runs) {
    const num = (r.kleur.match(/[\d.]+/g) || []).map(Number);
    if (num.length < 3) continue;
    if (num[3] !== undefined && num[3] < 0.15) continue;
    const y0 = Math.max(0, r.y + Math.round(r.h * 0.22));
    const y1 = Math.min(png.height - 1, r.y + Math.round(r.h * 0.78));
    let Lmin = 1, Lmax = 0, n = 0;
    for (let y = y0; y <= y1; y += 1) {
      for (let x = Math.max(0, r.x); x < Math.min(r.x + r.w, png.width); x += 2) {
        const i = (png.width * y + x) << 2;
        const L = lum(png.data[i], png.data[i + 1], png.data[i + 2]);
        if (L < Lmin) Lmin = L;
        if (L > Lmax) Lmax = L;
        n++;
      }
    }
    if (!n) continue;
    gemeten++;
    const Lt = lum(num[0], num[1], num[2]);
    const Lb = Lt > Lmax ? Lmax : (Lt < Lmin ? Lmin : (Math.abs(Lt - Lmin) < Math.abs(Lt - Lmax) ? Lmin : Lmax));
    const c = (Math.max(Lt, Lb) + 0.05) / (Math.min(Lt, Lb) + 0.05);
    const groot = r.px >= 24 || (r.px >= 18.66 && Number(r.gew) >= 700);
    const grens = groot ? 3 : 4.5;
    if (c + 0.02 < grens) bevindingen.push({ pad: '(vaste lagen)', breedte, c: +c.toFixed(2), grens, t: r.t, px: Math.round(r.px) });
  }
  await ctx.close();
}

await br.close(); srv.close();

bevindingen.sort((a, b) => a.c - b.c);
console.log(`\nLEESBAARHEID — ${paden.length} pagina's × ${BREEDTES.join('/')} px, ${gemeten} tekstregels gemeten\n`);
const gezien = new Set();
let uniek = 0;
for (const b of bevindingen) {
  const k = `${b.pad}|${b.t}`;
  if (gezien.has(k)) continue;
  gezien.add(k); uniek++;
  console.log(`${String(b.c).padStart(5)}:1 (moet ${b.grens})  ${String(b.breedte).padStart(4)}px  ${b.pad.padEnd(30)} ${b.px}px  «${b.t}»`);
}
console.log(`\n${bevindingen.length} meldingen, ${uniek} verschillende.`);
process.exit(uniek ? 1 : 0);
