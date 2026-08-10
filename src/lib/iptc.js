/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE IPTC-WAARDES ZELF — ALLEEN DE STRINGS, GEEN GEREEDSCHAP
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ── WAAROM DIT ONDER aitag.mjs KOMT TE HANGEN, 9 AUGUSTUS 2026 ──────────────
 *
 * scripts/lib/aitag.mjs bestaat omdat twee scripts dezelfde tag moesten schrijven,
 * en zijn eigen kop legt uit waarom die strings niet in twee bestanden mogen staan:
 * *"dan is er een dag waarop het ene script iets anders in een bestand zet dan het
 * andere, en dan is de vermelding in de ene helft van de levering een andere claim
 * dan in de andere helft."*
 *
 * Dat argument geldt nu voor een derde plek, en die kan aitag.mjs niet importeren:
 * src/lib/provenance.js draait in workerd en aitag.mjs importeert
 * exiftool-vendored, een pakket met een binair programma erin. Een Worker kan dat
 * niet laden.
 *
 * Dus zijn de STRINGS één laag naar beneden gegaan en is aitag.mjs blijven bestaan
 * als de SCHRIJVER. Dit bestand heeft geen enkele afhankelijkheid en kan daardoor
 * overal heen: in een script, in een Pages Function, in een Worker.
 *
 * ── DEZE WAARDES BETEKENEN JURIDISCH IETS ──────────────────────────────────
 *
 * `compositeWithTrainedAlgorithmicMedia` zegt "deels door een model gemaakt",
 * `trainedAlgorithmicMedia` zegt "volledig". Dat verschil staat in /ai-act §6 in
 * twee talen beschreven, dus het is geen implementatiedetail dat je even anders
 * zet — het is de claim die wij over onze eigen bestanden doen.
 */

const BASE = 'http://cv.iptc.org/newscodes/digitalsourcetype';

/** Deels door een model gemaakt — de gewone situatie bij ons. */
export const COMPOSITE = `${BASE}/compositeWithTrainedAlgorithmicMedia`;

/** Volledig door een model gemaakt — alleen als er geen echte foto in zit. */
export const FULLY = `${BASE}/trainedAlgorithmicMedia`;

/**
 * Waar een lezer op zoekt om te zien of er ÉÉN van de twee in staat.
 *
 * Het gemeenschappelijke deel en niet de volledige url, want beide waardes zijn
 * geldig en welke van de twee er staat, is een keuze per levering. Wat het
 * adminportaal moet weten is of er iets staat.
 */
export const MARKER = `${BASE}/`;

/** De formaten waarin we een tag kwijt kunnen. */
export const TAGGABLE = new Set(['.jpg', '.jpeg', '.png', '.webp']);
