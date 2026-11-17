/*
 * VISUAILS — welk stuk van het doek een kaart krijgt (levering 115, 17 november 2026; src/styles/kaart-115.css).
 * Op volgorde in de pagina: de eerste kaart stuk 0, de tweede stuk 1, … na acht weer van voren. Zo heeft elke kaart op een
 * pagina een eigen stuk van hetzelfde doek. Opnieuw bij een zachte navigatie. Vervangt kaartveld.js (het WebGL-veld).
 */
const KAART_SEL = '[data-kaart], .h-proef > .h-proef-woord, .h-lk-slot, .site-footer .sb, .h-gd-brief, .h-nf-getal, .r105-slotkaart';
function zet() {
  [...document.querySelectorAll(`body.hal :is(${KAART_SEL})`)].forEach((k, i) => { k.dataset.stuk = String(i % 8); });
}
zet();
document.addEventListener('astro:page-load', zet);
