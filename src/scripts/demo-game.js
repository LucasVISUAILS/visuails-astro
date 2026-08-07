/* VISUAILS — de machine achter het demospel. Augustus 2026.
 *
 * Het scherm staat in src/components/DemoGame.astro, de tabel met beelden en
 * teksten in src/data/demo.js. Dit bestand weet alleen hoe je van stap naar
 * stap gaat en welk beeld bij de huidige keuzes hoort. Het kent geen hoodies,
 * geen Dunes en geen prijzen — als dat verandert, verandert het niet hier.
 *
 * ── ÉÉN TOESTAND, ÉÉN TEKENFUNCTIE ──────────────────────────────────────────
 * Alles wat de speler gekozen heeft staat in `state`. Elke handeling verandert
 * `state` en roept `render()` aan; `render()` leest alleen `state` en zet het
 * scherm goed. Nooit een handler die zelf een stukje scherm bijwerkt: dat is
 * hoe een knop op stap 4 een tegel op stap 2 vergeet, en dat is het soort bug
 * dat je pas ziet als iemand terugklikt.
 *
 * ── HET DOET NIETS ALS ER NIETS TE DOEN IS ──────────────────────────────────
 * Zonder [data-demo] op de pagina stopt dit bestand meteen. Het wordt door
 * DemoGame.astro geïmporteerd en dus alleen geladen op de pagina die het spel
 * draagt, maar die zekerheid hoort in het script te staan en niet in het
 * vertrouwen dat niemand de import verplaatst.
 */
const root = document.querySelector('[data-demo]');
if (root) init(root);

function init(root) {
  const boardEl = root.querySelector('[data-demo-board]');
  let board;
  try {
    board = JSON.parse(boardEl?.textContent || '{}');
  } catch {
    return; // Zonder tabel geen spel. De pagina blijft leesbaar; zie hieronder.
  }
  if (!board.products?.length) return;

  const steps = root.querySelectorAll('[data-step]');
  const byName = (name) => root.querySelector(`[data-step="${name}"]`);

  /* Wat de speler gekozen heeft. De standaardwaarden zijn dezelfde als de
   * aria-pressed="true" in de HTML — die twee moeten kloppen, want de HTML is
   * wat je ziet voordat er één keer gerenderd is. */
  const state = {
    product: null,
    dropped: false,
    background: 'white',
    shots: { front: true, back: false, detail: true, worn: true },
    style: 'dunes',
    crop: 'ratio-45',
    videoStyle: 'motion',
    ratio: 'v-916',
    model: 'lisa',
    step: 'product',
    clicks: 0,
    startedAt: 0,
  };

  /** De volgorde waar dit product doorheen gaat. */
  const flow = () => {
    const p = board.products.find((x) => x.id === state.product);
    return ['product', 'drop', ...(p ? p.steps : []), 'check', 'result'];
  };

  const go = (name) => { state.step = name; render(); scrollToStep(); };
  const next = () => {
    const order = flow();
    const i = order.indexOf(state.step);
    const to = order[Math.min(i + 1, order.length - 1)];
    if (to === 'check') runCheck();
    else go(to);
  };

  /* Niet naar de bovenkant van de pagina en niet naar het element: naar de kop
   * van de stap, met de rest van het spel eronder in beeld. Bij een speler die
   * beweging heeft uitgezet gebeurt er niets — die zit al op de goede plek,
   * want het scherm verschuift niet onder hem weg. */
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function scrollToStep() {
    if (reduced) return;
    const el = byName(state.step);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // ── het tekenen ────────────────────────────────────────────────────────────
  function render() {
    for (const el of steps) el.hidden = el.dataset.step !== state.step;

    // De tegels en swatches spiegelen `state` in plaats van hun eigen klik te
    // onthouden — zie de noot bovenaan over waarom dat niet hetzelfde is.
    for (const b of root.querySelectorAll('[data-choice]')) {
      const key = b.dataset.choice;
      b.setAttribute('aria-pressed', String(state[key] === b.dataset.value));
    }
    for (const b of root.querySelectorAll('[data-toggle="shot"]')) {
      b.setAttribute('aria-pressed', String(!!state.shots[b.dataset.value]));
    }

    if (state.step === 'result') drawResult();
  }

  // ── stap 1 · het product ───────────────────────────────────────────────────
  for (const card of root.querySelectorAll('[data-product]')) {
    card.addEventListener('click', () => {
      state.product = card.dataset.product;
      state.dropped = false;
      state.startedAt = Date.now();
      state.clicks = 0;

      // Het beeld dat straks gesleept wordt is de bronfoto van dit product.
      const src = board.products.find((p) => p.id === state.product)?.source || '';
      const drag = root.querySelector('[data-drag]');
      const drop = root.querySelector('[data-drop]');
      if (drag) { drag.src = src; drag.classList.remove('is-gone'); }
      if (drop) { drop.classList.remove('is-full', 'is-over'); drop.innerHTML = `<span>${escapeHtml(dropLabel())}</span>`; }
      go('drop');
    });
  }

  const dropLabel = () => root.querySelector('[data-drop-label]')?.textContent || '';

  // ── stap 2 · slepen (of tikken) ────────────────────────────────────────────
  const drag = root.querySelector('[data-drag]');
  const drop = root.querySelector('[data-drop]');
  if (drag && drop) {
    drag.addEventListener('dragstart', (e) => {
      e.dataTransfer?.setData('text/plain', 'photo');
      if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
    });
    drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('is-over'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('is-over'));
    drop.addEventListener('drop', (e) => { e.preventDefault(); accept(); });

    /* TIKKEN IS GEEN NOODUITGANG MAAR DE HOOFDINGANG. Op een telefoon bestaat
     * slepen niet, en daar zit de meerderheid. Dezelfde handeling dus op klik
     * en op Enter/spatie, zodat het ook met een toetsenbord speelbaar is. */
    drop.addEventListener('click', accept);
    drag.addEventListener('click', accept);
    drop.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); accept(); }
    });
  }

  function accept() {
    if (state.dropped || !drag?.src) return;
    state.dropped = true;
    drop.classList.remove('is-over');
    drop.classList.add('is-full');
    drop.innerHTML = `<img src="${escapeAttr(drag.src)}" alt="">`;
    drag.classList.add('is-gone');
    setTimeout(next, reduced ? 0 : 420);
  }

  // ── stap 3 en 4 · de keuzes ────────────────────────────────────────────────
  for (const b of root.querySelectorAll('[data-choice]')) {
    b.addEventListener('click', () => {
      state[b.dataset.choice] = b.dataset.value;
      state.clicks++;
      render();
      // De modelstap heeft zijn eigen knop (er staat maar één te kiezen
      // gezicht, dus doorschuiven op klik zou de vergrendelde tegels
      // onbereikbaar maken voordat iemand ze gezien heeft).
      if (b.dataset.choice !== 'model') setTimeout(next, reduced ? 0 : 260);
    });
  }

  /* De shots zijn schakelaars en geen keuze: je kunt er meerdere aan hebben.
   * Ze gaan dus NIET automatisch door naar de volgende stap — anders kun je er
   * maar één omzetten. Doorgaan doe je met de laatste tegel die je aanraakt en
   * een korte pauze, of met de knop die hieronder verschijnt. */
  const shotButtons = root.querySelectorAll('[data-toggle="shot"]');
  for (const b of shotButtons) {
    b.addEventListener('click', () => {
      state.shots[b.dataset.value] = !state.shots[b.dataset.value];
      state.clicks++;
      render();
      queueAdvance();
    });
  }
  let advanceTimer = 0;
  function queueAdvance() {
    clearTimeout(advanceTimer);
    advanceTimer = window.setTimeout(next, reduced ? 0 : 1400);
  }

  // De knop onder de stappen die niet vanzelf doorschuiven.
  for (const b of root.querySelectorAll('[data-next]')) {
    b.addEventListener('click', () => { clearTimeout(advanceTimer); next(); });
  }

  // Vergrendelde modellen: de uitleg openen in plaats van niets doen.
  const lockedNote = root.querySelector('[data-locked-note]');
  for (const b of root.querySelectorAll('[data-locked]')) {
    b.addEventListener('click', () => { if (lockedNote) lockedNote.hidden = false; });
  }

  // ── stap 5 · de controle ───────────────────────────────────────────────────
  /* Geen laadbalk. Drie regels die aanvinken, en het zijn de drie dingen die
   * er in het echt ook gecontroleerd worden. Vijftienhonderd milliseconden is
   * lang genoeg om de onthulling iets te laten zijn en kort genoeg om niet te
   * liegen over rekenwerk dat niet gebeurt. */
  function runCheck() {
    state.step = 'check';
    render();
    scrollToStep();
    const lines = root.querySelectorAll('[data-checks] li');
    lines.forEach((li) => li.classList.remove('is-done'));
    if (reduced) {
      lines.forEach((li) => li.classList.add('is-done'));
      go('result');
      return;
    }
    lines.forEach((li, i) => setTimeout(() => li.classList.add('is-done'), 260 + i * 380));
    setTimeout(() => go('result'), 1500);
  }

  // ── stap 6 · het resultaat ────────────────────────────────────────────────
  function drawResult() {
    const source = board.products.find((p) => p.id === state.product)?.source || '';
    const before = root.querySelector('[data-before]');
    const after = root.querySelector('[data-after]');
    const set = root.querySelector('[data-set]');
    const lede = root.querySelector('[data-result-lede]');
    if (!before || !after || !set) return;

    before.src = source;

    if (state.product === 'catalog') {
      const table = board.catalog[state.background] || {};
      const on = Object.keys(state.shots).filter((s) => state.shots[s]);
      after.src = table[on[0]] || table.front || source;
      set.innerHTML = ['front', 'back', 'detail', 'worn'].map((shot) => {
        const cap = board.copy.shotNames[shot] || shot;
        if (!state.shots[shot]) {
          // HET VRAAGTEKEN. Dit is het enige moment in het spel waarop er iets
          // NIET geleverd wordt, en het is met opzet het meest opvallende vak
          // van de vier — zie de noot bij de shots-stap in DemoGame.astro.
          return `<li><div class="is-missing">${escapeHtml(board.copy.missingBack)}</div><span class="demo-set-cap">${escapeHtml(cap)}</span></li>`;
        }
        return `<li><img src="${escapeAttr(table[shot] || source)}" alt=""><span class="demo-set-cap">${escapeHtml(cap)}</span></li>`;
      }).join('');
      if (lede) lede.textContent = on.length === 1 ? board.copy.resultLede.one : board.copy.resultLede.many;
    } else if (state.product === 'lifestyle') {
      const pair = board.lifestyle[state.style] || {};
      after.src = pair.wide || source;
      set.innerHTML = [pair.wide, pair.close].filter(Boolean)
        .map((src) => `<li><img src="${escapeAttr(src)}" alt=""></li>`).join('');
      if (lede) lede.textContent = board.copy.resultLede.many;
    } else {
      const clip = board.video[state.videoStyle] || {};
      after.src = clip.poster || source;
      /* Zonder clip een stilstaand beeld en geen lege lijst. Een <video> die
       * niets afspeelt leert iets verkeerds over de dienst, en een leeg vak
       * leest als een fout — dus zolang de clips niet gefilmd zijn staat hier
       * het posterbeeld met dezelfde tegel eromheen. */
      set.innerHTML = clip.clip
        ? `<li><video src="${escapeAttr(clip.clip)}" poster="${escapeAttr(clip.poster)}" muted loop autoplay playsinline></video></li>`
        : `<li><img src="${escapeAttr(clip.poster || source)}" alt=""></li>`;
      if (lede) lede.textContent = board.copy.resultLede.one;
    }

    // De teller. Het enige harde bewijs op de site voor de belofte in de kop.
    const counter = root.querySelector('[data-counter]');
    if (counter) {
      const seconds = Math.max(1, Math.round((Date.now() - state.startedAt) / 1000));
      counter.textContent = board.copy.counter
        .replace(/\d+(?=\s*\S*\s*(choices|keuzes))/, String(state.clicks))
        .replace(/\d+(?=\s*(seconds|seconden))/, String(seconds));
    }

    /* De overdracht: /start opent met de stijl die net gespeeld is. Eén
     * parameter, en het verschil tussen "leuk" en "ik ben al begonnen". */
    const cta = root.querySelector('[data-cta-start]');
    if (cta) {
      const base = cta.getAttribute('href').split('?')[0];
      const params = new URLSearchParams({ service: state.product });
      if (state.product === 'lifestyle') params.set('style', state.style);
      if (state.product === 'video') params.set('style', state.videoStyle);
      cta.setAttribute('href', `${base}?${params}`);
    }
  }

  // De schuif. Eén regel: de breedte van het uitsnijdvenster ís de waarde.
  const slider = root.querySelector('[data-slider]');
  const clip = root.querySelector('[data-media]');
  if (slider && clip) {
    const sync = () => { clip.style.setProperty('--pos', `${slider.value}%`); };
    slider.addEventListener('input', sync);
    sync();
  }

  root.querySelector('[data-restart]')?.addEventListener('click', () => {
    state.product = null;
    state.dropped = false;
    go('product');
  });

  render();
}

/* Twee kleine ontsnappers. Alles wat hier in HTML terechtkomt komt uit onze
 * eigen tabel en niet van de bezoeker, maar een innerHTML zonder ontsnapping is
 * een gewoonte die je op de verkeerde dag inhaalt. */
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (ch) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
  ));
}
function escapeAttr(s) { return escapeHtml(s); }
