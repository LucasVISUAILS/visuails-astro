// VISUAILS — /account/op-maat/api: de intake op maat in Studio. Via de vangroute van /account (accountGet en
// accountPost in src/lib/account.js), niet als eigen routebestand: tests/admin-diagnose-route.test.mjs staat in
// /account geen tweede endpoint toe (15 november 2026). Onder /account,
// want de sessiecookie is Path=/account: onder /api zou niemand ingelogd zijn. 14 november 2026, lijst 107.
//
// Alles voor een ingelogde klant; de regels staan in src/lib/opMaat.js, hier staat alleen de deur:
//
//   GET  ?id=<n>                   de aanvraag, het merkprofiel, de referenties, de besluiten en wat er nog ontbreekt
//   GET  (zonder id)               zijn aanvragen
//   POST {doe:'begin', dienst}      een nieuwe aanvraag, of verder in zijn open concept van die dienst
//   POST {doe:'merk', merk}         het merkprofiel opslaan (g1)
//   POST {doe:'opslaan', id, inhoud, versie}   tussendoor opslaan (g5); 409 met de nieuwste als een ander tabblad voor was
//   POST {doe:'verstuur', id}       versturen, zonder te betalen (q3); 422 met wat er ontbreekt
//   POST {doe:'besluit', id, onderwerp, besluit, notitie}   goed of aanpassen op het concept-bord (g7)
//   POST {doe:'offerte-akkoord', id, zakelijk:true}   akkoord: de bestelling en de betaallink (src/lib/opMaatOfferte.js)
//   POST {doe:'offerte-aanpassen', id, tekst}          iets aanpassen aan de offerte
//   POST {doe:'weg', id}            een concept weggooien
//   POST multipart doe=referentie, id, bestand, wat, notitie   een referentiebeeld (g2), naar R2 onder maat/<klant>/<id>/
//
// Elke POST alleen vanaf onze eigen site (originIsSelf, zoals /account) en met een ratelimit per klant.

import { currentCustomer, originIsSelf } from './account.js';
import { checkRate, clientIp } from './ratelimit.js';
import {
  merkVan, bewaarMerk, nieuweAanvraag, aanvraagVan, aanvragenVan, bewaarConcept, verstuur, besluit, besluitenVan,
  voegReferentieToe, referentiesVan, referentieSleutel, verwijderConcept, ontbreekt, REF_BYTES, REF_TYPES,
} from './opMaat.js';
import { toelichtingNodig } from './opMaat.js';
import { schatting, regelNaam } from '../data/opMaatPrijs.js';
/* levering 119 (18 november 2026, besluit Lucas na proefronde P5-16): video is op aanvraag, ook in de schatting van Studio. */
import { VIDEO_OP_AANVRAAG } from '../data/pricing.js';
import { voorbeeldenVan, huidigeRonde, reactieOpRonde, GRATIS_RONDES_TOTAAL } from './opMaatRondes.js';
import { offerteVoorScherm, akkoordEnBetaallink, vraagAanpassing } from './opMaatOfferte.js';
import { merkmodelInAbonnement } from './slots.js';

const metNamen = (sch, taal) => ({ ...sch, regels: sch.regels.map((r) => ({ ...r, naam: regelNaam(r.id, taal) })) });
/* levering 119 (18 november 2026, besluit Lucas na proefronde P5-16): Lucas: geen bedrag per seconde voor de klant zolang video op aanvraag is. Dan gaan alleen de namen
   van de keuzes naar het scherm (geen bedrag, geen uitleg met bedragen, geen totaal); de prijs komt in de offerte.
   /admin (adminOpMaat.js) en de offerte rekenen nog gewoon met schatting(). */
const voorKlant = (sch, taal) => (sch.dienst === 'video' && VIDEO_OP_AANVRAAG
  ? { dienst: sch.dienst, opAanvraag: true, producten: sch.producten, regels: sch.regels.map((r) => ({ id: r.id, naam: regelNaam(r.id, taal) })), totaal: null, aanbetaling: null }
  : metNamen(sch, taal));

/** Heeft de klant al een klaar merkmodel? Dan kost "nieuw merkmodel" in de schatting niets (lijst 109).
 *  Levering 117 (17 november 2026, proefronde P5-12, met bouwer BA): ook niet als zijn abonnement een merkmodel
 *  inbegrepen heeft dat hij nog niet besteld heeft (merkmodelInAbonnement() in src/lib/slots.js). */
async function heeftMerkmodel(env, cid) {
  const r = await env.DB.prepare("SELECT 1 AS x FROM custom_models WHERE customer_id = ? AND status != 'in_design' LIMIT 1").bind(cid).first().catch(() => null);
  return !!r || !!(await merkmodelInAbonnement(env, cid));
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}
const STATUS = { weg: 404, stand: 409, versie: 409, al: 409, anders: 422, zakelijk: 422, ontbreekt: 422, notitie: 422, besluit: 422, onderwerp: 422, vol: 422, sleutel: 400 };
const uit = (r) => json(r, r.ok ? 200 : (STATUS[r.reden] || 400));

async function volledig(env, customerId, id) {
  const a = await aanvraagVan(env, customerId, id);
  if (!a) return null;
  /* levering 118 (17 november 2026, proefronde P12-02): een verstuurde aanvraag houdt het merk van toen. */
  const merk = a.merk || await merkVan(env, customerId);
  return { aanvraag: a, merk, referenties: (await referentiesVan(env, id)).map(({ r2Key, ...r }) => r), besluiten: await besluitenVan(env, id), ontbreekt: ontbreekt(a.dienst, a.inhoud, merk), schatting: voorKlant(schatting(a.dienst, a.inhoud, { merkmodelBetaald: await heeftMerkmodel(env, customerId) }), a.taal), toelichting: toelichtingNodig(a.dienst, a.inhoud),
    /* Lijst 112, schermen 9 en 10: de voorbeelden (zonder R2-sleutel), de ronde en de offerte. */
    voorbeelden: (await voorbeeldenVan(env, id).catch(() => [])).map((v) => ({ id: v.id, ronde: v.ronde, url: `/account/op-maat/beeld/${v.id}` })),
    ronde: await huidigeRonde(env, id).catch(() => 0), gratisRondes: GRATIS_RONDES_TOTAAL,
    offerte: await offerteVoorScherm(env, id).catch(() => null) };
}

/** Een voorbeeldbeeld voor de klant zelf: alleen van zijn eigen aanvraag, en alleen als de ronde klaarstaat of voorbij is. */
export async function voorbeeldBeeld({ request, env }, vid) {
  const klant = await currentCustomer(env, request);
  if (!klant) return new Response(null, { status: 401 });
  const r = await env.DB.prepare(`SELECT v.r2_key FROM maat_voorbeelden v JOIN maat_aanvragen a ON a.id = v.aanvraag_id
    WHERE v.id = ? AND a.customer_id = ? AND (a.stand != 'verstuurd' OR v.ronde < (SELECT MAX(ronde) FROM maat_voorbeelden WHERE aanvraag_id = a.id))`).bind(vid, klant.customer_id).first();
  if (!r || !env.UPLOADS) return new Response(null, { status: 404 });
  const o = await env.UPLOADS.get(r.r2_key);
  if (!o) return new Response(null, { status: 404 });
  return new Response(o.body, { headers: { 'content-type': o.httpMetadata?.contentType || 'image/jpeg', 'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff' } });
}

export async function onRequestGet({ request, env }) {
  const klant = await currentCustomer(env, request);
  if (!klant) return json({ ok: false, reden: 'inloggen' }, 401);
  const id = Number(new URL(request.url).searchParams.get('id'));
  if (id) {
    const v = await volledig(env, klant.customer_id, id);
    return v ? json({ ok: true, ...v }) : json({ ok: false, reden: 'weg' }, 404);
  }
  return json({ ok: true, aanvragen: await aanvragenVan(env, klant.customer_id), merk: await merkVan(env, klant.customer_id) });
}

export async function onRequestPost({ request, env }) {
  if (!originIsSelf(request, env)) return json({ ok: false, reden: 'herkomst' }, 403);
  const klant = await currentCustomer(env, request);
  if (!klant) return json({ ok: false, reden: 'inloggen' }, 401);
  const cid = klant.customer_id;
  const rate = await checkRate(env, { ip: clientIp(request), key: `op-maat:${cid}`, action: 'op-maat', limit: 120, windowSeconds: 600 });
  if (rate && rate.allowed === false) return json({ ok: false, reden: 'te-vaak', wacht: rate.retryAfter }, 429);

  const soort = request.headers.get('content-type') || '';
  if (soort.startsWith('multipart/form-data')) return referentie(request, env, cid);

  let b;
  try { b = await request.json(); } catch { return json({ ok: false, reden: 'invoer' }, 400); }
  const id = Number(b && b.id) || 0;
  switch (b && b.doe) {
    case 'begin': {
      try { const a = await nieuweAanvraag(env, cid, String(b.dienst || ''), b.taal === 'en' ? 'en' : 'nl'); return json({ ok: true, aanvraag: a }); }
      catch { return json({ ok: false, reden: 'dienst' }, 400); }
    }
    case 'merk': return json({ ok: true, merk: await bewaarMerk(env, cid, b.merk) });
    case 'opslaan': {
      /* Lijst 112: na elke opslag de schatting en wat er nog ontbreekt, zodat het scherm meerekent zonder eigen rekenwerk. */
      const r = await bewaarConcept(env, cid, id, b.inhoud, b.versie);
      if (!r.ok) return uit(r);
      return json({ ok: true, ...(await volledig(env, cid, id)) });
    }
    /* Levering 117 (17 november 2026, proefronde P5-07): verstuur en reactie mailen; de link in de mail gaat naar deze site. */
    case 'verstuur': return uit(await verstuur(env, cid, id, { origin: new URL(request.url).origin }));
    case 'reactie': return uit(await reactieOpRonde(env, cid, id, { beelden: b.beelden, wel: b.wel, anders: b.anders, blijven: b.blijven, goed: b.goed === true, origin: new URL(request.url).origin }));
    /* De offerte (15 november 2026): akkoord maakt de bestelling en stuurt de betaallink; of de klant vraagt een aanpassing. */
    case 'offerte-akkoord': return uit(await akkoordEnBetaallink(env, cid, id, { zakelijk: b.zakelijk === true, origin: new URL(request.url).origin }));
    case 'offerte-aanpassen': return uit(await vraagAanpassing(env, cid, id, b.tekst));
    case 'besluit': return uit(await besluit(env, cid, id, String(b.onderwerp || ''), String(b.besluit || ''), b.notitie));
    case 'weg': return uit(await verwijderConcept(env, cid, id));
    default: return json({ ok: false, reden: 'doe' }, 400);
  }
}

async function referentie(request, env, cid) {
  if (!env.UPLOADS) return json({ ok: false, reden: 'opslag' }, 503);
  let f;
  try { f = await request.formData(); } catch { return json({ ok: false, reden: 'invoer' }, 400); }
  const id = Number(f.get('id')) || 0;
  const bestand = f.get('bestand');
  if (!bestand || typeof bestand === 'string') return json({ ok: false, reden: 'bestand' }, 400);
  if (!REF_TYPES.includes(bestand.type)) return json({ ok: false, reden: 'soort' }, 415);
  if (bestand.size > REF_BYTES) return json({ ok: false, reden: 'groot' }, 413);
  const a = await aanvraagVan(env, cid, id);
  if (!a) return json({ ok: false, reden: 'weg' }, 404);
  if (a.stand !== 'concept') return json({ ok: false, reden: 'stand' }, 409);
  const key = referentieSleutel(cid, id, bestand.name);
  await env.UPLOADS.put(key, bestand.stream(), { httpMetadata: { contentType: bestand.type }, customMetadata: { soort: 'maat-referentie', aanvraag: String(id) } });
  const r = await voegReferentieToe(env, cid, id, { r2Key: key, bestandsnaam: bestand.name, bytes: bestand.size, wat: f.getAll('wat'), notitie: String(f.get('notitie') || '') });
  if (!r.ok) { try { await env.UPLOADS.delete(key); } catch { /* niets */ } }
  return uit(r);
}
