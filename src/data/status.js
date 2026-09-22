/* ═══════════════════════════════════════════════════════════════════════════
   VISUAILS — DE VIJF TOESTANDEN. 20 september 2026.
   ═══════════════════════════════════════════════════════════════════════════

   KLEURENSCHEMA.md schrijft één statusset voor, met vijf standen en neutrale
   namen zodat ze ook op facturen, abonnementen en in admin kloppen. Dit bestand
   is de ENE plek die zegt welke ruwe statuswaarde in welke stand valt.

   Waarom dat nodig was: tot vandaag had elk scherm zijn eigen kleur. Een
   bestelling die "wordt nagekeken" was amber in admin, het accent in Studio en
   grijs in de mail — drie antwoorden op dezelfde vraag, en de klant ziet ze
   alle drie.

   ── DE LOGICA ─────────────────────────────────────────────────────────────

   Het gelukte pad loopt VOLLER naarmate het vordert: wachten is alleen een
   omlijning, werk krijgt een tint, klaar is massief. De twee uitzonderingen —
   revisie en geannuleerd — verlaten de accentfamilie en blijven altijd getint.
   Omdat de reeks tegelijk van licht naar donker loopt, werkt hij ook in
   grijswaarden en voor wie kleurenblind is.

   EN EEN STATUS IS ALTIJD PIL PLUS WOORD, nooit kleur alleen (regel "Altijd 6"
   uit het schema). Daarom geeft dit bestand alleen de STAND; het woord komt uit
   de vertaaltabel van het scherm dat hem toont, want dat woord verschilt per
   context ("geleverd" bij een bestelling, "betaald" bij een factuur).

   ── DE MAPPING, EN WAAR ELKE WAARDE VANDAAN KOMT ──────────────────────────

   Alles hieronder is gevonden door de codebase af te zoeken op statusvergelijkingen
   en op de vaste lijsten (STATUSES in admin.js, STATUS in account.js, de
   factuur- en abonnementstatussen). Staat er een waarde in de database die hier
   niet in staat, dan valt hij terug op 'wait' — zichtbaar, maar zonder kleur die
   iets belooft. Dat is met opzet de veiligste stand: een onbekende toestand is
   iets dat nog moet gebeuren, niet iets dat klaar is.
   ═══════════════════════════════════════════════════════════════════════════ */

/** De vijf standen, in de volgorde van het gelukte pad. */
export const STANDEN = ['wait', 'work', 'done', 'rev', 'can'];

/**
 * Ruwe statuswaarde → stand.
 *
 * Eén tabel en geen vijf lijstjes: wie een status toevoegt, komt hier langs en
 * ziet meteen in welk gezelschap hij terechtkomt.
 */
export const STAND_VAN = {
  /* ── BESTELLINGEN — STATUSES in src/lib/admin.js ──────────────────────── */
  received: 'wait',            // binnen, nog niet opgepakt
  awaiting_payment: 'wait',    // wacht op de betaling; de productie start pas daarna
  in_production: 'work',
  human_check: 'work',         // een specialist kijkt het na — nog steeds ONS werk,
                               // en dus niet 'rev': dat is wat de KLANT terugstuurt
  delivered: 'done',
  cancelled: 'can',

  /* ── BEELDEN IN HET PORTAAL ───────────────────────────────────────────── */
  pending: 'wait',             // nog niet beoordeeld
  approved: 'done',
  revision_requested: 'rev',

  /* ── FACTUREN ─────────────────────────────────────────────────────────── */
  draft: 'wait',
  issued: 'work',              // verstuurd, wacht op betaling
  paid: 'done',
  void: 'can',
  credited: 'can',

  /* ── ABONNEMENTEN ─────────────────────────────────────────────────────── */
  active: 'done',              // loopt zoals het hoort
  trialing: 'work',
  past_due: 'rev',             // er moet iets gebeuren voordat het weer loopt
  paused: 'wait',
  canceled: 'can',             // de Mollie-spelling, met één l
  expired: 'can',

  /* ── MERKMODELLEN ─────────────────────────────────────────────────────── */
  proposed: 'wait',
  in_design: 'work',
  ready: 'done',
  archived: 'can',

  /* ── BETALINGEN, ZOALS MOLLIE ZE NOEMT ───────────────────────────────── */
  open: 'wait',                // aangemaakt, de klant heeft nog niets gedaan
  authorized: 'work',          // toegezegd, nog niet bijgeschreven
  failed: 'rev',               // er moet iets gebeuren voordat dit doorgaat
  charged_back: 'rev',
  refunded: 'can',

  /* ── HET VINKJE OP EEN GELEVERD BEELD — badge.kind in shotView() ──────── */
  revision: 'rev',             // korte naam van revision_requested op de tegel
  new: 'wait',                 // net geleverd, nog niet door de klant bekeken

  /* ── OVERIG ───────────────────────────────────────────────────────────── */
  valid: 'done',
  unpaid: 'wait',
  plan: 'work',
};

/**
 * De stand van een statuswaarde. Onbekend → 'wait'; zie de kop.
 *
 * @param {string} status
 * @returns {'wait'|'work'|'done'|'rev'|'can'}
 */
export function stand(status) {
  const s = String(status || '').trim().toLowerCase();
  return STAND_VAN[s] || 'wait';
}

/** De klassenaam voor het pilcomponent: `stand is-work`. */
export function standKlasse(status) {
  return `stand is-${stand(status)}`;
}

/**
 * De drie kleuren van een stand, als losse waarden — voor mail en voor SVG,
 * waar geen CSS-variabele bestaat. Lichte stand; mail kent geen donkere (zie
 * de noot bij C in src/lib/mailTemplate.js).
 */
export const STAND_KLEUR = {
  wait: { fill: 'transparent', edge: '#7C8096', ink: '#4A4E6B' },
  work: { fill: '#E4DFFF', edge: 'rgba(61,23,214,.30)', ink: '#3D17D6' },
  done: { fill: '#1F0B66', edge: '#1F0B66', ink: '#FFFFFF' },
  rev: { fill: '#F6E7D1', edge: 'rgba(138,77,6,.30)', ink: '#8A4D06' },
  can: { fill: '#E4E7EC', edge: '#83868A', ink: '#3E4145' },
};


/**
 * De pil als HTML-string, voor de plekken die geen Astro-component kunnen
 * gebruiken: admin.js, portal.js en account.js schrijven hun HTML zelf.
 *
 * `label` is het WOORD — dit bestand kent geen vertalingen, zie de kop. Het
 * wordt hier ontdaan van tekens die HTML kunnen breken, zodat een statuswaarde
 * uit de database nooit als opmaak op het scherm kan komen.
 */
export function statPil(status, label) {
  const woord = String(label == null || label === '' ? status : label)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  return `<span class="${standKlasse(status)}">${woord}</span>`;
}
