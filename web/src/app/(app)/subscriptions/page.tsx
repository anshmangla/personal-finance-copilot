"use client"
import { useEffect, useState } from "react"
import { getSubscriptions, paySubscription } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSubs = async () => {
    try {
      setLoading(true)
      const res = await getSubscriptions()
      setSubscriptions(res.data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubs()
  }, [])

  const handlePay = async (id: string) => {
    try {
      await paySubscription(id)
      fetchSubs()
    } catch (e) {
      console.error(e)
      alert("Failed to pay subscription.")
    }
  }

  if (loading && subscriptions.length === 0) return <div className="p-4">Loading...</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Subscriptions</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Subscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          {subscriptions.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Billing Cycle</TableHead>
                    <TableHead>Next Payment</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.map((sub, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{sub.name}</TableCell>
                      <TableCell>{sub.category}</TableCell>
                      <TableCell className="capitalize">{sub.billing_cycle}</TableCell>
                      <TableCell>{sub.next_payment_date}</TableCell>
                      <TableCell className="text-right font-bold text-red-600">
                        ₹{Number(sub.amount).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => handlePay(sub.id)}>Mark Paid</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-slate-500 py-4 text-center">No active subscriptions found.</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
