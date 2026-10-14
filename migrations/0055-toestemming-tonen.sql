-- ══════════════════════════════════════════════════════════════════════════════
-- 0055 · TOESTEMMING OM ECHTE BESTELLINGEN TE LATEN ZIEN
-- ══════════════════════════════════════════════════════════════════════════════
--
-- 8 oktober 2026, punt 10.05 (met 3.05). Alleen toevoegend.
--
-- Op het afrondscherm (privélink en Studio) staat één toestemmingsblok met twee
-- vrijwillige keuzes: je tekst, en je beelden (de geleverde beelden en de
-- aangeleverde productfoto's), elk "met merknaam", "zonder merknaam" of "liever
-- niet". Het vervangt het losse vinkje "je mag dit met mijn naam op de site
-- zetten" (testimonial_consent blijft bestaan en staat op 1 zodra de tekst
-- getoond mag worden, met of zonder merknaam — zo blijven /admin/testimonials en
-- scripts/testimonials.mjs werken zoals ze werkten).
--
-- Foto's waarop iemand het product draagt (vak 'worn') vallen er nooit onder: de
-- klant kan geen toestemming geven voor de persoon op de foto.
--
--   toon_tekst      'merk' | 'zonder' | 'nee'  (NULL = nooit gevraagd)
--   toon_beelden    'merk' | 'zonder' | 'nee'  (NULL = nooit gevraagd)
--   toestemming_at  wanneer de klant de keuze maakte
--   ingetrokken_at  wanneer de klant zijn toestemming introk; daarna haalt Lucas
--                   zijn beelden binnen een week van site en social (V30-2 = a)
--
-- Publiceren blijft een aparte stap van Lucas: /admin/testimonials heeft een
-- filter "mag getoond worden", en niets hiervan zet zelf iets op de site.
--
-- Zolang deze migratie niet gedraaid is, toont het afrondscherm het oude vinkje
-- niet meer maar slaat het de keuze ook niet op (feedback.js vangt de fout en
-- logt hem), en zegt /admin/testimonials dat migratie 0055 nodig is.

ALTER TABLE order_feedback ADD COLUMN toon_tekst TEXT;
ALTER TABLE order_feedback ADD COLUMN toon_beelden TEXT;
ALTER TABLE order_feedback ADD COLUMN toestemming_at TEXT;
ALTER TABLE order_feedback ADD COLUMN ingetrokken_at TEXT;
