const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('gilgalDesktop', { isDesktop: true });

contextBridge.exposeInMainWorld('gilgalFusion', {
  review(request) {
    return ipcRenderer.invoke('fusion:review', request);
  },
});
