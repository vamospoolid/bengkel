const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  isElectron: true,
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  printSilent: (options, htmlContent) => ipcRenderer.invoke('print-silent', options, htmlContent),
  printRaw: (printerName, transaction, workshop) => ipcRenderer.invoke('print-raw', printerName, transaction, workshop),
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  getAppVersion: () => '1.0.0',
});
