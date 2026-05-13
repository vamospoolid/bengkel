const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  // Check if we are running inside Electron
  isElectron: true,
  
  // Printer API
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  printSilent: (options, htmlContent) => ipcRenderer.invoke('print-silent', options, htmlContent),
  printRaw: (printerName, transaction, workshop) => ipcRenderer.invoke('print-raw', printerName, transaction, workshop),
  
  // Generic IPC
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  
  // System Info
  getAppVersion: () => '1.0.0'
});
