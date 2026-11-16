/* ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
   VAN FOTO TOT CAMPAGNE, ALS VERHAAL — levering 99, 13 november 2026 (lijst 100, B1 a)
   Lucas (21:48): '"From photo to campaign." mag wat beter gevisualiseerd worden dan nu. Alleen een telefoon die een foto
   maakt zegt niks dus maak die animatie uitgebreider en meer compleet.' Lijst 100 B1 a: één verhaal bij de drie woorden;
   het woord dat bij de scène hoort wordt inkt, de andere grijs.

   HET PODIUM: een vast vlak van 720 × 540 (eigen maten), dat met de breedte mee schaalt (scale = breedte / 720). Alle
   tekst is daarin 24 px, dus op een telefoon van 390 (podium 350 breed) nog 11,7 px, en op 1440 is het podium 720 breed.

   DE TIJDLIJN (15 s, dan opnieuw; alleen als het podium in beeld is, niet bij "minder beweging"):
     0 – 4,3 s    JE STUURT. De telefoonclip met de hoodie (vanaf 2,75 s in de clip, de sluiter op 1,55 s). Rechts een
                  kaartje "Je bestelling": de drie telefoonfoto's (hoodie, jeans, sokken) vallen erin, dan "Verstuurd".
     4,3 – 7,6 s  WIJ MAKEN. Vier beelden van de hoodie verschijnen één voor één met een flits: voorkant, achterkant,
                  detail, op model.
     7,6 – 11 s   JE KEURT GOED. Op elk beeld een vinkje; bij het detail eerst een opmerking ("Iets dichterbij"), het
                  beeld komt dichterbij en krijgt dan zijn vinkje. De knop Goedkeuren (de actiekleur), een klik.
     11 – 15 s    EN DAN: CAMPAGNE. De beelden staan waar ze heen gaan: de webshop, een bericht in de feed, een
                  verhaal als advertentie. Alle drie de woorden zijn inkt.
   ═══════════════════════════════════════════════════════════════════════════════════════════════════════════ */
const T = 15000;
const E = 'cubic-bezier(.22, 1, .36, 1)';
const STAP = [[0, 4300], [4300, 7600], [7600, 11000], [11000, T]];
const MUIS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 2l15 11-6.5 1.2L16 21l-3 1.4-3.4-6.7L4 20z" fill="#090D0B" stroke="#fff" stroke-width="1.4"/></svg>';
const VINK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="#fff" stroke-width="2.6"/></svg>';

/** @param {HTMLElement} podium @param {HTMLElement[][]} woorden  per stap de woorden (.w8-w) @param {any} d */
export function hoeVerhaal(podium, woorden, d) {
  let klok = 0, aan = false, gebouwd = false, clip = null;
  const timers = [];
  const v = d.v ? `?v=${d.v}` : '';
  const pic = (src, kl = '') => `<picture class="${kl}"><source type="image/avif" srcset="${src}.avif${v}"><img src="${src}.webp${v}" alt="" decoding="async"></picture>`;
  const img = (src, kl = '') => `<img class="${kl}" src="${src}${v}" alt="" decoding="async">`;
  const vel = podium.querySelector('.w8v');
  function bouw() {
    const t = d.tekst;
    vel.innerHTML =
      `<video class="w8v-clip" muted playsinline preload="none" poster="${d.clip}.webp${v}"></video>`
      + `<div class="w8v-mand"><p class="w8v-mk">${t.mand}</p><div class="w8v-duims">${d.telefoon.map((s) => `<span class="w8v-duim">${img(s)}</span>`).join('')}</div><p class="w8v-ok"><i>${VINK}</i>${t.verstuurd}</p></div>`
      + d.beelden.map((b, i) => `<figure class="w8v-tegel w8v-t${i}">${pic(b.src)}<span class="w8v-flits"></span><span class="w8v-vink">${VINK}</span><figcaption>${b.naam}</figcaption></figure>`).join('')
      + `<p class="w8v-noot">${t.noot}</p>`
      + `<span class="w8v-knop">${t.knop}</span><span class="w8v-knop w8v-knop-ok"><i>${VINK}</i>${t.goed}</span>`
      + `<span class="w8v-muis">${MUIS}</span>`
      + `<figure class="w8v-plek w8v-shop"><div class="w8v-browser"><i></i><i></i><i></i></div>${pic(d.shop)}<p class="w8v-shopnaam">${d.shopNaam}</p><figcaption>${t.plekken[0]}</figcaption></figure>`
      + `<figure class="w8v-plek w8v-post"><p class="w8v-acc"><i></i>${d.account}</p>${pic(d.post)}<figcaption>${t.plekken[1]}</figcaption></figure>`
      + `<figure class="w8v-plek w8v-story">${pic(d.story)}<span class="w8v-cta">${t.shop}</span><figcaption>${t.plekken[2]}</figcaption></figure>`;
    clip = vel.querySelector('.w8v-clip');
    gebouwd = true;
  }
  const stap = (i) => woorden.forEach((ws, k) => ws.forEach((w) => w.classList.toggle('aan', i === 3 || k === i)));
  function stop() {
    aan = false; clearTimeout(klok); timers.splice(0).forEach(clearTimeout);
    vel.getAnimations({ subtree: true }).forEach((a) => a.cancel());
    podium.classList.remove('w8v-aan');
    if (clip) clip.pause();
    woorden.flat().forEach((w) => w.classList.add('aan'));
  }
  function speel() { if (aan) return; aan = true; ronde(); }
  function ronde() {
    if (!aan) return;
    timers.splice(0).forEach(clearTimeout);
    if (!gebouwd) bouw();
    vel.getAnimations({ subtree: true }).forEach((a) => a.cancel());
    podium.classList.add('w8v-aan');
    if (!clip.src) clip.src = `${d.clip}.mp4${v}`;
    try { clip.currentTime = 2.75; } catch { /* nog niet geladen */ }
    clip.play().catch(() => {});
    const q = (s) => vel.querySelector(s), qa = (s) => [...vel.querySelectorAll(s)];
    const f = (ms) => Math.max(0, Math.min(1, ms / T));
    const anim = (el, kf) => el && el.animate(kf, { duration: T, fill: 'both', easing: 'linear' });
    /* zichtbaar van a tot b, met een zachte in- en uitloop (in ms), van onder of van kleiner */
    const tussen = (el, a, b, van = 'translateY(14px)', duur = 420) => anim(el, [
      { opacity: 0, transform: van, offset: 0 }, { opacity: 0, transform: van, offset: f(a) }, { opacity: 1, transform: 'none', offset: f(a + duur), easing: E },
      { opacity: 1, transform: 'none', offset: f(b - 300) }, { opacity: 0, transform: 'none', offset: f(b) }, { opacity: 0, offset: 1 }]);
    /* 1 · je stuurt */
    anim(clip, [{ opacity: 1, offset: 0 }, { opacity: 1, offset: f(3900) }, { opacity: 0, transform: 'translateX(-30px)', offset: f(4300) }, { opacity: 0, offset: 1 }]);
    tussen(q('.w8v-mand'), 200, 4300, 'translateX(24px)');
    qa('.w8v-duim').forEach((el, i) => tussen(el, 1900 + i * 380, 4300, 'translate(-60px, -20px) scale(.6)', 480));
    tussen(q('.w8v-ok'), 3150, 4300);
    /* 2 · wij maken (en ze blijven staan tijdens het goedkeuren) */
    qa('.w8v-tegel').forEach((el, i) => {
      const a = 4500 + i * 520;
      tussen(el, a, 11200, 'scale(.92)', 360);
      anim(el.querySelector('.w8v-flits'), [{ opacity: 0, offset: 0 }, { opacity: 0, offset: f(a) }, { opacity: 1, offset: f(a + 90) }, { opacity: 0, offset: f(a + 560) }, { opacity: 0, offset: 1 }]);
    });
    /* 3 · je keurt goed: vinkjes, de opmerking bij het detail, de knop */
    const vinkT = [7900, 8250, 9500, 8600];
    qa('.w8v-vink').forEach((el, i) => anim(el, [{ opacity: 0, transform: 'scale(.4)', offset: 0 }, { opacity: 0, transform: 'scale(.4)', offset: f(vinkT[i]) },
      { opacity: 1, transform: 'scale(1)', offset: f(vinkT[i] + 260), easing: E }, { opacity: 1, offset: f(10900) }, { opacity: 0, offset: f(11200) }, { opacity: 0, offset: 1 }]));
    tussen(q('.w8v-noot'), 8650, 9600, 'translateY(10px)', 300);
    const det = q('.w8v-t2 img');
    anim(det, [{ transform: 'scale(1)', offset: 0 }, { transform: 'scale(1)', offset: f(9150) }, { transform: 'scale(1.35)', offset: f(9550), easing: E }, { transform: 'scale(1.35)', offset: f(11200) }, { transform: 'scale(1)', offset: f(11300) }, { transform: 'scale(1)', offset: 1 }]);
    tussen(q('.w8v-knop'), 8000, 10450, 'translateY(10px)', 360);
    tussen(q('.w8v-knop-ok'), 10400, 11200, 'none', 120);
    const muis = q('.w8v-muis');
    anim(muis, [{ opacity: 0, transform: 'translate(520px, 520px)', offset: 0 }, { opacity: 0, transform: 'translate(520px, 520px)', offset: f(9700) },
      { opacity: 1, transform: 'translate(520px, 520px)', offset: f(9800) }, { opacity: 1, transform: 'translate(372px, 462px)', offset: f(10250), easing: E },
      { opacity: 1, transform: 'translate(372px, 462px) scale(.85)', offset: f(10350) }, { opacity: 1, transform: 'translate(372px, 462px)', offset: f(10480) },
      { opacity: 0, transform: 'translate(372px, 462px)', offset: f(10900) }, { opacity: 0, offset: 1 }]);
    /* 4 · campagne */
    qa('.w8v-plek').forEach((el, i) => tussen(el, 11400 + i * 380, 14800, 'translateY(22px)', 520));
    /* de woorden: de stap van de scène is inkt */
    STAP.forEach(([a], i) => timers.push(setTimeout(() => { if (aan) stap(i); }, a)));
    klok = setTimeout(() => { if (aan) ronde(); }, T);
  }
  return { speel, stop };
}
