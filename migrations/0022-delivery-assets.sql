-- VISUAILS — migratie 0022, 9 augustus 2026. Wat de klant ziet is niet wat hij krijgt.
--
-- Lucas: *"Ik wil dat klanten de foto's apart kunnen zien en een revisie per
-- foto kunnen aanvragen maar het echte wat ze krijgen is een map met alle
-- bestanden erin, de zichtbare foto's zijn dus niet downloadbaar in het portaal
-- en puur voor revisies aanvragen. Alleen de map (het eindresultaat) kan
-- gedownload worden en ik ga ervoor zorgen dat de klant in die map .png, .jpg en
-- .webp bestanden krijgt alles gesorteerd in mappen."*
--
-- Daarmee splitst één begrip in twee, en dat is precies waarom hier een tabel
-- bij komt in plaats van een kolom.
--
--   EEN FOTO is de eenheid waar de klant OVER PRAAT. Eén beeld van één product,
--   één keer goed te keuren, één revisie op te vragen. Dat is een rij in `files`
--   en dat blijft zo — review_state, review_note, product_key, shot, alles wat
--   er al hangt, hangt aan het beeld en niet aan een bestandsformaat.
--
--   EEN BESTAND is wat hij MEENEEMT. Dezelfde foto als png, als jpg en als
--   webp, want zijn webshop wil iets anders dan zijn drukker. Dat zijn drie
--   objecten in R2 die niets eigen hebben om over te zeggen.
--
-- ── DE AFGEWEZEN VARIANT: DRIE FILES-RIJEN PER FOTO ─────────────────────────
--
-- Dat was de kleinste wijziging: geen nieuwe tabel, `filename` zegt al welk
-- formaat het is. En het is fout, om een reden die niet over netheid gaat maar
-- over wat de klant dan te zien krijgt: drie rijen betekent drie tegels om goed
-- te keuren voor één foto. Wie de png goedkeurt en de webp vergeet, heeft een
-- bestelling die half af is zonder dat iemand een fout maakte. `review_state`
-- hoort bij het BEELD; zodra hij bij een bestand hoort, kan hij tegenstrijdig
-- zijn met zichzelf.
--
-- ── WAAROM NIET DRIE KOLOMMEN OP files ─────────────────────────────────────
--
-- `png_key`, `jpg_key`, `webp_key`. Werkt vandaag en is morgen een migratie:
-- avif staat al in UPLOAD_TYPES en tiff vraagt de eerste drukker die belt. Een
-- rij per formaat kost niets extra en een vierde formaat is dan een INSERT in
-- plaats van een ALTER TABLE plus vier plekken in de code die de kolomnaam
-- kennen.
--
-- ── EN preview_key WORDT NU ECHT GEVULD ─────────────────────────────────────
--
-- files.preview_key bestaat sinds migratie 0001 en is in de hele geschiedenis
-- van dit project nooit door één regel code geschreven. Gevolg: elke
-- `preview_key || r2_key` in portal.js en account.js viel altijd terug op het
-- volledige leveringsbestand. Het scherm dat "alleen om te beoordelen" heet,
-- serveerde de levering — rechtermuisknop, opslaan, klaar.
--
-- Daarom is het weghalen van de downloadknop alléén geen maatregel maar een
-- gordijn. scripts/deliver.mjs vult preview_key vanaf nu met een verkleind
-- beeld (1400px lange zijde, webp): groot genoeg om een krom naadje of een
-- verkeerde kleur te zien, te klein om te plaatsen. Geen watermerk — de klant
-- heeft betaald, en een watermerk maakt beoordelen op kleur juist moeilijker.
--
-- Deze migratie voegt daar niets aan toe; de kolom stond er al. Het staat hier
-- omdat de tabel hieronder alleen te begrijpen is samen met die kolom: preview
-- is om te KIJKEN, assets zijn om te KRIJGEN, en r2_key is de master die wij
-- bewaren.
--
-- ── OUDE LEVERINGEN HEBBEN GEEN ASSETS, EN DAT MAG ─────────────────────────
--
-- Elke levering van voor vandaag heeft geen rij in deze tabel. Die bestellingen
-- moeten blijven werken, dus valt de zipbouwer terug op files.r2_key met een
-- platte naam — precies het archief dat hij tot vandaag maakte. Zie de noot bij
-- deliveryEntries() in src/lib/delivery.js. Er wordt hier dus NIETS
-- teruggevuld: een asset verzinnen voor een bestand dat nooit is omgezet, is
-- een rij die zegt dat er een png bestaat die er niet is.

CREATE TABLE IF NOT EXISTS file_assets (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,

  -- ON DELETE CASCADE en niet RESTRICT: een asset is geen zelfstandig feit maar
  -- een verschijning van een beeld. Gaat het beeld weg, dan is er niets om te
  -- bewaren. (Vergelijk invoices.order_id, dat wél RESTRICT is: een factuur is
  -- een verplichting en overleeft de bestelling met opzet.)
  file_id     INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,

  -- 'png' | 'jpg' | 'webp' — kleine letters, zonder punt. De CHECK staat er
  -- omdat deze waarde een MAPNAAM wordt in de zip: zonder grens is één typefout
  -- in een script een map die 'PNG ' heet met een spatie erachter, en dat ziet
  -- niemand tot een klant het meldt. Een vierde formaat is een nieuwe migratie
  -- met een ruimere CHECK, en dat is de bedoeling: dan kijkt er iemand naar.
  format      TEXT NOT NULL CHECK (format IN ('png', 'jpg', 'webp')),

  r2_key      TEXT NOT NULL,
  bytes       INTEGER,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),

  -- Eén formaat per beeld, één keer. Dit is de regel die de zip beschermt: twee
  -- png's voor hetzelfde beeld zijn twee bestanden met dezelfde naam in dezelfde
  -- map, en wat een unzipper daarmee doet verschilt per unzipper. Levert het
  -- script hetzelfde formaat opnieuw, dan is dat een vervanging (INSERT OR
  -- REPLACE) en geen tweede rij.
  UNIQUE (file_id, format)
);

-- De enige vraag die deze tabel krijgt: geef alle assets van deze beelden, zodat
-- de zip gebouwd kan worden. Altijd per file_id, altijd allemaal.
CREATE INDEX IF NOT EXISTS idx_file_assets_file ON file_assets (file_id);
