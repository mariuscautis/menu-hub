const Bonjour = require('bonjour-service');
const os = require('os');

let bonjourInstance = null;
let service = null;

function startDiscoveryService() {
  return new Promise((resolve, reject) => {
    try {
      bonjourInstance = new Bonjour.Bonjour();

      // Get local IP addresses
      const interfaces = os.networkInterfaces();
      const addresses = [];

      for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
          // Skip internal and non-IPv4 addresses
          if (!iface.internal && iface.family === 'IPv4') {
            addresses.push(iface.address);
          }
        }
      }

      const primaryAddress = addresses[0] || 'localhost';

      console.log('[Discovery] Local IP addresses:', addresses);

      // Publish the service
      service = bonjourInstance.publish({
        name: 'Menu Hub Station',
        type: 'menuhub-station',
        port: 3001,
        txt: {
          version: '1.0.0',
          protocol: 'ws',
          features: 'offline-sync,real-time'
        }
      });

      service.on('up', () => {
        console.log('[Discovery] Service published successfully');
        console.log(`[Discovery] Devices can connect at: ws://${primaryAddress}:3001`);
        resolve({
          instance: bonjourInstance,
          service,
          addresses,
          destroy: () => {
            if (service) {
              bonjourInstance.unpublishAll(() => {
                bonjourInstance.destroy();
                console.log('[Discovery] Service unpublished');
              });
            }
          }
        });
      });

      service.on('error', (error) => {
        console.error('[Discovery] Service error:', error);
        reject(error);
      });

    } catch (error) {
      console.error('[Discovery] Failed to start:', error);
      reject(error);
    }
  });
}

function getLocalAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (!iface.internal && iface.family === 'IPv4') {
        addresses.push(iface.address);
      }
    }
  }

  return addresses;
}

module.exports = {
  startDiscoveryService,
  getLocalAddresses
};
