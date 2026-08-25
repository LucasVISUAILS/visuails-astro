/*
 * VISUAILS — de korrel meten in plaats van hem te schatten.  npm run korrelmeting
 *
 * De grondkorrel (`body::before`) is sinds augustus 2026 drie keer omlaag gezet,
 * en elke keer werd de meting van de vorige keer met de hand nagebouwd. Vandaar
 * dit script: de meetlat hoort in de repo te staan, niet alleen de uitkomst in
 * een commentaar.
 *
 * WAT ER GEMETEN WORDT. Een vlak #090909-veld — de donkerste grond van de site —
 * met de twee korrellagen erover, en dan over elke pixel het gemiddelde (hoeveel
 * het zwart wordt opgetild) en de standaardafwijking (hoe grof de spikkel is).
 * Die twee samen zijn wat iemand "te veel korrel" noemt: de lift maakt zwart
 * grijs, de spreiding maakt het korrelig.
 *
 * DE OPSTELLING MOET DIE VAN DE SITE ZIJN, en dat is niet vanzelfsprekend — zie
 * de noot bij pagina() hieronder. De eerste versie mat alleen de overlay en gaf
 * voor vier verschillende instellingen exact hetzelfde getal, zonder dat er iets
 * fout leek te gaan.
 *
 * De absolute getallen hieruit zijn NIET vergelijkbaar met de reeksen in de
 * noten van augustus: die zijn met een andere opstelling gemaakt. Binnen één
 * draai van dit script zijn ze dat wel, en dat is waar een voor/na-vergelijking
 * op steunt.
 *
 * Meet de korrel zoals de noten in global.css hem meten: een vlak #090909-veld,
   de twee lagen erover, en dan de gemiddelde lift en de spreiding van de
   pixelwaarden. Zelfde methode als 19 augustus, zodat de getallen vergelijkbaar
   zijn met wat er in het bestand staat. */
import { chromium } from 'playwright';
import { PNG } from 'pngjs';

const KORREL = (o) => `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.1' numOctaves='1' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='${o}'/%3E%3C/svg%3E") 0 0 / 170px repeat`;

/* DE STRUCTUUR MOET DIE VAN DE SITE ZIJN. Eerste poging zette de grondlaag op
   een <div> met z-index:-1 en die schilderde niet: body droeg zelf een
   achtergrondkleur, dus de laag viel erachter. Dat is exact wat de noot bij
   body::before uitlegt — hij werkt alleen omdat html geen eigen achtergrond
   heeft en body's kleur naar het canvas gaat. Alle vier de varianten gaven
   daardoor hetzelfde getal, wat de meting waardeloos maakte zonder dat er iets
   fout leek te gaan. */
function pagina({ grond, overlay }) {
  return `<!doctype html><html><head><style>
  html { background: none; }
  body { margin: 0; background: #090909; min-height: 100vh; }
  ${grond > 0 ? `body::before {
    content: ''; position: fixed; inset: 0; z-index: -1; pointer-events: none;
    background: ${KORREL(grond)};
  }` : ''}
  .ov { position: fixed; inset: 0; z-index: 300; pointer-events: none; opacity: ${overlay};
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.1' numOctaves='1' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    background-size: 170px; }
  </style></head><body>${overlay > 0 ? '<div class="ov"></div>' : ''}</body></html>`;
}

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 400, height: 400 } });

async function meet(opzet) {
  await p.setContent(pagina(opzet));
  await p.waitForTimeout(150);
  const png = PNG.sync.read(await p.screenshot({ type: 'png' }));
  const w = [];
  for (let i = 0; i < png.data.length; i += 4) w.push(png.data[i]);
  const gem = w.reduce((a, x) => a + x, 0) / w.length;
  const sd = Math.sqrt(w.reduce((a, x) => a + (x - gem) ** 2, 0) / w.length);
  return { zwart: +gem.toFixed(2), lift: +(gem - 9).toFixed(2), spreiding: +sd.toFixed(2) };
}

console.log('                                zwart   lift   spreiding');
for (const [naam, opzet] of [
  ['kaal #090909',              { grond: 0,    overlay: 0 }],
  ['NU      grond .04 + .03',   { grond: 0.04, overlay: 0.03 }],
  ['vorige  grond .05 + .03',   { grond: 0.05, overlay: 0.03 }],
  ['omlaag  grond .035 + .03',  { grond: 0.035, overlay: 0.03 }],
  ['bodem   grond .03 + .03',   { grond: 0.03, overlay: 0.03 }],
  ['alleen de grond .04',       { grond: 0.04, overlay: 0 }],
  ['alleen de overlay .03',     { grond: 0, overlay: 0.03 }],
]) {
  const m = await meet(opzet);
  console.log(naam.padEnd(30) + String(m.zwart).padStart(6) + String(m.lift).padStart(7) + String(m.spreiding).padStart(11));
}
await b.close();
