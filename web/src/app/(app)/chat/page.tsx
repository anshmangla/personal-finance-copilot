"use client"

import { useState, useRef, useEffect } from "react"
import { chatWithAgent, getChatHistory, clearChatHistory, scanReceipt, addTransaction } from "@/lib/api"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Send, Bot, Trash2, RefreshCw, UploadCloud, FileText, Sparkles, User, Camera, Copy, Check } from "lucide-react"
import ReactMarkdown from "react-markdown"
import { motion, AnimatePresence } from "framer-motion"

const SUGGESTIONS = [
  "How much did I spend this month?",
  "What's my highest spending category?",
  "Show me upcoming bills",
  "How am I doing on my budget?",
]

export default function ChatPage() {
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string; id?: string }[]>([])
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  
  // Drag & Drop state
  const [isDragging, setIsDragging] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
          list.map((m: any, idx: number) => ({
            id: `msg-${idx}`,
            role: m.role === "user" ? "user" : "assistant",
            content: m.content || "",
          }))
        )
      } else {
        setMessages([
          {
            id: "welcome-msg",
            role: "assistant",
            content: "Hello! I am your AI Finance Copilot. Ask me about your transactions, spending habits, recurring bills, or budgets! **You can also drag and drop a receipt here** to automatically scan and add it to your expenses.",
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
  }, [messages, isScanning])

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend ?? query).trim()
    if (!text || loading || isScanning) return

    const newMsgId = `user-${Date.now()}`
    setMessages((prev) => [...prev, { id: newMsgId, role: "user", content: text }])
    if (!textToSend) setQuery("")
    setLoading(true)

    try {
      const res = await chatWithAgent(text)
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          role: "assistant",
          content: res?.response || "I could not generate a response.",
        },
      ])
    } catch (e) {
      console.error(e)
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "**Error**: Could not reach the AI agent. Please check your backend connection.",
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
          id: "welcome-msg",
          role: "assistant",
          content: "Started a fresh conversation. What would you like to explore regarding your finances?",
        },
      ])
    } catch (e) {
      console.error(e)
      alert("Failed to clear chat history.")
    }
  }

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // --- Drag & Drop Receipt Scanning ---
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }
  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessReceipt(e.dataTransfer.files[0])
    }
  }
  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleProcessReceipt(e.target.files[0])
    }
  }

  const handleProcessReceipt = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file.")
      return
    }
    
    // Add user message indicating upload
    setMessages((prev) => [...prev, { id: `upload-${Date.now()}`, role: "user", content: `*[Uploaded receipt image: ${file.name}]*` }])
    setIsScanning(true)
    
    try {
      const res = await scanReceipt(file)
      if (res?.data) {
        const d = res.data
        const amount = parseFloat(d.total_amount?.toString() || d.amount?.toString() || "0")
        const merchant = d.merchant_name || d.merchant || "Unknown Merchant"
        const category = d.inferred_category || d.category || "Shopping"
        const date = d.date || new Date().toISOString().split("T")[0]

        // Add the transaction silently
        await addTransaction({ amount, merchant, category, type: "debit", date })

        // Bot response
        setMessages((prev) => [
          ...prev,
          {
            id: `scan-res-${Date.now()}`,
            role: "assistant",
            content: `**Receipt Scanned Successfully!** 📸\n\nI've automatically added the following expense to your transactions:\n* **Merchant:** ${merchant}\n* **Amount:** ₹${amount.toFixed(2)}\n* **Category:** ${category}\n* **Date:** ${date}`,
          },
        ])
      }
    } catch (error) {
      console.error(error)
      setMessages((prev) => [
        ...prev,
        { id: `scan-err-${Date.now()}`, role: "assistant", content: "Sorry, I couldn't extract data from that receipt. Make sure the text is clearly visible." },
      ])
    } finally {
      setIsScanning(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  return (
    <div 
      className="flex flex-col h-[calc(100vh-6rem)] max-w-4xl mx-auto w-full relative"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Drag Overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 rounded-3xl bg-blue-600/90 backdrop-blur-sm flex flex-col items-center justify-center text-white border-4 border-dashed border-white/50 shadow-2xl"
          >
            <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
              <UploadCloud className="h-20 w-20 mb-4 opacity-90" />
            </motion.div>
            <h2 className="text-3xl font-extrabold tracking-tight mb-2">Drop Receipt to Scan</h2>
            <p className="text-blue-100 font-medium">AI will automatically extract the details and log the expense.</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-between items-end mb-6 px-2">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            AI Copilot <Sparkles className="h-6 w-6 text-blue-600" />
          </h1>
          <p className="text-sm text-slate-500 mt-1">Your intelligent financial advisor</p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setClearConfirmOpen(true)}
          className="text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-full font-semibold shadow-sm"
        >
          <Trash2 className="h-4 w-4 mr-1.5" />
          New Chat
        </Button>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-3xl border border-slate-200 shadow-sm relative">
        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar scroll-smooth">
          {loadingHistory ? (
            <div className="flex h-full items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                <span className="text-sm text-slate-500 font-medium animate-pulse">Loading history...</span>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <AnimatePresence initial={false}>
                {messages.map((msg) => {
                  const isUser = msg.role === "user"
                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={msg.id}
                      className={`flex items-start gap-4 ${isUser ? "justify-end" : "justify-start"}`}
                    >
                      {!isUser && (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/20 mt-1">
                          <Bot className="h-5 w-5" />
                        </div>
                      )}

                      <div className={`relative max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-sm leading-relaxed shadow-sm group ${isUser ? "bg-slate-900 text-white rounded-tr-sm" : "bg-white text-slate-800 border border-slate-100 rounded-tl-sm"}`}>
                        {isUser ? (
                          <div className="whitespace-pre-wrap">{msg.content}</div>
                        ) : (
                          <>
                            <div className="prose prose-sm prose-slate max-w-none prose-p:leading-relaxed prose-headings:font-bold prose-a:text-blue-600 prose-table:w-full prose-table:border-collapse prose-th:bg-slate-100 prose-th:p-2 prose-th:border prose-th:border-slate-200 prose-th:text-left prose-td:p-2 prose-td:border prose-td:border-slate-200 prose-strong:text-slate-900 prose-ul:my-2 prose-li:my-0 pb-1">
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                            <button 
                              onClick={() => handleCopy(msg.content, msg.id || '')}
                              className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-slate-700 bg-white/80 backdrop-blur rounded-md opacity-0 group-hover:opacity-100 transition-opacity border border-slate-200 shadow-xs"
                              title="Copy to clipboard"
                            >
                              {copiedId === msg.id ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                          </>
                        )}
                      </div>
                      
                      {isUser && (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 mt-1">
                          <User className="h-5 w-5" />
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </AnimatePresence>

              {/* Typing Indicators */}
              {(loading || isScanning) && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-4 justify-start">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/20 mt-1">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-sm p-4 shadow-sm flex items-center gap-2">
                    {isScanning ? (
                      <>
                        <Camera className="h-4 w-4 text-blue-600 animate-pulse" />
                        <span className="text-sm font-medium text-slate-500 animate-pulse">Scanning receipt...</span>
                      </>
                    ) : (
                      <>
                        <div className="flex gap-1">
                          <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-sm font-medium text-slate-500 ml-2">Thinking...</span>
                      </>
                    )}
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} className="h-2" />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-slate-100">
          {!loadingHistory && messages.length <= 1 && (
            <div className="flex flex-wrap gap-2 mb-4 justify-center">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(s)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors border border-blue-100"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200 focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all">
            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={onFileSelect} />
            <Button
              variant="ghost"
              size="icon"
              disabled={loading || isScanning}
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0 h-10 w-10 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-white"
              title="Upload Receipt"
            >
              <Camera className="h-5 w-5" />
            </Button>
            
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder="Ask anything or drop a receipt here..."
              disabled={loading || isScanning}
              className="flex-1 max-h-32 min-h-[40px] resize-none bg-transparent border-none focus:ring-0 text-sm py-2.5 outline-none custom-scrollbar"
              rows={1}
            />

            <Button
              disabled={!query.trim() || loading || isScanning}
              onClick={() => handleSend()}
              className="shrink-0 h-10 w-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md disabled:opacity-50 disabled:shadow-none transition-all"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-center text-[10px] text-slate-400 mt-2 font-medium">
            AI can make mistakes. Verify important financial insights.
          </p>
        </div>
      </div>

      <Dialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Clear Chat?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">Are you sure you want to delete all messages in this conversation?</p>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" className="rounded-xl" onClick={() => setClearConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" className="bg-red-600 hover:bg-red-700 text-white rounded-xl" onClick={handleClearHistory}>Clear</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
