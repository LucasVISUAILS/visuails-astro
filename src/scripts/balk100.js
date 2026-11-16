/*
 * VISUAILS — de balk klapt weg bij scrollen naar beneden en valt terug bij scrollen naar boven (levering 100, Lucas 14 nov, 16:42:
 * "als je doorscrollt naar de footer, dat de top bar verdwijnt/inklapt, en als je weer omhoog scrollt weer uitklapt en zichtbaar
 * wordt. Beide met unieke gravity achtige animatie").
 *
 * WEG: de balk zakt eerst 3 px (hij zet zich af), en schiet dan versnellend omhoog uit beeld, alsof hij wordt weggetrokken (520 ms).
 * TERUG: hij valt van boven in, versnellend als een vallend voorwerp, schiet 7 px door, veert één keer terug en ligt stil (660 ms).
 * Hij blijft staan: bovenaan de pagina (de eerste 120 px), als er een menu open is, als de toets erin staat (focus), en zolang de
 * muis erop staat. Bij minder beweging verschijnt en verdwijnt hij zonder beweging.
 */
const kop = document.querySelector('body.hal .site-header');
const balk = kop?.querySelector('.container.nav');
if (kop && balk) {
  const rustig = matchMedia('(prefers-reduced-motion: reduce)');
  const WEG = 'translateY(calc(-100% - 40px))';
  let weg = false, vorige = scrollY, som = 0, anim = null, muisErop = false;

  const menuOpen = () => !!kop.querySelector('[aria-expanded="true"]') || document.documentElement.classList.contains('menu-open') || !!document.querySelector('.mobile-nav.open, .mobile-nav[aria-hidden="false"]');

  function zet(nieuw) {
    if (nieuw === weg) return;
    weg = nieuw;
    kop.dataset.balk = weg ? 'weg' : 'er';
    anim?.cancel();
    if (rustig.matches || !balk.animate) { balk.style.transform = weg ? WEG : ''; return; }
    if (weg) {
      anim = balk.animate([
        { transform: 'translateY(0)', easing: 'cubic-bezier(.3, 0, .5, 1)' },
        { transform: 'translateY(3px)', offset: .16, easing: 'cubic-bezier(.55, 0, .9, .45)' },
        { transform: WEG },
      ], { duration: 520, fill: 'forwards' });
    } else {
      anim = balk.animate([
        { transform: WEG, easing: 'cubic-bezier(.5, 0, .85, .55)' },
        { transform: 'translateY(7px)', offset: .62, easing: 'cubic-bezier(.2, .7, .4, 1)' },
        { transform: 'translateY(-2px)', offset: .84, easing: 'cubic-bezier(.4, 0, .6, 1)' },
        { transform: 'translateY(0)' },
      ], { duration: 660, fill: 'forwards' });
    }
    anim.onfinish = () => { balk.style.transform = weg ? WEG : ''; anim?.cancel(); anim = null; };
  }

  addEventListener('scroll', () => {
    const y = scrollY, d = y - vorige; vorige = y;
    if (y < 120 || menuOpen() || muisErop || kop.contains(document.activeElement) && document.activeElement !== document.body) { som = 0; zet(false); return; }
    som = Math.sign(d) === Math.sign(som) ? som + d : d;
    if (som > 12) zet(true);
    else if (som < -12) zet(false);
  }, { passive: true });
  kop.addEventListener('focusin', () => zet(false));
  balk.addEventListener('pointerenter', () => { muisErop = true; });
  balk.addEventListener('pointerleave', () => { muisErop = false; });
  /* bovenin het venster met de muis (de balk is weg): hij komt terug, zodat hij met de muis altijd te vinden is */
  addEventListener('pointermove', (e) => { if (weg && e.pointerType === 'mouse' && e.clientY < 24) zet(false); }, { passive: true });
}
