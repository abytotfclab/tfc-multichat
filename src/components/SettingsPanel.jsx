import { useState, useEffect } from 'react'
import { useChatStore } from '../store/useChatStore'
import './SettingsPanel.css'

export default function SettingsPanel({ onClose, config, onSaveConfig }) {
  const { status, filters, toggleFilter, ttsSettings, setTTSSettings, ttsEnabled, toggleTTS } = useChatStore()

  // Single-field state per platform — just paste the link
  const [twInput, setTwInput]  = useState(config?.twitch?.channel  || '')
  const [tkInput, setTkInput]  = useState(config?.tiktok?.username || '')
  const [ytInput, setYtInput]  = useState(config?.youtube?.channel || '')

  const [loading, setLoading] = useState({})
  const [errors, setErrors]   = useState({})
  const [displayCfg, setDisplayCfg] = useState({ ...(config?.display || {}) })
  const [copied, setCopied] = useState(false)
  
  const [availableVoices, setAvailableVoices] = useState([])

  useEffect(() => {
    const loadVoices = () => {
      const all = window.speechSynthesis.getVoices()
      // Filter for Spanish or prominent voices
      const filtered = all
        .filter(v => v.lang.startsWith('es') || v.lang.startsWith('en'))
        .slice(0, 5)
      setAvailableVoices(filtered)
    }
    loadVoices()
    window.speechSynthesis.onvoiceschanged = loadVoices
    return () => { window.speechSynthesis.onvoiceschanged = null }
  }, [])

  const PLATFORMS = [
    {
      id: 'twitch', icon: '💜', name: 'Twitch', color: '#9146FF',
      value: twInput, setValue: setTwInput,
      placeholder: 'Canal de Twitch',
      hint: 'Inicia sesión para ver mensajes que requieren autorización.',
      login: () => window.electron?.twitch.login(),
      connect: () => window.electron?.twitch.connect({ channel: twInput }),
      disconnect: () => window.electron?.twitch.disconnect(),
    },
    {
      id: 'tiktok', icon: '🩵', name: 'TikTok Live', color: '#00E5CC',
      value: tkInput, setValue: setTkInput,
      placeholder: '@usuario',
      hint: 'Haz login para cargar el chat sin bloqueos de TikTok.',
      login: () => window.electron?.tiktok.login(),
      connect: () => window.electron?.tiktok.connect({ username: tkInput }),
      disconnect: () => window.electron?.tiktok.disconnect(),
    },
    {
      id: 'youtube', icon: '❤️', name: 'YouTube Live', color: '#FF0000',
      value: ytInput, setValue: setYtInput,
      placeholder: '@canal',
      hint: 'Haz login para ver el chat con tu cuenta de Google.',
      login: () => window.electron?.youtube.login(),
      connect: () => window.electron?.youtube.connect(ytInput),
      disconnect: () => window.electron?.youtube.disconnect(),
    },
  ]

  async function handleConnect(p) {
    if (!p.value.trim()) return
    setLoading(l => ({ ...l, [p.id]: true }))
    setErrors(e => ({ ...e, [p.id]: null }))
    const res = await p.connect()
    if (!res?.ok) setErrors(e => ({ ...e, [p.id]: res?.error || 'Error de conexión' }))
    setLoading(l => ({ ...l, [p.id]: false }))
  }

  async function handleLogin(p) {
    setLoading(l => ({ ...l, [`${p.id}_login`]: true }))
    const res = await p.login()
    if (!res.ok) {
      setErrors(e => ({ ...e, [p.id]: res.error }))
    } else if (res.username) {
      if (p.id === 'twitch') setTwInput(res.username)
      if (p.id === 'tiktok') setTkInput(res.username)
    }
    setLoading(l => ({ ...l, [`${p.id}_login`]: false }))
  }

  async function handleDisconnect(p) {
    await p.disconnect()
    setErrors(e => ({ ...e, [p.id]: null }))
  }

  function toggleBool(key) {
    setDisplayCfg(d => ({ ...d, [key]: !d[key] }))
  }

  function saveDisplay() {
    onSaveConfig?.({ display: displayCfg })
    onClose?.()
  }

  function handleCopyMessage() {
    if (!config?.promotion) return
    const { twitchUrl, tiktokUrl, youtubeUrl, messageTemplate } = config.promotion
    const text = messageTemplate
      .replace(/{twitch}/g, twitchUrl || '')
      .replace(/{tiktok}/g, tiktokUrl || '')
      .replace(/{youtube}/g, youtubeUrl || '')

    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleCheckUpdates() {
    setLoading(l => ({ ...l, updates: true }))
    try {
      const res = await window.electron?.checkForUpdates()
      if (res?.success) {
        alert(`Búsqueda finalizada. Versión actual detectada en la nube: v${res.updateInfo.version}`)
      } else {
        alert('No se encontraron actualizaciones o hubo un error: ' + (res?.error || 'Unknown'))
      }
    } catch (e) {
      alert('Error: ' + e.message)
    }
    setLoading(l => ({ ...l, updates: false }))
  }

  function testVoice(voice) {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance('Hola equipo, estoy listo para leer el chat.')
    utterance.voice = voice
    utterance.lang = voice.lang
    utterance.rate = ttsSettings.rate || 1.1
    window.speechSynthesis.speak(utterance)
  }

  return (
    <div className="settings">
      <div className="settings__header">
        <span className="settings__title">⚙ Config</span>
        <button className="icon-btn" onClick={onClose}>✕</button>
      </div>

      {/* ── Plataformas ── */}
      <div className="settings__section">
        <div className="section-label">Plataformas — Login Streamer</div>

        {PLATFORMS.map(p => {
          const st = status[p.id]
          return (
            <div key={p.id} className="platform-block" style={{ '--pc': p.color }}>
              <div className="platform-block__head">
                <span className="platform-icon">{p.icon}</span>
                <span className="platform-name">{p.name}</span>
                <div className={`dot ${st?.connected ? 'on' : 'off'}`} />
                <label className="toggle">
                  <input type="checkbox" checked={filters[p.id]} onChange={() => toggleFilter(p.id)} />
                  <span className="toggle__knob" />
                </label>
              </div>
              <div className="platform-block__row">
                <input
                  className="input"
                  placeholder={p.placeholder}
                  value={p.value}
                  onChange={e => p.setValue(e.target.value)}
                  disabled={st?.connected}
                />
              </div>
              <div className="platform-block__actions">
                {st?.connected ? (
                  <button className="btn btn-disconnect" onClick={() => handleDisconnect(p)}>✕ Detener</button>
                ) : (
                  <>
                    {p.login && (
                      <button 
                        className={`btn btn-login ${ (p.id === 'twitch' ? st?.hasToken : (p.id === 'tiktok' ? st?.hasSession : st?.hasCookies)) ? 'active' : '' }`}
                        onClick={() => handleLogin(p)}
                      >
                         👤 Login
                      </button>
                    )}
                    <button className="btn btn-connect" onClick={() => handleConnect(p)}>→ Conectar</button>
                  </>
                )}
              </div>
              {errors[p.id] && <div className="err">{errors[p.id]}</div>}
            </div>
          )
        })}
      </div>

      {/* ── VOZ (TTS) Config ── */}
      <div className="settings__section">
        <div className="section-label section-label--tts">Voz (TTS) — Filtros Inteligentes</div>
        
        <label className="display-row">
          <span>Activar Lectura de Voz</span>
          <label className="toggle">
            <input type="checkbox" checked={ttsEnabled} onChange={toggleTTS} />
            <span className="toggle__knob" />
          </label>
        </label>

        <div className="section-divider" />

        <div className="tts-category">
          <span className="tts-category-title">QUIÉN ESCUCHAR</span>
          {[
            { id: 'everyone',   label: 'Todos los usuarios', icon: '🌍' },
            { id: 'moderator',  label: 'Sólo Moderadores',   icon: '🛡️' },
            { id: 'vip',        label: 'Sólo VIPs',          icon: '💎' },
            { id: 'subscriber', label: 'Sólo Suscriptores',  icon: '⭐' },
          ].map(item => (
            <label key={item.id} className="display-row sub-row">
              <span className="row-label-with-icon"><span className="row-icon">{item.icon}</span>{item.label}</span>
              <label className="toggle toggle--small">
                <input type="checkbox" checked={ttsSettings[item.id]} onChange={e => setTTSSettings({ [item.id]: e.target.checked })} />
                <span className="toggle__knob" />
              </label>
            </label>
          ))}
        </div>

        <div className="tts-category">
          <span className="tts-category-title">DÓNDE ESCUCHAR</span>
          {[
            { id: 'twitch',  label: 'Twitch',  icon: '💜' },
            { id: 'tiktok',  label: 'TikTok',  icon: '⚡' },
            { id: 'youtube', label: 'YouTube', icon: '❤️' },
          ].map(item => (
            <label key={item.id} className="display-row sub-row">
               <span className="row-label-with-icon"><span className="row-icon">{item.icon}</span>{item.label}</span>
              <label className="toggle toggle--small">
                <input type="checkbox" checked={ttsSettings[item.id]} onChange={e => setTTSSettings({ [item.id]: e.target.checked })} />
                <span className="toggle__knob" />
              </label>
            </label>
          ))}
        </div>

        <div className="section-divider" />

        <div className="tts-category">
          <span className="tts-category-title">ELEGIR VOZ (Top 5 del sistema)</span>
          {availableVoices.length === 0 && <small className="tts-hint">Cargando voces del sistema...</small>}
          {availableVoices.map(voice => (
            <div key={voice.voiceURI} className="display-row sub-row voice-row">
              <label className="voice-selector">
                <input 
                  type="radio" 
                  name="ttsVoice" 
                  checked={ttsSettings.selectedVoice === voice.voiceURI} 
                  onChange={() => setTTSSettings({ selectedVoice: voice.voiceURI })}
                />
                <span className="voice-name" title={voice.name}>{voice.name}</span>
              </label>
              <button 
                className="icon-btn voice-test" 
                onClick={() => testVoice(voice)}
                title="Probar voz"
              >▶</button>
            </div>
          ))}
        </div>
        
        <small className="tts-hint">Si "Todos" está marcado, ignorará los filtros de Rol.</small>
      </div>

      {/* ── Apariencia ── */}
      <div className="settings__section">
        <div className="section-label">Apariencia</div>
        <label className="display-row">
          <span>Tamaño de texto</span>
          <div className="range-wrap">
            <input type="range" min="11" max="20"
              value={displayCfg.fontSize || 14}
              onChange={e => setDisplayCfg(d => ({ ...d, fontSize: +e.target.value }))} />
            <span>{displayCfg.fontSize || 14}px</span>
          </div>
        </label>
        {[
          { key: 'showTimestamp',     label: 'Mostrar hora' },
          { key: 'showAvatars',       label: 'Mostrar avatares' },
          { key: 'showPlatformBadge', label: 'Badge de plataforma' },
          { key: 'coloredUsernames',  label: 'Nombres a color' },
          { key: 'compactMode',       label: 'Modo compacto' },
        ].map(({ key, label }) => (
          <label key={key} className="display-row">
            <span>{label}</span>
            <label className="toggle">
              <input type="checkbox" checked={displayCfg[key] !== false} onChange={() => toggleBool(key)} />
              <span className="toggle__knob" />
            </label>
          </label>
        ))}
      </div>

      <div className="settings__actions">
        <button 
          className={`btn btn-updates ${loading.updates ? 'loading' : ''}`} 
          onClick={handleCheckUpdates}
          disabled={loading.updates}
        >
          {loading.updates ? 'Buscando...' : '🔄 Buscar Actualizaciones'}
        </button>
        <button className={`btn btn-copy ${copied ? 'active' : ''}`} onClick={handleCopyMessage}>{copied ? '✓ Copiado' : '📑 Copiar'}</button>
        <button className="btn btn-save" onClick={saveDisplay}>✓ Guardar</button>
      </div>
    </div>
  )
}
