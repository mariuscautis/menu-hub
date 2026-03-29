const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // State
  getServerState: () => ipcRenderer.invoke('get-server-state'),
  getOrders: () => ipcRenderer.invoke('get-orders'),
  getLocalAddresses: () => ipcRenderer.invoke('get-local-addresses'),

  // Actions
  forceSync: () => ipcRenderer.invoke('force-sync'),
  setAutoStart: (enable) => ipcRenderer.invoke('set-auto-start', enable),
  setSupabaseCredentials: (url, key) => ipcRenderer.invoke('set-supabase-credentials', { url, key }),

  // Events
  onStateUpdate: (callback) => {
    ipcRenderer.on('state-update', (_, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('state-update');
  },
  onNewOrder: (callback) => {
    ipcRenderer.on('new-order', (_, order) => callback(order));
    return () => ipcRenderer.removeAllListeners('new-order');
  },
  onOrderUpdate: (callback) => {
    ipcRenderer.on('order-update', (_, update) => callback(update));
    return () => ipcRenderer.removeAllListeners('order-update');
  },
});
