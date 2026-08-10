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
 * 3 · FACTUREN als laatste. Een klant die betaald heeft en nog geen factuur heeft,
 *     wacht al langer dan één nacht; een uur later is hier geen verschil.
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

export default {
  async scheduled(event, env, ctx) {
    const report = [];
    const problems = [];

    for (const task of [releaseExpiredWindows, purgeExpiredFiles, issuePendingInvoices]) {
      try {
        const line = await task(env);
        if (line) report.push(line);
      } catch (err) {
        const message = `${task.name}: ${err?.message || err}`;
        console.error('[cron]', message);
        problems.push(message);
      }
    }

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

  if (!rows.length) return null;

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

  if (!done.length) return null;
  return `${done.length} vastgelopen factuur/facturen alsnog uitgegeven: ${done.join(', ')}. De mail hierover is NIET verstuurd — doe dat met de hand vanuit het adminportaal.`;
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
export const tasks = { releaseExpiredWindows, purgeExpiredFiles, issuePendingInvoices };
