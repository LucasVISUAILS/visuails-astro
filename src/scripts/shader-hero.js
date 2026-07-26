// VISUAILS — hero shader: chrome surface #1, one of exactly two places the
// chrome signature is allowed to appear (the other is the logotype).
//
// A slow, domain-warped plane of brushed metal. The field is a height map; the
// normal comes off its screen-space derivative; the colour is the chrome ramp
// sampled by the REFLECTED view vector, weighted by a Schlick fresnel term so
// reflectance rises toward grazing angles the way it does on a real surface.
// That is the difference between chrome and a scrolling gradient texture: the
// bands move because the surface turns, not because a background-position is
// being animated.
//
// Two prior materials are visible in this file's history, and both were wrong
// for the same reason: a violet -> cyan colour field (the largest source of
// colour on a site whose whole argument is that the photograph is the only
// colour), then a neutral ink light-field, which was correct monochrome but
// had no signature in it at all. The geometry, the warp, and the timing have
// survived all three — only the material changes.
// Hand-written WebGL on a
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
#extension GL_OES_standard_derivatives : enable
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

/* The chrome ramp, sRGB fractions of the twelve stops in global.css's
   --chrome. Kept in sync by hand: GLSL cannot read a custom property, so this
   and the CSS token are the only duplicated palette in the project. Sequential
   smoothstep mixes rather than a texture — twelve mixes are cheaper than a
   texture fetch and there is no LUT to load before first paint. */
vec3 chromeRamp(float t){
  t = clamp(t, 0.0, 1.0);
  vec3 c = vec3(0.640, 0.645, 0.655);                                  /*   0% */
  c = mix(c, vec3(0.837, 0.845, 0.861), smoothstep(0.00, 0.09, t));    /*   9% */
  c = mix(c, vec3(0.470, 0.480, 0.499), smoothstep(0.09, 0.17, t));    /*  17% */
  c = mix(c, vec3(0.916, 0.922, 0.929), smoothstep(0.17, 0.26, t));    /*  26% */
  c = mix(c, vec3(0.561, 0.573, 0.598), smoothstep(0.26, 0.35, t));    /*  35% */
  c = mix(c, vec3(0.285, 0.291, 0.305), smoothstep(0.35, 0.44, t));    /*  44% */
  c = mix(c, vec3(0.772, 0.782, 0.794), smoothstep(0.44, 0.53, t));    /*  53% */
  c = mix(c, vec3(0.963, 0.960, 0.955), smoothstep(0.53, 0.62, t));    /*  62% warm glint */
  c = mix(c, vec3(0.401, 0.411, 0.432), smoothstep(0.62, 0.71, t));    /*  71% */
  c = mix(c, vec3(0.689, 0.694, 0.704), smoothstep(0.71, 0.80, t));    /*  80% */
  c = mix(c, vec3(0.222, 0.229, 0.244), smoothstep(0.80, 0.89, t));    /*  89% */
  c = mix(c, vec3(0.500, 0.514, 0.544), smoothstep(0.89, 1.00, t));    /* 100% */
  return c;
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

  vec3 ink = vec3(0.047, 0.051, 0.063);           /* #0C0D10 — --ink-900 */

  /* Treat the field as a height map and take its normal from the screen-space
     derivative. This is the cheap part on purpose: re-evaluating the two-stage
     warp at four offsets to get a gradient would triple the cost of the shader
     for a surface that is 55% opaque behind a scrim. Where the extension is
     missing, dFdx/dFdy return 0, the normal is flat, and the fresnel term
     below still does its job off view angle alone — the plane reads as a
     polished sheet instead of a rippled one, which degrades to something
     deliberate rather than to nothing. */
  vec2 grad = vec2(dFdx(field), dFdy(field)) * u_res * 0.055;
  vec3 n = normalize(vec3(-grad, 1.0));

  /* View vector for a plane at z=0 with the eye in front of it. The lateral
     term grows toward the frame edges, which is what makes the fresnel rise at
     grazing angles instead of being a uniform rim. */
  vec2 c = (uv - 0.5) * vec2(u_res.x / u_res.y, 1.0);
  vec3 v = normalize(vec3(-c * 1.35, 1.0));

  /* Schlick. F0 is deliberately dielectric-low rather than the ~0.9 of a real
     conductor: at metal F0 the whole plane sits at full reflectance and the
     grazing rise — the entire point — becomes invisible. */
  float F0 = 0.045;
  float F = F0 + (1.0 - F0) * pow(1.0 - max(dot(n, v), 0.0), 5.0);

  /* Sample the ramp by the reflected direction, not by the field. That is the
     whole reason this reads as metal: the bands are anchored to where the
     surface is POINTING, so a slow undulation sweeps the reflection across the
     plane rather than sliding a texture over it. */
  vec3 r = reflect(-v, n);
  float refl = clamp(r.x * 0.78 + 0.5 + 0.06 * sin(u_time * 0.05), 0.0, 1.0);
  vec3 env = chromeRamp(refl);

  /* Reflectance weights the environment; the squared term is the thin bright
     edge you get where the surface turns away hardest. */
  vec3 col = env * mix(0.42, 1.0, F) + vec3(F * F) * 0.22;
  col = mix(ink, col, 0.92);

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

  // Must be requested before compiling a shader that #extension-enables it.
  // Not fatal if absent: the fragment shader guards for a flat normal and the
  // fresnel term still runs, so the plane degrades to a polished sheet.
  gl.getExtension('OES_standard_derivatives');

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
