"use client"

import { useEffect, useState } from "react"
import {
  getSubscriptions,
  addSubscription,
  editSubscription,
  deleteSubscription,
  paySubscription,
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
import { Pencil, Trash2, CheckCircle2, CreditCard } from "lucide-react"

const SUBSCRIPTION_CATEGORIES = [
  "Entertainment",
  "Bills",
  "Software",
  "Utilities",
  "Fitness",
  "Shopping",
  "Other",
]

const BILLING_CYCLES = ["monthly", "yearly", "weekly", "quarterly"]

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [selectedSub, setSelectedSub] = useState<any | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    amount: "",
    category: "Entertainment",
    billing_cycle: "monthly",
    next_payment_date: new Date().toISOString().split("T")[0],
  })

  const [editFormData, setEditFormData] = useState({
    id: "",
    name: "",
    amount: "",
    category: "Entertainment",
    billing_cycle: "monthly",
    next_payment_date: "",
  })

  const fetchSubs = async () => {
    try {
      setLoading(true)
      const res = await getSubscriptions()
      const list = res.data || []
      list.sort((a: any, b: any) =>
        (a.next_payment_date || "").localeCompare(b.next_payment_date || "")
      )
      setSubscriptions(list)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubs()
  }, [])

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await addSubscription({
        name: formData.name.trim(),
        amount: parseFloat(formData.amount),
        category: formData.category,
        billing_cycle: formData.billing_cycle,
        next_payment_date: formData.next_payment_date,
      })
      setAddDialogOpen(false)
      setFormData({
        name: "",
        amount: "",
        category: "Entertainment",
        billing_cycle: "monthly",
        next_payment_date: new Date().toISOString().split("T")[0],
      })
      fetchSubs()
    } catch (e) {
      console.error(e)
      alert("Failed to add subscription.")
    }
  }

  const handleOpenEdit = (sub: any) => {
    setSelectedSub(sub)
    setEditFormData({
      id: sub.id?.toString() || "",
      name: sub.name || "",
      amount: sub.amount?.toString() || "",
      category: sub.category || "Entertainment",
      billing_cycle: sub.billing_cycle || "monthly",
      next_payment_date: sub.next_payment_date || "",
    })
    setEditDialogOpen(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await editSubscription({
        id: editFormData.id,
        name: editFormData.name.trim(),
        amount: parseFloat(editFormData.amount),
        category: editFormData.category,
        billing_cycle: editFormData.billing_cycle,
        next_payment_date: editFormData.next_payment_date,
      })
      setEditDialogOpen(false)
      fetchSubs()
    } catch (e) {
      console.error(e)
      alert("Failed to update subscription.")
    }
  }

  const handleDelete = async () => {
    if (!selectedSub?.id) return
    try {
      await deleteSubscription(selectedSub.id.toString())
      setDeleteConfirmOpen(false)
      setSelectedSub(null)
      fetchSubs()
    } catch (e) {
      console.error(e)
      alert("Failed to delete subscription.")
    }
  }

  const handlePay = async (id: string, name: string) => {
    try {
      await paySubscription(id)
      alert(`Paid ${name}! Expense recorded and next payment date updated.`)
      fetchSubs()
    } catch (e) {
      console.error(e)
      alert("Failed to pay subscription.")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Subscriptions & Bills
          </h1>
          <p className="text-sm text-slate-500">
            Track recurring expenses, renewal dates, and automate payments
          </p>
        </div>

        <Button
          onClick={() => setAddDialogOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow"
        >
          + Add Subscription
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-lg">
            Active Subscriptions ({subscriptions.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading && subscriptions.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500 animate-pulse">
              Loading subscriptions...
            </div>
          ) : subscriptions.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Service / Bill</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Billing Cycle</TableHead>
                    <TableHead>Next Due Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.map((sub, idx) => (
                    <TableRow key={sub.id || idx} className="hover:bg-slate-50/80">
                      <TableCell className="font-semibold text-slate-900 flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                          <CreditCard className="h-4 w-4" />
                        </div>
                        {sub.name}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                          {sub.category}
                        </span>
                      </TableCell>
                      <TableCell className="capitalize text-slate-600 text-sm">
                        {sub.billing_cycle}
                      </TableCell>
                      <TableCell className="text-slate-600 text-sm whitespace-nowrap">
                        {sub.next_payment_date || "Unknown"}
                      </TableCell>
                      <TableCell className="text-right font-bold text-red-600 text-base">
                        ₹{Number(sub.amount).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs text-teal-700 border-teal-300 hover:bg-teal-50"
                            onClick={() => handlePay(sub.id, sub.name)}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-teal-600" />
                            Mark Paid
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title="Edit"
                            onClick={() => handleOpenEdit(sub)}
                            className="text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title="Delete"
                            onClick={() => {
                              setSelectedSub(sub)
                              setDeleteConfirmOpen(true)
                            }}
                            className="text-slate-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-500 text-sm">
              No active subscriptions found. Click "+ Add Subscription" to start tracking.
            </div>
          )}
        </CardContent>
      </Card>

      {/* ADD SUBSCRIPTION DIALOG */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Subscription</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Service Name</Label>
              <Input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Netflix, Spotify, Gym, Rent, etc."
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
                <Label>Billing Cycle</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={formData.billing_cycle}
                  onChange={(e) =>
                    setFormData({ ...formData, billing_cycle: e.target.value })
                  }
                >
                  {BILLING_CYCLES.map((c) => (
                    <option key={c} value={c} className="capitalize">
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                >
                  {SUBSCRIPTION_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label>Next Due Date</Label>
                <Input
                  required
                  type="date"
                  value={formData.next_payment_date}
                  onChange={(e) =>
                    setFormData({ ...formData, next_payment_date: e.target.value })
                  }
                />
              </div>
            </div>

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              Save Subscription
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT SUBSCRIPTION DIALOG */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Subscription</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Service Name</Label>
              <Input
                required
                value={editFormData.name}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, name: e.target.value })
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
                <Label>Billing Cycle</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={editFormData.billing_cycle}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      billing_cycle: e.target.value,
                    })
                  }
                >
                  {BILLING_CYCLES.map((c) => (
                    <option key={c} value={c} className="capitalize">
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={editFormData.category}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, category: e.target.value })
                  }
                >
                  {SUBSCRIPTION_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label>Next Due Date</Label>
                <Input
                  required
                  type="date"
                  value={editFormData.next_payment_date}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      next_payment_date: e.target.value,
                    })
                  }
                />
              </div>
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
            <DialogTitle>Delete Subscription?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-slate-900">
              {selectedSub?.name}
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
