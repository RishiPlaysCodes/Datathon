import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Sparkles, Info, Mic, MicOff, Volume2, VolumeX } from 'lucide-react'
import { aiAPI } from '@/lib/api'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import type { ChatMessage } from '@/types'
import ReactMarkdown from 'react-markdown'

// Web Speech API is vendor-prefixed in some browsers and typed loosely here so
// the app builds without extra type packages.
const SpeechRecognitionImpl: any =
  typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : undefined
const VOICE_SUPPORTED = typeof window !== 'undefined' && !!SpeechRecognitionImpl
const TTS_SUPPORTED = typeof window !== 'undefined' && 'speechSynthesis' in window

// Convert markdown-ish response text into something natural for text-to-speech.
function toSpeakableText(markdown: string): string {
  return markdown
    .replace(/\*\*/g, '')
    .replace(/[*_`#>-]/g, ' ')
    .replace(/\n+/g, '. ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 600)
}

export function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        "Namaste! I'm **PRAHARI** - your Crime Intelligence Assistant. Ask me in **English or Hinglish**, or tap the mic and speak. Try:\n\n- \"Show chain-snatching cases in Koramangala last 6 months\"\n- \"chori ke case dikhao\"\n- \"Show criminal network for Ravi Kumar\"\n- \"Crime hotspots in Bangalore\"\n\nType **help** to see everything I can do.",
      suggestions: [
        'What can you do?',
        'Show recent chain snatching cases',
        'List all repeat offenders',
        'Hotspots in Bangalore',
      ],
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | undefined>()
  const [listening, setListening] = useState(false)
  const [voiceReplies, setVoiceReplies] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Stop any ongoing speech/recognition when leaving the page.
  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop()
        if (TTS_SUPPORTED) window.speechSynthesis.cancel()
      } catch {
        /* no-op */
      }
    }
  }, [])

  const speak = (text: string) => {
    if (!TTS_SUPPORTED) return
    try {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(toSpeakableText(text))
      utterance.rate = 1.02
      utterance.pitch = 1
      // Prefer an English (India) voice when available.
      const voices = window.speechSynthesis.getVoices()
      const preferred = voices.find(v => /en-IN/i.test(v.lang)) || voices.find(v => /^en/i.test(v.lang))
      if (preferred) utterance.voice = preferred
      window.speechSynthesis.speak(utterance)
    } catch {
      /* speech synthesis is best-effort */
    }
  }

  const startListening = () => {
    if (!VOICE_SUPPORTED || loading) return
    try {
      const recognition = new SpeechRecognitionImpl()
      recognition.lang = 'en-IN'
      recognition.interimResults = false
      recognition.maxAlternatives = 1
      recognition.continuous = false

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript?.trim()
        if (transcript) {
          setInput(transcript)
          // Auto-send what the user spoke.
          sendMessage(transcript)
        }
      }
      recognition.onerror = () => setListening(false)
      recognition.onend = () => setListening(false)

      recognitionRef.current = recognition
      setListening(true)
      recognition.start()
    } catch {
      setListening(false)
    }
  }

  const stopListening = () => {
    try {
      recognitionRef.current?.stop()
    } catch {
      /* no-op */
    }
    setListening(false)
  }

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim()
    if (!messageText || loading) return

    const userMessage: ChatMessage = { role: 'user', content: messageText }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await aiAPI.chat(messageText, sessionId)
      setSessionId(response.session_id)

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.response,
        data: response.data,
        sources: response.sources,
        suggestions: response.suggestions,
        intent: response.intent,
        confidence: response.confidence,
      }
      setMessages(prev => [...prev, assistantMessage])
      if (voiceReplies) speak(response.response)
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error processing your query. Please try again.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const toggleVoiceReplies = () => {
    const next = !voiceReplies
    setVoiceReplies(next)
    if (!next && TTS_SUPPORTED) window.speechSynthesis.cancel()
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-dark-700/50">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary-400" />
            AI Crime Intelligence Chat
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            English + Hinglish · voice enabled · hybrid NLU + RAG
          </p>
        </div>
        <div className="flex items-center gap-3">
          {TTS_SUPPORTED && (
            <button
              onClick={toggleVoiceReplies}
              title={voiceReplies ? 'Voice replies on' : 'Voice replies off'}
              className={`p-2 rounded-lg border transition-colors ${
                voiceReplies
                  ? 'border-primary-500/50 text-primary-400 bg-primary-500/10'
                  : 'border-dark-700 text-gray-500 hover:text-gray-300'
              }`}
            >
              {voiceReplies ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          )}
          {sessionId && (
            <span className="text-xs text-gray-600 font-mono hidden sm:inline">
              Session: {sessionId.slice(0, 8)}...
            </span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {messages.map((msg, idx) => (
          <MessageBubble key={idx} message={msg} onSuggestionClick={sendMessage} />
        ))}
        {loading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-600/20 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-primary-400" />
            </div>
            <div className="glass-card px-4 py-3">
              <LoadingSpinner size="sm" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="pt-4 border-t border-dark-700/50">
        {listening && (
          <div className="flex items-center gap-2 text-xs text-primary-400 mb-2 animate-pulse">
            <Mic className="w-3.5 h-3.5" />
            Listening... bolna shuru karo
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            sendMessage()
          }}
          className="flex items-center gap-2 sm:gap-3"
        >
          {VOICE_SUPPORTED && (
            <button
              type="button"
              onClick={listening ? stopListening : startListening}
              disabled={loading}
              title={listening ? 'Stop listening' : 'Speak your query'}
              className={`p-3 rounded-lg border transition-colors disabled:opacity-40 ${
                listening
                  ? 'border-red-500/50 text-red-400 bg-red-500/10 animate-pulse'
                  : 'border-dark-700 text-gray-400 hover:text-primary-400 hover:border-primary-500/50'
              }`}
            >
              {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          )}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={listening ? 'Listening...' : 'Ask about crimes, accused, hotspots, networks...'}
            className="input-field flex-1"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="btn-primary p-3 disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        {!VOICE_SUPPORTED && (
          <p className="text-[10px] text-gray-600 mt-1.5">
            Voice input needs Chrome/Edge. Typing works everywhere.
          </p>
        )}
      </div>
    </div>
  )
}

function MessageBubble({
  message,
  onSuggestionClick,
}: {
  message: ChatMessage
  onSuggestionClick: (text: string) => void
}) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser ? 'bg-dark-700' : 'bg-primary-600/20'
        }`}
      >
        {isUser ? <User className="w-4 h-4 text-gray-300" /> : <Bot className="w-4 h-4 text-primary-400" />}
      </div>

      <div className={`max-w-[75%] space-y-2 ${isUser ? 'items-end' : ''}`}>
        <div className={`rounded-xl px-4 py-3 ${isUser ? 'bg-primary-600 text-white' : 'glass-card text-gray-200'}`}>
          <div className="text-sm leading-relaxed prose prose-invert prose-sm max-w-none">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        </div>

        {/* Sources */}
        {message.sources && message.sources.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            <Info className="w-3 h-3 text-gray-500" />
            {message.sources.map((src, i) => (
              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-dark-800 text-gray-500">
                {src}
              </span>
            ))}
          </div>
        )}

        {/* Confidence */}
        {message.intent && (
          <div className="flex items-center gap-2 text-[10px] text-gray-600">
            <span>Intent: {message.intent}</span>
            <span>|</span>
            <span>Confidence: {((message.confidence || 0) * 100).toFixed(0)}%</span>
          </div>
        )}

        {/* Suggestions */}
        {message.suggestions && message.suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {message.suggestions.map((suggestion, i) => (
              <button
                key={i}
                onClick={() => onSuggestionClick(suggestion)}
                className="text-xs px-3 py-1.5 rounded-full border border-primary-500/30 text-primary-400 hover:bg-primary-500/10 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
