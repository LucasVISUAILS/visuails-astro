/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * WAAR EEN REVIEW HEEN KAN
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * De twee links uit §0 van reviewverzamelingspecificatie.md, en niets meer. Ze
 * staan hier los omdat ze op drie plekken nodig zijn — VISUAILS Studio, het
 * portaal, en straks de herinneringsmail — en een url die je drie keer overtypt
 * is een url die ooit op twee van de drie plekken oud is.
 *
 * ── GEEN TRUSTBOX-SCRIPT, EN DAT IS EEN BESLUIT ──────────────────────────────
 *
 * Trustpilot krijgt een KNOP en geen widget. Lucas: *"de site blijft op nul
 * externe scripts, zodat de cookiebanner en privacyverklaring niet aangepast
 * hoeven te worden."*
 *
 * Dat is geen gemakzucht maar het goedkoopste alternatief. Een TrustBox laadt
 * van widget.trustpilot.com, zet daarbij zijn eigen cookies, en dan is er een
 * derde partij bij die op /cookie-policy met naam genoemd moet worden en in
 * /privacy §5 als ontvanger. Die pagina's beloven nu "we zetten alleen wat de
 * site nodig heeft" en noemen elke cookie bij naam; één widget maakt die belofte
 * onwaar en kost twee juridische pagina's onderhoud, voor sterretjes die je ook
 * met een link kunt bereiken.
 *
 * ── WAAROM DE IDS KORT EN VAST ZIJN ─────────────────────────────────────────
 *
 * 'google' en 'trustpilot' worden opgeslagen in
 * `order_feedback.platforms_clicked`, als komma-lijst. Dezelfde vorm als
 * customer_style_locks.channels: kort, in onze eigen code gedefinieerd, en bij
 * het lezen opnieuw tegen deze lijst gefilterd — zie de noot bij die kolom in
 * migratie 0020. Een id dat hier verdwijnt, wordt daarmee automatisch een
 * genegeerde waarde in plaats van een knop die nergens naartoe gaat.
 */

export const REVIEW_PLATFORMS = [
  {
    id: 'google',
    name: 'Google',
    url: 'https://g.page/r/CfzOkJ97zZCKEBM/review',
  },
  {
    id: 'trustpilot',
    name: 'Trustpilot',
    /* /evaluate/ en niet /review/ (8 oktober 2026, punt 3.05): /review/ is de
       bedrijfspagina, /evaluate/ opent meteen het scherm om een review te
       schrijven — de knop moet het reviewscherm direct openen. */
    url: 'https://www.trustpilot.com/evaluate/visuails.com',
    /*
     * De korte uitnodigingslink uit §0. Voor een mail of WhatsApp, waar een lange
     * url door een client wordt afgekapt of verminkt. NIET voor de knop op de
     * site: daar is de volledige url te zien in de statusbalk van de browser, en
     * dat is precies wat iemand wil kunnen controleren voordat hij ergens op
     * klikt. Een verkorte link doet daar het omgekeerde.
     */
    inviteUrl: 'https://trstp.lt/YtZP5fQ-Ub',
  },
];

/**
 * ── WELKE PLEK GROOT STAAT — 8 oktober 2026 (punt 3.05) ─────────────────────
 *
 * Op het afrondscherm staat één reviewplek als knop en de andere als kleine
 * tekstlink. Lucas: *"Is in mijn geval niet handiger om trustpilot groter te
 * maken dan google."* Advies was hetzelfde: Trustpilot groot, Google klein.
 * Omdraaien = deze ene waarde op 'google' zetten; feedback.js leest alleen dit.
 * Beide blijven er bij ELKE score staan (nooit filteren op score, zie de kop van
 * feedback.js).
 */
export const REVIEW_VOORKEUR = 'trustpilot';

/** De ids die we accepteren. Alles daarbuiten wordt bij lezen én schrijven weggefilterd. */
export const REVIEW_PLATFORM_IDS = REVIEW_PLATFORMS.map((p) => p.id);

/**
 * Een komma-lijst uit de database terug naar ids die nu bestaan.
 *
 * Opnieuw filteren bij het LEZEN en niet alleen bij het schrijven, want de
 * database bewaart wat er ooit is opgeslagen en deze lijst is wat er vandaag
 * bestaat. Verdwijnt Trustpilot volgend jaar, dan is een oude rij daarmee
 * gewoon "op Google geklikt" in plaats van een verwijzing naar niets.
 */
export function parsePlatforms(value) {
  return String(value || '')
    .split(',')
    .map((v) => v.trim())
    .filter((v) => REVIEW_PLATFORM_IDS.includes(v));
}

/** De score waarboven we de publieke knoppen vóóropzetten. §2 stap 2: 4 en 5. */
export const SCORE_HIGH = 4;

/** Hoeveel sterren de vraag heeft. */
export const SCORE_MAX = 5;
