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
 *
 * LEVERING 86 · DE LETTERS EN REGELS VAN DE SITE (4 november 2026). Lucas, 01:22: *"Posters moeten ook
 * gebruik maken van de nieuwe lettertypes en ontwerp rules."* Dus het vel volgt nu de pagina
 * /upload-guidelines, onderdeel voor onderdeel: de koppen in VISUAILS Display Bold in hoofdletters (-0,01 em,
 * regelhoogte 0,92), de tekst in DM Sans, het etiket als sectielabel (de schuine streep in de snede en IBM Plex
 * Mono in hoofdletters, 20 px boven de kop); de namen van de vier blokken in DM Sans (zoals de h3 op de pagina)
 * met de rij "01 —— / 04" erboven; Nodig en Optioneel als statusplaatje (sinds levering 87 een pil, zoals op de site) en
 * geen pil met een stip meer; een vinkje uit de iconenkit in plaats van een bolletje. De hoekregel van
 * 25 oktober: kaarten 24 rondom, de twee brede vlakken 32, de foto in de hoek van zijn kaart concentrisch (8).
 * Het vlak met de vijf vragen is het ene inktblok: de Inkt-fade uit de nacht (#0F1217 tot 38 %, #172945,
 * #1A4279) langs de snede, rechtsonder zijn eigen snede op 53° (30 × 40). Ruimte: een kop en zijn zin 8 px,
 * twee alinea's 12 px, regels in een lijst 8 px uit elkaar; niets staat tegen elkaar aan.
 */
import { createHash } from 'node:crypto';
import { fotogids } from '../../src/data/fotogids.js';
import { WHATSAPP_DISPLAY } from '../../src/data/whatsapp.js';
import { WOORDMERK } from '../../src/data/woordmerk.js';
import { IKOON } from '../../src/data/iconen.js';

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
   zie de kop van woordmerk.js. Sinds levering 86 (3 november 2026, lijst 72, logo a) in de snede: de
   fade van blauw diep via blauw uur naar #2D61A8 langs de snede, in de maten van de tekening (de
   <g> zet het pad terug op zijn eigen maten, dus dezelfde coördinaten als #vs-w-snede op de site). */
const MERK = `<svg class="woordmerk" viewBox="0 0 ${WOORDMERK.breed} ${WOORDMERK.hoog}" role="img" aria-label="VISUAILS">
  <defs><linearGradient id="vs-fg-snede" gradientUnits="userSpaceOnUse" x1="0" y1="-797.25" x2="3367.43" y2="1728.32"><stop offset="0" stop-color="#1A4279"/><stop offset=".55" stop-color="#25508B"/><stop offset="1" stop-color="#2D61A8"/></linearGradient></defs>
  <g transform="translate(0 ${(WOORDMERK.hoog * (1 - WOORDMERK.onder)).toFixed(2)})"><path fill="url(#vs-fg-snede)" fill-rule="evenodd" d="${WOORDMERK.d}" /></g>
</svg>`;

/* De streep van het sectielabel (D1, levering 86): het vlagje van de V in de snede, zoals op de site. */
const STREEP = `<svg class="streep" viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="vs-fg-streep" gradientUnits="userSpaceOnUse" x1="5.98" y1="11.5" x2="14.17" y2="17.64"><stop offset="0" stop-color="#1A4279"/><stop offset=".55" stop-color="#25508B"/><stop offset="1" stop-color="#2D61A8"/></linearGradient></defs><path fill="url(#vs-fg-streep)" d="M19.75 10.2L17.05 13.8L4.25 13.8L6.95 10.2Z"/></svg>`;
/* Het vinkje uit de iconenkit (src/data/iconen.js), in de kleur van de tekst. */
const VINK = `<svg class="vink" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="${IKOON.vink}"/></svg>`;

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
  --inkt: #0F1217; --inkt-3: #636974; --lijn: #E6E8EC; --wit: #FFFFFF;
  --kop: "VISUAILS Display", "DM Sans", system-ui, sans-serif;
  --letter: "DM Sans", system-ui, sans-serif;
  --mono: "IBM Plex Mono", ui-monospace, monospace;
  --r-kaart: 24px; --r-vlak: 32px;
  --nacht: #0F1217 linear-gradient(126.87deg, #0F1217 0%, #0F1217 38%, #172945 72%, #1A4279 100%);
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  font-family: var(--letter); font-weight: 370; color: var(--inkt); background: var(--wit);
  font-size: 9.6pt; line-height: 1.45; -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.blad { width: 210mm; height: 297mm; position: relative; overflow: hidden; }
.binnen { padding: 0 12mm; }
p { margin: 0; }

/* ── DE KOP: het woordmerk, dan het sectielabel en de kop, zoals de opening van de pagina ── */
.balk { padding: 8mm 12mm 0; }
.woordmerk { display: block; height: 4.6mm; width: auto; }
.etiket { display: inline-flex; align-items: center; gap: 10px; margin-top: 6mm; font-family: var(--mono); font-weight: 600; font-size: 9pt; line-height: 1.3; letter-spacing: .1em; text-transform: uppercase; color: var(--inkt); }
.streep { width: 16px; height: 16px; flex: none; }
h1, h2 { font-family: var(--kop); font-weight: 700; text-transform: uppercase; letter-spacing: -.01em; line-height: .92; margin: 0; text-wrap: balance; }
h1 { font-size: 22pt; margin-top: 20px; }
h1 .l { color: var(--inkt-3); }
h2 { font-size: 13.5pt; }
h3 { font-family: var(--letter); margin: 0; }
.lead { max-width: 170mm; margin-top: 14px; font-size: 10.4pt; line-height: 1.45; }

/* ── PER PRODUCT: de vier vakken uit shots.js, op een breed wit vlak met een haarlijn ── */
.vakken { margin: 20px 0 0; padding: 16px 20px; border-radius: var(--r-vlak); box-shadow: inset 0 0 0 1px var(--lijn); }
.vakken h2 { margin-bottom: 10px; }
.vak-rij { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; list-style: none; margin: 0; padding: 0; }
.vak-kop { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
.vak h3 { font-weight: 600; font-size: 10.6pt; line-height: 1.2; letter-spacing: -.012em; }
.label { display: inline-flex; flex: none; align-items: center; height: 21px; padding: 0 8px; border-radius: 999px; font-weight: 600; font-size: 8.8pt; line-height: 1; white-space: nowrap; }
.label.is-nodig { background: var(--inkt); color: var(--wit); }
.label.is-los { background: var(--wit); color: var(--inkt); box-shadow: inset 0 0 0 1px var(--lijn); }
.vak p { font-size: 9pt; line-height: 1.4; }
.vak p + p { margin-top: 12px; font-weight: 600; }

/* ── DE VIER BLOKKEN: witte kaarten, 24 rondom ── */
.blokken { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 12px; }
.blok { border-radius: var(--r-kaart); box-shadow: inset 0 0 0 1px var(--lijn); padding: 14px 16px; display: grid; grid-template-columns: 22mm minmax(0, 1fr); gap: 14px; align-items: start; }
.blok-beeld { margin: 0; display: grid; gap: 8px; }
.blok-beeld img { display: block; width: 22mm; height: 28mm; object-fit: cover; border-radius: 10px; }  /* 14 en 16 van de rand: concentrisch, 24 − 14 */
.blok-beeld figcaption { font-size: 8.8pt; color: var(--inkt-3); line-height: 1.25; }
.tek { display: block; width: 22mm; height: auto; margin-top: 2px; }
.tek path, .tek circle, .tek rect { fill: none; stroke-linecap: round; stroke-linejoin: round; }
.tek .stuk { stroke: var(--inkt); stroke-width: 2.2; }
.tek .fijn, .tek .fijn path, .tek .fijn rect { stroke: var(--lijn); stroke-width: 1.6; }
.tek .aanwijs, .tek .aanwijs path, .tek .aanwijs circle { stroke: var(--inkt); stroke-width: 2.2; }
.tek .schaduw { fill: var(--lijn); stroke: none; }
.nr { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 9pt; line-height: 1; font-variant-numeric: tabular-nums; }
.nr i { width: 28px; height: 1.5px; background: var(--inkt); }
.nr span { color: var(--inkt-3); font-weight: 450; }
.blok h3 { margin-top: 8px; font-weight: 450; font-size: 12.5pt; line-height: 1.15; letter-spacing: -.015em; }
.blok ul { list-style: none; margin: 8px 0 0; padding: 0; display: grid; gap: 8px; }
.blok li { display: grid; grid-template-columns: 11px minmax(0, 1fr); gap: 8px; font-size: 9.2pt; line-height: 1.38; }
.vink { width: 11px; height: 11px; margin-top: 3px; color: var(--inkt); }

/* ── DE VIJF VRAGEN: het ene inktblok, uit de nacht, met zijn snede rechtsonder ── */
.vragen { margin-top: 12px; background: var(--nacht); color: var(--wit); border-radius: var(--r-vlak) var(--r-vlak) 0 var(--r-vlak); padding: 16px 34px 20px 20px;
  clip-path: polygon(0 0, 100% 0, 100% calc(100% - 40px), calc(100% - 30px) 100%, 0 100%); }
.vragen h2 { color: var(--wit); margin-bottom: 12px; }
.vragen ol { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; }
.vragen li { display: grid; grid-template-columns: 16px minmax(0, 1fr); gap: 8px; align-items: start; font-size: 9.8pt; line-height: 1.3; font-weight: 600; }
.vakje { width: 16px; height: 16px; border: 1.5px solid var(--wit); border-radius: 5px; margin-top: 1px; }

/* ── DE VOET: de haarlijn, dan de contactregel en het adres als één blok (de regel stond 2 px boven de lijn) ── */
.voet { position: absolute; left: 12mm; right: 12mm; bottom: 7mm; padding-top: 10px; border-top: 1px solid var(--lijn); display: grid; gap: 4px; }
.contact { display: flex; flex-wrap: wrap; gap: 4px 16px; align-items: baseline; font-size: 9.6pt; }
.contact span { font-weight: 600; }
.voet-rij { display: flex; justify-content: space-between; align-items: baseline; }
.voet-rij span { font-size: 8.8pt; color: var(--inkt-3); }
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
        <div class="vak-kop"><h3>${esc(x.naam)}</h3><span class="label ${x.nodig ? 'is-nodig' : 'is-los'}">${esc(x.label)}</span></div>
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

  const n = g.blokken.length;
  const blok = (b, i) => `
      <section class="blok">
        ${beeldVan(b.id)}
        <div>
          <p class="nr">${String(i + 1).padStart(2, '0')}<i></i><span>/ ${String(n).padStart(2, '0')}</span></p>
          <h3>${esc(b.kop)}</h3>
          <ul>${b.regels.map((r) => `<li>${VINK}<span>${esc(r)}</span></li>`).join('')}</ul>
        </div>
      </section>`;

  return `<!doctype html><html lang="${g.taal}"><head><meta charset="utf-8">
<title>${esc(`VISUAILS — ${g.etiket}`)}</title><style>${css(fonts)}</style></head>
<body>
  <section class="blad">
    <header class="balk">
      ${MERK}
    </header>
    <div class="binnen">
      <p class="etiket">${STREEP}${esc(g.etiket)}</p>
      <h1><span class="l">${esc(g.titel[0])}</span>${esc(g.titel[1])}</h1>
      <p class="lead">${esc(g.intro)}</p>

      <section class="vakken">
        <h2>${esc(g.vakkenKop)}</h2>
        <ul class="vak-rij">${g.vakken.map(vak).join('')}</ul>
      </section>

      <div class="blokken">${g.blokken.map(blok).join('')}</div>

      <section class="vragen">
        <h2>${esc(g.vragenKop)}</h2>
        <ol>${g.vragen.map((q) => `<li><span class="vakje" aria-hidden="true"></span>${esc(q)}</li>`).join('')}</ol>
      </section>
    </div>
    <footer class="voet">
      <p class="contact">${esc(v.contact)} <span>${esc(v.wa)}</span><span>${esc(v.mail)}</span></p>
      <div class="voet-rij"><span>${esc(v.voet)}</span><span>${esc(v.web)}</span></div>
    </footer>
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
