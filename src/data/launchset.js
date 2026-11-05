/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE LAUNCHSET — ÉÉN SCHAKELAAR (levering 70, 5 november 2026)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas' launchschema van 22 oktober (overzicht §30.2) en zijn antwoorden van
 * 5 november ("alles advies", vraag 5 tot en met 11, kladblok/PLAN-70-LAUNCHSET.md):
 *
 *   catalog    CLASSIC, CASUAL, CUSTOM
 *   lifestyle  FLASH, PHONE-MADE, AUGUST, CUSTOM          (Dunes en Glow even van de site)
 *   video      MOTION · 8 s, SHIFT · 8 s, CUSTOM          (Lifestyle Video en Campaign even van de site)
 *   hooks      IG SPLIT
 *   in de maak alleen DUSK, zonder datum
 *
 * ZET HEM OP true ALS JE VOORBEELDBEELDEN KLAAR ZIJN, en rol uit. Zolang hij false
 * is, ziet een bezoeker de site zoals hij was.
 *
 * ── HOE EEN STIJL WEG KAN EN TERUG KAN KOMEN, MET ÉÉN REGEL ──────────────────
 *
 * Een stijl in styles.js, catalogStyles.js of videoStyles.js (en hun .nl.js) draagt
 * hoogstens één regel erbij:
 *
 *   opSite: 'tot-launch'   staat op de site tot de schakelaar aan gaat
 *                          (Dunes, Glow, Lifestyle Video, Campaign). Na de launch
 *                          komt er één per maand terug: haal die regel weg.
 *   opSite: 'launch'       staat pas op de site als de schakelaar aan is
 *                          (Casual, August, Shift). Na de launch mag de regel weg.
 *   (geen regel)           staat er altijd.
 *
 * Wat een bezoeker ziet, kiest of besteld krijgt, komt uit `siteLijst()`. De
 * volledige lijst blijft voor de server, Studio, /admin, facturen en herbestellen:
 * een oude bestelling in Dunes blijft geldig en leesbaar. Er is geen tweede lijst
 * met stijlnamen: wie wil weten wat er op de site staat, vraagt het hier.
 *
 * ── EEN PROEFBUILD ZONDER HET BESTAND TE VERANDEREN ─────────────────────────
 *
 *   VISUAILS_LAUNCHSET=aan npm run build     de site met de schakelaar aan
 *   VISUAILS_LAUNCHSET=uit npm run build     en uit, ook als hier true staat
 *
 * Alleen tijdens het bouwen (Node); in de Worker bestaat die variabele niet en
 * geldt de regel hieronder.
 */

const BUILD_STAND = (() => {
  try {
    const v = String(globalThis.process?.env?.VISUAILS_LAUNCHSET || '').trim().toLowerCase();
    if (v === 'aan' || v === '1' || v === 'true') return true;
    if (v === 'uit' || v === '0' || v === 'false') return false;
  } catch { /* geen process: de Worker */ }
  return null;
})();

/** De schakelaar. Hier omzetten, en uitrollen. */
const LAUNCHSET_IN_HET_BESTAND = false;

export const LAUNCHSET = BUILD_STAND ?? LAUNCHSET_IN_HET_BESTAND;

/** De twee waarden die `opSite` mag hebben. */
export const OP_SITE = Object.freeze({ totLaunch: 'tot-launch', launch: 'launch' });

/**
 * Staat deze stijl op de site? `stand` is de schakelaar (standaard LAUNCHSET), als
 * parameter zodat toetsen beide standen kunnen nalopen zonder twee builds.
 */
export function opDeSite(stijl, stand = LAUNCHSET) {
  const w = stijl?.opSite;
  if (w === OP_SITE.launch) return !!stand;
  if (w === OP_SITE.totLaunch) return !stand;
  return true;
}

/** De stijlen die op de site staan, in de volgorde van de lijst. */
export function siteLijst(lijst, stand = LAUNCHSET) {
  return (Array.isArray(lijst) ? lijst : []).filter((s) => opDeSite(s, stand));
}

/**
 * Een stijl met wat er bij de launch aan verandert. Een stijl kan een veld
 * `bijLaunch` dragen (bijvoorbeeld Classic: de beschrijving van ghost mannequin en
 * on-model in de lens); bij aan worden die velden over de stijl heen gelegd. Bij uit
 * blijft de stijl zoals hij is. Na de launch: de velden in de stijl zelf zetten en
 * `bijLaunch` weghalen.
 */
export function inLaunch(stijl, stand = LAUNCHSET) {
  if (!stijl || !stand || !stijl.bijLaunch) return stijl;
  const { bijLaunch, ...rest } = stijl;
  return { ...rest, ...bijLaunch };
}

/** De site-lijst met de launchvelden erover: wat een bezoeker van elke stijl leest. */
export function siteStijlen(lijst, stand = LAUNCHSET) {
  return siteLijst(lijst, stand).map((s) => inLaunch(s, stand));
}

/**
 * De adressen van stijlen die er nu niet staan, voor de tijdelijke doorverwijzing
 * (302) in src/middleware.js. `{ '/lifestyle/dunes': '/lifestyle/', … }`, ook
 * onder /nl/. Alleen stijlen MET een eigen pagina (dienst + slug).
 */
export function verborgenAdressen(diensten, stand = LAUNCHSET) {
  const uit = {};
  for (const [dienst, lijst] of Object.entries(diensten || {})) {
    for (const s of lijst || []) {
      if (opDeSite(s, stand) || !s?.slug) continue;
      for (const pre of ['', '/nl']) uit[`${pre}/${dienst}/${s.slug}`] = `${pre}/${dienst}/`;
    }
  }
  return uit;
}

/* ── "ONZE VIER SFEREN": HET AANTAL VOLGT DE LIJST ───────────────────────────
   De eigen look zei "Not one of our four moods" en de eigen video "three formats".
   Met de launchset zijn dat er drie en twee, en na de launch komt er één per maand
   terug. Daarom staat er in de tekst `{vaste}` en vult vulVasteLooks() het aantal
   vaste stijlen in dat NU op de site staat (alles behalve de eigen look), in woorden. */
const WOORDEN = {
  en: ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'],
  nl: ['geen', 'één', 'twee', 'drie', 'vier', 'vijf', 'zes', 'zeven', 'acht', 'negen', 'tien'],
};
export function aantalInWoorden(n, lang = 'en') {
  const w = WOORDEN[lang === 'nl' ? 'nl' : 'en'];
  return w[n] ?? String(n);
}
export function vasteOpSite(lijst, stand = LAUNCHSET) {
  return siteLijst(lijst, stand).filter((s) => s.slug !== 'custom').length;
}
/** Vult `{vaste}` in elke tekst van elke stijl in de lijst (in place, bij het laden). */
export function vulVasteLooks(lijst, lang = 'en', stand = LAUNCHSET) {
  const woord = aantalInWoorden(vasteOpSite(lijst, stand), lang);
  const vul = (v) => (typeof v === 'string' ? v.replaceAll('{vaste}', woord)
    : Array.isArray(v) ? v.map(vul)
      : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, vul(x)])) : v);
  for (const s of lijst) for (const k of Object.keys(s)) s[k] = vul(s[k]);
  return lijst;
}
