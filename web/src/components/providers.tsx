"use client"

import React from "react"
import { GoogleOAuthProvider } from "@react-oauth/google"
import { TooltipProvider } from '@/components/ui/tooltip'
import { ThemeProvider } from '@/components/theme-provider'
import { GOOGLE_CLIENT_ID } from "@/lib/api"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <ThemeProvider attribute='class' defaultTheme='system' enableSystem disableTransitionOnChange>
      <TooltipProvider>
        {children}
      </TooltipProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  )
}
