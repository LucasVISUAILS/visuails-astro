-- ══════════════════════════════════════════════════════════════════════════════
-- 0061 · HET CREDITBOEK — BESTELLEN MET CREDITS
-- ══════════════════════════════════════════════════════════════════════════════
--
-- 8 oktober 2026, ronde B ("abonnement zonder week"). Lucas, 6 oktober: een
-- abonnee bestelt via het gewone bestelformulier en betaalt met credits (§28).
-- De motor staat in src/lib/creditboek.js; lees de kop daar voor het waarom.
--
-- WAT DEZE MIGRATIE DOET
--
--   1 · Een tabel `credit_boek`: elke bij- en afschrijving van credits als
--       regel, met datum, aantal (+/−), reden en de bestelling of termijn.
--       Een + regel is een partij met een eigen vervaldatum (`vervalt_op`,
--       binnenkomst plus 3 maanden — 6.03, V43 = a) en `rest` (wat er nog
--       over is). CHECK (rest >= 0) is wat twee bestellingen tegelijk samen
--       niet meer laat afboeken dan er is.
--   2 · `orders.credits_used`: hoeveel credits een bestelling kostte. Samen
--       met `payment_status = 'credits'` het label "Credits" in Studio en
--       /admin.
--   3 · De credits die er al zijn (subscription_slots, kind 'credits') worden
--       partijen in het boek, met de vervaldatum 3 maanden na hun toekenning.
--       Wat er al van verbruikt was (de wachtrij), komt als één regel
--       "verbruikt" per partij. subscription_slots blijft staan als
--       geschiedenis; niets leest er voor het nieuwe saldo nog uit.
--   4 · Bestellingen met `payment_status = 'plan'` (de abonnementsweek, alleen
--       testdata) worden 'credits', zodat er één label is en niet twee (6.06).
--
-- VEILIG OM TWEE KEER TE DRAAIEN: de tabel en de index met IF NOT EXISTS, de
-- overname met OR IGNORE op de unieke `sleutel`. Alleen de ALTER TABLE valt de
-- tweede keer om op "duplicate column" — zoals bij elke eerdere migratie met
-- een nieuwe kolom; de rest is dan al gedaan.

CREATE TABLE IF NOT EXISTS credit_boek (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id      INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  subscription_id  INTEGER REFERENCES subscriptions(id) ON DELETE SET NULL,
  datum            TEXT    NOT NULL DEFAULT (datetime('now')),
  aantal           INTEGER NOT NULL CHECK (aantal <> 0),
  reden            TEXT    NOT NULL,
  toelichting      TEXT,
  order_id         INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  order_ref        TEXT,
  maand            TEXT,
  payment_id       TEXT,
  vervalt_op       TEXT,
  rest             INTEGER,
  partijen         TEXT,
  sleutel          TEXT UNIQUE,
  door             TEXT,
  CHECK ((aantal > 0 AND rest IS NOT NULL AND rest >= 0 AND rest <= aantal AND vervalt_op IS NOT NULL)
      OR (aantal < 0 AND rest IS NULL))
);
CREATE INDEX IF NOT EXISTS idx_creditboek_klant  ON credit_boek(customer_id, datum);
CREATE INDEX IF NOT EXISTS idx_creditboek_order  ON credit_boek(order_id);
CREATE INDEX IF NOT EXISTS idx_creditboek_betaal ON credit_boek(payment_id);

ALTER TABLE orders ADD COLUMN credits_used INTEGER;

INSERT OR IGNORE INTO credit_boek (customer_id, subscription_id, datum, aantal, reden, maand, payment_id,
                                   vervalt_op, rest, sleutel, door)
SELECT s.customer_id, ss.subscription_id, ss.created_at, ss.granted, 'termijn', ss.month, ss.payment_id,
       date(ss.created_at, '+3 months'), MAX(0, ss.granted - MIN(ss.used, ss.granted)),
       'termijn:' || ss.subscription_id || ':' || ss.month, 'migratie 0061'
  FROM subscription_slots ss
  JOIN subscriptions s ON s.id = ss.subscription_id
 WHERE ss.kind = 'credits' AND ss.granted > 0;

INSERT OR IGNORE INTO credit_boek (customer_id, subscription_id, datum, aantal, reden, toelichting, maand,
                                   partijen, sleutel, door)
SELECT b.customer_id, b.subscription_id, b.datum, -MIN(ss.used, ss.granted), 'verbruikt',
       'verbruikt vóór het creditboek (wachtrij)', ss.month,
       '[{"id":' || b.id || ',"n":' || MIN(ss.used, ss.granted) || '}]',
       'verbruikt:' || ss.subscription_id || ':' || ss.month, 'migratie 0061'
  FROM subscription_slots ss
  JOIN credit_boek b ON b.sleutel = 'termijn:' || ss.subscription_id || ':' || ss.month
 WHERE ss.kind = 'credits' AND ss.used > 0;

UPDATE orders SET payment_status = 'credits' WHERE payment_status = 'plan';
