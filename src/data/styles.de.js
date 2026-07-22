// VISUAILS — lifestyle style data (German / DE). Localized copy of
// src/data/styles.js — same shape and exports, only the human-readable
// strings are translated. Order paths are prefixed with /de.

function grid(photos, icons) {
  const widths = { bottle: '42%', sneaker: '54%', jar: '46%', bag: '46%' };
  return icons.map((icon, i) => ({ photo: photos[i] ?? null, icon, width: widths[icon] }));
}

export const styles = [
  {
    slug: 'dunes',
    name: 'Dunes',
    tagline: 'Sonne, Sand und leise Eleganz.',
    heroPhoto: '/img/lifestyle-dunes-01.webp',
    cardPhoto: '/img/lifestyle-dunes-01.webp',
    beforeAfter: { before: '/img/lifestyle-dunes-02.webp', after: '/img/lifestyle-dunes-01.webp' },
    cardIcon: 'bag',
    cardDesc: 'Warme, sonnendurchflutete Editorial-Szenen mit weichem natürlichem Licht und erdigen, sandfarbenen Umgebungen — ein gehobenes, aspirationelles Gefühl, das Premium-Produkten schmeichelt.',
    moodTitle: 'Wie sich Dunes anfühlt.',
    moodParagraphs: [
      'Sonnendurchfluteter Minimalismus, erdige Töne, lange weiche Schatten. Der Look leiser Eleganz.',
      'Es gibt Produkten Raum, selbstverständlich zu wirken. Wüstenlicht, Leinentexturen, Negativraum, der spricht.',
    ],
    steps: [
      { title: 'Finde den Horizont', body: 'Weite, ruhige Kompositionen mit Raum zum Atmen um das Produkt.' },
      { title: 'Lass Schatten wachsen', body: 'Langes, flaches Licht für eine hochwertige, unaufgeregte Stimmung.' },
      { title: 'Lass Platz für Worte', body: 'Ein Bildausschnitt, der Raum für deine eigene Botschaft und dein Layout lässt.' },
    ],
    grid: grid(
      ['/img/lifestyle-dunes-02.webp'],
      ['bottle', 'sneaker', 'jar', 'bag', 'bottle', 'sneaker', 'jar', 'bag', 'bottle']
    ),
    craft: [
      { title: 'Eine zurückhaltende Palette, konsequent durchgesetzt', body: 'Sand, Knochen, Terrakotta und Schatten. Alles Lautere wird entfernt, bevor es ins Bild gelangt.' },
      { title: 'Geometrie des langen Lichts', body: 'Schatten fallen tief und lang, geben flachen Produkten Dimension und Premium-Produkten Gewicht.' },
      { title: 'Textur als Luxus', body: 'Stein, Putz und gewebte Oberflächen werden mit der Präzision wiedergegeben, die Minimalismus teuer wirken lässt.' },
      { title: 'Bewusst gelassener Raum', body: 'Kompositionen halten großzügigen Negativraum — bereit für Text oder für Stille.' },
    ],
    why: [
      { title: 'Leise Eleganz, ohne die Studiokosten', body: 'Die Zurückhaltung eines Premium-Shootings, zum gewöhnlichen Visual-Preis.' },
      { title: 'Gebaut für Ruhe', body: 'Eine Stimmung, die das Produkt unterstützt, statt mit ihm zu konkurrieren.' },
      { title: 'Kampagnen-flexibel', body: 'Negativraum, der für Ads, Banner und Verpackung gleichermaßen funktioniert.' },
    ],
    bestFor: ['Premium-Skincare, Schmuck und Lederwaren', 'Marken, die Ruhe verkaufen, kein Rauschen', 'Kampagnen mit einer zurückhaltenden Stimme', 'Produkte, die eine Galeriebehandlung verdienen'],
    whatYouGet: ['Sonnendurchflutete, erdige minimalistische Szenen', 'Premium-Beleuchtung mit langen Schatten', 'Kompositionen mit Raum für deine Botschaft', 'Lieferung in ~24 Std., von Hand geprüft'],
  },
  {
    slug: 'flash',
    name: 'Flash',
    tagline: 'Direkter Blitz. Ohne Entschuldigung.',
    heroPhoto: '/img/lifestyle-flash-01.webp',
    cardPhoto: '/img/lifestyle-flash-02.webp',
    beforeAfter: { before: '/img/lifestyle-flash-07.webp', after: '/img/lifestyle-flash-01.webp' },
    cardIcon: 'sneaker',
    cardDesc: 'Energiegeladene, blitzbeleuchtete Visuals mit Nightlife-/Editorial-Gefühl — kräftig, kontrastreich, trendgetrieben.',
    moodTitle: 'Wie sich Flash anfühlt.',
    moodParagraphs: [
      'Hartes On-Camera-Licht, tiefe Schatten, Farbe, die knallt. Der Nightlife-Look, konfrontativ by design.',
      'Falsch gemacht ist es einfach nur hart. Richtig gemacht ist es elektrisierend. Wir haben eine Disziplin daraus gemacht.',
    ],
    steps: [
      { title: 'Setze hartes Licht', body: 'Der Blitz so positioniert, dass das Produkt sauber aus dem Dunkeln geschnitten wird.' },
      { title: 'Zeichne mit Schatten', body: 'Negativraum bewusst geformt — nie versehentlich leer gelassen.' },
      { title: 'Schütze das Produkt', body: 'Kontrast hart hochgezogen, ohne Farbe oder Textur auszubrennen.' },
    ],
    grid: grid(
      ['/img/lifestyle-flash-01.webp', '/img/lifestyle-flash-02.webp', '/img/lifestyle-flash-03.webp', '/img/lifestyle-flash-04.webp', '/img/lifestyle-flash-05.webp', '/img/lifestyle-flash-06.webp', '/img/lifestyle-flash-07.webp', '/img/lifestyle-flash-08.webp'],
      ['bottle', 'sneaker', 'jar', 'bag', 'bottle', 'sneaker', 'jar', 'bag', 'bottle']
    ),
    craft: [
      { title: 'Hartes Licht, hart gesetzt', body: 'Der Lichtabfall des Blitzes wird kontrolliert, damit das Produkt scharf bleibt, während die Welt dahinter wegfällt.' },
      { title: 'Schatten als Komposition', body: 'Das Schwarz hinter dem Motiv ist nicht leer — es ist gezeichnet und bestimmt, wo das Auge landet.' },
      { title: 'Kontrast ohne Verluste', body: 'Wir treiben die Wucht hoch und schützen dabei Produktfarbe und Textur vor dem Ausbrennen.' },
      { title: 'Energie, die sich wiederholt', body: 'Das Chaos ist systematisiert: dein zehntes Flash-Visual trifft wie dein erstes und passt dazu.' },
    ],
    why: [
      { title: 'Stoppt das Scrollen', body: 'Gebaut für Feeds, an denen weiches, gleichmäßiges Licht direkt vorbeigescrollt wird.' },
      { title: 'Eine Kante, die sich wiederholt', body: 'Dieselbe Intensität bei Visual eins und Visual einhundert.' },
      { title: 'Gebaut für Drops', body: 'Getaktete Energie für Launches, Nachbestellungen und Hype-Momente.' },
    ],
    bestFor: ['Streetwear, Sneaker und Accessoires', 'Drops, Launches und Hype-Momente', 'Marken mit einer Kante, die sie behalten wollen', 'Social Ads, die Daumen stoppen müssen'],
    whatYouGet: ['Energiegeladene, blitzbeleuchtete Szenen', 'Tiefe, bewusste Schattenarbeit', 'Konsistente Models, auf deine Marke festgelegt', 'Lieferung in ~24 Std., von Hand geprüft'],
  },
  {
    slug: 'glow',
    name: 'Glow',
    tagline: 'Golden Hour, auf Abruf.',
    heroPhoto: '/img/lifestyle-glow-01.webp',
    cardPhoto: '/img/lifestyle-glow-01.webp',
    beforeAfter: { before: '/img/lifestyle-glow-03.webp', after: '/img/lifestyle-glow-01.webp' },
    cardIcon: 'jar',
    cardDesc: 'Kühne Visuals, inspiriert vom Fashion-Editorial — direkter On-Camera-Blitz, scharfer Kontrast, starke Schatten, moderne Kampagnen-Ästhetik.',
    moodTitle: 'Wie sich Glow anfühlt.',
    moodParagraphs: [
      'Tiefe Sonne, sanftes Leuchten, Haut und Produkt in dasselbe bernsteinfarbene Licht gehüllt. Der Look eines Abends, der gut lief.',
      'Editorial-Marken nutzen dieses Licht, weil es allem schmeichelt, was es berührt. Jetzt ist es eine Einstellung, kein zweiwöchiges Location-Shooting.',
    ],
    steps: [
      { title: 'Jage die Golden Hour', body: 'Warmes, flaches Licht auf jedem einzelnen Bild, ohne Ausnahme.' },
      { title: 'Style die Szene', body: 'Garderobe, Props und Setting so abgestimmt, dass sie aspirationell wirken, nicht gestellt.' },
      { title: 'Grade für Wärme', body: 'Ein konsistenter, editorialer Farbabschluss über den gesamten Satz.' },
    ],
    grid: grid(
      ['/img/lifestyle-glow-01.webp', '/img/lifestyle-glow-02.webp', '/img/lifestyle-glow-03.webp', '/img/lifestyle-glow-04.webp', '/img/lifestyle-glow-05.webp', '/img/lifestyle-glow-06.webp'],
      ['bottle', 'sneaker', 'jar', 'bag', 'bottle', 'sneaker', 'jar', 'bag', 'bottle']
    ),
    craft: [
      { title: 'Eine abgestimmte Wärmekurve', body: 'Unser goldener Ton ist kein Filter — es ist ein kalibriertes Grading, das die Produktfarbe ehrlich hält, während alles ringsum aufwärmt.' },
      { title: 'Leuchten unter Kontrolle', body: 'Die Weichheit der Lichter wird pro Material dosiert: Glas leuchtet, Stoff verschmiert nicht, Metall behält seine Kante.' },
      { title: 'Szenen, gebaut für die Dämmerung', body: 'Sets, Oberflächen und Props sind so gewählt, dass sie schwaches Licht plausibel machen — Balkone, Leinen, späte Interieurs.' },
      { title: 'Harmonie von Model und Licht', body: 'Wenn ein Model das Produkt trägt, werden Hautton und Produktton im selben Grading ausbalanciert, nie im Widerstreit.' },
    ],
    why: [
      { title: 'Verkauft ein Gefühl, nicht nur ein Produkt', body: 'Die Atmosphäre, auf die Beauty- und Fashion-Käufer wirklich reagieren.' },
      { title: 'Kampagnenqualität, bei jeder Bestellung', body: 'Keine separate \'Hero-Shot\'-Stufe — dieser Abschluss ist der Standard.' },
      { title: 'Ein konsistentes Leuchten', body: 'Dieselbe Wärme über deinen gesamten Feed, Launch für Launch.' },
    ],
    bestFor: ['Beauty, Skincare und Duft', 'Fashion, die ein Gefühl verkauft', 'Kampagnen und Launches, die Atmosphäre brauchen', 'Marken, die einen aspirationellen Feed aufbauen'],
    whatYouGet: ['Warme, editoriale Golden-Hour-Szenen', 'Konsistente Models, auf deine Marke festgelegt', 'Kampagnenqualität-Abschluss auf jedem Bild', 'Lieferung in ~24 Std., von Hand geprüft'],
  },
  {
    slug: 'phone-made',
    name: 'Phone-made',
    tagline: 'Sieht mühelos aus. Ist es nicht.',
    heroPhoto: '/img/lifestyle-phone-made-01.webp',
    cardPhoto: '/img/lifestyle-phone-made-11.webp',
    beforeAfter: { before: '/img/lifestyle-phone-made-05.webp', after: '/img/lifestyle-phone-made-01.webp' },
    cardIcon: 'bottle',
    cardDesc: 'Minimalistische Visuals, die authentischer, alltäglicher Fotografie ähneln — natürlich, mühelos, wie beiläufige Smartphone-Fotografie.',
    moodTitle: 'Wie sich Phone-made anfühlt.',
    moodParagraphs: [
      'Tageslicht durch ein Fenster, ein Produkt auf einer Küchentheke, ein leicht unvollkommener Bildausschnitt. Es liest sich echt.',
      'Es ist der Stil, der Feeds dazu bringt, dir zu vertrauen. Kein Studioglanz, kein harter Verkauf. Einfach dein Produkt, das ein glaubwürdiges Leben führt.',
    ],
    steps: [
      { title: 'Setze das Licht', body: 'Ein Fenster oder eine Lampe, nichts gestellt — Licht, wie es zu Hause tatsächlich fällt.' },
      { title: 'Halt es aus der Hand', body: 'Natürliche Winkel und ein Hauch von Unvollkommenheit, ohne Stativsteifheit.' },
      { title: 'Schneide für den Feed', body: 'Gerahmt für die Plattform, auf der es landet, von der allerersten Version an.' },
    ],
    grid: grid(
      ['/img/lifestyle-phone-made-02.webp', '/img/lifestyle-phone-made-03.webp', '/img/lifestyle-phone-made-04.webp', '/img/lifestyle-phone-made-05.webp', '/img/lifestyle-phone-made-06.webp', '/img/lifestyle-phone-made-07.webp', '/img/lifestyle-phone-made-08.webp', '/img/lifestyle-phone-made-09.webp', '/img/lifestyle-phone-made-10.webp'],
      ['bottle', 'sneaker', 'jar', 'bag', 'bottle', 'sneaker', 'jar', 'bag', 'bottle']
    ),
    craft: [
      { title: 'Konstruierte Unvollkommenheit', body: 'Leichte Neigung, natürlicher Lichtabfall, ehrliche Schatten — jeder \'Zufall\' ist bewusst gesetzt, damit es gefunden statt gestellt wirkt.' },
      { title: 'Tageslicht-Logik', body: 'Jede Szene gehorcht einer Lichtquelle und einer Tageszeit. Das trennt glaubwürdig von unheimlich.' },
      { title: 'Ausstattung, die flüstert', body: 'Props sind so gewählt, dass sie nichts datieren und von nichts ablenken. Das Produkt bleibt das Lauteste im Bild.' },
      { title: 'Feed-first-Bildausschnitt', body: 'Vorab für 4:5 und 9:16 komponiert, damit nichts Wichtiges im Zuschnitt stirbt.' },
    ],
    why: [
      { title: 'Liest sich echt', body: 'Kein Studio-Verräter — gebaut, um neben UGC zu stehen, ohne je aufzufallen.' },
      { title: 'Vertrauen vor Politur', body: 'Der Look, der performt, wenn Zielgruppen allem zu Gestylten misstrauen.' },
      { title: 'Feed-native ab dem ersten Bild', body: 'Kein separater Zuschnitt-Durchgang nötig — es ist fertig, wie geliefert.' },
    ],
    bestFor: ['Social-first-Marken und UGC-artige Ads', 'Produkte, die über Nahbarkeit verkaufen', 'Gründer, die Vertrauen vor Politur aufbauen', 'Organischer Content, der nicht wie Werbung aussehen soll'],
    whatYouGet: ['Authentische, handy-echte Lifestyle-Szenen', 'Natürliche Beleuchtung mit einer Lichtquelle', 'Feed-fertige Zuschnitte ab Tag eins', 'Lieferung in ~24 Std., von Hand geprüft'],
  },
  {
    slug: 'custom',
    name: 'Custom',
    tagline: 'Deine eigene Welt, gebaut rund um dein Produkt.',
    priceTrust: 'Auf Anfrage',
    priceUnit: '',
    heroPhoto: '/img/banners-13.webp',
    cardPhoto: '/img/banners-13.webp',
    cardIcon: 'bag',
    cardDesc: 'Keine unserer vier Stimmungen — eine maßgeschneiderte Lifestyle-Szene, gestaltet aus deinen Referenzen.',
    orderHref: '/de/order-custom',
    orderLabel: 'Eine Szene nach Maß starten',
    moodParagraphs: [
      'Keine unserer vier Stimmungen — eine Szene, gestaltet aus deinen Referenzen: das Setting, Styling und Licht, die nur deine Marke nutzen würde.',
      'Wir bauen die Welt einmal, gemeinsam mit dir, und halten danach jedes zukünftige Visual ihr treu.',
    ],
    steps: [
      { title: 'Brief', body: 'Teile Referenzen und die Welt, in der dein Produkt leben soll.' },
      { title: 'Design', body: 'Wir formen eine maßgeschneiderte Szene und Styling-Richtung, mit dir geprüft.' },
      { title: 'Produzieren', body: 'Deine individuellen Lifestyle-Visuals, konsistent von Bestellung zu Bestellung.' },
    ],
    grid: grid(
      ['/img/banners-14.webp'],
      ['bottle', 'sneaker', 'jar', 'bag', 'bottle', 'sneaker', 'jar', 'bag', 'bottle']
    ),
    bestFor: [
      'Marken mit einer bestimmten Welt vor Augen',
      'Konzepte, die unsere vier Stimmungen nicht abdecken',
      'Kampagnen, die ihre eigene Signatur brauchen',
      'Sortimente, bei denen die Szene die Geschichte ist',
    ],
    whatYouGet: [
      'Ein maßgeschneidertes Lifestyle-Konzept, mit dir gestaltet',
      'Szene, Styling und Licht auf deine Marke abgestimmt',
      'Konsistent bei jeder zukünftigen Bestellung',
      'Ein klarer Preis, vereinbart bevor wir beginnen',
    ],
  },
];

export function getStyle(slug) {
  return styles.find((s) => s.slug === slug);
}
