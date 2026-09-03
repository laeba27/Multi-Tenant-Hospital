'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Menu,
  X,
  ArrowRight,
  Check,
  CalendarDays,
  FileText,
  FolderHeart,
  Users,
  Receipt,
  Megaphone,
  Mic,
  ShieldCheck,
  Building2,
  Stethoscope,
  ClipboardList,
  HeartPulse,
} from 'lucide-react'
import { Logo } from '@/components/brand/Logo'

/**
 * Landing page.
 *
 * The palette comes from the tooth mark, defined once in globals.css as
 * `--brand-*`. The accent is the mark's blue, used flat: an earlier pass
 * painted buttons, rules and headings in the mark's full teal→pink sweep and
 * it read as noise, so the gradient is gone and only the solid blue remains.
 * Structure and the light/dark banding carry the page instead of colour.
 *
 * Still carries NO invented numbers -- no "500+ hospitals", no "1M+ patients".
 * Those were a liability on a real client's public site and are not coming
 * back. The proof on this page is a mock of the actual product plus an honest
 * description of what each role can do.
 */

const CAPABILITIES = [
  {
    icon: CalendarDays,
    title: 'Appointments',
    body: 'Doctor shifts, slot capacity, breaks and leave. Patients book themselves; reception confirms.',
  },
  {
    icon: FileText,
    title: 'Prescriptions',
    body: 'Digital prescriptions on hospital templates, with the full history attached to the patient.',
  },
  {
    icon: FolderHeart,
    title: 'Records',
    body: 'Lab reports, discharge summaries and scans. Available to the patient and their doctor.',
  },
  {
    icon: Users,
    title: 'Staff & roles',
    body: 'Departments, shifts, and per-role permissions — enforced, not just hidden in the UI.',
  },
  {
    icon: Receipt,
    title: 'Billing',
    body: 'Invoices, part-payments, and a daily view of what was collected at the counter.',
  },
  {
    icon: Megaphone,
    title: 'Announcements',
    body: 'Notices targeted at exactly who should see them: all staff, one role, or patients.',
  },
]

const AUDIENCES = [
  {
    icon: Building2,
    role: 'Hospital administrators',
    points: ['Departments, staff and shifts', 'Roles and permissions', 'Billing and analytics'],
  },
  {
    icon: Stethoscope,
    role: 'Doctors',
    points: ['Today’s appointments', 'Write prescriptions', 'Patient history at hand'],
  },
  {
    icon: ClipboardList,
    role: 'Reception',
    points: ['Register and book patients', 'Approve booking requests', 'Collect payments'],
  },
  {
    icon: HeartPulse,
    role: 'Patients',
    points: ['Book at any hospital', 'See prescriptions and reports', 'Track appointments'],
  },
]

const STEPS = [
  {
    n: '01',
    title: 'Register the hospital',
    body: 'Submit your facility’s details. Every registration is reviewed before it goes live — no open sign-ups on a medical system.',
  },
  {
    n: '02',
    title: 'Add departments and staff',
    body: 'Create departments, invite doctors, reception and support staff, and set what each role is allowed to touch.',
  },
  {
    n: '03',
    title: 'Open your booking',
    body: 'Publish doctor shifts and slot capacity. Patients find your hospital and book; reception approves and collects.',
  },
]

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-brand-blue selection:text-white">
      {/* ── Nav ──────────────────────────────────────────────────────────────
          The mark sits at 44px rather than the old 34px: at that size the
          tooth's gradient reads as a smudge, and it was the smallest thing on
          a 64px-tall bar. The bar itself is now 72px to hold it comfortably. */}
      <header className="sticky top-0 z-50">
        {/* Hairline of the full brand sweep, pinned under the bar. */}
        <div className="h-[3px] w-full bg-brand-blue" />

        <nav className="bg-white/85 backdrop-blur-xl border-b border-slate-200/80">
          <div className="max-w-6xl mx-auto px-6 h-[72px] flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <Logo size={44} priority className="transition-transform group-hover:scale-105" />
              <span className="flex flex-col leading-none">
                <span className="font-semibold tracking-tight text-[17px]">Smile Return</span>
                <span className="text-[11px] text-slate-400 mt-1 hidden sm:block">
                  Hospital Management System
                </span>
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-8 text-sm">
              <a href="#what" className="text-slate-600 hover:text-brand-blue transition">
                What it does
              </a>
              <a href="#who" className="text-slate-600 hover:text-brand-blue transition">
                Who it&apos;s for
              </a>
              <a href="#start" className="text-slate-600 hover:text-brand-blue transition">
                Getting started
              </a>
              <Link
                href="/auth/sign-in"
                className="text-slate-600 hover:text-brand-blue transition"
              >
                Sign in
              </Link>
              <Link
                href="/auth/sign-up"
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-blue text-white px-5 py-2.5 font-medium hover:bg-brand-blue-deep transition"
              >
                Register hospital
              </Link>
            </div>

            <button
              className="md:hidden p-2 -mr-2 text-slate-700"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>

          {menuOpen && (
            <div className="md:hidden border-t border-slate-200 px-6 py-5 space-y-4 text-sm bg-white">
              <a href="#what" className="block text-slate-600" onClick={() => setMenuOpen(false)}>
                What it does
              </a>
              <a href="#who" className="block text-slate-600" onClick={() => setMenuOpen(false)}>
                Who it&apos;s for
              </a>
              <a href="#start" className="block text-slate-600" onClick={() => setMenuOpen(false)}>
                Getting started
              </a>
              <Link href="/auth/sign-in" className="block text-slate-600">
                Sign in
              </Link>
              <Link
                href="/auth/sign-up"
                className="block rounded-lg bg-brand-blue text-white px-4 py-3 text-center font-medium"
              >
                Register hospital
              </Link>
            </div>
          )}
        </nav>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────────────
          Two soft gradient blooms sit behind the type at low opacity. They
          give the page colour without tinting the text or costing contrast. */}
      <section className="relative overflow-hidden">

        <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-16 sm:pt-28 sm:pb-24">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 backdrop-blur px-3.5 py-1.5 text-xs font-medium text-slate-600">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-blue" />
              Multi-tenant · Role-aware · Built for real clinics
            </span>

            <h1 className="mt-7 text-4xl sm:text-[3.5rem] leading-[1.06] font-semibold tracking-tight">
              One system for the
              <br />
              <span className="text-brand-blue">whole hospital.</span>
            </h1>

            <p className="mt-6 text-lg text-slate-600 leading-relaxed max-w-xl">
              Appointments, prescriptions, patient records, staff and billing — in one place, for
              everyone who works there. And for the patients who visit.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="/auth/sign-up"
                className="inline-flex items-center gap-2 rounded-lg bg-brand-blue text-white px-6 py-3.5 text-sm font-medium hover:bg-brand-blue-deep transition"
              >
                Register your hospital
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/auth/sign-in"
                className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-6 py-3.5 text-sm font-medium text-slate-700 hover:border-brand-blue hover:text-brand-blue transition"
              >
                Sign in
              </Link>
            </div>

            <p className="mt-6 flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="h-4 w-4 text-brand-blue" />
              Every hospital registration is reviewed before it goes live.
            </p>
          </div>
        </div>
      </section>

      {/* ── Product mock. A real screen beats a stock photo, and it's honest. ── */}
      <section className="relative max-w-6xl mx-auto px-6 pb-20 sm:pb-28">
        <div className="rounded-2xl border border-slate-200 shadow-sm">
          <div className="rounded-2xl bg-slate-50 overflow-hidden">
            {/* Window chrome */}
            <div className="flex items-center gap-1.5 px-4 h-11 border-b border-slate-200 bg-white">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
              <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
              <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
              <span className="ml-3 text-[11px] text-slate-400">Reception · Booking requests</span>
            </div>

            <div className="p-5 sm:p-8">
              <div className="grid sm:grid-cols-3 gap-3 mb-5">
                {[
                  { k: 'Registered today', v: '12' },
                  { k: 'Appointments', v: '48' },
                  { k: 'Awaiting approval', v: '3' },
                ].map((s) => (
                  <div
                    key={s.k}
                    className="relative rounded-xl border border-slate-200 bg-white p-4 overflow-hidden"
                  >
                    <span
                      className="absolute inset-x-0 top-0 h-1 bg-brand-blue"
                    />
                    <p className="text-2xl font-semibold tracking-tight">{s.v}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{s.k}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <div className="grid grid-cols-[1.4fr_1fr_1fr_auto] gap-4 px-4 py-2.5 border-b border-slate-100 text-[11px] font-medium text-slate-400 uppercase tracking-wide">
                  <span>Patient</span>
                  <span className="hidden sm:block">Doctor</span>
                  <span>Slot</span>
                  <span>Payment</span>
                </div>
                {[
                  ['John Mehta', 'Dr. Rao', '7:00 – 8:00 AM', 'Unpaid'],
                  ['Priya Nair', 'Dr. Rao', '9:00 – 10:00 AM', 'Paid'],
                  ['Imran Sheikh', 'Dr. Iyer', '11:00 – 12:00 PM', 'Unpaid'],
                ].map(([p, d, s, pay]) => (
                  <div
                    key={p}
                    className="grid grid-cols-[1.4fr_1fr_1fr_auto] gap-4 px-4 py-3 border-b border-slate-50 last:border-0 text-sm items-center"
                  >
                    <span className="text-slate-800">{p}</span>
                    <span className="hidden sm:block text-slate-500">{d}</span>
                    <span className="text-slate-500 text-xs sm:text-sm">{s}</span>
                    <span
                      className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${
                        pay === 'Paid'
                          ? 'bg-brand-blue text-white'
                          : 'border border-slate-200 text-slate-500'
                      }`}
                    >
                      {pay}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── What it does ── */}
      <section id="what" className="border-t border-slate-200 bg-slate-50/60">
        <div className="max-w-6xl mx-auto px-6 py-20 sm:py-28">
          <div className="max-w-xl mb-14">
            <p className="text-xs font-semibold tracking-[0.16em] uppercase text-brand-blue mb-3">
              Capabilities
            </p>
            <h2 className="text-2xl sm:text-4xl font-semibold tracking-tight">What it does</h2>
            <p className="mt-4 text-slate-600 leading-relaxed">
              Six things a hospital does every day, handled properly rather than bolted together.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {CAPABILITIES.map((c) => {
              const Icon = c.icon
              return (
                <div
                  key={c.title}
                  className="group relative rounded-2xl border border-slate-200 bg-white p-7 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/70 hover:border-transparent"
                >
                  <span
                    className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue"
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 font-semibold tracking-tight text-[17px]">{c.title}</h3>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">{c.body}</p>
                  {/* Gradient underline that draws in on hover. */}
                  <span className="absolute bottom-0 left-7 right-7 h-[2px] scale-x-0 origin-left bg-brand-blue transition-transform duration-300 group-hover:scale-x-100" />
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Voice-to-prescription. The one genuinely unusual thing here, so it
          gets the dark band rather than being buried in the six-up grid. ── */}
      <section className="relative overflow-hidden bg-brand-ink text-white">

        <div className="relative max-w-6xl mx-auto px-6 py-20 sm:py-28">
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-white/70">
                <Mic className="h-3.5 w-3.5" />
                For doctors
              </span>
              <h2 className="mt-6 text-2xl sm:text-4xl font-semibold tracking-tight leading-tight">
                Speak the consultation.
                <br />
                <span className="text-brand-blue">Get a prescription draft.</span>
              </h2>
              <p className="mt-5 text-white/60 leading-relaxed max-w-lg">
                Record the visit — one clip or several. Smile Return transcribes each one, combines
                them, and pulls out the structured fields: complaints, diagnosis, medicines, dosage
                and follow-up.
              </p>
              <p className="mt-4 text-white/60 leading-relaxed max-w-lg">
                It saves as a <span className="text-white">draft</span>, never as a final
                prescription. The doctor reviews and edits every field before anything is issued.
              </p>
            </div>

            {/* A stepped list of the actual flow, not a decorative illustration. */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur p-7 sm:p-8">
              <ol className="space-y-6">
                {[
                  ['Record', 'One clip or many, straight from the consultation room.'],
                  ['Transcribe', 'Each clip is transcribed, then the transcripts are combined.'],
                  ['Extract', 'Fields are pulled into a structured draft you can edit.'],
                  ['Review & issue', 'The doctor confirms. Only then does it become a prescription.'],
                ].map(([step, body], i) => (
                  <li key={step} className="flex gap-4">
                    <span className="shrink-0 mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-blue text-[13px] font-semibold text-white">
                      {i + 1}
                    </span>
                    <span>
                      <span className="block font-medium">{step}</span>
                      <span className="block mt-1 text-sm text-white/50 leading-relaxed">
                        {body}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* ── Who it's for ── */}
      <section id="who" className="border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-20 sm:py-28">
          <div className="max-w-xl mb-14">
            <p className="text-xs font-semibold tracking-[0.16em] uppercase text-brand-blue mb-3">
              Roles
            </p>
            <h2 className="text-2xl sm:text-4xl font-semibold tracking-tight">
              Who it&apos;s for
            </h2>
            <p className="mt-4 text-slate-600 leading-relaxed">
              Everyone sees their own view. Nobody sees more than they should.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {AUDIENCES.map((a) => {
              const Icon = a.icon
              return (
                <div
                  key={a.role}
                  className="relative rounded-2xl border border-slate-200 bg-white p-7 overflow-hidden transition hover:shadow-xl hover:shadow-slate-200/70"
                >
                  <span className="absolute inset-x-0 top-0 h-1 bg-brand-blue" />
                  <Icon className="h-6 w-6 text-brand-blue" />
                  <h3 className="mt-4 font-semibold tracking-tight text-[15px]">{a.role}</h3>
                  <ul className="mt-4 space-y-2.5">
                    {a.points.map((p) => (
                      <li key={p} className="flex gap-2.5 text-sm text-slate-600">
                        <Check className="h-4 w-4 text-brand-blue shrink-0 mt-0.5" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Getting started ── */}
      <section id="start" className="border-t border-slate-200 bg-slate-50/60">
        <div className="max-w-6xl mx-auto px-6 py-20 sm:py-28">
          <div className="max-w-xl mb-14">
            <p className="text-xs font-semibold tracking-[0.16em] uppercase text-brand-blue mb-3">
              Getting started
            </p>
            <h2 className="text-2xl sm:text-4xl font-semibold tracking-tight">
              Three steps to going live
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl border border-slate-200 bg-white p-8">
                <span className="text-3xl font-semibold tracking-tight text-brand-blue">
                  {s.n}
                </span>
                <h3 className="mt-4 font-semibold tracking-tight text-[17px]">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Close ── */}
      <section className="bg-slate-50/60">
        <div className="max-w-6xl mx-auto px-6 pb-20 sm:pb-24">
          <div className="relative rounded-2xl overflow-hidden">
            <div className="rounded-2xl bg-brand-ink px-8 py-14 sm:px-14 sm:py-16 relative overflow-hidden">
              <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-8">
                <div className="max-w-lg">
                  <h2 className="text-2xl sm:text-4xl font-semibold tracking-tight text-white">
                    Set up your hospital.
                  </h2>
                  <p className="mt-4 text-white/60 leading-relaxed">
                    Register the facility, add your departments and staff, and start taking
                    appointments. Registrations are reviewed before they go live.
                  </p>
                </div>
                <Link
                  href="/auth/sign-up"
                  className="inline-flex items-center gap-2 rounded-full bg-white text-brand-ink px-6 py-3.5 text-sm font-semibold hover:bg-white/90 transition shrink-0"
                >
                  Register your hospital
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────
          The old footer was a single 40px-tall grey strip -- the page just
          stopped. This one is a proper four-column dark foot: brand column,
          then the same navigation the header offers, so someone who has read
          to the bottom does not have to scroll back up to act. */}
      <footer className="bg-brand-ink text-white">
        <div className="h-[3px] w-full bg-brand-blue" />

        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="grid gap-12 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
            <div>
              <Link href="/" className="inline-flex items-center gap-3">
                <Logo size={44} />
                <span className="font-semibold tracking-tight text-[17px]">Smile Return</span>
              </Link>
              <p className="mt-5 text-sm text-white/50 leading-relaxed max-w-xs">
                A multi-tenant hospital management system — appointments, prescriptions, records,
                staff and billing, for the whole facility.
              </p>
              <p className="mt-5 flex items-center gap-2 text-xs text-white/40">
                <ShieldCheck className="h-4 w-4 text-brand-blue" />
                Registrations reviewed before going live
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/40">
                Product
              </p>
              <ul className="mt-5 space-y-3 text-sm">
                <li>
                  <a href="#what" className="text-white/60 hover:text-white transition">
                    What it does
                  </a>
                </li>
                <li>
                  <a href="#who" className="text-white/60 hover:text-white transition">
                    Who it&apos;s for
                  </a>
                </li>
                <li>
                  <a href="#start" className="text-white/60 hover:text-white transition">
                    Getting started
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/40">
                Account
              </p>
              <ul className="mt-5 space-y-3 text-sm">
                <li>
                  <Link href="/auth/sign-in" className="text-white/60 hover:text-white transition">
                    Sign in
                  </Link>
                </li>
                <li>
                  <Link href="/auth/sign-up" className="text-white/60 hover:text-white transition">
                    Register hospital
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/40">
                For patients
              </p>
              <ul className="mt-5 space-y-3 text-sm">
                <li>
                  <Link href="/auth/sign-up" className="text-white/60 hover:text-white transition">
                    Book an appointment
                  </Link>
                </li>
                <li>
                  <Link href="/auth/sign-in" className="text-white/60 hover:text-white transition">
                    View prescriptions
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-14 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-white/40">
              © {new Date().getFullYear()} Smile Return. Hospital management system.
            </p>
            <p className="text-xs text-white/40">All patient data stays with its hospital.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
