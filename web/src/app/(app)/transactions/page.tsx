"use client"
import { useEffect, useState, useRef } from "react"
import { getSummary, addTransaction, scanReceipt } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Upload } from "lucide-react"

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isScanning, setIsScanning] = useState(false)

  const [formData, setFormData] = useState({
    amount: "",
    merchant: "",
    category: "",
    type: "debit",
    date: new Date().toISOString().split("T")[0]
  })

  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      const res = await getSummary()
      setTransactions(res.data.transactions || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [])

  const handleScanReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    setIsScanning(true)
    try {
      const res = await scanReceipt(e.target.files[0])
      if (res.data) {
        setFormData({
          ...formData,
          amount: res.data.total_amount?.toString() || "",
          merchant: res.data.merchant_name || "",
          date: res.data.date || formData.date,
          category: res.data.inferred_category || "Shopping"
        })
      }
    } catch (error) {
      console.error("OCR Failed:", error)
      alert("Failed to scan receipt.")
    } finally {
      setIsScanning(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await addTransaction({
        amount: parseFloat(formData.amount),
        merchant: formData.merchant,
        category: formData.category,
        type: formData.type,
        date: formData.date
      })
      setDialogOpen(false)
      fetchTransactions()
    } catch (error) {
      console.error(error)
      alert("Failed to add transaction.")
    }
  }

  if (loading && transactions.length === 0) return <div className="p-4">Loading...</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Transactions</h1>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>+ Add Transaction</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Transaction</DialogTitle>
            </DialogHeader>
            <div className="flex justify-between items-center bg-slate-50 p-4 border rounded-lg mb-4">
              <span className="text-sm text-slate-600">Have a receipt?</span>
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleScanReceipt}
              />
              <Button 
                variant="outline" 
                onClick={() => fileInputRef.current?.click()}
                disabled={isScanning}
              >
                <Upload className="w-4 h-4 mr-2" />
                {isScanning ? "Scanning..." : "Scan Receipt"}
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Merchant</Label>
                <Input required value={formData.merchant} onChange={e => setFormData({...formData, merchant: e.target.value})} placeholder="Amazon, Starbucks, etc." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input required type="number" step="0.01" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <select 
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    value={formData.type} 
                    onChange={e => setFormData({...formData, type: e.target.value})}
                  >
                    <option value="debit">Debit / Expense</option>
                    <option value="credit">Credit / Income</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Input required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} placeholder="Groceries, Tech, etc." />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                </div>
              </div>
              <Button type="submit" className="w-full mt-4">Save Transaction</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Merchant</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{tx.date || "Unknown"}</TableCell>
                      <TableCell className="font-medium">{tx.merchant}</TableCell>
                      <TableCell>{tx.category}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          tx.type === "credit" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                        }`}>
                          {tx.type}
                        </span>
                      </TableCell>
                      <TableCell className={`text-right font-bold ${
                        tx.type === "credit" ? "text-emerald-600" : ""
                      }`}>
                        {tx.type === "credit" ? "+" : "-"}₹{Number(tx.amount).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-slate-500 py-4 text-center">No transactions found.</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
