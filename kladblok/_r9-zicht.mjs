// Ronde 9 · F5/F6/F11/O5 in beeld: modelstrook (stap 2), strook + overzicht (stap 5).
import { start, foto } from './_dl.mjs';
import { bestel } from './_bestel.mjs';
const k = await start({ mobiel: true }); const { page } = k;
page.on('console', (m) => { if (/R9/.test(m.text())) console.log(m.text()); });
let shot2 = null;
const r = await bestel(page, {
  pad: '/nl/start/lifestyle', aantal: 2, fotos: 3, wacht: 1400, model: null, ratio: 'portrait',
  stap3: async (p) => { await p.evaluate(() => { const f = document.querySelector('#pl-form'); const sels = [...f.querySelectorAll('select[data-pl-ratio-each]')]; console.log('R9 inForm', sels.length, document.querySelectorAll('select[data-pl-ratio-each]').length); }); },
  stap5: async (p) => console.log('R9 sum', await p.evaluate(() => { const sel = document.querySelector('select[name="ratio_p1_3"]'); return JSON.stringify({ v: sel.value, dis: sel.disabled, card: !!sel.closest('.pu-card[hidden]'), sum: document.querySelector('[data-pl-summary]').innerText.slice(0, 400) }); })),
  stapX: async (p) => console.log('stap3 select:', await p.evaluate(() => [...document.querySelectorAll('select[data-pl-ratio-each]')].map((s) => `${s.name}=${s.value}${s.disabled ? '(dis)' : ''}${s.closest('[hidden]') ? '(hid:' + s.closest('[hidden]').className + ')' : ''}`).join(' '))),
  klant: { email: `zicht-${Date.now() % 100000}@winkel.test` },
  stap2: async (p) => {
    const el = await p.$('[data-pl-model-fold]');
    if (el) { await el.scrollIntoViewIfNeeded(); await foto(p, 'r9-f5-voor-keuze'); }
    console.log('ratio gezet:', await p.evaluate(() => { const s = document.querySelector('select[name="ratio_p1_3"]'); if (!s) return false; s.closest('details') && (s.closest('details').open = true); s.value = 'wide'; s.dispatchEvent(new Event('change', { bubbles: true })); return s.value; }));
    const any = p.locator('label:has(input[name="model"][value="any"])');
    if (await any.count()) { await any.first().click(); await foto(p, 'r9-f5-na-keuze'); }
  },
}).catch((e) => ({ fout: String(e).slice(0, 300) }));
console.log(r.fout || r.overzicht);
await k.stop();
