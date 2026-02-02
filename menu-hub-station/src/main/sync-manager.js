const { createClient } = require('@supabase/supabase-js');

let supabase = null;

function initializeSupabase() {
  // These should come from environment variables or config
  // For now, using placeholder - will need to be configured on first run
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn('[Sync] Supabase credentials not configured');
    return null;
  }

  supabase = createClient(supabaseUrl, supabaseKey);
  return supabase;
}

async function syncWithSupabase(serverState) {
  if (!supabase) {
    supabase = initializeSupabase();
    if (!supabase) {
      console.log('[Sync] Skipping sync - Supabase not configured');
      return;
    }
  }

  console.log('[Sync] Starting sync with Supabase...');

  try {
    // Get pending orders
    const pendingOrders = serverState.db.getPendingSync();

    if (pendingOrders.length === 0) {
      console.log('[Sync] No pending orders to sync');
      return;
    }

    console.log(`[Sync] Found ${pendingOrders.length} orders to sync`);

    for (const order of pendingOrders) {
      try {
        await syncOrder(order, serverState);
      } catch (error) {
        console.error(`[Sync] Failed to sync order ${order.client_id}:`, error);

        // Update sync attempts
        serverState.db.updateOrder(order.client_id, {
          sync_attempts: order.sync_attempts + 1,
          last_sync_attempt: new Date().toISOString()
        });
      }
    }

    console.log('[Sync] Sync completed');

  } catch (error) {
    console.error('[Sync] Sync failed:', error);
    throw error;
  }
}

async function syncOrder(order, serverState) {
  // Check if order already exists in Supabase (deduplication)
  const { data: existing } = await supabase
    .from('orders')
    .select('id')
    .eq('client_id', order.client_id)
    .single();

  if (existing) {
    console.log(`[Sync] Order ${order.client_id} already exists in Supabase, marking as synced`);
    serverState.db.markAsSynced(order.client_id, existing.id);
    return;
  }

  // Get order items
  const items = serverState.db.getOrderItems(order.client_id);

  // Insert order
  const { data: insertedOrder, error: orderError } = await supabase
    .from('orders')
    .insert({
      client_id: order.client_id,
      restaurant_id: order.restaurant_id,
      table_id: order.table_id,
      total: order.total,
      status: order.status,
      order_type: order.order_type,
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      customer_phone: order.customer_phone,
      notes: order.notes,
      paid: order.paid === 1,
      payment_method: order.payment_method,
      payment_taken_by_name: order.payment_taken_by_name,
      payment_taken_at: order.payment_taken_at,
      pickup_code: order.pickup_code,
      ready_for_pickup: order.ready_for_pickup === 1,
      picked_up_at: order.picked_up_at,
      locale: order.locale,
      created_at: order.created_at
    })
    .select()
    .single();

  if (orderError) {
    throw new Error(`Failed to insert order: ${orderError.message}`);
  }

  console.log(`[Sync] Order ${order.client_id} inserted into Supabase with id ${insertedOrder.id}`);

  // Insert order items
  if (items.length > 0) {
    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(
        items.map(item => ({
          order_id: insertedOrder.id,
          menu_item_id: item.menu_item_id,
          name: item.name,
          quantity: item.quantity,
          price_at_time: item.price_at_time,
          department: item.department,
          preparing_started_at: item.preparing_started_at,
          marked_ready_at: item.marked_ready_at,
          delivered_at: item.delivered_at
        }))
      );

    if (itemsError) {
      throw new Error(`Failed to insert order items: ${itemsError.message}`);
    }

    console.log(`[Sync] Inserted ${items.length} order items for order ${order.client_id}`);
  }

  // Mark as synced in local database
  serverState.db.markAsSynced(order.client_id, insertedOrder.id);

  // Send confirmation email if needed (takeaway orders)
  if (order.order_type === 'takeaway' && order.customer_email) {
    await sendOrderConfirmationEmail(order, items);
  }
}

async function sendOrderConfirmationEmail(order, items) {
  try {
    // Call the same API endpoint that the main app uses
    // This would need the actual URL of your deployed app
    console.log(`[Sync] Sending confirmation email for order ${order.client_id}`);

    // TODO: Implement email sending
    // This should call your existing takeaway order confirmation endpoint

  } catch (error) {
    console.error('[Sync] Failed to send confirmation email:', error);
    // Don't fail the sync if email fails
  }
}

module.exports = {
  initializeSupabase,
  syncWithSupabase
};
