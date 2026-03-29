const { createClient } = require('@supabase/supabase-js');
const { app } = require('electron');
const fs = require('fs');
const path = require('path');

let supabase = null;
let credentialsPath = null;

// ─── Credentials persistence ────────────────────────────────────────────────
function getCredentialsPath() {
  if (!credentialsPath) {
    credentialsPath = path.join(app.getPath('userData'), 'supabase-config.json');
  }
  return credentialsPath;
}

function loadSavedCredentials() {
  try {
    const raw = fs.readFileSync(getCredentialsPath(), 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveCredentials(url, key) {
  try {
    fs.writeFileSync(getCredentialsPath(), JSON.stringify({ url, key }), 'utf8');
  } catch (err) {
    console.error('[Sync] Failed to save credentials:', err.message);
  }
}

/**
 * Set Supabase credentials at runtime (called from IPC when PWA sends them).
 * Persists them to disk so they survive restarts.
 */
function setSupabaseCredentials(url, key) {
  if (!url || !key) {
    console.warn('[Sync] setSupabaseCredentials: missing url or key');
    return;
  }
  saveCredentials(url, key);
  supabase = createClient(url, key);
  console.log('[Sync] Supabase credentials updated and saved');
}

function getSupabaseClient() {
  if (supabase) return supabase;

  // Try env vars first
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (url && key) {
    supabase = createClient(url, key);
    return supabase;
  }

  // Try saved credentials
  const saved = loadSavedCredentials();
  if (saved?.url && saved?.key) {
    supabase = createClient(saved.url, saved.key);
    console.log('[Sync] Loaded saved Supabase credentials');
    return supabase;
  }

  return null;
}

// ─── Sync ───────────────────────────────────────────────────────────────────
async function syncWithSupabase(serverState) {
  const client = getSupabaseClient();
  if (!client) {
    console.log('[Sync] Skipping sync — Supabase credentials not configured');
    return;
  }

  console.log('[Sync] Starting sync with Supabase...');

  try {
    const pendingOrders = serverState.db.getPendingSync();

    if (pendingOrders.length === 0) {
      console.log('[Sync] No pending orders to sync');
      return;
    }

    console.log(`[Sync] Found ${pendingOrders.length} orders to sync`);

    for (const order of pendingOrders) {
      try {
        await syncOrder(order, serverState, client);
      } catch (error) {
        console.error(`[Sync] Failed to sync order ${order.client_id}:`, error);
        serverState.db.updateOrder(order.client_id, {
          sync_attempts: (order.sync_attempts || 0) + 1,
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

async function syncOrder(order, serverState, client) {
  // Deduplication by client_id
  const { data: existing } = await client
    .from('orders')
    .select('id')
    .eq('client_id', order.client_id)
    .maybeSingle();

  if (existing) {
    console.log(`[Sync] Order ${order.client_id} already in Supabase, marking synced`);
    serverState.db.markAsSynced(order.client_id, existing.id);
    return;
  }

  const items = serverState.db.getOrderItems(order.client_id);

  const { data: insertedOrder, error: orderError } = await client
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

  if (orderError) throw new Error(`Order insert failed: ${orderError.message}`);

  console.log(`[Sync] Order ${order.client_id} → Supabase id ${insertedOrder.id}`);

  if (items.length > 0) {
    const { error: itemsError } = await client
      .from('order_items')
      .insert(items.map(item => ({
        order_id: insertedOrder.id,
        menu_item_id: item.menu_item_id,
        name: item.name,
        quantity: item.quantity,
        price_at_time: item.price_at_time,
        department: item.department,
        preparing_started_at: item.preparing_started_at,
        marked_ready_at: item.marked_ready_at,
        delivered_at: item.delivered_at
      })));

    if (itemsError) throw new Error(`Items insert failed: ${itemsError.message}`);
  }

  serverState.db.markAsSynced(order.client_id, insertedOrder.id);

  // Send confirmation email for takeaway orders
  if (order.order_type === 'takeaway' && order.customer_email) {
    await sendOrderConfirmationEmail(order, items, client);
  }
}

async function sendOrderConfirmationEmail(order, items, client) {
  try {
    // Best-effort — use the same API endpoint as the main app
    // The app URL is stored in env or can be configured later
    const appUrl = process.env.APP_URL || 'https://venoapp.com';
    await fetch(`${appUrl}/api/takeaway/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: order.client_id,
        restaurantId: order.restaurant_id,
        locale: order.locale,
      }),
    });
    console.log(`[Sync] Confirmation email sent for ${order.client_id}`);
  } catch (error) {
    console.warn('[Sync] Email send failed (non-blocking):', error.message);
  }
}

module.exports = {
  syncWithSupabase,
  setSupabaseCredentials,
  getSupabaseClient,
};
