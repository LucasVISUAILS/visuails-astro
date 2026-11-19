/*
 * VISUAILS — de brief van een aanvraag, in gewone woorden.
 *
 * ── levering 119 (18 november 2026, proefronde W2-12) ──────────────────────────────────────────────────────────
 * Fatima vroeg een eigen look aan en kreeg alleen "Dienst: Aanvraag op maat" terug. De melding aan Lucas toonde de
 * codes van het formulier: look_concept "us", look_service "both", look_products "10-19", look_when "month".
 *
 * Hier staan de velden van het aanvraagformulier (src/components/order/HoldingPage.astro) met de woorden van dat
 * formulier, twee keer:
 *   · KLANT  — wat de klant invulde, in zijn taal, voor het blok "Wat je ons vroeg" in de bevestiging;
 *   · STUDIO — dezelfde velden voor de melding aan Lucas, in de woorden van /admin (aanvraagBlok in admin.js).
 * Komt er een veld bij in het formulier, zet het dan ook hier. De bestelpagina (/o/, briefRegels in portal.js) heeft
 * een eigen kopie van KLANT; die kan deze module lezen.
 *
 * Geen DOM; de Worker en de toetsen laden dit.
 *
 * levering 119 (18 november 2026, proefronde W2-12, besluit Lucas o04 van 8 oktober, hersteller H10): de mail aan de klant
 * gaat van orders@ naar elk adres dat iemand invult. Geeft hij vrije tekst en links terug, dan kan iedereen via ons spam
 * versturen. Dus noemt KLANT alleen nog vaste keuzes (uit een lijst van het formulier, of een aantal); de wereld, de
 * referenties, "nooit", "waarvoor" en het bericht staan alleen in de melding aan Lucas (STUDIO / AANVRAAG_LABELS).
 */

const KLANT = {
  nl: {
    look_concept: ['Wie bedenkt het concept?', { own: 'Ik heb het concept — jullie werken het uit', us: 'Bedenk het voor ons' }],
    look_service: ['Waar moet de look te gebruiken zijn?', { lifestyle: 'Lifestylescènes', catalog: 'Catalogsets', both: 'Allebei' }],
    look_world: ['De wereld', null],
    look_references: ['Referenties', null],
    look_avoid: ['Zo mag het er nooit uitzien', null],
    look_products: ['Ongeveer hoeveel producten', { '1-4': '1 tot 4', '5-9': '5 tot 9', '10-19': '10 tot 19', '20+': '20 of meer', unsure: 'Weet ik nog niet' }],
    look_when: ['Eerste set nodig', { asap: 'Zo snel als hij klaar is', month: 'Binnen een maand', quarter: 'Dit kwartaal', open: 'Nog geen datum' }],
    style: ['Soort video', null],
    clips: ['Hoeveel clips', null],
    voor: ['Waarvoor', null],
    message: ['Je bericht', null],
  },
  en: {
    look_concept: ['Who comes up with the concept?', { own: 'I have the concept — you work it out', us: 'Think it up for us' }],
    look_service: ['Where should the look be usable?', { lifestyle: 'Lifestyle scenes', catalog: 'Catalog sets', both: 'Both' }],
    look_world: ['The world', null],
    look_references: ['References', null],
    look_avoid: ['It should never look like', null],
    look_products: ['Roughly how many products', { '1-4': '1 to 4', '5-9': '5 to 9', '10-19': '10 to 19', '20+': '20 or more', unsure: 'Not sure yet' }],
    look_when: ['First set needed', { asap: 'As soon as it is ready', month: 'Within a month', quarter: 'This quarter', open: 'No date yet' }],
    style: ['Kind of video', null],
    clips: ['How many clips', null],
    voor: ['What for', null],
    message: ['Your message', null],
  },
};

/* De woorden van /admin (aanvraagBlok in src/lib/admin.js): Lucas leest hier wat de klant koos, niet wat hij las. */
const STUDIO = {
  look_concept: ['Concept', { own: 'Klant heeft het concept — wij werken het uit', us: 'Wij bedenken het concept (extra ontwerpwerk)' }],
  look_service: ['Kiesbaar bij', { lifestyle: 'Lifestylescènes', catalog: 'Catalogsets', both: 'Allebei' }],
  look_world: ['De wereld', null],
  look_references: ['Referenties', null],
  look_avoid: ['Nooit', null],
  look_products: ['Aantal producten', { '1-4': '1 tot 4', '5-9': '5 tot 9', '10-19': '10 tot 19', '20+': '20 of meer', unsure: 'Weet de klant nog niet' }],
  look_when: ['Wanneer', { asap: 'Zo snel als hij klaar is', month: 'Binnen een maand', quarter: 'Dit kwartaal', open: 'Nog geen datum' }],
};

const leeg = (v) => v === undefined || v === null || String(v).trim() === '';

/* levering 119 (W2-12, o04): vrije tekst gaat nooit terug naar de klant. Een veld met een lijst telt alleen als de waarde
   in die lijst staat; "Hoeveel clips" alleen als getal of "weet ik nog niet"; de soort video alleen als bekende stijl. */
const VRIJ = new Set(['look_world', 'look_references', 'look_avoid', 'voor', 'message']);
const CLIPS_ONBEKEND = new Set(['Weet ik nog niet', 'Not sure yet']);

/**
 * Wat de klant koos, als [label, waarde]-paren in zijn taal. `stijlNaam` zet een video-slug om in een naam (leeg = onbekend,
 * dan geen regel). Alleen vaste keuzes die echt gevuld zijn; vrije tekst en links nooit (levering 119, o04).
 */
export function aanvraagBriefRegels(details, lang = 'nl', { stijlNaam = (s) => s } = {}) {
  const d = details && typeof details === 'object' ? details : {};
  const tabel = KLANT[lang === 'nl' ? 'nl' : 'en'];
  return Object.entries(tabel).map(([k, [label, opties]]) => {
    if (leeg(d[k]) || VRIJ.has(k)) return null;
    const v = String(d[k]).trim().slice(0, 2000);
    if (k === 'style') {
      if (!/^[a-z0-9-]{1,40}$/.test(v)) return null;
      const naam = stijlNaam(v);
      return naam ? [label, naam] : null;
    }
    if (k === 'clips') return /^\d{1,3}$/.test(v) || CLIPS_ONBEKEND.has(v) ? [label, v] : null;
    if (opties) return Object.prototype.hasOwnProperty.call(opties, v) ? [label, opties[v]] : null;
    return null;
  }).filter(Boolean);
}

/** Het label en de waarde van een formulierveld voor de melding aan Lucas, of null als het geen briefveld is. */
export function aanvraagBriefStudio(k, v) {
  const rij = STUDIO[k];
  if (!rij) return null;
  const [label, opties] = rij;
  const s = String(v ?? '').trim();
  return [label, (opties && opties[s]) || s];
}
