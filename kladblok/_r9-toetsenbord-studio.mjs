// Ronde 9 · klanttype 13, deel 2: geleverd door de studio, dan Studio met alleen het toetsenbord.
import { SITE, sql, mails, mailtekst } from './_dl.mjs';
import { focusInfo, tabNaar } from './_toets.mjs';
import { adminLogin } from './_admin.mjs';
import { toetsenbordBestelling } from './_r9-toetsenbord.mjs';
const email = `toets${Date.now() % 100000}@merk.test`;
const r = await toetsenbordBestelling(email);
const { page, k, log } = r;
const zonderRing = new Set(r.zonderRing);
const noteer = (f, wat) => { if (f && !f.ring && !f.ouderRing && f.tag !== 'body' && f.zichtbaar) zonderRing.add(`${wat}: ${f.tag} ${f.name} "${f.label}"`); };
const tab = async (test, wat, opts = {}) => { const lg = []; try { await tabNaar(page, test, { ...opts, log: lg }); } catch (e) { log.push(`VAST bij ${wat} — laatste stops: ${lg.slice(-6).map((f) => `${f.tag}:${f.name}:${f.label}`).join(' / ')}`); throw e; } lg.forEach((f) => noteer(f, wat)); };
const fl = async () => { const f = await focusInfo(page); return `${f.tag}${f.name ? ':' + f.name : ''} "${f.label}"`; };
try {
  const [o] = await sql(`SELECT id, ref FROM orders WHERE email='${email}'`);
  /* De studio levert: vier beelden in de vakjes, via het formulier per vak (met de muis — dat is niet de klant). */
  const admin = await k.ctx.newPage();
  await adminLogin(admin);
  await admin.goto(`${SITE}/admin/orders/${o.id}/files`);
  for (const shot of ['front', 'back', 'detail', 'worn']) {
    const form = admin.locator(`form:has(input[name="shot"][value="${shot}"]):has(input[name="product"][value="p1"])`).first();
    if (!(await form.count())) { log.push(`admin: geen vakformulier ${shot}`); continue; }
    await form.locator('input[type=file]').setInputFiles('/tmp/claude-0/dl/voor.jpg');
    await Promise.all([admin.waitForNavigation(), form.locator('button[type=submit]').click()]);
    await admin.goto(`${SITE}/admin/orders/${o.id}/files`);
  }
  const lever = admin.locator('form:has(button:text-matches("geleverd zetten", "i"))').first();
  await Promise.all([admin.waitForNavigation(), lever.locator('button').click()]);
  log.push(`admin: geleverd → ${admin.url().replace(SITE, '')}`);
  /* Studio, alleen toetsenbord. */
  await page.goto(`${SITE}/account/login?lang=nl`);
  await tab(() => document.activeElement?.type === 'email', 'login e-mail', { max: 30 });
  await page.keyboard.type(email);
  const voor = (await mails()).length;
  await Promise.all([page.waitForNavigation(), page.keyboard.press('Enter')]);
  let m = null; for (let i = 0; i < 20 && !m; i++) { await page.waitForTimeout(300); m = (await mails()).slice(voor).find((x) => /inlogcode/i.test(x.subject || '')); }
  const code = ((await mailtekst(m.n)).match(/(\d{3}) (\d{3})/) || []).slice(1).join('');
  log.push(`studio: codescherm, focus ${await fl()}`);
  if (!(await page.evaluate(() => document.activeElement?.name === 'code'))) await tab(() => document.activeElement?.name === 'code', 'code', { max: 20 });
  await page.keyboard.type(code);
  await Promise.all([page.waitForNavigation(), page.keyboard.press('Enter')]);
  log.push(`studio: ingelogd op ${page.url().replace(SITE, '')}`);
  /* Naar Bestellingen via de navigatie. */
  await tab(() => /\/account\/orders$/.test(document.activeElement?.getAttribute('href') || ''), 'nav bestellingen', { max: 40 });
  await Promise.all([page.waitForNavigation(), page.keyboard.press('Enter')]);
  log.push(`studio: ${page.url().replace(SITE, '')}, focus ${await fl()}`);
  /* Product openklappen en goedkeuren. */
  await tab(() => document.activeElement?.tagName === 'SUMMARY' && /Bekijk de foto/.test(document.activeElement.innerText), 'product openklappen', { max: 40 });
  await page.keyboard.press('Enter'); await page.waitForTimeout(300);
  log.push(`studio: product open: ${await page.evaluate(() => document.activeElement.closest('details')?.open)}`);
  await tab(() => /keur dit product goed|alle \d+ zijn goed/i.test(document.activeElement?.innerText || ''), 'product goedkeuren', { max: 80 });
  log.push(`studio: knop ${await fl()}`);
  await Promise.all([page.waitForNavigation(), page.keyboard.press('Enter')]);
  log.push(`studio: na goedkeuren ${page.url().replace(SITE, '')}, focus ${await fl()}; nu: ${await page.evaluate(() => (document.querySelector('main').innerText.match(/Nu: [^\n]*/) || [''])[0])}`);
  /* Score 5 met het toetsenbord. */
  await tab(() => (document.activeElement?.innerText || document.activeElement?.value || '').trim() === '5' && !!document.activeElement.closest('.st-tevreden, form'), 'score 5', { max: 60 });
  log.push(`studio: score-knop ${await fl()}`);
  await Promise.all([page.waitForNavigation().catch(() => null), page.keyboard.press(await page.evaluate(() => document.activeElement.type === 'radio') ? 'Space' : 'Enter')]);
  await page.waitForTimeout(800);
  log.push(`studio: na score: ${await page.evaluate(() => document.querySelector('.st-tevreden')?.innerText.replace(/\s+/g, ' ').slice(0, 80))}, focus ${await fl()}`);
  /* De map downloaden: alleen nagaan dat de link bereikbaar is met Tab. */
  await tab(() => /\/zip/.test(document.activeElement?.getAttribute('href') || ''), 'download map', { max: 60 });
  log.push(`studio: downloadlink bereikbaar: ${await fl()}`);
} catch (e) { log.push('FOUT: ' + e.message.slice(0, 200)); }
console.log(log.join('\n'));
console.log('— focus zonder zichtbare ring:', zonderRing.size ? '\n  ' + [...zonderRing].join('\n  ') : 'geen');
process.exit(0);
