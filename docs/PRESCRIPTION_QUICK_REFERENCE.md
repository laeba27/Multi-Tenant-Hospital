# Quick Reference: Prescription-Appointment Integration

## What Was Added

### 1. Database Changes
- Migration: `017_link_prescriptions_to_appointments.sql`
- New columns: `prescription_status`, `has_prescription` on appointments table
- New view: `doctor_appointments_with_prescriptions`
- Automatic triggers for status syncing

### 2. New Server Actions
**Location:** `src/actions/prescriptions.js`

```js
// Create a prescription linked to appointment
await createPrescriptionFromAppointment({
  appointmentId, patientId, templateId, 
  prescriptionValues, clinicalSummary, followUpDate
})

// Get appointment with all its prescriptions
const data = await getAppointmentWithPrescriptions(appointmentId)

// Get doctor's appointments with prescription status
const appointments = await getDoctorAppointmentsWithPrescriptionStatus()

// Update prescription status (draft → issued → amended → cancelled)
await updatePrescriptionStatus(prescriptionId, 'issued')
```

### 3. New Component
**Location:** `src/components/prescriptions/AppointmentPrescriptionManager.jsx`

Modal-based UI to:
- View prescription history for an appointment
- Create new prescriptions
- Select templates
- Integrate with PrescriptionComposer

---

## How to Use

### Step 1: Apply Migration
```bash
# Run the migration
supabase db push
```

### Step 2: Import Component
```jsx
import { AppointmentPrescriptionManager } from '@/components/prescriptions/AppointmentPrescriptionManager'
import { getAppointmentWithPrescriptions, getDoctorPrescriptionComposerData } from '@/actions/prescriptions'
```

### Step 3: Add to Appointment Detail Page
```jsx
<AppointmentPrescriptionManager
  appointmentId="apt-123"
  patientId="patient-456"
  hasExistingPrescription={true}
  prescriptions={[...]}
  templates={[...]}
  optionSets={[...]}
  presets={[...]}
  defaultTemplate={template}
/>
```

---

## Workflow

```
Appointment Page
    ↓
Click "New Prescription"
    ↓
Select Template
    ↓
PrescriptionComposer Opens
    ↓
Fill in Fields
    ↓
Submit → createPrescriptionFromAppointment()
    ↓
Prescription Created & Linked to Appointment
    ↓
appointment.has_prescription = true
    ↓
appointment.prescription_status = "draft"
    ↓
Doctor Reviews & Clicks "Issue"
    ↓
updatePrescriptionStatus() → "issued"
    ↓
appointment.prescription_status = "issued"
```

---

## Data Structure

### Prescription Created
```json
{
  "id": "rx-123",
  "appointment_id": "apt-456",
  "patient_id": "patient-789",
  "doctor_id": "doctor-abc",
  "status": "draft",
  "created_at": "2024-05-15T10:45:00Z"
}
```

### Prescription Values
```json
{
  "prescription_id": "rx-123",
  "field_key": "medications",
  "value": [
    {
      "medicine": "Aspirin",
      "dosage": "500mg",
      "frequency": "Twice daily"
    }
  ]
}
```

### Appointment with Prescription Status
```json
{
  "id": "apt-456",
  "patient_id": "patient-789",
  "prescription_status": "issued",
  "has_prescription": true,
  "prescriptions": [
    {
      "id": "rx-123",
      "status": "issued",
      "issued_at": "2024-05-15T10:50:00Z"
    }
  ]
}
```

---

## Key Features

✅ **Template-Based** - Doctor creates templates once, reuses for similar cases  
✅ **Version History** - Old prescriptions keep old template version  
✅ **Linked to Appointment** - Prescriptions tied to specific appointments  
✅ **Status Tracking** - `pending → draft → issued → amended → cancelled`  
✅ **Auto-Sync** - Appointment status updates when prescription changes  
✅ **Audit Trail** - All changes logged with actor, timestamp, details  
✅ **Secure** - RLS policies enforce access control  
✅ **Multi-Specialty** - Same system works for dentists, neurologists, etc.  

---

## Files Created/Modified

### Created
- ✅ `supabase/migrations/017_link_prescriptions_to_appointments.sql`
- ✅ `src/components/prescriptions/AppointmentPrescriptionManager.jsx`
- ✅ `src/app/dashboard/doctor/appointments/example-detail-page.jsx`
- ✅ `docs/PRESCRIPTION_APPOINTMENT_INTEGRATION.md`

### Modified
- ✅ `src/actions/prescriptions.js` (added 4 new functions)

---

## Next Steps to Implement

### Immediate
1. Run the migration: `supabase db push`
2. Copy `AppointmentPrescriptionManager.jsx` to your project
3. Update existing appointment detail page to use the component

### Short-term
1. Add "View Prescription" modal to see prescription details
2. Add "Print Prescription" functionality
3. Add prescription status badges to appointments list

### Medium-term
1. Patient portal to view their prescriptions
2. SMS/Email notifications for prescription status
3. Prescription renewal workflow
4. Integration with inventory/pharmacy

### Long-term
1. Multi-language support
2. Integration with prescription fulfillment services
3. Medicine interaction checker
4. Insurance verification

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Prescription not appearing in appointment | Check `appointment_id` is being set correctly in `createPrescriptionFromAppointment()` |
| Status not updating | Ensure migration was applied and triggers are active |
| Component not showing | Import check: `AppointmentPrescriptionManager` from correct path |
| Templates not loading | Verify templates are in hospital scope (not system-only) |
| Permissions denied | Check RLS policies and doctor/hospital associations |

---

## Testing Checklist

- [ ] Migration applied successfully
- [ ] Can create prescription from appointment
- [ ] Prescription linked to appointment (visible in appointments list)
- [ ] Appointment status updates when prescription created
- [ ] Can view prescription history for appointment
- [ ] Can change prescription status (draft → issued)
- [ ] Audit log shows all changes
- [ ] Component displays correctly in appointment page
- [ ] Templates load and display in modal
- [ ] Form submits and creates prescription_values

---

## Code Examples

### Complete Integration Example
```jsx
'use client'
import { useEffect, useState } from 'react'
import { AppointmentPrescriptionManager } from '@/components/prescriptions/AppointmentPrescriptionManager'
import { getAppointmentWithPrescriptions, getDoctorPrescriptionComposerData } from '@/actions/prescriptions'

export default function AppointmentPage({ params }) {
  const [data, setData] = useState(null)
  const [composer, setComposer] = useState(null)

  useEffect(() => {
    async function load() {
      const apt = await getAppointmentWithPrescriptions(params.id)
      const comp = await getDoctorPrescriptionComposerData(params.id)
      setData(apt)
      setComposer(comp)
    }
    load()
  }, [params.id])

  if (!data || !composer) return <div>Loading...</div>

  return (
    <div className="p-6">
      <h1>Appointment: {data.appointment.patient.name}</h1>
      <AppointmentPrescriptionManager
        appointmentId={params.id}
        patientId={data.appointment.patient.id}
        hasExistingPrescription={data.hasPrescription}
        prescriptions={data.prescriptions}
        templates={composer.templates}
        optionSets={composer.optionSets}
        presets={composer.presets}
        defaultTemplate={composer.selectedTemplate}
      />
    </div>
  )
}
```

### Create Prescription Directly
```jsx
import { createPrescriptionFromAppointment } from '@/actions/prescriptions'

async function handleCreatePrescription() {
  const result = await createPrescriptionFromAppointment({
    appointmentId: 'apt-123',
    patientId: 'patient-456',
    templateId: 'template-789',
    templateVersionId: 'version-001',
    prescriptionValues: [
      {
        field_id: 'field-med',
        section_key: 'medications',
        field_key: 'medicine_list',
        label: 'Medications',
        value: [{ medicine: 'Aspirin', dosage: '500mg' }]
      }
    ],
    clinicalSummary: 'Patient has fever',
    followUpDate: '2024-05-20',
    status: 'draft'
  })
  
  console.log('Created:', result.prescription_id)
}
```

---

## Support

For issues or questions:
1. Check the full guide: `docs/PRESCRIPTION_APPOINTMENT_INTEGRATION.md`
2. Review example page: `src/app/dashboard/doctor/appointments/example-detail-page.jsx`
3. Check migration: `supabase/migrations/017_link_prescriptions_to_appointments.sql`
4. Review session notes: `/memories/session/prescription-appointment-integration.md`
