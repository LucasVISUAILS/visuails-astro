/* ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
   DE LIFESTYLEANIMATIE OP DE KAART LIFESTYLE — levering 99, 13 november 2026 (lijst 100, A2 a)
   Lucas (21:48): "Ik wil dat lifestyle ook een vergelijkbare animatie krijgt als catalog maar dan met het instagram
   voorbeeld die ook op de laptop staat, bedenk hoe dit duidelijk word overgebracht naar de klant." Lijst 100 A2 a, met zijn
   notitie: de telefoonclip voor het begin, en de animatie speelt pas als je op de kaart staat met de muis.
   Dezelfde opbouw als de catalogusanimatie (catalogkaart96.js), zodat de twee kaarten één taal spreken:
     0 – 2,75 s   de telefoonclip: een hand maakt een foto van de hoodie (clip-hoodie.mp4)
     dan, de tijdlijn (T = 11 s, dan opnieuw vanaf de clip):
     0 – 1,7 s    de clip loopt door tot net voor de sluiter
     1,55 – 2,3 s de flits; uit het wit komt de foto op model, het hele vlak, met het hoekje "Lifestyle"
     3,4 – 4,3 s  de foto krimpt in een bericht van NON/STD (de kop met het rondje en de naam, eronder het hartje en
                  de stipjes) — hetzelfde bericht als in de laptop op /lifestyle
     5,0 / 6,6 s  hij veegt door naar de jeans en de sokken; het stipje loopt mee
     8,0 s        een dubbeltik: een groot hart op de foto, het hartje onder het bericht wordt vol, de teller +1
     10,6 – 11 s  weg in wit
   Alles met transform en opacity; bij minder beweging speelt hij niet (dan staat de foto van de kaart er).
   ═══════════════════════════════════════════════════════════════════════════════════════════════════════════ */
const T = 11000;
const INTRO = 2750;
const E = 'cubic-bezier(.22, 1, .36, 1)';
const HART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.1 4.3 2.4h2c.7-1.3 2.2-2.4 4.3-2.4 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z"/></svg>';

/** @param {HTMLElement} laag  @param {{v?:string, clip:string, fotos:{src:string,alt?:string}[], account:string, likes:number, woorden:{life:string,feed:string}}} d */
export function lifestyleKaart(laag, d) {
  let klok = 0, gebouwd = false, aan = false, clip = null;
  const v = d.v ? `?v=${d.v}` : '';
  const pic = (src) => `<picture><source type="image/avif" srcset="${src}.avif${v}"><img src="${src}.webp${v}" alt="" decoding="async"></picture>`;
  const getal = (n) => n.toLocaleString(document.documentElement.lang === 'nl' ? 'nl-NL' : 'en-GB');
  function bouw() {
    laag.innerHTML = `<video class="c96-clip" muted playsinline preload="none" poster="${d.clip}.webp${v}"></video>`
      + `<div class="l99-post"><p class="l99-kop"><i></i><b>${d.account}</b></p>`
      + `<div class="l99-raam"><div class="l99-rol">${d.fotos.map((f) => `<div class="l99-f">${pic(f.src)}</div>`).join('')}</div><span class="l99-groothart">${HART}</span></div>`
      + `<p class="l99-voet"><span class="l99-hart">${HART}</span><span class="l99-tel">${getal(d.likes)}</span><span class="l99-stip">${d.fotos.map(() => '<i></i>').join('')}</span></p></div>`
      + `<span class="c96-lbl"></span><span class="c96-flits"></span>`;
    clip = laag.querySelector('.c96-clip');
    gebouwd = true;
  }
  function stop() {
    aan = false; clearTimeout(klok);
    laag.getAnimations({ subtree: true }).forEach((a) => a.cancel());
    laag.classList.remove('c96-aan');
    if (clip) clip.pause();
  }
  function speel() { if (aan) return; aan = true; intro(); }
  function intro() {
    if (!aan) return;
    laag.getAnimations({ subtree: true }).forEach((a) => a.cancel());
    if (!gebouwd) bouw();
    laag.classList.add('c96-aan');
    laag.classList.remove('l99-ronde');
    if (!clip.src) clip.src = `${d.clip}.mp4${v}`;
    try { clip.currentTime = 0; } catch { /* nog niet geladen */ }
    let begonnen = false;
    const ga = () => { if (begonnen || !aan) return; begonnen = true; klok = setTimeout(ronde, INTRO); };
    clip.addEventListener('playing', ga, { once: true });
    clip.play().catch(() => { begonnen = true; ronde(); });
  }
  function ronde() {
    if (!aan) return;
    laag.getAnimations({ subtree: true }).forEach((a) => a.cancel());
    laag.classList.add('l99-ronde');
    const q = (s) => laag.querySelector(s);
    const f = (ms) => ms / T;
    const anim = (el, kf) => el.animate(kf, { duration: T, fill: 'both', easing: 'linear' });
    const post = q('.l99-post'), raam = q('.l99-raam'), rol = q('.l99-rol');
    const W = laag.clientWidth, H = laag.clientHeight;
    /* de clip tot de flits */
    anim(clip, [{ opacity: 1, offset: 0 }, { opacity: 1, offset: f(1700) }, { opacity: 0, offset: f(1720) }, { opacity: 0, offset: 1 }]);
    anim(q('.c96-flits'), [{ opacity: 0, offset: 0 }, { opacity: 0, offset: f(1550) }, { opacity: 1, offset: f(1720), easing: 'ease-out' }, { opacity: 0, offset: f(2300) }, { opacity: 0, offset: 1 }]);
    /* het bericht: eerst zo groot dat de foto het hele vlak vult (kop en voet buiten beeld), dan krimpt hij tot het bericht */
    const rr = raam.getBoundingClientRect(), lr = laag.getBoundingClientRect(), k = lr.width / W || 1;
    const s0 = Math.max(W / (rr.width / k), H / (rr.height / k));
    const cx = (rr.left - lr.left + rr.width / 2) / k, cy = (rr.top - lr.top + rr.height / 2) / k;
    const vol = `translate(${(W / 2 - cx).toFixed(1)}px, ${(H / 2 - cy).toFixed(1)}px) scale(${s0.toFixed(3)})`;
    anim(post, [{ opacity: 0, transform: vol, offset: 0 }, { opacity: 0, transform: vol, offset: f(1700) }, { opacity: 1, transform: vol, offset: f(1720) },
      { opacity: 1, transform: vol, offset: f(3400), easing: E }, { opacity: 1, transform: 'none', offset: f(4300) },
      { opacity: 1, transform: 'none', offset: f(10600) }, { opacity: 0, transform: 'none', offset: f(11000) }]);
    /* de kop en de voet van het bericht komen pas als hij krimpt */
    for (const s of ['.l99-kop', '.l99-voet']) anim(q(s), [{ opacity: 0, offset: 0 }, { opacity: 0, offset: f(3700) }, { opacity: 1, offset: f(4300) }, { opacity: 1, offset: 1 }]);
    /* doorvegen */
    const n = d.fotos.length, stap = (i) => `translateX(${(-100 * i / n).toFixed(4)}%)`;
    const kf = [{ transform: stap(0), offset: 0 }, { transform: stap(0), offset: f(5000), easing: E }, { transform: stap(1), offset: f(5600) }];
    if (n > 2) kf.push({ transform: stap(1), offset: f(6600), easing: E }, { transform: stap(2), offset: f(7200) });
    kf.push({ transform: stap(Math.min(2, n - 1)), offset: 1 });
    anim(rol, kf);
    laag.querySelectorAll('.l99-stip i').forEach((st, i) => {
      const aanT = i === 0 ? 0 : i === 1 ? 5300 : 6900, uitT = i === 0 ? 5300 : i === 1 ? 6900 : 99999;
      anim(st, [{ opacity: .35, offset: 0 }, ...(i === 0 ? [{ opacity: 1, offset: 0.001 }] : [{ opacity: .35, offset: f(aanT - 1) }, { opacity: 1, offset: f(aanT) }]),
        ...(uitT < T ? [{ opacity: 1, offset: f(uitT - 1) }, { opacity: .35, offset: f(uitT) }] : []), { opacity: uitT < T ? .35 : 1, offset: 1 }]);
    });
    /* de dubbeltik */
    anim(q('.l99-groothart'), [{ opacity: 0, transform: 'scale(.4)', offset: 0 }, { opacity: 0, transform: 'scale(.4)', offset: f(8000) }, { opacity: 1, transform: 'scale(1.08)', offset: f(8250), easing: E },
      { opacity: 1, transform: 'scale(1)', offset: f(8600) }, { opacity: 0, transform: 'scale(1)', offset: f(9300) }, { opacity: 0, offset: 1 }]);
    const hart = q('.l99-hart');
    anim(hart, [{ transform: 'scale(1)', offset: 0 }, { transform: 'scale(1)', offset: f(8100) }, { transform: 'scale(1.25)', offset: f(8250) }, { transform: 'scale(1)', offset: f(8450) }, { transform: 'scale(1)', offset: 1 }]);
    const tel = q('.l99-tel');
    tel.textContent = getal(d.likes); hart.classList.remove('l99-vol');
    setTimeout(() => { if (aan) { tel.textContent = getal(d.likes + 1); hart.classList.add('l99-vol'); } }, 8150);
    /* het hoekje */
    const lbl = q('.c96-lbl');
    anim(lbl, [{ opacity: 0, offset: 0 }, { opacity: 0, offset: f(1800) }, { opacity: 1, offset: f(2100) }, { opacity: 1, offset: f(3300) }, { opacity: 0, offset: f(3500) },
      { opacity: 0, offset: f(4400) }, { opacity: 1, offset: f(4700) }, { opacity: 1, offset: f(10400) }, { opacity: 0, offset: f(10700) }, { opacity: 0, offset: 1 }]);
    lbl.textContent = d.woorden.life;
    setTimeout(() => { if (aan) lbl.textContent = d.woorden.feed; }, 4000);
    klok = setTimeout(() => { if (aan) intro(); }, T);
  }
  return { speel, stop };
}
