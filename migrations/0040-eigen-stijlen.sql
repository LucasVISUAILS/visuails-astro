-- VISUAILS — eigen stijlen (custom looks) per klant.
--
-- Lucas, 4 september 2026: custom stijlen gaan op aanvraag — een korte intake,
-- daarna kijkt hij wat de klant precies wil en of het kan, en maakt hij een
-- offerte. Daarna wordt de stijl "in het account van de klant geplaatst waarna
-- hij deze kan gaan gebruiken via hetzelfde bestelformulier met de custom style
-- ertussen".
--
-- Eén rij per stijl per klant. De stijl is van de klant en van niemand anders:
-- hij verschijnt alleen in zíjn Studio en zíjn bestelformulier. De prijs van
-- het ONTWERP is een offerte en een losse bestelling (zie admin.js); wat hier
-- staat is alleen wat elke bestelling mét deze stijl daarna extra kost per
-- product (0 = het gewone tarief, zoals /start/custom-look belooft).
--
--   service      catalog | lifestyle | both — waar de stijl kiesbaar is
--   status       proposed | active | archived — alleen 'active' is kiesbaar
--   preview_key  R2-sleutel van het voorbeeldbeeld (zelfde regel als custom_models)
--   prompt_note  ALLEEN voor de studio: de vastgelegde look (prompt, licht,
--                grade). Komt nergens bij de klant terecht.
CREATE TABLE IF NOT EXISTS customer_styles (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id     INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  service         TEXT NOT NULL DEFAULT 'lifestyle' CHECK (service IN ('catalog', 'lifestyle', 'both')),
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('proposed', 'active', 'archived')),
  surcharge_cents INTEGER NOT NULL DEFAULT 0,
  preview_key     TEXT,
  prompt_note     TEXT,
  request_order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  design_order_id  INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_customer_styles_customer ON customer_styles(customer_id, status);
