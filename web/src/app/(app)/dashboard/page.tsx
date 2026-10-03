"use client"

import { useEffect, useState } from "react"
import {
  getSummary,
  paySubscription,
  editTransaction,
  deleteTransaction,
  downloadExportExcel,
  downloadExportPdf,
} from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts"
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Filter,
  Pencil,
  Trash2,
  RefreshCw,
} from "lucide-react"

const CATEGORY_COLORS: Record<string, string> = {
  Food: "#f97316", // Orange
  Shopping: "#a855f7", // Purple
  Transport: "#3b82f6", // Blue
  Bills: "#ef4444", // Red
  Entertainment: "#ec4899", // Pink
  Transfer: "#14b8a6", // Teal
  Travel: "#6366f1", // Indigo
  Health: "#10b981", // Emerald
  Other: "#64748b", // Slate
}

const EXPENSE_CATEGORIES = [
  "Food",
  "Shopping",
  "Transport",
  "Bills",
  "Entertainment",
  "Transfer",
  "Travel",
  "Health",
  "Other",
]

const INCOME_CATEGORIES = [
  "Salary",
  "Freelance",
  "Investment",
  "Gift",
  "Refund",
  "Transfer",
  "Other",
]

function formatMonthYear(yearMonth: string): string {
  try {
    const parts = yearMonth.split("-")
    if (parts.length >= 2) {
      const monthNames = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ]
      const mIdx = parseInt(parts[1], 10) - 1
      if (mIdx >= 0 && mIdx < 12) {
        return `${monthNames[mIdx]} ${parts[0]}`
      }
    }
  } catch (_) {}
  return yearMonth
}

export default function DashboardPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Month filtering state
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const [filterByMonth, setFilterByMonth] = useState(false)

  // Transaction Edit / Delete modal states
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [selectedTx, setSelectedTx] = useState<any | null>(null)

  const [editFormData, setEditFormData] = useState({
    id: "",
    amount: "",
    merchant: "",
    category: "Food",
    type: "debit",
    date: "",
  })

  const fetchSummary = async () => {
    try {
      setLoading(true)
      const targetMonth = filterByMonth ? selectedMonth || undefined : undefined;
      const res = await getSummary(targetMonth)
      const d = res.data || {}
      setData(d)

      const sortedMonths = d.available_months || []

      if (!selectedMonth || !sortedMonths.includes(selectedMonth)) {
        setSelectedMonth(sortedMonths.length > 0 ? sortedMonths[0] : null)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSummary()
  }, [filterByMonth, selectedMonth])

  const handlePayBill = async (subId: string, name: string) => {
    try {
      await paySubscription(subId)
      alert(`Paid ${name}! Expense recorded and next payment date updated.`)
      fetchSummary()
    } catch (e) {
      console.error(e)
      alert("Failed to pay subscription.")
    }
  }

  const handleOpenEdit = (tx: any) => {
    setSelectedTx(tx)
    setEditFormData({
      id: tx.id?.toString() || "",
      amount: tx.amount?.toString() || "",
      merchant: tx.merchant || "",
      category: tx.category || "Other",
      type: (tx.type || "debit").toLowerCase(),
      date: tx.date || "",
    })
    setEditDialogOpen(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await editTransaction({
        id: editFormData.id,
        amount: parseFloat(editFormData.amount),
        merchant: editFormData.merchant.trim(),
        category: editFormData.category,
        type: editFormData.type,
        date: editFormData.date,
      })
      setEditDialogOpen(false)
      fetchSummary()
    } catch (error) {
      console.error(error)
      alert("Failed to update transaction.")
    }
  }

  const handleDelete = async () => {
    if (!selectedTx?.id) return
    try {
      await deleteTransaction(selectedTx.id.toString())
      setDeleteConfirmOpen(false)
      setSelectedTx(null)
      fetchSummary()
    } catch (error) {
      console.error(error)
      alert("Failed to delete transaction.")
    }
  }

  if (loading && !data) {
    return (
      <div className="py-24 text-center text-sm font-medium text-slate-500 animate-pulse">
        Loading your dashboard...
      </div>
    )
  }

  const allTransactions = data?.transactions || []

  // Extract unique available months from API response
  const availableMonths: string[] = data?.available_months || []

  // Calculate Month-Specific stats
  let monthIncome = 0
  let monthExpense = 0
  const monthCategoryBreakdown: Record<string, number> = {}

  if (selectedMonth) {
    for (const tx of allTransactions) {
      const dateStr = (tx.date || "").toString()
      if (dateStr.startsWith(selectedMonth)) {
        const amt = Number(tx.amount) || 0
        const isCredit = (tx.type || "debit").toLowerCase() === "credit"
        if (isCredit) {
          monthIncome += amt
        } else {
          monthExpense += amt
          const cat = tx.category || "Other"
          monthCategoryBreakdown[cat] = (monthCategoryBreakdown[cat] || 0) + amt
        }
      }
    }
  } else {
    monthIncome = data?.total_income || 0
    monthExpense = data?.total_spend || 0
    Object.assign(monthCategoryBreakdown, data?.category_breakdown || {})
  }

  const monthBalance = monthIncome - monthExpense

  // Group transactions (GPay style)
  const groupedTransactions: Record<string, any[]> = {}
  for (const tx of allTransactions) {
    const dateStr = (tx.date || "").toString()
    const mKey = dateStr.length >= 7 ? dateStr.substring(0, 7) : "Other"

    if (!filterByMonth || mKey === selectedMonth) {
      if (!groupedTransactions[mKey]) groupedTransactions[mKey] = []
      groupedTransactions[mKey].push(tx)
    }
  }

  const pieData = Object.keys(monthCategoryBreakdown).map((k) => ({
    name: k,
    value: monthCategoryBreakdown[k],
  }))

  const upcomingReminders = data?.upcoming_reminders || []
  const currentMonthIdx = selectedMonth ? availableMonths.indexOf(selectedMonth) : -1

  return (
    <div className="space-y-6">
      {/* Page Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-slate-500">
            Real-time financial summary & monthly insights
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSummary}
            className="gap-1.5 text-xs font-semibold"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadExportExcel(filterByMonth && selectedMonth ? selectedMonth : undefined)}
            className="gap-1.5 text-xs font-semibold"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            <span>Excel</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadExportPdf(filterByMonth && selectedMonth ? selectedMonth : undefined)}
            className="gap-1.5 text-xs font-semibold"
          >
            <FileText className="h-3.5 w-3.5 text-red-600" />
            <span>PDF</span>
          </Button>
        </div>
      </div>

      {/* Upcoming Bills Banner */}
      {upcomingReminders.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 shadow-xs">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm mb-3">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <span>Upcoming Bills ({upcomingReminders.length})</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {upcomingReminders.map((bill: any, idx: number) => {
              const days = bill.days_remaining ?? bill.days_left ?? 0
              const dueText =
                days < 0
                  ? `Overdue by ${-days}d`
                  : days === 0
                  ? "Due Today"
                  : days === 1
                  ? "Due Tomorrow"
                  : `Due in ${days} days`

              return (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-lg border border-amber-200 bg-white p-3 shadow-xs"
                >
                  <div className="overflow-hidden pr-2">
                    <p className="font-bold text-xs text-slate-900 truncate">
                      {bill.name}
                    </p>
                    <p
                      className={`text-[11px] ${
                        days <= 1
                          ? "text-red-600 font-semibold"
                          : "text-slate-500"
                      }`}
                    >
                      {dueText} • ₹{Number(bill.amount).toFixed(2)}
                    </p>
                  </div>
                  {bill.id && (
                    <Button
                      size="sm"
                      className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-7 px-2.5 shrink-0"
                      onClick={() => handlePayBill(bill.id, bill.name)}
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Pay
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Month Selector Bar */}
      {availableMonths.length > 0 && selectedMonth && (
        <Card className="shadow-xs">
          <CardContent className="p-2 flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={currentMonthIdx >= availableMonths.length - 1}
              onClick={() => setSelectedMonth(availableMonths[currentMonthIdx + 1])}
              title="Previous Month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <select
                className="bg-transparent font-bold text-slate-800 text-sm focus:outline-none cursor-pointer"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                {availableMonths.map((m) => (
                  <option key={m} value={m}>
                    {formatMonthYear(m)}
                  </option>
                ))}
              </select>
            </div>

            <Button
              variant="ghost"
              size="icon-sm"
              disabled={currentMonthIdx <= 0}
              onClick={() => setSelectedMonth(availableMonths[currentMonthIdx - 1])}
              title="Next Month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Metrics Row (Net Balance, Income, Expense) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="shadow-xs border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {selectedMonth ? `${formatMonthYear(selectedMonth)} Balance` : "Net Balance"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-3xl font-extrabold tracking-tight ${
                monthBalance >= 0 ? "text-slate-900" : "text-red-600"
              }`}
            >
              {monthBalance >= 0 ? "" : "-"}₹{Math.abs(monthBalance).toFixed(2)}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {monthBalance >= 0 ? "Surplus remaining" : "Deficit this period"}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-slate-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Income
            </CardTitle>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <ArrowDownLeft className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-emerald-600 tracking-tight">
              +₹{monthIncome.toFixed(2)}
            </div>
            <p className="mt-1 text-xs text-slate-500">Credited to account</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-slate-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Expense
            </CardTitle>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-50 text-red-600">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-red-600 tracking-tight">
              -₹{monthExpense.toFixed(2)}
            </div>
            <p className="mt-1 text-xs text-slate-500">Debited from account</p>
          </CardContent>
        </Card>
      </div>

      {/* Visual Analytics: Pie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-xs">
          <CardHeader className="pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold text-slate-900">
              Expense Breakdown {selectedMonth && `• ${formatMonthYear(selectedMonth)}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {pieData.length > 0 ? (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={CATEGORY_COLORS[entry.name] || "#64748b"}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => `₹${Number(val).toFixed(2)}`}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Category Chips Legend */}
                <div className="flex flex-wrap justify-center gap-2 mt-2">
                  {pieData.map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center gap-1.5 text-xs text-slate-600"
                    >
                      <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          backgroundColor:
                            CATEGORY_COLORS[item.name] || "#64748b",
                        }}
                      />
                      <span>{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-sm text-slate-400">
                No expense recorded in this period.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Insights / Month Overview */}
        <Card className="shadow-xs flex flex-col justify-between">
          <CardHeader className="pb-2 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900">
              Spending Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="rounded-xl bg-slate-50 p-4 border border-slate-200">
              <span className="text-xs uppercase font-bold text-slate-400 block mb-1">
                Highest Spending Category
              </span>
              {pieData.length > 0 ? (
                (() => {
                  const top = [...pieData].sort((a, b) => b.value - a.value)[0]
                  return (
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-slate-900">
                        {top.name}
                      </span>
                      <span className="text-base font-extrabold text-blue-600">
                        ₹{top.value.toFixed(2)}
                      </span>
                    </div>
                  )
                })()
              ) : (
                <span className="text-sm text-slate-500">None</span>
              )}
            </div>

            <div className="rounded-xl bg-slate-50 p-4 border border-slate-200">
              <span className="text-xs uppercase font-bold text-slate-400 block mb-1">
                Average Daily Spend
              </span>
              <div className="text-lg font-bold text-slate-900">
                ₹{(monthExpense / 30).toFixed(2)} / day
              </div>
            </div>

            <div className="rounded-xl bg-blue-50/60 p-4 border border-blue-200">
              <span className="text-xs font-bold text-blue-800 block mb-1">
                AI Tip
              </span>
              <p className="text-xs text-blue-900 leading-relaxed">
                Head over to the AI Assistant tab to ask questions like: &quot;How
                can I reduce my grocery spend?&quot; or &quot;Show me my spending
                spikes.&quot;
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* GPay-Style Month Grouped Transactions List */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-900">Recent Transactions</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilterByMonth(!filterByMonth)}
            className="text-xs gap-1.5"
          >
            <Filter className="h-3.5 w-3.5" />
            <span>{filterByMonth ? "Showing Selected Month" : "Showing All Months"}</span>
          </Button>
        </div>

        {Object.keys(groupedTransactions).length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            No transactions found.
          </div>
        ) : (
          Object.keys(groupedTransactions).map((mKey) => {
            const txList = groupedTransactions[mKey]
            const monthTotalExpense = txList
              .filter((t) => (t.type || "debit").toLowerCase() !== "credit")
              .reduce((acc, t) => acc + (Number(t.amount) || 0), 0)

            return (
              <div key={mKey} className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {formatMonthYear(mKey)}
                  </span>
                  <span className="text-xs font-semibold text-slate-600">
                    Spend: ₹{monthTotalExpense.toFixed(2)}
                  </span>
                </div>

                <Card className="shadow-xs divide-y divide-slate-100">
                  {txList.map((tx, idx) => {
                    const isCredit = (tx.type || "debit").toLowerCase() === "credit"
                    return (
                      <div
                        key={tx.id || idx}
                        className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-full text-white text-xs font-bold ${
                              isCredit
                                ? "bg-teal-500"
                                : "bg-slate-700"
                            }`}
                          >
                            {(tx.merchant || "U")[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {tx.merchant}
                            </p>
                            <p className="text-xs text-slate-500">
                              {isCredit ? "Income" : tx.category} • {tx.date}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span
                            className={`font-bold text-sm ${
                              isCredit ? "text-emerald-600" : "text-slate-900"
                            }`}
                          >
                            {isCredit ? "+" : "-"}₹{Number(tx.amount).toFixed(2)}
                          </span>

                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleOpenEdit(tx)}
                              className="text-slate-400 hover:text-blue-600"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => {
                                setSelectedTx(tx)
                                setDeleteConfirmOpen(true)
                              }}
                              className="text-slate-400 hover:text-red-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </Card>
              </div>
            )
          })
        )}
      </div>

      {/* EDIT TRANSACTION MODAL */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() =>
                  setEditFormData((prev) => ({
                    ...prev,
                    type: "debit",
                    category: EXPENSE_CATEGORIES[0],
                  }))
                }
                className={`py-2 text-xs font-bold rounded-md transition-all ${
                  editFormData.type === "debit"
                    ? "bg-white text-red-600 shadow-sm"
                    : "text-slate-500"
                }`}
              >
                Expense (-)
              </button>
              <button
                type="button"
                onClick={() =>
                  setEditFormData((prev) => ({
                    ...prev,
                    type: "credit",
                    category: INCOME_CATEGORIES[0],
                  }))
                }
                className={`py-2 text-xs font-bold rounded-md transition-all ${
                  editFormData.type === "credit"
                    ? "bg-white text-emerald-600 shadow-sm"
                    : "text-slate-500"
                }`}
              >
                Income (+)
              </button>
            </div>

            <div className="space-y-1.5">
              <Label>
                {editFormData.type === "credit" ? "Payer / Source" : "Merchant"}
              </Label>
              <Input
                required
                value={editFormData.merchant}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, merchant: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Amount (₹)</Label>
                <Input
                  required
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={editFormData.amount}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, amount: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input
                  required
                  type="date"
                  value={editFormData.date}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, date: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Category</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={editFormData.category}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, category: e.target.value })
                }
              >
                {(editFormData.type === "credit"
                  ? INCOME_CATEGORIES
                  : EXPENSE_CATEGORIES
                ).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Transaction?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Are you sure you want to delete this transaction for{" "}
            <span className="font-semibold text-slate-900">
              ₹{Number(selectedTx?.amount || 0).toFixed(2)}
            </span>{" "}
            at{" "}
            <span className="font-semibold text-slate-900">
              {selectedTx?.merchant}
            </span>
            ? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
