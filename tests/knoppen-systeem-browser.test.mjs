/**
 * VISUAILS — het knoppensysteem, gemeten in de browser (lijst 88 + 89, 9 november 2026).
 *
 * Op de site, in het bestelformulier, in Studio, op de privélink en in /admin (licht en donker), op 1440 en
 * 390 px: elke knop (`.k`, `.btn`, `.knop`, `[data-rol]`) heeft een rol, het icoon van die rol, een hoogte van
 * 36, 44 of 52 (breekt de tekst op een telefoon, dan een regel erbij), is een pil, staat in letter 600, haalt
 * 4,5 : 1, en per blok staat er hoogstens één volle knop. Op een aanraakscherm is een kleine knop minstens 44
 * om op te tikken, zonder dat hij groter wordt. Geen pagina schuift opzij op 390.
 *
 * Vereist een verse build (npm run build).   node tests/knoppen-systeem-browser.test.mjs
 */
import fs from 'node:fs';
import { chromium } from 'playwright';
import { browserPad } from '../scripts/lib/browserpad.mjs';
import { startStudio, VOLT } from './lib/studio-worker.mjs';
import { mintToken, hashToken } from '../src/lib/token.js';

let fout = 0;
const ok = (naam, waar, extra = '') => { console.log(`${waar ? 'ok  ' : 'FOUT'} ${naam}${!waar && extra ? `\n     ${extra}` : ''}`); if (!waar) fout += 1; };

const at = await mintToken();
const tok = await mintToken();
const studio = await startStudio({ extraSql: [
  `INSERT INTO admin_users (id, email, password_hash) VALUES (901, 'studio@visuails.com', 'x')`,
  `INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (901, 901, '${await hashToken(at)}', '2099-01-01T00:00:00Z')`,
  /* het revisievenster van de geleverde bestelling open: dan staan Goedkeuren, Ongedaan maken en de revisieronde er */
  `UPDATE orders SET delivered_at=date('now','-1 day'), closed_at=NULL WHERE id=7090`,
  `INSERT INTO order_tokens (order_id, token_hash) VALUES (7090, '${await hashToken(tok)}')`,
] });
const BASE = studio.url; const host = new URL(BASE).hostname;
const browser = await chromium.launch({ executablePath: process.env.CHROME || browserPad() });

const ROLLEN = { doorgaan: 'pijl', bevestigen: 'vink', downloaden: 'downloaden', aanmerken: 'potlood', terugnemen: 'ongedaan', wijzigen: 'potlood', toevoegen: 'plus', uploaden: 'uploaden', navigeren: 'pijl-schuin', terug: 'pijl-links', gevaarlijk: 'verwijderen', uitloggen: 'uitloggen', contact: null, bediening: null, sluiten: null, kiezen: null };

const MEET = (ROLLEN) => {
  const zichtbaar = (el) => { const r = el.getBoundingClientRect(); if (!r.width || !r.height) return false; const s = getComputedStyle(el); return s.visibility !== 'hidden' && s.display !== 'none' && !el.closest('[hidden], details:not([open]) > :not(summary)'); };
  const rgba = (c) => { const m = String(c).match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
  const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const grond = (el) => { for (let n = el; n; n = n.parentElement) { const b = rgba(getComputedStyle(n).backgroundColor); if (b && b[3] > 0.9) return b; } return [255, 255, 255, 1]; };
  const uit = [];
  for (const el of document.querySelectorAll('.k, .btn, .knop, [data-rol]')) {
    if (!zichtbaar(el)) continue;
    if (el.closest('.cc-panel, #cookie-consent')) continue;
    const s = getComputedStyle(el); const r = el.getBoundingClientRect();
    const rol = el.dataset.rol || '';
    const ikonen = [...el.querySelectorAll('svg.ik')].map((x) => [...x.classList].find((k) => k.startsWith('ik-') && k !== 'ik-a')).filter(Boolean);
    const tekst = (el.innerText || '').replace(/\s+/g, ' ').trim();
    const tekstlink = el.classList.contains('k-tekst');
    const vol = !tekstlink && (el.classList.contains('k-vol') || el.classList.contains('btn-primary') || el.classList.contains('knop-inkt'));
    /* het blok: het kleinste vak waar de knop in staat */
    const blok = el.closest('header, footer, nav, .mobile-nav, .mobile-cta, .h-acties, .acts, .nd-knop, form, li, tr, details, article, aside, section, .card, [class*="kaart"], .volgende-stap, .st-map, .st-watnu') || document.body;
    if (!blok.dataset.kBlok) blok.dataset.kBlok = String(Math.random()).slice(2, 10);
    const bg = rgba(s.backgroundColor); const kl = rgba(s.color);
    const achter = bg && bg[3] > 0.9 ? bg : grond(el.parentElement || el);
    const a = lum(kl), b = lum(achter); const contrast = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    const regel = parseFloat(s.lineHeight) || parseFloat(s.fontSize) * 1.2;
    uit.push({ rol, ikonen, tekst: tekst.slice(0, 50), cls: String(el.className).slice(0, 70), h: Math.round(r.height * 10) / 10, minH: parseFloat(s.minHeight) || 0, regel,
      rad: parseFloat(s.borderTopLeftRadius), radR: parseFloat(s.borderBottomRightRadius), paar: !!el.closest('.h-acties') && s.clipPath !== 'none', gewicht: s.fontWeight, letter: parseFloat(s.fontSize), vol, tekstlink, blok: blok.dataset.kBlok,
      contrast: Math.round(contrast * 100) / 100, wa: /wa\.me/.test(el.getAttribute('href') || ''), ruimte: s.paddingLeft });
  }
  return { knoppen: uit, breed: document.documentElement.scrollWidth, vp: innerWidth };
};

async function pagina(naam, url, { breed = 1440, cookies = [], dark = false, voor } = {}) {
  const ctx = await browser.newContext({ viewport: { width: breed, height: 900 }, reducedMotion: 'reduce', bypassCSP: true });
  await ctx.addCookies([...cookies, ['vis_consent', encodeURIComponent(JSON.stringify({ version: 1, analytics: false, at: new Date().toISOString() }))]].map(([name, value, p = '/']) => ({ name, value, domain: host, path: p })));
  const page = await ctx.newPage();
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, (r) => r.abort());
  await page.goto(BASE + url, { waitUntil: 'load' });
  await page.waitForTimeout(500);
  if (voor) await voor(page);
  const m = await page.evaluate(MEET, ROLLEN);
  await ctx.close();
  void dark;
  return m;
}

const SCHERMEN = [
  ['site /nl/', '/nl/'], ['site /nl/pricing/', '/nl/pricing/'], ['site /nl/contact/', '/nl/contact/'], ['site /nl/plans/', '/nl/plans/'], ['site /nl/404', '/nl/bestaat-niet'],
  ['formulier stap 1', '/nl/start/catalog/'],
  ['Studio bestelkaart', '/account/orders?order=7090#order-7090', { cookies: [['vis_account', VOLT.token]], voor: (p) => p.evaluate(() => document.querySelectorAll('#order-7090 details').forEach((d) => { d.open = true; })) }],
  ['Studio abonnement', '/account/plan', { cookies: [['vis_account', VOLT.token]] }],
  ['Studio gegevens', '/account/details', { cookies: [['vis_account', VOLT.token]] }],
  ['privélink', `/o/${tok}`],
  ['/admin licht', '/admin', { cookies: [['vis_admin', at]] }],
  ['/admin bestelpagina licht', '/admin/orders/7090/files', { cookies: [['vis_admin', at]] }],
  ['/admin klant licht', '/admin/customers/7007', { cookies: [['vis_admin', at]], voor: (p) => p.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true; })) }],
  ['/admin donker', '/admin', { cookies: [['vis_admin', at], ['vis_thema', 'donker', '/admin']] }],
  ['/admin bestelpagina donker', '/admin/orders/7090/files', { cookies: [['vis_admin', at], ['vis_thema', 'donker', '/admin']] }],
];

const MATEN = [36, 44, 52];
for (const breed of [1440, 390]) {
  for (const [naam, url, opt = {}] of SCHERMEN) {
    const { knoppen, breed: sw } = await pagina(naam, url, { ...opt, breed });
    const n = `${naam} (${breed})`;
    if (breed === 390) ok(`${n}: geen zijwaartse scroll`, sw <= 390, `scrollWidth ${sw}`);
    ok(`${n}: er staan knoppen`, knoppen.length > 0);
    const zonderRol = knoppen.filter((k) => !(k.rol in ROLLEN));
    ok(`${n}: elke knop heeft een rol`, zonderRol.length === 0, zonderRol.slice(0, 4).map((k) => `${k.tekst} [${k.cls}] rol="${k.rol}"`).join(' · '));
    const fouteIk = knoppen.filter((k) => ROLLEN[k.rol] && !k.ikonen.includes(`ik-${ROLLEN[k.rol]}`));
    ok(`${n}: elke knop het icoon van zijn rol`, fouteIk.length === 0, fouteIk.slice(0, 4).map((k) => `${k.tekst} (${k.rol}: ${k.ikonen.join(',') || 'geen'})`).join(' · '));
    const waZonder = knoppen.filter((k) => k.rol === 'contact' && !k.wa && !k.ikonen.includes('ik-mail') && /mail/i.test(k.tekst));
    ok(`${n}: contact per mail heeft de envelop`, waZonder.length === 0, waZonder.map((k) => k.tekst).join(' · '));
    const echte = knoppen.filter((k) => !k.tekstlink && /\b(k|btn|knop)\b/.test(k.cls));
    const maat = echte.filter((k) => { const m = MATEN.find((x) => x === Math.round(k.minH)); if (!m) return true; const extra = k.h - m; const regels = (k.h - 12) / k.regel; /* op een telefoon breekt een lange tekst: n regels plus 6 px boven en onder */
      return !(Math.abs(extra) < 1 || (breed === 390 && Math.round(regels) >= 2 && Math.abs(regels - Math.round(regels)) < 0.1)); });
    ok(`${n}: elke knop 36, 44 of 52 hoog`, maat.length === 0, maat.slice(0, 5).map((k) => `${k.tekst} ${k.h}/${k.minH}`).join(' · '));
    const geenPil = echte.filter((k) => !k.paar && k.rad + 0.5 < Math.min(k.h / 2, 18));
    ok(`${n}: elke knop een pil`, geenPil.length === 0, geenPil.slice(0, 4).map((k) => `${k.tekst} ${k.rad}`).join(' · '));
    const gewicht = knoppen.filter((k) => /\b(k|btn|knop)\b/.test(k.cls) && k.gewicht !== '600');
    ok(`${n}: letter 600`, gewicht.length === 0, gewicht.slice(0, 4).map((k) => `${k.tekst} ${k.gewicht}`).join(' · '));
    const klein = knoppen.filter((k) => /\b(k|btn|knop)\b/.test(k.cls) && k.letter < 11.5);
    ok(`${n}: letter minstens 11,5 px`, klein.length === 0, klein.map((k) => `${k.tekst} ${k.letter}`).join(' · '));
    const zwak = echte.filter((k) => k.contrast < 4.5);
    ok(`${n}: elke knop 4,5 : 1 of meer`, zwak.length === 0, zwak.slice(0, 4).map((k) => `${k.tekst} ${k.contrast}`).join(' · '));
    const perBlok = {};
    for (const k of echte.filter((x) => x.vol)) (perBlok[k.blok] ||= []).push(k.tekst);
    const dubbel = Object.values(perBlok).filter((l) => l.length > 1);
    ok(`${n}: per blok hoogstens één volle knop`, dubbel.length === 0, dubbel.slice(0, 3).map((l) => l.join(' + ')).join(' · '));
  }
}

/* aanraakscherm: een kleine knop is minstens 44 om op te tikken, en hij wordt er niet groter van */
{
  const meet = async (touch) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: touch, isMobile: touch, bypassCSP: true });
    await ctx.addCookies([{ name: 'vis_admin', value: at, domain: host, path: '/' }]);
    const p = await ctx.newPage();
    await p.goto(BASE + '/admin/orders/7090/files', { waitUntil: 'load' });
    const r = await p.evaluate(() => [...document.querySelectorAll('.btn.btn-sm')].filter((e) => e.getBoundingClientRect().height).slice(0, 12).map((e) => {
      const a = getComputedStyle(e, '::after'); const h = e.getBoundingClientRect().height;
      const tik = a.content !== 'none' && a.position === 'absolute' ? h - parseFloat(a.top) - parseFloat(a.bottom) : h;
      return { h, tik, grof: matchMedia('(pointer: coarse)').matches };
    }));
    await ctx.close();
    return r;
  };
  const fijn = await meet(false); const grof = await meet(true);
  ok('aanraakscherm: (pointer: coarse) is nagebootst', grof.length > 0 && grof[0].grof);
  ok('aanraakscherm: elke kleine knop minstens 44 om op te tikken', grof.every((k) => k.tik >= 44), JSON.stringify(grof.slice(0, 3)));
  ok('aanraakscherm: zonder dat de knop groter wordt (geen verspringen)', grof.every((k, i) => !fijn[i] || Math.abs(k.h - fijn[i].h) < 0.5));
}

/* /admin: de gevaarlijke knop opent eerst de vraag; pas "Ja, …" verstuurt */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, bypassCSP: true });
  await ctx.addCookies([{ name: 'vis_admin', value: at, domain: host, path: '/' }]);
  const p = await ctx.newPage();
  let dialoog = false; p.on('dialog', (d) => { dialoog = true; d.dismiss(); });
  await p.goto(BASE + '/admin/orders/7090/files', { waitUntil: 'load' });
  await p.evaluate(() => document.querySelectorAll('details').forEach((d) => { if (!d.classList.contains('k-zeker')) d.open = true; }));
  const z = p.locator('details.k-zeker').first();
  ok('/admin: er staat een gevaarlijke knop met een tweede stap', await z.count() === 1);
  const url0 = p.url();
  await z.locator('summary').click();
  await p.waitForTimeout(200);
  ok('/admin: de eerste klik verstuurt niets en opent de vraag', p.url() === url0 && await z.evaluate((d) => d.open));
  ok('/admin: "Zeker weten? Dit kan niet terug." met een volle knop "Ja, …"', /Zeker weten\? Dit kan niet terug\./.test(await z.innerText()) && /^Ja, /.test((await z.locator('button').innerText()).trim()));
  ok('/admin: geen confirm()-venster', !dialoog);
  await ctx.close();
}

await browser.close(); await studio.dispose();
console.log(fout ? `\n${fout} fout(en)` : '\nalles goed');
process.exit(fout ? 1 : 0);
