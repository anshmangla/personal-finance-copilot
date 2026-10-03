"use client"

import { useEffect, useState } from "react"
import {
  getSubscriptions,
  addSubscription,
  editSubscription,
  deleteSubscription,
  paySubscription,
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
import { Pencil, Trash2, CheckCircle2, Plus, Calendar as CalIcon, RefreshCw, Smartphone, Tv, Zap, ShoppingBag, CreditCard, MoreHorizontal } from "lucide-react"
import { motion } from "framer-motion"

const SUBSCRIPTION_CATEGORIES = ["Entertainment", "Bills", "Software", "Utilities", "Fitness", "Shopping", "Other"]
const BILLING_CYCLES = ["monthly", "yearly", "weekly", "quarterly"]

const CATEGORY_ICONS: Record<string, any> = {
  Entertainment: Tv,
  Bills: Zap,
  Software: Smartphone,
  Utilities: Zap,
  Shopping: ShoppingBag,
  Other: MoreHorizontal
}

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [selectedSub, setSelectedSub] = useState<any | null>(null)

  const [formData, setFormData] = useState({
    name: "", amount: "", category: "Entertainment", billing_cycle: "monthly",
    next_payment_date: new Date().toISOString().split("T")[0],
  })

  const [editFormData, setEditFormData] = useState({
    id: "", name: "", amount: "", category: "Entertainment", billing_cycle: "monthly", next_payment_date: "",
  })

  const fetchSubs = async () => {
    try {
      setLoading(true)
      const res = await getSubscriptions()
      const list = res.data || []
      list.sort((a: any, b: any) => (a.next_payment_date || "").localeCompare(b.next_payment_date || ""))
      setSubscriptions(list)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  useEffect(() => { fetchSubs() }, [])

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await addSubscription({
        name: formData.name.trim(), amount: parseFloat(formData.amount),
        category: formData.category, billing_cycle: formData.billing_cycle, next_payment_date: formData.next_payment_date,
      })
      setAddDialogOpen(false)
      setFormData({ name: "", amount: "", category: "Entertainment", billing_cycle: "monthly", next_payment_date: new Date().toISOString().split("T")[0] })
      fetchSubs()
    } catch (e) { console.error(e); alert("Failed to add subscription.") }
  }

  const handleOpenEdit = (sub: any) => {
    setSelectedSub(sub)
    setEditFormData({
      id: sub.id?.toString() || "", name: sub.name || "", amount: sub.amount?.toString() || "",
      category: sub.category || "Entertainment", billing_cycle: sub.billing_cycle || "monthly", next_payment_date: sub.next_payment_date || "",
    })
    setEditDialogOpen(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await editSubscription({
        id: editFormData.id, name: editFormData.name.trim(), amount: parseFloat(editFormData.amount),
        category: editFormData.category, billing_cycle: editFormData.billing_cycle, next_payment_date: editFormData.next_payment_date,
      })
      setEditDialogOpen(false)
      fetchSubs()
    } catch (e) { console.error(e); alert("Failed to edit subscription.") }
  }

  const handleDelete = async () => {
    if (!selectedSub?.id) return
    try {
      await deleteSubscription(selectedSub.id.toString())
      setDeleteConfirmOpen(false)
      setSelectedSub(null)
      fetchSubs()
    } catch (e) { console.error(e); alert("Failed to delete subscription.") }
  }

  const handlePay = async (id: string, name: string) => {
    try {
      await paySubscription(id)
      alert(`Paid ${name}! Expense recorded and next payment date updated.`)
      fetchSubs()
    } catch (e) { console.error(e); alert("Failed to pay subscription.") }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Subscriptions</h1>
          <p className="text-muted-foreground mt-1">Track recurring expenses, renewal dates, and automate payments.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchSubs} className="gap-2 rounded-full shadow-sm">
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button onClick={() => setAddDialogOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-md">
            <Plus className="h-4 w-4 mr-1.5" />
            Add Subscription
          </Button>
        </div>
      </div>

      {loading && subscriptions.length === 0 ? (
        <div className="flex h-[40vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>
      ) : subscriptions.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-16 text-center shadow-sm">
          <div className="bg-indigo-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CreditCard className="h-10 w-10 text-indigo-400" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">No active subscriptions</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">Keep track of your Netflix, Spotify, or gym memberships by adding them here.</p>
          <Button onClick={() => setAddDialogOpen(true)} className="bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl px-8">
            Add your first bill
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subscriptions.map((sub, idx) => {
            const today = new Date().toISOString().split("T")[0]
            const isOverdue = sub.next_payment_date < today
            const isDueSoon = sub.next_payment_date === today || (new Date(sub.next_payment_date).getTime() - new Date(today).getTime()) / (1000 * 3600 * 24) <= 7
            
            const IconComponent = CATEGORY_ICONS[sub.category] || CATEGORY_ICONS["Other"]

            return (
              <motion.div 
                whileHover={{ y: -4 }}
                key={sub.id || idx}
                className={`relative flex flex-col justify-between p-5 rounded-2xl border bg-card shadow-sm transition-all overflow-hidden ${isOverdue ? 'border-rose-300' : isDueSoon ? 'border-amber-300' : 'border-border hover:border-indigo-300 hover:shadow-md'}`}
              >
                {/* Glow effect for due soon */}
                {(isOverdue || isDueSoon) && (
                  <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2 ${isOverdue ? 'bg-rose-500/20' : 'bg-amber-500/20'}`} />
                )}

                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className={`p-3 rounded-xl ${isOverdue ? 'bg-rose-100 text-rose-600' : isDueSoon ? 'bg-amber-100 text-amber-600' : 'bg-indigo-50 text-indigo-600'}`}>
                      <IconComponent className="h-6 w-6" />
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => handleOpenEdit(sub)} className="h-8 w-8 rounded-full text-muted-foreground hover:text-blue-600 hover:bg-blue-50">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => { setSelectedSub(sub); setDeleteConfirmOpen(true); }} className="h-8 w-8 rounded-full text-muted-foreground hover:text-red-600 hover:bg-red-50">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-extrabold text-foreground mb-1">{sub.name}</h3>
                  <div className="flex items-center gap-2 mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <span className="bg-muted px-2 py-1 rounded-md">{sub.category}</span>
                    <span className="bg-muted px-2 py-1 rounded-md">{sub.billing_cycle}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex items-end justify-between mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                        <CalIcon className="h-3.5 w-3.5" /> Next Payment
                      </p>
                      <p className={`text-sm font-bold ${isOverdue ? 'text-rose-600' : isDueSoon ? 'text-amber-600' : 'text-foreground'}`}>
                        {sub.next_payment_date}
                        {isOverdue && " (Overdue)"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-foreground">₹{Number(sub.amount).toFixed(2)}</p>
                    </div>
                  </div>

                  <Button 
                    className={`w-full font-bold rounded-xl ${isOverdue || isDueSoon ? 'bg-teal-600 hover:bg-teal-700 text-white' : 'bg-muted hover:bg-slate-200 text-foreground shadow-none'}`} 
                    onClick={() => handlePay(sub.id, sub.name)}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Mark as Paid
                  </Button>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* ADD MODAL */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader><DialogTitle className="text-xl font-bold">Add Subscription</DialogTitle></DialogHeader>
          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Service Name</Label><Input required className="rounded-xl" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Amount (₹)</Label><Input required type="number" step="0.01" className="rounded-xl" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} /></div>
              <div className="space-y-2"><Label>Next Due Date</Label><Input required type="date" className="rounded-xl" value={formData.next_payment_date} onChange={(e) => setFormData({ ...formData, next_payment_date: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Category</Label><select className="flex h-10 w-full rounded-xl border border-input bg-transparent px-3 py-1 text-sm" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>{SUBSCRIPTION_CATEGORIES.map((c) => (<option key={c} value={c}>{c}</option>))}</select></div>
              <div className="space-y-2"><Label>Cycle</Label><select className="flex h-10 w-full rounded-xl border border-input bg-transparent px-3 py-1 text-sm" value={formData.billing_cycle} onChange={(e) => setFormData({ ...formData, billing_cycle: e.target.value })}>{BILLING_CYCLES.map((c) => (<option key={c} value={c}>{c}</option>))}</select></div>
            </div>
            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl">Save Subscription</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT MODAL */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader><DialogTitle className="text-xl font-bold">Edit Subscription</DialogTitle></DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Service Name</Label><Input required className="rounded-xl" value={editFormData.name} onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Amount (₹)</Label><Input required type="number" step="0.01" className="rounded-xl" value={editFormData.amount} onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })} /></div>
              <div className="space-y-2"><Label>Next Due Date</Label><Input required type="date" className="rounded-xl" value={editFormData.next_payment_date} onChange={(e) => setEditFormData({ ...editFormData, next_payment_date: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Category</Label><select className="flex h-10 w-full rounded-xl border border-input bg-transparent px-3 py-1 text-sm" value={editFormData.category} onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}>{SUBSCRIPTION_CATEGORIES.map((c) => (<option key={c} value={c}>{c}</option>))}</select></div>
              <div className="space-y-2"><Label>Cycle</Label><select className="flex h-10 w-full rounded-xl border border-input bg-transparent px-3 py-1 text-sm" value={editFormData.billing_cycle} onChange={(e) => setEditFormData({ ...editFormData, billing_cycle: e.target.value })}>{BILLING_CYCLES.map((c) => (<option key={c} value={c}>{c}</option>))}</select></div>
            </div>
            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl">Update Subscription</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRM */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader><DialogTitle className="text-xl font-bold">Delete Subscription?</DialogTitle></DialogHeader>
          <div className="p-4 bg-red-50 rounded-xl border border-red-100 my-2">
            <p className="text-sm text-red-800">Stop tracking <span className="font-bold">{selectedSub?.name}</span>? This does not cancel your actual subscription with the merchant.</p>
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
