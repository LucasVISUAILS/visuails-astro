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

const LOOK_IDS = LOOKS.map((x) => x.slug);
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

