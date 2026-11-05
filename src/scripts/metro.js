/* VISUAILS — de metro: het blauwe uur rijdt naar beneden weg en het wit blijft (levering 88, 4 november 2026; lijst 76).
   ═══════════════════════════════════════════════════════════════════════════════
   Lucas (lijst 75, de opening, kan beter): "Ik wou echt een gemaakte animatie beter dan deze simpele. Ik wou een soort
   metro gevoel met de motion blur creëren dat het voelt alsof het blauwe weg racet smooth naar het witte waarna de
   service omhoog komen." En om 12:13: "Ik wou dat het effect naar beneden ging niet van de zijkant." Lijst 77: "Kan de
   achtergrond animatie meer motion blur gebruiken. Ook zou ik de animatie iets sneller en in een golf mee willen laten
   bewegen (laptop en achtergrond iets smoother met elkaar bewegen)."

   Tekent het blauwe uur van het podium (dezelfde fade als .o8-vlak in opening-80.css, stop voor stop) op een WebGL-doek
   en laat het naar beneden wegrijden: het trekt op zoals een metro (traag weg, dan snel) en zakt het beeld uit. Wat
   beweegt krijgt een echte bewegingsonscherpte: het gemiddelde van wat een sluiter van SLUIT seconden zou zien (acht
   punten op de weg die het blauw in die tijd aflegt; n3 heeft een eigen, langere sluiter). Daarboven is het wit van de grond, dat er al was.

   Drie soorten:
     n1  zakken     de hele fade trekt op en zakt weg; verder niets
     n2  strepen    hetzelfde, met dunne lichtstrepen in het blauw die mee naar beneden schieten (de lichten van een tunnel)
     n3  lamellen   het blauw in tien schuine banen op de snede (53,13°) die na elkaar wegvallen, van rechts naar links,
                    als één golf (Lucas koos deze in lijst 76; lijst 77: sneller, meer onscherpte, in een golf)

   maakMetro(canvas, soort) → { teken(u, richting, tempo), duur, weg() } of null (geen WebGL)
     u        0 → 1, hoe ver de rit is (0 = het podium zoals het stilstaat, 1 = alles wit)
     richting 1 vooruit, −1 terug
     tempo    hoe snel u loopt ten opzichte van de gewone duur (voor de onscherpte)
   ═══════════════════════════════════════════════════════════════════════════════ */

/** De sluitertijd van de onscherpte, in seconden. */
export const SLUIT = 0.03;
/** De snede: horizontaal 0,75 × de hoogte (de 3-4-5-driehoek van 53,13°). */
const SNEDE = 0.75;

export const SOORTEN = {
  n1: { naam: 'Zakken', duur: 850, banen: 1, wacht: 0, macht: 2.3, strepen: false },
  n2: { naam: 'Strepen', duur: 900, banen: 1, wacht: 0, macht: 2.3, strepen: true },
  /* lijst 76: n3. Om 16:05 (samen met de laptop weg) vallen de banen van rechts naar links: de golf volgt de laptop, die
     links het beeld uit gaat. Lijst 77: 0,8 s in plaats van 1, tien smallere banen in plaats van zes (een vloeiender golf,
     de helft van de rit tussen de eerste en de laatste), en een sluiter van 0,07 s in plaats van 0,03 (ruim twee keer
     zoveel spoor). De laatste baan valt als de laptop links het beeld uit gaat (HalOpening80.astro, METRO_MEE). */
  n3: { naam: 'Lamellen', duur: 800, banen: 10, wacht: 0.5, macht: 2.2, strepen: false, vanRechts: true, sluit: 0.07 },
};

const N = 28;

const VS = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }';
const FS = `precision highp float;
uniform vec2 uRes; uniform float uDpr, uBanen, uN, uBreed;
uniform vec4 uBaan[12];  /* per baan: hoe ver het blauw zakte aan het begin en het eind van de sluiter (px), - , - */
uniform vec4 uA[${N}];   /* per streep: x, y (bovenkant, in het blauw), lengte, breedte */
uniform vec4 uB[${N}];   /* per streep: dekking, baan */
vec3 hex(float r, float g, float b) { return vec3(r, g, b) / 255.; }
vec3 fade(float t) {
  vec3 a = hex(251., 252., 255.), b = hex(162., 183., 210.), c = hex(98., 131., 175.), d = hex(37., 80., 139.);
  if (t <= .2) return a;
  if (t <= .52) return mix(a, b, (t - .2) / .32);
  if (t <= .76) return mix(b, c, (t - .52) / .24);
  return mix(c, d, clamp((t - .76) / .24, 0., 1.));
}
float ruis(vec2 q) { return fract(sin(dot(q, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec2 q = vec2(gl_FragCoord.x, uRes.y * uDpr - gl_FragCoord.y) / uDpr;
  float H = uRes.y;
  /* welke baan: schuine banen langs de snede (bij één baan altijd 0) */
  float k = 0.;
  if (uBanen > 1.5) k = clamp(floor((q.x - (H - q.y) * ${SNEDE.toFixed(2)} + H * ${SNEDE.toFixed(2)}) / uBreed), 0., uBanen - 1.);
  vec4 b = uBaan[0];
  for (int i = 1; i < 12; i++) { if (float(i) == k) b = uBaan[i]; }
  /* de sluiter: acht punten tussen waar het blauw was en waar het nu is */
  vec3 som = vec3(0.);
  for (int j = 0; j < 8; j++) {
    float o = mix(b.x, b.y, (float(j) + .5) / 8.);
    float t = (q.y - o) / H;
    som += t < 0. ? hex(251., 252., 255.) : fade(t);
  }
  vec3 kleur = som / 8.;
  /* de lichtstrepen: dun en verticaal, ze vallen mee met het blauw */
  if (uN > 0.) {
    float licht = 0.;
    for (int i = 0; i < ${N}; i++) {
      if (float(i) >= uN) break;
      vec4 a = uA[i]; vec4 s = uB[i];
      float vx = clamp(a.w * .5 + .5 - abs(q.x - a.x), 0., 1.);
      if (vx <= 0.) continue;
      float lo = min(b.x, b.y), hi = max(b.x, b.y), L = max(hi - lo, 1.);
      /* het deel van de sluiter waarin de streep (van a.y tot a.y + lengte, verschoven met o) dit punt raakte */
      float van = max(q.y - a.y - a.z, lo), tot = min(q.y - a.y, lo + L);
      float t = (q.y - mix(lo, hi, .5)) / H;
      /* een spoor, geen regen: licht aan de kop (onderaan, waar hij heen gaat), uitlopend naar boven */
      float langs = clamp((q.y - a.y - mix(lo, hi, .5)) / (a.z + L), 0., 1.);
      licht += vx * clamp(tot - van, 0., L) / L * s.x * smoothstep(.4, .62, t) * langs * langs;
    }
    kleur = mix(kleur, vec3(1.), clamp(licht, 0., .7));
  }
  kleur += (ruis(gl_FragCoord.xy) - .5) / 255.;
  gl_FragColor = vec4(kleur, 1.);
}`;

/** Een vaste rij toevalsgetallen (mulberry32), zodat de strepen bij elke rit hetzelfde staan. */
function toeval(zaad) {
  let a = zaad >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function maakMetro(canvas, soort = 'n1') {
  const S = SOORTEN[soort] || SOORTEN.n1;
  let gl = null;
  try { gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'high-performance' }); } catch { gl = null; }
  if (!gl) return null;
  const maak = (type, bron) => { const s = gl.createShader(type); gl.shaderSource(s, bron); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader'); return s; };
  const prog = gl.createProgram();
  try { gl.attachShader(prog, maak(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, maak(gl.FRAGMENT_SHADER, FS)); } catch { return null; }
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const pa = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(pa); gl.vertexAttribPointer(pa, 2, gl.FLOAT, false, 0, 0);
  const U = (n) => gl.getUniformLocation(prog, n);
  const uRes = U('uRes'), uDpr = U('uDpr'), uBanen = U('uBanen'), uN = U('uN'), uBreed = U('uBreed'), uBaan = U('uBaan'), uA = U('uA'), uB = U('uB');

  /* de strepen: x over de breedte, y in het blauw (breukdeel van de hoogte van de fade), een lengte, een breedte en een
     dekking; dichtbij is langer, breder en lichter */
  const r = toeval(7711);
  const strepen = [];
  for (let i = 0; i < N; i++) {
    const dicht = r();
    strepen.push({ x: r(), y: 0.46 + 0.5 * r(), l: 0.08 + 0.22 * r() + 0.1 * dicht, d: 1 + 2 * dicht, g: 0.26 + 0.44 * dicht });
  }

  /* het doek tekent op 0,75 van de css-pixels (alles wat beweegt is onscherp, en wat stilstaat is de fade): een kwart van
     de punten van een scherp doek op 1,5 ×. Zonder grafische kaart (SwiftShader) 0,4, zodat de rit vloeiend blijft. */
  let SCHAAL = 0.75;
  try { const ext = gl.getExtension('WEBGL_debug_renderer_info'); const r = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : ''; if (/swiftshader|llvmpipe|software/i.test(r)) SCHAAL = 0.4; } catch { /* dan 0,75 */ }
  let W = 0, H = 0, dpr = 1;
  function maat() {
    const b = canvas.clientWidth || canvas.parentElement?.clientWidth || 0, h = canvas.clientHeight || canvas.parentElement?.clientHeight || 0;
    dpr = SCHAAL;
    if (b !== W || h !== H || canvas.width !== Math.round(b * dpr)) {
      W = b; H = h; canvas.width = Math.max(1, Math.round(b * dpr)); canvas.height = Math.max(1, Math.round(h * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
  }
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => maat()) : null;
  ro?.observe(canvas);

  /* hoe ver baan k gezakt is op u (px), en hoe snel (px per eenheid u). De fade moet ruim een hoogte zakken: het
     laatste blauw dat je ziet zit op een kwart van de fade, en de onscherpte heeft ruimte nodig. */
  function zak(k, u) {
    const nb = S.banen, wacht = nb > 1 ? (S.wacht * (S.vanRechts ? nb - 1 - k : k)) / (nb - 1) : 0, span = 1 - S.wacht;
    const l = Math.max(0, Math.min(1, (u - wacht) / span));
    const D = 1.0 * H;
    return { o: D * Math.pow(l, S.macht), v: l <= 0 || l >= 1 ? 0 : (D * S.macht * Math.pow(l, S.macht - 1)) / span };
  }

  const baan = new Float32Array(48), A = new Float32Array(N * 4), B = new Float32Array(N * 4);
  function teken(u, richting = 1, tempo = 1) {
    maat();
    if (!W || !H) return;
    const sec = S.duur / 1000 / Math.max(0.05, tempo);
    const terug = richting < 0;
    const zakken = [];
    for (let k = 0; k < S.banen; k++) {
      const { o, v } = zak(k, u);
      const L = Math.min(0.6 * H, (v / sec) * (S.sluit ?? SLUIT));
      /* vooruit zakt het blauw: de sluiter begon L hoger; terug stijgt het: de sluiter begon L lager */
      const begin = terug ? o + L : Math.max(0, o - L);
      baan.set([begin, o, 0, 0], k * 4);
      zakken.push({ o, v, L });
    }
    let n = 0;
    if (S.strepen) {
      const vmax = (H * S.macht) / (1 - S.wacht) / sec;
      for (let i = 0; i < N; i++) {
        const s = strepen[i];
        const g = s.g * smooth(0.06, 0.4, zakken[0].v / vmax);
        if (g <= 0.002) continue;
        A.set([s.x * W, s.y * H, s.l * H, s.d], n * 4);
        B.set([g, 0, 0, 0], n * 4);
        n++;
      }
    }
    gl.uniform2f(uRes, W, H); gl.uniform1f(uDpr, dpr);
    gl.uniform1f(uBanen, S.banen); gl.uniform1f(uBreed, (W + SNEDE * H) / S.banen); gl.uniform4fv(uBaan, baan);
    gl.uniform1f(uN, n); if (n) { gl.uniform4fv(uA, A); gl.uniform4fv(uB, B); }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  return {
    teken, duur: S.duur, naam: S.naam,
    weg() { ro?.disconnect(); gl.getExtension('WEBGL_lose_context')?.loseContext(); },
  };
}

function smooth(a, b, x) { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
