/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE LETTERS VOOR DE PAGINA'S DIE DE SITEBUNDEL NIET LADEN
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * VISUAILS Studio (/account), het klantportaal (/o) en /admin zijn door de Worker
 * gerenderde HTML met één eigen stylesheet uit public/ — ze laden Layout.astro
 * niet, dus ook niet de @font-face-regels die Vite uit @fontsource bundelt. Tot
 * 5 september 2026 stond daar `--font: "Archivo Variable"` zonder dat er ooit
 * een Archivo geladen werd: elke klant zag Segoe UI of Helvetica. Dat is precies
 * twee keer gebeurd: tot 7 september noemden de drie stylesheets Hubot Sans,
 * Satoshi en Sometype Mono, terwijl dit script Anybody, Instrument Sans en
 * Martian Mono kopieerde. Weer Arial dus, en weer onzichtbaar.
 *
 * DE LES STAAT IN DE VOLGORDE. Dit script is de enige waarheid over WELKE letter
 * er ligt; public/admin.css, public/account.css en public/portal.css mogen alleen
 * namen uit BESTANDEN hieronder noemen. Wie hier een familie wisselt, wisselt hem
 * daar mee — anders valt het stil terug op Arial en ziet niemand het.
 *
 * WAT DIT DOET. Na de build kopieert het de woff2-bestanden uit node_modules
 * naar dist/fonts/gedeeld/ en schrijft het dist/fonts/gedeeld.css met de
 * @font-face-regels. De drie HTML-sjablonen linken dat bestand.
 *
 * WAAROM NIET GEWOON IN public/. Dan staan er binaire lettertypen in de repo die
 * ook al in node_modules staan, en de versie in public/ veroudert stil bij een
 * `npm update`. De bron is @fontsource; dit script is de enige kopie-stap.
 *
 * CSP. De drie pagina's zetten `font-src 'self'` en `style-src 'self'`; een
 * stylesheet en woff2's van de eigen oorsprong passen daar precies in.
 *
 * `astro dev` draait deze hook niet — in dev vallen die drie pagina's terug op
 * de systeemletter. Dat is zichtbaar en onschuldig.
 */
import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/* Sectie 22, 7 september 2026: Hubot Sans en Sometype Mono eruit, de drie
   nieuwe families erin — Anybody (kop), Instrument Sans (tekst), Martian Mono
   (labels). Alle drie variabel mét breedte-as, dus één bestand per snit. */
const BESTANDEN = [
  ['@fontsource-variable/anybody/files/anybody-latin-standard-normal.woff2', 'anybody-latin-standard-normal.woff2'],
  ['@fontsource-variable/anybody/files/anybody-latin-standard-italic.woff2', 'anybody-latin-standard-italic.woff2'],
  ['@fontsource-variable/instrument-sans/files/instrument-sans-latin-standard-normal.woff2', 'instrument-sans-latin-standard-normal.woff2'],
  ['@fontsource-variable/instrument-sans/files/instrument-sans-latin-standard-italic.woff2', 'instrument-sans-latin-standard-italic.woff2'],
  ['@fontsource-variable/martian-mono/files/martian-mono-latin-standard-normal.woff2', 'martian-mono-latin-standard-normal.woff2'],
];

export function fontFaces() {
  const regels = [
    '/* Gegenereerd door scripts/fonts-voor-worker.mjs bij de build — niet met de hand bewerken. */',
    '@font-face { font-family: "Anybody Variable"; font-style: normal; font-weight: 100 900; font-stretch: 50% 150%; font-display: swap; src: url("/fonts/gedeeld/anybody-latin-standard-normal.woff2") format("woff2"); unicode-range: U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD; }',
    '@font-face { font-family: "Anybody Variable"; font-style: italic; font-weight: 100 900; font-stretch: 50% 150%; font-display: swap; src: url("/fonts/gedeeld/anybody-latin-standard-italic.woff2") format("woff2"); unicode-range: U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD; }',
    '@font-face { font-family: "Instrument Sans Variable"; font-style: normal; font-weight: 400 700; font-stretch: 75% 100%; font-display: swap; src: url("/fonts/gedeeld/instrument-sans-latin-standard-normal.woff2") format("woff2"); unicode-range: U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD; }',
    '@font-face { font-family: "Instrument Sans Variable"; font-style: italic; font-weight: 400 700; font-stretch: 75% 100%; font-display: swap; src: url("/fonts/gedeeld/instrument-sans-latin-standard-italic.woff2") format("woff2"); unicode-range: U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD; }',
    '@font-face { font-family: "Martian Mono Variable"; font-style: normal; font-weight: 100 800; font-stretch: 75% 112.5%; font-display: swap; src: url("/fonts/gedeeld/martian-mono-latin-standard-normal.woff2") format("woff2"); unicode-range: U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD; }',
  ];
  return regels.join('\n') + '\n';
}

export default function fontsVoorWorker() {
  return {
    name: 'visuails:fonts-voor-worker',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const uit = fileURLToPath(dir);
        const map = join(uit, 'fonts', 'gedeeld');
        await mkdir(map, { recursive: true });
        for (const [pakket, naam] of BESTANDEN) {
          await copyFile(require.resolve(pakket), join(map, naam));
        }
        await writeFile(join(uit, 'fonts', 'gedeeld.css'), fontFaces());
        logger.info(`fonts: ${BESTANDEN.length} woff2 naar /fonts/gedeeld/ en gedeeld.css`);
      },
    },
  };
}
