// VISUAILS — OP MAAT: de intake van custom catalog, lifestyle, hooks en video. 14 november 2026, lijst 107.
//
// Wat hier staat is het gedeelde deel (lijst 107, q7: eerst het gedeelde deel, dan de diensten): het merkprofiel,
// een aanvraag als concept opslaan en later verder (g5), versturen zonder te betalen (q3), referenties met wat de
// klant ervan wil (g2), en elk akkoord met datum (g7). De velden per dienst staan in src/data/opMaat.js; alles wat
// de klant stuurt gaat door normaliseerInhoud(), zodat er nooit iets anders in de database komt dan wat daar staat.
//
// GEEN GELD HIER. Een aanvraag op maat kost niets tot de offerte na het concept (q3); de offerte en de aanbetaling
// lopen later via de gewone betaalroute. De SCHATTING die de klant vooraf ziet, rekent src/data/opMaatPrijs.js uit
// wat hier genormaliseerd is (lijst 109 en 110, 15 november 2026).
//
// VERSIES. Elke opslag hoogt `versie` op. Wie opslaat, stuurt de versie mee die hij laatst zag; is de aanvraag
// intussen in een ander tabblad opgeslagen, dan wordt er niets overschreven en krijgt hij de nieuwste terug. Zo
// verliest een klant met twee tabbladen nooit stil zijn werk.

import {
  DIENSTEN, STANDEN, MERK_VELDEN, REF_WAT, BUITEN_VRAGEN, KANALEN, CONTACT, SOORTEN, OMGEVINGEN,
  MODEL_KEUZE, STAND_TEKST, STAND_GROEPEN, STAND_WIJ, STAND_GRENS, STAND_LOOKS, hoekenVan, CAMERA, PLEKKEN, BINNEN_BUITEN, HOOK_KANALEN, EERSTE_MOMENT,
  VIDEO_DOELEN, SHOT_SOORTEN, CAMERABEWEGING, TEMPO, SHOTS, MERKMODEL, MAX_EXTRA_FOTOS, LIFESTYLE_LICHT, IDEE, DOELEN,
  KIJKER_ACTIE, IDEE_VRAGEN, MAX_PERSONEN, VIDEO_OMGEVING, VIDEO_SECONDEN, DIENST_NAAM,
} from '../data/opMaat.js';
import { EDITS, schatting } from '../data/opMaatPrijs.js';
/* Levering 117 (17 november 2026, proefronde P5-07): de mails tussen versturen en offerte. */
import { mailAanvraagOntvangen, mailAanvraagAfgerond, kenmerkVan } from './opMaatMail.js';

/* ── kleine gereedschappen ───────────────────────────────────────────────────────────────────────────────── */

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
/** Tekst: getrimd, zonder stuurtekens, hoogstens `max` tekens. */
export function tekst(v, max = 400) {
  if (typeof v !== 'string') return '';
  return v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max);
}
const kies = (v, lijst) => (lijst.includes(v) ? v : '');
const kiesVeel = (v, lijst, max = lijst.length) => (Array.isArray(v) ? [...new Set(v.filter((x) => lijst.includes(x)))].slice(0, max) : []);
const getal = (v, min, max, standaard = null) => { const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : standaard; };
const hex = (v) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v.trim()) ? v.trim().toUpperCase() : '');
const leegWeg = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => !(v === '' || v === null || (Array.isArray(v) && !v.length) || (isObj(v) && !Object.keys(v).length))));

/* ── het merkprofiel (g1) ────────────────────────────────────────────────────────────────────────────────── */

export function normaliseerMerk(raw) {
  const r = isObj(raw) ? raw : {};
  const uit = {};
  for (const v of MERK_VELDEN) {
    if (v.keuze) uit[v.id] = kies(r[v.id], v.keuze);
    else if (v.hex) uit[v.id] = (Array.isArray(r[v.id]) ? r[v.id] : []).map(hex).filter(Boolean).slice(0, v.lijst);
    else if (v.lijst) uit[v.id] = (Array.isArray(r[v.id]) ? r[v.id] : []).map((x) => tekst(x, v.max)).filter(Boolean).slice(0, v.lijst);
    else uit[v.id] = tekst(r[v.id], v.max);
  }
  return leegWeg(uit);
}

/* ── wat de klant invult, per dienst ─────────────────────────────────────────────────────────────────────── */

/** Het gedeelde deel van elke aanvraag: nooit (g3), buiten de lijntjes (g4) en praktisch (stap 6). */
function gedeeld(r) {
  const buitenIds = BUITEN_VRAGEN.nl.map((v) => v.id);
  const buiten = {};
  if (isObj(r.buiten)) for (const id of buitenIds) { const t = tekst(r.buiten[id], 600); if (t) buiten[id] = t; }
  const p = isObj(r.praktisch) ? r.praktisch : {};
  return {
    nooit: tekst(r.nooit, 800),
    buiten,
    praktisch: leegWeg({
      wanneer: tekst(p.wanneer, 120),
      kanalen: kiesVeel(p.kanalen, KANALEN),
      contact: kies(p.contact, CONTACT),
      notitie: tekst(p.notitie, 600),
    }),
  };
}

function catalog(r) {
  const soorten = (Array.isArray(r.soorten) ? r.soorten : []).slice(0, 12).map((s) => {
    if (!isObj(s)) return null;
    const def = SOORTEN.find((x) => x.id === s.soort);
    if (!def) return null;
    /* Een eigen stand (lijst 113): draai en kantel samen, anders geldt de stand van zijn groep. Een lege of halve
       stand valt weg; de draai komt altijd tussen -180 en 180. */
    const v = isObj(s.voorkant) ? s.voorkant : {};
    const heel = (x) => x !== '' && x !== null && x !== undefined && Number.isFinite(Number(x));
    const eigen = def.model && heel(v.yaw) && heel(v.pitch);
    /* alleen een draai die als voorkant kan (Lucas, 15 november 17:12): binnen de grenzen van zijn groep */
    const grens = (STAND_GROEPEN.find((g) => g.id === def.groep) || {}).draai || [-180, 180];
    const voorkant = leegWeg({
      yaw: eigen ? Math.min(grens[1], Math.max(grens[0], (((Math.round(Number(v.yaw)) % 360) + 540) % 360) - 180)) : null,
      pitch: eigen ? getal(v.pitch, STAND_GRENS.pitch[0], STAND_GRENS.pitch[1], null) : null,
      lig: eigen && (v.lig === true || v.lig === 1 || v.lig === '1') ? true : null,
      tekst: tekst(v.tekst, 400),
    });
    return leegWeg({ soort: def.id, naam: tekst(s.naam, 60), aantal: getal(s.aantal, 1, 500, null), voorkant });
  }).filter(Boolean);
  const o = isObj(r.omgeving) ? r.omgeving : {};
  const m = isObj(r.model) ? r.model : {};
  const l = isObj(r.licht) ? r.licht : {};
  const g = isObj(r.grading) ? r.grading : {};
  /* De stand per groep: een hoek uit STAND_GROEPEN of "wij", met een notitie. Alleen de groepen van zijn producten. */
  const st = isObj(r.standen) ? r.standen : {};
  const standLook = kies(r.standLook, STAND_LOOKS) || STAND_LOOKS[0];
  const groepen = new Set(soorten.map((s) => (SOORTEN.find((x) => x.id === s.soort) || {}).groep));
  const standen = {};
  for (const g of STAND_GROEPEN) {
    if (!groepen.has(g.id) || !isObj(st[g.id])) continue;
    const x = leegWeg({ hoek: kies(st[g.id].hoek, [...hoekenVan(g, standLook).map((h) => h.id), STAND_WIJ]), tekst: tekst(st[g.id].tekst, 400) });
    if (Object.keys(x).length) standen[g.id] = x;
  }
  return {
    soorten,
    standLook,
    standen,
    omgeving: leegWeg({ soort: kies(o.soort, OMGEVINGEN), kleur: hex(o.kleur), tekst: tekst(o.tekst, 600) }),
    model: leegWeg({ keuze: kies(m.keuze, MODEL_KEUZE), merkmodel: kies(m.merkmodel, MERKMODEL), pose: tekst(m.pose, 300), tekst: tekst(m.tekst, 300) }),
    /* Lijst 109: wat de schatting nog meer leest. Licht en grading: eigen of niet, met een zin. Camera: een eigen hoek. */
    licht: leegWeg({ eigen: l.eigen === true, tekst: tekst(l.tekst, 300) }),
    camera: kies(r.camera, CAMERA),
    grading: leegWeg({ eigen: g.eigen === true, tekst: tekst(g.tekst, 300) }),
    vasteMaten: r.vasteMaten === true,
    extraFotos: getal(r.extraFotos, 0, MAX_EXTRA_FOTOS, null),
  };
}

function lifestyle(r) {
  const mo = isObj(r.moment) ? r.moment : {};
  const pl = isObj(r.plek) ? r.plek : {};
  const me = isObj(r.mensen) ? r.mensen : {};
  const po = isObj(r.pose) ? r.pose : {};
  return {
    moment: leegWeg({ zin: tekst(mo.zin, 300), wie: tekst(mo.wie, 160), waar: tekst(mo.waar, 160), wanneer: tekst(mo.wanneer, 160), waarom: tekst(mo.waarom, 300) }),
    tijd: getal(r.tijd, 0, 24, null),
    binnenBuiten: kies(r.binnenBuiten, BINNEN_BUITEN),
    plek: leegWeg({ soort: kies(pl.soort, PLEKKEN), tekst: tekst(pl.tekst, 400) }),
    aantal: getal(r.aantal, 1, 500, null),
    /* Hoogstens twee personen per foto (lijst 109, l-mensen). */
    mensen: leegWeg({ aantal: getal(me.aantal, 1, MAX_PERSONEN, null), leeftijd: tekst(me.leeftijd, 60), stijl: tekst(me.stijl, 200), model: kies(me.model, MODEL_KEUZE), merkmodel: kies(me.merkmodel, MERKMODEL) }),
    licht: kies(r.licht, LIFESTYLE_LICHT),
    energie: getal(r.energie, 0, 100, null),
    pose: leegWeg({ idee: tekst(po.idee, 200), wie: tekst(po.wie, 160), lichaamsdeel: tekst(po.lichaamsdeel, 120) }),
  };
}

/** Het idee bij hooks en video: van de klant, of wij bedenken het met zijn antwoorden op de vragen (lijst 110). */
function idee(r) {
  const v = isObj(r.vragen) ? r.vragen : {};
  const vragen = {};
  for (const id of IDEE_VRAGEN) { const t = tekst(v[id], 400); if (t) vragen[id] = t; }
  return leegWeg({
    idee: kies(r.idee, IDEE),
    eigenIdee: tekst(r.eigenIdee, 1200),
    doel: kies(r.doel, DOELEN),
    kijker: kies(r.kijker, KIJKER_ACTIE),
    vragen,
  });
}

function hooks(r) {
  const em = isObj(r.eersteMoment) ? r.eersteMoment : {};
  const tk = isObj(r.tekstOpBeeld) ? r.tekstOpBeeld : {};
  return {
    ...idee(r),
    kanalen: kiesVeel(r.kanalen, HOOK_KANALEN),
    eersteMoment: leegWeg({ soort: kies(em.soort, EERSTE_MOMENT), eigen: tekst(em.eigen, 300) }),
    /* De extra's per hook (lijst 110). */
    tekstOpBeeld: leegWeg({ taal: kies(tk.taal, ['nl', 'en', 'de', 'fr']), toon: tekst(tk.toon, 160), tekst: tekst(tk.tekst, 200) }),
    tweedeProduct: r.tweedeProduct === true,
    personen: getal(r.personen, 0, MAX_PERSONEN, null),
    effecten: getal(r.effecten, 0, 3, null),
    effectTekst: tekst(r.effectTekst, 400),
    eindbeeld: r.eindbeeld === true,
    anders: tekst(r.anders, 600),
  };
}

function video(r) {
  const shots = (Array.isArray(r.shots) ? r.shots : []).slice(0, SHOTS.max).map((s) => (isObj(s)
    ? leegWeg({ soort: kies(s.soort, SHOT_SOORTEN), beweging: kies(s.beweging, CAMERABEWEGING), duur: getal(s.duur, SHOTS.duurMin, SHOTS.duurMax, null), tekst: tekst(s.tekst, 200) })
    : null)).filter((s) => s && (s.soort || s.tekst || s.beweging));
  const o = isObj(r.omgeving) ? r.omgeving : {};
  return {
    ...idee(r),
    doelVideo: kies(r.doelVideo, VIDEO_DOELEN),
    kanalen: kiesVeel(r.kanalen, KANALEN),
    seconden: getal(r.seconden, VIDEO_SECONDEN.min, VIDEO_SECONDEN.max, null),
    shots,
    hoofdproduct: tekst(r.hoofdproduct, 160),
    bijstukken: tekst(r.bijstukken, 300),
    materiaal: tekst(r.materiaal, 200),
    omgeving: leegWeg({ soort: kies(o.soort, VIDEO_OMGEVING), kleur: hex(o.kleur), tekst: tekst(o.tekst, 400) }),
    personen: getal(r.personen, 0, MAX_PERSONEN, null),
    tempo: kies(r.tempo, TEMPO),
    tekstInBeeld: tekst(r.tekstInBeeld, 200),
    eindbeeld: r.eindbeeld === true,
    ruweBeelden: r.ruweBeelden === true,
  };
}

const PER_DIENST = { catalog, lifestyle, hooks, video };

/** Haalt uit wat de klant stuurde alleen wat src/data/opMaat.js kent, binnen de grenzen. */
export function normaliseerInhoud(dienst, raw) {
  if (!DIENSTEN.includes(dienst)) throw new Error(`onbekende dienst: ${dienst}`);
  const r = isObj(raw) ? raw : {};
  /* `gekozen`: de keuzes die hij aanzette (lijst 112), ook als hij er nog niets bij schreef; zo telt de schatting ze mee
     en ziet hij dat de uitleg nog ontbreekt. Alleen sleutels uit opMaatPrijs.js. */
  const gekozen = Array.isArray(r.gekozen) ? [...new Set(r.gekozen.filter((id) => Object.prototype.hasOwnProperty.call(EDITS[dienst] || {}, id)))] : [];
  return leegWeg({ ...gedeeld(r), ...PER_DIENST[dienst](r), toelichting: toelichting(dienst, r.toelichting), gekozen });
}

/* ── ALLEEN AANVINKEN ZEGT NIETS — lijst 112 (15 november 2026) ────────────────────────────────────────────
   Lucas: "Alleen selecteren zegt niks, ik moet alvast weten wat de klant ongeveer wilt hebben en bedoelt met keuzes
   die hij maakt." Bij elke edit die hij kiest, schrijft hij in een paar woorden wat hij bedoelt; bij catalog in elk
   geval de stand en het licht. Eén veld per edit, onder de sleutel uit src/data/opMaatPrijs.js. */
/** De edits waarvoor geen los veld nodig is: het idee en de stijl hebben hun eigen velden, een extra shot zijn eigen zin. */
/* De stand (c-pose) zegt het 3D-model al; de notitie erbij mag, maar hoeft niet (lijst 113). */
const ZONDER_TOELICHTING = /^(h-stijl|v-idee|v-shot|c-pose)/;
function toelichting(dienst, raw) {
  const r = isObj(raw) ? raw : {};
  const uit = {};
  for (const id of Object.keys(EDITS[dienst] || {})) { const t = tekst(r[id], 600); if (t) uit[id] = t; }
  return uit;
}
/** De edits die deze intake kiest en waarbij de klant nog moet zeggen wat hij bedoelt. */
export function toelichtingNodig(dienst, inhoud) {
  return schatting(dienst, inhoud || {}).regels.map((r) => r.id)
    .filter((id) => EDITS[dienst] && EDITS[dienst][id] && !ZONDER_TOELICHTING.test(id));
}

/** Wat er nog ontbreekt voordat de klant kan versturen (een lijst sleutels; leeg = klaar). Bewust weinig verplicht:
 *  wat wij in het concept beter zelf voorstellen, hoeft hij niet te weten. */
export function ontbreekt(dienst, inhoud, merk = {}) {
  const i = inhoud || {};
  const uit = [];
  if (!merk.naam) uit.push('merk.naam');
  if (dienst === 'catalog') {
    /* De stand hoeft niet: zonder keuze geldt de standaard (lijst 113). */
    if (!i.soorten || !i.soorten.length) uit.push('soorten');
  }
  if (dienst === 'lifestyle' && !(i.moment && i.moment.zin)) uit.push('moment.zin');
  if (dienst === 'hooks' || dienst === 'video') {
    if (!i.idee) uit.push('idee');
    else if (i.idee === 'eigen' && !i.eigenIdee) uit.push('eigenIdee');
    else if (i.idee === 'ons' && !(i.vragen && i.vragen.doelgroep)) uit.push('vragen.doelgroep');
  }
  if (dienst === 'hooks' && (!i.kanalen || !i.kanalen.length)) uit.push('kanalen');
  if (dienst === 'video') {
    if (!i.hoofdproduct) uit.push('hoofdproduct');
    if (!i.materiaal) uit.push('materiaal');                 // v4: het materiaal is verplicht
    if (i.idee === 'eigen' && (!i.shots || !i.shots.length)) uit.push('shots');   // bij ons idee maken wij de shotlijst
  }
  /* Een edit met een eigen tekstveld (de pose van het model, het pose-idee, de plek) is met dat veld al uitgelegd.
     Levering 117 (17 november 2026, proefronde P5-06): ook "Je moment uitwerken" (l-moment). Die zit in elke
     lifestyle-aanvraag en heeft geen eigen uitlegveld; het moment in één zin ÍS de uitleg. Zonder deze regel bleef
     "Nog nodig" altijd staan en was geen enkele lifestyle-aanvraag te versturen. Ontbreekt de zin, dan staat dat al als
     moment.zin in de lijst, en niet nog een keer als uitleg. */
  const eigen = { 'l-moment': (i.moment && i.moment.zin) || uit.includes('moment.zin'), 'c-modelpose': i.model && i.model.pose, 'l-pose': i.pose && i.pose.idee, 'l-plek': i.plek && i.plek.tekst,
    'h-tekst': i.tekstOpBeeld && i.tekstOpBeeld.tekst, 'v-tekst': i.tekstInBeeld };
  /* De achtergrond of omgeving heeft zijn eigen veld "beschrijf"; een effen kleur mag ook met alleen de hexcode. */
  const omg = i.omgeving || {};
  for (const id of ['c-materiaal', 'c-wereld', 'v-materiaal', 'v-wereld']) eigen[id] = omg.tekst;
  for (const id of ['c-kleur', 'v-kleur']) eigen[id] = omg.tekst || omg.kleur;
  for (const id of toelichtingNodig(dienst, i)) if (!(i.toelichting && i.toelichting[id]) && !eigen[id]) uit.push(`toelichting.${id}`);
  if (!(i.praktisch && i.praktisch.contact)) uit.push('praktisch.contact');
  return uit;
}

/* ── de database ─────────────────────────────────────────────────────────────────────────────────────────── */

const leesJson = (s, standaard) => { try { const v = JSON.parse(s); return v ?? standaard; } catch { return standaard; } };

export async function merkVan(env, customerId) {
  const r = await env.DB.prepare('SELECT inhoud_json FROM merkprofielen WHERE customer_id = ?').bind(customerId).first();
  return r ? leesJson(r.inhoud_json, {}) : {};
}

export async function bewaarMerk(env, customerId, raw) {
  const merk = normaliseerMerk(raw);
  await env.DB.prepare(`INSERT INTO merkprofielen (customer_id, inhoud_json, bijgewerkt_op) VALUES (?, ?, datetime('now'))
    ON CONFLICT(customer_id) DO UPDATE SET inhoud_json = excluded.inhoud_json, bijgewerkt_op = excluded.bijgewerkt_op`)
    .bind(customerId, JSON.stringify(merk)).run();
  return merk;
}

function rij(r) {
  if (!r) return null;
  /* levering 118 (17 november 2026, proefronde P12-02): `merk` is de kopie van het merkprofiel bij het versturen
     (migratie 0074); null bij een concept en bij een aanvraag van daarvoor. */
  return { id: r.id, dienst: r.dienst, stand: r.stand, inhoud: leesJson(r.inhoud_json, {}), versie: r.versie, taal: r.taal,
    gemaaktOp: r.gemaakt_op, bijgewerktOp: r.bijgewerkt_op, verstuurdOp: r.verstuurd_op,
    merk: r.merk_json ? leesJson(r.merk_json, null) : null };
}

/** levering 118 (17 november 2026, proefronde P12-02): het merk dat bij deze aanvraag hoort. Een verstuurde aanvraag
 *  heeft zijn eigen kopie; een concept (of een aanvraag van vóór migratie 0074) het profiel van nu.
 *  Geeft { merk, kopie } — `kopie` zegt of het de vastgelegde kopie is. */
export async function merkVanAanvraag(env, aanvraag, customerId) {
  if (aanvraag && aanvraag.merk && typeof aanvraag.merk === 'object') return { merk: aanvraag.merk, kopie: true };
  return { merk: await merkVan(env, customerId), kopie: false };
}

/** Een nieuwe aanvraag, als concept. Heeft de klant al een concept voor deze dienst, dan gaat hij daar verder
 *  (één open concept per dienst: anders staan er na drie keer "op maat" klikken drie halve aanvragen). */
export async function nieuweAanvraag(env, customerId, dienst, taal = 'nl') {
  if (!DIENSTEN.includes(dienst)) throw new Error(`onbekende dienst: ${dienst}`);
  const open = await env.DB.prepare("SELECT * FROM maat_aanvragen WHERE customer_id = ? AND dienst = ? AND stand = 'concept' ORDER BY id DESC LIMIT 1")
    .bind(customerId, dienst).first();
  if (open) return rij(open);
  const r = await env.DB.prepare("INSERT INTO maat_aanvragen (customer_id, dienst, taal) VALUES (?, ?, ?) RETURNING *")
    .bind(customerId, dienst, taal === 'en' ? 'en' : 'nl').first();
  return rij(r);
}

export async function aanvraagVan(env, customerId, id) {
  return rij(await env.DB.prepare('SELECT * FROM maat_aanvragen WHERE id = ? AND customer_id = ?').bind(id, customerId).first());
}

/* levering 118 (17 november 2026, proefronde P5-09): met `ookGesloten` ook de gesloten aanvragen (Studio zet ze onder
   "Afgerond", in plaats van dat ze zonder bericht verdwijnen), en bij elke aanvraag of de aanbetaling binnen is
   (`betaald`) en het kenmerk van die bestelling (`ref`). Zonder de offertetabel van 0072/0073 gewoon zonder die twee. */
export async function aanvragenVan(env, customerId, { ookGesloten = false } = {}) {
  const waar = ookGesloten ? '' : " AND a.stand != 'gesloten'";
  let results;
  try {
    ({ results } = await env.DB.prepare(`SELECT a.*, o.ref AS order_ref, (o.payment_status = 'paid') AS order_betaald FROM maat_aanvragen a
      LEFT JOIN maat_offertes f ON f.aanvraag_id = a.id LEFT JOIN orders o ON o.id = f.order_id
      WHERE a.customer_id = ?${waar} ORDER BY a.bijgewerkt_op DESC, a.id DESC`).bind(customerId).all());
  } catch {
    ({ results } = await env.DB.prepare(`SELECT a.* FROM maat_aanvragen a WHERE a.customer_id = ?${waar} ORDER BY a.bijgewerkt_op DESC, a.id DESC`).bind(customerId).all());
  }
  return (results || []).map((r) => ({ ...rij(r), betaald: !!r.order_betaald, ref: r.order_ref || null }));
}

/* ── WAT DE KLANT ZIET PER STAND — levering 118 (17 november 2026, proefronde P5-09) ────────────────────────────
   Studio zette bij elke stand na het versturen het label "Verstuurd", ook na de aanbetaling. Nu een kort label per stand,
   met twee standen die alleen de klant ziet: `betaald` (vastgelegd, en de aanbetaling is binnen) en `afgerond`
   (gesloten na betalen). De zin erbij komt uit STAND_TEKST (src/data/opMaat.js), behalve bij die twee. */
export const STAND_LABEL = {
  nl: { concept: 'Concept', verstuurd: 'Verstuurd', voorstel: 'Voorbeeld klaar', akkoord: 'Akkoord', offerte: 'Offerte', vastgelegd: 'Wacht op betaling', betaald: 'Betaald', gesloten: 'Gesloten', afgerond: 'Afgerond' },
  en: { concept: 'Draft', verstuurd: 'Sent', voorstel: 'Preview ready', akkoord: 'Approved', offerte: 'Quote', vastgelegd: 'Awaiting payment', betaald: 'Paid', gesloten: 'Closed', afgerond: 'Completed' },
};
export function klantStand(stand, betaald = false) {
  if (stand === 'vastgelegd' && betaald) return 'betaald';
  if (stand === 'gesloten' && betaald) return 'afgerond';
  return stand;
}
/** { label, zin } voor Studio. `ref` is het kenmerk van de bestelling uit de offerte, als die er is. */
export function standVoorKlant(stand, { betaald = false, ref = '' } = {}, lang = 'nl') {
  const taal = lang === 'en' ? 'en' : 'nl';
  const k = klantStand(stand, betaald);
  const nl = taal === 'nl';
  const zin = k === 'betaald'
    ? (nl ? `De aanbetaling is binnen.${ref ? ` Je bestelling ${ref} staat in de planning.` : ''}` : `The deposit is in.${ref ? ` Your order ${ref} is in the schedule.` : ''}`)
    : k === 'afgerond'
      ? (nl ? `Deze aanvraag is afgerond.${ref ? ` Je bestelling ${ref} staat bij Bestellingen.` : ''}` : `This request is completed.${ref ? ` Your order ${ref} is under Orders.` : ''}`)
      : k === 'gesloten'
        ? (nl ? 'Deze aanvraag is gesloten. Wil je toch verder? Stuur ons een bericht.' : 'This request is closed. Want to carry on after all? Send us a message.')
        : (STAND_TEKST[taal] || {})[stand] || '';
  return { stand: k, label: STAND_LABEL[taal][k] || stand, zin };
}

/** Tussendoor opslaan (g5). Alleen een concept, en alleen als `versie` de laatste is.
 *  Geeft { ok, aanvraag } of { ok: false, reden: 'versie' | 'stand' | 'weg', aanvraag }. */
export async function bewaarConcept(env, customerId, id, raw, versie) {
  const nu = await aanvraagVan(env, customerId, id);
  if (!nu) return { ok: false, reden: 'weg', aanvraag: null };
  if (nu.stand !== 'concept') return { ok: false, reden: 'stand', aanvraag: nu };
  const inhoud = normaliseerInhoud(nu.dienst, raw);
  const r = await env.DB.prepare(`UPDATE maat_aanvragen SET inhoud_json = ?, versie = versie + 1, bijgewerkt_op = datetime('now')
    WHERE id = ? AND customer_id = ? AND stand = 'concept' AND versie = ? RETURNING *`)
    .bind(JSON.stringify(inhoud), id, customerId, Number(versie)).first();
  if (!r) return { ok: false, reden: 'versie', aanvraag: await aanvraagVan(env, customerId, id) };
  return { ok: true, aanvraag: rij(r) };
}

/** Versturen, zonder te betalen (q3). Alleen een volledig concept.
 *  Levering 117 (17 november 2026, proefronde P5-07): daarna krijgt de klant "We hebben je aanvraag" (src/lib/opMaatMail.js).
 *  `origin` is de site waar de link in de mail naartoe gaat. Mislukt de mail, dan is de aanvraag toch verstuurd. */
export async function verstuur(env, customerId, id, { origin } = {}) {
  const nu = await aanvraagVan(env, customerId, id);
  if (!nu) return { ok: false, reden: 'weg' };
  if (nu.stand !== 'concept') return { ok: false, reden: 'stand', aanvraag: nu };
  const merk = await merkVan(env, customerId);
  const mist = ontbreekt(nu.dienst, nu.inhoud, merk);
  if (mist.length) return { ok: false, reden: 'ontbreekt', ontbreekt: mist, aanvraag: nu };
  let r = await env.DB.prepare(`UPDATE maat_aanvragen SET stand = 'verstuurd', verstuurd_op = datetime('now'), bijgewerkt_op = datetime('now')
    WHERE id = ? AND customer_id = ? AND stand = 'concept' RETURNING *`).bind(id, customerId).first();
  if (!r) return { ok: false, reden: 'stand', aanvraag: await aanvraagVan(env, customerId, id) };
  /* levering 118 (17 november 2026, proefronde P12-02): een kopie van het merkprofiel bij de aanvraag, zodat een later
     aangepast merkblok (een bureau met een tweede klantmerk) deze aanvraag niet meer verandert. Zonder migratie 0074
     blijft de aanvraag gewoon verstuurd; dan toont /admin het profiel van nu, zoals voorheen. */
  try {
    const m = await env.DB.prepare('UPDATE maat_aanvragen SET merk_json = ? WHERE id = ? AND customer_id = ? RETURNING *')
      .bind(JSON.stringify(normaliseerMerk(merk)), id, customerId).first();
    if (m) r = m;
  } catch (e) { console.error('[opMaat] merk niet bij de aanvraag gezet (migratie 0074?)', e && e.message); }
  const gemaild = await mailAanvraagOntvangen(env, id, { origin });
  return { ok: true, aanvraag: rij(r), gemaild };
}

/** De studio zet de stand verder (vanuit /admin): verstuurd → voorstel → (klant: akkoord) → offerte → vastgelegd. */
/* Wat de studio met de hand mag zetten. Naar `offerte` en `vastgelegd` gaat het alleen via de offerte zelf
   (src/lib/opMaatOfferte.js: mailen, akkoord met de bestelling), zodat er altijd een offerte en een bestelling achter
   staan; een gemailde offerte kan wel terug naar `akkoord` om hem opnieuw te maken (15 november 2026). */
export const STUDIO_MAG = { verstuurd: ['voorstel', 'gesloten'], voorstel: ['verstuurd', 'gesloten'], akkoord: ['voorstel', 'gesloten'], offerte: ['akkoord', 'gesloten'], vastgelegd: ['gesloten'], concept: ['gesloten'] };
export async function zetStand(env, id, naar, { origin } = {}) {
  if (!STANDEN.includes(naar)) return { ok: false, reden: 'stand' };
  const nu = await env.DB.prepare('SELECT stand FROM maat_aanvragen WHERE id = ?').bind(id).first();
  if (!nu) return { ok: false, reden: 'weg' };
  if (!(STUDIO_MAG[nu.stand] || []).includes(naar)) return { ok: false, reden: 'stand' };
  await env.DB.prepare("UPDATE maat_aanvragen SET stand = ?, bijgewerkt_op = datetime('now') WHERE id = ?").bind(naar, id).run();
  /* levering 118 (17 november 2026, proefronde P5-09): sluit de studio een aanvraag waarvan de aanbetaling binnen is,
     dan hoort de klant dat; zonder bericht verdween hij uit Studio. Mislukt de mail, dan is de stand toch gezet. */
  let gemaild = false;
  if (naar === 'gesloten') {
    const b = await env.DB.prepare(`SELECT o.ref FROM maat_offertes f JOIN orders o ON o.id = f.order_id
      WHERE f.aanvraag_id = ? AND o.payment_status = 'paid'`).bind(id).first().catch(() => null);
    if (b) gemaild = await mailAanvraagAfgerond(env, id, b.ref, { origin });
  }
  return { ok: true, gemaild };
}

/** Een besluit van de klant op het concept-bord (g7): per foto of op het hele concept goed of aanpassen, met datum.
 *  Is het hele concept goed, dan gaat de aanvraag naar `akkoord`. */
export async function besluit(env, customerId, id, onderwerp, wat, notitie = '') {
  const nu = await aanvraagVan(env, customerId, id);
  if (!nu) return { ok: false, reden: 'weg' };
  if (nu.stand !== 'voorstel') return { ok: false, reden: 'stand' };
  if (!['goed', 'aanpassen'].includes(wat)) return { ok: false, reden: 'besluit' };
  if (!/^(concept|foto:\d{1,3}|stijlkaart:[a-z-]{2,20})$/.test(onderwerp)) return { ok: false, reden: 'onderwerp' };
  const n = tekst(notitie, 800);
  if (wat === 'aanpassen' && !n) return { ok: false, reden: 'notitie' };   // "aanpassen" zonder wat: daar kunnen wij niets mee
  await env.DB.prepare('INSERT INTO maat_besluiten (aanvraag_id, onderwerp, besluit, notitie) VALUES (?, ?, ?, ?)').bind(id, onderwerp, wat, n).run();
  if (onderwerp === 'concept' && wat === 'goed') {
    await env.DB.prepare("UPDATE maat_aanvragen SET stand = 'akkoord', bijgewerkt_op = datetime('now') WHERE id = ? AND stand = 'voorstel'").bind(id).run();
  }
  return { ok: true };
}

export async function besluitenVan(env, aanvraagId) {
  const { results } = await env.DB.prepare('SELECT onderwerp, besluit, notitie, door, op FROM maat_besluiten WHERE aanvraag_id = ? ORDER BY id').bind(aanvraagId).all();
  return results || [];
}

/* ── referenties (g2) ────────────────────────────────────────────────────────────────────────────────────── */

export const REF_MAX = 12;
export const REF_BYTES = 15 * 1024 * 1024;
export const REF_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'video/mp4', 'video/quicktime'];

/** Een referentie vastleggen nadat het bestand in R2 staat. Alleen op een concept, hoogstens REF_MAX. */
export async function voegReferentieToe(env, customerId, id, { r2Key, bestandsnaam = '', bytes = 0, wat = [], notitie = '' }) {
  const nu = await aanvraagVan(env, customerId, id);
  if (!nu) return { ok: false, reden: 'weg' };
  if (nu.stand !== 'concept') return { ok: false, reden: 'stand' };
  const { n } = await env.DB.prepare('SELECT COUNT(*) AS n FROM maat_referenties WHERE aanvraag_id = ?').bind(id).first();
  if (n >= REF_MAX) return { ok: false, reden: 'vol' };
  if (typeof r2Key !== 'string' || !r2Key.startsWith(`maat/${customerId}/${id}/`)) return { ok: false, reden: 'sleutel' };
  const r = await env.DB.prepare('INSERT INTO maat_referenties (aanvraag_id, r2_key, bestandsnaam, bytes, wat_json, notitie) VALUES (?, ?, ?, ?, ?, ?) RETURNING id')
    .bind(id, r2Key, tekst(bestandsnaam, 120), Math.max(0, Number(bytes) || 0), JSON.stringify(kiesVeel(wat, REF_WAT)), tekst(notitie, 400)).first();
  return { ok: true, id: r.id };
}

export async function referentiesVan(env, aanvraagId) {
  const { results } = await env.DB.prepare('SELECT id, r2_key, bestandsnaam, bytes, wat_json, notitie, gemaakt_op FROM maat_referenties WHERE aanvraag_id = ? ORDER BY id').bind(aanvraagId).all();
  return (results || []).map((r) => ({ id: r.id, r2Key: r.r2_key, bestandsnaam: r.bestandsnaam, bytes: r.bytes, wat: leesJson(r.wat_json, []), notitie: r.notitie, gemaaktOp: r.gemaakt_op }));
}

/** De sleutel in R2 voor een nieuwe referentie: altijd onder de klant en de aanvraag, zodat voegReferentieToe()
 *  kan nagaan dat een sleutel van hem is. */
export function referentieSleutel(customerId, id, bestandsnaam, nu = Date.now()) {
  const ext = (String(bestandsnaam || '').match(/\.([a-z0-9]{2,5})$/i) || [, 'bin'])[1].toLowerCase();
  return `maat/${customerId}/${id}/${nu.toString(36)}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
}

/** Een concept weggooien (de klant), met zijn referenties in R2. Een verstuurde aanvraag kan hij niet weggooien. */
export async function verwijderConcept(env, customerId, id) {
  const nu = await aanvraagVan(env, customerId, id);
  if (!nu) return { ok: false, reden: 'weg' };
  if (nu.stand !== 'concept') return { ok: false, reden: 'stand' };
  const refs = await referentiesVan(env, id);
  if (env.UPLOADS && refs.length) { try { await env.UPLOADS.delete(refs.map((r) => r.r2Key)); } catch (e) { console.error('[opMaat] R2', e && e.message); } }
  await env.DB.prepare('DELETE FROM maat_aanvragen WHERE id = ? AND customer_id = ?').bind(id, customerId).run();
  return { ok: true };
}

/* ── NU TE DOEN IN STUDIO — levering 117 (17 november 2026, proefronde P5-07) ──────────────────────────────
   Het Studio-overzicht noemde een klaarstaand voorbeeld niet: de klant zag alleen zijn bestellingen. Nu een regel per
   aanvraag waar de klant aan zet is: een voorbeeld (stand `voorstel`) of een offerte (stand `offerte`). Dezelfde vorm
   als "En nog 1 bestelling" in src/pages/account/index.astro (ref, zin, href), plus de tekst van de knop.
   Zonder de tabellen van 0071 (een oude database) gewoon een lege lijst. */
const AAN_ZET = {
  voorstel: { anker: '#om-ronde', nl: ['je voorbeeld staat klaar. Zeg wat goed is en wat anders moet.', 'Bekijk het voorbeeld'], en: ['your preview is ready. Tell us what works and what should change.', 'View the preview'] },
  offerte: { anker: '#om-offerte', nl: ['je offerte staat klaar. Geef akkoord of vraag een aanpassing.', 'Bekijk de offerte'], en: ['your quote is ready. Accept it or ask for a change.', 'View the quote'] },
};
export async function opMaatAanZet(env, customerId, lang = 'nl') {
  const taal = lang === 'en' ? 'en' : 'nl';
  try {
    const { results } = await env.DB.prepare("SELECT id, dienst, stand FROM maat_aanvragen WHERE customer_id = ? AND stand IN ('voorstel', 'offerte') ORDER BY bijgewerkt_op DESC, id DESC LIMIT 3")
      .bind(customerId).all();
    const uit = [];
    for (const a of results || []) {
      const z = AAN_ZET[a.stand];
      if (!z) continue;
      const dienst = (DIENST_NAAM[taal] || {})[a.dienst] || a.dienst;
      uit.push({ id: a.id, ref: kenmerkVan(a.id), zin: `${dienst}: ${z[taal][0]}`, knop: z[taal][1], href: `/account/op-maat?id=${a.id}${z.anker}` });
    }
    return uit;
  } catch {
    return [];
  }
}
