// Ronde 9 · melding bovenaan Studio: zetten in /admin/melding, zien in Studio (licht, donker, telefoon, inlogscherm), weghalen.
import { start, SITE, sql } from './_dl.mjs';
import { adminLogin } from './_admin.mjs';
const D = '/tmp/claude-0/kb';
const uit = [];
const k = await start(); const admin = k.page; await adminLogin(admin);
await admin.goto(`${SITE}/admin/melding`);
await admin.screenshot({ path: `${D}/melding-admin-leeg.png`, fullPage: true });
const zet = async (soort, nl, en, tot = '') => {
  await admin.goto(`${SITE}/admin/melding`);
  await admin.selectOption('select[name=soort]', soort);
  await admin.fill('textarea[name=nl]', nl); await admin.fill('textarea[name=en]', en);
  if (tot) await admin.fill('input[name=tot]', tot);
  await Promise.all([admin.waitForNavigation(), admin.click('.melding-form button[type=submit]')]);
  return `${admin.url().replace(SITE, '')} — ${await admin.evaluate(() => [...document.querySelectorAll('main .okline, main .warnline, .okline, .warnline')].map((e) => e.textContent.trim()).join(' | '))}`;
};
uit.push(`fout (eindtijd voorbij): ${await zet('storing', 'x', '', '2020-01-01T10:00')}`);
uit.push(`storing zetten: ${await zet('storing', 'Downloaden van zip-bestanden hapert. We zijn ermee bezig; je beelden zijn veilig.', 'Downloading zip files is not working properly. We are on it; your images are safe.')}`);
await admin.screenshot({ path: `${D}/melding-admin-gezet.png`, fullPage: true });
await admin.goto(`${SITE}/admin`);
uit.push(`dashboard: ${await admin.evaluate(() => document.querySelector('.melding-balk')?.innerText.replace(/\s+/g, ' ') || 'GEEN')}`);
uit.push(`logboek: ${JSON.stringify(await sql("SELECT action, detail FROM admin_log WHERE action LIKE 'melding.%' ORDER BY id DESC LIMIT 1"))}`);

/* Studio, als klant VOLT (zaadje heeft een sessietoken). */
const volt = await fetch('http://localhost:4478/').then((r) => r.json()).then((j) => j.volt);
const zie = async (opts, pad, naam) => {
  const c = await start(opts);
  await c.ctx.addCookies([{ name: 'vis_account', value: volt.token, url: SITE }]);
  await c.page.goto(SITE + pad);
  const b = await c.page.evaluate(() => { const e = document.querySelector('.st-banner'); if (!e) return 'GEEN'; const s = getComputedStyle(e); return `${e.className} | "${e.innerText.replace(/\s+/g, ' ')}" | ${s.color} op ${s.backgroundColor} | ${Math.round(e.getBoundingClientRect().height)}px hoog | scrollW ${document.documentElement.scrollWidth}/${innerWidth}`; });
  await c.page.screenshot({ path: `${D}/melding-${naam}.png` });
  return `${naam}: ${b}`;
};
uit.push(await zie({}, '/account', 'studio-licht'));
uit.push(await zie({}, '/account?thema=donker', 'studio-donker'));
uit.push(await zie({ mobiel: true }, '/account', 'studio-390'));
uit.push(await zie({}, '/account?lang=en', 'studio-en'));
{ const c = await start(); await c.page.goto(SITE + '/account/login'); uit.push(`inlogscherm: ${await c.page.evaluate(() => document.querySelector('.st-banner')?.innerText.replace(/\s+/g, ' ') || 'GEEN')}`); await c.page.screenshot({ path: `${D}/melding-login.png` }); }
uit.push(`druk zetten: ${await zet('druk', 'Het is druk: nieuwe bestellingen kunnen een paar dagen langer duren dan gewoonlijk.', '')}`);
uit.push(await zie({}, '/account?lang=en&thema=licht', 'studio-druk-en-terugval'));
/* Weghalen */
await admin.goto(`${SITE}/admin/melding`);
await Promise.all([admin.waitForNavigation(), admin.click('.melding-voorbeeld button')]);
uit.push(`weghalen: ${admin.url().replace(SITE, '')}`);
uit.push(await zie({}, '/account', 'studio-na-weg'));
console.log(uit.join('\n'));
process.exit(0);
