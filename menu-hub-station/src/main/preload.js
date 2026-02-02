const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Get server state
  getServerState: () => ipcRenderer.invoke('get-server-state'),

  // Get orders from local database
  getOrders: () => ipcRenderer.invoke('get-orders'),

  // Force sync with Supabase
  forceSync: () => ipcRenderer.invoke('force-sync'),

  // Listen for state updates
  onStateUpdate: (callback) => {
    ipcRenderer.on('state-update', (event, data) => callback(data));
  },

  // Listen for new orders
  onNewOrder: (callback) => {
    ipcRenderer.on('new-order', (event, order) => callback(order));
  },

  // Listen for order updates
  onOrderUpdate: (callback) => {
    ipcRenderer.on('order-update', (event, update) => callback(update));
  }
});
