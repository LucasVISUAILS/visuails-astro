/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * EEN FOTO IN DE PAGINA ZETTEN IN PLAATS VAN EROP
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas, 22 augustus 2026: *"Zorg dat de foto's echt verwerkt zijn in de website
 * door subtiele blur en reflections te gebruiken waardoor het lijkt alsof ze er
 * horen te zijn en er niet ingeplakt zijn."*
 *
 * ── WAAROM DIT IN HET BESTAND GEBEURT EN NIET IN CSS ───────────────────────
 *
 * De helft van het antwoord hoort in CSS (de rand die wegloopt, de weerschijn
 * eronder, het licht dat op de pagina valt — zie `.foto-inbed` in global.css).
 * De ANDERE helft hoort in het beeld zelf, en dat is deze stap.
 *
 * Wat een ingeplakte foto verraadt is dat hij van rand tot rand even scherp is.
 * Geen enkele echte opname is dat: een lens heeft één scherptevlak en alles
 * daarbuiten valt weg. Een pagina met tekst eroverheen heeft datzelfde nodig,
 * maar dan om een tweede reden — tekst op een scherpe foto vecht met de foto,
 * tekst op een zachte rand ligt eróverheen.
 *
 * `filter: blur()` in CSS zou hetzelfde beeld geven en kost bij een schermbrede
 * foto elke frame GPU-tijd, op precies de beelden die als eerste in beeld komen.
 * Hier gebeurt het één keer, bij het maken van het bestand.
 *
 * ── WAT ER GEBEURT ─────────────────────────────────────────────────────────
 *
 *   1 · SCHERPTEDIEPTE. Een radiale overgang van scherp (op het onderwerp) naar
 *       zacht (aan de randen). De overgang loopt via een smoothstep, want een
 *       lineaire overgang geeft een zichtbare ring op de plek waar hij begint.
 *   2 · VIGNET. De hoeken een tikje donkerder, zodat de rechthoek niet als
 *       rechthoek eindigt maar in de paginagrond wegvalt.
 *
 * Allebei met opzet ver onder de drempel waarop je ze als effect herkent. Wie
 * de twee versies naast elkaar legt ziet het verschil; wie de pagina bezoekt
 * ziet alleen dat het beeld er hoort.
 *
 * ── GEBRUIK ────────────────────────────────────────────────────────────────
 *
 *   node scripts/beeld-inbedden.mjs <bron> <doel> [opties]
 *
 *     --fx 0.38      horizontale plek van het scherptepunt (0 = links)
 *     --fy 0.28      verticale plek (0 = boven)
 *     --straal 0.42  tot waar het scherp blijft, als deel van de halve diagonaal
 *                    (-1 = nergens scherp, voor een sfeerbeeld achter tekst)
 *     --blur 9       hoeveel zachter de rand maximaal wordt (sigma)
 *     --vignet 0.16  hoe donker de hoeken worden (0 = uit)
 *     --breed 2048   uitvoerbreedte
 *
 * Het schrijft naast elkaar een .webp en een .avif, met dezelfde instellingen
 * als de rest van public/img/ (webp q84/effort5, avif q54/effort4).
 */
import sharp from 'sharp';
import path from 'node:path';

const arg = (naam, standaard) => {
  const i = process.argv.indexOf(`--${naam}`);
  return i === -1 ? standaard : Number(process.argv[i + 1]);
};

const bron = process.argv[2];
const doel = process.argv[3];
if (!bron || !doel) {
  console.error('gebruik: node scripts/beeld-inbedden.mjs <bron> <doel-zonder-extensie> [--fx .38 --fy .28 --straal .42 --blur 9 --vignet .16 --breed 2048]');
  process.exit(2);
}

const FX = arg('fx', 0.38);
const FY = arg('fy', 0.28);
const STRAAL = arg('straal', 0.42);
const BLUR = arg('blur', 9);
const VIGNET = arg('vignet', 0.16);
const BREED = arg('breed', 2048);

/* smoothstep: 0 onder a, 1 boven b, en daartussen een S-bocht. De S is wat het
   verschil maakt tussen "zachte rand" en "zichtbare ring". */
const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const basis = sharp(bron).resize(BREED, null, { withoutEnlargement: true });
const { width: W, height: H } = await basis.clone().toBuffer({ resolveWithObject: true }).then((r) => r.info);

/* De halve diagonaal is de maat waarin `straal` wordt uitgedrukt, zodat dezelfde
   waarde op een liggend en een staand beeld hetzelfde doet. */
const halveDiagonaal = Math.hypot(W / 2, H / 2);

const masker = Buffer.alloc(W * H);      // grijswaarde: 255 = volledig de wazige laag
const vignetLaag = Buffer.alloc(W * H);  // grijswaarde: 255 = volledig zwart erover

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const dx = x - FX * W;
    const dy = y - FY * H;
    const d = Math.hypot(dx, dy) / halveDiagonaal;
    /* Een straal onder nul zet de scherpte helemaal uit: het hele kader wordt
       zacht. Dat is wat een SFEERbeeld nodig heeft — een lichtstudie achter
       tekst hoort geen scherpe rand te hebben, want elke scherpe rand daarin
       leest op een pagina als een naad in de opmaak en niet als een vloer.
       (Gemeten op /studio: de harde lichtlijn in de lichtkegel liep dwars over
       de band en zag eruit als een sectiegrens.) */
    masker[y * W + x] = STRAAL < 0 ? 255 : Math.round(255 * smoothstep(STRAAL, 1.06, d));
    /* Het vignet hangt aan de RAND van het kader en niet aan het onderwerp:
       anders schuift de donkere hoek mee met het scherptepunt en dat leest als
       een schaduw die er niet hoort. */
    const rx = (x / W - 0.5) * 2;
    const ry = (y / H - 0.5) * 2;
    const r = Math.hypot(rx, ry) / Math.SQRT2;
    vignetLaag[y * W + x] = Math.round(255 * VIGNET * smoothstep(0.42, 1, r));
  }
}

/* ── DE ALFA WORDT MET DE HAND GEZET ─────────────────────────────────────
   Twee eerdere pogingen liepen hierop stuk. `joinChannel` VOEGT een kanaal TOE
   en vervangt er geen: op een beeld dat al RGBA is geeft dat vijf kanalen en
   een onbruikbaar resultaat (de eerste versie leverde een harde cirkel met een
   witte rand). Op een driekanaals beeld liet sharp het vierde kanaal bij het
   wegschrijven vallen — `hasAlpha` was daarna false, en dus lag de wazige laag
   dekkend over de scherpe en was het HELE beeld zacht.
   Rauwe pixels ineenvlechten laat niets aan de codeerstap over. */
const scherp = await basis.clone().toColourspace('srgb').removeAlpha().png().toBuffer();

const vlecht = (rgb, alfa) => {
  const uit = Buffer.alloc(W * H * 4);
  for (let i = 0, j = 0, k = 0; i < W * H; i++) {
    uit[j++] = rgb[k++]; uit[j++] = rgb[k++]; uit[j++] = rgb[k++]; uit[j++] = alfa[i];
  }
  return sharp(uit, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
};

const wazigRgb = await sharp(scherp).blur(BLUR).removeAlpha().raw().toBuffer();
const wazig = await vlecht(wazigRgb, masker);
const zwart = await vlecht(Buffer.alloc(W * H * 3, 0), vignetLaag);

const samen = sharp(scherp).composite([{ input: wazig, blend: 'over' }, { input: zwart, blend: 'over' }]);

const stam = doel.replace(/\.(webp|avif|png|jpg)$/i, '');
await samen.clone().webp({ quality: 84, effort: 5 }).toFile(`${stam}.webp`);
await samen.clone().avif({ quality: 54, effort: 4 }).toFile(`${stam}.avif`);

console.log(`${path.basename(stam)}  ${W}×${H}  scherptepunt ${FX}/${FY}, straal ${STRAAL}, blur ${BLUR}, vignet ${VIGNET}`);
