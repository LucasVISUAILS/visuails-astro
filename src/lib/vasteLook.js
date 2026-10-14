/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE VASTE LOOK VAN EEN ABONNEE — ÉÉN PLEK DIE ZEGT WAT ER VASTLIGT
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas, 19 september 2026 (ronde 4): *"Ik wou graag dat alles in VISUAILS
 * Studio gedaan kan worden om abonnees sneller te laten bestellen en alles in
 * 1 overzicht hebben."* En over de poort: *"Toestaan als de look gezet is."*
 *
 * Tot vandaag was de vaste look (customer_style_locks) alleen iets wat het
 * Studio-scherm toonde en het losse bestelformulier voorlas. De bestelling die
 * uit een abonnementsweek ontstond (planStart.js) droeg er NIETS van: geen
 * achtergrond, geen look, geen gezicht, geen verhouding. De studio kreeg dus
 * een bestelling met productnamen en foto's en moest de rest zelf opzoeken —
 * precies het "wij hoeven je niets meer te vragen" dat het scherm beloofde en
 * de code niet waarmaakte.
 *
 * Dit bestand is de ene plek waar drie vragen beantwoord worden:
 *
 *   1 · WELKE DIENSTEN raakt een slot van deze soort? (`dienstenVoorKind`)
 *       'complete' is catalog én lifestyle; 'video-*' en 'hooks' zijn video.
 *   2 · IS DE LOOK VOOR DIE DIENSTEN GEZET? (`lookCompleet`) — de poort die
 *       queueLock() sinds vandaag dichthoudt tot het antwoord ja is.
 *   3 · WAT SCHRIJF JE IN details_json zodat /admin het toont zoals bij een
 *       losse bestelling? (`lookDetails`) — dezelfde sleutels die het
 *       bestelformulier post: style, background_hex, background, ratio, model.
 *
 * ── WAT "GEZET" BETEKENT, PER DIENST ────────────────────────────────────────
 *
 *   catalog   : een achtergrond. Het gezicht mag leeg ("wij kiezen er een" is
 *               op het bestelformulier ook een echt antwoord).
 *   lifestyle : een look (een van de huisstijlen). Het gezicht mag leeg.
 *   video     : een rij bestaat (gezicht of niets — er is niets anders te
 *               kiezen; de rij zelf is de keuze).
 *
 * Strenger dan dit — ook een gezicht eisen — zou een klant die bewust "wij
 * kiezen" wil, tegenhouden. Losser — alleen een rij — zou een lifestyle-set
 * zonder look laten maken, en dat is precies de vraag die de studio dan alsnog
 * moet stellen.
 */
import { RECOMMENDED as BACKGROUNDS } from '../data/backgrounds.js';
import { ratioById } from '../data/ratios.js';
import { styles as LOOKS } from '../data/styles.js';

/* Alleen de vaste huisstijlen: `custom` in styles.js is een aanvraag en geen look
   (8 oktober 2026, punt 9.01, §17.18 — zie dezelfde regel in account.js). */
const LOOK_IDS = LOOKS.filter((x) => !x.priceTrust).map((x) => x.slug);
/* ── EEN EIGEN LOOK ALS VASTE LOOK — 23 september 2026 ─────────────────────
   Lucas: *"custom stylen moeten eerst gemaakt worden voor ze via het abonnement
   met credits gekocht kunnen worden."* Een eigen look van de klant
   (customer_styles, migratie 0040) staat in de lock als `cs-<id>` — dezelfde
   vorm als het bestelformulier post. Of hij van déze klant en ACTIEF is, toetst
   lockSection() in account.js bij het opslaan; een voorgestelde look (offerte
   nog open) komt daar niet doorheen. Hier hoeft alleen de vorm te kloppen. */
const EIGEN_LOOK = /^cs-\d{1,9}$/;
export function isEigenLook(look) { return EIGEN_LOOK.test(String(look || '')); }
/** Een geldige vaste lifestyle-look: een huisstijl of een eigen look. */
export function lookGeldig(look) {
  const l = String(look || '');
  return LOOK_IDS.includes(l) || isEigenLook(l);
}
/* Dezelfde drie als customer_style_locks.style (migratie 0003) en STYLES in
   account.js — de ids van PER_PRODUCT. Hier uitgeschreven omdat dit bestand ook
   vanuit subscription.js geladen wordt en pricing.js daar niet voor hoeft. */
const LOCK_STYLES = ['catalog', 'lifestyle', 'video'];

/** Welke dienst(en) een slot van deze soort raakt. Onbekende soort → catalog. */
export function dienstenVoorKind(kind) {
  const k = String(kind || 'complete');
  if (k === 'complete') return ['catalog', 'lifestyle'];
  if (k === 'catalog' || k === 'lifestyle') return [k];
  if (k.startsWith('video') || k === 'hooks') return ['video'];
  return ['catalog'];
}

/** De rijen uit customer_style_locks van één klant, op stijl. */
export async function laadLocks(env, customerId) {
  const uit = {};
  if (!env?.DB || !customerId) return uit;
  try {
    const { results } = await env.DB.prepare(
      `SELECT l.*, m.label AS custom_label
         FROM customer_style_locks l
         LEFT JOIN custom_models m ON m.id = l.custom_model_id
        WHERE l.customer_id = ?1`
    ).bind(customerId).all();
    for (const l of results || []) if (LOCK_STYLES.includes(l.style)) uit[l.style] = l;
  } catch { /* geen locks is een leeg antwoord, geen fout */ }
  return uit;
}

/** Is de look voor deze dienst gezet? Zie de kop voor wat "gezet" is. */
export function lookGezet(lock, stijl) {
  if (!lock) return false;
  if (stijl === 'catalog') return /^#[0-9A-F]{6}$/i.test(String(lock.background_hex || ''));
  if (stijl === 'lifestyle') return lookGeldig(lock.look);
  return true;
}

/**
 * De poort: `{ ok, ontbreekt }` — ontbreekt is de lijst diensten waarvoor de
 * look nog niet gezet is. Leeg betekent: vastzetten mag.
 */
export function lookCompleet(locks, kind) {
  const ontbreekt = dienstenVoorKind(kind).filter((s) => !lookGezet(locks?.[s], s));
  return { ok: ontbreekt.length === 0, ontbreekt };
}

/** Het gezicht zoals het bestelformulier het post: 'c12', 'ava', of ''. */
export function gezichtVan(lock) {
  if (!lock) return '';
  if (lock.custom_model_id) return `c${lock.custom_model_id}`;
  return String(lock.roster_model || '').trim();
}

/**
 * De sleutels voor details_json van een abonnementsbestelling, uit de vaste
 * look van de klant — in de vorm die /admin en de werkmap al lezen.
 *
 * Bij een week met alleen catalogslots komt de catalogverhouding in `ratio`;
 * bij lifestyle of complete de lifestyleverhouding (dat is de verhouding van
 * de carrousel, en die is bij complete het enige beeld dat niet 4:5 is).
 * De andere staat ernaast als `ratio_catalog` / `ratio_lifestyle`, zodat de
 * studio beide ziet.
 */
export function lookDetails(locks, kinds) {
  const diensten = new Set();
  for (const k of kinds || []) for (const s of dienstenVoorKind(k)) diensten.add(s);
  const d = {};
  const cat = locks?.catalog, ls = locks?.lifestyle, vid = locks?.video;

  if (diensten.has('catalog') && cat) {
    const hex = String(cat.background_hex || '').toUpperCase();
    if (hex) {
      d.background_hex = hex;
      const bg = BACKGROUNDS.find((b) => b.hex.toUpperCase() === hex);
      if (bg) d.background = bg.id;
    }
    if (cat.ratio && ratioById(cat.ratio, 'catalog')) d.ratio_catalog = String(cat.ratio);
    const g = gezichtVan(cat); if (g) d.model_catalog = g;
  }
  if (diensten.has('lifestyle') && ls) {
    if (lookGeldig(ls.look)) d.style = String(ls.look);
    if (ls.ratio && ratioById(ls.ratio, 'lifestyle')) d.ratio_lifestyle = String(ls.ratio);
    const g = gezichtVan(ls); if (g) d.model_lifestyle = g;
  }
  if (diensten.has('video') && vid) {
    const g = gezichtVan(vid); if (g) d.model_video = g;
  }
  /* Eén `ratio` en één `model`, zoals een losse bestelling: de lifestylekant
     wint als hij er is (zie de kop), anders catalog, anders video. */
  d.ratio = d.ratio_lifestyle || d.ratio_catalog || undefined;
  d.model = d.model_lifestyle || d.model_catalog || d.model_video || undefined;
  if (!d.ratio) delete d.ratio;
  if (!d.model) delete d.model;
  /* De kanalen — orderbreed, dezelfde sleutel als het bestelformulier. */
  const kanalen = [cat?.channels, ls?.channels].map((c) => String(c || '').trim()).filter(Boolean);
  if (kanalen.length) d.channels = [...new Set(kanalen.join(',').split(',').map((v) => v.trim()).filter(Boolean))].join(',');
  return d;
}

/** Een leesbare regel per dienst, voor het overzicht en de mail. */
export function lookRegel(lock, stijl, lang = 'nl') {
  if (!lock) return '';
  const nl = lang === 'nl';
  const delen = [];
  if (stijl === 'catalog') {
    const hex = String(lock.background_hex || '').toUpperCase();
    const bg = BACKGROUNDS.find((b) => b.hex.toUpperCase() === hex);
    if (bg) delen.push(bg.name?.[nl ? 'nl' : 'en'] || bg.name?.en || hex); else if (hex) delen.push(hex);
  }
  if (stijl === 'lifestyle') {
    const look = LOOKS.find((x) => x.slug === String(lock.look || ''));
    if (look) delen.push(look.name);
  }
  if (lock.custom_model_id) delen.push(lock.custom_label ? `${nl ? 'eigen merkmodel' : 'own brand model'} · ${lock.custom_label}` : (nl ? 'eigen merkmodel' : 'own brand model'));
  else if (lock.roster_model) delen.push(String(lock.roster_model).replace(/^./, (c) => c.toUpperCase()));
  const r = lock.ratio ? ratioById(lock.ratio, stijl) : null;
  if (r) delen.push(r.label);
  return delen.join(' · ');
}


/* ══════════════════════════════════════════════════════════════════════════════
 * DE VASTE LOOK VULT ZICHZELF — 8 oktober 2026 (punt 2.08)
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * "Na de eerste betaalde bestelling per dienst (ook de €1-proef) worden look,
 * gezicht, verhouding, achtergrond en kanalen als vaste look bewaard, als die
 * nog leeg is." Hier: na elke betaling (Mollie, credits, volledig tegoed) kijkt
 * deze functie of de vaste look voor die dienst nog niet gezet is (lookGezet()
 * hierboven); zo ja, dan komen de keuzes van de bestelling erin. Een look die de
 * klant zelf zette, wordt nooit overschreven: alleen lege velden worden gevuld
 * (COALESCE), en alleen zolang de look niet gezet is.
 *
 * NIET MEE: de look "op aanvraag" (custom, §17.18 — lookGeldig() houdt hem
 * tegen), een gezicht "wij kiezen" (MODEL_ANY), een eigen merkmodel van een
 * andere klant, en alles wat niet in de lijsten staat (ratios.js, channels.js).
 * `bron_order_id` (migratie 0063) onthoudt de bestelling, zodat Studio kan
 * zeggen waar de keuzes vandaan komen.
 *
 * Nooit werpen: de betaling is belangrijker dan dit gemak.
 */
import { herbestelDienst } from './herbestel.js';
import { ROSTER, modelId, MODEL_ANY } from '../data/models.js';
import { CHANNEL_IDS } from '../data/channels.js';

const ROSTER_IDS = new Set(ROSTER.map((m) => modelId(m.name)));

function detailsVan(o) {
  if (o && typeof o.details_json === 'object' && o.details_json) return o.details_json;
  try { return JSON.parse((o && o.details_json) || '{}') || {}; } catch { return {}; }
}

/**
 * Wat er uit een bestelling als vaste look voor zijn dienst mee kan. Geeft
 * { dienst, velden } (velden alleen wat geldig is) of null zonder dienst.
 */
export function lookUitBestelling(o) {
  const dienst = herbestelDienst(o);
  if (!dienst) return null;
  const d = detailsVan(o);
  const velden = {};
  if (dienst === 'catalog') {
    const hex = String(d.background_hex || '').replace(/^#/, '').toUpperCase();
    if (/^[0-9A-F]{6}$/.test(hex)) velden.background_hex = `#${hex}`;
  }
  if (dienst === 'lifestyle' && lookGeldig(d.style)) velden.look = String(d.style);
  const r = ratioById(String(d.ratio || ''), dienst);
  /* Niet de vorm van een kanaal (Zalando, 1:1,44 — 14 oktober 2026): die staat
     niet tussen de tegels van de vaste look, en het kanaal zelf gaat hieronder
     mee en zet hem in het formulier weer vast. */
  if (r && !r.channel) velden.ratio = r.id;
  const face = String(d.model || d.model_p1 || '').trim().toLowerCase();
  if (face && face !== MODEL_ANY) {
    const eigen = /^c(\d{1,9})$/.exec(face);
    if (eigen) velden.custom_model_id = Number(eigen[1]);
    else if (ROSTER_IDS.has(face)) velden.roster_model = face;
  }
  const kanalen = String(d.channels || '').split(',').map((v) => v.trim()).filter((v) => CHANNEL_IDS.includes(v));
  if (kanalen.length) velden.channels = [...new Set(kanalen)].join(',');
  return { dienst, velden };
}

/**
 * Na een betaalde bestelling: de vaste look van die dienst vullen als hij nog
 * leeg is. Geeft { dienst, gevuld: true|false, reden? }.
 */
export async function vulVasteLookAan(env, orderId) {
  const DB = env?.DB;
  if (!DB || !orderId) return { gevuld: false, reden: 'geen-db' };
  try {
    const o = await DB.prepare(
      `SELECT id, customer_id, service, details_json, payment_status, status FROM orders WHERE id = ?1`
    ).bind(orderId).first();
    if (!o?.customer_id || o.status === 'cancelled') return { gevuld: false, reden: 'geen-klant' };
    if (!['paid', 'credits'].includes(String(o.payment_status || ''))) return { gevuld: false, reden: 'niet-betaald' };
    const uit = lookUitBestelling(o);
    if (!uit) return { gevuld: false, reden: 'geen-dienst' };
    const { dienst, velden } = uit;
    const nu = await DB.prepare('SELECT * FROM customer_style_locks WHERE customer_id = ?1 AND style = ?2')
      .bind(o.customer_id, dienst).first();
    if (lookGezet(nu, dienst)) return { dienst, gevuld: false, reden: 'al-gezet' };
    /* Zonder look voor de dienst (geen achtergrond / geen huisstijl) valt er
       niets vast te leggen dat de poort "gezet" zou maken. */
    if (dienst === 'catalog' && !velden.background_hex) return { dienst, gevuld: false, reden: 'leeg' };
    if (dienst === 'lifestyle' && !velden.look) return { dienst, gevuld: false, reden: 'leeg' };
    /* Een eigen merkmodel alleen als het van deze klant is. */
    if (velden.custom_model_id) {
      const m = await DB.prepare('SELECT id FROM custom_models WHERE id = ?1 AND customer_id = ?2').bind(velden.custom_model_id, o.customer_id).first().catch(() => null);
      if (!m) delete velden.custom_model_id;
    }
    await DB.prepare(
      `INSERT INTO customer_style_locks (customer_id, style, background_hex, look, ratio, roster_model, custom_model_id, channels, bron_order_id, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, datetime('now'))
       ON CONFLICT (customer_id, style) DO UPDATE SET
         background_hex  = COALESCE(customer_style_locks.background_hex, excluded.background_hex),
         look            = COALESCE(customer_style_locks.look, excluded.look),
         ratio           = COALESCE(customer_style_locks.ratio, excluded.ratio),
         roster_model    = CASE WHEN customer_style_locks.custom_model_id IS NULL THEN COALESCE(customer_style_locks.roster_model, excluded.roster_model) ELSE customer_style_locks.roster_model END,
         custom_model_id = CASE WHEN customer_style_locks.roster_model IS NULL THEN COALESCE(customer_style_locks.custom_model_id, excluded.custom_model_id) ELSE customer_style_locks.custom_model_id END,
         channels        = COALESCE(customer_style_locks.channels, excluded.channels),
         bron_order_id   = excluded.bron_order_id,
         updated_at      = datetime('now')`
    ).bind(o.customer_id, dienst, velden.background_hex || null, velden.look || null, velden.ratio || null,
      velden.custom_model_id ? null : (velden.roster_model || null), velden.custom_model_id || null,
      velden.channels || null, o.id).run();
    return { dienst, gevuld: true };
  } catch (err) {
    console.error('[vaste look] niet aangevuld uit bestelling', orderId, '—', err?.message || err);
    return { gevuld: false, reden: 'fout' };
  }
}
