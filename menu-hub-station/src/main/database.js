const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

let db = null;

function initializeDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'menuhub-station.db');
  console.log('[Database] Initializing at:', dbPath);

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  // Create tables
  createTables();

  return {
    // Orders
    insertOrder: (order) => insertOrder(order),
    updateOrder: (clientId, updates) => updateOrder(clientId, updates),
    getOrders: (filter = {}) => getOrders(filter),
    getOrder: (clientId) => getOrder(clientId),
    deleteOrder: (clientId) => deleteOrder(clientId),

    // Order Items
    insertOrderItems: (items) => insertOrderItems(items),
    getOrderItems: (orderClientId) => getOrderItems(orderClientId),

    // Sync tracking
    markAsSynced: (clientId) => markAsSynced(clientId),
    getPendingSync: () => getPendingSync(),

    // Cleanup
    close: () => db.close()
  };
}

function createTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      client_id TEXT PRIMARY KEY,
      supabase_id TEXT UNIQUE,
      restaurant_id TEXT NOT NULL,
      table_id TEXT,
      total REAL NOT NULL,
      status TEXT NOT NULL,
      order_type TEXT NOT NULL,
      customer_name TEXT,
      customer_email TEXT,
      customer_phone TEXT,
      notes TEXT,
      paid INTEGER DEFAULT 0,
      payment_method TEXT,
      payment_taken_by_name TEXT,
      payment_taken_at TEXT,
      pickup_code TEXT,
      ready_for_pickup INTEGER DEFAULT 0,
      picked_up_at TEXT,
      locale TEXT DEFAULT 'en',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      synced INTEGER DEFAULT 0,
      sync_attempts INTEGER DEFAULT 0,
      last_sync_attempt TEXT
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_client_id TEXT NOT NULL,
      menu_item_id TEXT NOT NULL,
      name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price_at_time REAL NOT NULL,
      department TEXT,
      special_instructions TEXT,
      preparing_started_at TEXT,
      marked_ready_at TEXT,
      delivered_at TEXT,
      FOREIGN KEY (order_client_id) REFERENCES orders(client_id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_orders_restaurant ON orders(restaurant_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_synced ON orders(synced);
    CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
    CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_client_id);
  `);

  console.log('[Database] Tables created successfully');
}

// Order operations
function insertOrder(order) {
  const stmt = db.prepare(`
    INSERT INTO orders (
      client_id, restaurant_id, table_id, total, status, order_type,
      customer_name, customer_email, customer_phone, notes,
      paid, payment_method, locale, created_at, updated_at
    ) VALUES (
      @client_id, @restaurant_id, @table_id, @total, @status, @order_type,
      @customer_name, @customer_email, @customer_phone, @notes,
      @paid, @payment_method, @locale, @created_at, @updated_at
    )
  `);

  const result = stmt.run({
    client_id: order.client_id,
    restaurant_id: order.restaurant_id,
    table_id: order.table_id || null,
    total: order.total,
    status: order.status,
    order_type: order.order_type,
    customer_name: order.customer_name || null,
    customer_email: order.customer_email || null,
    customer_phone: order.customer_phone || null,
    notes: order.notes || null,
    paid: order.paid ? 1 : 0,
    payment_method: order.payment_method || null,
    locale: order.locale || 'en',
    created_at: order.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  console.log('[Database] Order inserted:', order.client_id);
  return result;
}

function updateOrder(clientId, updates) {
  const fields = Object.keys(updates)
    .filter(key => key !== 'client_id')
    .map(key => `${key} = @${key}`)
    .join(', ');

  const stmt = db.prepare(`
    UPDATE orders
    SET ${fields}, updated_at = @updated_at
    WHERE client_id = @client_id
  `);

  const result = stmt.run({
    ...updates,
    client_id: clientId,
    updated_at: new Date().toISOString()
  });

  console.log('[Database] Order updated:', clientId);
  return result;
}

function getOrders(filter = {}) {
  let query = 'SELECT * FROM orders WHERE 1=1';
  const params = {};

  if (filter.restaurant_id) {
    query += ' AND restaurant_id = @restaurant_id';
    params.restaurant_id = filter.restaurant_id;
  }

  if (filter.status) {
    query += ' AND status = @status';
    params.status = filter.status;
  }

  if (filter.synced !== undefined) {
    query += ' AND synced = @synced';
    params.synced = filter.synced ? 1 : 0;
  }

  query += ' ORDER BY created_at DESC';

  const stmt = db.prepare(query);
  return stmt.all(params);
}

function getOrder(clientId) {
  const stmt = db.prepare('SELECT * FROM orders WHERE client_id = ?');
  return stmt.get(clientId);
}

function deleteOrder(clientId) {
  const stmt = db.prepare('DELETE FROM orders WHERE client_id = ?');
  return stmt.run(clientId);
}

// Order items operations
function insertOrderItems(items) {
  const stmt = db.prepare(`
    INSERT INTO order_items (
      order_client_id, menu_item_id, name, quantity, price_at_time, department, special_instructions
    ) VALUES (
      @order_client_id, @menu_item_id, @name, @quantity, @price_at_time, @department, @special_instructions
    )
  `);

  const insertMany = db.transaction((items) => {
    for (const item of items) {
      stmt.run({
        ...item,
        special_instructions: item.special_instructions || null
      });
    }
  });

  insertMany(items);
  console.log(`[Database] Inserted ${items.length} order items`);
}

function getOrderItems(orderClientId) {
  const stmt = db.prepare('SELECT * FROM order_items WHERE order_client_id = ?');
  return stmt.all(orderClientId);
}

// Sync operations
function markAsSynced(clientId, supabaseId = null) {
  const updates = {
    synced: 1,
    last_sync_attempt: new Date().toISOString()
  };

  if (supabaseId) {
    updates.supabase_id = supabaseId;
  }

  const stmt = db.prepare(`
    UPDATE orders
    SET synced = @synced,
        supabase_id = COALESCE(@supabase_id, supabase_id),
        last_sync_attempt = @last_sync_attempt
    WHERE client_id = @client_id
  `);

  stmt.run({
    ...updates,
    client_id: clientId
  });

  console.log('[Database] Order marked as synced:', clientId);
}

function getPendingSync() {
  const stmt = db.prepare(`
    SELECT * FROM orders
    WHERE synced = 0
    ORDER BY created_at ASC
  `);
  return stmt.all();
}

module.exports = {
  initializeDatabase
};
