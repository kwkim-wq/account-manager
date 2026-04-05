const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  request: (options) => ipcRenderer.invoke("api-request", options),
  copyToClipboard: (text) => ipcRenderer.invoke("copy-to-clipboard", text),
  getConfig: () => ipcRenderer.invoke("get-config"),
  saveConfig: (config) => ipcRenderer.invoke("save-config", config),
  openExternal: (url) => ipcRenderer.invoke("open-external", url),
});
