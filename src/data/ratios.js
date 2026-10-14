/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE BEELDVERHOUDING VAN WAT WE LEVEREN
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas, 13 augustus 2026: *"wat ik verder nog mis bij bijvoorbeeld catalog
 * orderflow is dat de klant per product het afbeelding formaat kan aangeven.
 * Hoewel ik denk dat bij catalog het beter is om 1 te kiezen [...] over de gehele
 * batch. Bij lifestyle moeten deze wel per foto ingesteld kunnen worden omdat je
 * soms een simpele post en soms een banner lifestyle foto wil."*
 *
 * Dat is één vraag met twee antwoorden, en het verschil zit in wat de dienst IS.
 *
 * ── CATALOG: ÉÉN VERHOUDING VOOR DE HELE BESTELLING ────────────────────────
 *
 * Catalogbeelden gaan naast elkaar op een productpagina en in een grid. Verschilt
 * de verhouding per product, dan staat dat grid scheef — en dat is precies het
 * probleem dat een merk bij ons komt oplossen. Zie de kop van backgrounds.js voor
 * dezelfde redenering bij de achtergrond: *"de nieuwe moeten eruitzien alsof ze
 * naast de oude horen."* Een keuze per product zou de klant de mogelijkheid geven
 * zijn eigen grid te breken, en dat is geen vrijheid maar een valkuil.
 *
 * ── LIFESTYLE: EEN STANDAARD, EN AFWIJKEN PER BEELD ────────────────────────
 *
 * Een lifestylebeeld heeft geen grid om in te passen; het heeft een PLEK. Een post
 * is vierkant of staand, een banner is breed, een story is verticaal. Lucas'
 * voorbeeld is precies dat: *"soms een simpele post en soms een banner"*.
 *
 * Maar drie beelden per product × dertig producten is negentig keuzes, en een
 * formulier dat negentig keer hetzelfde vraagt, wordt negentig keer hetzelfde
 * beantwoord. Vandaar de vorm die Lucas koos: één standaard voor de bestelling, en
 * per beeld mag je ervan afwijken. Wie niets doet krijgt overal dezelfde; wie één
 * banner wil, zet dat ene beeld om.
 *
 * ── WAAROM DIT EEN EIGEN BESTAND IS ────────────────────────────────────────
 *
 * Dezelfde reden als src/data/backgrounds.js: deze waardes zijn het CONTRACT. De
 * studio rendert hiertegen, het bestelformulier toont ze, de bevestigingsmail
 * herhaalt ze en de werkmap in /admin moet ze kunnen lezen. Vier plekken die
 * hetzelfde getal nodig hebben, is precies het aantal waarop een overgetypte
 * waarde uit elkaar gaat lopen.
 *
 * WAT HIER NIET STAAT: pixelmaten. Welke verhouding een beeld heeft is een keuze
 * van de klant; hoe groot het bestand is, is een eigenschap van onze productie en
 * die staat nog niet vast. Zelfde afweging als bij VIDEO_FORMAT in
 * videoExamples.js — een getal dat hier vandaag verzonnen wordt, staat morgen als
 * belofte op een pagina.
 */

/*
 * ── TWEE ZINNEN PER VERHOUDING, EN DAT IS GEEN VERDUBBELING ─────────────────
 *
 * Lucas, 13 augustus 2026, bij de tegels in de brand kit: *"Wellicht bij elk
 * formaat aangeven waarvoor het bedoelt is."* Terecht — een vorm laat zien DAT
 * hij anders is, niet WAARVOOR hij anders is. "3:4" naast "4:5" is voor een merk
 * dat zijn eerste bestelling plaatst geen keuze maar een quiz.
 *
 * `use` is die zin op de tegel: vier tot zes woorden, want een tegel van 150px
 * naast vier andere is geen plek voor een alinea, en een tegelrij die je moet
 * LEZEN in plaats van scannen kiest niemand meer op vorm.
 *
 * `what` is dezelfde vraag met de ruimte om hem te beantwoorden — waar de keuze
 * er echt toe doet en er plek is: het bestelformulier, een uitklap, de mail. Ze
 * spreken elkaar niet tegen, ze zijn dezelfde uitleg op twee lengtes, en ze
 * staan naast elkaar in dit bestand juist zodat ze dat blijven.
 */

/**
 * De verhoudingen die een catalogbestelling kan krijgen.
 *
 * DRIE, EN ELK MET EEN EIGEN TAAK. Vier zou de vraag traag maken en twee zou de
 * klassieke webshop-portret missen. De volgorde is de volgorde waarin ze op het
 * formulier staan, en die begint bij het vierkant omdat dat de enige is die
 * bijna altijd werkt: Amazon en bol nemen hem op een hoofdafbeelding zonder
 * discussie, en een merk dat het niet weet, zit daar goed. Zalando niet: die eist
 * zijn eigen staande maat, 1:1,44 (channels.js, `aspect`). Tot 14 oktober 2026
 * stond hier dat Zalando hem ook nam; dat klopte niet.
 */
export const CATALOG_RATIOS = [
  {
    id: 'square',
    ratio: '1x1',
    label: '1:1',
    css: '1 / 1',
    name: { en: 'Square', nl: 'Vierkant' },
    use: {
      en: 'Marketplaces and ads. The safe one.',
      nl: 'Marktplaatsen en advertenties. De veilige.',
    },
    what: {
      en: 'Works on a main image at Amazon and bol.com, and in feeds and ads. The safest choice if you are not sure. Zalando asks for its own upright size, 1:1.44.',
      nl: 'Werkt op een hoofdafbeelding bij Amazon en bol, en in feeds en advertenties. De veiligste keuze als je twijfelt. Zalando vraagt een eigen staande maat, 1:1,44.',
    },
  },
  {
    id: 'portrait45',
    ratio: '4x5',
    label: '4:5',
    css: '4 / 5',
    name: { en: 'Portrait 4:5', nl: 'Staand 4:5' },
    use: {
      en: 'Shopify and social feeds.',
      nl: 'Shopify en social feeds.',
    },
    what: {
      en: 'The portrait setting in Shopify\'s own themes and the upright size of Instagram and Facebook feeds. More of the product on the same screen width.',
      nl: 'De staande stand in de thema\'s van Shopify zelf en het staande formaat van de feeds van Instagram en Facebook. Meer product op dezelfde schermbreedte.',
    },
  },
  {
    id: 'portrait34',
    ratio: '3x4',
    label: '3:4',
    css: '3 / 4',
    name: { en: 'Portrait 3:4', nl: 'Staand 3:4' },
    use: {
      en: 'Classic webshop grids.',
      nl: 'Klassieke webshop-grids.',
    },
    what: {
      en: 'The classic webshop portrait. A little narrower and taller than 4:5, and since 2025 also the shape of Instagram\'s profile grid.',
      nl: 'Het klassieke webshop-portret. Iets smaller en hoger dan 4:5, en sinds 2025 ook de vorm van het profielraster op Instagram.',
    },
  },
];

/**
 * En die van lifestyle.
 *
 * De drie van catalog blijven staan — een lifestylebeeld op een productpagina is
 * een gewone staande foto — met de breedbeeldvariant erbij, want dat is het geval
 * dat Lucas noemt: de banner. Die staat achteraan omdat hij de uitzondering is:
 * één van de drie beelden, niet alle drie.
 */
export const LIFESTYLE_RATIOS = [
  ...CATALOG_RATIOS,
  {
    id: 'wide',
    ratio: '16x9',
    label: '16:9',
    css: '16 / 9',
    name: { en: 'Wide 16:9', nl: 'Breed 16:9' },
    use: {
      en: 'Banners and page headers.',
      nl: 'Banners en paginakoppen.',
    },
    what: {
      en: 'A banner. A page header, an email header, a hero on a category page — anything that has to be wider than it is tall.',
      nl: 'Een banner. Een paginakop, een e-mailkop, een hero op een categoriepagina — alles wat breder moet zijn dan hoog.',
    },
  },
  /* 9:16 — 4 september 2026. /lifestyle noemde Reels-covers en de kiezer had
     geen staand-volledig formaat; Lucas: "ja, 9:16 toevoegen". Alleen bij
     lifestyle, net als 16:9: een catalogbeeld in een grid heeft er niets aan. */
  {
    id: 'story',
    ratio: '9x16',
    label: '9:16',
    css: '9 / 16',
    name: { en: 'Story 9:16', nl: 'Story 9:16' },
    use: {
      en: 'Reels, Stories and TikTok.',
      nl: 'Reels, Stories en TikTok.',
    },
    what: {
      en: 'Full-screen vertical. A Reels cover, a Story, a TikTok frame — the whole phone screen, nothing cropped when it plays.',
      nl: 'Staand over het hele scherm. Een Reels-cover, een Story, een TikTok-beeld — de hele telefoon, zonder dat er iets afvalt.',
    },
  },
];

/**
 * En de verhouding die bij één kanaal hoort — 14 oktober 2026.
 *
 * Afvinklijst 24, vraag "Zalando · de verhouding in het bestelformulier", antwoord
 * a: *"bij Zalando de verhouding vast op 1:1,44, zoals de achtergrond vast op
 * wit"*. Zalando keurt elk beeld af dat niet 1:1,44 is (channels.js, `aspect`);
 * Amazon en bol eisen geen vorm. Vinkt een klant Zalando aan, dan staat de
 * verhouding hierop vast, ook naast Amazon of bol.
 *
 * GEEN VIERDE KEUZE IN CATALOG_RATIOS. Voor wie niet op Zalando verkoopt is een
 * maat van één platform een vraag die niets oplevert, en de brand kit en de
 * uitleg op de site tonen de drie gewone. Daarom een eigen lijst: de tegel staat
 * in het bestelformulier verborgen tot het kanaal is aangevinkt (RatioPicker,
 * syncRatio in pipeline.js), en /api/order zet de verhouding zelf vast als het
 * kanaal in de bestelling staat (lockChannelRatio), ook zonder JavaScript.
 *
 * 25x36 en niet 1x1.44: ratioViewBox() leest twee hele getallen, en 25:36 is
 * precies 1:1,44. Zalando raadt 1801 × 2600 aan (1:1,4436) — dezelfde vorm.
 *
 * `labels` per taal, omdat het Nederlands een komma schrijft. ratioLabel() leest
 * het; `label` is de Engelse vorm, voor plekken zonder taal (de werkmap).
 */
export const CHANNEL_RATIOS = [
  {
    id: 'zalando',
    channel: 'zalando',
    ratio: '25x36',
    label: '1:1.44',
    labels: { en: '1:1.44', nl: '1:1,44' },
    css: '25 / 36',
    name: { en: 'Zalando 1:1.44', nl: 'Zalando 1:1,44' },
    use: {
      en: 'The shape Zalando requires.',
      nl: 'De vorm die Zalando eist.',
    },
    what: {
      en: 'The upright size Zalando requires for every image: 1:1.44, recommended at 1801 × 2600 px. Fixed for this order because you sell on Zalando.',
      nl: 'De staande maat die Zalando voor elk beeld eist: 1:1,44, aanbevolen op 1801 × 2600 px. Vast voor deze bestelling, omdat je op Zalando verkoopt.',
    },
  },
];

/** Het label in de taal van de lezer: "1:1,44" in het Nederlands, anders `label`. */
export function ratioLabel(r, lang) {
  return (r && r.labels && r.labels[lang]) || (r && r.label) || '';
}

/** De verhouding die een kanaal vastzet, of undefined. */
export function channelRatio(channelId) {
  return CHANNEL_RATIOS.find((r) => r.channel === channelId);
}

/**
 * De verhouding die de kanalen van een bestelling vastzetten, of undefined.
 * `channels` is de kommalijst uit het formulier ('amazon,zalando') of een array.
 */
export function lockedRatio(channels) {
  const ids = Array.isArray(channels) ? channels : String(channels || '').split(',');
  for (const id of ids) {
    const r = channelRatio(String(id).trim());
    if (r) return r;
  }
  return undefined;
}

/** Waar een bestelling op staat als de klant niets kiest. Zie CATALOG_RATIOS[0]. */
export const DEFAULT_RATIO_ID = 'square';

/**
 * Mag deze dienst per beeld afwijken van de standaard?
 *
 * EEN FUNCTIE EN NIET EEN LIJSTJE OP DRIE PLEKKEN. Het formulier, de server en de
 * werkmap moeten alle drie hetzelfde antwoord geven; een `service === 'lifestyle'`
 * die op één van die drie ontbreekt, is een klant die per beeld kiest en een
 * studio die het nooit ziet.
 *
 * Alleen lifestyle. Tot 14 oktober 2026 deed 'complete' (catalog én lifestyle) mee;
 * compleet bestaat sinds 14 oktober 2026 niet meer (afvinklijst 23).
 */
export function ratiosPerImage(service) {
  const s = ladderish(service);
  return s === 'lifestyle';
}

/**
 * De verhouding als viewBox: `'0 0 4 5'`.
 *
 * ── DE BUG VAN 13 AUGUSTUS 2026 ────────────────────────────────────────────
 *
 * De tegels in de brand kit tekenden hun vorm met `style="aspect-ratio:4 / 5"`,
 * en op Lucas' scherm stond elke vorm als een streepje van één pixel breed. De
 * reden staat al in dit project, twee keer: /account draait op `style-src
 * 'self'`, en `style-src-attr` valt daarop terug — dus een style-ATTRIBUUT wordt
 * geweigerd. Zie de kop van swatch() in src/lib/account.js, waar exact dezelfde
 * fout op 7 augustus de kleurvakjes doorzichtig maakte. Twee keer dezelfde val
 * in één bestand is geen pech maar een ontbrekende afspraak, dus hier is hij:
 *
 *   EEN VERHOUDING DIE JE MOET TONEN, TOON JE MET EEN viewBox.
 *
 * `viewBox` is een SVG-attribuut en geen CSS. Het gaat niet door style-src, en
 * een <svg> met viewBox heeft een INTRINSIEKE verhouding — dus `height: 64px;
 * width: auto` in het stylesheet levert 51px bij 4:5, zonder dat de CSS hoeft te
 * weten welke verhoudingen bestaan. Nieuwe verhouding erbij in dit bestand?
 * Tekent zichzelf. Een klasse per verhouding in account.css zou dat niet doen.
 *
 * Onbekende invoer wordt '0 0 1 1' en geen lege string: een viewBox die ontbreekt
 * laat de svg terugvallen op nul breed, en dan staat het streepje er alsnog.
 */
export function ratioViewBox(r) {
  const m = /^([0-9]+)x([0-9]+)$/.exec(String(r?.ratio || ''));
  if (!m) return '0 0 1 1';
  const w = Number.parseInt(m[1], 10);
  const h = Number.parseInt(m[2], 10);
  return (w > 0 && h > 0) ? `0 0 ${w} ${h}` : '0 0 1 1';
}

/** De verhoudingen die bij deze dienst horen. */
export function ratiosFor(service) {
  return ratiosPerImage(service) ? LIFESTYLE_RATIOS : CATALOG_RATIOS;
}

/**
 * Eén verhouding opzoeken, of undefined. Altijd binnen de lijst van de dienst —
 * en bij catalog ook de kanaalverhouding (CHANNEL_RATIOS), want die kan een
 * catalogbestelling dragen zonder dat hij in de keuzelijst staat.
 */
export function ratioById(id, service) {
  return ratiosFor(service).find((r) => r.id === id)
    || (ratiosPerImage(service) ? undefined : CHANNEL_RATIOS.find((r) => r.id === id));
}

/**
 * De verhouding die geldt, met de standaard eronder.
 *
 * `keuze` is wat de klant bij dit beeld heeft gezet ('' = niets, dus volg de
 * standaard). `standaard` is de keuze voor de hele bestelling. Onbekende waardes
 * vallen terug op DEFAULT_RATIO_ID in plaats van door te lekken: dit getal komt
 * uit een formulier en gaat naar de productie.
 */
export function effectiveRatio(keuze, standaard, service) {
  return ratioById(keuze, service)
    || ratioById(standaard, service)
    || ratioById(DEFAULT_RATIO_ID, service)
    || CATALOG_RATIOS[0];
}

/**
 * `ratio_p3_2` — de afwijking voor beeld 2 van product 3.
 *
 * Eén functie voor de veldnaam, zodat het formulier, /api/order en het adminpaneel
 * dezelfde sleutel gebruiken. Het patroon volgt `product_p3` en `extra_p3`, die er
 * al zijn — één woordenlijst voor de hele bestelling.
 */
export function ratioField(productKey, imageIndex) {
  return `ratio_${productKey}_${imageIndex}`;
}

/** Het omgekeerde: uit een sleutel het product en het beeldnummer halen, of null. */
export function parseRatioField(key) {
  const m = /^ratio_(p[1-9][0-9]?)_([1-9][0-9]?)$/.exec(String(key || ''));
  return m ? { product: m[1], image: Number.parseInt(m[2], 10) } : null;
}

/**
 * De laddernaam van een dienst, met de wire-waarde erbij.
 *
 * `drop` is wat /start/complete post; zonder deze vertaling zou ratiosPerImage()
 * daar false geven en zou de duurste bestelling op de site zijn lifestyle-helft
 * niet kunnen instellen. Dezelfde val als bij tierFor() en PAYABLE_SERVICES —
 * daar kostte hij een bestelling van € 2.359,50, dus hij staat hier expliciet.
 */
function ladderish(service) {
  const s = String(service || '').toLowerCase();
  return s;
}
