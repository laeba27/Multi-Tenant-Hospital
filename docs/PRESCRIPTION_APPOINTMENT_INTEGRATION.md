# Prescription & Appointment Integration Guide

## Overview

This guide explains how to integrate the prescription system with appointments so doctors can:

1. **Create templates** in the prescription management tab
2. **Write prescriptions** directly from an appointment
3. **Track prescription status** linked to appointments

---

## Architecture

### Database Schema

The prescription system uses a **template-driven, immutable version** architecture:

```
Appointment
    ├── prescription_status: pending | draft | issued | amended | cancelled
    ├── has_prescription: boolean
    └── Prescriptions (one-to-many)
        ├── status: draft | issued | amended | cancelled
        ├── appointment_id: (links to appointment)
        ├── template_id: (selected template)
        ├── template_version_id: (immutable snapshot)
        └── Prescription Values
            ├── field_key: (e.g., "medications", "diagnosis")
            └── value: (actual data entered by doctor)
```

### Key Tables

1. **prescription_templates** - Master template definitions
2. **prescription_template_versions** - Immutable version history
3. **prescription_template_sections** - Logical groups (History, Examination, Medications, etc.)
4. **prescription_template_fields** - Dynamic field definitions
5. **prescription_option_sets** - Reusable dropdowns (medicines, symptoms, etc.)
6. **prescription_presets** - Common case templates (cold, extraction, etc.)
7. **prescriptions** - Actual prescription instances
8. **prescription_values** - Individual field values in a prescription

---

## Implementation Steps

### Step 1: Apply Database Migration

Run the migration to add appointment-prescription linking:

```bash
# The migration is in:
# supabase/migrations/017_link_prescriptions_to_appointments.sql
```

This adds:
- `prescription_status` column to appointments
- `has_prescription` boolean flag
- View: `doctor_appointments_with_prescriptions`
- Triggers for auto-updating status
- Indexes for performance

### Step 2: Use the New Server Actions

In your appointment detail page, use these functions:

```javascript
// Get appointment with prescriptions
import { getAppointmentWithPrescriptions } from '@/actions/prescriptions'

const data = await getAppointmentWithPrescriptions(appointmentId)
// Returns: { appointment, prescriptions, appointmentStatus, hasPrescription }

// Get all doctor appointments with prescription status
import { getDoctorAppointmentsWithPrescriptionStatus } from '@/actions/prescriptions'

const appointments = await getDoctorAppresentmentsWithPrescriptionStatus()
// Returns: Array with prescription_status, has_prescription, prescription_count

// Create prescription from appointment
import { createPrescriptionFromAppointment } from '@/actions/prescriptions'

const result = await createPrescriptionFromAppointment({
  appointmentId: 'apt-123',
  patientId: 'patient-456',
  templateId: 'template-789',
  templateVersionId: 'version-012',
  prescriptionValues: [
    {
      field_id: 'field-001',
      section_key: 'medications',
      field_key: 'medicine_list',
      label: 'Medications',
      value: [{ medicine: 'Aspirin', dosage: '500mg', frequency: 'Twice daily' }],
    }
  ],
  clinicalSummary: 'Patient presenting with mild fever',
  followUpDate: '2024-05-20',
  status: 'draft'
})
```

### Step 3: Add Component to Appointment Page

#### Option A: Minimal Integration

In your appointment details page:

```jsx
'use client'

import { AppointmentPrescriptionManager } from '@/components/prescriptions/AppointmentPrescriptionManager'
import { getDoctorPrescriptionComposerData, getAppointmentWithPrescriptions } from '@/actions/prescriptions'

export default function AppointmentDetailsPage({ appointmentId }) {
  const [appointmentData, setAppointmentData] = useState(null)
  const [prescriptionData, setPrescriptionData] = useState(null)

  useEffect(() => {
    async function loadData() {
      const composer = await getDoctorPrescriptionComposerData(appointmentId)
      setPrescriptionData(composer)
      
      const aptData = await getAppointmentWithPrescriptions(appointmentId)
      setAppointmentData(aptData)
    }
    loadData()
  }, [appointmentId])

  if (!appointmentData || !prescriptionData) return <div>Loading...</div>

  return (
    <div className="space-y-6">
      {/* Other appointment details... */}
      
      {/* Prescription Manager */}
      <AppointmentPrescriptionManager
        appointmentId={appointmentId}
        patientId={appointmentData.appointment.patient.id}
        hasExistingPrescription={appointmentData.hasPrescription}
        prescriptions={appointmentData.prescriptions}
        templates={prescriptionData.templates}
        optionSets={prescriptionData.optionSets}
        presets={prescriptionData.presets}
        defaultTemplate={prescriptionData.selectedTemplate}
      />
    </div>
  )
}
```

#### Option B: Full Integration with Status Display

```jsx
import { AppointmentPrescriptionManager } from '@/components/prescriptions/AppointmentPrescriptionManager'
import { Badge } from '@/components/ui/badge'

function AppointmentCard({ appointment }) {
  const statusColors = {
    pending: 'bg-gray-100',
    draft: 'bg-yellow-100',
    issued: 'bg-green-100',
    amended: 'bg-blue-100',
    cancelled: 'bg-red-100',
  }

  return (
    <div className="border rounded-lg p-4">
      {/* Appointment Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-semibold">{appointment.patient.name}</h3>
          <p className="text-sm text-gray-600">{appointment.date}</p>
        </div>
        {appointment.has_prescription && (
          <Badge className={statusColors[appointment.prescription_status]}>
            {appointment.prescription_status}
          </Badge>
        )}
      </div>

      {/* Prescription Manager */}
      <AppointmentPrescriptionManager
        appointmentId={appointment.id}
        patientId={appointment.patient.id}
        hasExistingPrescription={appointment.has_prescription}
        prescriptions={appointment.prescriptions}
        templates={templates}
        optionSets={optionSets}
        presets={presets}
        defaultTemplate={defaultTemplate}
      />
    </div>
  )
}
```

### Step 4: Create Prescription Templates

In the doctor's prescription management tab:

```jsx
import { PrescriptionTemplateStudio } from '@/components/prescriptions/PrescriptionTemplateStudio'

export default function PrescriptionsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Prescription Templates</h1>
      
      {/* Template Studio for creating/editing templates */}
      <PrescriptionTemplateStudio />

      {/* Optionally show recent prescriptions */}
    </div>
  )
}
```

---

## Data Model Examples

### Appointment with Prescription Status

```json
{
  "id": "apt-123",
  "patient_id": "patient-456",
  "appointment_date": "2024-05-15",
  "appointment_slot": "10:30 AM",
  "reason": "Persistent headache and fever",
  "prescription_status": "issued",
  "has_prescription": true,
  "prescriptions": [
    {
      "id": "rx-789",
      "status": "issued",
      "created_at": "2024-05-15T10:45:00Z",
      "issued_at": "2024-05-15T10:50:00Z",
      "clinical_summary": "Patient presents with high fever and headache"
    }
  ]
}
```

### Prescription Value Structure

```json
{
  "prescription_id": "rx-789",
  "field_id": "field-med",
  "section_key": "medications",
  "field_key": "medicine_list",
  "label": "Medications",
  "value": [
    {
      "medicine": "Ibuprofen",
      "dosage": "400mg",
      "frequency": "Thrice daily",
      "duration": "5 days",
      "instructions": "Take with food"
    }
  ],
  "rendered_value": "Ibuprofen 400mg - Thrice daily for 5 days"
}
```

---

## Prescription Workflow

### Doctor's View

1. **Open Appointment** → See prescription status badge
2. **Click "New Prescription"** → Dialog opens
3. **Select Template** → Recommended templates shown
4. **Fill Details** → Form renders based on template
5. **Submit** → Creates prescription linked to appointment
6. **Review & Issue** → Changes status to "issued"

### Status Flow

```
Appointment Created
    ↓
prescription_status: pending
    ↓
Doctor clicks "New Prescription"
    ↓
prescription_status: draft (first prescription created)
    ↓
Doctor fills and issues
    ↓
prescription_status: issued
    ↓
(Optional) Doctor amends
    ↓
prescription_status: amended
```

---

## Advanced Features

### 1. Prescription Presets

Pre-fill common prescriptions:

```jsx
<AppointmentPrescriptionManager
  presets={[
    {
      id: 'preset-cold',
      name: 'Common Cold',
      description: 'Standard treatment for common cold'
    },
    {
      id: 'preset-fever',
      name: 'High Fever',
      description: 'Fever management protocol'
    }
  ]}
/>
```

### 2. Option Sets (Reusable Dropdowns)

```javascript
const optionSets = [
  {
    id: 'medicines',
    name: 'Medicines',
    items: [
      { label: 'Aspirin 500mg', value: 'aspirin-500' },
      { label: 'Ibuprofen 400mg', value: 'ibuprofen-400' }
    ]
  }
]
```

### 3. Audit Trail

```javascript
// Get prescription history
const { data: auditLogs } = await supabase
  .from('prescription_audit_logs')
  .select('*')
  .eq('prescription_id', 'rx-789')
  .order('created_at', { ascending: false })

// Example output:
[
  {
    event_type: 'issued',
    actor_id: 'doctor-123',
    created_at: '2024-05-15T10:50:00Z',
    payload: { status: 'issued' }
  },
  {
    event_type: 'created',
    actor_id: 'doctor-123',
    created_at: '2024-05-15T10:45:00Z',
    payload: { from_appointment: true }
  }
]
```

### 4. Follow-up Scheduling

```jsx
<div>
  <label>Follow-up Date</label>
  <input 
    type="date" 
    value={followUpDate}
    onChange={(e) => setFollowUpDate(e.target.value)}
  />
</div>
```

---

## Security & Permissions

### RLS Policies

The system enforces:

1. **Doctors** can only access:
   - Their own appointments
   - Their own prescriptions
   - Templates from their hospital or system defaults

2. **Hospital Admins** can:
   - View all appointments
   - View all prescriptions
   - Manage templates

3. **Patients** can:
   - View prescriptions for their appointments (if enabled)

### Audit Logging

Every prescription action is logged:
- Created by
- Timestamp
- Status change
- Changes made

---

## Troubleshooting

### Issue: Prescription not creating

**Check:**
- Appointment exists and belongs to doctor
- Patient ID matches appointment
- Template ID is valid
- Doctor is authenticated

### Issue: Status not updating

**Check:**
- Triggers are enabled (migration applied)
- No conflicting policies
- Supabase replication lag

### Issue: Templates not loading

**Check:**
- Templates are in hospital scope (not system-only)
- Doctor has permission to view templates
- Catalog function returns data

---

## Testing

### Test Appointment Creation Flow

```javascript
describe('Prescription & Appointment Integration', () => {
  it('should create prescription linked to appointment', async () => {
    const result = await createPrescriptionFromAppointment({
      appointmentId: 'test-apt-123',
      patientId: 'test-patient-456',
      templateId: 'template-789',
      prescriptionValues: [],
      status: 'draft'
    })
    expect(result.success).toBe(true)
    expect(result.prescription_id).toBeDefined()
  })

  it('should update appointment prescription_status', async () => {
    const apt = await getAppointmentWithPrescriptions('test-apt-123')
    expect(apt.appointmentStatus).toBe('draft')
    expect(apt.hasPrescription).toBe(true)
  })
})
```

---

## Related Documentation

- [Prescription System Plan](./prescription.md)
- [Code Examples](./CODE_EXAMPLES.md)
- [Appointment Billing Refactoring](./APPOINTMENT_BILLING_REFACTORING.md)

---

## Summary

With this implementation:

✅ Doctors can create templates in the prescription tab  
✅ Doctors can write prescriptions from appointments  
✅ Prescription status is tracked with appointments  
✅ All changes are audited  
✅ System is secure with RLS policies  
✅ Schema supports multi-specialty use  

The system is ready for expansion to other specialties and features like printing, sharing, and patient notifications.
