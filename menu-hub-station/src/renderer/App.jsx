import React, { useState, useEffect } from 'react';

function App() {
  const [serverState, setServerState] = useState({
    isOnline: false,
    connectedDevices: [],
    lastSync: null,
    serverRunning: false
  });
  const [orders, setOrders] = useState([]);
  const [activity, setActivity] = useState([]);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    // Load initial state
    loadServerState();

    // Listen for state updates
    window.electronAPI.onStateUpdate((data) => {
      setServerState(data);
    });

    // Listen for new orders
    window.electronAPI.onNewOrder((order) => {
      setOrders(prev => [order, ...prev].slice(0, 10));
      addActivity('new_order', `New order received: ${order.client_id.slice(0, 8)}...`);
    });

    // Listen for order updates
    window.electronAPI.onOrderUpdate((update) => {
      addActivity('order_update', `Order updated: ${update.clientId.slice(0, 8)}...`);
    });

    // Load orders periodically
    const interval = setInterval(loadOrders, 5000);

    return () => clearInterval(interval);
  }, []);

  async function loadServerState() {
    const state = await window.electronAPI.getServerState();
    setServerState(state);
  }

  async function loadOrders() {
    const allOrders = await window.electronAPI.getOrders();
    setOrders(allOrders.slice(0, 10));
  }

  async function handleForceSync() {
    setSyncing(true);
    try {
      const result = await window.electronAPI.forceSync();
      if (result.success) {
        addActivity('sync', 'Manual sync completed successfully');
      } else {
        addActivity('error', 'Sync failed: ' + result.error);
      }
    } catch (error) {
      addActivity('error', 'Sync error: ' + error.message);
    } finally {
      setSyncing(false);
    }
  }

  function addActivity(type, message) {
    const icons = {
      new_order: '📥',
      order_update: '🔄',
      sync: '☁️',
      error: '⚠️'
    };

    setActivity(prev => [{
      type,
      icon: icons[type] || '📝',
      message,
      timestamp: new Date().toISOString()
    }, ...prev].slice(0, 20));
  }

  function formatTime(timestamp) {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
  }

  const pendingOrders = orders.filter(o => !o.synced);
  const syncedOrders = orders.filter(o => o.synced);

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="logo-section">
            <div className="logo">🍽️</div>
            <div className="title-group">
              <h1>Menu Hub Station</h1>
              <p className="subtitle">Local Network Coordinator</p>
            </div>
          </div>

          <div className="status-section">
            <div className={`status-badge ${serverState.isOnline ? 'online' : 'offline'}`}>
              <div className={`status-dot ${serverState.isOnline ? 'online' : 'offline'}`} />
              {serverState.isOnline ? 'Online' : 'Offline'}
            </div>

            <button
              className="sync-button"
              onClick={handleForceSync}
              disabled={!serverState.isOnline || syncing}
            >
              {syncing ? '⏳ Syncing...' : '☁️ Force Sync'}
            </button>
          </div>
        </div>
      </header>

      <div className="main-content">
        {/* Connected Devices */}
        <div className="card">
          <div className="card-header">
            <span className="card-icon">📱</span>
            <h2>Connected Devices</h2>
          </div>

          {serverState.connectedDevices.length === 0 ? (
            <div className="no-devices">
              <div className="no-devices-icon">📡</div>
              <p>No devices connected</p>
              <p style={{ fontSize: '13px', marginTop: '8px', color: '#666' }}>
                Waiting for staff devices to connect...
              </p>
            </div>
          ) : (
            <div className="devices-list">
              {serverState.connectedDevices.map((device, index) => (
                <div key={device.deviceId || index} className="device-item">
                  <div className="device-info">
                    <h3>{device.deviceName}</h3>
                    <div className="device-meta">
                      Connected {formatTime(device.connectedAt)}
                    </div>
                  </div>
                  <span className={`device-role ${device.deviceRole}`}>
                    {device.deviceRole}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Orders Overview */}
        <div className="card">
          <div className="card-header">
            <span className="card-icon">📋</span>
            <h2>Orders Overview</h2>
          </div>

          <div className="orders-stats">
            <div className="stat-box">
              <div className="stat-value" style={{ color: '#fbbf24' }}>
                {pendingOrders.length}
              </div>
              <div className="stat-label">Pending Sync</div>
            </div>
            <div className="stat-box">
              <div className="stat-value" style={{ color: '#10b981' }}>
                {syncedOrders.length}
              </div>
              <div className="stat-label">Synced</div>
            </div>
            <div className="stat-box">
              <div className="stat-value" style={{ color: '#3b82f6' }}>
                {orders.length}
              </div>
              <div className="stat-label">Total</div>
            </div>
          </div>

          {orders.length > 0 && (
            <div className="orders-list">
              {orders.slice(0, 5).map((order) => (
                <div key={order.client_id} className="order-item">
                  <div className="order-header">
                    <span className="order-id">
                      #{order.client_id.slice(0, 8)}
                    </span>
                    <span className={`order-status ${order.status}`}>
                      {order.status}
                    </span>
                  </div>
                  <div className="order-details">
                    ${order.total.toFixed(2)} • {order.order_type} •
                    {order.synced ? ' ✓ Synced' : ' ⏳ Pending'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div className="card">
          <div className="card-header">
            <span className="card-icon">📊</span>
            <h2>Activity Feed</h2>
          </div>

          {activity.length === 0 ? (
            <div className="no-devices">
              <div className="no-devices-icon">📡</div>
              <p>No activity yet</p>
            </div>
          ) : (
            <div className="activity-feed">
              {activity.map((item, index) => (
                <div key={index} className="activity-item">
                  <div className="activity-icon">{item.icon}</div>
                  <div className="activity-content">
                    <div className="activity-message">{item.message}</div>
                    <div className="activity-time">
                      {formatTime(item.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* System Info */}
        <div className="card">
          <div className="card-header">
            <span className="card-icon">ℹ️</span>
            <h2>System Info</h2>
          </div>

          <div className="info-grid">
            <div className="info-item">
              <div className="info-label">WebSocket Server</div>
              <div className="info-value">
                {serverState.serverRunning ? '🟢 Running on port 3001' : '🔴 Not running'}
              </div>
            </div>

            <div className="info-item">
              <div className="info-label">Last Sync</div>
              <div className="info-value">
                {formatTime(serverState.lastSync)}
              </div>
            </div>

            <div className="info-item">
              <div className="info-label">Connection Status</div>
              <div className="info-value">
                {serverState.isOnline ? '🟢 Connected to Internet' : '🔴 Offline Mode'}
              </div>
            </div>

            <div className="info-item">
              <div className="info-label">Discovery Service</div>
              <div className="info-value">
                🟢 Broadcasting on local network
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
