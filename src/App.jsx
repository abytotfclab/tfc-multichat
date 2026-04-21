import { useEffect, useState, useRef } from 'react'
import { useChatStore } from './store/useChatStore'
import ChatList from './components/ChatList'
import SettingsPanel from './components/SettingsPanel'
import GiveawayPanel from './components/GiveawayPanel'
import WinnerModal from './components/WinnerModal'
import UserInspectPanel from './components/UserInspectPanel'
import LicenseGuard from './components/LicenseGuard'
import './App.css'

const PLATFORMS = [
  { id: 'twitch',  icon: '💜', color: '#9146FF' },
  { id: 'tiktok',  icon: '⚡', color: '#00E5CC' },
  { id: 'youtube', icon: '❤️', color: '#FF0000' },
]

export default function App() {
  const { 
    init, status, messages, clearMessages, isPaused, togglePause, 
    toggleFilter, filters, ttsEnabled, toggleTTS, toggleGiveawayUI, 
    showGiveaway, inspectedUser 
  } = useChatStore()
  
  const [showSettings, setShowSettings] = useState(false)
  const [config, setConfig] = useState(null)
  const [opacity, setOpacity] = useState(0.88)
  const [alwaysOnTop, setAlwaysOnTop] = useState(true)
  const [isClickThrough, setIsClickThrough] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)
  const [streamTime, setStreamTime] = useState(0)
  const [updateMsg, setUpdateMsg] = useState('')
  const opacityTimer = useRef(null)
  const streamInterval = useRef(null)

  useEffect(() => {
    init()
    window.electron?.getConfig().then(c => {
      setConfig(c)
      setIsClickThrough(c.clickThrough || false)
    })

    window.electron?.onConfigUpdate(c => {
      setConfig(c)
      setIsClickThrough(c.clickThrough || false)
    })

    window.electron?.onMaximizedStatus(setIsMaximized)

    window.electron?.onUpdateStatus(msg => {
      setUpdateMsg(msg)
      // Auto hide after 10s if it's just a message
      if (!msg.includes('Reinicia')) {
        setTimeout(() => setUpdateMsg(''), 10000)
      }
    })
  }, [])

  useEffect(() => {
    const isConnected = Object.values(status).some(s => s.connected)
    if (isConnected && !streamInterval.current) {
      streamInterval.current = setInterval(() => {
        setStreamTime(prev => prev + 1)
      }, 1000)
    } else if (!isConnected && streamInterval.current) {
      clearInterval(streamInterval.current)
      streamInterval.current = null
    }
  }, [status])

  function formatTime(seconds) {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const connectedCount = Object.values(status).filter(s => s.connected).length

  function handleOpacity(v) {
    setOpacity(v)
    if (window.electron) {
      clearTimeout(opacityTimer.current)
      opacityTimer.current = setTimeout(() => window.electron.setOpacity(v), 50)
    }
  }

  function toggleTop() {
    const next = !alwaysOnTop
    setAlwaysOnTop(next)
    window.electron?.setAlwaysOnTop(next)
  }

  function toggleClickThrough() {
    const next = !isClickThrough
    setIsClickThrough(next)
    window.electron?.setIgnoreMouseEvents(next)
  }

  function handleMaximize() {
    if (!window.electron) return alert('No electron API')
    window.electron.maximize()
  }

  function handleHeaderMouseEnter() {
    if (isClickThrough) {
      window.electron?.setIgnoreMouseEvents(false)
    }
  }

  function handleHeaderMouseLeave() {
    if (isClickThrough) {
      window.electron?.setIgnoreMouseEvents(true)
    }
  }

  async function handleSaveConfig(partial) {
    if (!window.electron) return
    const updated = await window.electron.saveConfig(partial)
    setConfig(updated)
  }

  function handlePromote() {
    if (!config?.promotion) return
    const { twitchUrl, tiktokUrl, youtubeUrl, messageTemplate } = config.promotion
    let text = messageTemplate
      .replace(/{twitch}/g, twitchUrl || 'twitch.tv')
      .replace(/{tiktok}/g, tiktokUrl || 'tiktok.com')
      .replace(/{youtube}/g, youtubeUrl || 'youtube.com')
    
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.electron?.openExternal(url)
  }

  return (
    <LicenseGuard>
      <div className="overlay" style={{ '--opacity': opacity }}>
        {/* ... (rest of the component) */}
        {/* ── Header ── */}
        <header 
          className="overlay__header" 
          data-electron-drag
          onMouseEnter={handleHeaderMouseEnter}
          onMouseLeave={handleHeaderMouseLeave}
        >
          <div className="header__drag" />

          {/* Brand */}
          <div className="header__brand">
            <span className="brand__logo">MC</span>
            <span className="brand__version">v1.0.3</span>
            {connectedCount > 0 && (
              <span className="brand__count">{connectedCount}</span>
            )}
          </div>

          {/* Platform status dots */}
          <div className="header__platforms">
            {PLATFORMS.map(p => {
              const st = status[p.id]?.connected
              return (
                <button
                  key={p.id}
                  className={`plat-dot ${st ? 'on' : 'off'} ${!filters[p.id] ? 'muted' : ''}`}
                  style={{ '--pc': p.color }}
                  onClick={() => toggleFilter(p.id)}
                  title={`${p.id} — ${st ? 'conectado' : 'desconectado'} — click para filtrar`}
                >
                  {p.icon}
                </button>
              )
            })}
          </div>

          {/* Count */}
          <div className="header__info">
            <span className="info__timer">{formatTime(streamTime)}</span>
          </div>

          {/* Global Activity Actions (Middle) */}
          <div className="header__actions">
            <button
              className={`icon-btn ${ttsEnabled ? 'active' : ''}`}
              onClick={toggleTTS}
              title={ttsEnabled ? 'Desactivar voz' : 'Activar voz (TTS)'}
            >🔊</button>
            <button
              className={`icon-btn ${showGiveaway ? 'active' : ''}`}
              onClick={toggleGiveawayUI}
              title="Sorteos"
            >🎁</button>
            <button
              className={`icon-btn ${isClickThrough ? 'active' : ''}`}
              onClick={toggleClickThrough}
              title="Modo Click-Through"
            >🖱️</button>
          </div>

          {/* Controls */}
          <div className="header__controls">
            <span className="info__count">{messages.length}</span>
            <button
              className={`icon-btn ${isPaused ? 'active' : ''}`}
              onClick={togglePause}
              title={isPaused ? 'Reanudar' : 'Pausar scroll'}
            >
              {isPaused ? '▶' : '⏸'}
            </button>
            <button
              className={`icon-btn ${alwaysOnTop ? 'active' : ''}`}
              onClick={toggleTop}
              title="Always on Top"
            >📌</button>
            <button
              className="icon-btn promote-btn"
              onClick={handlePromote}
              title="Promocionar en WhatsApp"
            >📢</button>
            <button
              className={`icon-btn ${showSettings ? 'active' : ''}`}
              onClick={() => setShowSettings(s => !s)}
              title="Ajustes"
            >⚙️</button>
            <button className="icon-btn" onClick={() => window.electron?.minimize()} title="Minimizar">─</button>
            <button className="icon-btn" onClick={handleMaximize} title={isMaximized ? "Restaurar" : "Maximizar"}>
              {isMaximized ? '❐' : '□'}
            </button>
            <button className="icon-btn icon-btn--close" onClick={() => window.electron?.quit()} title="Cerrar">✕</button>
          </div>
        </header>

        {/* ── Opacity slider (subtle bar on hover) ── */}
        <div className="opacity-bar">
          <input
            type="range" min="0.15" max="1" step="0.05"
            value={opacity}
            onChange={e => handleOpacity(+e.target.value)}
            title={`Opacidad: ${Math.round(opacity * 100)}%`}
          />
        </div>

        {/* ── Body ── */}
        <div className="overlay__body">
          <div className="overlay__chat">
            <ChatList config={config?.display} autoScroll={!isPaused} />
          </div>
          
          {inspectedUser && (
            <div className="overlay__inspect">
               <UserInspectPanel />
            </div>
          )}

          {showGiveaway && (
            <div className="overlay__giveaway">
              <GiveawayPanel />
            </div>
          )}

          {showSettings && (
            <div className="overlay__settings">
              <SettingsPanel
                config={config}
                onClose={() => setShowSettings(false)}
                onSaveConfig={handleSaveConfig}
              />
            </div>
          )}
        </div>

        <WinnerModal />

        {/* ── Update Notification ── */}
        {updateMsg && (
          <div className="update-toast">
            <span className="update-toast__icon">🚀</span>
            <span className="update-toast__msg">{updateMsg}</span>
            <button className="update-toast__close" onClick={() => setUpdateMsg('')}>✕</button>
          </div>
        )}

        {/* ── Footer ── */}
        <footer className="overlay__footer">
          <div className="footer__platforms">
            {PLATFORMS.map(p => {
              const st = status[p.id]
              if (!st?.connected) return null
              return (
                <span key={p.id} className="footer__chip" style={{ '--pc': p.color }}>
                  {p.icon} {st.channel || st.username || '●'}
                </span>
              )
            })}
          </div>
          <button className="footer__clear" onClick={clearMessages} title="Limpiar mensajes">🗑</button>
        </footer>
      </div>
    </LicenseGuard>
  )
}
