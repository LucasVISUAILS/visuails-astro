/* VISUAILS — het doek van de laptopvideo (levering 80; opnieuw in levering 84, 2 november 2026).
   ═══════════════════════════════════════════════════════════════════════════════
   Tekent de gestapelde video (twee banden: kleur en dekking, zonder de lege bovenkant; scripts/laptop-video.mjs)
   met WebGL op een doorzichtig canvas, zodat de grond van de site er precies doorheen schijnt. In het laptopscherm en het
   telefoonscherm komt per beeld de winkel en de telefoonfoto, in perspectief: de hoeken per beeld staan in
   src/data/laptopVideo.json (gemeten uit de video, scripts/laptop-video-na.py).

   LEVERING 84 (Lucas: "De laptop animatie lagged enorm … ook zitten de beelden er niet goed in en gaan ze tijdens
   de animatie verkeerd vervormen"):
   - Het scherm staat waar de video niet dekt (1 − dekking), binnen de vierhoek. Er is geen derde band met de
     gaten meer: die miste bij de bijna dichte klep een groot deel van het scherm (de grond scheen erdoor), en bij
     de telefoon die het beeld uit ging bleef een strook van het scherm leeg.
   - De winkel en de telefoonfoto krijgen kleinere versies van zichzelf (mipmaps) en scherp filteren op de
     schuine klep (anisotroop): eerst las het doek een beeld van 1600 breed op 500 punten zonder verkleinen, en
     dan flikkeren dunne lijnen en letters als ze bewegen.
   - De maat van het canvas leest het pas als die verandert (ResizeObserver), niet bij elk beeld, en het canvas is
     nooit scherper dan de video zelf.

   LEVERING 87 (Lucas, lijst 74: "een soort korte energetic motion blur … kort en subtiel, niet te heftig"): teken(beeld, veeg)
   trekt het beeld zijdelings uit over veeg (breukdeel van de breedte, hoogstens 3 %), in negen punten. HalOpening80.astro
   rekent veeg uit hoe snel de laptop en de telefoon in dat stuk van de video schuiven (vaart in laptopVideo.json) en hoe
   snel je scrolt.

   LEVERING 88b (Lucas, 4 november: "In de video lagged de laptop een beetje"): tijdens de rit van de metro speelt de video
   niet meer. Vanaf beeld 86 schuift de laptop in de video alleen nog naar links (gemeten: 38 beeldpunten per beeld op
   1920, zonder van vorm te veranderen), dus houdt het doek het beeld vast en schuift het zelf: teken(beeld, veeg, schuif)
   met schuif = [laptop naar links, telefoon naar rechts] in breukdelen van de breedte. Links van de grens (SCHUIF_GRENS)
   staat de laptop, rechts de rand van de telefoon. Zo beweegt de laptop elk schermbeeld op de klok van de rit, en niet
   24 keer per seconde. Tijdens de rit mag de onscherpte tot MAX_VEEG_RIT (de sluiter van de banen, metro.js).

   maakDoek(canvas, video, schermen) → { teken(beeld, veeg, schuif), zetBeelden(lapImg, fonImg), weg() } of null
   (geen WebGL: dan blijft de stilstaande foto staan en speelt er niets).
   ═══════════════════════════════════════════════════════════════════════════════ */

/** Hoeveel beeldpunten van de video (2944 breed) het scherm onder de rand van het toestel doorloopt. */
export const RUIMER = 1.5;
/** Levering 88b: links van deze grens (breukdeel van de breedte) staat de laptop, rechts de telefoon. Bij beeld 86 eindigt
    de laptop op 0,39 en begint de telefoon op 0,97 (gemeten in de dekking van de video). */
export const SCHUIF_GRENS = 0.75;
/** De bewegingsonscherpte: hoogstens 3 % van de breedte als de video speelt (levering 87), 5 % tijdens de rit. */
export const MAX_VEEG = 0.03, MAX_VEEG_RIT = 0.05;

const VS = `attribute vec2 p; varying vec2 v; void main(){ v = vec2(p.x * .5 + .5, .5 - p.y * .5); gl_Position = vec4(p, 0., 1.); }`;
const FS = `precision highp float;
varying vec2 v;
uniform sampler2D uVid, uLap, uFon;
uniform mat3 uHL, uHF;
uniform float uL, uF;
uniform vec4 uCL, uCF;   /* uitsnede (cover): schaal x, schaal y, verschuiving x, y */
uniform float uRand;     /* een halve rij van een band: niet over de grens tussen de twee banden lezen */
uniform float uBoven;    /* de lege bovenkant die van de video is geknipt (breukdeel van het hele beeld) */
uniform float uVeeg;     /* levering 87: de bewegingsonscherpte, zijdelings, als breukdeel van de breedte (0 = scherp) */
uniform vec3 uSchuif;    /* levering 88b: laptop naar links, telefoon naar rechts, de grens ertussen (breukdelen) */
/* het beeld op een scherm: (kleur, 1 binnen de vierhoek); de hoeken staan in breukdelen van het hele beeld */
vec4 scherm(sampler2D t, mat3 h, vec4 c, vec2 w) {
  vec3 q = h * vec3(w.x, uBoven + w.y * (1. - uBoven), 1.);
  if (q.z <= 0.) return vec4(0.);
  vec2 u = q.xy / q.z;
  if (u.x < -.002 || u.y < -.002 || u.x > 1.002 || u.y > 1.002) return vec4(0.);
  /* een niveau fijner dan de grafische kaart zelf kiest (-1): dichter bij het ideale beeld, zonder de trappetjes van
     helemaal niet verkleinen (gemeten in levering 84 tegen het beeld met 4 x 4 deelpunten per pixel) */
  return vec4(texture2D(t, clamp(u, 0., 1.) * c.xy + c.zw, -1.).rgb, 1.);
}
/* één punt van het doek, voorvermenigvuldigd */
vec4 punt(vec2 w) {
  /* levering 88b: tijdens de rit het vastgehouden beeld verschoven; wat tussen laptop en telefoon vrijkomt is leeg */
  if (uSchuif.x != 0. || uSchuif.y != 0.) {
    if (w.x < uSchuif.z - uSchuif.x) w.x += uSchuif.x;
    else if (w.x >= uSchuif.z + uSchuif.y) w.x -= uSchuif.y;
    else return vec4(0.);
  }
  /* twee banden onder elkaar: de kleur en de dekking (scripts/laptop-video.mjs) */
  float y = clamp(w.y, uRand, 1. - uRand) * .5;
  vec3 kl = texture2D(uVid, vec2(w.x, y)).rgb;
  float a = clamp((texture2D(uVid, vec2(w.x, y + .5)).r - .03) / .94, 0., 1.);
  vec4 s = vec4(0.);
  if (uL > .5) s = scherm(uLap, uHL, uCL, w);
  if (uF > .5 && s.a < .5) s = scherm(uFon, uHF, uCF, w);
  /* het scherm waar de video niet dekt, en alleen binnen de vierhoek (nooit op de grond) */
  float sa = s.a * (1. - a);
  return vec4(kl * a + s.rgb * sa, a + sa);
}
void main(){
  if (uVeeg < .0004) { gl_FragColor = punt(v); return; }
  /* levering 87: als de laptop links en de telefoon rechts het beeld uit gaan, trekt het beeld een kort spoor (zoals een
     sluitertijd): negen punten op een lijn, het midden het zwaarst */
  vec4 som = vec4(0.); float g = 0.;
  for (int k = -4; k <= 4; k++) {
    float f = float(k) / 4.;
    float wk = 1. - abs(f) * .6;
    som += punt(vec2(clamp(v.x + f * uVeeg * .5, 0., 1.), v.y)) * wk; g += wk;
  }
  gl_FragColor = som / g;
}`;

/* De 3 × 3-matrix die het eenheidsvierkant op een vierhoek legt (lb, rb, ro, lo), en zijn inverse. */
function vierkantNaarVier(q) {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
  const dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2;
  const sx = x0 - x1 + x2 - x3, sy = y0 - y1 + y2 - y3;
  const det = dx1 * dy2 - dx2 * dy1;
  const g = (sx * dy2 - dx2 * sy) / det, h = (dx1 * sy - sx * dy1) / det;
  return [x1 - x0 + g * x1, x3 - x0 + h * x3, x0, y1 - y0 + g * y1, y3 - y0 + h * y3, y0, g, h, 1];
}
function inverse(m) {
  const [a, b, c, d, e, f, g, h, i] = m;
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
  const det = a * A + b * B + c * C;
  return [A / det, -(b * i - c * h) / det, (b * f - c * e) / det, B / det, (a * i - c * g) / det, -(a * f - c * d) / det, C / det, -(a * h - b * g) / det, (a * e - b * d) / det];
}
/** Een vierhoek k beeldpunten ruimer maken vanuit zijn midden (b × h: de maat van de video), zodat de rand van
    het toestel hem afsnijdt. */
export function ruimer(q, k, b, h) {
  const cx = (q[0][0] + q[1][0] + q[2][0] + q[3][0]) / 4, cy = (q[0][1] + q[1][1] + q[2][1] + q[3][1]) / 4;
  const bw = (Math.max(...q.map((p) => p[0])) - Math.min(...q.map((p) => p[0]))) * b;
  const bh = (Math.max(...q.map((p) => p[1])) - Math.min(...q.map((p) => p[1]))) * h;
  const sx = 1 + (2 * k) / Math.max(bw, 1), sy = 1 + (2 * k) / Math.max(bh, 1);
  return q.map(([x, y]) => [cx + (x - cx) * sx, cy + (y - cy) * sy]);
}
/* kolomvolgorde voor WebGL (mat3 is kolom voor kolom) */
const kolom = (m) => new Float32Array([m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]]);

/** Matrix die de hoek van de eerste beelden geeft: in CSS voor de stilstaande schermen (matrix3d). */
export function cssMatrix(q, b, h) {
  /* q in px van het vak, b × h de maat van het element dat erop moet */
  const m = vierkantNaarVier(q);
  const [a, bb, c, d, e, f, g, hh] = m;
  return `matrix3d(${[a / b, d / b, 0, g / b, bb / h, e / h, 0, hh / h, 0, 0, 1, 0, c, f, 0, 1].join(',')})`;
}

/* Een beeld als textuur met kleinere versies van zichzelf: WebGL 1 kan dat alleen bij een maat in machten van
   twee, dus eerst op zo'n doek (de verhouding maakt niet uit: het doek leest in breukdelen). */
const machtOnder = (n) => { let p = 1; while (p * 2 <= n) p *= 2; return p; };
function naarDoek(img, maxB) {
  const b = machtOnder(Math.min(img.naturalWidth, maxB)), h = machtOnder(Math.min(img.naturalHeight, maxB));
  const c = document.createElement('canvas'); c.width = b; c.height = h;
  const g = c.getContext('2d');
  if (!g) return null;
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.drawImage(img, 0, 0, b, h);
  return c;
}

export function maakDoek(canvas, video, data) {
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false, preserveDrawingBuffer: false });
  if (!gl) return null;
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o) || 'shader'); return o; };
  const pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
  gl.useProgram(pr);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const lp = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(lp); gl.vertexAttribPointer(lp, 2, gl.FLOAT, false, 0, 0);
  const U = {};
  for (const n of ['uVid', 'uLap', 'uFon', 'uHL', 'uHF', 'uL', 'uF', 'uCL', 'uCF', 'uRand', 'uBoven', 'uVeeg', 'uSchuif']) U[n] = gl.getUniformLocation(pr, n);
  const aniso = gl.getExtension('EXT_texture_filter_anisotropic') || gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');
  const tex = (eenheid, naam) => {
    const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + eenheid); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.uniform1i(U[naam], eenheid); return t;
  };
  const tVid = tex(0, 'uVid'), tLap = tex(1, 'uLap'), tFon = tex(2, 'uFon');
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.clearColor(0, 0, 0, 0);

  /* de hoeken per beeld → de inverse matrices (beeldpunt → plek in het scherm) */
  const per = data.schermen.map(([l, f]) => [l ? kolom(inverse(vierkantNaarVier(ruimer(l, RUIMER, data.b, data.h)))) : null, f ? kolom(inverse(vierkantNaarVier(ruimer(f, RUIMER, data.b, data.h)))) : null]);
  /* de uitsnede (cover), uit de verhouding van het scherm in beeld 0 (in beeldpunten van de video) */
  const vh = (q) => Math.hypot((q[1][0] - q[0][0]) * data.b, (q[1][1] - q[0][1]) * data.h) / Math.hypot((q[3][0] - q[0][0]) * data.b, (q[3][1] - q[0][1]) * data.h);
  let cl = [1, 1, 0, 0], cf = [1, 1, 0, 0];
  const cover = (img, q) => {
    const ca = img.naturalWidth / img.naturalHeight, qa = vh(q);
    if (ca > qa) { const s = qa / ca; return [s, 1, (1 - s) / 2, 0]; }
    const s = ca / qa; return [1, s, 0, (1 - s) / 2];
  };
  const eerste = data.schermen[0];

  /* de maat van het canvas: alleen opnieuw lezen als die verandert */
  let maatOud = true;
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => { maatOud = true; }) : null;
  ro?.observe(canvas);
  function maat() {
    if (!maatOud && ro) return;
    maatOud = false;
    /* niet scherper dan de video zelf: een canvas breder dan de video tekent alleen opgeblazen beeldpunten */
    const r = canvas.getBoundingClientRect(), vb = video.videoWidth || video.width || 0;
    const d = Math.min(window.devicePixelRatio || 1, 2, vb && r.width ? vb / r.width : 2);
    const b = Math.max(1, Math.round(r.width * d)), h = Math.max(1, Math.round(r.height * d));
    if (canvas.width !== b || canvas.height !== h) { canvas.width = b; canvas.height = h; }
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  function laadBeeld(t, img, maxB) {
    gl.bindTexture(gl.TEXTURE_2D, t);
    const doek = naarDoek(img, maxB);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, doek || img);
    if (!doek) return;   /* geen 2d-doek: het beeld zoals het is, zonder kleinere versies */
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
  }
  function zetBeelden(lapImg, fonImg) {
    /* de winkel op 1024 × 1024 (het laptopscherm is hoogstens zo'n 1000 punten breed), de telefoonfoto op 512 × 1024 */
    gl.activeTexture(gl.TEXTURE1);
    if (lapImg && lapImg.naturalWidth) { laadBeeld(tLap, lapImg, 1024); cl = cover(lapImg, eerste[0]); }
    gl.activeTexture(gl.TEXTURE2);
    if (fonImg && fonImg.naturalWidth) { laadBeeld(tFon, fonImg, 1024); cf = cover(fonImg, eerste[1]); }
  }
  /* levering 88b: staat de video stil op hetzelfde beeld (de rit tekent elk schermbeeld), dan hoeft dat beeld niet opnieuw
     naar de grafische kaart */
  let opKaart = '';
  /* veeg: de bewegingsonscherpte als breukdeel van de breedte (levering 87); 0 of weg = scherp.
     schuif (levering 88b): [laptop naar links, telefoon naar rechts] in breukdelen van de breedte, of null */
  function teken(beeld, veeg = 0, schuif = null) {
    maat();
    const i = Math.max(0, Math.min(per.length - 1, beeld));
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tVid);
    const sleutel = video.paused && !video.seeking ? `${i}|${video.currentTime}|${video.currentSrc}|${video.videoWidth}` : '';
    if (!sleutel || sleutel !== opKaart) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video);
    opKaart = sleutel;
    const vh = video.videoHeight || video.height || 0;
    const [hl, hf] = per[i];
    gl.uniform1f(U.uL, hl ? 1 : 0); gl.uniform1f(U.uF, hf ? 1 : 0);
    if (hl) gl.uniformMatrix3fv(U.uHL, false, hl);
    if (hf) gl.uniformMatrix3fv(U.uHF, false, hf);
    gl.uniform4fv(U.uCL, cl); gl.uniform4fv(U.uCF, cf);
    gl.uniform1f(U.uRand, vh ? 1.5 / (vh / 2) : 0.002);
    gl.uniform1f(U.uBoven, (data.boven || 0) / data.h);
    gl.uniform1f(U.uVeeg, Math.max(0, Math.min(schuif ? MAX_VEEG_RIT : MAX_VEEG, veeg || 0)));
    gl.uniform3f(U.uSchuif, schuif ? schuif[0] : 0, schuif ? schuif[1] : 0, SCHUIF_GRENS);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  function weg() { ro?.disconnect(); const e = gl.getExtension('WEBGL_lose_context'); if (e) e.loseContext(); }
  return { teken, zetBeelden, weg };
}
