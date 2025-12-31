-- Create split bills tables for managing split bill payments
-- This allows restaurants to split orders across multiple bills and track individual payments

-- Create split_bills table
CREATE TABLE IF NOT EXISTS split_bills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_id UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  split_name TEXT NOT NULL, -- e.g., "Bill 1", "Bill 2"
  total_amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL, -- 'cash' or 'card'
  payment_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed'
  paid_by TEXT, -- Name of staff member or user who processed payment
  paid_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create split_bill_items table
CREATE TABLE IF NOT EXISTS split_bill_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  split_bill_id UUID NOT NULL REFERENCES split_bills(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  item_total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_split_bills_restaurant ON split_bills(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_split_bills_table ON split_bills(table_id);
CREATE INDEX IF NOT EXISTS idx_split_bills_status ON split_bills(payment_status);
CREATE INDEX IF NOT EXISTS idx_split_bill_items_split ON split_bill_items(split_bill_id);
CREATE INDEX IF NOT EXISTS idx_split_bill_items_order ON split_bill_items(order_item_id);

-- Add helpful comments
COMMENT ON TABLE split_bills IS 'Stores information about split bill payments for restaurant tables';
COMMENT ON TABLE split_bill_items IS 'Links order items to specific split bills';
COMMENT ON COLUMN split_bills.split_name IS 'Friendly name for the split (e.g., "Bill 1", "Bill 2")';
COMMENT ON COLUMN split_bills.payment_status IS 'Status of payment: pending, completed, or failed';
COMMENT ON COLUMN split_bills.paid_by IS 'Name of person who processed the payment';

-- Enable Row Level Security
ALTER TABLE split_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE split_bill_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for split_bills
CREATE POLICY "Restaurant owners can view their split bills"
  ON split_bills FOR SELECT
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Restaurant owners can insert split bills"
  ON split_bills FOR INSERT
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Restaurant owners can update their split bills"
  ON split_bills FOR UPDATE
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Restaurant owners can delete their split bills"
  ON split_bills FOR DELETE
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  );

-- RLS Policies for split_bill_items
CREATE POLICY "Restaurant owners can view their split bill items"
  ON split_bill_items FOR SELECT
  USING (
    split_bill_id IN (
      SELECT id FROM split_bills WHERE restaurant_id IN (
        SELECT id FROM restaurants WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Restaurant owners can insert split bill items"
  ON split_bill_items FOR INSERT
  WITH CHECK (
    split_bill_id IN (
      SELECT id FROM split_bills WHERE restaurant_id IN (
        SELECT id FROM restaurants WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Restaurant owners can update their split bill items"
  ON split_bill_items FOR UPDATE
  USING (
    split_bill_id IN (
      SELECT id FROM split_bills WHERE restaurant_id IN (
        SELECT id FROM restaurants WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Restaurant owners can delete their split bill items"
  ON split_bill_items FOR DELETE
  USING (
    split_bill_id IN (
      SELECT id FROM split_bills WHERE restaurant_id IN (
        SELECT id FROM restaurants WHERE owner_id = auth.uid()
      )
    )
  );
