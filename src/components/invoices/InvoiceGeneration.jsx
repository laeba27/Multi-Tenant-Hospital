'use client'

import { useState, useEffect } from 'react'
import { generateInvoice, getHospitalDetails, getPatientDetails } from '@/actions/invoices'
import { useUserDetails } from '@/hooks/use-user-details'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Plus, Trash2, CreditCard, Wallet, ArrowLeft, Check } from 'lucide-react'

export function InvoiceGeneration({ hospitalId, patient, appointment, currentUser, onSuccess, onSkip, onBack }) {
  const { user: fetchedUser, hospital: userHospital, isLoading: userLoading } = useUserDetails()

  const [discountType, setDiscountType] = useState('none')
  const [discountValue, setDiscountValue] = useState('')
  const [notes, setNotes] = useState('')
  const [paymentEntries, setPaymentEntries] = useState([])
  const [newPayment, setNewPayment] = useState({ payment_method: 'cash', amount: '', reference_id: '' })
  const [isLoading, setIsLoading] = useState(false)
  const [hospitalDetails, setHospitalDetails] = useState(null)
  const [amountClickCount, setAmountClickCount] = useState(0)

  const consultationFee = parseFloat(appointment?.consultation_fee_snapshot || 0)
  const treatmentPrice = parseFloat(appointment?.treatmentPrice || 0)
  const subtotal = consultationFee + treatmentPrice
  const taxAmount = subtotal * 0.025

  let discountAmount = 0
  if (discountType === 'percentage') {
    discountAmount = (subtotal * parseFloat(discountValue || 0)) / 100
  } else if (discountType === 'fixed') {
    discountAmount = parseFloat(discountValue || 0)
  }

  const totalAmount = subtotal - discountAmount + taxAmount
  const totalPaid = paymentEntries.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
  const dueAmount = Math.max(0, totalAmount - totalPaid)

  // Load hospital details
  useEffect(() => {
    const loadHospitalDetails = async () => {
      const hospitalRegNo = appointment?.hospital_registration_no ||
                           userHospital?.registration_no ||
                           hospitalId

      if (hospitalRegNo) {
        try {
          const details = await getHospitalDetails(hospitalRegNo)
          setHospitalDetails(details)
        } catch (error) {
          console.error('Failed to load hospital details:', error)
        }
      }
    }
    loadHospitalDetails()
  }, [appointment?.hospital_registration_no, userHospital?.registration_no, hospitalId])

  const addPaymentEntry = () => {
    if (dueAmount <= 0) {
      toast.info('No remaining balance')
      return
    }
    if (!newPayment.amount || parseFloat(newPayment.amount) <= 0) {
      toast.error('Enter valid amount')
      return
    }
    if (parseFloat(newPayment.amount) > dueAmount) {
      toast.error(`Cannot exceed due ₹${dueAmount.toFixed(2)}`)
      return
    }
    setPaymentEntries([...paymentEntries, { ...newPayment, paid_at: new Date().toISOString() }])
    setNewPayment({ payment_method: 'cash', amount: '', reference_id: '' })
    setAmountClickCount(0)
  }

  const removePaymentEntry = (idx) => {
    setPaymentEntries(paymentEntries.filter((_, i) => i !== idx))
  }

  const handleAmountClick = () => {
    if (amountClickCount === 0) {
      setAmountClickCount(1)
    } else {
      setNewPayment({ ...newPayment, amount: dueAmount.toFixed(2) })
      setAmountClickCount(0)
    }
  }

  const handleGenerateInvoice = async () => {
    if (paymentEntries.length === 0) {
      toast.error('Add at least one payment')
      return
    }

    const hospitalRegistrationNo = appointment?.hospital_registration_no || userHospital?.registration_no
    setIsLoading(true)

    try {
      const hospitalDetails = await getHospitalDetails(hospitalRegistrationNo)
      const patientDetails = await getPatientDetails(patient.id)

      const data = {
        hospital_id: hospitalRegistrationNo,
        patient_id: patient.id,
        appointment_id: appointment?.id,
        subtotal,
        discount_type: discountType !== 'none' ? discountType : null,
        discount_value: parseFloat(discountValue) || 0,
        discount_amount: discountAmount,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        paid_amount: totalPaid,
        due_amount: dueAmount,
        payment_status: totalPaid >= totalAmount ? 'paid' : totalPaid > 0 ? 'partially_paid' : 'unpaid',
        notes: notes || null,
        payments: paymentEntries,
        hospital: hospitalDetails,
        patientDetails
      }

      const res = await generateInvoice(data, fetchedUser?.id)

      if (res.success) {
        toast.success('Invoice generated!')
        onSuccess({ ...res.invoice, payments: paymentEntries, hospital: hospitalDetails, patient: patientDetails })
      }
    } catch (e) {
      toast.error('Failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col bg-white" style={{ height: '600px' }}>
      {/* Header */}
      <div className="border-b px-4 py-3 bg-gray-50">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-gray-600" />
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Payment & Invoice</h2>
            <p className="text-xs text-gray-500">Step 2 of 3</p>
          </div>
        </div>
      </div>

      {/* Hospital Details Bar */}
      {hospitalDetails && (
        <div className="border-b px-4 py-2 bg-gray-50">
          <div className="flex items-center justify-between text-xs">
            <div>
              <span className="font-semibold text-gray-900">{hospitalDetails.name}</span>
              <span className="text-gray-500 mx-2">|</span>
              <span className="text-gray-600">{hospitalDetails.city}</span>
            </div>
            <span className="text-gray-600">{hospitalDetails.phone}</span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">

        {/* Summary */}
        <div className="border rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-1.5 pb-2 border-b">
            <Wallet className="w-3.5 h-3.5 text-gray-600" />
            <p className="text-xs font-semibold text-gray-700">BILLING SUMMARY</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {consultationFee > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Consultation Fee</span>
                <span className="font-medium">₹{consultationFee.toFixed(2)}</span>
              </div>
            )}
            {treatmentPrice > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Treatment Charges</span>
                <span className="font-medium">₹{treatmentPrice.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between col-span-2 pt-2 border-t">
              <span className="font-semibold">Subtotal</span>
              <span className="font-bold">₹{subtotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Tax + Discount */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Tax (2.5%)</Label>
            <Input value={taxAmount.toFixed(2)} disabled className="h-8 text-sm bg-gray-50" />
          </div>
          <div>
            <Label className="text-xs">Discount</Label>
            <div className="flex gap-2">
              <Select value={discountType} onValueChange={setDiscountType}>
                <SelectTrigger className="h-8 w-16 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="percentage">%</SelectItem>
                  <SelectItem value="fixed">₹</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                disabled={discountType === 'none'}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder="0.00"
                className="h-8 text-sm flex-1"
              />
            </div>
          </div>
        </div>

        {discountAmount > 0 && (
          <div className="flex justify-between items-center bg-red-50 border border-red-200 rounded px-3 py-1.5 text-xs">
            <span className="font-medium text-red-700">Discount ({discountType === 'percentage' ? `${discountValue}%` : 'Fixed'})</span>
            <span className="font-bold text-red-700">-₹{discountAmount.toFixed(2)}</span>
          </div>
        )}

        {/* Add Payment - Symmetrical Layout */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="text-xs">Add Payment</Label>
            {dueAmount > 0 && (
              <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                Due: ₹{dueAmount.toFixed(2)}
              </span>
            )}
          </div>

          <div className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-4">
              <Label className="text-[10px] text-gray-500">Method</Label>
              <Select value={newPayment.payment_method} onValueChange={(val) => setNewPayment({ ...newPayment, payment_method: val })}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="bank_transfer">Bank</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-3">
              <Label className="text-[10px] text-gray-500">Amount</Label>
              <Input
                type="number"
                placeholder={amountClickCount === 1 ? 'Click again' : (dueAmount > 0 ? `₹${dueAmount.toFixed(2)}` : '0.00')}
                value={newPayment.amount}
                max={dueAmount}
                onClick={handleAmountClick}
                onChange={(e) => {
                  const rawValue = e.target.value
                  if (rawValue === '') {
                    setNewPayment({ ...newPayment, amount: '' })
                    return
                  }
                  const parsed = parseFloat(rawValue)
                  const clamped = Number.isNaN(parsed) ? '' : Math.min(parsed, dueAmount)
                  setNewPayment({ ...newPayment, amount: clamped.toString() })
                }}
                className="h-8 text-sm"
              />
            </div>
            <div className="col-span-3">
              <Label className="text-[10px] text-gray-500">Reference</Label>
              <Input
                placeholder="Optional"
                value={newPayment.reference_id}
                onChange={(e) => setNewPayment({ ...newPayment, reference_id: e.target.value })}
                className="h-8 text-sm"
              />
            </div>
            <div className="col-span-2">
              <Button onClick={addPaymentEntry} className="w-full h-8 text-xs bg-gray-900 hover:bg-gray-800" disabled={dueAmount <= 0}>
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>

        {/* Payment Entries */}
        {paymentEntries.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-3 py-1.5 border-b">
              <p className="text-xs font-semibold text-gray-700">PAYMENT HISTORY</p>
            </div>
            <div className="divide-y max-h-28 overflow-y-auto">
              {paymentEntries.map((p, i) => (
                <div key={i} className="px-3 py-2 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Wallet className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-900 capitalize truncate">{p.payment_method.replace('_', ' ')}</p>
                        {p.reference_id && <p className="text-[10px] text-gray-500 truncate">{p.reference_id}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-gray-900">₹{parseFloat(p.amount || 0).toFixed(2)}</p>
                      <button onClick={() => removePaymentEntry(i)} className="text-red-500 hover:text-red-700">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-green-50 px-3 py-1.5 border-t">
              <div className="flex justify-between">
                <span className="text-xs font-semibold text-green-700">Total Paid</span>
                <span className="text-xs font-bold text-green-700">₹{totalPaid.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="space-y-1">
          <Label className="text-xs">Notes</Label>
          <Textarea
            placeholder="Additional notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={1}
            className="resize-none text-sm"
          />
        </div>

      </div>

      {/* Footer */}
      <div className="border-t px-4 py-3 bg-gray-50 space-y-2">

        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium">₹{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Tax</span>
            <span className="font-medium">₹{taxAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>Total</span>
            <span>₹{totalAmount.toFixed(2)}</span>
          </div>
        </div>

        {discountAmount > 0 && (
          <div className="flex justify-between text-red-600 text-xs">
            <span>Discount</span>
            <span className="font-medium">-₹{discountAmount.toFixed(2)}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 pt-1 border-t">
          <div className="text-center p-2 bg-green-50 rounded">
            <p className="text-[10px] text-green-600">Collected</p>
            <p className="text-sm font-bold text-green-700">₹{totalPaid.toFixed(2)}</p>
          </div>
          <div className={`text-center p-2 rounded ${dueAmount > 0 ? 'bg-orange-50' : 'bg-blue-50'}`}>
            <p className={`text-[10px] ${dueAmount > 0 ? 'text-orange-600' : 'text-blue-600'}`}>
              {dueAmount > 0 ? 'Due' : 'Complete'}
            </p>
            <p className={`text-sm font-bold ${dueAmount > 0 ? 'text-orange-700' : 'text-blue-700'}`}>
              ₹{dueAmount.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          {onBack && (
            <Button variant="outline" onClick={onBack} className="flex-1 h-8 text-xs">
              <ArrowLeft className="w-3 h-3 mr-1" />
              Back
            </Button>
          )}
          <Button variant="outline" onClick={onSkip} className="flex-1 h-8 text-xs">
            Cancel
          </Button>
          <Button
            onClick={handleGenerateInvoice}
            disabled={isLoading || paymentEntries.length === 0}
            className="flex-1 h-8 text-xs bg-gray-900 hover:bg-gray-800 flex items-center justify-center gap-1"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Processing...
              </>
            ) : (
              <>
                <Check className="w-3 h-3" />
                Generate
              </>
            )}
          </Button>
        </div>

      </div>
    </div>
  )
}
