/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * HET A4 VAN DE FOTOGIDS — als HTML, klaar voor Chromium
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 8 oktober 2026 (punt 5.07). Lucas koos één A4 "om naast je kast te hangen",
 * in vier blokken (licht, ondergrond, kader, close-up) met onderaan vijf korte
 * vragen. De woorden komen uit src/data/fotogids.js — dezelfde bron als
 * /upload-guidelines en de checklistmail — en dit bestand zet ze alleen op
 * papier.
 *
 * WAAROM APART VAN scripts/handleiding.mjs. Dat script start Chromium en
 * schrijft de pdf. Dit deel is pure tekst-naar-HTML, zodat tests/fotogids.test.mjs
 * kan nagaan wat er op het blad staat zonder een browser te starten, en zodat de
 * vingerafdruk (zie onderaan) in de test en in het script op dezelfde manier
 * berekend wordt.
 *
 * DE TOON BLIJFT DIE VAN 7 SEPTEMBER. Lucas: *"Ik wil niet dat klanten denken dat
 * ze niet goed genoeg hun best hebben gedaan met foto's maken dus frame het als
 * een soort handleiding met tips."* Dit vel gaat ook mee als er een foto
 * ontbreekt. Daarom staat er geen "zo niet", geen rood en geen kruisje: vier
 * blokken met wat werkt, en vijf vragen om zelf na te lopen.
 *
 * LEESBAARHEID: geen letter onder 8,7 pt (11,6 px bij 100 %), contrast van elke
 * tekst minstens 4,5:1 op zijn ondergrond. De kleuren zijn een handkopie van
 * KLEURENSCHEMA.md, net als in src/lib/mailTemplate.js — een pdf kent geen
 * CSS-variabelen uit global.css.
 */
import { createHash } from 'node:crypto';
import { fotogids } from '../../src/data/fotogids.js';
import { WHATSAPP_DISPLAY } from '../../src/data/whatsapp.js';

export const BESTAND = { nl: 'visuails-fotogids-nl.pdf', en: 'visuails-fotogids-en.pdf' };

/* Wat alleen op het vel staat en niet op de pagina of in de mail: de regel om
   contact op te nemen (op papier is er geen knop) en de voet. */
const VEL = {
  nl: {
    contact: 'Twijfel je over een foto? Stuur hem vooruit:',
    wa: `WhatsApp ${WHATSAPP_DISPLAY}`,
    mail: 'hello@visuails.com',
    web: 'visuails.com/nl/upload-guidelines',
    voet: 'VISUAILS · Enschede, Nederland',
    echt: 'Zo ingestuurd',
  },
  en: {
    contact: 'Unsure about a photo? Send it ahead:',
    wa: `WhatsApp ${WHATSAPP_DISPLAY}`,
    mail: 'hello@visuails.com',
    web: 'visuails.com/upload-guidelines',
    voet: 'VISUAILS · Enschede, the Netherlands',
    echt: 'Sent in like this',
  },
};

/* Het merk, letterlijk het pad uit de <symbol id="markglyph"> in Layout.astro.
   Nooit natekenen — alleen de kleur mag anders zijn. */
const MERK = `<svg class="merk" viewBox="0 0 702.00 813.25" aria-hidden="true">
  <path d="M 0.0 16.0 L 144.25 266.75 L 463.25 813.25 L 662.75 354.75 L 619.25 408.25 L 515.5 546.25 L 264.5 119.0 A 201.21 201.21 0 0 0 101.0 15.75 L 0.0 16.0 Z" />
  <path d="M 701.75 0.0 L 543.25 366.25 L 507.25 453.75 L 652.0 259.25 L 702.0 338.25 L 701.75 0.0 Z" />
</svg>`;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ── DE TWEE TEKENINGEN ────────────────────────────────────────────────────────
   Overgenomen uit de vorige gids (7 september): één kledingstuk, één kader, en
   precies één violet element dat aanwijst waar het om gaat. Alleen de twee die
   nog kloppen bij de nieuwe tekst: het raam (licht) en de hoeken met ruimte om
   het stuk (kader). De oude kadertekening met pijlen naar binnen ("vul het
   kader") is weg: de regel is nu "met wat ruimte eromheen". */
const TEE = 'M48 16 L33 23 L24 36 L35 43 L42 33 L42 78 L78 78 L78 33 L85 43 L96 36 L87 23 L72 16 C68 24 52 24 48 16 Z';
const tekening = (inhoud) => `<svg class="tek" viewBox="0 0 120 92" aria-hidden="true">${inhoud}</svg>`;
const TEKENINGEN = {
  licht: tekening(`
    <g class="fijn"><rect x="6" y="14" width="26" height="42" rx="2" /><path d="M19 14 L19 56 M6 35 L32 35" /></g>
    <g class="aanwijs">
      <path d="M36 26 L58 34 M36 36 L58 42 M36 46 L58 50" />
      <path d="M58 34 L51 33 M58 34 L53 39" /><path d="M58 42 L51 42 M58 42 L52 46" /><path d="M58 50 L51 50 M58 50 L53 54" />
    </g>
    <path class="stuk klein" d="M78 34 L70 38 L65 45 L71 49 L75 44 L75 68 L93 68 L93 44 L97 49 L103 45 L98 38 L90 34 C88 38 80 38 78 34 Z" />
    <path class="fijn" d="M62 72 L114 72" />
    <path class="schaduw" d="M95 70 L112 70 L108 74 L93 74 Z" />`),
  kader: tekening(`
    <path class="stuk" d="${TEE}" />
    <path class="fijn" d="M60 26 L60 78" />
    <g class="aanwijs">
      <path d="M14 20 L14 10 L24 10" /><path d="M96 10 L106 10 L106 20" />
      <path d="M106 72 L106 82 L96 82" /><path d="M24 82 L14 82 L14 72" />
    </g>`),
};

/* Welke echte telefoonfoto bij welk blok staat — de roze broek uit de
   voorbeeldset (public/img/ba2-voor-*). Plat op een lege vloer bij de
   ondergrond, de knoop van dichtbij bij de close-up. Ontbreekt een bestand,
   dan staat de tekening of niets; nooit een grijs vlak. */
export const BEELD_BIJ_BLOK = { ondergrond: 'ba2-voor-front', closeup: 'ba2-voor-detail' };

function css(fonts) {
  return `
${fonts}
:root {
  --inkt: #000000; --inkt-2: rgba(0,0,0,.70); --vel: #F2F3F5; --wit: #FFFFFF;
  --geel: #4A1FFF; --op-geel: #FFFFFF; --gloed: #3D17D6;
  --lijn: rgba(0,0,0,.20); --lijn-sterk: rgba(0,0,0,.34);
  --kop: "Anybody Variable", system-ui, sans-serif;
  --tekst: "Figtree Variable", system-ui, sans-serif;
  --mono: "Martian Mono Variable", ui-monospace, monospace;
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  font-family: var(--tekst); color: var(--inkt); background: var(--wit);
  font-size: 9.5pt; line-height: 1.42; -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.blad { width: 210mm; height: 297mm; position: relative; overflow: hidden; }
.binnen { padding: 0 14mm; }

.balk { background: var(--inkt); color: var(--vel); padding: 5.5mm 14mm; display: flex; align-items: center; justify-content: space-between; }
.balk-merk { display: flex; align-items: center; gap: 3mm; }
.merk { width: 6mm; height: 7mm; fill: var(--vel); }
.woord { font-family: var(--kop); font-weight: 500; font-stretch: 125%; font-size: 12.5pt; letter-spacing: .02em; text-transform: uppercase; }
.etiket { font-family: var(--mono); font-size: 8.7pt; font-stretch: 82%; letter-spacing: .08em; text-transform: uppercase; }
.balk .etiket { color: rgba(242,243,245,.80); }

h1 { font-family: var(--kop); font-weight: 500; font-stretch: 125%; font-size: 21pt; line-height: 1.04; letter-spacing: -.02em; text-transform: uppercase; margin: 6.5mm 0 0; }
h1 em { font-style: normal; color: var(--op-geel); background: linear-gradient(var(--geel), var(--geel)) no-repeat 0 .06em / 100% .84em; padding-inline: .04em; }
h2 { font-family: var(--kop); font-weight: 500; font-stretch: 125%; font-size: 12.5pt; line-height: 1.1; letter-spacing: -.01em; text-transform: uppercase; margin: 0; }
p { margin: 0; }
.lead { color: var(--inkt-2); max-width: 175mm; margin-top: 2.6mm; font-size: 10pt; }

/* ── PER PRODUCT: de vier vakken uit shots.js ──────────────────────────────── */
.vakken { margin: 6.5mm 0 0; padding: 3.2mm 0 0; border-top: .35mm solid var(--lijn); }
.vakken-kop { display: flex; align-items: baseline; gap: 4mm; margin-bottom: 2.4mm; }
.vakken-kop .etiket { color: var(--inkt-2); }
.vak-rij { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 4mm; list-style: none; margin: 0; padding: 0; }
.vak b { font-family: var(--kop); font-weight: 500; font-stretch: 125%; font-size: 10pt; text-transform: uppercase; letter-spacing: -.01em; }
.vak-kop { margin-bottom: 1.2mm; }
.pil { display: inline-block; font-family: var(--mono); font-size: 8.7pt; font-stretch: 82%; letter-spacing: .03em; text-transform: uppercase; padding: 0 1.6mm; margin-right: 1.4mm; border-radius: 99mm; white-space: nowrap; line-height: 1.45; }
.pil-nodig { background: var(--geel); color: var(--op-geel); }
.pil-los { border: .3mm solid var(--lijn-sterk); color: var(--inkt-2); }
.vak p { font-size: 9pt; line-height: 1.38; color: var(--inkt-2); }
.vak p + p { margin-top: 1mm; color: var(--inkt); }

/* ── DE VIER BLOKKEN ───────────────────────────────────────────────────────── */
.blokken { display: grid; grid-template-columns: 1fr 1fr; gap: 4.5mm; margin-top: 6.5mm; }
.blok { border: .35mm solid var(--lijn); border-radius: 3mm; padding: 3.8mm 4.2mm 4mm; display: grid; grid-template-columns: 25mm minmax(0, 1fr); gap: 3.8mm; align-items: start; }
.blok-beeld { margin: 0; display: grid; gap: 1.2mm; }
.blok-beeld img { display: block; width: 25mm; height: 33mm; object-fit: cover; border-radius: 1.6mm; }
.blok-beeld figcaption { font-family: var(--mono); font-size: 8.7pt; font-stretch: 75%; letter-spacing: 0; color: var(--inkt-2); line-height: 1.25; }
.tek { display: block; width: 25mm; height: auto; margin-top: 1mm; }
.tek path, .tek circle, .tek rect { fill: none; stroke-linecap: round; stroke-linejoin: round; }
.tek .stuk { stroke: var(--inkt); stroke-width: 2.2; }
.tek .fijn, .tek .fijn path, .tek .fijn rect { stroke: var(--lijn-sterk); stroke-width: 1.3; }
.tek .aanwijs, .tek .aanwijs path, .tek .aanwijs circle { stroke: var(--gloed); stroke-width: 2.2; }
.tek .schaduw { fill: var(--lijn); stroke: none; }
.blok-kop { display: flex; align-items: baseline; gap: 2.5mm; margin-bottom: 2mm; }
.blok-nr { font-family: var(--mono); font-size: 8.7pt; font-stretch: 82%; color: var(--gloed); letter-spacing: .04em; }
.blok ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 1.5mm; }
.blok li { display: grid; grid-template-columns: 3mm minmax(0, 1fr); gap: 1.6mm; font-size: 9.5pt; line-height: 1.38; }
.blok li::before { content: ""; width: 1.6mm; height: 1.6mm; border-radius: 50%; background: var(--gloed); margin-top: 1.55mm; }

/* ── DE VIJF VRAGEN ────────────────────────────────────────────────────────── */
.vragen { margin-top: 6.5mm; background: var(--geel); color: var(--op-geel); border-radius: 3mm; padding: 4.5mm 5mm 5mm; }
.vragen h2 { color: var(--op-geel); margin-bottom: 2.6mm; }
.vragen ol { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 3mm; }
.vragen li { display: grid; grid-template-columns: 4.2mm minmax(0, 1fr); gap: 2mm; align-items: start; font-size: 10pt; line-height: 1.32; font-weight: 600; }
.vakje { width: 4.2mm; height: 4.2mm; border: .45mm solid var(--op-geel); border-radius: .8mm; }

/* ── DE VOET ───────────────────────────────────────────────────────────────── */
.contact { position: absolute; left: 14mm; right: 14mm; bottom: 15mm; display: flex; flex-wrap: wrap; gap: 1mm 4mm; align-items: baseline; font-size: 9.5pt; }
.contact span { font-family: var(--mono); font-size: 8.7pt; font-stretch: 82%; letter-spacing: .03em; }
.voet { position: absolute; left: 14mm; right: 14mm; bottom: 7mm; display: flex; justify-content: space-between; align-items: baseline; padding-top: 2.4mm; border-top: .3mm solid var(--lijn); }
.voet span { font-family: var(--mono); font-size: 8.7pt; font-stretch: 82%; letter-spacing: .06em; text-transform: uppercase; color: var(--inkt-2); }
`;
}

/**
 * Het hele vel als HTML-document.
 *
 * @param {'nl'|'en'} lang
 * @param {{ fonts?: string, beelden?: Record<string, string|null> }} opties
 *   fonts   @font-face-regels (base64); leeg = systeemletters (voor de test)
 *   beelden per basisnaam uit BEELD_BIJ_BLOK een data-URI, of null als het
 *           bestand ontbreekt
 */
export function gidsHtml(lang, { fonts = '', beelden = {} } = {}) {
  const g = fotogids(lang);
  const v = VEL[g.taal];

  const vak = (x) => `
      <li class="vak">
        <div class="vak-kop"><b>${esc(x.naam)}</b></div>
        <p><span class="pil ${x.nodig ? 'pil-nodig' : 'pil-los'}">${esc(x.label)}</span>${esc(x.regel)}</p>${x.zonder ? `
        <p>${esc(x.zonder)}</p>` : ''}
      </li>`;

  const beeldVan = (id) => {
    const naam = BEELD_BIJ_BLOK[id];
    const src = naam ? beelden[naam] : null;
    if (src) return `<figure class="blok-beeld"><img src="${esc(src)}" alt=""><figcaption>${esc(v.echt)}</figcaption></figure>`;
    if (TEKENINGEN[id]) return `<figure class="blok-beeld">${TEKENINGEN[id]}</figure>`;
    return '<div></div>';
  };

  const blok = (b, i) => `
      <section class="blok">
        ${beeldVan(b.id)}
        <div>
          <div class="blok-kop"><span class="blok-nr">${String(i + 1).padStart(2, '0')}</span><h2>${esc(b.kop)}</h2></div>
          <ul>${b.regels.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
        </div>
      </section>`;

  return `<!doctype html><html lang="${g.taal}"><head><meta charset="utf-8">
<title>${esc(`VISUAILS — ${g.etiket}`)}</title><style>${css(fonts)}</style></head>
<body>
  <section class="blad">
    <header class="balk">
      <div class="balk-merk">${MERK}<span class="woord">VISUAILS</span></div>
      <span class="etiket">${esc(g.etiket)}</span>
    </header>
    <div class="binnen">
      <h1>${esc(g.titel[0])}<em>${esc(g.titel[1])}</em></h1>
      <p class="lead">${esc(g.intro)}</p>

      <section class="vakken">
        <div class="vakken-kop"><h2>${esc(g.vakkenKop)}</h2></div>
        <ul class="vak-rij">${g.vakken.map(vak).join('')}</ul>
      </section>

      <div class="blokken">${g.blokken.map(blok).join('')}</div>

      <section class="vragen">
        <h2>${esc(g.vragenKop)}</h2>
        <ol>${g.vragen.map((q) => `<li><span class="vakje" aria-hidden="true"></span>${esc(q)}</li>`).join('')}</ol>
      </section>
    </div>
    <p class="contact">${esc(v.contact)} <span>${esc(v.wa)}</span><span>${esc(v.mail)}</span></p>
    <div class="voet"><span>${esc(v.voet)}</span><span>${esc(v.web)}</span></div>
  </section>
</body></html>`;
}

/**
 * Uit welke versie van de bron een pdf gemaakt is: een korte hash van het vel
 * zonder letters en met vaste stand-ins voor de foto's. handleiding.mjs zet hem
 * als trefwoord in de pdf; tests/fotogids.test.mjs rekent hem opnieuw uit. Wijkt
 * hij af, dan is de tekst of de opmaak veranderd en is de pdf niet opnieuw
 * gemaakt.
 */
export function vingerafdruk(lang) {
  const stand = Object.fromEntries(Object.values(BEELD_BIJ_BLOK).map((n) => [n, `beeld:${n}`]));
  return createHash('sha256').update(gidsHtml(lang, { fonts: '', beelden: stand })).digest('hex').slice(0, 16);
}

/** Het trefwoord zoals het in de pdf staat. */
export const trefwoord = (lang) => `fotogids-${vingerafdruk(lang)}`;
