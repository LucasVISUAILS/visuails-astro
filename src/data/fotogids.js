/*
 * VISUAILS — de fotogids: één A4, één bron. 8 oktober 2026 (punt 5.07).
 *
 * Lucas koos: /upload-guidelines, de fotogids-pdf en de checklistmail komen uit
 * één bron — een A4 om naast je kast te hangen, in vier blokken (licht,
 * ondergrond, kader, close-up), met onderaan vijf korte vragen vóór het
 * uploaden.
 *
 * Tot vandaag had elk van de drie zijn eigen tekst: de pagina een lijst "wel
 * doen / vermijden", de pdf drie bladen met zes tips, de mail "vier punten" die
 * alleen naar de pagina linkten. Drie versies van dezelfde raad lopen uit
 * elkaar, en de klant bewaart de pdf terwijl hij de pagina leest.
 *
 * WIE DIT LEEST
 *   src/components/UploadGuidelinesPage.astro   de pagina, NL en EN
 *   scripts/lib/fotogids-html.mjs               het A4 (scripts/handleiding.mjs
 *                                               maakt er de twee pdf's van)
 *   functions/api/order.js · subscriberEmail()  de checklistmail
 * tests/fotogids.test.mjs houdt vast dat alle drie hieruit lezen en dat de pdf
 * één pagina is.
 *
 * WAT HIER NIET WORDT OVERGETYPT. Welke foto's nodig zijn, de regel per vak,
 * de aanname bij een lege draagfoto, de ondergrens in pixels en of het
 * formulier een te donkere of te kleine foto meldt of weigert: dat komt uit
 * src/data/shots.js, de bron die het formulier zelf gebruikt. Verandert daar
 * iets, dan verandert de gids mee (en zegt de test dat de pdf opnieuw moet).
 *
 * KLEUR (punt 5.03, besloten): de kleur die de klant opgeeft, zoals in zijn
 * webshop, is leidend; wit printpapier half in beeld is het ijkpunt. Dat staat
 * in het blok close-up.
 *
 * Puur gegevens, geen fs: deze module draait ook in de Worker (order.js).
 */
import { SHOTS, MIN_LANGE_ZIJDE, DONKER_ONDER, keurBeeld, copy as shotCopy } from './shots.js';

/* ── WAT HET FORMULIER DOET, GELEZEN UIT DE KEURING ZELF ──────────────────────
   Niet "weigert" of "meldt" intypen: keurBeeld() beslist dat, en een gids die
   zegt dat een foto geweigerd wordt terwijl hij alleen gemeld wordt (of
   andersom), belooft iets wat niet gebeurt. Twee proefmetingen: één net onder
   de ondergrens, één ruim onder de donkergrens. */
const KLEIN = keurBeeld({ w: MIN_LANGE_ZIJDE - 1, h: 1, mean: 0.5 }, 'png', 1);
const DONKER = keurBeeld({ w: MIN_LANGE_ZIJDE * 3, h: MIN_LANGE_ZIJDE * 4, mean: DONKER_ONDER / 2 }, 'png', 1);
const KLEIN_WEIGERT = Boolean(KLEIN && KLEIN.code === 'te-klein' && KLEIN.hard);
const DONKER_GEMELD = Boolean(DONKER && DONKER.code === 'te-donker');

const PAGINA = { nl: '/nl/upload-guidelines', en: '/upload-guidelines' };
const PDF = { nl: '/downloads/visuails-fotogids-nl.pdf', en: '/downloads/visuails-fotogids-en.pdf' };

/* De woorden van de gids zelf. Wat hier staat, staat op alle drie de plekken. */
const TEKST = {
  nl: {
    etiket: 'Fotogids',
    /* v18-tel-ug = a (afvinklijst 18): was "Zo maak je de productfoto’s die wij / nodig hebben" —
       vier regels op een telefoon, nu drie. Ook de kop van het A4 en het onderwerp van de
       checklistmail (titelVol). */
    titel: ['Zo maak je ', 'de juiste productfoto’s'],
    intro: 'Een telefoon bij het raam is genoeg. Let op vier dingen, en loop vóór het uploaden de vijf vragen onderaan na.',
    vakkenKop: 'Per product',
    nodigZin: (namen) => `Per product nodig: ${namen}.`,
    erbijZin: (naam) => `${naam} mag erbij:`,
    /* Afvinklijst 23, v23-draagfoto b: bij lifestyle staan drie van de vier beelden
       op een model, dus raden we de draagfoto daar aan. Overslaan mag nog steeds. */
    wornAdvies: 'Bij lifestyle raden we hem aan.',
    en: 'en',
    blokken: {
      licht: {
        kop: 'Licht',
        regels: [
          'Daglicht bij een raam; lamp en flits uit.',
          'Alle producten in één keer, op dezelfde plek: dan lijken de foto’s van een set op elkaar.',
        ],
        donker: 'Te donker? Dan zegt het formulier het meteen bij het uploaden.',
      },
      ondergrond: {
        kop: 'Ondergrond',
        regels: [
          'Een lege vloer of een deur, niet een bed of bank.',
          'Gestreken of gestoomd, zonder plooien.',
          'Hangkaartjes en prijsstickers eraf.',
        ],
      },
      kader: {
        kop: 'Kader',
        regels: [
          'Recht ervoor of recht van boven, met de lens op 1×.',
          'Geen portretmodus en geen filter; veeg de lens eerst schoon.',
          'Het hele product in beeld, met wat ruimte eromheen.',
        ],
        maat: (min, weigert) => `Minstens ${min} pixels op de lange zijde; ${weigert ? 'het formulier weigert een kleinere foto' : 'is hij kleiner, dan zegt het formulier het meteen'}.`,
      },
      closeup: {
        kop: 'Close-up',
        regels: [
          'De kleur die je bij je bestelling opgeeft, zoals in je webshop, is leidend.',
          'Tip: leg een wit vel printpapier half in beeld; dan zien we welke kleur het licht geeft.',
        ],
      },
    },
    vragenKop: 'Voor je uploadt',
    vragen: [
      'Daglicht, lamp uit?',
      'Scherp tot in de randen?',
      'Het hele product in beeld?',
      'Voor- en achterkant echt verschillend?',
      'Kleur zoals in je hand?',
    ],
    kort: 'Licht, ondergrond, kader en close-up, en vijf vragen voor je uploadt.',
  },
  en: {
    etiket: 'Photo guide',
    titel: ['How to shoot the product photos ', 'we need'],
    intro: 'A phone by a window is enough. Watch four things, and run through the five questions at the bottom before you upload.',
    vakkenKop: 'Per product',
    nodigZin: (namen) => `Needed per product: ${namen}.`,
    erbijZin: (naam) => `${naam} is up to you:`,
    wornAdvies: 'For lifestyle, we recommend it.',
    en: 'and',
    blokken: {
      licht: {
        kop: 'Light',
        regels: [
          'Daylight by a window; lamp and flash off.',
          'All products in one go, in the same spot: then the photos in a set match.',
        ],
        donker: 'Too dark? The form tells you right away when you upload.',
      },
      ondergrond: {
        kop: 'Surface',
        regels: [
          'A clear floor or a door, not a bed or sofa.',
          'Ironed or steamed, no creases.',
          'Swing tags and price stickers off.',
        ],
      },
      kader: {
        kop: 'Frame',
        regels: [
          'Straight on or straight from above, with the lens at 1×.',
          'No Portrait mode and no filter; wipe the lens clean first.',
          'The whole product in frame, with a little room around it.',
        ],
        maat: (min, weigert) => `At least ${min} pixels on the long side; ${weigert ? 'the form refuses a smaller photo' : 'if it is smaller, the form tells you right away'}.`,
      },
      closeup: {
        kop: 'Close-up',
        regels: [
          'The colour you give with your order, as in your webshop, is what counts.',
          'Tip: put a sheet of white printer paper half in the frame; it shows us what colour the light adds.',
        ],
      },
    },
    vragenKop: 'Before you upload',
    vragen: [
      'Daylight, lamp off?',
      'Sharp right to the edges?',
      'The whole product in frame?',
      'Front and back really different?',
      'Colour as it looks in your hand?',
    ],
    kort: 'Light, surface, frame and close-up, and five questions before you upload.',
  },
};

/** De volgorde van de blokken op het A4. */
export const BLOK_IDS = ['licht', 'ondergrond', 'kader', 'closeup'];

const lijstVan = (namen, en) => (namen.length < 2
  ? namen.join('')
  : `${namen.slice(0, -1).join(', ')} ${en} ${namen[namen.length - 1]}`);

/**
 * De hele gids in één taal, klaar om te tonen: elke zin af, niets meer om in te
 * vullen. Pagina, pdf en mail lezen allemaal dit object.
 */
export function fotogids(lang = 'en') {
  const l = lang === 'nl' ? 'nl' : 'en';
  const t = TEKST[l];
  const k = shotCopy(l);

  const vakken = SHOTS.map((s) => ({
    id: s.id,
    naam: s.name[l],
    nodig: Boolean(s.required),
    label: s.required ? k.required : k.optional,
    regel: (s.regel ? s.regel[l] : s.how[l]) + (s.id === 'worn' ? ` ${t.wornAdvies}` : ''),
    zonder: s.zonder ? s.zonder[l] : '',
    voorbeeld: s.voorbeeld || '',
  }));

  const verplicht = vakken.filter((v) => v.nodig).map((v) => v.naam.toLowerCase());
  const erbij = vakken.filter((v) => !v.nodig);
  const nodigZin = [
    t.nodigZin(lijstVan(verplicht, t.en)),
    ...erbij.map((v) => (v.zonder ? `${t.erbijZin(v.naam)} ${v.zonder.charAt(0).toLowerCase()}${v.zonder.slice(1)}` : '')),
  ].filter(Boolean).join(' ');

  const detail = SHOTS.find((s) => s.id === 'detail');
  const blokken = BLOK_IDS.map((id) => {
    const b = t.blokken[id];
    const regels = [...b.regels];
    if (id === 'licht' && DONKER_GEMELD) regels.push(b.donker);
    if (id === 'kader') regels.push(b.maat(MIN_LANGE_ZIJDE, KLEIN_WEIGERT));
    /* De close-up begint met de regel van het vak Detail: dezelfde zin die
       stap 2 straks bij dat vak toont. */
    if (id === 'closeup' && detail && detail.regel) regels.unshift(detail.regel[l]);
    return { id, kop: b.kop, regels };
  });

  return {
    taal: l,
    etiket: t.etiket,
    titel: [...t.titel],
    titelVol: t.titel.join(''),
    intro: t.intro,
    kort: t.kort,
    vakkenKop: t.vakkenKop,
    vakken,
    nodigZin,
    blokken,
    vragenKop: t.vragenKop,
    vragen: [...t.vragen],
    pagina: PAGINA[l],
    pdf: PDF[l],
  };
}

/**
 * De zinnen die op alle drie de plekken letterlijk staan, plat op een rij: de
 * titel, de inleiding, de vier blokken en de vijf vragen. Voor de test.
 *
 * De vakken per product staan er níét in, want die verschillen in VORM: de
 * pagina en het A4 tonen ze als vier vakken met etiket, regel en aanname (uit
 * `vakken`), de mail als één zin (`nodigZin`). Allebei uit shots.js.
 */
export function fotogidsZinnen(lang = 'en') {
  const g = fotogids(lang);
  return [
    g.titelVol, g.intro,
    ...g.blokken.flatMap((b) => [b.kop, ...b.regels]),
    g.vragenKop, ...g.vragen,
  ];
}
