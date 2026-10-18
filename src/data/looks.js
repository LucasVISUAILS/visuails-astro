/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE COMPLETE LOOK — 17 oktober 2026 (levering 60, afvinklijst 38, alles "doen")
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Tot vandaag was een outfit een getal in stap 1 ("Zitten er outfits bij?", 0
 * tot 3), met € 50 per stuk erbovenop. Nergens stond welke stukken samen hoorden;
 * /admin en de werkmap lieten het niet zien, en de FAQ, het formulier en het
 * totaal noemden drie verschillende prijzen voor dezelfde drie stukken.
 *
 * Een look is nu een KOPPELING tussen producten die al in de bestelling zitten:
 * twee of drie stukken, gedragen door één model, op één plek (b-koppeling).
 *
 *   · Elk stuk telt als product mee in de prijstrap en houdt zijn vier beelden.
 *     In de beelden op het model draagt het de hele look; de uitsnede volgt het
 *     stuk.
 *   · Per look € 50, of hij nu twee of drie stukken heeft (v38-prijs a), met
 *     credits 4 per look (v38-credits a).
 *   · Per look twee beelden erbij: van top tot teen van voren, en de stukken
 *     samen zonder model (v38-beelden a).
 *   · Geen apart maximum aantal looks; elk stuk zit in hooguit één look
 *     (v38-max a). Hooguit drie stukken per look (b-regels).
 *   · Alleen bij lifestyle. Catalog en de €1-proef hebben geen looks (b-regels).
 *   · Een set onder één artikelnummer (een trainingspak dat de klant als één
 *     product verkoopt) is gewoon één product: één carrousel, beide stukken aan,
 *     geen toeslag (v38-set a).
 *
 * ── HOE HET IN DE BESTELLING STAAT ──────────────────────────────────────────
 *
 * Het formulier post per product drie soorten velden, en de server (order.js,
 * schoonLooks hieronder) controleert ze opnieuw:
 *
 *   look_p<n>              de letter van de look waar product n in zit (A, B, …)
 *   context_<plek>_p<n>    'ours' (wij kiezen), 'own' (eigen stuk, gratis) of
 *                          'look' (een ander stuk uit dezelfde look vult die plek)
 *   look_notitie_<letter>  "Hoe draag je het?", mag leeg
 *
 * De letter is het enige wat samenhang uitdrukt. Wélk stuk op welke plek staat,
 * volgt uit de soort van elk stuk (garments.js, `occupies`): een broek staat op
 * Broek, een sneaker op Schoenen. Daarom hoeft er geen verwijzing van product
 * naar product in de post, en kan een zelfgebouwde post geen kringen maken.
 *
 * ── WAAROM HIER EN NIET IN pricing.js ──────────────────────────────────────
 *
 * Het bedrag staat in pricing.js (LOOK_PRIJS, LOOK_CREDITS), zoals elk bedrag.
 * Hier staan de REGELS: wat een geldige look is, en hoe je hem uit een bestelling
 * leest. Het formulier, de server, /admin, de werkmap, de agenda, de mail en de
 * factuur lezen allemaal deze ene plek, zodat ze nooit twee keer iets anders
 * zeggen over welke stukken samen horen.
 */
import { garment, contextSlots, CONTEXT_SLOTS } from './garments.js';
import { LOOK_PRIJS, LOOK_CREDITS, euro } from './pricing.js';

export { LOOK_PRIJS, LOOK_CREDITS };

/** De twee lookbeelden per look (v38-beelden a). */
export const LOOK_BEELDEN = 2;
/** Een look heeft twee of drie stukken (b-regels). */
export const LOOK_MIN = 2;
export const LOOK_MAX = 3;
/** Alleen lifestyle kent looks. */
export const LOOK_DIENSTEN = Object.freeze(['lifestyle']);
/** Twintig producten zijn hooguit tien looks van twee. */
export const LOOK_LETTERS = 'ABCDEFGHIJ';
/** De notitie "Hoe draag je het?" — kort genoeg om in de werkmap op één regel te passen. */
export const LOOK_NOTITIE_MAX = 300;
/**
 * In de agenda telt een look als een HALF product: twee van de vier beelden van
 * een product (d-werk). Een look van drie stukken kost dus het werk van 3,5
 * producten, niet van vier.
 */
export const LOOK_PRODUCT_DEEL = 0.5;

/** De waarde van een plek die een ander stuk uit dezelfde look vult. */
export const CONTEXT_LOOK = 'look';

export const isLookDienst = (service) => LOOK_DIENSTEN.includes(String(service || ''));

/**
 * Past een product van deze soort op deze plek in andermans beeld?
 *
 * Een top op Top, een broek op Broek, een schoen op Schoenen — uit `occupies` in
 * garments.js. De laag eronder (de kraag en de zoom onder een hoodie) is een top
 * onder een top: daar past alleen een product van de soort `top`, geen jurk.
 * Een jas, tas of riem vult geen plek in een ander beeld; die kan wel zelf
 * stukken kiezen (zijn eigen plekken staan open).
 */
export function pastOp(plek, garmentId) {
  const g = garment(garmentId);
  if (plek === 'underlayer') return g.id === 'top';
  return (g.occupies || []).includes(plek);
}

/** De plekken van dit soort product waar een stuk uit de bestelling op kan. */
export function lookPlekken(garmentId) {
  return contextSlots(garmentId).map((s) => s.id);
}

/**
 * Klopt deze groep als look? `leden` is [{ n, garment, context: { plek: waarde } }].
 *
 * Geeft { ok: true } of { ok: false, waarom } met een vaste reden, voor de log
 * en de toetsen:
 *   aantal    minder dan twee of meer dan drie stukken
 *   dubbel    twee stukken op dezelfde plek ("twee broeken in één look kan niet");
 *             een top mag er twee keer in als de ene de laag onder de andere is
 *   leeg      een plek staat op 'look' maar geen ander stuk past erop
 */
export function lookKlopt(leden = []) {
  if (leden.length < LOOK_MIN || leden.length > LOOK_MAX) return { ok: false, waarom: 'aantal' };
  const tel = {};
  for (const l of leden) for (const p of garment(l.garment).occupies || []) tel[p] = (tel[p] || 0) + 1;
  const eronder = leden.some((l) => (l.context || {}).underlayer === CONTEXT_LOOK);
  for (const [plek, n] of Object.entries(tel)) {
    const mag = plek === 'top' && eronder ? 2 : 1;
    if (n > mag) return { ok: false, waarom: 'dubbel' };
  }
  for (const l of leden) {
    for (const [plek, waarde] of Object.entries(l.context || {})) {
      if (waarde !== CONTEXT_LOOK) continue;
      if (!leden.some((o) => o.n !== l.n && pastOp(plek, o.garment))) return { ok: false, waarom: 'leeg' };
    }
  }
  return { ok: true };
}

/**
 * De looks van een bestelling, zoals ze in details staan (na schoonLooks).
 *
 * `aantal` is het aantal producten. Geeft [{ letter, producten: [n, …], notitie }]
 * op volgorde van letter, of [] bij een bestelling zonder looks. Leest alleen; de
 * controle zit in schoonLooks. Wordt gebruikt door /admin, de werkmap, de agenda,
 * de mail, de factuur en het opnieuw bestellen.
 */
export function looksVan(details = {}, aantal = 0) {
  const d = details || {};
  const n = Math.max(0, Math.floor(Number(aantal) || 0));
  const per = {};
  for (let i = 1; i <= n; i++) {
    const letter = String(d[`look_p${i}`] || '').trim().toUpperCase();
    if (!letter || !LOOK_LETTERS.includes(letter) || letter.length !== 1) continue;
    (per[letter] = per[letter] || []).push(i);
  }
  /* Een look van één stuk is geen look (bijvoorbeeld als het aantal kleiner is dan
     de bestelling waar de letters uit komen, bij opnieuw bestellen). */
  return Object.keys(per).sort().filter((letter) => per[letter].length >= LOOK_MIN).map((letter) => ({
    letter,
    producten: per[letter],
    notitie: String(d[`look_notitie_${letter}`] || '').trim(),
  }));
}

/** Hoeveel looks er in deze bestelling zitten. */
export function lookAantal(details = {}, aantal = 0) {
  return looksVan(details, aantal).length;
}

/**
 * De bestelling schoonmaken: alleen geldige looks blijven staan, met letters op
 * volgorde (A voor de look met het eerste product). Muteert `details` en geeft de
 * looks terug zoals looksVan ze daarna leest, plus wat er is weggelaten.
 *
 * `typeVan(n)` geeft de soort van product n (garment_p<n>, anders die van de
 * bestelling). Dezelfde afweging als bij de contextstukken in order.js: wat niet
 * klopt wordt STIL weggelaten (met een reden voor de log) en de bestelling wordt
 * niet geweigerd. Het formulier stuurt nooit een look die hier niet door komt;
 * wat hier sneuvelt, komt uit een verouderd of zelfgebouwd formulier.
 *
 * Een plek op 'look' van een product dat (daarna) in geen look zit, wordt
 * 'ours': dan kiezen wij, zoals bij elke plek zonder antwoord.
 */
export function schoonLooks(details, { service, aantal, typeVan } = {}) {
  const d = details || {};
  const n = Math.max(0, Math.floor(Number(aantal) || 0));
  const weg = [];
  const soort = (i) => String((typeof typeVan === 'function' ? typeVan(i) : '') || 'other');
  const plekkenVan = (i) => contextSlots(soort(i)).map((s) => s.id);

  /* Geen lookdienst: alles over looks eruit. */
  if (!isLookDienst(service)) {
    let had = false;
    for (const k of Object.keys(d)) {
      if (/^look_(?:p\d+|notitie_[A-Z])$/.test(k)) { delete d[k]; had = true; }
      if (/^context_[a-z]+_p\d+$/.test(k) && d[k] === CONTEXT_LOOK) { d[k] = 'ours'; had = true; }
    }
    if (had) weg.push({ waarom: 'dienst' });
    return { looks: [], weg };
  }

  /* De groepen zoals gepost. */
  const groepen = {};
  for (let i = 1; i <= n; i++) {
    const ruw = String(d[`look_p${i}`] || '').trim().toUpperCase();
    if (!ruw) { delete d[`look_p${i}`]; continue; }
    if (ruw.length !== 1 || !LOOK_LETTERS.includes(ruw)) { delete d[`look_p${i}`]; weg.push({ waarom: 'letter', product: i }); continue; }
    (groepen[ruw] = groepen[ruw] || []).push(i);
  }
  /* Sleutels boven het aantal: weg, net als garment_p<n> in order.js. */
  for (const k of Object.keys(d)) {
    const m = /^look_p(\d+)$/.exec(k);
    if (m && Number(m[1]) > n) delete d[k];
  }

  const goed = [];
  for (const [letter, producten] of Object.entries(groepen)) {
    const leden = producten.map((i) => ({
      n: i,
      garment: soort(i),
      context: Object.fromEntries(plekkenVan(i).map((p) => [p, String(d[`context_${p}_p${i}`] || '')])),
    }));
    const oordeel = lookKlopt(leden);
    if (!oordeel.ok) {
      weg.push({ waarom: oordeel.waarom, look: letter, producten });
      for (const i of producten) delete d[`look_p${i}`];
      continue;
    }
    goed.push({ oud: letter, producten });
  }

  /* Nieuwe letters, op volgorde van het eerste product. */
  goed.sort((a, b) => a.producten[0] - b.producten[0]);
  const notities = {};
  goed.forEach((g, idx) => {
    const letter = LOOK_LETTERS[idx];
    const notitie = String(d[`look_notitie_${g.oud}`] || '').replace(/\s+/g, ' ').trim().slice(0, LOOK_NOTITIE_MAX);
    if (notitie) notities[letter] = notitie;
    for (const i of g.producten) d[`look_p${i}`] = letter;
  });
  for (const k of Object.keys(d)) if (/^look_notitie_/.test(k)) delete d[k];
  Object.assign(d, Object.fromEntries(Object.entries(notities).map(([l, t]) => [`look_notitie_${l}`, t])));

  /* Een plek op 'look' buiten een look, of waar in de look niets op past: 'ours'. */
  for (let i = 1; i <= n; i++) {
    const letter = d[`look_p${i}`];
    const leden = letter ? goed.find((g) => g.producten.includes(i)).producten : [];
    for (const p of Object.keys(CONTEXT_SLOTS)) {
      const k = `context_${p}_p${i}`;
      if (d[k] !== CONTEXT_LOOK) continue;
      if (!leden.some((o) => o !== i && pastOp(p, soort(o)))) d[k] = 'ours';
    }
  }
  return { looks: looksVan(d, n), weg };
}

/**
 * Welk stuk uit de look op welke plek van product `i` staat: { plek: n }.
 * Voor de werkmap en /admin ("de broek draagt de hoodie als Top").
 */
export function lookPlekkenVan(details, i, aantal, typeVan) {
  const d = details || {};
  const letter = d[`look_p${i}`];
  if (!letter) return {};
  const leden = looksVan(d, aantal).find((l) => l.letter === letter)?.producten || [];
  const soort = (k) => String((typeof typeVan === 'function' ? typeVan(k) : '') || 'other');
  const uit = {};
  for (const p of lookPlekken(soort(i))) {
    if (d[`context_${p}_p${i}`] !== CONTEXT_LOOK) continue;
    const wie = leden.find((o) => o !== i && pastOp(p, soort(o)));
    if (wie) uit[p] = wie;
  }
  return uit;
}

/**
 * Eén regel per look voor de bevestiging, de factuur en de mail aan de studio:
 * "A · Hoodie zwart, Wijde broek, Sneaker zwart · €50" (d-studio). `aantal` uit de
 * bestelling als hij er is, anders zo hoog als er looksleutels zijn. De namen zijn
 * die de klant typte (`product_p<n>`), anders "Product n".
 */
export function lookRegels(details = {}, lang = 'nl', aantal = null) {
  const d = details || {};
  const n = aantal != null ? aantal : Math.max(0, ...Object.keys(d).map((k) => Number((/^look_p(\d+)$/.exec(k) || [])[1]) || 0));
  const nl = lang !== 'en';
  const naam = (i) => String(d[`product_p${i}`] || '').trim() || (nl ? `Product ${i}` : `Product ${i}`);
  return looksVan(d, n).map((l) => `${l.letter} · ${l.producten.map(naam).join(', ')} · ${euro(LOOK_PRIJS, nl ? 'nl' : 'en')}`);
}

/*
 * ── DE WOORDEN — één verhaal op de site (d-teksten) ─────────────────────────
 *
 * Overal dezelfde zin: "€ 50 per look, bovenop de stukken. Elk stuk houdt zijn
 * eigen beelden." De FAQ, /pricing, /lifestyle en het formulier lezen hem hier.
 * `waarom` vervangt OUTFIT_COPY en staat achter een vraagteken: een feitelijke
 * uitleg van het extra werk, geen verdediging van de prijs.
 */
export const LOOK_COPY = {
  nl: {
    kort: 'complete look',
    prijs: (euro) => `${euro} per look, bovenop de stukken. Elk stuk houdt zijn eigen beelden.`,
    stap1: (euro) => `Tel ze allemaal mee. Bij je foto’s kies je welke samen een complete look zijn: ${euro} per look.`,
    stap1Kop: 'Stukken die samen gedragen worden?',
    waarom: 'In een complete look zijn alle stukken hoofdzaak. Eén model draagt ze samen, op één plek, en elk stuk wordt gecontroleerd op hoe het valt naast de andere, niet los gemaakt en naast elkaar gezet. Daarbij komen twee beelden van de hele look: van top tot teen, en de stukken samen. Dat is het extra werk achter de prijs.',
    set: 'Verkoop je een set als één product, onder één artikelnummer? Dan is het gewoon één product: één carrousel met beide stukken aan, zonder toeslag.',
    beelden: 'Twee beelden van de hele look erbij: van top tot teen, en de stukken samen.',
  },
  en: {
    kort: 'complete look',
    prijs: (euro) => `${euro} per look, on top of the pieces. Each piece keeps its own images.`,
    stap1: (euro) => `Count them all. With your photos you choose which ones make a complete look: ${euro} per look.`,
    stap1Kop: 'Pieces that are worn together?',
    waarom: 'In a complete look every piece is the subject. One model wears them together, in one place, and each piece is checked against how it falls next to the others, not made separately and put side by side. On top come two images of the whole look: head to toe, and the pieces together. That is the extra work behind the price.',
    set: 'Selling a set as one product, under one SKU? Then it is simply one product: one carousel with both pieces on, no surcharge.',
    beelden: 'Two images of the whole look on top: head to toe, and the pieces together.',
  },
};

export function lookCopy(lang = 'en') {
  return LOOK_COPY[lang === 'nl' ? 'nl' : 'en'];
}

/* Een bouwcontrole, zoals assertGarments(): als een plek waar een stuk op kan in
   geen enkele soort past, is "Uit je bestelling" daar altijd leeg. */
function assertLooks() {
  if (LOOK_LETTERS.length * LOOK_MIN < 20) throw new Error('looks.js: te weinig letters voor twintig producten');
  if (!(LOOK_MIN >= 2 && LOOK_MAX >= LOOK_MIN)) throw new Error('looks.js: LOOK_MIN en LOOK_MAX kloppen niet');
  for (const plek of Object.keys(CONTEXT_SLOTS)) {
    const ergens = ['trousers', 'top', 'shoes', 'dress', 'skirt', 'shorts'].some((g) => pastOp(plek, g));
    if (!ergens) throw new Error(`looks.js: op plek '${plek}' past geen enkel product`);
  }
}
assertLooks();
