# Integration Guide: Switching to Multi-Step Booking

## Files to Update

### 1. If Using in a Page or Modal
Find all imports of the old component:

```bash
grep -r "BookAppointment" src/ --include="*.jsx" --include="*.js"
```

### 2. Update Imports
Change from:
```jsx
import { BookAppointment } from '@/components/BookAppointment'
```

To:
```jsx
import { BookAppointmentMultiStep } from '@/components/BookAppointmentMultiStep'
```

### 3. Update Component Usage
The props remain the same, but the component name changes:

```jsx
// OLD
<BookAppointment 
  hospitalId={hospitalId}
  patientId={patientId}
  patient={patient}
  currentUser={currentUser}
  onSuccess={handleBookingSuccess}
  onSkip={handleSkip}
/>

// NEW (identical props, new component)
<BookAppointmentMultiStep 
  hospitalId={hospitalId}
  patientId={patientId}
  patient={patient}
  currentUser={currentUser}
  onSuccess={handleBookingSuccess}
  onSkip={handleSkip}
/>
```

### 4. Enhanced onSuccess Handler
The callback now returns richer data:

```jsx
const handleBookingSuccess = async (appointmentData) => {
  // Old callback data:
  // - Standard appointment fields
  
  // NEW callback data also includes:
  // - subtotal: 700
  // - discount_type: 'percentage'
  // - discount_value: 10
  // - payments: [{method, amount, referenceId}, ...]
  
  // Use the enhanced data:
  console.log('Appointment ID:', appointmentData.id)
  console.log('Total Amount:', appointmentData.subtotal)
  console.log('Discount Applied:', appointmentData.discount_value)
  console.log('Payments:', appointmentData.payments)
  
  // Generate invoice with this data
  await generateInvoice({
    hospital_id: appointmentData.hospital_id,
    patient_id: appointmentData.patient_id,
    appointment_id: appointmentData.id,
    subtotal: appointmentData.subtotal,
    discount_type: appointmentData.discount_type,
    discount_value: appointmentData.discount_value,
    payments: appointmentData.payments
  }, currentUserId)
}
```

## Database Migration Commands

```bash
# Navigate to project root
cd /Users/laebafirdous/Desktop/webdev/management

# Apply migrations (these create the new tables and update existing ones)
npx supabase migration up

# Or apply specific migrations:
npx supabase migration up 012  # Creates invoice_payments table
npx supabase migration up 013  # Updates invoices schema
```

## Quick Checklist Before Going Live

- [ ] Database migrations applied successfully
- [ ] Component imports updated in all files
- [ ] onSuccess handler adapted to use new data structure
- [ ] Tested full booking flow with:
  - [ ] No discount
  - [ ] Percentage discount (10%)
  - [ ] Fixed amount discount (₹100)
  - [ ] Single payment (full)
  - [ ] Single payment (partial)
  - [ ] Split payments (UPI + cash)
- [ ] Verified invoice is created with correct amount
- [ ] Verified payments are recorded correctly
- [ ] Verified payment status updates automatically
- [ ] Mobile testing on iPhone/Android
- [ ] Error scenarios tested (invalid amounts, missing fields)

## Common Issues & Solutions

### Issue: "useEffect is not defined"
**Solution**: Already fixed in InvoiceGeneration.jsx. Make sure you're using the latest version.

### Issue: "Doctor is fully booked"
**Solution**: The new component automatically bypasses this check. Delete the old BookAppointment.jsx component to avoid confusion.

### Issue: Consultation fee not showing
**Problem**: The staff table doctor record might not have `consultation_fee` set.
**Solution**: Update the doctor's staff record:
```sql
UPDATE staff
SET consultation_fee = 700
WHERE id = 'doctor-uuid' AND role = 'doctor'
```

### Issue: Invoice not created on payment
**Solution**: Make sure the onSuccess handler calls `generateInvoice()` with the appointment data.

### Issue: Payment status not updating
**Problem**: The trigger might not be working.
**Solution**: Verify the trigger was created:
```sql
SELECT * FROM information_schema.triggers 
WHERE trigger_name = 'trigger_update_invoice_payment_status'
```

## Performance Notes

The multi-step component is optimized for performance:
- Lazy loads available slots only when date is selected
- Fetches doctor list only when department is selected
- Minimal re-renders using React hooks
- All calculations are performed client-side
- Database writes (invoice + payments) happen in a single server action

## Security Notes

- RLS policies enforce hospital staff can only see/edit their hospital's invoices
- Patients can only view their own invoices and payments
- Payment method preference is stored client-side only (not persisted)
- All transactions are logged with created_by user ID for audit trail

## Support

If you encounter issues:
1. Check console for error messages
2. Verify database migrations were applied: `npx supabase migration list`
3. Check RLS policies: `SELECT * FROM pg_policies WHERE tablename = 'invoices'`
4. Review logs in Supabase dashboard
