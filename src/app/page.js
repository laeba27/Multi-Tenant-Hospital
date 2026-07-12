'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X, ArrowRight, Activity, Check } from 'lucide-react'

/**
 * Landing page.
 *
 * Deliberately not the usual template: no gradient hero, no six-icon feature
 * grid, no purple CTA band, no stock photography. It also carries NO invented
 * numbers -- the old page claimed "500+ Hospitals", "1M+ Patients Managed" and
 * "15+ Countries", none of which are true, and all of which are a liability on
 * a real client's public site.
 *
 * Instead: type, rules, and a mock of the actual product. The visual interest
 * comes from structure and restraint rather than colour.
 */

const CAPABILITIES = [
  {
    n: '01',
    title: 'Appointments',
    body: 'Doctor shifts, slot capacity, breaks and leave. Patients book themselves; reception confirms.',
  },
  {
    n: '02',
    title: 'Prescriptions',
    body: 'Digital prescriptions on hospital templates, with the full history attached to the patient.',
  },
  {
    n: '03',
    title: 'Records',
    body: 'Lab reports, discharge summaries and scans. Available to the patient and their doctor.',
  },
  {
    n: '04',
    title: 'Staff & roles',
    body: 'Departments, shifts, and per-role permissions — enforced, not just hidden in the UI.',
  },
  {
    n: '05',
    title: 'Billing',
    body: 'Invoices, part-payments, and a daily view of what was collected at the counter.',
  },
  {
    n: '06',
    title: 'Announcements',
    body: 'Notices targeted at exactly who should see them: all staff, one role, or patients.',
  },
]

const AUDIENCES = [
  {
    role: 'Hospital administrators',
    points: ['Departments, staff and shifts', 'Roles and permissions', 'Billing and analytics'],
  },
  {
    role: 'Doctors',
    points: ['Today’s appointments', 'Write prescriptions', 'Patient history at hand'],
  },
  {
    role: 'Reception',
    points: ['Register and book patients', 'Approve booking requests', 'Collect payments'],
  },
  {
    role: 'Patients',
    points: ['Book at any hospital', 'See prescriptions and reports', 'Track appointments'],
  },
]

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-indigo-600 selection:text-white">
      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Activity className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold tracking-tight">Smile Returns</span>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm">
            <a href="#what" className="text-slate-500 hover:text-slate-900 transition">
              What it does
            </a>
            <a href="#who" className="text-slate-500 hover:text-slate-900 transition">
              Who it&apos;s for
            </a>
            <Link href="/auth/sign-in" className="text-slate-500 hover:text-slate-900 transition">
              Sign in
            </Link>
            <Link
              href="/auth/sign-up"
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 text-white px-3.5 py-2 hover:bg-indigo-700 transition"
            >
              Register hospital
            </Link>
          </div>

          <button className="md:hidden p-2 -mr-2" onClick={() => setMenuOpen((o) => !o)}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-slate-200 px-6 py-4 space-y-3 text-sm bg-white">
            <a href="#what" className="block text-slate-600" onClick={() => setMenuOpen(false)}>
              What it does
            </a>
            <a href="#who" className="block text-slate-600" onClick={() => setMenuOpen(false)}>
              Who it&apos;s for
            </a>
            <Link href="/auth/sign-in" className="block text-slate-600">
              Sign in
            </Link>
            <Link
              href="/auth/sign-up"
              className="block rounded-lg bg-indigo-600 text-white px-4 py-2.5 text-center"
            >
              Register hospital
            </Link>
          </div>
        )}
      </nav>

      {/* ── Hero ── */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 sm:pt-28 sm:pb-24">
        <div className="max-w-3xl">
          <p className="text-xs font-medium tracking-[0.14em] uppercase text-slate-400 mb-6">
            Hospital Management System
          </p>
          <h1 className="text-4xl sm:text-[3.25rem] leading-[1.08] font-semibold tracking-tight">
            One system for the
            <br />
            whole hospital.
          </h1>
          <p className="mt-6 text-lg text-slate-500 leading-relaxed max-w-xl">
            Appointments, prescriptions, patient records, staff and billing — in one place, for
            everyone who works there. And for the patients who visit.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/auth/sign-up"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white px-5 py-3 text-sm font-medium hover:bg-indigo-700 transition"
            >
              Register your hospital
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/auth/sign-in"
              className="inline-flex items-center rounded-lg border border-slate-200 px-5 py-3 text-sm font-medium hover:border-slate-400 transition"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* ── Product mock. A real screen beats a stock photo, and it's honest. ── */}
      <section className="max-w-6xl mx-auto px-6 pb-20 sm:pb-28">
        <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
          {/* Window chrome */}
          <div className="flex items-center gap-1.5 px-4 h-10 border-b border-slate-200 bg-white">
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
                <div key={s.k} className="rounded-lg border border-slate-200 bg-white p-4">
                  <p className="text-2xl font-semibold tracking-tight">{s.v}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{s.k}</p>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
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
                    className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                      pay === 'Paid'
                        ? 'bg-indigo-600 text-white'
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
      </section>

      {/* ── What it does ── */}
      <section id="what" className="border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-20 sm:py-28">
          <div className="max-w-xl mb-14">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">What it does</h2>
            <p className="mt-3 text-slate-500 leading-relaxed">
              Six things a hospital does every day, handled properly rather than bolted together.
            </p>
          </div>

          {/* A ruled list, not a card grid. Hairlines do the work colour usually does. */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 border-t border-l border-slate-200">
            {CAPABILITIES.map((c) => (
              <div
                key={c.n}
                className="border-b border-r border-slate-200 p-7 hover:bg-slate-50 transition"
              >
                <span className="text-[11px] font-mono text-slate-300">{c.n}</span>
                <h3 className="mt-3 font-semibold tracking-tight">{c.title}</h3>
                <p className="mt-2 text-sm text-slate-500 leading-relaxed">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Who it's for ── */}
      <section id="who" className="border-t border-slate-200 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6 py-20 sm:py-28">
          <div className="max-w-xl mb-14">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              Who it&apos;s for
            </h2>
            <p className="mt-3 text-slate-500 leading-relaxed">
              Everyone sees their own view. Nobody sees more than they should.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-slate-200 border border-slate-200 rounded-xl overflow-hidden">
            {AUDIENCES.map((a) => (
              <div key={a.role} className="bg-white p-7">
                <h3 className="font-semibold tracking-tight text-[15px]">{a.role}</h3>
                <ul className="mt-4 space-y-2.5">
                  {a.points.map((p) => (
                    <li key={p} className="flex gap-2.5 text-sm text-slate-500">
                      <Check className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Close ── */}
      <section className="border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-20 sm:py-28">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-8">
            <div className="max-w-lg">
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
                Set up your hospital.
              </h2>
              <p className="mt-3 text-slate-500 leading-relaxed">
                Register the facility, add your departments and staff, and start taking
                appointments. Registrations are reviewed before they go live.
              </p>
            </div>
            <Link
              href="/auth/sign-up"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white px-5 py-3 text-sm font-medium hover:bg-indigo-700 transition shrink-0"
            >
              Register your hospital
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-md bg-indigo-600 flex items-center justify-center">
              <Activity className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-medium">Smile Returns</span>
          </div>
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} Smile Returns. Hospital management system.
          </p>
          <div className="flex gap-6 text-xs text-slate-400">
            <Link href="/auth/sign-in" className="hover:text-slate-900 transition">
              Sign in
            </Link>
            <Link href="/auth/sign-up" className="hover:text-slate-900 transition">
              Register
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
