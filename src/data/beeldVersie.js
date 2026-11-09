/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * ?v= ACHTER ELK BEELD ONDER /img/hal — 9 november 2026 (lijst 87, C16)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * public/_headers laat /img/* zeven dagen in de browser (en op de rand van
 * Cloudflare) staan. De regel daar is "een ander beeld krijgt een andere naam",
 * en dat ging een keer mis: een masker en zijn foto die samen veranderen, lopen
 * bij een bezoeker tot zeven dagen uit elkaar. De opening deed het al goed
 * (openingVersie() in src/data/openingStanden.js); de rest van /img/hal niet:
 * masker-laptop.png in hal.css, de rustbeelden, de standen, de sfeer-*.webp.
 *
 * Dit is het ene hulpje daarvoor. halV('/img/hal/x.webp') geeft
 * '/img/hal/x.webp?v=<tien tekens>': het begin van een sha1 over de inhoud van
 * het bestand (en van de .avif ernaast, als die er is: die gaat via
 * scripts/avif-naast-webp.mjs met hetzelfde teken mee). Andere inhoud is een
 * ander adres; dezelfde inhoud houdt zijn cache.
 *
 * Twee plekken gebruiken het:
 *   · de componenten (Astro, bij de build onder Node): halV() om het pad heen;
 *   · de stylesheets: metHalVersie() in de Vite-stap van astro.config.mjs zet het
 *     teken achter elke url(/img/hal/…) die er nog geen heeft.
 *
 * Ligt het bestand er niet (een test, of een beeld dat nog gemaakt moet worden),
 * dan blijft het pad zoals het is: liever geen teken dan een verzonnen teken.
 * Alleen Node: de browser laadt dit bestand niet.
 */
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const cache = new Map();

/** De tien tekens voor één bestand onder public/, of '' als het er niet ligt. */
export function beeldTeken(pad, wortel = process.cwd()) {
  const schoon = String(pad || '').split(/[?#]/)[0];
  if (!schoon.startsWith('/img/')) return '';
  const sleutel = `${wortel}|${schoon}`;
  if (cache.has(sleutel)) return cache.get(sleutel);
  const vol = path.join(wortel, 'public', ...schoon.slice(1).split('/'));
  let teken = '';
  if (existsSync(vol)) {
    const h = createHash('sha1');
    h.update(readFileSync(vol));
    const avif = vol.replace(/\.webp$/i, '.avif');
    if (avif !== vol && existsSync(avif)) { h.update('\0avif\0'); h.update(readFileSync(avif)); }
    teken = h.digest('hex').slice(0, 10);
  }
  cache.set(sleutel, teken);
  return teken;
}

/** '/img/hal/x.webp' → '/img/hal/x.webp?v=…'. Een pad dat al een ?v= heeft, of buiten /img/hal ligt, blijft staan. */
export function halV(pad, wortel = process.cwd()) {
  const s = String(pad || '');
  if (!s.startsWith('/img/hal/') || /[?&]v=/.test(s)) return s;
  const t = beeldTeken(s, wortel);
  return t ? `${s}${s.includes('?') ? '&' : '?'}v=${t}` : s;
}

/** Een srcset ("/img/hal/a-1000.webp 1000w, …") met het teken achter elk pad. */
export function halSrcsetV(srcset, wortel = process.cwd()) {
  return String(srcset || '').split(',').map((stuk) => {
    const [p, ...rest] = stuk.trim().split(/\s+/);
    return p ? [halV(p, wortel), ...rest].join(' ') : '';
  }).filter(Boolean).join(', ');
}

/** CSS: elke url(/img/hal/…) zonder ?v= krijgt het teken. Aanhalingstekens mogen. */
export function metHalVersie(css, wortel = process.cwd()) {
  return String(css || '').replace(/url\(\s*(['"]?)(\/img\/hal\/[^'")?#\s]+)\1\s*\)/g,
    (heel, q, p) => `url(${q}${halV(p, wortel)}${q})`);
}
