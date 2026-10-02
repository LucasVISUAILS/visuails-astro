/* Ronde 9 — F25: worden de bijbestelde hoeken meegestuurd en berekend?
   Bestelt catalog met twee hoeken bij 3 en bij 12 producten, kijkt naar wat er
   naar /api/order gaat en wat de server rekent. Gebruik: node kladblok/_r9-hoeken.mjs [aantal] */
import { start, sql } from './_dl.mjs';
import { bestel } from './_bestel.mjs';
const aantal = Number(process.argv[2] || 3);
const k = await start();
const post = [];
let staat = null;
const sporen = [];
k.page.on('console', (m) => { if (m.text().startsWith('HOEKSPOOR')) sporen.push(m.text().slice(0, 900)); });
await k.page.addInitScript(() => {
  const d = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'checked');
  Object.defineProperty(HTMLInputElement.prototype, 'checked', { get() { return d.get.call(this); }, set(v) { if (this.hasAttribute('data-pl-angle') && !v && d.get.call(this)) console.log('HOEKSPOOR uitgevinkt ' + this.name + ' ' + new Error().stack.replace(/\s+/g, ' ')); return d.set.call(this, v); } });
  const ob = new MutationObserver((ms) => { for (const m of ms) for (const n of m.removedNodes) if (n.nodeType === 1 && (n.matches?.('[data-pl-angles]') || n.querySelector?.('[data-pl-angles]'))) console.log('HOEKSPOOR verwijderd ' + (n.className || n.tagName)); });
  document.addEventListener('DOMContentLoaded', () => ob.observe(document.body, { childList: true, subtree: true }));
  document.addEventListener('click', (e) => { const t = e.target; if (t && t.hasAttribute && (t.hasAttribute('data-pl-angle') || t.closest?.('[data-pl-angles]'))) console.log('HOEKSPOOR klik ' + (t.name || t.tagName) + ' trusted=' + e.isTrusted + ' ' + new Error().stack.replace(/\s+/g, ' ')); }, true);
  document.addEventListener('change', (e) => { const t = e.target; if (t && t.hasAttribute && t.hasAttribute('data-pl-angle')) console.log('HOEKSPOOR change ' + t.name + ' nu=' + t.checked + ' trusted=' + e.isTrusted); }, true);
  const raak = (el) => el && el.nodeType === 1 && (el.matches?.('[data-pl-angles]') || el.querySelector?.('input[data-pl-angle]'));
  const spoor = (wat, el) => { if (raak(el)) console.log('HOEKSPOOR ' + wat + ' op ' + (el.tagName + '.' + String(el.className).slice(0, 40)) + ' ' + new Error().stack.replace(/\s+/g, ' ').slice(0, 700)); };
  for (const [proto, prop] of [[Element.prototype, 'innerHTML'], [Node.prototype, 'textContent']]) {
    const dd = Object.getOwnPropertyDescriptor(proto, prop);
    Object.defineProperty(proto, prop, { get() { return dd.get.call(this); }, set(v) { spoor(prop, this); return dd.set.call(this, v); }, configurable: true });
  }
  const rc = Node.prototype.removeChild; Node.prototype.removeChild = function (c) { spoor('removeChild', c); return rc.call(this, c); };
  const rm = Element.prototype.remove; Element.prototype.remove = function () { spoor('remove', this); return rm.call(this); };
  const rpc = Element.prototype.replaceChildren; Element.prototype.replaceChildren = function (...a) { spoor('replaceChildren', this); return rpc.apply(this, a); };
  const rw = Element.prototype.replaceWith; Element.prototype.replaceWith = function (...a) { spoor('replaceWith', this); return rw.apply(this, a); };
  const ac = Node.prototype.appendChild; Node.prototype.appendChild = function (c) { if (c && c.nodeType === 1 && raak(c)) spoor('appendChild(verplaatst)', c); return ac.call(this, c); };
  document.addEventListener('reset', () => console.log('HOEKSPOOR form reset'), true);
});
k.page.on('request', (r) => { if (/\/(api|account)\/order\b/.test(r.url()) && r.method() === 'POST') post.push(r.postData() || ''); });
/* De toestand van de hoekvinkjes vlak voor het versturen. */
k.page.on('console', () => {});
setInterval(async () => { try { const nu = await k.page.evaluate(() => 'n=' + document.querySelectorAll('input[data-pl-angle]').length + ' box=' + !!document.querySelector('[data-pl-angles]') + ' boxHtml=' + (document.querySelector('[data-pl-angles]')?.innerHTML.length) + ' s1=' + document.querySelector('[data-pl-step="1"]')?.querySelectorAll('*').length + ' inForm=' + !!document.querySelector('#pl-form')?.contains(document.querySelector('[data-pl-angles]')) + ' form=' + (document.querySelector('#pl-form')?.elements['angle_three-quarter']?.checked) + ' ' + [...document.querySelectorAll('input[data-pl-angle]')].filter((i) => i.checked || i.disabled).map((i) => `${i.name}:${i.checked ? 'aan' : 'uit'}:${i.disabled ? 'UIT-GEZET' : 'actief'}:${i.closest('fieldset:disabled') ? 'fieldset-dicht' : ''}`).join(' ') + ' | stap ' + document.querySelector('.pl-step.is-current')?.dataset.plStep); if (nu && !/stap undefined/.test(nu) && nu !== (staat||[]).at(-1)) (staat ||= []).push(nu); } catch {} }, 200);
const email = `hoek${aantal}-${Date.now() % 100000}@winkel.test`;
const r = await bestel(k.page, {
  pad: '/nl/start/catalog', aantal, fotos: 6, wacht: 1400, angles: ['three-quarter', 'flat-lay'], klant: { email },
}).catch((e) => ({ fout: String(e).slice(0, 300) }));
const body = post[0] || '';
const velden = [...body.matchAll(/name="([^"]+)"/g)].map((m) => m[1]);
console.log('» aantal', aantal, '| resultaat', r.fout || r.apiStatus);
console.log('» angle-velden in de post:', velden.filter((v) => v.startsWith('angle_')).join(', ') || 'GEEN');
console.log('» extra_slots in de post:', velden.includes('extra_slots'));
console.log('» overzicht stap 5:', (r.overzicht || '').replace(/\s+/g, ' ').match(/ORDERBEDRAG[^A-Z]*€[\d.,]+/i)?.[0]);
const [o] = await sql(`SELECT ref, total_cents, product_count FROM orders WHERE email='${email}' ORDER BY id DESC LIMIT 1`);
console.log('» toestand hoekvinkjes per moment:\n  ' + (staat||[]).join('\n  '));
console.log('» sporen:\n  ' + sporen.join('\n  '));
console.log('» order', JSON.stringify(o));
await k.stop(); process.exit(0);
