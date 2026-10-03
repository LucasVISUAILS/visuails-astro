// Herontwerp 3 oktober 2026 — de keuring na de bouw:
//   1. contrast van elke zichtbare tekst tegen zijn werkelijke achtergrond (WCAG 2.x),
//   2. Nederlandse woorden die in de Engelse stand van Studio blijven staan,
//   3. toetsenbordfocus: elke tab-stop in de zijbalk moet een zichtbare focusring hebben.
// Studio, /admin en het portaal (privélink), licht en donker, 1440 breed.
import { start, SITE, sql } from './_dl.mjs';
import { adminLogin } from './_admin.mjs';
import fs from 'node:fs';
const D = process.argv[2] || '/tmp/claude-0/keuring';
fs.mkdirSync(D, { recursive: true });
const volt = await fetch('http://localhost:4478/').then((r) => r.json()).then((j) => j.volt);
const rows = (r) => (Array.isArray(r) ? r : r.results || r.rows || []);

const STUDIO = ['/account', '/account/orders', '/account/brand-kit', '/account/details', '/account/invoices', '/account/plan', '/account/plan?tab=planning', '/account/plan?tab=bestellen', '/account/plan?tab=facturering'];
const o = rows(await sql(`SELECT id FROM orders WHERE status='delivered' ORDER BY id DESC LIMIT 1`))[0];
const k1 = rows(await sql(`SELECT id FROM customers ORDER BY id LIMIT 1`))[0];
const ADMIN = ['/admin', '/admin/planning', '/admin/customers', `/admin/customers/${k1.id}`, `/admin/orders/${o.id}`, '/admin/facturen'];

/* Draait in de pagina. Effectieve achtergrond: loop omhoog tot een dekkende
   kleur, meng halfdoorzichtige lagen erop. Een element met een achtergrond-
   afbeelding of verloop wordt overgeslagen (niet te meten zonder pixels). */
const meetContrast = () => {
  const rgb = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[\s,\/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p[3] ?? 1]; };
  const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const meng = (top, onder) => { const a = top[3]; return [top[0] * a + onder[0] * (1 - a), top[1] * a + onder[1] * (1 - a), top[2] * a + onder[2] * (1 - a), 1]; };
  const grond = (el) => {
    const lagen = []; let e = el;
    while (e && e.nodeType === 1) {
      const s = getComputedStyle(e);
      if (s.backgroundImage && s.backgroundImage !== 'none') return null;
      const c = rgb(s.backgroundColor); if (c && c[3] > 0) { lagen.push(c); if (c[3] >= 1) break; }
      e = e.parentElement;
    }
    let b = [255, 255, 255, 1];
    if (!lagen.length || lagen[lagen.length - 1][3] < 1) { const c = rgb(getComputedStyle(document.documentElement).backgroundColor); if (c && c[3] > 0) b = c; }
    for (let i = lagen.length - 1; i >= 0; i--) b = lagen[i][3] >= 1 ? lagen[i] : meng(lagen[i], b);
    return b;
  };
  const uit = [];
  for (const el of document.querySelectorAll('body *')) {
    if (!['#text'].some(() => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()))) continue;
    const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
    if (!r.width || !r.height || s.visibility === 'hidden' || +s.opacity === 0) continue;
    if (el.closest('[aria-hidden="true"], .sr-only, [hidden]')) continue;
    if (el.closest('button:disabled, [aria-disabled="true"], input:disabled')) continue;
    let k = rgb(s.color); const g = grond(el); if (!k || !g) continue;
    if (k[3] < 1) k = meng(k, g);
    const L1 = lum(k), L2 = lum(g); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const px = parseFloat(s.fontSize); const groot = px >= 24 || (px >= 18.66 && +s.fontWeight >= 700);
    const eis = groot ? 3 : 4.5;
    if (ratio < eis) uit.push(`${ratio.toFixed(2)}<${eis} ${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} "${el.textContent.trim().slice(0, 32)}"`);
  }
  return [...new Set(uit)];
};

/* Woorden die in Engelse tekst niet voorkomen. Klein gehouden: liever een gemiste
   dan tien valse meldingen. */
const NL = /\b(je|jouw|niet|nog|wordt|bestelling|bestellingen|factuur|facturen|gegevens|opslaan|annuleren|bekijk|maand|week van|klaar|betaald|toevoegen|verwijderen|terug|naar|meer|beelden|abonnement|staat|zijn|geen)\b/i;
const zoekNL = (re) => {
  const uit = [];
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    const t = n.textContent.trim(); if (!t) continue;
    const p = n.parentElement; if (!p || p.closest('script, style, [lang="nl"], .st-taal, .adm-taal, [hreflang]')) continue;
    const r = p.getBoundingClientRect(); if (!r.width) continue;
    if (new RegExp(re, 'i').test(t)) uit.push(t.slice(0, 70));
  }
  return [...new Set(uit)];
};

/* Tab door de pagina; per stop: heeft het element een zichtbare focusring? */
async function focusTocht(page, n, naam) {
  const zonder = []; let stops = 0;
  await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
  await page.mouse.click(1, 1).catch(() => {});
  for (let i = 0; i < n; i++) {
    await page.keyboard.press('Tab');
    const f = await page.evaluate(() => {
      const e = document.activeElement; if (!e || e === document.body) return null;
      const s = getComputedStyle(e);
      const ring = (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || (s.boxShadow && s.boxShadow !== 'none');
      const inZij = !!e.closest('.st-zij, .st-side, aside, nav, .adm-nav, .adm-side');
      return { ring, inZij, wat: `${e.tagName.toLowerCase()}.${String(e.className).split(' ')[0]} "${(e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 24)}"` };
    });
    if (!f) continue; stops++;
    if (!f.ring) zonder.push(f.wat);
    if (i === 3) await page.screenshot({ path: `${D}/focus-${naam}.png` });
  }
  return { stops, zonder: [...new Set(zonder)] };
}

const verslag = [];
const log = (s) => { console.log(s); verslag.push(s); };

for (const thema of ['licht', 'donker']) {
  // Studio, NL en EN
  for (const taal of ['nl', 'en']) {
    const k = await start({ viewport: { width: 1440, height: 900 } });
    await k.ctx.addCookies([{ name: 'vis_account', value: volt.token, url: SITE }, { name: 'vis_lang', value: taal, url: SITE }]);
    await k.page.goto(SITE + `/account?thema=${thema}`);
    for (const p of STUDIO) {
      await k.page.goto(SITE + p); await k.page.waitForTimeout(150);
      const c = await k.page.evaluate(meetContrast);
      if (c.length) log(`CONTRAST studio ${thema} ${taal} ${p}: ${c.slice(0, 8).join(' | ')}`);
      if (taal === 'en') {
        const nl = await k.page.evaluate(zoekNL, NL.source);
        if (nl.length) log(`NL-IN-EN ${thema} ${p}: ${nl.slice(0, 10).join(' ‖ ')}`);
        if (thema === 'licht') await k.page.screenshot({ path: `${D}/en-${p.replace(/[^a-z]+/g, '-')}.png`, fullPage: true });
      }
    }
    if (taal === 'nl') { await k.page.goto(SITE + '/account'); const f = await focusTocht(k.page, 14, `studio-${thema}`); log(`FOCUS studio ${thema}: ${f.stops} stops, zonder ring: ${f.zonder.join(' | ') || 'geen'}`); }
    await k.ctx.close?.();
  }
  // /admin
  {
    const k = await start({ viewport: { width: 1440, height: 900 } });
    await adminLogin(k.page);
    await k.page.goto(`${SITE}/admin?thema=${thema}`);
    for (const p of ADMIN) {
      await k.page.goto(SITE + p); await k.page.waitForTimeout(150);
      const c = await k.page.evaluate(meetContrast);
      if (c.length) log(`CONTRAST admin ${thema} ${p}: ${c.slice(0, 8).join(' | ')}`);
    }
    await k.page.goto(SITE + '/admin');
    const f = await focusTocht(k.page, 14, `admin-${thema}`); log(`FOCUS admin ${thema}: ${f.stops} stops, zonder ring: ${f.zonder.join(' | ') || 'geen'}`);
    await k.ctx.close?.();
  }
}
fs.writeFileSync(`${D}/verslag.txt`, verslag.join('\n') + '\n');
console.log('klaar');
process.exit(0);
