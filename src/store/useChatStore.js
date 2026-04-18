import { create } from 'zustand'

const MAX_MESSAGES = 200
const seenIds = new Set()

const DEFAULT_TTS_SETTINGS = {
  everyone: true,
  moderator: false,
  vip: false,
  subscriber: false,
  twitch: true,
  tiktok: true,
  youtube: true,
  selectedVoice: '',
  pitch: 1.0,
  rate: 1.1
}

export const useChatStore = create((set, get) => ({
  messages: [],
  status: {
    twitch:  { connected: false, channel: '' },
    tiktok:  { connected: false, username: '' },
    youtube: { connected: false, channel: '' }
  },
  config: null,
  filters: { twitch: true, tiktok: true, youtube: true },
  isPaused: false,
  ttsEnabled: false,
  ttsSettings: DEFAULT_TTS_SETTINGS,
  
  // Licensing State
  isLicensed: false,
  machineId: '',
  licenseLoading: true,

  showGiveaway: false,
  giveawayParticipants: [],
  winner: null,
  
  // Giveaway State
  giveawayMode: 'raffle', 
  giveawayFilters: { twitch: true, tiktok: true, youtube: true },
  guessWord: '',
  guessActive: false,
  guessHintLevel: 0, 
  revealedIndices: [],

  // User Inspection
  inspectedUser: null, // { username, platform, avatar }

  init: async () => {
    if (!window.electron) return
    
    set({ licenseLoading: true })
    const license = await window.electron.invoke('license:get-status')
    
    const config = await window.electron.getConfig()
    const status = await window.electron.getStatus()
    
    set({ 
      config, 
      status, 
      isLicensed: license.isValid,
      machineId: license.hwid,
      licenseLoading: false,
      ttsEnabled: config.ttsEnabled ?? false,
      ttsSettings: { ...DEFAULT_TTS_SETTINGS, ...(config.ttsSettings || {}) }
    })

    window.electron.onMessage(msg => {
      const { 
        filters, isPaused, ttsEnabled, ttsSettings, giveawayParticipants, 
        config, giveawayMode, giveawayFilters, guessWord, guessActive, winner 
      } = get()
      
      const isModOrHigher = msg.badges?.includes('moderator') || msg.badges?.includes('broadcaster')

      // -- Giveaway Logic --
      if (giveawayFilters[msg.platform]) {
        if (giveawayMode === 'raffle') {
          const cmd = config?.giveawayCommand || '!sorteo'
          if (msg.message.toLowerCase().trim() === cmd.toLowerCase().trim()) {
            const alreadyIn = giveawayParticipants.some(p => p.username === msg.author && p.platform === msg.platform)
            if (!alreadyIn) {
              set(s => ({ giveawayParticipants: [...s.giveawayParticipants, { username: msg.author, platform: msg.platform, avatar: msg.avatar }] }))
            }
          }
        } else if (giveawayMode === 'guess' && guessActive && !winner) {
          if (msg.message.toLowerCase().trim() === guessWord.toLowerCase().trim()) {
            set({ 
              winner: { username: msg.author, platform: msg.platform, avatar: msg.avatar, word: guessWord }, 
              guessActive: false 
            })
          }
        }
      }

      // -- Chat Feed Logic --
      if (!filters[msg.platform]) return
      if (isPaused) return

      // -- TTS Logic --
      let forceTTS = false
      if (isModOrHigher && msg.message.toLowerCase().startsWith('!s ')) {
        forceTTS = true
      }

      if (ttsEnabled || forceTTS) {
        let shouldRead = forceTTS
        
        if (!shouldRead) {
          shouldRead = true
          if (!ttsSettings[msg.platform]) shouldRead = false
          if (shouldRead && !ttsSettings.everyone) {
            const matchRole = (ttsSettings.moderator && isModOrHigher) ||
                              (ttsSettings.vip && msg.badges?.includes('vip')) ||
                              (ttsSettings.subscriber && msg.badges?.includes('subscriber'))
            if (!matchRole) shouldRead = false
          }
        }

        if (shouldRead) {
          const textToSpeak = forceTTS ? msg.message.substring(3).trim() : msg.message
          const intro = forceTTS ? `${msg.author} te avisa: ` : `${msg.author} dice: `
          
          const utterance = new SpeechSynthesisUtterance(`${intro}${textToSpeak}`)
          utterance.rate = ttsSettings.rate || 1.1
          utterance.pitch = ttsSettings.pitch || 1.0

          if (ttsSettings.selectedVoice) {
            const voices = window.speechSynthesis.getVoices()
            const voice = voices.find(v => v.voiceURI === ttsSettings.selectedVoice)
            if (voice) utterance.voice = voice
          }
          
          window.speechSynthesis.speak(utterance)
        }
      }

      if (msg.id && seenIds.has(msg.id)) return
      if (msg.id) {
        seenIds.add(msg.id)
        if (seenIds.size > 1000) { const first = seenIds.values().next().value; seenIds.delete(first) }
      }
      set(s => ({ messages: [msg, ...s.messages].slice(0, MAX_MESSAGES) }))
    })

    window.electron.onStatus(status => set({ status }))
    window.electron.onConfigUpdate(config => set({ 
      config, 
      ttsEnabled: config.ttsEnabled,
      ttsSettings: { ...DEFAULT_TTS_SETTINGS, ...(config.ttsSettings || {}) }
    }))
  },

  clearMessages: () => set({ messages: [] }),
  toggleFilter: (platform) => set(s => ({ filters: { ...s.filters, [platform]: !s.filters[platform] } })),
  toggleTTS: () => set(s => {
    const next = !s.ttsEnabled
    window.electron?.saveConfig({ ttsEnabled: next })
    return { ttsEnabled: next }
  }),
  setTTSSettings: (partial) => set(s => {
    const next = { ...s.ttsSettings, ...partial }
    window.electron?.saveConfig({ ttsSettings: next })
    return { ttsSettings: next }
  }),

  // User Inspection Actions
  inspectUser: (user) => set({ inspectedUser: user }),
  closeInspection: () => set({ inspectedUser: null }),

  // Giveaway Actions
  toggleGiveawayUI: () => set(s => ({ showGiveaway: !s.showGiveaway })),
  toggleGiveawayFilter: (platform) => set(s => ({ giveawayFilters: { ...s.giveawayFilters, [platform]: !s.giveawayFilters[platform] } })),
  clearGiveaway: () => set({ giveawayParticipants: [], winner: null, guessActive: false, guessHintLevel: 0, revealedIndices: [] }),
  setGiveawayMode: (mode) => set({ giveawayMode: mode, winner: null, guessActive: false, giveawayParticipants: [], guessHintLevel: 0, revealedIndices: [] }),
  setGuessWord: (word) => set({ guessWord: word }),
  startGuess: () => set({ guessActive: true, winner: null, guessHintLevel: 0, revealedIndices: [] }),
  nextHint: () => set(s => {
    if (s.guessHintLevel === 0) return { guessHintLevel: 1 }
    const unrevealed = []
    for (let i = 0; i < s.guessWord.length; i++) { if (!s.revealedIndices.includes(i) && s.guessWord[i] !== ' ') unrevealed.push(i) }
    if (unrevealed.length === 0) return {}
    const randomIdx = unrevealed[Math.floor(Math.random() * unrevealed.length)]
    return { guessHintLevel: s.guessHintLevel + 1, revealedIndices: [...s.revealedIndices, randomIdx] }
  }),
  setGiveawayCommand: (cmd) => set(s => {
    const nextCfg = { ...s.config, giveawayCommand: cmd }; window.electron?.saveConfig({ giveawayCommand: cmd }); return { config: nextCfg }
  }),
  simulateGiveaway: () => set(s => {
    const platforms = ['twitch', 'tiktok', 'youtube']
    const mocks = Array.from({ length: 40 }, (_, i) => ({ username: `Streamer_${i + 1}`, platform: platforms[i % 3], avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=User_${i}` }))
    return { giveawayParticipants: mocks }
  }),
  simulateGuessWin: () => set(s => ({ winner: { username: 'Simulacion_Fan', platform: 'tiktok', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sim', word: s.guessWord || 'Palabra' }, guessActive: false })),
  setWinner: (winner) => set({ winner }),
  clearWinner: () => set({ winner: null }),
  togglePause: () => set(s => ({ isPaused: !s.isPaused })),
  setStatus: (status) => set({ status }),
  setConfig: (config) => set({ config }),

  activateApp: async (key) => {
    set({ licenseLoading: true })
    const res = await window.electron.invoke('license:activate', key)
    if (res.success) {
      set({ isLicensed: true, licenseLoading: false })
      return { success: true }
    } else {
      set({ licenseLoading: false })
      return { success: false, error: res.error }
    }
  }
}))
