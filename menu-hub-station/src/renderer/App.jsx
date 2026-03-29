import React, { useState, useEffect } from 'react';
import './styles.css';

export default function App() {
  const [serverState, setServerState] = useState({
    isOnline: false,
    connectedDevices: [],
    lastSync: null,
    serverRunning: false,
    autoStart: true,
  });
  const [orders, setOrders] = useState([]);
  const [localIPs, setLocalIPs] = useState([]);
  const [activity, setActivity] = useState([]);
  const [syncing, setSyncing] = useState(false);

  // First-run setup: Supabase credentials
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [credentialsSaved, setCredentialsSaved] = useState(false);
  const [savingCreds, setSavingCreds] = useState(false);

  useEffect(() => {
    loadServerState();
    loadOrders();

    window.electronAPI.getLocalAddresses().then(setLocalIPs).catch(() => {});

    const cleanupState = window.electronAPI.onStateUpdate((data) => {
      setServerState(data);
    });

    const cleanupOrder = window.electronAPI.onNewOrder((order) => {
      setOrders(prev => [order, ...prev].slice(0, 20));
      addActivity('new_order', `New order: table ${order.table_id || 'takeaway'} — ${formatMoney(order.total)}`);
    });

    const cleanupUpdate = window.electronAPI.onOrderUpdate((update) => {
      addActivity('order_update', `Order update: ${update.clientId?.slice(0, 8)}...`);
    });

    const interval = setInterval(loadOrders, 10000);

    return () => {
      if (typeof cleanupState === 'function') cleanupState();
      if (typeof cleanupOrder === 'function') cleanupOrder();
      if (typeof cleanupUpdate === 'function') cleanupUpdate();
      clearInterval(interval);
    };
  }, []);

  async function loadServerState() {
    const state = await window.electronAPI.getServerState();
    setServerState(state);
  }

  async function loadOrders() {
    const all = await window.electronAPI.getOrders();
    setOrders(all.slice(0, 20));
  }

  async function handleForceSync() {
    setSyncing(true);
    const result = await window.electronAPI.forceSync();
    addActivity(result.success ? 'sync' : 'error',
      result.success ? 'Manual sync completed' : 'Sync failed: ' + result.error);
    setSyncing(false);
  }

  async function handleToggleAutoStart(enable) {
    await window.electronAPI.setAutoStart(enable);
    setServerState(prev => ({ ...prev, autoStart: enable }));
    addActivity('info', `Auto-start on login ${enable ? 'enabled' : 'disabled'}`);
  }

  async function handleSaveCredentials() {
    if (!supabaseUrl.trim() || !supabaseKey.trim()) return;
    setSavingCreds(true);
    await window.electronAPI.setSupabaseCredentials(supabaseUrl.trim(), supabaseKey.trim());
    setCredentialsSaved(true);
    setSavingCreds(false);
    addActivity('sync', 'Supabase credentials saved — sync enabled');
    // Trigger a sync immediately
    setTimeout(() => window.electronAPI.forceSync(), 1000);
  }

  function addActivity(type, message) {
    const icons = { new_order: '📥', order_update: '🔄', sync: '☁️', error: '⚠️', info: 'ℹ️' };
    setActivity(prev => [{
      type, message,
      icon: icons[type] || '📝',
      timestamp: new Date().toISOString()
    }, ...prev].slice(0, 30));
  }

  function formatTime(ts) {
    if (!ts) return 'Never';
    const d = new Date(ts), now = new Date(), diff = Math.floor((now - d) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleTimeString();
  }

  function formatMoney(n) {
    return typeof n === 'number' ? `£${n.toFixed(2)}` : '';
  }

  const pending = orders.filter(o => !o.synced).length;
  const synced = orders.filter(o => o.synced).length;

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="logo-section">
            <div className="logo">🍽️</div>
            <div>
              <h1>Menu Hub Station</h1>
              <p className="subtitle">Local hub — always running in the background</p>
            </div>
          </div>

          <div className="status-section">
            <div className={`status-badge ${serverState.isOnline ? 'online' : 'offline'}`}>
              <div className={`status-dot ${serverState.isOnline ? 'online' : 'offline'}`} />
              {serverState.isOnline ? 'Online' : 'Offline'}
            </div>
            <div className={`status-badge ${serverState.serverRunning ? 'online' : 'offline'}`}>
              <div className={`status-dot ${serverState.serverRunning ? 'online' : 'offline'}`} />
              Hub {serverState.serverRunning ? 'Running' : 'Stopped'}
            </div>
          </div>
        </div>
      </header>

      <div className="main-content">

        {/* ── Local network info ── */}
        <div className="card">
          <div className="card-header">
            <span className="card-icon">📡</span>
            <h2>This device on your network</h2>
          </div>
          {localIPs.length > 0 ? (
            <div className="info-grid">
              {localIPs.map(ip => (
                <div key={ip} className="info-item">
                  <div className="info-label">Hub address</div>
                  <div className="info-value mono">ws://{ip}:3001</div>
                </div>
              ))}
              <div className="info-item">
                <div className="info-label">Staff devices</div>
                <div className="info-value">Connect automatically on same WiFi</div>
              </div>
            </div>
          ) : (
            <p style={{ color: '#888', fontSize: 14 }}>Detecting local IP...</p>
          )}
        </div>

        {/* ── Connected devices ── */}
        <div className="card">
          <div className="card-header">
            <span className="card-icon">📱</span>
            <h2>Connected devices ({serverState.connectedDevices.length})</h2>
          </div>
          {serverState.connectedDevices.length === 0 ? (
            <div className="no-devices">
              <div className="no-devices-icon">📡</div>
              <p>No staff devices connected yet</p>
              <p style={{ fontSize: 13, marginTop: 8, color: '#666' }}>
                When staff open the app on the same WiFi, they appear here automatically.
              </p>
            </div>
          ) : (
            <div className="devices-list">
              {serverState.connectedDevices.map((d, i) => (
                <div key={d.deviceId || i} className="device-item">
                  <div className="device-info">
                    <h3>{d.deviceName}</h3>
                    <div className="device-meta">Connected {formatTime(d.connectedAt)}</div>
                  </div>
                  <span className={`device-role ${d.deviceRole}`}>{d.deviceRole}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Orders overview ── */}
        <div className="card">
          <div className="card-header">
            <span className="card-icon">📋</span>
            <h2>Orders</h2>
            <button
              className="sync-button"
              onClick={handleForceSync}
              disabled={!serverState.isOnline || syncing}
              style={{ marginLeft: 'auto' }}
            >
              {syncing ? '⏳ Syncing...' : '☁️ Sync now'}
            </button>
          </div>

          <div className="orders-stats">
            <div className="stat-box">
              <div className="stat-value" style={{ color: '#fbbf24' }}>{pending}</div>
              <div className="stat-label">Pending</div>
            </div>
            <div className="stat-box">
              <div className="stat-value" style={{ color: '#10b981' }}>{synced}</div>
              <div className="stat-label">Synced</div>
            </div>
            <div className="stat-box">
              <div className="stat-value" style={{ color: '#3b82f6' }}>{orders.length}</div>
              <div className="stat-label">Total</div>
            </div>
          </div>

          {serverState.lastSync && (
            <p style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
              Last sync: {formatTime(serverState.lastSync)}
            </p>
          )}
        </div>

        {/* ── Settings ── */}
        <div className="card">
          <div className="card-header">
            <span className="card-icon">⚙️</span>
            <h2>Settings</h2>
          </div>

          {/* Auto-start toggle */}
          <div className="setting-row">
            <div>
              <div className="setting-label">Start automatically with computer</div>
              <div className="setting-desc">
                Hub starts silently in the background when the device turns on. Recommended.
              </div>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={serverState.autoStart}
                onChange={e => handleToggleAutoStart(e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>

          {/* Supabase credentials */}
          <div className="setting-section">
            <div className="setting-label" style={{ marginBottom: 8 }}>
              Cloud sync credentials {credentialsSaved && <span className="badge-green">Saved ✓</span>}
            </div>
            <div className="setting-desc" style={{ marginBottom: 12 }}>
              Enter your Supabase project URL and anon key so orders are synced to the cloud when internet is available.
              You only need to do this once.
            </div>
            <input
              className="input-field"
              type="text"
              placeholder="https://xxxx.supabase.co"
              value={supabaseUrl}
              onChange={e => setSupabaseUrl(e.target.value)}
            />
            <input
              className="input-field"
              type="password"
              placeholder="Supabase anon key"
              value={supabaseKey}
              onChange={e => setSupabaseKey(e.target.value)}
              style={{ marginTop: 8 }}
            />
            <button
              className="sync-button"
              style={{ marginTop: 10, width: '100%' }}
              disabled={!supabaseUrl || !supabaseKey || savingCreds}
              onClick={handleSaveCredentials}
            >
              {savingCreds ? 'Saving...' : 'Save & start syncing'}
            </button>
          </div>
        </div>

        {/* ── Activity feed ── */}
        <div className="card">
          <div className="card-header">
            <span className="card-icon">📊</span>
            <h2>Activity</h2>
          </div>
          {activity.length === 0 ? (
            <div className="no-devices">
              <div className="no-devices-icon">📡</div>
              <p>No activity yet — waiting for orders</p>
            </div>
          ) : (
            <div className="activity-feed">
              {activity.map((item, i) => (
                <div key={i} className="activity-item">
                  <div className="activity-icon">{item.icon}</div>
                  <div className="activity-content">
                    <div className="activity-message">{item.message}</div>
                    <div className="activity-time">{formatTime(item.timestamp)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
