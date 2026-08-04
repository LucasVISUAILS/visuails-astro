-- VISUAILS — migration 0007, August 2026.
--
-- Two things Lucas asked for on the same day, and they turn out to be one
-- migration because both hang off the same two tables.
--
-- 1 · THE BRAND KIT GROWS BEYOND A MODEL.
--
-- customer_style_locks already existed and did exactly one thing: pin a style
-- (catalog / lifestyle / video) to one of that customer's own custom_models
-- rows. Lucas: "klant kan hier bijvoorbeeld achtergrond kleur, vaste/favoriete
-- modellen kiezen. Deze staan dan bij een nieuwe bestelling automatisch
-- aangevinkt/ingevuld."
--
-- So a lock has to be able to hold more than a custom model, and two of the
-- three additions are shaped by that:
--
--   background_hex   the ground this brand always uses, per style. Same values
--                    the order form's picker produces, stored resolved rather
--                    than as an id, because backgrounds.js's ids are OUR
--                    vocabulary and a hex is the thing the studio actually
--                    needs. NULL means "no standing preference".
--
--   roster_model     a face from the SHARED standard roster (src/data/models.js
--                    — 'ava', 'elias', …), for the brand that has a favourite
--                    but has not commissioned a Brand Model. This is the gap
--                    that made the old table nearly unusable: it could only
--                    hold a custom model, and almost no customer has one.
--
-- custom_model_id had to lose its NOT NULL for that to work — a lock can now be
-- "just a background", or "just a roster face". SQLite cannot drop a NOT NULL
-- in place, so the table is rebuilt. It is small and every row survives.
--
-- 2 · DELIVERY, AND THE MAIL THAT ANNOUNCES IT.
--
-- Lucas: "als ik een bestelling op geleverd zet [wil ik dat] de klant een mail
-- krijgt met deze info en een link naar zijn portaal." delivered_at records
-- when that happened, and delivery_mailed_at records that the mail went — two
-- columns rather than one, because they answer different questions and the
-- second one is what stops a second mail going out if the status is set to
-- delivered twice, which is a thing that will happen.
PRAGMA foreign_keys = OFF;

CREATE TABLE customer_style_locks_new (
  customer_id     INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  style           TEXT NOT NULL,     -- 'catalog' | 'lifestyle' | 'video'
  custom_model_id INTEGER REFERENCES custom_models(id) ON DELETE SET NULL,
  roster_model    TEXT,              -- a standard-roster id, or NULL
  background_hex  TEXT,              -- '#FFFFFF', or NULL for "ask per order"
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (customer_id, style)
);

INSERT INTO customer_style_locks_new (customer_id, style, custom_model_id, updated_at)
  SELECT customer_id, style, custom_model_id, updated_at FROM customer_style_locks;

DROP TABLE customer_style_locks;
ALTER TABLE customer_style_locks_new RENAME TO customer_style_locks;

PRAGMA foreign_keys = ON;

-- When the studio marked it delivered, and whether the customer was told.
ALTER TABLE orders ADD COLUMN delivered_at TEXT;
ALTER TABLE orders ADD COLUMN delivery_mailed_at TEXT;
