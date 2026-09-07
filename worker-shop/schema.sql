CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  format TEXT NOT NULL,                    -- 'pdf' | 'physical' | 'bundle'
  quantity INTEGER NOT NULL DEFAULT 1,
  signed INTEGER NOT NULL DEFAULT 0,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  country TEXT NOT NULL,
  address_line TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  subtotal INTEGER NOT NULL,
  shipping INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  payment_status TEXT NOT NULL DEFAULT 'created', -- created | paid | failed
  digital_fulfillment TEXT,                 -- Paid | Downloaded (pdf/bundle only)
  physical_fulfillment TEXT,                -- Paid | Processing | Shipped | Delivered | Cancelled
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_razorpay_order_id ON orders(razorpay_order_id);

CREATE TABLE IF NOT EXISTS inventory (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  physical_count INTEGER NOT NULL
);

-- Seed the counter once. Re-run with a different value any time you restock:
--   wrangler d1 execute book-shop --remote --command "UPDATE inventory SET physical_count = 50 WHERE id = 1"
INSERT OR IGNORE INTO inventory (id, physical_count) VALUES (1, 50);
