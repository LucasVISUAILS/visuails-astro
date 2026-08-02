/* VISUAILS — the consent state machine. Section 19.
 *
 * The banner's markup is in src/components/CookieConsent.astro; the reasoning
 * about WHY it is shaped the way it is lives in that file's header. This file
 * is the part that has to be correct rather than merely compliant-looking.
 *
 * THREE STATES, AND "NO ANSWER" IS NOT "NO".
 * A visitor who has never answered is `null`, not `false`. They look the same
 * to the beacon — nothing loads for either — but they do not look the same to
 * the bar, which must keep asking the first and must never nag the second.
 * Collapsing them is the bug that makes a banner reappear on every page load.
 *
 * WHERE THE ANSWER IS STORED, AND WHY A COOKIE.
 * A first-party cookie, because remembering a refusal is itself strictly
 * necessary (refusing and then being asked again forever is not a working
 * site), and because it is what /cookie-policy describes. localStorage would
 * work and would be invisible to the server forever; the cookie leaves the door
 * open to rendering the beacon server-side later.
 *
 * VERSIONED, AND IT EXPIRES.
 * `v1` is baked into the value. Adding a third purpose later means bumping to
 * `v2`, which invalidates every stored answer — because a yes to "analytics"
 * is not a yes to "analytics and something else". Twelve months is the life;
 * consent that never expires is consent nobody remembers giving.
 */

const COOKIE = 'vis_consent';
const CONSENT_VERSION = 1;
const MAX_AGE_DAYS = 365;

/** @returns {{version:number, analytics:boolean, at:string}|null} */
export function readConsent() {
  const raw = document.cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(COOKIE + '='));
  if (!raw) return null;
  try {
    const v = JSON.parse(decodeURIComponent(raw.slice(COOKIE.length + 1)));
    // A stored answer to a DIFFERENT question is not an answer to this one.
    if (!v || v.version !== CONSENT_VERSION) return null;
    return v;
  } catch {
    return null;
  }
}

export function writeConsent(analytics) {
  const value = { version: CONSENT_VERSION, analytics: !!analytics, at: new Date().toISOString() };
  const attrs = [
    `${COOKIE}=${encodeURIComponent(JSON.stringify(value))}`,
    'Path=/',
    `Max-Age=${MAX_AGE_DAYS * 86400}`,
    'SameSite=Lax',
  ];
  // Secure everywhere except a plain-http local preview, which would otherwise
  // silently drop the cookie and make the banner look broken in development.
  if (location.protocol === 'https:') attrs.push('Secure');
  document.cookie = attrs.join('; ');
  return value;
}

/* ── the analytics beacon ───────────────────────────────────────────────────
 * The whole point of the banner. Injected by script AFTER a yes and never
 * rendered into the HTML, so "no" and "not answered yet" both mean the request
 * is never made — not made-and-ignored, not made-without-a-cookie. Not made.
 *
 * Cloudflare Web Analytics is itself cookieless, which is why it is the one
 * thing on the optional side of this banner rather than a reason to skip the
 * banner: whether it needs consent is arguable, and asking is the cheap side
 * of that argument.
 */
let beaconLoaded = false;
export function loadAnalytics(token) {
  if (beaconLoaded || !token) return;
  beaconLoaded = true;
  const s = document.createElement('script');
  s.defer = true;
  s.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  s.setAttribute('data-cf-beacon', JSON.stringify({ token }));
  document.head.appendChild(s);
}

/* ── wiring ────────────────────────────────────────────────────────────────
 * init() is idempotent and re-runs on astro:page-load, because view
 * transitions swap the document without a reload. The listeners go on the
 * elements that exist at that moment; the guard flag stops the beacon being
 * appended twice.
 */
export function initConsent(token) {
  const bar = document.getElementById('cc-bar');
  const dialog = document.getElementById('cc-prefs');
  if (!bar || !dialog) return;

  const check = dialog.querySelector('[data-cc-analytics]');
  const stored = readConsent();

  // Measure the bar so the conversion bar can sit clear of it. Done from JS
  // because the height depends on how the copy wraps, which depends on the
  // viewport and the language.
  const measure = () => {
    document.documentElement.style.setProperty('--cc-h', `${bar.offsetHeight}px`);
  };

  const show = () => { bar.hidden = false; requestAnimationFrame(measure); };
  const hide = () => { bar.hidden = true; document.documentElement.style.setProperty('--cc-h', '0px'); };

  const apply = (analytics) => {
    if (analytics) loadAnalytics(token);
    // Turning analytics OFF cannot unload a script that already ran, so the
    // honest thing is to say what actually happens: the beacon stops on the
    // next page load. Reloading here would be hostile; the cookie is written,
    // and nothing further is sent from a fresh document.
  };

  if (stored) { apply(stored.analytics); hide(); } else { show(); }
  if (check) check.checked = !!(stored && stored.analytics);

  const answer = (analytics) => {
    writeConsent(analytics);
    apply(analytics);
    hide();
    if (dialog.open) dialog.close();
  };

  bar.querySelector('[data-cc="accept"]')?.addEventListener('click', () => answer(true));
  bar.querySelector('[data-cc="reject"]')?.addEventListener('click', () => answer(false));
  bar.querySelector('[data-cc="open"]')?.addEventListener('click', () => dialog.showModal());
  dialog.querySelector('[data-cc="close"]')?.addEventListener('click', () => dialog.close());
  dialog.querySelector('[data-cc="save"]')?.addEventListener('click', () => answer(!!check?.checked));

  // The withdrawal route, which the law requires to be as easy as giving it:
  // any element with data-cc-reopen (the footer link) reopens the panel with
  // the CURRENT answer shown, not a blank form.
  for (const el of document.querySelectorAll('[data-cc-reopen]')) {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const now = readConsent();
      if (check) check.checked = !!(now && now.analytics);
      dialog.showModal();
    });
  }

  window.addEventListener('resize', measure, { passive: true });
}
