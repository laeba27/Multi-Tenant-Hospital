'use client'

import Link from 'next/link'
import {
  Activity,
  ArrowLeft,
  CalendarCheck,
  FileText,
  Users2,
  ShieldCheck,
} from 'lucide-react'

const HIGHLIGHTS = [
  {
    icon: CalendarCheck,
    title: 'Appointments & scheduling',
    body: 'Doctor shifts, slot capacity, patient self-booking.',
  },
  {
    icon: FileText,
    title: 'Prescriptions & records',
    body: 'Digital prescriptions, lab reports, full patient history.',
  },
  {
    icon: Users2,
    title: 'Staff & roles',
    body: 'Departments, permissions, and per-role access control.',
  },
  {
    icon: Activity,
    title: 'Billing & analytics',
    body: 'Invoices, payments, and revenue at a glance.',
  },
]

/**
 * The split screen every auth page sits in: dark brand rail on the left, page
 * content on the right.
 *
 * Lives here rather than in auth/layout.js because the old layout wrapped every
 * page in a fixed `max-w-lg` card -- so no page could own its own screen, and a
 * full-width design got squeezed into 512px and clipped. A component gives each
 * page the same frame without taking the width away from it.
 *
 * `headline` and `sub` let a page speak for itself; `wide` lets a long form
 * (sign-up) fill the canvas, while a short one (sign-in) stays capped.
 */
export default function AuthShell({
  children,
  headline,
  sub,
  topRight,
  wide = false,
}) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[440px_1fr] bg-slate-50">
      {/* Brand rail — hidden on small screens, where it would just push the form down. */}
      <aside className="relative hidden lg:flex flex-col justify-between bg-slate-900 text-white p-10 overflow-hidden">
        {/* Depth without an image: two blurred radials. */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-indigo-600/25 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 -right-20 h-72 w-72 rounded-full bg-blue-500/15 blur-3xl" />

        <div className="relative">
          {/* The logo is the way back out — a user who lands on sign-in by
              mistake has no other exit. */}
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 rounded-lg -m-1 p-1 hover:opacity-80 transition"
          >
            <div className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Activity className="h-5 w-5" />
            </div>
            <span className="font-semibold tracking-tight">Smile Returns</span>
          </Link>

          <h2 className="mt-14 text-[28px] leading-tight font-semibold">
            Run your hospital
            <br />
            on one system.
          </h2>
          <p className="mt-3 text-sm text-slate-400 leading-relaxed">
            Appointments, prescriptions, staff, billing and patient records — together, and
            available to your whole team.
          </p>

          <div className="mt-10 space-y-5">
            {HIGHLIGHTS.map((f) => (
              <div key={f.title} className="flex gap-3.5">
                <div className="mt-0.5 h-8 w-8 shrink-0 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                  <f.icon className="h-4 w-4 text-indigo-300" />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-slate-100">{f.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex items-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="h-3.5 w-3.5" />
          Encrypted in transit. Reviewed before activation.
        </div>
      </aside>

      {/* Content */}
      <main className="flex flex-col min-h-screen">
        <header className="flex items-center justify-between gap-4 px-6 sm:px-10 py-5 border-b border-slate-200 bg-white">
          <Link href="/" className="flex items-center gap-2 lg:hidden hover:opacity-80 transition">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Activity className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-slate-900 text-sm">Smile Returns</span>
          </Link>

          {/* On desktop the rail's logo is the way home, but it's on a dark
              panel and easy to miss — give the light side an explicit link. */}
          <Link
            href="/"
            className="hidden lg:flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to home
          </Link>
          {topRight}
        </header>

        <div className="flex-1 px-6 sm:px-10 py-8 lg:py-12">
          {/* `wide` fills the canvas (the sign-up form has three columns of
              fields and wants the room). Otherwise cap the width -- a two-field
              login stretched across a 27" monitor reads as broken, not roomy. */}
          <div className={wide ? 'w-full' : 'max-w-md mx-auto lg:mx-0'}>
            {(headline || sub) && (
              <div className="mb-6">
                {headline && (
                  <h1 className="text-xl font-semibold text-slate-900">{headline}</h1>
                )}
                {sub && <p className="text-sm text-slate-500 mt-1">{sub}</p>}
              </div>
            )}
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
