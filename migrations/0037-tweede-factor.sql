-- ═══════════════════════════════════════════════════════════════════════════
-- EEN TWEEDE FACTOR OP DE BEHEERDERSLOGIN — 1 september 2026
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Lucas' keuze na de beveiligingsronde: *"Tweede factor met herstelcodes."*
--
-- Het beheerderswachtwoord opent elke klant, elk bestand en elke betaling, en het
-- had geen lockout en geen tweede factor. Elke andere maatregel in dit project
-- beschermt tegen iemand die er nog niet is; dit is de enige die nog iets doet als
-- het wachtwoord ergens anders gelekt is.
--
-- ── DEZE MIGRATIE ZET NIETS AAN ────────────────────────────────────────────
--
-- Dat is de belangrijkste eigenschap ervan. `totp_secret` blijft leeg tot iemand
-- zich op /admin/security inschrijft, en `totp_confirmed_at` blijft leeg tot hij
-- één keer een kloppende code heeft ingetypt. Pas dán vraagt het inloggen erom.
-- Een tweede factor die aan gaat bij het draaien van een migratie, sluit de enige
-- beheerder buiten voordat hij hem heeft kunnen instellen.
--
-- ── DE NOODUITGANG, EN HIJ STAAT HIER MET OPZET ────────────────────────────
--
-- Telefoon kwijt én de herstelcodes kwijt? Dan zet je het uit met de hand:
--
--   npx wrangler d1 execute <database> --remote \
--     --command "UPDATE admin_users SET totp_secret = NULL, totp_confirmed_at = NULL"
--
-- Wie dat commando kan draaien, heeft de database al — die kan het wachtwoord ook
-- gewoon overschrijven. Deze uitgang geeft dus niets weg dat nog niet weg was, en
-- hij staat hier zodat je hem vindt op het moment dat je hem nodig hebt in plaats
-- van in een oud gesprek.

ALTER TABLE admin_users ADD COLUMN totp_secret       TEXT;
ALTER TABLE admin_users ADD COLUMN totp_confirmed_at TEXT;

-- De halve sessie tussen wachtwoord en code in.
--
-- WAAROM EEN KOLOM OP admin_sessions EN GEEN TWEEDE TABEL: dan loopt de halve
-- sessie door dezelfde machinerie als de hele — hetzelfde gehashte koekje,
-- dezelfde vervaldatum, dezelfde opruiming. Een eigen tabel zou een tweede plek
-- zijn waar een inlogtoestand kan blijven hangen.
--
-- currentAdmin() eist `totp_pending = 0`, dus een halve sessie opent nergens iets.
ALTER TABLE admin_sessions ADD COLUMN totp_pending INTEGER NOT NULL DEFAULT 0;

-- De herstelcodes. Gehasht, want ze zijn een inloggeheim; met hashToken() en niet
-- met PBKDF2, omdat het geen door mensen gekozen wachtwoorden zijn maar honderd
-- bits uit de generator — zie de kop van src/lib/adminAuth.js voor waarom dat
-- verschil de keuze van het algoritme bepaalt.
--
-- `used_at` in plaats van verwijderen: een code die verdwijnt is niet te
-- onderscheiden van een code die er nooit was, en je wilt kunnen zien dat er één
-- gebruikt is.
CREATE TABLE IF NOT EXISTS admin_recovery_codes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id   INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  code_hash  TEXT NOT NULL UNIQUE,
  used_at    TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_admin_recovery_open
  ON admin_recovery_codes(admin_id) WHERE used_at IS NULL;
