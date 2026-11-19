// VISUAILS — OP MAAT: DE VOORBEELDRONDES EN DE OFFERTE. 15 november 2026, lijst 110 en 112 (schermen 9 en 10).
//
// Na het versturen (stand `verstuurd`) zet de studio in /admin een voorbeeld klaar: beelden in neutrale kleuren en
// zonder het product van de klant, alleen om de omgeving en het gevoel te laten zien (lijst 110). Daarmee gaat de
// aanvraag naar `voorstel`. De klant zet per beeld goed of aanpassen, en zegt per ronde wat goed is, wat anders moet
// en wat in elk geval moet blijven (lijst 112, blijven = ja). Stuurt hij een reactie, dan is de studio weer aan zet
// (`verstuurd`) voor de volgende ronde. Ronde 1 en twee rondes daarna zijn gratis (GRATIS_STIJLRONDES); na de derde
// versie kijken we wat er nog kan en kunnen er kosten bij komen. Zegt hij "dit is goed", dan `akkoord`.
//
// Na het akkoord stuurt de studio de offerte (src/lib/opMaatOfferte.js): de klant geeft akkoord of vraagt een
// aanpassing, en bij akkoord gaat de betaallink voor de helft vanzelf de deur uit.

import { tekst, aanvraagVan, zetStand } from './opMaat.js';
import { GRATIS_STIJLRONDES } from '../data/opMaatPrijs.js';
/* Levering 117 (17 november 2026, proefronde P5-07): "Je eerste voorbeeld staat klaar" aan de klant en "Reactie op
   voorbeeld" aan de studio. Zonder mail bleef een klaar voorbeeld liggen tot de klant toevallig terugkwam. */
import { mailVoorbeeldKlaar, mailReactieStudio } from './opMaatMail.js';

export const VOORBEELD_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const VOORBEELD_BYTES = 15 * 1024 * 1024;
export const VOORBEELD_MAX = 12;
/** Ronde 1 plus de gratis rondes. Daarna kan de studio nog door, met een melding dat er kosten bij kunnen komen. */
export const GRATIS_RONDES_TOTAAL = 1 + GRATIS_STIJLRONDES;

export function voorbeeldSleutel(customerId, id, ronde, bestandsnaam, nu = Date.now()) {
  const naam = String(bestandsnaam || 'beeld').toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'beeld';
  return `maat/${customerId}/${id}/voorbeeld/r${ronde}-${nu}-${naam}`;
}

/** De ronde die nu loopt: de hoogste ronde met beelden (0 als er nog niets is). */
export async function huidigeRonde(env, id) {
  const r = await env.DB.prepare('SELECT MAX(ronde) AS r FROM maat_voorbeelden WHERE aanvraag_id = ?').bind(id).first();
  return Number(r && r.r) || 0;
}

/** De ronde waar een nieuw beeld in komt. In `voorstel` de lopende ronde. In `verstuurd` de hoogste ronde zolang de
 *  klant daar nog niet op reageerde (de studio is hem aan het opbouwen), anders de volgende. */
export async function rondeVoorNieuwBeeld(env, id, stand) {
  const nu = await huidigeRonde(env, id);
  if (stand === 'voorstel') return Math.max(1, nu);
  if (!nu) return 1;
  const al = await env.DB.prepare('SELECT COUNT(*) AS n FROM maat_besluiten WHERE aanvraag_id = ? AND onderwerp = ?').bind(id, `ronde:${nu}`).first();
  return Number(al && al.n) ? nu + 1 : nu;
}

export async function voorbeeldenVan(env, id) {
  const { results } = await env.DB.prepare('SELECT id, ronde, r2_key, bestandsnaam, gemaakt_op FROM maat_voorbeelden WHERE aanvraag_id = ? ORDER BY ronde, id').bind(id).all();
  return (results || []).map((r) => ({ id: r.id, ronde: r.ronde, r2Key: r.r2_key, bestandsnaam: r.bestandsnaam, gemaaktOp: r.gemaakt_op }));
}

/** De studio voegt een voorbeeldbeeld toe aan de volgende ronde (stand `verstuurd`) of aan de lopende (`voorstel`). */
export async function voegVoorbeeldToe(env, id, { r2Key, bestandsnaam = '' }) {
  const a = await env.DB.prepare('SELECT id, customer_id, stand FROM maat_aanvragen WHERE id = ?').bind(id).first();
  if (!a) return { ok: false, reden: 'weg' };
  if (!['verstuurd', 'voorstel'].includes(a.stand)) return { ok: false, reden: 'stand' };
  if (!String(r2Key).startsWith(`maat/${a.customer_id}/${id}/voorbeeld/`)) return { ok: false, reden: 'sleutel' };
  const ronde = await rondeVoorNieuwBeeld(env, id, a.stand);
  if (ronde > 9) return { ok: false, reden: 'vol' };
  const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM maat_voorbeelden WHERE aanvraag_id = ? AND ronde = ?').bind(id, ronde).first();
  if (Number(n && n.n) >= VOORBEELD_MAX) return { ok: false, reden: 'vol' };
  await env.DB.prepare('INSERT INTO maat_voorbeelden (aanvraag_id, ronde, r2_key, bestandsnaam) VALUES (?, ?, ?, ?)').bind(id, ronde, r2Key, tekst(bestandsnaam, 120)).run();
  return { ok: true, ronde };
}

/** De studio zet de ronde klaar voor de klant: de aanvraag gaat naar `voorstel`. Alleen met beelden in een nieuwe ronde.
 *  Daarna een mail aan de klant (levering 117); `gemaild` zegt of die de deur uit ging. */
export async function zetVoorbeeldKlaar(env, id, { origin } = {}) {
  const a = await env.DB.prepare('SELECT stand FROM maat_aanvragen WHERE id = ?').bind(id).first();
  if (!a) return { ok: false, reden: 'weg' };
  if (a.stand !== 'verstuurd') return { ok: false, reden: 'stand' };
  const ronde = await huidigeRonde(env, id);
  const al = await env.DB.prepare("SELECT COUNT(*) AS n FROM maat_besluiten WHERE aanvraag_id = ? AND onderwerp = ?").bind(id, `ronde:${ronde}`).first();
  if (!ronde || Number(al && al.n)) return { ok: false, reden: 'geen-beelden' };
  const r = await zetStand(env, id, 'voorstel');
  if (!r.ok) return r;
  return { ...r, ronde, gemaild: await mailVoorbeeldKlaar(env, id, ronde, { origin }) };
}

/**
 * De reactie van de klant op een ronde: per beeld goed of aanpassen, en de drie vragen. Met `goed: true` is de stijl
 * goed en gaat de aanvraag naar `akkoord`; anders is de studio weer aan zet (`verstuurd`).
 * `beelden`: { [voorbeeldId]: 'goed' | 'aanpassen' }.
 */
/* Levering 117: daarna "Reactie op voorbeeld" aan de studio (`origin` voor de link naar /admin). */
export async function reactieOpRonde(env, customerId, id, { beelden = {}, wel = '', anders = '', blijven = '', goed = false, origin } = {}) {
  const a = await aanvraagVan(env, customerId, id);
  if (!a) return { ok: false, reden: 'weg' };
  if (a.stand !== 'voorstel') return { ok: false, reden: 'stand' };
  const ronde = await huidigeRonde(env, id);
  const vb = (await voorbeeldenVan(env, id)).filter((v) => v.ronde === ronde);
  const w = tekst(wel, 800), x = tekst(anders, 800), b = tekst(blijven, 400);
  if (!goed && !x) return { ok: false, reden: 'anders' };   // "aanpassen" zonder wat: daar kunnen wij niets mee
  const stmts = [];
  for (const v of vb) {
    const k = beelden && beelden[v.id];
    if (k === 'goed' || k === 'aanpassen') stmts.push(env.DB.prepare('INSERT INTO maat_besluiten (aanvraag_id, onderwerp, besluit, notitie) VALUES (?, ?, ?, ?)').bind(id, `foto:${v.id}`, k, ''));
  }
  const notitie = [w && `Goed: ${w}`, x && `Anders: ${x}`, b && `Blijven: ${b}`].filter(Boolean).join('\n');
  stmts.push(env.DB.prepare('INSERT INTO maat_besluiten (aanvraag_id, onderwerp, besluit, notitie) VALUES (?, ?, ?, ?)').bind(id, `ronde:${ronde}`, goed ? 'goed' : 'aanpassen', notitie));
  stmts.push(env.DB.prepare("UPDATE maat_aanvragen SET stand = ?, bijgewerkt_op = datetime('now') WHERE id = ? AND stand = 'voorstel'").bind(goed ? 'akkoord' : 'verstuurd', id));
  await env.DB.batch(stmts);
  const perBeeld = { goed: 0, aanpassen: 0 };
  for (const v of vb) { const k = beelden && beelden[v.id]; if (k === 'goed' || k === 'aanpassen') perBeeld[k]++; }
  await mailReactieStudio(env, id, { ronde, goed: !!goed, notitie, beelden: perBeeld }, { origin });
  return { ok: true, ronde, stand: goed ? 'akkoord' : 'verstuurd', gratisOver: Math.max(0, GRATIS_RONDES_TOTAAL - ronde) };
}

/* ── de offerte ──────────────────────────────────────────────────────────────────────────────────────────── */

/** Regels in de vorm "naam;bedrag" (één per regel, bedrag in hele euro's), zoals de studio ze in /admin typt. */
export function leesRegels(tekstIn) {
  return String(tekstIn || '').split(/\r?\n/).map((r) => r.trim()).filter(Boolean).slice(0, 40).map((r) => {
    const m = /^(.*?)[;|]\s*€?\s*(-?\d{1,6})(?:[.,]\d{1,2})?\s*$/.exec(r);
    return m ? { naam: tekst(m[1], 120), bedrag: Number(m[2]) } : null;
  }).filter((r) => r && r.naam);
}

/* De offerte zelf (zetten, versturen, akkoord met de bestelling en de betaallink, een aanpassing) staat sinds
   15 november 2026 in src/lib/opMaatOfferte.js. */
