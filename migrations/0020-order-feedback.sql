-- ─────────────────────────────────────────────────────────────────────────────
-- 0020 · TEVREDENHEID, REVIEWS EN TESTIMONIALS
--
-- Uit reviewverzamelingspecificatie.md. Fase 1 van §4: de tevredenheidsvraag en
-- de routing erna. De herinnering en het testimonialblok op de site zijn iteratie
-- twee, maar hun kolommen staan hier al — een tweede ALTER voor twee velden is
-- duurder dan twee kolommen die even leeg blijven.
--
-- ── WAAROM EEN EIGEN TABEL EN GEEN KOLOMMEN OP `orders` ──────────────────────
--
-- De specificatie noemt deze velden bij naam, waaronder `review_requested_at`.
-- Die kolom BESTAAT AL op `orders`, uit migratie 0018, en betekent daar iets
-- volstrekt anders: het moment waarop een mens naar de btw-verlegging van een
-- order moest kijken. Sterker nog, het hele `review_*`-voorvoegsel op `orders` is
-- sinds 0018 van die fraude- en btw-controle: review_state, review_reason,
-- review_deadline, reviewed_at, reviewed_by.
--
-- Er een tweede betekenis op stapelen zou de duurste soort verwarring opleveren:
-- twee kolommen die hetzelfde heten, in dezelfde tabel, waarvan de ene over de
-- Belastingdienst gaat en de andere over Google. 0018 voert dat argument zelf al
-- (zie de noot daar over "een tweede kolom die claimt waar deze order staat").
--
-- Dus een eigen tabel. Dat lost meer op dan de naamruzie:
--   · `orders` heeft al zestig kolommen; dit zijn er negen die alleen bestaan als
--     een klant iets heeft ingevuld, en die horen niet in elke SELECT mee te
--     reizen;
--   · een rij die pas ontstaat als er iets is, maakt "nog niet gevraagd" en "wel
--     gevraagd, niets ingevuld" van elkaar te onderscheiden zonder derde toestand;
--   · en het maakt het weggooien van een testimonial één DELETE, in plaats van
--     negen kolommen die je met de hand op NULL moet zetten.
--
-- ── ÉÉN RIJ PER BESTELLING ───────────────────────────────────────────────────
-- UNIQUE op order_id. De vraag wordt één keer gesteld per bestelling en het
-- antwoord kan worden bijgewerkt (een klant die eerst een 3 gaf en na een revisie
-- een 5 wil geven), niet opgeteld. Een geschiedenis van scores is niet gevraagd
-- en zou de "één keer vragen, dan stoppen"-regel uit §3 in de weg zitten.
--
-- ── WAT HIER MET OPZET NIET IN STAAT ─────────────────────────────────────────
--
-- Geen kolom voor "welke review de klant achterliet". Dat kunnen we niet weten:
-- Google en Trustpilot vertellen ons niet of iemand na de klik iets heeft
-- geschreven, en een kolom die suggereert dat we het weten is een kolom die ooit
-- als bewijs wordt gebruikt. `platforms_clicked` zegt precies wat het is: er is op
-- een knop geklikt. Niets meer.
--
-- Geen beloning, geen kortingcode, geen credit — §3 van de specificatie verbiedt
-- dat, en het is in de EU een oneerlijke handelspraktijk zodra het de
-- onafhankelijkheid van de review raakt. Er is dus ook geen veld om het in te
-- administreren, en dat is bewust: een ontbrekend veld is de goedkoopste manier om
-- een verboden feature niet per ongeluk te bouwen.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS order_feedback (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id            INTEGER NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  customer_id         INTEGER REFERENCES customers(id) ON DELETE SET NULL,

  -- 1 t/m 5. Geen 0 en geen NULL-als-nul: een rij bestaat pas als er een score is.
  score               INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),

  -- Het privéantwoord op "wat kunnen we beter doen?" bij een lage score. Gaat naar
  -- de studio en nergens anders heen. Mag leeg zijn — een 2 zonder uitleg is nog
  -- steeds een 2, en iemand dwingen te typen voordat hij mag klagen is precies hoe
  -- je niet te weten komt dat het misging.
  private_note        TEXT,

  -- Welke publieke knop is aangeklikt. Een komma-lijst uit een vaste verzameling
  -- ('google', 'trustpilot'), zoals customer_style_locks.channels — kort, in onze
  -- eigen code gedefinieerd, en bij het lezen opnieuw gefilterd.
  platforms_clicked   TEXT,

  -- ── DE TESTIMONIAL ────────────────────────────────────────────────────────
  -- Drie velden en twee vinkjes, en de twee vinkjes zijn niet hetzelfde:
  --   consent  = de klant geeft ons toestemming dit openbaar te tonen;
  --   approved = de studio heeft besloten het te tonen.
  -- Beide moeten waar zijn voordat er iets op de site komt. Alleen `consent`
  -- publiceren zou §2 stap 4 overtreden; alleen `approved` zou §3 overtreden — je
  -- mag een review van Google niet zomaar op je eigen site overnemen, en dat geldt
  -- net zo voor tekst die iemand hier achterliet zonder los akkoord.
  testimonial_text    TEXT,
  testimonial_name    TEXT,
  testimonial_consent INTEGER NOT NULL DEFAULT 0,
  testimonial_approved INTEGER NOT NULL DEFAULT 0,

  -- Wanneer de vraag is gesteld, en wanneer de eenmalige herinnering is verstuurd.
  -- Die tweede is een idempotentiestempel in dezelfde vorm als delivery_mailed_at
  -- en redelivery_mailed_at: staat er iets, dan is hij verstuurd en komt er per §3
  -- geen tweede.
  asked_at            TEXT NOT NULL DEFAULT (datetime('now')),
  reminder_sent_at    TEXT,
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Voor het overzicht in de admin: welke testimonials wachten op goedkeuring.
-- Partieel, want een rij zonder toestemming hoort daar niet in te staan.
CREATE INDEX IF NOT EXISTS idx_feedback_pending
  ON order_feedback(testimonial_approved, asked_at)
  WHERE testimonial_consent = 1;

-- Voor het testimonialblok op de site: de goedgekeurde set, nieuwste eerst.
CREATE INDEX IF NOT EXISTS idx_feedback_live
  ON order_feedback(updated_at)
  WHERE testimonial_approved = 1;

-- Voor de herinnering van iteratie twee: wie is gevraagd, heeft niets gedaan en
-- heeft nog geen herinnering gehad. LET OP: er is nog geen taak die dit uitvoert.
-- Dit project is Cloudflare PAGES en heeft geen scheduled handler — zie de noot
-- onderaan 0018 over dezelfde ontbrekende taak voor payment_deadline. De index
-- kost niets en staat klaar; de taak is een aparte beslissing.
CREATE INDEX IF NOT EXISTS idx_feedback_reminder
  ON order_feedback(asked_at)
  WHERE reminder_sent_at IS NULL AND platforms_clicked IS NULL AND testimonial_text IS NULL;
