/*
 * VISUAILS — het kaartveld (levering 100, stap 2; kladblok/PLAN-KAARTVELD-100.md, docs/KLEURENSCHEMA.md "Levering 100").
 *
 * Eén grote kaart zo breed als het scherm en zo hoog als de pagina, met veel kenmerken door elkaar (de grond, de band, de
 * snede, de gloed, de horizon, korrel). Elke kaart op de site ([data-kaart]) is een venster op zijn eigen stuk ervan, en
 * waar een streep de rand kruist loopt hij door als ader in het wit. Lucas koos in lijst 104 en de chat van 14 november:
 * zwart met mint, de strepen staan stil en alleen het licht ademt, een puls trekt door elke lijn en stopt aan het eind
 * van de ader, de witte binnenkant van de ader snijdt de kaart in.
 *
 * LEVERING 108 (Lucas, 15 november 21:47): "de groene kaarten een soort matte look ... helemaal geen outerline ... heel glad
 * en smooth. De aderen ... een soort chrome shiny achtige feeling maar heel subtiel en minimaal, alsof dat de bedrading van
 * de website is die in het wit verdwijnt en in de kaarten licht te zien is met stroom erdoorheen." Dus: geen korrel meer
 * (mat en glad), geen lichte rand langs de kaart, en de harde lijn is nu een dunne draad van chroom (een donkere rand, een
 * smalle glans, een zwakke tweede weerkaatsing) die als ader het wit in loopt en daar langzaam in het wit verdwijnt. Door
 * de draad trekken zachte golven van licht (de stroom), in de kaart en in de ader op hetzelfde moment.
 * Lucas, 22:31: "Ik wil dat de Chrome aderen wel gebruik maken van het kleurenschema en de glow erop ook." Dus de draad in de
 * mint-trap (randen mint 900, lijf mint 600, glans mint 300 naar wit) en een zachte gloed van mint 500 om de draad, in de kaart
 * en in het wit; de stroom maakt glans en gloed even feller.
 *
 * HOE HET IN DE SITE ZIT: één WebGL-doek buiten de pagina tekent het veld zo groot als het venster (doorzichtig buiten de
 * kaarten). Elke kaart krijgt een eigen 2D-doek (canvas.kv-doek, 150 px ruimer dan de kaart, voor de aderen) en kopieert
 * daar elk beeld zijn stuk naartoe. Zo blijven de kaarten gewone blokken tussen de andere secties.
 * Tekst op een kaart staat in [data-tekstvlak]: daaronder wijkt het licht (wit haalt minstens 7,6 : 1, gemeten).
 * Zonder WebGL, of tot het eerste beeld er is, toont de kaart zijn css-verloop (kaart-100.css). Bij minder beweging staat
 * het veld stil: één beeld, geen lus. Buiten beeld en in een verborgen tabblad tekent het niet.
 */
/* de kaarten: alles met [data-kaart], en de vier blokken die eerst fotoblokken waren (lijst 86 → levering 100) */
/* levering 108 (lijst 115, Q3 a): de Studiobrief op /editions staat in de slotkaart zonder eigen vlak, dus geen kaart meer */
const KAART_SEL = '[data-kaart], .h-proef > .h-proef-woord, .h-lk-slot, .site-footer .sb, .h-gd-brief, .h-nf-getal';
const KAARTEN = [...document.querySelectorAll(`body.hal :is(${KAART_SEL})`)];
/* window.__kvUit: alleen voor toetsen die over iets anders gaan (in een browser zonder grafische kaart kost het veld daar
   bijna alle tijd); de kaarten tonen dan hun css-verloop. tests/kaartveld-100-browser.test.mjs meet het veld wel. */
if (KAARTEN.length && !window.__kvUit) start();

function start() {
  const RAND = 0, MAX = 12;   /* levering 113: geen aderen meer, dus geen ruimte om de kaart (was 150) */
  const doek = document.createElement('canvas');
  const gl = doek.getContext('webgl', { antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: false, alpha: true });
  if (!gl) { document.documentElement.classList.add('kv-geen'); return; }
  const VS = 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0., 1.); }';
  var FS = [
    'precision highp float;',
    'uniform vec2 uRes; uniform float uScroll; uniform float uTijd; uniform float uDpr; uniform float uHeel; uniform float uLus; uniform float uBreed; uniform vec2 uVerschuif;',
    'uniform vec4 uKaart[' + MAX + ']; uniform int uN; uniform vec4 uTekst[' + MAX + ']; uniform int uNT; uniform vec4 uLijn[' + MAX + '];',
    'const vec3 ZW = vec3(0.035,0.051,0.043);',            /* zwart #090D0B */
    'const vec3 M950 = vec3(0.004,0.078,0.043);',          /* #01140B */
    'const vec3 M900 = vec3(0.0,0.141,0.086);',            /* #002416 */
    'const vec3 M800 = vec3(0.008,0.239,0.161);',          /* #023D29 */
    'const vec3 M700 = vec3(0.004,0.4,0.271);',            /* #016645 */
    'const vec3 M600 = vec3(0.067,0.592,0.416);',          /* #11976A */
    'const vec3 M500 = vec3(0.239,1.0,0.69);',             /* #3DFFB0 */
    'const vec3 M300 = vec3(0.616,0.961,0.824);',          /* #9DF5D2 */
    'const vec3 M100 = vec3(0.894,0.988,0.937);',          /* #E4FCEF */
    'float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
    'float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3. - 2.*f); return mix(mix(h(i), h(i + vec2(1., 0.)), f.x), mix(h(i + vec2(0., 1.)), h(i + vec2(1., 1.)), f.x), f.y); }',
    'float doos(vec2 p, vec4 r, float rad){ vec2 c = r.xy + r.zw*.5; vec2 q = abs(p - c) - r.zw*.5 + rad; return length(max(q, 0.)) + min(max(q.x, q.y), 0.) - rad; }',
    'float vlek(vec2 p, vec2 c, float r){ float d = length(p - c)/r; return exp(-d*d*2.2); }',
    'float lijn(float d, float b){ return exp(-pow(d/b, 2.)); }',
    /* DE EIGEN LIJN VAN KAART i (Lucas, 17:31): elke kaart heeft één harde lijn en dus hoogstens één ader. De lijn begint
       zacht in de kaart en loopt maar aan één kant de rand uit. Zijn vorm hoort bij de look van de kaart (look = i mod 5):
       0 zijde (een brede vouw van licht, zoals de golf in de logo-animatie), 1 nacht, 2 mint, 3 horizon, 4 gloed. */
    'float gD;',                                                                   /* de afstand tot de dichtstbijzijnde kaart (per pixel) */
    'float look(int i){ return mod(float(i), 5.); }',
    /* levering 109 (Lucas, 16 nov 00:00: "Ik wil dat de kabels niet in de buurt komen van teksten en knoppen"): waar de lijn
       ligt, kiest het script per kaart (lijnVoor): uit de vorm van de look en zijn spiegelingen de ligging die het verst van de
       tekst en de knoppen blijft. uLijn[i] = het midden (0..1 in de kaart) en de richting. */
    'vec4 lgeo(int i, vec4 r){ vec4 l = vec4(.7, .6, .92, .39); for (int k = 0; k < ' + MAX + '; k++){ if (k == i) l = uLijn[k]; } return vec4(r.xy + r.zw*l.xy, l.zw); }',
    'float lboog(int i){ float L = look(i); return L < .5 ? .0006 : L < 1.5 ? .0002 : L < 2.5 ? -.0003 : L < 3.5 ? .00015 : .0007; }',
    /* x = de afstand tot de lijn (px, met teken), y = hoe sterk hij hier is, z = de plek langs de lijn */
    'vec3 kaartDl(vec2 q, int i, vec4 r, float golf){',
    '  vec4 g = lgeo(i, r); vec2 c0 = g.xy, dir = g.zw, nrm = vec2(-dir.y, dir.x);',
    '  vec2 v = q - c0; float langs = dot(v, dir);',
    '  float dl = dot(v, nrm) + lboog(i)*langs*langs;',
    '  float tx = (dir.x > 0. ? c0.x - r.x : r.x + r.z - c0.x) / max(abs(dir.x), 1e-3);',
    '  float ty = (dir.y > 0. ? c0.y - r.y : r.y + r.w - c0.y) / max(abs(dir.y), 1e-3);',
    '  float tb = min(tx, ty);',                                                   /* de afstand van het midden tot de rand achter de lijn */
    '  float dk = doos(q, r, 18.);',
    '  float amp = smoothstep(-.6*tb, -.15*tb, langs) * exp(-max(dk, 0.)/90.) * smoothstep(20., 0., dk - gD);',   /* alleen bij zijn eigen kaart: nooit door een andere kaart heen (17:31) */   /* hij begint in de kaart: één uiteinde, één ader */
    '  return vec3(dl, amp, langs + tb); }',
    /* DE DRAAD (levering 108): chroom, dun en stil. s = de plek dwars over de draad (-1 … 1): donkere randen, een smalle
       glans net naast het midden en een zwakke tweede weerkaatsing aan de andere kant, zoals licht op een ronde draad. */
    'const float DRAAD = 1.5;',                                                     /* de halve dikte in px: 3 px breed (levering 109: subtieler) */
    'float chroom(float s){ return .16 + .84*exp(-pow((s + .3)/.32, 2.)) + .28*exp(-pow((s - .58)/.18, 2.)); }',
    /* DE STROOM (levering 108): zachte golven van licht die door de draad trekken, elke 320 px een, 90 px per seconde, per
       kaart op zijn eigen moment. Ze lopen door in de ader en verdwijnen met de draad in het wit. */
    'float stroom(float a, float fase){ float g = .5 + .5*sin((a/320. - uTijd*.28 + fase)*6.2832); return g*g*g*g*g*g; }',
    /* in het kleurenschema (Lucas, 22:31): de randen diep groen (mint 900 naar zwart), het lijf mint 600, de glans mint 300 naar
       bijna wit; de stroom maakt de glans feller */
    'vec3 draadKleur(float s, float st){ float c = chroom(clamp(s, -1., 1.)); vec3 k = mix(mix(M900, ZW, .35), mix(M700, M600, .5), smoothstep(.1, .55, c)); return mix(k, mix(M300, M600, .35), smoothstep(.55, 1.05, c) * (.4 + .4*st)); }',
    /* in de kaart (levering 109: "donkerder door de kaart heen alsof ze erin zitten"): de draad ligt in het vlak, diep groen met
       een zwakke glans; alleen de stroom licht hem even op */
    'vec3 draadIn(float s, float st){ float c = chroom(clamp(s, -1., 1.)); vec3 k = mix(ZW*.6, M900, smoothstep(.1, .55, c)); return mix(k, mix(M800, M600, .35 + .45*st), smoothstep(.55, 1.05, c) * (.35 + .5*st)); }',
    /* een gloed die zacht afloopt: een smalle kern en een lange, zwakke staart (levering 109) */
    'float gloed(float d, float b){ float x = d/b; return .55*exp(-x*x) + .45/(1. + x*x*.9) * smoothstep(b*9., b*2., abs(d)); }',
    'float W;',
    /* voor de ader: de lijn van de kaart die het dichtstbij is (alleen de eigen lijnen van de kaarten maken aderen) */
    'vec4 naast(vec2 q, float golf){',
    '  float bdl = 1e4, bs = 0., ba = 0., bf = 0.; float sc;',
    '  for (int i = 0; i < ' + MAX + '; i++){ if (i >= uN) break; if (doos(q, uKaart[i], 18.) - gD > 20.) continue; vec3 kd = kaartDl(q, i, uKaart[i], golf); sc = kd.y*lijn(kd.x, 40.); if (sc > bs){ bs = sc; bdl = kd.x; ba = kd.z; bf = h(vec2(float(i), 11.)); } }',
    '  return vec4(bdl, bs, ba, bf); }',
    'float dmin(vec2 q){ float d = 1e5; for (int i = 0; i < ' + MAX + '; i++){ if (i >= uN) break; d = min(d, doos(q, uKaart[i], 18.)); } return d; }',
    'void main(){',
    '  vec2 f = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uDpr;',
    '  vec2 q = vec2(f.x, f.y + uScroll);',                     /* de plek op de pagina */
    '  float d = 1e5;',
    '  for (int i = 0; i < ' + MAX + '; i++){ if (i >= uN) break; d = min(d, doos(q, uKaart[i], 18.)); }',
    '  if (uHeel < .5 && d > 1.5){ gl_FragColor = vec4(0.); return; }',            /* buiten de kaart: doorzichtig (levering 113: geen aderen meer) */
    '  vec2 p = q + uVerschuif;',
    '  gD = d;',                               /* de plek op de grote kaart */
    '  W = uBreed;',
    /* het ademen: niets verschuift. Alles wordt traag breder en feller en weer smaller (0 → 1 → 0, als een zachte cosinus),
       en de lijnen golven op hun plek met een staande golf (hun midden en hun uiteinden blijven staan) */
    '  float T = uLus, u = fract(uTijd / T);',
    '  float adem = .5 - .5*cos(u*6.2832);',
    '  float golf = 0.;',                                                            /* niets beweegt letterlijk (Lucas, 05:26) */
    '  float lg = .5 + .5*sin(dot(q, vec2(.6, .8))/340. - u*6.2832);',             /* een golf van licht die door de lijnen trekt; de lijnen zelf staan stil */
    '  float sm = 1., fel = (.74 + .26*adem) * (.86 + .28*lg);',
    '  float fn = smoothstep(.62, 1.12, fel);',                                       /* 0 = de donkere kant van de adem, 1 = de lichte */
    '  vec2 pz = p;',
    /* DE ADEREN EN DE DRAAD (levering 101 tot 109) zijn weg (levering 113, Lucas 16 november 20:30: "Haal de aderen/bedrading
       helemaal uit de website, hier krijg je toch lag van"). De kaart heeft alleen nog zijn veld, zijn look, zijn vouw en korrel. */
    /* het licht blijft van de tekst weg */
    '  float weg = 1., zacht = 1., vrij = 1.;',
    '  for (int i = 0; i < ' + MAX + '; i++){ if (i >= uNT) break; float dt = doos(q, uTekst[i], 40.); float s0 = smoothstep(-30., 260., dt); weg = min(weg, s0); zacht = min(zacht, mix(.5, 1., s0)); vrij = min(vrij, smoothstep(18., 64., doos(q, uTekst[i], 10.))); }',   /* vrij: 0 bij tekst en knoppen, 1 vanaf 64 px; de draad blijft daar weg (levering 109) */
    /* A · de grond, met meer verschil (Lucas, 04:28): diep zwart in de ene hoek, een ruim groen vlak in de andere, zoals
       het blauw en het licht in de logo-animatie, maar alleen in zwart en groen. Het staat stil; het ademt alleen. */
    '  float n1 = vn(p/1300.), n2 = vn(p/2100. + vec2(7.3, 2.1)), n3 = vn(p/3400. + vec2(2.9, 5.7));',
    '  vec3 c = mix(ZW, M950, smoothstep(.15, .75, n1));',
    '  c = mix(c, M900, smoothstep(.45, .9, n2) * .75);',
    '  c = mix(c, M800, pow(smoothstep(.55, 1., n1*n2*1.7), 1.3) * .55);',
    '  c = mix(c, M800, smoothstep(.55, .95, n3) * .6 * zacht * (.9 + .1*adem));',                /* een ruim donkergroen vlak */
    '  c = mix(c, ZW * .55, smoothstep(.45, .12, n3) * .7);',                                         /* het diepe zwart */
    '  c = mix(c, ZW * .8, .45);',                                                   /* de grond stiller, zodat elke look zijn eigen licht draagt (17:31) */
    /* DE LOOKS (Lucas, 17:31 en lijst 108): elke kaart zijn eigen look, alleen in zwart en mint. Alle looks hebben het
       licht van gloed (lijst 108: "De kleuren van deze zijn goed. Pas dit toe bij alle"): een diep groen licht dat oploopt
       naar een fel mint punt met een bijna witte kern, en een donkere hoek ertegenover. Wat verschilt is waar het licht
       staat en de vorm eromheen. Ze vloeien zacht in elkaar over op de grote kaart (gewogen naar de afstand tot de eigen
       kaart), zonder naad. Onder tekst blijft het donker (zacht, weg). */
    '  for (int i = 0; i < ' + MAX + '; i++){ if (i >= uN) break; vec4 r = uKaart[i]; float fi = float(i);',
    '    float dk = doos(q, r, 18.); float w = exp(-max(dk, 0.)/220.) * smoothstep(50., 0., dk - gD); if (w < .003) continue;',   /* alleen bij de eigen kaart, anders mengen de looks van buren door elkaar */
    '    float L = look(i); float mx = max(r.z, r.w); vec3 kd = kaartDl(q, i, r, 0.); float sd = kd.x;',
    /* waar het licht staat (P, straal R), het felle punt (F, straal S) en de donkere hoek (D) per look */
    '    vec2 P = vec2(1., .05), F = vec2(1., 0.), D = vec2(.1, 1.); float R = 1.15, S = .6, Rd = .6;',             /* 4 · gloed */
    '    if (L < .5){ P = vec2(.95, .9); F = vec2(1., 1.); D = vec2(0., 0.); R = 1.; S = .55; }',                     /* 0 · zijde: het licht onder de vouw, rechtsonder */
    '    else if (L < 1.5){ P = vec2(1., 1.); F = vec2(1., 1.); D = vec2(0., 0.); R = .65; S = .32; Rd = .9; }',     /* 1 · nacht: een klein licht in de hoek, verder zwart */
    '    else if (L < 2.5){ P = vec2(.85, .65); F = vec2(1., .9); D = vec2(0., 0.); R = 1.5; S = .7; Rd = .5; }',   /* 2 · mint: een groot licht, bijna de hele kaart */
    '    else if (L < 3.5){ P = vec2(.8, .5); F = vec2(1., .55); D = vec2(.2, 1.); R = .9; S = .45; }',              /* 3 · horizon: het licht op de lijn, rechts */
    '    c = mix(c, ZW * .6, (L > .5 && L < 1.5 ? .85 : .5) * w);',
    '    c = mix(c, mix(M800, M700, .85), vlek(q, r.xy + r.zw*P, mx*R) * w * (L > 1.5 && L < 2.5 ? zacht*zacht : zacht));',
    '    c = mix(c, M600, vlek(q, r.xy + r.zw*F, mx*S) * .9 * w * mix(.15, 1., weg) * fel);',
    '    c = mix(c, mix(M600, M300, .4), vlek(q, r.xy + r.zw*F, mx*S*.37) * .6 * w * mix(.05, 1., weg) * fel);',
    '    c = mix(c, ZW * .55, vlek(q, r.xy + r.zw*D, mx*Rd) * .6 * w);',
    '    if (L < .5){',                                                               /* zijde: de vouw zelf, in dezelfde kleuren */
    '      c = mix(c, ZW * .7, smoothstep(30., 380., sd) * smoothstep(1., .5, vlek(q, r.xy + r.zw*F, mx*S)) * .4 * w);',
    '      c = mix(c, mix(M800, M700, .85), lijn(sd + 50., 200.) * .8 * w * zacht * fel);',
    '      c = mix(c, M600, lijn(sd + 18., 60.) * .7 * w * mix(.15, 1., weg) * fel);',
    '      c = mix(c, mix(M600, M300, .4), lijn(sd + 8., 18.) * .45 * w * mix(.05, 1., weg) * fel); }',
    '    else if (L > 2.5 && L < 3.5){',                                              /* horizon: licht boven de lijn, nacht eronder */
    '      float bov = smoothstep(6. + 160.*(1. - kd.y), -2., sd);',
    '      c = mix(c, M600, smoothstep(-120., -2., sd) * bov * vlek(q, r.xy + r.zw*P, mx*1.2) * .7 * w * mix(.15, 1., weg) * fel);',
    '      c = mix(c, ZW * .5, smoothstep(0., 240., sd) * .7 * w); }',
    /* DE VOUW (levering 109, Lucas: "de kaart zelf ook nog wel wat meer variatie … zoals in de animatie qua achtergrond maar dan
       wel verschillend van elkaar"): over elke kaart loopt een brede, zachte vouw van licht, zoals de golf in de logo-animatie,
       maar per kaart in een andere hoek, op een andere plek, met een andere breedte en buiging. Aan de ene kant licht, aan de
       andere kant zakt hij weg in het donker. */
    '    float ha = h(vec2(fi, 21.)), hb = h(vec2(fi, 22.)), hc = h(vec2(fi, 23.)), hd = h(vec2(fi, 24.));',
    '    float ang = ha*3.1416; vec2 vt = vec2(cos(ang), sin(ang)), vnn = vec2(-vt.y, vt.x);',
    '    vec2 vc = r.xy + r.zw*vec2(.25 + .5*hb, .2 + .6*hc);',
    '    float va = dot(q - vc, vt), vb = dot(q - vc, vnn) + sin(va/(mx*.55) + hd*6.2832)*mx*(.05 + .07*hd);',
    '    float vw = mx*(.08 + .12*hc);',
    '    float rug = exp(-pow(vb/vw, 2.)), lichtkant = exp(-pow((vb + vw*1.6)/(vw*2.6), 2.)), donker = smoothstep(vw*.6, vw*4., vb);',
    '    c = mix(c, ZW*.55, donker * (.25 + .25*hb) * w);',
    '    c = mix(c, mix(M800, M700, .55), lichtkant * (.6 + .25*hd) * w * zacht * fel);',
    '    c = mix(c, mix(M700, M600, .6), rug * (.7 + .25*ha) * w * mix(.15, 1., weg) * fel);',
    '    c = mix(c, mix(M600, M300, .3), pow(rug, 3.) * .35 * w * mix(.05, 1., weg) * fel);',
    '  }',
    /* F · fijne filmkorrel (levering 109, Lucas: "ook mis ik de film grain op de kaart"): fijn en zacht, zoals in de
       logo-animatie, zodat de kaart mat blijft; hij verspringt 8 keer per seconde, bij minder beweging staat hij stil */
    '  vec2 kp = floor(gl_FragCoord.xy / max(1., uDpr)) + floor(uTijd*8.)*vec2(17., 31.);',
    '  float kr = h(kp) + h(kp*1.37 + 3.1) - 1.; float lum = dot(c, vec3(.2126, .7152, .0722));',
    '  c += kr * .045 * (.55 + 1.6*lum);',
    '  float rand = smoothstep(1.5, -.5, d);',
    '  if (uHeel > .5){ gl_FragColor = vec4(c, 1.); return; }',
    '  gl_FragColor = vec4(clamp(c, 0., 1.), rand);',                                  /* de kaart dicht, daarbuiten niets */
    '}'].join('\n');
  const maak = (type, bron) => { const s = gl.createShader(type); gl.shaderSource(s, bron); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  let prog;
  try { prog = gl.createProgram(); gl.attachShader(prog, maak(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, maak(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog); if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog)); }
  catch (e) { console.warn('kaartveld', e); document.documentElement.classList.add('kv-geen'); return; }
  gl.useProgram(prog);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aLoc = gl.getAttribLocation(prog, 'a'); gl.enableVertexAttribArray(aLoc); gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0);
  const U = {}; ['uRes', 'uScroll', 'uTijd', 'uDpr', 'uHeel', 'uLus', 'uN', 'uNT', 'uBreed', 'uVerschuif'].forEach((n) => { U[n] = gl.getUniformLocation(prog, n); });
  const uKaart = gl.getUniformLocation(prog, 'uKaart'), uTekst = gl.getUniformLocation(prog, 'uTekst'), uLijn = gl.getUniformLocation(prog, 'uLijn');
  gl.clearColor(0, 0, 0, 0);

  const kaarten = KAARTEN.slice(0, MAX).map((el) => {
    const c = document.createElement('canvas'); c.className = 'kv-doek'; c.setAttribute('aria-hidden', 'true');
    /* een kaart op zwart (de Studiobrief in de voet): geen aderen, het veld blijft binnen de kaart (aderen zijn voor het wit) */
    const opZwart = !!el.closest('.site-footer');
    el.prepend(c); return { el, c, ctx: c.getContext('2d'), zicht: false, opZwart };
  });
  /* de tekst op een kaart: [data-tekstvlak], en anders elk kind van de kaart met tekst of een beeld (niet het doek) */
  const teksten = () => kaarten.flatMap((k) => {
    const m = [...k.el.querySelectorAll('[data-tekstvlak]')];
    return m.length ? m : [...k.el.children].filter((c) => c.tagName !== 'CANVAS' && (c.textContent.trim() || c.matches('svg, img') || c.querySelector('svg, img')) && c.getBoundingClientRect().height > 0);   /* ook een beeld (de witte V op de 404) */
  }).slice(0, MAX);
  const minder = matchMedia('(prefers-reduced-motion: reduce)');
  let dpr = 1, rechth = new Float32Array(MAX * 4), tekstR = new Float32Array(MAX * 4), nT = 0, lijnen = new Float32Array(MAX * 4);
  /* DE LIJN VAN ELKE KAART, WEG VAN TEKST EN KNOPPEN (levering 109): per look de vorm (midden, richting, buiging), en daarvan
     de acht spiegelingen. Per kaart wint de ligging waarvan het zichtbare stuk het verst van alle tekst, knoppen en beelden
     op de kaart blijft. Het uiteinde (waar de lijn de kaart uit gaat) gaat naar het lichtnet (lichtnet.js). */
  const LOOKS = [[.70, .60, .92, .39, .0006], [.78, .55, .6, .8, .0002], [.74, .45, -.6, .8, -.0003], [.58, .68, .9968, -.08, .00015], [.80, .42, .8, -.6, .0007]];
  const vakken = (el) => [...el.querySelectorAll('h1, h2, h3, h4, p, li, a, button, input, img, svg, .h-pil, .h-getal, [data-tekstvlak]')]
    .filter((e) => !e.closest('canvas') && e.getBoundingClientRect().width > 0).map(pag);
  const afstandTot = (x, y, vs) => vs.reduce((m, v) => Math.min(m, Math.hypot(Math.max(v[0] - x, 0, x - v[0] - v[2]), Math.max(v[1] - y, 0, y - v[1] - v[3]))), 1e9);
  function lijnVoor(i, r, vs) {
    const [cx, cy, dx0, dy0, lb] = LOOKS[i % 5];
    let best = null;
    for (const sx of [1, -1]) for (const sy of [1, -1]) for (const sg of [1, -1]) {
      const c = [sx > 0 ? cx : 1 - cx, sy > 0 ? cy : 1 - cy], d = [dx0 * sx * sg, dy0 * sy * sg];
      const C = [r[0] + r[2] * c[0], r[1] + r[3] * c[1]], n = [-d[1], d[0]];
      const tx = (d[0] > 0 ? C[0] - r[0] : r[0] + r[2] - C[0]) / Math.max(Math.abs(d[0]), 1e-3), ty = (d[1] > 0 ? C[1] - r[1] : r[1] + r[3] - C[1]) / Math.max(Math.abs(d[1]), 1e-3);
      const tb = Math.min(tx, ty), punt = (l) => [C[0] + d[0] * l - n[0] * lb * l * l, C[1] + d[1] * l - n[1] * lb * l * l];
      const binnen = (p) => p[0] > r[0] && p[0] < r[0] + r[2] && p[1] > r[1] && p[1] < r[1] + r[3];
      let l = 0; while (l < 4000 && binnen(punt(l))) l += 2;
      let score = 1e9;
      for (let k = 0; k <= 32; k++) { const p = punt(-.45 * tb + (l + .45 * tb) * k / 32); score = Math.min(score, afstandTot(p[0], p[1], vs)); }
      if (!best || score > best.score + 4) best = { score, c, d, exit: punt(l), raak: [d[0] - 2 * lb * l * n[0], d[1] - 2 * lb * l * n[1]] };
    }
    return best;
  }
  const pag = (el) => { const r = el.getBoundingClientRect(); return [r.left + scrollX, r.top + scrollY, r.width, r.height]; };

  function meet() {
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    doek.width = Math.round(innerWidth * dpr); doek.height = Math.round(innerHeight * dpr);
    gl.viewport(0, 0, doek.width, doek.height);
    rechth.fill(0); kaarten.forEach((k, i) => rechth.set(pag(k.el), i * 4));
    lijnen.fill(0);
    const uiteinden = kaarten.map((k, i) => {
      const r = pag(k.el); if (r[2] < 2 || r[3] < 2) return null;   /* een verborgen kaart heeft geen lijn */
      const b = lijnVoor(i, r, vakken(k.el)); lijnen.set([b.c[0], b.c[1], b.d[0], b.d[1]], i * 4);
      const tl = Math.hypot(b.raak[0], b.raak[1]) || 1;
      return { x: b.exit[0], y: b.exit[1], tx: b.raak[0] / tl, ty: b.raak[1] / tl, kaart: r, opZwart: k.opZwart };
    });
    window.__kvLijnen = uiteinden.filter(Boolean); dispatchEvent(new CustomEvent('kv-lijnen', { detail: window.__kvLijnen }));
    tekstR.fill(0); const t = teksten(); nT = t.length; t.forEach((el, i) => tekstR.set(pag(el), i * 4));
    for (const k of kaarten) {
      const r = k.el.getBoundingClientRect();
      const w = Math.round((r.width + 2 * RAND) * dpr), h = Math.round((r.height + 2 * RAND) * dpr);
      if (k.c.width !== w || k.c.height !== h) { k.c.width = w; k.c.height = h; }
    }
  }
  const t0 = performance.now();
  function teken(nu) {
    const t = minder.matches ? 4 : (nu - t0) / 1000;
    /* ALLEEN WAAR KAARTEN ZIJN (levering 100, 14 nov): de schaar om de zichtbare kaarten en hun aderen. Het veld
       hoeft buiten de kaarten niets te tekenen, en een volledig scherm per beeld kostte op een trage telefoon
       rekenkracht die de rest van de pagina nodig heeft. */
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const k of kaarten) {
      if (!k.zicht) continue;
      const r = k.el.getBoundingClientRect();
      x0 = Math.min(x0, r.left - RAND); y0 = Math.min(y0, r.top - RAND); x1 = Math.max(x1, r.right + RAND); y1 = Math.max(y1, r.bottom + RAND);
    }
    if (x1 <= x0) return;
    const sx = Math.max(0, Math.floor(x0 * dpr)), sy = Math.max(0, Math.floor((innerHeight - y1) * dpr));
    const sw = Math.min(doek.width, Math.ceil(x1 * dpr)) - sx, sh = Math.min(doek.height, Math.ceil((innerHeight - y0) * dpr)) - sy;
    if (sw <= 0 || sh <= 0) return;
    gl.enable(gl.SCISSOR_TEST); gl.scissor(sx, sy, sw, sh);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(U.uRes, doek.width, doek.height); gl.uniform1f(U.uScroll, scrollY); gl.uniform1f(U.uTijd, window.__kvTijd ?? t);
    gl.uniform1f(U.uDpr, dpr); gl.uniform1f(U.uHeel, 0); gl.uniform1f(U.uLus, 16); gl.uniform1f(U.uBreed, innerWidth);
    gl.uniform1i(U.uN, kaarten.length); gl.uniform4fv(uKaart, rechth);
    gl.uniform1i(U.uNT, nT); gl.uniform4fv(uTekst, tekstR); gl.uniform4fv(uLijn, lijnen); gl.uniform2f(U.uVerschuif, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    for (const k of kaarten) {
      if (!k.zicht) continue;
      const r = k.el.getBoundingClientRect();
      k.ctx.clearRect(0, 0, k.c.width, k.c.height);
      if (k.opZwart) { k.ctx.save(); k.ctx.beginPath(); k.ctx.roundRect(RAND * dpr, RAND * dpr, r.width * dpr, r.height * dpr, 18 * dpr); k.ctx.clip(); }
      k.ctx.drawImage(doek, (r.left - RAND) * dpr, (r.top - RAND) * dpr, k.c.width, k.c.height, 0, 0, k.c.width, k.c.height);
      if (k.opZwart) k.ctx.restore();
      k.el.classList.add('kv-aan');
    }
  }
  let raf = 0;
  const zichtbaar = () => kaarten.some((k) => k.zicht);
  /* HOOGSTENS 24 BEELDEN PER SECONDE (levering 100, 14 nov): de puls duurt 14 s en de adem 16 s; meer beelden zie je
     niet, en elk beeld minder is rekenkracht voor de rest van de pagina. */
  let vorige = 0;
  /* TE TRAAG? DAN STIL (levering 100, 15 nov): duurt een beeld op dit toestel gemiddeld meer dan 25 ms (een oude
     telefoon, een computer zonder grafische kaart), dan stopt het ademen en blijft één stil beeld staan. Anders kost
     het veld de rest van de pagina zijn vloeiendheid. Scrollen en een andere maat tekenen het stille beeld opnieuw. */
  let gemiddeld = 0, beelden = 0, traag = false;
  function lus(nu) {
    if (nu - vorige >= 41) {
      vorige = nu;
      const t0 = performance.now(); teken(nu); const duur = performance.now() - t0;
      beelden += 1; gemiddeld += (duur - gemiddeld) / Math.min(beelden, 10);
      if (beelden >= 6 && gemiddeld > 25) traag = true;
    }
    raf = (traag || minder.matches || document.hidden || !zichtbaar()) ? 0 : requestAnimationFrame(lus);
  }
  const wek = () => { if (traag) { teken(performance.now()); return; } if (!raf) raf = requestAnimationFrame(lus); };
  const io = new IntersectionObserver((es) => { for (const e of es) { const k = kaarten.find((x) => x.el === e.target); if (k) k.zicht = e.isIntersecting; } wek(); }, { rootMargin: `${RAND}px` });
  kaarten.forEach((k) => io.observe(k.el));
  meet();
  addEventListener('resize', () => { meet(); wek(); });
  addEventListener('scroll', () => { if (!raf) teken(performance.now()); }, { passive: true });
  document.addEventListener('visibilitychange', wek);
  document.fonts?.ready.then(() => { meet(); wek(); });
  addEventListener('load', () => { meet(); wek(); });
  new ResizeObserver(() => { meet(); wek(); }).observe(document.body);
  minder.addEventListener?.('change', wek);
  /* voor de toetsen: zet de tijd vast (s) en teken meteen */
  window.__kaartveld = { meet, zet: (t) => { window.__kvTijd = t; meet(); kaarten.forEach((k) => { k.zicht = true; }); teken(0); } };
}
