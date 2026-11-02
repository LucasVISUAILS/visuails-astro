/* VISUAILS — het doek van de laptopvideo (levering 80, 1 november 2026).
   ═══════════════════════════════════════════════════════════════════════════════
   Tekent de gestapelde video (drie banden: kleur, dekking, gaten; scripts/laptop-video.py) met WebGL op een
   doorzichtig canvas, zodat de grond van de site er precies doorheen schijnt. In de twee gaten (het
   laptopscherm en het telefoonscherm) komt per beeld de winkel en de telefoonfoto, in perspectief:
   de hoeken per beeld staan in src/data/laptopVideo.json (gemeten uit de video).

   maakDoek(canvas, video, schermen) → { teken(beeld), zetBeelden(lapImg, fonImg), weg() } of null
   (geen WebGL: dan blijft de stilstaande foto staan en speelt er niets).
   ═══════════════════════════════════════════════════════════════════════════════ */

const VS = `attribute vec2 p; varying vec2 v; void main(){ v = vec2(p.x * .5 + .5, .5 - p.y * .5); gl_Position = vec4(p, 0., 1.); }`;
const FS = `precision highp float;
varying vec2 v;
uniform sampler2D uVid, uLap, uFon;
uniform mat3 uHL, uHF;
uniform float uL, uF;
uniform vec4 uCL, uCF;   /* uitsnede (cover): schaal x, schaal y, verschuiving x, y */
vec4 scherm(sampler2D t, mat3 h, vec4 c) {
  vec3 q = h * vec3(v, 1.);
  vec2 u = q.xy / q.z;
  if (q.z <= 0. || u.x < -.004 || u.y < -.004 || u.x > 1.004 || u.y > 1.004) return vec4(0.);
  u = clamp(u, 0., 1.) * c.xy + c.zw;
  return vec4(texture2D(t, u).rgb, 1.);
}
uniform float uRand;   /* een halve rij van een band: niet over de grens tussen twee banden lezen */
void main(){
  /* drie banden onder elkaar: de kleur, de dekking en de gaten (scripts/laptop-video.mjs) */
  float y = clamp(v.y, uRand, 1. - uRand) / 3.;
  vec3 kl = texture2D(uVid, vec2(v.x, y)).rgb;
  float a = texture2D(uVid, vec2(v.x, y + 1. / 3.)).r;
  float g = texture2D(uVid, vec2(v.x, y + 2. / 3.)).r;
  a = clamp((a - .03) / .94, 0., 1.);
  g = clamp((g - .03) / .94, 0., 1.);
  vec4 s = vec4(0.);
  if (uL > .5) s = scherm(uLap, uHL, uCL);
  if (uF > .5 && s.a < .5) s = scherm(uFon, uHF, uCF);
  /* het scherm alleen in het gat (nooit op de grond), en voorvermenigvuldigd onder de video */
  float sa = s.a * g;
  vec3 rgb = kl * a + s.rgb * sa;
  float uitA = min(1., a + sa);
  gl_FragColor = vec4(rgb, uitA);
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
/* een vierhoek k beeldpunten ruimer maken vanuit zijn midden (b × h: de maat van de video), zodat de
   rand van het toestel hem afsnijdt en er nergens een haarlijn grond langs het scherm komt */
function ruimer(q, k, b, h) {
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
  /* een vak van b × h px (in breukdelen van het beeld) op de vierhoek q, in px van het vak .o8-foto */
  const m = vierkantNaarVier(q);
  const [a, bb, c, d, e, f, g, hh] = m;
  return `matrix3d(${[a / b, d / b, 0, g / b, bb / h, e / h, 0, hh / h, 0, 0, 1, 0, c, f, 0, 1].join(',')})`;
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
  const U = (n) => gl.getUniformLocation(pr, n);
  const tex = (eenheid, naam) => {
    const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + eenheid); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.uniform1i(U(naam), eenheid); return t;
  };
  const tVid = tex(0, 'uVid'), tLap = tex(1, 'uLap'), tFon = tex(2, 'uFon');
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.clearColor(0, 0, 0, 0);

  /* de hoeken per beeld → de inverse matrices (beeldpunt → plek in het scherm) */
  const per = data.schermen.map(([l, f]) => [l ? kolom(inverse(vierkantNaarVier(ruimer(l, 3, data.b, data.h)))) : null, f ? kolom(inverse(vierkantNaarVier(ruimer(f, 3, data.b, data.h)))) : null]);
  /* de uitsnede (cover), uit de verhouding van het scherm in beeld 0 (in beeldpunten van de video) */
  const vh = (q) => Math.hypot((q[1][0] - q[0][0]) * data.b, (q[1][1] - q[0][1]) * data.h) / Math.hypot((q[3][0] - q[0][0]) * data.b, (q[3][1] - q[0][1]) * data.h);
  let cl = [1, 1, 0, 0], cf = [1, 1, 0, 0];
  const cover = (img, q) => {
    const ca = img.naturalWidth / img.naturalHeight, qa = vh(q);
    if (ca > qa) { const s = qa / ca; return [s, 1, (1 - s) / 2, 0]; }
    const s = ca / qa; return [1, s, 0, (1 - s) / 2];
  };
  const eerste = data.schermen[0];

  function maat() {
    const r = canvas.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2);
    const b = Math.max(1, Math.round(r.width * d)), h = Math.max(1, Math.round(r.height * d));
    if (canvas.width !== b || canvas.height !== h) { canvas.width = b; canvas.height = h; }
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  function zetBeelden(lapImg, fonImg) {
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tLap);
    if (lapImg && lapImg.naturalWidth) { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, lapImg); cl = cover(lapImg, eerste[0]); }
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, tFon);
    if (fonImg && fonImg.naturalWidth) { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, fonImg); cf = cover(fonImg, eerste[1]); }
  }
  function teken(beeld) {
    maat();
    const i = Math.max(0, Math.min(per.length - 1, beeld));
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tVid);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video);
    const [hl, hf] = per[i];
    gl.uniform1f(U('uL'), hl ? 1 : 0); gl.uniform1f(U('uF'), hf ? 1 : 0);
    if (hl) gl.uniformMatrix3fv(U('uHL'), false, hl);
    if (hf) gl.uniformMatrix3fv(U('uHF'), false, hf);
    gl.uniform4fv(U('uCL'), cl); gl.uniform4fv(U('uCF'), cf);
    gl.uniform1f(U('uRand'), video.videoHeight ? 1.5 / (video.videoHeight / 3) : 0.002);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  function weg() { const e = gl.getExtension('WEBGL_lose_context'); if (e) e.loseContext(); }
  return { teken, zetBeelden, weg };
}
