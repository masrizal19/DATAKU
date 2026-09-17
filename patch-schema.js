import fs from 'fs';
let code = fs.readFileSync('supabase-schema.sql', 'utf8');

// Add transaction_at to transactions
code = code.replace(
  "transaction_date date not null,",
  "transaction_date date not null,\n  transaction_at timestamp with time zone,"
);

// Add transaction_at to material_transactions
code = code.replace(
  "transaction_date date not null,\n  description text",
  "transaction_date date not null,\n  transaction_at timestamp with time zone,\n  description text"
);

// Add payment_at to worker_payments (wait, what is the date field?)
// Let's check worker_payments.
