import React, { useState, useEffect } from 'react'
import './TranslatorPanel.css'
import { useChatStore } from '../store/useChatStore'

const LANGUAGES = [
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' }
]

export default function TranslatorPanel() {
  const { toggleTranslator } = useChatStore()
  const [sourceText, setSourceText] = useState('')
  const [translatedText, setTranslatedText] = useState('')
  const [sourceLang, setSourceLang] = useState('es')
  const [targetLang, setTargetLang] = useState('en')
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState('')

  const handleTranslate = async () => {
    if (!sourceText.trim()) return
    
    setIsLoading(true)
    setStatus('Traduciendo...')
    
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(sourceText)}`
      const response = await fetch(url)
      const data = await response.json()
      
      if (data && data[0]) {
        const result = data[0].map(item => item[0]).join('')
        setTranslatedText(result)
        setStatus('')
      }
    } catch (error) {
      console.error('Translation error:', error)
      setStatus('Error al traducir')
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-translate with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (sourceText.trim()) {
        handleTranslate()
      } else {
        setTranslatedText('')
        setStatus('')
      }
    }, 800)

    return () => clearTimeout(timer)
  }, [sourceText, sourceLang, targetLang])

  const swapLanguages = () => {
    const temp = sourceLang
    setSourceLang(targetLang)
    setTargetLang(temp)
    setSourceText(translatedText)
    setTranslatedText(sourceText)
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setStatus('¡Copiado!')
    setTimeout(() => setStatus(''), 2000)
  }

  const CustomSelect = ({ value, onChange, options }) => {
    const [isOpen, setIsOpen] = useState(false)
    const selected = options.find(o => o.code === value)

    return (
      <div className="custom-select-container">
        <div className="custom-select-trigger" onClick={() => setIsOpen(!isOpen)}>
          <span>{selected.flag} {selected.name}</span>
          <span className={`arrow ${isOpen ? 'up' : 'down'}`}>▾</span>
        </div>
        {isOpen && (
          <div className="custom-options">
            {options.map(opt => (
              <div 
                key={opt.code} 
                className={`custom-option ${value === opt.code ? 'selected' : ''}`}
                onClick={() => {
                  onChange(opt.code)
                  setIsOpen(false)
                }}
              >
                {opt.flag} {opt.name}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="translator-panel animate-slide-in">
      <div className="translator-header">
        <div className="translator-title">
          <span className="icon">🌐</span>
          <h3>Traductor en Vivo</h3>
        </div>
        <button className="close-btn" onClick={toggleTranslator}>✕</button>
      </div>

      <div className="translator-controls">
        <CustomSelect 
          value={sourceLang} 
          onChange={setSourceLang}
          options={LANGUAGES}
        />

        <button className="swap-btn-new" onClick={swapLanguages} title="Intercambiar idiomas">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17 7L21 11L17 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M3 11H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M7 17L3 13L7 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M21 13H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <CustomSelect 
          value={targetLang} 
          onChange={setTargetLang}
          options={LANGUAGES}
        />
      </div>

      <div className="translator-io">
        <div className="io-group">
          <label>Texto Original</label>
          <textarea
            placeholder="Escribe algo aquí..."
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            className="source-area"
          />
          {sourceText && (
            <button className="inner-copy" onClick={() => copyToClipboard(sourceText)}>📋</button>
          )}
        </div>

        <div className="io-group result">
          <label>Traducción</label>
          <div className={`result-area ${isLoading ? 'loading' : ''}`}>
            {translatedText || (isLoading ? 'Traduciendo...' : 'Traducción aparecerá aquí')}
          </div>
          {translatedText && (
            <button className="inner-copy" onClick={() => copyToClipboard(translatedText)}>📋</button>
          )}
        </div>
      </div>

      {status && <div className="translator-status">{status}</div>}
      
      <div className="translator-footer">
         <p>Impulsado por Google Translate</p>
      </div>
    </div>
  )
}
