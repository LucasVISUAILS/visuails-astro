// VISUAILS — OP MAAT: wat de intake vraagt, per dienst. 14 november 2026, lijst 107 (alles volgens het advies).
//
// Eén bron voor de intake op de site (het korte begin), de stappen in Studio, het overzicht vóór versturen, de
// kopie per mail en wat /admin toont. src/lib/opMaat.js normaliseert wat de klant invult tegen deze lijsten: een
// waarde die hier niet staat, komt nooit in de database.
//
// De teksten zijn een eerste versie; Lucas loopt ze zelf na (tekstronde). Geen bedragen: die beslist Lucas
// (lijst 107, q3), dus hier staat nergens een prijs.
//
// Wat lijst 107 bewust LATER zette, staat hier niet: l6 (de camera bij lifestyle: die stellen wij voor in het
// concept) en v3 (de camerabeweging voorvertonen op het 3D-product: pas als de 3D-stap van catalog er is).

/** De vier diensten op maat, in de volgorde van de keuze. */
export const DIENSTEN = ['catalog', 'lifestyle', 'hooks', 'video'];

export const DIENST_NAAM = {
  nl: { catalog: 'Catalog op maat', lifestyle: 'Lifestyle op maat', hooks: 'Hooks op maat', video: 'Video op maat' },
  en: { catalog: 'Custom catalog', lifestyle: 'Custom lifestyle', hooks: 'Custom hooks', video: 'Custom video' },
};

/** De standen van een aanvraag, met wat de klant erbij leest (lijst 107: de stappen 7 tot 9). */
export const STANDEN = ['concept', 'verstuurd', 'voorstel', 'akkoord', 'offerte', 'vastgelegd', 'gesloten'];
export const STAND_TEKST = {
  nl: {
    concept: 'Nog niet verstuurd. Je kunt verder waar je was.',
    verstuurd: 'Verstuurd. Wij maken een concept.',
    voorstel: 'Het concept staat klaar. Zet per foto goed of aanpassen.',
    akkoord: 'Je gaf akkoord op het concept. De offerte volgt.',
    offerte: 'De offerte staat klaar.',
    vastgelegd: 'Je gaf akkoord op de offerte. Na de aanbetaling gaan we aan het werk.',
    gesloten: 'Gesloten.',
  },
  en: {
    concept: 'Not sent yet. You can pick up where you left off.',
    verstuurd: 'Sent. We are making a concept.',
    voorstel: 'The concept is ready. Mark each photo as good or to adjust.',
    akkoord: 'You approved the concept. The quote follows.',
    offerte: 'The quote is ready.',
    vastgelegd: 'You accepted the quote. We start once the deposit is in.',
    gesloten: 'Closed.',
  },
};

/* ── GEDEELD (lijst 107, g1 – g7) ─────────────────────────────────────────────────────────────────────────── */

/** Het merkprofiel (g1). `max` is het aantal tekens; `lijst` een aantal waarden. */
export const MERK_VELDEN = [
  { id: 'naam', max: 80, verplicht: true },
  { id: 'site', max: 200 },
  { id: 'instagram', max: 60 },
  { id: 'klant', max: 400 },            // wie zijn klant is
  { id: 'woorden', lijst: 3, max: 30 }, // drie merkwoorden
  { id: 'kleuren', lijst: 6, hex: true },
  { id: 'prijsklasse', keuze: ['instap', 'midden', 'premium', 'luxe'] },
];

/** Wat de klant van een referentiebeeld wil (g2). */
export const REF_WAT = ['licht', 'pose', 'kleur', 'sfeer', 'compositie', 'product'];

/** Vragen die buiten de lijntjes laten denken (g4): steeds één, met een voorbeeldantwoord ernaast. */
export const BUITEN_VRAGEN = {
  nl: [
    { id: 'durven', vraag: 'Wat zou je concurrent nooit durven?', voorbeeld: 'Onze hoodie in de regen laten zien, doorweekt, en het model lacht.' },
    { id: 'moment', vraag: 'Welk moment van je klant zie je nooit in een campagne?', voorbeeld: 'Het moment vlak voor ze de deur uitgaan, nog één keer in de spiegel.' },
    { id: 'plek', vraag: 'Als je merk een plek was, welke?', voorbeeld: 'Een parkeergarage om drie uur ’s nachts, met één tl-buis die nog brandt.' },
    { id: 'gevoel', vraag: 'Wat moet iemand voelen in de eerste seconde?', voorbeeld: 'Dat hij erbij wil horen, nog voordat hij weet wat het kost.' },
  ],
  en: [
    { id: 'durven', vraag: 'What would your competitor never dare to do?', voorbeeld: 'Show our hoodie in the rain, soaked through, with the model laughing.' },
    { id: 'moment', vraag: 'Which moment of your customer do you never see in a campaign?', voorbeeld: 'The moment just before they leave the house, one last look in the mirror.' },
    { id: 'plek', vraag: 'If your brand were a place, which one?', voorbeeld: 'A car park at three in the morning, with one strip light still on.' },
    { id: 'gevoel', vraag: 'What should someone feel in the first second?', voorbeeld: 'That they want to belong, before they even know the price.' },
  ],
};

/** Praktisch (stap 6): waar de beelden komen en hoe we hem bereiken. */
export const KANALEN = ['webshop', 'instagram', 'tiktok', 'advertenties', 'marktplaats', 'drukwerk', 'anders'];
export const CONTACT = ['mail', 'telefoon', 'whatsapp'];
export const FORMATEN = ['4:5', '9:16', '1:1', '16:9'];

/* ── CUSTOM CATALOG (c1 – c7) ─────────────────────────────────────────────────────────────────────────────── */

/** De productsoorten. `vorm` 3d = de 3D-stap (c2, c3: stevige producten), leg = legwijzen met plaatjes (c4). Lijst
 *  107 c2: begin met drie modellen (schoen, tas, pet); de andere stevige soorten krijgen de 3D-stap als er een
 *  model is, tot dan kiezen ze een legwijze en beschrijven ze de stand. */
/* De productsoorten, per groep (lijst 113, 15 november 2026): elke soort met een 3D-model van stippen in
   public/js/op-maat-3d.js, behalve "iets anders". De groep bepaalt welke hoeken er zijn (STAND_GROEPEN). */
export const SOORTEN = [
  { id: 'pet', groep: 'headwear', model: 'pet' }, { id: 'muts', groep: 'headwear', model: 'muts' }, { id: 'bucket', groep: 'headwear', model: 'bucket' },
  { id: 'bril', groep: 'eyewear', model: 'bril' },
  { id: 'tshirt', groep: 'top', model: 'tshirt' }, { id: 'hoodie', groep: 'top', model: 'hoodie' }, { id: 'trui', groep: 'top', model: 'trui' },
  { id: 'jas', groep: 'top', model: 'jas' }, { id: 'jurk', groep: 'top', model: 'jurk' },
  { id: 'broek', groep: 'bottom', model: 'broek' }, { id: 'short', groep: 'bottom', model: 'short' }, { id: 'rok', groep: 'bottom', model: 'rok' },
  { id: 'sok', groep: 'socks', model: 'sok' },
  { id: 'schoen', groep: 'shoes', model: 'schoen' }, { id: 'laars', groep: 'shoes', model: 'laars' },
  { id: 'tas', groep: 'accessoires', model: 'tas' }, { id: 'horloge', groep: 'accessoires', model: 'horloge' },
  { id: 'sieraad', groep: 'accessoires', model: 'sieraad' }, { id: 'fles', groep: 'accessoires', model: 'fles' },
  { id: 'anders', groep: 'accessoires', model: null },
];
/* ── DE STAND OP DE VOORKANT, IN 3D (lijst 113, 15 november 2026) ─────────────────────────────────────────────────
   Lucas: per groep (headwear, eyewear, top, bottom, socks, shoes) "Snel naar een hoek", of per product aanpassen.
   De eerste hoek van een groep is de standaard en kost niets, net als "Wij kiezen" (stand3d b): "Alleen de standaard
   pose is kosteloos." Elke andere stand rekent opMaatPrijs.js (c-pose). Draai 0 = de voorkant naar de camera,
   -90 = de voorkant naar links; kantel = hoe ver de camera erboven staat; plat = het product ligt (flatlay).
   Licht en schaduw horen hier niet: die kiest de klant bij de omgeving; zonder keuze lichte, natuurlijke schaduw.
   ALLEEN DE VOORKANT (Lucas, 15 november 17:12): "Het 3d model is een referentie voor hoe de klant wil dat de eerste front
   foto eruit ziet. De achterkant als eerste foto is dan ook niet logisch omdat deze er al sowieso in zit als tweede foto."
   Dus geen achterkant als hoek, en `draai` houdt slepen tussen de twee zijkanten. "Bij accessoires kan het opzich wel." */
const H = (id, nl, en, yaw, pitch, lig = false) => ({ id, naam: [nl, en], yaw, pitch, lig });
/* Twee looks (Lucas, 15 november 17:15): ghost mannequin (het product in zijn vorm, alsof iemand het draagt, zonder
   persoon) of flat lay (plat neergelegd, van boven). Per look een eigen rij hoeken; de eerste is de standaard.
   Bij flat lay ligt kleding (top, bottom, socks) plat; schoenen en accessoires staan op de grond, van boven gezien. */
export const STAND_LOOKS = ['ghost', 'flatlay'];
export const STAND_LOOK_NAAM = { ghost: ['Ghost mannequin', 'Ghost mannequin'], flatlay: ['Flat lay', 'Flat lay'] };
const VAN_BOVEN = (basis, lig) => [H('recht', 'Recht van boven', 'Straight from above', basis, 85, lig), H('schuin', 'Iets schuin', 'Slightly angled', basis - 15, 85, lig),
  H('diagonaal', 'Diagonaal', 'Diagonal', basis - 45, 85, lig), H('schuin-boven', 'Schuin van boven', 'Angled from above', basis, 50, lig)];
export const STAND_GROEPEN = [
  { id: 'headwear', naam: ['Headwear', 'Headwear'], draai: [-100, 100], hoeken: [H('zijkant-links', 'Zijkant, klep links', 'Side, peak left', -90, 0), H('driekwart', 'Drie kwart', 'Three quarter', -40, 0), H('voorkant', 'Voorkant', 'Front', 0, 0), H('van-boven', 'Van boven', 'From above', -30, 60)], plat: VAN_BOVEN(0, false) },
  { id: 'eyewear', naam: ['Eyewear', 'Eyewear'], draai: [-100, 100], hoeken: [H('voorkant', 'Voorkant', 'Front', 0, 0), H('driekwart', 'Drie kwart', 'Three quarter', -35, 0), H('zijkant', 'Zijkant', 'Side', -90, 0), H('van-boven', 'Van boven', 'From above', 0, 60)], plat: VAN_BOVEN(0, false) },
  { id: 'top', naam: ['Top', 'Top'], draai: [-100, 100], kleding: true, hoeken: [H('voorkant', 'Voorkant', 'Front', 0, 0), H('driekwart', 'Drie kwart', 'Three quarter', -35, 0), H('zijkant', 'Zijkant', 'Side', -90, 0)], plat: VAN_BOVEN(0, true) },
  { id: 'bottom', naam: ['Bottom', 'Bottom'], draai: [-100, 100], kleding: true, hoeken: [H('voorkant', 'Voorkant', 'Front', 0, 0), H('driekwart', 'Drie kwart', 'Three quarter', -35, 0), H('zijkant', 'Zijkant', 'Side', -90, 0)], plat: VAN_BOVEN(0, true) },
  { id: 'socks', naam: ['Socks', 'Socks'], draai: [-100, 100], kleding: true, hoeken: [H('zijkant-links', 'Zijkant, punt links', 'Side, toe left', -90, 0), H('driekwart', 'Drie kwart', 'Three quarter', -50, 0), H('voorkant', 'Voorkant', 'Front', 0, 0)], plat: VAN_BOVEN(-90, true) },
  { id: 'shoes', naam: ['Shoes', 'Shoes'], draai: [-100, 100], hoeken: [H('zijkant-links', 'Zijkant, punt links', 'Side, toe left', -90, 0), H('driekwart', 'Drie kwart voor', 'Front three quarter', -55, 0), H('voorkant', 'Voorkant', 'Front', 0, 0), H('zijkant-rechts', 'Zijkant, punt rechts', 'Side, toe right', 90, 0), H('van-boven', 'Van boven', 'From above', -70, 60)], plat: VAN_BOVEN(-90, false) },
  { id: 'accessoires', naam: ['Accessoires', 'Accessories'], draai: [-180, 180], hoeken: [H('voorkant', 'Voorkant', 'Front', 0, 0), H('driekwart', 'Drie kwart', 'Three quarter', -35, 0), H('zijkant', 'Zijkant', 'Side', -90, 0), H('achterkant', 'Achterkant', 'Back', 180, 0), H('van-boven', 'Van boven', 'From above', 0, 60)], plat: VAN_BOVEN(0, false) },
];
/** De hoeken van een groep in een look. */
export const hoekenVan = (g, look) => (look === 'flatlay' ? g.plat : g.hoeken);
/** "Wij kiezen": wij nemen de standaard, dus kosteloos. */
export const STAND_WIJ = 'wij';
/** De grenzen van een eigen stand, in graden. */
export const STAND_GRENS = { pitch: [-10, 90] };
const draai = (v) => ((((Math.round(v) % 360) + 540) % 360) - 180);
const zelfdeStand = (a, b) => Math.abs(draai(a.yaw - b.yaw)) < 3 && Math.abs(a.pitch - b.pitch) < 3 && !!a.lig === !!b.lig;
/**
 * Hoeveel standen buiten de standaard deze intake vraagt, en hoeveel producten daarin staan (lijst 113, stand3d b).
 * Een stand per groep telt één keer, hoeveel producten er ook in staan; een product met een eigen stand telt apart,
 * tenzij die gelijk is aan de standaard of aan een stand die in die groep al telt.
 */
export function standTelling(soorten = [], standen = {}, look = 'ghost') {
  let aantalStanden = 0, producten = 0;
  for (const g of STAND_GROEPEN) {
    const mijn = (Array.isArray(soorten) ? soorten : []).filter((s) => s && (SOORTEN.find((x) => x.id === s.soort) || {}).groep === g.id);
    if (!mijn.length) continue;
    const hk = hoekenVan(g, look);
    const keuze = (standen && standen[g.id] && standen[g.id].hoek) || hk[0].id;
    const h = keuze === STAND_WIJ ? hk[0] : (hk.find((x) => x.id === keuze) || hk[0]);
    const groep = { yaw: h.yaw, pitch: h.pitch, lig: !!h.lig };
    const std = { yaw: hk[0].yaw, pitch: hk[0].pitch, lig: !!hk[0].lig };
    const geteld = [];
    for (const s of mijn) {
      const v = s.voorkant || {};
      const stand = Number.isFinite(v.yaw) && Number.isFinite(v.pitch) ? { yaw: v.yaw, pitch: v.pitch, lig: !!v.lig } : groep;
      if (zelfdeStand(stand, std)) continue;
      producten += s.aantal || 1;
      if (!geteld.some((x) => zelfdeStand(x, stand))) { geteld.push(stand); aantalStanden++; }
    }
  }
  return { standen: aantalStanden, producten };
}
export const OMGEVINGEN = ['naadloze-studio', 'effen-kleur', 'materiaal', 'echte-plek'];
export const MODEL_KEUZE = ['visuails', 'eigen', 'voorstel'];
/** De vier vaste foto's per productsoort (c7): de klant kiest alleen de voorkant, de rest komt als concept. */
export const VASTE_FOTOS = ['front', 'back', 'detail', 'on-model'];
export const CAMERA = ['laag', 'ooghoogte', 'hoog'];
/** Wat de schatting uit de catalog-intake leest (lijst 109). `merkmodel`: zijn bestaande merkmodel kost niets meer,
 *  een nieuw merkmodel het bedrag van AMOUNT.brandModel, één keer. */
export const MERKMODEL = ['geen', 'bestaand', 'nieuw'];
export const MAX_EXTRA_FOTOS = 4;

/* ── CUSTOM LIFESTYLE (l1 – l5, l7) ───────────────────────────────────────────────────────────────────────── */

/** De drie eisen aan een moment (Lucas' eigen regel, l1). */
export const MOMENT_EISEN = {
  nl: ['Het wordt herinnerd en is belangrijk.', 'Je klant kan er zichzelf in zien.', 'Je kleedt je ervoor aan.'],
  en: ['It is remembered and it matters.', 'Your customer can picture themselves in it.', 'You dress up for it.'],
};
export const MOMENT_VOORBEELDEN = {
  nl: ['Een bruiloft, als gast', 'De eerste date', 'Een festival', 'De vrijdagborrel'],
  en: ['A wedding, as a guest', 'The first date', 'A festival', 'Friday drinks'],
};
export const PLEKKEN = ['stad', 'natuur', 'thuis', 'zaak', 'onderweg', 'anders'];
export const BINNEN_BUITEN = ['binnen', 'buiten'];
/** Bijzonder licht bij lifestyle (l-licht). */
export const LIFESTYLE_LICHT = ['gewoon', 'nacht', 'tegenlicht', 'flits', 'anders'];

/* ── HET IDEE, BIJ HOOKS EN VIDEO (lijst 109 en 110, 15 november 2026) ─────────────────────────────────────────────
   Lucas: "Als de klant een eigen idee heeft is dat goedkoper en kan deze gratis worden bekeken … Wanneer de klant ons
   een idee wil laten bedenken kost dat aanzienlijk meer." Bij ons idee stellen we vooraf de vragen die we anders
   achteraf zouden moeten stellen (lijst 110, notitie bij h-stijl-ons). */
export const IDEE = ['eigen', 'ons'];
/** Wat de post of video moet doen. */
export const DOELEN = ['verkopen', 'lancering', 'bekendheid', 'volgers', 'naar-de-site', 'anders'];
/** Wat de kijker daarna doet. */
export const KIJKER_ACTIE = ['kopen', 'site-bezoeken', 'volgen', 'delen', 'onthouden'];
/** De vragen bij "wij bedenken het idee": elk een vrij veld, met een voorbeeld ernaast in de intake. */
export const IDEE_VRAGEN = ['doelgroep', 'gevoel', 'boodschap', 'aanleiding', 'concurrent', 'nietDoen'];

/* ── CUSTOM HOOKS (lijst 110) ─────────────────────────────────────────────────────────────────────────────────
   Eén clip van hoogstens 8 seconden met één product, voor social. De stijl maken we één keer; daarna bestelt de klant
   per hook in die stijl. Geen storyboard (vervallen: het idee is van hem of van ons), geen geluid (dat voegt hij zelf
   toe), geen staffel. */
export const HOOK_KANALEN = ['reels', 'tiktok', 'stories', 'advertentie'];
export const EERSTE_MOMENT = ['onthulling', 'contrast', 'onverwachte-actie', 'humor', 'tekst-vraag', 'eigen'];
export const HOOK_FORMATEN = ['9:16', '4:5', 'eigen'];
export const HOOK_MAX_SECONDEN = 8;
/** Hoogstens twee personen in beeld (lijst 109, l-mensen: "maximaal 2 modellen per foto"). */
export const MAX_PERSONEN = 2;

/* ── CUSTOM VIDEO (lijst 110) ─────────────────────────────────────────────────────────────────────────────────
   Per seconde, minimaal 8. Elk shot krijgt één camerabeweging, in drie groepen naar wat Seedance goed of minder goed
   kan (lijst 110, camera = goed). Geen muziek; ruwe beelden gratis op aanvraag, zonder kwaliteitsgarantie. */
export const VIDEO_DOELEN = ['product', 'campagne', 'advertentie', 'social', 'anders'];
export const SHOT_SOORTEN = ['model-ruimte', 'materiaal', 'logo', 'gezicht', 'beweging'];
export const CAMERA_GROEPEN = {
  inbegrepen: ['stil', 'push-in', 'pull-out', 'pan', 'tilt'],
  gemiddeld: ['orbit', 'truck', 'volgen', 'handheld'],
  lastig: ['crane', 'whip-pan', 'dolly-zoom', 'combinatie'],
};
export const CAMERABEWEGING = Object.values(CAMERA_GROEPEN).flat();
export const TEMPO = ['rustig', 'premium', 'energiek'];
export const VIDEO_OMGEVING = ['effen', 'eigen-kleur', 'materiaal', 'wereld'];
export const VIDEO_SECONDEN = { min: 8, max: 60 };
/** Een shot duurt 1 tot 15 seconden. */
export const SHOTS = { min: 1, max: 12, duurMin: 1, duurMax: 15 };
