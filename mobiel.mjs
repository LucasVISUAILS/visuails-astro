/*
 * VISUAILS — DE MOBIELE LADE, ECHT OPEN GEMETEN. 21 augustus 2026.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Lucas: *"Ik had toevallig voornamelijk op mobiel nog veel fouten gevonden in
 * het burger menu."* Dat kon: `npm run keuring` meet 91 pagina's op 390px, maar
 * die lade staat dan DICHT. Alles wat erin staat — zeventien ingangen, drie
 * knoppen, de taalwissel — werd nooit gemeten. Deze controle doet dat wel: hij
 * klikt het menu open en meet daarna pas.
 *
 * Wat hij nakijkt, per breedte en per taal:
 *   1  de lade valt binnen het scherm en scrollt niet zijwaarts
 *   2  elk raakvlak is minstens 24x24 (WCAG 2.2 SC 2.5.8)
 *   3  geen twee ingangen overlappen elkaar
 *   4  elke tekst haalt 4.5:1 tegen wat er ACHTER hem zit
 *   5  de pagina eronder scrollt niet mee
 *   6  de tab-volgorde blijft binnen de lade
 *   7  Escape sluit, en de focus gaat terug naar de knop die hem opende
 *   8  elke link in de lade bestaat ook echt
 *   9  na sluiten is alles weer bedienbaar
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { browserPad } from './scripts/lib/browserpad.mjs';

const MIME = { '.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.mjs':'text/javascript',
  '.json':'application/json', '.webp':'image/webp', '.avif':'image/avif', '.png':'image/png',
  '.jpg':'image/jpeg', '.svg':'image/svg+xml', '.woff2':'font/woff2', '.ico':'image/x-icon', '.mp4':'video/mp4' };

async function serveer(poort) {
  const srv = createServer(async (req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    let f = join('dist', p);
    try {
      if ((await stat(f)).isDirectory()) f = join(f, 'index.html');
    } catch {
      if (!extname(f)) f = join('dist', p, 'index.html');
    }
    try {
      const buf = await readFile(f);
      res.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream' });
      res.end(buf);
    } catch { res.writeHead(404); res.end('nee'); }
  });
  await new Promise((r) => srv.listen(poort, '127.0.0.1', r));
  return srv;
}

const BREEDTES = [
  [320, 568, 'iPhone SE 1e gen — de smalste die nog telt'],
  [360, 640, 'Android-basis'],
  [390, 844, 'iPhone 14'],
  [414, 896, 'iPhone 11 Pro Max'],
  [768, 1024, 'iPad staand — nét onder de 940px-grens'],
  [390, 500, 'lage viewport: telefoon in landschap'],
];
const PAGINAS = ['/', '/nl/', '/pricing/', '/start/catalog/'];

const bevindingen = [];
const meld = (soort, waar, detail) => bevindingen.push({ soort, waar, detail });

/* ── CONTRAST ──────────────────────────────────────────────────────────────
   De relatieve luminantie volgens WCAG 2.x. Kleuren komen als rgb()/rgba()
   uit getComputedStyle; een doorzichtige voorgrond wordt over de achtergrond
   gelegd voordat er gerekend wordt, want dat is wat het oog ziet. */
const CONTRAST = `
  (() => {
    const num = (c) => (c.match(/[\\d.]+/g) || []).map(Number);
    const lum = ([r,g,b]) => {
      const f = (v) => { v /= 255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); };
      return 0.2126*f(r) + 0.7152*f(g) + 0.0722*f(b);
    };
    const meng = (voor, achter) => {
      const a = voor[3] === undefined ? 1 : voor[3];
      return [0,1,2].map((i) => voor[i]*a + achter[i]*(1-a));
    };
    const achtergrondVan = (el) => {
      let n = el, stapel = [];
      while (n && n !== document.documentElement) {
        const s = getComputedStyle(n);
        const bg = num(s.backgroundColor);
        const heeftBeeld = s.backgroundImage && s.backgroundImage !== 'none';
        if (heeftBeeld) return { kleur: null, beeld: true };
        if (bg.length >= 3 && (bg[3] === undefined || bg[3] > 0)) stapel.push(bg);
        if (bg.length >= 3 && (bg[3] === undefined || bg[3] === 1)) break;
        n = n.parentElement;
      }
      if (!stapel.length) return { kleur: [255,255,255], beeld: false };
      let k = stapel.pop();
      k = [k[0], k[1], k[2]];
      while (stapel.length) k = meng(stapel.pop(), k);
      return { kleur: k, beeld: false };
    };
    window.__contrast = (el) => {
      const s = getComputedStyle(el);
      const voor = num(s.color);
      const ach = achtergrondVan(el.parentElement || el);
      if (ach.beeld) return { over: true };
      const v = meng(voor, ach.kleur);
      const l1 = lum(v), l2 = lum(ach.kleur);
      const c = (Math.max(l1,l2) + 0.05) / (Math.min(l1,l2) + 0.05);
      const groot = parseFloat(s.fontSize) >= 24 || (parseFloat(s.fontSize) >= 18.66 && Number(s.fontWeight) >= 700);
      return { ratio: Math.round(c*100)/100, grens: groot ? 3 : 4.5, px: parseFloat(s.fontSize) };
    };
  })()
`;

const srv = await serveer(4404);
const browser = await chromium.launch({ executablePath: browserPad() });

for (const [b, h, naam] of BREEDTES) {
  const ctx = await browser.newContext({ viewport: { width: b, height: h }, deviceScaleFactor: 1, isMobile: b < 768, hasTouch: b < 768 });
  await ctx.addInitScript(() => { window.__vRevealLive = 1; });
  const p = await ctx.newPage();
  const consolefouten = [];
  /* /account/me is een Pages Function; in deze platte voorvertoning bestaat hij
     niet en vraagt elke pagina hem toch op om te weten of je ingelogd bent. Dat
     is een eigenschap van de voorvertoning, niet van de site — dezelfde
     uitzondering als in scripts/keuring.mjs. */
  /* Alles onder functions/ is een Pages Function en bestaat in deze platte
     voorvertoning niet; de site vraagt ze wel op. Dezelfde uitzondering als in
     scripts/keuring.mjs, daar afgeleid uit de mappen zelf. */
  const FUNCTIEROUTE = /^\/(account\/me|api\/)/;
  p.on('response', (r) => {
    if (r.status() < 400) return;
    const u = r.url().replace(/^https?:\/\/[^/]+/, '').split('?')[0];
    if (FUNCTIEROUTE.test(u)) return;
    consolefouten.push(`HTTP ${r.status()} ${u}`);
  });
  p.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (/Failed to load resource/.test(t)) return;   // komt hierboven al langs, mét URL
    consolefouten.push(t.slice(0, 140));
  });
  p.on('pageerror', (e) => consolefouten.push('pageerror: ' + String(e).slice(0, 140)));

  for (const pad of PAGINAS) {
    await p.goto(`http://127.0.0.1:4404${pad}`, { waitUntil: 'load' });
    await p.evaluate(() => document.fonts && document.fonts.ready);
    await p.waitForTimeout(400);
    const waar = `${b}x${h} ${pad}`;

    // Staat de knop er überhaupt?
    const knopZichtbaar = await p.evaluate(() => {
      const k = document.querySelector('.menu-toggle');
      return !!k && getComputedStyle(k).display !== 'none';
    });
    if (!knopZichtbaar) {
      if (b <= 940) meld('menuknop ontbreekt', waar, 'op deze breedte hoort de burgerknop zichtbaar te zijn');
      continue;
    }

    const scrollVoor = await p.evaluate(() => window.scrollY);
    await p.click('.menu-toggle');
    await p.waitForTimeout(450);
    await p.evaluate(CONTRAST);

    const r = await p.evaluate(({ b, h }) => {
      const nav = document.querySelector('.mobile-nav');
      const uit = { open: nav && nav.classList.contains('open'), fouten: [] };
      if (!nav) { uit.fouten.push(['lade ontbreekt', '']); return uit; }

      const nb = nav.getBoundingClientRect();
      uit.lade = { l: Math.round(nb.left), r: Math.round(nb.right), t: Math.round(nb.top), b: Math.round(nb.bottom) };
      uit.scrollHoogte = nav.scrollHeight;
      uit.zichtHoogte = nav.clientHeight;
      uit.zijwaarts = nav.scrollWidth - nav.clientWidth;
      uit.bodyOverloop = document.documentElement.scrollWidth - document.documentElement.clientWidth;

      // 2 + 3 + 4: elk bedienbaar element in de lade
      const bedienbaar = [...nav.querySelectorAll('a, button, [role="button"], input, select')];
      uit.aantal = bedienbaar.length;
      const dozen = [];
      for (const el of bedienbaar) {
        const s = getComputedStyle(el);
        if (s.display === 'none' || s.visibility === 'hidden' || el.closest('[hidden]')) continue;
        const rc = el.getBoundingClientRect();
        const naam = (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30);
        if (rc.width < 24 || rc.height < 24) {
          uit.fouten.push(['raakvlak te klein', `${naam} — ${Math.round(rc.width)}x${Math.round(rc.height)}`]);
        }
        if (rc.left < -1 || rc.right > b + 1) {
          uit.fouten.push(['valt buiten het scherm', `${naam} — links ${Math.round(rc.left)}, rechts ${Math.round(rc.right)}`]);
        }
        dozen.push({ naam, rc, el });
      }
      // overlap tussen twee ingangen die allebei klikbaar zijn
      for (let i = 0; i < dozen.length; i++) {
        for (let j = i + 1; j < dozen.length; j++) {
          const A = dozen[i].rc, B = dozen[j].rc;
          if (dozen[i].el.contains(dozen[j].el) || dozen[j].el.contains(dozen[i].el)) continue;
          const ox = Math.min(A.right, B.right) - Math.max(A.left, B.left);
          const oy = Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top);
          if (ox > 2 && oy > 2) uit.fouten.push(['twee ingangen overlappen', `${dozen[i].naam} × ${dozen[j].naam}`]);
        }
      }

      // 4: contrast van elk stukje tekst in de lade
      const lopen = (n) => {
        for (const k of n.childNodes) {
          if (k.nodeType === 3 && k.textContent.trim().length > 1) {
            const el = k.parentElement;
            const s = getComputedStyle(el);
            if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) continue;
            if (el.closest('[hidden]')) continue;
            const c = window.__contrast(el);
            if (c && !c.over && c.ratio < c.grens) {
              uit.fouten.push(['tekst te licht', `"${k.textContent.trim().slice(0, 28)}" ${c.ratio}:1 (moet ${c.grens})`]);
            }
          } else if (k.nodeType === 1) lopen(k);
        }
      };
      lopen(nav);

      // 8: elke link wijst ergens heen
      uit.links = [...nav.querySelectorAll('a[href]')].map((a) => a.getAttribute('href'));

      // 6: focusvolgorde — wat er buiten de lade nog bereikbaar is
      const buiten = [...document.querySelectorAll('a[href], button, input, select, textarea, [tabindex]')]
        .filter((el) => !nav.contains(el))
        .filter((el) => {
          if (el.closest('[inert]')) return false;
          const s = getComputedStyle(el);
          if (s.display === 'none' || s.visibility === 'hidden') return false;
          if (el.tabIndex < 0) return false;
          return true;
        })
        .map((el) => (el.getAttribute('aria-label') || el.textContent || el.tagName).replace(/\s+/g, ' ').trim().slice(0, 24));
      uit.bereikbaarBuiten = buiten;
      return uit;
    }, { b, h });

    if (!r.open) meld('lade gaat niet open', waar, '');
    for (const [soort, detail] of r.fouten) meld(soort, waar, detail);
    if (r.zijwaarts > 1) meld('lade scrolt zijwaarts', waar, `${r.zijwaarts}px te breed`);
    if (r.bodyOverloop > 1) meld('pagina scrolt zijwaarts met de lade open', waar, `${r.bodyOverloop}px`);
    if (r.bereikbaarBuiten && r.bereikbaarBuiten.length) {
      meld('buiten de lade nog bereikbaar met tab', waar, r.bereikbaarBuiten.slice(0, 6).join(' · '));
    }
    if (r.scrollHoogte > r.zichtHoogte + 4) {
      // scrollen mag, maar dan moet het onderste item bereikbaar zijn
      const bereikt = await p.evaluate(() => {
        const nav = document.querySelector('.mobile-nav');
        nav.scrollTop = nav.scrollHeight;
        const laatste = [...nav.querySelectorAll('a, button')].pop();
        const rc = laatste.getBoundingClientRect();
        return { onder: Math.round(rc.bottom), venster: window.innerHeight, naam: (laatste.textContent || '').trim().slice(0, 24) };
      });
      if (bereikt.onder > bereikt.venster + 2) {
        meld('onderkant van de lade onbereikbaar', waar, `"${bereikt.naam}" eindigt op ${bereikt.onder}, venster ${bereikt.venster}`);
      }
      await p.evaluate(() => { document.querySelector('.mobile-nav').scrollTop = 0; });
    }

    // 5: scrollt de pagina eronder mee?
    await p.mouse.wheel(0, 400);
    await p.waitForTimeout(200);
    const scrollNa = await p.evaluate(() => window.scrollY);
    if (Math.abs(scrollNa - scrollVoor) > 4) {
      meld('de pagina eronder scrolt mee', waar, `${scrollVoor} → ${scrollNa}`);
    }

    // 7: Escape sluit en geeft de focus terug
    await p.keyboard.press('Escape');
    await p.waitForTimeout(400);
    const na = await p.evaluate(() => ({
      open: document.querySelector('.mobile-nav').classList.contains('open'),
      focus: (document.activeElement && (document.activeElement.className || document.activeElement.tagName)) + '',
      inert: document.querySelector('.mobile-nav').hasAttribute('inert'),
      resten: [...document.querySelectorAll('[inert]')].filter((e) => !e.classList.contains('mobile-nav')).length,
    }));
    if (na.open) meld('Escape sluit de lade niet', waar, '');
    if (!na.inert) meld('gesloten lade blijft in de tabvolgorde', waar, '');
    if (!/menu-toggle/.test(na.focus)) meld('focus keert niet terug naar de menuknop', waar, `staat op ${na.focus}`);
    if (na.resten) meld('inert blijft achter na sluiten', waar, `${na.resten} element(en)`);

    // 9: is de pagina weer bedienbaar?
    const weerOpen = await p.evaluate(() => {
      const k = document.querySelector('.menu-toggle');
      return k && k.getAttribute('aria-expanded');
    });
    if (weerOpen !== 'false') meld('aria-expanded klopt niet na sluiten', waar, String(weerOpen));
  }

  if (consolefouten.length) meld('consolefout', `${b}x${h}`, [...new Set(consolefouten)].slice(0, 3).join(' | '));
  await ctx.close();
}

await browser.close();
srv.close();

const perSoort = new Map();
for (const b of bevindingen) perSoort.set(b.soort, [...(perSoort.get(b.soort) || []), b]);
console.log(`\nVISUAILS — de mobiele lade, ${BREEDTES.length} breedtes × ${PAGINAS.length} pagina's\n`);
if (!bevindingen.length) console.log('GEEN BEVINDINGEN\n');
for (const [soort, lijst] of [...perSoort].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`── ${soort.toUpperCase()} (${lijst.length}) ──`);
  const gezien = new Set();
  for (const b of lijst) {
    const sleutel = b.detail;
    if (gezien.has(sleutel)) continue;
    gezien.add(sleutel);
    console.log(`   ${b.waar.padEnd(24)} ${b.detail}`);
  }
  console.log();
}
process.exit(bevindingen.length ? 1 : 0);
