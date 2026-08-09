-- ─────────────────────────────────────────────────────────────────────────────
-- 0021 · FACTUREN
--
-- De site belooft op vijf plekken een factuur — /terms §9, de btw-noot op
-- /pricing, de FAQ, de bevestigingsmail, en /demo zegt zelfs "de factuur volgt
-- automatisch". Er werd er nooit één gemaakt. Dit is de administratie eronder.
--
-- ── WAAROM EEN EIGEN TELLER EN GEEN AUTOINCREMENT ────────────────────────────
--
-- Een factuurnummerreeks mag geen gaten hebben. Dat is geen nette gewoonte maar
-- een eis: de Belastingdienst leest een gat als een verdwenen factuur, en de
-- vraag "waar is 0007" is er één die je niet met "die is nooit gelukt" afdoet.
--
-- AUTOINCREMENT op de facturentabel geeft die garantie NIET. Een INSERT die
-- terugdraait verbruikt het nummer alsnog, en dan mist er één. Vandaar een
-- expliciete teller per jaar, en de regel eromheen:
--
--   Een nummer wordt pas uitgegeven als we zeker weten dat we het gaan
--   gebruiken, en zodra het is uitgegeven wordt het NOOIT teruggegeven.
--
-- Mislukt het maken van de pdf nadat het nummer is uitgedeeld, dan blijft de rij
-- staan met status 'pending' en wordt hij later met HETZELFDE nummer opnieuw
-- gerenderd. Dat is de enige manier om zowel gaten als dubbele nummers uit te
-- sluiten: het nummer is van de factuur, niet van de poging.
--
-- ── HOE HET ATOMAIR BLIJFT ───────────────────────────────────────────────────
--
-- `UPDATE … SET last_number = last_number + 1 … RETURNING last_number` is één
-- statement, en SQLite voert dat als één transactie uit. Twee gelijktijdige
-- bestellingen kunnen dus niet hetzelfde nummer krijgen — de tweede leest de
-- waarde die de eerste al heeft verhoogd. Lezen-dan-schrijven in twee stappen
-- zou precies dat wel kunnen, en dat is de klassieke manier om twee facturen
-- met nummer 0042 te maken.
--
-- ── PER JAAR OPNIEUW BEGINNEN ────────────────────────────────────────────────
--
-- VIS-2026-0001. Een reeks per jaar is in Nederland gebruikelijk en houdt de
-- nummers leesbaar; de eis is alleen dat de reeks binnen een jaar aansluit.
-- Daarom is `year` de sleutel van de teller en niet één rij voor altijd.
--
-- ── WAT ER NIET IN STAAT ─────────────────────────────────────────────────────
--
-- Geen bedragen die al op `orders` staan. Een factuur is een momentopname, maar
-- de cijfers zijn dezelfde als die van de bestelling en twee plekken met een
-- bedrag gaan ooit uiteenlopen. Wat hier WEL staat is `snapshot_json`: de
-- volledige invoer waaruit de pdf is gemaakt, zodat een factuur van vorig jaar
-- opnieuw te renderen is zoals hij toen was — ook als de prijzen inmiddels
-- veranderd zijn. Dat is wat een factuur van een berekening onderscheidt.
-- ─────────────────────────────────────────────────────────────────────────────

-- De teller. Eén rij per jaar, en niets anders.
CREATE TABLE IF NOT EXISTS invoice_series (
  year        INTEGER PRIMARY KEY,
  last_number INTEGER NOT NULL DEFAULT 0,
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS invoices (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Het nummer zoals het op papier staat: 'VIS-2026-0001'. UNIQUE, want twee
  -- facturen met hetzelfde nummer is een zwaardere fout dan een ontbrekende.
  number      TEXT    NOT NULL UNIQUE,
  year        INTEGER NOT NULL,
  seq         INTEGER NOT NULL,

  -- Eén factuur per bestelling. Moet er ooit een creditnota bij, dan is dat een
  -- eigen rij met een eigen nummer en een verwijzing hiernaartoe — niet een
  -- tweede factuur op dezelfde bestelling.
  order_id    INTEGER NOT NULL UNIQUE REFERENCES orders(id) ON DELETE RESTRICT,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,

  -- 'pending'  het nummer is uitgegeven, de pdf nog niet gemaakt of mislukt
  -- 'issued'   de pdf staat in R2 en is voor de klant op te halen
  -- 'void'     ingetrokken; het nummer blijft bestaan, met een reden
  status      TEXT    NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'issued', 'void')),
  void_reason TEXT,

  -- De sleutel in R2. Leeg zolang de pdf niet bestaat.
  pdf_key     TEXT,
  pdf_bytes   INTEGER,

  -- De volledige invoer van renderInvoicePdf(), zodat dezelfde factuur later
  -- byte-identiek opnieuw te maken is. Zie de noot hierboven.
  snapshot_json TEXT NOT NULL,

  lang        TEXT    NOT NULL DEFAULT 'nl',
  issued_at   TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),

  -- ON DELETE RESTRICT hierboven is met opzet strenger dan de rest van dit
  -- schema: een bestelling met een factuur mag niet zomaar verdwijnen, want dan
  -- verwijst een nummer in de boekhouding naar niets. Wie hem echt weg wil, gaat
  -- eerst langs de creditnota.
  CHECK (status <> 'issued' OR pdf_key IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_invoices_order  ON invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_series ON invoices(year, seq);
-- Voor het overzicht in VISUAILS Studio: de facturen van één klant, nieuwste eerst.
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id, created_at);
-- Voor de hersteltaak: welke nummers wachten nog op een pdf.
CREATE INDEX IF NOT EXISTS idx_invoices_pending ON invoices(created_at) WHERE status = 'pending';
