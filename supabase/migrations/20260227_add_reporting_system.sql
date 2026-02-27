-- ============================================================================
-- REPORTING SYSTEM MIGRATION
-- ============================================================================
-- This migration adds comprehensive reporting capabilities including:
-- 1. Cash drawer management (shifts, opening/closing amounts, variance tracking)
-- 2. Discount system (templates and applied discounts per order)
-- 3. Refund tracking (partial/full refunds on paid orders)
-- 4. Void tracking (items voided before payment)
-- 5. Enhanced order fields (subtotal, tax breakdown, discount totals)
--
-- Run this migration in your Supabase SQL editor or via the CLI:
--   supabase db push
-- ============================================================================


-- ============================================================================
-- PART 1: CASH DRAWER SESSIONS
-- ============================================================================
-- Tracks cash drawer open/close cycles for shift-based cash management.
-- Each session represents one "shift" where a staff member is responsible
-- for the cash drawer. The variance (difference between expected and actual)
-- helps identify discrepancies.

CREATE TABLE IF NOT EXISTS cash_drawer_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,

    -- Staff member who opened/is responsible for this drawer session
    opened_by_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    opened_by_name TEXT NOT NULL,

    -- Staff member who closed the drawer (may be different from opener)
    closed_by_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    closed_by_name TEXT,

    -- Session timing
    opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ,

    -- Cash amounts (all in restaurant's currency)
    opening_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    closing_amount DECIMAL(10,2),  -- Actual counted amount when closing

    -- Expected amount is calculated: opening + cash_sales + cash_tips - cash_refunds
    -- This is computed at close time and stored for historical accuracy
    expected_amount DECIMAL(10,2),

    -- Variance = closing_amount - expected_amount
    -- Positive = over, Negative = short
    variance DECIMAL(10,2),

    -- Optional notes (e.g., "£20 note was torn, exchanged with manager")
    notes TEXT,

    -- Session status
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for finding the current open session for a restaurant
CREATE INDEX IF NOT EXISTS idx_cash_drawer_sessions_restaurant_status
    ON cash_drawer_sessions(restaurant_id, status)
    WHERE status = 'open';

-- Index for historical lookups by date
CREATE INDEX IF NOT EXISTS idx_cash_drawer_sessions_restaurant_date
    ON cash_drawer_sessions(restaurant_id, opened_at DESC);

-- Ensure only one open session per restaurant at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_cash_drawer_one_open_per_restaurant
    ON cash_drawer_sessions(restaurant_id)
    WHERE status = 'open';

COMMENT ON TABLE cash_drawer_sessions IS
    'Tracks cash drawer open/close cycles for shift-based cash management and Z-Report generation';


-- ============================================================================
-- PART 2: DISCOUNT TEMPLATES
-- ============================================================================
-- Pre-defined discounts that can be quickly applied to orders.
-- Examples: "Staff Discount 20%", "Happy Hour 15%", "Loyalty £5 off"

CREATE TABLE IF NOT EXISTS discounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,

    -- Discount details
    name TEXT NOT NULL,  -- e.g., "Staff Discount", "Happy Hour", "Loyalty Reward"
    description TEXT,    -- Optional longer description

    -- Type determines how the value is applied
    -- 'percentage': value is a percentage (e.g., 20 means 20% off)
    -- 'fixed': value is a fixed amount (e.g., 5 means £5 off)
    type TEXT NOT NULL CHECK (type IN ('percentage', 'fixed')),
    value DECIMAL(10,2) NOT NULL,

    -- If true, a manager must approve before this discount can be applied
    requires_manager_approval BOOLEAN NOT NULL DEFAULT FALSE,

    -- Whether this discount is currently available for use
    active BOOLEAN NOT NULL DEFAULT TRUE,

    -- Optional: limit usage (null = unlimited)
    max_uses_per_day INTEGER,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fetching active discounts for a restaurant
CREATE INDEX IF NOT EXISTS idx_discounts_restaurant_active
    ON discounts(restaurant_id)
    WHERE active = TRUE;

COMMENT ON TABLE discounts IS
    'Pre-defined discount templates that can be applied to orders';


-- ============================================================================
-- PART 3: ORDER DISCOUNTS (Applied Discounts)
-- ============================================================================
-- Records each discount applied to an order. An order can have multiple
-- discounts (e.g., staff discount + manager comp).

CREATE TABLE IF NOT EXISTS order_discounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,

    -- Reference to discount template (nullable for manual/ad-hoc discounts)
    discount_id UUID REFERENCES discounts(id) ON DELETE SET NULL,

    -- Snapshot of discount details at time of application
    -- (stored separately in case template is later modified)
    discount_name TEXT NOT NULL,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL(10,2) NOT NULL,  -- The percentage or fixed amount

    -- Actual amount deducted from this order
    -- (calculated based on order subtotal at time of application)
    amount_deducted DECIMAL(10,2) NOT NULL,

    -- Who applied the discount
    applied_by_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    applied_by_name TEXT NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Reason for discount (required for manual discounts, optional otherwise)
    reason TEXT,

    -- If manager approval was required, who approved it
    approved_by_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    approved_by_name TEXT,
    approved_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fetching discounts for a specific order
CREATE INDEX IF NOT EXISTS idx_order_discounts_order
    ON order_discounts(order_id);

-- Index for analytics: discounts by restaurant and date
CREATE INDEX IF NOT EXISTS idx_order_discounts_restaurant_date
    ON order_discounts(restaurant_id, applied_at DESC);

COMMENT ON TABLE order_discounts IS
    'Records discounts applied to orders, supporting both template-based and manual discounts';


-- ============================================================================
-- PART 4: REFUNDS
-- ============================================================================
-- Tracks refunds issued on paid orders. Supports partial refunds.
-- A single order can have multiple partial refunds.

CREATE TABLE IF NOT EXISTS refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,

    -- Refund amount (can be partial)
    refund_amount DECIMAL(10,2) NOT NULL,

    -- How the refund was processed
    -- 'cash': Cash refund given
    -- 'card': Refunded to original card
    -- 'original': Refunded via original payment method (auto-determined)
    refund_method TEXT NOT NULL CHECK (refund_method IN ('cash', 'card', 'original')),

    -- Required reason for the refund
    reason TEXT NOT NULL,

    -- Optional additional notes
    notes TEXT,

    -- Who processed the refund
    processed_by_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    processed_by_name TEXT NOT NULL,

    -- Manager approval (if required by restaurant settings)
    approved_by_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    approved_by_name TEXT,

    -- Link to cash drawer session if cash refund
    cash_drawer_session_id UUID REFERENCES cash_drawer_sessions(id) ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fetching refunds for a specific order
CREATE INDEX IF NOT EXISTS idx_refunds_order
    ON refunds(order_id);

-- Index for analytics: refunds by restaurant and date
CREATE INDEX IF NOT EXISTS idx_refunds_restaurant_date
    ON refunds(restaurant_id, created_at DESC);

-- Index for cash drawer reconciliation
CREATE INDEX IF NOT EXISTS idx_refunds_cash_drawer
    ON refunds(cash_drawer_session_id)
    WHERE cash_drawer_session_id IS NOT NULL;

COMMENT ON TABLE refunds IS
    'Tracks refunds issued on paid orders, supporting partial refunds and multiple refund methods';


-- ============================================================================
-- PART 5: VOIDS
-- ============================================================================
-- Tracks items voided from orders BEFORE payment.
-- Unlike refunds (post-payment), voids happen during order preparation.
-- Items are not deleted but marked as voided to maintain audit trail.

CREATE TABLE IF NOT EXISTS voids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,

    -- Snapshot of item details at time of void
    item_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    price_at_time DECIMAL(10,2) NOT NULL,

    -- Total value voided (quantity * price_at_time)
    void_amount DECIMAL(10,2) NOT NULL,

    -- Required reason for voiding
    reason TEXT NOT NULL,

    -- Who voided the item
    voided_by_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    voided_by_name TEXT NOT NULL,

    -- Manager approval (if required)
    approved_by_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    approved_by_name TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fetching voids for a specific order
CREATE INDEX IF NOT EXISTS idx_voids_order
    ON voids(order_id);

-- Index for analytics: voids by restaurant and date
CREATE INDEX IF NOT EXISTS idx_voids_restaurant_date
    ON voids(restaurant_id, created_at DESC);

COMMENT ON TABLE voids IS
    'Tracks items voided from orders before payment, maintaining audit trail';


-- ============================================================================
-- PART 6: ENHANCE ORDERS TABLE
-- ============================================================================
-- Add new fields to orders for comprehensive financial tracking.
-- These fields enable accurate Z-Report generation and tax reporting.

-- Subtotal: Sum of all items before discounts and tax
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2);

-- Total discount amount (sum of all order_discounts.amount_deducted)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_total DECIMAL(10,2) DEFAULT 0;

-- Tax amount (calculated based on tax settings)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10,2) DEFAULT 0;

-- Link to cash drawer session when payment was taken (for cash payments)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cash_drawer_session_id UUID REFERENCES cash_drawer_sessions(id) ON DELETE SET NULL;

-- Total refunded amount (sum of all refunds for this order)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_total DECIMAL(10,2) DEFAULT 0;

-- Index for cash drawer reconciliation
CREATE INDEX IF NOT EXISTS idx_orders_cash_drawer
    ON orders(cash_drawer_session_id)
    WHERE cash_drawer_session_id IS NOT NULL;

COMMENT ON COLUMN orders.subtotal IS 'Sum of all order items before discounts and tax';
COMMENT ON COLUMN orders.discount_total IS 'Total discount amount applied to this order';
COMMENT ON COLUMN orders.tax_amount IS 'Calculated tax amount for this order';
COMMENT ON COLUMN orders.cash_drawer_session_id IS 'Cash drawer session when payment was received (for cash payments)';
COMMENT ON COLUMN orders.refund_total IS 'Total amount refunded for this order';


-- ============================================================================
-- PART 7: ENHANCE ORDER_ITEMS TABLE
-- ============================================================================
-- Add void tracking to individual items

-- Mark if item has been voided
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS voided BOOLEAN DEFAULT FALSE;

-- When the item was voided
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ;

-- Index for filtering out voided items in queries
CREATE INDEX IF NOT EXISTS idx_order_items_voided
    ON order_items(order_id, voided)
    WHERE voided = FALSE;

COMMENT ON COLUMN order_items.voided IS 'Whether this item has been voided (removed from order before payment)';
COMMENT ON COLUMN order_items.voided_at IS 'Timestamp when the item was voided';


-- ============================================================================
-- PART 8: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
-- Enable RLS on new tables and create appropriate policies

-- Cash Drawer Sessions
ALTER TABLE cash_drawer_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cash drawer sessions for their restaurant"
    ON cash_drawer_sessions FOR SELECT
    USING (
        restaurant_id IN (
            SELECT id FROM restaurants WHERE owner_id = auth.uid()
            UNION
            SELECT restaurant_id FROM staff WHERE user_id = auth.uid() AND status = 'active'
        )
    );

CREATE POLICY "Users can insert cash drawer sessions for their restaurant"
    ON cash_drawer_sessions FOR INSERT
    WITH CHECK (
        restaurant_id IN (
            SELECT id FROM restaurants WHERE owner_id = auth.uid()
            UNION
            SELECT restaurant_id FROM staff WHERE user_id = auth.uid() AND status = 'active'
        )
    );

CREATE POLICY "Users can update cash drawer sessions for their restaurant"
    ON cash_drawer_sessions FOR UPDATE
    USING (
        restaurant_id IN (
            SELECT id FROM restaurants WHERE owner_id = auth.uid()
            UNION
            SELECT restaurant_id FROM staff WHERE user_id = auth.uid() AND status = 'active'
        )
    );

-- Discounts
ALTER TABLE discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view discounts for their restaurant"
    ON discounts FOR SELECT
    USING (
        restaurant_id IN (
            SELECT id FROM restaurants WHERE owner_id = auth.uid()
            UNION
            SELECT restaurant_id FROM staff WHERE user_id = auth.uid() AND status = 'active'
        )
    );

CREATE POLICY "Owners can manage discounts"
    ON discounts FOR ALL
    USING (
        restaurant_id IN (
            SELECT id FROM restaurants WHERE owner_id = auth.uid()
        )
    );

-- Order Discounts
ALTER TABLE order_discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view order discounts for their restaurant"
    ON order_discounts FOR SELECT
    USING (
        restaurant_id IN (
            SELECT id FROM restaurants WHERE owner_id = auth.uid()
            UNION
            SELECT restaurant_id FROM staff WHERE user_id = auth.uid() AND status = 'active'
        )
    );

CREATE POLICY "Users can insert order discounts for their restaurant"
    ON order_discounts FOR INSERT
    WITH CHECK (
        restaurant_id IN (
            SELECT id FROM restaurants WHERE owner_id = auth.uid()
            UNION
            SELECT restaurant_id FROM staff WHERE user_id = auth.uid() AND status = 'active'
        )
    );

-- Refunds
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view refunds for their restaurant"
    ON refunds FOR SELECT
    USING (
        restaurant_id IN (
            SELECT id FROM restaurants WHERE owner_id = auth.uid()
            UNION
            SELECT restaurant_id FROM staff WHERE user_id = auth.uid() AND status = 'active'
        )
    );

CREATE POLICY "Users can insert refunds for their restaurant"
    ON refunds FOR INSERT
    WITH CHECK (
        restaurant_id IN (
            SELECT id FROM restaurants WHERE owner_id = auth.uid()
            UNION
            SELECT restaurant_id FROM staff WHERE user_id = auth.uid() AND status = 'active'
        )
    );

-- Voids
ALTER TABLE voids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view voids for their restaurant"
    ON voids FOR SELECT
    USING (
        restaurant_id IN (
            SELECT id FROM restaurants WHERE owner_id = auth.uid()
            UNION
            SELECT restaurant_id FROM staff WHERE user_id = auth.uid() AND status = 'active'
        )
    );

CREATE POLICY "Users can insert voids for their restaurant"
    ON voids FOR INSERT
    WITH CHECK (
        restaurant_id IN (
            SELECT id FROM restaurants WHERE owner_id = auth.uid()
            UNION
            SELECT restaurant_id FROM staff WHERE user_id = auth.uid() AND status = 'active'
        )
    );


-- ============================================================================
-- PART 9: HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate expected cash drawer amount
-- Called when closing the drawer to determine expected closing amount
CREATE OR REPLACE FUNCTION calculate_expected_drawer_amount(session_id UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    opening DECIMAL(10,2);
    cash_sales DECIMAL(10,2);
    cash_tips DECIMAL(10,2);
    cash_refunds DECIMAL(10,2);
BEGIN
    -- Get opening amount
    SELECT opening_amount INTO opening
    FROM cash_drawer_sessions
    WHERE id = session_id;

    -- Get total cash sales during this session
    SELECT COALESCE(SUM(total), 0) INTO cash_sales
    FROM orders
    WHERE cash_drawer_session_id = session_id
    AND payment_method = 'cash'
    AND paid = TRUE;

    -- Get total cash tips during this session
    SELECT COALESCE(SUM(tip_amount), 0) INTO cash_tips
    FROM orders
    WHERE cash_drawer_session_id = session_id
    AND payment_method = 'cash'
    AND paid = TRUE;

    -- Get total cash refunds during this session
    SELECT COALESCE(SUM(refund_amount), 0) INTO cash_refunds
    FROM refunds
    WHERE cash_drawer_session_id = session_id
    AND refund_method = 'cash';

    RETURN opening + cash_sales + cash_tips - cash_refunds;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION calculate_expected_drawer_amount IS
    'Calculates expected cash drawer closing amount based on opening + sales + tips - refunds';


-- Function to close a cash drawer session
CREATE OR REPLACE FUNCTION close_cash_drawer(
    p_session_id UUID,
    p_closing_amount DECIMAL(10,2),
    p_closed_by_name TEXT,
    p_closed_by_id UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS TABLE(
    expected DECIMAL(10,2),
    actual DECIMAL(10,2),
    variance DECIMAL(10,2)
) AS $$
DECLARE
    v_expected DECIMAL(10,2);
    v_variance DECIMAL(10,2);
BEGIN
    -- Calculate expected amount
    v_expected := calculate_expected_drawer_amount(p_session_id);
    v_variance := p_closing_amount - v_expected;

    -- Update the session
    UPDATE cash_drawer_sessions
    SET
        closed_at = NOW(),
        closing_amount = p_closing_amount,
        expected_amount = v_expected,
        variance = v_variance,
        closed_by_name = p_closed_by_name,
        closed_by_id = p_closed_by_id,
        notes = COALESCE(p_notes, notes),
        status = 'closed',
        updated_at = NOW()
    WHERE id = p_session_id;

    RETURN QUERY SELECT v_expected, p_closing_amount, v_variance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION close_cash_drawer IS
    'Closes a cash drawer session, calculating expected amount and variance';


-- Function to apply a discount to an order
CREATE OR REPLACE FUNCTION apply_order_discount(
    p_order_id UUID,
    p_discount_id UUID DEFAULT NULL,  -- NULL for manual discount
    p_discount_name TEXT DEFAULT NULL,
    p_discount_type TEXT DEFAULT NULL,
    p_discount_value DECIMAL(10,2) DEFAULT NULL,
    p_reason TEXT DEFAULT NULL,
    p_applied_by_name TEXT DEFAULT NULL,
    p_applied_by_id UUID DEFAULT NULL,
    p_approved_by_name TEXT DEFAULT NULL,
    p_approved_by_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_order RECORD;
    v_discount RECORD;
    v_amount_deducted DECIMAL(10,2);
    v_discount_record_id UUID;
BEGIN
    -- Get order details
    SELECT * INTO v_order FROM orders WHERE id = p_order_id;

    IF v_order IS NULL THEN
        RAISE EXCEPTION 'Order not found';
    END IF;

    -- If using a template discount, fetch its details
    IF p_discount_id IS NOT NULL THEN
        SELECT * INTO v_discount FROM discounts WHERE id = p_discount_id;

        IF v_discount IS NULL THEN
            RAISE EXCEPTION 'Discount template not found';
        END IF;

        p_discount_name := v_discount.name;
        p_discount_type := v_discount.type;
        p_discount_value := v_discount.value;
    END IF;

    -- Calculate amount to deduct
    IF p_discount_type = 'percentage' THEN
        -- Use subtotal if available, otherwise use total
        v_amount_deducted := ROUND(
            (COALESCE(v_order.subtotal, v_order.total) * p_discount_value / 100),
            2
        );
    ELSE
        -- Fixed amount discount
        v_amount_deducted := LEAST(p_discount_value, COALESCE(v_order.subtotal, v_order.total));
    END IF;

    -- Insert the discount record
    INSERT INTO order_discounts (
        order_id, restaurant_id, discount_id,
        discount_name, discount_type, discount_value,
        amount_deducted,
        applied_by_id, applied_by_name,
        reason,
        approved_by_id, approved_by_name,
        approved_at
    ) VALUES (
        p_order_id, v_order.restaurant_id, p_discount_id,
        p_discount_name, p_discount_type, p_discount_value,
        v_amount_deducted,
        p_applied_by_id, p_applied_by_name,
        p_reason,
        p_approved_by_id, p_approved_by_name,
        CASE WHEN p_approved_by_id IS NOT NULL THEN NOW() ELSE NULL END
    )
    RETURNING id INTO v_discount_record_id;

    -- Update order totals
    UPDATE orders
    SET
        discount_total = COALESCE(discount_total, 0) + v_amount_deducted,
        total = COALESCE(subtotal, total) - COALESCE(discount_total, 0) - v_amount_deducted + COALESCE(tax_amount, 0),
        updated_at = NOW()
    WHERE id = p_order_id;

    RETURN v_discount_record_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION apply_order_discount IS
    'Applies a discount to an order, supporting both template-based and manual discounts';


-- Function to process a refund
CREATE OR REPLACE FUNCTION process_refund(
    p_order_id UUID,
    p_refund_amount DECIMAL(10,2),
    p_refund_method TEXT,
    p_reason TEXT,
    p_processed_by_name TEXT,
    p_processed_by_id UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_approved_by_name TEXT DEFAULT NULL,
    p_approved_by_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_order RECORD;
    v_refund_id UUID;
    v_cash_drawer_session_id UUID;
BEGIN
    -- Get order details
    SELECT * INTO v_order FROM orders WHERE id = p_order_id;

    IF v_order IS NULL THEN
        RAISE EXCEPTION 'Order not found';
    END IF;

    IF NOT v_order.paid THEN
        RAISE EXCEPTION 'Cannot refund an unpaid order';
    END IF;

    -- Validate refund amount
    IF p_refund_amount > (v_order.total - COALESCE(v_order.refund_total, 0)) THEN
        RAISE EXCEPTION 'Refund amount exceeds remaining order total';
    END IF;

    -- If cash refund, find current open drawer session
    IF p_refund_method = 'cash' THEN
        SELECT id INTO v_cash_drawer_session_id
        FROM cash_drawer_sessions
        WHERE restaurant_id = v_order.restaurant_id
        AND status = 'open'
        LIMIT 1;
    END IF;

    -- Insert refund record
    INSERT INTO refunds (
        order_id, restaurant_id,
        refund_amount, refund_method,
        reason, notes,
        processed_by_id, processed_by_name,
        approved_by_id, approved_by_name,
        cash_drawer_session_id
    ) VALUES (
        p_order_id, v_order.restaurant_id,
        p_refund_amount, p_refund_method,
        p_reason, p_notes,
        p_processed_by_id, p_processed_by_name,
        p_approved_by_id, p_approved_by_name,
        v_cash_drawer_session_id
    )
    RETURNING id INTO v_refund_id;

    -- Update order refund total
    UPDATE orders
    SET
        refund_total = COALESCE(refund_total, 0) + p_refund_amount,
        updated_at = NOW()
    WHERE id = p_order_id;

    RETURN v_refund_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION process_refund IS
    'Processes a refund on a paid order, updating totals and linking to cash drawer if applicable';


-- Function to void an order item
CREATE OR REPLACE FUNCTION void_order_item(
    p_order_item_id UUID,
    p_reason TEXT,
    p_voided_by_name TEXT,
    p_voided_by_id UUID DEFAULT NULL,
    p_approved_by_name TEXT DEFAULT NULL,
    p_approved_by_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_item RECORD;
    v_order RECORD;
    v_void_id UUID;
    v_void_amount DECIMAL(10,2);
BEGIN
    -- Get item details
    SELECT * INTO v_item FROM order_items WHERE id = p_order_item_id;

    IF v_item IS NULL THEN
        RAISE EXCEPTION 'Order item not found';
    END IF;

    IF v_item.voided THEN
        RAISE EXCEPTION 'Item is already voided';
    END IF;

    -- Get order details
    SELECT * INTO v_order FROM orders WHERE id = v_item.order_id;

    IF v_order.paid THEN
        RAISE EXCEPTION 'Cannot void items on a paid order - use refund instead';
    END IF;

    -- Calculate void amount
    v_void_amount := v_item.quantity * v_item.price_at_time;

    -- Insert void record
    INSERT INTO voids (
        order_item_id, order_id, restaurant_id,
        item_name, quantity, price_at_time, void_amount,
        reason,
        voided_by_id, voided_by_name,
        approved_by_id, approved_by_name
    ) VALUES (
        p_order_item_id, v_item.order_id, v_order.restaurant_id,
        v_item.name, v_item.quantity, v_item.price_at_time, v_void_amount,
        p_reason,
        p_voided_by_id, p_voided_by_name,
        p_approved_by_id, p_approved_by_name
    )
    RETURNING id INTO v_void_id;

    -- Mark item as voided
    UPDATE order_items
    SET
        voided = TRUE,
        voided_at = NOW()
    WHERE id = p_order_item_id;

    -- Update order total (subtract voided amount)
    UPDATE orders
    SET
        subtotal = COALESCE(subtotal, total) - v_void_amount,
        total = COALESCE(subtotal, total) - v_void_amount - COALESCE(discount_total, 0) + COALESCE(tax_amount, 0),
        updated_at = NOW()
    WHERE id = v_item.order_id;

    RETURN v_void_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION void_order_item IS
    'Voids an order item before payment, maintaining audit trail';


-- ============================================================================
-- PART 10: UPDATE TRIGGERS
-- ============================================================================

-- Trigger to update updated_at on cash_drawer_sessions
CREATE OR REPLACE FUNCTION update_cash_drawer_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cash_drawer_sessions_updated_at ON cash_drawer_sessions;
CREATE TRIGGER cash_drawer_sessions_updated_at
    BEFORE UPDATE ON cash_drawer_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_cash_drawer_sessions_updated_at();

-- Trigger to update updated_at on discounts
CREATE OR REPLACE FUNCTION update_discounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS discounts_updated_at ON discounts;
CREATE TRIGGER discounts_updated_at
    BEFORE UPDATE ON discounts
    FOR EACH ROW
    EXECUTE FUNCTION update_discounts_updated_at();


-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Summary of changes:
--
-- New Tables:
--   - cash_drawer_sessions: Track cash drawer open/close cycles
--   - discounts: Pre-defined discount templates
--   - order_discounts: Applied discounts per order
--   - refunds: Refund records with audit trail
--   - voids: Voided items with audit trail
--
-- Modified Tables:
--   - orders: Added subtotal, discount_total, tax_amount, refund_total, cash_drawer_session_id
--   - order_items: Added voided, voided_at
--
-- New Functions:
--   - calculate_expected_drawer_amount(): Calculate expected drawer closing
--   - close_cash_drawer(): Close drawer session with variance calculation
--   - apply_order_discount(): Apply discount to order
--   - process_refund(): Process refund on paid order
--   - void_order_item(): Void item from unpaid order
-- ============================================================================
