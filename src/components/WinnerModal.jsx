import React, { useMemo, useRef, useEffect } from 'react'
import { useChatStore } from '../store/useChatStore'
import ChatMessage from './ChatMessage'
import './WinnerModal.css'

export default function WinnerModal() {
  const { winner, clearWinner, messages, config } = useChatStore()
  const listRef = useRef(null)

  const winnerMessages = useMemo(() => {
    if (!winner) return []
    return messages.filter(m => 
      m.author === winner.username && 
      m.platform === winner.platform
    ).slice(0, 50) // Show last 50
  }, [messages, winner])

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = 0
    }
  }, [winnerMessages])

  if (!winner) return null

  return (
    <div className="winner-overlay">
      <div className="winner-modal">
        <button className="winner-close" onClick={clearWinner}>✕</button>
        
        <div className="winner-header">
          <div className="confetti">🎊</div>
          <h2>¡TENEMOS UN GANADOR!</h2>
          <div className="confetti">🎊</div>
        </div>
        
        <div className="winner-main-info">
          <div className="winner-avatar-wrapper">
            <img src={winner.avatar} alt={winner.username} className="winner-avatar" />
            <div className="winner-platform-badge" data-platform={winner.platform}>
              {winner.platform === 'twitch' && '🟣'}
              {winner.platform === 'tiktok' && '⚡'}
              {winner.platform === 'youtube' && '🔴'}
            </div>
          </div>
          <h1 className="winner-name">{winner.username}</h1>
          <p className="winner-platform-text">Ganador desde {winner.platform.toUpperCase()}</p>
          
          {winner.word && (
            <div className="winner-word-reveal">
              <span>La respuesta era:</span>
              <strong>{winner.word.toUpperCase()}</strong>
            </div>
          )}
        </div>

        <div className="winner-feed-section">
          <div className="feed-header">
            <span>HISTORIAL DE {winner.username.toUpperCase()}</span>
            <div className="feed-badge">{winnerMessages.length} msg</div>
          </div>
          <div className="winner-feed-list" ref={listRef}>
            {winnerMessages.map(msg => (
              <ChatMessage key={msg.id} msg={msg} config={config?.display} isInspection={true} />
            ))}
            {winnerMessages.length === 0 && (
              <div className="feed-empty">Esperando el primer mensaje del ganador...</div>
            )}
          </div>
        </div>

        <button className="winner-btn" onClick={clearWinner}>CERRAR VENTANA</button>
      </div>
    </div>
  )
}
