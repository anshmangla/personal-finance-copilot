"use client"

import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { FileSpreadsheet, FileText, Download } from "lucide-react"
import { getMonths, downloadExportExcel, downloadExportPdf } from "@/lib/api"

export function ExportModal({ 
  open, 
  onOpenChange 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  const [months, setMonths] = useState<string[]>([])
  const [selectedMonth, setSelectedMonth] = useState<string>("all")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      getMonths().then((res) => {
        setMonths(res.data || [])
      }).catch(console.error)
    }
  }, [open])

  const handleExport = async (type: "excel" | "pdf") => {
    try {
      setLoading(true)
      const targetMonth = selectedMonth === "all" ? undefined : selectedMonth;
      if (type === "excel") {
        await downloadExportExcel(targetMonth)
      } else {
        await downloadExportPdf(targetMonth)
      }
      onOpenChange(false)
    } catch (error) {
      console.error(error)
      alert("Failed to export report.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Export Report</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-700">Select Time Period</label>
            <select
              className="w-full rounded-md border border-slate-300 p-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              <option value="all">All Time History</option>
              {months.map((m) => {
                // formatting YYYY-MM to Month YYYY
                const d = new Date(m + "-01T00:00:00")
                const monthName = d.toLocaleString('default', { month: 'long', year: 'numeric' })
                return <option key={m} value={m}>{monthName}</option>
              })}
            </select>
          </div>

          <div className="flex gap-4">
            <Button
              className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => handleExport("excel")}
              disabled={loading}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Download Excel
            </Button>
            <Button
              className="flex-1 gap-2 bg-red-600 hover:bg-red-700 text-white"
              onClick={() => handleExport("pdf")}
              disabled={loading}
            >
              <FileText className="h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
