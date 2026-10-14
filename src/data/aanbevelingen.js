/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * WELKE AANBEVELINGEN OP DE SITE KOMEN, EN IN WELKE VORM — 8 oktober 2026 (G3)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas koos V10 = a: "een blok op home en /pricing, per stuk door jou aangezet",
 * met de notitie: *"Graag wel bouwen maar onzichtbaar houden tot ik er 1 echt
 * accepteer en erin zet. (…) eerst gewoon stilstaand en wanneer er echt 5 of
 * zoiets zijn ze laten bewegen."*
 *
 * Dit bestand is de REGEL; src/components/Aanbevelingen.astro is de vorm. Ze
 * staan apart omdat src/data/testimonials.js vanaf zijn anker (`/** @type {`)
 * door `npm run testimonials` wordt overschreven — wat daar onder staat, is na de
 * volgende run weg. Hier niet.
 *
 * ── DE ROUTE, IN DE VOLGORDE WAARIN HIJ LOOPT ───────────────────────────────
 *
 *   1 · De klant schrijft na een afgeronde bestelling een aanbeveling en zet het
 *       vinkje (feedback.js, saveTestimonial).
 *   2 · Lucas keurt hem goed op /admin/testimonials — per stuk, omkeerbaar.
 *   3 · `npm run testimonials` schrijft de goedgekeurde naar testimonials.js.
 *       Proefbestellingen (orders.testmodus) en "TEST — niet plaatsen" vallen
 *       daar al af.
 *   4 · Commit en deploy. Dit bestand filtert dan nóg een keer, en het blok
 *       verschijnt pas vanaf één echte aanbeveling.
 *
 * Publiceren blijft zo de derde, bewuste stap (§21): nooit automatisch, en
 * nooit gefilterd op score.
 */
import { TESTIMONIALS } from './testimonials.js';

/**
 * Vanaf hoeveel aanbevelingen het blok een lopende band wordt. Daaronder staan
 * ze stil naast elkaar. Lucas: "wanneer er echt 5 of zoiets zijn".
 */
export const BAND_VANAF = 5;

/**
 * Hoeveel er hooguit op een pagina staan. Een band van dertig kaarten is geen
 * blok meer maar een muur, en de pagina wordt er niet beter van; de nieuwste
 * eerst (die volgorde zet het script al).
 */
export const HOOGSTENS = 12;

/*
 * ── DE TESTEXEMPLAREN KOMEN ER NOOIT OP ─────────────────────────────────────
 *
 * De afspraak (OVERZICHT §0, O15): testaanbevelingen worden gemarkeerd met
 * "TEST — niet plaatsen". Ze komen uit proefbestellingen in Studio, en het
 * script laat ze al weg; dit is de tweede sluiting op dezelfde deur, voor een
 * rij die er met de hand in is gezet of uit een oudere run komt.
 *
 * Ruim gelezen, en met opzet: "TEST" in HOOFDLETTERS als los woord (een
 * gewone zin met "test" erin blijft staan), "niet plaatsen" of "do not
 * publish" waar dan ook, en een naam die met "test" begint. Een echte
 * aanbeveling die hier per ongeluk op lijkt, valt weg in plaats van dat een
 * test op de site komt — en `npm run testimonials` meldt hem als overgeslagen,
 * dus dat zie je.
 */
const TEST_MERK = /(^|[^A-Za-z])TEST([^A-Za-z]|$)/;
const NIET_PLAATSEN = /niet\s+plaatsen|do\s+not\s+(post|publish)/i;
const TEST_NAAM = /^\s*test\b/i;

/** Is dit een testexemplaar dat nooit op de site mag? */
export function isTestExemplaar(r) {
  const tekst = String(r?.text || '');
  const naam = String(r?.name || '');
  return TEST_MERK.test(tekst) || NIET_PLAATSEN.test(tekst)
    || TEST_MERK.test(naam) || NIET_PLAATSEN.test(naam) || TEST_NAAM.test(naam);
}

/**
 * De aanbevelingen die op de site mogen: met tekst, zonder testexemplaren,
 * hooguit HOOGSTENS. `lijst` is er voor de toets; de site geeft niets mee en
 * leest dan het gegenereerde bestand.
 */
export function aanbevelingenOpSite(lijst = TESTIMONIALS) {
  return (Array.isArray(lijst) ? lijst : [])
    .filter((r) => r && String(r.text || '').trim())
    .filter((r) => !isTestExemplaar(r))
    .slice(0, HOOGSTENS);
}

/**
 * De vorm van het blok bij dit aantal: niets, stilstaand, of een band.
 * Nul is GEEN leeg blok maar géén blok — geen kop, geen witruimte.
 */
export function blokVorm(aantal) {
  if (!aantal || aantal < 1) return 'niets';
  return aantal >= BAND_VANAF ? 'band' : 'stil';
}

/**
 * "2026-10" → "oktober 2026" / "October 2026". De maand en niet de dag: zo
 * staat hij ook in de data (zie de kop van scripts/testimonials.mjs).
 */
export function maandLabel(maand, lang) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(maand || ''));
  if (!m) return '';
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1));
  return d.toLocaleDateString(lang === 'nl' ? 'nl-NL' : 'en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}
