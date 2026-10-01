// Ronde 5 · A5: bedrijf en btw per land, in de echte browser (als gast).
import { start, sql, paneel } from './_dl.mjs';
import { bestel, stap, stapFout } from './_bestel.mjs';

const uit = (...a) => console.log(...a);
const gevallen = [
  { naam: 'VS zonder nummer', land: 'US', vat: undefined, email: 'buyer@usbrand.test' },


];
for (const g of gevallen) {
  uit(`\n## ${g.naam}`);
  const s = await start();
  const { page } = s;
  const velden = [];
  try {
    const r = await bestel(page, {
      pad: '/nl/start/catalog', aantal: 1, fotos: 3, land: g.land, vat: g.vat,
      klant: { email: g.email, brand: `Merk ${g.land}` },
      stap3: async (p) => {
        velden.push(await p.evaluate(() => [...document.querySelectorAll('.pl-step.is-current input, .pl-step.is-current select')]
          .filter((e) => e.offsetParent !== null).map((e) => `${e.name}${e.required ? '*' : ''}`).join(' ')));
        velden.push(await p.evaluate(() => [...document.querySelectorAll('.pl-step.is-current [data-pl-reg-hint], .pl-step.is-current .pl-hint')]
          .filter((e) => e.offsetParent !== null).map((e) => e.innerText.trim()).join(' | ')));
      },
    });
    uit('zichtbare velden stap 3:', velden[0]);
    uit('hint:', velden[1]);
    uit('api', r.apiStatus, '→', r.url);
    uit(await sql(`SELECT ref, country, vat_rate, vat_cents, vat_treatment, review_state, review_reason, payment_status FROM orders ORDER BY id DESC LIMIT 1`));
    const b = await paneel('/payments'); const laatste = b[b.length - 1];
    uit('laatste betaling:', laatste?.amount?.value, laatste?.metadata?.order_ref);
  } catch (e) {
    uit('GESTOPT:', String(e.message).slice(0, 300), '| stap', await stap(page), '|', await stapFout(page));
  }
  uit('fouten:', s.fouten);
  await s.stop();
}

uit('\n## Nederland zonder KVK (moet blokkeren)');
{
  const s = await start();
  const { page } = s;
  try {
    await bestel(page, {
      pad: '/nl/start/catalog', aantal: 1, fotos: 3, land: 'NL', vat: '', klant: { email: 'leeg@nlmerk.test' },
      stap3: async (p) => { await p.fill('.pl-step.is-current input[name="reg_number"]', ''); await p.fill('.pl-step.is-current input[name="vat"]', '').catch(() => {}); },
    });
    uit('NIET geblokkeerd — fout');
  } catch (e) { uit('geblokkeerd:', String(e.message).slice(0, 200)); }
  await s.stop();
}
