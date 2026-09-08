/* LEESBAARHEID VAN DE DOOR DE WORKER GERENDERDE SCHERMEN — 7 september 2026
   ═══════════════════════════════════════════════════════════════════════════
   kladblok/keuring.mjs meet tegen een draaiende dev-server op poort 4331. Dat
   werkt voor de site, maar /admin, /account en /o worden door een Pages Function
   gerenderd en bestaan daar dus niet. Dit harnas doet dezelfde meting op HTML
   die je zelf aanlevert: het schuift de string in een pagina, bedient de route
   naar public/ en dist/ net als admin-proef.mjs, en meet.

     KEUR=1 node kladblok/admin-proef.mjs            → alle adminroutes
     KEUR=1 node kladblok/admin-proef.mjs /admin/log → alleen die route

   DE MEETLAT IS DEZELFDE als op de site en staat één keer opgeschreven:
   contrast tegen de ECHTE grond eronder (4,5:1, of 3:1 voor grote tekst) en een
   ondergrens van 11,5px. Een werkscherm is geen uitzondering op leesbaarheid —
   het is het scherm waar het langst naar gekeken wordt. */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

/* De meting zelf, als string zodat page.evaluate hem kan draaien. Woordelijk
   dezelfde regels als kladblok/keuring.mjs; wie daar iets verandert, verandert
   het hier mee. */
export const METING = () => {
  const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= .03928 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
  const rgb = (s) => (s.match(/[\d.]+/g) || []).slice(0, 4).map(Number);
  const meng = (v, o) => v.length === 4 && v[3] < 1 ? v.slice(0, 3).map((c, i) => c * v[3] + o[i] * (1 - v[3])) : v.slice(0, 3);
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };
  const grond = (el) => {
    let n = el;
    while (n && n !== document.documentElement) {
      const c = rgb(getComputedStyle(n).backgroundColor);
      if (c.length >= 3 && (c[3] === undefined || c[3] > .5)) return c.slice(0, 3);
      n = n.parentElement;
    }
    return [255, 255, 255];
  };
  const slecht = [], klein = [];
  for (const el of document.body.querySelectorAll('*')) {
    const t = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ').trim();
    if (t.length < 2) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < .3) continue;
    if (el.closest('[aria-hidden="true"]') || el.closest('.sr-only')) continue;
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
    const fs2 = parseFloat(cs.fontSize), gew = parseInt(cs.fontWeight) || 400;
    const kleur = meng(rgb(cs.color), grond(el));
    const c = ratio(kleur, grond(el));
    const groot = fs2 >= 24 || (fs2 >= 18.66 && gew >= 700);
    const eis = groot ? 3 : 4.5;
    if (c < eis) slecht.push({ t: t.slice(0, 34), fs: +fs2.toFixed(1), c: +c.toFixed(2), eis, kl: cs.color, gr: grond(el).join(',') });
    if (fs2 < 11.5) klein.push({ t: t.slice(0, 30), fs: +fs2.toFixed(1) });
  }
  return { slecht, klein, breed: document.documentElement.scrollWidth };
};

/* Het bedienen van de bestanden: public/ eerst, dist/ als terugval, want
   /fonts/gedeeld.css bestaat pas na een build. */
export async function bedien(ctx) {
  await ctx.route('**/*', async (route) => {
    const u = new URL(route.request().url());
    const file = ['public', 'dist'].map((m) => path.join(ROOT, m, u.pathname.replace(/^\//, ''))).find(fs.existsSync);
    if (file && /\.(css|woff2?|ico|svg|png|webp)$/.test(u.pathname)) {
      const type = u.pathname.endsWith('.css') ? 'text/css' : u.pathname.endsWith('.woff2') ? 'font/woff2' : 'application/octet-stream';
      return route.fulfill({ contentType: type, body: fs.readFileSync(file) });
    }
    if (/\/(files|styles|shared)\/\d+(\/image)?$/.test(u.pathname)) return route.fulfill({ contentType: 'image/webp', body: fs.readFileSync(path.join(ROOT, 'public/img/catalog-after-w420.webp')) });
    return route.fulfill({ status: 204, body: '' });
  });
}

/* Meet één HTML-string op de drie breedtes. Geeft terug of er iets fout was,
   zodat een aanroeper er een exitcode van kan maken. */
export async function keur(ctx, naam, body) {
  let fout = 0;
  for (const [maat, w, h] of [['desktop', 1440, 900], ['tablet', 768, 1024], ['telefoon', 390, 844]]) {
    const page = await ctx.newPage();
    await page.setViewportSize({ width: w, height: h });
    await page.route('**/__page*', (route) => route.fulfill({ contentType: 'text/html', body }));
    await page.goto('https://visuails.com/__page', { waitUntil: 'networkidle' });
    const uit = await page.evaluate(METING);
    const overloop = uit.breed > w + 1;
    if (uit.klein.length || uit.slecht.length || overloop) {
      fout++;
      console.log(`\n── ${naam} · ${maat} (${w}) ${overloop ? `· ZIJWAARTSE OVERLOOP ${uit.breed}px` : ''}`);
      if (uit.klein.length) console.log('   te klein:', JSON.stringify(uit.klein.slice(0, 10)));
      if (uit.slecht.length) console.log('   te weinig contrast:', JSON.stringify(uit.slecht.slice(0, 10), null, 1));
    }
    await page.close();
  }
  if (!fout) console.log(`   ✓ ${naam}`);
  return fout;
}

/* Dit bestand is met opzet ALLEEN een bibliotheek. De nepdatabase waar /admin
   op draait staat in kladblok/admin-proef.mjs, en die twee keer opschrijven is
   precies hoe ze uit elkaar gaan lopen. Meten doe je dus vandaaruit:

     KEUR=1 node kladblok/admin-proef.mjs            → alle routes gekeurd
     KEUR=1 node kladblok/admin-proef.mjs /admin/log → alleen die route */
