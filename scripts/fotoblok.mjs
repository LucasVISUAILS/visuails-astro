#!/usr/bin/env node
/*
 * VISUAILS — de fotoblokken (lijst 86, 9 november 2026).
 *
 * Lucas koos in lijst 84 (A4) en lijst 86 (glas a · kleur a · beweging a, en alle
 * vier de blokken "goed"): achter vier vaste blokken staat een foto van hemzelf,
 * bewogen langs de snede en in het blauwe uur gezet, met een glazen plaat erover.
 * Elk blok heeft altijd dezelfde foto, zodat je het blok aan zijn beeld herkent.
 *
 * Dit script maakt die achtergronden uit zijn eigen foto's in public/img/:
 *   1 · op 1600 px breed brengen;
 *   2 · gespiegeld uitbreiden (geen zwarte of naar binnen getrokken rand);
 *   3 · bewegen langs de snede: 53,13° (de 3-4-5 uit het V-merk), een kastfilter
 *       over 22 % van de breedte, en nog eens over de helft (zachter, geen kastranden);
 *   4 · terug op de oude maat, een zachte waas erover (1,2 % van de breedte);
 *   5 · de helderheid wordt een kleur uit Blauw uur (docs/KLEURENSCHEMA.md):
 *       inkt #0B0F17 → blauw diep #1A4279 → blauw uur #25508B → blauw licht #80A7DD → wit.
 * Uit: src/assets/fotoblok/<blok>-<800|1600>.<avif|webp>. Vite zet er bij de build
 * een teken uit de inhoud in de naam (/_astro/proef-1600.Ab12Cd.webp, een jaar
 * immutable), dus een nieuwe foto komt meteen bij iedereen aan.
 *
 * Draaien:  node scripts/fotoblok.mjs            (alle vier)
 *           node scripts/fotoblok.mjs proef      (één blok)
 * Daarna de build; tests/fotoblok.test.mjs meet het contrast op elk blok.
 *
 * Een andere foto voor een blok: verander hem in FOTOBLOKKEN (src/data/fotoblok.js),
 * nooit een foto met een merknaam of een gezicht dat herkenbaar blijft (de toets
 * houdt een lijst bij van foto's die niet mogen).
 */
import sharp from 'sharp';
import { mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { FOTOBLOKKEN, FOTOBLOK_MATEN, FOTOBLOK_SCHEMA } from '../src/data/fotoblok.js';

const ROOT = process.cwd();
const BRON = path.join(ROOT, 'public', 'img');
const UIT = path.join(ROOT, 'src', 'assets', 'fotoblok');

const BREED = 1600;
const HOEK = 53.13;                 // de snede, 3 naar rechts op 4 omhoog
const LENGTE = Math.floor(BREED * 0.22) | 1;   // intens: 22 % van de breedte (oneven)
const WAAS = BREED * 0.012;         // de zachte waas erna

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
/** Een verloop als 256 kleuren (gradient map). */
function kaart(stops) {
  const lut = new Float32Array(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    for (let s = 0; s < stops.length - 1; s++) {
      const [t0, c0] = stops[s], [t1, c1] = stops[s + 1];
      if (t >= t0 && t <= t1) {
        const f = (t - t0) / ((t1 - t0) || 1);
        for (let k = 0; k < 3; k++) lut[i * 3 + k] = c0[k] + (c1[k] - c0[k]) * f;
        break;
      }
    }
  }
  return lut;
}
const KAART = kaart(FOTOBLOK_SCHEMA.map(([t, h]) => [t, hex(h)]));

const raw = async (s) => { const { data, info } = await s.raw().toBuffer({ resolveWithObject: true }); return { data, w: info.width, h: info.height, c: info.channels }; };
const vanRaw = (b) => sharp(b.data, { raw: { width: b.w, height: b.h, channels: b.c } });

/** Kastfilter langs x, met de randkleur doorgetrokken (geen zwart). */
function kastX(b, L) {
  const { data, w, h, c } = b;
  const uit = Buffer.alloc(data.length);
  const half = L >> 1;
  const som = new Float64Array((w + 1) * c);
  for (let y = 0; y < h; y++) {
    const rij = y * w * c;
    for (let x = 0; x < w; x++) for (let k = 0; k < c; k++) som[(x + 1) * c + k] = som[x * c + k] + data[rij + x * c + k];
    for (let x = 0; x < w; x++) {
      const a = x - half, z = x + half;  // [a, z] inclusief, buiten de rij de randkleur
      for (let k = 0; k < c; k++) {
        let t = som[(Math.min(z, w - 1) + 1) * c + k] - som[Math.max(a, 0) * c + k];
        if (a < 0) t += -a * data[rij + k];
        if (z > w - 1) t += (z - (w - 1)) * data[rij + (w - 1) * c + k];
        uit[rij + x * c + k] = Math.round(t / L);
      }
    }
  }
  return { ...b, data: uit };
}

/** Bewegingsonscherpte langs een richting: draaien, kastfilter langs x, terugdraaien, uitsnijden. */
async function beweeg(b, hoek, L) {
  const zwart = { r: 0, g: 0, b: 0, alpha: 1 };
  // sharp draait met de klok mee, PIL (de schets) ertegenin: -hoek is dezelfde richting.
  const r = await raw(vanRaw(b).rotate(-hoek, { background: zwart }));
  const k = kastX(r, L);
  const t = await raw(vanRaw(k).rotate(hoek, { background: zwart }));
  const x0 = Math.floor((t.w - b.w) / 2), y0 = Math.floor((t.h - b.h) / 2);
  return raw(vanRaw(t).extract({ left: x0, top: y0, width: b.w, height: b.h }));
}

/** De helderheid wordt een kleur uit Blauw uur; eerst het contrast wat oprekken (2 – 98 %). */
function inSchema(b) {
  const { data, w, h, c } = b;
  const n = w * h;
  const l = new Float32Array(n);
  for (let i = 0; i < n; i++) l[i] = 0.2126 * data[i * c] + 0.7152 * data[i * c + 1] + 0.0722 * data[i * c + 2];
  const s = Float32Array.from(l).sort();
  const lo = s[Math.floor(0.02 * (n - 1))], hi = s[Math.floor(0.98 * (n - 1))];
  const uit = Buffer.alloc(n * 3);
  for (let i = 0; i < n; i++) {
    const t = Math.min(1, Math.max(0, (l[i] - lo) / Math.max(1, hi - lo)));
    const idx = Math.floor(t * 255);
    for (let k = 0; k < 3; k++) uit[i * 3 + k] = Math.round(KAART[idx * 3 + k]);
  }
  return { data: uit, w, h, c: 3 };
}

async function maak(blok, bron, uitsnede) {
  const pad = path.join(BRON, bron);
  if (!existsSync(pad)) throw new Error(`${blok}: bronfoto ${bron} staat niet in public/img/`);
  let b = await raw(sharp(pad).removeAlpha().toColourspace('srgb').resize({ width: BREED, kernel: 'lanczos3' }));
  const h0 = b.h, w0 = b.w, m = LENGTE + 40;
  b = await raw(vanRaw(b).extend({ top: m, bottom: m, left: m, right: m, extendWith: 'mirror' }));
  b = await beweeg(b, HOEK, LENGTE);
  b = await beweeg(b, HOEK, (LENGTE >> 1) | 1);
  b = await raw(vanRaw(b).extract({ left: m, top: m, width: w0, height: h0 }).blur(WAAS));
  b = inSchema(b);
  if (uitsnede) {
    /* een deel van het beeld (1/maat), op x en y als bij background-position: het blok vult er nog steeds mee (cover) */
    const w = Math.round(b.w / uitsnede.maat), h = Math.round(b.h / uitsnede.maat);
    b = await raw(vanRaw(b).extract({ left: Math.round((b.w - w) * uitsnede.x), top: Math.round((b.h - h) * uitsnede.y), width: w, height: h }).resize({ width: BREED, kernel: 'lanczos3' }));
  }
  mkdirSync(UIT, { recursive: true });
  const uit = [];
  for (const breed of FOTOBLOK_MATEN) {
    const s = vanRaw(b).resize({ width: breed, kernel: 'lanczos3' });
    const naam = `${blok}-${breed}`;
    await s.clone().webp({ quality: 80, effort: 6 }).toFile(path.join(UIT, `${naam}.webp`));
    await s.clone().avif({ quality: 55, effort: 6 }).toFile(path.join(UIT, `${naam}.avif`));
    uit.push(naam);
  }
  console.log(`${blok}: ${bron} → ${uit.join(', ')} (${w0}×${h0})`);
}

const alleen = process.argv.slice(2);
for (const [blok, { bron, uitsnede }] of Object.entries(FOTOBLOKKEN)) {
  if (alleen.length && !alleen.includes(blok)) continue;
  await maak(blok, bron, uitsnede);
}
