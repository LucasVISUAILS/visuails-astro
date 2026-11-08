/* VISUAILS — het veld (lijst 78; op de site sinds levering 89, 5 november 2026). Een bewegende achtergrond in wit, blauw uur en roze met korrel, naar het gevoel
   van Lucas' voorbeeld (4 november 2026, 20:44), maar in het eigen schema en op de eigen hoek: het licht loopt langs de
   snede (53,13°) of als een golf (de S van het woordmerk).
   maakVeld(canvas, soort, { schaal, korrel, tijd }) → { teken(t), weg() }; tekent zelf niets, de pagina roept teken(t) aan.
   Elke laag: een kleur en een vorm (vlek, baan, golf, lucht), die heel traag drijft (dertig tot zestig seconden). */

const H = (h) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];

/* vorm: 0 vlek (midden x y, straal r), 1 baan langs een hoek (punt x y, hoek, breedte r), 2 golf (een S door x y, breedte r),
   3 lucht (van onder: hoogte y, zachtheid r). sterk: hoe vol (0 – 1). drift: hoeveel hij beweegt. */
export const VELDEN = {
  /* b1: de lucht na zonsondergang: wit boven, het blauwe uur onder, de laatste roze streep op de horizon */
  b1: { naam: 'Horizon', grond: '#FBFCFF', korrel: 0.06, lagen: [
    { k: '#D0D8E9', vorm: 3, x: 0, y: 0.50, r: 0.42, sterk: 0.9, drift: 0.03 },
    { k: '#ROZE', vorm: 1, x: 0.55, y: 0.69, hoek: -6, r: 0.11, zij: 0.45, sterk: 0.85, drift: 0.04 },
    { k: '#6283AF', vorm: 3, x: 0, y: 0.80, r: 0.18, sterk: 0.95, drift: 0.03 },
    { k: '#25508B', vorm: 3, x: 0, y: 0.98, r: 0.2, sterk: 1.0, drift: 0.03 },
  ] },
  /* b2: blauw uur met het licht langs de snede (53,13°), roze waar het licht eindigt */
  b2: { naam: 'Snede', grond: '#25508B', korrel: 0.065, lagen: [
    { k: '#1A4279', vorm: 0, x: 0.1, y: 0.1, r: 0.7, sterk: 0.95, drift: 0.04 },
    { k: '#0F1217', vorm: 0, x: 1.0, y: 0.0, r: 0.5, sterk: 0.6, drift: 0.03 },
    { k: '#6283AF', vorm: 1, x: 0.56, y: 0.5, hoek: 53.13, r: 0.3, zij: 0.25, sterk: 0.9, drift: 0.04 },
    { k: '#E6EAF4', vorm: 1, x: 0.56, y: 0.5, hoek: 53.13, r: 0.1, zij: 0.2, sterk: 0.9, drift: 0.04 },
    { k: '#ROZE', vorm: 0, x: 0.92, y: 0.95, r: 0.38, sterk: 0.85, drift: 0.04 },
  ] },
  /* b3: wit met een golf van blauw uur (de S uit het woordmerk), roze in de bocht */
  b3: { naam: 'Golf', grond: '#FBFCFF', korrel: 0.055, lagen: [
    { k: '#D0D8E9', vorm: 2, x: 0.5, y: 0.5, hoek: 10, r: 0.34, zij: 0.5, sterk: 0.9, drift: 0.04 },
    { k: '#25508B', vorm: 2, x: 0.5, y: 0.56, hoek: 10, r: 0.16, zij: 0.35, sterk: 0.95, drift: 0.04 },
    { k: '#ROZE', vorm: 0, x: 0.95, y: 0.92, r: 0.36, sterk: 0.9, drift: 0.04 },
    { k: '#FBFCFF', vorm: 2, x: 0.5, y: 0.47, hoek: 10, r: 0.045, zij: 1.0, sterk: 0.55, drift: 0.04 },
  ] },
  /* b4: de nacht (het dichtst bij je voorbeeld): inkt, een plooi van blauw uur met licht op de rand, roze rechtsonder */
  b4: { naam: 'Nacht', grond: '#0F1217', korrel: 0.075, lagen: [
    { k: '#FBFCFF', vorm: 0, x: 0.08, y: 0.1, r: 0.36, sterk: 0.9, drift: 0.03 },
    { k: '#25508B', vorm: 2, x: 0.55, y: 0.52, hoek: -24, r: 0.3, zij: 0.4, sterk: 0.95, drift: 0.04 },
    { k: '#A2B7D2', vorm: 2, x: 0.5, y: 0.43, hoek: -24, r: 0.11, zij: 0.3, sterk: 0.8, drift: 0.04 },
    { k: '#ROZE', vorm: 0, x: 0.92, y: 0.84, r: 0.3, sterk: 1.0, drift: 0.04 },
    { k: '#0F1217', vorm: 0, x: 1.08, y: -0.08, r: 0.55, sterk: 0.95, drift: 0.03 },
    { k: '#0F1217', vorm: 0, x: -0.08, y: 1.1, r: 0.5, sterk: 0.9, drift: 0.03 },
  ] },
  /* b5: adem: bijna wit, voor achter tekst (inkt erop houdt 15 : 1) */
  b5: { naam: 'Adem', grond: '#FBFCFF', korrel: 0.04, lagen: [
    { k: '#D0D8E9', vorm: 0, x: 0.15, y: 0.25, r: 0.6, sterk: 0.8, drift: 0.05 },
    { k: '#ROZE', vorm: 0, x: 0.95, y: 0.9, r: 0.5, sterk: 0.32, drift: 0.05 },
    { k: '#E6EAF4', vorm: 0, x: 0.65, y: 0.05, r: 0.5, sterk: 0.6, drift: 0.04 },
  ] },
  /* b6: de snede in het licht: wit, het blauwe uur snijdt van linksonder het wit in langs 53,13°, roze op de rand */
  b6: { naam: 'Insnede', grond: '#FBFCFF', korrel: 0.055, lagen: [
    { k: '#D0D8E9', vorm: 1, x: 0.22, y: 0.66, hoek: 53.13, r: 0.36, zij: 2.4, sterk: 0.7, drift: 0.03 },
    { k: '#25508B', vorm: 4, x: 0.16, y: 0.74, hoek: 53.13, r: 0.14, sterk: 1.0, drift: 0.03 },
    { k: '#ROZE', vorm: 1, x: 0.16, y: 0.74, hoek: 53.13, r: 0.06, zij: 0.5, sterk: 0.75, drift: 0.03 },
    { k: '#1A4279', vorm: 0, x: -0.05, y: 1.05, r: 0.45, sterk: 0.85, drift: 0.03 },
  ] },
  /* het heelal (lijst 79): alle kleuren door elkaar, voor achter het logo in de film; beweegt sneller (tempo) */
  h1: { naam: 'Heelal', grond: '#0F1217', korrel: 0.07, lagen: [
    { k: '#1A4279', vorm: 0, x: 0.75, y: 0.2, r: 0.45, sterk: 0.9, drift: 0.12 },
    { k: '#25508B', vorm: 0, x: 0.28, y: 0.62, r: 0.45, sterk: 0.95, drift: 0.12 },
    { k: '#6283AF', vorm: 2, x: 0.5, y: 0.48, hoek: -18, r: 0.12, zij: 0.35, sterk: 0.8, drift: 0.1 },
    { k: '#A2B7D2', vorm: 2, x: 0.5, y: 0.44, hoek: -18, r: 0.035, zij: 0.6, sterk: 0.75, drift: 0.1 },
    { k: '#ROZE', vorm: 0, x: 0.82, y: 0.78, r: 0.3, sterk: 0.95, drift: 0.13 },
    { k: '#0F1217', vorm: 0, x: 0.5, y: 1.02, r: 0.28, sterk: 0.7, drift: 0.1 },
  ] },
  /* lijst 81: de velden in de letters (de letters zijn vensters op het veld, op wit). Zonder het licht dat in de letters wit op
     wit zou worden (gemeten: in b2, b4 en h1 zakte het tot 1,3 : 1); het roze onder de letters, zodat ze leesbaar blijven */
  /* lijst 81: de logoposter op de site (lijst 78, C3: "B2 … in een variant waar het licht rechts blijft"). Het tekstlogo staat in
     het midden in wit: het licht van de snede en het roze staan rechts, buiten de letters */
  p2: { naam: 'Snede, poster', grond: '#25508B', korrel: 0.065, lagen: [
    { k: '#1A4279', vorm: 0, x: 0.1, y: 0.1, r: 0.7, sterk: 0.95, drift: 0.04 },
    { k: '#0F1217', vorm: 0, x: 0.0, y: 1.0, r: 0.5, sterk: 0.5, drift: 0.03 },
    { k: '#6283AF', vorm: 1, x: 0.98, y: 0.5, hoek: 53.13, r: 0.22, zij: 0.25, sterk: 0.85, drift: 0.04 },
    { k: '#E6EAF4', vorm: 1, x: 0.99, y: 0.5, hoek: 53.13, r: 0.07, zij: 0.2, sterk: 0.85, drift: 0.04 },
    { k: '#ROZE', vorm: 0, x: 1.02, y: 1.0, r: 0.32, sterk: 0.85, drift: 0.04 },
  ] },
  w2: { naam: 'Snede in de letters', grond: '#25508B', korrel: 0.065, lagen: [
    { k: '#1A4279', vorm: 0, x: 0.1, y: 0.1, r: 0.7, sterk: 0.95, drift: 0.04 },
    { k: '#0F1217', vorm: 0, x: 1.0, y: 0.0, r: 0.5, sterk: 0.6, drift: 0.03 },
    { k: '#6283AF', vorm: 1, x: 0.56, y: 0.5, hoek: 53.13, r: 0.3, zij: 0.25, sterk: 0.7, drift: 0.04 },
    { k: '#ROZE', vorm: 0, x: 0.92, y: 1.15, r: 0.38, sterk: 0.85, drift: 0.04 },
  ] },
  w4: { naam: 'Nacht in de letters', grond: '#0F1217', korrel: 0.075, lagen: [
    { k: '#1A4279', vorm: 0, x: 0.12, y: 0.2, r: 0.42, sterk: 0.9, drift: 0.03 },
    { k: '#25508B', vorm: 2, x: 0.55, y: 0.52, hoek: -24, r: 0.3, zij: 0.4, sterk: 0.95, drift: 0.04 },
    { k: '#ROZE', vorm: 0, x: 0.95, y: 0.98, r: 0.26, sterk: 1.0, drift: 0.04 },
    { k: '#0F1217', vorm: 0, x: 1.08, y: -0.08, r: 0.55, sterk: 0.95, drift: 0.03 },
  ] },
  w9: { naam: 'Heelal in de letters', grond: '#0F1217', korrel: 0.07, lagen: [
    { k: '#1A4279', vorm: 0, x: 0.75, y: 0.2, r: 0.45, sterk: 0.9, drift: 0.12 },
    { k: '#25508B', vorm: 0, x: 0.28, y: 0.62, r: 0.45, sterk: 0.95, drift: 0.12 },
    { k: '#6283AF', vorm: 2, x: 0.5, y: 0.48, hoek: -18, r: 0.12, zij: 0.35, sterk: 0.6, drift: 0.1 },
    { k: '#ROZE', vorm: 0, x: 0.84, y: 0.95, r: 0.3, sterk: 0.95, drift: 0.13 },
    { k: '#0F1217', vorm: 0, x: 0.5, y: 1.02, r: 0.28, sterk: 0.7, drift: 0.1 },
  ] },
  h2: { naam: 'Heelal licht', grond: '#FBFCFF', korrel: 0.06, lagen: [
    { k: '#A2B7D2', vorm: 0, x: 0.25, y: 0.7, r: 0.4, sterk: 0.85, drift: 0.12 },
    { k: '#25508B', vorm: 2, x: 0.5, y: 0.6, hoek: -14, r: 0.12, zij: 0.4, sterk: 0.9, drift: 0.11 },
    { k: '#ROZE', vorm: 0, x: 0.82, y: 0.3, r: 0.3, sterk: 0.9, drift: 0.13 },
    { k: '#6283AF', vorm: 0, x: 0.9, y: 0.9, r: 0.3, sterk: 0.8, drift: 0.12 },
    { k: '#FBFCFF', vorm: 0, x: 0.45, y: 0.2, r: 0.3, sterk: 0.7, drift: 0.1 },
  ] },
  /* op de site, met tekst erop: het licht blijft van de tekst weg */
  c4: { naam: 'Nacht (blok)', grond: '#0F1217', korrel: 0.07, lagen: [
    { k: '#25508B', vorm: 1, x: 0.94, y: 0.86, hoek: 53.13, r: 0.3, zij: 0.5, sterk: 0.9, drift: 0.03 },
    { k: '#A2B7D2', vorm: 1, x: 0.99, y: 0.84, hoek: 53.13, r: 0.06, zij: 0.4, sterk: 0.75, drift: 0.03 },
    { k: '#ROZE', vorm: 0, x: 0.98, y: 0.98, r: 0.3, sterk: 0.95, drift: 0.03 },
    { k: '#0F1217', vorm: 0, x: 0.2, y: 0.3, r: 0.55, sterk: 0.95, drift: 0.02 },
  ] },
  c2: { naam: 'Snede (poster)', grond: '#25508B', korrel: 0.065, lagen: [
    { k: '#1A4279', vorm: 0, x: 0.3, y: 0.3, r: 0.7, sterk: 0.9, drift: 0.03 },
    { k: '#6283AF', vorm: 1, x: 0.88, y: 0.5, hoek: 53.13, r: 0.22, zij: 0.25, sterk: 0.85, drift: 0.03 },
    { k: '#E6EAF4', vorm: 1, x: 0.88, y: 0.5, hoek: 53.13, r: 0.06, zij: 0.2, sterk: 0.85, drift: 0.03 },
    { k: '#ROZE', vorm: 0, x: 0.97, y: 0.97, r: 0.32, sterk: 0.85, drift: 0.03 },
  ] },
  /* staand (posters, 4 : 5): dezelfde velden, anders gelegd */
  p4: { naam: 'Nacht staand', grond: '#0F1217', korrel: 0.08, lagen: [
    { k: '#25508B', vorm: 2, x: 0.42, y: 0.5, hoek: -42, r: 0.26, zij: 0.4, sterk: 0.95, drift: 0.04 },
    { k: '#A2B7D2', vorm: 2, x: 0.38, y: 0.43, hoek: -42, r: 0.09, zij: 0.25, sterk: 0.85, drift: 0.04 },
    { k: '#FBFCFF', vorm: 2, x: 0.36, y: 0.405, hoek: -42, r: 0.025, zij: 1.0, sterk: 0.7, drift: 0.04 },
    { k: '#ROZE', vorm: 0, x: 0.78, y: 0.86, r: 0.26, sterk: 1.0, drift: 0.04 },
    { k: '#0F1217', vorm: 0, x: 0.85, y: 0.05, r: 0.5, sterk: 0.95, drift: 0.03 },
    { k: '#0F1217', vorm: 0, x: -0.05, y: 1.05, r: 0.45, sterk: 0.9, drift: 0.03 },
  ] },
  p6: { naam: 'Insnede staand', grond: '#FBFCFF', korrel: 0.06, lagen: [
    { k: '#D0D8E9', vorm: 1, x: 0.04, y: 0.5, hoek: 53.13, r: 0.34, zij: 0.35, sterk: 0.7, drift: 0.03 },
    { k: '#25508B', vorm: 4, x: 0.0, y: 0.46, hoek: 53.13, r: 0.1, sterk: 1.0, drift: 0.03 },
    { k: '#ROZE', vorm: 1, x: 0.0, y: 0.46, hoek: 53.13, r: 0.045, zij: 2.0, sterk: 0.8, drift: 0.03 },
    { k: '#1A4279', vorm: 0, x: -0.05, y: -0.05, r: 0.32, sterk: 0.85, drift: 0.03 },
  ] },
};

const VS = 'attribute vec2 p; varying vec2 v; void main(){ v = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }';
const MAX = 6;
const FS = `precision highp float;
varying vec2 v;
uniform vec2 uRes; uniform float uT, uKorrel, uZaad, uKorrelMaat;
uniform vec3 uGrond;
uniform vec3 uK[${MAX}]; uniform vec4 uL[${MAX}]; uniform vec4 uM[${MAX}];   /* uL: x y r sterk; uM: vorm hoek drift - */
uniform int uN;
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float ruis(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(h21(i), h21(i + vec2(1., 0.)), f.x), mix(h21(i + vec2(0., 1.)), h21(i + vec2(1., 1.)), f.x), f.y); }
float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 4; i++) { s += a * ruis(p); p = p * 2.03 + 7.1; a *= .5; } return s; }
vec3 lin(vec3 c){ return pow(c, vec3(2.2)); }
vec3 srgb(vec3 c){ return pow(max(c, 0.), vec3(1. / 2.2)); }
void main(){
  float asp = uRes.x / uRes.y;
  vec2 q = vec2(v.x, 1. - v.y);                      /* 0,0 linksboven */
  vec2 a = vec2(q.x * asp, q.y);
  /* het hele veld drijft heel traag: de ruimte zelf golft (domain warp) */
  float t = uT * .001;
  vec2 w = vec2(fbm(a * .62 + vec2(t * .018, uZaad)), fbm(a * .62 + vec2(5.2 + uZaad, -t * .015))) - .5;
  vec3 kl = lin(uGrond);
  for (int i = 0; i < ${MAX}; i++) {
    if (i >= uN) break;
    vec4 L = uL[i]; vec4 M = uM[i];
    float d = M.z;                                    /* drift */
    vec2 c = vec2(L.x * asp, L.y) + d * vec2(sin(t * .11 + float(i) * 1.7), cos(t * .09 + float(i) * 2.3));
    vec2 b = a + w * (.18 + d * 1.2);
    float zij = M.w > 0. ? M.w : 1.;                  /* een baan of golf: de ene kant scherper dan de andere (het licht op een plooi) */
    float m = 0.;
    if (M.x < .5) {                                   /* vlek */
      float r = L.z; m = exp(-dot(b - c, b - c) / (r * r));
    } else if (M.x < 1.5) {                           /* baan langs een hoek: de lijn door c onder M.y graden */
      float g = radians(M.y); vec2 n = vec2(sin(g), cos(g));
      float x = dot(b - c, n); float r = x < 0. ? L.z * zij : L.z; m = exp(-x * x / (r * r));
    } else if (M.x < 2.5) {                           /* golf: een S door c */
      float y = c.y + .22 * sin((b.x - c.x) * 1.7 + t * .03 + float(i) * .4) - tan(radians(M.y)) * (b.x - c.x);
      float x = b.y - y; float r = x < 0. ? L.z * zij : L.z; m = exp(-x * x / (r * r));
    } else if (M.x > 3.5) {                           /* halfvlak: alles aan één kant van de lijn door c onder M.y graden */
      float g = radians(M.y); vec2 n = vec2(sin(g), cos(g));
      float x = dot(b - c, n); m = smoothstep(L.z, -L.z, x);
    } else {                                          /* lucht: van onder op tot hoogte L.y, zacht over L.z */
      float y = L.y + .05 * sin(b.x * 2.1 + t * .04 + float(i)) + (d * .6) * sin(t * .07 + float(i));
      m = smoothstep(y - L.z, y + L.z * .35, b.y);
    }
    kl = mix(kl, lin(uK[i]), clamp(m * L.w, 0., 1.));
  }
  vec3 c = srgb(kl);
  /* de korrel: per beeldpunt, alleen licht en donker, sterker in het midden van de grijswaarden (zoals film) */
  float g = h21(floor(gl_FragCoord.xy / uKorrelMaat) + fract(uZaad * 17.13) * 311.) - .5;
  float lum = dot(c, vec3(.2126, .7152, .0722));
  c += g * uKorrel * (.55 + 1.8 * lum * (1. - lum));
  /* dither tegen banden */
  c += (h21(gl_FragCoord.yx * 1.7) - .5) / 255.;
  gl_FragColor = vec4(clamp(c, 0., 1.), 1.);
}`;

export function maakVeld(canvas, soort, opties = {}) {
  const cfg = VELDEN[soort]; if (!cfg) return null;
  const roze = opties.roze || '#F1B7AC';
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: !!opties.bewaar });
  if (!gl) return null;
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); gl.useProgram(pr);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const lp = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(lp); gl.vertexAttribPointer(lp, 2, gl.FLOAT, false, 0, 0);
  const U = (n) => gl.getUniformLocation(pr, n);
  const lagen = cfg.lagen.slice(0, MAX);
  const K = new Float32Array(MAX * 3), L = new Float32Array(MAX * 4), M = new Float32Array(MAX * 4);
  lagen.forEach((l, i) => { K.set(H(l.k === '#ROZE' ? roze : l.k), i * 3); L.set([l.x, l.y, l.r, l.sterk], i * 4); M.set([l.vorm, l.hoek || 0, l.drift || 0, l.zij || 0], i * 4); });
  gl.uniform3fv(U('uK'), K); gl.uniform4fv(U('uL'), L); gl.uniform4fv(U('uM'), M); gl.uniform1i(U('uN'), lagen.length);
  gl.uniform3fv(U('uGrond'), new Float32Array(H(cfg.grond)));
  gl.uniform1f(U('uKorrel'), opties.korrel ?? cfg.korrel); gl.uniform1f(U('uKorrelMaat'), opties.korrelMaat ?? 1); gl.uniform1f(U('uZaad'), opties.zaad ?? 0.37);
  const uT = U('uT'), uRes = U('uRes');
  const schaal = opties.schaal ?? 1;
  function maat() {
    const r = canvas.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1) * schaal;
    const b = Math.max(1, Math.round((opties.b || r.width) * d)), h = Math.max(1, Math.round((opties.h || r.height) * d));
    if (canvas.width !== b || canvas.height !== h) { canvas.width = b; canvas.height = h; }
    gl.viewport(0, 0, canvas.width, canvas.height); gl.uniform2f(uRes, canvas.width, canvas.height);
  }
  function teken(t) { maat(); gl.uniform1f(uT, t); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); }
  return { teken, weg() { const e = gl.getExtension('WEBGL_lose_context'); if (e) e.loseContext(); }, naam: cfg.naam };
}
