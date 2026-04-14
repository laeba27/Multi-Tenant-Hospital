# Appointment Booking and Billing Refactoring Guide

## Overview
This document outlines the comprehensive refactoring of the appointment booking and billing flow to support a structured multi-step process with proper billing and payment handling.

## Key Changes

### 1. **Multi-Step Booking Flow**
The booking process is now divided into 4 distinct steps:

#### Step 1: Booking Details
- Select department and doctor
- Doctor's consultation fee is automatically fetched from the `staff` table
- Select appointment date and time slot
- System bypasses the "fully booked" check and allows slot selection regardless of availability
- Add reason/notes for the appointment

#### Step 2: Billing & Discount
- Display consultation fee and treatment price
- Apply flexible discount options:
  - **No discount** (default)
  - **Percentage-based** (e.g., 10%)
  - **Fixed amount** (e.g., ₹500)
- Real-time calculation of final payable amount
- Visual summary showing subtotal, discount, and total

#### Step 3: Payment Processing
- Select payment method: **Cash, UPI, Card, Cheque, Bank Transfer**
- Enter payment amount (can be partial or full)
- Reference ID required for digital payments (UPI/Card/Cheque/Bank Transfer)
- Support for **split payments** - add multiple payment entries
- Example: ₹1500 via UPI + ₹500 cash = ₹2000 total
- Real-time balance tracking
- Option to complete booking with partial payment (balance due)

#### Step 4: Confirmation
- Invoice is automatically generated with all billing details
- All payments are recorded in the `invoice_payments` table
- Invoice status updates based on payment totals

### 2. **New Component**
**File**: `src/components/BookAppointmentMultiStep.jsx`

Replaces the old `BookAppointment.jsx` component with:
- Visual step indicator (1/2/3 progress)
- Step-specific forms and validations
- Automatic consultation fee fetching from doctor's staff record
- Seamless navigation between steps
- Mobile-responsive design

**Usage**:
```jsx
import { BookAppointmentMultiStep } from '@/components/BookAppointmentMultiStep'

<BookAppointmentMultiStep 
  hospitalId={hospitalId}
  patientId={patientId}
  currentUser={currentUser}
  onSuccess={(appointmentData) => {
    // Handle successful booking with invoice
  }}
  onSkip={() => {
    // Handle skip action
  }}
/>
```

### 3. **Enhanced Invoice Schema**
The `invoices` table now tracks complete billing information:

**New Fields**:
- `discount_type` - 'none', 'percentage', or 'fixed'
- `discount_value` - The discount percentage or amount
- `discount_amount` - Calculated discount amount
- `tax_amount` - Tax (if applicable)
- `paid_amount` - Total amount paid so far
- `due_amount` - Remaining balance
- `payment_status` - 'unpaid', 'partially_paid', or 'paid'

**Removed Fields**:
- `payment_method` - Now stored separately in `invoice_payments`

**Automatic Status Updates**:
A PostgreSQL trigger automatically updates `payment_status` and `due_amount` based on `paid_amount`:
- If `paid_amount >= total_amount` → `payment_status = 'paid'`, `due_amount = 0`
- If `paid_amount > 0` → `payment_status = 'partially_paid'`, `due_amount = total - paid`
- If `paid_amount = 0` → `payment_status = 'unpaid'`, `due_amount = total`

### 4. **New Invoice Payments Table**
**File**: `supabase/migrations/012_create_invoice_payments_table.sql`

Stores individual payment transactions:

**Fields**:
- `id` - UUID, primary key
- `invoice_id` - Foreign key to invoices
- `hospital_id` - Hospital reference
- `patient_id` - Patient reference
- `payment_method` - 'upi', 'card', 'cash', 'cheque', 'bank_transfer'
- `amount` - Amount paid in this transaction
- `reference_id` - Optional UTR/transaction ID for digital payments
- `notes` - Optional notes
- `paid_at` - Timestamp
- `created_by` - Staff member who recorded the payment

**Purpose**:
- Track each payment separately
- Support split payments across multiple methods
- Maintain audit trail of all transactions
- Enable payment history and receipt generation

**RLS Policies**:
- Hospital staff can view/create/update payments for their hospital
- Patients can view their own payment records

### 5. **Updated Invoice Actions**
**File**: `src/actions/invoices.js`

**New Functions**:

#### `generateInvoice(data, currentUserId)`
Creates an invoice and records all payment transactions in one operation.

**Input**:
```javascript
{
  hospital_id: 'hosp123',
  patient_id: 'uuid',
  appointment_id: 'uuid',
  subtotal: 700,           // Consultation + Treatment
  discount_type: 'percentage',
  discount_value: 10,
  tax_amount: 0,
  payments: [
    { method: 'upi', amount: 350, referenceId: 'UTR123' },
    { method: 'cash', amount: 189 }
  ]
}
```

**Returns**:
```javascript
{
  success: true,
  invoice: { id, hospital_id, patient_id, ... },
  message: 'Invoice generated successfully with payment records'
}
```

#### `recordPayment(invoiceId, paymentData, currentUserId)`
Adds a new payment to an existing invoice and updates payment status.

**Input**:
```javascript
{
  method: 'upi',
  amount: 500,
  referenceId: 'UTR456'
}
```

#### `getInvoiceWithPayments(invoiceId)`
Retrieves invoice details along with all related payment transactions.

**Returns**:
```javascript
{
  invoice: { ... },
  payments: [ ... ]
}
```

#### `getHospitalInvoices(hospitalId, paymentStatus)`
Retrieves all invoices for a hospital, optionally filtered by payment status.

### 6. **Error Handling**
Fixed the `InvoiceGeneration.jsx` import error by adding missing `useEffect` import.

## Migration Steps

### Step 1: Apply Database Migrations
```bash
# Apply the new migrations in order
supabase migration up 012
supabase migration up 013
```

### Step 2: Update Component Usage
Replace old `BookAppointment` imports with the new `BookAppointmentMultiStep`:

**Before**:
```jsx
import { BookAppointment } from '@/components/BookAppointment'
<BookAppointment {...props} />
```

**After**:
```jsx
import { BookAppointmentMultiStep } from '@/components/BookAppointmentMultiStep'
<BookAppointmentMultiStep {...props} />
```

### Step 3: Update onSuccess Handler
The `onSuccess` callback now receives enriched appointment data:

```jsx
onSuccess={(data) => {
  // data contains:
  // - appointment details (id, date, time, etc.)
  // - subtotal
  // - discount_type, discount_value
  // - payment information
  
  // You can use this to:
  // 1. Display confirmation
  // 2. Generate receipt
  // 3. Send appointment confirmation email
  // 4. Update UI
}}
```

## Database Schema Reference

### Invoices Table (Updated)
```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY,
  hospital_id TEXT NOT NULL,
  patient_id UUID NOT NULL,
  appointment_id UUID,
  subtotal NUMERIC,
  discount_type TEXT DEFAULT 'none', -- 'none', 'percentage', 'fixed'
  discount_value NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL,
  paid_amount NUMERIC DEFAULT 0,
  due_amount NUMERIC NOT NULL DEFAULT 0,
  payment_status TEXT DEFAULT 'unpaid', -- 'unpaid', 'partially_paid', 'paid'
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)
```

### Invoice Payments Table (New)
```sql
CREATE TABLE invoice_payments (
  id UUID PRIMARY KEY,
  invoice_id UUID NOT NULL,
  hospital_id TEXT NOT NULL,
  patient_id UUID NOT NULL,
  payment_method TEXT NOT NULL, -- 'upi', 'card', 'cash', 'cheque', 'bank_transfer'
  amount NUMERIC NOT NULL,
  reference_id TEXT,
  notes TEXT,
  paid_at TIMESTAMP NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP NOT NULL
)
```

## Example Workflow

### User Books Appointment with Split Payment

1. **Step 1 - Booking**
   - Selects Cardiology department
   - Selects Dr. Smith (consultation fee: ₹700 from staff table)
   - Selects date: 2024-03-20
   - Selects slot: 10:30 AM
   - Adds reason: "Heart checkup"

2. **Step 2 - Billing**
   - Subtotal: ₹700
   - Applies 10% discount: -₹70
   - Final amount: ₹630

3. **Step 3 - Payment**
   - Pays ₹400 via UPI (Reference: UTR123456)
   - Pays ₹230 via cash
   - Total paid: ₹630 (Full payment)
   - Payment status: "paid"
   - Due amount: ₹0

4. **Step 4 - Confirmation**
   - Invoice generated with ID: uuid
   - Two payment records created
   - Appointment confirmed
   - Email notification sent

### Example: Partial Payment Scenario

If same appointment with:
- Pays ₹400 via UPI
- Clicks "Complete Booking"
- Payment status: "partially_paid"
- Due amount: ₹230

Later, receptionist can:
- Add another payment via `recordPayment()`
- Pay ₹230 cash
- Status updates to "paid" automatically
- Due amount updates to ₹0

## Benefits

✅ **Structured Process**: Clear multi-step flow prevents errors
✅ **Flexible Discounts**: Support both percentage and fixed amount discounts
✅ **Split Payments**: Accept multiple payment methods in single booking
✅ **Automatic Billing**: Smart status updates based on payment totals
✅ **No Overbooking**: Bypasses availability checks to ensure booking success
✅ **Payment Tracking**: Complete audit trail of all transactions
✅ **Partial Payments**: Support partial payments with outstanding balance tracking
✅ **Mobile Friendly**: Responsive design works on all devices
✅ **Better UX**: Visual step indicators and real-time calculations

## Testing Checklist

- [ ] Booking flow works through all 3 steps
- [ ] Consultation fee is correctly fetched from staff table
- [ ] Discount calculation (percentage and fixed) works correctly
- [ ] Split payment entries can be added and tracked
- [ ] Payment status updates automatically
- [ ] Invoice is generated with correct details
- [ ] Database migrations apply without errors
- [ ] RLS policies allow appropriate access
- [ ] Error handling for invalid inputs
- [ ] Email notifications for booking confirmation

## Future Enhancements

1. **Partial payment reminder emails**
2. **Automated payment receipt generation**
3. **Integration with payment gateways (Razorpay, PayU)**
4. **Invoice PDF generation**
5. **Payment analytics dashboard**
6. **Bulk invoice generation for clinics**
7. **Payment reconciliation reports**
8. **Refund/adjustment tracking**
