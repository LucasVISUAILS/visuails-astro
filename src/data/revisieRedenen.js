/* ── DRIE VASTE REDENEN VOOR "GEEN NIEUW BEELD NODIG" — 8 oktober 2026 ───────
 * Punt 4.08, V37 = a. Op een revisiekaart in /admin vult één klik op een van
 * deze drie het redenveld, in de taal van de klant; Lucas kan de tekst daarna
 * aanpassen voor hij op "Geen nieuw beeld nodig" drukt. De tekst gaat letterlijk
 * naar de klant: in de mail "Antwoord op je revisie" en op zijn tijdlijn.
 *
 * CONCEPT. Geschreven bij de bouw, door Lucas na te kijken (teksten/d4.md).
 * Vervangen is dit bestand aanpassen en verder niets: `knop` is het etiket in
 * /admin (alleen Nederlands), `nl` en `en` zijn wat de klant leest. Hooguit
 * ANNOUNCE_NOTE_MAX (400) tekens; tests/revisie-redenen.test.mjs controleert
 * dat, en dat er geen ik-vorm in staat.
 *
 * Ze volgen het revisiebeleid (REVISIEBELEID in src/data/pricing.js): een fout
 * van ons lossen we op; wat geen fout is, zeggen we rustig, met de reden.
 */
export const REVISIE_REDENEN = Object.freeze([
  {
    id: 'kleur',
    knop: 'Kleur en details kloppen',
    nl: 'We hebben het beeld naast je eigen foto’s en de kleur die je opgaf gelegd. Kleur en details komen overeen, daarom blijft dit beeld zoals het is.',
    en: 'We compared the image with your own photos and the colour you gave us. The colour and details match, so this image stays as it is.',
  },
  {
    id: 'product',
    knop: 'Hoort bij het product',
    nl: 'Wat je aanmerkt, zit ook op het product zelf: we zien het terug op je eigen foto’s. We laten het staan, zodat het beeld laat zien wat je klant ontvangt.',
    en: 'What you flagged is part of the product itself: it shows on your own photos too. We are keeping it, so the image shows what your customer receives.',
  },
  {
    id: 'keuze',
    knop: 'Andere keuze dan besteld',
    nl: 'Het beeld volgt de keuzes van deze bestelling: de look, de achtergrond en de verhouding. Wil je een andere keuze, dan is dat een nieuw beeld en geen revisie; dat maken we graag in een nieuwe bestelling.',
    en: 'The image follows the choices in this order: the look, the background and the ratio. A different choice means a new image rather than a revision; we are happy to make it in a new order.',
  },
]);

/** De tekst van een reden in de taal van de klant ('en' of anders Nederlands), of ''. */
export function revisieReden(id, lang = 'nl') {
  const r = REVISIE_REDENEN.find((x) => x.id === id);
  if (!r) return '';
  return lang === 'en' ? r.en : r.nl;
}
