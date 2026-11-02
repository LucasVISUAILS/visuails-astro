/* VISUAILS — de galerij van de voorpagina (levering 80, 1 november 2026; HalGalerij80.astro).
   ═══════════════════════════════════════════════════════════════════════════════
   Twee rijen die tegen elkaar in schuiven, alleen als jij scrolt of een rij opzij sleept.

   DE VAART (per beeld van 60 Hz, dt-gecorrigeerd):
   - s = hoeveel de pagina dit beeld scrolde (px);
   - de gewenste vaart is s × 0,6 × (1 + |s| / 30): wie twee keer zo hard scrolt, gaat ruim twee keer zo
     snel ("hoe harder je scrollt hoe sneller de foto's voorbij vliegen"), hoogstens 140 px per beeld;
   - de echte vaart ijlt na: hij komt elk beeld 12 % dichter bij de gewenste. Stopt het scrollen, dan
     lopen de rijen in ± 0,4 s uit;
   - de veeg (de foto horizontaal onscherp) komt erover vanaf 10 px per beeld en dekt bij 40 px 92 %.
   Een rij opzij slepen neemt hem mee; loslaten gooit hem door met de vaart van de laatste beelden.

   Nooit vanzelf: zonder scrollen of slepen staan de rijen stil. Minder beweging: geen script (de rijen
   zijn dan om zelf opzij te scrollen, galerij-80.css).
   ═══════════════════════════════════════════════════════════════════════════════ */

const K = 0.6, B = 30, MAX = 140, NAIJL = 0.12;
const VEEG_VAN = 10, VEEG_TOT = 40, VEEG_MAX = 0.92;
const golfUit = (t) => 1 - Math.pow(1 - t, 4);   /* zo goed als cubic-bezier(.16, 1, .3, 1) */

export function galerij(root) {
  if (!root || matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};
  const rijen = [...root.querySelectorAll('[data-g8-rij]')].map((el, r) => ({
    el, r, baan: el.querySelector('[data-g8-baan]'), S: 0, x0: 0,
  }));
  if (!rijen.length) return () => {};
  root.classList.add('g8-aan');

  let off = 0, v = 0, y = scrollY, raf = 0, t0 = 0, dichtbij = false, vaart = false;

  let veegNu = '';
  let sleep = null, tween = null, klikWeg = false;

  /* de breedte van één set, en genoeg kopieën om de rij altijd te vullen */
  function meet() {
    for (const rij of rijen) {
      const tegels = [...rij.baan.children];
      const n = tegels.filter((t) => !t.hasAttribute('data-g8-kopie')).length;
      if (!n || tegels.length < 2 * n) continue;
      rij.S = tegels[n].offsetLeft - tegels[0].offsetLeft;
      if (rij.S <= 0) continue;
      const nodig = Math.ceil((rij.el.clientWidth + rij.S) / rij.S) + 1;
      for (let sets = tegels.length / n; sets < nodig; sets++) {
        for (const t of tegels.slice(0, n)) {
          const c = t.cloneNode(true);
          c.setAttribute('data-g8-kopie', ''); c.setAttribute('aria-hidden', 'true'); c.setAttribute('tabindex', '-1');
          c.removeAttribute('aria-label'); c.querySelector('picture img')?.setAttribute('alt', '');
          rij.baan.appendChild(c);
        }
      }
      /* rij 2 begint een eind verder, zodat de beelden niet boven elkaar beginnen */
      rij.x0 = rij.r % 2 ? rij.S * 0.37 : rij.S * 0.08;
    }
    zet();
  }

  function zet() {
    for (const rij of rijen) {
      if (!rij.S) continue;
      const x = (rij.r % 2 ? -off : off) + rij.x0;
      const pos = ((x % rij.S) + rij.S) % rij.S;
      rij.baan.style.transform = `translate3d(${(-pos).toFixed(2)}px,0,0)`;
    }
    const a = Math.abs(v);
    const veeg = Math.min(VEEG_MAX, Math.max(0, (a - VEEG_VAN) / (VEEG_TOT - VEEG_VAN)) * VEEG_MAX);
    /* levering 83 (lijst 68, de meting): alleen zetten als hij verandert. --g8-veeg erft naar elk beeld in de
       galerij; elke keer zetten liet de browser elke beeldverversing de stijl van de hele galerij opnieuw
       uitrekenen, ook als de veeg gewoon 0 bleef. */
    const veegT = veeg.toFixed(3);
    if (veegT !== veegNu) { veegNu = veegT; root.style.setProperty('--g8-veeg', veegT); }
    const nu = a > 14;
    if (nu !== vaart) { vaart = nu; root.classList.toggle('is-vaart', nu); }
  }

  function tik(t) {
    raf = 0;
    const dt = t0 ? Math.min(4, (t - t0) / 16.667) : 1;
    t0 = t;
    const ny = scrollY, dy = ny - y;
    y = ny;
    if (tween) {
      const p = Math.min(1, (t - tween.t) / tween.duur);
      off = tween.van + (tween.naar - tween.van) * golfUit(p);
      v = 0;
      if (p >= 1) tween = null;
    } else if (!sleep) {
      const s = dy / dt;
      const doel = Math.max(-MAX, Math.min(MAX, s * K * (1 + Math.abs(s) / B)));
      v += (doel - v) * (1 - Math.pow(1 - NAIJL, dt));
      off += v * dt;
    }
    zet();
    if (tween || sleep || dy !== 0 || Math.abs(v) > 0.02) raf = requestAnimationFrame(tik);
    else { t0 = 0; v = 0; zet(); }
  }
  const wek = () => { if (!raf) raf = requestAnimationFrame(tik); };
  const opScroll = () => { if (dichtbij) wek(); else y = scrollY; };

  /* slepen (muis en vinger; verticaal scrollen blijft van de pagina: touch-action pan-y) */
  function omlaag(e, rij) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    sleep = null; tween = null;
    const start = { x: e.clientX, y: e.clientY, off, rij, id: e.pointerId, bewogen: false, laatst: [[e.timeStamp, e.clientX]] };
    const dir = rij.r % 2 ? -1 : 1;
    const mee = (ev) => {
      if (ev.pointerId !== start.id) return;
      const dx = ev.clientX - start.x, dyy = ev.clientY - start.y;
      if (!start.bewogen) {
        if (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(dyy)) return;
        start.bewogen = true; sleep = start; v = 0;
        try { rij.el.setPointerCapture(ev.pointerId); } catch {}
        rij.el.classList.add('is-slepen');
      }
      off = start.off - dx * dir;
      start.laatst.push([ev.timeStamp, ev.clientX]);
      if (start.laatst.length > 6) start.laatst.shift();
      wek();
    };
    const los = (ev) => {
      if (ev.pointerId !== start.id) return;
      removeEventListener('pointermove', mee); removeEventListener('pointerup', los); removeEventListener('pointercancel', los);
      rij.el.classList.remove('is-slepen');
      if (!start.bewogen) return;
      /* doorgooien: de vaart van de laatste ± 80 ms, in px per beeld van 60 Hz */
      const l = start.laatst, [ta, xa] = l[0], [tb, xb] = l[l.length - 1];
      const per = tb > ta ? ((xb - xa) / (tb - ta)) * 16.667 : 0;
      v = Math.max(-MAX, Math.min(MAX, -per * dir));
      sleep = null; klikWeg = ev.type === 'pointerup';
      setTimeout(() => { klikWeg = false; }, 0);
      wek();
    };
    addEventListener('pointermove', mee, { passive: true });
    addEventListener('pointerup', los); addEventListener('pointercancel', los);
  }
  /* na een sleep geen klik op het beeld eronder */
  const opKlik = (e) => { if (klikWeg) { e.preventDefault(); e.stopPropagation(); klikWeg = false; } };

  /* met de toets naar een beeld dat buiten de rij staat: de rij glijdt het in beeld */
  function opFocus(e) {
    const tegel = e.target.closest?.('.g8-tegel');
    if (!tegel) return;
    const rij = rijen.find((x) => x.el.contains(tegel));
    if (!rij) return;
    const R = rij.el.getBoundingClientRect(), T = tegel.getBoundingClientRect();
    const m = Math.max(20, Math.min(innerWidth * 0.08333, 160));
    let d = 0;
    if (T.left < R.left + m) d = T.left - (R.left + m);
    else if (T.right > R.right - m) d = T.right - (R.right - m);
    if (!d) return;
    const van = off, naar = off + (rij.r % 2 ? -d : d);
    tween = { van, naar, t: performance.now(), duur: 600 };
    wek();
  }

  /* dichtbij: pas dan alle beelden laden (de kopieën en de veeg), en pas dan meebewegen */
  const io = new IntersectionObserver((items) => {
    for (const it of items) {
      dichtbij = it.isIntersecting;
      if (dichtbij) {
        y = scrollY;
        root.querySelectorAll('img[loading="lazy"]').forEach((img) => { img.loading = 'eager'; });
      }
    }
  }, { rootMargin: '600px 0px' });
  io.observe(root);

  const ro = new ResizeObserver(() => meet());
  ro.observe(root);
  const af = [];
  for (const rij of rijen) {
    const f = (e) => omlaag(e, rij);
    rij.el.addEventListener('pointerdown', f);
    af.push(() => rij.el.removeEventListener('pointerdown', f));
  }
  root.addEventListener('click', opKlik, true);
  root.addEventListener('focusin', opFocus);
  root.addEventListener('dragstart', (e) => e.preventDefault());
  addEventListener('scroll', opScroll, { passive: true });
  meet();

  return () => {
    cancelAnimationFrame(raf); raf = 0;
    io.disconnect(); ro.disconnect();
    af.forEach((f) => f());
    root.removeEventListener('click', opKlik, true);
    root.removeEventListener('focusin', opFocus);
    removeEventListener('scroll', opScroll);
    root.classList.remove('g8-aan', 'is-vaart');
  };
}
