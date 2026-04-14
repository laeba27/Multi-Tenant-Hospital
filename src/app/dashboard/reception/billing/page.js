'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/hooks/use-user'
import { getStaffByUserId } from '@/actions/staff-details'
import { getHospitalInvoicesWithDetails, getInvoiceStats, createInvoice, recordPayment } from '@/actions/invoices'
import { InvoiceView } from '@/components/invoices/InvoiceView'
import { toast } from 'sonner'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileText,
  Calendar,
  User,
  AlertCircle,
  CheckCircle,
  Clock,
  Plus,
  Search,
} from 'lucide-react'

export default function ReceptionBillingPage() {
  const { user, loading: userLoading } = useUser()
  const [staffDetails, setStaffDetails] = useState(null)
  const [loadingStaff, setLoadingStaff] = useState(true)
  const [invoices, setInvoices] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [selectedInvoiceForView, setSelectedInvoiceForView] = useState(null)
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // New invoice form state
  const [newInvoice, setNewInvoice] = useState({
    patient_id: '',
    total_amount: '',
    paid_amount: '0',
    payment_method: 'cash',
    notes: '',
  })

  // Payment form state
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_method: 'cash',
    reference_id: '',
  })

  useEffect(() => {
    if (user?.id && user?.profile?.role === 'receptionist') {
      fetchStaffDetails()
    }
  }, [user])

  useEffect(() => {
    if (staffDetails?.hospitals?.registration_no) {
      fetchInvoices()
      fetchStats()
    }
  }, [staffDetails, paymentStatusFilter])

  const fetchStaffDetails = async () => {
    setLoadingStaff(true)
    try {
      const result = await getStaffByUserId(user.id)
      if (result.error) {
        toast.error('Failed to load staff details')
      } else {
        setStaffDetails(result.data)
      }
    } catch (error) {
      console.error('Error loading staff details:', error)
      toast.error('Error loading staff details')
    } finally {
      setLoadingStaff(false)
    }
  }

  const fetchInvoices = async () => {
    setLoading(true)
    try {
      const filters = {}
      if (paymentStatusFilter !== 'all') {
        filters.payment_status = paymentStatusFilter
      }

      const result = await getHospitalInvoicesWithDetails(
        staffDetails.hospitals.registration_no,
        filters
      )

      if (result.error) {
        toast.error('Failed to load invoices')
      } else {
        setInvoices(result.data || [])
      }
    } catch (error) {
      console.error('Error loading invoices:', error)
      toast.error('Error loading invoices')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const result = await getInvoiceStats(staffDetails.hospitals.registration_no)
      if (result.error) {
        toast.error('Failed to load stats')
      } else {
        setStats(result.data)
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const handleCreateInvoice = async () => {
    try {
      const invoiceData = {
        hospital_id: staffDetails.hospitals.registration_no,
        patient_id: newInvoice.patient_id,
        total_amount: parseFloat(newInvoice.total_amount),
        paid_amount: parseFloat(newInvoice.paid_amount),
        due_amount: parseFloat(newInvoice.total_amount) - parseFloat(newInvoice.paid_amount),
        payment_status:
          parseFloat(newInvoice.paid_amount) >= parseFloat(newInvoice.total_amount)
            ? 'paid'
            : parseFloat(newInvoice.paid_amount) > 0
            ? 'partially_paid'
            : 'unpaid',
        payment_method:
          parseFloat(newInvoice.paid_amount) > 0 ? newInvoice.payment_method : null,
        notes: newInvoice.notes,
      }

      const result = await createInvoice(invoiceData, user.id)

      if (result.error) {
        toast.error('Failed to create invoice')
      } else {
        toast.success('Invoice created successfully')
        setShowCreateDialog(false)
        setNewInvoice({
          patient_id: '',
          total_amount: '',
          paid_amount: '0',
          payment_method: 'cash',
          notes: '',
        })
        fetchInvoices()
        fetchStats()
      }
    } catch (error) {
      console.error('Error creating invoice:', error)
      toast.error('Error creating invoice')
    }
  }

  const handleRecordPayment = async () => {
    try {
      const paymentData = {
        invoice_id: selectedInvoice.id,
        hospital_id: staffDetails.hospitals.registration_no,
        payment_method: paymentForm.payment_method,
        amount: parseFloat(paymentForm.amount),
        reference_id: paymentForm.reference_id || null,
      }

      const result = await recordPayment(
        selectedInvoice.id,
        paymentData,
        user.id
      )

      if (result.error) {
        toast.error('Failed to record payment')
      } else {
        toast.success('Payment recorded successfully')
        setShowPaymentDialog(false)
        setPaymentForm({ amount: '', payment_method: 'cash', reference_id: '' })
        fetchInvoices()
        fetchStats()
      }
    } catch (error) {
      console.error('Error recording payment:', error)
      toast.error('Error recording payment')
    }
  }

  const getPaymentStatusBadge = (status) => {
    const variants = {
      paid: 'bg-green-100 text-green-800',
      partially_paid: 'bg-yellow-100 text-yellow-800',
      unpaid: 'bg-red-100 text-red-800',
    }
    return (
      <Badge className={variants[status] || variants.unpaid}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    )
  }

  const filteredInvoices = invoices.filter((invoice) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      invoice.id?.toLowerCase().includes(query) ||
      invoice.patients?.profile?.name?.toLowerCase().includes(query) ||
      invoice.patients?.profile?.mobile?.includes(query)
    )
  })

  if (userLoading || loadingStaff) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Billing & Payments</h1>
            <p className="text-gray-600 mt-2">
              Manage invoices, payments, and financial transactions
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} className="bg-indigo-600">
            <Plus className="mr-2 h-4 w-4" />
            New Invoice
          </Button>
        </div>

        {/* Hospital Info */}
        {/* {staffDetails?.hospitals && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <span className="font-medium">Hospital:</span> {staffDetails.hospitals.name}
            </p>
          </div>
        )} */}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Paid</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.paid}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Partially Paid</CardTitle>
                <Clock className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{stats.partially_paid}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unpaid</CardTitle>
                <AlertCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.unpaid}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Due</CardTitle>
                <DollarSign className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">₹{stats.totalDue.toLocaleString()}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Invoice History</CardTitle>
              <div className="flex gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by invoice ID, patient name..."
                    className="pl-10 w-64"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="partially_paid">Partially Paid</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No invoices found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Invoice ID</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Patient</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Total</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Paid</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Due</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map((invoice) => (
                      <tr key={invoice.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-mono text-sm">{invoice.id}</td>
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-medium">{invoice.patients?.profile?.name || 'N/A'}</div>
                            <div className="text-sm text-gray-500">{invoice.patients?.profile?.mobile || ''}</div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {new Date(invoice.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 font-medium">₹{invoice.total_amount?.toLocaleString()}</td>
                        <td className="py-3 px-4 text-green-600">₹{invoice.paid_amount?.toLocaleString()}</td>
                        <td className="py-3 px-4 text-red-600 font-medium">
                          ₹{invoice.due_amount?.toLocaleString()}
                        </td>
                        <td className="py-3 px-4">{getPaymentStatusBadge(invoice.payment_status)}</td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedInvoiceForView(invoice)
                              }}
                            >
                              View
                            </Button>
                            {invoice.due_amount > 0 && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedInvoice(invoice)
                                  setShowPaymentDialog(true)
                                }}
                              >
                                Clear Due
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Invoice Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Invoice</DialogTitle>
            <DialogDescription>Create a new invoice for billing</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="patient_id">Patient ID</Label>
              <Input
                id="patient_id"
                placeholder="HOSP-PAT-XXXXX"
                value={newInvoice.patient_id}
                onChange={(e) => setNewInvoice({ ...newInvoice, patient_id: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="total_amount">Total Amount (₹)</Label>
              <Input
                id="total_amount"
                type="number"
                placeholder="0.00"
                value={newInvoice.total_amount}
                onChange={(e) => setNewInvoice({ ...newInvoice, total_amount: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="paid_amount">Paid Amount (₹)</Label>
              <Input
                id="paid_amount"
                type="number"
                placeholder="0.00"
                value={newInvoice.paid_amount}
                onChange={(e) => setNewInvoice({ ...newInvoice, paid_amount: e.target.value })}
              />
            </div>
            {parseFloat(newInvoice.paid_amount) > 0 && (
              <div>
                <Label htmlFor="payment_method">Payment Method</Label>
                <Select
                  value={newInvoice.payment_method}
                  onValueChange={(value) => setNewInvoice({ ...newInvoice, payment_method: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="net_banking">Net Banking</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes..."
                value={newInvoice.notes}
                onChange={(e) => setNewInvoice({ ...newInvoice, notes: e.target.value })}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateInvoice} className="bg-indigo-600">
                Create Invoice
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Invoice: {selectedInvoice?.id} | Due: ₹{selectedInvoice?.due_amount?.toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="payment_amount">Payment Amount (₹)</Label>
              <Input
                id="payment_amount"
                type="number"
                placeholder={selectedInvoice?.due_amount?.toString()}
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="payment_method">Payment Method</Label>
              <Select
                value={paymentForm.payment_method}
                onValueChange={(value) => setPaymentForm({ ...paymentForm, payment_method: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="net_banking">Net Banking</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="reference_id">Reference ID (Optional)</Label>
              <Input
                id="reference_id"
                placeholder="Transaction reference..."
                value={paymentForm.reference_id}
                onChange={(e) => setPaymentForm({ ...paymentForm, reference_id: e.target.value })}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleRecordPayment} className="bg-green-600">
                Record Payment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invoice View Dialog */}
      {selectedInvoiceForView && (
        <Dialog open={!!selectedInvoiceForView} onOpenChange={() => setSelectedInvoiceForView(null)}>
          <DialogContent className="max-w-7xl w-full max-h-[95vh] p-0 overflow-y-auto">
            <DialogHeader className="px-6 pt-6 pb-2">
              <DialogTitle>Invoice Details - {selectedInvoiceForView.id}</DialogTitle>
            </DialogHeader>
            <div className="px-6 pb-6">
              <InvoiceView
                invoice={selectedInvoiceForView}
                hospital={staffDetails?.hospitals}
                patient={selectedInvoiceForView.patients}
                onClose={() => setSelectedInvoiceForView(null)}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </DashboardLayout>
  )
}
