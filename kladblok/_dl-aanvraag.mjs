import { start, foto, velden, tekst, mails, mailtekst, sql, SITE } from './_dl.mjs';
const CASES = {
  video: { pad: '/nl/start/video', vul: { name: 'Yara Merk', brand: 'Merk BV', email: 'yara@merk.test', phone: '0611111111', message: 'Drie clips voor de wintercollectie, verticaal.' }, kies: { style: 'motion', clips: '3' } },
  videoLs: { pad: '/nl/start/video', vul: { name: 'Sanne Mode', brand: 'Sanne BV', email: 'sanne@video.test', phone: '0633333333', message: 'Twee lifestyleclips van de nieuwe jas.' }, kies: { style: 'lifestyle', clips: '2' } },
  videoCamp: { pad: '/start/video', vul: { name: 'Tom Brand', brand: 'Brand Ltd', email: 'tom@campaign.test', phone: '+441234567890', message: 'Campaign film for spring.' }, kies: { style: 'campaign', clips: 'Not sure yet' } },
  videoEigen: { pad: '/nl/start/video', vul: { name: 'Yara Merk', brand: 'Merk BV', email: 'yara@eigen.test', phone: '0611111111', message: 'Iets in onze eigen stijl.' }, kies: { style: 'custom', clips: '4' } },
  look: { pad: '/nl/start/custom-look', vul: { name: 'Tom Foto', brand: 'Tom Foto', email: 'tom@foto.test', phone: '0622222222' } },
  model: { pad: '/nl/start/brand-model', vul: { first_name: 'Yara', last_name: 'Merk', brand: 'Merk BV', email: 'yara@model.test', phone: '0611111111', address_line1: 'Teststraat 1', postal_code: '1234 AB', city: 'Teststad', reg_number: '12345678' }, kies: { country: 'NL' }, voor: async (page) => { await page.evaluate(() => { const r = document.querySelector('input[name=bm_track][value=ours]'); if (r) r.click(); const v = document.querySelector('input[name=no_vat]'); if (v && !v.checked) v.click(); }); } },
};
for (const k of process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(CASES)) {
  const c = CASES[k]; const s = await start(); const { page } = s;
  const voor = (await mails()).length;
  console.log(`\n######## ${k} ${c.pad}`);
  await page.goto(SITE + c.pad, { waitUntil: 'load' });
  const form = page.locator('form[action="/api/order"], form[action="/api/plan"], form[action^="/api/"]:not(#studiobrief-voet)').first();
  console.log('velden:', (await velden(page, 'main form') || []).filter(v => v.zichtbaar && v.tag !== 'button').map(v => `${v.tag}/${v.type} ${v.name}${v.required ? '*' : ''}`).join(', '));
  if (c.voor) await c.voor(page);
  for (const [n, v] of Object.entries(c.vul)) { const f = form.locator(`[name="${n}"]`); if (await f.count()) await f.first().fill(v, { timeout: 2000 }).catch(() => f.first().evaluate((e, v) => { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); }, v)); else console.log('geen veld', n); }
  for (const [n, v] of Object.entries(c.kies || {})) { const f = form.locator(`select[name="${n}"]`); if (await f.count()) await f.selectOption(v, { force: true }); else console.log("geen select", n); }
  // overige verplichte velden invullen
  const rest = await form.evaluate((f) => [...f.querySelectorAll('[required]')].filter(e => !e.value && !e.checked).map(e => `${e.tagName}/${e.type} ${e.name}`));
  console.log('nog leeg verplicht:', rest);
  await form.evaluate((f) => { [...f.querySelectorAll('[required]')].forEach(e => { if (e.type === 'checkbox' && !e.checked) e.click(); else if (e.tagName === 'SELECT' && !e.value) { e.selectedIndex = 1; e.dispatchEvent(new Event('change', { bubbles: true })); } else if (e.type === 'radio') { if (!f.querySelector(`input[name="${e.name}"]:checked`)) e.click(); } else if (!e.value && e.type !== 'file') e.value = 'proef'; }); });
  if (c.stap) await c.stap(page, form);
  await foto(page, `aanvraag-${k}-voor`, { vol: true });
  const [resp] = await Promise.all([page.waitForResponse((r) => /\/api\/(order|plan)/.test(r.url()), { timeout: 20000 }).catch(() => null), form.locator('button[type="submit"]').first().click()]);
  await page.waitForTimeout(1500);
  console.log('api:', resp?.status(), 'url:', page.url());
  console.log((await tekst(page, 'main')).replace(/\n{2,}/g, '\n').slice(0, 900));
  await foto(page, `aanvraag-${k}-na`, { vol: true });
  for (const m of (await mails()).slice(voor)) { console.log(`MAIL #${m.n} → ${JSON.stringify(m.to)} "${m.subject}"`); console.log((await mailtekst(m.n)).slice(0, 900)); }
  console.log(await sql("SELECT id, ref, service, status, payment_status, total_cents, product_count, details_json FROM orders ORDER BY id DESC LIMIT 1"));
  console.log(s.fouten.filter(f => !/account\/me/.test(f)));
  await s.stop();
}
