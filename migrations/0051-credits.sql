-- ══════════════════════════════════════════════════════════════════════════════
-- 0051 · VAN SLOTS PER SOORT NAAR ÉÉN CREDITSALDO
-- ══════════════════════════════════════════════════════════════════════════════
--
-- 19 september 2026. Lucas: "In visuails studio abonnementen kan de klant nog
-- kiezen voor complete bundel terwijl deze niet meer bestaat (…) sommige stylen
-- nemen meer slots/credits in (…) maar de klant moet wel gemiddeld goedkoper uit
-- zijn dan wanneer iemand losse bestellingen plaatst."
--
-- De tabel en de doorrekening staan in src/data/pricing.js bij SERVICE_CREDITS;
-- waarom dit GEEN nieuwe tabel is, staat in src/lib/slots.js bij CREDIT_KIND.
-- Kort: `subscription_slots` heeft al precies de goede vorm — een rij per maand
-- met granted/used, een unieke sleutel tegen dubbele toekenning, en een UPDATE
-- met zijn eigen voorwaarde. Alleen wat er in `kind` staat verandert: niet meer
-- 'complete' of 'video-motion', maar altijd 'credits'.
--
-- ── WAT DEZE MIGRATIE DOET ───────────────────────────────────────────────────
--
-- Per (abonnement, maand) één nieuwe rij met kind 'credits', waarin granted en
-- used zijn omgerekend met de tabel uit pricing.js:
--
--      catalog 4 · lifestyle 5 · complete 9 (= 4 + 5)
--      video-motion 5 · video-lifestyle 12 · hooks 10
--
-- NIEMAND RAAKT IETS KWIJT. Een klant met 5 completes waarvan er 2 vaststaan,
-- had 3 completes over en heeft straks 27 van de 45 credits over — precies
-- hetzelfde, in een fijnere eenheid.
--
-- ── DE OUDE RIJEN BLIJVEN STAAN ──────────────────────────────────────────────
--
-- Ze worden niet verwijderd en ze tellen ook niet dubbel: creditBalans() leest
-- alleen rijen met kind 'credits'. Ze blijven staan als geschiedenis, om
-- dezelfde reden dat `payment_provider` is blijven staan toen Stripe eruit ging:
-- een rij die zegt wat er destijds is toegekend, is een rij die je bij een
-- geschil terug wilt kunnen lezen.
--
-- ── DRAAIT HIJ TWEE KEER, DAN GEBEURT ER NIETS ───────────────────────────────
--
-- De INSERT is `OR IGNORE` op idx_subslots_unique(subscription_id, month, kind),
-- dus een tweede keer draaien laat elke rij omvallen in plaats van het saldo te
-- verdubbelen. Dat is dezelfde bescherming waar grantSlots() op leunt.

INSERT OR IGNORE INTO subscription_slots (subscription_id, month, kind, granted, used, payment_id, created_at)
SELECT
  s.subscription_id,
  s.month,
  'credits',
  SUM(s.granted * CASE s.kind
        WHEN 'complete'         THEN 9
        WHEN 'catalog'          THEN 4
        WHEN 'lifestyle'        THEN 5
        WHEN 'video-motion'     THEN 5
        WHEN 'video-lifestyle'  THEN 12
        WHEN 'hooks'            THEN 10
        ELSE 0 END),
  SUM(s.used * CASE s.kind
        WHEN 'complete'         THEN 9
        WHEN 'catalog'          THEN 4
        WHEN 'lifestyle'        THEN 5
        WHEN 'video-motion'     THEN 5
        WHEN 'video-lifestyle'  THEN 12
        WHEN 'hooks'            THEN 10
        ELSE 0 END),
  MIN(s.payment_id),
  MIN(s.created_at)
FROM subscription_slots s
WHERE s.kind <> 'credits'
GROUP BY s.subscription_id, s.month
HAVING SUM(s.granted * CASE s.kind
        WHEN 'complete'         THEN 9
        WHEN 'catalog'          THEN 4
        WHEN 'lifestyle'        THEN 5
        WHEN 'video-motion'     THEN 5
        WHEN 'video-lifestyle'  THEN 12
        WHEN 'hooks'            THEN 10
        ELSE 0 END) > 0;
