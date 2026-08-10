/* SQL-bestanden inlezen zoals de migratieloop ze inleest.
 *
 * ── WAAROM DIT EEN EIGEN BESTAND IS — 10 AUGUSTUS 2026 ──────────────────────
 *
 * Deze twee functies stonden in scripts/migrate.mjs. Ze zijn hierheen verplaatst,
 * onveranderd, omdat tests/wrangler-args.test.mjs moet kunnen nakijken of élke
 * opdracht in migrations/ over een commandoregel past. Dat kan alleen als de test de
 * bestanden op DEZELFDE manier in opdrachten hakt als het script dat ze uitvoert.
 *
 * Doet de test dat met een eigen splitsing, dan keurt hij iets anders goed dan wat er
 * draait. Dat was geen theorie: mijn eerste versie splitste ruwweg op puntkomma zonder
 * eerst het commentaar weg te halen, en viel om op drie migraties waarin een
 * commentaarregel een apostrof bevat — "niet in te korten", terwijl er niets mis was
 * met de opdracht zelf.
 *
 * Importeren uit migrate.mjs kan niet: dat bestand doet bij het laden meteen zijn werk
 * (argv lezen, inloggen, uitvoeren). Een test die het importeert, draait migraties.
 */

/**
 * Commentaar eruit — óók het commentaar dat áchter een opdracht staat.
 *
 * DE BUG DIE DIT VEROORZAAKTE, 7 augustus 2026. De vorige versie gooide alleen
 * regels weg die MET `--` beginnen. In migrations/0006 staat:
 *
 *   ALTER TABLE orders ADD COLUMN window_expires_at TEXT;   -- ISO datetime, or NULL
 *   ALTER TABLE orders ADD COLUMN refunded_cents INTEGER NOT NULL DEFAULT 0;
 *
 * Dat commentaar staat ná de puntkomma, dus bij het splitsen plakte het aan het
 * BEGIN van de volgende opdracht. Die begon daarmee niet meer met "ALTER", de
 * herkenner zag er geen ADD COLUMN in, en dus draaide hij hem gewoon — met
 * "duplicate column name: refunded_cents" tot gevolg. De controle was er wel,
 * hij keek alleen naar de verkeerde tekst.
 *
 * Aanhalingstekens worden bijgehouden zodat een `--` binnen een string blijft
 * staan. Die komen in deze migraties niet voor, maar de dag dat er één in komt,
 * hoort dit niet stil het halve statement weg te knippen.
 */
export function stripComments(sql) {
  return sql.split('\n').map((line) => {
    let inString = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === "'") {
        // '' binnen een string is een ontsnapte apostrof, geen einde.
        if (inString && line[i + 1] === "'") { i++; continue; }
        inString = !inString;
      } else if (!inString && ch === '-' && line[i + 1] === '-') {
        return line.slice(0, i);
      }
    }
    return line;
  }).join('\n');
}

/** SQL in losse opdrachten hakken, zonder commentaar ertussen. */
export function statements(sql) {
  return stripComments(sql)
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
}
