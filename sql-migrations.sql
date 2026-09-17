-- Run this in your Supabase SQL Editor:
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS transaction_at timestamp with time zone;
UPDATE transactions SET transaction_at = (transaction_date || ' 00:00:00+07:00')::timestamp with time zone WHERE transaction_at IS NULL;

ALTER TABLE material_transactions ADD COLUMN IF NOT EXISTS transaction_at timestamp with time zone;
UPDATE material_transactions SET transaction_at = (transaction_date || ' 00:00:00+07:00')::timestamp with time zone WHERE transaction_at IS NULL;

ALTER TABLE worker_payments ADD COLUMN IF NOT EXISTS payment_at timestamp with time zone;
UPDATE worker_payments SET payment_at = (payment_date || ' 00:00:00+07:00')::timestamp with time zone WHERE payment_at IS NULL;
