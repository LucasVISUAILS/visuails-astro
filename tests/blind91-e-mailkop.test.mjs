/* VISUAILS — ronde 91 (E02), 9 november 2026: het woordmerk bovenin een mail linkt naar
 * de voorpagina in de taal van de mail. Gevonden met S/91/werk/e/keur-mails.mjs: elke
 * Nederlandse mail (83 van 83) linkte met het woordmerk naar https://visuails.com, de
 * Engelse voorpagina, terwijl de voet al naar /nl/terms en /nl/privacy wees.
 *   node tests/blind91-e-mailkop.test.mjs
 */
import { alleMails } from './lib/alle-mails.mjs';
import { shell } from '../src/lib/mailTemplate.js';

let goed = 0, fout = 0;
const ok = (naam, v, uitleg = '') => { if (v) { goed++; console.log(` ok   ${naam}`); } else { fout++; console.log(` FAIL ${naam}${uitleg ? `\n       ${uitleg}` : ''}`); } };
const kop = (html) => (html.match(/<a href="([^"]+)"[^>]*><img src="https:\/\/visuails\.com\/img\/mail\/lockup-plaat\.png"/) || [])[1];

ok('shell nl: woordmerk naar /nl', kop(shell({ lang: 'nl', body: '<p>x</p>' })) === 'https://visuails.com/nl');
ok('shell en: woordmerk naar de voorpagina', kop(shell({ lang: 'en', body: '<p>x</p>' })) === 'https://visuails.com');
ok('shell zonder taal (en): voorpagina', kop(shell({ body: '<p>x</p>' })) === 'https://visuails.com');

const mails = (await alleMails()).filter((m) => m.html);
const mis = mails.filter((m) => {
  const lang = (m.html.match(/<html lang="([a-z]+)"/) || [])[1];
  const href = kop(m.html);
  return !href || href !== (lang === 'nl' ? 'https://visuails.com/nl' : 'https://visuails.com');
}).map((m) => `${m.id}: ${kop(m.html)}`);
ok(`alle ${mails.length} gevangen mails: woordmerk-link in de taal van de mail`, mis.length === 0, mis.slice(0, 5).join(' · '));
const { htmlToText } = await import('../src/lib/mail.js');
ok('de platte tekst begint niet met de kop (tekst:uit blijft werken)', mails.every((m) => !/^\s*(VISUAILS \()?https:\/\/visuails\.com(\/nl)?\)?\s*$/m.test(htmlToText(m.html).split('\n')[0])));

console.log(`\n${goed} goed, ${fout} fout`);
if (fout) process.exit(1);
