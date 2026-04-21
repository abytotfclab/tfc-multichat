import { app, BrowserWindow, shell, ipcMain, screen } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { autoUpdater } from 'electron-updater'
import { validateLicenseRemote } from './firebase'
import { execSync } from 'child_process'
import tmi from 'tmi.js'
import { WebcastPushConnection } from 'tiktok-live-connector'
import { LiveChat } from 'youtube-chat'

const indexHtml = join(__dirname, '../renderer/index.html')
const preload = join(__dirname, '../preload/index.js')

let mainWindow = null
let splashWindow = null
let logsWindow = null
let appLogs = []
let twitchClient = null
let tiktokClient = null
let youtubeClient = null
let rendererReady = false
let pendingUpdateStatus = null

const CONFIG_PATH = join(app.getPath('userData'), 'config.json')

function loadConfig() {
  try {
    if (existsSync(CONFIG_PATH)) {
      return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'))
    }
  } catch (e) {
    console.error('Error loading config:', e)
  }
  return {
    display: { width: 600, height: 800, alwaysOnTop: true, opacity: 0.88 },
    licenseKey: "TFC-STREAMER-TEST-2026-OK",
    tts: { enabled: true, voice: null, rate: 1, pitch: 1 }
  }
}

function saveConfig(cfg) {
  try {
    writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2))
  } catch (e) {
    console.error('Error saving config:', e)
  }
}

function sendLog(type, message) {
  const logEntry = { timestamp: new Date().toLocaleTimeString(), type, message: String(message) }
  appLogs.push(logEntry)
  if (appLogs.length > 500) appLogs.shift() 
  
  const windows = BrowserWindow.getAllWindows()
  windows.forEach(win => {
    if (!win.isDestroyed()) {
      win.webContents.send('app:log', logEntry)
    }
  })
  console.log(`[${type}] ${message}`)
}

function getHWID() {
  try {
    const output = execSync('wmic csproduct get uuid').toString()
    const uuid = output.split('\n')[1].trim()
    return uuid
  } catch (e) {
    sendLog('ERROR', 'Failed to get HWID')
    return 'UNKNOWN-HWID-' + Math.random().toString(36).substr(2, 9)
  }
}

async function verifyLicense(key, hwid) {
  if (!key) return false
  const res = await validateLicenseRemote(key, hwid)
  return res.success
}

let config = loadConfig()
let lastBounds = { width: 600, height: 800, x: 100, y: 100 }
let myMaximizedState = false

function createWindow() {
  const iconPath = join(__dirname, '../../assets/icons/icon.png')

  mainWindow = new BrowserWindow({
    width: config.display?.width || 600,
    height: config.display?.height || 800,
    minWidth: 400,
    minHeight: 500,
    show: false,
    frame: false,
    icon: iconPath,
    transparent: true,
    alwaysOnTop: config.display?.alwaysOnTop ?? true,
    opacity: config.display?.opacity ?? 0.88,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload,
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    if (splashWindow) {
      splashWindow.destroy()
      splashWindow = null
    }
    mainWindow.show()
  })

  mainWindow.on('maximize', () => {
    myMaximizedState = true
    mainWindow.webContents.send('win:maximized-status', true)
  })
  mainWindow.on('unmaximize', () => {
    myMaximizedState = false
    mainWindow.webContents.send('win:maximized-status', false)
  })

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(indexHtml)
  }

  mainWindow.webContents.on('did-finish-load', () => {
    rendererReady = true
    if (pendingUpdateStatus) {
      mainWindow?.webContents.send('update:status', pendingUpdateStatus)
      pendingUpdateStatus = null
    }
    autoUpdater.checkForUpdates().catch(e => sendLog('ERROR', `Update check failed: ${e.message}`))
  })
}

let status = {
  twitch: { connected: false, channel: '' },
  tiktok: { connected: false, username: '' },
  youtube: { connected: false, channel: '' }
}

function updateStatus(platform, data) {
  status[platform] = { ...status[platform], ...data }
  mainWindow?.webContents.send('status:update', status)
}

// -- Platform Handlers -----------------------------------------------------

async function connectTwitch(input) {
  let channel = input.trim()
  if (channel.includes('twitch.tv/')) {
    channel = channel.split('twitch.tv/')[1].split('/')[0].split('?')[0]
  }
  
  sendLog('TWITCH', `Connecting to channel: ${channel} (Viewer Mode)`)
  if (twitchClient) {
    try { await twitchClient.disconnect() } catch (e) {}
  }

  twitchClient = new tmi.Client({
    options: { debug: false },
    connection: { reconnect: true, secure: true, timeout: 10000 },
    channels: [channel]
  })

  twitchClient.on('connected', () => {
    sendLog('TWITCH', `Successfully connected to ${channel}`)
    updateStatus('twitch', { connected: true, channel })
  })
  
  twitchClient.on('disconnected', (reason) => {
    sendLog('TWITCH', `Disconnected: ${reason}`)
    updateStatus('twitch', { connected: false })
  })
  
  twitchClient.on('message', (chan, tags, message, self) => {
    if (self) return
    sendLog('TWITCH_MSG', `${tags.username}: ${message}`)
    mainWindow?.webContents.send('chat:message', {
      id: tags.id, 
      type: 'chat', 
      platform: 'twitch', 
      author: tags['display-name'] || tags.username,
      message, 
      color: tags.color || '#9146FF', 
      avatar: '', 
      badges: tags.badges ? Object.keys(tags.badges) : [],
      timestamp: Date.now()
    })
  })

  twitchClient.on('subscription', (channel, username) => {
    mainWindow?.webContents.send('chat:message', {
      type: 'event', event: 'sub', platform: 'twitch', author: username,
      message: `¡Nueva suscripción! 💖`, color: '#f500ff', timestamp: Date.now()
    })
  })

  try {
    await twitchClient.connect()
    return { ok: true }
  } catch (e) {
    sendLog('ERROR', `Twitch failed for ${channel}: ${e.message}`)
    return { ok: false, error: e.message }
  }
}

async function connectTikTok(input) {
  let username = input.trim()
  if (username.includes('tiktok.com/')) {
    const parts = username.split('@')
    if (parts.length > 1) username = parts[1].split('/')[0].split('?')[0]
  } else if (username.startsWith('@')) {
    username = username.substring(1)
  }

  sendLog('TIKTOK', `Connecting to user: ${username} (Viewer Mode)`)
  if (tiktokClient) {
    try { tiktokClient.disconnect() } catch (e) {}
  }

  tiktokClient = new WebcastPushConnection(username, {
    enableExtendedGiftInfo: true,
    requestPollingIntervalMs: 2000
  })

  tiktokClient.on('connected', () => {
    sendLog('TIKTOK', `Connected to ${username}`)
    updateStatus('tiktok', { connected: true, username })
  })
  
  tiktokClient.on('disconnected', (reason) => {
    sendLog('TIKTOK', `Disconnected: ${reason}`)
    updateStatus('tiktok', { connected: false })
  })

  tiktokClient.on('chat', data => {
    sendLog('TIKTOK_MSG', `${data.uniqueId}: ${data.comment}`)
    const badges = []
    if (data.isModerator) badges.push('moderator')
    if (data.isNewGifter) badges.push('subscriber')
    
    mainWindow?.webContents.send('chat:message', {
      id: data.msgId, 
      type: 'chat', 
      platform: 'tiktok', 
      author: data.nickname || data.uniqueId,
      message: data.comment, 
      color: '#FF8C00', 
      avatar: data.profilePictureUrl,
      badges,
      timestamp: Date.now()
    })
  })

  try {
    await tiktokClient.connect()
    return { ok: true }
  } catch (e) {
    sendLog('ERROR', `TikTok failed for ${username}: ${e.message}`)
    return { ok: false, error: e.message }
  }
}

async function connectYouTube(input) {
  let channelUrl = input.trim()
  sendLog('YOUTUBE', `Connecting to: ${channelUrl} (Viewer Mode)`)
  
  if (youtubeClient) {
    try { youtubeClient.stop() } catch (e) {}
  }

  try {
    // Determine channelId, handle, or liveId
    if (channelUrl.includes('v=')) {
      const liveId = channelUrl.split('v=')[1].split('&')[0]
      youtubeClient = new LiveChat({ liveId })
    } else if (channelUrl.includes('youtube.com/live/')) {
      const liveId = channelUrl.split('/live/')[1].split('?')[0].split('/')[0]
      youtubeClient = new LiveChat({ liveId })
    } else if (channelUrl.includes('youtube.com/channel/')) {
      const channelId = channelUrl.split('youtube.com/channel/')[1].split('/')[0].split('?')[0]
      youtubeClient = new LiveChat({ channelId })
    } else if (channelUrl.includes('youtube.com/')) {
      let handle = channelUrl.split('youtube.com/')[1].split('/')[0].split('?')[0]
      if (!handle.startsWith('@')) handle = '@' + handle
      youtubeClient = new LiveChat({ handle })
    } else {
      // Assume it's a handle or channel ID
      if (channelUrl.startsWith('UC')) youtubeClient = new LiveChat({ channelId: channelUrl })
      else youtubeClient = new LiveChat({ handle: channelUrl.startsWith('@') ? channelUrl : '@' + channelUrl })
    }

    youtubeClient.on('start', (liveId) => {
      sendLog('YOUTUBE', `Successfully connected (Live ID: ${liveId})`)
      updateStatus('youtube', { connected: true, channel: 'Live' })
    })

    youtubeClient.on('chat', (item) => {
      const message = item.message.map(m => m.text).join('')
      sendLog('YOUTUBE_MSG', `${item.author.name}: ${message}`)
      
      mainWindow?.webContents.send('chat:message', {
        id: item.id,
        type: 'chat',
        platform: 'youtube',
        author: item.author.name,
        message: message,
        color: '#FF0000',
        avatar: item.author.thumbnail?.url || '',
        badges: item.author.badge ? [item.author.badge.label] : [],
        timestamp: Date.now()
      })
    })

    youtubeClient.on('error', (err) => {
      sendLog('ERROR', `YouTube Error: ${err.message}`)
    })

    const ok = await youtubeClient.start()
    if (!ok) throw new Error('No live stream found or failed to start.')
    
    return { ok: true }
  } catch (e) {
    sendLog('ERROR', `YouTube failed: ${e.message}`)
    return { ok: false, error: e.message }
  }
}

app.whenReady().then(() => {
  app.setAppUserModelId('com.tfc.multichat')
  createSplashWindow()
  
  setTimeout(() => {
    createWindow()
  }, 500)

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = false

  function sendUpdateStatus(status) {
    if (rendererReady) {
      mainWindow?.webContents.send('update:status', status)
    } else {
      pendingUpdateStatus = status
    }
  }

  autoUpdater.on('update-available', (info) => {
    sendLog('UPDATER', `Update available: v${info.version}`)
    sendUpdateStatus('UPDATE_AVAILABLE')
  })

  autoUpdater.on('update-downloaded', (info) => {
    sendLog('UPDATER', `Update v${info.version} ready to install`)
    sendUpdateStatus('UPDATE_DOWNLOADED')
  })

  autoUpdater.on('update-not-available', () => {
    sendLog('UPDATER', 'No updates available')
  })

  autoUpdater.on('error', (err) => {
    sendLog('ERROR', `Updater Error: ${err.message}`)
  })

  ipcMain.handle('updater:quit-and-install', () => {
    autoUpdater.quitAndInstall(false, true)
  })

  ipcMain.handle('app:check-for-updates', async () => {
    try {
      const result = await autoUpdater.checkForUpdates()
      return { success: true, updateInfo: result?.updateInfo }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('win:open-logs', () => {
    if (logsWindow) {
      logsWindow.focus()
      return
    }
    logsWindow = new BrowserWindow({
      width: 600, height: 400, title: 'Activity Logs',
      autoHideMenuBar: true, backgroundColor: '#08080c',
      webPreferences: { preload, nodeIntegration: false, contextIsolation: true }
    })
    if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
      logsWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#logs`)
    } else {
      logsWindow.loadFile(indexHtml, { hash: 'logs' })
    }
    logsWindow.on('closed', () => { logsWindow = null })
  })

  ipcMain.handle('app:get-logs', () => appLogs)

  ipcMain.handle('config:get', () => config)
  ipcMain.handle('config:save', (_, partial) => {
    config = { ...config, ...partial }
    saveConfig(config)
    mainWindow?.webContents.send('config:update', config)
    return config
  })

  ipcMain.handle('status:get', () => status)
  ipcMain.handle('app:openExternal', (_, url) => shell.openExternal(url))
  
  ipcMain.handle('twitch:connect',  (_, { channel }) => connectTwitch(channel))
  ipcMain.handle('twitch:disconnect', () => { twitchClient?.disconnect(); updateStatus('twitch', { connected: false }) })
  
  ipcMain.handle('tiktok:connect',   (_, { username }) => connectTikTok(username))
  ipcMain.handle('tiktok:disconnect', () => { tiktokClient?.disconnect(); updateStatus('tiktok', { connected: false }) })
  
  ipcMain.handle('youtube:connect',    (_, input) => connectYouTube(input))
  ipcMain.handle('youtube:disconnect', () => { youtubeClient?.stop(); updateStatus('youtube', { connected: false }); return { ok: true } })

  ipcMain.handle('twitch:login', async () => {
    return await openLoginWindow('https://www.twitch.tv/login', 'Login Twitch')
  })
  ipcMain.handle('tiktok:login', async () => {
    return await openLoginWindow('https://www.tiktok.com/login', 'Login TikTok')
  })
  ipcMain.handle('youtube:login', async () => {
    return await openLoginWindow('https://accounts.google.com/ServiceLogin?service=youtube', 'Login YouTube')
  })

  async function openLoginWindow(url, title) {
    return new Promise((resolve) => {
      const loginWin = new BrowserWindow({
        width: 600, height: 800, title, parent: mainWindow,
        modal: true, show: false, frame: true, transparent: false,
        alwaysOnTop: true, autoHideMenuBar: true,
        webPreferences: { nodeIntegration: false, contextIsolation: true }
      })
      loginWin.loadURL(url)
      loginWin.once('ready-to-show', () => loginWin.show())
      loginWin.on('closed', () => resolve({ ok: true }))
    })
  }

  function createSplashWindow() {
    const iconPath = join(__dirname, '../../assets/icons/icon.png')
    let iconData = ""
    try {
      iconData = readFileSync(iconPath).toString('base64')
    } catch (e) {
      console.error("Icon not found for splash", e)
    }

    splashWindow = new BrowserWindow({
      width: 400,
      height: 400,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      center: true,
      show: false,
      hasShadow: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    })

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              margin: 0;
              padding: 0;
              overflow: hidden;
              background: transparent;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              font-family: sans-serif;
            }
            .container {
              position: relative;
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            img {
              width: 220px;
              height: 220px;
              object-fit: contain;
              filter: drop-shadow(0 0 25px rgba(0, 206, 209, 0.7));
              animation: pulse 2s infinite ease-in-out;
            }
            .loader {
              margin-top: 20px;
              width: 40px;
              height: 40px;
              border: 4px solid rgba(255, 255, 255, 0.1);
              border-left-color: #00CED1;
              border-radius: 50%;
              animation: spin 1s linear infinite;
            }
            @keyframes pulse {
              0% { transform: scale(0.92); opacity: 0.8; }
              50% { transform: scale(1); opacity: 1; }
              100% { transform: scale(0.92); opacity: 0.8; }
            }
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <img src="data:image/png;base64,${iconData}" />
            <div class="loader"></div>
          </div>
        </body>
      </html>
    `

    splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`)
    splashWindow.once('ready-to-show', () => {
      splashWindow.show()
    })
  }

  ipcMain.handle('win:close',          () => mainWindow?.hide())
  ipcMain.handle('win:quit',           () => { app.exit(0) })
  ipcMain.handle('win:minimize',       () => mainWindow?.minimize())
  ipcMain.handle('win:maximize', () => {
    if (!mainWindow) return false
    if (myMaximizedState) {
      mainWindow.unmaximize()
      if (lastBounds) mainWindow.setBounds(lastBounds, true)
      myMaximizedState = false
    } else {
      lastBounds = mainWindow.getBounds()
      mainWindow.maximize()
      myMaximizedState = true
    }
    mainWindow.webContents.send('win:maximized-status', myMaximizedState)
    return myMaximizedState
  })

  ipcMain.handle('win:setOpacity',     (_, v) => mainWindow?.setOpacity(v))
  ipcMain.handle('win:setAlwaysOnTop', (_, v) => mainWindow?.setAlwaysOnTop(v))
  ipcMain.handle('win:setIgnoreMouseEvents', (_, v) => mainWindow?.setIgnoreMouseEvents(v, { forward: true }))

  ipcMain.handle('license:get-status', async () => {
    const hwid = getHWID()
    const key = config.licenseKey || null
    const isValid = await verifyLicense(key, hwid)
    return { isValid, hwid, key }
  })

  ipcMain.handle('license:activate', async (_, key) => {
    const hwid = getHWID()
    const res = await validateLicenseRemote(key, hwid)
    if (res.success) {
      config.licenseKey = key
      saveConfig(config)
      return { success: true }
    }
    return { success: false, error: res.error }
  })

  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
