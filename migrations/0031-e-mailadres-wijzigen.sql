-- VISUAILS — het e-mailadres wijzigen.
--
-- ══════════════════════════════════════════════════════════════════════════════
-- WAAROM DIT EEN EIGEN TABEL IS EN GEEN VELD IN EEN FORMULIER
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Tot vandaag stond er bij het e-mailadres in het klantenportaal: *"Hiermee log je
-- in, dus dit verandert alleen door onder een nieuw adres te bestellen. Mail ons en
-- we zetten het om."* Dat was eerlijk en het was werk voor Lucas, elke keer, met de
-- hand — precies het soort werk dat bij één persoon oploopt.
--
-- Het is ook niet zomaar een veld. Dit adres IS de inlog: er is geen wachtwoord, er
-- is een link in de mail. Wie dit adres verandert, verandert wie er in het account
-- kan. Een tekstvak dat direct opslaat, zou betekenen dat iemand met een gestolen
-- sessiekoekje het account in één POST kan overnemen — en dat de eigenaar het pas
-- merkt als hij zelf niet meer binnenkomt.
--
-- ── DE TWEE KANTEN ──────────────────────────────────────────────────────────
--
-- Vandaar twee kenmerken per verzoek, en ze doen iets anders:
--
--   confirm_hash  gaat naar het NIEUWE adres. Zolang daar niet op geklikt is,
--                 verandert er niets. Dat is het bewijs dat de aanvrager dat
--                 postvak echt heeft — anders zet iemand met een typefout zijn
--                 account op een adres dat niet bestaat en komt hij nooit meer
--                 binnen.
--
--   undo_hash     gaat naar het OUDE adres, samen met de mededeling DAT het is
--                 gewijzigd. Eén klik zet het terug en gooit alle sessies eruit.
--                 Dit is de belangrijkste van de twee: het is wat een overname met
--                 een gestolen sessie ongedaan maakt, want de aanvaller kan het
--                 postvak van de eigenaar niet leegmaken.
--
-- Die tweede is de reden dat dit een tabel is en geen kolom. Om terug te kunnen
-- zetten, moet je weten wat het WAS, en dat moet weken blijven staan — lang nadat
-- de wijziging zelf klaar is.
--
-- ── WAT DEZE MIGRATIE NIET DOET ─────────────────────────────────────────────
--
-- `orders.email` wordt niet meegewijzigd, en dat is geen vergeten regel. Een
-- bestelling draagt het adres waarmee hij geplaatst is; een factuur die daarop
-- staat, moet blijven kloppen met wat er is uitgereikt. Hetzelfde onderscheid als
-- bij `orders.total_cents` tegenover de ladder: de bestelling is een moment, de
-- klant is een doorlopend gegeven.
--
-- En `subscribers` — de nieuwsbrief — blijft ook staan. Die rij is een TOESTEMMING
-- die aan een adres is gegeven. Hem stil naar een nieuw adres verhuizen is een
-- toestemming verplaatsen die daar nooit voor gegeven is.

CREATE TABLE IF NOT EXISTS email_changes (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id     INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  -- Beide adressen, voluit. `previous_email` is wat de ongedaan-maken-link nodig
  -- heeft; zonder die kolom is een overname niet terug te draaien.
  previous_email  TEXT NOT NULL,
  new_email       TEXT NOT NULL,

  -- Gehasht en niet in platte tekst, om dezelfde reden als bij account_tokens: een
  -- gelekte export mag geen werkende links bevatten. Zie hashToken() in
  -- src/lib/token.js.
  confirm_hash    TEXT NOT NULL UNIQUE,
  confirm_expires TEXT NOT NULL,
  confirmed_at    TEXT,

  -- Pas gevuld op het moment dat de wijziging doorgaat: vóór de bevestiging is er
  -- niets om ongedaan te maken.
  undo_hash       TEXT UNIQUE,
  undo_expires    TEXT,
  undone_at       TEXT,

  -- Waar het verzoek vandaan kwam, gehasht. Geen ip-adres in platte tekst — zelfde
  -- regel als in rate_limits. Dit is er voor het geval Lucas ooit moet nagaan of
  -- twee verzoeken van dezelfde kant kwamen.
  request_ip_hash TEXT,

  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Waarop een klik wordt opgezocht. Beide kenmerken zijn al UNIQUE, dus die dekken
-- zichzelf; deze index is voor de andere vraag: heeft deze klant een verzoek open
-- staan? Dat wordt bij elk bezoek aan de gegevenspagina gesteld.
CREATE INDEX IF NOT EXISTS idx_emailchg_open
  ON email_changes(customer_id, created_at)
  WHERE confirmed_at IS NULL;
