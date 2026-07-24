// VISUAILS — hero shader: "liquid grade". A slow, domain-warped colour field
// in the brand's own hues (deep ink → violet #7B6CF5 → cyan #5FE3F0), like
// colour-grading light moving through a dark room. Hand-written WebGL on a
// fullscreen triangle — deliberately NOT Three.js: a single 2D field doesn't
// justify ~150KB of scene graph, and raw GL keeps the page fast (Core Web
// Vitals are part of the design).
//
// Safety rails, in order of importance:
//   • ClientRouter: mounted on astro:page-load, FULLY disposed on
//     astro:before-swap — WebGL contexts are capped (~16) per tab, so a
//     persistent context per navigation would eventually crash the page.
//   • prefers-reduced-motion: renders exactly ONE frame (a still gradient),
//     no animation loop.
//   • The canvas is pure decoration behind a CSS-gradient fallback
//     (.hero-fallback) — if WebGL is missing/lost, the hero still looks
//     designed and text contrast is untouched.
//   • Pauses when the hero scrolls offscreen or the tab is hidden.
//   • DPR capped at 1.5 — a soft field needs no retina precision.

const VERT = `
attribute vec2 p;
void main(){ gl_Position = vec4(p, 0.0, 1.0); }
`;

const FRAG = `
precision mediump float;
uniform vec2 u_res;
uniform float u_time;
uniform vec2 u_mouse;

/* hash + value noise + fbm — cheap, stable on mobile GPUs */
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float noise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0; float a = 0.5;
  for(int i = 0; i < 5; i++){ v += a * noise(p); p = p * 2.03 + vec2(11.7, 7.3); a *= 0.5; }
  return v;
}

void main(){
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 q = uv; q.x *= u_res.x / u_res.y;

  float t = u_time * 0.045;                       /* very slow — a room, not a screensaver */
  vec2 drift = (u_mouse - 0.5) * 0.22;            /* eased mouse influence */

  /* two-stage domain warp */
  vec2 w1 = vec2(fbm(q * 1.15 + t), fbm(q * 1.15 - t * 0.8 + 4.2));
  vec2 w2 = vec2(fbm(q + 2.2 * w1 + drift + t * 0.55),
                 fbm(q + 2.2 * w1 - drift - t * 0.4 + 8.9));
  float field = fbm(q * 1.3 + 2.6 * w2);

  /* brand palette */
  vec3 ink    = vec3(0.035, 0.035, 0.066);        /* #090911-ish */
  vec3 violet = vec3(0.484, 0.424, 0.961);        /* #7B6CF5 */
  vec3 cyan   = vec3(0.373, 0.890, 0.941);        /* #5FE3F0 */

  /* violet body, cyan only on the thin ridges of the field */
  vec3 col = ink;
  col = mix(col, violet * 0.55, smoothstep(0.42, 0.82, field));
  float ridge = smoothstep(0.62, 0.7, field) * (1.0 - smoothstep(0.7, 0.86, field));
  col = mix(col, cyan * 0.62, ridge * 0.55);

  /* keep the copy zone (left) darkest; soften right where the photo cards sit */
  float sideShade = smoothstep(0.0, 0.62, uv.x);
  col *= 0.38 + 0.5 * sideShade;

  /* vignette + bottom fade into the page background */
  float vig = smoothstep(1.25, 0.35, distance(uv, vec2(0.5, 0.55)));
  col *= 0.55 + 0.45 * vig;
  col = mix(col, ink, smoothstep(0.72, 1.0, uv.y) * 0.85);

  /* dither to kill banding on the soft ramps */
  col += (hash(gl_FragCoord.xy) - 0.5) * 0.012;

  gl_FragColor = vec4(col, 1.0);
}
`;

let instance = null;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { gl.deleteShader(s); return null; }
  return s;
}

function mount() {
  const canvas = document.getElementById('hero-shader');
  if (!canvas || instance) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
  if (!gl) return; // .hero-fallback carries the look

  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;
  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(prog, 'u_res');
  const uTime = gl.getUniformLocation(prog, 'u_time');
  const uMouse = gl.getUniformLocation(prog, 'u_mouse');

  const st = {
    canvas, gl, prog, buf, vs, fs,
    raf: 0, running: false, visible: true, lost: false,
    t0: performance.now(),
    mx: 0.5, my: 0.5, tmx: 0.5, tmy: 0.5,
    listeners: [], io: null,
  };
  instance = st;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }

  function frame(now) {
    st.raf = 0;
    if (st.lost) return;
    resize();
    st.mx += (st.tmx - st.mx) * 0.04;               // heavy easing — light, not a cursor toy
    st.my += (st.tmy - st.my) * 0.04;
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, (now - st.t0) / 1000);
    gl.uniform2f(uMouse, st.mx, st.my);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (st.running && st.visible && !document.hidden && !reduce) st.raf = requestAnimationFrame(frame);
  }

  function play() {
    if (!st.raf && !st.lost) { st.running = true; st.raf = requestAnimationFrame(frame); }
  }
  function pause() { st.running = false; if (st.raf) { cancelAnimationFrame(st.raf); st.raf = 0; } }

  const on = (target, ev, fn, opts) => { target.addEventListener(ev, fn, opts); st.listeners.push([target, ev, fn]); };

  on(window, 'pointermove', (e) => {
    st.tmx = e.clientX / window.innerWidth;
    st.tmy = 1 - e.clientY / window.innerHeight;
  }, { passive: true });
  on(document, 'visibilitychange', () => { document.hidden ? pause() : (st.visible && play()); });
  on(canvas, 'webglcontextlost', (e) => { e.preventDefault(); st.lost = true; pause(); canvas.style.opacity = '0'; });

  st.io = new IntersectionObserver((entries) => {
    st.visible = entries[0].isIntersecting;
    st.visible ? play() : pause();
  }, { rootMargin: '80px' });
  st.io.observe(canvas);

  if (reduce) { resize(); frame(performance.now()); } // one still frame
  else play();
}

function dispose() {
  const st = instance;
  if (!st) return;
  instance = null;
  st.running = false;
  if (st.raf) cancelAnimationFrame(st.raf);
  if (st.io) st.io.disconnect();
  st.listeners.forEach(([t, ev, fn]) => t.removeEventListener(ev, fn));
  try {
    const gl = st.gl;
    gl.deleteBuffer(st.buf); gl.deleteProgram(st.prog);
    gl.deleteShader(st.vs); gl.deleteShader(st.fs);
    const ext = gl.getExtension('WEBGL_lose_context');
    if (ext) ext.loseContext();                      // free the context slot immediately
  } catch (e) { /* context already gone */ }
}

document.addEventListener('astro:page-load', mount);
document.addEventListener('astro:before-swap', dispose);
mount();
