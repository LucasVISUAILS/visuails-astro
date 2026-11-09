-- ══════════════════════════════════════════════════════════════════════════════
-- 0070 · DE STUDIOBRIEF VANUIT /admin
-- ══════════════════════════════════════════════════════════════════════════════
--
-- 9 november 2026 (ronde 92). Alleen toevoegend: één kolom en één nieuwe tabel.
-- Lucas: "als een klant zich aanmeldt voor de nieuwsbrief heb ik dan een systeem
-- waardoor hij automatisch aan een lijst wordt toegevoegd waar ik een nieuwsbrief
-- naartoe kan sturen vanuit VISUAILS en deze mails in kan plannen in een schema en
-- als een klant onderaan de mail op afmelden klikt hij hier automatisch uitgehaald
-- wordt." Zijn keuze: een scherm in /admin (/admin/studiobrief).
--
-- subscribers.unsubscribed_at — wanneer Resend ons liet weten dat dit adres zich
-- afmeldde (de webhook contact.updated met unsubscribed: true, of contact.deleted),
-- of wanneer Lucas het in /admin met de hand afmeldde. Leeg = actief. De rij blijft
-- staan: zo staat het in de privacyverklaring ("bewaren we alleen het adres met de
-- vermelding dat je geen mail meer wilt"). Zie src/lib/studiobriefBeheer.js.
--
-- studiobrieven — elke brief die in /admin is opgesteld: het concept (de velden
-- waaruit hij gemaakt is, zodat je hem weer opent), de HTML zoals hij naar Resend
-- ging, het id van de broadcast bij Resend en de stand. Geen persoonsgegevens: wie
-- hem kreeg, weet Resend (het segment), niet deze tabel.
--
-- Veilig om twee keer te draaien (scripts/migrate.mjs slaat een bestaande kolom over).

ALTER TABLE subscribers ADD COLUMN unsubscribed_at TEXT;

CREATE TABLE IF NOT EXISTS studiobrieven (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  taal           TEXT    NOT NULL DEFAULT 'nl' CHECK (taal IN ('nl', 'en')),
  onderwerp      TEXT    NOT NULL DEFAULT '',
  voorvertoning  TEXT    NOT NULL DEFAULT '',
  kop            TEXT    NOT NULL DEFAULT '',
  tekst          TEXT    NOT NULL DEFAULT '',
  knop_tekst     TEXT    NOT NULL DEFAULT '',
  knop_link      TEXT    NOT NULL DEFAULT '',
  html           TEXT,
  resend_id      TEXT,
  status         TEXT    NOT NULL DEFAULT 'concept'
                   CHECK (status IN ('concept', 'gepland', 'verstuurd', 'fout')),
  fout           TEXT,
  gepland_op     TEXT,
  verstuurd_op   TEXT,
  gemaakt_op     TEXT    NOT NULL DEFAULT (datetime('now')),
  bijgewerkt_op  TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_studiobrieven_status ON studiobrieven(status, gepland_op);
