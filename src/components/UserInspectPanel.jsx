import React, { useMemo, useRef, useEffect } from 'react'
import { useChatStore } from '../store/useChatStore'
import ChatMessage from './ChatMessage'
import './UserInspectPanel.css'

const UserInspectPanel = () => {
  const { inspectedUser, closeInspection, messages, config } = useChatStore()
  const listRef = useRef(null)

  const userMessages = useMemo(() => {
    if (!inspectedUser) return []
    return messages.filter(m => 
      m.author === inspectedUser.username && 
      m.platform === inspectedUser.platform
    )
  }, [messages, inspectedUser])

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = 0 // Show latest first
    }
  }, [userMessages])

  if (!inspectedUser) return null

  return (
    <div className="inspect-panel">
      <div className="inspect-header">
        <div className="inspect-user">
          <img src={inspectedUser.avatar} alt="" className="inspect-avatar" />
          <div className="inspect-info">
            <span className="inspect-name">{inspectedUser.username}</span>
            <span className="inspect-platform">{inspectedUser.platform.toUpperCase()}</span>
          </div>
        </div>
        <button className="inspect-close" onClick={closeInspection}>✕</button>
      </div>

      <div className="inspect-stats">
        <div className="stat-box">
          <span className="stat-val">{userMessages.length}</span>
          <span className="stat-label">MENSAJES</span>
        </div>
      </div>

      <div className="inspect-list" ref={listRef}>
        {userMessages.map(msg => (
          <ChatMessage key={msg.id} msg={msg} config={config?.display} isInspection={true} />
        ))}
        {userMessages.length === 0 && (
          <div className="inspect-empty">No hay mensajes recientes de este usuario.</div>
        )}
      </div>
    </div>
  )
}

export default UserInspectPanel
