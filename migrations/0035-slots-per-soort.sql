-- ═══════════════════════════════════════════════════════════════════════════════
-- 0035 · SLOTS PER SOORT, MET EEN VERVALDATUM DIE UIT DE MAAND ZELF VOLGT
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- ── WAT ER MIS WAS AAN ÉÉN TELLER ───────────────────────────────────────────
--
-- Lucas, 29 augustus 2026: *"Bezoekers gaven aan er niks van te snappen."* En
-- terecht: het scherm zei "12 van 12 over" en liet in het midden waarvan. Twaalf
-- foto's? Twaalf kledingstukken? Twaalf bestellingen?
--
-- `subscription_months` had daar al de helft van een antwoord op staan. Er zitten
-- TWEE tellerparen in — `granted/used` voor producten en `clips_granted/clips_used`
-- voor video — met een noot erboven die precies uitlegt waarom: *"een clip is geen
-- product en een product is geen clip"*. Dat is de goede gedachte, alleen met twee
-- soorten in kolomnamen gegoten. Zodra er een derde bij komt, en dat wil Lucas
-- (hooks, motion, lifestyle video), moet er een migratie per soort komen.
--
-- Deze tabel is diezelfde gedachte met de soort als GEGEVEN in plaats van als
-- kolomnaam.
--
-- ── DE VERVALDATUM IS GEEN KOLOM ────────────────────────────────────────────
--
-- Lucas' regel: wat je een maand niet gebruikt, mag de maand erna nog, daarna
-- vervalt het — *"net als belastingaangifte die je uiterlijk het einde van de
-- volgende maand moet inleveren"*. Voor een plan van vijf betekent dat maximaal
-- tien openstaand.
--
-- Dat maximum staat hier nergens, en dat is met opzet: een rij IS de toekenning
-- van één maand, en wanneer hij vervalt volgt uit `month` plus het venster van de
-- termijn (rolloverMonths() in src/data/plans.js — 1 maandelijks, 3 jaarlijks).
-- Er kunnen dus nooit meer maanden tegelijk meetellen dan dat venster toelaat,
-- en het dak bewaakt zichzelf. Geen kolom voor de vervaldatum, geen kolom voor
-- het maximum, en geen nachtelijke taak die verlopen slots opruimt — want er valt
-- niets op te ruimen. Een oude rij is gewoon geschiedenis.
--
-- ── DE UNIEKE SLEUTEL IS DE IDEMPOTENTIE ────────────────────────────────────
--
-- Zelfde reden als bij idx_submonths_unique in migratie 0030: Mollie levert
-- dezelfde melding desnoods drie keer af. Met UNIQUE(abonnement, maand, soort)
-- valt de tweede toekenning om op de index in plaats van de klant zijn slots
-- dubbel te geven.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS subscription_slots (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  subscription_id  INTEGER NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  month            TEXT NOT NULL,              -- 'YYYY-MM'
  -- Welke soort dit slot koopt: 'complete', 'catalog', 'lifestyle',
  -- 'video-motion', 'hooks'. Vrije tekst en geen CHECK: de lijst leeft in
  -- src/data/plans.js en een nieuwe soort hoort geen migratie te kosten. Wat er
  -- WEL op staat is de bewaking in code — assertPlans() weigert een plan met een
  -- soort die de prijstabel niet kent.
  kind             TEXT NOT NULL,
  granted          INTEGER NOT NULL DEFAULT 0,
  used             INTEGER NOT NULL DEFAULT 0,
  -- Dezelfde betaling als de rij in subscription_months waar deze toekenning bij
  -- hoort. Nullable om dezelfde reden: een handmatig toegekende maand heeft er geen.
  payment_id       TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_subslots_unique
  ON subscription_slots(subscription_id, month, kind);

-- Voor het saldo: alle levende maanden van één abonnement, oudste eerst. Dat is
-- ook de volgorde waarin ze verbruikt worden — zie de noot bij verbruikSlot().
CREATE INDEX IF NOT EXISTS idx_subslots_saldo
  ON subscription_slots(subscription_id, month);

-- ── EN DE WACHTRIJ KRIJGT EEN SOORT EN EEN MOMENT ───────────────────────────
--
-- `plan_queue` had naam, notitie en foto's. Twee dingen erbij:
--
--   `kind`      welke teller dit item aanspreekt. Zonder dit weet niets welk
--               slot er afgaat, en dan is een lijst met een catalogset en een
--               video weer één ononderscheiden hoop.
--
--   `locked_at` het moment waarop de klant op vastzetten drukte. Dit is het
--               hart van Lucas' model: *"op confirm klikken waardoor ze een slot
--               hebben gelockt"*. Zolang deze leeg is, is het item een CONCEPT —
--               het staat op de lijst, het kost niets, en het gaat niet mee.
--
-- WAAROM DE DEADLINE OP DIT MOMENT ZIT EN NIET OP DE LEVERING. Zelfde reden als
-- bij een aangifte: je moet hem op tijd INDIENEN, niet op tijd beoordeeld zijn.
-- Zat de deadline op het maken, dan zou een klant met tien slots en één week van
-- vijf de helft verliezen omdat ONZE agenda vol zat. Met `locked_at` als
-- ijkpunt is het verbruik geboekt zodra de klant klaar is, en mag het werk
-- gerust doorlopen naar de week erna.
ALTER TABLE plan_queue ADD COLUMN kind TEXT;
ALTER TABLE plan_queue ADD COLUMN locked_at TEXT;

-- Alles wat er nu op een lijst staat is aangemaakt onder het oude model, waarin
-- er maar één soort was en er geen vastzetstap bestond. Dat blijven dus
-- vastgezette items van de soort die de plannen toen gaven.
UPDATE plan_queue SET kind = 'complete' WHERE kind IS NULL;
UPDATE plan_queue SET locked_at = created_at WHERE locked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_planqueue_soort
  ON plan_queue(customer_id, kind)
  WHERE order_id IS NULL;
