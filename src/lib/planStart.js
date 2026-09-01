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
 *   1 · KIJKEN wat er klaarstaat. Alleen items die de klant heeft VASTGEZET —
 *       en dus met foto's, want queueLock() zet niets vast zonder. Een concept
 *       blijft staan tot hij het zelf vastzet, precies zoals checkPlanQueues()
 *       het ook al niet meetelt en zoals migratie 0030 het beschrijft.
 *   2 · (VERVALLEN, 29 augustus 2026) Hier werd het saldo getoetst en geboekt.
 *       Dat gebeurt sinds migratie 0035 bij het VASTZETTEN door de klant zelf —
 *       zie queueLock() in subscription.js. Wat hier binnenkomt is dus al
 *       betaald; nog een keer afschrijven zou dubbel zijn.
 *   3 · DE BESTELLING MAKEN, en pas daarna
 *   4 · queueLinkOrder().
 *
 * De volgorde was niet willekeurig toen stap 2 hier nog stond: saldo afschrijven
 * vóórdat de bestelling bestaat, kan credits kosten zonder werk ertegenover.
 * Sinds het slotmodel valt die afweging bij queueLock(), en die rolt het slot
 * terug als het vastzetten alsnog niet doorgaat. Wat hier overblijft heeft geen
 * geldkant meer — het ergste dat hier misgaat is een bestelling zonder items
 * eraan gekoppeld, en dat is zichtbaar in plaats van stil.
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
  planState,
  queueTakeIds, queueUntakeIds, queueLinkOrder, monthKey,
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
  if (!state?.sub) return { items: [], saldo: 0, zonderFotos: 0, concepten: 0, wachtend: 0 };
  const open = (state.wachtrij || []).filter((q) => !q.taken_at && !q.order_id);
  /* ── VASTGEZET, EN NIET "ALLES MET FOTO'S" — migratie 0035, 29 augustus 2026 ──
   *
   * Hier stond `open.filter(heeft foto's)`, en dat klopte zolang toevoegen en
   * betalen hetzelfde moment waren. Sinds Lucas' slotmodel is dat uit elkaar
   * getrokken: een item is een CONCEPT tot de klant op vastzetten drukt, en op
   * dát moment wordt het slot afgeschreven.
   *
   * Wat hier binnenkomt moet dus vastgezet zijn. Een concept meenemen zou werk
   * maken waar niet voor betaald is — en erger nog, het saldo zou er hieronder
   * een tweede keer voor worden afgeschreven.
   *
   * Foto's blijven een voorwaarde, maar niet meer hier: queueLock() weigert al
   * vast te zetten zonder foto's. Deze regel staat er als tweede sluiting op
   * dezelfde deur, voor een rij die er door een oude import toch zonder in staat. */
  const vast = open.filter((q) => q.locked_at && String(q.upload_batch || '').trim() !== '');
  return {
    items: vast,
    saldo: Math.max(0, Number(state.saldo) || 0),
    zonderFotos: open.filter((q) => !String(q.upload_batch || '').trim()).length,
    concepten: open.filter((q) => !q.locked_at).length,
    wachtend: 0,
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
    /* ── ÉÉN REDEN, EN GEEN KEUZE MEER TUSSEN TWEE — migratie 0035 ────────────
     *
     * Hier stond `klaar.saldo ? 'niets-klaar' : 'geen-saldo'`. Dat was een
     * keuze tussen twee redenen die sinds het slotmodel niet meer bestaat: wat
     * hier binnenkomt is al vastgezet en dus al betaald, en `state.saldo` telt
     * de oude maandkolom die niemand meer afschrijft. Die zou dus altijd vol
     * staan en de tak 'geen-saldo' nooit kiezen — een melding die je denkt te
     * hebben, net als de tak die in cron/index.js om dezelfde reden weg moest.
     *
     * Staat er niets klaar, dan is dat de hele reden. */
    return { ok: false, reden: 'niets-klaar', zonderFotos: klaar.zonderFotos, concepten: klaar.concepten };
  }
  /* Op deze regel stond `if (!verbruikToestaan(state, items.length))`. Twee
     dingen waren daar mis mee, en het tweede is het ergere: die functie geeft
     een OBJECT terug, dus `!` erop was altijd onwaar en de controle heeft nooit
     één keer gelopen. En zou hij wel lopen, dan toetste hij het verkeerde: de
     oude maandteller, terwijl doorgeschoven slots juist buiten de toekenning
     van deze maand vallen. Een klant met vijf doorgeschoven producten zou zijn
     eigen, betaalde werk geweigerd zien. Wat er wél toe doet — loopt het
     abonnement — staat drie regels hierboven. */

  /* De klantgegevens komen uit de klantrij en niet uit een formulier: er is hier
     geen formulier. E-mail is NOT NULL op orders, dus zonder e-mail geen
     bestelling — en dat kan niet gebeuren, want een abonnement hangt aan een
     klant die is ingelogd. Toch getoetst: een NOT NULL die op een aanname rust,
     is een 500 die op een dinsdag afgaat. */
  const klant = await env.DB.prepare(
    'SELECT id, email, name, brand FROM customers WHERE id = ?1'
  ).bind(customerId).first().catch(() => null);
  if (!klant?.email) return { ok: false, reden: 'geen-klant' };

  /* ── EERST OPPAKKEN, DAN PAS DE BESTELLING BOUWEN — 30 augustus 2026 ───────
   *
   * Deze twee stonden andersom: bestelling maken, dan oppakken. Dat is de
   * volgorde die de kop hierboven verdedigt — een bestelling zonder items is
   * zichtbaar, items zonder bestelling niet — en hij was goed zolang oppakken
   * altijd lukte.
   *
   * Sinds queueTakeIds() ook `locked_at IS NOT NULL` eist, kan het mislukken, en
   * wel precies in het geval waar Lucas naar vroeg: de klant maakt een item los
   * op hetzelfde moment dat deze knop wordt ingedrukt. Met de oude volgorde
   * stond dat item dan wél in de bestelling — inclusief zijn `product_pN` — en
   * was zijn slot terug. Product gemaakt, niets betaald.
   *
   * Dus wordt er nu eerst opgepakt, en wordt de bestelling gebouwd van wat er
   * werkelijk is opgepakt. De zorg uit de kop blijft overeind door de tak
   * hieronder: gaat de INSERT niet door, dan wordt het oppakken teruggedraaid en
   * staan de items gewoon weer op de lijst van de klant. */
  const gepakteIds = await queueTakeIds(env, customerId, items.map((q) => q.id));
  if (!gepakteIds.length) return { ok: false, reden: 'niets-klaar', zonderFotos: klaar.zonderFotos, concepten: klaar.concepten };
  const mee = items.filter((q) => gepakteIds.includes(q.id));
  if (mee.length !== items.length) {
    /* Geen fout, wel het vermelden waard: er is tussen lezen en oppakken iets
       veranderd. Bijna altijd is dat een klant die net iets losmaakte. */
    console.log('[abonnement] klant', customerId, '—', items.length - mee.length,
      'item(s) vielen tussen lezen en oppakken af; de bestelling draagt er', mee.length);
  }

  /* ── ÉÉN BESTELLING PER GEKOZEN DAGENPAAR — 31 augustus 2026 ─────────────
   *
   * Hier werd van alles wat vastgezet stond ÉÉN bestelling gemaakt, zonder
   * `window_start` en `window_end`, met `tier = 'attended'`. Dat was juist zolang
   * een abonnement één week per maand had. Sinds een klant per product twee dagen
   * kan aanwijzen, klopte het op drie manieren niet meer:
   *
   *   · de gekozen dagen gingen verloren — de bestelling droeg ze niet;
   *   · de capaciteit kwam vrij op het moment dat het werk begon, want
   *     src/lib/agenda.js telt een wachtrij-item alleen mee zolang `taken_at`
   *     leeg is, en de bestelling die ervoor in de plaats kwam hield niets bezet;
   *   · en in het agendascherm stond het werk als "zo snel mogelijk" met een
   *     uiterste dag die uit de binnenkomst was afgeleid in plaats van uit de
   *     afspraak.
   *
   * Lucas' keuze, gevraagd en gekregen: *"Elk paar zijn eigen bestelling."* Een
   * week levert dus soms twee of drie bestellingen op, en elke bestelling draagt
   * de dagen die de klant koos. Wat geen dagen koos, gaat samen in één bestelling
   * zonder venster — dat is precies wat "zo snel mogelijk" betekent, en `tier`
   * hoort daar dan ook 'unattended' te zijn en niet 'attended-zonder-datum'.
   *
   * ── DE VOLGORDE BLIJFT: EERST OPPAKKEN, DAN BOUWEN ────────────────────────
   *
   * De items zijn hierboven al opgepakt, en dat verandert niet. Wat wel verandert
   * is dat er nu meerdere INSERTs kunnen mislukken. Mislukt er één, dan worden
   * ALLEEN de items van die groep teruggezet — de groepen die het wel haalden
   * hebben een bestelling en horen te blijven staan. Alles terugdraaien zou werk
   * weggooien dat al bestaat. */
  const groepen = new Map();
  for (const q of mee) {
    const sleutel = q.window_start && q.window_end ? `${q.window_start}|${q.window_end}` : 'asap';
    if (!groepen.has(sleutel)) groepen.set(sleutel, []);
    groepen.get(sleutel).push(q);
  }

  /* De vroegste eerst, en "zo snel mogelijk" achteraan. Dat is de volgorde waarin
     jij ze in je agendascherm terugziet, en de volgorde waarin ze af moeten. */
  const gesorteerd = [...groepen.entries()].sort(([a], [b]) => {
    if (a === 'asap') return 1;
    if (b === 'asap') return -1;
    return a < b ? -1 : a > b ? 1 : 0;
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

  const bestellingen = [];
  const mislukt = [];
  for (const [sleutel, rijen] of gesorteerd) {
    const [vensterStart, vensterEind] = sleutel === 'asap' ? [null, null] : sleutel.split('|');
    const details = { bron: 'abonnement', abonnement: state.sub.ref, maand: monthKey() };
    if (vensterStart) { details.venster_start = vensterStart; details.venster_eind = vensterEind; }
    rijen.forEach((q, i) => {
      details[`product_p${i + 1}`] = String(q.name || '').slice(0, 120);
      const note = String(q.note || '').trim();
      if (note) details[`note_p${i + 1}`] = note.slice(0, 500);
      const batch = String(q.upload_batch || '').trim();
      if (batch) details[`batch_p${i + 1}`] = batch;
    });

    const ref = maakRef();
    const rij = await env.DB.prepare(
      `INSERT INTO orders (ref, customer_id, service, name, brand, email, details_json,
                           total_cents, lang, tier, product_count, payment_status,
                           window_start, window_end)
       VALUES (?1, ?2, 'drop', ?3, ?4, ?5, ?6, 0, ?7, ?8, ?9, 'plan', ?10, ?11)
       RETURNING id`
    ).bind(
      ref, customerId, klant.name || null, klant.brand || null, klant.email,
      JSON.stringify(details), taal,
      vensterStart ? 'attended' : 'unattended',
      rijen.length, vensterStart, vensterEind,
    ).first().catch((e) => { console.error('[abonnement] bestelling maken mislukt:', e?.message || e); return null; });

    if (!rij?.id) {
      mislukt.push(...rijen.map((q) => q.id));
      continue;
    }
    await queueLinkOrder(env, rijen.map((q) => q.id), rij.id);
    bestellingen.push({ orderId: rij.id, ref, aantal: rijen.length, start: vensterStart, eind: vensterEind });
  }

  if (mislukt.length) {
    /* TERUGZETTEN, want deze items staan op opgepakt en er is niets om ze aan te
       hangen. Zonder dit is de klant zijn slot kwijt, is zijn item van zijn lijst
       verdwenen, en is er geen bestelling — de enige uitkomst die erger is dan het
       werk te veel maken. */
    const terug = await queueUntakeIds(env, mislukt);
    console.error('[abonnement] klant', customerId, '—', terug, 'van', mislukt.length,
      'item(s) teruggezet op de lijst na een mislukte bestelling');
  }
  if (!bestellingen.length) return { ok: false, reden: 'bestelling-mislukt' };

  /* De eerste bestelling staat los in de uitkomst omdat de aanroepers hem zo
     lezen — het beheerscherm logt `orderId` en `ref`. `bestellingen` staat ernaast
     voor wie het hele beeld wil, en `aantal` telt alles bij elkaar zodat de regel
     in het logboek blijft kloppen. */
  const eerste = bestellingen[0];
  return {
    ok: true,
    orderId: eerste.orderId,
    ref: eerste.ref,
    aantal: bestellingen.reduce((n, b) => n + b.aantal, 0),
    bestellingen,
    gepakt: gepakteIds.length,
    geboekt: 0,
    wachtend: 0,
  };
}
