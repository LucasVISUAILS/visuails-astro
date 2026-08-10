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

import { stampUploadRetention } from './retention.js';

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
         o.status, o.closed_at
       FROM orders o WHERE o.id = ?1`
    ).bind(orderId).first();
    if (!row || row.closed_at || row.status !== 'delivered') return false;
    if (!row.live || row.approved !== row.live) return false;

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
      ).bind(orderId, 'Alle beelden goedgekeurd — bestelling afgerond. Downloaden blijft mogelijk.'),
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
