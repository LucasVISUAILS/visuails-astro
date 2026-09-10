/* HOEVEEL MOEITE KOST DE PROEF DE KLANT — 10 september 2026
   ═══════════════════════════════════════════════════════════════════════════
   Lucas: *"Ik wil dat de sample zo min mogelijk moeite is om in te vullen voor
   de klant en zo snel mogelijk geleverd kan worden."*

   Pixels waren de vorige meting; dit telt HANDELINGEN. Per stap: hoeveel velden
   staan er, hoeveel moet je er verplicht aanraken, en hoeveel keuzes liggen er
   op tafel. Naast dezelfde telling op /start/catalog, want dat is het betaalde
   formulier dat méér zou moeten vragen dan een proef van één euro. */
import { chromium } from 'playwright';
const B = process.env.BASIS || 'http://127.0.0.1:4333';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

for (const [pad, naam] of [['/test-sample/', 'PROEF'], ['/start/catalog/', 'CATALOG']]) {
  const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
  await p.goto(`${B}${pad}`, { waitUntil: 'domcontentloaded' });
  await p.evaluate(() => { for (const k of document.querySelectorAll('button, a')) if (/noodzakelijke|akkoord/i.test(k.textContent || '')) k.click(); });
  await p.waitForTimeout(400);
  /* Alle stappen openzetten: verborgen stappen tellen wél mee voor de moeite,
     de klant komt er hoe dan ook langs. */
  const uit = await p.evaluate(() => {
    for (const s of document.querySelectorAll('[data-pl-step]')) s.hidden = false;
    const zichtbaar = (e) => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
    const groepen = new Set();
    const rijen = [...document.querySelectorAll('[data-pl-step]')].map((s) => {
      /* GEEN zichtbaarheidsfilter. De stappen 2 tot 5 staan dicht tot de klant
         er is, maar hij komt er hoe dan ook langs — en het gaat hier om de moeite
         van het hele formulier, niet om wat er op dit moment op het scherm staat.
         `type=hidden` valt er wél af: dat zijn draadwaarden, geen vragen. */
      const velden = [...s.querySelectorAll('input, select, textarea')].filter((f) => f.type !== 'hidden');
      const radios = new Set(velden.filter((f) => f.type === 'radio').map((f) => f.name));
      const vakjes = velden.filter((f) => f.type === 'checkbox');
      const tekst = velden.filter((f) => !['radio', 'checkbox', 'file'].includes(f.type));
      const bestanden = velden.filter((f) => f.type === 'file');
      for (const r of radios) groepen.add(r);
      return {
        nr: s.dataset.plStep,
        kop: (s.querySelector('h2, .pl-h') || {}).textContent?.trim().slice(0, 34) || '',
        tekst: tekst.length,
        tekstVerplicht: tekst.filter((f) => f.required).length,
        radiogroepen: radios.size,
        radioknoppen: velden.filter((f) => f.type === 'radio').length,
        vakjes: vakjes.length,
        bestanden: bestanden.length,
      };
    });
    return { rijen };
  });
  const som = (k) => uit.rijen.reduce((n, r) => n + r[k], 0);
  console.log(`\n══ ${naam}`);
  for (const r of uit.rijen) {
    console.log(`   stap ${r.nr} · ${r.kop.padEnd(34)} ${String(r.tekst).padStart(2)} tekstvelden (${r.tekstVerplicht} verplicht) · ${r.radiogroepen} keuzes uit ${r.radioknoppen} knoppen · ${r.vakjes} vinkjes · ${r.bestanden} uploadvakken`);
  }
  console.log(`   TOTAAL: ${som('tekst')} tekstvelden (${som('tekstVerplicht')} verplicht) · ${som('radiogroepen')} keuzes uit ${som('radioknoppen')} knoppen · ${som('vakjes')} vinkjes · ${som('bestanden')} uploadvakken`);
  await p.close();
}
await b.close();
