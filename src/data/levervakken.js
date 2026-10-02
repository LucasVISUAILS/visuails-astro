/**
 * VISUAILS — WELKE BEELDEN EEN BESTELLING TERUGKRIJGT, PER DIENST
 * 2 oktober 2026 (ronde 9, F17).
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Tot vandaag kende de hele leverkant (het werkbord in /admin, de namen in
 * Studio, de bestandsnamen in de map) maar één set vakjes: de vier van een
 * catalogset — voorkant, achterkant, detail, op model. Dat klopte voor catalog
 * zonder extra hoeken en voor niets anders:
 *
 *   · een LIFESTYLEcarrousel levert drie beelden. Het bord zei "0 van 12
 *     vakjes" bij drie producten, na levering "9 van 12", en de klant zag zijn
 *     drie sfeerbeelden in Studio als "Voorkant · Achterkant · Detail";
 *   · een catalogset met BIJBESTELDE HOEKEN (driekwart, flat-lay, …) had voor
 *     die hoeken geen vakje. Betaald, en nergens te leveren.
 *
 * DE OPSLAG VERANDERT NIET. Een lifestylebeeld blijft in `files.shot` als
 * front/back/detail staan, en een extra hoek als extra1…extraN — de namen die
 * /api/upload, R2 en de oude leveringen al kennen. Wat hier verandert is wat
 * er OVER die sleutels gezegd wordt, per dienst. Zo hoeft er geen migratie te
 * draaien en blijft elke bestaande levering gewoon leesbaar.
 *
 * WAAR DE HOEKEN VANDAAN KOMEN. Het bestelformulier stuurt `extra_slots` mee:
 * "extra1:three-quarter,extra2:flat-lay" (zie pipeline.js, "HET NUMMER BLIJFT
 * BIJ DE HOEK"). Dat veld is de koppeling tussen een vaknummer en een hoek, en
 * het is de enige plek waar die koppeling staat — dus wordt hij hier gelezen
 * en niet opnieuw afgeleid uit de angle_*-vinkjes.
 */
import { SHOTS } from './shots.js';
import { angleById, isEigenAngleId } from './angles.js';

const LIFESTYLE = [
  { id: 'front', nl: 'Beeld 1', en: 'Image 1', woord: { nl: 'beeld-1', en: 'image-1' } },
  { id: 'back', nl: 'Beeld 2', en: 'Image 2', woord: { nl: 'beeld-2', en: 'image-2' } },
  { id: 'detail', nl: 'Beeld 3', en: 'Image 3', woord: { nl: 'beeld-3', en: 'image-3' } },
];

const BASIS_WOORD = {
  front: { nl: 'voorkant', en: 'front' },
  back: { nl: 'achterkant', en: 'back' },
  detail: { nl: 'detail', en: 'detail' },
  worn: { nl: 'op-model', en: 'on-model' },
};

const CATALOG = SHOTS.map((s) => ({
  id: s.id,
  nl: s.id === 'worn' ? 'Op een model' : s.name.nl,
  en: s.id === 'worn' ? 'On a model' : s.name.en,
  woord: BASIS_WOORD[s.id] || { nl: s.id, en: s.id },
}));

function details(d) {
  if (!d) return {};
  if (typeof d === 'string') { try { return JSON.parse(d) || {}; } catch { return {}; } }
  return typeof d === 'object' ? d : {};
}

const slug = (s) => String(s || '').toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

/** De bijbestelde hoeken van één bestelling, in vaknummervolgorde. */
export function extraVakken(det) {
  const d = details(det);
  const ruw = String(d.extra_slots || '').trim();
  if (!ruw) return [];
  const uit = [];
  for (const deel of ruw.split(',')) {
    const [vak, hoek] = deel.split(':').map((x) => String(x || '').trim());
    if (!/^extra[1-9][0-9]?$/.test(vak) || !hoek) continue;
    const a = angleById(hoek);
    let nl; let en;
    if (a) { nl = a.name.nl; en = a.name.en; }
    else if (isEigenAngleId(hoek)) {
      /* De zelfbedachte hoek heeft geen vaste naam: de klant typte hem. */
      const eigen = String(d[`angle_note_${hoek}`] || '').trim().slice(0, 40);
      nl = eigen || 'Eigen hoek'; en = eigen || 'Own angle';
    } else { nl = `Extra hoek ${vak.slice(5)}`; en = `Extra angle ${vak.slice(5)}`; }
    uit.push({ id: vak, nl, en, woord: { nl: slug(nl) || vak, en: slug(en) || vak }, hoek });
  }
  return uit.sort((x, y) => Number(x.id.slice(5)) - Number(y.id.slice(5)));
}

/**
 * De vakjes die een product van deze bestelling terugkrijgt.
 * @param {string} service  orders.service
 * @param {object|string} det  details_json (object of tekst)
 */
export function leverVakken(service, det) {
  const s = String(service || '');
  if (s === 'lifestyle') return LIFESTYLE;
  return [...CATALOG, ...extraVakken(det)];
}

/** De naam van één vakje zoals een mens hem leest, of null als het vak onbekend is. */
export function vakNaam(service, det, shot, lang = 'nl') {
  const v = leverVakken(service, det).find((x) => x.id === shot);
  if (!v) return null;
  return lang === 'en' ? v.en : v.nl;
}

/** Het woord in de bestandsnaam: `beeld-1`, `driekwart`, `voorkant`. */
export function vakWoord(service, det, shot, lang = 'nl') {
  const v = leverVakken(service, det).find((x) => x.id === shot);
  if (!v) return null;
  return v.woord[lang === 'en' ? 'en' : 'nl'];
}

/** Alle sleutels die op het werkbord een vakje mogen vullen. */
export function vakIds(service, det) {
  return leverVakken(service, det).map((v) => v.id);
}
