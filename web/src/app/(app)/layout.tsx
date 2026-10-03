"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import {
  Home,
  List,
  PieChart,
  MessageSquare,
  CreditCard,
  Download,
  LogOut,
  Wallet,
} from "lucide-react"
import { getMe } from "@/lib/api"
import { ExportModal } from '@/components/ExportModal'
import { ModeToggle } from '@/components/theme-toggle'
import { motion, AnimatePresence } from "framer-motion"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [user, setUser] = useState<{
    id?: string
    name?: string
    email?: string
    picture?: string
  } | null>(null)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (!token) {
      router.push("/")
      return
    }

    const savedUser = localStorage.getItem("user_profile")
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch (_) {}
    }

    // Verify token with backend
    getMe()
      .then((res) => {
        if (res?.user) {
          setUser(res.user)
          localStorage.setItem("user_profile", JSON.stringify(res.user))
        }
      })
      .catch((err) => {
        if (err?.response?.status === 401) {
          localStorage.removeItem("access_token")
          localStorage.removeItem("user_profile")
          router.push("/")
        }
      })
      .finally(() => {
        setAuthChecked(true)
      })
  }, [router])

  const handleSignOut = () => {
    localStorage.removeItem("access_token")
    localStorage.removeItem("user_profile")
    router.push("/")
  }

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent shadow-lg" />
          <div className="text-sm font-semibold text-slate-500 animate-pulse tracking-wide">
            Loading your financial copilot...
          </div>
        </div>
      </div>
    )
  }

  const items = [
    { title: "Dashboard", url: "/dashboard", icon: Home },
    { title: "Transactions", url: "/transactions", icon: List },
    { title: "Subscriptions", url: "/subscriptions", icon: CreditCard },
    { title: "Budgets & Goals", url: "/budgets", icon: PieChart },
    { title: "AI Assistant", url: "/chat", icon: MessageSquare },
  ]

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 18) return "Good afternoon"
    return "Good evening"
  }
  const firstName = user?.name ? user.name.split(" ")[0] : "there"

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-gradient-to-br from-slate-50 to-slate-100/80 font-sans selection:bg-blue-100 selection:text-blue-900">
        <Sidebar className="border-r border-slate-200/60 bg-white/60 backdrop-blur-xl shadow-[4px_0_24px_rgba(0,0,0,0.01)]">
          <SidebarHeader className="p-5 border-b border-slate-100/60">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900 leading-tight tracking-tight">
                  Finance Copilot
                </h2>
                <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">AI Assistant</p>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent className="p-3 mt-2">
            <SidebarGroup>
              <SidebarGroupLabel className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-3">
                Main Menu
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1.5">
                  {items.map((item) => {
                    const isActive = pathname === item.url
                    return (
                      <SidebarMenuItem key={item.title}>
                        <Link href={item.url} className="w-full block relative group">
                          {isActive && (
                            <motion.div 
                              layoutId="activeTab" 
                              className="absolute inset-0 bg-blue-50 border border-blue-100/50 rounded-xl"
                              initial={false}
                              transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            />
                          )}
                          <SidebarMenuButton
                            isActive={isActive}
                            className={`w-full justify-start gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all relative z-10 ${
                              isActive
                                ? "text-blue-700 font-bold"
                                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/50"
                            }`}
                          >
                            <item.icon
                              className={`h-4 w-4 transition-colors ${
                                isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
                              }`}
                            />
                            <span>{item.title}</span>
                          </SidebarMenuButton>
                        </Link>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="p-4 border-t border-slate-100/60 bg-white/40 backdrop-blur-md">
            <div className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-100/50 transition-colors border border-transparent hover:border-slate-200/50">
              <div className="flex items-center gap-3 overflow-hidden">
                {user?.picture ? (
                  <img
                    src={user.picture}
                    alt={user.name || "User"}
                    className="h-10 w-10 rounded-full object-cover border-2 border-white shadow-sm"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-sm shadow-sm border-2 border-white">
                    {(user?.name || user?.email || "U")[0].toUpperCase()}
                  </div>
                )}
                <div className="overflow-hidden">
                  <p className="text-sm font-bold text-slate-900 truncate">
                    {user?.name || "User"}
                  </p>
                  <p className="text-xs text-slate-500 truncate font-medium">
                    {user?.email || ""}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
                title="Sign Out"
                className="text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full h-8 w-8 shrink-0"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <div className="flex flex-1 flex-col overflow-hidden relative">
          
          {/* Top Bar with Glassmorphism */}
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/60 bg-white/70 px-4 md:px-8 backdrop-blur-xl">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="text-slate-500 hover:text-slate-900" />
              <div className="hidden sm:flex flex-col">
                <span className="text-sm font-bold text-slate-800">
                  {getGreeting()}, {firstName}! 👋
                </span>
              </div>
            </div>

            {/* Export Actions */}
            <div className="flex items-center gap-3">
              <ModeToggle />
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-xs font-bold rounded-full shadow-sm bg-white hover:bg-slate-50 border-slate-200 transition-all hover:shadow"
                onClick={() => setExportModalOpen(true)}
              >
                <Download className="h-3.5 w-3.5 text-blue-600" />
                <span className="hidden sm:inline">Export Report</span>
              </Button>
            </div>
          </header>

          {/* Main content with AnimatePresence for page transitions */}
          <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8 relative z-0">
            <div className="mx-auto max-w-7xl">
              <AnimatePresence mode="wait">
                <motion.div
                  key={pathname}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </div>
      </div>
      
      <ExportModal open={exportModalOpen} onOpenChange={setExportModalOpen} />
    </SidebarProvider>
  )
}
