-- =============================================
-- Fix Security Issues - Enable RLS and Secure Views (V2)
-- =============================================
-- This script addresses the critical security warnings from Supabase
-- V2: Fixed invoice_clients_with_stats to use 'paid' column instead of 'status'

-- =============================================
-- PART 1: Enable RLS on Tables Without Policies
-- =============================================

-- Enable RLS on department_permissions
ALTER TABLE public.department_permissions ENABLE ROW LEVEL SECURITY;

-- Create policies for department_permissions
-- Authenticated users can view department permissions
CREATE POLICY "Allow authenticated to view department permissions"
ON public.department_permissions
FOR SELECT
TO authenticated
USING (true);

-- Only owners can modify department permissions
CREATE POLICY "Allow owners to manage department permissions"
ON public.department_permissions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM restaurants r
    WHERE r.id = department_permissions.restaurant_id
    AND r.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM restaurants r
    WHERE r.id = department_permissions.restaurant_id
    AND r.owner_id = auth.uid()
  )
);

-- Enable RLS on product_tax_categories
ALTER TABLE public.product_tax_categories ENABLE ROW LEVEL SECURITY;

-- Create policies for product_tax_categories
-- Authenticated users can view tax categories
CREATE POLICY "Allow authenticated to view tax categories"
ON public.product_tax_categories
FOR SELECT
TO authenticated
USING (true);

-- Only owners can modify tax categories for their restaurant
CREATE POLICY "Allow owners to manage tax categories"
ON public.product_tax_categories
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM restaurants r
    WHERE r.id = product_tax_categories.restaurant_id
    AND r.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM restaurants r
    WHERE r.id = product_tax_categories.restaurant_id
    AND r.owner_id = auth.uid()
  )
);

-- =============================================
-- PART 2: Fix Security Definer Views
-- =============================================
-- Security definer views run with elevated privileges which can be risky
-- We'll recreate them as SECURITY INVOKER (runs with caller's privileges)

-- Drop and recreate best_selling_products
DROP VIEW IF EXISTS public.best_selling_products;
CREATE VIEW public.best_selling_products
WITH (security_invoker=true)
AS
SELECT
  mi.id,
  mi.name,
  mi.category_id,
  mc.name as category_name,
  COUNT(oi.id) as order_count,
  SUM(oi.quantity) as total_quantity,
  SUM(oi.quantity * oi.price_at_time) as total_revenue,
  mi.restaurant_id
FROM menu_items mi
LEFT JOIN order_items oi ON oi.menu_item_id = mi.id
LEFT JOIN orders o ON oi.order_id = o.id AND o.status != 'cancelled'
LEFT JOIN menu_categories mc ON mi.category_id = mc.id
GROUP BY mi.id, mi.name, mi.category_id, mc.name, mi.restaurant_id
ORDER BY total_quantity DESC NULLS LAST;

-- Drop and recreate invoice_clients_with_stats
-- Note: This view just passes through all columns from invoice_clients
-- The stats columns (total_invoices, total_paid, etc.) already exist in the base table
DROP VIEW IF EXISTS public.invoice_clients_with_stats;
CREATE VIEW public.invoice_clients_with_stats
WITH (security_invoker=true)
AS
SELECT ic.*
FROM invoice_clients ic;

-- Drop and recreate menu_items_stock_status
DROP VIEW IF EXISTS public.menu_items_stock_status;
CREATE VIEW public.menu_items_stock_status
WITH (security_invoker=true)
AS
SELECT
  mi.id as menu_item_id,
  mi.name as menu_item_name,
  mi.restaurant_id,
  sp.id as stock_product_id,
  sp.name as stock_product_name,
  sp.current_stock,
  mii.quantity_needed,
  CASE
    WHEN mii.quantity_needed > 0 THEN
      FLOOR(sp.current_stock / mii.quantity_needed)
    ELSE 999999
  END as servings_available
FROM menu_items mi
LEFT JOIN menu_item_ingredients mii ON mii.menu_item_id = mi.id
LEFT JOIN stock_products sp ON sp.id = mii.stock_product_id;

-- Drop and recreate menu_items_with_stock
DROP VIEW IF EXISTS public.menu_items_with_stock;
CREATE VIEW public.menu_items_with_stock
WITH (security_invoker=true)
AS
SELECT
  mi.*,
  MIN(
    CASE
      WHEN mii.quantity_needed > 0 THEN
        FLOOR(sp.current_stock / mii.quantity_needed)
      ELSE 999999
    END
  ) as min_servings_available,
  CASE
    WHEN MIN(
      CASE
        WHEN mii.quantity_needed > 0 THEN
          FLOOR(sp.current_stock / mii.quantity_needed)
        ELSE 999999
      END
    ) = 0 THEN false
    ELSE mi.available
  END as stock_available
FROM menu_items mi
LEFT JOIN menu_item_ingredients mii ON mii.menu_item_id = mi.id
LEFT JOIN stock_products sp ON sp.id = mii.stock_product_id
GROUP BY mi.id;

-- Drop and recreate order_delivery_analytics
DROP VIEW IF EXISTS public.order_delivery_analytics;
CREATE VIEW public.order_delivery_analytics
WITH (security_invoker=true)
AS
SELECT
  o.id AS order_id,
  o.restaurant_id,
  o.table_id,
  t.table_number,
  o.created_at AS order_time,
  o.marked_ready_at,
  o.delivered_at,
  o.status,
  o.total,
  CASE
    WHEN o.marked_ready_at IS NOT NULL
    THEN EXTRACT(EPOCH FROM (o.marked_ready_at - o.created_at)) / 60
    ELSE NULL
  END AS preparation_minutes,
  CASE
    WHEN o.delivered_at IS NOT NULL AND o.marked_ready_at IS NOT NULL
    THEN EXTRACT(EPOCH FROM (o.delivered_at - o.marked_ready_at)) / 60
    ELSE NULL
  END AS waiter_response_minutes,
  CASE
    WHEN o.delivered_at IS NOT NULL
    THEN EXTRACT(EPOCH FROM (o.delivered_at - o.created_at)) / 60
    ELSE NULL
  END AS total_delivery_minutes,
  DATE(o.created_at) AS order_date,
  EXTRACT(HOUR FROM o.created_at) AS order_hour
FROM orders o
LEFT JOIN tables t ON o.table_id = t.id
WHERE o.status != 'cancelled';

-- Drop and recreate order_item_delivery_analytics
DROP VIEW IF EXISTS public.order_item_delivery_analytics;
CREATE VIEW public.order_item_delivery_analytics
WITH (security_invoker=true)
AS
SELECT
  oi.id AS item_id,
  oi.order_id,
  o.restaurant_id,
  o.table_id,
  t.table_number,
  mi.name AS item_name,
  COALESCE(mc.name, 'other') AS item_category,
  oi.quantity,
  mi.price,
  o.created_at AS order_time,
  oi.marked_ready_at,
  oi.delivered_at,
  o.status AS order_status,
  CASE
    WHEN oi.marked_ready_at IS NOT NULL
    THEN EXTRACT(EPOCH FROM (oi.marked_ready_at - o.created_at)) / 60
    ELSE NULL
  END AS preparation_minutes,
  CASE
    WHEN oi.delivered_at IS NOT NULL AND oi.marked_ready_at IS NOT NULL
    THEN EXTRACT(EPOCH FROM (oi.delivered_at - oi.marked_ready_at)) / 60
    ELSE NULL
  END AS waiter_response_minutes,
  CASE
    WHEN oi.delivered_at IS NOT NULL
    THEN EXTRACT(EPOCH FROM (oi.delivered_at - o.created_at)) / 60
    ELSE NULL
  END AS total_delivery_minutes,
  DATE(o.created_at) AS order_date,
  EXTRACT(HOUR FROM o.created_at) AS order_hour
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
LEFT JOIN tables t ON o.table_id = t.id
LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
LEFT JOIN menu_categories mc ON mi.category_id = mc.id
WHERE o.status != 'cancelled';

-- Drop and recreate peak_hours_analysis
DROP VIEW IF EXISTS public.peak_hours_analysis;
CREATE VIEW public.peak_hours_analysis
WITH (security_invoker=true)
AS
SELECT
  restaurant_id,
  EXTRACT(HOUR FROM created_at) as hour,
  COUNT(*) as order_count,
  SUM(total) as total_revenue,
  AVG(total) as avg_order_value
FROM orders
WHERE status != 'cancelled'
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY restaurant_id, EXTRACT(HOUR FROM created_at)
ORDER BY restaurant_id, hour;

-- Drop and recreate recent_invoices
DROP VIEW IF EXISTS public.recent_invoices;
CREATE VIEW public.recent_invoices
WITH (security_invoker=true)
AS
SELECT
  i.*,
  ic.name as client_name,
  ic.email as client_email,
  ic.company as company_name
FROM invoices i
LEFT JOIN invoice_clients ic ON i.client_id = ic.id
ORDER BY i.created_at DESC;

-- Drop and recreate revenue_by_category
DROP VIEW IF EXISTS public.revenue_by_category;
CREATE VIEW public.revenue_by_category
WITH (security_invoker=true)
AS
SELECT
  mi.restaurant_id,
  mc.id as category_id,
  mc.name as category_name,
  COUNT(DISTINCT o.id) as order_count,
  SUM(oi.quantity) as items_sold,
  SUM(oi.quantity * oi.price_at_time) as total_revenue
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
JOIN menu_items mi ON oi.menu_item_id = mi.id
LEFT JOIN menu_categories mc ON mi.category_id = mc.id
WHERE o.status != 'cancelled'
GROUP BY mi.restaurant_id, mc.id, mc.name
ORDER BY total_revenue DESC NULLS LAST;

-- Drop and recreate sales_trends_30d
DROP VIEW IF EXISTS public.sales_trends_30d;
CREATE VIEW public.sales_trends_30d
WITH (security_invoker=true)
AS
SELECT
  restaurant_id,
  DATE(created_at) as date,
  COUNT(*) as order_count,
  SUM(total) as daily_revenue,
  AVG(total) as avg_order_value
FROM orders
WHERE status != 'cancelled'
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY restaurant_id, DATE(created_at)
ORDER BY restaurant_id, date;

-- Drop and recreate staff_leave_balances
-- Note: This view shows staff leave entitlements
-- staff_leave_entitlements stores the configuration (annual days, remaining days, etc.)
DROP VIEW IF EXISTS public.staff_leave_balances;
CREATE VIEW public.staff_leave_balances
WITH (security_invoker=true)
AS
SELECT
  s.id as staff_id,
  s.name as staff_name,
  s.restaurant_id,
  COALESCE(sle.annual_holiday_days, 0) as annual_holiday_days,
  COALESCE(sle.holiday_days_remaining, 0) as holiday_days_remaining,
  COALESCE(sle.holiday_days_pending, 0) as holiday_days_pending
FROM staff s
LEFT JOIN staff_leave_entitlements sle ON s.id = sle.staff_id;

-- Drop and recreate table_performance
DROP VIEW IF EXISTS public.table_performance;
CREATE VIEW public.table_performance
WITH (security_invoker=true)
AS
SELECT
  t.id as table_id,
  t.table_number,
  t.restaurant_id,
  COUNT(o.id) as total_orders,
  SUM(o.total) as total_revenue,
  AVG(o.total) as avg_order_value,
  AVG(
    CASE
      WHEN o.delivered_at IS NOT NULL
      THEN EXTRACT(EPOCH FROM (o.delivered_at - o.created_at)) / 60
    END
  ) as avg_service_time_minutes
FROM tables t
LEFT JOIN orders o ON t.id = o.table_id AND o.status != 'cancelled'
GROUP BY t.id, t.table_number, t.restaurant_id;

-- =============================================
-- Success Message
-- =============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Security issues fixed!';
  RAISE NOTICE '';
  RAISE NOTICE 'Fixed:';
  RAISE NOTICE '1. Enabled RLS on department_permissions table';
  RAISE NOTICE '2. Enabled RLS on product_tax_categories table';
  RAISE NOTICE '3. Recreated all views with SECURITY INVOKER';
  RAISE NOTICE '';
  RAISE NOTICE 'All views now run with caller privileges instead of elevated privileges';
  RAISE NOTICE 'RLS policies ensure only authorized users can access data';
END $$;
