import { useState, useRef, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Send, Bot, User, FileText, Loader2, Mic, MicOff,
  Globe, ChevronDown, ChevronUp, Download, Lightbulb,
  Shield, Database, Brain
} from "lucide-react"

interface ExplainabilityData {
  intent_classified: string
  intent_confidence: number
  language_detected: string
  data_sources_queried: string[]
  filters_applied: string[]
  confidence_level: string
  grounded_in_firs: string[]
  reasoning: string
}

interface Message {
  role: "user" | "assistant"
  content: string
  sources?: any[]
  explainability?: ExplainabilityData
  suggestions?: string[]
  language?: string
  intent?: string
  timestamp?: string
}


const AIAssistant = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Namaste! I am PRAHARI - your AI Investigation Assistant for Karnataka State Police. I can help you search FIRs, analyze criminal networks, check hotspots, assess risk scores, and more. Ask me anything in English or ಕನ್ನಡ.",
      suggestions: [
        "Show chain snatching cases in Koramangala",
        "Who are the repeat offenders?",
        "Show active crime alerts",
        "ಕೊರಮಂಗಲದಲ್ಲಿ ಅಪರಾಧ ಮಾಹಿತಿ ತೋರಿಸಿ"
      ]
    }
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState("")
  const [language, setLanguage] = useState<"en" | "kn">("en")
  const [isListening, setIsListening] = useState(false)
  const [expandedExplain, setExpandedExplain] = useState<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const { token } = useAuth()

  useEffect(() => {
    setSessionId(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async (messageText?: string) => {
    const text = messageText || input.trim()
    if (!text || isLoading) return

    setInput("")
    const userMessage: Message = { role: "user", content: text, timestamp: new Date().toISOString() }
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: text,
          session_id: sessionId,
          language,
        }),
      })

      if (!response.ok) throw new Error("Failed")
      const data = await response.json()

      const assistantMessage: Message = {
        role: "assistant",
        content: data.response,
        sources: data.sources,
        explainability: data.explainability,
        suggestions: data.suggestions,
        language: data.language,
        intent: data.intent,
        timestamp: new Date().toISOString(),
      }
      setMessages(prev => [...prev, assistantMessage])
      if (data.session_id) setSessionId(data.session_id)
    } catch (error) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "I apologize, but I encountered an error. Please ensure the backend is running and try again.",
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const toggleVoice = () => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert("Speech recognition not supported in this browser.")
      return
    }
    if (isListening) {
      setIsListening(false)
      return
    }
    setIsListening(true)
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.lang = language === "kn" ? "kn-IN" : "en-IN"
    recognition.interimResults = false
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setInput(transcript)
      setIsListening(false)
    }
    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)
    recognition.start()
  }

  const exportPDF = () => {
    // Simple text export as downloadable file
    const content = messages.map(m =>
      `[${m.role.toUpperCase()}] ${m.content}\n${m.sources ? `Sources: ${m.sources.map(s => s.fir_number || s.source).join(", ")}` : ""}`
    ).join("\n\n---\n\n")

    const blob = new Blob([
      `PRAHARI - AI Investigation Chat Export\nDate: ${new Date().toLocaleString()}\nSession: ${sessionId}\n\n${"=".repeat(50)}\n\n${content}`
    ], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `prahari_investigation_${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }


  return (
    <div className="flex flex-col h-[calc(100vh-10rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Bot className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">PRAHARI AI Assistant</h1>
            <p className="text-xs text-muted-foreground">Powered by Gemini 1.5 Flash + RAG</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Language Toggle */}
          <Button
            variant={language === "kn" ? "default" : "outline"}
            size="sm"
            onClick={() => setLanguage(language === "en" ? "kn" : "en")}
            className="text-xs"
          >
            <Globe className="w-3.5 h-3.5 mr-1" />
            {language === "en" ? "English" : "ಕನ್ನಡ"}
          </Button>
          {/* Export */}
          <Button variant="outline" size="sm" onClick={exportPDF}>
            <Download className="w-3.5 h-3.5 mr-1" /> Export
          </Button>
        </div>
      </div>

      {/* Chat Area */}
      <Card className="flex-1 overflow-hidden flex flex-col">
        <CardContent className="p-0 flex-1 flex flex-col">
          <ScrollArea ref={scrollRef} className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div key={i}>
                  <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`flex gap-2.5 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                        msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-slate-100 dark:bg-slate-800"
                      }`}>
                        {msg.role === "user" ? <User size={14} /> : <Bot size={14} />}
                      </div>
                      <div className="space-y-2">
                        <div className={`p-3 rounded-2xl text-sm leading-relaxed ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground rounded-tr-sm"
                            : "bg-slate-100 dark:bg-slate-800 rounded-tl-sm"
                        }`}>
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>

                        {/* Sources */}
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {msg.sources.map((src, j) => (
                              <div key={j} className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-[10px]">
                                <FileText size={10} className="text-blue-600" />
                                <span className="text-blue-700 dark:text-blue-300">
                                  {src.fir_number || src.source || src.name || "Database"}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Intent Badge */}
                        {msg.intent && (
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                              <Brain className="w-2.5 h-2.5 mr-1" />
                              {msg.intent.replace(/_/g, " ")}
                            </Badge>
                            {msg.language && msg.language !== "en" && (
                              <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                                ಕನ್ನಡ
                              </Badge>
                            )}
                          </div>
                        )}


                        {/* Explainability Panel */}
                        {msg.explainability && (
                          <div className="mt-1">
                            <button
                              onClick={() => setExpandedExplain(expandedExplain === i ? null : i)}
                              className="flex items-center gap-1.5 text-[10px] text-primary hover:underline"
                            >
                              <Shield className="w-3 h-3" />
                              Explain This
                              {expandedExplain === i ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                            {expandedExplain === i && (
                              <div className="mt-2 p-3 rounded-lg border bg-slate-50 dark:bg-slate-900 text-xs space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <span className="text-muted-foreground">Intent:</span>{" "}
                                    <span className="font-medium">{msg.explainability.intent_classified}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Confidence:</span>{" "}
                                    <span className={`font-bold ${
                                      msg.explainability.confidence_level === "HIGH" ? "text-green-600" :
                                      msg.explainability.confidence_level === "MEDIUM" ? "text-yellow-600" : "text-red-600"
                                    }`}>
                                      {msg.explainability.confidence_level}
                                    </span>
                                  </div>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Data Sources:</span>{" "}
                                  {msg.explainability.data_sources_queried?.join(", ") || "None"}
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Filters:</span>{" "}
                                  {msg.explainability.filters_applied?.join(", ") || "None"}
                                </div>
                                {msg.explainability.grounded_in_firs?.length > 0 && (
                                  <div>
                                    <span className="text-muted-foreground">Grounded in FIRs:</span>{" "}
                                    {msg.explainability.grounded_in_firs.join(", ")}
                                  </div>
                                )}
                                <div className="pt-1 border-t">
                                  <span className="text-muted-foreground">Reasoning:</span>{" "}
                                  <span className="italic">{msg.explainability.reasoning}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Suggestions */}
                        {msg.suggestions && msg.suggestions.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {msg.suggestions.map((suggestion, k) => (
                              <button
                                key={k}
                                onClick={() => handleSend(suggestion)}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] hover:bg-primary/5 hover:border-primary/30 transition-colors"
                              >
                                <Lightbulb className="w-2.5 h-2.5 text-yellow-500" />
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex gap-2.5 items-center">
                    <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <Bot size={14} />
                    </div>
                    <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 rounded-tl-sm">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-xs text-muted-foreground">Analyzing...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>


          {/* Input Area */}
          <div className="p-3 border-t bg-slate-50/50 dark:bg-slate-950/50">
            <form onSubmit={(e) => { e.preventDefault(); handleSend() }} className="flex gap-2">
              {/* Voice Button */}
              <Button
                type="button"
                variant={isListening ? "destructive" : "outline"}
                size="icon"
                onClick={toggleVoice}
                className="shrink-0"
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>

              <Input
                placeholder={language === "kn" ? "ನಿಮ್ಮ ಪ್ರಶ್ನೆಯನ್ನು ಟೈಪ್ ಮಾಡಿ..." : "Ask about cases, suspects, patterns, or hotspots..."}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1"
                disabled={isLoading}
              />

              <Button type="submit" disabled={isLoading || !input.trim()} className="shrink-0">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </form>

            {isListening && (
              <div className="mt-2 flex items-center gap-2 text-xs text-red-600">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                Listening... Speak now ({language === "kn" ? "Kannada" : "English"})
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default AIAssistant
