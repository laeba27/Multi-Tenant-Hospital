# Staying on Supabase Free Tier

**Goal:** run this in production for 6–12 months on the free plan, without the
client watching a storage meter.

**Verdict: entirely achievable — but not by storing less patient data.** Patient
records are tiny. What fills a free-tier Supabase project is almost never the
business data. This document says what actually consumes the quota and what to
do about each thing.

---

## 1. The numbers, so nobody panics

Free tier gives you **500 MB of database disk**.

Rough sizes of your actual rows:

| Row | Size |
|---|---|
| A patient | ~1 KB |
| An appointment | ~1 KB |
| An invoice | ~1 KB |
| A prescription (with values) | ~5–10 KB |
| A notification | ~0.5 KB |

So a **busy** clinic — 50 appointments a day, every day, for a year — produces
roughly:

```
50 appts × 365 days       = 18,250 appointments  ≈  20 MB
+ prescriptions for each                          ≈ 130 MB
+ patients, invoices, notices                     ≈  10 MB
────────────────────────────────────────────────────────────
                                          TOTAL   ≈ 160 MB
```

**That fits in 500 MB with room to spare.** A year of real clinical use is not
the problem. If the disk fills, something else did it.

---

## 2. What ACTUALLY fills a free Supabase project

In rough order of likelihood:

### a) Files in Supabase Storage ⚠️ **This was happening in your app**

Images are 100–5,000× larger than a database row. **One 2 MB photo costs as much
disk as 2,000 patients.** Fifty hospital logos and staff avatars will do more
damage than a year of appointments.

**Status: fixed.** Every upload now goes to Cloudflare R2. As of the R2 work
(and the hospital-logo fix that went with this document), *nothing* in `src/`
writes to Supabase Storage. Verify with:

```bash
grep -rn "supabase.storage\|\.storage\.from(" src/     # must return nothing
```

**Action for the client's dashboard:** go to **Storage** in the Supabase
dashboard and check for an old bucket named `hospital`. The previous code
uploaded avatars and logos there. Anything in it is dead weight — nothing reads
from it any more. Delete the bucket.

### b) Database bloat from dead rows

Postgres does not immediately reclaim space when rows are updated or deleted; it
leaves "dead tuples" behind. Autovacuum normally cleans up, but a table that is
updated constantly can hold far more disk than its live rows suggest.

The tables at risk here are the ones written on every action:

- `notifications` — a row per booking request, confirmation, cancellation
- `email_verification_codes` — a row per OTP, and they are never deleted
- `prescription_audit_logs` — a row per prescription edit

**Action: see §3, the retention jobs.**

### c) Point-in-time recovery / backups

On paid plans PITR keeps a rolling WAL archive that counts toward disk. Free tier
does not have PITR, so this is not currently a factor — but do not enable it
later without expecting the disk cost.

### d) Indexes

Indexes are disk. We have added a fair number (they make the app fast). They are
small relative to data, but they are not free. Nothing to do here — just know
they exist.

---

## 3. Retention: the one thing that actually needs building

Three tables grow forever and nothing ever prunes them. Left alone for a year at
production volume, they are the most likely cause of a future squeeze.

### `email_verification_codes`

A row per OTP request. They expire in minutes but **are never deleted**. A
patient who mistypes their email five times leaves five rows behind, permanently.

**Fix:** delete consumed and expired codes daily. There is no reason to keep an
OTP that was used an hour ago.

### `notifications`

A row per booking request, confirmation, and cancellation — for *both* the desk
and the patient. At 50 bookings/day that is ~100 rows/day, ~36,000/year. Small
individually, but it never stops.

**Fix:** delete read notifications older than 90 days. Nobody scrolls back three
months in a bell dropdown.

### `prescription_audit_logs`

Append-only by design. This one is **medico-legal** — do NOT prune it without
asking the client. Audit trails on medical records may be legally required to be
retained for years. Leave it, and budget the disk.

### The migration

`supabase/migrations/033_data_retention.sql` (write it when you're ready) should:

```sql
-- Expired/consumed OTPs are worthless the moment they're used.
delete from public.email_verification_codes
where consumed_at is not null or expires_at < now() - interval '1 day';

-- Read notifications older than 90 days.
delete from public.notifications
where read_at is not null and created_at < now() - interval '90 days';
```

Run it via **pg_cron** (available on free tier) so it maintains itself:

```sql
select cron.schedule('nightly-cleanup', '0 3 * * *', $$
  delete from public.email_verification_codes
  where consumed_at is not null or expires_at < now() - interval '1 day';
  delete from public.notifications
  where read_at is not null and created_at < now() - interval '90 days';
$$);
```

**Do not prune:** appointments, patients, prescriptions, invoices,
prescription_audit_logs. Those are the client's business records and their legal
history. Disk is cheaper than a deleted medical record.

---

## 4. Free-tier gotchas that are NOT about storage

Worth telling the client now, so they aren't surprised:

**Projects pause after 7 days of inactivity.** A free project with no requests
gets paused and must be manually resumed from the dashboard. In production with
real users this never triggers — but a staging project will pause constantly.

**The quota is per ORGANISATION, not per project.** This is what bit us: two
projects in one org share the 500 MB. Keep exactly **one** project in the org.
Do not create a "staging" project alongside it in the same org — it will eat the
production project's allowance and restrict *both*.

**No daily backups on free tier.** If the client's data matters — and it is a
hospital, so it does — set up your own. `pg_dump` on a schedule to somewhere off
Supabase. This is the single biggest risk of staying free, and it is worth
saying out loud to the client: *"free means no backups; if the database is lost,
it is lost."*

---

## 5. What to actually do, in order

1. **Delete the old `hospital` Storage bucket** in the Supabase dashboard. Likely
   the current culprit, and nothing reads from it.
2. **Keep one project per organisation.** Never two.
3. **Add the retention job** (§3) before the client goes live, not after.
4. **Set up your own `pg_dump` backup.** Free tier has none.
5. **Check `Database → Usage` monthly.** If disk climbs without patient volume
   climbing, something is leaking — come back to §2.

Do these and 500 MB comfortably covers a year of a real clinic. The $25/month
becomes a decision the client makes when they *want* backups and PITR — not one
forced on them by a quota.
