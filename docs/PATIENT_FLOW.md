# Patient Portal — Self-Booking Flow

**Status:** partially built. Sections marked ✅ exist today; sections marked 🔨 are the spec for what still needs to be built.

This document is the single source of truth for the patient self-booking journey: a patient books an appointment from their own portal → the hospital/reception desk is notified and sees it in a pending queue with the payment marked as **unpaid** → staff confirm it → the patient is notified that their appointment is confirmed.

---

## 1. Ground rules

Three rules the whole flow hangs off. Break these and the flow breaks.

**A patient never sets a price.** `bookMyAppointment` deliberately overwrites every treatment's `price` and `discount` to `0` before it touches the database. The clinic prices the appointment at confirmation time. Never trust a number that arrived from the patient's browser.

**A patient-booked appointment is a *request*, not a booking.** A hospital-booked appointment is confirmed on arrival because a human at the desk created it. A patient-booked appointment has to be reviewed — the slot may already be taken, the treatment may need a different doctor, the payment isn't collected. So the two must be distinguishable in the database, and today they are not.

**There is no online payment.** We do not collect money in this app. Every patient-booked appointment is created with `payment_status = 'unpaid'` and stays that way until someone at the desk records a payment. The patient-facing UI says "Pay at the hospital reception" — never "Pay now."

---

## 2. What exists today ✅

### The patient's side

| Route | What it does |
|---|---|
| `/dashboard/patient` | Dashboard — hospital records, upcoming appointments, quick updates |
| `/dashboard/patient/book` | **The booking flow.** Pick hospital → department → doctor → date → slot → reason (+ treatments) |
| `/dashboard/patient/appointments` | My appointments, split into upcoming / past |
| `/dashboard/patient/history` | Past appointments + prescriptions issued to me |
| `/dashboard/patient/hospitals` | The hospitals I'm registered at |
| `/dashboard/patient/updates` | Quick Updates feed (`patient_notices`) |
| `/dashboard/patient/complete-profile` | Forced first-login: email OTP + set password |

`bookMyAppointment` in [src/actions/patients.js](src/actions/patients.js) already: checks the caller is a `patient`, checks the hospital is live (`account_status` in active/approved), strips all pricing, auto-registers the patient at that hospital via `ensureHospitalLink` if this is their first visit, then delegates to `bookAppointment` in [src/actions/appointments.js](src/actions/appointments.js), which inserts the row with `status: 'scheduled'`.

### The hospital's side

Appointments live inside **Patient Management**, not on their own page:

- [src/app/dashboard/hospital/patient-management/page.js](src/app/dashboard/hospital/patient-management/page.js) — tabs: Patient List / Appointments
- [src/app/dashboard/reception/patient-management/page.js](src/app/dashboard/reception/patient-management/page.js) — renders the same page, gated by the RBAC permission `book_appointment`
- [src/components/appointments/AppointmentsList.jsx](src/components/appointments/AppointmentsList.jsx) — the table, fed by `getHospitalAppointments(hospitalId)`

---

## 3. The gaps 🔨

This is why the flow doesn't work end-to-end yet. Four things are missing.

**1. A patient-booked appointment is indistinguishable from a staff-booked one.** Both land in `appointments` with `status = 'scheduled'`. `bookAppointment` writes `booked_by` (the user's uuid) but the schema's `booked_by_type` column is never populated. So reception has no way to filter "show me what patients booked themselves."

**2. There is no payment state on an appointment.** Payment lives on `invoices` (`payment_status`: unpaid / partially_paid / paid), and an invoice is only created later during the billing step. A pending patient request has no invoice yet, so there is nothing to show a "Payment Due" badge from.

**3. There is no confirm action.** `rescheduleAppointment` and `deleteAppointment` exist and are doctor-facing. Nothing lets reception move an appointment from *requested* to *confirmed*.

**4. There is no notification table.** `getNavNotifications()` in [src/actions/notifications.js](src/actions/notifications.js) fabricates the bell feed by reading `notices` + `issues`. There are no per-user notification rows, no unread state, and patients are not wired into the bell at all — they only get `patient_notices`, which are hospital-authored broadcasts, not events.

---

## 4. The target flow

```
PATIENT                          HOSPITAL / RECEPTION                PATIENT
───────                          ────────────────────                ───────
books from /patient/book
  → status: pending_confirmation
  → payment_status: unpaid       ┌──────────────────────────┐
  → booked_by_type: patient      │ 🔔 bell: "New request"   │
                                 │ Pending Requests tab (3) │
                                 └──────────────────────────┘
                                            │
                                 reviews: patient, doctor,
                                 date, slot, reason, ₹ due
                                            │
                    ┌───────────────────────┴──────────────┐
                    │                                      │
              CONFIRM                                  REJECT
              status → scheduled                       status → cancelled
              (optionally record payment)              + reason
                    │                                      │
                    └───────────────────┬──────────────────┘
                                        │
                                        ▼
                            🔔 "Your appointment at
                               <hospital> on <date> at
                               <slot> is confirmed.
                               ₹X due at reception."
```

### Appointment status lifecycle

| Status | Meaning | Set by |
|---|---|---|
| `pending_confirmation` | Patient booked it; the desk hasn't reviewed it yet | `bookMyAppointment` |
| `scheduled` | Confirmed. Either staff-booked (immediate) or a patient request the desk approved | `bookAppointment` (staff) / `confirmPatientAppointment` |
| `completed` | The doctor saw the patient | Doctor / prescription flow |
| `cancelled` | Rejected by the desk, or cancelled by either side | `rejectPatientAppointment` / cancel |

A staff-booked appointment **skips** `pending_confirmation` entirely — a human at the desk already confirmed it by creating it.

---

## 5. Implementation

### Step 1 — Migration `028_patient_self_booking.sql`

```sql
-- Who created this appointment. Patient-booked ones need review.
alter table public.appointments
  add column if not exists booked_by_type text not null default 'staff'
    check (booked_by_type in ('staff', 'patient'));

-- Payment state, tracked on the appointment itself so a pending request can
-- show "Due" before any invoice exists. The invoice remains the source of
-- truth for the money; this mirrors it for the queue UI.
alter table public.appointments
  add column if not exists payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'partially_paid', 'paid'));

alter table public.appointments
  add column if not exists amount_due numeric(10,2) default 0;

-- Confirmation audit trail.
alter table public.appointments
  add column if not exists confirmed_by uuid references public.profiles (id),
  add column if not exists confirmed_at timestamptz,
  add column if not exists cancellation_reason text;

-- Widen the status check to admit the new state.
alter table public.appointments drop constraint if exists appointments_status_check;
alter table public.appointments
  add constraint appointments_status_check
  check (status in ('pending_confirmation', 'scheduled', 'completed', 'cancelled'));

-- The pending-requests queue reads this constantly.
create index if not exists idx_appointments_pending
  on public.appointments (hospital_id, status)
  where status = 'pending_confirmation';

-- ─────────────────────────────────────────────────────────
-- Per-user notifications. Replaces the synthesized bell feed.
-- ─────────────────────────────────────────────────────────
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),

  -- The recipient. Either a specific person...
  recipient_id uuid references public.profiles (id) on delete cascade,
  -- ...or every staff member with this role at this hospital
  -- (used to fan a new booking out to the whole reception desk).
  recipient_role text,
  hospital_id text references public.hospitals (registration_no) on delete cascade,

  kind text not null,          -- appointment_requested | appointment_confirmed | appointment_cancelled
  title text not null,
  body text,
  link text,                   -- deep link, e.g. /dashboard/reception/patient-management?tab=pending
  entity_type text,            -- 'appointment'
  entity_id text,              -- the APT###### id

  read_at timestamptz,
  created_at timestamptz not null default now(),

  -- Must target someone: a person, or a role at a hospital.
  constraint notifications_has_target
    check (recipient_id is not null or (recipient_role is not null and hospital_id is not null))
);

create index if not exists idx_notifications_recipient
  on public.notifications (recipient_id, read_at, created_at desc);
create index if not exists idx_notifications_role
  on public.notifications (hospital_id, recipient_role, created_at desc);

alter table public.notifications enable row level security;

create policy "Users read their own notifications" on public.notifications
  for select to authenticated
  using (
    recipient_id = auth.uid()
    or (
      recipient_role is not null
      and exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
          and p.hospital_id = notifications.hospital_id
          and p.role = notifications.recipient_role
      )
    )
  );

create policy "Users mark their own notifications read" on public.notifications
  for update to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());
```

> **Note on `recipient_role`:** `profiles.role` stores `receptionist`, but several RLS policies elsewhere in the codebase check for `reception`. Always write `'receptionist'` here — that's what's actually on the profile row.

### Step 2 — `src/actions/notifications.js`

Add alongside the existing `getNavNotifications()`:

```js
notify({ recipientId, recipientRole, hospitalId, kind, title, body, link, entityId })
getMyNotifications({ limit = 20, unreadOnly = false })
markNotificationRead(notificationId)
markAllNotificationsRead()
```

`notify` uses the **admin client** — a patient writing a row addressed to the reception desk would never pass RLS otherwise.

Then rewrite `getNavNotifications()` to merge three sources: the new `notifications` table, plus the existing `notices` and `issues` feeds. The bell becomes available to patients, which it currently is not.

### Step 3 — `bookMyAppointment` changes

In [src/actions/patients.js](src/actions/patients.js), after the `bookAppointment` call succeeds:

1. Pass `booked_by_type: 'patient'` and `status: 'pending_confirmation'` through to the insert. `bookAppointment` needs a matching change to accept an explicit status instead of always hardcoding `'scheduled'`.
2. Compute `amount_due` **server-side** from the doctor's `staff.consultation_fee` and the catalog `treatments.price` for each selected treatment id. Never from the request body.
3. Set `payment_status: 'unpaid'`.
4. Fire the notification to the desk:

```js
await notify({
  recipientRole: 'receptionist',
  hospitalId,
  kind: 'appointment_requested',
  title: 'New appointment request',
  body: `${patientName} requested ${doctorName} on ${date} at ${slot}. ₹${amountDue} due.`,
  link: '/dashboard/reception/patient-management?tab=pending',
  entityId: appointment.id,
})
```

Also fan the same notification out to `recipientRole: 'hospital_admin'` so the admin dashboard sees it too.

### Step 4 — Confirm / reject actions

New exports in [src/actions/appointments.js](src/actions/appointments.js):

```js
confirmPatientAppointment({ appointmentId, amountDue, paidAmount = 0, paymentMethod })
rejectPatientAppointment({ appointmentId, reason })
```

`confirmPatientAppointment` must:

1. Verify the caller is `hospital_admin` or `receptionist` **at the hospital that owns this appointment**. Do not skip this — the action uses the admin client and therefore bypasses RLS.
2. Verify the appointment is currently `pending_confirmation`. Reject double-confirmation.
3. Re-check the slot is still free (`getDoctorAvailableSlots`) — the doctor may have filled up since the patient requested it.
4. Set `status: 'scheduled'`, `confirmed_by`, `confirmed_at`, and the final `amount_due`.
5. If `paidAmount > 0`, create the `invoice` + `invoice_payment` rows and mirror the resulting `payment_status` back onto the appointment. Otherwise leave it `unpaid`.
6. Notify the patient:

```js
await notify({
  recipientId: patientProfileId,
  kind: 'appointment_confirmed',
  title: 'Appointment confirmed',
  body: `Your appointment with Dr. ${doctorName} at ${hospitalName} on ${date} at ${slot} is confirmed.`
      + (amountDue > 0 ? ` ₹${amountDue} is payable at reception.` : ''),
  link: '/dashboard/patient/appointments',
  entityId: appointmentId,
})
```

`rejectPatientAppointment` sets `status: 'cancelled'` + `cancellation_reason`, and notifies the patient with the reason.

### Step 5 — The Pending Requests queue

A new tab in **Patient Management** (visible to both hospital admin and reception), rendered above the existing Appointments tab with an unread-style count badge.

| Patient | Contact | Doctor / Dept | Requested For | Reason | Payment | Action |
|---|---|---|---|---|---|---|
| Aisha Khan `HOSP-PAT-00042` | aisha@… · 98765 43210 | Dr. Mehta · Dental | 14 Jul 2026, 10:30 | Toothache | 🔴 **Unpaid** ₹500 | **Confirm** · Reject |

Empty state: "No pending requests. Patient bookings will appear here for confirmation."

**Confirm** opens a dialog showing the full request, with:
- an editable **Amount Due** (pre-filled from consultation fee + treatments — staff can adjust)
- an optional **Record Payment** section (amount + method: cash/upi/card/…)
- **Confirm Appointment** / **Confirm & Collect Payment**

**Reject** opens a small dialog asking for a reason (free text), which the patient sees.

Payment badges: `unpaid` → red "Unpaid", `partially_paid` → amber "Partial", `paid` → green "Paid".

### Step 6 — Patient-side visibility

In `MyAppointmentsView.jsx`, render `pending_confirmation` distinctly:

> ⏳ **Awaiting confirmation** — the hospital will confirm this shortly.
> Payment: **₹500 due at reception** (we don't take payments online yet.)

Once confirmed it flips to a green "Confirmed" chip, and the patient gets a bell notification. Add a **Cancel request** button, allowed only while the status is `pending_confirmation` and only for the patient who owns the row.

Wire the navbar bell into the patient layout so patients actually receive notifications — right now they don't have one.

---

## 6. Build order

1. **Migration 028** — the schema is the blocking dependency for everything else.
2. **Notifications action + bell** — verify a row written by `notify` shows up in the bell for both a patient and a receptionist.
3. **`bookMyAppointment`** → writes `pending_confirmation` + `unpaid` + server-computed `amount_due`, and notifies the desk.
4. **Pending Requests tab** — read-only first. Confirm the request actually appears.
5. **Confirm / reject actions** + their dialogs.
6. **Patient-side status chips**, cancel-request, and the confirmation notification landing.

### What "done" looks like

Sign in as a patient, book at a hospital you've never visited. Sign in as that hospital's receptionist: the bell shows "New appointment request," the Pending tab shows the row with a red **Unpaid ₹500** badge. Hit Confirm. Sign back in as the patient: the bell shows "Appointment confirmed," and the appointment now reads **Confirmed · ₹500 due at reception**.

---

## 7. Security checklist

Every one of these is a real hole if skipped, because the appointment write path uses the **service-role admin client and bypasses RLS entirely**.

- [ ] `confirmPatientAppointment` / `rejectPatientAppointment` verify the caller's role **and** that their `hospital_id` matches the appointment's.
- [ ] `amount_due` is computed server-side from `staff.consultation_fee` + `treatments.price`. Never read from the request body.
- [ ] `bookMyAppointment` keeps stripping `price`/`discount` from patient-supplied treatments.
- [ ] A patient can only cancel an appointment whose `patients.profile_id` is their own `auth.uid()`.
- [ ] `notify` is the only writer to `notifications` (admin client). No insert policy is granted to `authenticated`.
- [ ] Confirming an already-confirmed appointment is a no-op, not a double-invoice.
