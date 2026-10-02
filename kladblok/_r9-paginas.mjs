// Ronde 9 · stap 8: elke pagina uit sitemap.xml op 1440/1280/768/390 — status, horizontale scroll, consolefouten,
// mislukte verzoeken, te kleine tekst, ontbrekende alt, beeldgewicht, meta/canonical/hreflang, taalwissel, h1.
// Schermafdrukken op 1280 en 390 in /tmp/claude-0/pag/. Uitvoer: /tmp/claude-0/paginas.json
//   node kladblok/_r9-paginas.mjs [filter]
import fs from 'node:fs';
import { chromium } from 'playwright';
import { SITE } from './_dl.mjs';
const D = '/tmp/claude-0/pag'; fs.mkdirSync(D, { recursive: true });
const filter = process.argv[2] || '';
const xml = await fetch(SITE + '/sitemap.xml').then((r) => r.text());
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname).filter((p) => p.includes(filter));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const BREEDTES = [1440, 1280, 768, 390];
const uit = [];
for (const w of BREEDTES) {
  const ctx = await b.newContext({ viewport: { width: w, height: w === 390 ? 844 : 900 }, isMobile: w === 390, hasTouch: w <= 768, locale: 'nl-NL' });
  await ctx.addCookies([{ name: 'vis_consent', value: encodeURIComponent(JSON.stringify({ analytics: false, v: 1 })), url: SITE }]);
  const page = await ctx.newPage();
  let fouten = [], mislukt = [], zwaar = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/status of 401/.test(m.text())) fouten.push(m.text().slice(0, 140)); }); /* 401 = /account/me voor een anonieme bezoeker (O60), apart genoteerd */
  page.on('pageerror', (e) => fouten.push('JS: ' + String(e.message).slice(0, 140)));
  page.on('requestfailed', (r) => { const u = r.url(); if (!/nep-mollie|google|analytics|wa\.me/.test(u)) mislukt.push(u.replace(SITE, '').slice(0, 100) + ' ' + (r.failure()?.errorText || '')); });
  page.on('response', async (r) => {
    if (r.status() >= 400 && !/favicon|\/account\/me$/.test(r.url())) mislukt.push(`${r.status()} ${r.url().replace(SITE, '').slice(0, 100)}`);
    if (r.request().resourceType() === 'image') { const len = Number(r.headers()['content-length'] || 0); if (len > 350_000) zwaar.push(`${r.url().replace(SITE, '')} ${Math.round(len / 1024)} kB`); }
  });
  for (const p of urls) {
    fouten = []; mislukt = []; zwaar = [];
    const res = await page.goto(SITE + p, { waitUntil: 'load' }).catch((e) => null);
    await page.waitForTimeout(350);
    /* Eén keer helemaal naar beneden voor lazy beelden en "in beeld"-effecten. */
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } window.scrollTo(0, 0); });
    await page.waitForTimeout(250);
    const info = await page.evaluate((w) => {
      const zichtbaar = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0.05; };
      const klein = [];
      for (const e of document.querySelectorAll('main *, header *, footer *')) {
        if (!e.childNodes.length || ![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1)) continue;
        if (!zichtbaar(e)) continue;
        const fs = parseFloat(getComputedStyle(e).fontSize);
        if (fs < 11.5) klein.push(`${fs}px "${e.textContent.trim().slice(0, 30)}"`);
      }
      const breed = [...document.querySelectorAll('main *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > w + 2 && getComputedStyle(e).position !== 'fixed' && !e.closest('[class*="scroll"], [class*="rail"], [class*="marquee"], [style*="overflow"]'); }).slice(0, 3).map((e) => `${e.tagName.toLowerCase()}.${String(e.className).split(' ')[0]} →${Math.round(e.getBoundingClientRect().right)}`);
      const alt = [...document.images].filter((i) => !i.hasAttribute('alt')).map((i) => i.src.split('/').pop()).slice(0, 3);
      const hreflang = [...document.querySelectorAll('link[rel=alternate][hreflang]')].map((l) => `${l.hreflang}:${new URL(l.href).pathname}`);
      const wissel = [...document.querySelectorAll('a[hreflang], a[data-lang], .lang-switch a, [data-taal] a, a[lang]')].map((a) => a.getAttribute('href')).filter(Boolean).slice(0, 2);
      const ld = [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => { try { const j = JSON.parse(s.textContent); return [].concat(j['@graph'] || j).map((x) => x['@type']).join('+'); } catch { return 'ONGELDIG'; } });
      return {
        sw: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight,
        title: document.title, desc: document.querySelector('meta[name=description]')?.content || '',
        canonical: document.querySelector('link[rel=canonical]')?.href ? new URL(document.querySelector('link[rel=canonical]').href).pathname : '',
        lang: document.documentElement.lang, h1: [...document.querySelectorAll('h1')].filter(zichtbaar).map((h) => h.textContent.trim().slice(0, 60)),
        robots: document.querySelector('meta[name=robots]')?.content || '', og: !!document.querySelector('meta[property="og:image"]'),
        klein: klein.slice(0, 4), kleinN: klein.length, breed, alt, hreflang, wissel, ld,
      };
    }, w);
    const rij = { w, p, status: res ? res.status() : 'x', ...info, fouten: [...new Set(fouten)].slice(0, 4), mislukt: [...new Set(mislukt)].slice(0, 4), zwaar: [...new Set(zwaar)].slice(0, 3) };
    uit.push(rij);
    if (w === 1280 || w === 390) await page.screenshot({ path: `${D}/${p.replace(/\//g, '_') || '_'}-${w}.png`, fullPage: w === 390 ? false : false });
    const vlag = [rij.status !== 200 && 'STATUS ' + rij.status, rij.sw > w + 1 && `SCROLLT ${rij.sw}`, rij.fouten.length && 'CONSOLE', rij.mislukt.length && 'VERZOEK', rij.kleinN && `KLEIN×${rij.kleinN}`, rij.h1.length !== 1 && `H1×${rij.h1.length}`, rij.alt.length && 'ALT', rij.zwaar.length && 'ZWAAR'].filter(Boolean);
    if (vlag.length) console.log(`${w} ${p} ${vlag.join(' ')}`);
  }
  await ctx.close();
}
fs.writeFileSync('/tmp/claude-0/paginas.json', JSON.stringify(uit, null, 1));
console.log(`klaar: ${urls.length} pagina's × ${BREEDTES.length} breedtes`);
await b.close();
process.exit(0);
