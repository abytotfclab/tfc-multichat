import { useEffect, useRef } from 'react'
import { useChatStore } from '../store/useChatStore'
import ChatMessage from './ChatMessage'
import './ChatList.css'

export default function ChatList({ config, autoScroll }) {
  const { messages, isPaused } = useChatStore()
  const bottomRef = useRef(null)
  const listRef = useRef(null)

  useEffect(() => {
    if (!autoScroll || isPaused) return
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, autoScroll, isPaused])

  const visible = messages // already filtered in store

  if (visible.length === 0) {
    return (
      <div className="chat-empty">
        <div className="chat-empty__icon">💬</div>
        <p>Esperando mensajes...</p>
        <p className="chat-empty__hint">Conecta Twitch, TikTok o YouTube</p>
      </div>
    )
  }

  return (
    <div className="chat-list" ref={listRef}>
      {isPaused && (
        <div className="chat-paused">⏸ Chat pausado — scroll para continuar</div>
      )}
      {[...visible].reverse().map(msg => (
        <ChatMessage key={msg.id} msg={msg} config={config} />
      ))}
      <div ref={bottomRef} style={{ height: 1 }} />
    </div>
  )
}
