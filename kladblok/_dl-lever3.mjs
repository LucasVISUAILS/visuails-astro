// Lage score via de portaallink uit de levermail, plus testimonial en 'ander antwoord'.
import { start, tekst, sql, mails, mailtekst, paneel, SITE, foto } from './_dl.mjs';
const email = process.argv[2];
const lijst = await mails();
const m = [...lijst].reverse().find((x) => JSON.stringify(x.to).includes(email) && /staat klaar/.test(x.subject));
const html = String(await paneel('/mail/' + m.n));
const link = [...html.matchAll(/href="([^"]+)"/g)].map((x) => x[1]).find((h) => /\/o\//.test(h));
console.log('portaal', link);
const s = await start(); const { page } = s;
await page.goto(link, { waitUntil: 'load' });
const t0 = (await tekst(page, 'main, body')).replace(/\n{2,}/g, '\n');
console.log('PORTAAL:\n' + t0.slice(0, 900));
await foto(page, 'portaal-geleverd', { vol: true });
console.log(JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('form')].map((f) => f.getAttribute('action') + ' :: ' + [...f.elements].filter(e => e.name).map((e) => `${e.type} ${e.name}=${e.value}`).join(', ')))).slice(0, 1500));
console.log(s.fouten); await s.stop();
