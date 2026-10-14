-- 1. Plak dit hele blok in het Cloudflare-dashboard bij D1 → visuails → Console, en klik op Execute. Het leest alleen; er verandert niets.
-- 2. Het zoekt bestellingen met tegoed erop, waarvan de klant vóór die bestelling niet zoveel tegoed van jou had gekregen.
-- 3. Leeg = niemand heeft het lek (b01) gebruikt. Staat er een regel, dan is die bestelling met verzonnen tegoed geplaatst: zoek de ref op in /admin.
SELECT
  o.ref,
  o.created_at                                                       AS besteld_op,
  o.email,
  o.payment_status                                                   AS betaling,
  o.status,
  CAST(json_extract(o.details_json, '$.tegoed_cents') AS INTEGER)    AS tegoed_op_bestelling_cent,
  (SELECT COALESCE(SUM(c.delta_cents), 0)
     FROM customer_credits c
    WHERE c.customer_id = o.customer_id
      AND datetime(c.created_at) <= datetime(o.created_at))          AS saldo_klant_toen_cent
FROM orders o
WHERE json_valid(o.details_json)
  AND CAST(json_extract(o.details_json, '$.tegoed_cents') AS INTEGER) > 0
  AND CAST(json_extract(o.details_json, '$.tegoed_cents') AS INTEGER) >
      (SELECT COALESCE(SUM(c.delta_cents), 0)
         FROM customer_credits c
        WHERE c.customer_id = o.customer_id
          AND datetime(c.created_at) <= datetime(o.created_at))
ORDER BY o.created_at;
