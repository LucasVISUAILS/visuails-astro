/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE BEWAARTERMIJNEN, OP ÉÉN PLEK
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ── WAAROM DIT BESTAND ER OP 9 AUGUSTUS 2026 KOMT ───────────────────────────
 *
 * /privacy §6 en /terms §7 beloven in twee talen twee dingen:
 *
 *   · bronmateriaal (kind='upload') wordt 90 dagen na het afsluiten van de
 *     bestelling verwijderd;
 *   · geleverde visuals (kind='delivery') bewaren we 12 maanden na levering.
 *
 * `files.expires_at` bestaat sinds migratie 0001 en heeft in schema.sql zelfs de
 * opmerking "closed_at + 90 days, set when the order closes" staan. Die kolom werd
 * door geen enkele INSERT of UPDATE ooit gevuld — nagezocht op elke schrijfplek in
 * src/, functions/ en scripts/. Er was ook geen taak die iets kon opruimen, want er
 * draaide niets periodiek.
 *
 * Netto: alle klantfoto's en alle geleverde beelden stonden voor altijd in R2,
 * terwijl er zwart op wit staat dat ze verdwijnen. Van de vijf beloftes die de code
 * niet nakwam was dit de ernstigste, omdat het een schriftelijke belofte over
 * persoonsgegevens is.
 *
 * ── DE TERMIJNEN STAAN HIER EN NIET IN DRIE BESTANDEN ───────────────────────
 *
 * Drie plekken hebben ze nodig: het afrondpad (src/lib/close.js), het aankondigpad
 * (src/lib/admin.js) en de nachtelijke opruimtaak (cron/index.js). Zouden 90 en 12
 * daar los staan, dan is er een dag waarop de opruimtaak eerder verwijdert dan de
 * site belooft — en dat merkt niemand tot een klant een bestand mist.
 *
 * ── STEMPELEN ÉN AFLEIDEN, ZOALS token.js DAT OOK DOET ─────────────────────
 *
 * `expires_at` wordt gestempeld op het moment dat de klok begint te lopen, want
 * portal.js en account.js lezen die kolom om een bestand te verbergen. Zou het
 * verbergen alleen van de opruimtaak komen, dan is een bestand dat de taak mist
 * langer beschikbaar dan de belofte toestaat.
 *
 * Maar de opruimtaak vertrouwt niet op het stempel alleen: hij verwijdert ook wat
 * volgens de AFGELEIDE regel al weg had moeten zijn. Dat is precies de redenering
 * die token.js:isExpired() al aanhoudt — *"deriving from closed_at as well makes the
 * 90 days a property of the order, not of one code path having worked."* Een rij die
 * om welke reden dan ook geen stempel kreeg, wordt daardoor toch opgeruimd.
 *
 * ── DE TWEE KLOKKEN BEGINNEN OP VERSCHILLENDE MOMENTEN ─────────────────────
 *
 * Bronmateriaal: bij het AFSLUITEN van de bestelling. Zolang een bestelling open
 * staat, is het materiaal in gebruik.
 *
 * Geleverde beelden: bij de LEVERING, niet bij het afsluiten. De belofte zegt
 * "12 maanden na levering", en tussen leveren en afsluiten kan een maand
 * goedkeuringswerk zitten. Het afsluitmoment nemen zou de klant meer geven dan
 * belooft is — dat is geen probleem voor de klant, maar het maakt de tekst onwaar
 * en dan weet niemand meer welke van de twee de regel is.
 *
 * ── EN WAT ER GEBEURT ALS EEN REVISIE DE BESTELLING HEROPENT ───────────────
 *
 * portal.js en account.js zetten `closed_at` terug op NULL bij een revisieverzoek.
 * Dan moet de klok van het bronmateriaal ook terug, anders wordt het materiaal
 * verwijderd terwijl de bestelling weer open is en wij het nodig hebben om de
 * revisie te maken. Zie clearUploadRetention().
 */

/** Bronmateriaal: dagen na het afsluiten van de bestelling. /privacy §6, /terms §7. */
export const UPLOAD_DAYS = 90;

/** Geleverde beelden: maanden na levering. /privacy §6, /terms §7. */
export const DELIVERY_MONTHS = 12;

/**
 * Stempel de bewaartermijn op het bronmateriaal van een afgeronde bestelling.
 *
 * `closed_at` komt uit de rij en niet uit de klok van deze aanroep, zodat een
 * bestelling die twee keer wordt afgerond niet twee verschillende einddatums krijgt.
 * `expires_at IS NULL` staat erbij zodat een tweede aanroep niets verschuift.
 *
 * Faalt dit, dan is dat geen reden om het afronden te laten mislukken — de
 * opruimtaak leidt de termijn ook zelf af. Vandaar dat de aanroeper de uitkomst
 * niet hoeft te controleren.
 */
export function stampUploadRetention(env, orderId) {
  return env.DB.prepare(
    `UPDATE files
        SET expires_at = datetime(
              (SELECT closed_at FROM orders WHERE id = ?1),
              '+${UPLOAD_DAYS} days'
            )
      WHERE order_id = ?1
        AND kind = 'upload'
        AND expires_at IS NULL
        AND (SELECT closed_at FROM orders WHERE id = ?1) IS NOT NULL`
  ).bind(orderId);
}

/**
 * Haal de klok van het bronmateriaal weer weg omdat de bestelling heropend is.
 *
 * Zonder dit verdwijnt het materiaal van een bestelling die door een revisie weer
 * open staat, negentig dagen na de EERSTE afronding — precies het materiaal dat
 * nodig is om die revisie te maken.
 */
export function clearUploadRetention(env, orderId) {
  return env.DB.prepare(
    "UPDATE files SET expires_at = NULL WHERE order_id = ?1 AND kind = 'upload'"
  ).bind(orderId);
}

/**
 * Stempel de bewaartermijn op de beelden die net zijn aangekondigd.
 *
 * Wordt aangeroepen op het aankondigmoment, want dat IS de levering: de klant
 * krijgt op dat moment de mail met de link. `announced_at` komt uit de rij zelf, om
 * dezelfde reden als hierboven.
 *
 * Alleen rijen die niet vervangen zijn. Een vervangen beeld is een oudere versie;
 * die hoort bij de levering waarin hij ooit stond en krijgt geen nieuwe klok.
 */
export function stampDeliveryRetention(env, orderId) {
  return env.DB.prepare(
    `UPDATE files
        SET expires_at = datetime(COALESCE(announced_at, created_at), '+${DELIVERY_MONTHS} months')
      WHERE order_id = ?1
        AND kind = 'delivery'
        AND superseded_at IS NULL
        AND expires_at IS NULL
        AND announced_at IS NOT NULL`
  ).bind(orderId);
}

/**
 * De SQL waarmee de opruimtaak vindt wat weg mag.
 *
 * STAAT HIER EN NIET IN cron/index.js, want dit is dezelfde regel als hierboven en
 * hij moet hetzelfde blijven. De taak verwijdert wat volgens het STEMPEL verlopen is
 * OF wat volgens de AFGELEIDE termijn al weg had moeten zijn — zie de kop over
 * waarom die twee naast elkaar staan.
 *
 * Thumbnails en previews horen bij het beeld waar ze van gemaakt zijn en hebben geen
 * eigen klok; ze verdwijnen met hun bron omdat de query op de kind-waarde van de
 * bron kijkt en de sleutels apart worden opgehaald. Zie de taak zelf.
 *
 * `o.status` gaat mee omdat de opruimtaak op de tijdlijn van de bestelling schrijft
 * wat hij weghaalde, en een gebeurtenis in dit project de bestaande status
 * herhaalt in plaats van er een te verzinnen. Zonder deze kolom zou de taak de
 * status apart moeten opvragen, per bestelling, midden in een verwijderlus.
 */
export const EXPIRED_FILES_SQL = `
  SELECT f.id, f.r2_key, f.preview_key, f.kind, f.order_id, o.status AS order_status
    FROM files f
    JOIN orders o ON o.id = f.order_id
   WHERE (
           (f.expires_at IS NOT NULL AND f.expires_at <= datetime('now'))
        OR (f.kind = 'upload'   AND o.closed_at IS NOT NULL
              AND datetime(o.closed_at, '+${UPLOAD_DAYS} days') <= datetime('now'))
        OR (f.kind = 'delivery' AND f.announced_at IS NOT NULL
              AND datetime(f.announced_at, '+${DELIVERY_MONTHS} months') <= datetime('now'))
         )
   ORDER BY f.id
   LIMIT ?1`;
