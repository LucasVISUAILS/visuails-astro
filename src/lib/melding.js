/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE MELDING BOVENAAN VISUAILS STUDIO — ronde 9, 3 oktober 2026
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas: *"een algemeen smal banner bericht dat op VISUAILS Studio komt te staan en
 * voor iedereen zichtbaar is voor als er iets specifieks niet werkt of het heel druk
 * is … die ik vanuit /admin kan deployen."*
 *
 * ── WAT HET IS ──────────────────────────────────────────────────────────────
 *
 * Eén melding tegelijk, in app_settings onder `studio_melding`. Geen tabel, geen
 * migratie: er is nooit meer dan één, en een geschiedenis staat in het logboek
 * (admin_log 'melding.zet' / 'melding.weg').
 *
 * Drie soorten, omdat de klant aan de kleur moet zien of hij iets moet doen:
 *   · info    — iets om te weten ("vrijdag gesloten"): rustig, de huisstijl;
 *   · druk    — levertijd kan langer zijn: de kleur van "revisie/aandacht";
 *   · storing — iets werkt niet ("downloads haperen, we zijn ermee bezig").
 *
 * Optioneel een eindtijd. Daarna verdwijnt hij vanzelf — een melding die je
 * vergeet weg te halen staat anders over drie weken nog dat het "vandaag" druk is.
 *
 * ── WAAR HIJ STAAT ──────────────────────────────────────────────────────────
 *
 * In de schil van Studio (StudioLayout.astro), dus op elke Studio-pagina, ook
 * het inlogscherm — juist bij een storing is dat de plek waar iemand vastloopt.
 * Niet op de publieke site en niet in de privélink: daar gaat het om één
 * bestelling, en een algemene mededeling hoort bij het account.
 *
 * Geen JavaScript en geen "wegklikken": Studio heeft geen scripts (CSP), en een
 * melding die je kunt wegklikken is precies de melding die de klant mist als hij
 * er de volgende dag weer last van heeft. Hij is smal; dat is de afspraak.
 */

export const MELDING_KEY = 'studio_melding';
export const MELDING_SOORTEN = ['info', 'druk', 'storing'];
export const MELDING_MAX = 220;

/** Schoon een tekst op: één regel, geen markup, niet langer dan MELDING_MAX. */
function schoon(v) {
  return String(v ?? '').replace(/[\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MELDING_MAX);
}

/**
 * Lees de melding. null als er geen is, als hij verlopen is, of als de database
 * iets weigert — een melding mag nooit de reden zijn dat Studio niet laadt.
 */
export async function leesMelding(env, nu = new Date()) {
  try {
    const rij = await env?.DB?.prepare('SELECT value FROM app_settings WHERE key = ?1').bind(MELDING_KEY).first();
    if (!rij?.value) return null;
    const m = JSON.parse(rij.value);
    if (!m || !m.nl) return null;
    if (m.tot && Date.parse(m.tot) <= nu.getTime()) return null;
    return { soort: MELDING_SOORTEN.includes(m.soort) ? m.soort : 'info', nl: schoon(m.nl), en: schoon(m.en), tot: m.tot || null, gezet: m.gezet || null };
  } catch {
    return null;
  }
}

/** De tekst voor deze taal; Engels valt terug op Nederlands als hij leeg is. */
export function meldingTekst(m, lang) {
  if (!m) return '';
  return lang === 'en' ? (m.en || m.nl) : m.nl;
}

/**
 * Controleer en schrijf. Geeft { ok, fout } terug; de fout is een zin voor het
 * adminscherm.
 */
export async function zetMelding(env, { soort, nl, en, tot }, nu = new Date()) {
  const s = MELDING_SOORTEN.includes(soort) ? soort : null;
  if (!s) return { ok: false, fout: 'Kies een soort: info, druk of storing.' };
  const tekstNl = schoon(nl);
  if (!tekstNl) return { ok: false, fout: 'De Nederlandse tekst is verplicht.' };
  let eind = null;
  if (tot) {
    /* datetime-local geeft "2026-10-05T18:00" zonder zone: dat is Nederlandse tijd
       voor jou. Als UTC opslaan met de zone van Amsterdam op dat moment. */
    const t = amsterdamNaarUtc(String(tot));
    if (!t) return { ok: false, fout: 'De eindtijd is geen geldige datum en tijd.' };
    if (t.getTime() <= nu.getTime()) return { ok: false, fout: 'De eindtijd ligt al in het verleden.' };
    eind = t.toISOString();
  }
  const waarde = JSON.stringify({ soort: s, nl: tekstNl, en: schoon(en), tot: eind, gezet: nu.toISOString() });
  await env.DB.prepare(
    `INSERT INTO app_settings (key, value) VALUES (?1, ?2)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).bind(MELDING_KEY, waarde).run();
  return { ok: true };
}

export async function wisMelding(env) {
  await env.DB.prepare('DELETE FROM app_settings WHERE key = ?1').bind(MELDING_KEY).run();
}

/** "2026-10-05T18:00" (Amsterdam) → Date in UTC. Zomer- en wintertijd tellen mee. */
export function amsterdamNaarUtc(lokaal) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(lokaal);
  if (!m) return null;
  const [, j, mo, d, u, mi] = m.map(Number);
  const gok = Date.UTC(j, mo - 1, d, u, mi);
  /* Wat is het in Amsterdam als het in UTC `gok` is? Het verschil is de offset. */
  const delen = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(gok));
  const g = Object.fromEntries(delen.map((p) => [p.type, p.value]));
  const alsAms = Date.UTC(Number(g.year), Number(g.month) - 1, Number(g.day), Number(g.hour), Number(g.minute));
  const uit = new Date(gok - (alsAms - gok));
  return Number.isNaN(uit.getTime()) ? null : uit;
}

/** Een UTC-tijd als "5 okt, 18:00" in Amsterdamse tijd — voor het adminscherm. */
export function amsterdamKort(iso) {
  if (!iso) return '';
  return new Intl.DateTimeFormat('nl-NL', { timeZone: 'Europe/Amsterdam', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}
