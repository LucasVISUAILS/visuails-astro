/* ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
   DE CATALOGUSANIMATIE OP DE KAART PRODUCTFOTO'S — levering 96, 13 november 2026 (lijst 96 C1 b, lijst 98)
   Lucas (lijst 96): de hoodie begint groot en wordt een catalogus van zes, met herkleuringen; een cursor klikt op de pijl
   voor voorkant, achterkant en detail. (04:14): "eerst een foto … die word gemaakt van de blauwe hoodie en dan smooth flitst
   naar de hoodie met witte achtergrond … Zo laat je dus het proces kort zien wat de klant kan verwachten." (lijst 98, A2 a,
   met zijn notitie en een voorbeeld van een webshop op de telefoon): "de catalogus wel wat meer persoonlijkheid geven":
   twee kolommen, de naam in hoofdletters in een typemachineletter met veel ruimte tussen de letters, de prijs met "EUR",
   een zwarte balk "Bekijk alles" zonder ronding, en veel lucht.

   DE TIJDLIJN (12 s, dan opnieuw):
   0 – 1,7 s    de telefoonfoto van de hoodie, met de hoekjes van een zoeker en de sluiterknop (die bij 1,45 s indrukt)
   1,55 – 2,3 s de flits: wit in 0,17 s, dan zacht weg; uit het wit komt de hoodie op de grond
   2,6 – 3,4 s  de hoodie schuift naar zijn vak in de catalogus; 3,3 – 4,4 s de andere vijf, een voor een, met naam en prijs
   4,7 – 5,8 s  de catalogus scrollt omhoog tot de balk "Bekijk alles"; 6,2 – 6,9 s terug; 6,9 – 7,6 s de hoodie komt weer groot
   7,6 – 11,6 s de pijl; de cursor klikt twee keer (8,4 en 10,0 s): achterkant, dan detail
   Alles met transform en opacity. Bij minder beweging speelt hij niet (dan staat de hoodie er, zoals zonder script).

   LEVERING 99 (13 november 2026, lijst 100 A2 met Lucas' notitie: "Eventueel handig om de telefoon video te gebruiken voor
   het telefoon shot bij catalog, hooks en lifestyle, en dat de animatie pas afspeelt als je op de kaart hovert"):
   - het begin is nu de telefoonclip met de hoodie (public/img/hal/telefoon/clip-hoodie.mp4, gemaakt met
     kladblok/levering-95/telefoonclip/maak.py uit dezelfde clip als de jeans en de sokken). De tijdlijn hierboven begint
     2,75 s in de clip, zodat de flits (1,55 s) valt op het moment dat de sluiter in de clip gaat (4,3 s). Zonder clip
     (of als afspelen niet mag) begint hij met de telefoonfoto, zoals in levering 96;
   - wanneer hij speelt beslist HalMaken80.astro: met een muis alleen onder de muis, op een telefoon als de kaart gekozen is.
   ═══════════════════════════════════════════════════════════════════════════════════════════════════════════ */
const T = 12000;
const E = 'cubic-bezier(.22, 1, .36, 1)';
const PIJL = '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="m5 2 5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
const MUIS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 2l15 11-6.5 1.2L16 21l-3 1.4-3.4-6.7L4 20z" fill="#090D0B" stroke="#fff" stroke-width="1.4"/></svg>';

/** @param {HTMLElement} laag  @param {{v?:string, clip?:string, foto:string, voor:string, achter:string, detail:string, zes:{src:string,naam:string,prijs:string}[], woorden:{voor:string,cat:string,achter:string,detail:string,alles:string}}} d */
export function catalogKaart(laag, d) {
  let klok = 0, gebouwd = false, aan = false;
  const v = d.v ? `?v=${d.v}` : '';
  const pic = (src, klasse = '') => `<picture${klasse ? ` class="${klasse}"` : ''}><source type="image/avif" srcset="${src}.avif${v}"><img src="${src}.webp${v}" alt="" decoding="async"></picture>`;
  const INTRO = 2750;
  let clip = null;
  function bouw() {
    laag.innerHTML = (d.clip ? `<video class="c96-clip" muted playsinline preload="none" poster="${d.clip}.webp${v}"></video>` : `${pic(d.foto, 'c96-foto')}<span class="c96-zoeker"><i></i><i></i><i></i><i></i></span><span class="c96-sluiter"></span>`)
      + `<div class="c96-vel"><div class="c96-raster">${d.zes.map((p, i) => `<div class="c96-p" data-i="${i}"><div class="c96-b">${pic(p.src)}</div><p class="c96-n">${p.naam}</p><p class="c96-e">${p.prijs}</p></div>`).join('')}</div>`
      + `<p class="c96-alles">${d.woorden.alles}</p></div>`
      + `<div class="c96-groot">${pic(d.voor, 'c96-g0')}${pic(d.achter, 'c96-g1')}${pic(d.detail, 'c96-g2')}</div>`
      + `<span class="c96-pijl">${PIJL}</span><span class="c96-lbl"></span><span class="c96-flits"></span><span class="c96-muis">${MUIS}</span>`;
    clip = laag.querySelector('.c96-clip');
    gebouwd = true;
  }
  function stop() {
    aan = false; clearTimeout(klok);
    laag.getAnimations({ subtree: true }).forEach((a) => a.cancel());
    laag.classList.remove('c96-aan');
    if (clip) { clip.pause(); }
  }
  function speel() {
    if (aan) return;
    aan = true; intro();
  }
  /* de telefoonclip tot net voor de sluiter, dan de tijdlijn */
  function intro() {
    if (!aan) return;
    laag.getAnimations({ subtree: true }).forEach((a) => a.cancel());
    if (!gebouwd) bouw();
    if (!clip) { ronde(); return; }
    laag.classList.add('c96-aan');
    laag.querySelectorAll('.c96-vel, .c96-groot, .c96-pijl, .c96-lbl, .c96-flits, .c96-muis').forEach((e) => { e.style.opacity = '0'; });
    clip.style.opacity = '1';
    if (!clip.src) clip.src = `${d.clip}.mp4${v}`;
    try { clip.currentTime = 0; } catch { /* nog niet geladen */ }
    let begonnen = false;
    const ga = () => { if (begonnen || !aan) return; begonnen = true; klok = setTimeout(() => { laag.querySelectorAll('[style*="opacity"]').forEach((e) => { e.style.opacity = ''; }); ronde(); }, INTRO); };
    clip.addEventListener('playing', ga, { once: true });
    clip.play().catch(() => { begonnen = true; laag.querySelectorAll('[style*="opacity"]').forEach((e) => { e.style.opacity = ''; }); ronde(); });
  }
  function ronde() {
    laag.getAnimations({ subtree: true }).forEach((a) => a.cancel());
    if (!gebouwd) bouw();
    laag.classList.add('c96-aan');
    const q = (s) => laag.querySelector(s);
    const W = laag.clientWidth, H = laag.clientHeight;
    if (!W || !H) { klok = setTimeout(() => aan && ronde(), 500); return; }
    const f = (ms) => ms / T;
    const anim = (el, kf) => el.animate(kf, { duration: T, fill: 'both', easing: 'linear' });
    /* het raster: twee kolommen; het vak van een beeld is 4 : 5 */
    const vel = q('.c96-vel'), p0 = q('.c96-p[data-i="0"] .c96-b');
    const r0 = p0.getBoundingClientRect(), rl = laag.getBoundingClientRect();
    const k = rl.width / W || 1, s0 = r0.width / rl.width, x0 = (r0.left - rl.left) / k, y0 = (r0.top - rl.top) / k;
    const vak = `translate(${x0}px, ${y0}px) scale(${s0})`;
    const scroll = Math.max(0, vel.scrollHeight - H);
    /* de telefoonfoto, de zoeker en de sluiter: weg in de flits */
    for (const s of ['.c96-foto', '.c96-zoeker', '.c96-sluiter', '.c96-clip']) if (q(s)) anim(q(s), [{ opacity: 1, offset: 0 }, { opacity: 1, offset: f(1700) }, { opacity: 0, offset: f(1720) }, { opacity: 0, offset: 1 }]);
    if (q('.c96-sluiter')) q('.c96-sluiter').animate([{ transform: 'scale(1)' }, { transform: 'scale(.86)' }, { transform: 'scale(1)' }], { duration: 200, delay: 1450, fill: 'none' });
    anim(q('.c96-flits'), [{ opacity: 0, offset: 0 }, { opacity: 0, offset: f(1550) }, { opacity: 1, offset: f(1720), easing: 'ease-out' }, { opacity: 0, offset: f(2300) }, { opacity: 0, offset: 1 }]);
    /* de hoodie groot (de laag .c96-groot, beeld 0), dan naar zijn vak; na de catalogus uit zijn vak weer groot */
    const groot = q('.c96-groot');
    anim(groot, [{ opacity: 0, transform: 'none', offset: 0 }, { opacity: 0, transform: 'none', offset: f(1700) }, { opacity: 1, transform: 'none', offset: f(1720) },
      { opacity: 1, transform: 'none', offset: f(2600), easing: E }, { opacity: 1, transform: vak, offset: f(3400) }, { opacity: 0, transform: vak, offset: f(3420) },
      { opacity: 0, transform: vak, offset: f(6900) }, { opacity: 1, transform: vak, offset: f(6920), easing: E }, { opacity: 1, transform: 'none', offset: f(7600) },
      { opacity: 1, transform: 'none', offset: f(11600) }, { opacity: 0, transform: 'none', offset: f(11900) }, { opacity: 0, offset: 1 }]);
    anim(q('.c96-g1'), [{ opacity: 0, offset: 0 }, { opacity: 0, offset: f(8500) }, { opacity: 1, offset: f(8750) }, { opacity: 1, offset: 1 }]);
    anim(q('.c96-g2'), [{ opacity: 0, offset: 0 }, { opacity: 0, offset: f(10100) }, { opacity: 1, offset: f(10350) }, { opacity: 1, offset: 1 }]);
    /* de catalogus: verschijnt, scrollt naar de balk, blijft even, scrollt terug, en wijkt voor de hoodie */
    anim(vel, [{ opacity: 0, transform: 'none', offset: 0 }, { opacity: 0, transform: 'none', offset: f(3380) }, { opacity: 1, transform: 'none', offset: f(3400) },
      { opacity: 1, transform: 'none', offset: f(4700), easing: E }, { opacity: 1, transform: `translateY(${-scroll}px)`, offset: f(5800) },
      { opacity: 1, transform: `translateY(${-scroll}px)`, offset: f(6200), easing: E }, { opacity: 1, transform: 'none', offset: f(6900) },
      { opacity: 0, transform: 'none', offset: f(7300) }, { opacity: 0, offset: 1 }]);
    laag.querySelectorAll('.c96-p').forEach((p, i) => {
      const a = i === 0 ? 3400 : 3300 + i * 200;
      anim(p, [{ opacity: 0, transform: 'translateY(8px)', offset: 0 }, { opacity: i === 0 ? 1 : 0, transform: i === 0 ? 'none' : 'translateY(8px)', offset: f(a) }, { opacity: 1, transform: 'none', offset: f(a + 320), easing: E }, { opacity: 1, offset: 1 }]);
    });
    /* de pijl en de cursor: twee klikken, achterkant en detail */
    anim(q('.c96-pijl'), [{ opacity: 0, offset: 0 }, { opacity: 0, offset: f(7500) }, { opacity: 1, offset: f(7800) }, { opacity: 1, offset: f(11500) }, { opacity: 0, offset: f(11800) }, { opacity: 0, offset: 1 }]);
    const pr = q('.c96-pijl').getBoundingClientRect(), px = (pr.left - rl.left + pr.width / 2) / k - 4, py = (pr.top - rl.top + pr.height / 2) / k - 2;
    const van = `translate(${W * .55}px, ${H * .82}px)`, op = `translate(${px}px, ${py}px)`, klik = `${op} scale(.85)`;
    anim(q('.c96-muis'), [{ opacity: 0, transform: van, offset: 0 }, { opacity: 0, transform: van, offset: f(7600) }, { opacity: 1, transform: van, offset: f(7800), easing: E },
      { opacity: 1, transform: op, offset: f(8300) }, { opacity: 1, transform: klik, offset: f(8400) }, { opacity: 1, transform: op, offset: f(8550) },
      { opacity: 1, transform: op, offset: f(9900) }, { opacity: 1, transform: klik, offset: f(10000) }, { opacity: 1, transform: op, offset: f(10150) },
      { opacity: 1, transform: op, offset: f(11400) }, { opacity: 0, transform: op, offset: f(11700) }, { opacity: 0, offset: 1 }]);
    /* het hoekje: wat je ziet */
    const lbl = q('.c96-lbl'), w = d.woorden;
    anim(lbl, [{ opacity: 0, offset: 0 }, { opacity: 0, offset: f(1800) }, { opacity: 1, offset: f(2100) }, { opacity: 1, offset: f(3300) }, { opacity: 0, offset: f(3400) }, { opacity: 0, offset: f(7400) }, { opacity: 1, offset: f(7600) }, { opacity: 1, offset: f(11500) }, { opacity: 0, offset: f(11800) }, { opacity: 0, offset: 1 }]);
    const tekst = [[1750, w.voor], [7300, w.voor], [8500, w.achter], [10100, w.detail]];
    tekst.forEach(([t, s]) => setTimeout(() => { if (aan) lbl.textContent = s; }, t));
    lbl.textContent = '';
    klok = setTimeout(() => { if (aan) intro(); }, T);
  }
  return { speel, stop };
}
