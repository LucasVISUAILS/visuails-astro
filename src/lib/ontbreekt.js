/* ── WAT ER NOG ONTBREEKT, PER PRODUCT — 8 oktober 2026 (punt 2.05) ──────────
 *
 * Eén lijst "wat ontbreekt per vak", en vijf plekken die hem tonen: het
 * tussenscherm van stap 2, Studio (foto's nasturen), de betaalmail (7.01), de
 * studiomail (9.07) en in /admin de bestelrij en het bord. Stond die regel op
 * vijf plekken met de hand, dan zei de mail "alles binnen" terwijl Studio een
 * leeg vak toonde. Daarom één functie, zonder database en zonder DOM, zodat de
 * Worker, de cron, een script en de browser hem allemaal kunnen laden.
 *
 * WAT TELT ALS ONTBREKEND. Alleen de verplichte vakken uit src/data/shots.js
 * (voorkant, achterkant, detail). De draagfoto is optioneel: zonder draagfoto
 * gaan we uit van een normale, rechte pasvorm (5.07), dus die "ontbreekt" nooit.
 *
 * WANNEER WE HET NIET WETEN. Twee gevallen, en dan geeft de functie `null`
 * (onbekend) in plaats van een lijst vol "ontbreekt":
 *   · de bestelling heeft géén upload-rijen. Dan kwam het materiaal buiten het
 *     formulier binnen (WhatsApp, mail, een bestelling die Lucas in /admin
 *     aanmaakte), en "alles ontbreekt" zou een leugen zijn;
 *   · er zit een upload zonder product_key tussen (de route "één hele map
 *     sturen", of een upload van vóór migratie 0005). Dan weten we niet welk
 *     vak die foto vult; een mens kijkt.
 * Lezers tonen bij `null` niets, nooit "alles compleet".
 *
 * ── EN DE BIJBESTELDE HOEKEN — 12 oktober 2026 (afvinklijst 4, k-hoeken = a) ──
 *
 * Wie bij een catalogset een hoek bijbestelt (driekwart, flat-lay, een eigen
 * hoek …), stuurt daar per product één foto van mee: het vak `extra1`…`extraN`
 * (AnglePicker, src/data/angles.js). Die foto is net zo verplicht als de
 * voorkant, en Lucas koos "overal melden, net als voorkant, achterkant en
 * detail". Dus telt hij hier mee. Welke vakken er zijn, staat in één veld van
 * de bestelling, `extra_slots` ("extra1:three-quarter,…"), en dat leest
 * extraVakken() in src/data/levervakken.js — dezelfde lezer als het werkbord en
 * de bestandsnamen. Alleen een hoek die ook als `angle_<id>` in de bestelling
 * staat (de keuze die de rekening telt, /api/order) telt mee; een losse
 * `extra_slots` zonder die keuze is geen bijbestelde hoek.
 *
 * Een hoek heeft geen vaste naam in shots.js, dus krijgt een product waarbij
 * zo'n vak ontbreekt `namen` mee: { extra1: { nl: 'Driekwart', en: … } }.
 * vakNaam() en ontbrekendRegels() lezen die; wie zelf vakNaam() aanroept op een
 * id uit `mist`, geeft `p.namen` mee.
 */
import { REQUIRED_SHOT_IDS, shot } from '../data/shots.js';
import { extraVakken } from '../data/levervakken.js';

/** De bijbestelde hoeken van een bestelling: [{ id: 'extra1', nl, en, hoek }]. */
export function bijbesteldeHoeken(details) {
  if (!details || typeof details !== 'object') return [];
  return extraVakken(details).filter((v) => String(details[`angle_${v.hoek}`] ?? '').trim() !== '');
}

/**
 * @param {{ productCount: number, details?: object, files: {kind?: string, product_key?: string|null, shot?: string|null}[] }} invoer
 * @returns {null | { key: string, index: number, naam: string, mist: string[] }[]}
 *   null = onbekend (zie boven); [] = niets ontbreekt; anders alleen de
 *   producten waar iets ontbreekt, in volgorde p1, p2, …
 */
export function ontbrekendeFotos({ productCount, details, files }) {
  const n = Number(productCount) || 0;
  const uploads = (files || []).filter((f) => !f.kind || f.kind === 'upload');
  if (!n || !uploads.length) return null;
  if (uploads.some((f) => !f.product_key)) return null;

  const gezien = new Map(); // 'p3' -> Set(shot)
  for (const f of uploads) {
    const k = String(f.product_key);
    if (!gezien.has(k)) gezien.set(k, new Set());
    if (f.shot) gezien.get(k).add(String(f.shot));
  }

  /* De vaste verplichte vakken eerst, de bijbestelde hoeken daarna: dezelfde
     volgorde als de vakken op de kaart in stap 2 en in Studio. */
  const hoeken = bijbesteldeHoeken(details);
  const nodig = [...REQUIRED_SHOT_IDS, ...hoeken.map((v) => v.id)];
  const namen = Object.fromEntries(hoeken.map((v) => [v.id, { nl: v.nl, en: v.en }]));

  const uit = [];
  for (let i = 1; i <= n; i++) {
    const key = `p${i}`;
    const heeft = gezien.get(key) || new Set();
    const mist = nodig.filter((id) => !heeft.has(id));
    if (!mist.length) continue;
    const getypt = details && typeof details[`product_${key}`] === 'string' ? details[`product_${key}`].trim() : '';
    const p = { key, index: i, naam: getypt, mist };
    if (mist.some((id) => namen[id])) p.namen = namen;
    uit.push(p);
  }
  return uit;
}

/** De naam van een vak in de taal van de lezer, klein geschreven: "achterkant".
 *  `namen` is `p.namen` van een product uit ontbrekendeFotos(): daar staan de
 *  bijbestelde hoeken ("driekwart"), die shots.js niet kent. */
export function vakNaam(id, lang = 'nl', namen = null) {
  const h = namen && namen[id];
  if (h) return String(h[lang] || h.en || id).toLowerCase();
  const s = shot(id);
  const naam = s ? (s.name[lang] || s.name.en) : id;
  return naam.toLowerCase();
}

/**
 * Eén regel per product: "p4 Hoodie zwart: geen achterkant, geen detail".
 * Dezelfde vorm in de mail, in Studio en in /admin.
 */
export function ontbrekendRegels(lijst, lang = 'nl') {
  if (!lijst) return [];
  const geen = lang === 'nl' ? 'geen' : 'no';
  return lijst.map((p) => {
    const wie = p.naam ? `${p.key} ${p.naam}` : p.key;
    return `${wie}: ${p.mist.map((id) => `${geen} ${vakNaam(id, lang, p.namen)}`).join(', ')}`;
  });
}

/** Hoeveel losse foto's er ontbreken (voor "2 foto’s ontbreken" in /admin). */
export function aantalOntbrekend(lijst) {
  if (!lijst) return 0;
  return lijst.reduce((som, p) => som + p.mist.length, 0);
}

/**
 * Dezelfde lijst rechtstreeks uit D1, voor één bestelling.
 * @param {D1Database} db
 * @param {number} orderId
 */
export async function ontbrekendVoorOrder(db, orderId) {
  if (!db || !orderId) return null;
  const order = await db
    .prepare('SELECT product_count, details_json FROM orders WHERE id = ?1')
    .bind(orderId)
    .first();
  if (!order) return null;
  let details = {};
  try { details = JSON.parse(order.details_json || '{}') || {}; } catch { details = {}; }
  const { results } = await db
    .prepare("SELECT kind, product_key, shot FROM files WHERE order_id = ?1 AND kind = 'upload'")
    .bind(orderId)
    .all();
  return ontbrekendeFotos({ productCount: order.product_count, details, files: results || [] });
}
