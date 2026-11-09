/**
 * Wat de controle op visuails.com van 15 oktober 2026 vond — in een browser.
 *
 *   npm run build && node tests/live-qa-51-browser.test.mjs
 *
 *   L05 · /start/plan: 5000 credits getypt en daarna een ander plan gekozen hield
 *         "Doorgaan naar betalen" stil tegen. Het veld klemt nu op min en max, en
 *         staat uit (niet gekeurd, niet verstuurd) als Op maat niet gekozen is.
 *   L06 · de bedankpagina: "Zo gaat het verder" stond op 1920 met 3 tot 5 woorden
 *         per regel; afbreken alleen bij lange woorden; een veld met een fout
 *         komt onder de vaste balk uit.
 */
import { chromium } from 'playwright';
import { startStudio } from './lib/studio-worker.mjs';
import { browserPad } from '../scripts/lib/browserpad.mjs';
import { ABO_EXTRA_ZICHTBAAR } from '../src/data/aboZichtbaar.js';

let pass = 0;
let fail = 0;
function ok(name, got, want = true) {
  const good = JSON.stringify(got) === JSON.stringify(want);
  if (good) pass++; else fail++;
  console.log(`${good ? ' ok  ' : ' FAIL'} ${name.padEnd(80)}${good ? '' : `verwacht ${JSON.stringify(want)}, kreeg ${JSON.stringify(got)}`}`);
}

console.log('\nVISUAILS — de controle op de live site, in een browser (15 oktober 2026)\n');
const studio = await startStudio();
const browser = await chromium.launch({ executablePath: process.env.CHROME || browserPad() });
try {
  /* ── L05 · HET VELD CREDITS ─────────────────────────────────────────── */
  console.log('L05 · /start/plan, het veld credits van Op maat');
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const fouten = [];
  page.on('pageerror', (e) => fouten.push(String(e.message || e)));
  await page.goto(`${studio.url}/nl/start/plan/?plan=studio&credits=500`, { waitUntil: 'load' });
  await page.waitForTimeout(400);
  const veld = '[data-ps-credits]';
  /* 9 november 2026 (ronde 92): sinds ronde 91 (K-14, src/data/aboZichtbaar.js,
     ABO_EXTRA_ZICHTBAAR = false; Lucas, lijst 85 B8 "achter Bespreek met ons")
     staan de vierde kaart "Op maat" en dit creditsveld niet op /start/plan. Dan
     valt er niets te klemmen: we kijken dat het veld en de radio weg zijn, dat
     ?credits=500 uit een oude link niets breekt en dat Merk kiezen niets
     tegenhoudt. Met de vlag aan loopt L05 zoals op 15 oktober. */
  if (!ABO_EXTRA_ZICHTBAAR) {
    const k = await page.evaluate((sel) => {
      const f = document.querySelector('input[name="plan"]')?.form;
      return {
        veld: !!document.querySelector(sel),
        maat: !!document.querySelector('input[name="plan"][value="maat"]'),
        knop: !!document.querySelector('[data-k14-bespreek] a[href^="https://wa.me/"]'),
        credits: f ? [...f.elements].some((e) => e.name === 'credits') : null,
      };
    }, veld);
    ok('K-14 vlag uit: geen creditsveld en geen radio Op maat', [k.veld, k.maat], [false, false]);
    ok('K-14 vlag uit: op die plek "Bespreek met ons" (WhatsApp)', k.knop, true);
    ok('?credits=500 uit een oude link: het formulier stuurt geen credits mee', k.credits, false);
    await page.locator('input[name="plan"][value="brand"]').dispatchEvent('click');
    /* De klantvelden (naam, adres …) zijn hier nog leeg; het gaat om plan en credits. */
    ok('Merk gekozen: plan en credits houden het formulier niet tegen', await page.evaluate(() => {
      const f = document.querySelector('input[name="plan"]').form;
      return [...f.elements].filter((e) => e.willValidate && !e.checkValidity()).map((e) => e.name).filter((n) => n === 'plan' || n === 'credits');
    }), []);
    ok('geen scriptfout op de pagina', fouten, []);
  } else {
  const stand = () => page.evaluate((sel) => {
    const v = document.querySelector(sel);
    return { waarde: v.value, uit: v.disabled, gekeurd: v.willValidate, max: v.max };
  }, veld);
  let s = await stand();
  ok('?credits=500 uit een link: het veld klemt meteen op het maximum', s.waarde, s.max);
  ok('Studio gekozen: het veld staat uit en wordt niet gekeurd', [s.uit, s.gekeurd], [true, false]);
  /* Een klik zoals de bezoeker hem geeft (de radio zelf is onzichtbaar en de
     cookiebalk ligt onderin): hij vinkt aan en vuurt input en change. */
  await page.locator('input[name="plan"][value="maat"]').dispatchEvent('click');
  s = await stand();
  ok('Op maat gekozen: het veld staat aan', s.uit, false);
  await page.fill(veld, '5000');
  await page.locator(veld).blur();
  s = await stand();
  ok('5000 getypt en weggeklikt: terug naar het maximum', s.waarde, s.max);
  await page.fill(veld, '7');
  await page.locator(veld).blur();
  ok('7 getypt: terug naar het minimum (30)', (await stand()).waarde, '30');
  await page.fill(veld, '5000');
  await page.locator('input[name="plan"][value="brand"]').dispatchEvent('click');
  s = await stand();
  ok('5000 getypt, dan Merk gekozen: het veld is uit en houdt niets tegen', [s.uit, s.gekeurd], [true, false]);
  ok('en het formulier zelf is geldig wat dit veld betreft', await page.evaluate((sel) => document.querySelector(sel).form.checkValidity() || [...document.querySelector(sel).form.elements].filter((e) => e.willValidate && !e.checkValidity()).every((e) => e.name !== 'credits'), veld), true);
  }
  await page.close();

  /* ── L06 · DE BEDANKPAGINA ─────────────────────────────────────────── */
  console.log('\nL06 · de bedankpagina, afbreken en de vaste balk');
  for (const breedte of [1920, 1280, 390]) {
    const p = await browser.newPage({ viewport: { width: breedte, height: 1000 } });
    await p.goto(`${studio.url}/nl/thank-you/?order=VIS-PROEF-0001&paid=1`, { waitUntil: 'load' });
    await p.waitForTimeout(300);
    const m = await p.evaluate(() => [...document.querySelectorAll('.ty-verder li')].map((li) => {
      const fs = parseFloat(getComputedStyle(li).fontSize);
      const tekst = li.getBoundingClientRect().width - 1.8 * fs;
      /* Woorden per regel: tel de regels met een Range over de tekstknopen. */
      const r = document.createRange(); r.selectNodeContents(li);
      const regels = new Set([...r.getClientRects()].map((x) => Math.round(x.top))).size || 1;
      return { em: tekst / fs, woorden: li.textContent.trim().split(/\s+/).length / regels, regels };
    }));
    if (breedte >= 1280) {
      ok(`${breedte}: de zin krijgt de hele tekstmaat (16,5 em, niet 14,7)`, m.every((x) => x.em > 16.3), true);
      ok(`${breedte}: gemiddeld 5 of meer woorden per regel`, m.every((x) => x.regels <= 1 || x.woorden >= 4.5), true);
    } else {
      ok(`${breedte}: past in het scherm`, await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    }
    await p.close();
  }
  const h = await browser.newPage({ viewport: { width: 1920, height: 1000 } });
  await h.goto(`${studio.url}/nl/contact/`, { waitUntil: 'load' });
  const css = await h.evaluate(() => {
    const p = document.querySelector('main p');
    const i = document.querySelector('main input:not([type="hidden"])');
    return { breek: p ? getComputedStyle(p).hyphenateLimitChars : '', marge: i ? getComputedStyle(i).scrollMarginTop : '' };
  });
  ok('afbreken pas vanaf tien letters (hyphenate-limit-chars)', css.breek, '10 4 4');
  ok('een veld scrolt tot onder de balk (scroll-margin-top 76 + 28 px)', css.marge, '104px');
  await h.close();
} finally {
  await browser.close();
  await studio.dispose();
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
