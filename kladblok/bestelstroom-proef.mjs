/* Loopt de vernieuwde catalogstroom door in een echte browser tegen dist/ —
   3 september 2026. Geen toets in de keten (die staan in tests/); dit is de
   proef die de wijzigingen van die dag in beeld brengt: het getalveld, de knop
   "Meer dan 20", de tussenstap bij ontbrekende foto's, het overslaan van stap 4
   en de beeldstrook op stap 5. Draai: node kladblok/bestelstroom-proef.mjs */
import { chromium } from 'playwright';
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve('dist');
const PORT = 8097;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg' };
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  let p = path.join(ROOT, decodeURIComponent(url.pathname));
  try {
    if ((await stat(p)).isDirectory()) p = path.join(p, 'index.html');
  } catch { /* val hieronder */ }
  try {
    const body = await readFile(p);
    res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    if (url.pathname.startsWith('/account/me')) { res.writeHead(401); return res.end('{}'); }
    res.writeHead(404); res.end('nope');
  }
}).listen(PORT);

const out = [];
const log = (k, v) => { out.push([k, v]); console.log(`${v ? ' ok ' : 'FAIL'} ${k}`); };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });

await page.goto(`http://127.0.0.1:${PORT}/nl/start/catalog/`);
await page.waitForSelector('[data-pl-qty-input]');
log('getalveld aanwezig, select verborgen', await page.$eval('select[name="products"]', (s) => s.hidden));
await page.fill('[data-pl-qty-input]', '3');
await page.waitForTimeout(200);
log('select volgt het getalveld (3)', await page.$eval('select[name="products"]', (s) => s.value) === '3');
log('totaal verschijnt', /€/.test(await page.$eval('[data-pl-total]', (e) => e.textContent)));
await page.click('[data-pl-qty-inc]');
log('plus telt op (4)', await page.$eval('select[name="products"]', (s) => s.value) === '4');
await page.click('[data-pl-qty-set="20"]');
log('snelknop 20 werkt', await page.$eval('select[name="products"]', (s) => s.value) === '20');
log('plus staat uit op het maximum', await page.$eval('[data-pl-qty-inc]', (b) => b.disabled));
await page.fill('[data-pl-qty-input]', '35');
await page.waitForTimeout(150);
log('boven 20 wordt afgeklemd op 20', await page.$eval('select[name="products"]', (s) => s.value) === '20');
await page.click('[data-pl-qty-more]');
await page.waitForTimeout(200);
log('contactpaneel open', await page.$eval('[data-pl-more-panel]', (e) => !e.hidden));
log('WhatsApp-knop met tekst', (await page.$eval('[data-pl-more-panel] a[href*="wa.me"]', (a) => a.href)).includes('text='));
log('mailknop met onderwerp', (await page.$eval('[data-pl-more-panel] a[href^="mailto:"]', (a) => a.href)).includes('subject='));
log('knop Verder van stap 1 is weg', await page.$eval('[data-pl-step="1"] [data-pl-next]', (b) => b.hidden || !b.offsetParent));
log('rest van stap 1 dicht (verhouding)', await page.$eval('[data-pl-ratio]', (e) => !e.offsetParent));
await page.click('[data-pl-qty-back]');
await page.waitForTimeout(150);
log('terug: paneel dicht, Verder terug', await page.$eval('[data-pl-more-panel]', (e) => e.hidden) && await page.$eval('[data-pl-step="1"] [data-pl-next]', (b) => !!b.offsetParent));
await page.screenshot({ path: 'kladblok/proef-stap1.png', fullPage: false });

// Klein: 3 producten → stap 4 overgeslagen
await page.fill('[data-pl-qty-input]', '3');
await page.waitForTimeout(150);
log('rail: levertijd verborgen onder de drempel', await page.$eval('[data-pl-rail-item="4"]', (b) => !b.closest('li').offsetParent));
log('rail: laatste stap hernummerd naar 04', (await page.$eval('[data-pl-rail-item="5"] .pl-rail-n', (e) => e.textContent.trim())) === '04');
await page.click('[data-pl-step="1"] [data-pl-next]');
await page.waitForTimeout(300);
log('op stap 2', await page.$eval('[data-pl-step="2"]', (e) => e.classList.contains('is-current')));
log('kaartvakje draagt de één-regel-uitleg', (await page.$$('.pu-slot-how')).length >= 4);
log('uitleg staat ingeklapt onder de kaarten', await page.$eval('.pu-guide-fold', (e) => !!e && !e.querySelector('details[open]')));
await page.click('[data-pl-step="2"] [data-pl-next]');
await page.waitForTimeout(300);
log('tussenstap bij ontbrekende foto\'s', await page.$eval('[data-pl-missing]', (e) => !e.hidden));
log('en blijft op stap 2', await page.$eval('[data-pl-step="2"]', (e) => e.classList.contains('is-current')));
await page.screenshot({ path: 'kladblok/proef-stap2.png' });
await page.click('[data-pl-missing-go]');
await page.waitForTimeout(300);
log('toch versturen → stap 3', await page.$eval('[data-pl-step="3"]', (e) => e.classList.contains('is-current')));
await page.fill('input[name="first_name"]', 'Proef');
await page.fill('input[name="last_name"]', 'Persoon');
await page.fill('input[name="brand"]', 'Proefmerk');
for (const [n, v] of [['address_line1', 'Proefstraat 1'], ['postal_code', '1234 AB'], ['city', 'Proefstad'], ['phone', '0612345678']]) {
  if (await page.$(`input[name="${n}"]`)) await page.fill(`input[name="${n}"]`, v);
}
if (await page.$('input[name="no_vat"]')) await page.check('input[name="no_vat"]');
if (await page.$('input[name="reg_number"]')) await page.fill('input[name="reg_number"]', '12345678');
await page.fill('input[name="email"]', 'proef@example.com');
const country = await page.$('select[name="country"]');
if (country) await page.selectOption('select[name="country"]', 'NL');
await page.click('[data-pl-step="3"] [data-pl-next]');
await page.waitForTimeout(400);
console.log('   fout stap 3:', await page.$eval('#pl-err-3', (e) => e.hidden ? '(geen)' : e.textContent).catch(() => '?'), '| huidige stap:', await page.$eval('.pl-step.is-current', (e) => e.dataset.plStep));
log('stap 4 overgeslagen → samenvatting (stap 5)', await page.$eval('[data-pl-step="5"]', (e) => e.classList.contains('is-current')));
log('beeldstrook op de samenvatting', await page.$eval('[data-pl-sum-strip]', (e) => !e.hidden && e.childElementCount > 0));
await page.screenshot({ path: 'kladblok/proef-stap5.png' });
await page.click('[data-pl-step="5"] [data-pl-back]');
await page.waitForTimeout(300);
log('terug van 5 landt op 3', await page.$eval('[data-pl-step="3"]', (e) => e.classList.contains('is-current')));

// Groot: 12 producten → stap 4 bestaat
await page.click('[data-pl-rail-item="1"]');
await page.waitForTimeout(200);
await page.fill('[data-pl-qty-input]', '12');
await page.waitForTimeout(150);
log('rail: levertijd zichtbaar boven de drempel', await page.$eval('[data-pl-rail-item="4"]', (b) => !!b.closest('li').offsetParent));
log('rail: laatste stap weer 05', (await page.$eval('[data-pl-rail-item="5"] .pl-rail-n', (e) => e.textContent.trim())) === '05');

await page.goto(`http://127.0.0.1:${PORT}/nl/pricing/`);
log('abonnementsband op /pricing', !!(await page.$('.plan-band')));
await page.goto(`http://127.0.0.1:${PORT}/nl/`);
log('abonnementsband op de homepage', !!(await page.$('.plan-band')));
await page.$eval('.plan-band', (e) => e.scrollIntoView());
await page.waitForTimeout(400);
await page.screenshot({ path: 'kladblok/proef-planband.png' });

log('geen JS-fouten', errors.length === 0);
if (errors.length) console.log(errors.slice(0, 5));
await browser.close();
server.close();
console.log(`\n${out.filter(([, v]) => v).length}/${out.length} geslaagd`);
process.exit(out.every(([, v]) => v) ? 0 : 1);
