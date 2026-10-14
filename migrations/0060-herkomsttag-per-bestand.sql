-- ══════════════════════════════════════════════════════════════════════════════
-- 0060 · DRAAGT DIT GELEVERDE BESTAND DE HERKOMSTTAG?
-- ══════════════════════════════════════════════════════════════════════════════
--
-- 8 oktober 2026, punt 4.01. Alleen toevoegend.
--
-- De Worker zet de herkomsttag (IPTC DigitalSourceType in de XMP) sinds vandaag
-- zelf in elke jpg en png die in /admin binnenkomt (src/lib/xmp.js). Per bestand
-- onthoudt hij of het opgeslagen bestand de tag draagt, zodat het bord in /admin
-- per beeld de chip "AI-tag" kan tonen, of "geen AI-tag" bij webp, avif of een
-- bestand dat niet te lezen was.
--
--   ai_tag   1 = draagt de tag · 0 = beeld zonder tag · NULL = onbekend (een
--            upload van vóór deze migratie, of geen beeld: video, pdf, zip)
--
-- Zolang deze migratie niet gedraaid is, wordt de tag gewoon geschreven; alleen
-- de chip op het bord ontbreekt dan (admin.js valt terug op een insert zonder
-- deze kolom).

ALTER TABLE files ADD COLUMN ai_tag INTEGER;
