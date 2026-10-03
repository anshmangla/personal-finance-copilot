"use client"

import { useEffect, useState } from "react"
import {
  getSummary,
  paySubscription,
  editTransaction,
  deleteTransaction,
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
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Filter,
  Pencil,
  Trash2,
  RefreshCw,
  Sparkles,
  Wallet,
  TrendingUp,
  ArrowRight,
  Utensils,
  ShoppingBag,
  Car,
  Receipt,
  Tv,
  Repeat,
  Plane,
  HeartPulse,
  MoreHorizontal
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

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

const CATEGORY_ICONS: Record<string, any> = {
  Food: Utensils,
  Shopping: ShoppingBag,
  Transport: Car,
  Bills: Receipt,
  Entertainment: Tv,
  Transfer: Repeat,
  Travel: Plane,
  Health: HeartPulse,
  Other: MoreHorizontal,
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
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
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

  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const [filterByMonth, setFilterByMonth] = useState(false)

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
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent shadow-lg" />
          <p className="text-sm font-semibold text-muted-foreground animate-pulse tracking-wide">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  const allTransactions = data?.transactions || []
  const availableMonths: string[] = data?.available_months || []
  const currentMonthIdx = selectedMonth ? availableMonths.indexOf(selectedMonth) : -1

  let monthIncome = 0
  let monthExpense = 0
  const monthCategoryBreakdown: Record<string, number> = {}

  if (selectedMonth) {
    for (const tx of allTransactions) {
      const date = (tx.date || "").toString()
      if (date.startsWith(selectedMonth)) {
        const amt = parseFloat(tx.amount) || 0
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
  }
  const monthBalance = monthIncome - monthExpense

  const groupedTransactions: Record<string, any[]> = {}
  for (const tx of allTransactions) {
    const dateStr = (tx.date || "").toString()
    let mKey = "Unknown"
    if (dateStr.length >= 7) {
      mKey = dateStr.substring(0, 7)
    }
    if (!groupedTransactions[mKey]) groupedTransactions[mKey] = []
    groupedTransactions[mKey].push(tx)
  }
  const sortedMonthsKeys = Object.keys(groupedTransactions).sort().reverse()

  const upcomingReminders = (data?.upcoming_reminders || []).filter((b: any) => {
    const days = b.days_remaining ?? b.days_left ?? 0
    return days <= 14
  })

  // Prepare Doughnut Chart Data
  const pieData = Object.entries(monthCategoryBreakdown)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  // Prepare Cash Flow Area Chart Data
  const dailyCashFlow: Record<string, { income: number; expense: number }> = {}
  if (selectedMonth) {
    for (let i = 1; i <= 31; i++) {
      const dayStr = `${selectedMonth}-${i.toString().padStart(2, '0')}`
      dailyCashFlow[dayStr] = { income: 0, expense: 0 }
    }
    for (const tx of allTransactions) {
      const dateStr = (tx.date || "").toString()
      if (dateStr.startsWith(selectedMonth)) {
        const amt = parseFloat(tx.amount) || 0
        const isCredit = (tx.type || "debit").toLowerCase() === "credit"
        if (dailyCashFlow[dateStr]) {
          if (isCredit) dailyCashFlow[dateStr].income += amt
          else dailyCashFlow[dateStr].expense += amt
        }
      }
    }
  }
  const areaChartData = Object.keys(dailyCashFlow).sort().map(date => {
    const d = new Date(date)
    return {
      date: isNaN(d.getTime()) ? date : d.getDate().toString(),
      Income: dailyCashFlow[date].income,
      Expense: dailyCashFlow[date].expense
    }
  })

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8 pb-10"
    >
      {/* Header & AI Insights */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Overview</h1>
          <p className="text-muted-foreground mt-1">Here's what's happening with your money.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSummary}
            className="gap-2 font-semibold shadow-sm rounded-full bg-card hover:bg-muted"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilterByMonth(!filterByMonth)}
            className="gap-2 font-semibold shadow-sm rounded-full bg-card hover:bg-muted"
          >
            <Filter className="h-4 w-4" />
            <span>{filterByMonth ? "Showing Selected Month" : "Showing All Months"}</span>
          </Button>
        </div>
      </div>

      {availableMonths.length > 0 && selectedMonth && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-4 bg-gradient-to-r from-blue-600 to-indigo-600 p-4 rounded-2xl shadow-lg shadow-blue-500/20 text-white"
        >
          <div className="bg-card/20 p-2.5 rounded-xl backdrop-blur-sm">
            <Sparkles className="h-6 w-6 text-blue-50" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg">AI Quick Insight</h3>
            <p className="text-blue-100 text-sm opacity-90">
              You've spent ₹{monthExpense.toFixed(2)} in {formatMonthYear(selectedMonth)}. 
              {pieData.length > 0 ? ` Most of it went to ${pieData[0].name}.` : " No major expenses yet!"}
            </p>
          </div>
        </motion.div>
      )}

      {/* Metric Cards */}
      {availableMonths.length > 0 && selectedMonth && (
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="shadow-sm border-border/60 bg-card hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Net Balance</span>
                <div className="p-2 bg-muted rounded-lg">
                  <Wallet className="h-5 w-5 text-foreground" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-foreground">
                ₹{monthBalance.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> For {formatMonthYear(selectedMonth)}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-emerald-100 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/30 hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Total Income</span>
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg">
                  <ArrowDownLeft className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-emerald-900">
                ₹{monthIncome.toFixed(2)}
              </div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5" /> + Income this month
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-rose-100 dark:border-rose-900/50 bg-rose-50/30 dark:bg-rose-950/30 hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wider">Total Spend</span>
                <div className="p-2 bg-rose-100 dark:bg-rose-900/50 rounded-lg">
                  <ArrowUpRight className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-rose-900">
                ₹{monthExpense.toFixed(2)}
              </div>
              <p className="text-xs text-rose-600 dark:text-rose-400 mt-2 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" /> - Expenses this month
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Month Navigation */}
      {availableMonths.length > 0 && selectedMonth && (
        <div className="flex items-center justify-between bg-card border border-border rounded-2xl p-2 shadow-sm">
          <Button
            variant="ghost"
            disabled={currentMonthIdx >= availableMonths.length - 1}
            onClick={() => setSelectedMonth(availableMonths[currentMonthIdx + 1])}
            className="rounded-xl text-muted-foreground hover:bg-muted"
          >
            <ChevronLeft className="h-5 w-5 mr-1" /> Prev
          </Button>
          <span className="font-bold text-foreground text-lg">
            {formatMonthYear(selectedMonth)}
          </span>
          <Button
            variant="ghost"
            disabled={currentMonthIdx <= 0}
            onClick={() => setSelectedMonth(availableMonths[currentMonthIdx - 1])}
            className="rounded-xl text-muted-foreground hover:bg-muted"
          >
            Next <ChevronRight className="h-5 w-5 ml-1" />
          </Button>
        </div>
      )}

      {/* Charts Section */}
      {availableMonths.length > 0 && selectedMonth && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Cash Flow Area Chart */}
          <Card className="shadow-sm border-border">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                Cash Flow
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-[250px] w-full">
                {areaChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={areaChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `₹${val}`} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 14px rgba(0,0,0,0.1)' }}
                        itemStyle={{ fontWeight: 'bold' }}
                      />
                      <Area type="monotone" dataKey="Income" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                      <Area type="monotone" dataKey="Expense" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">No data for this month</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Expenses Doughnut Chart */}
          <Card className="shadow-sm border-border">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                <PieChart className="h-5 w-5 text-purple-500" />
                Spending by Category
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-center gap-6 h-[250px]">
                <div className="w-full md:w-1/2 h-full">
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                          stroke="none"
                        >
                          {pieData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={CATEGORY_COLORS[entry.name] || CATEGORY_COLORS["Other"]}
                            />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: any) => `₹${value.toFixed(2)}`} 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 14px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">No expenses recorded</div>
                  )}
                </div>
                
                <div className="w-full md:w-1/2 h-full overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                  {pieData.map((d, i) => {
                    const percentage = monthExpense > 0 ? ((d.value / monthExpense) * 100).toFixed(1) : 0;
                    return (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: CATEGORY_COLORS[d.name] || CATEGORY_COLORS["Other"] }} 
                          />
                          <span className="text-sm font-semibold text-foreground">{d.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-foreground">₹{d.value.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">{percentage}%</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Upcoming Bills & Activity Feed */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Col: Activity Feed */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-bold text-foreground">Recent Activity</h2>
          
          {sortedMonthsKeys.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-12 text-center text-muted-foreground">
              <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Receipt className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="font-semibold text-foreground mb-1">No transactions found</p>
              <p className="text-sm">Add some transactions to see your activity feed.</p>
            </div>
          ) : (
            sortedMonthsKeys.map((mKey) => {
              if (filterByMonth && selectedMonth && mKey !== selectedMonth) return null
              const txList = groupedTransactions[mKey]

              return (
                <div key={mKey} className="space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground pl-1 mt-6 mb-2">
                    {formatMonthYear(mKey)}
                  </h3>
                  <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                    {txList.map((tx, idx) => {
                      const isCredit = (tx.type || "debit").toLowerCase() === "credit"
                      const IconComponent = CATEGORY_ICONS[tx.category] || CATEGORY_ICONS["Other"]
                      
                      return (
                        <div
                          key={tx.id || idx}
                          className="group flex items-center justify-between p-4 border-b border-border last:border-0 hover:bg-muted transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-4">
                            <div
                              className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                                isCredit ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {isCredit ? <ArrowDownLeft className="h-6 w-6" /> : <IconComponent className="h-6 w-6" />}
                            </div>
                            <div>
                              <p className="text-base font-bold text-foreground">
                                {tx.merchant}
                              </p>
                              <p className="text-sm text-muted-foreground flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${isCredit ? 'bg-emerald-50 dark:bg-emerald-950' : 'bg-slate-400'}`}></span>
                                {isCredit ? "Income" : tx.category} • {tx.date}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <span
                              className={`font-extrabold text-base ${
                                isCredit ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                              }`}
                            >
                              {isCredit ? "+" : "-"}₹{Number(tx.amount).toFixed(2)}
                            </span>

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => handleOpenEdit(tx)}
                                className="text-muted-foreground hover:text-blue-600 h-8 w-8 rounded-full bg-card shadow-sm border border-border"
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
                                className="text-muted-foreground hover:text-red-600 h-8 w-8 rounded-full bg-card shadow-sm border border-border"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Right Col: Upcoming Bills */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-foreground">Upcoming Bills</h2>
          {upcomingReminders.length > 0 ? (
            <div className="space-y-3">
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
                    className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-950/50 p-4 shadow-sm relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-16 h-16 bg-amber-50 dark:bg-amber-950/10 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2" />
                    
                    <div className="flex justify-between items-start">
                      <div className="overflow-hidden pr-2">
                        <p className="font-bold text-sm text-foreground truncate">
                          {bill.name}
                        </p>
                        <p
                          className={`text-xs mt-1 font-medium flex items-center gap-1 ${
                            days <= 1 ? "text-red-600" : "text-amber-700 dark:text-amber-400"
                          }`}
                        >
                          <Calendar className="h-3.5 w-3.5" />
                          {dueText}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-extrabold text-foreground">₹{Number(bill.amount).toFixed(2)}</p>
                      </div>
                    </div>
                    
                    {bill.id && (
                      <Button
                        size="sm"
                        className="bg-teal-600 hover:bg-teal-700 text-white w-full rounded-xl"
                        onClick={() => handlePayBill(bill.id, bill.name)}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Mark as Paid
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="bg-card rounded-2xl border border-border p-8 text-center text-muted-foreground shadow-sm">
              <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm">No bills due in the next 14 days.</p>
            </div>
          )}
        </div>
      </div>

      {/* EDIT TRANSACTION MODAL */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Edit Transaction</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-5 mt-2">
            <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-xl">
              <button
                type="button"
                onClick={() =>
                  setEditFormData((prev) => ({
                    ...prev,
                    type: "debit",
                    category: EXPENSE_CATEGORIES[0],
                  }))
                }
                className={`py-2 text-sm font-bold rounded-lg transition-all ${
                  editFormData.type === "debit"
                    ? "bg-card text-rose-600 dark:text-rose-400 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
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
                className={`py-2 text-sm font-bold rounded-lg transition-all ${
                  editFormData.type === "credit"
                    ? "bg-card text-emerald-600 dark:text-emerald-400 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Income (+)
              </button>
            </div>

            <div className="space-y-2">
              <Label className="font-semibold text-foreground">
                {editFormData.type === "credit" ? "Payer / Source" : "Merchant"}
              </Label>
              <Input
                required
                className="rounded-xl"
                value={editFormData.merchant}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, merchant: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-semibold text-foreground">Amount (₹)</Label>
                <Input
                  required
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="rounded-xl"
                  value={editFormData.amount}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, amount: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label className="font-semibold text-foreground">Date</Label>
                <Input
                  required
                  type="date"
                  className="rounded-xl"
                  value={editFormData.date}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, date: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-semibold text-foreground">Category</Label>
              <select
                className="flex h-10 w-full rounded-xl border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:ring-1 focus:ring-blue-500"
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

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => setEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Delete Transaction?</DialogTitle>
          </DialogHeader>
          <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-100 dark:border-red-900/50 my-2">
            <p className="text-sm text-red-800">
              Are you sure you want to delete this transaction for{" "}
              <span className="font-bold">
                ₹{Number(selectedTx?.amount || 0).toFixed(2)}
              </span>{" "}
              at <span className="font-bold">{selectedTx?.merchant}</span>? This action cannot be undone.
            </p>
          </div>
          <div className="flex justify-end gap-3 mt-2">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setDeleteConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
            >
              Delete Forever
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
