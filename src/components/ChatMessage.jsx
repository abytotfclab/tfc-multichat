import { useChatStore } from '../store/useChatStore'
import './ChatMessage.css'

/* ── Platform SVG logo silhouettes ───────────────────────────────────────── */
const TwitchLogo = () => (
  <svg viewBox="0 0 24 28" fill="currentColor" aria-label="Twitch">
    <path d="M2.149 0L.34 4.64v19.16h6.5V28l4.5-4.2h4.9L23.66 16V0H2.149zm19.511 14.8l-4 3.7h-5l-3.5 3.3v-3.3H4.64V2h17.02v12.8z"/>
    <path d="M13.96 6H11.9v5.5h2.06V6zM19.06 6H17v5.5h2.06V6z"/>
  </svg>
)

const TikTokLogo = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-label="TikTok">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.77 1.52V6.73a4.85 4.85 0 01-1-.04z"/>
  </svg>
)

const YouTubeLogo = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-label="YouTube">
    <path d="M23.5 6.19a3.02 3.02 0 00-2.12-2.14C19.54 3.5 12 3.5 12 3.5s-7.54 0-9.38.55A3.02 3.02 0 00.5 6.19C0 8.04 0 12 0 12s0 3.96.5 5.81a3.02 3.02 0 002.12 2.14C4.46 20.5 12 20.5 12 20.5s7.54 0 9.38-.55a3.02 3.02 0 002.12-2.14C24 15.96 24 12 24 12s0-3.96-.5-5.81zM9.75 15.52V8.48L16 12l-6.25 3.52z"/>
  </svg>
)

const PLATFORM = {
  twitch:  { Logo: TwitchLogo,  color: '#9146FF', bg: 'rgba(145,70,255,0.15)' },
  tiktok:  { Logo: TikTokLogo,  color: '#00E5CC', bg: 'rgba(0,229,204,0.12)' },
  youtube: { Logo: YouTubeLogo, color: '#FF0000', bg: 'rgba(255,0,0,0.10)' },
}

  subscriber:  '★',
  vip:         '💎',
}

const EVENT_ICONS = {
  sub:    '💖',
  resub:  '🔥',
  gift:   '🎁',
  follow: '✅',
  join:   '👋',
  cheer:  '💎',
}

export default function ChatMessage({ msg, config = {}, isInspection = false }) {
  const { inspectUser } = useChatStore()
  const p = PLATFORM[msg.platform] || PLATFORM.twitch
  const { Logo } = p
  const time = config.showTimestamp
    ? new Date(msg.timestamp).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
    : null
  const fontSize = config.fontSize || 14

  const isSpecial = msg.badges?.some(b => ['broadcaster', 'moderator', 'vip'].includes(b))
  const specialClass = msg.badges?.includes('broadcaster') ? 'msg--broadcaster' 
                     : msg.badges?.includes('moderator') ? 'msg--moderator'
                     : msg.badges?.includes('vip') ? 'msg--vip' : ''

  const handleUserClick = () => {
    if (isInspection) return // Already in inspection
    inspectUser({ username: msg.author, platform: msg.platform, avatar: msg.avatar })
  }

  if (msg.type === 'event') {
    return (
      <div 
        className={`msg msg--event msg--${msg.event}`}
        style={{ '--p-color': msg.color || p.color, fontSize: `${fontSize}px` }}
      >
        <span className="msg__event-icon">{EVENT_ICONS[msg.event] || '⭐'}</span>
        <div className="msg__body">
          <span className="msg__author">{msg.author}</span>
          <span className="msg__event-text">{msg.message}</span>
        </div>
        {time && <span className="msg__time">{time}</span>}
      </div>
    )
  }

  return (
    <div
      className={`msg ${specialClass} ${isInspection ? 'msg--inspected' : ''}`}
      style={{ '--p-color': p.color, '--p-bg': p.bg, fontSize: `${fontSize}px` }}
    >
      {/* Platform logo badge */}
      {config.showPlatformBadge !== false && !isInspection && (
        <span className="msg__platform" title={msg.platform}>
          <Logo />
        </span>
      )}

      <div className="msg__body">
        <div className="msg__header">
          {/* Badges */}
          {msg.badges?.length > 0 && (
            <span className="msg__badges">
              {msg.badges.slice(0, 3).map((b, i) => (
                <span key={i} className="msg__badge">{BADGE_ICONS[b] || '•'}</span>
              ))}
            </span>
          )}

          {/* Avatar */}
          {config.showAvatars && msg.avatar && (
            <img 
              src={msg.avatar} 
              alt="" 
              className="msg__avatar clickable" 
              onClick={handleUserClick}
            />
          )}

          {/* Author */}
          <span
            className="msg__author clickable"
            style={{ color: config.coloredUsernames !== false ? (msg.authorColor || p.color) : 'var(--text-sub)' }}
            onClick={handleUserClick}
          >
            {msg.author}
          </span>

          {time && <span className="msg__time">{time}</span>}
        </div>

        <p className="msg__text">{msg.message}</p>
      </div>
    </div>
  )
}
