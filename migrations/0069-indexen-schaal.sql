-- 0069 — drie indexen voor de schaal (9 november 2026, ronde 91, C07).
--
-- Gemeten met 5 000 bestellingen, 2 000 klanten en 20 000 bestanden
-- (91/werk/c/c07-schaal.mjs): elke keer dat /admin opent, lazen de revisie-inbox,
-- zijn telling en de Nu-doen-lijst de hele files-tabel (SCAN f, drie keer
-- 20 000 rijen), en zocht creditSaldo() per abonnee de hele subscriptions-tabel
-- af. D1 rekent gelezen rijen: het gratis plan heeft er 5 miljoen per dag, en
-- 60 000 per keer /admin openen is dan ± 80 keer per dag. Alleen indexen: er
-- verandert niets aan wat er staat of wat een query teruggeeft.
CREATE INDEX IF NOT EXISTS idx_files_revisie ON files (reviewed_at)
  WHERE review_state = 'revision_requested' AND superseded_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_revreq_file ON revision_requests (file_id);
CREATE INDEX IF NOT EXISTS idx_subs_customer ON subscriptions (customer_id);
