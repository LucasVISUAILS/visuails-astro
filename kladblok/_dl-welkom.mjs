// Ronde 4: de direct-inlogknop uit de welkomstmail werkt, en de beschikbaarheid staat vóór het formulier.
import { start, foto, tekst, mails, mailtekst, SITE } from './_dl.mjs';
const s = await start(); const { page } = s;
const alle = await mails();
const welkom = alle.filter((m) => /Welkom bij VISUAILS/.test(m.subject)).pop();
const t = await mailtekst(welkom.n);
const link = (t.match(/\/account\/verify\/[A-Za-z0-9_-]+\?lang=nl/) || [])[0];
console.log('link gevonden:', !!link);
await page.goto(SITE + link, { waitUntil: 'load' });
console.log('na klik op:', page.url());
console.log((await tekst(page, 'main')).replace(/\s+/g, ' ').slice(0, 300));
await foto(page, 'welkom-na-klik');
await s.stop();
