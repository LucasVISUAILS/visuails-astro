/**
 * Ronde 91, A09 (9 november 2026): geen regeleinde in het onderwerp van een mail.
 *
 * Het contactformulier zette de naam en het vrije `subject` ongefilterd in het
 * onderwerp van de studiomail ("Contact — <naam> · <onderwerp>"). Een naam met
 * CR/LF + "Bcc: …" stond daar letterlijk. sendMail() maakt nu van elk stuurteken
 * in het onderwerp een spatie. Draai: node tests/blind91-a-mailonderwerp.test.mjs
 */
import { sendMail } from '../src/lib/mail.js';
import { onRequestPost } from '../functions/api/order.js';

let goed = 0, fout = 0;
function ok(naam, waar, detail = '') {
  if (waar) goed++; else fout++;
  console.log(`${waar ? ' ok  ' : ' FAIL'} ${naam}${waar ? '' : `  ${detail}`}`);
}

const echteFetch = globalThis.fetch;
const verstuurd = [];
globalThis.fetch = async (url, init = {}) => {
  if (String(url).includes('api.resend.com')) verstuurd.push(JSON.parse(init.body));
  return { ok: true, status: 200, text: async () => '', json: async () => ({ id: 'x' }) };
};
const stil = [console.log, console.error, console.warn];
try {
  console.log('\nsendMail: het onderwerp draagt geen stuurtekens');
  await sendMail({ RESEND_API_KEY: 're_test' }, { to: 'a@voorbeeld.test', subject: 'Contact — Kees\r\nBcc: slachtoffer@voorbeeld.test\r\n · Anders', html: '<p>x</p>' });
  const s = verstuurd[0]?.subject || '';
  ok('geen CR of LF meer', !/[\r\n]/.test(s), JSON.stringify(s));
  ok('en de tekst zelf blijft staan', s === 'Contact — Kees Bcc: slachtoffer@voorbeeld.test  · Anders', JSON.stringify(s));
  await sendMail({ RESEND_API_KEY: 're_test' }, { to: 'a@voorbeeld.test', subject: 'Je factuur VIS-2026-0031', html: '<p>x</p>' });
  ok('een gewoon onderwerp verandert niet', verstuurd[1]?.subject === 'Je factuur VIS-2026-0031', verstuurd[1]?.subject);
  await sendMail({ RESEND_API_KEY: 're_test' }, { to: 'a@voorbeeld.test', subject: '\tTab\u0000nul\u007f', html: '<p>x</p>' });
  ok('tab, NUL en DEL ook', verstuurd[2]?.subject === 'Tab nul', JSON.stringify(verstuurd[2]?.subject));

  console.log('\nhet contactformulier, door de echte handler');
  const db = {
    prepare() { const st = { bind() { return st; }, first: async () => null, all: async () => ({ results: [] }), run: async () => ({ meta: { changes: 1, last_row_id: 1 } }) }; return st; },
    batch: async (a) => a.map(() => ({ meta: { changes: 1 } })),
  };
  const fd = new FormData();
  for (const [k, v] of Object.entries({ service: 'contact', email: 'kees@voorbeeld.test', first_name: 'Kees\r\nBcc: slachtoffer@voorbeeld.test', last_name: 'Test', topic: 'other', subject: 'Hoi\r\nX-Kop: 1', message: 'Hallo', lang: 'nl', contact_preference: 'email' })) fd.set(k, v);
  console.log = () => {}; console.error = () => {}; console.warn = () => {};
  const n0 = verstuurd.length;
  await onRequestPost({ request: new Request('https://visuails.com/api/order', { method: 'POST', body: fd }), env: { RESEND_API_KEY: 're_test', NOTIFY_EMAIL: 'studio@voorbeeld.test', DB: db }, waitUntil: () => {} });
  [console.log, console.error, console.warn] = stil;
  const studio = verstuurd.slice(n0).find((m) => /^Contact — /.test(m.subject || ''));
  ok('de studiomail is er', !!studio, JSON.stringify(verstuurd.slice(n0).map((m) => m.subject)));
  ok('en zijn onderwerp heeft geen regeleinde', studio && !/[\r\n]/.test(studio.subject), JSON.stringify(studio?.subject));
} finally {
  globalThis.fetch = echteFetch;
  [console.log, console.error, console.warn] = stil;
}
console.log(`\n${goed} goed, ${fout} fout`);
if (fout) process.exit(1);
