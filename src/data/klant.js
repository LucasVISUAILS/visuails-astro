// VISUAILS — wat de site anders zegt tegen een ingelogde klant.
// 14 oktober 2026, afvinklijst 23 (k-klant: vervang, stand, abo, wa).
//
// De site is statisch gebouwd en weet dus niet wie er kijkt. interactions.js
// vraagt /account/me?stand=1 en vult daarmee de elementen met
// `data-vis-klant` (zie pasKlantstandToe() daar). De woorden staan HIER, in
// beide talen, en gaan als data-attribuut mee de pagina in: het script bouwt
// geen zinnen, het vult alleen een naam, een kenmerk of een getal in op de plek
// van {naam}, {ref} en {n}.
//
// DE VIER (alle vier "doen" in afvinklijst 23):
//   vervang  waar de proef voor een klant wegvalt, "Bestel opnieuw met je look"
//            (de link uit Studio, met dezelfde look, achtergrond, verhouding en
//            gezicht), en waar dat de enige knop zou zijn "Start een bestelling".
//   stand    de welkomstregel met de stand van de bestelling die bovenaan
//            Studio staat en één knop erheen. Sinds 14 oktober 2026 (Lucas,
//            11:14) een melding onderin het scherm op elke pagina, die blijft
//            tot je hem wegklikt — KlantMelding.astro. Voor wie niet is ingelogd
//            of nog niets bestelde, staat daar de proef.
//   abo      "Bestel met je credits · {n} over" voor wie credits heeft, in plaats
//            van "Sluit een abonnement af".
//   wa       het WhatsApp-bericht begint met het kenmerk van de lopende bestelling,
//            dezelfde zin als de WhatsApp-knop op een bestelkaart in Studio.

export const KLANT = {
  nl: {
    herbestel: 'Bestel opnieuw met je look',
    start: 'Start een bestelling',
    credits: 'Bestel met je credits · {n} over',
    plan: 'Sluit een abonnement af',
    /* 15 oktober 2026: de tweede knop van een abonnee gaat naar zijn abonnement, niet
       nog een keer naar /start (dat doet de eerste al, met zijn credits erin). */
    jeAbonnement: 'Je abonnement',
    welkom: 'Welkom terug',
    welkomNaam: 'Welkom terug, {naam}',
    leeg: 'Je bestellingen en beelden staan in VISUAILS Studio.',
    studio: 'Naar VISUAILS Studio',
    /* Letterlijk de zin uit Studio — tests/klant-stand.test.mjs vergelijkt. */
    wa: 'Hoi VISUAILS, een vraag over bestelling {ref}:',
    /* De melding onderin het scherm (KlantMelding.astro), 14 oktober 2026. */
    meldingLabel: 'Je bestelling',
    sluit: 'Sluit deze melding',
    proefLabel: 'Proef',
    proefKop: ['Eerst zien?', 'Eén product voor'],
    proefStaart: ', gemaakt van je eigen foto.',
    /* Het proefblok voor een klant die al bestelde (HalProef.astro), 14 oktober
       2026: v26-proefblok a, en Lucas' notitie dat "een product voor €1" er
       dan niet meer toe doet en "volledig met tekst en foto's aangepast" moet. */
    blok: {
      pil: 'Je look',
      kopL: 'Meer producten?',
      kopHer: 'Bestel met je look.',
      kopStart: 'Start je volgende bestelling.',
      zinHer: 'Het formulier opent met de keuzes van {ref}. Je voegt alleen de nieuwe producten toe.',
      zinStart: 'Zodra je eerste levering klaar is, staat hier je eigen look, met één knop om opnieuw te bestellen.',
      credits: 'Je hebt nog {n} credits.',
    },
  },
  en: {
    herbestel: 'Order again in your look',
    start: 'Start an order',
    credits: 'Order with your credits · {n} left',
    jeAbonnement: 'Your plan',
    plan: 'Start a plan',
    welkom: 'Welcome back',
    welkomNaam: 'Welcome back, {naam}',
    leeg: 'Your orders and images are in VISUAILS Studio.',
    studio: 'Go to VISUAILS Studio',
    wa: 'Hi VISUAILS, a question about order {ref}:',
    meldingLabel: 'Your order',
    sluit: 'Close this message',
    proefLabel: 'Test sample',
    proefKop: ['See it first?', 'One product for'],
    proefStaart: ', made from your own photo.',
    blok: {
      pil: 'Your look',
      kopL: 'More products?',
      kopHer: 'Order in your look.',
      kopStart: 'Start your next order.',
      zinHer: 'The form opens with the choices of {ref}. You only add the new products.',
      zinStart: 'Once your first delivery is ready, your own look is here, with one button to order again.',
      credits: 'You have {n} credits left.',
    },
  },
};

export const klantTekst = (lang) => KLANT[lang === 'en' ? 'en' : 'nl'];

/**
 * De attributen van de abonnementsknop (data-vis-klant="plan"). Zonder credits
 * blijft hij "Sluit een abonnement af" naar /start/plan; met credits wordt hij
 * "Bestel met je credits · 48 over" naar het beginscherm van het bestellen
 * (niet het formulier zelf: daar kies je eerst de dienst).
 *
 * @param {'en'|'nl'} lang
 * @param {(p: string) => string} lp  localizedPath voor deze taal
 */
export function planKnop(lang, lp) {
  const k = klantTekst(lang);
  return {
    'data-vis-klant': 'plan',
    'data-vis-abo-label': k.jeAbonnement,
    'data-vis-abo': '/account/plan',
    hidden: true,
  };
}

/** De hoofdknop "Start een bestelling": met credits "Bestel met je credits · 48 over". */
export function startKnop(lang) {
  const k = klantTekst(lang);
  return { 'data-vis-klant': 'start-credits', 'data-vis-credits': k.credits };
}

/** De attributen van een generieke WhatsApp-knop die het kenmerk mag krijgen. */
export function waKlant(lang) {
  return { 'data-vis-wa': klantTekst(lang).wa };
}
