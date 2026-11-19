/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * HOE LANG WE JE FOTO'S BEWAREN, IN ÉÉN TABEL — levering 117 (17 november 2026)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Proefronde P6-01 (met P6-02 en P6-13). Pieter las de voorwaarden §7 en de FAQ:
 * "je foto's worden 90 dagen na het afsluiten verwijderd". Daarna het privacybeleid
 * §6 en de verwerkersovereenkomst §12: "een eigen kopie bewaren we tot 2 jaar na je
 * laatste bestelling". Beide pagina's zeiden dat ze dezelfde termijnen noemden. Wie
 * ze naast elkaar legt, denkt dat één van de twee niet waar is.
 *
 * Lucas koos het advies (a): de 2-jaarskopie staat nu ook in de voorwaarden en de
 * FAQ, met "mail ons en hij is weg". En op alle vier plekken staat dezelfde korte
 * tabel, uit dit bestand:
 *   · /terms §7 en /nl/terms §7
 *   · /privacy §6 en /nl/privacy §6
 *   · /data-processing-agreement §12 en de NL-tegenhanger
 *   · de FAQ "Hoe lang bewaren jullie mijn foto's?" (als zinnen: een FAQ-antwoord is tekst)
 *
 * DE GETALLEN KOMEN UIT src/lib/retention.js: dezelfde constanten die de nachtelijke
 * opruimtaak gebruikt. Er staat hier geen termijn getypt, behalve de 30 dagen van de
 * maker van het model: dat is de termijn van Magnific en zijn maker, niet de onze, en
 * hij staat zo in src/data/subverwerkers.js (tests/levering-117-tekst-bewaren.test.mjs
 * legt ze naast elkaar).
 *
 * WAT ER IN DE TABEL STAAT, EN WAAROM ZO:
 *   1 · je foto's in onze opslag: UPLOAD_DAYS na het afsluiten (EXPIRED_FILES_SQL);
 *   2 · onze eigen kopie van je productfoto's en stijlreferenties: tot ACCOUNT_YEARS
 *       na je laatste bestelling (de termijn van het account, retention.js);
 *   3 · foto's in mail en WhatsApp: de bestelmelding aan de studio draagt je
 *       materiaal als bijlage (subverwerkers.js, Resend), en wie via WhatsApp
 *       bestelt, stuurt ze in een chat. Die vallen onder CORRESPONDENTIE_JAREN na het
 *       laatste contact, zoals privacy §6 al zei (N2: "één zin die zegt welke termijn
 *       voor een bijlage geldt, lost het op"). Lucas ruimt die met de hand op;
 *   4 · de beeldmaker: Magnific verwijdert je foto direct na het genereren, de maker
 *       van het model hoogstens 30 dagen; wat wij daar maakten, halen we er met de hand
 *       weg. Privacy §5 zei "het platform bewaart het zolang wij er klant zijn", de DPA
 *       "verwijderen wij binnen dezelfde termijn met de hand" (P6-13). Hier staat één
 *       antwoord, met als termijn die van de geleverde beelden in Studio: DELIVERY_DAYS
 *       na levering. LUCAS: dat moet je dan ook echt zo doen (zie notities-BC.md).
 */
import { UPLOAD_DAYS, DELIVERY_DAYS, ACCOUNT_YEARS, CORRESPONDENTIE_JAREN } from '../lib/retention.js';

/** De termijn van de maker van het model bij Magnific (hun termijn, zie subverwerkers.js). */
export const MAKER_DAGEN = 30;

const jaar = (n, l) => (l === 'nl' ? `${n} jaar` : `${n} year${n === 1 ? '' : 's'}`);

export const BEWAAR_TABEL = {
  nl: {
    kop: 'Je foto’s: hoe lang we ze bewaren',
    kolommen: ['Wat', 'Hoe lang'],
    rijen: [
      { id: 'opslag', wat: 'Je foto’s in onze opslag', hoeLang: `${UPLOAD_DAYS} dagen na het afsluiten van je bestelling; daarna verwijdert een nachtelijke taak ze` },
      { id: 'kopie', wat: 'Onze eigen kopie van je productfoto’s en stijlreferenties', hoeLang: `tot ${jaar(ACCOUNT_YEARS, 'nl')} na je laatste bestelling, zodat een nieuwe bestelling dezelfde look houdt` },
      { id: 'post', wat: 'Foto’s in mail en WhatsApp, ook de bijlage van de bestelmelding', hoeLang: `tot ${jaar(CORRESPONDENTIE_JAREN, 'nl')} na ons laatste contact, net als de rest van onze mail en WhatsApp` },
      { id: 'maker', wat: 'Bij de beeldmaker (Magnific en de maker van het model)', hoeLang: `je foto direct na het genereren weg, bij de maker van het model hoogstens ${MAKER_DAGEN} dagen; wat wij er maakten, halen we er met de hand weg binnen ${DELIVERY_DAYS} dagen na levering` },
    ],
    weg: 'Wil je iets eerder weg? Mail ons vanaf het adres van je account en het is weg. Een reden hoef je niet te geven.',
  },
  en: {
    kop: 'Your photos: how long we keep them',
    kolommen: ['What', 'How long'],
    rijen: [
      { id: 'opslag', wat: 'Your photos in our storage', hoeLang: `${UPLOAD_DAYS} days after your order closes; then a nightly task deletes them` },
      { id: 'kopie', wat: 'Our own copy of your product photos and style references', hoeLang: `up to ${jaar(ACCOUNT_YEARS, 'en')} after your last order, so a new order keeps the same look` },
      { id: 'post', wat: 'Photos in email and WhatsApp, including the attachment of the order notice', hoeLang: `up to ${jaar(CORRESPONDENTIE_JAREN, 'en')} after our last contact, like the rest of our email and WhatsApp` },
      { id: 'maker', wat: 'At the image platform (Magnific and the maker of the model)', hoeLang: `your photo is deleted right after generating, kept by the maker of the model for ${MAKER_DAGEN} days at most; what we made there, we delete by hand within ${DELIVERY_DAYS} days of delivery` },
    ],
    weg: 'Want something gone sooner? Email us from the address of your account and it is gone. You do not need to give a reason.',
  },
};

/** De tabel in één taal. */
export function bewaarTabel(lang = 'en') {
  return BEWAAR_TABEL[lang === 'nl' ? 'nl' : 'en'];
}

/** Dezelfde tabel als lopende tekst, voor de FAQ (een antwoord daar is tekst, geen HTML). */
export function bewaarZinnen(lang = 'en') {
  const t = bewaarTabel(lang);
  return `${t.rijen.map((r) => `${r.wat}: ${r.hoeLang}.`).join(' ')} ${t.weg}`;
}
