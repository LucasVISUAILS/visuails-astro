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
      /* ── STILL — 21 september 2026 ──────────────────────────────────────
         Lucas: *"een nieuwe catalog style (…) waar het model bijna levenloos
         stil staat, wat je vaak ziet bij grote luxe merken."*

         De naam beschrijft het BEELD en niet de koper. "Luxury" stond er eerst
         in het voorstel en is afgevallen om twee redenen: het is een belofte
         die het product van de klant waarmaakt en niet jouw licht, en twee
         stijlen naast elkaar waarvan er één "luxe" heet, zeggen samen dat de
         andere dat niet is. Elke stijlnaam op deze site beschrijft het beeld;
         deze ook.

         `Still` is in beide talen hetzelfde woord, en het is precies de
         variabele: het model staat stil. Dat het in de fotografie ook
         stilleven betekent, is geen toeval maar de hele gedachte — een mens
         die met de rust van een stilleven behandeld wordt. De luxe-associatie
         staat in de regel eronder, als waarneming en niet als claim.

         ── EN HIJ IS DE ENIGE HIER — 22 september 2026 ──────────────────────
         Onder deze regel stonden Ghost, Kleurvlak en Podium: drie namen die op
         4 september bij het bouwen van dit blok zijn BEDACHT om de categorie
         niet leeg te laten voelen. Lucas: *"kleurvlak, ghost en podium mogen
         als komende stylen weg omdat ik deze niet zelf heb bedacht en
         kleurvlak bijvoorbeeld sowieso al bij elke order zit omdat de klant de
         achtergrondkleur naar elke kleur kan veranderen."*

         Allebei de redenen zijn juist, en de tweede is de scherpste: Kleurvlak
         was geen komende stijl maar een bestaande functie met een naam erop.
         Zo'n regel belooft iets nieuws voor iets wat je al krijgt, en dat is
         erger dan een lege lijst.

         Regel 3 boven aan dit bestand zei het al — *"alleen wat er écht komt.
         Een naam hier is een voornemen van de studio"* — en die regel gold ook
         voor de namen die ik er zelf in had gezet. Wat overblijft is één stijl
         waarvan de studio weet dat hij komt. Dat is precies genoeg. */
      { naam: 'Still', regel: 'Het model staat stil en doet niets — geen pose, geen beweging. De houding die grote merken al jaren gebruiken.' },
    ],
    en: [
      { naam: 'Still', regel: 'The model stands still and does nothing — no pose, no motion. The stance the large houses have used for years.' },
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
