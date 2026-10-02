"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { GoogleLogin } from "@react-oauth/google"
import { Button } from "@/components/ui/button"
import { loginWithGoogle, devLogin } from "@/lib/api"
import { Wallet, ShieldCheck } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // If already logged in, redirect straight to dashboard
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

  const handleDevLogin = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await devLogin()
      if (res?.access_token) {
        localStorage.setItem("access_token", res.access_token)
        if (res.user) {
          localStorage.setItem("user_profile", JSON.stringify(res.user))
        }
        router.push("/dashboard")
      }
    } catch (err: any) {
      console.error("Dev login error:", err)
      setError(err?.response?.data?.detail || "Dev login failed.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/20">
            <Wallet className="h-9 w-9" />
          </div>

          <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-slate-900">
            Finance Copilot
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Your AI-Powered Personal Finance & Budgeting Assistant
          </p>
        </div>

        {error && (
          <div className="mt-6 rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-200">
            {error}
          </div>
        )}

        <div className="mt-8 flex flex-col items-center justify-center space-y-4">
          {loading ? (
            <div className="py-4 text-sm font-medium text-slate-600 animate-pulse">
              Signing you in...
            </div>
          ) : (
            <>
              {/* Google OAuth Login Button */}
              <div className="flex w-full justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError("Google Sign-In was cancelled or failed.")}
                  useOneTap={false}
                  theme="outline"
                  size="large"
                  shape="pill"
                  width="320"
                />
              </div>

              <div className="relative my-2 w-full text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <span className="relative bg-white px-3 text-xs uppercase tracking-wider text-slate-400">
                  Or test with
                </span>
              </div>

              {/* Dev Test Account Login */}
              <Button
                variant="outline"
                className="w-full rounded-full py-5 text-sm font-semibold border-slate-300 hover:bg-slate-50"
                onClick={handleDevLogin}
              >
                Continue with Test Account (Dev Mode)
              </Button>
            </>
          )}
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>Your data is private & cloud-encrypted</span>
        </div>
      </div>
    </div>
  )
}
