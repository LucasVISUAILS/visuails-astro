// VISUAILS — het WhatsApp-nummer en de openingszinnen, op één plek.
// Augustus 2026.
//
// WAAROM DIT BESTAAT. Lucas, na het aanklikken van de zwevende knop op de
// homepage: *"Als ik de whatsapp knop op de homepage kies staat er nog drop.
// Dit zit natuurlijk niet meer in de pricing. Controleer al die links even en
// pas aan waar nodig."*
//
// Hij had gelijk, en het probleem was niet die ene zin. Er stonden 54
// WhatsApp-links in de broncode en de tekst van elke link stond er
// URL-GECODEERD in:
//
//     ?text=Hi%20VISUAILS%2C%20I%27d%20like%20to%20talk%20about%20a%20drop.
//
// Dat is precies waarom "drop" overleefde terwijl het woord overal anders al
// was geschrapt. Je kunt er niet op zoeken. Wie `grep drop` draaide zag deze
// regel niet, en wie de zinnen wilde nalezen moest 54 keer een decoder
// openen. De codering was geen beveiliging maar een blinde vlek.
//
// Dus staat de tekst nu in gewoon Nederlands en Engels in de broncode, en doet
// waHref() de codering op het moment dat de link wordt gebouwd. Een volgende
// controle is één grep, geen middag werk.
//
// EN HET NUMMER STOND ER 65 KEER. Als Lucas ooit een tweede lijn neemt of het
// bedrijfsnummer verhuist, is dat nu één regel in plaats van vijfenzestig
// zoek-en-vervang-acties waarvan er één wordt vergeten. Dezelfde redenering
// als bij src/data/brand.js: *"anders staat de oude er over drie maanden nog
// ergens."*
//
// WAT HIER NIET STAAT: de meeste openingszinnen zelf. Die horen bij de pagina
// waar de knop staat — de zin op /video gaat over video, de zin op /pricing
// over prijzen — en een centrale lijst van zeventig zinnen die je moet
// terugzoeken per sleutel is slechter leesbaar dan een zin die naast zijn eigen
// knop staat. Alleen de zinnen die op ELKE pagina verschijnen (de zwevende
// knop, het mobiele menu) staan hieronder, want die hebben geen eigen pagina.

/** Het zakelijke WhatsApp-nummer, in het formaat dat wa.me verlangt: land- en
 *  netnummer aan elkaar, zonder plus, spaties of streepjes. */
export const WHATSAPP_NUMBER = '31625436130';

/** Hetzelfde nummer zoals een mens het leest. Voor de voettekst, de
 *  privacyverklaring en de voorwaarden, waar het nummer wordt getóónd en niet
 *  alleen aangeklikt. */
export const WHATSAPP_DISPLAY = '+31 6 25436130';

/**
 * Bouw een wa.me-link.
 *
 * @param {string} [text] De openingszin in gewone taal. Wordt hier gecodeerd,
 *   dus geef hem ONGECODEERD mee — een `%20` die je zelf typt wordt een
 *   letterlijke "%20" in het bericht van de klant.
 * @returns {string}
 *
 * Zonder tekst krijg je het kale nummer. Dat is de juiste vorm voor een
 * telefoonnummer in de voettekst of in een juridische tekst: daar staat het
 * nummer er als contactgegeven, en een voorgevulde zin die de bezoeker niet
 * heeft bedacht hoort daar niet.
 *
 * encodeURIComponent, niet encodeURI: het resultaat is een QUERY-WAARDE, en
 * encodeURI laat &, # en + met rust. Een stijl die "Black & White" heet zou
 * met encodeURI het bericht afkappen bij de ampersand. Dat was geen theorie —
 * /lifestyle/[slug] plakte style.name ongecodeerd in de URL.
 */
export function waHref(text) {
  const base = `https://wa.me/${WHATSAPP_NUMBER}`;
  if (!text) return base;
  // De apostrof erbij. encodeURIComponent laat ' met rust — het is een
  // toegestaan teken in een query — maar bijna elke zin hier bevat er een
  // ("I'd like", "foto’s"), en een rauwe apostrof in een href betekent dat het
  // adres niet meer in enkele aanhalingstekens past. Dat is nu nergens een
  // probleem en over een jaar in één sjabloon wel. De vorige, handgecodeerde
  // links schreven allemaal %27; dit houdt de uitvoer daaraan gelijk.
  return `${base}?text=${encodeURIComponent(text).replace(/'/g, '%27')}`;
}

/**
 * De twee openingszinnen van de chrome — de zwevende knop rechtsonder en de
 * WhatsApp-knop in het mobiele menu. Deze staan op alle 86 pagina's, dus ze
 * kunnen niet weten waar de bezoeker vandaan komt.
 *
 * @type {Record<'en'|'nl', { chat: string, order: string }>}
 */
export const WA_CHROME = {
  en: {
    // De zwevende knop. Deze zei "I'd like to talk about a drop." — het woord
    // dat de prijsherziening heeft geschrapt omdat het een collectie betekent
    // die live gaat, wat de KLANT doet, niet wat wij verkopen. Erger nog: het
    // opende het gesprek in een woordenschat waar de prijslijst geen antwoord
    // op heeft. De vervanger noemt geen product, want de knop weet niet welke
    // pagina eronder ligt.
    chat: 'Hi VISUAILS, I have a question about your visuals.',
    // De knop in het mobiele menu staat direct onder "Start". Wie daar klikt
    // is niet aan het oriënteren maar aan het bestellen, dus die zin mag
    // concreter zijn.
    order: "Hi VISUAILS, I'd like to have visuals made for my products.",
  },
  nl: {
    // Allebei stonden ze in het Engels op alle 42 Nederlandse pagina's — een
    // Nederlandse bezoeker kreeg zijn eigen chat in een taal die hij niet had
    // gekozen. Elke andere WhatsApp-link op de site was al per taal; deze twee
    // zaten in Layout.astro en waren simpelweg overgeslagen.
    chat: 'Hoi VISUAILS, ik heb een vraag over jullie beelden.',
    order: 'Hoi VISUAILS, ik wil graag beelden laten maken voor mijn producten.',
  },
};
