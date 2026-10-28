/**
 * VISUAILS — de gloed op de tweede toon van een kop (levering 78, 27 oktober 2026).
 *
 * Lucas, 16:50: "af en toe komt een hele langzame maar intense 'blue hour' gloed om het woord te
 * citeren, maar het moet de lezer niet afleiden en heel subtiel zijn en laten zien dat de tekst
 * belangrijk is in de desbetreffende sectie."
 *
 * Af en toe, en nooit twee tegelijk: van de tweede tonen (.h-kop .l) die voor minstens 60 % in
 * beeld zijn, krijgt degene die het dichtst bij het midden van het scherm staat .is-gloeit (de
 * beweging van 4,8 s staat in hal.css, "DE GLOED OP DE TWEEDE TOON"). Elke kop gloeit hoogstens één
 * keer per bezoek aan de pagina; daarna 9 – 13 s niets tot de volgende. Zo duurt niets langer dan
 * 5 s en herhaalt niets zich vanzelf (WCAG 2.2.2, dezelfde reden als het accentwoord van 25 oktober:
 * "één keer, dan stil").
 * Niets beweegt bij het laden: pas na de eerste beweging van de bezoeker (muis, toets, aanraking,
 * wiel), en dan 1,5 s later. Niet bij "minder beweging" of hoog contrast, niet als het tabblad
 * verborgen is. Geen luisteraar op window (tests/zachte-navigatie): een IntersectionObserver,
 * luisteraars op document die stopGloed weer weghaalt, een klok en astro:before-swap.
 */
let klok = 0;
let io = null;
let bewogen = null;
const EERST = ['pointermove', 'keydown', 'touchstart', 'wheel'];

export function gloed() {
  stopGloed();
  if (typeof IntersectionObserver === 'undefined') return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || matchMedia('(forced-colors: active)').matches) return;
  const tonen = [...document.querySelectorAll('.h-kop .l')];
  if (!tonen.length) return;
  const inBeeld = new Set();
  const gehad = new WeakSet();
  let wakker = false;
  const plan = (ms) => { clearTimeout(klok); klok = window.setTimeout(tik, ms); };
  const tik = () => {
    klok = 0;
    if (document.visibilityState !== 'visible') { plan(3000); return; }
    const midden = window.innerHeight / 2;
    let beste = null, afstand = Infinity;
    for (const t of inBeeld) {
      if (!t.isConnected) { inBeeld.delete(t); continue; }
      if (gehad.has(t)) continue;
      const r = t.getBoundingClientRect();
      const d = Math.abs(r.top + r.height / 2 - midden);
      if (d < afstand) { afstand = d; beste = t; }
    }
    if (!beste) return;                               // niets nieuws in beeld: wacht op de observer
    gehad.add(beste);
    beste.classList.remove('is-gloeit');
    void beste.offsetWidth;
    beste.classList.add('is-gloeit');
    beste.addEventListener('animationend', () => beste.classList.remove('is-gloeit'), { once: true });
    plan(4800 + 9000 + Math.random() * 4000);
  };
  const misschien = () => { if (wakker && !klok && [...inBeeld].some((t) => !gehad.has(t))) plan(1500); };
  io = new IntersectionObserver((rijen) => {
    for (const r of rijen) {
      if (r.intersectionRatio >= 0.6) inBeeld.add(r.target); else inBeeld.delete(r.target);
    }
    misschien();
  }, { threshold: [0, 0.6, 1] });
  tonen.forEach((t) => io.observe(t));
  bewogen = () => {
    EERST.forEach((s) => document.removeEventListener(s, bewogen));
    bewogen = null; wakker = true; misschien();
  };
  EERST.forEach((s) => document.addEventListener(s, bewogen, { passive: true }));
}

export function stopGloed() {
  clearTimeout(klok); klok = 0;
  io?.disconnect(); io = null;
  if (bewogen) { EERST.forEach((s) => document.removeEventListener(s, bewogen)); bewogen = null; }
  document.querySelectorAll('.h-kop .l.is-gloeit').forEach((t) => t.classList.remove('is-gloeit'));
}
