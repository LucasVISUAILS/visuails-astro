-- VISUAILS — migration 0008, August 2026.
--
-- THE BUG THIS CLOSES.
--
-- customers.email is UNIQUE and it is the only credential /account
-- authenticates against: src/lib/account.js looks a customer up by address and
-- mails them a sign-in link. That lookup lowercased what the visitor typed.
-- functions/api/order.js, which WRITES the row, did not — it stored the address
-- exactly as the customer typed it into the order form.
--
-- SQLite compares TEXT byte for byte and this column has no NOCASE collation,
-- so a brand that ordered as `Ana@Shop.com` could never sign in. The lookup
-- missed, sendLoginLink() returned early, and the page still said "check your
-- email" — which it does on purpose, so the form cannot be used to test which
-- addresses have accounts. No mail, no error, nothing to diagnose. The same
-- mismatch also split one brand across two rows: order once with a capital and
-- once without, and UNIQUE(email) sees two different customers, so half the
-- order history vanishes from the account.
--
-- The code is fixed in both directions as of today — order.js lowercases on the
-- way in, and sendLoginLink() matches on lower(email) so a database that has
-- NOT run this migration still lets people in. This file normalises the rows
-- written before that.
--
-- WHY THE `NOT EXISTS` GUARD IS NOT PARANOIA.
--
-- If both `Ana@Shop.com` and `ana@shop.com` already exist as separate rows,
-- lowercasing the first one collides with the second and UNIQUE(email) refuses
-- the whole statement. The guard makes that case skip rather than fail: every
-- row that can be normalised safely is, and any genuine duplicate PAIR is left
-- exactly as it is, for a human to merge on purpose. Merging two customers is
-- not a thing a migration should decide — one of them owns the orders, the
-- other may own the brand kit, and only Lucas knows which is which.
UPDATE customers
   SET email = lower(email),
       updated_at = datetime('now')
 WHERE email <> lower(email)
   AND NOT EXISTS (
     SELECT 1 FROM customers c2 WHERE c2.email = lower(customers.email)
   );

-- orders.email is a COPY of the address at the time of the order, not an
-- identity — nothing joins on it and nothing authenticates against it. It is
-- normalised anyway so the admin's customer view and the order list read as one
-- brand rather than two spellings of one. No uniqueness to collide with here,
-- so no guard is needed.
UPDATE orders SET email = lower(email) WHERE email <> lower(email);

-- Same reasoning, same absence of a unique constraint.
UPDATE messages SET email = lower(email) WHERE email <> lower(email);

-- AFTER RUNNING THIS, CHECK FOR THE CASE IT DELIBERATELY SKIPPED:
--
--   SELECT lower(email) AS addr, COUNT(*) AS rows, GROUP_CONCAT(id) AS ids
--     FROM customers GROUP BY addr HAVING rows > 1;
--
-- An empty result means every customer is now stored in one canonical spelling
-- and there is nothing left to do. Any row it returns is one brand living in two
-- accounts: decide which id keeps the history, repoint orders.customer_id,
-- custom_models.customer_id and customer_style_locks.customer_id at it, then
-- delete the loser. Deliberately not automated here — see above.
--
-- A UNIQUE INDEX ON lower(email) IS NOT CREATED, on purpose. It would be the
-- durable fix, and it would also fail outright on a database that still has such
-- a pair — turning a migration that CAN always run into one that sometimes
-- cannot. The write path is normalised in code, which holds for every row
-- written from today; add the index in a later migration once the query above
-- comes back empty.
