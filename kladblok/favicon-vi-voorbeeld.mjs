/* Voorbeeld van de nieuwe favicon: de letters "VI" uit het bestaande
   woordmerk (src/data/wordmarkPath.js), geen nieuw ontwerp. Rendert een
   proefvel op /tmp/claude-0/favicon-vi.png. Lucas, 19 sept 2026: "laat eerst
   zien wat je hiermee bedoelt en maakt". */
import { chromium } from 'playwright';
import { WORDMARK_PATHS, WORDMARK_TRANSFORM } from '../src/data/wordmarkPath.js';

const sub = WORDMARK_PATHS[0].split(/(?=M)/).map((s) => s.trim()).filter(Boolean);
// volgorde in de export: S S V I U A I L — V is de derde, I de vierde
const V = sub[2], I = sub[3];
if (!V.startsWith('M20 ') || !I.startsWith('M2827 ')) throw new Error('onverwachte volgorde: ' + sub.map((s) => s.slice(0, 8)).join(' | '));
// x van 20..3362 (×0.1 → 2..336), y hele hoogte 0..278
const bbox = { x: 2, y: 0, w: 335, h: 278 };
export const VI_SVG = (size, ground, ink, inset = 0.62) => {
  const gh = size * inset * (bbox.h / Math.max(bbox.w, bbox.h)) * (bbox.w / bbox.h > 1 ? bbox.h / bbox.w : 1);
  const s = (size * inset) / Math.max(bbox.w, bbox.h);
  const gw = bbox.w * s, ghh = bbox.h * s;
  const x = (size - gw) / 2, y = (size - ghh) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${ground}"/>
  <svg x="${x}" y="${y}" width="${gw}" height="${ghh}" viewBox="${bbox.x} ${bbox.y} ${bbox.w} ${bbox.h}"><g transform="${WORDMARK_TRANSFORM}" fill="${ink}"><path d="${V}"/><path d="${I}"/></g></svg>
</svg>`;
};

const GREEN = '#D2E04A', DARK = '#111111', WHITE = '#FFFFFF';
const varianten = [
  ['b · wit op gifgroen (zoals nu live)', GREEN, WHITE],
  ['b2 · bijna-zwart op gifgroen', GREEN, DARK],
  ['c · gifgroen op bijna-zwart', DARK, GREEN],
];
const tab = (svg, licht) => `<div style="display:flex;align-items:center;gap:8px;padding:6px 12px;border-radius:8px 8px 0 0;background:${licht ? '#fff' : '#35363a'};color:${licht ? '#202124' : '#e8eaed'};font:13px system-ui;width:180px;border:1px solid ${licht ? '#dadce0' : '#202124'}">${svg.replace('width="16"', 'width="16"')}<span>VISUAILS — Catalog</span></div>`;
let html = `<body style="margin:0;padding:28px;background:#f5f5f5;font:13px system-ui;color:#111"><h2 style="margin:0 0 4px">Favicon uit het woordmerk: de letters V en I, niets nieuws getekend</h2><p style="margin:0 0 20px;color:#555">Zelfde paden als het woordmerk in de voettekst. Drie kleurstellingen; de eerste is de tegel die nu live is (wit op gifgroen), alleen de V vervangen door VI.</p>`;
for (const [naam, g, i] of varianten) {
  html += `<div style="display:flex;align-items:center;gap:22px;margin:0 0 22px;padding:16px;background:#fff;border:1px solid #ddd"><div style="width:230px;font-weight:600">${naam}</div>`;
  for (const n of [16, 32, 48, 180]) html += `<div style="text-align:center"><div>${VI_SVG(n, g, i)}</div><div style="color:#777;font-size:11px">${n}px</div></div>`;
  html += `<div style="display:grid;gap:6px">${tab(VI_SVG(16, g, i), true)}${tab(VI_SVG(16, g, i), false)}</div></div>`;
}
html += `<div style="display:flex;gap:22px;align-items:center;padding:16px;background:#fff;border:1px solid #ddd"><div style="width:230px;font-weight:600">ter vergelijking: nu live (V)</div><img src="data:image/png;base64,${(await import('node:fs')).readFileSync('public/favicon-192.png').toString('base64')}" width="48" height="48"><img src="data:image/png;base64,${(await import('node:fs')).readFileSync('public/favicon-32.png').toString('base64')}" width="16" height="16"></div></body>`;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1000, height: 760 }, deviceScaleFactor: 2 });
await p.setContent(html);
await p.screenshot({ path: '/tmp/claude-0/favicon-vi.png', fullPage: true });
await b.close();
console.log('ok');
