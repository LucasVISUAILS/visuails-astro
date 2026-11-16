/* VISUAILS — de kopletter in beweging (levering 89, 5 november 2026; uit de lijsten 80 en 81, logo10.js).
   Gebruikt door de logoposter op de voorpagina (src/scripts/poster89.js). De uitleg staat bovenaan maakAnimatie. */
/* VISUAILS — de logo-animatie van lijst 80 (K5), ronde 6 (5 november, 02:43 – 03:11). Niets is getekend; alles is
   uitgerekend in een echte 2D-simulatie (kop/zuig9.py, pymunk) en hier alleen afgespeeld:
   · elke letter is een star blok beton, met zijn eigen massa, zwaartepunt en traagheid; botsingen gaan tussen de echte vormen;
   · de magneet zit in de mond naast de V en trekt aan elk stukje materiaal apart, harder naarmate het dichter bij de mond zit.
     De mond helt naar rechts, dus de top van een letter wordt het hardst getrokken: elke letter buigt op zijn eigen manier
     voorover, de zware kant voorop, en hoe dichter bij de mond, hoe eerder. Gewichtloos houdt ze zacht overeind;
   · actie = reactie: de letters trekken net zo hard aan de V; de V komt vloeiend stil op de plek van het V-merk;
   · in het begin drijven de L en de S zacht naar elkaar toe; de S tikt tegen de voet van de L en uit de stam van de L breekt het
     vlaggetje (op 0,8 × zijn ware grootte: het merk-vlaggetje is breder dan de stam). Het schuift langs zijn breuk schuin
     rechtsomhoog weg, licht, en zweeft omhoog boven de letters; zodra het vrij is, tolt het weg van de klap. Raakt het iets, dan
     doet de natuurkunde de rest. De magneet remt zijn vaart en zijn draai steeds harder, tot het stil hangt;
   · het hangt nooit stil (5 nov 04:23 – 04:26): de magneet trekt het ook aan, steeds harder. Eerst remt dat zijn vaart naar
     rechts, dan keert het vloeiend om en komt het met de letters mee, trager dan zij, steeds sneller; een richtend moment draait
     het onderweg recht. Vlak na de laatste letter klikt het strak vast op zijn plek (het laatste stuk remt kubisch af), en
     onderweg groeit het naar zijn ware grootte;
   · als de letters weg zijn, zwelt het merk kort op (SW); het vlaggetje klikt erin op die maat, en dan knalt het hele merk, in
     verhouding, tegen de achtergrond; op het beeld waarop het de achtergrond raakt, is de grond het heelal.
   LIJST 81 (Lucas, 5 november 07:37): "Wat bij alle versies beter kan is dat het vlaggetje uit zichzelf beweegt terwijl er geen
   reden voor is. Hij moet gewoon stabiel naar boven moeten bewegen zonder aangetikt te worden of bochten te maken of te draaien
   en moet ook weer even strak naar de plek gaan waar hij eindigt zoals hij nu al wel doet." Daarom (T.VLAG = 'recht', nu de
   standaard) volgt het vlaggetje niet meer de simulatie maar één rechte weg in twee stukken:
   · omhoog: het schuift recht uit zijn breuk, op 66,5° (de hoek van het rechterbeen van de V; steiler kan niet zonder de L te
     raken, nagemeten in de vormen), zacht aanzettend, dan gelijkmatig, en het komt zacht tot stilstand op VR.H woordmaten. Het
     draait niet en raakt niets;
   · naar zijn plek: vanuit stilstand in een rechte lijn naar zijn plek in het merk, rustig beginnend en steeds sneller
     (afstand ∝ tijd^VR.MACHT), en het laatste stuk (VR.DS) remt het strak af zoals in de versie van 04:40 (eindvaart nul);
     het groeit onderweg naar zijn ware grootte. Het landt vlak nadat de V stilstaat.
   De letters en de V komen nog steeds uit de simulatie (het vlaggetje is 0,11 tegen 16: het had geen merkbare invloed op ze).
   KLEUR (Lucas, 07:37: "andere kleuren en tegenovergestelde kleuren en posterkleuren op de letters en de omgeving wit en bij het
   einde switchen de kleuren om"): opties.kleur = { grond, letters, venster, naGrond, naV }. grond en letters gelden tot de klap,
   naGrond en naV erna (naGrond null: het veld van de film is de grond). venster: de letters (en het vlaggetje en de V) zijn
   vensters op het veld, de grond eromheen is grond; bij de klap draait het om: het veld wordt de grond en de V wordt naV.
   maakAnimatie(svg, M, V_PADEN, opties) → { stand(t), duur, T }. opties.vorm = kop/vorm9.json, opties.zuig = kop/zuig9.json. */
/* het rechte vlaggetje: de hoek van zijn weg omhoog (graden), hoe ver (woordmaten), zacht aan en uit (delen van die tijd), de
   macht van het aantrekken en de lengte van het strakke laatste stuk (woordmaten) */
const VR = { HOEK: 66.5, H: 470, IN: 0.14, UIT: 0.34, MACHT: 3.5, DS: 60 };

const NS9 = 'http://www.w3.org/2000/svg';
const TB9 = 1600, TH9 = 900, BEELD9 = 1000 / 30;
const k019 = (x) => Math.max(0, Math.min(1, x));
const fase9 = (t, a, b) => k019((t - a) / (b - a));
const mix9 = (a, b, u) => a + (b - a) * u;
function el9(n, at = {}, ouder) { const e = document.createElementNS(NS9, n); for (const [k, v] of Object.entries(at)) e.setAttribute(k, v); if (ouder) ouder.append(e); return e; }
const glad9 = (x) => { x = k019(x); return x * x * x * (x * (6 * x - 15) + 10); };   /* smootherstep: geen schok aan begin en eind */
const pad9 = (pts) => 'M' + pts.map((p) => p[0].toFixed(3) + ' ' + p[1].toFixed(3)).join('L') + 'Z';

function maakAnimatie(svg, M, V_PADEN, opties = {}) {
  const hard = opties.hard || 'wit';
  const id = opties.id || Math.random().toString(36).slice(2, 7);
  const VM = opties.vorm, Z = opties.zuig, MO = Z.mond;
  const L = M.letters, n = L.length, S = VM.letter, SK = VM.plaats.SK;
  /* stil: hoe lang het woordlogo eerst stilstaat; druk: hoe lang het knallen tegen de achtergrond duurt; naloop: hoe lang het
     heelal daarna uitzweeft; STOOT: welk deel van dat knallen meteen gaat. KLIK: hoe het vlaggetje het laatste stuk binnenkomt:
     'recht' (de versie van 04:40: recht op zijn plek af en strak afgeremd) of 'bocht' (over de top, in een bocht langs zijn lange
     rand; nodig als het merk opzwelt). SW: hoeveel het merk opzwelt als de letters weg zijn (1 = niet; 04:50: "waarna het logo
     wat kort groter wordt ... en dan weer tegen de achtergrond aan knalt") */
  const T = Object.assign({ stil: 700, druk: 280, naloop: 3000, KIER: .076, STOOT: .35, DG: 500, SW: 1, KQ: 0.55, KLIK: 'recht', VLAG: 'recht', VVORM: 'kantel' }, opties.T || {});
  const KL0 = opties.kleur || {};
  const K = { grond: KL0.grond || opties.grond || '#FFFFFF', letters: KL0.letters || opties.woordKleur || '#090D0B', venster: !!KL0.venster,
              naGrond: KL0.naGrond === undefined ? null : KL0.naGrond, naV: KL0.naV || opties.vEind || '#FFFFFF', naBeeld: KL0.naBeeld || null };
  /* lijst 81, de poster: na de klap is de V een venster op een foto (naBeeld), en daarna groeit hij tot de foto het beeld vult
     (T.groei = [wacht na de klap, duur] in ms; op de site volgt dat stuk het scrollen) */
  const stapZ = Z.t[1] - Z.t[0], nZ = Z.t.length;
  T.zuig0 = T.stil;
  T.binnen = Z.binnen.map((b) => T.zuig0 + b);
  T.dicht = Math.max(...T.binnen);
  T.stilV = T.zuig0 + Z.t[nZ - 1];                          /* de V staat stil op de plek van het V-merk */
  T.breek = T.zuig0 + Z.breek;                              /* de S tikt tegen de voet van de L: het vlaggetje breekt uit */
  /* het laatste stuk: de simulatie geeft zijn stand en vaart op DSNAP woordmaten van zijn plek (recht erop af).
     'recht': het remt strak af tot stilstand (kubisch, eindvaart nul) in 1,8 × de tijd die het met die vaart nodig zou hebben
     (onder de 3 × schiet het niet door). 'bocht': het schiet in een bocht binnen langs zijn lange rand (een kubische Bézier die
     eindigt langs die rand) en remt strak en gelijkmatig af (s = 1 − (1 − τ)²), met precies zijn eigen beginvaart */
  const KL = Z.brk.klik;
  T.klik = T.zuig0 + KL.t;
  const vRel = Math.hypot(KL.v[0] - KL.W, KL.v[1]), dKlik = Math.hypot(KL.doel[0] - KL.p[0], KL.doel[1] - KL.p[1]);
  T.TK = T.KLIK === 'bocht' ? 2 * 1.15 * dKlik / vRel : Math.max(12, Math.min(140, 1.8 * dKlik / vRel));
  T.land = Math.max(T.klik + T.TK, T.stilV);
  const lam = Z.lambda || 1;
  if (T.VLAG === 'recht') {   /* het strakke laatste stuk: als in 04:40 (22 ms op 1,8 × de vaart), op het tempo van de variant */
    T.TK = Math.max(12, Math.min(40, 22 * lam)); T.land = T.stilV + 4 * lam; T.klik = T.land - T.TK;
  }
  T.raak = Math.ceil((T.land + T.druk) / BEELD9) * BEELD9;
  T.eind = T.raak + T.naloop;
  if (T.groei) T.eind = Math.max(T.eind, T.raak + T.groei[0] + T.groei[1] + 600);
  svg.setAttribute('viewBox', `0 0 ${TB9} ${TH9}`);
  svg.innerHTML = '';
  const defs = el9('defs', {}, svg);
  const inkt = K.letters;
  const cx = TB9 / 2, cy = TH9 / 2;
  const Kc = (opties.breed || 1200) / (M.box[2] - M.box[0]);
  const WY = cy + 350 * Kc;
  const doekR = el9('rect', { x: 0, y: 0, width: TB9, height: TH9, fill: K.grond }, svg);
  /* na de klap: een effen grond (naGrond), of geen (dan is het veld van de film de grond) */
  const naR = el9('rect', { x: 0, y: 0, width: TB9, height: TH9, fill: K.naGrond || 'none', display: 'none' }, svg);
  const woordG = el9('g', {}, svg);
  const logoG = el9('g', {}, woordG);
  L.forEach((l) => el9('path', { d: l.d, fill: inkt, 'fill-rule': 'evenodd' }, logoG));
  const bewegG = el9('g', { display: 'none', 'data-rol': 'letters' }, woordG);
  /* de mond in woordmaten (de V staat in woordmaten stil op x = 0; y omhoog): x = c0 + y·k0; het gat is alles links ervan */
  const gatD = `M-5000 -3000L${(MO.c0 + 3000 * MO.k0).toFixed(3)} -3000L${(MO.c0 - 2000 * MO.k0).toFixed(3)} 2000L-5000 2000Z`;
  const lagen = L.map((l, i) => {
    const m = el9('mask', { id: `m${i}-${id}`, maskUnits: 'userSpaceOnUse', x: -1e5, y: -1e5, width: 2e5, height: 2e5 }, defs);
    el9('rect', { x: -1e5, y: -1e5, width: 2e5, height: 2e5, fill: '#fff' }, m);
    el9('path', { d: gatD, fill: '#000' }, m);
    const g = el9('g', { mask: `url(#m${i}-${id})` }, bewegG);
    const p = el9('path', { d: l.d, fill: inkt, 'fill-rule': 'evenodd' }, g);
    return { i, m, g, p };
  });
  /* de hap die het vlaggetje in de L achterlaat (een haar kleiner dan het stuk: geen naad op het moment van de breuk) */
  const stukGat = el9('path', { d: VM.stukHap, fill: '#000', display: 'none' }, lagen[S].m);
  const S_V = VM.S_V, VKs = Kc * 700 / 813.25;
  const merkOp = (u, v) => [cx + (u - 351) * VKs, cy + (v - 406.625) * VKs];
  const vG = el9('g', { display: 'none' }, svg);
  const lijf = el9('path', { d: V_PADEN[0], fill: inkt }, vG);
  const vlag = el9('path', { d: V_PADEN[1], fill: inkt }, vG);
  const vormV = el9('path', { d: 'M0 0Z', fill: inkt, 'data-rol': 'v' }, woordG);
  const vormStuk = el9('path', { d: 'M0 0Z', fill: inkt, display: 'none', 'data-rol': 'stuk' }, svg);
  let dek = null, vZicht = null;
  if (K.venster) {
    /* lijst 81: de letters zijn vensters op het veld. Ze staan in een masker over de grond (zwart erin = gat), dus het veld van
       de film schijnt erdoor; na de klap is het veld de grond en staat er een V in naV */
    const m = el9('mask', { id: `mw-${id}`, maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: TB9, height: TH9 }, defs);
    el9('rect', { x: 0, y: 0, width: TB9, height: TH9, fill: '#fff' }, m);
    [woordG, vormStuk, vG].forEach((g) => m.append(g));
    [...woordG.querySelectorAll('path'), vormStuk, lijf, vlag].forEach((p) => p.setAttribute('fill', '#000'));
    doekR.setAttribute('mask', `url(#mw-${id})`);
    vZicht = el9('g', { display: 'none' }, svg);
    V_PADEN.forEach((d) => el9('path', { d, fill: K.naV }, vZicht));
  }
  let beeldG = null, beeldClip = null;
  if (K.naBeeld) {
    const cp = el9('clipPath', { id: `cb-${id}`, clipPathUnits: 'userSpaceOnUse' }, defs);
    /* in een clipPath mag geen g: de paden krijgen elk de transform */
    beeldClip = V_PADEN.map((d) => el9('path', { d }, cp));
    beeldG = el9('g', { 'clip-path': `url(#cb-${id})`, display: 'none' }, svg);
    el9('image', { href: K.naBeeld, x: 0, y: 0, width: TB9, height: TH9, preserveAspectRatio: 'xMidYMid slice' }, beeldG);
  }
  if (hard === 'snijdt') {
    const m = el9('mask', { id: `mv-${id}`, maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: TB9, height: TH9 }, defs);
    el9('rect', { x: 0, y: 0, width: TB9, height: TH9, fill: '#fff' }, m);
    const vm = el9('g', { fill: '#000' }, m);
    V_PADEN.forEach((d) => el9('path', { d }, vm));
    dek = el9('rect', { x: 0, y: 0, width: TB9, height: TH9, fill: '#FFFFFF', mask: `url(#mv-${id})`, display: 'none' });
    svg.insertBefore(dek, woordG);
    dek._vm = vm;
  }
  /* de uitgerekende stand, monsters van 4 ms, lineair ertussen */
  const plek = (t) => { const r = (t - T.zuig0) / stapZ; if (r <= 0) return [0, 0]; if (r >= nZ - 1) return [nZ - 1, 0]; const a = Math.floor(r); return [a, r - a]; };
  const UVan = (t) => { const [a, u] = plek(t); return a >= nZ - 1 ? Z.U[nZ - 1] : mix9(Z.U[a], Z.U[a + 1], u); };
  /* een houding: letter → wereld is R(θ)·p + (tx, ty); null als hij al in de mond zit */
  const houding = (rij, t) => { const [a, u] = plek(t); const A = rij[a], B = rij[Math.min(a + 1, nZ - 1)];
    if (!A) return null; if (!B || u === 0) return A; return [mix9(A[0], B[0], u), mix9(A[1], B[1], u), mix9(A[2], B[2], u)]; };
  const nul = [0, 0, 0];
  const trVan = (t, i) => (t <= T.zuig0 || i === 0 ? nul : houding(Z.tr[i - 1], t));
  const deelVan = (t) => { const [a, u] = plek(t); return a >= nZ - 1 ? 1 : mix9(Z.deel[a], Z.deel[a + 1], u); };
  const vormTab = []; { let y = 0; for (let t = T.zuig0; t <= T.dicht + 4; t += 4) { y += (deelVan(t) - y) * (1 - Math.exp(-4 / 40)); vormTab.push(y); } }
  const vormEind = vormTab[Math.round((T.dicht - T.zuig0) / 4)];
  const vormVan = (t) => { if (t <= T.zuig0) return 0; if (t >= T.dicht) return 1; const r = (t - T.zuig0) / 4, a = Math.floor(r); return k019(mix9(vormTab[a], vormTab[Math.min(a + 1, vormTab.length - 1)], r - a) / vormEind); };
  const X0 = cx - ((M.box[0] + M.box[2]) / 2) * Kc;
  const NAAR = ((463.25 - 351) * 700 / 813.25 - ((L[0].b[0] + L[0].b[2]) / 2 - (216.1 + 469.1) / 2)) * Kc;
  const X1 = cx - ((L[0].b[0] + L[0].b[2]) / 2) * Kc + NAAR;
  const Xvan = (t) => X0 + UVan(t) * Kc;
  T.X1fout = X0 + Z.U[nZ - 1] * Kc - X1;
  const vVan = VM.vVan, vNaar = VM.vNaar.map(([u, v]) => { const p = merkOp(u, v); return [(p[0] - X1) / Kc, (p[1] - WY) / Kc]; });
  /* lijst 82 (Lucas koos "kantelen"): de armen van de letter kantelen als stijve latten om de punt naar hun hoek in het
     merk (links 72,9° naar 59,8°, rechts naar 66,5°); wat er dan nog verschilt schuift recht mee, dus rechte randen
     blijven recht. VVORM 'lijn' is de oude manier (elk punt recht naar zijn plek). */
  const naarL = (u, v) => { const p = merkOp(u, v); return [(p[0] - X1) / Kc, (p[1] - WY) / Kc]; };
  const vTip = naarL(463.25, 813.25), hk = (p, q) => Math.atan2(q[1] - p[1], q[0] - p[0]);
  const kantL = hk(vTip, naarL(0, 16)) - hk([216.1, 0], [0, -700]), kantR = hk(vTip, naarL(662.75, 354.75)) - hk([469.1, 0], [684.43, -700]);
  const kantW = vVan.map(([x]) => { const w = k019((x - vTip[0]) / 120 + 0.5); return w * w * (3 - 2 * w); });
  const vormOp = (f) => {
    if (T.VVORM !== 'kantel') return vVan.map(([x, y], j) => [mix9(x, vNaar[j][0], f), mix9(y, vNaar[j][1], f)]);
    return vVan.map(([x, y], j) => {
      const th = kantL + (kantR - kantL) * kantW[j], dx = x - vTip[0], dy = y - vTip[1];
      const c1 = Math.cos(th), s1 = Math.sin(th), cf = Math.cos(th * f), sf = Math.sin(th * f);
      const r1x = vTip[0] + dx * c1 - dy * s1, r1y = vTip[1] + dx * s1 + dy * c1;
      return [vTip[0] + dx * cf - dy * sf + (vNaar[j][0] - r1x) * f, vTip[1] + dx * sf + dy * cf + (vNaar[j][1] - r1y) * f];
    });
  };
  /* het vlaggetje: het stuk in lettermaten (y omhoog), om zijn zwaartepunt */
  const stuk = VM.stuk.map(([x, y]) => [x, -y]), cF = Z.brk.cVlag;
  const lokaal = stuk.map(([x, y]) => [x - cF[0], y - cF[1]]);
  const schermVan = (w) => [X0 + w[0] * Kc, WY - w[1] * Kc];
  const vlagVan = (t) => { const [a, u] = plek(t); const A = Z.vlag[a], B = Z.vlag[Math.min(a + 1, nZ - 1)]; if (!A) return B ? B.slice(0, 3) : null; if (!B || u === 0) return A.slice(0, 3); return [mix9(A[0], B[0], u), mix9(A[1], B[1], u), mix9(A[2], B[2], u)]; };
  const midVan = (h) => { const co = Math.cos(h[0]), si = Math.sin(h[0]); return [co * cF[0] - si * cF[1] + h[1], si * cF[0] + co * cF[1] + h[2]]; };
  /* waar het landt: het zwaartepunt van het vlaggetje in het merk */
  const gM = VM.plaats.gMidden, C1 = merkOp(701.75 + gM[0] / S_V, -gM[1] / S_V);
  /* het merk zwelt op tussen de laatste letter en de klik van het vlaggetje (snel, dan rustig, tot SW), om het midden van het
     beeld; het vlaggetje komt dus aan op de maat van het grotere merk */
  const zwel = (t) => (T.SW === 1 ? 1 : 1 + (T.SW - 1) * (1 - Math.pow(1 - fase9(t, T.dicht, T.land), 3)));
  /* zijn plek in wereldmaten, zoals de V op dat moment staat en zo groot als het merk dan is */
  const doelVan = (t) => { const z = zwel(t), sx = cx + z * (C1[0] + (Xvan(t) - X1) - cx), sy = cy + z * (C1[1] - cy); return [(sx - X0) / Kc, (WY - sy) / Kc]; };
  const hoekDoel = 2 * Math.PI * Math.round(KL.hoek / (2 * Math.PI));
  /* de stand van het vlaggetje: zwaartepunt (wereld), hoek */
  const LANGSW = [158.5 / Math.hypot(158.5, 366.25), 366.25 / Math.hypot(158.5, 366.25)];   /* de lange rand, omhoog (wereld) */
  /* lijst 81: het rechte vlaggetje. Vanaf de breuk recht omhoog langs zijn breuk, stil, dan recht naar zijn plek */
  let R = null;
  if (T.VLAG === 'recht') {
    const h0 = vlagVan(T.breek), a0 = h0[0], m0 = midVan(h0), r = (VR.HOEK * Math.PI) / 180;
    const op = [Math.cos(a0 + r), Math.sin(a0 + r)], top = [m0[0] + op[0] * VR.H, m0[1] + op[1] * VR.H];
    const dEind = doelVan(T.land), D = Math.hypot(dEind[0] - top[0], dEind[1] - top[1]), dir = [(dEind[0] - top[0]) / D, (dEind[1] - top[1]) / D];
    const vk = (1.8 * VR.DS) / T.TK, Da = D - VR.DS, Ta = (VR.MACHT * Da) / vk;
    T.top = T.klik - Ta; T.stijg = T.top - T.breek;
    const A = VR.IN / 2 + (1 - VR.IN - VR.UIT) + VR.UIT / 2;
    const stijg = (x) => { x = k019(x); let a;
      if (x <= VR.IN) a = (x - (VR.IN / Math.PI) * Math.sin((Math.PI * x) / VR.IN)) / 2;
      else if (x <= 1 - VR.UIT) a = VR.IN / 2 + (x - VR.IN);
      else { const y = x - (1 - VR.UIT); a = VR.IN / 2 + (1 - VR.IN - VR.UIT) + (y + (VR.UIT / Math.PI) * Math.sin((Math.PI * y) / VR.UIT)) / 2; }
      return a / A; };
    R = { a0, m0, op, top, dir, vk, Da, Ta, stijg, pK: [dEind[0] - dir[0] * VR.DS, dEind[1] - dir[1] * VR.DS] };
    T.recht = { stijgSec: T.stijg / 1000, trekSec: Ta / 1000, D, vkPxS: vk * Kc * 1000, Hpx: VR.H * Kc };
  }
  const vlagStand = (t) => {
    if (R) {
      if (t < T.top) { const e = R.stijg((t - T.breek) / T.stijg) * VR.H; return [[R.m0[0] + R.op[0] * e, R.m0[1] + R.op[1] * e], R.a0]; }
      if (t < T.klik) { const g = Math.pow(k019((t - T.top) / R.Ta), VR.MACHT), e = R.Da * g; return [[R.top[0] + R.dir[0] * e, R.top[1] + R.dir[1] * e], mix9(R.a0, hoekDoel, g)]; }
      const s = k019((t - T.klik) / T.TK), s2 = s * s, s3 = s2 * s, d = doelVan(t);
      const h00 = 2 * s3 - 3 * s2 + 1, h10 = s3 - 2 * s2 + s, h01 = -2 * s3 + 3 * s2;
      return [[h00 * R.pK[0] + h10 * T.TK * R.vk * R.dir[0] + h01 * d[0], h00 * R.pK[1] + h10 * T.TK * R.vk * R.dir[1] + h01 * d[1]], hoekDoel];
    }
    if (t < T.klik) { const h = vlagVan(t); return [midVan(h), h[0]]; }
    if (T.KLIK !== 'bocht') {
      const s = k019((t - T.klik) / T.TK), s2 = s * s, s3 = s2 * s, d = doelVan(t);
      const h00 = 2 * s3 - 3 * s2 + 1, h10 = s3 - 2 * s2 + s, h01 = -2 * s3 + 3 * s2;
      return [[h00 * KL.p[0] + h10 * T.TK * KL.v[0] + h01 * d[0], h00 * KL.p[1] + h10 * T.TK * KL.v[1] + h01 * d[1]], h00 * KL.hoek + h10 * T.TK * KL.w + h01 * hoekDoel];
    }
    const tau = k019((t - T.klik) / T.TK), s = 1 - (1 - tau) * (1 - tau), w = 1 - s, d = doelVan(t);
    const P1 = [KL.p[0] + KL.v[0] * T.TK / 6, KL.p[1] + KL.v[1] * T.TK / 6], kq = T.KQ * dKlik;
    const P2 = [d[0] + LANGSW[0] * kq, d[1] + LANGSW[1] * kq];
    const b0 = w * w * w, b1 = 3 * w * w * s, b2 = 3 * w * s * s, b3 = s * s * s;
    const p = [b0 * KL.p[0] + b1 * P1[0] + b2 * P2[0] + b3 * d[0], b0 * KL.p[1] + b1 * P1[1] + b2 * P2[1] + b3 * d[1]];
    return [p, mix9(KL.hoek, hoekDoel, s)];
  };
  /* het groeit naar zijn ware grootte op de laatste DG woordmaten naar zijn plek */
  const stukOp = (t) => {
    const [m, hoek] = vlagStand(t), d = doelVan(t), afst = Math.hypot(d[0] - m[0], d[1] - m[1]);
    const P = schermVan(m), sc = Kc * (1 + (zwel(t) / SK - 1) * glad9(1 - afst / T.DG)), co = Math.cos(hoek), si = Math.sin(hoek);
    return lokaal.map(([x, y]) => [P[0] + sc * (x * co - y * si), P[1] - sc * (x * si + y * co)]);
  };
  T.C1 = C1;
  const Q = null, vLand = [KL.v[0] * Kc, -KL.v[1] * Kc];
  const mat = (h, U) => `matrix(${Math.cos(h[0]).toFixed(6)} ${(-Math.sin(h[0])).toFixed(6)} ${Math.sin(h[0]).toFixed(6)} ${Math.cos(h[0]).toFixed(6)} ${(h[1] - U).toFixed(3)} ${(-h[2]).toFixed(3)})`;
  /* alleen voor de controle (kop/vlucht9.py): pas uitgerekend als iemand T.meet opvraagt */
  Object.defineProperty(T, 'meet', { enumerable: true, get: () => ({ C1, Q, vLand, Kc, VKs, X0, X1, WY, cx, cy, S, vNaar,
    spoor: Array.from({ length: Math.ceil((T.land - T.breek + 100) / 4) + 1 }, (_, k) => { const t = T.breek - 100 + 4 * k;
      return { t, X: Xvan(t), U: UVan(t), z: zwel(t), tr: L.map((_, i) => (i === 0 || t >= T.binnen[i - 1] ? null : trVan(t, i))), f: vormVan(t),
        stuk: t >= T.breek && t < T.land ? stukOp(t) : null }; }) }) });

  function stand(t) {
    const X = Xvan(t), U = UVan(t);
    const zuigt = t > T.zuig0;
    logoG.setAttribute('display', zuigt ? 'none' : 'inline');
    bewegG.setAttribute('display', zuigt ? 'inline' : 'none');
    if (zuigt) {
      for (let i = 1; i < n; i++) {
        const l = lagen[i];
        const binnen = t >= T.binnen[i - 1];
        l.g.setAttribute('display', binnen ? 'none' : 'inline');
        if (binnen) continue;
        const h = trVan(t, i);
        l.p.setAttribute('transform', mat(h, U));
        if (i === S) { stukGat.setAttribute('display', t >= T.breek ? 'inline' : 'none'); stukGat.setAttribute('transform', mat(h, U)); }
      }
      lagen[0].g.setAttribute('display', 'none');
    }
    const z = zwel(t);
    woordG.setAttribute('transform', `translate(${(cx * (1 - z)).toFixed(3)} ${(cy * (1 - z)).toFixed(3)}) scale(${z.toFixed(6)}) translate(${X.toFixed(3)} ${WY.toFixed(3)}) scale(${Kc.toFixed(6)})`);
    woordG.setAttribute('display', t >= T.land ? 'none' : 'inline');
    const f = vormVan(t);
    vormV.setAttribute('display', zuigt && t < T.land ? 'inline' : 'none');
    if (zuigt && t < T.land) vormV.setAttribute('d', pad9(vormOp(f)));
    const vliegt = t >= T.breek && t < T.land;
    vormStuk.setAttribute('display', vliegt ? 'inline' : 'none');
    if (vliegt) vormStuk.setAttribute('d', pad9(stukOp(t)));
    vG.setAttribute('display', t >= T.land ? 'inline' : 'none');
    const u = fase9(t, T.land, T.raak);
    /* het opgezwollen merk knalt samen met het vlaggetje tegen de achtergrond: van SW naar één kier kleiner dan zijn maat, eerst
       met een stoot, dan steeds sneller */
    const druk = T.SW + (1 - T.KIER - T.SW) * (T.STOOT * u + (1 - T.STOOT) * u * u);
    const sc = VKs * druk;
    let tf = `translate(${(cx - 351 * sc).toFixed(3)} ${(cy - 406.625 * sc).toFixed(3)}) scale(${sc.toFixed(6)})`;
    if (T.groei && t > T.raak + T.groei[0]) {
      /* de V groeit om zijn dikste punt (451,25 · 611,25, straal 91,5; zoals de oude poster80.js) tot de foto het beeld vult */
      const x = k019((t - T.raak - T.groei[0]) / T.groei[1]), e = x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
      const kx = cx + (451.25 - 351) * sc, ky = cy + (611.25 - 406.625) * sc;
      /* T.dekt: de halve diagonaal die gedekt moet worden (in maten van het beeld; standaard het hele beeld van 1600 × 900) */
      const sE = (T.dekt || Math.hypot(TB9, TH9) / 2) * 1.06 / (91.5 * sc), g = Math.exp(Math.log(sE) * e);
      const px = kx + (cx - kx) * e, py = ky + (cy - ky) * e;
      tf = `translate(${(px - 451.25 * sc * g).toFixed(3)} ${(py - 611.25 * sc * g).toFixed(3)}) scale(${(sc * g).toFixed(6)})`;
      T.groeiNu = e;
    } else T.groeiNu = 0;
    lijf.setAttribute('transform', tf); vlag.setAttribute('transform', tf);
    if (vZicht) vZicht.setAttribute('transform', tf);
    if (beeldClip) beeldClip.forEach((pp) => pp.setAttribute('transform', tf));
    if (dek) [...dek._vm.children].forEach((pp) => pp.setAttribute('transform', tf));
    const heelal = t >= T.raak, dt = Math.max(0, t - T.raak);
    /* het veld loopt in het venster al traag mee; bij de klap zweeft het uit (doorlopend, geen sprong) */
    const veld = 9000 + (K.venster ? 0.3 * Math.min(t, T.raak) : 0) + 5200 * (1 - Math.exp(-dt / 380)) + 0.9 * dt;
    if (K.venster) {
      doekR.setAttribute('display', heelal ? 'none' : 'inline');
      naR.setAttribute('display', heelal && K.naGrond ? 'inline' : 'none');
      vZicht.setAttribute('display', heelal ? 'inline' : 'none');
      return { doek: 1, veld, veldSchaal: 1 };
    }
    if (hard === 'snijdt') {
      doekR.setAttribute('display', 'none');
      dek.setAttribute('display', heelal ? 'inline' : 'none');
      [lijf, vlag].forEach((pp) => pp.setAttribute('display', heelal ? 'none' : 'inline'));
      return { doek: heelal ? 1 : 0, veld, veldSchaal: 1 };
    }
    doekR.setAttribute('display', heelal ? 'none' : 'inline');
    naR.setAttribute('display', heelal && K.naGrond ? 'inline' : 'none');
    [lijf, vlag].forEach((pp) => pp.setAttribute('fill', heelal ? K.naV : inkt));
    if (beeldG) { beeldG.setAttribute('display', heelal ? 'inline' : 'none'); [lijf, vlag].forEach((pp) => pp.setAttribute('display', heelal ? 'none' : 'inline')); }
    return { doek: heelal && !K.naGrond ? 1 : 0, veld, veldSchaal: 1 };
  }
  stand(0);
  return { stand, duur: T.eind, T };
}

export { maakAnimatie };
