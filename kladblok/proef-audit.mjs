/* DE PROEF ONDER DE LOEP — 10 september 2026
   ═══════════════════════════════════════════════════════════════════════════
   Lucas: *"Doe daarna een volledige controle op test sample en ook via de
   browser. Deze bestelform klopt nog niet helemaal en is ook niet consistent
   qua flow met catalog en lifestyle."*

   Dit script INVENTARISEERT eerst: welke stappen staan er, welke velden, wat is
   zichtbaar, en waar zit het verschil met /start/catalog. Breken doet
   proef-breek.mjs. */
import { chromium } from 'playwright';
const B = process.env.BASIS || 'http://127.0.0.1:8790';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

async function rontgen(pad, naam) {
  const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
  const fouten = [];
  p.on('pageerror', (e) => fouten.push(`pageerror: ${e.message}`));
  p.on('console', (m) => { if (m.type() === 'error') fouten.push(`console: ${m.text().slice(0, 120)}`); });
  await p.goto(`${B}${pad}`, { waitUntil: 'domcontentloaded' });
  await p.evaluate(() => {
    for (const k of document.querySelectorAll('button, a')) {
      if (/noodzakelijke|akkoord|accepteer/i.test(k.textContent || '')) k.click();
    }
  });
  await p.waitForTimeout(400);
  const uit = await p.evaluate(() => {
    const zichtbaar = (e) => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
    const stappen = [...document.querySelectorAll('[data-pl-step]')].map((s) => ({
      nr: s.dataset.plStep,
      zichtbaar: zichtbaar(s),
      kop: (s.querySelector('h2, .pl-h, legend') || {}).textContent?.trim().slice(0, 60) || '',
      velden: [...s.querySelectorAll('input, select, textarea')]
        .filter((f) => f.type !== 'hidden')
        .map((f) => `${f.tagName.toLowerCase()}[${f.type || ''}] name=${f.name || '—'}${f.required ? ' *' : ''}${zichtbaar(f) ? '' : ' (verborgen)'}`),
      hoogte: Math.round(s.getBoundingClientRect().height),
    }));
    const form = document.querySelector('form[data-pl]') || document.querySelector('form');
    return {
      stappen,
      formActie: form ? form.getAttribute('action') : 'geen form',
      verborgen: form ? [...form.querySelectorAll('input[type=hidden]')].map((h) => `${h.name}=${h.value}`) : [],
      woorden: (document.body.innerText.match(/\S+/g) || []).length,
      hoogte: Math.round(document.body.scrollHeight),
    };
  });
  console.log(`\n══ ${naam}  (${pad})`);
  console.log(`   pagina ${uit.hoogte}px · ${uit.woorden} woorden · form → ${uit.formActie}`);
  console.log(`   verborgen velden: ${uit.verborgen.join(', ') || '—'}`);
  for (const s of uit.stappen) {
    console.log(`   stap ${s.nr}${s.zichtbaar ? '' : ' (verborgen)'} · ${s.hoogte}px · ${s.kop}`);
    for (const v of s.velden) console.log(`        ${v}`);
  }
  if (fouten.length) console.log('   FOUTEN:', fouten.join(' | '));
  await p.close();
  return uit;
}

await rontgen('/test-sample/', 'DE PROEF');
await rontgen('/start/catalog/', 'CATALOG');
await b.close();
