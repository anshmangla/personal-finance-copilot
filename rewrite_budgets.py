import os

file_path = "web/src/app/(app)/budgets/page.tsx"

code = """\
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
import { CheckCircle2, Flag, PieChart, Plus, RefreshCw, Trash2, Target, AlertTriangle } from "lucide-react"
import { motion } from "framer-motion"

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

const CircularProgress = ({ value, max, size = 100, strokeWidth = 10 }: { value: number, max: number, size?: number, strokeWidth?: number }) => {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const percent = max > 0 ? Math.min(value / max, 1) : 0
  const offset = circumference - percent * circumference
  const isOver = value > max && max > 0
  const isWarning = value > max * 0.85 && !isOver
  
  let colorClass = "text-emerald-500"
  if (isOver) colorClass = "text-rose-500"
  else if (isWarning) colorClass = "text-amber-500"

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="absolute transform -rotate-90" width={size} height={size}>
        <circle stroke="currentColor" fill="transparent" strokeWidth={strokeWidth} className="text-slate-100" r={radius} cx={size / 2} cy={size / 2} />
        <circle
          stroke="currentColor" fill="transparent" strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset}
          className={`${colorClass} transition-all duration-1000 ease-out`} strokeLinecap="round"
          r={radius} cx={size / 2} cy={size / 2}
        />
      </svg>
      <div className="flex flex-col items-center justify-center text-center absolute inset-0">
        <span className={`text-sm font-bold ${isOver ? 'text-rose-600' : 'text-slate-700'}`}>{Math.round(percent * 100)}%</span>
      </div>
    </div>
  )
}

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Record<string, number>>({})
  const [categorySpend, setCategorySpend] = useState<Record<string, number>>({})
  const [goals, setGoals] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false)
  const [goalDialogOpen, setGoalDialogOpen] = useState(false)

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

  const budgetKeys = Object.keys(budgets)

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Budgets & Goals</h1>
          <p className="text-slate-500 mt-1">Set monthly caps and monitor long-term financial milestones.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} className="gap-2 font-semibold shadow-sm rounded-full bg-white hover:bg-slate-50">
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button onClick={() => setBudgetDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-md">
            <Plus className="h-4 w-4 mr-1.5" />
            Set Budget
          </Button>
          <Button onClick={() => setGoalDialogOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-md">
            <Plus className="h-4 w-4 mr-1.5" />
            Add Goal
          </Button>
        </div>
      </div>

      {loading && budgetKeys.length === 0 && goals.length === 0 ? (
        <div className="flex h-[40vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent shadow-lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Category Budgets */}
          <Card className="shadow-sm border-slate-200/60 bg-white">
            <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-blue-500" />
                  Monthly Budgets
                </CardTitle>
                <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider">For {currentMonthStr}</p>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {budgetKeys.length === 0 ? (
                <div className="text-center py-10">
                  <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Target className="h-8 w-8 text-blue-300" />
                  </div>
                  <p className="font-semibold text-slate-700 mb-1">No budgets set</p>
                  <p className="text-sm text-slate-500 mb-4">Keep your spending in check by setting limits.</p>
                  <Button variant="outline" onClick={() => setBudgetDialogOpen(true)}>Create your first budget</Button>
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2">
                  {budgetKeys.map((category) => {
                    const limit = budgets[category]
                    const spent = categorySpend[category] || 0
                    const isOver = spent > limit
                    const isWarning = spent > limit * 0.85 && !isOver

                    return (
                      <motion.div 
                        whileHover={{ y: -2 }}
                        key={category} 
                        className={`flex flex-col items-center text-center p-4 rounded-2xl border ${isOver ? 'bg-rose-50 border-rose-100 shadow-sm' : isWarning ? 'bg-amber-50 border-amber-100 shadow-sm' : 'bg-slate-50 border-slate-100'}`}
                      >
                        <h4 className="font-bold text-slate-800 mb-3">{category}</h4>
                        <CircularProgress value={spent} max={limit} size={100} strokeWidth={8} />
                        <div className="mt-4 w-full">
                          <div className="flex justify-between text-xs font-medium mb-1">
                            <span className="text-slate-500">Spent: <strong className={isOver ? 'text-rose-600' : 'text-slate-900'}>₹{spent.toFixed(2)}</strong></span>
                            <span className="text-slate-500">Limit: <strong>₹{limit.toFixed(2)}</strong></span>
                          </div>
                          {isOver && (
                            <div className="flex items-center justify-center gap-1 text-[10px] uppercase font-bold text-rose-600 bg-rose-100 py-1 px-2 rounded-full mt-2">
                              <AlertTriangle className="h-3 w-3" /> Over Budget
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Goals */}
          <Card className="shadow-sm border-slate-200/60 bg-white">
            <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Flag className="h-5 w-5 text-indigo-500" />
                Financial Goals
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {goals.length === 0 ? (
                <div className="text-center py-10">
                  <div className="bg-indigo-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Flag className="h-8 w-8 text-indigo-300" />
                  </div>
                  <p className="font-semibold text-slate-700 mb-1">No goals defined</p>
                  <p className="text-sm text-slate-500 mb-4">Set long-term milestones to track your progress.</p>
                  <Button variant="outline" onClick={() => setGoalDialogOpen(true)}>Add your first goal</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {goals.map((g, idx) => (
                    <motion.div 
                      whileHover={{ scale: 1.01 }}
                      key={idx} 
                      className="group flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl hover:border-indigo-200 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
                          <CheckCircle2 className="h-5 w-5" />
                        </div>
                        <p className="font-semibold text-slate-800">{g}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteGoal(idx)}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-opacity rounded-full h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* SET BUDGET DIALOG */}
      <Dialog open={budgetDialogOpen} onOpenChange={setBudgetDialogOpen}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Set Category Budget</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSetBudgetSubmit} className="space-y-5 mt-2">
            <div className="space-y-2">
              <Label className="font-semibold text-slate-700">Category</Label>
              <select
                className="flex h-10 w-full rounded-xl border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:ring-1 focus:ring-blue-500"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                {BUDGET_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="font-semibold text-slate-700">Monthly Limit (₹)</Label>
              <Input
                required type="number" step="0.01" min="1" className="rounded-xl"
                value={budgetLimit} onChange={(e) => setBudgetLimit(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
              Save Budget
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ADD GOAL DIALOG */}
      <Dialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Add Financial Goal</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddGoalSubmit} className="space-y-5 mt-2">
            <div className="space-y-2">
              <Label className="font-semibold text-slate-700">Goal Description</Label>
              <Input
                required className="rounded-xl"
                value={newGoalText} onChange={(e) => setNewGoalText(e.target.value)}
                placeholder="e.g. Save ₹20,000 for emergency fund"
              />
            </div>
            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl">
              Save Goal
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
"""

with open(file_path, "w", encoding="utf-8") as f:
    f.write(code)

print("Budgets rewrite complete.")
