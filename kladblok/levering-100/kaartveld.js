/* ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
   HET KAARTVELD — proef voor levering 100 (14 november 2026, lijst 104)
   Lucas: "een enorme kaart … en daar meerdere kaarten uit snijden" (01:59); "Deze achtergrond bedoel ik als space, niet
   letterlijk … Gewoon een rustig gevoel, en alleen voor de kaarten hier en daar" (02:12); "de kaarten zijn los van elkaar
   en ze lopen, volledig los van elkaar in elkaar over" (02:14); "Nee ik wil niet dat elke achtergrond dezelfde kenmerken
   heeft, daarom wou ik dat je een grote kaart maakt met die kenmerken en daaruit allemaal kleine kaarten knipt" (02:33).
   HET IDEE: één grote kaart zo breed als het scherm en zo hoog als de pagina, met veel verschillende kenmerken door elkaar.
   Elke kaart op de site is een los venster op zijn eigen stuk van die grote kaart: de ene kaart heeft de band, de volgende
   een gloed, een horizon of twee lijnen langs de snede. Omdat het één kaart is, lopen ze in elkaar over.
   DE KENMERKEN (het gevoel van de logo-animatie, 04:40; geen sterren, geen bolletjes):
     A de grond: zwart #090D0B met brede vlakken van mint 950, 900 en 800, een ruim groen vlak (800 naar 700) en diep zwart
       ertegenover, en per kaart een zacht licht in een hoek weg van de tekst (Lucas, 04:28: meer kleurverschil);
     B de band: één brede band licht die in een eigen ritme over de pagina slingert, met een lichte en een donkere kant;
       hij komt op en verdwijnt (hij is niet overal even sterk), dus niet elke kaart heeft hem;
     C de snede: zachte lijnen langs 53,13° (de hoek van het merk), om de ~1600 px, in stukken;
     D de gloed: zachte vlekken van mint 500/600, één per vak van 800 px (niet in elk vak), elk met een eigen maat;
     E de horizon: hier en daar een licht gebogen lijn van mint 300 met lichter erboven en donkerder eronder;
     F korrel, grof, zoals in de logo-animatie.
   Het licht (B tot E) dimt onder tekst ([data-tekstvlak]), zodat wit erop goed leesbaar blijft.
   HET ADEMEN (Lucas, 04:27, 05:26 en 05:29): niets beweegt letterlijk. De lijnen en de aderen staan stil; alleen het licht
   ademt erin, super traag en zacht: in één adem van 16 s worden ze lichter en weer donkerder, en één lange, zachte golf
   van licht trekt door ze heen. De gloeden en het groene licht ademen mee.
   Bij "minder beweging" staat alles stil.
   ═══════════════════════════════════════════════════════════════════════════════════════════════════════════ */
(function () {
  var canvas = document.getElementById('veld');
  var gl = canvas && (canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: true }) || canvas.getContext('experimental-webgl'));
  if (!gl) { document.documentElement.classList.add('geen-gl'); return; }
  var MAX = 8;
  var VS = 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0., 1.); }';
  var FS = [
    'precision highp float;',
    'uniform vec2 uRes; uniform float uScroll; uniform float uTijd; uniform float uDpr; uniform float uHeel; uniform float uLus; uniform float uBreed; uniform vec2 uVerschuif;',
    'uniform vec4 uKaart[' + MAX + ']; uniform int uN; uniform vec4 uTekst[' + MAX + ']; uniform int uNT;',
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
    /* de eigen lijn van kaart i (elke kaart minstens één): een brede, zachte vouw van licht zoals in de logo-animatie,
       licht gebogen, langs 53,13° of 126,87° (om en om), door het rechterdeel van de kaart (weg van de tekst). Hij blijft
       op zijn plek; alleen zijn licht ademt (golf staat op 0, dus de staande golf doet niets meer).
       x = de glanzende kern, y = de gloed eromheen, z = de schaduwkant */
    'vec3 kaartLijn(vec2 q, int i, vec4 r, float sm, float golf){',
    '  float fi = float(i); vec2 c0 = r.xy + r.zw*vec2(.74 + .16*(h(vec2(fi, 3.)) - .5), .5 + .3*(h(vec2(fi, 7.)) - .5));',
    '  vec2 dir = mod(fi, 2.) < .5 ? vec2(.6, .8) : vec2(-.6, .8); vec2 nrm = vec2(-dir.y, dir.x);',
    '  vec2 v = q - c0; float langs = dot(v, dir);',
    '  float boog = (h(vec2(fi, 5.)) - .5) * .0011;',
    '  float dl = dot(v, nrm) + boog*langs*langs + 5.*sin(langs/170. + fi*1.7)*golf;',
    '  float amp = exp(-max(doos(q, r, 18.), 0.)/90.) * smoothstep(1500., 250., abs(langs));',
    '  return vec3(lijn(dl, 2.2*sm), lijn(dl, 30.*sm), lijn(dl, 110.*sm)) * amp; }',
    /* voor de ader: de afstand in px tot de lijn van kaart i, en hoe sterk hij daar is */
    /* DE PULS (Lucas, 06:06): een elektrische puls van licht trekt rustig door elke harde lijn: van donker (mint 700/600) heel
       geleidelijk naar bijna wit en weer terug. Elke lijn heeft zijn eigen moment, dus nooit allemaal tegelijk. De puls loopt
       door in de ader en stopt aan zijn uiteinde, buiten de kaart. Hij gaat 107 px per seconde en komt elke 14 s terug. */
    'float puls(float a, float fase){ float s = fract(a/1500. - uTijd/14. + fase); return exp(-pow((s - .5)*3.4, 2.)); }',
    'vec3 kern(float pl){ return mix(mix(M700, M600, .6), mix(M100, vec3(1.), .35), pl); }',
    'vec3 kaartDl(vec2 q, int i, vec4 r, float golf){',
    '  float fi = float(i); vec2 c0 = r.xy + r.zw*vec2(.74 + .16*(h(vec2(fi, 3.)) - .5), .5 + .3*(h(vec2(fi, 7.)) - .5));',
    '  vec2 dir = mod(fi, 2.) < .5 ? vec2(.6, .8) : vec2(-.6, .8); vec2 nrm = vec2(-dir.y, dir.x);',
    '  vec2 v = q - c0; float langs = dot(v, dir);',
    '  float boog = (h(vec2(fi, 5.)) - .5) * .0011;',
    '  float dl = dot(v, nrm) + boog*langs*langs + 5.*sin(langs/170. + fi*1.7)*golf;',
    '  float amp = exp(-max(doos(q, r, 18.), 0.)/90.) * smoothstep(1500., 250., abs(langs));',
    '  return vec3(dl, amp, langs); }',
    /* voor de ader: welke lijn is bij q het dichtstbij (de afstand in px) en hoe sterk is hij daar */
    'float W;',
    'vec4 naast(vec2 q, float golf){',
    '  vec2 p = q + uVerschuif; vec2 pz = p;',
    '  float bdl = 1e4, bs = 0., ba = 0., bf = 0.; float sc;',
    '  float by = pz.y; float bx = W*(.5 + .44*sin(by/950. + .7)) + W*.1*sin(by/430. + 1.3) + 6.*sin(by/210.)*golf;',
    '  float bx2 = W*(.5 + .44*sin((by + 2.)/950. + .7)) + W*.1*sin((by + 2.)/430. + 1.3) + 6.*sin((by + 2.)/210.)*golf;',
    '  float sdA = (p.x - bx) / sqrt(1. + pow((bx2 - bx)/2., 2.)); float stA = smoothstep(.22, .6, vn(vec2(3.7, by/1500.)));',
    '  sc = stA*lijn(sdA, 40.); if (sc > bs){ bs = sc; bdl = sdA; ba = by; bf = .13; }',
    '  float usA = dot(pz, vec2(.6, .8)), vsA = dot(pz, vec2(-.8, .6)); float celA = floor(usA/1600.); float hsA = h(vec2(celA, 4.2));',
    '  if (hsA > .2){ float dsA = usA - (celA*1600. + 300. + hsA*1000.) + 4.*sin(vsA/190.)*golf; float stuk = smoothstep(.35, .7, vn(vec2(vsA/1100., celA*3.1))); sc = stuk*lijn(dsA, 40.); if (sc > bs){ bs = sc; bdl = dsA; ba = vsA; bf = h(vec2(celA, 9.1)); } }',
    '  for (int j = -1; j <= 1; j++){ float hc = floor(pz.y/1300.) + float(j); float hh = h(vec2(hc, 8.8));',
    '    if (hh > .35){ float hy = hc*1300. + 250. + h(vec2(hc, 2.2))*800. + 70.*sin(p.x/W*3.1416 + hh*6.) + 5.*sin(p.x/230. + hh*9.)*golf; float lang = smoothstep(.25, .65, vn(vec2(p.x/900., hc*5.)));',
    '    sc = lang*lijn(pz.y - hy, 40.); if (sc > bs){ bs = sc; bdl = pz.y - hy; ba = p.x; bf = h(vec2(hc, 3.3)); } } }',
    '  for (int i = 0; i < ' + MAX + '; i++){ if (i >= uN) break; vec3 kd = kaartDl(q, i, uKaart[i], golf); sc = kd.y*lijn(kd.x, 40.); if (sc > bs){ bs = sc; bdl = kd.x; ba = abs(kd.z); bf = h(vec2(float(i), 11.)); } }',
    '  return vec4(bdl, bs, ba, bf); }',
    'float dmin(vec2 q){ float d = 1e5; for (int i = 0; i < ' + MAX + '; i++){ if (i >= uN) break; d = min(d, doos(q, uKaart[i], 18.)); } return d; }',
    'void main(){',
    '  vec2 f = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uDpr;',
    '  vec2 q = vec2(f.x, f.y + uScroll);',                     /* de plek op de pagina */
    '  float d = 1e5;',
    '  for (int i = 0; i < ' + MAX + '; i++){ if (i >= uN) break; d = min(d, doos(q, uKaart[i], 18.)); }',
    '  if (uHeel < .5 && d > 130.){ gl_FragColor = vec4(1.); return; }',
    '  vec2 p = q + uVerschuif;',                               /* de plek op de grote kaart */
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
    /* DE ADEREN (Lucas, 03:35, 03:47 en 04:27): waar een lijn de rand raakt, steekt hij een klein stukje uit in het wit. Geen
       laserstraal: de ader is een stukje van de kaart zelf dat doorloopt, dus hij gaat zonder naad over (Lucas, 04:37): bij de
       rand heeft hij precies de kleur van de kaart, en naar zijn punt toe loopt hij heel zacht van groen naar zwart
       (04:35). Zijn binnenkant is glans (04:32). Hij blijft op één plek: hij ademt (iets langer, dan weer korter) en zijn
       buitenranden golven op hun plek, met bewegingsonscherpte (04:35). */
    '  float vm = 0., vx = 0., vg = 0., hol = 0., vpl = 0., rail = 0., schaduw = 0., diep = 0.;',
    '  if (uHeel < .5 && d > -150.){',
    '    float reik = 60. + 12.*adem;',
    '    float x = clamp(d/reik, 0., 1.);',
    /* welke lijn is hier het dichtstbij: de afstand in px en de sterkte van die lijn */
    '    vec4 nb = naast(q, golf); float bdl = nb.x, bs = nb.y; vpl = puls(nb.z, nb.w);',
    /* alleen waar een lijn de rand echt kruist, niet waar hij er vlak langs loopt */
    '    vec2 nn = normalize(vec2(dmin(q + vec2(1., 0.)) - dmin(q - vec2(1., 0.)), dmin(q + vec2(0., 1.)) - dmin(q - vec2(0., 1.))) + 1e-5);',
    '    float dd = abs(naast(q + nn*2., golf).x - bdl) / 2.;',
    '    float kruis = smoothstep(.97, .86, dd);',
    '    float sterk = smoothstep(.12, .5, bs / max(lijn(bdl, 40.), 1e-4));',     /* hoe sterk de lijn is waar hij de rand raakt */
    /* HET EINDE (Lucas, 04:45 en 04:49): de ader loopt gewoon door in de lijn van zijn streep, even dik, en wordt buiten de
       kaart twee dunne evenwijdige lijnen (de randen van de streep, de binnenkant wit); hij eindigt niet in een punt maar
       stopt als die twee lijnen en trekt kort en zacht weg in het wit. De randen ademen en golven op hun plek, met
       bewegingsonscherpte (drie momenten gemiddeld). */
    '    float vel = abs(cos(u*6.2832*2.));',
    '    float ph = sin(dot(q, vec2(.045, .033)) + 1.3);',
    '    float ro0 = 2.7 * sm;',                                                    /* de halve breedte, buitenkant */
    '    float ri = 1.5 * sm * smoothstep(-145., -20., d);',                       /* de geul loopt tot 145 px de kaart in (Lucas, 06:07 en 06:29) */
    '    diep = smoothstep(-4., -140., d);',                                         /* 0 aan de rand, 1 diep in de kaart */
    '    float ra = ro0, dr = 0.;',                                                /* de vorm staat stil */
    '    float ab = abs(bdl);',
    '    float buitenk = (smoothstep(ra - dr + .7, ra - dr - .7, ab) + smoothstep(ra + .7, ra - .7, ab) + smoothstep(ra + dr + .7, ra + dr - .7, ab))/3.;',
    '    float vorm = buitenk * smoothstep(ri - .6, ri + .6, ab);',
    '    float uit = pow(1. - x, 1.6);',                                           /* heel geleidelijk weg in het wit, over de hele lengte (04:54) */
    '    vm = vorm * sterk * kruis * uit * (.6 + .4*vpl); vx = x;',      /* hij ademt alleen in licht: donkerder en lichter */
    '    float inK = smoothstep(-150., -60., d) * sterk * kruis * step(d, 1.5);',
    '    hol = smoothstep(ri + .6, ri - .6, ab) * inK;',
    '    rail = smoothstep(ri - .3, ri + .3, ab) * smoothstep(ri + 1.6, ri + .8, ab) * inK;',  /* de twee felle randen langs de geul */
    '    schaduw = lijn(ab - ri - 2.5, 5. + 3.*diep) * inK * (.6 + .4*diep);',            /* een zachte schaduw naast de geul, dieper in de kaart sterker: het 3D */
    '    vg = 0.; }',
    /* het licht blijft van de tekst weg */
    '  float weg = 1., zacht = 1.;',
    '  for (int i = 0; i < ' + MAX + '; i++){ if (i >= uNT) break; float dt = doos(q, uTekst[i], 40.); float s0 = smoothstep(-30., 260., dt); weg = min(weg, s0); zacht = min(zacht, mix(.5, 1., s0)); }',
    /* A · de grond, met meer verschil (Lucas, 04:28): diep zwart in de ene hoek, een ruim groen vlak in de andere, zoals
       het blauw en het licht in de logo-animatie, maar alleen in zwart en groen. Het staat stil; het ademt alleen. */
    '  float n1 = vn(p/1300.), n2 = vn(p/2100. + vec2(7.3, 2.1)), n3 = vn(p/3400. + vec2(2.9, 5.7));',
    '  vec3 c = mix(ZW, M950, smoothstep(.15, .75, n1));',
    '  c = mix(c, M900, smoothstep(.45, .9, n2) * .75);',
    '  c = mix(c, M800, pow(smoothstep(.55, 1., n1*n2*1.7), 1.3) * .55);',
    '  c = mix(c, M800, smoothstep(.55, .95, n3) * .6 * zacht * (.9 + .1*adem));',                /* een ruim donkergroen vlak */
    '  c = mix(c, ZW * .55, smoothstep(.45, .12, n3) * .7);',                                         /* het diepe zwart */
    /* elke kaart krijgt zijn eigen licht in een hoek weg van de tekst (rechts, boven of onder), als het zachte licht
       rechtsonder in de logo-animatie, en een donkere hoek ertegenover */
    '  for (int i = 0; i < ' + MAX + '; i++){ if (i >= uN) break; vec4 r = uKaart[i]; float fi = float(i);',
    '    vec2 hk = r.xy + r.zw*vec2(.88 + .1*h(vec2(fi, 21.)), h(vec2(fi, 23.)) < .5 ? .12 : .9);',
    '    float rr = max(r.z, r.w) * (.55 + .25*h(vec2(fi, 27.)));',
    '    c = mix(c, mix(M800, M700, .3 + .2*adem), vlek(q, hk, rr) * .5 * zacht);',
    '    vec2 dk = r.xy + r.zw*vec2(.05, h(vec2(fi, 23.)) < .5 ? .95 : .08);',
    '    c = mix(c, ZW * .6, vlek(q, dk, rr*.9) * .55); }',
    /* B · de band: een brede vouw van licht, hij komt op en verdwijnt; hij staat op zijn plek en ademt */
    '  float y = pz.y;',
    '  float bx = W*(.5 + .44*sin(y/950. + .7)) + W*.1*sin(y/430. + 1.3) + 6.*sin(y/210.)*golf;',
    '  float bx2 = W*(.5 + .44*sin((y + 2.)/950. + .7)) + W*.1*sin((y + 2.)/430. + 1.3) + 6.*sin((y + 2.)/210.)*golf;',
    '  float sd = (p.x - bx) / sqrt(1. + pow((bx2 - bx)/2., 2.));',
    '  float sterk = smoothstep(.22, .6, vn(vec2(3.7, y/1500.)));',
    '  float licht = smoothstep(-60., 700., -sd) * sterk;',
    '  c = mix(c, M900, licht * .5); c = mix(c, ZW, smoothstep(100., 900., sd) * .6 * sterk);',
    '  c = mix(c, M800, lijn(sd, 300.*sm) * .45 * sterk * zacht);',
    '  c = mix(c, M600, lijn(sd, 30.*sm) * .5 * sterk * mix(.3, 1., weg) * fel);',
    '  c = mix(c, mix(M700, kern(puls(y, .13)), weg), lijn(sd, 2.4*sm) * .95 * sterk * mix(.8, 1., weg));',
    /* C · de snede: zachte lijnen langs 53,13°, in stukken */
    '  float us = dot(pz, vec2(.6, .8)), vs = dot(pz, vec2(-.8, .6));',
    '  float cel = floor(us/1600.); float hs = h(vec2(cel, 4.2));',
    '  if (hs > .2){ float ds = us - (cel*1600. + 300. + hs*1000.) + 4.*sin(vs/190.)*golf;',
    '    float stuk = smoothstep(.35, .7, vn(vec2(vs/1100., cel*3.1)));',
    '    c = mix(c, M600, lijn(ds, 24.*sm) * .4 * stuk * mix(.3, 1., weg) * fel);',
    '    c = mix(c, mix(M700, kern(puls(vs, h(vec2(cel, 9.1)))), weg), lijn(ds, 1.8*sm) * .9 * stuk * mix(.8, 1., weg)); }',
    /* D · de gloed: één vlek per vak van 800 px, niet in elk vak; hij ademt */
    '  vec2 vak = floor(p/800.);',
    '  for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++){ vec2 v = vak + vec2(float(i), float(j)); float k = h(v + 11.);',
    '    if (k > .35){ vec2 mid = (v + vec2(h(v + 1.7), h(v + 5.3)))*800.; float r = 260. + 320.*h(v + 9.1);',
    '      float g = vlek(p, mid, r * (.92 + .16*adem)) * (.3 + .35*h(v + 2.9)) * (.85 + .3*adem);',
    '      c = mix(c, mix(M600, M700, h(v + 6.6)*.6 + .2*adem), g * .7 * zacht); } }',
    /* E · de horizon: hier en daar een licht gebogen lijn, lichter erboven, donkerder eronder */
    '  for (int j = -1; j <= 1; j++){ float hc = floor(pz.y/1300.) + float(j); float hh = h(vec2(hc, 8.8));',
    '    if (hh > .35){ float hy = hc*1300. + 250. + h(vec2(hc, 2.2))*800. + 70.*sin(p.x/W*3.1416 + hh*6.) + 5.*sin(p.x/230. + hh*9.)*golf;',
    '      float dh = pz.y - hy; float lang = smoothstep(.25, .65, vn(vec2(p.x/900., hc*5.)));',
    '      c = mix(c, M800, smoothstep(-260., -10., dh) * smoothstep(40., -10., dh) * .5 * lang);',
    '      c = mix(c, ZW, smoothstep(10., 240., dh) * smoothstep(600., 240., dh) * .45 * lang);',
    '      c = mix(c, M600, lijn(dh, 26.*sm) * .4 * lang * mix(.3, 1., weg) * fel); c = mix(c, mix(M700, kern(puls(p.x, h(vec2(hc, 3.3)))), weg), lijn(dh, 2.*sm) * .9 * lang * mix(.8, 1., weg)); } }',
    /* G · de eigen vouw van elke kaart: schaduwkant, gloed, glanzende kern */
    '  for (int i = 0; i < ' + MAX + '; i++){ if (i >= uN) break; vec3 kl = kaartLijn(q, i, uKaart[i], sm, golf); float pk = puls(abs(kaartDl(q, i, uKaart[i], golf).z), h(vec2(float(i), 11.)));',
    '    c = mix(c, M700, kl.z * .25 * zacht * fel); c = mix(c, M600, kl.y * .5 * mix(.3, 1., weg) * fel); c = mix(c, mix(M700, kern(pk), weg), kl.x * .95 * mix(.8, 1., weg)); }',
    /* F · korrel */
    '  float k = h(floor(gl_FragCoord.xy / max(1., uDpr*.75))) - .5; float lum = dot(c, vec3(.2126, .7152, .0722));',
    '  c += k * .095 * (.6 + 1.8*lum*(1. - lum));',
    '  c += (h(gl_FragCoord.yx*1.7) - .5)/255.;',
    '  float rand = smoothstep(1.5, -.5, d);',
    '  if (uHeel > .5){ float rl = smoothstep(2., .5, abs(d)); c = mix(c, vec3(1.), rl*.9); gl_FragColor = vec4(c, 1.); return; }',
    '  vec3 geul = mix(vec3(1.), mix(M900, ZW, .5), pow(diep, .8));',                  /* de binnenkant: wit aan de rand, hoe dieper hoe donkerder */
    '  geul = mix(geul, mix(M300, vec3(1.), .4), vpl * .75 * diep);',                    /* de puls licht ook de diepe geul op */
    '  geul = mix(mix(M900, ZW, .5), geul, weg);',                                      /* onder tekst blijft de geul donker, zodat wit leesbaar blijft */
    '  c = mix(c, ZW * .5, schaduw * .55); c = mix(c, mix(M700, kern(vpl), weg), rail); c = mix(c, geul, hol);',                                                  /* in de kaart: de binnenkant wordt al wit, geleidelijk naar de rand toe (Lucas, 04:55 en 05:00) */
    '  vec3 cv = mix(clamp(c, 0., 1.), kern(vpl), smoothstep(0., .3, vx));',   /* de ader: bij de rand de kaart, dan de felle mint van zijn streep */
    '  cv = mix(cv, mix(M300, vec3(1.), .6), vg);',
    '  vec3 buiten = mix(vec3(1.), cv, vm);',
    '  rand = max(rand, 0.) * (1. - hol*smoothstep(-3., 0., d));',                                           /* geen rand van de kaart in de ader (Lucas, 05:08) */
    '  gl_FragColor = vec4(mix(buiten, clamp(c, 0., 1.), rand), 1.);',
    '}'].join('\n');
  function maak(type, bron) { var s = gl.createShader(type); gl.shaderSource(s, bron); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
  var prog;
  try { prog = gl.createProgram(); gl.attachShader(prog, maak(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, maak(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog); if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog)); }
  catch (e) { console.warn('veld', e); document.documentElement.classList.add('geen-gl'); return; }
  gl.useProgram(prog);
  var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  var aLoc = gl.getAttribLocation(prog, 'a'); gl.enableVertexAttribArray(aLoc); gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0);
  var U = {}; ['uRes', 'uScroll', 'uTijd', 'uDpr', 'uHeel', 'uLus', 'uN', 'uNT', 'uBreed', 'uVerschuif'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
  var uKaart = gl.getUniformLocation(prog, 'uKaart'), uTekst = gl.getUniformLocation(prog, 'uTekst');
  var kaarten = [].slice.call(document.querySelectorAll('[data-kaart]')).slice(0, MAX);
  var teksten = [].slice.call(document.querySelectorAll('[data-tekstvlak]')).slice(0, MAX);
  var rechth = new Float32Array(MAX * 4), tekstR = new Float32Array(MAX * 4), dpr = 1, heel = 0, stil = false, lus = 16;
  var minder = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var rect = function (el) { var r = el.getBoundingClientRect(); return [r.left, r.top + scrollY, r.width, r.height]; };
  function meet() {
    dpr = window.__veldDpr || Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(innerWidth * dpr); canvas.height = Math.round(innerHeight * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    kaarten.forEach(function (k, i) { rechth.set(rect(k), i * 4); });
    teksten.forEach(function (k, i) { tekstR.set(rect(k), i * 4); });
  }
  var t0 = performance.now(), tStil = 0;
  function teken(nu) {
    var t = minder ? 4 : (stil ? tStil : (nu - t0) / 1000);
    if (!stil) tStil = t;
    gl.uniform2f(U.uRes, canvas.width, canvas.height); gl.uniform1f(U.uScroll, scrollY); gl.uniform1f(U.uTijd, t);
    gl.uniform1f(U.uDpr, dpr); gl.uniform1f(U.uHeel, heel); gl.uniform1f(U.uLus, lus); gl.uniform1f(U.uBreed, innerWidth);
    gl.uniform1i(U.uN, kaarten.length); gl.uniform4fv(uKaart, rechth);
    gl.uniform1i(U.uNT, teksten.length); gl.uniform4fv(uTekst, tekstR); var vs = window.__veldVerschuif || [0, 0]; gl.uniform2f(U.uVerschuif, vs[0], vs[1]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  var raf = 0;
  function lusje(nu) { teken(nu); raf = (minder || document.hidden || stil) ? 0 : requestAnimationFrame(lusje); }
  function wek() { if (!raf) raf = requestAnimationFrame(lusje); }
  meet(); wek();
  addEventListener('resize', function () { meet(); teken(performance.now()); });
  addEventListener('scroll', function () { if (!raf) teken(performance.now()); }, { passive: true });
  document.addEventListener('visibilitychange', wek);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(meet);
  addEventListener('load', meet);
  if (window.ResizeObserver) new ResizeObserver(meet).observe(document.body);
  var knopHeel = document.getElementById('heel'), knopRust = document.getElementById('rust');
  if (knopHeel) knopHeel.addEventListener('click', function () { heel = heel ? 0 : 1; knopHeel.setAttribute('aria-pressed', String(!!heel)); document.documentElement.classList.toggle('heel', !!heel); teken(performance.now()); });
  if (knopRust) knopRust.addEventListener('click', function () { stil = !stil; if (!stil) { t0 = performance.now() - tStil * 1000; wek(); } knopRust.setAttribute('aria-pressed', String(stil)); });
  document.addEventListener('change', function (e) { if (e.target.name === 'lus') { lus = e.target.value === 'b' ? 24 : e.target.value === 'c' ? 1e6 : 16; } });
  window.__veld = { meet: meet, zet: function (t) { stil = true; tStil = t; meet(); teken(0); } };
})();
