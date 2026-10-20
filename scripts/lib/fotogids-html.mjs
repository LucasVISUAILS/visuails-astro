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
 * tekst minstens 4,5:1 op zijn ondergrond.
 *
 * DE HAL-STIJL — 15 oktober 2026. Lucas om 12:32: *"Visuails upload guidelines
 * moet nog aangepast worden naar de nieuwe style."* Dus niet meer de zwarte balk,
 * hoofdletters en monospace van september, maar wat de site nu is (src/styles/
 * hal.css): Urbanist, inkt #0F0C24, violet #4A1FFF, een lila pil met een stip,
 * zachte vlakken (nevel #F5F5F9, mist #F1EEFF) met ronde hoeken, en de kop in
 * twee tonen. Het woordmerk komt uit src/data/woordmerk.js, als vector en
 * onveranderd (net als op de factuur). Het lichte deel van de kop is hier
 * #6A6880 en niet het #807E97 van de site: op papier geldt 4,5:1 voor élke tekst,
 * en #807E97 haalt op wit 3,9:1. De kleuren zijn een handkopie van hal.css — een
 * pdf kent de CSS-variabelen van de site niet.
 *
 * SCHEMA A (levering 62, 19 oktober 2026, afvinklijst 41): inkt puur zwart, grijs
 * zonder lila. Violet staat alleen op de site (de voet, het €1-blok, Bestellen, wat je
 * kiest), dus in de gids nergens: de stip, de pil "nodig", de aanwijzers in de
 * tekening en het vlak met de vijf vragen zijn zwart (--violet heet nog zo, zodat de
 * regels hieronder niet veranderen). Het lichte deel van de kop blijft inkt 3, #616161.
 */
import { createHash } from 'node:crypto';
import { fotogids } from '../../src/data/fotogids.js';
import { WHATSAPP_DISPLAY } from '../../src/data/whatsapp.js';
import { WOORDMERK } from '../../src/data/woordmerk.js';

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

/* Het woordmerk, letterlijk uit src/data/woordmerk.js. Nooit natekenen — alleen de
   kleur mag anders zijn. De verschuiving staat in een <g> en niet in de viewBox:
   zie de kop van woordmerk.js. */
const MERK = `<svg class="woordmerk" viewBox="0 0 ${WOORDMERK.breed} ${WOORDMERK.hoog}" role="img" aria-label="VISUAILS">
  <g transform="translate(0 ${(WOORDMERK.hoog * (1 - WOORDMERK.onder)).toFixed(2)})"><path fill-rule="evenodd" d="${WOORDMERK.d}" /></g>
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
  --inkt: #000000; --inkt-2: #3D3D3D; --inkt-3: #616161; --violet: #000000; --violet-diep: #3D3D3D; /* schema A: zie de kop */
  --mist: #F2F2F2; --nevel: #F2F2F2; --lijn: #DDDDDD; --wit: #FFFFFF;
  --letter: "Urbanist Variable", system-ui, sans-serif;
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  font-family: var(--letter); color: var(--inkt); background: var(--wit);
  font-size: 9.6pt; line-height: 1.45; -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.blad { width: 210mm; height: 297mm; position: relative; overflow: hidden; }
.binnen { padding: 0 14mm; }

/* ── DE KOP: woordmerk links, de pil rechts ───────────────────────────────── */
.balk { display: flex; align-items: center; justify-content: space-between; padding: 9mm 14mm 0; }
.woordmerk { display: block; height: 4.6mm; width: auto; fill: var(--inkt); }
.pil-kop { display: inline-flex; align-items: center; gap: 2.2mm; height: 7mm; padding: 0 3.6mm 0 2.6mm; border-radius: 99mm; background: var(--mist); font-size: 9.2pt; font-weight: 600; color: var(--inkt); }
.pil-kop::before { content: ""; width: 1.7mm; height: 1.7mm; border-radius: 50%; background: var(--violet); box-shadow: 0 0 0 .9mm var(--wit); }

h1 { font-weight: 500; font-size: 25pt; line-height: 1.04; letter-spacing: -.025em; margin: 7mm 0 0; text-wrap: balance; }
h1 .l { color: var(--inkt-3); font-weight: 400; }
h2 { font-weight: 600; font-size: 12.5pt; line-height: 1.15; letter-spacing: -.01em; margin: 0; }
p { margin: 0; }
.lead { color: var(--inkt-2); max-width: 165mm; margin-top: 3mm; font-size: 10.6pt; line-height: 1.45; }

/* ── PER PRODUCT: de vier vakken uit shots.js, op een nevelvlak ────────────── */
.vakken { margin: 5.5mm 0 0; padding: 4.4mm 5.2mm 4.8mm; background: var(--nevel); border-radius: 5mm; }
.vakken-kop { margin-bottom: 3.2mm; }
.vak-rij { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 5mm; list-style: none; margin: 0; padding: 0; }
.vak b { font-weight: 600; font-size: 10.6pt; letter-spacing: -.01em; }
.vak-kop { display: flex; align-items: center; justify-content: space-between; gap: 2mm; margin-bottom: 1.8mm; }
.pil { display: inline-flex; align-items: center; height: 5.4mm; font-size: 8.8pt; font-weight: 600; letter-spacing: .01em; padding: 0 2.4mm; border-radius: 99mm; white-space: nowrap; }
.pil-nodig { background: var(--violet); color: var(--wit); }
.pil-los { background: var(--wit); color: var(--inkt-2); box-shadow: inset 0 0 0 .3mm var(--lijn); }
.vak p { font-size: 9.2pt; line-height: 1.42; color: var(--inkt-2); }
.vak p + p { margin-top: 1.2mm; color: var(--inkt); }

/* ── DE VIER BLOKKEN: witte kaarten met een zachte rand ────────────────────── */
.blokken { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; margin-top: 4.5mm; }
.blok { border-radius: 5mm; box-shadow: inset 0 0 0 .3mm var(--lijn); padding: 4.2mm 4.6mm 4.4mm; display: grid; grid-template-columns: 25mm minmax(0, 1fr); gap: 4.2mm; align-items: start; }
.blok-beeld { margin: 0; display: grid; gap: 1.6mm; }
.blok-beeld img { display: block; width: 25mm; height: 33mm; object-fit: cover; border-radius: 3mm; }
.blok-beeld figcaption { font-size: 8.8pt; color: var(--inkt-3); line-height: 1.25; }
.tek { display: block; width: 25mm; height: auto; margin-top: 1mm; }
.tek path, .tek circle, .tek rect { fill: none; stroke-linecap: round; stroke-linejoin: round; }
.tek .stuk { stroke: var(--inkt); stroke-width: 2.2; }
.tek .fijn, .tek .fijn path, .tek .fijn rect { stroke: var(--lijn); stroke-width: 1.6; }
.tek .aanwijs, .tek .aanwijs path, .tek .aanwijs circle { stroke: var(--violet); stroke-width: 2.2; }
.tek .schaduw { fill: var(--lijn); stroke: none; }
.blok-kop { display: flex; align-items: center; gap: 2.6mm; margin-bottom: 2.4mm; }
.blok-nr { display: inline-grid; place-items: center; min-width: 7.4mm; height: 5.6mm; padding: 0 1.6mm; border-radius: 99mm; background: var(--mist); font-size: 9pt; font-weight: 600; font-variant-numeric: tabular-nums; color: var(--violet-diep); }
.blok ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 1.4mm; }
.blok li { display: grid; grid-template-columns: 3mm minmax(0, 1fr); gap: 1.4mm; font-size: 9.6pt; line-height: 1.42; color: var(--inkt-2); }
.blok li::before { content: ""; width: 1.5mm; height: 1.5mm; border-radius: 50%; background: var(--violet); margin-top: 1.65mm; }

/* ── DE VIJF VRAGEN: het violette vlak, zoals de oproep op de site ─────────── */
.vragen { margin-top: 4.5mm; background: var(--violet); color: var(--wit); border-radius: 5mm; padding: 4.4mm 5.2mm 4.8mm; }
.vragen h2 { color: var(--wit); margin-bottom: 3mm; }
.vragen ol { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 3.4mm; }
.vragen li { display: grid; grid-template-columns: 4.4mm minmax(0, 1fr); gap: 2mm; align-items: start; font-size: 10pt; line-height: 1.32; font-weight: 600; }
.vakje { width: 4.4mm; height: 4.4mm; border: .45mm solid var(--wit); border-radius: 1.2mm; margin-top: .2mm; }

/* ── DE VOET ───────────────────────────────────────────────────────────────── */
.contact { position: absolute; left: 14mm; right: 14mm; bottom: 15mm; display: flex; flex-wrap: wrap; gap: 1mm 4mm; align-items: baseline; font-size: 9.6pt; color: var(--inkt-2); }
.contact span { font-weight: 600; color: var(--inkt); }
.voet { position: absolute; left: 14mm; right: 14mm; bottom: 7mm; display: flex; justify-content: space-between; align-items: baseline; padding-top: 2.6mm; border-top: .3mm solid var(--lijn); }
.voet span { font-size: 8.8pt; letter-spacing: .02em; color: var(--inkt-3); }
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
        <div class="vak-kop"><b>${esc(x.naam)}</b><span class="pil ${x.nodig ? 'pil-nodig' : 'pil-los'}">${esc(x.label)}</span></div>
        <p>${esc(x.regel)}</p>${x.zonder ? `
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
      ${MERK}
      <span class="pil-kop">${esc(g.etiket)}</span>
    </header>
    <div class="binnen">
      <h1><span class="l">${esc(g.titel[0])}</span>${esc(g.titel[1])}</h1>
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
