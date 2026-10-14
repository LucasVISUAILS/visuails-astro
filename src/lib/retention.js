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
 *   · geleverde visuals (kind='delivery') bewaren we DELIVERY_DAYS (90 dagen,
 *     was 12 maanden tot 4 september 2026) na levering.
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
 * "90 dagen na levering", en tussen leveren en afsluiten kan een maand
 * goedkeuringswerk zitten. Het afsluitmoment nemen zou de klant meer geven dan
 * belooft is — dat is geen probleem voor de klant, maar het maakt de tekst onwaar
 * en dan weet niemand meer welke van de twee de regel is.
 *
 * ── EN WAT ER GEBEURT ALS EEN REVISIE DE BESTELLING HEROPENT ───────────────
 *
 * portal.js en account.js zetten `closed_at` terug op NULL wanneer de klant een
 * goedkeuring ONGEDAAN MAAKT ("Ongedaan maken" op een beeld) en de bestelling
 * daardoor weer open gaat. Een revisieverzoek zelf doet dat niet: dat kan alleen
 * zolang de bestelling nog open staat. (Hier stond tot 8 oktober 2026 dat een
 * revisieverzoek `closed_at` wist — punt 9.01, §17.23.) Gaat de bestelling weer
 * open, dan moet de klok van het bronmateriaal ook terug, anders wordt het
 * materiaal verwijderd terwijl wij het nodig hebben voor de revisie die volgt.
 * Zie clearUploadRetention().
 */

/** Bronmateriaal: dagen na het afsluiten van de bestelling. /privacy §6, /terms §7. */
export const UPLOAD_DAYS = 90;

/** Geleverde beelden: dagen na levering. /privacy §6, /terms §7.
 *
 * ── 12 MAANDEN → 90 DAGEN, 4 september 2026 ──────────────────────────────
 * Lucas: *"90 dagen zijn de bestanden downloadbaar in VISUAILS Studio, daarna
 * worden ze daar verwijderd; wij kunnen de resultaten lokaal nog bewaren maar
 * dat is geen garantie — de klant moet er zelf voor zorgen dat hij ze goed
 * lokaal opslaat. Na 90 dagen kan hij contact opnemen, dan kijken wij of ze
 * nog bij ons staan."* Dezelfde termijn als de privélink (PORTAL_TTL_DAYS) en
 * als het bronmateriaal, dus er is nog maar één getal om te onthouden. De
 * naam is mee veranderd (was DELIVERY_MONTHS): een constante die "maanden"
 * heet en dagen bevat, is de fout die je pas in een mail ziet. */
export const DELIVERY_DAYS = 90;

/* ── HET KLANTACCOUNT: JAREN NA DE LAATSTE BESTELLING — 8 oktober 2026 (o11) ──
 *
 * /privacy §6 zei "zolang nodig" en het register "zolang de klantrelatie
 * loopt". De AVG (art. 13 lid 2 sub a) vraagt een termijn of de maatstaf
 * waarmee die wordt bepaald. Lucas koos uit drie: *"a) 2 jaar na de laatste
 * bestelling"*. Heeft iemand nooit besteld, dan telt het aanmaken van het account.
 *
 * UITGEVOERD, NIET ALLEEN BELOOFD — MAAR NIET AUTOMATISCH. Automatisch wissen
 * bestaat bewust niet (overzicht §21: een verwijdering is een handeling met een
 * mens erachter, en daar is de AVG-knop in /admin voor). Wat er wél is: het
 * nachtrapport (cron/index.js, hoogstens één keer per week) en het dashboard
 * tellen de accounts die over de termijn zijn, en /admin/customers?f=bewaartermijn
 * zet ze op een rij met de knop erbij. Zie STALE_ACCOUNTS_SQL hieronder.
 *
 * Facturen vallen hier niet onder: die bewaart de AVG-knop zeven jaar (fiscale
 * bewaarplicht, art. 52 lid 4 AWR), uitgekleed tot wat er op de factuur staat. */
export const ACCOUNT_YEARS = 2;

/* ── DE BACK-UPS — 8 oktober 2026 (o11) ─────────────────────────────────────
 *
 * Het advies was "back-ups hoogstens 30 dagen". Dat klopt niet met wat er
 * draait: scripts/backup-weekly.bat roept elke week `npm run backup -- --keep 8`
 * aan, en die bewaart de acht laatste sets. Een gewiste klant staat dus nog tot
 * ongeveer acht weken in een back-up. Het privacybeleid zegt wat er wél
 * gebeurt; tests/bewaartermijn.test.mjs houdt dit getal gelijk aan het
 * --keep in het .bat-bestand.
 *
 * Lucas koos bij o11 "doen" met het advies: hoogstens 30 dagen. Dus sinds 8
 * oktober --keep 4: vier wekelijkse sets, ±28 dagen. De tekst volgt vanzelf.
 *
 * 12 oktober 2026 (afvinklijst 4, k-back = a): drie kopieën in plaats van vier,
 * zodat de privacyzin "uiterlijk na 8 weken" waar is (3 × 7 + 30 = 51 dagen). */
export const BACKUP_KEEP = 3;
/** Hoe vaak de back-up draait (de Taakplanner-taak uit DEPLOY.md §7): wekelijks. */
export const BACKUP_EVERY_DAYS = 7;
/** Hoe lang een back-up daardoor gewoonlijk blijft bestaan, in weken. */
export const BACKUP_WEKEN = (BACKUP_KEEP * BACKUP_EVERY_DAYS) / 7;

/* ── EN DE PRULLENBAK VAN GOOGLE DRIVE — 11 oktober 2026 (kback = a) ─────────
 *
 * Een opgeruimde kopie gaat in Google Drive eerst naar de prullenbak en is daar
 * na 30 dagen weg (Google's eigen termijn). Een gewist gegeven staat dus
 * hoogstens BACKUP_KEEP weken in de bewaarde kopieën en daarna nog tot 30 dagen
 * in de prullenbak. Lucas koos de zin "uiterlijk na … weken"; het getal komt
 * hieruit, naar boven afgerond, want "uiterlijk" moet waar zijn: met --keep 4 is
 * dat 28 + 30 = 58 dagen = 9 weken; met --keep 3 (sinds 12 oktober, k-back = a)
 * is het 21 + 30 = 51 dagen = 8 weken. */
export const DRIVE_PRULLENBAK_DAGEN = 30;
export const BACKUP_UITERLIJK_WEKEN = Math.ceil((BACKUP_KEEP * BACKUP_EVERY_DAYS + DRIVE_PRULLENBAK_DAGEN) / 7);

/* ── MAIL EN WHATSAPP MET KLANTEN — 11 oktober 2026 (kcorr = a) ──────────────
 * Twee jaar na het laatste contact, zoals het account. Lucas ruimt zijn mailbox
 * en WhatsApp met de hand op; dit is de termijn die het privacybeleid §6 noemt. */
export const CORRESPONDENTIE_JAREN = ACCOUNT_YEARS;

/* ── WAT VISUAILS ZELF BEWAART, NA DE TERMIJN IN STUDIO — 11 oktober 2026 ────
 * (ko06 = a en Lucas' notitie bij kback.) De opslag (R2) ruimt het
 * bronmateriaal op na UPLOAD_DAYS en de beelden na DELIVERY_DAYS; dat blijft.
 * Daarnaast, in het eigen archief van Lucas (werkmachine, mailbox):
 *   · klantfoto's en stijlreferenties: zolang het klantaccount bestaat, dus tot
 *     ACCOUNT_YEARS jaar na de laatste bestelling;
 *   · afgeleverde beelden die VISUAILS maakte: zonder einddatum ("om de style
 *     van de klant te bewaken en te blijven verbeteren");
 *   · beelden met een echt, herkenbaar persoon erop (eigen model van de klant,
 *     draagfoto): de termijn van het account.
 * Alles op verzoek weg, vanaf het accountadres en zonder reden. Geen getal om
 * hier te zetten behalve ACCOUNT_YEARS; de zinnen staan in privacy §6 en in
 * §12 van de verwerkersovereenkomst. */

/**
 * Welke klantaccounts over de termijn zijn: de laatste bestelling (of, zonder
 * bestelling, het aanmaken van het account) is langer dan ACCOUNT_YEARS jaar
 * geleden. Een lopend, gepauzeerd of aangevraagd abonnement telt als lopende
 * klantrelatie en houdt het account dus vast, ook zonder bestelling.
 *
 * `datetime()` om beide kanten, want niet elke kolom is op dezelfde manier
 * geschreven ('2026-10-08 07:00:00' tegen '2026-10-08T07:00:00.000Z'), en een
 * tekstvergelijking tussen die twee vormen klopt niet op dezelfde dag.
 */
export const STALE_ACCOUNTS_WHERE = `
  datetime(COALESCE((SELECT MAX(o.created_at) FROM orders o WHERE o.customer_id = c.id), c.created_at))
    <= datetime('now', '-${ACCOUNT_YEARS} years')
  AND NOT EXISTS (SELECT 1 FROM subscriptions s
                   WHERE s.customer_id = c.id AND s.status IN ('active', 'paused', 'pending'))`;

/** Hoeveel accounts over de termijn zijn — voor het dashboard en het nachtrapport. */
export const STALE_ACCOUNTS_COUNT_SQL = `SELECT COUNT(*) AS n FROM customers c WHERE ${STALE_ACCOUNTS_WHERE}`;

/** Welke — voor /admin/customers?f=bewaartermijn. `?1` is het maximum. */
export const STALE_ACCOUNTS_SQL = `
  SELECT c.id, c.email, c.brand, c.name, c.created_at,
         (SELECT MAX(o.created_at) FROM orders o WHERE o.customer_id = c.id) AS last_order,
         (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id) AS orders
    FROM customers c
   WHERE ${STALE_ACCOUNTS_WHERE}
   ORDER BY COALESCE(last_order, c.created_at), c.id
   LIMIT ?1`;

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
        SET expires_at = datetime(COALESCE(announced_at, created_at), '+${DELIVERY_DAYS} days')
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
 * ── EN EEN GEANNULEERDE BESTELLING — 8 oktober 2026 ─────────────────────────
 * De termijn voor bronmateriaal liep alleen vanaf `closed_at`, en die krijgt een
 * bestelling pas als de klant alles goedkeurt. Een geannuleerde of nooit betaalde
 * (vervallen) bestelling sluit nooit, dus de foto's van de klant, soms met
 * gezichten, bleven voor altijd staan; /privacy belooft "zo kort als nodig". Nu
 * telt voor een geannuleerde bestelling UPLOAD_DAYS (90) dagen vanaf de annulering
 * (of, als die datum ontbreekt, vanaf het plaatsen). Een bestand waar een andere
 * bestelling naar wijst (zelfde r2_key) blijft staan: weggooien zou die andere
 * bestelling zijn bron kosten. Hetzelfde voor foto's die een abonnee nog op
 * zijn lijst heeft: een geannuleerde abonnementsbestelling zet haar items terug
 * op de lijst (queueTerugNaAnnulering), mét dezelfde batch.
 *
 * `o.status` gaat mee omdat de opruimtaak op de tijdlijn van de bestelling schrijft
 * wat hij weghaalde, en een gebeurtenis in dit project de bestaande status
 * herhaalt in plaats van er een te verzinnen. Zonder deze kolom zou de taak de
 * status apart moeten opvragen, per bestelling, midden in een verwijderlus.
 */
export const EXPIRED_FILES_SQL = `
  SELECT f.id, f.r2_key, f.preview_key, f.kind, f.order_id, o.status AS order_status, o.lang AS order_lang
    FROM files f
    JOIN orders o ON o.id = f.order_id
   WHERE (
           (f.expires_at IS NOT NULL AND f.expires_at <= datetime('now'))
        OR (f.kind = 'upload'   AND o.closed_at IS NOT NULL
              AND datetime(o.closed_at, '+${UPLOAD_DAYS} days') <= datetime('now'))
        OR (f.kind = 'delivery' AND f.announced_at IS NOT NULL
              AND datetime(f.announced_at, '+${DELIVERY_DAYS} days') <= datetime('now'))
        OR (f.kind = 'upload' AND o.status = 'cancelled' AND o.closed_at IS NULL
              AND datetime(COALESCE(o.cancelled_at, o.created_at), '+${UPLOAD_DAYS} days') <= datetime('now')
              AND NOT EXISTS (SELECT 1 FROM files g WHERE g.r2_key = f.r2_key AND g.order_id <> f.order_id)
              AND NOT EXISTS (SELECT 1 FROM plan_queue q
                               WHERE COALESCE(q.upload_batch, '') <> ''
                                 AND f.r2_key LIKE 'intake/' || q.upload_batch || '/%'))
         )
   ORDER BY f.id
   LIMIT ?1`;

/**
 * De regel voor Lucas, in /admin en in het nachtrapport: één formulering op twee
 * plekken. Alleen Nederlands — /admin en het nachtrapport zijn voor hem.
 */
export function bewaartermijnRegel(n) {
  const aantal = Number(n) || 0;
  return `${aantal} klantaccount${aantal === 1 ? '' : 's'} langer dan ${ACCOUNT_YEARS} jaar zonder bestelling`;
}
