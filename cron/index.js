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
 * gaat daarom alleen naar hem. Sinds 8 oktober 2026 (4.05, V36 = a) komt het ELKE
 * nacht, ook als er niets open staat: het begint met dezelfde Nu-doen-lijst als
 * bovenaan /admin (src/lib/nudoen.js), en is die leeg, dan is het onderwerp
 * "Vandaag · … — niets open". Een mail die niet komt, is dan niet meer te
 * verwarren met een nacht die niets te melden had: dan draaide de nacht niet.
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

import { EXPIRED_FILES_SQL, UPLOAD_DAYS, DELIVERY_DAYS, STALE_ACCOUNTS_COUNT_SQL, bewaartermijnRegel } from '../src/lib/retention.js';
import { planState, termijnMaand, termijnEinde, termijnDag, loadSubscription } from '../src/lib/subscription.js';
import { koppelSubscription } from '../src/lib/subscribe.js';
/* Voor grantPrepaidMonths(): de bundel van een abonnement en hoeveel producten
   er per maand bij horen. Zie de kop van die taak. */
import { grantSlots, subProducten, loadSlots, vensterVoor, kindLabel, CREDIT_KIND } from '../src/lib/slots.js';
import { TERMS } from '../src/data/plans.js';
import { planName } from '../src/data/planNames.js';
import { SERVICE_CREDITS, CREDITS_GELDIG_MAANDEN } from '../src/data/pricing.js';
/* Het creditboek (ronde B, migratie 0061): de credits van een vooruitbetaalde
   maand, en de herinnering zeven dagen voordat credits vervallen. */
import { boekTermijnBij, creditsDieVervallen, plafondInZicht } from '../src/lib/creditboek.js';
/* De vier termijnen van een onbetaalde bestelling, op één plek (8 oktober 2026,
   punt 9.01, §17.16). Zie de kop van src/data/termijnen.js. */
import { VENSTER_VASTHOUDEN_DAGEN, BETALEN_NA_BTW_AKKOORD, HERINNERING_DAG, VERVAL_DAG, inWoorden, PAUZE_MAX_MAANDEN } from '../src/data/termijnen.js';

/* Hoeveel maanden een vooruitbetaald jaar draagt. Uit de termijn zelf, zodat
   een jaar van veertien maanden hier niet hoeft te worden bijgewerkt. */
const PREPAID_MAANDEN = TERMS.prepaid.months;
/* De betaallinkmail (4 september 2026): dezelfde als na een btw-goedkeuring en
   een offerte, hier als herinnering. En de mailschil voor het vervalbericht van
   een venster. */
import { stuurBetaallink } from '../src/lib/betaallink.js';
import { teBetalenCents, tegoedOpBestelling } from '../src/lib/tegoedVerrekening.js';
import { sendMail } from '../src/lib/mail.js';
/* De meetlat (8 oktober 2026, punt 9.05): wat één nacht van de gratis grenzen
   gebruikt. Zie de kop van src/lib/meetlat.js. */
import { nieuweMeter, metMeter, telFetch, drukteRegel, ruimte, noteerStop, plan as werkPlan } from '../src/lib/meetlat.js';
/* De boekhouding (8.08, 8 oktober 2026): wat overdag niet lukte of niet langs de
   webhook kwam, gaat 's nachts naar e-Boekhouden. Zie boekhoudingNacht(). */
import { nachtrun as boekhoudingNachtrun } from '../src/lib/eboekhouden.js';
import { shell as mailShell, h1 as mailH1, p as mailP, spamNote as mailSpamNote, datum as mailDatum, button as mailButton, greeting as mailGreeting } from '../src/lib/mailTemplate.js';
/* De vragenregel onder een klantmail (punt 7.07, 8 oktober 2026). */
import { vragen as mailVragen } from '../src/lib/mailTemplate.js';
/* Stil afronden na de revisietermijn (punt 3.03, 8 oktober 2026). */
import { STIL_AFRONDEN_SQL, STIL_AFRONDEN_DAGEN, rondStilAf } from '../src/lib/close.js';
/* De klant bereiken met een vaste tekst (punt 7.05, 8 oktober 2026). */
import { waLink, contactRegels, REVIEW_GEVRAAGD } from '../src/lib/waLink.js';
/* De Nu-doen-lijst (punt 4.05, 8 oktober 2026): dezelfde functie als bovenaan /admin. */
import { nuDoen, nuDoenTekst, rapportOnderwerp, reviewTeVragen, sqlStempel } from '../src/lib/nudoen.js';

/* De taal van een abonnee — 24 september 2026. Er is geen taalkolom op
   `customers`; wat er wél is, is de taal van zijn laatste abonnementsfactuur
   (die volgt de taal waarin hij afrekende) en anders die van zijn laatste
   bestelling. Tot vandaag kregen Engelse abonnees deze mails in het Nederlands. */
const KLANT_TAAL_SQL = `COALESCE(
  (SELECT si.lang FROM subscription_invoices si WHERE si.subscription_id = s.id ORDER BY si.id DESC LIMIT 1),
  (SELECT o.lang FROM orders o WHERE o.customer_id = s.customer_id ORDER BY o.id DESC LIMIT 1),
  'nl')`;

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

    /* ── DE METEN — 8 oktober 2026 (punt 9.05) ─────────────────────────────────
       Op het gratis plan mag één run 50 databaseverzoeken en 50 verzoeken naar
       buiten doen. Elke taak krijgt daarom een omhuld env dat telt (er verandert
       niets aan wat er gebeurt), en fetch wordt voor de duur van de taken geteld.
       Het opruimen vraagt die teller of er nog ruimte is; de hartslag schrijft
       de stand weg voor /admin/diagnose, en het rapport noemt het als het krap
       werd. Zie src/lib/meetlat.js. */
    const meter = nieuweMeter();
    const gemeten = metMeter(env, meter);

    await telFetch(meter, async () => {
    /* afgerondGisteren staat niet meer in deze rij (4.05): zijn bestellingen staan
       als "Review vragen" in de Nu-doen-lijst bovenaan het rapport, met dezelfde
       voorwaarde (REVIEW_VRAGEN_WAAR in src/lib/nudoen.js). */
    for (const task of [remindUnpaid, releaseExpiredWindows, cancelStaleApprovals, purgeExpiredFiles, sweepAbandonedIntake, issuePendingInvoices, boekhoudingNacht, grantPrepaidMonths, incassoSignalen, herinnerCredits, pauzeVraag, levermailBewaker, mailNietAan, stilAfronden, bewaartermijnAccounts, checkBackupAge]) {
      try {
        const line = await task(gemeten);
        if (line) report.push(line);
      } catch (err) {
        const message = `${task.name}: ${err?.message || err}`;
        console.error('[cron]', message);
        problems.push(message);
      }
    }
    });

    /* ── DE NU-DOEN-LIJST — 8 oktober 2026 (4.05) ────────────────────────────
       NA de taken, zodat wat vannacht stil is afgerond er al als "Review vragen"
       in staat. Eén of twee databaseverzoeken (gemeten, zoals de taken). */
    const lijst = await nuDoen(gemeten.DB);
    if (lijst.fout && env?.DB) problems.push(`nu-doen-lijst: ${lijst.fout}`);

    const drukte = drukteRegel(meter, gemeten);
    if (drukte) report.push(drukte);

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
    await heartbeat(gemeten, report.length, problems.length, meter);

    /* V36 = a: altijd, ook als er niets open staat en niets gebeurde. */
    ctx.waitUntil(sendReport(env, report, problems, lijst));
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
    `SELECT id, ref, window_start, window_end, email, lang, status
       FROM orders
      WHERE tier = 'attended'
        AND window_start IS NOT NULL
        AND COALESCE(payment_status, 'unpaid') = 'unpaid'
        AND window_expires_at IS NOT NULL
        AND window_expires_at <= datetime('now')
        AND status NOT IN ('cancelled', 'delivered')
        /* ── EN NIET WAT NOG IN BTW-BEOORDELING STAAT — 17 september 2026 ───
           Een bestelling die door de btw-poort is tegengehouden, heeft geen
           betaallink gekregen. Zijn reservering opruimen wegens "de
           betaaltermijn is verstreken" is dan een verwijt over iets wat de
           klant nooit heeft kunnen doen — en de mail die deze taak stuurt zegt
           dat ook letterlijk.
           De klok wordt sinds vandaag ook niet meer gestart voor zo'n
           bestelling (zie functions/api/order.js), maar rijen van vóór vandaag
           dragen hem nog; deze regel vangt die op. COALESCE omdat de kolom
           leeg is op alles wat de poort nooit geraakt heeft.
           LET OP: deze noot staat IN een sjabloonstring, dus geen accenten
           rond woorden — een backtick sluit de string en de hele taak valt om
           bij het laden. Eén keer in gelopen. */
        AND COALESCE(review_state, '') <> 'pending'
      ORDER BY id
      LIMIT 100`);

async function releaseAll(env, rows) {
  for (const o of rows) {
    await env.DB.batch([
      env.DB.prepare(
        /* Alleen zolang er nog niet betaald is (ronde 8, B-B10): tussen de
           SELECT en deze UPDATE kan de betaling binnen zijn gekomen, en dan
           hoort de datum gewoon te blijven staan. */
        `UPDATE orders
            SET window_start = NULL, window_end = NULL, window_expires_at = NULL
          WHERE id = ?1 AND COALESCE(payment_status, 'unpaid') = 'unpaid'`
      ).bind(o.id),
      env.DB.prepare(
        `INSERT INTO order_events (order_id, status, note, actor)
         VALUES (?1, ?2, ?3, 'system')`
      ).bind(
        o.id,
        /* Zie de noot bij dezelfde reparatie in src/lib/betaallink.js:
           'pending' is geen bestelstatus en kwam als kaal Engels woord op de
           tijdlijn van een Nederlandse klant terecht. */
        o.status || 'received',
        o.lang === 'en'
          ? `Reservation ${mailDatum(o.window_start, 'en')}${o.window_end && o.window_end !== o.window_start ? ` – ${mailDatum(o.window_end, 'en')}` : ''} released: the payment period has passed. The order stays; pay and we agree a new date with you.`
          : `Reservering ${mailDatum(o.window_start, 'nl')}${o.window_end && o.window_end !== o.window_start ? ` – ${mailDatum(o.window_end, 'nl')}` : ''} vrijgegeven: de betaaltermijn is verstreken. De bestelling blijft staan; betaal je alsnog, dan spreken we een nieuwe datum met je af.`
      ),
    ]);
  }

  /* ── EN GEEN MAIL MEER — 8 oktober 2026 (punt 7.07, V21-3 = a) ─────────────
     Van 4 september tot vandaag kreeg de klant hier "Je gereserveerde
     leverdatum is vrijgegeven". Lucas koos die mail weg te laten: de
     herinnering van dag 3 (stuurBetaallink in src/lib/betaallink.js) noemt nu
     allebei de datums — tot wanneer de leverdatum wordt vastgehouden, en
     wanneer de bestelling vervalt — dus de klant weet het vooraf. De vrijgave
     zelf blijft: de dagen gaan terug in de agenda en de tijdlijn zegt waarom. */
  return `${rows.length} vervallen reservering${rows.length === 1 ? '' : 'en'} vrijgegeven: ${rows.map((o) => o.ref).join(', ')}.`;
}

/*
 * ── DE BETAALHERINNERING — 4 september 2026 ─────────────────────────────────
 *
 * Een bestelling die drie dagen onbetaald staat, krijgt één mail met een verse
 * betaallink. Drie dagen: kort genoeg om vóór het vervallen van een gereserveerd
 * venster (zeven dagen) te komen, lang genoeg om niet te duwen bij iemand die
 * gisteren bestelde. Alleen bestellingen waar echt iets te betalen is en die niet
 * op de btw-beoordeling wachten — die krijgen hun link pas na goedkeuring, en
 * dán begint hun klok (reviewed_at). Eén keer, gestempeld in payment_reminder_at
 * (migratie 0042).
 */
const REMINDER_DAYS = HERINNERING_DAG;
/* Na hoeveel dagen een gewone onbetaalde bestelling vervalt (ronde 8, B-B14).
   Ruim na de herinnering (dag 3) en het vrijgeven van een datum (dag 7). De
   getallen staan sinds 8 oktober 2026 in src/data/termijnen.js, dat de volgorde
   ook controleert. */
const ONBETAALD_VERVAL_DAGEN = VERVAL_DAG;

async function remindUnpaid(env) {
  if (!env.MOLLIE_API_KEY) return null;
  /* ── GEEN HERINNERING VOOR EEN PROEFBESTELLING ZODRA DE SLEUTEL LIVE IS ────
     8 oktober 2026 (punt 8.01). Een proefbestelling (testmodus = 1) is
     aangenomen met de testsleutel. Staat hier inmiddels de live-sleutel, dan zou
     stuurBetaallink() voor zo'n bestelling een ECHTE betaling aanmaken: Lucas'
     eigen proefklant krijgt op dag 3 een link waarmee echt geld afgaat. Het
     blok "Klaar voor live" op /admin/diagnose laat hem die bestellingen vóór de
     overstap annuleren; dit is het vangnet voor wat er toch blijft staan. Met de
     testsleutel blijft alles zoals het was, zodat de herinnering te testen is. */
  const liveSleutel = /^live_/.test(String(env.MOLLIE_API_KEY || '').trim());
  let results;
  try {
    ({ results } = await env.DB.prepare(
      `SELECT id, ref FROM orders
        WHERE COALESCE(payment_status, 'unpaid') = 'unpaid'
          ${liveSleutel ? 'AND COALESCE(testmodus, 0) = 0' : ''}
          AND COALESCE(total_cents, 0) > 0
          AND status NOT IN ('cancelled', 'delivered')
          AND payment_reminder_at IS NULL
          AND (review_state IS NULL OR review_state = 'approved')
          /* Geen herinnering voor een proefvisual (ronde 8, M-N11): wie een
             eerste poging liet liggen en later een nieuwe proef betaalde, kreeg
             een herinnering voor de oude — en betalen annuleerde hem dan als
             tweede proef. */
          AND service <> 'test-sample'
          AND COALESCE(reviewed_at, created_at) <= datetime('now', '-${REMINDER_DAYS} days')
          AND created_at >= datetime('now', '-30 days')
          /* Ronde 9 (F63): niet herinneren aan wat cancelStaleApprovals() verderop
             in DEZELFDE nacht laat vervallen. Een bestelling die (door een gemiste
             nacht, of van vóór de herinnering) al over haar termijn is, kreeg eerst
             "betaal hier" en een paar seconden later "is vervallen". Dezelfde twee
             klokken als daar. */
          AND NOT (
            (review_state = 'approved' AND reviewed_at IS NOT NULL AND reviewed_at <= datetime('now', '-${BETALEN_NA_BTW_AKKOORD} days'))
            OR (review_state IS NULL AND created_at <= datetime('now', '-${ONBETAALD_VERVAL_DAGEN} days'))
          )
        ORDER BY id LIMIT 50`
    ).all());
  } catch (err) {
    if (/no such column/i.test(String(err?.message || ''))) {
      throw new Error(`${err.message} — is migratie 0042 (betaalherinnering) gedraaid?`);
    }
    throw err;
  }
  const rows = results || [];
  if (!rows.length) return null;
  const origin = env.PUBLIC_ORIGIN || 'https://visuails.com';
  const gedaan = [];
  for (const o of rows) {
    try {
      const url = await stuurBetaallink(env, o.id, { origin, herinnering: true });
      /* Ook zonder link stempelen: de vier stille uitgangen (al betaald, geen
         adres, niets te betalen) veranderen morgen niet, en een taak die elke
         nacht dezelfde rij opnieuw probeert is een logboek vol herhaling. */
      await env.DB.prepare("UPDATE orders SET payment_reminder_at = datetime('now') WHERE id = ?1").bind(o.id).run();
      if (url) gedaan.push(o.ref);
    } catch (err) {
      console.error('[cron] betaalherinnering voor', o.ref, 'niet verstuurd —', err?.message || err);
    }
  }
  return gedaan.length ? `${gedaan.length} betaalherinnering${gedaan.length === 1 ? '' : 'en'} verstuurd: ${gedaan.join(', ')}.` : null;
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
/* ── GELEVERD, MAAR DE KLANT WEET HET NIET — 1 oktober 2026 (ronde 8, M-B9) ──
   Een mislukte levermail viel nergens op behalve op de bestelpagina zelf. Dit
   zet hem in het nachtrapport, tot hij verstuurd is. */
async function levermailBewaker(env) {
  let rows = [];
  try {
    rows = (await env.DB.prepare(
      `SELECT ref FROM orders
        WHERE status = 'delivered' AND delivery_mailed_at IS NULL
          AND COALESCE(hidden_at, '') = '' AND delivered_at >= datetime('now', '-30 days')
        ORDER BY id LIMIT 20`
    ).all())?.results || [];
  } catch { return null; }
  if (!rows.length) return null;
  return `${rows.length} geleverde bestelling${rows.length === 1 ? '' : 'en'} zonder levermail: ${rows.map((r) => r.ref).join(', ')} — open de bestelpagina en druk op "Leveringsmail opnieuw proberen".`;
}

/* ── MAIL KWAM NIET AAN — 8 oktober 2026 (punt 7.05, moment 3) ────────────────
   Een bounce of spammelding van het afgelopen etmaal, met de bestelling van dat
   adres en de knoppen met de vaste tekst: bellen (Nederlandse klant voorop) of
   appen. In /admin staat hij al rood bij de bestelling; hier staat hij 's
   ochtends, zodat Lucas de klant bereikt voordat die denkt dat er niets
   gebeurt. Er gaat niets vanzelf. */
async function mailNietAan(env) {
  let rows = [];
  try {
    rows = (await env.DB.prepare(
      `SELECT b.email, b.kind, o.id, o.ref, o.brand, o.name, o.lang, o.email AS o_email,
              o.phone AS phone, c.phone AS c_phone, COALESCE(o.country, c.country) AS land
         FROM mail_bounces b
         JOIN orders o ON o.id = (SELECT MAX(x.id) FROM orders x WHERE lower(x.email) = b.email AND x.hidden_at IS NULL)
         LEFT JOIN customers c ON c.id = o.customer_id
        WHERE b.resolved_at IS NULL AND b.created_at >= datetime('now', '-1 day')
        GROUP BY b.email
        ORDER BY o.id LIMIT 10`
    ).all())?.results || [];
  } catch { return null; }
  if (!rows.length) return null;
  const delen = rows.map((r) => {
    const link = waLink('bounce', { ref: r.ref, name: r.name, lang: r.lang, email: r.o_email || r.email, phone: r.phone || r.c_phone, land: r.land });
    const regels = contactRegels(link, { wie: r.brand || r.name || 'de klant' });
    return `${r.ref} (${r.brand || r.name || r.email}, ${r.kind === 'complained' ? 'als spam gemarkeerd' : 'kwam niet aan'})`
      + (regels.length ? `\n      ${regels.join('\n      ')}` : '\n      geen telefoonnummer bekend');
  });
  return `Mail kwam niet aan bij ${rows.length} klant${rows.length === 1 ? '' : 'en'}:\n    ${delen.join('\n    ')}`;
}

/* ── AFGEROND GISTEREN: REVIEW VRAGEN — 8 oktober 2026 (punt 3.06, V27 = b) ───
   Elke bestelling die het afgelopen etmaal is afgerond (door "Alles goed", in
   /admin, of vannacht stil), nooit gefilterd op score, en nog zonder regel
   "review gevraagd". Per bestelling de link naar de bestelpagina, waar de knop
   "Vraag om een review via WhatsApp" staat: die knop schrijft de regel en opent
   WhatsApp met de tekst. Een link in een mail kan dat niet zelf (een GET die
   iets schrijft is een deur voor andere sites), vandaar de omweg via /admin.
   Draait NA stilAfronden, zodat de stil afgeronde van vannacht erbij staan. */
async function afgerondGisteren(env) {
  /* Sinds 4.05 dezelfde voorwaarde als "Review vragen" in de Nu-doen-lijst
     (reviewTeVragen in src/lib/nudoen.js), hier over het laatste etmaal. In het
     rapport zelf staan ze nu in die lijst; deze taak draait niet meer in de
     nachtrij en blijft voor tests/review-vragen.test.mjs. */
  let rows = [];
  try {
    rows = await reviewTeVragen(env.DB, { sinds: sqlStempel(Date.now() - 864e5) });
  } catch { return null; }
  if (!rows.length) return null;
  const origin = env.PUBLIC_ORIGIN || 'https://visuails.com';
  return `Afgerond gisteren — vraag om een review via WhatsApp (bij elke bestelling, ook bij een lage score):\n    `
    + rows.map((r) => `${r.ref} (${r.brand || r.name || r.email}): ${origin}/admin/orders/${r.id}/files#review`).join('\n    ');
}

/* ── STIL AFRONDEN — 8 oktober 2026 (punt 3.03, V24 = a) ─────────────────────
   Een geleverde, betaalde bestelling zonder open revisie die sinds de laatste
   levering of het laatste revisieantwoord STIL_AFRONDEN_DAGEN (de
   revisietermijn) stil is, wordt afgerond: closed_at, een interne regel in
   order_events, en deze regel in het nachtrapport. Geen mail. De voorwaarden
   en de reden staan bij STIL_AFRONDEN_SQL in src/lib/close.js. */
async function stilAfronden(env) {
  const rows = (await env.DB.prepare(STIL_AFRONDEN_SQL).all())?.results || [];
  if (!rows.length) return null;
  const af = [];
  for (const o of rows) {
    if (!ruimte(env, { d1: 3, intern: 3 })) { noteerStop(env, 'het stille afronden'); break; }
    if (await rondStilAf(env, o.id)) af.push(o.ref);
  }
  if (!af.length) return null;
  return `${af.length} bestelling${af.length === 1 ? '' : 'en'} stil afgerond (${STIL_AFRONDEN_DAGEN} dagen na de laatste levering geen revisie of reactie, geen mail verstuurd): ${af.join(', ')}.`;
}

async function cancelStaleApprovals(env) {
  let results;
  try {
    ({ results } = await env.DB.prepare(
      /* ── EN ALLEEN EEN BESTELLING DIE ECHT TE BETALEN VIEL ─────────────
         `COALESCE(total_cents, 0) > 0` is geen extra voorzichtigheid maar de
         kern van de regel. Een aanvraag voor een merkmodel, een video, een
         look op maat of een abonnement gaat via hetzelfde formulier de
         orders-tabel in, en die diensten hebben geen prijs per product:
         quoteOrder() geeft null terug voor alles buiten catalog en
         lifestyle, dus `total_cents` blijft NULL. Zo'n aanvraag gaat WEL door de
         btw-beoordeling — er is geen zakelijke verklaring in dat formulier — en
         staat dus na goedkeuring op `review_state = 'approved'` met
         `payment_status = 'unpaid'`, precies de twee voorwaarden hieronder.

         Zeven dagen later kreeg de aanvrager dan een mail dat zijn bestelling
         was vervallen omdat hij niet betaald had. Er was nooit iets te betalen:
         stuurBetaallink() stopt zelf al bij een brutobedrag van nul, dus er is
         ook nooit een link verstuurd. Een lead voor een merkmodel die te horen
         krijgt dat hij een rekening heeft laten verlopen die niet bestond. */
      /* ── EN OOK DE GEWONE ONBETAALDE BESTELLING — 1 oktober 2026 (B-B14) ──
         Een onbetaalde bestelling zonder beoordeling bleef eeuwig op
         "binnen": in de lijsten, in de tellers, en met haar tegoed
         vastgehouden. Na ONBETAALD_VERVAL_DAGEN vervalt ze nu ook, met
         dezelfde mail. Abonnementswerk (payment_status 'plan') valt erbuiten. */
      `SELECT id, ref, email, lang, reviewed_at, total_cents, vat_cents, details_json, review_state, customer_id
         FROM orders
        WHERE COALESCE(payment_status, 'unpaid') = 'unpaid'
          AND COALESCE(total_cents, 0) > 0
          AND status NOT IN ('cancelled', 'delivered')
          AND (
            (review_state = 'approved' AND reviewed_at IS NOT NULL AND reviewed_at <= datetime('now', '-${BETALEN_NA_BTW_AKKOORD} days'))
            OR (review_state IS NULL AND created_at <= datetime('now', '-${ONBETAALD_VERVAL_DAGEN} days'))
          )
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

  /* Alleen wat echt via Mollie betaald moest worden (ronde 8, B-K2): dekte
     het tegoed alles, dan viel er niets te betalen en is hij niet "vergeten". */
  const rows = (results || []).filter((o) => teBetalenCents(o) > 0);
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
  /* ── EN DE DATUM VAN HET VERVALLEN — 8 oktober 2026 (punt 9.01, §17.22) ────
     Hier werd `cancelled_at` niet gezet, terwijl handmatig annuleren in /admin
     en de Mollie-webhook dat wel doen. De purge leunt erop (EXPIRED_FILES_SQL
     in retention.js): bij een geannuleerde bestelling rekent hij vanaf
     `COALESCE(cancelled_at, created_at)`. Zonder datum telde hij dus vanaf het
     bestellen en niet vanaf het vervallen, en wiste hij de foto's eerder dan de
     UPLOAD_DAYS na annulering die b11 belooft. En wie later in /admin of in de
     database op `cancelled_at` zoekt, mist ze niet meer. COALESCE, zodat een
     datum die er al stond niet verschuift. Bestaande vervallen bestellingen
     krijgen hun datum eenmalig uit migrations/0058-vervallen-cancelled-at.sql. */
  const vervallen = [];
  for (const o of rows) {
    const [uit] = await env.DB.batch([
      env.DB.prepare(
        `UPDATE orders
            SET status = 'cancelled', cancel_reason = ?2, window_start = NULL, window_end = NULL,
                window_expires_at = NULL, cancelled_at = COALESCE(cancelled_at, datetime('now'))
          WHERE id = ?1 AND COALESCE(payment_status, 'unpaid') = 'unpaid'`
      ).bind(o.id, o.review_state === 'approved' ? `niet betaald binnen ${inWoorden(BETALEN_NA_BTW_AKKOORD, 'nl')} dagen na goedkeuring` : `niet betaald binnen ${ONBETAALD_VERVAL_DAGEN} dagen`),
    ]);
    if (!(Number(uit?.meta?.changes) > 0)) {
      console.log('[cron] bestelling', o.ref, 'is inmiddels betaald — niet vervallen');
      continue;
    }
    vervallen.push(o);

    await env.DB.prepare(
      `INSERT INTO order_events (order_id, status, note, actor)
       VALUES (?1, 'cancelled', ?2, 'system')`
    ).bind(o.id, o.review_state === 'approved'
      ? (o.lang === 'en'
        ? `Expired: not paid within ${inWoorden(BETALEN_NA_BTW_AKKOORD, 'en')} days after we checked it. The order stays readable; you can always order again.`
        : `Vervallen: ${inWoorden(BETALEN_NA_BTW_AKKOORD, 'nl')} dagen nadat wij hem hadden nagekeken, was er niet betaald. De bestelling blijft leesbaar; opnieuw bestellen kan altijd.`)
      : (o.lang === 'en'
        ? `Expired: not paid within ${ONBETAALD_VERVAL_DAGEN} days. The order stays readable; you can always order again.`
        : `Vervallen: binnen ${ONBETAALD_VERVAL_DAGEN} dagen niet betaald. De bestelling blijft leesbaar; opnieuw bestellen kan altijd.`)).run();

    /* De mail is een mededeling en geen aansporing. Wie na zeven dagen niet betaald
       heeft, heeft meestal iets anders besloten; het enige wat hier hoort is dat hij
       weet dat de reservering weg is en dat opnieuw bestellen gewoon kan. */
    if (o.email) {
      const nl = o.lang !== 'en';
      await mailVervallen(env, o, nl);
    }
  }

  if (!vervallen.length) return null;
  return `${vervallen.length} onbetaalde bestelling${vervallen.length === 1 ? '' : 'en'} vervallen: ${vervallen.map((o) => o.ref).join(', ')}.`;
}

/* Zonder RESEND_API_KEY gaat de mail niet en gaat de taak wél door — dezelfde
   afspraak als bij de wachtrijmail hieronder. Het vervallen is het werk; de
   mededeling is een gunst, en een gunst mag geen taak laten omvallen. */
async function mailVervallen(env, o, nl) {
  if (!env.RESEND_API_KEY || !o.email) return false;
  /* In de huisstijl en met de juiste taalroute (29 september 2026): dit was de
     laatste klantmail in platte tekst, en de Nederlandse versie linkte naar de
     Engelse /start. */
  const lang = nl ? 'nl' : 'en';
  try {
    await sendMail(env, {
      to: o.email,
      subject: nl ? `Bestelling ${o.ref} is vervallen` : `Order ${o.ref} has expired`,
      html: mailShell({
        lang,
        preheader: nl ? 'Er is niets in rekening gebracht.' : 'Nothing has been charged.',
        body: [
          mailH1(nl ? 'Je bestelling is vervallen' : 'Your order has expired', o.ref),
          mailP(nl
            ? (o.review_state === 'approved'
              ? `Je bestelling ${o.ref} is vervallen omdat er niet betaald is binnen ${inWoorden(BETALEN_NA_BTW_AKKOORD, 'nl')} dagen nadat wij hem hadden nagekeken. Er is niets in rekening gebracht.`
              : `Je bestelling ${o.ref} is vervallen omdat er binnen ${ONBETAALD_VERVAL_DAGEN} dagen niet betaald is. Er is niets in rekening gebracht${tegoedOpBestelling(o) > 0 ? ', en het tegoed dat erop stond, is weer vrij' : ''}.`)
            : (o.review_state === 'approved'
              ? `Your order ${o.ref} has expired because it was not paid within ${inWoorden(BETALEN_NA_BTW_AKKOORD, 'en')} days after we checked it. Nothing has been charged.`
              : `Your order ${o.ref} has expired because it was not paid within ${ONBETAALD_VERVAL_DAGEN} days. Nothing has been charged${tegoedOpBestelling(o) > 0 ? ', and the credit on it is free again' : ''}.`)),
          mailP(nl
            ? 'Wil je het alsnog, dan kun je gewoon opnieuw bestellen — je gegevens staan er nog.'
            : 'If you still want it, you can simply order again — your details are still there.'),
          mailButton(`https://visuails.com${nl ? '/nl' : ''}/start`, nl ? 'Opnieuw bestellen' : 'Order again'),
          /* 7.07: de vragenregel in plaats van de contactenregel (V21-1). */
          mailVragen(lang, o.ref),
        ].join(''),
      }),
    });
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
    /* De rem is sinds 8 oktober 2026 (9.03) een gewone variabele in
       cron/wrangler.toml en geen secret meer; de zin zegt waar hij staat. */
    return `VERSLAGMODUS: ${rows.length} bestand${rows.length === 1 ? '' : 'en'} zou${rows.length === 1 ? '' : 'den'} nu verwijderd worden (${spec}). Er is NIETS weggegooid.`
      + ' De rem is PURGE_ENABLED in cron/wrangler.toml; die gaat pas op "true" na één gecontroleerde back-up'
      + ' (stap 5 in kladblok/LIVE-STAPPEN.md) — R2 heeft geen versiebeheer.';
  }

  const ids = rows.map((f) => f.id);
  const assets = await variantKeys(env, ids);

  let objects = 0;
  let removed = 0;
  let opDeGrens = false;
  const cleared = [];
  for (const f of rows) {
    const keys = [f.r2_key, f.preview_key, ...(assets.get(f.id) || [])].filter(Boolean);
    /* ── STOPPEN VÓÓR DE GRENS, NIET ERDOORHEEN — 8 oktober 2026 (9.05) ──────
       Op het gratis plan mag één nacht 50 databaseverzoeken doen, en elk bestand
       kost er één (plus een R2-verzoek per sleutel). Met PURGE_LIMIT = 400 liep
       een achterstand dus halverwege tegen de grens: dan faalt elke DELETE
       daarna, staan de objecten weg met hun rij er nog, en valt ook de hartslag
       van die nacht om. Nu stopt hij netjes met de reserve voor de taken die na
       hem komen, en gaat de rest morgennacht. Zonder meter (de tests, een losse
       aanroep) is er geen grens behalve PURGE_LIMIT. */
    if (!ruimte(env, { d1: 1, intern: keys.length + 1 })) {
      opDeGrens = true;
      noteerStop(env, 'het opruimen');
      break;
    }
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

  const more = opDeGrens
    ? ` Gestopt na ${removed} van de ${rows.length} op de grens van het ${werkPlan(env).naam === 'gratis' ? 'gratis plan' : 'plan'}; morgen gaat de rest.`
    : rows.length === PURGE_LIMIT ? ' Er stond meer klaar dan het plafond van vannacht; morgen gaat de rest.' : '';
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
    if (!perOrder.has(f.order_id)) perOrder.set(f.order_id, { status: f.order_status, lang: f.order_lang, kinds: new Map() });
    const entry = perOrder.get(f.order_id);
    entry.kinds.set(f.kind, (entry.kinds.get(f.kind) || 0) + 1);
  }

  const statements = [];
  for (const [orderId, { status, lang, kinds }] of perOrder) {
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
      ).bind(orderId, status, describe(kinds, lang, status))
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
/* In de taal van de bestelling (29 september 2026): de klant leest dit op zijn
   tijdlijn, en een Engelse klant kreeg het in het Nederlands. */
/* Een geannuleerde bestelling is nooit "afgesloten"; haar termijn loopt vanaf de
   annulering (8 oktober 2026, zie EXPIRED_FILES_SQL in retention.js). */
function describe(kinds, lang = 'nl', status = '') {
  const en = lang === 'en';
  const geannuleerd = status === 'cancelled';
  const parts = [];
  for (const [kind, n] of kinds) {
    const stuks = en ? `${n} file${n === 1 ? '' : 's'}` : `${n} bestand${n === 1 ? '' : 'en'}`;
    if (kind === 'upload') {
      parts.push(en
        ? `Source material deleted under the ${UPLOAD_DAYS}-day retention period after the order ${geannuleerd ? 'was cancelled' : 'closed'} (${stuks}).`
        : `Bronmateriaal verwijderd volgens de bewaartermijn van ${UPLOAD_DAYS} dagen na ${geannuleerd ? 'de annulering' : 'het afsluiten'} van de bestelling (${stuks}).`);
    } else if (kind === 'delivery') {
      parts.push(en
        ? `Delivered images deleted under the ${DELIVERY_DAYS}-day retention period after delivery (${stuks}).`
        : `Geleverde beelden verwijderd volgens de bewaartermijn van ${DELIVERY_DAYS} dagen na levering (${stuks}).`);
    } else {
      parts.push(en ? `${stuks} deleted under the retention period.` : `${stuks} verwijderd volgens de bewaartermijn.`);
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
    /* Sinds 8 oktober 2026 (9.04) wijst dit naar BACKUP.bat en niet naar een
       commando: Lucas typt geen commando's. */
    ? 'BACK-UP: er staat geen enkele geslaagde back-up in de database.'
      + ' Dubbelklik BACKUP.bat in de projectmap en kies 1: dat zet de taak in de Taakplanner'
      + ' en maakt meteen de eerste. Dit bericht komt hoogstens een keer per week terug.'
    : `BACK-UP: de laatste is ${Math.floor(age)} dagen oud (${last}),`
      + ` en ${BACKUP_STALE_DAYS} dagen is de grens. De wekelijkse taak in de Taakplanner`
      + ' loopt waarschijnlijk niet meer: dubbelklik BACKUP.bat en kies 1 (opnieuw instellen) of 2 (nu een back-up).'
      + ' Hoogstens een keer per week.';
}

/* ══ KLANTACCOUNTS OVER DE BEWAARTERMIJN — 8 oktober 2026 (o11) ════════════════
 *
 * /privacy §6 belooft dat een klantaccount ACCOUNT_YEARS jaar na de laatste
 * bestelling wordt gewist. Deze taak WIST NIETS — dat is een bewuste keuze en
 * staat in §21 van het overzicht: een verwijdering is een handeling met een mens
 * erachter, en daar is de AVG-knop in /admin voor. Wat hij wel doet: tellen, en
 * het in het nachtrapport zetten zodat de belofte niet stil verloopt.
 *
 * HOOGSTENS ÉÉN KEER PER WEEK, met dezelfde rem als de back-upwaarschuwing en om
 * dezelfde reden: een regel die elke nacht terugkomt over iets wat niet vandaag
 * hoeft, is de snelste manier om het hele rapport niet meer te lezen. Het
 * dashboard toont het getal wél altijd, als chip bij de bewakers.
 */
async function bewaartermijnAccounts(env) {
  if (!env.DB) return null;
  let n = 0;
  let gewaarschuwd = null;
  try {
    n = Number((await env.DB.prepare(STALE_ACCOUNTS_COUNT_SQL).first())?.n) || 0;
    if (!n) return null;
    gewaarschuwd = (await env.DB.prepare("SELECT value FROM app_settings WHERE key = 'accounts_warned_at'").first())?.value || null;
  } catch (err) {
    if (/no such table|no such column/i.test(String(err?.message || ''))) return null;
    throw err;
  }
  const t = Date.parse(String(gewaarschuwd || '').slice(0, 16).replace(' ', 'T') + ':00Z');
  if (Number.isFinite(t) && (Date.now() - t) / 864e5 < BACKUP_WARN_EVERY_DAYS) return null;
  try {
    await env.DB.prepare(
      `INSERT INTO app_settings (key, value) VALUES ('accounts_warned_at', ?1)
       ON CONFLICT(key) DO UPDATE SET value = ?1`
    ).bind(new Date().toISOString().slice(0, 16).replace('T', ' ')).run();
  } catch (err) {
    console.error('[cron] waarschuwingsdatum bewaartermijn niet weggeschreven —', err?.message || err);
  }
  return `BEWAARTERMIJN: ${bewaartermijnRegel(n)}. Het privacybeleid belooft dat die worden gewist;`
    + ' dat doe je zelf, per klant, met de AVG-knop: /admin/customers?f=bewaartermijn.'
    + ' Hoogstens een keer per week.';
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
async function heartbeat(env, meldingen, problemen, meter = null) {
  if (!env.DB) return;
  const nu = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const value = `${nu} · ${meldingen} ${meldingen === 1 ? 'melding' : 'meldingen'} · ${problemen} ${problemen === 1 ? 'probleem' : 'problemen'}`;
  /* ── EN MET WELKE SLEUTEL HIJ DRAAIDE — 8 oktober 2026 (punt 8.01) ─────────
     De site en de cron hebben elk hun eigen MOLLIE_API_KEY, en /admin/diagnose
     kan alleen die van de site lezen. Bij de overstap naar live is precies dát de
     vraag: draait de nacht ook al op de live-sleutel? Een cron op de testsleutel
     ziet de echte betalingen niet. Dus schrijft hij elke nacht op hoe hij
     ingesteld was — nooit de sleutel zelf, alleen het voorvoegsel — plus of het
     wissen aan stond (9.03) en wat de run van de gratis grenzen gebruikte (9.05).
     JSON, want alleen /admin leest dit en die wil velden, geen zin. */
  const modus = JSON.stringify({
    op: nu,
    mollie: mollieModus(env),
    wissen: String(env.PURGE_ENABLED || '') === 'true',
    mail: !!env.RESEND_API_KEY,
    plan: werkPlan(env).naam,
  });
  const meting = meter ? JSON.stringify({ op: nu, d1: meter.d1, r2: meter.r2, extern: meter.extern, gestopt: meter.gestopt }) : null;
  const zet = (key, v) => env.DB.prepare(
    `INSERT INTO app_settings (key, value) VALUES (?1, ?2)
     ON CONFLICT(key) DO UPDATE SET value = ?2`
  ).bind(key, v);
  try {
    const rijen = [zet('cron_last_run', value), zet('cron_modus', modus)];
    if (meting) rijen.push(zet('cron_meting', meting));
    /* Eén batch: één rondgang naar D1, en de drie rijen horen bij dezelfde nacht. */
    if (typeof env.DB.batch === 'function') await env.DB.batch(rijen);
    else for (const r of rijen) await r.run();
  } catch (err) {
    console.error('[cron] hartslag niet weggeschreven —', err?.message || err);
  }
}

/** Het voorvoegsel van de Mollie-sleutel als stand, zonder de sleutel ooit te tonen. */
function mollieModus(env) {
  const k = String(env?.MOLLIE_API_KEY || '').trim();
  if (!k) return 'geen';
  if (/^live_/.test(k)) return 'live';
  if (/^test_/.test(k)) return 'test';
  return 'onleesbaar';
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

/* ══ DE BOEKHOUDING — 8 oktober 2026 (punt 8.08) ═══════════════════════════
 *
 * Direct NA het uitgeven van vastgelopen facturen, zodat een factuur die vannacht
 * alsnog af is, vannacht ook in e-Boekhouden komt. Drie dingen, allemaal in
 * nachtrun() in src/lib/eboekhouden.js:
 *
 *   1 · verzamelen wat er sinds de vanafdatum is uitgereikt en betaald — ook wat
 *       niet langs de webhook kwam (een factuur uit Studio of uit /admin);
 *   2 · boeken wat klaarstaat;
 *   3 · elke MISLUKTE boeking één keer opnieuw proberen. Eén keer per nacht en
 *       niet vaker: een storing bij e-Boekhouden wordt zo niet de hele nacht
 *       bestookt, en een fout in de instellingen staat morgen gewoon weer in het
 *       verslag in plaats van honderd keer in het logboek.
 *
 * Zonder EBOEKHOUDEN_API_TOKEN op DEZE worker (visuails-cron is een eigen
 * project met eigen geheimen) doet dit niets en zegt het niets.
 */
async function boekhoudingNacht(env) {
  return await boekhoudingNachtrun(env);
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
      /* `year` hoort erbij — zie de sleutel hieronder. Zonder die kolom
         schreef de hersteltaak de pdf op `invoices/<nummer>.pdf` terwijl
         issueInvoice() hem op `invoices/<jaar>/<nummer>.pdf` zet. */
      `SELECT id, number, year, order_id, snapshot_json
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
      /* ── DE JAARMAP ONTBRAK — 17 september 2026 ────────────────────────
         Hier stond `invoices/${inv.number}.pdf`. issueInvoice() in
         src/lib/invoice.js zet hem op `invoices/${row.year}/${row.number}.pdf`,
         en de abonnementsvariant vijftig regels lager doet dat óók — mét een
         noot die letterlijk waarschuwt dat een afwijkende vorm naar een object
         wijst dat niet bestaat. Precies dat gebeurde hier: elke factuur die
         door de HERSTELtaak werd uitgegeven in plaats van door de webhook,
         landde buiten de jaarmap. De rij wees ernaar, dus hij was vindbaar —
         maar niet waar de rest van de boekhouding kijkt. */
      const key = `invoices/${inv.year}/${inv.number}.pdf`;
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
    const { mailCreditNote } = await import('../src/lib/cancelMail.js');
    for (const note of credits) {
      try {
        const klaar = await renderCreditPdf(env, note);
        creditsDone.push(note.number);
        /* De webhook kon deze nota niet mailen — hij had toen nog geen pdf. Nu wel,
           dus nu gaat hij alsnog de deur uit (4 september 2026). */
        if (klaar?.status === 'issued') {
          const wie = await env.DB.prepare('SELECT ref, email, lang FROM orders WHERE id = ?1')
            .bind(note.order_id).first().catch(() => null);
          if (wie) await mailCreditNote(env, { order: wie, note: klaar });
        }
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
    delen.push(`${done.length} vastgelopen ${done.length === 1 ? 'factuur' : 'facturen'} alsnog uitgegeven: ${done.join(', ')}.`
      + ' De mail hierover is NIET verstuurd — doe dat met de hand vanuit het adminportaal.');
  }
  if (creditsDone.length) {
    delen.push(`${creditsDone.length} vastgelopen creditnota('s) alsnog uitgegeven: ${creditsDone.join(', ')}.`);
  }
  if (aboDone.length) {
    delen.push(`${aboDone.length} vastgelopen ${aboDone.length === 1 ? 'abonnementsfactuur' : 'abonnementsfacturen'} alsnog uitgegeven: ${aboDone.join(', ')}.`);
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
/* ══ DE MAANDEN VAN EEN VOORUITBETAALD JAAR ════════════════════════════════
 *
 * Gevonden op 17 september 2026. Een vooruitbetaald jaar krijgt met opzet GEEN
 * Mollie-subscription — het hele jaar is met de eerste betaling voldaan, en een
 * abonnement ernaast zou elke maand nóg een keer afschrijven (zie
 * koppelSubscription() in src/lib/subscribe.js).
 *
 * Maar de maandelijkse TOEKENNING hing aan diezelfde afschrijving. De webhook
 * schrijft een rij in `subscription_months` bij elke geslaagde betaling, en bij
 * een vooruitbetaald jaar is er maar één betaling. De noot in subscribe.js zei
 * dat "de maandtaak" het overnam; die taak bestond niet.
 *
 * WAT DAT KOSTTE. Brand, twaalf maanden vooruit: € 14.080 betaald, één maand
 * toegekend. `rolloverMonths('prepaid')` is 3, dus na vier maanden stond er nul
 * saldo op een abonnement dat nog acht maanden loopt. De klant die het MEEST
 * vooruitbetaalt, krijgt het minst.
 *
 * ── WAAROM NIET TWAALF RIJEN INEENS BIJ HET AFSLUITEN ────────────────────
 *
 * Dat was de eerste gedachte en hij is fout. Het saldo wordt berekend over de
 * laatste `monthsNeeded()` maanden uit `subscription_months`, gesorteerd op
 * maand — twaalf rijen met TOEKOMSTIGE maandsleutels zetten die telling op de
 * kop, en dan heeft een klant in september het saldo van volgend augustus. De
 * doorschuifregel (drie maanden geldig) zou er bovendien betekenisloos van
 * worden: alles zou tegelijk zijn toegekend en tegelijk vervallen.
 *
 * Dus: één maand per maand, precies zoals bij een lopende incasso — alleen komt
 * het sein hier van de kalender in plaats van van de bank.
 *
 * ── DE TERMIJN EN NIET DE KALENDER ───────────────────────────────────────
 *
 * termijnMaand() zegt welke maand er nu loopt, en die kijkt naar de dag waarop
 * de termijn omslaat en niet naar de eerste van de maand. Wie op de 20e begon,
 * krijgt zijn volgende maand op de 20e. Dezelfde maat als overal elders in de
 * abonnementsketen; de kalendermaand gebruiken zou betekenen dat de eerste
 * termijn elf dagen korter is.
 *
 * ── EN HIJ STOPT VANZELF ─────────────────────────────────────────────────
 *
 * Twaalf maanden zijn betaald, dus twaalf maanden worden toegekend. Het
 * getelde aantal rijen in `subscription_months` is de teller: staat het er al
 * twaalf, dan gebeurt er niets meer. Dat is ook de reden dat er nergens een
 * einddatum hoeft te worden bijgehouden — de boekhouding IS de teller.
 *
 * IDEMPOTENT. De INSERT heeft dezelfde ON CONFLICT als de webhook en
 * grantSlots() doet INSERT OR IGNORE, dus twee keer draaien op één nacht levert
 * niets extra's op. Dat is geen luxe: deze taak draait elke nacht, en de maand
 * slaat maar één keer om.
 */
/* `nu` is een parameter en geen `new Date()` in de body, zodat een toets de klok
   twaalf maanden vooruit kan zetten zonder de globale Date te vervangen. Dat
   laatste is geprobeerd en het brak op een plek die er niets mee te maken had:
   een gestubde Date-subklasse gaf `toISOString()` niet meer door, en dan staat
   er een maandsleutel als "Wed Oct" in de database. De scheduler geeft hem niet
   mee en krijgt dus gewoon vandaag. */
async function grantPrepaidMonths(env, nu = new Date()) {
  if (!env.DB) return '';
  let gezet = 0;
  const namen = [];

  const afgesloten = [];
  const rijen = await env.DB.prepare(
    `SELECT s.id, s.ref, s.plan, s.term, s.window_day, s.started_at, s.amount_cents, s.slots_json, s.cancelled_at,
            (SELECT COUNT(*) FROM subscription_months m WHERE m.subscription_id = s.id) AS maanden,
            (SELECT MAX(m.month) FROM subscription_months m WHERE m.subscription_id = s.id) AS laatste,
            c.email, c.brand, ${KLANT_TAAL_SQL} AS lang
       FROM subscriptions s
       LEFT JOIN customers c ON c.id = s.customer_id
      WHERE s.status = 'active' AND s.term = 'prepaid'`
  ).all().catch(() => ({ results: [] }));

  for (const sub of (rijen?.results || [])) {
    /* ── HET JAAR IS OP — 24 september 2026 ──────────────────────────────
       Hier stond alleen `continue`, en dat liet het abonnement na de twaalfde
       maand voor altijd op 'active' staan: geen nieuwe credits meer, wel
       "Loopt" in Studio, en een klant die geen nieuw abonnement kon afsluiten
       (subscribe.js weigert zolang er een actief abonnement is). Nu sluit het
       af zodra de twaalfde termijn voorbij is — opgezegd of niet, want een
       vooruitbetaald jaar verlengt nooit vanzelf. De klant weet het al: hij
       kreeg bij de twaalfde maand een mail (mailLaatsteMaand hieronder). */
    if (Number(sub.maanden || 0) >= PREPAID_MAANDEN) {
      if (sub.laatste && termijnMaand(sub, nu) > String(sub.laatste)) {
        const dicht = await env.DB.prepare(
          `UPDATE subscriptions
              SET status = 'cancelled', cancelled_at = COALESCE(cancelled_at, datetime('now')),
                  cancel_reason = COALESCE(cancel_reason, 'jaar afgelopen'), updated_at = datetime('now')
            WHERE id = ?1 AND status = 'active'
            RETURNING id`
        ).bind(sub.id).first().catch((e) => {
          console.error('[cron] afgelopen jaar niet afgesloten —', sub.ref, '—', e?.message || e);
          return null;
        });
        if (dicht) afgesloten.push(sub.ref);
      }
      continue;
    }

    const maand = termijnMaand(sub, nu);
    const bestaat = await env.DB.prepare(
      'SELECT 1 AS er FROM subscription_months WHERE subscription_id = ?1 AND month = ?2 LIMIT 1'
    ).bind(sub.id, maand).first().catch(() => null);
    if (bestaat) continue;

    const producten = subProducten(sub);
    /* `payment_id` blijft leeg: er hoort geen betaling bij deze maand, hij is
       vorig jaar al betaald. Dat is ook precies wat de factuurroute nodig heeft
       om deze maand NIET nog een keer te factureren — die gaat over
       subscription_payments en niet over deze tabel. */
    const rij = await env.DB.prepare(
      `INSERT INTO subscription_months (subscription_id, month, granted, payment_id)
       VALUES (?1, ?2, ?3, NULL)
       ON CONFLICT (subscription_id, month) DO NOTHING
       RETURNING id`
    ).bind(sub.id, maand, producten).first().catch((e) => {
      console.error('[cron] vooruitbetaalde maand niet toegekend —', sub.ref, '—', e?.message || e);
      return null;
    });
    if (!rij) continue;

    await grantSlots(env, sub.id, maand, sub, null);
    /* En de partij in het creditboek (ronde B, migratie 0061), met het
       spaarplafond (12 oktober 2026): alle credits schuiven mee naar 3 maanden
       vanaf vandaag, en wat boven het plafond komt, vervalt. `sub` heeft hier
       geen customer_id; boekTermijnBij() zoekt hem zelf op. */
    await boekTermijnBij(env, sub, maand, null, nu).catch((e) => {
      console.error('[cron] credits van vooruitbetaalde maand niet in het creditboek —', sub.ref, '—', e?.message || e);
    });
    gezet += 1;
    namen.push(`${sub.ref} (${maand})`);
    /* De twaalfde maand: de klant hoort nu dat dit de laatste is, en tot
       wanneer. Eén keer — deze INSERT gebeurt maar één keer per maand. */
    if (Number(sub.maanden || 0) + 1 === PREPAID_MAANDEN) {
      await mailLaatsteMaand(env, { ...sub, tot: termijnEinde(sub, maand) });
    }
  }

  const delen = [];
  if (gezet) delen.push(`Vooruitbetaald: ${gezet} maand${gezet === 1 ? '' : 'en'} toegekend — ${namen.join(', ')}.`);
  if (afgesloten.length) delen.push(`Vooruitbetaald jaar afgelopen en afgesloten: ${afgesloten.join(', ')}.`);
  return delen.join(' ');
}

/* De laatste maand van een vooruitbetaald jaar — 24 september 2026. Wie het
   jaar heeft opgezegd, krijgt de bevestiging dat het nu stopt; wie niet heeft
   opgezegd, hoort dat het niet vanzelf verlengt en waar hij verder kan. Nooit
   werpen: de toekenning zelf is al gedaan. */
async function mailLaatsteMaand(env, o) {
  if (!env.RESEND_API_KEY || !o.email) return false;
  const nl = o.lang !== 'en';
  const lang = nl ? 'nl' : 'en';
  const tot = o.tot ? mailDatum(o.tot, lang) : '';
  const opgezegd = !!o.cancelled_at;
  try {
    await sendMail(env, {
      to: o.email,
      subject: nl ? `De laatste maand van je vooruitbetaalde jaar — ${o.ref}` : `The last month of your prepaid year — ${o.ref}`,
      html: mailShell({
        lang,
        preheader: nl ? `Je jaar loopt${tot ? ` tot ${tot}` : ' deze maand af'}.` : `Your year runs${tot ? ` until ${tot}` : ' out this month'}.`,
        body: [
          mailH1(nl ? 'Dit is de laatste maand van je jaar' : 'This is the last month of your year', o.ref),
          mailP(nl
            ? `Je credits voor deze maand staan klaar. Je vooruitbetaalde jaar loopt${tot ? ` tot <strong>${tot}</strong>` : ' deze maand af'}; daarna stopt het vanzelf en wordt er niets afgeschreven.`
            : `Your credits for this month are ready. Your prepaid year runs${tot ? ` until <strong>${tot}</strong>` : ' out this month'}; after that it stops by itself and nothing is charged.`),
          mailP(opgezegd
            ? (nl ? 'Je had al laten weten dat je daarna niet doorgaat — dan hoef je niets te doen. Besteed je laatste credits zolang het kan.'
              : 'You already told us you will not continue — so there is nothing to do. Use your last credits while you can.')
            : (nl ? 'Wil je daarna door? Kies dan een nieuw abonnement; je look, je modellen en alles wat je hebt laten maken blijven staan.'
              : 'Want to carry on after that? Pick a new plan; your look, your models and everything you have had made stay where they are.')),
          mailButton(`https://visuails.com${nl ? '/nl' : ''}/account/plan`, nl ? 'Naar je abonnement' : 'Go to your plan'),
          opgezegd ? '' : mailP(`<a href="https://visuails.com${nl ? '/nl' : ''}/plans">${nl ? 'Bekijk de abonnementen' : 'See the plans'}</a>`),
          /* Geen contactenregel meer (7.07, V21-1). */
        ].join(''),
      }),
    });
    return true;
  } catch (err) {
    console.error('[cron] laatste-maandmail voor', o.ref, 'niet verstuurd —', err?.message || err);
    return false;
  }
}

/*
 * ── DE CREDITHERINNERING — 20 september 2026 ────────────────────────────────
 *
 * Lucas, gevraagd of het leverweek-venster als vangnet moest blijven nu de klant
 * zelf inplant: *"Het zou als vangnet kunnen blijven maar hoe kunnen wij weten
 * wat de klant voor content wilt, daar zit ik een beetje mee. Ik denk dat mails
 * van dat de klant nog slots/credits over heeft en we tips daarin geven hoe ze
 * deze het beste uit kan besteden zodat ze ze niet verspilt."*
 *
 * Dat bezwaar klopt en het is de reden dat er NIET automatisch iets wordt
 * ingepland. Wij weten niet welk product hij wil laten maken; een set die wij
 * verzinnen is een set die hij niet besteld heeft. Wat we wél weten is dat er
 * credits op het punt staan te vervallen, en dat hij dat misschien niet weet.
 *
 * ── ÉÉN MAIL, ZEVEN DAGEN VOORAF — 8 oktober 2026 (6.03) ────────────────────
 *
 * Tot vandaag gingen er twee: zeven en twee dagen vooraf. Lucas koos bij 6.03
 * voor één herinnering, zeven dagen vooraf; de mail van twee dagen vervalt.
 * Zeven dagen is genoeg om iets te bestellen, en één mail per vervaldatum is
 * er één die gelezen wordt.
 *
 * De vervaldatum komt uit het creditboek (src/lib/creditboek.js). Sinds het
 * spaarplafond (12 oktober 2026, ab-v1 = c, ab-v2 = a) vervalt er bij een
 * lopend abonnement niets meer op een eigen datum; na een pauze of opzegging
 * vervalt alles samen, CREDITS_GELDIG_MAANDEN maanden na de laatste termijn.
 * Die ene datum krijgt hier één herinnering, 7 dagen vooraf. Dus niet alleen
 * lopende abonnementen: wie gepauzeerd of opgezegd heeft en nog credits heeft,
 * krijgt de mail ook. Het is dezelfde datum die Studio en stap 5 noemen.
 *
 * ── EN ÉÉN VÓÓR DE TERMIJN DIE BOVEN HET PLAFOND KOMT ──────────────────────
 *
 * Bij een lopend abonnement valt er alleen iets weg als een termijn de klant
 * boven zijn spaarplafond brengt, en dan op de dag van die termijn. Zeven dagen
 * vooraf gaat er één mail: "Op 8 februari komen er 120 bij: gebruik er vóór die
 * dag 116, anders vallen ze weg." (plafondInZicht() in creditboek.js). Geen
 * herinnering per partij meer.
 *
 * ── EN DE TIP IS EEN REKENSOM EN GEEN ADVIES ────────────────────────────────
 *
 * "Besteed ze goed" is geen tip. Wat wél helpt is: wat KAN ik hier nog voor
 * krijgen. Dat is te rekenen uit SERVICE_CREDITS, en het antwoord is per klant
 * anders. Vandaar drie concrete regels in plaats van een aansporing.
 */
const CREDIT_HERINNERING_DAGEN = 7;

/** Hoeveel hele dagen er tussen twee datums liggen. */
function dagenTot(vanIso, totIso) {
  const a = Date.parse(`${vanIso}T00:00:00Z`);
  const b = Date.parse(`${totIso}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return NaN;
  return Math.round((b - a) / 864e5);
}

/**
 * Wat je voor `n` credits nog kunt krijgen, als hooguit drie regels.
 *
 * Alleen HELE aantallen van één dienst, en alleen diensten waar er minstens één
 * van in past. Een combinatie ("twee catalogsets en een carrousel") zou
 * preciezer zijn en is precies wat een klant niet wil lezen als hij haast heeft.
 *
 * DE VOLGORDE IS MINSTE VERSPILLING EERST, en dat is niet hetzelfde als de
 * duurste dienst eerst. Bij negen credits is één lifestylecarrousel (5) de
 * grootste eenheid die past, maar dan blijven er vier liggen; twee catalogsets
 * (8) laten er één over. Een tip die je credits laat verdampen, is precies de
 * verkeerde tip in een mail die daarover gaat.
 */
function creditTips(n, lang = 'nl') {
  const nl = lang !== 'en';
  const uit = [];
  const diensten = Object.entries(SERVICE_CREDITS)
    .map(([kind, prijs]) => ({ kind, prijs, aantal: Math.floor(n / prijs), rest: n % prijs }))
    .filter((d) => d.aantal > 0)
    .sort((a, b) => a.rest - b.rest || b.prijs - a.prijs);
  for (const d of diensten.slice(0, 3)) {
    const naam = kindLabel(d.kind, nl ? 'nl' : 'en');
    uit.push(`${d.aantal} × ${naam.toLowerCase()}`);
  }
  return uit;
}

/**
 * Klanten met credits die over zeven dagen vervallen, en die het misschien niet
 * weten. Per klant één mail, met alle credits die op die dag vervallen.
 */
async function herinnerCredits(env, nu = new Date()) {
  if (!env.DB) return '';
  const lijst = await creditsDieVervallen(env, { dagen: CREDIT_HERINNERING_DAGEN, nu }).catch(() => []);
  const plafond = await plafondInZicht(env, { dagen: CREDIT_HERINNERING_DAGEN, nu }).catch(() => []);
  if (!lijst.length && !plafond.length) return '';

  let gemaild = 0;
  const namen = [];
  /* Minder dan de goedkoopste dienst is geen herinnering waard: daar valt
     niets meer voor te bestellen, en een mail die zegt "je verliest twee
     credits waar je niets voor krijgt" is alleen maar vervelend. */
  const goedkoopste = Math.min(...Object.values(SERVICE_CREDITS));

  for (const x of lijst) {
    if (x.aantal < goedkoopste) continue;
    const klant = await env.DB.prepare(
      `SELECT c.email, c.brand, s.ref, ${KLANT_TAAL_SQL} AS lang
         FROM customers c
         LEFT JOIN subscriptions s ON s.id = (SELECT id FROM subscriptions WHERE customer_id = c.id ORDER BY id DESC LIMIT 1)
        WHERE c.id = ?1`
    ).bind(x.customerId).first().catch(() => null);
    if (!klant?.email) continue;
    if (await mailCreditsVervallen(env, { ...klant, over: x.aantal, bijgekocht: x.bijgekocht || 0, vervalt: x.op, dagen: CREDIT_HERINNERING_DAGEN, geldigMaanden: CREDITS_GELDIG_MAANDEN })) {
      gemaild += 1;
      namen.push(`${klant.ref || klant.email} (${x.aantal})`);
    }
  }

  /* Boven het plafond bij de volgende termijn. Dezelfde drempel: minder dan de
     goedkoopste dienst is geen mail waard. */
  let plafondGemaild = 0;
  const plafondNamen = [];
  for (const x of plafond) {
    if (x.boven < goedkoopste) continue;
    const klant = await env.DB.prepare(
      `SELECT c.email, c.brand, s.ref, ${KLANT_TAAL_SQL} AS lang
         FROM customers c
         LEFT JOIN subscriptions s ON s.id = ?2
        WHERE c.id = ?1`
    ).bind(x.customerId, x.subscriptionId).first().catch(() => null);
    if (!klant?.email) continue;
    if (await mailPlafondInZicht(env, { ...klant, ...x, dagen: CREDIT_HERINNERING_DAGEN, geldigMaanden: CREDITS_GELDIG_MAANDEN })) {
      plafondGemaild += 1;
      plafondNamen.push(`${klant.ref || klant.email} (${x.boven} boven ${x.plafond})`);
    }
  }

  const delen = [];
  if (gemaild) delen.push(`Credits die vervallen: ${gemaild} ${gemaild === 1 ? 'klant' : 'klanten'} gemaild — ${namen.join(', ')}.`);
  if (plafondGemaild) delen.push(`Spaarplafond in zicht: ${plafondGemaild} ${plafondGemaild === 1 ? 'klant' : 'klanten'} gemaild — ${plafondNamen.join(', ')}.`);
  return delen.join(' ');
}

/**
 * De mail vóór een termijn die de klant boven zijn spaarplafond brengt
 * (12 oktober 2026). `o`: email, lang, ref, saldo, plafond, nieuw, boven, op.
 */
async function mailPlafondInZicht(env, o) {
  if (!env.RESEND_API_KEY || !o.email) return false;
  const nl = o.lang !== 'en';
  const lang = nl ? 'nl' : 'en';
  const tips = creditTips(o.boven, lang);
  const op = mailDatum(o.op, lang);
  try {
    await sendMail(env, {
      to: o.email,
      subject: nl
        ? `Op ${op} komen er ${o.nieuw} credits bij — gebruik er vóór die dag ${o.boven}`
        : `On ${op}, ${o.nieuw} credits come in — use ${o.boven} before that day`,
      html: mailShell({
        lang,
        preheader: nl ? `Je kunt ${o.plafond} credits sparen; ${o.boven} vallen anders weg op ${op}.` : `You can save up to ${o.plafond} credits; otherwise ${o.boven} lapse on ${op}.`,
        body: [
          mailH1(nl ? 'Je spaarplafond is in zicht' : 'Your savings limit is in sight'),
          /* Bij een overstap die op die dag ingaat (15 oktober 2026): dan geldt het
             plafond van het nieuwe plan, en dat is precies waarom er iets wegvalt. */
          o.overstap
            ? mailP(nl
              ? `Je hebt <strong>${o.saldo} credits</strong>. Op <strong>${op}</strong> gaat je overstap naar ${planName(o.overstap, 'nl')} in: dan komen er ${o.nieuw} bij en kun je er ${o.plafond} sparen. Gebruik er vóór die dag <strong>${o.boven}</strong>, anders vallen ze weg.`
              : `You have <strong>${o.saldo} credits</strong>. On <strong>${op}</strong> your switch to ${planName(o.overstap, 'en')} starts: ${o.nieuw} more come in and you can save up to ${o.plafond}. Use <strong>${o.boven}</strong> before that day, or they lapse.`)
            : mailP(nl
              ? `Je hebt <strong>${o.saldo} credits</strong> (je kunt er ${o.plafond} sparen). Op <strong>${op}</strong> komen er ${o.nieuw} bij: gebruik er vóór die dag <strong>${o.boven}</strong>, anders vallen ze weg.`
              : `You have <strong>${o.saldo} credits</strong> (you can save up to ${o.plafond}). On <strong>${op}</strong>, ${o.nieuw} more come in: use <strong>${o.boven}</strong> before that day, or they lapse.`),
          /* `geldigMaanden` komt mee uit herinnerCredits() (CREDITS_GELDIG_MAANDEN). */
          mailP(nl
            ? `Zolang je abonnement loopt, vervallen je credits niet; je kunt tot ${o.geldigMaanden} maanden aan credits sparen. Alleen wat er boven komt, valt weg, op de dag van je termijn. Dit is de enige herinnering.`
            : `While your plan runs, your credits do not expire; you can save up to ${o.geldigMaanden} months of credits. Only what goes above that lapses, on the day of your payment. This is the only reminder.`),
          tips.length
            ? mailP(nl
              ? `Wat je ervoor kunt laten maken: ${tips.join(', of ')}. Je bestelt zoals altijd via het bestelformulier; ben je ingelogd, dan betaal je met je credits.`
              : `What you can have made with them: ${tips.join(', or ')}. You order as usual through the order form; when you are signed in, you pay with your credits.`)
            : '',
          mailButton(`https://visuails.com${nl ? '/nl' : ''}/start`, nl ? 'Bestellen' : 'Order now'),
          mailP(nl
            ? 'Weet je niet wat je zou laten maken? Het product dat je het vaakst verkoopt, is bijna altijd het goede antwoord. Twijfel je, app ons even; dan denken we mee.'
            : 'Not sure what to have made? The product you sell most is almost always the right answer. In doubt? Send us a message and we will help you choose.'),
        ].join(''),
      }),
    });
    return true;
  } catch (err) {
    console.error('[cron] plafondherinnering voor', o.ref || o.email, 'niet verstuurd —', err?.message || err);
    return false;
  }
}

async function mailCreditsVervallen(env, o) {
  if (!env.RESEND_API_KEY || !o.email) return false;
  const nl = o.lang !== 'en';
  const lang = nl ? 'nl' : 'en';
  const tips = creditTips(o.over, lang);
  const op = mailDatum(o.vervalt, lang);
  try {
    await sendMail(env, {
      to: o.email,
      subject: nl
        ? `Je hebt nog ${o.over} credits — ze vervallen over ${o.dagen} dagen`
        : `You still have ${o.over} credits — they expire in ${o.dagen} days`,
      html: mailShell({
        lang,
        preheader: nl ? `${o.over} credits vervallen op ${op}.` : `${o.over} credits expire on ${op}.`,
        body: [
          mailH1(nl ? 'Er staan nog credits open' : 'You have credits left'),
          /* `geldigMaanden` komt mee uit herinnerCredits() (CREDITS_GELDIG_MAANDEN),
             zodat deze functie geen eigen getal kent. */
          mailP(nl
            ? (o.bijgekocht >= o.over
              /* Alleen bijgekochte credits (12 oktober 2026): die hebben hun eigen datum. */
              ? `Er staan nog <strong>${o.over} bijgekochte credits</strong> open die op <strong>${op}</strong> vervallen. `
                + (o.geldigMaanden ? `Bijgekochte credits blijven ${o.geldigMaanden} maanden geldig vanaf de aankoop; dit is de enige herinnering.` : 'Dit is de enige herinnering.')
              : `Er staan nog <strong>${o.over} credits</strong> van je abonnement open die op <strong>${op}</strong> vervallen. `
                + (o.geldigMaanden ? `Na een pauze of opzegging blijven credits geldig tot ${o.geldigMaanden} maanden na je laatste termijn; dit is de enige herinnering.` : 'Dit is de enige herinnering.'))
            : (o.bijgekocht >= o.over
              ? `You still have <strong>${o.over} bought credits</strong> that expire on <strong>${op}</strong>. `
                + (o.geldigMaanden ? `Bought credits stay valid for ${o.geldigMaanden} months from the purchase; this is the only reminder.` : 'This is the only reminder.')
              : `You still have <strong>${o.over} credits</strong> from your plan that expire on <strong>${op}</strong>. `
                + (o.geldigMaanden ? `After a pause or cancellation, credits stay valid until ${o.geldigMaanden} months after your last monthly credits came in; this is the only reminder.` : 'This is the only reminder.'))),
          tips.length
            ? mailP(nl
              ? `Wat je er nog voor kunt laten maken: ${tips.join(', of ')}. Je bestelt zoals altijd via het bestelformulier; ben je ingelogd, dan betaal je met je credits.`
              : `What you can still have made with them: ${tips.join(', or ')}. You order as usual through the order form; when you are signed in, you pay with your credits.`)
            : '',
          mailButton(`https://visuails.com${nl ? '/nl' : ''}/start`, nl ? 'Bestellen' : 'Order now'),
          mailP(nl
            ? 'Weet je niet wat je zou laten maken? Het product dat je het vaakst verkoopt, is bijna altijd '
              + 'het goede antwoord — een tweede set beelden van je bestverkopende artikel doet meer dan een '
              + 'eerste set van iets wat blijft liggen. Twijfel je, app ons even; dan denken we mee.'
            : 'Not sure what to have made? The product you sell most is almost always the right answer — '
              + 'a second set of your best seller does more than a first set of something that sits on the shelf. '
              + 'In doubt? Send us a message and we will help you choose.'),
        ].join(''),
      }),
    });
    return true;
  } catch (err) {
    console.error('[cron] creditherinnering voor', o.ref || o.email, 'niet verstuurd —', err?.message || err);
    return false;
  }
}

/**
 * ── EEN PAUZE DUURT HOOGSTENS DRIE MAANDEN — 8 oktober 2026 (2.07, V42 = b) ──
 *
 * Een abonnement dat de klant zelf pauzeerde en dat al PAUZE_MAX_MAANDEN
 * maanden stilstaat (gerekend vanaf de dag waarop de pauze inging, `paused_at`),
 * krijgt één mail: hervatten of opzeggen? Eén keer: `pauze_vraag_at` (migratie
 * 0063) onthoudt dat hij ging; hervatten maakt hem weer leeg.
 *
 * Er gebeurt verder niets vanzelf: wie niet reageert, blijft op pauze, en er
 * wordt niets afgeschreven. Een teruggeboekte termijn (pause_reason
 * 'chargeback') of een mislukte incasso krijgt deze mail niet: daar beslist Lucas.
 */
async function pauzeVraag(env, nu = new Date()) {
  if (!env.DB) return '';
  const grens = new Date(Date.UTC(nu.getUTCFullYear(), nu.getUTCMonth() - PAUZE_MAX_MAANDEN, nu.getUTCDate()))
    .toISOString().replace('T', ' ').slice(0, 19);
  const { results = [] } = await env.DB.prepare(
    `SELECT s.id, s.ref, s.plan, s.paused_at, c.email, c.brand, ${KLANT_TAAL_SQL} AS lang
       FROM subscriptions s JOIN customers c ON c.id = s.customer_id
      WHERE s.status = 'paused' AND s.pause_reason = 'customer'
        AND s.pauze_vraag_at IS NULL AND s.paused_at IS NOT NULL AND s.paused_at <= ?1
      LIMIT 10`
  ).bind(grens).all().catch((err) => {
    /* Zonder migratie 0063 bestaat de kolom niet: dan geen mail en geen fout in het rapport. */
    if (/no such column/i.test(String(err?.message || err))) return { results: [] };
    throw err;
  });
  if (!results.length) return '';
  const namen = [];
  for (const abo of results) {
    if (!abo.email || !await mailPauzeVraag(env, abo)) continue;
    await env.DB.prepare("UPDATE subscriptions SET pauze_vraag_at = datetime('now') WHERE id = ?1").bind(abo.id).run();
    namen.push(abo.ref || abo.email);
  }
  if (!namen.length) return '';
  return `Pauze langer dan ${PAUZE_MAX_MAANDEN} maanden — "hervatten of opzeggen?" gemaild: ${namen.join(', ')}.`;
}

async function mailPauzeVraag(env, o) {
  if (!env.RESEND_API_KEY) return false;
  const nl = o.lang !== 'en';
  const lang = nl ? 'nl' : 'en';
  const sinds = mailDatum(String(o.paused_at).slice(0, 10), lang);
  try {
    await sendMail(env, {
      to: o.email,
      subject: nl ? `Je abonnement staat ${PAUZE_MAX_MAANDEN} maanden op pauze — hervatten of opzeggen?` : `Your plan has been paused for ${PAUZE_MAX_MAANDEN} months — resume or cancel?`,
      html: mailShell({
        lang,
        preheader: nl ? 'Hervatten of opzeggen? Allebei met één klik in VISUAILS Studio.' : 'Resume or cancel? Both take one click in VISUAILS Studio.',
        body: [
          mailH1(nl ? 'Hervatten of opzeggen?' : 'Resume or cancel?', o.ref || ''),
          mailP(nl
            ? `Je abonnement staat sinds ${sinds} op pauze. Wil je weer beelden laten maken, dan hervat je het in VISUAILS Studio; de volgende afschrijving volgt dan het gewone ritme. Wil je stoppen, dan zeg je het daar op. Doe je niets, dan blijft het op pauze en wordt er niets afgeschreven.`
            : `Your plan has been paused since ${sinds}. If you want images made again, resume it in VISUAILS Studio; the next payment then follows the usual rhythm. If you want to stop, cancel it there. If you do nothing, it stays paused and nothing is collected.`),
          mailButton(`https://visuails.com${nl ? '/nl' : ''}/account/plan`, nl ? 'Naar je abonnement' : 'Go to your plan'),
        ].join(''),
      }),
    });
    return true;
  } catch (err) {
    console.error('[cron] pauzevraag voor', o.ref || o.email, 'niet verstuurd —', err?.message || err);
    return false;
  }
}

/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE INCASSO-SIGNALEN — wat er bij een abonnement mis kan gaan zonder webhook
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Twee regels in het nachtrapport, alleen als er iets is: een abonnement dat
 * gepauzeerd staat op een mislukte incasso, en een lopend maandabonnement
 * waarvan de termijn al drie dagen loopt zonder betaalde maand (werklijst E6:
 * een verlopen of ingetrokken machtiging; Mollie stuurt dan niets).
 *
 * ── TOT RONDE 10 HEETTE DIT checkPlanQueues() — 8 oktober 2026 ─────────────
 * Die taak mailde ook de klant vijf dagen voor zijn vaste week als er niets
 * vastgezet op zijn lijst stond. De vaste week en de lijst zijn weg (§28 van
 * het overzicht, besluit van 6 oktober), en daarmee die mail. De twee signalen
 * hieronder bleven, onveranderd: het normale pad mag Lucas niet bereiken,
 * alleen de uitzonderingen (ABONNEMENT-ONTWERP.md §7).
 */
async function incassoSignalen(env) {
  if (!env.DB) return '';
  const nu = new Date();

  const abos = await env.DB.prepare(
    `SELECT s.id, s.ref, s.plan, s.term, s.status, s.pause_reason,
            s.started_at, s.created_at, s.mollie_subscription_id, s.mollie_customer_id, s.customer_id,
            c.email, c.brand, c.name
       FROM subscriptions s
       JOIN customers c ON c.id = s.customer_id
      WHERE s.status IN ('active', 'paused')`
  ).all().then((r) => r?.results || []).catch(() => []);
  if (!abos.length) return '';

  const gepauzeerd = [];
  const uitgebleven = [];
  const zonderIncasso = [];
  let gekoppeld = 0;

  for (const abo of abos) {
    /* ── LOPEND, MAAR ZONDER MOLLIE-ABONNEMENT — 15 oktober 2026 ─────────────
       Gezien op visuails.com: het mandaat van de eerste betaling was nog
       'pending', en het Mollie-abonnement werd nooit aangemaakt. Dan wordt er na
       de eerste maand nooit meer afgeschreven, en de toets hieronder sloeg het
       over (hij kijkt alleen naar abonnementen mét een Mollie-id). Elke nacht nog
       een poging; lukt het niet, dan staat het in het rapport. */
    if (abo.status === 'active' && abo.term !== 'prepaid' && abo.mollie_customer_id && !abo.mollie_subscription_id) {
      try {
        const vol = await loadSubscription(env, abo.customer_id);
        const uit = vol && vol.id === abo.id ? await koppelSubscription(env, vol, env.PUBLIC_ORIGIN || 'https://visuails.com') : null;
        if (uit?.staat === 'gelukt') { gekoppeld += 1; continue; }
      } catch (e) { console.error('[cron] koppelen mislukt voor', abo.ref, '—', e?.message || e); }
      zonderIncasso.push(`${abo.ref} (${abo.brand || abo.email})`);
      continue;
    }
    /* ── EEN INCASSO DIE NIET EENS GEPROBEERD IS — 24 september 2026 ────────
       Werklijst E6: een verlopen of ingetrokken machtiging. Mollie zet het
       abonnement dan zelf stop en stuurt GEEN webhook — er komt geen mislukte
       betaling, er komt helemaal niets. Hier stond het dus nergens: de klant
       zag "deze maand is nog niet betaald" en de studio hoorde niets. Nu: een
       lopend maand- of jaarabonnement waarvan de termijn al drie dagen loopt
       zonder betaalde maand, komt in het nachtrapport. Geen automatische
       pauze — het kan ook een trage bank zijn; dat is een besluit voor Lucas,
       met Mollie ernaast. Niet bij een vooruitbetaald jaar (geen incasso) en
       niet in de eerste maand (die komt van de eerste betaling). */
    /* started_at OF created_at (15 oktober 2026): de webhook van de eerste
       betaling zette een nieuw abonnement op 'active' zonder started_at, en dan
       sloeg deze toets elk nieuw abonnement over. De webhook zet hem nu wel; voor
       rijen van daarvoor is created_at de dag van afsluiten. */
    const begonOp = abo.started_at || abo.created_at;
    if (abo.status === 'active' && abo.term !== 'prepaid' && abo.mollie_subscription_id && begonOp) {
      const maand = termijnMaand(abo, nu);
      const begon = new Date(`${maand}-${String(termijnDag(abo)).padStart(2, '0')}T00:00:00Z`);
      const dagen = Math.floor((nu.getTime() - begon.getTime()) / 86400000);
      const eersteMaand = String(begonOp).slice(0, 7) === maand;
      if (!eersteMaand && dagen >= 3) {
        const heeft = await env.DB.prepare(
          'SELECT 1 AS er FROM subscription_months WHERE subscription_id = ?1 AND month = ?2 LIMIT 1'
        ).bind(abo.id, maand).first().catch(() => ({ er: 1 }));
        if (!heeft) uitgebleven.push(`${abo.ref} (${abo.brand || abo.email})`);
      }
    }

    /* GEPAUZEERD OP EEN MISLUKTE INCASSO IS EEN UITZONDERING EN GAAT NAAR LUCAS.
       Zelf pauzeren is dat niet — dat is een klant die precies doet wat de knop
       belooft, en daar hoeft niemand 's nachts iets van te horen. */
    if (abo.status === 'paused' && abo.pause_reason === 'payment_failed') gepauzeerd.push(abo.ref);
  }

  const delen = [];
  if (gekoppeld) delen.push(`${gekoppeld} abonnement${gekoppeld === 1 ? '' : 'en'} alsnog aan Mollie gekoppeld (de incasso loopt nu)`);
  if (zonderIncasso.length) delen.push(`${zonderIncasso.length} lopend${zonderIncasso.length === 1 ? ' abonnement' : 'e abonnementen'} zonder incasso bij Mollie — er wordt niet afgeschreven; kijk in Mollie of er een machtiging is (${zonderIncasso.join(', ')})`);
  if (gepauzeerd.length) delen.push(`${gepauzeerd.length} abonnement${gepauzeerd.length === 1 ? '' : 'en'} gepauzeerd op een mislukte incasso (${gepauzeerd.join(', ')})`);
  if (uitgebleven.length) delen.push(`${uitgebleven.length} abonnement${uitgebleven.length === 1 ? '' : 'en'} zonder incasso deze termijn — machtiging verlopen of ingetrokken? Kijk in Mollie (${uitgebleven.join(', ')})`);
  return delen.join(' · ');
}

/* ══ 6 · WIENS WEEK BEGONNEN IS — WEG SINDS RONDE 10 ════════════════════════
 *
 * Hier stonden weekTeStarten() (een regel in het nachtrapport: "weken klaar om
 * te starten in /admin") en mailLegeWachtrij() (de klantmail vijf dagen voor
 * een vaste week zonder vastgezette producten). Met de vaste week, de lijst en
 * de knop "Start deze week" zijn ze weg — 8 oktober 2026, §28.6 van het
 * overzicht. Een abonnee bestelt via het gewone formulier; zijn bestellingen
 * lopen door dezelfde Nu-doen-lijst als alle andere.
 */

/**
 * Het nachtrapport, platte tekst, alleen aan Lucas.
 *
 * Sinds 4.05 (V36 = a) altijd: het begint met de Nu-doen-lijst — dezelfde regels,
 * in dezelfde volgorde, als bovenaan /admin — dan wat er misging, dan het
 * logboek van de nacht. Het onderwerp zegt hoeveel er wacht, of "niets open".
 * Geeft { onderwerp, text } terug, voor tests/nu-doen.test.mjs.
 */
async function sendReport(env, report, problems, lijst = null, nu = Date.now()) {
  const origin = env?.PUBLIC_ORIGIN || 'https://visuails.com';
  const lines = [...nuDoenTekst(lijst || { regels: [] }, { origin, nu }), ''];
  if (problems.length) {
    lines.push('ER GING IETS MIS:', ...problems.map((p) => `  · ${p}`), '');
  }
  if (report.length) {
    lines.push('Wat er gebeurd is:', ...report.map((r) => `  · ${r}`), '');
  }
  lines.push('Dit bericht komt van visuails-cron en gaat alleen naar jou.');
  lines.push('Het komt elke nacht, ook als er niets open staat. Komt het een ochtend niet, dan draaide de nacht niet: /admin zegt het dan bij de bewakers.');
  const text = lines.join('\n');
  const onderwerp = rapportOnderwerp({ aantal: lijst?.regels?.length || 0, problemen: problems.length, fout: Boolean(lijst?.fout), nu });

  if (!env.RESEND_API_KEY) {
    console.log(`[cron] geen RESEND_API_KEY, verslag alleen in de log (${onderwerp}):\n` + text);
    return { onderwerp, text };
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.FROM_EMAIL,
        to: [env.NOTIFY_EMAIL],
        subject: onderwerp,
        text,
      }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
  } catch (err) {
    console.error('[cron] verslag niet verstuurd —', err?.message || err, '\n' + text);
  }
  return { onderwerp, text };
}

/* Voor de tests: de taken los aanroepbaar, zonder de scheduled-handler. */

/* ═══════════════════════════════════════════════════════════════════════════
 * DE ACHTERGELATEN UPLOADS — 31 augustus 2026
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Gevonden bij de beveiligingsronde die Lucas vroeg. /api/upload is met opzet
 * ONBEVESTIGD: iemand die een bestelling invult heeft nog geen account, dus er is
 * niets om hem aan te herkennen. De rem is een snelheidsbegrenzer — veertig
 * bestanden per minuut per IP, elk tot 25 MB.
 *
 * WAT ER MISTE. Een batch die nooit aan een bestelling wordt gekoppeld, blijft
 * voor altijd in R2 staan. purgeExpiredFiles() hierboven ruimt alleen `files`-rijen
 * op die hun bewaartermijn voorbij zijn, en een verlaten batch heeft nooit een rij
 * gekregen. Dat is dus een rekening die een vreemde kan laten oplopen en die
 * niemand ziet groeien — geen inbraak, wel de enige plek waar iemand van buiten
 * onbeperkt iets kan achterlaten.
 *
 * En het gebeurt ook zonder kwade wil: elke bezoeker die foto's kiest en het
 * formulier daarna wegklikt, laat een batch achter.
 *
 * ── DE VOORWAARDE IS "NERGENS GENOEMD", NIET "OUD" ─────────────────────────
 *
 * Alleen op leeftijd afgaan zou een batch weggooien waarvan de bestelling nog in
 * behandeling is. Een batch mag pas weg als hij in GEEN van de twee plekken
 * voorkomt die ernaar kunnen wijzen — `orders.details_json` en
 * `plan_queue.upload_batch` — én hij ouder is dan INTAKE_TTL_DAYS.
 *
 * De zoektocht in details_json is een LIKE op het kenmerk zelf. Dat mag hier grof:
 * een batchkenmerk is drieënveertig willekeurige tekens, dus een toevallige
 * treffer bestaat niet, en een LIKE die te veel vindt laat een bestand STAAN —
 * de veilige kant.
 *
 * ── EN DEZELFDE REM ALS BIJ purgeExpiredFiles ──────────────────────────────
 *
 * Dit is de tweede taak die iets onherroepelijks doet, dus hij staat achter
 * dezelfde vlag en meldt standaard alleen wat hij zou doen. Zie de lange noot bij
 * PURGE_ENABLED hierboven; de argumenten zijn woord voor woord dezelfde.
 */

/** Hoe lang een niet-gekoppelde batch mag blijven staan. Ruim voorbij elke bestelstroom. */
const INTAKE_TTL_DAYS = 7;
/** Hoeveel objecten R2 per lijst teruggeeft: 1000 is het maximum van list(). */
const INTAKE_SCAN_LIMIT = 1000;
/** Hoeveel lijsten (van elk 1000) er per nacht hoogstens opgehaald worden. */
const INTAKE_MAX_PAGINAS = 20;

/**
 * De wachtruimte in R2 doorlopen, pagina voor pagina.
 *
 * ── HIER STOND ÉÉN list() — 8 oktober 2026 (punt 9.03) ───────────────────────
 * R2 geeft per aanroep hoogstens 1000 sleutels terug, en de taak keek alleen naar
 * die eerste 1000. Stonden er meer, dan zag hij de rest nooit: de sleutels zijn
 * alfabetisch, dus dezelfde vroege batches kwamen elke nacht terug en een
 * verlaten batch met een "late" naam bleef voor altijd staan. Nu volgt hij
 * `truncated`/`cursor` tot het eind, met twee remmen: hoogstens
 * INTAKE_MAX_PAGINAS lijsten per nacht, en niet verder dan de ruimte die de
 * meetlat geeft (src/lib/meetlat.js).
 *
 * WAT ER GEBEURT ALS HIJ HALVERWEGE STOPT. Sleutels van één batch staan in R2
 * naast elkaar (`intake/<batch>/<bestand>`), maar een pagina kan midden in een
 * batch eindigen. Van de laatste batch op de laatst gelezen pagina is dan niet
 * zeker dat hij compleet is — er kan een jongere upload op de volgende pagina
 * staan — dus die batch telt vannacht niet mee. Liever een nacht te laat
 * opgeruimd dan een batch weg waar iemand net nog aan werkte.
 */
async function leesWachtruimte(env) {
  const objects = [];
  let cursor;
  let paginas = 0;
  let afgekapt = false;
  for (;;) {
    let lijst;
    try {
      lijst = await env.UPLOADS.list({ prefix: 'intake/', limit: INTAKE_SCAN_LIMIT, ...(cursor ? { cursor } : {}) });
    } catch (err) {
      throw new Error(`de wachtruimte is niet te lezen: ${err?.message || err}`);
    }
    paginas += 1;
    objects.push(...(lijst?.objects || []));
    cursor = lijst?.truncated ? lijst.cursor : undefined;
    if (!cursor) break;
    if (paginas >= INTAKE_MAX_PAGINAS || !ruimte(env, { d1: 0, intern: 1 })) { afgekapt = true; break; }
  }
  return { objects, paginas, afgekapt };
}

async function sweepAbandonedIntake(env) {
  if (!env?.UPLOADS || !env?.DB) return null;

  const grens = Date.now() - INTAKE_TTL_DAYS * 86400000;

  /* Alles onder intake/, gegroepeerd per batch. De sleutel is
     `intake/<batch>/<bestand>`, dus het tweede deel is het kenmerk. `uploaded`
     komt van R2 zelf; de jóngste upload in een batch bepaalt de leeftijd, want
     zolang er nog iets bij komt is de bezoeker nog bezig. */
  const { objects, afgekapt } = await leesWachtruimte(env);
  if (!objects.length) return null;
  if (afgekapt) noteerStop(env, 'de wachtruimte');

  /* Zie de kop van leesWachtruimte(): bij een afgekapte lijst is de laatste batch
     misschien niet compleet en blijft hij vannacht staan. */
  const laatsteBatch = afgekapt ? String(objects[objects.length - 1]?.key || '').split('/')[1] : null;

  const batches = new Map();
  for (const o of objects) {
    const deel = String(o.key || '').split('/');
    if (deel.length < 3 || deel[0] !== 'intake' || !deel[1]) continue;
    const bestaand = batches.get(deel[1]) || { keys: [], bytes: 0, jongste: 0 };
    bestaand.keys.push(o.key);
    bestaand.bytes += Number(o.size) || 0;
    const op = o.uploaded ? new Date(o.uploaded).getTime() : 0;
    if (op > bestaand.jongste) bestaand.jongste = op;
    batches.set(deel[1], bestaand);
  }

  const oud = [...batches.entries()].filter(([naam, b]) => b.jongste && b.jongste < grens && naam !== laatsteBatch);
  if (!oud.length) return null;

  /* Wie er nog naar wijst. Twee query's per batch en niet één grote IN-lijst:
     het aantal oude batches is klein, en een LIKE per stuk is leesbaarder dan een
     samengestelde zoekopdracht die niemand meer naleest. Wel met de meetlat: twee
     databaseverzoeken per batch lopen op het gratis plan snel op (9.05). */
  const verlaten = [];
  for (const [batch, b] of oud) {
    if (!ruimte(env, { d1: 2, intern: 2 })) { noteerStop(env, 'de wachtruimte'); break; }
    const [inOrder, inWachtrij] = await Promise.all([
      env.DB.prepare("SELECT 1 FROM orders WHERE details_json LIKE '%' || ?1 || '%' LIMIT 1").bind(batch).first(),
      env.DB.prepare('SELECT 1 FROM plan_queue WHERE upload_batch = ?1 LIMIT 1').bind(batch).first(),
    ]);
    if (!inOrder && !inWachtrij) verlaten.push([batch, b]);
  }
  if (!verlaten.length) return null;

  const bestanden = verlaten.reduce((n, [, b]) => n + b.keys.length, 0);
  const mb = Math.round(verlaten.reduce((n, [, b]) => n + b.bytes, 0) / 1048576);

  if (String(env.PURGE_ENABLED || '') !== 'true') {
    console.log('[cron] wachtruimte: rem staat UIT —', verlaten.length, 'verlaten batches');
    return `VERSLAGMODUS: ${verlaten.length} verlaten upload${verlaten.length === 1 ? '' : 's'} in de wachtruimte`
      + ` (${bestanden} bestand${bestanden === 1 ? '' : 'en'}, ongeveer ${mb} MB), ouder dan ${INTAKE_TTL_DAYS} dagen en aan geen enkele bestelling gekoppeld.`
      + ' Er is NIETS weggegooid — dezelfde rem als bij het opruimen van bestanden, zie PURGE_ENABLED.';
  }

  let weg = 0;
  for (const [, b] of verlaten) {
    if (!ruimte(env, { d1: 0, intern: b.keys.length })) { noteerStop(env, 'de wachtruimte'); break; }
    for (const key of b.keys) {
      try { await env.UPLOADS.delete(key); weg += 1; } catch (err) {
        console.error('[cron] wachtruimte: kon', key, 'niet weggooien —', err?.message || err);
      }
    }
  }
  return `${weg} achtergelaten bestand${weg === 1 ? '' : 'en'} uit de wachtruimte opgeruimd`
    + ` (${verlaten.length} batch${verlaten.length === 1 ? '' : 'es'}, ongeveer ${mb} MB).`;
}

export const tasks = { pauzeVraag, herinnerCredits, remindUnpaid, releaseExpiredWindows, cancelStaleApprovals, purgeExpiredFiles, sweepAbandonedIntake, issuePendingInvoices, grantPrepaidMonths, incassoSignalen, checkBackupAge, bewaartermijnAccounts, heartbeat, stilAfronden, mailNietAan, afgerondGisteren };
/* De grenzen van de wachtruimte, voor tests/nachtgrenzen.test.mjs. */
export const INTAKE = { INTAKE_SCAN_LIMIT, INTAKE_MAX_PAGINAS, INTAKE_TTL_DAYS };
export const BACKUP_WATCH = { BACKUP_STALE_DAYS, BACKUP_WARN_EVERY_DAYS };
/* Het rapport zelf, voor tests/nu-doen.test.mjs (4.05). */
export const RAPPORT = { sendReport };
