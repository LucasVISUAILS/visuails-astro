// Ronde 9 · F26: eerst een map met te kleine foto's (geweigerd), dan de goede map.
// Waar komen de foto's terecht?
import sharp from 'sharp';
import fs from 'node:fs';
import { start, SITE } from './_dl.mjs';
const dir = '/tmp/claude-0/f26'; fs.mkdirSync(dir, { recursive: true });
const kleuren = { voorkant: '#c33', achterkant: '#3c3', detail: '#33c', gedragen: '#cc3' };
const maak = async (w, naam, kleur) => { fs.mkdirSync(`${dir}/${w}`, { recursive: true }); const p = `${dir}/${w}/${naam}`; if (!fs.existsSync(p)) await sharp({ create: { width: w, height: Math.round(w * 1.25), channels: 3, background: kleur } }).jpeg().toFile(p); return p; };
const klein = []; const goed = [];
for (const prod of ['jas', 'broek']) for (const [s, k] of Object.entries(kleuren)) {
  klein.push(await maak(900, `${prod}-${s}.jpg`, k)); goed.push(await maak(2000, `${prod}-${s}.jpg`, k));
}
const k = await start(); const { page } = k;
await page.goto(SITE + '/nl/start/catalog', { waitUntil: 'load' });
await page.waitForSelector('#pl-form.is-live');
await page.fill('[data-pl-qty-input]', '2'); await page.dispatchEvent('[data-pl-qty-input]', 'change');
await page.evaluate(() => document.querySelector('.pl-step.is-current [data-pl-next]').click());
await page.waitForTimeout(800);
const staat = () => page.evaluate(() => [...document.querySelectorAll('.pu-card')].map((c) => ({
  kaart: c.querySelector('input[name^="product_p"]')?.value,
  vakken: [...c.querySelectorAll('.pu-slot')].map((s) => `${s.dataset.puSlot}:${s.dataset.state}:${(s.querySelector('.pu-slot-msg')?.textContent || '').slice(0, 50)}:${(s.querySelector('.pu-slot-img')?.getAttribute('src') || '').slice(-12)}`),
})));
const bak = () => page.evaluate(() => [...document.querySelectorAll('[data-pl-tray] li, .pu-tray li')].map((l) => l.innerText.replace(/\s+/g, ' ').slice(0, 80)));
const set = async (files) => { await page.setInputFiles('[data-pl-file]', files); await page.waitForTimeout(4000); };
//console.log('SLOT-HTML', await page.evaluate(() => document.querySelector('.pu-card .pu-slot, .pu-card [class*=slot]')?.outerHTML.slice(0, 900)));
await set(klein);
console.log('NA KLEIN', JSON.stringify(await staat(), null, 1), '\nbak:', await bak());
await set(goed);
console.log('NA GOED', JSON.stringify(await staat(), null, 1), '\nbak:', await bak());
console.log(k.fouten);
await k.stop();
