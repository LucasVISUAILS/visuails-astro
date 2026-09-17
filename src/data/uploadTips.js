// VISUAILS — de tips naast stap 2, en het voorbeeldmateriaal dat erbij hoort.
//
// ═══════════════════════════════════════════════════════════════════════════
// WAAROM DIT EEN EIGEN MODULE IS
// ═══════════════════════════════════════════════════════════════════════════
//
// Lucas, bij het ontwerp van de bestelrij: *"rechts tips die de klant elke 10
// seconden kort vertellen wat waarvoor is en waarom het handig is."*
//
// Dat is op 16 september gebouwd — in `/concept/bestelrij`, en daar bleef het
// staan. Op 17 september, bij het overzetten van de look naar het echte
// formulier: *"het tip menu zie ik namelijk ook niet verschijnen die we hadden
// gemaakt."* Terecht; het was nooit overgezet.
//
// Bij het overzetten mocht de tekst niet op twee plekken komen te staan. Een
// tweede kopie in ProductUploader.astro is een kopie die na één wijziging stil
// uit elkaar loopt met de conceptpagina, en dan belooft het prototype iets
// anders dan het formulier. Dus: één bron, allebei importeren.
//
// ── WAT EEN TIP MAG ZEGGEN ─────────────────────────────────────────────────
//
// Kort houden is de hele opgave: dit staat NAAST een taak, niet in plaats
// ervan. Twee regels, één ding per tip. Wie hem leest moet er iets aan hebben
// vóórdat hij de foto maakt, niet erna.
//
// En elke tip gaat over één vak, zodat het voorbeeldmateriaal kan meebewegen:
// links wat een klant stuurde, rechts wat dat vak opleverde. Dat is het enige
// wat je niet in woorden kunt zeggen.
//
// ── DE LAATSTE TIP STAAT NERGENS ANDERS ────────────────────────────────────
//
// Extra foto's opsturen kost niets en levert geen extra beelden op. Dat is het
// duurste misverstand in deze stap: wie het niet weet, stuurt te weinig en is
// zijn revisieronde kwijt aan iets dat met één foto te voorkomen was. Hij staat
// daarom in de reeks en niet in een voetnoot.

/* Voorbeeldmateriaal. Echte paren van één kledingstuk — zie de noot boven in
   src/data/laptopSlides.js. VOOR is wat de klant stuurde (op de telefoon), NA
   is wat dat vak opleverde (op het laptopscherm). */
export const TIP_VOOR = {
  front: '/img/ba2-voor-front.webp',
  back: '/img/ba2-voor-achter.webp',
  detail: '/img/ba2-voor-detail.webp',
  worn: '/img/ba2-voor-pasvorm.webp',
};

export const TIP_NA = {
  front: '/img/ba2-na-front.webp',
  back: '/img/ba2-na-achter.webp',
  detail: '/img/ba2-na-detail.webp',
  worn: '/img/ba2-na-model.webp',
};

/**
 * De tips, op volgorde. `vak` is een id uit shots.js en bepaalt welk paar
 * beelden eronder komt te staan; de NAAM van dat vak wordt niet hier
 * overgetypt maar uit shots.js gehaald, anders heet hetzelfde vak hier ooit
 * anders dan drie centimeter hoger op het scherm.
 */
export const TIPS = [
  {
    vak: 'front',
    nl: {
      kop: 'De voorkant draagt de rest',
      tekst: 'Alles wordt hieruit opgebouwd. Vul het beeld met het product — hoe meer je erin legt, hoe scherper wat eruit komt.',
    },
    en: {
      kop: 'The front carries the rest',
      tekst: 'Everything is built from this one. Fill the frame with the product — the more you put in, the sharper what comes out.',
    },
  },
  {
    vak: 'back',
    nl: {
      kop: 'De achterkant kunnen we niet raden',
      tekst: 'Een print, een pasnaad, een logo achterop bestaat alleen als jij hem stuurt. Zelfde afstand en hoek als de voorkant is genoeg.',
    },
    en: {
      kop: 'We cannot guess the back',
      tekst: 'A print, a seam, a logo on the back exists only if you send it. The same distance and angle as the front is enough.',
    },
  },
  {
    vak: 'worn',
    nl: {
      kop: 'Eén kiekje zet de pasvorm vast',
      tekst: 'Wie het ook draagt, elke telefoon, elke kamer. Zonder die foto is het modelbeeld onze beste inschatting van een platte foto.',
    },
    en: {
      kop: 'One snapshot fixes the fit',
      tekst: 'Whoever wears it, any phone, any room. Without it the on-model image is our best guess from a flat photo.',
    },
  },
  {
    vak: 'detail',
    nl: {
      kop: 'Eén close-up houdt jouw stof herkenbaar',
      tekst: 'De weefselstructuur, de wassing, de glans. Een hand in beeld mag, maar wat de hand bedekt komt niet terug.',
    },
    en: {
      kop: 'One close-up keeps your fabric yours',
      tekst: 'The weave, the wash, the sheen. A hand in the frame is fine, but whatever the hand covers does not come back.',
    },
  },
  {
    vak: 'detail',
    nl: {
      kop: 'Extra foto’s kosten je niets',
      tekst: 'Ze leveren geen extra beelden op. Ze zorgen dat het beeld dat je krijgt meteen klopt — en dat je je revisieronde niet kwijt bent aan een misverstand.',
    },
    en: {
      kop: 'Extra photos cost you nothing',
      tekst: 'They add no images. They make the image you do get right the first time — so your revision round is not spent on a misunderstanding.',
    },
  },
];

/**
 * Wat een vak OPLEVERT, in één zin. Dit is een andere soort tekst dan een tip:
 * een tip is advies dat langskomt, dit is een belofte die hoort bij het vak
 * waar je op dat moment staat. Hij verschijnt als je een vakje aanraakt.
 *
 * De tweede helft van elke zin is het punt. Een klant die vooraf leest dat een
 * bedekt detail niet terugkomt, verspilt zijn revisieronde daar niet aan.
 */
export const BELOFTE = {
  front: {
    nl: 'Hieruit komt het hoofdbeeld. Wat deze foto niet laat zien, kunnen wij ook niet tonen.',
    en: 'The main image comes from this one. What this photo does not show, we cannot show either.',
  },
  back: {
    nl: 'Alles wat alléén achterop zit — een print, een pasnaad, een logo — komt hiervandaan. Geen achterkantfoto, geen achterkantbeeld.',
    en: 'Anything that is only on the back — a print, a seam, a logo — comes from here. No back photo, no back image.',
  },
  detail: {
    nl: 'Hiermee blijft de stof van jóuw product herkenbaar. Een hand in beeld mag, maar wat de hand bedekt komt niet terug.',
    en: 'This is what keeps your own fabric recognisable. A hand in the frame is fine, but whatever the hand covers does not come back.',
  },
  worn: {
    nl: 'Hiermee klopt de pasvorm op het modelbeeld. Zonder deze foto is dat onze beste inschatting van een platte foto.',
    en: 'This is what makes the fit right on the on-model image. Without it, that is our best guess from a flat photo.',
  },
};

/* De woorden om de tips heen. Ze staan hier en niet in de PIPE-tabel van
   OrderFlow.astro omdat ze bij deze module horen: wie een tip toevoegt, leest
   dit bestand en niet een tabel drie bestanden verderop. */
export const TIP_COPY = {
  nl: {
    kop: 'Tips — wat komt waar terecht',
    noot: 'Rechts jouw foto. Op het laptopscherm een <b>voorbeeld</b> van wat dit vak oplevert — van een ánder product, want dat van jou moet nog gemaakt worden.',
    merk: 'Voorbeeld',
    open: 'Tips tonen',
    dicht: 'Tips verbergen',
  },
  en: {
    kop: 'Tips — where each photo ends up',
    noot: 'On the right, your photo. On the laptop screen, an <b>example</b> of what this slot produces — from a different product, because yours has yet to be made.',
    merk: 'Example',
    open: 'Show tips',
    dicht: 'Hide tips',
  },
};

/**
 * De tips voor één taal, met het beeldmateriaal er al aan geplakt.
 *
 * Eén functie en geen kant-en-klare tabel per taal: dan kan er geen taal
 * achterblijven als er een tip bij komt, want beide talen komen uit dezelfde
 * reeks. Een tip die in één taal ontbreekt, valt hier meteen op als
 * `undefined` in plaats van stil een lege regel op het scherm te worden.
 */
export function tipsVoor(lang) {
  const taal = lang === 'nl' ? 'nl' : 'en';
  return TIPS.map((t) => {
    const woorden = t[taal];
    if (!woorden) throw new Error(`uploadTips: tip voor "${t.vak}" mist de taal ${taal}`);
    return {
      vak: t.vak,
      kop: woorden.kop,
      tekst: woorden.tekst,
      voor: TIP_VOOR[t.vak] || '',
      na: TIP_NA[t.vak] || '',
    };
  });
}

/** De belofte bij één vak, of een lege string als dat vak er geen heeft. */
export function belofteVoor(id, lang) {
  const b = BELOFTE[id];
  if (!b) return '';
  return b[lang === 'nl' ? 'nl' : 'en'] || '';
}

/** Hoe vaak de tips doordraaien. Lucas noemde tien seconden; dat is het. */
export const TIP_INTERVAL_MS = 10000;
