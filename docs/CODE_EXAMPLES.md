# Code Examples: Appointment Booking & Billing

## Example 1: Basic Booking with Full Payment

```jsx
import { BookAppointmentMultiStep } from '@/components/BookAppointmentMultiStep'
import { generateInvoice } from '@/actions/invoices'

export function PatientDashboard({ patientId, hospitalId }) {
  const handleBookingSuccess = async (appointmentData) => {
    console.log('Appointment booked:', appointmentData)
    
    // Generate invoice with the booking data
    try {
      const invoiceResult = await generateInvoice({
        hospital_id: appointmentData.hospital_id,
        patient_id: appointmentData.patient_id,
        appointment_id: appointmentData.id,
        subtotal: appointmentData.subtotal,
        discount_type: appointmentData.discount_type || 'none',
        discount_value: appointmentData.discount_value || 0,
        tax_amount: 0,
        payments: appointmentData.payments
      }, currentUser.id)
      
      console.log('Invoice created:', invoiceResult.invoice)
      
      // Show success message
      toast.success('Appointment booked! Invoice has been generated.')
    } catch (error) {
      console.error('Failed to generate invoice:', error)
      toast.error('Booking succeeded but invoice generation failed')
    }
  }

  return (
    <BookAppointmentMultiStep 
      hospitalId={hospitalId}
      patientId={patientId}
      currentUser={currentUser}
      onSuccess={handleBookingSuccess}
      onSkip={() => console.log('Booking skipped')}
    />
  )
}
```

## Example 2: Invoice Retrieval with Payment History

```jsx
import { getInvoiceWithPayments } from '@/actions/invoices'

export async function InvoiceDetailPage({ invoiceId }) {
  const { invoice, payments } = await getInvoiceWithPayments(invoiceId)
  
  return (
    <div className="space-y-4">
      <div className="bg-gray-50 p-4 rounded-lg">
        <h2 className="font-semibold mb-3">Invoice Details</h2>
        
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-gray-500">Subtotal</p>
            <p className="font-medium">₹{invoice.subtotal}</p>
          </div>
          
          {invoice.discount_amount > 0 && (
            <div>
              <p className="text-gray-500">Discount ({invoice.discount_type})</p>
              <p className="font-medium text-red-600">-₹{invoice.discount_amount}</p>
            </div>
          )}
          
          <div>
            <p className="text-gray-500">Total Amount</p>
            <p className="font-bold text-lg">₹{invoice.total_amount}</p>
          </div>
          
          <div>
            <p className="text-gray-500">Paid Amount</p>
            <p className="font-medium">₹{invoice.paid_amount}</p>
          </div>
          
          <div>
            <p className="text-gray-500">Due Amount</p>
            <p className={`font-medium ${invoice.due_amount > 0 ? 'text-orange-600' : 'text-green-600'}`}>
              ₹{invoice.due_amount}
            </p>
          </div>
          
          <div>
            <p className="text-gray-500">Payment Status</p>
            <p className={`font-medium capitalize ${
              invoice.payment_status === 'paid' ? 'text-green-600' :
              invoice.payment_status === 'partially_paid' ? 'text-orange-600' :
              'text-red-600'
            }`}>
              {invoice.payment_status}
            </p>
          </div>
        </div>
      </div>
      
      {payments.length > 0 && (
        <div className="bg-white border rounded-lg p-4">
          <h3 className="font-semibold mb-3">Payment History</h3>
          <div className="space-y-2">
            {payments.map((payment) => (
              <div key={payment.id} className="flex justify-between items-center border-t pt-2">
                <div>
                  <p className="font-medium capitalize">{payment.payment_method}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(payment.paid_at).toLocaleDateString()}
                  </p>
                  {payment.reference_id && (
                    <p className="text-xs text-gray-400">Ref: {payment.reference_id}</p>
                  )}
                </div>
                <p className="font-semibold">₹{payment.amount}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

## Example 3: Add Partial Payment Later

```jsx
import { getInvoiceWithPayments, recordPayment } from '@/actions/invoices'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function InvoicePaymentForm({ invoiceId, currentUserId }) {
  const [invoiceData, setInvoiceData] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [amount, setAmount] = useState('')
  const [referenceId, setReferenceId] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadInvoice()
  }, [invoiceId])

  const loadInvoice = async () => {
    try {
      const data = await getInvoiceWithPayments(invoiceId)
      setInvoiceData(data)
    } catch (error) {
      toast.error('Failed to load invoice')
    }
  }

  const handleAddPayment = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Enter a valid amount')
      return
    }

    if (parseFloat(amount) > parseFloat(invoiceData.invoice.due_amount)) {
      toast.error('Amount exceeds due balance')
      return
    }

    if (paymentMethod !== 'cash' && !referenceId) {
      toast.error('Reference ID required for digital payments')
      return
    }

    setIsLoading(true)
    try {
      const result = await recordPayment(
        invoiceId,
        {
          method: paymentMethod,
          amount: parseFloat(amount),
          referenceId: paymentMethod !== 'cash' ? referenceId : null
        },
        currentUserId
      )

      // Reload invoice
      await loadInvoice()
      
      // Reset form
      setAmount('')
      setReferenceId('')
      
      toast.success('Payment recorded successfully!')
      
      if (result.invoice.payment_status === 'paid') {
        toast.success('Invoice paid in full!')
      }
    } catch (error) {
      console.error('Error recording payment:', error)
      toast.error('Failed to record payment')
    } finally {
      setIsLoading(false)
    }
  }

  if (!invoiceData) return <div>Loading...</div>

  const { invoice, payments } = invoiceData

  return (
    <div className="space-y-4 max-w-md">
      {/* Invoice Summary */}
      <div className={`p-4 rounded-lg border ${
        invoice.payment_status === 'paid' 
          ? 'bg-green-50 border-green-200' 
          : 'bg-orange-50 border-orange-200'
      }`}>
        <p className="text-sm text-gray-600">Total Amount: <span className="font-bold">₹{invoice.total_amount}</span></p>
        <p className="text-sm text-gray-600">Paid: <span className="font-bold">₹{invoice.paid_amount}</span></p>
        <p className={`text-sm font-bold ${invoice.due_amount > 0 ? 'text-orange-600' : 'text-green-600'}`}>
          Due: ₹{invoice.due_amount}
        </p>
      </div>

      {invoice.payment_status !== 'paid' && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Payment Method</label>
            <select 
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full border rounded px-2 py-1"
            >
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
              <option value="cheque">Cheque</option>
              <option value="bank_transfer">Bank Transfer</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Amount (₹)</label>
            <input 
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              max={invoice.due_amount}
              className="w-full border rounded px-2 py-1"
              placeholder="0.00"
            />
            <p className="text-xs text-gray-500 mt-1">Max: ₹{invoice.due_amount}</p>
          </div>

          {paymentMethod !== 'cash' && (
            <div>
              <label className="block text-sm font-medium mb-1">Reference ID</label>
              <input 
                type="text"
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
                className="w-full border rounded px-2 py-1"
                placeholder="UTR / Txn ID"
              />
            </div>
          )}

          <Button 
            onClick={handleAddPayment}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Processing...' : 'Record Payment'}
          </Button>
        </div>
      )}

      {/* Payment History */}
      {payments.length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <p className="text-sm font-medium mb-2">Recent Payments</p>
          <div className="space-y-1 text-sm">
            {payments.slice(0, 3).map((p) => (
              <div key={p.id} className="flex justify-between text-gray-600">
                <span className="capitalize">{p.payment_method}</span>
                <span className="font-medium">₹{p.amount}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

## Example 4: Hospital Dashboard - Outstanding Invoices

```jsx
import { getHospitalInvoices } from '@/actions/invoices'

export async function DueInvoicesWidget({ hospitalId }) {
  const unpaidInvoices = await getHospitalInvoices(hospitalId, 'unpaid')
  const partialInvoices = await getHospitalInvoices(hospitalId, 'partially_paid')
  
  const totalDue = [
    ...unpaidInvoices,
    ...partialInvoices
  ].reduce((sum, inv) => sum + (inv.due_amount || 0), 0)

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <h3 className="font-semibold text-red-900 mb-3">Outstanding Payments</h3>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Unpaid Invoices</span>
          <span className="font-medium">{unpaidInvoices.length}</span>
        </div>
        <div className="flex justify-between">
          <span>Partially Paid</span>
          <span className="font-medium">{partialInvoices.length}</span>
        </div>
        <div className="border-t pt-2 flex justify-between font-bold">
          <span>Total Due</span>
          <span className="text-red-600">₹{totalDue.toFixed(2)}</span>
        </div>
      </div>

      <div className="mt-3 space-y-1">
        {unpaidInvoices.slice(0, 3).map((inv) => (
          <div key={inv.id} className="text-xs text-gray-600 flex justify-between">
            <span>Invoice: {inv.id.slice(0, 8)}...</span>
            <span className="font-medium">₹{inv.due_amount}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

## Database Query Examples

### Get all unpaid invoices for a hospital
```sql
SELECT id, patient_id, total_amount, due_amount, created_at
FROM invoices
WHERE hospital_id = 'hosp123' AND payment_status = 'unpaid'
ORDER BY created_at DESC;
```

### Get payment breakdown by method
```sql
SELECT 
  payment_method,
  COUNT(*) as count,
  SUM(amount) as total
FROM invoice_payments
WHERE hospital_id = 'hosp123' 
  AND paid_at >= NOW() - INTERVAL '30 days'
GROUP BY payment_method;
```

### Get invoices with partial payments
```sql
SELECT 
  invoices.id,
  invoices.patient_id,
  invoices.total_amount,
  invoices.paid_amount,
  invoices.due_amount,
  COUNT(payments.id) as payment_count
FROM invoices
LEFT JOIN invoice_payments payments ON invoices.id = payments.invoice_id
WHERE invoices.hospital_id = 'hosp123'
  AND invoices.payment_status = 'partially_paid'
GROUP BY invoices.id
ORDER BY invoices.updated_at DESC;
```

## Error Handling Best Practices

```jsx
try {
  const result = await generateInvoice(invoiceData, currentUserId)
  
  if (result.success) {
    // Invoice created successfully
    toast.success('Invoice generated!')
    // Redirect or update UI
  }
} catch (error) {
  // Handle specific errors
  if (error.message.includes('unique constraint')) {
    toast.error('Duplicate invoice - appointment already has an invoice')
  } else if (error.message.includes('foreign key')) {
    toast.error('Invalid hospital or patient reference')
  } else {
    toast.error('Failed to generate invoice: ' + error.message)
  }
  console.error('Invoice generation error:', error)
}
```

## Testing Scenarios

### Scenario 1: Full Payment
- subtotal: 1000
- discount: 0
- total: 1000
- pay: 1000
- status should be: paid ✓

### Scenario 2: 10% Discount + Full Payment
- subtotal: 1000
- discount: 10% = 100
- total: 900
- pay: 900
- status should be: paid ✓

### Scenario 3: Split Payment
- subtotal: 1000
- discount: 5% = 50
- total: 950
- pay: 500 (UPI) + 450 (cash)
- status should be: paid ✓

### Scenario 4: Partial Payment
- subtotal: 1000
- discount: 0
- total: 1000
- pay: 600 (cash)
- due: 400
- status should be: partially_paid ✓

### Scenario 5: Add Payment Later
- start: partially_paid with 400 due
- add: 400 (upi)
- due: 0
- status should update to: paid ✓
