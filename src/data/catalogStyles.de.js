// VISUAILS — catalog style data (German / DE). Localized copy of
// src/data/catalogStyles.js — same shape and exports, only the
// human-readable strings are translated. Order paths are prefixed with /de.

function grid(photos, icons) {
  const widths = { bottle: '42%', sneaker: '54%', jar: '46%', bag: '46%' };
  return icons.map((icon, i) => ({ photo: photos[i] ?? null, icon, width: widths[icon] }));
}

export const catalogStyles = [
  {
    slug: 'classic',
    name: 'Classic',
    tagline: 'Sauber. Konsistent. Kompromisslos.',
    priceTrust: '€39,99',
    priceUnit: ' / Produkt',
    metaPrice: '€39,99 / Produkt — 4 Fotos',
    orderHref: '/de/order-catalog',
    heroIcon: 'bottle',
    heroWidth: '26%',
    cardIcon: 'bottle',
    cardWidth: '42%',
    cardPrice: '€39,99 / Produkt',
    cardDesc: 'Ein kompletter Satz pro Produkt — Vorderseite, Rückseite, Detail und eine On-Model-Aufnahme. €39,99, etwa €10 pro Foto.',
    moodTitle: 'Wie sich Classic anfühlt.',
    moodParagraphs: [
      'Pures, gleichmäßiges Licht und ein Bildausschnitt, der sich nie bewegt — jedes Produkt fotografiert wie im selben Studio, am selben Morgen.',
    ],
    steps: [
      { title: 'Bildausschnitt', body: 'Derselbe Winkel und Zuschnitt, pro Produkttyp festgelegt.' },
      { title: 'Licht', body: 'Ein weiches, gleichmäßiges Studio-Setup, exakt wiederholt.' },
      { title: 'Abgleich', body: 'Jedes neue Produkt am vorherigen ausgerichtet.' },
    ],
    grid: grid(
      [],
      ['bottle', 'sneaker', 'jar', 'bag', 'bottle', 'sneaker', 'jar', 'bag', 'bottle']
    ),
    craft: [
      { title: 'Ein festgelegtes Lichtrezept', body: 'Ein Softbox-Setup, festgeschrieben — keine Entscheidung, die von Aufnahme zu Aufnahme neu getroffen wird.' },
      { title: 'Ein Winkelsystem, kein einzelner Winkel', body: 'Feste Kamerageometrie, damit neue Produkte bündig neben alten stehen.' },
      { title: 'Farbe treu zum Produkt', body: 'Weiß bleibt weiß, deine Markenfarbe bleibt echt.' },
      { title: 'Zuschnitte für jeden Kanal', body: 'Ein Satz Zuschnitte funktioniert für Shop, Amazon, Bol und Ads.' },
    ],
    why: [
      { title: 'Marktplatz-sicher', body: 'Erfüllt die strengen Bildregeln von Amazon, Bol, Zalando und mehr.' },
      { title: 'Bereit zum Nachbestellen', body: 'Neue Produkte fügen sich ohne sichtbare Naht in den Satz ein.' },
      { title: 'Keine Art-Direction nötig', body: 'Schick ein Foto, erhalte denselben durchdachten Bildausschnitt zurück.' },
    ],
    bestFor: [
      'Webshops, die von einem sauberen Raster leben',
      'Marktplatz-Verkäufer mit strengen Bildregeln',
      'Marken, die ein ganzes Sortiment auf einmal fotografieren',
      'Nachbestellungen — neue Produkte, die perfekt zu alten Sätzen passen',
    ],
    whatYouGet: [
      'Vier Fotos pro Produkt: Vorderseite, Rückseite, Detail & On-Model',
      'Konsistente Beleuchtung, Winkel und Hintergrund',
      'Hochauflösende, marktplatzfertige Dateien',
      'Lieferung in ~24 Stunden, von Hand geprüft',
    ],
  },
  {
    slug: 'custom',
    name: 'Eigene Marke',
    tagline: 'Ein Katalog-Look, der unverkennbar deiner ist.',
    priceTrust: 'Einmal gestaltet — dann €39,99 / Produkt',
    priceUnit: '',
    metaPrice: 'Einmal gestaltet — dann €39,99 / Produkt',
    orderHref: '/de/order-custom',
    heroIcon: 'bag',
    heroWidth: '26%',
    cardIcon: 'bag',
    cardWidth: '46%',
    cardPrice: 'Individueller Preis',
    cardDesc: 'Ein Katalog-Look, gestaltet rund um deine Marke — danach schnell, für €39,99 pro Produktsatz mit 4 Fotos.',
    moodTitle: 'Wie sich Eigene Marke anfühlt.',
    moodParagraphs: [
      'Ein unverwechselbarer Hintergrund, Schatten und eine Prop-Sprache, die sagen: das sind wir — noch bevor das Logo es tut.',
    ],
    steps: [
      { title: 'Definieren', body: 'Deine Palette, Props und Bildausschnitt, als ein dokumentierter Stil festgelegt.' },
      { title: 'Beweisen', body: 'Erste Produkte in diesem Stil fotografiert, mit dir geprüft.' },
      { title: 'Wiederholen', body: 'Jedes neue Produkt folgt automatisch denselben Regeln.' },
    ],
    grid: grid(
      [],
      ['bottle', 'sneaker', 'jar', 'bag', 'bottle', 'sneaker', 'jar', 'bag', 'bottle']
    ),
    craft: [
      { title: 'Eine Design-Session, kein Template', body: 'Deine Marke, Referenzen und zu vermeidende Konkurrenten — eine Runde, dann festgelegt.' },
      { title: 'Ein schriftliches Stilsystem', body: 'Regeln für Hintergrund, Schatten und Props, dokumentiert, damit Produkt 100 zu Produkt 1 passt.' },
      { title: 'Besitz, keine Miete', body: 'Der Stil, den wir bauen, gehört dir — wir verkaufen ihn nicht weiter.' },
      { title: 'Danach für immer schnell', body: 'Neue Produkte laufen zu normaler Katalog-Geschwindigkeit und -Preis durch.' },
    ],
    why: [
      { title: 'Unverkennbar deiner', body: 'Props, Farbe und Bildausschnitt, die Konkurrenten nicht kopieren können.' },
      { title: 'Dokumentiert, nicht erinnert', body: 'Aufgeschrieben, damit es zwischen Bestellungen nie abweicht.' },
      { title: 'Schnell nach der ersten Bestellung', body: 'Das Design passiert einmal; jede Bestellung danach läuft in normalem Tempo.' },
    ],
    bestFor: [
      'Marken, deren Shop Schaufenster und Bühne zugleich ist',
      'Gründer, die es leid sind, wie jeder andere Verkäufer auszusehen',
      'Sortimente, bei denen Wiedererkennung wichtiger ist als Neutralität',
      'Teams, die Jahre an Produkt-Drops planen',
    ],
    whatYouGet: [
      'Ein individueller Katalogstil, mit dir gestaltet',
      'Dokumentierte Regeln für perfekte Wiederholbarkeit',
      'Exklusivität — dein Look bleibt deiner',
      'Normaler Preis pro Produkt nach der ersten Bestellung',
    ],
  },
];

export function getCatalogStyle(slug) {
  return catalogStyles.find((s) => s.slug === slug);
}
