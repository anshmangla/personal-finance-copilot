"use client"
import { useEffect, useState } from "react"
import { getSummary } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts"

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d']

export default function DashboardPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // We will do a dev login just to get a token if we don't have one, since this is local dev.
    const fetchSummary = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          const { devLogin } = await import("@/lib/api");
          const authRes = await devLogin();
          localStorage.setItem('access_token', authRes.access_token);
        }
        
        const res = await getSummary()
        setData(res.data)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchSummary()
  }, [])

  if (loading) return <div>Loading...</div>
  if (!data) return <div>Failed to load data.</div>

  const pieData = Object.keys(data.category_breakdown).map((key) => ({
    name: key,
    value: data.category_breakdown[key]
  }))

  const upcomingReminders = data.upcoming_reminders || []

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Total Spend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₹{data.total_spend.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">₹{data.total_income.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${data.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              ₹{data.balance.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Spend by Category</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Reminders</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingReminders.length > 0 ? (
              <ul className="space-y-2">
                {upcomingReminders.map((rem: any, idx: number) => (
                  <li key={idx} className="flex justify-between items-center border-b pb-2">
                    <span className="font-medium">{rem.name}</span>
                    <span className="text-slate-500">{rem.days_left} days left</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-slate-500">No upcoming reminders in next 7 days.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
