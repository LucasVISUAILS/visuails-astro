// VISUAILS — video style data (German / DE). Localized copy of
// src/data/videoStyles.js — same shape and exports, only the human-readable
// strings are translated. Internal CTA paths are prefixed with /de; external
// wa.me links keep their domain, their ?text= message is translated.

function grid(photos, icons) {
  const widths = { bottle: '42%', sneaker: '54%', jar: '46%', bag: '46%' };
  return icons.map((icon, i) => ({ photo: photos[i] ?? null, icon, width: widths[icon] }));
}

export const videoStyles = [
  {
    slug: 'motion',
    name: 'Motion',
    tagline: 'Acht Sekunden ungeteilte Aufmerksamkeit.',
    priceTrust: '€49',
    priceUnit: ' / Video',
    ctaLabel: 'Motion bestellen',
    ctaHref: '/de/order-video',
    ctaExternal: false,
    heroIcon: 'bottle',
    heroWidth: '26%',
    cardIcon: 'bottle',
    cardWidth: '42%',
    cardPrice: 'Ab €49 / Video',
    cardDesc: 'Ein 8-Sekunden-Clip, subtile Bewegung, klare Präsentation. Festpreis. ~24 Std.',
    moodTitle: 'Wie sich Motion anfühlt.',
    moodParagraphs: [
      'Acht Sekunden, ein Produkt, eine klare Bewegung — genug, um den Blick zu halten, nie genug, um abzulenken.',
    ],
    steps: [
      { title: 'Fixiere den Bildausschnitt', body: 'Eine klare Komposition, die Kamera absolut still.' },
      { title: 'Füge subtile Bewegung hinzu', body: 'Leichtes Driften, sanfte Rotation oder Enthüllung.' },
      { title: 'Loope es nahtlos', body: 'Das letzte Bild knüpft an das erste an.' },
    ],
    grid: grid(
      [],
      ['bottle', 'sneaker', 'jar', 'bag', 'bottle', 'sneaker', 'jar', 'bag', 'bottle']
    ),
    craft: [
      { title: 'Eine Bewegung pro Film', body: 'Eine einzige, bewusste Kamera- oder Lichtbewegung. Zurückhaltung ist der Stil.' },
      { title: 'Loop-saubere Enden', body: 'Anfangs- und Endbilder abgestimmt, damit es nahtlos loopt.' },
      { title: 'Materialbewusste Bewegung', body: 'Geschwindigkeit und Licht abgestimmt auf das, woraus das Produkt besteht.' },
      { title: 'Auf Stills abgestimmtes Grading', body: 'Teilt ein Grading mit deinem Katalog-Satz.' },
    ],
    why: [
      { title: 'Leben ohne Lärm', body: 'Vollendet, was ein statisches Foto nicht ganz sagen kann.' },
      { title: 'Jedes Format, ein Dreh', body: 'Geschnitten für quadratisch, hochkant und breit aus einer Datei.' },
      { title: 'Bereit für den Scroll', body: '8 Sekunden, gebaut, um Aufmerksamkeit zu halten.' },
    ],
    bestFor: [
      'Produktseiten, die Leben brauchen',
      'Social Feeds und einfache Ads',
      'E-Mail-Header und Launch-Teaser',
      'Marktplätze, die Video unterstützen',
    ],
    whatYouGet: [
      'Klarer Produktfilm von 8 Sekunden',
      'Nahtloser Loop, subtile Bewegung',
      'Format geschnitten für deinen Kanal',
      'Lieferung in ~24 Std., von Hand geprüft',
    ],
  },
  {
    slug: 'lifestyle',
    name: 'Lifestyle Video',
    tagline: 'Die Szene, in Bewegung gesetzt.',
    priceTrust: '€59',
    priceUnit: ' / Video',
    ctaLabel: 'Lifestyle Video bestellen',
    ctaHref: '/de/order-video',
    ctaExternal: false,
    heroIcon: 'jar',
    heroWidth: '26%',
    cardIcon: 'jar',
    cardWidth: '46%',
    cardPrice: 'Ab €59 / Video',
    cardDesc: 'Eine gestylte Szene, in Bewegung — für Social und Ads. Festpreis. ~24 Std.',
    moodTitle: 'Wie sich Lifestyle Video anfühlt.',
    moodParagraphs: [
      'Eine gestylte Szene, losgelassen: aufsteigender Dampf, wechselndes Licht, ein Model, das sich zur Linse dreht.',
    ],
    steps: [
      { title: 'Baue die Szene', body: 'Deine Welt der Lifestyle-Stills, in Bewegung gebracht.' },
      { title: 'Führe Lichtbewegung', body: 'Natürliche Geste und Licht, das beobachtet wirkt.' },
      { title: 'Schneide für den Kanal', body: 'Formatiert für dort, wo es laufen wird.' },
    ],
    grid: grid(
      [],
      ['bottle', 'sneaker', 'jar', 'bag', 'bottle', 'sneaker', 'jar', 'bag', 'bottle']
    ),
    craft: [
      { title: 'Geschichte in einem Atemzug', body: 'Ein Moment — Enthüllung, Nutzung oder Stimmung — in wenigen Sekunden.' },
      { title: 'Szenen-Kontinuität', body: 'Sets, Licht und Models passen zu deinen Lifestyle-Stills.' },
      { title: 'Vertikal-first-Regie', body: 'Getaktet zuerst für 9:16, 1:1- und 16:9-Schnitte verfügbar.' },
      { title: 'Bewegung mit Manieren', body: 'Geschmeidig und bewusst — teuer, nicht hektisch.' },
    ],
    why: [
      { title: 'Kontinuität mit deinen Stills', body: 'Dasselbe Model, Licht und Stimmung — jetzt in Bewegung.' },
      { title: 'Gebaut für Short-Form', body: 'Getaktet für Reels, TikTok und Shorts.' },
      { title: 'Ein Dreh, zwei Assets', body: 'Stills und Bewegung aus derselben gestylten Szene.' },
    ],
    bestFor: [
      'Reels, TikTok und Shorts',
      'Ads, die Wärme und Kontext brauchen',
      'Launches, die Stills und Film gemeinsam tragen',
      'Marken, die eine wiedererkennbare Welt aufbauen',
    ],
    whatYouGet: [
      'Gestylte Short-Form-Szene in Bewegung',
      'Kontinuität mit deinen Lifestyle-Stills',
      'Konsistente Models verfügbar',
      'Lieferung in ~24 Std., von Hand geprüft',
    ],
  },
  {
    slug: 'campaign',
    name: 'Campaign',
    tagline: 'Dein größter Moment, richtig produziert.',
    priceTrust: 'Angebot pro Projekt',
    priceUnit: '',
    ctaLabel: 'Kampagnen-Angebot einholen',
    ctaHref: 'https://wa.me/31625436130?text=Hallo%20VISUAILS%2C%20ich%20h%C3%A4tte%20gerne%20ein%20Angebot%20f%C3%BCr%20ein%20Kampagnenvideo.',
    ctaExternal: true,
    heroIcon: 'sneaker',
    heroWidth: '26%',
    cardIcon: 'sneaker',
    cardWidth: '56%',
    cardPrice: 'Individuelles Angebot',
    cardDesc: 'Kampagnenstücke mit mehreren Aufnahmen, rund um deinen Brief gebaut. Preis pro Projekt.',
    moodTitle: 'Wie sich Campaign anfühlt.',
    moodParagraphs: [
      'Die volle Produktion: mehrere Aufnahmen, ein erzählerischer Bogen, Schnitte, die einen Launch landen.',
    ],
    steps: [
      { title: 'Scope der Kampagne festlegen', body: 'Aufnahmen und Deliverables per WhatsApp vereinbart.' },
      { title: 'Drehe die Sequenz', body: 'Ein Film mit mehreren Aufnahmen, als eine Geschichte gegradet.' },
      { title: 'Liefere jeden Schnitt', body: 'Das Format jedes Kanals, aus einer Kampagne.' },
    ],
    grid: grid(
      [],
      ['bottle', 'sneaker', 'jar', 'bag', 'bottle', 'sneaker', 'jar', 'bag', 'bottle']
    ),
    craft: [
      { title: 'Ein Brief, ernst genommen', body: 'Shotlist und Geschichte auf deinen Launch gebaut, kein Template.' },
      { title: 'Aufbau mit mehreren Aufnahmen', body: 'Opener, Details, Hero-Momente, Endcards — in Sequenz.' },
      { title: 'Schneiden, graden, liefern', body: 'Schnitte für Feed, Stories und Site, ein gemeinsames Grading.' },
      { title: 'Ein Festpreis, im Voraus', body: 'Per WhatsApp gescopet. Du gibst frei, bevor wir starten.' },
    ],
    why: [
      { title: 'Ein Partner für die ganze Kampagne', body: 'Stills, Bewegung und jeder Schnitt, ein Brief.' },
      { title: 'Ein Grading, jeder Kanal', body: 'Konsistente Farbe und Stimmung über jedes Format.' },
      { title: 'Bepreist, bevor du dich festlegst', body: 'Ein klares Angebot, vereinbart bevor Arbeit beginnt.' },
    ],
    bestFor: [
      'Produkt-Launches und saisonale Drops',
      'Markenfilme und Store-Takeovers',
      'Kampagnen, die Stills und Film umspannen',
      'Teams, die einen Partner für alles brauchen',
    ],
    whatYouGet: [
      'Ein gescopeter Kampagnenfilm mit mehreren Aufnahmen',
      'Schnitte für jeden Kanal, auf dem du bist',
      'Ein Grading über deine ganze Kampagne',
      'Ein klarer, vereinbarter Preis, bevor die Arbeit beginnt',
    ],
  },
  {
    slug: 'custom',
    name: 'Custom',
    tagline: 'Ein Videokonzept, komplett rund um deine Marke gebaut.',
    priceTrust: 'Angebot pro Projekt',
    priceUnit: '',
    ctaLabel: 'Ein individuelles Video besprechen',
    ctaHref: 'https://wa.me/31625436130?text=Hallo%20VISUAILS%2C%20ich%20m%C3%B6chte%20gerne%20ein%20individuelles%20Video%20besprechen.',
    ctaExternal: true,
    heroIcon: 'jar',
    heroWidth: '26%',
    cardIcon: 'jar',
    cardWidth: '46%',
    cardPrice: 'Individuelles Angebot',
    cardDesc: 'Dein eigenes Konzept, Tempo und Look — ein Video komplett auf deinen Brief zugeschnitten.',
    moodTitle: 'Wie sich Custom anfühlt.',
    moodParagraphs: [
      'Jenseits der drei Formate — ein Videokonzept, zugeschnitten auf deinen Brief: deine Geschichte, dein Tempo, dein Look.',
    ],
    steps: [
      { title: 'Brief', body: 'Erzähl uns die Idee und wo sie laufen soll.' },
      { title: 'Konzept', body: 'Wir gestalten ein individuelles Motion-Konzept und scopen es mit dir.' },
      { title: 'Liefern', body: 'Jeder Schnitt, den du brauchst, als einer gegradet.' },
    ],
    craft: [
      { title: 'Aus deiner Idee gebaut', body: 'Kein Template — das Konzept beginnt bei deinem Brief und deinen Referenzen.' },
      { title: 'Gescopet, bevor wir starten', body: 'Aufnahmen, Länge und Deliverables im Voraus vereinbart, klar bepreist.' },
      { title: 'Jedes Format, ein Grading', body: 'Schnitte für Feed, Stories und Site, alle mit einem Look.' },
      { title: 'Konsistent mit deinen Stills', body: 'Farbe und Stimmung abgestimmt auf deinen Katalog- und Lifestyle-Satz.' },
    ],
    why: [
      { title: 'Genau deine Idee', body: 'Ein Konzept, geformt nach deiner Marke, nicht in ein Preset gepresst.' },
      { title: 'Ein Partner, ein Look', body: 'Stills und Bewegung, die klar zusammengehören.' },
      { title: 'Bepreist, bevor du dich festlegst', body: 'Ein klares Angebot, vereinbart bevor Arbeit beginnt.' },
    ],
    bestFor: [
      'Ideen, die die drei Formate nicht abdecken',
      'Launches mit einer bestimmten Geschichte',
      'Marken, die einen unverwechselbaren Motion-Stil wollen',
      'Alles, was pro Projekt gescopet und bepreist wird',
    ],
    whatYouGet: [
      'Ein maßgeschneidertes Videokonzept, mit dir gestaltet',
      'Jeder Schnitt, den deine Kanäle brauchen',
      'Ein Grading über das ganze Stück',
      'Ein klarer, vereinbarter Preis, bevor die Arbeit beginnt',
    ],
  },
];

export function getVideoStyle(slug) {
  return videoStyles.find((s) => s.slug === slug);
}
