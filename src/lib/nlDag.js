/* ── DE NEDERLANDSE DAG — 9 november 2026 (ronde 91, C01/C02/C03) ────────────────
 *
 * Cloudflare draait in UTC; de klant en de studio leven in Europe/Amsterdam. Tussen
 * 00:00 en 01:00 (winter) of 02:00 (zomer) Nederlandse tijd is het in UTC nog
 * gisteren. Dat gaf drie fouten die alleen 's nachts te zien zijn:
 *
 *   · de leverkalender rekende de drie wachtdagen (LEAD_DAYS) vanaf gisteren, dus
 *     wie na middernacht bestelde wachtte er twee;
 *   · "revisie aanvragen kan tot en met …" viel een dag te vroeg;
 *   · "je beelden staan hier tot en met …" noemde een dag die niet meer heel was.
 *
 * Eén plek voor de vraag "welke dag is het in Nederland", zonder DOM en zonder
 * database: de Worker, de cron en een Astro-pagina laden dit. De datums blijven
 * kale 'YYYY-MM-DD'; alleen het begin van de telling verandert.
 */

const DAG_MS = 86400000;
const NL = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit' });

/** Een moment (Date of ms) als Nederlandse kalenderdag 'YYYY-MM-DD'. */
export function nlDag(moment = Date.now()) {
  const ms = moment instanceof Date ? moment.getTime() : Number(moment);
  if (!Number.isFinite(ms)) return '';
  return NL.format(new Date(ms));
}

/** Vandaag in Nederland. */
export function vandaagNL(nu = Date.now()) {
  return nlDag(nu);
}

/** `n` kalenderdagen na (of vóór) een kale datum. */
export function plusDagen(iso, n) {
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return '';
  return new Date(d.getTime() + Number(n) * DAG_MS).toISOString().slice(0, 10);
}
