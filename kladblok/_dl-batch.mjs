import { start, foto, tekst, mails, mailtekst, sql, paneel, SITE } from './_dl.mjs';
import { bestel, betaal } from './_bestel.mjs';
const CASES = {
  ls5: { pad: '/nl/start/lifestyle', aantal: 5, look: 'flash', outfit: 2, voorrang: true, hires: true, extra: 2, ratio: 'portrait45', klant: { email: 'yara@merk.test', first_name: 'Yara', brand: 'Merk BV' }, naam: 'Jurk' },
  compl1: { pad: '/start/complete', aantal: 1, look: 'glow', klant: { email: 'tom@foto.test', first_name: 'Tom', brand: 'Tom Foto' }, land: 'DE', vat: 'DE123456789', naam: 'Jacket' },
  cat10: { pad: '/nl/start/catalog', aantal: 10, klant: { email: 'henk@kledingzaak.test', first_name: 'Henk', brand: 'Kledingzaak Henk' }, vat: null, naam: 'Overhemd' },
  catUS: { pad: '/start/catalog', aantal: 1, klant: { email: 'us@brand.test', first_name: 'Ava', brand: 'US Brand' }, land: 'US', vat: null, naam: 'Tee' },
  ls1fail: { pad: '/nl/start/lifestyle', aantal: 1, look: 'dunes', klant: { email: 'sanne@proefmerk.test' }, naam: 'Broek', betaal: 'failed' },
  ls1cancel: { pad: '/nl/start/lifestyle', aantal: 1, look: 'phone-made', klant: { email: 'sanne@proefmerk.test' }, naam: 'Top', betaal: 'canceled' },
};
CASES.sample = { pad: '/nl/test-sample', klant: { email: 'twijfel@nieuw.test', first_name: 'Noor', brand: 'Twijfel BV' }, naam: 'Proefjurk' };
CASES.sample2 = { pad: '/nl/test-sample', klant: { email: 'twijfel2@nieuw.test', first_name: 'Noor', brand: 'Twijfel BV' }, naam: 'Proefjurk' };
const wie = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(CASES);
for (const k of wie) {
  const c = CASES[k];
  const s = await start(); const { page } = s;
  const voor = (await mails()).length;
  console.log(`\n\n######## ${k} ${c.pad}`);
  try {
    const r = await bestel(page, c);
    console.log('log:', r.log);
    const ov = r.overzicht.split('\n');
    console.log('OVERZICHT:', ov.slice(0, ov.findIndex((l) => /WAT ER GEBEURT|WHAT HAPPENS/.test(l))).join(' | '));
    console.log('api:', r.apiStatus, r.apiBody, '\nurl:', r.url);
    await foto(page, `batch-${k}-na-submit`);
    if (/checkout/.test(page.url())) {
      console.log('betaalpagina:', (await tekst(page)).replace(/\s+/g, ' ').slice(0, 200));
      console.log('terug op', await betaal(page, c.betaal || 'paid'));
      const t = (await tekst(page, 'main')).replace(/\n{2,}/g, '\n');
      console.log('BEDANKT:', t.slice(0, 700));
      await foto(page, `batch-${k}-bedankt`, { vol: true });
    } else {
      console.log('GEEN CHECKOUT — pagina:', (await tekst(page, 'main')).replace(/\n{2,}/g, '\n').slice(0, 700));
    }
  } catch (e) { console.log('FOUT:', e.message); await foto(page, `batch-${k}-fout`, { vol: true }); }
  for (const m of (await mails()).slice(voor)) console.log(`MAIL #${m.n} → ${JSON.stringify(m.to)} "${m.subject}"`);
  console.log(await sql("SELECT id, ref, service, status, payment_status, total_cents, vat_cents, vat_treatment, product_count, tier, window_start, window_end, country FROM orders ORDER BY id DESC LIMIT 1"));
  console.log('fouten:', s.fouten.filter(f => !/account\/me/.test(f)));
  await s.stop();
}
