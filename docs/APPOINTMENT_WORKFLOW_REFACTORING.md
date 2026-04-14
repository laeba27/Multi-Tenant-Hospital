# Patient Management Workflow Refactoring

## Overview
Refactored the patient management and appointment booking workflow to follow a more logical sequence:
**Lookup Patient → Register (if new) → Book Appointment → Generate Invoice → Print Receipt**

## Changes Made

### 1. Database Migration
**File**: `supabase/migrations/014_update_patients_schema.sql`
- Updated `patients` table schema to support multi-hospital patient linking
- Changed structure from `patient_id` to `profile_id` for better relationship management
- Added new fields: `height`, `weight`, `marital_status`, `chronic_conditions`, `medical_notes`
- Implemented unique constraint on `(profile_id, hospital_id)` - one patient can link to multiple hospitals
- Added RLS policies for different roles (hospital_admin, doctor, reception, patient)

### 2. New Patient Lookup Component
**File**: `src/components/PatientLookup.jsx`
- Created new component to search for existing patients before booking
- Supports 4 search methods: Patient ID, Email, Phone, Name
- Displays search results with patient details
- Option to select existing patient or create new one
- Used at the start of "New Appointment" workflow

### 3. Patient Search Action
**File**: `src/actions/patients.js`
- Added `searchPatientForHospital()` function
- Searches patients by ID, email, phone, or name for a specific hospital
- Returns complete patient data including profile information
- Returns `null` if not found, enabling smooth UX for new patient creation

### 4. Updated Page Component
**File**: `src/app/dashboard/hospital/patient-management/page.js`
- Imported `PatientLookup` component
- Changed button from "Register New Patient" to "+ New Appointment" with calendar icon
- Updated wizard workflow steps: `'lookup' | 'register' | 'appointment' | 'invoice' | 'print'`
- Renamed state variables for clarity:
  - `newlyRegisteredPatient` → `selectedPatientForAppointment`
  - Separated `createdAppointment` and `createdInvoice` states
- Updated all handler functions to follow new flow

## New Workflow Sequence

### Before:
1. Click "Register New Patient"
2. Fill patient form
3. Book appointment
4. Generate invoice
5. Print

### After:
1. Click "+ New Appointment"
2. **Search for existing patient** (by ID, email, phone, or name)
   - If found: Skip to appointment booking
   - If not found: Proceed to registration
3. Register new patient (if needed)
4. **Book appointment** (select doctor, specialty, date, time)
5. **Generate invoice** (with appointment details, consultation fee, GST, etc.)
6. **Print receipt** (with hospital details, patient info, invoice details)

## Key Benefits

1. **Prevents Duplicate Patients**: Checks if patient already exists in hospital system
2. **Supports Multi-Hospital Linking**: One patient profile can be linked to multiple hospitals
3. **Logical Order**: Invoice is generated after appointment details are finalized (consultation fee, doctor, date, etc.)
4. **Better UX**: Users can quickly find existing patients without re-entering information
5. **Real Invoice Generation**: Proper invoice with all required details (hospital name, address, phone, patient details, GST)

## Database Changes Summary

- New table version: `014_update_patients_schema.sql`
- Relationship: One profile → Many hospitals (via patients linking table)
- Unique constraint prevents duplicate patient-hospital combinations
- RLS policies ensure data security by role

## Files Modified

1. ✅ `supabase/migrations/014_update_patients_schema.sql` - New migration
2. ✅ `src/components/PatientLookup.jsx` - New component
3. ✅ `src/actions/patients.js` - Added search function
4. ✅ `src/app/dashboard/hospital/patient-management/page.js` - Updated workflow

## Testing Checklist

- [ ] Database migration runs successfully
- [ ] Patient lookup searches all 4 methods (ID, email, phone, name)
- [ ] Existing patient selection skips registration
- [ ] New patient registration creates profile with registration_no
- [ ] Appointment booking works with selected patient
- [ ] Invoice generation calculates correctly based on appointment
- [ ] Print functionality displays all required information
- [ ] Multi-hospital linking works (same patient can be linked to different hospitals)
