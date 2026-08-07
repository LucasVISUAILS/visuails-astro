-- VISUAILS — migratie 0014, augustus 2026. Terugdraaien, wegstoppen, en een spoor.
--
-- Lucas: *"admin kan niets ongedaan maken. Geen verwijderen, geen annuleren met
-- reden, geen terugbetaling, geen correctie. De enige uitweg is de database
-- in."* En: *"er wordt nergens vastgelegd wie in admin wat heeft gedaan."*
--
-- ─────────────────────────────────────────────────────────────────────────────
-- DRIE SITUATIES DIE OP ÉÉN KNOP LEKEN.
--
-- ANNULEREN — een echte bestelling die niet doorgaat. De rij blijft staan, de
-- reden staat erbij, de klant ziet "geannuleerd". Dit is verreweg het vaakst
-- wat er bedoeld wordt met "verwijderen", en het is het enige van de drie dat
-- de klant óók hoort te zien.
--
-- VERBERGEN — een testbestelling van jezelf, of een dubbele. Weg uit de lijsten
-- en uit de cijfers, niet weg uit de database. `hidden_at` doet dat, en een
-- filter haalt hem terug.
--
-- ECHT VERWIJDEREN — alleen bij een AVG-verzoek, en dan hoort het bij de KLANT
-- en niet bij één bestelling. Dat staat in src/lib/admin.js, niet hier; wat
-- hier moet staan is waar de belastingdienst recht op houdt als de klant weg
-- is. Vandaar invoice_archive: bedrag, datum, referentie, geen naam.
--
-- DE REGEL DIE HET SCHEMA AFDWINGT VOOR ZOVER HET KAN: een betaalde bestelling
-- wordt nooit verwijderd, alleen geannuleerd of verborgen. Het verschil zit in
-- payment_status, dus de knop kan het zelf bepalen — daar is geen geheugen van
-- een mens om middernacht voor nodig.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- HET SPOOR. `order_events.actor` bestaat, maar alleen statuswijzigingen
-- schrijven erin, en de helft van wat admin doet gaat niet over één bestelling:
-- revisierechten intrekken hoort bij een klant, inloggen bij niemand. Vandaar
-- een eigen tabel met een losse verwijzing naar allebei.
--
-- WAAROM GEEN order_events VOOR ALLES. Die tabel wordt door de klant gelezen —
-- portal.js en sinds deze week het dashboard. Er hoort dus niets in te staan
-- wat hij niet mag zien, en "revisierechten ingetrokken wegens misbruik" is
-- precies zoiets. Twee tabellen, twee publieken; dezelfde scheiding als tussen
-- orders.customer_note en order_notes in migratie 0013.
--
-- LET OP — NIET TWEE KEER TE DRAAIEN (ALTER TABLE ADD COLUMN kent geen
-- IF NOT EXISTS). Gebruik `npm run migrate`; die slaat over wat er al staat.

ALTER TABLE orders ADD COLUMN hidden_at TEXT;
ALTER TABLE orders ADD COLUMN cancel_reason TEXT;
-- Wat er met het geld gebeurt, expliciet gekozen in plaats van impliciet
-- gelaten: 'refund' | 'credit' | 'none' | NULL (niets te kiezen, want onbetaald).
ALTER TABLE orders ADD COLUMN cancel_payment TEXT;
ALTER TABLE orders ADD COLUMN cancelled_at TEXT;

-- Verborgen bestellingen vallen uit elke lijst, dus de index die de lijsten
-- bedient hoort ze ook niet te dragen.
CREATE INDEX IF NOT EXISTS idx_orders_visible
  ON orders (status, id) WHERE hidden_at IS NULL;

CREATE TABLE IF NOT EXISTS admin_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  -- Wie. admin_users.id; geen ON DELETE CASCADE, want een spoor dat verdwijnt
  -- als het account verdwijnt, is geen spoor.
  admin_id    INTEGER,
  admin_email TEXT,
  -- Wat, in werkwoorden die je over een jaar nog begrijpt: 'order.cancel',
  -- 'order.hide', 'order.delete', 'customer.wipe', 'revisions.revoke', ...
  action      TEXT NOT NULL,
  order_id    INTEGER,
  customer_id INTEGER,
  -- De details in gewone taal. Geen JSON: dit wordt gelezen door een mens die
  -- wil weten wat er gebeurde, niet door een programma.
  detail      TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_admin_log_time ON admin_log(id DESC);
CREATE INDEX IF NOT EXISTS idx_admin_log_order ON admin_log(order_id);
CREATE INDEX IF NOT EXISTS idx_admin_log_customer ON admin_log(customer_id);

-- Wat er overblijft van een bestelling nadat de klant is gewist. Geen naam,
-- geen adres, geen e-mail: een bedrag, een datum en een referentie, want dat is
-- wat een boekhouding nodig heeft en het is ook alles wat ze nodig heeft.
CREATE TABLE IF NOT EXISTS invoice_archive (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  ref          TEXT NOT NULL,
  service      TEXT,
  total_cents  INTEGER NOT NULL DEFAULT 0,
  vat_cents    INTEGER NOT NULL DEFAULT 0,
  paid_at      TEXT,
  created_at   TEXT,
  archived_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_invoice_archive_ref ON invoice_archive(ref);
