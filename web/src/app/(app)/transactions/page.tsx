"use client"

import { useEffect, useState, useRef } from "react"
import {
  getSummary,
  addTransaction,
  editTransaction,
  deleteTransaction,
  scanReceipt,
} from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Upload, Pencil, Trash2, Search, Filter } from "lucide-react"

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

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Modals state
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [selectedTx, setSelectedTx] = useState<any | null>(null)

  const [isScanning, setIsScanning] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState("all") // 'all' | 'debit' | 'credit'

  // Add Form Data
  const [formData, setFormData] = useState({
    amount: "",
    merchant: "",
    category: "Food",
    type: "debit",
    date: new Date().toISOString().split("T")[0],
  })

  // Edit Form Data
  const [editFormData, setEditFormData] = useState({
    id: "",
    amount: "",
    merchant: "",
    category: "Food",
    type: "debit",
    date: "",
  })

  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      const res = await getSummary()
      setTransactions(res.data?.transactions || [])
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
    } finally {
      setIsScanning(false)
    }
  }

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await addTransaction({
        amount: parseFloat(formData.amount),
        merchant: formData.merchant.trim(),
        category: formData.category,
        type: formData.type,
        date: formData.date,
      })
      setAddDialogOpen(false)
      setFormData({
        amount: "",
        merchant: "",
        category: "Food",
        type: "debit",
        date: new Date().toISOString().split("T")[0],
      })
      fetchTransactions()
    } catch (error) {
      console.error(error)
      alert("Failed to add transaction.")
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
      fetchTransactions()
    } catch (error) {
      console.error("Edit failed:", error)
      alert("Failed to update transaction.")
    }
  }

  const handleDelete = async () => {
    if (!selectedTx?.id) return
    try {
      await deleteTransaction(selectedTx.id.toString())
      setDeleteConfirmOpen(false)
      setSelectedTx(null)
      fetchTransactions()
    } catch (error) {
      console.error("Delete failed:", error)
      alert("Failed to delete transaction.")
    }
  }

  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch =
      (tx.merchant || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tx.category || "").toLowerCase().includes(searchQuery.toLowerCase())

    const matchesType =
      typeFilter === "all"
        ? true
        : (tx.type || "debit").toLowerCase() === typeFilter

    return matchesSearch && matchesType
  })

  const currentAddCategories =
    formData.type === "credit" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  const currentEditCategories =
    editFormData.type === "credit" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Transactions
          </h1>
          <p className="text-sm text-slate-500">
            View, add, edit, or delete income and expenses
          </p>
        </div>

        <Button
          onClick={() => setAddDialogOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow"
        >
          + Add Transaction
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-center gap-4 justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search merchant or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="h-4 w-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-500 uppercase">
                Type:
              </span>
              <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
                {["all", "debit", "credit"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className={`rounded-md px-3 py-1 text-xs font-semibold capitalize transition-all ${
                      typeFilter === t
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {t === "debit" ? "Expense" : t === "credit" ? "Income" : "All"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-lg">
            Ledger ({filteredTransactions.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading && transactions.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500 animate-pulse">
              Loading transactions...
            </div>
          ) : filteredTransactions.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Merchant / Payer</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((tx, idx) => {
                    const isCredit = (tx.type || "debit").toLowerCase() === "credit"
                    return (
                      <TableRow key={tx.id || idx} className="hover:bg-slate-50/80">
                        <TableCell className="text-slate-600 text-sm whitespace-nowrap">
                          {tx.date || "N/A"}
                        </TableCell>
                        <TableCell className="font-semibold text-slate-900">
                          {tx.merchant}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                            {tx.category}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                              isCredit
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {isCredit ? "Income" : "Expense"}
                          </span>
                        </TableCell>
                        <TableCell
                          className={`text-right font-bold text-base ${
                            isCredit ? "text-emerald-600" : "text-slate-900"
                          }`}
                        >
                          {isCredit ? "+" : "-"}₹{Number(tx.amount).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title="Edit Transaction"
                              onClick={() => handleOpenEdit(tx)}
                              className="text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title="Delete Transaction"
                              onClick={() => {
                                setSelectedTx(tx)
                                setDeleteConfirmOpen(true)
                              }}
                              className="text-slate-500 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-500 text-sm">
              No transactions match your criteria.
            </div>
          )}
        </CardContent>
      </Card>

      {/* ADD TRANSACTION DIALOG */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Transaction</DialogTitle>
          </DialogHeader>

          {/* Receipt OCR Box */}
          <div className="flex justify-between items-center bg-slate-50 p-3.5 border border-slate-200 rounded-xl mb-2">
            <div>
              <span className="text-xs font-semibold text-slate-700 block">
                Got a physical receipt?
              </span>
              <span className="text-[11px] text-slate-500">
                Scan with AI to auto-fill amount & merchant
              </span>
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleScanReceipt}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isScanning}
              className="text-xs font-medium"
            >
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              {isScanning ? "Scanning..." : "Scan Receipt"}
            </Button>
          </div>

          <form onSubmit={handleAddSubmit} className="space-y-4">
            {/* Type Switcher */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    type: "debit",
                    category: EXPENSE_CATEGORIES[0],
                  }))
                }
                className={`py-2 text-xs font-bold rounded-md transition-all ${
                  formData.type === "debit"
                    ? "bg-white text-red-600 shadow-sm"
                    : "text-slate-500"
                }`}
              >
                Expense (-)
              </button>
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    type: "credit",
                    category: INCOME_CATEGORIES[0],
                  }))
                }
                className={`py-2 text-xs font-bold rounded-md transition-all ${
                  formData.type === "credit"
                    ? "bg-white text-emerald-600 shadow-sm"
                    : "text-slate-500"
                }`}
              >
                Income (+)
              </button>
            </div>

            <div className="space-y-1.5">
              <Label>
                {formData.type === "credit" ? "Payer / Source" : "Merchant / Store"}
              </Label>
              <Input
                required
                value={formData.merchant}
                onChange={(e) =>
                  setFormData({ ...formData, merchant: e.target.value })
                }
                placeholder={
                  formData.type === "credit"
                    ? "e.g. Salary, Client, Gift"
                    : "e.g. Swiggy, Amazon, Metro"
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
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input
                  required
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Category</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
              >
                {currentAddCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <Button
              type="submit"
              className={`w-full text-white ${
                formData.type === "credit"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {formData.type === "credit" ? "Save Income" : "Save Expense"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT TRANSACTION DIALOG */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4">
            {/* Type Switcher */}
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
                {currentEditCategories.map((c) => (
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
