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

   De hoofdstukken: de knippen in de video, gemeten met ffmpeg (scene > 0,2): 4,25 · 6,75 · 9,33 · 14,42 s. */

export const HOOFDSTUKKEN = [0, 4.25, 6.75, 9.33, 14.42];
export const DUUR = 26.75;

export const BANNER = {
  nl: {
    kop: ['Jij maakt de kleding.', 'Wij maken de beelden.'],
    zin: 'Stuur een paar foto’s van je product. Je krijgt productfoto’s, lifestyle en video terug, klaar voor je winkel en je advertenties.',
    hoek: 'Voorbeeld · van foto tot campagne',
    stappen: [
      ['Jouw foto', 'Je fotografeert je product. Hoe beter de camera, hoe beter het resultaat.'],
      ['Productfoto’s', 'Wij maken er productfoto’s van, op de achtergrondkleur van je winkel.'],
      ['Details', 'Close-ups van de stof, de sluiting en de afwerking.'],
      ['On-model', 'Gedragen door een model dat bij je merk past.'],
      ['Campagne', 'En lifestyle en video op locatie, voor je feed en je advertenties.'],
    ],
    stap: 'Stap',
    pauze: 'Zet de video stil', speel: 'Laat de video lopen',
    naar: (i, naam) => `Naar stap ${i}: ${naam}`,
    video: 'Video: een foto van een jas wordt productfoto’s, details, on-model en een campagne bij een waterval',
  },
  en: {
    kop: ['You make the clothes.', 'We make the visuals.'],
    zin: 'Send a few photos of your product. You get product photos, lifestyle and video back, ready for your shop and your ads.',
    hoek: 'Example · from photo to campaign',
    stappen: [
      ['Your photo', 'You photograph your product. The better the camera, the better the result.'],
      ['Product photos', 'We turn it into product photos, on your shop’s background colour.'],
      ['Details', 'Close-ups of the fabric, the fastening and the finish.'],
      ['On-model', 'Worn by a model who suits your brand.'],
      ['Campaign', 'Then lifestyle and video on location, for your feed and your ads.'],
    ],
    stap: 'Step',
    pauze: 'Pause the video', speel: 'Play the video',
    naar: (i, naam) => `Go to step ${i}: ${naam}`,
    video: 'Video: a photo of a jacket becomes product photos, details, on-model shots and a campaign at a waterfall',
  },
};

/* Het negatief in blauw uur (lijst 92, A3 b met zijn notitie). In de letters: de video omgekeerd, en dat voor 85 % door deze
   kaart gekleurd (de helderheid van het negatief, 0 = wat licht was). Licht wordt inkt (op wit gewoon de normale kop), daarna
   blauw uur en Nevel naar bijna wit; rond het midden steil, zodat de letters op grijs zo kort mogelijk grijs zijn. Geen geel,
   geen warme kleuren. Alle kleuren uit docs/KLEURENSCHEMA.md (inkt, Blauw uur, Nevel, Wit) en hun fades. */
export const KAART = [[0, '0F1217'], [0.3, '1A2E52'], [0.45, '25508B'], [0.55, 'A2B7D2'], [0.75, 'DCE5F2'], [1, 'FBFCFF']];
export const KAART_DEEL = 0.85;

/** 256 kleuren (r, g, b) voor de kaart: de opzoektabel van de videokaart. */
export function kaartTabel() {
  const uit = [];
  for (let i = 0; i < 256; i++) {
    const x = i / 255;
    let j = 0; while (j + 1 < KAART.length - 1 && x > KAART[j + 1][0]) j++;
    const [a, ca] = KAART[j], [b, cb] = KAART[j + 1], f = Math.min(1, Math.max(0, (x - a) / (b - a)));
    for (const k of [0, 2, 4]) uit.push(Math.round(parseInt(ca.slice(k, k + 2), 16) * (1 - f) + parseInt(cb.slice(k, k + 2), 16) * f));
  }
  return uit;
}
