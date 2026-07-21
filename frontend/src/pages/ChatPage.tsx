import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Bot, User, Sparkles, Info, Download, Mic, MicOff, Globe, Volume2 } from 'lucide-react'
import { aiAPI } from '@/lib/api'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import type { ChatMessage } from '@/types'
import ReactMarkdown from 'react-markdown'
import toast from 'react-hot-toast'

// Kannada translations for common UI elements
const KANNADA_STRINGS: Record<string, string> = {
  'Ask about crimes, accused, hotspots, networks...': 'ಅಪರಾಧಗಳು, ಆರೋಪಿಗಳು, ಹಾಟ್‌ಸ್ಪಾಟ್‌ಗಳ ಬಗ್ಗೆ ಕೇಳಿ...',
  'AI Crime Intelligence Chat': 'AI ಅಪರಾಧ ಬುದ್ಧಿಮತ್ತೆ ಚಾಟ್',
  'Send': 'ಕಳುಹಿಸಿ',
  'Export PDF': 'PDF ರಫ್ತು',
  'Voice Input': 'ಧ್ವನಿ ಇನ್‌ಪುಟ್',
  'Listening...': 'ಆಲಿಸುತ್ತಿದೆ...',
}

export function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "Namaste! I'm **PRAHARI** - your Crime Intelligence Assistant. I can help you search FIRs, analyze criminal networks, assess risk scores, and identify crime hotspots.\n\n🎤 **Voice**: Click the mic button to speak your query\n🌐 **Kannada**: Toggle language for Kannada support\n📄 **PDF**: Export your investigation chat anytime\n\nTry asking:\n- \"Show chain-snatching cases in Koramangala last 6 months\"\n- \"Who are the repeat offenders?\"\n- \"Show criminal network for Ravi Kumar\"\n- \"Crime hotspots in Bangalore\"",
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
  const [isListening, setIsListening] = useState(false)
  const [language, setLanguage] = useState<'en' | 'kn'>('en')
  const [aiStatus, setAiStatus] = useState<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    aiAPI.getStatus().then(setAiStatus).catch(() => {})
  }, [])

  // ========== VOICE INPUT (Web Speech API) ==========
  const startVoiceInput = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      toast.error('Voice input not supported in this browser. Use Chrome.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = language === 'kn' ? 'kn-IN' : 'en-IN'
    recognition.interimResults = true
    recognition.continuous = false

    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => setIsListening(false)
    recognition.onerror = () => {
      setIsListening(false)
      toast.error('Voice recognition failed. Try again.')
    }

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join('')
      setInput(transcript)

      // Auto-send when final result
      if (event.results[0].isFinal) {
        setTimeout(() => {
          setInput(transcript)
        }, 100)
      }
    }

    recognition.start()
    recognitionRef.current = recognition
  }, [language])

  const stopVoiceInput = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }, [])

  // ========== PDF EXPORT ==========
  const exportPDF = useCallback(() => {
    // Generate PDF content as HTML then trigger print/save
    const content = messages.map((msg, idx) => {
      const role = msg.role === 'user' ? '👤 Investigator' : '🤖 PRAHARI AI'
      const time = msg.timestamp || new Date().toLocaleString()
      return `
        <div style="margin-bottom: 16px; padding: 12px; border: 1px solid #ddd; border-radius: 8px; ${msg.role === 'user' ? 'background: #f0f7ff;' : 'background: #f9f9f9;'}">
          <div style="font-weight: bold; color: ${msg.role === 'user' ? '#1d4ed8' : '#059669'}; margin-bottom: 4px;">${role}</div>
          <div style="font-size: 14px; line-height: 1.6;">${msg.content.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>')}</div>
          ${msg.sources && msg.sources.length > 0 ? `<div style="margin-top: 8px; font-size: 11px; color: #666;">Sources: ${msg.sources.join(', ')}</div>` : ''}
          ${msg.intent ? `<div style="font-size: 11px; color: #888;">Intent: ${msg.intent} | Confidence: ${((msg.confidence || 0) * 100).toFixed(0)}%</div>` : ''}
        </div>
      `
    }).join('')

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>PRAHARI Investigation Report</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; }
          h1 { color: #1e40af; border-bottom: 2px solid #1e40af; padding-bottom: 10px; }
          .meta { color: #666; font-size: 12px; margin-bottom: 20px; }
          .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 11px; color: #888; text-align: center; }
        </style>
      </head>
      <body>
        <h1>🛡️ PRAHARI - Investigation Report</h1>
        <div class="meta">
          <p><b>Session ID:</b> ${sessionId || 'N/A'}</p>
          <p><b>Generated:</b> ${new Date().toLocaleString('en-IN')}</p>
          <p><b>Messages:</b> ${messages.length}</p>
          <p><b>Classification:</b> CONFIDENTIAL - For authorized personnel only</p>
        </div>
        <h2>Conversation Transcript</h2>
        ${content}
        <div class="footer">
          <p>Generated by PRAHARI Crime Intelligence OS | Karnataka State Police</p>
          <p>This document contains sensitive information. Handle according to data protection guidelines.</p>
        </div>
      </body>
      </html>
    `

    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const printWindow = window.open(url, '_blank')
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print()
      }
    } else {
      // Fallback: download as HTML
      const a = document.createElement('a')
      a.href = url
      a.download = `PRAHARI_Report_${new Date().toISOString().slice(0, 10)}.html`
      a.click()
    }
    URL.revokeObjectURL(url)
    toast.success('Investigation report exported!')
  }, [messages, sessionId])

  // ========== TEXT TO SPEECH (Read AI response aloud) ==========
  const speakText = useCallback((text: string) => {
    const utterance = new SpeechSynthesisUtterance(text.replace(/\*\*/g, '').replace(/[#\-*]/g, ''))
    utterance.lang = language === 'kn' ? 'kn-IN' : 'en-IN'
    utterance.rate = 0.9
    window.speechSynthesis.speak(utterance)
    toast.success(language === 'kn' ? 'ಧ್ವನಿ ಪ್ಲೇಬ್ಯಾಕ್...' : 'Playing audio...')
  }, [language])

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim()
    if (!messageText || loading) return

    const userMessage: ChatMessage = { role: 'user', content: messageText }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await aiAPI.chat(messageText, sessionId, language)
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

  const t = (key: string) => language === 'kn' ? (KANNADA_STRINGS[key] || key) : key

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-dark-700/50">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary-400" />
            {t('AI Crime Intelligence Chat')}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
            {aiStatus?.llm_active ? (
              <span className="inline-flex items-center gap-1 text-green-400">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                {aiStatus.llm_engine} • Ask in any language (English/Hindi/Kannada)
              </span>
            ) : (
              <span>Rule-based NLU + RAG • Add GEMINI_API_KEY for full conversational AI</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Language Toggle */}
          <button
            onClick={() => setLanguage(l => l === 'en' ? 'kn' : 'en')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              language === 'kn'
                ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                : 'bg-dark-700 text-gray-400 border border-dark-600'
            }`}
            title="Toggle English/Kannada"
          >
            <Globe className="w-3.5 h-3.5" />
            {language === 'kn' ? 'ಕನ್ನಡ' : 'EN'}
          </button>
          {/* PDF Export */}
          <button
            onClick={exportPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-dark-700 text-gray-400 border border-dark-600 hover:border-green-500/30 hover:text-green-400 transition-all"
            title="Export conversation as PDF"
          >
            <Download className="w-3.5 h-3.5" />
            PDF
          </button>
          {sessionId && (
            <span className="text-xs text-gray-600 font-mono">ID: {sessionId.slice(0, 8)}</span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {messages.map((msg, idx) => (
          <MessageBubble
            key={idx}
            message={msg}
            onSuggestionClick={sendMessage}
            onSpeak={speakText}
            language={language}
          />
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
          className="flex items-center gap-2"
        >
          {/* Voice Button */}
          <button
            type="button"
            onClick={isListening ? stopVoiceInput : startVoiceInput}
            className={`p-3 rounded-lg transition-all ${
              isListening
                ? 'bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse'
                : 'bg-dark-700 text-gray-400 border border-dark-600 hover:border-primary-500/30 hover:text-primary-400'
            }`}
            title={isListening ? 'Stop listening' : 'Start voice input'}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isListening ? (language === 'kn' ? 'ಆಲಿಸುತ್ತಿದೆ...' : 'Listening...') : t('Ask about crimes, accused, hotspots, networks...')}
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
        {isListening && (
          <p className="text-xs text-red-400 mt-1 animate-pulse text-center">
            🎤 {language === 'kn' ? 'ಧ್ವನಿ ಗುರುತಿಸುವಿಕೆ ಸಕ್ರಿಯ - ಮಾತನಾಡಿ...' : 'Voice recognition active - speak now...'}
          </p>
        )}
      </div>
    </div>
  )
}

function MessageBubble({ message, onSuggestionClick, onSpeak, language }: {
  message: ChatMessage
  onSuggestionClick: (text: string) => void
  onSpeak: (text: string) => void
  language: 'en' | 'kn'
}) {
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

        {/* Action buttons for AI messages */}
        {!isUser && (
          <div className="flex items-center gap-2">
            {/* Speak button */}
            <button
              onClick={() => onSpeak(message.content)}
              className="text-[10px] flex items-center gap-1 px-2 py-0.5 rounded bg-dark-800 text-gray-500 hover:text-primary-400 transition-colors"
              title="Read aloud"
            >
              <Volume2 className="w-3 h-3" /> {language === 'kn' ? 'ಓದು' : 'Listen'}
            </button>
          </div>
        )}

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

        {/* Confidence + NL2SQL */}
        {message.intent && (
          <div className="flex items-center gap-2 text-[10px] text-gray-600">
            <span>Intent: {message.intent}</span>
            <span>|</span>
            <span>Confidence: {((message.confidence || 0) * 100).toFixed(0)}%</span>
          </div>
        )}

        {/* NL2SQL Generated Query (Explainability) */}
        {message.data?.nl2sql && (
          <details className="mt-1">
            <summary className="text-[10px] text-primary-400 cursor-pointer hover:text-primary-300 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
              View Generated SQL (NL2SQL Engine)
            </summary>
            <div className="mt-1.5 p-2.5 rounded-lg bg-dark-900/80 border border-dark-700/50 font-mono text-[10px] leading-relaxed">
              <p className="text-gray-500 mb-1">-- {message.data.nl2sql.explanation}</p>
              <p className="text-green-400 whitespace-pre-wrap break-all">{message.data.nl2sql.generated_sql}</p>
              {Object.keys(message.data.nl2sql.parameters || {}).length > 0 && (
                <p className="text-yellow-400/70 mt-1">-- Params: {JSON.stringify(message.data.nl2sql.parameters)}</p>
              )}
              <p className="text-gray-600 mt-1.5 text-[9px]">Tables: {message.data.nl2sql.tables_accessed?.join(', ')} | Template: {message.data.nl2sql.template_used} | {message.data.nl2sql.security_note}</p>
            </div>
          </details>
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
