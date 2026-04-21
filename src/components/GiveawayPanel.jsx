import React from 'react'
import { useChatStore } from '../store/useChatStore'
import './GiveawayPanel.css'

const GiveawayPanel = () => {
  const { 
    giveawayParticipants, clearGiveaway, config, setGiveawayCommand, 
    simulateGiveaway, setWinner, winner,
    giveawayMode, setGiveawayMode, guessWord, setGuessWord, 
    guessActive, startGuess, simulateGuessWin,
    guessHintLevel, nextHint, revealedIndices,
    giveawayFilters, toggleGiveawayFilter
  } = useChatStore()

  const handleRoll = () => {
    if (giveawayParticipants.length === 0) return
    const randomIdx = Math.floor(Math.random() * giveawayParticipants.length)
    setWinner(giveawayParticipants[randomIdx])
  }

  const renderHint = () => {
    if (guessHintLevel === 0) return <div className="hint-locked">🔒 PALABRA OCULTA</div>
    return (
      <div className="hint-display">
        {guessWord.split('').map((char, i) => {
          if (char === ' ') return <span key={i} className="hint-space">&nbsp;</span>
          const isRevealed = revealedIndices.includes(i)
          return (
            <span key={i} className={`hint-letter ${isRevealed ? 'revealed' : ''}`}>
              {isRevealed ? char.toUpperCase() : '_'}
            </span>
          )
        })}
      </div>
    )
  }

  return (
    <div className="giveaway">
      <div className="giveaway__header">
        <div className="giveaway__header-left">
           <span className="giveaway__title">EVENTOS DE COMUNIDAD</span>
           <div className="giveaway__plat-filters">
             <button 
                className={`plat-filter-btn ${giveawayFilters.twitch ? 'active' : ''}`}
                onClick={() => toggleGiveawayFilter('twitch')}
             >💜 TWITCH</button>
             <button 
                className={`plat-filter-btn ${giveawayFilters.tiktok ? 'active' : ''}`}
                onClick={() => toggleGiveawayFilter('tiktok')}
             >🧡 TIKTOK</button>
             <button 
                className={`plat-filter-btn ${giveawayFilters.youtube ? 'active' : ''}`}
                onClick={() => toggleGiveawayFilter('youtube')}
             >❤️ YOUTUBE</button>
           </div>
        </div>
        <button className="btn-clear-giveaway" onClick={clearGiveaway} title="Resetear">🔄</button>
      </div>

      <div className="giveaway__mode-selector">
        <button 
          className={`mode-btn ${giveawayMode === 'raffle' ? 'active' : ''}`}
          onClick={() => setGiveawayMode('raffle')}
        >🎟️ Sorteo</button>
        <button 
          className={`mode-btn ${giveawayMode === 'guess' ? 'active' : ''}`}
          onClick={() => setGiveawayMode('guess')}
        >🧠 Adivinar</button>
      </div>

      <div className="giveaway__body">
        {giveawayMode === 'raffle' ? (
          <>
            <div className="giveaway__info">
              <div className="info__stat">
                <span className="stat__val">{giveawayParticipants.length}</span>
                <span className="stat__label">Participantes</span>
              </div>
              <div className="giveaway__config">
                <label>Comando de entrada:</label>
                <input 
                  type="text" 
                  value={config?.giveawayCommand || ''} 
                  onChange={(e) => setGiveawayCommand(e.target.value)}
                  placeholder="!sorteo"
                />
              </div>
            </div>

            <div className="giveaway__list">
              {giveawayParticipants.map((p, i) => (
                <div key={`${p.username}-${i}`} className="participant-chip">
                  <img src={p.avatar} alt="" />
                  <span>{p.username}</span>
                </div>
              ))}
              {giveawayParticipants.length === 0 && (
                <div className="empty-msg">Esperando participaciones...</div>
              )}
            </div>

            <div className="giveaway__actions">
              <button className="btn btn-sim" onClick={simulateGiveaway}>🧪 Simular 40</button>
              <button 
                className="btn btn-roll" 
                onClick={handleRoll}
                disabled={giveawayParticipants.length === 0}
              >
                Elegir Ganador
              </button>
            </div>
          </>
        ) : (
          <div className="giveaway__guess-mode">
            <div className="guess__config">
              <label>RESPUESTA CORRECTA</label>
              <input 
                type={guessActive ? "password" : "text"} 
                className={guessActive ? "input--hidden" : ""}
                value={guessWord} 
                onChange={(e) => setGuessWord(e.target.value)}
                placeholder="Escribe la respuesta..."
                disabled={guessActive}
              />
            </div>

            <div className="guess__display-area">
              {guessActive ? (
                <div className="guess__active-view">
                   {renderHint()}
                   <button className="btn-hint" onClick={nextHint}>
                     💡 {guessHintLevel === 0 ? "Revelar Longitud" : "Revelar Letra"}
                   </button>
                </div>
              ) : (
                <button 
                  className="btn btn-start-guess" 
                  onClick={startGuess}
                  disabled={!guessWord.trim()}
                >
                  🚀 INICIAR DESAFÍO
                </button>
              )}
            </div>

            <div className="giveaway__actions" style={{marginTop: 'auto'}}>
               <button className="btn btn-sim" onClick={simulateGuessWin}>🧪 Simular Ganador</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default GiveawayPanel
