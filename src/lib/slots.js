/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * SLOTS: WAT EEN ABONNEMENT PER SOORT GEEFT, EN WAT ERVAN OVER IS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas, 29 augustus 2026: *"Klanten krijgen 5 Catalog/lifestyle slots per maand
 * die ze zelf kunnen invullen (…) op confirm klikken waardoor ze een slot hebben
 * gelockt. 5 slots betekenen ook 5 producten."*
 *
 * En over doorschuiven: *"Ongebruikte slots schuiven per maand voor een maand
 * door, net als belastingaangifte die je uiterlijk het einde van de volgende
 * maand moet inleveren."*
 *
 * ── DRIE REGELS, EN ZE ZITTEN ALLE DRIE IN DIT BESTAND ──────────────────────
 *
 *   1 · EEN SLOT HEEFT EEN SOORT. Niet "12 producten" maar "12 completes" of
 *       "4 hooks, 2 motion, 1 lifestyle video". Daarmee is een gericht
 *       abonnement een regel in PLAN_SLOTS en geen nieuw scherm.
 *
 *   2 · DE OUDSTE GAAT ER ALS EERSTE AF. Zonder die regel gebeurt precies het
 *       omgekeerde van de bedoeling: iemand met tien slots zet er vijf vast, die
 *       gaan van de NIEUWE maand af, en op de eerste van de volgende maand
 *       vervallen de vijf oude die hij net had kunnen opmaken. Eén ORDER BY, en
 *       zonder die ene regel is doorschuiven een sigaar uit eigen doos.
 *
 *   3 · DE VERVALDATUM VOLGT UIT DE MAAND. Een rij IS de toekenning van één
 *       maand; hij telt mee zolang hij binnen het doorschuifvenster van de
 *       termijn valt (rolloverMonths() — 1 maandelijks, 3 jaarlijks). Er is geen
 *       kolom voor de vervaldatum, geen kolom voor het maximum en geen taak die
 *       verlopen slots opruimt: wat buiten het venster valt telt gewoon niet meer
 *       mee, en blijft staan als geschiedenis.
 *
 * ── WAAROM HET VERBRUIK OP HET VASTZETTEN ZIT EN NIET OP DE LEVERING ────────
 *
 * Lucas' eigen vergelijking, doorgetrokken: bij een aangifte moet je op tijd
 * INDIENEN, niet op tijd beoordeeld zijn. Zat de deadline op het maken, dan
 * verliest een klant met tien slots en één week van vijf de helft omdat ONZE
 * agenda vol zat — zijn schuld niet. Het slot gaat er dus af zodra hij het
 * product vastzet; wanneer het gemaakt wordt is daarna onze planning.
 */
import { PLAN_SLOTS, SLOT_KINDS, CUSTOM_MONTH_ID, slotProducts } from '../data/pricing.js';
import { monthlyCents, productsFor, rolloverMonths } from '../data/plans.js';

/** De maandsleutel 'YYYY-MM' van vandaag, of van een datum. */
export function monthKey(d = new Date()) {
  return new Date(d).toISOString().slice(0, 7);
}

/** N maanden terug vanaf een maandsleutel, als maandsleutel. */
export function monthMinus(maand, n) {
  const [j, m] = String(maand).split('-').map(Number);
  const d = new Date(Date.UTC(j, (m - 1) - n, 1));
  return d.toISOString().slice(0, 7);
}

/**
 * De laatste dag van de maand waarin deze toekenning vervalt, als 'YYYY-MM-DD'.
 *
 * Een toekenning uit maand M met een venster van 1 is bruikbaar tot en met het
 * eind van M+1 — precies Lucas' aangiftevergelijking. Deze datum staat nergens
 * opgeslagen; hij wordt hier uitgerekend uit de maand en het venster, zodat er
 * maar één plek is waar de regel leeft.
 */
export function vervaltOp(maand, venster) {
  const [j, m] = String(maand).split('-').map(Number);
  /* Dag 0 van de maand ERNA is de laatste dag van de maand die je bedoelt. */
  const d = new Date(Date.UTC(j, (m - 1) + Number(venster || 0) + 1, 0));
  return d.toISOString().slice(0, 10);
}

/** Wat dit plan per maand geeft, per soort. Altijd een nieuw object. */
export function slotsFor(planId) {
  return { ...(PLAN_SLOTS[String(planId || '')] || {}) };
}

/*
 * ── DRIE VRAGEN DIE OVER EEN ABONNEMENT GAAN EN NIET OVER EEN PLAN ─────────
 *
 * Sinds migratie 0038 kan een abonnement een MAAND OP MAAT zijn: een bundel en
 * een bedrag die op de rij staan in plaats van in PLAN_SLOTS en PLAN_AMOUNT.
 * Vanaf dat moment is "wat geeft dit plan" de verkeerde vraag geworden — de
 * juiste is "wat geeft dit abonnement", en dat is niet hetzelfde.
 *
 * Deze drie functies zijn de enige plek waar dat onderscheid gemaakt wordt. Elke
 * aanroeper die vroeger `slotsFor(sub.plan)` deed, hoort nu `bundelVoor(sub)` te
 * doen; wie dat vergeet, krijgt bij een maand op maat een LEGE bundel terug —
 * geen fout, gewoon een dashboard waarop de klant niets heeft. Vandaar dat
 * tests/maand-op-maat.test.mjs de aanroepplekken bij naam bewaakt.
 */

/** Wat DIT abonnement per maand geeft. De rij wint van de tabel. */
export function bundelVoor(sub) {
  const eigen = String(sub?.slots_json || '').trim();
  if (eigen) {
    try {
      const uit = JSON.parse(eigen);
      /* Alleen soorten die bestaan. Een sleutel die SLOT_KINDS niet kent, kan het
         dashboard niet benoemen en de agenda niet wegen; hem stil doorlaten zou
         een slot opleveren dat nergens naartoe leidt. */
      const schoon = {};
      for (const [kind, aantal] of Object.entries(uit || {})) {
        const n = Math.max(0, Math.floor(Number(aantal) || 0));
        if (n && kind in SLOT_KINDS) schoon[kind] = n;
      }
      if (Object.keys(schoon).length) return schoon;
    } catch {
      /* Onleesbare JSON op de rij. Terugvallen op het plan is hier het juiste:
         bij een maand op maat levert dat een lege bundel op en dus zichtbaar
         niets, in plaats van een gegokte bundel die de klant te veel of te weinig
         geeft. De fout hoort in het log en niet in het saldo. */
      console.error('[slots] slots_json is onleesbaar op abonnement', sub?.id);
    }
  }
  return slotsFor(sub?.plan);
}

/** Wat er maandelijks van DIT abonnement wordt afgeschreven, in centen, excl. btw. */
export function subMaandCents(sub) {
  const eigen = Number(sub?.amount_cents);
  if (Number.isFinite(eigen) && eigen > 0) return Math.round(eigen);
  return monthlyCents(sub?.plan, sub?.term);
}

/** Hoeveel producten DIT abonnement per maand vasthoudt — voor de capaciteitspoort. */
export function subProducten(sub) {
  if (String(sub?.plan || '') === CUSTOM_MONTH_ID || String(sub?.slots_json || '').trim()) {
    return slotProducts(bundelVoor(sub));
  }
  return productsFor(sub?.plan);
}

/** Alle soorten die dit plan kent, in de volgorde van de bundel. */
export function kindsFor(planId) {
  return Object.keys(slotsFor(planId));
}

/** Hoe een soort heet, in de taal van de pagina. */
export function kindLabel(kind, lang = 'nl') {
  const k = SLOT_KINDS[String(kind || '')];
  return k ? (k[lang] || k.en) : String(kind || '');
}

/** Waar één slot van deze soort uit bestaat, in de taal van de pagina. */
export function kindPer(kind, lang = 'nl') {
  const k = SLOT_KINDS[String(kind || '')];
  return k ? (k.per[lang] || k.per.en) : '';
}

/* Een mislukte query mag het scherm niet meeslepen. Zelfde vorm als stil() in
   subscription.js, en om dezelfde reden. */
async function stil(fn, terug = null) {
  try { return await fn(); } catch (e) {
    console.error('[slots]', e?.message || e);
    return terug;
  }
}

/**
 * De toekenning van één maand wegschrijven, per soort.
 *
 * IDEMPOTENT VIA DE UNIEKE SLEUTEL, en dat is de hele reden dat het `OR IGNORE`
 * is: Mollie levert dezelfde melding desnoods drie keer af. De tweede keer valt
 * elke rij om op idx_subslots_unique in plaats van de klant zijn slots dubbel te
 * geven. Zelfde mechanisme als bij subscription_months in migratie 0030.
 */
export async function grantSlots(env, subId, maand, abo, paymentId = null) {
  /* `abo` is de RIJ en niet de plan-id, sinds migratie 0038. Een maand op maat
     draagt zijn bundel zelf; wie hier een string doorgeeft krijgt nog steeds het
     goede antwoord voor een pakket, want bundelVoor() valt daarop terug. */
  const bundel = typeof abo === 'string' ? slotsFor(abo) : bundelVoor(abo);
  let gezet = 0;
  for (const [kind, aantal] of Object.entries(bundel)) {
    const n = Math.max(0, Math.floor(Number(aantal) || 0));
    if (!n) continue;   // een soort met nul hoort geen rij te krijgen
    const r = await stil(() => env.DB.prepare(
      `INSERT OR IGNORE INTO subscription_slots (subscription_id, month, kind, granted, used, payment_id)
       VALUES (?1, ?2, ?3, ?4, 0, ?5)`
    ).bind(subId, maand, kind, n, paymentId).run());
    if (Number(r?.meta?.changes || 0) > 0) gezet += 1;
  }
  return gezet;
}

/**
 * ── HOEVEEL MAANDEN ER DOORSCHUIFT, EN WAAROM DAT NIET ALLEEN DE TERMIJN IS ──
 *
 * Lucas, 29 augustus 2026: *"wanneer de klant het abonnement opzegt kan hij denk
 * ik niet de laatste betaalde maand een maand nog doorschuiven omdat hij dan geen
 * abonnement heeft."*
 *
 * Hij heeft gelijk, en het is precies de rand die je anders pas ziet als iemand
 * hem tegenkomt. Doorschuiven is een belofte over VOLGENDE maand, en een
 * opgezegd abonnement heeft geen volgende maand. Zijn betaalde maand zit hij nog
 * uit — dat mag, daar heeft hij voor betaald — maar wat hij dan niet gebruikt,
 * verdwijnt met de opzegging mee.
 *
 * Daarom komt het venster hier vandaan en niet meer rechtstreeks uit
 * rolloverMonths(): de termijn zegt hoeveel maanden een LOPEND abonnement mag
 * doorschuiven, en de status zegt of er nog een maand ís om naar door te
 * schuiven. Beide horen in het antwoord.
 *
 * De functies hieronder nemen dus een GETAL en geen termijn. Eén soort argument,
 * één betekenis — een parameter die soms 'monthly' en soms 0 is, is een fout die
 * niemand aan de aanroep ziet.
 */
export function vensterVoor(sub) {
  if (!sub) return 0;
  if (String(sub.status || '') === 'cancelled') return 0;
  return rolloverMonths(sub.term);
}

/**
 * Alle toekenningen die op deze dag nog meetellen, oudste eerst.
 *
 * `venster` komt uit de termijn. Alles ouder dan `maand - venster` is vervallen
 * en wordt niet gelezen — niet omdat het weg is, maar omdat het niet meer telt.
 */
export async function loadSlots(env, subId, venster, nu = new Date()) {
  const maand = monthKey(nu);
  const vanaf = monthMinus(maand, Math.max(0, Number(venster) || 0));
  const rijen = await stil(() => env.DB.prepare(
    `SELECT month, kind, granted, used FROM subscription_slots
      WHERE subscription_id = ?1 AND month >= ?2 AND month <= ?3
      ORDER BY month ASC`
  ).bind(subId, vanaf, maand).all().then((r) => r?.results || []), []);
  return (rijen || []).map((r) => ({
    month: String(r.month),
    kind: String(r.kind),
    granted: Math.max(0, Math.floor(Number(r.granted) || 0)),
    used: Math.max(0, Math.floor(Number(r.used) || 0)),
    vervalt: vervaltOp(String(r.month), venster),
  }));
}

/**
 * Het saldo per soort: hoeveel er is, hoeveel er vast staat, en wat er wanneer
 * vervalt.
 *
 * De vorm is bewust per SOORT en niet één totaal. Een totaal over soorten heen
 * is het getal dat niemand snapte: "12 van 12" zonder te zeggen waarvan.
 */
export function balansUit(rijen, maand = monthKey()) {
  const per = new Map();
  for (const r of rijen) {
    if (!per.has(r.kind)) per.set(r.kind, { kind: r.kind, toegekend: 0, verbruikt: 0, saldo: 0, dezeMaand: 0, ouder: 0, vervalt: [] });
    const b = per.get(r.kind);
    const over = Math.max(0, r.granted - r.used);
    b.toegekend += r.granted;
    b.verbruikt += r.used;
    b.saldo += over;
    if (r.month === maand) b.dezeMaand += r.granted;
    else {
      b.ouder += over;
      /* Alleen maanden waar nog iets van over is. Een lege oude maand hoort niet
         als "vervalt binnenkort" op het scherm te staan — er vervalt niets. */
      if (over > 0) b.vervalt.push({ month: r.month, over, op: r.vervalt });
    }
  }
  return [...per.values()];
}

/** Kan er `aantal` van deze soort bij? */
export function slotToegestaan(balans, kind, aantal = 1) {
  const n = Math.max(0, Math.floor(Number(aantal) || 0));
  if (!n) return false;
  const b = balans.find((x) => x.kind === kind);
  return Boolean(b) && b.saldo >= n;
}

/**
 * Eén of meer slots van deze soort afschrijven, OUDSTE MAAND EERST.
 *
 * Geeft terug hoeveel er daadwerkelijk is afgeschreven. Minder dan gevraagd
 * betekent dat het saldo op is; nul betekent dat er niets was.
 *
 * De UPDATE draagt zijn eigen voorwaarde (`used + ?n <= granted`) en leunt niet
 * op de peiling ervoor. Tussen lezen en schrijven kan een tweede tabblad
 * hetzelfde formulier posten, en dan is die voorwaarde het enige wat een
 * dubbele afschrijving tegenhoudt.
 */
export async function verbruikSlot(env, subId, venster, kind, aantal = 1, nu = new Date()) {
  let rest = Math.max(0, Math.floor(Number(aantal) || 0));
  if (!subId || !rest) return 0;
  const rijen = (await loadSlots(env, subId, venster, nu)).filter((r) => r.kind === kind);
  let geboekt = 0;
  for (const r of rijen) {            // loadSlots geeft ze al oudste eerst
    if (!rest) break;
    const ruimte = Math.max(0, r.granted - r.used);
    if (!ruimte) continue;
    const n = Math.min(ruimte, rest);
    const res = await stil(() => env.DB.prepare(
      `UPDATE subscription_slots SET used = used + ?4
        WHERE subscription_id = ?1 AND month = ?2 AND kind = ?3
          AND used + ?4 <= granted`
    ).bind(subId, r.month, kind, n).run());
    const raak = Number(res?.meta?.changes || 0) > 0;
    if (raak) { geboekt += n; rest -= n; }
  }
  if (geboekt < Math.max(0, Math.floor(Number(aantal) || 0))) {
    console.error('[slots] niet alles geboekt voor abonnement', subId, kind, '—', geboekt, 'van', aantal);
  }
  return geboekt;
}

/**
 * Slots teruggeven, NIEUWSTE MAAND EERST.
 *
 * Precies de spiegel van verbruikSlot(), en die volgorde is niet willekeurig:
 * wie iets losmaakt hoort het slot terug te krijgen dat hij het LAATST heeft
 * gebruikt. Zou het teruggaan naar de oudste maand, dan zou losmaken en opnieuw
 * vastzetten de vervaldatum stilletjes naar voren halen — je krijgt je slot
 * terug, maar met minder tijd erop.
 *
 * Dit bestaat omdat vastzetten terug te draaien moet zijn. Zonder dat kost een
 * typefout een slot, en dan durft niemand meer op de knop te drukken.
 */
export async function geefSlotTerug(env, subId, venster, kind, aantal = 1, nu = new Date()) {
  let rest = Math.max(0, Math.floor(Number(aantal) || 0));
  if (!subId || !rest) return 0;
  const rijen = (await loadSlots(env, subId, venster, nu)).filter((r) => r.kind === kind).reverse();
  let terug = 0;
  for (const r of rijen) {
    if (!rest) break;
    if (r.used <= 0) continue;
    const n = Math.min(r.used, rest);
    const res = await stil(() => env.DB.prepare(
      `UPDATE subscription_slots SET used = used - ?4
        WHERE subscription_id = ?1 AND month = ?2 AND kind = ?3 AND used >= ?4`
    ).bind(subId, r.month, kind, n).run());
    if (Number(res?.meta?.changes || 0) > 0) { terug += n; rest -= n; }
  }
  return terug;
}

/** Het saldo per soort, in één aanroep. */
export async function slotBalans(env, subId, venster, nu = new Date()) {
  return balansUit(await loadSlots(env, subId, venster, nu), monthKey(nu));
}
