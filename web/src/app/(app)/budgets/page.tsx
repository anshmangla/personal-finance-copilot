"use client"
import { useEffect, useState } from "react"
import { getBudgets, getGoals, getSummary } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<any>({})
  const [categorySpend, setCategorySpend] = useState<any>({})
  const [goals, setGoals] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [bRes, gRes, sRes] = await Promise.all([
          getBudgets(),
          getGoals(),
          getSummary()
        ])
        setBudgets(bRes.data || {})
        setGoals(gRes.data || [])
        setCategorySpend(sRes.data.category_breakdown || {})
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) return <div>Loading...</div>

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Budgets & Goals</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Category Budgets</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(budgets).length > 0 ? (
              <div className="space-y-4">
                {Object.keys(budgets).map((category) => {
                  const limit = budgets[category]
                  const spent = categorySpend[category] || 0
                  const percent = Math.min((spent / limit) * 100, 100)
                  return (
                    <div key={category} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{category}</span>
                        <span className="text-slate-500">
                          ₹{spent.toFixed(2)} / ₹{limit.toFixed(2)}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2.5">
                        <div 
                          className={`h-2.5 rounded-full ${percent >= 90 ? 'bg-red-600' : percent >= 75 ? 'bg-yellow-500' : 'bg-emerald-600'}`} 
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-slate-500 text-center py-4">No budgets set.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Financial Goals</CardTitle>
          </CardHeader>
          <CardContent>
            {goals.length > 0 ? (
              <ul className="space-y-2 list-disc pl-5">
                {goals.map((goal, idx) => (
                  <li key={idx} className="text-slate-700">{goal}</li>
                ))}
              </ul>
            ) : (
              <div className="text-slate-500 text-center py-4">No financial goals set.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
