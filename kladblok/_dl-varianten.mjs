import { start, foto, tekst, sql, mails, SITE } from './_dl.mjs';
import { bestel, betaal } from './_bestel.mjs';
const CASES = {
  A: { pad: '/nl/start/catalog', aantal: 3, fotos: 6, angles: ['three-quarter', 'flat-lay'], background: 'custom', ratio: 'portrait45', model: 'lisa', voorrang: true, land: 'NL', vat: null,
       klant: { email: 'henk@kledingzaak.test', first_name: 'Henk' }, stap1: async (p) => { await p.evaluate(() => { const d = document.querySelector('input[name="background_custom"]')?.closest('details'); if (d && !d.open) d.querySelector('summary').click(); }); await p.waitForTimeout(300); const f = p.locator('input[name="background_custom"]'); if (await f.count()) { await f.fill('#1E3A5F'); await f.dispatchEvent('input'); } else console.log('geen background_custom'); } },
  B: { pad: '/start/lifestyle', aantal: 1, look: 'glow', outfit: 1, model: 'seme', ratio: 'story', land: 'BE', vat: 'BE0123456789', klant: { email: 'yara@merk.test', first_name: 'Yara' } },
  C: { pad: '/nl/start/complete', aantal: 2, look: 'dunes', land: 'DE', vat: 'DE123456789', klant: { email: 'tom@foto.test', first_name: 'Tom' } },
};
for (const k of process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(CASES)) {
  const s = await start(); const { page } = s;
  console.log(`\n######## ${k}`);
  try {
    const r = await bestel(page, CASES[k]);
    console.log(r.log.join('\n'));
    console.log('OVERZICHT:\n' + r.overzicht.slice(0, 1400));
    console.log('api', r.apiStatus, r.url);
    await foto(page, `var-${k}-mollie`);
    if (/nep-mollie/.test(page.url())) { await betaal(page); await page.waitForTimeout(3500); }
    console.log(JSON.stringify(await sql("SELECT ref, service, product_count, total_cents, vat_cents, vat_treatment, review_state, payment_status, lang, details_json FROM orders ORDER BY id DESC LIMIT 1")));
    const [inv] = await sql("SELECT number, snapshot_json FROM invoices ORDER BY id DESC LIMIT 1");
    if (inv) { const sn = JSON.parse(inv.snapshot_json); console.log('factuur', inv.number, JSON.stringify(sn.lines), sn.netCents, sn.vatCents, sn.treatment, sn.note || ''); }
  } catch (e) { console.log('FOUT', e.message); await foto(page, `var-${k}-fout`, { vol: true }); }
  console.log(s.fouten.filter((x) => !/account\/me/.test(x))); await s.stop();
}
