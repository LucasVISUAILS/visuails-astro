/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * EEN BESTELLING AFRONDEN ZODRA HET LAATSTE BEELD IS GOEDGEKEURD
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ── WAAROM DIT EEN EIGEN BESTAND IS (8 augustus 2026) ────────────────────────
 *
 * Deze functie stond als `maybeClose()` in account.js en werd daar uit precies
 * één plek aangeroepen: het goedkeurpad van /account/review. Het goedkeurpad in
 * portal.js — de /o/<token>-link die in élke levermail staat — riep hem NIET aan.
 *
 * Het gevolg: een klant die de laatste foto goedkeurde via de link uit zijn mail
 * sloot zijn bestelling niet af. `closed_at` bleef leeg, de gebeurtenis kwam niet
 * op de tijdlijn, en de bestelling gold voor de rest van het systeem als "nog
 * open". Dat is de hoofdroute, niet de uitzondering: de portaallink is wat de
 * klant krijgt toegestuurd, het dashboard is waar hij naartoe moet klikken.
 *
 * Gevonden bij het uitwerken van reviewverzamelingspecificatie.md, waarvan de
 * trigger letterlijk "alle visuals goedgekeurd" is. Zonder deze reparatie zou
 * die trigger op de hoofdroute nooit afgaan en zou de hele reviewvraag stil
 * uitblijven bij precies de klanten die het meest tevreden zijn.
 *
 * ── WAAROM NIET GEWOON IMPORTEREN UIT account.js ─────────────────────────────
 *
 * portal.js zegt op twee plekken expliciet dat het de dashboardmodule niet wil
 * importeren voor een UPDATE, en dupliceert daarvoor twee regels SQL. Dat
 * argument klopt voor twee regels en niet voor deze functie: dit is een subtiele
 * query met drie voorwaarden en een stilzwijgende terugval, en die twee keer
 * onderhouden is hoe de twee paden verschillend gaan sluiten zonder dat iemand
 * het merkt. Dus geen import van de ene lib in de andere, maar één klein bestand
 * dat ze beide importeren — geen van de twee wordt daarmee afhankelijk van de
 * ander.
 */

import { stampUploadRetention, clearUploadRetention, DELIVERY_DAYS } from './retention.js';
import { SAMPLE_SERVICE } from '../data/pricing.js';
/* De revisietermijn, voor het stille afronden onderaan (3.03). */
import { REVISIE_DAGEN } from '../data/pricing.js';

/**
 * Rond de bestelling af als élk levend leveringsbeeld is goedgekeurd.
 *
 * DRIE VOORWAARDEN, EN ALLE DRIE ZIJN NODIG:
 *   · de bestelling staat op `delivered` — een bestelling die nog in productie is
 *     kan niet af zijn, ook al is er toevallig niets meer te keuren;
 *   · `closed_at` is leeg — anders zou een tweede goedkeuring de afronddatum
 *     opnieuw zetten en de tijdlijn een tweede keer beschrijven;
 *   · er is minstens één levend beeld EN ze zijn allemaal goedgekeurd. Nul
 *     beelden telt niet als "alles goedgekeurd"; dat is een bestelling waar nog
 *     niets van geleverd is.
 *
 * "Levend" betekent: kind='delivery', niet vervangen (`superseded_at`), en niet
 * verlopen. Een vervangen beeld is een oudere versie van iets dat opnieuw
 * beoordeeld moet worden, en die mag een afronding niet in de weg staan of
 * afdwingen.
 *
 * MISLUKKEN IS GEEN FOUT VOOR DE KLANT. Afronden is een gevolg, geen handeling.
 * Gaat het mis, dan staat de bestelling een dag langer open — dat is geen reden
 * om de goedkeuring die de klant net gaf te laten mislukken. Vandaar de catch,
 * en vandaar dat de aanroeper de uitkomst niet hoeft te controleren.
 *
 * @returns {Promise<boolean>} true als deze aanroep de bestelling heeft afgerond.
 *   Dat is wat de reviewvraag nodig heeft: "is dit het moment", niet "is hij af".
 *   Bij twijfel of bij een fout: false.
 */
export async function maybeCloseOrder(env, orderId) {
  try {
    const row = await env.DB.prepare(
      `SELECT
         (SELECT COUNT(*) FROM files f
           WHERE f.order_id = o.id AND f.kind = 'delivery'
             AND f.superseded_at IS NULL
             AND (f.expires_at IS NULL OR f.expires_at > datetime('now'))) AS live,
         (SELECT COUNT(*) FROM files f
           WHERE f.order_id = o.id AND f.kind = 'delivery'
             AND f.superseded_at IS NULL
             AND (f.expires_at IS NULL OR f.expires_at > datetime('now'))
             AND f.review_state = 'approved') AS approved,
         o.status, o.closed_at, o.lang, o.service
       FROM orders o WHERE o.id = ?1`
    ).bind(orderId).first();
    if (!row || row.closed_at || row.status !== 'delivered') return false;
    /* ── DE €1-PROEF IS AF OP HET MOMENT VAN LEVERING — 8 oktober 2026 ───────
       Punt 3.08, V29 = a. Een proef heeft geen goedkeuren en geen revisieronde
       (canReviewOrder in pricing.js), dus er komt nooit een "alles goedgekeurd"
       dat hem afrondt. Wachten heeft geen zin: zodra er een levend beeld is en
       de status op geleverd staat, is hij af — met de reden "proef" op de
       tijdlijn. De privélink toont dan meteen de downloads, "Bestel in deze
       look" en het afrondblok. admin.js roept dit aan bij elke statuswissel
       naar geleverd. */
    const proef = row.service === SAMPLE_SERVICE;
    if (!row.live || (!proef && row.approved !== row.live)) return false;

    // De WHERE-voorwaarde op closed_at staat er nog een tweede keer, met opzet:
    // tussen de SELECT hierboven en deze UPDATE kan een tweede tabblad van
    // dezelfde klant hetzelfde hebben gedaan. Dan schrijft deze UPDATE niets en
    // is de gebeurtenis hieronder de enige dubbeling — hinderlijk op een
    // tijdlijn, niet schadelijk in de administratie.
    await env.DB.batch([
      env.DB.prepare("UPDATE orders SET closed_at = datetime('now') WHERE id = ?1 AND closed_at IS NULL").bind(orderId),
      env.DB.prepare(
        `INSERT INTO order_events (order_id, status, note, actor)
         VALUES (?1, 'delivered', ?2, 'system')`
      ).bind(orderId, proef
        ? (row.lang === 'en'
          ? `Completed on delivery (trial): a trial has no revision round. Downloads stay available for ${DELIVERY_DAYS} days after delivery.`
          : `Afgerond bij levering (proef): bij de proef hoort geen revisieronde. Downloaden blijft mogelijk tot ${DELIVERY_DAYS} dagen na levering.`)
        : row.lang === 'en'
          ? `All images approved — order complete. Downloads stay available for ${DELIVERY_DAYS} days after delivery.`
          : `Alle beelden goedgekeurd — bestelling afgerond. Downloaden blijft mogelijk tot ${DELIVERY_DAYS} dagen na levering.`),
    ]);

    /*
     * ── HIER BEGINT DE KLOK VAN HET BRONMATERIAAL, 9 AUGUSTUS 2026 ──────────
     *
     * /privacy §6 en /terms §7 beloven dat geüploade productfoto's 90 dagen na het
     * afsluiten van de bestelling worden verwijderd. `files.expires_at` bestond
     * sinds migratie 0001, mét de opmerking "set when the order closes", en werd
     * door geen enkele query ooit gevuld. Dit is die query.
     *
     * NA de batch en niet erin, want de UPDATE leest `orders.closed_at` — die moet
     * dus al geschreven zijn. In één batch zou hij de oude waarde (NULL) lezen en
     * niets stempelen, stil.
     *
     * De uitkomst wordt niet gecontroleerd en een fout hier laat het afronden staan:
     * de opruimtaak leidt de 90 dagen ook zelf af uit closed_at, precies zodat deze
     * regel geen enkel punt is waar de belofte op kan hangen. Zie de kop van
     * src/lib/retention.js.
     */
    try {
      await stampUploadRetention(env, orderId).run();
    } catch (err) {
      console.error('[close] bewaartermijn niet gestempeld voor bestelling', orderId, '—', err?.message || err);
    }

    return true;
  } catch (err) {
    console.error('[close] afronden overgeslagen voor bestelling', orderId, '—', err?.message || err);
    return false;
  }
}

/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * STIL AFRONDEN NA DE REVISIETERMIJN — 8 oktober 2026 (punt 3.03, V24 = a)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Zonder "Alles goed" bleef een bestelling voor altijd op Geleverd: geen
 * closed_at, dus geen wisdatum voor de bronfoto's, geen afgeronde stand op de
 * privélink en geen reviewvraag. De nachtelijke taak (stilAfronden() in
 * cron/index.js) rondt zo'n bestelling nu af als er REVISIE_DAGEN lang niets is
 * gebeurd sinds de laatste levering of het laatste revisieantwoord.
 *
 * ── DE TERMIJN IS DE REVISIETERMIJN ─────────────────────────────────────────
 * Geen eigen getal: wie de revisietermijn verandert, verandert ook dit. De
 * levermail en Studio noemen "revisie tot en met <datum>" (leverDatums() in
 * src/lib/leverdatums.js, als UTC-datum). Daarom telt hier de KALENDERDAG:
 * afgerond wordt pas in de nacht ná die datum, `date(laatste, '+N days') <
 * date('now')`. Met uren rekenen zou een levering van 01:00 uur op de
 * genoemde laatste dag al om 03:10 uur afronden.
 *
 * ── WAT "IETS GEBEURD" IS ───────────────────────────────────────────────────
 * Het jongste van: de levermail, de herlevermail, een geleverd bestand, een
 * ingediende revisieronde, een revisieverzoek en het antwoord daarop. De klok
 * telt vanaf de láátste, zodat een herlevering op dag 6 niet de nacht erna al
 * wordt afgerond voordat de klant de nieuwe beelden zag.
 *
 * ── WAT HIJ OVERSLAAT ───────────────────────────────────────────────────────
 *   · een open revisie (een verzoek zonder antwoord, of een levend beeld dat op
 *     revisie staat): daar wacht de klant op ons, niet andersom;
 *   · onbetaald: alleen 'paid' en 'plan' (abonnementswerk gaat mee);
 *   · al afgerond (closed_at), bv. de €1-proef die bij levering afrondt;
 *   · zonder levermail: dan weet de klant nog niet dat er iets klaarstaat, en
 *     de levermailbewaker meldt hem al in het nachtrapport;
 *   · verborgen bestellingen (testwerk).
 *
 * STIL: geen mail aan de klant. De regel in order_events heeft actor 'intern'
 * (een werkregel, niet voor de tijdlijn van de klant; zie admin.js), en het
 * nachtrapport noemt de kenmerken. Omkeerbaar: closed_at leeg maken heropent.
 *
 * ── EN WEER OPENEN TELT OOK ALS "IETS GEBEURD" — 11 oktober 2026 (w2 = b) ──
 * Lucas kan een afgeronde bestelling in /admin weer openen (heropenBestelling()
 * hieronder). Dan zet orders.reopened_at het moment (migratie 0066), en dat
 * staat in het rijtje hieronder: anders telde de klok vanaf de levering van
 * weken geleden en ging de bestelling de eerstvolgende nacht alweer dicht.
 */
export const STIL_AFRONDEN_DAGEN = REVISIE_DAGEN;

/** Het merkteken van de regel in order_events, ook om hem terug te vinden. */
export const STIL_AFGEROND_NOTITIE = `Stil afgerond: ${REVISIE_DAGEN} dagen na de laatste levering geen revisie en geen reactie. Er ging geen mail uit.`;

/** Hoeveel bestellingen per nacht hoogstens (de meetlat van de cron telt mee). */
export const STIL_AFRONDEN_LIMIET = 25;

export const STIL_AFRONDEN_SQL = `
  SELECT id, ref FROM (
    SELECT o.id, o.ref,
           MAX(COALESCE(o.delivery_mailed_at, ''), COALESCE(o.redelivery_mailed_at, ''),
               COALESCE(o.revision_round_at, ''), COALESCE(o.reopened_at, ''),
               COALESCE((SELECT MAX(f.created_at) FROM files f WHERE f.order_id = o.id AND f.kind = 'delivery'), ''),
               COALESCE((SELECT MAX(r.created_at) FROM revision_requests r WHERE r.order_id = o.id), ''),
               COALESCE((SELECT MAX(r.resolved_at) FROM revision_requests r WHERE r.order_id = o.id), '')) AS laatste
      FROM orders o
     WHERE o.status = 'delivered'
       AND o.closed_at IS NULL
       AND o.delivery_mailed_at IS NOT NULL
       AND COALESCE(o.payment_status, 'unpaid') IN ('paid', 'plan', 'credits')
       AND COALESCE(o.hidden_at, '') = ''
       AND NOT EXISTS (SELECT 1 FROM revision_requests r WHERE r.order_id = o.id AND r.resolved_at IS NULL)
       AND NOT EXISTS (SELECT 1 FROM files f WHERE f.order_id = o.id AND f.kind = 'delivery'
                         AND f.superseded_at IS NULL AND f.review_state = 'revision_requested')
  )
  WHERE laatste <> '' AND date(laatste, '+${REVISIE_DAGEN} days') < date('now')
  ORDER BY id
  LIMIT ${STIL_AFRONDEN_LIMIET}`;

/**
 * Eén bestelling stil afronden. De UPDATE herhaalt de voorwaarden die tussen de
 * SELECT en nu kunnen veranderen (afgerond in een ander tabblad, een revisie die
 * net binnenkwam); schrijft hij niets, dan volgt er ook geen regel.
 *
 * @returns {Promise<boolean>} true als deze aanroep hem heeft afgerond.
 */
export async function rondStilAf(env, orderId) {
  const uit = await env.DB.prepare(
    `UPDATE orders SET closed_at = datetime('now')
      WHERE id = ?1 AND closed_at IS NULL AND status = 'delivered'
        AND NOT EXISTS (SELECT 1 FROM revision_requests r WHERE r.order_id = ?1 AND r.resolved_at IS NULL)`
  ).bind(orderId).run();
  if (!(Number(uit?.meta?.changes) > 0)) return false;
  await env.DB.prepare(
    "INSERT INTO order_events (order_id, status, note, actor) VALUES (?1, 'delivered', ?2, 'intern')"
  ).bind(orderId, STIL_AFGEROND_NOTITIE).run();
  /* De klok van het bronmateriaal, net als bij maybeCloseOrder() hierboven: na
     het afronden, en een fout hier laat het afronden staan. */
  try {
    await stampUploadRetention(env, orderId).run();
  } catch (err) {
    console.error('[close] bewaartermijn niet gestempeld voor bestelling', orderId, '—', err?.message || err);
  }
  return true;
}

/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * WEER OPENEN DOOR VISUAILS — 11 oktober 2026 (afvinklijst 3, w2 = b)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas bij w2: *"Wellicht is het handig dat ik de order wel nog kan openen voor
 * wanneer hier een reden voor is."* De voorwaarden (§10, REVISIEBELEID in
 * pricing.js) zeggen sindsdien dat wij een afgeronde bestelling in overleg weer
 * kunnen openen; dit is de knop daarvoor, op de bestelpagina in /admin.
 *
 * WAT HET DOET, EN ALLEEN DAT:
 *   · closed_at weer leeg en reopened_at = nu (migratie 0066). Studio en de
 *     privélink tonen hem dan weer als Geleverd, met de revisiedatum vanaf nu
 *     (leverDatumsVan() in leverdatums.js); het stille afronden telt ook vanaf
 *     nu (STIL_AFRONDEN_SQL hierboven), dus de klant heeft weer REVISIE_DAGEN
 *     dagen tot en met de genoemde datum;
 *   · de wisdatum van de bronfoto's weg (clearUploadRetention(), net als bij een
 *     goedkeuring die de klant ongedaan maakt). Gaat hij later weer dicht, dan
 *     stempelen maybeCloseOrder() en rondStilAf() de 90 dagen opnieuw, vanaf
 *     dat nieuwe closed_at. De opruimtaak leidt de termijn ook zelf af uit
 *     closed_at, en die is nu leeg: er wordt niets gewist zolang hij open staat;
 *   · één regel op de tijdlijn, in de taal van de bestelling, die de klant ook
 *     ziet: "Weer geopend door VISUAILS op …".
 *
 * WAT HET NIET DOET: geen mail aan de klant (Lucas neemt zelf contact op), en
 * de revisieronde blijft zoals hij was. Is die al gebruikt (revision_round_at),
 * dan kan de klant na weer openen beelden goedkeuren maar geen tweede ronde
 * indienen; /admin zegt dat vóór de klik.
 *
 * Niet bij de €1-proef: die heeft geen revisieronde en is af bij levering.
 * Niet bij een geannuleerde bestelling: die staat niet op 'delivered'.
 */

/** Mag deze bestelling weer geopend worden? Afgerond, geleverd, geen proef. */
export function kanHeropenen(order) {
  return !!order && !!order.closed_at && order.status === 'delivered' && order.service !== SAMPLE_SERVICE;
}

/** De datum zoals hij op de tijdlijn staat: "11 oktober 2026" / "11 October 2026", Nederlandse tijd. */
export function heropenDatum(moment, lang = 'nl') {
  const s = String(moment || '').trim();
  const ms = Date.parse(/[zZ]|[+-]\d{2}:?\d{2}$/.test(s) ? s.replace(' ', 'T') : `${s.replace(' ', 'T')}Z`);
  const d = Number.isFinite(ms) ? new Date(ms) : new Date();
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'nl-NL',
    { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Amsterdam' }).format(d);
}

/** De regel op de tijdlijn, die de klant ook leest. */
export function heropenNotitie(moment, lang = 'nl') {
  return lang === 'en'
    ? `Reopened by VISUAILS on ${heropenDatum(moment, 'en')}.`
    : `Weer geopend door VISUAILS op ${heropenDatum(moment, 'nl')}.`;
}

/**
 * Open een afgeronde bestelling weer.
 *
 * De UPDATE herhaalt de voorwaarden, zodat een tweede klik (of een tweede
 * tabblad) niets dubbel doet: schrijft hij niets, dan volgt er ook geen regel.
 *
 * @returns {Promise<{ ok: boolean, reden?: string, ref?: string, reopened_at?: string, was_closed_at?: string, lang?: string }>}
 */
export async function heropenBestelling(env, orderId) {
  const o = await env.DB.prepare(
    'SELECT id, ref, status, service, closed_at, lang FROM orders WHERE id = ?1'
  ).bind(orderId).first();
  if (!o) return { ok: false, reden: 'onbekend' };
  if (!kanHeropenen(o)) return { ok: false, reden: o.closed_at ? 'kan-niet' : 'al-open', ref: o.ref };
  const uit = await env.DB.prepare(
    `UPDATE orders SET closed_at = NULL, reopened_at = datetime('now')
      WHERE id = ?1 AND closed_at IS NOT NULL AND status = 'delivered' AND service <> ?2`
  ).bind(orderId, SAMPLE_SERVICE).run();
  if (!(Number(uit?.meta?.changes) > 0)) return { ok: false, reden: 'al-open', ref: o.ref };
  const nu = await env.DB.prepare('SELECT reopened_at FROM orders WHERE id = ?1').bind(orderId).first();
  const lang = o.lang === 'en' ? 'en' : 'nl';
  await env.DB.batch([
    clearUploadRetention(env, orderId),
    env.DB.prepare(
      "INSERT INTO order_events (order_id, status, note, actor) VALUES (?1, 'delivered', ?2, 'admin')"
    ).bind(orderId, heropenNotitie(nu?.reopened_at, lang)),
  ]);
  return { ok: true, ref: o.ref, reopened_at: nu?.reopened_at || null, was_closed_at: o.closed_at, lang };
}
