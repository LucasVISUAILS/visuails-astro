import fs from 'node:fs'; import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
const ROOT = process.cwd();
const DUMP = path.join(ROOT, 'kladblok', '_adminhtml');
execFileSync('node', ['scripts/admin-render.mjs', '/admin/orders/90/files'], { env: { ...process.env, VISUAILS_DUMP_HTML: DUMP }, stdio: 'pipe' });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.route('**/*', async (route) => {
  const u = new URL(route.request().url());
  if (u.pathname.endsWith('.css')) { const f = ['public','dist'].map((d)=>path.join(ROOT,d,u.pathname.replace(/^\//,''))).find((x)=>fs.existsSync(x)); if (f) return route.fulfill({ contentType:'text/css', body: fs.readFileSync(f) }); }
  if (u.pathname === '/__p') return route.fulfill({ contentType:'text/html', body: fs.readFileSync(path.join(DUMP,'_admin_orders_90_files.html'),'utf8') });
  return route.fulfill({ status: 204, body: '' });
});
const p = await ctx.newPage();
await p.goto('https://visuails.com/__p', { waitUntil: 'load' });
console.log(JSON.stringify(await p.evaluate(() => {
  const werk = document.querySelector('.werk');
  return [...werk.children].map((k) => {
    const r = k.getBoundingClientRect(); const cs = getComputedStyle(k);
    const eerste = k.firstElementChild;
    return { tag: k.tagName + '.' + k.className, top: Math.round(r.top), h: Math.round(r.height), disp: cs.display, mt: cs.marginTop,
      kind: eerste ? eerste.tagName + '.' + eerste.className + ' top ' + Math.round(eerste.getBoundingClientRect().top) : null };
  });
}), null, 1));
await b.close();
