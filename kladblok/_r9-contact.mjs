// Ronde 9 · stap 3: contact — elk onderwerp en elke voorkeur, WhatsApp-knoppen op elke pagina, Studiobrief aan/uit, fotogids.
import { start, SITE, sql, sqlw, mails, mailtekst } from './_dl.mjs';
import { readFileSync } from 'node:fs';
const k = await start(); const { page } = k;
const uit = [];

/* 1 · Contactformulier: elk onderwerp, beide voorkeuren. */
await page.goto(SITE + '/nl/contact'); await page.waitForTimeout(500);
const onderwerpen = await page.evaluate(() => [...document.querySelectorAll('#c-topic option')].map((o) => [o.value, o.textContent.trim()]));
uit.push(`onderwerpen: ${onderwerpen.map((o) => o[1]).join(' | ')}`);
let i = 0;
for (const [waarde, tekst] of onderwerpen) {
  i += 1; await sqlw('DELETE FROM rate_limits');
  const voorkeur = i % 2 ? 'email' : 'whatsapp';
  await page.goto(SITE + '/nl/contact'); await page.waitForTimeout(400);
  const voor = (await mails()).length;
  await page.fill('#c-name', `Cor Contact ${i}`); await page.fill('#c-email', `contact${i}@merk.test`);
  await page.fill('#c-phone', '0612345678'); await page.selectOption('#c-topic', waarde);
  await page.fill('#c-message', `TEST ronde 9 — onderwerp ${tekst}, voorkeur ${voorkeur}.`);
  await page.check(`input[name="contact_preference"][value="${voorkeur}"]`);
  await Promise.all([page.waitForNavigation().catch(() => null), page.click('form[action="/api/order"] button[type="submit"], main form button[type="submit"]')]);
  await page.waitForTimeout(1200);
  const nieuw = (await mails()).slice(voor);
  const studio = nieuw.find((m) => /hello@visuails\.com/.test(m.to || ''));
  const klant = nieuw.find((m) => /contact\d+@merk\.test/.test(m.to || ''));
  const kop = (await page.evaluate(() => document.querySelector('h1')?.textContent || '')).trim();
  uit.push(`  ${tekst.padEnd(28)} ${voorkeur.padEnd(8)} → "${kop}" · studio: ${studio ? `"${studio.subject}" reply-to ${studio.replyTo || studio.reply_to || '?'}` : 'GEEN'} · klant: ${klant ? `"${klant.subject}"` : 'GEEN'}`);
}
/* Honeypot: gevuld → geen mail, wel een gewone bedankpagina. */
await sqlw('DELETE FROM rate_limits');
await page.goto(SITE + '/nl/contact'); await page.waitForTimeout(400);
const voorHp = (await mails()).length;
await page.fill('#c-name', 'Bot'); await page.fill('#c-email', 'bot@merk.test'); await page.fill('#c-message', 'spam');
await page.evaluate(() => { document.querySelector('input[name="company_hp"]').value = 'ja'; });
await Promise.all([page.waitForNavigation().catch(() => null), page.click('main form button[type="submit"]')]);
await page.waitForTimeout(1000);
uit.push(`honeypot gevuld: ${(await mails()).length - voorHp} mails, pagina "${(await page.evaluate(() => document.querySelector('h1')?.textContent || '')).trim()}"`);

/* 2 · WhatsApp-knoppen op elke pagina uit de sitemap. */
const sm = await (await page.request.get(SITE + '/sitemap.xml').catch(() => null))?.text().catch(() => '') || '';
const urls = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/^https?:\/\/[^/]+/, ''));
const nummers = new Map(); const fout = [];
for (const u of urls) {
  const r = await page.request.get(SITE + u).catch(() => null);
  if (!r || r.status() !== 200) { fout.push(`${u} ${r ? r.status() : 'x'}`); continue; }
  const html = await r.text();
  for (const m of html.matchAll(/https:\/\/wa\.me\/(\d+)(\?text=([^"'&]+))?/g)) {
    nummers.set(m[1], (nummers.get(m[1]) || 0) + 1);
    const tekst = decodeURIComponent((m[3] || '').replace(/\+/g, ' '));
    if (u.startsWith('/nl') && /^Hi\b|question/i.test(tekst)) fout.push(`${u}: Engelse WhatsApp-tekst op een NL-pagina: "${tekst.slice(0, 60)}"`);
    if (!u.startsWith('/nl') && /^Hoi\b|vraag/i.test(tekst)) fout.push(`${u}: Nederlandse WhatsApp-tekst op een EN-pagina: "${tekst.slice(0, 60)}"`);
  }
}
uit.push(`sitemap: ${urls.length} pagina's; WhatsApp-nummers: ${[...nummers].map(([n, c]) => `${n} (${c}×)`).join(', ')}`);
uit.push(`afwijkingen: ${fout.length ? '\n  ' + fout.slice(0, 20).join('\n  ') : 'geen'}`);

/* 3 · Studiobrief aanmelden en afmelden via de link in de mail. */
await sqlw('DELETE FROM rate_limits');
await page.goto(SITE + '/nl/editions'); await page.waitForTimeout(400);
const voorSb = (await mails()).length;
const sbMail = `brief${Date.now() % 100000}@merk.test`;
await page.fill('form[action="/api/studiobrief"] input[type="email"]', sbMail);
await Promise.all([page.waitForNavigation().catch(() => null), page.click('form[action="/api/studiobrief"] button')]);
await page.waitForTimeout(1200);
const sb = (await mails()).slice(voorSb).find((m) => (m.to || '').includes(sbMail));
uit.push(`studiobrief: pagina "${(await page.evaluate(() => document.querySelector('h1, main p')?.textContent || '')).trim().slice(0, 80)}", mail ${sb ? `"${sb.subject}"` : 'GEEN'}`);
if (sb) {
  const t = await mailtekst(sb.n);
  const links = [...t.matchAll(/https?:\/\/[^\s)]+/g)].map((m) => m[0]);
  uit.push(`  links in de mail: ${links.map((l) => l.replace(/^https?:\/\/[^/]+/, '')).join(' , ')}`);
  for (const l of links.filter((x) => /studiobrief|afmeld|unsubscribe|bevestig|confirm/i.test(x))) {
    await page.goto(l.replace(/^https?:\/\/[^/]+/, SITE)); await page.waitForTimeout(600);
    uit.push(`  ${l.replace(/^https?:\/\/[^/]+/, '').slice(0, 60)} → "${(await page.evaluate(() => (document.querySelector('h1')?.textContent || document.body.innerText).trim())).slice(0, 100)}"`);
  }
  uit.push(`  db: ${JSON.stringify(await sql(`SELECT * FROM studiobrief WHERE email='${sbMail}'`).catch(() => 'geen tabel studiobrief'))}`);
}

/* 4 · Fotogids. */
for (const p of ['/fotogids.pdf', '/nl/fotogids.pdf', '/downloads/fotogids.pdf']) {
  const r = await page.request.get(SITE + p).catch(() => null);
  uit.push(`fotogids ${p}: ${r ? r.status() + ' ' + r.headers()['content-type'] : 'x'}`);
}
await page.goto(SITE + '/nl/upload-guidelines'); await page.waitForTimeout(400);
uit.push(`upload-guidelines pdf-links: ${(await page.evaluate(() => [...document.querySelectorAll('a[href$=".pdf"]')].map((a) => a.getAttribute('href')))).join(', ') || 'geen'}`);
console.log(uit.join('\n'));
process.exit(0);
