/* Dezelfde meting als _knopmaat.mjs, maar voor /admin. Dat scherm heeft een
   sessie, een database en een deploy nodig; scripts/admin-render.mjs bouwt het
   met nepdata in dit proces, en dit script leent zijn opstelling. */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT = process.cwd();
const DUMP = path.join(ROOT, 'kladblok', '_adminhtml');
fs.mkdirSync(DUMP, { recursive: true });

const PAGINAS = ['/admin', '/admin/orders/90/files', '/admin/planning', '/admin/orders'];
for (const p of PAGINAS) {
  try {
    execFileSync('node', ['scripts/admin-render.mjs', p], { env: { ...process.env, VISUAILS_DUMP_HTML: DUMP }, stdio: 'pipe' });
  } catch (e) { console.log('kon', p, 'niet renderen:', String(e.message).slice(0, 120)); }
}

const METEN = `(() => {
  const uit = []; const zien = new Set();
  for (const el of document.querySelectorAll('a.btn, button, .btn, input[type=submit]')) {
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
    const cs = getComputedStyle(el);
    const klas = (el.className || '').toString().trim().split(/\\s+/).slice(0, 3).join(' ');
    const s = klas + '|' + Math.round(r.height); if (zien.has(s)) continue; zien.add(s);
    uit.push({ klas: klas || el.tagName.toLowerCase(), h: Math.round(r.height), fs: Math.round(parseFloat(cs.fontSize) * 10) / 10,
      px: cs.paddingLeft + '/' + cs.paddingRight, r: cs.borderRadius.split(' ')[0],
      tekst: (el.textContent || el.value || '').trim().replace(/\\s+/g, ' ').slice(0, 24) });
  }
  return uit;
})()`;

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.route('**/*', async (route) => {
  const u = new URL(route.request().url());
  if (u.pathname.endsWith('.css')) {
    const file = ['public', 'dist'].map((d) => path.join(ROOT, d, u.pathname.replace(/^\//, ''))).find((f) => fs.existsSync(f));
    if (file) return route.fulfill({ contentType: 'text/css', body: fs.readFileSync(file) });
  }
  if (u.pathname.endsWith('.woff2')) {
    const file = path.join(ROOT, 'dist', u.pathname.replace(/^\//, ''));
    if (fs.existsSync(file)) return route.fulfill({ contentType: 'font/woff2', body: fs.readFileSync(file) });
  }
  return route.fulfill({ status: 204, body: '' });
});
const alles = new Map();
for (const naam of fs.readdirSync(DUMP)) {
  const page = await ctx.newPage();
  await ctx.route('**/__p', (r) => r.fulfill({ contentType: 'text/html', body: fs.readFileSync(path.join(DUMP, naam), 'utf8') }));
  await page.goto('https://visuails.com/__p', { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  for (const r of await page.evaluate(METEN)) alles.set(r.klas + '|' + r.h, r);
  await page.close();
}
const rijen = [...alles.values()].sort((a, b) => b.h - a.h || b.fs - a.fs);
console.log('\n══ /ADMIN ' + '═'.repeat(56));
for (const r of rijen) {
  console.log(String(r.h).padStart(4) + 'px  ' + (r.fs + 'px').padStart(7) + '  ' + r.px.padStart(18) + '  ' + r.r.padStart(7) + '  ' + r.klas.padEnd(30).slice(0, 30) + '  ' + r.tekst);
}
await browser.close();
