# Patient Authentication Flow

How a patient gets an account, signs in the first time, and reaches the portal.

Patients are **globally identified** but **locally linked**: one `profiles` row per
person (with `hospital_id = null`), and one `patients` row per hospital they visit.
That is what lets a single login show records from every hospital they have ever
attended.

---

## 1. Registration (reception onboards the patient)

`PatientForm` → `onboardPatient()` in [`src/actions/patients.js`](../src/actions/patients.js)

Reception collects exactly four required fields:

| Field | Column | Notes |
|---|---|---|
| Name | `profiles.name` | |
| Phone | `profiles.mobile` | Becomes the temporary password |
| Gender | `profiles.gender` | |
| Date of birth | `profiles.date_of_birth` | Age is derived, never stored |

**No email is collected.** The patient supplies and verifies their own on first login.

### Why an auth user must exist immediately

`profiles.id` has a foreign key to `auth.users(id)`:

```sql
CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE
```

So a profile cannot exist without an auth user. But Supabase's
`auth.admin.createUser` requires an email address. With no email collected, the
account is created with a **placeholder** derived from the registration number:

```
PATIENT-123456  →  patient-123456@patients.internal
```

Derived from `registration_no`, so it inherits that column's `UNIQUE` constraint
and can never collide. The `@patients.internal` domain is never deliverable and
never emailed.

```
registration_no = generatePatientRegistrationNo()      // PATIENT-123456
authEmail       = buildPlaceholderEmail(registration_no)
tempPassword    = buildTempPatientPassword(mobile)     // digits of phone number

auth.admin.createUser({ email: authEmail, password: tempPassword, email_confirm: true })
profiles.insert({ id: <that auth user id>, must_change_password: true,
                  must_complete_profile: true, email_verified: false, ... })
```

If the profile insert fails, the orphaned auth user is deleted so a retry with the
same details isn't blocked by a duplicate-email error.

> A patient registered *with* a real email skips the placeholder entirely:
> `must_complete_profile = false`, `email_verified = true`. They still start on the
> phone-number password.

---

## 2. Sign-in

[`src/app/auth/sign-in/page.js`](../src/app/auth/sign-in/page.js)

The patient types a **registration number**, not an email. Supabase authenticates
by email, so the page resolves one to the other:

```
1. profiles.select(...).eq('registration_no', <typed>)   → get id, email, role, status
2. gate checks (see below)
3. supabase.auth.signInWithPassword({ email: profile.email, password })
4. redirect by role → /dashboard/patient
```

The registration number is only a **lookup key**. For a patient who hasn't completed
onboarding, step 3 authenticates against the *placeholder* address — which works
fine, because it is a real address on a real auth user.

Gate checks at step 2:

- `hospital_admin` → must have `access_granted` and an active/approved hospital
- everyone except `super_admin` → `status` must be `active` or `approved`

A patient is created with `status: 'active'`, so they pass straight through.

---

## 3. First login: forced profile completion

Middleware ([`middleware.js`](../middleware.js)) intercepts **every** `/dashboard/*`
request. A patient with `must_complete_profile = true` cannot reach anything until
they finish:

```
if (role === 'patient' && must_complete_profile && path.startsWith('/dashboard')
    && path !== '/dashboard/patient/complete-profile')
  → redirect to /dashboard/patient/complete-profile
```

This is a hard gate, not a dismissible modal. The completion page itself is excluded
from the check, otherwise it would redirect to itself forever.

### The completion page

[`/dashboard/patient/complete-profile`](../src/app/dashboard/patient/complete-profile/) — two steps.

**Step 1 — claim an email.** `sendMyEmailOtp(email)`:

- rejects a malformed address, or a `@patients.internal` one
- rejects an address already on another profile (`profiles.email` is `UNIQUE`) —
  checked *up front*, rather than letting the swap fail after the patient has
  already proven ownership
- generates a 6-digit code with `crypto.randomInt` (not `Math.random`)
- stores only its **SHA-256 hash** in `email_verification_codes`, so a leaked table
  can't be used to verify pending addresses
- supersedes any earlier unconsumed code, then emails the code via nodemailer

The address is **not** written to the profile at this point. An unverified typo
must not be able to lock the account or squat someone else's address.

**Step 2 — verify and finish.** `completePatientProfile({ email, code, password, details })`:

- 10-minute expiry, max 5 wrong attempts, then the code is dead
- on a correct code, the swap happens **auth first, profile second**:

```
auth.admin.updateUserById(id, { email, email_confirm: true, password })  ← can fail on a unique race
profiles.update({ email, email_verified: true,
                  must_complete_profile: false, must_change_password: false, ...details })
```

Order matters. The auth call is the one that can fail (unique-email race). If it
does, we bail out before touching `profiles`, so the two never disagree. It also
sets the email *and* the password in one call, so a patient can never end up with a
verified new email while still holding the phone-number password.

`email_confirm: true` marks `auth.users.email_confirmed_at` immediately. Without it
Supabase would park the address in `new_email` and send its *own* confirmation link
— making the patient verify twice.

Once the flags clear, middleware sends any further visit to `complete-profile` back
to the dashboard.

---

## 4. Role isolation

Also in middleware, on every `/dashboard/*` request:

```js
const roleToPath = { hospital_admin: 'hospital', doctor: 'doctor', staff: 'staff',
                     receptionist: 'reception', patient: 'patient', super_admin: 'super-admin' }
```

A patient requesting any other role's dashboard is redirected to their own. The
profile is re-read from the database on every request, so revoking access takes
effect on the next navigation rather than at the next login.

---

## Why patient auth can't disturb the rest of the system

Verified against the live database:

- **Patients never carry a `hospital_id`.** All patient profiles have
  `hospital_id = null`; hospital membership lives in the `patients` link table. No
  staff query scoped by `hospital_id` can pick up a patient.
- **Registration-number prefixes are disjoint** — `PATIENT-` vs `DOCT`/`HOAD`/`RECEP`/`SUAD`.
  Sign-in resolves reg-no → profile, so a patient number can never resolve to staff.
- **The middleware gate is guarded by `role === 'patient'`.** No other role is
  evaluated against `must_complete_profile`.
- `must_change_password` / `must_complete_profile` are read **only** by the patient
  portal and that one middleware branch.

---

## State summary

| | `must_complete_profile` | `must_change_password` | `email_verified` | `profiles.email` |
|---|---|---|---|---|
| Registered, no email | `true` | `true` | `false` | placeholder |
| Registered with email | `false` | `true` | `true` | real |
| After completion | `false` | `false` | `true` | real, verified |

---

## Known gaps

**1. `/api/patients` bypasses the required fields.**
[`src/app/api/patients/route.js`](../src/app/api/patients/route.js) validates only
`name` and `mobile`. Gender and date of birth are enforced in the `PatientForm` zod
schema but not at the API boundary, so a direct POST can create a patient without
them.

**2. Real-email patients are never forced to change their password.**
They get `must_complete_profile: false`, so the middleware gate never catches them.
They see only a dismissible modal on the dashboard, and can keep the phone-number
password — which reception knows — indefinitely. Closing this means adding
`must_change_password` to the middleware gate.

**3. `appointments` has RLS disabled.**
`enable row level security` was never run on that table, so the
`"Patients can view their own appointments"` policy in migration `025` is **inert**.
Today any authenticated user can read and write every appointment row. Enabling RLS
now would break every staff flow, since no policies exist for them — it needs a full
policy set first.
