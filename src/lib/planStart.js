/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * VAN WACHTRIJ NAAR BESTELLING — DE HANDELING DIE ONTBRAK
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas, 27 augustus 2026: *"Hoe werkt 'jouw lijst' nou precies want hier zit
 * toch helemaal geen werkend systeem achter."*
 *
 * Hij had gelijk, en scherper dan het klonk. Nagelopen in de code:
 *
 *   · de klant KON een lijst maken — queueAdd/queueRemove/queueReorder in
 *     subscription.js worden vanuit /account/plan aangeroepen en zijn getest;
 *   · de nachtelijke taak KEEK naar die lijst — checkPlanQueues() mailt de klant
 *     vijf dagen voor zijn week als er niets klaarstaat;
 *   · en verder gebeurde er niets. `verbruikToestaan`, `queueTake`,
 *     `queueLinkOrder` en `verbruikBoeken` stonden geschreven én getest, en
 *     werden door NIEMAND aangeroepen. WERKLIJST.md benoemde dat ook al: die
 *     vier horen bij één en dezelfde ontbrekende functie.
 *
 * Ondertussen stond er op /account/plan: *"de bovenste N starten automatisch. Je
 * hoeft niets te doen."* Een scherm dat iets belooft wat geen enkele regel code
 * uitvoert, is erger dan een scherm dat niets belooft: de klant wacht, en niemand
 * merkt dat er gewacht wordt. Die zin is inmiddels vervangen door wat er wél
 * gebeurt; dit bestand is het stuk dat het wáár maakt.
 *
 * ── WAAROM EEN ADMINHANDELING EN NIET DE NACHTELIJKE TAAK ────────────────────
 *
 * Lucas' keuze, en het is de goede eerste stap. Dit is een GELDPAD: er wordt
 * saldo afgeschreven en er ontstaat werk. Een geldpad dat om 03:10 draait zonder
 * dat iemand meekijkt, ontdek je pas als een klant vraagt waar zijn foto's
 * blijven. Eén knop per abonnee per maand is goedkoop; een stille fout niet.
 *
 * De functie hieronder is bewust zo geschreven dat de nachtelijke taak hem later
 * kan aanroepen zonder aanpassing: hij is idempotent per item (een opgehaald
 * item heeft `taken_at` en komt niet terug) en hij beslist zelf niets over de
 * datum.
 *
 * ── DE VIER STAPPEN, IN DEZE VOLGORDE ───────────────────────────────────────
 *
 *   1 · KIJKEN wat er klaarstaat. Alleen items MET foto's; een item zonder
 *       foto's kan niet gemaakt worden en wordt overgeslagen, precies zoals
 *       checkPlanQueues() ze ook al niet meetelt en zoals migratie 0030 het
 *       beschrijft.
 *   2 · SALDO TOETSEN met verbruikToestaan(). Meer op de lijst dan credits
 *       betekent niet "fout" maar "de rest schuift door" — dus wordt het aantal
 *       gekapt op het saldo en niet geweigerd.
 *   3 · DE BESTELLING MAKEN, en pas daarna
 *   4 · queueLinkOrder() + verbruikBoeken().
 *
 * De volgorde is niet willekeurig. Saldo afschrijven vóór de bestelling bestaat,
 * kan credits kosten zonder dat er werk tegenover staat. Andersom kan er een
 * bestelling ontstaan waar geen credit voor is afgeschreven — dat is de goedkope
 * kant van de fout: zichtbaar werk dat te veel is gemaakt, in plaats van
 * onzichtbaar saldo dat verdampt is.
 *
 * ── ÉÉN BESTELLING MET N PRODUCTEN, EN NIET N BESTELLINGEN ──────────────────
 *
 * Een abonnee koopt een WEEK, geen losse opdrachten. Eén bestelling betekent één
 * portaallink, één levering en één revisieronde — dezelfde vorm die een gewone
 * bestelling met twaalf producten ook heeft, met `product_p1..pN` in
 * details_json en de bestandsrijen die daarop aansluiten. N losse bestellingen
 * zouden N portalen, N mails en N revisierondes opleveren voor werk dat in één
 * week gemaakt wordt.
 *
 * ── HET GELD STAAT ER NIET OP ───────────────────────────────────────────────
 *
 * `total_cents = 0` en `payment_status = 'plan'`. De maandtermijn is al geïnd en
 * staat in `subscription_payments`, met een eigen factuur uit dezelfde reeks
 * (migratie 0032). Zou deze bestelling óók een bedrag dragen, dan telt elke
 * omzetsom die over `orders.total_cents` gaat de maand dubbel.
 *
 * 'plan' en niet 'unpaid' is nodig en niet cosmetisch: `payOrder()` in account.js
 * weigert alles wat niet 'unpaid' is, dus deze bestelling kan niet per ongeluk
 * een tweede keer afgerekend worden — en de klant krijgt geen betaalknop te zien
 * bij iets waar hij al voor betaalt.
 */
import {
  planState, verbruikToestaan, verbruikBoeken,
  queueTakeIds, queueLinkOrder, monthKey,
} from './subscription.js';

/* Zelfde vorm als makeRef() in functions/api/order.js: VIS-XXXX-XXX. Bewust
   hier herhaald en niet geïmporteerd — dat bestand is een Pages Function met
   een halve bestelstroom eraan vast, en deze vier regels zijn goedkoper dan de
   afhankelijkheid. Verandert de vorm ooit, dan hoort hij op beide plekken mee. */
function maakRef() {
  const t = Date.now().toString(36).toUpperCase().slice(-4);
  const r = Math.floor(Math.random() * 46656).toString(36).toUpperCase().padStart(3, '0');
  return `VIS-${t}-${r}`;
}

/** Het aantal dat vandaag opgepakt kan worden, zonder iets te veranderen. */
export function klaarOmTeStarten(state) {
  if (!state?.sub) return { items: [], saldo: 0, zonderFotos: 0 };
  const open = (state.wachtrij || []).filter((q) => !q.taken_at && !q.order_id);
  const metFotos = open.filter((q) => String(q.upload_batch || '').trim() !== '');
  const toegestaan = verbruikToestaan(state, metFotos.length) ? metFotos.length : 0;
  /* verbruikToestaan() is een ja/nee over het HELE aantal. Meer op de lijst dan
     saldo is geen weigering maar doorschuiven, dus wordt er gekapt en niet
     afgekeurd — zie de kop. */
  const n = Math.min(metFotos.length, Math.max(0, Number(state.saldo) || 0));
  return {
    items: metFotos.slice(0, toegestaan ? n : n),
    saldo: Math.max(0, Number(state.saldo) || 0),
    zonderFotos: open.length - metFotos.length,
    wachtend: Math.max(0, metFotos.length - n),
  };
}

/**
 * De week van één abonnee starten.
 *
 * @returns {Promise<{ok: boolean, reden?: string, orderId?: number, ref?: string, aantal?: number}>}
 */
export async function startPlanWindow(env, customerId, { max = null } = {}) {
  if (!env?.DB || !customerId) return { ok: false, reden: 'geen-db' };

  const state = await planState(env, customerId);
  if (!state.sub) return { ok: false, reden: 'geen-abonnement' };
  /* Een gepauzeerd of opgezegd abonnement mag geen werk starten. verbruikToestaan()
     dekt dat al af, maar een aparte melding is bruikbaarder dan "geen saldo". */
  if (state.sub.status !== 'active') return { ok: false, reden: `abonnement-${state.sub.status}` };

  const klaar = klaarOmTeStarten(state);
  let items = klaar.items;
  if (max != null) items = items.slice(0, Math.max(0, Math.floor(Number(max) || 0)));
  if (!items.length) {
    return { ok: false, reden: klaar.saldo ? 'niets-klaar' : 'geen-saldo', zonderFotos: klaar.zonderFotos };
  }
  if (!verbruikToestaan(state, items.length)) return { ok: false, reden: 'geen-saldo' };

  /* De klantgegevens komen uit de klantrij en niet uit een formulier: er is hier
     geen formulier. E-mail is NOT NULL op orders, dus zonder e-mail geen
     bestelling — en dat kan niet gebeuren, want een abonnement hangt aan een
     klant die is ingelogd. Toch getoetst: een NOT NULL die op een aanname rust,
     is een 500 die op een dinsdag afgaat. */
  const klant = await env.DB.prepare(
    'SELECT id, email, name, brand FROM customers WHERE id = ?1'
  ).bind(customerId).first().catch(() => null);
  if (!klant?.email) return { ok: false, reden: 'geen-klant' };

  const details = { bron: 'abonnement', abonnement: state.sub.ref, maand: monthKey() };
  items.forEach((q, i) => {
    details[`product_p${i + 1}`] = String(q.name || '').slice(0, 120);
    const note = String(q.note || '').trim();
    if (note) details[`note_p${i + 1}`] = note.slice(0, 500);
    const batch = String(q.upload_batch || '').trim();
    if (batch) details[`batch_p${i + 1}`] = batch;
  });

  /* DE TAAL KOMT VAN DE VORIGE BESTELLING EN NIET VAN `customers` — die tabel
     heeft geen taalkolom, nagekeken in schema.sql en niet aangenomen naar
     analogie van `orders`. Heeft de klant nog nooit besteld, dan is het 'nl':
     dit is een Nederlands bedrijf, en het enige wat deze keuze raakt is de taal
     van zijn mail en zijn portaal. */
  const vorige = await env.DB.prepare(
    'SELECT lang FROM orders WHERE customer_id = ?1 ORDER BY id DESC LIMIT 1'
  ).bind(customerId).first().catch(() => null);
  const taal = vorige?.lang === 'en' ? 'en' : 'nl';

  const ref = maakRef();
  const rij = await env.DB.prepare(
    `INSERT INTO orders (ref, customer_id, service, name, brand, email, details_json,
                         total_cents, lang, tier, product_count, payment_status)
     VALUES (?1, ?2, 'drop', ?3, ?4, ?5, ?6, 0, ?7, 'attended', ?8, 'plan')
     RETURNING id`
  ).bind(
    ref, customerId, klant.name || null, klant.brand || null, klant.email,
    JSON.stringify(details), taal, items.length,
  ).first().catch((e) => { console.error('[abonnement] bestelling maken mislukt:', e?.message || e); return null; });
  if (!rij?.id) return { ok: false, reden: 'bestelling-mislukt' };

  /* Pas nu de wachtrij bijwerken en het saldo afschrijven. Mislukt één van de
     twee, dan staat er zichtbaar werk te veel — zie de kop voor waarom dat de
     goedkope kant is. Allebei loggen luid. */
  const gepakt = await queueTakeIds(env, customerId, items.map((q) => q.id));
  await queueLinkOrder(env, items.map((q) => q.id), rij.id);
  const geboekt = await verbruikBoeken(
    env, state.sub.id, monthKey(), items.length, state.toegekend,
  );
  if (geboekt !== items.length) {
    console.error('[abonnement] saldo niet geboekt voor', ref, '—', geboekt, 'van', items.length);
  }

  return { ok: true, orderId: rij.id, ref, aantal: items.length, gepakt, geboekt, wachtend: klaar.wachtend };
}
