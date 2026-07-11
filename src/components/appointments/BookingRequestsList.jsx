'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  getPendingBookingRequests,
  confirmPatientAppointment,
  rejectPatientAppointment,
} from '@/actions/appointments'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Calendar, Clock, User, Stethoscope, Inbox, CheckCircle2, XCircle } from 'lucide-react'

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '-'

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`

/**
 * The reception/hospital queue of appointments patients booked for themselves
 * and nobody has reviewed yet. Confirming turns the request into a real
 * scheduled appointment and notifies the patient; declining tells them why.
 */
export function BookingRequestsList({ hospitalId, onChange }) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [mode, setMode] = useState(null) // 'confirm' | 'reject'
  const [submitting, setSubmitting] = useState(false)

  // Confirm-dialog form
  const [amountDue, setAmountDue] = useState('0')
  const [collectPayment, setCollectPayment] = useState(false)
  const [paidAmount, setPaidAmount] = useState('0')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [rejectReason, setRejectReason] = useState('')

  const load = useCallback(async () => {
    if (!hospitalId) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const data = await getPendingBookingRequests(hospitalId)
      setRequests(data || [])
    } catch (error) {
      console.error('Error loading booking requests:', error)
      toast.error('Could not load booking requests')
      setRequests([])
    } finally {
      setLoading(false)
    }
  }, [hospitalId])

  useEffect(() => {
    load()
  }, [load])

  const openConfirm = (req) => {
    setSelected(req)
    setMode('confirm')
    setAmountDue(String(req.amount_due ?? 0))
    setCollectPayment(false)
    setPaidAmount('0')
    setPaymentMethod('cash')
  }

  const openReject = (req) => {
    setSelected(req)
    setMode('reject')
    setRejectReason('')
  }

  const closeDialog = () => {
    setSelected(null)
    setMode(null)
  }

  const handleConfirm = async () => {
    if (!selected) return
    setSubmitting(true)
    try {
      const res = await confirmPatientAppointment({
        appointmentId: selected.id,
        amountDue: Number(amountDue) || 0,
        paidAmount: collectPayment ? Number(paidAmount) || 0 : 0,
        paymentMethod,
      })
      if (!res.success) {
        toast.error(res.error || 'Could not confirm the appointment')
        return
      }
      toast.success(res.message || 'Appointment confirmed')
      closeDialog()
      await load()
      onChange?.()
    } catch (error) {
      console.error(error)
      toast.error('Could not confirm the appointment')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!selected) return
    setSubmitting(true)
    try {
      const res = await rejectPatientAppointment({
        appointmentId: selected.id,
        reason: rejectReason,
      })
      if (!res.success) {
        toast.error(res.error || 'Could not decline the request')
        return
      }
      toast.success(res.message || 'Request declined')
      closeDialog()
      await load()
      onChange?.()
    } catch (error) {
      console.error(error)
      toast.error('Could not decline the request')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Booking Requests</CardTitle>
          <CardDescription>Loading requests...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Booking Requests
            {requests.length > 0 && (
              <Badge className="bg-amber-100 text-amber-800">{requests.length} pending</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Appointments patients booked from their own portal. Review and confirm them — the
            patient is notified either way. Payment is collected at the counter.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-12">
              <Inbox className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No pending requests</p>
              <p className="text-sm text-gray-400 mt-1">
                Appointments booked by patients will appear here for confirmation.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request ID</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Doctor / Dept</TableHead>
                    <TableHead>Requested For</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((req) => {
                    const p = req.patients?.profiles
                    return (
                      <TableRow key={req.id}>
                        <TableCell className="font-medium">{req.id}</TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <div>
                              <div>{p?.name || 'Unknown'}</div>
                              <div className="text-xs text-gray-500">
                                {req.patients?.registration_no || p?.registration_no || '-'}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="text-sm text-gray-600">
                          <div>{p?.mobile || '-'}</div>
                          <div className="text-xs text-gray-400">{p?.email || '-'}</div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Stethoscope className="h-4 w-4 text-blue-400" />
                            <div>
                              <div>{req.doctor?.name || 'Unknown'}</div>
                              <div className="text-xs text-gray-500">
                                {req.departments?.name || '-'}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm">
                            <Calendar className="h-3.5 w-3.5 text-gray-400" />
                            {fmtDate(req.appointment_date)}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                            <Clock className="h-3.5 w-3.5 text-gray-400" />
                            {req.appointment_slot}
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge className="bg-red-100 text-red-800">Unpaid</Badge>
                          <div className="text-xs text-gray-600 mt-1">{money(req.amount_due)}</div>
                        </TableCell>

                        <TableCell>
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" onClick={() => openConfirm(req)}>
                              View &amp; Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => openReject(req)}
                            >
                              Decline
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm */}
      {selected && mode === 'confirm' && (
        <Dialog open onOpenChange={closeDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Approve Booking Request</DialogTitle>
              <DialogDescription>
                {selected.id} · requested by the patient on {fmtDate(selected.created_at)}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 mt-2">
              <div className="border rounded-lg p-4 bg-gray-50 grid grid-cols-2 gap-4 text-sm">
                <Field label="Patient" value={selected.patients?.profiles?.name} />
                <Field
                  label="Patient Reg. No."
                  value={selected.patients?.registration_no || selected.patients?.profiles?.registration_no}
                />
                <Field label="Mobile" value={selected.patients?.profiles?.mobile} />
                <Field label="Email" value={selected.patients?.profiles?.email} />
                <Field label="Doctor" value={selected.doctor?.name} />
                <Field label="Department" value={selected.departments?.name} />
                <Field label="Date" value={fmtDate(selected.appointment_date)} />
                <Field label="Time" value={selected.appointment_slot} />
                <Field label="Type" value={selected.appointment_type} capitalize />
                <Field label="Reason" value={selected.reason} />
              </div>

              {selected.treatment_details?.length > 0 && (
                <div className="border rounded-lg p-4">
                  <p className="text-xs uppercase font-semibold text-gray-600 mb-2">
                    Requested Treatments
                  </p>
                  <ul className="space-y-1 text-sm">
                    {selected.treatment_details.map((t, i) => (
                      <li key={t.id || i} className="flex justify-between">
                        <span>{t.name}</span>
                        <span className="text-gray-600">{money(t.price)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="border rounded-lg p-4 space-y-4">
                <div>
                  <Label htmlFor="amountDue">Amount Due (₹)</Label>
                  <Input
                    id="amountDue"
                    type="number"
                    min="0"
                    value={amountDue}
                    onChange={(e) => setAmountDue(e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Pre-filled from the doctor&apos;s consultation fee and treatment prices. Adjust
                    if needed.
                  </p>
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={collectPayment}
                    onChange={(e) => setCollectPayment(e.target.checked)}
                    className="h-4 w-4"
                  />
                  Record a payment now (patient paid at the counter)
                </label>

                {collectPayment && (
                  <div className="grid grid-cols-2 gap-4 pt-1">
                    <div>
                      <Label htmlFor="paidAmount">Amount Paid (₹)</Label>
                      <Input
                        id="paidAmount"
                        type="number"
                        min="0"
                        value={paidAmount}
                        onChange={(e) => setPaidAmount(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="paymentMethod">Method</Label>
                      <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                        <SelectTrigger id="paymentMethod" className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {['cash', 'upi', 'card', 'cheque', 'bank_transfer'].map((m) => (
                            <SelectItem key={m} value={m} className="capitalize">
                              {m.replace('_', ' ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
              <Button variant="outline" onClick={closeDialog} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handleConfirm} disabled={submitting}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {submitting
                  ? 'Confirming...'
                  : collectPayment
                    ? 'Confirm & Collect Payment'
                    : 'Confirm Appointment'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Decline */}
      {selected && mode === 'reject' && (
        <Dialog open onOpenChange={closeDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Decline Booking Request</DialogTitle>
              <DialogDescription>
                {selected.patients?.profiles?.name} will be notified with the reason you give here.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-2">
              <Label htmlFor="rejectReason">Reason</Label>
              <Textarea
                id="rejectReason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. The doctor is unavailable on that date. Please pick another slot."
                rows={3}
                className="mt-1"
              />
            </div>

            <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
              <Button variant="outline" onClick={closeDialog} disabled={submitting}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleReject} disabled={submitting}>
                <XCircle className="mr-2 h-4 w-4" />
                {submitting ? 'Declining...' : 'Decline Request'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

function Field({ label, value, capitalize = false }) {
  return (
    <div>
      <p className="text-xs text-gray-600 uppercase font-semibold">{label}</p>
      <p className={`font-medium text-sm mt-1 ${capitalize ? 'capitalize' : ''}`}>{value || '-'}</p>
    </div>
  )
}
