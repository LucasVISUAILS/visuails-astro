// Ronde 9 · klanttype 13: catalog bestellen met alleen het toetsenbord (geen klik, geen fill).
import { start, SITE } from './_dl.mjs';
import { focusInfo, tabNaar } from './_toets.mjs';
import { FOTOS } from './_bestel.mjs';
export async function toetsenbordBestelling(email) {
const k = await start(); const { page } = k;
const zonderRing = new Set();
const log = [];
const noteer = (f, wat) => { if (f && !f.ring && !f.ouderRing && f.tag !== 'body' && f.zichtbaar) zonderRing.add(`${wat}: ${f.tag} ${f.name} "${f.label}"`); if (f && !f.zichtbaar && f.tag !== 'body') zonderRing.add(`ONZICHTBAAR ${wat}: ${f.tag} ${f.name} "${f.label}"`); };
const tab = async (test, wat, opts = {}) => { const lg = []; try { await tabNaar(page, test, { ...opts, log: lg }); } catch (e) { log.push(`VAST bij ${wat} — laatste stops: ${lg.slice(-6).map((f) => `${f.tag}:${f.name}:${f.label}`).join(' / ')}`); throw e; } lg.forEach((f) => noteer(f, wat)); return lg.length; };
const stapNr = () => page.evaluate(() => Number(document.querySelector('.pl-step.is-current')?.dataset.plStep || 0));
const fl = async () => { const f = await focusInfo(page); return `${f.tag}${f.name ? ':' + f.name : ''} "${f.label}"`; };
const verder = async (wat) => { await tab(() => document.activeElement?.matches('.pl-step.is-current [data-pl-next]'), wat); await page.keyboard.press('Enter'); await page.waitForTimeout(800); };
try {
await page.goto(SITE + '/nl/start/catalog'); await page.waitForSelector('#pl-form.is-live');
await verder('stap 1 zonder aantal');
log.push(`1 · Verder zonder aantal → stap ${await stapNr()}, focus ${await fl()}`);
await page.keyboard.type('1');
await tab(() => document.activeElement?.tagName === 'SUMMARY' && /Achtergrond/.test(document.activeElement.innerText), 'achtergrond');
await page.keyboard.press('Enter'); await page.waitForTimeout(300);
await page.keyboard.press('Tab'); noteer(await focusInfo(page), 'achtergrond-keuze');
const voor = await page.evaluate(() => document.querySelector('input[name=background]:checked')?.value);
await page.keyboard.press('ArrowRight'); await page.waitForTimeout(200);
log.push(`1 · achtergrond met pijl: ${voor} → ${await page.evaluate(() => document.querySelector('input[name=background]:checked')?.value)} (focus ${await fl()})`);
await verder('stap 1');
log.push(`2 · stap ${await stapNr()}, focus ${await fl()}`);
await tab(() => document.activeElement?.name === 'product_p1', 'productnaam');
await page.keyboard.type('Toetsenbordtrui');
let i = 0;
for (const vak of ['Voorkant', 'Achterkant', 'Detail']) {
  await tab((v) => (document.activeElement?.getAttribute('aria-label') || document.activeElement?.innerText || '').trim().startsWith(v), `vak ${vak}`, { arg: vak, max: 40 });
  let kiezer = null;
  for (const toets of ['Enter', 'Space', 'Enter']) {
    await page.waitForTimeout(800);
    const kiezerP = page.waitForEvent('filechooser', { timeout: 3000 }).catch(() => null);
    await page.keyboard.press(toets); kiezer = await kiezerP;
    if (kiezer) break;
    log.push(`2 · vak ${vak}: ${toets} gaf (headless) geen kiezer — opnieuw`);
  }
  if (!kiezer) { log.push(`2 · vak ${vak}: Enter opent geen bestandskiezer (focus ${await fl()})`); continue; }
  await kiezer.setFiles(FOTOS[i++]); await page.waitForTimeout(1000);
  log.push(`2 · vak ${vak}: foto gezet; focus daarna ${await fl()}`);
}
// het model: Tab komt op de eerste tegel, kiezen is spatie
await tab(() => document.activeElement?.name === 'model', 'model', { max: 60, terug: true }).catch(() => {});
if (await page.evaluate(() => document.activeElement?.name === 'model')) { await page.keyboard.press('Space'); log.push(`2 · model gekozen met spatie: ${await page.evaluate(() => document.querySelector('input[name=model]:checked')?.value)}`); }
await verder('stap 2');
log.push(`3 · stap ${await stapNr()}, focus ${await fl()}${(await stapNr()) === 2 ? ' — melding: ' + await page.evaluate(() => [...document.querySelectorAll('.pl-step.is-current [data-pl-step-error], .pl-step.is-current .pl-step-err, .pl-step.is-current [role=alert]')].map((e) => e.innerText.trim()).filter(Boolean).join(' | ')) : ''}`);
const velden = { first_name: 'Toon', last_name: 'Toets', brand: 'Merk Toetsenbord', email, phone: '0612345678', address_line1: 'Teststraat 1', postal_code: '1234 AB', city: 'Teststad' };
for (const [naam, waarde] of Object.entries(velden)) {
  await tab((n) => document.activeElement?.name === n && !!document.activeElement.closest('.pl-step.is-current'), `veld ${naam}`, { arg: naam, max: 40 });
  await page.keyboard.type(waarde);
}
// stap 3 verder: de rest van de stops vastleggen
{ const stops = []; for (let j = 0; j < 14; j++) { await page.keyboard.press('Tab'); const f = await focusInfo(page); stops.push(`${f.tag}:${f.type}:${f.name}:${f.label.slice(0, 30)}`); if (f.name === 'country') break; } log.push('3 · stops na plaats: ' + stops.join(' / ')); }
if (await page.evaluate(() => document.activeElement?.name === 'country')) { const voor = await page.evaluate(() => document.activeElement.value); await page.keyboard.type('Nederland'); await page.waitForTimeout(300); log.push(`3 · land: "${voor}" → ${await page.evaluate(() => document.activeElement.value)}`); }
// geen btw-nummer: het vinkje met spatie
await tab(() => document.activeElement?.name === 'no_vat' || document.activeElement?.name === 'reg_number', 'geen btw', { max: 30 }).catch(() => {});
if (await page.evaluate(() => document.activeElement?.name === 'no_vat')) { await page.keyboard.press('Space'); await page.waitForTimeout(300); await tab(() => document.activeElement?.name === 'reg_number', 'kvk', { max: 15 }); }
await page.keyboard.type('12345678');
for (const nm of ['business_declaration']) {
  const ok = await tab((n) => document.activeElement?.name === n, nm, { arg: nm, max: 15 }).then(() => true).catch(() => false);
  if (ok) await page.keyboard.press('Space');
}
await verder('stap 3');
log.push(`5 · stap ${await stapNr()}, focus ${await fl()}`);
for (const nm of ['business_declaration', 'withdrawal_consent']) {
  const ok = await tab((n) => document.activeElement?.name === n && !!document.activeElement.closest('.pl-step.is-current'), `slot ${nm}`, { arg: nm, max: 30 }).then(() => true).catch(() => false);
  if (ok && !(await page.evaluate(() => document.activeElement.checked))) await page.keyboard.press('Space');
  log.push(`5 · ${nm}: ${ok ? 'aangevinkt met spatie' : 'niet gevonden'}`);
}
await tab(() => document.activeElement?.matches('[data-pl-submit]'), 'bestellen', { max: 60 });
log.push(`5 · knop: ${await fl()}`);
const [resp] = await Promise.all([page.waitForResponse((r) => /\/(api|account)\/order\b/.test(r.url()), { timeout: 30000 }).catch(() => null), page.keyboard.press('Enter')]);
log.push(`5 · /api/order ${resp?.status()}`);
await page.waitForTimeout(1500);
if (/4478|nep-mollie/.test(page.url())) {
  await tab(() => document.activeElement?.getAttribute('data-pay') === 'paid', 'nep-mollie betaald', { max: 20 });
  await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), page.keyboard.press('Enter')]);
  await page.waitForTimeout(1200);
  log.push(`6 · terug op ${page.url().replace(SITE, '')}; kop: ${await page.evaluate(() => document.querySelector('h1')?.textContent.trim())}`);
}
} catch (e) { log.push('FOUT: ' + e.message.slice(0, 200)); }
return { k, page, log, zonderRing: [...zonderRing] };
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const r = await toetsenbordBestelling(`toets${Date.now() % 100000}@merk.test`);
  console.log(r.log.join('\n')); console.log('— focus zonder zichtbare ring:', r.zonderRing.length ? '\n  ' + r.zonderRing.join('\n  ') : 'geen');
  process.exit(0);
}
