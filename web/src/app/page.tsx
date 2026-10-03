"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { GoogleLogin } from "@react-oauth/google"
import { loginWithGoogle } from "@/lib/api"
import { Wallet, ShieldCheck, BrainCircuit, LineChart, Target, ArrowRight, Sparkles } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (token) {
      router.push("/dashboard")
    }
  }, [router])

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (!credentialResponse?.credential) {
      setError("Failed to retrieve Google credential token.")
      return
    }

    try {
      setLoading(true)
      setError(null)
      const res = await loginWithGoogle(credentialResponse.credential)
      if (res?.access_token) {
        localStorage.setItem("access_token", res.access_token)
        if (res.user) {
          localStorage.setItem("user_profile", JSON.stringify(res.user))
        }
        router.push("/dashboard")
      } else {
        setError("Invalid response from server.")
      }
    } catch (err: any) {
      console.error("Google login error:", err)
      setError(
        err?.response?.data?.detail ||
          "Failed to authenticate with Google. Make sure backend is running."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans selection:bg-blue-100 selection:text-blue-900">
      
      {/* Left Column - Content & Login */}
      <div className="flex-1 flex flex-col justify-center px-8 md:px-16 lg:px-24 py-12 z-10 bg-white shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        
        {/* Logo */}
        <div className="flex items-center gap-3 mb-16">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
            <Wallet className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">Finance Copilot</span>
        </div>

        {/* Hero Copy */}
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI-Powered Financial Intelligence</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15] mb-6">
            Master your money with <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">AI precision</span>.
          </h1>
          
          <p className="text-lg text-slate-600 leading-relaxed mb-10 max-w-md">
            The intelligent budgeting assistant that securely tracks expenses, categorizes receipts, and proactively helps you reach your financial goals.
          </p>

          {/* Login Box */}
          <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-6 md:p-8 max-w-md backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Get Started</h3>
            <p className="text-sm text-slate-500 mb-6">Sign in securely with your Google account to access your personalized dashboard.</p>
            
            {error && (
              <div className="mb-6 rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-200 flex items-start gap-2">
                <span className="shrink-0 mt-0.5">⚠</span>
                <span>{error}</span>
              </div>
            )}

            <div className="flex flex-col items-center">
              {loading ? (
                <div className="flex items-center gap-3 py-3 px-4 bg-white border border-slate-200 rounded-full w-full justify-center shadow-sm">
                  <div className="h-4 w-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                  <span className="text-sm font-medium text-slate-600">Authenticating...</span>
                </div>
              ) : (
                <div className="w-full flex justify-center hover:scale-[1.02] transition-transform duration-200">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setError("Google Sign-In was cancelled or failed.")}
                    useOneTap={false}
                    theme="filled_black"
                    size="large"
                    shape="pill"
                    width="100%"
                  />
                </div>
              )}
            </div>
            
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>Bank-grade end-to-end encryption</span>
            </div>
          </div>
        </div>
        
      </div>

      {/* Right Column - Visuals */}
      <div className="hidden md:flex flex-1 relative bg-slate-900 overflow-hidden items-center justify-center">
        {/* Background Gradients */}
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-600/30 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-600/30 blur-[120px]" />
        <div className="absolute top-[40%] left-[30%] w-[40%] h-[40%] rounded-full bg-purple-600/20 blur-[100px]" />

        {/* Floating Feature Cards */}
        <div className="relative z-10 w-full max-w-lg space-y-6 p-8">
          
          <div className="transform transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-6 text-white shadow-xl flex items-start gap-5">
            <div className="bg-blue-500/20 p-3 rounded-xl border border-blue-400/30 shrink-0">
              <BrainCircuit className="h-6 w-6 text-blue-300" />
            </div>
            <div>
              <h4 className="text-lg font-bold mb-1">Intelligent AI Chat</h4>
              <p className="text-sm text-slate-300 leading-relaxed">Ask questions about your spending habits, get personalized budgeting tips, and scan receipts directly using vision AI.</p>
            </div>
          </div>

          <div className="transform transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-6 text-white shadow-xl flex items-start gap-5 ml-8">
            <div className="bg-emerald-500/20 p-3 rounded-xl border border-emerald-400/30 shrink-0">
              <LineChart className="h-6 w-6 text-emerald-300" />
            </div>
            <div>
              <h4 className="text-lg font-bold mb-1">Visual Analytics & Reports</h4>
              <p className="text-sm text-slate-300 leading-relaxed">Instantly generate rich, interactive charts and instantly export your data to multi-sheet Excel files or beautifully styled PDFs.</p>
            </div>
          </div>

          <div className="transform transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-6 text-white shadow-xl flex items-start gap-5">
            <div className="bg-purple-500/20 p-3 rounded-xl border border-purple-400/30 shrink-0">
              <Target className="h-6 w-6 text-purple-300" />
            </div>
            <div>
              <h4 className="text-lg font-bold mb-1">Proactive Goal Tracking</h4>
              <p className="text-sm text-slate-300 leading-relaxed">Set monthly budgets, manage upcoming recurring subscriptions, and automatically track progress towards your financial goals.</p>
            </div>
          </div>

        </div>
        
        {/* Subtle grid overlay */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
      </div>

    </div>
  )
}
