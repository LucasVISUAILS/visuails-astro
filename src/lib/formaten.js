/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * OOK ALS PNG OF WEBP — 11 oktober 2026 (k401, afvinklijst 2)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas: *"Misschien is jpg standaard en kunnen klanten op de order kaart los
 * png/webp formats kunnen aanvragen zodat ze wel die mogelijkheid hebben. 1
 * simpele druk op 1 van de png of webp knoppen en ik krijg in een apart tab op
 * /admin te zien welke orders/fotos png of webp formats nodig hebben."*
 *
 * ── WAT ER GEBEURT ──────────────────────────────────────────────────────────
 *
 *   Studio   op een geleverde bestelling twee kleine knoppen, "Ook als PNG" en
 *            "Ook als WebP". Eén gewoon formulier (Studio heeft geen script),
 *            achter dezelfde Origin-poort als elk ander Studio-formulier. Eén
 *            klik zet een rij in `formaat_verzoeken` (migratie 0065); nog een
 *            klik verandert niets (UNIQUE op bestelling + formaat). De knop wordt
 *            dan "PNG aangevraagd · 11 okt", en na "Klaar" in /admin
 *            "PNG geleverd · 12 okt".
 *   /admin   de pagina Formaten: wat openstaat, per bestelling en formaat, met
 *            de link naar de bestelling en de knop "Klaar".
 *
 * Er gebeurt niets vanzelf: geen omzetting. Lucas levert het formaat en klikt
 * op Klaar. Sinds 15 oktober 2026 (doorloop 27, B31) mailt Klaar de klant dat
 * het formaat in zijn download staat; zet FORMATEN.bat het verzoek op Klaar,
 * dan staat er in /admin/formaten een knop "Klant mailen" bij.
 *
 * ── WAAR DE KNOPPEN STAAN, EN WAAR NIET ─────────────────────────────────────
 *
 * Alleen bij een geleverde bestelling met beelden die nog te downloaden zijn
 * (de map heeft een knop). Niet bij video (een film heeft geen png), niet bij
 * de €1-proef (een proef is één beeld om de look te zien; zie de vraag in het
 * verslag van K5), niet bij een ingetrokken levering. De privélink krijgt ze
 * niet: daar is geen account om het verzoek aan te hangen.
 */

export const FORMATEN = ['png', 'webp'];

const NAAM = { png: 'PNG', webp: 'WebP' };

/* k-png = a (12 oktober 2026, afvinklijst 4). Hier stond "PNG kies je voor een
   transparante achtergrond". Dat beloofde uitsnijden (extra werk, en bij een
   lifestylescène klopt het niet). PNG is het bestand zonder kwaliteitsverlies:
   de originelen die Lucas uit Magnific downloadt, zonder jpg-compressie. */
const TEKST = {
  nl: {
    kop: 'Andere formaten',
    uitleg: 'JPG is de standaard. PNG is zonder kwaliteitsverlies, voor drukwerk of verder bewerken. WebP laadt snel op je eigen site.',
    knop: (f) => `Ook als ${NAAM[f]}`,
    aangevraagd: (f, d) => `${NAAM[f]} aangevraagd · ${d}`,
    geleverd: (f, d) => `${NAAM[f]} geleverd · ${d}`,
    ok: (f) => `Genoteerd: we maken de beelden van deze bestelling ook als ${NAAM[f]}.`,
    fout: 'Dat lukte nu niet. Probeer het later opnieuw, of mail ons het kenmerk van je bestelling.',
  },
  en: {
    kop: 'Other formats',
    uitleg: 'JPG is the default. PNG has no quality loss, for print or further editing. WebP loads fast on your own site.',
    knop: (f) => `Also as ${NAAM[f]}`,
    aangevraagd: (f, d) => `${NAAM[f]} requested · ${d}`,
    geleverd: (f, d) => `${NAAM[f]} delivered · ${d}`,
    ok: (f) => `Noted: we will also make the images of this order as ${NAAM[f]}.`,
    fout: 'That did not work just now. Try again later, or email us your order reference.',
  },
};

const MAANDEN = {
  nl: ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

/** "11 okt" / "11 Oct" uit een D1-datum ('2026-10-11 09:30:00'). */
export function korteDatum(waarde, lang = 'nl') {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(waarde || ''));
  if (!m) return '';
  return `${Number(m[3])} ${(MAANDEN[lang] || MAANDEN.en)[Number(m[2]) - 1]}`;
}

export function formaatGeldig(f) {
  return FORMATEN.includes(String(f || ''));
}

/** Mag deze bestelling een ander formaat aanvragen? Dezelfde regel op het
 *  scherm en in de POST. `downloadbaar`: de map heeft nog een knop. */
export function formaatKan(o, { downloadbaar = true } = {}) {
  if (!o || o.status !== 'delivered') return false;
  if (o.service === 'video' || o.service === 'test-sample') return false;
  return !!downloadbaar;
}

/** De verzoeken per bestelling: Map(orderId → [{ id, formaat, aangevraagd_at, klaar_at }]).
 *  Leeg (en geen fout) zolang migratie 0065 niet gedraaid is. */
export async function formatenVoorOrders(env, orderIds = []) {
  const uit = new Map();
  const ids = [...new Set(orderIds.map(Number).filter((n) => Number.isInteger(n) && n > 0))].slice(0, 500);
  if (!ids.length || !env?.DB) return uit;
  try {
    const r = await env.DB.prepare(
      `SELECT id, order_id, formaat, aangevraagd_at, klaar_at FROM formaat_verzoeken
        WHERE order_id IN (${ids.map(() => '?').join(',')}) ORDER BY id`
    ).bind(...ids).all();
    for (const rij of r.results || []) {
      const k = Number(rij.order_id);
      if (!uit.has(k)) uit.set(k, []);
      uit.get(k).push(rij);
    }
  } catch { /* tabel bestaat nog niet: geen verzoeken */ }
  return uit;
}

/** Het blok op de bestelkaart, of null. */
export function formaatView(o, verzoeken = [], { lang = 'nl', downloadbaar = true } = {}) {
  if (!formaatKan(o, { downloadbaar })) return null;
  const t = TEKST[lang] || TEKST.en;
  const per = new Map((verzoeken || []).map((v) => [v.formaat, v]));
  return {
    id: `formaten-${o.id}`,
    action: `/account/orders/${o.id}/formaat`,
    kop: t.kop,
    uitleg: t.uitleg,
    knoppen: FORMATEN.map((f) => {
      const v = per.get(f);
      if (!v) return { formaat: f, label: t.knop(f), staat: '' };
      return {
        formaat: f,
        label: '',
        staat: v.klaar_at ? t.geleverd(f, korteDatum(v.klaar_at, lang)) : t.aangevraagd(f, korteDatum(v.aangevraagd_at, lang)),
        klaar: !!v.klaar_at,
      };
    }),
  };
}

/** De regel na de klik (?formaat=png of ?formaat=fout), of ''. */
export function formaatMelding(waarde, lang = 'nl') {
  const t = TEKST[lang] || TEKST.en;
  if (formaatGeldig(waarde)) return t.ok(waarde);
  return waarde === 'fout' ? t.fout : '';
}

/** Leg het verzoek vast. Dubbel is één (UNIQUE + INSERT OR IGNORE). */
export async function vraagFormaatAan(env, orderId, formaat) {
  if (!formaatGeldig(formaat)) return { ok: false };
  try {
    await env.DB.prepare(
      'INSERT OR IGNORE INTO formaat_verzoeken (order_id, formaat) VALUES (?1, ?2)'
    ).bind(orderId, formaat).run();
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

/**
 * POST /account/orders/<id>/formaat — vanuit accountPost(), dus ná de sessie,
 * de Origin-controle en de rate limit. Alleen de eigenaar: de sessie zegt wie
 * hij is, het nummer in de URL niets.
 */
export async function handleFormaatPost({ request, env }, customer, orderId, { seeOther }) {
  const home = '/account/orders';
  if (!Number.isInteger(orderId) || orderId <= 0) return seeOther(home);
  const terug = (q) => `${home}?order=${orderId}&formaat=${q}#formaten-${orderId}`;
  const form = await request.formData().catch(() => null);
  const formaat = String(form?.get('formaat') || '');
  if (!formaatGeldig(formaat)) return seeOther(`${home}?order=${orderId}#order-${orderId}`);
  const o = await env.DB.prepare(
    'SELECT id, service, status FROM orders WHERE id = ?1 AND customer_id = ?2'
  ).bind(orderId, customer.customer_id).first().catch(() => null);
  if (!o) return seeOther(home);
  if (!formaatKan(o)) return seeOther(`${home}?order=${orderId}#order-${orderId}`);
  const uit = await vraagFormaatAan(env, orderId, formaat);
  return seeOther(terug(uit.ok ? formaat : 'fout'));
}

/* ── /admin ────────────────────────────────────────────────────────────────── */

/** Alle verzoeken met de bestelling erbij: eerst wat openstaat (oudste eerst),
 *  daarna de laatste veertig die klaar zijn. null = tabel bestaat nog niet. */
export async function formatenLijst(env) {
  try {
    const kolommen = `fv.id, fv.order_id, fv.formaat, fv.aangevraagd_at, fv.klaar_at,
      o.ref, o.brand, o.name, o.service,
      (SELECT COUNT(*) FROM files f WHERE f.order_id = o.id AND f.kind = 'delivery' AND f.superseded_at IS NULL) AS beelden`;
    const open = await env.DB.prepare(
      `SELECT ${kolommen} FROM formaat_verzoeken fv JOIN orders o ON o.id = fv.order_id
        WHERE fv.klaar_at IS NULL ORDER BY fv.aangevraagd_at, fv.id LIMIT 500`
    ).all();
    const klaar = await env.DB.prepare(
      `SELECT ${kolommen} FROM formaat_verzoeken fv JOIN orders o ON o.id = fv.order_id
        WHERE fv.klaar_at IS NOT NULL ORDER BY fv.klaar_at DESC, fv.id DESC LIMIT 40`
    ).all();
    return { open: open.results || [], klaar: klaar.results || [] };
  } catch {
    return null;
  }
}

/** Aantal open verzoeken, voor de chip op het dashboard. 0 bij twijfel. */
export async function telOpenFormaten(env) {
  try {
    const r = await env.DB.prepare('SELECT COUNT(*) AS n FROM formaat_verzoeken WHERE klaar_at IS NULL').first();
    return Number(r?.n) || 0;
  } catch {
    return 0;
  }
}

/** "Klaar": zet klaar_at. Een tweede klik verandert de datum niet. */
export async function formaatKlaar(env, id) {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) return { ok: false };
  try {
    const r = await env.DB.prepare(
      "UPDATE formaat_verzoeken SET klaar_at = datetime('now') WHERE id = ?1 AND klaar_at IS NULL"
    ).bind(n).run();
    return { ok: true, veranderd: Number(r?.meta?.changes ?? 1) > 0 };
  } catch {
    return { ok: false };
  }
}

export const FORMAAT_NAAM = NAAM;

/* ── DE KLANT HOORT DAT HET KLAARSTAAT — 15 oktober 2026 (doorloop 27, B31) ──
   Na "Genoteerd: we maken de beelden ook als PNG" hoorde de klant niets meer;
   in Studio veranderde alleen een regeltje. Een korte mail, met de weg naar de
   bestelling in Studio. */
const MAIL = {
  nl: {
    onderwerp: (f, ref) => `Je ${NAAM[f]}-bestanden staan klaar — ${ref}`,
    kop: (f) => `Je ${NAAM[f]}-bestanden staan klaar`,
    tekst: (f) => `De beelden van deze bestelling staan nu ook als ${NAAM[f]} in je download, naast de JPG's. Dezelfde map, dezelfde bestandsnamen.`,
    knop: 'Naar je bestelling in Studio',
  },
  en: {
    onderwerp: (f, ref) => `Your ${NAAM[f]} files are ready — ${ref}`,
    kop: (f) => `Your ${NAAM[f]} files are ready`,
    tekst: (f) => `The images of this order are now also in your download as ${NAAM[f]}, next to the JPGs. Same folder, same file names.`,
    knop: 'Go to your order in Studio',
  },
};
export async function formaatMail(env, id, { origin = 'https://visuails.com', sendMail, mail } = {}) {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0 || typeof sendMail !== 'function' || !mail) return { ok: false };
  const r = await env.DB.prepare(
    `SELECT fv.formaat, fv.klaar_at, o.id AS order_id, o.ref, o.email, o.name, o.lang
       FROM formaat_verzoeken fv JOIN orders o ON o.id = fv.order_id WHERE fv.id = ?1`
  ).bind(n).first().catch(() => null);
  if (!r || !r.klaar_at || !r.email || !formaatGeldig(r.formaat)) return { ok: false };
  const lang = r.lang === 'en' ? 'en' : 'nl';
  const t = MAIL[lang];
  /* /account/orders?order=<id>, zoals elke andere link naar één bestelling in Studio;
     /account/orders/<id> bestaat alleen voor POST (gemeten: 404). */
  const oid = Number(r.order_id);
  const href = `${origin}/account/orders?order=${oid}${lang === 'en' ? '&lang=en' : ''}#order-${oid}`;
  try {
    await sendMail(env, {
      to: r.email,
      subject: t.onderwerp(r.formaat, r.ref),
      html: mail.shell({
        lang,
        preheader: t.tekst(r.formaat),
        body: [
          /* Het kenmerk met een woord ervoor, als de aanroeper die helper meegeeft. */
          mail.h1(t.kop(r.formaat), mail.kenmerk ? mail.kenmerk('bestelling', r.ref, lang) : mail.esc(r.ref)),
          mail.p(mail.greeting(r.name, lang)),
          mail.p(mail.esc(t.tekst(r.formaat))),
          mail.button(href, t.knop),
          mail.vragen(lang, r.ref),
        ].join(''),
      }),
    });
    return { ok: true, ref: r.ref };
  } catch (err) {
    console.error('[formaten] mail niet verstuurd voor verzoek', n, '—', err?.message || err);
    return { ok: false };
  }
}
