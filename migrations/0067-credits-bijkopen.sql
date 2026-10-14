-- ══════════════════════════════════════════════════════════════════════════════
-- 0067 · EXTRA CREDITS BIJKOPEN
-- ══════════════════════════════════════════════════════════════════════════════
--
-- 12 oktober 2026, afvinklijst 4 (ab-v3 = c, ab-v4 = b). Alleen toevoegend: één
-- nieuwe tabel en één nieuwe kolom.
--
-- `credit_aankopen`: één rij per keer dat een abonnee extra credits bijkoopt,
-- vanaf het moment dat hij op "Bijkopen" drukt. Status 'open' tot Mollie zegt
-- hoe het afliep ('paid', 'failed', 'canceled', 'expired'); alleen bij 'paid'
-- komen de credits erbij (een partij 'bijgekocht' in credit_boek). `maand` is
-- de kalendermaand van de aankoop: daarop telt het maximum van 100 per maand
-- (BIJKOOP_MAX_PER_MAAND in src/data/pricing.js), met de open betalingen mee,
-- zodat twee tabbladen tegelijk er niet overheen komen. De bedragen staan erin
-- zoals ze op het moment van kopen waren (exclusief btw, de btw, het bruto), en
-- de btw-behandeling van het abonnement. De betaling zelf komt bij 'paid' ook
-- in subscription_payments (`subscription_payment_id`), zodat de factuur uit
-- dezelfde reeks en route komt als een termijnfactuur. Weg met de klant (ON
-- DELETE CASCADE); de factuur blijft (subscription_invoices, SET NULL).
--
-- `credit_boek.soort`: 'bijgekocht' bij credits die gekocht zijn (de partij
-- zelf, en wat er bij een annulering of terugboeking van terugkomt); leeg bij
-- alles wat bij het abonnement hoort. Bijgekochte credits gaan eerst op,
-- houden hun eigen datum en tellen niet mee voor het spaarplafond. Zie
-- src/lib/creditboek.js en src/lib/bijkopen.js.
--
-- Veilig om twee keer te draaien: de tabel met IF NOT EXISTS; de kolom geeft bij
-- een tweede keer "duplicate column", en dat vangt scripts/migrate.mjs op zoals
-- bij elke ALTER TABLE ADD COLUMN.

CREATE TABLE IF NOT EXISTS credit_aankopen (
  id                       INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id              INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  subscription_id          INTEGER REFERENCES subscriptions(id) ON DELETE SET NULL,
  pakket                   INTEGER NOT NULL CHECK (pakket > 0),
  net_cents                INTEGER NOT NULL CHECK (net_cents > 0),
  vat_cents                INTEGER NOT NULL DEFAULT 0,
  gross_cents              INTEGER NOT NULL CHECK (gross_cents >= net_cents),
  vat_treatment            TEXT,
  plan_label               TEXT,
  maand                    TEXT    NOT NULL,
  status                   TEXT    NOT NULL DEFAULT 'open'
                             CHECK (status IN ('open', 'paid', 'failed', 'canceled', 'expired')),
  mollie_payment_id        TEXT UNIQUE,
  subscription_payment_id  INTEGER REFERENCES subscription_payments(id) ON DELETE SET NULL,
  created_at               TEXT    NOT NULL DEFAULT (datetime('now')),
  paid_at                  TEXT
);
CREATE INDEX IF NOT EXISTS idx_credit_aankopen_klant ON credit_aankopen(customer_id, maand, status);

ALTER TABLE credit_boek ADD COLUMN soort TEXT;
