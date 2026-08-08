-- VISUAILS — 0018: de handmatige beoordeling van een btw-claim, met een spoor.
--
-- WAAROM. Uit `btwverleggingspecificatie.md`, 8 augustus 2026. De specificatie
-- vraagt om automatische verlegging bij checkout, mét bescherming tegen een
-- foutieve of frauduleuze claim. Migratie 0015 bouwde de beslissing zelf en het
-- bewijs eronder; wat ontbrak is alles wat daarna komt: een vlag die je kunt
-- opzoeken, een bevestiging van de klant, en een rem op de gevallen waar geen
-- enkele API iets kan verifiëren.
--
-- ── DRIE DINGEN DIE DEZE MIGRATIE RECHTZET ──────────────────────────────────
--
-- 1 · `vat_valid` KON GEEN "WEET IK NIET" ZEGGEN.
--
--     0015 zette `vat_valid INTEGER NOT NULL DEFAULT 0`. Daarmee zijn een
--     afgekeurd nummer en een VIES die er niet was hetzelfde getal, en dat zijn
--     twee heel verschillende dingen: bij het eerste heeft de klant iets
--     verkeerd ingevuld, bij het tweede hebben wij niets kunnen controleren.
--     Voor het tarief maakt het niet uit — beide worden 21%, dat is de
--     fail-closed regel en die blijft — maar voor de vraag "welke orders moet ik
--     nakijken" is het het hele verschil.
--
--     SQLite kan een kolom niet van NOT NULL naar nullable wijzigen. Dus komt er
--     een nieuwe kolom naast, en blijft de oude staan: rijen die al geschreven
--     zijn menen wat ze zeggen, en een migratie hoort geen geschiedenis te
--     herschrijven.
--
-- 2 · DE MARKERING BESTOND ALLEEN ALS ÉÉN REGEL IN ÉÉN MAIL.
--
--     `functions/api/order.js` schreef "Charged 21% to an EU customer who gave a
--     number we could not confirm" in de studionotificatie. Die mail komt één
--     keer voorbij en is daarna weg. Een vlag die je niet kunt opzoeken is geen
--     vlag; het is een hoop dat iemand oplette.
--
-- 3 · 0% WERD TOEGEPAST ZONDER DAT DE KLANT IETS VERKLAARDE.
--
--     Bij verlegging verschuift de btw-plicht naar de afnemer, en de
--     aansprakelijkheid voor een foutieve verlegging ligt bij de leverancier —
--     bij ons. Een vinkje waarin de klant verklaart dat het nummer van zijn
--     bedrijf is en dat het bedrijf buiten Nederland zit, is geen formaliteit:
--     het is het enige bewijs dat wij hebben dat de claim van hem komt.
--
-- ── WAT DEZE MIGRATIE NIET DOET ─────────────────────────────────────────────
--
-- Geen nieuwe `order_status`-enum. De specificatie vraagt om
-- `pending_review | awaiting_payment | paid | cancelled` als vierde statuskolom,
-- naast de bestaande `orders.status` (received → delivered) en
-- `orders.payment_status` (unpaid → paid). Drie kolommen die allemaal "waar is
-- deze order" beweren, is drie kansen dat ze het oneens zijn. In plaats daarvan:
-- één kolom `review_state` die alleen over de beoordeling gaat, en de bestaande
-- twee blijven doen wat ze doen. `payment_status` blijft `unpaid` zolang er niet
-- betaald is, want dat is waar; dat de klant nog niet MAG betalen is iets anders,
-- en dat staat in `review_state`.
--
-- LET OP BIJ HERDRAAIEN: SQLite kent geen `ADD COLUMN IF NOT EXISTS`. Deze
-- migratie is dus eenmalig. Draait hij een tweede keer, dan valt hij om op
-- "duplicate column name" en is dat het juiste antwoord.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1 · DE BEOORDELING
-- ─────────────────────────────────────────────────────────────────────────────

-- NULL          = niets aan de hand, de order loopt gewoon.
-- 'pending'     = wacht op een mens voordat er betaald kan worden.
-- 'approved'    = nagekeken en goedgekeurd; de betaallink mag eruit.
-- 'rejected'    = afgewezen; de order gaat niet door.
-- 'expired'     = de betaaltermijn na goedkeuring is verstreken.
ALTER TABLE orders ADD COLUMN review_state TEXT;

-- Waarom deze order beoordeeld moet worden. Vrije tekst, want de reden is voor
-- een mens: "niet-EU verleggingsclaim", "VIES onbereikbaar", "iDEAL bij een
-- Duits btw-nummer". Meerdere redenen worden gescheiden door "; ".
ALTER TABLE orders ADD COLUMN review_reason TEXT;

-- Wanneer de beoordeling is gevraagd, en wanneer hij binnen moet zijn. De
-- deadline is een belofte aan de klant ("binnen 24 uur"), dus staat hij in de
-- database en niet in een berekening op de pagina.
ALTER TABLE orders ADD COLUMN review_requested_at TEXT;
ALTER TABLE orders ADD COLUMN review_deadline TEXT;
ALTER TABLE orders ADD COLUMN reviewed_at TEXT;
ALTER TABLE orders ADD COLUMN reviewed_by TEXT;

-- Zodra de betaallink na goedkeuring is verstuurd: hoelang hij geldig is.
-- Bestaat naast `window_expires_at`, dat over iets anders gaat — het vrijgeven
-- van gereserveerde capaciteit bij een gewone bestelling.
ALTER TABLE orders ADD COLUMN payment_deadline TEXT;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2 · WAT DE KLANT ZELF VERKLAARDE
-- ─────────────────────────────────────────────────────────────────────────────

-- Het vinkje bij checkout, alleen aangeboden als er werkelijk 0% uit de
-- beslissing komt. 0 = niet aangevinkt of niet van toepassing.
ALTER TABLE orders ADD COLUMN vat_confirmed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN vat_confirmed_at TEXT;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3 · DRIE TOESTANDEN VOOR DE VIES-UITKOMST
-- ─────────────────────────────────────────────────────────────────────────────

-- NULL = niet gecontroleerd, of de controle is niet gelukt (timeout, storing).
-- 1    = VIES zei geldig.  0 = VIES zei ongeldig.
-- De oude `vat_valid` blijft staan en blijft geschreven worden, zodat alles wat
-- er nu op leest blijft werken.
ALTER TABLE orders ADD COLUMN vat_valid_state INTEGER;

-- Waarom de controle niet lukte, als hij niet lukte: 'timeout' | 'network' |
-- 'unavailable' | 'invalid-input'. Precies de reden die src/lib/vies.js al
-- teruggeeft, maar die tot nu toe alleen in het bewijs-JSON belandde.
ALTER TABLE orders ADD COLUMN vat_check_error TEXT;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4 · HET BETAALMIDDEL, ACHTERAF
-- ─────────────────────────────────────────────────────────────────────────────

-- De specificatie wil iDEAL gebruiken als kruiscontrole op een niet-Nederlandse
-- btw-claim. Dat kan niet op het moment dat de specificatie het plaatst: het
-- tarief staat vast vóórdat de klant op de betaalpagina van Mollie een middel
-- kiest. Wat wél kan is het middel achteraf vastleggen en de order markeren als
-- het niet klopt met de claim — en, beter, iDEAL niet aanbieden bij een order
-- die op verlegging staat. Zie src/lib/mollie.js.
ALTER TABLE orders ADD COLUMN payment_method TEXT;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5 · INDEXEN
-- ─────────────────────────────────────────────────────────────────────────────

-- Het overzicht "wat moet ik nakijken" is één query op één index.
CREATE INDEX IF NOT EXISTS idx_orders_review
  ON orders (review_state, review_deadline) WHERE review_state IS NOT NULL;

-- De geplande taak zoekt orders waarvan de betaaltermijn verstreken is. Zonder
-- deze index is dat een volledige tabelscan, elk uur.
CREATE INDEX IF NOT EXISTS idx_orders_payment_deadline
  ON orders (payment_deadline) WHERE payment_deadline IS NOT NULL;
