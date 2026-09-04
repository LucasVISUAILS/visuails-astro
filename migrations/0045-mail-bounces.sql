-- VISUAILS — mail die niet aankwam, 4 september 2026 (doorlichting §3.7).
--
-- Resend zegt 200 zodra een mail is aangenomen; of hij aankwam, wist /admin
-- niet. De webhook op /api/webhook/resend zet hier elke bounce en spamklacht
-- neer, en /admin toont een rode regel bij elke bestelling en klant met dat
-- adres. `event_id` is Svix' svix-id: een tweede aflevering van dezelfde
-- gebeurtenis is geen tweede rij. `resolved_at` is voor later — een adres dat
-- gecorrigeerd is hoort zijn vlag te verliezen; nu nog met de hand.
CREATE TABLE IF NOT EXISTS mail_bounces (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id     TEXT NOT NULL UNIQUE,
  email        TEXT NOT NULL,                 -- kleingemaakt
  kind         TEXT NOT NULL,                 -- 'bounced' | 'complained'
  email_id     TEXT,                          -- Resends id van de mail
  subject      TEXT,
  bounce_type  TEXT,                          -- bijv. 'Permanent/General'
  message      TEXT,
  occurred_at  TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at  TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_mail_bounces_email ON mail_bounces(email, resolved_at);
