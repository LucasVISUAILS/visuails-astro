// VISUAILS — Cloudflare Turnstile in de browser, onzichtbaar. 8 oktober 2026 (o03).
//
// De regels staan in src/lib/turnstile.js. Hier alleen hoe de browser aan een
// token komt, en vooral: hoe hij NIET in de weg zit.
//
//   · NIETS LADEN TOT HET NODIG IS. Pas als iemand een beschermd formulier
//     aanraakt (focus), vraagt deze module de sleutel op bij /api/botcheck en
//     laadt hij het script van Cloudflare. Een bezoeker die alleen leest, haalt
//     niets van challenges.cloudflare.com.
//   · HET TOKEN WORDT BIJ HET VERSTUREN GEVRAAGD (`execution: 'execute'`), niet
//     bij het laden. Een token is vijf minuten geldig en het bestelformulier
//     invullen duurt langer.
//   · ONZICHTBAAR (`appearance: 'interaction-only'`). In de modus "Onzichtbaar"
//     in het Cloudflare-dashboard verschijnt er nooit iets; in "Beheerd"
//     hooguit een vinkje voor een verdacht verzoek, nooit een puzzel.
//   · NOOIT LANGER DAN ZES SECONDEN WACHTEN. Komt er geen token (adblocker,
//     storing, geen sleutel), dan gaat het formulier zonder token. De server
//     laat dat door, strenger begrensd en gemarkeerd.
//   · GEEN EIGEN VELD VAN CLOUDFLARE IN HET FORMULIER (`response-field: false`):
//     anders landde `cf-turnstile-response` in de bestelling. Het token gaat als
//     `turnstile` mee, en alleen als er een is.

const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const WACHT_MS = 6000;

/** undefined = nog niet gevraagd; '' = de botcheck staat uit. */
let sleutel;
let sleutelVraag = null;
let scriptLaden = null;
const widgets = new WeakMap();

function metTijd(belofte, ms, anders) {
  return new Promise((ok, nee) => {
    const klok = setTimeout(() => (anders === undefined ? nee(new Error('te traag')) : ok(anders)), ms);
    belofte.then((w) => { clearTimeout(klok); ok(w); }, (e) => { clearTimeout(klok); if (anders === undefined) nee(e); else ok(anders); });
  });
}

/** De publieke sleutel, één keer per pagina gevraagd. */
export function haalSleutel() {
  if (sleutel !== undefined) return Promise.resolve(sleutel);
  if (!sleutelVraag) {
    sleutelVraag = fetch('/api/botcheck', { headers: { accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => {
        sleutel = b && typeof b.sleutel === 'string' ? b.sleutel : '';
        return sleutel;
      })
      .catch(() => {
        /* Niet onthouden: bij een volgende poging mag het opnieuw. Nu: zonder. */
        sleutelVraag = null;
        return '';
      });
  }
  return sleutelVraag;
}

function laadScript() {
  if (typeof window !== 'undefined' && window.turnstile) return Promise.resolve(window.turnstile);
  if (!scriptLaden) {
    scriptLaden = new Promise((ok, nee) => {
      const s = document.createElement('script');
      s.src = SCRIPT;
      s.async = true;
      s.onload = () => (window.turnstile ? ok(window.turnstile) : nee(new Error('geen turnstile')));
      s.onerror = () => { scriptLaden = null; nee(new Error('script niet geladen')); };
      document.head.appendChild(s);
    });
  }
  return scriptLaden;
}

/** Eén onzichtbare widget per formulier, op de plek die het formulier aanwijst. */
function widgetVoor(ts, form, sl, actie) {
  const oud = widgets.get(form);
  if (oud && oud.el.isConnected) return oud;
  const el = document.createElement('div');
  el.className = 'botcheck';
  el.setAttribute('data-botcheck-vak', '');
  const plek = form.querySelector('[data-botcheck-plek]');
  if (plek) plek.appendChild(el); else form.appendChild(el);
  const w = { el, id: null, wacht: null, gebruikt: false };
  const klaar = (token) => { const f = w.wacht; w.wacht = null; if (f) f(token || ''); };
  w.id = ts.render(el, {
    sitekey: sl,
    action: actie,
    appearance: 'interaction-only',
    execution: 'execute',
    size: 'flexible',
    'response-field': false,
    retry: 'never',
    'refresh-expired': 'manual',
    callback: (token) => klaar(token),
    'error-callback': () => { klaar(''); return true; },
    'timeout-callback': () => klaar(''),
    'unsupported-callback': () => klaar(''),
  });
  widgets.set(form, w);
  return w;
}

/**
 * Alvast de sleutel en het script halen, zodat het token straks snel is.
 * Doet niets als de botcheck uit staat.
 */
export function voorbereiden() {
  haalSleutel().then((sl) => { if (sl) laadScript().catch(() => {}); });
}

/**
 * Een vers token voor dit formulier, of '' als er geen komt. Gooit nooit.
 * @param {HTMLFormElement} form
 * @param {string} actie  'bestelling' | 'contact' | 'studiobrief' | 'upload'
 */
export async function botToken(form, actie) {
  try {
    const sl = await haalSleutel();
    if (!sl || !form) return '';
    const ts = await metTijd(laadScript(), WACHT_MS);
    const w = widgetVoor(ts, form, sl, actie);
    return await metTijd(new Promise((ok) => {
      w.wacht = ok;
      /* Een token is één keer bruikbaar: de tweede keer eerst terugzetten. */
      if (w.gebruikt) { try { ts.reset(w.id); } catch { /* dan maar zo */ } }
      w.gebruikt = true;
      ts.execute(w.el);
    }), WACHT_MS, '');
  } catch {
    return '';
  }
}

/**
 * Voor gewone formulieren (zonder eigen script, zoals /contact): bij het
 * versturen eerst het token erbij, dan pas echt versturen. En bij de eerste
 * aanraking van elk beschermd formulier alvast voorbereiden. Eén keer binden.
 */
export function bindBotcheckForms() {
  if (typeof window === 'undefined' || window.__visBotcheck) return;
  window.__visBotcheck = true;
  document.addEventListener('focusin', (e) => {
    const form = e.target && e.target.closest ? e.target.closest('form[data-botcheck]') : null;
    if (form && !form.dataset.botcheckKlaar) { form.dataset.botcheckKlaar = '1'; voorbereiden(); }
  });
  /* IN DE VANGFASE (`true`). De ClientRouter van Astro luistert ook naar
     submit en verstuurt een formulier zelf met fetch; die luisteraar stond eerst
     en zag het token nooit. Hier zijn we eerder, houden het verzenden even
     tegen, en versturen daarna gewoon (zonder router: een POST die doorstuurt
     naar de bedankpagina heeft daar niets aan). */
  document.addEventListener('submit', (e) => {
    const form = e.target && e.target.closest ? e.target.closest('form[data-botcheck-post]') : null;
    if (!form || e.defaultPrevented) return;
    e.preventDefault();
    if (form.dataset.botcheckBezig) return;
    form.dataset.botcheckBezig = '1';
    botToken(form, form.dataset.botcheck || 'formulier').then((token) => {
      let veld = form.querySelector('input[name="turnstile"]');
      if (!veld) { veld = document.createElement('input'); veld.type = 'hidden'; veld.name = 'turnstile'; form.appendChild(veld); }
      veld.value = token;
      delete form.dataset.botcheckBezig;
      /* submit() en niet requestSubmit(): de controle van de velden is al
         gebeurd (anders was er geen submit-gebeurtenis), en submit() vuurt deze
         luisteraar niet opnieuw af. */
      HTMLFormElement.prototype.submit.call(form);
    });
  }, true);
}
