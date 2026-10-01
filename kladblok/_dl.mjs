/* Hulpjes voor de doorloop: browser, pagina, schermafbeelding, formulier lezen. */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

export const SITE = 'http://localhost:4477';
export const PANEEL = 'http://localhost:4478';
export const OUT = '/tmp/claude-0/dl';
fs.mkdirSync(OUT, { recursive: true });

export async function start({ mobiel = false, cookie = null } = {}) {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await browser.newContext({
    viewport: mobiel ? { width: 390, height: 844 } : { width: 1280, height: 900 },
    deviceScaleFactor: 1,
    locale: 'nl-NL',
    isMobile: mobiel, hasTouch: mobiel,
  });
  if (cookie) await ctx.addCookies([{ name: 'vis_account', value: cookie, url: SITE }]);
  await ctx.addCookies([{ name: 'vis_consent', value: encodeURIComponent(JSON.stringify({ version: 1, analytics: false, at: new Date().toISOString() })), url: SITE }]).catch(() => {});
  /* nep-mollie.test → het paneel op :4478 (https-eis van offsite.js). */
  await ctx.route(/^https:\/\/nep-mollie\.test\//, async (route) => {
    const req = route.request();
    const url = req.url().replace('https://nep-mollie.test', PANEEL);
    const r = await fetch(url, { method: req.method(), headers: req.headers()['content-type'] ? { 'content-type': req.headers()['content-type'] } : {}, body: req.postData() ?? undefined, redirect: 'manual' });
    const headers = { 'content-type': r.headers.get('content-type') || 'text/html' };
    if (r.headers.get('location')) headers.location = r.headers.get('location');
    await route.fulfill({ status: r.status, headers, body: Buffer.from(await r.arrayBuffer()) });
  });
  const page = await ctx.newPage();
  const fouten = [];
  page.on('pageerror', (e) => fouten.push(`JS: ${String(e).slice(0, 300)}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) fouten.push(`console: ${m.text().slice(0, 300)}`); });
  page.on('response', (r) => { const s = r.status(); if (s >= 400 && !/favicon|\.map$/.test(r.url())) fouten.push(`${s} ${r.request().method()} ${r.url().replace(SITE, '')}`); });
  return { browser, ctx, page, fouten, async stop() { await browser.close(); } };
}

export async function foto(page, naam, { vol = false } = {}) {
  const p = path.join(OUT, `${naam}.png`);
  await page.screenshot({ path: p, fullPage: vol });
  return p;
}

/** Zichtbare tekst van de pagina, compact. */
export async function tekst(page, sel = 'body') {
  return page.evaluate((s) => (document.querySelector(s)?.innerText || '').replace(/\n{3,}/g, '\n\n'), sel);
}

/** Alle velden van een formulier, met zichtbaarheid. */
export async function velden(page, sel = 'form') {
  return page.evaluate((s) => {
    const f = document.querySelector(s);
    if (!f) return null;
    return [...f.querySelectorAll('input,select,textarea,button')].map((el) => {
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName.toLowerCase(), type: el.type, name: el.name, id: el.id,
        value: el.type === 'file' ? '' : String(el.value).slice(0, 40), checked: el.checked,
        required: el.required, disabled: el.matches(':disabled'), zichtbaar: r.width > 0 && r.height > 0,
        label: (el.labels?.[0]?.innerText || el.getAttribute('aria-label') || el.placeholder || el.innerText || '').trim().slice(0, 50),
      };
    });
  }, sel);
}

/** Alle links op de pagina (href + tekst). */
export async function links(page) {
  return page.evaluate(() => [...document.querySelectorAll('a[href]')].map((a) => ({ href: a.getAttribute('href'), tekst: a.innerText.trim().slice(0, 40) })));
}

export async function paneel(pad, opts) {
  const r = await fetch(PANEEL + pad, opts);
  const t = await r.text();
  try { return JSON.parse(t); } catch { return t; }
}
export const sql = (q) => paneel('/sql?q=' + encodeURIComponent(q));
export const sqlw = (q) => paneel('/sql', { method: 'POST', body: q });
export const mails = () => paneel('/mails');
export const mailtekst = (n) => paneel(`/mailtekst/${n}`);

/** Een kleine echte webp voor uploads. */
export function proefbeeld(naam = 'proef.webp') {
  const bron = '/home/claude/repo/public/img/lifestyle-flash-01-w380.webp';
  const doel = path.join(OUT, naam);
  if (!fs.existsSync(doel)) fs.copyFileSync(bron, doel);
  return doel;
}
