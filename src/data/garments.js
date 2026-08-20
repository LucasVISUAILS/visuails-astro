/**
 * ══════════════════════════════════════════════════════════════════════════════
 * WAT VOOR PRODUCT HET IS — EN WAT DAT OVER HET BEELD BEPAALT
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas, 17 augustus 2026: *"VISUAILS hanteert standaard regels voor catalog
 * foto’s, bijvoorbeeld wanneer je een broek on-model foto krijgt krijg je geen
 * model gezicht erbij, wellicht alleen female/male optie. Wel zijn er schoenen en
 * een gedeelte van de top te zien en kan de klant deze toevoegen wanneer hij dat
 * wilt, gratis."*
 *
 * ── ÉÉN GEGEVEN PER TYPE, EN DE REST VOLGT ──────────────────────────────────
 *
 * De verleiding is drie lijsten: één met "hier valt het gezicht weg", één met
 * "hier mag je schoenen toevoegen", één met "deze vragen sla je over". Drie
 * lijsten die hetzelfde weten, lopen uit elkaar zodra er een producttype bij komt.
 *
 * Er is maar één gegeven nodig: DE UITSNEDE. Een broek wordt van de taille naar
 * beneden gefotografeerd, en daarmee staat alles vast — er zit geen gezicht in
 * beeld (dus is een keuze uit tien namen een keuze die je niet terugziet), en er
 * staan wél schoenen en de zoom van een top in beeld (dus zijn dát de stukken die
 * de klant mag aanwijzen). Alles hieronder is uit `crop` afgeleid en niet apart
 * opgeschreven.
 *
 * ── DE UITSNEDES ZIJN NAGEKEKEN EN NIET AANGENOMEN ──────────────────────────
 *
 * Zalando's eigen apparel-richtlijn bevestigt de twee dingen waar dit op staat:
 * *"body cropping allowed as long as the article remains recognizable"* — een
 * gezichtsloze on-model shot is dus geen afwijking maar toegestaan — en het
 * meegestylede stuk is een EIS en geen ongelukje: *"combine wide-cut tops with
 * slim trousers and vice versa"*, met *"keep it simple to highlight the main
 * article"* als grens. Er staat dus altijd iets anders in beeld; de enige vraag is
 * wie het kiest.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * DE GRENS MET DE OUTFITTOESLAG VAN € 50 — LEES DIT VOORDAT JE HIER IETS WIJZIGT
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * OUTFIT_SURCHARGE in pricing.js is sinds 30 juli € 50 per shot, en het voorbeeld
 * in die noot is letterlijk *"trousers and a t-shirt worn together"*. Dat is op het
 * eerste gezicht precies wat hier gratis wordt. Zonder een grens verdwijnt die
 * € 50 stil, en dan is er een toeslag die niemand meer betaalt.
 *
 * DE GRENS IS DE UITSNEDE EN NIET HET AANTAL KLEDINGSTUKKEN, en ook niet wat de
 * klant aanlevert:
 *
 *   · Een OUTFITSHOT (€ 50): elk stuk is ONDERWERP. Alles moet kloppen, alles
 *     krijgt een fitcontrole over de stukken heen, en de foto verkoopt twee of
 *     drie dingen. Dat is het extra werk dat de toeslag dekt.
 *   · Een CONTEXTSTUK (gratis): één product is onderwerp, de rest staat er omdat
 *     het beeld anders onzin is — een broek zonder schoenen is een broek boven
 *     blote voeten. Het stuk is GEDEELTELIJK in beeld, in de uitsnede die bij het
 *     hoofdproduct hoort, en er valt niets uit te verkopen.
 *
 * Vandaar `CONTEXT_RULES` onderaan, en vandaar dat een contextstuk hier NOOIT
 * eigen opnames krijgt: geen voorkant, geen achterkant, geen detail. Het bestaat
 * in precies één beeld — de on-model shot — en nergens anders. Wil een klant dat
 * tweede stuk volledig en scherp in beeld, dan is dat een outfitshot en kost het
 * € 50. Dat is dezelfde soort scheiding als tussen een extra foto (€ 35, één
 * omschreven frame) en een outfitshot: wat er ANDERS aan is, is het werk.
 *
 * Lucas koos ervoor dat de klant van een contextstuk wél foto’s aanlevert, tegen
 * mijn eerste voorstel in. Dat is voor de kwaliteit de juiste keuze — een generiek
 * gerenderde schoen onder een broek van € 89 verpest het beeld — en het verplaatst
 * de grens niet, want de grens zit in de uitsnede. Wat het WEL doet, is de
 * werkmap: die foto’s mogen niet te verwarren zijn met die van het hoofdproduct.
 * Zie CONTEXT_UPLOAD_PREFIX.
 *
 * ── WAT DIT NIET IS ─────────────────────────────────────────────────────────
 *
 * Dit is GEEN veld waar de generator uit leest wat voor kledingstuk het is.
 * attributes.js wees "garment category" in augustus expliciet af, omdat try-on-
 * pijplijnen tops en bottoms zelf detecteren, en die afwijzing staat nog. Dit
 * bestand doet iets anders: het bepaalt WELKE VRAGEN HET FORMULIER STELT en WAT ER
 * IN BEELD STAAT. Dezelfde vorm als het `colour`-veld daar — afgewezen voor het ene
 * doel, geldig voor het andere. Wie dit ooit samenvoegt met een categorieveld voor
 * de generator, haalt die afwijzing terug binnen.
 */

/*
 * ── DE UITSNEDES ───────────────────────────────────────────────────────────
 *
 * `face` zegt of er een gezicht in de uitsnede past. Dat is het enige wat de
 * modelvraag hoeft te weten: staat er geen gezicht in beeld, dan is een keuze uit
 * de roster een keuze die je in het resultaat niet terugziet.
 *
 * `inFrame` is WAT ER IN DEZE UITSNEDE STAAT, en dat is nadrukkelijk niet hetzelfde
 * als wat de klant mag kiezen. Het verschil is het product zelf: in een
 * onderlichaam-uitsnede staan schoenen, de broek én de zoom van de top, maar wie
 * een broek laat maken, kan geen broek als context kiezen — die plek is al bezet.
 *
 * DAT ONDERSCHEID IS ER NIET GELIJK GEWEEST en het uitproberen vond twee fouten:
 * bij een jurk stond "top" als keuze (een jurk IS de top), en bij sokken ontbraken
 * de schoenen (die staan er wel in beeld en zijn geen sok). Vandaar `occupies` per
 * type, en de keuzes zijn het verschil. Eén regel in plaats van veertien lijstjes.
 */
export const CROPS = {
  /** Van de taille naar beneden. Broek, rok, short. */
  lower: { id: 'lower', face: false, inFrame: ['shoes', 'bottom', 'top'] },
  /** Van de heup naar boven. Top, shirt, trui. */
  upper: { id: 'upper', face: true, inFrame: ['top', 'bottom'] },
  /** Hele figuur. Jas, jurk, jumpsuit, tas. */
  full: { id: 'full', face: true, inFrame: ['shoes', 'bottom', 'top'] },
  /** Voeten en onderbeen. Schoenen, sokken. */
  feet: { id: 'feet', face: false, inFrame: ['shoes', 'bottom'] },
  /** De taille, en dus twee stukken tegelijk. Riem. */
  waist: { id: 'waist', face: false, inFrame: ['bottom', 'top'] },
  /** Het hoofd. Pet, hoed, zonnebril — hier IS het gezicht het onderwerp. */
  head: { id: 'head', face: true, inFrame: ['top'] },
  /** Hals, pols, decolleté. Sieraad, horloge, sjaal. */
  detail: { id: 'detail', face: true, inFrame: ['top'] },
  /** Alleen het lichaam. Ondergoed, badkleding: er is geen ander kledingstuk. */
  figure: { id: 'figure', face: true, inFrame: [] },
};

/**
 * De stukken die als context in beeld kunnen staan.
 *
 * DRIE EN NIET VEERTIEN. Dit zijn geen producttypen maar PLEKKEN in een beeld:
 * "iets aan de voeten", "iets aan het onderlichaam". Een klant die schoenen
 * toevoegt onder een broek, kiest de plek en niet de categorie — en de plek is wat
 * de uitsnede bepaalt.
 */
export const CONTEXT_SLOTS = {
  shoes: {
    id: 'shoes',
    name: { en: 'Shoes', nl: 'Schoenen' },
    /* Wat ervan in beeld staat. Dit is de tekst die de klant leest en het is
       tegelijk de grens met de outfittoeslag.
       
       SCHOENEN ZIJN HET ENIGE SLOT DAT VOLLEDIG IN BEELD STAAT, en dat is eerlijk
       opgeschreven in plaats van weggemoffeld: onder een broek staat een schoen er
       helemaal. Ondermijnt dat de € 50? Nee, en de reden is dezelfde als overal in
       dit bestand — de UITSNEDE. Een schoen die verkocht moet worden, vraagt een
       voeten-uitsnede: groot in beeld, van de zijkant, met het profiel. In een
       onderlichaam-uitsnede is hij klein en niet het onderwerp, en er is geen
       voorkant, achterkant of detail van. Wie een schoen wil verkopen, bestelt een
       schoen. */
    seen: {
      en: 'fully in frame, at the bottom of the shot',
      nl: 'volledig in beeld, onderaan het beeld',
    },
  },
  top: {
    id: 'top',
    name: { en: 'Top', nl: 'Top' },
    seen: { en: 'the hem, at the top of the frame', nl: 'de zoom, bovenaan het beeld' },
  },
  bottom: {
    id: 'bottom',
    name: { en: 'Trousers or skirt', nl: 'Broek of rok' },
    seen: { en: 'the waistband, at the edge of the frame', nl: 'de tailleband, aan de rand van het beeld' },
  },
};

export const CONTEXT_SLOT_IDS = Object.keys(CONTEXT_SLOTS);

/*
 * ── DE PRODUCTTYPEN ────────────────────────────────────────────────────────
 *
 * Dertien plus één. De lijst is niet uitputtend en hoort dat ook niet te zijn: hij
 * is lang genoeg dat vrijwel elke bestelling erin past, en `other` vangt de rest —
 * zie de noot daar voor waarom die er is en niet als tekortkoming.
 *
 * De volgorde is die van een kledingrek en niet alfabetisch: onderlichaam,
 * bovenlichaam, hele stukken, voeten, accessoires. Een klant die een broek
 * verkoopt, kijkt bovenaan.
 */
export const GARMENTS = [
  { id: 'trousers', crop: 'lower', occupies: ['bottom'], name: { en: 'Trousers or jeans', nl: 'Broek of jeans' } },
  { id: 'shorts', crop: 'lower', occupies: ['bottom'], name: { en: 'Shorts', nl: 'Short' } },
  { id: 'skirt', crop: 'lower', occupies: ['bottom'], name: { en: 'Skirt', nl: 'Rok' } },
  { id: 'top', crop: 'upper', occupies: ['top'], name: { en: 'Top, shirt or sweater', nl: 'Top, shirt of trui' } },
  /* Een jas bezet GEEN plek: hij is een laag over de top, en de top eronder is dus
     nog een keuze. Alle drie staan open. */
  { id: 'outerwear', crop: 'full', occupies: [], name: { en: 'Jacket or coat', nl: 'Jas of mantel' } },
  /* Een jurk bezet er TWEE. Daar blijven alleen de schoenen over — en dat is de
     fout die het uitproberen vond. */
  { id: 'dress', crop: 'full', occupies: ['top', 'bottom'], name: { en: 'Dress or jumpsuit', nl: 'Jurk of jumpsuit' } },
  { id: 'shoes', crop: 'feet', occupies: ['shoes'], name: { en: 'Shoes', nl: 'Schoenen' } },
  /* Sokken bezetten de plek van de schoenen NIET: ze worden erin gedragen, dus mag
     de klant zeggen wélke schoen. De tweede fout die het uitproberen vond. */
  { id: 'socks', crop: 'feet', occupies: [], name: { en: 'Socks or hosiery', nl: 'Sokken of panty' } },
  { id: 'belt', crop: 'waist', occupies: [], name: { en: 'Belt', nl: 'Riem' } },
  { id: 'bag', crop: 'full', occupies: [], name: { en: 'Bag', nl: 'Tas' } },
  { id: 'headwear', crop: 'head', occupies: [], name: { en: 'Cap, hat or sunglasses', nl: 'Pet, hoed of zonnebril' } },
  { id: 'jewellery', crop: 'detail', occupies: [], name: { en: 'Jewellery or watch', nl: 'Sieraad of horloge' } },
  { id: 'scarf', crop: 'detail', occupies: [], name: { en: 'Scarf', nl: 'Sjaal' } },
  { id: 'underwear', crop: 'figure', occupies: [], name: { en: 'Underwear or swimwear', nl: 'Ondergoed of badkleding' } },
  /*
   * `other` IS GEEN RESTBAK MAAR EEN GELDIG ANTWOORD.
   *
   * Een klant met een yogamat, een sieradendoos of iets wat niemand voorzag, moet
   * verder kunnen. Hij valt terug op de RUIMSTE uitsnede — hele figuur, gezicht in
   * beeld, alle drie de plekken open — en dus op de meeste vragen. Dat is de goede
   * kant om: te veel vragen kost de klant een minuut, te weinig vragen kost hem
   * een beeld dat niet klopt.
   */
  { id: 'other', crop: 'full', occupies: [], name: { en: 'Something else', nl: 'Iets anders' } },
];

export const GARMENT_IDS = GARMENTS.map((g) => g.id);

/** Bestaat dit type? Voor de controle op wat er binnenkomt. */
export function isGarmentId(id) {
  return GARMENT_IDS.includes(String(id || ''));
}

/**
 * Het type, of `other` bij iets onbekends.
 *
 * NOOIT NULL. Elke aanroeper hieronder leest hier zijn uitsnede uit, en een null
 * zou betekenen dat een oude bestelling met een type dat we niet meer kennen, een
 * formulier zonder vragen oplevert in plaats van een formulier met alle vragen.
 */
export function garment(id) {
  return GARMENTS.find((g) => g.id === id) || GARMENTS.find((g) => g.id === 'other');
}

/** De uitsnede die bij dit type hoort. */
export function cropFor(id) {
  return CROPS[garment(id).crop] || CROPS.full;
}

/**
 * Staat er een gezicht in beeld?
 *
 * DIT IS DE HELE MODELVRAAG. Is het antwoord nee, dan is een keuze uit de tien
 * gezichten van de roster een keuze die de klant in zijn beeld niet terugziet — en
 * een vraag stellen waarvan het antwoord onzichtbaar is, is het soort vraag dat
 * deze codebase elders weigert te stellen (zie de noot bij een hex-code in
 * attributes.js: gemeten dat het antwoord het resultaat niet raakt, dus niet
 * gevraagd).
 */
export function faceInFrame(id) {
  return cropFor(id).face === true;
}

/**
 * Welke modelvraag hoort bij dit type: de volledige roster, of alleen man/vrouw.
 *
 * Twee waarden en geen boolean, want er komt een dag dat er een derde is
 * (bijvoorbeeld "geen model") en dan is een boolean een verbouwing.
 */
export function modelQuestion(id) {
  return faceInFrame(id) ? 'roster' : 'presenting';
}

/**
 * De plekken die de klant bij dit type mag vullen, in beeldvolgorde.
 *
 * Geeft de hele slot-omschrijving terug en niet alleen de id's: elke aanroeper zou
 * anders zelf CONTEXT_SLOTS moeten opzoeken, en dan staat de tekst "de zoom,
 * bovenaan het beeld" op twee plekken.
 */
export function contextSlots(id) {
  const bezet = garment(id).occupies || [];
  return cropFor(id).inFrame
    .filter((s) => !bezet.includes(s))
    .map((s) => CONTEXT_SLOTS[s])
    .filter(Boolean);
}

/** Hoeveel contextstukken er bij dit type maximaal bij kunnen. Volgt uit de uitsnede en is geen apart getal. */
export function maxContext(id) {
  return contextSlots(id).length;
}

/**
 * Mag dit stuk als context bij dit hoofdproduct?
 *
 * De controle die de API nodig heeft. Zonder deze zou een zelfgebouwde post drie
 * schoenen aan een broek kunnen hangen, of een top aan een sieraad — en dan staat
 * er in de werkmap een instructie die niet uit te voeren is.
 */
export function contextAllowed(garmentId, slotId) {
  return contextSlots(garmentId).some((s) => s.id === String(slotId || ''));
}

/*
 * ── WAT ER GEBEURT ALS DE KLANT NIETS TOEVOEGT ─────────────────────────────
 *
 * Lucas, 17 augustus: *"Als de klant geen producten bijvoegt gaat VISUAILS ervan
 * uit dat het puur om het hoofdproduct gaat en dat de mogelijk licht zichtbare
 * andere kleding gekozen worden door ons en wij ervoor zorgen dat het aansluit op
 * de style waar de klant voor gaat."*
 *
 * Dus de standaard is NIET "leeg" en het is ook geen ontbrekend antwoord. Er staat
 * altijd iets aan die voeten; de vraag is alleen wie het kiest. Dat verschil moet
 * in de code zichtbaar zijn, want "de klant koos niets" en "de klant koos dat wij
 * kiezen" leiden tot hetzelfde beeld maar tot een ander gesprek als er iets
 * misgaat. Dezelfde reden dat MODEL_ANY in models.js een echte waarde is en geen
 * afwezig veld.
 *
 * WAAR DE KEUZE DAN OP GEBASEERD IS: de stijl die de klant al koos. Niet op een
 * losse voorkeur die hier verzonnen wordt — de stijl is het enige wat er al ligt
 * en waar de klant zich in herkent.
 */
export const CONTEXT_OURS = 'ours';

/** Wat een niet-gevuld slot betekent. Eén plek, zodat de bestelling, de mail en de werkmap hetzelfde zeggen. */
export function contextDefault() {
  return CONTEXT_OURS;
}

/*
 * ── DE REGELS, IN DE WOORDEN DIE DE KLANT LEEST ────────────────────────────
 *
 * Deze drie zinnen staan hier en niet in een component, om dezelfde reden als bij
 * OUTFIT_COPY in pricing.js: het is een BELOFTE, en een belofte die op twee plekken
 * staat, staat er op een dag twee keer anders.
 *
 * De middelste zin is de grens met de € 50. Hij is met opzet niet defensief
 * geformuleerd — het is geen kleine letter maar het antwoord op "wat krijg ik dan".
 */
export const CONTEXT_RULES = {
  en: {
    lead: 'One photo of each product is on a model, and in that frame you always see a little more than the product itself.',
    free: 'Tell us what that should be and we will use your own items — free. They appear only in that one frame, and only as much of them as the crop shows: they are not photographed as products.',
    ours: 'Leave it and we choose items that fit the style you picked.',
    full: 'Want a second product fully and sharply in frame, photographed as a product? That is a full-outfit shot.',
  },
  nl: {
    lead: 'Van elk product is één foto op een model, en in dat beeld zie je altijd iets meer dan het product zelf.',
    free: 'Zeg wat dat moet zijn en we gebruiken je eigen stukken — gratis. Ze staan alleen in dat ene beeld, en alleen zoveel als de uitsnede toont: ze worden niet als product gefotografeerd.',
    ours: 'Laat je het leeg, dan kiezen wij stukken die bij de gekozen stijl passen.',
    full: 'Wil je een tweede product volledig en scherp in beeld, gefotografeerd als product? Dan is dat een volledige-outfitshot.',
  },
};

export function copy(lang = 'en') {
  return CONTEXT_RULES[lang === 'nl' ? 'nl' : 'en'];
}

/*
 * ── DE WERKMAP MOET HET VERSCHIL WETEN ─────────────────────────────────────
 *
 * De klant levert foto’s van een contextstuk aan, en die komen in dezelfde upload
 * terecht als de foto’s van het hoofdproduct. Zonder een merkteken staat er in de
 * werkmap een top waarvan niet te zien is of hij het ONDERWERP is of de CONTEXT —
 * en dat is precies het verschil tussen een beeld van € 89 en een beeld van € 139.
 *
 * Vandaar een voorvoegsel op de bestandsnaam in plaats van een kolom: scaffold.js
 * bouwt die map en een naam reist mee als een bestand verplaatst wordt. Zie
 * deliveryFilename() daar voor dezelfde afweging.
 */
export const CONTEXT_UPLOAD_PREFIX = 'context';

/**
 * Een bouwcontrole, in dezelfde geest als assertPlans() in plans.js.
 *
 * Wat hier fout kan gaan, gaat stil fout: een uitsnede die naar een slot verwijst
 * dat niet bestaat, levert een lijst op waar één plek uit weggefilterd is — en dan
 * mist er een vraag zonder dat er iets omvalt.
 */
function assertGarments() {
  for (const [id, crop] of Object.entries(CROPS)) {
    for (const slot of crop.inFrame) {
      if (!CONTEXT_SLOTS[slot]) {
        throw new Error(`garments.js: uitsnede '${id}' verwijst naar plek '${slot}', die niet bestaat`);
      }
    }
    if (typeof crop.face !== 'boolean') {
      throw new Error(`garments.js: uitsnede '${id}' zegt niet of er een gezicht in beeld staat`);
    }
  }
  for (const g of GARMENTS) {
    if (!CROPS[g.crop]) throw new Error(`garments.js: type '${g.id}' heeft uitsnede '${g.crop}', die niet bestaat`);
    if (!g.name?.en || !g.name?.nl) throw new Error(`garments.js: type '${g.id}' mist een naam in beide talen`);
    if (!Array.isArray(g.occupies)) throw new Error(`garments.js: type '${g.id}' zegt niet welke plek het zelf bezet`);
    /* Een product kan alleen een plek bezetten die in zijn eigen uitsnede staat.
       Anders wordt er niets afgetrokken en klopt de keuzelijst stil niet. */
    for (const bezet of g.occupies) {
      if (!CROPS[g.crop].inFrame.includes(bezet)) {
        throw new Error(`garments.js: type '${g.id}' bezet plek '${bezet}', die niet in uitsnede '${g.crop}' staat`);
      }
    }
  }
  /* Er moet een terugval bestaan, anders geeft garment() undefined terug en leest
     cropFor() een uitsnede van niets. */
  if (!GARMENTS.some((g) => g.id === 'other')) {
    throw new Error("garments.js: 'other' moet bestaan — het is de terugval van garment()");
  }
  /* Elke plek moet ergens gebruikt worden. Een plek die in geen enkele uitsnede
     voorkomt, is een vraag die nooit gesteld wordt en dus dode tekst. */
  const gebruikt = new Set(Object.values(CROPS).flatMap((c) => c.inFrame));
  for (const slot of CONTEXT_SLOT_IDS) {
    if (!gebruikt.has(slot)) throw new Error(`garments.js: plek '${slot}' komt in geen enkele uitsnede voor`);
  }
}
assertGarments();
