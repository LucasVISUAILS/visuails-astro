/* ── DE UITLEG-TIPS — 15 oktober 2026 (afvinklijst 28, v28-tips = a) ──────────
 *
 * Lucas om 07:23: "En meer van die tips waar dat helpt." Tutorials zijn altijd
 * over te slaan en weg te klikken. De zeven plekken uit het voorstel:
 *
 *   bgfoto      het formulier, na de eerste kleurkeuze: per foto een andere
 *               achtergrond kan, puur optioneel;
 *   fotos       stap 2 (je foto's): de verplichte foto's staan bovenaan, de rest
 *               mag erbij;
 *   credits     stap 5 voor een abonnee: wat er met credits gaat en wat niet;
 *   studio      VISUAILS Studio, het eerste bezoek: je bestellingen, je beelden
 *               goedkeuren, je vaste look;
 *   levering    Studio bij de eerste levering: per beeld goedkeuren of één
 *               revisieronde;
 *   abonnement  Studio, abonnement: credits sparen en ermee bestellen;
 *   privelink   de privélink: hij opent je bestelling zonder inloggen.
 *
 * DE REGELS. Eén tip tegelijk. "Begrepen" en een kruisje. In het formulier sluit
 * Esc hem. Hij staat in de stroom van de pagina en dekt dus nooit een knop af.
 * Wat je wegklikt, komt niet terug: in het formulier onthoudt localStorage het
 * (TIPS_SLEUTEL), in Studio en op de privélink een cookie (TIPS_COOKIE), want
 * daar draait geen script en werkt wegklikken met een link (?tipweg=<id>), net
 * als de zijbalk. Niet op de gewone pagina's: die hebben de uitleg in beweging.
 *
 * Teksten volgen de regels van de site: kort, vijf tot zeven woorden per regel
 * in de opmaak, geen prijs die hier getypt staat.
 */
export const TIP_IDS = ['bgfoto', 'fotos', 'credits', 'studio', 'levering', 'abonnement', 'privelink'];

export const TIPS = {
  nl: {
    begrepen: 'Begrepen',
    sluit: 'Tip sluiten',
    label: 'Tip',
    fotos: 'Tip: de foto’s die we nodig hebben staan per product bovenaan. Een extra foto mag erbij, maar hoeft niet.',
    credits: 'Tip: met credits betaal je je producten, en ook een complete look. Kies je voorrang of een eigen look met toeslag, dan betaal je deze bestelling via Mollie.',
    studio: {
      h: 'Welkom in VISUAILS Studio',
      punten: [
        'Bij Bestellingen volg je elke bestelling, van je foto’s tot de levering.',
        'Als je beelden klaar zijn, keur je ze per beeld goed, of vraag je één revisieronde.',
        'Bij Je vaste look leg je je achtergrond, verhouding en model vast voor elke volgende bestelling.',
      ],
    },
    levering: 'Tip: keur je beelden per stuk goed. Klopt er iets niet, vraag dan één revisieronde aan: alles wat je wilt aanpassen, in één keer.',
    abonnement: 'Tip: zolang je abonnement loopt, spaar je tot drie maanden aan credits. Je bestelt via het gewone formulier en betaalt in stap 5 met credits.',
    privelink: 'Tip: deze link opent je bestelling zonder inloggen. Deel hem alleen met wie je vertrouwt.',
  },
  en: {
    begrepen: 'Got it',
    sluit: 'Close tip',
    label: 'Tip',
    fotos: 'Tip: the photos we need are at the top of each product. An extra photo is welcome, but not required.',
    credits: 'Tip: credits pay for your products, and for a complete look too. Choose priority or your own look with a surcharge, and you pay this order through Mollie.',
    studio: {
      h: 'Welcome to VISUAILS Studio',
      punten: [
        'Under Orders you follow every order, from your photos to delivery.',
        'When your images are ready, approve them one by one, or ask for one revision round.',
        'Under Your look you fix your background, aspect ratio and model for every next order.',
      ],
    },
    levering: 'Tip: approve your images one by one. Is something not right? Ask for one revision round: everything you want changed, in one go.',
    abonnement: 'Tip: while your plan runs, you save up to three months of credits. You order through the usual form and pay with credits in step 5.',
    privelink: 'Tip: this link opens your order without signing in. Only share it with people you trust.',
  },
};

/** De weggeklikte tips uit een cookiekop: een Set met bekende ids. */
export function tipsUitCookie(cookieKop, naam) {
  const m = new RegExp(`(?:^|;\\s*)${naam}=([a-z,]{1,200})(?:;|$)`).exec(String(cookieKop || ''));
  return new Set((m ? m[1].split(',') : []).filter((x) => TIP_IDS.includes(x)));
}
