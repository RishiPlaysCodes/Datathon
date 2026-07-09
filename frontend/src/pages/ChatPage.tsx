import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Sparkles, Info } from 'lucide-react'
import { aiAPI } from '@/lib/api'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import type { ChatMessage } from '@/types'
import ReactMarkdown from 'react-markdown'

export function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "Namaste! I'm **PRAHARI** - your Crime Intelligence Assistant. I can help you search FIRs, analyze criminal networks, assess risk scores, and identify crime hotspots. Try asking:\n\n- \"Show chain-snatching cases in Koramangala last 6 months\"\n- \"Who are the repeat offenders?\"\n- \"Show criminal network for Ravi Kumar\"\n- \"Crime hotspots in Bangalore\"\n\nWhat would you like to investigate?",
      suggestions: [
        "Show recent chain snatching cases",
        "List all repeat offenders",
        "Crime statistics last quarter",
        "Hotspots in Bangalore",
      ],
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | undefined>()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-dark-700/50">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary-400" />
            AI Crime Intelligence Chat
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Natural language queries powered by hybrid NLU + RAG</p>
        </div>
        {sessionId && (
          <span className="text-xs text-gray-600 font-mono">Session: {sessionId.slice(0, 8)}...</span>
        )}
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
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage() }}
          className="flex items-center gap-3"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about crimes, accused, hotspots, networks..."
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
      </div>
    </div>
  )
}

function MessageBubble({ message, onSuggestionClick }: { message: ChatMessage; onSuggestionClick: (text: string) => void }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isUser ? 'bg-dark-700' : 'bg-primary-600/20'
      }`}>
        {isUser ? <User className="w-4 h-4 text-gray-300" /> : <Bot className="w-4 h-4 text-primary-400" />}
      </div>

      <div className={`max-w-[75%] space-y-2 ${isUser ? 'items-end' : ''}`}>
        <div className={`rounded-xl px-4 py-3 ${
          isUser
            ? 'bg-primary-600 text-white'
            : 'glass-card text-gray-200'
        }`}>
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
