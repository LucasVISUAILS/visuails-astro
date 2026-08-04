-- VISUAILS — migration 0006, August 2026.
-- Catalog and lifestyle became payable. Two things the schema was missing.
--
-- 1 · WHEN AN UNPAID RESERVATION EXPIRES.
--
-- From WINDOW_THRESHOLD products an order is written into the capacity calendar
-- and holds a 48-hour window, and that happens at CONFIRMATION — not at
-- payment. That was fine while nothing could be paid for. It is not fine now:
-- one order that is never paid would hold a slot that could have been sold, and
-- nobody would find out until somebody swept the table by hand.
--
-- Lucas's choice: hold it, but with an expiry. This column is that expiry. It
-- is written only for an order that BOTH reserved a window AND has something to
-- pay, it is cleared the moment the webhook marks the order paid, and a null
-- means "nothing is counting down" — which is the correct reading for every row
-- that predates this migration, for every unattended order, and for every order
-- already settled.
--
-- Deliberately a timestamp rather than a boolean or a day count: a sweep that
-- has to recompute "seven days from created_at, unless it was extended" is a
-- sweep with a policy inside it, and the policy would then live in whichever
-- query ran last. One column, one answer, readable by a human in the admin.
ALTER TABLE orders ADD COLUMN window_expires_at TEXT;   -- ISO datetime, or NULL

-- 2 · WHAT A REFUND DID BEFORE THIS.
--
-- refunded_cents closes a real gap. Mollie fires the SAME webhook for a refund
-- as for the original payment — same payment id, different status — and the
-- payments table has UNIQUE(provider, external_id) precisely so that a retried
-- webhook cannot be counted twice. The consequence nobody had noticed: a refund
-- hit that constraint, was discarded as a duplicate, and the order stayed on
-- payment_status 'paid' forever. With €0.99 test payments that never surfaced.
--
-- Storing the refunded amount on the ORDER rather than as another payments row
-- keeps the uniqueness guarantee intact — the log stays one row per payment
-- attempt — while making "how much of this came back" a fact you can read
-- without replaying the log.
ALTER TABLE orders ADD COLUMN refunded_cents INTEGER NOT NULL DEFAULT 0;

-- An index for the sweep that releases expired windows. Partial, because the
-- overwhelming majority of rows have NULL here and there is no reason to carry
-- them in the index.
CREATE INDEX IF NOT EXISTS idx_orders_window_expiry
  ON orders(window_expires_at) WHERE window_expires_at IS NOT NULL;
