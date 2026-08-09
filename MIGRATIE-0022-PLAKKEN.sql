-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATIE 0022, OM TE PLAKKEN IN DE D1-CONSOLE
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- Zelfde bestand als migrations/0022-delivery-assets.sql, zonder de uitleg, zodat
-- je het in één keer in de Cloudflare-console kunt plakken. Liever met het script:
--
--   npx wrangler whoami        (verse token — zie de noot in scripts/lib/wrangler.mjs)
--   npm run migrate
--
-- Wat het doet: één tabel erbij, file_assets, waarin de png/jpg/webp van een beeld
-- staan. De volledige onderbouwing staat in het echte migratiebestand.
--
-- VEILIG OM TWEE KEER TE DRAAIEN. Alleen CREATE ... IF NOT EXISTS, geen ALTER TABLE.
--
-- WAT ER DAARNA NOG MOET GEBEUREN, EN WAT NIET:
--
--   · Bestaande leveringen worden NIET omgebouwd en hoeven dat niet. Ze hebben geen
--     assets en krijgen daarom het platte archief dat ze altijd al gaven. VIS-2608-4471
--     geeft na deze migratie exact dezelfde zip als ervoor.
--   · De eerste bestelling die je via `npm run deliver` levert, krijgt de nieuwe map
--     met mappen erin. Geen omslagpunt, geen bestelling die er tussenin valt.
--   · sharp staat nu in package.json (het was een niet-aangemelde afhankelijkheid die
--     wél geïnstalleerd stond). Draai `npm install` één keer voordat je levert.

CREATE TABLE IF NOT EXISTS file_assets (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  file_id     INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  format      TEXT NOT NULL CHECK (format IN ('png', 'jpg', 'webp')),
  r2_key      TEXT NOT NULL,
  bytes       INTEGER,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (file_id, format)
);

CREATE INDEX IF NOT EXISTS idx_file_assets_file ON file_assets (file_id);
