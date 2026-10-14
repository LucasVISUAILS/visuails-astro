/* ── "BESTEL MET DEZELFDE LOOK" — 8 oktober 2026 (punt 3.07, en 3.08) ─────────
 *
 * Een merk dat terugkomt wil dat de nieuwe producten naast de oude passen. Dat
 * lukt alleen als dezelfde keuzes terugkomen: dezelfde look, achtergrond,
 * verhouding en hetzelfde gezicht. Deze functie maakt één gewone link naar het
 * formulier met ALLEEN die keuzes erin, en de knoptekst die zegt wat de klant
 * krijgt: "Catalog bestellen — Classic · gebroken wit · 4:5".
 *
 * WAT ER NIET MEEGAAT (V28 = a): naam, KVK, adres, e-mail. De privélink mag
 * gedeeld worden, en een link vol bedrijfsgegevens is een link die je niet
 * doorstuurt. De gegevens komen via "Al eerder bij ons besteld? Log in". Ook
 * extra hoeken, 4K en voorrang gaan niet mee: die kosten geld en mogen niet stil
 * terugkomen.
 *
 * HET FORMULIER LEEST: ?style= (StylePicker en, voor een eigen look cs-<id>,
 * addOwnStyles() in pipeline.js), en sinds vandaag ?bg=, ?ratio= en ?face=
 * (applyLookUitUrl() in pipeline.js). Zonder JavaScript blijven de keuzes leeg en
 * werkt het formulier gewoon.
 *
 * Geen DOM, geen database.
 */
import { getStyle } from '../data/styles.js';
import { getCatalogStyle } from '../data/catalogStyles.js';
import { achtergrondNaam } from '../data/backgrounds.js';
import { ratioById, ratioLabel } from '../data/ratios.js';
import { MODEL_ANY } from '../data/models.js';
import { SAMPLE_SERVICE, creditsVoorDienst, ladderFloor, euro } from '../data/pricing.js';

const T = {
  nl: {
    dienst: { catalog: 'Catalog', lifestyle: 'Lifestyle' },
    knop: (dienst, delen) => (delen.length ? `${dienst} bestellen — ${delen.join(' · ')}` : `${dienst} bestellen in dezelfde look`),
    proefKnop: 'Bestel in deze look',
    kop: 'Meer producten in deze look?',
    credits: (n) => `${n} credits per product`,
    vanaf: { catalog: (b) => `catalogfoto’s vanaf ${b} per product`, lifestyle: (b) => `lifestylecarrousels vanaf ${b} per product` },
    eigenLook: 'eigen look',
    uitleg: 'Opent het bestelformulier met dezelfde keuzes. Je gegevens vul je daar zelf in, of je logt in.',
  },
  en: {
    dienst: { catalog: 'Catalog', lifestyle: 'Lifestyle' },
    knop: (dienst, delen) => (delen.length ? `Order ${dienst} — ${delen.join(' · ')}` : `Order ${dienst} in the same look`),
    proefKnop: 'Order in this look',
    kop: 'More products in this look?',
    credits: (n) => `${n} credits per product`,
    vanaf: { catalog: (b) => `catalog photos from ${b} per product`, lifestyle: (b) => `lifestyle carousels from ${b} per product` },
    eigenLook: 'own look',
    uitleg: 'Opens the order form with the same choices. You fill in your details there, or sign in.',
  },
};

function details(o) {
  if (o && typeof o.details_json === 'object' && o.details_json) return o.details_json;
  try { return JSON.parse((o && o.details_json) || '{}') || {}; } catch { return {}; }
}

/** De dienst van het formulier: catalog of lifestyle (een proef volgt zijn sample_type). */
export function herbestelDienst(o) {
  if (!o) return null;
  if (o.service === 'catalog' || o.service === 'lifestyle') return o.service;
  if (o.service === SAMPLE_SERVICE) return String(details(o).sample_type || '').toLowerCase() === 'lifestyle' ? 'lifestyle' : 'catalog';
  return null;
}

/**
 * De link en de tekst, of null voor een dienst zonder formulier om naar terug te
 * gaan (video, eigen look op aanvraag, merkmodel, abonnement).
 *
 * @param {object} o  de bestelling (service, details_json)
 * @param {{ lang?: 'nl'|'en', abonnee?: boolean }} [opts]
 * @returns {null | { href: string, label: string, delen: string[], kop: string, uitleg: string, credits: string, vanaf: string, proef: boolean }}
 */
export function herbestelKnop(o, { lang = 'nl', abonnee = false } = {}) {
  const dienst = herbestelDienst(o);
  if (!dienst) return null;
  const L = lang === 'en' ? 'en' : 'nl';
  const t = T[L];
  const d = details(o);
  const q = [];
  const delen = [];

  /* De look. Catalog heeft één huislook (Classic); lifestyle een slug of een eigen look. */
  if (dienst === 'lifestyle') {
    const stijl = String(d.style || '');
    if (/^cs-\d{1,9}$/.test(stijl)) { q.push(['style', stijl]); delen.push(t.eigenLook); }
    else {
      const s = /^[a-z-]{2,24}$/.test(stijl) ? getStyle(stijl) : null;
      if (s) { q.push(['style', s.slug]); delen.push(s.name); }
    }
  } else {
    const c = getCatalogStyle('classic');
    if (c) delen.push(c.name);
  }

  /* De achtergrond (alleen catalog): als hexcode, zodat ook een eigen kleur meekomt. */
  if (dienst === 'catalog') {
    const hex = String(d.background_hex || '').replace(/^#/, '').toUpperCase();
    if (/^[0-9A-F]{6}$/.test(hex)) {
      q.push(['bg', hex]);
      const naam = achtergrondNaam(`#${hex}`, L);
      delen.push(naam ? naam.toLowerCase() : `#${hex}`);
    }
  }

  /* De verhouding van de hele bestelling. */
  const r = ratioById(String(d.ratio || ''), dienst);
  if (r) { q.push(['ratio', r.id]); delen.push(ratioLabel(r, L)); }

  /* Het gezicht: de standaard van de bestelling, of het gezicht van product 1. */
  const face = String(d.model || d.model_p1 || '');
  if (face && face !== MODEL_ANY && /^[a-z0-9-]{1,24}$/.test(face)) q.push(['face', face]);

  const pad = `${L === 'nl' ? '/nl' : ''}/start/${dienst}/`;
  const qs = q.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  const proef = o.service === SAMPLE_SERVICE;
  const per = creditsVoorDienst(dienst, 1);
  return {
    href: qs ? `${pad}?${qs}` : pad,
    label: proef ? t.proefKnop : t.knop(t.dienst[dienst], delen),
    delen,
    kop: t.kop,
    uitleg: t.uitleg,
    credits: abonnee && per ? t.credits(per) : '',
    /* De vanaf-regel uit de staffel (LADDER, onderste trede), nooit getypt. */
    vanaf: t.vanaf[dienst](euro(ladderFloor(dienst), L)),
    proef,
  };
}

/** De knop als HTML voor de privélink (portal.css) — geen script, een gewone link. */
export function herbestelHtml(k, esc) {
  if (!k) return '';
  const regel = [k.proef ? k.vanaf : '', k.credits].filter(Boolean).join(' · ');
  return `<section class="herbestel" aria-labelledby="herbestel-h">
  <h2 id="herbestel-h">${esc(k.kop)}</h2>
  <p class="herbestel-knop"><a class="btn${k.proef ? ' btn-primary' : ''}" href="${esc(k.href)}">${esc(k.label)}</a></p>
  ${k.proef && k.delen.length ? `<p class="herbestel-delen">${esc(k.delen.join(' · '))}</p>` : ''}
  ${regel ? `<p class="herbestel-regel">${esc(regel)}</p>` : ''}
  <p class="herbestel-uitleg">${esc(k.uitleg)}</p>
</section>`;
}
