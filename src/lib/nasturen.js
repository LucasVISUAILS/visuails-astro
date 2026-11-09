/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * FOTO'S NASTUREN, OOK OP DE BESTELPAGINA — 9 november 2026 (ronde 91, K-02)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas koos in lijst 85 (A2 = goed): de bevestiging en de betaalmail noemen per
 * product welke foto's ontbreken, met de knop "Foto's toevoegen", en op de
 * privélink (de bestelpagina, /o/<token>) vult de klant het lege vak zelf. Tot
 * vandaag stuurde die knop hem naar de inlog van Studio (mailadres, code, zoeken),
 * precies de stap waar klanten afhaken; en Lucas appte na een dag met een vaste
 * tekst.
 *
 * WAT HIER STAAT, EN WAT NIET.
 *   · nasturenOpen(): de ene regel "mag er nog een foto bij" — Studio
 *     (account.js) en de bestelpagina (portal.js) lezen hem allebei hier, zodat
 *     ze nooit iets anders zeggen. Tot Geleverd (Lucas, V31-1 = b).
 *   · bewaarVakFotos(): een foto in een LEEG vak van de bestelling, met dezelfde
 *     keuring, dezelfde daggrens per aansluiting en dezelfde opslag (R2
 *     `aangeleverd/<ref>/…`, een rij in `files` met product_key en shot) als
 *     handleOrderFotos() in account.js. Een vol vak blijft vol: vervangen en
 *     verwijderen van extra foto's blijft iets voor Studio, waar de klant
 *     ingelogd is.
 *
 * HET TOKEN IS HET BEWIJS. Wie de link heeft, kan foto's toevoegen; de link is al
 * "de sleutel tot je bestelling" (levermail, bevestiging). De bestelpagina heeft
 * daarom een eigen grens bovenop de daggrens van /api/upload (portal.js).
 *
 * Geen DOM; de Worker en de toetsen laden dit.
 */
import { MAX_BATCH_FILES, MAX_FILE_BYTES, safeName, typeFor } from './uploads.js';
import { checkRate } from './ratelimit.js';
import { isBeeldHandtekening, UPLOAD_DAG } from '../../functions/api/upload.js';
import { ontbrekendRegels, ontbrekendVoorOrder, vakNaam as ontbreektVakNaam, bijbesteldeHoeken } from './ontbreekt.js';
import { SHOTS as FOTOVAKKEN } from '../data/shots.js';
import { notifyFotosToegevoegd } from './notify.js';

/** De diensten met fotovakken per product. */
export const NASTUUR_DIENSTEN = new Set(['catalog', 'lifestyle', 'drop']);
/** Tot Geleverd: ontvangen, in productie en wordt nagekeken. */
export const NASTUUR_STATUS = new Set(['received', 'in_production', 'human_check']);
/** Hoeveel foto's per keer (de verzoeklimiet van de Worker; zelfde getal als Studio). */
export const NASTUUR_PER_KEER = 12;

/** Mag de klant bij deze bestelling nog foto's nasturen? Eén regel voor Studio en de bestelpagina. */
export function nasturenOpen(o) {
  return !!o && NASTUUR_DIENSTEN.has(String(o.service || ''))
    && NASTUUR_STATUS.has(String(o.status || '')) && !o.closed_at;
}

/** De veldnaam van één vak: `vak_p3_back`. Dezelfde vorm als in Studio. */
export const vakVeld = (key, shotId) => `vak_${key}_${shotId}`;
const VAK_VELD = /^vak_(p[1-9][0-9]{0,2})_([a-z]+(?:[1-9][0-9]?)?)$/;

/**
 * Zet de gekozen foto's in hun lege vak.
 *
 * @param {object} env
 * @param {{ order: { order_id?: number, id?: number, ref: string, status: string, lang?: string, product_count?: number, details_json?: string },
 *           form: FormData, ip: string, bron?: string }} o
 * @returns {Promise<{ aantal: number, mis: number, dagVol: boolean }>}
 */
export async function bewaarVakFotos(env, { order, form, ip, bron = 'privelink' }) {
  const orderId = Number(order.order_id ?? order.id);
  const uit = { aantal: 0, mis: 0, dagVol: false };
  if (!env?.UPLOADS || !env?.DB || !Number.isInteger(orderId) || orderId <= 0) return uit;

  const bestaand = await env.DB.prepare(
    "SELECT id, product_key, shot FROM files WHERE order_id = ?1 AND kind = 'upload'"
  ).bind(orderId).all().then((r) => r.results || []).catch(() => []);
  const gevuld = new Set(bestaand.filter((f) => f.product_key && f.shot).map((f) => `${f.product_key}|${f.shot}`));
  const n = Math.min(Number(order.product_count) || 0, 200);
  let det = {};
  try { det = JSON.parse(order.details_json || '{}') || {}; } catch { det = {}; }
  const hoeken = bijbesteldeHoeken(det);
  const hoekNamen = Object.fromEntries(hoeken.map((h) => [h.id, { nl: h.nl, en: h.en }]));
  const vakIds = new Set([...FOTOVAKKEN.map((s) => s.id), ...hoeken.map((h) => h.id)]);

  const kandidaten = [];
  for (const [veld, f] of (form ? form.entries() : [])) {
    if (!f || typeof f !== 'object' || typeof f.arrayBuffer !== 'function' || !(f.size > 0)) continue;
    const m = VAK_VELD.exec(veld);
    if (!m) { uit.mis += 1; continue; }
    const [, key, shotId] = m;
    const nr = Number(key.slice(1)) || 0;
    if (nr < 1 || nr > n || !vakIds.has(shotId) || gevuld.has(`${key}|${shotId}`)) { uit.mis += 1; continue; }
    gevuld.add(`${key}|${shotId}`);
    kandidaten.push({ f, key, shot: shotId });
  }
  const ruimte = Math.max(0, Math.min(NASTUUR_PER_KEER, MAX_BATCH_FILES - bestaand.length));
  uit.mis += Math.max(0, kandidaten.length - ruimte);

  const rijen = [];
  const vakken = [];
  for (const [i, { f, key, shot: shotId }] of kandidaten.slice(0, ruimte).entries()) {
    /* Dezelfde keuring als /api/upload en Studio, in dezelfde volgorde: te groot,
       onbekend type, en niet te lezen als beeld. Een bestand dat afvalt stopt de rest niet. */
    if (f.size > MAX_FILE_BYTES) { uit.mis += 1; continue; }
    const naam = safeName(f.name || `foto-${i + 1}`);
    const type = typeFor(f.name || naam);
    if (!type) { uit.mis += 1; continue; }
    let beeld = false;
    try { beeld = isBeeldHandtekening(new Uint8Array(await f.slice(0, 16).arrayBuffer())); } catch { beeld = false; }
    if (!beeld) { uit.mis += 1; continue; }
    /* De daggrens per aansluiting, dezelfde tellers als /api/upload en Studio. */
    const stuks = await checkRate(env, { ip, action: 'upload-bestanden-dag', limit: UPLOAD_DAG.bestanden, windowSeconds: 86400 });
    const zwaar = stuks.allowed
      ? await checkRate(env, { ip, action: 'upload-bytes-dag', limit: UPLOAD_DAG.bytes, windowSeconds: 86400, gewicht: f.size })
      : stuks;
    if (!stuks.allowed || !zwaar.allowed) { uit.dagVol = true; uit.mis += 1; continue; }
    const stukje = Array.from(crypto.getRandomValues(new Uint8Array(4)), (b) => b.toString(16).padStart(2, '0')).join('');
    const sleutel = `aangeleverd/${order.ref}/${String(bestaand.length + rijen.length + 1).padStart(3, '0')}-${stukje}-${naam}`;
    try {
      await env.UPLOADS.put(sleutel, await f.arrayBuffer(), {
        httpMetadata: { contentType: type },
        customMetadata: { bron, original: naam, product: key, shot: shotId },
      });
      rijen.push([orderId, sleutel, naam, f.size, key, shotId]);
      vakken.push({ key, shot: shotId });
    } catch (e) {
      uit.mis += 1;
      console.error('[nasturen] foto niet opgeslagen:', e?.message || e);
    }
  }
  if (!rijen.length) return uit;
  try {
    const stmt = env.DB.prepare("INSERT INTO files (order_id, kind, r2_key, filename, bytes, product_key, shot) VALUES (?1, 'upload', ?2, ?3, ?4, ?5, ?6)");
    await env.DB.batch(rijen.map((r) => stmt.bind(...r)));
  } catch (e) {
    console.error('[nasturen] fotorijen niet vastgelegd:', e?.message || e);
    return { aantal: 0, mis: uit.mis + rijen.length, dagVol: uit.dagVol };
  }
  uit.aantal = rijen.length;

  /* Op de tijdlijn, in de taal van de bestelling (de klant leest hem ook), met de
     vakken erbij: zo ziet Lucas in /admin wat er binnenkwam en waar. */
  const taal = order.lang === 'en' ? 'en' : 'nl';
  const vakTekst = (v, tl) => `Product ${String(v.key).replace(/^p/, '')} ${ontbreektVakNaam(v.shot, tl, hoekNamen)}`;
  const regel = `${taal === 'en' ? 'Sent later on the order page' : 'Nagestuurd op de bestelpagina'}: ${vakken.map((v) => vakTekst(v, taal)).join(', ')}`;
  await env.DB.prepare("INSERT INTO order_events (order_id, status, note, actor) VALUES (?1, ?2, ?3, 'customer')")
    .bind(orderId, order.status, regel).run().catch(() => {});
  const nogOpen = await ontbrekendVoorOrder(env.DB, orderId).catch(() => null);
  /* De studiomail "Foto's binnen", zoals bij nasturen in Studio. */
  await notifyFotosToegevoegd(env, {
    orderId, count: uit.aantal,
    vakken: vakken.map((v) => vakTekst(v, 'nl')),
    ontbreekt: nogOpen === null ? null : ontbrekendRegels(nogOpen, 'nl'),
  });
  return uit;
}
