/* VISUAILS — de bannervideo van de voorpagina (levering 94, 12 november 2026, lijst 92).
   ═══════════════════════════════════════════════════════════════════════════

   Lucas, 06:43: "Ik wil deze video als banner video" (zijn montage opener-montage-gegrade.mov, 1920 × 1080, 24 per seconde,
   26,75 s), met de teksten ernaast zoals in zijn voorbeeld, breder dan de rest van de site. 06:46: "Ik wil dat er ook wat
   tekst uitleg komt in VISUAILS style om uit te leggen wat er precies gebeurt en wat VISUAILS doet. Zorg ervoor dat het niet
   lijkt alsof VISUAILS een kledingmerk is." Lijst 92: banner goed, uitleg a (per stap, met balkjes), kop a, laptop b (na Wat
   we maken), scherp a (1920 en 1280). Zijn notities: "Alleen op de homepage bewegen alle teksten mee met negatief", een
   pauzeknop bij de balkjes, beter gespatieerd, de bovenbalk weg als de pagina helemaal bovenaan staat; en het negatief met
   wat blauw uur erin, "een mix van negatief en warmtebeeld maar niet het gele en alle andere te intense warmte kleuren".

   Levering 95 (lijst 94, A5 a): "Maar je bent toch geen kledingmerk?" Daarom zegt de kop nu wie wat doet. En (zijn
   notitie): "Het maakt niet uit hoe klanten foto's maken dus haal telefoonfoto's weg en maak er gewoon "foto's" van. Hoe
   beter de camera is hoe beter de resultaten zullen zijn."

   Levering 110 (16 november 2026, lijst 119 tot 122). De kop: "We make your brand impossible to ignore" (Lucas, 03:13 en
   03:17: done for you erin, "zorg ervoor dat het niet corny klinkt"), zonder interpunctie (lijst 122, Q3 a: alleen de titel).
   Opbouw b: de eerste regel is een kleine aanloop, de tweede vult de kolom (banner-94.css). De letter: VISUAILS Display Blok.
   De zin in het vlak zegt niet meer alleen productfoto's, lifestyle en video (03:00: "Houd het algemeen"). Onder de video
   een kort blok (onder): wat VISUAILS doet en wat de klant eraan heeft (Lucas, 03:29, de tekst letterlijk van hem).

   De hoofdstukken: de knippen in de video, gemeten met ffmpeg (scene > 0,2): 4,25 · 6,75 · 9,33 · 14,42 s. */

export const HOOFDSTUKKEN = [0, 4.25, 6.75, 9.33, 14.42];

/* Levering 114 (17 november 2026). De kop (Lucas, 00:46): "Your fashion brand deserves to be seen", gecentreerd op de video.
   Was "We make your brand impossible to ignore" (levering 110).
   levering 120 (19 november 2026, lijst 132): het masker van de telefoon (MASKER, scripts/telefoon-masker.py) en de kaart van
   het negatief (KAART, kaartTabel) zijn weg: de kop is gewone tekst in één kleur die met de video meeloopt (KOP_LICHT,
   kopPlan hieronder). */
export const DUUR = 26.75;

/* levering 120, ronde 2 (19 november 2026, lijst 133, kleur a): de kop kiest zelf zwart of wit, uit het licht achter de
   tekst. Lucas: "Ik wil niet de hele tijd dat hij tussendoor wisselt dus probeer zo lang mogelijk 1 kleur te houden".
   (Ronde 1 had vaste tijden, KLEUR_EIND en kopWit: wit van 4,25 tot 25 s. Wit zakte op de lichte stukken naar 1,1 : 1.)

   HET LICHT (KOP_LICHT, scripts/kop-licht-120.py): de video in het klein (384 × 216), per beeld (24 per seconde), in het
   vak waar de kop op een breed scherm staat: het licht van het donkerste 40 % en van het lichtste 40 % (zoals de oude
   kopKleur, levering 115). Inkt leest tegen het donkerste deel, wit tegen het lichtste:
     contrast inkt = (donker + 0,05) / (0,0037 + 0,05)      contrast wit = 1,05 / (licht + 0,05)
   HET PLAN (kopPlan): één kleur voor titel en zin, per beeld, met deze regels:
     - begin en eind in inkt (het beeld is daar wit);
     - blijf bij de kleur zolang hij minstens 3 : 1 haalt; wissel alleen op een beeld waar hij daaronder zakt én de andere
       kleur minstens 15 % beter is;
     - houd elke kleur minstens 1,5 s vast;
     - een wissel moet minstens 0,25 s onleesbare kop schelen; anders blijft hij (zo slaat hij een korte flits over, zoals
       die op 16 s, en wisselt hij niet heen en weer).
   Omdat de video vastligt, kijkt het plan vooruit (het rekent de hele lus in één keer, het minste aantal onleesbare beelden
   plus 0,25 s per wissel). Live meten kan niet vooruitkijken: dan wisselde hij in een doorloop 10 keer en zat hij na elke
   wissel 1,5 s vast, ook in een flits (gemeten, notities-K.md, ronde 2). */
export const KOP_LICHT = { fps: 24, beelden: 642, vak: [0.033, 0.36, 0.17, 0.49], d: '/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz86e7q7+vw7fDu8e/x7/Hv8e/x7/Hv8vDy8PLw8vDy8PLw8vDy8PLw8vDy8PLw8vDy8PLw8vDy8PLw8vDy8PLw8vDy7fHt8ezw7PDr8Ovw6+/q7+jv4u/X78rvte+c75Hvhu9973bvcO5r7mfuZe5i7mDuXu5d7lvtFBkWGxccGB0YHRofGh8bIBwhHSMeIx8kHyUhJyEnIigjKSQqJSslLCYsJy0oLigvKTAqMisyLDPr7fL08vXy9fP18/bz9vP29Pf1+PX49fj1+PT49Pj0+PT49Pj0+PT49Pj0+PT49Pj0+PT38/fz9/P38/fz9/P38/by9igxKTIqMioyKzIsNCw1LTUtNSw1LDUrNSo1KjUqNSk1KTUpNSk1KTUpNSk1KTUpNbToseiw6K3oquin6KXoouie6Jboiuh+6HbpcOlw6Xjpg+mM6ZPpm+mi6q3pueq96sLqxOrG6srqffB98IDwhPCJ8I7wk/CZ8J7wovCl8Kjwq/Gt8K/wsvG18bnxvPG/8cbxyvHN8dLx1fHY8dvy3/Li8uny7vJOaE1nS2RKYUlfR1tEVEJPQkxBSkFKQEpASkBJQElASUBKQElASkBKQEpASkBKQEpBS0FLQEtBS0BLQEtBS0FMQUxBS0FMQUxBTEBLQEsoMSkyKTIpMigxKTIpMikyKDEpMikyKTEoMSkyKTIpMikxKjIqMioyKTEqMioyKjIpMSoyKjIqMioxKjIqMioyKjIrMyszKjLa39jd1tzS2crXu9CkyEy4RaQ/UT1IPEQ9RD5FQElDTEdSS1VQWVNdV2BXYVljWmJaYldgVl9SXE9aS1dJVEhRMDUvNC81MDUwNS80MDUwNTA1MDUwNTA1MDYwNTA1MDYwNjA2MDYwNjA2MDYwNjA3MDcwNjA3MDcwNzA3MDcwNzA4MDcwODA4MTkxOZylm6WbpZulm6WbpJukm6SbpJukm6SbpJukm6SbpJukm6SbpJukm6SbpJukm6SbpJukm6ObpJujPEA7QDtAO0A7QDo/Oj86Pzo/OT45Pjk+Oj45Pjk+OT45Pjg9OT05PTk9OT05PTo+O0A8QD1CP0NAR0FKQU5DVUZbSF5JX0pcSVpCUz5MO0I4OzY5RWFFYERgRWBEX0NeQ11CXUFcQFo/WT9YPlY9VTtTO1M5UjhQN084UDZONU4ySi9FLEQoQyZAJD4gNxwwGSoZJxYhFB0TGxMaEhkRGBEYERoRIREpEjwURRRDF0IlQjZDN0I3QTdANz82PTU7NDs1OzQ6MzkzOTM5MzgyODI4MzkyODI3MzkzOjM5MzkzOjU8NTw1PDY9Nz43Pjk/PENBR0dNTlRVWlxhYmdnbW1zc3l5f36Eg4mIjo2TkpiYnaGnqK2xtrm9wcTJzNDT19re4eTm6uzu8PL09vf5+fv7/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8' };
export const KOP_REGELS = { grens: 3, beter: 1.15, vast: 1.5, prijs: 0.25 };
const INKT_L = 0.0037;   /* het licht van inkt #090D0B */
const lin = (b) => { const c = b / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };

/** Het plan voor de kleur van de kop: per beeld 0 (inkt) of 1 (wit), de wissels, en het contrast van de gekozen kleur. */
export function kopPlan(licht = KOP_LICHT, regels = KOP_REGELS) {
  const bytes = Uint8Array.from(atob(licht.d), (c) => c.charCodeAt(0));
  const n = licht.beelden, fps = licht.fps, H = Math.round(regels.vast * fps), prijs = regels.prijs * fps;
  const c = [new Float64Array(n), new Float64Array(n)];
  for (let i = 0; i < n; i++) { c[0][i] = (lin(bytes[2 * i]) + 0.05) / (INKT_L + 0.05); c[1][i] = 1.05 / (lin(bytes[2 * i + 1]) + 0.05); }
  const slecht = (k, i) => (c[k][i] < regels.grens ? 1 : 0);
  /* kosten[i][k][h]: de minste kosten tot beeld i, in kleur k, h beelden sinds de laatste wissel (hoogstens H) */
  const S = 2 * (H + 1), kosten = new Float64Array(n * S).fill(Infinity), van = new Int32Array(n * S).fill(-1);
  const plek = (i, k, h) => i * S + k * (H + 1) + h;
  kosten[plek(0, 0, H)] = slecht(0, 0);
  for (let i = 1; i < n; i++) for (let k = 0; k < 2; k++) for (let h = 0; h <= H; h++) {
    const v = kosten[plek(i - 1, k, h)]; if (v === Infinity) continue;
    const nh = Math.min(H, h + 1), blijf = plek(i, k, nh), w = v + slecht(k, i);
    if (w < kosten[blijf]) { kosten[blijf] = w; van[blijf] = plek(i - 1, k, h); }
    const k2 = 1 - k;
    if (h >= H && c[k][i] < regels.grens && c[k2][i] >= regels.beter * c[k][i]) {
      const naar = plek(i, k2, 1), w2 = v + slecht(k2, i) + prijs;
      if (w2 < kosten[naar]) { kosten[naar] = w2; van[naar] = plek(i - 1, k, h); }
    }
  }
  let beste = -1; for (let h = 0; h <= H; h++) { const p = plek(n - 1, 0, h); if (beste < 0 || kosten[p] < kosten[beste]) beste = p; }
  const kleur = new Uint8Array(n);
  for (let p = beste, i = n - 1; i >= 0 && p >= 0; i--, p = van[p]) kleur[i] = Math.floor((p % S) / (H + 1));
  const wissels = [], contrast = new Float64Array(n);
  for (let i = 0; i < n; i++) { contrast[i] = c[kleur[i]][i]; if (i && kleur[i] !== kleur[i - 1]) wissels.push({ beeld: i, t: i / fps, naar: kleur[i] ? 'wit' : 'inkt' }); }
  return { fps, kleur, wissels, contrast };
}

export const BANNER = {
  nl: {
    /* levering 120 (19 november 2026, lijst 130 en 132): één titel in één maat, met een korte beschrijving eronder. Was
       kop: ['Jouw modemerk', 'verdient gezien te worden'] (een kleine aanloop en een grote regel), met kopTelefoon. */
    titel: 'De beeldmakers achter jouw merk',
    beschrijving: 'Productfoto’s, lifestylebeelden en video’s van je kleding. AI legt de basis, wij werken elk beeld af en controleren het tot in detail.',
    zin: 'Stuur een paar foto’s van je product. Je krijgt elk beeld terug dat je merk nodig heeft, klaar voor je winkel, je feed en je advertenties.',
    onder: {
      kop: 'Elk beeld dat je merk nodig heeft, zonder moeite.',
      label: 'Wat VISUAILS doet',
      wat: 'Wij nemen het hele beeldproces van je over.',
      waarom: 'Zo gaat je tijd naar wat je merk laat groeien: verkopen. En je hebt altijd iets nieuws om te posten.',
    },
    hoek: 'Voorbeeld · van foto tot campagne',
    stappen: [
      ['Jouw foto', 'Je fotografeert je product. Hoe beter de camera, hoe beter het resultaat.'],
      ['Productfoto’s', 'Wij maken er productfoto’s van, op de achtergrondkleur van je winkel.'],
      ['Details', 'Close-ups van de stof, de sluiting en de afwerking.'],
      ['On-model', 'Gedragen door een model dat bij je merk past.'],
      /* levering 117 (17 november 2026, proefronde P6-05): was 'En lifestyle en video op locatie, voor je feed en je
         advertenties.' Niets is een echte plek (AI Act-pagina), dus 'in een gebouwde scène'. Even breed gehouden (gemeten in
         DM Sans 13,5 px: 471 tegen 472 px), zodat de balk bij stap 05 niet breder wordt. */
      ['Campagne', 'Lifestyle en video in een gebouwde scène, voor je feed en ads.'],
    ],
    stap: 'Stap',
    pauze: 'Zet de video stil', speel: 'Laat de video lopen',
    naar: (i, naam) => `Naar stap ${i}: ${naam}`,
    video: 'Video: een foto van een jas wordt productfoto’s, details, on-model en een campagne bij een waterval',
  },
  en: {
    /* levering 120 (lijst 130 en 132): was kop: ['Your fashion brand', 'deserves to be seen'] */
    titel: 'Your brand’s visual content partner',
    beschrijving: 'Product photos, lifestyle images and videos of your clothing. AI lays the groundwork; we finish every image and check it down to the last detail.',
    zin: 'Send a few photos of your product. You get back every visual your brand needs, ready for your shop, your feed and your ads.',
    onder: {
      kop: 'Every visual your brand needs, without the effort.',
      label: 'What VISUAILS does',
      wat: 'We take the whole visual process off your hands.',
      waarom: 'Your time goes to what grows your brand: selling. And you always have something new to post.',
    },
    hoek: 'Example · from photo to campaign',
    stappen: [
      ['Your photo', 'You photograph your product. The better the camera, the better the result.'],
      ['Product photos', 'We turn it into product photos, on your shop’s background colour.'],
      ['Details', 'Close-ups of the fabric, the fastening and the finish.'],
      ['On-model', 'Worn by a model who suits your brand.'],
      /* levering 117 (P6-05): was 'Then lifestyle and video on location, for your feed and your ads.' (475 px, nu 467 px) */
      ['Campaign', 'Then lifestyle and video in a built scene, for your feed and ads.'],
    ],
    stap: 'Step',
    pauze: 'Pause the video', speel: 'Play the video',
    naar: (i, naam) => `Go to step ${i}: ${naam}`,
    video: 'Video: a photo of a jacket becomes product photos, details, on-model shots and a campaign at a waterfall',
  },
};
