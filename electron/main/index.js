import { app, BrowserWindow, ipcMain, shell, screen } from 'electron'
import { join } from 'node:path'
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { validateLicenseRemote } from './firebase.js'
import { autoUpdater } from 'electron-updater'

// -- Persistence -----------------------------------------------------------
const CONFIG_PATH = path.join(app.getPath('userData'), 'multichat-config.json')

const DEFAULT_CONFIG = {
  activePlatforms: [],
  display: {
    fontSize: 14,
    showPlatformIcon: true,
    opacity: 0.88,
    alwaysOnTop: true,
    theme: 'dark'
  },
  promotion: {
    twitchUrl: 'https://www.twitch.tv/stopblaiperr',
    tiktokUrl: 'https://vt.tiktok.com/ZS9Lxnv83YYmH-YUej5/',
    youtubeUrl: 'https://www.youtube.com/live/LUFyNQQT8Ds?si=--TF1YzyHkAeudqo',
    messageTemplate: '¡Ya estamos en vivo! 🔥\n\nAcompáñanos en:\n🟣 Twitch: {twitch}\n⚫ TikTok: {tiktok}\n🔴 YouTube: {youtube}'
  },
  ttsEnabled: false,
  clickThrough: false,
  giveawayCommand: '!sorteo'
}

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) return DEFAULT_CONFIG
  try {
    const data = fs.readFileSync(CONFIG_PATH, 'utf-8')
    return { ...DEFAULT_CONFIG, ...JSON.parse(data) }
  } catch (e) {
    return DEFAULT_CONFIG
  }
}

function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2))
    return config
  } catch (e) {
    return config
  }
}

// -- HWID & Licensing Logic ------------------------------------------------
function getHWID() {
  console.log("[LICENSE] Obteniendo HWID...")
  try {
    if (process.platform === 'win32') {
      // wmic is usually faster than powershell for this
      const output = execSync('wmic csproduct get uuid').toString().split('\n')[1].trim()
      console.log("[LICENSE] HWID obtenido:", output)
      return output
    }
    return 'UNSUPPORTED_PLATFORM'
  } catch (e) {
    console.error("[LICENSE] Error obteniendo HWID:", e.message)
    // Fallback attempt with powershell if wmic fails
    try {
      const output = execSync('powershell -Command "[guid]::Empty.ToString()"').toString().trim()
      return output
    } catch (e2) {
      return 'UNKNOWN_HWID'
    }
  }
}

async function verifyLicense(key, hwid) {
  if (!key) return false
  
  try {
    // Add a 10s timeout to prevent hanging the UI
    const validationPromise = validateLicenseRemote(key, hwid)
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('TIMEOUT')), 10000)
    )

    const res = await Promise.race([validationPromise, timeoutPromise])
    return res.success
  } catch (e) {
    console.error("[LICENSE] Error en verificación:", e.message)
    return false
  }
}

let mainWindow = null
let config = loadConfig()
let lastBounds = { width: 600, height: 800, x: 100, y: 100 }
let myMaximizedState = false

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 600,
    height: 800,
    show: false,
    frame: false,
    transparent: true,
    resizable: true,
    alwaysOnTop: config.display?.alwaysOnTop ?? true,
    opacity: config.display?.opacity ?? 0.88,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      backgroundThrottling: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // Listeners to keep state in sync
  mainWindow.on('maximize', () => {
    myMaximizedState = true
    mainWindow.webContents.send('win:maximized-status', true)
  })
  mainWindow.on('unmaximize', () => {
    myMaximizedState = false
    mainWindow.webContents.send('win:maximized-status', false)
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// -- Platform Handlers -----------------------------------------------------
let status = {
  twitch: { connected: false, channel: '' },
  tiktok: { connected: false, username: '' },
  youtube: { connected: false, channel: '' }
}

function updateStatus(platform, data) {
  status[platform] = { ...status[platform], ...data }
  mainWindow?.webContents.send('status:update', status)
}

// Twitch Setup
import tmi from 'tmi.js'
let twitchClient = null
async function connectTwitch(channel) {
  if (twitchClient) {
    try { await twitchClient.disconnect() } catch(e) {}
  }
  
  try {
    twitchClient = new tmi.Client({ channels: [channel] })
    await twitchClient.connect()
    updateStatus('twitch', { connected: true, channel })
    
    // Reset listeners
    twitchClient.removeAllListeners('message')
    twitchClient.on('message', (chan, tags, message, self) => {
    if (self) return
    mainWindow?.webContents.send('chat:message', {
      id: tags.id, type: 'chat', platform: 'twitch', author: tags['display-name'] || tags.username,
      message, color: tags.color || '#9146FF', avatar: '', badges: tags.badges || {},
      timestamp: Date.now()
    })
  })

  // Twitch Events
  twitchClient.on('subscription', (channel, username, method, message, userstate) => {
    mainWindow?.webContents.send('chat:message', {
      type: 'event', event: 'sub', platform: 'twitch', author: username,
      message: `¡Nueva suscripción! 💖`, color: '#f500ff', timestamp: Date.now()
    })
  })

  twitchClient.on('resub', (channel, username, months, message, userstate, methods) => {
    mainWindow?.webContents.send('chat:message', {
      type: 'event', event: 'resub', platform: 'twitch', author: username,
      message: `¡Suscripción por ${months} meses! 🔥`, color: '#f500ff', timestamp: Date.now()
    })
  })

    twitchClient.on('cheer', (channel, userstate, message) => {
      mainWindow?.webContents.send('chat:message', {
        type: 'event', event: 'cheer', platform: 'twitch', author: userstate['display-name'],
        message: `¡Envió ${userstate.bits} bits! 💎`, color: '#ffea00', timestamp: Date.now()
      })
    })

    return { ok: true }
  } catch (e) {
    console.error("[TWITCH] Error:", e.message)
    return { ok: false, error: e.message }
  }
}

// TikTok Setup
import { WebcastPushConnection } from 'tiktok-live-connector'
let tiktokClient = null
async function connectTikTok(username) {
  if (tiktokClient) {
    try { await tiktokClient.disconnect() } catch(e) {}
  }

  try {
    tiktokClient = new WebcastPushConnection(username)
    await tiktokClient.connect()
    updateStatus('tiktok', { connected: true, username })

    tiktokClient.on('chat', data => {
    mainWindow?.webContents.send('chat:message', {
      id: data.msgId, type: 'chat', platform: 'tiktok', author: data.nickname || data.uniqueId,
      message: data.comment, color: '#00f5ff', avatar: data.profilePictureUrl,
      badges: { moderator: data.isModerator, vips: data.isNewGifter },
      timestamp: Date.now()
    })
  })

  // TikTok Events
  tiktokClient.on('gift', data => {
    if (data.repeatEnd) { // Only show when the combo ends to avoid spam
      mainWindow?.webContents.send('chat:message', {
        type: 'event', event: 'gift', platform: 'tiktok', author: data.nickname || data.uniqueId,
        message: `¡Regaló ${data.repeatCount}x ${data.giftName}! 🎁`, 
        color: '#ff0050', avatar: data.profilePictureUrl, timestamp: Date.now()
      })
    }
  })

  tiktokClient.on('social', data => {
    if (data.displayType === 'pm_mt_guidance_viewer_follow') {
      mainWindow?.webContents.send('chat:message', {
        type: 'event', event: 'follow', platform: 'tiktok', author: data.nickname || data.uniqueId,
        message: `¡Te empezó a seguir! ✅`, color: '#00f5ff', 
        avatar: data.profilePictureUrl, timestamp: Date.now()
      })
    }
  })

    tiktokClient.on('member', data => {
      mainWindow?.webContents.send('chat:message', {
        type: 'event', event: 'join', platform: 'tiktok', author: data.nickname || data.uniqueId,
        message: `¡Se unió al LIVE! 👋`, color: '#00f5ff', 
        avatar: data.profilePictureUrl, timestamp: Date.now()
      })
    })

    return { ok: true }
  } catch (e) {
    console.error("[TIKTOK] Error:", e.message)
    return { ok: false, error: e.message }
  }
}

app.whenReady().then(() => {
  createWindow()

  // -- Auto-Updater Logic ----------------------------------------------------
  autoUpdater.checkForUpdatesAndNotify()

  autoUpdater.on('update-available', () => {
    mainWindow?.webContents.send('update:status', 'Disponible nueva versión. Descargando...')
  })

  autoUpdater.on('update-downloaded', () => {
    mainWindow?.webContents.send('update:status', 'Actualización lista. Reinicia para aplicar.')
  })

  autoUpdater.on('error', (err) => {
    console.error('[UPDATER] Error:', err)
  })

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
  ipcMain.handle('youtube:connect',    () => { updateStatus('youtube', { connected: true, channel: 'Live' }); return { ok: true } })
  ipcMain.handle('youtube:disconnect', () => { updateStatus('youtube', { connected: false }); return { ok: true } })

  // -- Login Handlers --------------------------------------------------------
  async function openLoginWindow(url, title) {
    return new Promise((resolve) => {
      const loginWin = new BrowserWindow({
        width: 600,
        height: 800,
        title: title,
        parent: mainWindow,
        modal: true,
        show: false,
        frame: true,
        transparent: false,
        alwaysOnTop: true, // Crucial as the main window might be pinned
        autoHideMenuBar: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      })

      loginWin.loadURL(url)
      loginWin.once('ready-to-show', () => loginWin.show())

      loginWin.on('closed', () => {
        resolve({ ok: true })
      })
    })
  }

  ipcMain.handle('twitch:login', async () => {
    return await openLoginWindow('https://www.twitch.tv/login', 'Login Twitch')
  })

  ipcMain.handle('tiktok:login', async () => {
    return await openLoginWindow('https://www.tiktok.com/login', 'Login TikTok')
  })

  ipcMain.handle('youtube:login', async () => {
    return await openLoginWindow('https://accounts.google.com/ServiceLogin?service=youtube', 'Login YouTube')
  })

  ipcMain.handle('win:close',          () => mainWindow?.hide())
  ipcMain.handle('win:quit',           () => { app.exit(0) })
  ipcMain.handle('win:minimize',       () => mainWindow?.minimize())

  // License Handlers
  ipcMain.handle('license:get-status', async () => {
    const hwid = getHWID()
    const key = config.licenseKey || null
    const isValid = await verifyLicense(key, hwid)
    return {
      isValid,
      hwid,
      key
    }
  })

  ipcMain.handle('license:activate', async (_, key) => {
    const hwid = getHWID()
    // Directly use remote validation for activation to get the error message
    const res = await validateLicenseRemote(key, hwid)
    if (res.success) {
      config.licenseKey = key
      saveConfig(config)
      return { success: true }
    }
    return { success: false, error: res.error }
  })
  
  ipcMain.handle('win:maximize', () => {
    if (!mainWindow) return false
    
    // Toggle state logic
    if (myMaximizedState) {
      // Restore standard size
      mainWindow.unmaximize()
      if (lastBounds) {
        mainWindow.setBounds(lastBounds, true)
      } else {
        mainWindow.setSize(600, 800, true)
      }
      myMaximizedState = false
    } else {
      // Save current bounds to restore them later
      lastBounds = mainWindow.getBounds()
      
      // Attempt native maximize
      mainWindow.maximize()
      
      // Fallback: If native maximize doesn't seem to work (common for transparent windows), 
      // we manually set the size to the work area.
      setTimeout(() => {
        if (!mainWindow.isMaximized()) {
          const primaryDisplay = screen.getPrimaryDisplay()
          const { width, height } = primaryDisplay.workAreaSize
          mainWindow.setBounds({ x: 0, y: 0, width, height }, true)
        }
      }, 100)
      
      myMaximizedState = true
    }
    
    mainWindow.webContents.send('win:maximized-status', myMaximizedState)
    return myMaximizedState
  })

  ipcMain.handle('win:setOpacity',     (_, v) => mainWindow?.setOpacity(v))
  ipcMain.handle('win:setAlwaysOnTop', (_, v) => mainWindow?.setAlwaysOnTop(v))
  ipcMain.handle('win:setIgnoreMouseEvents', (_, v) => mainWindow?.setIgnoreMouseEvents(v, { forward: true }))

  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
