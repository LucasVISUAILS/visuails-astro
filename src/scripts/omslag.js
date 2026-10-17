/**
 * VISUAILS — het getal slaat om als een stationsbord (levering 55, 17 oktober 2026).
 *
 * Afvinklijst 34, b-getal "doen": niet optellen en niet uit een waas komen, maar
 * een paar willekeurige standen en dan het echte getal. Elk cijfer stopt op zijn
 * eigen tik (na 2 tot 5), zoals de vakjes van een bord; de leestekens (€ . – +)
 * blijven staan. Zes tikken, samen ongeveer een halve seconde.
 *
 * De echte tekst blijft in de pagina staan (voor schermlezers, zoekmachines en de
 * tests): hij wordt alleen even doorzichtig, en de omslaande standen staan in
 * ::after (data-h-stand). Een getal dat over twee regels loopt, slaat niet om.
 * Bij "minder beweging" roept niemand dit aan.
 */
const TIKKEN = 6;

export function slaOm(el, vertraging = 0) {
  if (!el || el.dataset.hOm) return;
  el.dataset.hOm = '1';
  const echt = el.textContent || '';
  const plekken = [];
  [...echt].forEach((t, i) => { if (t >= '0' && t <= '9') plekken.push(i); });
  if (!plekken.length || el.getClientRects().length !== 1) return;
  const stop = plekken.map(() => 2 + Math.floor(Math.random() * 4));
  let tik = 0;
  const volgende = () => {
    if (tik >= TIKKEN) {
      el.classList.remove('h-slaat');
      el.removeAttribute('data-h-stand');
      return;
    }
    const tekens = [...echt];
    plekken.forEach((p, k) => { if (tik < stop[k]) tekens[p] = String(Math.floor(Math.random() * 10)); });
    el.setAttribute('data-h-stand', tekens.join(''));
    tik += 1;
    setTimeout(volgende, tik < 3 ? 70 : 120);
  };
  setTimeout(() => { el.classList.add('h-slaat'); volgende(); }, vertraging);
}

/* Alle getallen in een blok dat net binnenkomt. */
export function slaOmIn(blok) {
  const d = Number(getComputedStyle(blok).getPropertyValue('--d')) || 0;
  const getallen = blok.matches('.h-getal') ? [blok] : [...blok.querySelectorAll('.h-getal')];
  for (const g of getallen) slaOm(g, 250 + d * 90);
}
