// 2FA in admin: instellen met een echte TOTP-code, uitloggen, inloggen met code, herstelcode.
import crypto from 'node:crypto';
import { start, tekst, SITE, foto } from './_dl.mjs';
import { adminLogin } from './_admin.mjs';
function b32(s) { const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; let bits = ''; for (const c of s.replace(/=+$/, '').toUpperCase()) { const v = A.indexOf(c); if (v < 0) continue; bits += v.toString(2).padStart(5, '0'); } const out = []; for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2)); return Buffer.from(out); }
function totp(secret, t = Date.now()) { const c = Buffer.alloc(8); c.writeBigUInt64BE(BigInt(Math.floor(t / 30000))); const h = crypto.createHmac('sha1', b32(secret)).update(c).digest(); const o = h[h.length - 1] & 15; return String(((h.readUInt32BE(o) & 0x7fffffff) % 1e6)).padStart(6, '0'); }
const s = await start(); const { page } = s;
await adminLogin(page);
await page.goto(SITE + '/admin/security', { waitUntil: 'load' });
await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), page.locator('form[action="/admin/security"] button').first().click()]);
const t = (await tekst(page, 'main, body')).replace(/\n{2,}/g, '\n');
console.log('STAP 1:\n' + t.slice(t.indexOf('TWEE'), t.indexOf('TWEE') + 1400));
await foto(page, 'admin-2fa-start', { vol: true });
const geheim = (t.match(/\b([A-Z2-7]{16,})\b/) || [])[1] || await page.evaluate(() => { const u = document.querySelector('a[href^="otpauth"]')?.getAttribute('href') || document.body.innerHTML.match(/otpauth:[^"'<\s]+/)?.[0] || ''; return (u.match(/secret=([A-Z2-7]+)/) || [])[1] || ''; });
console.log('geheim gevonden:', !!geheim, geheim.length);
console.log(JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('form')].map((f) => f.getAttribute('action') + ' :: ' + [...f.elements].filter(e => e.name).map((e) => `${e.type} ${e.name}`).join(', ')))));
const f = page.locator('form[action="/admin/security"]:has(input[name="code"])').first();
await f.locator('input[name="code"]').fill(totp(geheim));
await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), f.locator('button[type="submit"]').first().click()]);
const t2 = (await tekst(page, 'main, body')).replace(/\n{2,}/g, '\n');
console.log('NA BEVESTIGEN:\n' + t2.slice(t2.indexOf('TWEE'), t2.indexOf('TWEE') + 1500));
const herstel = (t2.match(/[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}/g) || []);
console.log('herstelcodes:', herstel.length);
await foto(page, 'admin-2fa-aan', { vol: true });
// uitloggen en opnieuw inloggen
await Promise.all([page.waitForNavigation(), page.locator('form[action="/admin/logout"] button').first().click()]);
await page.goto(SITE + '/admin/login', { waitUntil: 'load' });
await page.fill('input[name="email"]', 'hello@visuails.com'); await page.fill('input[name="password"]', 'proef-wachtwoord');
await Promise.all([page.waitForNavigation(), page.click('button[type="submit"]')]);
console.log('na wachtwoord:', page.url(), (await tekst(page, 'main, body')).replace(/\s+/g, ' ').slice(0, 300));
await page.fill('input[name="code"]', '000000');
await Promise.all([page.waitForNavigation(), page.click('button[type="submit"]')]);
console.log('foute code:', page.url(), (await tekst(page, 'main, body')).replace(/\s+/g, ' ').slice(0, 250));
await page.fill('input[name="code"]', totp(geheim, Date.now() + 30000));
await Promise.all([page.waitForNavigation(), page.click('button[type="submit"]')]);
console.log('goede code:', page.url());
if (herstel[0]) {
  await Promise.all([page.waitForNavigation(), page.locator('form[action="/admin/logout"] button').first().click()]);
  await page.goto(SITE + '/admin/login'); await page.fill('input[name="email"]', 'hello@visuails.com'); await page.fill('input[name="password"]', 'proef-wachtwoord');
  await Promise.all([page.waitForNavigation(), page.click('button[type="submit"]')]);
  await page.fill('input[name="code"]', herstel[0]);
  await Promise.all([page.waitForNavigation(), page.click('button[type="submit"]')]);
  console.log('herstelcode:', page.url(), (await tekst(page, 'main, body')).replace(/\s+/g, ' ').slice(0, 200));
}
// weer uitzetten zodat de rest van de scripts werkt
await page.goto(SITE + '/admin/security', { waitUntil: 'load' });
const uit = page.locator('form[action="/admin/security"]:has(input[value="stop"]), form[action="/admin/security"]:has(input[name="doen"][value="uit"])');
console.log('uitzetformulier:', await uit.count(), JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('form')].map((f) => f.getAttribute('action') + ' :: ' + [...f.elements].filter(e => e.name).map((e) => `${e.type} ${e.name}=${e.value}`).join(', ')))));
console.log(s.fouten); await s.stop();
