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
  FileSpreadsheet,
  FileText,
} from "lucide-react"
import { downloadExportExcel, downloadExportPdf, getMe } from "@/lib/api"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
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
        <div className="text-sm font-medium text-slate-500 animate-pulse">
          Loading your financial copilot...
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

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-slate-50">
        <Sidebar className="border-r border-slate-200 bg-white">
          <SidebarHeader className="p-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 leading-tight">
                  Finance Copilot
                </h2>
                <p className="text-xs text-slate-500">AI Assistant</p>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent className="p-3">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">
                Navigation
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">
                  {items.map((item) => {
                    const isActive = pathname === item.url
                    return (
                      <SidebarMenuItem key={item.title}>
                        <Link href={item.url} className="w-full block">
                          <SidebarMenuButton
                            isActive={isActive}
                            className={`w-full justify-start gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                              isActive
                                ? "bg-blue-50 text-blue-700 font-semibold"
                                : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                            }`}
                          >
                            <item.icon
                              className={`h-4 w-4 ${
                                isActive ? "text-blue-600" : "text-slate-400"
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

          <SidebarFooter className="p-4 border-t border-slate-100 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 overflow-hidden">
                {user?.picture ? (
                  <img
                    src={user.picture}
                    alt={user.name || "User"}
                    className="h-9 w-9 rounded-full object-cover border border-slate-200"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                    {(user?.name || user?.email || "U")[0].toUpperCase()}
                  </div>
                )}
                <div className="overflow-hidden">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {user?.name || "User"}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {user?.email || ""}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleSignOut}
                title="Sign Out"
                className="text-slate-500 hover:text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Top Bar */}
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-4 md:px-6 backdrop-blur">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <span className="text-sm font-medium text-slate-500 hidden sm:inline-block">
                Workspace
              </span>
            </div>

            {/* Export Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-xs font-semibold"
                onClick={() => downloadExportExcel()}
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Export Excel</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-xs font-semibold"
                onClick={() => downloadExportPdf()}
              >
                <FileText className="h-3.5 w-3.5 text-red-600" />
                <span className="hidden sm:inline">Export PDF</span>
              </Button>
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
