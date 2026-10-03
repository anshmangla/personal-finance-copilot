import os

file_path = "web/src/app/(app)/transactions/page.tsx"

code = """\
"use client"

import { useEffect, useState, useRef } from "react"
import {
  getSummary,
  addTransaction,
  editTransaction,
  deleteTransaction,
  scanReceipt,
} from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Upload, Pencil, Trash2, Search, Filter, Plus, FileText, ArrowDownLeft, ArrowUpRight, Camera } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

const EXPENSE_CATEGORIES = ["Food", "Shopping", "Transport", "Bills", "Entertainment", "Transfer", "Travel", "Health", "Other"]
const INCOME_CATEGORIES = ["Salary", "Freelance", "Investment", "Gift", "Refund", "Transfer", "Other"]

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [selectedTx, setSelectedTx] = useState<any | null>(null)

  const [isScanning, setIsScanning] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState("all") // 'all', 'credit', 'debit'

  const [formData, setFormData] = useState({
    amount: "", merchant: "", category: "Food", type: "debit", date: new Date().toISOString().split("T")[0],
  })

  const [editFormData, setEditFormData] = useState({
    id: "", amount: "", merchant: "", category: "Food", type: "debit", date: "",
  })

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      const res = await getSummary()
      setTransactions(res.data?.transactions || [])
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  useEffect(() => { fetchTransactions() }, [])

  const handleScanReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    setIsScanning(true)
    try {
      const res = await scanReceipt(e.target.files[0])
      if (res?.data) {
        const d = res.data
        setFormData((prev) => ({
          ...prev,
          amount: d.total_amount?.toString() || d.amount?.toString() || prev.amount,
          merchant: d.merchant_name || d.merchant || prev.merchant,
          date: d.date || prev.date,
          category: d.inferred_category || d.category || "Shopping",
          type: "debit",
        }))
      }
    } catch (error) {
      console.error("OCR Failed:", error)
      alert("Failed to scan receipt. Please enter details manually.")
    } finally { setIsScanning(false) }
  }

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await addTransaction({
        amount: parseFloat(formData.amount), merchant: formData.merchant.trim(), category: formData.category, type: formData.type, date: formData.date,
      })
      setAddDialogOpen(false)
      setFormData({ amount: "", merchant: "", category: "Food", type: "debit", date: new Date().toISOString().split("T")[0] })
      fetchTransactions()
    } catch (error) { console.error(error); alert("Failed to add transaction.") }
  }

  const handleOpenEdit = (tx: any) => {
    setSelectedTx(tx)
    setEditFormData({
      id: tx.id?.toString() || "", amount: tx.amount?.toString() || "", merchant: tx.merchant || "", category: tx.category || "Other",
      type: (tx.type || "debit").toLowerCase(), date: tx.date || "",
    })
    setEditDialogOpen(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await editTransaction({
        id: editFormData.id, amount: parseFloat(editFormData.amount), merchant: editFormData.merchant.trim(),
        category: editFormData.category, type: editFormData.type, date: editFormData.date,
      })
      setEditDialogOpen(false)
      fetchTransactions()
    } catch (error) { console.error(error); alert("Failed to update transaction.") }
  }

  const handleDelete = async () => {
    if (!selectedTx?.id) return
    try {
      await deleteTransaction(selectedTx.id.toString())
      setDeleteConfirmOpen(false)
      setSelectedTx(null)
      fetchTransactions()
    } catch (error) { console.error(error); alert("Failed to delete transaction.") }
  }

  // Filter logic
  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch = (tx.merchant || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (tx.category || "").toLowerCase().includes(searchQuery.toLowerCase())
    const tType = (tx.type || "debit").toLowerCase()
    const matchesType = typeFilter === "all" || typeFilter === tType
    return matchesSearch && matchesType
  })

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Transactions</h1>
          <p className="text-slate-500 mt-1">Manage and edit your complete financial history.</p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-md">
          <Plus className="h-4 w-4 mr-1.5" />
          Add Transaction
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search merchants or categories..." 
            className="pl-9 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-colors"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button 
            variant={typeFilter === "all" ? "default" : "outline"} 
            className={`rounded-xl ${typeFilter === 'all' ? 'bg-slate-800 text-white' : ''}`}
            onClick={() => setTypeFilter("all")}
          >
            All
          </Button>
          <Button 
            variant={typeFilter === "credit" ? "default" : "outline"} 
            className={`rounded-xl ${typeFilter === 'credit' ? 'bg-emerald-600 text-white' : ''}`}
            onClick={() => setTypeFilter("credit")}
          >
            Income
          </Button>
          <Button 
            variant={typeFilter === "debit" ? "default" : "outline"} 
            className={`rounded-xl ${typeFilter === 'debit' ? 'bg-rose-600 text-white' : ''}`}
            onClick={() => setTypeFilter("debit")}
          >
            Expense
          </Button>
        </div>
      </div>

      {/* Advanced Data Table / List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="hidden md:grid grid-cols-12 gap-4 p-4 bg-slate-50 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-500">
          <div className="col-span-2">Date</div>
          <div className="col-span-4">Merchant</div>
          <div className="col-span-2">Category</div>
          <div className="col-span-2 text-right">Amount</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {loading && transactions.length === 0 ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="py-16 flex flex-col items-center text-center px-4">
            <div className="bg-slate-50 p-6 rounded-full mb-4">
              <FileText className="h-12 w-12 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No transactions found</h3>
            <p className="text-slate-500 max-w-sm mb-6">We couldn't find any transactions matching your current filters.</p>
            <Button variant="outline" onClick={() => { setSearchQuery(""); setTypeFilter("all") }}>Clear Filters</Button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            <AnimatePresence>
              {filteredTransactions.map((tx) => {
                const isCredit = (tx.type || "debit").toLowerCase() === "credit"
                return (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    key={tx.id} 
                    className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 items-center hover:bg-slate-50/80 transition-colors group"
                  >
                    <div className="col-span-2 flex flex-row md:flex-col justify-between md:justify-start">
                      <span className="text-sm font-semibold text-slate-900 md:hidden">Date</span>
                      <span className="text-sm text-slate-600 font-medium">{tx.date}</span>
                    </div>

                    <div className="col-span-4 flex items-center gap-3">
                      <div className={`hidden md:flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isCredit ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                        {isCredit ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                      </div>
                      <div className="truncate">
                        <p className="font-bold text-slate-900 truncate">{tx.merchant}</p>
                        <p className="text-xs text-slate-500 md:hidden">{tx.category}</p>
                      </div>
                    </div>

                    <div className="col-span-2 hidden md:block">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                        {tx.category}
                      </span>
                    </div>

                    <div className="col-span-2 flex flex-row md:flex-col justify-between md:justify-start text-right">
                      <span className="text-sm font-semibold text-slate-900 md:hidden">Amount</span>
                      <span className={`font-extrabold text-base ${isCredit ? 'text-emerald-600' : 'text-slate-900'}`}>
                        {isCredit ? "+" : "-"}₹{Number(tx.amount).toFixed(2)}
                      </span>
                    </div>

                    <div className="col-span-2 flex justify-end gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(tx)} className="h-9 w-9 rounded-full hover:bg-white hover:text-blue-600 shadow-sm border border-transparent hover:border-slate-200">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => { setSelectedTx(tx); setDeleteConfirmOpen(true); }} className="h-9 w-9 rounded-full hover:bg-white hover:text-red-600 shadow-sm border border-transparent hover:border-slate-200">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ADD TRANSACTION MODAL */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Add Transaction</DialogTitle>
          </DialogHeader>

          {/* AI Receipt Scanner */}
          <div className="rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 p-6 flex flex-col items-center justify-center text-center">
            <input
              type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleScanReceipt}
            />
            {isScanning ? (
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
                <p className="text-sm font-medium text-indigo-700 animate-pulse">Extracting receipt data with AI...</p>
              </div>
            ) : (
              <>
                <div className="bg-indigo-100 p-3 rounded-full mb-3 text-indigo-600">
                  <Camera className="h-6 w-6" />
                </div>
                <h4 className="font-bold text-indigo-900 mb-1">Scan Receipt</h4>
                <p className="text-xs text-indigo-700/80 mb-4 max-w-[250px]">Upload a photo of a receipt and AI will automatically extract the details.</p>
                <Button onClick={() => fileInputRef.current?.click()} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full">
                  <Upload className="h-4 w-4 mr-2" /> Upload Image
                </Button>
              </>
            )}
          </div>

          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, type: "debit", category: EXPENSE_CATEGORIES[0] }))}
                className={`py-2 text-sm font-bold rounded-lg transition-all ${formData.type === "debit" ? "bg-white text-rose-600 shadow-sm" : "text-slate-500"}`}
              >
                Expense (-)
              </button>
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, type: "credit", category: INCOME_CATEGORIES[0] }))}
                className={`py-2 text-sm font-bold rounded-lg transition-all ${formData.type === "credit" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500"}`}
              >
                Income (+)
              </button>
            </div>
            
            <div className="space-y-2">
              <Label>{formData.type === "credit" ? "Payer / Source" : "Merchant"}</Label>
              <Input required className="rounded-xl" value={formData.merchant} onChange={(e) => setFormData({ ...formData, merchant: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Amount (₹)</Label><Input required type="number" step="0.01" className="rounded-xl" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} /></div>
              <div className="space-y-2"><Label>Date</Label><Input required type="date" className="rounded-xl" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} /></div>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <select className="flex h-10 w-full rounded-xl border border-input bg-transparent px-3 py-1 text-sm" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                {(formData.type === "credit" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => (<option key={c} value={c}>{c}</option>))}
              </select>
            </div>
            
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl">Save Transaction</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT MODAL */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader><DialogTitle className="text-xl font-bold">Edit Transaction</DialogTitle></DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
              <button type="button" onClick={() => setEditFormData((prev) => ({ ...prev, type: "debit", category: EXPENSE_CATEGORIES[0] }))} className={`py-2 text-sm font-bold rounded-lg transition-all ${editFormData.type === "debit" ? "bg-white text-rose-600 shadow-sm" : "text-slate-500"}`}>Expense (-)</button>
              <button type="button" onClick={() => setEditFormData((prev) => ({ ...prev, type: "credit", category: INCOME_CATEGORIES[0] }))} className={`py-2 text-sm font-bold rounded-lg transition-all ${editFormData.type === "credit" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500"}`}>Income (+)</button>
            </div>
            <div className="space-y-2"><Label>{editFormData.type === "credit" ? "Payer / Source" : "Merchant"}</Label><Input required className="rounded-xl" value={editFormData.merchant} onChange={(e) => setEditFormData({ ...editFormData, merchant: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Amount (₹)</Label><Input required type="number" step="0.01" className="rounded-xl" value={editFormData.amount} onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })} /></div>
              <div className="space-y-2"><Label>Date</Label><Input required type="date" className="rounded-xl" value={editFormData.date} onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })} /></div>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <select className="flex h-10 w-full rounded-xl border border-input bg-transparent px-3 py-1 text-sm" value={editFormData.category} onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}>
                {(editFormData.type === "credit" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => (<option key={c} value={c}>{c}</option>))}
              </select>
            </div>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl">Save Changes</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRM */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader><DialogTitle className="text-xl font-bold">Delete Transaction?</DialogTitle></DialogHeader>
          <div className="p-4 bg-red-50 rounded-xl border border-red-100 my-2">
            <p className="text-sm text-red-800">Are you sure you want to delete this transaction for <span className="font-bold">₹{Number(selectedTx?.amount || 0).toFixed(2)}</span> at <span className="font-bold">{selectedTx?.merchant}</span>? This action cannot be undone.</p>
          </div>
          <div className="flex justify-end gap-3 mt-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" className="bg-red-600 hover:bg-red-700 text-white rounded-xl" onClick={handleDelete}>Delete Forever</Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
"""

with open(file_path, "w", encoding="utf-8") as f:
    f.write(code)

print("Transactions rewrite complete.")
