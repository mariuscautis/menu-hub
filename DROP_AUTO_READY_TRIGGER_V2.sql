-- =============================================
-- Drop the Auto-Ready Trigger (v2)
-- =============================================
-- This trigger was automatically marking ALL items as ready
-- when order status changed to 'ready'
-- We need to remove it for department-level tracking

-- Drop the trigger first (correct order)
DROP TRIGGER IF EXISTS update_order_items_ready_timestamp ON orders;
DROP TRIGGER IF EXISTS trigger_update_order_ready_timestamp ON orders;

-- Now drop the function (use CASCADE to be safe)
DROP FUNCTION IF EXISTS update_order_ready_timestamp() CASCADE;

-- Verify triggers are gone
SELECT
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE event_object_table IN ('order_items', 'orders')
ORDER BY event_object_table, trigger_name;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Removed auto-ready trigger';
  RAISE NOTICE 'Triggers: update_order_items_ready_timestamp, trigger_update_order_ready_timestamp';
  RAISE NOTICE 'Function: update_order_ready_timestamp()';
  RAISE NOTICE '';
  RAISE NOTICE 'Now each department can mark items ready independently';
  RAISE NOTICE 'No automatic marking will occur';
END $$;
