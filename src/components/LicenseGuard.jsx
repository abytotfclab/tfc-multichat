import { useState } from 'react'
import { useChatStore } from '../store/useChatStore'
import './LicenseGuard.css'

export default function LicenseGuard({ children }) {
  const { isLicensed, machineId, licenseLoading, activateApp } = useChatStore()
  const [key, setKey] = useState('')
  const [error, setError] = useState('')

  async function handleActivate() {
    if (!key.trim()) return setError('Ingresa una llave de activación')
    setError('')
    const res = await activateApp(key.trim())
    if (!res.success) {
      setError(res.error)
    }
  }

  function handleCopyHWID() {
    navigator.clipboard.writeText(machineId)
    // Optional: show a toast or feedback
  }

  if (licenseLoading) {
    return (
      <div className="license-screen">
        <div className="license-box">
          <div className="license-spinner"></div>
          <p>Verificando licencia...</p>
        </div>
      </div>
    )
  }

  if (isLicensed) {
    return children
  }

  return (
    <div className="license-screen">
      <div className="license-box animate-pop">
        <div className="license-header">
          <span className="license-badge">🛡️ SEGURIDAD</span>
          <h1>TFC MultiChat Streamer</h1>
          <p>Esta copia no está activada. Por favor, ingresa tu llave.</p>
        </div>

        <div className="license-hwid">
          <label>ID DE HARDWARE (HWID):</label>
          <div className="hwid-container">
            <code>{machineId || 'Cargando...'}</code>
            <button onClick={handleCopyHWID} title="Copiar ID">📋</button>
          </div>
          <small>Envía este ID al soporte para obtener tu llave.</small>
        </div>

        <div className="license-input">
          <input 
            type="text" 
            placeholder="TFC-STREAMER-XXXX-XXXX-XXXX" 
            value={key}
            onChange={e => setKey(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleActivate()}
          />
          {error && <span className="license-error">{error}</span>}
        </div>

        <button className="license-btn" onClick={handleActivate}>
          ACTIVAR AHORA 🚀
        </button>

        <div className="license-footer">
          <p>© 2026 TFC Lab | McCarthy Edition</p>
        </div>
      </div>
    </div>
  )
}
