// VISUAILS — bouwt de styleguide uit src/styles/global.css.
//
// WAAROM DIT EEN SCRIPT IS EN GEEN HANDGESCHREVEN PAGINA. Lucas vroeg om de
// Harbor-styleguide bijgewerkt naar het toen geldende schema. Een styleguide
// die met de hand wordt bijgewerkt, is een styleguide die één paletwijziging
// achterloopt — en dit palet is in een paar maanden vier keer verschoven
// (harbor-teal → #86C232 → #D2E04A → Mercury Hard violet #4A1FFF). De TOKENS
// leest hij uit global.css op het moment dat hij draait.
//
// ── MAAR DE WOORDEN ERNAAST LIEPEN WÉL ACHTER — 22 september 2026 ───────────
// Lucas: *"Pas de styleguide aan naar de huidige kleuren van de website, deze
// is nog verouderd."* En hij had gelijk, op een manier die precies laat zien
// waar de grens van "gegenereerd dus actueel" ligt: de swatches klopten (die
// komen uit de CSS), maar alles eromheen was met de hand geschreven en stond
// nog in het groene schema — de accentsectie legde uit waarom wit op groen
// 1,31:1 haalt, de knoppensectie zei "bijna-zwart op groen", de typesectie
// noemde Big Shoulders Display en Archivo, en de voettekst zei "palet: toxic
// green". Drie lettertypen en een heel palet verder was daar niets meer van
// waar.
//
// Wat daarom veranderd is: elke bewering die een KLEURWAARDE of een LETTERNAAM
// noemt, leest die nu uit de tokens in plaats van hem uit te spellen. De
// lettertypen komen uit --font-heading/-body/-mono zelf, het accent uit
// --accent, en de contrastgetallen worden gerekend en niet onthouden. Wat
// overblijft aan handgeschreven tekst gaat over de BEDOELING (waarom vier
// inkstappen, waarom één kaartvorm) en die verandert niet mee met een palet.
//
// Draaien: npm run styleguide → visuails-styleguide.html
import { readFileSync, writeFileSync } from 'node:fs';
/* De proefzin onder elke letter is de echte kop van de site. Hier stond "Jij
   uploadt. Wij leveren de campagne." — een kop die op 20 september 2026 is
   vervangen omdat "campagne" één project betekent en de dienst doorlopend is
   (zie de noot bij TAGLINE). Een styleguide die een afgeschafte kop laat zien
   als voorbeeld van de merkstem, is precies het soort veroudering dat dit
   bestand hoort te voorkomen. */
import { TAGLINE } from '../src/data/brand.js';

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
/* Relatieve luminantie van een #rrggbb; null als het geen vaste kleur is
   (rgb()-met-alpha, var(), oklch()). Twee lezers: readable() hieronder en
   ratio(), dat de contrastgetallen in de tekst rekent in plaats van ze te
   onthouden — dat is hoe "wit op dit groen is 1,31:1" kon blijven staan toen
   het groen al violet was. */
function lum(hex) {
  const m = /^#([0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(n >> 16 & 255) + 0.7152 * f(n >> 8 & 255) + 0.0722 * f(n & 255);
}

/** Contrast tussen twee TOKENNAMEN, als "4,5" — of '' als een van beide geen
 *  vaste hex oplevert. Nederlandse komma, want de tekst eromheen is
 *  Nederlands. `val()` eerst: resolve() volgt alleen een var()-keten en geeft
 *  een kale tokennaam ongemoeid terug, wat een stille lege string opleverde. */
function ratio(a, b) {
  const la = lum(resolve(val(a))); const lb = lum(resolve(val(b)));
  if (la === null || lb === null) return '';
  const r = (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  return (Math.round(r * 100) / 100).toString().replace('.', ',');
}

/** De eerste familienaam uit een font-stack, zonder aanhalingstekens. */
function fam(k) {
  return String(val(k)).split(',')[0].replace(/["']/g, '').trim() || '—';
}

function readable(hex) {
  const m = /^#([0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) return '#fff';
  const n = parseInt(m[1], 16);
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const L = 0.2126 * f(n >> 16 & 255) + 0.7152 * f(n >> 8 & 255) + 0.0722 * f(n & 255);
  return L > 0.45 ? '#08090B' : '#FFFFFF';
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* `nul()` maakt van een contrastgetal een zin-deel dat wegvalt als het getal
   er niet is (een kleur met alpha, of een oklch()). Liever geen getal dan een
   getal dat "(:1)" leest. */
const nul = (r) => (r ? ` (${r}:1)` : '');

const GROUPS = [
  { h: 'Ground', why: 'Vier lagen, van de paginabodem tot een tegel op een tegel. Alles daarboven is ink of line.',
    keys: ['--bg-0', '--bg-raise', '--surface', '--surface-2'] },
  { h: 'Ink', why: 'Vier stappen wit, en niet meer. Alle vier halen 4,5:1 op de donkerste ondergrond — dat is precies waarom er bij vier wordt gestopt.',
    keys: ['--ink-1', '--ink-2', '--ink-3', '--ink-4'] },
  { h: 'Lines', why: 'Drie gewichten: een scheiding, een rand die je moet zien, en de omtrek van een bedienbaar ding.',
    keys: ['--line', '--line-strong', '--line-ui'] },
  { h: 'Accent', why: `Eén kleur, en alleen voor ACTIE — nooit voor een status. Als vulling draagt hij de letter uit --accent-on${nul(ratio('--accent', '--accent-on'))}; als letter op papier gebruikt de site --accent-text${nul(ratio('--accent-text', '--bg-0'))}, want het accent zelf haalt daar${nul(ratio('--accent', '--bg-0'))} — genoeg voor een kop, niet voor een regel van 17 px.`,
    keys: ['--accent', '--accent-dim', '--accent-on', '--accent-text', '--accent-soft'] },
  { h: 'Status', why: 'De vijf standen van een bestelling. Het gelukte pad loopt voller binnen de accentfamilie — alleen omlijning, dan getint, dan massief. De twee uitzonderingen verlaten de familie en blijven altijd getint: revisie in oranje, geannuleerd in rood.',
    keys: ['--st-wait-fill', '--st-work-fill', '--st-done-fill', '--st-rev-fill', '--st-can-fill'] },
  { h: 'Signal', why: 'Eén waarschuwingskleur naast het accent, plus de focusring. Klei en geen rood: rood is in de statusset al bezet door "geannuleerd".',
    keys: ['--clay', '--warn', '--verify', '--focus-ring'] },
  { h: 'Radius', why: '', keys: ['--r-sm', '--r-md', '--r-lg', '--r-pill'] },
  { h: 'Motion', why: 'Vier duren en twee curves. State, element, sectie, en het lange geval.',
    keys: ['--dur-1', '--dur-2', '--dur-3', '--dur-4', '--ease-out-quint', '--ease-out-expo'] },
];

/* De namen worden NIET meer uitgespeld: fam() leest ze uit de token zelf.
   Wat hier staat is waar een familie voor dient, en dat blijft gelden als
   Lucas morgen een andere snit kiest. */
const TYPE = [
  ['--font-heading', 'De koppen. Op font-stretch 125 % en in kapitalen — dat is het gezicht van de site.'],
  ['--font-body', 'Leestekst, labels in de formulieren, alles wat je echt leest.'],
  ['--font-mono', 'Etiketten, maten, referenties en de knoplabels. Op font-stretch 82 %, anders loopt een ordernummer uit zijn cel.'],
  ['--font-merk', 'De merknaam in een labelregel, op de breedste stand.'],
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
<link href="https://fonts.googleapis.com/css2?family=Anybody:wdth,wght@50..150,100..900&family=Figtree:wght@300..900&family=Martian+Mono:wdth,wght@75..112.5,100..800&display=swap" rel="stylesheet">
<style>/* De koppen staan op de brede stand en de mono op de smalle, precies zoals
         --stretch-kop en --stretch-mono in global.css ze zetten. */
h1,h2{font-stretch:125%}code,.v,.name{font-stretch:82%}</style>
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
.b-p{background:var(--accent);color:var(--accent-on)}
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
<p class="meta">Gegenereerd door <code>scripts/make-styleguide.mjs</code> · ${TOKENS.length} tokens · grond <code>${esc(resolve(val('--bg-0')))}</code> · inkt <code>${esc(resolve(val('--ink-1')))}</code> · accent <code>${esc(resolve(val('--accent')))}</code></p>

${GROUPS.map((g) => `<section>
  <h2>${esc(g.h)}</h2>
  ${g.why ? `<p class="why">${esc(g.why)}</p>` : ''}
  <div class="grid">${g.keys.map(swatch).join('')}</div>
</section>`).join('')}

<section>
  <h2>Type</h2>
  <p class="why">Vier rollen, drie families. De koppen staan breed en in kapitalen, de leestekst smal en in onderkast — dat verschil is het hele typografische idee.</p>
  ${TYPE.map(([k, why]) => `<div class="type-row">
    <div class="name">${esc(k)} — ${esc(fam(k))}</div>
    <div style="font-family:${esc(val(k))};font-size:2.1rem;line-height:1.1">${esc(TAGLINE.nl.plain)}</div>
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
  <p class="why">Drie, en niet meer. De primaire is de accentvulling met <code>--accent-on</code> erop${nul(ratio('--accent', '--accent-on'))}; de andere twee zijn inkt op papier en inkt op een lijn.</p>
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
  <p class="why">De volledige <code>:root</code>, in de volgorde waarin global.css hem definieert. De aliassen staan erbij: een aantal namen uit oudere paletten (harbor, toxic green) resolven nog, omdat studio.css en admin.css ze nog gebruiken.</p>
  <table><thead><tr><th>Token</th><th>Waarde</th><th>Resolved</th></tr></thead><tbody>
  ${TOKENS.map(([k, v]) => { const r = resolve(v); return `<tr><td><code>${esc(k)}</code></td><td class="v">${esc(v.length > 90 ? v.slice(0, 90) + '…' : v)}</td><td class="v">${esc(r === v ? '' : (r.length > 40 ? r.slice(0, 40) + '…' : r))}</td></tr>`; }).join('')}
  </tbody></table>
</section>

<p class="foot">VISUAILS · KVK 99742993 · Deze pagina is gegenereerd, niet geschreven. Wijzig een kleur in <code>src/styles/global.css</code> en draai <code>npm run styleguide</code> opnieuw.</p>
</div></body></html>`;

writeFileSync('visuails-styleguide.html', html);
console.log(`visuails-styleguide.html — ${TOKENS.length} tokens, accent ${val('--accent')}`);
