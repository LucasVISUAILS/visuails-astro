// VISUAILS — de stijlen die er nog niet zijn, maar wel komen.
//
// ─────────────────────────────────────────────────────────────────────────────
// WAAROM DIT BESTAAT
//
// Lucas, 4 september 2026: *"Bij lifestyle heb ik nu meerdere stylen voor
// verschillende doelgroepen. Bedenk voor alle andere categorieën placeholder
// ideeën die ik later zelf kan toevoegen, anders voelen die categorieën zo
// leeg. Wellicht (…) onderaan de stylen een tekst zetten dat er nieuwe stylen
// in de maak zijn en er binnenkort aan komen."*
//
// Catalog heeft één look (Classic), video drie. Naast lifestyle's vier voelt
// dat als een categorie die nog moet beginnen — terwijl het werk gewoon nog
// niet af is. Deze lijst zegt dat met zoveel woorden, op de plek waar de
// bezoeker het zich afvraagt: onder de looks die er wél zijn.
//
// ── DRIE REGELS VOOR WAT HIER MAG STAAN ────────────────────────────────────
//
// 1. GEEN DATUM. "Binnenkort" is eerlijk; "volgende maand" is een belofte die
//    een agenda nodig heeft. Zolang hier geen datum staat, kan deze lijst
//    niemand teleurstellen.
// 2. GEEN PRIJS EN GEEN KNOP. Een stijl die je niet kunt bestellen krijgt geen
//    bestelknop — dat is het verschil tussen dit blok en de looks erboven, en
//    het is de reden dat het blok geen tegels maar regels zijn.
// 3. ALLEEN WAT ER ÉCHT KOMT. Een naam hier is een voornemen van de studio.
//    Verdwijnt het voornemen, dan verdwijnt de regel — anders staat de site
//    over een half jaar vol met looks die nooit gemaakt zijn.
//
// Een stijl die af is, verhuist van hier naar catalogStyles.js / styles.js /
// videoStyles.js en verdwijnt hier. Dat is de hele levenscyclus.
//
// ── DE INHOUD IS EEN VOORSTEL ──────────────────────────────────────────────
//
// De namen hieronder zijn bedacht bij het bouwen van dit blok en Lucas mag ze
// veranderen, schrappen of aanvullen; dit bestand is expres één lijst met korte
// regels zodat dat één regel typen is. Wat je verandert, verandert op beide
// talen apart — een naam als "Ghost" blijft in het Engels hetzelfde, een regel
// eronder niet.

/**
 * Per dienst, per taal: de looks die in de maak zijn.
 * `naam` is kort en staat vet; `regel` is één zin over voor wie hij is.
 */
export const KOMEND = {
  catalog: {
    nl: [
      { naam: 'Ghost', regel: 'De gedragen vorm zonder model — voor- en achterkant, zoals fashion-webshops het tonen.' },
      { naam: 'Kleurvlak', regel: 'Je merkkleur als achtergrond in plaats van wit, voor een productpagina die niet klinisch voelt.' },
      { naam: 'Podium', regel: 'Het product op steen, beton of linnen — voor sieraden, skincare en alles wat premium moet lezen.' },
    ],
    en: [
      { naam: 'Ghost', regel: 'The worn shape without a model — front and back, the way fashion shops show it.' },
      { naam: 'Colour field', regel: 'Your brand colour as the ground instead of white, for a product page that does not read clinical.' },
      { naam: 'Plinth', regel: 'The product on stone, concrete or linen — for jewellery, skincare and anything that has to read premium.' },
    ],
  },
  lifestyle: {
    nl: [
      { naam: 'Studio', regel: 'Eén kleur, één licht, één model — de scène gestript tot alleen het product en de drager.' },
      { naam: 'Nacht', regel: 'Stad na zonsondergang: neon, natte stoep, harde schaduwen. Voor merken die na achten leven.' },
    ],
    en: [
      { naam: 'Studio', regel: 'One colour, one light, one model — the scene stripped back to the product and the person wearing it.' },
      { naam: 'Night', regel: 'The city after dark: neon, wet pavement, hard shadow. For brands that live after eight.' },
    ],
  },
  video: {
    nl: [
      { naam: 'Draaitafel', regel: 'Eén volle rotatie op wit, naadloos rond — de videoversie van je catalogset.' },
      { naam: 'Kleurwissel', regel: 'Hetzelfde product wisselt van kleur of materiaal in één clip. Voor webshops met veel varianten.' },
      { naam: 'Detail', regel: 'Macro over stiksel, weefsel en sluiting — de tweede clip naast een productfilm.' },
    ],
    en: [
      { naam: 'Turntable', regel: 'One full rotation on white, looping seamlessly — the video version of your catalog set.' },
      { naam: 'Colour swap', regel: 'The same product changes colour or material inside one clip. For shops with many variants.' },
      { naam: 'Detail', regel: 'Macro across stitching, weave and fastening — the second clip beside a product film.' },
    ],
  },

  /* ── HOOKS — 12 september 2026 ────────────────────────────────────────────
     Lucas: *"Ik heb niet alleen de Instagram dubbele overlopende posten hook
     bij hooks uiteindelijk, dat is 1 van de stylen die ik wil toevoegen."*

     Dat klopte, en het was op /hooks niet te zien: de hele pagina beschrijft
     dat ene format — de video die doorloopt in het beeld eronder — terwijl er
     wel staat *"wij kiezen het format, uit formats die we eerder gebouwd
     hebben"*. Meervoud in de tekst, enkelvoud op het scherm.

     De doorloper staat daarom NIET in deze lijst: die bestaat en staat als
     eerste kaart op de pagina zelf. Wat hier staat zijn de andere formats,
     onder dezelfde drie regels als de rest van dit bestand — geen datum, geen
     prijs, geen knop, en alleen wat er echt komt. */
  hooks: {
    nl: [
      { naam: 'De lus', regel: 'Het laatste beeld sluit naadloos aan op het eerste, zodat de clip eindeloos doorloopt zonder dat je de naad ziet.' },
      { naam: 'Drieluik', regel: 'Drie posts naast elkaar die in je grid één beeld vormen — de hook zit in het openen van je profiel.' },
      { naam: 'De onthulling', regel: 'De eerste seconden tonen alles behalve het product; het komt pas in beeld als de duim al gestopt is.' },
      { naam: 'Stapel', regel: 'Meerdere producten wisselen elkaar af in hetzelfde kader, op dezelfde plek. Voor een drop van een serie.' },
    ],
    en: [
      { naam: 'The loop', regel: 'The last frame joins the first seamlessly, so the clip runs forever without the seam showing.' },
      { naam: 'Triptych', regel: 'Three posts side by side that form one image in your grid — the hook is opening your profile.' },
      { naam: 'The reveal', regel: 'The first seconds show everything but the product; it arrives once the thumb has already stopped.' },
      { naam: 'Stack', regel: 'Several products swap places inside one frame, in the same spot. For dropping a series.' },
    ],
  },
};

/** De looks die in de maak zijn voor één dienst, of een lege lijst. */
export function komendeStijlen(dienst, lang = 'nl') {
  const per = KOMEND[dienst];
  if (!per) return [];
  return per[lang === 'nl' ? 'nl' : 'en'] || [];
}
