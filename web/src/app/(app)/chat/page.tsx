"use client"

import { useState, useRef, useEffect } from "react"
import { chatWithAgent, getChatHistory, clearChatHistory } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Send, Bot, User, Trash2, Sparkles, RefreshCw } from "lucide-react"
import ReactMarkdown from "react-markdown"

const SUGGESTIONS = [
  "How much did I spend this month?",
  "What's my highest spending category?",
  "Show me upcoming bills",
  "How am I doing on my budget?",
]

export default function ChatPage() {
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([])
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const loadHistory = async () => {
    try {
      setLoadingHistory(true)
      const res = await getChatHistory()
      const list = res?.data || []
      if (list.length > 0) {
        setMessages(
          list.map((m: any) => ({
            role: m.role === "user" ? "user" : "assistant",
            content: m.content || "",
          }))
        )
      } else {
        setMessages([
          {
            role: "assistant",
            content:
              "Hello! I am your AI Finance Copilot. Ask me about your transactions, spending habits, recurring bills, or budgets!",
          },
        ])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingHistory(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend ?? query).trim()
    if (!text || loading) return

    setMessages((prev) => [...prev, { role: "user", content: text }])
    if (!textToSend) setQuery("")
    setLoading(true)

    try {
      const res = await chatWithAgent(text)
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res?.response || "I could not generate a response.",
        },
      ])
    } catch (e) {
      console.error(e)
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "**Error**: Could not reach the AI agent. Please check your backend connection.",
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleClearHistory = async () => {
    try {
      await clearChatHistory()
      setClearConfirmOpen(false)
      setMessages([
        {
          role: "assistant",
          content:
            "Started a fresh conversation. What would you like to explore regarding your finances?",
        },
      ])
    } catch (e) {
      console.error(e)
      alert("Failed to clear chat history.")
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6.5rem)]">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            AI Assistant
          </h1>
          <p className="text-sm text-slate-500">
            Powered by LangGraph Agent & Gemini
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setClearConfirmOpen(true)}
          className="text-slate-600 hover:text-red-600 gap-1.5"
        >
          <Trash2 className="h-4 w-4" />
          <span>New Chat</span>
        </Button>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden shadow-sm border-slate-200">
        <CardHeader className="py-3 px-6 border-b border-slate-100 flex flex-row items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-slate-900">
                Finance Copilot Agent
              </CardTitle>
              <span className="text-[11px] text-emerald-600 font-medium">
                Active Session
              </span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={loadHistory}
            title="Reload History"
            className="text-slate-400 hover:text-slate-700"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {loadingHistory ? (
            <div className="py-12 text-center text-sm text-slate-400 animate-pulse">
              Loading chat history...
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isUser = msg.role === "user"
              return (
                <div
                  key={idx}
                  className={`flex items-start gap-3 ${
                    isUser ? "justify-end" : "justify-start"
                  }`}
                >
                  {!isUser && (
                    <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-sm leading-relaxed shadow-sm ${
                      isUser
                        ? "bg-blue-600 text-white"
                        : "bg-white text-slate-800 border border-slate-200"
                    }`}
                  >
                    {isUser ? (
                      msg.content
                    ) : (
                      <div className="prose prose-sm max-w-none text-slate-800 dark:text-slate-100">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    )}
                  </div>

                  {isUser && (
                    <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-slate-200 text-slate-700 shadow-sm">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              )
            })
          )}

          {loading && (
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                <Bot className="h-4 w-4" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-500 shadow-sm flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-600 animate-ping" />
                Thinking & analyzing your finances...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </CardContent>

        {/* Suggestion Chips */}
        <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/60 overflow-x-auto flex gap-2">
          {SUGGESTIONS.map((s, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(s)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all shadow-xs"
            >
              <Sparkles className="h-3 w-3 text-blue-500" />
              {s}
            </button>
          ))}
        </div>

        {/* Query Input */}
        <div className="p-4 border-t border-slate-200 bg-white">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
            className="flex gap-2"
          >
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask about spending spikes, category trends, or savings tips..."
              className="flex-1"
              disabled={loading}
            />
            <Button
              type="submit"
              disabled={loading || !query.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5"
            >
              <Send className="w-4 h-4 mr-1.5" />
              Send
            </Button>
          </form>
        </div>
      </Card>

      {/* CLEAR CHAT CONFIRMATION DIALOG */}
      <Dialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Start New Conversation?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            This will clear the active conversation history and reset the assistant
            memory.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setClearConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleClearHistory}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Clear & Reset
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
