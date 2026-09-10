/* DE DERDE TERMIJN IN BEELD — 10 september 2026
   Lucas: *"misschien een label toevoegen om een jaar duidelijk voordeliger te
   maken"* en, staand: *"Wel even altijd goed controleren op leesbaarheid."*
   Zet stap 2 van /nl/start/plan open met de vooruitbetaalde stand gekozen. */
import { chromium } from 'playwright';
const BASIS = process.env.BASIS || 'http://localhost:4331';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const [naam, w, h] of [['breed', 1280, 1000], ['telefoon', 390, 900]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto(`${BASIS}/nl/start/plan`, { waitUntil: 'networkidle' });
  await p.evaluate(() => {
    for (const knop of document.querySelectorAll('button, a')) {
      if (/noodzakelijke|akkoord|accepteer|alles toestaan|sluiten/i.test(knop.textContent || '')) knop.click();
    }
    const r = document.querySelector('[name="term"][value="prepaid"]');
    if (r) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); }
  });
  await p.waitForTimeout(400);
  const doel = await p.$('.ps-terms');
  if (doel) await doel.scrollIntoViewIfNeeded();
  await p.waitForTimeout(200);
  await p.screenshot({ path: `/tmp/vooruit-${naam}.png`, fullPage: false });
  const maat = doel ? await doel.boundingBox() : null;
  console.log(naam, maat ? `${Math.round(maat.width)}×${Math.round(maat.height)}` : 'geen .ps-terms');
  await p.close();
}
await b.close();
