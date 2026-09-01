-- ═══════════════════════════════════════════════════════════════════════════
-- EEN SLOT KRIJGT ZIJN EIGEN TWEE DAGEN — 31 augustus 2026
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Lucas: "Een klant kan wanneer hij een slot gebruikt in het abonnement niet de
-- komende 2 dagen kiezen. Alleen na die 2 dagen kan hij een venster inplannen
-- waar hij de gewenste leverdatum kan selecteren. De klant kan ook kiezen voor
-- 'Zo snel mogelijk'."
--
-- Tot vandaag had een wachtrij-item geen tijd. Het abonnement had één
-- `window_day` — een dag van de maand — en alles wat vastgezet was, ging mee in
-- die ene week. Dat is precies één afspraak per maand voor een klant die er
-- twintig producten in kan hebben.
--
-- DRIE KOLOMMEN EN GEEN TABEL. Een aparte planningstabel zou een tweede plek
-- maken waar staat wanneer iets gebeurt, en dan is er een dag waarop de twee iets
-- anders zeggen. Het item ZELF draagt zijn dagen.
--
-- `asap` STAAT OP 1 EN DAT IS DE STANDAARD, NIET EEN LEGE WAARDE. Wie niets kiest,
-- kiest zo snel mogelijk: dat is voor de meeste maanden het snelste antwoord (de
-- wachtrij levert 2 tot 4 dagen en mag dus lánden op een dag die niemand kan
-- reserveren) en het houdt dagen vrij die anders vastgehouden worden door iemand
-- die geen datum nodig had. Een bestaand item krijgt daarmee precies wat het
-- vandaag al is: iets wat we oppakken zodra het kan.
--
-- WAT DE POORT HIERVAN ZIET staat in src/lib/agenda.js: alleen een VASTGEZET item
-- met dagen houdt die dagen bezet. Een concept telt niet mee — vastzetten is wat
-- een slot kost, en zonder die regel kan één klant de agenda dichtzetten met
-- plannen die hij nooit uitvoert.

ALTER TABLE plan_queue ADD COLUMN window_start TEXT;
ALTER TABLE plan_queue ADD COLUMN window_end   TEXT;
ALTER TABLE plan_queue ADD COLUMN asap         INTEGER NOT NULL DEFAULT 1;

-- Dezelfde index als orders(window_start): de poort vraagt per dag wie er staat,
-- en dat is een bereikvraag over deze kolom.
CREATE INDEX IF NOT EXISTS idx_plan_queue_window
  ON plan_queue(window_start) WHERE window_start IS NOT NULL;
