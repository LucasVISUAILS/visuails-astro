// VISUAILS — bouwt de styleguide uit src/styles/global.css.
//
// WAAROM DIT EEN SCRIPT IS EN GEEN HANDGESCHREVEN PAGINA. Lucas vroeg om de
// Harbor-styleguide bijgewerkt naar het huidige toxic-green schema. Een
// styleguide die met de hand wordt bijgewerkt, is een styleguide die één
// paletwijziging achterloopt — en dit palet is in een paar maanden twee keer
// verschoven (harbor-teal → #86C232 → #C6F100). Dit leest de tokens uit
// global.css op het moment dat het draait, dus hij kan niet verouderen zonder
// dat de site zelf ook verandert.
//
// Draaien: npm run styleguide → visuails-styleguide.html
import { readFileSync, writeFileSync } from 'node:fs';

const css = readFileSync('src/styles/global.css', 'utf8');
const root = (css.match(/:root\s*\{[\s\S]*?\n\}/) || [''])[0];
const TOKENS = [...root.matchAll(/^\s*(--[a-z0-9-]+):\s*([^;]+);/gmi)]
  .map(([, k, v]) => [k, v.trim().replace(/\s+/g, ' ')]);
const map = Object.fromEntries(TOKENS);
const val = (k) => map[k] || '';

/** Resolve a var() chain so a swatch shows the colour, not the alias. */
function resolve(v, depth = 0) {
  if (depth > 8) return v;
  const m = String(v).match(/^var\((--[a-z0-9-]+)\)$/i);
  return m && map[m[1]] ? resolve(map[m[1]], depth + 1) : v;
}

/** Relative luminance → pick black or white text on a swatch. */
function readable(hex) {
  const m = /^#([0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) return '#fff';
  const n = parseInt(m[1], 16);
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const L = 0.2126 * f(n >> 16 & 255) + 0.7152 * f(n >> 8 & 255) + 0.0722 * f(n & 255);
  return L > 0.45 ? '#08090B' : '#FFFFFF';
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const GROUPS = [
  { h: 'Ground', why: 'Vier lagen, van de paginabodem tot een tegel op een tegel. Alles daarboven is ink of line.',
    keys: ['--bg-0', '--bg-raise', '--surface', '--surface-2'] },
  { h: 'Ink', why: 'Vier stappen wit, en niet meer. Alle vier halen 4,5:1 op de donkerste ondergrond — dat is precies waarom er bij vier wordt gestopt.',
    keys: ['--ink-1', '--ink-2', '--ink-3', '--ink-4'] },
  { h: 'Lines', why: 'Drie gewichten: een scheiding, een rand die je moet zien, en de omtrek van een bedienbaar ding.',
    keys: ['--line', '--line-strong', '--line-ui'] },
  { h: 'Accent', why: 'Toxic green. 15,16:1 op de grond én andersom als vulling met bijna-zwarte tekst — die zeldzame eigenschap is wat één waarde laat werken als tekst, als lijn én als knopvulling. Wit erop is 1,31:1 en dus nooit goed.',
    keys: ['--accent', '--accent-dim', '--accent-ink', '--accent-soft'] },
  { h: 'Signal', why: 'Eén waarschuwingskleur naast het groen. Klei, niet rood: rood naast dit groen is kerst.',
    keys: ['--clay', '--warn', '--verify', '--focus-ring'] },
  { h: 'Radius', why: '', keys: ['--r-sm', '--r-md', '--r-lg', '--r-pill'] },
  { h: 'Motion', why: 'Vier duren en twee curves. State, element, sectie, en het lange geval.',
    keys: ['--dur-1', '--dur-2', '--dur-3', '--dur-4', '--ease-out-quint', '--ease-out-expo'] },
];

const TYPE = [
  ['--font-heading', 'Big Shoulders Display', 'De grote koppen. Smal, hoog, hard — het gezicht van de site.'],
  ['--font-display', 'Archivo', 'De kleine mechanische dingen: cijfers, stapnummers, labels.'],
  ['--font-body', 'Archivo', 'Leestekst. Niet ter discussie.'],
  ['--font-editorial', 'Anybody', 'De redactionele uitschieters.'],
];
const SCALE = ['--t-hero', '--t-h1', '--t-h2', '--t-h3', '--t-lg', '--t-body'];

function swatch(k) {
  const raw = val(k);
  const shown = resolve(raw);
  const isColour = /^(#|rgb|oklch|color-mix)/i.test(shown);
  return `<div class="sw">
    <div class="chip" style="background:${isColour ? esc(shown) : 'var(--surface-2)'};color:${readable(shown)}">
      ${isColour ? '' : `<span class="nonc">${esc(shown)}</span>`}
    </div>
    <code>${esc(k)}</code>
    <span class="v">${esc(raw === shown ? raw : `${raw} → ${shown}`)}</span>
  </div>`;
}

const html = `<!doctype html>
<html lang="nl"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>VISUAILS — styleguide</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=Big+Shoulders+Display:wght@600;800&display=swap" rel="stylesheet">
<style>
:root{${TOKENS.map(([k, v]) => `${k}:${v}`).join(';')}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg-0);color:var(--ink-1);font-family:var(--font-body);
     font-size:16px;line-height:1.65;-webkit-font-smoothing:antialiased}
.wrap{max-width:1080px;margin:0 auto;padding:clamp(2.5rem,6vw,5rem) clamp(1.2rem,4vw,2.5rem) 8rem}
h1{font-family:var(--font-heading);font-size:clamp(3rem,8vw,6rem);line-height:.92;margin:0 0 1rem;letter-spacing:-.01em;text-transform:uppercase}
h1 em{font-style:normal;color:var(--accent)}
.lede{color:var(--ink-3);max-width:60ch;margin:0 0 1rem;font-size:1.05rem}
.meta{color:var(--ink-4);font-size:.82rem;margin:0}
h2{font-family:var(--font-heading);font-size:clamp(1.7rem,3.4vw,2.6rem);margin:0 0 .4rem;text-transform:uppercase;letter-spacing:.01em}
section{margin-top:clamp(3rem,7vw,5.5rem);border-top:1px solid var(--line);padding-top:clamp(1.6rem,3vw,2.4rem)}
.why{color:var(--ink-3);max-width:66ch;margin:0 0 1.8rem;font-size:.94rem}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:1rem}
.sw{display:flex;flex-direction:column;gap:.45rem}
.chip{height:92px;border-radius:var(--r-md);border:1px solid var(--line);display:grid;place-items:center;font-size:.7rem;padding:.4rem;text-align:center}
.nonc{opacity:.8;word-break:break-all}
code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.78rem;color:var(--ink-2)}
.v{font-size:.72rem;color:var(--ink-4);word-break:break-all}
.type-row{border-bottom:1px solid var(--line);padding:1.3rem 0}
.type-row:last-child{border-bottom:0}
.type-row .name{font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-4);margin-bottom:.5rem}
.type-row .why{margin:.4rem 0 0;font-size:.85rem}
.btns{display:flex;flex-wrap:wrap;gap:.7rem;align-items:center}
.b{border:0;cursor:pointer;font-family:var(--font-display);font-weight:700;letter-spacing:.02em;text-transform:uppercase;
   padding:.85rem 1.5rem;border-radius:var(--r-pill);font-size:.85rem}
.b-p{background:var(--accent);color:var(--accent-ink)}
.b-g{background:var(--btn-ghost-fill);color:var(--ink-1)}
.b-2{background:transparent;color:var(--ink-1);border:1px solid var(--btn-2nd-border)}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:1rem}
.card{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);padding:1.3rem}
.card h3{margin:0 0 .4rem;font-size:1rem}
.card p{margin:0;color:var(--ink-3);font-size:.88rem}
.pill{display:inline-flex;align-items:center;gap:.45rem;border:1px solid var(--line);border-radius:var(--r-pill);padding:.35rem .85rem;font-size:.8rem;color:var(--ink-2)}
.pill i{width:6px;height:6px;border-radius:50%;background:var(--accent);display:block}
.scale li{list-style:none;margin:0 0 .8rem;display:flex;gap:1rem;align-items:baseline;border-bottom:1px dashed var(--line);padding-bottom:.8rem}
.scale{padding:0;margin:0}
.scale code{flex:0 0 7rem}
table{width:100%;border-collapse:collapse;font-size:.88rem}
td,th{text-align:left;padding:.55rem .6rem;border-bottom:1px solid var(--line);vertical-align:top}
th{color:var(--ink-4);font-weight:500;font-size:.74rem;letter-spacing:.12em;text-transform:uppercase}
.foot{margin-top:5rem;color:var(--ink-4);font-size:.78rem;border-top:1px solid var(--line);padding-top:1.4rem}
</style></head><body><div class="wrap">

<h1>VISUAILS<br><em>styleguide</em></h1>
<p class="lede">Elke waarde hieronder is uitgelezen uit <code>src/styles/global.css</code> op het moment dat dit bestand werd gegenereerd. Er staat niets in dat met de hand is overgetypt, dus hij kan niet uit de pas lopen met de site.</p>
<p class="meta">Gegenereerd door <code>scripts/make-styleguide.mjs</code> · ${TOKENS.length} tokens · palet: toxic green <code>${esc(val('--accent'))}</code></p>

${GROUPS.map((g) => `<section>
  <h2>${esc(g.h)}</h2>
  ${g.why ? `<p class="why">${esc(g.why)}</p>` : ''}
  <div class="grid">${g.keys.map(swatch).join('')}</div>
</section>`).join('')}

<section>
  <h2>Type</h2>
  <p class="why">Vier families, en ze doen alle vier iets anders. De koppen zijn smal en de leestekst niet — dat contrast is het hele typografische idee.</p>
  ${TYPE.map(([k, name, why]) => `<div class="type-row">
    <div class="name">${esc(k)} — ${esc(name)}</div>
    <div style="font-family:${esc(val(k))};font-size:2.1rem;line-height:1.1">Jij uploadt. Wij leveren de campagne.</div>
    <p class="why">${esc(why)}</p>
  </div>`).join('')}
</section>

<section>
  <h2>Scale</h2>
  <p class="why">Zes stappen, allemaal <code>clamp()</code>, dus er is geen breakpoint waarop de typografie springt.</p>
  <ul class="scale">${SCALE.map((k) => `<li><code>${esc(k)}</code><span style="font-family:var(--font-heading);font-size:${esc(val(k))};line-height:1">Aa</span><span class="v">${esc(val(k))}</span></li>`).join('')}</ul>
</section>

<section>
  <h2>Buttons</h2>
  <p class="why">Drie, en niet meer. Bijna-zwart op groen voor de primaire — wit op dit groen haalt 1,31:1 en is dus nooit correct.</p>
  <div class="btns">
    <button class="b b-p">Start een bestelling</button>
    <button class="b b-g">Proefvisual</button>
    <button class="b b-2">Bekijk de prijzen</button>
    <span class="pill"><i></i>Chip</span>
  </div>
</section>

<section>
  <h2>Surfaces</h2>
  <p class="why">Eén kaartvorm. De rand doet het werk, niet een schaduw.</p>
  <div class="cards">
    <div class="card"><h3>Catalog</h3><p>Vier beelden per product — voor, achter, detail, op model.</p></div>
    <div class="card"><h3>Lifestyle</h3><p>Drie beelden, één gestylede look, klaar om te posten.</p></div>
    <div class="card"><h3>Video</h3><p>Eén clip die doorloopt.</p></div>
  </div>
</section>

<section>
  <h2>Alle tokens</h2>
  <p class="why">De volledige <code>:root</code>, in de volgorde waarin global.css hem definieert. De aliassen staan erbij: veel namen uit het harbor-palet resolven nog, omdat portal.css, account.css en admin.css ze nog gebruiken.</p>
  <table><thead><tr><th>Token</th><th>Waarde</th><th>Resolved</th></tr></thead><tbody>
  ${TOKENS.map(([k, v]) => { const r = resolve(v); return `<tr><td><code>${esc(k)}</code></td><td class="v">${esc(v.length > 90 ? v.slice(0, 90) + '…' : v)}</td><td class="v">${esc(r === v ? '' : (r.length > 40 ? r.slice(0, 40) + '…' : r))}</td></tr>`; }).join('')}
  </tbody></table>
</section>

<p class="foot">VISUAILS · KVK 99742993 · Deze pagina is gegenereerd, niet geschreven. Wijzig een kleur in <code>src/styles/global.css</code> en draai <code>npm run styleguide</code> opnieuw.</p>
</div></body></html>`;

writeFileSync('visuails-styleguide.html', html);
console.log(`visuails-styleguide.html — ${TOKENS.length} tokens, accent ${val('--accent')}`);
