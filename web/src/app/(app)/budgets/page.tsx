"use client"

import { useEffect, useState } from "react"
import { getBudgets, getGoals, getSummary, setBudget, addGoal, deleteGoal } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CheckCircle2, Flag, PieChart, Plus, RefreshCw, Trash2 } from "lucide-react"

const BUDGET_CATEGORIES = [
  "Food",
  "Shopping",
  "Transport",
  "Bills",
  "Entertainment",
  "Travel",
  "Health",
  "Other",
]

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Record<string, number>>({})
  const [categorySpend, setCategorySpend] = useState<Record<string, number>>({})
  const [goals, setGoals] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  // Dialog states
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false)
  const [goalDialogOpen, setGoalDialogOpen] = useState(false)

  // Form states
  const [selectedCategory, setSelectedCategory] = useState(BUDGET_CATEGORIES[0])
  const [budgetLimit, setBudgetLimit] = useState("")
  const [newGoalText, setNewGoalText] = useState("")

  const currentMonthStr = new Date().toISOString().substring(0, 7)

  const fetchData = async () => {
    try {
      setLoading(true)
      const [bRes, gRes, sRes] = await Promise.all([
        getBudgets(),
        getGoals(),
        getSummary(),
      ])

      setBudgets(bRes.data || {})
      setGoals(gRes.data || [])

      // Calculate current month's expense per category
      const txs = sRes.data?.transactions || []
      const monthSpend: Record<string, number> = {}
      for (const tx of txs) {
        const date = (tx.date || "").toString()
        if (date.startsWith(currentMonthStr)) {
          const type = (tx.type || "debit").toString().toLowerCase()
          if (type !== "credit") {
            const cat = tx.category || "Other"
            const amt = Number(tx.amount) || 0
            monthSpend[cat] = (monthSpend[cat] || 0) + amt
          }
        }
      }
      setCategorySpend(monthSpend)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleSetBudgetSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const limit = parseFloat(budgetLimit)
    if (isNaN(limit) || limit <= 0) return

    try {
      await setBudget(selectedCategory, limit)
      setBudgetDialogOpen(false)
      setBudgetLimit("")
      fetchData()
    } catch (e) {
      console.error(e)
      alert("Failed to set budget.")
    }
  }

  const handleAddGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newGoalText.trim()) return

    try {
      await addGoal(newGoalText.trim())
      setGoalDialogOpen(false)
      setNewGoalText("")
      fetchData()
    } catch (e) {
      console.error(e)
      alert("Failed to add goal.")
    }
  }

  const handleDeleteGoal = async (index: number) => {
    try {
      await deleteGoal(index)
      fetchData()
    } catch (e) {
      console.error(e)
      alert("Failed to remove goal.")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Budgets & Goals
          </h1>
          <p className="text-sm text-slate-500">
            Set monthly spending caps and monitor long-term financial milestones
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            title="Refresh"
            className="gap-1.5"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </Button>
          <Button
            onClick={() => setBudgetDialogOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Set Budget
          </Button>
          <Button
            onClick={() => setGoalDialogOpen(true)}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Goal
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Budgets */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <PieChart className="h-5 w-5 text-blue-600" />
                Monthly Category Budgets
              </CardTitle>
              <p className="text-xs text-slate-500 mt-1">
                Month: {currentMonthStr}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBudgetDialogOpen(true)}
              className="text-xs"
            >
              + Set Limit
            </Button>
          </CardHeader>
          <CardContent className="p-6">
            {loading && Object.keys(budgets).length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-500 animate-pulse">
                Loading budgets...
              </div>
            ) : Object.keys(budgets).length > 0 ? (
              <div className="space-y-5">
                {Object.keys(budgets).map((category) => {
                  const limit = budgets[category]
                  const spent = categorySpend[category] || 0
                  const percent = Math.min((spent / limit) * 100, 100)
                  const isOver = spent > limit

                  return (
                    <div key={category} className="space-y-1.5">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-semibold text-slate-900">
                          {category}
                        </span>
                        <div className="text-right">
                          <span
                            className={`font-bold ${
                              isOver ? "text-red-600" : "text-slate-900"
                            }`}
                          >
                            ₹{spent.toFixed(2)}
                          </span>
                          <span className="text-slate-400 text-xs">
                            {" "}
                            / ₹{limit.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-2.5 rounded-full transition-all duration-500 ${
                            isOver
                              ? "bg-red-600"
                              : percent >= 80
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>{percent.toFixed(0)}% spent</span>
                        <span>
                          {isOver
                            ? `Over by ₹${(spent - limit).toFixed(2)}`
                            : `₹${(limit - spent).toFixed(2)} remaining`}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 text-sm">
                No monthly budgets set yet. Tap &quot;+ Set Limit&quot; to begin.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Financial Goals */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Flag className="h-5 w-5 text-teal-600" />
              Financial & Savings Goals
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setGoalDialogOpen(true)}
              className="text-xs"
            >
              + Add Goal
            </Button>
          </CardHeader>
          <CardContent className="p-6">
            {loading && goals.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-500 animate-pulse">
                Loading goals...
              </div>
            ) : goals.length > 0 ? (
              <div className="space-y-3">
                {goals.map((goal, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                        <Flag className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-semibold text-slate-800">
                        {goal}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteGoal(idx)}
                      title="Mark Completed / Remove"
                      className="text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 text-xs gap-1"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Complete</span>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 text-sm">
                No goals added yet. Tap &quot;+ Add Goal&quot; or ask the AI Assistant
                to suggest one!
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* SET BUDGET DIALOG */}
      <Dialog open={budgetDialogOpen} onOpenChange={setBudgetDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set Monthly Category Budget</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSetBudgetSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                {BUDGET_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Monthly Limit (₹)</Label>
              <Input
                required
                type="number"
                step="1"
                min="1"
                value={budgetLimit}
                onChange={(e) => setBudgetLimit(e.target.value)}
                placeholder="e.g. 5000"
              />
            </div>

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              Save Budget Limit
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ADD GOAL DIALOG */}
      <Dialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Savings Goal</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddGoalSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Goal Description</Label>
              <Input
                required
                value={newGoalText}
                onChange={(e) => setNewGoalText(e.target.value)}
                placeholder="e.g. Save ₹20,000 for emergency fund"
              />
            </div>

            <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white">
              Save Goal
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
