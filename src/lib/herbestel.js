/* ── "BESTEL MET DEZELFDE LOOK" — 8 oktober 2026 (punt 3.07, en 3.08) ─────────
 *
 * Een merk dat terugkomt wil dat de nieuwe producten naast de oude passen. Dat
 * lukt alleen als dezelfde keuzes terugkomen: dezelfde look, achtergrond,
 * verhouding en hetzelfde gezicht. Deze functie maakt één gewone link naar het
 * formulier met ALLEEN die keuzes erin, en de knoptekst die zegt wat de klant
 * krijgt: "Catalog bestellen — Classic · lichtgrijs · 4:5".
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
import { beeldAchtergrondInstellingen } from '../data/beeldachtergrond.js';
import { ratioById, ratioLabel } from '../data/ratios.js';
import { MODEL_ANY } from '../data/models.js';
import { SAMPLE_SERVICE, creditsVoorDienst, ladderFloor, euro, FORM_MAX_PRODUCTS } from '../data/pricing.js';
/* Levering 60: de indeling van de complete looks gaat mee (afvinklijst 38, d-kopie). */
import { looksVan } from '../data/looks.js';
import { ANGLE_IDS, EIGEN_ANGLE_IDS } from '../data/angles.js';

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

/* ── OPNIEUW BESTELLEN MET ALLE INSTELLINGEN — 15 oktober 2026 (werklijst 33) ──
 *
 * Lucas bij k-hoeken: *"de klant wanneer hij de bestelling in /studio heeft staan
 * hem de order settings van een specifieke order laten kopiëren zodat alle extra
 * angles en alles er al goed in staat en hij het alleen hoeft na te lopen."*
 *
 * Waar "Bestel met dezelfde look" hierboven bewust alleen de look meeneemt (V28 =
 * a: wat geld kost, komt niet stil terug), neemt deze knop ALLES mee wat bij de
 * bestelling hoort en niet bij de producten: de look, de achtergrond, de
 * verhouding, het gezicht, de kanalen, de extra hoeken (met wat de klant bij een
 * eigen hoek typte) en de notitie. Niet stil: het formulier zet bovenaan wat er
 * is overgenomen, en de klant loopt het na. Wat NIET meegaat: de producten en de
 * foto's (die zijn nieuw), voorrang (die hoort bij een datum), en de gegevens.
 *
 * De link draagt alleen het nummer van de bestelling (?van=<id>) plus de
 * lookkeuzes van hierboven, zodat de look ook zonder script meekomt. De rest
 * haalt het formulier op bij GET /account/orders/<id>/instellingen, achter de
 * sessie en alleen voor de eigenaar: een notitie hoort niet in een URL.
 */
const T_ALLES = {
  nl: {
    label: 'Opnieuw bestellen met alle instellingen',
    wat: { catalog: 'het aantal producten, de stijl, de achtergrond (ook per foto), de verhouding, het model, de kanalen en de extra hoeken', lifestyle: 'het aantal producten, de look, de verhouding (ook per foto), het model en welke producten samen een look zijn; je bericht neem je met één klik over' },
    uitleg: (wat) => `Neemt alles van deze bestelling over: ${wat}. Je loopt het na voordat je bestelt; je producten en foto’s voeg je zelf toe.`,
  },
  en: {
    label: 'Order again with all settings',
    wat: { catalog: 'the number of products, the style, the background (per photo too), the aspect ratio, the model, the channels and the extra angles', lifestyle: 'the number of products, the look, the aspect ratio (per photo too), the model and which products make a look; you copy your message with one click' },
    uitleg: (wat) => `Copies everything from this order: ${wat}. You check it before you order; you add your products and photos yourself.`,
  },
};

const BEKENDE_HOEKEN = new Set([...ANGLE_IDS, ...EIGEN_ANGLE_IDS]);

/** De knop in Studio, of null (geen formulier, proef, of geannuleerd). */
export function herbestelAllesKnop(o, { lang = 'nl' } = {}) {
  if (!o || o.status === 'cancelled' || o.service === SAMPLE_SERVICE) return null;
  const dienst = herbestelDienst(o);
  if (!dienst) return null;
  const L = lang === 'en' ? 'en' : 'nl';
  const look = herbestelKnop(o, { lang: L });
  const basis = look ? look.href : `${L === 'nl' ? '/nl' : ''}/start/${dienst}/`;
  const id = Number(o.id) || 0;
  if (!id) return null;
  return { href: `${basis}${basis.includes('?') ? '&' : '?'}van=${id}`, label: T_ALLES[L].label, uitleg: T_ALLES[L].uitleg(T_ALLES[L].wat[dienst]) };
}

/**
 * Wat het formulier overneemt, uit details_json. Alleen waarden van een vaste
 * vorm; het formulier vergelijkt ze daarna nog eens met wat het zelf tekent.
 * @returns {null | { ref, dienst, aantal, style, bg, beelden: {sleutel, hex}[], ratio, vormen: {beeld, ratio}[], model, kanalen: string[], hoeken: {id, note}[], notitie, looks: number[][] }}
 */
export function bestelInstellingen(o) {
  if (!o || o.service === SAMPLE_SERVICE) return null;
  const dienst = herbestelDienst(o);
  if (!dienst) return null;
  const d = details(o);
  const kort = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
  const hoeken = [];
  for (const [k, v] of Object.entries(d)) {
    const m = /^angle_([a-z0-9-]{1,40})$/.exec(k);
    if (!m || !v || v === '0') continue;
    if (!BEKENDE_HOEKEN.has(m[1])) continue; // vervallen (flat lay) of onbekend
    hoeken.push({ id: m[1], note: kort(d[`angle_note_${m[1]}`], 120) });
  }
  const stijl = String(d.style || '');
  const hex = String(d.background_hex || '').replace(/^#/, '').toUpperCase();
  const face = String(d.model || d.model_p1 || '');
  /* LEVERING 58 (17 oktober 2026, afvinklijst 36). v36-aantal = a: het oude aantal
     producten gaat mee; het totaal staat ernaast, dus niemand bestelt per ongeluk te
     veel. Tot het plafond van het formulier (FORM_MAX_PRODUCTS, 20). */
  const aantalRuw = Number.parseInt(String(o.product_count ?? ''), 10);
  const aantal = Number.isInteger(aantalRuw) && aantalRuw >= 1 && aantalRuw <= FORM_MAX_PRODUCTS ? aantalRuw : 0;
  /* c-kopie: de vorm per beeld gaat mee als hij bij ALLE producten van de vorige
     bestelling gelijk was ("de foto op een model altijd 4:5"). Verschilde hij per
     product, dan hoorde hij bij die producten en niet bij de volgende. */
  const perBeeld = {};
  for (const [k, v] of Object.entries(d)) {
    const m = /^ratio_p(\d{1,3})_(\d{1,2})$/.exec(k);
    if (!m || !/^[a-z0-9-]{2,16}$/.test(String(v || ''))) continue;
    (perBeeld[m[2]] = perBeeld[m[2]] || {})[m[1]] = String(v);
  }
  const vormen = [];
  for (const [beeld, perProduct] of Object.entries(perBeeld)) {
    const waarden = Object.values(perProduct);
    const n = aantal || waarden.length;
    if (waarden.length === n && waarden.every((x) => x === waarden[0])) vormen.push({ beeld: Number(beeld), ratio: waarden[0] });
  }
  return {
    ref: String(o.ref || ''),
    dienst,
    aantal,
    /* Levering 57 (17 oktober 2026; Lucas: "Style kopieren moet sowieso heel uitgebreid
       zijn"): ook de eigen stijl van een catalogusbestelling (cs-<id>, het blok "Je eigen
       look" dat addOwnStyles tekent). De standaardstijl van catalog heet niet zo en blijft
       leeg: die staat er vanzelf. */
    style: (dienst === 'lifestyle' && (/^cs-\d{1,9}$/.test(stijl) || /^[a-z-]{2,24}$/.test(stijl))) || (dienst === 'catalog' && /^cs-\d{1,9}$/.test(stijl)) ? stijl : '',
    bg: dienst === 'catalog' && /^[0-9A-F]{6}$/.test(hex) ? hex : '',
    /* Werklijst 27 en v29-hex: de achtergrond per foto, ook een eigen kleur. */
    beelden: dienst === 'catalog' ? beeldAchtergrondInstellingen('catalog', d).slice(0, 16) : [],
    ratio: /^[a-z0-9-]{2,16}$/.test(String(d.ratio || '')) ? String(d.ratio) : '',
    vormen: vormen.sort((a, b) => a.beeld - b.beeld).slice(0, 8),
    model: face && face !== MODEL_ANY && /^[a-z0-9-]{1,24}$/.test(face) ? face : '',
    kanalen: String(d.channels || '').split(',').map((x) => x.trim()).filter((x) => /^[a-z0-9-]{1,32}$/.test(x)).slice(0, 12),
    hoeken: hoeken.slice(0, 12),
    /* v36-bericht = a: het bericht gaat NIET vanzelf mee (het ging vaak over die ene
       levering), maar het formulier zet een knop klaar om het met één tik over te nemen. */
    notitie: kort(d.message, 2000),
    /* De indeling van de looks (afvinklijst 38, d-kopie): welke plaatsen samen een
       look zijn, als [[1, 2], [3, 4, 5]]. Net als bij v36-outfits alleen als het
       aantal producten ook meegaat, en alleen bij lifestyle; de stukken zelf vul je
       opnieuw in. Een oude bestelling met `outfit_count` had geen indeling en geeft
       dus niets. */
    looks: aantal && dienst === 'lifestyle' ? looksVan(d, aantal).map((l) => l.producten).slice(0, 10) : [],
  };
}
