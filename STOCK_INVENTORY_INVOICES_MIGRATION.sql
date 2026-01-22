-- Migration: Stock restructure with Inventory and Purchasing Invoices
-- Run this in your Supabase SQL Editor

-- =====================================================
-- 1. CREATE PURCHASING INVOICES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS purchasing_invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  reference_number VARCHAR(100) NOT NULL,
  supplier_name VARCHAR(255),
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  image_urls TEXT[], -- Array of image URLs to support multiple images
  notes TEXT,
  total_amount DECIMAL(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_email VARCHAR(255),
  CONSTRAINT unique_invoice_ref_per_restaurant UNIQUE (restaurant_id, reference_number)
);

-- Indexes for purchasing_invoices
CREATE INDEX IF NOT EXISTS idx_purchasing_invoices_restaurant ON purchasing_invoices(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_purchasing_invoices_date ON purchasing_invoices(invoice_date DESC);

-- RLS for purchasing_invoices
ALTER TABLE purchasing_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own restaurant purchasing invoices" ON purchasing_invoices;
CREATE POLICY "Users can view own restaurant purchasing invoices"
  ON purchasing_invoices FOR SELECT
  USING (restaurant_id IN (
    SELECT id FROM restaurants WHERE owner_id = auth.uid()
    UNION
    SELECT restaurant_id FROM staff WHERE user_id = auth.uid() AND status = 'active'
  ));

DROP POLICY IF EXISTS "Users can insert own restaurant purchasing invoices" ON purchasing_invoices;
CREATE POLICY "Users can insert own restaurant purchasing invoices"
  ON purchasing_invoices FOR INSERT
  WITH CHECK (restaurant_id IN (
    SELECT id FROM restaurants WHERE owner_id = auth.uid()
    UNION
    SELECT restaurant_id FROM staff WHERE user_id = auth.uid() AND status = 'active'
  ));

DROP POLICY IF EXISTS "Users can update own restaurant purchasing invoices" ON purchasing_invoices;
CREATE POLICY "Users can update own restaurant purchasing invoices"
  ON purchasing_invoices FOR UPDATE
  USING (restaurant_id IN (
    SELECT id FROM restaurants WHERE owner_id = auth.uid()
    UNION
    SELECT restaurant_id FROM staff WHERE user_id = auth.uid() AND status = 'active'
  ));

DROP POLICY IF EXISTS "Users can delete own restaurant purchasing invoices" ON purchasing_invoices;
CREATE POLICY "Users can delete own restaurant purchasing invoices"
  ON purchasing_invoices FOR DELETE
  USING (restaurant_id IN (
    SELECT id FROM restaurants WHERE owner_id = auth.uid()
  ));

-- =====================================================
-- 2. CREATE INVENTORY PRODUCTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS inventory_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  brand VARCHAR(255),
  description TEXT,
  current_stock INTEGER DEFAULT 0,
  min_stock_level INTEGER DEFAULT 0,
  unit_type VARCHAR(50) DEFAULT 'units', -- units, pieces, sets, boxes
  last_purchase_price DECIMAL(10, 2),
  last_purchase_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for inventory_products
CREATE INDEX IF NOT EXISTS idx_inventory_products_restaurant ON inventory_products(restaurant_id);

-- RLS for inventory_products
ALTER TABLE inventory_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own restaurant inventory products" ON inventory_products;
CREATE POLICY "Users can view own restaurant inventory products"
  ON inventory_products FOR SELECT
  USING (restaurant_id IN (
    SELECT id FROM restaurants WHERE owner_id = auth.uid()
    UNION
    SELECT restaurant_id FROM staff WHERE user_id = auth.uid() AND status = 'active'
  ));

DROP POLICY IF EXISTS "Users can insert own restaurant inventory products" ON inventory_products;
CREATE POLICY "Users can insert own restaurant inventory products"
  ON inventory_products FOR INSERT
  WITH CHECK (restaurant_id IN (
    SELECT id FROM restaurants WHERE owner_id = auth.uid()
    UNION
    SELECT restaurant_id FROM staff WHERE user_id = auth.uid() AND status = 'active'
  ));

DROP POLICY IF EXISTS "Users can update own restaurant inventory products" ON inventory_products;
CREATE POLICY "Users can update own restaurant inventory products"
  ON inventory_products FOR UPDATE
  USING (restaurant_id IN (
    SELECT id FROM restaurants WHERE owner_id = auth.uid()
    UNION
    SELECT restaurant_id FROM staff WHERE user_id = auth.uid() AND status = 'active'
  ));

DROP POLICY IF EXISTS "Users can delete own restaurant inventory products" ON inventory_products;
CREATE POLICY "Users can delete own restaurant inventory products"
  ON inventory_products FOR DELETE
  USING (restaurant_id IN (
    SELECT id FROM restaurants WHERE owner_id = auth.uid()
  ));

-- =====================================================
-- 3. CREATE INVENTORY ENTRIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS inventory_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES inventory_products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  purchase_price DECIMAL(10, 2),
  purchasing_invoice_id UUID REFERENCES purchasing_invoices(id) ON DELETE SET NULL,
  added_by_email VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for inventory_entries
CREATE INDEX IF NOT EXISTS idx_inventory_entries_restaurant ON inventory_entries(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_entries_product ON inventory_entries(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_entries_invoice ON inventory_entries(purchasing_invoice_id);

-- RLS for inventory_entries
ALTER TABLE inventory_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own restaurant inventory entries" ON inventory_entries;
CREATE POLICY "Users can view own restaurant inventory entries"
  ON inventory_entries FOR SELECT
  USING (restaurant_id IN (
    SELECT id FROM restaurants WHERE owner_id = auth.uid()
    UNION
    SELECT restaurant_id FROM staff WHERE user_id = auth.uid() AND status = 'active'
  ));

DROP POLICY IF EXISTS "Users can insert own restaurant inventory entries" ON inventory_entries;
CREATE POLICY "Users can insert own restaurant inventory entries"
  ON inventory_entries FOR INSERT
  WITH CHECK (restaurant_id IN (
    SELECT id FROM restaurants WHERE owner_id = auth.uid()
    UNION
    SELECT restaurant_id FROM staff WHERE user_id = auth.uid() AND status = 'active'
  ));

-- =====================================================
-- 4. TRIGGER: Update inventory_products stock on entry
-- =====================================================
CREATE OR REPLACE FUNCTION update_inventory_product_stock()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE inventory_products
  SET current_stock = current_stock + NEW.quantity,
      last_purchase_price = COALESCE(NEW.purchase_price, last_purchase_price),
      last_purchase_date = NEW.created_at,
      updated_at = NOW()
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS inventory_entry_insert_trigger ON inventory_entries;
CREATE TRIGGER inventory_entry_insert_trigger
AFTER INSERT ON inventory_entries
FOR EACH ROW
EXECUTE FUNCTION update_inventory_product_stock();

-- =====================================================
-- 5. ADD PURCHASING INVOICE REFERENCE TO STOCK_ENTRIES
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stock_entries' AND column_name = 'purchasing_invoice_id'
  ) THEN
    ALTER TABLE stock_entries
    ADD COLUMN purchasing_invoice_id UUID REFERENCES purchasing_invoices(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_stock_entries_invoice ON stock_entries(purchasing_invoice_id);

-- =====================================================
-- 6. STORAGE BUCKET AND POLICIES
-- =====================================================

-- Create the storage bucket (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public)
VALUES ('purchasing-invoices', 'purchasing-invoices', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated uploads to purchasing-invoices" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads from purchasing-invoices" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes from purchasing-invoices" ON storage.objects;

-- Policy: Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads to purchasing-invoices"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'purchasing-invoices');

-- Policy: Allow authenticated users to read files
CREATE POLICY "Allow authenticated reads from purchasing-invoices"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'purchasing-invoices');

-- Policy: Allow authenticated users to delete their own files
CREATE POLICY "Allow authenticated deletes from purchasing-invoices"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'purchasing-invoices');

-- Policy: Allow authenticated users to update files
CREATE POLICY "Allow authenticated updates to purchasing-invoices"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'purchasing-invoices');

-- =====================================================
-- DONE!
-- =====================================================
-- After running this migration, the storage bucket and policies will be set up automatically.
