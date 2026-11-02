/* VISUAILS — het licht in het glas van de balk (levering 80, 1 november 2026).
   Lucas, 17:05: "Ik wil de top bar een soort liquid glass gevoel en look geven met animaties tijdens
   het scrollen in het glas maar heel subtiel houden en smooth."
   Eén zachte lichtvlek (de Wit-fade) die met het scrollen door het glas schuift en even na-ijlt:
   doel = 18 % + (scrollY × 0,12) mod 64 %, elke beeldverversing 12 % dichterbij (lerp 0,12).
   Alleen een CSS-variabele (--lx) op de balk; bij "minder beweging" staat hij stil. Geen luisteraar
   die blijft lopen: de lus stopt zodra de vlek op zijn plek is. */
let lx = 30, doel = 30, loopt = false, balk = null;
const stil = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
function stap() {
  lx += (doel - lx) * 0.12;
  balk?.style.setProperty('--lx', `${lx.toFixed(2)}%`);
  if (Math.abs(doel - lx) > 0.05) requestAnimationFrame(stap); else loopt = false;
}
function opScroll() {
  if (stil() || !balk) return;
  doel = 18 + ((window.scrollY * 0.12) % 64);
  if (!loopt) { loopt = true; requestAnimationFrame(stap); }
}
function start() {
  balk = document.querySelector('body.hal .site-header');
  if (balk) balk.style.setProperty('--lx', `${lx.toFixed(2)}%`);
}
window.addEventListener('scroll', opScroll, { passive: true });
start();
document.addEventListener('astro:page-load', start);
