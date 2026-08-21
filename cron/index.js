/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE NACHTELIJKE TAKEN
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Waarom dit een losse Worker is en niet een map in functions/: zie de kop van
 * cron/wrangler.toml. Kort: Pages Functions hebben geen `scheduled` handler, een
 * Worker wel, en bindings zijn niet exclusief — deze taak kijkt naar dezelfde D1 en
 * dezelfde R2-bucket als de site.
 *
 * ── DE VOLGORDE IS NIET WILLEKEURIG ─────────────────────────────────────────
 *
 * 1 · VRIJGEVEN vóór opruimen. Een vrijgegeven week is meteen te boeken; dat is het
 *     enige dat een klant vannacht nog kan raken. Als taak 2 om zou vallen, is die
 *     week toch al vrij.
 * 2 · OPRUIMEN daarna. Dit is de zwaarste taak en de enige die iets onherroepelijk
 *     verwijdert, dus staat hij niet vóór iets anders dat nog moet gebeuren.
 * 3 · FACTUREN als laatste van de drie die werk doen. Een klant die betaald heeft en
 *     nog geen factuur heeft, wacht al langer dan één nacht; een uur later is hier
 *     geen verschil.
 * 4 · DE BACK-UPWACHT kijkt alleen. Hij verandert niets en staat daarom achteraan: als
 *     een van de drie hierboven omvalt, is dat het bericht van vannacht, en dan hoort
 *     daar geen tweede mededeling tussendoor.
 *
 * ── ELKE TAAK VALT APART OM ─────────────────────────────────────────────────
 *
 * Geen enkele taak mag een andere meesleuren. Een fout in het opruimen is geen reden
 * om de facturen te laten liggen, en omgekeerd. Vandaar een `try` per taak en een
 * verslag dat per taak zegt wat er gebeurde — inclusief de fout, als die er was.
 *
 * ── HET VERSLAG IS ER VOOR ÉÉN LEZER ────────────────────────────────────────
 *
 * Lucas werkt alleen en niets in dit project vertelt hem 's nachts iets. Het verslag
 * gaat daarom alleen naar hem, en ALLEEN als er iets te melden is: iets is gebeurd,
 * of iets is misgegaan. Een mail die elke ochtend zegt "niets te doen" is een mail
 * die je na een week niet meer leest, en dan mis je de ene nacht dat er wél iets
 * stond.
 *
 * ── WAT DEZE TAAK MET OPZET NIET DOET ───────────────────────────────────────
 *
 * De review-herinnering na vijf tot zeven dagen (WERKLIJST.md:49) hoort hier, en
 * staat er niet in. Niet omdat het niet kan — dit is precies de plek — maar omdat het
 * een mailtekst in twee talen nodig heeft, en die schrijven is een inhoudelijke keuze
 * en geen plumbing. Zodra die tekst er is, is het hier twintig regels.
 *
 * De factuurMAIL opnieuw versturen staat er ook niet in, en dat kan nog niet: er is
 * geen kolom die vastlegt of de mail is verstuurd, dus een herhaling zou blind zijn
 * en kan dus dubbel sturen. Wat hier wél gebeurt is de factuur alsnog UITGEVEN (de
 * pdf maken en wegzetten), want daarvoor is er wel een toestand: status 'pending'.
 */

import { EXPIRED_FILES_SQL, UPLOAD_DAYS, DELIVERY_MONTHS } from '../src/lib/retention.js';

/**
 * Hoeveel bestanden per nacht maximaal.
 *
 * Een limiet en geen "alles", want de eerste nacht dat dit draait, kan er een
 * achterstand van jaren staan. Een Worker heeft een looptijd- en subrequestlimiet, en
 * een taak die halverwege wordt afgekapt heeft R2-objecten verwijderd waarvan de rij
 * nog bestaat. Met een plafond is elke nacht een afgeronde hap en is de achterstand
 * na een paar nachten weg.
 */
const PURGE_LIMIT = 400;

/** Zo lang mag een factuur 'pending' staan voordat we hem als vastgelopen zien. */
const INVOICE_STUCK_MINUTES = 15;

/**
 * Zo oud mag de laatste back-up worden voordat deze taak erover mailt.
 *
 * Tien dagen en niet zeven, terwijl de taak in de Taakplanner wekelijks draait: één
 * gemiste zondag is een uitgezette laptop of een vakantie, en dat is geen alarm. Twee
 * gemiste zondagen is een taak die niet meer loopt, en dat is het wel.
 */
const BACKUP_STALE_DAYS = 10;

/**
 * En zo vaak mag hij erover mailen: één keer per week.
 *
 * Zonder deze rem gaat er, vanaf de dag dat de back-up verlopen is, ELKE nacht
 * dezelfde mail uit. Dat is de snelste manier om de enige mail die dit project
 * verstuurt in een filter te laten verdwijnen — en dan is de bewaking erger dan
 * geen bewaking, want je denkt dat je hem hebt.
 */
const BACKUP_WARN_EVERY_DAYS = 7;

export default {
  async scheduled(event, env, ctx) {
    const report = [];
    const problems = [];

    for (const task of [releaseExpiredWindows, cancelStaleApprovals, purgeExpiredFiles, issuePendingInvoices, checkPlanQueues, checkBackupAge]) {
      try {
        const line = await task(env);
        if (line) report.push(line);
      } catch (err) {
        const message = `${task.name}: ${err?.message || err}`;
        console.error('[cron]', message);
        problems.push(message);
      }
    }

    /*
     * ── DE HARTSLAG — 10 augustus 2026 ────────────────────────────────────────
     *
     * Bovenaan dit bestand staat: "Geen mail betekent: er was niets te doen en er ging
     * niets mis." Dat is precies óók wat je krijgt als deze Worker nooit gedeployd is, als
     * de trigger uitstaat, of als RESEND_API_KEY niet op dít tweede project staat — waar
     * cron/wrangler.toml zelf voor waarschuwt. Stilte betekende dus twee tegengestelde
     * dingen, en de gevaarlijkste van de twee is de stille.
     *
     * Vandaar één rij in app_settings die elke nacht wordt bijgewerkt, met de uitkomst
     * erin. /admin leest hem bovenaan: staat er een datum van vannacht, dan draait hij.
     * Staat er niets of iets van vier dagen oud, dan is dat zichtbaar in plaats van
     * afgeleid uit het ontbreken van een mail.
     *
     * Dit gebeurt NA de taken en niet ervoor, want de vraag die je wil beantwoorden is
     * "heeft hij zijn werk afgemaakt" en niet "is hij begonnen". En het staat buiten de
     * per-taak try's: dit is geen taak maar het bewijs dat de taken gelopen hebben.
     */
    await heartbeat(env, report.length, problems.length);

    if (report.length || problems.length) {
      ctx.waitUntil(sendReport(env, report, problems));
    }
    console.log('[cron] klaar —', report.length, 'meldingen,', problems.length, 'problemen');
  },
};

/* ══ 1 · VERVALLEN RESERVERINGEN VRIJGEVEN ══════════════════════════════════
 *
 * functions/api/order.js:761 zet bij een gereserveerde bestelling een
 * `window_expires_at` op zeven dagen: de tijd die de klant heeft om te betalen. Er
 * was niets dat die datum ooit las. Wie een week reserveerde en nooit betaalde,
 * blokkeerde die week voor altijd — de capaciteitsquery telde hem mee, en in het
 * adminportaal stond alleen een onbetaalde bestelling.
 *
 * functions/api/capacity.js negeert zo'n reservering sinds vandaag al bij het lezen,
 * dus de week is meteen open. Deze taak maakt het definitief: de kolommen leeg, en
 * een regel op de tijdlijn zodat er navraagbaar staat waarom.
 *
 * DE BESTELLING BLIJFT BESTAAN. Alleen de reservering gaat eraf. Een bestelling
 * weggooien omdat er niet binnen zeven dagen betaald is, zou de klant zijn briefing
 * en zijn uploads kosten — en dat is precies het gesprek dat je nog wil kunnen
 * hebben. Hij verliest zijn plek in de agenda, niet zijn bestelling.
 */
async function releaseExpiredWindows(env) {
  /*
   * ── DEZELFDE SOORT MELDING ALS DE ANDERE TWEE TAKEN, 10 AUGUSTUS 2026 ───────
   *
   * Bij de eerste testrun stond er in het verslag drie keer een fout, maar in drie
   * verschillende talen:
   *
   *   · releaseExpiredWindows: D1_ERROR: no such table: orders: SQLITE_ERROR
   *   · purgeExpiredFiles: opruimen kan niet: (…) — is migratie 0022 gedraaid?
   *   · issuePendingInvoices: (…) geen invoices-tabel — is migratie 0021 gedraaid?
   *
   * De onderste twee vertellen je wat je moet doen, de bovenste geeft je de ruwe
   * foutmelding van de database. Dat verschil was geen keuze maar een omissie, en het
   * is precies het bericht dat je om vier uur 's nachts op je telefoon leest.
   *
   * De formulering is wél anders dan die van de andere twee, en met opzet: `orders`
   * komt uit schema.sql en niet uit een migratie. "Is migratie X gedraaid?" zou hier
   * naar een nummer verwijzen dat niet bestaat, en een behulpzaam bericht dat naar het
   * verkeerde bestand wijst kost meer tijd dan een ruwe foutmelding.
   */
  let results;
  try {
    ({ results } = await env.DB.prepare(FIND_EXPIRED_WINDOWS).all());
  } catch (err) {
    if (/no such table/i.test(String(err?.message || ''))) {
      throw new Error(`${err.message} — de database lijkt niet opgezet; is schema.sql gedraaid?`);
    }
    throw err;
  }

  const rows = results || [];
  if (!rows.length) return null;
  return releaseAll(env, rows);
}

/* De query apart, zodat de foutafhandeling hierboven leesbaar blijft. */
const FIND_EXPIRED_WINDOWS = (
    `SELECT id, ref, window_start, window_end
       FROM orders
      WHERE tier = 'attended'
        AND window_start IS NOT NULL
        AND COALESCE(payment_status, 'unpaid') = 'unpaid'
        AND window_expires_at IS NOT NULL
        AND window_expires_at <= datetime('now')
        AND status NOT IN ('cancelled', 'delivered')
      ORDER BY id
      LIMIT 100`);

async function releaseAll(env, rows) {
  for (const o of rows) {
    await env.DB.batch([
      env.DB.prepare(
        `UPDATE orders
            SET window_start = NULL, window_end = NULL, window_expires_at = NULL
          WHERE id = ?1`
      ).bind(o.id),
      env.DB.prepare(
        `INSERT INTO order_events (order_id, status, note, actor)
         VALUES (?1, ?2, ?3, 'system')`
      ).bind(
        o.id,
        'pending',
        `Reservering ${o.window_start}${o.window_end ? ` – ${o.window_end}` : ''} vrijgegeven: de betaaltermijn is verstreken. De bestelling blijft staan; een nieuwe datum kan opnieuw worden gekozen.`
      ),
    ]);
  }

  return `${rows.length} vervallen reservering${rows.length === 1 ? '' : 'en'} vrijgegeven: ${rows.map((o) => o.ref).join(', ')}.`;
}

/* ══ 1b · GOEDGEKEURD, NOOIT BETAALD ════════════════════════════════════════
 *
 * De btw-poort in functions/api/order.js houdt een bestelling met een twijfelachtige
 * opgave of van buiten de EU tegen: geen betaallink, wél een rij. Keurt Lucas hem in
 * het adminscherm goed, dan gaat er sinds 20 augustus 2026 automatisch een betaallink
 * uit (zie stuurBetaallink in src/lib/admin.js).
 *
 * En dan? Dan kan er niets meer gebeuren. Zonder deze taak blijft zo'n bestelling
 * eeuwig op 'received' staan met een betaallink die niemand gebruikt heeft — in de
 * lijst, in de tellingen, en in de capaciteitsagenda als er een venster aan hangt.
 *
 * ZEVEN DAGEN, en dat getal komt uit wat de bevestigingsmail zelf belooft. Het is
 * dezelfde termijn als `window_expires_at` bij een gereserveerde leverdatum, en dat
 * is geen toeval: het is dezelfde vraag — hoe lang houden we iets vast voor iemand
 * die niet betaalt.
 *
 * ── WAT ER NIET GEBEURT ────────────────────────────────────────────────────
 *
 * Het e-mailadres van de klant wordt NIET verwijderd, hoewel de oorspronkelijke
 * schets dat wel zei. Een adres wissen op een timer is onomkeerbaar en het zou de
 * enige manier weghalen om iemand te bereiken die zich morgen meldt met "ik wilde
 * net betalen". Een verwijderverzoek is een handeling met een mens erachter, en
 * daar bestaat een knop voor in het adminportaal (/admin/customers/:id/wipe).
 *
 * De bestelling zelf blijft ook staan. `status = 'cancelled'` is een toestand en
 * geen verwijdering: de rij, de tijdlijn en de reden blijven leesbaar, want de
 * vraag "wat is er met VIS-XXXX gebeurd" moet over een half jaar nog een antwoord
 * hebben.
 */
async function cancelStaleApprovals(env) {
  let results;
  try {
    ({ results } = await env.DB.prepare(
      /* ── EN ALLEEN EEN BESTELLING DIE ECHT TE BETALEN VIEL ─────────────
         `COALESCE(total_cents, 0) > 0` is geen extra voorzichtigheid maar de
         kern van de regel. Een aanvraag voor een merkmodel, een video, een
         look op maat of een abonnement gaat via hetzelfde formulier de
         orders-tabel in, en die diensten hebben geen prijs per product:
         quoteOrder() geeft null terug voor alles buiten catalog/lifestyle/
         complete, dus `total_cents` blijft NULL. Zo'n aanvraag gaat WEL door de
         btw-beoordeling — er is geen zakelijke verklaring in dat formulier — en
         staat dus na goedkeuring op `review_state = 'approved'` met
         `payment_status = 'unpaid'`, precies de twee voorwaarden hieronder.

         Zeven dagen later kreeg de aanvrager dan een mail dat zijn bestelling
         was vervallen omdat hij niet betaald had. Er was nooit iets te betalen:
         stuurBetaallink() stopt zelf al bij een brutobedrag van nul, dus er is
         ook nooit een link verstuurd. Een lead van € 1.250 die te horen krijgt
         dat hij een rekening heeft laten verlopen die niet bestond. */
      `SELECT id, ref, email, lang, reviewed_at
         FROM orders
        WHERE review_state = 'approved'
          AND COALESCE(payment_status, 'unpaid') = 'unpaid'
          AND COALESCE(total_cents, 0) > 0
          AND reviewed_at IS NOT NULL
          AND reviewed_at <= datetime('now', '-7 days')
          AND status NOT IN ('cancelled', 'delivered')
        ORDER BY id
        LIMIT 50`
    ).all());
  } catch (err) {
    if (/no such column/i.test(String(err?.message || ''))) {
      /* `review_state` komt uit migratie 0018. Zelfde afspraak als de andere taken:
         een ontbrekende migratie is een mededeling en geen ruwe databasefout. */
      throw new Error(`${err.message} — is migratie 0018 (btw-beoordeling) gedraaid?`);
    }
    throw err;
  }

  const rows = results || [];
  if (!rows.length) return null;

  /* ── EERST DE UPDATE, EN PAS DAARNA DE TIJDLIJN EN DE MAIL ────────────────
     De UPDATE controleert nog één keer of er echt niet betaald is, want tussen
     de SELECT hierboven en dit moment kan de betaling binnen zijn gekomen. Die
     hercontrole deed haar werk, maar de twee dingen die eráchter hoorden te
     hangen deden hem niet mee: de tijdlijnregel zat in dezelfde batch en de
     mail stond erachter, allebei onvoorwaardelijk. Wie op precies dat moment
     betaalde, hield terecht zijn bestelling — en kreeg er een tijdlijnregel
     "vervallen wegens niet betalen" en een mail overheen.

     `meta.changes` van de UPDATE zegt of de rij echt geraakt is. Nul betekent
     dat de hercontrole hem heeft tegengehouden, en dan gebeurt er verder niets. */
  const vervallen = [];
  for (const o of rows) {
    const [uit] = await env.DB.batch([
      env.DB.prepare(
        `UPDATE orders
            SET status = 'cancelled', cancel_reason = ?2, window_start = NULL, window_end = NULL,
                window_expires_at = NULL
          WHERE id = ?1 AND COALESCE(payment_status, 'unpaid') = 'unpaid'`
      ).bind(o.id, 'niet betaald binnen zeven dagen na goedkeuring'),
    ]);
    if (!(Number(uit?.meta?.changes) > 0)) {
      console.log('[cron] bestelling', o.ref, 'is inmiddels betaald — niet vervallen');
      continue;
    }
    vervallen.push(o);

    await env.DB.prepare(
      `INSERT INTO order_events (order_id, status, note, actor)
       VALUES (?1, 'cancelled', ?2, 'system')`
    ).bind(o.id, 'Vervallen: zeven dagen na de goedkeuring was er niet betaald. De bestelling blijft leesbaar; opnieuw bestellen kan altijd.').run();

    /* De mail is een mededeling en geen aansporing. Wie na zeven dagen niet betaald
       heeft, heeft meestal iets anders besloten; het enige wat hier hoort is dat hij
       weet dat de reservering weg is en dat opnieuw bestellen gewoon kan. */
    if (o.email) {
      const nl = o.lang !== 'en';
      await mailVervallen(env, o, nl);
    }
  }

  if (!vervallen.length) return null;
  return `${vervallen.length} goedgekeurde bestelling${vervallen.length === 1 ? '' : 'en'} vervallen wegens niet betalen: ${vervallen.map((o) => o.ref).join(', ')}.`;
}

/* Zonder RESEND_API_KEY gaat de mail niet en gaat de taak wél door — dezelfde
   afspraak als bij de wachtrijmail hieronder. Het vervallen is het werk; de
   mededeling is een gunst, en een gunst mag geen taak laten omvallen. */
async function mailVervallen(env, o, nl) {
  if (!env.RESEND_API_KEY || !o.email) return false;
  const text = nl
    ? [
        `Je bestelling ${o.ref} is vervallen omdat er binnen zeven dagen na de goedkeuring niet betaald is.`,
        '',
        'Er is niets in rekening gebracht. Wil je het alsnog, dan kun je gewoon opnieuw bestellen op',
        'https://visuails.com/start — je gegevens staan er nog.',
        '',
        'VISUAILS',
      ].join('\n')
    : [
        `Your order ${o.ref} has expired because it was not paid within seven days of being cleared.`,
        '',
        'Nothing has been charged. If you still want it, you can simply order again at',
        'https://visuails.com/start — your details are still there.',
        '',
        'VISUAILS',
      ].join('\n');
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.FROM_EMAIL,
        to: [o.email],
        subject: nl ? `Bestelling ${o.ref} is vervallen` : `Order ${o.ref} has expired`,
        text,
      }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}`);
    return true;
  } catch (err) {
    console.error('[cron] vervalbericht voor', o.ref, 'niet verstuurd —', err?.message || err);
    return false;
  }
}

/* ══ 2 · DE BEWAARTERMIJN UITVOEREN ═════════════════════════════════════════
 *
 * /privacy §6 en /terms §7 beloven in twee talen: bronmateriaal 90 dagen na het
 * afsluiten van de bestelling, geleverde visuals 12 maanden na levering. Tot vandaag
 * werd `files.expires_at` door geen enkele query gevuld en was er niets dat kon
 * opruimen. Alles stond dus voor altijd in R2, terwijl het tegendeel op de site
 * staat.
 *
 * De regel zelf staat in src/lib/retention.js, want het afrondpad en het
 * aankondigpad stempelen met dezelfde getallen. Deze taak verwijdert wat volgens het
 * stempel verlopen is OF wat volgens de afgeleide termijn al weg had moeten zijn —
 * zie de kop daar voor waarom die twee naast elkaar staan.
 *
 * ── DE VOLGORDE BINNEN ÉÉN BESTAND IS DE HELE ZORGVULDIGHEID ───────────────
 *
 * Eerst R2, dan de rij. Andersom is een rij die weg is met bytes die blijven staan:
 * dan is er geen enkele administratie meer die weet dat dat object bestaat, en dan
 * staat het er over tien jaar nog. Deze kant om is het ergste geval een object dat
 * weg is met een rij die er nog staat — zichtbaar, en morgen opnieuw op te ruimen.
 *
 * ── DE VARIANTEN UIT MIGRATIE 0022 GAAN MEE ────────────────────────────────
 *
 * Sinds 0022 heeft één beeld meerdere objecten in R2: de png, de jpg en de webp
 * staan als rijen in `file_assets`. Die rijen verdwijnen met de file via ON DELETE
 * CASCADE — maar de OBJECTEN in R2 niet, want een database weet niets van een
 * bucket. Ze worden daarom eerst opgehaald en meeverwijderd. Zonder dit stuk zou de
 * opruiming er netjes uitzien en drie kwart van de bytes laten staan.
 */
async function purgeExpiredFiles(env) {
  let rows;
  try {
    const res = await env.DB.prepare(EXPIRED_FILES_SQL).bind(PURGE_LIMIT).all();
    rows = res.results || [];
  } catch (err) {
    /*
     * `preview_key` bestaat sinds migratie 0001 en `file_assets` sinds 0022. Draait
     * 0022 nog niet, dan valt de query hieronder om op een tabel die niet bestaat —
     * en dan hoort de opruiming niet stil te blijven, maar te zeggen wat eraan
     * scheelt. Zelfde terugval als elders in dit project bij een niet-gedraaide
     * migratie.
     */
    if (/no such (table|column)/i.test(String(err?.message || ''))) {
      throw new Error(`opruimen kan niet: ${err.message} — is migratie 0022 gedraaid?`);
    }
    throw err;
  }

  if (!rows.length) return null;

  /*
   * ═══════════════════════════════════════════════════════════════════════════
   * DE REM: PURGE_ENABLED MOET EXPLICIET AAN — 10 augustus 2026
   * ═══════════════════════════════════════════════════════════════════════════
   *
   * Deze taak is de enige in dit project die iets ONHERROEPELIJK doet. R2 heeft geen
   * versiebeheer, `npm run backup` pakt de bestanden alleen mee met --files (uren werk,
   * dus in de praktijk nooit), en PURGE_LIMIT = 400 begrenst de SNELHEID en niet de
   * JUISTHEID. Eén fout in de vervaldatumlogica verwijdert 400 klantbestanden per nacht,
   * permanent.
   *
   * En deze code heeft nog nooit tegen echte data gedraaid. Dat is geen reden om hem niet
   * te vertrouwen, maar het is wel een reden om hem eerst te laten vertéllen wat hij zou
   * doen. Vandaar: zonder `PURGE_ENABLED = "true"` op de Worker rapporteert hij en
   * verwijdert hij niets.
   *
   * DE STANDAARD IS UIT, en dat is een keuze tegen mijn eigen gemak. Een vlag die
   * standaard aan staat en die je uit moet zetten, beschermt niets — je zet hem uit nadat
   * het is misgegaan. Zo staat hij aan op het moment dat jij hebt gekeken wat hij van plan
   * was, en niet eerder.
   *
   * DE MELDING IS EXPLICIET. "0 bestanden verwijderd" naast "er stonden 12 klaar" zou
   * gelezen worden als een geslaagde nacht; de regel hieronder zegt met zoveel woorden dat
   * de rem erop staat, met het aantal en het commando om hem los te zetten.
   */
  if (String(env.PURGE_ENABLED || '') !== 'true') {
    const perKind = rows.reduce((m, f) => ({ ...m, [f.kind]: (m[f.kind] || 0) + 1 }), {});
    const spec = Object.entries(perKind).map(([k, n]) => `${n}× ${k}`).join(', ');
    console.log('[cron] purge staat UIT —', rows.length, 'bestanden zouden weg gaan:', spec);
    return `VERSLAGMODUS: ${rows.length} bestand${rows.length === 1 ? '' : 'en'} zou${rows.length === 1 ? '' : 'den'} nu verwijderd worden (${spec}). Er is NIETS weggegooid.`
      + ' Zet de rem los met `npx wrangler secret put PURGE_ENABLED --config cron/wrangler.toml` en de waarde `true`,'
      + ' maar maak eerst één keer `npm run backup -- --files` — R2 heeft geen versiebeheer.';
  }

  const ids = rows.map((f) => f.id);
  const assets = await variantKeys(env, ids);

  let objects = 0;
  let removed = 0;
  const cleared = [];
  for (const f of rows) {
    const keys = [f.r2_key, f.preview_key, ...(assets.get(f.id) || [])].filter(Boolean);
    try {
      for (const key of keys) {
        await env.UPLOADS.delete(key);
        objects++;
      }
      await env.DB.prepare('DELETE FROM files WHERE id = ?1').bind(f.id).run();
      removed++;
      cleared.push(f);
    } catch (err) {
      // Eén bestand dat niet lukt, is geen reden om de andere 399 te laten staan.
      console.error('[cron] bestand', f.id, 'niet opgeruimd —', err?.message || err);
    }
  }

  const trail = await noteOnTimeline(env, cleared);

  const more = rows.length === PURGE_LIMIT ? ' Er stond meer klaar dan het plafond van vannacht; morgen gaat de rest.' : '';
  return `${removed} verlopen bestand${removed === 1 ? '' : 'en'} verwijderd (${objects} object${objects === 1 ? '' : 'en'} uit R2).${more}${trail}`;
}

/**
 * De R2-sleutels van de formaatvarianten, per file-id.
 *
 * Apart en niet in de hoofdquery, want een LEFT JOIN op file_assets zou één bestand
 * met drie varianten drie keer opleveren en dan wordt het plafond hierboven een
 * plafond op varianten in plaats van op bestanden.
 */
/**
 * Schrijf op de tijdlijn van elke bestelling wat er vannacht van weggehaald is.
 *
 * ── WAAROM DIT ER IS ────────────────────────────────────────────────────────
 *
 * De opruimtaak doet `DELETE FROM files`. Daarmee verdwijnt niet alleen het bestand
 * maar ook élk spoor dat het ooit bestond: de rij is weg, R2 is leeg, en het enige
 * wat er nog over is, is één regel in een mail van vannacht die over een maand
 * niemand meer terugvindt. Kijk je dan in het adminportaal naar de bestelling van
 * een klant die vraagt waar zijn materiaal is, dan staat daar niets. Geen fout, geen
 * levering, geen opruiming — een gat.
 *
 * Dit is bovendien de enige taak van de drie die iets onomkeerbaars doet. Als mijn
 * termijnquery ooit een dag te vroeg telt, is de tijdlijn het enige waaruit je
 * achteraf kunt vaststellen wat er weg is en wanneer. `order_events` staat in D1 en
 * gaat dus mee in `npm run backup`; de bucket zelf niet.
 *
 * ── ÉÉN GEBEURTENIS PER BESTELLING, NIET PER BESTAND ───────────────────────
 *
 * Dertig foto's van één bestelling zijn één opruiming, geen dertig. De aantallen
 * staan in de tekst, gescheiden per soort, omdat de twee soorten twee verschillende
 * beloftes hebben (bronmateriaal 90 dagen na afsluiten, geleverd werk 12 maanden na
 * levering) en een klant die het leest wil weten welke van de twee hier gold.
 *
 * De termijnen komen uit retention.js en staan hier niet als getal, anders vertelt de
 * tijdlijn over een jaar iets anders dan /privacy §6.
 *
 * ── EN WAAROM DIT NOOIT DE TAAK MAG LATEN OMVALLEN ─────────────────────────
 *
 * Op het moment dat dit draait, zijn de bestanden al weg. Een fout hier terugkaatsen
 * naar de aanroeper zou de hele taak als "probleem" laten rapporteren en de regel
 * "12 bestanden verwijderd" uit de mail halen — precies de informatie die dan het
 * hardst nodig is. Vandaar dat dit zijn eigen fout opvangt en er een zin over
 * teruggeeft, zodat het verslag het wél vermeldt.
 */
async function noteOnTimeline(env, cleared) {
  if (!cleared.length) return '';

  /* Per bestelling tellen, per soort. Map houdt de volgorde van invoegen aan, dus de
   * gebeurtenissen komen in dezelfde volgorde als de bestanden uit de query. */
  const perOrder = new Map();
  for (const f of cleared) {
    if (!f.order_id) continue;
    if (!perOrder.has(f.order_id)) perOrder.set(f.order_id, { status: f.order_status, kinds: new Map() });
    const entry = perOrder.get(f.order_id);
    entry.kinds.set(f.kind, (entry.kinds.get(f.kind) || 0) + 1);
  }

  const statements = [];
  for (const [orderId, { status, kinds }] of perOrder) {
    /* `orders.status` is NOT NULL, dus dit hoort niet te kunnen. Zou het toch leeg
     * zijn, dan is een ontbrekende regel beter dan een verzonnen status die in het
     * klantportaal opduikt — en de log vertelt bij welke bestelling het misging. */
    if (!status) {
      console.error('[cron] geen status voor bestelling', orderId, '— geen tijdlijnregel geschreven');
      continue;
    }
    statements.push(
      env.DB.prepare(
        `INSERT INTO order_events (order_id, status, note, actor)
         VALUES (?1, ?2, ?3, 'system')`
      ).bind(orderId, status, describe(kinds))
    );
  }

  if (!statements.length) return '';
  try {
    await env.DB.batch(statements);
    return '';
  } catch (err) {
    console.error('[cron] tijdlijn niet bijgewerkt na het opruimen —', err?.message || err);
    return ' De bestanden zijn weg, maar de tijdlijn van de bestelling(en) kon niet bijgewerkt worden — zie de log.';
  }
}

/** De tekst die de klant en jij op de tijdlijn lezen. Zie de kop hierboven. */
function describe(kinds) {
  const parts = [];
  for (const [kind, n] of kinds) {
    const stuks = `${n} bestand${n === 1 ? '' : 'en'}`;
    if (kind === 'upload') {
      parts.push(`Bronmateriaal verwijderd volgens de bewaartermijn van ${UPLOAD_DAYS} dagen na het afsluiten van de bestelling (${stuks}).`);
    } else if (kind === 'delivery') {
      parts.push(`Geleverde beelden verwijderd volgens de bewaartermijn van ${DELIVERY_MONTHS} maanden na levering (${stuks}).`);
    } else {
      parts.push(`${stuks} verwijderd volgens de bewaartermijn.`);
    }
  }
  return parts.join(' ');
}

/* ══ 4 · DRAAIT DE BACK-UP NOG? ══════════════════════════════════════════════
 *
 * `npm run backup` is een handmatig script op Lucas' Windows-machine. Het herstelpunt
 * was daarmee "de laatste keer dat ik eraan dacht", en de manier waarop je merkt dat je
 * er niet meer aan dacht, is de dag dat je de back-up nodig hebt.
 *
 * De taak in de Taakplanner (scripts/backup-weekly.cmd) lost het draaien op. Wat hij
 * NIET kan oplossen is het merken: als die taak stilvalt — laptop uit, wachtwoord
 * verlopen, `wrangler`-login weg, schijf vol — gebeurt er precies niets, en niets is
 * onzichtbaar. Vandaar dat de back-up bij elke geslaagde ronde een datum in
 * `app_settings` schrijft (zie het einde van scripts/backup.mjs), en dat deze Worker
 * die datum leest.
 *
 * WAAROM DE ALARMBEL IN DE CLOUD HANGT EN DE BACK-UP OP ZIJN SCHIJF. Als de PC het
 * probleem is, kan de PC het probleem niet melden. Deze Worker draait ergens anders en
 * heeft Resend, dus hij is de enige plek waar "de back-up is gestopt" nog uit kan komen.
 * Dezelfde reden als bij de hartslag hieronder, één laag hoger.
 *
 * DEZE TAAK VERANDERT NIETS BEHALVE ZIJN EIGEN WAARSCHUWINGSDATUM. Hij verwijdert niet,
 * factureert niet en geeft niets vrij; hij leest één rij en schrijft er hoogstens één.
 * Daarom mag hij ook in de gewone takenlus staan zonder de andere drie te kunnen raken.
 */
async function checkBackupAge(env) {
  if (!env.DB) return null;

  let last;
  let warned;
  try {
    const rows = await env.DB.prepare(
      "SELECT key, value FROM app_settings WHERE key IN ('backup_last_run', 'backup_warned_at')"
    ).all();
    const map = new Map((rows.results || []).map((r) => [r.key, r.value]));
    last = map.get('backup_last_run') || null;
    warned = map.get('backup_warned_at') || null;
  } catch (err) {
    /* Geen app_settings betekent een database die niet is opgezet. Dat is elders al
       zichtbaar (de hartslag schrijft in dezelfde tabel en klaagt daar) en hier geen
       reden om de nacht als mislukt te melden. */
    if (/no such table/i.test(String(err?.message || ''))) return null;
    throw err;
  }

  /*
   * DE VORM EERST CONTROLEREN, EN DAN PAS PARSEN — en dat is geen netheid.
   *
   * Dit stond hier als `Date.parse(waarde.slice(0,16).replace(' ','T') + ':00Z')`, en
   * de test met 'gisteren ergens' in de kolom kwam terug met "de laatste back-up is
   * 9720 dagen oud". Date.parse valt bij onbekende tekst terug op een eigen,
   * niet-gespecificeerde lezing en gaf een datum in 1999 in plaats van NaN. Gevolg: een
   * onleesbare waarde werd een geloofwaardig getal in een mail aan Lucas.
   *
   * Dus: alleen precies de vorm die scripts/backup.mjs schrijft telt als datum. Al het
   * andere is "ik weet het niet", en dat valt hieronder samen met "er is er nooit een
   * geweest" — want als het schrijven van de datum stuk is, is dat even dringend als
   * een back-up die niet loopt.
   *
   * De datum is lokale tijd van de machine die hem schreef en wordt hier als UTC
   * gelezen. Dat is goed genoeg: de vraag is niet hoe oud in uren maar of het tien
   * dagen geleden is, en dan is twee uur verschil ruis.
   */
  const STAMP_SHAPE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
  const days = (stamp) => {
    const text = String(stamp || '').slice(0, 16);
    if (!STAMP_SHAPE.test(text)) return null;
    const t = Date.parse(text.replace(' ', 'T') + ':00Z');
    return Number.isFinite(t) ? (Date.now() - t) / 864e5 : null;
  };

  const age = days(last);
  /* GEEN RIJ IS NIET HETZELFDE ALS EEN OUDE RIJ, en het verschil bepaalt waar je gaat
     kijken: "nog nooit" wijst naar de Taakplanner, "18 dagen" wijst naar de laatste
     keer dat hij wél liep. Een onleesbare datum valt hier bij "nog nooit" — dan is er
     iets met het schrijven, en dat is even dringend. */
  const stale = age === null || age > BACKUP_STALE_DAYS;
  if (!stale) return null;

  const sinceWarn = days(warned);
  if (sinceWarn !== null && sinceWarn < BACKUP_WARN_EVERY_DAYS) return null;

  const stampNow = new Date().toISOString().slice(0, 16).replace('T', ' ');
  try {
    await env.DB.prepare(
      `INSERT INTO app_settings (key, value) VALUES ('backup_warned_at', ?1)
       ON CONFLICT(key) DO UPDATE SET value = ?1`
    ).bind(stampNow).run();
  } catch (err) {
    /* Lukt dit niet, dan gaat de waarschuwing alsnog uit — liever de mail van morgen er
       ook bij dan hem vandaag inslikken omdat de rem niet weggeschreven kon worden. */
    console.error('[cron] waarschuwingsdatum back-up niet weggeschreven —', err?.message || err);
  }

  return age === null
    ? 'BACK-UP: er staat geen enkele geslaagde back-up in de database.'
      + ' Draai `npm run backup` en controleer of de taak in de Taakplanner bestaat'
      + ' (zie DEPLOY.md). Dit bericht komt hoogstens een keer per week terug.'
    : `BACK-UP: de laatste is ${Math.floor(age)} dagen oud (${last}),`
      + ` en ${BACKUP_STALE_DAYS} dagen is de grens. De wekelijkse taak in de Taakplanner`
      + ' loopt waarschijnlijk niet meer — zie DEPLOY.md. Hoogstens een keer per week.';
}

/**
 * Schrijf op dat deze nacht gelopen heeft, en met welke uitkomst.
 *
 * `app_settings` bestaat al (schema.sql) en is precies hiervoor bedoeld: één sleutel, één
 * waarde. De waarde is leesbare tekst en geen JSON, want het enige dat ermee gebeurt is dat
 * een mens hem bovenaan /admin leest.
 *
 * Faalt dit, dan is dat geen reden om de nacht als mislukt te melden — het is een notitie
 * over werk dat al gedaan is. Wel de log in, want een hartslag die stil wegvalt is precies
 * het probleem dat hij moet oplossen.
 */
async function heartbeat(env, meldingen, problemen) {
  if (!env.DB) return;
  const value = `${new Date().toISOString().slice(0, 16).replace('T', ' ')} · ${meldingen} meldingen · ${problemen} problemen`;
  try {
    await env.DB.prepare(
      `INSERT INTO app_settings (key, value) VALUES ('cron_last_run', ?1)
       ON CONFLICT(key) DO UPDATE SET value = ?1`
    ).bind(value).run();
  } catch (err) {
    console.error('[cron] hartslag niet weggeschreven —', err?.message || err);
  }
}

async function variantKeys(env, ids) {
  const map = new Map();
  if (!ids.length) return map;
  try {
    const marks = ids.map((_, i) => `?${i + 1}`).join(',');
    const { results } = await env.DB.prepare(
      `SELECT file_id, r2_key FROM file_assets WHERE file_id IN (${marks})`
    ).bind(...ids).all();
    for (const a of results || []) {
      if (!map.has(a.file_id)) map.set(a.file_id, []);
      map.get(a.file_id).push(a.r2_key);
    }
  } catch (err) {
    // Zie de noot hierboven: zonder 0022 bestaat deze tabel niet. Dan zijn er ook
    // geen varianten, en is een leeg antwoord het juiste antwoord.
    if (!/no such table/i.test(String(err?.message || ''))) throw err;
  }
  return map;
}

/* ══ 3 · VASTGELOPEN FACTUREN ALSNOG UITGEVEN ═══════════════════════════════
 *
 * `issueInvoice()` in src/lib/invoice.js doet drie dingen op een rij: een nummer
 * toekennen en de rij schrijven, de pdf maken, en de rij op 'issued' zetten met de
 * R2-sleutel erin. Valt het middelste weg — een render die omvalt, een Worker die
 * afgekapt wordt — dan blijft de factuur op 'pending' staan. De klant heeft dan
 * betaald en heeft geen factuur, en niets probeert het opnieuw.
 *
 * ── DIT IS NUMMERVEILIG, EN DAT IS DE HELE REDEN DAT HET ZO WERKT ──────────
 *
 * Deze taak roept `issueInvoice()` NIET opnieuw aan. Dat zou een tweede nummer
 * kunnen toekennen, en een factuurnummer twee keer uitgeven is een boekhoudkundig
 * probleem dat je niet meer opruimt. Het nummer staat al in de rij — het wordt
 * toegekend vóór de pdf (invoice.js:186, ruim voor de render op regel 200) — dus wat
 * hier gebeurt is alleen het ontbrekende stuk: `snapshot_json` teruglezen, de pdf
 * maken, wegzetten, status omzetten. Er wordt niets genummerd.
 *
 * `snapshot_json` bestaat precies hiervoor: het is de volledige invoer van
 * renderInvoicePdf(), zodat dezelfde factuur later byte-identiek opnieuw te maken is.
 * Zie de noot bij die kolom in migratie 0021.
 *
 * ── EN NIET METEEN, MAAR NA EEN KWARTIER ───────────────────────────────────
 *
 * Een factuur die twee seconden oud is en op 'pending' staat, is geen vastgelopen
 * factuur maar een factuur die op dit moment wordt gemaakt. Vijftien minuten is ruim
 * langer dan elke render en ruim korter dan een nacht.
 */
async function issuePendingInvoices(env) {
  let rows;
  try {
    const res = await env.DB.prepare(
      `SELECT id, number, order_id, snapshot_json
         FROM invoices
        WHERE status = 'pending'
          AND pdf_key IS NULL
          AND created_at <= datetime('now', '-${INVOICE_STUCK_MINUTES} minutes')
        ORDER BY id
        LIMIT 25`
    ).all();
    rows = res.results || [];
  } catch (err) {
    if (/no such table/i.test(String(err?.message || ''))) {
      throw new Error('facturen nakijken kan niet: geen invoices-tabel — is migratie 0021 gedraaid?');
    }
    throw err;
  }

  /*
   * ── EN DE CREDITNOTA'S, OM PRECIES DEZELFDE REDEN — 12 augustus 2026 ───────
   *
   * Een creditnota krijgt haar nummer vóór haar pdf, net als een factuur, en om dezelfde
   * reden: het nummer mag niet verloren gaan als de pdf mislukt, want een gat in de reeks
   * leest bij een controle als een verdwenen document. Blijft er dus een nota op
   * 'pending' staan omdat R2 even niet meewerkte, dan hoort die hier opgeraapt te worden
   * met HETZELFDE nummer.
   *
   * Zonder dit stuk was de creditnota het enige document in dit systeem dat wél een
   * nummer kon krijgen en nooit een pdf — precies het gat dat issuePendingInvoices() voor
   * facturen al dichtte.
   *
   * GEEN TABEL IS HIER GEEN FOUT, anders dan bij invoices. Migratie 0026 kan nog niet
   * gedraaid zijn terwijl 0021 dat wel is, en dan zijn er domweg geen creditnota's. Dat
   * is een andere toestand dan een ontbrekende invoices-tabel: zonder facturen kan dit
   * project niet factureren, zonder creditnota's alleen niet crediteren.
   */
  let credits = [];
  try {
    const res = await env.DB.prepare(
      `SELECT id, number, year, order_id, invoice_id, snapshot_json
         FROM credit_notes
        WHERE status = 'pending'
          AND pdf_key IS NULL
          AND created_at <= datetime('now', '-${INVOICE_STUCK_MINUTES} minutes')
        ORDER BY id
        LIMIT 25`
    ).all();
    credits = res.results || [];
  } catch (err) {
    if (!/no such table/i.test(String(err?.message || err))) throw err;
  }

  /*
   * ── EN DE ABONNEMENTSFACTUREN, OM EXACT DEZELFDE REDEN — 20 augustus 2026 ──
   *
   * Migratie 0032 maakt `idx_subinv_pending` aan met de opmerking *"voor de
   * hersteltaak, net als idx_invoices_pending"* — en die hersteltaak bestond
   * niet. Alleen `invoices` en `credit_notes` werden opgeraapt.
   *
   * Bij een abonnementsfactuur is dat gat ERGER dan bij een bestelling, want er
   * is geen tweede kans. De webhook van Mollie roept issueSubscriptionInvoice()
   * pas aan nadat de maand is toegekend, en een tweede aflevering van dezelfde
   * melding stopt daarvóór — `subscription_months` heeft de maand dan al, dus de
   * functie keert terug vóór het factuurblok. Mislukt de pdf één keer, dan blijft
   * de rij eeuwig op 'pending' staan met een verbruikt nummer en zonder document,
   * terwijl het geld wél geïncasseerd is.
   *
   * Nummerveilig op dezelfde manier: het nummer staat al in de rij, hier wordt
   * alleen de pdf gemaakt en de status omgezet. Er wordt niets genummerd.
   *
   * Geen tabel is geen fout — 0032 kan nog niet gedraaid zijn.
   */
  let abo = [];
  try {
    const res = await env.DB.prepare(
      `SELECT id, number, year, snapshot_json
         FROM subscription_invoices
        WHERE status = 'pending'
          AND pdf_key IS NULL
          AND created_at <= datetime('now', '-${INVOICE_STUCK_MINUTES} minutes')
        ORDER BY id
        LIMIT 25`
    ).all();
    abo = res.results || [];
  } catch (err) {
    if (!/no such table/i.test(String(err?.message || err))) throw err;
  }

  if (!rows.length && !credits.length && !abo.length) return null;

  /*
   * De renderer wordt pas hier geladen, en niet bovenaan het bestand.
   *
   * WAT DAT MEETBAAR OPLEVERT: niets aan de omvang. Gemeten met
   * `npm run cron:check`: 942 KB upload, 232 KB gzip, en die is met of zonder
   * dynamische import gelijk — wrangler bundelt pdf-lib er in beide gevallen bij.
   * Wat het wél doet is de module niet uitvoeren op een nacht dat er geen factuur
   * is vastgelopen, en dat is de gewone nacht.
   *
   * Ik schreef hier eerst dat de andere twee taken er "niet op hoeven te wachten".
   * Dat heb ik niet gemeten, dus staat het er niet meer.
   */
  const { renderInvoicePdf } = await import('../src/lib/invoicePdf.js');

  const done = [];
  for (const inv of rows) {
    try {
      const snap = JSON.parse(inv.snapshot_json || '{}');
      const pdf = await renderInvoicePdf(snap);
      const key = `invoices/${inv.number}.pdf`;
      await env.UPLOADS.put(key, pdf, { httpMetadata: { contentType: 'application/pdf' } });
      await env.DB.prepare(
        `UPDATE invoices
            SET status = 'issued', pdf_key = ?2, pdf_bytes = ?3, issued_at = datetime('now')
          WHERE id = ?1 AND status = 'pending'`
      ).bind(inv.id, key, pdf.byteLength ?? pdf.length ?? null).run();
      done.push(inv.number);
    } catch (err) {
      console.error('[cron] factuur', inv.number, 'niet uitgegeven —', err?.message || err);
    }
  }

  /* De nota's gaan door renderCreditPdf() in src/lib/invoice.js en niet door een kopie
     van die stappen hier. Dat is precies waarom die functie los staat: de sleutel in R2,
     de metadata en de UPDATE naar 'issued' horen op één plek te staan, en een tweede
     versie in dit bestand zou binnen een maand van de eerste afwijken. */
  const creditsDone = [];
  if (credits.length) {
    const { renderCreditPdf } = await import('../src/lib/invoice.js');
    for (const note of credits) {
      try {
        await renderCreditPdf(env, note);
        creditsDone.push(note.number);
      } catch (err) {
        console.error('[cron] creditnota', note.number, 'niet uitgegeven —', err?.message || err);
      }
    }
  }

  /* Dezelfde stappen als bij een gewone factuur, met de sleutel uit
     issueSubscriptionInvoice(): `invoices/<jaar>/<nummer>.pdf`. Die vorm staat
     daar en niet hier, dus wordt hij hier letterlijk overgenomen — wijkt hij ooit
     af, dan wijst de rij naar een object dat niet bestaat. */
  const aboDone = [];
  for (const inv of abo) {
    try {
      const snap = JSON.parse(inv.snapshot_json || '{}');
      const pdf = await renderInvoicePdf(snap);
      const key = `invoices/${inv.year}/${inv.number}.pdf`;
      await env.UPLOADS.put(key, pdf, { httpMetadata: { contentType: 'application/pdf' } });
      await env.DB.prepare(
        `UPDATE subscription_invoices
            SET status = 'issued', pdf_key = ?2, pdf_bytes = ?3, issued_at = datetime('now')
          WHERE id = ?1 AND status = 'pending'`
      ).bind(inv.id, key, pdf.byteLength ?? pdf.length ?? null).run();
      aboDone.push(inv.number);
    } catch (err) {
      console.error('[cron] abonnementsfactuur', inv.number, 'niet uitgegeven —', err?.message || err);
    }
  }

  if (!done.length && !creditsDone.length && !aboDone.length) return null;
  const delen = [];
  if (done.length) {
    delen.push(`${done.length} vastgelopen factuur/facturen alsnog uitgegeven: ${done.join(', ')}.`
      + ' De mail hierover is NIET verstuurd — doe dat met de hand vanuit het adminportaal.');
  }
  if (creditsDone.length) {
    delen.push(`${creditsDone.length} vastgelopen creditnota('s) alsnog uitgegeven: ${creditsDone.join(', ')}.`);
  }
  if (aboDone.length) {
    delen.push(`${aboDone.length} vastgelopen abonnementsfactuur/facturen alsnog uitgegeven: ${aboDone.join(', ')}.`);
  }
  return delen.join(' ');
}

/* ══ HET VERSLAG ════════════════════════════════════════════════════════════
 *
 * Platte tekst en geen html. Dit is een bericht van een machine aan één persoon; een
 * opgemaakte mail zou suggereren dat het iets is om te bewaren.
 *
 * Zonder RESEND_API_KEY gaat de mail niet en gaat de taak wel door — het opruimen en
 * vrijgeven zijn belangrijker dan het bericht erover. In dat geval staat het verslag
 * in de log van de Worker, en dat is beter dan een taak die omvalt omdat hij niet kon
 * mailen.
 */
/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE ABONNEMENTSWACHT — 18 augustus 2026
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ABONNEMENT-ONTWERP.md §7, in Lucas' eigen woorden: *"Onthoud ik werk alleen dus
 * ik kan uiteindelijk overzicht verliezen dus zoveel mogelijk moet
 * geautomatiseerd zijn."* En de regel die daarbij hoort: **het normale pad mag
 * hem niet bereiken, alleen uitzonderingen.**
 *
 * Deze taak doet twee dingen, en het onderscheid tussen de twee is het hele punt:
 *
 *   1 · EEN MAIL NAAR DE KLANT als zijn week eraan komt en zijn wachtrij hem niet
 *       gaat vullen. Dat is zíjn probleem om op te lossen, en het systeem mag het
 *       hem zelf vertellen — vijf dagen van tevoren, zodat er nog tijd is.
 *   2 · EEN REGEL IN HET NACHTVERSLAG voor Lucas, met alleen de uitzonderingen:
 *       welke wachtrijen leeg zijn, welke abonnementen gepauzeerd staan op een
 *       mislukte incasso. Loopt alles, dan staat er niets — en dan is er ook geen
 *       mail, want die gaat alleen uit als er iets te melden is.
 *
 * ── WAT DEZE TAAK MET OPZET NIET DOET: BESTELLINGEN AANMAKEN ────────────────
 *
 * §7 beschrijft ook "als zijn week aanbreekt, pakt het systeem de bovenste N en
 * begint". Dat staat hier bewust NIET in, en niet omdat het niet kan.
 *
 * Een bestelling aanmaken is de enige handeling in dit project die tegelijk
 * capaciteit vastlegt, saldo afschrijft, een referentie uitgeeft en een mail naar
 * een klant stuurt. Vier onomkeerbare dingen, om vier uur 's nachts, zonder dat
 * er iemand kijkt. De eerste keer dat die code een fout heeft, heeft hij hem bij
 * elke abonnee tegelijk en is het 's ochtends niet één bestelling maar dertig.
 * `verbruikBoeken()` heeft daar het slot voor (het plafond in de WHERE), maar een
 * slot op één van de vier is geen dekking voor de andere drie.
 *
 * Dat hoort een eigen bouwstap te zijn met een eigen testronde, en het hoort te
 * beginnen met een droogloop die alleen zegt wat hij zou doen. Deze taak is de
 * helft die vandaag veilig is en die het meeste oplevert: de klant weet dat zijn
 * week eraan komt, en Lucas hoort alleen van de gevallen die vastlopen.
 *
 * ── WAAROM VIJF DAGEN ───────────────────────────────────────────────────────
 *
 * Kort genoeg dat de week nog concreet voelt, lang genoeg om er nog foto's bij te
 * kunnen maken. Bij drie dagen is een weekend genoeg om het te missen.
 *
 * ── EEN MAIL PER MAAND PER KLANT, EN DAT WORDT AFGEDWONGEN ──────────────────
 *
 * Deze taak draait ELKE NACHT. Zonder geheugen zou een klant met een lege
 * wachtrij vijf nachten achter elkaar dezelfde mail krijgen, en na twee maanden
 * leest hij ze niet meer — precies op het moment dat het er wél toe doet.
 *
 * Het geheugen is een rij in `app_settings`, dezelfde tabel die de hartslag
 * gebruikt. Sleutel per abonnement en per maand, dus het kan er per maand
 * hoogstens één zijn, en het overleeft een herstart van de Worker.
 */

/** Zoveel dagen voor de vaste week gaat de herinnering eruit. */
const QUEUE_WARN_DAYS = 5;

/**
 * Valt de vaste week van dit abonnement over precies N dagen?
 *
 * `window_day` is een dag van de maand (1 t/m 28 — zie migratie 0030 over
 * waarom februari geen uitzondering mag worden). We rekenen dus niet met
 * maandlengtes maar kijken welke datum het over N dagen is en of díé dag het
 * afgesproken getal draagt. Zo klopt het in elke maand, ook over een maandgrens
 * heen, zonder één berekening met 28, 30 of 31 erin.
 */
function weekBeginntOver(windowDay, dagen, nu = new Date()) {
  const d = new Date(nu.getTime());
  d.setUTCDate(d.getUTCDate() + dagen);
  return d.getUTCDate() === Number(windowDay);
}

async function checkPlanQueues(env) {
  if (!env.DB) return '';
  const nu = new Date();
  const maand = nu.toISOString().slice(0, 7);

  /* Alleen abonnementen die er iets mee kunnen. 'pending' valt af: dat is
     iemand die nog niet betaald heeft, en die een mail sturen over een week die
     nog niet van hem is, is de verkeerde volgorde. */
  const abos = await env.DB.prepare(
    `SELECT s.id, s.ref, s.plan, s.status, s.pause_reason, s.window_day,
            c.email, c.brand, c.name
       FROM subscriptions s
       JOIN customers c ON c.id = s.customer_id
      WHERE s.status IN ('active', 'paused')`
  ).all().then((r) => r?.results || []).catch(() => []);
  if (!abos.length) return '';

  const gepauzeerd = [];
  const leeg = [];
  let gemaild = 0;

  for (const abo of abos) {
    /* GEPAUZEERD OP EEN MISLUKTE INCASSO IS EEN UITZONDERING EN GAAT NAAR LUCAS.
       Zelf pauzeren is dat niet — dat is een klant die precies doet wat de knop
       belooft, en daar hoeft niemand 's nachts iets van te horen. */
    if (abo.status === 'paused') {
      if (abo.pause_reason === 'payment_failed') gepauzeerd.push(abo.ref);
      continue;
    }
    if (!abo.window_day || !weekBeginntOver(abo.window_day, QUEUE_WARN_DAYS, nu)) continue;

    /* Wat er KLAARSTAAT, en niet wat er ooit op de lijst stond. Een item dat al
       is opgepakt (order_id gezet) telt niet meer mee, en een item zonder foto's
       kan niet gemaakt worden — dat is voor deze telling hetzelfde als leeg,
       want beide leiden ertoe dat de week begint zonder werk. */
    const klaar = await env.DB.prepare(
      `SELECT COUNT(*) AS n FROM plan_queue
        WHERE customer_id = (SELECT customer_id FROM subscriptions WHERE id = ?1)
          AND order_id IS NULL
          AND upload_batch IS NOT NULL AND upload_batch <> ''`
    ).bind(abo.id).first().then((r) => Number(r?.n || 0)).catch(() => -1);
    if (klaar !== 0) continue;   // -1 = niet te lezen; dan liever niets beweren

    leeg.push(abo.ref);

    /* Al gemaild deze maand? Eén rij per abonnement per maand. INSERT met OR
       IGNORE op de primaire sleutel is hier het slot: hij slaagt precies één
       keer, ook als deze taak twee keer in dezelfde nacht draait. */
    const sleutel = `queue_warn:${abo.id}:${maand}`;
    /* GEEN `updated_at` IN DEZE INSERT. app_settings heeft die kolom niet —
       alleen key, value en created_at (zie schema.sql:300). Eerste versie
       schreef hem wél en zou elke nacht stil zijn gevallen op een SQL-fout,
       met als zichtbaar gevolg: nul mails en geen enkele melding. Nagekeken in
       het schema in plaats van aangenomen naar analogie van andere tabellen. */
    const nieuw = await env.DB.prepare(
      `INSERT OR IGNORE INTO app_settings (key, value) VALUES (?1, ?2)`
    ).bind(sleutel, nu.toISOString()).run()
      .then((r) => Number(r?.meta?.changes || 0) > 0).catch(() => false);
    if (!nieuw) continue;

    if (await mailLegeWachtrij(env, abo)) gemaild += 1;
  }

  const delen = [];
  if (leeg.length) delen.push(`${leeg.length} lege wachtrij${leeg.length === 1 ? '' : 'en'} vlak voor de week (${leeg.join(', ')}), ${gemaild} klant${gemaild === 1 ? '' : 'en'} gemaild`);
  if (gepauzeerd.length) delen.push(`${gepauzeerd.length} abonnement${gepauzeerd.length === 1 ? '' : 'en'} gepauzeerd op een mislukte incasso (${gepauzeerd.join(', ')})`);
  return delen.join(' · ');
}

/**
 * De mail naar de klant. Nederlands, want er is geen taalkolom op `customers` en
 * de klantenkring is Nederlands; komt die kolom er, dan hoort deze tekst mee te
 * splitsen zoals elke andere mail in dit project.
 *
 * GEEN VERWIJT EN GEEN AANSPORING. Er staat wat er is (je week begint, je lijst
 * is leeg) en wat je kunt doen. Wat er NIET staat is een suggestie voor wat hij
 * zou moeten laten maken — dat is precies het ding dat §7 afwijst.
 */
async function mailLegeWachtrij(env, abo) {
  if (!env.RESEND_API_KEY || !abo.email) return false;
  const naam = abo.brand || abo.name || '';
  const text = [
    naam ? `Hoi ${naam},` : 'Hoi,',
    '',
    `Over ${QUEUE_WARN_DAYS} dagen begint jouw vaste week — de dagen die we elke maand voor je vrijhouden.`,
    '',
    'Je lijst in VISUAILS Studio is op dit moment leeg, of de items die erop staan hebben nog geen foto’s.',
    'Zonder foto’s kunnen we niet beginnen, en dan gaat die week voorbij zonder dat er iets gemaakt is.',
    '',
    'Je zet er zelf op wat je gemaakt wilt hebben, in je eigen volgorde:',
    'https://visuails.com/account/plan',
    '',
    'Lukt het niet, of weet je even niet wat handig is? Stuur gerust een bericht terug.',
    '',
    'VISUAILS',
  ].join('\n');
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.FROM_EMAIL,
        to: [abo.email],
        subject: 'Je vaste week begint bijna en je lijst is nog leeg',
        text,
      }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}`);
    return true;
  } catch (err) {
    console.error('[cron] wachtrijmail niet verstuurd —', err?.message || err);
    return false;
  }
}

async function sendReport(env, report, problems) {
  const lines = [];
  if (problems.length) {
    lines.push('ER GING IETS MIS:', ...problems.map((p) => `  · ${p}`), '');
  }
  if (report.length) {
    lines.push('Wat er gebeurd is:', ...report.map((r) => `  · ${r}`), '');
  }
  lines.push('Dit bericht komt van visuails-cron en gaat alleen naar jou.');
  lines.push('Geen mail betekent: er was niets te doen en er ging niets mis.');
  const text = lines.join('\n');

  if (!env.RESEND_API_KEY) {
    console.log('[cron] geen RESEND_API_KEY, verslag alleen in de log:\n' + text);
    return;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.FROM_EMAIL,
        to: [env.NOTIFY_EMAIL],
        subject: problems.length ? 'Nachtelijke taken — er ging iets mis' : 'Nachtelijke taken',
        text,
      }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
  } catch (err) {
    console.error('[cron] verslag niet verstuurd —', err?.message || err, '\n' + text);
  }
}

/* Voor de tests: de taken los aanroepbaar, zonder de scheduled-handler. */
export const tasks = { releaseExpiredWindows, purgeExpiredFiles, issuePendingInvoices, checkPlanQueues, checkBackupAge };
export const QUEUE_WATCH = { QUEUE_WARN_DAYS, weekBeginntOver };
export const BACKUP_WATCH = { BACKUP_STALE_DAYS, BACKUP_WARN_EVERY_DAYS };
