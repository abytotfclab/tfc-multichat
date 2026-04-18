const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  // Utils
  openExternal:   (url) => ipcRenderer.invoke('app:openExternal', url),

  // Window
  close:          () => ipcRenderer.invoke('win:close'),
  quit:           () => ipcRenderer.invoke('win:quit'),
  minimize:       () => ipcRenderer.invoke('win:minimize'),
  maximize:       () => ipcRenderer.invoke('win:maximize'),
  setOpacity:     (v) => ipcRenderer.invoke('win:setOpacity', v),
  setAlwaysOnTop: (v) => ipcRenderer.invoke('win:setAlwaysOnTop', v),
  setIgnoreMouseEvents: (v) => ipcRenderer.invoke('win:setIgnoreMouseEvents', v),
  invoke:         (channel, ...args) => ipcRenderer.invoke(channel, ...args),

  // Config
  getConfig:  () => ipcRenderer.invoke('config:get'),
  saveConfig: (c) => ipcRenderer.invoke('config:save', c),

  // Connections
  twitch: {
    login:      ()   => ipcRenderer.invoke('twitch:login'),
    connect:    (opts) => ipcRenderer.invoke('twitch:connect', opts),
    disconnect: ()   => ipcRenderer.invoke('twitch:disconnect'),
  },
  tiktok: {
    login:      ()   => ipcRenderer.invoke('tiktok:login'),
    connect:    (opts) => ipcRenderer.invoke('tiktok:connect', opts),
    disconnect: ()   => ipcRenderer.invoke('tiktok:disconnect'),
  },
  youtube: {
    login:      ()      => ipcRenderer.invoke('youtube:login'),
    connect:    (input) => ipcRenderer.invoke('youtube:connect', input),
    disconnect: ()      => ipcRenderer.invoke('youtube:disconnect'),
  },

  // Status
  getStatus: () => ipcRenderer.invoke('status:get'),

  // Events — removeAllListeners first to prevent duplicates (React StrictMode mounts twice)
  onMessage: (cb) => {
    ipcRenderer.removeAllListeners('chat:message')
    ipcRenderer.on('chat:message', (_, m) => cb(m))
    return () => ipcRenderer.removeAllListeners('chat:message')
  },
  onStatus: (cb) => {
    ipcRenderer.removeAllListeners('status:update')
    ipcRenderer.on('status:update', (_, s) => cb(s))
    return () => ipcRenderer.removeAllListeners('status:update')
  },
  onConfigUpdate: (cb) => {
    ipcRenderer.removeAllListeners('config:update')
    ipcRenderer.on('config:update', (_, c) => cb(c))
    return () => ipcRenderer.removeAllListeners('config:update')
  },
  onMaximizedStatus: (cb) => {
    ipcRenderer.removeAllListeners('win:maximized-status')
    ipcRenderer.on('win:maximized-status', (_, s) => cb(s))
    return () => ipcRenderer.removeAllListeners('win:maximized-status')
  },
  onUpdateStatus: (cb) => {
    ipcRenderer.on('update:status', (_, s) => cb(s))
    return () => ipcRenderer.removeAllListeners('update:status')
  },
})
