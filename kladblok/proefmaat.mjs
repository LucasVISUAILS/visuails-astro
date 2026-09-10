/* HOE GROOT IS DE PROEFKAART OP EEN TELEFOON — 10 september 2026
   Lucas: *"Op telefoon mag de Try visuails pop up een stuk kleiner en compacter
   zijn."* Meet de kaart en zijn onderdelen, breed en op een telefoon. */
import { chromium } from 'playwright';
const B = process.env.BASIS || 'http://localhost:4331';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const [naam, w, h] of [['telefoon', 390, 844], ['breed', 1280, 900]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto(`${B}/nl/`, { waitUntil: 'networkidle' });
  await p.evaluate(() => {
    for (const k of document.querySelectorAll('button, a')) {
      if (/noodzakelijke|akkoord|accepteer/i.test(k.textContent || '')) k.click();
    }
    window.scrollTo(0, 1400);
  });
  /* De kaart komt na de hero en na de cookiekeuze; even wachten en anders
     forceren, want de meting gaat over de MAAT en niet over de timing. */
  await p.waitForTimeout(2500);
  await p.evaluate(() => {
    const k = document.querySelector('[data-proefkaart]');
    if (k) {
      k.hidden = false;
      k.classList.add('is-open');
      /* Wat toon() ook doet: de hoogte publiceren, zodat de WhatsApp-knop erboven
         gaat staan. Zonder deze regel meet je de terugval en niet de werkelijkheid. */
      document.documentElement.style.setProperty('--pk-h', `${k.offsetHeight}px`);
    }
  });
  await p.waitForTimeout(400);
  const maten = await p.evaluate(() => {
    const k = document.querySelector('[data-proefkaart]');
    if (!k) return null;
    const r = k.getBoundingClientRect();
    const deel = (sel) => {
      const e = k.querySelector(sel);
      if (!e) return 'weg';
      const b = e.getBoundingClientRect();
      return `${Math.round(b.width)}×${Math.round(b.height)}`;
    };
    return {
      kaart: `${Math.round(r.width)}×${Math.round(r.height)}`,
      deelVanScherm: `${Math.round((r.width * r.height) / (innerWidth * innerHeight) * 100)}%`,
      kop: deel('.pk-kop'), tekst: deel('.pk-tekst'), voet: deel('.pk-voet'), chip: deel('.pk-chip'),
      /* Raakt de WhatsApp-knop de kaart? Dat was de echte fout op een telefoon. */
      botsing: (() => {
        const w = document.querySelector('.wa-launcher');
        if (!w) return 'geen knop';
        const a = k.getBoundingClientRect();
        const b = w.getBoundingClientRect();
        const overlap = !(b.left > a.right || b.right < a.left || b.top > a.bottom || b.bottom < a.top);
        return overlap ? 'JA — knop over de kaart' : `nee (${Math.round(a.top - b.bottom)}px ertussen)`;
      })(),
    };
  });
  console.log(naam, JSON.stringify(maten));
  await p.screenshot({ path: `/tmp/proefkaart-${naam}.png` });
  const k = await p.$('[data-proefkaart]');
  if (k) await k.screenshot({ path: `/tmp/proefkaart-${naam}-kaart.png` });
  await p.close();
}
await b.close();
