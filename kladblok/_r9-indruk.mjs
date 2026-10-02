// Ronde 9 · klanttype 1/2 (a): het eerste scherm op 390 en 1280, en de leesroute.
import { start, foto, tekst, SITE } from './_dl.mjs';
const mobiel = process.argv[2] === '390';
const s = await start({ mobiel }); const { page } = s;
for (const pad of (process.argv[3] || '/nl/').split(',')) {
  await page.goto(SITE + pad, { waitUntil: 'load' });
  await page.waitForTimeout(600);
  const naam = `r9-indruk-${mobiel ? '390' : '1280'}-${pad.replace(/\W+/g, '_')}`;
  await foto(page, naam);
  const vp = page.viewportSize();
  const boven = await page.evaluate((h) => [...document.querySelectorAll('h1,h2,p,a.knop,a.btn,button')].filter((e) => { const r = e.getBoundingClientRect(); return r.top < h && r.bottom > 0 && r.width > 0 && getComputedStyle(e).visibility !== 'hidden'; }).map((e) => `${e.tagName}: ${e.innerText.replace(/\s+/g, ' ').slice(0, 140)}`).filter((x) => x.length > 4).slice(0, 14), vp.height);
  const klein = await page.evaluate(() => [...document.querySelectorAll('body *')].filter((e) => e.childNodes.length && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 11.5 && e.getBoundingClientRect().width > 0).map((e) => `${parseFloat(getComputedStyle(e).fontSize)}px ${e.className || e.tagName}: ${e.innerText.slice(0, 40)}`).slice(0, 6));
  const breed = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  console.log(`\n== ${pad} (${vp.width}×${vp.height}) — boven de vouw:\n  ${boven.join('\n  ')}\n  te klein: ${klein.length ? klein.join(' | ') : 'niets'} · horizontaal scrollen: ${breed}px`);
}
console.log(s.fouten);
await s.stop();
